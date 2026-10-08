import { beforeAll, describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, runCompatScript } from './fixtures';

const contracts = [
  {
    member: 'format',
    entries: [89, 90],
    sourceKind: 'string',
    value: '"A"',
    alternateValue: '"B"',
    format: '"v={0}"',
    alternateFormat: '"alt={0}"',
    expected: 'v=A',
    expectedValue: 'v=B',
    expectedFormat: 'alt=A',
  },
  {
    member: 'tostring',
    entries: [312, 313],
    sourceKind: 'float',
    value: '12.5',
    alternateValue: '7.25',
    format: '"#.00"',
    alternateFormat: '"#.0"',
    expected: '12.50',
    expectedValue: '7.25',
    expectedFormat: '12.5',
  },
] as const;
const rows = [
  { slot: null, qualifier: 'const' },
  ...(['format', 'value'] as const).flatMap((slot) =>
    ['input', 'simple', 'series'].map((qualifier) => ({ slot, qualifier })),
  ),
] as const;

function declaration(name: string, kind: string, qualifier: string, value: string, alternate: string): string {
  if (qualifier === 'input') return `${name} = input.${kind}(${value})`;
  const expression = qualifier === 'series' ? `bar_index == 1 ? ${alternate} : ${value}` : value;
  return `${qualifier} ${kind} ${name} = ${expression}`;
}

// Frozen v6 format89/90 and two-argument tostring312/313 have simple/series returns.
// Independent oracles: "v={0}" with "A" -> "v=A"; 12.5 at two decimal places -> "12.50".
// Native floors remain unobserved; one-argument tostring and rounding boundaries are separate.
for (const contract of contracts) {
  for (const row of rows) {
    const expectedRed = row.qualifier === 'const' || row.qualifier === 'input';
    const citation = `https://www.tradingview.com/pine-script-reference/v6/#fun_str.${contract.member}`;
    describe(`str.${contract.member}: ${row.qualifier} ${row.slot ?? 'all'} [functions:${contract.entries.join(',')}]`, () => {
      let checked: ReturnType<typeof checkProgram>;
      beforeAll(() => {
        const valueQualifier = row.slot === 'value' ? row.qualifier : 'const';
        const formatQualifier = row.slot === 'format' ? row.qualifier : 'const';
        const argumentsText = contract.member === 'format' ? 'formatText, sourceValue' : 'sourceValue, formatText';
        const source = `//@version=6
indicator("Formatted string qualifier floors")
${declaration('sourceValue', contract.sourceKind, valueQualifier, contract.value, contract.alternateValue)}
${declaration('formatText', 'string', formatQualifier, contract.format, contract.alternateFormat)}
measured = str.${contract.member}(${argumentsText})
alias = measured
label.new(bar_index, high, measured)
label.new(bar_index, low, alias)`;
        checked = checkProgram(parse(source));
        expect(checked.diagnostics, citation).toEqual([]);
        expect(checked.symbols.find((symbol) => symbol.name === 'sourceValue')?.type, citation).toMatchObject({
          kind: contract.sourceKind,
          qualifier: valueQualifier,
        });
        expect(checked.symbols.find((symbol) => symbol.name === 'formatText')?.type, citation).toMatchObject({
          kind: 'string',
          qualifier: formatQualifier,
        });
        const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
        expect(result.errors, citation).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
        const labels = result.drawings.filter((drawing) => drawing.type === 'label');
        expect(labels, citation).toHaveLength(6);
        const middle =
          row.qualifier === 'series'
            ? row.slot === 'format'
              ? contract.expectedFormat
              : contract.expectedValue
            : contract.expected;
        const expected = [contract.expected, middle, contract.expected];
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
          ? `str.${contract.member}.formatted-result-qualifier-floor: returns at least simple string`
          : 'joins value and format qualifiers through an alias',
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
}
