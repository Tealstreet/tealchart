import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// The var keyword initializes once; later assignments retain their values.
describe('Historical signed var counters', () => {
  const bars = compatibilityBars.slice(0, 6);

  for (const version of [5, 6]) {
    it(`v${version} retains root state across positive and negative increments`, () => {
      const result = runCompatScript(
        `//@version=${version}
indicator("Root signed counter")
var int count = 0
count += bar_index % 2 == 0 ? 3 : -2
plot(count, "Counter")`,
        { bars },
      );

      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      expect(getPlot(result, 'Counter').values).toEqual([3, 1, 4, 2, 5, 3]);
    });

    it(`v${version} retains independent local counters for two written calls`, () => {
      const result = runCompatScript(
        `//@version=${version}
indicator("Function signed counters")
advance(int delta) =>
    var int total = 0
    total += delta
    total
first = advance(bar_index % 2 == 0 ? 3 : -2)
second = advance(-4)
plot(first, "First")
plot(second, "Second")`,
        { bars },
      );

      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      expect(getPlot(result, 'First').values).toEqual([3, 1, 4, 2, 5, 3]);
      expect(getPlot(result, 'Second').values).toEqual([-4, -8, -12, -16, -20, -24]);
    });
  }
});
