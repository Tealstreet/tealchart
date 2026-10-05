import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

function check(body: string, version = 6, dynamicRequests?: boolean) {
  return checkProgram(
    parse(
      `//@version=${version}\n${version <= 4 ? 'study' : 'indicator'}("Ledger controls"${dynamicRequests === undefined ? '' : `, dynamic_requests=${dynamicRequests}`})\n${body}`,
    ),
  );
}

// https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/#dynamic-requests
describe('ledger gaps 6: request context qualifiers', () => {
  const dynamicContext =
    'symbol = close > open ? "A" : "B"\nvalue = request.security(symbol, "1D", close)\nplot(value)';
  it.each([5, 6])('accepts series context with explicit dynamic requests in v%i (215/221)', (version) => {
    expect(check(dynamicContext, version, true).diagnostics).toEqual([]);
  });
  it('accepts series context by default in v6 (221)', () => {
    expect(check(dynamicContext).diagnostics).toEqual([]);
  });
  it('refuses series context by default in v5 (215)', () => {
    expect(check(dynamicContext, 5).diagnostics).toEqual([
      expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining("'symbol'") }),
    ]);
  });
  it.each(['request.security', 'request.security_lower_tf'])(
    'checks timeframe and currency for %s while allowing input contexts',
    (name) => {
      expect(
        check(`tf = input.timeframe("1", "Timeframe")\nvalue = ${name}("A", tf, close)`, 6, false).diagnostics,
      ).toEqual([]);
      for (const [slot, call] of [
        ['timeframe', `${name}("A", close > open ? "1" : "5", close)`],
        ['currency', `${name}("A", "1", close, currency=close > open ? "USD" : "EUR")`],
      ]) {
        expect(check(`value = ${call}`, 6, false).diagnostics).toEqual([
          expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining(`'${slot}'`) }),
        ]);
        expect(check(`value = ${call}`, 6, true).diagnostics).toEqual([]);
      }
    },
  );
  it.each([5, 6])('rejects series context with dynamic requests disabled in v%i (215)', (version) => {
    expect(check(dynamicContext, version, false).diagnostics).toEqual([
      expect.objectContaining({ severity: 'error', message: expect.stringMatching(/series.*symbol|symbol.*series/) }),
    ]);
  });
  it.each([5, 6])('still permits a series expression in a fixed context in v%i (216)', (version) => {
    expect(check('value = request.security("A", "1D", close * 2)\nplot(value)', version, false).diagnostics).toEqual(
      [],
    );
  });
});
