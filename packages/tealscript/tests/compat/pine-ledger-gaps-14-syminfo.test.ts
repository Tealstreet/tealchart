import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const reference = '~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json';

describe(`Ledger gaps524/525: ${reference} functions[238/239]`, () => {
  it('selects series-string ticker results and preserves the simple-string overload', () => {
    const result = checkProgram(parse(`//@version=6
indicator("Ticker overload qualifier")
symbol = bar_index % 2 == 0 ? "NASDAQ:AAPL" : "NASDAQ:MSFT"
seriesTicker = syminfo.ticker(symbol)
namedTicker = syminfo.ticker(symbol=symbol)
simple string literalControl = syminfo.ticker("NASDAQ:AAPL")
simple string inputControl = syminfo.ticker(input.symbol("NASDAQ:AAPL"))
simple string rejected = seriesTicker
plot(str.length(namedTicker))
`));
    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));
    expect(types.get('seriesTicker')).toMatchObject({ kind: 'string', qualifier: 'series' });
    expect(types.get('namedTicker')).toMatchObject({ kind: 'string', qualifier: 'series' });
    expect(types.get('literalControl')).toMatchObject({ kind: 'string', qualifier: 'simple' });
    expect(types.get('inputControl')).toMatchObject({ kind: 'string', qualifier: 'simple' });
    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual(['Cannot assign series value to simple string']);
  });

  it('uses each bar selected prefixed symbol for positional and named ticker extraction', () => {
    const result = runCompatScript(`//@version=6
indicator("Ticker overload values")
symbol = bar_index % 2 == 0 ? "NASDAQ:AAPL" : "NYSE:IBM"
expected = bar_index % 2 == 0 ? "AAPL" : "IBM"
plot(syminfo.ticker(symbol) == expected ? 1 : 0, title="Positional")
plot(syminfo.ticker(symbol=symbol) == expected ? 1 : 0, title="Named")
`, { bars: compatibilityBars.slice(0, 4) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Positional').values).toEqual([1, 1, 1, 1]);
    expect(getPlot(result, 'Named').values).toEqual([1, 1, 1, 1]);
  });

  it('requires the symbol argument and refuses non-string symbols', () => {
    const missing = checkProgram(parse(`//@version=6
indicator("Ticker argument contract")
x = syminfo.ticker()
plot(1)
`));
    expect(missing.diagnostics.some((diagnostic) => diagnostic.code === 'argument-count')).toBe(true);
    const invalid = checkProgram(parse(`//@version=6
indicator("Ticker non-string symbol")
y = syminfo.ticker(symbol=12)
plot(1)
`));
    expect(invalid.diagnostics.map((diagnostic) => diagnostic.message)).toEqual(['syminfo.ticker symbol must be a string, got int']);
  });

});
