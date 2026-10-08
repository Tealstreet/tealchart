import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Variable declarations: same-scope names are unique; nested scopes may shadow.
// Repeated underscore names discard values and do not create usable bindings.
// https://www.tradingview.com/pine-script-docs/language/variable-declarations/
describe('variable scope names, language grammar indices 106/107/118', () => {
  for (const version of [5, 6]) {
    for (const [name, body] of [
      ['global', 'repeated = -7\nrepeated = 13\nplot(repeated)'],
      ['local', 'if bar_index == 0\n    repeated = -7\n    repeated = 13\nplot(0)'],
      ['function', 'read() =>\n    repeated = -7\n    repeated = 13\n    repeated\nplot(read())'],
    ]) {
      it(`v${version} refuses duplicate ${name} variable declarations`, () => {
        const result = checkProgram(parse(`//@version=${version}\nindicator("Duplicate scope names")\n${body}`));
        expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([
          expect.objectContaining({ code: 'duplicate-symbol' }),
        ]);
      });
    }

    for (const [name, body, expected] of [
      [
        'nested shadow',
        `value = array.get(array.from(-7, 4, 1), bar_index)
encoded = 0
if value > 0
    value = 13
    encoded := value
plot(value * 10 + encoded, "Result")`,
        [-70, 53, 23],
      ],
      [
        'sibling scopes',
        `left = 0
right = 0
if bar_index != 1
    repeated = -7
    left := repeated
if bar_index != 2
    repeated = 3
    right := repeated
plot(left * 10 + right, "Result")`,
        [-67, 3, -70],
      ],
      [
        'repeated tuple discards',
        `pair(value, delta) => [value * 10 + delta, value + delta]
value = array.get(array.from(-7, 4, 1), bar_index)
[_, first] = pair(value, 3)
[_, second] = pair(value, -2)
plot(first * 10 + second, "Result")`,
        [-49, 72, 39],
      ],
    ] as const) {
      it(`v${version} preserves ${name}`, () => {
        const source = `//@version=${version}\nindicator("Independent scope names")\n${body}`;
        expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual(
          [],
        );
        const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
        expect(result.errors).toEqual([]);
        expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
        expect(result.profile?.swallowedErrors ?? []).toEqual([]);
        expect(getPlot(result, 'Result').values).toEqual([...expected]);
      });
    }
  }
});
