import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Official ta.tr reference: maximum range and absolute prior-close distances.
describe('true range under reflected signed gaps', () => {
  for (const direction of [1, -1]) {
    it(`retains absolute gaps at price direction ${direction}`, () => {
      const prices = [-8, 3, -12, 6, -4, 10];
      const bars = prices.map((price, index) => ({
        time: 1700000000000 + index * 60000,
        open: direction * price,
        high: direction * price + 2,
        low: direction * price - 2,
        close: direction * price,
        volume: 10,
      }));
      const result = runCompatScript(
        `//@version=6
indicator("Reflected true range")
plot(ta.tr(handle_na=true), "Fallback")
plot(ta.tr(handle_na=false), "Strict")
plot(ta.tr, "Variable")`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      expect(getPlot(result, 'Fallback').values).toEqual([4, 13, 17, 20, 12, 16]);
      for (const title of ['Strict', 'Variable']) {
        expect(getPlot(result, title).values).toEqual([null, 13, 17, 20, 12, 16]);
      }
    });
  }
});
