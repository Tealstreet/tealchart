import type { Bar, Viewport } from '../../types';

/**
 * How long after a return to the foreground the chart keeps checking whether the
 * newest bar is off screen. It covers the live-gap backfill's retry budget
 * (#1551), whose bars can land well after the first tick.
 */
export const NATIVE_REFOCUS_RECENTRE_WINDOW_MS = 150_000;

/** The newest loaded bar is inside the window: the view is following the market. */
export function isNativeViewportAtLiveEdge(viewport: Viewport | null, bars: readonly Bar[]): boolean {
  const last = bars[bars.length - 1];
  return Boolean(viewport && last && last.time >= viewport.startTime && last.time <= viewport.endTime);
}

/** The same width with the newest bar at its horizontal centre; null with no bars. */
export function centreNativeViewportOnNewestBar(viewport: Viewport, bars: readonly Bar[]): Viewport | null {
  const last = bars[bars.length - 1];
  if (!last) return null;
  const halfSpan = (viewport.endTime - viewport.startTime) / 2;
  return { ...viewport, startTime: last.time - halfSpan, endTime: last.time + halfSpan };
}
