import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const predicates = ['is_stochastic', 'is_binary', 'is_diagonal', 'is_zero'] as const;
const header = `//@version=6
indicator("Matrix batch30 contracts")
m = matrix.new<float>(2, 2, 0.0)`;

describe('collection batch30 matrix predicate contracts', () => {
  for (const member of predicates) {
    for (const call of [`matrix.${member}(m)`, `matrix.${member}(id=m)`, `m.${member}()`]) {
      it(`${call} returns series bool`, () => {
        const result = checkProgram(parse(`${header}\nresult = ${call}`));
        expect(result.diagnostics).toEqual([]);
        expect(result.symbols.find((symbol) => symbol.name === 'result')?.type).toEqual({
          kind: 'bool',
          qualifier: 'series',
        });
        const input = checkProgram(parse(`${header}\nchosen = input.bool(${call})`));
        expect(input.diagnostics.map((diagnostic) => diagnostic.code)).toContain('qualifier-mismatch');
      });
    }
    it(`matrix.${member} requires the matrix ID`, () => {
      const result = checkProgram(parse(`${header}\nresult = matrix.${member}()`));
      expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('argument-count');
    });
  }

  it('matrix.sort cannot supply a scalar result', () => {
    const result = checkProgram(parse(`${header}\nresult = matrix.sort(m)`));
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('type-mismatch');
  });
});
