import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Literal expectations follow the official v6 entries captured 2026-10-03.
// Dates use Unix epoch zero and explicit fixed UTC offsets, avoiding host
// timezone, daylight-saving transitions, and default number precision.
const stringContracts: Array<{
  member: string;
  entry: number;
  expression: string;
  expected: string;
  rejects: string;
}> = [
  {
    member: 'str.format',
    entry: 89,
    expression: 'str.format("{2}/{0}/{1}/{0}", "alpha", "beta", "gamma")',
    expected: 'gamma/alpha/beta/alpha',
    rejects: 'one-based, sequential, and single-use placeholder substitution',
  },
  {
    member: 'str.format',
    entry: 89,
    expression: 'str.format("\'{\'{0}\'}\'", "X")',
    expected: '{X}',
    rejects: 'treating quoted braces as placeholders or retaining apostrophes',
  },
  {
    member: 'str.format',
    entry: 89,
    expression: `str.format("'{0}' {0}", "X")`,
    expected: '{0} X',
    rejects: 'substitution inside quoted placeholders',
  },
  {
    member: 'str.format',
    entry: 89,
    expression: `str.format("''{0}''", "X")`,
    expected: "'X'",
    rejects: 'retaining doubled apostrophes instead of one literal apostrophe',
  },
  {
    member: 'str.format',
    entry: 89,
    expression: 'str.format("{0,number,#.#}", 1.34)',
    expected: '1.3',
    rejects: 'ignoring the documented precision modifier',
  },
  {
    member: 'str.format',
    entry: 89,
    expression: 'str.format("{0,number,percent} / {1,number,percent}", 0.1, 0.2)',
    expected: '10% / 20%',
    rejects: 'missing percent scaling, swapped arguments, and integer formatting',
  },
  {
    member: 'str.format_time',
    entry: 91,
    expression: 'str.format_time(0, "yyyy-MM-dd HH:mm:ss Z", "UTC")',
    expected: '1970-01-01 00:00:00 +0000',
    rejects: 'missing leading zeros and confusing month M with minute m',
  },
  {
    member: 'str.format_time',
    entry: 91,
    expression: 'str.format_time(0, "yyyy-MM-dd HH:mm:ss Z", "GMT+0530")',
    expected: '1970-01-01 05:30:00 +0530',
    rejects: 'discarding fractional-hour offsets or reversing the offset sign',
  },
  {
    member: 'str.format_time',
    entry: 91,
    expression: 'str.format_time(0, "yyyy-MM-dd HH:mm:ss Z", "UTC-5")',
    expected: '1969-12-31 19:00:00 -0500',
    rejects: 'ignoring offset-induced day/month/year rollover',
  },
  {
    member: 'str.format_time',
    entry: 91,
    expression: 'str.format_time(0, "yyyy \'year\' MM \'month\'", "UTC")',
    expected: '1970 year 01 month',
    rejects: 'interpreting letters in quoted literal text as tokens',
  },
  {
    member: 'str.match',
    entry: 349,
    expression: 'str.match("BUY NASDAQ:AAPL then NYSE:IBM", "[A-Z]+:[A-Z]+")',
    expected: 'NASDAQ:AAPL',
    rejects: 'returning the source, last match, or all matches',
  },
  {
    member: 'str.match',
    entry: 349,
    expression: 'str.match("BUY NASDAQ:AAPL then NYSE:IBM", "([A-Z]+):([A-Z]+)")',
    expected: 'NASDAQ:AAPL',
    rejects: 'returning a capturing group instead of the whole first match',
  },
  {
    member: 'str.match',
    entry: 349,
    expression: 'str.match("id007 / id42", "id\\\\d+")',
    expected: 'id007',
    rejects: 'literal regex handling and losing the escaped backslash',
  },
  {
    member: 'str.match',
    entry: 349,
    expression: 'str.match("no digits here", "[0-9]+")',
    expected: '',
    rejects: 'returning the source, na, or a placeholder on no match',
  },
];

describe('Pine documented formatting and regex contracts', () => {
  for (const row of stringContracts) {
    it(`${row.expression} [functions:${row.entry}]`, () => {
      const citation = `https://www.tradingview.com/pine-script-reference/v6/#fun_${row.member}`;
      const bars = compatibilityBars.slice(0, 3);
      const result = runCompatScript(
        `//@version=6\nindicator("String output")\nlabel.new(bar_index, high, ${row.expression})`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
      const texts = result.drawings.filter((drawing) => drawing.type === 'label').map((drawing) => drawing.text);
      expect(texts).toHaveLength(bars.length);
      expect(texts, `Rejects ${row.rejects}; ${citation}`).toEqual(bars.map(() => row.expected));
    });
  }
});

it('input.enum [functions:55] restricts options to the supplied fields and returns the selected default', () => {
  // https://www.tradingview.com/pine-script-reference/v6/#fun_input.enum
  // Rejects populating all enum fields despite options and selecting the first
  // option instead of defval. No host dropdown rendering is asserted.
  const result = runCompatScript(`//@version=6
indicator("Enum input")
enum Direction
    up = "Rise"
    down = "Fall"
    neutral = "Flat"
choice = input.enum(Direction.down, "Direction", options=[Direction.up, Direction.down])
plot(choice == Direction.down ? 1 : 0, "chosen")
`);
  expect(result.errors).toEqual([]);
  expect(result.inputs).toHaveLength(1);
  expect(result.inputs[0]).toMatchObject({ type: 'enum', display: 31, active: true, confirm: false });
  expect(result.inputs[0].options).toHaveLength(2);
  expect(getPlot(result, 'chosen').values).toEqual(compatibilityBars.map(() => 1));
});
