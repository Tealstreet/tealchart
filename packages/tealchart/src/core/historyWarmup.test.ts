import type { Bar } from '../types';

import { describe, expect, it } from 'vitest';

import { DEFAULT_HISTORY_BACKFILL_BAR_COUNT, MAX_HISTORY_BACKFILL_BAR_COUNT } from './historyBackfill';
import {
  HISTORY_ANCHOR_GRID_BARS,
  resolveIndicatorWarmupBars,
  resolveInitialHistoryBarCount,
  resolveWarmupHistoryStartTime,
  trimBarsToHistoryAnchor,
} from './historyWarmup';

const MINUTE = 60_000;
const INTERVAL = 15 * MINUTE;
const GRID = INTERVAL * HISTORY_ANCHOR_GRID_BARS;

function barsFrom(startTime: number, count: number, intervalMs = INTERVAL): Bar[] {
  return Array.from({ length: count }, (_, index) => {
    const time = startTime + index * intervalMs;
    return { time, open: 1, high: 1, low: 1, close: 1, volume: 1 };
  });
}

describe('resolveIndicatorWarmupBars', () => {
  it('takes the largest requirement and ignores missing ones', () => {
    expect(
      resolveIndicatorWarmupBars([
        { historyRequirement: { bars: 20 } },
        undefined,
        {},
        { historyRequirement: { bars: 501 } },
        { historyRequirement: { bars: Number.NaN } },
      ]),
    ).toBe(501);
    expect(resolveIndicatorWarmupBars([])).toBe(0);
  });
});

describe('resolveWarmupHistoryStartTime', () => {
  it('is null without a requirement', () => {
    expect(resolveWarmupHistoryStartTime({ intervalMs: INTERVAL, latestTime: 10 * GRID, warmupBars: 0 })).toBeNull();
  });

  it('leaves room for warm-up plus the visible window, on a grid line', () => {
    const latestTime = 10 * GRID + 37 * INTERVAL;
    const start = resolveWarmupHistoryStartTime({ intervalMs: INTERVAL, latestTime, warmupBars: 501 })!;
    expect(start % GRID).toBe(0);
    expect(latestTime - start).toBeGreaterThanOrEqual((501 + DEFAULT_HISTORY_BACKFILL_BAR_COUNT) * INTERVAL);
    expect(latestTime - start).toBeLessThan((501 + DEFAULT_HISTORY_BACKFILL_BAR_COUNT) * INTERVAL + GRID);
  });

  it('stays put while the latest bar advances inside one grid cell', () => {
    const base = 10 * GRID + (501 + DEFAULT_HISTORY_BACKFILL_BAR_COUNT) * INTERVAL;
    const starts = new Set(
      [0, 1, 50, HISTORY_ANCHOR_GRID_BARS - 1].map((offset) =>
        resolveWarmupHistoryStartTime({ intervalMs: INTERVAL, latestTime: base + offset * INTERVAL, warmupBars: 501 }),
      ),
    );
    expect(starts.size).toBe(1);
  });
});

describe('resolveInitialHistoryBarCount', () => {
  it('keeps the default page when nothing needs warm-up', () => {
    expect(resolveInitialHistoryBarCount({ intervalMs: INTERVAL, now: 10 * GRID, warmupBars: 0 })).toBe(
      DEFAULT_HISTORY_BACKFILL_BAR_COUNT,
    );
  });

  it('asks for enough bars to reach the warm-up start', () => {
    const now = 10 * GRID + 123 * INTERVAL;
    const count = resolveInitialHistoryBarCount({ intervalMs: INTERVAL, now, warmupBars: 501 });
    const start = resolveWarmupHistoryStartTime({ intervalMs: INTERVAL, latestTime: now, warmupBars: 501 })!;
    expect(now - (count - 1) * INTERVAL).toBeLessThanOrEqual(start);
  });

  it('is capped at the backfill maximum', () => {
    expect(resolveInitialHistoryBarCount({ intervalMs: INTERVAL, now: 10 * GRID, warmupBars: 5000 })).toBe(
      MAX_HISTORY_BACKFILL_BAR_COUNT,
    );
  });
});

describe('trimBarsToHistoryAnchor', () => {
  it('starts the series on the first grid line inside it', () => {
    const bars = barsFrom(4 * GRID - 7 * INTERVAL, 900);
    const trimmed = trimBarsToHistoryAnchor(bars, INTERVAL, 5 * GRID);
    expect(trimmed[0].time).toBe(4 * GRID);
    expect(trimmed.at(-1)).toBe(bars.at(-1));
  });

  it('feeds the same first bar to loads that started at different times', () => {
    const target = 5 * GRID;
    const a = trimBarsToHistoryAnchor(barsFrom(4 * GRID - 3 * INTERVAL, 1200), INTERVAL, target);
    const b = trimBarsToHistoryAnchor(barsFrom(4 * GRID - 90 * INTERVAL, 1300), INTERVAL, target);
    expect(a[0].time).toBe(b[0].time);
  });

  it('does not trim before the history reaches the warm-up start', () => {
    const bars = barsFrom(5 * GRID + INTERVAL, 300);
    expect(trimBarsToHistoryAnchor(bars, INTERVAL, 5 * GRID)).toBe(bars);
  });

  it('does not trim without a target', () => {
    const bars = barsFrom(4 * GRID - 7 * INTERVAL, 900);
    expect(trimBarsToHistoryAnchor(bars, INTERVAL, null)).toBe(bars);
  });
});
