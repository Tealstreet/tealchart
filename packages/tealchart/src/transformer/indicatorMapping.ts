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
  // Trend Indicators
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

  vwap: {
    customId: 'vwap',
    tvStudyId: 'STD;VWAP',
    inputMappings: {},
    defaultInputs: {},
    isOverlay: true,
  },

  // Momentum Indicators
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
      fastLen: 'in_0',  // TV uses in_0 for fast length
      slowLen: 'in_1',  // TV uses in_1 for slow length
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

  // Volatility Indicators
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

  // Volume Indicators
  obv: {
    customId: 'obv',
    tvStudyId: 'STD;On%1Balance%1Volume',
    inputMappings: {},
    defaultInputs: {},
    isOverlay: false,
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
export function mapInputsToTv(
  customId: string,
  inputs: Record<string, unknown>
): Record<string, unknown> {
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
export function mapInputsFromTv(
  tvStudyId: string,
  inputs: Record<string, unknown>
): Record<string, unknown> {
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
