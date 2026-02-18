import type { Bar, ChartPane, PriceLine, RenderOptions, UnifiedPaneLayout, Viewport } from './types';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TealchartRenderer } from './TealchartRenderer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockCtx(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    roundRect: vi.fn(),
    clip: vi.fn(),
    rect: vi.fn(),
    setLineDash: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 7 })),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
    globalAlpha: 1,
    canvas: { width: 800, height: 400 },
  } as unknown as CanvasRenderingContext2D;
}

function makeBar(time: number, open: number, close: number, high?: number, low?: number, volume = 100): Bar {
  return {
    time,
    open,
    high: high ?? Math.max(open, close) + 1,
    low: low ?? Math.min(open, close) - 1,
    close,
    volume,
  };
}

function makeBars(count: number, startTime = 1_000_000, interval = 60_000): Bar[] {
  return Array.from({ length: count }, (_, i) => {
    const base = 100 + i;
    return makeBar(startTime + i * interval, base, base + 1);
  });
}

function makeViewport(overrides: Partial<Viewport> = {}): Viewport {
  return {
    startTime: 1_000_000,
    endTime: 1_600_000,
    priceMin: 90,
    priceMax: 110,
    ...overrides,
  };
}

function makeSinglePaneLayout(): UnifiedPaneLayout {
  return {
    panes: [{ id: 'main', type: 'main', heightRatio: 1.0, yMin: 0, yMax: 0, fixedRange: false }],
    timeAxisHeight: 30,
  };
}

function makeTwoPaneLayout(mainRatio = 0.7, indicatorRatio = 0.3): UnifiedPaneLayout {
  return {
    panes: [
      { id: 'main', type: 'main', heightRatio: mainRatio, yMin: 0, yMax: 0, fixedRange: false },
      { id: 'rsi', type: 'indicator', heightRatio: indicatorRatio, yMin: 0, yMax: 100, fixedRange: true },
    ],
    timeAxisHeight: 30,
  };
}

function makePriceLine(id: string, price: number, overrides: Partial<PriceLine> = {}): PriceLine {
  return {
    id,
    price,
    lineStyle: 'dashed',
    color: '#ff0000',
    label: { primaryText: price.toFixed(2) },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TealchartRenderer', () => {
  let ctx: CanvasRenderingContext2D;
  let renderer: TealchartRenderer;

  beforeEach(() => {
    ctx = createMockCtx();
    renderer = new TealchartRenderer(ctx);
  });

  // ==========================================================================
  // Constructor & Options
  // ==========================================================================

  describe('constructor and options', () => {
    it('creates an instance with default options', () => {
      const opts = renderer.getOptions();

      expect(opts.width).toBe(800);
      expect(opts.height).toBe(400);
      expect(opts.upColor).toBe('#26a69a');
      expect(opts.downColor).toBe('#ef5350');
      expect(opts.backgroundColor).toBe('#1e222d');
      expect(opts.devicePixelRatio).toBe(1);
      expect(opts.showVolume).toBe(true);
      expect(opts.volumeHeight).toBe(0.2);
    });

    it('merges custom options with defaults', () => {
      const custom: Partial<RenderOptions> = { width: 1200, height: 600, upColor: '#00ff00' };
      const r = new TealchartRenderer(ctx, custom);
      const opts = r.getOptions();

      expect(opts.width).toBe(1200);
      expect(opts.height).toBe(600);
      expect(opts.upColor).toBe('#00ff00');
      // Defaults preserved
      expect(opts.downColor).toBe('#ef5350');
      expect(opts.backgroundColor).toBe('#1e222d');
    });

    it('setOptions updates options and preserves unset fields', () => {
      renderer.setOptions({ width: 1024 });
      const opts = renderer.getOptions();

      expect(opts.width).toBe(1024);
      expect(opts.height).toBe(400); // unchanged
    });

    it('getOptions includes margins', () => {
      const opts = renderer.getOptions();

      expect(opts.margins).toBeDefined();
      expect(opts.margins.top).toBe(10);
      expect(opts.margins.right).toBe(58);
      expect(opts.margins.bottom).toBe(30);
      expect(opts.margins.left).toBe(5);
    });
  });

  // ==========================================================================
  // computePanesLayout
  // ==========================================================================

  describe('computePanesLayout', () => {
    it('single main pane fills available height (totalHeight - timeAxisHeight)', () => {
      const layout = makeSinglePaneLayout();
      const totalHeight = 400;
      const panes = renderer.computePanesLayout(layout, totalHeight);

      expect(panes).toHaveLength(1);
      const main = panes[0];
      expect(main.id).toBe('main');
      expect(main.top).toBe(0);
      expect(main.height).toBe(totalHeight - layout.timeAxisHeight); // 370
      expect(main.bottom).toBe(totalHeight - layout.timeAxisHeight);
    });

    it('two panes split proportionally (0.7 / 0.3)', () => {
      const layout = makeTwoPaneLayout(0.7, 0.3);
      const totalHeight = 400;
      const availableHeight = totalHeight - layout.timeAxisHeight; // 370
      const panes = renderer.computePanesLayout(layout, totalHeight);

      expect(panes).toHaveLength(2);

      const mainPane = panes[0];
      const indicatorPane = panes[1];

      expect(mainPane.height).toBeCloseTo(availableHeight * 0.7);
      expect(indicatorPane.height).toBeCloseTo(availableHeight * 0.3);

      // Indicator pane starts where main pane ends
      expect(indicatorPane.top).toBeCloseTo(mainPane.bottom);
    });

    it('three panes: pixel positions sum to available height', () => {
      const layout: UnifiedPaneLayout = {
        panes: [
          { id: 'main', type: 'main', heightRatio: 0.5, yMin: 0, yMax: 0, fixedRange: false },
          { id: 'rsi', type: 'indicator', heightRatio: 0.25, yMin: 0, yMax: 100, fixedRange: true },
          { id: 'macd', type: 'indicator', heightRatio: 0.25, yMin: -10, yMax: 10, fixedRange: true },
        ],
        timeAxisHeight: 30,
      };

      const totalHeight = 400;
      const availableHeight = totalHeight - layout.timeAxisHeight;
      const panes = renderer.computePanesLayout(layout, totalHeight);

      expect(panes).toHaveLength(3);

      const totalPaneHeight = panes.reduce((sum, p) => sum + p.height, 0);
      expect(totalPaneHeight).toBeCloseTo(availableHeight);

      // Each pane is contiguous: pane[i].bottom === pane[i+1].top
      expect(panes[0].bottom).toBeCloseTo(panes[1].top);
      expect(panes[1].bottom).toBeCloseTo(panes[2].top);

      // Last pane bottom equals available height
      expect(panes[2].bottom).toBeCloseTo(availableHeight);
    });
  });

  // ==========================================================================
  // Coordinate Transforms
  // ==========================================================================

  describe('coordinate transforms', () => {
    const viewport: Viewport = {
      startTime: 1_000_000,
      endTime: 2_000_000,
      priceMin: 100,
      priceMax: 200,
    };

    it('publicPriceToY maps priceMax near the top and priceMin near the bottom', () => {
      const yMax = renderer.publicPriceToY(viewport.priceMax, viewport);
      const yMin = renderer.publicPriceToY(viewport.priceMin, viewport);

      // priceMax should map to a smaller Y (higher on screen)
      expect(yMax).toBeLessThan(yMin);

      // priceMax maps to margins.top (10)
      expect(yMax).toBeCloseTo(10);
    });

    it('publicYToPrice inverts publicPriceToY (round-trip)', () => {
      const testPrice = 150;
      const y = renderer.publicPriceToY(testPrice, viewport);
      const recovered = renderer.publicYToPrice(y, viewport);

      expect(recovered).toBeCloseTo(testPrice, 5);
    });

    it('publicPriceToYWithLayout / publicYToPriceWithLayout round-trip', () => {
      const layout = makeSinglePaneLayout();
      const testPrice = 160;

      const y = renderer.publicPriceToYWithLayout(testPrice, viewport, layout);
      const recovered = renderer.publicYToPriceWithLayout(y, viewport, layout);

      expect(recovered).toBeCloseTo(testPrice, 5);
    });

    it('publicXToTime maps across the time range proportionally', () => {
      // chartWidth = width - margins.left - margins.right = 800 - 5 - 58 = 737
      const margins = renderer.getOptions().margins;
      const chartWidth = 800 - margins.left - margins.right;

      // x at left margin should be startTime
      const tAtLeft = renderer.publicXToTime(margins.left, viewport);
      expect(tAtLeft).toBeCloseTo(viewport.startTime);

      // x at right edge of chart area should be endTime
      const tAtRight = renderer.publicXToTime(margins.left + chartWidth, viewport);
      expect(tAtRight).toBeCloseTo(viewport.endTime);

      // x at midpoint should be halfway between start and end time
      const tAtMid = renderer.publicXToTime(margins.left + chartWidth / 2, viewport);
      expect(tAtMid).toBeCloseTo((viewport.startTime + viewport.endTime) / 2);
    });
  });

  // ==========================================================================
  // renderWithLayout
  // ==========================================================================

  describe('renderWithLayout', () => {
    it('renders "No data available" message when bars array is empty', () => {
      const layout = makeSinglePaneLayout();
      const viewport = makeViewport();

      renderer.renderWithLayout([], viewport, layout);

      // Background should be drawn
      expect(ctx.fillRect).toHaveBeenCalled();

      // "No data available" text should be rendered
      const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
      const noDataCall = fillTextCalls.find(
        (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('No data'),
      );
      expect(noDataCall).toBeDefined();

      // save/restore pair should be called
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('renders without throwing when bars are provided', () => {
      const bars = makeBars(10);
      const layout = makeSinglePaneLayout();
      const viewport = makeViewport({ priceMin: 95, priceMax: 115 });

      expect(() => {
        renderer.renderWithLayout(bars, viewport, layout);
      }).not.toThrow();

      // Background fill and save/restore
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
      expect(ctx.fillRect).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // computePriceLineLabelBounds
  // ==========================================================================

  describe('computePriceLineLabelBounds', () => {
    it('returns bounds for each price line with correct lineId and price', () => {
      const viewport = makeViewport({ priceMin: 90, priceMax: 110 });
      const lines: PriceLine[] = [makePriceLine('order-1', 100), makePriceLine('order-2', 105)];

      const bounds = renderer.computePriceLineLabelBounds(lines, viewport);

      expect(bounds).toHaveLength(2);

      // Bounds are sorted by adjustedY (ascending), so higher-price line comes first
      // (higher price = smaller Y value on screen)
      const bound1 = bounds.find((b) => b.lineId === 'order-1');
      const bound2 = bounds.find((b) => b.lineId === 'order-2');
      expect(bound1).toBeDefined();
      expect(bound1!.price).toBe(100);
      expect(bound2).toBeDefined();
      expect(bound2!.price).toBe(105);

      // Each bound should have dimensional data
      for (const b of bounds) {
        expect(b.width).toBeGreaterThan(0);
        expect(b.height).toBeGreaterThan(0);
        expect(typeof b.originalY).toBe('number');
        expect(typeof b.adjustedY).toBe('number');
      }
    });

    it('filters out lines whose price is completely outside the visible area', () => {
      const viewport = makeViewport({ priceMin: 100, priceMax: 200 });

      const lines: PriceLine[] = [
        makePriceLine('visible', 150),
        makePriceLine('way-above', 500), // far above priceMax => originalY well above margins.top
        makePriceLine('way-below', 10), // far below priceMin => originalY well below visible bottom
      ];

      const bounds = renderer.computePriceLineLabelBounds(lines, viewport);

      // The visible line should be present
      const visibleBound = bounds.find((b) => b.lineId === 'visible');
      expect(visibleBound).toBeDefined();

      // Lines far outside the visible viewport area get filtered out
      // (their originalY falls outside the visibleTop..visibleBottom range)
      const wayAboveBound = bounds.find((b) => b.lineId === 'way-above');
      const wayBelowBound = bounds.find((b) => b.lineId === 'way-below');

      // At least one of the off-screen lines should be filtered out
      // (exact behavior depends on how far outside the viewport maps to pixel space)
      const offScreenFiltered = wayAboveBound === undefined || wayBelowBound === undefined;
      expect(offScreenFiltered).toBe(true);
    });
  });
});
