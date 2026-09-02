import type { PlotOutput } from '@tealstreet/tealscript';

export interface IndicatorOutputPaneInfo {
  overlay: boolean;
  paneId?: string;
  format?: string;
  precision?: number;
  scale?: string;
}

export interface IndicatorOutputPane {
  id: string;
  type: string;
  indicatorIds?: readonly string[];
}

export interface IndicatorOutputAxisLabelSource {
  id: string;
  paneId: string;
  plotId: string;
  plotOffset?: number;
  scriptId: string;
  sourceIndex: number;
  value: number;
  color: string;
  format?: string;
  precision?: number;
  sourceX?: number;
}

export function resolveIndicatorOutputSourceTime({
  bars,
  plotOffset,
  sourceIndex,
}: {
  bars?: readonly { time?: number }[];
  plotOffset?: number;
  sourceIndex: number | undefined;
}): number | undefined {
  if (sourceIndex == null) return undefined;

  const bar = bars?.[sourceIndex];
  if (!bar || !Number.isFinite(bar.time ?? NaN)) return undefined;

  const offset = Number.isFinite(plotOffset ?? NaN) ? plotOffset! : 0;
  if (offset === 0 || !bars || bars.length < 2) return bar.time;

  const interval = (bars[1]?.time ?? NaN) - (bars[0]?.time ?? NaN);
  if (!Number.isFinite(interval) || interval === 0) return bar.time;

  return bar.time! + offset * interval;
}

export function getIndicatorPlotColor(color: PlotOutput['color'], sourceIndex: number, fallback = '#2196F3'): string {
  if (Array.isArray(color)) {
    for (let index = Math.min(sourceIndex, color.length - 1); index >= 0; index -= 1) {
      const item = color[index];
      if (item) return item;
    }
    return fallback;
  }

  return color || fallback;
}

export function shouldUseIndicatorPlotForAxisLabel(plot: PlotOutput): boolean {
  return plot.type === 'plot' && plot.display !== 0 && !plot.forceOverlay;
}

export function getLatestIndicatorPlotValue(
  plot: PlotOutput,
  totalBarCount = plot.values.length,
): { sourceIndex: number; value: number } | null {
  if (!shouldUseIndicatorPlotForAxisLabel(plot)) return null;
  if (totalBarCount <= 0 || plot.values.length === 0) return null;

  const lastIndex = Math.min(totalBarCount - 1, plot.values.length - 1);
  const firstAllowedIndex = plot.showLast && plot.showLast > 0 ? Math.max(0, totalBarCount - plot.showLast) : 0;

  for (let index = lastIndex; index >= firstAllowedIndex; index -= 1) {
    const value = plot.values[index];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return { sourceIndex: index, value };
    }
  }

  return null;
}

export function getIndicatorOutputAxisLabelSources({
  indicatorPaneInfo,
  panes,
  plots,
  totalBarCount,
}: {
  indicatorPaneInfo?: Readonly<Record<string, IndicatorOutputPaneInfo>>;
  panes: readonly IndicatorOutputPane[];
  plots?: readonly PlotOutput[];
  totalBarCount?: number;
}): IndicatorOutputAxisLabelSource[] {
  if (!plots || plots.length === 0) return [];

  const mainPaneId = panes.find((pane) => pane.type === 'main')?.id ?? 'main';
  const paneByScriptId = new Map<string, string>();
  for (const pane of panes) {
    if (pane.type !== 'indicator') continue;
    for (const scriptId of pane.indicatorIds ?? []) {
      paneByScriptId.set(scriptId, pane.id);
    }
  }

  const outputLabels: IndicatorOutputAxisLabelSource[] = [];
  for (const plot of plots) {
    const scriptId = plot.scriptId ?? 'unknown';
    const info = indicatorPaneInfo?.[scriptId];
    if (info?.scale === 'none') continue;
    const paneId = info?.overlay === false ? info.paneId ?? paneByScriptId.get(scriptId) : mainPaneId;
    if (!paneId) continue;

    const latest = getLatestIndicatorPlotValue(plot, totalBarCount);
    if (!latest) continue;

    outputLabels.push({
      id: `${paneId}:indicator-output:${scriptId}:${plot.id}`,
      paneId,
      plotId: plot.id,
      plotOffset: plot.offset,
      scriptId,
      sourceIndex: latest.sourceIndex,
      value: latest.value,
      color: getIndicatorPlotColor(plot.color, latest.sourceIndex),
      format: plot.format ?? info?.format,
      precision: plot.precision ?? info?.precision,
    });
  }

  return outputLabels;
}

function formatVolumeValue(value: number): string {
  const abs = Math.abs(value);
  const suffixes: Array<[number, string]> = [
    [1_000_000_000_000, 'T'],
    [1_000_000_000, 'B'],
    [1_000_000, 'M'],
    [1_000, 'K'],
  ];

  for (const [threshold, suffix] of suffixes) {
    if (abs >= threshold) {
      const scaled = value / threshold;
      const decimals = Math.abs(scaled) >= 10 ? 1 : 2;
      return `${scaled.toFixed(decimals).replace(/\.0+$/, '').replace(/(\.\d)0$/, '$1')}${suffix}`;
    }
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(value);
}

export function getIndicatorOutputAxisLabelDecimals(range: number, precision?: number): number {
  if (typeof precision === 'number' && Number.isFinite(precision) && precision >= 0) {
    return Math.min(8, Math.floor(precision));
  }

  if (range >= 1_000) return 0;
  if (range >= 10) return 1;
  if (range >= 1) return 2;
  if (range >= 0.01) return 3;
  return 4;
}

export function formatIndicatorOutputAxisValue(value: number, range: number, precision?: number, format?: string): string {
  if (format === 'volume') {
    return formatVolumeValue(value);
  }

  const decimals = getIndicatorOutputAxisLabelDecimals(range, precision);
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true,
  }).format(value);

  return format === 'percent' ? `${formatted}%` : formatted;
}
