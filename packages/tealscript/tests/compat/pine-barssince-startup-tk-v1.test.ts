import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('Bars since documented event startup', () => {
  for (const version of [5, 6]) {
    it(`v${version} is missing before an event and resets to zero on each event`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("Bars since event startup")
condition = bar_index == 2 or bar_index == 4
plot(ta.barssince(condition), "Elapsed")`, { bars: compatibilityBars.slice(0, 7) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(getPlot(result, 'Elapsed').values).toEqual([null, null, 0, 1, 0, 1, 2]);
    });
  }
});
