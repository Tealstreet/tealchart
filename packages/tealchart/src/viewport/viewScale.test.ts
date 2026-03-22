import type { Bar, Viewport } from '../types';

import { describe, expect, it } from 'vitest';

import { captureViewScale, getVisibleBarsBoundingBox, restoreViewport } from './viewScale';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBars(
  count: number,
  {
    startTime = 1_000_000,
    interval = 60_000,
    basePrice = 50_000,
    spread = 100,
  }: { startTime?: number; interval?: number; basePrice?: number; spread?: number } = {},
): Bar[] {
  return Array.from({ length: count }, (_, i) => {
    const mid = basePrice + i * 10;
    return {
      time: startTime + i * interval,
      open: mid - spread / 4,
      high: mid + spread / 2,
      low: mid - spread / 2,
      close: mid + spread / 4,
      volume: 100 + i,
    };
  });
}

function makeConstantBars(count: number, price: number, startTime = 1_000_000, interval = 60_000): Bar[] {
  return Array.from({ length: count }, (_, i) => ({
    time: startTime + i * interval,
    open: price,
    high: price,
    low: price,
    close: price,
    volume: 100,
  }));
}

// ---------------------------------------------------------------------------
// getVisibleBarsBoundingBox
// ---------------------------------------------------------------------------

describe('getVisibleBarsBoundingBox', () => {
  it('returns null for empty bars', () => {
    expect(getVisibleBarsBoundingBox([], 0, 1_000_000)).toBeNull();
  });

  it('returns null when no bars fall within range', () => {
    const bars = makeBars(10, { startTime: 1_000_000, interval: 60_000 });
    // Range is entirely before the first bar
    expect(getVisibleBarsBoundingBox(bars, 0, 500_000)).toBeNull();
    // Range is entirely after the last bar
    expect(getVisibleBarsBoundingBox(bars, 99_000_000, 100_000_000)).toBeNull();
  });

  it('returns bounding box when all bars are in range', () => {
    const bars = makeBars(5, { startTime: 1_000_000, interval: 60_000, basePrice: 100, spread: 20 });
    const firstTime = bars[0].time;
    const lastTime = bars[bars.length - 1].time;
    const result = getVisibleBarsBoundingBox(bars, firstTime, lastTime);

    expect(result).not.toBeNull();
    // The highest high should be from the last bar (ascending price)
    expect(result!.highest).toBe(bars[bars.length - 1].high);
    // The lowest low should be from the first bar
    expect(result!.lowest).toBe(bars[0].low);
  });

  it('returns bounding box for partially visible bars', () => {
    const bars = makeBars(10, { startTime: 1_000_000, interval: 60_000, basePrice: 100, spread: 20 });
    // Only include bars 3–6 (indices)
    const startTime = bars[3].time;
    const endTime = bars[6].time;
    const result = getVisibleBarsBoundingBox(bars, startTime, endTime);

    expect(result).not.toBeNull();
    expect(result!.highest).toBe(bars[6].high);
    expect(result!.lowest).toBe(bars[3].low);
  });

  it('works with a single bar in range', () => {
    const bars = makeBars(5);
    const t = bars[2].time;
    const result = getVisibleBarsBoundingBox(bars, t, t);

    expect(result).not.toBeNull();
    expect(result!.highest).toBe(bars[2].high);
    expect(result!.lowest).toBe(bars[2].low);
  });

  it('handles single-element bars array', () => {
    const bars = makeBars(1, { basePrice: 42_000 });
    const result = getVisibleBarsBoundingBox(bars, bars[0].time, bars[0].time);
    expect(result).not.toBeNull();
    expect(result!.highest).toBe(bars[0].high);
    expect(result!.lowest).toBe(bars[0].low);
  });
});

// ---------------------------------------------------------------------------
// captureViewScale → restoreViewport round-trip
// ---------------------------------------------------------------------------

describe('captureViewScale / restoreViewport round-trip', () => {
  it('produces the same viewport within floating point tolerance', () => {
    const bars = makeBars(100);
    const viewport: Viewport = {
      startTime: bars[20].time,
      endTime: bars[80].time,
      priceMin: bars[20].low - 50,
      priceMax: bars[80].high + 50,
    };

    const viewScale = captureViewScale(viewport, bars);
    const restored = restoreViewport(viewScale, bars);

    expect(restored.startTime).toBeCloseTo(viewport.startTime, 0);
    expect(restored.endTime).toBeCloseTo(viewport.endTime, 0);
    expect(restored.priceMin).toBeCloseTo(viewport.priceMin, 2);
    expect(restored.priceMax).toBeCloseTo(viewport.priceMax, 2);
  });

  it('handles viewport at the exact edges of the bar range', () => {
    const bars = makeBars(50);
    const viewport: Viewport = {
      startTime: bars[0].time,
      endTime: bars[bars.length - 1].time,
      priceMin: bars[0].low - 10,
      priceMax: bars[bars.length - 1].high + 10,
    };

    const viewScale = captureViewScale(viewport, bars);
    const restored = restoreViewport(viewScale, bars);

    expect(restored.startTime).toBeCloseTo(viewport.startTime, 0);
    expect(restored.endTime).toBeCloseTo(viewport.endTime, 0);
    expect(restored.priceMin).toBeCloseTo(viewport.priceMin, 2);
    expect(restored.priceMax).toBeCloseTo(viewport.priceMax, 2);
  });
});

// ---------------------------------------------------------------------------
// Cross-symbol restore
// ---------------------------------------------------------------------------

describe('cross-symbol restore', () => {
  it('capture from XRP bars (~1.5), restore with BTC bars (~68000) — prices in BTC range', () => {
    const xrpBars = makeBars(100, { basePrice: 1.5, spread: 0.05, interval: 60_000 });
    const xrpViewport: Viewport = {
      startTime: xrpBars[20].time,
      endTime: xrpBars[80].time,
      priceMin: 1.0,
      priceMax: 2.5,
    };

    const viewScale = captureViewScale(xrpViewport, xrpBars);

    const btcBars = makeBars(100, { basePrice: 68_000, spread: 500, interval: 60_000 });
    const restored = restoreViewport(viewScale, btcBars);

    // Prices should be in BTC range, not XRP range
    expect(restored.priceMin).toBeGreaterThan(60_000);
    expect(restored.priceMax).toBeLessThan(80_000);
    // Time range should be preserved
    expect(restored.endTime - restored.startTime).toBeCloseTo(xrpViewport.endTime - xrpViewport.startTime, 0);
  });
});

// ---------------------------------------------------------------------------
// Interval change
// ---------------------------------------------------------------------------

describe('interval change', () => {
  it('capture with 1h bars, restore with 4h bars — time range preserved', () => {
    const oneHourMs = 3_600_000;
    const fourHourMs = 4 * oneHourMs;

    const bars1h = makeBars(100, { interval: oneHourMs, basePrice: 50_000 });
    const viewport1h: Viewport = {
      startTime: bars1h[20].time,
      endTime: bars1h[80].time,
      priceMin: 49_500,
      priceMax: 51_000,
    };

    const viewScale = captureViewScale(viewport1h, bars1h);

    const bars4h = makeBars(100, { interval: fourHourMs, basePrice: 50_000 });
    const restored = restoreViewport(viewScale, bars4h);

    // Time range should be the same duration
    const originalDuration = viewport1h.endTime - viewport1h.startTime;
    const restoredDuration = restored.endTime - restored.startTime;
    expect(restoredDuration).toBeCloseTo(originalDuration, 0);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('restoreViewport with empty bars returns a default viewport', () => {
    const viewScale = {
      visibleTimeRange: 3_600_000,
      rightOffsetMs: 0,
      pricePaddingTop: 0.05,
      pricePaddingBottom: 0.05,
    };

    const result = restoreViewport(viewScale, []);
    // Should return something reasonable (from calculateViewport defaults)
    expect(result).toHaveProperty('startTime');
    expect(result).toHaveProperty('endTime');
    expect(result).toHaveProperty('priceMin');
    expect(result).toHaveProperty('priceMax');
    expect(result.endTime).toBeGreaterThan(result.startTime);
  });

  it('captureViewScale with single bar uses default padding', () => {
    const bars = makeBars(1, { basePrice: 100, spread: 10 });
    const viewport: Viewport = {
      startTime: bars[0].time - 30_000,
      endTime: bars[0].time + 30_000,
      priceMin: 90,
      priceMax: 110,
    };

    const viewScale = captureViewScale(viewport, bars);
    expect(viewScale.visibleTimeRange).toBe(60_000);
    expect(typeof viewScale.pricePaddingTop).toBe('number');
    expect(typeof viewScale.pricePaddingBottom).toBe('number');
  });

  it('captureViewScale with all bars same price keeps default padding', () => {
    const bars = makeConstantBars(10, 42_000);
    const viewport: Viewport = {
      startTime: bars[0].time,
      endTime: bars[bars.length - 1].time,
      priceMin: 41_900,
      priceMax: 42_100,
    };

    const viewScale = captureViewScale(viewport, bars);
    // dataRange === 0 → default padding 0.05
    expect(viewScale.pricePaddingTop).toBe(0.05);
    expect(viewScale.pricePaddingBottom).toBe(0.05);
  });

  it('restoreViewport with all bars same price produces valid viewport', () => {
    const bars = makeConstantBars(10, 42_000);
    const viewScale = {
      visibleTimeRange: bars[bars.length - 1].time - bars[0].time,
      rightOffsetMs: 0,
      pricePaddingTop: 0.1,
      pricePaddingBottom: 0.1,
    };

    const result = restoreViewport(viewScale, bars);
    expect(result.priceMax).toBeGreaterThan(result.priceMin);
    // Should be centered around 42_000
    expect(result.priceMax).toBeGreaterThan(42_000);
    expect(result.priceMin).toBeLessThan(42_000);
  });

  it('captureViewScale with empty bars returns defaults', () => {
    const viewport: Viewport = {
      startTime: 0,
      endTime: 3_600_000,
      priceMin: 0,
      priceMax: 100,
    };

    const viewScale = captureViewScale(viewport, []);
    expect(viewScale.visibleTimeRange).toBe(3_600_000);
    expect(viewScale.rightOffsetMs).toBe(0);
    expect(viewScale.pricePaddingTop).toBe(0.05);
    expect(viewScale.pricePaddingBottom).toBe(0.05);
  });
});
