import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

const check = (body: string) =>
  checkProgram(
    parse(`//@version=6
indicator("UDT reference qualifier")
type Reading
    float price = 7.25
${body}`),
  );

describe('UDT IDs retain series qualification', () => {
  it.each([
    'object = Reading.new()',
    'object = Reading.new(7.25)',
    'Reading object = Reading.new(7.25)',
    'var Reading object = Reading.new(7.25)',
    'Reading object = na',
  ])('retains reference metadata for %s', (declaration) => {
    const checked = check(declaration);
    expect(checked.diagnostics).toEqual([]);
    expect(checked.symbols.find((symbol) => symbol.name === 'object')?.type).toEqual({
      kind: 'udt',
      name: 'Reading',
      qualifier: 'series',
    });
  });

  it('retains series qualification across an alias and typed UDF return', () => {
    const checked = check(`identity(Reading value) => value
object = Reading.new(7.25)
alias = object
returned = identity(alias)`);
    expect(checked.diagnostics).toEqual([]);
    for (const name of ['object', 'alias', 'returned']) {
      expect(checked.symbols.find((symbol) => symbol.name === name)?.type).toEqual({
        kind: 'udt',
        name: 'Reading',
        qualifier: 'series',
      });
    }
  });

  it('retains a series reference and a series scalar field across tuple return', () => {
    const checked = check(`pair(Reading value) => [value, value.price]
object = Reading.new(7.25)
[reference, price] = pair(object)
const float literal = 7.25`);
    expect(checked.diagnostics).toEqual([]);
    expect(checked.symbols.find((symbol) => symbol.name === 'reference')?.type).toEqual({
      kind: 'udt',
      name: 'Reading',
      qualifier: 'series',
    });
    expect(checked.symbols.find((symbol) => symbol.name === 'price')?.type).toEqual({
      kind: 'float',
      qualifier: 'series',
    });
    expect(checked.symbols.find((symbol) => symbol.name === 'literal')?.type).toEqual({
      kind: 'float',
      qualifier: 'const',
    });
  });

  it('retains series scalar field metadata on a literal-created object', () => {
    const checked = check('object = Reading.new(7.25)\nprice = object.price');
    expect(checked.diagnostics).toEqual([]);
    expect(checked.symbols.find((symbol) => symbol.name === 'price')?.type).toEqual({
      kind: 'float',
      qualifier: 'series',
    });
  });

  it('cannot weaken a constructed reference to simple', () => {
    const checked = check('simple Reading object = Reading.new(7.25)');
    expect(checked.diagnostics).toContainEqual(
      expect.objectContaining({ severity: 'error', code: 'qualifier-mismatch' }),
    );
  });
});
