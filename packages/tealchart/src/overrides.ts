/**
 * TradingView override-path mapping, shared by the web widget and the native chart.
 *
 * `applyOverrides` is part of the widget contract both platforms implement, so the
 * path translation lives here rather than being reimplemented per platform and
 * drifting.
 */

import type { ChartOverrides, RenderOptions } from './types';

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
