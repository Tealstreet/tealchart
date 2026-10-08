import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/user-defined-functions/#declaring-parameter-types
for (const version of [5, 6]) {
  describe(`v${version} declared value parameters`, () => {
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
