import type { Bar } from '../types';

import { DEFAULT_HISTORY_BACKFILL_BAR_COUNT, MAX_HISTORY_BACKFILL_BAR_COUNT } from './historyBackfill';

/**
 * Indicator warm-up: how much history the chart loads so a TealScript study's
 * signals exist on page load, and where that history starts.
 *
 * A study with a 500-bar lookback needs ~500 bars before its first bar can signal, so the
 * default 300-bar page drew nothing until the user scrolled back. Loading more
 * is half the fix. The other half is WHERE history starts: path-dependent state
 * (repeat filters, `var` series) depends on the first bar the study sees, and a
 * start of `now - N bars` moves by one bar every interval, so each refresh could
 * draw different arrows. The start is therefore snapped to a fixed grid of
 * `HISTORY_ANCHOR_GRID_BARS` bars measured from the epoch, and the loaded bars
 * are trimmed to begin on a grid line — every load inside one grid cell feeds
 * the study the same first bar.
 */
export const HISTORY_ANCHOR_GRID_BARS = 500;

interface DeclarationWithHistoryRequirement {
  historyRequirement?: { bars?: number } | null;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function gridMs(intervalMs: number): number {
  return intervalMs * HISTORY_ANCHOR_GRID_BARS;
}

/** Largest `historyRequirement.bars` across the active studies' declarations. */
export function resolveIndicatorWarmupBars(
  declarations: Iterable<DeclarationWithHistoryRequirement | null | undefined>,
): number {
  let bars = 0;
  for (const declaration of declarations) {
    const required = declaration?.historyRequirement?.bars;
    if (finiteNumber(required) && required > bars) bars = Math.floor(required);
  }
  return bars;
}

/**
 * The earliest bar time to load: `warmupBars` of warm-up before a
 * `visibleBars` window ending at `latestTime`, floored to the anchor grid.
 * Null when nothing needs warm-up.
 */
export function resolveWarmupHistoryStartTime({
  intervalMs,
  latestTime,
  visibleBars = DEFAULT_HISTORY_BACKFILL_BAR_COUNT,
  warmupBars,
}: {
  intervalMs: number;
  latestTime: number | undefined;
  visibleBars?: number;
  warmupBars: number;
}): number | null {
  if (!finiteNumber(warmupBars) || warmupBars <= 0) return null;
  if (!finiteNumber(latestTime) || !finiteNumber(intervalMs) || intervalMs <= 0) return null;
  const grid = gridMs(intervalMs);
  return Math.floor((latestTime - (warmupBars + visibleBars) * intervalMs) / grid) * grid;
}

/**
 * Bar count for a fresh history load: the default page, or enough to reach the
 * warm-up start in one request, capped at the backfill maximum. A requirement
 * past the cap is completed by paging left afterwards.
 */
export function resolveInitialHistoryBarCount({
  intervalMs,
  now,
  warmupBars,
}: {
  intervalMs: number;
  now: number;
  warmupBars: number;
}): number {
  const startTime = resolveWarmupHistoryStartTime({ intervalMs, latestTime: now, warmupBars });
  if (startTime === null) return DEFAULT_HISTORY_BACKFILL_BAR_COUNT;
  const needed = Math.ceil((now - startTime) / intervalMs) + 1;
  return Math.min(MAX_HISTORY_BACKFILL_BAR_COUNT, Math.max(DEFAULT_HISTORY_BACKFILL_BAR_COUNT, needed));
}

/**
 * Drops the bars before the first anchor-grid line at or after `bars[0]`, so
 * the series starts on the grid. Only once the history reaches `targetStartTime`
 * (itself a grid line): before that, trimming would discard bars the warm-up
 * still needs, and with no target there is nothing to keep stable.
 */
export function trimBarsToHistoryAnchor(bars: Bar[], intervalMs: number, targetStartTime: number | null): Bar[] {
  if (targetStartTime === null) return bars;
  const first = bars[0];
  if (!first || !finiteNumber(intervalMs) || intervalMs <= 0) return bars;
  if (first.time > targetStartTime) return bars;
  const grid = gridMs(intervalMs);
  const anchor = Math.ceil(first.time / grid) * grid;
  if (anchor === first.time) return bars;
  const index = bars.findIndex((bar) => bar.time >= anchor);
  return index > 0 ? bars.slice(index) : bars;
}
