import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const checked = (body: string) => checkProgram(parse(`//@version=6\nindicator("Inherit overload")\n${body}`));
const calls = [
  ['from_tickerid', 'ticker.inherit(value, "NYSE:IBM")', 'ticker.inherit(symbol="NYSE:IBM", from_tickerid=value)'],
  ['symbol', 'ticker.inherit("NASDAQ:AAPL", value)', 'ticker.inherit(symbol=value, from_tickerid="NASDAQ:AAPL")'],
] as const;

// Reference entries 718/719: argument qualifiers select simple/series strings.
// https://www.tradingview.com/pine-script-reference/v6/#fun_ticker.inherit
describe('ticker.inherit documented return overloads', () => {
  for (const [slot, positional, named] of calls) {
    for (const [binding, call] of [
      ['positional', positional],
      ['named', named],
    ]) {
      for (const qualifier of ['const', 'input', 'simple', 'series']) {
        it(`${slot} ${binding} ${qualifier} selects the result qualifier`, () => {
          const declaration =
            qualifier === 'input'
              ? 'value = input.string("NASDAQ:AAPL")'
              : qualifier === 'series'
                ? 'series string value = bar_index == 0 ? "NASDAQ:AAPL" : "NYSE:IBM"'
                : `${qualifier} string value = "NASDAQ:AAPL"`;
          const result = checked(`${declaration}\ninferred = ${call}`);
          expect(result.diagnostics.filter((entry) => entry.severity === 'error')).toEqual([]);
          expect(result.symbols.find((symbol) => symbol.name === 'inferred')?.type).toMatchObject({
            kind: 'string',
            qualifier: qualifier === 'series' ? 'series' : 'simple',
          });
        });
      }
      it(`${slot} ${binding} series result cannot initialize a simple string`, () => {
        const result = checked(
          `series string value = bar_index == 0 ? "NASDAQ:AAPL" : "NYSE:IBM"\nsimple string result = ${call}`,
        );
        expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'qualifier-mismatch' }));
      });
    }
  }

  it('preserves an imported inherit callable with its own constant return', () => {
    const library = parse(
      '//@version=6\nlibrary("InheritControl")\nexport inherit(string from_tickerid, string symbol) => "library"',
    );
    const result = checkProgram(
      parse(`//@version=6
indicator("Imported inherit control")
import PineTests/InheritControl/1 as ticker
series string value = bar_index == 0 ? "NASDAQ:AAPL" : "NYSE:IBM"
simple string result = ticker.inherit(value, value)`),
      {
        libraries: new Map([['PineTests/InheritControl/1', library]]),
      },
    );
    expect(result.diagnostics.filter((entry) => entry.severity === 'error')).toEqual([]);
  });

  it('preserves a scalar receiver named ticker with a user inherit method', () => {
    const result = checked(`method inherit(string self, string symbol) => "method"
ticker = "receiver"
series string symbol = bar_index == 0 ? "NASDAQ:AAPL" : "NYSE:IBM"
simple string result = ticker.inherit(symbol)`);
    expect(result.diagnostics.filter((entry) => entry.severity === 'error')).toEqual([]);
  });

  it('propagates the series overload through a user function return', () => {
    const result = checked(`make(simple string fromId, series string symbol) => ticker.inherit(fromId, symbol)
series string symbol = bar_index == 0 ? "NASDAQ:AAPL" : "NYSE:IBM"
inferred = make("NASDAQ:AAPL", symbol)
simple string result = inferred`);
    expect(result.symbols.find((symbol) => symbol.name === 'inferred')?.type).toMatchObject({
      kind: 'string',
      qualifier: 'series',
    });
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'qualifier-mismatch' }));
  });

  it('retains the version-pinned v5 fallback without asserting a native legacy rule', () => {
    const result = checkProgram(
      parse(`//@version=5
indicator("Legacy inherit control")
series string symbol = bar_index == 0 ? "NASDAQ:AAPL" : "NYSE:IBM"
simple string result = ticker.inherit("NASDAQ:AAPL", symbol)`),
    );
    expect(result.diagnostics.filter((entry) => entry.severity === 'error')).toEqual([]);
  });

  it.each(['ticker.new(value, "AAPL")', 'ticker.modify(value)'])('retains the neighboring %s overload', (call) => {
    const result = checked(`series string value = bar_index == 0 ? "NASDAQ" : "NYSE"\ninferred = ${call}`);
    expect(result.diagnostics.filter((entry) => entry.severity === 'error')).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'inferred')?.type).toMatchObject({
      kind: 'string',
      qualifier: 'series',
    });
  });
});
