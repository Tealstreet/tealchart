import type { Expression, VariableDeclaration } from '../parser/ast';
import type { SemanticType } from './checker';

import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const calls = [
  'array.binary_search(values, 3)',
  'array.binary_search(val=3, id=values)',
  'values.binary_search(3)',
  'values.copy().binary_search(val=3)',
];

function check(body: string, version: number) {
  const program = parse(`//@version=${version}\nindicator("Binary search types")\n${body}`);
  const expressionTypes = new WeakMap<Expression, SemanticType>();
  const checked = checkProgram(program, { expressionTypes });
  const declaration = program.body.at(-1) as VariableDeclaration;
  const init = declaration.init;
  if (!init || init.type === 'IfStatement') throw new Error('Expected a binary search call expression');
  return {
    errors: checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
    resultType: expressionTypes.get(init),
  };
}

describe('array binary search result qualifiers', () => {
  for (const version of [5, 6]) {
    for (const kind of ['int', 'float'] as const) {
      const values = kind === 'int' ? '1, 3, 7' : '1.0, 3.0, 7.75';
      const setup = `values = array.from(${values})`;

      it.each(calls)(`v${version} ${kind} returns a series integer index for %s`, (call) => {
        const checked = check(`${setup}\nresult = ${call}`, version);
        expect(checked.errors).toEqual([]);
        expect(checked.resultType).toEqual({ kind: 'int', qualifier: 'series' });
      });

      for (const qualifier of ['const', 'simple']) {
        it.each(calls)(`v${version} ${kind} refuses ${qualifier} destinations for %s`, (call) => {
          const checked = check(`${setup}\n${qualifier} int result = ${call}`, version);
          expect(checked.errors).toEqual(
            expect.arrayContaining([expect.objectContaining({ code: 'qualifier-mismatch' })]),
          );
        });
      }

      const method = `method binary_search(array<${kind}> self, int val) => "custom"`;
      it(`v${version} ${kind} preserves the selected custom method's string result`, () => {
        const checked = check(`${method}\n${setup}\nconst string result = values.binary_search(3)`, version);
        expect(checked.errors).toEqual([]);
        expect(checked.resultType).toEqual({ kind: 'string', qualifier: 'const' });
      });

      it(`v${version} ${kind} keeps explicit namespace binary_search builtin despite a custom method`, () => {
        const checked = check(`${method}\n${setup}\nresult = array.binary_search(values, 3)`, version);
        expect(checked.errors).toEqual([]);
        expect(checked.resultType).toEqual({ kind: 'int', qualifier: 'series' });
      });
    }
  }
});
