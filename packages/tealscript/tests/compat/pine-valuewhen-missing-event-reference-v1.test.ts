import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const bars = [10, 21, 12, 23, 14, 25, 16].map((close, index) => ({
  time: 1_700_000_000_000 + index * 60_000,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 100,
}));

// Source is retrieved from the nth true event, including a missing event value.
// Off-event values do not consume ranks. Assert after two events exist.
// https://www.tradingview.com/pine-script-reference/v6/#fun_ta.valuewhen
describe('documented valuewhen event rank with a missing source', () => {
  for (const kind of ['int', 'float']) {
    it(`a missing ${kind} event occupies its occurrence rank`, () => {
      const result = runCompatScript(
        `//@version=6
indicator("Missing event value")
${kind} source = bar_index == 3 ? na : ${kind}(close)
event = bar_index == 1 or bar_index == 3 or bar_index == 5
plot(ta.valuewhen(event, source, 0), "Current")
plot(ta.valuewhen(occurrence=1, source=source, condition=event), "Previous")`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      const current = getPlot(result, 'Current').values;
      const previous = getPlot(result, 'Previous').values;
      expect(current).toHaveLength(7);
      expect(previous).toHaveLength(7);
      expect(current.slice(3)).toEqual([null, null, 25, 25]);
      expect(previous.slice(3)).toEqual([21, 21, null, null]);
    });
  }
});
