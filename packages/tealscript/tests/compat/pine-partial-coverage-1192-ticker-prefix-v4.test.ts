import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

describe('PARTIAL 1192: ticker.new prefix overload qualification', () => {
  // Frozen reference functions[232-233] has simple and series string overloads.
  for (const named of [false, true]) {
    for (const qualifier of ['const', 'input', 'simple', 'series']) {
      it(`${named ? 'named' : 'positional'} ${qualifier} prefix preserves the selected result overload`, () => {
        const declaration =
          qualifier === 'input'
            ? 'prefix = input.string("NASDAQ")'
            : qualifier === 'series'
              ? 'series string prefix = bar_index == 0 ? "NASDAQ" : "NYSE"'
              : `${qualifier} string prefix = "NASDAQ"`;
        const call = named ? 'ticker.new(prefix=prefix, ticker="AAPL")' : 'ticker.new(prefix, "AAPL")';
        const check = checkProgram(
          parse(`//@version=6
indicator("Ticker prefix overload")
${declaration}
inferred = ${call}
simple string result = inferred`),
        );
        expect(check.symbols.find((symbol) => symbol.name === 'inferred')?.type).toMatchObject({
          kind: 'string',
          qualifier: qualifier === 'series' ? 'series' : 'simple',
        });
        const errors = check.diagnostics.filter((d) => d.severity === 'error');
        if (qualifier === 'series')
          expect(errors).toContainEqual(expect.objectContaining({ code: 'qualifier-mismatch' }));
        else expect(errors).toEqual([]);
      });
    }
  }
  it('preserves a UDT constructor named ticker', () => {
    const check = checkProgram(
      parse(`//@version=6
indicator("Ticker type shadow")
type ticker
    string id
    string name
series string prefix = bar_index == 0 ? "NASDAQ" : "NYSE"
inferred = ticker.new(prefix, "AAPL")`),
    );
    expect(check.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(check.symbols.find((symbol) => symbol.name === 'inferred')?.type).toMatchObject({
      kind: 'udt',
      name: 'ticker',
    });
  });
  it('preserves an imported callable named ticker.new', () => {
    const library = parse(`//@version=6
library("TickerShadow")
export new(string prefix, string ticker) => "library"`);
    const check = checkProgram(
      parse(`//@version=6
indicator("Ticker import shadow")
import PineTests/TickerShadow/1 as ticker
series string prefix = bar_index == 0 ? "NASDAQ" : "NYSE"
simple string inferred = ticker.new(prefix, "AAPL")`),
      { libraries: new Map([['PineTests/TickerShadow/1', library]]) },
    );
    expect(check.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });
  // https://www.tradingview.com/pine-script-docs/language/variable-declarations/#shadowing
  // UDT variable names matching namespaces are compilation errors.
  it('retains the documented UDT namespace refusal for a variable named ticker', () => {
    const check = checkProgram(
      parse(`//@version=6
indicator("Ticker receiver method shadow")
type Holder
    string name
    string detail
method new(Holder this, string prefix, string symbol) => "method"
ticker = Holder.new("custom", "detail")
series string prefix = bar_index == 0 ? "NASDAQ" : "NYSE"
simple string inferred = ticker.new(prefix, "AAPL")`),
    );
    expect(check.diagnostics.filter((d) => d.severity === 'error')).toContainEqual(
      expect.objectContaining({ code: 'namespace-obscuring' }),
    );
  });
});
