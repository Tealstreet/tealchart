import type { Bar } from '../../types';
import type { NativeVisibleBar } from './nativeVisibleBars';

import { resolveIndicatorOutputSourceTime } from '../../rendering/indicatorOutputAxisLabels';

/** Offset applies to bar indices, including loaded gaps and extrapolated endpoints. */
export function getNativeOffsetPlotBars(
  bars: readonly Bar[] | undefined,
  visibleBars: readonly NativeVisibleBar[],
  offset: number,
  startTime: number,
  endTime: number,
): readonly NativeVisibleBar[] {
  if (!bars?.length || offset === 0) return visibleBars;
  const interval = bars.length > 1 ? bars[1].time - bars[0].time : 0;
  if (bars.length < 2) return visibleBars.map((bar) => ({ ...bar, interval }));
  const first = visibleBars[0]?.sourceIndex ?? targetIndexAtTime(bars, startTime - (endTime - startTime));
  const last =
    visibleBars[visibleBars.length - 1]?.sourceIndex ?? targetIndexAtTime(bars, endTime + (endTime - startTime));
  const result: NativeVisibleBar[] = [];
  for (
    let index = Math.max(0, Math.floor(first - offset));
    index <= Math.min(bars.length - 1, Math.ceil(last - offset));
    index++
  ) {
    const time = resolveIndicatorOutputSourceTime({ bars, sourceIndex: index, plotOffset: offset });
    if (time === undefined) continue;
    result.push({ ...bars[index], time, sourceIndex: index, interval, x: 0 });
  }
  return result;
}

export function targetIndexAtTime(bars: readonly Bar[], time: number): number {
  if (bars.length < 2) return 0;
  if (time < bars[0].time) return (time - bars[0].time) / (bars[1].time - bars[0].time);
  const last = bars.length - 1;
  if (time > bars[last].time) return last + (time - bars[last].time) / (bars[last].time - bars[last - 1].time);
  let low = 0,
    high = bars.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (bars[mid].time < time) low = mid + 1;
    else high = mid;
  }
  return low;
}
