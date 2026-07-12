// @vitest-environment jsdom

import type { Bar, Viewport } from '../types';
import type {
  UserDrawingInputPoint,
  UserDrawingSelectionAtPointResult,
  UserDrawingState,
  UserDrawingTool,
} from '../drawings';

import Konva from 'konva';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_USER_DRAWING_STYLE } from '../drawings';
import { TealchartRenderer } from '../TealchartRenderer';
import { DIRTY } from '../rendering/RenderScheduler';
import { clearChartStoreCache } from '../state/chartState';

interface EventManagerCallbackProbe {
  onDrawingDragStart?: (x: number, y: number, source: 'mouse' | 'touch') => boolean;
  onDrawingDragMove?: (x: number, y: number, source: 'mouse' | 'touch') => boolean;
  onDrawingDragEnd?: (source: 'mouse' | 'touch') => void;
  onDrawingDragCancel?: (source: 'mouse' | 'touch') => void;
  onCrossHairMoved?: (x: number, y: number) => void;
  onCursorChange?: (cursor: string) => void;
}

const eventManagerInstances = vi.hoisted(() => [] as Array<{ callbacks: EventManagerCallbackProbe }>);

// Mock EventManager (survives mockReset)
vi.mock('../interaction/EventManager', () => ({
  EventManager: class {
    constructor(_container: HTMLElement, callbacks: EventManagerCallbackProbe) {
      eventManagerInstances.push({ callbacks });
    }
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

interface CountdownManagerProbe {
  countdownTextNodes: Map<string, Array<{ targetTime: number }>>;
}

interface PriceLineManagerProbe {
  cachedLineGroups: Map<string, Konva.Group>;
  options: { fontFamily?: string };
}

interface LineContentRefsProbe {
  priceAxisRect?: { listening(): boolean };
  priceAxisPrimaryText?: { listening(): boolean };
  priceAxisSecondaryText?: { listening(): boolean };
}

// ============================================================================
// Tests
// ============================================================================

describe('ChartCore viewport management', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    eventManagerInstances.length = 0;
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
    clearChartStoreCache();
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

  it('keeps select-mode drawing selection inside chart panes without consuming double-click tracking', async () => {
    const { ChartCore } = await import('./ChartCore');
    const selectionResult: UserDrawingSelectionAtPointResult = {
      state: {
        version: 1,
        activeTool: 'select' as const,
        selection: { drawingId: 'h' },
        draft: null,
        textEdit: null,
        drawings: [],
      },
      hit: true,
      changed: true,
    };
    const onUserDrawingSelection = vi.fn(() => selectionResult);
    const onUserDrawingEditStart = vi.fn(() => true);
    const onUserDrawingEditMove = vi.fn(() => true);
    const onUserDrawingEditEnd = vi.fn();
    const onUserDrawingPathDragStart = vi.fn(() => true);
    const onUserDrawingPathDragMove = vi.fn(() => true);
    const onUserDrawingPathDragEnd = vi.fn();
    const core = new ChartCore({
      container,
      width: 800,
      height: 600,
      onUserDrawingSelection,
      onUserDrawingEditStart,
      onUserDrawingEditMove,
      onUserDrawingEditEnd,
      onUserDrawingPathDragStart,
      onUserDrawingPathDragMove,
      onUserDrawingPathDragEnd,
    });
    core.setViewport({ startTime: 0, endTime: 100, priceMin: 0, priceMax: 100 });
    core.setUserDrawingState({
      version: 1,
      activeTool: 'select',
      selection: null,
      draft: null,
      textEdit: null,
      drawings: [],
    } satisfies UserDrawingState);

    const testCore = core as unknown as {
      handleUserDrawingInput(
        x: number,
        y: number,
        source?: 'mouse' | 'touch',
        options?: { additiveSelection?: boolean },
      ): unknown;
      handleUserDrawingDragPending(x: number, y: number): boolean;
      handleUserDrawingDragStart(x: number, y: number, options?: { pressure?: number }): boolean;
      handleUserDrawingDragMove(x: number, y: number, options?: { pressure?: number }): boolean;
      handleUserDrawingDragEnd(): void;
    };

    expect(testCore.handleUserDrawingInput(100, 100)).toBe(false);
    expect(onUserDrawingSelection).toHaveBeenCalledTimes(1);
    expect(onUserDrawingSelection).toHaveBeenLastCalledWith(expect.anything(), expect.any(Map), { additive: undefined });
    expect(testCore.handleUserDrawingInput(100, 100, 'mouse', { additiveSelection: true })).toBe(false);
    expect(onUserDrawingSelection).toHaveBeenCalledTimes(2);
    expect(onUserDrawingSelection).toHaveBeenLastCalledWith(expect.anything(), expect.any(Map), { additive: true });
    expect(testCore.handleUserDrawingInput(100, 100, 'touch')).toEqual({
      handled: true,
      allowPaneDoubleClick: true,
    });
    expect(onUserDrawingSelection).toHaveBeenCalledTimes(3);
    onUserDrawingSelection.mockReturnValueOnce({
      state: { ...selectionResult.state, selection: null },
      hit: false,
      changed: true,
    });
    expect(testCore.handleUserDrawingInput(100, 100, 'touch')).toEqual({
      handled: true,
      allowPaneDoubleClick: true,
    });
    expect(onUserDrawingSelection).toHaveBeenCalledTimes(4);
    // Drawings span the full width (under the price axis), so only clicks past the right
    // edge (>= width) or in the time axis are out of bounds.
    expect(testCore.handleUserDrawingInput(810, 100)).toBe(false);
    expect(testCore.handleUserDrawingInput(100, 590)).toBe(false);
    expect(onUserDrawingSelection).toHaveBeenCalledTimes(4);
    expect(testCore.handleUserDrawingDragStart(100, 100)).toBe(true);
    expect(onUserDrawingEditStart).toHaveBeenCalledTimes(1);
    expect(testCore.handleUserDrawingDragStart(810, 100)).toBe(false);
    expect(onUserDrawingEditStart).toHaveBeenCalledTimes(1);
    expect(testCore.handleUserDrawingDragMove(110, 105)).toBe(true);
    expect(onUserDrawingEditMove).toHaveBeenCalledWith({ x: 110, y: 105 });
    expect(onUserDrawingEditEnd).not.toHaveBeenCalled();
    testCore.handleUserDrawingDragEnd();
    expect(onUserDrawingEditEnd).toHaveBeenCalledTimes(1);

    core.setUserDrawingState({
      version: 1,
      activeTool: 'path',
      selection: null,
      draft: null,
      textEdit: null,
      drawings: [],
    } satisfies UserDrawingState);
    expect(testCore.handleUserDrawingDragPending(100, 100)).toBe(true);
    expect(testCore.handleUserDrawingDragStart(100, 100, { pressure: 0.4 })).toBe(true);
    expect(onUserDrawingPathDragStart).toHaveBeenCalledWith(expect.objectContaining({
      paneId: 'main',
      anchor: { time: expect.any(Number), price: expect.any(Number), pressure: 0.4 },
      position: { x: expect.any(Number), y: expect.any(Number) },
    }));
    expect(testCore.handleUserDrawingDragMove(120, 110, { pressure: 0.6 })).toBe(true);
    expect(onUserDrawingPathDragMove).toHaveBeenCalledWith(expect.objectContaining({
      paneId: 'main',
      anchor: { time: expect.any(Number), price: expect.any(Number), pressure: 0.6 },
      position: { x: expect.any(Number), y: expect.any(Number) },
    }));
    testCore.handleUserDrawingDragEnd();
    expect(onUserDrawingPathDragEnd).toHaveBeenCalledTimes(1);

    onUserDrawingPathDragStart.mockClear();
    onUserDrawingPathDragMove.mockClear();
    onUserDrawingPathDragEnd.mockClear();
    core.setUserDrawingState({
      version: 1,
      activeTool: 'brush',
      selection: null,
      draft: null,
      textEdit: null,
      drawings: [],
    } satisfies UserDrawingState);
    expect(testCore.handleUserDrawingDragPending(100, 100)).toBe(true);
    expect(testCore.handleUserDrawingDragStart(100, 100)).toBe(true);
    expect(onUserDrawingPathDragStart).toHaveBeenCalledWith(expect.objectContaining({
      paneId: 'main',
      anchor: { time: expect.any(Number), price: expect.any(Number) },
    }));
    expect(testCore.handleUserDrawingDragMove(120, 110)).toBe(true);
    expect(onUserDrawingPathDragMove).toHaveBeenCalledWith(expect.objectContaining({
      paneId: 'main',
      anchor: { time: expect.any(Number), price: expect.any(Number) },
    }));
    testCore.handleUserDrawingDragEnd();
    expect(onUserDrawingPathDragEnd).toHaveBeenCalledTimes(1);

    core.dispose();
  });

  it('shows drawing context menu items before falling back to the chart context menu', async () => {
    const { ChartCore } = await import('./ChartCore');
    const drawingClick = vi.fn();
    const fallbackClick = vi.fn();
    const onContextMenu = vi.fn(() => [
      { position: 'top' as const, text: 'Fallback action', click: fallbackClick },
    ]);
    const onUserDrawingContextMenu = vi.fn(() => [
      { position: 'top' as const, text: 'Duplicate selected drawing', click: drawingClick },
      { position: 'bottom' as const, text: 'Disabled drawing action', click: vi.fn(), enabled: false },
    ]);
    const core = new ChartCore({
      container,
      width: 800,
      height: 600,
      onContextMenu,
      onUserDrawingContextMenu,
    });
    core.setViewport({ startTime: 0, endTime: 100, priceMin: 0, priceMax: 100 });
    core.setUserDrawingState({
      version: 1,
      activeTool: 'select',
      selection: { drawingId: 'h' },
      draft: null,
      textEdit: null,
      drawings: [],
    } satisfies UserDrawingState);

    const testCore = core as unknown as {
      handleContextMenu(screenX: number, screenY: number, price: number, time: number): void;
    };

    const addDocumentListener = vi.spyOn(document, 'addEventListener');
    const removeDocumentListener = vi.spyOn(document, 'removeEventListener');

    testCore.handleContextMenu(100, 100, 10, 20);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onUserDrawingContextMenu).toHaveBeenCalledWith({ x: 100, y: 100 }, expect.any(Map));
    expect(onContextMenu).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Duplicate selected drawing');
    expect(document.body.textContent).not.toContain('Fallback action');
    const duplicateItem = [...document.body.querySelectorAll<HTMLElement>('div')].find(
      (el) => el.textContent === 'Duplicate selected drawing',
    );
    const onChartClickFallthrough = vi.fn();
    document.body.addEventListener('click', onChartClickFallthrough);
    duplicateItem?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    duplicateItem?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    duplicateItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(drawingClick).toHaveBeenCalledTimes(1);
    expect(onChartClickFallthrough).not.toHaveBeenCalled();
    expect(addDocumentListener).toHaveBeenCalledWith('click', expect.any(Function));
    expect(removeDocumentListener).toHaveBeenCalledWith('click', expect.any(Function));
    document.body.removeEventListener('click', onChartClickFallthrough);
    addDocumentListener.mockRestore();
    removeDocumentListener.mockRestore();

    core.setUserDrawingState({
      version: 1,
      activeTool: 'select',
      selection: null,
      draft: null,
      textEdit: null,
      drawings: [],
    } satisfies UserDrawingState);
    onUserDrawingContextMenu.mockReturnValueOnce([]);

    testCore.handleContextMenu(120, 120, 11, 21);

    expect(onContextMenu).toHaveBeenCalledWith(21, 11);
    expect(document.body.textContent).toContain('Fallback action');

    core.dispose();
  });

  it('cleans up ChartCore context menu listeners when menus are replaced or disposed', async () => {
    const { ChartCore } = await import('./ChartCore');
    const onContextMenu = vi.fn(() => [
      { position: 'top' as const, text: 'Fallback action', click: vi.fn() },
    ]);
    const addDocumentListener = vi.spyOn(document, 'addEventListener');
    const removeDocumentListener = vi.spyOn(document, 'removeEventListener');
    const core = new ChartCore({
      container,
      width: 800,
      height: 600,
      onContextMenu,
    });
    const testCore = core as unknown as {
      handleContextMenu(screenX: number, screenY: number, price: number, time: number): void;
    };

    testCore.handleContextMenu(100, 100, 10, 20);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(addDocumentListener).toHaveBeenCalledWith('click', expect.any(Function));

    testCore.handleContextMenu(120, 120, 11, 21);
    expect(removeDocumentListener).toHaveBeenCalledWith('click', expect.any(Function));
    await new Promise((resolve) => setTimeout(resolve, 0));

    onContextMenu.mockReturnValueOnce([]);
    testCore.handleContextMenu(140, 140, 12, 22);
    expect(document.body.textContent).not.toContain('Fallback action');
    expect(removeDocumentListener).toHaveBeenCalledWith('click', expect.any(Function));

    core.dispose();
    expect(removeDocumentListener).toHaveBeenCalledWith('click', expect.any(Function));

    addDocumentListener.mockRestore();
    removeDocumentListener.mockRestore();
  });

  it.each(['rectangle', 'fibCircles', 'fibSpiral', 'gannSquare', 'gannSquareFixed'] satisfies UserDrawingTool[])(
    'constrains the %s second click to a square when placement is constrained',
    async (tool) => {
      const { ChartCore } = await import('./ChartCore');
      const onUserDrawingInput = vi.fn(() => true);
      const core = new ChartCore({
        container,
        width: 800,
        height: 600,
        onUserDrawingInput,
      });
      core.setViewport({ startTime: 0, endTime: 100, priceMin: 0, priceMax: 100 });

      const testCore = core as unknown as {
        handleUserDrawingInput(x: number, y: number, source?: 'mouse' | 'touch', options?: { constrainedPlacement?: boolean }): unknown;
        resolveUserDrawingInputPoint(x: number, y: number): UserDrawingInputPoint | null;
      };

      const startAnchor = testCore.resolveUserDrawingInputPoint(100, 100)?.anchor;
      core.setUserDrawingState({
        version: 1,
        activeTool: tool,
        selection: null,
        draft: { tool, paneId: 'main', anchors: [startAnchor!], style: DEFAULT_USER_DRAWING_STYLE, startedAt: 0 },
        textEdit: null,
        drawings: [],
      } satisfies UserDrawingState);

      testCore.handleUserDrawingInput(160, 120, 'mouse', { constrainedPlacement: true });

      const expectedConstrainedEnd = testCore.resolveUserDrawingInputPoint(160, 160);
      expect(onUserDrawingInput).toHaveBeenCalledWith(
        expect.objectContaining({
          paneId: 'main',
          anchor: expectedConstrainedEnd?.anchor,
        }),
      );
      expect(onUserDrawingInput).not.toHaveBeenCalledWith(
        expect.objectContaining({
          anchor: testCore.resolveUserDrawingInputPoint(160, 120)?.anchor,
        }),
      );

      core.dispose();
    },
  );

  it('applies strong magnet mode to web drawing input points', async () => {
    const { ChartCore } = await import('./ChartCore');
    const onUserDrawingInput = vi.fn(() => true);
    const core = new ChartCore({
      container,
      width: 100,
      height: 100,
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      onUserDrawingInput,
    });
    core.setViewport({ startTime: 0, endTime: 100, priceMin: 0, priceMax: 100 });
    core.setBars([{ time: 50, open: 40, high: 80, low: 20, close: 60, volume: 1 }]);
    core.setUserDrawingState({
      version: 1,
      activeTool: 'horizontalLine',
      magnetMode: 'strong',
      selection: null,
      draft: null,
      textEdit: null,
      drawings: [],
    } satisfies UserDrawingState);

    const testCore = core as unknown as {
      handleUserDrawingInput(x: number, y: number): unknown;
    };

    expect(testCore.handleUserDrawingInput(48, 18)).toBe(true);
    expect(onUserDrawingInput).toHaveBeenCalledWith(
      expect.objectContaining({
        paneId: 'main',
        anchor: { time: 50, price: 80 },
      }),
    );

    core.dispose();
  });

  it.each(['trendLine', 'rectangle', 'circle', 'ellipse', 'priceRange', 'datePriceRange'] satisfies UserDrawingTool[])(
    'commits %s from click placement of each anchor',
    async (tool) => {
      const { ChartCore } = await import('./ChartCore');
      const onUserDrawingInput = vi.fn(() => true);
      const core = new ChartCore({
        container,
        width: 100,
        height: 100,
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        onUserDrawingInput,
      });
      core.setViewport({ startTime: 0, endTime: 100, priceMin: 0, priceMax: 100 });
      core.setUserDrawingState({
        version: 1,
        activeTool: tool,
        magnetMode: 'off',
        selection: null,
        draft: null,
        textEdit: null,
        drawings: [],
      } satisfies UserDrawingState);

      const testCore = core as unknown as {
        handleUserDrawingInput(x: number, y: number): unknown;
        resolveUserDrawingInputPoint(x: number, y: number): UserDrawingInputPoint | null;
      };

      const firstAnchor = testCore.resolveUserDrawingInputPoint(48, 18)?.anchor;
      const secondAnchor = testCore.resolveUserDrawingInputPoint(72, 40)?.anchor;
      expect(testCore.handleUserDrawingInput(48, 18)).toBe(true);
      expect(testCore.handleUserDrawingInput(72, 40)).toBe(true);
      expect(onUserDrawingInput).toHaveBeenNthCalledWith(1, expect.objectContaining({ paneId: 'main', anchor: firstAnchor }));
      expect(onUserDrawingInput).toHaveBeenNthCalledWith(2, expect.objectContaining({ paneId: 'main', anchor: secondAnchor }));

      core.dispose();
    },
  );

  it('commits a multi-anchor tool from a click on each anchor', async () => {
    const { ChartCore } = await import('./ChartCore');
    const onUserDrawingInput = vi.fn(() => true);
    const core = new ChartCore({
      container,
      width: 100,
      height: 100,
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      onUserDrawingInput,
    });
    core.setViewport({ startTime: 0, endTime: 100, priceMin: 0, priceMax: 100 });
    core.setUserDrawingState({
      version: 1,
      activeTool: 'longPosition',
      magnetMode: 'off',
      selection: null,
      draft: null,
      textEdit: null,
      drawings: [],
    } satisfies UserDrawingState);

    const testCore = core as unknown as {
      handleUserDrawingInput(x: number, y: number): unknown;
    };

    expect(testCore.handleUserDrawingInput(20, 20)).toBe(true);
    expect(testCore.handleUserDrawingInput(48, 18)).toBe(true);
    expect(testCore.handleUserDrawingInput(70, 60)).toBe(true);
    expect(onUserDrawingInput).toHaveBeenCalledTimes(3);
    expect(onUserDrawingInput).toHaveBeenCalledWith(expect.objectContaining({ paneId: 'main' }));

    core.dispose();
  });

  it('constrains the cyclic line second click to a horizontal baseline when placement is constrained', async () => {
    const { ChartCore } = await import('./ChartCore');
    const onUserDrawingInput = vi.fn(() => true);
    const core = new ChartCore({
      container,
      width: 800,
      height: 600,
      onUserDrawingInput,
    });
    core.setViewport({ startTime: 0, endTime: 100, priceMin: 0, priceMax: 100 });

    const testCore = core as unknown as {
      handleUserDrawingInput(x: number, y: number, source?: 'mouse' | 'touch', options?: { constrainedPlacement?: boolean }): unknown;
      resolveUserDrawingInputPoint(x: number, y: number): UserDrawingInputPoint | null;
    };

    const startAnchor = testCore.resolveUserDrawingInputPoint(100, 100)?.anchor;
    core.setUserDrawingState({
      version: 1,
      activeTool: 'cyclicLines',
      selection: null,
      draft: { tool: 'cyclicLines', paneId: 'main', anchors: [startAnchor!], style: DEFAULT_USER_DRAWING_STYLE, startedAt: 0 },
      textEdit: null,
      drawings: [],
    } satisfies UserDrawingState);

    testCore.handleUserDrawingInput(160, 120, 'mouse', { constrainedPlacement: true });

    const expectedConstrainedEnd = testCore.resolveUserDrawingInputPoint(160, 100);
    expect(onUserDrawingInput).toHaveBeenCalledWith(
      expect.objectContaining({
        paneId: 'main',
        anchor: expectedConstrainedEnd?.anchor,
      }),
    );
    expect(onUserDrawingInput).not.toHaveBeenCalledWith(
      expect.objectContaining({
        anchor: testCore.resolveUserDrawingInputPoint(160, 120)?.anchor,
      }),
    );

    core.dispose();
  });

  it('does not engage placement drag for click-placement tools', async () => {
    const { ChartCore } = await import('./ChartCore');
    const onUserDrawingCancelDraft = vi.fn();
    const core = new ChartCore({
      container,
      width: 800,
      height: 600,
      onUserDrawingCancelDraft,
    });
    core.setViewport({ startTime: 0, endTime: 100, priceMin: 0, priceMax: 100 });
    core.setUserDrawingState({
      version: 1,
      activeTool: 'rectangle',
      selection: null,
      draft: null,
      textEdit: null,
      drawings: [],
    } satisfies UserDrawingState);

    const eventCallbacks = eventManagerInstances.at(-1)?.callbacks;
    expect(eventCallbacks).toBeDefined();
    // A drag gesture with a click-placement tool active must not start any placement gesture.
    expect(eventCallbacks?.onDrawingDragStart?.(100, 100, 'mouse')).toBe(false);
    eventCallbacks?.onDrawingDragCancel?.('mouse');

    expect(onUserDrawingCancelDraft).not.toHaveBeenCalled();

    core.dispose();
  });

  it('routes EventManager measure drags through the temporary measure lifecycle', async () => {
    const { ChartCore } = await import('./ChartCore');
    const onUserDrawingMeasureStart = vi.fn(() => true);
    const onUserDrawingMeasureMove = vi.fn(() => true);
    const onUserDrawingMeasureEnd = vi.fn();
    const onUserDrawingCancelDraft = vi.fn();
    const core = new ChartCore({
      container,
      width: 800,
      height: 600,
      onUserDrawingMeasureStart,
      onUserDrawingMeasureMove,
      onUserDrawingMeasureEnd,
      onUserDrawingCancelDraft,
    });
    core.setViewport({ startTime: 0, endTime: 100, priceMin: 0, priceMax: 100 });
    core.setUserDrawingState({
      version: 1,
      activeTool: 'rectangle',
      measureMode: 'on',
      selection: { drawingId: 'selected' },
      draft: null,
      textEdit: null,
      drawings: [
        {
          id: 'selected',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          price: 50,
        },
      ],
    } satisfies UserDrawingState);

    const eventCallbacks = eventManagerInstances.at(-1)?.callbacks;
    expect(eventCallbacks).toBeDefined();
    expect(eventCallbacks?.onDrawingDragStart?.(100, 100, 'mouse')).toBe(true);
    expect(eventCallbacks?.onDrawingDragMove?.(140, 120, 'mouse')).toBe(true);
    eventCallbacks?.onDrawingDragEnd?.('mouse');

    expect(onUserDrawingMeasureStart).toHaveBeenCalledWith(expect.objectContaining({ paneId: 'main' }));
    expect(onUserDrawingMeasureMove).toHaveBeenCalledWith(expect.objectContaining({ paneId: 'main' }));
    expect(onUserDrawingMeasureEnd).toHaveBeenCalledTimes(1);

    expect(eventCallbacks?.onDrawingDragStart?.(100, 100, 'touch')).toBe(true);
    eventCallbacks?.onDrawingDragCancel?.('touch');
    expect(onUserDrawingCancelDraft).toHaveBeenCalledTimes(1);

    core.dispose();
  });

  it('constructs with canvas interactive lines', async () => {
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

  it('updates cached line countdown targets without forcing a rebuild', async () => {
    const { ChartCore } = await import('./ChartCore');
    const core = new ChartCore({
      container,
      width: 800,
      height: 600,
    });

    core.setBars(makeBars(5));
    core.setPriceLines([
      {
        id: 'countdown-line',
        price: 50000,
        lineStyle: 'dashed',
        color: '#22c55e',
        label: {
          primaryText: '50000',
          secondaryText: 'TP',
          backgroundColor: '#22c55e',
          textColor: '#ffffff',
        },
        countdownToTime: 1_000,
      },
    ]);
    core.paint(DIRTY.FULL);

    const manager = (core as unknown as { priceLineManager: CountdownManagerProbe }).priceLineManager;
    expect(manager.countdownTextNodes.get('countdown-line')?.[0]?.targetTime).toBe(1_000);

    core.setPriceLines([
      {
        id: 'countdown-line',
        price: 50000,
        lineStyle: 'dashed',
        color: '#22c55e',
        label: {
          primaryText: '50000',
          secondaryText: 'TP',
          backgroundColor: '#22c55e',
          textColor: '#ffffff',
        },
        countdownToTime: 2_000,
      },
    ]);
    core.paint(DIRTY.FULL);

    expect(manager.countdownTextNodes.get('countdown-line')?.[0]?.targetTime).toBe(2_000);
    core.dispose();
  });

  it('updates cached line data and font on the fast path', async () => {
    const { ChartCore } = await import('./ChartCore');
    const core = new ChartCore({
      container,
      width: 800,
      height: 600,
      renderOptions: {
        fontFamily: 'Mock Font',
      },
    });

    core.setBars(makeBars(5));
    core.setPositionLines([
      {
        id: 'position-1',
        positionId: 'position-1',
        price: 50010,
        lineColor: '#ff0000',
        lineStyle: 0,
        lineLength: 100,
        extendLeft: true,
        lineWidth: 1,
        partialEnabled: false,
        reversible: false,
        closeable: true,
        brackets: {},
        text: 'Pos',
        textShort: 'Pos',
        quantity: '1',
        quantityShort: '1',
        pnl: '+$0.00',
        pnlShort: '+0',
        profitState: 'positive',
        bodyBackgroundColor: '#111111',
        bodyTextColor: '#ffffff',
        bodyBorderColor: '#ff0000',
        quantityBackgroundColor: '#111111',
        quantityTextColor: '#ffffff',
        quantityBorderColor: '#ff0000',
        closeButtonBackgroundColor: '#111111',
        closeButtonIconColor: '#ffffff',
        closeButtonBorderColor: '#ff0000',
        closeTooltip: 'Close',
        protectTooltipText: 'Protect',
        reverseButtonBackgroundColor: '#111111',
        reverseButtonIconColor: '#ffffff',
        reverseButtonBorderColor: '#ff0000',
        positionData: {
          entryPrice: 50000,
          isLong: true,
          notional: 1000,
        },
        callbacks: {},
      },
    ]);
    core.paint(DIRTY.FULL);

    const manager = (core as unknown as { priceLineManager: PriceLineManagerProbe }).priceLineManager;
    const initialBound = manager.cachedLineGroups.get('position-1')?.getAttr('boundData') as { partialEnabled?: boolean };
    expect(initialBound.partialEnabled).toBe(false);
    expect(manager.options.fontFamily).toBe('Mock Font');

    core.setPositionLines([
      {
        id: 'position-1',
        positionId: 'position-1b',
        price: 50010,
        lineColor: '#ff0000',
        lineStyle: 0,
        lineLength: 100,
        extendLeft: true,
        lineWidth: 1,
        partialEnabled: true,
        reversible: false,
        closeable: true,
        brackets: {},
        text: 'Pos',
        textShort: 'Pos',
        quantity: '1',
        quantityShort: '1',
        pnl: '+$0.00',
        pnlShort: '+0',
        profitState: 'positive',
        bodyBackgroundColor: '#111111',
        bodyTextColor: '#ffffff',
        bodyBorderColor: '#ff0000',
        quantityBackgroundColor: '#111111',
        quantityTextColor: '#ffffff',
        quantityBorderColor: '#ff0000',
        closeButtonBackgroundColor: '#111111',
        closeButtonIconColor: '#ffffff',
        closeButtonBorderColor: '#ff0000',
        closeTooltip: 'Close',
        protectTooltipText: 'Protect',
        reverseButtonBackgroundColor: '#111111',
        reverseButtonIconColor: '#ffffff',
        reverseButtonBorderColor: '#ff0000',
        positionData: {
          entryPrice: 50000,
          isLong: true,
          notional: 1000,
        },
        callbacks: {},
      },
    ]);
    core.paint(DIRTY.FULL);

    const updatedBound = manager.cachedLineGroups.get('position-1')?.getAttr('boundData') as {
      partialEnabled?: boolean;
      positionId?: string;
    };
    expect(updatedBound.partialEnabled).toBe(true);
    expect(updatedBound.positionId).toBe('position-1b');
    core.dispose();
  });

  it('does not mark price-axis labels as interactive Konva hit targets', async () => {
    const { ChartCore } = await import('./ChartCore');
    const core = new ChartCore({
      container,
      width: 800,
      height: 600,
    });

    core.setBars(makeBars(5));
    core.setOrderLines([
      {
        id: 'order-axis-hit',
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
    core.paint(DIRTY.FULL);

    const manager = (core as unknown as { priceLineManager: PriceLineManagerProbe }).priceLineManager;
    const refs = manager.cachedLineGroups.get('order-axis-hit')?.getAttr('contentRefs') as LineContentRefsProbe;

    expect(refs.priceAxisRect?.listening()).toBe(false);
    expect(refs.priceAxisPrimaryText?.listening()).toBe(false);
    core.dispose();
  });

  it('keeps the grabbing cursor while EventManager hover processing runs during order drags', async () => {
    const { ChartCore } = await import('./ChartCore');
    const core = new ChartCore({
      container,
      width: 800,
      height: 600,
    });

    core.setBars(makeBars(5));
    core.setOrderLines([
      {
        id: 'order-cursor',
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
    core.paint(DIRTY.FULL);

    const chartContainer = container.firstElementChild as HTMLElement;
    const manager = (core as unknown as { priceLineManager: PriceLineManagerProbe }).priceLineManager;
    const lineGroup = manager.cachedLineGroups.get('order-cursor');
    const draggableRects = lineGroup?.find((node: Konva.Node) => node instanceof Konva.Rect && node.draggable()) as
      Konva.Rect[] | undefined;
    const orderDragRect = draggableRects?.[0];

    expect(orderDragRect).toBeDefined();

    orderDragRect!.fire('dragstart');
    expect(chartContainer.style.cursor).toBe('grabbing');

    eventManagerInstances[0]?.callbacks.onCursorChange?.('crosshair');
    expect(chartContainer.style.cursor).toBe('grabbing');

    orderDragRect!.fire('dragend');
    expect(chartContainer.style.cursor).toBe('crosshair');
    core.dispose();
  });

  it('keeps the grab cursor while EventManager hover processing runs over draggable order lines', async () => {
    const { ChartCore } = await import('./ChartCore');
    const core = new ChartCore({
      container,
      width: 800,
      height: 600,
    });

    core.setBars(makeBars(5));
    core.setOrderLines([
      {
        id: 'order-hover-cursor',
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
    core.paint(DIRTY.FULL);

    const chartContainer = container.firstElementChild as HTMLElement;
    const probe = core as unknown as { priceLineManager: PriceLineManagerProbe; stage: Konva.Stage };
    const lineGroup = probe.priceLineManager.cachedLineGroups.get('order-hover-cursor');
    const draggableRects = lineGroup?.find((node: Konva.Node) => node instanceof Konva.Rect && node.draggable()) as
      Konva.Rect[] | undefined;
    const orderDragRect = draggableRects?.[0];

    expect(orderDragRect).toBeDefined();

    const originalGetIntersection = probe.stage.getIntersection.bind(probe.stage);
    vi.spyOn(probe.stage, 'getIntersection').mockImplementation((pos) => {
      return pos.x === 123 && pos.y === 234 ? orderDragRect! : originalGetIntersection(pos);
    });

    eventManagerInstances[0]?.callbacks.onCrossHairMoved?.(123, 234);
    eventManagerInstances[0]?.callbacks.onCursorChange?.('pointer');
    expect(chartContainer.style.cursor).toBe('pointer');

    orderDragRect!.fire('mouseenter');
    expect(chartContainer.style.cursor).toBe('grab');

    eventManagerInstances[0]?.callbacks.onCursorChange?.('pointer');
    expect(chartContainer.style.cursor).toBe('grab');

    core.dispose();
  });
});
