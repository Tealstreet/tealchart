/**
 * Indicator Mapping
 *
 * Bidirectional mapping between Custom Chart indicator IDs
 * and TradingView study IDs.
 */

import type { IndicatorMapping, IndicatorMappingRegistry } from './types';

// ============================================================================
// Indicator Mapping Registry
// ============================================================================

/**
 * Complete mapping of supported indicators
 * Key is the Custom Chart builtin ID
 */
export const INDICATOR_MAPPINGS: IndicatorMappingRegistry = {
  // ========================================================================
  // Trend Indicators
  // ========================================================================

  sma: {
    customId: 'sma',
    tvStudyId: 'STD;SMA',
    inputMappings: {
      length: 'Length',
    },
    defaultInputs: {
      length: 20,
    },
    isOverlay: true,
  },

  ema: {
    customId: 'ema',
    tvStudyId: 'STD;EMA',
    inputMappings: {
      length: 'Length',
    },
    defaultInputs: {
      length: 20,
    },
    isOverlay: true,
  },

  wma: {
    customId: 'wma',
    tvStudyId: 'STD;WMA',
    inputMappings: {
      length: 'Length',
    },
    defaultInputs: {
      length: 20,
    },
    isOverlay: true,
  },

  hma: {
    customId: 'hma',
    tvStudyId: 'STD;HMA',
    inputMappings: {
      length: 'Length',
    },
    defaultInputs: {
      length: 20,
    },
    isOverlay: true,
  },

  supertrend: {
    customId: 'supertrend',
    tvStudyId: 'STD;Supertrend',
    inputMappings: {
      factor: 'Factor',
      atrLength: 'ATR Length',
    },
    defaultInputs: {
      factor: 3.0,
      atrLength: 10,
    },
    isOverlay: true,
  },

  'sma-cross': {
    customId: 'sma-cross',
    tvStudyId: 'STD;SMA',
    tvAltIds: ['STD;MA%1Cross'],
    inputMappings: {
      fastLen: 'Fast Length',
      slowLen: 'Slow Length',
    },
    defaultInputs: {
      fastLen: 10,
      slowLen: 20,
    },
    isOverlay: true,
  },

  'ema-ribbon': {
    customId: 'ema-ribbon',
    tvStudyId: 'STD;EMA',
    inputMappings: {},
    defaultInputs: {},
    isOverlay: true,
  },

  vwap: {
    customId: 'vwap',
    tvStudyId: 'STD;VWAP',
    inputMappings: {},
    defaultInputs: {},
    isOverlay: true,
  },

  'ma-cross-signals': {
    customId: 'ma-cross-signals',
    tvStudyId: 'STD;MA%1Cross',
    inputMappings: {
      fastLen: 'Fast Length',
      slowLen: 'Slow Length',
    },
    defaultInputs: {
      fastLen: 10,
      slowLen: 20,
    },
    isOverlay: true,
  },

  'bb-filled': {
    customId: 'bb-filled',
    tvStudyId: 'STD;Bollinger_Bands',
    inputMappings: {
      length: 'Length',
      mult: 'StdDev',
    },
    defaultInputs: {
      length: 20,
      mult: 2.0,
    },
    isOverlay: true,
  },

  // ========================================================================
  // Momentum Indicators
  // ========================================================================

  rsi: {
    customId: 'rsi',
    tvStudyId: 'STD;RSI',
    inputMappings: {
      length: 'RSI Length',
    },
    defaultInputs: {
      length: 14,
    },
    isOverlay: false,
  },

  macd: {
    customId: 'macd',
    tvStudyId: 'Moving Average Convergence/Divergence@tv-basicstudies-1',
    // Alternative IDs that TV might use
    tvAltIds: ['STD;MACD', 'MACD@tv-basicstudies'],
    inputMappings: {
      fastLen: 'in_0', // TV uses in_0 for fast length
      slowLen: 'in_1', // TV uses in_1 for slow length
      signalLen: 'in_2', // TV uses in_2 for signal length
    },
    defaultInputs: {
      fastLen: 12,
      slowLen: 26,
      signalLen: 9,
    },
    isOverlay: false,
  },

  stochastic: {
    customId: 'stochastic',
    tvStudyId: 'STD;Stoch',
    inputMappings: {
      kLength: '%K Length',
      kSmooth: '%K Smoothing',
      dSmooth: '%D Smoothing',
    },
    defaultInputs: {
      kLength: 14,
      kSmooth: 3,
      dSmooth: 3,
    },
    isOverlay: false,
  },

  momentum: {
    customId: 'momentum',
    tvStudyId: 'STD;Momentum',
    inputMappings: {
      length: 'Length',
    },
    defaultInputs: {
      length: 10,
    },
    isOverlay: false,
  },

  cci: {
    customId: 'cci',
    tvStudyId: 'STD;CCI',
    inputMappings: {
      length: 'Length',
    },
    defaultInputs: {
      length: 20,
    },
    isOverlay: false,
  },

  adx: {
    customId: 'adx',
    tvStudyId: 'STD;ADX',
    tvAltIds: ['STD;DMI', 'STD;Directional%1Movement'],
    inputMappings: {
      length: 'DI Length',
      adxSmoothing: 'ADX Smoothing',
    },
    defaultInputs: {
      length: 14,
      adxSmoothing: 14,
    },
    isOverlay: false,
  },

  roc: {
    customId: 'roc',
    tvStudyId: 'STD;ROC',
    inputMappings: {
      length: 'Length',
    },
    defaultInputs: {
      length: 14,
    },
    isOverlay: false,
  },

  sar: {
    customId: 'sar',
    tvStudyId: 'STD;Parabolic%1SAR',
    tvAltIds: ['STD;PSAR'],
    inputMappings: {
      start: 'Start',
      increment: 'Increment',
      maximum: 'Max Value',
    },
    defaultInputs: {
      start: 0.02,
      increment: 0.02,
      maximum: 0.2,
    },
    isOverlay: true,
  },

  'rsi-signals': {
    customId: 'rsi-signals',
    tvStudyId: 'STD;RSI',
    inputMappings: {
      length: 'RSI Length',
      overbought: 'Upper Limit',
      oversold: 'Lower Limit',
    },
    defaultInputs: {
      length: 14,
      overbought: 70,
      oversold: 30,
    },
    isOverlay: false,
  },

  'macd-signals': {
    customId: 'macd-signals',
    tvStudyId: 'STD;MACD',
    tvAltIds: ['Moving Average Convergence/Divergence@tv-basicstudies-1'],
    inputMappings: {
      fastLen: 'in_0',
      slowLen: 'in_1',
      signalLen: 'in_2',
    },
    defaultInputs: {
      fastLen: 12,
      slowLen: 26,
      signalLen: 9,
    },
    isOverlay: false,
  },

  // ========================================================================
  // Volatility Indicators
  // ========================================================================

  'bollinger-bands': {
    customId: 'bollinger-bands',
    tvStudyId: 'STD;Bollinger_Bands',
    inputMappings: {
      length: 'Length',
      mult: 'StdDev',
    },
    defaultInputs: {
      length: 20,
      mult: 2.0,
    },
    isOverlay: true,
  },

  atr: {
    customId: 'atr',
    tvStudyId: 'STD;ATR',
    inputMappings: {
      length: 'Length',
    },
    defaultInputs: {
      length: 14,
    },
    isOverlay: false,
  },

  'keltner-channels': {
    customId: 'keltner-channels',
    tvStudyId: 'STD;Keltner%1Channels',
    tvAltIds: ['STD;KC'],
    inputMappings: {
      length: 'Length',
      mult: 'Multiplier',
    },
    defaultInputs: {
      length: 20,
      mult: 2.0,
    },
    isOverlay: true,
  },

  'donchian-channels': {
    customId: 'donchian-channels',
    tvStudyId: 'STD;Donchian%1Channels',
    tvAltIds: ['STD;DC'],
    inputMappings: {
      length: 'Length',
    },
    defaultInputs: {
      length: 20,
    },
    isOverlay: true,
  },

  'keltner-filled': {
    customId: 'keltner-filled',
    tvStudyId: 'STD;Keltner%1Channels',
    inputMappings: {
      length: 'Length',
      mult: 'Multiplier',
    },
    defaultInputs: {
      length: 20,
      mult: 2.0,
    },
    isOverlay: true,
  },

  // ========================================================================
  // Volume Indicators
  // ========================================================================

  obv: {
    customId: 'obv',
    tvStudyId: 'STD;On%1Balance%1Volume',
    inputMappings: {},
    defaultInputs: {},
    isOverlay: false,
  },

  'volume-sma': {
    customId: 'volume-sma',
    tvStudyId: 'STD;Volume',
    tvAltIds: ['Volume@tv-basicstudies'],
    inputMappings: {
      length: 'MA Length',
    },
    defaultInputs: {
      length: 20,
    },
    isOverlay: false,
  },

  // ========================================================================
  // Jailbreak Indicators (Tealstreet custom canvas-drawn indicators)
  // Input mappings are 1:1 since jailbreak indicators use flat settings.
  // ========================================================================

  dwmo: {
    customId: 'dwmo',
    tvStudyId: 'Tealstreet-DWMO@tv-basicstudies-1',
    inputMappings: {},
    defaultInputs: {},
    isOverlay: true,
  },

  sessionBoxes: {
    customId: 'sessionBoxes',
    tvStudyId: 'Tealstreet-SessionBoxes@tv-basicstudies-1',
    inputMappings: {},
    defaultInputs: {},
    isOverlay: true,
  },

  pnlCard: {
    customId: 'pnlCard',
    tvStudyId: 'Tealstreet-PnlCard@tv-basicstudies-1',
    inputMappings: {},
    defaultInputs: {},
    isOverlay: true,
  },

  pvsraCandles: {
    customId: 'pvsraCandles',
    tvStudyId: 'Tealstreet-PvsraCandles@tv-basicstudies-1',
    inputMappings: {},
    defaultInputs: {},
    isOverlay: true,
  },

  pvsraCombined: {
    customId: 'pvsraCombined',
    tvStudyId: 'Tealstreet-PvsraCombined@tv-basicstudies-1',
    inputMappings: {},
    defaultInputs: {},
    isOverlay: true,
  },

  pvsraHistogram: {
    customId: 'pvsraHistogram',
    tvStudyId: 'Tealstreet-PvsraHistogram@tv-basicstudies-1',
    inputMappings: {},
    defaultInputs: {},
    isOverlay: true,
  },

  tpo: {
    customId: 'tpo',
    tvStudyId: 'Tealstreet-TPO@tv-basicstudies-1',
    inputMappings: {},
    defaultInputs: {},
    isOverlay: true,
  },

  risk: {
    customId: 'risk',
    tvStudyId: 'Tealstreet-Risk@tv-basicstudies-1',
    inputMappings: {},
    defaultInputs: {},
    isOverlay: true,
  },

  depthChart: {
    customId: 'depthChart',
    tvStudyId: 'Tealstreet-DepthChart@tv-basicstudies-1',
    inputMappings: {},
    defaultInputs: {},
    isOverlay: true,
  },

  heatmap: {
    customId: 'heatmap',
    tvStudyId: 'Tealstreet-Heatmap@tv-basicstudies-1',
    inputMappings: {},
    defaultInputs: {},
    isOverlay: true,
  },

  heatmapAlt: {
    customId: 'heatmapAlt',
    tvStudyId: 'Tealstreet-HeatmapAlt@tv-basicstudies-1',
    inputMappings: {},
    defaultInputs: {},
    isOverlay: true,
  },

  footprint: {
    customId: 'footprint',
    tvStudyId: 'Tealstreet-Footprints@tv-basicstudies-1',
    inputMappings: {},
    defaultInputs: {},
    isOverlay: true,
  },
};

// ============================================================================
// Lookup Functions
// ============================================================================

/**
 * Find mapping by Custom Chart indicator ID
 */
export function findMappingByCustomId(customId: string): IndicatorMapping | undefined {
  return INDICATOR_MAPPINGS[customId];
}

/**
 * Find mapping by TradingView study ID
 * Checks both primary tvStudyId and alternative IDs (tvAltIds)
 */
export function findMappingByTvStudyId(tvStudyId: string): IndicatorMapping | undefined {
  return Object.values(INDICATOR_MAPPINGS).find((mapping) => {
    // Check primary ID
    if (mapping.tvStudyId === tvStudyId) return true;
    // Check alternative IDs
    if (mapping.tvAltIds?.includes(tvStudyId)) return true;
    // Check if the study ID starts with our mapping (for versioned IDs)
    if (tvStudyId.startsWith(mapping.tvStudyId.split('@')[0])) return true;
    return false;
  });
}

/**
 * Get all supported Custom Chart indicator IDs
 */
export function getSupportedCustomIds(): string[] {
  return Object.keys(INDICATOR_MAPPINGS);
}

/**
 * Get all supported TradingView study IDs
 */
export function getSupportedTvStudyIds(): string[] {
  return Object.values(INDICATOR_MAPPINGS).map((m) => m.tvStudyId);
}

/**
 * Check if a Custom Chart indicator ID is supported
 */
export function isCustomIdSupported(customId: string): boolean {
  return customId in INDICATOR_MAPPINGS;
}

/**
 * Check if a TradingView study ID is supported
 */
export function isTvStudyIdSupported(tvStudyId: string): boolean {
  return Object.values(INDICATOR_MAPPINGS).some((m) => m.tvStudyId === tvStudyId);
}

// ============================================================================
// Input Mapping Utilities
// ============================================================================

/**
 * Map Custom Chart input names to TradingView input names
 */
export function mapInputsToTv(customId: string, inputs: Record<string, unknown>): Record<string, unknown> {
  const mapping = findMappingByCustomId(customId);
  if (!mapping?.inputMappings) {
    return inputs;
  }

  const result: Record<string, unknown> = {};
  for (const [customName, value] of Object.entries(inputs)) {
    const tvName = mapping.inputMappings[customName] ?? customName;
    result[tvName] = value;
  }
  return result;
}

/**
 * Map TradingView input names to Custom Chart input names
 */
export function mapInputsFromTv(tvStudyId: string, inputs: Record<string, unknown>): Record<string, unknown> {
  const mapping = findMappingByTvStudyId(tvStudyId);
  if (!mapping?.inputMappings) {
    return inputs;
  }

  // Create reverse mapping
  const reverseMapping: Record<string, string> = {};
  for (const [customName, tvName] of Object.entries(mapping.inputMappings)) {
    reverseMapping[tvName] = customName;
  }

  const result: Record<string, unknown> = {};
  for (const [tvName, value] of Object.entries(inputs)) {
    const customName = reverseMapping[tvName] ?? tvName;
    result[customName] = value;
  }
  return result;
}
