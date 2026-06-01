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
  eigenvaluesMatrixValue,
  fillMatrix,
  getMatrixColumns,
  getMatrixElementCount,
  getMatrixRows,
  getMatrixValue,
  invMatrixValue,
  isAntidiagonalMatrix,
  isAntisymmetricMatrix,
  isBinaryMatrix,
  isDiagonalMatrix,
  isIdentityMatrix,
  isPineMatrix,
  isSquareMatrix,
  isStochasticMatrix,
  isSymmetricMatrix,
  isTriangularMatrix,
  isValidMatrix,
  isZeroMatrix,
  kronMatrixValue,
  matrixColumn,
  matrixRow,
  maxMatrixValue,
  medianMatrixValue,
  minMatrixValue,
  modeMatrixValue,
  multMatrixValue,
  pinvMatrixValue,
  powMatrixValue,
  rankMatrixValue,
  removeMatrixColumn,
  removeMatrixRow,
  reshapeMatrix,
  reverseMatrix,
  setMatrixValue,
  sortMatrixRows,
  submatrixValue,
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

  it('inspects matrix value patterns', () => {
    const identity = createPineMatrix<number>(3, 3, 0);
    identity.values = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    expect(isIdentityMatrix(identity)).toBe(true);
    expect(isDiagonalMatrix(identity)).toBe(true);
    expect(isTriangularMatrix(identity)).toBe(true);
    expect(isBinaryMatrix(identity)).toBe(true);

    const zero = createPineMatrix<number>(2, 3, 0);
    expect(isZeroMatrix(zero)).toBe(true);

    const antidiagonal = createPineMatrix<number>(3, 3, 0);
    antidiagonal.values = [0, 0, 1, 0, 2, 0, 3, 0, 0];
    expect(isAntidiagonalMatrix(antidiagonal)).toBe(true);

    const symmetric = createPineMatrix<number>(2, 2, 0);
    symmetric.values = [1, 2, 2, 3];
    expect(isSymmetricMatrix(symmetric)).toBe(true);
    expect(isAntisymmetricMatrix(symmetric)).toBe(false);

    const antisymmetric = createPineMatrix<number>(2, 2, 0);
    antisymmetric.values = [0, 4, -4, 0];
    expect(isAntisymmetricMatrix(antisymmetric)).toBe(true);
    expect(isSymmetricMatrix(antisymmetric)).toBe(false);

    const stochastic = createPineMatrix<number>(2, 2, 0);
    stochastic.values = [0.25, 0.75, 0.4, 0.6];
    expect(isStochasticMatrix(stochastic)).toBe(true);
    setMatrixValue(stochastic, 1, 1, -0.6);
    expect(isStochasticMatrix(stochastic)).toBe(false);
  });

  it('returns false for square-only inspections on rectangular matrices', () => {
    const rectangular = createPineMatrix<number>(2, 3, 0);

    expect(isIdentityMatrix(rectangular)).toBe(false);
    expect(isDiagonalMatrix(rectangular)).toBe(false);
    expect(isAntidiagonalMatrix(rectangular)).toBe(false);
    expect(isSymmetricMatrix(rectangular)).toBe(false);
    expect(isAntisymmetricMatrix(rectangular)).toBe(false);
    expect(isTriangularMatrix(rectangular)).toBe(false);
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

  it('preserves small but valid determinant and rank pivots', () => {
    const matrix = createPineMatrix<number>(2, 2, 0);
    matrix.values = [1e-12, 0, 0, 1];

    expect(detMatrixValue(matrix)).toBe(1e-12);
    expect(rankMatrixValue(matrix)).toBe(2);
  });

  it('rejects determinants for non-square matrices', () => {
    expect(() => detMatrixValue(createPineMatrix<number>(2, 3, 1))).toThrow('Matrix determinant requires a square matrix. Matrix is 2x3');
  });

  it('inverts square nonsingular matrices without mutating inputs', () => {
    const matrix = createPineMatrix<number>(2, 2, 0);
    matrix.values = [4, 7, 2, 6];

    const inverse = invMatrixValue(matrix);
    expect(inverse.values[0]).toBeCloseTo(0.6);
    expect(inverse.values[1]).toBeCloseTo(-0.7);
    expect(inverse.values[2]).toBeCloseTo(-0.2);
    expect(inverse.values[3]).toBeCloseTo(0.4);
    multMatrixValue(matrix, inverse).values.forEach((value, index) => {
      expect(value).toBeCloseTo(index === 0 || index === 3 ? 1 : 0);
    });
    expect(matrix.values).toEqual([4, 7, 2, 6]);
  });

  it('computes pseudoinverses for rectangular and rank-deficient matrices', () => {
    const rectangular = createPineMatrix<number>(2, 3, 0);
    rectangular.values = [1, 2, 3, 4, 5, 6];

    const rectangularPinv = pinvMatrixValue(rectangular);
    expect(rectangularPinv.rows).toBe(3);
    expect(rectangularPinv.columns).toBe(2);
    expectMatrixValuesCloseTo(rectangularPinv, [-0.944444, 0.444444, -0.111111, 0.111111, 0.722222, -0.222222]);
    expectMatrixValuesCloseTo(multMatrixValue(multMatrixValue(rectangular, rectangularPinv) as typeof rectangular, rectangular) as typeof rectangular, [1, 2, 3, 4, 5, 6]);

    const deficient = createPineMatrix<number>(2, 2, 0);
    deficient.values = [1, 2, 2, 4];

    const deficientPinv = pinvMatrixValue(deficient);
    expectMatrixValuesCloseTo(deficientPinv, [0.04, 0.08, 0.08, 0.16]);
    expectMatrixValuesCloseTo(multMatrixValue(multMatrixValue(deficient, deficientPinv) as typeof deficient, deficient) as typeof deficient, [1, 2, 2, 4]);
    expect(deficient.values).toEqual([1, 2, 2, 4]);
  });

  it('computes real eigenvalues for square numeric matrices', () => {
    const twoByTwo = createPineMatrix<number>(2, 2, 0);
    twoByTwo.values = [2, 4, 6, 8];
    expectArrayValuesCloseTo(eigenvaluesMatrixValue(twoByTwo).values, [10.744562, -0.744562]);

    const symmetric = createPineMatrix<number>(3, 3, 0);
    symmetric.values = [2, 1, 0, 1, 2, 0, 0, 0, 3];
    expectArrayValuesCloseTo([...eigenvaluesMatrixValue(symmetric).values].sort((left, right) => left - right), [1, 3, 3]);
    expect(symmetric.values).toEqual([2, 1, 0, 1, 2, 0, 0, 0, 3]);
  });

  it('rejects eigenvalues for non-square matrices or complex roots', () => {
    expect(() => eigenvaluesMatrixValue(createPineMatrix<number>(2, 3, 1))).toThrow('Matrix eigenvalues requires a square matrix. Matrix is 2x3');

    const rotation = createPineMatrix<number>(2, 2, 0);
    rotation.values = [0, -1, 1, 0];
    expect(() => eigenvaluesMatrixValue(rotation)).toThrow('Matrix eigenvalues are complex and cannot be represented as real values');

    const blockRotation = createPineMatrix<number>(3, 3, 0);
    blockRotation.values = [0, -1, 0, 1, 0, 0, 0, 0, 2];
    expect(() => eigenvaluesMatrixValue(blockRotation)).toThrow('Matrix eigenvalues are complex or QR iteration did not converge to real diagonal values');
  });

  it('rejects matrix inverses for non-square or singular matrices', () => {
    expect(() => invMatrixValue(createPineMatrix<number>(2, 3, 1))).toThrow('Matrix inverse requires a square matrix. Matrix is 2x3');

    const singular = createPineMatrix<number>(2, 2, 0);
    singular.values = [1, 2, 2, 4];
    expect(() => invMatrixValue(singular)).toThrow('Matrix is singular and cannot be inverted');
  });

  it('computes Kronecker products without mutating inputs', () => {
    const left = createPineMatrix<number>(2, 2, 0);
    left.values = [1, 2, 3, 4];
    const right = createPineMatrix<number>(2, 2, 0);
    right.values = [0, 5, 6, 7];

    const product = kronMatrixValue(left, right);

    expect(product.rows).toBe(4);
    expect(product.columns).toBe(4);
    expect(product.values).toEqual([0, 5, 0, 10, 6, 7, 12, 14, 0, 15, 0, 20, 18, 21, 24, 28]);
    expect(left.values).toEqual([1, 2, 3, 4]);
    expect(right.values).toEqual([0, 5, 6, 7]);
  });

  it('sorts rows by a selected column and extracts copied submatrices', () => {
    const matrix = createPineMatrix<number>(3, 3, 0);
    matrix.values = [3, 9, 1, 1, 5, 2, 2, 7, 3];

    sortMatrixRows(matrix, 1, 'descending');
    expect(matrix.values).toEqual([3, 9, 1, 2, 7, 3, 1, 5, 2]);

    const submatrix = submatrixValue(matrix, 0, 2, 1, 3);
    expect(submatrix.rows).toBe(2);
    expect(submatrix.columns).toBe(2);
    expect(submatrix.values).toEqual([9, 1, 7, 3]);

    setMatrixValue(submatrix, 0, 0, 100);
    expect(matrix.values).toEqual([3, 9, 1, 2, 7, 3, 1, 5, 2]);
  });

  it('rejects invalid matrix sort columns and submatrix ranges', () => {
    const matrix = createPineMatrix<number>(2, 2, 1);

    expect(() => sortMatrixRows(matrix, 2)).toThrow('Matrix column 2 is out of bounds. column count is 2');
    expect(() => submatrixValue(matrix, 1, 3, 0, 1)).toThrow('Matrix row range 1..3 is out of bounds. row count is 2');
    expect(() => submatrixValue(matrix, 0, 1, 2, 1)).toThrow('Matrix column range 2..1 is out of bounds. column count is 2');
  });
});

function expectMatrixValuesCloseTo(matrix: { values: number[] }, expected: number[]): void {
  expectArrayValuesCloseTo(matrix.values, expected);
}

function expectArrayValuesCloseTo(values: number[], expected: number[]): void {
  expect(values).toHaveLength(expected.length);
  values.forEach((value, index) => {
    expect(value).toBeCloseTo(expected[index], 5);
  });
}
