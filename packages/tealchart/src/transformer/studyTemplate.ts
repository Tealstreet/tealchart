/**
 * Study (indicator) templates in TradingView's format.
 *
 * A template is TradingView's study-template JSON — `{ panes, version,
 * symbol?, interval? }`, what `IChartWidgetApi.createStudyTemplate` returns —
 * so a template saved here applies natively on a TradingView chart, and one
 * saved there applies here. Indicators are projected through the same
 * `toTvFormat` / `fromTvFormat` path layouts use.
 *
 * The one addition is a top-level `tealstreet` envelope, which TradingView
 * ignores. Its shared fields (`version`, `engine`, `tealscriptStudies`,
 * `pineJsStudies`) are the cross-engine contract the web app validates in
 * `components/chart/indicatorTemplates/templateDocument.ts`. Tealchart adds an
 * engine-private `tealchartIndicators` list so Tealchart-only indicators
 * (TealScript studies, builtins without a TradingView mapping) and exact
 * instance identity survive. A TealScript instance there names its study by
 * INDEX into `tealscriptStudies`, never by its own sourceId: that list is the
 * only place a source id lives, so whoever rewrites it (a marketplace install
 * mapping ids to the installer's copies) remaps every instance at once.
 */

import type {
  ChartSettings,
  IndicatorInstance,
  PlotStyleOverride,
  PreservedTradingViewStudy,
} from '../state/chartState';
import type { ResolutionString } from '../types';
import type { TvChartContent, TvSource } from './types';

import { fromTvFormat } from './fromTvFormat';
import { toTvFormat } from './toTvFormat';

// ============================================================================
// Types
// ============================================================================

/** Mirrors TradingView's `CreateStudyTemplateOptions`. */
export interface CreateStudyTemplateOptions {
  /** Include the symbol in the saved state. */
  saveSymbol?: boolean;
  /** Include the interval in the saved state. */
  saveInterval?: boolean;
}

export const STUDY_TEMPLATE_META_KEY = 'tealstreet';
export const STUDY_TEMPLATE_META_VERSION = 1;
/** TradingView's chart model version; a lower value makes it re-run z-order migrations. */
export const TV_STUDY_TEMPLATE_VERSION = 3;
const MAIN_SERIES_ID = '_seriesId';

export interface StudyTemplateTealscriptStudy {
  sourceId: string;
  sourceHash?: string;
  name: string;
}

/** A Tealchart indicator as a template carries it: no TV source, no inline code. */
export interface StudyTemplateIndicator {
  id: string;
  name: string;
  /** Builtin id. Absent for a TealScript study, which resolves via `tealscriptStudy`. */
  builtinId?: string;
  /** Index into the envelope's `tealscriptStudies`. */
  tealscriptStudy?: number;
  inputs: Record<string, unknown>;
  styleOverrides?: PlotStyleOverride[];
  isVisible: boolean;
  createdAt: number;
}

export interface TealchartStudyTemplateMeta {
  version: typeof STUDY_TEMPLATE_META_VERSION;
  engine: 'tealchart';
  tealscriptStudies: StudyTemplateTealscriptStudy[];
  pineJsStudies: [];
  tealchartIndicators: StudyTemplateIndicator[];
}

export interface TvPriceScaleState {
  id: string;
  m_priceRange: null;
  m_isAutoScale: boolean;
  m_isPercentage: boolean;
  m_isIndexedTo100: boolean;
  m_isLog: boolean;
  m_isLockScale: boolean;
  m_isInverted: boolean;
  m_topMargin: number;
  m_bottomMargin: number;
  alignLabels: boolean;
}

/** One pane, as TradingView's `pane.state({ includeSources: true })` writes it. */
export interface TvStudyTemplatePane {
  sources: TvSource[];
  mainSourceId: string;
  stretchFactor: number;
  leftAxisesState: Array<{ state: TvPriceScaleState; sources: string[] }>;
  rightAxisesState: Array<{ state: TvPriceScaleState; sources: string[] }>;
  overlayPriceScales: Record<string, unknown>;
  priceScaleRatio: null;
  isCollapsed: boolean;
  isMaximized: boolean;
  mode: number;
}

export interface TvStudyTemplate {
  panes: TvStudyTemplatePane[];
  version: number;
  symbol?: string;
  interval?: string;
  tealstreet?: TealchartStudyTemplateMeta;
}

/** The indicator settings a template is built from. Drawings are never part of one. */
export type StudyTemplateSourceSettings = Pick<
  ChartSettings,
  'symbol' | 'interval' | 'chartType' | 'indicators' | 'preservedTradingViewStudies'
>;

/** A TealScript study this runtime can resolve by catalog row. */
export interface StudyTemplateCustomStudy {
  id: string;
  name: string;
  sourceId?: string;
  sourceHash?: string;
}

export interface ReadStudyTemplateResult {
  /** The template's indicators, ready to replace the chart's. */
  indicators: IndicatorInstance[];
  /** TradingView sources riding along so a re-save does not drop them. */
  preservedTradingViewStudies: PreservedTradingViewStudy[];
  /** TealScript studies the template uses that this user does not have; not applied. */
  missingTealscriptStudies: StudyTemplateTealscriptStudy[];
  /** TradingView studies Tealchart cannot render; kept for re-save, not drawn. */
  unsupportedStudies: string[];
  interval?: string;
  symbol?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function priceScaleState(id: string): TvPriceScaleState {
  return {
    id,
    m_priceRange: null,
    m_isAutoScale: true,
    m_isPercentage: false,
    m_isIndexedTo100: false,
    m_isLog: false,
    m_isLockScale: false,
    m_isInverted: false,
    m_topMargin: 0.1,
    m_bottomMargin: 0.08,
    alignLabels: true,
  };
}

/** Parse stored content (jsonb arrives as an object, TradingView hands a string). */
export function parseStudyTemplateContent(content: unknown): Record<string, unknown> | null {
  if (isRecord(content)) return content;
  if (typeof content !== 'string') return null;
  try {
    const parsed: unknown = JSON.parse(content);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * TradingView's Volume is a study; Tealchart draws volume as a chart setting.
 * It is preserved for re-save like any other source, but is not worth a
 * "not shown" notice when the chart shows volume natively.
 */
function isTvVolumeStudy(source: TvSource): boolean {
  const id = source.metaInfo?.id ?? source.metaInfo?.fullId ?? '';
  return /^Volume@tv-basicstudies/.test(id) || id === 'STD;Volume';
}

function getStudyName(source: TvSource): string {
  const meta = source.metaInfo;
  return (
    (typeof meta?.description === 'string' && meta.description) ||
    (typeof meta?.shortDescription === 'string' && meta.shortDescription) ||
    meta?.fullId ||
    meta?.id ||
    source.type
  );
}

// ============================================================================
// Write
// ============================================================================

function toTemplateIndicators(indicators: IndicatorInstance[]): {
  tealchartIndicators: StudyTemplateIndicator[];
  tealscriptStudies: StudyTemplateTealscriptStudy[];
} {
  const tealscriptStudies: StudyTemplateTealscriptStudy[] = [];
  const studyIndexBySourceId = new Map<string, number>();
  const tealchartIndicators: StudyTemplateIndicator[] = [];

  for (const indicator of indicators) {
    const base = {
      id: indicator.id,
      name: indicator.name,
      inputs: indicator.inputs,
      ...(indicator.styleOverrides ? { styleOverrides: indicator.styleOverrides } : {}),
      isVisible: indicator.isVisible,
      createdAt: indicator.createdAt,
    };
    if (indicator.sourceKind === 'custom_tealchart_study') {
      // Without a catalog row there is nothing another chart could resolve.
      if (!indicator.sourceId) continue;
      let index = studyIndexBySourceId.get(indicator.sourceId);
      if (index === undefined) {
        index = tealscriptStudies.length;
        studyIndexBySourceId.set(indicator.sourceId, index);
        tealscriptStudies.push({
          sourceId: indicator.sourceId,
          ...(indicator.sourceHash ? { sourceHash: indicator.sourceHash } : {}),
          name: indicator.name,
        });
      }
      tealchartIndicators.push({ ...base, tealscriptStudy: index });
    } else {
      tealchartIndicators.push({ ...base, builtinId: indicator.builtinId });
    }
  }

  return { tealchartIndicators, tealscriptStudies };
}

/**
 * Build TradingView study-template JSON from Tealchart indicator settings.
 * The price series is included (TradingView requires one to apply a template)
 * but carries no state: TradingView discards it on apply anyway.
 */
export function buildTvStudyTemplate(
  settings: StudyTemplateSourceSettings,
  options: CreateStudyTemplateOptions = {},
): TvStudyTemplate {
  const layout = toTvFormat(
    {
      symbol: settings.symbol,
      interval: settings.interval,
      chartType: settings.chartType,
      indicators: settings.indicators,
      preservedTradingViewStudies: settings.preservedTradingViewStudies,
      // Volume is a Tealchart chart setting, not an indicator, so it stays out.
      showVolume: false,
      showIndicatorOutputAxisLabels: true,
      volumeHeight: 0,
      autoScale: true,
      version: 1,
    },
    '',
  );
  const content = JSON.parse(layout.content) as TvChartContent;
  const sourcesById = new Map(content.sources.map((source) => [source.id, source]));

  let zorder = 0;
  const panes: TvStudyTemplatePane[] = [];
  for (const pane of content.panes) {
    const sources: TvSource[] = [];
    for (const sourceId of pane.sources) {
      const source = sourcesById.get(sourceId);
      if (!source) continue;
      if (source.type === 'MainSeries') {
        sources.push({ type: 'MainSeries', id: MAIN_SERIES_ID, zorder: zorder++, state: {} });
      } else {
        sources.push({ ...source, zorder: zorder++ });
      }
    }
    if (sources.length === 0) continue;

    const index = panes.length;
    const mainSourceId = sources.some((source) => source.id === MAIN_SERIES_ID) ? MAIN_SERIES_ID : sources[0].id;
    panes.push({
      sources,
      mainSourceId,
      stretchFactor: Math.round((pane.height ?? 0.15) * 10_000),
      leftAxisesState: [],
      // One shared right scale per pane, so an overlay tracks the price it sits on.
      rightAxisesState: [{ state: priceScaleState(`tealchart-scale-${index}`), sources: sources.map((s) => s.id) }],
      overlayPriceScales: {},
      priceScaleRatio: null,
      isCollapsed: false,
      isMaximized: false,
      mode: 0,
    });
  }

  const { tealchartIndicators, tealscriptStudies } = toTemplateIndicators(settings.indicators);
  return {
    panes,
    version: TV_STUDY_TEMPLATE_VERSION,
    ...(options.saveSymbol ? { symbol: settings.symbol } : {}),
    ...(options.saveInterval ? { interval: settings.interval } : {}),
    [STUDY_TEMPLATE_META_KEY]: {
      version: STUDY_TEMPLATE_META_VERSION,
      engine: 'tealchart',
      tealscriptStudies,
      pineJsStudies: [],
      tealchartIndicators,
    },
  };
}

// ============================================================================
// Read
// ============================================================================

function readTealscriptStudies(raw: unknown): StudyTemplateTealscriptStudy[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is Record<string, unknown> => isRecord(entry) && typeof entry.sourceId === 'string')
    .map((entry) => ({
      sourceId: entry.sourceId as string,
      ...(typeof entry.sourceHash === 'string' ? { sourceHash: entry.sourceHash } : {}),
      name: typeof entry.name === 'string' ? entry.name : (entry.sourceId as string),
    }));
}

function readTemplateIndicators(raw: unknown): StudyTemplateIndicator[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.filter(
    (entry): entry is StudyTemplateIndicator =>
      isRecord(entry) &&
      typeof entry.id === 'string' &&
      (typeof entry.builtinId === 'string' || typeof entry.tealscriptStudy === 'number'),
  );
}

/**
 * Parse a stored template (TradingView- or Tealchart-written) into Tealchart
 * indicators. Returns null when the content is not a study template at all.
 *
 * TealScript studies resolve by catalog row against `customStudies`; a study
 * this runtime does not have is left out and reported in
 * `missingTealscriptStudies` rather than added as an indicator that cannot run.
 */
export function readTvStudyTemplate(
  content: unknown,
  customStudies: readonly StudyTemplateCustomStudy[] = [],
): ReadStudyTemplateResult | null {
  const template = parseStudyTemplateContent(content);
  if (!template || !Array.isArray(template.panes)) return null;

  // Drawings never belong to an indicator template, whatever the writer put in.
  const panes = template.panes.filter(isRecord).map((pane) => ({
    ...pane,
    sources: (Array.isArray(pane.sources) ? pane.sources : []).filter(
      (source): source is TvSource =>
        isRecord(source) &&
        typeof source.id === 'string' &&
        typeof source.type === 'string' &&
        !source.type.startsWith('LineTool'),
    ),
  }));
  const mainSourceId =
    panes.flatMap((pane) => pane.sources).find((source) => source.type === 'MainSeries')?.id ?? MAIN_SERIES_ID;
  const layout = fromTvFormat(JSON.stringify({ charts: [{ panes, mainSourceId }] }));

  const meta = isRecord(template[STUDY_TEMPLATE_META_KEY]) ? template[STUDY_TEMPLATE_META_KEY] : undefined;
  const tealscriptStudies = readTealscriptStudies(meta?.tealscriptStudies);
  const templateIndicators =
    meta?.engine === 'tealchart' ? readTemplateIndicators(meta.tealchartIndicators) : undefined;

  const missing = new Map<string, StudyTemplateTealscriptStudy>();
  const resolveTealscript = (
    ref: StudyTemplateTealscriptStudy | undefined,
    instance: Omit<IndicatorInstance, 'builtinId'>,
  ): IndicatorInstance | null => {
    if (!ref) return null;
    const definition = customStudies.find((study) => study.sourceId === ref.sourceId);
    if (!definition) {
      missing.set(ref.sourceId, ref);
      return null;
    }
    return {
      ...instance,
      name: definition.name,
      builtinId: definition.id,
      sourceKind: 'custom_tealchart_study',
      sourceId: ref.sourceId,
      ...(definition.sourceHash ? { sourceHash: definition.sourceHash } : {}),
    };
  };

  let indicators: IndicatorInstance[];
  if (templateIndicators) {
    // Written together with the TradingView part, so it is authoritative for
    // identity; the TV source of the same id rides along for a faithful re-save.
    const fromTv = new Map(layout.data.indicators.map((indicator) => [indicator.id, indicator]));
    indicators = [];
    for (const entry of templateIndicators) {
      const instance = {
        id: entry.id,
        name: entry.name,
        inputs: isRecord(entry.inputs) ? entry.inputs : {},
        ...(entry.styleOverrides ? { styleOverrides: entry.styleOverrides } : {}),
        isVisible: entry.isVisible !== false,
        createdAt: typeof entry.createdAt === 'number' ? entry.createdAt : 0,
      };
      if (typeof entry.tealscriptStudy === 'number') {
        const resolved = resolveTealscript(tealscriptStudies[entry.tealscriptStudy], instance);
        if (resolved) indicators.push(resolved);
        continue;
      }
      const tradingViewStudy = fromTv.get(entry.id)?.tradingViewStudy;
      indicators.push({ ...instance, builtinId: entry.builtinId!, ...(tradingViewStudy ? { tradingViewStudy } : {}) });
    }
  } else {
    // No Tealchart instance list: a TradingView-written template. Any TealScript
    // study the envelope names gets a default instance.
    indicators = [...layout.data.indicators];
    const now = Date.now();
    tealscriptStudies.forEach((ref, index) => {
      const resolved = resolveTealscript(ref, {
        id: `tealscript_${now}_${index}`,
        name: ref.name,
        inputs: {},
        isVisible: true,
        createdAt: now + index,
      });
      if (resolved) indicators.push(resolved);
    });
  }

  const preservedTradingViewStudies = layout.data.preservedTradingViewStudies ?? [];
  return {
    indicators,
    preservedTradingViewStudies,
    missingTealscriptStudies: Array.from(missing.values()),
    unsupportedStudies: preservedTradingViewStudies
      .filter((study) => study.mappingStatus === 'preserved' && !isTvVolumeStudy(study.source as unknown as TvSource))
      .map((study) => getStudyName(study.source as unknown as TvSource)),
    ...(typeof template.interval === 'string' ? { interval: template.interval as ResolutionString } : {}),
    ...(typeof template.symbol === 'string' ? { symbol: template.symbol } : {}),
  };
}
