import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// V5 bool source can be na; change includes missing current or lagged endpoints.
describe('V5 boolean change missing endpoints', () => {
  for (const named of [false, true]) {
    it(`named=${named} includes current and lagged missing boolean source`, () => {
      const bars = Array.from({ length: 8 }, (_, index) => ({
        time: 1700000000000 + index * 60000,
        open: 1,
        high: 2,
        low: 0,
        close: 1,
        volume: 10,
      }));
      const one = named ? 'ta.change(source=flag,length=1)' : 'ta.change(flag)';
      const two = named ? 'ta.change(source=flag,length=2)' : 'ta.change(flag,2)';
      const result = runCompatScript(
        `//@version=5
indicator("Missing boolean change")
bool flag=(bar_index == 1 or bar_index == 4) ? na : (bar_index == 0 or bar_index == 3 or bar_index == 5)
one=${one}
two=${two}
plot(na(flag) ? 1 : 0,"Source missing")
plot(na(one) ? 1 : 0,"One missing")
plot(na(two) ? 1 : 0,"Two missing")`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      expect(getPlot(result, 'Source missing').values).toEqual([0, 1, 0, 0, 1, 0, 0, 0]);
      expect(getPlot(result, 'One missing').values.slice(2)).toEqual([1, 0, 1, 1, 0, 0]);
      expect(getPlot(result, 'Two missing').values.slice(2)).toEqual([0, 1, 1, 0, 1, 0]);
    });
  }
});
