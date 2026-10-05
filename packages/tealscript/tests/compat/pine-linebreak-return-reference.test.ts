import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// First-party v6 functions[248]/[249]: simple/series string overloads.
// https://www.tradingview.com/pine-script-reference/v6/#fun_ticker.linebreak
function diagnostics(call: string) {
  return checkProgram(
    parse(`//@version=6\nindicator("Line Break return")\nsimple string id=${call}\n`),
  ).diagnostics.filter((d) => d.severity === 'error');
}
describe('Line Break return qualifier overloads', () => {
  it.each([
    'ticker.linebreak(bar_index%2==0?"EXCHANGE:ABC":"EXCHANGE:DEF",3)',
    'ticker.linebreak("EXCHANGE:ABC",bar_index+1)',
  ])('propagates series overload return in %s', (call) => {
    expect(diagnostics(call)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'qualifier-mismatch' })]),
    );
  });
  it('retains simple overload return', () => {
    expect(diagnostics('ticker.linebreak("EXCHANGE:ABC",3)')).toEqual([]);
  });
});
