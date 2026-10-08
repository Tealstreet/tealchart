import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// TradingView Pivot Points Standard DM formulas use previous-period OHLC.
describe('DM pivot levels use the completed anchor period', () => {
  for (const version of [5, 6]) {
    it(`v${version} pins rising and falling periods and persistence`, () => {
      const prices = [[100, 103, 99, 102], [102, 106, 101, 105], [105, 108, 104, 107],
        [107, 109, 96, 100], [100, 130, 90, 120], [120, 140, 115, 125]];
      const result = runCompatScript(`//@version=${version}
indicator("DM completed periods")
levels = ta.pivot_point_levels(type="DM", anchor=bar_index == 0 or bar_index == 2 or bar_index == 4, developing=false)
plot(array.get(levels, 0), "P")
plot(array.get(levels, 1), "R1")
plot(array.get(levels, 2), "S1")`, {
        bars: prices.map(([open, high, low, close], i) => ({ ...compatibilityBars[i], open, high, low, close })),
      });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'P').values.slice(2)).toEqual([104, 104, 100.25, 100.25]);
      expect(getPlot(result, 'R1').values.slice(2)).toEqual([109, 109, 104.5, 104.5]);
      expect(getPlot(result, 'S1').values.slice(2)).toEqual([102, 102, 91.5, 91.5]);
    });
  }
});
