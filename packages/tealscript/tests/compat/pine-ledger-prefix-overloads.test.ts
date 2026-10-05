import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { executeScript } from '../../src/runtime/compiledOnly';

const sources = [
  { qualifier: 'const', expression: '"NASDAQ:AAPL"', output: 'simple' },
  { qualifier: 'input', expression: 'input.symbol("NASDAQ:AAPL")', output: 'simple' },
  { qualifier: 'simple', expression: 'syminfo.tickerid', output: 'simple' },
  { qualifier: 'series', expression: 'bar_index % 2 == 0 ? "NASDAQ:AAPL" : "NYSE:IBM"', output: 'series' },
] as const;

// Pine v6 syminfo.prefix overloads 236–237: simple minimum, series propagation.
describe('ledger syminfo.prefix overloads', () => {
  for (const source of sources) {
    for (const named of [false, true]) {
      it(`selects ${source.output} string for ${source.qualifier} symbol (${named ? 'named' : 'positional'})`, () => {
        const result = checkProgram(parse(`//@version=6
indicator("prefix overload")
symbol = ${source.expression}
prefix = syminfo.prefix(${named ? 'symbol=' : ''}symbol)
`));
        expect(result.diagnostics).toEqual([]);
        const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));
        expect(types.get('symbol')).toMatchObject({ kind: 'string', qualifier: source.qualifier });
        expect(types.get('prefix')).toMatchObject({ kind: 'string', qualifier: source.output });
      });
    }
  }
  for (const named of [false, true]) {
    it(`extracts changing exchange prefixes (${named ? 'named' : 'positional'})`, () => {
      const bars = [1, 2, 3].map((close, index) => ({
        time: (index + 1) * 60_000, open: close, high: close, low: close, close, volume: 1,
      }));
      const result = executeScript(parse(`//@version=6
indicator("prefix value")
symbol = bar_index % 2 == 0 ? "NASDAQ:AAPL" : "NYSE:IBM"
prefix = syminfo.prefix(${named ? 'symbol=' : ''}symbol)
plot(prefix == "NASDAQ" ? 1 : prefix == "NYSE" ? 2 : 0)
`), bars);
      expect(result.errors).toEqual([]);
      expect(result.plots[0]?.values).toEqual([1, 2, 1]);
    });
  }
});
