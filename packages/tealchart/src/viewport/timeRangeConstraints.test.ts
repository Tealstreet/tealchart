import { describe, expect, it } from 'vitest';

import {
  clampViewportTimeRange,
  getMaxTimeRange,
  resolveMaxVisibleBars,
} from './timeRangeConstraints';

const viewport = { startTime: 0, endTime: 1_000, priceMin: 10, priceMax: 20 };

describe('time range constraints', () => {
  it('resolves visible bars from plot width and minimum bar width', () => {
    expect(resolveMaxVisibleBars({ intervalMs: 100, plotWidth: 501, minVisibleBarWidthPx: 2 })).toBe(250);
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
