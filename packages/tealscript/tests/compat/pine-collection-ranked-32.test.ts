import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

function diagnostics(body: string) {
  return checkProgram(parse(`//@version=6\nindicator("Matrix predicate return qualifiers")\n${body}`)).diagnostics;
}

describe('collection ranks 1241-1280 matrix predicate qualifiers', () => {
  for (const member of ['is_antidiagonal', 'is_triangular']) {
    for (const element of ['int', 'float']) {
      for (const receiver of [false, true]) {
        const call = receiver ? `a.${member}()` : `matrix.${member}(a)`;
        const declaration = `a = matrix.new<${element}>(2, 2, 0)`;

        it(`${member} ${element} retains the series floor, receiver=${receiver}`, () => {
          expect(diagnostics(`${declaration}\nconst bool result = ${call}`).some(item => item.code === 'qualifier-mismatch')).toBe(true);
        });

        it(`${member} ${element} accepts a series bool, receiver=${receiver}`, () => {
          expect(diagnostics(`${declaration}\nseries bool result = ${call}`)).toEqual([]);
        });
      }
    }
  }

  it('preserves custom predicate method return inference', () => {
    expect(diagnostics('method is_triangular(matrix<int> id, string selector) => 7\na = matrix.new<int>(2, 2, 0)\nconst int result = a.is_triangular("custom")')).toEqual([]);
  });
});
