import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Row 130: the Operators manual permits == and != for fundamental types.
// Finite, distinct values avoid missing-value and float-tolerance policy.
const cases = [
  { kind: 'int', first: '7', second: '-3' },
  { kind: 'float', first: '2.5', second: '-4.75' },
  { kind: 'bool', first: 'true', second: 'false' },
  { kind: 'string', first: '"pine"', second: '"teal"' },
  { kind: 'color', first: 'color.red', second: 'color.blue' },
];

for (const version of [5, 6]) {
  describe(`v${version} fundamental value equality (language row 130)`, () => {
    for (const { kind, first, second } of cases) {
      it(`compares equal and distinct ${kind} values with both operators`, () => {
        const source = `//@version=${version}
indicator("Fundamental value equality")
left = array.from(${first}, ${second}, ${second}, ${first})
right = array.from(${first}, ${first}, ${second}, ${second})
a = array.get(left, bar_index)
b = array.get(right, bar_index)
plot(a == b ? 1 : 0, "Equal")
plot(a != b ? 1 : 0, "Unequal")`;
        const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 4) });
        expect(result.errors).toEqual([]);
        expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
        expect(getPlot(result, 'Equal').values).toEqual([1, 0, 1, 0]);
        expect(getPlot(result, 'Unequal').values).toEqual([0, 1, 0, 1]);
      });
    }
  });
}
