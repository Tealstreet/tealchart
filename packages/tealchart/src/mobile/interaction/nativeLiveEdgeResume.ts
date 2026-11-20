import type { Bar, Viewport } from '../../types';

/**
 * How long after a return to the foreground the chart keeps following new bars
 * for a view that was at the live edge. It covers the live-gap backfill's retry
 * budget (#1551), whose bars can land well after the first tick.
 */
export const NATIVE_LIVE_EDGE_RESUME_WINDOW_MS = 150_000;

/** The newest loaded bar is inside the window: the view is following the market. */
export function isNativeViewportAtLiveEdge(viewport: Viewport | null, bars: readonly Bar[]): boolean {
  const last = bars[bars.length - 1];
  return Boolean(viewport && last && last.time >= viewport.startTime && last.time <= viewport.endTime);
}

/**
 * The window shifted by however far the newest bar moved since `pinnedLastBarTime`,
 * so the newest bar keeps the right-edge offset the last one had and the zoom is
 * unchanged. Null when there is nothing new or the newest bar is already in view.
 */
export function resolveNativeLiveEdgeResumeViewport({
  bars,
  intervalMs,
  pinnedLastBarTime,
  viewport,
}: {
  bars: readonly Bar[];
  intervalMs: number;
  pinnedLastBarTime: number;
  viewport: Viewport;
}): Viewport | null {
  const last = bars[bars.length - 1];
  if (!last || last.time <= pinnedLastBarTime) return null;
  if (last.time + intervalMs / 2 <= viewport.endTime) return null;
  const shift = last.time - pinnedLastBarTime;
  return { ...viewport, startTime: viewport.startTime + shift, endTime: viewport.endTime + shift };
}
