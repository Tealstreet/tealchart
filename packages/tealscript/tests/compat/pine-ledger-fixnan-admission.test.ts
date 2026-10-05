import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const rejectedSources = [
  { kind: 'string', expression: '"text"' },
  { kind: 'label', expression: 'label(na)' },
  { kind: 'array', expression: 'array.new_float(1, 1.0)' },
  { kind: 'matrix', expression: 'matrix.new<float>(1, 1, 1.0)' },
  { kind: 'map', expression: 'map.new<int, float>()' },
] as const;

// fixnan admits numeric/color sources; the v5 bool overload does not admit these.
describe('ledger fixnan source admission', () => {
  for (const version of [5, 6]) {
    for (const source of rejectedSources) {
      for (const named of [false, true]) {
        it(`rejects ${source.kind} source in v${version} (${named ? 'named' : 'positional'})`, () => {
          const result = checkProgram(parse(`//@version=${version}
indicator("fixnan admission")
source = ${source.expression}
fixed = fixnan(${named ? 'source=' : ''}source)
`));
          expect(result.symbols.find((symbol) => symbol.name === 'source')?.type?.kind).toBe(source.kind);
          expect(result.diagnostics).toContainEqual(expect.objectContaining({
            code: 'type-mismatch',
            message: expect.stringMatching(/^fixnan source .*got /),
          }));
        });
      }
    }
  }
});
