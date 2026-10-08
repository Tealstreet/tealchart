import { beforeAll, describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const citation = 'https://www.tradingview.com/pine-script-reference/v6/#fun_str.length';
const qualifiers = [
  { qualifier: 'const', entry: 355 },
  { qualifier: 'simple', entry: 356 },
  { qualifier: 'series', entry: 357 },
] as const;

// Independent ASCII character counts include whitespace and the empty string.
// The input-return qualifier and non-ASCII counting model await native evidence.
const cases = [
  { name: 'empty string', source: '', count: 0 },
  { name: 'whitespace counts as characters', source: ' a ', count: 3 },
  { name: 'ASCII digit string', source: '1234567890', count: 10 },
];

for (const qualifier of qualifiers) {
  for (const testCase of cases) {
    describe(`str.length ${qualifier.qualifier}: ${testCase.name} [functions:${qualifier.entry}]`, () => {
      let checked: ReturnType<typeof checkProgram>;
      let values: Array<number | null>;
      let aliases: Array<number | null>;
      beforeAll(() => {
        const literal = JSON.stringify(testCase.source);
        const expression = qualifier.qualifier === 'series' ? `bar_index == 1 ? "XY" : ${literal}` : literal;
        const call = qualifier.qualifier === 'simple' ? 'str.length(string=sourceValue)' : 'str.length(sourceValue)';
        const source = `//@version=6
indicator("ASCII string length qualifier")
${qualifier.qualifier} string sourceValue = ${expression}
measured = ${call}
alias = measured
plot(measured, "length")
plot(alias, "alias")`;
        checked = checkProgram(parse(source));
        expect(checked.diagnostics, citation).toEqual([]);
        const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
        expect(result.errors, citation).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
        values = getPlot(result, 'length').values;
        aliases = getPlot(result, 'alias').values;
        expect(values, citation).toHaveLength(3);
        expect(aliases, citation).toHaveLength(3);
      });

      it('returns a documented qualified int and its ASCII count through an alias', () => {
        for (const name of ['measured', 'alias']) {
          expect(checked.symbols.find((symbol) => symbol.name === name)?.type, citation).toMatchObject({
            kind: 'int',
            qualifier: qualifier.qualifier,
          });
        }
        const expected = [testCase.count, qualifier.qualifier === 'series' ? 2 : testCase.count, testCase.count];
        expect(values, citation).toEqual(expected);
        expect(aliases, citation).toEqual(expected);
      });
    });
  }
}
