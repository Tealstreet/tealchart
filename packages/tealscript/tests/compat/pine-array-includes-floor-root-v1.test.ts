import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

describe('array scalar qualifier controls v1', () => {
  for (const member of ['includes', 'sum', 'range', 'median', 'percentile_nearest_rank', 'percentrank', 'binary_search', 'indexof']) {
    for (const form of ['namespace', 'receiver']) {
      for (const qualifier of ['const', 'simple', 'series']) {
        it(`${member} ${form} ${qualifier}`, () => {
          const args = ['includes', 'binary_search', 'indexof'].includes(member) ? ', 1' : member === 'percentile_nearest_rank' ? ', 50' : member === 'percentrank' ? ', 0' : '';
          const call = form === 'namespace' ? `array.${member}(a${args})` : `a.${member}(${args.replace(/^, /, '')})`;
          const kind = member === 'includes' ? 'bool' : member === 'percentrank' ? 'float' : 'int';
          const source = `//@version=6\nindicator("Array floor witness")\na=array.from(1,2,3)\n${qualifier} ${kind} x=${call}\nplot(1)`;
          const errors = checkProgram(parse(source)).diagnostics.filter(d => d.severity === 'error');
          if (qualifier === 'series') expect(errors).toEqual([]);
          else expect(errors.some(d => d.code === 'qualifier-mismatch')).toBe(true);
        });
      }
    }
  }
  it('custom includes retains its string result', () => {
    const source = '//@version=6\nindicator("Custom includes")\nmethod includes(array<int> a, int value) => "custom"\na=array.from(1,2)\nstring result=a.includes(1)\nplot(str.length(result))';
    expect(checkProgram(parse(source)).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  });
});
