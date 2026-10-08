import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('Singleton weighted averages preserve finite source values', () => {
  const cases = [
    { member: 'wma', positional: 'close, 1', named: 'length = 1, source = close' },
    { member: 'vwma', positional: 'close, 1', named: 'length = 1, source = close' },
    {
      member: 'alma',
      positional: 'close, 1, 0.85, 6.0',
      named: 'sigma = 6.0, offset = 0.85, length = 1, series = close',
    },
  ];
  for (const version of [5, 6]) {
    for (const item of cases) {
      it(`v${version} ${item.member} length1 preserves signed finite prices`, () => {
        const prices = [-3, -1, 0, 4, -2, 8, 1, -6, 3, 0, 7, -4];
        const volumes = [2, 5, 3, 7, 11, 13, 17, 19, 23, 29, 31, 37];
        const result = runCompatScript(
          `//@version=${version}
indicator("Singleton weighted averages")
plot(ta.${item.member}(${item.positional}), "Positional")
plot(ta.${item.member}(${item.named}), "Named")`,
          {
            bars: compatibilityBars.map((bar, i) => ({ ...bar, close: prices[i], volume: volumes[i] })),
          },
        );
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        for (const title of ['Positional', 'Named'])
          expect(getPlot(result, title).values.slice(1)).toEqual(prices.slice(1));
      });
    }
  }
});
