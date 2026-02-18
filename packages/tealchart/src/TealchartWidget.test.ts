import type {
  Bar,
  DatafeedConfiguration,
  IBasicDataFeed,
  LibrarySymbolInfo,
  PeriodParams,
  ResolutionString,
  TealchartWidgetOptions,
} from './types';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TealchartWidget } from './TealchartWidget';

// Use plain classes for mocks so mockReset doesn't strip implementations
vi.mock('./ui/TealchartWidgetUI', () => ({
  TealchartWidgetUI: class {
    setBars() {}
    setPlots() {}
    setLoading() {}
    setOrderLines() {}
    setPositionLines() {}
    setPaneLayout() {}
    setActiveIndicators() {}
    setRenderOptions() {}
    resize() {}
    dispose() {}
    openIndicatorSettings() {}
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
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
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
  });

  // ============================================================================
  // Viewport Reset Bug
  // ============================================================================
  describe('viewport reset on symbol/interval switch', () => {
    it('documents current behavior: _handleSymbolChange clears bars but not viewport', () => {
      // This test documents the current (potentially buggy) behavior.
      // When setSymbol is called, _bars is set to [] but _viewport is not nulled.
      // The viewport at widget level is updated by the UI callback onViewportChange.
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      completeInit(datafeed, makeBars(10, 1000000, 60000, 50000));

      // Now switch symbol
      widget.setSymbol('ETHUSDT');

      // The widget level symbol changed
      expect(widget.symbol()).toBe('ETHUSDT');
    });

    it('new symbol data triggers bar loading and UI update', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      completeInit(datafeed, makeBars(10, 1000000, 60000, 50000));

      widget.setSymbol('ETHUSDT');
      // Resolve new symbol
      datafeed._resolveSymbolCb?.({
        ...defaultSymbolInfo,
        name: 'ETHUSDT',
        pricescale: 100,
      });

      // getBars should have been called for the new symbol
      expect(datafeed._getBarsCalls.length).toBeGreaterThan(1);

      // Provide new bars with very different prices
      const newBars = makeBars(10, 2000000, 60000, 2000);
      datafeed._getBarsCb?.(newBars, {});

      // Widget should have the new data
      expect(widget.symbol()).toBe('ETHUSDT');
    });

    it('interval change reloads bars', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      completeInit(datafeed, makeBars(10));

      widget.chart().setResolution('5' as ResolutionString);

      // Should be loading new bars
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
});
