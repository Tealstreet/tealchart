import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const diagnostics = (body: string) =>
  checkProgram(parse(`//@version=6\nindicator("Overload clauses")\n${body}\n`)).diagnostics;
describe('ledger gaps43 overload validity', () => {
  it.each([
    ['1687 optional arity', 'f(int x)=>x\nf(int x,int y=1)=>x+y'],
    ['1687 optional type', 'f(int x,float y=1)=>x+y\nf(int x,string label="x")=>x'],
    ['1688 different names', 'f(int x)=>x\nf(int y)=>y+1'],
  ])('%s does not distinguish required signature', (_, body) => {
    expect(diagnostics(body + '\nplot(1)')).toContainEqual(
      expect.objectContaining({ code: 'invalid-overload', severity: 'error' }),
    );
  });
  it('1686 required arity distinguishes overloads', () => {
    expect(
      diagnostics('f(int x)=>x\nf(int x,int y)=>x+y\nplot(f(1))\nplot(f(1,2))').filter((d) => d.severity === 'error'),
    ).toEqual([]);
  });
  it('1686 required parameter kind distinguishes overloads', () => {
    expect(
      diagnostics('f(int x)=>x\nf(string x)=>str.length(x)\nplot(f(1))\nplot(f("abcd"))').filter(
        (d) => d.severity === 'error',
      ),
    ).toEqual([]);
  });
});
