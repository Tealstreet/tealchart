import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, roundSeries, runCompatScript } from './fixtures';

describe('Pine compatibility golden harness', () => {
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
formattedTime = str.format_time(timestamp("GMT+2", 2024, 1, 5, 9, 30), "yyyy-MM-dd HH:mm", "GMT+2")
plot(formatted == "102.00", title="Formatted Close")
plot(message == "close=102.0", title="Format Template")
plot(joined == "symbol:BTCUSDT", title="Concatenated Symbol")
plot(parsed, title="Parsed Number")
plot(na(invalid) ? 1 : 0, title="Invalid Is NA")
plot(formattedTime == "2024-01-05 09:30", title="Formatted Time")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Formatted Close').values).toEqual([true, false, false, false, false, false, false, false, false, false, false, false]);
    expect(getPlot(result, 'Format Template').values).toEqual([true, false, false, false, false, false, false, false, false, false, false, false]);
    expect(getPlot(result, 'Concatenated Symbol').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(roundSeries(getPlot(result, 'Parsed Number').values)).toEqual([42.5, 42.5, 42.5, 42.5, 42.5, 42.5, 42.5, 42.5, 42.5, 42.5, 42.5, 42.5]);
    expect(getPlot(result, 'Invalid Is NA').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(getPlot(result, 'Formatted Time').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
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
mintick = math.round_to_mintick(1.234)
plot(rounded, title="Rounded Midpoint")
plot(math.trunc(-1.9), title="Truncated")
plot(rightAngle, title="Right Angle")
plot(mintick, title="Min Tick Rounded")
plot(math.round(math.toradians(180), 6), title="Radians")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Rounded Midpoint').values, 2)).toEqual([101, 103.5, 106, 105.25, 101, 99, 102, 106.5, 108.5, 109.5, 111, 110.75]);
    expect(roundSeries(getPlot(result, 'Truncated').values)).toEqual([-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]);
    expect(roundSeries(getPlot(result, 'Right Angle').values)).toEqual([90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90]);
    expect(roundSeries(getPlot(result, 'Min Tick Rounded').values)).toEqual([1.23, 1.23, 1.23, 1.23, 1.23, 1.23, 1.23, 1.23, 1.23, 1.23, 1.23, 1.23]);
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
});
