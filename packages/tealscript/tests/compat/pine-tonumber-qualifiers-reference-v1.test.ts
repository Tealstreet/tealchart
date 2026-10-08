import { beforeAll, describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Frozen v6 reference314-317 has explicit const/input/simple/series float overloads.
// Independent literal conversions: "3.5" -> 3.5 and "-2.25" -> -2.25 are binary-exact.
// Invalid-string grammar, missing values, Unicode and native precision are separate.
for (const qualifier of ['const', 'input', 'simple', 'series'] as const) {
  for (const binding of ['positional', 'named'] as const) {
    const citation = 'https://www.tradingview.com/pine-script-reference/v6/#fun_str.tonumber';
    describe(`str.tonumber: ${qualifier} ${binding} [functions:314-317]`, () => {
      let checked: ReturnType<typeof checkProgram>;
      let values: Array<number | null>;
      let aliases: Array<number | null>;
      beforeAll(() => {
        const expression = qualifier === 'series' ? 'bar_index == 1 ? "-2.25" : "3.5"' : '"3.5"';
        const declaration =
          qualifier === 'input'
            ? 'sourceValue = input.string("3.5")'
            : `${qualifier} string sourceValue = ${expression}`;
        const argument = binding === 'named' ? 'string=sourceValue' : 'sourceValue';
        const source = `//@version=6
indicator("Numeric string qualifier overloads")
${declaration}
measured = str.tonumber(${argument})
alias = measured
plot(measured, "value")
plot(alias, "alias")`;
        checked = checkProgram(parse(source));
        expect(checked.diagnostics, citation).toEqual([]);
        const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
        expect(result.errors, citation).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
        values = getPlot(result, 'value').values;
        aliases = getPlot(result, 'alias').values;
        expect(values, citation).toHaveLength(3);
        expect(aliases, citation).toHaveLength(3);
      });
      it('preserves the documented float qualifier and converted values through an alias', () => {
        expect(checked.symbols.find((symbol) => symbol.name === 'sourceValue')?.type, citation).toMatchObject({
          kind: 'string',
          qualifier,
        });
        for (const name of ['measured', 'alias']) {
          expect(checked.symbols.find((symbol) => symbol.name === name)?.type, citation).toMatchObject({
            kind: 'float',
            qualifier,
          });
        }
        const expected = [3.5, qualifier === 'series' ? -2.25 : 3.5, 3.5];
        expect(values, citation).toEqual(expected);
        expect(aliases, citation).toEqual(expected);
      });
    });
  }
}
