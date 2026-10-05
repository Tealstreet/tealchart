import { describe, expect, it } from 'vitest';

import { createPineMatrix, pinvMatrixValue } from './matrices';

const fixtures = [
  {
    name: 'invertible square',
    rows: [
      [1, 2],
      [3, 4],
    ],
  },
  {
    name: 'rectangular full rank',
    rows: [
      [1, 2],
      [3, 4],
      [5, 7],
    ],
  },
  {
    name: 'rank deficient rectangular',
    rows: [
      [1, 2, 3],
      [2, 4, 6],
    ],
  },
  {
    name: 'large finite diagonal',
    rows: [
      [1e160, 0],
      [0, 1e160],
    ],
  },
  {
    name: 'zero',
    rows: [
      [0, 0],
      [0, 0],
    ],
  },
];

function multiply(left: number[][], right: number[][]) {
  return left.map((row) =>
    right[0].map((_, column) => row.reduce((sum, value, index) => sum + value * right[index][column], 0)),
  );
}

function transpose(rows: number[][]) {
  return rows[0].map((_, column) => rows.map((row) => row[column]));
}

function expectSame(actual: number[][], expected: number[][]) {
  expect(actual.length).toBe(expected.length);
  actual.forEach((row, i) => {
    expect(row.length).toBe(expected[i].length);
    row.forEach((value, j) =>
      expect(Math.abs(value - expected[i][j])).toBeLessThanOrEqual(1e-10 * Math.max(1, Math.abs(expected[i][j]))),
    );
  });
}

describe.each(fixtures)('Moore-Penrose properties: $name', ({ rows }) => {
  const matrix = createPineMatrix<number>(rows.length, rows[0].length, 0);
  matrix.values = rows.flat();
  const result = pinvMatrixValue(matrix);
  const inverse = Array.from({ length: result.rows }, (_, row) =>
    result.values.slice(row * result.columns, (row + 1) * result.columns),
  );
  it('A A+ A equals A', () => expectSame(multiply(multiply(rows, inverse), rows), rows));
  it('A+ A A+ equals A+', () => expectSame(multiply(multiply(inverse, rows), inverse), inverse));
  it('A A+ is symmetric', () => expectSame(multiply(rows, inverse), transpose(multiply(rows, inverse))));
  it('A+ A is symmetric', () => expectSame(multiply(inverse, rows), transpose(multiply(inverse, rows))));
});
