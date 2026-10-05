import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const bars = [
  { time: 1_700_000_000_000, open: 9, high: 15, low: 6, close: 9, volume: 1 },
  { time: 1_700_000_060_000, open: 15, high: 30, low: 15, close: 15, volume: 2 },
  { time: 1_700_000_120_000, open: 18, high: 57, low: 15, close: 18, volume: 1 },
];

describe('VWAP variable uses hlc3 source', () => {
  // hlc3=[10,20,30], volumes=[1,2,1]: cumulative weighted means=[10,50/3,20].
  // https://www.tradingview.com/pine-script-reference/v6/#var_ta.vwap
  it.each([4, 5, 6])('evaluates the v%i variable and its history', (version) => {
    const name = version === 4 ? 'vwap' : 'ta.vwap';
    const result = runCompatScript(`//@version=${version}
${version === 4 ? 'study' : 'indicator'}("VWAP variable")
plot(${name}, "VWAP")
plot(${name}[1], "Previous")
`, { bars });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'VWAP').values).toEqual([10, 50 / 3, 20]);
    expect(getPlot(result, 'Previous').values).toEqual([null, 10, 50 / 3]);
  });
  // Reused corpus-5 archived witness: corpus-5-v1/vwap-variable-daily-witness-v1.ts.
  // Native volume-vwap-v1 export resets the variable at the first daily boundary.
  it.each([4, 5, 6])('resets the v%i variable on a new UTC day', (version) => {
    const name = version === 4 ? 'vwap' : 'ta.vwap';
    const dayBars = bars.map((bar, index) => ({
      ...bar,
      time: Date.UTC(2024, 0, index < 2 ? 1 : 2, 0, index),
    }));
    const result = runCompatScript(`//@version=${version}
${version === 4 ? 'study' : 'indicator'}("Daily VWAP variable")
plot(${name}, "VWAP")
plot(${name}[1], "Previous")
`, { bars: dayBars });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'VWAP').values).toEqual([10, 50 / 3, 30]);
    expect(getPlot(result, 'Previous').values).toEqual([null, 10, 50 / 3]);
  });
});
