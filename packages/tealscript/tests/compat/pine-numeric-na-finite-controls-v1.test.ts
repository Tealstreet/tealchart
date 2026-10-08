import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Numeric na() is true only for undefined values; zero and finite negatives are defined.
// https://www.tradingview.com/pine-script-reference/v6/#fun_na
describe('numeric missing-value detection', () => {
  for (const version of [5, 6]) {
    it(`detects typed missing int/float and retains finite controls in v${version}`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("Numeric missing detection")
int missingInt = na
float missingFloat = na
float changing = bar_index == 1 ? na : -2.5
plot(na(missingInt) ? 1 : 0, "IntMissing")
plot(na(missingFloat) ? 1 : 0, "FloatMissing")
plot(na(x=changing) ? 1 : 0, "Changing")
plot(na(0) ? 1 : 0, "Zero")
plot(na(-2.5) ? 1 : 0, "Negative")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile?.swallowedErrors ?? []).toEqual([]);
      for (const title of ['IntMissing', 'FloatMissing']) expect(getPlot(result, title).values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Changing').values).toEqual([0, 1, 0]);
      for (const title of ['Zero', 'Negative']) expect(getPlot(result, title).values).toEqual([0, 0, 0]);
    });
  }
});
