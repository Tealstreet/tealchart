import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

function errors(value: string, setup = '', kind = 'indicator') {
  return checkProgram(parse(`//@version=6\n${setup}${kind}("Resolved precision", precision=${value})\nplot(close)`))
    .diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('row294 resolved const-int precision range', () => {
  it.each([['16 + 1', ''], ['LIMIT', 'const int LIMIT = 17\n'], ['LIMIT + 1', 'const int LIMIT = 16\n']])('refuses above16: %s (%s)', (value, setup) => {
    expect(errors(value, setup)).toEqual([expect.objectContaining({
      code: 'invalid-argument', message: 'indicator precision must be at most 16',
    })]);
  });
  it.each([['0 - 1', ''], ['LIMIT', 'const int LIMIT = -1\n'], ['ZERO - 1', 'const int ZERO = 0\n']])('refuses below0: %s (%s)', (value, setup) => {
    expect(errors(value, setup)).toEqual([expect.objectContaining({
      code: 'type-mismatch', message: 'indicator precision must be a non-negative integer',
    })]);
  });
  it.each([['0', ''], ['16', ''], ['1 - 1', ''], ['8 + 8', ''], ['LIMIT', 'const int LIMIT = 0\n'], ['LIMIT', 'const int LIMIT = 16\n']])('admits 0..16: %s (%s)', (value, setup) => {
    expect(errors(value, setup)).toEqual([]);
  });
  it.each([['17', 'invalid-argument'], ['-1', 'type-mismatch'], ['1.5', 'type-mismatch']])('retains one existing literal refusal for %s', (value, code) => {
    expect(errors(value)).toEqual([expect.objectContaining({ code })]);
  });
  it.each(['input.int(2)', 'bar_index'])('retains const qualifier refusal for %s', (value) => {
    expect(errors(value)).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: expect.stringMatching(/const/) }),
    ]));
  });
  it.each([['16 + 1', ''], ['LIMIT', 'const int LIMIT = 17\n'], ['LIMIT + 1', 'const int LIMIT = 16\n'], ['0 - 1', ''], ['LIMIT', 'const int LIMIT = -1\n'], ['ZERO - 1', 'const int ZERO = 0\n']])('keeps strategy %s unchanged (%s)', (value, setup) => {
    expect(errors(value, setup, 'strategy')).toEqual([]);
  });
  it('admits omitted precision', () => {
    expect(checkProgram(parse('//@version=6\nindicator("Default")\nplot(close)')).diagnostics
      .filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  });
});
