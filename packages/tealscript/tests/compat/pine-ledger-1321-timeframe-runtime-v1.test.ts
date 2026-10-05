import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json, functions203/204.
describe('ledger1342–1345 timeframe.from_seconds duration selection', () => {
  // Ranks1342–1344: explicit boundary examples and cap from remarks0–2, excluding guessed month durations.
  it.each([
    [-1, '1S'], [0, '1S'], [1, '1S'], [2, '5S'], [5, '5S'],
    [604799, '7D'], [604800, '1W'], [31622401, '12M'],
  ] as const)('converts documented %s seconds to %s', (seconds, expected) => {
    const result = runCompatScript(`//@version=6\nindicator("Duration boundary")\nplot(timeframe.from_seconds(${seconds}) == "${expected}" ? 1 : 0, title="Match")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Match').values).toEqual(compatibilityBars.map(() => 1));
  });

  // Rank1345: next higher valid duration; 7D <604801 seconds<8D<2W.
  it('chooses the next valid daily duration before two weeks', () => {
    const result = runCompatScript('//@version=6\nindicator("Next duration")\nplot(timeframe.from_seconds(604801) == "8D" ? 1 : 0, title="Match")');
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Match').values).toEqual(compatibilityBars.map(() => 1));
  });
});
