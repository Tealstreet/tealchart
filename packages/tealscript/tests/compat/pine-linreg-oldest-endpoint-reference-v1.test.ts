import { expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const cases = [
  [3, [-1.5, 4.5, 3, 6]],
  [4, [-3.3, 8.1, 0.6]],
] as const;

it.each(cases)('ta.linreg length %i evaluates the oldest fitted point', (length, expected) => {
  // Authority: https://www.tradingview.com/pine-script-reference/v6/,
  // functions[208], ta.linreg: intercept + slope * (length - 1 - offset).
  // With offset=length-1 this is the fitted intercept, not the oldest observed price.
  const prices = [-6, 9, -3, 12, -9, 6];
  const bars = prices.map((close, index) => ({
    time: 1_700_000_000_000 + index * 60_000,
    open: close, high: close + 1, low: close - 1, close, volume: 100,
  }));
  const result = runCompatScript(`//@version=6
indicator("Least squares oldest point")
plot(ta.linreg(close, ${length}, ${length - 1}), "Fitted")`, { bars });
  expect(result.errors).toEqual([]);
  const values = getPlot(result, 'Fitted').values.slice(length - 1);
  expect(values).toHaveLength(expected.length);
  expected.forEach((value, index) => expect(values[index]).toBeCloseTo(value, 12));
});
