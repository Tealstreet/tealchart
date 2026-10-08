import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Type-system na-value guidance: ta.max ignores missing source values.
describe('Finite-seeded all-time maximum across holes', () => {
  for (const version of [5, 6]) {
    it(`v${version} retains the prior finite maximum`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("Finite maximum holes")
source = bar_index == 0 ? -5.0 : bar_index == 2 ? -2.0 : bar_index == 4 ? -4.0 : bar_index == 6 ? 3.0 : float(na)
plot(ta.max(source), "Maximum")`, { bars: compatibilityBars.slice(0, 7) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(getPlot(result, 'Maximum').values).toEqual([-5, -5, -2, -2, -2, -2, 3]);
    });
  }
});
