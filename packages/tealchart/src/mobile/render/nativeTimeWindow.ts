import type { Viewport } from '../../types';

export const NATIVE_CANDIDATE_TIME_OVERSCAN_MULTIPLIER = 1;

export function getNativeViewportTimeRange(viewport: Viewport): number {
  return Math.abs(viewport.endTime - viewport.startTime);
}

export function getNativeCandidateTimeWindow(
  viewport: Viewport,
  overscanMultiplier = NATIVE_CANDIDATE_TIME_OVERSCAN_MULTIPLIER,
): { startTime: number; endTime: number } {
  const timeRange = getNativeViewportTimeRange(viewport);
  const overscan = timeRange * overscanMultiplier;
  return {
    startTime: viewport.startTime - overscan,
    endTime: viewport.endTime + overscan,
  };
}

export function nativeViewportCoversCandidateTimeWindow(candidateViewport: Viewport, nextViewport: Viewport): boolean {
  const window = getNativeCandidateTimeWindow(candidateViewport);
  return nextViewport.startTime >= window.startTime && nextViewport.endTime <= window.endTime;
}
