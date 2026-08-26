/**
 * TradingView → Custom Chart Format Transformer
 *
 * Transforms TradingView ChartData format to Custom Chart settings
 * for loading layouts created by TradingView or Custom Chart.
 */

import type { ChartSettings, IndicatorInstance, PreservedTradingViewStudy } from '../state/chartState';
import type { ResolutionString } from '../types';
import type { TransformResult, TvChartContent, TvChartData, TvPane, TvSource } from './types';

import { deserializeUserDrawingStateFromLayout } from '../drawings';
import { sanitizeChartProperties } from '../overrides';
import {
  capturePreservedTvProperties,
  mergeChartProperties,
  readTvChartProperties,
  sanitizePreservedTvProperties,
} from './chartProperties';
import { CHART_SETTINGS_VERSION } from '../state/safeDeepMerge';
import { findMappingByTvStudyId, mapInputsFromTv } from './indicatorMapping';
import { TV_STYLE_TO_CHART_TYPE, TV_TO_LINE_STYLE } from './types';

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
      // chartProperties is per-chart in a real layout, not at the content root.
      if (firstChart.chartProperties !== undefined) {
        tvContent.chartProperties = firstChart.chartProperties;
      }
    }
  } catch (_e) {
    warnings.push('Failed to parse chart content as JSON');
    return {
      data: getDefaultSettings(),
      warnings,
    };
  }

  // Check if this is a Tealstreet custom chart (round-trip)
  const isTealchartOrigin = tvContent._tealstreetTealchart === true;

  // Extract main series info
  const mainSource = tvContent.sources?.find((s) => s.type === 'MainSeries' || s.id === tvContent.mainSourceId);

  // Get symbol and interval - try multiple sources in order of preference
  // 1. Outer metadata (from TradingView wrapper)
  // 2. chartData object (if passed as object)
  // 3. Main source state
  // 4. Default values
  const symbol =
    (tvContent as any)._outerSymbol ??
    (typeof chartData === 'object' ? chartData.symbol : undefined) ??
    mainSource?.state?.symbol ??
    'BTCUSDT';

  const interval =
    (tvContent as any)._outerResolution ??
    (typeof chartData === 'object' ? chartData.resolution : undefined) ??
    mainSource?.state?.interval ??
    '60';

  // Determine chart type from main series style
  const chartStyle = mainSource?.state?.style ?? 1;
  const chartType = TV_STYLE_TO_CHART_TYPE[chartStyle] ?? 'candle';

  // Check for volume pane
  const hasVolume = tvContent.sources?.some((s) => s.type === 'Volume' || s.type.toLowerCase().includes('volume'));

  // Find volume pane height
  let volumeHeight = 0.2;
  const volumePane = tvContent.panes?.find((p) =>
    getPaneSourceIds(p).some((id) => tvContent.sources?.find((s) => s.id === id && s.type === 'Volume')),
  );
  if (volumePane?.height) {
    volumeHeight = volumePane.height;
  }

  // Use preserved settings if this is a round-trip
  const originalSettings = tvContent._tealstreetOriginalSettings;

  // Transform indicators
  const {
    indicators,
    warnings: indicatorWarnings,
    unmapped,
    preservedTradingViewStudies,
  } = transformIndicators(tvContent, isTealchartOrigin, originalSettings?.preservedTradingViewStudies);
  warnings.push(...indicatorWarnings);

  if (unmapped.length > 0) {
    unmappedData.indicators = unmapped;
  }

  const settings: ChartSettings = {
    symbol,
    interval: interval as ResolutionString,
    showVolume: originalSettings?.showVolume ?? hasVolume,
    showIndicatorOutputAxisLabels: originalSettings?.showIndicatorOutputAxisLabels ?? true,
    volumeHeight: originalSettings?.volumeHeight ?? volumeHeight,
    chartType: originalSettings?.chartType ?? chartType,
    autoScale: originalSettings?.autoScale ?? true,
    viewport: originalSettings?.viewport,
    indicators,
    userDrawingState: deserializeUserDrawingStateFromLayout(originalSettings?.userDrawingState),
    // Merged per key rather than whole-blob: a real TradingView layout always
    // serializes candleStyle, so an all-or-nothing precedence would discard the
    // Tealstreet fallback entirely on the strength of one canonical hit.
    chartProperties: mergeChartProperties(
      sanitizeChartProperties(originalSettings?.chartProperties),
      readTvChartProperties({
        chartProperties: tvContent.chartProperties,
        mainSeriesState: mainSource?.state,
      }),
    ),
    preservedTvProperties:
      capturePreservedTvProperties(tvContent.chartProperties, mainSource?.state) ??
      sanitizePreservedTvProperties(originalSettings?.preservedTvProperties),
    preservedTradingViewStudies,
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
  preservedTradingViewStudies?: PreservedTradingViewStudy[];
}

/**
 * Transform TV sources to Custom Chart indicators
 */
function transformIndicators(
  tvContent: TvChartContent,
  isTealchartOrigin: boolean,
  originalPreservedStudies?: PreservedTradingViewStudy[],
): IndicatorTransformResult {
  const indicators: IndicatorInstance[] = [];
  const warnings: string[] = [];
  const unmapped: TvSource[] = [];
  const preservedTradingViewStudies: PreservedTradingViewStudy[] = [];

  // Get sources, excluding main series and volume
  const studySources =
    tvContent.sources?.filter(
      (s) =>
        s.type !== 'MainSeries' &&
        s.type !== 'Volume' &&
        s.id !== tvContent.mainSourceId &&
        !s.type.toLowerCase().includes('volume'),
    ) ?? [];

  for (const source of studySources) {
    const indicator = tvSourceToIndicator(source);
    const pane = findSourcePane(tvContent, source.id);

    if (indicator) {
      indicators.push(indicator);
      preservedTradingViewStudies.push({
        id: source.id,
        source: cloneRecord(source),
        pane,
        mappedIndicatorId: indicator.id,
        mappingStatus: 'mapped',
      });
    } else {
      warnings.push(`Indicator "${getTvStudyId(source)}" is not supported in custom chart`);
      unmapped.push(source);
      preservedTradingViewStudies.push({
        id: source.id,
        source: cloneRecord(source),
        pane,
        mappingStatus: 'preserved',
      });
    }
  }

  if (isTealchartOrigin) {
    const existingIds = new Set(preservedTradingViewStudies.map((study) => study.id));
    const originalStudies = [
      ...(originalPreservedStudies ?? []),
      ...(tvContent._tealstreetPreservedTradingViewStudies ?? []),
    ];
    for (const originalStudy of originalStudies) {
      if (!existingIds.has(originalStudy.id)) {
        preservedTradingViewStudies.push(originalStudy);
        existingIds.add(originalStudy.id);
      }
    }
  }

  // If this is a round-trip, restore any originally unmapped indicators
  if (isTealchartOrigin && tvContent._tealstreetOriginalIndicators) {
    for (const originalIndicator of tvContent._tealstreetOriginalIndicators) {
      const existingIndex = indicators.findIndex((i) => i.id === originalIndicator.id);
      if (existingIndex >= 0) {
        const currentIndicator = indicators[existingIndex];
        indicators[existingIndex] =
          currentIndicator.builtinId === originalIndicator.builtinId
            ? currentIndicator
            : restoreOriginalIndicatorIdentity(originalIndicator, currentIndicator);
      } else {
        indicators.push(originalIndicator);
      }
    }
  }

  // Sort by createdAt to preserve original order
  indicators.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

  return {
    indicators,
    warnings,
    unmapped,
    preservedTradingViewStudies: preservedTradingViewStudies.length > 0 ? preservedTradingViewStudies : undefined,
  };
}

/**
 * Transform a TV source to Custom Chart indicator instance
 * Returns null if source cannot be mapped
 */
function tvSourceToIndicator(source: TvSource): IndicatorInstance | null {
  // Get the actual study ID from metaInfo (TV stores it there, not in source.type)
  const studyId = getTvStudyId(source);

  const mapping = findMappingByTvStudyId(studyId);

  if (!mapping) {
    return null;
  }

  // Map inputs from TV names to custom names
  const customInputs = source.state?.inputs ? mapInputsFromTv(studyId, source.state.inputs) : {};

  // Extract style overrides from TV plots
  const styleOverrides = source.state?.plots
    ?.filter((p) => p.color || p.linewidth || p.linestyle !== undefined)
    .map((p) => ({
      plotId: p.id,
      color: p.color,
      linewidth: p.linewidth,
      lineStyle: p.linestyle !== undefined ? TV_TO_LINE_STYLE[p.linestyle] : undefined,
    }));

  return {
    id: source.id,
    name: getIndicatorDisplayName(mapping.customId),
    builtinId: mapping.customId,
    inputs: customInputs,
    styleOverrides: styleOverrides?.length ? styleOverrides : undefined,
    isVisible: source.state?.visible ?? true,
    createdAt: Date.now(),
    tradingViewStudy: {
      studyId,
      source: cloneRecord(source),
    },
  };
}

function getTvStudyId(source: TvSource): string {
  return source.metaInfo?.fullId ?? source.metaInfo?.id ?? source.metaInfo?.shortId ?? source.type;
}

function findSourcePane(tvContent: TvChartContent, sourceId: string): PreservedTradingViewStudy['pane'] {
  const panes = tvContent.panes ?? [];
  for (let index = 0; index < panes.length; index += 1) {
    const pane = panes[index];
    if (!pane) continue;
    if (getPaneSourceIds(pane).includes(sourceId)) {
      return {
        index,
        height: pane.height,
        mainSeriesPane: pane.mainSeriesPane,
        sourceIds: getPaneSourceIds(pane),
      };
    }
  }
  return undefined;
}

function getPaneSourceIds(pane: TvPane): string[] {
  return pane.sources
    .map((source) => (typeof source === 'string' ? source : (source as { id?: unknown }).id))
    .filter((id): id is string => typeof id === 'string');
}

function cloneRecord<T extends Record<string, unknown>>(value: T): T {
  return structuredClone(value);
}

function restoreOriginalIndicatorIdentity(
  originalIndicator: IndicatorInstance,
  currentIndicator: IndicatorInstance,
): IndicatorInstance {
  return {
    ...currentIndicator,
    ...originalIndicator,
    inputs: currentIndicator.inputs,
    styleOverrides: currentIndicator.styleOverrides ?? originalIndicator.styleOverrides,
    isVisible: currentIndicator.isVisible,
    tradingViewStudy: currentIndicator.tradingViewStudy ?? originalIndicator.tradingViewStudy,
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
    showIndicatorOutputAxisLabels: true,
    volumeHeight: 0.2,
    chartType: 'candle',
    autoScale: true,
    indicators: [],
    version: CHART_SETTINGS_VERSION,
  };
}
