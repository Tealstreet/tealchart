import type { AssignmentStatement, CallExpression, FunctionDeclaration, VariableDeclaration } from '../parser/ast';

import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

// Per-call metadata keeps the captured const/series distinction in shared UDF bodies.
describe('additive operand call contexts', () => {
  for (const version of [5, 6]) {
    for (const nested of [false, true]) {
      it(`records const and series assignment operands independently in v${version}, nested=${nested}`, () => {
        const ast = parse(`//@version=${version}
indicator("Additive contexts")
add(s, r) =>
    float x = 1e16
    x += s - r
    x
wrap(s, r) => add(s, r)
c = ${nested ? 'wrap' : 'add'}(-1e16, -1.0)
s = ${nested ? 'wrap' : 'add'}(bar_index % 2 == 0 ? -1e16 : 1e16, -1.0)
plot(c)
plot(s)
`);
        const checked = checkProgram(ast, { recordCallTypeContexts: true });
        expect(checked.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
        const add = ast.body.find(
          (item) => item.type === 'FunctionDeclaration' && item.name.name === 'add',
        ) as FunctionDeclaration;
        const assignment = (add.body as AssignmentStatement[]).find((item) => item.type === 'AssignmentStatement')!;
        const wrap = ast.body.find(
          (item) => item.type === 'FunctionDeclaration' && item.name.name === 'wrap',
        ) as FunctionDeclaration;
        for (const [name, qualifier] of [
          ['c', 'const'],
          ['s', 'series'],
        ] as const) {
          const variable = ast.body.find(
            (item) =>
              item.type === 'VariableDeclaration' &&
              item.names.type === 'VariableDeclarator' &&
              item.names.name.name === name,
          ) as VariableDeclaration;
          let context = checked.callTypeContexts?.get(variable.init as CallExpression);
          if (nested) context = context?.callTypeContexts.get(wrap.body as CallExpression);
          if (assignment.right.type !== 'BinaryExpression') throw new Error('Missing subtraction RHS');
          expect(context?.expressionTypes.get(assignment.right), name).toEqual({ kind: 'float', qualifier });
        }
      });
    }
  }
});
