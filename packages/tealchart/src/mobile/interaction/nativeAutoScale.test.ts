import type { Bar, Viewport } from '../../types';

import { describe, expect, it } from 'vitest';

import {
  applyNativePriceAutoScale,
  createNativeAutoScaleBars,
  fitNativeRestoredViewportPrice,
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

describe('restored viewport price fit', () => {
  const bars = createNativeAutoScaleBars(makeBars());
  const autoViewport: Viewport = { startTime: 1_000, endTime: 4_000, priceMin: 95, priceMax: 125 };

  it('re-fits a saved price range the market has left behind', () => {
    const restored: Viewport = { startTime: 1_500, endTime: 3_500, priceMin: 40, priceMax: 60 };
    const fitted = fitNativeRestoredViewportPrice({
      autoScaleEnabled: true,
      autoViewport,
      bars,
      viewport: restored,
    });

    // The saved window stands; only the price is derived.
    expect(fitted.startTime).toBe(1_500);
    expect(fitted.endTime).toBe(3_500);
    expect(fitted).toEqual(applyNativePriceAutoScale(restored, bars));
    expect(fitted.priceMin).toBeLessThan(101);
    expect(fitted.priceMax).toBeGreaterThan(125);
  });

  it('leaves a hand-scaled axis alone', () => {
    const restored: Viewport = { startTime: 1_500, endTime: 3_500, priceMin: 40, priceMax: 60 };

    expect(
      fitNativeRestoredViewportPrice({ autoScaleEnabled: false, autoViewport, bars, viewport: restored }),
    ).toBe(restored);
  });

  it('falls back to the auto viewport when the saved window holds no bars', () => {
    const restored: Viewport = { startTime: 90_000, endTime: 95_000, priceMin: 40, priceMax: 60 };

    expect(fitNativeRestoredViewportPrice({ autoScaleEnabled: true, autoViewport, bars, viewport: restored })).toBe(
      autoViewport,
    );
  });

  it('keeps the saved viewport when there is no auto viewport to fall back to', () => {
    const restored: Viewport = { startTime: 90_000, endTime: 95_000, priceMin: 40, priceMax: 60 };

    expect(
      fitNativeRestoredViewportPrice({ autoScaleEnabled: true, autoViewport: null, bars, viewport: restored }),
    ).toBe(restored);
  });
});
