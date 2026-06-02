import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed, type Bar } from '../../src/runtime';
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

  it('locks the official strategy entry and bracket-exit idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/strategies/
    const result = runCompatScript(`
strategy("Official Strategy Checkpoint", initial_capital=1000, process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.exit("Bracket", "Long", limit=106, stop=99)
plot(strategy.position_size, title="Position")
plot(strategy.closedtrades, title="Closed Trades")
plot(strategy.netprofit, title="Net Profit")
`, { bars: compatibilityBars.slice(0, 4) });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Position').values).toEqual([1, 1, 1, 0]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 0, 0, 1]);
    expect(getPlot(result, 'Net Profit').values).toEqual([0, 0, 0, 4]);
    expect(result.strategy.closedTrades[0]).toMatchObject({
      entryOrderId: 'Long',
      exitOrderId: 'Bracket Limit',
      entryPrice: 102,
      exitPrice: 106,
      profit: 4,
    });
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
