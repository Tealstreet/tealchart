import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('Explicit VWAP begins at the first true anchor', () => {
  for (const version of [5, 6]) {
    it(`v${version} scalar and tuple wait, accumulate and reset`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("First VWAP anchor")
anchor = bar_index == 2 or bar_index == 4
plot(ta.vwap(close, anchor), "Scalar")
[middle, upper, lower] = ta.vwap(close, anchor, 0.0)
plot(middle, "Middle")
plot(upper, "Upper")
plot(lower, "Lower")`, {
        bars: compatibilityBars.slice(0, 6).map((bar, i) => ({ ...bar, close: [100, 200, 2, 6, 10, 14][i], volume: 1 })),
      });
      expect(result.errors).toEqual([]);
      for (const title of ['Scalar', 'Middle', 'Upper', 'Lower']) {
        expect(getPlot(result, title).values).toEqual([null, null, 2, 4, 10, 12]);
      }
    });
  }
});
