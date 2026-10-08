import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

function errors(value: string, setup = '', kind = 'indicator') {
  return checkProgram(parse(`//@version=6\n${setup}${kind}("Precision kind", precision=${value})\nplot(close)`))
    .diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('row294 precision requires const int, not a numeric value', () => {
  it.each([
    ['2.0', ''],
    ['VALUE', 'const float VALUE = 2.0\n'],
    ['1 + 0.5', ''],
  ])('refuses const float %s (%s)', (value, setup) => {
    expect(errors(value, setup)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'type-mismatch', message: expect.stringMatching(/integer|int/) }),
    ]));
  });
  it.each([
    ['0', ''],
    ['16', ''],
    ['1 + 1', ''],
    ['VALUE', 'const int VALUE = 2\n'],
  ])('admits const int %s (%s)', (value, setup) => {
    expect(errors(value, setup)).toEqual([]);
  });
  it.each([['2.5', 'type-mismatch'], ['-1.0', 'type-mismatch'], ['17.0', 'invalid-argument']])('retains one existing literal refusal for %s', (value, code) => {
    expect(errors(value)).toEqual([expect.objectContaining({ code })]);
  });
  it.each(['input.int(2)', 'bar_index'])('retains qualifier refusal for %s', (value) => {
    expect(errors(value)).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: expect.stringMatching(/const/) }),
    ]));
  });
  it.each([['2.0', ''], ['VALUE', 'const float VALUE = 2.0\n'], ['1 + 0.5', '']])('keeps strategy precision %s unchanged (%s)', (value, setup) => {
    expect(errors(value, setup, 'strategy')).toEqual([]);
  });
  it('admits omitted precision', () => {
    expect(checkProgram(parse('//@version=6\nindicator("Default")\nplot(close)')).diagnostics
      .filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  });
});
