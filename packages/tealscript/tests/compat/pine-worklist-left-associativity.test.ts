import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/operators/#operator-precedence
const source = (expression: string) => `//@version=6
indicator("Left associativity")
value = ${expression}
plot(value, title="value")`;

describe('worklist 1675 same-precedence binary associativity', () => {
  it.each([
    ['20 - 6 - 3', 11],
    ['24.0 / 3.0 / 2.0', 4],
    ['20 % 6 * 3', 6],
    ['10000000000000000.0 + -10000000000000000.0 + 1.0', 1],
  ] as const)('evaluates %s left to right', (expression, expected) => {
    const code = source(expression);
    expect(checkProgram(parse(code)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const result = runCompatScript(code);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'value').values).toEqual(compatibilityBars.map(() => expected));
  });
  it.each([
    ['20 - (6 - 3)', 17],
    ['24.0 / (3.0 / 2.0)', 16],
    ['2 + 3 * 4', 14],
  ] as const)('preserves explicit grouping and precedence in %s', (expression, expected) => {
    const result = runCompatScript(source(expression));
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'value').values).toEqual(compatibilityBars.map(() => expected));
  });
});
