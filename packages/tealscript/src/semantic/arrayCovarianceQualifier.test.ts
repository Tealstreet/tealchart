import type { Expression, VariableDeclaration } from '../parser/ast';
import type { SemanticType } from './checker';

import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const calls = [
  'array.covariance(values, other)',
  'array.covariance(id2=other, id1=values)',
  'values.covariance(other)',
  'values.copy().covariance(id2=other)',
];

function check(body: string, version: number) {
  const program = parse(`//@version=${version}\nindicator("Covariance types")\n${body}`);
  const expressionTypes = new WeakMap<Expression, SemanticType>();
  const checked = checkProgram(program, { expressionTypes });
  const errors = checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  const declaration = program.body.at(-1) as VariableDeclaration;
  const init = declaration.init;
  if (!init || init.type === 'IfStatement') throw new Error('Expected a covariance call expression');
  return { errors, resultType: expressionTypes.get(init) };
}

describe('array covariance result qualifiers', () => {
  for (const version of [5, 6]) {
    it.each(calls)(`v${version} infers a series float for %s`, (call) => {
      const checked = check(
        `values = array.from(-8.5, 5.25, 17.75)\nother = array.from(1.0, 4.0, 9.0)\nresult = ${call}`,
        version,
      );
      expect(checked.errors).toEqual([]);
      expect(checked.resultType).toEqual({ kind: 'float', qualifier: 'series' });
    });

    for (const qualifier of ['const', 'simple']) {
      it.each(calls)(`v${version} refuses ${qualifier} destinations for %s`, (call) => {
        const checked = check(
          `values = array.from(-8.5, 5.25, 17.75)\nother = array.from(1.0, 4.0, 9.0)\n${qualifier} float result = ${call}`,
          version,
        );
        expect(checked.errors).toEqual(
          expect.arrayContaining([expect.objectContaining({ code: 'qualifier-mismatch' })]),
        );
      });
    }

    it(`v${version} preserves the selected custom method's scalar result`, () => {
      const checked = check(
        `method covariance(array<float> self, array<float> other) => "custom"
values = array.from(-8.5, 5.25, 17.75)
other = array.from(1.0, 4.0, 9.0)
const string result = values.covariance(other)`,
        version,
      );
      expect(checked.errors).toEqual([]);
      expect(checked.resultType).toEqual({ kind: 'string', qualifier: 'const' });
    });

    it(`v${version} keeps namespace calls builtin when a receiver method overrides covariance`, () => {
      const checked = check(
        `method covariance(array<float> self, array<float> other) => "custom"
values = array.from(-8.5, 5.25, 17.75)
other = array.from(1.0, 4.0, 9.0)
result = array.covariance(values, other)`,
        version,
      );
      expect(checked.errors).toEqual([]);
      expect(checked.resultType).toEqual({ kind: 'float', qualifier: 'series' });
    });
  }
});
