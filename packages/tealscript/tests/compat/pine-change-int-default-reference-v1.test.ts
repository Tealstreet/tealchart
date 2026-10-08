import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Integer change uses signed source-source[1] when length is omitted.
describe('Integer change default lag values', () => {
  for (const version of [5, 6]) {
    it(`v${version} omitted length matches explicit one for signed integer sources`, () => {
      const bars = [-2, 3, 3, -4, 6, 0, -5].map((close, index) => ({
        time: 1700000000000 + index * 60000,
        open: close,
        high: close + 1,
        low: close - 1,
        close,
        volume: 10,
      }));
      const result = runCompatScript(
        `//@version=${version}
indicator("Integer change default")
int source=int(close)
plot(ta.change(source),"Default")
plot(ta.change(length=1,source=source),"Explicit")`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      expect(getPlot(result, 'Default').values.slice(1)).toEqual([5, 0, -7, 10, -6, -5]);
      expect(getPlot(result, 'Explicit').values.slice(1)).toEqual([5, 0, -7, 10, -6, -5]);
    });
  }
});
