import { beforeAll, describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const citation = 'https://www.tradingview.com/pine-script-reference/v6/#fun_math.round';

// Frozen v6 math152-155: one-argument round returns int with the number qualifier.
// Literal non-half positive inputs isolate metadata from disputed rounding ties.
// Two-argument precision and native binary64 equality remain separate.
for (const kind of ['int', 'float'] as const) {
  for (const qualifier of ['const', 'input', 'simple', 'series'] as const) {
    for (const binding of ['positional', 'named'] as const) {
      describe(`math.round one argument ${kind} ${qualifier} ${binding} [functions:152-155]`, () => {
        let checked: ReturnType<typeof checkProgram>;
        let outputs: Array<Array<number | null>>;
        beforeAll(() => {
          const value = kind === 'int' ? '2' : '2.25';
          const alternate = kind === 'int' ? '3' : '3.75';
          const expression = qualifier === 'series' ? `bar_index == 1 ? ${alternate} : ${value}` : value;
          const declaration =
            qualifier === 'input'
              ? `sourceValue = input.${kind}(${value})`
              : `${qualifier} ${kind} sourceValue = ${expression}`;
          const source = `//@version=6
indicator("One argument round qualifiers")
${declaration}
measured = math.round(${binding === 'named' ? 'number=' : ''}sourceValue)
alias = measured
plot(measured, "value")
plot(alias, "alias")`;
          checked = checkProgram(parse(source));
          expect(checked.diagnostics, citation).toEqual([]);
          expect(checked.symbols.find((symbol) => symbol.name === 'sourceValue')?.type, citation).toMatchObject({
            kind,
            qualifier,
          });
          const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
          expect(result.errors, citation).toEqual([]);
          expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
          outputs = [getPlot(result, 'value').values, getPlot(result, 'alias').values];
          outputs.forEach((values) => expect(values, citation).toHaveLength(3));
        });
        it('retains the argument qualifier on the integer result and alias', () => {
          for (const name of ['measured', 'alias'])
            expect(checked.symbols.find((symbol) => symbol.name === name)?.type, citation).toMatchObject({
              kind: 'int',
              qualifier,
            });
          const expected = [2, qualifier === 'series' ? (kind === 'int' ? 3 : 4) : 2, 2];
          for (const values of outputs) expect(values, citation).toEqual(expected);
        });
      });
    }
  }
}
