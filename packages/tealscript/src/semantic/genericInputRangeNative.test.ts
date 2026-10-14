import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const message = "The arguments 'maxval', 'minval', and 'step' cannot be used with the input() function. You can use the input.int() or input.float() functions to specify a range of input data values";
const errors = (source: string) => checkProgram(parse(source)).diagnostics.filter(({ severity }) => severity === 'error');

// Authority: oracle v9 outcomes record26; input calls at lines16/17/18.
describe('captured v5 generic input range diagnostic', () => {
  it('reports the combined error once at the first callee', () => {
    const source = '//@version=5\nindicator("Input")\na = input(1.0, step=0.1)\nb = input(1.5, step=0.1)\nc = input(2.0, step=0.1)\nplot(a+b+c)';
    expect(errors(source)).toEqual([{ code: 'unknown-argument', message, severity: 'error', line: 3, column: 5 }]);
  });
  it('retains unrelated unknown-argument errors', () => {
    expect(errors('//@version=5\nindicator("Input")\na = input(1.0, step=0.1, bogus=2)\nplot(a)')).toEqual([
      { code: 'unknown-argument', message, severity: 'error', line: 3, column: 5 },
      { code: 'unknown-argument', message: "Unknown argument 'bogus' for input()", severity: 'error', line: 3, column: 26 },
    ]);
  });
  it.each([5, 6])('keeps typed input range controls in v%s', (version) => {
    expect(errors(`//@version=${version}\nindicator("Input")\nplot(input.float(1.0, minval=0.0, maxval=2.0, step=0.1))`)).toEqual([]);
  });
  it.each(['minval=1', 'maxval=9', 'step=2'])('preserves the unwitnessed integer-default %s refusal', (argument) => {
    for (const version of [5, 6]) {
      const name = argument.split('=')[0];
      expect(errors(`//@version=${version}\nindicator("Input split reference")\nvalue = input(3, ${argument})`)).toEqual([
        { code: 'unknown-argument', message: `Unknown argument '${name}' for input()`, severity: 'error', line: 3, column: 18 },
      ]);
    }
  });
  it('preserves the unwitnessed v6 generic step diagnostic', () => {
    expect(errors('//@version=6\nindicator("Input")\na = input(1.0, step=0.1)\nplot(a)')).toEqual([
      { code: 'unknown-argument', message: "Unknown argument 'step' for input()", severity: 'error', line: 3, column: 16 },
    ]);
  });
  it('keeps generic input without range arguments', () => {
    expect(errors('//@version=5\nindicator("Input")\nplot(input(1.0))')).toEqual([]);
  });
  it('keeps legacy generic range admission', () => {
    expect(errors('//@version=4\nstudy("Input")\nplot(input(1.0, step=0.1))')).toEqual([]);
  });
});
