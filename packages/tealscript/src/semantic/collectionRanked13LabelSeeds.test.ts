import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const errors = (body: string) =>
  checkProgram(parse(`//@version=6\nindicator("Label seed contracts")\n${body}`)).diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error',
  );

describe('array.new_label supplied initial_value', () => {
  for (const named of [false, true]) {
    it.each(['"wrong"', '42', 'true', 'color.red'])(
      `refuses incompatible ${named ? 'named' : 'positional'} seed %s`,
      (seed) => {
        const args = named ? `initial_value=${seed}, size=2` : `2, ${seed}`;
        expect(errors(`a = array.new_label(${args})`)).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              code: 'type-mismatch',
              message: expect.stringContaining('initial_value must be label'),
            }),
          ]),
        );
      },
    );
    it('accepts a supplied series label and missing label', () => {
      const args = named ? 'initial_value=seed, size=bar_index + 1' : 'bar_index + 1, seed';
      expect(errors(`seed = label.new(bar_index, close)\na = array.new_label(${args})`)).toEqual([]);
      expect(errors('label seed = na\na = array.new_label(2, seed)')).toEqual([]);
      expect(errors('a = array.new_label(2, na)')).toEqual([]);
    });
  }
  it('preserves omitted seeds and float-array widening', () => {
    expect(errors('a = array.new_label()\nb = array.new_label(size=2)\nc = array.new_float(2, 1)')).toEqual([]);
  });
  // https://www.tradingview.com/pine-script-docs/language/variable-declarations/#shadowing
  it('refuses a UDT receiver named array and preserves a nonnamespace new_label method', () => {
    expect(
      errors(`type Holder
    int value
method new_label(Holder self, int size, string initial_value) => size
array = Holder.new(1)
a = array.new_label(2, "local")`),
    ).toEqual([
      expect.objectContaining({ code: 'namespace-obscuring', message: expect.stringContaining("variable 'array'") }),
    ]);
    expect(
      errors(`type Holder
    int value
method new_label(Holder self, int size, string initial_value) => size
holder = Holder.new(1)
a = holder.new_label(2, "local")`),
    ).toEqual([]);
  });
});
