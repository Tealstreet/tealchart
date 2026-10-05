import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const errors = (body: string) =>
  checkProgram(parse(`//@version=6\nindicator("Global calls")\n${body}\n`)).diagnostics.filter(
    (d) => d.severity === 'error',
  );
const cases = [
  ['plot', 'plot(1)'],
  ['hline', 'hline(1)'],
  ['plotshape', 'plotshape(true)'],
  ['plotchar', 'plotchar(true)'],
  ['plotarrow', 'plotarrow(1)'],
  ['plotbar', 'plotbar(1,2,0,1)'],
  ['plotcandle', 'plotcandle(1,2,0,1)'],
  ['bgcolor', 'bgcolor(#123456)'],
  ['barcolor', 'barcolor(#123456)'],
];
describe('ledger gaps43 global-only builtins', () => {
  it.each(cases)('1694 refuses %s in a function', (_, call) => {
    expect(errors(`f()=>\n    ${call}\n    1\nplot(f())`)).toContainEqual(
      expect.objectContaining({ code: 'scope-mismatch' }),
    );
  });
  it.each(cases)('1694 permits %s in global scope', (_, call) => {
    expect(errors(call)).toEqual([]);
  });
  it('1694 refuses fill in a function with globally constructed plot IDs', () => {
    expect(errors('a=plot(1)\nb=plot(2)\nf()=>\n    fill(a,b)\n    1\nplot(f())')).toContainEqual(
      expect.objectContaining({ code: 'scope-mismatch' }),
    );
  });
  it('1694 preserves existing alertcondition scope refusal', () => {
    expect(errors('f()=>\n    alertcondition(true,title="x",message="y")\n    1\nplot(f())')).toContainEqual(
      expect.objectContaining({ code: 'scope-mismatch' }),
    );
  });
  it('1694 allows a shadowing user function named plot', () => {
    expect(errors('plot(int x)=>x+1\nf()=>plot(2)\nx=f()')).toEqual([]);
  });
});
