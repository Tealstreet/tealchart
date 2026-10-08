import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('ATR finite recovery after a missing range sample', () => {
  for (const version of [5, 6]) {
    it(`v${version} retains seeded smoothing across an isolated high hole`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("ATR range recovery")
plot(ta.atr(3), "ATR")`, {
        bars: compatibilityBars.slice(0, 7).map((bar, i) => ({
          ...bar, open: 10, close: 10, high: i === 3 ? NaN : i === 4 ? 17 : i === 6 ? 18 : 11, low: 9,
        })),
      });
      expect(result.errors).toEqual([]);
      const values = getPlot(result, 'ATR').values;
      expect(values[2]).toBe(2);
      expect(values[4]).toBe(4);
      expect(values[5]).toBeCloseTo(10 / 3, 12);
      expect(values[6]).toBeCloseTo(47 / 9, 12);
    });
    it(`v${version} includes a previous close outside the current range`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("ATR gap discriminator")
plot(ta.atr(3), "ATR")`, {
        bars: compatibilityBars.slice(0, 5).map((bar, i) => ({
          ...bar, open: i < 3 ? 10 : 20, close: i < 3 ? 10 : 20,
          high: i < 3 ? 11 : 21, low: i < 3 ? 9 : 19,
        })),
      });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'ATR').values).toEqual([null, null, 2, 5, 4]);
    });
  }
});
