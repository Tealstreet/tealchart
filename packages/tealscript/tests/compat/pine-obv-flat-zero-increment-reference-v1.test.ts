import { expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

it.each([1, -1])('ta.obv preserves flat-price and zero-volume increments at price direction %i', (direction) => {
  // Reference variables 25 example: cumulative sign(change(close))*volume.
  // Compare successive published totals from bar2; startup seed is excluded.
  const prices = [10, 12, 12, 9, 13, 13, 8, 14];
  const volumes = [17, 3, 5, 7, 0, 11, 13, 19];
  const expected = [0, -7, 0, 0, -13, 19];
  const bars = prices.map((price, index) => {
    const close = price * direction;
    return {
      time: 1_700_000_000_000 + index * 60_000,
      open: close,
      high: close + 1,
      low: close - 1,
      close,
      volume: volumes[index],
    };
  });
  const result = runCompatScript(
    `//@version=6
indicator("Documented neutral OBV increments")
plot(ta.obv - ta.obv[1], "Increment")`,
    { bars },
  );
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
  const actual = getPlot(result, 'Increment').values.slice(2);
  expect(actual).toHaveLength(expected.length);
  expected.forEach((value, index) => expect(actual[index]).toBeCloseTo(value * direction, 12));
});
