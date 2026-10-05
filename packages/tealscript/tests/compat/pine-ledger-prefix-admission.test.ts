import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Both documented syminfo.prefix overloads admit string symbols only.
describe('ledger syminfo.prefix symbol admission', () => {
  for (const source of ['2', '2.5', 'true']) {
    for (const named of [false, true]) {
      it(`refuses ${source} as a symbol (${named ? 'named' : 'positional'})`, () => {
        const result = checkProgram(parse(`//@version=6
indicator("prefix admission")
prefix = syminfo.prefix(${named ? 'symbol=' : ''}${source})
`));
        expect(result.diagnostics).toContainEqual(expect.objectContaining({
          code: 'type-mismatch',
          message: expect.stringMatching(/^syminfo\.prefix symbol must be a string, got /),
        }));
      });
    }
  }
});
