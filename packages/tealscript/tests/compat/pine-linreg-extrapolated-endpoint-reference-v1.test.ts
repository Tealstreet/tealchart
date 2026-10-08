import { expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const cases = [
  [3, -2, [4.5, 10.5, -9, -6]],
  [3, 4, [-4.5, 1.5, 9, 12]],
  [4, -2, [17.7, -11.4, 3.6]],
  [4, 5, [-11.7, 15.9, -0.6]],
] as const;

it.each(cases)('ta.linreg length %i offset %i evaluates the extrapolated fitted point', (length, offset, expected) => {
  // https://www.tradingview.com/pine-script-reference/v6/#fun_ta.linreg
  // The fitted point is intercept + slope * (length - 1 - offset).
  const prices = [-6, 9, -3, 12, -9, 6];
  const bars = prices.map((close, index) => ({
    time: 1_700_000_000_000 + index * 60_000,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 100,
  }));
  const result = runCompatScript(
    `//@version=6
indicator("Least squares extrapolated point")
plot(ta.linreg(offset=${offset}, source=close, length=${length}), "Fitted")`,
    { bars },
  );
  expect(result.errors).toEqual([]);
  const values = getPlot(result, 'Fitted').values.slice(length - 1);
  expect(values).toHaveLength(expected.length);
  expected.forEach((value, index) => expect(values[index]).toBeCloseTo(value, 12));
});
