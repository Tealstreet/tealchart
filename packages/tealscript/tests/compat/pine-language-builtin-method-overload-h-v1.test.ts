import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const declarations = `method fill(array<float> values, float innerValue, float outerValue, float lowerBound, float upperBound) =>
    for [i, element] in values
        array.set(values, i, element >= lowerBound and element <= upperBound ? innerValue : outerValue)
    values
checksum(array<float> values) => array.get(values, 0) * 1000 + array.get(values, 1) * 100 + array.get(values, 2) * 10 + array.get(values, 3)
source = array.from(-3.0, 2.0, 7.0, 11.0)`;

// https://www.tradingview.com/pine-script-docs/language/methods/#method-overloading
for (const version of [5, 6]) {
  describe(`v${version} builtin method overloading`, () => {
    it('row 230 selects the custom fill signature through chained and named calls', () => {
      const source = `//@version=${version}
indicator("Custom fill signature")
${declarations}
custom = source.copy().fill(13.0, -4.0, 1.0, 9.0)
named = source.copy().fill(upperBound = 9.0, innerValue = 13.0, lowerBound = 1.0, outerValue = -4.0)
plot(checksum(custom), "Custom")
plot(checksum(named), "Named")
plot(source.copy().fill(13.0, -4.0, 1.0, 9.0).get(1), "Chained")
plot(checksum(source), "Original")`;
      expect(checkProgram(parse(source)).diagnostics).toEqual([]);
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 4) });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Custom').values).toEqual([-2574, -2574, -2574, -2574]);
      expect(getPlot(result, 'Named').values).toEqual([-2574, -2574, -2574, -2574]);
      expect(getPlot(result, 'Chained').values).toEqual([13, 13, 13, 13]);
      expect(getPlot(result, 'Original').values).toEqual([-2719, -2719, -2719, -2719]);
    });

    it('row 230 retains the builtin when custom required arguments are absent', () => {
      const source = `//@version=${version}
indicator("Builtin fill signature")
${declarations}
fallback = source.copy()
fallback.fill(5.0)
plot(checksum(fallback), "Builtin")
plot(checksum(source), "Original")`;
      expect(checkProgram(parse(source)).diagnostics).toEqual([]);
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 4) });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Builtin').values).toEqual([5555, 5555, 5555, 5555]);
      expect(getPlot(result, 'Original').values).toEqual([-2719, -2719, -2719, -2719]);
    });
  });
}
