import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Official ta.vwap: upper/lower add/subtract the signed deviation multiplier.
describe('VWAP negative multiplier exchanges positive bands', () => {
  for (const version of [5, 6]) {
    it(`v${version} exchanges bands without changing the center`, () => {
      const prices = [0, 6, 2, 10, -3, 5];
      const bars = prices.map((close, index) => ({
        time: 1700000000000 + index * 60000,
        open: close,
        high: close + 1,
        low: close - 1,
        close,
        volume: 2,
      }));
      const call =
        version === 5 ? 'ta.vwap(close, anchor, -2.0)' : 'ta.vwap(stdev_mult=-2.0, source=close, anchor=anchor)';
      const result = runCompatScript(
        `//@version=${version}
indicator("Signed VWAP bands")
anchor = bar_index % 2 == 0
[negativeMiddle, negativeUpper, negativeLower] = ${call}
[positiveMiddle, positiveUpper, positiveLower] = ta.vwap(close, anchor, 2.0)
plot(negativeMiddle, "Middle")
plot(negativeMiddle - positiveMiddle, "CenterDifference")
plot(negativeUpper - positiveLower, "UpperExchange")
plot(negativeLower - positiveUpper, "LowerExchange")`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      expect(getPlot(result, 'Middle').values).toEqual([0, 3, 2, 6, -3, 1]);
      for (const title of ['CenterDifference', 'UpperExchange', 'LowerExchange']) {
        expect(getPlot(result, title).values).toEqual([0, 0, 0, 0, 0, 0]);
      }
    });
  }
});
