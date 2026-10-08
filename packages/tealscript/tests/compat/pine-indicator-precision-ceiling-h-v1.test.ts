import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

function errors(precision: string, setup = '', kind = 'indicator') {
  return checkProgram(parse(`//@version=6\n${setup}${kind}("Precision domain", precision=${precision})\nplot(close)`))
    .diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('indicator documented precision upper boundary', () => {
  it('refuses literal precision 17 above the documented 16 ceiling', () => {
    expect(errors('17')).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'invalid-argument', message: 'indicator precision must be at most 16' }),
    ]));
  });
  it.each(['0', '16'])('retains valid precision %s', (precision) => {
    expect(errors(precision)).toEqual([]);
  });
  it('retains a non-literal const-int precision', () => {
    expect(errors('DIGITS', 'const int DIGITS = 8 + 8\n')).toEqual([]);
  });
  it('keeps strategy precision checking unchanged', () => {
    expect(errors('17', '', 'strategy')).toEqual([]);
  });
  it.each(['-1', '1.5'])('retains invalid precision %s refusal', (precision) => {
    expect(errors(precision).length).toBeGreaterThan(0);
  });
});
