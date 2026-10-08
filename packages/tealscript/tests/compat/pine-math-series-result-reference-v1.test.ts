import { beforeAll, describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const contracts = [
  {
    member: 'todegrees',
    kind: 'float',
    source: '0.0',
    alternate: 'math.pi / 2',
    value: 0,
    alternateValue: 90,
    positional: 'sourceValue',
    named: 'radians=sourceValue',
    entry: 170,
  },
  {
    member: 'toradians',
    kind: 'float',
    source: '0.0',
    alternate: '90.0',
    value: 0,
    alternateValue: 1.5707963267948966,
    positional: 'sourceValue',
    named: 'degrees=sourceValue',
    entry: 171,
  },
  {
    member: 'random',
    kind: 'int',
    source: '123',
    alternate: '7',
    value: null,
    alternateValue: null,
    positional: '5.0, 10.0, sourceValue',
    named: 'seed=sourceValue, max=10.0, min=5.0',
    entry: 172,
  },
  {
    member: 'sum',
    kind: 'float',
    source: '2.0',
    alternate: '3.0',
    value: 2,
    alternateValue: 3,
    positional: 'sourceValue, 1',
    named: 'length=1, source=sourceValue',
    entry: 173,
  },
] as const;

// Frozen v6 math170-173 always return series float, including weaker inputs.
// Oracles: pi/2 radians=90 degrees, length-one sum=x; seeded random remains in (5,10).
// Ten-decimal angle checks; native bits, random sequence and general windows are separate.
for (const contract of contracts) {
  for (const qualifier of ['const', 'input', 'simple', 'series'] as const) {
    for (const binding of ['positional', 'named'] as const) {
      const citation = `https://www.tradingview.com/pine-script-reference/v6/#fun_math.${contract.member}`;
      describe(`math.${contract.member}: fixed-series ${qualifier} ${binding} [functions:${contract.entry}]`, () => {
        let checked: ReturnType<typeof checkProgram>;
        let outputs: Array<Array<number | null>>;
        beforeAll(() => {
          const expression =
            qualifier === 'series' ? `bar_index == 1 ? ${contract.alternate} : ${contract.source}` : contract.source;
          const declaration =
            qualifier === 'input'
              ? `sourceValue = input.${contract.kind}(${contract.source})`
              : `${qualifier} ${contract.kind} sourceValue = ${expression}`;
          const args = contract[binding];
          const source = `//@version=6
indicator("Fixed series math results")
${declaration}
measured = math.${contract.member}(${args})
alias = measured
plot(measured, "value")
plot(alias, "alias")`;
          checked = checkProgram(parse(source));
          expect(checked.diagnostics, citation).toEqual([]);
          expect(checked.symbols.find((symbol) => symbol.name === 'sourceValue')?.type, citation).toMatchObject({
            kind: contract.kind,
            qualifier,
          });
          const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
          expect(result.errors, citation).toEqual([]);
          expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
          outputs = [getPlot(result, 'value').values, getPlot(result, 'alias').values];
          outputs.forEach((values) => expect(values, citation).toHaveLength(3));
        });
        it('keeps the series float result and alias independently of argument qualifiers', () => {
          for (const name of ['measured', 'alias'])
            expect(checked.symbols.find((symbol) => symbol.name === name)?.type, citation).toMatchObject({
              kind: 'float',
              qualifier: 'series',
            });
          for (const values of outputs) {
            if (contract.member === 'random') {
              values.forEach((value) => {
                expect(value, citation).not.toBeNull();
                expect(Number.isFinite(value), citation).toBe(true);
                expect(value, citation).toBeGreaterThan(5);
                expect(value, citation).toBeLessThan(10);
              });
            } else {
              const expected = [
                contract.value,
                qualifier === 'series' ? contract.alternateValue : contract.value,
                contract.value,
              ];
              values.forEach((value, index) => {
                expect(value, citation).not.toBeNull();
                expect(value, citation).toBeCloseTo(expected[index]!, 10);
              });
            }
          }
          expect(outputs[1], citation).toEqual(outputs[0]);
        });
      });
    }
  }
}
