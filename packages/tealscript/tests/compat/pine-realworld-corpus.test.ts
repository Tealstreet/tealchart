import { describe, expect, it } from 'vitest';

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

  // Trailing comma in function call args is NOT supported by the grammar.
  // ta.sma(close, 5,) throws a parse error because ParameterList does not accept
  // a bare trailing comma in the ArgumentList rule.
  // Skipped: gap documented in PINE_V6_REFERENCE_GAP.md under "Real-World Corpus Gaps — Edge Cases".
  it.skip('trailing comma in function call args', () => {
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
