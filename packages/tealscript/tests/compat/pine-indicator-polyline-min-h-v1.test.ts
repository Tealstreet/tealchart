import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

function errors(count: string, setup = '', kind = 'indicator') {
  return checkProgram(parse(`//@version=6\n${setup}${kind}("polyline lower bound", max_polylines_count=${count})\nplot(close)`))
    .diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('native polyline range minimum', () => {
  it.each([
    ['0', ''],
    ['1 - 1', ''],
    ['COUNT', 'const int COUNT = 0\n'],
  ])('refuses zero %s (%s)', (count, setup) => {
    expect(errors(count, setup)).toEqual([expect.objectContaining({ code: 'type-mismatch', message: 'indicator max_polylines_count must be at least 1' })]);
  });
  it.each(['1', '100', '2 - 1'])('admits boundary %s', (count) => {
    expect(errors(count)).toEqual([]);
  });
  it('retains the series input refusal', () => {
    expect(errors('input.int(1)').length).toBeGreaterThan(0);
  });
  it('admits omission', () => {
    expect(checkProgram(parse('//@version=6\nindicator("Default")\nplot(close)')).diagnostics
      .filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  });
  it('keeps strategy control unchanged', () => {
    expect(errors('0', '', 'strategy')).toEqual([]);
  });
});
