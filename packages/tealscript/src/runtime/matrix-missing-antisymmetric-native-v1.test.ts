import { describe, expect, it } from 'vitest';

import {
  createPineMatrix,
  isAntidiagonalMatrix,
  isAntisymmetricMatrix,
  isBinaryMatrix,
  isDiagonalMatrix,
  isIdentityMatrix,
  isSymmetricMatrix,
  isTriangularMatrix,
  isZeroMatrix,
} from './matrices';

describe('round 56 missing singleton antisymmetric result', () => {
  it('matches ANTISYMMETRIC=1 for the captured missing 1x1 matrix', () => {
    expect(isAntisymmetricMatrix(createPineMatrix<number>(1, 1, NaN))).toBe(true);
  });

  it.each([
    { rows: 1, columns: 1, values: [0], expected: true },
    { rows: 1, columns: 1, values: [1], expected: false },
    { rows: 1, columns: 1, values: [-1], expected: false },
    { rows: 1, columns: 2, values: [NaN, NaN], expected: false },
    { rows: 2, columns: 2, values: [NaN, NaN, NaN, NaN], expected: false },
    { rows: 2, columns: 2, values: [0, 4, -4, 0], expected: true },
    { rows: 2, columns: 2, values: [1, 4, -4, 0], expected: false },
    { rows: 2, columns: 2, values: [0, 4, 4, 0], expected: false },
  ])('preserves unrelated antisymmetric case $values', ({ rows, columns, values, expected }) => {
    const matrix = createPineMatrix<number>(rows, columns, 0);
    matrix.values = values;
    expect(isAntisymmetricMatrix(matrix)).toBe(expected);
  });

  it.each([
    { predicate: isZeroMatrix, expected: false },
    { predicate: isBinaryMatrix, expected: false },
    { predicate: isIdentityMatrix, expected: false },
    { predicate: isSymmetricMatrix, expected: true },
    { predicate: isDiagonalMatrix, expected: true },
    { predicate: isAntidiagonalMatrix, expected: true },
    { predicate: isTriangularMatrix, expected: true },
  ])('preserves captured companion predicate $predicate.name', ({ predicate, expected }) => {
    expect(predicate(createPineMatrix<number>(1, 1, NaN))).toBe(expected);
  });
});
