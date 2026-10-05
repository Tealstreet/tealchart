import type { PlotOutput } from '@tealstreet/tealscript';
import type { Bar } from '../../types';
import type { NativeVisibleBar } from './nativeVisibleBars';

import { resolveIndicatorOutputSourceTime } from '../../rendering/indicatorOutputAxisLabels';
import { getPlotFillIndexBounds } from '../../rendering/plotFillGeometry';
import { targetIndexAtTime } from './nativeOffsetPlotBars';

export function getNativeFillTargetBars(
  bars: readonly Bar[] | undefined,
  visibleBars: readonly NativeVisibleBar[],
  plot1: PlotOutput,
  plot2: PlotOutput,
  startTime: number,
  endTime: number,
): readonly NativeVisibleBar[] {
  if (!bars?.length) return visibleBars;
  const [first, last] = getPlotFillIndexBounds(plot1, plot2, bars.length);
  const span = endTime - startTime;
  const low = Math.max(first, Math.floor(targetIndexAtTime(bars, startTime - span)));
  const high = Math.min(last, Math.ceil(targetIndexAtTime(bars, endTime + span)));
  const interval = bars.length > 1 ? bars[1].time - bars[0].time : 0;
  const result: NativeVisibleBar[] = [];
  for (let index = low; index <= high; index++) {
    const time = resolveIndicatorOutputSourceTime({ bars, sourceIndex: 0, plotOffset: index });
    if (time === undefined) continue;
    result.push({ ...bars[Math.min(Math.max(0, index), bars.length - 1)], time, sourceIndex: index, interval, x: 0 });
  }
  return result;
}
