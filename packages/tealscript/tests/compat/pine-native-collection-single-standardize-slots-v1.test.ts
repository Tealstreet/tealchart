import { describe, expect, it } from 'vitest';

import { createPineArray, pushArrayValue, standardizeArrayValue } from '../../src/runtime/arrays';

const a = (...values: number[]) => {
  const result = createPineArray<number>();
  values.forEach((x) => pushArrayValue(result, x));
  return result;
};
// Functional regression: preserve the argument and result contract.
describe('native collection single standardize-slots', () => {
  it.each([
    [1, NaN, 3],
    [NaN, 1, 3],
    [1, 3, NaN],
  ])('preserves native missing slots %s', (...values) => {
    const actual = standardizeArrayValue(a(...values)).values;
    expect(actual).toEqual(values.map((x) => (Number.isNaN(x) ? NaN : x === 1 ? -1 : 1)));
  });
});
