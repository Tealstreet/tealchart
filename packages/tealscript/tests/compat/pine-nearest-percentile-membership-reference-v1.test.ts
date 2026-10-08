import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('Nearest-rank percentile remains an input-window member', () => {
  for (const version of [5, 6]) {
    it(`v${version} does not average or invent an intermediate sample`, () => {
      const source = [1, 4, 2, 8, -2, 5, -4, 10, 0, 7, -6, 12];
      const result = runCompatScript(
        `//@version=${version}
indicator("Nearest rank membership")
plot(ta.percentile_nearest_rank(close, 2, 50), "Positional")
plot(ta.percentile_nearest_rank(percentage = 50, length = 2, source = close), "Named")`,
        {
          bars: compatibilityBars.map((bar, i) => ({ ...bar, close: source[i] })),
        },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      for (const title of ['Positional', 'Named']) {
        const values = getPlot(result, title).values;
        for (let i = 1; i < source.length; i += 1) expect([source[i - 1], source[i]]).toContain(values[i]);
      }
    });
  }
});
