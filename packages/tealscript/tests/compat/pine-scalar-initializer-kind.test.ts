import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

for (const [kind, initializer] of [
  ['int', '7'],
  ['float', '1.25'],
  ['bool', 'true'],
  ['string', '"ok"'],
  ['color', '#112233'],
] as const) {
  it(`infers ${kind} from an untyped initializer, alias and function return`, () => {
    const result = checkProgram(
      parse(`//@version=6
indicator("Initializer kinds")
make() => ${initializer}
firstValue = ${initializer}
aliasValue = firstValue
callValue = make()`),
    );
    expect(result.diagnostics).toEqual([]);
    for (const name of ['firstValue', 'aliasValue', 'callValue']) {
      expect(result.symbols.find((symbol) => symbol.name === name)?.type?.kind).toBe(kind);
    }
  });
}

it('infers a float from an untyped expression mixing integer and float operands', () => {
  const result = checkProgram(
    parse(`//@version=6
indicator("Expression initializer")
integerValue = 7
fractionalValue = 1.25
combinedValue = integerValue + fractionalValue`),
  );
  expect(result.diagnostics).toEqual([]);
  expect(result.symbols.find((symbol) => symbol.name === 'combinedValue')?.type?.kind).toBe('float');
});
