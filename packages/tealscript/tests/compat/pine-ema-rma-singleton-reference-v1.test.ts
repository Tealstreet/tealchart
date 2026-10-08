import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// The documented EMA/RMA coefficient is 1 at length 1, including signed sources.
describe('Singleton EMA and RMA retain the current finite source', () => {
  for (const version of [5, 6]) {
    for (const member of ['ema', 'rma']) {
      it(`v${version} ${member} returns signed current inputs at length one`, () => {
        const values = [0, 12, -24, 0, 24, -6, 0, -18];
        const bars = values.map((close, index) => ({
          time: 1700000000000 + index * 60000,
          open: close,
          high: close + 1,
          low: close - 1,
          close,
          volume: 10,
        }));
        const result = runCompatScript(
          `//@version=${version}
indicator("Singleton smoothing")
plot(ta.${member}(close,1), "Base")
plot(ta.${member}(source=-3*close,length=1), "Reflected")`,
          { bars },
        );
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        expect(result.profile.swallowedErrors ?? []).toEqual([]);
        expect(getPlot(result, 'Base').values).toEqual(values);
        expect(getPlot(result, 'Reflected').values.map((value) => (value === 0 ? 0 : value))).toEqual([
          0, -36, 72, 0, -72, 18, 0, 54,
        ]);
      });
    }
  }
});
