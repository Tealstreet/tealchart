import { beforeAll, describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const rows = [
  { slot: null, qualifier: 'const' },
  ...(['source', 'str'] as const).flatMap((slot) => ['simple', 'series'].map((qualifier) => ({ slot, qualifier }))),
] as const;

// Frozen v6 pos351-353 returns qualified int; ASCII search indexes start at zero.
// In "abXYab", "ab" starts at 0 and "XY" at 2; in "zzab", "ab" starts at 2.
// Input floors, missing matches, empty patterns and non-ASCII indexes remain separate.
for (const row of rows) {
  for (const binding of ['positional', 'named'] as const) {
    const citation = 'https://www.tradingview.com/pine-script-reference/v6/#fun_str.pos';
    describe(`str.pos: ${row.qualifier} ${row.slot ?? 'all'} ${binding} [functions:351-353]`, () => {
      let checked: ReturnType<typeof checkProgram>;
      let outputs: Array<Array<number | null>>;
      beforeAll(() => {
        const sourceQualifier = row.slot === 'source' ? row.qualifier : 'const';
        const patternQualifier = row.slot === 'str' ? row.qualifier : 'const';
        const sourceValue = sourceQualifier === 'series' ? 'bar_index == 1 ? "zzab" : "abXYab"' : '"abXYab"';
        const patternValue = patternQualifier === 'series' ? 'bar_index == 1 ? "XY" : "ab"' : '"ab"';
        const args = binding === 'named' ? 'str=patternValue, source=sourceValue' : 'sourceValue, patternValue';
        const source = `//@version=6
indicator("String position argument joins")
${sourceQualifier} string sourceValue = ${sourceValue}
${patternQualifier} string patternValue = ${patternValue}
measured = str.pos(${args})
alias = measured
plot(measured, "value")
plot(alias, "alias")`;
        checked = checkProgram(parse(source));
        expect(checked.diagnostics, citation).toEqual([]);
        for (const [name, qualifier] of [
          ['sourceValue', sourceQualifier],
          ['patternValue', patternQualifier],
        ]) {
          expect(checked.symbols.find((symbol) => symbol.name === name)?.type, citation).toMatchObject({
            kind: 'string',
            qualifier,
          });
        }
        const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
        expect(result.errors, citation).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
        outputs = [getPlot(result, 'value').values, getPlot(result, 'alias').values];
        outputs.forEach((values) => expect(values, citation).toHaveLength(3));
      });
      it('joins both string qualifiers and returns the first ASCII position through an alias', () => {
        for (const name of ['measured', 'alias']) {
          expect(checked.symbols.find((symbol) => symbol.name === name)?.type, citation).toMatchObject({
            kind: 'int',
            qualifier: row.qualifier,
          });
        }
        outputs.forEach((values) => expect(values, citation).toEqual([0, row.qualifier === 'series' ? 2 : 0, 0]));
      });
    });
  }
}
