import { decomposeSingularValues } from './singular-value-decomposition';
import {
  avgArrayValue,
  compareStrings,
  createPineArray,
  getArraySize,
  getArrayValue,
  isPineArray,
  maxArrayValue,
  medianArrayValue,
  minArrayValue,
  modeArrayValue,
  pushArrayValue,
  type PineArray,
} from './arrays';
import { getUdtField, isPineUdtObject, type PineUdtObject } from './objects';

export interface PineMatrix<T = unknown> {
  readonly __tealscriptMatrix: true;
  rows: number;
  columns: number;
  values: T[];
}

const MATRIX_EPSILON = 1e-10;
const MAX_MATRIX_SIZE = 100_000;

function assertMatrixCapacity(rows: number, columns: number): void {
  if (rows * columns > MAX_MATRIX_SIZE) {
    throw new Error(`Matrix is too large. Maximum size of the matrix is ${MAX_MATRIX_SIZE} elements`);
  }
}

export interface MatrixRuntimeApproximation {
  site: string;
  message: string;
}

type MatrixRuntimeApproximationReporter = (approximation: MatrixRuntimeApproximation) => void;

const matrixRuntimeApproximationReporters: MatrixRuntimeApproximationReporter[] = [];

export function pushMatrixRuntimeApproximationReporter(reporter: MatrixRuntimeApproximationReporter): () => void {
  matrixRuntimeApproximationReporters.push(reporter);
  return () => {
    const index = matrixRuntimeApproximationReporters.lastIndexOf(reporter);
    if (index >= 0) matrixRuntimeApproximationReporters.splice(index, 1);
  };
}

function reportMatrixRuntimeApproximation(approximation: MatrixRuntimeApproximation): void {
  matrixRuntimeApproximationReporters[matrixRuntimeApproximationReporters.length - 1]?.(approximation);
}

export function createPineMatrix<T = unknown>(rows: number = 0, columns: number = 0, initialValue?: T): PineMatrix<T> {
  const safeRows = normalizeDimension(rows, 'rows');
  const safeColumns = normalizeDimension(columns, 'columns');
  assertMatrixCapacity(safeRows, safeColumns);
  return {
    __tealscriptMatrix: true,
    rows: safeRows,
    columns: safeColumns,
    values: Array.from({ length: safeRows * safeColumns }, () => initialValue as T),
  };
}

export function isPineMatrix(value: unknown): value is PineMatrix {
  return Boolean(value && typeof value === 'object' && (value as PineMatrix).__tealscriptMatrix === true);
}

export function isValidMatrix(value: unknown): value is PineMatrix {
  return isPineMatrix(value);
}

export function isSquareMatrix(matrix: PineMatrix): boolean {
  return matrix.rows === matrix.columns;
}

export function isZeroMatrix(matrix: PineMatrix): boolean {
  return matrix.values.every((value) => isEffectivelyZero(Number(value), 1));
}

export function isBinaryMatrix(matrix: PineMatrix): boolean {
  return matrix.values.every((value) => approxEqual(Number(value), 0) || approxEqual(Number(value), 1));
}

export function isIdentityMatrix(matrix: PineMatrix): boolean {
  if (!isSquareMatrix(matrix)) return false;
  for (let row = 0; row < matrix.rows; row++) {
    for (let column = 0; column < matrix.columns; column++) {
      const expected = row === column ? 1 : 0;
      if (!approxEqual(Number(getMatrixValue(matrix, row, column)), expected)) {
        return false;
      }
    }
  }
  return true;
}

export function isDiagonalMatrix(matrix: PineMatrix): boolean {
  if (!isSquareMatrix(matrix)) return false;
  for (let row = 0; row < matrix.rows; row++) {
    for (let column = 0; column < matrix.columns; column++) {
      if (row !== column && !approxEqual(Number(getMatrixValue(matrix, row, column)), 0)) {
        return false;
      }
    }
  }
  return true;
}

export function isAntidiagonalMatrix(matrix: PineMatrix): boolean {
  if (!isSquareMatrix(matrix)) return false;
  for (let row = 0; row < matrix.rows; row++) {
    for (let column = 0; column < matrix.columns; column++) {
      if (row + column !== matrix.columns - 1 && !approxEqual(Number(getMatrixValue(matrix, row, column)), 0)) {
        return false;
      }
    }
  }
  return true;
}

export function isSymmetricMatrix(matrix: PineMatrix): boolean {
  if (!isSquareMatrix(matrix)) return false;
  for (let row = 0; row < matrix.rows; row++) {
    for (let column = row + 1; column < matrix.columns; column++) {
      if (!approxEqual(Number(getMatrixValue(matrix, row, column)), Number(getMatrixValue(matrix, column, row)))) {
        return false;
      }
    }
  }
  return true;
}

export function isAntisymmetricMatrix(matrix: PineMatrix): boolean {
  if (!isSquareMatrix(matrix)) return false;
  if (matrix.rows === 1 && Number.isNaN(getMatrixValue(matrix, 0, 0))) return true;
  for (let row = 0; row < matrix.rows; row++) {
    for (let column = 0; column < matrix.columns; column++) {
      if (!approxEqual(Number(getMatrixValue(matrix, row, column)), -Number(getMatrixValue(matrix, column, row)))) {
        return false;
      }
    }
  }
  return true;
}

export function isTriangularMatrix(matrix: PineMatrix): boolean {
  if (!isSquareMatrix(matrix)) return false;
  let upper = true;
  let lower = true;
  for (let row = 0; row < matrix.rows; row++) {
    for (let column = 0; column < matrix.columns; column++) {
      const value = Number(getMatrixValue(matrix, row, column));
      if (row > column && !approxEqual(value, 0)) {
        upper = false;
      }
      if (row < column && !approxEqual(value, 0)) {
        lower = false;
      }
    }
  }
  return upper || lower;
}

export function isStochasticMatrix(matrix: PineMatrix): boolean {
  for (let row = 0; row < matrix.rows; row++) {
    let total = 0;
    for (let column = 0; column < matrix.columns; column++) {
      const value = Number(getMatrixValue(matrix, row, column));
      if (value < 0) {
        return false;
      }
      total += value;
    }
    if (!approxEqual(total, 1)) {
      return false;
    }
  }
  return true;
}

export function getMatrixRows(matrix: PineMatrix): number {
  return matrix.rows;
}

export function getMatrixColumns(matrix: PineMatrix): number {
  return matrix.columns;
}

export function getMatrixElementCount(matrix: PineMatrix): number {
  return matrix.rows * matrix.columns;
}

export function getMatrixValue<T = unknown>(matrix: PineMatrix<T>, row: number, column: number): T | undefined {
  return matrix.values[matrixIndex(matrix, row, column)];
}

export function setMatrixValue<T = unknown>(matrix: PineMatrix<T>, row: number, column: number, value: T): void {
  matrix.values[matrixIndex(matrix, row, column)] = value;
}

export function copyMatrix<T = unknown>(matrix: PineMatrix<T>): PineMatrix<T> {
  return {
    __tealscriptMatrix: true,
    rows: matrix.rows,
    columns: matrix.columns,
    values: [...matrix.values],
  };
}

export function concatMatrix<T = unknown>(matrix: PineMatrix<T>, other: PineMatrix<T>): PineMatrix<T> {
  if (matrix.columns !== other.columns) {
    throw new Error(`Matrix concat requires matching column counts. Left has ${matrix.columns}, right has ${other.columns}`);
  }
  assertMatrixCapacity(matrix.rows + other.rows, matrix.columns);
  if (other.rows === 0) return matrix;

  matrix.rows += other.rows;
  matrix.values.push(...other.values);
  return matrix;
}

export function matrixRow<T = unknown>(matrix: PineMatrix<T>, row: number): PineArray<T> {
  const normalizedRow = normalizeExistingIndex(row, matrix.rows, 'row');
  const result = createPineArray<T>();
  for (let column = 0; column < matrix.columns; column++) {
    pushArrayValue(result, matrix.values[normalizedRow * matrix.columns + column] as T);
  }
  return result;
}

export function matrixColumn<T = unknown>(matrix: PineMatrix<T>, column: number): PineArray<T> {
  const normalizedColumn = normalizeExistingIndex(column, matrix.columns, 'column');
  const result = createPineArray<T>();
  for (let row = 0; row < matrix.rows; row++) {
    pushArrayValue(result, matrix.values[row * matrix.columns + normalizedColumn] as T);
  }
  return result;
}

export function fillMatrix<T = unknown>(
  matrix: PineMatrix<T>,
  value: T,
  fromRow: number = 0,
  toRow: number = matrix.rows,
  fromColumn: number = 0,
  toColumn: number = matrix.columns,
): void {
  const rowRange = normalizeRange(fromRow, toRow, matrix.rows, 'row');
  const columnRange = normalizeRange(fromColumn, toColumn, matrix.columns, 'column');
  if (rowRange.from === rowRange.to || columnRange.from === columnRange.to) {
    throw new Error('Matrix fill range must have from_row/column less than to_row/column');
  }
  for (let row = rowRange.from; row < rowRange.to; row++) {
    for (let column = columnRange.from; column < columnRange.to; column++) {
      setMatrixValue(matrix, row, column, value);
    }
  }
}

export function reshapeMatrix(matrix: PineMatrix, rows: number, columns: number): void {
  const safeRows = normalizeDimension(rows, 'rows');
  const safeColumns = normalizeDimension(columns, 'columns');
  if (safeRows * safeColumns !== matrix.values.length) {
    throw new Error(`Matrix reshape must preserve element count. Existing count is ${matrix.values.length}`);
  }
  matrix.rows = safeRows;
  matrix.columns = safeColumns;
}

export function addMatrixRow<T = unknown>(matrix: PineMatrix<T>, row: number | undefined, values?: PineArray<T>): void {
  const rowIndex = normalizeInsertionIndex(row ?? matrix.rows, matrix.rows, 'row');
  const rowLength = values ? getArraySize(values) : matrix.columns;
  const columns = matrix.rows === 0 && matrix.columns === 0 ? rowLength : matrix.columns;
  if (rowLength !== columns) {
    throw new Error(`Matrix row length ${rowLength} does not match column count ${columns}`);
  }
  assertMatrixCapacity(matrix.rows + 1, columns);
  const rowValues = values ? pineArrayValues(values) : Array.from({ length: columns }, () => undefined as T);
  matrix.values.splice(rowIndex * columns, 0, ...rowValues);
  matrix.columns = columns;
  matrix.rows += 1;
}

export function addMatrixColumn<T = unknown>(matrix: PineMatrix<T>, column: number | undefined, values?: PineArray<T>): void {
  const columnIndex = normalizeInsertionIndex(column ?? matrix.columns, matrix.columns, 'column');
  const columnLength = values ? getArraySize(values) : matrix.rows;
  const rows = matrix.rows === 0 && matrix.columns === 0 ? columnLength : matrix.rows;
  if (columnLength !== rows) {
    throw new Error(`Matrix column length ${columnLength} does not match row count ${rows}`);
  }
  assertMatrixCapacity(rows, matrix.columns + 1);
  const columnValues = values ? pineArrayValues(values) : Array.from({ length: rows }, () => undefined as T);

  for (let row = rows - 1; row >= 0; row--) {
    matrix.values.splice(row * matrix.columns + columnIndex, 0, columnValues[row] as T);
  }
  matrix.rows = rows;
  matrix.columns += 1;
}

export function removeMatrixRow<T = unknown>(matrix: PineMatrix<T>, row: number = matrix.rows - 1): PineArray<T> {
  const rowIndex = normalizeExistingIndex(row, matrix.rows, 'row');
  const removed = createPineArray<T>();
  const values = matrix.values.splice(rowIndex * matrix.columns, matrix.columns);
  values.forEach((value) => pushArrayValue(removed, value));
  matrix.rows -= 1;
  return removed;
}

export function removeMatrixColumn<T = unknown>(matrix: PineMatrix<T>, column: number = matrix.columns - 1): PineArray<T> {
  const capturedColumn = matrix.rows === 1 && matrix.columns === 1 && Number.isNaN(column) ? 0 : column;
  const columnIndex = normalizeExistingIndex(capturedColumn, matrix.columns, 'column');
  const removed = createPineArray<T>();
  for (let row = matrix.rows - 1; row >= 0; row--) {
    const [value] = matrix.values.splice(row * matrix.columns + columnIndex, 1);
    removed.values.unshift(value as T);
  }
  matrix.columns -= 1;
  return removed;
}

export function swapMatrixRows(matrix: PineMatrix, firstRow: number, secondRow: number): void {
  const first = normalizeExistingIndex(firstRow, matrix.rows, 'row');
  const second = normalizeExistingIndex(secondRow, matrix.rows, 'row');
  for (let column = 0; column < matrix.columns; column++) {
    swapMatrixValues(matrix, first * matrix.columns + column, second * matrix.columns + column);
  }
}

export function swapMatrixColumns(matrix: PineMatrix, firstColumn: number, secondColumn: number): void {
  const capturedFirst =
    matrix.rows === 1 && matrix.columns === 1 && Number.isNaN(firstColumn) && secondColumn === 0 ? 0 : firstColumn;
  const first = normalizeExistingIndex(capturedFirst, matrix.columns, 'column');
  const second = normalizeExistingIndex(secondColumn, matrix.columns, 'column');
  for (let row = 0; row < matrix.rows; row++) {
    swapMatrixValues(matrix, row * matrix.columns + first, row * matrix.columns + second);
  }
}

export function reverseMatrix(matrix: PineMatrix): void {
  matrix.values.reverse();
}

export function transposeMatrix<T = unknown>(matrix: PineMatrix<T>): PineMatrix<T> {
  const result = createPineMatrix<T>(matrix.columns, matrix.rows);
  for (let row = 0; row < matrix.rows; row++) {
    for (let column = 0; column < matrix.columns; column++) {
      setMatrixValue(result, column, row, getMatrixValue(matrix, row, column) as T);
    }
  }
  return result;
}

export function avgMatrixValue(matrix: PineMatrix): number {
  return avgArrayValue(matrixValuesAsArray(matrix));
}

export function minMatrixValue(matrix: PineMatrix): number {
  return minArrayValue(matrixValuesAsArray(matrix));
}

export function maxMatrixValue(matrix: PineMatrix): number {
  return maxArrayValue(matrixValuesAsArray(matrix));
}

export function medianMatrixValue(matrix: PineMatrix): number {
  return medianArrayValue(matrixValuesAsArray(matrix));
}

export function modeMatrixValue(matrix: PineMatrix): number {
  return modeArrayValue(matrixValuesAsArray(matrix));
}

export function sumMatrixValue(matrix: PineMatrix, other: PineMatrix | number): PineMatrix<number> {
  return mapMatrixArithmetic(matrix, other, (left, right) => left + right);
}

export function diffMatrixValue(matrix: PineMatrix, other: PineMatrix | number): PineMatrix<number> {
  return mapMatrixArithmetic(matrix, other, (left, right) => left - right);
}

export function multMatrixValue(matrix: PineMatrix, other: PineMatrix | PineArray | number): PineMatrix<number> | PineArray<number> {
  if (isPineMatrix(other)) {
    return multiplyMatrices(matrix, other);
  }
  if (isPineArray(other)) {
    return multiplyMatrixByArray(matrix, other);
  }
  return mapMatrixArithmetic(matrix, Number(other), (left, right) => left * right);
}

export function powMatrixValue(matrix: PineMatrix, power: number): PineMatrix<number> {
  assertSquareMatrix(matrix, 'Matrix power');
  const normalizedPower = Math.trunc(Number(power));
  if (!Number.isFinite(normalizedPower) || normalizedPower < 0 || normalizedPower !== Number(power)) {
    throw new Error('Matrix power must be a non-negative integer');
  }

  let result = identityMatrix(matrix.rows);
  let base = copyMatrix(matrix);
  let exponent = normalizedPower;
  while (exponent > 0) {
    if (exponent % 2 === 1) {
      result = multiplyMatrices(result, base);
    }
    exponent = Math.floor(exponent / 2);
    if (exponent > 0) {
      base = multiplyMatrices(base, base);
    }
  }
  return result;
}

export function traceMatrixValue(matrix: PineMatrix): number {
  assertSquareMatrix(matrix, 'Matrix trace');
  let total = 0;
  for (let index = 0; index < matrix.rows; index++) {
    total += Number(getMatrixValue(matrix, index, index));
  }
  return total;
}

export function decomposeLu(
  rows: number[][],
): { factors: number[][]; permutation: number[]; sign: number } | undefined {
  const factors = rows.map((row) => [...row]);
  const permutation = rows.map((_row, index) => index);
  let sign = 1;
  for (let pivotIndex = 0; pivotIndex < factors.length; pivotIndex++) {
    let pivotRow = pivotIndex;
    let columnScale = 0;
    for (let row = pivotIndex; row < factors.length; row++) {
      columnScale = Math.max(columnScale, Math.abs(factors[row][pivotIndex]));
      if (Math.abs(factors[row][pivotIndex]) > Math.abs(factors[pivotRow][pivotIndex])) pivotRow = row;
    }
    if (isEffectivelyZero(factors[pivotRow][pivotIndex], columnScale)) return undefined;
    if (pivotRow !== pivotIndex) {
      [factors[pivotIndex], factors[pivotRow]] = [factors[pivotRow], factors[pivotIndex]];
      [permutation[pivotIndex], permutation[pivotRow]] = [permutation[pivotRow], permutation[pivotIndex]];
      sign *= -1;
    }
    for (let row = pivotIndex + 1; row < factors.length; row++) {
      factors[row][pivotIndex] /= factors[pivotIndex][pivotIndex];
      for (let column = pivotIndex + 1; column < factors.length; column++) {
        factors[row][column] -= factors[row][pivotIndex] * factors[pivotIndex][column];
      }
    }
  }
  return { factors, permutation, sign };
}

export function detMatrixValue(matrix: PineMatrix): number {
  assertSquareMatrix(matrix, 'Matrix determinant');
  const decomposition = decomposeLu(numericRows(matrix));
  if (!decomposition) return 0;
  let determinant = 1;
  for (let index = 0; index < matrix.rows; index++) determinant *= decomposition.factors[index][index];
  const value = determinant * decomposition.sign;
  return Object.is(value, -0) ? 0 : value;
}

export function rankMatrixValue(matrix: PineMatrix): number {
  const rows = numericRows(matrix);
  let rank = 0;

  for (let column = 0; column < matrix.columns && rank < matrix.rows; column++) {
    let pivotRow = rank;
    let columnScale = 0;
    for (let row = rank; row < matrix.rows; row++) {
      columnScale = Math.max(columnScale, Math.abs(rows[row][column]));
    }
    for (let row = rank + 1; row < matrix.rows; row++) {
      if (Math.abs(rows[row][column]) > Math.abs(rows[pivotRow][column])) {
        pivotRow = row;
      }
    }

    if (isEffectivelyZero(rows[pivotRow][column], columnScale)) {
      continue;
    }

    [rows[rank], rows[pivotRow]] = [rows[pivotRow], rows[rank]];
    const pivot = rows[rank][column];
    for (let currentColumn = column; currentColumn < matrix.columns; currentColumn++) {
      rows[rank][currentColumn] /= pivot;
    }
    for (let row = 0; row < matrix.rows; row++) {
      if (row === rank) continue;
      const factor = rows[row][column];
      for (let currentColumn = column; currentColumn < matrix.columns; currentColumn++) {
        rows[row][currentColumn] -= factor * rows[rank][currentColumn];
      }
    }
    rank += 1;
  }

  return rank;
}

function inverseFromLu(
  size: number,
  decomposition: NonNullable<ReturnType<typeof decomposeLu>>,
): PineMatrix<number> {
  const { factors, permutation } = decomposition;
  const result = createPineMatrix<number>(size, size, 0);
  for (let column = 0; column < size; column++) {
    const solution = permutation.map((originalRow) => (originalRow === column ? 1 : 0));
    for (let row = 0; row < size; row++) {
      for (let previous = 0; previous < row; previous++) solution[row] -= factors[row][previous] * solution[previous];
    }
    for (let row = size - 1; row >= 0; row--) {
      for (let next = row + 1; next < size; next++) solution[row] -= factors[row][next] * solution[next];
      solution[row] /= factors[row][row];
      result.values[row * size + column] = solution[row];
    }
  }
  return result;
}

export function invMatrixValue(matrix: PineMatrix): PineMatrix<number> {
  assertSquareMatrix(matrix, 'Matrix inverse');
  const decomposition = decomposeLu(numericRows(matrix));
  if (!decomposition) throw new Error('Matrix is singular and cannot be inverted');
  return inverseFromLu(matrix.rows, decomposition);
}

export function pinvMatrixValue(matrix: PineMatrix): PineMatrix<number> {
  const result = createPineMatrix<number>(matrix.columns, matrix.rows, 0);
  if (matrix.rows === 0 || matrix.columns === 0) return result;

  const rows = numericRows(matrix);
  if (!rows.every((row) => row.every(Number.isFinite))) {
    result.values.fill(Number.NaN);
    return result;
  }
  const transposed = matrix.rows < matrix.columns;
  const input = transposed
    ? Array.from({ length: matrix.columns }, (_, column) => rows.map((row) => row[column]))
    : rows;
  const decomposition = decomposeSingularValues(input);
  if (decomposition.scale === 0) return result;
  const largest = Math.max(...decomposition.singularValues);
  const cutoff = Math.max(matrix.rows, matrix.columns) * Number.EPSILON * largest;
  const fullRank = decomposition.singularValues.every((value) => value > cutoff);
  if (matrix.rows === matrix.columns && fullRank) {
    const lu = decomposeLu(rows);
    if (lu) {
      const inverse = inverseFromLu(matrix.rows, lu);
      inverse.values = inverse.values.map((value) => (value === 0 ? 0 : value));
      return inverse;
    }
  }
  for (let k = 0; k < decomposition.singularValues.length; k++) {
    const singular = decomposition.singularValues[k];
    if (singular <= cutoff) continue;
    const right = decomposition.rightVectors[k];
    const left = decomposition.columns[k];
    for (let row = 0; row < right.length; row++) {
      for (let column = 0; column < left.length; column++) {
        const index = transposed ? column * matrix.rows + row : row * matrix.rows + column;
        result.values[index] += ((right[row] / singular) * (left[column] / singular)) / decomposition.scale;
      }
    }
  }
  return result;
}

export function eigenvaluesMatrixValue(matrix: PineMatrix): PineArray<number> {
  assertSquareMatrix(matrix, 'Matrix eigenvalues');
  const values = createPineArray<number>();
  computeEigenvaluesOrNa(matrix, true).forEach((value) => pushArrayValue(values, value));
  return values;
}

export function eigenvectorsMatrixValue(matrix: PineMatrix): PineMatrix<number> {
  assertSquareMatrix(matrix, 'Matrix eigenvectors');
  if (matrix.rows >= 2) {
    const rows = numericRows(matrix);
    if (isFiniteSymmetricRows(rows)) {
      const decomposition = symmetricQlDecomposition(rows);
      if (matrix.rows === 2) decomposition.vectors.forEach((row) => row.reverse());
      const result = createPineMatrix<number>(matrix.rows, matrix.columns, 0);
      // Preserve the existing first-nonzero-positive convention without
      // reconstructing repeated-root vectors from the same nullspace column.
      for (let column = 0; column < matrix.columns; column++) {
        const first = decomposition.vectors.find((row) => Math.abs(row[column]) > MATRIX_EPSILON)?.[column] ?? 0;
        const sign = first < 0 ? -1 : 1;
        for (let row = 0; row < matrix.rows; row++) {
          result.values[row * matrix.columns + column] = cleanMatrixNumber(sign * decomposition.vectors[row][column]);
        }
      }
      return result;
    }
  }
  const result = createPineMatrix<number>(matrix.rows, matrix.columns, 0);
  if (matrix.rows < 2) {
    if (matrix.rows === 1) result.values[0] = 1;
    return result;
  }
  const eigenvalues = computeEigenvaluesOrNa(matrix);
  if (eigenvalues.some(Number.isNaN)) {
    result.values.fill(Number.NaN);
    return result;
  }
  const decomposition = nonsymmetricQlDecomposition(numericRows(matrix));
  const columns = Array.from({ length: matrix.rows }, (_, index) => matrix.rows - 1 - index);
  if (matrix.rows === 2)
    columns.sort((left, right) => decomposition.schur[right][right] - decomposition.schur[left][left]);
  columns.forEach((index, column) => {
    const vector = schurEigenvector(decomposition.schur, decomposition.vectors, index);
    vector.forEach((value, row) => setMatrixValue(result, row, column, value));
  });

  return result;
}

export function kronMatrixValue(left: PineMatrix, right: PineMatrix): PineMatrix<number> {
  const result = createPineMatrix<number>(left.rows * right.rows, left.columns * right.columns, 0);
  for (let leftRow = 0; leftRow < left.rows; leftRow++) {
    for (let leftColumn = 0; leftColumn < left.columns; leftColumn++) {
      const factor = Number(getMatrixValue(left, leftRow, leftColumn));
      for (let rightRow = 0; rightRow < right.rows; rightRow++) {
        for (let rightColumn = 0; rightColumn < right.columns; rightColumn++) {
          setMatrixValue(
            result,
            leftRow * right.rows + rightRow,
            leftColumn * right.columns + rightColumn,
            factor * Number(getMatrixValue(right, rightRow, rightColumn)),
          );
        }
      }
    }
  }
  return result;
}

function isDescendingOrder(order: unknown): boolean {
  return order === 'descending' || order === 'order.descending';
}

export function sortMatrixRows(matrix: PineMatrix, column: number = 0, order: unknown = 'ascending', sortField?: unknown): void {
  const columnIndex = normalizeExistingIndex(column, matrix.columns, 'column');
  const descending = isDescendingOrder(order);
  const rows = Array.from({ length: matrix.rows }, (_value, row) => matrix.values.slice(row * matrix.columns, (row + 1) * matrix.columns));
  const shouldSortByField = sortField !== undefined || rows.some((row) => isPineUdtObject(row[columnIndex]));
  rows.sort((left, right) => {
    const result = compareMatrixValues(
      comparableMatrixSortValue(left[columnIndex], sortField, shouldSortByField),
      comparableMatrixSortValue(right[columnIndex], sortField, shouldSortByField),
    );
    return result;
  });
  if (descending) rows.reverse();
  matrix.values = rows.flat();
}

export function submatrixValue<T = unknown>(
  matrix: PineMatrix<T>,
  fromRow: number = 0,
  toRow: number = matrix.rows,
  fromColumn: number = 0,
  toColumn: number = matrix.columns,
): PineMatrix<T> {
  const rowRange = normalizeRange(fromRow, toRow, matrix.rows, 'row');
  const columnRange = normalizeRange(fromColumn, toColumn, matrix.columns, 'column');
  if (rowRange.from === rowRange.to || columnRange.from === columnRange.to) {
    throw new Error('Matrix submatrix range must have from_row/column less than to_row/column');
  }
  const result = createPineMatrix<T>(rowRange.to - rowRange.from, columnRange.to - columnRange.from);
  for (let row = rowRange.from; row < rowRange.to; row++) {
    for (let column = columnRange.from; column < columnRange.to; column++) {
      setMatrixValue(result, row - rowRange.from, column - columnRange.from, getMatrixValue(matrix, row, column) as T);
    }
  }
  return result;
}

function matrixIndex(matrix: PineMatrix, row: number, column: number): number {
  const normalizedRow = normalizeExistingIndex(row, matrix.rows, 'row');
  const normalizedColumn = normalizeExistingIndex(column, matrix.columns, 'column');
  return normalizedRow * matrix.columns + normalizedColumn;
}

function mapMatrixArithmetic(
  matrix: PineMatrix,
  other: PineMatrix | number,
  operation: (left: number, right: number) => number,
): PineMatrix<number> {
  const result = createPineMatrix<number>(matrix.rows, matrix.columns);
  if (isPineMatrix(other)) {
    assertSameShape(matrix, other);
    result.values = matrix.values.map((value, index) => operation(Number(value), Number(other.values[index])));
    return result;
  }

  const scalar = Number(other);
  result.values = matrix.values.map((value) => operation(Number(value), scalar));
  return result;
}

function assertSameShape(left: PineMatrix, right: PineMatrix): void {
  if (left.rows !== right.rows || left.columns !== right.columns) {
    throw new Error(`Matrix dimensions must match. Left is ${left.rows}x${left.columns}, right is ${right.rows}x${right.columns}`);
  }
}

function assertSquareMatrix(matrix: PineMatrix, operation: string): void {
  if (!isSquareMatrix(matrix)) {
    throw new Error(`${operation} requires a square matrix. Matrix is ${matrix.rows}x${matrix.columns}`);
  }
}

function identityMatrix(size: number): PineMatrix<number> {
  const result = createPineMatrix<number>(size, size, 0);
  for (let index = 0; index < size; index++) {
    setMatrixValue(result, index, index, 1);
  }
  return result;
}

function numericRows(matrix: PineMatrix): number[][] {
  return Array.from({ length: matrix.rows }, (_rowValue, row) => {
    return Array.from({ length: matrix.columns }, (_columnValue, column) => {
      return Number(matrix.values[row * matrix.columns + column]);
    });
  });
}

function isFiniteSymmetricRows(rows: number[][]): boolean {
  return rows.every((row, i) => row.every((value, j) => Number.isFinite(value) && value === rows[j][i]));
}

// Symmetric Householder reduction and implicit QL adapted from public-domain
// NIST/MathWorks JAMA 1.0.3 (EigenvalueDecomposition.tred2/tql2).
function symmetricQlDecomposition(V: number[][]): { values: number[]; vectors: number[][] } {
  const n = V.length;
  const d = Array<number>(n).fill(0);
  const e = Array<number>(n).fill(0);
  for (let j = 0; j < n; j++) {
    d[j] = V[n - 1][j];
  }

  // Householder reduction to tridiagonal form.

  for (let i = n - 1; i > 0; i--) {
    // Scale to avoid under/overflow.

    let scale = 0.0;
    let h = 0.0;
    for (let k = 0; k < i; k++) {
      scale = scale + Math.abs(d[k]);
    }
    if (scale == 0.0) {
      e[i] = d[i - 1];
      for (let j = 0; j < i; j++) {
        d[j] = V[i - 1][j];
        V[i][j] = 0.0;
        V[j][i] = 0.0;
      }
    } else {
      // Generate Householder vector.

      for (let k = 0; k < i; k++) {
        d[k] /= scale;
        h += d[k] * d[k];
      }
      let f = d[i - 1];
      let g = Math.sqrt(h);
      if (f > 0) {
        g = -g;
      }
      e[i] = scale * g;
      h = h - f * g;
      d[i - 1] = f - g;
      for (let j = 0; j < i; j++) {
        e[j] = 0.0;
      }

      // Apply similarity transformation to remaining columns.

      for (let j = 0; j < i; j++) {
        f = d[j];
        V[j][i] = f;
        g = e[j] + V[j][j] * f;
        for (let k = j + 1; k <= i - 1; k++) {
          g += V[k][j] * d[k];
          e[k] += V[k][j] * f;
        }
        e[j] = g;
      }
      f = 0.0;
      for (let j = 0; j < i; j++) {
        e[j] /= h;
        f += e[j] * d[j];
      }
      let hh = f / (h + h);
      for (let j = 0; j < i; j++) {
        e[j] -= hh * d[j];
      }
      for (let j = 0; j < i; j++) {
        f = d[j];
        g = e[j];
        for (let k = j; k <= i - 1; k++) {
          V[k][j] -= f * e[k] + g * d[k];
        }
        d[j] = V[i - 1][j];
        V[i][j] = 0.0;
      }
    }
    d[i] = h;
  }

  // Accumulate transformations.

  for (let i = 0; i < n - 1; i++) {
    V[n - 1][i] = V[i][i];
    V[i][i] = 1.0;
    let h = d[i + 1];
    if (h != 0.0) {
      for (let k = 0; k <= i; k++) {
        d[k] = V[k][i + 1] / h;
      }
      for (let j = 0; j <= i; j++) {
        let g = 0.0;
        for (let k = 0; k <= i; k++) {
          g += V[k][i + 1] * V[k][j];
        }
        for (let k = 0; k <= i; k++) {
          V[k][j] -= g * d[k];
        }
      }
    }
    for (let k = 0; k <= i; k++) {
      V[k][i + 1] = 0.0;
    }
  }
  for (let j = 0; j < n; j++) {
    d[j] = V[n - 1][j];
    V[n - 1][j] = 0.0;
  }
  V[n - 1][n - 1] = 1.0;
  e[0] = 0.0;

  // Symmetric tridiagonal QL algorithm.

  //  This is derived from the Algol procedures tql2, by
  //  Bowdler, Martin, Reinsch, and Wilkinson, Handbook for
  //  Auto. Comp., Vol.ii-Linear Algebra, and the corresponding
  //  Fortran subroutine in EISPACK.

  for (let i = 1; i < n; i++) {
    e[i - 1] = e[i];
  }
  e[n - 1] = 0.0;

  for (let l = 0; l < n; l++) {
    let iterations = 0;
    while (true) {
      let m = l;
      for (; m < n - 1; m++) {
        const magnitude = Math.abs(d[m]) + Math.abs(d[m + 1]);
        if (magnitude + Math.abs(e[m]) === magnitude) break;
      }
      if (m === l) break;
      if (++iterations > 128 * n)
        throw new Error('Matrix eigenvalues are complex or QL iteration did not converge to real diagonal values');

      let g = (d[l + 1] - d[l]) / (2 * e[l]);
      let r = Math.hypot(g, 1);
      g = d[m] - d[l] + e[l] / (g + (g < 0 ? -r : r));
      let sine = 1;
      let cosine = 1;
      let shift = 0;
      for (let i = m - 1; i >= l; i--) {
        const f = sine * e[i];
        const b = cosine * e[i];
        if (Math.abs(f) >= Math.abs(g)) {
          cosine = g / f;
          r = Math.sqrt(cosine * cosine + 1);
          e[i + 1] = f * r;
          sine = 1 / r;
          cosine *= sine;
        } else {
          sine = f / g;
          r = Math.sqrt(sine * sine + 1);
          e[i + 1] = g * r;
          cosine = 1 / r;
          sine *= cosine;
        }
        g = d[i + 1] - shift;
        r = (d[i] - g) * sine + 2 * cosine * b;
        shift = sine * r;
        d[i + 1] = g + shift;
        g = cosine * r - b;
        for (let k = 0; k < n; k++) {
          const next = V[k][i + 1];
          V[k][i + 1] = sine * V[k][i] + cosine * next;
          V[k][i] = cosine * V[k][i] - sine * next;
        }
      }
      d[l] -= shift;
      e[l] = g;
      e[m] = 0;
    }
  }

  // Sort eigenvalues and corresponding vectors.

  for (let i = 0; i < n - 1; i++) {
    let k = i;
    let p = d[i];
    for (let j = i + 1; j < n; j++) {
      if (d[j] < p) {
        k = j;
        p = d[j];
      }
    }
    if (k != i) {
      d[k] = d[i];
      d[i] = p;
      for (let j = 0; j < n; j++) {
        p = V[j][i];
        V[j][i] = V[j][k];
        V[j][k] = p;
      }
    }
  }

  return { values: d, vectors: V };
}

function computeEigenvalues(matrix: PineMatrix, publishComplexRealParts = false): number[] {
  if (matrix.rows === 0) return [];
  if (matrix.rows === 1) return [Number(getMatrixValue(matrix, 0, 0))];
  const rows = numericRows(matrix);
  if (isFiniteSymmetricRows(rows)) return symmetricQlDecomposition(rows).values.reverse();
  const decomposition = nonsymmetricQlDecomposition(rows);
  if (decomposition.complex) {
    if (publishComplexRealParts && matrix.rows > 2) {
      const realParts = complexSchurRealParts(decomposition.schur);
      if (realParts) return realParts.reverse();
    }
    throw new Error('Matrix eigenvalues are complex and cannot be represented as real values');
  }
  const values = decomposition.schur.map((row, index) => cleanMatrixNumber(row[index])).reverse();
  return matrix.rows === 2 ? values.sort((left, right) => right - left) : values;
}

// Reversing the basis converts implicit upper-Hessenberg bulge chasing into
// implicit QL: J(QR)J = (JQJ)(JRJ), with the triangular factor lower.
function nonsymmetricQlDecomposition(rows: number[][]): { schur: number[][]; vectors: number[][]; complex: boolean } {
  const size = rows.length;
  const schur = rows.map((row) => row.slice().reverse()).reverse();
  const vectors = createNumericSquare(size);
  for (let i = 0; i < size; i++) vectors[i][i] = 1;
  if (rows.some((row) => row.some((value) => !Number.isFinite(value)))) {
    throw new Error('Matrix eigenvalues are complex or implicit QL did not converge to real diagonal values');
  }
  for (let column = 0; column < size - 2; column++) {
    const reflector = schur.slice(column + 1).map((row) => row[column]);
    const scale = Math.max(...reflector.map(Math.abs));
    if (scale === 0) continue;
    for (let i = 0; i < reflector.length; i++) reflector[i] /= scale;
    reflector[0] += (reflector[0] < 0 ? -1 : 1) * Math.hypot(...reflector);
    const norm = Math.hypot(...reflector);
    for (let i = 0; i < reflector.length; i++) reflector[i] /= norm;
    for (let j = column; j < size; j++) {
      let projection = 0;
      for (let i = 0; i < reflector.length; i++) projection += reflector[i] * schur[column + 1 + i][j];
      for (let i = 0; i < reflector.length; i++) schur[column + 1 + i][j] -= 2 * reflector[i] * projection;
    }
    for (const target of [schur, vectors]) {
      for (let i = 0; i < size; i++) {
        let projection = 0;
        for (let j = 0; j < reflector.length; j++) projection += target[i][column + 1 + j] * reflector[j];
        for (let j = 0; j < reflector.length; j++) target[i][column + 1 + j] -= 2 * projection * reflector[j];
      }
    }
    for (let i = column + 2; i < size; i++) schur[i][column] = 0;
  }
  let end = size - 1;
  let complex = false;
  let iterations = 0;
  while (end > 0) {
    for (let i = 1; i <= end; i++) {
      const tolerance = Number.EPSILON * (Math.abs(schur[i - 1][i - 1]) + Math.abs(schur[i][i]));
      if (Math.abs(schur[i][i - 1]) <= tolerance) schur[i][i - 1] = 0;
    }
    if (schur[end][end - 1] === 0) {
      end--;
      iterations = 0;
      continue;
    }
    let start = end - 1;
    while (start > 0 && schur[start][start - 1] !== 0) start--;
    const a = schur[end - 1][end - 1];
    const b = schur[end - 1][end];
    const c = schur[end][end - 1];
    const d = schur[end][end];
    const halfDifference = (a - d) / 2;
    const discriminant = halfDifference * halfDifference + b * c;
    if (start === end - 1 && discriminant < 0) {
      complex = true;
      end -= 2;
      iterations = 0;
      continue;
    }
    if (++iterations > 128)
      throw new Error('Matrix eigenvalues are complex or implicit QL did not converge to real diagonal values');
    const shift = discriminant >= 0 ? d + halfDifference - (halfDifference < 0 ? -1 : 1) * Math.sqrt(discriminant) : d;
    for (let i = start; i <= end; i++) schur[i][i] -= shift;
    for (let k = start; k < end; k++) {
      const x = k === start ? schur[k][k] : schur[k][k - 1];
      const y = k === start ? schur[k + 1][k] : schur[k + 1][k - 1];
      const norm = Math.hypot(x, y);
      if (norm === 0) continue;
      const cosine = x / norm;
      const sine = y / norm;
      for (let j = Math.max(0, k - 1); j < size; j++) {
        const upper = schur[k][j];
        const lower = schur[k + 1][j];
        schur[k][j] = cosine * upper + sine * lower;
        schur[k + 1][j] = -sine * upper + cosine * lower;
      }
      for (const target of [schur, vectors]) {
        for (let i = 0; i < size; i++) {
          const left = target[i][k];
          const right = target[i][k + 1];
          target[i][k] = cosine * left + sine * right;
          target[i][k + 1] = -sine * left + cosine * right;
        }
      }
      if (k > start) schur[k + 1][k - 1] = 0;
    }
    for (let i = start; i <= end; i++) schur[i][i] += shift;
  }
  return { schur, vectors, complex };
}

function complexSchurRealParts(rows: number[][]): number[] | undefined {
  for (let i = 0; i < rows.length; i++) {
    for (let j = 0; j < rows.length; j++) {
      if (!Number.isFinite(rows[i][j]) || (i > j + 1 && rows[i][j] !== 0)) return;
    }
  }
  const values: number[] = [];
  let hasComplexPair = false;
  for (let i = 0; i < rows.length; i++) {
    if (i + 1 < rows.length && rows[i + 1][i] !== 0) {
      if (i + 2 < rows.length && rows[i + 2][i + 1] !== 0) return;
      const trace = rows[i][i] + rows[i + 1][i + 1];
      const determinant = rows[i][i] * rows[i + 1][i + 1] - rows[i][i + 1] * rows[i + 1][i];
      const discriminant = trace * trace - 4 * determinant;
      if (!Number.isFinite(discriminant) || discriminant >= 0 || !Number.isFinite(trace)) return;
      values.push(trace / 2, trace / 2);
      hasComplexPair = true;
      i++;
    } else {
      values.push(rows[i][i]);
    }
  }
  return hasComplexPair ? values : undefined;
}

function computeEigenvaluesOrNa(matrix: PineMatrix, publishComplexRealParts = false): number[] {
  try {
    return computeEigenvalues(matrix, publishComplexRealParts);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Matrix eigenvalues are complex')) {
      reportMatrixRuntimeApproximation({
        site: 'matrix.eigenvalues.complex-roots',
        message: 'Complex matrix eigen roots are represented as na placeholders; TradingView no-data/error behavior is trace-required.',
      });
      return Array.from({ length: matrix.rows }, () => Number.NaN);
    }
    throw error;
  }
}

function schurEigenvector(schur: number[][], basis: number[][], index: number): number[] {
  const size = schur.length;
  const root = schur[index][index];
  const coordinates = Array<number>(size).fill(0);
  coordinates[index] = 1;
  for (let row = index - 1; row >= 0; row--) {
    let total = 0;
    for (let column = row + 1; column <= index; column++) total += schur[row][column] * coordinates[column];
    const denominator = schur[row][row] - root;
    if (denominator === 0 && total !== 0) return schurEigenvector(schur, basis, row);
    coordinates[row] = denominator === 0 ? 0 : -total / denominator;
  }
  const vector = basis.map((row) => dotVector(row, coordinates)).reverse();
  return normalizeEigenvector(vector);
}

function normalizeEigenvector(vector: number[]): number[] {
  const norm = Math.sqrt(dotVector(vector, vector));
  const normalized = norm <= MATRIX_EPSILON ? unitVector(vector.length, 0) : vector.map((value) => cleanMatrixNumber(value / norm));
  const firstNonZero = normalized.find((value) => Math.abs(value) > MATRIX_EPSILON);
  if (firstNonZero !== undefined && firstNonZero < 0) {
    return normalized.map((value) => cleanMatrixNumber(-value));
  }
  return normalized;
}

function createNumericSquare(size: number): number[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
}

function unitVector(size: number, index: number): number[] {
  return Array.from({ length: size }, (_value, currentIndex) => (currentIndex === index ? 1 : 0));
}

function cleanMatrixNumber(value: number): number {
  return Math.abs(value) <= MATRIX_EPSILON ? 0 : value;
}

function dotVector(left: number[], right: number[]): number {
  let total = 0;
  for (let index = 0; index < left.length; index++) total += left[index] * right[index];
  return total;
}

function isEffectivelyZero(value: number, scale: number): boolean {
  if (scale === 0) {
    return value === 0;
  }
  return Math.abs(value) <= scale * MATRIX_EPSILON;
}

function approxEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <= Math.max(1, Math.abs(left), Math.abs(right)) * MATRIX_EPSILON;
}

function compareMatrixValues(left: unknown, right: unknown): number {
  const leftMissing = left === '' || (typeof left === 'number' && Number.isNaN(left));
  const rightMissing = right === '' || (typeof right === 'number' && Number.isNaN(right));
  if (leftMissing || rightMissing) {
    if (leftMissing && rightMissing) return 0;
    return leftMissing ? 1 : -1;
  }

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }
  return compareStrings(String(left), String(right));
}

function comparableMatrixSortValue(value: unknown, sortField: unknown, byField: boolean): unknown {
  if (!byField) return value;
  if (!isPineUdtObject(value)) {
    throw new Error('Matrix sort_field requires user-defined type values in the selected column');
  }
  if (sortField === undefined) {
    return getUdtFieldByIndex(value, 0);
  }
  if (typeof sortField === 'string') {
    return getUdtField(value, sortField);
  }
  if (typeof sortField === 'number') {
    return getUdtFieldByIndex(value, sortField);
  }
  throw new Error('Matrix sort_field must be a field name or field index');
}

function getUdtFieldByIndex(object: PineUdtObject, fieldIndex: number): unknown {
  const normalizedIndex = Math.trunc(Number(fieldIndex));
  if (!Number.isFinite(normalizedIndex) || normalizedIndex < 0 || normalizedIndex >= object.fields.size) {
    throw new Error(`Matrix sort_field index ${normalizedIndex} is out of bounds for type ${object.typeName}`);
  }
  return Array.from(object.fields.values())[normalizedIndex];
}

function normalizeRange(from: number, to: number, size: number, label: string): { from: number; to: number } {
  const normalizedFrom = Math.trunc(Number(from));
  const normalizedTo = Math.trunc(Number(to));
  if (!Number.isFinite(normalizedFrom) || !Number.isFinite(normalizedTo)) {
    throw new Error(`Matrix ${label} range must use finite numbers`);
  }
  if (normalizedFrom < 0 || normalizedTo > size || normalizedFrom > normalizedTo) {
    throw new Error(`Matrix ${label} range ${normalizedFrom}..${normalizedTo} is out of bounds. ${label} count is ${size}`);
  }
  return { from: normalizedFrom, to: normalizedTo };
}

function multiplyMatrices(left: PineMatrix, right: PineMatrix): PineMatrix<number> {
  if (left.columns !== right.rows) {
    throw new Error(`Matrix multiplication requires left columns to match right rows. Left is ${left.rows}x${left.columns}, right is ${right.rows}x${right.columns}`);
  }

  const result = createPineMatrix<number>(left.rows, right.columns, 0);
  for (let row = 0; row < left.rows; row++) {
    for (let column = 0; column < right.columns; column++) {
      let total = 0;
      for (let index = 0; index < left.columns; index++) {
        total += Number(left.values[row * left.columns + index]) * Number(right.values[index * right.columns + column]);
      }
      setMatrixValue(result, row, column, total);
    }
  }
  return result;
}

function multiplyMatrixByArray(matrix: PineMatrix, array: PineArray): PineArray<number> {
  const values = pineArrayValues(array);
  if (matrix.columns !== values.length) {
    throw new Error(`Matrix-vector multiplication requires matrix columns to match array size. Matrix is ${matrix.rows}x${matrix.columns}, array size is ${values.length}`);
  }

  const result = createPineArray<number>();
  for (let row = 0; row < matrix.rows; row++) {
    let total = 0;
    for (let column = 0; column < matrix.columns; column++) {
      total += Number(matrix.values[row * matrix.columns + column]) * Number(values[column]);
    }
    pushArrayValue(result, total);
  }
  return result;
}

function matrixValuesAsArray(matrix: PineMatrix): PineArray {
  return {
    __tealscriptArray: true,
    values: [...matrix.values],
  };
}

function pineArrayValues<T = unknown>(array: PineArray<T>): T[] {
  return Array.from({ length: getArraySize(array) }, (_value, index) => getArrayValue(array, index) as T);
}

function normalizeInsertionIndex(index: number, size: number, label: string): number {
  const normalized = Math.trunc(Number(index));
  if (!Number.isFinite(normalized) || normalized < 0 || normalized > size) {
    throw new Error(`Matrix ${label} ${normalized} is out of bounds. ${label} count is ${size}`);
  }
  return normalized;
}

function swapMatrixValues(matrix: PineMatrix, first: number, second: number): void {
  const firstValue = matrix.values[first];
  matrix.values[first] = matrix.values[second];
  matrix.values[second] = firstValue;
}

function normalizeDimension(value: number, label: string): number {
  const normalized = Math.trunc(Number(value));
  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new Error(`Matrix ${label} must be a non-negative integer`);
  }
  return normalized;
}

function normalizeExistingIndex(index: number, size: number, label: string): number {
  const normalized = Math.trunc(Number(index));
  if (!Number.isFinite(normalized) || normalized < 0 || normalized >= size) {
    throw new Error(`Matrix ${label} ${normalized} is out of bounds. ${label} count is ${size}`);
  }
  return normalized;
}
