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

  // 14.75 gaps over 380px is a 25.8px pitch, comfortably past the 24px minimum.
  // Counting markers instead rejected it at 16, because the phase put one marker
  // off the bottom of the axis.
  it('fills the axis to the pitch limit rather than the marker count', () => {
    const viewport: Viewport = {
      startTime: 0,
      endTime: 1,
      priceMin: 104_352.5,
      priceMax: 104_647.5,
    };

    const markers = generatePriceMarkers(viewport, 380);

    expect(markers[1] - markers[0]).toBe(20);
    expect(markers.length).toBe(16);
  });

  // The bug this rule exists for: a vertical pan holds the range fixed and slides
  // only the phase, so spacing must not move at all.
  it('holds spacing fixed while a vertical pan slides the grid phase', () => {
    const priceHeight = 380;

    // G (gaps) lands in (14, 15.83] for each, which is exactly where the old
    // marker count could tip past 15 and drop the axis to the next rung.
    for (const [base, range] of [
      [104_500, 295],
      [63_400, 2_900],
      [3.27, 0.29],
    ]) {
      const spacingAt = (offset: number): number => {
        const markers = generatePriceMarkers(
          { startTime: 0, endTime: 1, priceMin: base + offset, priceMax: base + offset + range },
          priceHeight,
        );
        return markers[1] - markers[0];
      };

      const spacing = spacingAt(0);
      for (let step = 0; step < 40; step += 1) {
        expect(spacingAt((spacing * step) / 40)).toBeCloseTo(spacing, 10);
      }
    }
  });

  it('never returns a near-empty axis across a sweep of price magnitudes', () => {
    const priceHeight = 380;
    // A grid straddling both edges shows one marker more than it has gaps.
    const maxLabels = Math.floor(priceHeight / 24) + 1;

    for (const mid of [0.0312, 0.87, 3.27, 47.2, 487.5, 3120, 63_400, 104_500]) {
      for (let fraction = 0.002; fraction <= 0.6; fraction *= 1.09) {
        const range = mid * fraction;
        const viewport: Viewport = {
          startTime: 0,
          endTime: 1,
          priceMin: mid - range / 2,
          priceMax: mid + range / 2,
        };

        const inRange = generatePriceMarkers(viewport, priceHeight).filter(
          (price) => price >= viewport.priceMin && price <= viewport.priceMax,
        );

        expect(inRange.length).toBeLessThanOrEqual(maxLabels);
        expect(inRange.length).toBeGreaterThanOrEqual(4);
      }
    }
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
