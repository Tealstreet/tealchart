import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('Stdev qualifying finite samples across holes', () => {
  for (const biased of [true, false]) {
    it(`biased=${biased} uses two finite samples despite intervening holes`, () => {
      const result = runCompatScript(`//@version=6
indicator("Stdev qualifying holes")
source = bar_index == 0 ? 2.0 : bar_index == 2 ? 6.0 : bar_index == 4 ? 10.0 : float(na)
plot(ta.stdev(source, 2, ${biased}), "Stdev")`, { bars: compatibilityBars.slice(0, 7) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      const values = getPlot(result, 'Stdev').values;
      expect(values).toHaveLength(7);
      expect(values.slice(0, 2)).toEqual([null, null]);
      for (const value of values.slice(2)) expect(value).toBeCloseTo(biased ? 2 : Math.sqrt(8), 12);
    });
  }
});
