import type {
  Bar,
  DatafeedConfiguration,
  IBasicDataFeed,
  LibrarySymbolInfo,
  PeriodParams,
  ResolutionString,
  TealchartWidgetOptions,
} from './types';
import type { UserDrawingState } from './drawings';
import type { DrawingOutput, PlotOutput } from '@tealstreet/tealscript';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DIRTY } from './rendering/RenderScheduler';
import { clearChartStoreCache } from './state/chartState';
import { TealchartWidget } from './TealchartWidget';

// Track calls at module level (survives mockReset)
const setSymbolCalls: { symbol: string; exchangeName?: string }[] = [];
const setBarsCalls: Bar[][] = [];
const setPlotsCalls: PlotOutput[][] = [];
const setDrawingsCalls: DrawingOutput[][] = [];
const setUserDrawingStateCalls: UserDrawingState[] = [];
const setRenderOptionsCalls: Array<unknown> = [];
const setExecutionLinesCalls: Array<unknown> = [];

// Use plain classes for mocks so mockReset doesn't strip implementations
vi.mock('./ui/TealchartWidgetUI', () => ({
  TealchartWidgetUI: class {
    setBars(bars: Bar[]) {
      setBarsCalls.push([...bars]);
    }
    setPlots(plots: PlotOutput[]) {
      setPlotsCalls.push([...plots]);
    }
    setDrawings(drawings: DrawingOutput[]) {
      setDrawingsCalls.push([...drawings]);
    }
    setUserDrawingState(state: UserDrawingState) {
      setUserDrawingStateCalls.push(state);
    }
    setLoading() {}
    setOrderLines() {}
    setPositionLines() {}
    setExecutionLines(lines: unknown) {
      setExecutionLinesCalls.push(lines);
    }
    setPriceLines() {}
    setPaneLayout() {}
    setPaneYRanges() {}
    setActiveIndicators() {}
    setViewport() {}
    setCanvasOpacity() {}
    updateBar() {}
    setRenderOptions(options: unknown) {
      setRenderOptionsCalls.push(options);
    }
    setSymbol(symbol: string, exchangeName?: string) {
      setSymbolCalls.push({ symbol, exchangeName });
    }
    setInterval() {}
    setSupportedResolutions() {}
    resize() {}
    dispose() {}
    openIndicatorSettings() {}
    paint() {}
  },
}));

vi.mock('./GapDetectionManager', () => ({
  GapDetectionManager: class {
    setInterval() {}
    recordBar() {}
    start() {}
    stop() {}
    dispose() {}
    setLogger() {}
    setOnErrorStateChange() {}
    checkBarGap() {
      return null;
    }
    resetRetryState() {}
  },
}));

vi.mock('./debug/TealchartLogger', () => ({
  LogCategory: { Widget: 'Widget' },
  TealchartLogger: class {
    info() {}
    warn() {}
    error() {}
    debug() {}
  },
}));

// ============================================================================
// Test Helpers
// ============================================================================

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

interface MockDatafeed extends IBasicDataFeed {
  _onReadyCb: ((config: DatafeedConfiguration) => void) | null;
  _resolveSymbolCb: ((info: LibrarySymbolInfo) => void) | null;
  _resolveSymbolErrCb: ((err: string) => void) | null;
  _getBarsCb: ((bars: Bar[], meta: { noData?: boolean }) => void) | null;
  _getBarsErrCb: ((err: string) => void) | null;
  _subscribeCb: ((bar: Bar) => void) | null;
  _subscribeGuid: string | null;
  _resolveSymbolCalls: string[];
  _getBarsCalls: { symbolInfo: LibrarySymbolInfo; resolution: string }[];
  _unsubscribeCalls: string[];
}

function createMockDatafeed(): MockDatafeed {
  const datafeed: MockDatafeed = {
    _onReadyCb: null,
    _resolveSymbolCb: null,
    _resolveSymbolErrCb: null,
    _getBarsCb: null,
    _getBarsErrCb: null,
    _subscribeCb: null,
    _subscribeGuid: null,
    _resolveSymbolCalls: [],
    _getBarsCalls: [],
    _unsubscribeCalls: [],

    onReady(cb: (config: DatafeedConfiguration) => void) {
      datafeed._onReadyCb = cb;
      // Auto-trigger onReady synchronously for testing
      cb({ supported_resolutions: ['1', '5', '15', '60'] as ResolutionString[] });
    },
    resolveSymbol(symbol: string, onResolve: (info: LibrarySymbolInfo) => void, onError: (reason: string) => void) {
      datafeed._resolveSymbolCalls.push(symbol);
      datafeed._resolveSymbolCb = onResolve;
      datafeed._resolveSymbolErrCb = onError;
    },
    getBars(
      symbolInfo: LibrarySymbolInfo,
      resolution: ResolutionString,
      periodParams: PeriodParams,
      onResult: (bars: Bar[], meta: { noData?: boolean }) => void,
      onError: (reason: string) => void,
    ) {
      datafeed._getBarsCalls.push({ symbolInfo, resolution });
      datafeed._getBarsCb = onResult;
      datafeed._getBarsErrCb = onError;
    },
    subscribeBars(
      symbolInfo: LibrarySymbolInfo,
      resolution: ResolutionString,
      onTick: (bar: Bar) => void,
      listenerGuid: string,
      onResetCacheNeeded: () => void,
    ) {
      datafeed._subscribeCb = onTick;
      datafeed._subscribeGuid = listenerGuid;
    },
    unsubscribeBars(guid) {
      datafeed._unsubscribeCalls.push(guid);
    },
  };
  return datafeed;
}

const defaultSymbolInfo: LibrarySymbolInfo = {
  name: 'BTCUSDT',
  full_name: 'BTCUSDT',
  description: 'Bitcoin/USDT',
  type: 'crypto',
  session: '24x7',
  exchange: 'Test',
  pricescale: 100,
  minmov: 1,
  has_intraday: true,
};

function createWidget(datafeed: MockDatafeed, overrides: Partial<TealchartWidgetOptions> = {}): TealchartWidget {
  const container = document.createElement('div');
  return new TealchartWidget(container, {
    container,
    symbol: 'BTCUSDT',
    interval: '60' as ResolutionString,
    datafeed,
    gapDetection: { enabled: false },
    disableDebugOverlay: true,
    ...overrides,
  });
}

/**
 * Helper: complete the init flow (onReady → resolveSymbol → getBars)
 */
function completeInit(datafeed: MockDatafeed, bars?: Bar[], symbolInfo?: LibrarySymbolInfo): void {
  // onReady is auto-called; resolve symbol
  datafeed._resolveSymbolCb?.(symbolInfo ?? defaultSymbolInfo);
  // Then getBars
  datafeed._getBarsCb?.(bars ?? makeBars(10), {});
}

describe('TealchartWidget', () => {
  beforeEach(() => {
    setSymbolCalls.length = 0;
    setBarsCalls.length = 0;
    setPlotsCalls.length = 0;
    setDrawingsCalls.length = 0;
    setUserDrawingStateCalls.length = 0;
    setRenderOptionsCalls.length = 0;
    setExecutionLinesCalls.length = 0;
    // Return null so _renderRafId doesn't get stuck at 0 after
    // the callback synchronously sets it to null (assignment order issue).
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return null;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    // Chart stores are cached for the process lifetime; clear between tests so
    // per-chartKey interval persistence doesn't leak across tests.
    clearChartStoreCache();
  });

  // ============================================================================
  // TealScript Rendering
  // ============================================================================
  describe('tealscript rendering', () => {
    it('pushes drawing-only dirty updates without resetting plots', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      completeInit(datafeed);
      setPlotsCalls.length = 0;
      setDrawingsCalls.length = 0;

      const drawing: DrawingOutput = {
        id: 'label_1',
        type: 'label',
        barIndex: 1,
        x: 1,
        y: 100,
        text: 'L',
        xloc: 'bar_index',
        yloc: 'price',
        style: 'label.style_label_down',
        color: '#000000',
        textColor: '#ffffff',
        size: 'normal',
      };
      const testWidget = widget as unknown as {
        _drawings: DrawingOutput[];
        _render(dirty: number): void;
      };

      testWidget._drawings = [drawing];
      testWidget._render(DIRTY.DRAWINGS);

      expect(setPlotsCalls).toHaveLength(0);
      expect(setDrawingsCalls).toEqual([[drawing]]);
    });
  });

  // ============================================================================
  // User Drawing State
  // ============================================================================
  describe('user drawing state', () => {
    it('exposes default user drawing state and pushes explicit updates', () => {
      const datafeed = createMockDatafeed();
      const onChange = vi.fn();
      const widget = createWidget(datafeed, { onUserDrawingStateChange: onChange });
      completeInit(datafeed);

      const initial = widget.getUserDrawingState();
      expect(initial).toMatchObject({
        version: 1,
        activeTool: 'select',
        drawings: [],
        selection: null,
        draft: null,
      });

      const nextState: UserDrawingState = {
        ...initial,
        activeTool: 'trendLine',
      };
      widget.setUserDrawingState(nextState);
      expect(widget.getUserDrawingState()).toBe(nextState);
      expect(onChange).toHaveBeenCalledWith(nextState);

      const testWidget = widget as unknown as { _render(dirty: number): void };
      testWidget._render(DIRTY.USER_DRAWINGS);
      expect(setUserDrawingStateCalls.at(-1)).toBe(nextState);
    });
  });

  // ============================================================================
  // Symbol Switching
  // ============================================================================
  describe('symbol switching', () => {
    it('initial load calls resolveSymbol with correct symbol', () => {
      const datafeed = createMockDatafeed();
      createWidget(datafeed);
      expect(datafeed._resolveSymbolCalls).toContain('BTCUSDT');
    });

    it('initial load calls getBars after resolveSymbol', () => {
      const datafeed = createMockDatafeed();
      createWidget(datafeed);
      datafeed._resolveSymbolCb?.(defaultSymbolInfo);
      expect(datafeed._getBarsCalls).toHaveLength(1);
    });

    it('setSymbol triggers resolveSymbol for new symbol', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      completeInit(datafeed);

      widget.setSymbol('ETHUSDT');
      expect(datafeed._resolveSymbolCalls).toContain('ETHUSDT');
    });

    it('setSymbol triggers unsubscribeBars for old symbol', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      completeInit(datafeed);

      const oldGuid = datafeed._subscribeGuid;
      widget.setSymbol('ETHUSDT');
      expect(datafeed._unsubscribeCalls).toContain(oldGuid!);
    });

    it('widget.symbol() reflects the change after setSymbol', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      completeInit(datafeed);

      widget.setSymbol('ETHUSDT');
      expect(widget.symbol()).toBe('ETHUSDT');
    });

    it('setSymbol updates the UI top bar and legend via setSymbol()', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      completeInit(datafeed);

      widget.setSymbol('ETHUSDT');
      // Resolve new symbol and provide bars to trigger render
      datafeed._resolveSymbolCb?.({
        ...defaultSymbolInfo,
        name: 'ETHUSDT',
        pricescale: 100,
      });
      datafeed._getBarsCb?.(makeBars(10, 2000000, 60000, 2000), {});

      // _doRender should have called _ui.setSymbol('ETHUSDT')
      expect(setSymbolCalls.some((c) => c.symbol === 'ETHUSDT')).toBe(true);
    });

    it('same symbol is a no-op', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      completeInit(datafeed);

      const callsBefore = datafeed._resolveSymbolCalls.length;
      widget.setSymbol('BTCUSDT');
      // Should not trigger another resolve
      expect(datafeed._resolveSymbolCalls.length).toBe(callsBefore);
    });

    it('rapid symbol switching: only last symbol applied (stale request check)', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      completeInit(datafeed);

      // Rapidly switch A → B → C
      widget.setSymbol('ETHUSDT');
      const ethResolveCb = datafeed._resolveSymbolCb;

      widget.setSymbol('SOLUSDT');
      const solResolveCb = datafeed._resolveSymbolCb;

      // Resolve ETH first (stale)
      ethResolveCb?.({
        ...defaultSymbolInfo,
        name: 'ETHUSDT',
      });
      const ethGetBarsCb = datafeed._getBarsCb;

      // Resolve SOL (current)
      solResolveCb?.({
        ...defaultSymbolInfo,
        name: 'SOLUSDT',
      });
      const solGetBarsCb = datafeed._getBarsCb;

      // Return bars for ETH (stale) — should be ignored due to requestId check
      ethGetBarsCb?.(makeBars(5, 1000000, 60000, 3000), {});

      // Return bars for SOL (current)
      solGetBarsCb?.(makeBars(5, 2000000, 60000, 100), {});

      // Widget should reflect SOL, not ETH
      expect(widget.symbol()).toBe('SOLUSDT');
    });
  });

  describe('execution markers', () => {
    it('pushes execution shape render data through the widget line render path', async () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      completeInit(datafeed);

      const shape = await widget.chart().createExecutionShape();
      shape.setPrice(50123.45).setTime(1710000000).setDirection('sell').setText('0.25').setArrowColor('#ff9500');

      await Promise.resolve();

      const lastCall = setExecutionLinesCalls[setExecutionLinesCalls.length - 1] as Array<any>;
      expect(lastCall).toHaveLength(1);
      expect(lastCall[0]).toMatchObject({
        price: 50123.45,
        time: 1710000000,
        direction: 'sell',
        text: '0.25',
        arrowColor: '#ff9500',
      });
    });
  });

  describe('real-time updates', () => {
    it('does not reapply render options on last-bar ticks', () => {
      const datafeed = createMockDatafeed();
      createWidget(datafeed);
      completeInit(datafeed);

      setRenderOptionsCalls.length = 0;

      const lastBarTick: Bar = {
        time: 1_000_000 + 9 * 60_000,
        open: 50_090,
        high: 50_180,
        low: 50_040,
        close: 50_155,
        volume: 999,
      };

      datafeed._subscribeCb?.(lastBarTick);

      expect(setRenderOptionsCalls).toHaveLength(0);
    });
  });

  // ============================================================================
  // Interval Switching
  // ============================================================================
  describe('interval switching', () => {
    it('setResolution triggers unsubscribeBars', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      completeInit(datafeed);

      const oldGuid = datafeed._subscribeGuid;
      widget.chart().setResolution('15' as ResolutionString);
      expect(datafeed._unsubscribeCalls).toContain(oldGuid!);
    });

    it('setResolution triggers getBars with new interval', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      completeInit(datafeed);

      widget.chart().setResolution('15' as ResolutionString);
      // Should resolve new bars
      datafeed._resolveSymbolCb?.(defaultSymbolInfo);
      const lastGetBars = datafeed._getBarsCalls[datafeed._getBarsCalls.length - 1];
      expect(lastGetBars.resolution).toBe('15');
    });

    it('widget.resolution() reflects the new interval', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      completeInit(datafeed);

      widget.chart().setResolution('5' as ResolutionString);
      expect(widget.resolution()).toBe('5');
    });

    it('same interval is a no-op', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      completeInit(datafeed);

      const unsubCountBefore = datafeed._unsubscribeCalls.length;
      widget.chart().setResolution('60' as ResolutionString);
      expect(datafeed._unsubscribeCalls.length).toBe(unsubCountBefore);
    });

    it('rapid interval switching: only final interval data applied', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      completeInit(datafeed);

      widget.chart().setResolution('5' as ResolutionString);
      widget.chart().setResolution('15' as ResolutionString);

      // The widget should be at interval '15'
      expect(widget.resolution()).toBe('15');
    });
  });

  // ============================================================================
  // Multi-Widget Independence
  // ============================================================================
  describe('multi-widget independence', () => {
    it('two widgets with different symbols get own resolveSymbol calls', () => {
      const df1 = createMockDatafeed();
      const df2 = createMockDatafeed();
      createWidget(df1, { symbol: 'BTCUSDT' });
      createWidget(df2, { symbol: 'ETHUSDT', chartKey: 'chart2' });

      expect(df1._resolveSymbolCalls).toContain('BTCUSDT');
      expect(df2._resolveSymbolCalls).toContain('ETHUSDT');
    });

    it('changing symbol on widget A does not affect widget B', () => {
      const dfA = createMockDatafeed();
      const dfB = createMockDatafeed();
      const widgetA = createWidget(dfA, { symbol: 'BTCUSDT', chartKey: 'chartA' });
      const widgetB = createWidget(dfB, { symbol: 'ETHUSDT', chartKey: 'chartB' });
      completeInit(dfA);
      completeInit(dfB);

      widgetA.setSymbol('SOLUSDT');
      expect(widgetB.symbol()).toBe('ETHUSDT');
    });

    it('each widget has independent subscription guid', () => {
      const dfA = createMockDatafeed();
      const dfB = createMockDatafeed();
      createWidget(dfA, { symbol: 'BTCUSDT', chartKey: 'chartA' });
      createWidget(dfB, { symbol: 'ETHUSDT', chartKey: 'chartB' });
      completeInit(dfA);
      completeInit(dfB);

      expect(dfA._subscribeGuid).not.toBe(dfB._subscribeGuid);
    });

    it('disposing widget A does not affect widget B', () => {
      const dfA = createMockDatafeed();
      const dfB = createMockDatafeed();
      const widgetA = createWidget(dfA, { symbol: 'BTCUSDT', chartKey: 'chartA' });
      const widgetB = createWidget(dfB, { symbol: 'ETHUSDT', chartKey: 'chartB' });
      completeInit(dfA);
      completeInit(dfB);

      widgetA.remove();
      // Widget B should still function
      expect(widgetB.symbol()).toBe('ETHUSDT');
      expect(widgetB.resolution()).toBe('60');
    });

    it('changing interval on widget A does not affect widget B', () => {
      const dfA = createMockDatafeed();
      const dfB = createMockDatafeed();
      const widgetA = createWidget(dfA, { symbol: 'BTCUSDT', chartKey: 'indepA' });
      const widgetB = createWidget(dfB, { symbol: 'ETHUSDT', chartKey: 'indepB' });
      completeInit(dfA);
      completeInit(dfB);

      // Change interval on widget A
      widgetA.chart().setResolution('5' as ResolutionString);

      // Widget B should still be on '60'
      expect(widgetB.resolution()).toBe('60');

      // Widget A should be on '5'
      expect(widgetA.resolution()).toBe('5');
    });

    it('onIntervalChanged subscription on widget A does not fire on widget B', () => {
      const dfA = createMockDatafeed();
      const dfB = createMockDatafeed();
      const widgetA = createWidget(dfA, { symbol: 'BTCUSDT', chartKey: 'subA' });
      const widgetB = createWidget(dfB, { symbol: 'ETHUSDT', chartKey: 'subB' });
      completeInit(dfA);
      completeInit(dfB);

      const intervalChangesB: string[] = [];
      widgetB
        .chart()
        .onIntervalChanged()
        .subscribe(null, (interval) => {
          intervalChangesB.push(interval);
        });

      // Change interval on widget A
      widgetA.chart().setResolution('15' as ResolutionString);

      // Widget B's subscription should NOT have fired
      expect(intervalChangesB).toEqual([]);
    });
  });

  // ============================================================================
  // Per-chart interval persistence
  // ============================================================================
  describe('per-chart interval persistence', () => {
    it('new widget without explicit interval uses persisted store value', () => {
      // First widget: set interval to 5m and persist to store
      const df1 = createMockDatafeed();
      const widget1 = createWidget(df1, { chartKey: 'persist-test', interval: '60' as ResolutionString });
      completeInit(df1);
      widget1.chart().setResolution('5' as ResolutionString);
      expect(widget1.resolution()).toBe('5');
      widget1.remove();

      // Second widget with SAME chartKey but NO explicit interval:
      // should pick up '5' from the persisted store
      const df2 = createMockDatafeed();
      const widget2 = createWidget(df2, { chartKey: 'persist-test', interval: undefined as any });
      expect(widget2.resolution()).toBe('5');
      widget2.remove();
    });

    it('explicit interval overrides persisted store value', () => {
      // First widget: set interval to 5m
      const df1 = createMockDatafeed();
      const widget1 = createWidget(df1, { chartKey: 'persist-override', interval: '60' as ResolutionString });
      completeInit(df1);
      widget1.chart().setResolution('5' as ResolutionString);
      widget1.remove();

      // Second widget with SAME chartKey but explicit interval '15':
      // should use '15', not the persisted '5'
      const df2 = createMockDatafeed();
      const widget2 = createWidget(df2, { chartKey: 'persist-override', interval: '15' as ResolutionString });
      expect(widget2.resolution()).toBe('15');
      widget2.remove();
    });
  });

  // ============================================================================
  // Viewport Reset Bug — see ChartCore.test.ts for the real regression tests.
  // The bug (viewport not recalculated after symbol switch) lives in ChartCore.setBars()
  // which is mocked out here. These tests verify the widget-level data flow only.
  // ============================================================================
  describe('symbol/interval switch data flow', () => {
    it('setSymbol updates symbol and triggers resolveSymbol + getBars', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      completeInit(datafeed, makeBars(10, 1000000, 60000, 50000));

      widget.setSymbol('ETHUSDT');
      expect(widget.symbol()).toBe('ETHUSDT');

      // Resolve new symbol
      datafeed._resolveSymbolCb?.({
        ...defaultSymbolInfo,
        name: 'ETHUSDT',
        pricescale: 100,
      });

      // getBars should have been called for the new symbol
      expect(datafeed._getBarsCalls.length).toBeGreaterThan(1);

      // Provide new bars
      const newBars = makeBars(10, 2000000, 60000, 2000);
      datafeed._getBarsCb?.(newBars, {});

      expect(widget.symbol()).toBe('ETHUSDT');
    });

    it('setResolution updates interval and reloads bars', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      completeInit(datafeed, makeBars(10));

      widget.chart().setResolution('5' as ResolutionString);

      expect(widget.resolution()).toBe('5');
    });
  });

  // ============================================================================
  // Lifecycle
  // ============================================================================
  describe('lifecycle', () => {
    it('onChartReady callback fires after init completes', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      const readyCb = vi.fn();
      widget.onChartReady(readyCb);
      completeInit(datafeed);
      expect(readyCb).toHaveBeenCalledOnce();
    });

    it('onChartReady callback fires immediately if already ready', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      completeInit(datafeed);
      const readyCb = vi.fn();
      widget.onChartReady(readyCb);
      expect(readyCb).toHaveBeenCalledOnce();
    });

    it('remove() cleans up subscriptions', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      completeInit(datafeed);

      const guid = datafeed._subscribeGuid;
      widget.remove();
      expect(datafeed._unsubscribeCalls).toContain(guid!);
    });
  });

  // ============================================================================
  // Chart API
  // ============================================================================
  describe('chart API', () => {
    it('chart() returns TealchartApi instance', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      expect(widget.chart()).toBeDefined();
      expect(widget.activeChart()).toBeDefined();
    });

    it('chartsCount() returns 1', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      expect(widget.chartsCount()).toBe(1);
    });

    it('activeChartIndex() returns 0', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      expect(widget.activeChartIndex()).toBe(0);
    });
  });

  // ============================================================================
  // Stale Request Guards
  // ============================================================================
  describe('stale request guards', () => {
    it('stale resolveSymbol (out-of-order) does not trigger loadBars', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      completeInit(datafeed);

      // Switch to ETH, capture resolve callback
      widget.setSymbol('ETHUSDT');
      const ethResolve = datafeed._resolveSymbolCb!;

      // Switch to SOL (overwrites _resolveSymbolCb)
      widget.setSymbol('SOLUSDT');
      const solResolve = datafeed._resolveSymbolCb!;

      // Resolve SOL first (current/correct)
      solResolve({ ...defaultSymbolInfo, name: 'SOLUSDT' });
      datafeed._getBarsCb?.(makeBars(5, 2000000, 60000, 100), {});

      const getBarsCountAfterSol = datafeed._getBarsCalls.length;

      // Now resolve stale ETH (arrived late from network)
      ethResolve({ ...defaultSymbolInfo, name: 'ETHUSDT' });

      // Stale resolve should NOT have triggered a new loadBars
      expect(datafeed._getBarsCalls.length).toBe(getBarsCountAfterSol);
      expect(widget.symbol()).toBe('SOLUSDT');
    });

    it('stale resolveSymbol after remove() does not crash', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);

      // Capture resolveSymbol callback before completing init
      const resolveCb = datafeed._resolveSymbolCb!;

      widget.remove();

      // Fire stale resolveSymbol — should not crash
      expect(() => {
        resolveCb(defaultSymbolInfo);
      }).not.toThrow();
    });

    it('stale getBars after remove() does not crash or apply data', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);

      // Resolve symbol but capture getBars callback before completing
      datafeed._resolveSymbolCb?.(defaultSymbolInfo);
      const getBarsCb = datafeed._getBarsCb!;

      widget.remove();

      // Fire stale getBars — should not crash
      expect(() => {
        getBarsCb(makeBars(10), {});
      }).not.toThrow();
    });

    it('loadMoreBars callback discarded after symbol switch', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      completeInit(datafeed, makeBars(10, 1000000, 60000, 50000));

      // Trigger loadMoreBars
      (widget as any)._loadMoreBars('left');
      const loadMoreCb = datafeed._getBarsCb!;

      // Switch symbol and complete new init
      widget.setSymbol('ETHUSDT');
      datafeed._resolveSymbolCb?.({ ...defaultSymbolInfo, name: 'ETHUSDT' });
      datafeed._getBarsCb?.(makeBars(10, 2000000, 60000, 2000), {});

      setBarsCalls.length = 0; // Clear setBars calls from symbol switch

      // Fire stale loadMore callback with old symbol's historical bars
      loadMoreCb(makeBars(5, 500000, 60000, 45000), {});

      // Stale loadMore should NOT have called setBars (no contamination)
      expect(setBarsCalls).toHaveLength(0);
    });

    it('loadMoreBars callback discarded after interval switch', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      completeInit(datafeed, makeBars(10, 1000000, 60000, 50000));

      // Trigger loadMoreBars
      (widget as any)._loadMoreBars('left');
      const loadMoreCb = datafeed._getBarsCb!;

      // Switch interval (now goes through resolveSymbol first)
      widget.chart().setResolution('5' as ResolutionString);
      datafeed._resolveSymbolCb?.(defaultSymbolInfo);
      datafeed._getBarsCb?.(makeBars(10, 1000000, 300000, 50000), {});

      setBarsCalls.length = 0;

      // Fire stale loadMore (from old interval)
      loadMoreCb(makeBars(5, 500000, 60000, 45000), {});

      // Should be discarded
      expect(setBarsCalls).toHaveLength(0);
    });

    it('remove() invalidates in-flight loadMoreBars', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      completeInit(datafeed, makeBars(10, 1000000, 60000, 50000));

      // Trigger loadMoreBars
      (widget as any)._loadMoreBars('left');
      const loadMoreCb = datafeed._getBarsCb!;

      widget.remove();

      // Fire stale loadMore — should not crash
      expect(() => {
        loadMoreCb(makeBars(5, 500000, 60000, 45000), {});
      }).not.toThrow();
    });

    it('stale real-time tick from old subscription discarded after symbol switch', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      completeInit(datafeed, makeBars(10, 1000000, 60000, 50000));

      // Capture the old subscription's tick callback
      const oldTickCb = datafeed._subscribeCb!;

      // Switch symbol
      widget.setSymbol('ETHUSDT');
      datafeed._resolveSymbolCb?.({ ...defaultSymbolInfo, name: 'ETHUSDT' });
      datafeed._getBarsCb?.(makeBars(10, 2000000, 60000, 2000), {});

      setBarsCalls.length = 0;

      // Fire stale tick from old symbol (DOGE-like price on BTC chart)
      oldTickCb({ time: 2000000 + 10 * 60000, open: 1.42, high: 1.43, low: 1.41, close: 1.42, volume: 100 });

      // The stale tick should NOT have been applied — no setBars call
      expect(setBarsCalls).toHaveLength(0);
    });
  });
});
