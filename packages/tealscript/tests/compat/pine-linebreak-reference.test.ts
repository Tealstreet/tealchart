import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Ledger1405–1409; v6 functions[248]/[249] expose simple and series overloads.
// Both number_of_lines slots require integer kind; symbol is string.
// https://www.tradingview.com/pine-script-reference/v6/#fun_ticker.linebreak
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/#ticker-namespace-for-functions-that-help-create-tickers
function errors(expression: string, version = 6) {
  return checkProgram(
    parse(`//@version=${version}\n${version < 5 ? 'study' : 'indicator'}("Line Break")\nid=${expression}\n`),
  ).diagnostics.filter((d) => d.severity === 'error');
}
describe('Line Break published ticker slots', () => {
  it.each(['3.0', '3.5', 'input.float(3.0)', 'float(timeframe.multiplier)', 'float(bar_index + 1)'])(
    'refuses float-kind number_of_lines=%s',
    (length) => {
      expect(errors(`ticker.linebreak(number_of_lines=${length},symbol=syminfo.tickerid)`)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('integer') }),
        ]),
      );
    },
  );
  it.each(['3', 'input.int(3)', 'timeframe.multiplier', 'bar_index % 2 + 1', 'int(3.0)'])(
    'accepts documented integer qualifiers number_of_lines=%s',
    (length) => {
      expect(errors(`ticker.linebreak(syminfo.tickerid,${length})`)).toEqual([]);
    },
  );
  it.each([
    '"EXCHANGE:ABC"',
    'input.string("EXCHANGE:ABC")',
    'syminfo.tickerid',
    'bar_index%2==0?"EXCHANGE:ABC":"EXCHANGE:DEF"',
  ])('accepts documented string qualifiers symbol=%s', (symbol) => {
    expect(errors(`ticker.linebreak(number_of_lines=3,symbol=${symbol})`)).toEqual([]);
  });
  it.each(['true', '3', '3.5'])('refuses nonstring symbol=%s', (symbol) => {
    expect(errors(`ticker.linebreak(${symbol},3)`)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]),
    );
  });
  it.each(['ticker.linebreak(symbol="EXCHANGE:ABC")', 'ticker.linebreak(number_of_lines=3)'])(
    'refuses missing required argument in %s',
    (call) => {
      expect(errors(call)).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'argument-count' })]));
    },
  );
});
