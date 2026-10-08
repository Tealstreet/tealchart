import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_ta.bb
// The explicit helper multiplies population stdev without normalizing the factor.
describe('Bollinger bands zero and negative factors', () => {
  for (const length of [3, 4]) {
    for (const factor of [0, -2]) {
      it(`length ${length} factor ${factor} retains the documented tuple order`, () => {
        const bars = [-6, 0, 6, 12, 18, 24].map((close, index) => ({
          time: 1_700_000_000_000 + index * 60_000,
          open: close,
          high: close + 2,
          low: close - 3,
          close,
          volume: 100,
        }));
        const result = runCompatScript(
          `//@version=6
indicator("Bollinger signed factor")
[basis, upper, lower] = ta.bb(close, ${length}, ${factor})
plot(basis, "Basis")
plot(upper, "Upper")
plot(lower, "Lower")`,
          { bars },
        );
        expect(result.errors).toEqual([]);
        const means = length === 3 ? [0, 6, 12, 18] : [3, 9, 15];
        const deviation = Math.sqrt(length === 3 ? 24 : 45);
        for (const [title, sign] of [
          ['Basis', 0],
          ['Upper', 1],
          ['Lower', -1],
        ] as const) {
          const values = getPlot(result, title).values.slice(length - 1);
          expect(values).toHaveLength(means.length);
          values.forEach((value, index) => expect(value).toBeCloseTo(means[index]! + sign * factor * deviation, 12));
        }
      });
    }
  }
});
