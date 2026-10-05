import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// First-party v6 allowedTypeIDs: median functions162/163, mode166/167,
// mom218 length accepts const/input/simple/series int; source remains numeric.
// https://www.tradingview.com/pine-script-reference/v6/#fun_ta.median
// https://www.tradingview.com/pine-script-reference/v6/#fun_ta.mode
// https://www.tradingview.com/pine-script-reference/v6/#fun_ta.mom
// Integration finding: authority-review/ta-c-integration-inputs-v2.json.
const members = ['ta.median', 'ta.mode', 'ta.mom'] as const;
function diagnostics(call: string) {
  return checkProgram(parse(`//@version=6\nindicator("TA integer length")\nplot(${call})\n`)).diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error',
  );
}
const floatLengths = [
  '3.0',
  '4.0',
  '3.5',
  'input.float(3.0)',
  'float(timeframe.multiplier)',
  'float(bar_index + 1)',
  'float(3)',
];
const integerLengths = ['3', 'input.int(3)', 'timeframe.multiplier', 'bar_index % 2 + 1', 'int(3.0)'];
describe('TA-C integer-only length slots', () => {
  it.each(members.flatMap((member) => floatLengths.map((length) => ({ member, length }))))(
    'refuses float kind in $member length=$length',
    ({ member, length }) => {
      expect(diagnostics(`${member}(length=${length}, source=close)`)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('integer') }),
        ]),
      );
    },
  );
  it.each(members.flatMap((member) => integerLengths.map((length) => ({ member, length }))))(
    'accepts integer qualifiers in $member length=$length',
    ({ member, length }) => {
      expect(diagnostics(`${member}(close, length=${length})`)).toEqual([]);
    },
  );
  it.each(members.flatMap((member) => ['true', '"3"'].map((length) => ({ member, length }))))(
    'retains nonnumeric refusal in $member length=$length',
    ({ member, length }) => {
      expect(diagnostics(`${member}(close, ${length})`)).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]),
      );
    },
  );
  it.each(members)('retains numeric float source in %s', (member) => {
    expect(diagnostics(`${member}(14.5, 3)`)).toEqual([]);
  });
});
