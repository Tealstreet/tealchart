import { expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const cases = [
  [3, [4, 52 / 9, 62 / 9, 20 / 3]],
  [4, [6, 5.5, 6.25]],
] as const;

it.each(cases)('ta.dev length %i averages absolute deviations about the mean', (length, expected) => {
  // Authority: https://www.tradingview.com/pine-script-reference/v6/,
  // functions[195], ta.dev example: sum(abs(source[i] - ta.sma(source, length))) / length.
  // Asymmetric finite windows reject median centering, signed cancellation, variance and stdev.
  const prices = [-7, 2, 2, 15, -3, 9];
  const bars = prices.map((close, index) => ({
    time: 1_700_000_000_000 + index * 60_000,
    open: close, high: close + 1, low: close - 1, close, volume: 100,
  }));
  const result = runCompatScript(`//@version=6
indicator("Documented mean absolute deviation")
plot(ta.dev(close, ${length}), "Original")
plot(ta.dev(close + 20, ${length}), "Translated")`, { bars });
  expect(result.errors).toEqual([]);
  for (const title of ['Original', 'Translated']) {
    const values = getPlot(result, title).values.slice(length - 1);
    expect(values).toHaveLength(expected.length);
    expected.forEach((value, index) => expect(values[index]).toBeCloseTo(value, 12));
  }
});
