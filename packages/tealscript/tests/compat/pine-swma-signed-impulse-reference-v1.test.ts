import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('SWMA signed impulses expose individual weights', () => {
  for (const version of [5, 6]) {
    it(`v${version} applies one-two-two-one weights to positive and negative impulses`, () => {
      const result = runCompatScript(
        `//@version=${version}
indicator("SWMA signed impulse")
source = bar_index == 3 ? 12.0 : bar_index == 8 ? -12.0 : 0.0
plot(ta.swma(source), "Positional")
plot(ta.swma(source = source), "Named")`,
        { bars: compatibilityBars },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      for (const title of ['Positional', 'Named']) {
        expect(getPlot(result, title).values.slice(3)).toEqual([2, 4, 4, 2, 0, -2, -4, -4, -2]);
      }
    });
  }
});
