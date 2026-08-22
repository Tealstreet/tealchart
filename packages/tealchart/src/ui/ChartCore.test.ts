// @vitest-environment jsdom

import type {
  UserDrawingInputPoint,
  UserDrawingSelectionAtPointResult,
  UserDrawingState,
  UserDrawingTool,
} from '../drawings';
import type { Bar, PositionLineRenderData, PriceLineLabelBounds, Viewport } from '../types';

import Konva from 'konva';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR } from '../constants';
import { DEFAULT_USER_DRAWING_STYLE } from '../drawings';
import { DIRTY } from '../rendering/RenderScheduler';
import { clearChartStoreCache } from '../state/chartState';
import { TealchartRenderer } from '../TealchartRenderer';

interface EventManagerCallbackProbe {
  onDrawingDragStart?: (x: number, y: number, source: 'mouse' | 'touch') => boolean;
  onDrawingDragMove?: (x: number, y: number, source: 'mouse' | 'touch') => boolean;
  onDrawingDragEnd?: (source: 'mouse' | 'touch') => void;
  onDrawingDragCancel?: (source: 'mouse' | 'touch') => void;
  onCrossHairMoved?: (x: number, y: number) => void;
  onCrosshairRender?: () => void;
  onCursorChange?: (cursor: string) => void;
  onPaneDoubleClick?: (paneId: string, point: { x: number; y: number }) => void;
  isOverInteractiveElement?: (x: number, y: number) => boolean;
  isOverCrosshairChrome?: (x: number, y: number) => boolean;
}

const eventManagerInstances = vi.hoisted(
  () => [] as Array<{ callbacks: EventManagerCallbackProbe; isDragging: boolean; activeCursor: string | null }>,
);

// Mock EventManager (survives mockReset)
vi.mock('../interaction/EventManager', () => ({
  EventManager: class {
    private instance: { callbacks: EventManagerCallbackProbe; isDragging: boolean; activeCursor: string | null };

    constructor(_container: HTMLElement, callbacks: EventManagerCallbackProbe) {
      this.instance = { callbacks, isDragging: false, activeCursor: null };
      eventManagerInstances.push(this.instance);
    }

    getIsDragging() {
      return this.instance.isDragging;
    }

    getActiveCursor() {
      return this.instance.activeCursor;
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
    rotate: () => {},
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

function makePositionLine(overrides: Partial<PositionLineRenderData> = {}): PositionLineRenderData {
  return {
    id: 'position-1',
    positionId: 'position-1',
    price: 50010,
    lineColor: '#2196F3',
    lineStyle: 0,
    lineLength: 100,
    lineLengthUnit: 'percentage',
    extendLeft: true,
    lineWidth: 1,
    text: 'Long',
    textShort: 'Lng',
    quantity: '1 BTC',
    quantityShort: '1',
    pnl: '$0.00',
    pnlShort: '0',
    profitState: 'neutral',
    bodyBackgroundColor: '#111111',
    bodyTextColor: '#ffffff',
    bodyBorderColor: '#2196F3',
    bodyFont: '',
    quantityBackgroundColor: '#111111',
    quantityTextColor: '#ffffff',
    quantityBorderColor: '#2196F3',
    quantityFont: '',
    reverseButtonBackgroundColor: '#2196F3',
    reverseButtonIconColor: '#ffffff',
    reverseButtonBorderColor: '#2196F3',
    closeButtonBackgroundColor: '#2196F3',
    closeButtonIconColor: '#ffffff',
    closeButtonBorderColor: '#2196F3',
    tooltip: '',
    closeTooltip: 'Close',
    reverseTooltip: 'Reverse',
    protectTooltipText: 'Protect',
    partialEnabled: true,
    reversible: true,
    closeable: true,
    brackets: {},
    positionData: {
      entryPrice: 50000,
      isLong: true,
      notional: 1000,
    },
    callbacks: {},
    ...overrides,
  };
}

interface CountdownManagerProbe {
  countdownTextNodes: Map<string, Array<{ targetTime: number }>>;
}

interface PriceLineManagerProbe {
  cachedLineGroups: Map<string, Konva.Group>;
  options: { fontFamily?: string };
}

interface LineContentRefsProbe {
  priceAxisRect?: { listening(): boolean; fill(): string };
  priceAxisPrimaryText?: { listening(): boolean };
  priceAxisSecondaryText?: { listening(): boolean };
  segmentRects?: Array<{ fill(): string; x(): number; cornerRadius(): number | number[] }>;
  segmentAccents?: Array<{ fill(): string } | undefined>;
  buttonRects?: Array<{ fill(): string; cornerRadius(): number | number[] }>;
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

  it('resets the view on a double click of the price axis', async () => {
    const core = await createChartCore();
    core.setBars(makeBars(10, 1_000_000, 60_000, 50_000));
    core.setViewport({ startTime: 0, endTime: 1, priceMin: 0, priceMax: 1 });

    const { callbacks } = eventManagerInstances[eventManagerInstances.length - 1];
    // width 800 with the default right margin — comfortably inside the axis.
    callbacks.onPaneDoubleClick?.('main', { x: 795, y: 200 });

    expect(core.getViewport()!.priceMin).toBeGreaterThan(40_000);

    core.dispose();
  });

  it('leaves a double click in the plot to the drawing handler', async () => {
    const onPaneDoubleClick = vi.fn();
    const { ChartCore } = await import('./ChartCore');
    const core = new ChartCore({ container, width: 800, height: 600, onPaneDoubleClick });
    core.setBars(makeBars(10, 1_000_000, 60_000, 50_000));
    core.setViewport({ startTime: 0, endTime: 1, priceMin: 0, priceMax: 1 });

    const { callbacks } = eventManagerInstances[eventManagerInstances.length - 1];
    callbacks.onPaneDoubleClick?.('main', { x: 200, y: 200 });

    expect(onPaneDoubleClick).toHaveBeenCalledTimes(1);
    expect(core.getViewport()!.priceMax).toBe(1);

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
    expect(onUserDrawingSelection).toHaveBeenLastCalledWith(expect.anything(), expect.any(Map), {
      additive: undefined,
      toggleSelected: false,
    });
    expect(testCore.handleUserDrawingInput(100, 100, 'mouse', { additiveSelection: true })).toBe(false);
    expect(onUserDrawingSelection).toHaveBeenCalledTimes(2);
    expect(onUserDrawingSelection).toHaveBeenLastCalledWith(expect.anything(), expect.any(Map), {
      additive: true,
      toggleSelected: false,
    });
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
    expect(onUserDrawingPathDragStart).toHaveBeenCalledWith(
      expect.objectContaining({
        paneId: 'main',
        anchor: { time: expect.any(Number), price: expect.any(Number), pressure: 0.4 },
        position: { x: expect.any(Number), y: expect.any(Number) },
      }),
    );
    expect(testCore.handleUserDrawingDragMove(120, 110, { pressure: 0.6 })).toBe(true);
    expect(onUserDrawingPathDragMove).toHaveBeenCalledWith(
      expect.objectContaining({
        paneId: 'main',
        anchor: { time: expect.any(Number), price: expect.any(Number), pressure: 0.6 },
        position: { x: expect.any(Number), y: expect.any(Number) },
      }),
    );
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
    expect(onUserDrawingPathDragStart).toHaveBeenCalledWith(
      expect.objectContaining({
        paneId: 'main',
        anchor: { time: expect.any(Number), price: expect.any(Number) },
      }),
    );
    expect(testCore.handleUserDrawingDragMove(120, 110)).toBe(true);
    expect(onUserDrawingPathDragMove).toHaveBeenCalledWith(
      expect.objectContaining({
        paneId: 'main',
        anchor: { time: expect.any(Number), price: expect.any(Number) },
      }),
    );
    testCore.handleUserDrawingDragEnd();
    expect(onUserDrawingPathDragEnd).toHaveBeenCalledTimes(1);

    core.dispose();
  });

  it('shows drawing context menu items before falling back to the chart context menu', async () => {
    const { ChartCore } = await import('./ChartCore');
    const drawingClick = vi.fn();
    const fallbackClick = vi.fn();
    const onContextMenu = vi.fn(() => [{ position: 'top' as const, text: 'Fallback action', click: fallbackClick }]);
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
    const onContextMenu = vi.fn(() => [{ position: 'top' as const, text: 'Fallback action', click: vi.fn() }]);
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

  it('opens the crosshair button context menu down-left from its anchor', async () => {
    const { ChartCore } = await import('./ChartCore');
    const onContextMenu = vi.fn(() => [{ position: 'top' as const, text: 'Limit Buy', click: vi.fn() }]);
    const core = new ChartCore({
      container,
      width: 800,
      height: 600,
      onContextMenu,
    });
    const testCore = core as unknown as {
      handleContextMenu(
        screenX: number,
        screenY: number,
        price: number,
        time: number,
        placement?: 'default' | 'crosshairButton',
      ): void;
    };

    testCore.handleContextMenu(300, 100, 10, 20, 'crosshairButton');
    const crosshairMenu = document.body.lastElementChild as HTMLElement;
    expect(crosshairMenu.style.left).toBe('144px');
    expect(crosshairMenu.style.top).toBe('106px');

    testCore.handleContextMenu(300, 100, 10, 20);
    const defaultMenu = document.body.lastElementChild as HTMLElement;
    expect(defaultMenu.style.left).toBe('300px');
    expect(defaultMenu.style.top).toBe('100px');

    core.dispose();
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
        handleUserDrawingInput(
          x: number,
          y: number,
          source?: 'mouse' | 'touch',
          options?: { constrainedPlacement?: boolean },
        ): unknown;
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
      expect(onUserDrawingInput).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ paneId: 'main', anchor: firstAnchor }),
      );
      expect(onUserDrawingInput).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ paneId: 'main', anchor: secondAnchor }),
      );

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
      handleUserDrawingInput(
        x: number,
        y: number,
        source?: 'mouse' | 'touch',
        options?: { constrainedPlacement?: boolean },
      ): unknown;
      resolveUserDrawingInputPoint(x: number, y: number): UserDrawingInputPoint | null;
    };

    const startAnchor = testCore.resolveUserDrawingInputPoint(100, 100)?.anchor;
    core.setUserDrawingState({
      version: 1,
      activeTool: 'cyclicLines',
      selection: null,
      draft: {
        tool: 'cyclicLines',
        paneId: 'main',
        anchors: [startAnchor!],
        style: DEFAULT_USER_DRAWING_STYLE,
        startedAt: 0,
      },
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
        upColor: '#00aa77',
        downColor: '#ee3355',
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
        lineLengthUnit: 'percentage',
        extendLeft: true,
        lineWidth: 1,
        editable: true,
        cancellable: true,
        cancelAsSubmit: false,
        partialEnabled: false,
        brackets: null,
        text: 'Limit',
        textShort: 'Lmt',
        quantity: '1',
        quantityShort: '1',
        bodyBackgroundColor: '#111111',
        bodyTextColor: '#ffffff',
        bodyBorderColor: '#ff0000',
        bodyFont: '',
        quantityBackgroundColor: '#111111',
        quantityTextColor: '#ffffff',
        quantityBorderColor: '#ff0000',
        quantityFont: '',
        cancelButtonBackgroundColor: '#111111',
        cancelButtonIconColor: '#ffffff',
        cancelButtonBorderColor: '#ff0000',
        tooltip: '',
        cancelTooltip: 'Cancel',
        modifyTooltip: 'Modify',
        callbacks: {},
      },
    ]);
    core.paint(0xff);

    expect(core.getViewport()).not.toBeNull();
    core.dispose();
  });

  it('renders existing order bracket prices as standalone interactive lines', async () => {
    const { ChartCore } = await import('./ChartCore');
    const core = new ChartCore({
      container,
      width: 800,
      height: 600,
      renderOptions: { upColor: '#00aa77', downColor: '#ee3355' },
    });

    core.setBars(makeBars(5));
    core.setOrderLines([
      {
        id: 'order-1',
        price: 50010,
        lineColor: '#2196F3',
        lineStyle: 2,
        lineLength: 100,
        lineLengthUnit: 'percentage',
        extendLeft: true,
        lineWidth: 1,
        editable: true,
        cancellable: true,
        cancelAsSubmit: false,
        partialEnabled: false,
        brackets: {
          takeProfit: 50100,
          stopLoss: 49900,
        },
        text: 'Limit',
        textShort: 'Lmt',
        quantity: '1',
        quantityShort: '1',
        bodyBackgroundColor: '#111111',
        bodyTextColor: '#ffffff',
        bodyBorderColor: '#2196F3',
        bodyFont: '',
        quantityBackgroundColor: '#111111',
        quantityTextColor: '#ffffff',
        quantityBorderColor: '#2196F3',
        quantityFont: '',
        cancelButtonBackgroundColor: '#111111',
        cancelButtonIconColor: '#ffffff',
        cancelButtonBorderColor: '#2196F3',
        tooltip: '',
        cancelTooltip: 'Cancel',
        modifyTooltip: 'Modify',
        callbacks: {},
      },
    ]);
    core.paint(DIRTY.FULL);

    const manager = (core as unknown as { priceLineManager: PriceLineManagerProbe }).priceLineManager;
    expect(manager.cachedLineGroups.has('order-1-tp')).toBe(true);
    expect(manager.cachedLineGroups.has('order-1-sl')).toBe(true);
    const tpBound = manager.cachedLineGroups.get('order-1-tp')?.getAttr('boundData') as {
      label?: { backgroundColor: string; textColor: string; secondaryText?: string; filled?: boolean };
    };
    const slBound = manager.cachedLineGroups.get('order-1-sl')?.getAttr('boundData') as {
      label?: { backgroundColor: string; textColor: string; secondaryText?: string; filled?: boolean };
    };
    expect(tpBound.label).toMatchObject({
      backgroundColor: '#00aa77',
      textColor: DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR,
      filled: true,
    });
    expect(tpBound.label?.secondaryText).toBeUndefined();
    expect(slBound.label).toMatchObject({
      backgroundColor: '#f97316',
      textColor: DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR,
      filled: true,
    });
    expect(slBound.label?.secondaryText).toBeUndefined();
    const slRefs = manager.cachedLineGroups.get('order-1-sl')?.getAttr('contentRefs') as LineContentRefsProbe;
    expect(slRefs.priceAxisRect?.fill()).toBe('#f97316');

    core.dispose();
  });

  // Both of these read an identity out of a bound or a line id. When they
  // preferred the venue's id over the adapter's, a host that sets one - which is
  // most of them - looked its own lines up under a name nothing else used: the
  // bracket drag ran with no preview, and optimistic state was filed under an id
  // no render ever asked about. See CLAUDE.md "Line identity (OEMS)".
  it('keys bracket preview and optimistic state on the adapter id, not the venue id', async () => {
    const { ChartCore } = await import('./ChartCore');
    const core = new ChartCore({ container, width: 800, height: 600 });

    core.setBars(makeBars(5));
    core.setPositionLines([
      makePositionLine({
        id: 'position_1',
        positionId: 'BTC-USDC-Long',
        positionData: { entryPrice: 50010, notional: 1, isLong: true },
      }),
    ]);
    core.paint(DIRTY.FULL);

    const privateCore = core as unknown as {
      _updateBracketDragState(
        type: 'tp' | 'sl',
        lineId: string,
        price: number,
        partialPercent: number,
        dragStartX: number,
        dragCurrentX: number,
      ): void;
      _bracketDragState: { price: number } | null;
      getBoundTradingObject(bound: PriceLineLabelBounds): { objectId: string } | null;
    };

    privateCore._updateBracketDragState('tp', 'position_1', 50500, 100, 0, 20);
    expect(privateCore._bracketDragState).toMatchObject({ price: 50500 });

    privateCore._bracketDragState = null;
    privateCore._updateBracketDragState('tp', 'BTC-USDC-Long', 50500, 100, 0, 20);
    expect(privateCore._bracketDragState).toBeNull();

    const bound = {
      lineId: 'position_1',
      positionId: 'BTC-USDC-Long',
      type: 'position',
      price: 50010,
      originalY: 0,
      adjustedY: 0,
      width: 0,
      height: 0,
      color: '#2196F3',
      label: { primaryText: '50,010' },
      lineStyle: 'solid',
    } as PriceLineLabelBounds;
    expect(privateCore.getBoundTradingObject(bound)?.objectId).toBe('position_1');

    core.dispose();
  });

  it('settles optimistic bracket creates when external order callbacks resolve', async () => {
    const { ChartCore } = await import('./ChartCore');
    const core = new ChartCore({
      container,
      width: 800,
      height: 600,
      renderOptions: { upColor: '#00aa77', downColor: '#ee3355' },
    });

    let resolveSubmit!: () => void;
    const submitPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });
    const onSLMoveEnd = vi.fn(() => submitPromise);
    core.setBars(makeBars(5));
    core.setPositionLines([
      makePositionLine({
        brackets: {},
        callbacks: {
          onSLMoveEnd,
        },
      }),
    ]);
    core.paint(DIRTY.FULL);

    const bound = {
      lineId: 'position-1',
      positionId: 'position-1',
      type: 'position',
      price: 50010,
      originalY: 0,
      adjustedY: 0,
      width: 0,
      height: 0,
      color: '#2196F3',
      label: { primaryText: '50,010' },
      lineStyle: 'solid',
      callbacks: {
        onSLMoveEnd,
      },
    } as PriceLineLabelBounds;
    const privateCore = core as unknown as {
      handleBracketMoveEnd(type: 'tp' | 'sl', bound: PriceLineLabelBounds, price: number, percent: number): void;
      oemsActions: { getActions(): unknown[] };
    };

    privateCore.handleBracketMoveEnd('sl', bound, 49900, 75);
    core.paint(DIRTY.FULL);

    const manager = (core as unknown as { priceLineManager: PriceLineManagerProbe }).priceLineManager;
    expect(onSLMoveEnd).toHaveBeenCalledWith(49900, 75);
    expect(privateCore.oemsActions.getActions()).toHaveLength(1);
    expect(manager.cachedLineGroups.has('position-1-sl')).toBe(true);
    const pendingRefs = manager.cachedLineGroups.get('position-1-sl')?.getAttr('contentRefs') as LineContentRefsProbe;
    const pendingBound = manager.cachedLineGroups.get('position-1-sl')?.getAttr('boundData') as PriceLineLabelBounds;
    expect(pendingRefs.priceAxisRect?.fill()).toBe('#f97316');
    expect(pendingBound.label).toMatchObject({
      textColor: DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR,
      filled: true,
    });
    expect(pendingBound.label.secondaryText).toBeUndefined();

    resolveSubmit();
    await Promise.resolve();
    await Promise.resolve();
    core.paint(DIRTY.FULL);

    expect(privateCore.oemsActions.getActions()).toHaveLength(0);
    expect(manager.cachedLineGroups.has('position-1-sl')).toBe(false);

    core.dispose();
  });

  // The partial branch of _drawBracketPreview had no coverage at all, so the
  // marker ladder, its dimming and the summary pill's corner were unverified.
  it('draws the partial marker ladder on one arm, each percent once', async () => {
    const { ChartCore } = await import('./ChartCore');
    const core = new ChartCore({
      container,
      width: 800,
      height: 600,
      renderOptions: { pricePrecision: 0 },
    });

    core.setBars(makeBars(5));
    const fillText = vi.fn();
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      roundRect: vi.fn(),
      measureText: (text: string) => ({ width: text.length * 7 }),
      setLineDash: vi.fn(),
      fillText,
      font: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      textAlign: 'left',
      textBaseline: 'top',
      globalAlpha: 1,
    };
    const privateCore = core as unknown as {
      _bracketDragState: unknown;
      _drawBracketPreview(ctx: CanvasRenderingContext2D): void;
    };

    privateCore._bracketDragState = {
      type: 'sl',
      positionId: 'position-1',
      price: 49900,
      entryPrice: 50000,
      partialPercent: 50,
      partialEnabled: true,
      dragStartX: 300,
      dragCurrentX: 420,
      positionData: { entryPrice: 50000, isLong: true, notional: 1000 },
      color: '#f97316',
    };
    privateCore._drawBracketPreview(ctx as unknown as CanvasRenderingContext2D);

    const percentCalls = fillText.mock.calls.filter((call) => /^\d+%$/.test(String(call[0])));
    const texts = percentCalls.map((call) => String(call[0]));
    expect(texts).toEqual(['100%', '75%', '50%', '25%', '10%']);

    // Dragging right lays the ladder out to the right of the origin, once.
    const xs = percentCalls.map((call) => Number(call[1]));
    expect(xs.every((x) => x >= 300)).toBe(true);
    expect(new Set(xs).size).toBe(xs.length);

    core.dispose();
  });

  it('draws the active bracket drag price on the price axis overlay', async () => {
    const { ChartCore } = await import('./ChartCore');
    const core = new ChartCore({
      container,
      width: 800,
      height: 600,
      renderOptions: { pricePrecision: 0 },
    });

    core.setBars(makeBars(5));
    const fillText = vi.fn();
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      roundRect: vi.fn(),
      measureText: (text: string) => ({ width: text.length * 7 }),
      setLineDash: vi.fn(),
      fillText,
      font: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      textAlign: 'left',
      textBaseline: 'top',
      globalAlpha: 1,
    };
    const privateCore = core as unknown as {
      _bracketDragState: unknown;
      _drawBracketPreview(ctx: CanvasRenderingContext2D): void;
    };

    privateCore._bracketDragState = {
      type: 'sl',
      positionId: 'position-1',
      price: 49900,
      entryPrice: 50000,
      partialPercent: 100,
      partialEnabled: false,
      dragStartX: 300,
      dragCurrentX: 300,
      positionData: { entryPrice: 50000, isLong: true, notional: 1000 },
      color: '#f97316',
    };
    privateCore._drawBracketPreview(ctx as unknown as CanvasRenderingContext2D);

    expect(fillText).toHaveBeenCalledWith('49,900', expect.any(Number), expect.any(Number));

    core.dispose();
  });

  it('renders position lines on the experimental canvas interactive-line path', async () => {
    const { ChartCore } = await import('./ChartCore');
    const core = new ChartCore({
      container,
      width: 800,
      height: 600,
      renderOptions: { upColor: '#00aa77', downColor: '#ee3355' },
    });

    core.setBars(makeBars(5));
    core.setPositionLines([
      {
        id: 'position-1',
        positionId: 'position-1',
        price: 50010,
        lineColor: '#2196F3',
        lineStyle: 0,
        lineLength: 100,
        lineLengthUnit: 'percentage',
        extendLeft: true,
        lineWidth: 1,
        text: 'Long',
        textShort: 'Lng',
        quantity: '1 BTC',
        quantityShort: '1',
        pnl: '-$12.50',
        pnlShort: '-12',
        profitState: 'negative',
        bodyBackgroundColor: '#2196F3',
        bodyTextColor: '#ffffff',
        bodyBorderColor: '#2196F3',
        bodyFont: '',
        quantityBackgroundColor: '#2196F3',
        quantityTextColor: '#ffffff',
        quantityBorderColor: '#2196F3',
        quantityFont: '',
        reverseButtonBackgroundColor: '#2196F3',
        reverseButtonIconColor: '#ffffff',
        reverseButtonBorderColor: '#2196F3',
        closeButtonBackgroundColor: '#2196F3',
        closeButtonIconColor: '#ffffff',
        closeButtonBorderColor: '#2196F3',
        tooltip: '',
        closeTooltip: 'Close',
        reverseTooltip: 'Reverse',
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
      {
        id: 'position-2',
        positionId: 'position-2',
        price: 50020,
        lineColor: '#ef5350',
        lineStyle: 0,
        lineLength: 100,
        lineLengthUnit: 'percentage',
        extendLeft: true,
        lineWidth: 1,
        text: 'Short',
        textShort: 'Shrt',
        quantity: '1 BTC',
        quantityShort: '1',
        pnl: '$12.50',
        pnlShort: '12',
        profitState: 'positive',
        bodyBackgroundColor: '#111111',
        bodyTextColor: '#ffffff',
        bodyBorderColor: '#111111',
        bodyFont: '',
        quantityBackgroundColor: '#111111',
        quantityTextColor: '#ffffff',
        quantityBorderColor: '#111111',
        quantityFont: '',
        reverseButtonBackgroundColor: '#111111',
        reverseButtonIconColor: '#ffffff',
        reverseButtonBorderColor: '#111111',
        closeButtonBackgroundColor: '#111111',
        closeButtonIconColor: '#ffffff',
        closeButtonBorderColor: '#111111',
        tooltip: '',
        closeTooltip: 'Close',
        reverseTooltip: 'Reverse',
        protectTooltipText: 'Protect',
        partialEnabled: false,
        reversible: false,
        closeable: false,
        brackets: null,
        positionData: null,
        callbacks: {},
      },
    ]);
    core.paint(0xff);

    const manager = (core as unknown as { priceLineManager: PriceLineManagerProbe }).priceLineManager;
    const bound = manager.cachedLineGroups.get('position-1')?.getAttr('boundData') as {
      chartLabel?: {
        segments: Array<{ text: string; backgroundColor: string; borderColor: string; textColor: string }>;
        buttons?: Array<{ type: string; backgroundColor: string; borderColor: string; iconColor: string }>;
      };
    };
    expect(bound.chartLabel?.segments.find((segment) => segment.text === '-$12.50')).toMatchObject({
      backgroundColor: 'rgba(62, 136, 221, 1)',
      // Same outline as the rest of the pill, so its top and bottom edge join up.
      borderColor: '#2196F3',
      textColor: '#ee3355',
    });
    expect(bound.chartLabel?.segments.find((segment) => segment.text === 'Long')).toMatchObject({
      backgroundColor: '#2196F3',
      borderColor: '#2196F3',
    });
    expect(bound.chartLabel?.segments.find((segment) => segment.text === '1 BTC')).toMatchObject({
      backgroundColor: '#2196F3',
      borderColor: '#2196F3',
    });
    expect(bound.chartLabel?.buttons?.find((button) => button.type === 'close')).toMatchObject({
      backgroundColor: '#2196F3',
      borderColor: '#2196F3',
      iconColor: '#ffffff',
    });
    expect(bound.chartLabel?.buttons?.find((button) => button.type === 'reverse')).toMatchObject({
      backgroundColor: '#2196F3',
      borderColor: '#2196F3',
      iconColor: '#ffffff',
    });
    // Each bracket chip is outlined in its own ink rather than a shared hairline.
    expect(bound.chartLabel?.buttons?.find((button) => button.type === 'tp')).toMatchObject({
      backgroundColor: 'rgba(28, 153, 226, 1)',
      borderColor: '#00aa77',
      iconColor: '#00aa77',
    });
    expect(bound.chartLabel?.buttons?.find((button) => button.type === 'sl')).toMatchObject({
      backgroundColor: 'rgba(72, 144, 203, 1)',
      borderColor: '#f97316',
      iconColor: '#f97316',
    });
    expect(bound.chartLabel?.buttons?.map((button) => button.type)).toEqual(['reverse', 'close', 'tp', 'sl']);
    const refs = manager.cachedLineGroups.get('position-1')?.getAttr('contentRefs') as LineContentRefsProbe;
    expect(refs.segmentRects?.[0]?.fill()).toBe('#2196F3');
    expect(refs.segmentRects?.[1]?.fill()).toBe('#2196F3');
    expect(refs.segmentRects?.[2]?.fill()).toBe('rgba(62, 136, 221, 1)');
    // The side color arrives as a rail on the leading segment, not as a fill.
    expect(refs.segmentAccents?.[0]?.fill()).toBe('#2196F3');
    expect(refs.segmentAccents?.[1]).toBeUndefined();
    expect(refs.buttonRects?.[0]?.fill()).toBe('#2196F3');
    expect(refs.segmentRects?.[2]?.cornerRadius()).toEqual(0);
    expect(refs.buttonRects?.[0]?.cornerRadius()).toEqual(0);
    expect(refs.buttonRects?.[1]?.cornerRadius()).toEqual([0, 2, 2, 0]);
    expect(refs.buttonRects?.[2]?.cornerRadius()).toEqual([2, 0, 0, 2]);
    expect(refs.segmentRects?.[0]?.x()).toBeGreaterThanOrEqual(60);

    const positiveBound = manager.cachedLineGroups.get('position-2')?.getAttr('boundData') as {
      chartLabel?: {
        segments: Array<{ text: string; backgroundColor: string; borderColor: string; textColor: string }>;
      };
    };
    expect(positiveBound.chartLabel?.segments.find((segment) => segment.text === 'Short')).toMatchObject({
      backgroundColor: '#111111',
      borderColor: '#111111',
    });
    expect(positiveBound.chartLabel?.segments.find((segment) => segment.text === '$12.50')).toMatchObject({
      backgroundColor: 'rgba(15, 38, 31, 1)',
      borderColor: '#111111',
      textColor: '#00aa77',
    });
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
        color: '#26a69a',
        label: {
          primaryText: '50000',
          secondaryText: 'TP',
          backgroundColor: '#26a69a',
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
        color: '#26a69a',
        label: {
          primaryText: '50000',
          secondaryText: 'TP',
          backgroundColor: '#26a69a',
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
        lineLengthUnit: 'percentage',
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
        bodyFont: '',
        quantityBackgroundColor: '#111111',
        quantityTextColor: '#ffffff',
        quantityBorderColor: '#ff0000',
        quantityFont: '',
        closeButtonBackgroundColor: '#111111',
        closeButtonIconColor: '#ffffff',
        closeButtonBorderColor: '#ff0000',
        tooltip: '',
        closeTooltip: 'Close',
        reverseTooltip: 'Reverse',
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
    const initialBound = manager.cachedLineGroups.get('position-1')?.getAttr('boundData') as {
      partialEnabled?: boolean;
    };
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
        lineLengthUnit: 'percentage',
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
        bodyFont: '',
        quantityBackgroundColor: '#111111',
        quantityTextColor: '#ffffff',
        quantityBorderColor: '#ff0000',
        quantityFont: '',
        closeButtonBackgroundColor: '#111111',
        closeButtonIconColor: '#ffffff',
        closeButtonBorderColor: '#ff0000',
        tooltip: '',
        closeTooltip: 'Close',
        reverseTooltip: 'Reverse',
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
        lineLengthUnit: 'percentage',
        extendLeft: true,
        lineWidth: 1,
        editable: true,
        cancellable: true,
        cancelAsSubmit: false,
        partialEnabled: false,
        brackets: null,
        text: 'Limit',
        textShort: 'Lmt',
        quantity: '1',
        quantityShort: '1',
        bodyBackgroundColor: '#111111',
        bodyTextColor: '#ffffff',
        bodyBorderColor: '#ff0000',
        bodyFont: '',
        quantityBackgroundColor: '#111111',
        quantityTextColor: '#ffffff',
        quantityBorderColor: '#ff0000',
        quantityFont: '',
        cancelButtonBackgroundColor: '#111111',
        cancelButtonIconColor: '#ffffff',
        cancelButtonBorderColor: '#ff0000',
        tooltip: '',
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
    expect(refs.segmentRects?.[0]?.fill()).toBe('#111111');
    expect(refs.segmentRects?.[1]?.fill()).toBe('#111111');
    expect(refs.buttonRects?.[0]?.fill()).toBe('#111111');
    expect(refs.segmentRects?.[0]?.x()).toBeGreaterThanOrEqual(60);
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
        lineLengthUnit: 'percentage',
        extendLeft: true,
        lineWidth: 1,
        editable: true,
        cancellable: true,
        cancelAsSubmit: false,
        partialEnabled: false,
        brackets: null,
        text: 'Limit',
        textShort: 'Lmt',
        quantity: '1',
        quantityShort: '1',
        bodyBackgroundColor: '#111111',
        bodyTextColor: '#ffffff',
        bodyBorderColor: '#ff0000',
        bodyFont: '',
        quantityBackgroundColor: '#111111',
        quantityTextColor: '#ffffff',
        quantityBorderColor: '#ff0000',
        quantityFont: '',
        cancelButtonBackgroundColor: '#111111',
        cancelButtonIconColor: '#ffffff',
        cancelButtonBorderColor: '#ff0000',
        tooltip: '',
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
      | Konva.Rect[]
      | undefined;
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

  it('does not let crosshair overlay repaint override the active pan cursor', async () => {
    const { ChartCore } = await import('./ChartCore');
    const core = new ChartCore({
      container,
      width: 800,
      height: 600,
      onContextMenu: vi.fn(),
    });

    core.setBars(makeBars(5));
    core.paint(DIRTY.FULL);

    const chartContainer = container.firstElementChild as HTMLElement;
    const eventManager = eventManagerInstances[0];

    eventManager.callbacks.onCrossHairMoved?.(729, 120);
    eventManager.callbacks.onCrosshairRender?.();
    expect(chartContainer.style.cursor).toBe('pointer');

    eventManager.isDragging = true;
    eventManager.activeCursor = 'grabbing';
    eventManager.callbacks.onCursorChange?.('grabbing');
    eventManager.callbacks.onCrossHairMoved?.(729, 140);
    eventManager.callbacks.onCrosshairRender?.();
    expect(chartContainer.style.cursor).toBe('grabbing');

    eventManager.isDragging = false;
    eventManager.activeCursor = null;
    eventManager.callbacks.onCursorChange?.('crosshair');
    expect(chartContainer.style.cursor).toBe('crosshair');
    core.dispose();
  });

  it('does not let hover processing override the active price-axis cursor', async () => {
    const { ChartCore } = await import('./ChartCore');
    const core = new ChartCore({
      container,
      width: 800,
      height: 600,
      onContextMenu: vi.fn(),
    });

    core.setBars(makeBars(5));
    core.paint(DIRTY.FULL);

    const chartContainer = container.firstElementChild as HTMLElement;
    const eventManager = eventManagerInstances[0];

    eventManager.isDragging = true;
    eventManager.activeCursor = 'ns-resize';
    eventManager.callbacks.onCursorChange?.('ns-resize');
    expect(chartContainer.style.cursor).toBe('ns-resize');

    eventManager.callbacks.onCrossHairMoved?.(729, 120);
    eventManager.callbacks.onCrosshairRender?.();
    eventManager.callbacks.onCursorChange?.('pointer');
    expect(chartContainer.style.cursor).toBe('ns-resize');

    eventManager.callbacks.onCursorChange?.('crosshair');
    expect(chartContainer.style.cursor).toBe('ns-resize');

    eventManager.isDragging = false;
    eventManager.activeCursor = null;
    eventManager.callbacks.onCursorChange?.('crosshair');
    expect(chartContainer.style.cursor).toBe('crosshair');
    core.dispose();
  });

  it('keeps the pointer cursor while EventManager hover processing runs over draggable order lines', async () => {
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
        lineLengthUnit: 'percentage',
        extendLeft: true,
        lineWidth: 1,
        editable: true,
        cancellable: true,
        cancelAsSubmit: false,
        partialEnabled: false,
        brackets: null,
        text: 'Limit',
        textShort: 'Lmt',
        quantity: '1',
        quantityShort: '1',
        bodyBackgroundColor: '#111111',
        bodyTextColor: '#ffffff',
        bodyBorderColor: '#ff0000',
        bodyFont: '',
        quantityBackgroundColor: '#111111',
        quantityTextColor: '#ffffff',
        quantityBorderColor: '#ff0000',
        quantityFont: '',
        cancelButtonBackgroundColor: '#111111',
        cancelButtonIconColor: '#ffffff',
        cancelButtonBorderColor: '#ff0000',
        tooltip: '',
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
      | Konva.Rect[]
      | undefined;
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
    expect(chartContainer.style.cursor).toBe('pointer');

    eventManagerInstances[0]?.callbacks.onCursorChange?.('pointer');
    expect(chartContainer.style.cursor).toBe('pointer');

    core.dispose();
  });

  // The + button has to be both: interactive, so pressing it cannot start a pan,
  // and reported as crosshair chrome, so it cannot stand the crosshair down. It
  // is drawn on the crosshair line at the cursor's own y, so the pointer is
  // inside it whenever it is in that strip - and suppressing the crosshair hid
  // it, which cleared these bounds, which brought both back next move.
  it('reports the + button as interactive and as crosshair chrome', async () => {
    const core = await createChartCore();
    const probe = eventManagerInstances[eventManagerInstances.length - 1];

    // Stand in for a drawn + button, centred on the pointer as it always is.
    const bounds = { x: 700, y: 300, r: 9 };
    (core as unknown as { _plusButtonBounds: typeof bounds })._plusButtonBounds = bounds;

    expect(probe?.callbacks.isOverInteractiveElement?.(bounds.x, bounds.y)).toBe(true);
    expect(probe?.callbacks.isOverCrosshairChrome?.(bounds.x, bounds.y)).toBe(true);
    expect(probe?.callbacks.isOverCrosshairChrome?.(bounds.x + 40, bounds.y)).toBe(false);

    core.dispose();
  });
});

describe('ChartCore action state provenance', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // An action describes what the venue is expected to report back, so it has to
  // be built from the raw line. Built from the action-applied one, a second
  // gesture inherits the first's unconfirmed guess as a field it must also see
  // echoed - and could never confirm either.
  it('builds a new action from the raw line, not from an unconfirmed one', async () => {
    const { ChartCore } = await import('./ChartCore');
    const core = new ChartCore({ container, width: 800, height: 600 });
    const onSLMoveEnd = vi.fn(() => Promise.resolve());
    const onTPMoveEnd = vi.fn(() => Promise.resolve());

    core.setBars(makeBars(5));
    core.setPositionLines([makePositionLine({ brackets: {}, callbacks: { onSLMoveEnd, onTPMoveEnd } })]);

    const bound = {
      lineId: 'position-1',
      positionId: 'position-1',
      type: 'position',
      price: 50010,
      originalY: 0,
      adjustedY: 0,
      width: 0,
      height: 0,
      color: '#2196F3',
      label: { primaryText: '50,010' },
      lineStyle: 'solid',
      callbacks: { onSLMoveEnd, onTPMoveEnd },
    } as PriceLineLabelBounds;
    const privateCore = core as unknown as {
      handleBracketMoveEnd(type: 'tp' | 'sl', bound: PriceLineLabelBounds, price: number): void;
      oemsActions: { getAction(type: string, id: string): { optimisticState: Record<string, unknown> } | null };
    };

    privateCore.handleBracketMoveEnd('sl', bound, 49900);
    await Promise.resolve();
    await Promise.resolve();
    privateCore.handleBracketMoveEnd('tp', bound, 50500);

    const optimisticState = privateCore.oemsActions.getAction('position', 'position-1')?.optimisticState;
    expect(optimisticState?.takeProfit).toBe(50500);
    expect(optimisticState?.stopLoss).toBeUndefined();

    core.dispose();
  });
});

describe('ChartCore host-rendered context menu', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // The "+" is where a host asks for its own widget. Right-click and long-press
  // reach the same handler and have not been given away.
  it('renders the host element for the + button and the item list everywhere else', async () => {
    const { ChartCore } = await import('./ChartCore');
    const itemClick = vi.fn();
    const onContextMenu = vi.fn(() => [{ position: 'top' as const, text: 'Fallback action', click: itemClick }]);
    const renderContextMenu = vi.fn(() => {
      const el = document.createElement('div');
      el.textContent = 'Quick order';
      return el;
    });
    const core = new ChartCore({ container, width: 800, height: 600, onContextMenu, renderContextMenu });
    core.setViewport({ startTime: 0, endTime: 100, priceMin: 0, priceMax: 100 });

    const testCore = core as unknown as {
      handleContextMenu(x: number, y: number, price: number, time: number, placement?: string): void;
    };

    testCore.handleContextMenu(100, 100, 10, 20, 'crosshairButton');

    expect(renderContextMenu).toHaveBeenCalledWith(
      expect.objectContaining({ anchorX: 100, anchorY: 100, price: 10, unixTime: 20 }),
    );
    expect(onContextMenu).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Quick order');

    testCore.handleContextMenu(120, 120, 11, 21);

    expect(onContextMenu).toHaveBeenCalledWith(21, 11);
    expect(document.body.textContent).toContain('Fallback action');
    expect(document.body.textContent).not.toContain('Quick order');

    core.dispose();
  });

  // Without it the host has no idea its content left the screen, and keeps it
  // mounted - subscriptions and all - against a node nobody can see.
  it('tells the host when anything else dismisses what it rendered', async () => {
    const { ChartCore } = await import('./ChartCore');
    const onContextMenuClose = vi.fn();
    const core = new ChartCore({
      container,
      width: 800,
      height: 600,
      onContextMenuClose,
      renderContextMenu: () => {
        const el = document.createElement('div');
        el.textContent = 'Quick order';
        return el;
      },
    });
    core.setViewport({ startTime: 0, endTime: 100, priceMin: 0, priceMax: 100 });

    const testCore = core as unknown as {
      handleContextMenu(x: number, y: number, price: number, time: number, placement?: string): void;
      closeContextMenu(): void;
    };
    testCore.handleContextMenu(100, 100, 10, 20, 'crosshairButton');

    expect(onContextMenuClose).not.toHaveBeenCalled();

    testCore.closeContextMenu();

    expect(onContextMenuClose).toHaveBeenCalledTimes(1);

    // Only for content it was actually showing.
    testCore.closeContextMenu();

    expect(onContextMenuClose).toHaveBeenCalledTimes(1);

    core.dispose();
  });

  it('falls back to the item list when the host declines to render', async () => {
    const { ChartCore } = await import('./ChartCore');
    const onContextMenu = vi.fn(() => [{ position: 'top' as const, text: 'Fallback action', click: vi.fn() }]);
    const core = new ChartCore({
      container,
      width: 800,
      height: 600,
      onContextMenu,
      renderContextMenu: () => null,
    });
    core.setViewport({ startTime: 0, endTime: 100, priceMin: 0, priceMax: 100 });

    (
      core as unknown as {
        handleContextMenu(x: number, y: number, price: number, time: number, placement?: string): void;
      }
    ).handleContextMenu(100, 100, 10, 20, 'crosshairButton');

    expect(onContextMenu).toHaveBeenCalledWith(20, 10);
    expect(document.body.textContent).toContain('Fallback action');

    core.dispose();
  });

  it('closes what it rendered when the host asks it to', async () => {
    const { ChartCore } = await import('./ChartCore');
    const closeRef: { current: (() => void) | null } = { current: null };
    const core = new ChartCore({
      container,
      width: 800,
      height: 600,
      renderContextMenu: (context) => {
        closeRef.current = context.close;
        const el = document.createElement('div');
        el.textContent = 'Quick order';
        return el;
      },
    });
    core.setViewport({ startTime: 0, endTime: 100, priceMin: 0, priceMax: 100 });

    (
      core as unknown as {
        handleContextMenu(x: number, y: number, price: number, time: number, placement?: string): void;
      }
    ).handleContextMenu(100, 100, 10, 20, 'crosshairButton');

    expect(document.body.textContent).toContain('Quick order');

    closeRef.current?.();

    expect(document.body.textContent).not.toContain('Quick order');

    core.dispose();
  });
});
