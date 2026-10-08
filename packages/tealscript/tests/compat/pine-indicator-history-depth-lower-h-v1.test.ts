import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

function errors(depth: string, setup = '', kind = 'indicator') {
  return checkProgram(parse(`//@version=6\n${setup}${kind}("History lower boundary", max_bars_back=${depth})\nplot(close)`))
    .diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('indicator resolved constant history lower boundary', () => {
  it.each([
    ['ZERO - 1', 'const int ZERO = 0\n'],
    ['0 - 1', ''],
    ['DEPTH', 'const int DEPTH = 0 - 1\n'],
    ['DEPTH', 'const int ZERO = 0\nconst int DEPTH = ZERO - 1\n'],
  ])('refuses negative const depth %s (%s)', (depth, setup) => {
    expect(errors(depth, setup)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'type-mismatch', message: 'indicator max_bars_back must be a non-negative integer' }),
    ]));
  });

  it.each([
    ['0', ''],
    ['5000', ''],
    ['0 + 0', ''],
    ['1250 * 4', ''],
    ['DEPTH', 'const int ZERO = 0\nconst int DEPTH = ZERO + 0\n'],
    ['DEPTH', 'const int BASE = 4999\nconst int DEPTH = BASE + 1\n'],
  ])('admits valid const depth %s (%s)', (depth, setup) => {
    expect(errors(depth, setup)).toEqual([]);
  });

  it.each(['-1', '5001'])('retains literal %s refusal', (depth) => {
    expect(errors(depth)).toHaveLength(1);
  });

  it.each(['bar_index', 'input.int(10)'])('retains non-const %s refusal', (depth) => {
    expect(errors(depth).length).toBeGreaterThan(0);
  });

  it('leaves the equivalent strategy check unchanged', () => {
    expect(errors('ZERO - 1', 'const int ZERO = 0\n', 'strategy')).toEqual([]);
  });
});
