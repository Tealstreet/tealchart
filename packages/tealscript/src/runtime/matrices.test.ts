import { describe, expect, it } from 'vitest';

import { createPineArray, getArrayValue, pushArrayValue } from './arrays';
import {
  addMatrixColumn,
  addMatrixRow,
  avgMatrixValue,
  copyMatrix,
  createPineMatrix,
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
  removeMatrixColumn,
  removeMatrixRow,
  reshapeMatrix,
  reverseMatrix,
  setMatrixValue,
  swapMatrixColumns,
  swapMatrixRows,
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
});
