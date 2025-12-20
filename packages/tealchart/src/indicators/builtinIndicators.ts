/**
 * Built-in Indicators Registry
 *
 * Defines the available indicators that can be added to charts.
 * Each indicator has a name, category, and Tealscript code.
 */

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
  /** Tealscript code */
  code: string;
}

/**
 * Tealstreet custom indicators (placeholders for now)
 */
const TEALSTREET_INDICATORS: BuiltinIndicator[] = [
  // These are placeholders - actual implementations will come later
  // {
  //   id: 'depth-chart',
  //   name: 'Depth Chart',
  //   category: 'tealstreet',
  //   description: 'Order book depth visualization',
  //   overlay: false,
  //   code: '', // Custom implementation needed
  // },
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
    (ind) =>
      ind.name.toLowerCase().includes(lowerQuery) ||
      ind.description?.toLowerCase().includes(lowerQuery)
  );
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
