import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// v5 const-int division discards the fractional remainder; v6 keeps it.
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#fractional-division-of-constants
describe('semantic constant division uses runtime version and operand rules', () => {
  const errors = (source: string) => checkProgram(parse(source)).diagnostics.filter((entry) => entry.severity === 'error');

  it.each([
    ['max_bars_back', 5000],
    ['max_lines_count', 500],
    ['max_labels_count', 500],
    ['max_boxes_count', 500],
    ['max_polylines_count', 100],
  ] as const)('admits v5 %s at its truncated ceiling and retains v6/float refusals', (parameter, ceiling) => {
    const expression = `${ceiling * 2 + 1} / 2`;
    for (const setup of ['', `const int LIMIT = ${expression}\n`]) {
      const value = setup ? 'LIMIT' : expression;
      expect(errors(`//@version=5\n${setup}indicator("Division", ${parameter}=${value})\nplot(close)`)).toEqual([]);
    }
    expect(errors(`//@version=6\nindicator("Division", ${parameter}=${expression})\nplot(close)`)).not.toEqual([]);
    expect(errors(`//@version=5\nindicator("Division", ${parameter}=${ceiling * 2 + 1}.0 / 2)\nplot(close)`)).not.toEqual([]);
  });

  it.each([
    ['33 / 2', 16, ''],
    ['-1 / 2', 0, ''],
    ['1 / -2', 0, ''],
    ['-33 / 2', -16, ''],
    ['33 / -2', -16, ''],
    ['-33 / -2', 16, ''],
    ['QUOTIENT', 16, 'const int QUOTIENT = 33 / 2\n'],
    ['QUOTIENT', 0, 'const int QUOTIENT = -1 / 2\n'],
    ['(33 / 2) / 3', 5, ''],
    ['math.abs(-33 / 2)', 16, ''],
    ['math.ceil(33 / 2)', 16, ''],
    ['math.round(33 / 2)', 16, ''],
    ['(33 / 2) % 3', 1, ''],
  ] as const)('folds v5 %s to %s through aliases, numeric calls and comparisons', (expression, value, setup) => {
    const source = `//@version=5\n${setup}indicator("Division", max_bars_back=(${expression}) == ${value} ? 0 : 5001)\nplot(close)`;
    expect(errors(source)).toEqual([]);
  });

  it.each([
    [4, '33 / 2', 16, ''],
    [6, '33 / 2', 16.5, ''],
    [6, '-1 / 2', -0.5, ''],
    [5, '33.0 / 2', 16.5, ''],
    [5, '33 / 2.0', 16.5, ''],
    [5, 'VALUE / 2', 16.5, 'const float VALUE = 33\n'],
    [6, 'VALUE / 2', 16.5, 'const int VALUE = 33\n'],
  ] as const)('retains v%s operand policy for %s', (version, expression, value, setup) => {
    expect(errors(`//@version=${version}\n${setup}indicator("Division", max_bars_back=(${expression}) == ${value} ? 0 : 5001)\nplot(close)`)).toEqual([]);
  });
});
