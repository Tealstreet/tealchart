import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Each written function call retains its own local var state, including children.
describe('Nested function counters keep independent persistent state', () => {
  for (const version of [5, 6]) {
    it(`v${version} isolates two child calls within each of two outer calls`, () => {
      const result = runCompatScript(
        `//@version=${version}
indicator("Nested counters")
advance(int delta) =>
    var int total = 0
    total += delta
    total
pair(int firstDelta, int otherDelta) =>
    firstCount = advance(firstDelta)
    otherCount = advance(otherDelta)
    [firstCount, otherCount]
[positiveA, negativeA] = pair(3, -2)
[negativeB, positiveB] = pair(-5, 4)
plot(positiveA, "PositiveA")
plot(negativeA, "NegativeA")
plot(negativeB, "NegativeB")
plot(positiveB, "PositiveB")`,
        { bars: compatibilityBars.slice(0, 4) },
      );

      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      expect(getPlot(result, 'PositiveA').values).toEqual([3, 6, 9, 12]);
      expect(getPlot(result, 'NegativeA').values).toEqual([-2, -4, -6, -8]);
      expect(getPlot(result, 'NegativeB').values).toEqual([-5, -10, -15, -20]);
      expect(getPlot(result, 'PositiveB').values).toEqual([4, 8, 12, 16]);
    });
  }
});
