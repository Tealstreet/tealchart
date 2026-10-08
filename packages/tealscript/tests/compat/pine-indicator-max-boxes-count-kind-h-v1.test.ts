import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

function errors(value: string, setup = '', kind = 'indicator') {
  return checkProgram(parse(`//@version=6\n${setup}${kind}("Integer kind", max_boxes_count=${value})\nplot(close)`))
    .diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('row302 max_boxes_count requires const int', () => {
  it.each([['2.0', ''], ['VALUE', 'const float VALUE = 2.0\n'], ['1 + 0.5', '']])('refuses float %s (%s)', (value, setup) => {
    expect(errors(value, setup)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'type-mismatch', message: expect.stringMatching(/\bint(?:eger)?\b/) }),
    ]));
  });
  it.each([['2', ''], ['50', ''], ['1 + 1', ''], ['VALUE', 'const int VALUE = 2\n']])('admits int %s (%s)', (value, setup) => {
    expect(errors(value, setup)).toEqual([]);
  });
  it.each(['2.5', '-1.0'])('retains a single existing literal refusal for %s', (value) => {
    expect(errors(value)).toEqual([expect.objectContaining({ code: 'type-mismatch' })]);
  });
  it.each(['input.int(2)', 'bar_index'])('retains const qualifier refusal for %s', (value) => {
    expect(errors(value)).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: expect.stringMatching(/const/) }),
    ]));
  });
  it.each([['2.0', ''], ['VALUE', 'const float VALUE = 2.0\n'], ['1 + 0.5', '']])('keeps strategy %s unchanged (%s)', (value, setup) => {
    expect(errors(value, setup, 'strategy')).toEqual([]);
  });
  it.each([['501.0', ''], ['VALUE', 'const float VALUE = 501.0\n']])('retains one existing upper-bound diagnostic for %s (%s)', (value, setup) => {
    expect(errors(value, setup)).toEqual([expect.objectContaining({
      code: 'type-mismatch', message: 'indicator max_boxes_count must be a non-negative integer no greater than 500',
    })]);
  });
  it('admits omission', () => {
    expect(checkProgram(parse('//@version=6\nindicator("Default")\nplot(close)')).diagnostics
      .filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  });
});
