import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const errors = (body: string) =>
  checkProgram(parse(`//@version=6\nindicator("Kron id2")\n${body}`)).diagnostics.filter((d) => d.severity === 'error');
const calls = ['matrix.kron(a,b)', 'matrix.kron(id2=b,id1=a)', 'a.kron(b)', 'a.kron(id2=b)'];

describe('ranked Kron second operand numeric admission', () => {
  it.each(['bool', 'string'].flatMap((kind) => calls.map((call) => ({ kind, call }))))(
    'refuses $kind through $call',
    ({ kind, call }) => {
      const diagnostics = errors(
        `a=matrix.new<int>(1,1,2)\nb=matrix.new<${kind}>(1,1,${kind === 'bool' ? 'true' : '"x"'})\nc=${call}\nplot(1)`,
      );
      expect(diagnostics.some((d) => d.message.includes('id2') && d.code === 'type-mismatch')).toBe(true);
    },
  );
  it.each(calls)('refuses scalar id2 through %s', (call) => {
    expect(
      errors(`a=matrix.new<int>(1,1,2)\nb=3\nc=${call}\nplot(1)`).some(
        (d) => d.message.includes('id2') && d.code === 'type-mismatch',
      ),
    ).toBe(true);
  });
  it.each(['int', 'float'].flatMap((left) => ['int', 'float'].map((right) => ({ left, right }))))(
    'preserves $left/$right products',
    ({ left, right }) => {
      const kind = left === 'int' && right === 'int' ? 'int' : 'float';
      expect(
        errors(
          `a=matrix.new<${left}>(1,1,${left === 'int' ? '2' : '2.0'})\nb=matrix.new<${right}>(1,1,${right === 'int' ? '3' : '3.0'})\nmatrix<${kind}> c=a.kron(id2=b)\nplot(matrix.get(c,0,0))`,
        ),
      ).toEqual([]);
    },
  );
  it('defers typed missing numeric matrix ID', () => {
    expect(errors(`a=matrix.new<int>(1,1,2)\nmatrix<float> b=na\nc=matrix.kron(id2=b,id1=a)\nplot(1)`)).toEqual([]);
  });
  // https://www.tradingview.com/pine-script-docs/language/variable-declarations/#shadowing
  it('refuses a UDT receiver named matrix and preserves a nonnamespace receiver', () => {
    expect(
      errors(
        `type Holder\n    int value\nmethod kron(Holder self, string id1, bool id2) => self.value\nmatrix=Holder.new(2)\nplot(matrix.kron(id2=true,id1="x"))`,
      ),
    ).toEqual([
      expect.objectContaining({ code: 'namespace-obscuring', message: expect.stringContaining("variable 'matrix'") }),
    ]);
    expect(
      errors(
        `type Holder\n    int value\nmethod kron(Holder self, string id1, bool id2) => self.value\nholder=Holder.new(2)\nplot(holder.kron(id2=true,id1="x"))`,
      ),
    ).toEqual([]);
  });
  it('preserves a user-defined matrix method', () => {
    expect(
      errors(`method kron(matrix<int> self, string id2) => 3\na=matrix.new<int>(1,1,2)\nplot(a.kron("x"))`),
    ).toEqual([]);
  });
});
