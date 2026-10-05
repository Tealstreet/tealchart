import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

// Literal contracts from the TradingView type-system tuple documentation and
// ta.sma reference; ledger-gaps-v1 ranks 206/207/214/219/235/236.
// https://www.tradingview.com/pine-script-docs/language/type-system/#tuples
// https://www.tradingview.com/pine-script-reference/v6/#fun_ta.sma
function check(body: string, version = 6) {
  return checkProgram(parse(`//@version=${version}\nindicator("Ledger gaps 6")\n${body}`));
}

describe('ledger gaps 6: scalar qualifier and integer length contracts', () => {
  it('keeps an immutable simple declaration and rejects series reassignment (206)', () => {
    const accepted = check('simple float tick = syminfo.mintick\nplot(tick)');
    expect(accepted.diagnostics).toEqual([]);
    expect(accepted.symbols.find((symbol) => symbol.name === 'tick')?.type).toEqual({
      kind: 'float',
      qualifier: 'simple',
    });
    expect(check('simple float tick = syminfo.mintick\ntick := close').diagnostics).toEqual([
      expect.objectContaining({
        code: 'qualifier-mismatch',
        message: expect.stringContaining('Cannot assign series value to simple float'),
      }),
    ]);
  });

  it('widens a mutable v6 variable to series (214)', () => {
    const result = check('length = 3\nlength := 4\nplot(ta.ema(close, length))');
    expect(result.symbols.find((symbol) => symbol.name === 'length')?.type?.qualifier).toBe('series');
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'qualifier-mismatch',
        message: expect.stringContaining("Cannot pass series value to simple parameter 'length' for ta.ema"),
      }),
    ]);
  });

  it.each([
    'length = 3\nplot(ta.ema(close, length))\nlength := 4',
    'int length = 3\nif close > open\n    length := 4\nplot(ta.ema(close, length))',
    'length = 3\nlength += 1\nplot(ta.ema(close, length))',
    'length = input.int(3, "Length")\nlength := 4\nplot(ta.ema(close, length))',
  ])('marks an unqualified mutable v6 declaration before consumers (214)', (body) => {
    expect(check(body).diagnostics).toEqual([
      expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining("'length' for ta.ema") }),
    ]);
  });

  it('keeps v5 mutable constant inference for the migration control (214)', () => {
    expect(check('length = 3\nlength := 4\nplot(ta.ema(close, length))', 5).diagnostics).toEqual([]);
  });

  it('propagates a mutable UDF-local qualifier through return inference (214)', () => {
    const result = check(`getLength() =>
    length = 3
    length := 4
    length
length = getLength()
plot(ta.ema(close, length))`);
    expect(result.symbols.find((symbol) => symbol.name === 'length')?.type?.qualifier).toBe('series');
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining("'length' for ta.ema") }),
    ]);
  });

  it('does not confuse a mutable shadow with an immutable outer declaration (214)', () => {
    const result = check(`length = 3
if close > open
    length = 4
    length += 1
plot(ta.ema(close, length))`);
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'length')?.type?.qualifier).toBe('const');
  });

  it('types barstate.islast as series bool (235)', () => {
    const result = check('last = barstate.islast');
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'last')?.type).toEqual({
      kind: 'bool',
      qualifier: 'series',
    });
  });
});
