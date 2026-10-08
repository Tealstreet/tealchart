import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('MFI zero-volume moves contribute no directional flow', () => {
  for (const version of [5, 6]) {
    it(`v${version} preserves zero weights with both flow sums positive`, () => {
      const closes = [10, 12, 8, 14, 9, 15, 7, 16];
      const volumes = [2, 3, 5, 0, 0, 2, 4, 0];
      const result = runCompatScript(
        `//@version=${version}
indicator("MFI zero volume")
plot(ta.mfi(close, 4), "Positional")
plot(ta.mfi(length = 4, series = close), "Named")`,
        {
          bars: compatibilityBars.slice(0, 8).map((bar, i) => ({ ...bar, close: closes[i], volume: volumes[i] })),
        },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      const expected = [900 / 19, 300 / 7, 1500 / 29, 1500 / 29];
      for (const title of ['Positional', 'Named']) {
        getPlot(result, title)
          .values.slice(4)
          .forEach((value, i) => expect(value).toBeCloseTo(expected[i], 12));
      }
    });
  }
});
