import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('Biased singleton dispersion is zero on finite input', () => {
  for (const version of [5, 6]) {
    for (const member of ['variance', 'stdev']) {
      it(`v${version} ${member} default and explicit biased singleton return zero`, () => {
        const prices = [-3, -1, 0, 4, -2, 8, 1, -6, 3, 0, 7, -4];
        const result = runCompatScript(
          `//@version=${version}
indicator("Biased singleton dispersion")
plot(close, "Source")
plot(ta.${member}(close, 1), "Default")
plot(ta.${member}(close, 1, true), "Positional")
plot(ta.${member}(biased = true, length = 1, source = close), "Named")`,
          {
            bars: compatibilityBars.map((bar, i) => ({ ...bar, close: prices[i] })),
          },
        );
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        expect(getPlot(result, 'Source').values).toEqual(prices);
        for (const title of ['Default', 'Positional', 'Named'])
          expect(getPlot(result, title).values.slice(1)).toEqual(Array(11).fill(0));
      });
    }
  }
});
