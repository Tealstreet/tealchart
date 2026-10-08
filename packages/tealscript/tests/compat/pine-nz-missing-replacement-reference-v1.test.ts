import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Explicit replacement is returned when source is missing, even if replacement is missing.
// https://www.tradingview.com/pine-script-reference/v6/#fun_nz
describe('nz explicit missing replacement', () => {
  for (const version of [5, 6]) {
    it(`preserves missing replacements and finite sources in v${version}`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("nz explicit replacement")
float source = bar_index == 1 ? -2.5 : na
float replacement = na
plot(nz(source, replacement), "Positional")
plot(nz(replacement = replacement, source = source), "Named")
plot(nz(source, 7.25), "FiniteReplacement")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile?.swallowedErrors ?? []).toEqual([]);
      expect(getPlot(result, 'Positional').values).toEqual([null, -2.5, null]);
      expect(getPlot(result, 'Named').values).toEqual([null, -2.5, null]);
      expect(getPlot(result, 'FiniteReplacement').values).toEqual([7.25, -2.5, 7.25]);
    });
  }
});
