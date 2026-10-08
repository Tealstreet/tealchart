import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot } from './fixtures';

// Version rows21/66: v5 logical operands are strict; v6 skips unnecessary operands.
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#lazy-evaluation-of-conditions
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/#removed-iff-and-offset
const bars = [-1, 0, 1, 2].map((close, index) => ({
  time: (index + 1) * 60_000, open: close, high: close + 1, low: close - 1, close, volume: 10,
}));

const cases = [
  {
    name: 'conjunction inside disjunction',
    expression: '(visit(1, close > 0) and visit(2, close < 2)) or visit(3, close == 0)',
    values: [0, 1, 1, 0], lazyTrace: [13, 13, 12, 123], strictTrace: [123, 123, 123, 123],
  },
  {
    name: 'disjunction inside conjunction',
    expression: 'visit(1, close > 0) and (visit(2, close < 2) or visit(3, close == 0))',
    values: [0, 0, 1, 0], lazyTrace: [1, 1, 12, 123], strictTrace: [123, 123, 123, 123],
  },
  {
    name: 'conjunction as the right disjunct',
    expression: 'visit(1, close > 0) or (visit(2, close < 2) and visit(3, close == 0))',
    values: [0, 1, 1, 1], lazyTrace: [123, 123, 1, 1], strictTrace: [123, 123, 123, 123],
  },
  {
    name: 'a ternary inside the right conjunct',
    expression: 'visit(1, close > 0) and (visit(2, close < 2) ? visit(3, true) : visit(4, false))',
    values: [0, 0, 1, 0], lazyTrace: [1, 1, 123, 124], strictTrace: [123, 123, 123, 124],
  },
];

describe('versioned nested logical evaluation and ordered side effects', () => {
  for (const version of [5, 6]) {
    it.each(cases)(`preserves $name in v${version}`, ({ expression, values, lazyTrace, strictTrace }) => {
      const ast = parse(`//@version=${version}
indicator("Nested logical version")
var trace = array.new_int(1, 0)
visit(int tag, bool result) =>
    array.set(trace, 0, 10 * array.get(trace, 0) + tag)
    result
array.set(trace, 0, 0)
value = ${expression}
plot(value ? 1 : 0, "Value")
plot(array.get(trace, 0), "Trace")`);
      expect(checkProgram(ast).diagnostics).toEqual([]);
      const compiled = tryCompile(ast);
      expect(compiled.success, compiled.unsupported.join(', ')).toBe(true);
      const result = executeCompiled(compiled, bars);
      expect(result).not.toBeNull();
      expect(result!.errors).toEqual([]);
      expect(getPlot(result!, 'Value').values).toEqual(values);
      expect(getPlot(result!, 'Trace').values).toEqual(version === 5 ? strictTrace : lazyTrace);
    });
  }
});
