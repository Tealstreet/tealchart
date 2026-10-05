import type { PlotOutput } from '@tealstreet/tealscript';
import type { PlotFillGradient } from '../../rendering/plotFillGeometry';
import type { NativeVisibleBar } from './nativeVisibleBars';

import { getPlotFillSample, plotFillGradientKey } from '../../rendering/plotFillGeometry';

export interface NativeFillPaint {
  key: string;
  color?: string;
  gradient?: PlotFillGradient;
}
export function getNativeFillPaints(
  fill: PlotOutput,
  plot1: PlotOutput,
  plot2: PlotOutput,
  bars: readonly NativeVisibleBar[],
  total: number,
): NativeFillPaint[] {
  const paints = new Map<string, NativeFillPaint>();
  for (const bar of bars) {
    const sample = getPlotFillSample(fill, plot1, plot2, bar.sourceIndex, total);
    if (sample.kind !== 'point') continue;
    if (sample.gradient) {
      const key = plotFillGradientKey(sample.gradient);
      paints.set(key, { key, gradient: sample.gradient });
    } else if (sample.color !== null)
      paints.set(`color|${sample.color}`, { key: `color|${sample.color}`, color: sample.color });
  }
  return [...paints.values()];
}
