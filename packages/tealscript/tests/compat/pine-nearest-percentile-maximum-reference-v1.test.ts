import { expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const cases = [
  [2, [9, 9, 9, 2, 1, 1, 0]],
  [4, [9, 9, 9, 2, 1]],
] as const;

it.each(cases)('nearest-rank 100th percentile length %i retains exactly the rolling maximum', (length, expected) => {
  // Authority: https://www.tradingview.com/pine-script-reference/v6/,
  // functions[358], ta.percentile_nearest_rank: 100th percentile is the largest input value.
  // Finite windows exercise independent eviction of duplicate maxima without a hole-policy claim.
  const prices = [9, -4, 9, 2, -7, 1, 0, -3];
  const bars = prices.map((close, index) => ({
    time: 1_700_000_000_000 + index * 60_000,
    open: close, high: close + 1, low: close - 1, close, volume: 100,
  }));
  const result = runCompatScript(`//@version=6
indicator("Documented nearest-rank maximum")
plot(ta.percentile_nearest_rank(close, ${length}, 100), "Positional")
plot(ta.percentile_nearest_rank(percentage=100, length=${length}, source=close), "Named")`, { bars });
  expect(result.errors).toEqual([]);
  for (const title of ['Positional', 'Named']) {
    expect(getPlot(result, title).values.slice(length - 1)).toEqual(expected);
  }
});
