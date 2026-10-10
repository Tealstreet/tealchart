import type { Bar, Viewport } from '../../types';

export interface NativeAutoScaleBar {
  time: number;
  high: number;
  low: number;
}

export const NATIVE_PRICE_AUTO_SCALE_PADDING = 0.1;

export function createNativeAutoScaleBars(bars: readonly Bar[]): NativeAutoScaleBar[] {
  return bars.map((bar) => ({
    time: bar.time,
    high: bar.high,
    low: bar.low,
  }));
}

function lowerBound(bars: readonly NativeAutoScaleBar[], target: number): number {
  'worklet';
  let lo = 0;
  let hi = bars.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (bars[mid].time < target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

function upperBound(bars: readonly NativeAutoScaleBar[], target: number): number {
  'worklet';
  let lo = 0;
  let hi = bars.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (bars[mid].time <= target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

export function getNativeVisibleBarsBoundingBox(
  bars: readonly NativeAutoScaleBar[],
  startTime: number,
  endTime: number,
): { highest: number; lowest: number } | null {
  'worklet';
  if (bars.length === 0) return null;

  const startIdx = lowerBound(bars, startTime);
  const endIdx = upperBound(bars, endTime);
  if (startIdx >= endIdx) return null;

  let highest = -Infinity;
  let lowest = Infinity;

  for (let index = startIdx; index < endIdx; index += 1) {
    const bar = bars[index];
    if (bar.high > highest) highest = bar.high;
    if (bar.low < lowest) lowest = bar.low;
  }

  return { highest, lowest };
}

/**
 * The bounding box with the live last bar folded in. `tail` replaces the committed last
 * bar only when it is that same bar; the caller has already matched its market.
 */
function getNativeLiveVisibleBarsBoundingBox(
  bars: readonly NativeAutoScaleBar[],
  startTime: number,
  endTime: number,
  tail: NativeAutoScaleBar | null,
): { highest: number; lowest: number } | null {
  'worklet';
  const bbox = getNativeVisibleBarsBoundingBox(bars, startTime, endTime);
  const last = bars[bars.length - 1];
  if (!tail || !last || tail.time !== last.time || tail.time < startTime || tail.time > endTime) return bbox;
  if (!bbox) return { highest: tail.high, lowest: tail.low };
  return { highest: Math.max(bbox.highest, tail.high), lowest: Math.min(bbox.lowest, tail.low) };
}

export function applyNativePriceAutoScale(
  viewport: Viewport,
  bars: readonly NativeAutoScaleBar[],
  padding: number = NATIVE_PRICE_AUTO_SCALE_PADDING,
  tail: NativeAutoScaleBar | null = null,
): Viewport {
  'worklet';
  const bbox = getNativeLiveVisibleBarsBoundingBox(bars, viewport.startTime, viewport.endTime, tail);
  if (!bbox) return viewport;

  const dataRange = bbox.highest - bbox.lowest;
  if (dataRange === 0) {
    const safePadding = Math.abs(bbox.highest) * 0.01 || 1;
    return {
      ...viewport,
      priceMax: bbox.highest + safePadding,
      priceMin: bbox.lowest - safePadding,
    };
  }

  return {
    ...viewport,
    priceMax: bbox.highest + dataRange * padding,
    priceMin: bbox.lowest - dataRange * padding,
  };
}

/**
 * The price half of a restored viewport, re-fitted to the bars it lands on.
 *
 * A saved layout carries absolute prices, so restoring one months later framed
 * a market that had since moved far outside it - the axis sat where the price
 * used to be and no candle was on screen until the first drag ran the gesture
 * path's auto-scale. The saved time window still stands; only the price is
 * derived. A window with no bars in it has nothing to frame, so the auto
 * viewport takes over entirely.
 */
export function fitNativeRestoredViewportPrice({
  autoScaleEnabled,
  autoViewport,
  bars,
  viewport,
}: {
  autoScaleEnabled: boolean;
  autoViewport: Viewport | null;
  bars: readonly NativeAutoScaleBar[];
  viewport: Viewport;
}): Viewport {
  if (!autoScaleEnabled) return viewport;
  if (!getNativeVisibleBarsBoundingBox(bars, viewport.startTime, viewport.endTime)) {
    return autoViewport ?? viewport;
  }
  return applyNativePriceAutoScale(viewport, bars);
}
