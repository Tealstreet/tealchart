import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: archived pine-v6-reference-v1.json (2026-10-03), type_int,
// type_float, type_bool, type_string and type_color, with their linked manuals.
// Expected label text is host-written, independent of Pine literal decoding.

// Red proof: incremented numbers (8), inverted booleans (1), zero for na (1),
// reversed string contents (10), swapped red/blue bytes (3). All twenty-three
// failed in an isolated emitter copy, then passed after restoration.

// Multiline proof: both strengthened cases failed against the original parser.
// Documented delimiter/preprocessing fixes passed all 24 ordinary assertions;
// string reversal failed all 11 string cases, then restoration passed. Copy discarded.
const reference = 'https://www.tradingview.com/pine-script-reference/v6/';
const typesManual = 'https://www.tradingview.com/pine-script-docs/language/type-system/';
const stringsManual = 'https://www.tradingview.com/pine-script-docs/concepts/strings/';
const bars = compatibilityBars.slice(0, 2);
const multilineText = "a'\u00a0\"\nlet text = 3\nif true\n   B\n\tC\n";

interface LiteralCase {
  name: string;
  entry: string;
  rule: string;
  rejects: string;
  body: string;
  output: 'plot' | 'label';
  expected: number | null | string;
}

const cases: LiteralCase[] = [
  ...[
    { name: 'decimal integer', entry: 'int', literal: '47', expected: 47 },
    { name: 'explicit positive integer', entry: 'int', literal: '+47', expected: 47 },
    { name: 'negative integer', entry: 'int', literal: '-47', expected: -47 },
    { name: 'decimal fraction', entry: 'float', literal: '1.25', expected: 1.25 },
    { name: 'negative decimal fraction', entry: 'float', literal: '-0.75', expected: -0.75 },
    { name: 'decimal mantissa with exponent', entry: 'float', literal: '0.025e2', expected: 2.5 },
    { name: 'integer mantissa with negative exponent', entry: 'float', literal: '2e-3', expected: 0.002 },
    { name: 'uppercase exponent with explicit positive sign', entry: 'float', literal: '1.5E+2', expected: 150 },
  ].map(({ name, entry, literal, expected }): LiteralCase => ({
    name: `${name} retains its documented numeric value`,
    entry: `type_${entry}`,
    rule: `${typesManual}#${entry}: decimal digits, optional sign, exponent means X times ten to Y`,
    rejects: 'ignored sign, fractional truncation, mantissa only, wrong exponent sign or base',
    body: `${entry} value = ${literal}\nplot(value, "Result")`,
    output: 'plot',
    expected,
  })),
  {
    name: 'boolean literals select their respective true and false branches',
    entry: 'type_bool',
    rule: 'description: only true and false boolean values',
    rejects: 'inverted literals, both literals true, both literals false, branches swapped',
    body: 'plot((true ? 8 : -3) + (false ? 7 : 2), "Result")',
    output: 'plot',
    expected: 10,
  },
  {
    name: 'typed float na literal produces unavailable numeric output',
    entry: 'type_float',
    rule: 'remarks: explicit type required for na initialization; var_na denotes not available',
    rejects: 'zero substituted for na, string na, stale numeric value, skipped output',
    body: 'float value = na\nplot(value, "Result")',
    output: 'plot',
    expected: null,
  },
  ...[
    { name: 'double-quoted string', literal: '"aBcd"', expected: 'aBcd' },
    { name: 'single-quoted string', literal: "'aBcd'", expected: 'aBcd' },
    { name: 'apostrophe within quotation marks', literal: `"a'B"`, expected: "a'B" },
    { name: 'quotation mark within apostrophes', literal: `'a"B'`, expected: 'a"B' },
    { name: 'escaped closing quotation mark', literal: String.raw`"a\"B"`, expected: 'a"B' },
    { name: 'escaped closing apostrophe', literal: String.raw`'a\'B'`, expected: "a'B" },
    { name: 'escaped backslash', literal: String.raw`"a\\B"`, expected: 'a\\B' },
    { name: 'escaped newline', literal: String.raw`"a\nB"`, expected: 'a\nB' },
    { name: 'escaped horizontal tab', literal: String.raw`"a\tB"`, expected: 'a\tB' },
    { name: 'multiline quotation-mark string with indentation', literal: '"""' + multilineText + '"""', expected: multilineText },
    {
      name: 'multiline apostrophe string with indentation',
      literal: "'''" + multilineText + "'''",
      expected: multilineText,
    },
  ].map(({ name, literal, expected }): LiteralCase => ({
    name: `${name} reaches label text without changing characters`,
    entry: 'type_string',
    rule: `${stringsManual}#literal-strings, #multiline-strings and #escape-sequences: preserve literal text, decode documented escapes, retain multiline whitespace`,
    rejects: 'reversed text, quotes retained or lost, literal escape letters, newline/tab conflation, trimmed indentation',
    body: `string text = ${literal}\nlabel.new(bar_index, close, text=text)`,
    output: 'label',
    expected,
  })),
  ...[
    { name: 'RGB literal with mixed-case hex digits', literal: '#1a2B3C', expected: 26436000 },
    { name: 'RGBA literal with invisible alpha', literal: '#1A2b3C00', expected: 26436100 },
    { name: 'RGBA literal with opaque alpha', literal: '#1a2B3cFF', expected: 26436000 },
  ].map(({ name, literal, expected }): LiteralCase => ({
    name: `${name} preserves ordered channels and endpoint transparency`,
    entry: 'type_color',
    rule: 'remarks: RRGGBB[AA] bytes, case insensitive, default FF; 00 invisible and FF opaque; color.r/g/b/t expose components',
    rejects: 'channel swapping, hexadecimal treated as decimal, implicit alpha zero, inverted alpha endpoints',
    body: `color value = ${literal}\nplot(color.r(value) * 1000000 + color.g(value) * 10000 + color.b(value) * 100 + color.t(value), "Result")`,
    output: 'plot',
    expected,
  })),
];

function literalValues(testCase: LiteralCase): Array<number | null | string | undefined> {
  const result = runCompatScript(`//@version=6\nindicator("Literals reference")\n${testCase.body}`, { bars });
  expect(result.errors).toEqual([]);
  expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
  if (testCase.output === 'plot') {
    const values = getPlot(result, 'Result').values;
    expect(values).toHaveLength(bars.length);
    return values;
  }
  const labels = result.drawings.filter((drawing) => drawing.type === 'label');
  expect(labels).toHaveLength(bars.length);
  return labels.map((label) => label.text);
}

describe('Pine v6 literal reference behavior', () => {
  for (const testCase of cases) {
    const title = `${testCase.name} [${reference}#${testCase.entry}; ${testCase.rule}; rejects ${testCase.rejects}]`;
    const expected = bars.map(() => testCase.expected);
    it(title, () => {
      expect(literalValues(testCase)).toEqual(expected);
    });
  }
});
