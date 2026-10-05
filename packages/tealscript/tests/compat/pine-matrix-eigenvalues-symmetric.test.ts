import { describe, expect, it } from 'vitest';

import { createPineMatrix, eigenvaluesMatrixValue, pinvMatrixValue } from '../../src/runtime/matrices';

// https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.eigenvalues
// Compare the spectrum without selecting a native ordering convention.
describe('finite symmetric matrix eigenvalues', () => {
  it.each([
    { name: 'opposite-sign block', values: [0, 1, 0, 1, 0, 0, 0, 0, 2], expected: [-1, 1, 2] },
    { name: 'negative block scale', values: [0, -3, 0, -3, 0, 0, 0, 0, 2], expected: [-3, 2, 3] },
    { name: 'repeated positive block', values: [2, 1, 0, 1, 2, 0, 0, 0, 3], expected: [1, 3, 3] },
  ])('$name', ({ values, expected }) => {
    const matrix = createPineMatrix<number>(3, 3, 0);
    matrix.values = values.slice();
    const actual = eigenvaluesMatrixValue(matrix).values.slice().sort((a, b) => a - b);
    expect(actual.every(Number.isFinite)).toBe(true);
    actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index], 12));
    expect(matrix.values).toEqual(values);
  });

  it('preserves the rank-one pseudoinverse control', () => {
    const matrix = createPineMatrix<number>(2, 2, 0);
    matrix.values = [1, 2, 2, 4];
    pinvMatrixValue(matrix).values.forEach((value, index) => expect(value).toBeCloseTo([0.04, 0.08, 0.08, 0.16][index], 12));
    expect(matrix.values).toEqual([1, 2, 2, 4]);
  });
});
