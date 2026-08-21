import type { Bar } from '../../types';
import type { NativeChartFrame } from './nativeChartFrame';
import type { NativeChartProjection } from './nativeProjection';

import { getNativeCandidateTimeWindow } from './nativeTimeWindow';

const MIN_CANDLE_WIDTH = 1;
const MAX_CANDLE_WIDTH = 10;

export interface NativeVisibleCandleGeometry {
  visible: boolean;
  bodyVisible: boolean;
  bodyY: number;
  bodyHeight: number;
  wickTopY: number;
  wickBottomY: number;
}

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.max(min, Math.min(max, value));
}

export type NativeVisibleBar = Bar & {
  interval: number;
  sourceIndex: number;
  x: number;
};

export function getNativeCandleWidth(interval: number, viewportRange: number, contentWidth: number): number {
  'worklet';
  if (
    !Number.isFinite(interval) ||
    !Number.isFinite(viewportRange) ||
    !Number.isFinite(contentWidth) ||
    viewportRange <= 0 ||
    contentWidth <= 0
  ) {
    return MIN_CANDLE_WIDTH;
  }

  return Math.max(
    MIN_CANDLE_WIDTH,
    Math.min(MAX_CANDLE_WIDTH, (Math.max(1, interval) / Math.max(1, viewportRange)) * contentWidth * 0.7),
  );
}

export function getNativeBarInterval(bars: readonly Bar[], fallbackInterval: number): number {
  let interval = Number.isFinite(fallbackInterval) && fallbackInterval > 0 ? fallbackInterval : 1;
  for (let index = 1; index < bars.length; index += 1) {
    const delta = bars[index].time - bars[index - 1].time;
    if (Number.isFinite(delta) && delta > 0) {
      interval = Math.min(interval, delta);
    }
  }
  return Math.max(1, interval);
}

/** First index whose bar is at or after `time`, or `bars.length` if none is. */
function findFirstNativeBarAtOrAfter(bars: readonly Bar[], time: number): number {
  let low = 0;
  let high = bars.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (bars[middle].time < time) low = middle + 1;
    else high = middle;
  }
  return low;
}

export function getNativeVisibleBars(bars: readonly Bar[], projection: NativeChartProjection): NativeVisibleBar[] {
  const { viewport } = projection;
  const { startTime: visibleStartTime, endTime: visibleEndTime } = getNativeCandidateTimeWindow(viewport);
  // A non-finite bound compares false against everything, so without this the
  // scan would never terminate its window and would return the whole history.
  if (!Number.isFinite(visibleStartTime) || !Number.isFinite(visibleEndTime)) return [];
  const interval = getNativeBarInterval(bars, viewport.endTime - viewport.startTime);

  // Bars are time-ordered, so the window is a slice. Scanning and filtering the
  // whole history instead allocated two throwaway objects per bar on every
  // projection change, which is every committed pan and zoom.
  const visible: NativeVisibleBar[] = [];
  for (let index = findFirstNativeBarAtOrAfter(bars, visibleStartTime); index < bars.length; index += 1) {
    const bar = bars[index];
    // Skipped rather than breaking, matching the filter this replaced.
    if (!Number.isFinite(bar.time)) continue;
    if (bar.time > visibleEndTime) break;
    visible.push({ ...bar, interval, sourceIndex: index, x: projection.timeToX(bar.time) });
  }
  return visible;
}

export function getNativeViewportMaxVolume(
  bars: readonly NativeVisibleBar[],
  startTime: number,
  endTime: number,
): number {
  'worklet';
  let maxVolume = 1;
  for (let index = 0; index < bars.length; index += 1) {
    const bar = bars[index];
    const halfInterval = Math.max(0, bar.interval) / 2;
    if (bar.time + halfInterval < startTime || bar.time - halfInterval > endTime) continue;
    maxVolume = Math.max(maxVolume, bar.volume || 0);
  }
  return maxVolume;
}

export function getNativeVisibleCandleGeometry(input: {
  clipBottom?: number;
  clipTop?: number;
  frame: NativeChartFrame;
  openY: number;
  closeY: number;
  highY: number;
  lowY: number;
}): NativeVisibleCandleGeometry {
  'worklet';
  const paneTop = input.clipTop ?? input.frame.mainPane.top;
  const paneBottom = input.clipBottom ?? input.frame.mainPane.bottom;
  const highY = Math.min(input.highY, input.lowY);
  const lowY = Math.max(input.highY, input.lowY);

  if (lowY < paneTop || highY > paneBottom) {
    return {
      visible: false,
      bodyVisible: false,
      bodyY: 0,
      bodyHeight: 0,
      wickTopY: 0,
      wickBottomY: 0,
    };
  }

  const rawBodyTop = Math.min(input.openY, input.closeY);
  const rawBodyBottom = Math.max(input.openY, input.closeY);
  const bodyVisible = rawBodyBottom >= paneTop && rawBodyTop <= paneBottom;
  const bodyTop = bodyVisible ? clamp(rawBodyTop, paneTop, paneBottom) : 0;
  const bodyBottom = bodyVisible ? clamp(rawBodyBottom, paneTop, paneBottom) : 0;

  return {
    visible: true,
    bodyVisible,
    bodyY: bodyTop,
    bodyHeight: bodyVisible ? Math.max(1, bodyBottom - bodyTop) : 0,
    wickTopY: clamp(highY, paneTop, paneBottom),
    wickBottomY: clamp(lowY, paneTop, paneBottom),
  };
}
