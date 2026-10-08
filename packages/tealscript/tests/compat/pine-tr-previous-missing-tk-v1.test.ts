import { describe, expect, it } from 'vitest';
import { getPlot, runCompatScript } from './fixtures';

// ta.tr equals ta.tr(false); true alone substitutes high-low for missing prior close.
describe('True range missing previous close', () => {
  for (const version of [5, 6]) {
    it(`v${version} preserves variable and explicit handle_na policy`, () => {
      const bars = [[5, 1, 2], [8, 3, NaN], [10, 5, 7], [12, 6, 8]].map(([high, low, close], index) => ({
        time: 1700000000000 + index * 60000, open: low, high, low, close, volume: 10,
      }));
      const result = runCompatScript(`//@version=${version}
indicator("TR prior missing")
plot(ta.tr, "Variable")
plot(ta.tr(handle_na=false), "False")
plot(ta.tr(true), "True")`, { bars });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(getPlot(result, 'Variable').values).toEqual([null, 6, null, 6]);
      expect(getPlot(result, 'False').values).toEqual([null, 6, null, 6]);
      expect(getPlot(result, 'True').values).toEqual([4, 6, 5, 6]);
    });
  }
});
