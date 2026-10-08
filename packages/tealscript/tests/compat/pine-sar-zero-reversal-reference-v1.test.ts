import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('SAR zero acceleration reverses to the saved extreme', () => {
  for (const version of [5, 6]) {
    for (const reflected of [false, true]) {
      it(`v${version} reflected=${reflected} retains extremes beyond the clamp window`, () => {
        const closes = [5, 7, 40, 10, 9, -3, -4, 9, 10, 45, 46, -6];
        const sign = reflected ? -1 : 1;
        const result = runCompatScript(
          `//@version=${version}
indicator("SAR zero reversal")
plot(ta.sar(0.0, 0.0, 0.0), "Positional")
plot(ta.sar(max = 0.0, inc = 0.0, start = 0.0), "Named")`,
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
        const expected = [4, 4, 4, 4, 41, 41, 41, 41, -5, -5, 47].map((value) => sign * value);
        for (const title of ['Positional', 'Named']) expect(getPlot(result, title).values.slice(1)).toEqual(expected);
      });
    }
  }
});
