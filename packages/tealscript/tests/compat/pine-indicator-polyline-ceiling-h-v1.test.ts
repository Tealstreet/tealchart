import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

function errors(count: string, setup = '', kind = 'indicator') {
  return checkProgram(parse(`//@version=6\n${setup}${kind}("polyline ceiling", max_polylines_count=${count})\nplot(close)`))
    .diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('indicator resolved constant polyline ceiling', () => {
  it.each([
    ['100 + 1', ''],
    ['COUNT', 'const int COUNT = 101\n'],
    ['BASE + 1', 'const int BASE = 100\n'],
    ['COUNT', 'const int BASE = 100\nconst int COUNT = BASE + 1\n'],
  ])('refuses above-ceiling const count %s (%s)', (count, setup) => {
    expect(errors(count, setup)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'type-mismatch', message: 'indicator max_polylines_count must be a non-negative integer no greater than 100' }),
    ]));
  });
  it.each([
    ['1', ''],
    ['100', ''],
    ['50 * 2', ''],
    ['COUNT', 'const int BASE = 99\nconst int COUNT = BASE + 1\n'],
  ])('admits valid const count %s (%s)', (count, setup) => {
    expect(errors(count, setup)).toEqual([]);
  });
  it('refuses literal 101 with one diagnostic', () => {
    expect(errors('101')).toHaveLength(1);
  });
  it.each(['bar_index', 'input.int(10)'])('retains non-const %s refusal', (count) => {
    expect(errors(count).length).toBeGreaterThan(0);
  });
  it('retains omitted count admission', () => {
    expect(checkProgram(parse('//@version=6\nindicator("Count omitted")\nplot(close)')).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  });
  it('leaves the equivalent strategy behavior unchanged', () => {
    expect(errors('100 + 1', '', 'strategy')).toEqual([]);
  });
});
