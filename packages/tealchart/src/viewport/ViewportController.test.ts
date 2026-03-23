import type { PlotOutput } from '@tealstreet/tealscript';
import type { Bar, Viewport } from '../types';

import { describe, expect, it } from 'vitest';

import { ViewportController } from './ViewportController';

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

// ---------------------------------------------------------------------------
// handleViewportChange
// ---------------------------------------------------------------------------

describe('ViewportController.handleViewportChange', () => {
  it('applies auto-scale and captures viewScale', () => {
    const controller = new ViewportController();
    const intervalMs = 60_000;
    const bars = makeBars(100, { interval: intervalMs });

    const viewport: Viewport = {
      startTime: bars[20].time,
      endTime: bars[80].time,
      priceMin: 0,
      priceMax: 100_000,
    };

    const result = controller.handleViewportChange(viewport, bars, intervalMs);

    // Auto-scale should have adjusted the price axis
    expect(result.priceMin).not.toBe(0);
    expect(result.priceMax).not.toBe(100_000);
    // Time axis should be preserved
    expect(result.startTime).toBe(viewport.startTime);
    expect(result.endTime).toBe(viewport.endTime);
  });

  it('preserves viewport when auto-scale is disabled for main pane', () => {
    const controller = new ViewportController();
    controller.disableAutoScale('main');

    const intervalMs = 60_000;
    const bars = makeBars(100, { interval: intervalMs });

    const viewport: Viewport = {
      startTime: bars[20].time,
      endTime: bars[80].time,
      priceMin: 0,
      priceMax: 100_000,
    };

    const result = controller.handleViewportChange(viewport, bars, intervalMs);

    // Auto-scale disabled - price axis should be unchanged
    expect(result.priceMin).toBe(0);
    expect(result.priceMax).toBe(100_000);
  });
});

// ---------------------------------------------------------------------------
// handleBarsLoaded
// ---------------------------------------------------------------------------

describe('ViewportController.handleBarsLoaded', () => {
  it('calculates default viewport on first load (no viewScale)', () => {
    const controller = new ViewportController();
    const intervalMs = 60_000;
    const bars = makeBars(100, { interval: intervalMs });

    const result = controller.handleBarsLoaded(bars, intervalMs);

    // Should return a valid viewport
    expect(result.startTime).toBeLessThan(result.endTime);
    expect(result.priceMin).toBeLessThan(result.priceMax);
  });

  it('restores from viewScale on subsequent load', () => {
    const controller = new ViewportController();
    const intervalMs = 60_000;
    const bars = makeBars(100, { interval: intervalMs });

    // First: set a viewport via handleViewportChange to capture viewScale
    const viewport: Viewport = {
      startTime: bars[30].time,
      endTime: bars[70].time,
      priceMin: 49_000,
      priceMax: 51_000,
    };
    controller.handleViewportChange(viewport, bars, intervalMs);

    // Now simulate bars loaded with new data
    const newBars = makeBars(100, { interval: intervalMs, basePrice: 60_000 });
    const result = controller.handleBarsLoaded(newBars, intervalMs);

    // Should restore approximately the same number of visible bars (40)
    const visibleDuration = result.endTime - result.startTime;
    const expectedDuration = 40 * intervalMs; // 40 bars
    expect(visibleDuration).toBeCloseTo(expectedDuration, 0);
  });

  it('preserves bar count when interval changes', () => {
    const controller = new ViewportController();
    const oneHourMs = 3_600_000;
    const fourHourMs = 4 * oneHourMs;

    const bars1h = makeBars(100, { interval: oneHourMs, basePrice: 50_000 });

    // View 50 candles at 1h interval
    const viewport: Viewport = {
      startTime: bars1h[25].time,
      endTime: bars1h[75].time,
      priceMin: 49_000,
      priceMax: 51_000,
    };
    controller.handleViewportChange(viewport, bars1h, oneHourMs);

    // Switch to 4h interval
    const bars4h = makeBars(100, { interval: fourHourMs, basePrice: 50_000 });
    const result = controller.handleBarsLoaded(bars4h, fourHourMs);

    // Should still show ~50 candles, but each candle is 4h
    const visibleDuration = result.endTime - result.startTime;
    const expectedDuration = 50 * fourHourMs;
    expect(visibleDuration).toBeCloseTo(expectedDuration, 0);
  });
});

// ---------------------------------------------------------------------------
// handleReset
// ---------------------------------------------------------------------------

describe('ViewportController.handleReset', () => {
  it('re-enables auto-scale and recalculates viewport', () => {
    const controller = new ViewportController();
    const intervalMs = 60_000;
    const bars = makeBars(100, { interval: intervalMs });

    // Disable auto-scale
    controller.disableAutoScale('main');
    expect(controller.isAutoScale('main')).toBe(false);

    // Reset
    const result = controller.handleReset(bars, intervalMs);

    // Auto-scale should be re-enabled
    expect(controller.isAutoScale('main')).toBe(true);
    expect(controller.hasDisabledAutoScale()).toBe(false);

    // Should return a valid viewport
    expect(result.startTime).toBeLessThan(result.endTime);
    expect(result.priceMin).toBeLessThan(result.priceMax);
  });
});

// ---------------------------------------------------------------------------
// Auto-scale per-pane state
// ---------------------------------------------------------------------------

describe('ViewportController auto-scale state', () => {
  it('defaults to auto-scale enabled for all panes', () => {
    const controller = new ViewportController();
    expect(controller.isAutoScale('main')).toBe(true);
    expect(controller.isAutoScale('indicator-1')).toBe(true);
    expect(controller.hasDisabledAutoScale()).toBe(false);
  });

  it('disableAutoScale disables for specific pane only', () => {
    const controller = new ViewportController();
    controller.disableAutoScale('indicator-1');

    expect(controller.isAutoScale('main')).toBe(true);
    expect(controller.isAutoScale('indicator-1')).toBe(false);
    expect(controller.hasDisabledAutoScale()).toBe(true);
  });

  it('handleReset re-enables all panes', () => {
    const controller = new ViewportController();
    const bars = makeBars(50);

    controller.disableAutoScale('main');
    controller.disableAutoScale('indicator-1');
    expect(controller.hasDisabledAutoScale()).toBe(true);

    controller.handleReset(bars, 60_000);
    expect(controller.isAutoScale('main')).toBe(true);
    expect(controller.isAutoScale('indicator-1')).toBe(true);
    expect(controller.hasDisabledAutoScale()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// computePaneYRanges
// ---------------------------------------------------------------------------

describe('ViewportController.computePaneYRanges', () => {
  it('computes Y ranges for indicator panes', () => {
    const controller = new ViewportController();
    const bars = makeBars(10, { startTime: 1_000_000, interval: 60_000 });
    const plots = [
      makePlot(
        'rsi',
        bars.map((_, i) => 30 + i * 5),
      ),
    ];

    const panes = [{ id: 'pane-1', fixedRange: false, indicatorIds: ['rsi'] }];

    const ranges = controller.computePaneYRanges(panes, plots, bars, bars[0].time, bars[9].time);

    expect(ranges.size).toBe(1);
    const range = ranges.get('pane-1')!;
    expect(range.yMin).toBeLessThan(30);
    expect(range.yMax).toBeGreaterThan(75);
  });

  it('skips fixed-range panes', () => {
    const controller = new ViewportController();
    const bars = makeBars(10, { startTime: 1_000_000, interval: 60_000 });
    const plots = [
      makePlot(
        'rsi',
        bars.map(() => 50),
      ),
    ];

    const panes = [{ id: 'pane-1', fixedRange: true, indicatorIds: ['rsi'] }];

    const ranges = controller.computePaneYRanges(panes, plots, bars, bars[0].time, bars[9].time);

    expect(ranges.size).toBe(0);
  });

  it('skips panes with disabled auto-scale', () => {
    const controller = new ViewportController();
    controller.disableAutoScale('pane-1');

    const bars = makeBars(10, { startTime: 1_000_000, interval: 60_000 });
    const plots = [
      makePlot(
        'rsi',
        bars.map(() => 50),
      ),
    ];

    const panes = [{ id: 'pane-1', fixedRange: false, indicatorIds: ['rsi'] }];

    const ranges = controller.computePaneYRanges(panes, plots, bars, bars[0].time, bars[9].time);

    expect(ranges.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Interval change flow (end-to-end)
// ---------------------------------------------------------------------------

describe('ViewportController interval change flow', () => {
  it('capture at 1h, restore at 4h -- bar count preserved', () => {
    const controller = new ViewportController();
    const oneHourMs = 3_600_000;
    const fourHourMs = 4 * oneHourMs;

    // Start with 1h bars, view 50 candles
    const bars1h = makeBars(100, { interval: oneHourMs, basePrice: 50_000 });
    const viewport1h: Viewport = {
      startTime: bars1h[25].time,
      endTime: bars1h[75].time,
      priceMin: 49_000,
      priceMax: 51_000,
    };

    // Capture state at 1h
    controller.handleViewportChange(viewport1h, bars1h, oneHourMs);

    // Load 4h bars (simulating interval change)
    const bars4h = makeBars(100, { interval: fourHourMs, basePrice: 50_000 });
    const restored = controller.handleBarsLoaded(bars4h, fourHourMs);

    // Verify: 50 bar count * 4h = 200h duration
    const visibleDuration = restored.endTime - restored.startTime;
    expect(visibleDuration).toBeCloseTo(50 * fourHourMs, 0);
  });
});
