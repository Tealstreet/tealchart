import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const errors = (body: string) =>
  checkProgram(
    parse(`//@version=6\nindicator("Consistent return")\n${body}\nplot(f(bar_index > 0))`),
  ).diagnostics.filter((d) => d.severity === 'error');
describe('ledger gaps43 consistent function branch types', () => {
  it.each([
    ['ternary', 'f(bool flag)=>flag ? 1 : "x"'],
    ['if', 'f(bool flag)=>\n    if flag\n        1\n    else\n        "x"'],
    ['switch', 'f(bool flag)=>\n    switch\n        flag => 1\n        => "x"'],
    [
      'nested branch',
      'f(bool flag)=>\n    if flag\n        if flag\n            1\n        else\n            "x"\n    else\n        2',
    ],
  ])('1685 refuses mixed numeric/string %s results', (_, source) => {
    expect(errors(source)).toContainEqual(expect.objectContaining({ code: 'inconsistent-branch-types' }));
  });
  it.each([
    ['numeric widening', 'f(bool flag)=>flag ? 1 : 2.5'],
    ['NA alternate', 'f(bool flag)=>flag ? 1 : na'],
    ['same strings', 'f(bool flag)=>flag ? "a" : "b"'],
    ['bool result', 'f(bool flag)=>flag ? true : false'],
  ])('1685 permits %s control', (_, source) => {
    const result = checkProgram(
      parse(`//@version=6\nindicator("Consistent control")\n${source}\nx=f(bar_index > 0)\nplot(1)`),
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });
  it('permits differing earlier side-effect branches when final result is numeric', () => {
    expect(errors('f(bool flag)=>\n    if flag\n        1\n    else\n        "x"\n    2')).toEqual([]);
  });
});
