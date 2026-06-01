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
    expect(roundSeries(getPlot(result, 'Fast EMA').values)).toEqual([102, 103.5, 105.25, 104.125, 101.5625, 100.78125, 102.390625, 105.695313, 106.847656, 108.923828, 109.461914, 110.730957]);
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
});
