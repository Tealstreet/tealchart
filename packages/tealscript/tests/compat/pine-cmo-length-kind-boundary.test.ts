import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

const check = (body: string) => checkProgram(parse(`//@version=6\nindicator("CMO integer length")\n${body}`));
const declarations = [
  ['const', 'const float length = 2.0', 'const int length = 2'],
  ['input', 'length = input.float(2.0)', 'length = input.int(2)'],
  ['simple', 'simple float length = 2.0', 'simple int length = 2'],
  ['series', 'series float length = close', 'series int length = bar_index % 2 + 1'],
] as const;

describe('CMO v6 length is integer at every admitted qualifier', () => {
  for (const named of [false, true]) {
    const call = named ? 'ta.cmo(length=length, series=-17.25)' : 'ta.cmo(-17.25, length)';
    for (const [qualifier, floatDeclaration, intDeclaration] of declarations) {
      it(`refuses ${qualifier} float length with ${named ? 'named' : 'positional'} binding`, () => {
        const checked = check(`${floatDeclaration}\nvalue = ${call}\nplot(value)`);
        expect(checked.diagnostics).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              code: 'type-mismatch',
              message: expect.stringContaining('length must be an integer'),
            }),
          ]),
        );
      });

      it(`admits ${qualifier} integer length and retains a float source/result`, () => {
        const checked = check(`${intDeclaration}\nvalue = ${call}\nplot(value)`);
        expect(checked.diagnostics).toEqual([]);
        expect(checked.symbols.find((symbol) => symbol.name === 'value')?.type).toEqual({
          kind: 'float',
          qualifier: 'series',
        });
      });
    }
    it(`admits an explicit integer cast with ${named ? 'named' : 'positional'} binding`, () => {
      const checked = check(`simple float rawLength = 2.0\nlength = int(rawLength)\nvalue = ${call}\nplot(value)`);
      expect(checked.diagnostics).toEqual([]);
    });
  }
});
