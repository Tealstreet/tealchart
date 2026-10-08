import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('Stochastic finite recovery after a source hole', () => {
  for (const version of [5, 6]) {
    it(`v${version} retains the constant-range midpoint on finite bars`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("Stochastic finite recovery")
src = bar_index == 3 ? na : 5.0
plot(ta.stoch(src, 10.0, 0.0, 3), "Stoch")`, { bars: compatibilityBars.slice(0, 6) });
      expect(result.errors).toEqual([]);
      const values = getPlot(result, 'Stoch').values;
      expect([values[2], values[4], values[5]]).toEqual([50, 50, 50]);
    });
    it(`v${version} distinguishes asymmetric bounds and retained hole publication`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("Asymmetric stochastic recovery")
src = bar_index == 3 ? na : 3.0
plot(ta.stoch(src, 10.0, 0.0, 3), "Stoch")`, { bars: compatibilityBars.slice(0, 6) });
      expect(result.errors).toEqual([]);
      const values = getPlot(result, 'Stoch').values;
      expect([values[2], values[3], values[4], values[5]]).toEqual([30, 30, 30, 30]);
    });
  }
});
