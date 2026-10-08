import { beforeAll, describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const contracts = [
  {
    kind: 'int',
    values: ['4', '-9', '2'],
    alternates: ['-12', '12', '-15'],
    min: -9,
    max: 4,
    seriesMin: [-12, 2, -15],
    seriesMax: [2, 12, 4],
  },
  {
    kind: 'float',
    values: ['4.5', '-9.25', '2.5'],
    alternates: ['-12.5', '12.25', '-15.5'],
    min: -9.25,
    max: 4.5,
    seriesMin: [-12.5, 2.5, -15.5],
    seriesMax: [2.5, 12.25, 4.5],
  },
] as const;
const rows = [
  { slot: -1, qualifier: 'const' },
  ...[0, 1, 2].flatMap((slot) => ['input', 'simple', 'series'].map((qualifier) => ({ slot, qualifier }))),
];

function declaration(name: string, kind: string, qualifier: string, value: string, alternate: string): string {
  if (qualifier === 'input') return `${name} = input.${kind}(${value})`;
  const expression = qualifier === 'series' ? `bar_index == 1 ? ${alternate} : ${value}` : value;
  return `${qualifier} ${kind} ${name} = ${expression}`;
}

// Frozen v6 min73-80/max81-88 join all numeric argument kinds and qualifiers.
// Literal signed triples distinguish min/max and independently vary all three slots.
// Mixed integer extrema still return float when an unselected argument is float.
for (const member of ['min', 'max'] as const) {
  const citation = `https://www.tradingview.com/pine-script-reference/v6/#fun_math.${member}`;
  for (const contract of contracts) {
    for (const row of rows) {
      describe(`math.${member}: ${contract.kind} ${row.qualifier} slot${row.slot}`, () => {
        let checked: ReturnType<typeof checkProgram>;
        let outputs: Array<Array<number | null>>;
        beforeAll(() => {
          const declarations = contract.values
            .map((value, slot) =>
              declaration(
                `arg${slot}`,
                contract.kind,
                row.slot === slot ? row.qualifier : 'const',
                value,
                contract.alternates[slot]!,
              ),
            )
            .join('\n');
          const source = `//@version=6
indicator("Extrema numeric argument joins")
${declarations}
measured = math.${member}(arg0, arg1, arg2)
alias = measured
plot(measured, "value")
plot(alias, "alias")`;
          checked = checkProgram(parse(source));
          expect(checked.diagnostics, citation).toEqual([]);
          contract.values.forEach((_, slot) => {
            expect(checked.symbols.find((symbol) => symbol.name === `arg${slot}`)?.type, citation).toMatchObject({
              kind: contract.kind,
              qualifier: row.slot === slot ? row.qualifier : 'const',
            });
          });
          const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
          expect(result.errors, citation).toEqual([]);
          expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
          outputs = [getPlot(result, 'value').values, getPlot(result, 'alias').values];
          outputs.forEach((values) => expect(values, citation).toHaveLength(3));
        });
        it('joins each variadic argument and preserves numeric kind through an alias', () => {
          for (const name of ['measured', 'alias']) {
            expect(checked.symbols.find((symbol) => symbol.name === name)?.type, citation).toMatchObject({
              kind: contract.kind,
              qualifier: row.qualifier,
            });
          }
          const value = contract[member];
          const middle =
            row.qualifier === 'series'
              ? (member === 'min' ? contract.seriesMin : contract.seriesMax)[row.slot]!
              : value;
          outputs.forEach((values) => expect(values, citation).toEqual([value, middle, value]));
        });
      });
    }
  }
  for (const qualifier of ['const', 'input', 'simple', 'series'] as const) {
    it(`math.${member}: mixed numeric kinds ${qualifier} do not use only the winning kind`, () => {
      const source = `//@version=6
indicator("Mixed extrema kinds")
const int arg0 = 4
const int arg1 = -9
${declaration('arg2', 'float', qualifier, '2.5', '14.5')}
measured = math.${member}(arg0, arg1, arg2)
alias = measured
plot(measured, "value")
plot(alias, "alias")`;
      const checked = checkProgram(parse(source));
      expect(checked.diagnostics, citation).toEqual([]);
      expect(checked.symbols.find((symbol) => symbol.name === 'arg2')?.type, citation).toMatchObject({
        kind: 'float',
        qualifier,
      });
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors, citation).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
      for (const name of ['measured', 'alias']) {
        expect(checked.symbols.find((symbol) => symbol.name === name)?.type, citation).toMatchObject({
          kind: 'float',
          qualifier,
        });
      }
      const expected = member === 'min' ? [-9, -9, -9] : [4, qualifier === 'series' ? 14.5 : 4, 4];
      for (const name of ['value', 'alias']) {
        expect(getPlot(result, name).values, citation).toHaveLength(3);
        expect(getPlot(result, name).values, citation).toEqual(expected);
      }
    });
  }
}
