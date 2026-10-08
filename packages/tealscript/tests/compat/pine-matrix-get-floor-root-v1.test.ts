import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

describe('matrix get qualifier root v1', () => {
  for (const kind of ['int', 'float']) {
    for (const form of ['namespace', 'receiver']) {
      for (const qualifier of ['const', 'simple', 'series']) {
        for (const dynamic of [false, true]) {
          it(`v6 ${kind} ${form} ${qualifier} ${dynamic ? 'dynamic' : 'static'}`, () => {
            const value = dynamic ? (kind === 'int' ? 'int(close)' : 'close') : (kind === 'int' ? '7' : '7.5');
            const call = form === 'namespace' ? 'matrix.get(m, 0, 0)' : 'm.get(0, 0)';
            const source = `//@version=6\nindicator("Matrix get floor")\nm=matrix.new<${kind}>(1,1,${value})\n${qualifier} ${kind} x=${call}\nplot(1)`;
            const errors = checkProgram(parse(source)).diagnostics.filter(d => d.severity === 'error');
            if (qualifier === 'series') expect(errors).toEqual([]);
            else expect(errors.some(d => d.code === 'qualifier-mismatch')).toBe(true);
          });
        }
        it(`v5 static ${kind} ${form} ${qualifier} unchanged`, () => {
          const call = form === 'namespace' ? 'matrix.get(m, 0, 0)' : 'm.get(0, 0)';
          const source = `//@version=5\nindicator("Legacy matrix get")\nm=matrix.new<${kind}>(1,1,7)\n${qualifier} ${kind} x=${call}\nplot(1)`;
          expect(checkProgram(parse(source)).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
        });
      }
    }
  }
  for (const version of [5, 6]) {
    it(`v${version} custom get string remains admitted`, () => {
      const source = `//@version=${version}\nindicator("Custom matrix get")\nmethod get(matrix<int> m, int row, int column) => "custom"\nm=matrix.new<int>(1,1,7)\nstring x=m.get(0,0)\nplot(1)`;
      expect(checkProgram(parse(source)).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    });
  }
});
