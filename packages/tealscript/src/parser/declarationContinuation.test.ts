import { expect, it } from 'vitest';
import { parse } from './parser';

it('continues a tuple declaration at its indented equals after blank lines', () => {
  const ast = parse(`//@version=6
indicator("blank before equals")
pair() => [1, 2]
[a,
 b]


  = pair()
plot(a + b)`);
  const declaration = ast.body.find(s => s.type === 'VariableDeclaration');
  expect(declaration?.type).toBe('VariableDeclaration');
  if (declaration?.type !== 'VariableDeclaration') throw new Error('Missing declaration');
  expect(declaration.names.type).toBe('TupleDeclarator');
  expect(declaration.init.type).toBe('CallExpression');
  expect(ast.body.at(-1)?.type).toBe('ExpressionStatement');
});

it('keeps separated declarations independent when the next statement is not an equals continuation', () => {
  const ast = parse(`//@version=6
indicator("separate declarations")
a = 1

b = 2
plot(a + b)`);
  expect(ast.body.filter(s => s.type === 'VariableDeclaration')).toHaveLength(2);
});
