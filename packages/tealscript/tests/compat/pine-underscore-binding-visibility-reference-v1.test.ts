import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Underscore declarations mark unused data and cannot be read after declaration.
// Scalar discards may repeat in global and UDF-local scopes.
// https://www.tradingview.com/pine-script-docs/language/variable-declarations/#using-an-underscore-as-an-identifier
describe('discard visibility, language grammar indices 118/119', () => {
  for (const version of [5, 6]) {
    for (const [name, body] of [
      ['global scalar', '_ = 13\nplot(_)'],
      ['UDF scalar', 'read() =>\n    _ = 13\n    _\nplot(read())'],
      ['UDF tuple', 'pair() => [-7, 13]\nread() =>\n    [_, kept] = pair()\n    _\nplot(read())'],
    ]) {
      it(`v${version} refuses reading a ${name} discard`, () => {
        const source = `//@version=${version}\nindicator("Discard visibility")\n${body}`;
        expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual(
          [expect.objectContaining({ code: 'unknown-identifier' })],
        );
      });
    }

    for (const [name, body, expected] of [
      [
        'global scalar',
        `_ = -7
_ = 13
_ = bar_index
plot(value, "Result")`,
        [-3, 4, 0],
      ],
      [
        'UDF scalar',
        `read(argument) =>
    _ = argument * -2
    _ = argument + 5
    argument * 3 + 1
plot(read(value), "Result")`,
        [-8, 13, 1],
      ],
    ] as const) {
      it(`v${version} preserves repeated ${name} discards`, () => {
        const source = `//@version=${version}
indicator("Repeated scalar discards")
value = array.get(array.from(-3, 4, 0), bar_index)
${body}`;
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
