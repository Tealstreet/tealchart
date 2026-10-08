import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_ta.sar
// Published continuing-trend recurrence caps acceleration before the next projection.
describe('SAR continuing-trend acceleration cap', () => {
  for (const direction of [1, -1]) {
    it(`cap 0.15 direction ${direction} follows the bounded acceleration`, () => {
      const bars = [10, 12, 14, 16, 18, 20, 22].map((price, index) => ({
        time: 1_700_000_000_000 + index * 60_000,
        open: direction * price,
        high: direction * price + 1,
        low: direction * price - 1,
        close: direction * price,
        volume: 100,
      }));
      const result = runCompatScript(
        `//@version=6
indicator("SAR acceleration cap")
plot(ta.sar(0.05, 0.1, 0.15), "SAR")`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      const expected = [9, 9, 99 / 10, 2193 / 200, 48681 / 4000, 1079577 / 80000];
      const values = getPlot(result, 'SAR').values.slice(1);
      expect(values).toHaveLength(expected.length);
      values.forEach((value, index) => expect(value).toBeCloseTo(direction * expected[index]!, 12));
    });
  }
  for (const direction of [1, -1]) {
    it(`cap 0.35 direction ${direction} follows the bounded acceleration`, () => {
      const bars = [10, 12, 14, 16, 18, 20, 22].map((price, index) => ({
        time: 1_700_000_000_000 + index * 60_000,
        open: direction * price,
        high: direction * price + 1,
        low: direction * price - 1,
        close: direction * price,
        volume: 100,
      }));
      const result = runCompatScript(
        `//@version=6
indicator("SAR acceleration cap")
plot(ta.sar(0.05, 0.1, 0.35), "SAR")`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      const expected = [9, 9, 99 / 10, 467 / 40, 11391 / 800, 265683 / 16000];
      const values = getPlot(result, 'SAR').values.slice(1);
      expect(values).toHaveLength(expected.length);
      values.forEach((value, index) => expect(value).toBeCloseTo(direction * expected[index]!, 12));
    });
  }
});
