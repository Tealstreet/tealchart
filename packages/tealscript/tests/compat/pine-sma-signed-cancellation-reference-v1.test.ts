import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Official ta.sma example sums signed source values and divides by length.
describe('SMA signed cancellation retains arithmetic means', () => {
  for (const [length, expected] of [
    [2, [6, -6, -12, 12, 9, -3, -9]],
    [4, [-3, 3, -1.5, 4.5, 0]],
  ] as const) {
    it(`length ${length} preserves zero and negative window means`, () => {
      const bars = [0, 12, -24, 0, 24, -6, 0, -18].map((close, index) => ({
        time: 1700000000000 + index * 60000,
        open: close,
        high: close + 1,
        low: close - 1,
        close,
        volume: 10,
      }));
      const result = runCompatScript(
        `//@version=6
indicator("Signed SMA windows")
plot(ta.sma(source=close, length=${length}), "Original")
plot(ta.sma(close * -3, ${length}), "Scaled")`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      for (const [title, scale] of [
        ['Original', 1],
        ['Scaled', -3],
      ] as const) {
        const values = getPlot(result, title).values.slice(length - 1);
        expect(values).toHaveLength(expected.length);
        expected.forEach((value, index) => expect(values[index]).toBe(value === 0 ? 0 : value * scale));
      }
    });
  }
});
