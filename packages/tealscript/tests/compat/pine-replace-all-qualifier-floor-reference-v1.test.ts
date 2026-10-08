import { beforeAll, describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, runCompatScript } from './fixtures';

const argumentsTable = [
  { name: 'source', variable: 'sourceText', value: 'ab-ab', alternate: 'cab', expected: 'cX' },
  { name: 'target', variable: 'targetText', value: 'ab', alternate: '-', expected: 'abXab' },
  { name: 'replacement', variable: 'replacementText', value: 'X', alternate: 'Y', expected: 'Y-Y' },
] as const;
const rows = [
  { varying: null, qualifier: 'const' },
  ...argumentsTable.flatMap((argument) =>
    ['input', 'simple', 'series'].map((qualifier) => ({ varying: argument, qualifier })),
  ),
] as const;

// Frozen v6 reference326/327 declares only simple/series string results.
// ASCII oracles: replacing every "ab" in "ab-ab" with "X" yields "X-X".
// The minimum-simple floor remains native-unobserved; replacement tokens/NA are separate.
for (const row of rows) {
  const expectedRed = row.qualifier === 'const' || row.qualifier === 'input';
  const citation = 'https://www.tradingview.com/pine-script-reference/v6/#fun_str.replace_all';
  describe(`str.replace_all: ${row.qualifier} ${row.varying?.name ?? 'all'} [functions:326,327]`, () => {
    let checked: ReturnType<typeof checkProgram>;
    beforeAll(() => {
      const declarations = argumentsTable
        .map((argument) => {
          const qualifier = argument === row.varying ? row.qualifier : 'const';
          if (qualifier === 'input') return `${argument.variable} = input.string(${JSON.stringify(argument.value)})`;
          const value =
            qualifier === 'series'
              ? `bar_index == 1 ? ${JSON.stringify(argument.alternate)} : ${JSON.stringify(argument.value)}`
              : JSON.stringify(argument.value);
          return `${qualifier} string ${argument.variable} = ${value}`;
        })
        .join('\n');
      const argumentsText =
        row.qualifier === 'input' || row.qualifier === 'series'
          ? [...argumentsTable]
              .reverse()
              .map((argument) => `${argument.name}=${argument.variable}`)
              .join(', ')
          : argumentsTable.map((argument) => argument.variable).join(', ');
      const source = `//@version=6
indicator("Replace all qualifier floor")
${declarations}
measured = str.replace_all(${argumentsText})
alias = measured
label.new(bar_index, high, measured)
label.new(bar_index, low, alias)`;
      checked = checkProgram(parse(source));
      expect(checked.diagnostics, citation).toEqual([]);
      for (const argument of argumentsTable) {
        expect(checked.symbols.find((symbol) => symbol.name === argument.variable)?.type, citation).toMatchObject({
          kind: 'string',
          qualifier: argument === row.varying ? row.qualifier : 'const',
        });
      }
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors, citation).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
      const labels = result.drawings.filter((drawing) => drawing.type === 'label');
      expect(labels, citation).toHaveLength(6);
      const expected = ['X-X', row.qualifier === 'series' ? row.varying!.expected : 'X-X', 'X-X'];
      expect(
        labels.filter((_, index) => index % 2 === 0).map((label) => label.text),
        citation,
      ).toEqual(expected);
      expect(
        labels.filter((_, index) => index % 2 === 1).map((label) => label.text),
        citation,
      ).toEqual(expected);
    });
    const test = expectedRed ? it.fails : it;
    test(
      expectedRed
        ? 'str.replace_all.result-qualifier-floor: returns at least simple string'
        : 'joins each argument and preserves the documented string qualifier',
      () => {
        for (const name of ['measured', 'alias']) {
          expect(checked.symbols.find((symbol) => symbol.name === name)?.type, citation).toMatchObject({
            kind: 'string',
            qualifier: row.qualifier === 'series' ? 'series' : 'simple',
          });
        }
      },
    );
  });
}
