/**
 * Transformer Types
 *
 * Types for bidirectional transformation between Custom Chart settings
 * and TradingView saved layout format.
 */

import type { ChartSettings, IndicatorInstance } from '../state/chartState';

// ============================================================================
// Transform Result Types
// ============================================================================

/**
 * Result of a transformation operation
 */
export interface TransformResult<T> {
  /** The transformed data */
  data: T;
  /** Warnings generated during transformation (e.g., unmapped indicators) */
  warnings: string[];
  /** Data that couldn't be mapped, preserved for round-trip */
  unmappedData?: Record<string, unknown>;
}

// ============================================================================
// TradingView Format Types
// ============================================================================

/**
 * TradingView ChartData structure (from charting_library types)
 * This is what gets saved to/loaded from Supabase
 */
export interface TvChartData {
  id?: string | number;
  name: string;
  symbol: string;
  resolution: string;
  content: string; // JSON stringified TvChartContent
}

/**
 * Parsed content structure inside TradingView ChartData
 * Note: TradingView's format is triple-nested:
 * - Outer: { symbol, resolution, content: "..." }
 * - Middle: { charts: [...] } or { sources, panes, ... }
 * - Inner (within charts[0]): { panes: [{ sources: [...] }], mainSourceId }
 */
export interface TvChartContent {
  /** Main series ID (usually 'main') */
  mainSourceId: string;
  /** All data sources including main series and studies */
  sources: TvSource[];
  /** Pane layout configuration */
  panes: TvPane[];
  /** Drawing tools (lines, annotations, etc.) */
  drawings?: unknown[];
  /** Chart version from TradingView */
  version?: number;
  /** Multi-chart layout array (each chart has its own panes/sources) */
  charts?: TvChartLayout[];
  // Metadata extracted from outer wrapper during parsing
  _outerSymbol?: string;
  _outerResolution?: string;
  // Tealstreet metadata for round-trip preservation
  _tealstreetTealchart?: boolean;
  _tealstreetVersion?: number;
  _tealstreetOriginalIndicators?: IndicatorInstance[];
  _tealstreetOriginalSettings?: Partial<ChartSettings>;
}

/**
 * Individual chart layout within a multi-chart TradingView layout
 * Sources are stored within the chart, panes reference them by ID
 */
export interface TvChartLayout {
  panes: TvChartPane[];
  sources?: TvSource[];
  mainSourceId?: string;
}

/**
 * Pane within a TradingView chart layout
 * Note: In multi-chart layouts, panes contain actual sources, not just IDs
 */
export interface TvChartPane {
  sources: TvSource[];
  height?: number;
  mainSeriesPane?: boolean;
}

/**
 * TradingView source (main series or study)
 */
export interface TvSource {
  /** Unique source ID */
  id: string;
  /** Source type: 'mainSeries', 'Study', study ID like 'STD;RSI' */
  type: string;
  /** Source state/configuration */
  state: TvSourceState;
}

/**
 * TradingView source state
 */
export interface TvSourceState {
  /** Symbol for main series */
  symbol?: string;
  /** Interval/resolution */
  interval?: string;
  /** Chart style (0=bars, 1=candles, etc.) */
  style?: number;
  /** Study inputs (parameters) */
  inputs?: Record<string, unknown>;
  /** Plot configurations */
  plots?: TvPlot[];
  /** Whether the study is visible */
  visible?: boolean;
}

/**
 * TradingView plot configuration
 */
export interface TvPlot {
  id: string;
  type: string;
  color?: string;
  linewidth?: number;
  linestyle?: number; // 0 = solid, 1 = dotted, 2 = dashed
  visible?: boolean;
}

/**
 * TradingView pane configuration
 */
export interface TvPane {
  /** Source IDs in this pane */
  sources: string[];
  /** Pane height as ratio or pixels */
  height?: number;
  /** Whether this is the main pane */
  mainSeriesPane?: boolean;
}

// ============================================================================
// Indicator Mapping Types
// ============================================================================

/**
 * Mapping between Custom Chart indicator ID and TradingView study ID
 */
export interface IndicatorMapping {
  /** Custom Chart builtin indicator ID (e.g., 'sma', 'rsi') */
  customId: string;
  /** TradingView study ID (e.g., 'STD;SMA', 'STD;RSI') */
  tvStudyId: string;
  /** Alternative TradingView study IDs (TV uses different IDs in different contexts) */
  tvAltIds?: string[];
  /** Input parameter name mapping: { customName: tvName } */
  inputMappings?: Record<string, string>;
  /** Default input values if not specified */
  defaultInputs?: Record<string, unknown>;
  /** Whether this indicator is an overlay */
  isOverlay: boolean;
}

/**
 * Complete indicator mapping registry
 */
export type IndicatorMappingRegistry = Record<string, IndicatorMapping>;

// ============================================================================
// Migration Types
// ============================================================================

/**
 * Schema migration function
 */
export interface Migration {
  /** Target version after this migration */
  version: number;
  /** Description of what this migration does */
  description: string;
  /** Migration function */
  migrate: (data: ChartSettings) => ChartSettings;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Current schema version for custom chart settings
 */
export const TRANSFORMER_VERSION = 1;

/**
 * TradingView chart style values
 */
export const TV_CHART_STYLES = {
  BARS: 0,
  CANDLES: 1,
  LINE: 2,
  AREA: 3,
  HEIKIN_ASHI: 8,
  HOLLOW_CANDLES: 9,
} as const;

/**
 * Map custom chart type to TV chart style
 */
export const CHART_TYPE_TO_TV_STYLE: Record<string, number> = {
  candle: TV_CHART_STYLES.CANDLES,
  line: TV_CHART_STYLES.LINE,
  area: TV_CHART_STYLES.AREA,
};

/**
 * Map TV chart style to custom chart type
 */
/**
 * TradingView line style values
 */
export const TV_LINE_STYLES = {
  SOLID: 0,
  DOTTED: 1,
  DASHED: 2,
} as const;

/**
 * Map custom line style to TV line style
 */
export const LINE_STYLE_TO_TV: Record<string, number> = {
  solid: TV_LINE_STYLES.SOLID,
  dotted: TV_LINE_STYLES.DOTTED,
  dashed: TV_LINE_STYLES.DASHED,
};

/**
 * Map TV line style to custom line style
 */
export const TV_TO_LINE_STYLE: Record<number, 'solid' | 'dotted' | 'dashed'> = {
  [TV_LINE_STYLES.SOLID]: 'solid',
  [TV_LINE_STYLES.DOTTED]: 'dotted',
  [TV_LINE_STYLES.DASHED]: 'dashed',
};

export const TV_STYLE_TO_CHART_TYPE: Record<number, 'candle' | 'line' | 'area'> = {
  [TV_CHART_STYLES.BARS]: 'candle',
  [TV_CHART_STYLES.CANDLES]: 'candle',
  [TV_CHART_STYLES.LINE]: 'line',
  [TV_CHART_STYLES.AREA]: 'area',
  [TV_CHART_STYLES.HEIKIN_ASHI]: 'candle',
  [TV_CHART_STYLES.HOLLOW_CANDLES]: 'candle',
};
