import { describe, expect, it } from 'vitest';

import { createPineArray, getArrayValue, pushArrayValue } from './arrays';
import {
  addMatrixColumn,
  addMatrixRow,
  avgMatrixValue,
  copyMatrix,
  createPineMatrix,
  detMatrixValue,
  diffMatrixValue,
  fillMatrix,
  getMatrixColumns,
  getMatrixElementCount,
  getMatrixRows,
  getMatrixValue,
  isPineMatrix,
  isSquareMatrix,
  isValidMatrix,
  matrixColumn,
  matrixRow,
  maxMatrixValue,
  medianMatrixValue,
  minMatrixValue,
  modeMatrixValue,
  multMatrixValue,
  powMatrixValue,
  rankMatrixValue,
  removeMatrixColumn,
  removeMatrixRow,
  reshapeMatrix,
  reverseMatrix,
  setMatrixValue,
  sumMatrixValue,
  swapMatrixColumns,
  swapMatrixRows,
  traceMatrixValue,
  transposeMatrix,
} from './matrices';

describe('PineMatrix', () => {
  it('creates matrices with dimensions and initial values', () => {
    const matrix = createPineMatrix(2, 3, 7);

    expect(isPineMatrix(matrix)).toBe(true);
    expect(getMatrixRows(matrix)).toBe(2);
    expect(getMatrixColumns(matrix)).toBe(3);
    expect(getMatrixElementCount(matrix)).toBe(6);
    expect(matrix.values).toEqual([7, 7, 7, 7, 7, 7]);
  });

  it('reads, writes, copies, and extracts rows and columns', () => {
    const matrix = createPineMatrix<number>(2, 2, 0);

    setMatrixValue(matrix, 0, 1, 3);
    setMatrixValue(matrix, 1, 0, 5);
    const copy = copyMatrix(matrix);
    setMatrixValue(copy, 0, 1, 9);

    expect(getMatrixValue(matrix, 0, 1)).toBe(3);
    expect(getMatrixValue(copy, 0, 1)).toBe(9);
    expect(getArrayValue(matrixRow(matrix, 1), 0)).toBe(5);
    expect(getArrayValue(matrixColumn(matrix, 1), 0)).toBe(3);
  });

  it('throws on invalid dimensions or coordinates', () => {
    expect(() => createPineMatrix(-1, 2)).toThrow('Matrix rows must be a non-negative integer');

    const matrix = createPineMatrix(1, 1, 0);
    expect(() => getMatrixValue(matrix, 1, 0)).toThrow('Matrix row 1 is out of bounds. row count is 1');
    expect(() => setMatrixValue(matrix, 0, 1, 4)).toThrow('Matrix column 1 is out of bounds. column count is 1');
  });

  it('checks validity and square shape', () => {
    expect(isValidMatrix(createPineMatrix(2, 2))).toBe(true);
    expect(isValidMatrix(null)).toBe(false);
    expect(isSquareMatrix(createPineMatrix(2, 2))).toBe(true);
    expect(isSquareMatrix(createPineMatrix(2, 3))).toBe(false);
  });

  it('mutates rows, columns, and shape', () => {
    const matrix = createPineMatrix<number>(2, 2, 0);
    setMatrixValue(matrix, 0, 0, 1);
    setMatrixValue(matrix, 0, 1, 2);
    setMatrixValue(matrix, 1, 0, 3);
    setMatrixValue(matrix, 1, 1, 4);

    addMatrixRow(matrix, 1, matrixRow(matrix, 0));
    expect(matrix.values).toEqual([1, 2, 1, 2, 3, 4]);
    expect(removeMatrixColumn(matrix, 1).values).toEqual([2, 2, 4]);
    expect(matrix.values).toEqual([1, 1, 3]);

    addMatrixColumn(matrix, 1, matrixColumn(matrix, 0));
    expect(matrix.values).toEqual([1, 1, 1, 1, 3, 3]);
    expect(removeMatrixRow(matrix, 1).values).toEqual([1, 1]);
    expect(matrix.values).toEqual([1, 1, 3, 3]);

    swapMatrixRows(matrix, 0, 1);
    swapMatrixColumns(matrix, 0, 1);
    expect(matrix.values).toEqual([3, 3, 1, 1]);

    reverseMatrix(matrix);
    expect(matrix.values).toEqual([1, 1, 3, 3]);
    reshapeMatrix(matrix, 1, 4);
    expect(getMatrixRows(matrix)).toBe(1);
    expect(getMatrixColumns(matrix)).toBe(4);
  });

  it('fills and transposes matrices', () => {
    const matrix = createPineMatrix<number>(2, 3, 0);
    setMatrixValue(matrix, 0, 1, 2);
    setMatrixValue(matrix, 1, 2, 6);

    const transposed = transposeMatrix(matrix);
    expect(transposed.rows).toBe(3);
    expect(transposed.columns).toBe(2);
    expect(getMatrixValue(transposed, 1, 0)).toBe(2);
    expect(getMatrixValue(transposed, 2, 1)).toBe(6);

    fillMatrix(matrix, 9);
    expect(matrix.values).toEqual([9, 9, 9, 9, 9, 9]);
  });

  it('sizes empty matrices from inserted arrays', () => {
    const rowValues = createPineArray<number>();
    pushArrayValue(rowValues, 1);
    pushArrayValue(rowValues, 2);
    pushArrayValue(rowValues, 3);
    const rowMatrix = createPineMatrix<number>();

    addMatrixRow(rowMatrix, undefined, rowValues);
    expect(getMatrixRows(rowMatrix)).toBe(1);
    expect(getMatrixColumns(rowMatrix)).toBe(3);
    expect(rowMatrix.values).toEqual([1, 2, 3]);

    const columnValues = createPineArray<number>();
    pushArrayValue(columnValues, 4);
    pushArrayValue(columnValues, 5);
    const columnMatrix = createPineMatrix<number>();

    addMatrixColumn(columnMatrix, undefined, columnValues);
    expect(getMatrixRows(columnMatrix)).toBe(2);
    expect(getMatrixColumns(columnMatrix)).toBe(1);
    expect(columnMatrix.values).toEqual([4, 5]);
  });

  it('summarizes numeric matrix values', () => {
    const matrix = createPineMatrix<number>(2, 3, 0);
    setMatrixValue(matrix, 0, 0, 1);
    setMatrixValue(matrix, 0, 1, 2);
    setMatrixValue(matrix, 0, 2, 2);
    setMatrixValue(matrix, 1, 0, 4);
    setMatrixValue(matrix, 1, 1, 8);
    setMatrixValue(matrix, 1, 2, Number.NaN);

    expect(avgMatrixValue(matrix)).toBe(3.4);
    expect(minMatrixValue(matrix)).toBe(1);
    expect(maxMatrixValue(matrix)).toBe(8);
    expect(medianMatrixValue(matrix)).toBe(2);
    expect(modeMatrixValue(matrix)).toBe(2);
  });

  it('adds and subtracts matrices and scalar values without mutating inputs', () => {
    const left = createPineMatrix<number>(2, 2, 0);
    setMatrixValue(left, 0, 0, 1);
    setMatrixValue(left, 0, 1, 2);
    setMatrixValue(left, 1, 0, 3);
    setMatrixValue(left, 1, 1, 4);

    const right = createPineMatrix<number>(2, 2, 0);
    setMatrixValue(right, 0, 0, 10);
    setMatrixValue(right, 0, 1, 20);
    setMatrixValue(right, 1, 0, 30);
    setMatrixValue(right, 1, 1, 40);

    expect(sumMatrixValue(left, right).values).toEqual([11, 22, 33, 44]);
    expect(diffMatrixValue(right, left).values).toEqual([9, 18, 27, 36]);
    expect(sumMatrixValue(left, 5).values).toEqual([6, 7, 8, 9]);
    expect(diffMatrixValue(left, 1).values).toEqual([0, 1, 2, 3]);
    expect(left.values).toEqual([1, 2, 3, 4]);
    expect(right.values).toEqual([10, 20, 30, 40]);
  });

  it('rejects matrix arithmetic with mismatched shapes', () => {
    const left = createPineMatrix<number>(2, 2, 1);
    const right = createPineMatrix<number>(1, 4, 1);

    expect(() => sumMatrixValue(left, right)).toThrow('Matrix dimensions must match. Left is 2x2, right is 1x4');
    expect(() => diffMatrixValue(left, right)).toThrow('Matrix dimensions must match. Left is 2x2, right is 1x4');
  });

  it('multiplies matrices, arrays, and scalar values without mutating inputs', () => {
    const left = createPineMatrix<number>(2, 3, 0);
    left.values = [1, 2, 3, 4, 5, 6];
    const right = createPineMatrix<number>(3, 2, 0);
    right.values = [7, 8, 9, 10, 11, 12];

    const matrixProduct = multMatrixValue(left, right);
    expect(isPineMatrix(matrixProduct)).toBe(true);
    expect((matrixProduct as typeof left).rows).toBe(2);
    expect((matrixProduct as typeof left).columns).toBe(2);
    expect((matrixProduct as typeof left).values).toEqual([58, 64, 139, 154]);

    const vector = createPineArray<number>();
    pushArrayValue(vector, 10);
    pushArrayValue(vector, 20);
    pushArrayValue(vector, 30);
    expect(multMatrixValue(left, vector).values).toEqual([140, 320]);
    expect(multMatrixValue(left, 2).values).toEqual([2, 4, 6, 8, 10, 12]);
    expect(left.values).toEqual([1, 2, 3, 4, 5, 6]);
    expect(right.values).toEqual([7, 8, 9, 10, 11, 12]);
  });

  it('rejects matrix multiplication dimension mismatches', () => {
    expect(() => multMatrixValue(createPineMatrix<number>(2, 3, 1), createPineMatrix<number>(2, 2, 1))).toThrow(
      'Matrix multiplication requires left columns to match right rows. Left is 2x3, right is 2x2',
    );

    const vector = createPineArray<number>();
    pushArrayValue(vector, 1);
    pushArrayValue(vector, 2);
    expect(() => multMatrixValue(createPineMatrix<number>(2, 3, 1), vector)).toThrow(
      'Matrix-vector multiplication requires matrix columns to match array size. Matrix is 2x3, array size is 2',
    );
  });

  it('raises square matrices to integer powers and computes trace without mutating inputs', () => {
    const matrix = createPineMatrix<number>(2, 2, 0);
    matrix.values = [1, 2, 3, 4];

    expect(traceMatrixValue(matrix)).toBe(5);
    expect(powMatrixValue(matrix, 0).values).toEqual([1, 0, 0, 1]);
    expect(powMatrixValue(matrix, 1).values).toEqual([1, 2, 3, 4]);
    expect(powMatrixValue(matrix, 2).values).toEqual([7, 10, 15, 22]);
    expect(matrix.values).toEqual([1, 2, 3, 4]);
  });

  it('rejects matrix powers and traces for invalid dimensions or powers', () => {
    const rectangular = createPineMatrix<number>(2, 3, 1);

    expect(() => traceMatrixValue(rectangular)).toThrow('Matrix trace requires a square matrix. Matrix is 2x3');
    expect(() => powMatrixValue(rectangular, 2)).toThrow('Matrix power requires a square matrix. Matrix is 2x3');
    expect(() => powMatrixValue(createPineMatrix<number>(2, 2, 1), -1)).toThrow('Matrix power must be a non-negative integer');
    expect(() => powMatrixValue(createPineMatrix<number>(2, 2, 1), 1.5)).toThrow('Matrix power must be a non-negative integer');
  });

  it('computes determinants and ranks for square and rectangular matrices', () => {
    const fullRank = createPineMatrix<number>(3, 3, 0);
    fullRank.values = [3, 2, 3, 4, 6, 6, 7, 4, 9];
    expect(detMatrixValue(fullRank)).toBeCloseTo(24);
    expect(rankMatrixValue(fullRank)).toBe(3);

    const deficient = createPineMatrix<number>(3, 3, 0);
    deficient.values = [1, 2, 3, 2, 4, 6, 3, 6, 9];
    expect(detMatrixValue(deficient)).toBe(0);
    expect(rankMatrixValue(deficient)).toBe(1);

    const rectangular = createPineMatrix<number>(2, 3, 0);
    rectangular.values = [1, 2, 3, 4, 5, 6];
    expect(rankMatrixValue(rectangular)).toBe(2);
  });

  it('rejects determinants for non-square matrices', () => {
    expect(() => detMatrixValue(createPineMatrix<number>(2, 3, 1))).toThrow('Matrix determinant requires a square matrix. Matrix is 2x3');
  });
});
