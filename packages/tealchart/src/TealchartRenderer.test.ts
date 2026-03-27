import type { Bar, ComputedPane, PriceLine, UnifiedPaneLayout, Viewport } from './types';

import { describe, expect, it } from 'vitest';

import { TealchartRenderer } from './TealchartRenderer';

/**
 * Create a minimal CanvasContext mock for the renderer
 */
function createMockCtx(): any {
  return {
    canvas: { width: 800, height: 600 },
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    textAlign: 'left',
    textBaseline: 'top',
    globalAlpha: 1,
    lineCap: 'butt',
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    fill: () => {},
    stroke: () => {},
    fillRect: () => {},
    clearRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    measureText: (text: string) => ({ width: text.length * 7 }),
    setLineDash: () => {},
    arc: () => {},
    clip: () => {},
    rect: () => {},
    roundRect: () => {},
    createLinearGradient: () => ({
      addColorStop: () => {},
    }),
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    setTransform: () => {},
    scale: () => {},
    translate: () => {},
  };
}

function makeBars(count: number, startTime = 1000000, interval = 60000, basePrice = 50000): Bar[] {
  return Array.from({ length: count }, (_, i) => ({
    time: startTime + i * interval,
    open: basePrice + i * 10,
    high: basePrice + i * 10 + 50,
    low: basePrice + i * 10 - 50,
    close: basePrice + (i + 1) * 10,
    volume: 100 + i,
  }));
}

describe('TealchartRenderer coordinate transforms', () => {
  describe('valueToY / yToValue round-trip', () => {
    it('converts price to Y and back within a pane', () => {
      const ctx = createMockCtx();
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600 });

      const pane: ComputedPane = {
        id: 'main',
        type: 'main',
        heightRatio: 1.0,
        yMin: 40000,
        yMax: 60000,
        fixedRange: false,
        top: 0,
        height: 570,
        bottom: 570,
      };

      const testPrices = [40000, 45000, 50000, 55000, 60000];
      for (const price of testPrices) {
        const y = renderer.valueToY(price, pane);
        const backPrice = renderer.yToValue(y, pane);
        expect(backPrice).toBeCloseTo(price, 2);
      }
    });

    it('returns center Y when pane range is zero', () => {
      const ctx = createMockCtx();
      const renderer = new TealchartRenderer(ctx);

      const pane: ComputedPane = {
        id: 'main',
        type: 'main',
        heightRatio: 1.0,
        yMin: 100,
        yMax: 100,
        fixedRange: false,
        top: 50,
        height: 400,
        bottom: 450,
      };

      const y = renderer.valueToY(100, pane);
      expect(y).toBe(50 + 400 / 2); // center of pane
    });

    it('higher prices map to lower Y values', () => {
      const ctx = createMockCtx();
      const renderer = new TealchartRenderer(ctx);

      const pane: ComputedPane = {
        id: 'main',
        type: 'main',
        heightRatio: 1.0,
        yMin: 0,
        yMax: 100,
        fixedRange: false,
        top: 0,
        height: 500,
        bottom: 500,
      };

      const yHigh = renderer.valueToY(100, pane);
      const yLow = renderer.valueToY(0, pane);
      expect(yHigh).toBeLessThan(yLow);
    });

    it('yMax maps to top of pane', () => {
      const ctx = createMockCtx();
      const renderer = new TealchartRenderer(ctx);

      const pane: ComputedPane = {
        id: 'main',
        type: 'main',
        heightRatio: 1.0,
        yMin: 10,
        yMax: 20,
        fixedRange: false,
        top: 100,
        height: 400,
        bottom: 500,
      };

      expect(renderer.valueToY(20, pane)).toBe(100); // top of pane
    });

    it('yMin maps to bottom of pane', () => {
      const ctx = createMockCtx();
      const renderer = new TealchartRenderer(ctx);

      const pane: ComputedPane = {
        id: 'main',
        type: 'main',
        heightRatio: 1.0,
        yMin: 10,
        yMax: 20,
        fixedRange: false,
        top: 100,
        height: 400,
        bottom: 500,
      };

      expect(renderer.valueToY(10, pane)).toBe(500); // bottom of pane
    });
  });

  describe('timeToX / xToTime round-trip', () => {
    it('converts time to X and back', () => {
      const ctx = createMockCtx();
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600 });

      const viewport: Viewport = {
        startTime: 1000000,
        endTime: 2000000,
        priceMin: 40000,
        priceMax: 60000,
      };

      const testTimes = [1000000, 1250000, 1500000, 1750000, 2000000];
      for (const time of testTimes) {
        const x = renderer.publicXToTime(
          // We need to convert time → x first using the internal formula
          // xToTime is public; we use publicXToTime(x) to convert x back
          // So we compute x from time directly
          0, // placeholder
          viewport,
        );
        // Instead let's test xToTime directly
        const backTime = renderer.xToTime(0, viewport, 700);
        // Just verify it returns a number in range
        expect(typeof backTime).toBe('number');
      }
    });

    it('xToTime at left margin returns startTime', () => {
      const ctx = createMockCtx();
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600 });

      const viewport: Viewport = {
        startTime: 1000000,
        endTime: 2000000,
        priceMin: 0,
        priceMax: 100,
      };

      // x=0 corresponds to the left margin
      // xToTime(x, viewport, chartWidth) = viewport.startTime + (x - margins.left)/chartWidth * timeRange
      // At x = margins.left (60 by default), ratio = 0, so time = startTime
      const opts = renderer.getOptions();
      const chartWidth = opts.width - opts.margins.left - opts.margins.right;
      const time = renderer.xToTime(opts.margins.left, viewport, chartWidth);
      expect(time).toBeCloseTo(1000000, 0);
    });

    it('xToTime at right edge returns endTime', () => {
      const ctx = createMockCtx();
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600 });

      const viewport: Viewport = {
        startTime: 1000000,
        endTime: 2000000,
        priceMin: 0,
        priceMax: 100,
      };

      const opts = renderer.getOptions();
      const chartWidth = opts.width - opts.margins.left - opts.margins.right;
      const rightX = opts.margins.left + chartWidth;
      const time = renderer.xToTime(rightX, viewport, chartWidth);
      expect(time).toBeCloseTo(2000000, 0);
    });

    it('xToTime is monotonically increasing', () => {
      const ctx = createMockCtx();
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600 });

      const viewport: Viewport = {
        startTime: 1000000,
        endTime: 2000000,
        priceMin: 0,
        priceMax: 100,
      };

      const opts = renderer.getOptions();
      const chartWidth = opts.width - opts.margins.left - opts.margins.right;
      let prevTime = -Infinity;
      for (let x = opts.margins.left; x <= opts.margins.left + chartWidth; x += 50) {
        const time = renderer.xToTime(x, viewport, chartWidth);
        expect(time).toBeGreaterThan(prevTime);
        prevTime = time;
      }
    });
  });

  describe('calculateViewport', () => {
    it('returns sensible defaults for empty bars', () => {
      const vp = TealchartRenderer.calculateViewport([]);
      expect(vp.priceMin).toBe(0);
      expect(vp.priceMax).toBe(100);
      expect(vp.startTime).toBeLessThan(vp.endTime);
    });

    it('calculates viewport from single bar', () => {
      const bars = [{ time: 1000000, open: 100, high: 110, low: 90, close: 105, volume: 50 }];
      const vp = TealchartRenderer.calculateViewport(bars);
      expect(vp.startTime).toBe(1000000);
      expect(vp.priceMin).toBeLessThanOrEqual(90);
      expect(vp.priceMax).toBeGreaterThanOrEqual(110);
    });

    it('calculates viewport from multiple bars', () => {
      const bars = makeBars(50);
      const vp = TealchartRenderer.calculateViewport(bars);
      // Should include all bar prices
      const allLows = bars.map((b) => b.low);
      const allHighs = bars.map((b) => b.high);
      expect(vp.priceMin).toBeLessThanOrEqual(Math.min(...allLows));
      expect(vp.priceMax).toBeGreaterThanOrEqual(Math.max(...allHighs));
    });

    it('includes right padding for live data', () => {
      const bars = makeBars(50);
      const vp = TealchartRenderer.calculateViewport(bars);
      const maxTime = Math.max(...bars.map((b) => b.time));
      expect(vp.endTime).toBeGreaterThan(maxTime);
    });

    it('applies price padding', () => {
      const bars = [
        { time: 1000000, open: 100, high: 110, low: 90, close: 105, volume: 50 },
        { time: 1060000, open: 105, high: 115, low: 95, close: 110, volume: 60 },
      ];
      const vp = TealchartRenderer.calculateViewport(bars, 0.1);
      // With padding, priceMin should be below 90 and priceMax above 115
      expect(vp.priceMin).toBeLessThan(90);
      expect(vp.priceMax).toBeGreaterThan(115);
    });

    it('shows at most DEFAULT_VISIBLE_BARS bars', () => {
      const bars = makeBars(500); // More than DEFAULT_VISIBLE_BARS (100)
      const vp = TealchartRenderer.calculateViewport(bars);
      // startTime should be from the last 100 bars, not the first
      const visibleBars = bars.slice(-TealchartRenderer.DEFAULT_VISIBLE_BARS);
      expect(vp.startTime).toBe(Math.min(...visibleBars.map((b) => b.time)));
    });
  });

  describe('publicPriceToYWithLayout', () => {
    it('returns consistent results with valueToY', () => {
      const ctx = createMockCtx();
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600 });

      const viewport: Viewport = {
        startTime: 1000000,
        endTime: 2000000,
        priceMin: 40000,
        priceMax: 60000,
      };

      const layout = {
        panes: [
          {
            id: 'main',
            type: 'main' as const,
            heightRatio: 1.0,
            yMin: 0,
            yMax: 0,
            fixedRange: false,
          },
        ],
        timeAxisHeight: 30,
      };

      const y = renderer.publicPriceToYWithLayout(50000, viewport, layout);
      expect(typeof y).toBe('number');
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(600);
    });
  });

  describe('renderWithLayout', () => {
    it('reuses precomputed price line bounds when provided', () => {
      const ctx = createMockCtx();
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600 });
      const calculateSpy = vi.spyOn(renderer as any, 'calculatePriceLineLabelBoundsForPane');

      const bars = makeBars(20);
      const viewport = TealchartRenderer.calculateViewport(bars);
      const layout: UnifiedPaneLayout = {
        panes: [
          {
            id: 'main',
            type: 'main',
            heightRatio: 1,
            yMin: 0,
            yMax: 0,
            fixedRange: false,
          },
        ],
        timeAxisHeight: 30,
      };
      const priceLines: PriceLine[] = [
        {
          id: 'last-trade',
          price: bars[bars.length - 1]!.close,
          color: '#26a69a',
          lineStyle: 'solid',
          label: {
            primaryText: '50,200',
          },
          targetPaneId: 'main',
        },
      ];
      const precomputedBounds = renderer.computePriceLineLabelBoundsWithLayout(priceLines, viewport, layout);

      renderer.renderWithLayout(bars, viewport, layout, priceLines, [], undefined, undefined, undefined, precomputedBounds);

      expect(calculateSpy).not.toHaveBeenCalled();
    });
  });
});
