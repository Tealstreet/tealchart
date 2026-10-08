import { beforeAll, describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const rows = [
  { slot: -1, qualifier: 'const' },
  ...[0, 1, 2].flatMap((slot) => ['input', 'simple', 'series'].map((qualifier) => ({ slot, qualifier }))),
];

function declaration(name: string, kind: string, qualifier: string, value: string, alternate: string): string {
  if (qualifier === 'input') return `${name} = input.${kind}(${value})`;
  const expression = qualifier === 'series' ? `bar_index == 1 ? ${alternate} : ${value}` : value;
  return `${qualifier} ${kind} ${name} = ${expression}`;
}

// Frozen v6 avg225/226 and mintick160/161 return at least simple float.
// Exact oracles: average(1,3,8)=4; quarter-tick ties 1.125->1.25 and 2.125->2.25.
// Numeric precision, native identity, variable ticks and NA remain separate.
for (const kind of ['int', 'float'] as const) {
  for (const row of rows) {
    const citation = 'https://www.tradingview.com/pine-script-reference/v6/#fun_math.avg';
    describe(`math.avg: ${kind} ${row.qualifier} slot${row.slot} [functions:225-226]`, () => {
      let checked: ReturnType<typeof checkProgram>;
      let outputs: Array<Array<number | null>>;
      beforeAll(() => {
        const values = kind === 'int' ? ['1', '3', '8'] : ['1.5', '3.5', '7.0'];
        const alternates = kind === 'int' ? ['4', '6', '11'] : ['4.5', '6.5', '10.0'];
        const declarations = values
          .map((value, slot) =>
            declaration(`arg${slot}`, kind, slot === row.slot ? row.qualifier : 'const', value, alternates[slot]!),
          )
          .join('\n');
        const source = `//@version=6
indicator("Average return floor")
${declarations}
measured = math.avg(arg0, arg1, arg2)
alias = measured
plot(measured, "value")
plot(alias, "alias")`;
        checked = checkProgram(parse(source));
        expect(checked.diagnostics, citation).toEqual([]);
        values.forEach((_, slot) =>
          expect(checked.symbols.find((symbol) => symbol.name === `arg${slot}`)?.type, citation).toMatchObject({
            kind,
            qualifier: slot === row.slot ? row.qualifier : 'const',
          }),
        );
        const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
        expect(result.errors, citation).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
        outputs = [getPlot(result, 'value').values, getPlot(result, 'alias').values];
        outputs.forEach((values) => expect(values, citation).toHaveLength(3));
      });
      it('joins all numeric arguments with a minimum simple float floor', () => {
        for (const name of ['measured', 'alias'])
          expect(checked.symbols.find((symbol) => symbol.name === name)?.type, citation).toMatchObject({
            kind: 'float',
            qualifier: row.qualifier === 'series' ? 'series' : 'simple',
          });
        outputs.forEach((values) => expect(values, citation).toEqual([4, row.qualifier === 'series' ? 5 : 4, 4]));
      });
    });
  }
}

for (const qualifier of ['const', 'input', 'simple', 'series'] as const) {
  for (const binding of ['positional', 'named'] as const) {
    it(`math.round_to_mintick: ${qualifier} ${binding} keeps the simple/series floor [functions:160-161]`, () => {
      const citation = 'https://www.tradingview.com/pine-script-reference/v6/#fun_math.round_to_mintick';
      const argument = binding === 'named' ? 'number=sourceValue' : 'sourceValue';
      const source = `//@version=6
indicator("Mintick return floor")
${declaration('sourceValue', 'float', qualifier, '1.125', '2.125')}
measured = math.round_to_mintick(${argument})
alias = measured
plot(measured, "value")
plot(alias, "alias")`;
      const checked = checkProgram(parse(source));
      expect(checked.diagnostics, citation).toEqual([]);
      expect(checked.symbols.find((symbol) => symbol.name === 'sourceValue')?.type, citation).toMatchObject({
        kind: 'float',
        qualifier,
      });
      const result = runCompatScript(source, {
        bars: compatibilityBars.slice(0, 3),
        engineOptions: { runtime: { syminfo: { mintick: 0.25 } } },
      });
      expect(result.errors, citation).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
      for (const name of ['measured', 'alias'])
        expect(checked.symbols.find((symbol) => symbol.name === name)?.type, citation).toMatchObject({
          kind: 'float',
          qualifier: qualifier === 'series' ? 'series' : 'simple',
        });
      const expected = [1.25, qualifier === 'series' ? 2.25 : 1.25, 1.25];
      for (const name of ['value', 'alias']) {
        expect(getPlot(result, name).values, citation).toHaveLength(3);
        expect(getPlot(result, name).values, citation).toEqual(expected);
      }
    });
  }
}
