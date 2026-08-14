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

  // The ladder steps by up to 2.5x and the old acceptance window was 2x wide,
  // so a step could clear it - and the reversed fallback then answered with the
  // coarsest spacing going, leaving one label on the axis.
  it('fills the axis on ranges that fall between two ladder steps', () => {
    const viewport: Viewport = {
      startTime: 0,
      endTime: 1,
      priceMin: 104_352.5,
      priceMax: 104_647.5,
    };

    const markers = generatePriceMarkers(viewport, 380);

    // spacing 20 overshoots at 16 labels, spacing 50 is the finest that fits.
    expect(markers.length).toBe(6);
    expect(markers[1] - markers[0]).toBe(50);
  });

  it('never returns a near-empty axis across a sweep of price magnitudes', () => {
    const priceHeight = 380;
    const maxLabels = Math.floor(priceHeight / 24);

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
