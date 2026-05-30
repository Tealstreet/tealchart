import type { PlotOutput } from '@tealstreet/tealscript';
import type { Bar, Viewport } from '../types';

import { describe, expect, it } from 'vitest';

import { AutoScaleManager } from './AutoScaleManager';

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

function makeOhlcPlot(scriptId: string): PlotOutput {
  return {
    id: `${scriptId}_plotcandle`,
    type: 'plotcandle',
    title: scriptId,
    values: [100, 105, 110],
    openValues: [100, 105, 110],
    highValues: [150, 160, 170],
    lowValues: [80, 70, 60],
    closeValues: [105, 110, 115],
    scriptId,
    color: '#ffffff',
  };
}

// ---------------------------------------------------------------------------
// Per-pane state
// ---------------------------------------------------------------------------

describe('AutoScaleManager per-pane state', () => {
  it('defaults to auto-scale enabled for all panes', () => {
    const mgr = new AutoScaleManager();
    expect(mgr.isAutoScale('main')).toBe(true);
    expect(mgr.isAutoScale('pane_1')).toBe(true);
    expect(mgr.isAutoScale('anything')).toBe(true);
  });

  it('disableAutoScale disables only the specified pane', () => {
    const mgr = new AutoScaleManager();
    mgr.disableAutoScale('pane_1');
    expect(mgr.isAutoScale('main')).toBe(true);
    expect(mgr.isAutoScale('pane_1')).toBe(false);
  });

  it('enableAutoScale re-enables a specific pane', () => {
    const mgr = new AutoScaleManager();
    mgr.disableAutoScale('pane_1');
    mgr.enableAutoScale('pane_1');
    expect(mgr.isAutoScale('pane_1')).toBe(true);
  });

  it('resetAll re-enables all panes', () => {
    const mgr = new AutoScaleManager();
    mgr.disableAutoScale('main');
    mgr.disableAutoScale('pane_1');
    mgr.disableAutoScale('pane_2');
    mgr.resetAll();
    expect(mgr.isAutoScale('main')).toBe(true);
    expect(mgr.isAutoScale('pane_1')).toBe(true);
    expect(mgr.isAutoScale('pane_2')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// applyToViewport
// ---------------------------------------------------------------------------

describe('AutoScaleManager.applyToViewport', () => {
  it('applies auto-scale when main is enabled', () => {
    const mgr = new AutoScaleManager();
    const bars = makeBars(10, { startTime: 1_000_000, interval: 60_000, basePrice: 100, spread: 20 });
    const viewport: Viewport = {
      startTime: bars[0].time,
      endTime: bars[bars.length - 1].time,
      priceMin: 0,
      priceMax: 200,
    };

    const result = mgr.applyToViewport(viewport, bars);
    // Price should be fitted to visible bars (not the original 0-200 range)
    expect(result.priceMin).not.toBe(viewport.priceMin);
    expect(result.priceMax).not.toBe(viewport.priceMax);
    // Min should be tighter than original 0
    expect(result.priceMin).toBeGreaterThan(0);
    // Time should be unchanged
    expect(result.startTime).toBe(viewport.startTime);
    expect(result.endTime).toBe(viewport.endTime);
  });

  it('returns viewport unchanged when main is disabled', () => {
    const mgr = new AutoScaleManager();
    mgr.disableAutoScale('main');
    const bars = makeBars(10);
    const viewport: Viewport = {
      startTime: bars[0].time,
      endTime: bars[bars.length - 1].time,
      priceMin: 0,
      priceMax: 200,
    };

    const result = mgr.applyToViewport(viewport, bars);
    expect(result).toEqual(viewport);
  });
});

// ---------------------------------------------------------------------------
// applyToPaneYRange
// ---------------------------------------------------------------------------

describe('AutoScaleManager.applyToPaneYRange', () => {
  it('returns Y range for visible plot values', () => {
    const mgr = new AutoScaleManager();
    const bars = makeBars(10, { startTime: 1_000_000, interval: 60_000 });
    const plots = [
      makePlot(
        'rsi',
        bars.map((_, i) => 30 + i * 5),
      ),
    ];

    const result = mgr.applyToPaneYRange('pane_1', plots, ['rsi'], bars, bars[0].time, bars[bars.length - 1].time);

    expect(result).not.toBeNull();
    expect(result!.yMin).toBeLessThan(30);
    expect(result!.yMax).toBeGreaterThan(75);
  });

  it('returns null when pane auto-scale is disabled', () => {
    const mgr = new AutoScaleManager();
    mgr.disableAutoScale('pane_1');
    const bars = makeBars(10, { startTime: 1_000_000, interval: 60_000 });
    const plots = [
      makePlot(
        'rsi',
        bars.map((_, i) => 30 + i * 5),
      ),
    ];

    const result = mgr.applyToPaneYRange('pane_1', plots, ['rsi'], bars, bars[0].time, bars[bars.length - 1].time);

    expect(result).toBeNull();
  });

  it('returns null when no visible values exist', () => {
    const mgr = new AutoScaleManager();
    const bars = makeBars(10, { startTime: 1_000_000, interval: 60_000 });
    const plots = [
      makePlot(
        'rsi',
        bars.map(() => null),
      ),
    ];

    const result = mgr.applyToPaneYRange('pane_1', plots, ['rsi'], bars, bars[0].time, bars[bars.length - 1].time);

    expect(result).toBeNull();
  });

  it('only considers visible range when scrolled', () => {
    const mgr = new AutoScaleManager();
    const bars = makeBars(20, { startTime: 1_000_000, interval: 60_000 });
    // Values: first 10 bars = 10-100, last 10 bars = 500-590
    const values = bars.map((_, i) => (i < 10 ? 10 + i * 10 : 500 + (i - 10) * 10));
    const plots = [makePlot('ind', values)];

    // View only the first 10 bars
    const result = mgr.applyToPaneYRange('pane_1', plots, ['ind'], bars, bars[0].time, bars[9].time);

    expect(result).not.toBeNull();
    // Should be in the 10-100 range, not stretched to 590
    expect(result!.yMax).toBeLessThan(200);
    expect(result!.yMin).toBeGreaterThan(-50);
  });

  it('handles multiple indicators in the same pane', () => {
    const mgr = new AutoScaleManager();
    const bars = makeBars(10, { startTime: 1_000_000, interval: 60_000 });
    const plots = [
      makePlot(
        'macd_signal',
        bars.map((_, i) => i * 2),
      ),
      makePlot(
        'macd_hist',
        bars.map((_, i) => -5 + i),
      ),
    ];

    const result = mgr.applyToPaneYRange(
      'pane_1',
      plots,
      ['macd_signal', 'macd_hist'],
      bars,
      bars[0].time,
      bars[bars.length - 1].time,
    );

    expect(result).not.toBeNull();
    // Should encompass both indicator ranges
    expect(result!.yMin).toBeLessThan(-5);
    expect(result!.yMax).toBeGreaterThan(18);
  });

  it('includes OHLC high and low values for plotcandle pane ranges', () => {
    const mgr = new AutoScaleManager();
    const bars = makeBars(3, { startTime: 1_000_000, interval: 60_000 });
    const plots = [makeOhlcPlot('custom_candles')];

    const result = mgr.applyToPaneYRange('pane_1', plots, ['custom_candles'], bars, bars[0].time, bars[2].time);

    expect(result).not.toBeNull();
    expect(result!.yMin).toBeLessThan(60);
    expect(result!.yMax).toBeGreaterThan(170);
  });
});
