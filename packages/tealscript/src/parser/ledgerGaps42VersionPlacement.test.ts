import { expect, it } from 'vitest';

import { parse } from './parser';

it('keeps a non-leading version annotation and indicator declaration (1650/1652)', () => {
  const program = parse('indicator("Late version")\nplot(1)\n//@version=5');
  expect(program.version).toBe(5);
  expect(program.explicitVersion).toBe(true);
  expect(program.body.map((statement) => statement.type)).toEqual(['IndicatorDeclaration', 'ExpressionStatement']);
});
