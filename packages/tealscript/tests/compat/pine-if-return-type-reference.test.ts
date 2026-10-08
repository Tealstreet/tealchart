import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Conditional structures: Matching local block type requirement.
// Assigned branches require compatible types; standalone branches may differ.
// https://www.tradingview.com/pine-script-docs/language/conditional-structures/
describe('if return type compatibility, language grammar index157', () => {
  for (const [first, second] of [
    ['1', '"other"'],
    ['false', '3.0'],
    ['color.blue', '"other"'],
  ]) {
    it(`refuses assigned ${first} and ${second} branches`, () => {
      const checked = checkProgram(
        parse(`//@version=6
indicator("Assigned branch types")
value = if bar_index == 1
    ${first}
else
    ${second}
plot(0)`),
      );
      expect(checked.diagnostics).toContainEqual(
        expect.objectContaining({
          severity: 'error',
          code: 'conditional-branch-type-mismatch',
        }),
      );
    });
  }

  for (const [name, body, expected] of [
    [
      'float',
      `value = if bar_index == 1
    3.5
else
    -7.0
plot(value, "Result")`,
      [-7, 3.5, -7],
    ],
    [
      'string',
      `value = if bar_index == 1
    "x"
else
    "alpha"
plot(str.length(value), "Result")`,
      [5, 1, 5],
    ],
    [
      'standalone mixed types',
      `var int visits = 0
if bar_index == 1
    visits += 3
    12
else
    visits += 1
    "standalone"
plot(visits, "Result")`,
      [1, 4, 5],
    ],
  ] as const) {
    it(`retains ${name} branches and their effects`, () => {
      const source = `//@version=6\nindicator("Allowed branch types")\n${body}`;
      expect(checkProgram(parse(source)).diagnostics).toEqual([]);
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile?.swallowedErrors ?? []).toEqual([]);
      expect(getPlot(result, 'Result').values).toEqual([...expected]);
    });
  }
});
