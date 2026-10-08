import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Official ta.change bool overload: current differs from source length bars ago.
describe('Boolean change compares explicit lagged states', () => {
  for (const version of [5, 6]) {
    it(`v${version} compares default and explicit three-bar endpoints`, () => {
      const bars = [-1, 1, 1, -1, 1, -1, -1, 1, -1, 1].map((close, index) => ({
        time: 1700000000000 + index * 60000,
        open: 0,
        high: 2,
        low: -2,
        close,
        volume: 10,
      }));
      const result = runCompatScript(
        `//@version=${version}
indicator("Boolean endpoint change")
condition = close > 0
plot(ta.change(condition) ? 1 : 0, "Default")
plot(ta.change(length=3, source=condition) ? 1 : 0, "ThreeBars")`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      expect(getPlot(result, 'Default').values.slice(3)).toEqual([1, 1, 1, 0, 1, 1, 1]);
      expect(getPlot(result, 'ThreeBars').values.slice(3)).toEqual([0, 0, 1, 0, 0, 0, 1]);
    });
  }
});
