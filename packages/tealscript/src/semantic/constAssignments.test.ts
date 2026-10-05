import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

function errors(body: string) {
  return checkProgram(parse(`//@version=6\nindicator("const lifetime")\n${body}\n`)).diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error',
  );
}

describe('explicit const assignment lifetime', () => {
  it.each([
    ['int', '1', '2'],
    ['float', '1.5', '2.5'],
    ['bool', 'true', 'false'],
    ['string', '"first"', '"second"'],
    ['color', 'color.red', 'color.blue'],
  ])('rejects reassignment of const %s even with a constant replacement', (type, initial, replacement) => {
    expect(errors(`const ${type} value = ${initial}\nvalue := ${replacement}`)).toEqual([
      expect.objectContaining({ code: 'const-reassignment' }),
    ]);
  });

  it.each(['+=', '-=', '*=', '/=', '%='])('rejects %s on an explicit const int', (operator) => {
    expect(errors(`const int value = 4\nvalue ${operator} 2`)).toEqual([
      expect.objectContaining({ code: 'const-reassignment' }),
    ]);
  });

  it('rejects string compound reassignment', () => {
    expect(errors('const string value = "a"\nvalue += "b"')).toEqual([
      expect.objectContaining({ code: 'const-reassignment' }),
    ]);
  });

  it('rejects a conditional block replacement', () => {
    expect(errors('const int value = 1\nvalue := if true\n    2\nelse\n    3')).toEqual([
      expect.objectContaining({ code: 'const-reassignment' }),
    ]);
  });

  it('rejects reassignment from a nested scope', () => {
    expect(errors('const int value = 1\nif bar_index > 0\n    value := 2')).toEqual([
      expect.objectContaining({ code: 'const-reassignment' }),
    ]);
  });

  it('rejects reassignment of a function-local const', () => {
    expect(errors('f() =>\n    const int value = 1\n    value += 2\n    value\nplot(f())')).toEqual([
      expect.objectContaining({ code: 'const-reassignment' }),
    ]);
  });

  it.each(['value = 1', 'int value = 1', 'var int value = 1', 'series int value = 1'])(
    'preserves mutable declarations: %s',
    (declaration) => {
      expect(errors(`${declaration}\nvalue := 2\nvalue += 3\nplot(value)`)).toEqual([]);
    },
  );

  it('allows a mutable local to shadow an outer const', () => {
    expect(errors('const int value = 1\nif bar_index > 0\n    int value = 2\n    value += 1\nplot(value)')).toEqual([]);
  });

  it('does not let an inner const make the outer mutable variable read-only', () => {
    expect(errors('int value = 1\nif bar_index > 0\n    const int value = 2\nvalue := 3\nplot(value)')).toEqual([]);
  });

  it('accepts compile-time scalar dependencies throughout the script', () => {
    expect(errors('const int first = 2\nconst int second = first * 3\nplot(second)')).toEqual([]);
  });
});
