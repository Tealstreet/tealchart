import { describe, expect, it } from 'vitest';
import { createPineArray, percentileNearestRankArrayValue } from './arrays';

describe('native dynamic-NA nearest-rank percentage', () => {
  it.each([
    [10, 20, 30, 40, 50],
    [10.5, 20.5, 30.5, 40.5, 50.5],
  ])('selects the first element for a missing percentage: %j', (...values) => {
    const array = createPineArray(values.length, 0);
    array.values = values;
    expect(percentileNearestRankArrayValue(array, Number.NaN)).toBe(values[0]);
    expect(percentileNearestRankArrayValue(array, 50)).toBe(values[2]);
    expect(percentileNearestRankArrayValue(createPineArray(), Number.NaN)).toBeNaN();
  });
});
