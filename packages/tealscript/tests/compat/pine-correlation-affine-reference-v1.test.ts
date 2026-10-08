import { expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

it.each([2, -4])('ta.correlation preserves affine direction with source multiplier %i', (multiplier) => {
  // Authority: https://www.tradingview.com/pine-script-reference/v6/,
  // functions[206]: correlation coefficient describes deviations from each series' SMA.
  // For y = a*x + b, centered y = a*centered x; normalization leaves sign(a).
  const prices = [-4, 1, 7, -2, 5, 0];
  const bars = prices.map((close, index) => ({
    time: 1_700_000_000_000 + index * 60_000,
    open: close, high: close + 1, low: close - 1, close, volume: 100,
  }));
  const result = runCompatScript(`//@version=6
indicator("Documented affine correlation")
plot(ta.correlation(close, ${multiplier} * close + 16, 4), "Forward")
plot(ta.correlation(source2=close, length=4, source1=${multiplier} * close + 16), "Reverse")`, { bars });
  expect(result.errors).toEqual([]);
  for (const title of ['Forward', 'Reverse']) {
    const values = getPlot(result, title).values.slice(3);
    expect(values).toHaveLength(3);
    values.forEach((value) => expect(value).toBeCloseTo(Math.sign(multiplier), 12));
  }
});
