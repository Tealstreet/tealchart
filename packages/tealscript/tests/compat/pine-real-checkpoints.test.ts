import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import {
  currencyRateRequestKey,
  InMemoryRequestDatafeed,
  InMemoryStrategyIntrabarDatafeed,
  TealscriptEngine,
  type Bar,
} from '../../src/runtime';
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

  it('locks a reduced official max bars back idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/error-messages/
    const result = runCompatScript(`
indicator("Official Max Bars Back Checkpoint", max_bars_back=2)
plot(close[2], title="Bounded Close")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorMaxBarsBack).toBe(2);
    expect(getPlot(result, 'Bounded Close').values).toEqual([
      null,
      null,
      102,
      105,
      107,
      103,
      99,
      100,
      104,
      109,
      108,
      111,
    ]);
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
      '#FDD835',
      '#9C27B0',
    ]);
  });

  it('locks reduced official marker output payload idioms', () => {
    // Source: https://www.tradingview.com/pine-script-docs/visuals/text-and-shapes/
    const result = runCompatScript(`
indicator("Official Marker Payload Checkpoint", overlay=true)
shapeVisible = bar_index == 0 ? true : bar_index == 1 ? false : bar_index == 2 ? na : true
charValue = bar_index == 0 ? 2 : bar_index == 1 ? 0 : bar_index == 2 ? na : -1
markerColor = bar_index == 0 ? color.green : color.red
markerText = bar_index == 0 ? color.white : color.yellow
plotshape(shapeVisible, title="Marker Shape", text="S", color=markerColor, textcolor=markerText)
plotchar(charValue, title="Marker Char", char="C", text="C", color=markerColor, textcolor=markerText)
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Marker Shape').values).toEqual([
      1,
      null,
      null,
      ...Array(compatibilityBars.length - 3).fill(1),
    ]);
    expect(getPlot(result, 'Marker Shape').color).toEqual([
      '#4CAF50',
      null,
      null,
      ...Array(compatibilityBars.length - 3).fill('#F23645'),
    ]);
    expect(getPlot(result, 'Marker Shape').textColor).toEqual([
      '#FFFFFF',
      null,
      null,
      ...Array(compatibilityBars.length - 3).fill('#FDD835'),
    ]);
    expect(getPlot(result, 'Marker Char').values).toEqual([
      2,
      null,
      null,
      ...Array(compatibilityBars.length - 3).fill(-1),
    ]);
    expect(getPlot(result, 'Marker Char').color).toEqual([
      '#4CAF50',
      null,
      null,
      ...Array(compatibilityBars.length - 3).fill('#F23645'),
    ]);
    expect(getPlot(result, 'Marker Char').textColor).toEqual([
      '#FFFFFF',
      null,
      null,
      ...Array(compatibilityBars.length - 3).fill('#FDD835'),
    ]);
  });

  it('locks a reduced public marker signal payload idiom', () => {
    // Source context: https://www.tradingview.com/scripts/search/buy%20sell%20signal%20markers/
    const result = runCompatScript(`
indicator("Public Marker Signal Checkpoint", overlay=true)
fast = ta.sma(close, 2)
slow = ta.sma(close, 3)
longSignal = fast > slow
shortSignal = fast < slow
signalColor = longSignal ? color.lime : shortSignal ? color.red : color.gray
signalText = longSignal ? color.black : shortSignal ? color.white : color.gray
arrowStrength = longSignal ? high - low : shortSignal ? -(high - low) : 0
plotshape(longSignal, title="Buy Marker", style=shape.labelup, location=location.belowbar, text="BUY", color=signalColor, textcolor=signalText)
plotchar(shortSignal, title="Sell Marker", char="S", location=location.abovebar, text="SELL", color=signalColor, textcolor=signalText)
plotarrow(arrowStrength, title="Signal Arrow", colorup=color.lime, colordown=color.red, minheight=5, maxheight=20)
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Buy Marker')).toMatchObject({
      type: 'plotshape',
      shape: 'labelup',
      location: 'belowbar',
      text: 'BUY',
    });
    expect(getPlot(result, 'Buy Marker').values).toEqual([null, null, 1, null, null, null, 1, 1, 1, 1, 1, null]);
    expect(getPlot(result, 'Buy Marker').color).toEqual([
      null,
      null,
      '#00E676',
      null,
      null,
      null,
      '#00E676',
      '#00E676',
      '#00E676',
      '#00E676',
      '#00E676',
      null,
    ]);
    expect(getPlot(result, 'Buy Marker').textColor).toEqual([
      null,
      null,
      '#363A45',
      null,
      null,
      null,
      '#363A45',
      '#363A45',
      '#363A45',
      '#363A45',
      '#363A45',
      null,
    ]);
    expect(getPlot(result, 'Sell Marker')).toMatchObject({
      type: 'plotchar',
      char: 'S',
      location: 'abovebar',
      text: 'SELL',
    });
    expect(getPlot(result, 'Sell Marker').values).toEqual([null, null, null, null, 1, 1, null, null, null, null, null, null]);
    expect(getPlot(result, 'Sell Marker').color).toEqual([
      null,
      null,
      null,
      null,
      '#F23645',
      '#F23645',
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(getPlot(result, 'Sell Marker').textColor).toEqual([
      null,
      null,
      null,
      null,
      '#FFFFFF',
      '#FFFFFF',
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(getPlot(result, 'Signal Arrow')).toMatchObject({
      type: 'plotarrow',
      colorup: '#00E676',
      colordown: '#F23645',
      minHeight: 5,
      maxHeight: 20,
    });
    expect(getPlot(result, 'Signal Arrow').values).toEqual([null, null, 4, null, -6, -5, 6, 7, 5, 5, 5, null]);
    expect(getPlot(result, 'Signal Arrow').color).toEqual([
      null,
      null,
      '#00E676',
      null,
      '#F23645',
      '#F23645',
      '#00E676',
      '#00E676',
      '#00E676',
      '#00E676',
      '#00E676',
      null,
    ]);
  });

  it('locks reduced official plot-style payload idioms', () => {
    // Source: https://www.tradingview.com/pine-script-docs/visuals/plots/
    const result = runCompatScript(`
indicator("Official Plot Style Checkpoint", overlay=false)
areaBreak = bar_index == 1 ? na : low
plot(close, title="Line", style=plot.style_line)
plot(open, title="Step Line", style=plot.style_stepline)
plot(open, title="Step Break", style=plot.style_steplinebr)
plot(high - 100, title="Histogram", style=plot.style_histogram, histbase=0)
plot(high, title="Circles", style=plot.style_circles, join=true)
plot(low, title="Crosses", style=plot.style_cross, join=true)
plot(areaBreak, title="Area Break", style=plot.style_areabr, histbase=95)
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Line').style).toBe('line');
    expect(getPlot(result, 'Step Line').style).toBe('stepline');
    expect(getPlot(result, 'Step Break').style).toBe('steplinebr');
    expect(getPlot(result, 'Histogram')).toMatchObject({
      style: 'histogram',
      histbase: 0,
    });
    expect(getPlot(result, 'Circles')).toMatchObject({
      style: 'circles',
      join: true,
    });
    expect(getPlot(result, 'Crosses')).toMatchObject({
      style: 'cross',
      join: true,
    });
    expect(getPlot(result, 'Area Break')).toMatchObject({
      style: 'areabr',
      histbase: 95,
    });
    expect(getPlot(result, 'Area Break').values).toEqual([
      99,
      null,
      104,
      102,
      98,
      96,
      99,
      103,
      106,
      107,
      109,
      108,
    ]);
    expect(result.plots.map((plot) => [plot.title, plot.zOrder])).toEqual([
      ['Line', 0],
      ['Step Line', 1],
      ['Step Break', 2],
      ['Histogram', 3],
      ['Circles', 4],
      ['Crosses', 5],
      ['Area Break', 6],
    ]);
  });

  it('locks a reduced public custom Heikin-Ashi candle idiom', () => {
    // Public idiom reference: public overlay scripts commonly derive
    // Heikin-Ashi OHLC values and render them with plotcandle().
    // Source search: https://www.tradingview.com/scripts/search/heikin%20ashi%20candles/
    const result = runCompatScript(`
indicator("Public Custom Candle Checkpoint", overlay=true)
haClose = (open + high + low + close) / 4
var float haOpen = na
haOpen := na(haOpen[1]) ? (open + close) / 2 : (haOpen[1] + haClose[1]) / 2
haHigh = math.max(high, math.max(haOpen, haClose))
haLow = math.min(low, math.min(haOpen, haClose))
bodyColor = haClose >= haOpen ? color.green : color.red
plotcandle(haOpen, haHigh, haLow, haClose, title="HA Overlay", color=bodyColor, wickcolor=color.new(bodyColor, 20), bordercolor=bodyColor, force_overlay=true)
plot(haClose - haOpen, title="HA Body")
`);

    expect(result.errors).toEqual([]);
    const candles = getPlot(result, 'HA Overlay');
    expect(candles.type).toBe('plotcandle');
    expect(roundSeries(candles.openValues ?? [])).toEqual([
      101,
      101,
      102.25,
      104.125,
      104.6875,
      102.84375,
      100.921875,
      101.460938,
      103.980469,
      106.240234,
      107.870117,
      109.435059,
    ]);
    expect(roundSeries(candles.highValues ?? [])).toEqual([
      103,
      106,
      108,
      109,
      104.6875,
      102.84375,
      105,
      110,
      111,
      112,
      114,
      113,
    ]);
    expect(roundSeries(candles.lowValues ?? [])).toEqual([
      99,
      101,
      102.25,
      102,
      98,
      96,
      99,
      101.460938,
      103.980469,
      106.240234,
      107.870117,
      108,
    ]);
    expect(roundSeries(candles.closeValues ?? [])).toEqual([
      101,
      103.5,
      106,
      105.25,
      101,
      99,
      102,
      106.5,
      108.5,
      109.5,
      111,
      110.75,
    ]);
    expect(candles.color).toEqual([
      '#4CAF50',
      '#4CAF50',
      '#4CAF50',
      '#4CAF50',
      '#F23645',
      '#F23645',
      '#4CAF50',
      '#4CAF50',
      '#4CAF50',
      '#4CAF50',
      '#4CAF50',
      '#4CAF50',
    ]);
    expect(candles.wickColor).toEqual([
      '#4CAF50CC',
      '#4CAF50CC',
      '#4CAF50CC',
      '#4CAF50CC',
      '#F23645CC',
      '#F23645CC',
      '#4CAF50CC',
      '#4CAF50CC',
      '#4CAF50CC',
      '#4CAF50CC',
      '#4CAF50CC',
      '#4CAF50CC',
    ]);
    expect(candles.borderColor).toEqual(candles.color);
    expect(candles.forceOverlay).toBe(true);
    expect(roundSeries(getPlot(result, 'HA Body').values)).toEqual([
      0,
      2.5,
      3.75,
      1.125,
      -3.6875,
      -3.84375,
      1.078125,
      5.039063,
      4.519531,
      3.259766,
      3.129883,
      1.314941,
    ]);
  });

  it('locks a reduced public MTF trend-filter idiom', () => {
    // Public idiom reference: MTF trend filters commonly combine local price
    // with higher-timeframe moving averages from request.security().
    // Source search: https://www.tradingview.com/scripts/search/mtf%20trend%20filter/
    const chartBars: Bar[] = [
      { time: 1_700_000_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: 1_700_000_060_000, open: 100, high: 102, low: 99, close: 101, volume: 110 },
      { time: 1_700_000_120_000, open: 101, high: 103, low: 100, close: 102, volume: 120 },
      { time: 1_700_000_180_000, open: 102, high: 104, low: 101, close: 103, volume: 130 },
      { time: 1_700_000_240_000, open: 103, high: 105, low: 102, close: 104, volume: 140 },
      { time: 1_700_000_300_000, open: 104, high: 106, low: 103, close: 105, volume: 150 },
    ];
    const requestDatafeed = new InMemoryRequestDatafeed([
      {
        symbol: 'BTCUSDT',
        timeframe: '2',
        bars: [
          { time: 1_700_000_000_000, open: 11, high: 15, low: 9, close: 10, volume: 1_000 },
          { time: 1_700_000_120_000, open: 21, high: 25, low: 19, close: 20, volume: 1_100 },
          { time: 1_700_000_240_000, open: 31, high: 35, low: 29, close: 30, volume: 1_200 },
        ],
        syminfo: { ticker: 'BTCUSDT', timezone: 'Etc/UTC' },
      },
    ]);
    const result = runCompatScript(`
indicator("Public MTF Trend Checkpoint")
htfAverage = request.security(syminfo.tickerid, "2", ta.sma(close, 2), lookahead=barmerge.lookahead_on)
trendOk = close > htfAverage
plot(htfAverage, title="HTF Average")
plot(trendOk ? 1 : 0, title="Trend OK")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'HTF Average').values).toEqual([null, null, 15, 15, 25, 25]);
    expect(getPlot(result, 'Trend OK').values).toEqual([0, 0, 1, 1, 1, 1]);
  });

  it('locks a reduced official lower-timeframe array idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/
    const chartBars: Bar[] = [
      { time: 1_700_100_000_000, open: 100, high: 103, low: 99, close: 102, volume: 210 },
      { time: 1_700_100_120_000, open: 102, high: 105, low: 101, close: 104, volume: 250 },
      { time: 1_700_100_240_000, open: 104, high: 107, low: 103, close: 106, volume: 290 },
    ];
    const requestDatafeed = new InMemoryRequestDatafeed([
      {
        symbol: 'BTCUSDT',
        timeframe: '1',
        bars: [
          { time: 1_700_100_000_000, open: 10, high: 12, low: 9, close: 11, volume: 100 },
          { time: 1_700_100_060_000, open: 11, high: 14, low: 10, close: 13, volume: 110 },
          { time: 1_700_100_120_000, open: 20, high: 23, low: 18, close: 21, volume: 120 },
          { time: 1_700_100_180_000, open: 21, high: 25, low: 20, close: 24, volume: 130 },
          { time: 1_700_100_240_000, open: 30, high: 32, low: 29, close: 31, volume: 140 },
          { time: 1_700_100_300_000, open: 31, high: 35, low: 30, close: 34, volume: 150 },
        ],
        syminfo: { ticker: 'BTCUSDT', timezone: 'Etc/UTC' },
      },
    ]);
    const result = runCompatScript(`
indicator("Official Lower TF Array Checkpoint", timeframe="2")
intrabars = request.security_lower_tf(syminfo.tickerid, "1", close)
firstIntrabar = array.size(intrabars) > 0 ? array.get(intrabars, 0) : na
lastIntrabar = array.size(intrabars) > 0 ? array.get(intrabars, array.size(intrabars) - 1) : na
plot(array.size(intrabars), title="Intrabar Count")
plot(firstIntrabar, title="First Intrabar")
plot(lastIntrabar, title="Last Intrabar")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Intrabar Count').values).toEqual([2, 2, 2]);
    expect(getPlot(result, 'First Intrabar').values).toEqual([11, 21, 31]);
    expect(getPlot(result, 'Last Intrabar').values).toEqual([13, 24, 34]);
  });

  it('locks a reduced official ticker request idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/non-standard-charts-data/
    const chartBars: Bar[] = [
      { time: 1_700_200_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: 1_700_200_060_000, open: 101, high: 102, low: 100, close: 101, volume: 110 },
      { time: 1_700_200_120_000, open: 102, high: 103, low: 101, close: 102, volume: 120 },
    ];
    const requestDatafeed = new InMemoryRequestDatafeed([
      {
        symbol: 'NASDAQ:AAPL|session=extended',
        timeframe: '1',
        bars: [
          { time: 1_700_200_000_000, open: 200, high: 202, low: 199, close: 201, volume: 1_000 },
          { time: 1_700_200_060_000, open: 201, high: 203, low: 200, close: 202, volume: 1_100 },
          { time: 1_700_200_120_000, open: 202, high: 204, low: 201, close: 203, volume: 1_200 },
        ],
        syminfo: { ticker: 'NASDAQ:AAPL|session=extended', timezone: 'Etc/UTC' },
      },
    ]);
    const result = runCompatScript(`
indicator("Official Ticker Request Checkpoint")
extendedTicker = ticker.new("NASDAQ", "AAPL", session.extended)
haTicker = ticker.heikinashi(extendedTicker)
extendedClose = request.security(extendedTicker, "1", close, lookahead=barmerge.lookahead_on)
haClose = request.security(haTicker, "1", close, lookahead=barmerge.lookahead_on)
standardLength = str.length(ticker.standard(haTicker))
plot(extendedClose, title="Extended Close")
plot(haClose, title="HA Close")
plot(standardLength, title="Standard Length")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Extended Close').values).toEqual([201, 202, 203]);
    expect(getPlot(result, 'HA Close').values).toEqual([200.5, 201.5, 202.5]);
    expect(getPlot(result, 'Standard Length').values).toEqual([11, 11, 11]);
  });

  it('locks a reduced public synthetic ticker trend idiom', () => {
    // Public idiom reference: public trend indicators commonly request
    // Heikin-Ashi synthetic ticker data for smoothed direction signals.
    // Source search: https://www.tradingview.com/scripts/search/heikin%20ashi%20trend/
    const chartBars: Bar[] = [
      { time: 1_700_210_000_000, open: 10, high: 11, low: 9, close: 10, volume: 100 },
      { time: 1_700_210_060_000, open: 10, high: 11, low: 9, close: 10, volume: 100 },
      { time: 1_700_210_120_000, open: 10, high: 11, low: 9, close: 10, volume: 100 },
      { time: 1_700_210_180_000, open: 10, high: 11, low: 9, close: 10, volume: 100 },
    ];
    const requestDatafeed = new InMemoryRequestDatafeed([
      {
        symbol: 'NASDAQ:AAPL',
        timeframe: '1',
        bars: [
          { time: 1_700_210_000_000, open: 100, high: 106, low: 99, close: 105, volume: 1_000 },
          { time: 1_700_210_060_000, open: 105, high: 108, low: 104, close: 107, volume: 1_100 },
          { time: 1_700_210_120_000, open: 107, high: 110, low: 106, close: 109, volume: 1_200 },
          { time: 1_700_210_180_000, open: 109, high: 110, low: 102, close: 103, volume: 1_300 },
        ],
        syminfo: { ticker: 'NASDAQ:AAPL', timezone: 'Etc/UTC' },
      },
    ]);
    const result = runCompatScript(`
indicator("Public Synthetic Ticker Checkpoint")
haTicker = ticker.heikinashi("NASDAQ:AAPL")
haClose = request.security(haTicker, "1", close, lookahead=barmerge.lookahead_on)
haTrend = haClose > haClose[1]
plot(haClose, title="HA Close")
plot(haTrend ? 1 : 0, title="HA Trend")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'HA Close').values).toEqual([102.5, 106, 108, 106]);
    expect(getPlot(result, 'HA Trend').values).toEqual([0, 1, 1, 0]);
  });

  it('locks a reduced public pivot-divergence idiom', () => {
    // Public idiom reference: divergence scripts compare sequential price
    // pivots against lower oscillator pivots.
    // Source search: https://www.tradingview.com/scripts/search/rsi%20divergence/
    const bars: Bar[] = [
      { time: 1_700_000_000_000, open: 9, high: 10, low: 8, close: 10, volume: 100 },
      { time: 1_700_000_060_000, open: 7, high: 15, low: 6, close: 15, volume: 110 },
      { time: 1_700_000_120_000, open: 10, high: 12, low: 9, close: 12, volume: 120 },
      { time: 1_700_000_180_000, open: 13, high: 18, low: 12, close: 18, volume: 130 },
      { time: 1_700_000_240_000, open: 13, high: 14, low: 12, close: 14, volume: 140 },
    ];
    const result = runCompatScript(`
indicator("Public Divergence Checkpoint")
oscillator = close - open
pricePivot = ta.pivothigh(high, 1, 1)
oscPivot = bar_index == 2 ? 8 : bar_index == 4 ? 5 : na
var lastPricePivot = na
var lastOscPivot = na
bearish = false
if not na(pricePivot) and not na(oscPivot)
    bearish := not na(lastPricePivot) and pricePivot > lastPricePivot and oscPivot < lastOscPivot
    lastPricePivot := pricePivot
    lastOscPivot := oscPivot
plot(pricePivot, title="Price Pivot")
plot(oscPivot, title="Osc Pivot")
plot(bearish ? 1 : 0, title="Bearish Divergence")
`, { bars });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Price Pivot').values).toEqual([null, null, 15, null, 18]);
    expect(getPlot(result, 'Osc Pivot').values).toEqual([null, null, 8, null, 5]);
    expect(getPlot(result, 'Bearish Divergence').values).toEqual([0, 0, 0, 0, 1]);
  });

  it('locks a reduced public object-method state idiom', () => {
    // Public idiom reference: market-structure public indicators commonly keep
    // swing state in user-defined objects and update it through methods.
    // Source search: https://www.tradingview.com/scripts/search/market%20structure%20object/
    const result = runCompatScript(`
indicator("Public Object Method Checkpoint")
type SwingState
    int pivots = 0
    float lastHigh = na
    bool rising = false

method record(SwingState this, float candidate) =>
    if not na(candidate)
        this.rising := na(this.lastHigh) ? false : candidate > this.lastHigh
        this.lastHigh := candidate
        this.pivots += 1
    this

var state = SwingState.new()
pivotHigh = ta.pivothigh(high, 1, 1)
state := state.record(pivotHigh)
plot(state.pivots, title="Pivot Count")
plot(state.lastHigh, title="Last High")
plot(state.rising ? 1 : 0, title="Rising Pivot")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Pivot Count').values).toEqual([0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 2]);
    expect(getPlot(result, 'Last High').values).toEqual([null, null, null, null, 109, 109, 109, 109, 109, 109, 109, 114]);
    expect(getPlot(result, 'Rising Pivot').values).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
  });

  it('locks a reduced public session-gated signal idiom', () => {
    // Public idiom reference: intraday scripts frequently gate signals with a
    // user/session time filter.
    // Source search: https://www.tradingview.com/scripts/search/session%20filter/
    const result = runCompatScript(`
indicator("Public Session Filter Checkpoint")
inSession = not na(time("1", "2218-2224"))
rawSignal = close > open
plot(inSession ? 1 : 0, title="In Session")
plot(inSession and rawSignal ? 1 : 0, title="Filtered Signal")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'In Session').values).toEqual([0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0]);
    expect(getPlot(result, 'Filtered Signal').values).toEqual([0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0]);
  });

  it('locks a reduced public exchange-session state idiom', () => {
    // Public idiom reference: intraday public scripts commonly branch on
    // premarket, market, and postmarket session state helpers.
    // Source search: https://www.tradingview.com/scripts/search/session%20ismarket/
    const sessionBars: Bar[] = [
      { time: Date.UTC(2024, 0, 5, 13, 0), open: 1, high: 2, low: 1, close: 2, volume: 1 },
      { time: Date.UTC(2024, 0, 5, 15, 0), open: 2, high: 3, low: 2, close: 3, volume: 1 },
      { time: Date.UTC(2024, 0, 5, 21, 30), open: 3, high: 4, low: 3, close: 4, volume: 1 },
      { time: Date.UTC(2024, 0, 5, 23, 30), open: 4, high: 5, low: 4, close: 5, volume: 1 },
    ];
    const result = runCompatScript(`
indicator("Public Session State Checkpoint")
extendedState = session.ispremarket or session.ismarket or session.ispostmarket
plot(session.ispremarket ? 1 : 0, title="Premarket")
plot(session.ismarket ? 1 : 0, title="Market")
plot(session.ispostmarket ? 1 : 0, title="Postmarket")
plot(extendedState ? 1 : 0, title="Extended Active")
`, {
      bars: sessionBars,
      engineOptions: {
        runtime: {
          session: {
            timezone: 'UTC',
            premarket: '1200-1430:1234567',
            regular: '1430-2100:1234567',
            postmarket: '2100-2300:1234567',
          },
        },
      },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Premarket').values).toEqual([1, 0, 0, 0]);
    expect(getPlot(result, 'Market').values).toEqual([0, 1, 0, 0]);
    expect(getPlot(result, 'Postmarket').values).toEqual([0, 0, 1, 0]);
    expect(getPlot(result, 'Extended Active').values).toEqual([1, 1, 1, 0]);
  });

  it('locks a reduced public drawing zone idiom', () => {
    // Public idiom reference: supply/demand public scripts commonly keep a
    // persistent box zone and a midline updated from recent swing ranges.
    // Source search: https://www.tradingview.com/scripts/search/supply%20demand%20zones/
    const result = runCompatScript(`
indicator("Public Drawing Zone Checkpoint", overlay=true)
var zone = box.new(left=na, top=na, right=na, bottom=na, bgcolor=color.new(color.green, 85), border_color=color.green, text="")
var midline = line.new(x1=na, y1=na, x2=na, y2=na, extend=extend.right, color=color.green, width=2)
zoneTop = ta.highest(high, 3)
zoneBottom = ta.lowest(low, 3)
zoneMid = (zoneTop + zoneBottom) / 2
if barstate.islast
    box.set_lefttop(zone, bar_index - 3, zoneTop)
    box.set_rightbottom(zone, bar_index, zoneBottom)
    box.set_text(zone, "Demand")
    box.set_bgcolor(zone, color.new(color.green, 85))
    box.set_border_color(zone, color.green)
    line.set_xy1(midline, bar_index - 3, zoneMid)
    line.set_xy2(midline, bar_index, zoneMid)
plot(zoneTop, title="Zone Top")
plot(zoneBottom, title="Zone Bottom")
plot(zoneMid, title="Zone Mid")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Zone Top').values.at(-1)).toBe(114);
    expect(getPlot(result, 'Zone Bottom').values.at(-1)).toBe(107);
    expect(getPlot(result, 'Zone Mid').values.at(-1)).toBe(110.5);
    expect(result.drawings).toEqual([
      {
        id: 'box_box.new_0_0',
        type: 'box',
        persistent: true,
        barIndex: 11,
        left: 8,
        top: 114,
        right: 11,
        bottom: 107,
        xloc: 'bar_index',
        extend: 'none',
        borderColor: '#4CAF50',
        borderWidth: 1,
        borderStyle: 'solid',
        bgcolor: '#4CAF5026',
        text: 'Demand',
        textColor: '#363A45',
        textSize: 'auto',
      },
      {
        id: 'line_line.new_0_0',
        type: 'line',
        persistent: true,
        barIndex: 11,
        x1: 8,
        y1: 110.5,
        x2: 11,
        y2: 110.5,
        xloc: 'bar_index',
        extend: 'right',
        color: '#4CAF50',
        style: 'solid',
        width: 2,
        forceOverlay: false,
      },
    ]);
  });

  it('locks a reduced public linefill channel idiom', () => {
    // Public idiom reference: public channel indicators commonly draw upper
    // and lower line handles and fill the area between them.
    // Source search: https://www.tradingview.com/scripts/search/channel%20linefill/
    const result = runCompatScript(`
indicator("Public Linefill Channel Checkpoint", overlay=true)
channelHigh = ta.highest(high, 4)
channelLow = ta.lowest(low, 4)
var upper = line.new(x1=na, y1=na, x2=na, y2=na, extend=extend.right, color=color.orange, width=2)
var lower = line.new(x1=na, y1=na, x2=na, y2=na, extend=extend.right, color=color.orange, width=2)
var channel = linefill.new(line1=upper, line2=lower, color=color.new(color.orange, 85))
if barstate.islast
    line.set_xy1(id=upper, x=bar_index - 3, y=channelHigh[3])
    line.set_xy2(id=upper, x=bar_index, y=channelHigh)
    line.set_xy1(id=lower, x=bar_index - 3, y=channelLow[3])
    line.set_xy2(id=lower, x=bar_index, y=channelLow)
    linefill.set_color(id=channel, color=color.new(color.orange, 85))
plot(channelHigh - channelLow, title="Channel Width")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Channel Width').values).toEqual([4, 7, 9, 10, 11, 13, 13, 14, 15, 13, 11, 8]);
    expect(result.drawings).toEqual([
      {
        id: 'line_line.new_0_0',
        type: 'line',
        persistent: true,
        barIndex: 11,
        x1: 8,
        y1: 111,
        x2: 11,
        y2: 114,
        xloc: 'bar_index',
        extend: 'right',
        color: '#FF9800',
        style: 'solid',
        width: 2,
        forceOverlay: false,
      },
      {
        id: 'line_line.new_1_0',
        type: 'line',
        persistent: true,
        barIndex: 11,
        x1: 8,
        y1: 96,
        x2: 11,
        y2: 106,
        xloc: 'bar_index',
        extend: 'right',
        color: '#FF9800',
        style: 'solid',
        width: 2,
        forceOverlay: false,
      },
      {
        id: 'linefill_linefill.new_0_0',
        type: 'linefill',
        persistent: true,
        barIndex: 0,
        line1: 'line_line.new_0_0',
        line2: 'line_line.new_1_0',
        color: '#FF980026',
      },
    ]);
  });

  it('locks a reduced public zigzag polyline idiom', () => {
    // Public idiom reference: zigzag-style public overlays commonly collect
    // recent swing chart points and render them as a polyline path.
    // Source search: https://www.tradingview.com/scripts/search/zigzag%20polyline/
    const result = runCompatScript(`
indicator("Public Zigzag Polyline Checkpoint", overlay=true, max_polylines_count=1)
zigzagPoints = barstate.islast ? 4 : 0
if barstate.islast
    points = array.from(
         chart.point.from_index(bar_index - 6, low[6]),
         chart.point.from_index(bar_index - 4, high[4]),
         chart.point.from_index(bar_index - 2, low[2]),
         chart.point.now(close))
    polyline.new(points=points, curved=false, closed=false, line_color=color.purple, line_width=2)
plot(zigzagPoints, title="Zigzag Points")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Zigzag Points').values).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4]);
    expect(result.drawings).toEqual([
      {
        id: 'polyline_polyline.new_0_11',
        type: 'polyline',
        barIndex: 11,
        points: [
          { type: 'chart.point', time: null, index: 5, price: 96 },
          { type: 'chart.point', time: null, index: 7, price: 110 },
          { type: 'chart.point', time: null, index: 9, price: 107 },
          { type: 'chart.point', time: compatibilityBars[11]!.time, index: 11, price: 112 },
        ],
        curved: false,
        closed: false,
        xloc: 'bar_index',
        lineColor: '#9C27B0',
        fillColor: null,
        lineStyle: 'solid',
        lineWidth: 2,
      },
    ]);
  });

  it('locks a reduced public dashboard table idiom', () => {
    // Public idiom reference: dashboard-style public indicators commonly
    // summarize trend and signal state in a last-bar table.
    // Source search: https://www.tradingview.com/scripts/search/dashboard%20table/
    const result = runCompatScript(`
indicator("Public Dashboard Table Checkpoint", overlay=true)
fast = ta.sma(close, 2)
slow = ta.sma(close, 4)
trendUp = fast > slow
signalText = trendUp ? "Bullish" : "Bearish"
signalColor = trendUp ? color.green : color.red
var dashboard = table.new(position.top_right, 2, 2, border_width=1, border_color=color.white)
if barstate.islast
    table.cell(dashboard, 0, 0, "Trend", text_color=color.white, bgcolor=color.blue)
    table.cell(dashboard, 1, 0, signalText, text_color=color.white, bgcolor=signalColor)
    table.cell(dashboard, 0, 1, "Fast", text_color=color.white, bgcolor=color.gray)
    table.cell(dashboard, 1, 1, str.tostring(fast, "#.00"), text_color=color.black, bgcolor=color.yellow)
plot(trendUp ? 1 : 0, title="Trend Up")
plot(fast, title="Fast Average")
plot(slow, title="Slow Average")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Trend Up').values).toEqual([0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Fast Average').values)).toEqual([
      null,
      103.5,
      106,
      105,
      101,
      99.5,
      102,
      106.5,
      108.5,
      109.5,
      110.5,
      111,
    ]);
    expect(roundSeries(getPlot(result, 'Slow Average').values)).toEqual([
      null,
      null,
      null,
      104.25,
      103.5,
      102.25,
      101.5,
      103,
      105.25,
      108,
      109.5,
      110.25,
    ]);
    expect(result.drawings).toEqual([
      {
        id: 'table_table.new_0_0',
        type: 'table',
        persistent: true,
        barIndex: 0,
        position: 'top_right',
        columns: 2,
        rows: 2,
        bgcolor: null,
        frameColor: null,
        frameWidth: 0,
        borderColor: '#FFFFFF',
        borderWidth: 1,
        cells: [
          {
            column: 0,
            row: 0,
            text: 'Trend',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#2196F3',
          },
          {
            column: 1,
            row: 0,
            text: 'Bullish',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#4CAF50',
          },
          {
            column: 0,
            row: 1,
            text: 'Fast',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#787B86',
          },
          {
            column: 1,
            row: 1,
            text: '111.00',
            width: undefined,
            height: undefined,
            textColor: '#363A45',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#FDD835',
          },
        ],
      },
    ]);
  });

  it('locks a reduced public multi-symbol screener idiom', () => {
    // Public idiom reference: screener-style public indicators commonly use
    // request.security() for several symbols and summarize signals in a table.
    // Source search: https://www.tradingview.com/scripts/search/screener/
    const bars: Bar[] = [
      { time: 1_700_500_000_000, open: 10, high: 11, low: 9, close: 10, volume: 100 },
      { time: 1_700_500_060_000, open: 10, high: 11, low: 9, close: 10, volume: 100 },
      { time: 1_700_500_120_000, open: 10, high: 11, low: 9, close: 10, volume: 100 },
      { time: 1_700_500_180_000, open: 10, high: 11, low: 9, close: 10, volume: 100 },
    ];
    const requestDatafeed = new InMemoryRequestDatafeed([
      {
        symbol: 'NASDAQ:AAPL',
        timeframe: '1',
        bars: [
          { time: bars[0]!.time, open: 100, high: 102, low: 99, close: 101, volume: 1_000 },
          { time: bars[1]!.time, open: 101, high: 103, low: 100, close: 102, volume: 1_100 },
          { time: bars[2]!.time, open: 102, high: 103, low: 100, close: 101, volume: 1_200 },
          { time: bars[3]!.time, open: 102, high: 104, low: 101, close: 103, volume: 1_300 },
        ],
        syminfo: { ticker: 'NASDAQ:AAPL', timezone: 'Etc/UTC' },
      },
      {
        symbol: 'NASDAQ:MSFT',
        timeframe: '1',
        bars: [
          { time: bars[0]!.time, open: 201, high: 202, low: 199, close: 200, volume: 2_000 },
          { time: bars[1]!.time, open: 200, high: 201, low: 198, close: 199, volume: 2_100 },
          { time: bars[2]!.time, open: 199, high: 202, low: 198, close: 201, volume: 2_200 },
          { time: bars[3]!.time, open: 203, high: 204, low: 201, close: 202, volume: 2_300 },
        ],
        syminfo: { ticker: 'NASDAQ:MSFT', timezone: 'Etc/UTC' },
      },
      {
        symbol: 'NASDAQ:NVDA',
        timeframe: '1',
        bars: [
          { time: bars[0]!.time, open: 299, high: 302, low: 298, close: 300, volume: 3_000 },
          { time: bars[1]!.time, open: 301, high: 303, low: 300, close: 302, volume: 3_100 },
          { time: bars[2]!.time, open: 303, high: 305, low: 302, close: 304, volume: 3_200 },
          { time: bars[3]!.time, open: 305, high: 307, low: 304, close: 306, volume: 3_300 },
        ],
        syminfo: { ticker: 'NASDAQ:NVDA', timezone: 'Etc/UTC' },
      },
    ]);
    const result = runCompatScript(`
indicator("Public Screener Checkpoint", overlay=true)
aaplUp = request.security("NASDAQ:AAPL", "1", close > open, lookahead=barmerge.lookahead_on)
msftUp = request.security("NASDAQ:MSFT", "1", close > open, lookahead=barmerge.lookahead_on)
nvdaUp = request.security("NASDAQ:NVDA", "1", close > open, lookahead=barmerge.lookahead_on)
var screener = table.new(position.top_right, 2, 4, border_width=1, border_color=color.white)
if barstate.islast
    table.cell(screener, 0, 0, "Symbol", text_color=color.white, bgcolor=color.blue)
    table.cell(screener, 1, 0, "Signal", text_color=color.white, bgcolor=color.blue)
    table.cell(screener, 0, 1, "AAPL", text_color=color.white, bgcolor=color.gray)
    table.cell(screener, 1, 1, aaplUp ? "Bull" : "Bear", text_color=color.white, bgcolor=aaplUp ? color.green : color.red)
    table.cell(screener, 0, 2, "MSFT", text_color=color.white, bgcolor=color.gray)
    table.cell(screener, 1, 2, msftUp ? "Bull" : "Bear", text_color=color.white, bgcolor=msftUp ? color.green : color.red)
    table.cell(screener, 0, 3, "NVDA", text_color=color.white, bgcolor=color.gray)
    table.cell(screener, 1, 3, nvdaUp ? "Bull" : "Bear", text_color=color.white, bgcolor=nvdaUp ? color.green : color.red)
plot(aaplUp ? 1 : 0, title="AAPL Up")
plot(msftUp ? 1 : 0, title="MSFT Up")
plot(nvdaUp ? 1 : 0, title="NVDA Up")
`, {
      bars,
      engineOptions: { requestDatafeed },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'AAPL Up').values).toEqual([1, 1, 0, 1]);
    expect(getPlot(result, 'MSFT Up').values).toEqual([0, 0, 1, 0]);
    expect(getPlot(result, 'NVDA Up').values).toEqual([1, 1, 1, 1]);
    expect(result.drawings).toEqual([
      {
        id: 'table_table.new_0_0',
        type: 'table',
        persistent: true,
        barIndex: 0,
        position: 'top_right',
        columns: 2,
        rows: 4,
        bgcolor: null,
        frameColor: null,
        frameWidth: 0,
        borderColor: '#FFFFFF',
        borderWidth: 1,
        cells: [
          {
            column: 0,
            row: 0,
            text: 'Symbol',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#2196F3',
          },
          {
            column: 1,
            row: 0,
            text: 'Signal',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#2196F3',
          },
          {
            column: 0,
            row: 1,
            text: 'AAPL',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#787B86',
          },
          {
            column: 1,
            row: 1,
            text: 'Bull',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#4CAF50',
          },
          {
            column: 0,
            row: 2,
            text: 'MSFT',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#787B86',
          },
          {
            column: 1,
            row: 2,
            text: 'Bear',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#F23645',
          },
          {
            column: 0,
            row: 3,
            text: 'NVDA',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#787B86',
          },
          {
            column: 1,
            row: 3,
            text: 'Bull',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#4CAF50',
          },
        ],
      },
    ]);
  });

  it('locks a reduced public currency conversion idiom', () => {
    // Public idiom reference: public portfolio and multi-asset indicators
    // commonly normalize values with request.currency_rate().
    // Source search: https://www.tradingview.com/scripts/search/currency%20conversion/
    const bars: Bar[] = [
      { time: 1_700_530_000_000, open: 10, high: 10.5, low: 9.5, close: 10, volume: 100 },
      { time: 1_700_530_060_000, open: 11, high: 11.5, low: 10.5, close: 11, volume: 100 },
      { time: 1_700_530_120_000, open: 12, high: 12.5, low: 11.5, close: 12, volume: 100 },
      { time: 1_700_530_180_000, open: 13, high: 13.5, low: 12.5, close: 13, volume: 100 },
    ];
    const requestDatafeed = new InMemoryRequestDatafeed([], [
      {
        family: 'currency_rate',
        key: currencyRateRequestKey('USD', 'EUR'),
        points: [
          { time: bars[0]!.time, value: 0.9 },
          { time: bars[2]!.time, value: 0.92 },
        ],
      },
    ]);
    const result = runCompatScript(`
indicator("Public Currency Conversion Checkpoint")
usdValue = close * 100
eurRate = request.currency_rate("USD", "EUR")
eurValue = usdValue * eurRate
plot(eurRate, title="EUR Rate")
plot(eurValue, title="EUR Value")
`, {
      bars,
      engineOptions: { requestDatafeed },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'EUR Rate').values).toEqual([0.9, 0.9, 0.92, 0.92]);
    expect(roundSeries(getPlot(result, 'EUR Value').values)).toEqual([900, 990, 1104, 1196]);
  });

  it('locks a reduced public library helper idiom', () => {
    // Public idiom reference: public indicators commonly import helper
    // libraries for reusable signal calculations.
    // Source search: https://www.tradingview.com/scripts/search/library%20helper/
    const library = parse(`
library("RangeTools", true)
calcRange(float source, int length) => source - ta.sma(source, length)
export range(float source, int length) => calcRange(source, length)
export signal(float source, int length) => calcRange(source, length) > 0
`);
    const result = runCompatScript(`
indicator("Public Library Helper Checkpoint")
import PublicUser/RangeTools/1 as rt
spread = rt.range(close, 3)
isUp = rt.signal(close, 3)
plot(spread, title="Imported Spread")
plot(isUp ? 1 : 0, title="Imported Signal")
`, {
      engineOptions: {
        libraries: new Map([['PublicUser/RangeTools/1', library]]),
      },
    });

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Imported Spread').values)).toEqual([
      null,
      null,
      2.333333,
      -2,
      -4,
      -0.666667,
      3,
      4.666667,
      1,
      1.666667,
      0.333333,
      1,
    ]);
    expect(getPlot(result, 'Imported Signal').values).toEqual([0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1]);
  });

  it('locks a reduced official dynamic session idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/sessions/
    const result = runCompatScript(`
indicator("Official Dynamic Session Checkpoint")
weekdaySessionInput = input.session("2218-2224", "Weekday Session")
weekendSessionInput = input.session("0000-0001", "Weekend Session")
daysInput = input.string("23456", "Weekdays")
weekdaySession = weekdaySessionInput + ":" + daysInput
weekendSession = weekendSessionInput + ":17"
dynamicSession = dayofweek >= dayofweek.monday and dayofweek <= dayofweek.friday ? weekdaySession : weekendSession
inDynamicSession = not na(time(timeframe.period, dynamicSession))
plot(inDynamicSession ? 1 : 0, title="Dynamic Session")
plot(str.length(dynamicSession), title="Session Length")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Dynamic Session').values).toEqual([0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0]);
    expect(getPlot(result, 'Session Length').values).toEqual(Array(compatibilityBars.length).fill(15));
  });

  it('locks a reduced official timeframe comparison idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/timeframes/
    const result = runCompatScript(`
indicator("Official Timeframe Comparison Checkpoint")
tfInput = input.timeframe(defval="240", title="Input TF")
chartTfInMinutes = timeframe.in_seconds() / 60
inputTfInMinutes = timeframe.in_seconds(tfInput) / 60
validTimeframe = chartTfInMinutes <= inputTfInMinutes
plot(chartTfInMinutes, title="Chart TF Minutes")
plot(inputTfInMinutes, title="Input TF Minutes")
plot(validTimeframe ? 1 : 0, title="Valid Timeframe")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Chart TF Minutes').values).toEqual(Array(compatibilityBars.length).fill(60));
    expect(getPlot(result, 'Input TF Minutes').values).toEqual(Array(compatibilityBars.length).fill(240));
    expect(getPlot(result, 'Valid Timeframe').values).toEqual(Array(compatibilityBars.length).fill(1));
  });

  it('locks the official alert trigger idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/alerts/
    const result = runCompatScript(`
indicator("Official Alert Checkpoint")
trigger = close > close[1]
alertcondition(trigger, title="Close Rising", message="Close rose above the previous close")
if trigger
    alert("Close rising", alert.freq_once_per_bar_close)
plot(trigger ? 1 : 0, title="Trigger")
`);

    const condition = result.alerts.find((alert) => alert.type === 'alertcondition');
    const directAlert = result.alerts.find((alert) => alert.type === 'alert');

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Trigger').values).toEqual([0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1]);
    expect(condition?.values).toEqual([null, true, true, null, null, true, true, true, null, true, null, true]);
    expect(directAlert?.events.map((event) => ({
      barIndex: event.barIndex,
      frequency: event.frequency,
      message: event.message,
    }))).toEqual([
      { barIndex: 1, frequency: 'once_per_bar_close', message: 'Close rising' },
      { barIndex: 2, frequency: 'once_per_bar_close', message: 'Close rising' },
      { barIndex: 5, frequency: 'once_per_bar_close', message: 'Close rising' },
      { barIndex: 6, frequency: 'once_per_bar_close', message: 'Close rising' },
      { barIndex: 7, frequency: 'once_per_bar_close', message: 'Close rising' },
      { barIndex: 9, frequency: 'once_per_bar_close', message: 'Close rising' },
      { barIndex: 11, frequency: 'once_per_bar_close', message: 'Close rising' },
    ]);
  });

  it('locks a reduced public alert signal idiom', () => {
    // Public idiom reference: public signal indicators commonly expose both
    // alertcondition() metadata and direct alert() calls for trigger bars.
    // Source search: https://www.tradingview.com/scripts/search/alert%20signal/
    const result = runCompatScript(`
indicator("Public Alert Signal Checkpoint")
average = ta.sma(close, 3)
signal = close > average and close[1] <= average[1]
alertcondition(signal, title="Public Signal", message="Signal crossed above average")
if signal
    alert("Signal crossed above average", alert.freq_once_per_bar_close)
plot(signal ? 1 : 0, title="Signal")
plot(average, title="Average")
`);

    const condition = result.alerts.find((alert) => alert.type === 'alertcondition' && alert.title === 'Public Signal');
    const directAlert = result.alerts.find((alert) => alert.type === 'alert');

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Signal').values).toEqual([0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0]);
    expect(roundSeries(getPlot(result, 'Average').values)).toEqual([
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
    expect(condition?.values).toEqual([null, null, null, null, null, null, true, null, null, null, null, null]);
    expect(directAlert?.events.map((event) => ({
      barIndex: event.barIndex,
      frequency: event.frequency,
      message: event.message,
    }))).toEqual([
      { barIndex: 6, frequency: 'once_per_bar_close', message: 'Signal crossed above average' },
    ]);
  });

  it('locks the official strategy entry and bracket-exit idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/strategies/
    const bars: Bar[] = [
      { time: 1_700_000_000_000, open: 100, high: 103, low: 99, close: 102, volume: 100 },
      { time: 1_700_000_060_000, open: 105, high: 107, low: 104, close: 106, volume: 100 },
      { time: 1_700_000_120_000, open: 106, high: 110, low: 105, close: 108, volume: 100 },
      { time: 1_700_000_180_000, open: 108, high: 109, low: 103, close: 104, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Official Strategy Checkpoint", initial_capital=1000)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.exit("Bracket", "Long", limit=108, stop=99)
plot(strategy.position_size, title="Position")
plot(strategy.closedtrades, title="Closed Trades")
plot(strategy.netprofit, title="Net Profit")
`, { bars });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Position').values).toEqual([0, 1, 1, 0]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 0, 0, 1]);
    expect(getPlot(result, 'Net Profit').values).toEqual([0, 0, 0, 3]);
    expect(result.strategy.closedTrades[0]).toMatchObject({
      entryOrderId: 'Long',
      exitOrderId: 'Bracket Limit',
      entryPrice: 105,
      exitPrice: 108,
      profit: 3,
    });
  });

  it('locks a reduced public strategy bracket idiom', () => {
    // Public idiom reference: public strategy scripts commonly pair entry
    // signals with fixed stop/target brackets.
    // Source search: https://www.tradingview.com/scripts/search/strategy%20bracket/
    const bars: Bar[] = [
      { time: 1_700_600_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: 1_700_600_060_000, open: 101, high: 102, low: 100, close: 101, volume: 100 },
      { time: 1_700_600_120_000, open: 102, high: 104, low: 101, close: 103, volume: 100 },
      { time: 1_700_600_180_000, open: 103, high: 106, low: 102, close: 105, volume: 100 },
      { time: 1_700_600_240_000, open: 105, high: 106, low: 104, close: 105, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Public Strategy Bracket Checkpoint", initial_capital=1000, process_orders_on_close=true)
fast = ta.sma(close, 2)
slow = ta.sma(close, 3)
longSignal = bar_index == 2 and fast > slow
if longSignal
    strategy.entry("Long", strategy.long, qty=1)
if strategy.position_size > 0
    target = strategy.position_avg_price + 3
    stop = strategy.position_avg_price - 2
    strategy.exit("Long Bracket", "Long", limit=target, stop=stop)
plot(longSignal ? 1 : 0, title="Long Signal")
plot(strategy.position_size, title="Position")
plot(strategy.closedtrades, title="Closed Trades")
plot(strategy.netprofit, title="Net Profit")
`, { bars });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Long Signal').values).toEqual([0, 0, 1, 0, 0]);
    expect(getPlot(result, 'Position').values).toEqual([0, 0, 1, 1, 0]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 0, 0, 0, 1]);
    expect(getPlot(result, 'Net Profit').values).toEqual([0, 0, 0, 0, 3]);
    expect(result.strategy.closedTrades[0]).toMatchObject({
      entryOrderId: 'Long',
      exitOrderId: 'Long Bracket Limit',
      entryPrice: 103,
      exitPrice: 106,
      profit: 3,
    });
  });

  it('locks a reduced public strategy trailing stop idiom', () => {
    // Public idiom reference: public strategy scripts commonly use ATR-style
    // trailing exits after trend entries.
    // Source search: https://www.tradingview.com/scripts/search/strategy%20trailing%20stop/
    const bars: Bar[] = [
      { time: 1_700_620_000_000, open: 100, high: 100.5, low: 99.5, close: 100, volume: 100 },
      { time: 1_700_620_060_000, open: 100.2, high: 100.6, low: 99.8, close: 100.4, volume: 100 },
      { time: 1_700_620_120_000, open: 101, high: 101.5, low: 100.8, close: 101.2, volume: 100 },
      { time: 1_700_620_180_000, open: 101, high: 101, low: 100.9, close: 101, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Public Strategy Trailing Stop Checkpoint", process_orders_on_close=true)
longSignal = bar_index == 0
if longSignal
    strategy.entry("Long", strategy.long, qty=1)
if strategy.position_size > 0
    strategy.exit("Trail", "Long", trail_points=5, trail_offset=4)
plot(longSignal ? 1 : 0, title="Long Signal")
plot(strategy.position_size, title="Position")
plot(strategy.closedtrades, title="Closed Trades")
plot(strategy.netprofit, title="Net Profit")
`, {
      bars,
      engineOptions: { runtime: { syminfo: { mintick: 0.1 } } },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Long Signal').values).toEqual([1, 0, 0, 0]);
    expect(getPlot(result, 'Position').values).toEqual([1, 1, 0, 0]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 0, 1, 1]);
    expect(roundSeries(getPlot(result, 'Net Profit').values)).toEqual([0, 0, 0.2, 0.2]);
    expect(result.strategy.orders.map((order) => ({
      id: order.id,
      type: order.type,
      status: order.status,
      trailActivationPrice: order.trailActivationPrice,
      trailOffset: order.trailOffset,
      trailingActivated: order.trailingActivated,
      trailingStopPrice: order.trailingStopPrice == null ? order.trailingStopPrice : Math.round(order.trailingStopPrice * 10) / 10,
      avgFillPrice: order.avgFillPrice == null ? order.avgFillPrice : Math.round(order.avgFillPrice * 10) / 10,
      updatedBarIndex: order.updatedBarIndex,
    }))).toEqual([
      {
        id: 'Long',
        type: 'market',
        status: 'filled',
        trailActivationPrice: undefined,
        trailOffset: undefined,
        trailingActivated: false,
        trailingStopPrice: undefined,
        avgFillPrice: 100,
        updatedBarIndex: 0,
      },
      {
        id: 'Trail',
        type: 'trailing_stop',
        status: 'filled',
        trailActivationPrice: 100.5,
        trailOffset: 0.4,
        trailingActivated: true,
        trailingStopPrice: 100.2,
        avgFillPrice: 100.2,
        updatedBarIndex: 1,
      },
    ]);
    expect(result.strategy.closedTrades[0]).toMatchObject({
      entryOrderId: 'Long',
      exitOrderId: 'Trail',
      entryPrice: 100,
    });
    expect(result.strategy.closedTrades[0]?.exitPrice).toBeCloseTo(100.2);
    expect(result.strategy.closedTrades[0]?.profit).toBeCloseTo(0.2);
  });

  it('locks a reduced public strategy stats table idiom', () => {
    // Public idiom reference: strategy performance public scripts commonly
    // summarize closed trades, win count, and net profit in a last-bar table.
    // Source search: https://www.tradingview.com/scripts/search/strategy%20performance%20table/
    const bars: Bar[] = [
      { time: 1_700_610_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: 1_700_610_060_000, open: 103, high: 105, low: 102, close: 104, volume: 100 },
      { time: 1_700_610_120_000, open: 104, high: 106, low: 103, close: 105, volume: 100 },
      { time: 1_700_610_180_000, open: 105, high: 106, low: 104, close: 105, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Public Strategy Stats Checkpoint", overlay=true, process_orders_on_close=true)
var stats = table.new(position.top_right, 2, 4, border_width=1, border_color=color.white)
if bar_index == 0
    strategy.entry("L", strategy.long, qty=1)
if bar_index == 1
    strategy.close("L", comment="take")
if barstate.islast
    table.cell(stats, 0, 0, "Metric", text_color=color.white, bgcolor=color.blue)
    table.cell(stats, 1, 0, "Value", text_color=color.white, bgcolor=color.blue)
    table.cell(stats, 0, 1, "Closed", text_color=color.white, bgcolor=color.gray)
    table.cell(stats, 1, 1, str.tostring(strategy.closedtrades), text_color=color.white, bgcolor=color.green)
    table.cell(stats, 0, 2, "Wins", text_color=color.white, bgcolor=color.gray)
    table.cell(stats, 1, 2, str.tostring(strategy.wintrades), text_color=color.white, bgcolor=color.green)
    table.cell(stats, 0, 3, "Net", text_color=color.white, bgcolor=color.gray)
    table.cell(stats, 1, 3, str.tostring(strategy.netprofit, "#.##"), text_color=color.white, bgcolor=color.green)
plot(strategy.closedtrades, title="Closed Trades")
plot(strategy.wintrades, title="Win Trades")
plot(strategy.netprofit, title="Net Profit")
`, { bars });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 1, 1, 1]);
    expect(getPlot(result, 'Win Trades').values).toEqual([0, 1, 1, 1]);
    expect(getPlot(result, 'Net Profit').values).toEqual([0, 4, 4, 4]);
    expect(result.strategy.closedTrades[0]).toMatchObject({
      entryOrderId: 'L',
      exitOrderId: 'Close L',
      entryPrice: 100,
      exitPrice: 104,
      profit: 4,
    });
    expect(result.drawings).toEqual([
      {
        id: 'table_table.new_0_0',
        type: 'table',
        persistent: true,
        barIndex: 0,
        position: 'top_right',
        columns: 2,
        rows: 4,
        bgcolor: null,
        frameColor: null,
        frameWidth: 0,
        borderColor: '#FFFFFF',
        borderWidth: 1,
        cells: [
          {
            column: 0,
            row: 0,
            text: 'Metric',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#2196F3',
          },
          {
            column: 1,
            row: 0,
            text: 'Value',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#2196F3',
          },
          {
            column: 0,
            row: 1,
            text: 'Closed',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#787B86',
          },
          {
            column: 1,
            row: 1,
            text: '1',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#4CAF50',
          },
          {
            column: 0,
            row: 2,
            text: 'Wins',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#787B86',
          },
          {
            column: 1,
            row: 2,
            text: '1',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#4CAF50',
          },
          {
            column: 0,
            row: 3,
            text: 'Net',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#787B86',
          },
          {
            column: 1,
            row: 3,
            text: '4.00',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#4CAF50',
          },
        ],
      },
    ]);
  });

  it('locks the official strategy profit-loss exit idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/strategies/
    const bars: Bar[] = [
      { time: 1_700_000_000_000, open: 100, high: 100.4, low: 99.8, close: 100.2, volume: 100 },
      { time: 1_700_000_060_000, open: 100.2, high: 100.8, low: 99.9, close: 100.4, volume: 100 },
      { time: 1_700_000_120_000, open: 100.4, high: 101.5, low: 100, close: 101, volume: 100 },
      { time: 1_700_000_180_000, open: 101, high: 101.4, low: 100.6, close: 101.1, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Official Profit Loss Exit Checkpoint", process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.exit("Bracket", "Long", profit=4, loss=2)
plot(strategy.closedtrades, title="Closed Trades")
plot(strategy.netprofit, title="Net Profit")
`, {
      bars,
      engineOptions: { runtime: { syminfo: { mintick: 0.25 } } },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 0, 0, 1]);
    expect(getPlot(result, 'Net Profit').values).toEqual([0, 0, 0, 1]);
    expect(result.strategy.closedTrades[0]).toMatchObject({
      entryOrderId: 'Long',
      exitOrderId: 'Bracket Limit',
      entryPrice: 100.2,
      exitPrice: 101.2,
      profit: 1,
    });
  });

  it('locks the official strategy trailing exit tick idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/strategies/
    const bars: Bar[] = [
      { time: 1_700_000_000_000, open: 100, high: 100.5, low: 99.5, close: 100, volume: 100 },
      { time: 1_700_000_060_000, open: 100.2, high: 100.6, low: 99.8, close: 100.4, volume: 100 },
      { time: 1_700_000_120_000, open: 101, high: 101.5, low: 100.8, close: 101.2, volume: 100 },
      { time: 1_700_000_180_000, open: 101, high: 101, low: 100.9, close: 101, volume: 100 },
      { time: 1_700_000_240_000, open: 101, high: 101.2, low: 100.7, close: 100.8, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Official Trailing Exit Checkpoint", process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.exit("Trail", "Long", trail_points=5, trail_offset=4)
plot(strategy.closedtrades, title="Closed Trades")
plot(strategy.netprofit, title="Net Profit")
`, {
      bars,
      engineOptions: { runtime: { syminfo: { mintick: 0.1 } } },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 0, 0, 0, 1]);
    expect(roundSeries(getPlot(result, 'Net Profit').values)).toEqual([0, 0, 0, 0, 1.1]);
    expect(result.strategy.closedTrades[0]).toMatchObject({
      entryOrderId: 'Long',
      exitOrderId: 'Trail',
      entryPrice: 100,
      exitPrice: 101.1,
    });
    expect(result.strategy.closedTrades[0]?.profit).toBeCloseTo(1.1);
  });

  it('locks official default broker path and opening-gap fill assumptions', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/strategies/#broker-emulator
    const script = `
strategy("Official Broker Path Checkpoint", initial_capital=1000, process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.exit("Bracket", "Long", limit=103, stop=97)
plot(strategy.closedtrades, title="Closed Trades")
plot(strategy.netprofit, title="Net Profit")
`;
    const baseBars: Bar[] = [
      { time: 1_700_000_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: 1_700_000_060_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
    ];

    const highFirst = runCompatScript(script, {
      bars: [
        ...baseBars,
        { time: 1_700_000_120_000, open: 100, high: 104, low: 94, close: 100, volume: 100 },
        { time: 1_700_000_180_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      ],
    });
    const lowFirst = runCompatScript(script, {
      bars: [
        ...baseBars,
        { time: 1_700_000_120_000, open: 100, high: 106, low: 96, close: 100, volume: 100 },
        { time: 1_700_000_180_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      ],
    });
    const openingGap = runCompatScript(script, {
      bars: [
        ...baseBars,
        { time: 1_700_000_120_000, open: 95, high: 99, low: 94, close: 98, volume: 100 },
        { time: 1_700_000_180_000, open: 98, high: 99, low: 97, close: 98, volume: 100 },
      ],
    });

    expect(highFirst.errors).toEqual([]);
    expect(lowFirst.errors).toEqual([]);
    expect(openingGap.errors).toEqual([]);
    expect(getPlot(highFirst, 'Closed Trades').values).toEqual([0, 0, 0, 1]);
    expect(getPlot(lowFirst, 'Closed Trades').values).toEqual([0, 0, 0, 1]);
    expect(getPlot(openingGap, 'Closed Trades').values).toEqual([0, 0, 0, 1]);
    expect(getPlot(highFirst, 'Net Profit').values).toEqual([0, 0, 0, 3]);
    expect(getPlot(lowFirst, 'Net Profit').values).toEqual([0, 0, 0, -3]);
    expect(getPlot(openingGap, 'Net Profit').values).toEqual([0, 0, 0, -5]);
    expect(highFirst.strategy.closedTrades[0]).toMatchObject({
      exitOrderId: 'Bracket Limit',
      entryPrice: 100,
      exitPrice: 103,
      profit: 3,
    });
    expect(lowFirst.strategy.closedTrades[0]).toMatchObject({
      exitOrderId: 'Bracket Stop',
      entryPrice: 100,
      exitPrice: 97,
      profit: -3,
    });
    expect(openingGap.strategy.closedTrades[0]).toMatchObject({
      exitOrderId: 'Bracket Stop',
      entryPrice: 100,
      exitPrice: 95,
      profit: -5,
    });
  });

  it('runs strategy order helpers with named-prefix positional tails', () => {
    const bars: Bar[] = [
      { time: 1_700_000_000_000, open: 100, high: 103, low: 99, close: 102, volume: 100 },
      { time: 1_700_000_060_000, open: 105, high: 107, low: 104, close: 106, volume: 100 },
      { time: 1_700_000_120_000, open: 106, high: 110, low: 105, close: 108, volume: 100 },
      { time: 1_700_000_180_000, open: 108, high: 109, low: 103, close: 104, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Strategy Prefix Args", initial_capital=1000)
if bar_index == 0
    strategy.entry(id="Long", strategy.long, 1)
if bar_index == 1
    strategy.exit(id="Bracket", "Long", na, na, na, 108, na, 99)
plot(strategy.position_size, title="Position")
plot(strategy.closedtrades, title="Closed Trades")
plot(strategy.netprofit, title="Net Profit")
`, { bars });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Position').values).toEqual([0, 1, 1, 0]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 0, 0, 1]);
    expect(getPlot(result, 'Net Profit').values).toEqual([0, 0, 0, 3]);
    expect(result.strategy.closedTrades[0]).toMatchObject({
      entryOrderId: 'Long',
      exitOrderId: 'Bracket Limit',
      entryPrice: 105,
      exitPrice: 108,
      profit: 3,
    });
  });

  it('runs strategy close helpers with named-prefix positional tails', () => {
    const bars: Bar[] = [
      { time: 1_700_300_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: 1_700_300_060_000, open: 101, high: 102, low: 100, close: 101, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Strategy Close Prefix Args", process_orders_on_close=true)
if bar_index == 0
    strategy.entry(id="Long", strategy.long, 1)
if bar_index == 1
    strategy.close(id="Long", "close comment", 1, na, "close alert")
plot(strategy.position_size, title="Position")
plot(strategy.closedtrades, title="Closed Trades")
`, { bars });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Position').values).toEqual([1, 0]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 1]);
    expect(result.strategy.closedTrades[0]).toMatchObject({
      entryOrderId: 'Long',
      exitOrderId: 'Close Long',
      exitBarIndex: 1,
    });
    expect(result.alerts.find((alert) => alert.id === 'strategy_order_fills')?.events.map((event) => event.message)).toEqual([
      'close alert',
    ]);
  });

  it('locks a reduced official strategy immediate close idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/strategies/#strategyclose-and-strategyclose_all
    const bars: Bar[] = [
      { time: 1_700_350_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: 1_700_350_060_000, open: 101, high: 103, low: 100, close: 102, volume: 100 },
      { time: 1_700_350_120_000, open: 103, high: 104, low: 102, close: 103, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Official Immediate Close Checkpoint", process_orders_on_close=false)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.close("Long", immediately=true)
plot(strategy.position_size, title="Position")
plot(strategy.closedtrades, title="Closed Trades")
plot(strategy.netprofit, title="Net Profit")
`, { bars });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Position').values).toEqual([0, 0, 0]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 1, 1]);
    expect(getPlot(result, 'Net Profit').values).toEqual([0, 1, 1]);
    expect(result.strategy.closedTrades[0]).toMatchObject({
      entryOrderId: 'Long',
      exitOrderId: 'Close Long',
      entryBarIndex: 1,
      exitBarIndex: 1,
      entryPrice: 101,
      exitPrice: 102,
      profit: 1,
    });
  });

  it('locks a reduced official strategy fill-alert suppression idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/strategies/
    const bars: Bar[] = [
      { time: 1_700_360_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: 1_700_360_060_000, open: 101, high: 103, low: 100, close: 102, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Official Disable Alert Checkpoint", process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1, alert_message="entry suppressed", disable_alert=true)
if bar_index == 1
    strategy.close("Long", alert_message="close emitted")
plot(strategy.closedtrades, title="Closed Trades")
`, { bars });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 1]);
    expect(result.alerts.find((alert) => alert.id === 'strategy_order_fills')?.events.map((event) => event.message)).toEqual([
      'close emitted',
    ]);
    expect(result.strategy.fills.map((fill) => ({
      orderId: fill.orderId,
      alertMessage: fill.alertMessage,
      disableAlert: fill.disableAlert,
    }))).toEqual([
      { orderId: 'Long', alertMessage: 'entry suppressed', disableAlert: true },
      { orderId: 'Close Long', alertMessage: 'close emitted', disableAlert: false },
    ]);
  });

  it('locks a reduced official strategy entry-direction risk idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/strategies/
    const bars: Bar[] = [
      { time: 1_700_370_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: 1_700_370_060_000, open: 100, high: 103, low: 99, close: 102, volume: 100 },
      { time: 1_700_370_120_000, open: 102, high: 103, low: 100, close: 101, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Official Allow Entry In Checkpoint", process_orders_on_close=true)
strategy.risk.allow_entry_in(strategy.direction.long)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=2)
if bar_index == 1
    strategy.entry("Blocked Short", strategy.short, qty=1)
if bar_index == 2
    strategy.order("Raw Short", strategy.short, qty=1)
plot(strategy.position_size, title="Position")
plot(strategy.closedtrades, title="Closed Trades")
plot(strategy.opentrades, title="Open Trades")
`, { bars });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Position').values).toEqual([2, 0, -1]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 1, 1]);
    expect(getPlot(result, 'Open Trades').values).toEqual([1, 0, 1]);
    expect(result.strategy.orders.map((order) => ({
      id: order.id,
      qty: order.qty,
      requestedQty: order.requestedQty,
      filledQty: order.filledQty,
    }))).toEqual([
      { id: 'Long', qty: 2, requestedQty: 2, filledQty: 2 },
      { id: 'Blocked Short', qty: 2, requestedQty: 0, filledQty: 2 },
      { id: 'Raw Short', qty: 1, requestedQty: 1, filledQty: 1 },
    ]);
    expect(result.strategy.closedTrades[0]).toMatchObject({
      entryOrderId: 'Long',
      exitOrderId: 'Blocked Short',
      qty: 2,
    });
  });

  it('locks a reduced official strategy bar-magnifier idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/strategies/
    const baseTime = 1_700_100_000_000;
    const bars: Bar[] = [
      { time: baseTime, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: baseTime + 60_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: baseTime + 120_000, open: 100, high: 105, low: 95, close: 100, volume: 100 },
      { time: baseTime + 180_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
    ];
    const intrabars = new InMemoryStrategyIntrabarDatafeed([{
      symbol: 'BTCUSDT',
      timeframe: '60',
      chartBarTime: bars[2].time,
      chartBarIndex: 2,
      chartBar: bars[2],
      source: 'lower_timeframe',
      ticks: [
        { time: bars[2].time, price: 100, kind: 'intrabar_open', sequence: 0 },
        { time: bars[2].time + 15_000, price: 104, kind: 'intrabar_high', sequence: 1 },
        { time: bars[2].time + 30_000, price: 96, kind: 'intrabar_low', sequence: 2 },
        { time: bars[2].time + 45_000, price: 100, kind: 'intrabar_close', sequence: 3 },
      ],
    }]);
    const result = runCompatScript(`
strategy("Official Bar Magnifier Checkpoint", use_bar_magnifier=true, process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.exit("Bracket", "Long", limit=103, stop=97)
plot(strategy.closedtrades, title="Closed Trades")
plot(strategy.netprofit, title="Net Profit")
`, {
      bars,
      engineOptions: { strategyIntrabarDatafeed: intrabars },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 0, 0, 1]);
    expect(getPlot(result, 'Net Profit').values).toEqual([0, 0, 0, 3]);
    expect(result.strategy.intrabarContexts.map((context) => context.source)).toEqual([
      'chart_ohlc',
      'chart_ohlc',
      'lower_timeframe',
      'chart_ohlc',
    ]);
    expect(result.strategy.closedTrades[0]).toMatchObject({
      entryOrderId: 'Long',
      exitOrderId: 'Bracket Limit',
      entryPrice: 100,
      exitPrice: 103,
      exitTime: bars[2].time + 15_000,
      profit: 3,
    });
  });

  it('locks a reduced official strategy stop-limit order idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/strategies/#order-types
    const bars: Bar[] = [
      { time: 1_700_150_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: 1_700_150_060_000, open: 100, high: 102.5, low: 97, close: 100, volume: 100 },
      { time: 1_700_150_120_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Official Stop Limit Checkpoint")
if bar_index == 0
    strategy.entry("Long stop-limit", strategy.long, qty=1, stop=102, limit=98)
plot(strategy.position_size, title="Position")
`, { bars });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Position').values).toEqual([0, 0, 1]);
    expect(result.strategy.fills.map(({ orderId, price, barIndex, time }) => ({ orderId, price, barIndex, time }))).toEqual([
      { orderId: 'Long stop-limit', price: 98, barIndex: 1, time: bars[1].time },
    ]);
    expect(result.strategy.orders[0]).toMatchObject({
      id: 'Long stop-limit',
      type: 'stop_limit',
      status: 'filled',
      stopLimitActivated: true,
      stopLimitActivatedBarIndex: 1,
      avgFillPrice: 98,
      updatedBarIndex: 1,
    });
  });

  it('locks a reduced official strategy calc-on-order-fills idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/strategies/
    const bars: Bar[] = [
      { time: 1_700_200_000_000, open: 100, high: 100.5, low: 99.5, close: 100.2, volume: 100 },
      { time: 1_700_200_060_000, open: 100, high: 100.5, low: 99.6, close: 100.4, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Official Recalculate After Fill Checkpoint", calc_on_order_fills=true, process_orders_on_close=true)
var recalculations = 0
recalculations += 1
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1, limit=99.8, alert_message="entry filled")
if strategy.position_size > 0
    strategy.close("Long")
plot(strategy.position_size, title="Position")
plot(strategy.closedtrades, title="Closed Trades")
plot(recalculations, title="Recalculations")
`, { bars });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Position').values).toEqual([0, 0]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 1]);
    expect(getPlot(result, 'Recalculations').values).toEqual([1, 2]);
    expect(result.strategy.closedTrades[0]).toMatchObject({
      entryOrderId: 'Long',
      exitOrderId: 'Close Long',
      entryBarIndex: 1,
      exitBarIndex: 1,
    });
    expect(result.alerts.find((alert) => alert.id === 'strategy_order_fills')?.events.map((event) => event.message)).toEqual([
      'entry filled',
    ]);
  });

  it('locks a reduced official strategy calc-on-every-tick idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/strategies/
    const bars: Bar[] = [
      { time: 1_700_300_000_000, open: 100, high: 101, low: 99, close: 100.2, volume: 100 },
      { time: 1_700_300_060_000, open: 100.2, high: 101.2, low: 99.8, close: 100.8, volume: 100 },
      { time: 1_700_300_120_000, open: 100.8, high: 102, low: 100.4, close: 101.6, volume: 100 },
    ];
    const defaultAst = parse(`//@version=6
strategy("Official Default Realtime Strategy Checkpoint", calc_on_every_tick=false)
plot(close, title="Realtime Close")
`);
    const everyTickAst = parse(`//@version=6
strategy("Official Every Tick Strategy Checkpoint", calc_on_every_tick=true)
plot(close, title="Realtime Close")
`);
    const realtimeBar: Bar = {
      ...bars[2]!,
      time: bars[2]!.time + 60_000,
      open: 102,
      high: 103,
      low: 101.5,
      close: 102.5,
    };

    const defaultEngine = new TealscriptEngine();
    const defaultResult = defaultEngine.execute(defaultAst, bars);
    const defaultFirstTick = defaultEngine.updateBar(defaultAst, realtimeBar);
    const defaultFirstValues = [...defaultFirstTick.find((plot) => plot.title === 'Realtime Close')!.values];
    const defaultSecondTick = defaultEngine.updateBar(defaultAst, { ...realtimeBar, close: 102.75 });
    const defaultSecondValues = [...defaultSecondTick.find((plot) => plot.title === 'Realtime Close')!.values];

    const everyTickEngine = new TealscriptEngine();
    const everyTickResult = everyTickEngine.execute(everyTickAst, bars);
    const everyTickFirstTick = everyTickEngine.updateBar(everyTickAst, realtimeBar);
    const everyTickFirstValues = [...everyTickFirstTick.find((plot) => plot.title === 'Realtime Close')!.values];
    const everyTickSecondTick = everyTickEngine.updateBar(everyTickAst, { ...realtimeBar, close: 102.75 });
    const everyTickSecondValues = [...everyTickSecondTick.find((plot) => plot.title === 'Realtime Close')!.values];

    expect(defaultResult.errors).toEqual([]);
    expect(defaultFirstValues).toEqual([100.2, 100.8, 101.6]);
    expect(defaultSecondValues).toEqual([100.2, 100.8, 101.6]);
    expect(everyTickResult.errors).toEqual([]);
    expect(everyTickFirstValues).toEqual([100.2, 100.8, 101.6, 102.5]);
    expect(everyTickSecondValues).toEqual([100.2, 100.8, 101.6, 102.75]);
  });

  it('locks the official repeated request-call limit idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/writing/limitations/
    const result = runCompatScript(`
indicator("Official Request Limit Checkpoint")
reqSum = 0.0
for i = 1 to 50
    reqSum := reqSum + nz(request.security("MISSING", "2", close, ignore_invalid_symbol=true), 0)
plot(reqSum, title="Request Sum")
`, {
      bars: [compatibilityBars[0]!],
      engineOptions: { requestDatafeed: new InMemoryRequestDatafeed([]) },
    });

    expect(result.errors).toEqual([]);
    expect(result.profile.requestContexts).toBe(1);
    expect(getPlot(result, 'Request Sum').values).toEqual([0]);
  });
});
