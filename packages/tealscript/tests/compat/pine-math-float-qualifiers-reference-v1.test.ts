import { beforeAll, describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const overloads = [
  {
    member: 'log',
    sourceKind: 'float',
    resultKind: 'float',
    source: '1.0',
    alternate: 'math.e',
    value: 0,
    alternateValue: 1,
    entries: [100, 101, 102, 103],
    bindings: ['positional', 'named'],
  },
  {
    member: 'log10',
    sourceKind: 'float',
    resultKind: 'float',
    source: '1.0',
    alternate: '1000.0',
    value: 0,
    alternateValue: 3,
    entries: [104, 105, 106, 107],
    bindings: ['positional', 'named'],
  },
  {
    member: 'exp',
    sourceKind: 'float',
    resultKind: 'float',
    source: '0.0',
    alternate: '1.0',
    value: 1,
    alternateValue: 2.718281828459045,
    entries: [116, 117, 118, 119],
    bindings: ['positional', 'named'],
  },
  {
    member: 'asin',
    sourceKind: 'float',
    resultKind: 'float',
    source: '0.0',
    alternate: '1.0',
    value: 0,
    alternateValue: 1.5707963267948966,
    entries: [132, 133, 134, 135],
    bindings: ['positional'],
  },
  {
    member: 'acos',
    sourceKind: 'float',
    resultKind: 'float',
    source: '1.0',
    alternate: '0.0',
    value: 0,
    alternateValue: 1.5707963267948966,
    entries: [136, 137, 138, 139],
    bindings: ['positional'],
  },
  {
    member: 'atan',
    sourceKind: 'float',
    resultKind: 'float',
    source: '0.0',
    alternate: '1.0',
    value: 0,
    alternateValue: 0.7853981633974483,
    entries: [140, 141, 142, 143],
    bindings: ['positional'],
  },
] as const;

// Frozen v6 log100-107/exp116-119/inverse-trig132-143 preserve four float qualifiers.
// Elementary oracles: log(e)=1, log10(1000)=3, exp(1)=e, asin(1)=acos(0)=pi/2.
// Ten-decimal values only; inverse-trig named-slot authority and native bits are separate.
for (const overload of overloads) {
  for (const qualifier of ['const', 'input', 'simple', 'series'] as const) {
    for (const binding of overload.bindings) {
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
indicator("Unary float overload qualifiers")
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
