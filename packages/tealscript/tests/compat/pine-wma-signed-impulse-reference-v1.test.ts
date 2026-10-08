import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('WMA signed impulses expose descending physical weights', () => {
  for (const version of [5, 6]) {
    it(`v${version} weights newest samples most at lengths two and four`, () => {
      const result = runCompatScript(
        `//@version=${version}
indicator("WMA signed impulse")
source = bar_index == 3 ? 30.0 : bar_index == 8 ? -30.0 : 0.0
plot(ta.wma(source, 2), "Two")
plot(ta.wma(length = 4, source = source), "Four")`,
        { bars: compatibilityBars },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(getPlot(result, 'Two').values.slice(3)).toEqual([20, 10, 0, 0, 0, -20, -10, 0, 0]);
      expect(getPlot(result, 'Four').values.slice(3)).toEqual([12, 9, 6, 3, 0, -12, -9, -6, -3]);
    });
  }
});
