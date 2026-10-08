import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// V5 missing bool is not true; only true events reset bars-since counting.
describe('V5 barssince counts through missing conditions', () => {
  for (const named of [false, true]) {
    it(`named=${named} counts missing and false bars after true events`, () => {
      const bars = Array.from({ length: 7 }, (_, index) => ({
        time: 1700000000000 + index * 60000,
        open: 1,
        high: 2,
        low: 0,
        close: 1,
        volume: 10,
      }));
      const call = named ? 'ta.barssince(condition=event)' : 'ta.barssince(event)';
      const result = runCompatScript(
        `//@version=5
indicator("Missing condition event count")
bool event=(bar_index == 0 or bar_index == 4) ? true : (bar_index == 1 or bar_index == 2 or bar_index == 5) ? na : false
plot(${call},"Bars since")
plot(na(event) ? 1 : 0,"Source missing")`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      expect(getPlot(result, 'Source missing').values).toEqual([0, 1, 1, 0, 0, 1, 0]);
      expect(getPlot(result, 'Bars since').values).toEqual([0, 1, 2, 3, 0, 1, 2]);
    });
  }
});
