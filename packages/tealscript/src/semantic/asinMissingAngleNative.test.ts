import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

// Authority: oracle v4 outcomes, ledger-1094-asin-number-v5/v6-v1 attempt1.
describe('captured asin missing angle after unknown number', () => {
  it.each([5, 6])('matches both ordered native errors in v%s', (version) => {
    const source = `//@version=${version}\nindicator("Ledger1094 asin number v${version}", overlay=false)\nfloat value = math.asin(number=0.5)\nplot(value, "OUTCOME")`;
    const quote = version === 5 ? "'" : '"';
    const angle = version === 5 ? '`angle`' : '"angle"';
    const errors = checkProgram(parse(source)).diagnostics.filter(({ severity }) => severity === 'error');
    expect(errors).toEqual([
      {
        code: version === 5 ? 'unknown-argument' : 'CE10120',
        message: `The ${quote}math.asin${quote} function does not have an argument with the name ${quote}number${quote}`,
        severity: 'error', line: 3, column: 25,
      },
      {
        code: 'argument-count', ...(version === 6 ? { nativeCode: 'CE10165' } : {}),
        message: `No value assigned to the ${angle} parameter in math.asin()`,
        severity: 'error', line: 3, column: 25,
      },
    ]);
  });
  it.each([5, 6])('keeps canonical named and positional controls in v%s', (version) => {
    for (const call of ['math.asin(angle=0.5)', 'math.asin(0.5)']) {
      expect(checkProgram(parse(`//@version=${version}\nindicator("Control")\nplot(${call})`)).diagnostics.filter(({ severity }) => severity === 'error')).toEqual([]);
    }
  });
  it('keeps the legacy x binding', () => {
    expect(checkProgram(parse('//@version=4\nstudy("Legacy")\nplot(asin(x=0.5))')).diagnostics.filter(({ severity }) => severity === 'error')).toEqual([]);
  });
});
