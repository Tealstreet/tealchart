import { createPineArray, getArraySize, getArrayValue, pushArrayValue, type PineArray } from './arrays';

export interface PineMatrix<T = unknown> {
  readonly __tealscriptMatrix: true;
  rows: number;
  columns: number;
  values: T[];
}

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

function matrixIndex(matrix: PineMatrix, row: number, column: number): number {
  const normalizedRow = normalizeExistingIndex(row, matrix.rows, 'row');
  const normalizedColumn = normalizeExistingIndex(column, matrix.columns, 'column');
  return normalizedRow * matrix.columns + normalizedColumn;
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
