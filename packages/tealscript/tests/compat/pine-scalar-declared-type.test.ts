import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

for (const [kind, matching, incompatible] of [
  ['int', '7', '"bad"'],
  ['float', '1.25', '"bad"'],
  ['bool', 'true', '"bad"'],
  ['string', '"ok"', '7'],
  ['color', '#112233', '7'],
] as const) {
  it(`accepts a matching ${kind} initializer and retains the declared kind`, () => {
    const result = checkProgram(
      parse(`//@version=6
indicator("Matching initializer")
sourceValue = ${matching}
${kind} declaredValue = sourceValue`),
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'declaredValue')?.type?.kind).toBe(kind);
  });

  it(`refuses an incompatible ${kind} initializer`, () => {
    const result = checkProgram(
      parse(`//@version=6
indicator("Incompatible initializer")
sourceValue = ${incompatible}
${kind} declaredValue = sourceValue`),
    );
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(['type-mismatch']);
  });
}

it('widens an integer initializer to a declared float without weakening an integer declaration', () => {
  const accepted = checkProgram(
    parse(`//@version=6
indicator("Numeric widening")
integerValue = 7
float declaredValue = integerValue`),
  );
  expect(accepted.diagnostics).toEqual([]);
  expect(accepted.symbols.find((symbol) => symbol.name === 'declaredValue')?.type?.kind).toBe('float');

  const refused = checkProgram(
    parse(`//@version=6
indicator("Fractional initializer")
int declaredValue = 1.25`),
  );
  expect(refused.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(['type-mismatch']);
});
