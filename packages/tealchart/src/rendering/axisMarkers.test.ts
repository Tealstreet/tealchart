import { describe, expect, it } from 'vitest';

import type { Viewport } from '../types';

import { formatTimeAxisLabel, generatePriceMarkers, generateTimeMarkers } from './axisMarkers';

describe('axis marker generation', () => {
  it('generates nice absolute price markers instead of fixed viewport ratios', () => {
    const viewport: Viewport = {
      startTime: 0,
      endTime: 1,
      priceMin: 63_000,
      priceMax: 64_800,
    };

    const markers = generatePriceMarkers(viewport, 360);

    expect(markers).toEqual([
      63_000,
      63_200,
      63_400,
      63_600,
      63_800,
      64_000,
      64_200,
      64_400,
      64_600,
      64_800,
    ]);
  });

  it('aligns time markers to absolute interval boundaries', () => {
    const startTime = Date.UTC(2026, 6, 24, 0, 0, 0);
    const endTime = Date.UTC(2026, 6, 24, 16, 0, 0);
    const viewport: Viewport = {
      startTime,
      endTime,
      priceMin: 0,
      priceMax: 1,
    };

    const markers = generateTimeMarkers(viewport, 320);

    expect(markers.map((marker) => marker.time)).toEqual([
      startTime,
      startTime + 4 * 60 * 60 * 1_000,
      startTime + 8 * 60 * 60 * 1_000,
      startTime + 12 * 60 * 60 * 1_000,
      endTime,
    ]);
    expect(new Set(markers.map((marker) => marker.step))).toEqual(new Set([4 * 60 * 60 * 1_000]));
  });

  it('preserves web time-axis label formatting', () => {
    expect(formatTimeAxisLabel(new Date(2026, 6, 24, 8, 5, 0).getTime(), 60_000)).toBe('8:05');
    expect(formatTimeAxisLabel(new Date(2026, 6, 24, 8, 0, 0).getTime(), 3_600_000)).toBe('8:00');
    expect(formatTimeAxisLabel(new Date(2026, 6, 24, 8, 0, 0).getTime(), 3_600_000, true)).toBe('24 Jul');
    expect(formatTimeAxisLabel(new Date(2026, 6, 24, 0, 0, 0).getTime(), 86_400_000)).toBe('24');
    expect(formatTimeAxisLabel(new Date(2026, 6, 24, 0, 0, 0).getTime(), 86_400_000, true)).toBe("Jul '26");
    expect(formatTimeAxisLabel(new Date(2026, 6, 1, 0, 0, 0).getTime(), 2_592_000_000)).toBe("Jul '26");
    expect(formatTimeAxisLabel(new Date(2026, 0, 1, 0, 0, 0).getTime(), 31_536_000_000)).toBe('2026');
  });
});
