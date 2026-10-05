import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

describe('Pine month seconds', () => {
  it('uses 2628003 seconds per month for explicit and chart timeframes', () => {
    const result = runCompatScript(`//@version=6
indicator("Month seconds")
plot(timeframe.in_seconds("M"), "Month")
plot(timeframe.in_seconds(timeframe="3M"), "Quarter")
plot(timeframe.in_seconds("12M"), "Year")
plot(timeframe.in_seconds(), "Chart")
plot(timeframe.in_seconds(""), "Empty")
plot(timeframe.in_seconds("1D"), "Day")
`, {
      bars: [{ time: Date.UTC(2024, 1, 1), open: 1, high: 1, low: 1, close: 1, volume: 1 }],
      engineOptions: { runtime: { timeframe: { period: '2M', multiplier: 2, ismonthly: true } } },
    });
    expect(result.errors).toEqual([]);
    for (const [title, seconds] of Object.entries({ Month: 2_628_003, Quarter: 7_884_009, Year: 31_536_036, Chart: 5_256_006, Empty: 5_256_006, Day: 86_400 })) {
      expect(getPlot(result, title).values).toEqual([seconds]);
    }
  });
});
