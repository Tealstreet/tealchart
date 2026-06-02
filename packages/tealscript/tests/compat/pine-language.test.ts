import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { InMemoryRequestDatafeed } from '../../src/runtime';
import { compatibilityBars, getPlot, roundSeries, runCompatScript } from './fixtures';

describe('Pine compatibility golden harness', () => {
  it('runs local library-style exported functions', () => {
    const result = runCompatScript(`
library("AllTimeHighLow", true)
export hi(float val = high) =>
    var float ath = val
    ath := math.max(ath, val)
    ath
export lo(float val = low) =>
    var float atl = val
    atl := math.min(atl, val)
    atl
plot(hi(), title="ATH")
plot(lo(), title="ATL")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'ATH').values)).toEqual([103, 106, 108, 109, 109, 109, 109, 110, 111, 112, 114, 114]);
    expect(roundSeries(getPlot(result, 'ATL').values)).toEqual([99, 99, 99, 99, 98, 96, 96, 96, 96, 96, 96, 96]);
  });

  it('runs imported exported library functions from a deterministic registry', () => {
    const library = parse(`
library("RangeTools", true)
export spread(float highValue, float lowValue) => highValue - lowValue
export mid(float highValue, float lowValue) => (highValue + lowValue) / 2
hidden(float value) => value * 10
`);

    const result = runCompatScript(`
indicator("Imported library")
import TestUser/RangeTools/1 as rt
plot(rt.spread(high, low), title="Spread")
plot(rt.mid(high, low), title="Mid")
`, {
      engineOptions: {
        libraries: new Map([['TestUser/RangeTools/1', library]]),
      },
    });

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Spread').values)).toEqual([4, 5, 4, 7, 6, 5, 6, 7, 5, 5, 5, 5]);
    expect(roundSeries(getPlot(result, 'Mid').values)).toEqual([101, 103.5, 106, 105.5, 101, 98.5, 102, 106.5, 108.5, 109.5, 111.5, 110.5]);
  });

  it('runs imported exported library constants from a deterministic registry', () => {
    const library = parse(`
library("Constants", true)
export const int fast = 2
export const float multiplier = 1.5
export color bull = color.green
export float empty = na
export string ticker = syminfo.ticker
export string period = timeframe.period
`);

    const result = runCompatScript(`
indicator("Imported constants")
import TestUser/Constants/1 as c
plot(c.fast, title="Fast")
plot(c.multiplier, title="Multiplier")
plot(c.bull == color.green ? 1 : 0, title="Bull")
plot(na(c.empty) ? 1 : 0, title="Empty")
plot(c.ticker == syminfo.ticker ? 1 : 0, title="Ticker")
plot(c.period == timeframe.period ? 1 : 0, title="Period")
`, {
      bars: [compatibilityBars[0]!],
      engineOptions: {
        libraries: new Map([['TestUser/Constants/1', library]]),
      },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Fast').values).toEqual([2]);
    expect(getPlot(result, 'Multiplier').values).toEqual([1.5]);
    expect(getPlot(result, 'Bull').values).toEqual([1]);
    expect(getPlot(result, 'Empty').values).toEqual([1]);
    expect(getPlot(result, 'Ticker').values).toEqual([1]);
    expect(getPlot(result, 'Period').values).toEqual([1]);
  });

  it('runs imported exported library enum members from a deterministic registry', () => {
    const library = parse(`
library("Signal", true)
export enum State
    long = "Long"
    short = "Short"
    neutral = "Neutral"
`);

    const result = runCompatScript(`
indicator("Imported enum")
import TestUser/Signal/1 as sig
sig.State signal = switch
    close > 108 => sig.State.long
    close < 101 => sig.State.short
    => sig.State.neutral
plot(signal == sig.State.long ? 1 : 0, title="Long")
plot(signal == sig.State.short ? 1 : 0, title="Short")
plot(signal == sig.State.neutral ? 1 : 0, title="Neutral")
`, {
      engineOptions: {
        libraries: new Map([['TestUser/Signal/1', library]]),
      },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Long').values).toEqual([0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1]);
    expect(getPlot(result, 'Short').values).toEqual([0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0]);
    expect(getPlot(result, 'Neutral').values).toEqual([1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0]);
  });

  it('keeps imported enum identities stable across aliases', () => {
    const library = parse(`
library("Signal", true)
export enum State
    long = "Long"
    short = "Short"
`);

    const result = runCompatScript(`
indicator("Imported enum aliases")
import TestUser/Signal/1 as first
import TestUser/Signal/1 as second
plot(first.State.long == second.State.long ? 1 : 0, title="Same")
plot(first.State.short == second.State.long ? 1 : 0, title="Different")
`, {
      bars: [compatibilityBars[0]!],
      engineOptions: {
        libraries: new Map([['TestUser/Signal/1', library]]),
      },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Same').values).toEqual([1]);
    expect(getPlot(result, 'Different').values).toEqual([0]);
  });

  it('reports non-exported imported library functions as unknown', () => {
    const library = parse(`
library("RangeTools", true)
hidden(float value) => value * 10
`);

    const result = runCompatScript(`
indicator("Imported library hidden function")
import TestUser/RangeTools/1 as rt
plot(rt.hidden(close), title="Hidden")
`, {
      bars: [compatibilityBars[0]!],
      engineOptions: {
        libraries: new Map([['TestUser/RangeTools/1', library]]),
      },
    });

    expect(result.errors.map((error) => error.message)).toEqual(['Unknown library function: rt.hidden']);
  });

  it('allows exported imported library functions to call library-local helpers', () => {
    const library = parse(`
library("RangeTools", true)
hidden(float value) => value * 10
export scaledSpread(float highValue, float lowValue) => hidden(highValue - lowValue)
`);

    const result = runCompatScript(`
indicator("Imported library helper")
import TestUser/RangeTools/1 as rt
plot(rt.scaledSpread(high, low), title="Scaled Spread")
`, {
      engineOptions: {
        libraries: new Map([['TestUser/RangeTools/1', library]]),
      },
    });

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Scaled Spread').values)).toEqual([40, 50, 40, 70, 60, 50, 60, 70, 50, 50, 50, 50]);
  });

  it('keeps imported library helper context inside request security expressions', () => {
    const library = parse(`
library("RangeTools", true)
hidden(float value) => value * 10
export requestedClose() => request.security(syminfo.tickerid, "1", hidden(close), lookahead=barmerge.lookahead_on)
`);
    const requestDatafeed = new InMemoryRequestDatafeed([
      {
        symbol: 'BTCUSDT',
        timeframe: '1',
        bars: compatibilityBars,
        syminfo: { ticker: 'BTCUSDT', timezone: 'Etc/UTC' },
      },
    ]);

    const result = runCompatScript(`
indicator("Imported request helper")
import TestUser/RangeTools/1 as rt
plot(rt.requestedClose(), title="Requested Close")
`, {
      engineOptions: {
        libraries: new Map([['TestUser/RangeTools/1', library]]),
        requestDatafeed,
      },
    });

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Requested Close').values)).toEqual([1020, 1050, 1070, 1030, 990, 1000, 1040, 1090, 1080, 1110, 1100, 1120]);
  });

  it('uses qualified recursion keys for imported library helpers', () => {
    const library = parse(`
library("RangeTools", true)
hidden(float value) => value * 10
export scaled(float value) => hidden(value)
`);

    const result = runCompatScript(`
indicator("Imported library recursion key")
import TestUser/RangeTools/1 as rt
hidden(float value) => rt.scaled(value)
plot(hidden(close), title="Scaled")
`, {
      engineOptions: {
        libraries: new Map([['TestUser/RangeTools/1', library]]),
      },
    });

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Scaled').values)).toEqual([1020, 1050, 1070, 1030, 990, 1000, 1040, 1090, 1080, 1110, 1100, 1120]);
  });

  it('constructs exported imported library user-defined types', () => {
    const library = parse(`
library("PivotTools", true)
export type Pivot
    int x
    float y
type Hidden
    float value
`);

    const result = runCompatScript(`
indicator("Imported library type")
import TestUser/PivotTools/1 as pivots
p = pivots.Pivot.new(bar_index, close)
plot(p.x, title="X")
plot(p.y, title="Y")
`, {
      engineOptions: {
        libraries: new Map([['TestUser/PivotTools/1', library]]),
      },
    });

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'X').values)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(roundSeries(getPlot(result, 'Y').values)).toEqual([102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110, 112]);
  });

  it('stores and mutates collection fields on user-defined types', () => {
    const result = runCompatScript(`
indicator("UDT collection fields")
type Cache
    array<float> values = array.new<float>()
    map<string, float> prices = map.new<string, float>()
    matrix<int> grid = matrix.new<int>(1, 1, 0)
var cache = Cache.new()
cache.values.push(close)
cache.prices.put("last", close)
cache.grid.set(0, 0, bar_index)
plot(cache.values.size(), title="Size")
plot(cache.prices.get("last"), title="Last")
plot(cache.grid.get(0, 0), title="Index")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Size').values)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(roundSeries(getPlot(result, 'Last').values)).toEqual([102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110, 112]);
    expect(roundSeries(getPlot(result, 'Index').values)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('keeps non-exported imported library user-defined types private externally', () => {
    const library = parse(`
library("PivotTools", true)
type Hidden
    float value
`);

    const result = runCompatScript(`
indicator("Imported private type")
import TestUser/PivotTools/1 as pivots
p = pivots.Hidden.new(close)
plot(p.value, title="Value")
`, {
      bars: [compatibilityBars[0]!],
      engineOptions: {
        libraries: new Map([['TestUser/PivotTools/1', library]]),
      },
    });

    expect(result.errors.map((error) => error.message)).toEqual([
      'Unknown library type: pivots.Hidden',
      'Unknown identifier: p',
    ]);
  });

  it('allows exported imported functions to construct library-local types', () => {
    const library = parse(`
library("PivotTools", true)
type Hidden
    float value
export make(float value) => Hidden.new(value)
`);

    const result = runCompatScript(`
indicator("Imported private type factory")
import TestUser/PivotTools/1 as pivots
p = pivots.make(close)
plot(p.value, title="Value")
`, {
      engineOptions: {
        libraries: new Map([['TestUser/PivotTools/1', library]]),
      },
    });

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Value').values)).toEqual([102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110, 112]);
  });

  it('prefers library-local user-defined types inside imported functions', () => {
    const library = parse(`
library("PivotTools", true)
type Hidden
    float value
export make(float value) => Hidden.new(value)
`);

    const result = runCompatScript(`
indicator("Imported private type shadowing")
import TestUser/PivotTools/1 as pivots
type Hidden
    float other
p = pivots.make(close)
plot(p.value, title="Value")
`, {
      engineOptions: {
        libraries: new Map([['TestUser/PivotTools/1', library]]),
      },
    });

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Value').values)).toEqual([102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110, 112]);
  });

  it('dispatches exported imported library methods on imported user-defined types', () => {
    const library = parse(`
library("PivotTools", true)
export type Pivot
    int x
    float y
export method lifted(Pivot this, float amount) =>
    this.y += amount
    this
`);

    const result = runCompatScript(`
indicator("Imported library method")
import TestUser/PivotTools/1 as pivots
p = pivots.Pivot.new(bar_index, close)
q = p.lifted(10)
plot(q.y, title="Lifted")
`, {
      engineOptions: {
        libraries: new Map([['TestUser/PivotTools/1', library]]),
      },
    });

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Lifted').values)).toEqual([112, 115, 117, 113, 109, 110, 114, 119, 118, 121, 120, 122]);
  });

  it('keeps non-exported imported library methods private externally', () => {
    const library = parse(`
library("PivotTools", true)
export type Pivot
    float value
method hidden(Pivot this) => this
`);

    const result = runCompatScript(`
indicator("Imported private method")
import TestUser/PivotTools/1 as pivots
p = pivots.Pivot.new(close)
q = p.hidden()
plot(q.value, title="Value")
`, {
      bars: [compatibilityBars[0]!],
      engineOptions: {
        libraries: new Map([['TestUser/PivotTools/1', library]]),
      },
    });

    expect(result.errors.map((error) => error.message)).toEqual([
      'Unknown function: p.hidden',
      'Unknown identifier: q',
    ]);
  });

  it('keeps non-exported imported method overloads private externally', () => {
    const library = parse(`
library("PivotTools", true)
export type Pivot
    float value
export method choose(Pivot this) => this
method choose(Pivot this, float amount) =>
    this.value += amount
    this
`);

    const result = runCompatScript(`
indicator("Imported private method overload")
import TestUser/PivotTools/1 as pivots
p = pivots.Pivot.new(close)
q = p.choose(10)
plot(q.value, title="Value")
`, {
      bars: [compatibilityBars[0]!],
      engineOptions: {
        libraries: new Map([['TestUser/PivotTools/1', library]]),
      },
    });

    expect(result.errors.map((error) => error.message)).toEqual([
      'Unknown function: p.choose',
      'Unknown identifier: q',
    ]);
  });

  it('selects imported method overloads by receiver user-defined type', () => {
    const library = parse(`
library("PivotTools", true)
export type Left
    float x
export type Right
    float y
export method value(Left this) => this.x
export method value(Right this) => this.y
`);

    const result = runCompatScript(`
indicator("Imported receiver overload")
import TestUser/PivotTools/1 as pivots
p = pivots.Right.new(close)
plot(p.value(), title="Value")
`, {
      engineOptions: {
        libraries: new Map([['TestUser/PivotTools/1', library]]),
      },
    });

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Value').values)).toEqual([102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110, 112]);
  });

  it('allows exported imported functions to call library-local methods', () => {
    const library = parse(`
library("PivotTools", true)
type Pivot
    float value
method lifted(Pivot this, float amount) =>
    this.value += amount
    this
export make(float value) =>
    p = Pivot.new(value)
    p.lifted(10)
`);

    const result = runCompatScript(`
indicator("Imported private method factory")
import TestUser/PivotTools/1 as pivots
p = pivots.make(close)
plot(p.value, title="Value")
`, {
      engineOptions: {
        libraries: new Map([['TestUser/PivotTools/1', library]]),
      },
    });

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Value').values)).toEqual([112, 115, 117, 113, 109, 110, 114, 119, 118, 121, 120, 122]);
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

  it('runs Pine-style operator line continuations', () => {
    const result = runCompatScript(`
indicator("Operator Continuation")
value = 1 +
    2 *
    3
flag = true and
    not
        false
selected = flag ?
    value :
    0
plot(selected, title="Selected")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Selected').values)).toEqual(Array(compatibilityBars.length).fill(7));
  });

  it('runs Pine-style leading operator line continuations', () => {
    const result = runCompatScript(`
indicator("Leading Operator Continuation")
value = 1
    + 2
    * 3
flag = true
    and not
        false
selected = flag
    ? value
    : 0
plot(selected, title="Selected")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Selected').values)).toEqual(Array(compatibilityBars.length).fill(7));
  });

  it('keeps if/else branch boundaries after operator continuation support', () => {
    const result = runCompatScript(`
indicator("If Else Boundary")
score(value) =>
    if value > 0
        1
    else
        0
plot(score(close - open), title="Score")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Score').values)).toEqual(
      compatibilityBars.map((bar) => (bar.close - bar.open > 0 ? 1 : 0))
    );
  });

  it('keeps blank and comment-only lines inside function blocks', () => {
    const result = runCompatScript(`
indicator("Function Block Spacing")
score(value) =>
    // Public Pine scripts often leave comments inside UDF bodies.
    shifted = value + 1

    if shifted > 0
        // Nested branch comments should not close the block.
        shifted

    else
        0

plot(score(close - open), title="Score")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Score').values)).toEqual(
      compatibilityBars.map((bar) => Math.max(bar.close - bar.open + 1, 0))
    );
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

  it('runs user-defined function default parameters', () => {
    const result = runCompatScript(`
indicator("UDF default params")
average(source=close, length=3, offset=1) => ta.sma(source, length) + offset
plot(average(), title="Default Average")
plot(average(offset=2), title="Named Override")
plot(average(length=2), title="Length Override")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Default Average').values)).toEqual([
      null,
      null,
      105.666667,
      106,
      104,
      101.666667,
      102,
      105.333333,
      108,
      110.333333,
      110.666667,
      112,
    ]);
    expect(roundSeries(getPlot(result, 'Named Override').values)).toEqual([
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
    expect(roundSeries(getPlot(result, 'Length Override').values)).toEqual([
      null,
      104.5,
      107,
      106,
      102,
      100.5,
      103,
      107.5,
      109.5,
      110.5,
      111.5,
      112,
    ]);
  });

  it('reports invalid user-defined function call arguments', () => {
    const unknown = runCompatScript(`
indicator("UDF unknown arg")
scale(value, factor=2) => value * factor
plot(scale(close, multiplier=3), title="Scaled")
`);
    expect(unknown.errors[0]?.message).toBe("Unknown argument 'multiplier' for function scale");

    const duplicateBinding = runCompatScript(`
indicator("UDF duplicate binding")
scale(value, factor=2) => value * factor
plot(scale(close, value=open), title="Scaled")
`);
    expect(duplicateBinding.errors[0]?.message).toBe("Argument 'value' for function scale was supplied multiple times");

    const tooMany = runCompatScript(`
indicator("UDF too many args")
scale(value, factor=2) => value * factor
plot(scale(close, 2, 3), title="Scaled")
`);
    expect(tooMany.errors[0]?.message).toBe('Too many arguments for function scale: expected 2, got 3');

    const duplicateNamed = runCompatScript(`
indicator("Duplicate named args")
plot(close, title="Close", title="Duplicate")
`);
    expect(duplicateNamed.errors[0]?.message).toBe('Duplicate named argument: title');
  });

  it('returns user-defined function loop expression results', () => {
    const result = runCompatScript(`
indicator("UDF loop returns")
lastNumeric(limit) =>
    for i = 0 to limit
        i
lastCollection() =>
    for value in array.from(1, 2, 3)
        value * 2
lastWhile(limit) =>
    i = 0
    while i < limit
        i += 1
        i
plot(lastNumeric(3), title="Numeric Loop")
plot(lastCollection(), title="Collection Loop")
plot(lastWhile(3), title="While Loop")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Numeric Loop').values)).toEqual(Array(compatibilityBars.length).fill(3));
    expect(roundSeries(getPlot(result, 'Collection Loop').values)).toEqual(Array(compatibilityBars.length).fill(6));
    expect(roundSeries(getPlot(result, 'While Loop').values)).toEqual(Array(compatibilityBars.length).fill(3));
  });

  it('runs numeric for and while loop expressions', () => {
    const result = runCompatScript(`
indicator("Loop expressions")
numericValue = for i = 0 to 3
    i * 2
i = 0
whileValue = while i < 3
    i += 1
    i * 3
plot(numericValue, title="Numeric Loop Expression")
plot(whileValue, title="While Loop Expression")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Numeric Loop Expression').values)).toEqual(
      Array(compatibilityBars.length).fill(6)
    );
    expect(roundSeries(getPlot(result, 'While Loop Expression').values)).toEqual(
      Array(compatibilityBars.length).fill(9)
    );
  });

  it('runs collection loop expressions with break and continue', () => {
    const result = runCompatScript(`
indicator("Collection loop expressions")
values = array.from(1, 2, 3, 4)
value = for item in values
    if item == 2
        continue
    if item == 4
        break
    item * 10
indexed = for [index, item] in values
    index + item
plot(value, title="Collection Loop Expression")
plot(indexed, title="Indexed Collection Loop Expression")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Collection Loop Expression').values)).toEqual(
      Array(compatibilityBars.length).fill(30)
    );
    expect(roundSeries(getPlot(result, 'Indexed Collection Loop Expression').values)).toEqual(
      Array(compatibilityBars.length).fill(7)
    );
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

  it('captures Pine Logs-style diagnostic messages without halting execution', () => {
    const result = runCompatScript(`
indicator("Pine logs")
if barstate.isfirst
    log.info("loaded {0}", syminfo.ticker)
if bar_index == 1
    log.warning("close {0:#.0}", close)
if barstate.islast
    log.error("last bar")
plot(close, title="Close")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Close').values)).toEqual([102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110, 112]);
    expect(result.logs.map(({ level, barIndex, message }) => ({ level, barIndex, message }))).toEqual([
      { level: 'info', barIndex: 0, message: 'loaded BTCUSDT' },
      { level: 'warning', barIndex: 1, message: 'close 105.0' },
      { level: 'error', barIndex: 11, message: 'last bar' },
    ]);
  });

  it('runs common global helper and cast idioms', () => {
    const result = runCompatScript(`
indicator("Global helper casts")
source = bar_index == 0 or bar_index == 3 ? na : close
plot(nz(source), title="NZ Default")
plot(nz(source, open), title="NZ Replacement")
plot(fixnan(source), title="Fixed")
plot(float("4.5"), title="Float")
plot(int(4.9), title="Int")
plot(bool(close > open), title="Bool")
plot(string(12.5) == "12.5", title="String")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'NZ Default').values)).toEqual([0, 105, 107, 0, 99, 100, 104, 109, 108, 111, 110, 112]);
    expect(roundSeries(getPlot(result, 'NZ Replacement').values)).toEqual([100, 105, 107, 107, 99, 100, 104, 109, 108, 111, 110, 112]);
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
