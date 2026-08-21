import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MAX_VISIBLE_BARS,
  DEFAULT_MIN_VISIBLE_BAR_WIDTH_PX,
  clampViewportTimeRange,
  getMaxTimeRange,
  resolveMaxVisibleBars,
} from './timeRangeConstraints';

const viewport = { startTime: 0, endTime: 1_000, priceMin: 10, priceMax: 20 };

describe('time range constraints', () => {
  it('resolves visible bars from plot width and minimum bar width', () => {
    expect(resolveMaxVisibleBars({ intervalMs: 100, plotWidth: 501, minVisibleBarWidthPx: 2 })).toBe(250);
  });

  // This constant is what decides how far a user can zoom out, so it is worth
  // asserting on its own rather than only through callers that pass it in.
  it('admits one bar per pixel of plot by default', () => {
    expect(DEFAULT_MIN_VISIBLE_BAR_WIDTH_PX).toBe(1);
    expect(resolveMaxVisibleBars({ intervalMs: 100, plotWidth: 390 })).toBe(390);
    // The cap must stay clear of realistic plot widths, or halving the bar width
    // buys wide charts nothing: at 1500 a 2560px desktop could not zoom out past
    // 1500 bars whatever the bar width was.
    expect(resolveMaxVisibleBars({ intervalMs: 100, plotWidth: 2_560 })).toBe(2_560);
    expect(DEFAULT_MAX_VISIBLE_BARS).toBeGreaterThan(2_560);
  });

  it('caps visible bars by maxVisibleBars', () => {
    expect(
      resolveMaxVisibleBars({
        intervalMs: 100,
        plotWidth: 10_000,
        minVisibleBarWidthPx: 2,
        maxVisibleBars: 100,
      }),
    ).toBe(100);
    expect(
      getMaxTimeRange({
        intervalMs: 100,
        plotWidth: 10_000,
        minVisibleBarWidthPx: 2,
        maxVisibleBars: 100,
      }),
    ).toBe(10_000);
  });

  it('returns null for invalid inputs', () => {
    expect(resolveMaxVisibleBars({ intervalMs: 100, plotWidth: 0 })).toBeNull();
    expect(getMaxTimeRange({ intervalMs: 0, plotWidth: 100 })).toBeNull();
  });

  it('leaves viewport unchanged when range is already valid', () => {
    expect(clampViewportTimeRange({ viewport, intervalMs: 100, plotWidth: 20, minVisibleBarWidthPx: 2 })).toBe(
      viewport,
    );
  });

  it('clamps around right edge', () => {
    expect(
      clampViewportTimeRange({
        viewport,
        intervalMs: 100,
        plotWidth: 8,
        minVisibleBarWidthPx: 2,
        anchor: 'right',
      }),
    ).toEqual({ startTime: 600, endTime: 1_000, priceMin: 10, priceMax: 20 });
  });

  it('clamps around center', () => {
    expect(
      clampViewportTimeRange({
        viewport,
        intervalMs: 100,
        plotWidth: 8,
        minVisibleBarWidthPx: 2,
        anchor: 'center',
      }),
    ).toEqual({ startTime: 300, endTime: 700, priceMin: 10, priceMax: 20 });
  });

  it('clamps around ratio anchor', () => {
    expect(
      clampViewportTimeRange({
        viewport,
        intervalMs: 100,
        plotWidth: 8,
        minVisibleBarWidthPx: 2,
        anchor: { ratio: 0.25 },
      }),
    ).toEqual({ startTime: 150, endTime: 550, priceMin: 10, priceMax: 20 });
  });
});
