import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

describe('map value series provenance v1', () => {
  for (const version of [5, 6]) {
    for (const dynamic of [false, true]) {
      for (const method of ['get', 'put', 'remove']) {
        for (const form of ['namespace', 'receiver']) {
          for (const qualifier of ['const', 'simple', 'series']) {
            it(`${version} ${dynamic ? 'dynamic' : 'static'} ${method} ${form} ${qualifier}`, () => {
              const seed = dynamic ? 'int(close)' : '7';
              const tail = method === 'put' ? ', 9' : '';
              const call = form === 'namespace' ? `map.${method}(m, "k"${tail})` : `m.${method}("k"${tail})`;
              const source = `//@version=${version}\nindicator("Map value floor")\nm=map.new<string,int>()\nmap.put(m, "k", ${seed})\n${qualifier} int x=${call}\nplot(1)`;
              const errors = checkProgram(parse(source)).diagnostics.filter(d => d.severity === 'error');
              if ((version === 6 || dynamic) && qualifier !== 'series') {
                expect(errors.some(d => d.code === 'qualifier-mismatch')).toBe(true);
              } else expect(errors).toEqual([]);
            });
          }
        }
      }
    }
    for (const method of ['get', 'put', 'remove']) {
      it(`${version} custom ${method} keeps string result`, () => {
        const parameter = method === 'put' ? ', int value' : '';
        const argument = method === 'put' ? ', int(close)' : '';
        const source = `//@version=${version}\nindicator("Custom map method")\nmethod ${method}(map<string,int> m, string key${parameter}) => "custom"\nm=map.new<string,int>()\nstring x=m.${method}("k"${argument})\nplot(str.length(x))`;
        expect(checkProgram(parse(source)).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
      });
    }
  }
  for (const path of ['alias', 'typed alias', 'copy', 'put_all']) {
    it(`v5 series seed survives ${path}`, () => {
      const transfer = path === 'alias' ? 'a=m' : path === 'typed alias' ? 'map<string,int> a=m' : path === 'copy' ? 'a=map.copy(m)' : 'a=map.new<string,int>()\nmap.put_all(a,m)';
      const source = `//@version=5\nindicator("Map transfer")\nm=map.new<string,int>()\nmap.put(m,"k",int(close))\n${transfer}\nsimple int x=map.get(a,"k")\nplot(1)`;
      expect(checkProgram(parse(source)).diagnostics.some(d => d.code === 'qualifier-mismatch')).toBe(true);
    });
  }
  it('v5 independent copy before series seed stays static', () => {
    const source = '//@version=5\nindicator("Map copy isolation")\nm=map.new<string,int>()\nmap.put(m,"k",7)\na=map.copy(m)\nmap.put(m,"k",int(close))\nsimple int x=map.get(a,"k")\nplot(1)';
    expect(checkProgram(parse(source)).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  });

  for (const dynamic of [false, true]) {
    for (const returnsMap of [false, true]) {
      it(`v5 UDF write ${dynamic ? 'series' : 'static'} ${returnsMap ? 'map return' : 'value return'}`, () => {
        const body = returnsMap ? '    map.put(m,"k",value)\n    m' : '    map.put(m,"k",value)';
        const seed = dynamic ? 'int(close)' : '7';
        const source = `//@version=5\nindicator("Map UDF seed")\nseed(map<string,int> m, int value) =>\n${body}\nm=map.new<string,int>()\nseed(m,${seed})\nsimple int x=map.get(m,"k")\nplot(1)`;
        const errors = checkProgram(parse(source)).diagnostics.filter(d => d.severity === 'error');
        if (dynamic) expect(errors.some(d => d.code === 'qualifier-mismatch')).toBe(true);
        else expect(errors).toEqual([]);
      });
    }
  }

});
