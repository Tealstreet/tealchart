import type { Bar, Viewport } from '../../types';

import { describe, expect, it } from 'vitest';

import {
  applyNativePriceAutoScale,
  createNativeAutoScaleBars,
  getNativeVisibleBarsBoundingBox,
} from './nativeAutoScale';

function makeBars(): Bar[] {
  return [
    { time: 1_000, open: 100, high: 110, low: 95, close: 105, volume: 10 },
    { time: 2_000, open: 105, high: 112, low: 101, close: 108, volume: 11 },
    { time: 3_000, open: 108, high: 125, low: 107, close: 120, volume: 12 },
    { time: 4_000, open: 120, high: 123, low: 115, close: 118, volume: 13 },
  ];
}

describe('native price auto-scale', () => {
  it('compacts bars to the fields needed by UI-thread auto-scale', () => {
    expect(createNativeAutoScaleBars(makeBars())).toEqual([
      { time: 1_000, high: 110, low: 95 },
      { time: 2_000, high: 112, low: 101 },
      { time: 3_000, high: 125, low: 107 },
      { time: 4_000, high: 123, low: 115 },
    ]);
  });

  it('finds the visible high-low range using inclusive viewport times', () => {
    const bars = createNativeAutoScaleBars(makeBars());

    expect(getNativeVisibleBarsBoundingBox(bars, 2_000, 3_000)).toEqual({
      highest: 125,
      lowest: 101,
    });
  });

  it('matches web auto-scale padding for the visible bar range', () => {
    const bars = createNativeAutoScaleBars(makeBars());
    const viewport: Viewport = {
      startTime: 2_000,
      endTime: 3_000,
      priceMin: 0,
      priceMax: 1,
    };

    expect(applyNativePriceAutoScale(viewport, bars)).toEqual({
      startTime: 2_000,
      endTime: 3_000,
      priceMin: 98.6,
      priceMax: 127.4,
    });
  });

  it('returns the original viewport when no bars are visible', () => {
    const bars = createNativeAutoScaleBars(makeBars());
    const viewport: Viewport = {
      startTime: 5_000,
      endTime: 6_000,
      priceMin: 100,
      priceMax: 200,
    };

    expect(applyNativePriceAutoScale(viewport, bars)).toBe(viewport);
  });

  it('uses web flat-price fallback padding when visible bars have no range', () => {
    const bars = createNativeAutoScaleBars([
      { time: 1_000, open: 100, high: 100, low: 100, close: 100, volume: 1 },
      { time: 2_000, open: 100, high: 100, low: 100, close: 100, volume: 1 },
    ]);

    expect(
      applyNativePriceAutoScale(
        {
          startTime: 1_000,
          endTime: 2_000,
          priceMin: 0,
          priceMax: 1,
        },
        bars,
      ),
    ).toEqual({
      startTime: 1_000,
      endTime: 2_000,
      priceMin: 99,
      priceMax: 101,
    });
  });
});
