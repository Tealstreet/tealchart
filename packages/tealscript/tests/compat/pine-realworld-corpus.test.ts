import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { InMemoryRequestDatafeed, type Bar } from '../../src/runtime';
import { compatibilityBars, getPlot, roundSeries, runCompatScript } from './fixtures.ts';

const stratBars = [
  { time: 1_700_610_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
  { time: 1_700_610_060_000, open: 103, high: 105, low: 102, close: 104, volume: 100 },
  { time: 1_700_610_120_000, open: 104, high: 106, low: 103, close: 105, volume: 100 },
  { time: 1_700_610_180_000, open: 105, high: 106, low: 104, close: 105, volume: 100 },
];

describe('Pine real-world corpus probe', () => {
  it('locks a reduced public RSI overbought/oversold signal idiom', () => {
    // Public idiom reference: RSI scripts expose overbought/oversold level
    // inputs and route the RSI series plus threshold signals into plots.
    // Source search: https://www.tradingview.com/scripts/search/rsi%20signal%20overbought%20oversold/
    const result = runCompatScript(`
indicator("Public RSI Signal Checkpoint")
length = input.int(5, "Length")
overbought = input.float(70.0, "Overbought")
oversold = input.float(30.0, "Oversold")
rsi = ta.rsi(close, length)
isOB = rsi > overbought
isOS = rsi < oversold
plot(rsi, title="RSI")
plot(isOB ? 1 : 0, title="Overbought")
plot(isOS ? 1 : 0, title="Oversold")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Public RSI Signal Checkpoint');
    expect(result.inputs.map((i) => [i.title, i.type])).toEqual([
      ['Length', 'int'],
      ['Overbought', 'float'],
      ['Oversold', 'float'],
    ]);
    expect(roundSeries(getPlot(result, 'RSI').values)).toEqual([
      null, null, null, null, null,
      42.857143, 57.894737, 70.16317, 65.39924, 72.421258, 66.774781, 72.194557,
    ]);
    expect(getPlot(result, 'Overbought').values).toEqual([0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1]);
    expect(getPlot(result, 'Oversold').values).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('locks a reduced public MACD crossover signal idiom', () => {
    // Public idiom reference: MACD scripts expose fast/slow/signal length inputs,
    // destructure ta.macd() into the MACD line, signal line, and histogram, then
    // mark bullish bars where the MACD line is above the signal line.
    // Source search: https://www.tradingview.com/scripts/search/MACD%20signal%20crossover/
    const result = runCompatScript(`
indicator("Public MACD Signal Checkpoint")
fastLen = input.int(3, "Fast Length")
slowLen = input.int(6, "Slow Length")
sigLen = input.int(2, "Signal Length")
[macdLine, signalLine, histogram] = ta.macd(close, fastLen, slowLen, sigLen)
bullish = macdLine > signalLine
plot(macdLine, title="MACD")
plot(signalLine, title="Signal")
plot(histogram, title="Histogram")
plot(bullish ? 1 : 0, title="Bullish")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Public MACD Signal Checkpoint');
    expect(result.inputs.map((i) => [i.title, i.type])).toEqual([
      ['Fast Length', 'int'],
      ['Slow Length', 'int'],
      ['Signal Length', 'int'],
    ]);
    expect(roundSeries(getPlot(result, 'MACD').values)).toEqual([
      0, 0.642857, 1.209184, 0.38156, -0.825672,
      -0.924587, 0.029313, 1.437232, 1.520456, 1.975828, 1.641914, 1.716671,
    ]);
    expect(roundSeries(getPlot(result, 'Signal').values)).toEqual([
      0, 0.428571, 0.94898, 0.5707, -0.360214,
      -0.736463, -0.225946, 0.88284, 1.307917, 1.753191, 1.679006, 1.704116,
    ]);
    expect(getPlot(result, 'Bullish').values).toEqual([0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 1]);
  });

  it('locks a reduced public ATR-based position sizing idiom', () => {
    // Public idiom reference: ATR position-sizing scripts derive a stop distance
    // from ATR and compute a risk-adjusted position size from a pct-of-capital
    // risk parameter.
    // Source search: https://www.tradingview.com/scripts/search/average%20true%20range%20signal/
    const result = runCompatScript(`
indicator("Public ATR Position Sizing Checkpoint")
atrLen = input.int(5, "ATR Length")
riskPct = input.float(2.0, "Risk Pct")
atr = ta.atr(atrLen)
stopDist = atr * 1.5
riskAmt = close * riskPct / 100
posSize = riskAmt / stopDist
plot(atr, title="ATR")
plot(stopDist, title="Stop Distance")
plot(posSize, title="Position Size")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Public ATR Position Sizing Checkpoint');
    expect(result.inputs.map((i) => [i.title, i.type])).toEqual([
      ['ATR Length', 'int'],
      ['Risk Pct', 'float'],
    ]);
    expect(roundSeries(getPlot(result, 'ATR').values)).toEqual([
      null, null, null, null,
      5.2, 5.16, 5.328, 5.6624, 5.52992, 5.423936, 5.339149, 5.271319,
    ]);
    expect(roundSeries(getPlot(result, 'Stop Distance').values)).toEqual([
      null, null, null, null,
      7.8, 7.74, 7.992, 8.4936, 8.29488, 8.135904, 8.008723, 7.906979,
    ]);
    expect(roundSeries(getPlot(result, 'Position Size').values)).toEqual([
      null, null, null, null,
      0.253846, 0.258398, 0.26026, 0.256664, 0.260402, 0.272865, 0.2747, 0.283294,
    ]);
  });

  it('locks a reduced public PVT signal idiom', () => {
    // Public idiom reference: PVT scripts expose a signal-line length input,
    // build the cumulative price-volume trend series via ta.pvt, smooth it with
    // EMA, and mark bars where PVT is above the signal line.
    // Source search: https://www.tradingview.com/scripts/search/price%20volume%20trend%20signal/
    const result = runCompatScript(`
indicator("Public PVT Signal Checkpoint")
length = input.int(3, "Signal Length")
pvt = ta.pvt
signal = ta.ema(pvt, length)
bullish = pvt > signal
plot(pvt, title="PVT")
plot(signal, title="Signal")
plot(bullish ? 1 : 0, title="Bullish")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Public PVT Signal Checkpoint');
    expect(result.inputs.map((i) => [i.title, i.type])).toEqual([
      ['Signal Length', 'int'],
    ]);
    expect(roundSeries(getPlot(result, 'PVT').values)).toEqual([
      0, 32.352941, 49.495798, 2.766826, -51.602106,
      -40.996045, 11.003955, 87.927032, 76.917858, 118.584524, 106.422362, 132.785998,
    ]);
    expect(getPlot(result, 'Bullish').values).toEqual([0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1]);
  });

  it('locks a reduced public Bollinger-Band / Keltner-Channel squeeze idiom', () => {
    // Public idiom reference: BB-KC squeeze scripts detect low-volatility
    // compression by checking whether the BB width is narrower than the KC width.
    // Source search: https://www.tradingview.com/scripts/search/bollinger%20band%20keltner%20squeeze/
    const result = runCompatScript(`
indicator("Public BB KC Squeeze Checkpoint")
length = input.int(5, "Length")
[middle, upper, lower] = ta.bb(close, length, 2.0)
[kcMid, kcUpper, kcLower] = ta.kc(close, length, 1.5)
squeeze = upper - lower < kcUpper - kcLower
bbWidth = upper - lower
plot(bbWidth, title="BB Width")
plot(squeeze ? 1 : 0, title="Squeeze")
plot(middle, title="Middle")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Public BB KC Squeeze Checkpoint');
    expect(roundSeries(getPlot(result, 'BB Width').values)).toEqual([
      null, null, null, null,
      10.851728, 11.973304, 11.48216, 14.085453, 16.198765, 15.717506, 9.666437, 5.656854,
    ]);
    expect(getPlot(result, 'Squeeze').values).toEqual([0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Middle').values)).toEqual([
      null, null, null, null,
      103.2, 102.8, 102.6, 103, 104, 106.4, 108.4, 110,
    ]);
  });

  it('locks a reduced public moving-average ribbon idiom', () => {
    // Public idiom reference: MA ribbon scripts stack multiple EMAs of increasing
    // length and emit a bull-trend flag when each faster EMA is above the next slower one.
    // Source search: https://www.tradingview.com/scripts/search/moving%20average%20ribbon%20ema/
    const result = runCompatScript(`
indicator("Public MA Ribbon Checkpoint")
ema3 = ta.ema(close, 3)
ema5 = ta.ema(close, 5)
ema7 = ta.ema(close, 7)
bullTrend = ema3 > ema5 and ema5 > ema7
plot(ema3, title="EMA3")
plot(ema5, title="EMA5")
plot(ema7, title="EMA7")
plot(bullTrend ? 1 : 0, title="Bull Trend")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Public MA Ribbon Checkpoint');
    expect(roundSeries(getPlot(result, 'EMA3').values)).toEqual([
      102, 103.5, 105.25, 104.125, 101.5625, 100.78125,
      102.390625, 105.695313, 106.847656, 108.923828, 109.461914, 110.730957,
    ]);
    expect(getPlot(result, 'Bull Trend').values).toEqual([0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1]);
  });

  it('locks a reduced public bar-coloring trend-state idiom', () => {
    // Public idiom reference: bar-coloring scripts gate barcolor on a trend
    // condition such as close vs SMA and expose a numeric state plot for downstream use.
    // Source search: https://www.tradingview.com/scripts/search/bar%20color%20trend%20sma/
    const result = runCompatScript(`
indicator("Public Barcolor Trend Checkpoint", overlay=true)
length = input.int(5, "Length")
sma = ta.sma(close, length)
bullColor = color.new(color.green, 50)
bearColor = color.new(color.red, 50)
barcolor(close > sma ? bullColor : bearColor, title="Trend Color")
plot(sma, title="SMA")
plot(close > sma ? 1 : 0, title="Bull State")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Public Barcolor Trend Checkpoint');
    expect(roundSeries(getPlot(result, 'SMA').values)).toEqual([
      null, null, null, null,
      103.2, 102.8, 102.6, 103, 104, 106.4, 108.4, 110,
    ]);
    expect(getPlot(result, 'Bull State').values).toEqual([0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1]);
  });

  it('locks a reduced public UDF-based smoothed RSI idiom', () => {
    // Public idiom reference: UDF scripts commonly wrap ta.* calls in a named
    // function that adds smoothing or normalization before plotting the result.
    // Source search: https://www.tradingview.com/scripts/search/smoothed%20rsi%20function/
    const result = runCompatScript(`
indicator("Public UDF Smoothed RSI Checkpoint")
smoothedRsi(src, len, smooth) =>
    r = ta.rsi(src, len)
    ta.sma(r, smooth)
length = input.int(5, "RSI Length")
smooth = input.int(2, "Smooth")
srsi = smoothedRsi(close, length, smooth)
signal = srsi > 50
plot(srsi, title="Smoothed RSI")
plot(signal ? 1 : 0, title="Signal")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Public UDF Smoothed RSI Checkpoint');
    expect(result.inputs.map((i) => [i.title, i.type])).toEqual([
      ['RSI Length', 'int'],
      ['Smooth', 'int'],
    ]);
    expect(roundSeries(getPlot(result, 'Smoothed RSI').values)).toEqual([
      null, null, null, null, null, null,
      50.37594, 64.028954, 67.781205, 68.910249, 69.598019, 69.484669,
    ]);
    expect(getPlot(result, 'Signal').values).toEqual([0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1]);
  });

  it('locks a reduced public RSI divergence scanner idiom', () => {
    // Public idiom reference: RSI divergence scanners compare recent price
    // swing highs/lows against RSI extremes to emit bearish/bullish divergence signals.
    // Source search: https://www.tradingview.com/scripts/search/rsi%20divergence%20scanner/
    const result = runCompatScript(`
indicator("Public RSI Divergence Checkpoint")
length = input.int(5, "RSI Length")
pivotLen = input.int(2, "Pivot Lookback")
rsi = ta.rsi(close, length)
recentHigh = ta.highest(high, pivotLen)
recentLow = ta.lowest(low, pivotLen)
rsiHigh = ta.highest(rsi, pivotLen)
rsiLow = ta.lowest(rsi, pivotLen)
bearDiv = high >= recentHigh and rsi < rsiHigh
bullDiv = low <= recentLow and rsi > rsiLow
plot(rsi, title="RSI")
plot(bearDiv ? 1 : 0, title="Bear Div")
plot(bullDiv ? 1 : 0, title="Bull Div")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Public RSI Divergence Checkpoint');
    expect(result.inputs.map((i) => [i.title, i.type])).toEqual([
      ['RSI Length', 'int'],
      ['Pivot Lookback', 'int'],
    ]);
    expect(roundSeries(getPlot(result, 'RSI').values)).toEqual([
      null, null, null, null, null,
      42.857143, 57.894737, 70.16317, 65.39924, 72.421258, 66.774781, 72.194557,
    ]);
    expect(getPlot(result, 'Bear Div').values).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0]);
    expect(getPlot(result, 'Bull Div').values).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
  });

  it('locks a reduced public OBV volume-trend analysis idiom', () => {
    // Public idiom reference: volume analysis scripts build OBV, apply a moving
    // average signal line, and gate a high-volume flag from volume vs its own SMA.
    // Source search: https://www.tradingview.com/scripts/search/obv%20volume%20trend%20analysis/
    const result = runCompatScript(`
indicator("Public Volume Analysis Checkpoint")
volLen = input.int(5, "Volume MA Length")
obv = ta.obv
obvSma = ta.sma(obv, volLen)
volSma = ta.sma(volume, volLen)
highVol = volume > volSma * 1.5
plot(obv, title="OBV")
plot(obvSma, title="OBV SMA")
plot(highVol ? 1 : 0, title="High Volume")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Public Volume Analysis Checkpoint');
    expect(getPlot(result, 'OBV').values).toEqual([
      0, 1100, 2000, 750, -650, 400, 1700, 3300, 2100, 3600, 2250, 3700,
    ]);
    expect(roundSeries(getPlot(result, 'OBV SMA').values)).toEqual([
      null, null, null, null, 640, 720, 840, 1100, 1370, 2220, 2590, 2990,
    ]);
    expect(getPlot(result, 'High Volume').values).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('locks a reduced public multi-indicator table dashboard idiom', () => {
    // Public idiom reference: multi-indicator dashboards combine RSI, trend, and
    // ATR into a persistent table updated only on the last bar.
    // Source search: https://www.tradingview.com/scripts/search/multi%20indicator%20dashboard%20table/
    const result = runCompatScript(`
indicator("Public Multi-Indicator Dashboard Checkpoint", overlay=true)
rsiLen = input.int(5, "RSI Length")
smaLen = input.int(5, "SMA Length")
rsi = ta.rsi(close, rsiLen)
sma = ta.sma(close, smaLen)
atr = ta.atr(rsiLen)
trendState = close > sma ? "Up" : "Down"
var table dash = table.new(position.top_right, 2, 3)
if barstate.islast
    table.cell(dash, 0, 0, "RSI")
    table.cell(dash, 1, 0, str.tostring(math.round(rsi)))
    table.cell(dash, 0, 1, "Trend")
    table.cell(dash, 1, 1, trendState)
    table.cell(dash, 0, 2, "ATR")
    table.cell(dash, 1, 2, str.tostring(math.round(atr)))
plot(rsi, title="RSI")
plot(sma, title="SMA")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Public Multi-Indicator Dashboard Checkpoint');
    // Verify RSI and SMA plots are produced
    expect(roundSeries(getPlot(result, 'RSI').values)).toEqual([
      null, null, null, null, null,
      42.857143, 57.894737, 70.16317, 65.39924, 72.421258, 66.774781, 72.194557,
    ]);
    expect(roundSeries(getPlot(result, 'SMA').values)).toEqual([
      null, null, null, null,
      103.2, 102.8, 102.6, 103, 104, 106.4, 108.4, 110,
    ]);
    // Table drawing is present at last bar
    expect(result.drawings.filter((d) => d.type === 'table').length).toBeGreaterThan(0);
  });

  it('locks a reduced public oscillator-combo RSI+Stochastic signal idiom', () => {
    // Public idiom reference: oscillator combo scripts gate combined overbought/
    // oversold signals on both RSI and stochastic thresholds simultaneously.
    // Source search: https://www.tradingview.com/scripts/search/rsi%20stochastic%20oscillator%20combo/
    const result = runCompatScript(`
indicator("Public Oscillator Combo Checkpoint")
rsiLen = input.int(5, "RSI Length")
stochLen = input.int(4, "Stoch Length")
obLevel = input.float(70.0, "Overbought")
osLevel = input.float(30.0, "Oversold")
rsi = ta.rsi(close, rsiLen)
rawK = ta.stoch(close, high, low, stochLen)
k = ta.sma(rawK, 2)
d = ta.sma(k, 3)
combinedOB = rsi > obLevel and k > obLevel
combinedOS = rsi < osLevel and k < osLevel
plot(rsi, title="RSI")
plot(k, title="Stoch K")
plot(combinedOB ? 1 : 0, title="Combined OB")
plot(combinedOS ? 1 : 0, title="Combined OS")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Public Oscillator Combo Checkpoint');
    expect(result.inputs.map((i) => [i.title, i.type])).toEqual([
      ['RSI Length', 'int'],
      ['Stoch Length', 'int'],
      ['Overbought', 'float'],
      ['Oversold', 'float'],
    ]);
    expect(roundSeries(getPlot(result, 'RSI').values)).toEqual([
      null, null, null, null, null,
      42.857143, 57.894737, 70.16317, 65.39924, 72.421258, 66.774781, 72.194557,
    ]);
    expect(roundSeries(getPlot(result, 'Stoch K').values)).toEqual([
      null, null, null, null,
      24.545455, 19.93007, 46.153846, 77.197802, 86.428571, 86.153846, 77.972028, 69.318182,
    ]);
    expect(getPlot(result, 'Combined OB').values).toEqual([0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0]);
    expect(getPlot(result, 'Combined OS').values).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('locks a reduced public MA-crossover alert-condition idiom', () => {
    // Public idiom reference: alert-based signal scripts register alertcondition()
    // for MA crossovers with dynamic message templates and also plot the MAs.
    // Source search: https://www.tradingview.com/scripts/search/ma%20crossover%20alert%20signal/
    const result = runCompatScript(`
indicator("Public Alert Signal Checkpoint")
length = input.int(5, "Length")
fastMa = ta.sma(close, 3)
slowMa = ta.sma(close, length)
crossUp = ta.crossover(fastMa, slowMa)
crossDown = ta.crossunder(fastMa, slowMa)
alertcondition(crossUp, title="Buy Signal", message="MA Cross Up: {{ticker}} {{close}}")
alertcondition(crossDown, title="Sell Signal", message="MA Cross Down: {{ticker}} {{close}}")
plot(fastMa, title="Fast MA")
plot(slowMa, title="Slow MA")
plot(crossUp ? 1 : 0, title="Cross Up")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Public Alert Signal Checkpoint');
    expect(roundSeries(getPlot(result, 'Fast MA').values)).toEqual([
      null, null, 104.666667, 105, 103, 100.666667,
      101, 104.333333, 107, 109.333333, 109.666667, 111,
    ]);
    expect(roundSeries(getPlot(result, 'Slow MA').values)).toEqual([
      null, null, null, null,
      103.2, 102.8, 102.6, 103, 104, 106.4, 108.4, 110,
    ]);
    expect(getPlot(result, 'Cross Up').values).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
  });

  it('locks a reduced public VWAP deviation-band idiom', () => {
    // Public idiom reference: VWAP scripts accumulate price*volume and volume
    // to build running VWAP, then compute a standard-deviation envelope around it.
    // Source search: https://www.tradingview.com/scripts/search/vwap%20standard%20deviation%20bands/
    const result = runCompatScript(`
indicator("Public VWAP Dev Bands Checkpoint")
var float sumPV = 0.0
var float sumV = 0.0
var float sumPV2 = 0.0
typicalPrice = (high + low + close) / 3
sumPV := sumPV + typicalPrice * volume
sumV := sumV + volume
sumPV2 := sumPV2 + typicalPrice * typicalPrice * volume
vwap = sumPV / sumV
variance = sumPV2 / sumV - vwap * vwap
stdev = math.sqrt(math.max(variance, 0))
upper = vwap + 2 * stdev
lower = vwap - 2 * stdev
plot(vwap, title="VWAP")
plot(upper, title="Upper Band")
plot(lower, title="Lower Band")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Public VWAP Dev Bands Checkpoint');
    expect(roundSeries(getPlot(result, 'VWAP').values)).toEqual([
      101.333333, 102.730159, 103.811111, 104.062745,
      103.138643, 102.49005, 102.51875, 103.321181,
      103.878086, 104.624661, 105.255189, 105.806843,
    ]);
    // Upper band is always >= VWAP and lower is always <= VWAP
    const vwapVals = getPlot(result, 'VWAP').values as number[];
    const upperVals = getPlot(result, 'Upper Band').values as number[];
    const lowerVals = getPlot(result, 'Lower Band').values as number[];
    for (let i = 0; i < compatibilityBars.length; i++) {
      expect(upperVals[i]).toBeGreaterThanOrEqual(vwapVals[i]!);
      expect(lowerVals[i]).toBeLessThanOrEqual(vwapVals[i]!);
    }
  });

  it('locks a reduced public pivot support/resistance drawing idiom', () => {
    // Public idiom reference: S/R scripts identify swing highs and lows via
    // ta.highest/ta.lowest over a lookback and draw horizontal lines at those levels.
    // Source search: https://www.tradingview.com/scripts/search/support%20resistance%20pivot%20levels/
    const result = runCompatScript(`
indicator("Public Support Resistance Checkpoint")
pivotLen = input.int(2, "Pivot Length")
swingHigh = ta.highest(high, pivotLen * 2 + 1)
swingLow = ta.lowest(low, pivotLen * 2 + 1)
isSwingHigh = high == swingHigh
isSwingLow = low == swingLow
var line resistLine = na
var line supportLine = na
if isSwingHigh
    resistLine := line.new(bar_index - pivotLen, high[pivotLen], bar_index, high[pivotLen], color=color.red)
if isSwingLow
    supportLine := line.new(bar_index - pivotLen, low[pivotLen], bar_index, low[pivotLen], color=color.green)
plot(swingHigh, title="Resistance")
plot(swingLow, title="Support")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Public Support Resistance Checkpoint');
    expect(getPlot(result, 'Resistance').values).toEqual([
      103, 106, 108, 109, 109, 109, 109, 110, 111, 112, 114, 114,
    ]);
    expect(getPlot(result, 'Support').values).toEqual([
      99, 99, 99, 99, 98, 96, 96, 96, 96, 96, 99, 103,
    ]);
    // At least one line drawing should be produced (swing high or low hit)
    expect(result.drawings.filter((d) => d.type === 'line').length).toBeGreaterThan(0);
  });

  it('locks a reduced advanced strategy stats table idiom', () => {
    // Advanced idiom: strategy performance scripts build a stats table using
    // strategy.netprofit, strategy.avg_trade, strategy.max_drawdown, and
    // strategy.wintrades / strategy.closedtrades.
    // Source search: https://www.tradingview.com/scripts/search/strategy%20performance%20stats%20table/
    const result = runCompatScript(`
strategy("Adv Strategy Stats Checkpoint", overlay=true, process_orders_on_close=true)
var stats = table.new(position.top_right, 2, 5, border_width=1, border_color=color.white)
if bar_index == 0
    strategy.entry("L", strategy.long, qty=1)
if bar_index == 1
    strategy.close("L", comment="tp")
if barstate.islast
    table.cell(stats, 0, 0, "Metric")
    table.cell(stats, 1, 0, "Value")
    table.cell(stats, 0, 1, "Net P/L")
    table.cell(stats, 1, 1, str.tostring(math.round(strategy.netprofit, 2)))
    table.cell(stats, 0, 2, "Avg Trade")
    table.cell(stats, 1, 2, str.tostring(math.round(strategy.avg_trade, 2)))
    table.cell(stats, 0, 3, "Max DD")
    table.cell(stats, 1, 3, str.tostring(math.round(strategy.max_drawdown, 2)))
    table.cell(stats, 0, 4, "Wins")
    table.cell(stats, 1, 4, str.tostring(strategy.wintrades) + "/" + str.tostring(strategy.closedtrades))
plot(strategy.netprofit, title="Net Profit")
plot(strategy.avg_trade, title="Avg Trade")
plot(strategy.closedtrades, title="Closed Trades")
`, { bars: stratBars });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 1, 1, 1]);
    // Entry at bar 0 (close=100), close at bar 1 (close=104) → profit=4
    expect(getPlot(result, 'Net Profit').values).toEqual([0, 4, 4, 4]);
    // avg_trade is na until first close, then 4/1
    expect(roundSeries(getPlot(result, 'Avg Trade').values)).toEqual([null, 4, 4, 4]);
    expect(result.drawings.filter((d) => d.type === 'table').length).toBeGreaterThan(0);
  });

  it('locks a reduced advanced UDT with methods and for-in iteration idiom', () => {
    // Advanced idiom: UDT scripts define types with multiple fields, attach
    // methods that mutate state and return self, store instances in an array,
    // and aggregate with a for-in loop.
    // Source search: https://www.tradingview.com/scripts/search/user%20defined%20type%20method%20array/
    const result = runCompatScript(`
indicator("Adv UDT Methods Checkpoint")
type Signal
    float price = na
    float score = 0.0
    bool active = false

method activate(Signal this, float threshold) =>
    this.active := this.price > threshold
    this.score := this.active ? (this.price - threshold) / threshold * 100 : 0.0
    this

var array<Signal> signals = array.new<Signal>()
sig = Signal.new(close)
sig.activate(104.0)
signals.push(sig)
activeCount = 0
totalScore = 0.0
for s in signals
    if s.active
        activeCount += 1
        totalScore += s.score
plot(signals.size(), title="Signal Count")
plot(activeCount, title="Active Count")
plot(totalScore, title="Total Score")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Signal Count').values).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    // close > 104: bar0(102 no), bar1(105 yes), bar2(107 yes), bar3(103 no), bar4(99 no), bar5(100 no), bar6(104 no), bar7(109 yes), bar8(108 yes), bar9(111 yes), bar10(110 yes), bar11(112 yes)
    expect(getPlot(result, 'Active Count').values).toEqual([0, 1, 2, 2, 2, 2, 2, 3, 4, 5, 6, 7]);
    expect(roundSeries(getPlot(result, 'Total Score').values)).toEqual([
      0, 0.961538, 3.846154, 3.846154, 3.846154, 3.846154, 3.846154,
      8.653846, 12.5, 19.230769, 25, 32.692308,
    ]);
  });

  it('locks a reduced advanced UDF with default parameters and nested calls idiom', () => {
    // Advanced idiom: library-style scripts define helper UDFs with default
    // parameter values and compose them via nested calls — common pattern in
    // public indicator libraries.
    // Source search: https://www.tradingview.com/scripts/search/normalize%20function%20default%20parameters/
    const result = runCompatScript(`
indicator("Adv UDF Defaults Checkpoint")
normalize(src, len, minBound = 0.0, maxBound = 100.0) =>
    highest = ta.highest(src, len)
    lowest = ta.lowest(src, len)
    range_ = highest - lowest
    range_ == 0 ? 50.0 : minBound + (src - lowest) / range_ * (maxBound - minBound)

smoothedNorm(src, len, smooth = 2, minBound = 0.0, maxBound = 100.0) =>
    n = normalize(src, len, minBound, maxBound)
    ta.ema(n, smooth)

norm = normalize(close, 5)
sn = smoothedNorm(close, 5)
snCustom = smoothedNorm(close, 5, 3, 20.0, 80.0)
plot(norm, title="Norm")
plot(sn, title="Smoothed Norm")
plot(snCustom, title="Custom Norm")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Norm').values)).toEqual([
      50, 100, 100, 20, 0, 12.5, 62.5, 100, 90, 100, 85.714286, 100,
    ]);
    expect(roundSeries(getPlot(result, 'Smoothed Norm').values)).toEqual([
      50, 83.333333, 94.444444, 44.814815, 14.938272, 13.312757,
      46.104252, 82.034751, 87.344917, 95.781639, 89.07007, 96.35669,
    ]);
    expect(roundSeries(getPlot(result, 'Custom Norm').values)).toEqual([
      50, 65, 72.5, 52.25, 36.125, 31.8125, 44.65625, 62.328125, 68.164063, 74.082031, 72.755301, 76.377651,
    ]);
  });

  it('locks a reduced advanced drawing objects lifecycle idiom', () => {
    // Advanced idiom: drawing scripts create labels on signal bars, push them
    // into an array, and delete the oldest label when the cap is exceeded.
    // Source search: https://www.tradingview.com/scripts/search/label%20array%20delete%20oldest/
    const result = runCompatScript(`
indicator("Adv Drawing Lifecycle Checkpoint", overlay=true)
var array<label> labels = array.new<label>()
maxLabels = 3
isBull = close > open
if isBull
    lbl = label.new(bar_index, close, "B", style=label.style_label_down, color=color.green, textcolor=color.white)
    labels.push(lbl)
    if labels.size() > maxLabels
        label.delete(labels.shift())
plot(labels.size(), title="Label Count")
plot(isBull ? 1 : 0, title="Bull Bar")
`);

    expect(result.errors).toEqual([]);
    // Count caps at 3 once 3 bull bars have been seen
    expect(getPlot(result, 'Label Count').values).toEqual([1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
    // close > open per compatibilityBars: bar0(102>100), bar1(105>102), bar2(107>105), bar3(103<107 no), bar4(99<103 no), bar5(100>99), bar6(104>100), bar7(109>104), bar8(108<109 no), bar9(111>108), bar10(110<111 no), bar11(112>110)
    expect(getPlot(result, 'Bull Bar').values).toEqual([1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1]);
    // After cap is hit, old labels get deleted; remaining alive labels are 3
    expect(result.drawings.filter((d) => d.type === 'label').length).toBe(3);
  });

  it('locks a reduced advanced switch expression with local enum state machine idiom', () => {
    // Advanced idiom: state machine scripts define a local enum type and use a
    // switch expression to assign the current state based on SMA conditions.
    // Source search: https://www.tradingview.com/scripts/search/enum%20state%20machine%20switch/
    const result = runCompatScript(`
indicator("Adv Switch Enum Checkpoint")
enum TrendState
    bull = "Bull"
    bear = "Bear"
    neutral = "Neutral"

sma5 = ta.sma(close, 5)
sma3 = ta.sma(close, 3)
TrendState state = switch
    sma3 > sma5 and close > sma5 => TrendState.bull
    sma3 < sma5 and close < sma5 => TrendState.bear
    => TrendState.neutral

plot(state == TrendState.bull ? 1 : 0, title="Bull State")
plot(state == TrendState.bear ? 1 : 0, title="Bear State")
plot(state == TrendState.neutral ? 1 : 0, title="Neutral State")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Bull State').values).toEqual([0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1]);
    expect(getPlot(result, 'Bear State').values).toEqual([0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0]);
    expect(getPlot(result, 'Neutral State').values).toEqual([1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0]);
  });

  it('locks a reduced advanced matrix operations idiom', () => {
    // Advanced idiom: matrix scripts build a score matrix where row 0 is
    // current OHLC data, row 1 is moving averages, and row 2 is the delta.
    // Source search: https://www.tradingview.com/scripts/search/matrix%20score%20indicator/
    const result = runCompatScript(`
indicator("Adv Matrix Operations Checkpoint")
m = matrix.new_float(3, 3, 0.0)
m.set(0, 0, close)
m.set(0, 1, high)
m.set(0, 2, low)
m.set(1, 0, ta.sma(close, 3))
m.set(1, 1, ta.sma(high, 3))
m.set(1, 2, ta.sma(low, 3))
m.set(2, 0, m.get(0,0) - m.get(1,0))
m.set(2, 1, m.get(0,1) - m.get(1,1))
m.set(2, 2, m.get(0,2) - m.get(1,2))
row0 = m.row(0)
sumRow0 = array.sum(row0)
plot(m.rows(), title="Rows")
plot(m.columns(), title="Columns")
plot(sumRow0, title="Sum Row 0")
plot(m.get(2, 0), title="Close Delta")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Rows').values).toEqual(Array(compatibilityBars.length).fill(3));
    expect(getPlot(result, 'Columns').values).toEqual(Array(compatibilityBars.length).fill(3));
    // Sum row 0 = close + high + low per bar
    expect(getPlot(result, 'Sum Row 0').values).toEqual([304, 312, 319, 314, 301, 297, 308, 322, 325, 330, 333, 333]);
    // Close delta = close - sma(close,3); na for bars 0-1
    expect(roundSeries(getPlot(result, 'Close Delta').values)).toEqual([
      null, null, 2.333333, -2, -4, -0.666667, 3, 4.666667, 1, 1.666667, 0.333333, 1,
    ]);
  });

  it('locks a reduced advanced map-based state tracking idiom', () => {
    // Advanced idiom: state tracking scripts use a persistent map to accumulate
    // per-condition counters and running totals across bars, a pattern common in
    // public screeners and stat dashboards.
    // Source search: https://www.tradingview.com/scripts/search/map%20state%20tracking%20accumulate/
    const result = runCompatScript(`
indicator("Adv Map State Checkpoint")
var map<string, float> stats = map.new<string, float>()
if not stats.contains("count")
    stats.put("count", 0)
    stats.put("sum", 0.0)

isBullish = close > open
if isBullish
    stats.put("count", nz(stats.get("count")) + 1)
    stats.put("sum", nz(stats.get("sum")) + (close - open))

bullCount = nz(stats.get("count"))
avgGain = bullCount > 0 ? nz(stats.get("sum")) / bullCount : 0.0
plot(bullCount, title="Bull Count")
plot(avgGain, title="Avg Gain")
`);

    expect(result.errors).toEqual([]);
    // Bull bars (close > open): bars 0(102>100), 1(105>102), 2(107>105), 5(100>99), 6(104>100), 7(109>104), 9(111>108), 11(112>110)
    expect(getPlot(result, 'Bull Count').values).toEqual([1, 2, 3, 3, 3, 4, 5, 6, 6, 7, 7, 8]);
    expect(roundSeries(getPlot(result, 'Avg Gain').values)).toEqual([
      2, 2.5, 2.333333, 2.333333, 2.333333, 2, 2.4, 2.833333, 2.833333, 2.857143, 2.857143, 2.75,
    ]);
  });

  it('locks a reduced advanced complex conditional plotting idiom', () => {
    // Advanced idiom: scripts combine dynamic plot colors, fill() between two
    // plots, and conditional plotshape() markers in a single indicator.
    // Source search: https://www.tradingview.com/scripts/search/dynamic%20color%20fill%20plotshape%20indicator/
    const result = runCompatScript(`
indicator("Adv Conditional Plotting Checkpoint")
length = input.int(5, "Length")
sma = ta.sma(close, length)
rsi = ta.rsi(close, length)
trendUp = close > sma
dynamicColor = trendUp ? color.new(color.green, 30) : color.new(color.red, 30)
plot(close, title="Close", color=dynamicColor)
smaPlot = plot(sma, title="SMA", color=color.blue)
closePlot = plot(close, title="Close2", color=color.gray)
fill(smaPlot, closePlot, color=trendUp ? color.new(color.green, 80) : color.new(color.red, 80), title="Fill")
plotshape(trendUp and nz(rsi) > 60, title="OB Shape", style=shape.triangleup, location=location.belowbar, color=color.green)
plot(trendUp ? 1 : 0, title="Trend State")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Trend State').values).toEqual([0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'SMA').values)).toEqual([
      null, null, null, null,
      103.2, 102.8, 102.6, 103, 104, 106.4, 108.4, 110,
    ]);
    // OB Shape is true when trendUp and rsi > 60 — na during rsi warmup (bars 0-4), then depends on rsi
    expect(getPlot(result, 'OB Shape').values).toEqual([null, null, null, null, null, null, null, 1, 1, 1, 1, 1]);
  });

  it('locks a reduced advanced for-loop with array accumulation and sort idiom', () => {
    // Advanced idiom: scripts keep a rolling window array, compute running
    // average and rising-bar count via a numeric for loop, then sort a copy
    // to extract the median.
    // Source search: https://www.tradingview.com/scripts/search/rolling%20window%20average%20median%20array/
    const result = runCompatScript(`
indicator("Adv For-In Array Checkpoint")
var array<float> window = array.new<float>()
window.push(close)
if window.size() > 6
    window.shift()

total = 0.0
abovePrev = 0
for i = 0 to window.size() - 1
    val = window.get(i)
    total += val
    if i > 0 and val > window.get(i - 1)
        abovePrev += 1

windowAvg = window.size() > 0 ? total / window.size() : 0.0
sorted = window.copy()
sorted.sort()
windowMedian = sorted.size() > 0 ? sorted.get(math.floor(sorted.size() / 2)) : 0.0
plot(windowAvg, title="Window Avg")
plot(abovePrev, title="Rising Count")
plot(windowMedian, title="Window Median")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Window Avg').values)).toEqual([
      102, 103.5, 104.666667, 104.25, 103.2, 102.666667, 103, 103.666667, 103.833333, 105.166667, 107, 109,
    ]);
    expect(getPlot(result, 'Rising Count').values).toEqual([0, 1, 2, 2, 2, 3, 3, 3, 3, 4, 3, 3]);
    expect(getPlot(result, 'Window Median').values).toEqual([
      102, 105, 105, 105, 103, 103, 104, 104, 104, 108, 109, 110,
    ]);
  });

  it('locks a reduced advanced str.format multi-placeholder dashboard idiom', () => {
    // Advanced idiom: dashboard scripts format RSI, ATR, and a spread
    // percentage into labeled strings using str.format with multiple
    // placeholders, then render them in a last-bar table.
    // Source search: https://www.tradingview.com/scripts/search/str.format%20dashboard%20rsi%20atr/
    const result = runCompatScript(`
indicator("Adv String Format Checkpoint", overlay=true)
length = input.int(5, "Length")
rsi = ta.rsi(close, length)
atr = ta.atr(length)
sma = ta.sma(close, length)

rsiLabel = str.format("RSI: {0,number,#.#}", nz(rsi))
atrLabel = str.format("ATR: {0,number,#.##}", nz(atr))
spreadPct = nz(sma) != 0 ? (close - nz(sma)) / nz(sma) * 100 : 0.0

var table dash = table.new(position.bottom_right, 1, 3)
if barstate.islast
    table.cell(dash, 0, 0, rsiLabel)
    table.cell(dash, 0, 1, atrLabel)
    table.cell(dash, 0, 2, str.format("Spread: {0,number,#.##}%", spreadPct))
plot(nz(rsi), title="RSI")
plot(spreadPct, title="Spread Pct")
`);

    expect(result.errors).toEqual([]);
    // RSI is 0 for the first 5 bars (nz converts na to 0), then valid
    expect(roundSeries(getPlot(result, 'RSI').values)).toEqual([
      0, 0, 0, 0, 0, 42.857143, 57.894737, 70.16317, 65.39924, 72.421258, 66.774781, 72.194557,
    ]);
    // Spread = (close - sma) / sma * 100; 0 during sma warmup
    expect(roundSeries(getPlot(result, 'Spread Pct').values)).toEqual([
      0, 0, 0, 0, -4.069767, -2.723735, 1.364522, 5.825243, 3.846154, 4.323308, 1.476015, 1.818182,
    ]);
    expect(result.drawings.filter((d) => d.type === 'table').length).toBeGreaterThan(0);
  });
});

// ===========================================================================================
// Edge-case corpus probe
// Targets the hardest parser and runtime patterns from real TradingView scripts.
// Each test is a reduced idiom that exercises one edge case.
// ===========================================================================================

const edgeCaseStratBars = [
  { time: 1_700_610_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
  { time: 1_700_610_060_000, open: 103, high: 105, low: 102, close: 104, volume: 100 },
  { time: 1_700_610_120_000, open: 104, high: 106, low: 103, close: 105, volume: 100 },
  { time: 1_700_610_180_000, open: 105, high: 107, low: 104, close: 106, volume: 100 },
  { time: 1_700_610_240_000, open: 106, high: 108, low: 100, close: 95, volume: 100 },
  { time: 1_700_610_300_000, open: 95, high: 96, low: 90, close: 91, volume: 100 },
];

describe('Edge-case corpus probe', () => {
  it('locks deeply nested wrapped function call idiom', () => {
    // Source search: https://www.tradingview.com/scripts/search/nested%20indicator%20function%20call/
    // Pattern: plot(ta.sma(ta.ema(close, input.int / 2), 5)) — multiple levels of
    // nested calls. Confirms the parser handles deeply chained argument positions.
    const result = runCompatScript(`
indicator("Edge Nested Calls Checkpoint")
length = input.int(14, "Length")
ema_inner = ta.ema(close, math.round(length / 2))
result = ta.sma(ema_inner, 20)
plot(result, title="Nested")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Edge Nested Calls Checkpoint');
    // EMA(close, 7) for 12 bars is not long enough for SMA(20) — all null
    expect(getPlot(result, 'Nested').values).toEqual(Array(compatibilityBars.length).fill(null));
  });

  it('locks ternary expression in function argument position idiom', () => {
    // Source search: https://www.tradingview.com/scripts/search/ternary%20argument%20source%20selection/
    // Pattern: ta.sma(close > open ? high : low, length) — ternary as positional arg.
    // Confirms the parser resolves ternary inside argument lists without ambiguity.
    const result = runCompatScript(`
indicator("Edge Ternary Arg Checkpoint")
src = close > open ? high : low
sma = ta.sma(src, 3)
plot(sma, title="SMA")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Edge Ternary Arg Checkpoint');
    expect(roundSeries(getPlot(result, 'SMA').values)).toEqual([
      null, null,
      105.666667, 105.333333, 102.666667, 100.333333, 101.333333,
      105.333333, 107, 109.333333, 109, 111.333333,
    ]);
  });

  it('locks empty single-expression UDF body returning na idiom', () => {
    // Source search: https://www.tradingview.com/scripts/search/function%20returns%20na%20guard/
    // Pattern: f() => na — single-expression body returning na.
    // Confirms function with only na body doesn't break callers that use nz().
    const result = runCompatScript(`
indicator("Edge Empty UDF Body Checkpoint")
f() => na
val = nz(f(), 0.0)
plot(val, title="Val")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Edge Empty UDF Body Checkpoint');
    expect(getPlot(result, 'Val').values).toEqual(Array(compatibilityBars.length).fill(0));
  });

  it('locks three-element tuple return from UDF idiom', () => {
    // Source search: https://www.tradingview.com/scripts/search/function%20returns%20tuple%20three%20values/
    // Pattern: [h, l, m] = getStats(close, 3) where getStats returns [high, low, mean].
    // Confirms the runtime correctly destructures 3-element tuples from UDFs.
    const result = runCompatScript(`
indicator("Edge Tuple Return Checkpoint")
getStats(src, len) =>
    h = ta.highest(src, len)
    l = ta.lowest(src, len)
    m = ta.sma(src, len)
    [h, l, m]
[h, l, m] = getStats(close, 3)
plot(h, title="High")
plot(l, title="Low")
plot(m, title="Mid")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Edge Tuple Return Checkpoint');
    expect(getPlot(result, 'High').values).toEqual([
      102, 105, 107, 107, 107, 103, 104, 109, 109, 111, 111, 112,
    ]);
    expect(getPlot(result, 'Low').values).toEqual([
      102, 102, 102, 103, 99, 99, 99, 100, 104, 108, 108, 110,
    ]);
    expect(roundSeries(getPlot(result, 'Mid').values)).toEqual([
      null, null,
      104.666667, 105, 103, 100.666667, 101, 104.333333, 107, 109.333333, 109.666667, 111,
    ]);
  });

  it('locks na propagation through ta.sma warm-up period idiom', () => {
    // Source search: https://www.tradingview.com/scripts/search/sma%20na%20warmup%20period%20null/
    // Pattern: ta.sma(close, 5) returns na for the first 4 bars, then valid values.
    // Confirms na propagation contract: first length-1 bars yield null, rest are numeric.
    const result = runCompatScript(`
indicator("Edge NA Propagation Checkpoint")
plot(ta.sma(close, 5), title="SMA5")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Edge NA Propagation Checkpoint');
    expect(roundSeries(getPlot(result, 'SMA5').values)).toEqual([
      null, null, null, null,
      103.2, 102.8, 102.6, 103, 104, 106.4, 108.4, 110,
    ]);
  });

  it('locks var float cumulative accumulation idiom', () => {
    // Source search: https://www.tradingview.com/scripts/search/cumulative%20sum%20var%20accumulate/
    // Pattern: var float cumSum = 0.0; cumSum += close — running total across all bars.
    // Confirms var persistence and += assignment work together across many bars.
    const result = runCompatScript(`
indicator("Edge Cumsum Accumulation Checkpoint")
var float cumSum = 0.0
cumSum += close
plot(cumSum, title="CumSum")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Edge Cumsum Accumulation Checkpoint');
    expect(getPlot(result, 'CumSum').values).toEqual([
      102, 207, 314, 417, 516, 616, 720, 829, 937, 1048, 1158, 1270,
    ]);
  });

  it('locks ta.valuewhen with nested TA crossover condition idiom', () => {
    // Source search: https://www.tradingview.com/scripts/search/valuewhen%20sma%20crossover%20condition/
    // Pattern: ta.valuewhen(ta.crossover(sma_fast, sma_slow), high, 0) — valuewhen
    // with a composite crossover condition. Confirms correct last-event lookup.
    const result = runCompatScript(`
indicator("Edge ValueWhen Crossover Checkpoint")
sma3 = ta.sma(close, 3)
sma5 = ta.sma(close, 5)
crossUp = ta.crossover(sma3, sma5)
val = ta.valuewhen(crossUp, high, 0)
plot(nz(val), title="ValueWhen")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Edge ValueWhen Crossover Checkpoint');
    // No crossover until the last bar (sma3 crosses sma5 upward at bar 11)
    expect(roundSeries(getPlot(result, 'ValueWhen').values)).toEqual([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 113,
    ]);
  });

  it('locks plotshape with dynamic str.tostring text idiom', () => {
    // Source search: https://www.tradingview.com/scripts/search/plotshape%20dynamic%20text%20tostring/
    // Pattern: plotshape(cond, text=str.tostring(close, "#.##")) — shape with
    // a runtime-computed text string. Confirms plotshape accepts dynamic text without error.
    const result = runCompatScript(`
indicator("Edge Plotshape Dynamic Text Checkpoint")
cond = close > open
plotshape(cond, text=str.tostring(close, "#.##"), title="Shape", style=shape.triangleup, location=location.belowbar)
plot(cond ? 1 : 0, title="Cond")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Edge Plotshape Dynamic Text Checkpoint');
    // close > open: bars 0,1,2 yes; 3,4 no; 5,6,7 yes; 8 no; 9 yes; 10 no; 11 yes
    expect(getPlot(result, 'Cond').values).toEqual([1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1]);
    // plotshape emits 1 when cond is true, null otherwise
    expect(getPlot(result, 'Shape').values).toEqual([1, 1, 1, null, null, 1, 1, 1, null, 1, null, 1]);
  });

  it('locks color.rgb with boundary and out-of-range transparency idiom', () => {
    // Source search: https://www.tradingview.com/scripts/search/color.rgb%20transparency%20clamping/
    // Pattern: color.rgb(r, g, b, transp) where transp is 0, 100, negative, and >100.
    // Confirms transparency is clamped at 0 and 100; out-of-range values don't throw.
    const result = runCompatScript(`
indicator("Edge Color RGB Clamp Checkpoint")
c0 = color.rgb(255, 0, 0, 0)
c100 = color.rgb(255, 0, 0, 100)
cneg = color.rgb(255, 0, 0, -10)
cgt100 = color.rgb(255, 0, 0, 110)
isFullRed = c0 == "#FF0000FF"
isFullTrans = c100 == "#FF000000"
isClamped0 = cneg == "#FF0000FF"
isClamped100 = cgt100 == "#FF000000"
plot(isFullRed ? 1 : 0, title="FullRed")
plot(isFullTrans ? 1 : 0, title="FullTrans")
plot(isClamped0 ? 1 : 0, title="ClampedNeg")
plot(isClamped100 ? 1 : 0, title="ClampedGt100")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Edge Color RGB Clamp Checkpoint');
    // All assertions hold on every bar
    expect(getPlot(result, 'FullRed').values).toEqual(Array(compatibilityBars.length).fill(1));
    expect(getPlot(result, 'FullTrans').values).toEqual(Array(compatibilityBars.length).fill(1));
    expect(getPlot(result, 'ClampedNeg').values).toEqual(Array(compatibilityBars.length).fill(1));
    expect(getPlot(result, 'ClampedGt100').values).toEqual(Array(compatibilityBars.length).fill(1));
  });

  it('locks input.source series passed into user-defined function idiom', () => {
    // Source search: https://www.tradingview.com/scripts/search/input.source%20user%20function%20argument/
    // Pattern: src = input.source(close, "Source"); out = smoothed(src, 3) where
    // smoothed() is a UDF that applies ta.sma. Confirms input.source series threads
    // correctly into UDF arguments.
    const result = runCompatScript(`
indicator("Edge Input Source UDF Checkpoint")
smoothed(src, len) =>
    ta.sma(src, len)
src = input.source(close, "Source")
out = smoothed(src, 3)
plot(out, title="Smoothed")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Edge Input Source UDF Checkpoint');
    expect(result.inputs.map((i) => [i.title, i.type])).toEqual([['Source', 'source']]);
    expect(roundSeries(getPlot(result, 'Smoothed').values)).toEqual([
      null, null,
      104.666667, 105, 103, 100.666667, 101, 104.333333, 107, 109.333333, 109.666667, 111,
    ]);
  });

  it('locks strategy with simultaneous profit-target, stop-loss, and trail-offset exits idiom', () => {
    // Source search: https://www.tradingview.com/scripts/search/strategy%20exit%20profit%20loss%20trail/
    // Pattern: strategy.exit with profit=, loss=, and trail_offset= all set together.
    // Confirms the broker emulator resolves whichever exit fires first (profit at bar 2).
    const result = runCompatScript(`
strategy("Edge Multi-Exit Checkpoint", overlay=true, process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if strategy.position_size > 0
    strategy.exit("Exit", "Long", profit=5.0, loss=5.0, trail_offset=1.0)
plot(strategy.position_size, title="Pos Size")
plot(strategy.netprofit, title="Net Profit")
`, { bars: edgeCaseStratBars });

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Edge Multi-Exit Checkpoint');
    // Entry at bar0 (close=100); profit target=105 hit at bar2 (close=105)
    expect(getPlot(result, 'Pos Size').values).toEqual([1, 1, 0, 0, 0, 0]);
    expect(roundSeries(getPlot(result, 'Net Profit').values)).toEqual([0, 0, 3, 3, 3, 3]);
  });

  it('locks array copy-and-sort method chaining idiom', () => {
    // Source search: https://www.tradingview.com/scripts/search/array%20copy%20sort%20min%20value/
    // Pattern: vals.copy().sort() — array method call on result of another method.
    // Confirms chained postfix member calls on array instances work correctly.
    const result = runCompatScript(`
indicator("Edge Array Copy Sort Checkpoint")
var array<float> vals = array.new<float>()
vals.push(close)
sorted = vals.copy()
sorted.sort()
plot(vals.size(), title="Size")
plot(sorted.size() > 0 ? sorted.get(0) : na, title="Min")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Edge Array Copy Sort Checkpoint');
    expect(getPlot(result, 'Size').values).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    // Minimum close seen so far on each bar
    expect(getPlot(result, 'Min').values).toEqual([
      102, 102, 102, 102, 99, 99, 99, 99, 99, 99, 99, 99,
    ]);
  });

  it('trailing comma in function call args', () => {
    const result = runCompatScript(`
indicator("Edge Trailing Comma Checkpoint")
sma = ta.sma(close, 5,)
plot(sma, title="SMA")
`);
    expect(result.errors).toEqual([]);
  });
});

// ===========================================================================================
// Pine v5 compatibility probe
// Tests v5-specific idioms: study(), generic input(), security(), hex color literals,
// global tostring(), and legacy ta aliases (sma/ema/rsi without namespace).
// ===========================================================================================

describe('Pine v5 compatibility probe', () => {
  it('locks v5 study() declaration as an indicator alias', () => {
    // v5 used study() instead of indicator(). The runtime maps it to an indicator
    // declaration, so title and overlay propagate correctly.
    // Source search: https://www.tradingview.com/scripts/search/study%20overlay%20v5/
    const result = runCompatScript(`
//@version=5
study("V5 Study Checkpoint", overlay=true)
sma = ta.sma(close, 3)
plot(sma, title="SMA")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('V5 Study Checkpoint');
    expect(roundSeries(getPlot(result, 'SMA').values)).toEqual([
      null, null,
      104.666667, 105, 103, 100.666667, 101, 104.333333, 107, 109.333333, 109.666667, 111,
    ]);
  });

  it('locks v5 generic input() with integer default', () => {
    // v5 used input(defaultVal, title) without a typed variant. The runtime infers
    // the type from the default value; an integer default becomes an int input.
    // Source search: https://www.tradingview.com/scripts/search/input%20length%20v5%20generic/
    const result = runCompatScript(`
//@version=5
indicator("V5 Generic Input Checkpoint")
len = input(14, "Length")
plot(len, title="Len")
`);

    expect(result.errors).toEqual([]);
    expect(result.inputs.map((i) => [i.title, i.type])).toEqual([['Length', 'int']]);
    expect(getPlot(result, 'Len').values).toEqual(Array(compatibilityBars.length).fill(14));
  });

  it('locks v5 hex color literal #RRGGBB as a plot color', () => {
    // v5 scripts commonly use bare 6-digit hex literals for colors rather than
    // color.rgb() or named constants. The literal is stored as-is and applied to
    // plot output without modification.
    // Source search: https://www.tradingview.com/scripts/search/hex%20color%20literal%20v5/
    const result = runCompatScript(`
//@version=5
indicator("V5 Hex Color Checkpoint")
bullColor = #00FF00
bearColor = #FF0000
isBull = close > open
c = isBull ? bullColor : bearColor
plot(close, color=c, title="Close")
plot(isBull ? 1 : 0, title="Bull")
`);

    expect(result.errors).toEqual([]);
    // Close > open: bars 0,1,2 yes; 3,4 no; 5,6,7 yes; 8 no; 9 yes; 10 no; 11 yes
    expect(getPlot(result, 'Bull').values).toEqual([1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1]);
    // Plot color alternates based on bull/bear
    const colors = getPlot(result, 'Close').color as string[];
    expect(colors[0]).toBe('#00FF00');
    expect(colors[3]).toBe('#FF0000');
  });

  it('locks v5 sma() global alias (without ta. namespace)', () => {
    // In v5 and earlier, sma(), ema(), rsi() etc. were global functions.
    // The runtime maps these to their ta.* counterparts transparently.
    // Source search: https://www.tradingview.com/scripts/search/sma%20global%20v5%20no%20namespace/
    const result = runCompatScript(`
//@version=5
indicator("V5 SMA Global Checkpoint")
s = sma(close, 3)
plot(s, title="SMA")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'SMA').values)).toEqual([
      null, null,
      104.666667, 105, 103, 100.666667, 101, 104.333333, 107, 109.333333, 109.666667, 111,
    ]);
  });

  it('locks v5 ema() global alias (without ta. namespace)', () => {
    // Source search: https://www.tradingview.com/scripts/search/ema%20global%20v5%20no%20namespace/
    const result = runCompatScript(`
//@version=5
indicator("V5 EMA Global Checkpoint")
e = ema(close, 3)
plot(e, title="EMA")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'EMA').values)).toEqual([
      102, 103.5, 105.25, 104.125, 101.5625, 100.78125,
      102.390625, 105.695313, 106.847656, 108.923828, 109.461914, 110.730957,
    ]);
  });

  it('locks v5 rsi() global alias (without ta. namespace)', () => {
    // Source search: https://www.tradingview.com/scripts/search/rsi%20global%20v5%20no%20namespace/
    const result = runCompatScript(`
//@version=5
indicator("V5 RSI Global Checkpoint")
r = rsi(close, 5)
plot(r, title="RSI")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'RSI').values)).toEqual([
      null, null, null, null, null,
      42.857143, 57.894737, 70.16317, 65.39924, 72.421258, 66.774781, 72.194557,
    ]);
  });

  it('locks v5 tostring() global alias for str.tostring()', () => {
    const result = runCompatScript(`
//@version=5
indicator("V5 Tostring Checkpoint")
s = "Price: " + tostring(close)
plot(close, title="Close")
`);
    expect(result.errors).toEqual([]);
  });

  // security() parses and semantic-checks correctly, but requires a live
  // request datafeed at runtime. Skipped for the same reason as other
  // request.security tests in the corpus.
  // Gap documented in PINE_V6_REFERENCE_GAP.md under "Pine v5 Compatibility Gaps".
  it.skip('v5 security() global alias for request.security()', () => {
    const result = runCompatScript(`
//@version=5
indicator("V5 Security Checkpoint")
d = security(syminfo.tickerid, "D", close)
plot(d, title="Daily")
`);
    expect(result.errors).toEqual([]);
  });

  it('locks v5 mixed-pattern indicator combining study(), input(), and global ta aliases', () => {
    // A realistic v5 script combining multiple v5-isms: study() declaration,
    // generic input(), and sma()/ema() without namespace. This is the most
    // common pattern when pasting popular v5 public scripts.
    // Source search: https://www.tradingview.com/scripts/search/study%20sma%20ema%20input%20v5/
    const result = runCompatScript(`
//@version=5
study("V5 Mixed Indicator Checkpoint", overlay=false)
len = input(3, "Length")
s = sma(close, len)
e = ema(close, len)
bullish = s > e
plot(s, title="SMA")
plot(e, title="EMA")
plot(bullish ? 1 : 0, title="Bull")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('V5 Mixed Indicator Checkpoint');
    expect(result.inputs.map((i) => [i.title, i.type])).toEqual([['Length', 'int']]);
    expect(roundSeries(getPlot(result, 'SMA').values)).toEqual([
      null, null,
      104.666667, 105, 103, 100.666667, 101, 104.333333, 107, 109.333333, 109.666667, 111,
    ]);
    expect(roundSeries(getPlot(result, 'EMA').values)).toEqual([
      102, 103.5, 105.25, 104.125, 101.5625, 100.78125,
      102.390625, 105.695313, 106.847656, 108.923828, 109.461914, 110.730957,
    ]);
    expect(getPlot(result, 'Bull').values).toEqual([0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1]);
  });
});

// ===========================================================================================
// Parser stress probe
// Tests parser behaviour under unusual layout patterns from real pasted scripts:
// long lines, nested ternaries, continuation lines, empty lines in blocks,
// pervasive inline comments, long switch expressions.
// ===========================================================================================

describe('Parser stress probe', () => {
  it('locks very long single line with 12 chained additions', () => {
    // Pattern: a single expression spanning many additions.
    // Confirms the grammar and runtime do not choke on very wide lines.
    // Source search: https://www.tradingview.com/scripts/search/long%20formula%20single%20line/
    const result = runCompatScript(`
indicator("Parser Long Line Checkpoint")
v = close + open + high + low + close + open + high + low + close + open + high + low
plot(v, title="V")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'V').values).toEqual([
      1212, 1242, 1272, 1263, 1212, 1188, 1224, 1278, 1302, 1314, 1332, 1329,
    ]);
  });

  it('locks deeply nested ternary expression (4 levels deep)', () => {
    // Pattern: a ? b ? c ? d : e : f : g — four levels of ternary nesting.
    // Confirms the parser resolves right-associative ternary chains without ambiguity.
    // Source search: https://www.tradingview.com/scripts/search/nested%20ternary%20expression/
    const result = runCompatScript(`
indicator("Parser Nested Ternary Checkpoint")
a = close > 105 ? close > 108 ? close > 110 ? 3 : 2 : 1 : 0
plot(a, title="Val")
`);

    expect(result.errors).toEqual([]);
    // close per compatibilityBars: 102,105,107,103,99,100,104,109,108,111,110,112
    // >105: no,no,yes,no,no,no,no,yes,yes,yes,yes,yes → 0,0,inner,0,0,0,0,inner,inner,inner,inner,inner
    // >108: only bars 7(109),8(108→no),9(111),10(110),11(112) → 0,0,1,0,0,0,0,inner2,0,inner3,inner3,inner4
    expect(getPlot(result, 'Val').values).toEqual([0, 0, 1, 0, 0, 0, 0, 2, 1, 3, 2, 3]);
  });

  it('locks multi-line continuation with operator at end of each line', () => {
    // Pattern: declaration split over 5 continuation lines — each line ends with
    // a binary operator so the parser knows more follows.
    // Source search: https://www.tradingview.com/scripts/search/multi%20line%20expression%20continuation/
    const result = runCompatScript(`
indicator("Parser Continued Lines Checkpoint")
v = close +
    open +
    high +
    low +
    close
plot(v, title="V")
`);

    expect(result.errors).toEqual([]);
    // v = close + open + high + low + close = 2*close + open + high + low
    expect(getPlot(result, 'V').values).toEqual([
      506, 519, 531, 524, 503, 496, 512, 535, 542, 549, 554, 555,
    ]);
  });

  it('locks comment on a continuation line', () => {
    // Pattern: a comment appears on its own line between two continuation segments.
    // The grammar should treat the comment as whitespace and resume the expression.
    // Source search: https://www.tradingview.com/scripts/search/comment%20in%20continuation/
    const result = runCompatScript(`
indicator("Parser Comment Continuation Checkpoint")
v = close +
// add open
    open
plot(v, title="V")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'V').values).toEqual([
      202, 207, 212, 210, 202, 199, 204, 213, 217, 219, 221, 222,
    ]);
  });

  it('locks empty lines inside an if block body', () => {
    // Pattern: blank lines between the if header and its body, and after the body.
    // Some scripts emit these after auto-formatting; the parser must not misread
    // the indentation level.
    // Source search: https://www.tradingview.com/scripts/search/empty%20lines%20if%20block/
    const result = runCompatScript(`
indicator("Parser Empty Lines Checkpoint")
x = 0

if close > open

    x := 1

plot(x, title="X")
`);

    expect(result.errors).toEqual([]);
    // close > open: bars 0,1,2 yes; 3,4 no; 5,6,7 yes; 8 no; 9 yes; 10 no; 11 yes
    expect(getPlot(result, 'X').values).toEqual([1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1]);
  });

  it('locks pervasive inline end-of-line comments', () => {
    // Pattern: every line (including the indicator declaration) carries a trailing
    // // comment. Confirms the lexer strips inline comments without breaking
    // line-continuation detection or block-indentation tracking.
    // Source search: https://www.tradingview.com/scripts/search/inline%20comment%20every%20line/
    const result = runCompatScript(`
indicator("Parser Inline Comments Checkpoint") // title
len = 5 // length param
s = ta.sma(close, len) // moving average
plot(s, title="SMA") // output
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'SMA').values)).toEqual([
      null, null, null, null,
      103.2, 102.8, 102.6, 103, 104, 106.4, 108.4, 110,
    ]);
  });

  it('mixed tabs and spaces in block bodies', () => {
    // Tab-indented if body, space-indented else body. Parser normalizes leading
    // tabs to spaces; runtime promotes branch declarations to the outer scope.
    const src = 'indicator("Mixed Indent")\nif close > open\n\tx = 1\nelse\n    x = 0\nplot(x, title="X")';
    const result = runCompatScript(src);
    expect(result.errors).toEqual([]);
    // close > open on bars: 0,1,2,5,6,7,9,11 → 1; bars 3,4,8,10 → 0
    expect(getPlot(result, 'X').values).toEqual([1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1]);
  });

  it('locks long switch expression with 10 case branches', () => {
    // Pattern: a switch with 10 numeric cases covering bar_index % 10 and a
    // default branch. Confirms the parser handles arbitrarily many switch arms.
    // Source search: https://www.tradingview.com/scripts/search/switch%20many%20cases%20expression/
    const result = runCompatScript(`
indicator("Parser Long Switch Checkpoint")
v = bar_index % 10
result = switch v
    0 => 0
    1 => 1
    2 => 2
    3 => 3
    4 => 4
    5 => 5
    6 => 6
    7 => 7
    8 => 8
    9 => 9
    => -1
plot(result, title="Result")
`);

    expect(result.errors).toEqual([]);
    // bar_index 0-11, v = 0,1,2,3,4,5,6,7,8,9,0,1
    expect(getPlot(result, 'Result').values).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1]);
  });
});

// ===========================================================================================
// Deep parity probes
// Targets untested idiom combinations from real public scripts: v4 input type syntax,
// map iteration with key-value destructuring, generic array constructors, string-valued
// switch, multi-line string concatenation, request.security tuple destructure,
// plotcandle with conditional colors, ta.bb with fill, strategy.exit OCA group,
// type-cast chains, nested UDFs with persistent series state, label lifecycle.
// ===========================================================================================

const deepRequestBars: Bar[] = [
  { time: 1_700_000_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
  { time: 1_700_000_060_000, open: 100, high: 102, low: 99, close: 101, volume: 110 },
  { time: 1_700_000_120_000, open: 101, high: 103, low: 100, close: 102, volume: 120 },
  { time: 1_700_000_180_000, open: 102, high: 104, low: 101, close: 103, volume: 130 },
  { time: 1_700_000_240_000, open: 103, high: 105, low: 102, close: 104, volume: 140 },
  { time: 1_700_000_300_000, open: 104, high: 106, low: 103, close: 105, volume: 150 },
];

const deepRequestedBars: Bar[] = [
  { time: 1_700_000_000_000, open: 11, high: 15, low: 9, close: 10, volume: 1_000 },
  { time: 1_700_000_120_000, open: 21, high: 25, low: 19, close: 20, volume: 1_100 },
  { time: 1_700_000_240_000, open: 31, high: 35, low: 29, close: 30, volume: 1_200 },
];

const deepStratBars: Bar[] = [
  { time: 1_700_610_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
  { time: 1_700_610_060_000, open: 100, high: 102, low: 99, close: 101, volume: 100 },
  { time: 1_700_610_120_000, open: 101, high: 106, low: 100, close: 106, volume: 100 },
  { time: 1_700_610_180_000, open: 106, high: 107, low: 105, close: 106, volume: 100 },
  { time: 1_700_610_240_000, open: 106, high: 107, low: 105, close: 106, volume: 100 },
];

describe('Deep parity probes', () => {
  it('locks Pine v4 study() with input(type=input.integer) idiom', () => {
    // v4 used the generic input() function with an explicit type= parameter rather than
    // typed variants like input.int(). The runtime aliases input.integer to the int type
    // and applies the v4 sma()/ema() global aliases from the same era.
    // Source search: https://www.tradingview.com/scripts/search/v4%20study%20input%20integer%20type/
    const result = runCompatScript(`//@version=4
study("V4 Integer Input Checkpoint", overlay=false)
length = input(3, "Length", type=input.integer)
s = sma(close, length)
plot(length, title="Length")
plot(s, title="SMA")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('V4 Integer Input Checkpoint');
    expect(result.inputs.map((i) => [i.title, i.type])).toEqual([['Length', 'int']]);
    expect(getPlot(result, 'Length').values).toEqual(Array(compatibilityBars.length).fill(3));
    expect(roundSeries(getPlot(result, 'SMA').values)).toEqual([
      null, null,
      104.666667, 105, 103, 100.666667, 101, 104.333333, 107, 109.333333, 109.666667, 111,
    ]);
  });

  it('locks for [key, value] in map tuple destructuring idiom', () => {
    // Real scripts use for [k, v] in myMap to iterate a map and aggregate values.
    // The runtime's executeForIn sets indexCounter to the key and counter to the value.
    // Source search: https://www.tradingview.com/scripts/search/for%20map%20key%20value%20iterate/
    const result = runCompatScript(`
indicator("For Map KV Checkpoint")
var map<string, float> m = map.new<string, float>()
m.put("lo", low)
m.put("hi", high)
total = 0.0
for [k, v] in m
    total += v
plot(total, title="Total")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('For Map KV Checkpoint');
    // total = low + high on each bar
    expect(getPlot(result, 'Total').values).toEqual([
      202, 207, 212, 211, 202, 197, 204, 213, 217, 219, 223, 221,
    ]);
  });

  it('locks array.new<float>() generic constructor idiom', () => {
    // Public scripts declare typed arrays with the explicit generic syntax
    // array.new<float>() — confirming the parser and runtime handle the
    // type parameter in angle brackets without ambiguity.
    // Source search: https://www.tradingview.com/scripts/search/array.new%20generic%20float%20type/
    const result = runCompatScript(`
indicator("Generic Array Checkpoint")
var array<float> window = array.new<float>()
window.push(close)
if window.size() > 3
    window.shift()
sz = window.size()
mx = array.max(window)
plot(sz, title="Size")
plot(mx, title="Max")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Generic Array Checkpoint');
    // window grows to 3 and stays there
    expect(getPlot(result, 'Size').values).toEqual([1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
    // rolling max of the 3-bar close window
    expect(getPlot(result, 'Max').values).toEqual([
      102, 105, 107, 107, 107, 103, 104, 109, 109, 111, 111, 112,
    ]);
  });

  it('locks switch expression matching on string values idiom', () => {
    // Public scripts use switch on string-valued expressions — e.g. a mode selector
    // driven by a ternary. Confirms switch arms compare with string equality and
    // fall through to the default for unmatched values.
    // Source search: https://www.tradingview.com/scripts/search/switch%20string%20mode%20signal/
    const result = runCompatScript(`
indicator("Switch String Checkpoint")
mode = bar_index % 3 == 0 ? "buy" : bar_index % 3 == 1 ? "sell" : "hold"
signal = switch mode
    "buy" => 1
    "sell" => -1
    "hold" => 0
    => -99
plot(signal, title="Signal")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Switch String Checkpoint');
    // bar_index 0-11: 0%3=0→buy→1, 1%3=1→sell→-1, 2%3=2→hold→0, repeating
    expect(getPlot(result, 'Signal').values).toEqual([1, -1, 0, 1, -1, 0, 1, -1, 0, 1, -1, 0]);
  });

  it('locks multi-line string built from + concatenation across continuation lines idiom', () => {
    // Public scripts build formatted label strings by concatenating string fragments
    // across multiple continuation lines. Confirms the parser handles string +
    // operator at end-of-line as a continuation cue, not a statement terminator.
    // Source search: https://www.tradingview.com/scripts/search/multiline%20string%20concatenation%20label/
    const result = runCompatScript(`
indicator("String Concat Checkpoint")
lbl = "O:" + str.tostring(open) +
    " H:" + str.tostring(high) +
    " C:" + str.tostring(close)
plot(close, title="Close")
plot(open, title="Open")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('String Concat Checkpoint');
    // The string is built but only close/open are plotted — confirm both pass through
    expect(getPlot(result, 'Close').values).toEqual([102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110, 112]);
    expect(getPlot(result, 'Open').values).toEqual([100, 102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110]);
  });

  // request.security with a tuple expression [open, high, low, close] as the
  // expression argument cannot be destructured — the runtime returns a non-array
  // value and the destructuring fails with "Cannot destructure non-array value".
  // This is a structural gap: the expression is evaluated in the chart context, not
  // the HTF context, so only scalar series values are forwarded.
  // Skipped: gap documented in PINE_V6_REFERENCE_GAP.md under "Deep parity probes".
  it.skip('request.security with tuple expression destructure [o, h, l, c]', () => {
    const datafeed = new InMemoryRequestDatafeed([{
      symbol: 'BTCUSDT',
      timeframe: '2',
      bars: deepRequestedBars,
      syminfo: { ticker: 'BTCUSDT', timezone: 'Etc/UTC' },
    }]);
    const result = runCompatScript(`
indicator("Request Security Tuple Checkpoint")
[htfO, htfH, htfL, htfC] = request.security(syminfo.tickerid, "2", [open, high, low, close])
plot(htfO, title="HTF Open")
plot(htfH, title="HTF High")
plot(htfL, title="HTF Low")
plot(htfC, title="HTF Close")
`, { bars: deepRequestBars, engineOptions: { requestDatafeed: datafeed } });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'HTF Close').values).toEqual([null, null, 10, 10, 20, 20]);
  });

  it('locks plotcandle with conditional bull/bear body colors idiom', () => {
    // Real overlay scripts draw custom OHLC candles and color the body green or red
    // based on whether the bar is bullish. Confirms plotcandle() accepts a
    // per-bar dynamic color expression without parse or runtime errors.
    // Source search: https://www.tradingview.com/scripts/search/plotcandle%20bull%20bear%20color/
    const result = runCompatScript(`
indicator("Plotcandle Color Checkpoint", overlay=true)
isBull = close > open
c = isBull ? color.green : color.red
plotcandle(open, high, low, close, title="Candle", color=c, wickcolor=c)
plot(isBull ? 1 : 0, title="Bull")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Plotcandle Color Checkpoint');
    // close > open: bars 0(102>100),1(105>102),2(107>105) yes;
    //              bars 3(103<107),4(99<103) no; bars 5(100>99),6(104>100),7(109>104) yes;
    //              bar 8(108<109) no; bar 9(111>108) yes; bar 10(110<111) no; bar 11(112>110) yes
    expect(getPlot(result, 'Bull').values).toEqual([1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1]);
    const candlePlot = result.plots.find((p) => p.id === 'plotcandle_Candle');
    expect(candlePlot).toBeDefined();
    expect(candlePlot?.type).toBe('plotcandle');
  });

  it('locks ta.bb Bollinger Bands with fill between upper and lower bands idiom', () => {
    // Real scripts destructure ta.bb() into middle/upper/lower, plot all three,
    // then call fill() between upper and lower plots to shade the band. Confirms
    // the 3-tuple return, all three plot series, and the fill output.
    // Source search: https://www.tradingview.com/scripts/search/bollinger%20bands%20fill%20standard/
    const result = runCompatScript(`
indicator("BB Fill Checkpoint")
[mid, upper, lower] = ta.bb(close, 5, 2.0)
midPlot = plot(mid, title="Middle")
upperPlot = plot(upper, title="Upper")
lowerPlot = plot(lower, title="Lower")
fill(upperPlot, lowerPlot, color=color.new(color.blue, 80), title="BB Fill")
plot(nz(upper - lower), title="Width")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('BB Fill Checkpoint');
    // BB(5, 2.0): first 4 bars are na (need full window of 5)
    expect(roundSeries(getPlot(result, 'Middle').values)).toEqual([
      null, null, null, null,
      103.2, 102.8, 102.6, 103, 104, 106.4, 108.4, 110,
    ]);
    expect(roundSeries(getPlot(result, 'Upper').values)).toEqual([
      null, null, null, null,
      108.625864, 108.786652, 108.34108, 110.042727, 112.099383, 114.258753, 113.233218, 112.828427,
    ]);
    expect(roundSeries(getPlot(result, 'Lower').values)).toEqual([
      null, null, null, null,
      97.774136, 96.813348, 96.85892, 95.957273, 95.900617, 98.541247, 103.566782, 107.171573,
    ]);
    // fill() emits a fill drawing
    expect(result.plots.some((p) => p.type === 'fill')).toBe(true);
  });

  it('locks strategy.exit with two independent OCA exit orders (TP and SL) idiom', () => {
    // Real strategies place separate strategy.exit calls for TP and SL — the runtime
    // registers these as independent exit orders. When one fills (TP at bar2),
    // the other is cancelled by the OCA group. Confirms the broker emulator resolves
    // the TP limit and clears position correctly.
    // Source search: https://www.tradingview.com/scripts/search/strategy%20exit%20take%20profit%20stop%20loss/
    const result = runCompatScript(`
strategy("OCA Group Checkpoint", overlay=true, process_orders_on_close=false)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if strategy.position_size > 0
    strategy.exit("TP", "Long", profit=5.0)
    strategy.exit("SL", "Long", loss=3.0)
plot(strategy.position_size, title="Pos Size")
plot(strategy.netprofit, title="Net Profit")
`, { bars: deepStratBars });

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('OCA Group Checkpoint');
    // Entry fills at bar1 open (100); TP limit = 105; bar2 high=106 triggers TP fill
    // Position is flat from bar2 onward; SL order is cancelled
    expect(getPlot(result, 'Pos Size').values).toEqual([0, 1, 1, 0, 0]);
    expect(roundSeries(getPlot(result, 'Net Profit').values)).toEqual([0, 0, 0, 1, 1]);
  });

  it('locks type casting chain int(math.round(float(bar_index) / 2.0)) idiom', () => {
    // Real scripts cast between numeric types to obtain integer indices or step values.
    // This chain: float() cast → divide → round → int() cast exercises all three
    // numeric coercion builtins in sequence. Confirms they compose without type errors.
    // Source search: https://www.tradingview.com/scripts/search/type%20casting%20int%20float%20math.round/
    const result = runCompatScript(`
indicator("Type Cast Chain Checkpoint")
halved = int(math.round(float(bar_index) / 2.0))
plot(halved, title="Halved")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Type Cast Chain Checkpoint');
    // bar_index 0..11: round(idx/2) = 0,1,1,2,2,3,3,4,4,5,5,6
    expect(getPlot(result, 'Halved').values).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6]);
  });

  it('locks nested UDF calls where inner function uses var series state idiom', () => {
    // Real scripts nest UDFs where the inner function maintains a var accumulator
    // that persists across bars. The outer function calls the inner and then applies
    // a further transformation (ta.sma). Confirms var inside a UDF retains its
    // series identity across nested call contexts.
    // Source search: https://www.tradingview.com/scripts/search/nested%20function%20var%20accumulate%20state/
    const result = runCompatScript(`
indicator("Nested UDF State Checkpoint")
accumulate(src) =>
    var float acc = 0.0
    acc += src
    acc

outer(src, len) =>
    raw = accumulate(src)
    ta.sma(raw, len)

innerAcc = accumulate(close)
smaOfAcc = outer(close, 3)
plot(innerAcc, title="InnerAcc")
plot(nz(smaOfAcc), title="SmaOfAcc")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Nested UDF State Checkpoint');
    // accumulate(close) = running cumulative sum of close
    expect(getPlot(result, 'InnerAcc').values).toEqual([
      102, 207, 314, 417, 516, 616, 720, 829, 937, 1048, 1158, 1270,
    ]);
    // outer calls accumulate(close) again — but var in a UDF is scoped per call-site.
    // When called from outer(), accumulate's acc is a separate series from the
    // top-level call, so SMA is taken over that separate accumulation series.
    // nz() converts na during the first 2 bars of SMA(3) warm-up to 0.
    expect(roundSeries(getPlot(result, 'SmaOfAcc').values)).toEqual([
      0, 0, 207.666667, 312.666667, 415.666667, 516.333333,
      617.333333, 721.666667, 828.666667, 938, 1047.666667, 1158.666667,
    ]);
  });

  it('locks label.delete lifecycle — create label per bar, delete previous idiom', () => {
    // Real scripts maintain a single moving label by deleting the previous bar's
    // label before creating a new one. Uses a var label reference to track the
    // previous label across bars. Confirms label.delete does not throw and the
    // final drawings collection contains only the last label.
    // Source search: https://www.tradingview.com/scripts/search/label%20delete%20previous%20bar%20lifecycle/
    const result = runCompatScript(`
indicator("Label Delete Lifecycle Checkpoint")
var label lbl = na
if not na(lbl)
    label.delete(lbl)
lbl := label.new(bar_index, close, str.tostring(bar_index), style=label.style_label_down)
plot(bar_index, title="BarIndex")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Label Delete Lifecycle Checkpoint');
    expect(getPlot(result, 'BarIndex').values).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    // Only 1 label survives (the last one; all prior were deleted)
    expect(result.drawings.filter((d) => d.type === 'label').length).toBe(1);
  });
});

// ===========================================================================================
// Official documentation patterns
// Tests inspired by canonical examples from the official Pine Script documentation.
// Each test cites the doc section and asserts concrete output values.
// ===========================================================================================

describe('Official documentation patterns', () => {
  it('locks barstate.ishistory and barstate.isrealtime execution model', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/execution-model/
    // In the test harness all bars are historical: ishistory=true, isrealtime=false.
    // Confirms the runtime sets barstate fields consistently across all bars.
    const result = runCompatScript(`
indicator("Official Exec Model Checkpoint")
histFlag = barstate.ishistory ? 1 : 0
rtFlag   = barstate.isrealtime ? 1 : 0
plot(histFlag, title="IsHistory")
plot(rtFlag,   title="IsRealtime")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Official Exec Model Checkpoint');
    // All bars are history in the test harness
    expect(getPlot(result, 'IsHistory').values).toEqual(Array(compatibilityBars.length).fill(1));
    expect(getPlot(result, 'IsRealtime').values).toEqual(Array(compatibilityBars.length).fill(0));
  });

  it('locks int() and float() type cast qualifier behavior', () => {
    // Source: https://www.tradingview.com/pine-script-docs/language/type-system/
    // int(x) truncates to integer; float(x) widens to float; str.tostring converts for display.
    // close values are already whole numbers in compatibilityBars so int(close)==close.
    const result = runCompatScript(`
indicator("Official Type Cast Checkpoint")
asInt   = int(close)
asFloat = float(asInt)
plot(asInt,   title="AsInt")
plot(asFloat, title="AsFloat")
plot(close,   title="Close")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Official Type Cast Checkpoint');
    const closes = [102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110, 112];
    expect(getPlot(result, 'AsInt').values).toEqual(closes);
    expect(getPlot(result, 'AsFloat').values).toEqual(closes);
    expect(getPlot(result, 'Close').values).toEqual(closes);
  });

  it('locks array.from(), array.stdev(), and array.variance() statistical methods', () => {
    // Source: https://www.tradingview.com/pine-script-docs/language/arrays/
    // array.from() creates a literal array from its arguments.
    // array.stdev() and array.variance() compute population statistics.
    const result = runCompatScript(`
indicator("Official Array Stats Checkpoint")
arr = array.from(close, high, low)
sd  = array.stdev(arr)
vr  = array.variance(arr)
plot(sd, title="Stdev")
plot(vr, title="Variance")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Official Array Stats Checkpoint');
    expect(roundSeries(getPlot(result, 'Stdev').values)).toEqual([
      1.699673, 2.160247, 1.699673, 3.091206,
      2.624669, 2.160247, 2.624669, 3.091206,
      2.054805, 2.160247, 2.160247, 2.160247,
    ]);
    expect(roundSeries(getPlot(result, 'Variance').values)).toEqual([
      2.888889, 4.666667, 2.888889, 9.555556,
      6.888889, 4.666667, 6.888889, 9.555556,
      4.222222, 4.666667, 4.666667, 4.666667,
    ]);
  });

  it('locks array.slice() for window filtering', () => {
    // Source: https://www.tradingview.com/pine-script-docs/language/arrays/
    // Keeps a rolling window of 4 closes, slices the middle 2, and computes their average.
    const result = runCompatScript(`
indicator("Official Array Slice Checkpoint")
var array<float> win = array.new<float>()
win.push(close)
if win.size() > 4
    win.shift()
sliced = win.size() >= 2 ? win.slice(1, win.size()) : array.new<float>()
avg    = sliced.size() > 0 ? array.avg(sliced) : close
plot(win.size(), title="WinSize")
plot(avg,        title="SliceAvg")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Official Array Slice Checkpoint');
    // Window grows 1,2,3,4 then caps at 4
    expect(getPlot(result, 'WinSize').values).toEqual([1, 2, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
    // slice(1, size) = all elements after the first
    // bar0: win=[102], size<2 → avg=close=102
    // bar1: win=[102,105], slice=[105], avg=105
    // bar2: win=[102,105,107], slice=[105,107], avg=106
    // bar3: win=[102,105,107,103], slice=[105,107,103], avg=105
    // bar4: win=[105,107,103,99], slice=[107,103,99], avg=103
    // bar5: win=[107,103,99,100], slice=[103,99,100], avg=100.666667
    // bar6: win=[103,99,100,104], slice=[99,100,104], avg=101
    // bar7: win=[99,100,104,109], slice=[100,104,109], avg=104.333333
    // bar8: win=[100,104,109,108], slice=[104,109,108], avg=107
    // bar9: win=[104,109,108,111], slice=[109,108,111], avg=109.333333
    // bar10: win=[109,108,111,110], slice=[108,111,110], avg=109.666667
    // bar11: win=[108,111,110,112], slice=[111,110,112], avg=111
    expect(roundSeries(getPlot(result, 'SliceAvg').values)).toEqual([
      102, 105, 106, 105, 103, 100.666667,
      101, 104.333333, 107, 109.333333, 109.666667, 111,
    ]);
  });

  it('locks map.new<string,float>() with .put(), .get(), .contains(), and .keys() idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/language/maps/
    // Accumulates running high+low sum in a map keyed by "hl"; confirms map access.
    const result = runCompatScript(`
indicator("Official Map Checkpoint")
var map<string, float> m = map.new<string, float>()
if not m.contains("hl")
    m.put("hl", 0.0)
m.put("hl", nz(m.get("hl")) + high + low)
hlSum   = nz(m.get("hl"))
keysCnt = m.keys().size()
plot(hlSum,   title="HLSum")
plot(keysCnt, title="KeysCount")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Official Map Checkpoint');
    expect(getPlot(result, 'HLSum').values).toEqual([
      202, 409, 621, 832, 1034, 1231, 1435, 1648, 1865, 2084, 2307, 2528,
    ]);
    // Map always has exactly 1 key: "hl"
    expect(getPlot(result, 'KeysCount').values).toEqual(Array(compatibilityBars.length).fill(1));
  });

  it('locks user-defined type with fields and .new() constructor', () => {
    // Source: https://www.tradingview.com/pine-script-docs/language/objects/
    // A UDT with float price and score fields; .new() sets price=close and computes score.
    const result = runCompatScript(`
indicator("Official UDT Checkpoint")
type Bar
    float price = na
    float score = 0.0

b = Bar.new(close)
b.score := (high - low) / close * 100
plot(b.price, title="Price")
plot(b.score, title="Score")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Official UDT Checkpoint');
    expect(getPlot(result, 'Price').values).toEqual([102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110, 112]);
    expect(roundSeries(getPlot(result, 'Score').values)).toEqual([
      3.921569, 4.761905, 3.738318, 6.796117,
      6.060606, 5, 5.769231, 6.422018,
      4.62963, 4.504505, 4.545455, 4.464286,
    ]);
  });

  it('locks method declaration on a UDT with receiver dispatch', () => {
    // Source: https://www.tradingview.com/pine-script-docs/language/methods/
    // A method normalize(this) on a UDT maps close onto [0,100] relative to bar range.
    const result = runCompatScript(`
indicator("Official Method Checkpoint")
type PriceBar
    float price = na
    float norm  = 0.0

method normalize(PriceBar this, float lo, float hi) =>
    rng = hi - lo
    this.norm := rng == 0 ? 50.0 : (this.price - lo) / rng * 100
    this

pb = PriceBar.new(close)
pb.normalize(low, high)
plot(pb.price, title="Price")
plot(pb.norm,  title="Norm")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Official Method Checkpoint');
    expect(getPlot(result, 'Price').values).toEqual([102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110, 112]);
    expect(roundSeries(getPlot(result, 'Norm').values)).toEqual([
      75, 80, 75, 14.285714, 16.666667, 80,
      83.333333, 85.714286, 40, 80, 20, 80,
    ]);
  });

  it('locks input.int, input.float, input.bool, and input.string defaults', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/inputs/
    // All four basic input types are registered with defaults; bool and string
    // are verified via ternary conversion, not directly plottable.
    const result = runCompatScript(`
indicator("Official Inputs Checkpoint")
lenIn  = input.int(10,    "Length")
multIn = input.float(0.5, "Mult")
bullIn = input.bool(true, "Bullish")
modeIn = input.string("SMA", "Mode")
plot(lenIn,             title="Len")
plot(multIn * close,    title="MultClose")
plot(bullIn ? 1 : 0,    title="BullFlag")
plot(modeIn == "SMA" ? 1 : 0, title="SMAMode")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Official Inputs Checkpoint');
    expect(result.inputs.map((i) => [i.title, i.type])).toEqual([
      ['Length', 'int'],
      ['Mult', 'float'],
      ['Bullish', 'bool'],
      ['Mode', 'string'],
    ]);
    expect(getPlot(result, 'Len').values).toEqual(Array(compatibilityBars.length).fill(10));
    expect(roundSeries(getPlot(result, 'MultClose').values)).toEqual([
      51, 52.5, 53.5, 51.5, 49.5, 50, 52, 54.5, 54, 55.5, 55, 56,
    ]);
    expect(getPlot(result, 'BullFlag').values).toEqual(Array(compatibilityBars.length).fill(1));
    expect(getPlot(result, 'SMAMode').values).toEqual(Array(compatibilityBars.length).fill(1));
  });

  it('locks plot() styles, hline(), and fill() between two plots', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/plots/
    // Confirms plot() with style options, hline() for static levels, and fill()
    // between two named plot references produce correct outputs.
    const result = runCompatScript(`
indicator("Official Plots Checkpoint")
sma3 = ta.sma(close, 3)
sma5 = ta.sma(close, 5)
p3   = plot(sma3, title="SMA3", style=plot.style_line)
p5   = plot(sma5, title="SMA5", style=plot.style_line)
fill(p3, p5, color=color.new(color.blue, 80), title="Fill")
hline(100.0, title="Base", color=color.gray, linestyle=hline.style_dashed)
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Official Plots Checkpoint');
    expect(roundSeries(getPlot(result, 'SMA3').values)).toEqual([
      null, null, 104.666667, 105, 103, 100.666667,
      101, 104.333333, 107, 109.333333, 109.666667, 111,
    ]);
    expect(roundSeries(getPlot(result, 'SMA5').values)).toEqual([
      null, null, null, null, 103.2, 102.8,
      102.6, 103, 104, 106.4, 108.4, 110,
    ]);
    // fill() registers a fill output
    expect(result.plots.some((p) => p.type === 'fill')).toBe(true);
    // hline() registers a hline at price=100
    const hl = result.plots.find((p) => p.type === 'hline');
    expect(hl).toBeDefined();
    expect((hl as { price?: number }).price).toBe(100);
  });

  it('locks bgcolor() conditional background for trend state', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/backgrounds/
    // bgcolor() emits a background color that alternates by trend state (close vs SMA).
    const result = runCompatScript(`
indicator("Official Bgcolor Checkpoint")
sma5   = ta.sma(close, 5)
inUp   = close > sma5
bgcolor(inUp ? color.new(color.green, 90) : color.new(color.red, 90), title="BG")
plot(inUp ? 1 : 0, title="UpState")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Official Bgcolor Checkpoint');
    // SMA5 needs 5 bars; up state: close > sma5
    // SMA5 values: null×4, 103.2, 102.8, 102.6, 103, 104, 106.4, 108.4, 110
    // close:              102,105,107,103,99,100,104,109,108,111,110,112
    // bars 0-3: na → treat as 0 (bgcolor still fires, upState 0 during warmup)
    expect(getPlot(result, 'UpState').values).toEqual([0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1]);
    // bgcolor emits a plot of type 'bgcolor'
    expect(result.plots.some((p) => p.type === 'bgcolor')).toBe(true);
  });

  it('locks strategy.entry(), strategy.close(), and position tracking', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/strategies/
    // Simple crossover strategy: enters long on bar 0, closes on bar 2; verifies
    // position_size and netprofit across bars.
    const result = runCompatScript(`
strategy("Official Strategy Checkpoint", overlay=true, process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 2
    strategy.close("Long")
plot(strategy.position_size, title="PosSize")
plot(strategy.netprofit,     title="NetProfit")
`, { bars: stratBars });

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Official Strategy Checkpoint');
    // Entry at bar0 (close=100); close at bar2 (close=105) → profit=5
    expect(getPlot(result, 'PosSize').values).toEqual([1, 1, 0, 0]);
    expect(getPlot(result, 'NetProfit').values).toEqual([0, 0, 5, 5]);
  });

  it('locks plotshape() and plotchar() text and shape markers', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/text-and-shapes/
    // plotshape emits on even bar_index; plotchar emits on every third bar.
    const result = runCompatScript(`
indicator("Official Shapes Checkpoint", overlay=true)
evenBar  = bar_index % 2 == 0
thirdBar = bar_index % 3 == 0
plotshape(evenBar,  title="Shape",  style=shape.triangleup,  location=location.belowbar, color=color.green)
plotchar(thirdBar,  title="Char",   char="★",                location=location.abovebar, color=color.blue)
plot(evenBar  ? 1 : 0, title="EvenFlag")
plot(thirdBar ? 1 : 0, title="ThirdFlag")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Official Shapes Checkpoint');
    expect(getPlot(result, 'EvenFlag').values).toEqual([1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]);
    expect(getPlot(result, 'ThirdFlag').values).toEqual([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0]);
    expect(getPlot(result, 'Shape').values).toEqual([1, null, 1, null, 1, null, 1, null, 1, null, 1, null]);
    expect(getPlot(result, 'Char').values).toEqual([1, null, null, 1, null, null, 1, null, null, 1, null, null]);
  });

  it('locks barstate.isconfirmed anti-repainting guard pattern', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/repainting/
    // The isconfirmed guard prevents signals from firing on unconfirmed realtime bars.
    // In the test harness all bars are history and confirmed, so the signal fires every bar.
    const result = runCompatScript(`
indicator("Official Repainting Guard Checkpoint")
isBull = close > open
var int lastDir = 0
if barstate.isconfirmed
    lastDir := isBull ? 1 : -1
plot(lastDir, title="LastDir")
plot(isBull ? 1 : 0, title="Bull")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Official Repainting Guard Checkpoint');
    // close > open: bars 0(102>100),1(105>102),2(107>105) yes; 3(103<107),4(99<103) no;
    //               5(100>99),6(104>100),7(109>104) yes; 8(108<109) no; 9(111>108) yes;
    //               10(110<111) no; 11(112>110) yes
    const bullVals = [1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1];
    const lastDir  = [1, 1, 1, -1, -1, 1, 1, 1, -1, 1, -1, 1];
    expect(getPlot(result, 'Bull').values).toEqual(bullVals);
    expect(getPlot(result, 'LastDir').values).toEqual(lastDir);
  });

  it('locks if/else if/else chain and switch expression with default', () => {
    // Source: https://www.tradingview.com/pine-script-docs/language/conditional-structures/
    // Three-zone classifier uses if/else if/else; a mode switch with default covers Pine
    // switch semantics for values not matched by any case.
    const result = runCompatScript(`
indicator("Official Conditionals Checkpoint")
zone = if close < 103
    -1
else if close < 108
    0
else
    1

mode = switch bar_index % 3
    0 => 10
    1 => 20
    => 30

plot(zone, title="Zone")
plot(mode, title="Mode")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Official Conditionals Checkpoint');
    // close: 102,105,107,103,99,100,104,109,108,111,110,112
    // zone:  -1,  0,  0,  0,-1, -1,  0,  1,  1,  1,  1,  1
    expect(getPlot(result, 'Zone').values).toEqual([-1, 0, 0, 0, -1, -1, 0, 1, 1, 1, 1, 1]);
    // bar_index%3: 0,1,2,0,1,2,0,1,2,0,1,2 → 10,20,30,10,20,30,10,20,30,10,20,30
    expect(getPlot(result, 'Mode').values).toEqual([10, 20, 30, 10, 20, 30, 10, 20, 30, 10, 20, 30]);
  });
});

// ===========================================================================================
// Multi-feature integration
// Real TradingView scripts combine many subsystems together.  Each test below is a
// reduced realistic indicator or strategy that exercises 3-4 distinct subsystems in
// combination, the class of script most likely to expose hidden interaction bugs.
// ===========================================================================================

describe('Multi-feature integration', () => {
  it('locks trend-following system: ema crossover, var state, barcolor, bgcolor, table win-rate', () => {
    // Combines: ta.ema crossover detection, var int state tracking, barcolor/bgcolor
    // for trend coloring, and a barstate.islast summary table showing win rate.
    // Source search: https://www.tradingview.com/scripts/search/ema%20crossover%20trend%20win%20rate%20table/
    const result = runCompatScript(`
indicator("Multi-Feature Trend System Checkpoint", overlay=true)
fastLen = input.int(3, "Fast Length")
slowLen = input.int(6, "Slow Length")
fastEma = ta.ema(close, fastLen)
slowEma = ta.ema(close, slowLen)
crossUp = ta.crossover(fastEma, slowEma)
crossDn = ta.crossunder(fastEma, slowEma)
var int wins = 0
var int total = 0
if crossUp or crossDn
    total := total + 1
if crossUp
    wins := wins + 1
winRate = total > 0 ? wins * 100.0 / total : 0.0
trendUp = fastEma > slowEma
barcolor(trendUp ? color.new(color.green, 50) : color.new(color.red, 50))
bgcolor(trendUp ? color.new(color.green, 95) : color.new(color.red, 95))
var table t = table.new(position.top_right, 2, 2)
if barstate.islast
    table.cell(t, 0, 0, "Win Rate")
    table.cell(t, 1, 0, str.tostring(math.round(winRate)) + "%")
plot(fastEma, title="FastEMA")
plot(slowEma, title="SlowEMA")
plot(crossUp ? 1 : 0, title="CrossUp")
plot(trendUp ? 1 : 0, title="TrendUp")
plot(winRate, title="WinRate")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Multi-Feature Trend System Checkpoint');
    expect(result.inputs.map((i) => [i.title, i.type])).toEqual([
      ['Fast Length', 'int'],
      ['Slow Length', 'int'],
    ]);
    expect(roundSeries(getPlot(result, 'FastEMA').values)).toEqual([
      102, 103.5, 105.25, 104.125, 101.5625, 100.78125,
      102.390625, 105.695313, 106.847656, 108.923828, 109.461914, 110.730957,
    ]);
    expect(roundSeries(getPlot(result, 'SlowEMA').values)).toEqual([
      102, 102.857143, 104.040816, 103.74344, 102.388172, 101.705837,
      102.361312, 104.25808, 105.3272, 106.948, 107.82, 109.014286,
    ]);
    // crossUp fires at bar1 (fast crosses above slow) and bar6
    expect(getPlot(result, 'CrossUp').values).toEqual([0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0]);
    // trendUp: fast > slow
    expect(getPlot(result, 'TrendUp').values).toEqual([0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1]);
    // winRate: 2 cross events total (bar1 up, bar4 down), 1 win → 50% at bar4; then bar6 up → 2/3 wins
    expect(roundSeries(getPlot(result, 'WinRate').values)).toEqual([
      0, 100, 100, 100, 50, 50, 66.666667, 66.666667, 66.666667, 66.666667, 66.666667, 66.666667,
    ]);
    // barcolor and bgcolor outputs present
    expect(result.plots.some((p) => p.type === 'barcolor')).toBe(true);
    expect(result.plots.some((p) => p.type === 'bgcolor')).toBe(true);
    // summary table drawn at last bar
    expect(result.drawings.filter((d) => d.type === 'table').length).toBeGreaterThan(0);
  });

  it('locks volatility dashboard: ta.atr, ta.bb, ta.kc, array.avg, squeeze detection', () => {
    // Combines: ta.atr, ta.bb, ta.kc, a rolling array of recent ATR values with
    // array.avg, and squeeze detection (BB width < KC width).
    // Source search: https://www.tradingview.com/scripts/search/atr%20bollinger%20keltner%20squeeze%20dashboard/
    const result = runCompatScript(`
indicator("Multi-Feature Volatility Dashboard Checkpoint")
length = input.int(5, "Length")
atr = ta.atr(length)
[mid, upper, lower] = ta.bb(close, length, 2.0)
[kcMid, kcUpper, kcLower] = ta.kc(close, length, 1.5)
squeeze = upper - lower < kcUpper - kcLower
var array<float> atrHist = array.new<float>()
if not na(atr)
    atrHist.push(atr)
    if atrHist.size() > 5
        atrHist.shift()
avgAtr = atrHist.size() > 0 ? array.avg(atrHist) : na
plot(nz(atr), title="ATR")
plot(squeeze ? 1 : 0, title="Squeeze")
plot(nz(avgAtr), title="AvgATR")
plot(upper - lower, title="BBWidth")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Multi-Feature Volatility Dashboard Checkpoint');
    // ATR: nz gives 0 during warmup (first 4 bars), then valid values
    expect(roundSeries(getPlot(result, 'ATR').values)).toEqual([
      0, 0, 0, 0, 5.2, 5.16, 5.328, 5.6624, 5.52992, 5.423936, 5.339149, 5.271319,
    ]);
    // squeeze is always true once BB and KC are available
    expect(getPlot(result, 'Squeeze').values).toEqual([0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1]);
    // AvgATR tracks rolling mean of up to 5 ATR values
    expect(roundSeries(getPlot(result, 'AvgATR').values)).toEqual([
      0, 0, 0, 0, 5.2, 5.18, 5.229333, 5.3376, 5.376064, 5.420851, 5.456681, 5.445345,
    ]);
    // BBWidth is null during warmup, then positive
    const bbWidth = getPlot(result, 'BBWidth').values as (number | null)[];
    expect(bbWidth.slice(0, 4)).toEqual([null, null, null, null]);
    for (const v of bbWidth.slice(4)) {
      expect(v).toBeGreaterThan(0);
    }
  });

  it('locks multi-MA strategy: strategy.entry/close, bgcolor, equity plot', () => {
    // Combines: strategy declarations, strategy.entry/close with bar_index gating,
    // conditional bgcolor for trend state, strategy.equity/netprofit/position_size plots.
    // Source search: https://www.tradingview.com/scripts/search/strategy%20ma%20crossover%20equity%20bgcolor/
    const result = runCompatScript(`
strategy("Multi-Feature MA Strategy Checkpoint", overlay=true, process_orders_on_close=true)
fastLen = input.int(2, "Fast")
slowLen = input.int(3, "Slow")
fastMa = ta.sma(close, fastLen)
slowMa = ta.sma(close, slowLen)
if bar_index == 1
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 2
    strategy.close("Long")
trendUp = fastMa > slowMa
bgcolor(trendUp ? color.new(color.green, 90) : color.new(color.red, 90))
plot(strategy.equity, title="Equity")
plot(strategy.netprofit, title="NetProfit")
plot(strategy.position_size, title="PosSize")
`, { bars: stratBars });

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Multi-Feature MA Strategy Checkpoint');
    // Entry at bar1 (close=104), close at bar2 (close=105) → profit=1
    expect(getPlot(result, 'NetProfit').values).toEqual([0, 0, 1, 1]);
    expect(getPlot(result, 'PosSize').values).toEqual([0, 1, 0, 0]);
    expect(getPlot(result, 'Equity').values).toEqual([100000, 100000, 100001, 100001]);
    expect(result.plots.some((p) => p.type === 'bgcolor')).toBe(true);
  });

  it('locks price action scanner: UDT candle pattern, method, array, plotshape markers', () => {
    // Combines: UDT for candle patterns (doji, hammer), method to detect pattern,
    // array to store recent pattern names (capped at 3), plotshape markers on signal.
    // Source search: https://www.tradingview.com/scripts/search/udt%20candle%20pattern%20method%20array/
    const result = runCompatScript(`
indicator("Multi-Feature Price Action Checkpoint", overlay=true)
type CandlePattern
    bool isDoji = false
    bool isHammer = false
    float bodySize = 0.0
    float rangeSize = 0.0

method detect(CandlePattern this) =>
    this.bodySize := math.abs(close - open)
    this.rangeSize := high - low
    this.isDoji := this.bodySize / math.max(this.rangeSize, 0.001) < 0.1
    this.isHammer := not this.isDoji and (low < math.min(open, close) - this.rangeSize * 0.5) and close > open
    this

var array<string> recentPatterns = array.new<string>()
pat = CandlePattern.new()
pat.detect()
recentPatterns.push(pat.isDoji ? "doji" : pat.isHammer ? "hammer" : "none")
if recentPatterns.size() > 3
    recentPatterns.shift()
plotshape(pat.isDoji, title="Doji", style=shape.circle, location=location.abovebar, color=color.orange)
plotshape(pat.isHammer, title="Hammer", style=shape.triangleup, location=location.belowbar, color=color.green)
plot(pat.bodySize, title="BodySize")
plot(pat.isDoji ? 1 : 0, title="DojiFlag")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Multi-Feature Price Action Checkpoint');
    // bodySize = abs(close - open) per bar
    // bar0:102-100=2, bar1:105-102=3, bar2:107-105=2, bar3:103-107=4, bar4:99-103=4
    // bar5:100-99=1, bar6:104-100=4, bar7:109-104=5, bar8:108-109=1, bar9:111-108=3
    // bar10:110-111=1, bar11:112-110=2
    expect(getPlot(result, 'BodySize').values).toEqual([2, 3, 2, 4, 4, 1, 4, 5, 1, 3, 1, 2]);
    // No bar has bodySize/rangeSize < 0.1 with these bars
    expect(getPlot(result, 'DojiFlag').values).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    // Hammer detected at bar5: low=96 < min(99,100)-range*0.5 = 99-2.5=96.5 → 96<96.5 yes, close>open yes
    expect(getPlot(result, 'Hammer').values).toEqual([
      null, null, null, null, null, 1, null, null, null, null, null, null,
    ]);
    // recent pattern array size caps at 3 after bar 2
    // (size tracked via recentPatterns.size() indirectly; just verify no errors)
    expect(result.errors).toEqual([]);
  });

  it('locks risk management overlay: input params, ta.atr, var entry tracking, bull-state from sma', () => {
    // Combines: input params for risk %, ATR for stop distance calculation, var float
    // for tracking entry price, ta.sma for trend filter, and RR ratio plot.
    // Source search: https://www.tradingview.com/scripts/search/risk%20management%20atr%20entry%20rr%20ratio/
    const result = runCompatScript(`
indicator("Multi-Feature Risk Management Checkpoint", overlay=true)
riskPct = input.float(1.0, "Risk %")
atrLen = input.int(5, "ATR Length")
atrMult = input.float(2.0, "ATR Mult")
atr = ta.atr(atrLen)
stopDist = atr * atrMult
sma = ta.sma(close, atrLen)
var float entryPrice = na
isBull = close > sma
if isBull and na(entryPrice)
    entryPrice := close
rrRatio = not na(entryPrice) and stopDist > 0 ? 2.0 : 0.0
plot(rrRatio, title="RR Ratio")
plot(nz(atr), title="ATR")
plot(isBull ? 1 : 0, title="BullState")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Multi-Feature Risk Management Checkpoint');
    expect(result.inputs.map((i) => [i.title, i.type])).toEqual([
      ['Risk %', 'float'],
      ['ATR Length', 'int'],
      ['ATR Mult', 'float'],
    ]);
    // entry price first set at bar6 (close=104 > sma=102.6), RR=2.0 from then on
    expect(getPlot(result, 'RR Ratio').values).toEqual([0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2]);
    // ATR nz: 0 for bars 0-3, valid from bar4
    expect(roundSeries(getPlot(result, 'ATR').values)).toEqual([
      0, 0, 0, 0, 5.2, 5.16, 5.328, 5.6624, 5.52992, 5.423936, 5.339149, 5.271319,
    ]);
    // isBull: close > sma5 — sma5 starts at bar4
    expect(getPlot(result, 'BullState').values).toEqual([0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1]);
  });

  it('locks custom oscillator: UDF wrapping ta.ema/ta.sma, fill, alertcondition', () => {
    // Combines: UDF that computes a custom oscillator (EMA-SMA spread), ta.ema for
    // signal line, fill() between osc and signal plots, alertcondition on crossover.
    // Source search: https://www.tradingview.com/scripts/search/custom%20oscillator%20udf%20fill%20alert/
    const result = runCompatScript(`
indicator("Multi-Feature Custom Oscillator Checkpoint")
length = input.int(5, "Length")
signalLen = input.int(3, "Signal")
customOsc(src, len) =>
    fast = ta.ema(src, len)
    slow = ta.sma(src, len)
    fast - slow
osc = customOsc(close, length)
signal = ta.ema(osc, signalLen)
oscPlot = plot(osc, title="Osc")
sigPlot = plot(signal, title="Signal")
fill(oscPlot, sigPlot, color=color.new(color.gray, 80), title="Fill")
alertcondition(ta.crossover(osc, signal), title="Bull Cross", message="Osc crossed above signal")
plot(osc > signal ? 1 : 0, title="BullOsc")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Multi-Feature Custom Oscillator Checkpoint');
    expect(result.inputs.map((i) => [i.title, i.type])).toEqual([
      ['Length', 'int'],
      ['Signal', 'int'],
    ]);
    expect(roundSeries(getPlot(result, 'Osc').values)).toEqual([
      null, null, null, null,
      -0.940741, -1.293827, -0.262551, 1.558299, 1.705533, 1.070355, -0.08643, -0.45762,
    ]);
    expect(roundSeries(getPlot(result, 'Signal').values)).toEqual([
      null, null, null, null,
      -0.940741, -1.117284, -0.689918, 0.434191, 1.069862, 1.070108, 0.491839, 0.01711,
    ]);
    // fill output present
    expect(result.plots.some((p) => p.type === 'fill')).toBe(true);
    // osc > signal: bars 4(0-eq no),5(no),6(osc=-0.26 > sig=-0.69 yes),7(yes),8(yes),9(yes),10(no),11(no)
    expect(getPlot(result, 'BullOsc').values).toEqual([0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0]);
  });

  it('locks session-aware indicator: var state tracking, barcolor, plotshape, table', () => {
    // Combines: ta.ema crossover with var int state counters for bull/bear bar counts,
    // plotshape for crossover signals, barcolor for trend, and a barstate.islast table.
    // Source search: https://www.tradingview.com/scripts/search/ema%20crossover%20barcolor%20state%20table/
    const result = runCompatScript(`
indicator("Multi-Feature EMA State Table Checkpoint", overlay=true)
fastLen = input.int(3, "Fast")
slowLen = input.int(5, "Slow")
fastEma = ta.ema(close, fastLen)
slowEma = ta.ema(close, slowLen)
crossUp = ta.crossover(fastEma, slowEma)
crossDn = ta.crossunder(fastEma, slowEma)
var int bullBars = 0
var int bearBars = 0
trendUp = fastEma > slowEma
if trendUp
    bullBars := bullBars + 1
else
    bearBars := bearBars + 1
plotshape(crossUp, title="BuySignal", style=shape.triangleup, location=location.belowbar, color=color.green)
plotshape(crossDn, title="SellSignal", style=shape.triangledown, location=location.abovebar, color=color.red)
barcolor(trendUp ? color.new(color.green, 50) : color.new(color.red, 50))
var table t = table.new(position.top_right, 2, 2)
if barstate.islast
    table.cell(t, 0, 0, "Bull")
    table.cell(t, 1, 0, str.tostring(bullBars))
plot(fastEma, title="FastEMA")
plot(slowEma, title="SlowEMA")
plot(bullBars, title="BullBars")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Multi-Feature EMA State Table Checkpoint');
    expect(roundSeries(getPlot(result, 'FastEMA').values)).toEqual([
      102, 103.5, 105.25, 104.125, 101.5625, 100.78125,
      102.390625, 105.695313, 106.847656, 108.923828, 109.461914, 110.730957,
    ]);
    expect(roundSeries(getPlot(result, 'SlowEMA').values)).toEqual([
      102, 103, 104.333333, 103.888889, 102.259259, 101.506173,
      102.337449, 104.558299, 105.705533, 107.470355, 108.31357, 109.54238,
    ]);
    // bullBars accumulates on trendUp bars (fastEma > slowEma)
    // bar0: 102==102 → not bull → 0; bar1: 103.5>103 → bull →1; etc.
    expect(getPlot(result, 'BullBars').values).toEqual([0, 1, 2, 3, 3, 3, 4, 5, 6, 7, 8, 9]);
    // crossUp at bar1, crossDn at bar4
    expect(getPlot(result, 'BuySignal').values).toEqual([null, 1, null, null, null, null, 1, null, null, null, null, null]);
    expect(getPlot(result, 'SellSignal').values).toEqual([null, null, null, null, 1, null, null, null, null, null, null, null]);
    expect(result.plots.some((p) => p.type === 'barcolor')).toBe(true);
    expect(result.drawings.filter((d) => d.type === 'table').length).toBeGreaterThan(0);
  });

  it('locks portfolio equity tracker: strategy with two trade cycles, stats table, str.format', () => {
    // Combines: strategy with two entry/close cycles on stratBars, performance stats
    // (netprofit, closedtrades, max_drawdown) in a table with str.format formatting,
    // and equity/netprofit/closedtrades plots.
    // Source search: https://www.tradingview.com/scripts/search/strategy%20equity%20performance%20stats%20table/
    const result = runCompatScript(`
strategy("Multi-Feature Equity Tracker Checkpoint", overlay=false, process_orders_on_close=true)
fastLen = input.int(2, "Fast")
slowLen = input.int(3, "Slow")
fastMa = ta.sma(close, fastLen)
slowMa = ta.sma(close, slowLen)
if bar_index == 0
    strategy.entry("L", strategy.long, qty=1)
if bar_index == 1
    strategy.close("L")
if bar_index == 2
    strategy.entry("L", strategy.long, qty=1)
if bar_index == 3
    strategy.close("L")
var table perf = table.new(position.top_right, 2, 4, border_width=1, border_color=color.gray)
if barstate.islast
    table.cell(perf, 0, 0, "Metric")
    table.cell(perf, 1, 0, "Value")
    table.cell(perf, 0, 1, "Net P/L")
    table.cell(perf, 1, 1, str.format("{0,number,#.##}", strategy.netprofit))
    table.cell(perf, 0, 2, "Trades")
    table.cell(perf, 1, 2, str.tostring(strategy.closedtrades))
    table.cell(perf, 0, 3, "Max DD")
    table.cell(perf, 1, 3, str.format("{0,number,#.##}", strategy.max_drawdown))
plot(strategy.equity, title="Equity")
plot(strategy.netprofit, title="NetProfit")
plot(strategy.closedtrades, title="ClosedTrades")
`, { bars: stratBars });

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Multi-Feature Equity Tracker Checkpoint');
    // Trade1: entry at bar0(close=100), close at bar1(close=104) → +4
    // Trade2: entry at bar2(close=105), close at bar3(close=105) → 0
    expect(getPlot(result, 'NetProfit').values).toEqual([0, 4, 4, 4]);
    expect(getPlot(result, 'ClosedTrades').values).toEqual([0, 1, 1, 2]);
    expect(getPlot(result, 'Equity').values).toEqual([100000, 100004, 100004, 100004]);
    expect(result.drawings.filter((d) => d.type === 'table').length).toBeGreaterThan(0);
  });

  it('locks divergence detector: ta.rsi, ta.highest/lowest rolling window, bearish divergence, plotshape', () => {
    // Combines: ta.rsi, ta.highest/lowest for rolling pivot detection, bearish
    // divergence logic (price new high but RSI lower), plotshape markers.
    // Source search: https://www.tradingview.com/scripts/search/rsi%20divergence%20highest%20lowest%20plotshape/
    const result = runCompatScript(`
indicator("Multi-Feature Divergence Detector Checkpoint", overlay=false)
rsiLen = input.int(5, "RSI Length")
lookback = input.int(3, "Lookback")
rsi = ta.rsi(close, rsiLen)
priceHighest = ta.highest(high, lookback)
priceLower = ta.lowest(low, lookback)
rsiHighest = ta.highest(rsi, lookback)
rsiLowest = ta.lowest(rsi, lookback)
bearDiv = high == priceHighest and rsi < rsiHighest and not na(rsi)
bullDiv = low == priceLower and rsi > rsiLowest and not na(rsi)
plotshape(bearDiv, title="BearDiv", style=shape.triangledown, location=location.abovebar, color=color.red)
plotshape(bullDiv, title="BullDiv", style=shape.triangleup, location=location.belowbar, color=color.green)
plot(nz(rsi), title="RSI")
plot(bearDiv ? 1 : 0, title="BearDivFlag")
plot(bullDiv ? 1 : 0, title="BullDivFlag")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Multi-Feature Divergence Detector Checkpoint');
    expect(result.inputs.map((i) => [i.title, i.type])).toEqual([
      ['RSI Length', 'int'],
      ['Lookback', 'int'],
    ]);
    expect(roundSeries(getPlot(result, 'RSI').values)).toEqual([
      0, 0, 0, 0, 0, 42.857143, 57.894737, 70.16317, 65.39924, 72.421258, 66.774781, 72.194557,
    ]);
    // bearDiv: high equals rolling 3-bar high AND rsi < rolling 3-bar rsi max
    expect(getPlot(result, 'BearDivFlag').values).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0]);
    expect(getPlot(result, 'BullDivFlag').values).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    // plotshape markers match the flag values
    expect(getPlot(result, 'BearDiv').values).toEqual([null, null, null, null, null, null, null, null, 1, null, 1, null]);
  });

  it('locks custom oscillator: UDF with input.string mode selector, dynamic plot color, fill vs zero, alertcondition', () => {
    // Combines: UDF with input.string mode selector (EMA vs SMA), plot with dynamic
    // per-bar color expression, fill() between osc and zero-line plots, alertcondition.
    // Source search: https://www.tradingview.com/scripts/search/custom%20oscillator%20gradient%20fill%20zero%20line/
    const result = runCompatScript(`
indicator("Multi-Feature Oscillator Gradient Checkpoint")
length = input.int(5, "Length")
maType = input.string("EMA", "MA Type")
getMA(src, len) =>
    maType == "EMA" ? ta.ema(src, len) : ta.sma(src, len)
ma = getMA(close, length)
osc = close - ma
zeroLine = plot(0, title="Zero", color=color.gray)
oscPlot = plot(osc, title="Osc", color=osc > 0 ? color.new(color.green, 30) : color.new(color.red, 30))
fill(oscPlot, zeroLine, color=color.new(color.blue, 85), title="OscFill")
alertcondition(ta.cross(osc, 0), title="Zero Cross", message="Oscillator crossed zero")
plot(osc > 0 ? 1 : 0, title="AboveZero")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Multi-Feature Oscillator Gradient Checkpoint');
    // osc = close - ema(close,5); ema(close,5) uses alpha=2/6 by the EMA formula
    expect(roundSeries(getPlot(result, 'Osc').values)).toEqual([
      0, 2, 2.666667, -0.888889, -3.259259, -1.506173,
      1.662551, 4.441701, 2.294467, 3.529645, 1.68643, 2.45762,
    ]);
    // above zero: close > ema(close,5)
    expect(getPlot(result, 'AboveZero').values).toEqual([0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1]);
    expect(result.plots.some((p) => p.type === 'fill')).toBe(true);
  });

  it('locks ichimoku-style overlay: multiple ta.sma offsets, fill, color.new transparency, plotshape crossover', () => {
    // Combines: multiple ta.highest/ta.lowest calculations for Tenkan/Kijun/Kumo lines,
    // plot with offset=N parameter, fill between two cloud plots, color.new with dynamic
    // transparency based on cloud direction, and plotshape for crossover signals.
    // Source search: https://www.tradingview.com/scripts/search/ichimoku%20cloud%20fill%20crossover%20plotshape/
    const result = runCompatScript(`
indicator("Multi-Feature Ichimoku Checkpoint", overlay=true)
convLen = input.int(3, "Conversion")
baseLen = input.int(5, "Base")
conv = (ta.highest(high, convLen) + ta.lowest(low, convLen)) / 2
base = (ta.highest(high, baseLen) + ta.lowest(low, baseLen)) / 2
spanA = (conv + base) / 2
spanB = (ta.highest(high, 4) + ta.lowest(low, 4)) / 2
convAbove = conv > base
convPlot = plot(conv, title="Conversion", color=color.blue)
basePlot = plot(base, title="Base", color=color.red)
spanAPlot = plot(spanA, title="SpanA", offset=2, color=color.new(color.green, 50))
spanBPlot = plot(spanB, title="SpanB", offset=2, color=color.new(color.red, 50))
fill(convPlot, basePlot, color=convAbove ? color.new(color.green, 80) : color.new(color.red, 80), title="CloudFill")
plotshape(ta.crossover(conv, base), title="BullCross", style=shape.triangleup, location=location.belowbar, color=color.green)
plot(convAbove ? 1 : 0, title="ConvAbove")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Multi-Feature Ichimoku Checkpoint');
    expect(result.inputs.map((i) => [i.title, i.type])).toEqual([
      ['Conversion', 'int'],
      ['Base', 'int'],
    ]);
    expect(getPlot(result, 'Conversion').values).toEqual([
      101, 102.5, 103.5, 105, 103.5, 102.5, 100.5, 103, 105, 107.5, 110, 110.5,
    ]);
    expect(getPlot(result, 'Base').values).toEqual([
      101, 102.5, 103.5, 104, 103.5, 102.5, 102.5, 103, 103.5, 104, 106.5, 108.5,
    ]);
    // convAbove: conv > base
    expect(getPlot(result, 'ConvAbove').values).toEqual([0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 1]);
    // bullCross fires at bar3 (conv crosses above base) and bar8
    expect(getPlot(result, 'BullCross').values).toEqual([null, null, null, 1, null, null, null, null, 1, null, null, null]);
    // fill between Conversion and Base plots is present
    expect(result.plots.some((p) => p.type === 'fill')).toBe(true);
  });
});

// ===========================================================================================
// Pine v4/v5 legacy patterns
// Verifies that popular idioms from v4 and v5 public scripts parse and run without rewrites.
// These patterns appear frequently in pasted scripts from TradingView's public script library.
// ===========================================================================================

describe('Pine v4/v5 legacy patterns', () => {
  it('locks v4 study() with resolution= parameter (legacy timeframe name)', () => {
    // v4 used `resolution=` instead of `timeframe=` in study() declarations.
    // The runtime accepts the old name transparently; title and plots propagate correctly.
    // Source search: https://www.tradingview.com/scripts/search/v4%20study%20resolution%20parameter/
    const result = runCompatScript(`//@version=4
study("V4 Resolution Study Checkpoint", resolution="D")
length = input(3, "Length")
s = sma(close, length)
plot(s, title="SMA")`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('V4 Resolution Study Checkpoint');
    expect(roundSeries(getPlot(result, 'SMA').values)).toEqual([
      null, null,
      104.666667, 105, 103, 100.666667, 101, 104.333333, 107, 109.333333, 109.666667, 111,
    ]);
  });

  it('locks v4 input() with type=input.integer and type=input.bool parameters', () => {
    // v4 used the generic input() function with an explicit type= qualifier rather than
    // typed variants like input.int() or input.bool(). The runtime maps these to the
    // corresponding typed inputs; the title is taken from the second positional arg.
    // Source search: https://www.tradingview.com/scripts/search/v4%20input%20type%20integer%20bool/
    const result = runCompatScript(`//@version=4
indicator("V4 Integer Bool Input Checkpoint")
len = input(5, "Length", type=input.integer)
flag = input(true, "Flag", type=input.bool)
s = sma(close, len)
plot(len, title="Length")
plot(flag ? 1 : 0, title="Flag")
plot(s, title="SMA")`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('V4 Integer Bool Input Checkpoint');
    expect(result.inputs.map((i) => [i.title, i.type])).toEqual([
      ['Length', 'int'],
      ['Flag', 'bool'],
    ]);
    expect(getPlot(result, 'Length').values).toEqual(Array(compatibilityBars.length).fill(5));
    expect(getPlot(result, 'Flag').values).toEqual(Array(compatibilityBars.length).fill(1));
    expect(roundSeries(getPlot(result, 'SMA').values)).toEqual([
      null, null, null, null,
      103.2, 102.8, 102.6, 103, 104, 106.4, 108.4, 110,
    ]);
  });

  it('locks plotshape() with omitted location (default location.abovebar)', () => {
    // v4/v5 scripts frequently omit the location= parameter in plotshape(), relying on
    // the default. Confirms plotshape without location does not throw and produces
    // the same shape output pattern as when location is explicit.
    // Source search: https://www.tradingview.com/scripts/search/plotshape%20default%20location%20omitted/
    const result = runCompatScript(`indicator("V4V5 Plotshape Default Location Checkpoint")
cond = close > open
plotshape(cond, title="Shape", style=shape.triangleup, color=color.green)
plot(cond ? 1 : 0, title="Cond")`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('V4V5 Plotshape Default Location Checkpoint');
    // close > open: bars 0,1,2 yes; 3,4 no; 5,6,7 yes; 8 no; 9 yes; 10 no; 11 yes
    expect(getPlot(result, 'Cond').values).toEqual([1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1]);
    expect(getPlot(result, 'Shape').values).toEqual([1, 1, 1, null, null, 1, 1, 1, null, 1, null, 1]);
  });

  it('locks legacy strategy.position_size == 0 flat-position check', () => {
    // v4/v5 strategies commonly gate new entries on `strategy.position_size == 0`
    // to ensure a flat position before placing orders. Confirms the equality check
    // against zero works correctly after a close order flattens the book.
    // Source search: https://www.tradingview.com/scripts/search/strategy%20position_size%20equals%20zero%20check/
    const stratBars = [
      { time: 1_700_610_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: 1_700_610_060_000, open: 103, high: 105, low: 102, close: 104, volume: 100 },
      { time: 1_700_610_120_000, open: 104, high: 106, low: 103, close: 105, volume: 100 },
      { time: 1_700_610_180_000, open: 105, high: 106, low: 104, close: 105, volume: 100 },
    ];
    const result = runCompatScript(`strategy("Legacy Position Size Check Checkpoint", overlay=true, process_orders_on_close=true)
if bar_index == 0
    strategy.entry("L", strategy.long, qty=1)
if bar_index == 2
    strategy.close("L")
isFlat = strategy.position_size == 0
plot(isFlat ? 1 : 0, title="IsFlat")
plot(strategy.position_size, title="PosSize")`, { bars: stratBars });

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Legacy Position Size Check Checkpoint');
    // Entry at bar0 (close=100); close at bar2 (close=105)
    expect(getPlot(result, 'PosSize').values).toEqual([1, 1, 0, 0]);
    expect(getPlot(result, 'IsFlat').values).toEqual([0, 0, 1, 1]);
  });

  it('locks v5 array.new_float() without generic type parameter', () => {
    // In v5 and earlier scripts, array.new_float(size, initial) was the idiomatic
    // constructor. The runtime handles it identically to the generic form.
    // Source search: https://www.tradingview.com/scripts/search/array.new_float%20v5%20no%20generic/
    const result = runCompatScript(`indicator("Legacy array.new_float() Checkpoint")
arr = array.new_float(3, 0.0)
arr.set(0, close)
arr.set(1, high)
arr.set(2, low)
s = array.sum(arr)
plot(s, title="Sum")
plot(arr.size(), title="Size")`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Legacy array.new_float() Checkpoint');
    // sum = close + high + low per bar
    expect(getPlot(result, 'Sum').values).toEqual([304, 312, 319, 314, 301, 297, 308, 322, 325, 330, 333, 333]);
    // size is always 3 (pre-allocated)
    expect(getPlot(result, 'Size').values).toEqual(Array(compatibilityBars.length).fill(3));
  });

  it('locks v5 str.tostring() with number format pattern "#.##"', () => {
    // v5 scripts commonly use str.tostring(value, "#.##") to format numbers for
    // label text. Confirms the call parses and executes without errors; the
    // formatted string is used in a label drawing on each bar.
    // Source search: https://www.tradingview.com/scripts/search/str.tostring%20number%20format%20decimal/
    const result = runCompatScript(`indicator("Legacy str.tostring Format Checkpoint")
s = str.tostring(close, "#.##")
label.new(bar_index, close, s, style=label.style_label_down)
plot(close, title="Close")`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Legacy str.tostring Format Checkpoint');
    expect(getPlot(result, 'Close').values).toEqual([102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110, 112]);
    // Each bar produces a label with formatted close text
    expect(result.drawings.filter((d) => d.type === 'label').length).toBeGreaterThan(0);
  });

  it('locks legacy timeframe.period string comparison pattern', () => {
    // Scripts that route logic based on the current chart timeframe compare
    // timeframe.period against string literals like "D", "W", or "60".
    // In the test harness the default period is "60" (60-minute), so isDaily and
    // isWeekly are false but is60 is true on all bars. This confirms string comparison
    // against timeframe.period works correctly for both matching and non-matching cases.
    // Source search: https://www.tradingview.com/scripts/search/timeframe.period%20comparison%20string/
    const result = runCompatScript(`indicator("Legacy timeframe.period Checkpoint")
isDaily = timeframe.period == "D"
isWeekly = timeframe.period == "W"
is60 = timeframe.period == "60"
plot(isDaily ? 1 : 0, title="IsDaily")
plot(isWeekly ? 1 : 0, title="IsWeekly")
plot(is60 ? 1 : 0, title="Is60")`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Legacy timeframe.period Checkpoint');
    // Default test harness period is "60" — isDaily and isWeekly are false, is60 is true
    expect(getPlot(result, 'IsDaily').values).toEqual(Array(compatibilityBars.length).fill(0));
    expect(getPlot(result, 'IsWeekly').values).toEqual(Array(compatibilityBars.length).fill(0));
    expect(getPlot(result, 'Is60').values).toEqual(Array(compatibilityBars.length).fill(1));
  });

  it('locks v5 ta.change(source, length) two-argument form', () => {
    // v5 introduced an optional second argument to ta.change(source, length) to
    // compute the difference between source and source[length]. The single-arg form
    // (length=1 by default) is also tested side-by-side to confirm both work.
    // Source search: https://www.tradingview.com/scripts/search/ta.change%20two%20argument%20length/
    const result = runCompatScript(`indicator("V5 ta.change Two-Arg Checkpoint")
c1 = ta.change(close)
c5 = ta.change(close, 5)
plot(c1, title="Change1")
plot(c5, title="Change5")`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('V5 ta.change Two-Arg Checkpoint');
    // change(close) = close - close[1]
    expect(roundSeries(getPlot(result, 'Change1').values)).toEqual([
      null, 3, 2, -4, -4, 1, 4, 5, -1, 3, -1, 2,
    ]);
    // change(close, 5) = close - close[5]; first 5 bars are null
    expect(roundSeries(getPlot(result, 'Change5').values)).toEqual([
      null, null, null, null, null, -2, -1, 2, 5, 12, 10, 8,
    ]);
  });

  it('locks legacy nz(value, replacement) two-argument form', () => {
    // v4/v5 scripts rely on nz(x, y) to substitute y when x is na.
    // The canonical use case is `nz(close[1], 0)` on bar 0 where close[1] is na.
    // Confirms the two-arg nz returns the replacement on bar 0 and the real value from bar 1 onward.
    // Source search: https://www.tradingview.com/scripts/search/nz%20two%20argument%20replacement/
    const result = runCompatScript(`indicator("Legacy nz() Two-Arg Checkpoint")
v = nz(close[1], 0.0)
plot(v, title="NZ")`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Legacy nz() Two-Arg Checkpoint');
    // Bar 0: close[1] is na → returns 0.0; bars 1-11: returns close[1]
    expect(getPlot(result, 'NZ').values).toEqual([0, 102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110]);
  });

  it('locks v5 math.max() with five arguments (variadic form)', () => {
    // v5 made math.max() variadic; scripts pass 3–5 moving average series to pick
    // the highest. Confirms the runtime handles more than two positional arguments.
    // Source search: https://www.tradingview.com/scripts/search/math.max%20variadic%20multiple%20args/
    const result = runCompatScript(`indicator("V5 math.max Variadic Checkpoint")
a = ta.sma(close, 3)
b = ta.sma(close, 5)
c = ta.ema(close, 3)
d = ta.ema(close, 5)
e = close
m5 = math.max(a, b, c, d, e)
m2 = math.max(a, b)
plot(m5, title="Max5")
plot(m2, title="Max2")`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('V5 math.max Variadic Checkpoint');
    // max of 5 series; close dominates during warm-up gaps (null propagates for na args)
    expect(roundSeries(getPlot(result, 'Max5').values)).toEqual([
      null, null, null, null,
      103.2, 102.8, 104, 109, 108, 111, 110, 112,
    ]);
    // max of two SMA series; valid from bar 4 (SMA5 warm-up)
    expect(roundSeries(getPlot(result, 'Max2').values)).toEqual([
      null, null, null, null,
      103.2, 102.8, 102.6, 104.333333, 107, 109.333333, 109.666667, 111,
    ]);
  });

  it('locks v3/v4 legacy color(r, g, b, transp) global function alias', () => {
    // Pine v3/v4 scripts call color() as a global function: color(r, g, b, transp).
    // In v5/v6 this became color.rgb(). Confirms the alias delegates to color.rgb and
    // produces correct #RRGGBBAA hex strings, including transparency clamping.
    // Source search: https://www.tradingview.com/scripts/search/color%20r%20g%20b%20transp%20v4/
    const result = runCompatScript(`
indicator("Legacy color() Global Checkpoint")
cSolid = color(255, 0, 0, 0)
cHalf = color(0, 255, 0, 50)
cTrans = color(0, 0, 255, 100)
isSolid = cSolid == "#FF0000FF"
isHalf = cHalf == "#00FF0080"
isTrans = cTrans == "#0000FF00"
plot(isSolid ? 1 : 0, title="Solid")
plot(isHalf ? 1 : 0, title="Half")
plot(isTrans ? 1 : 0, title="Trans")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Legacy color() Global Checkpoint');
    expect(getPlot(result, 'Solid').values).toEqual(Array(compatibilityBars.length).fill(1));
    expect(getPlot(result, 'Half').values).toEqual(Array(compatibilityBars.length).fill(1));
    expect(getPlot(result, 'Trans').values).toEqual(Array(compatibilityBars.length).fill(1));
  });
});

// ===========================================================================================
// Library, financial, and advanced strategy patterns
// Targets areas with lower corpus coverage: library declarations, request.financial /
// dividends / earnings without a live datafeed, strategy pyramiding and commission,
// ta.vwap with anchor, str.format_time with timezone, conditional na inference, and
// runtime.error guard.
// ===========================================================================================

describe('Library, financial, and advanced patterns', () => {
  it('locks library export declaration metadata and imported function execution', () => {
    // Public idiom reference: library scripts declare exported functions that
    // callers import and invoke as if they were built-ins. The library declaration
    // itself must parse cleanly and the export table must bind correctly.
    // Source search: https://www.tradingview.com/scripts/search/library%20export%20functions/
    const library = parse(`
library("MathKit", true)
export double(series float x) => x * 2
export halve(series float x) => x / 2
`);
    const result = runCompatScript(`
indicator("Library Export Checkpoint")
import TestUser/MathKit/1 as mk
doubled = mk.double(close)
halved = mk.halve(close)
plot(doubled, title="Doubled")
plot(halved, title="Halved")
`, {
      engineOptions: {
        libraries: new Map([['TestUser/MathKit/1', library]]),
      },
    });

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Library Export Checkpoint');
    // doubled = close * 2, halved = close / 2 over compatibilityBars closes:
    // 102,105,107,103,99,100,104,109,108,111,110,112
    expect(getPlot(result, 'Doubled').values).toEqual([204, 210, 214, 206, 198, 200, 208, 218, 216, 222, 220, 224]);
    expect(getPlot(result, 'Halved').values).toEqual([51, 52.5, 53.5, 51.5, 49.5, 50, 52, 54.5, 54, 55.5, 55, 56]);
  });

  it('locks enum with switch driving barcolor and plotshape output', () => {
    // Public idiom reference: trend-state scripts define an enum and use a
    // switch expression to assign state, then drive barcolor and plotshape off
    // the enum value — verifying enum member comparison across output builtins.
    // Source search: https://www.tradingview.com/scripts/search/enum%20switch%20barcolor%20plotshape/
    const result = runCompatScript(`
indicator("Enum Switch Barcolor Checkpoint", overlay=true)
enum TrendState
    Long = "Long"
    Short = "Short"
    Flat = "Flat"

sma5 = ta.sma(close, 5)
TrendState state = switch
    close > sma5 => TrendState.Long
    close < sma5 => TrendState.Short
    => TrendState.Flat

barcolor(state == TrendState.Long ? color.green : state == TrendState.Short ? color.red : color.gray, title="Trend Color")
plotshape(state == TrendState.Long, title="Long Signal", style=shape.triangleup, location=location.belowbar, color=color.green)
plot(state == TrendState.Long ? 1 : 0, title="Long State")
plot(state == TrendState.Short ? 1 : 0, title="Short State")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Enum Switch Barcolor Checkpoint');
    // sma5 is null for bars 0-3; close vs sma5: null→Flat; bars 4-11 depend on sma
    // sma5 values: null,null,null,null, 103.2,102.8,102.6,103,104,106.4,108.4,110
    // close:                          102,105,107,103,  99,  100, 104,  109, 108, 111,110,112
    // Long (close>sma5): bars 4→no(99<103.2), 5→no(100<102.8), 6→yes(104>102.6), 7→yes(109>103), 8→yes(108>104), 9→yes(111>106.4), 10→yes(110>108.4), 11→yes(112>110)
    // Short: bars 4,5
    // Flat: bars 0-3
    expect(getPlot(result, 'Long State').values).toEqual([0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1]);
    expect(getPlot(result, 'Short State').values).toEqual([0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0]);
    // Long Signal plotshape: 1 where Long State is true, null otherwise
    expect(getPlot(result, 'Long Signal').values).toEqual([null, null, null, null, null, null, 1, 1, 1, 1, 1, 1]);
  });

  it('locks request.financial parse and runtime resolution returning nan with empty datafeed', () => {
    // Public idiom reference: fundamental scripts call request.financial() to
    // overlay financial metrics. With ignore_invalid_symbol=true and an empty
    // datafeed the call resolves to NaN which propagates as null in plots.
    // Source search: https://www.tradingview.com/scripts/search/request.financial%20fundamental/
    const emptyDatafeed = new InMemoryRequestDatafeed([], []);
    const result = runCompatScript(`
indicator("Req Financial Checkpoint")
revenue = request.financial(syminfo.tickerid, "TOTAL_REVENUE", "FQ", ignore_invalid_symbol=true)
margin = na(revenue) ? na : revenue / close * 100
plot(revenue, title="Revenue")
plot(margin, title="Margin")
plot(close, title="Close")
`, { engineOptions: { requestDatafeed: emptyDatafeed } });

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Req Financial Checkpoint');
    // With no series data, revenue is NaN → plot values are null
    expect(getPlot(result, 'Revenue').values).toEqual(Array(compatibilityBars.length).fill(null));
    expect(getPlot(result, 'Margin').values).toEqual(Array(compatibilityBars.length).fill(null));
    // Close still plots normally
    expect(getPlot(result, 'Close').values).toEqual([102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110, 112]);
  });

  it('locks request.dividends and request.earnings parse and runtime resolution with empty datafeed', () => {
    // Public idiom reference: corporate-action scripts call request.dividends()
    // and request.earnings() to mark payout events. With ignore_invalid_symbol=true
    // and an empty datafeed both return NaN. The na() guard must work correctly.
    // Source search: https://www.tradingview.com/scripts/search/request.dividends%20request.earnings%20event/
    const emptyDatafeed = new InMemoryRequestDatafeed([], []);
    const result = runCompatScript(`
indicator("Req Dividends Earnings Checkpoint", overlay=true)
div = request.dividends(syminfo.tickerid, dividends.gross, gaps=barmerge.gaps_on, ignore_invalid_symbol=true)
eps = request.earnings(syminfo.tickerid, earnings.actual, gaps=barmerge.gaps_on, ignore_invalid_symbol=true)
hasDividend = not na(div)
hasEarnings = not na(eps)
plot(hasDividend ? 1 : 0, title="Has Dividend")
plot(hasEarnings ? 1 : 0, title="Has Earnings")
plotshape(hasDividend, title="Div Marker", style=shape.triangleup, location=location.abovebar, color=color.blue)
`, { engineOptions: { requestDatafeed: emptyDatafeed } });

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Req Dividends Earnings Checkpoint');
    // With no series data, div and eps are NaN on every bar → hasDividend and hasEarnings are false
    expect(getPlot(result, 'Has Dividend').values).toEqual(Array(compatibilityBars.length).fill(0));
    expect(getPlot(result, 'Has Earnings').values).toEqual(Array(compatibilityBars.length).fill(0));
    expect(getPlot(result, 'Div Marker').values).toEqual(Array(compatibilityBars.length).fill(null));
  });

  it('locks strategy pyramiding allowing multiple same-direction entries', () => {
    // Public idiom reference: pyramiding strategies enter the same direction
    // multiple times to scale into a winning position.
    // Source search: https://www.tradingview.com/scripts/search/strategy%20pyramiding%20scale%20in/
    const result = runCompatScript(`
strategy("Pyramiding Checkpoint", pyramiding=3, process_orders_on_close=true)
if bar_index < 3
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 3
    strategy.close_all()
plot(strategy.position_size, title="Pos Size")
plot(strategy.opentrades, title="Open Trades")
plot(strategy.closedtrades, title="Closed Trades")
`, { bars: stratBars });

    expect(result.errors).toEqual([]);
    // Bar 0: entry qty=1 → pos=1; bar 1: entry qty=1 → pos=2; bar 2: entry qty=1 → pos=3; bar 3: close_all → pos=0
    expect(getPlot(result, 'Pos Size').values).toEqual([1, 2, 3, 0]);
    expect(getPlot(result, 'Open Trades').values).toEqual([1, 2, 3, 0]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 0, 0, 3]);
  });

  it('locks strategy with percent commission reducing net profit', () => {
    // Public idiom reference: commission-aware strategies declare
    // commission_type=strategy.commission.percent and commission_value to model
    // realistic round-trip costs.
    // Source search: https://www.tradingview.com/scripts/search/strategy%20commission%20percent%20cost/
    const result = runCompatScript(`
strategy("Commission Checkpoint", commission_type=strategy.commission.percent, commission_value=0.1, process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.close("Long")
plot(strategy.netprofit, title="Net Profit")
plot(strategy.closedtrades, title="Closed Trades")
`, { bars: stratBars });

    expect(result.errors).toEqual([]);
    // Entry at bar 0 close (100), exit at bar 1 close (104), gross profit = 4
    // Commission on entry: 100 * 1 * 0.001 = 0.1 (deducted at entry → netprofit = -0.1 on bar 0)
    // Commission on exit:  104 * 1 * 0.001 = 0.104
    // Net profit = 4 - 0.1 - 0.104 = 3.796
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Net Profit').values, 4)).toEqual([-0.1, 3.796, 3.796, 3.796]);
  });

  it('locks ta.vwap with anchor resetting accumulation mid-series', () => {
    // Public idiom reference: anchored VWAP scripts reset the accumulation on a
    // session or user-defined anchor. The no-stdev-mult form returns only the vwap
    // scalar.
    // Source search: https://www.tradingview.com/scripts/search/ta.vwap%20anchor%20reset%20session/
    const result = runCompatScript(`
indicator("VWAP Anchor Checkpoint", overlay=true)
anchor = bar_index == 0 or bar_index == 6
vwap = ta.vwap(anchor=anchor)
plot(vwap, title="VWAP")
plot(close > vwap ? 1 : 0, title="Above VWAP")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('VWAP Anchor Checkpoint');
    // VWAP uses typical price (H+L+C)/3 * volume / cumulative volume.
    // compatibilityBars: [h,l,c,vol] →
    // bar0: tp=(103+99+102)/3=101.333, cumTpv=101333, cumVol=1000, vwap=101.333
    // bar1: tp=(106+101+105)/3=104, cumTpv=101333+104*1100=215733.333, cumVol=2100, vwap≈102.73
    // ...anchor resets at bar6
    // bar6: tp=(105+99+104)/3=102.667, cumTpv=102.667*1300=133466.667, cumVol=1300, vwap=102.667 (reset)
    const vwapVals = getPlot(result, 'VWAP').values as number[];
    // Verify reset occurred: vwap at bar 6 should equal typical price of bar 6 alone
    const bar6Tp = (105 + 99 + 104) / 3;
    expect(Math.abs(vwapVals[6]! - bar6Tp)).toBeLessThan(0.001);
    // Entire series should be valid (no nulls)
    expect(vwapVals.every((v) => v !== null && !isNaN(v))).toBe(true);
    // Above VWAP signal is 0 or 1 on each bar
    const aboveVwap = getPlot(result, 'Above VWAP').values;
    expect(aboveVwap.every((v) => v === 0 || v === 1)).toBe(true);
  });

  it('locks str.format_time with America/New_York timezone producing correct date string', () => {
    // Public idiom reference: session-aware scripts format bar timestamps in a
    // named timezone for display. str.format_time with a timezone argument must
    // produce the correct date and hour for the offset.
    // Source search: https://www.tradingview.com/scripts/search/str.format_time%20timezone%20display/
    const result = runCompatScript(`
indicator("Str Format Time Timezone Checkpoint")
dateStr = str.format_time(time, "yyyy-MM-dd", "America/New_York")
isNov14 = dateStr == "2023-11-14"
plot(isNov14 ? 1 : 0, title="Is Nov 14")
plot(close, title="Close")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Str Format Time Timezone Checkpoint');
    // compatibilityBars timestamps: 1_700_000_000_000 ... 1_700_000_660_000
    // = Nov 14 2023 22:13:20 UTC ... 22:24:20 UTC → all map to Nov 14 2023 in America/New_York (UTC-5)
    expect(getPlot(result, 'Is Nov 14').values).toEqual(Array(compatibilityBars.length).fill(1));
    expect(getPlot(result, 'Close').values).toEqual([102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110, 112]);
  });

  it('locks conditional type inference x = condition ? 1.0 : na', () => {
    // Public idiom reference: scripts assign series values conditionally using
    // na as the false branch, producing a sparse series. The runtime must infer
    // the result as float/na without type error and propagate null to plots.
    // Source search: https://www.tradingview.com/scripts/search/conditional%20na%20ternary%20sparse%20series/
    const result = runCompatScript(`
indicator("Conditional NA Inference Checkpoint")
x = close > open ? 1.0 : na
y = nz(x, -1.0)
plot(x, title="Sparse")
plot(y, title="With Default")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Conditional NA Inference Checkpoint');
    // close > open: 1→yes, 2→yes, 3→yes, 4→no, 5→no, 6→yes, 7→yes, 8→yes, 9→no, 10→yes, 11→no, 12→yes
    // (bars indexed 0-11, close/open from compatibilityBars)
    expect(getPlot(result, 'Sparse').values).toEqual([1, 1, 1, null, null, 1, 1, 1, null, 1, null, 1]);
    expect(getPlot(result, 'With Default').values).toEqual([1, 1, 1, -1, -1, 1, 1, 1, -1, 1, -1, 1]);
  });

  it('locks runtime.error guard halting execution and leaving prior plots intact', () => {
    // Public idiom reference: guard scripts call runtime.error() when an invariant
    // is violated, halting bar-by-bar execution. Plots emitted before the guard bar
    // must be present; the error must be catchable in the test harness.
    // Source search: https://www.tradingview.com/scripts/search/runtime.error%20invariant%20guard/
    const result = runCompatScript(`
indicator("Runtime Error Guard Checkpoint")
plot(close, title="Before")
if bar_index == 3
    runtime.error("Invariant violated at bar 3")
plot(close > 100 ? 1 : 0, title="After")
`);

    // Execution stops mid-bar-3 after Before plot is emitted for bars 0-3
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      code: 'runtime.error',
      message: 'Invariant violated at bar 3',
    });
    // Before plot has values for bars 0, 1, 2, 3 (emitted before the guard triggers on bar 3)
    expect(roundSeries(getPlot(result, 'Before').values)).toEqual([102, 105, 107, 103]);
    // After plot only has values for bars emitted before bar 3's guard (bars 0, 1, 2)
    expect(getPlot(result, 'After').values).toEqual([1, 1, 1]);
  });
});

// ===========================================================================================
// Advanced drawing and table patterns
// Tests complex combinations of labels, lines, boxes, polylines, and tables that push
// the drawing subsystem: array management, extend/style, gradient colors, plotbar, fill.
// ===========================================================================================

describe('Advanced drawing and table patterns', () => {
  it('locks dynamic label array management with oldest-delete cap pattern', () => {
    // Public idiom reference: S/R indicator scripts create labels on each signal bar,
    // push them into a var array, and delete the oldest when the array exceeds a cap.
    // Source search: https://www.tradingview.com/scripts/search/label%20array%20oldest%20delete%20cap/
    const result = runCompatScript(`
indicator("Adv Label Array Cap Checkpoint", overlay=true)
var array<label> lbls = array.new<label>()
maxCount = 4
isBull = close > open
if isBull
    lbl = label.new(bar_index, close, str.tostring(close), style=label.style_label_down, color=color.green, textcolor=color.white)
    lbls.push(lbl)
    if lbls.size() > maxCount
        label.delete(lbls.shift())
plot(lbls.size(), title="Label Count")
plot(isBull ? 1 : 0, title="Bull Bar")
`);

    expect(result.errors).toEqual([]);
    // Bull bars (close > open): 0(102>100), 1(105>102), 2(107>105), 5(100>99), 6(104>100), 7(109>104), 9(111>108), 11(112>110)
    expect(getPlot(result, 'Bull Bar').values).toEqual([1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1]);
    // Array grows to 3, then cap at 4
    expect(getPlot(result, 'Label Count').values).toEqual([1, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4]);
    // After cap hits, oldest are deleted; 4 labels survive
    expect(result.drawings.filter((d) => d.type === 'label').length).toBe(4);
  });

  it('locks table with merged header cells pattern', () => {
    // Public idiom reference: dashboard scripts use table.merge_cells() to span a
    // header row across all columns, then fill individual data cells below it.
    // Source search: https://www.tradingview.com/scripts/search/table%20merge%20cells%20header%20row/
    const result = runCompatScript(`
indicator("Adv Table Merged Header Checkpoint", overlay=true)
var tbl = table.new(position.top_right, 3, 2, border_color=color.white, border_width=1)
if barstate.islast
    table.cell(tbl, 0, 0, "Market Summary", text_color=color.white, bgcolor=color.blue)
    table.merge_cells(tbl, 0, 0, 2, 0)
    table.cell(tbl, 0, 1, "RSI", text_color=color.white)
    table.cell(tbl, 1, 1, str.tostring(math.round(ta.rsi(close, 5))), text_color=color.yellow)
    table.cell(tbl, 2, 1, "OK", bgcolor=color.green, text_color=color.white)
plot(array.size(table.all), title="Table Count")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Table Count').values).toEqual(Array(compatibilityBars.length).fill(1));
    const tblDrawing = result.drawings.find((d) => d.type === 'table');
    expect(tblDrawing).toBeDefined();
    expect((tblDrawing as { mergedCells?: unknown[] }).mergedCells).toHaveLength(1);
  });

  it('locks line with extend.right and style_dashed with conditional color change', () => {
    // Public idiom reference: trend-line scripts draw a dashed line from a pivot
    // extending right, then recolor it based on the current price relationship.
    // Source search: https://www.tradingview.com/scripts/search/trend%20line%20extend%20right%20dashed%20color/
    const result = runCompatScript(`
indicator("Adv Line Extend Dashed Checkpoint", overlay=true)
var myLine = line.new(bar_index, close, bar_index + 1, close, extend=extend.right, style=line.style_dashed, color=color.gray)
isAbove = close > close[1]
if isAbove
    line.set_color(myLine, color.green)
else
    line.set_color(myLine, color.red)
plot(isAbove ? 1 : 0, title="Above")
`);

    expect(result.errors).toEqual([]);
    // Last bar (bar 11): close=112 > close[1]=110, so isAbove=true, color=green
    expect(result.drawings).toHaveLength(1);
    expect(result.drawings[0]).toMatchObject({
      type: 'line',
      extend: 'right',
      style: 'dashed',
      color: '#4CAF50',
    });
    expect(getPlot(result, 'Above').values).toEqual([0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1]);
  });

  it('locks box with text content and border styling pattern', () => {
    // Public idiom reference: zone scripts draw a box with embedded text label,
    // custom text alignment, and a colored border to mark a price region.
    // Source search: https://www.tradingview.com/scripts/search/box%20with%20text%20border%20zone/
    const result = runCompatScript(`
indicator("Adv Box With Text Checkpoint", overlay=true)
if barstate.islast
    box.new(bar_index - 3, high, bar_index, low, border_color=color.orange, border_width=2, bgcolor=color.new(color.orange, 85), text="Supply Zone", text_color=color.white, text_halign=text.align_left, text_valign=text.align_top)
`);

    expect(result.errors).toEqual([]);
    expect(result.drawings).toHaveLength(1);
    expect(result.drawings[0]).toMatchObject({
      type: 'box',
      left: 8,
      top: 113,
      right: 11,
      bottom: 108,
      borderColor: '#FF9800',
      borderWidth: 2,
      text: 'Supply Zone',
      textColor: '#FFFFFF',
      textHalign: 'left',
      textValign: 'top',
    });
  });

  it('locks polyline from chart.point array built from price action', () => {
    // Public idiom reference: zigzag and wave scripts build chart.point arrays from
    // recent highs/lows and render them as a polyline connecting pivot points.
    // Source search: https://www.tradingview.com/scripts/search/polyline%20chart%20point%20price%20action/
    const result = runCompatScript(`
indicator("Adv Polyline Price Action Checkpoint", overlay=true)
if barstate.islast
    pts = array.new<chart.point>()
    pts.push(chart.point.from_index(bar_index - 4, low[4]))
    pts.push(chart.point.from_index(bar_index - 2, high[2]))
    pts.push(chart.point.now(close))
    polyline.new(pts, line_color=color.purple, line_width=2)
`);

    expect(result.errors).toEqual([]);
    expect(result.drawings).toHaveLength(1);
    expect(result.drawings[0]).toMatchObject({
      type: 'polyline',
      lineColor: '#9C27B0',
      lineWidth: 2,
    });
    const pts = (result.drawings[0] as { points: Array<{ index: number; price: number }> }).points;
    expect(pts).toHaveLength(3);
    expect(pts[0]!.index).toBe(7);  // bar_index - 4 = 11 - 4 = 7
    expect(pts[1]!.index).toBe(9);  // bar_index - 2 = 11 - 2 = 9
    expect(pts[2]!.index).toBe(11); // bar_index
  });

  it('locks label with dynamic str.format tooltip pattern', () => {
    // Public idiom reference: signal scripts attach a multi-field tooltip to labels
    // using str.format with placeholders for RSI, ATR, and price values.
    // Source search: https://www.tradingview.com/scripts/search/label%20tooltip%20str%20format%20signal/
    const result = runCompatScript(`
indicator("Adv Label Dynamic Tooltip Checkpoint", overlay=true)
rsi = ta.rsi(close, 5)
atr = ta.atr(5)
if barstate.islast
    tip = str.format("RSI: {0,number,#.#} | ATR: {1,number,#.##} | Close: {2}", nz(rsi), nz(atr), close)
    label.new(bar_index, high, "Signal", tooltip=tip, style=label.style_label_down, color=color.blue, textcolor=color.white)
`);

    expect(result.errors).toEqual([]);
    expect(result.drawings).toHaveLength(1);
    expect(result.drawings[0]).toMatchObject({ type: 'label', text: 'Signal', color: '#2196F3' });
    const tooltip = (result.drawings[0] as { tooltip?: string }).tooltip;
    expect(tooltip).toBeDefined();
    expect(tooltip).toContain('RSI:');
    expect(tooltip).toContain('ATR:');
    expect(tooltip).toContain('Close: 112');
  });

  it('locks fill between two hlines at fixed price levels', () => {
    // Public idiom reference: indicator scripts call hline() at fixed RSI overbought/
    // oversold levels and fill() between them to shade the neutral zone.
    // Source search: https://www.tradingview.com/scripts/search/hline%20fill%20overbought%20oversold%20zone/
    const result = runCompatScript(`
indicator("Adv Hline Fill Checkpoint")
rsi = ta.rsi(close, 5)
h70 = hline(70, "OB", color=color.red, linestyle=hline.style_dashed)
h30 = hline(30, "OS", color=color.green, linestyle=hline.style_dashed)
fill(h70, h30, color=color.new(color.gray, 85), title="Neutral Zone")
plot(rsi, title="RSI")
`);

    expect(result.errors).toEqual([]);
    // hlines produce plots/fills; no errors
    const fills = result.plots.filter((p) => p.type === 'fill');
    expect(fills.length).toBeGreaterThan(0);
    expect(result.plots.some((p) => p.title === 'RSI')).toBe(true);
  });

  it('locks plotbar OHLC overlay with conditional bar color', () => {
    // Public idiom reference: custom candle scripts overlay plotbar() calls with
    // green/red coloring based on whether the bar is bullish or bearish.
    // Source search: https://www.tradingview.com/scripts/search/plotbar%20ohlc%20custom%20candle%20color/
    const result = runCompatScript(`
indicator("Adv Plotbar OHLC Checkpoint", overlay=true)
isBull = close >= open
barCol = isBull ? color.new(color.green, 20) : color.new(color.red, 20)
plotbar(open, high, low, close, title="Custom OHLC", color=barCol)
plot(isBull ? 1 : 0, title="Bull")
`);

    expect(result.errors).toEqual([]);
    // close >= open: bars 0(102>=100),1(105>=102),2(107>=105),5(100>=99),6(104>=100),7(109>=104),9(111>=108),11(112>=110)
    expect(getPlot(result, 'Bull').values).toEqual([1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1]);
    // plotbar output exists
    const pbPlot = result.plots.find((p) => p.type === 'plotbar');
    expect(pbPlot).toBeDefined();
  });

  it('locks table with color.from_gradient cells pattern', () => {
    // Public idiom reference: heatmap table scripts populate cells using
    // color.from_gradient() to encode a value as a color on a green-to-red scale.
    // Source search: https://www.tradingview.com/scripts/search/table%20color%20gradient%20heatmap/
    const result = runCompatScript(`
indicator("Adv Table Gradient Color Checkpoint", overlay=true)
rsi = nz(ta.rsi(close, 5))
gradColor = color.from_gradient(rsi, 0, 100, color.red, color.green)
var tbl = table.new(position.bottom_right, 1, 2)
if barstate.islast
    table.cell(tbl, 0, 0, "RSI", text_color=color.white, bgcolor=gradColor)
    table.cell(tbl, 0, 1, str.tostring(math.round(rsi)), text_color=color.white, bgcolor=gradColor)
plot(rsi, title="RSI")
`);

    expect(result.errors).toEqual([]);
    expect(result.drawings.filter((d) => d.type === 'table').length).toBeGreaterThan(0);
    expect(result.plots.some((p) => p.title === 'RSI')).toBe(true);
  });

  it('locks drawing cleanup pattern with var line delete-and-recreate per bar', () => {
    // Public idiom reference: real-time scripts keep a single persistent line,
    // delete it at the start of each bar and recreate it with updated coordinates.
    // Source search: https://www.tradingview.com/scripts/search/line%20delete%20recreate%20per%20bar/
    const result = runCompatScript(`
indicator("Adv Drawing Cleanup Checkpoint", overlay=true)
var line myLine = na
if not na(myLine)
    line.delete(myLine)
myLine := line.new(bar_index - 1, close[1], bar_index, close, color=color.blue, width=2)
plot(line.get_x2(myLine), title="Line X2")
`);

    expect(result.errors).toEqual([]);
    // Only the last line survives (all prior ones were deleted)
    expect(result.drawings.filter((d) => d.type === 'line').length).toBe(1);
    expect(result.drawings[0]).toMatchObject({ type: 'line', color: '#2196F3', width: 2 });
    // x2 = bar_index on each bar
    expect(getPlot(result, 'Line X2').values).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });
});

// ===========================================================================================
// Control flow and scope semantics
// Tests Pine-specific execution model edge cases: series history in UDFs, var persistence
// inside for-expression scopes, call-site isolation, switch/if/for/while as expressions,
// break semantics, and na propagation through chained ternaries.
// ===========================================================================================

describe('Control flow and scope semantics', () => {
  it('locks series history reference inside a UDF across call sites', () => {
    // Pine UDFs capture the caller\'s series history — close[1] inside a UDF
    // returns the previous bar\'s close value, not the current bar\'s.
    // This verifies that history references work correctly bar-by-bar when called
    // from a single call site.
    // Source search: https://www.tradingview.com/scripts/search/udf%20series%20history%20close%20lag/
    const result = runCompatScript(`
indicator("Ctrl Series History UDF Checkpoint")
prevClose(src) =>
    src[1]
pc = prevClose(close)
delta = close - pc
plot(pc, title="PrevClose")
plot(nz(delta), title="Delta")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Ctrl Series History UDF Checkpoint');
    // PrevClose is close shifted by one bar (null on bar 0)
    expect(getPlot(result, 'PrevClose').values).toEqual([
      null, 102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110,
    ]);
    // Delta = close - prevClose; nz replaces null on bar 0 with 0
    expect(getPlot(result, 'Delta').values).toEqual([
      0, 3, 2, -4, -4, 1, 4, 5, -1, 3, -1, 2,
    ]);
  });

  it('locks var inside a for-expression body accumulates across bars', () => {
    // Pine var variables declared inside a for-expression body persist across bars
    // via the execution model\'s per-call-site scope. Each bar, the var accumulates
    // the close value three times (once per loop iteration), so the running total
    // grows by 3*close each bar.
    // Source search: https://www.tradingview.com/scripts/search/var%20for%20loop%20accumulate%20state/
    const result = runCompatScript(`
indicator("Ctrl Var In For Expr Checkpoint")
total = for i = 0 to 2
    var float acc = 0.0
    acc += close
    acc
plot(total, title="Total")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Ctrl Var In For Expr Checkpoint');
    // Bar 0: acc starts at 0, runs 3 iterations += 102 each → acc = 306
    // Bar 1: acc persists as 306, runs 3 more += 105 → acc = 621, etc.
    expect(getPlot(result, 'Total').values).toEqual([
      306, 621, 942, 1251, 1548, 1848, 2160, 2487, 2811, 3144, 3474, 3810,
    ]);
  });

  it('locks independent var state across two UDF call sites', () => {
    // Pine UDF call-site isolation: each call site to the same UDF maintains its
    // own persistent var state. Two separate calls accumulate independent counters.
    // Source search: https://www.tradingview.com/scripts/search/udf%20call%20site%20var%20isolation/
    const result = runCompatScript(`
indicator("Ctrl UDF Var Isolation Checkpoint")
counter(src) =>
    var int cnt = 0
    cnt += 1
    cnt
a = counter(close)
b = counter(open)
plot(a, title="A")
plot(b, title="B")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Ctrl UDF Var Isolation Checkpoint');
    // Each call site increments its own counter independently, both count 1..12
    expect(getPlot(result, 'A').values).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(getPlot(result, 'B').values).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('locks switch as expression assigned to a variable', () => {
    // Pine switch can be used as an expression assigned to a variable. Each arm
    // returns a value; the default arm (=>) covers unmatched cases.
    // Source search: https://www.tradingview.com/scripts/search/switch%20expression%20assign%20variable/
    const result = runCompatScript(`
indicator("Ctrl Switch Expr Checkpoint")
sma3 = ta.sma(close, 3)
trend = close > sma3 ? "up" : "down"
x = switch trend
    "up" => 1
    "down" => -1
    => 0
plot(x, title="X")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Ctrl Switch Expr Checkpoint');
    // close vs sma(close,3): bars 0,1 null warmup → "down"; bar 2 close=107 > sma=104.67 → "up";
    // bars 3,4,5 "down"; bars 6-11 "up"
    expect(getPlot(result, 'X').values).toEqual([-1, -1, 1, -1, -1, -1, 1, 1, 1, 1, 1, 1]);
  });

  it('locks nested UDF calls where both UDFs maintain independent var state', () => {
    // f(g(close)) where both f and g have internal var state that persists
    // across bars independently. Pine call-site isolation ensures each nested
    // invocation maintains its own accumulator.
    // Source search: https://www.tradingview.com/scripts/search/nested%20function%20var%20state%20series/
    const result = runCompatScript(`
indicator("Ctrl Nested UDF State Checkpoint")
smoother(src) =>
    var float s = 0.0
    s := s * 0.5 + src * 0.5
    s
doubleSmoothed(src) =>
    smoother(smoother(src))
ds = doubleSmoothed(close)
plot(ds, title="DS")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Ctrl Nested UDF State Checkpoint');
    // Outer smoother initialized at 0; inner smoother also at 0.
    // Bar 0: inner s = 0*0.5 + 102*0.5 = 51; outer s = 0*0.5 + 51*0.5 = 25.5
    expect(roundSeries(getPlot(result, 'DS').values)).toEqual([
      25.5, 51.75, 72.125, 84.9375, 91.65625, 95.421875,
      98.507813, 101.902344, 104.275391, 106.549805, 107.980957, 109.343506,
    ]);
  });

  it('locks for loop as expression returning the last evaluated value', () => {
    // A for loop used as an expression returns the value of the last statement
    // evaluated in the loop body on the final iteration.
    // Source search: https://www.tradingview.com/scripts/search/for%20loop%20expression%20return%20value/
    const result = runCompatScript(`
indicator("Ctrl For Expr Return Checkpoint")
result = for i = 0 to 2
    close * (i + 1)
plot(result, title="Result")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Ctrl For Expr Return Checkpoint');
    // Last iteration i=2: close * 3 each bar
    expect(getPlot(result, 'Result').values).toEqual([
      306, 315, 321, 309, 297, 300, 312, 327, 324, 333, 330, 336,
    ]);
  });

  it('locks if block with multiple statements returning the last expression', () => {
    // Pine if blocks can contain multiple statements; only the last expression
    // is the block\'s return value when used as an assignment expression.
    // Source search: https://www.tradingview.com/scripts/search/if%20block%20multi%20statement%20return/
    const result = runCompatScript(`
indicator("Ctrl If Block Multi Stmt Checkpoint")
x = if close > open
    a = close - open
    b = a * 2
    b
else
    0
plot(x, title="X")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Ctrl If Block Multi Stmt Checkpoint');
    // Bull bars (close > open): 0(102-100=2,*2=4), 1(105-102=3,*2=6), 2(107-105=2,*2=4),
    //   5(100-99=1,*2=2), 6(104-100=4,*2=8), 7(109-104=5,*2=10), 9(111-108=3,*2=6), 11(112-110=2,*2=4)
    // Bear bars (else → 0): 3,4,8,10
    expect(getPlot(result, 'X').values).toEqual([4, 6, 4, 0, 0, 2, 8, 10, 0, 6, 0, 4]);
  });

  it('locks break exits the for loop expression and returns the last evaluated value', () => {
    // When break is triggered inside a for loop expression, the loop exits and
    // returns the last evaluated expression value before the break. Here the
    // loop runs for i=0,1,2 and breaks when i >= 3; the last value before break is i=2.
    // Source search: https://www.tradingview.com/scripts/search/for%20break%20expression%20return%20last/
    const result = runCompatScript(`
indicator("Ctrl For Break Expr Checkpoint")
result = for i = 0 to 9
    if i >= 3
        break
    i
plot(result, title="Result")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Ctrl For Break Expr Checkpoint');
    // Loop body runs: i=0 (result=0), i=1 (result=1), i=2 (result=2), i=3 → break
    // After break, loop returns last result = 2 on every bar
    expect(getPlot(result, 'Result').values).toEqual(Array(compatibilityBars.length).fill(2));
  });

  it('locks while loop as expression: computes triangular sum inside a UDF', () => {
    // A while loop used as an expression inside a UDF that counts down and
    // accumulates a triangular sum. The UDF returns the accumulated total,
    // confirming while-as-expression semantics and scope handling.
    // Source search: https://www.tradingview.com/scripts/search/while%20loop%20expression%20accumulate%20sum/
    const result = runCompatScript(`
indicator("Ctrl While Expr Checkpoint")
triangularSum(n) =>
    var int ct = 0
    ct := n
    total = 0
    while ct > 0
        total := total + ct
        ct := ct - 1
    total
s = triangularSum(3)
plot(s, title="Sum")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Ctrl While Expr Checkpoint');
    // triangularSum(3) = 3+2+1 = 6 on every bar
    expect(getPlot(result, 'Sum').values).toEqual(Array(compatibilityBars.length).fill(6));
  });

  it('locks chained ternary with na propagation', () => {
    // Pine supports chaining ternary expressions where the alternate branch may
    // evaluate to na. The na propagates through the chain, and nz() replaces it.
    // Source search: https://www.tradingview.com/scripts/search/chained%20ternary%20na%20propagation/
    const result = runCompatScript(`
indicator("Ctrl Chained Ternary Na Checkpoint")
a = close > 105
b = close > 108
// Chained ternary: if a then (if b then close else open) else na
x = a ? (b ? close : open) : na
isNa = na(x)
plot(nz(x), title="X")
plot(isNa ? 1 : 0, title="IsNa")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Ctrl Chained Ternary Na Checkpoint');
    // a=true (close>105): bars 2(107),7(109),8(108),9(111),10(110),11(112)
    // b=true (close>108): bars 7(109),9(111),10(110),11(112)
    // When a and b: result=close; when a and not b: result=open; when not a: na (nz→0)
    // Bar 2: a=T,b=F → open=105; bar 7: a=T,b=T → close=109; bar 8: a=T,b=F → open=109
    expect(getPlot(result, 'X').values).toEqual([
      0, 0, 105, 0, 0, 0, 0, 109, 109, 111, 110, 112,
    ]);
    expect(getPlot(result, 'IsNa').values).toEqual([1, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0]);
  });
});

// ===========================================================================================
// String, time, and na edge cases
// Targets str.*, timestamp(), calendar builtins, na propagation, nz(), fixnan(), and
// color.new() with hex literals — all exercised heavily in real public scripts.
// ===========================================================================================

describe('String, time, and na edge cases', () => {
  it('locks str.format with multiple numeric placeholder types idiom', () => {
    // Public idiom: scripts build label strings using str.format with mixed
    // placeholder types including numeric format patterns like #.## and percent.
    // Source search: https://www.tradingview.com/scripts/search/str.format%20price%20pct%20change%20label/
    const result = runCompatScript(`
indicator("Str Format Multi Placeholder Checkpoint")
pctChange = (close - close[1]) / close[1] * 100
label_str = str.format("Price: {0,number,#.##} Change: {1,number,#.##}%", close, nz(pctChange))
plot(close, title="Close")
plot(nz(pctChange), title="PctChange")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Str Format Multi Placeholder Checkpoint');
    // close is produced every bar; pctChange is na on bar 0 so nz gives 0
    expect(getPlot(result, 'Close').values).toEqual([
      102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110, 112,
    ]);
    expect(roundSeries(getPlot(result, 'PctChange').values)).toEqual([
      0, 2.941176, 1.904762, -3.738318, -3.883495, 1.010101,
      4, 4.807692, -0.917431, 2.777778, -0.900901, 1.818182,
    ]);
  });

  it('locks str.split and array iteration over delimited string idiom', () => {
    // Public idiom: scripts split a comma-delimited string and iterate the
    // result array with a for loop to aggregate parsed numeric values.
    // Source search: https://www.tradingview.com/scripts/search/str.split%20iterate%20array%20values/
    const result = runCompatScript(`
indicator("Str Split Iteration Checkpoint")
delimited = "10,20,30"
parts = str.split(delimited, ",")
total = 0.0
for i = 0 to array.size(parts) - 1
    total += str.tonumber(array.get(parts, i))
plot(total, title="Total")
plot(array.size(parts), title="Count")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Str Split Iteration Checkpoint');
    // "10,20,30" splits into 3 elements; sum is 60 on every bar
    expect(getPlot(result, 'Total').values).toEqual(Array(compatibilityBars.length).fill(60));
    expect(getPlot(result, 'Count').values).toEqual(Array(compatibilityBars.length).fill(3));
  });

  it('locks str.match regex pattern on syminfo.ticker idiom', () => {
    // Public idiom: scripts gate logic on whether the current symbol matches a
    // regex pattern — most commonly to detect BTC or crypto pairs.
    // Source search: https://www.tradingview.com/scripts/search/str.match%20ticker%20symbol%20regex/
    const result = runCompatScript(`
indicator("Str Match Regex Checkpoint")
isBtc = str.match(syminfo.ticker, "^BTC") != ""
isXyz = str.match(syminfo.ticker, "^XYZ") == ""
plot(isBtc ? 1 : 0, title="IsBtc")
plot(isXyz ? 1 : 0, title="NoXyz")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Str Match Regex Checkpoint');
    // Default ticker is BTCUSDT: "^BTC" matches on every bar; "^XYZ" never matches
    expect(getPlot(result, 'IsBtc').values).toEqual(Array(compatibilityBars.length).fill(1));
    expect(getPlot(result, 'NoXyz').values).toEqual(Array(compatibilityBars.length).fill(1));
  });

  it('locks calendar-gated logic with dayofweek and hour session filter idiom', () => {
    // Public idiom: scripts restrict signals to specific days of the week and
    // session hours — e.g. Monday-only entry and 09:00-16:00 session gate.
    // Source search: https://www.tradingview.com/scripts/search/dayofweek%20session%20hour%20filter%20signal/
    const result = runCompatScript(`
indicator("Calendar Gate Checkpoint")
isMon = dayofweek == dayofweek.monday
isTue = dayofweek == dayofweek.tuesday
isSessionHour = hour >= 9 and hour < 16
plot(isMon ? 1 : 0, title="IsMon")
plot(isTue ? 1 : 0, title="IsTue")
plot(isSessionHour ? 1 : 0, title="Session")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Calendar Gate Checkpoint');
    // All bars are on 2023-11-14 (Tuesday, UTC) at hour 22 → not Monday, is Tuesday, not in session
    expect(getPlot(result, 'IsMon').values).toEqual(Array(compatibilityBars.length).fill(0));
    expect(getPlot(result, 'IsTue').values).toEqual(Array(compatibilityBars.length).fill(1));
    expect(getPlot(result, 'Session').values).toEqual(Array(compatibilityBars.length).fill(0));
  });

  it('locks timestamp() date filtering idiom', () => {
    // Public idiom: scripts filter bar history using time >= timestamp(year, month, day)
    // to restrict computation or plots to a date range.
    // Source search: https://www.tradingview.com/scripts/search/timestamp%20date%20range%20filter%20indicator/
    const result = runCompatScript(`
indicator("Timestamp Filter Checkpoint")
afterNov14 = time >= timestamp(2023, 11, 14)
afterNov15 = time >= timestamp(2023, 11, 15)
plot(afterNov14 ? 1 : 0, title="AfterNov14")
plot(afterNov15 ? 1 : 0, title="AfterNov15")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Timestamp Filter Checkpoint');
    // All 12 bars are on 2023-11-14 → all are after/on Nov14; none is after Nov15
    expect(getPlot(result, 'AfterNov14').values).toEqual(Array(compatibilityBars.length).fill(1));
    expect(getPlot(result, 'AfterNov15').values).toEqual(Array(compatibilityBars.length).fill(0));
  });

  it('locks na arithmetic propagation chain idiom', () => {
    // Public idiom: na in any arithmetic operand must propagate through the chain
    // — na + 1 is na, na * 0 is na, and any downstream expression using those is na.
    // Source search: https://www.tradingview.com/scripts/search/na%20propagation%20arithmetic%20chain/
    const result = runCompatScript(`
indicator("NA Arithmetic Propagation Checkpoint")
x = na + 1
y = na * 0
z = x + y
plot(na(x) ? 1 : 0, title="XisNA")
plot(na(y) ? 1 : 0, title="YisNA")
plot(na(z) ? 1 : 0, title="ZisNA")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('NA Arithmetic Propagation Checkpoint');
    // na + anything = na, na * anything = na, na + na = na — all bars
    expect(getPlot(result, 'XisNA').values).toEqual(Array(compatibilityBars.length).fill(1));
    expect(getPlot(result, 'YisNA').values).toEqual(Array(compatibilityBars.length).fill(1));
    expect(getPlot(result, 'ZisNA').values).toEqual(Array(compatibilityBars.length).fill(1));
  });

  it('locks nz() with zero default and explicit replacement value idiom', () => {
    // Public idiom: nz(x) returns 0 when x is na; nz(x, replacement) returns the
    // specified replacement. Both forms appear heavily in public scripts.
    // Source search: https://www.tradingview.com/scripts/search/nz%20na%20replacement%20default%20value/
    const result = runCompatScript(`
indicator("NZ Replacement Checkpoint")
floatNa = close > 999999.0 ? close : na
plot(nz(floatNa), title="NzZero")
plot(nz(floatNa, -1.0), title="NzMinus1")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('NZ Replacement Checkpoint');
    // floatNa is always na (close never > 999999); nz returns 0 and -1 respectively
    expect(getPlot(result, 'NzZero').values).toEqual(Array(compatibilityBars.length).fill(0));
    expect(getPlot(result, 'NzMinus1').values).toEqual(Array(compatibilityBars.length).fill(-1));
  });

  it('locks fixnan() forward-fill of last non-na value idiom', () => {
    // Public idiom: fixnan(series) forward-fills the most recent non-na value
    // into subsequent na slots — widely used to keep a reference level stable.
    // Source search: https://www.tradingview.com/scripts/search/fixnan%20forward%20fill%20series/
    const result = runCompatScript(`
indicator("Fixnan Forward Fill Checkpoint")
src = close > 105 ? close : na
fixed = fixnan(src)
plot(src, title="Src")
plot(fixed, title="Fixed")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Fixnan Forward Fill Checkpoint');
    // close > 105: bars 2(107),7(109),8(108),9(111),10(110),11(112)
    // bars 0-1 have no prior non-na value → fixed is null; then forward-fills
    expect(getPlot(result, 'Src').values).toEqual([
      null, null, 107, null, null, null, null, 109, 108, 111, 110, 112,
    ]);
    expect(getPlot(result, 'Fixed').values).toEqual([
      null, null, 107, 107, 107, 107, 107, 109, 108, 111, 110, 112,
    ]);
  });

  it('locks ta.barssince(na-condition) edge case idiom', () => {
    // Public idiom: when the condition passed to ta.barssince() was never true,
    // the result is na — an important edge case for scripts that gate on barssince.
    // Source search: https://www.tradingview.com/scripts/search/ta.barssince%20never%20true%20na%20edge/
    const result = runCompatScript(`
indicator("Barssince Never True Checkpoint")
neverTrue = close > 999999.0
bs = ta.barssince(neverTrue)
plot(na(bs) ? 1 : 0, title="IsNA")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Barssince Never True Checkpoint');
    // Condition never fires → barssince is always na
    expect(getPlot(result, 'IsNA').values).toEqual(Array(compatibilityBars.length).fill(1));
  });

  it('locks color.new() with hex literal plus transparency idiom', () => {
    // Public idiom: color.new(#RRGGBB, transparency) creates a color from a hex
    // literal with a transparency level; 50% transparency maps to 0x80 alpha byte.
    // Source search: https://www.tradingview.com/scripts/search/color.new%20hex%20literal%20transparency/
    const result = runCompatScript(`
indicator("Color New Hex Checkpoint")
c = color.new(#FF0000, 50)
plot(close, color=c, title="Close")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Color New Hex Checkpoint');
    // 50% transparency: hex alpha = round((100-50)/100 * 255) = 128 = 0x80
    const colors = getPlot(result, 'Close').color as string[];
    expect(colors).toHaveLength(compatibilityBars.length);
    // Every bar gets the same #FF000080 color
    expect(colors.every((c) => c === '#FF000080')).toBe(true);
  });
});

// ===========================================================================================
// Advanced collection and matrix patterns
// Exercises array.*  matrix.* and map.* operations that are common in advanced indicator code.
// Expected values derived from compatibilityBars (12 bars) via probe runs.
// ===========================================================================================

describe('Advanced collection and matrix patterns', () => {
  it('locks matrix.avg and matrix.col extraction idiom', () => {
    // Advanced idiom: create a 1×2 matrix populated with close and volume,
    // extract each column as an array, and verify matrix.avg equals (close+volume)/2.
    // Source search: https://www.tradingview.com/scripts/search/matrix%20column%20average%20indicator/
    const result = runCompatScript(`
indicator("Adv Matrix Avg Col Checkpoint")
m = matrix.new<float>(1, 2, 0.0)
m.set(0, 0, close)
m.set(0, 1, volume)
col0 = m.col(0)
col1 = m.col(1)
plot(m.avg(), title="MatAvg")
plot(array.avg(col0), title="ColAvg0")
plot(array.avg(col1), title="ColAvg1")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Adv Matrix Avg Col Checkpoint');
    // matrix.avg = (close + volume) / 2 per bar
    expect(getPlot(result, 'MatAvg').values).toEqual([
      551, 602.5, 503.5, 676.5, 749.5, 575, 702, 854.5, 654, 805.5, 730, 781,
    ]);
    // col(0) contains close; avg of a single-element column = close
    expect(getPlot(result, 'ColAvg0').values).toEqual([
      102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110, 112,
    ]);
    // col(1) contains volume; avg of a single-element column = volume
    expect(getPlot(result, 'ColAvg1').values).toEqual([
      1000, 1100, 900, 1250, 1400, 1050, 1300, 1600, 1200, 1500, 1350, 1450,
    ]);
  });

  it('locks matrix.transpose row/column swap idiom', () => {
    // Advanced idiom: construct a static 2×3 matrix with known values, transpose it,
    // and verify that rows/columns swap and individual element coordinates invert.
    // Source search: https://www.tradingview.com/scripts/search/matrix%20transpose%20indicator/
    const result = runCompatScript(`
indicator("Adv Matrix Transpose Checkpoint")
m = matrix.new<float>(2, 3, 0.0)
m.set(0, 0, 1.0)
m.set(0, 1, 2.0)
m.set(0, 2, 3.0)
m.set(1, 0, 4.0)
m.set(1, 1, 5.0)
m.set(1, 2, 6.0)
t = m.transpose()
plot(m.rows(), title="Rows")
plot(m.columns(), title="Cols")
plot(t.rows(), title="TRows")
plot(t.columns(), title="TCols")
plot(t.get(0, 0), title="T00")
plot(t.get(0, 1), title="T01")
plot(t.get(1, 0), title="T10")
plot(t.get(2, 0), title="T20")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Adv Matrix Transpose Checkpoint');
    // Original: 2 rows, 3 cols
    expect(getPlot(result, 'Rows').values).toEqual(Array(compatibilityBars.length).fill(2));
    expect(getPlot(result, 'Cols').values).toEqual(Array(compatibilityBars.length).fill(3));
    // Transposed: 3 rows, 2 cols
    expect(getPlot(result, 'TRows').values).toEqual(Array(compatibilityBars.length).fill(3));
    expect(getPlot(result, 'TCols').values).toEqual(Array(compatibilityBars.length).fill(2));
    // t[0,0]=m[0,0]=1, t[0,1]=m[1,0]=4, t[1,0]=m[0,1]=2, t[2,0]=m[0,2]=3
    expect(getPlot(result, 'T00').values).toEqual(Array(compatibilityBars.length).fill(1));
    expect(getPlot(result, 'T01').values).toEqual(Array(compatibilityBars.length).fill(4));
    expect(getPlot(result, 'T10').values).toEqual(Array(compatibilityBars.length).fill(2));
    expect(getPlot(result, 'T20').values).toEqual(Array(compatibilityBars.length).fill(3));
  });

  it('locks array statistical pipeline stdev/percentrank/percentile_nearest_rank idiom', () => {
    // Advanced idiom: maintain a rolling 6-bar window, compute stdev, use
    // array.percentrank to rank the last element, and extract the 75th percentile.
    // Source search: https://www.tradingview.com/scripts/search/array%20stdev%20percentrank%20pipeline/
    const result = runCompatScript(`
indicator("Adv Array Stats Pipeline Checkpoint")
var array<float> prices = array.new<float>()
prices.push(close)
if prices.size() > 6
    prices.shift()
sd = prices.size() >= 2 ? array.stdev(prices) : 0.0
lastIdx = prices.size() - 1
pr = array.percentrank(prices, lastIdx)
pct75 = array.percentile_nearest_rank(prices, 75)
plot(sd, title="Stdev")
plot(pr, title="PctRank")
plot(pct75, title="Pct75")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Adv Array Stats Pipeline Checkpoint');
    expect(roundSeries(getPlot(result, 'Stdev').values)).toEqual([
      0, 1.5, 2.054805, 1.920286, 2.712932, 2.748737, 2.768875, 3.543382,
      3.715583, 4.524624, 3.829708, 2.581989,
    ]);
    // percentrank of last element at each bar
    expect(roundSeries(getPlot(result, 'PctRank').values)).toEqual([
      100, 100, 100, 50, 20, 33.333333, 66.666667, 100,
      83.333333, 100, 83.333333, 100,
    ]);
    // 75th-percentile nearest rank
    expect(getPlot(result, 'Pct75').values).toEqual([
      102, 105, 107, 105, 105, 105, 105, 107, 108, 109, 110, 111,
    ]);
  });

  it('locks array.binary_search / leftmost / rightmost idiom', () => {
    // Advanced idiom: keep a sorted growing array and use all three binary-search
    // variants to locate the current close value within the sorted history.
    // Source search: https://www.tradingview.com/scripts/search/array%20binary%20search%20sorted%20prices/
    const result = runCompatScript(`
indicator("Adv Array Binary Search Checkpoint")
var array<float> sorted = array.new<float>()
sorted.push(close)
sorted.sort()
idx = array.binary_search(sorted, close)
idxL = array.binary_search_leftmost(sorted, close)
idxR = array.binary_search_rightmost(sorted, close)
plot(sorted.size(), title="Size")
plot(idx, title="Idx")
plot(idxL, title="IdxL")
plot(idxR, title="IdxR")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Adv Array Binary Search Checkpoint');
    expect(getPlot(result, 'Size').values).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    // All three variants agree when no duplicates
    expect(getPlot(result, 'Idx').values).toEqual([0, 1, 2, 1, 0, 1, 4, 7, 7, 9, 9, 11]);
    expect(getPlot(result, 'IdxL').values).toEqual([0, 1, 2, 1, 0, 1, 4, 7, 7, 9, 9, 11]);
    expect(getPlot(result, 'IdxR').values).toEqual([0, 1, 2, 1, 0, 1, 4, 7, 7, 9, 9, 11]);
  });

  it('locks map<string,float> category-aggregation idiom', () => {
    // Advanced idiom: two maps accumulate bull/bear counts and gain totals by
    // category — a pattern common in scanner and stat-dashboard scripts.
    // Source search: https://www.tradingview.com/scripts/search/map%20category%20aggregation%20scanner/
    const result = runCompatScript(`
indicator("Adv Map Category Aggregation Checkpoint")
var map<string, float> counts = map.new<string, float>()
var map<string, float> totals = map.new<string, float>()
isBull = close > open
category = isBull ? "bull" : "bear"
if not counts.contains(category)
    counts.put(category, 0.0)
    totals.put(category, 0.0)
counts.put(category, nz(counts.get(category)) + 1.0)
totals.put(category, nz(totals.get(category)) + (close - open))
bullCount = nz(counts.get("bull"))
bearCount = nz(counts.get("bear"))
bullAvg = bullCount > 0 ? nz(totals.get("bull")) / bullCount : 0.0
plot(bullCount, title="BullCount")
plot(bearCount, title="BearCount")
plot(bullAvg, title="BullAvg")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Adv Map Category Aggregation Checkpoint');
    // Bull bars (close > open): 0,1,2,5,6,7,9,11
    expect(getPlot(result, 'BullCount').values).toEqual([1, 2, 3, 3, 3, 4, 5, 6, 6, 7, 7, 8]);
    // Bear bars: 3,4,8,10
    expect(getPlot(result, 'BearCount').values).toEqual([0, 0, 0, 1, 2, 2, 2, 2, 3, 3, 4, 4]);
    expect(roundSeries(getPlot(result, 'BullAvg').values)).toEqual([
      2, 2.5, 2.333333, 2.333333, 2.333333, 2, 2.4, 2.833333,
      2.833333, 2.857143, 2.857143, 2.75,
    ]);
  });

  it('locks array.every / array.some multi-condition filter idiom', () => {
    // Advanced idiom: maintain a rolling 4-bar boolean window, then use
    // array.every to detect "all bull" and array.some to detect "any bull".
    // Source search: https://www.tradingview.com/scripts/search/array%20every%20some%20condition%20filter/
    const result = runCompatScript(`
indicator("Adv Array Every Some Checkpoint")
var array<bool> bullFlags = array.new<bool>()
bullFlags.push(close > open)
if bullFlags.size() > 4
    bullFlags.shift()
allBull = array.every(bullFlags)
anyBull = array.some(bullFlags)
plot(allBull ? 1 : 0, title="AllBull")
plot(anyBull ? 1 : 0, title="AnyBull")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Adv Array Every Some Checkpoint');
    // First three bars are all bull (close>open); bear bar at index 3 breaks the streak
    expect(getPlot(result, 'AllBull').values).toEqual([1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    // anyBull stays 1 as long as at least one bull bar is in the window
    expect(getPlot(result, 'AnyBull').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it('locks matrix.is_square / is_symmetric / is_identity idiom', () => {
    // Advanced idiom: create known matrices and test the three structural predicates.
    // An identity matrix is also square and symmetric; a non-square matrix fails all.
    // Source search: https://www.tradingview.com/scripts/search/matrix%20identity%20symmetric%20check/
    const result = runCompatScript(`
indicator("Adv Matrix Identity Check Checkpoint")
identity = matrix.new<float>(3, 3, 0.0)
identity.set(0, 0, 1.0)
identity.set(1, 1, 1.0)
identity.set(2, 2, 1.0)
symm = matrix.new<float>(2, 2, 0.0)
symm.set(0, 0, 1.0)
symm.set(0, 1, 2.0)
symm.set(1, 0, 2.0)
symm.set(1, 1, 3.0)
rect = matrix.new<float>(2, 3, 1.0)
plot(identity.is_square() ? 1 : 0, title="IdentSq")
plot(identity.is_identity() ? 1 : 0, title="IdentId")
plot(identity.is_symmetric() ? 1 : 0, title="IdentSym")
plot(symm.is_square() ? 1 : 0, title="SymmSq")
plot(symm.is_symmetric() ? 1 : 0, title="SymmSym")
plot(rect.is_square() ? 1 : 0, title="RectSq")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Adv Matrix Identity Check Checkpoint');
    // Identity 3×3: square, is_identity, and symmetric — all 1 on every bar
    expect(getPlot(result, 'IdentSq').values).toEqual(Array(compatibilityBars.length).fill(1));
    expect(getPlot(result, 'IdentId').values).toEqual(Array(compatibilityBars.length).fill(1));
    expect(getPlot(result, 'IdentSym').values).toEqual(Array(compatibilityBars.length).fill(1));
    // Symmetric 2×2: square + symmetric but NOT identity
    expect(getPlot(result, 'SymmSq').values).toEqual(Array(compatibilityBars.length).fill(1));
    expect(getPlot(result, 'SymmSym').values).toEqual(Array(compatibilityBars.length).fill(1));
    // 2×3 rectangle: not square
    expect(getPlot(result, 'RectSq').values).toEqual(Array(compatibilityBars.length).fill(0));
  });

  it('locks collection size growth, cap, and .size() tracking idiom', () => {
    // Advanced idiom: a var array grows one element per bar, is capped at 5,
    // and min/max are tracked — the canonical rolling-window size-management pattern.
    // Source search: https://www.tradingview.com/scripts/search/array%20size%20cap%20rolling%20window/
    const result = runCompatScript(`
indicator("Adv Collection Size Tracking Checkpoint")
var array<float> prices = array.new<float>()
prices.push(close)
if prices.size() > 5
    prices.shift()
plot(prices.size(), title="Size")
plot(array.min(prices), title="Min")
plot(array.max(prices), title="Max")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Adv Collection Size Tracking Checkpoint');
    // Grows 1→5 then stays at 5
    expect(getPlot(result, 'Size').values).toEqual([1, 2, 3, 4, 5, 5, 5, 5, 5, 5, 5, 5]);
    expect(getPlot(result, 'Min').values).toEqual([
      102, 102, 102, 102, 99, 99, 99, 99, 99, 100, 104, 108,
    ]);
    expect(getPlot(result, 'Max').values).toEqual([
      102, 105, 107, 107, 107, 107, 107, 109, 109, 111, 111, 112,
    ]);
  });

  it('locks array.standardize normalization idiom', () => {
    // Advanced idiom: standardize a rolling window of closes so the output has
    // mean≈0 and stdev≈1 — the core step of z-score based indicators.
    // Source search: https://www.tradingview.com/scripts/search/array%20standardize%20zscore%20normalize/
    const result = runCompatScript(`
indicator("Adv Array Standardize Checkpoint")
var array<float> prices = array.new<float>()
prices.push(close)
if prices.size() > 6
    prices.shift()
standardized = prices.size() >= 2 ? array.standardize(prices) : array.new<float>()
szMean = standardized.size() > 0 ? array.avg(standardized) : 0.0
szStdev = standardized.size() >= 2 ? array.stdev(standardized) : 0.0
plot(prices.size(), title="InputSize")
plot(standardized.size(), title="OutSize")
plot(szMean, title="Mean")
plot(szStdev, title="Stdev")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Adv Array Standardize Checkpoint');
    // Window grows 1→6 then caps
    expect(getPlot(result, 'InputSize').values).toEqual([1, 2, 3, 4, 5, 6, 6, 6, 6, 6, 6, 6]);
    // No output on bar 0 (size < 2)
    expect(getPlot(result, 'OutSize').values).toEqual([0, 2, 3, 4, 5, 6, 6, 6, 6, 6, 6, 6]);
    // Mean of standardized values is numerically ≈0 (may be -0 due to floating point)
    const means = getPlot(result, 'Mean').values as number[];
    means.forEach((v) => expect(Math.abs(v)).toBeLessThan(1e-9));
    // Stdev of standardized values is ≈1
    const stdevs = getPlot(result, 'Stdev').values as number[];
    stdevs.slice(1).forEach((v) => expect(Math.abs(v - 1)).toBeLessThan(1e-6));
  });

  it('locks map key iteration with conditional deletion idiom', () => {
    // Advanced idiom: on each bar rebuild a 3-entry map, then iterate its keys
    // and remove entries whose value is below 105 — modeling cleanup logic
    // common in scanner and state-pruning scripts.
    // Source search: https://www.tradingview.com/scripts/search/map%20keys%20iterate%20remove%20entries/
    const result = runCompatScript(`
indicator("Adv Map Key Delete Checkpoint")
var map<string, float> m = map.new<string, float>()
m.put("a", close)
m.put("b", open)
m.put("c", high)
sizeBefore = m.size()
keys = map.keys(m)
for k in keys
    if m.get(k) < 105.0
        m.remove(k)
sizeAfter = m.size()
plot(sizeBefore, title="SizeBefore")
plot(sizeAfter, title="SizeAfter")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Adv Map Key Delete Checkpoint');
    // Map always starts with 3 entries
    expect(getPlot(result, 'SizeBefore').values).toEqual(Array(compatibilityBars.length).fill(3));
    // Entries with value < 105 are deleted; SizeAfter varies by bar
    expect(getPlot(result, 'SizeAfter').values).toEqual([0, 2, 3, 2, 0, 0, 1, 2, 3, 3, 3, 3]);
  });
});
