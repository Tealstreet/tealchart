import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

describe('map contains documented series floor v1', () => {
  for (const version of [5, 6]) {
    for (const member of ['contains', 'size']) {
      for (const form of ['namespace', 'receiver']) {
        for (const qualifier of ['const', 'simple', 'series']) {
          it(`${version} ${member} ${form} ${qualifier}`, () => {
            const arg = member === 'contains' ? form === 'namespace' ? ', "k"' : '"k"' : '';
            const call = form === 'namespace' ? `map.${member}(m${arg})` : `m.${member}(${arg})`;
            const kind = member === 'contains' ? 'bool' : 'int';
            const source = `//@version=${version}\nindicator("Map floor witness")\nm=map.new<string,int>()\n${qualifier} ${kind} x=${call}\nplot(1)`;
            const errors = checkProgram(parse(source)).diagnostics.filter(d => d.severity === 'error');
            if (qualifier === 'series') expect(errors).toEqual([]);
            else expect(errors.some(d => d.code === 'qualifier-mismatch')).toBe(true);
          });
        }
      }
    }
  }
  it('custom contains retains its declared string result', () => {
    const source = '//@version=6\nindicator("Custom contains")\nmethod contains(map<string,int> m, string key) => "custom"\nm=map.new<string,int>()\nstring x=m.contains("k")\nplot(str.length(x))';
    expect(checkProgram(parse(source)).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  });
});
