import { describe, expect, it } from 'vitest';

import { decomposeSingularValues } from './singular-value-decomposition';

const inputs = [
  [
    [1, 2],
    [3, 4],
    [5, 6],
  ],
  [
    [1e-8, 1],
    [1e-8, 1],
  ],
  [
    [3, 0],
    [0, -4],
    [0, 0],
  ],
  [
    [0, 0],
    [0, 0],
  ],
];

describe('one-sided Jacobi singular-value decomposition', () => {
  for (const rows of inputs) {
    it(`reconstructs and orthogonalizes ${JSON.stringify(rows)}`, () => {
      const original = rows.map((row) => [...row]);
      const { scale, columns, singularValues, rightVectors } = decomposeSingularValues(rows);
      for (let i = 0; i < rightVectors.length; i++) {
        for (let j = 0; j < rightVectors.length; j++) {
          const rightProduct = rightVectors[i].reduce((sum, value, k) => sum + value * rightVectors[j][k], 0);
          expect(rightProduct).toBeCloseTo(i === j ? 1 : 0, 12);
          if (singularValues[i] > 1e-14 && singularValues[j] > 1e-14) {
            const leftProduct = columns[i].reduce(
              (sum, value, k) => sum + (value / singularValues[i]) * (columns[j][k] / singularValues[j]),
              0,
            );
            expect(leftProduct).toBeCloseTo(i === j ? 1 : 0, 12);
          }
        }
      }
      rows.forEach((row, i) =>
        row.forEach((expected, j) => {
          const actual = columns.reduce((sum, column, k) => sum + column[i] * rightVectors[k][j], 0) * scale;
          expect(actual).toBeCloseTo(expected, 12);
        }),
      );
      expect(rows).toEqual(original);
    });
  }

  for (const factor of [1e-150, 1e150]) {
    it(`retains finite singular values when scaled by ${factor}`, () => {
      const result = decomposeSingularValues([
        [3 * factor, 0],
        [0, 4 * factor],
      ]);
      expect(result.scale).toBe(4 * factor);
      expect(result.singularValues).toEqual([0.75, 1]);
      expect(result.columns).toEqual([
        [0.75, 0],
        [0, 1],
      ]);
    });
  }
});
