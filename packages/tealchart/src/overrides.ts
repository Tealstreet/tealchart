/**
 * TradingView override-path mapping, shared by the web widget and the native chart.
 *
 * `applyOverrides` is part of the widget contract both platforms implement, so the
 * path translation lives here rather than being reimplemented per platform and
 * drifting.
 */

import type { ChartOverrides, ChartProperties, ChartPropertyKey, RenderOptions } from './types';

/**
 * The persistable chart property paths, as a runtime list.
 *
 * Declared as a Record keyed by the union rather than an array with `satisfies`.
 * `satisfies` only checks assignability one way: it catches a key removed from
 * the union but left here, and misses a key ADDED to the union and forgotten
 * here — which would silently drop that setting on load. Record<ChartPropertyKey, true>
 * makes both directions a compile error.
 */
const CHART_PROPERTY_KEY_PRESENCE: Record<ChartPropertyKey, true> = {
  'mainSeriesProperties.candleStyle.upColor': true,
  'mainSeriesProperties.candleStyle.downColor': true,
  'paneProperties.background': true,
  'paneProperties.vertGridProperties.color': true,
  'paneProperties.horzGridProperties.color': true,
  'paneProperties.crossHairProperties.color': true,
  'scalesProperties.textColor': true,
};

export const CHART_PROPERTY_KEYS = Object.keys(CHART_PROPERTY_KEY_PRESENCE) as readonly ChartPropertyKey[];

const CHART_PROPERTY_KEY_SET: ReadonlySet<string> = new Set<string>(CHART_PROPERTY_KEYS);

/**
 * Narrow arbitrary parsed JSON to the properties we understand.
 *
 * Layout content is untrusted: it can come from a foreign TradingView layout or
 * a hand-edited store. Unknown keys and wrong-typed values are dropped rather
 * than trusted into a typed field. Returns undefined when nothing survives, so
 * "no customization" stays absent instead of becoming an empty object.
 */
export function sanitizeChartProperties(value: unknown): ChartProperties | undefined {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return undefined;

  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!CHART_PROPERTY_KEY_SET.has(key)) continue;
    // Every supported path is a color string today. Widen this alongside the
    // union when a numeric or boolean property is added.
    if (typeof entry !== 'string') continue;
    result[key] = entry;
  }

  return Object.keys(result).length > 0 ? (result as ChartProperties) : undefined;
}

export function applyChartOverridesToRenderOptions(
  current: Partial<RenderOptions>,
  overrides: ChartOverrides,
): Partial<RenderOptions> {
  const next: Partial<RenderOptions> = { ...current };

  if (overrides['mainSeriesProperties.candleStyle.upColor']) {
    next.upColor = overrides['mainSeriesProperties.candleStyle.upColor'];
  }
  if (overrides['mainSeriesProperties.candleStyle.downColor']) {
    next.downColor = overrides['mainSeriesProperties.candleStyle.downColor'];
  }
  if (overrides['paneProperties.background']) {
    next.backgroundColor = overrides['paneProperties.background'];
  }
  if (overrides['paneProperties.vertGridProperties.color']) {
    next.gridColor = overrides['paneProperties.vertGridProperties.color'];
  }
  if (overrides['paneProperties.horzGridProperties.color']) {
    next.gridColor = overrides['paneProperties.horzGridProperties.color'];
  }
  if (overrides['scalesProperties.textColor']) {
    next.textColor = overrides['scalesProperties.textColor'];
  }
  if (overrides['paneProperties.crossHairProperties.color']) {
    next.crosshairColor = overrides['paneProperties.crossHairProperties.color'];
  }
  if (overrides['volumePaneProperties.showVolume'] !== undefined) {
    next.showVolume = overrides['volumePaneProperties.showVolume'];
  }
  if (overrides['volumePaneProperties.volumeHeight'] !== undefined) {
    next.volumeHeight = overrides['volumePaneProperties.volumeHeight'];
  }

  return next;
}
