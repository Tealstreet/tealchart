import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

describe('matrix numeric kind and series floor root v1', () => {
  for (const member of ['avg', 'median', 'mode', 'trace', 'det', 'min', 'max']) {
    for (const form of ['namespace', 'receiver']) {
      const call = form === 'namespace' ? `matrix.${member}(m)` : `m.${member}()`;
      for (const facet of ['int-admission', 'float-int-refusal', 'const-floor-refusal']) {
        it(`${member} ${form} ${facet}`, () => {
          const floating = facet === 'float-int-refusal';
          const source = `//@version=6\nindicator("Matrix kind witness")\nm=matrix.new<${floating ? 'float' : 'int'}>(1,1,${floating ? '2.5' : '2'})\n${facet === 'const-floor-refusal' ? 'const ' : ''}int x=${call}\nplot(x)`;
          const errors = checkProgram(parse(source)).diagnostics.filter(d => d.severity === 'error');
          if (facet === 'int-admission') expect(errors).toEqual([]);
          else expect(errors.some(d => d.code === (floating ? 'type-mismatch' : 'qualifier-mismatch'))).toBe(true);
        });
      }
    }
  }
});


describe('selected matrix scalar overload controls v1', () => {
  for (const member of ['det', 'min', 'max']) {
    for (const form of ['namespace', 'receiver']) {
      for (const kind of ['int', 'float']) {
        it(`${member} ${form} ${kind} explicit series result`, () => {
          const call = form === 'namespace' ? `matrix.${member}(m)` : `m.${member}()`;
          const source = `//@version=6\nindicator("Matrix series control")\nm=matrix.new<${kind}>(1,1,${kind === 'int' ? '2' : '2.5'})\nseries ${kind} x=${call}\nplot(x)`;
          expect(checkProgram(parse(source)).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
        });
      }
    }
    it(`${member} custom receiver method retains string result`, () => {
      const source = `//@version=6\nindicator("Custom method control")\nmethod ${member}(matrix<float> m) => "custom"\nm=matrix.new<float>(1,1,2.5)\nstring x=m.${member}()\nplot(str.length(x))`;
      expect(checkProgram(parse(source)).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    });
  }
});
