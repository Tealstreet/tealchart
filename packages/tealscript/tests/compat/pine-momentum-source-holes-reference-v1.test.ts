import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('Momentum keeps physical lookback across missing source samples', () => {
  for (const version of [5, 6]) {
    it(`v${version} includes missing current and lag-two samples`, () => {
      const source = [2, null, 6, 12, null, 3, 9, 18, null, 6, 24, 12];
      const result = runCompatScript(
        `//@version=${version}
indicator("Momentum holes")
source = bar_index == 1 or bar_index == 4 or bar_index == 8 ? float(na) : close
plot(ta.mom(source, 2), "Positional")
plot(ta.mom(length = 2, source = source), "Named")`,
        {
          bars: compatibilityBars.map((bar, i) => ({ ...bar, close: source[i] ?? 0 })),
        },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      const expected = [4, null, null, -9, null, 15, null, -12, null, 6];
      for (const title of ['Positional', 'Named']) {
        expect(
          getPlot(result, title)
            .values.slice(2)
            .map((value) => (value == null || Number.isNaN(value) ? null : value)),
        ).toEqual(expected);
      }
    });
  }
});
