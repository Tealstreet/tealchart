import type { Expression, VariableDeclaration } from '../parser/ast';
import type { SemanticType } from './checker';

import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const calls = ['array.mode(values)', 'array.mode(id=values)', 'values.mode()', 'values.copy().mode()'];

function check(body: string, version: number) {
  const program = parse(`//@version=${version}\nindicator("Mode types")\n${body}`);
  const expressionTypes = new WeakMap<Expression, SemanticType>();
  const checked = checkProgram(program, { expressionTypes });
  const declaration = program.body.at(-1) as VariableDeclaration;
  const init = declaration.init;
  if (!init || init.type === 'IfStatement') throw new Error('Expected a mode call expression');
  return {
    errors: checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
    resultType: expressionTypes.get(init),
  };
}

describe('array mode result qualifiers', () => {
  for (const version of [5, 6]) {
    for (const kind of ['int', 'float'] as const) {
      const values = kind === 'int' ? '3, 3, 7' : '3.5, 3.5, 7.75';
      const setup = `values = array.from(${values})`;

      it.each(calls)(`v${version} ${kind} preserves element kind with a series result for %s`, (call) => {
        const checked = check(`${setup}\nresult = ${call}`, version);
        expect(checked.errors).toEqual([]);
        expect(checked.resultType).toEqual({ kind, qualifier: 'series' });
      });

      for (const qualifier of ['const', 'simple']) {
        it.each(calls)(`v${version} ${kind} refuses ${qualifier} destinations for %s`, (call) => {
          const checked = check(`${setup}\n${qualifier} ${kind} result = ${call}`, version);
          expect(checked.errors).toEqual(
            expect.arrayContaining([expect.objectContaining({ code: 'qualifier-mismatch' })]),
          );
        });
      }

      const method = `method mode(array<${kind}> self) => "custom"`;
      it(`v${version} ${kind} preserves the selected custom method's string result`, () => {
        const checked = check(`${method}\n${setup}\nconst string result = values.mode()`, version);
        expect(checked.errors).toEqual([]);
        expect(checked.resultType).toEqual({ kind: 'string', qualifier: 'const' });
      });

      it(`v${version} ${kind} keeps explicit namespace mode builtin despite a custom method`, () => {
        const checked = check(`${method}\n${setup}\nresult = array.mode(values)`, version);
        expect(checked.errors).toEqual([]);
        expect(checked.resultType).toEqual({ kind, qualifier: 'series' });
      });
    }
  }
});
