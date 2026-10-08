import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Official ta.vwap stdev_mult: upper/lower add/subtract multiplier times deviation.
describe('VWAP zero multiplier collapses bands without resetting weighted state', () => {
  for (const version of [5, 6]) {
    it(`v${version} preserves the center with zero band multiplier`, () => {
      const prices = [2, 8, 5, 11, 4, 10];
      const volumes = [1, 3, 2, 4, 1, 3];
      const bars = prices.map((close, index) => ({
        time: 1700000000000 + index * 60000,
        open: close,
        high: close + 1,
        low: close - 1,
        close,
        volume: volumes[index],
      }));
      const call =
        version === 5 ? 'ta.vwap(close, anchor, 0.0)' : 'ta.vwap(stdev_mult=0.0, source=close, anchor=anchor)';
      const result = runCompatScript(
        `//@version=${version}
indicator("Zero VWAP bands")
anchor = bar_index == 0 or bar_index == 3
[middle, upper, lower] = ${call}
plot(middle, "Middle")
plot(upper - middle, "UpperDistance")
plot(middle - lower, "LowerDistance")`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      const expected = [2, 6.5, 6, 11, 9.6, 9.75];
      const middle = getPlot(result, 'Middle').values;
      expect(middle).toHaveLength(expected.length);
      middle.forEach((value, index) => expect(value).toBeCloseTo(expected[index], 12));
      for (const title of ['UpperDistance', 'LowerDistance'])
        expect(getPlot(result, title).values).toEqual([0, 0, 0, 0, 0, 0]);
    });
  }
});
