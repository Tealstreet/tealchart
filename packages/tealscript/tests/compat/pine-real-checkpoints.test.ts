import { describe, expect, it } from 'vitest';

import type { Bar } from '../../src/runtime';
import { compatibilityBars, getPlot, roundSeries, runCompatScript } from './fixtures';

describe('Pine real idiom checkpoints', () => {
  it('locks a reduced official built-ins namespace idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/language/built-ins/
    const result = runCompatScript(`
indicator("Official Built-ins Checkpoint")
average = ta.sma(close, 3)
plot(average, title="SMA")
plot(close > average ? 1 : 0, title="Above Average")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'SMA').values)).toEqual([
      null,
      null,
      104.666667,
      105,
      103,
      100.666667,
      101,
      104.333333,
      107,
      109.333333,
      109.666667,
      111,
    ]);
    expect(getPlot(result, 'Above Average').values).toEqual([0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1]);
  });

  it('locks reduced official barstate and array growth idioms', () => {
    // Sources:
    // - https://www.tradingview.com/pine-script-docs/concepts/bar-states/
    // - https://www.tradingview.com/pine-script-docs/language/arrays/
    const result = runCompatScript(`
indicator("Official Array Checkpoint")
var array<float> values = array.new_float(0)
if barstate.isfirst
    array.push(values, close)
array.push(values, high)
plot(array.get(values, 0), title="First Close")
plot(array.size(values), title="Array Size")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'First Close').values).toEqual(Array(compatibilityBars.length).fill(102));
    expect(getPlot(result, 'Array Size').values).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  it('locks the official inside/outside barcolor idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/visuals/bar-coloring/
    const bars: Bar[] = [
      { time: 1_700_000_000_000, open: 10, high: 12, low: 9, close: 11, volume: 100 },
      { time: 1_700_000_060_000, open: 11, high: 13, low: 8, close: 12, volume: 100 },
      { time: 1_700_000_120_000, open: 12, high: 12.5, low: 8.5, close: 11, volume: 100 },
      { time: 1_700_000_180_000, open: 11, high: 14, low: 7, close: 10, volume: 100 },
    ];
    const result = runCompatScript(`
indicator("Official Barcolor Checkpoint", overlay=true)
isUp = close > open
isDown = close <= open
isOutsideUp = high > high[1] and low < low[1] and isUp
isOutsideDown = high > high[1] and low < low[1] and isDown
isInside = high < high[1] and low > low[1]
barcolor(isInside ? color.yellow : isOutsideUp ? color.aqua : isOutsideDown ? color.purple : na)
`, { bars });

    expect(result.errors).toEqual([]);
    expect(result.plots.find((plot) => plot.type === 'barcolor')?.color).toEqual([
      null,
      '#00BCD4',
      '#FFEB3B',
      '#9C27B0',
    ]);
  });
});
