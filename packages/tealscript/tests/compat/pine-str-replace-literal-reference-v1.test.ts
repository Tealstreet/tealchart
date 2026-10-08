import { beforeAll, describe, expect, it } from 'vitest';

import { compatibilityBars, runCompatScript } from './fixtures';

const citation = 'https://www.tradingview.com/pine-script-reference/v6/#fun_str.replace';
const original = 'left/ab/right/ab/end';
const replacements = ['$&', '$$', '$`', "$'"];
const firstCalls = [
  `str.replace(original, "ab", "$&")`,
  `str.replace(original, "ab", "$$", 0)`,
  'str.replace(replacement="$`", occurrence=0, target="ab", source=original)',
  'str.replace(target="ab", source=original, replacement="$\'")',
];

interface ReplacementCase {
  name: string;
  entry: number;
  setup: string;
  expression: string;
  expected: string[];
}

// functions:334/336 describe replacement as the string inserted, with zero-based
// occurrence defaulting to zero. These literal oracles reject JS token expansion.
const cases: ReplacementCase[] = replacements.flatMap((replacement, index) => [
  {
    name: `first occurrence inserts ${replacement} literally`,
    entry: 334,
    setup: `original = ${JSON.stringify(original)}`,
    expression: firstCalls[index],
    expected: Array(3).fill(`left/${replacement}/right/ab/end`),
  },
  {
    name: `second occurrence inserts ${replacement} literally and preserves the first`,
    entry: 334,
    setup: `original = ${JSON.stringify(original)}`,
    expression: `str.replace(original, "ab", ${JSON.stringify(replacement)}, 1)`,
    expected: Array(3).fill(`left/ab/right/${replacement}/end`),
  },
]);

cases.push({
  name: 'series source and replacement retain literal text at occurrence zero',
  entry: 336,
  setup: `original = bar_index == 1 ? "X.ab.Y.ab.Z" : "A.ab.B.ab.C"
replacement = bar_index == 1 ? "$$" : "$&"`,
  expression: 'str.replace(source=original, target="ab", replacement=replacement, occurrence=0)',
  expected: ['A.$&.B.ab.C', 'X.$$.Y.ab.Z', 'A.$&.B.ab.C'],
});

for (const testCase of cases) {
  describe(`${testCase.name} [functions:${testCase.entry}]`, () => {
    let texts: Array<string | undefined>;

    beforeAll(() => {
      const result = runCompatScript(
        `//@version=6
indicator("Literal single replacement")
${testCase.setup}
label.new(bar_index, high, text=${testCase.expression})
label.new(bar_index, high, text=original)`,
        { bars: compatibilityBars.slice(0, 3) },
      );
      expect(result.errors, citation).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
      const labels = result.drawings.filter((drawing) => drawing.type === 'label');
      expect(labels, citation).toHaveLength(6);
      expect(
        labels.filter((_, index) => index % 2 === 1).map((label) => label.text),
        citation,
      ).toEqual(testCase.entry === 336 ? ['A.ab.B.ab.C', 'X.ab.Y.ab.Z', 'A.ab.B.ab.C'] : Array(3).fill(original));
      texts = labels.filter((_, index) => index % 2 === 0).map((label) => label.text);
    });

    const assertLiteralReplacement = () => {
      expect(texts, `${citation}; replacement is inserted, not interpreted as a JS replacement pattern`).toEqual(
        testCase.expected,
      );
    };
    it('inserts the documented replacement string', assertLiteralReplacement);
  });
}
