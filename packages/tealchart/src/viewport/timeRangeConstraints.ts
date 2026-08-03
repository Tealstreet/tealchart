import type { Viewport } from '../types';

export const DEFAULT_MIN_VISIBLE_BAR_WIDTH_PX = 2;
export const DEFAULT_MAX_VISIBLE_BARS = 1500;

export type TimeRangeClampAnchor = 'right' | 'center' | { ratio: number };

export interface ResolveMaxVisibleBarsInput {
  intervalMs: number;
  plotWidth: number;
  maxVisibleBars?: number;
  minVisibleBarWidthPx?: number;
}

export interface TimeRangeConstraintInput extends ResolveMaxVisibleBarsInput {
  anchor?: TimeRangeClampAnchor;
  viewport: Viewport;
}

function clampTimeRangeUnit(value: number): number {
  'worklet';
  return Math.max(0, Math.min(1, value));
}

export function resolveMaxVisibleBars({
  maxVisibleBars = DEFAULT_MAX_VISIBLE_BARS,
  minVisibleBarWidthPx = DEFAULT_MIN_VISIBLE_BAR_WIDTH_PX,
  plotWidth,
}: ResolveMaxVisibleBarsInput): number | null {
  'worklet';
  if (!Number.isFinite(plotWidth) || plotWidth <= 0) return null;
  if (!Number.isFinite(minVisibleBarWidthPx) || minVisibleBarWidthPx <= 0) return null;
  if (!Number.isFinite(maxVisibleBars) || maxVisibleBars <= 0) return null;

  const widthLimitedBars = Math.max(1, Math.floor(plotWidth / minVisibleBarWidthPx));
  return Math.max(1, Math.min(Math.floor(maxVisibleBars), widthLimitedBars));
}

export function getMaxTimeRange(input: ResolveMaxVisibleBarsInput): number | null {
  'worklet';
  if (!Number.isFinite(input.intervalMs) || input.intervalMs <= 0) return null;
  const maxVisibleBars = resolveMaxVisibleBars(input);
  return maxVisibleBars === null ? null : maxVisibleBars * input.intervalMs;
}

export function clampViewportTimeRange({
  anchor = 'right',
  viewport,
  ...input
}: TimeRangeConstraintInput): Viewport {
  'worklet';
  const maxRange = getMaxTimeRange(input);
  if (maxRange === null) return viewport;

  const range = viewport.endTime - viewport.startTime;
  if (!Number.isFinite(range) || range <= 0 || range <= maxRange) return viewport;

  if (anchor === 'right') {
    return {
      ...viewport,
      startTime: viewport.endTime - maxRange,
    };
  }

  const anchorRatio = anchor === 'center' ? 0.5 : clampTimeRangeUnit(anchor.ratio);
  const anchorTime = viewport.startTime + range * anchorRatio;

  return {
    ...viewport,
    startTime: anchorTime - maxRange * anchorRatio,
    endTime: anchorTime + maxRange * (1 - anchorRatio),
  };
}
