import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

function diagnostics(body: string) {
  return checkProgram(parse(`//@version=6\nindicator("ranked collection argument kinds")\n${body}\n`)).diagnostics;
}

// The ranked ID parameters require the specified collection; unknown/typed-na
// references are outside these definite scalar/foreign-kind refusals.
describe('ranked collection batch 3 required collection IDs', () => {
  for (const named of [false, true]) {
    for (const [name, setup, id] of [
      ['scalar', '', '17'],
      ['matrix', 'foreign = matrix.new<int>(1, 1, 7)', 'foreign'],
    ]) {
      it(`array.set refuses a ${name} ID through ${named ? 'named' : 'positional'} binding`, () => {
        const call = named ? `array.set(value=29, id=${id}, index=0)` : `array.set(${id}, 0, 29)`;
        expect(
          diagnostics(`${setup}\n${call}`).some(
            (diagnostic) => diagnostic.severity === 'error' && diagnostic.code === 'type-mismatch',
          ),
        ).toBe(true);
      });
      it(`array.shift refuses a ${name} ID through ${named ? 'named' : 'positional'} binding`, () => {
        const call = named ? `array.shift(id=${id})` : `array.shift(${id})`;
        expect(
          diagnostics(`${setup}\nremoved = ${call}`).some(
            (diagnostic) => diagnostic.severity === 'error' && diagnostic.code === 'type-mismatch',
          ),
        ).toBe(true);
      });
    }
    for (const [name, setup, id] of [
      ['scalar', '', '17'],
      ['array', 'foreign = array.new<int>(1, 7)', 'foreign'],
    ]) {
      it(`matrix.get refuses a ${name} ID through ${named ? 'named' : 'positional'} binding`, () => {
        const call = named ? `matrix.get(column=0, id=${id}, row=0)` : `matrix.get(${id}, 0, 0)`;
        expect(
          diagnostics(`${setup}\nselected = ${call}`).some(
            (diagnostic) => diagnostic.severity === 'error' && diagnostic.code === 'type-mismatch',
          ),
        ).toBe(true);
      });
    }
  }
});

describe('ranked collection batch 3 float element seeds', () => {
  for (const constructor of ['array.new<float>', 'array.new_float']) {
    for (const named of [false, true]) {
      for (const [kind, value] of [
        ['string', '"wrong"'],
        ['bool', 'true'],
      ]) {
        it(`${constructor} refuses a ${kind} seed through ${named ? 'named' : 'positional'} binding`, () => {
          const args = named ? `initial_value=${value}, size=2` : `2, ${value}`;
          expect(
            diagnostics(`values = ${constructor}(${args})`).some(
              (diagnostic) => diagnostic.severity === 'error' && diagnostic.code === 'type-mismatch',
            ),
          ).toBe(true);
        });
      }
    }
  }
});
