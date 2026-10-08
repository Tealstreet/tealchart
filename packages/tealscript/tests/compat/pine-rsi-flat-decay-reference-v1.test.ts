import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('RSI flat steps decay both smoothed flows', () => {
  for (const version of [5, 6]) {
    it(`v${version} keeps flat-step ratios but applies their decay to later moves`, () => {
      const closes = [0, 6, 0, 0, 0, 6, 6, 0];
      const result = runCompatScript(
        `//@version=${version}
indicator("RSI flat decay")
plot(ta.rsi(close, 2), "Positional")
plot(ta.rsi(length = 2, source = close), "Named")`,
        {
          bars: compatibilityBars.slice(0, 8).map((bar, i) => ({ ...bar, close: closes[i] })),
        },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      const expected = [50, 50, 90, 90, 150 / 7];
      for (const title of ['Positional', 'Named']) {
        getPlot(result, title)
          .values.slice(3)
          .forEach((value, i) => expect(value).toBeCloseTo(expected[i], 12));
      }
    });
  }
});
