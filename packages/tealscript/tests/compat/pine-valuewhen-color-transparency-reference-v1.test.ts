import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Retaining a color event also retains its transparent/opaque endpoint.
describe('Valuewhen retains event color transparency', () => {
  for (const version of [5, 6]) {
    it(`v${version} retains opaque and transparent events at ranks zero and one`, () => {
      const bars = [-1, 1, 1, -1, 1, -1, -1, 1].map((close, index) => ({
        time: 1700000000000 + index * 60000,
        open: 0,
        high: 2,
        low: -2,
        close,
        volume: 10,
      }));
      const result = runCompatScript(
        `//@version=${version}
indicator("Color event transparency")
event=bar_index % 2 == 0
shade=color.new(#123456,close > 0 ? 100 : 0)
latest=ta.valuewhen(event,shade,0)
previous=ta.valuewhen(condition=event,source=shade,occurrence=1)
plot(color.t(latest),"Latest")
plot(color.t(previous),"Previous")`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      expect(getPlot(result, 'Latest').values.slice(2)).toEqual([100, 100, 100, 100, 0, 0]);
      expect(getPlot(result, 'Previous').values.slice(2)).toEqual([0, 0, 100, 100, 100, 100]);
    });
  }
});
