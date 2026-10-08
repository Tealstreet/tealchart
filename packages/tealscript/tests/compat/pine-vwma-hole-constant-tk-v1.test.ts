import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('VWMA constant finite source across holes', () => {
  for (const version of [5, 6]) {
    it(`v${version} ignores missing numerator samples with constant volume`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("VWMA constant holes")
source = bar_index == 3 ? float(na) : -3.0
plot(ta.vwma(source, 3), "VWMA")`, {
        bars: compatibilityBars.slice(0, 6).map((bar) => ({ ...bar, volume: 2 })),
      });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      const values = getPlot(result, 'VWMA').values;
      expect([values[2], values[4], values[5]]).toEqual([-3, -3, -3]);
    });
  }
});
