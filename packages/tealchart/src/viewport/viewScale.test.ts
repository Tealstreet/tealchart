import type { PlotOutput } from '@tealstreet/tealscript';
import type { Bar, Viewport } from '../types';

import { describe, expect, it } from 'vitest';

import {
  applyAutoScale,
  captureViewScale,
  getVisibleBarsBoundingBox,
  getVisiblePlotRange,
  intervalToMs,
  restoreViewport,
} from './viewScale';

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
// intervalToMs
// ---------------------------------------------------------------------------

describe('intervalToMs', () => {
  it('converts minute resolutions', () => {
    expect(intervalToMs('1')).toBe(60_000);
    expect(intervalToMs('5')).toBe(300_000);
    expect(intervalToMs('15')).toBe(900_000);
    expect(intervalToMs('60')).toBe(3_600_000);
    expect(intervalToMs('240')).toBe(14_400_000);
  });

  it('converts suffixed resolutions (h, m, s)', () => {
    expect(intervalToMs('1h')).toBe(3_600_000);
    expect(intervalToMs('4H')).toBe(14_400_000);
    expect(intervalToMs('5m')).toBe(300_000);
    expect(intervalToMs('30S')).toBe(30_000);
    expect(intervalToMs('1s')).toBe(1_000);
  });

  it('converts day resolutions (case-insensitive)', () => {
    expect(intervalToMs('1D')).toBe(86_400_000);
    expect(intervalToMs('D')).toBe(86_400_000);
    expect(intervalToMs('1d')).toBe(86_400_000);
    expect(intervalToMs('d')).toBe(86_400_000);
  });

  it('converts week resolutions (case-insensitive)', () => {
    expect(intervalToMs('1W')).toBe(604_800_000);
    expect(intervalToMs('W')).toBe(604_800_000);
    expect(intervalToMs('1w')).toBe(604_800_000);
    expect(intervalToMs('w')).toBe(604_800_000);
  });

  it('defaults to 1 hour for unknown resolutions', () => {
    expect(intervalToMs('unknown')).toBe(3_600_000);
    expect(intervalToMs('')).toBe(3_600_000);
  });
});

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
    // Only include bars 3-6 (indices)
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
// captureViewScale / restoreViewport round-trip
// ---------------------------------------------------------------------------

describe('captureViewScale / restoreViewport round-trip', () => {
  it('produces the same viewport within floating point tolerance', () => {
    const intervalMs = 60_000;
    const bars = makeBars(100, { interval: intervalMs });
    const viewport: Viewport = {
      startTime: bars[20].time,
      endTime: bars[80].time,
      priceMin: bars[20].low - 50,
      priceMax: bars[80].high + 50,
    };

    const viewScale = captureViewScale(viewport, bars, intervalMs);
    const restored = restoreViewport(viewScale, bars, intervalMs);

    expect(restored.startTime).toBeCloseTo(viewport.startTime, 0);
    expect(restored.endTime).toBeCloseTo(viewport.endTime, 0);
    expect(restored.priceMin).toBeCloseTo(viewport.priceMin, 2);
    expect(restored.priceMax).toBeCloseTo(viewport.priceMax, 2);
  });

  it('handles viewport at the exact edges of the bar range', () => {
    const intervalMs = 60_000;
    const bars = makeBars(50, { interval: intervalMs });
    const viewport: Viewport = {
      startTime: bars[0].time,
      endTime: bars[bars.length - 1].time,
      priceMin: bars[0].low - 10,
      priceMax: bars[bars.length - 1].high + 10,
    };

    const viewScale = captureViewScale(viewport, bars, intervalMs);
    const restored = restoreViewport(viewScale, bars, intervalMs);

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
  it('capture from XRP bars (~1.5), restore with BTC bars (~68000) -- prices in BTC range', () => {
    const intervalMs = 60_000;
    const xrpBars = makeBars(100, { basePrice: 1.5, spread: 0.05, interval: intervalMs });
    const xrpViewport: Viewport = {
      startTime: xrpBars[20].time,
      endTime: xrpBars[80].time,
      priceMin: 1.0,
      priceMax: 2.5,
    };

    const viewScale = captureViewScale(xrpViewport, xrpBars, intervalMs);

    const btcBars = makeBars(100, { basePrice: 68_000, spread: 500, interval: intervalMs });
    const restored = restoreViewport(viewScale, btcBars, intervalMs);

    // Prices should be in BTC range, not XRP range
    expect(restored.priceMin).toBeGreaterThan(60_000);
    expect(restored.priceMax).toBeLessThan(80_000);
    // Bar count should be preserved (same interval), so time range should also be preserved
    expect(restored.endTime - restored.startTime).toBeCloseTo(xrpViewport.endTime - xrpViewport.startTime, 0);
  });
});

// ---------------------------------------------------------------------------
// Interval change — bar count preserved (NEW behavior)
// ---------------------------------------------------------------------------

describe('interval change', () => {
  it('capture with 1h bars, restore with 4h bars -- bar count preserved, time range scales', () => {
    const oneHourMs = 3_600_000;
    const fourHourMs = 4 * oneHourMs;

    const bars1h = makeBars(100, { interval: oneHourMs, basePrice: 50_000 });
    const viewport1h: Viewport = {
      startTime: bars1h[20].time,
      endTime: bars1h[80].time,
      priceMin: 49_500,
      priceMax: 51_000,
    };

    const viewScale = captureViewScale(viewport1h, bars1h, oneHourMs);

    // Should have captured 60 bars worth of visible range
    expect(viewScale.visibleBarCount).toBeCloseTo(60, 5);

    const bars4h = makeBars(100, { interval: fourHourMs, basePrice: 50_000 });
    const restored = restoreViewport(viewScale, bars4h, fourHourMs);

    // Bar count preserved: 60 bars * 4h = 240h time range (vs original 60h)
    const restoredDuration = restored.endTime - restored.startTime;
    const expectedDuration = viewScale.visibleBarCount * fourHourMs;
    expect(restoredDuration).toBeCloseTo(expectedDuration, 0);

    // Time range should be 4x larger (60 bars at 4h vs 60 bars at 1h)
    const originalDuration = viewport1h.endTime - viewport1h.startTime;
    expect(restoredDuration).toBeCloseTo(originalDuration * 4, 0);
  });

  it('capture with 1h bars, restore with 5m bars -- bar count preserved, time range scales', () => {
    const oneHourMs = 3_600_000;
    const fiveMinMs = 5 * 60_000;

    const bars1h = makeBars(50, { interval: oneHourMs, basePrice: 50_000 });
    const viewport: Viewport = {
      startTime: bars1h[0].time,
      endTime: bars1h[49].time,
      priceMin: 49_500,
      priceMax: 51_000,
    };

    const viewScale = captureViewScale(viewport, bars1h, oneHourMs);
    expect(viewScale.visibleBarCount).toBeCloseTo(49, 5);

    const bars5m = makeBars(500, { interval: fiveMinMs, basePrice: 50_000 });
    const restored = restoreViewport(viewScale, bars5m, fiveMinMs);

    // Time range should be much smaller (49 bars * 5m vs 49 bars * 1h)
    const restoredDuration = restored.endTime - restored.startTime;
    const expectedDuration = viewScale.visibleBarCount * fiveMinMs;
    expect(restoredDuration).toBeCloseTo(expectedDuration, 0);
  });

  it('fractional bar counts round-trip correctly', () => {
    const intervalMs = 60_000;
    const bars = makeBars(100, { interval: intervalMs });

    // Create a viewport that doesn't align to bar boundaries (fractional bar count)
    const viewport: Viewport = {
      startTime: bars[20].time + intervalMs / 3, // 1/3 into bar 20
      endTime: bars[80].time + intervalMs / 2, // 1/2 into bar 80
      priceMin: 49_500,
      priceMax: 51_000,
    };

    const viewScale = captureViewScale(viewport, bars, intervalMs);
    // Should not be a whole number
    expect(viewScale.visibleBarCount % 1).not.toBe(0);

    const restored = restoreViewport(viewScale, bars, intervalMs);
    expect(restored.startTime).toBeCloseTo(viewport.startTime, 0);
    expect(restored.endTime).toBeCloseTo(viewport.endTime, 0);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('restoreViewport with empty bars returns a default viewport', () => {
    const viewScale = {
      visibleBarCount: 60,
      rightOffsetBars: 0,
      pricePaddingTop: 0.05,
      pricePaddingBottom: 0.05,
    };

    const result = restoreViewport(viewScale, [], 3_600_000);
    // Should return something reasonable (from calculateViewport defaults)
    expect(result).toHaveProperty('startTime');
    expect(result).toHaveProperty('endTime');
    expect(result).toHaveProperty('priceMin');
    expect(result).toHaveProperty('priceMax');
    expect(result.endTime).toBeGreaterThan(result.startTime);
  });

  it('captureViewScale with single bar uses default padding', () => {
    const intervalMs = 60_000;
    const bars = makeBars(1, { basePrice: 100, spread: 10, interval: intervalMs });
    const viewport: Viewport = {
      startTime: bars[0].time - 30_000,
      endTime: bars[0].time + 30_000,
      priceMin: 90,
      priceMax: 110,
    };

    const viewScale = captureViewScale(viewport, bars, intervalMs);
    expect(viewScale.visibleBarCount).toBeCloseTo(1, 5);
    expect(typeof viewScale.pricePaddingTop).toBe('number');
    expect(typeof viewScale.pricePaddingBottom).toBe('number');
  });

  it('captureViewScale with all bars same price keeps default padding', () => {
    const intervalMs = 60_000;
    const bars = makeConstantBars(10, 42_000, 1_000_000, intervalMs);
    const viewport: Viewport = {
      startTime: bars[0].time,
      endTime: bars[bars.length - 1].time,
      priceMin: 41_900,
      priceMax: 42_100,
    };

    const viewScale = captureViewScale(viewport, bars, intervalMs);
    // dataRange === 0 -> default padding 0.05
    expect(viewScale.pricePaddingTop).toBe(0.05);
    expect(viewScale.pricePaddingBottom).toBe(0.05);
  });

  it('restoreViewport with all bars same price produces valid viewport', () => {
    const intervalMs = 60_000;
    const bars = makeConstantBars(10, 42_000, 1_000_000, intervalMs);
    const viewScale = {
      visibleBarCount: (bars[bars.length - 1].time - bars[0].time) / intervalMs,
      rightOffsetBars: 0,
      pricePaddingTop: 0.1,
      pricePaddingBottom: 0.1,
    };

    const result = restoreViewport(viewScale, bars, intervalMs);
    expect(result.priceMax).toBeGreaterThan(result.priceMin);
    // Should be centered around 42_000
    expect(result.priceMax).toBeGreaterThan(42_000);
    expect(result.priceMin).toBeLessThan(42_000);
  });

  it('captureViewScale with empty bars returns defaults', () => {
    const intervalMs = 3_600_000;
    const viewport: Viewport = {
      startTime: 0,
      endTime: 3_600_000,
      priceMin: 0,
      priceMax: 100,
    };

    const viewScale = captureViewScale(viewport, [], intervalMs);
    expect(viewScale.visibleBarCount).toBeCloseTo(1, 5);
    expect(viewScale.rightOffsetBars).toBe(0);
    expect(viewScale.pricePaddingTop).toBe(0.05);
    expect(viewScale.pricePaddingBottom).toBe(0.05);
  });

  it('captureViewScale guards against zero intervalMs', () => {
    const bars = makeBars(10);
    const viewport: Viewport = {
      startTime: bars[0].time,
      endTime: bars[9].time,
      priceMin: 49_000,
      priceMax: 51_000,
    };

    // Should not throw, should use fallback interval
    const viewScale = captureViewScale(viewport, bars, 0);
    expect(viewScale.visibleBarCount).toBeGreaterThan(0);
    expect(isFinite(viewScale.visibleBarCount)).toBe(true);
  });

  it('negative rightOffsetBars is preserved (user scrolled left)', () => {
    const intervalMs = 60_000;
    const bars = makeBars(100, { interval: intervalMs });
    // endTime is before the last bar
    const viewport: Viewport = {
      startTime: bars[10].time,
      endTime: bars[70].time,
      priceMin: 49_000,
      priceMax: 51_000,
    };

    const viewScale = captureViewScale(viewport, bars, intervalMs);
    expect(viewScale.rightOffsetBars).toBeLessThan(0);

    const restored = restoreViewport(viewScale, bars, intervalMs);
    expect(restored.endTime).toBeCloseTo(viewport.endTime, 0);
  });
});

// ---------------------------------------------------------------------------
// applyAutoScale
// ---------------------------------------------------------------------------

describe('applyAutoScale', () => {
  it('fits price axis to visible bars with default 10% padding', () => {
    const bars = makeBars(10, { startTime: 1_000_000, interval: 60_000, basePrice: 100, spread: 20 });
    const viewport: Viewport = {
      startTime: bars[0].time,
      endTime: bars[bars.length - 1].time,
      priceMin: 0,
      priceMax: 200,
    };

    const result = applyAutoScale(viewport, bars);

    // Time axis should be unchanged
    expect(result.startTime).toBe(viewport.startTime);
    expect(result.endTime).toBe(viewport.endTime);

    // Price axis should be fitted to visible bars with padding
    const bbox = getVisibleBarsBoundingBox(bars, viewport.startTime, viewport.endTime)!;
    const dataRange = bbox.highest - bbox.lowest;
    expect(result.priceMax).toBeCloseTo(bbox.highest + dataRange * 0.1, 5);
    expect(result.priceMin).toBeCloseTo(bbox.lowest - dataRange * 0.1, 5);
  });

  it('handles flat price (all bars same price)', () => {
    const bars = makeConstantBars(10, 42_000);
    const viewport: Viewport = {
      startTime: bars[0].time,
      endTime: bars[bars.length - 1].time,
      priceMin: 41_000,
      priceMax: 43_000,
    };

    const result = applyAutoScale(viewport, bars);

    // Should produce a valid range centered around 42_000
    expect(result.priceMax).toBeGreaterThan(42_000);
    expect(result.priceMin).toBeLessThan(42_000);
    expect(result.priceMax - result.priceMin).toBeGreaterThan(0);
  });

  it('returns viewport unchanged when no visible bars', () => {
    const bars = makeBars(10, { startTime: 1_000_000, interval: 60_000 });
    const viewport: Viewport = {
      startTime: 0,
      endTime: 500_000, // Before all bars
      priceMin: 100,
      priceMax: 200,
    };

    const result = applyAutoScale(viewport, bars);

    expect(result).toEqual(viewport);
  });

  it('returns viewport unchanged for empty bars array', () => {
    const viewport: Viewport = {
      startTime: 0,
      endTime: 1_000_000,
      priceMin: 100,
      priceMax: 200,
    };

    const result = applyAutoScale(viewport, []);

    expect(result).toEqual(viewport);
  });

  it('respects custom padding parameter', () => {
    const bars = makeBars(10, { startTime: 1_000_000, interval: 60_000, basePrice: 100, spread: 20 });
    const viewport: Viewport = {
      startTime: bars[0].time,
      endTime: bars[bars.length - 1].time,
      priceMin: 0,
      priceMax: 200,
    };

    const bbox = getVisibleBarsBoundingBox(bars, viewport.startTime, viewport.endTime)!;
    const dataRange = bbox.highest - bbox.lowest;

    const result20 = applyAutoScale(viewport, bars, 0.2);
    expect(result20.priceMax).toBeCloseTo(bbox.highest + dataRange * 0.2, 5);
    expect(result20.priceMin).toBeCloseTo(bbox.lowest - dataRange * 0.2, 5);

    const result5 = applyAutoScale(viewport, bars, 0.05);
    expect(result5.priceMax).toBeCloseTo(bbox.highest + dataRange * 0.05, 5);
    expect(result5.priceMin).toBeCloseTo(bbox.lowest - dataRange * 0.05, 5);
  });

  it('preserves time axis exactly', () => {
    const bars = makeBars(20, { startTime: 1_000_000, interval: 60_000, basePrice: 50_000 });
    const viewport: Viewport = {
      startTime: bars[5].time,
      endTime: bars[15].time,
      priceMin: 10_000,
      priceMax: 90_000,
    };

    const result = applyAutoScale(viewport, bars);

    expect(result.startTime).toBe(viewport.startTime);
    expect(result.endTime).toBe(viewport.endTime);
  });
});

// ---------------------------------------------------------------------------
// getVisiblePlotRange
// ---------------------------------------------------------------------------

function makePlot(scriptId: string, values: (number | null)[]): PlotOutput {
  return {
    id: `${scriptId}_plot`,
    type: 'plot',
    title: scriptId,
    values,
    scriptId,
    color: '#ffffff',
  };
}

describe('getVisiblePlotRange', () => {
  it('returns null for empty bars', () => {
    const plots = [makePlot('rsi', [50, 60, 70])];
    expect(getVisiblePlotRange(plots, ['rsi'], [], 0, 1_000_000)).toBeNull();
  });

  it('returns null when no bars fall within range', () => {
    const bars = makeBars(10, { startTime: 1_000_000, interval: 60_000 });
    const plots = [
      makePlot(
        'rsi',
        bars.map((_, i) => 30 + i * 5),
      ),
    ];
    expect(getVisiblePlotRange(plots, ['rsi'], bars, 0, 500_000)).toBeNull();
  });

  it('returns null when all plot values are null', () => {
    const bars = makeBars(10, { startTime: 1_000_000, interval: 60_000 });
    const plots = [
      makePlot(
        'rsi',
        bars.map(() => null),
      ),
    ];
    expect(getVisiblePlotRange(plots, ['rsi'], bars, bars[0].time, bars[9].time)).toBeNull();
  });

  it('returns min/max with padding for visible range', () => {
    const bars = makeBars(10, { startTime: 1_000_000, interval: 60_000 });
    // Values: 30, 35, 40, 45, 50, 55, 60, 65, 70, 75
    const plots = [
      makePlot(
        'rsi',
        bars.map((_, i) => 30 + i * 5),
      ),
    ];
    const result = getVisiblePlotRange(plots, ['rsi'], bars, bars[0].time, bars[9].time);

    expect(result).not.toBeNull();
    // Range is 30-75, data range = 45, padding = 4.5
    expect(result!.min).toBeCloseTo(30 - 45 * 0.1, 5);
    expect(result!.max).toBeCloseTo(75 + 45 * 0.1, 5);
  });

  it('only considers visible bars, not all values', () => {
    const bars = makeBars(20, { startTime: 1_000_000, interval: 60_000 });
    // First 10 bars: 10-100, last 10 bars: 500-590
    const values = bars.map((_, i) => (i < 10 ? 10 + i * 10 : 500 + (i - 10) * 10));
    const plots = [makePlot('ind', values)];

    // View only the first 10 bars
    const result = getVisiblePlotRange(plots, ['ind'], bars, bars[0].time, bars[9].time);

    expect(result).not.toBeNull();
    expect(result!.max).toBeLessThan(200); // Should NOT include 500+ values
    expect(result!.min).toBeGreaterThan(-50);
  });

  it('ignores plots not in indicatorIds', () => {
    const bars = makeBars(5, { startTime: 1_000_000, interval: 60_000 });
    const plots = [
      makePlot(
        'rsi',
        bars.map(() => 50),
      ),
      makePlot(
        'macd',
        bars.map(() => 1000),
      ), // Should be ignored
    ];

    const result = getVisiblePlotRange(plots, ['rsi'], bars, bars[0].time, bars[4].time);

    expect(result).not.toBeNull();
    // Should be around 50, not stretched to 1000
    expect(result!.max).toBeLessThan(100);
  });

  it('handles flat values (all same)', () => {
    const bars = makeBars(5, { startTime: 1_000_000, interval: 60_000 });
    const plots = [
      makePlot(
        'ind',
        bars.map(() => 42),
      ),
    ];

    const result = getVisiblePlotRange(plots, ['ind'], bars, bars[0].time, bars[4].time);

    expect(result).not.toBeNull();
    expect(result!.max).toBeGreaterThan(42);
    expect(result!.min).toBeLessThan(42);
  });

  it('respects custom padding', () => {
    const bars = makeBars(5, { startTime: 1_000_000, interval: 60_000 });
    const plots = [makePlot('ind', [10, 20, 30, 40, 50])];

    const result = getVisiblePlotRange(plots, ['ind'], bars, bars[0].time, bars[4].time, 0.2);
    const range = 50 - 10;
    expect(result).not.toBeNull();
    expect(result!.min).toBeCloseTo(10 - range * 0.2, 5);
    expect(result!.max).toBeCloseTo(50 + range * 0.2, 5);
  });

  it('combines multiple indicators in indicatorIds', () => {
    const bars = makeBars(5, { startTime: 1_000_000, interval: 60_000 });
    const plots = [makePlot('a', [10, 20, 30, 40, 50]), makePlot('b', [-10, -5, 0, 5, 10])];

    const result = getVisiblePlotRange(plots, ['a', 'b'], bars, bars[0].time, bars[4].time);

    expect(result).not.toBeNull();
    expect(result!.min).toBeLessThan(-10);
    expect(result!.max).toBeGreaterThan(50);
  });
});
