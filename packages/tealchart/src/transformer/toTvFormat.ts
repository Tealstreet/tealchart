/**
 * Custom Chart → TradingView Format Transformer
 *
 * Transforms Custom Chart settings to TradingView ChartData format
 * for saving via the existing SaveLoadAdapter infrastructure.
 */

import type { ChartSettings, IndicatorInstance, PreservedTradingViewStudy } from '../state/chartState';
import type { TvChartContent, TvChartData, TvPane, TvSource, TvSourceState } from './types';

import { serializeUserDrawingStateForLayout } from '../drawings';
import { writeTvChartProperties } from './chartProperties';
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
  const preservedStudies = settings.preservedTradingViewStudies ?? [];
  const preservedByMappedIndicatorId = new Map(
    preservedStudies
      .filter((study) => study.mappedIndicatorId)
      .map((study) => [study.mappedIndicatorId as string, study]),
  );

  // Main series source. Saving rebuilds content from scratch, so anything an
  // imported layout carried has to be re-seeded here or it is silently deleted.
  const mainSourceId = 'main';
  const preserved = settings.preservedTvProperties;
  const mainSeriesState: TvSourceState = {
    symbol: settings.symbol,
    interval: settings.interval,
    style: CHART_TYPE_TO_TV_STYLE[settings.chartType] ?? TV_CHART_STYLES.CANDLES,
    ...(preserved?.candleStyle ? { candleStyle: { ...preserved.candleStyle } } : {}),
  };
  sources.push({
    id: mainSourceId,
    type: 'MainSeries',
    state: mainSeriesState,
  });

  // Appearance goes in TradingView's canonical places: chartProperties for pane
  // and scale settings, the main series' own state for candle styling. Seeded
  // with the imported originals, then overwritten with the user's Tealchart
  // values so ours win and theirs survive.
  const chartProperties: Record<string, unknown> = preserved?.chartProperties
    ? (JSON.parse(JSON.stringify(preserved.chartProperties)) as Record<string, unknown>)
    : {};
  writeTvChartProperties(settings.chartProperties, {
    chartProperties,
    mainSeriesState: mainSeriesState as unknown as Record<string, unknown>,
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
    const source = indicatorToTvSource(indicator, preservedByMappedIndicatorId.get(indicator.id));
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
    const source = indicatorToTvSource(indicator, preservedByMappedIndicatorId.get(indicator.id));
    if (source) {
      sources.push(source);
      panes.push({
        sources: [source.id],
        height: 0.15, // Default indicator pane height
      });
    }
  }

  for (const study of getPreservedOnlyStudies(preservedStudies, settings.indicators)) {
    const source = cloneRecord(study.source) as unknown as TvSource;
    sources.push(source);
    if (study.pane?.mainSeriesPane || study.pane?.index === 0) {
      mainPane.sources.push(source.id);
    } else {
      panes.push({
        sources: [source.id],
        height: study.pane?.height ?? 0.15,
      });
    }
  }

  applyPreservedPanePlacement(panes, sources, preservedStudies);

  // Store Tealstreet metadata for round-trip preservation
  const content: TvChartContent = {
    mainSourceId,
    sources,
    panes,
    ...(Object.keys(chartProperties).length > 0 ? { chartProperties } : {}),
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
      chartProperties: settings.chartProperties,
      preservedTvProperties: settings.preservedTvProperties,
      preservedTradingViewStudies: settings.preservedTradingViewStudies,
    },
    // Preserve exact Tealchart indicator identity for lossy TV projections.
    _tealstreetOriginalIndicators: settings.indicators,
    _tealstreetPreservedTradingViewStudies: preservedStudies,
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
function indicatorToTvSource(indicator: IndicatorInstance, preservedStudy?: PreservedTradingViewStudy): TvSource | null {
  const mapping = findMappingByCustomId(indicator.builtinId);

  if (!mapping) {
    // Can't map this indicator - it will be preserved in metadata
    return null;
  }

  // Map inputs from custom names to TV names
  const tvInputs = mapInputsToTv(indicator.builtinId, indicator.inputs);
  const preservedSource = preservedStudy?.source ?? indicator.tradingViewStudy?.source;
  const baseSource = preservedSource ? (cloneRecord(preservedSource) as unknown as TvSource) : undefined;
  const studyId = indicator.tradingViewStudy?.studyId ?? mapping.tvStudyId;
  const baseState = baseSource?.state ? cloneRecord(baseSource.state as Record<string, unknown>) : {};

  return {
    ...(baseSource ?? {}),
    id: indicator.id,
    type: baseSource?.type ?? 'Study',
    metaInfo: {
      ...(baseSource?.metaInfo ?? {}),
      fullId: baseSource?.metaInfo?.fullId ?? studyId,
      id: baseSource?.metaInfo?.id ?? studyId,
      shortId: baseSource?.metaInfo?.shortId ?? studyId,
    },
    state: {
      ...baseState,
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

function getPreservedOnlyStudies(
  studies: PreservedTradingViewStudy[],
  indicators: IndicatorInstance[],
): PreservedTradingViewStudy[] {
  const indicatorIds = new Set(indicators.map((indicator) => indicator.id));
  return studies.filter(
    (study) => study.mappingStatus === 'preserved' || !study.mappedIndicatorId || !indicatorIds.has(study.mappedIndicatorId),
  );
}

function applyPreservedPanePlacement(
  panes: TvPane[],
  sources: TvSource[],
  studies: PreservedTradingViewStudy[],
): void {
  const sourceIds = new Set(sources.map((source) => source.id));
  const preservedSourceIds = new Set(studies.map((study) => study.id));
  if (preservedSourceIds.size === 0) return;

  for (const pane of panes) {
    pane.sources = pane.sources.filter((sourceId) => !preservedSourceIds.has(sourceId));
  }

  const byPane = new Map<number, NonNullable<PreservedTradingViewStudy['pane']>>();
  for (const study of studies) {
    if (study.pane) {
      byPane.set(study.pane.index, study.pane);
    }
  }

  for (const [index, preservedPane] of Array.from(byPane.entries()).sort(([a], [b]) => a - b)) {
    const paneSourceIds = preservedPane.sourceIds.filter((sourceId) => sourceIds.has(sourceId));
    if (paneSourceIds.length === 0) continue;

    while (panes.length <= index) {
      panes.push({
        sources: [],
        height: 0.15,
      });
    }

    let pane = panes[index];
    if (!pane) {
      pane = {
        sources: [],
        height: preservedPane.height,
        mainSeriesPane: preservedPane.mainSeriesPane,
      };
      panes[index] = pane;
    }

    pane.sources = Array.from(new Set([...pane.sources, ...paneSourceIds]));
    pane.height = preservedPane.height ?? pane.height;
    pane.mainSeriesPane = preservedPane.mainSeriesPane ?? pane.mainSeriesPane;
  }
}

function cloneRecord<T extends Record<string, unknown>>(value: T): T {
  return structuredClone(value);
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
