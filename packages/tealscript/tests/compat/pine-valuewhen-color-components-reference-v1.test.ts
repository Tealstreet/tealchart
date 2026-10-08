import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// valuewhen(color) retains event color; literal RGB bytes expose retained components.
describe('Valuewhen retains color event components', () => {
  for (const version of [5, 6]) {
    it(`v${version} retains latest and previous event RGB values`, () => {
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
indicator("Color event history")
event=bar_index % 2 == 0
shade=close > 0 ? #abcdef : #123456
latest=ta.valuewhen(event,shade,0)
previous=ta.valuewhen(occurrence=1,source=shade,condition=event)
plot(color.r(latest), "LatestR")
plot(color.g(latest), "LatestG")
plot(color.b(latest), "LatestB")
plot(color.r(previous), "PreviousR")
plot(color.g(previous), "PreviousG")
plot(color.b(previous), "PreviousB")`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      expect(getPlot(result, 'LatestR').values.slice(2)).toEqual([171, 171, 171, 171, 18, 18]);
      expect(getPlot(result, 'LatestG').values.slice(2)).toEqual([205, 205, 205, 205, 52, 52]);
      expect(getPlot(result, 'LatestB').values.slice(2)).toEqual([239, 239, 239, 239, 86, 86]);
      expect(getPlot(result, 'PreviousR').values.slice(2)).toEqual([18, 18, 171, 171, 171, 171]);
      expect(getPlot(result, 'PreviousG').values.slice(2)).toEqual([52, 52, 205, 205, 205, 205]);
      expect(getPlot(result, 'PreviousB').values.slice(2)).toEqual([86, 86, 239, 239, 239, 239]);
    });
  }
});
