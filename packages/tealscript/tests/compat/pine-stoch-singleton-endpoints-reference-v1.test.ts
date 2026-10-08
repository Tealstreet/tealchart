import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('Singleton stochastic resolves nonflat range endpoints', () => {
  for (const version of [5, 6]) {
    it(`v${version} low midpoint and high return zero fifty and one hundred`, () => {
      const lows = [-5, 0, 2, -8, 3, 9, -2, 4, -1, 10, -4, 6];
      const expected = lows.map((_, i) => (i % 3) * 50);
      const result = runCompatScript(
        `//@version=${version}
indicator("Singleton stochastic endpoints")
plot(ta.stoch(close, high, low, 1), "Positional")
plot(ta.stoch(length = 1, low = low, high = high, source = close), "Named")`,
        {
          bars: compatibilityBars.map((bar, i) => ({
            ...bar,
            open: lows[i] + (i % 3) * 2,
            close: lows[i] + (i % 3) * 2,
            low: lows[i],
            high: lows[i] + 4,
          })),
        },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      for (const title of ['Positional', 'Named'])
        expect(getPlot(result, title).values.slice(1)).toEqual(expected.slice(1));
    });
  }
});
