import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const lengths = [
  { kind: 'int', qualifier: 'const', expression: '2' },
  { kind: 'int', qualifier: 'input', expression: 'input.int(2)' },
  { kind: 'int', qualifier: 'simple', expression: 'syminfo.pricescale' },
  { kind: 'int', qualifier: 'series', expression: 'bar_index + 2' },
  { kind: 'float', qualifier: 'const', expression: '2.0' },
  { kind: 'float', qualifier: 'input', expression: 'input.float(2.0)' },
  { kind: 'float', qualifier: 'simple', expression: 'syminfo.mintick' },
  { kind: 'float', qualifier: 'series', expression: 'close' },
] as const;
const bindings = ['length', 'length=length', 'close, length', 'length=length, source=close'];

// Reference functions 183–184 require int length, admitting qualifiers through series.
describe('ledger extrema offset length kinds', () => {
  for (const version of [5, 6]) {
    for (const name of ['ta.highestbars', 'ta.lowestbars']) {
      for (const length of lengths) {
        for (const binding of bindings) {
          it(`${name} ${version} ${length.qualifier} ${length.kind} length via ${binding}`, () => {
            const result = checkProgram(parse(`//@version=${version}
indicator("offset length")
length = ${length.expression}
offset = ${name}(${binding})
`));
            expect(result.symbols.find((symbol) => symbol.name === 'length')?.type).toMatchObject({
              kind: length.kind, qualifier: length.qualifier,
            });
            if (length.kind === 'int') {
              expect(result.diagnostics).toEqual([]);
              expect(result.symbols.find((symbol) => symbol.name === 'offset')?.type).toMatchObject({
                kind: 'int', qualifier: 'series',
              });
            } else {
              expect(result.diagnostics).toContainEqual(expect.objectContaining({
                code: 'type-mismatch',
                message: `${name} length must be an integer, got float`,
              }));
            }
          });
        }
      }
    }
  }
});
