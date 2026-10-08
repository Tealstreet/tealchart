import { beforeAll, describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, runCompatScript } from './fixtures';

const contracts = [
  {
    member: 'substring',
    entries: [331, 332, 333],
    expected: 'bcd',
    args: [
      {
        name: 'source',
        variable: 'sourceText',
        kind: 'string',
        value: '"abcde"',
        alternate: '"VWXYZ"',
        expected: 'WXY',
      },
      { name: 'begin_pos', variable: 'beginIndex', kind: 'int', value: '1', alternate: '2', expected: 'cd' },
      { name: 'end_pos', variable: 'endIndex', kind: 'int', value: '4', alternate: '3', expected: 'bc' },
    ],
  },
  {
    member: 'replace',
    entries: [334, 335, 336],
    expected: 'X-ab',
    args: [
      {
        name: 'source',
        variable: 'sourceText',
        kind: 'string',
        value: '"ab-ab"',
        alternate: '"ab/ab"',
        expected: 'X/ab',
      },
      { name: 'target', variable: 'targetText', kind: 'string', value: '"ab"', alternate: '"-"', expected: 'abXab' },
      {
        name: 'replacement',
        variable: 'replacementText',
        kind: 'string',
        value: '"X"',
        alternate: '"Y"',
        expected: 'Y-ab',
      },
      { name: 'occurrence', variable: 'occurrenceIndex', kind: 'int', value: '0', alternate: '1', expected: 'ab-X' },
    ],
  },
] as const;

// Frozen v6 overloads: substring331-333, replace334-336; each argument can set the floor.
// ASCII oracles use inclusive begin/exclusive end and zero-based replacement occurrence.
// Input-result floors, missing values, invalid indices and replacement tokens are separate.
for (const contract of contracts) {
  const rows = [
    { varying: null, qualifier: 'const' },
    ...contract.args.flatMap((argument) => [
      { varying: argument, qualifier: 'simple' },
      { varying: argument, qualifier: 'series' },
    ]),
  ] as const;
  for (const row of rows) {
    for (const binding of ['positional', 'named'] as const) {
      const citation = `https://www.tradingview.com/pine-script-reference/v6/#fun_str.${contract.member}`;
      describe(`str.${contract.member}: ${row.qualifier} ${row.varying?.name ?? 'all'} ${binding} [functions:${contract.entries.join(',')}]`, () => {
        let checked: ReturnType<typeof checkProgram>;
        let texts: Array<string | undefined>;
        let aliases: Array<string | undefined>;
        beforeAll(() => {
          const declarations = contract.args
            .map((argument) => {
              const qualifier = argument === row.varying ? row.qualifier : 'const';
              const value =
                qualifier === 'series' ? `bar_index == 1 ? ${argument.alternate} : ${argument.value}` : argument.value;
              return `${qualifier} ${argument.kind} ${argument.variable} = ${value}`;
            })
            .join('\n');
          const argumentsText =
            binding === 'positional'
              ? contract.args.map((argument) => argument.variable).join(', ')
              : [...contract.args]
                  .reverse()
                  .map((argument) => `${argument.name}=${argument.variable}`)
                  .join(', ');
          const source = `//@version=6
indicator("String argument qualifiers")
${declarations}
measured = str.${contract.member}(${argumentsText})
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
        });
        it('joins all documented argument qualifiers and preserves the result through an alias', () => {
          for (const argument of contract.args) {
            expect(checked.symbols.find((symbol) => symbol.name === argument.variable)?.type, citation).toMatchObject({
              kind: argument.kind,
              qualifier: argument === row.varying ? row.qualifier : 'const',
            });
          }
          for (const name of ['measured', 'alias']) {
            expect(checked.symbols.find((symbol) => symbol.name === name)?.type, citation).toMatchObject({
              kind: 'string',
              qualifier: row.qualifier,
            });
          }
          const expected = [
            contract.expected,
            row.qualifier === 'series' ? row.varying!.expected : contract.expected,
            contract.expected,
          ];
          expect(texts, citation).toEqual(expected);
          expect(aliases, citation).toEqual(expected);
        });
      });
    }
  }
}
