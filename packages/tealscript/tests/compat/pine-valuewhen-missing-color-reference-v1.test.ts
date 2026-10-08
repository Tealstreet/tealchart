import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Occurrence ranks qualifying conditions, including events whose color is missing.
describe('Valuewhen retains missing color event slots', () => {
  for (const version of [5, 6]) {
    it(`v${version} missing colors consume a qualifying occurrence`, () => {
      const bars = [1, 1, 1, 1, 1, 1, 1, 1].map((close, index) => ({
        time: 1700000000000 + index * 60000,
        open: 0,
        high: 2,
        low: 0,
        close,
        volume: 10,
      }));
      const result = runCompatScript(
        `//@version=${version}
indicator("Missing color event slots")
event=bar_index % 2 == 0
shade=bar_index % 4 == 2 ? color(na) : #123456
latest=ta.valuewhen(event,shade,0)
previous=ta.valuewhen(occurrence=1,condition=event,source=shade)
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
