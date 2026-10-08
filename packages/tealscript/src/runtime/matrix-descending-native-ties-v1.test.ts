import { describe, expect, it } from 'vitest';

import { createPineMatrix, sortMatrixRows } from './matrices';

function sorted(values: number[], descending: boolean): number[] {
  const matrix = createPineMatrix<number>(values.length / 2, 2, 0);
  matrix.values = values.slice();
  sortMatrixRows(matrix, 0, descending ? 'descending' : 'ascending');
  return matrix.values;
}

describe('round 56 matrix sort tied row identities', () => {
  it('reverses the captured ascending tied rows in descending order', () => {
    const ascending = sorted([2, 17, 1, 43, 2, 29], false);
    expect(ascending).toEqual([1, 43, 2, 17, 2, 29]);
    expect(sorted(ascending, true)).toEqual([2, 29, 2, 17, 1, 43]);
  });

  it.each([
    { values: [2, 17, 1, 43, 2, 29], expected: [1, 43, 2, 17, 2, 29] },
    { values: [-2, 17, -3, 43, -2, 29], expected: [-3, 43, -2, 17, -2, 29] },
    { values: [3, 17, 1, 43, 2, 29], expected: [1, 43, 2, 29, 3, 17] },
  ])('keeps ascending ordering $values', ({ values, expected }) => {
    expect(sorted(values, false)).toEqual(expected);
  });

  it.each([
    { values: [3, 17, 1, 43, 2, 29], expected: [3, 17, 2, 29, 1, 43] },
    { values: [-3, 17, -1, 43, -2, 29], expected: [-1, 43, -2, 29, -3, 17] },
    { values: [NaN, 17, 1, 43, 2, 29], expected: [NaN, 17, 2, 29, 1, 43] },
    { values: [Infinity, 17, -Infinity, 43, 0, 29], expected: [Infinity, 17, 0, 29, -Infinity, 43] },
  ])('keeps non-tied descending ordering $values', ({ values, expected }) => {
    expect(sorted(values, true)).toEqual(expected);
  });
});
