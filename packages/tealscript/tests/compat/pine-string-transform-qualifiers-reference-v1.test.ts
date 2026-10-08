import { beforeAll, describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, runCompatScript } from './fixtures';

const transforms = [
  {
    member: 'trim',
    entries: [318, 319, 320, 321],
    source: '  Ab 09!  ',
    alternate: ' X y ',
    value: 'Ab 09!',
    alternateValue: 'X y',
    qualifiers: ['const', 'input', 'simple', 'series'],
  },
  {
    member: 'lower',
    entries: [337, 338, 339],
    source: 'Ab 09!',
    alternate: 'X y',
    value: 'ab 09!',
    alternateValue: 'x y',
    qualifiers: ['const', 'simple', 'series'],
  },
  {
    member: 'upper',
    entries: [340, 341, 342],
    source: 'Ab 09!',
    alternate: 'X y',
    value: 'AB 09!',
    alternateValue: 'X Y',
    qualifiers: ['const', 'simple', 'series'],
  },
] as const;

function declaration(qualifier: string, source: string, alternate: string): string {
  if (qualifier === 'input') return `sourceValue = input.string(${JSON.stringify(source)})`;
  const expression =
    qualifier === 'series'
      ? `bar_index == 1 ? ${JSON.stringify(alternate)} : ${JSON.stringify(source)}`
      : JSON.stringify(source);
  return `${qualifier} string sourceValue = ${expression}`;
}

// Frozen v6 reference overloads: trim318-321, lower337-339, upper340-342.
// ASCII case and trim outputs below are hand-derived; internal spaces and digits remain.
// Input case conversion, Unicode and missing values have separate authority boundaries.
for (const transform of transforms) {
  for (const qualifier of transform.qualifiers) {
    for (const binding of ['positional', 'named'] as const) {
      const citation = `https://www.tradingview.com/pine-script-reference/v6/#fun_str.${transform.member}`;
      describe(`str.${transform.member}: ${qualifier} ${binding} [functions:${transform.entries.join(',')}]`, () => {
        let checked: ReturnType<typeof checkProgram>;
        let texts: Array<string | undefined>;
        let aliases: Array<string | undefined>;
        beforeAll(() => {
          const argument = binding === 'named' ? 'source=sourceValue' : 'sourceValue';
          const source = `//@version=6
indicator("String transform qualifiers")
${declaration(qualifier, transform.source, transform.alternate)}
measured = str.${transform.member}(${argument})
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
        it('preserves the documented string qualifier and transformed text through an alias', () => {
          for (const name of ['sourceValue', 'measured', 'alias']) {
            expect(checked.symbols.find((symbol) => symbol.name === name)?.type, citation).toMatchObject({
              kind: 'string',
              qualifier,
            });
          }
          const expected = [
            transform.value,
            qualifier === 'series' ? transform.alternateValue : transform.value,
            transform.value,
          ];
          expect(texts, citation).toEqual(expected);
          expect(aliases, citation).toEqual(expected);
        });
      });
    }
  }
}
