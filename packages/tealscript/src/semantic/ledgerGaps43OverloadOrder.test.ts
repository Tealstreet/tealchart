import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const errors = (body: string) =>
  checkProgram(parse(`//@version=6\nindicator("Overload definition order")\n${body}\n`)).diagnostics.filter(
    (d) => d.severity === 'error',
  );
describe('ledger gaps43 same-name overload order', () => {
  it('1689 refuses a call to a later distinct-arity overload from its namesake', () => {
    expect(errors('f(int x,int y)=>f(x)+y\nf(int x)=>x+1\nplot(f(2,5))')).toContainEqual(
      expect.objectContaining({ code: 'function-overload-order' }),
    );
  });
  it('1689 permits a call to an earlier distinct-arity overload', () => {
    expect(errors('f(int x)=>x+1\nf(int x,int y)=>f(x)+y\nplot(f(2,5))')).toEqual([]);
  });
  it('1689 refuses a later same-arity type-selected overload', () => {
    expect(errors('f(int x)=>f("text")+x\nf(string x)=>str.length(x)\nplot(f(2))')).toContainEqual(
      expect.objectContaining({ code: 'function-overload-order' }),
    );
  });
  it('1689 permits an earlier same-arity type-selected overload', () => {
    expect(errors('f(string x)=>str.length(x)\nf(int x)=>f("text")+x\nplot(f(2))')).toEqual([]);
  });
  it('preserves ordinary differently named forward function calls', () => {
    expect(errors('f(int x)=>g(x)\ng(int x)=>x+1\nplot(f(2))')).toEqual([]);
  });
});
