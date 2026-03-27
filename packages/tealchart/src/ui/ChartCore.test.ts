import type { Bar, Viewport } from '../types';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TealchartRenderer } from '../TealchartRenderer';

// Mock EventManager (survives mockReset)
vi.mock('../interaction/EventManager', () => ({
  EventManager: class {
    getIsDragging() {
      return false;
    }
    dispose() {}
  },
}));

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Stub canvas.getContext('2d') so ChartCore can construct in jsdom.
 * Returns a minimal mock that satisfies WebCanvasContext → TealchartRenderer.
 */
function stubCanvasContext(): void {
  const mockCtx = {
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
    createLinearGradient: () => ({ addColorStop: () => {} }),
    getImageData: () => ({ data: new Uint8ClampedArray([0, 0, 0, 0]) }),
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    transform: () => {},
    setTransform: () => {},
    scale: () => {},
    translate: () => {},
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HTMLCanvasElement.prototype.getContext = (() => mockCtx) as any;
}

function makeBars(count: number, startTime = 1_000_000, interval = 60_000, basePrice = 50_000): Bar[] {
  return Array.from({ length: count }, (_, i) => ({
    time: startTime + i * interval,
    open: basePrice + i * 10,
    high: basePrice + i * 10 + 50,
    low: basePrice + i * 10 - 50,
    close: basePrice + (i + 1) * 10,
    volume: 100 + i,
  }));
}

// ============================================================================
// Tests
// ============================================================================

describe('ChartCore viewport management', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    stubCanvasContext();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    vi.stubGlobal('devicePixelRatio', 1);

    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  async function createChartCore() {
    const { ChartCore } = await import('./ChartCore');
    return new ChartCore({
      container,
      width: 800,
      height: 600,
    });
  }

  it('setBars auto-calculates viewport on first bar load', async () => {
    const core = await createChartCore();
    expect(core.getViewport()).toBeNull();

    const btcBars = makeBars(10, 1_000_000, 60_000, 50_000);
    core.setBars(btcBars);

    const vp = core.getViewport();
    expect(vp).not.toBeNull();
    // Viewport should be in BTC price range (~50000)
    expect(vp!.priceMin).toBeGreaterThan(40_000);
    expect(vp!.priceMax).toBeLessThan(60_000);

    core.dispose();
  });

  it('setBars([]) preserves viewport — caller (TealchartWidget) sets correct viewport via setViewport()', async () => {
    const core = await createChartCore();

    // Step 1: Load BTC bars (~$50,000)
    const btcBars = makeBars(10, 1_000_000, 60_000, 50_000);
    core.setBars(btcBars);

    const btcViewport = core.getViewport();
    expect(btcViewport).not.toBeNull();
    expect(btcViewport!.priceMin).toBeGreaterThan(40_000);

    // Step 2: Clear bars — viewport is intentionally preserved so the chart
    // doesn't flash empty during async symbol switch. TealchartWidget calls
    // setViewport() with a ViewScaleState-reconstructed viewport when new bars arrive.
    core.setBars([]);
    expect(core.getViewport()).not.toBeNull();

    // Step 3: Caller sets new viewport for DOGE-like bars (~$3), then loads bars
    core.setViewport({ startTime: 2_000_000, endTime: 2_600_000, priceMin: 2, priceMax: 4 });
    const dogeBars = makeBars(10, 2_000_000, 60_000, 3);
    core.setBars(dogeBars);

    const newViewport = core.getViewport();
    expect(newViewport).not.toBeNull();
    expect(newViewport!.priceMax).toBeLessThan(1_000);

    core.dispose();
  });

  it('setBars([]) keeps viewport for seamless transitions', async () => {
    const core = await createChartCore();

    // Load initial bars
    const bars = makeBars(10);
    core.setBars(bars);
    const vp = core.getViewport();
    expect(vp).not.toBeNull();

    // Clear bars — viewport persists (ViewScaleState handles symbol switches at widget level)
    core.setBars([]);
    expect(core.getViewport()).toEqual(vp);

    core.dispose();
  });

  it('setBars with same reference is no-op', async () => {
    const core = await createChartCore();

    const bars = makeBars(10);
    core.setBars(bars);
    const vp1 = core.getViewport();

    // Same reference — should skip entirely
    core.setBars(bars);
    const vp2 = core.getViewport();

    expect(vp1).toBe(vp2); // same object, not recalculated

    core.dispose();
  });

  it('resetViewport recalculates from current bars', async () => {
    const core = await createChartCore();

    const bars = makeBars(10, 1_000_000, 60_000, 50_000);
    core.setBars(bars);

    // Manually set a bogus viewport
    core.setViewport({
      startTime: 0,
      endTime: 1,
      priceMin: 0,
      priceMax: 1,
    });

    expect(core.getViewport()!.priceMax).toBe(1);

    // resetViewport should recalculate from bars
    core.resetViewport();
    const vp = core.getViewport();
    expect(vp!.priceMin).toBeGreaterThan(40_000);

    core.dispose();
  });

  it('viewport matches calculateViewport output for same bars', async () => {
    const core = await createChartCore();
    const bars = makeBars(20, 1_000_000, 60_000, 30_000);

    core.setBars(bars);
    const coreVp = core.getViewport()!;
    const expectedVp = TealchartRenderer.calculateViewport(bars);

    expect(coreVp.startTime).toBe(expectedVp.startTime);
    expect(coreVp.endTime).toBe(expectedVp.endTime);
    expect(coreVp.priceMin).toBe(expectedVp.priceMin);
    expect(coreVp.priceMax).toBe(expectedVp.priceMax);

    core.dispose();
  });

  it('constructs with experimental canvas interactive lines enabled', async () => {
    const { ChartCore } = await import('./ChartCore');
    const core = new ChartCore({
      container,
      width: 800,
      height: 600,
      renderOptions: {
      },
    });

    core.setBars(makeBars(5));
    core.setOrderLines([
      {
        id: 'order-1',
        price: 50010,
        lineColor: '#ff0000',
        lineStyle: 2,
        lineLength: 100,
        extendLeft: true,
        lineWidth: 1,
        editable: true,
        cancellable: true,
        partialEnabled: false,
        brackets: null,
        text: 'Limit',
        textShort: 'Lmt',
        quantity: '1',
        quantityShort: '1',
        bodyBackgroundColor: '#111111',
        bodyTextColor: '#ffffff',
        bodyBorderColor: '#ff0000',
        quantityBackgroundColor: '#111111',
        quantityTextColor: '#ffffff',
        quantityBorderColor: '#ff0000',
        cancelButtonBackgroundColor: '#111111',
        cancelButtonIconColor: '#ffffff',
        cancelButtonBorderColor: '#ff0000',
        cancelTooltip: 'Cancel',
        modifyTooltip: 'Modify',
        callbacks: {},
      },
    ]);
    core.paint(0xff);

    expect(core.getViewport()).not.toBeNull();
    core.dispose();
  });

  it('renders position lines on the experimental canvas interactive-line path', async () => {
    const { ChartCore } = await import('./ChartCore');
    const core = new ChartCore({
      container,
      width: 800,
      height: 600,
      renderOptions: {
      },
    });

    core.setBars(makeBars(5));
    core.setPositionLines([
      {
        id: 'position-1',
        positionId: 'position-1',
        price: 50010,
        lineColor: '#00ff88',
        lineStyle: 0,
        lineLength: 100,
        extendLeft: true,
        lineWidth: 1,
        text: 'Long',
        textShort: 'Lng',
        quantity: '1 BTC',
        quantityShort: '1',
        pnl: '+$12.50',
        pnlShort: '+12',
        profitState: 'positive',
        bodyBackgroundColor: '#111111',
        bodyTextColor: '#ffffff',
        bodyBorderColor: '#00ff88',
        quantityBackgroundColor: '#111111',
        quantityTextColor: '#ffffff',
        quantityBorderColor: '#00ff88',
        reverseButtonBackgroundColor: '#111111',
        reverseButtonIconColor: '#ffffff',
        reverseButtonBorderColor: '#00ff88',
        closeButtonBackgroundColor: '#111111',
        closeButtonIconColor: '#ffffff',
        closeButtonBorderColor: '#00ff88',
        closeTooltip: 'Close',
        protectTooltipText: 'Protect',
        partialEnabled: true,
        reversible: true,
        closeable: true,
        brackets: {
          takeProfit: 50100,
          stopLoss: 49900,
        },
        positionData: {
          entryPrice: 50000,
          isLong: true,
          notional: 1000,
        },
        callbacks: {},
      },
    ]);
    core.paint(0xff);

    expect(core.getViewport()).not.toBeNull();
    core.dispose();
  });
});
