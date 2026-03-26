/**
 * Built-in Indicators Registry
 *
 * Defines the available indicators that can be added to charts.
 * Each indicator has a name, category, and Tealscript code (or jailbreak metadata).
 */

/**
 * Input definition for jailbreak (canvas-drawing) indicators.
 * Maps to InputDefinition from @tealstreet/tealscript for the settings UI.
 */
export interface JailbreakInputDefinition {
  id: string;
  name: string;
  type: 'int' | 'float' | 'bool' | 'string' | 'color';
  defval: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

/**
 * Jailbreak indicator metadata.
 * Jailbreak indicators render directly on canvas via BarsIndicator subclasses,
 * bypassing the tealscript worker pipeline.
 */
export interface JailbreakIndicatorMeta {
  /** Input definitions for the settings UI */
  inputs: JailbreakInputDefinition[];
  /** Default input values */
  defaults: Record<string, unknown>;
  /** Palette colors (key -> display name + default color) */
  palette?: Record<string, { name: string; defaultColor: string }>;
  /** Whether to render behind candles by default */
  behindCandles?: boolean;
}

export interface BuiltinIndicator {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Category for grouping in the UI */
  category: 'tealstreet' | 'trend' | 'momentum' | 'volatility' | 'volume' | 'other';
  /** Short description */
  description?: string;
  /** Whether this indicator overlays on the price chart */
  overlay: boolean;
  /** Fixed Y-axis range for non-overlay indicators (e.g., RSI: 0-100) */
  yAxisRange?: { min: number; max: number };
  /** Tealscript code (empty string for jailbreak indicators) */
  code: string;
  /** If set, this is a jailbreak (canvas-drawing) indicator, not a tealscript one */
  jailbreak?: JailbreakIndicatorMeta;
}

/**
 * Tealstreet custom indicators (placeholders for now)
 */
const TEALSTREET_INDICATORS: BuiltinIndicator[] = [
  {
    id: 'dwmo',
    name: 'DWMO',
    category: 'tealstreet',
    description: 'Daily / Weekly / Monthly / Yearly Opens + Monday High/Low',
    overlay: true,
    code: '',
    jailbreak: {
      inputs: [
        { id: 'globalOpacity', name: 'Global Opacity', type: 'float', defval: 1, min: 0.05, max: 1, step: 0.01 },
        { id: 'lineWidth', name: 'Line Width', type: 'float', defval: 1, min: 1, max: 5, step: 0.5 },
        { id: 'labelFontSize', name: 'Label Font Size', type: 'float', defval: 11, min: 8, max: 40, step: 1 },
        { id: 'showLabels', name: 'Show Labels', type: 'bool', defval: true },
        { id: 'showDailyOpen', name: 'Show Daily Open', type: 'bool', defval: true },
        { id: 'showWeeklyOpen', name: 'Show Weekly Open', type: 'bool', defval: true },
        { id: 'showMonthlyOpen', name: 'Show Monthly Open', type: 'bool', defval: true },
        { id: 'showYearlyOpen', name: 'Show Yearly Open', type: 'bool', defval: true },
        { id: 'showMondayHigh', name: 'Show Monday High', type: 'bool', defval: false },
        { id: 'showMondayLow', name: 'Show Monday Low', type: 'bool', defval: false },
        { id: 'showPreviousDailyOpen', name: 'Show Previous Daily Open', type: 'bool', defval: false },
        { id: 'showPreviousWeeklyOpen', name: 'Show Previous Weekly Open', type: 'bool', defval: false },
        { id: 'showPreviousMonthlyOpen', name: 'Show Previous Monthly Open', type: 'bool', defval: false },
        { id: 'showPreviousYearlyOpen', name: 'Show Previous Yearly Open', type: 'bool', defval: false },
        { id: 'behindCandles', name: 'Behind Candles', type: 'bool', defval: false },
      ],
      defaults: {
        globalOpacity: 1,
        lineWidth: 1,
        labelFontSize: 11,
        showLabels: true,
        showDailyOpen: true,
        showWeeklyOpen: true,
        showMonthlyOpen: true,
        showYearlyOpen: true,
        showMondayHigh: false,
        showMondayLow: false,
        showPreviousDailyOpen: false,
        showPreviousWeeklyOpen: false,
        showPreviousMonthlyOpen: false,
        showPreviousYearlyOpen: false,
        behindCandles: false,
      },
      palette: {
        daily: { name: 'Daily Open', defaultColor: 'rgba(56, 189, 248, 0.95)' },
        weekly: { name: 'Weekly Open', defaultColor: 'rgba(52, 211, 153, 0.95)' },
        monthly: { name: 'Monthly Open', defaultColor: 'rgba(251, 146, 60, 0.95)' },
        yearly: { name: 'Yearly Open', defaultColor: 'rgba(239, 83, 80, 0.95)' },
        mondayHigh: { name: 'Monday High', defaultColor: 'rgba(255, 112, 67, 0.95)' },
        mondayLow: { name: 'Monday Low', defaultColor: 'rgba(66, 165, 245, 0.95)' },
      },
      behindCandles: false,
    },
  },
  {
    id: 'sessionBoxes',
    name: 'Session Boxes',
    category: 'tealstreet',
    description: 'Session Boxes (Asia / Europe / London / USA)',
    overlay: true,
    code: '',
    jailbreak: {
      inputs: [
        { id: 'globalOpacity', name: 'Global Opacity', type: 'float', defval: 1, min: 0.05, max: 1, step: 0.01 },
        { id: 'borderWidth', name: 'Border Width', type: 'float', defval: 1, min: 0, max: 4, step: 0.5 },
        { id: 'showLabels', name: 'Show Labels', type: 'bool', defval: true },
        { id: 'labelFontSize', name: 'Label Font Size', type: 'float', defval: 11, min: 8, max: 28, step: 1 },
        {
          id: 'timezoneOffsetMinutes',
          name: 'Timezone Offset (minutes)',
          type: 'int',
          defval: 0,
          min: -720,
          max: 840,
        },
        { id: 'maxResolutionMinutes', name: 'Max Resolution (minutes)', type: 'int', defval: 240, min: 1, max: 1440 },
        { id: 'showAsia', name: 'Show Asia', type: 'bool', defval: true },
        { id: 'asiaStartHour', name: 'Asia Start Hour', type: 'float', defval: 0, min: 0, max: 23.75, step: 0.25 },
        { id: 'asiaEndHour', name: 'Asia End Hour', type: 'float', defval: 6, min: 0, max: 23.75, step: 0.25 },
        { id: 'showEurope', name: 'Show Europe', type: 'bool', defval: true },
        {
          id: 'europeStartHour',
          name: 'Europe Start Hour',
          type: 'float',
          defval: 6,
          min: 0,
          max: 23.75,
          step: 0.25,
        },
        {
          id: 'europeEndHour',
          name: 'Europe End Hour',
          type: 'float',
          defval: 8,
          min: 0,
          max: 23.75,
          step: 0.25,
        },
        { id: 'showLondon', name: 'Show London', type: 'bool', defval: true },
        {
          id: 'londonStartHour',
          name: 'London Start Hour',
          type: 'float',
          defval: 8,
          min: 0,
          max: 23.75,
          step: 0.25,
        },
        {
          id: 'londonEndHour',
          name: 'London End Hour',
          type: 'float',
          defval: 13.5,
          min: 0,
          max: 23.75,
          step: 0.25,
        },
        { id: 'showUsa', name: 'Show USA', type: 'bool', defval: true },
        { id: 'usaStartHour', name: 'USA Start Hour', type: 'float', defval: 13.5, min: 0, max: 23.75, step: 0.25 },
        { id: 'usaEndHour', name: 'USA End Hour', type: 'float', defval: 20, min: 0, max: 23.75, step: 0.25 },
        { id: 'behindCandles', name: 'Behind Candles', type: 'bool', defval: true },
      ],
      defaults: {
        globalOpacity: 1,
        borderWidth: 1,
        showLabels: true,
        labelFontSize: 11,
        timezoneOffsetMinutes: 0,
        maxResolutionMinutes: 240,
        showAsia: true,
        asiaStartHour: 0,
        asiaEndHour: 6,
        showEurope: true,
        europeStartHour: 6,
        europeEndHour: 8,
        showLondon: true,
        londonStartHour: 8,
        londonEndHour: 13.5,
        showUsa: true,
        usaStartHour: 13.5,
        usaEndHour: 20,
        behindCandles: true,
      },
      palette: {
        asia: { name: 'Asia Session', defaultColor: 'rgba(37, 99, 235, 0.24)' },
        europe: { name: 'Europe Session', defaultColor: 'rgba(168, 85, 247, 0.2)' },
        london: { name: 'London Session', defaultColor: 'rgba(16, 185, 129, 0.2)' },
        usa: { name: 'USA Session', defaultColor: 'rgba(245, 158, 11, 0.2)' },
      },
      behindCandles: true,
    },
  },
];

/**
 * Trend-following indicators
 */
const TREND_INDICATORS: BuiltinIndicator[] = [
  {
    id: 'sma',
    name: 'Moving Average',
    category: 'trend',
    overlay: true,
    code: `//@version=6
indicator("SMA", overlay=true)
length = input.int(20, "Length", minval=1)
plot(ta.sma(close, length), "SMA", color=color.blue, linewidth=2)`,
  },
  {
    id: 'ema',
    name: 'Moving Average Exponential',
    category: 'trend',
    overlay: true,
    code: `//@version=6
indicator("EMA", overlay=true)
length = input.int(20, "Length", minval=1)
plot(ta.ema(close, length), "EMA", color=color.orange, linewidth=2)`,
  },
  {
    id: 'wma',
    name: 'Weighted Moving Average',
    category: 'trend',
    overlay: true,
    code: `//@version=6
indicator("WMA", overlay=true)
length = input.int(20, "Length", minval=1)
plot(ta.wma(close, length), "WMA", color=color.purple, linewidth=2)`,
  },
  {
    id: 'hma',
    name: 'Hull Moving Average',
    category: 'trend',
    overlay: true,
    code: `//@version=6
indicator("HMA", overlay=true)
length = input.int(20, "Length", minval=1)
plot(ta.hma(close, length), "HMA", color=color.teal, linewidth=2)`,
  },
  {
    id: 'supertrend',
    name: 'SuperTrend',
    category: 'trend',
    overlay: true,
    code: `//@version=6
indicator("SuperTrend", overlay=true)
factor = input.float(3.0, "Factor", minval=0.1)
atrLength = input.int(10, "ATR Length", minval=1)
[st, dir] = ta.supertrend(factor, atrLength)
stColor = dir == 1 ? color.green : color.red
plot(st, "SuperTrend", color=stColor, linewidth=2)`,
  },
  {
    id: 'sma-cross',
    name: 'MA Cross',
    category: 'trend',
    overlay: true,
    code: `//@version=6
indicator("SMA Cross", overlay=true)
fastLen = input.int(10, "Fast Length", minval=1)
slowLen = input.int(20, "Slow Length", minval=1)
fastSMA = ta.sma(close, fastLen)
slowSMA = ta.sma(close, slowLen)
plot(fastSMA, "Fast SMA", color=color.blue, linewidth=1)
plot(slowSMA, "Slow SMA", color=color.red, linewidth=1)`,
  },
  {
    id: 'ema-ribbon',
    name: 'EMA Ribbon',
    category: 'trend',
    overlay: true,
    code: `//@version=6
indicator("EMA Ribbon", overlay=true)
plot(ta.ema(close, 8), "EMA 8", color=color.new(color.blue, 60))
plot(ta.ema(close, 13), "EMA 13", color=color.new(color.blue, 50))
plot(ta.ema(close, 21), "EMA 21", color=color.new(color.blue, 40))
plot(ta.ema(close, 34), "EMA 34", color=color.new(color.blue, 30))
plot(ta.ema(close, 55), "EMA 55", color=color.new(color.blue, 20))`,
  },
  {
    id: 'vwap',
    name: 'VWAP',
    category: 'trend',
    overlay: true,
    code: `//@version=6
indicator("VWAP", overlay=true)
plot(ta.vwap(), "VWAP", color=color.purple, linewidth=2)`,
  },
  {
    id: 'ma-cross-signals',
    name: 'MA Cross Signals',
    category: 'trend',
    description: 'Moving average crossover with buy/sell signals',
    overlay: true,
    code: `//@version=6
indicator("MA Cross Signals", overlay=true)
fastLen = input.int(10, "Fast Length", minval=1)
slowLen = input.int(20, "Slow Length", minval=1)
fastMA = ta.ema(close, fastLen)
slowMA = ta.ema(close, slowLen)
bullCross = ta.crossover(fastMA, slowMA)
bearCross = ta.crossunder(fastMA, slowMA)
plot(fastMA, "Fast MA", color=color.blue, linewidth=1)
plot(slowMA, "Slow MA", color=color.orange, linewidth=1)
plotshape(bullCross, title="Buy", style=shape.triangleup, location=location.belowbar, color=color.green, size=size.small)
plotshape(bearCross, title="Sell", style=shape.triangledown, location=location.abovebar, color=color.red, size=size.small)`,
  },
  {
    id: 'bb-filled',
    name: 'Bollinger Bands (Filled)',
    category: 'trend',
    description: 'Bollinger Bands with filled area',
    overlay: true,
    code: `//@version=6
indicator("Bollinger Bands (Filled)", overlay=true)
length = input.int(20, "Length", minval=1)
mult = input.float(2.0, "StdDev Multiplier", minval=0.1)
basis = ta.sma(close, length)
dev = mult * ta.stdev(close, length)
upper = basis + dev
lower = basis - dev
p1 = plot(upper, "Upper", color=color.blue)
p2 = plot(lower, "Lower", color=color.blue)
plot(basis, "Basis", color=color.orange, linewidth=1)
fill(p1, p2, color=color.new(color.blue, 80))`,
  },
];

/**
 * Momentum indicators
 */
const MOMENTUM_INDICATORS: BuiltinIndicator[] = [
  {
    id: 'rsi',
    name: 'Relative Strength Index',
    category: 'momentum',
    overlay: false,
    yAxisRange: { min: 0, max: 100 },
    code: `//@version=6
indicator("RSI")
length = input.int(14, "Length", minval=1)
rsiValue = ta.rsi(close, length)
plot(rsiValue, "RSI", color=color.purple, linewidth=2)
hline(70, "Overbought", color=color.red)
hline(30, "Oversold", color=color.green)
hline(50, "Middle", color=color.gray)`,
  },
  {
    id: 'macd',
    name: 'MACD',
    category: 'momentum',
    overlay: false,
    code: `//@version=6
indicator("MACD")
fastLen = input.int(12, "Fast Length")
slowLen = input.int(26, "Slow Length")
signalLen = input.int(9, "Signal Length")
[macdLine, signalLine, histLine] = ta.macd(close, fastLen, slowLen, signalLen)
plot(macdLine, "MACD", color=color.blue, linewidth=2)
plot(signalLine, "Signal", color=color.orange, linewidth=2)
plot(histLine, "Histogram", style=plot.style_histogram, color=histLine >= 0 ? color.green : color.red)`,
  },
  {
    id: 'stochastic',
    name: 'Stochastic',
    category: 'momentum',
    overlay: false,
    yAxisRange: { min: 0, max: 100 },
    code: `//@version=6
indicator("Stochastic")
kLength = input.int(14, "K Length")
kSmooth = input.int(3, "K Smoothing")
dSmooth = input.int(3, "D Smoothing")
[k, d] = ta.stoch(kLength, kSmooth, dSmooth)
plot(k, "K", color=color.blue, linewidth=2)
plot(d, "D", color=color.orange, linewidth=2)
hline(80, "Overbought", color=color.red)
hline(20, "Oversold", color=color.green)`,
  },
  {
    id: 'momentum',
    name: 'Momentum',
    category: 'momentum',
    overlay: false,
    code: `//@version=6
indicator("Momentum")
length = input.int(10, "Length", minval=1)
mom = ta.mom(close, length)
plot(mom, "Momentum", color=color.teal, linewidth=2)
hline(0, "Zero", color=color.gray)`,
  },
  {
    id: 'cci',
    name: 'Commodity Channel Index',
    category: 'momentum',
    overlay: false,
    code: `//@version=6
indicator("CCI")
length = input.int(20, "Length", minval=1)
cciValue = ta.cci(close, length)
plot(cciValue, "CCI", color=color.purple, linewidth=2)
hline(100, "Overbought", color=color.red)
hline(-100, "Oversold", color=color.green)
hline(0, "Zero", color=color.gray)`,
  },
  {
    id: 'adx',
    name: 'ADX / DMI',
    category: 'momentum',
    overlay: false,
    yAxisRange: { min: 0, max: 100 },
    code: `//@version=6
indicator("ADX / DMI")
length = input.int(14, "Length", minval=1)
adxSmoothing = input.int(14, "ADX Smoothing", minval=1)
[diPlus, diMinus, adx] = ta.dmi(length, adxSmoothing)
plot(diPlus, "DI+", color=color.green, linewidth=1)
plot(diMinus, "DI-", color=color.red, linewidth=1)
plot(adx, "ADX", color=color.blue, linewidth=2)
hline(25, "Trend Threshold", color=color.gray)`,
  },
  {
    id: 'roc',
    name: 'Rate of Change',
    category: 'momentum',
    overlay: false,
    code: `//@version=6
indicator("ROC")
length = input.int(14, "Length", minval=1)
rocValue = ta.roc(close, length)
plot(rocValue, "ROC", color=color.teal, linewidth=2)
hline(0, "Zero", color=color.gray)`,
  },
  {
    id: 'sar',
    name: 'Parabolic SAR',
    category: 'momentum',
    overlay: true,
    code: `//@version=6
indicator("Parabolic SAR", overlay=true)
start = input.float(0.02, "Start", minval=0.001)
increment = input.float(0.02, "Increment", minval=0.001)
maximum = input.float(0.2, "Maximum", minval=0.01)
sarValue = ta.sar(start, increment, maximum)
sarColor = close > sarValue ? color.green : color.red
plot(sarValue, "SAR", color=sarColor, style=plot.style_circles, linewidth=1)`,
  },
  {
    id: 'rsi-signals',
    name: 'RSI with Signals',
    category: 'momentum',
    description: 'RSI with overbought/oversold signal markers',
    overlay: false,
    yAxisRange: { min: 0, max: 100 },
    code: `//@version=6
indicator("RSI with Signals")
length = input.int(14, "Length", minval=1)
overbought = input.int(70, "Overbought", minval=50, maxval=100)
oversold = input.int(30, "Oversold", minval=0, maxval=50)
rsiValue = ta.rsi(close, length)
plot(rsiValue, "RSI", color=color.purple, linewidth=2)
hline(overbought, "Overbought", color=color.red)
hline(oversold, "Oversold", color=color.green)
hline(50, "Middle", color=color.gray)
obSignal = ta.crossunder(rsiValue, overbought)
osSignal = ta.crossover(rsiValue, oversold)
plotshape(obSignal, title="OB Signal", style=shape.triangledown, location=location.top, color=color.red, size=size.tiny)
plotshape(osSignal, title="OS Signal", style=shape.triangleup, location=location.bottom, color=color.green, size=size.tiny)`,
  },
  {
    id: 'macd-signals',
    name: 'MACD with Signals',
    category: 'momentum',
    description: 'MACD with crossover signal markers',
    overlay: false,
    code: `//@version=6
indicator("MACD with Signals")
fastLen = input.int(12, "Fast Length")
slowLen = input.int(26, "Slow Length")
signalLen = input.int(9, "Signal Length")
[macdLine, signalLine, histLine] = ta.macd(close, fastLen, slowLen, signalLen)
plot(macdLine, "MACD", color=color.blue, linewidth=2)
plot(signalLine, "Signal", color=color.orange, linewidth=2)
plot(histLine, "Histogram", style=plot.style_histogram, color=histLine >= 0 ? color.green : color.red)
bullSignal = ta.crossover(macdLine, signalLine)
bearSignal = ta.crossunder(macdLine, signalLine)
plotshape(bullSignal, title="Bull Cross", style=shape.triangleup, location=location.bottom, color=color.green, size=size.tiny)
plotshape(bearSignal, title="Bear Cross", style=shape.triangledown, location=location.top, color=color.red, size=size.tiny)`,
  },
];

/**
 * Volatility indicators
 */
const VOLATILITY_INDICATORS: BuiltinIndicator[] = [
  {
    id: 'bollinger-bands',
    name: 'Bollinger Bands',
    category: 'volatility',
    overlay: true,
    code: `//@version=6
indicator("Bollinger Bands", overlay=true)
length = input.int(20, "Length", minval=1)
mult = input.float(2.0, "StdDev Multiplier", minval=0.1)
basis = ta.sma(close, length)
dev = mult * ta.stdev(close, length)
upper = basis + dev
lower = basis - dev
plot(basis, "Basis", color=color.blue, linewidth=1)
plot(upper, "Upper", color=color.red, linewidth=1)
plot(lower, "Lower", color=color.green, linewidth=1)`,
  },
  {
    id: 'atr',
    name: 'Average True Range',
    category: 'volatility',
    overlay: false,
    code: `//@version=6
indicator("ATR")
length = input.int(14, "Length", minval=1)
atrValue = ta.atr(length)
plot(atrValue, "ATR", color=color.orange, linewidth=2)`,
  },
  {
    id: 'keltner-channels',
    name: 'Keltner Channels',
    category: 'volatility',
    overlay: true,
    code: `//@version=6
indicator("Keltner Channels", overlay=true)
length = input.int(20, "Length", minval=1)
mult = input.float(2.0, "ATR Multiplier", minval=0.1)
basis = ta.ema(close, length)
atrValue = ta.atr(length)
upper = basis + mult * atrValue
lower = basis - mult * atrValue
plot(basis, "Basis", color=color.blue, linewidth=1)
plot(upper, "Upper", color=color.red, linewidth=1)
plot(lower, "Lower", color=color.green, linewidth=1)`,
  },
  {
    id: 'donchian-channels',
    name: 'Donchian Channels',
    category: 'volatility',
    overlay: true,
    code: `//@version=6
indicator("Donchian Channels", overlay=true)
length = input.int(20, "Length", minval=1)
upper = ta.highest(high, length)
lower = ta.lowest(low, length)
basis = (upper + lower) / 2
plot(basis, "Basis", color=color.blue, linewidth=1)
plot(upper, "Upper", color=color.red, linewidth=1)
plot(lower, "Lower", color=color.green, linewidth=1)`,
  },
  {
    id: 'keltner-filled',
    name: 'Keltner Channels (Filled)',
    category: 'volatility',
    description: 'Keltner Channels with filled area',
    overlay: true,
    code: `//@version=6
indicator("Keltner Channels (Filled)", overlay=true)
length = input.int(20, "Length", minval=1)
mult = input.float(2.0, "ATR Multiplier", minval=0.1)
basis = ta.ema(close, length)
atrValue = ta.atr(length)
upper = basis + mult * atrValue
lower = basis - mult * atrValue
p1 = plot(upper, "Upper", color=color.teal)
p2 = plot(lower, "Lower", color=color.teal)
plot(basis, "Basis", color=color.orange, linewidth=2)
fill(p1, p2, color=color.new(color.teal, 85))`,
  },
];

/**
 * Volume indicators
 */
const VOLUME_INDICATORS: BuiltinIndicator[] = [
  {
    id: 'obv',
    name: 'On Balance Volume',
    category: 'volume',
    overlay: false,
    code: `//@version=6
indicator("OBV")
obvValue = ta.obv()
plot(obvValue, "OBV", color=color.teal, linewidth=2)`,
  },
  {
    id: 'volume-sma',
    name: 'Volume',
    category: 'volume',
    overlay: false,
    code: `//@version=6
indicator("Volume SMA")
length = input.int(20, "MA Length", minval=1)
volColor = close >= open ? color.green : color.red
plot(volume, "Volume", style=plot.style_histogram, color=volColor)
plot(ta.sma(volume, length), "Volume MA", color=color.blue, linewidth=2)`,
  },
];

/**
 * All built-in indicators
 */
export const BUILTIN_INDICATORS: BuiltinIndicator[] = [
  ...TEALSTREET_INDICATORS,
  ...TREND_INDICATORS,
  ...MOMENTUM_INDICATORS,
  ...VOLATILITY_INDICATORS,
  ...VOLUME_INDICATORS,
];

/**
 * Get indicators by category
 */
export function getIndicatorsByCategory(category: BuiltinIndicator['category']): BuiltinIndicator[] {
  return BUILTIN_INDICATORS.filter((ind) => ind.category === category);
}

/**
 * Get indicator by ID
 */
export function getIndicatorById(id: string): BuiltinIndicator | undefined {
  return BUILTIN_INDICATORS.find((ind) => ind.id === id);
}

/**
 * Search indicators by name
 */
export function searchIndicators(query: string): BuiltinIndicator[] {
  const lowerQuery = query.toLowerCase();
  return BUILTIN_INDICATORS.filter(
    (ind) => ind.name.toLowerCase().includes(lowerQuery) || ind.description?.toLowerCase().includes(lowerQuery),
  );
}

/**
 * Convert JailbreakInputDefinition[] to InputDefinition[] (from @tealstreet/tealscript)
 * so that IndicatorSettingsModal can render them using the same form components.
 */
export function jailbreakInputsToInputDefinitions(inputs: JailbreakInputDefinition[]): Array<{
  id: string;
  type: 'int' | 'float' | 'bool' | 'string' | 'color';
  title: string;
  defval: unknown;
  minval?: number;
  maxval?: number;
  step?: number;
  options?: string[];
  tooltip?: string;
  group?: string;
}> {
  return inputs.map((input) => ({
    id: input.id,
    type: input.type,
    title: input.name,
    defval: input.defval,
    minval: input.min,
    maxval: input.max,
    step: input.step,
    options: input.options,
  }));
}

/**
 * Check if a builtin indicator is a jailbreak (canvas-drawing) indicator
 */
export function isJailbreakIndicator(indicator: BuiltinIndicator): boolean {
  return indicator.jailbreak != null;
}

/**
 * Category display names and order
 */
export const INDICATOR_CATEGORIES: Array<{
  id: BuiltinIndicator['category'];
  name: string;
}> = [
  { id: 'tealstreet', name: 'TEALSTREET SCRIPTS' },
  { id: 'trend', name: 'TREND' },
  { id: 'momentum', name: 'MOMENTUM' },
  { id: 'volatility', name: 'VOLATILITY' },
  { id: 'volume', name: 'VOLUME' },
  { id: 'other', name: 'OTHER' },
];
