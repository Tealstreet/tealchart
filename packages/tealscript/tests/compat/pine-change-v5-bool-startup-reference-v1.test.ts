import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// V5 past bool values are na before history exists; change includes missing endpoints.
describe('V5 boolean change historical startup missing status', () => {
  for (const named of [false, true]) {
    it(`named=${named} publishes missing before one and three past bars exist`, () => {
      const bars = Array.from({ length: 5 }, (_, index) => ({
        time: 1700000000000 + index * 60000,
        open: 1,
        high: 2,
        low: 0,
        close: 1,
        volume: 10,
      }));
      const one = named ? 'ta.change(length=1,source=flag)' : 'ta.change(flag)';
      const three = named ? 'ta.change(length=3,source=flag)' : 'ta.change(flag,3)';
      const result = runCompatScript(
        `//@version=5
indicator("V5 boolean change startup")
bool flag=bar_index % 2 == 0
one=${one}
three=${three}
plot(na(one) ? 1 : 0,"One missing")
plot(na(three) ? 1 : 0,"Three missing")`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      expect(getPlot(result, 'One missing').values).toEqual([1, 0, 0, 0, 0]);
      expect(getPlot(result, 'Three missing').values).toEqual([1, 1, 1, 0, 0]);
    });
  }
});
