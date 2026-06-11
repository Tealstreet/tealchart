/**
 * Custom Chart → TradingView Format Transformer
 *
 * Transforms Custom Chart settings to TradingView ChartData format
 * for saving via the existing SaveLoadAdapter infrastructure.
 */

import type { ChartSettings, IndicatorInstance } from '../state/chartState';
import type { TvChartContent, TvChartData, TvPane, TvSource } from './types';

import { serializeUserDrawingStateForLayout } from '../drawings';
import { findMappingByCustomId, mapInputsToTv } from './indicatorMapping';
import { CHART_TYPE_TO_TV_STYLE, LINE_STYLE_TO_TV, TRANSFORMER_VERSION, TV_CHART_STYLES } from './types';

// ============================================================================
// Main Transform Function
// ============================================================================

/**
 * Transform Custom Chart settings to TradingView ChartData format
 *
 * @param settings - Custom Chart settings to transform
 * @param chartName - Name for the saved layout
 * @returns TradingView ChartData ready for SaveLoadAdapter
 */
export function toTvFormat(settings: ChartSettings, chartName: string): TvChartData {
  const content = buildTvContent(settings);

  return {
    // id is undefined - let SaveLoadAdapter generate it
    name: chartName,
    symbol: settings.symbol,
    resolution: settings.interval,
    content: JSON.stringify(content),
  };
}

// ============================================================================
// Content Building
// ============================================================================

/**
 * Build the TV content structure from Custom Chart settings
 */
function buildTvContent(settings: ChartSettings): TvChartContent {
  const sources: TvSource[] = [];
  const panes: TvPane[] = [];

  // Main series source
  const mainSourceId = 'main';
  sources.push({
    id: mainSourceId,
    type: 'MainSeries',
    state: {
      symbol: settings.symbol,
      interval: settings.interval,
      style: CHART_TYPE_TO_TV_STYLE[settings.chartType] ?? TV_CHART_STYLES.CANDLES,
    },
  });

  // Main pane with main series
  const mainPane: TvPane = {
    sources: [mainSourceId],
    mainSeriesPane: true,
    height: settings.showVolume ? 0.7 : 0.85,
  };

  // Add overlay indicators to main pane
  const overlayIndicators = settings.indicators.filter((ind) => {
    const mapping = findMappingByCustomId(ind.builtinId);
    return mapping?.isOverlay ?? true; // Default to overlay if unknown
  });

  for (const indicator of overlayIndicators) {
    const source = indicatorToTvSource(indicator);
    if (source) {
      sources.push(source);
      mainPane.sources.push(source.id);
    }
  }

  panes.push(mainPane);

  // Volume pane (if enabled)
  if (settings.showVolume) {
    const volumeSourceId = 'volume';
    sources.push({
      id: volumeSourceId,
      type: 'Volume',
      state: {
        visible: true,
      },
    });
    panes.push({
      sources: [volumeSourceId],
      height: settings.volumeHeight,
    });
  }

  // Non-overlay indicators get their own panes
  const separateIndicators = settings.indicators.filter((ind) => {
    const mapping = findMappingByCustomId(ind.builtinId);
    return mapping ? !mapping.isOverlay : false;
  });

  for (const indicator of separateIndicators) {
    const source = indicatorToTvSource(indicator);
    if (source) {
      sources.push(source);
      panes.push({
        sources: [source.id],
        height: 0.15, // Default indicator pane height
      });
    }
  }

  // Store Tealstreet metadata for round-trip preservation
  const content: TvChartContent = {
    mainSourceId,
    sources,
    panes,
    version: 1,
    // Tealstreet metadata
    _tealstreetTealchart: true,
    _tealstreetVersion: TRANSFORMER_VERSION,
    // Preserve original settings for lossless round-trip
    _tealstreetOriginalSettings: {
      showVolume: settings.showVolume,
      volumeHeight: settings.volumeHeight,
      chartType: settings.chartType,
      autoScale: settings.autoScale,
      viewport: settings.viewport,
      userDrawingState: serializeUserDrawingStateForLayout(settings.userDrawingState),
    },
    // Preserve indicators that couldn't be mapped
    _tealstreetOriginalIndicators: settings.indicators.filter((ind) => {
      return !findMappingByCustomId(ind.builtinId);
    }),
  };

  return content;
}

// ============================================================================
// Indicator Transformation
// ============================================================================

/**
 * Transform a Custom Chart indicator instance to TV source
 * Returns null if indicator cannot be mapped
 */
function indicatorToTvSource(indicator: IndicatorInstance): TvSource | null {
  const mapping = findMappingByCustomId(indicator.builtinId);

  if (!mapping) {
    // Can't map this indicator - it will be preserved in metadata
    return null;
  }

  // Map inputs from custom names to TV names
  const tvInputs = mapInputsToTv(indicator.builtinId, indicator.inputs);

  return {
    id: indicator.id,
    type: mapping.tvStudyId,
    state: {
      inputs: tvInputs,
      visible: indicator.isVisible,
      // Preserve style overrides if present
      plots: indicator.styleOverrides?.map((override) => ({
        id: override.plotId,
        type: 'line',
        color: override.color,
        linewidth: override.linewidth,
        linestyle: override.lineStyle ? LINE_STYLE_TO_TV[override.lineStyle] : undefined,
        visible: true,
      })),
    },
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique source ID for an indicator
 */
export function generateSourceId(builtinId: string): string {
  return `${builtinId}_${Date.now()}`;
}
