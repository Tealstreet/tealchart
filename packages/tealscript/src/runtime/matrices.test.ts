import { describe, expect, it } from 'vitest';

import { getArrayValue } from './arrays';
import {
  copyMatrix,
  createPineMatrix,
  getMatrixColumns,
  getMatrixElementCount,
  getMatrixRows,
  getMatrixValue,
  isPineMatrix,
  matrixColumn,
  matrixRow,
  setMatrixValue,
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
});
