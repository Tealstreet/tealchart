import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/user-defined-functions/#declaring-parameter-types
for (const version of [5, 6]) {
  describe(`v${version} declared value parameters`, () => {
    it.each([
      ['int', '"Ax"'],
      ['int', '1.25'],
      ['float', 'color.red'],
      ['string', '3'],
    ])('row 203 refuses %s parameter with %s argument', (type, argument) => {
      const source = `//@version=${version}
indicator("Parameter kind")
accept(${type} value) => value
actual = accept(${argument})`;
      expect(checkProgram(parse(source)).diagnostics.some((diagnostic) => diagnostic.code === 'type-mismatch')).toBe(
        true,
      );
    });

    it('row 203 accepts typed parameters and int to float widening', () => {
      const source = `//@version=${version}
indicator("Typed values")
acceptInt(int value) => value
acceptFloat(float value) => value
acceptString(string value) => value
collect(float source, bool when = true, bool since = false, int length = 2) => length
plot(acceptInt(3) * 100 + acceptFloat(2) * 10 + acceptFloat(1.25), "Value")
plot(acceptString("Ax") == "Ax" ? 1 : 0, "String")\nplot(na(acceptInt(na)) ? 1 : 0, "IntMissing")\nplot(na(acceptFloat(na)) ? 1 : 0, "FloatMissing")\nplot(collect(2, length = 4), "NamedSlot")`;
      expect(checkProgram(parse(source)).diagnostics).toEqual([]);
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 4) });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Value').values).toEqual([321.25, 321.25, 321.25, 321.25]);
      expect(getPlot(result, 'String').values).toEqual([1, 1, 1, 1]);
      expect(getPlot(result, 'IntMissing').values).toEqual([1, 1, 1, 1]);
      expect(getPlot(result, 'FloatMissing').values).toEqual([1, 1, 1, 1]);
      expect(getPlot(result, 'NamedSlot').values).toEqual([4, 4, 4, 4]);
    });

    it.each([
      ['const', 'input.float(2)'],
      ['simple', 'close'],
    ])('row 204 refuses stronger argument %s %s', (qualifier, argument) => {
      const source = `//@version=${version}
indicator("Parameter qualifier")
accept(${qualifier} float value) => value
actual = accept(${argument})`;
      expect(
        checkProgram(parse(source)).diagnostics.some((diagnostic) => diagnostic.code === 'qualifier-mismatch'),
      ).toBe(true);
    });

    it('row 204 admits constant input simple and series value parameters at their ceilings', () => {
      const source = `//@version=${version}
indicator("Parameter ceilings")
constant(const float value) => value
simpleValue(simple float value) => value
seriesValue(series float value) => value
configured = input.float(2)
simple float first = 3
plot(constant(1) + simpleValue(configured) + simpleValue(first) + seriesValue(close), "Value")`;
      expect(checkProgram(parse(source)).diagnostics).toEqual([]);
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 4) });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Value').values).toEqual([108, 111, 113, 109]);
    });
  });
}
