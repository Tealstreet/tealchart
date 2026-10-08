import { beforeAll, describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const rows = [
  { slot: null, qualifier: 'const' },
  ...(['base', 'exponent'] as const).flatMap((slot) =>
    ['input', 'simple', 'series'].map((qualifier) => ({ slot, qualifier })),
  ),
] as const;

function declaration(name: string, kind: string, qualifier: string, value: number, alternate: number): string {
  const literal = (number: number) => (kind === 'float' ? `${number}.0` : String(number));
  if (qualifier === 'input') return `${name} = input.${kind}(${literal(value)})`;
  const expression =
    qualifier === 'series' ? `bar_index == 1 ? ${literal(alternate)} : ${literal(value)}` : literal(value);
  return `${qualifier} ${kind} ${name} = ${expression}`;
}

// Frozen v6 pow69-72 returns float with the strongest base/exponent qualifier.
// Independent exact oracles: 2^3=8, 3^3=27 and 2^2=4.
// Fractional/negative exponents, NA and native precision are separate.
for (const kind of ['int', 'float'] as const) {
  for (const row of rows) {
    for (const binding of ['positional', 'named'] as const) {
      const citation = 'https://www.tradingview.com/pine-script-reference/v6/#fun_math.pow';
      describe(`math.pow: ${kind} ${row.qualifier} ${row.slot ?? 'all'} ${binding} [functions:69-72]`, () => {
        let checked: ReturnType<typeof checkProgram>;
        let values: Array<number | null>;
        let aliases: Array<number | null>;
        beforeAll(() => {
          const baseQualifier = row.slot === 'base' ? row.qualifier : 'const';
          const exponentQualifier = row.slot === 'exponent' ? row.qualifier : 'const';
          const argument = binding === 'named' ? 'exponent=exponentValue, base=baseValue' : 'baseValue, exponentValue';
          const source = `//@version=6
indicator("Power argument qualifier joins")
${declaration('baseValue', kind, baseQualifier, 2, 3)}
${declaration('exponentValue', kind, exponentQualifier, 3, 2)}
measured = math.pow(${argument})
alias = measured
plot(measured, "value")
plot(alias, "alias")`;
          checked = checkProgram(parse(source));
          expect(checked.diagnostics, citation).toEqual([]);
          for (const [name, qualifier] of [
            ['baseValue', baseQualifier],
            ['exponentValue', exponentQualifier],
          ]) {
            expect(checked.symbols.find((symbol) => symbol.name === name)?.type, citation).toMatchObject({
              kind,
              qualifier,
            });
          }
          const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
          expect(result.errors, citation).toEqual([]);
          expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
          values = getPlot(result, 'value').values;
          aliases = getPlot(result, 'alias').values;
          expect(values, citation).toHaveLength(3);
          expect(aliases, citation).toHaveLength(3);
        });
        it('joins both numeric arguments as float and preserves an alias', () => {
          for (const name of ['measured', 'alias']) {
            expect(checked.symbols.find((symbol) => symbol.name === name)?.type, citation).toMatchObject({
              kind: 'float',
              qualifier: row.qualifier,
            });
          }
          const middle = row.qualifier === 'series' ? (row.slot === 'base' ? 27 : 4) : 8;
          const expected = [8, middle, 8];
          expect(values, citation).toEqual(expected);
          expect(aliases, citation).toEqual(expected);
        });
      });
    }
  }
}
