import { describe, expect, it } from 'vitest';
import { parse } from './parser';

describe('signed switch case boundaries', () => {
  it.each([5, 6])('keeps consecutive positive case arms separate in v%s', version => {
    const ast = parse(`//@version=${version}
indicator("signed cases")
x = switch bar_index
    +0 => 10
    +1 => 20
    -2 => 30
    => 40
plot(x)
`);
    const declaration = ast.body[1];
    expect(declaration.type).toBe('VariableDeclaration');
    if (declaration.type !== 'VariableDeclaration' || declaration.init.type !== 'SwitchExpression') throw new Error('expected switch');
    expect(declaration.init.cases).toHaveLength(4);
    expect(declaration.init.cases.slice(0, 3).map(c => c.test?.type)).toEqual(['UnaryExpression', 'UnaryExpression', 'UnaryExpression']);
  });

  it('keeps signed expression keys inside a UDF separate', () => {
    const ast = parse(`//@version=6
indicator("signed UDF cases")
f(int value) =>
    switch value
        +0 => 10
        +1 + 1 => 20
        => 30
plot(f(2))
`);
    const fn = ast.body[1];
    expect(fn.type).toBe('FunctionDeclaration');
    if (fn.type !== 'FunctionDeclaration' || !Array.isArray(fn.body)) throw new Error('expected function block');
    const statement = fn.body[0];
    expect(statement.type === 'ExpressionStatement' && statement.expression.type === 'SwitchExpression' && statement.expression.cases.length).toBe(3);
  });

  it('ignores arrows in strings and comments on arithmetic continuations', () => {
    const ast = parse(`//@version=6
indicator("arrows in text")
s = "prefix"
  + "=>suffix"
x = 1
  + 2 // => comment
plot(x)
`);
    for (const index of [1, 2]) {
      const declaration = ast.body[index];
      expect(declaration.type === 'VariableDeclaration' && declaration.init.type).toBe('BinaryExpression');
    }
  });

  it('preserves ordinary arithmetic plus continuations', () => {
    const ast = parse(`//@version=6
indicator("continuation")
x = 1
  + 2
plot(x)
`);
    const declaration = ast.body[1];
    expect(declaration.type === 'VariableDeclaration' && declaration.init.type).toBe('BinaryExpression');
  });
});
