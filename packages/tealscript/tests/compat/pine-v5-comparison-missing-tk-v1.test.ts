import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/v5/language/operators/#comparison-operators
// V5 comparisons have three-state bool results; a missing predicate selects else.
describe('v5 comparison missing results and finite controls', () => {
  for (const operator of ['==', '!=', '>']) {
    it(`${operator} keeps missing operands distinguishable from false`, () => {
      const result = runCompatScript(`//@version=5
indicator("Missing comparison")
float value = bar_index == 0 or bar_index == 2 ? na : 2
left = value ${operator} 1
right = 1 ${operator} value
plot(na(left) ? 1 : 0, "LeftMissing")
plot(na(right) ? 1 : 0, "RightMissing")
plot(left ? 1 : 0, "LeftSelected")
plot(right ? 1 : 0, "RightSelected")`, { bars: compatibilityBars.slice(0, 5) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      for (const title of ['LeftMissing', 'RightMissing']) expect(getPlot(result, title).values).toEqual([1, 0, 1, 0, 0]);
      const truth = operator === '==' ? 0 : 1;
      expect(getPlot(result, 'LeftSelected').values).toEqual([0, truth, 0, truth, truth]);
      const reverseTruth = operator === '!=' ? 1 : 0;
      expect(getPlot(result, 'RightSelected').values).toEqual([0, reverseTruth, 0, reverseTruth, reverseTruth]);
    });
  }
});
