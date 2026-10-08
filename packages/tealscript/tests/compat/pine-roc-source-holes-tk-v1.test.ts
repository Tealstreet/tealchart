import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('ROC physical source holes and recovery', () => {
  for (const version of [5, 6]) {
    it(`v${version} propagates a missing current or prior source`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("ROC source holes")
source = bar_index == 0 ? 2.0 : bar_index == 2 ? 6.0 : bar_index == 3 ? 12.0 : bar_index == 5 ? 3.0 : bar_index == 6 ? 9.0 : float(na)
plot(ta.roc(source, 1), "ROC")`, { bars: compatibilityBars.slice(0, 7) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(getPlot(result, 'ROC').values).toEqual([null, null, null, 100, null, null, 200]);
    });
  }
});
