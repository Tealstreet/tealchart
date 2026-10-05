import type { PlotOutput } from '@tealstreet/tealscript';
import type { IndicatorOutputPaneInfo } from './indicatorOutputAxisLabels';

import {
  formatIndicatorOutputAxisValue,
  getIndicatorPlotColor,
  isNumericIndicatorOutput,
} from './indicatorOutputAxisLabels';

export interface IndicatorOutputReadout {
  plotId: string;
  scriptId: string;
  title: string;
  values: string[];
  color: string;
  statusLine: boolean;
  dataWindow: boolean;
}

export function getIndicatorOutputReadouts({
  plots,
  totalBarCount,
  sourceIndex = totalBarCount - 1,
  indicatorPaneInfo,
  pricePrecision,
}: {
  plots: readonly PlotOutput[];
  totalBarCount: number;
  sourceIndex?: number;
  indicatorPaneInfo?: Readonly<Record<string, IndicatorOutputPaneInfo>>;
  pricePrecision?: number;
}): IndicatorOutputReadout[] {
  if (totalBarCount <= 0) return [];
  return plots
    .filter((plot) => isNumericIndicatorOutput(plot) && ((plot.display ?? 31) & 6) !== 0)
    .map((plot) => {
      const scriptId = plot.scriptId ?? 'unknown';
      const info = indicatorPaneInfo?.[scriptId];
      const format = plot.format ?? info?.format;
      const precision = plot.precision ?? info?.precision;
      const visible =
        plot.showLast === undefined || (plot.showLast > 0 && sourceIndex >= Math.max(0, totalBarCount - plot.showLast));
      const sourceValues =
        plot.type === 'plotbar' || plot.type === 'plotcandle'
          ? [plot.openValues, plot.highValues, plot.lowValues, plot.closeValues]
          : [plot.displayValues ?? plot.values];
      const values = sourceValues.map((series) => {
        const value = visible ? series?.[sourceIndex] : null;
        return typeof value === 'number' && Number.isFinite(value)
          ? formatIndicatorOutputAxisValue(value, 0, precision, format, { paneType: 'main', pricePrecision })
          : 'na';
      });
      return {
        plotId: plot.id,
        scriptId,
        title: plot.title,
        values,
        color: getIndicatorPlotColor(plot.color, sourceIndex),
        statusLine: ((plot.display ?? 31) & 4) !== 0,
        dataWindow: ((plot.display ?? 31) & 2) !== 0,
      };
    });
}

export function resolveIndicatorReadoutSourceIndex(
  bars: readonly { time: number }[],
  time?: number,
): number | undefined {
  'worklet';
  if (time === undefined) return undefined;
  if (!Number.isFinite(time) || bars.length === 0) return -1;
  let low = 0;
  let high = bars.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (bars[middle].time < time) low = middle + 1;
    else high = middle;
  }
  if (low === 0) return 0;
  if (low === bars.length) return bars.length - 1;
  return time - bars[low - 1].time <= bars[low].time - time ? low - 1 : low;
}
