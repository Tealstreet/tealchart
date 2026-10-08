import { beforeAll, describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const overloads = [
  {
    member: 'sqrt',
    sourceKind: 'int',
    resultKind: 'float',
    source: '9',
    alternate: '4',
    value: 3,
    alternateValue: 2,
    entries: [108, 109, 110, 111],
  },
  {
    member: 'sqrt',
    sourceKind: 'float',
    resultKind: 'float',
    source: '2.25',
    alternate: '6.25',
    value: 1.5,
    alternateValue: 2.5,
    entries: [108, 109, 110, 111],
  },
  {
    member: 'sign',
    sourceKind: 'int',
    resultKind: 'float',
    source: '-3',
    alternate: '2',
    value: -1,
    alternateValue: 1,
    entries: [112, 113, 114, 115],
  },
  {
    member: 'sign',
    sourceKind: 'float',
    resultKind: 'float',
    source: '-3.5',
    alternate: '2.25',
    value: -1,
    alternateValue: 1,
    entries: [112, 113, 114, 115],
  },
] as const;

// Frozen v6 sqrt108-111 and sign112-115 return float, including integer inputs.
// Exact oracles: sqrt(9)=3, sqrt(2.25)=1.5; sign(-3)=-1 and sign(2)=1.
// Domain errors, NA, signed zero, rounding precision and legacy binding are separate.
for (const overload of overloads) {
  for (const qualifier of ['const', 'input', 'simple', 'series'] as const) {
    for (const binding of ['positional', 'named'] as const) {
      const citation = `https://www.tradingview.com/pine-script-reference/v6/#fun_math.${overload.member}`;
      describe(`math.${overload.member}: ${overload.sourceKind} ${qualifier} ${binding} [functions:${overload.entries.join(',')}]`, () => {
        let checked: ReturnType<typeof checkProgram>;
        let values: Array<number | null>;
        let aliases: Array<number | null>;
        beforeAll(() => {
          const expression =
            qualifier === 'series' ? `bar_index == 1 ? ${overload.alternate} : ${overload.source}` : overload.source;
          const declaration =
            qualifier === 'input'
              ? `sourceValue = input.${overload.sourceKind}(${overload.source})`
              : `${qualifier} ${overload.sourceKind} sourceValue = ${expression}`;
          const argument = binding === 'named' ? 'number=sourceValue' : 'sourceValue';
          const source = `//@version=6
indicator("Math sqrt and sign qualifiers")
${declaration}
measured = math.${overload.member}(${argument})
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
        it('returns the documented numeric kind and qualifier through an alias', () => {
          expect(checked.symbols.find((symbol) => symbol.name === 'sourceValue')?.type, citation).toMatchObject({
            kind: overload.sourceKind,
            qualifier,
          });
          for (const name of ['measured', 'alias']) {
            expect(checked.symbols.find((symbol) => symbol.name === name)?.type, citation).toMatchObject({
              kind: overload.resultKind,
              qualifier,
            });
          }
          const expected = [
            overload.value,
            qualifier === 'series' ? overload.alternateValue : overload.value,
            overload.value,
          ];
          expect(values, citation).toEqual(expected);
          expect(aliases, citation).toEqual(expected);
        });
      });
    }
  }
}
