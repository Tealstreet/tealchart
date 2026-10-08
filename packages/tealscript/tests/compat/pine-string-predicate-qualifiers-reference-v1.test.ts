import { beforeAll, describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const combinations = [
  { source: 'const', pattern: 'const', result: 'const' },
  { source: 'const', pattern: 'simple', result: 'simple' },
  { source: 'const', pattern: 'series', result: 'series' },
  { source: 'simple', pattern: 'const', result: 'simple' },
  { source: 'simple', pattern: 'simple', result: 'simple' },
  { source: 'simple', pattern: 'series', result: 'series' },
  { source: 'series', pattern: 'const', result: 'series' },
  { source: 'series', pattern: 'simple', result: 'series' },
  { source: 'series', pattern: 'series', result: 'series' },
] as const;
const predicates = [
  { member: 'contains', entries: [328, 329, 330] },
  { member: 'startswith', entries: [343, 344, 345] },
  { member: 'endswith', entries: [346, 347, 348] },
] as const;

function declaration(name: string, qualifier: string, value: string, alternate: string): string {
  if (qualifier === 'input') return `${name} = input.string(${JSON.stringify(value)})`;
  const expression =
    qualifier === 'series'
      ? `bar_index == 1 ? ${JSON.stringify(alternate)} : ${JSON.stringify(value)}`
      : JSON.stringify(value);
  return `${qualifier} string ${name} = ${expression}`;
}

// Reference overloads determine the qualifier table; the ASCII examples are hand-derived.
// "abXab" contains, starts and ends with "ab"; "QQ" and "ZZ" do not match.
for (const predicate of predicates) {
  for (const row of combinations) {
    const citation = `https://www.tradingview.com/pine-script-reference/v6/#fun_str.${predicate.member}`;
    describe(`str.${predicate.member}: ${row.source} source / ${row.pattern} pattern [functions:${predicate.entries.join(',')}]`, () => {
      let checked: ReturnType<typeof checkProgram>;
      let values: Array<number | null>;
      let aliases: Array<number | null>;
      beforeAll(() => {
        const call =
          row.pattern === 'simple'
            ? `str.${predicate.member}(str=patternValue, source=sourceValue)`
            : `str.${predicate.member}(sourceValue, patternValue)`;
        const source = `//@version=6
indicator("String predicate qualifiers")
${declaration('sourceValue', row.source, 'abXab', 'QQ')}
${declaration('patternValue', row.pattern, 'ab', 'ZZ')}
measured = ${call}
alias = measured
plot(measured ? 1 : 0, "value")
plot(alias ? 1 : 0, "alias")`;
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
      it('returns the documented qualified bool and preserves it through an alias', () => {
        for (const name of ['measured', 'alias']) {
          expect(checked.symbols.find((symbol) => symbol.name === name)?.type, citation).toMatchObject({
            kind: 'bool',
            qualifier: row.result,
          });
        }
        const expected = [1, row.result === 'series' ? 0 : 1, 1];
        expect(values, citation).toEqual(expected);
        expect(aliases, citation).toEqual(expected);
      });
    });
  }
}

const matchCombinations = [
  ...combinations,
  { source: 'input', pattern: 'const', result: 'simple' },
  { source: 'const', pattern: 'input', result: 'simple' },
] as const;

// str.match returns the first complete regex match, or "" when no match exists.
// Its documented simple/series string overloads have no const or input result.
for (const row of matchCombinations) {
  const citation = 'https://www.tradingview.com/pine-script-reference/v6/#fun_str.match';
  describe(`str.match: ${row.source} source / ${row.pattern} regex [functions:349,350]`, () => {
    let checked: ReturnType<typeof checkProgram>;
    let texts: Array<string | undefined>;
    let aliases: Array<string | undefined>;
    beforeAll(() => {
      const source = `//@version=6
indicator("Regex result qualifiers")
${declaration('sourceValue', row.source, 'abXab', 'QQ')}
${declaration('patternValue', row.pattern, '[a-z]+', '[0-9]+')}
measured = str.match(regex=patternValue, source=sourceValue)
alias = measured
label.new(bar_index, high, measured)
label.new(bar_index, low, alias)`;
      checked = checkProgram(parse(source));
      expect(checked.diagnostics, citation).toEqual([]);
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors, citation).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
      const labels = result.drawings.filter((drawing) => drawing.type === 'label');
      expect(labels, citation).toHaveLength(6);
      texts = labels.filter((_, index) => index % 2 === 0).map((label) => label.text);
      aliases = labels.filter((_, index) => index % 2 === 1).map((label) => label.text);
      const expected = ['ab', row.result === 'series' ? '' : 'ab', 'ab'];
      expect(texts, citation).toEqual(expected);
      expect(aliases, citation).toEqual(expected);
    });
    it(
      'returns the native-backed qualified string through an alias',
      () => {
        for (const name of ['measured', 'alias']) {
          expect(checked.symbols.find((symbol) => symbol.name === name)?.type, citation).toMatchObject({
            kind: 'string',
            qualifier: row.result === 'const' ? 'simple' : row.result,
          });
        }
      },
    );
  });
}
