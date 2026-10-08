import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/user-defined-functions/
const bars = compatibilityBars.slice(0, 6);

for (const version of [5, 6]) {
  describe(`v${version} function body and written calls`, () => {
    it('row 199 evaluates comma body statements in order before returning its final value', () => {
      const source = `//@version=${version}
indicator("Comma function body")
trace = array.new_float()
adjust(x) => first = x * 3, array.push(trace, first), last = first - 7, array.push(trace, last), last + 2
result = adjust(close)
plot(result, "Result")
plot(array.get(trace, 0) * 10 + array.get(trace, 1), "Trace")`;
      expect(checkProgram(parse(source)).diagnostics).toEqual([]);
      const result = runCompatScript(source, { bars });
      expect(result.errors).toEqual([]);
      expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
      expect(getPlot(result, 'Result').values).toEqual([301, 310, 316, 304, 292, 295]);
      expect(getPlot(result, 'Trace').values).toEqual([3359, 3458, 3524, 3392, 3260, 3293]);
    });
  });
}
