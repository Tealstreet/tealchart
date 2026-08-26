import type { PlotOutput } from '@tealstreet/tealscript';

export interface IndicatorOutputPaneInfo {
  overlay: boolean;
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
  scriptId: string;
  sourceIndex: number;
  value: number;
  color: string;
  precision?: number;
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
    if (info?.overlay !== false) continue;

    const paneId = paneByScriptId.get(scriptId);
    if (!paneId) continue;

    const latest = getLatestIndicatorPlotValue(plot, totalBarCount);
    if (!latest) continue;

    outputLabels.push({
      id: `${paneId}:indicator-output:${scriptId}:${plot.id}`,
      paneId,
      plotId: plot.id,
      scriptId,
      sourceIndex: latest.sourceIndex,
      value: latest.value,
      color: getIndicatorPlotColor(plot.color, latest.sourceIndex),
      precision: plot.precision,
    });
  }

  return outputLabels;
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

export function formatIndicatorOutputAxisValue(value: number, range: number, precision?: number): string {
  const decimals = getIndicatorOutputAxisLabelDecimals(range, precision);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true,
  }).format(value);
}
