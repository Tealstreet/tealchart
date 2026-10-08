import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('SAR clamps against both prior bars', () => {
  for (const version of [5, 6]) {
    for (const reflected of [false, true]) {
      it(`v${version} reflected=${reflected} clamps to the older prior extreme on a steep monotonic trend`, () => {
        const closes = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110];
        const sign = reflected ? -1 : 1;
        const result = runCompatScript(
          `//@version=${version}
indicator("SAR two prior clamps")
plot(ta.sar(0.5, 0.0, 0.5), "Positional")
plot(ta.sar(max = 0.5, inc = 0.0, start = 0.5), "Named")`,
          {
            bars: compatibilityBars.map((bar, i) => ({
              ...bar,
              open: sign * closes[i],
              close: sign * closes[i],
              high: sign * closes[i] + 1,
              low: sign * closes[i] - 1,
            })),
          },
        );
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        const expected = [4, 4, 9, 19, 29, 39, 49, 59, 69, 79, 89].map((value) => sign * value);
        for (const title of ['Positional', 'Named']) expect(getPlot(result, title).values.slice(1)).toEqual(expected);
      });
    }
  }
});
