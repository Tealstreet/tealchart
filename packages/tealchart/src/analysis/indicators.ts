import { BUILTIN_INDICATORS } from '../indicators/builtinIndicators';

const analysisIndicatorIds = [
  'sma',
  'ema',
  'rsi',
  'stochastic',
  'macd',
  'bollinger-bands',
  'atr',
  'keltner-channels',
  'vwap',
  'adx',
] as const;

export const ANALYSIS_INDICATORS = analysisIndicatorIds.map((id) => {
  const indicator = BUILTIN_INDICATORS.find((item) => item.id === id)!;
  return { id, name: indicator.name, description: indicator.description ?? indicator.name, overlay: indicator.overlay };
});
