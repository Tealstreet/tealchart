import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

describe('matrix predicate qualifier floor root v1', () => {
  for (const member of ['is_zero', 'is_identity', 'is_binary', 'is_symmetric', 'is_antisymmetric', 'is_diagonal', 'is_antidiagonal', 'is_triangular', 'is_stochastic', 'is_square']) {
    for (const form of ['namespace', 'receiver']) {
      for (const qualifier of ['const', 'simple', 'series']) {
        it(`${member} ${form} ${qualifier}`, () => {
          const call = form === 'namespace' ? `matrix.${member}(m)` : `m.${member}()`;
          const source = `//@version=6\nindicator("Predicate floor witness")\nm=matrix.new<float>(2,2,1.0)\n${qualifier} bool x=${call}\nplot(x?1:0)`;
          const errors = checkProgram(parse(source)).diagnostics.filter(d => d.severity === 'error');
          if (qualifier === 'series') expect(errors).toEqual([]);
          else expect(errors.some(d => d.code === 'qualifier-mismatch')).toBe(true);
        });
      }
    }
  }
});


describe('custom matrix predicate methods retain declared returns v1', () => {
  for (const member of ['is_identity', 'is_symmetric', 'is_square']) {
    it(member, () => {
      const source = `//@version=6\nindicator("Custom predicate control")\nmethod ${member}(matrix<float> m) => "custom"\nm=matrix.new<float>(2,2,1.0)\nstring result=m.${member}()\nplot(str.length(result))`;
      expect(checkProgram(parse(source)).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    });
  }
});
