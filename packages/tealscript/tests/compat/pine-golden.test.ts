import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, roundSeries, runCompatScript } from './fixtures';

describe('Pine compatibility golden harness', () => {
  it('runs a minimal plotted indicator against deterministic bars', () => {
    const result = runCompatScript(`
indicator("Golden SMA", overlay=true)
length = input.int(3, "Length")
basis = ta.sma(close, length)
plot(basis, title="Basis", color=color.blue)
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Golden SMA');
    expect(result.inputs).toEqual([
      {
        id: 'input_Length',
        type: 'int',
        title: 'Length',
        defval: 3,
      },
    ]);

    const basis = getPlot(result, 'Basis');
    expect(basis.values).toHaveLength(compatibilityBars.length);
    expect(roundSeries(basis.values)).toEqual([null, null, 104.666667, 105, 103, 100.666667, 101, 104.333333, 107, 109.333333, 109.666667, 111]);
  });

  it('covers common moving-average and oscillator snippets', () => {
    const result = runCompatScript(`
indicator("MA and RSI")
fast = ta.ema(close, 3)
slow = ta.sma(close, 5)
rsi = ta.rsi(close, 5)
plot(fast, title="Fast EMA")
plot(slow, title="Slow SMA")
plot(rsi, title="RSI")
`);

    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.title)).toEqual(['Fast EMA', 'Slow SMA', 'RSI']);
    expect(roundSeries(getPlot(result, 'Fast EMA').values)).toEqual([102, 104.25, 105.833333, 104, 101, 100.333333, 102.5, 106.666667, 107.5, 110.166667, 109.833333, 111.5]);
    expect(roundSeries(getPlot(result, 'Slow SMA').values)).toEqual([null, null, null, null, 103.2, 102.8, 102.6, 103, 104, 106.4, 108.4, 110]);
    expect(getPlot(result, 'RSI').values).toHaveLength(compatibilityBars.length);
  });

  it('covers tuple-returning MACD and Bollinger band snippets', () => {
    const result = runCompatScript(`
indicator("MACD and BB")
[macdLine, signalLine, hist] = ta.macd(close, 3, 6, 3)
[basis, upper, lower] = ta.bb(close, 5, 2.0)
plot(macdLine, title="MACD")
plot(signalLine, title="Signal")
plot(hist, title="Hist")
plot(basis, title="Basis")
plot(upper, title="Upper")
plot(lower, title="Lower")
`);

    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.title)).toEqual(['MACD', 'Signal', 'Hist', 'Basis', 'Upper', 'Lower']);
    expect(getPlot(result, 'MACD').values).toHaveLength(compatibilityBars.length);
    expect(roundSeries(getPlot(result, 'Basis').values)).toEqual([null, null, null, null, 103.2, 102.8, 102.6, 103, 104, 106.4, 108.4, 110]);
  });

  it('covers trend, volume, and pivot snippets', () => {
    const result = runCompatScript(`
indicator("Trend volume pivots", overlay=true)
[supertrend, direction] = ta.supertrend(2.0, 3)
vwap = ta.vwap()
pivotHigh = ta.pivothigh(high, 2, 2)
pivotLow = ta.pivotlow(low, 2, 2)
plot(supertrend, title="Supertrend")
plot(direction, title="Direction")
plot(vwap, title="VWAP")
plot(pivotHigh, title="Pivot High")
plot(pivotLow, title="Pivot Low")
`);

    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.title)).toEqual(['Supertrend', 'Direction', 'VWAP', 'Pivot High', 'Pivot Low']);
    expect(getPlot(result, 'VWAP').values).toHaveLength(compatibilityBars.length);
    expect(getPlot(result, 'Pivot High').values.some((value) => value !== null)).toBe(true);
  });

  it('runs single-line user-defined functions', () => {
    const result = runCompatScript(`
indicator("UDF single line")
spread(source, length) => source - ta.sma(source, length)
plot(spread(close, 3), title="Spread")
plot(spread(source=high, length=3), title="Named Spread")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Spread').values)).toEqual([null, null, 2.333333, -2, -4, -0.666667, 3, 4.666667, 1, 1.666667, 0.333333, 1]);
    expect(roundSeries(getPlot(result, 'Named Spread').values)).toEqual([null, null, 2.333333, 1.333333, -3, -3.666667, 1.666667, 4.666667, 2.333333, 1, 1.666667, 0]);
  });

  it('runs flat multiline user-defined functions', () => {
    const result = runCompatScript(`
indicator("UDF multiline")
rangeSize(highValue, lowValue) =>
    range = highValue - lowValue
    math.abs(range)
plot(rangeSize(high, low), title="Range")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Range').values)).toEqual([4, 5, 4, 7, 6, 5, 6, 7, 5, 5, 5, 5]);
  });

  it('keeps function-local variables scoped to the function call', () => {
    const result = runCompatScript(`
indicator("UDF local scope")
basis = 1
doubleWithLocal(value) =>
    basis = value * 2
    basis
plot(doubleWithLocal(close), title="Doubled")
plot(basis, title="Global Basis")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Doubled').values)).toEqual([204, 210, 214, 206, 198, 200, 208, 218, 216, 222, 220, 224]);
    expect(roundSeries(getPlot(result, 'Global Basis').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it('supports nested user-defined functions inside indicators', () => {
    const result = runCompatScript(`
indicator("UDF nested")
smooth(source) => ta.sma(source, 3)
distance(source) => source - smooth(source)
plot(distance(close), title="Distance")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Distance').values)).toEqual([null, null, 2.333333, -2, -4, -0.666667, 3, 4.666667, 1, 1.666667, 0.333333, 1]);
  });

  it('preserves history for derived regular series variables', () => {
    const result = runCompatScript(`
indicator("Regular series history")
dist = close - ta.sma(close, 3)
plot(dist, title="Distance")
plot(dist[1], title="Previous Distance")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Distance').values)).toEqual([null, null, 2.333333, -2, -4, -0.666667, 3, 4.666667, 1, 1.666667, 0.333333, 1]);
    expect(roundSeries(getPlot(result, 'Previous Distance').values)).toEqual([null, null, null, 2.333333, -2, -4, -0.666667, 3, 4.666667, 1, 1.666667, 0.333333]);
  });

  it('persists root var values across bars', () => {
    const result = runCompatScript(`
indicator("Root var")
var counter = 0
counter += 1
plot(counter, title="Counter")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Counter').values)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('persists function-local var values across bars', () => {
    const result = runCompatScript(`
indicator("Function var")
countCalls() =>
    var counter = 0
    counter += 1
    counter
plot(countCalls(), title="Function Counter")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Function Counter').values)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
});
