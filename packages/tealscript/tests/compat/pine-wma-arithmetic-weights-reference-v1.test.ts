import { expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const cases = [
  [2, [-1, 2, 32 / 3, 3, 5]],
  [4, [63 / 10, 39 / 10, 59 / 10]],
] as const;

it.each(cases)('ta.wma length %i gives the newest sample the greatest arithmetic weight', (length, expected) => {
  // Authority: https://www.tradingview.com/pine-script-reference/v6/,
  // functions[177], ta.wma example: weight = (length - i) * length for source[i].
  // Ready finite windows only; common length factors cancel from numerator and denominator.
  const prices = [-7, 2, 2, 15, -3, 9];
  const bars = prices.map((close, index) => ({
    time: 1_700_000_000_000 + index * 60_000,
    open: close, high: close + 1, low: close - 1, close, volume: 100,
  }));
  const result = runCompatScript(`//@version=6
indicator("Documented arithmetic WMA weights")
plot(ta.wma(close, ${length}), "Original")
plot(ta.wma(close + 20, ${length}), "Translated")`, { bars });
  expect(result.errors).toEqual([]);
  for (const [title, shift] of [['Original', 0], ['Translated', 20]] as const) {
    const values = getPlot(result, title).values.slice(length - 1);
    expect(values).toHaveLength(expected.length);
    expected.forEach((value, index) => expect(values[index]).toBeCloseTo(value + shift, 12));
  }
});
