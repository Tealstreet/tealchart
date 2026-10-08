import { expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

it.each([1, -3])('ta.pvt uses signed lagged prices and zero volume at price scale %i', (scale) => {
  // Reference variables 26 example: cumulative (change(close)/close[1])*volume.
  // Compare successive published totals from bar2; startup seed is excluded.
  const prices = [-8, -4, 2, -16, 8, -2, 4, -8];
  const volumes = [17, 3, 0, 5, 7, 11, 13, 19];
  const expected = [0.0, -45.0, -10.5, -13.75, -39.0, -57.0];
  const bars = prices.map((price, index) => {
    const close = price * scale;
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
indicator("Signed documented PVT increments")
plot(ta.pvt - ta.pvt[1], "Increment")`,
    { bars },
  );
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
  const actual = getPlot(result, 'Increment').values.slice(2);
  expect(actual).toHaveLength(expected.length);
  expected.forEach((value, index) => expect(actual[index]).toBeCloseTo(value, 12));
});
