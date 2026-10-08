import { expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const cases = [
  { length: 3, percentages: [1, 30, 40], first: [-4, -4, -7, -7, -7, -3], second: [9, 2, 2, 1, 0, 0] },
  { length: 4, percentages: [1, 25, 26], first: [-4, -7, -7, -7, -7], second: [2, -4, 1, 0, -3] },
] as const;

it.each(cases)(
  'ta.percentile_nearest_rank length $length coalesces percentiles and selects input ranks',
  (testCase) => {
    // https://www.tradingview.com/pine-script-reference/v6/#fun_ta.percentile_nearest_rank
    // Nearest-rank selection uses ceil(percentage * length / 100), with one-based ranks.
    const prices = [9, -4, 9, 2, -7, 1, 0, -3];
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
indicator("Nearest rank coalescence")
plot(ta.percentile_nearest_rank(close, ${testCase.length}, ${testCase.percentages[0]}), "FirstA")
plot(ta.percentile_nearest_rank(percentage=${testCase.percentages[1]}, length=${testCase.length}, source=close), "FirstB")
plot(ta.percentile_nearest_rank(close, ${testCase.length}, ${testCase.percentages[2]}), "Second")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    for (const [title, expected] of [
      ['FirstA', testCase.first],
      ['FirstB', testCase.first],
      ['Second', testCase.second],
    ] as const) {
      const values = getPlot(result, title).values.slice(testCase.length - 1);
      expect(values).toEqual(expected);
      values.forEach((value, index) => expect(prices.slice(index, index + testCase.length)).toContain(value));
    }
  },
);
