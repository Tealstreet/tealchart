import { beforeAll, describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Expected channels are independently decoded from the literal RGB bytes.
// Alpha 0x99 is 153/255 opacity, so its transparency is exactly 40 percent.
const getters = [
  { member: 'color.r', entries: { const: 18, input: 19, simple: 20, series: 17 }, ordinary: 10, alternate: 40 },
  { member: 'color.g', entries: { const: 22, input: 23, simple: 24, series: 21 }, ordinary: 20, alternate: 50 },
  { member: 'color.b', entries: { const: 26, input: 27, simple: 28, series: 25 }, ordinary: 30, alternate: 60 },
  { member: 'color.t', entries: { const: 30, input: 31, simple: 32, series: 29 }, ordinary: 0, alternate: 40 },
];
const sources = [
  { qualifier: 'const', expression: '#0A141E' },
  { qualifier: 'input', expression: 'input.color(#0A141E)' },
  { qualifier: 'simple', expression: '#0A141E' },
  { qualifier: 'series', expression: 'bar_index == 1 ? #28323C99 : #0A141E' },
] as const;

for (const getter of getters) {
  for (const sourceCase of sources) {
    describe(`${getter.member} ${sourceCase.qualifier} color [functions:${getter.entries[sourceCase.qualifier]}]`, () => {
      const citation = `https://www.tradingview.com/pine-script-reference/v6/#fun_${getter.member}`;
      let checked: ReturnType<typeof checkProgram>;
      let values: Array<number | null>;
      let aliasValues: Array<number | null>;
      beforeAll(() => {
        const argument =
          sourceCase.qualifier === 'input' || sourceCase.qualifier === 'simple' ? 'color=sourceValue' : 'sourceValue';
        const source = `//@version=6
indicator("Color getter qualifiers")
${sourceCase.qualifier} color sourceValue = ${sourceCase.expression}
extracted = ${getter.member}(${argument})
alias = extracted
plot(extracted, "extracted")
plot(alias, "alias")`;
        checked = checkProgram(parse(source));
        expect(checked.diagnostics, citation).toEqual([]);
        const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
        expect(result.errors, citation).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
        values = getPlot(result, 'extracted').values;
        aliasValues = getPlot(result, 'alias').values;
        expect(values, citation).toHaveLength(3);
        expect(aliasValues, citation).toHaveLength(3);
      });

      it('returns the documented qualified float, retaining the alias and channel values', () => {
        for (const name of ['extracted', 'alias']) {
          expect(checked.symbols.find((symbol) => symbol.name === name)?.type, citation).toMatchObject({
            kind: 'float',
            qualifier: sourceCase.qualifier,
          });
        }
        const expected = [
          getter.ordinary,
          sourceCase.qualifier === 'series' ? getter.alternate : getter.ordinary,
          getter.ordinary,
        ];
        expect(values, citation).toEqual(expected);
        expect(aliasValues, citation).toEqual(expected);
      });
    });
  }
}
