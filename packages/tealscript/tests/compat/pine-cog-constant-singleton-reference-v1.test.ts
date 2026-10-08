import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('COG constant nonzero sources expose rank normalization', () => {
  for (const version of [5, 6]) {
    for (const source of [-5, 5]) {
      it(`v${version} source=${source} preserves singleton and constant-window values`, () => {
        const result = runCompatScript(
          `//@version=${version}
indicator("COG constant")
plot(ta.cog(${source}.0, 1), "One")
plot(ta.cog(length = 2, source = ${source}.0), "Two")
plot(ta.cog(${source}.0, 4), "Four")`,
          { bars: compatibilityBars.slice(0, 7) },
        );
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        for (const [title, expected] of [
          ['One', -1],
          ['Two', -1.5],
          ['Four', -2.5],
        ] as const) {
          expect(getPlot(result, title).values.slice(3)).toEqual([expected, expected, expected, expected]);
        }
      });
    }
  }
});
