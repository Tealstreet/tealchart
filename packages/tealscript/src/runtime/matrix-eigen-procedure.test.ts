import { describe, expect, it } from 'vitest';

import { createPineMatrix, eigenvaluesMatrixValue, eigenvectorsMatrixValue } from './matrices';

// Pine v6 matrix.eigenvalues/eigenvectors remarks require implicit QL.
// Characteristic roots and vectors below are derived directly from these matrices.
function matrix(values: number[]) {
  const size = Math.sqrt(values.length);
  const result = createPineMatrix<number>(size, size, 0);
  result.values = values.slice();
  return result;
}

function verifyVectors(values: number[], roots: number[], expected: number[][]) {
  const input = matrix(values);
  const eigenvalues = eigenvaluesMatrixValue(input).values;
  const vectors = eigenvectorsMatrixValue(input);
  for (let column = 0; column < roots.length; column++) {
    const index = eigenvalues.findIndex((value) => Math.abs(value - roots[column]) < 0.00001);
    expect(index).toBeGreaterThanOrEqual(0);
    for (let row = 0; row < roots.length; row++) {
      expect(vectors.values[row * roots.length + index]).toBeCloseTo(expected[column][row], 8);
    }
  }
  expect(input.values).toEqual(values);
}

describe('documented implicit QL eigen procedure', () => {
  const center = 10_000_000_000;
  const symmetric = [center, 1, 1, center];
  const nonsymmetric = [center, 2, 8, center];
  const triangular = [3, 1, 0, 0, 2, 1, 0, 0, 1];
  const dense = [-1, 3, 2, -2, 4, 2, -3, 3, 4];

  it('retains the two roots center ±1 without discriminant cancellation', () => {
    expect(eigenvaluesMatrixValue(matrix(symmetric)).values).toEqual([center + 1, center - 1]);
  });

  it('accumulates the corresponding symmetric two-column basis', () => {
    const r = 1 / Math.sqrt(2);
    verifyVectors(
      symmetric,
      [center + 1, center - 1],
      [
        [r, r],
        [r, -r],
      ],
    );
  });

  it('retains the nonsymmetric roots center ±sqrt(2*8)', () => {
    const result = eigenvaluesMatrixValue(matrix(nonsymmetric)).values;
    expect(result[0]).toBeCloseTo(center + 4, 5);
    expect(result[1]).toBeCloseTo(center - 4, 5);
  });

  it('retains nonsymmetric vectors (1, ±2)/sqrt(5)', () => {
    const r = 1 / Math.sqrt(5);
    verifyVectors(
      nonsymmetric,
      [center + 4, center - 4],
      [
        [r, 2 * r],
        [r, -2 * r],
      ],
    );
  });

  it('deflates a real triangular matrix with nonzero off-diagonal entries', () => {
    const values = eigenvaluesMatrixValue(matrix(triangular))
      .values.slice()
      .sort((a, b) => a - b);
    [1, 2, 3].forEach((value, index) => expect(values[index]).toBeCloseTo(value, 10));
  });

  it('back-substitutes triangular roots to their hand-derived vectors', () => {
    const r = 1 / Math.sqrt(2);
    verifyVectors(
      triangular,
      [1, 2, 3],
      [
        [1 / 3, -2 / 3, 2 / 3],
        [r, -r, 0],
        [1, 0, 0],
      ],
    );
  });

  it('reduces a dense real matrix with roots 1, 2, 4', () => {
    const values = eigenvaluesMatrixValue(matrix(dense))
      .values.slice()
      .sort((a, b) => a - b);
    [1, 2, 4].forEach((value, index) => expect(values[index]).toBeCloseTo(value, 10));
  });

  it('accumulates dense vectors from S diag(1,2,4) S^-1', () => {
    const r = 1 / Math.sqrt(2);
    const s = 1 / Math.sqrt(3);
    verifyVectors(
      dense,
      [1, 2, 4],
      [
        [r, 0, r],
        [r, r, 0],
        [s, s, s],
      ],
    );
  });
});
