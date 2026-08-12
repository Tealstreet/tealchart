/**
 * Where Tealchart's flat chart-property paths live inside a TradingView layout.
 *
 * Tealchart persists properties keyed by TradingView's *override* paths, which
 * are flat and dotted ('paneProperties.background'). A saved layout stores the
 * same information as nested objects in two different places, so the two forms
 * need an explicit table rather than a string split.
 *
 * Verified against the shipped charting library bundle (ChartModel.state), which
 * builds each saved chart as:
 *
 *   { panes, timeScale, chartProperties: { paneProperties, scalesProperties, ... }, ... }
 *
 * Note the two traps this table encodes:
 * - `chartProperties` is per-chart (charts[0].chartProperties), not at the root.
 * - Main-series style has no `mainSourceProperties` in a layout — that key only
 *   exists in a chart *template*. In a layout it stays on the main series
 *   source's own `state`.
 */

import type { ChartProperties, ChartPropertyKey, PreservedTvProperties } from '../types';

import { sanitizeChartProperties } from '../overrides';

type TvPropertyContainer = 'chartProperties' | 'mainSeriesState';

interface TvPropertyLocation {
  container: TvPropertyContainer;
  path: readonly string[];
}

const TV_PROPERTY_LOCATIONS: Record<ChartPropertyKey, TvPropertyLocation> = {
  'paneProperties.background': {
    container: 'chartProperties',
    path: ['paneProperties', 'background'],
  },
  'paneProperties.vertGridProperties.color': {
    container: 'chartProperties',
    path: ['paneProperties', 'vertGridProperties', 'color'],
  },
  'paneProperties.horzGridProperties.color': {
    container: 'chartProperties',
    path: ['paneProperties', 'horzGridProperties', 'color'],
  },
  'paneProperties.crossHairProperties.color': {
    container: 'chartProperties',
    path: ['paneProperties', 'crossHairProperties', 'color'],
  },
  'scalesProperties.textColor': {
    container: 'chartProperties',
    path: ['scalesProperties', 'textColor'],
  },
  'mainSeriesProperties.candleStyle.upColor': {
    container: 'mainSeriesState',
    path: ['candleStyle', 'upColor'],
  },
  'mainSeriesProperties.candleStyle.downColor': {
    container: 'mainSeriesState',
    path: ['candleStyle', 'downColor'],
  },
};

/** Segments that must never be walked or written when touching parsed JSON. */
const UNSAFE_KEYS: ReadonlySet<string> = new Set(['__proto__', 'constructor', 'prototype']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readPath(root: unknown, path: readonly string[]): unknown {
  let current: unknown = root;
  for (const segment of path) {
    if (UNSAFE_KEYS.has(segment)) return undefined;
    if (!isPlainObject(current)) return undefined;
    current = current[segment];
  }
  return current;
}

function writePath(root: Record<string, unknown>, path: readonly string[], value: unknown): void {
  let current: Record<string, unknown> = root;
  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index]!;
    if (UNSAFE_KEYS.has(segment)) return;
    const existing = current[segment];
    if (!isPlainObject(existing)) {
      const created: Record<string, unknown> = {};
      current[segment] = created;
      current = created;
    } else {
      current = existing;
    }
  }
  const last = path[path.length - 1];
  if (last === undefined || UNSAFE_KEYS.has(last)) return;
  current[last] = value;
}

/**
 * Deep-clone parsed layout JSON for safe re-emission.
 *
 * This is the one place foreign keys are copied wholesale, so it is also the
 * only place prototype pollution could enter: JSON.parse happily produces an own
 * property literally named "__proto__", and assigning it during a naive clone
 * would poison Object.prototype. Unsafe keys are dropped instead.
 */
export function clonePreservableTvProperties(value: unknown): Record<string, unknown> | undefined {
  if (!isPlainObject(value)) return undefined;
  const cloned = cloneObject(value);
  return Object.keys(cloned).length > 0 ? cloned : undefined;
}

function cloneObject(source: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(source)) {
    if (UNSAFE_KEYS.has(key)) continue;
    if (isPlainObject(entry)) {
      result[key] = cloneObject(entry);
    } else if (Array.isArray(entry)) {
      result[key] = entry.map((item) => (isPlainObject(item) ? cloneObject(item) : item));
    } else {
      result[key] = entry;
    }
  }
  return result;
}

export interface TvChartPropertySources {
  /** charts[0].chartProperties from a saved layout. */
  chartProperties?: unknown;
  /** The main series source's `state`, which carries candleStyle. */
  mainSeriesState?: unknown;
}

/**
 * Pull the properties we support out of a TradingView layout.
 *
 * Anything we do not model is ignored here and left untouched in the layout, so
 * a foreign layout keeps properties this build has never heard of.
 */
export function readTvChartProperties(sources: TvChartPropertySources): ChartProperties | undefined {
  const collected: Record<string, unknown> = {};

  for (const [key, location] of Object.entries(TV_PROPERTY_LOCATIONS) as [ChartPropertyKey, TvPropertyLocation][]) {
    const root = location.container === 'chartProperties' ? sources.chartProperties : sources.mainSeriesState;
    const value = readPath(root, location.path);
    if (value !== undefined) collected[key] = value;
  }

  return sanitizeChartProperties(collected);
}

/** Later sources win per key; returns undefined when nothing survives. */
export function mergeChartProperties(...sources: (ChartProperties | undefined)[]): ChartProperties | undefined {
  const merged: ChartProperties = {};
  for (const source of sources) {
    if (source) Object.assign(merged, source);
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

/** Snapshot the foreign property objects an imported layout carried. */
export function capturePreservedTvProperties(
  chartProperties: unknown,
  mainSeriesState: unknown,
): PreservedTvProperties | undefined {
  const preservedChartProperties = clonePreservableTvProperties(chartProperties);
  const preservedCandleStyle = isPlainObject(mainSeriesState)
    ? clonePreservableTvProperties(mainSeriesState.candleStyle)
    : undefined;

  if (!preservedChartProperties && !preservedCandleStyle) return undefined;
  return {
    ...(preservedChartProperties ? { chartProperties: preservedChartProperties } : {}),
    ...(preservedCandleStyle ? { candleStyle: preservedCandleStyle } : {}),
  };
}

/**
 * Write our properties into the canonical TradingView locations, merging rather
 * than replacing so sibling properties we do not model survive the round trip.
 *
 * Mutates and returns the containers; callers pass the objects they own.
 */
export function writeTvChartProperties(
  properties: ChartProperties | undefined,
  targets: { chartProperties: Record<string, unknown>; mainSeriesState: Record<string, unknown> },
): void {
  if (!properties) return;

  for (const [key, value] of Object.entries(properties)) {
    if (value === undefined) continue;
    const location = TV_PROPERTY_LOCATIONS[key as ChartPropertyKey];
    if (!location) continue;
    const target = location.container === 'chartProperties' ? targets.chartProperties : targets.mainSeriesState;
    writePath(target, location.path, value);
  }
}
