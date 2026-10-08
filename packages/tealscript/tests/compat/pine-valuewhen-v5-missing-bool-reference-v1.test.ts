import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// V5 permits bool na; valuewhen occurrence counts events even when source is missing.
describe('V5 valuewhen retains missing boolean event slots', () => {
  for (const named of [false, true]) {
    it(`named=${named} missing bool consumes a qualifying occurrence`, () => {
      const bars = [1, 1, 1, 1, 1, 1, 1, 1].map((close, index) => ({
        time: 1700000000000 + index * 60000,
        open: 0,
        high: 2,
        low: 0,
        close,
        volume: 10,
      }));
      const latest = named ? 'ta.valuewhen(occurrence=0,condition=event,source=flag)' : 'ta.valuewhen(event,flag,0)';
      const previous = named ? 'ta.valuewhen(occurrence=1,condition=event,source=flag)' : 'ta.valuewhen(event,flag,1)';
      const result = runCompatScript(
        `//@version=5
indicator("V5 missing bool events")
event=bar_index % 2 == 0
bool flag=bar_index % 4 == 2 ? na : bar_index % 4 == 0
latest=${latest}
previous=${previous}
plot(na(latest) ? 1 : 0,"Latest missing")
plot(na(previous) ? 1 : 0,"Previous missing")`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      expect(getPlot(result, 'Latest missing').values.slice(2)).toEqual([1, 1, 0, 0, 1, 1]);
      expect(getPlot(result, 'Previous missing').values.slice(2)).toEqual([0, 0, 1, 1, 0, 0]);
    });
  }
});
