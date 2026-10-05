import type { PlotOutput } from '@tealstreet/tealscript';

export interface PlotFillGradient {
  topValue: number;
  bottomValue: number;
  topColor: string;
  bottomColor: string;
}
export type PlotFillSample =
  | { kind: 'break' }
  | { kind: 'gap' }
  | {
      kind: 'point';
      value1: number;
      value2: number;
      color: string | null;
      gradient?: PlotFillGradient;
    };

export function getPlotFillIndexBounds(plot1: PlotOutput, plot2: PlotOutput, totalBarCount: number): [number, number] {
  'worklet';
  let first = -Infinity,
    last = Infinity;
  let hasPlot = false;
  for (const plot of [plot1, plot2]) {
    if (plot.type === 'hline') continue;
    hasPlot = true;
    first = Math.max(first, plot.offset ?? 0);
    last = Math.min(last, totalBarCount - 1 + (plot.offset ?? 0));
  }
  return hasPlot ? [first, last] : [0, totalBarCount - 1];
}

function allowsPlotIndex(plot: PlotOutput, total: number, index: number): boolean {
  'worklet';
  return plot.showLast === undefined || (plot.showLast > 0 && index >= Math.max(0, total - plot.showLast));
}
function boundaryValue(plot: PlotOutput, index: number, total: number): number | null {
  'worklet';
  const source = index - (plot.offset ?? 0);
  const value = plot.type === 'hline' ? plot.price : allowsPlotIndex(plot, total, source) ? plot.values[source] : null;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Sampling is independent of the Canvas/Skia projection and color batching. */
export function getPlotFillSample(
  fill: PlotOutput,
  plot1: PlotOutput,
  plot2: PlotOutput,
  index: number,
  total: number,
): PlotFillSample {
  'worklet';
  if (!allowsPlotIndex(fill, total, index)) return { kind: 'break' };
  const colorIndex = Math.min(Math.max(index, 0), total - 1);
  const color = Array.isArray(fill.color) ? (fill.color[colorIndex] ?? null) : (fill.color ?? null);
  let gradient: PlotFillGradient | undefined;
  if (fill.gradient) {
    const topValue = fill.gradient.topValues[colorIndex],
      bottomValue = fill.gradient.bottomValues[colorIndex];
    const topColor = fill.gradient.topColors[colorIndex],
      bottomColor = fill.gradient.bottomColors[colorIndex];
    if (
      typeof topValue !== 'number' ||
      !Number.isFinite(topValue) ||
      typeof bottomValue !== 'number' ||
      !Number.isFinite(bottomValue) ||
      (!topColor && !bottomColor)
    )
      return { kind: 'break' };
    gradient = {
      topValue,
      bottomValue,
      topColor: topColor ?? 'transparent',
      bottomColor: bottomColor ?? 'transparent',
    };
  } else if (color === null) return { kind: 'break' };
  const value1 = boundaryValue(plot1, index, total),
    value2 = boundaryValue(plot2, index, total);
  if (value1 === null || value2 === null) return { kind: 'gap' };
  return { kind: 'point', value1, value2, color, gradient };
}

export function plotFillGradientKey(gradient: PlotFillGradient): string {
  'worklet';
  return `${gradient.topValue}|${gradient.bottomValue}|${gradient.topColor}|${gradient.bottomColor}`;
}

export function appendPlotFillQuad(
  path: { moveTo(x: number, y: number): unknown; lineTo(x: number, y: number): unknown },
  previous: { x: number; y1: number; y2: number },
  current: { x: number; y1: number; y2: number },
): void {
  'worklet';
  path.moveTo(previous.x, previous.y1);
  path.lineTo(current.x, current.y1);
  path.lineTo(current.x, current.y2);
  path.lineTo(previous.x, previous.y2);
}
