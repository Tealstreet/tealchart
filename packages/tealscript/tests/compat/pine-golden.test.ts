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

  it('runs core array mutation helpers', () => {
    const result = runCompatScript(`
indicator("Array helpers")
var array<float> values = array.new_float()
array.push(values, close)
lastIndex = array.size(values) - 1
lastValue = array.get(values, lastIndex)
array.set(values, 0, 42)
plot(lastValue, title="Last Value")
plot(array.get(values, 0), title="First Value")
plot(array.size(values), title="Size")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Last Value').values)).toEqual([102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110, 112]);
    expect(roundSeries(getPlot(result, 'First Value').values)).toEqual([42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42]);
    expect(roundSeries(getPlot(result, 'Size').values)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('runs stack and queue array helpers', () => {
    const result = runCompatScript(`
indicator("Array stack queue")
var array<int> values = array.new_int()
array.push(values, 2)
array.unshift(values, 1)
first = array.shift(values)
last = array.pop(values)
plot(first, title="First")
plot(last, title="Last")
plot(array.size(values), title="Remaining")
array.clear(values)
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'First').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Last').values)).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
    expect(roundSeries(getPlot(result, 'Remaining').values)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('runs array method helper idioms', () => {
    const result = runCompatScript(`
indicator("Array method helpers")
var array<float> window = array.new_float()
window.push(close)
if window.size() > 3
    window.shift()
head = window.get(0)
tail = window.get(window.size() - 1)
plot(head, title="Window Head")
plot(tail, title="Window Tail")
plot(window.size(), title="Window Size")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Window Head').values)).toEqual([102, 102, 102, 105, 107, 103, 99, 100, 104, 109, 108, 111]);
    expect(roundSeries(getPlot(result, 'Window Tail').values)).toEqual([102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110, 112]);
    expect(roundSeries(getPlot(result, 'Window Size').values)).toEqual([1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
  });

  it('runs extended array helper idioms', () => {
    const result = runCompatScript(`
indicator("Array extended helpers")
base = array.from(1, 2, 3, 2)
working = base.copy()
working.insert(2, 4)
removed = working.remove(3)
plot(working.first(), title="First")
plot(working.last(), title="Last")
plot(working.includes(4) ? 1 : 0, title="Includes")
plot(working.indexof(2), title="Index")
plot(working.lastindexof(2), title="Last Index")
plot(working.min(), title="Min")
plot(working.max(), title="Max")
plot(working.sum(), title="Sum")
plot(working.avg(), title="Avg")
plot(removed, title="Removed")
plot(array.size(base), title="Original Size")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'First').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Last').values)).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
    expect(roundSeries(getPlot(result, 'Includes').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Index').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Last Index').values)).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
    expect(roundSeries(getPlot(result, 'Min').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Max').values)).toEqual([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
    expect(roundSeries(getPlot(result, 'Sum').values)).toEqual([9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9]);
    expect(roundSeries(getPlot(result, 'Avg').values)).toEqual([2.25, 2.25, 2.25, 2.25, 2.25, 2.25, 2.25, 2.25, 2.25, 2.25, 2.25, 2.25]);
    expect(roundSeries(getPlot(result, 'Removed').values)).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
    expect(roundSeries(getPlot(result, 'Original Size').values)).toEqual([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
  });

  it('matches documented Pine array ordering and joining idioms', () => {
    const result = runCompatScript(`
indicator("Array ordering helpers")
values = array.from(3, 1, 2)
values.sort(order.descending)
highest = values.get(0)
array.sort(values, order=order.ascending)
lowest = values.get(0)
array.reverse(values)
values.reverse()
values.concat(array.from(4, 5))
joined = values.join("|")
plot(highest, title="Highest")
plot(lowest, title="Lowest")
plot(joined == "1|2|3|4|5" ? 1 : 0, title="Joined")
plot(values.size(), title="Size")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Highest').values)).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
    expect(roundSeries(getPlot(result, 'Lowest').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Joined').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Size').values)).toEqual([5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]);
  });

  it('matches documented Pine array slice window idioms', () => {
    const result = runCompatScript(`
indicator("Array slice window")
values = array.from(0, 1, 2, 3)
window = values.slice(0, 3)
values.remove(0)
window.push(4)
window.set(1, 20)
plot(window.get(0), title="Window First")
plot(window.get(1), title="Window Second")
plot(values.size(), title="Parent Size")
plot(values.get(3), title="Parent Tail")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Window First').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Window Second').values)).toEqual([20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20]);
    expect(roundSeries(getPlot(result, 'Parent Size').values)).toEqual([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
    expect(roundSeries(getPlot(result, 'Parent Tail').values)).toEqual([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
  });

  it('matches common Pine array index assignment idioms', () => {
    const result = runCompatScript(`
indicator("Array index assignment")
values = array.from(1, 2, 3)
values[0] := 10
values[1] += 5
window = values.slice(0, 2)
window[1] *= 2
literal = [4, 5, 6]
literal[2] := 12
plot(values[0], title="First")
plot(values[1], title="Second")
plot(literal[2], title="Literal")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'First').values)).toEqual([10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
    expect(roundSeries(getPlot(result, 'Second').values)).toEqual([14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14]);
    expect(roundSeries(getPlot(result, 'Literal').values)).toEqual([12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12]);
  });

  it('reads array literal values with array helpers', () => {
    const result = runCompatScript(`
indicator("Array literal")
values = [10, 20, 30]
plot(array.get(values, 1), title="Middle")
plot(array.size(values), title="Literal Size")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Middle').values)).toEqual([20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20]);
    expect(roundSeries(getPlot(result, 'Literal Size').values)).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
  });

  it('runs ta.barssince and ta.valuewhen helpers', () => {
    const result = runCompatScript(`
indicator("TA event helpers")
condition = close > open
plot(ta.barssince(condition), title="Bars Since Green")
plot(ta.valuewhen(condition, close, 0), title="Last Green Close")
plot(ta.valuewhen(condition, close, 1), title="Previous Green Close")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Bars Since Green').values)).toEqual([0, 0, 0, 1, 2, 0, 0, 0, 1, 0, 1, 0]);
    expect(roundSeries(getPlot(result, 'Last Green Close').values)).toEqual([102, 105, 107, 107, 107, 100, 104, 109, 109, 111, 111, 112]);
    expect(roundSeries(getPlot(result, 'Previous Green Close').values)).toEqual([null, 102, 105, 105, 105, 107, 100, 104, 104, 109, 109, 111]);
  });

  it('runs ta.vwma and bar-offset window helpers', () => {
    const result = runCompatScript(`
indicator("TA window helpers")
plot(ta.vwma(close, 3), title="VWMA")
plot(ta.highestbars(high, 4), title="Highest Offset")
plot(ta.lowestbars(low, 4), title="Lowest Offset")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'VWMA').values)).toEqual([
      null,
      null,
      104.6,
      104.784615,
      102.43662,
      100.635135,
      101.013333,
      104.962025,
      107.121951,
      109.418605,
      109.777778,
      111.023256,
    ]);
    expect(roundSeries(getPlot(result, 'Highest Offset').values)).toEqual([0, 0, 0, 0, 1, 2, 3, 0, 0, 0, 0, 1]);
    expect(roundSeries(getPlot(result, 'Lowest Offset').values)).toEqual([0, 1, 2, 3, 0, 0, 1, 2, 3, 3, 3, 3]);
  });

  it('runs ta.cross and ta.range compatibility helpers', () => {
    const result = runCompatScript(`
indicator("TA cross range")
plot(ta.cross(close, 104), title="Cross Threshold")
plot(ta.range(close, 4), title="Close Range")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Cross Threshold').values).toEqual([false, true, false, true, false, false, false, true, false, false, false, false]);
    expect(roundSeries(getPlot(result, 'Close Range').values)).toEqual([0, 3, 5, 5, 8, 8, 5, 10, 9, 7, 3, 4]);
  });

  it('runs cumulative and dispersion TA helpers', () => {
    const result = runCompatScript(`
indicator("Cumulative TA docs smoke")
plot(ta.cum(close), title="Cum Close")
plot(ta.variance(close, 3), title="Variance")
plot(ta.dev(close, 3), title="Mean Deviation")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Cum Close').values)).toEqual([102, 207, 314, 417, 516, 616, 720, 829, 937, 1048, 1158, 1270]);
    expect(roundSeries(getPlot(result, 'Variance').values)).toEqual([null, null, 4.222222, 2.666667, 10.666667, 2.888889, 4.666667, 13.555556, 4.666667, 1.555556, 1.555556, 0.666667]);
    expect(roundSeries(getPlot(result, 'Mean Deviation').values)).toEqual([null, null, 1.777778, 1.333333, 2.666667, 1.555556, 2, 3.111111, 2, 1.111111, 1.111111, 0.666667]);
  });

  it('runs string conversion and formatting helpers', () => {
    const result = runCompatScript(`
indicator("String helpers")
formatted = str.tostring(close, "#.00")
message = str.format("close={0:#.0}", close)
joined = "symbol:" + "BTCUSDT"
parsed = str.tonumber("42.5")
invalid = str.tonumber("not a number")
plot(formatted == "102.00", title="Formatted Close")
plot(message == "close=102.0", title="Format Template")
plot(joined == "symbol:BTCUSDT", title="Concatenated Symbol")
plot(parsed, title="Parsed Number")
plot(na(invalid) ? 1 : 0, title="Invalid Is NA")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Formatted Close').values).toEqual([true, false, false, false, false, false, false, false, false, false, false, false]);
    expect(getPlot(result, 'Format Template').values).toEqual([true, false, false, false, false, false, false, false, false, false, false, false]);
    expect(getPlot(result, 'Concatenated Symbol').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(roundSeries(getPlot(result, 'Parsed Number').values)).toEqual([42.5, 42.5, 42.5, 42.5, 42.5, 42.5, 42.5, 42.5, 42.5, 42.5, 42.5, 42.5]);
    expect(getPlot(result, 'Invalid Is NA').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it('runs string search and substring helpers', () => {
    const result = runCompatScript(`
indicator("String search helpers")
text = "BTCUSDT perpetual"
plot(str.contains(text, "USDT"), title="Contains")
plot(str.startswith(text, "BTC"), title="Starts")
plot(str.endswith(text, "perpetual"), title="Ends")
plot(str.pos(text, "USDT"), title="Position")
plot(str.pos(text, "ETH"), title="Missing Position")
plot(str.substring(text, 0, 3) == "BTC", title="Substring")
plot(str.length(text), title="Length")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Contains').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Starts').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Ends').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(roundSeries(getPlot(result, 'Position').values)).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
    expect(getPlot(result, 'Missing Position').values).toEqual([null, null, null, null, null, null, null, null, null, null, null, null]);
    expect(getPlot(result, 'Substring').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(roundSeries(getPlot(result, 'Length').values)).toEqual([17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17]);
  });

  it('runs string case trim and replacement helpers', () => {
    const result = runCompatScript(`
indicator("String transform helpers")
text = "  btc-usdt-usdt  "
trimmed = str.trim(text)
plot(str.upper(trimmed) == "BTC-USDT-USDT", title="Upper")
plot(str.lower("BTC") == "btc", title="Lower")
plot(str.replace(trimmed, "usdt", "perp") == "btc-perp-usdt", title="Replace One")
plot(str.replace_all(trimmed, "usdt", "perp") == "btc-perp-perp", title="Replace All")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Upper').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Lower').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Replace One').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Replace All').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
  });

  it('matches documented Pine string formatting examples', () => {
    const result = runCompatScript(`
indicator("String docs smoke")
plot(str.tostring(1.25) == "1.25", title="Default Number")
plot(str.tostring(1.25, "#") == "1", title="Rounded Integer")
plot(str.tostring(1.25, "#.#") == "1.3", title="One Decimal")
plot(str.tostring(1.25, "#.0000") == "1.2500", title="Trailing Zeros")
plot(str.tostring(true) == "true", title="Bool True")
plot(str.tostring(5 == 3) == "false", title="Bool False")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Default Number').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Rounded Integer').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'One Decimal').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Trailing Zeros').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Bool True').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Bool False').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
  });

  it('runs generic input helpers with inferred types', () => {
    const result = runCompatScript(`
indicator("Generic inputs")
length = input(3, "Length")
enabled = input(true, "Enabled")
label = input("BTC", "Label")
plot(ta.sma(close, length), title="Basis")
plot(enabled, title="Enabled")
plot(label == "BTC", title="Label")
`);

    expect(result.errors).toEqual([]);
    expect(result.inputs).toEqual([
      {
        id: 'input_Length',
        type: 'int',
        title: 'Length',
        defval: 3,
      },
      {
        id: 'input_Enabled',
        type: 'bool',
        title: 'Enabled',
        defval: true,
      },
      {
        id: 'input_Label',
        type: 'string',
        title: 'Label',
        defval: 'BTC',
      },
    ]);
    expect(roundSeries(getPlot(result, 'Basis').values)).toEqual([null, null, 104.666667, 105, 103, 100.666667, 101, 104.333333, 107, 109.333333, 109.666667, 111]);
    expect(getPlot(result, 'Enabled').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Label').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
  });

  it('runs common typed input helpers', () => {
    const result = runCompatScript(`
indicator("Typed inputs")
start = input.time(1700000000000, "Start")
tf = input.timeframe("60", "Timeframe")
symbol = input.symbol("BINANCE:BTCUSDT", "Symbol")
session = input.session("0930-1600", "Session")
memo = input.text_area("watch breakout", "Notes")
plot(start == 1700000000000, title="Time")
plot(tf == "60", title="Timeframe")
plot(symbol == "BINANCE:BTCUSDT", title="Symbol")
plot(session == "0930-1600", title="Session")
plot(str.contains(memo, "breakout"), title="Text Area")
`);

    expect(result.errors).toEqual([]);
    expect(result.inputs.map((input) => input.type)).toEqual(['time', 'timeframe', 'symbol', 'session', 'text_area']);
    expect(getPlot(result, 'Time').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Timeframe').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Symbol').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Session').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Text Area').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
  });

  it('preserves common input metadata', () => {
    const result = runCompatScript(`
indicator("Input metadata")
mode = input.string("EMA", "Mode", options=["SMA", "EMA"], tooltip="Average type", group="Calculation", inline="ma", confirm=true)
plot(mode == "EMA", title="Mode")
`);

    expect(result.errors).toEqual([]);
    expect(result.inputs).toEqual([
      {
        id: 'input_Mode',
        type: 'string',
        title: 'Mode',
        defval: 'EMA',
        options: ['SMA', 'EMA'],
        tooltip: 'Average type',
        group: 'Calculation',
        inline: 'ma',
        confirm: true,
      },
    ]);
    expect(getPlot(result, 'Mode').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
  });

  it('matches documented Pine input helper idioms', () => {
    const result = runCompatScript(`
indicator("Input docs smoke")
maTypeInput = input.string("SMA", "MA type", options=["SMA", "EMA"])
maLengthInput = input.int(5, "MA length", minval=1)
showSignalsInput = input.bool(true, "Show signals")
plot(maTypeInput == "SMA", title="MA Type")
plot(maLengthInput == 5, title="MA Length")
plot(showSignalsInput, title="Show Signals")
`);

    expect(result.errors).toEqual([]);
    expect(result.inputs.map((input) => input.title)).toEqual(['MA type', 'MA length', 'Show signals']);
    expect(getPlot(result, 'MA Type').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'MA Length').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Show Signals').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
  });

  it('matches documented Pine calculated color idioms', () => {
    const result = runCompatScript(`
indicator("Color docs smoke", overlay=true)
baseColor = color.rgb(255, 0, 0)
derivedColor = color.rgb(color.r(baseColor), 128, color.b(baseColor), 50)
signal = ta.rsi(close, 7)
signalColor = color.from_gradient(signal, 0, 100, color.rgb(255, 0, 0), color.rgb(0, 255, 0, 50))
plot(close, title="Close", color=derivedColor)
plot(signal, title="Signal", color=signalColor)
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Close').color).toEqual(Array(compatibilityBars.length).fill('#FF800080'));
    expect(roundSeries(getPlot(result, 'Signal').values)).toEqual([
      null,
      100,
      100,
      55.555556,
      38.461538,
      42.857143,
      55.555556,
      65.217391,
      57.142857,
      59.090909,
      68.421053,
      88.235294,
    ]);
    expect(getPlot(result, 'Signal').color).toEqual([
      null,
      '#00FF0080',
      '#00FF0080',
      '#718E00B8',
      '#9D6200CF',
      '#926D00C9',
      '#718E00B8',
      '#59A600AD',
      '#6D9200B8',
      '#689700B5',
      '#51AE00A8',
      '#1EE1008F',
    ]);
  });

  it('matches documented Pine math helper idioms', () => {
    const result = runCompatScript(`
indicator("Math docs smoke")
midpoint = math.avg(open, high, low, close)
rounded = math.round(midpoint, 2)
rightAngle = math.todegrees(math.pi / 2)
plot(rounded, title="Rounded Midpoint")
plot(math.trunc(-1.9), title="Truncated")
plot(rightAngle, title="Right Angle")
plot(math.round(math.toradians(180), 6), title="Radians")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Rounded Midpoint').values, 2)).toEqual([101, 103.5, 106, 105.25, 101, 99, 102, 106.5, 108.5, 109.5, 111, 110.75]);
    expect(roundSeries(getPlot(result, 'Truncated').values)).toEqual([-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]);
    expect(roundSeries(getPlot(result, 'Right Angle').values)).toEqual([90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90]);
    expect(roundSeries(getPlot(result, 'Radians').values, 6)).toEqual([3.141593, 3.141593, 3.141593, 3.141593, 3.141593, 3.141593, 3.141593, 3.141593, 3.141593, 3.141593, 3.141593, 3.141593]);
  });

  it('matches common Pine trend direction helper idioms', () => {
    const result = runCompatScript(`
indicator("Trend direction smoke")
lookback = input.int(2, "Lookback")
breakout = ta.rising(close, lookback)
breakdown = ta.falling(close, lookback)
plot(breakout, title="Breakout")
plot(breakdown, title="Breakdown")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Breakout').values).toEqual([false, false, true, false, false, false, true, true, false, true, false, true]);
    expect(getPlot(result, 'Breakdown').values).toEqual([false, false, false, true, true, false, false, false, false, false, false, false]);
  });

  it('matches common Pine statistical helper idioms', () => {
    const result = runCompatScript(`
indicator("Stats smoke")
length = input.int(3, "Length")
plot(ta.median(close, length), title="Median")
plot(ta.mode(close, length), title="Mode")
plot(ta.percentile_nearest_rank(close, length, 75), title="Nearest")
plot(ta.percentile_linear_interpolation(close, length, 75), title="Linear")
plot(ta.percentrank(close, length), title="Percent Rank")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Median').values).toEqual([null, null, 105, 105, 103, 100, 100, 104, 108, 109, 110, 111]);
    expect(getPlot(result, 'Mode').values).toEqual([null, null, 102, 103, 99, 99, 99, 100, 104, 108, 108, 110]);
    expect(getPlot(result, 'Nearest').values).toEqual([null, null, 107, 107, 107, 103, 104, 109, 109, 111, 111, 112]);
    expect(getPlot(result, 'Linear').values).toEqual([null, null, 106, 106, 105, 101.5, 102, 106.5, 108.5, 110, 110.5, 111.5]);
    expect(roundSeries(getPlot(result, 'Percent Rank').values)).toEqual([null, null, 100, 33.333333, 33.333333, 66.666667, 100, 100, 66.666667, 100, 66.666667, 100]);
  });

  it('matches common Pine moving-average helper idioms', () => {
    const result = runCompatScript(`
indicator("Moving average smoke")
plot(ta.swma(close), title="SWMA")
plot(ta.alma(close, 5, 0.85, 6), title="ALMA")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'SWMA').values)).toEqual([null, null, null, 104.833333, 104, 101.833333, 100.833333, 102.666667, 105.666667, 108.166667, 109.5, 110.333333]);
    expect(roundSeries(getPlot(result, 'ALMA').values)).toEqual([null, null, null, null, 101.918274, 99.97516, 101.504063, 105.458142, 107.88929, 109.296928, 110.200868, 110.912922]);
  });

  it('runs conditional barcolor helper idioms', () => {
    const result = runCompatScript(`
indicator("Barcolor smoke", overlay=true)
candleColor = bar_index == 0 ? na : close > open ? color.green : close < open ? color.red : na
barcolor(candleColor)
`);

    expect(result.errors).toEqual([]);
    const barColors = result.plots.find((plot) => plot.type === 'barcolor');
    expect(barColors?.color).toEqual([
      null,
      '#4CAF50',
      '#4CAF50',
      '#F44336',
      '#F44336',
      '#4CAF50',
      '#4CAF50',
      '#4CAF50',
      '#F44336',
      '#4CAF50',
      '#F44336',
      '#4CAF50',
    ]);
  });

  it('runs documented alert helper idioms', () => {
    const result = runCompatScript(`
indicator("Alert smoke", overlay=true)
triggerCondition = close > close[1]
alertcondition(triggerCondition, "Close crossed up", "Close crossed above previous close")
if triggerCondition
    alert("Close " + str.tostring(close, "#") + " crossed previous close", alert.freq_once_per_bar_close)
`);

    expect(result.errors).toEqual([]);
    const condition = result.alerts.find((alert) => alert.type === 'alertcondition');
    const directAlert = result.alerts.find((alert) => alert.type === 'alert');

    expect(condition).toMatchObject({
      title: 'Close crossed up',
      message: 'Close crossed above previous close',
    });
    expect(condition?.values).toEqual([null, true, true, null, null, true, true, true, null, true, null, true]);

    expect(directAlert?.frequency).toBe('once_per_bar_close');
    expect(directAlert?.events.map((event) => event.barIndex)).toEqual([1, 2, 5, 6, 7, 9, 11]);
    expect(directAlert?.events.map((event) => event.message)).toEqual([
      'Close 105 crossed previous close',
      'Close 107 crossed previous close',
      'Close 100 crossed previous close',
      'Close 104 crossed previous close',
      'Close 109 crossed previous close',
      'Close 111 crossed previous close',
      'Close 112 crossed previous close',
    ]);
  });

  it('runs documented custom candle and bar plotting idioms', () => {
    const result = runCompatScript(`
indicator("Custom OHLC smoke", overlay=true)
o = bar_index == 0 ? na : open
h = bar_index == 0 ? na : high
l = bar_index == 0 ? na : low
c = bar_index == 0 ? na : close
upColor = color.silver
downColor = color.blue
bodyColor = c >= o ? upColor : downColor
wickColor = color.new(bodyColor, 70)
plotcandle(o, h, l, c, title="Custom candles", color=bodyColor, wickcolor=wickColor, bordercolor=bodyColor)
plotbar(o, h + 1, l - 1, c, title="Custom bars", color=bodyColor)
`);

    expect(result.errors).toEqual([]);
    const candles = getPlot(result, 'Custom candles');
    expect(candles.type).toBe('plotcandle');
    expect(candles.openValues).toEqual([null, 102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110]);
    expect(candles.highValues).toEqual([null, 106, 108, 109, 104, 101, 105, 110, 111, 112, 114, 113]);
    expect(candles.lowValues).toEqual([null, 101, 104, 102, 98, 96, 99, 103, 106, 107, 109, 108]);
    expect(candles.closeValues).toEqual([null, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110, 112]);
    expect(candles.color).toEqual([
      null,
      '#B2B5BE',
      '#B2B5BE',
      '#2196F3',
      '#2196F3',
      '#B2B5BE',
      '#B2B5BE',
      '#B2B5BE',
      '#2196F3',
      '#B2B5BE',
      '#2196F3',
      '#B2B5BE',
    ]);
    expect(candles.wickColor).toEqual([
      null,
      '#B2B5BE4D',
      '#B2B5BE4D',
      '#2196F34D',
      '#2196F34D',
      '#B2B5BE4D',
      '#B2B5BE4D',
      '#B2B5BE4D',
      '#2196F34D',
      '#B2B5BE4D',
      '#2196F34D',
      '#B2B5BE4D',
    ]);

    const bars = getPlot(result, 'Custom bars');
    expect(bars.type).toBe('plotbar');
    expect(bars.highValues).toEqual([null, 107, 109, 110, 105, 102, 106, 111, 112, 113, 115, 114]);
    expect(bars.lowValues).toEqual([null, 100, 103, 101, 97, 95, 98, 102, 105, 106, 108, 107]);
    expect(bars.color).toEqual(candles.color);
  });

  it('accepts common Pine visual declaration and plot constants', () => {
    const result = runCompatScript(`
indicator("Visual constants smoke", overlay=true, format=format.price, scale=scale.right)
displayTarget = display.all - display.status_line
formatMatches = format.price == "price" and format.volume == "volume" and format.percent == "percent" and format.inherit == "inherit"
scaleMatches = scale.right == "right" and scale.left == "left" and scale.none == "none"
plot(close, title="Break Line", style=plot.style_linebr, display=displayTarget)
plot(open, title="Step Diamonds", style=plot.style_stepline_diamond, display=display.none)
plot(high, title="Columns", style=plot.style_columns, histbase=100, trackprice=true, show_last=5)
plot(formatMatches ? 1 : 0, title="Format Constants")
plot(scaleMatches ? 1 : 0, title="Scale Constants")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Break Line').style).toBe('linebr');
    expect(getPlot(result, 'Step Diamonds').style).toBe('stepline_diamond');
    expect(getPlot(result, 'Columns').style).toBe('columns');
    expect(getPlot(result, 'Break Line').values).toHaveLength(compatibilityBars.length);
    expect(getPlot(result, 'Format Constants').values).toEqual(Array(compatibilityBars.length).fill(1));
    expect(getPlot(result, 'Scale Constants').values).toEqual(Array(compatibilityBars.length).fill(1));
  });

  it('fills between Pine plot and hline handles', () => {
    const result = runCompatScript(`
indicator("Fill handles smoke", overlay=true)
basis = ta.sma(close, 3)
upper = basis + 2
lower = basis - 2
upperPlot = plot(upper, title="Upper", color=color.green)
lowerPlot = plot(lower, title="Lower", color=color.red)
topLine = hline(110, title="Top")
bottomLine = hline(100, title="Bottom")
fill(upperPlot, lowerPlot, color=color.new(color.green, 80), title="Band Fill")
fill(topLine, bottomLine, color=color.new(color.blue, 90), title="Range Fill")
`);

    expect(result.errors).toEqual([]);
    const bandFill = getPlot(result, 'Band Fill');
    const rangeFill = getPlot(result, 'Range Fill');

    expect(bandFill.type).toBe('fill');
    expect(bandFill.plot1Id).toBe('plot_Upper');
    expect(bandFill.plot2Id).toBe('plot_Lower');
    expect(bandFill.color).toEqual(Array(compatibilityBars.length).fill('#4CAF5033'));

    expect(rangeFill.type).toBe('fill');
    expect(rangeFill.plot1Id).toBe('hline_Top');
    expect(rangeFill.plot2Id).toBe('hline_Bottom');
    expect(rangeFill.color).toEqual(Array(compatibilityBars.length).fill('#2196F31A'));
  });

  it('preserves legacy fill title references before plot registration', () => {
    const result = runCompatScript(`
indicator("Legacy fill smoke", overlay=true)
fill("Upper", "Lower", color=color.new(color.red, 85), title="Legacy Fill")
plot(high, title="Upper")
plot(low, title="Lower")
`);

    expect(result.errors).toEqual([]);
    const fillPlot = getPlot(result, 'Legacy Fill');

    expect(fillPlot.type).toBe('fill');
    expect(fillPlot.plot1Id).toBe('plot_Upper');
    expect(fillPlot.plot2Id).toBe('plot_Lower');
    expect(fillPlot.color).toEqual(Array(compatibilityBars.length).fill('#F4433626'));
  });

  it('matches documented Pine switch selection idioms', () => {
    const result = runCompatScript(`
indicator("Switch docs smoke")
maType = input.string("EMA", "MA Type", options=["EMA", "SMA", "Close"])
selected = switch maType
    "EMA" => ta.ema(close, 3)
    "SMA" => ta.sma(close, 3)
    => close
blockSelected = switch maType
    "EMA" =>
        basis = close + 1
        basis
    "SMA" =>
        basis = close - 1
        basis
    =>
        close
direction = switch
    close > open => 1
    close < open => -1
    => 0
plot(selected, title="Selected MA")
plot(blockSelected, title="Block Selected MA")
plot(direction, title="Direction")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Selected MA').values)).toEqual([
      102,
      104.25,
      105.833333,
      104,
      101,
      100.333333,
      102.5,
      106.666667,
      107.5,
      110.166667,
      109.833333,
      111.5,
    ]);
    expect(roundSeries(getPlot(result, 'Block Selected MA').values)).toEqual([
      103,
      106,
      108,
      104,
      100,
      101,
      105,
      110,
      109,
      112,
      111,
      113,
    ]);
    expect(getPlot(result, 'Direction').values).toEqual([1, 1, 1, -1, -1, 1, 1, 1, -1, 1, -1, 1]);
  });

  it('matches common Pine loop control idioms', () => {
    const result = runCompatScript(`
indicator("Loop control docs smoke")
sumOdds = 0
for i = 1 to 7
    if i % 2 == 0
        continue
    if i > 5
        break
    sumOdds += i

descending = 0
for j = 5 to 1 by -2
    descending += j

values = array.from(1, 2, 3, 4)
selected = 0
for value in values
    if value == 2
        continue
    if value == 4
        break
    selected += value

indexed = 0
for [index, value] in values
    indexed += index * value

plot(sumOdds, title="Odd Sum")
plot(descending, title="Descending Sum")
plot(selected, title="Selected Sum")
plot(indexed, title="Indexed Sum")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Odd Sum').values).toEqual([9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9]);
    expect(getPlot(result, 'Descending Sum').values).toEqual([9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9]);
    expect(getPlot(result, 'Selected Sum').values).toEqual([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
    expect(getPlot(result, 'Indexed Sum').values).toEqual([20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20]);
  });

  it('matches common Pine barstate guard idioms', () => {
    const result = runCompatScript(`
indicator("Barstate docs smoke")
lastOnly = barstate.islast ? close : na
confirmed = barstate.isconfirmed ? 1 : 0
lastConfirmedHistory = barstate.islastconfirmedhistory ? 1 : 0
history = barstate.ishistory ? 1 : 0

plot(lastOnly, title="Last Only")
plot(confirmed, title="Confirmed")
plot(lastConfirmedHistory, title="Last Confirmed History")
plot(history, title="History")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Last Only').values).toEqual([null, null, null, null, null, null, null, null, null, null, null, 112]);
    expect(getPlot(result, 'Confirmed').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(getPlot(result, 'Last Confirmed History').values).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
    expect(getPlot(result, 'History').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it('matches common Pine chart info idioms', () => {
    const result = runCompatScript(`
indicator("Chart info docs smoke")
tickerLen = str.length(syminfo.tickerid)
rootLen = str.length(syminfo.root)
periodLen = str.length(timeframe.period)
intraday = timeframe.isintraday ? 1 : 0
dwm = timeframe.isdwm ? 1 : 0

plot(tickerLen, title="Ticker ID Length")
plot(rootLen, title="Root Length")
plot(periodLen, title="Period Length")
plot(timeframe.multiplier, title="Multiplier")
plot(timeframe.in_seconds(), title="Current Seconds")
plot(timeframe.in_seconds("1D"), title="Daily Seconds")
plot(intraday, title="Intraday")
plot(dwm, title="DWM")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Ticker ID Length').values).toEqual([7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7]);
    expect(getPlot(result, 'Root Length').values).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
    expect(getPlot(result, 'Period Length').values).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
    expect(getPlot(result, 'Multiplier').values).toEqual([60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60]);
    expect(getPlot(result, 'Current Seconds').values).toEqual([3600, 3600, 3600, 3600, 3600, 3600, 3600, 3600, 3600, 3600, 3600, 3600]);
    expect(getPlot(result, 'Daily Seconds').values).toEqual([86400, 86400, 86400, 86400, 86400, 86400, 86400, 86400, 86400, 86400, 86400, 86400]);
    expect(getPlot(result, 'Intraday').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(getPlot(result, 'DWM').values).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('matches common Pine calendar filter idioms', () => {
    const result = runCompatScript(`
indicator("Calendar docs smoke")
afterStart = time >= timestamp(2023, 11, 14, 22, 20)
sameDay = year == 2023 and month == 11 and dayofmonth == 14
isTuesday = dayofweek == dayofweek.tuesday
minuteGate = minute >= 20

plot(afterStart ? 1 : 0, title="After Start")
plot(sameDay ? 1 : 0, title="Same Day")
plot(isTuesday ? 1 : 0, title="Tuesday")
plot(hour, title="Hour")
plot(minuteGate ? 1 : 0, title="Minute Gate")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'After Start').values).toEqual([0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1]);
    expect(getPlot(result, 'Same Day').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(getPlot(result, 'Tuesday').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(getPlot(result, 'Hour').values).toEqual([22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22]);
    expect(getPlot(result, 'Minute Gate').values).toEqual([0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1]);
  });

  it('matches common Pine session filter idioms', () => {
    const result = runCompatScript(`
indicator("Session docs smoke")
regular = not na(time(timeframe.period, "2218-2224"))
sessionClose = time_close("1", "2218-2224")

plot(regular ? 1 : 0, title="Regular Session")
plot(na(sessionClose) ? 0 : 1, title="Session Close")
plot(time_close - time, title="Bar Duration")
plot(last_bar_time, title="Last Bar Time")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Regular Session').values).toEqual([0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0]);
    expect(getPlot(result, 'Session Close').values).toEqual([0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0]);
    expect(getPlot(result, 'Bar Duration').values).toEqual([
      3_600_000,
      3_600_000,
      3_600_000,
      3_600_000,
      3_600_000,
      3_600_000,
      3_600_000,
      3_600_000,
      3_600_000,
      3_600_000,
      3_600_000,
      3_600_000,
    ]);
    expect(getPlot(result, 'Last Bar Time').values).toEqual([
      1_700_000_660_000,
      1_700_000_660_000,
      1_700_000_660_000,
      1_700_000_660_000,
      1_700_000_660_000,
      1_700_000_660_000,
      1_700_000_660_000,
      1_700_000_660_000,
      1_700_000_660_000,
      1_700_000_660_000,
      1_700_000_660_000,
      1_700_000_660_000,
    ]);
  });

  it('emits label drawing outputs from common last-bar label idioms', () => {
    const result = runCompatScript(`
indicator("Label docs smoke", overlay=true)
if barstate.islast
    label.new(bar_index, close, text=str.tostring(close), style=label.style_label_down, color=color.red, textcolor=color.white, size=size.small)
`);

    expect(result.errors).toEqual([]);
    expect(result.drawings).toEqual([
      {
        id: 'label_label.new_0_11',
        type: 'label',
        barIndex: 11,
        x: 11,
        y: 112,
        text: '112',
        xloc: 'bar_index',
        yloc: 'price',
        style: 'label_down',
        color: '#F44336',
        textColor: '#FFFFFF',
        size: 'small',
      },
    ]);
  });
});
