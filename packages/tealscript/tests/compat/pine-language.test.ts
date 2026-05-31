import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, roundSeries, runCompatScript } from './fixtures';

describe('Pine compatibility golden harness', () => {
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

  it('runs Pine-style wrapped calls and delimited expressions', () => {
    const result = runCompatScript(`
indicator(
    "Wrapped Delimiters",
    overlay=true
)
offsets = [
    1,
    2,
    3
]
basis = ta.sma(
    close,
    3
)
adjusted = (
    basis + array.get(
        offsets,
        1
    )
)
plot(
    adjusted,
    title="Adjusted Basis"
)
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Adjusted Basis').values)).toEqual([
      null,
      null,
      106.666667,
      107,
      105,
      102.666667,
      103,
      106.333333,
      109,
      111.333333,
      111.666667,
      113,
    ]);
  });

  it('runs user-defined function if-branch returns', () => {
    const result = runCompatScript(`
indicator("UDF if branch")
upScore(value) =>
    if value > 0
        1
downScore(value) =>
    if value < 0
        -1
plot(upScore(close - open), title="Up Score")
plot(downScore(close - open), title="Down Score")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Up Score').values)).toEqual([1, 1, 1, null, null, 1, 1, 1, null, 1, null, 1]);
    expect(roundSeries(getPlot(result, 'Down Score').values)).toEqual([null, null, null, -1, -1, null, null, null, -1, null, -1, null]);
  });

  it('runs user-defined function if else branch returns', () => {
    const result = runCompatScript(`
indicator("UDF if else branch")
classify(value) =>
    if value > 0
        1
    else if value < 0
        -1
    else
        0
plot(classify(close - open), title="Candle Direction")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Candle Direction').values)).toEqual([1, 1, 1, -1, -1, 1, 1, 1, -1, 1, -1, 1]);
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

  it('rejects recursive user-defined function calls with a clear diagnostic', () => {
    const result = runCompatScript(`
indicator("UDF recursion")
countdown(value) => value <= 0 ? 0 : countdown(value - 1)
plot(countdown(2), title="Countdown")
`);

    expect(result.errors[0]?.message).toBe('Recursive user function calls are not supported: countdown -> countdown');
  });

  it('matches runtime.error halting behavior', () => {
    const result = runCompatScript(`
indicator("Runtime error")
plot(close, title="Before")
if bar_index == 1
    runtime.error("bad bar")
plot(open, title="After")
`);

    expect(result.errors[0]?.message).toBe('bad bar');
    expect(roundSeries(getPlot(result, 'Before').values)).toEqual([102, 105]);
    expect(roundSeries(getPlot(result, 'After').values)).toEqual([100]);
  });

  it('runs common global helper and cast idioms', () => {
    const result = runCompatScript(`
indicator("Global helper casts")
source = bar_index == 0 or bar_index == 3 ? na : close
plot(fixnan(source), title="Fixed")
plot(float("4.5"), title="Float")
plot(int(4.9), title="Int")
plot(bool(close > open), title="Bool")
plot(string(12.5) == "12.5", title="String")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Fixed').values)).toEqual([null, 105, 107, 107, 99, 100, 104, 109, 108, 111, 110, 112]);
    expect(roundSeries(getPlot(result, 'Float').values)).toEqual([4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5]);
    expect(roundSeries(getPlot(result, 'Int').values)).toEqual([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
    expect(getPlot(result, 'Bool').values).toEqual([true, true, true, false, false, true, true, true, false, true, false, true]);
    expect(getPlot(result, 'String').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
  });

  it('keeps na arithmetic undefined while na comparisons return false', () => {
    const result = runCompatScript(`
indicator("NA comparison semantics")
gap = close[100]
plot(gap + 1, title="Arithmetic Gap")
plot(gap == gap, title="NA Equal")
plot(gap != gap, title="NA Not Equal")
plot(gap > close, title="NA Greater")
plot(close >= gap, title="Close Greater Equal NA")
plot(na(gap) ? 1 : 0, title="NA Function")
plot(bool(gap), title="Bool Cast")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Arithmetic Gap').values).toEqual([null, null, null, null, null, null, null, null, null, null, null, null]);
    expect(getPlot(result, 'NA Equal').values).toEqual([false, false, false, false, false, false, false, false, false, false, false, false]);
    expect(getPlot(result, 'NA Not Equal').values).toEqual([false, false, false, false, false, false, false, false, false, false, false, false]);
    expect(getPlot(result, 'NA Greater').values).toEqual([false, false, false, false, false, false, false, false, false, false, false, false]);
    expect(getPlot(result, 'Close Greater Equal NA').values).toEqual([false, false, false, false, false, false, false, false, false, false, false, false]);
    expect(getPlot(result, 'NA Function').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(getPlot(result, 'Bool Cast').values).toEqual([false, false, false, false, false, false, false, false, false, false, false, false]);
  });

  it('short-circuits logical guard expressions', () => {
    const result = runCompatScript(`
indicator("Logical short circuit")
guardedAnd = false and runtime.error("and guard failed")
guardedOr = true or runtime.error("or guard failed")
plot(guardedAnd ? 1 : 0, title="Guarded And")
plot(guardedOr ? 1 : 0, title="Guarded Or")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Guarded And').values).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(getPlot(result, 'Guarded Or').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
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

  it('runs dynamic history offset idioms', () => {
    const result = runCompatScript(`
indicator("Dynamic history")
length = input.int(2, "Lookback")
previous = close[length]
fractional = close[1.9]
future = close[-1]
tooFar = close[100]
plot(previous, title="Previous")
plot(fractional, title="Fractional")
plot(future, title="Future")
plot(tooFar, title="Too Far")
plot(na(future) ? 1 : 0, title="Future Is NA")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Previous').values)).toEqual([null, null, 102, 105, 107, 103, 99, 100, 104, 109, 108, 111]);
    expect(roundSeries(getPlot(result, 'Fractional').values)).toEqual([null, 102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110]);
    expect(getPlot(result, 'Future').values).toEqual([null, null, null, null, null, null, null, null, null, null, null, null]);
    expect(getPlot(result, 'Too Far').values).toEqual([null, null, null, null, null, null, null, null, null, null, null, null]);
    expect(getPlot(result, 'Future Is NA').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
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
