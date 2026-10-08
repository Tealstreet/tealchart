import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_ta.rma
// A complete zero seed isolates alpha=1/length and the subsequent signed impulse.
describe('RMA finite impulse recurrence', () => {
  for (const length of [2, 4]) {
    it(`length ${length} follows the documented decay after a zero seed`, () => {
      const bars = [0, 0, 0, 0, -16, 0, 0, 0].map((close, index) => ({
        time: 1_700_000_000_000 + index * 60_000,
        open: close,
        high: close + 2,
        low: close - 3,
        close,
        volume: 100,
      }));
      const result = runCompatScript(
        `//@version=6
indicator("RMA finite impulse")
plot(ta.rma(close, ${length}), "Negative")
plot(ta.rma(-close, ${length}), "Positive")`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      const expected = length === 2 ? [-8, -4, -2, -1] : [-4, -3, -2.25, -1.6875];
      for (const [title, sign] of [
        ['Negative', 1],
        ['Positive', -1],
      ] as const) {
        expect(getPlot(result, title).values.slice(4)).toEqual(expected.map((value) => sign * value));
      }
    });
  }
});
