/**
 * TradingView → Custom Chart Format Transformer
 *
 * Transforms TradingView ChartData format to Custom Chart settings
 * for loading layouts created by TradingView or Custom Chart.
 */

import type { ChartSettings, IndicatorInstance } from '../state/chartState';
import type { ResolutionString } from '../types';
import type {
  TransformResult,
  TvChartData,
  TvChartContent,
  TvPane,
  TvSource,
} from './types';
import { TV_STYLE_TO_CHART_TYPE } from './types';
import {
  findMappingByTvStudyId,
  mapInputsFromTv,
} from './indicatorMapping';
import { CHART_SETTINGS_VERSION } from '../state/safeDeepMerge';

// ============================================================================
// Main Transform Function
// ============================================================================

/**
 * Transform TradingView ChartData to Custom Chart settings
 *
 * @param chartData - TradingView ChartData (or just content string)
 * @returns Transform result with settings and any warnings
 */
export function fromTvFormat(chartData: TvChartData | string): TransformResult<ChartSettings> {
  const warnings: string[] = [];
  const unmappedData: Record<string, unknown> = {};

  // Parse content if string
  const contentStr = typeof chartData === 'string' ? chartData : chartData.content;
  let tvContent: TvChartContent;

  try {
    const outerContent = JSON.parse(contentStr);

    // TradingView wraps the actual chart data inside a `content` field
    // The outer object has: resolution, symbol, exchange, content (nested JSON string)
    if (outerContent.content && typeof outerContent.content === 'string') {
      tvContent = JSON.parse(outerContent.content);
      // Preserve outer metadata
      tvContent._outerSymbol = outerContent.symbol;
      tvContent._outerResolution = outerContent.resolution;
    } else if (outerContent.sources || outerContent.mainSourceId) {
      // Already in the expected format (our custom chart save format)
      tvContent = outerContent;
    } else {
      // Unknown format - use as-is
      tvContent = outerContent;
    }

    // TradingView multi-chart layouts have a `charts` array
    // Each chart in the array has the actual sources/panes
    if (tvContent.charts && Array.isArray(tvContent.charts) && tvContent.charts.length > 0) {
      const firstChart = tvContent.charts[0];
      // If first chart has panes, extract sources from them
      if (firstChart.panes) {
        const allSources: TvSource[] = [];
        for (const pane of firstChart.panes) {
          if (pane.sources) {
            allSources.push(...pane.sources);
          }
        }
        tvContent.sources = allSources;
        tvContent.panes = firstChart.panes as unknown as TvPane[];
        if (firstChart.mainSourceId) {
          tvContent.mainSourceId = firstChart.mainSourceId;
        }
      }
    }
  } catch (e) {
    warnings.push('Failed to parse chart content as JSON');
    return {
      data: getDefaultSettings(),
      warnings,
    };
  }

  // Check if this is a Tealstreet custom chart (round-trip)
  const isTealchartOrigin = tvContent._tealstreetTealchart === true;

  // Extract main series info
  const mainSource = tvContent.sources?.find(
    (s) => s.type === 'MainSeries' || s.id === tvContent.mainSourceId
  );

  // Get symbol and interval - try multiple sources in order of preference
  // 1. Outer metadata (from TradingView wrapper)
  // 2. chartData object (if passed as object)
  // 3. Main source state
  // 4. Default values
  const symbol = (tvContent as any)._outerSymbol
    ?? (typeof chartData === 'object' ? chartData.symbol : undefined)
    ?? mainSource?.state?.symbol
    ?? 'BTCUSDT';

  const interval = (tvContent as any)._outerResolution
    ?? (typeof chartData === 'object' ? chartData.resolution : undefined)
    ?? mainSource?.state?.interval
    ?? '60';

  // Determine chart type from main series style
  const chartStyle = mainSource?.state?.style ?? 1;
  const chartType = TV_STYLE_TO_CHART_TYPE[chartStyle] ?? 'candle';

  // Check for volume pane
  const hasVolume = tvContent.sources?.some(
    (s) => s.type === 'Volume' || s.type.toLowerCase().includes('volume')
  );

  // Find volume pane height
  let volumeHeight = 0.2;
  const volumePane = tvContent.panes?.find((p) =>
    p.sources.some((id) =>
      tvContent.sources?.find((s) => s.id === id && s.type === 'Volume')
    )
  );
  if (volumePane?.height) {
    volumeHeight = volumePane.height;
  }

  // Transform indicators
  const { indicators, warnings: indicatorWarnings, unmapped } = transformIndicators(
    tvContent,
    isTealchartOrigin
  );
  warnings.push(...indicatorWarnings);

  if (unmapped.length > 0) {
    unmappedData.indicators = unmapped;
  }

  // Use preserved settings if this is a round-trip
  const originalSettings = tvContent._tealstreetOriginalSettings;

  const settings: ChartSettings = {
    symbol,
    interval: interval as ResolutionString,
    showVolume: originalSettings?.showVolume ?? hasVolume,
    volumeHeight: originalSettings?.volumeHeight ?? volumeHeight,
    chartType: originalSettings?.chartType ?? chartType,
    autoScale: originalSettings?.autoScale ?? true,
    viewport: originalSettings?.viewport,
    indicators,
    version: CHART_SETTINGS_VERSION,
  };

  return {
    data: settings,
    warnings,
    unmappedData: Object.keys(unmappedData).length > 0 ? unmappedData : undefined,
  };
}

// ============================================================================
// Indicator Transformation
// ============================================================================

interface IndicatorTransformResult {
  indicators: IndicatorInstance[];
  warnings: string[];
  unmapped: TvSource[];
}

/**
 * Transform TV sources to Custom Chart indicators
 */
function transformIndicators(
  tvContent: TvChartContent,
  isTealchartOrigin: boolean
): IndicatorTransformResult {
  const indicators: IndicatorInstance[] = [];
  const warnings: string[] = [];
  const unmapped: TvSource[] = [];

  // Get sources, excluding main series and volume
  const studySources = tvContent.sources?.filter(
    (s) =>
      s.type !== 'MainSeries' &&
      s.type !== 'Volume' &&
      s.id !== tvContent.mainSourceId &&
      !s.type.toLowerCase().includes('volume')
  ) ?? [];

  for (const source of studySources) {
    const indicator = tvSourceToIndicator(source);

    if (indicator) {
      indicators.push(indicator);
    } else {
      warnings.push(`Indicator "${source.type}" is not supported in custom chart`);
      unmapped.push(source);
    }
  }

  // If this is a round-trip, restore any originally unmapped indicators
  if (isTealchartOrigin && tvContent._tealstreetOriginalIndicators) {
    for (const originalIndicator of tvContent._tealstreetOriginalIndicators) {
      // Check if this indicator was already restored from TV sources
      const alreadyRestored = indicators.some((i) => i.id === originalIndicator.id);
      if (!alreadyRestored) {
        indicators.push(originalIndicator);
      }
    }
  }

  // Sort by createdAt to preserve original order
  indicators.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

  return { indicators, warnings, unmapped };
}

/**
 * Transform a TV source to Custom Chart indicator instance
 * Returns null if source cannot be mapped
 */
function tvSourceToIndicator(source: TvSource): IndicatorInstance | null {
  // Get the actual study ID from metaInfo (TV stores it there, not in source.type)
  const sourceAny = source as any;
  const studyId = sourceAny.metaInfo?.fullId
    || sourceAny.metaInfo?.id
    || sourceAny.metaInfo?.shortId
    || source.type;

  const mapping = findMappingByTvStudyId(studyId);

  if (!mapping) {
    return null;
  }

  // Map inputs from TV names to custom names
  const customInputs = source.state?.inputs
    ? mapInputsFromTv(studyId, source.state.inputs)
    : {};

  // Extract style overrides from TV plots
  const styleOverrides = source.state?.plots
    ?.filter((p) => p.color || p.linewidth)
    .map((p) => ({
      plotId: p.id,
      color: p.color,
      linewidth: p.linewidth,
    }));

  return {
    id: source.id,
    name: getIndicatorDisplayName(mapping.customId),
    builtinId: mapping.customId,
    inputs: customInputs,
    styleOverrides: styleOverrides?.length ? styleOverrides : undefined,
    isVisible: source.state?.visible ?? true,
    createdAt: Date.now(),
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get display name for an indicator
 */
function getIndicatorDisplayName(customId: string): string {
  const names: Record<string, string> = {
    sma: 'SMA',
    ema: 'EMA',
    rsi: 'RSI',
    macd: 'MACD',
    stochastic: 'Stochastic',
    momentum: 'Momentum',
    cci: 'CCI',
    'bollinger-bands': 'Bollinger Bands',
    atr: 'ATR',
    obv: 'OBV',
    vwap: 'VWAP',
  };
  return names[customId] ?? customId.toUpperCase();
}

/**
 * Get default empty settings
 */
function getDefaultSettings(): ChartSettings {
  return {
    symbol: 'BTCUSDT',
    interval: '60' as ResolutionString,
    showVolume: true,
    volumeHeight: 0.2,
    chartType: 'candle',
    autoScale: true,
    indicators: [],
    version: CHART_SETTINGS_VERSION,
  };
}
