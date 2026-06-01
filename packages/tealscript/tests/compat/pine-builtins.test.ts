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
directionChanged = ta.change(close > open)
directionChanged2 = ta.change(close > open, 2)
plot(ta.cross(close, 104), title="Cross Threshold")
plot(ta.range(close, 4), title="Close Range")
plot(directionChanged ? 1 : 0, title="Direction Changed")
plot(directionChanged2 ? 1 : 0, title="Direction Changed 2")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Cross Threshold').values).toEqual([false, true, false, true, false, false, false, true, false, false, false, false]);
    expect(roundSeries(getPlot(result, 'Close Range').values)).toEqual([0, 3, 5, 5, 8, 8, 5, 10, 9, 7, 3, 4]);
    expect(getPlot(result, 'Direction Changed').values).toEqual([0, 0, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1]);
    expect(getPlot(result, 'Direction Changed 2').values).toEqual([0, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0]);
  });

  it('runs Pine oscillator helper idioms', () => {
    const result = runCompatScript(`
indicator("Oscillator helpers")
plot(ta.stoch(close, high, low, 3), title="Stoch Close")
plot(ta.stoch(hl2, high, low, 3), title="Stoch HL2")
plot(ta.mfi(hlc3, 3), title="MFI")
plot(ta.wpr(3), title="WPR")
plot(ta.cmo(close, 3), title="CMO")
plot(ta.tsi(close, 2, 3), title="TSI")
plot(ta.tsi(close - open, 2, 3), title="Derived TSI")
plot(ta.cci(close, 3), title="Close CCI")
plot(ta.cci(hlc3, 3), title="Typical CCI")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Stoch Close').values)).toEqual([null, null, 88.888889, 25, 9.090909, 30.769231, 88.888889, 92.857143, 75, 88.888889, 50, 71.428571]);
    expect(roundSeries(getPlot(result, 'Stoch HL2').values)).toEqual([null, null, 77.777778, 56.25, 27.272727, 19.230769, 66.666667, 75, 79.166667, 72.222222, 68.75, 50]);
    expect(roundSeries(getPlot(result, 'MFI').values)).toEqual([null, null, 100, 61.624951, 26.076294, 0, 35.319543, 74.59367, 100, 100, 100, 100]);
    expect(roundSeries(getPlot(result, 'WPR').values)).toEqual([null, null, -11.111111, -75, -90.909091, -69.230769, -11.111111, -7.142857, -25, -11.111111, -50, -28.571429]);
    expect(roundSeries(getPlot(result, 'CMO').values)).toEqual([null, null, null, 11.111111, -60, -77.777778, 11.111111, 100, 80, 77.777778, 20, 66.666667]);
    expect(roundSeries(getPlot(result, 'TSI').values)).toEqual([null, 1, 1, 0.127273, -0.423181, -0.350948, 0.263311, 0.667454, 0.546809, 0.68082, 0.455692, 0.582409]);
    expect(roundSeries(getPlot(result, 'Derived TSI').values)).toEqual([null, 1, 0.333333, -0.708333, -0.792793, 0.212408, 0.577159, 0.708576, -0.246146, 0.084836, -0.231693, 0.049573]);
    expect(roundSeries(getPlot(result, 'Close CCI').values)).toEqual([null, null, 87.5, -100, -100, -28.571429, 100, 100, 33.333333, 100, 20, 100]);
    expect(roundSeries(getPlot(result, 'Typical CCI').values)).toEqual([null, null, 95.652174, -25, -100, -70, 100, 100, 64.516129, 100, 84.615385, 50]);
  });

  it('runs cumulative and dispersion TA helpers', () => {
    const result = runCompatScript(`
indicator("Cumulative TA docs smoke")
plot(ta.cum(close), title="Cum Close")
plot(ta.variance(close, 3), title="Variance")
plot(ta.variance(source=close, length=3, biased=false), title="Unbiased Variance")
plot(ta.stdev(source=close, length=3, biased=false), title="Unbiased Stdev")
plot(ta.dev(close, 3), title="Mean Deviation")
plot(ta.correlation(close, open, 3), title="Close Open Correlation")
plot(ta.correlation(close, high, 3), title="Close High Correlation")
plot(ta.correlation(close, close, 3), title="Self Correlation")
plot(ta.cog(close, 3), title="COG")
plot(ta.cog(close - open, 3), title="Derived COG")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Cum Close').values)).toEqual([102, 207, 314, 417, 516, 616, 720, 829, 937, 1048, 1158, 1270]);
    expect(roundSeries(getPlot(result, 'Variance').values)).toEqual([null, null, 4.222222, 2.666667, 10.666667, 2.888889, 4.666667, 13.555556, 4.666667, 1.555556, 1.555556, 0.666667]);
    expect(roundSeries(getPlot(result, 'Unbiased Variance').values)).toEqual([null, null, 6.333333, 4, 16, 4.333333, 7, 20.333333, 7, 2.333333, 2.333333, 1]);
    expect(roundSeries(getPlot(result, 'Unbiased Stdev').values)).toEqual([null, null, 2.516611, 2, 4, 2.081666, 2.645751, 4.50925, 2.645751, 1.527525, 1.527525, 1]);
    expect(roundSeries(getPlot(result, 'Mean Deviation').values)).toEqual([null, null, 1.777778, 1.333333, 2.666667, 1.555556, 2, 3.111111, 2, 1.111111, 1.111111, 0.666667]);
    expect(roundSeries(getPlot(result, 'Close Open Correlation').values)).toEqual([null, null, 0.973684, -0.39736, 0.5, 0.720577, -0.453921, 0.963928, 0.712468, 0, -0.142857, -0.327327]);
    expect(roundSeries(getPlot(result, 'Close High Correlation').values)).toEqual([null, null, 1, -0.327327, 0.755929, 0.81224, 0.544705, 1, 0.940634, 0.654654, 0.5, -0.5]);
    expect(roundSeries(getPlot(result, 'Self Correlation').values)).toEqual([null, null, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'COG').values)).toEqual([null, null, -1.984076, -2.006349, -2.02589, -2.009934, -1.983498, -1.971246, -1.987539, -1.993902, -1.993921, -1.996997]);
    expect(roundSeries(getPlot(result, 'Derived COG').values)).toEqual([null, null, -2, -9, -1, -2.714286, 6, -1.6, -2.625, -2.285714, -2, -2.25]);
  });

  it('runs Pine channel helper idioms', () => {
    const result = runCompatScript(`
indicator("Channel helpers")
[basis, upper, lower] = ta.kc(close, 3, 1.25)
[hlBasis, hlUpper, hlLower] = ta.kc(close, 3, 1.25, false)
plot(basis, title="KC Basis")
plot(upper, title="KC Upper")
plot(lower, title="KC Lower")
plot(ta.kcw(close, 3, 1.25), title="KC Width")
plot(hlUpper, title="HL Upper")
plot(ta.kcw(close, 3, 1.25, false), title="HL Width")
plot(ta.bbw(close, 3, 2.0), title="BB Width")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'KC Basis').values)).toEqual([102, 103.5, 105.25, 104.125, 101.5625, 100.78125, 102.390625, 105.695313, 106.847656, 108.923828, 109.461914, 110.730957]);
    expect(roundSeries(getPlot(result, 'KC Upper').values)).toEqual([107, 109.125, 110.5625, 111.15625, 108.828125, 107.539063, 109.519531, 113.634766, 113.942383, 115.596191, 115.923096, 117.086548]);
    expect(roundSeries(getPlot(result, 'KC Lower').values)).toEqual([97, 97.875, 99.9375, 97.09375, 94.296875, 94.023438, 95.261719, 97.755859, 99.75293, 102.251465, 103.000732, 104.375366]);
    expect(roundSeries(getPlot(result, 'KC Width').values)).toEqual([0.098039, 0.108696, 0.10095, 0.135054, 0.143077, 0.134109, 0.139249, 0.150233, 0.132801, 0.122514, 0.118054, 0.114793]);
    expect(roundSeries(getPlot(result, 'HL Upper').values)).toEqual(roundSeries(getPlot(result, 'KC Upper').values));
    expect(roundSeries(getPlot(result, 'HL Width').values)).toEqual(roundSeries(getPlot(result, 'KC Width').values));
    expect(roundSeries(getPlot(result, 'BB Width').values)).toEqual([null, null, 0.078528, 0.062209, 0.126834, 0.067537, 0.085554, 0.141155, 0.080757, 0.04563, 0.045491, 0.029423]);
  });

  it('runs Pine linear regression helper idioms', () => {
    const result = runCompatScript(`
indicator("Linear regression helpers")
change = close - close[1]
plot(ta.linreg(close, 3, 0), title="LinReg")
plot(ta.linreg(close, 3, 1), title="LinReg Offset")
plot(ta.linreg(change, 3, 0), title="Change LinReg")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'LinReg').values)).toEqual([null, null, 107.166667, 104, 99, 99.166667, 103.5, 108.833333, 109, 110.333333, 110.666667, 111.5]);
    expect(roundSeries(getPlot(result, 'LinReg Offset').values)).toEqual([null, null, 104.666667, 105, 103, 100.666667, 101, 104.333333, 107, 109.333333, 109.666667, 111]);
    expect(roundSeries(getPlot(result, 'Change LinReg').values)).toEqual([null, null, null, -3.166667, -5, 0.166667, 4.333333, 5.333333, 0.166667, 1.333333, 0.333333, 0.833333]);
  });

  it('runs array covariance helper idioms', () => {
    const result = runCompatScript(`
indicator("Array covariance docs smoke")
left = array.new_float(0)
right = array.new_float(0)
for i = 0 to bar_index
    array.push(left, close[i])
    array.push(right, open[i])
plot(array.covariance(left, right), title="Biased Covariance")
plot(array.covariance(left, right, false), title="Unbiased Covariance")
plot(left.covariance(right), title="Method Covariance")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Biased Covariance').values)).toEqual([0, 1.5, 4.111111, 1.625, 1.72, 3.388889, 2.469388, 3.3125, 5.753086, 8.14, 10.53719, 12.555556]);
    expect(roundSeries(getPlot(result, 'Unbiased Covariance').values)).toEqual([null, 3, 6.166667, 2.166667, 2.15, 4.066667, 2.880952, 3.785714, 6.472222, 9.044444, 11.590909, 13.69697]);
    expect(roundSeries(getPlot(result, 'Method Covariance').values)).toEqual(roundSeries(getPlot(result, 'Biased Covariance').values));
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
symbol = "NASDAQ:AAPL"
parts = str.split(symbol, ":")
plot(str.contains(text, "USDT"), title="Contains")
plot(str.startswith(text, "BTC"), title="Starts")
plot(str.endswith(text, "perpetual"), title="Ends")
plot(str.pos(text, "USDT"), title="Position")
plot(str.pos(text, "ETH"), title="Missing Position")
plot(str.substring(text, 0, 3) == "BTC", title="Substring")
plot(str.match("Trade NASDAQ:AAPL now", "[A-Z]+:[A-Z]+") == symbol, title="Regex Match")
plot(array.get(parts, 1) == "AAPL", title="Split Symbol")
plot(str.length(text), title="Length")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Contains').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Starts').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Ends').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(roundSeries(getPlot(result, 'Position').values)).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
    expect(getPlot(result, 'Missing Position').values).toEqual([null, null, null, null, null, null, null, null, null, null, null, null]);
    expect(getPlot(result, 'Substring').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Regex Match').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Split Symbol').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
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
plot(str.replace(trimmed, "usdt", "perp", 1) == "btc-usdt-perp", title="Replace Occurrence")
plot(str.replace_all(trimmed, "usdt", "perp") == "btc-perp-perp", title="Replace All")
plot(str.repeat("?", 3, ",") == "?,?,?", title="Repeat")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Upper').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Lower').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Replace One').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Replace Occurrence').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Replace All').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Repeat').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
  });

  it('matches documented Pine string formatting examples', () => {
    const result = runCompatScript(`
indicator("String docs smoke")
plot(str.tostring(1.25) == "1.25", title="Default Number")
plot(str.tostring(1.25, "#") == "1", title="Rounded Integer")
plot(str.tostring(1.25, "#.#") == "1.3", title="One Decimal")
plot(str.tostring(1.25, "#.0000") == "1.2500", title="Trailing Zeros")
plot(str.tostring(value=1.25, format="#.0") == "1.3", title="Named To String")
plot(str.tostring(true) == "true", title="Bool True")
plot(str.tostring(5 == 3) == "false", title="Bool False")
plot(str.tonumber(string="+.5") == 0.5, title="Named To Number")
plot(na(str.tonumber("0x10")), title="Hex Invalid")
stamp = timestamp("GMT+2", 2024, 1, 5, 9, 30)
plot(str.format_time(time=stamp, timezone="GMT+2") == "2024-01-05T09:30:00+0200", title="Named Time")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Default Number').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Rounded Integer').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'One Decimal').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Trailing Zeros').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Named To String').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Bool True').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Bool False').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Named To Number').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Hex Invalid').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Named Time').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
  });

  it('runs generic input helpers with inferred types', () => {
    const result = runCompatScript(`
indicator("Generic inputs")
length = input(3, "Length")
enabled = input(true, "Enabled")
label = input("BTC", "Label")
namedGeneric = input(defval=4, title="Named Generic")
plot(ta.sma(close, length), title="Basis")
plot(enabled, title="Enabled")
plot(label == "BTC", title="Label")
plot(namedGeneric == 4, title="Named Generic")
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
      {
        id: 'input_Named Generic',
        type: 'int',
        title: 'Named Generic',
        defval: 4,
      },
    ]);
    expect(roundSeries(getPlot(result, 'Basis').values)).toEqual([null, null, 104.666667, 105, 103, 100.666667, 101, 104.333333, 107, 109.333333, 109.666667, 111]);
    expect(getPlot(result, 'Enabled').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Label').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Named Generic').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
  });

  it('matches common Pine global helper named-argument idioms', () => {
    const result = runCompatScript(`
indicator("Global helper docs smoke")
source = bar_index % 3 == 0 ? na : close
plot(nz(source=source, replacement=open), title="Named NZ")
plot(fixnan(source=source), title="Named Fix")
plot(float(x="4.5"), title="Named Float")
plot(int(x=4.9), title="Named Int")
plot(bool(x=1), title="Named Bool")
plot(string(x=12.5) == "12.5", title="Named String")
plot(na(x=source), title="Named NA")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Named NZ').values)).toEqual([100, 105, 107, 107, 99, 100, 100, 109, 108, 108, 110, 112]);
    expect(roundSeries(getPlot(result, 'Named Fix').values)).toEqual([null, 105, 107, 107, 99, 100, 100, 109, 108, 108, 110, 112]);
    expect(getPlot(result, 'Named Float').values).toEqual(Array(compatibilityBars.length).fill(4.5));
    expect(getPlot(result, 'Named Int').values).toEqual(Array(compatibilityBars.length).fill(4));
    expect(getPlot(result, 'Named Bool').values).toEqual(Array(compatibilityBars.length).fill(true));
    expect(getPlot(result, 'Named String').values).toEqual(Array(compatibilityBars.length).fill(true));
    expect(getPlot(result, 'Named NA').values).toEqual([true, false, false, true, false, false, true, false, false, true, false, false]);
  });

  it('runs common typed input helpers', () => {
    const result = runCompatScript(`
indicator("Typed inputs")
start = input.time(1700000000000, "Start")
tf = input.timeframe("60", "Timeframe")
symbol = input.symbol("BINANCE:BTCUSDT", "Symbol")
session = input.session("0930-1600", "Session")
memo = input.text_area("watch breakout", "Notes")
namedPrice = input.price(defval=101.25, title="Named Price")
plot(start == 1700000000000, title="Time")
plot(tf == "60", title="Timeframe")
plot(symbol == "BINANCE:BTCUSDT", title="Symbol")
plot(session == "0930-1600", title="Session")
plot(str.contains(memo, "breakout"), title="Text Area")
plot(namedPrice == 101.25, title="Named Price")
`);

    expect(result.errors).toEqual([]);
    expect(result.inputs.map((input) => input.type)).toEqual(['time', 'timeframe', 'symbol', 'session', 'text_area', 'price']);
    expect(getPlot(result, 'Time').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Timeframe').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Symbol').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Session').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Text Area').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Named Price').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
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

  it('runs price input and active metadata idioms', () => {
    const result = runCompatScript(`
indicator("Price input")
enabled = input.bool(true, "Enabled")
level = input.price(101.5, "Level", active=enabled, tooltip="Drag level")
plot(level, title="Level")
`);

    expect(result.errors).toEqual([]);
    expect(result.inputs).toEqual([
      {
        id: 'input_Enabled',
        type: 'bool',
        title: 'Enabled',
        defval: true,
      },
      {
        id: 'input_Level',
        type: 'price',
        title: 'Level',
        defval: 101.5,
        tooltip: 'Drag level',
        active: true,
      },
    ]);
    expect(getPlot(result, 'Level').values).toEqual([101.5, 101.5, 101.5, 101.5, 101.5, 101.5, 101.5, 101.5, 101.5, 101.5, 101.5, 101.5]);
  });

  it('registers Pine source input metadata', () => {
    const result = runCompatScript(`
indicator("Source input")
source = input.source(defval=close, title="Source", tooltip="Select source")
plot(source, title="Source")
`);

    expect(result.errors).toEqual([]);
    expect(result.inputs).toEqual([
      {
        id: 'input_Source',
        type: 'source',
        title: 'Source',
        defval: 102,
        tooltip: 'Select source',
      },
    ]);
    expect(roundSeries(getPlot(result, 'Source').values)).toEqual([102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110, 112]);
  });

  it('surfaces Pine declaration shorttitle metadata', () => {
    const result = runCompatScript(`
indicator("Long settings title", shorttitle="Short settings title")
plot(close, title="Close")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Long settings title');
    expect(result.indicatorShortTitle).toBe('Short settings title');
    expect(roundSeries(getPlot(result, 'Close').values)).toEqual([102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110, 112]);
  });

  it('surfaces Pine declaration overlay and precision metadata', () => {
    const result = runCompatScript(`
indicator("Overlay precision settings", overlay=true, precision=5)
plot(close, title="Close")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorOverlay).toBe(true);
    expect(result.indicatorPrecision).toBe(5);
    expect(roundSeries(getPlot(result, 'Close').values)).toEqual([102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110, 112]);
  });

  it('surfaces advanced Pine declaration metadata', () => {
    const result = runCompatScript(`
indicator("Advanced settings", timeframe="15", timeframe_gaps=false, explicit_plot_zorder=true, behind_chart=false, max_labels_count=2, max_lines_count=3, max_boxes_count=4, max_polylines_count=5, calc_bars_count=250, dynamic_requests=false)
plot(close, title="Close")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTimeframe).toBe('15');
    expect(result.indicatorTimeframeGaps).toBe(false);
    expect(result.indicatorExplicitPlotZOrder).toBe(true);
    expect(result.indicatorBehindChart).toBe(false);
    expect(result.indicatorCalcBarsCount).toBe(250);
    expect(result.indicatorDynamicRequests).toBe(false);
    expect(result.indicatorDrawingLimits).toEqual({
      label: 2,
      line: 3,
      box: 4,
      polyline: 5,
    });
    expect(roundSeries(getPlot(result, 'Close').values)).toEqual([102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110, 112]);
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
namedColor = color.new(color=color.rgb(red=1, green=2, blue=3), transp=25)
signal = ta.rsi(close, 7)
signalColor = color.from_gradient(signal, 0, 100, color.rgb(255, 0, 0), color.rgb(0, 255, 0, 50))
namedSignalColor = color.from_gradient(value=signal, bottom_value=0, top_value=100, bottom_color=color.rgb(255, 0, 0), top_color=color.rgb(0, 255, 0, 50))
plot(close, title="Close", color=derivedColor)
plot(open, title="Named", color=namedColor)
plot(high, title="Hidden", color=color.none)
plot(signal, title="Signal", color=signalColor)
plot(signal, title="Named Signal", color=namedSignalColor)
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Close').color).toEqual(Array(compatibilityBars.length).fill('#FF800080'));
    expect(getPlot(result, 'Named').color).toEqual(Array(compatibilityBars.length).fill('#010203BF'));
    expect(getPlot(result, 'Hidden').color).toEqual(Array(compatibilityBars.length).fill(null));
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
    expect(getPlot(result, 'Named Signal').color).toEqual(getPlot(result, 'Signal').color);
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
halfTick = math.round_to_mintick(number=1.005)
residueTick = math.round_to_mintick(1.2000000000000002)
sparse = bar_index == 2 ? na : close
seededRandom = math.random(10, 20, 7)
defaultRandom = math.random()
plot(rounded, title="Rounded Midpoint")
plot(math.trunc(-1.9), title="Truncated")
plot(rightAngle, title="Right Angle")
plot(mintick, title="Min Tick Rounded")
plot(halfTick, title="Named Half Tick")
plot(residueTick, title="Residue Tick")
plot(math.round(math.toradians(180), 6), title="Radians")
plot(math.sum(sparse, 3), title="Sparse Sum")
plot(math.round(number=math.pi, precision=3), title="Named Round")
plot(math.pow(base=2, exponent=3), title="Named Pow")
plot(math.sqrt(number=16), title="Named Sqrt")
plot(math.sum(source=sparse, length=3), title="Named Sparse Sum")
plot(math.floor(number=-1.2) + math.ceil(number=1.2) + math.sign(number=-5), title="Named Unary")
plot(seededRandom > 10 and seededRandom < 20 ? 1 : 0, title="Seeded Random In Range")
plot(defaultRandom > 0 and defaultRandom < 1 ? 1 : 0, title="Default Random In Range")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Rounded Midpoint').values, 2)).toEqual([101, 103.5, 106, 105.25, 101, 99, 102, 106.5, 108.5, 109.5, 111, 110.75]);
    expect(roundSeries(getPlot(result, 'Truncated').values)).toEqual([-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]);
    expect(roundSeries(getPlot(result, 'Right Angle').values)).toEqual([90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90]);
    expect(roundSeries(getPlot(result, 'Min Tick Rounded').values)).toEqual([1.23, 1.23, 1.23, 1.23, 1.23, 1.23, 1.23, 1.23, 1.23, 1.23, 1.23, 1.23]);
    expect(roundSeries(getPlot(result, 'Named Half Tick').values)).toEqual([1.01, 1.01, 1.01, 1.01, 1.01, 1.01, 1.01, 1.01, 1.01, 1.01, 1.01, 1.01]);
    expect(roundSeries(getPlot(result, 'Residue Tick').values)).toEqual([1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2]);
    expect(roundSeries(getPlot(result, 'Radians').values, 6)).toEqual([3.141593, 3.141593, 3.141593, 3.141593, 3.141593, 3.141593, 3.141593, 3.141593, 3.141593, 3.141593, 3.141593, 3.141593]);
    expect(roundSeries(getPlot(result, 'Sparse Sum').values)).toEqual([null, null, null, 310, 307, 302, 303, 313, 321, 328, 329, 333]);
    expect(roundSeries(getPlot(result, 'Named Round').values)).toEqual([3.142, 3.142, 3.142, 3.142, 3.142, 3.142, 3.142, 3.142, 3.142, 3.142, 3.142, 3.142]);
    expect(roundSeries(getPlot(result, 'Named Pow').values)).toEqual([8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8]);
    expect(roundSeries(getPlot(result, 'Named Sqrt').values)).toEqual([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
    expect(roundSeries(getPlot(result, 'Named Sparse Sum').values)).toEqual(roundSeries(getPlot(result, 'Sparse Sum').values));
    expect(roundSeries(getPlot(result, 'Named Unary').values)).toEqual([-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]);
    expect(getPlot(result, 'Seeded Random In Range').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(getPlot(result, 'Default Random In Range').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
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

  it('matches common Pine TA named-argument and default-source idioms', () => {
    const result = runCompatScript(`
indicator("TA named args smoke")
plot(ta.sma(source=close, length=3), title="Named SMA")
plot(ta.change(source=close, length=2), title="Named Change")
plot(ta.highest(length=3), title="Default Highest")
plot(ta.lowest(length=3), title="Default Lowest")
plot(ta.highestbars(length=3), title="Default Highest Offset")
plot(ta.lowestbars(length=3), title="Default Lowest Offset")
plot(ta.rising(source=close, length=2), title="Named Rising")
plot(ta.falling(source=close, length=2), title="Named Falling")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Named SMA').values)).toEqual([null, null, 104.666667, 105, 103, 100.666667, 101, 104.333333, 107, 109.333333, 109.666667, 111]);
    expect(roundSeries(getPlot(result, 'Named Change').values)).toEqual([null, null, 5, -2, -8, -3, 5, 9, 4, 2, 2, 1]);
    expect(roundSeries(getPlot(result, 'Default Highest').values)).toEqual([103, 106, 108, 109, 109, 109, 105, 110, 111, 112, 114, 114]);
    expect(roundSeries(getPlot(result, 'Default Lowest').values)).toEqual([99, 99, 99, 101, 98, 96, 96, 96, 99, 103, 106, 107]);
    expect(getPlot(result, 'Default Highest Offset').values).toEqual([0, 0, 0, 0, 1, 2, 0, 0, 0, 0, 0, 1]);
    expect(getPlot(result, 'Default Lowest Offset').values).toEqual([0, 1, 2, 2, 0, 0, 1, 2, 2, 2, 2, 2]);
    expect(getPlot(result, 'Named Rising').values).toEqual([false, false, true, false, false, false, true, true, false, true, false, true]);
    expect(getPlot(result, 'Named Falling').values).toEqual([false, false, false, true, true, false, false, false, false, false, false, false]);
  });

  it('matches Pine TA windows over derived source expressions', () => {
    const result = runCompatScript(`
indicator("TA derived source smoke")
spread = close - open
plot(ta.sma(spread, 3), title="Spread SMA")
plot(ta.ema(spread, 3), title="Spread EMA")
plot(ta.rma(spread, 3), title="Spread RMA")
plot(ta.wma(spread, 3), title="Spread WMA")
plot(ta.highest(spread, 3), title="Spread Highest")
plot(ta.lowest(spread, 3), title="Spread Lowest")
plot(ta.range(spread, 3), title="Spread Range")
plot(ta.mom(spread, 2), title="Spread Momentum")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Spread SMA').values)).toEqual([null, null, 2.333333, 0.333333, -2, -2.333333, 0.333333, 3.333333, 2.666667, 2.333333, 0.333333, 1.333333]);
    expect(roundSeries(getPlot(result, 'Spread EMA').values)).toEqual([2, 2.5, 2.25, -0.875, -2.4375, -0.71875, 1.640625, 3.320313, 1.160156, 2.080078, 0.540039, 1.27002]);
    expect(roundSeries(getPlot(result, 'Spread RMA').values)).toEqual([2, 2.333333, 2.222222, 0.148148, -1.234568, -0.489712, 1.006859, 2.337906, 1.225271, 1.816847, 0.877898, 1.251932]);
    expect(roundSeries(getPlot(result, 'Spread WMA').values)).toEqual([null, null, 2.333333, -0.833333, -3, -1.5, 1.666667, 4, 1.833333, 2, 0.333333, 1.166667]);
    expect(roundSeries(getPlot(result, 'Spread Highest').values)).toEqual([2, 3, 3, 3, 2, 1, 4, 5, 5, 5, 3, 3]);
    expect(roundSeries(getPlot(result, 'Spread Lowest').values)).toEqual([2, 2, 2, -4, -4, -4, -4, 1, -1, -1, -1, -1]);
    expect(roundSeries(getPlot(result, 'Spread Range').values)).toEqual([0, 1, 1, 7, 6, 5, 8, 4, 6, 6, 4, 4]);
    expect(roundSeries(getPlot(result, 'Spread Momentum').values)).toEqual([null, null, 0, -7, -6, 5, 8, 4, -5, -2, 0, -1]);
  });

  it('preserves real bar offsets through na values for TA offset helpers', () => {
    const result = runCompatScript(`
indicator("TA offset na smoke")
source = bar_index == 1 ? na : close
plot(ta.highestbars(source, 3), title="Highest Offset")
plot(ta.lowestbars(source, 3), title="Lowest Offset")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Highest Offset').values.slice(0, 5)).toEqual([0, 1, 0, 1, 2]);
    expect(getPlot(result, 'Lowest Offset').values.slice(0, 5)).toEqual([0, 1, 2, 0, 0]);
  });
});
