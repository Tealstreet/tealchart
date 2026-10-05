import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { checkSemanticTypeInvariants } from '../../src/semantic/semanticTypeInvariants';

const sources = [
  { kind: 'float', qualifier: 'const', expression: '1.5' },
  { kind: 'float', qualifier: 'input', expression: 'input.float(1.5)' },
  { kind: 'float', qualifier: 'simple', expression: 'syminfo.mintick' },
  { kind: 'float', qualifier: 'series', expression: 'close' },
  { kind: 'int', qualifier: 'const', expression: '2' },
  { kind: 'int', qualifier: 'input', expression: 'input.int(2)' },
  { kind: 'int', qualifier: 'simple', expression: 'syminfo.pricescale' },
  { kind: 'int', qualifier: 'series', expression: 'bar_index' },
  { kind: 'color', qualifier: 'const', expression: 'color.red' },
  { kind: 'color', qualifier: 'input', expression: 'input.color(color.red)' },
  { kind: 'color', qualifier: 'simple', expression: 'color.new(color.red, int(syminfo.mintick))' },
  { kind: 'color', qualifier: 'series', expression: 'bar_index % 2 == 0 ? color.red : color.green' },
] as const;

// Pine v6 reference functions 211–213 admit each source below and return series.
describe('ledger fixnan source and return overloads', () => {
  for (const source of sources) {
    for (const named of [false, true]) {
      it(`returns series ${source.kind} for ${source.qualifier} source (${named ? 'named' : 'positional'})`, () => {
        const program = parse(`//@version=6
indicator("fixnan overload")
source = ${source.expression}
fixed = fixnan(${named ? 'source=' : ''}source)
`);
        const result = checkProgram(program);
        expect(checkSemanticTypeInvariants(program, result)).toEqual([]);
        expect(result.diagnostics).toEqual([]);
        const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));
        expect(types.get('source')).toMatchObject({ kind: source.kind, qualifier: source.qualifier });
        expect(types.get('fixed')).toMatchObject({ kind: source.kind, qualifier: 'series' });
      });
    }
  }
});
