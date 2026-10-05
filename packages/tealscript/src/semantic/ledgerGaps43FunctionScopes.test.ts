import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const errors = (body: string) =>
  checkProgram(parse(`//@version=6\nindicator("Function scope contract")\n${body}\n`)).diagnostics.filter(
    (d) => d.severity === 'error',
  );
describe('ledger gaps43 documented function scopes', () => {
  it.each([['nested function', 'f(int x) =>\n    g(int y) => y + 1\n    g(x)\nplot(f(2))']])(
    '1690 refuses %s definitions',
    (_, body) => {
      expect(errors(body).map((d) => d.code)).toContain('function-scope');
    },
  );
  // https://www.tradingview.com/pine-script-docs/language/user-defined-functions/#no-nested-definitions
  it.each(['if barstate.isfirst\n    f(int x) => x + 1\nplot(1)', 'for i = 0 to 1\n    f(int x) => x + i\nplot(1)'])(
    'refuses a function definition in a top-level local block: %s',
    (body) => {
      expect(errors(body).map((d) => d.code)).toEqual(['function-definition-scope']);
    },
  );
  // The shared resolved-symbol guard distinguishes global and parameter reassignments.
  it.each([':=', '+=', '-=', '*=', '/='])('1691 refuses global %s in a function', (operator) => {
    expect(errors(`int count = 4\nf() =>\n    count ${operator} 2\n    count\nplot(f())`).map((d) => d.code)).toContain(
      'global-variable-reassignment',
    );
  });
  it.each([':=', '+=', '-=', '*=', '/='])('1692 refuses parameter %s in a function', (operator) => {
    expect(errors(`f(int x) =>\n    x ${operator} 2\n    x\nplot(f(4))`).map((d) => d.code)).toContain(
      'parameter-reassignment',
    );
  });
  it('1691 catches global reassignments inside nested local blocks', () => {
    expect(
      errors('int count=0\nf() =>\n    if bar_index >= 0\n        count += 1\n    count\nplot(f())').map((d) => d.code),
    ).toContain('global-variable-reassignment');
  });
  it('allows a function-local variable to shadow a global and be reassigned', () => {
    expect(errors('int count=0\nf() =>\n    int count=3\n    count += 1\n    count\nplot(f())')).toEqual([]);
  });
  it('1693 permits mutations of objects referenced by globals and parameters', () => {
    expect(
      errors(
        'type State\n    int x=0\nvar State state=State.new()\nvar array<int> values=array.new<int>(1,0)\nf(State s,array<int> a) =>\n    s.x += 1\n    array.set(a,0,array.get(a,0)+1)\n    s.x+array.get(a,0)\nplot(f(state,values))',
      ),
    ).toEqual([]);
  });
  it('allows ordinary top-level conditional and loop reassignments', () => {
    expect(
      errors('int count=0\nif barstate.isfirst\n    count += 1\nfor i = 0 to 1\n    count += i\nplot(count)'),
    ).toEqual([]);
  });
});
