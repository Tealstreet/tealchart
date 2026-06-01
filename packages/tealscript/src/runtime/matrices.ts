import {
  avgArrayValue,
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

export interface PineMatrix<T = unknown> {
  readonly __tealscriptMatrix: true;
  rows: number;
  columns: number;
  values: T[];
}

const MATRIX_EPSILON = 1e-10;

export function createPineMatrix<T = unknown>(rows: number = 0, columns: number = 0, initialValue?: T): PineMatrix<T> {
  const safeRows = normalizeDimension(rows, 'rows');
  const safeColumns = normalizeDimension(columns, 'columns');
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

export function fillMatrix<T = unknown>(matrix: PineMatrix<T>, value: T): void {
  matrix.values.fill(value);
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
  const rowValues = values ? pineArrayValues(values) : Array.from({ length: matrix.columns }, () => undefined as T);
  if (matrix.rows === 0 && matrix.columns === 0) {
    matrix.columns = rowValues.length;
  } else if (rowValues.length !== matrix.columns) {
    throw new Error(`Matrix row length ${rowValues.length} does not match column count ${matrix.columns}`);
  }
  matrix.values.splice(rowIndex * matrix.columns, 0, ...rowValues);
  matrix.rows += 1;
}

export function addMatrixColumn<T = unknown>(matrix: PineMatrix<T>, column: number | undefined, values?: PineArray<T>): void {
  const columnIndex = normalizeInsertionIndex(column ?? matrix.columns, matrix.columns, 'column');
  const columnValues = values ? pineArrayValues(values) : Array.from({ length: matrix.rows }, () => undefined as T);
  if (matrix.rows === 0 && matrix.columns === 0) {
    matrix.rows = columnValues.length;
  } else if (columnValues.length !== matrix.rows) {
    throw new Error(`Matrix column length ${columnValues.length} does not match row count ${matrix.rows}`);
  }

  for (let row = matrix.rows - 1; row >= 0; row--) {
    matrix.values.splice(row * matrix.columns + columnIndex, 0, columnValues[row] as T);
  }
  matrix.columns += 1;
}

export function removeMatrixRow<T = unknown>(matrix: PineMatrix<T>, row: number): PineArray<T> {
  const rowIndex = normalizeExistingIndex(row, matrix.rows, 'row');
  const removed = createPineArray<T>();
  const values = matrix.values.splice(rowIndex * matrix.columns, matrix.columns);
  values.forEach((value) => pushArrayValue(removed, value));
  matrix.rows -= 1;
  return removed;
}

export function removeMatrixColumn<T = unknown>(matrix: PineMatrix<T>, column: number): PineArray<T> {
  const columnIndex = normalizeExistingIndex(column, matrix.columns, 'column');
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
  const first = normalizeExistingIndex(firstColumn, matrix.columns, 'column');
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

export function detMatrixValue(matrix: PineMatrix): number {
  assertSquareMatrix(matrix, 'Matrix determinant');
  const rows = numericRows(matrix);
  let determinant = 1;
  let sign = 1;

  for (let pivotIndex = 0; pivotIndex < matrix.rows; pivotIndex++) {
    let pivotRow = pivotIndex;
    let columnScale = 0;
    for (let row = pivotIndex; row < matrix.rows; row++) {
      columnScale = Math.max(columnScale, Math.abs(rows[row][pivotIndex]));
    }
    for (let row = pivotIndex + 1; row < matrix.rows; row++) {
      if (Math.abs(rows[row][pivotIndex]) > Math.abs(rows[pivotRow][pivotIndex])) {
        pivotRow = row;
      }
    }

    const pivot = rows[pivotRow][pivotIndex];
    if (isEffectivelyZero(pivot, columnScale)) {
      return 0;
    }

    if (pivotRow !== pivotIndex) {
      [rows[pivotIndex], rows[pivotRow]] = [rows[pivotRow], rows[pivotIndex]];
      sign *= -1;
    }

    determinant *= rows[pivotIndex][pivotIndex];
    for (let row = pivotIndex + 1; row < matrix.rows; row++) {
      const factor = rows[row][pivotIndex] / rows[pivotIndex][pivotIndex];
      for (let column = pivotIndex; column < matrix.columns; column++) {
        rows[row][column] -= factor * rows[pivotIndex][column];
      }
    }
  }

  const value = determinant * sign;
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

export function invMatrixValue(matrix: PineMatrix): PineMatrix<number> {
  assertSquareMatrix(matrix, 'Matrix inverse');
  const size = matrix.rows;
  const rows = numericRows(matrix).map((row, rowIndex) => {
    return [...row, ...Array.from({ length: size }, (_value, column) => (rowIndex === column ? 1 : 0))];
  });

  for (let pivotIndex = 0; pivotIndex < size; pivotIndex++) {
    let pivotRow = pivotIndex;
    let columnScale = 0;
    for (let row = pivotIndex; row < size; row++) {
      columnScale = Math.max(columnScale, Math.abs(rows[row][pivotIndex]));
      if (Math.abs(rows[row][pivotIndex]) > Math.abs(rows[pivotRow][pivotIndex])) {
        pivotRow = row;
      }
    }

    const pivot = rows[pivotRow][pivotIndex];
    if (isEffectivelyZero(pivot, columnScale)) {
      throw new Error('Matrix is singular and cannot be inverted');
    }

    [rows[pivotIndex], rows[pivotRow]] = [rows[pivotRow], rows[pivotIndex]];
    const normalizedPivot = rows[pivotIndex][pivotIndex];
    for (let column = 0; column < size * 2; column++) {
      rows[pivotIndex][column] /= normalizedPivot;
    }

    for (let row = 0; row < size; row++) {
      if (row === pivotIndex) continue;
      const factor = rows[row][pivotIndex];
      for (let column = 0; column < size * 2; column++) {
        rows[row][column] -= factor * rows[pivotIndex][column];
      }
    }
  }

  const result = createPineMatrix<number>(size, size, 0);
  result.values = rows.flatMap((row) => row.slice(size));
  return result;
}

export function pinvMatrixValue(matrix: PineMatrix): PineMatrix<number> {
  if (matrix.rows === 0 || matrix.columns === 0) {
    return createPineMatrix<number>(matrix.columns, matrix.rows, 0);
  }

  const columns = matrixColumns(matrix);
  let inverse = initialPseudoinverse(columns[0]);
  const basisColumns = [columns[0]];

  for (let columnIndex = 1; columnIndex < columns.length; columnIndex++) {
    const column = columns[columnIndex];
    const projection = multiplyMatrixByVector(inverse, column);
    const residual = subtractVectors(column, multiplyColumnsByVector(basisColumns, projection));
    const residualNormSquared = dotVector(residual, residual);
    const correction = residualNormSquared > MATRIX_EPSILON
      ? residual.map((value) => value / residualNormSquared)
      : multiplyTransposeMatrixByVector(inverse, projection).map((value) => value / (1 + dotVector(projection, projection)));

    inverse = [
      ...inverse.map((row, rowIndex) => subtractVectors(row, correction.map((value) => projection[rowIndex] * value))),
      correction,
    ];
    basisColumns.push(column);
  }

  const result = createPineMatrix<number>(matrix.columns, matrix.rows, 0);
  result.values = inverse.flat();
  return result;
}

export function eigenvaluesMatrixValue(matrix: PineMatrix): PineArray<number> {
  assertSquareMatrix(matrix, 'Matrix eigenvalues');
  const values = createPineArray<number>();
  computeEigenvalues(matrix).forEach((value) => pushArrayValue(values, value));
  return values;
}

export function eigenvectorsMatrixValue(matrix: PineMatrix): PineMatrix<number> {
  assertSquareMatrix(matrix, 'Matrix eigenvectors');
  const eigenvalues = computeEigenvalues(matrix);
  const result = createPineMatrix<number>(matrix.rows, matrix.columns, 0);

  eigenvalues.forEach((eigenvalue, column) => {
    const vector = eigenvectorForValue(matrix, eigenvalue, column);
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

export function sortMatrixRows(matrix: PineMatrix, column: number = 0, order: unknown = 'ascending'): void {
  const columnIndex = normalizeExistingIndex(column, matrix.columns, 'column');
  const descending = order === 'descending';
  const rows = Array.from({ length: matrix.rows }, (_value, row) => matrix.values.slice(row * matrix.columns, (row + 1) * matrix.columns));
  rows.sort((left, right) => {
    const result = compareMatrixValues(left[columnIndex], right[columnIndex]);
    return descending ? -result : result;
  });
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

function computeEigenvalues(matrix: PineMatrix): number[] {
  if (matrix.rows === 0) return [];
  if (matrix.rows === 1) return [Number(getMatrixValue(matrix, 0, 0))];
  if (matrix.rows === 2) return computeTwoByTwoEigenvalues(matrix);

  const rows = numericRows(matrix);
  const iterations = 128;
  for (let iteration = 0; iteration < iterations; iteration++) {
    const { q, r } = qrDecomposition(rows);
    const nextRows = multiplyNumericMatrices(r, q);
    rows.splice(0, rows.length, ...nextRows);
    if (offDiagonalNorm(rows) <= MATRIX_EPSILON) break;
  }

  if (offDiagonalNorm(rows) > MATRIX_EPSILON) {
    throw new Error('Matrix eigenvalues are complex or QR iteration did not converge to real diagonal values');
  }

  return rows.map((row, index) => cleanMatrixNumber(row[index]));
}

function computeTwoByTwoEigenvalues(matrix: PineMatrix): number[] {
  const a = Number(getMatrixValue(matrix, 0, 0));
  const b = Number(getMatrixValue(matrix, 0, 1));
  const c = Number(getMatrixValue(matrix, 1, 0));
  const d = Number(getMatrixValue(matrix, 1, 1));
  const trace = a + d;
  const determinant = a * d - b * c;
  const discriminant = trace * trace - 4 * determinant;
  if (discriminant < -MATRIX_EPSILON) {
    throw new Error('Matrix eigenvalues are complex and cannot be represented as real values');
  }
  const root = Math.sqrt(Math.max(0, discriminant));
  return [cleanMatrixNumber((trace + root) / 2), cleanMatrixNumber((trace - root) / 2)];
}

function eigenvectorForValue(matrix: PineMatrix, eigenvalue: number, preferredFreeColumn: number): number[] {
  const rows = numericRows(matrix).map((row, rowIndex) => {
    return row.map((value, columnIndex) => value - (rowIndex === columnIndex ? eigenvalue : 0));
  });
  const { reduced, pivotColumns } = reducedRowEchelon(rows);
  const freeColumn = chooseFreeColumn(matrix.columns, pivotColumns, preferredFreeColumn);
  const vector = Array.from({ length: matrix.columns }, () => 0);
  vector[freeColumn] = 1;

  for (let row = pivotColumns.length - 1; row >= 0; row--) {
    const pivotColumn = pivotColumns[row];
    let total = 0;
    for (let column = pivotColumn + 1; column < matrix.columns; column++) {
      total += reduced[row][column] * vector[column];
    }
    vector[pivotColumn] = -total;
  }

  return normalizeEigenvector(vector);
}

function reducedRowEchelon(rows: number[][]): { reduced: number[][]; pivotColumns: number[] } {
  const reduced = rows.map((row) => [...row]);
  const pivotColumns: number[] = [];
  let pivotRow = 0;

  for (let column = 0; column < reduced[0].length && pivotRow < reduced.length; column++) {
    let bestRow = pivotRow;
    for (let row = pivotRow + 1; row < reduced.length; row++) {
      if (Math.abs(reduced[row][column]) > Math.abs(reduced[bestRow][column])) {
        bestRow = row;
      }
    }
    if (Math.abs(reduced[bestRow][column]) <= MATRIX_EPSILON) continue;

    [reduced[pivotRow], reduced[bestRow]] = [reduced[bestRow], reduced[pivotRow]];
    const pivot = reduced[pivotRow][column];
    for (let currentColumn = column; currentColumn < reduced[pivotRow].length; currentColumn++) {
      reduced[pivotRow][currentColumn] /= pivot;
    }

    for (let row = 0; row < reduced.length; row++) {
      if (row === pivotRow) continue;
      const factor = reduced[row][column];
      for (let currentColumn = column; currentColumn < reduced[row].length; currentColumn++) {
        reduced[row][currentColumn] -= factor * reduced[pivotRow][currentColumn];
      }
    }

    pivotColumns.push(column);
    pivotRow += 1;
  }

  return { reduced, pivotColumns };
}

function chooseFreeColumn(size: number, pivotColumns: number[], preferredFreeColumn: number): number {
  const pivots = new Set(pivotColumns);
  const preferred = preferredFreeColumn % size;
  if (!pivots.has(preferred)) return preferred;
  for (let column = size - 1; column >= 0; column--) {
    if (!pivots.has(column)) return column;
  }
  throw new Error('Failed to compute eigenvector basis: no free variable found for eigenvalue');
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

function qrDecomposition(matrix: number[][]): { q: number[][]; r: number[][] } {
  const size = matrix.length;
  const qColumns: number[][] = [];
  const r = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));

  for (let column = 0; column < size; column++) {
    let vector = matrix.map((row) => row[column]);
    for (let basis = 0; basis < qColumns.length; basis++) {
      const projection = dotVector(qColumns[basis], vector);
      r[basis][column] = projection;
      vector = subtractVectors(vector, qColumns[basis].map((value) => projection * value));
    }

    const norm = Math.sqrt(dotVector(vector, vector));
    r[column][column] = norm;
    qColumns.push(norm <= MATRIX_EPSILON ? unitVector(size, column) : vector.map((value) => value / norm));
  }

  const q = Array.from({ length: size }, (_rowValue, row) => qColumns.map((column) => column[row]));
  return { q, r };
}

function multiplyNumericMatrices(left: number[][], right: number[][]): number[][] {
  return left.map((row, rowIndex) => {
    return right[0].map((_value, columnIndex) => {
      return row.reduce((total, _leftValue, innerIndex) => total + left[rowIndex][innerIndex] * right[innerIndex][columnIndex], 0);
    });
  });
}

function offDiagonalNorm(matrix: number[][]): number {
  return matrix.reduce((total, row, rowIndex) => {
    return total + row.reduce((rowTotal, value, columnIndex) => rowTotal + (rowIndex === columnIndex ? 0 : Math.abs(value)), 0);
  }, 0);
}

function unitVector(size: number, index: number): number[] {
  return Array.from({ length: size }, (_value, currentIndex) => (currentIndex === index ? 1 : 0));
}

function cleanMatrixNumber(value: number): number {
  return Math.abs(value) <= MATRIX_EPSILON ? 0 : value;
}

function matrixColumns(matrix: PineMatrix): number[][] {
  return Array.from({ length: matrix.columns }, (_columnValue, column) => {
    return Array.from({ length: matrix.rows }, (_rowValue, row) => Number(getMatrixValue(matrix, row, column)));
  });
}

function initialPseudoinverse(column: number[]): number[][] {
  const normSquared = dotVector(column, column);
  if (normSquared <= MATRIX_EPSILON) {
    return [Array.from({ length: column.length }, () => 0)];
  }
  return [column.map((value) => value / normSquared)];
}

function multiplyMatrixByVector(matrix: number[][], vector: number[]): number[] {
  return matrix.map((row) => dotVector(row, vector));
}

function multiplyTransposeMatrixByVector(matrix: number[][], vector: number[]): number[] {
  if (matrix.length === 0) return [];
  return Array.from({ length: matrix[0].length }, (_value, column) => {
    return matrix.reduce((total, row, rowIndex) => total + row[column] * vector[rowIndex], 0);
  });
}

function multiplyColumnsByVector(columns: number[][], vector: number[]): number[] {
  if (columns.length === 0) return [];
  return Array.from({ length: columns[0].length }, (_value, row) => {
    return columns.reduce((total, column, columnIndex) => total + column[row] * vector[columnIndex], 0);
  });
}

function subtractVectors(left: number[], right: number[]): number[] {
  return left.map((value, index) => value - right[index]);
}

function dotVector(left: number[], right: number[]): number {
  return left.reduce((total, value, index) => total + value * right[index], 0);
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
  return String(left).localeCompare(String(right));
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
