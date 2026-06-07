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

  it('accepts legacy global TA aliases used by v4 public scripts', () => {
    const result = runCompatScript(`
//@version=4
study("Legacy global TA")
fast = ema(close, 3)
slow = sma(close, 5)
upper = highest(2)
lower = lowest(2)
crossed = cross(fast, slow) ? 1 : 0
up = crossover(fast, slow) ? 1 : 0
down = crossunder(fast, slow) ? 1 : 0
momentum = rsi(close, 5)
plot(fast, title="Fast EMA")
plot(slow, title="Slow SMA")
plot(upper, title="Highest")
plot(lower, title="Lowest")
plot(crossed + up + down, title="Cross Flags")
plot(momentum, title="RSI")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Fast EMA').values)).toEqual([102, 103.5, 105.25, 104.125, 101.5625, 100.78125, 102.390625, 105.695313, 106.847656, 108.923828, 109.461914, 110.730957]);
    expect(roundSeries(getPlot(result, 'Slow SMA').values)).toEqual([null, null, null, null, 103.2, 102.8, 102.6, 103, 104, 106.4, 108.4, 110]);
    expect(getPlot(result, 'Highest').values).toEqual([103, 106, 108, 109, 109, 104, 105, 110, 111, 112, 114, 114]);
    expect(getPlot(result, 'Lowest').values).toEqual([99, 99, 101, 102, 98, 96, 96, 99, 103, 106, 107, 108]);
    expect(getPlot(result, 'Cross Flags').values).toHaveLength(compatibilityBars.length);
    expect(getPlot(result, 'RSI').values).toHaveLength(compatibilityBars.length);
  });

  it('runs a reduced legacy v4 public-script copy-paste checkpoint', () => {
    const result = runCompatScript(`
//@version=4
study("Legacy Public Bundle", shorttitle="LPB", overlay=true, resolution="60", resolution_gaps=false)
src = input(close, title="Source", type=input.source)
length = input(3, title="Length", type=input.integer)
show = input(true, title="Show", type=input.bool)
fast = ema(src, length)
slow = sma(src, length + 2)
signal = iff(show and crossover(fast, slow), high, na)
plot(fast, title="Fast")
plot(slow, title="Slow")
plot(signal, title="Signal")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Legacy Public Bundle');
    expect(result.indicatorShortTitle).toBe('LPB');
    expect(result.indicatorOverlay).toBe(true);
    expect(result.indicatorTimeframe).toBe('60');
    expect(result.indicatorTimeframeGaps).toBe(false);
    expect(result.inputs.map((input) => [input.title, input.type])).toEqual([
      ['Source', 'source'],
      ['Length', 'int'],
      ['Show', 'bool'],
    ]);
    expect(roundSeries(getPlot(result, 'Fast').values)).toEqual([102, 103.5, 105.25, 104.125, 101.5625, 100.78125, 102.390625, 105.695313, 106.847656, 108.923828, 109.461914, 110.730957]);
    expect(roundSeries(getPlot(result, 'Slow').values)).toEqual([null, null, null, null, 103.2, 102.8, 102.6, 103, 104, 106.4, 108.4, 110]);
    expect(getPlot(result, 'Signal').values).toEqual([null, null, null, null, null, null, null, null, null, null, null, 113]);
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

  it('runs tuple discard placeholders in common TA snippets', () => {
    const result = runCompatScript(`
indicator("Tuple discards")
[_, direction] = ta.supertrend(2.0, 3)
[basis, _, _] = ta.bb(close, 5, 2.0)
plot(direction, title="Direction")
plot(basis, title="Basis")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Direction').values).toEqual([-1, 1, 1, 1, -1, -1, -1, 1, 1, 1, 1, 1]);
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
