import type { ExpectedValueVectorFailure } from '../../scripts/run-pine-value-vectors';

import { describe, expect, it } from 'vitest';

import { compatibilityBars, runCompatScript } from './fixtures';

// Literal oracles: pine-v6-reference-v1.json (2026-10-03), functions categoryIndex.
// Reference links identify entries; manual links specify ASCII/empty-pattern
// semantics where the reference uses broader prose.
interface StringContract {
  name: string;
  entry: number;
  member: string;
  expressions: string[];
  expected: string[];
  rejects: string;
  manual?: string;
  openDefect?: string;
  authorityConflict?: string;
}

const contracts: StringContract[] = [
  {
    name: 'lower converts every ASCII uppercase letter and preserves punctuation',
    entry: 337,
    member: 'str.lower',
    expressions: ['str.lower("AZa-z09!")', 'str.lower(source="Mixed CASE")'],
    expected: ['aza-z09!', 'mixed case'],
    rejects: 'identity, first-letter-only conversion, and punctuation removal',
  },
  {
    name: 'upper converts every ASCII lowercase letter',
    entry: 340,
    member: 'str.upper',
    expressions: ['str.upper("azA-Z09!")', 'str.upper(source="Mixed case")'],
    expected: ['AZA-Z09!', 'MIXED CASE'],
    rejects: 'identity, lowercase conversion, and first-letter-only conversion',
  },
  {
    name: 'lower preserves non-ASCII letters while converting ASCII',
    entry: 337,
    member: 'str.lower',
    expressions: ['str.lower("ÉAΩZİ")', 'str.lower(source="ÄBΣ")'],
    expected: ['ÉaΩzİ', 'ÄbΣ'],
    rejects: 'JavaScript Unicode case conversion and preserving all characters',
    manual: 'https://www.tradingview.com/pine-script-docs/concepts/strings/#changing-case',
    openDefect: 'str-lower-converts-non-ascii',
    authorityConflict: 'Reference says all letters; manual changing-case restricts conversion to ASCII.',
  },
  {
    name: 'upper preserves non-ASCII letters including expanding sharp-s',
    entry: 340,
    member: 'str.upper',
    expressions: ['str.upper("éaßzω")', 'str.upper(source="äbσ")'],
    expected: ['éAßZω', 'äBσ'],
    rejects: 'Unicode uppercasing, sharp-s expansion, and preserving ASCII lowercase',
    manual: 'https://www.tradingview.com/pine-script-docs/concepts/strings/#changing-case',
    openDefect: 'str-upper-converts-non-ascii',
    authorityConflict: 'Reference says all letters; manual changing-case restricts conversion to ASCII.',
  },
  {
    name: 'trim removes both ASCII edges and preserves internal whitespace',
    entry: 318,
    member: 'str.trim',
    expressions: ['str.trim(" \\tA B\\n ")', 'str.trim(source="  A\\tB  ")', 'str.trim(" \\t\\n")'],
    expected: ['A B', 'A\tB', ''],
    rejects: 'one-sided trim, spaces-only trim, and removing internal whitespace',
  },
  {
    name: 'trim stops at Unicode whitespace on either edge',
    entry: 318,
    member: 'str.trim',
    expressions: ['str.trim(" \\t A B \\n ")', 'str.trim(source=" X ")'],
    expected: [' A B ', ' X '],
    rejects: 'JavaScript Unicode trim and failure to trim the outer ASCII whitespace',
    manual: 'https://www.tradingview.com/pine-script-docs/concepts/strings/#trimming-whitespaces',
    openDefect: 'str-trim-removes-non-ascii-whitespace',
    authorityConflict: 'Reference says whitespace; manual trimming-whitespaces restricts removal to ASCII.',
  },
  {
    name: 'trim returns empty for a missing string',
    entry: 318,
    member: 'str.trim',
    expressions: ['str.trim(missing)'],
    expected: [''],
    rejects: 'stringifying na as NaN or preserving na',
  },
  {
    name: 'length counts spaces punctuation and BMP letters',
    entry: 355,
    member: 'str.length',
    expressions: ['str.tostring(str.length("A é!"))', 'str.tostring(str.length(string=""))'],
    expected: ['4', '0'],
    rejects: 'UTF-8 byte count, excluding whitespace, and an off-by-one empty length',
  },
  {
    name: 'contains is literal case sensitive and accepts the empty pattern',
    entry: 328,
    member: 'str.contains',
    expressions: [
      'str.tostring(str.contains("a.b", "."))',
      'str.tostring(str.contains("abc", "."))',
      'str.tostring(str.contains(source="Abc", str="a"))',
      'str.tostring(str.contains("", ""))',
    ],
    expected: ['true', 'false', 'false', 'true'],
    rejects: 'regex search, case folding, and empty-pattern refusal',
    manual: 'https://www.tradingview.com/pine-script-docs/concepts/strings/#checking-for-substrings',
  },
  {
    name: 'startswith checks the prefix rather than any occurrence',
    entry: 343,
    member: 'str.startswith',
    expressions: [
      'str.tostring(str.startswith("xab", "ab"))',
      'str.tostring(str.startswith(source="abx", str="ab"))',
      'str.tostring(str.startswith("ABx", "ab"))',
      'str.tostring(str.startswith("", ""))',
    ],
    expected: ['false', 'true', 'false', 'true'],
    rejects: 'contains, suffix matching, case folding, and empty-pattern refusal',
    manual: 'https://www.tradingview.com/pine-script-docs/concepts/strings/#checking-for-substrings',
  },
  {
    name: 'endswith checks the suffix rather than any occurrence',
    entry: 346,
    member: 'str.endswith',
    expressions: [
      'str.tostring(str.endswith("abx", "ab"))',
      'str.tostring(str.endswith(source="xab", str="ab"))',
      'str.tostring(str.endswith("xAB", "ab"))',
      'str.tostring(str.endswith("", ""))',
    ],
    expected: ['false', 'true', 'false', 'true'],
    rejects: 'contains, prefix matching, case folding, and empty-pattern refusal',
    manual: 'https://www.tradingview.com/pine-script-docs/concepts/strings/#checking-for-substrings',
  },
  {
    name: 'pos returns the first zero-based position or na',
    entry: 351,
    member: 'str.pos',
    expressions: [
      'str.tostring(str.pos("zabxab", "ab"))',
      'str.tostring(str.pos(source="abc", str="a"))',
      'str.tostring(str.pos("abc", "X"))',
    ],
    expected: ['1', '0', 'NaN'],
    rejects: 'last occurrence, one-based indexing, and JavaScript minus-one miss sentinel',
  },
  {
    name: 'substring has inclusive start exclusive end and defaults end to length',
    entry: 331,
    member: 'str.substring',
    expressions: [
      'str.substring("ABCDE", 1, 4)',
      'str.substring(source="ABCDE", begin_pos=2)',
      'str.substring("ABCDE", 2, 2)',
    ],
    expected: ['BCD', 'CDE', ''],
    rejects: 'inclusive end, one-based positions, end as count, and nonempty equal bounds',
  },
  {
    name: 'replace selects a zero-based occurrence without changing the source',
    entry: 334,
    member: 'str.replace',
    expressions: [
      'str.replace(original, "ab", "X", 1)',
      'str.replace(source=original, target="ab", replacement="X")',
      'str.replace(original, "ab", "X", 4)',
      'original',
    ],
    expected: ['ab/X/ab', 'X/ab/ab', 'ab/ab/ab', 'ab/ab/ab'],
    rejects: 'one-based occurrence, replace-all, mutating source, and replacing last on a miss',
  },
  {
    name: 'replace_all uses a literal target and literal replacement',
    entry: 326,
    member: 'str.replace_all',
    expressions: [
      'str.replace_all("a.a.a", ".", "$&")',
      'str.replace_all(source="abcabc", target="ab", replacement="X")',
    ],
    expected: ['a$&a$&a', 'XcXc'],
    rejects: 'regex target, JavaScript replacement expansion, and first-occurrence-only replacement',
  },
  {
    name: 'replace_all with empty target inserts at both outer boundaries',
    entry: 326,
    member: 'str.replace_all',
    expressions: ['str.replace_all("ab", "", "-")', 'str.replace_all(source="", target="", replacement="-")'],
    expected: ['-a-b-', '-'],
    rejects: 'split/join omitting outer boundaries and treating empty target as no-op',
    manual: 'https://www.tradingview.com/pine-script-docs/concepts/strings/#replacing-substrings',
  },
  {
    name: 'repeat injects separators only between instances and supports zero',
    entry: 322,
    member: 'str.repeat',
    expressions: [
      'str.repeat("ab", 3, "/")',
      'str.repeat(source="xy", repeat=2)',
      'str.repeat("ab", 0, "/")',
      'str.repeat("ab", 1, "/")',
    ],
    expected: ['ab/ab/ab', 'xyxy', '', 'ab'],
    rejects: 'leading/trailing separator, repeat as extra copies, and zero as one',
  },
  {
    name: 'repeat preserves the native empty missing-string representation',
    entry: 322,
    member: 'str.repeat',
    expressions: ['str.tostring(str.repeat(missing, 3))', 'na(str.repeat(missing, 3)) ? "missing" : "present"'],
    expected: ['', 'missing'],
    rejects: 'stringifying missing as NaN or treating the empty result as present',
    manual: 'V56 v5/v6 declared-missing equality=empty and length=0; empty NA flag=1.',
  },
  {
    name: 'tonumber parses decimal digits with an initial sign',
    entry: 314,
    member: 'str.tonumber',
    expressions: [
      'str.tostring(str.tonumber("-12.5"))',
      'str.tostring(str.tonumber(string="+007.25"))',
      'str.tostring(str.tonumber("0"))',
    ],
    expected: ['-12.5', '7.25', '0'],
    rejects: 'integer truncation, sign loss, and rejecting plus or leading zeros',
  },
  {
    name: 'tonumber rejects malformed nondecimal and Unicode representations',
    entry: 314,
    member: 'str.tonumber',
    expressions: [
      'str.tostring(str.tonumber("0x10"))',
      'str.tostring(str.tonumber("12x"))',
      'str.tostring(str.tonumber("1,200"))',
      'str.tostring(str.tonumber("１２"))',
      'str.tostring(str.tonumber(""))',
    ],
    expected: ['NaN', 'NaN', 'NaN', 'NaN', 'NaN'],
    rejects: 'Number hex/empty coercion, parseFloat prefix parsing, grouping removal, and Unicode digit parsing',
    manual: 'https://www.tradingview.com/pine-script-docs/concepts/strings/#converting-values-to-strings',
  },
  {
    name: 'tonumber rejects exponent notation',
    entry: 314,
    member: 'str.tonumber',
    expressions: ['str.tostring(str.tonumber("1e2"))', 'str.tostring(str.tonumber(string="-2E-1"))'],
    expected: ['NaN', 'NaN'],
    rejects: 'JavaScript numeric grammar accepting scientific notation',
    manual: 'https://www.tradingview.com/pine-script-docs/concepts/strings/#converting-values-to-strings',
  },
  {
    name: 'tonumber rejects whitespace rather than trimming it',
    entry: 314,
    member: 'str.tonumber',
    expressions: [
      'str.tostring(str.tonumber(" 12"))',
      'str.tostring(str.tonumber(string="12\\t"))',
      'str.tostring(str.tonumber("12\\n"))',
    ],
    expected: ['NaN', 'NaN', 'NaN'],
    rejects: 'trimming ASCII whitespace before parsing',
    manual: 'https://www.tradingview.com/pine-script-docs/concepts/strings/#converting-values-to-strings',
  },
  {
    name: 'tostring preserves strings and spells booleans and na',
    entry: 309,
    member: 'str.tostring',
    expressions: ['str.tostring("001.20")', 'str.tostring(true)', 'str.tostring(false)', 'str.tostring(na)'],
    expected: ['001.20', 'true', 'false', 'NaN'],
    rejects: 'numeric coercion of strings, boolean digits, and empty na',
  },
  {
    name: 'tostring mandatory zeros retain trailing fractional places',
    entry: 310,
    member: 'str.tostring',
    expressions: ['str.tostring(12.5, "#.000")', 'str.tostring(3.99, "#")'],
    expected: ['12.500', '4'],
    rejects: 'dropping required trailing zeros and truncation rather than rounding',
  },
  {
    name: 'tostring omitted format rounds to ten optional fractional digits',
    entry: 312,
    member: 'str.tostring',
    expressions: [
      'str.tostring(78477.59079999999)',
      'str.tostring(1.23456789012345)',
      'str.tostring(-1.00000000006)',
      'str.tostring(1.00000000006)',
      'str.tostring(4e-11)',
    ],
    expected: ['78477.5908', '1.2345678901', '-1.0000000001', '1.0000000001', '0'],
    rejects: 'raw JavaScript precision, eight-digit rounding, and unrounded small fractions',
  },
  {
    name: 'tostring optional decimal digits omit zeros while mandatory digits retain them',
    entry: 312,
    member: 'str.tostring',
    expressions: ['str.tostring(1.2, "#.0#")', 'str.tostring(1.2, "#.00")', 'str.tostring(1.2, "#.##########")'],
    expected: ['1.2', '1.20', '1.2'],
    rejects: 'padding optional digits or removing mandatory digits',
  },
  {
    name: 'split uses the whole literal separator and preserves substring order',
    entry: 354,
    member: 'str.split',
    expressions: [
      'array.join(str.split("az::b::ccc", "::"), "/")',
      'array.join(str.split(string="a.b.c", separator="."), "/")',
    ],
    expected: ['az/b/ccc', 'a/b/c'],
    rejects: 'regex splitting, splitting on individual separator characters, and reversing array order',
  },
];

describe('Pine documented string contracts', () => {
  for (const contract of contracts) {
    const citation = `https://www.tradingview.com/pine-script-reference/v6/#fun_${contract.member}`;
    const expectedFailure: ExpectedValueVectorFailure | undefined = contract.openDefect
      ? {
          ownerLane: 'runtime/strategy',
          reason: 'open-defect',
          openDefect: contract.openDefect,
          cause: contract.authorityConflict ?? contract.rejects,
          citation,
        }
      : undefined;
    const defectTitle = expectedFailure
      ? ` [EXPECTED-RED: ${expectedFailure.openDefect}]${contract.authorityConflict ? ' [AUTHORITY-CONFLICT]' : ''}`
      : '';
    it(`${contract.name} [functions:${contract.entry}]${defectTitle}`, () => {
      const bars = compatibilityBars.slice(0, 3);
      const result = runCompatScript(
        `//@version=6
indicator("Documented strings")
string missing = na
original = "ab/ab/ab"
${contract.expressions.map((expression) => `label.new(bar_index, high, text=${expression})`).join('\n')}
`,
        { bars },
      );

      expect(result.errors, citation).toEqual([]);
      expect(result.profile?.compiledBarErrors?.count ?? 0, citation).toBe(0);
      const texts = result.drawings.filter((drawing) => drawing.type === 'label').map((drawing) => drawing.text);
      const assertDocumented = () => {
        expect(texts, `Rejects ${contract.rejects}; ${citation}; ${contract.manual ?? ''}`).toEqual(
          bars.flatMap(() => contract.expected),
        );
      };
      // Only value assertions register expected-red; execution/output failures
      // stay fatal. All six raw cases passed under an isolated documented patch;
      // builtin value flips/split reversal failed ordinary cases. Copy discarded.
      expect(texts).toHaveLength(bars.length * contract.expected.length);
      if (expectedFailure) {
        expect(assertDocumented, JSON.stringify(expectedFailure)).toThrowError();
      } else {
        assertDocumented();
      }
    });
  }
});

for (const collection of [
  {
    name: 'array',
    expression: 'array.from(78477.59079999999, 1.23456789012345)',
    expected: ['78477.5908', '1.2345678901'],
  },
  { name: 'matrix', expression: 'matrix.new<float>(1, 1, 1.23456789012345)', expected: ['1.2345678901'] },
]) {
  it(`str.tostring omitted ${collection.name} format rounds every numeric element [functions:312]`, () => {
    const citation = 'https://www.tradingview.com/pine-script-reference/v6/#fun_str.tostring';
    const bars = compatibilityBars.slice(0, 3);
    const result = runCompatScript(
      `//@version=6
indicator("Collection numeric text")
label.new(bar_index, high, str.tostring(${collection.expression}))`,
      { bars },
    );
    expect(result.errors, citation).toEqual([]);
    expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
    const texts = result.drawings.filter((drawing) => drawing.type === 'label').map((drawing) => drawing.text);
    expect(texts).toHaveLength(bars.length);
    for (const text of texts)
      expect(text?.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi), citation).toEqual(collection.expected);
  });
}
