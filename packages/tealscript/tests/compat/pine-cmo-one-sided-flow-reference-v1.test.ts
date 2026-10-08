import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('CMO one-sided finite flows reach signed endpoints', () => {
  for (const version of [5, 6]) {
    for (const direction of [1, -1]) {
      it(`v${version} direction=${direction} keeps a zero opposite flow in the finite ratio`, () => {
        const prices = [0, 2, 3, 6, 10, 11, 16, 18, 25, 26, 30, 35];
        const result = runCompatScript(
          `//@version=${version}
indicator("CMO one sided")
plot(ta.cmo(close, 3), "Positional")
plot(ta.cmo(length = 3, source = close), "Named")`,
          {
            bars: compatibilityBars.map((bar, i) => ({ ...bar, close: direction * prices[i] })),
          },
        );
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        for (const title of ['Positional', 'Named'])
          expect(getPlot(result, title).values.slice(3)).toEqual(Array(9).fill(direction * 100));
      });
    }
  }
});
