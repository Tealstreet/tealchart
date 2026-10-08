import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('SAR repeats do not increase acceleration', () => {
  for (const version of [5, 6]) {
    for (const reflected of [false, true]) {
      it(`v${version} reflected=${reflected} increases acceleration only on a strictly new extreme`, () => {
        const closes = [5, 10, 10, 10, 20, 20, 30, 30, 40, 40, 50, 50];
        const sign = reflected ? -1 : 1;
        const result = runCompatScript(
          `//@version=${version}
indicator("SAR equal extremes")
plot(ta.sar(0.1, 0.1, 0.8), "Positional")
plot(ta.sar(max = 0.8, inc = 0.1, start = 0.1), "Named")`,
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
        const expected = [4, 4, 4.7, 5.33, 8.464, 10.9712, 16.97984, 21.185888, 29, 33.8, 39].map(
          (value) => sign * value,
        );
        for (const title of ['Positional', 'Named']) {
          const actual = getPlot(result, title).values.slice(1);
          expect(actual).toHaveLength(expected.length);
          expected.forEach((value, i) => expect(actual[i]).toBeCloseTo(value, 10));
        }
      });
    }
  }
});
