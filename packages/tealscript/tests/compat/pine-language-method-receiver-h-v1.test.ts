import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/methods/#user-defined-methods
for (const version of [5, 6]) {
  describe(`v${version} method receiver annotation`, () => {
    it.each([
      'method encodeDigits(receiver, int digit) => receiver * 10 + digit',
      'method encodeDigits(receiver, int digit) =>\n    int value = receiver * 10 + digit\n    value',
    ])('row 225 refuses an untyped first parameter: %s', (declaration) => {
      const source = `//@version=${version}\nindicator("Receiver type")\n${declaration}`;
      expect(
        checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
      ).not.toHaveLength(0);
    });

    it('row 225 accepts a typed primitive receiver with dot and explicit calls', () => {
      const source = `//@version=${version}
indicator("Typed primitive receiver")
method encodeDigits(int receiver, int digit) => receiver * 10 + digit
int value = 2
plot(value.encodeDigits(7), "Dot")
plot(encodeDigits(2, 7), "Explicit")`;
      expect(checkProgram(parse(source)).diagnostics).toEqual([]);
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 4) });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Dot').values).toEqual([27, 27, 27, 27]);
      expect(getPlot(result, 'Explicit').values).toEqual([27, 27, 27, 27]);
    });

    it('row 225 accepts an explicitly typed reference receiver', () => {
      const source = `//@version=${version}
indicator("Typed array receiver")
method headValue(array<float> receiver) => array.get(receiver, 0)
values = array.new_float(2, 9)
plot(values.headValue(), "Value")`;
      expect(checkProgram(parse(source)).diagnostics).toEqual([]);
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 4) });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Value').values).toEqual([9, 9, 9, 9]);
    });
  });
}
