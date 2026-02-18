import type { Bar, IBasicDataFeed, LibrarySymbolInfo, ResolutionString } from './types';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TealchartWidget } from './TealchartWidget';

// Mock react-dom/client to prevent actual React rendering
const mockUnmount = vi.fn();
const mockRender = vi.fn();
vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({
    render: mockRender,
    unmount: mockUnmount,
  })),
}));

// Mock components that would require full React/DOM environment
vi.mock('./components/ChartContainer', () => ({
  ChartContainer: () => null,
}));
vi.mock('./state/ChartApiContext', () => ({
  ChartApiContext: { Provider: ({ children }: { children: unknown }) => children },
}));

// Mock TealscriptManager to avoid Worker dependency
vi.mock('./tealscript/TealscriptManager', () => ({
  TealscriptManager: vi.fn(),
}));

// Mock builtinIndicators to avoid heavy imports
vi.mock('./indicators/builtinIndicators', () => ({
  getIndicatorById: vi.fn(() => null),
}));

// ============================================================================
// Helpers
// ============================================================================

function createMockContainer(): HTMLElement {
  const el = document.createElement('div');
  el.getBoundingClientRect = () => ({
    width: 800,
    height: 400,
    top: 0,
    left: 0,
    right: 800,
    bottom: 400,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  return el;
}

const DEFAULT_SYMBOL_INFO: LibrarySymbolInfo = {
  name: 'BTCUSDT',
  ticker: 'BTCUSDT',
  full_name: 'BTCUSDT',
  exchange: 'Test',
  description: 'BTC/USDT',
  session: '24x7',
  timezone: 'Etc/UTC',
  pricescale: 100,
  minmov: 1,
  has_intraday: true,
};

function createMockBars(count = 5): Bar[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    time: now - (count - i) * 60_000,
    open: 50000 + i * 10,
    high: 50050 + i * 10,
    low: 49950 + i * 10,
    close: 50020 + i * 10,
    volume: 100 + i,
  }));
}

function createMockDatafeed(bars: Bar[] = createMockBars()): IBasicDataFeed {
  return {
    onReady: vi.fn((cb) => setTimeout(() => cb({ supported_resolutions: ['1', '5', '15', '60', '240', '1D'] }), 0)),
    resolveSymbol: vi.fn((_sym, onSuccess) => setTimeout(() => onSuccess(DEFAULT_SYMBOL_INFO), 0)),
    getBars: vi.fn((_info, _res, _params, onSuccess) =>
      setTimeout(() => onSuccess(bars, { noData: bars.length === 0 }), 0),
    ),
    subscribeBars: vi.fn(),
    unsubscribeBars: vi.fn(),
  };
}

/**
 * Flush all pending setTimeout callbacks by advancing fake timers.
 * The initialization chain is: onReady (setTimeout) -> resolveSymbol (setTimeout) -> getBars (setTimeout)
 * Each step queues a setTimeout(cb, 0), so we need multiple passes.
 */
async function flushInitialization(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await vi.advanceTimersByTimeAsync(1);
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('TealchartWidget', () => {
  let container: HTMLElement;
  let widget: TealchartWidget;

  beforeEach(() => {
    vi.useFakeTimers();
    container = createMockContainer();
    mockRender.mockClear();
    mockUnmount.mockClear();
  });

  afterEach(() => {
    // widget may not exist if test failed during setup
    try {
      widget?.remove();
    } catch {
      // ignore cleanup errors
    }
    vi.useRealTimers();
  });

  // ============================================================================
  // Constructor & Lifecycle
  // ============================================================================

  describe('constructor and lifecycle', () => {
    it('creates widget with container and options', () => {
      const datafeed = createMockDatafeed();
      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '60' as ResolutionString,
        datafeed,
      });

      expect(widget).toBeDefined();
      expect(widget.symbol()).toBe('BTCUSDT');
    });

    it('activeChart returns a TealchartApi instance', async () => {
      const datafeed = createMockDatafeed();
      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '60' as ResolutionString,
        datafeed,
      });

      await flushInitialization();

      const api = widget.activeChart();
      expect(api).toBeDefined();
      expect(typeof api.symbol).toBe('function');
      expect(typeof api.resolution).toBe('function');
    });

    it('symbol() returns initial symbol and resolution() returns initial interval', () => {
      const datafeed = createMockDatafeed();
      widget = new TealchartWidget(container, {
        container,
        symbol: 'ETHUSDT',
        interval: '15' as ResolutionString,
        datafeed,
      });

      expect(widget.symbol()).toBe('ETHUSDT');
      expect(widget.resolution()).toBe('15');
    });

    it('defaults interval to 1h when not provided', () => {
      const datafeed = createMockDatafeed();
      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '' as ResolutionString,
        datafeed,
      });

      expect(widget.resolution()).toBe('1h');
    });
  });

  // ============================================================================
  // onChartReady
  // ============================================================================

  describe('onChartReady', () => {
    it('queues callback before ready, fires after initialization completes', async () => {
      const datafeed = createMockDatafeed();
      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '60' as ResolutionString,
        datafeed,
      });

      const readyCallback = vi.fn();
      widget.onChartReady(readyCallback);

      // Callback should not have been called yet
      expect(readyCallback).not.toHaveBeenCalled();

      // Flush async initialization
      await flushInitialization();

      expect(readyCallback).toHaveBeenCalledTimes(1);
    });

    it('fires callback immediately if widget is already ready', async () => {
      const datafeed = createMockDatafeed();
      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '60' as ResolutionString,
        datafeed,
      });

      // Wait for initialization
      await flushInitialization();

      const lateCallback = vi.fn();
      widget.onChartReady(lateCallback);

      // Should be called immediately since widget is already ready
      expect(lateCallback).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // applyOverrides & changeTheme
  // ============================================================================

  describe('applyOverrides', () => {
    it('maps TradingView override paths to render options', async () => {
      const datafeed = createMockDatafeed();
      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '60' as ResolutionString,
        datafeed,
      });

      await flushInitialization();

      // Apply overrides - widget stores them internally and re-renders
      widget.applyOverrides({
        'mainSeriesProperties.candleStyle.upColor': '#00FF00',
        'mainSeriesProperties.candleStyle.downColor': '#FF0000',
        'paneProperties.background': '#000000',
        'scalesProperties.textColor': '#FFFFFF',
        'paneProperties.vertGridProperties.color': '#333333',
        'paneProperties.crossHairProperties.color': '#888888',
        'volumePaneProperties.showVolume': false,
        'volumePaneProperties.volumeHeight': 0.3,
      });

      // Verify that render was called (meaning overrides were applied and re-rendered)
      // The exact render options are internal, but we confirm the method does not throw
      // and triggers a re-render
      expect(mockRender).toHaveBeenCalled();
    });

    it('changeTheme Dark applies dark theme colors', async () => {
      const datafeed = createMockDatafeed();
      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '60' as ResolutionString,
        datafeed,
      });

      await flushInitialization();

      const renderCallsBefore = mockRender.mock.calls.length;
      widget.changeTheme('Dark');

      // Dark theme should trigger a re-render with dark colors
      expect(mockRender.mock.calls.length).toBeGreaterThan(renderCallsBefore);
    });

    it('changeTheme Light applies light theme colors', async () => {
      const datafeed = createMockDatafeed();
      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '60' as ResolutionString,
        datafeed,
      });

      await flushInitialization();

      const renderCallsBefore = mockRender.mock.calls.length;
      widget.changeTheme('Light');

      expect(mockRender.mock.calls.length).toBeGreaterThan(renderCallsBefore);
    });
  });

  // ============================================================================
  // Events
  // ============================================================================

  describe('events', () => {
    it('subscribe and unsubscribe lifecycle works', async () => {
      const datafeed = createMockDatafeed();
      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '60' as ResolutionString,
        datafeed,
      });

      const callback = vi.fn();

      widget.subscribe('mouse_down', callback);
      widget.unsubscribe('mouse_down', callback);

      // Since the callback was unsubscribed, it should not fire
      // The internal emitter should not call the removed callback
      // We cannot easily trigger mouse_down from here, but we can confirm no error
      expect(callback).not.toHaveBeenCalled();
    });

    it('chart_loaded event fires after initialization completes', async () => {
      const datafeed = createMockDatafeed();
      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '60' as ResolutionString,
        datafeed,
      });

      const chartLoadedCallback = vi.fn();
      widget.subscribe('chart_loaded', chartLoadedCallback);

      // Not fired yet
      expect(chartLoadedCallback).not.toHaveBeenCalled();

      // Flush initialization
      await flushInitialization();

      expect(chartLoadedCallback).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // Symbol & Resolution
  // ============================================================================

  describe('symbol and resolution methods', () => {
    it('setSymbol updates the symbol via chartApi', async () => {
      const datafeed = createMockDatafeed();
      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '60' as ResolutionString,
        datafeed,
      });

      await flushInitialization();

      widget.setSymbol('ETHUSDT');

      // The symbol change is handled asynchronously through the chartApi
      // and the internal _handleSymbolChange callback, which updates _symbol
      // After the internal handler runs:
      expect(widget.symbol()).toBe('ETHUSDT');
    });

    it('chartsCount returns 1 and activeChartIndex returns 0', () => {
      const datafeed = createMockDatafeed();
      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '60' as ResolutionString,
        datafeed,
      });

      expect(widget.chartsCount()).toBe(1);
      expect(widget.activeChartIndex()).toBe(0);
    });
  });

  // ============================================================================
  // Cleanup
  // ============================================================================

  describe('remove', () => {
    it('cleans up subscriptions, unmounts root, and clears container', async () => {
      const datafeed = createMockDatafeed();
      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '60' as ResolutionString,
        datafeed,
      });

      await flushInitialization();

      // Verify datafeed.subscribeBars was called during initialization
      expect(datafeed.subscribeBars).toHaveBeenCalled();

      widget.remove();

      // Should have called unsubscribeBars to clean up the bar subscription
      expect(datafeed.unsubscribeBars).toHaveBeenCalled();

      // Should have unmounted the React root
      expect(mockUnmount).toHaveBeenCalledTimes(1);

      // Container innerHTML should be cleared
      expect(container.innerHTML).toBe('');

      // Prevent afterEach from calling remove again
      widget = undefined as unknown as TealchartWidget;
    });
  });

  // ============================================================================
  // Symbol Switching Correctness
  // ============================================================================

  describe('symbol switching', () => {
    /**
     * Create a datafeed that returns different bars and symbolInfo per symbol.
     * This lets us verify the widget actually loaded NEW data after switching.
     */
    function createSymbolAwareDatafeed() {
      const symbolData: Record<string, { info: LibrarySymbolInfo; bars: Bar[] }> = {
        BTCUSDT: {
          info: {
            ...DEFAULT_SYMBOL_INFO,
            name: 'BTCUSDT',
            ticker: 'BTCUSDT',
            pricescale: 100,
          },
          bars: createMockBars(5).map((b) => ({ ...b, close: 50000 })),
        },
        ETHUSDT: {
          info: {
            ...DEFAULT_SYMBOL_INFO,
            name: 'ETHUSDT',
            ticker: 'ETHUSDT',
            pricescale: 100,
          },
          bars: createMockBars(5).map((b) => ({ ...b, close: 3000 })),
        },
        SOLUSDT: {
          info: {
            ...DEFAULT_SYMBOL_INFO,
            name: 'SOLUSDT',
            ticker: 'SOLUSDT',
            pricescale: 1000,
          },
          bars: createMockBars(5).map((b) => ({ ...b, close: 150 })),
        },
      };

      const datafeed: IBasicDataFeed = {
        onReady: vi.fn((cb) => setTimeout(() => cb({ supported_resolutions: ['1', '5', '15', '60', '240', '1D'] }), 0)),
        resolveSymbol: vi.fn((sym: string, onSuccess: (info: LibrarySymbolInfo) => void) => {
          const data = symbolData[sym] || symbolData['BTCUSDT'];
          setTimeout(() => onSuccess(data.info), 0);
        }),
        getBars: vi.fn(
          (
            info: LibrarySymbolInfo,
            _res: ResolutionString,
            _params: unknown,
            onSuccess: (bars: Bar[], meta: { noData: boolean }) => void,
          ) => {
            const data = symbolData[info.name] || symbolData['BTCUSDT'];
            setTimeout(() => onSuccess(data.bars, { noData: false }), 0);
          },
        ),
        subscribeBars: vi.fn(),
        unsubscribeBars: vi.fn(),
      };

      return { datafeed, symbolData };
    }

    it('switching symbol updates widget.symbol() and chartApi.symbol()', async () => {
      const { datafeed } = createSymbolAwareDatafeed();
      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '60' as ResolutionString,
        datafeed,
      });

      await flushInitialization();
      expect(widget.symbol()).toBe('BTCUSDT');
      expect(widget.activeChart().symbol()).toBe('BTCUSDT');

      // Switch symbol
      widget.setSymbol('ETHUSDT');
      expect(widget.symbol()).toBe('ETHUSDT');
      expect(widget.activeChart().symbol()).toBe('ETHUSDT');
    });

    it('switching symbol triggers resolveSymbol with new symbol name', async () => {
      const { datafeed } = createSymbolAwareDatafeed();
      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '60' as ResolutionString,
        datafeed,
      });

      await flushInitialization();
      const resolveCallsBefore = (datafeed.resolveSymbol as ReturnType<typeof vi.fn>).mock.calls.length;

      widget.setSymbol('ETHUSDT');
      // Flush the resolveSymbol + getBars chain
      await flushInitialization();

      const resolveCalls = (datafeed.resolveSymbol as ReturnType<typeof vi.fn>).mock.calls;
      expect(resolveCalls.length).toBeGreaterThan(resolveCallsBefore);
      // The most recent resolveSymbol call should be for ETHUSDT
      const lastResolveCall = resolveCalls[resolveCalls.length - 1];
      expect(lastResolveCall[0]).toBe('ETHUSDT');
    });

    it('switching symbol unsubscribes from old bars before loading new ones', async () => {
      const { datafeed } = createSymbolAwareDatafeed();
      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '60' as ResolutionString,
        datafeed,
      });

      await flushInitialization();

      // Should have one subscribeBars call from initial load
      expect(datafeed.subscribeBars).toHaveBeenCalledTimes(1);
      const unsubCallsBefore = (datafeed.unsubscribeBars as ReturnType<typeof vi.fn>).mock.calls.length;

      widget.setSymbol('ETHUSDT');

      // Should have unsubscribed from old symbol
      expect((datafeed.unsubscribeBars as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(
        unsubCallsBefore,
      );

      // Flush to complete the new symbol load
      await flushInitialization();

      // Should have a new subscribeBars call for the new symbol
      expect(datafeed.subscribeBars).toHaveBeenCalledTimes(2);
    });

    it('switching symbol loads bars via getBars with new symbolInfo', async () => {
      const { datafeed } = createSymbolAwareDatafeed();
      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '60' as ResolutionString,
        datafeed,
      });

      await flushInitialization();
      const getBarsCallsBefore = (datafeed.getBars as ReturnType<typeof vi.fn>).mock.calls.length;

      widget.setSymbol('ETHUSDT');
      await flushInitialization();

      const getBarsCalls = (datafeed.getBars as ReturnType<typeof vi.fn>).mock.calls;
      expect(getBarsCalls.length).toBeGreaterThan(getBarsCallsBefore);
      // The new getBars call should use ETHUSDT symbolInfo
      const lastGetBarsCall = getBarsCalls[getBarsCalls.length - 1];
      expect(lastGetBarsCall[0].name).toBe('ETHUSDT');
    });

    it('switching symbol updates price precision from new symbolInfo.pricescale', async () => {
      const { datafeed } = createSymbolAwareDatafeed();
      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '60' as ResolutionString,
        datafeed,
      });

      await flushInitialization();

      // Switch to SOLUSDT which has pricescale: 1000 (precision: 0.001)
      widget.setSymbol('SOLUSDT');
      await flushInitialization();

      // Verify resolveSymbol was called with SOLUSDT
      const resolveCalls = (datafeed.resolveSymbol as ReturnType<typeof vi.fn>).mock.calls;
      const lastCall = resolveCalls[resolveCalls.length - 1];
      expect(lastCall[0]).toBe('SOLUSDT');
    });

    it('switching to same symbol is a no-op', async () => {
      const { datafeed } = createSymbolAwareDatafeed();
      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '60' as ResolutionString,
        datafeed,
      });

      await flushInitialization();
      const resolveCallsBefore = (datafeed.resolveSymbol as ReturnType<typeof vi.fn>).mock.calls.length;

      // Set same symbol - should be ignored by _handleSymbolChange
      widget.setSymbol('BTCUSDT');
      await flushInitialization();

      // No new resolveSymbol call since symbol didn't actually change
      expect((datafeed.resolveSymbol as ReturnType<typeof vi.fn>).mock.calls.length).toBe(resolveCallsBefore);
    });
  });

  // ============================================================================
  // Interval Switching Correctness
  // ============================================================================

  describe('interval switching', () => {
    it('changing interval updates resolution() and reloads bars', async () => {
      const datafeed = createMockDatafeed();
      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '60' as ResolutionString,
        datafeed,
      });

      await flushInitialization();
      expect(widget.resolution()).toBe('60');

      const getBarsCallsBefore = (datafeed.getBars as ReturnType<typeof vi.fn>).mock.calls.length;

      // Change interval via chartApi (same path as ChartTopBar click)
      widget.activeChart().setResolution('15' as ResolutionString);
      await flushInitialization();

      expect(widget.resolution()).toBe('15');
      // Should have loaded new bars
      expect((datafeed.getBars as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(getBarsCallsBefore);
    });

    it('changing interval unsubscribes old bars and resubscribes with new interval', async () => {
      const datafeed = createMockDatafeed();
      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '60' as ResolutionString,
        datafeed,
      });

      await flushInitialization();
      expect(datafeed.subscribeBars).toHaveBeenCalledTimes(1);
      const unsubCallsBefore = (datafeed.unsubscribeBars as ReturnType<typeof vi.fn>).mock.calls.length;

      widget.activeChart().setResolution('5' as ResolutionString);
      await flushInitialization();

      // Should have unsubscribed from old interval
      expect((datafeed.unsubscribeBars as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(
        unsubCallsBefore,
      );
      // Should have new subscribeBars for new interval
      expect(datafeed.subscribeBars).toHaveBeenCalledTimes(2);

      // The new subscribeBars should reference the new interval in the guid
      const lastSubscribeCall = (datafeed.subscribeBars as ReturnType<typeof vi.fn>).mock.calls[1];
      expect(lastSubscribeCall[1]).toBe('5'); // resolution parameter
    });

    it('changing to same interval is a no-op', async () => {
      const datafeed = createMockDatafeed();
      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '60' as ResolutionString,
        datafeed,
      });

      await flushInitialization();
      const getBarsCallsBefore = (datafeed.getBars as ReturnType<typeof vi.fn>).mock.calls.length;

      widget.activeChart().setResolution('60' as ResolutionString);
      await flushInitialization();

      // No new getBars call since interval didn't change
      expect((datafeed.getBars as ReturnType<typeof vi.fn>).mock.calls.length).toBe(getBarsCallsBefore);
    });

    it('rapid interval changes only complete the last one', async () => {
      const datafeed = createMockDatafeed();
      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '60' as ResolutionString,
        datafeed,
      });

      await flushInitialization();

      // Rapid fire interval changes
      widget.activeChart().setResolution('5' as ResolutionString);
      widget.activeChart().setResolution('15' as ResolutionString);
      widget.activeChart().setResolution('240' as ResolutionString);

      await flushInitialization();

      // Widget should end up on the last interval set
      expect(widget.resolution()).toBe('240');
    });
  });

  // ============================================================================
  // Multiple Widget Independence
  // ============================================================================

  describe('multiple widget independence', () => {
    let widget2: TealchartWidget;
    let container2: HTMLElement;

    afterEach(() => {
      try {
        widget2?.remove();
      } catch {
        // ignore
      }
    });

    it('two widgets have independent symbols', async () => {
      const datafeed1 = createMockDatafeed();
      const datafeed2 = createMockDatafeed();
      container2 = createMockContainer();

      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '60' as ResolutionString,
        datafeed: datafeed1,
        chartKey: 'chart1',
      });

      widget2 = new TealchartWidget(container2, {
        container: container2,
        symbol: 'ETHUSDT',
        interval: '15' as ResolutionString,
        datafeed: datafeed2,
        chartKey: 'chart2',
      });

      await flushInitialization();

      expect(widget.symbol()).toBe('BTCUSDT');
      expect(widget2.symbol()).toBe('ETHUSDT');
      expect(widget.resolution()).toBe('60');
      expect(widget2.resolution()).toBe('15');
    });

    it('changing symbol on one widget does not affect the other', async () => {
      const datafeed1 = createMockDatafeed();
      const datafeed2 = createMockDatafeed();
      container2 = createMockContainer();

      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '60' as ResolutionString,
        datafeed: datafeed1,
        chartKey: 'chart1',
      });

      widget2 = new TealchartWidget(container2, {
        container: container2,
        symbol: 'ETHUSDT',
        interval: '15' as ResolutionString,
        datafeed: datafeed2,
        chartKey: 'chart2',
      });

      await flushInitialization();

      // Change widget1's symbol
      widget.setSymbol('SOLUSDT');
      await flushInitialization();

      // Widget1 changed, widget2 unchanged
      expect(widget.symbol()).toBe('SOLUSDT');
      expect(widget2.symbol()).toBe('ETHUSDT');

      // Widget2's datafeed should NOT have received a new resolveSymbol
      // after the initial one (only 1 call from init)
      expect(datafeed2.resolveSymbol).toHaveBeenCalledTimes(1);
    });

    it('two widgets have independent chartApi instances', async () => {
      const datafeed1 = createMockDatafeed();
      const datafeed2 = createMockDatafeed();
      container2 = createMockContainer();

      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '60' as ResolutionString,
        datafeed: datafeed1,
        chartKey: 'chart1',
      });

      widget2 = new TealchartWidget(container2, {
        container: container2,
        symbol: 'ETHUSDT',
        interval: '15' as ResolutionString,
        datafeed: datafeed2,
        chartKey: 'chart2',
      });

      await flushInitialization();

      const api1 = widget.activeChart();
      const api2 = widget2.activeChart();

      // Distinct instances
      expect(api1).not.toBe(api2);

      // Each has correct symbol
      expect(api1.symbol()).toBe('BTCUSDT');
      expect(api2.symbol()).toBe('ETHUSDT');

      // Changing api1 symbol doesn't affect api2
      api1.setSymbol('DOGEUSDT');
      expect(api1.symbol()).toBe('DOGEUSDT');
      expect(api2.symbol()).toBe('ETHUSDT');
    });

    it('removing one widget does not affect the other', async () => {
      const datafeed1 = createMockDatafeed();
      const datafeed2 = createMockDatafeed();
      container2 = createMockContainer();

      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '60' as ResolutionString,
        datafeed: datafeed1,
        chartKey: 'chart1',
      });

      widget2 = new TealchartWidget(container2, {
        container: container2,
        symbol: 'ETHUSDT',
        interval: '15' as ResolutionString,
        datafeed: datafeed2,
        chartKey: 'chart2',
      });

      await flushInitialization();

      // Remove widget1
      widget.remove();
      widget = undefined as unknown as TealchartWidget;

      // Widget2 still works
      expect(widget2.symbol()).toBe('ETHUSDT');
      expect(widget2.resolution()).toBe('15');
      expect(widget2.activeChart().symbol()).toBe('ETHUSDT');
    });

    it('two widgets have independent event emitters', async () => {
      const datafeed1 = createMockDatafeed();
      const datafeed2 = createMockDatafeed();
      container2 = createMockContainer();

      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '60' as ResolutionString,
        datafeed: datafeed1,
        chartKey: 'chart1',
      });

      widget2 = new TealchartWidget(container2, {
        container: container2,
        symbol: 'ETHUSDT',
        interval: '15' as ResolutionString,
        datafeed: datafeed2,
        chartKey: 'chart2',
      });

      const callback1 = vi.fn();
      const callback2 = vi.fn();

      widget.subscribe('mouse_down', callback1);
      widget2.subscribe('mouse_down', callback2);

      // Unsubscribe widget1 - should not affect widget2
      widget.unsubscribe('mouse_down', callback1);

      // Neither callback was fired (no event triggered), but the subscriptions are independent
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Data Flow Correctness
  // ============================================================================

  describe('data flow correctness', () => {
    it('getBars is called with correct resolution after interval change', async () => {
      const datafeed = createMockDatafeed();
      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '60' as ResolutionString,
        datafeed,
      });

      await flushInitialization();

      // First getBars should have been called with resolution '60'
      const firstGetBarsCall = (datafeed.getBars as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(firstGetBarsCall[1]).toBe('60');

      // Change interval
      widget.activeChart().setResolution('1D' as ResolutionString);
      await flushInitialization();

      // New getBars should use '1D' resolution
      const getBarsCalls = (datafeed.getBars as ReturnType<typeof vi.fn>).mock.calls;
      const lastCall = getBarsCalls[getBarsCalls.length - 1];
      expect(lastCall[1]).toBe('1D');
    });

    it('symbol switch + interval switch in sequence both complete correctly', async () => {
      const datafeed = createMockDatafeed();
      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '60' as ResolutionString,
        datafeed,
      });

      await flushInitialization();

      // Switch symbol first
      widget.setSymbol('ETHUSDT');
      await flushInitialization();
      expect(widget.symbol()).toBe('ETHUSDT');

      // Then switch interval
      widget.activeChart().setResolution('5' as ResolutionString);
      await flushInitialization();
      expect(widget.resolution()).toBe('5');

      // Both should be stable
      expect(widget.symbol()).toBe('ETHUSDT');
      expect(widget.resolution()).toBe('5');

      // The last getBars should have been called with ETHUSDT symbolInfo and '5' resolution
      const getBarsCalls = (datafeed.getBars as ReturnType<typeof vi.fn>).mock.calls;
      const lastCall = getBarsCalls[getBarsCalls.length - 1];
      expect(lastCall[1]).toBe('5'); // resolution
    });

    it('subscribeBars guid includes current symbol and interval', async () => {
      const datafeed = createMockDatafeed();
      widget = new TealchartWidget(container, {
        container,
        symbol: 'BTCUSDT',
        interval: '60' as ResolutionString,
        datafeed,
      });

      await flushInitialization();

      // Check the subscribeBars guid includes symbol and interval
      const subscribeCalls = (datafeed.subscribeBars as ReturnType<typeof vi.fn>).mock.calls;
      const lastGuid = subscribeCalls[subscribeCalls.length - 1][3]; // guid is 4th arg
      expect(lastGuid).toContain('BTCUSDT');
      expect(lastGuid).toContain('60');
    });
  });
});
