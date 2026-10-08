import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_ta.kc
// https://www.tradingview.com/pine-script-reference/v6/#fun_ta.kcw
// Constant inputs isolate signed factors from EMA startup and true-range rules.
describe('Keltner channel signed factors', () => {
  for (const length of [2, 4]) {
    for (const factor of [0, -2]) {
      it(`length ${length} factor ${factor} preserves tuple and width signs`, () => {
        const bars = Array.from({ length: 6 }, (_, index) => ({
          time: 1_700_000_000_000 + index * 60_000,
          open: -5,
          high: -1,
          low: -9,
          close: -5,
          volume: 100,
        }));
        const result = runCompatScript(
          `//@version=6
indicator("Keltner signed factor")
[basis, upper, lower] = ta.kc(close, ${length}, ${factor}, false)
plot(basis, "Basis")
plot(upper, "Upper")
plot(lower, "Lower")
plot(ta.kcw(close, ${length}, ${factor}, false), "Width")`,
          { bars },
        );
        expect(result.errors).toEqual([]);
        const expected = { Basis: -5, Upper: -5 + 8 * factor, Lower: -5 - 8 * factor, Width: (16 * factor) / -5 };
        for (const [title, value] of Object.entries(expected)) {
          const values = getPlot(result, title).values.slice(length);
          expect(values).toHaveLength(6 - length);
          values.forEach((actual) => expect(actual).toBeCloseTo(value, 12));
        }
      });
    }
  }
});
