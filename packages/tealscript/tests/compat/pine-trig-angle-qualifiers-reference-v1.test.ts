import { beforeAll, describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const overloads = [
  {
    member: 'sin',
    sourceKind: 'float',
    resultKind: 'float',
    source: '0.0',
    alternate: 'math.pi / 2',
    value: 0,
    alternateValue: 1,
    entries: [120, 121, 122, 123],
  },
  {
    member: 'cos',
    sourceKind: 'float',
    resultKind: 'float',
    source: '0.0',
    alternate: 'math.pi / 2',
    value: 1,
    alternateValue: 0,
    entries: [124, 125, 126, 127],
  },
  {
    member: 'tan',
    sourceKind: 'float',
    resultKind: 'float',
    source: '0.0',
    alternate: 'math.pi / 4',
    value: 0,
    alternateValue: 1,
    entries: [128, 129, 130, 131],
  },
] as const;

// Frozen v6 sin/cos/tan120-131 preserve angle qualifiers and return float.
// Elementary radian oracles: sin(0)=tan(0)=0, cos(0)=1, sin(pi/2)=tan(pi/4)=1.
// Ten-decimal tolerance handles pi representation; no native binary64 precision claim.
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
          const argument = binding === 'named' ? 'angle=sourceValue' : 'sourceValue';
          const source = `//@version=6
indicator("Trigonometric angle qualifiers")
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
          for (const output of [values, aliases]) {
            output.forEach((value, index) => {
              expect(value, citation).not.toBeNull();
              expect(value, citation).toBeCloseTo(expected[index]!, 10);
            });
          }
        });
      });
    }
  }
}
