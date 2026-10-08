import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('EMA finite updates across source holes', () => {
  for (const version of [5, 6]) {
    it(`v${version} preserves the seeded state across ignored samples`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("EMA hole state")
source = bar_index < 3 ? 3.0 : bar_index == 4 ? 7.0 : bar_index == 6 ? 9.0 : float(na)
plot(ta.ema(source, 3), "EMA")`, { bars: compatibilityBars.slice(0, 7) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      const values = getPlot(result, 'EMA').values;
      expect([values[4], values[6]]).toEqual([5, 7]);
    });
  }
});
