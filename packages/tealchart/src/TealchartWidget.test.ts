import type { DrawingOutput, PlotOutput } from '@tealstreet/tealscript';
import type {
  DrawingCoordinateSpace,
  UserDrawing,
  UserDrawingCommandEvent,
  UserDrawingState,
  UserDrawingTool,
} from './drawings';
import type { DrawingDragEventOptions } from './interaction/EventManager';
import type {
  Bar,
  DatafeedConfiguration,
  IBasicDataFeed,
  LibrarySymbolInfo,
  PeriodParams,
  ResolutionString,
  TealchartWidgetOptions,
  WidgetEventCallback,
} from './types';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createUserDrawingState,
  resolveUserDrawingObjectTreeDrawingDispatchAction,
  resolveUserDrawingObjectTreeRowDispatchAction,
  resolveUserDrawingObjectTreeSelectionDispatchAction,
} from './drawings';
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
const widgetUiOptionsCalls: Array<{
  onUserDrawingToolSelect?: (tool: UserDrawingTool) => void;
  onUserDrawingUndo?: () => void;
  onUserDrawingRedo?: () => void;
}> = [];

// Use plain classes for mocks so mockReset doesn't strip implementations
vi.mock('./ui/TealchartWidgetUI', () => ({
  TealchartWidgetUI: class {
    constructor(options: {
      onUserDrawingToolSelect?: (tool: UserDrawingTool) => void;
      onUserDrawingUndo?: () => void;
      onUserDrawingRedo?: () => void;
    }) {
      widgetUiOptionsCalls.push(options);
    }
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
    setUserDrawingCommandAvailability() {}
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

const userDrawingSpace: DrawingCoordinateSpace = {
  viewport: {
    startTime: 0,
    endTime: 100,
    priceMin: 0,
    priceMax: 100,
  },
  pane: {
    id: 'main',
    top: 0,
    height: 100,
    bottom: 100,
    yMin: 0,
    yMax: 100,
  },
  chartLeft: 0,
  chartRight: 100,
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
    // Keep the existing suite focused on widget behavior, not the default
    // localStorage persistence (tests that need it pass their own adapter).
    disable_default_layout_persistence: true,
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
    widgetUiOptionsCalls.length = 0;
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
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
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
      expect(widget.setUserDrawingState(nextState)).toBe(true);
      expect(widget.getUserDrawingState()).toBe(nextState);
      expect(onChange).toHaveBeenCalledWith(nextState);
      expect(widget.setUserDrawingState(nextState)).toBe(false);

      const testWidget = widget as unknown as { _render(dirty: number): void };
      testWidget._render(DIRTY.USER_DRAWINGS);
      expect(setUserDrawingStateCalls.at(-1)).toBe(nextState);
    });

    it('selects grouped user drawings through the widget state owner', () => {
      const datafeed = createMockDatafeed();
      const onChange = vi.fn();
      const widget = createWidget(datafeed, { onUserDrawingStateChange: onChange });

      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        drawings: [
          {
            id: 'a',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: { lineColor: '#f5c542', lineWidth: 1, lineStyle: 'solid' },
            price: 100,
          },
          {
            id: 'b',
            kind: 'verticalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: { lineColor: '#f5c542', lineWidth: 1, lineStyle: 'solid' },
            time: 20,
          },
        ],
      });

      widget.selectUserDrawings(['b', 'a', 'missing']);

      expect(widget.getUserDrawingState().selection).toEqual({ drawingId: 'b', drawingIds: ['b', 'a'] });
      expect(onChange).toHaveBeenCalled();
    });

    it('returns command change booleans from no-op-capable public drawing APIs', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      const drawing: UserDrawing = {
        id: 'line',
        kind: 'horizontalLine',
        paneId: 'main',
        visible: true,
        locked: false,
        createdAt: 1,
        updatedAt: 1,
        style: { lineColor: '#f5c542', lineWidth: 1, lineStyle: 'solid' },
        price: 100,
      };
      const testWidget = widget as unknown as {
        _handleUserDrawingInput(point: {
          paneId: string;
          anchor: { time: number; price: number };
        }): boolean;
      };

      expect(widget.setActiveUserDrawingTool('select')).toBe(false);
      expect(widget.setActiveUserDrawingTool('rectangle')).toBe(true);
      expect(widget.setActiveUserDrawingTool('rectangle')).toBe(false);
      expect(widget.isUserDrawingStayInDrawingMode()).toBe(false);
      expect(widget.setUserDrawingStayInDrawingMode(true)).toBe(true);
      expect(widget.isUserDrawingStayInDrawingMode()).toBe(true);
      expect(widget.setUserDrawingStayInDrawingMode(true)).toBe(false);
      expect(widget.setUserDrawingStayInDrawingMode(false)).toBe(true);
      expect(widget.getUserDrawingMagnetMode()).toBe('off');
      expect(widget.setUserDrawingMagnetMode('weak')).toBe(true);
      expect(widget.getUserDrawingMagnetMode()).toBe('weak');
      expect(widget.setUserDrawingMagnetMode('weak')).toBe(false);
      expect(widget.setUserDrawingMagnetMode('strong')).toBe(true);
      expect(widget.getUserDrawingMagnetMode()).toBe('strong');
      expect(widget.getUserDrawingMeasureMode()).toBe('off');
      expect(widget.setUserDrawingMeasureMode('on')).toBe(true);
      expect(widget.getUserDrawingMeasureMode()).toBe('on');
      expect(widget.setUserDrawingMeasureMode('on')).toBe(false);
      expect(widget.setActiveUserDrawingTool('trendLine')).toBe(true);
      expect(widget.getUserDrawingMeasureMode()).toBe('off');

      expect(widget.selectUserDrawing('missing')).toBe(false);
      expect(widget.addUserDrawing(drawing)).toBe(true);
      expect(widget.selectUserDrawing('line')).toBe(false);
      expect(widget.selectUserDrawing(null)).toBe(true);
      expect(widget.selectUserDrawings(['line', 'missing'])).toBe(true);
      expect(widget.selectUserDrawings(['line', 'missing'])).toBe(false);

      expect(widget.clearUserDrawings()).toBe(true);
      expect(widget.clearUserDrawings()).toBe(false);

      expect(widget.cancelUserDrawingDraft()).toBe(false);
      expect(widget.setActiveUserDrawingTool('rectangle')).toBe(true);
      expect(
        testWidget._handleUserDrawingInput({
          paneId: 'main',
          anchor: { time: 1_000, price: 100 },
        }),
      ).toBe(true);
      expect(widget.cancelUserDrawingDraft()).toBe(true);
      expect(widget.cancelUserDrawingDraft()).toBe(false);
    });

    it('adds complete user drawings through an undoable command-backed API', () => {
      const datafeed = createMockDatafeed();
      const onCommand = vi.fn<(event: UserDrawingCommandEvent) => void>();
      const widget = createWidget(datafeed, { onUserDrawingCommand: onCommand });
      const drawing: UserDrawing = {
        id: 'api-line',
        kind: 'trendLine',
        paneId: 'main',
        visible: true,
        locked: false,
        createdAt: 1,
        updatedAt: 1,
        style: { lineColor: '#f5c542', lineWidth: 1, lineStyle: 'solid' },
        points: [
          { time: 1_000, price: 100 },
          { time: 2_000, price: 110 },
        ],
        extend: 'none',
      };

      expect(widget.addUserDrawing(drawing)).toBe(true);
      expect(widget.getUserDrawingState().drawings).toEqual([drawing]);
      expect(widget.getUserDrawingState().selection).toEqual({ drawingId: 'api-line' });
      expect(onCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          command: expect.objectContaining({ type: 'add', drawing }),
          source: 'api',
          affectedIds: ['api-line'],
        }),
      );
      const addEvent = onCommand.mock.calls.at(-1)?.[0];
      expect(addEvent?.command).toMatchObject({ type: 'add' });
      if (addEvent?.command.type === 'add') {
        expect(addEvent.command.drawing).not.toBe(drawing);
      }

      (drawing as unknown as { points: { time: number; price: number }[] }).points[0] = { time: 1_000, price: 999 };
      drawing.style.lineColor = '#f00';
      expect(widget.getUserDrawingState().drawings[0]).toMatchObject({
        id: 'api-line',
        style: { lineColor: '#f5c542' },
        points: [
          { time: 1_000, price: 100 },
          { time: 2_000, price: 110 },
        ],
      });

      expect(widget.addUserDrawing(drawing)).toBe(false);
      expect(widget.getUserDrawingState().drawings).toHaveLength(1);

      expect(widget.undoUserDrawingCommand()).toBe(true);
      expect(widget.getUserDrawingState().drawings).toEqual([]);
      expect(widget.redoUserDrawingCommand()).toBe(true);
      expect(widget.getUserDrawingState().drawings[0]).toMatchObject({
        id: 'api-line',
        style: { lineColor: '#f5c542' },
        points: [
          { time: 1_000, price: 100 },
          { time: 2_000, price: 110 },
        ],
      });

      const secondDrawing: UserDrawing = { ...drawing, id: 'api-line-2', style: { ...drawing.style } };
      expect(widget.addUserDrawing(secondDrawing)).toBe(true);
      expect(onCommand.mock.calls.at(-1)?.[0].affectedIds).toEqual(expect.arrayContaining(['api-line', 'api-line-2']));
      expect(onCommand.mock.calls.at(-1)?.[0].affectedIds).toHaveLength(2);
    });

    it('notifies option and subscription listeners after drawing commands change state', () => {
      const datafeed = createMockDatafeed();
      const onCommand = vi.fn<(event: UserDrawingCommandEvent) => void>();
      const subscribed = vi.fn<WidgetEventCallback<'user_drawing_command'>>();
      const widget = createWidget(datafeed, { onUserDrawingCommand: onCommand });
      widget.subscribe('user_drawing_command', subscribed);

      const initial = widget.getUserDrawingState();
      widget.setUserDrawingState({
        ...initial,
        drawings: [
          {
            id: 'a',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 100,
          },
        ],
        selection: { drawingId: 'a' },
      });

      expect(onCommand).toHaveBeenCalledTimes(1);
      expect(subscribed).toHaveBeenCalledTimes(1);
      const replaceEvent = onCommand.mock.calls[0]![0];
      expect(subscribed.mock.calls[0]![0]).toBe(replaceEvent);
      expect(replaceEvent).toMatchObject({
        command: { type: 'replaceState' },
        source: 'api',
        previousState: initial,
        affectedIds: ['a'],
      });

      expect(widget.deleteSelectedUserDrawing()).toBe(true);

      expect(onCommand).toHaveBeenCalledTimes(2);
      expect(subscribed).toHaveBeenCalledTimes(2);
      const event = onCommand.mock.calls[1]![0];
      expect(subscribed.mock.calls[1]![0]).toBe(event);
      expect(event.command.type).toBe('delete');
      expect(event.source).toBe('api');
      expect(event.previousState.drawings.map((drawing) => drawing.id)).toEqual(['a']);
      expect(event.state.drawings).toEqual([]);
      expect(event.affectedIds).toEqual(['a']);

      expect(widget.deleteUserDrawing('missing')).toBe(false);
      expect(onCommand).toHaveBeenCalledTimes(2);
      expect(subscribed).toHaveBeenCalledTimes(2);

      expect(widget.undoUserDrawingCommand()).toBe(true);
      expect(onCommand).toHaveBeenCalledTimes(3);
      expect(subscribed).toHaveBeenCalledTimes(3);
      expect(onCommand.mock.calls[2]![0]).toMatchObject({
        command: { type: 'undo' },
        source: 'api',
      });
      expect(onCommand.mock.calls[2]![0].state.drawings.map((drawing) => drawing.id)).toEqual(['a']);

      widget.unsubscribe('user_drawing_command', subscribed);
      expect(widget.deleteSelectedUserDrawing()).toBe(true);
      expect(subscribed).toHaveBeenCalledTimes(3);
    });

    it('continues subscription emission when the option command listener throws', () => {
      const datafeed = createMockDatafeed();
      const subscribed = vi.fn();
      const widget = createWidget(datafeed, {
        onUserDrawingCommand: () => {
          throw new Error('listener failed');
        },
      });
      widget.subscribe('user_drawing_command', subscribed);
      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        drawings: [
          {
            id: 'a',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 100,
          },
        ],
        selection: { drawingId: 'a' },
      });

      expect(subscribed).toHaveBeenCalledTimes(1);
      expect(subscribed.mock.calls[0]?.[0]).toMatchObject({ command: { type: 'replaceState' } });
      subscribed.mockClear();

      expect(() => widget.deleteSelectedUserDrawing()).not.toThrow();
      expect(subscribed).toHaveBeenCalledTimes(1);
      expect(subscribed.mock.calls[0]?.[0]).toMatchObject({ command: { type: 'delete' } });
    });

    it('marks layouts dirty only when committed user drawings change', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      const testWidget = widget as unknown as {
        _chartStore: { isDirty: { get(): boolean; set(value: boolean): void } };
        _getCurrentSettings(): { userDrawingState?: UserDrawingState };
      };

      const initial = widget.getUserDrawingState();
      widget.setUserDrawingState({ ...initial, activeTool: 'select', selection: { drawingId: 'missing' } });
      expect(testWidget._chartStore.isDirty.get()).toBe(false);

      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        drawings: [
          {
            id: 'h',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 50,
          },
        ],
      });
      expect(testWidget._chartStore.isDirty.get()).toBe(true);
      expect(testWidget._getCurrentSettings().userDrawingState?.drawings).toHaveLength(1);

      testWidget._chartStore.isDirty.set(false);
      widget.selectUserDrawing('h');
      expect(testWidget._chartStore.isDirty.get()).toBe(false);
    });

    it('loads user drawings from layout settings without dirtying the loaded layout', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      const testWidget = widget as unknown as {
        _chartStore: { isDirty: { get(): boolean; set(value: boolean): void } };
        _handleLoadLayout(settings: unknown, warnings: string[], layoutId: string, layoutName: string): void;
      };

      testWidget._chartStore.isDirty.set(false);
      testWidget._handleLoadLayout(
        {
          symbol: 'BTCUSDT',
          interval: '60',
          showVolume: true,
          volumeHeight: 0.2,
          chartType: 'candle',
          autoScale: true,
          indicators: [],
          version: 1,
          userDrawingState: {
            version: 1,
            activeTool: 'select',
            selection: null,
            draft: null,
            textEdit: null,
            drawings: [
              {
                id: 'loaded',
                kind: 'verticalLine',
                paneId: 'main',
                visible: true,
                locked: false,
                createdAt: 1,
                updatedAt: 1,
                style: {
                  lineColor: '#f5c542',
                  lineWidth: 1,
                  lineStyle: 'solid',
                },
                time: 123,
              },
            ],
          },
        },
        [],
        'layout-1',
        'Layout 1',
      );

      expect(widget.getUserDrawingState().drawings).toEqual([
        expect.objectContaining({ id: 'loaded', kind: 'verticalLine' }),
      ]);
      expect(testWidget._chartStore.isDirty.get()).toBe(false);
    });

    it('exports and imports layout-safe user drawing state', () => {
      const datafeed = createMockDatafeed();
      const onCommand = vi.fn<(event: UserDrawingCommandEvent) => void>();
      const widget = createWidget(datafeed, { onUserDrawingCommand: onCommand });

      expect(widget.setUserDrawingStayInDrawingMode(true)).toBe(true);
      expect(widget.setUserDrawingMagnetMode('strong')).toBe(true);
      const settingsOnlyExport = widget.exportUserDrawingStateForLayout();
      expect(settingsOnlyExport).toMatchObject({
        drawings: [],
        stayInDrawingMode: true,
        magnetMode: 'strong',
      });

      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        activeTool: 'rectangle',
        stayInDrawingMode: false,
        magnetMode: 'weak',
        selection: { drawingId: 'h' },
        drawings: [
          {
            id: 'h',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 50,
          },
        ],
      });
      onCommand.mockClear();

      const exported = widget.exportUserDrawingStateForLayout();
      expect(exported?.drawings).toHaveLength(1);
      expect(exported?.activeTool).toBe('select');
      expect(exported?.stayInDrawingMode).toBe(false);
      expect(exported?.magnetMode).toBe('weak');
      expect(exported?.selection).toBeNull();

      widget.clearUserDrawings();
      onCommand.mockClear();
      expect(widget.importUserDrawingStateFromLayout(exported)).toBe(true);
      expect(widget.getUserDrawingState().drawings).toEqual([expect.objectContaining({ id: 'h' })]);
      expect(widget.getUserDrawingState().activeTool).toBe('select');
      expect(widget.isUserDrawingStayInDrawingMode()).toBe(false);
      expect(widget.getUserDrawingMagnetMode()).toBe('weak');
      expect(onCommand).toHaveBeenCalledTimes(1);
      expect(onCommand.mock.calls[0]![0]).toMatchObject({
        command: { type: 'replaceState' },
        source: 'layout',
        affectedIds: ['h'],
      });

      const testWidget = widget as unknown as {
        _chartStore: { isDirty: { get(): boolean; set(value: boolean): void } };
      };
      testWidget._chartStore.isDirty.set(false);
      onCommand.mockClear();
      expect(widget.importUserDrawingStateFromLayout(exported)).toBe(false);
      expect(testWidget._chartStore.isDirty.get()).toBe(false);
      expect(onCommand).not.toHaveBeenCalled();

      onCommand.mockClear();
      expect(widget.importUserDrawingStateFromLayout(undefined)).toBe(true);
      expect(widget.getUserDrawingState().drawings).toEqual([]);
      expect(widget.isUserDrawingStayInDrawingMode()).toBe(false);
      expect(widget.getUserDrawingMagnetMode()).toBe('off');
      expect(onCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          command: { type: 'replaceState', meta: { source: 'layout' } },
          source: 'layout',
          affectedIds: ['h'],
        }),
      );
    });

    it('applies active drawing tool input through the widget state owner', () => {
      const datafeed = createMockDatafeed();
      const onChange = vi.fn();
      const widget = createWidget(datafeed, { onUserDrawingStateChange: onChange });
      const initial = widget.getUserDrawingState();
      widget.setUserDrawingState({ ...initial, activeTool: 'trendLine' });

      const testWidget = widget as unknown as {
        _handleUserDrawingInput(point: { paneId: string; anchor: { time: number; price: number } }): boolean;
      };

      expect(testWidget._handleUserDrawingInput({ paneId: 'main', anchor: { time: 1, price: 10 } })).toBe(true);
      expect(widget.canUndoUserDrawingCommand()).toBe(false);
      expect(widget.getUserDrawingState().draft).toMatchObject({
        tool: 'trendLine',
        paneId: 'main',
        anchors: [{ time: 1, price: 10 }],
      });

      expect(testWidget._handleUserDrawingInput({ paneId: 'main', anchor: { time: 2, price: 20 } })).toBe(true);
      expect(widget.getUserDrawingState().drawings[0]).toMatchObject({
        id: 'drawing_1',
        kind: 'trendLine',
        paneId: 'main',
        points: [
          { time: 1, price: 10 },
          { time: 2, price: 20 },
        ],
      });
      expect(widget.canUndoUserDrawingCommand()).toBe(true);
      expect(widget.undoUserDrawingCommand()).toBe(true);
      expect(widget.getUserDrawingState()).toMatchObject({
        drawings: [],
        draft: null,
        selection: null,
      });
      expect(widget.canRedoUserDrawingCommand()).toBe(true);
      expect(widget.redoUserDrawingCommand()).toBe(true);
      expect(widget.getUserDrawingState().drawings[0]).toMatchObject({
        id: 'drawing_1',
        kind: 'trendLine',
      });
      expect(onChange).toHaveBeenCalled();
    });

    it('applies one-shot web drawing placement when stay-in-drawing-mode is disabled', () => {
      const datafeed = createMockDatafeed();
      const onCommand = vi.fn<(event: UserDrawingCommandEvent) => void>();
      const widget = createWidget(datafeed, { onUserDrawingCommand: onCommand });
      widget.setActiveUserDrawingTool('trendLine');
      widget.setUserDrawingStayInDrawingMode(true);
      onCommand.mockClear();

      expect(widget.setUserDrawingStayInDrawingMode(false)).toBe(true);
      expect(widget.getUserDrawingState().stayInDrawingMode).toBe(false);
      expect(onCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          command: expect.objectContaining({ type: 'setStayInDrawingMode', stayInDrawingMode: false }),
          source: 'api',
        }),
      );
      expect(widget.setUserDrawingMagnetMode('weak')).toBe(true);
      expect(widget.getUserDrawingMagnetMode()).toBe('weak');
      expect(onCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          command: expect.objectContaining({ type: 'setMagnetMode', magnetMode: 'weak' }),
          source: 'api',
        }),
      );

      const testWidget = widget as unknown as {
        _handleUserDrawingInput(point: { paneId: string; anchor: { time: number; price: number } }): boolean;
      };

      expect(testWidget._handleUserDrawingInput({ paneId: 'main', anchor: { time: 1, price: 10 } })).toBe(true);
      expect(widget.getUserDrawingState().activeTool).toBe('trendLine');
      expect(testWidget._handleUserDrawingInput({ paneId: 'main', anchor: { time: 2, price: 20 } })).toBe(true);
      expect(widget.getUserDrawingState()).toMatchObject({
        activeTool: 'select',
        stayInDrawingMode: false,
        selection: { drawingId: 'drawing_1' },
      });
      expect(widget.getUserDrawingState().drawings[0]).toMatchObject({ id: 'drawing_1', kind: 'trendLine' });
    });

    it('creates web click-placement drawings as independent undo entries', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        activeTool: 'rectangle',
        stayInDrawingMode: true,
      });

      const testWidget = widget as unknown as {
        _handleUserDrawingInput(point: { paneId: string; anchor: { time: number; price: number } }): boolean;
      };

      const clickPlace = (offset: number) => {
        expect(
          testWidget._handleUserDrawingInput({
            paneId: 'main',
            anchor: { time: offset + 1, price: offset + 10 },
          }),
        ).toBe(true);
        expect(
          testWidget._handleUserDrawingInput({
            paneId: 'main',
            anchor: { time: offset + 2, price: offset + 20 },
          }),
        ).toBe(true);
      };

      clickPlace(0);
      clickPlace(10);

      expect(widget.getUserDrawingState().drawings).toHaveLength(2);
      expect(widget.getUserDrawingState().drawings[0]).toMatchObject({
        id: 'drawing_1',
        kind: 'rectangle',
        points: [
          { time: 1, price: 10 },
          { time: 2, price: 20 },
        ],
      });
      expect(widget.getUserDrawingState().drawings[1]).toMatchObject({
        id: 'drawing_2',
        kind: 'rectangle',
        points: [
          { time: 11, price: 20 },
          { time: 12, price: 30 },
        ],
      });

      expect(widget.undoUserDrawingCommand()).toBe(true);
      expect(widget.getUserDrawingState().drawings).toEqual([expect.objectContaining({ id: 'drawing_1' })]);

      widget.remove();
    });

    it.each(['trendLine', 'rectangle', 'circle', 'ellipse', 'priceRange', 'datePriceRange'] satisfies UserDrawingTool[])(
      'commits exact %s endpoints after widget UI toolbar tool selection',
      (tool) => {
        const datafeed = createMockDatafeed();
        const onCommand = vi.fn<(event: UserDrawingCommandEvent) => void>();
        const widget = createWidget(datafeed, { onUserDrawingCommand: onCommand });
        const testWidget = widget as unknown as {
          _handleUserDrawingInput(point: {
            paneId: string;
            anchor: { time: number; price: number };
          }): boolean;
        };

        widgetUiOptionsCalls.at(-1)?.onUserDrawingToolSelect?.(tool);
        expect(widget.getUserDrawingState().activeTool).toBe(tool);
        expect(onCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            command: expect.objectContaining({ type: 'setActiveTool', tool }),
            source: 'toolbar',
          }),
        );
        expect(
          testWidget._handleUserDrawingInput({
            paneId: 'main',
            anchor: { time: 1_500, price: 90 },
          }),
        ).toBe(true);
        expect(
          testWidget._handleUserDrawingInput({
            paneId: 'main',
            anchor: { time: 2_500, price: 125 },
          }),
        ).toBe(true);

        expect(widget.getUserDrawingState().drawings[0]).toMatchObject({
          id: 'drawing_1',
          kind: tool,
          points: [
            { time: 1_500, price: 90 },
            { time: 2_500, price: 125 },
          ],
        });
        expect(widget.getUserDrawingState().selection).toEqual({ drawingId: 'drawing_1' });

        widget.remove();
      },
    );

    it('places long position click anchors after widget UI toolbar tool selection', () => {
      const datafeed = createMockDatafeed();
      const onCommand = vi.fn<(event: UserDrawingCommandEvent) => void>();
      const widget = createWidget(datafeed, { onUserDrawingCommand: onCommand });
      const testWidget = widget as unknown as {
        _handleUserDrawingInput(point: { paneId: string; anchor: { time: number; price: number } }): boolean;
      };

      widgetUiOptionsCalls.at(-1)?.onUserDrawingToolSelect?.('longPosition');
      expect(widget.getUserDrawingState().activeTool).toBe('longPosition');
      expect(onCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          command: expect.objectContaining({ type: 'setActiveTool', tool: 'longPosition' }),
          source: 'toolbar',
        }),
      );

      expect(
        testWidget._handleUserDrawingInput({
          paneId: 'main',
          anchor: { time: 1_000, price: 100 },
        }),
      ).toBe(true);
      expect(
        testWidget._handleUserDrawingInput({
          paneId: 'main',
          anchor: { time: 2_000, price: 110 },
        }),
      ).toBe(true);
      expect(widget.getUserDrawingState()).toMatchObject({
        activeTool: 'longPosition',
        selection: null,
        draft: {
          tool: 'longPosition',
          paneId: 'main',
          anchors: [
            { time: 1_000, price: 100 },
            { time: 2_000, price: 110 },
          ],
        },
        drawings: [],
      });

      expect(
        testWidget._handleUserDrawingInput({
          paneId: 'main',
          anchor: { time: 3_000, price: 90 },
        }),
      ).toBe(true);
      expect(widget.getUserDrawingState().drawings[0]).toMatchObject({
        id: 'drawing_1',
        kind: 'longPosition',
        points: [
          { time: 1_000, price: 100 },
          { time: 2_000, price: 110 },
          { time: 3_000, price: 90 },
        ],
      });
      expect(widget.getUserDrawingState().selection).toEqual({ drawingId: 'drawing_1' });

      widget.remove();
    });

    it('commits brush path drags after widget UI toolbar tool selection', () => {
      const datafeed = createMockDatafeed();
      const onCommand = vi.fn<(event: UserDrawingCommandEvent) => void>();
      const widget = createWidget(datafeed, { onUserDrawingCommand: onCommand });
      const testWidget = widget as unknown as {
        _handleUserDrawingPathDragStart(point: { paneId: string; anchor: { time: number; price: number } }): boolean;
        _handleUserDrawingPathDragMove(point: { paneId: string; anchor: { time: number; price: number } }): boolean;
        _handleUserDrawingPathDragEnd(): void;
      };

      widgetUiOptionsCalls.at(-1)?.onUserDrawingToolSelect?.('brush');
      expect(widget.getUserDrawingState().activeTool).toBe('brush');
      expect(onCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          command: expect.objectContaining({ type: 'setActiveTool', tool: 'brush' }),
          source: 'toolbar',
        }),
      );

      expect(testWidget._handleUserDrawingPathDragStart({ paneId: 'main', anchor: { time: 1, price: 10 } })).toBe(
        true,
      );
      expect(testWidget._handleUserDrawingPathDragMove({ paneId: 'main', anchor: { time: 2, price: 20 } })).toBe(
        true,
      );
      expect(testWidget._handleUserDrawingPathDragMove({ paneId: 'main', anchor: { time: 3, price: 30 } })).toBe(
        true,
      );
      testWidget._handleUserDrawingPathDragEnd();

      expect(widget.getUserDrawingState().drawings[0]).toMatchObject({
        id: 'drawing_1',
        kind: 'brush',
        paneId: 'main',
        points: [
          { time: 1, price: 10 },
          { time: 1.25, price: 12.5 },
          { time: 1.75, price: 17.5 },
          { time: 2.25, price: 22.5 },
          { time: 2.75, price: 27.5 },
          { time: 3, price: 30 },
        ],
      });
      expect(widget.getUserDrawingState().selection).toEqual({ drawingId: 'drawing_1' });

      widget.remove();
    });

    it('commits text labels after widget UI toolbar tool selection', () => {
      const datafeed = createMockDatafeed();
      const onCommand = vi.fn<(event: UserDrawingCommandEvent) => void>();
      const widget = createWidget(datafeed, { onUserDrawingCommand: onCommand });
      const testWidget = widget as unknown as {
        _handleUserDrawingInput(point: { paneId: string; anchor: { time: number; price: number } }): boolean;
      };

      widgetUiOptionsCalls.at(-1)?.onUserDrawingToolSelect?.('textLabel');
      expect(widget.getUserDrawingState().activeTool).toBe('textLabel');
      expect(onCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          command: expect.objectContaining({ type: 'setActiveTool', tool: 'textLabel' }),
          source: 'toolbar',
        }),
      );

      expect(testWidget._handleUserDrawingInput({ paneId: 'main', anchor: { time: 4_000, price: 80 } })).toBe(true);

      expect(widget.getUserDrawingState().drawings[0]).toMatchObject({
        id: 'drawing_1',
        kind: 'textLabel',
        paneId: 'main',
        point: { time: 4_000, price: 80 },
      });
      expect(widget.getUserDrawingState().selection).toEqual({ drawingId: 'drawing_1' });

      widget.remove();
    });

    it('routes widget UI toolbar undo and redo through drawing history', () => {
      const datafeed = createMockDatafeed();
      const onCommand = vi.fn<(event: UserDrawingCommandEvent) => void>();
      const widget = createWidget(datafeed, { onUserDrawingCommand: onCommand });

      expect(
        widget.addUserDrawing(
          {
            id: 'line',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
            price: 10,
          },
          { select: true },
        ),
      ).toBe(true);
      onCommand.mockClear();

      widgetUiOptionsCalls.at(-1)?.onUserDrawingUndo?.();
      expect(widget.getUserDrawingState().drawings).toEqual([]);
      expect(onCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          command: expect.objectContaining({ type: 'undo' }),
          source: 'toolbar',
        }),
      );

      widgetUiOptionsCalls.at(-1)?.onUserDrawingRedo?.();
      expect(widget.getUserDrawingState().drawings).toEqual([expect.objectContaining({ id: 'line' })]);
      expect(onCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          command: expect.objectContaining({ type: 'redo' }),
          source: 'toolbar',
        }),
      );

      widget.remove();
    });

    it.each(['trendLine', 'rectangle', 'circle', 'ellipse', 'priceRange', 'datePriceRange'] satisfies UserDrawingTool[])(
      'creates web %s click-placement drawings from exact endpoints',
      (tool) => {
        const datafeed = createMockDatafeed();
        const widget = createWidget(datafeed);
        widget.setUserDrawingState({ ...widget.getUserDrawingState(), activeTool: tool });

        const testWidget = widget as unknown as {
          _handleUserDrawingInput(point: {
            paneId: string;
            anchor: { time: number; price: number };
          }): boolean;
        };

        expect(
          testWidget._handleUserDrawingInput({
            paneId: 'main',
            anchor: { time: 1_000, price: 100 },
          }),
        ).toBe(true);
        expect(
          testWidget._handleUserDrawingInput({
            paneId: 'main',
            anchor: { time: 2_000, price: 110 },
          }),
        ).toBe(true);

        expect(widget.getUserDrawingState().draft).toBeNull();
        expect(widget.getUserDrawingState().selection).toEqual({ drawingId: 'drawing_1' });
        expect(widget.getUserDrawingState().drawings[0]).toMatchObject({
          id: 'drawing_1',
          kind: tool,
          points: [
            { time: 1_000, price: 100 },
            { time: 2_000, price: 110 },
          ],
        });
        expect(widget.canUndoUserDrawingCommand()).toBe(true);

        expect(widget.undoUserDrawingCommand()).toBe(true);
        expect(widget.getUserDrawingState().drawings).toEqual([]);

        widget.remove();
      },
    );

    it('places web multi-anchor drawings from clicks before final click', () => {
      const clickPlacementTools: UserDrawingTool[] = [
        'triangle',
        'parallelChannel',
        'regressionTrend',
        'flatTopBottom',
        'pitchfork',
        'schiffPitchfork',
        'modifiedSchiffPitchfork',
        'insidePitchfork',
        'pitchfan',
        'trendBasedFibExtension',
        'fibWedge',
        'fibChannel',
        'trendBasedFibTime',
        'projection',
        'sector',
        'longPosition',
        'shortPosition',
        'barsPattern',
        'elliottCorrectiveWave',
        'elliottDoubleComboWave',
      ];

      for (const tool of clickPlacementTools) {
        const bars = [
          { time: 1, open: 10, high: 14, low: 9, close: 12 },
          { time: 2, open: 12, high: 15, low: 11, close: 11 },
        ];
        const pointOptions = tool === 'barsPattern' ? { bars } : {};
        const datafeed = createMockDatafeed();
        const widget = createWidget(datafeed);
        widget.setUserDrawingState({ ...widget.getUserDrawingState(), activeTool: tool });

        const testWidget = widget as unknown as {
          _handleUserDrawingInput(point: { paneId: string; anchor: { time: number; price: number } }): boolean;
        };

        expect(
          testWidget._handleUserDrawingInput({
            paneId: 'main',
            anchor: { time: 1, price: 10 },
            ...pointOptions,
          }),
        ).toBe(true);
        expect(
          testWidget._handleUserDrawingInput({
            paneId: 'main',
            anchor: { time: 2, price: 20 },
            ...pointOptions,
          }),
        ).toBe(true);
        expect(widget.getUserDrawingState().drawings).toEqual([]);
        expect(widget.getUserDrawingState().draft).toMatchObject({
          tool,
          paneId: 'main',
          anchors: [
            { time: 1, price: 10 },
            { time: 2, price: 20 },
          ],
        });

        expect(
          testWidget._handleUserDrawingInput({
            paneId: 'main',
            anchor: { time: 3, price: 30 },
            ...pointOptions,
          }),
        ).toBe(true);
        expect(widget.getUserDrawingState().draft).toBeNull();
        expect(widget.getUserDrawingState().selection).toEqual({ drawingId: 'drawing_1' });
        expect(widget.getUserDrawingState().drawings[0]).toMatchObject({
          id: 'drawing_1',
          kind: tool,
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 20 },
            { time: 3, price: 30 },
          ],
          ...(tool === 'barsPattern' ? { bars } : {}),
        });

        widget.remove();
      }
    });

    it('places web four-anchor drawings from clicks before final clicks', () => {
      const clickPlacementTools: UserDrawingTool[] = ['doubleCurve', 'disjointChannel', 'trianglePattern', 'abcdPattern'];

      for (const tool of clickPlacementTools) {
        const datafeed = createMockDatafeed();
        const widget = createWidget(datafeed);
        widget.setUserDrawingState({ ...widget.getUserDrawingState(), activeTool: tool });

        const testWidget = widget as unknown as {
          _handleUserDrawingInput(point: { paneId: string; anchor: { time: number; price: number } }): boolean;
        };

        expect(testWidget._handleUserDrawingInput({ paneId: 'main', anchor: { time: 1, price: 10 } })).toBe(true);
        expect(testWidget._handleUserDrawingInput({ paneId: 'main', anchor: { time: 2, price: 20 } })).toBe(true);
        expect(testWidget._handleUserDrawingInput({ paneId: 'main', anchor: { time: 3, price: 30 } })).toBe(true);
        expect(widget.getUserDrawingState().drawings).toEqual([]);
        expect(widget.getUserDrawingState().draft).toMatchObject({
          tool,
          paneId: 'main',
          anchors: [
            { time: 1, price: 10 },
            { time: 2, price: 20 },
            { time: 3, price: 30 },
          ],
        });

        expect(testWidget._handleUserDrawingInput({ paneId: 'main', anchor: { time: 4, price: 40 } })).toBe(true);
        expect(widget.getUserDrawingState().draft).toBeNull();
        expect(widget.getUserDrawingState().selection).toEqual({ drawingId: 'drawing_1' });
        expect(widget.getUserDrawingState().drawings[0]).toMatchObject({
          id: 'drawing_1',
          kind: tool,
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 20 },
            { time: 3, price: 30 },
            { time: 4, price: 40 },
          ],
        });

        widget.remove();
      }
    });

    it('places web five-anchor pattern drawings from clicks before final clicks', () => {
      const clickPlacementTools: UserDrawingTool[] = [
        'xabcdPattern',
        'cypherPattern',
        'threeDrivesPattern',
        'headShouldersPattern',
        'elliottImpulseWave',
        'elliottTripleComboWave',
        'elliottTriangleWave',
      ];

      for (const tool of clickPlacementTools) {
        const datafeed = createMockDatafeed();
        const widget = createWidget(datafeed);
        widget.setUserDrawingState({ ...widget.getUserDrawingState(), activeTool: tool });

        const testWidget = widget as unknown as {
          _handleUserDrawingInput(point: { paneId: string; anchor: { time: number; price: number } }): boolean;
        };

        expect(testWidget._handleUserDrawingInput({ paneId: 'main', anchor: { time: 1, price: 10 } })).toBe(true);
        expect(testWidget._handleUserDrawingInput({ paneId: 'main', anchor: { time: 2, price: 20 } })).toBe(true);
        expect(testWidget._handleUserDrawingInput({ paneId: 'main', anchor: { time: 3, price: 30 } })).toBe(true);
        expect(testWidget._handleUserDrawingInput({ paneId: 'main', anchor: { time: 4, price: 40 } })).toBe(true);
        expect(widget.getUserDrawingState().drawings).toEqual([]);
        expect(widget.getUserDrawingState().draft).toMatchObject({
          tool,
          paneId: 'main',
          anchors: [
            { time: 1, price: 10 },
            { time: 2, price: 20 },
            { time: 3, price: 30 },
            { time: 4, price: 40 },
          ],
        });

        expect(testWidget._handleUserDrawingInput({ paneId: 'main', anchor: { time: 5, price: 50 } })).toBe(true);
        expect(widget.getUserDrawingState().draft).toBeNull();
        expect(widget.getUserDrawingState().selection).toEqual({ drawingId: 'drawing_1' });
        expect(widget.getUserDrawingState().drawings[0]).toMatchObject({
          id: 'drawing_1',
          kind: tool,
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 20 },
            { time: 3, price: 30 },
            { time: 4, price: 40 },
            { time: 5, price: 50 },
          ],
        });

        widget.remove();
      }
    });

    it('creates web path-family drawings from drag samples through the widget state owner', () => {
      const pathFamilyTools: UserDrawingTool[] = ['brush', 'highlighter'];

      for (const tool of pathFamilyTools) {
        const datafeed = createMockDatafeed();
        const widget = createWidget(datafeed);
        widget.setUserDrawingState({
          ...widget.getUserDrawingState(),
          activeTool: tool,
          stayInDrawingMode: true,
        });

        const testWidget = widget as unknown as {
          _handleUserDrawingPathDragStart(point: { paneId: string; anchor: { time: number; price: number } }): boolean;
          _handleUserDrawingPathDragMove(point: { paneId: string; anchor: { time: number; price: number } }): boolean;
          _handleUserDrawingPathDragEnd(): void;
        };

        const drag = (offset: number) => {
          expect(
            testWidget._handleUserDrawingPathDragStart({
              paneId: 'main',
              anchor: { time: offset + 1, price: offset + 10 },
            }),
          ).toBe(true);
          expect(
            testWidget._handleUserDrawingPathDragMove({
              paneId: 'main',
              anchor: { time: offset + 2, price: offset + 20 },
            }),
          ).toBe(true);
          expect(
            testWidget._handleUserDrawingPathDragMove({
              paneId: 'main',
              anchor: { time: offset + 3, price: offset + 30 },
            }),
          ).toBe(true);
          testWidget._handleUserDrawingPathDragEnd();
        };

        drag(0);

        expect(widget.getUserDrawingState().draft).toBeNull();
        expect(widget.getUserDrawingState().selection).toEqual({ drawingId: 'drawing_1' });
        expect(widget.getUserDrawingState().drawings[0]).toMatchObject({
          id: 'drawing_1',
          kind: tool,
          paneId: 'main',
          points: [
            { time: 1, price: 10 },
            { time: 1.25, price: 12.5 },
            { time: 1.75, price: 17.5 },
            { time: 2.25, price: 22.5 },
            { time: 2.75, price: 27.5 },
            { time: 3, price: 30 },
          ],
        });
        expect(widget.canUndoUserDrawingCommand()).toBe(true);

        drag(10);

        expect(widget.getUserDrawingState().selection).toEqual({ drawingId: 'drawing_2' });
        expect(widget.getUserDrawingState().drawings).toHaveLength(2);
        expect(widget.getUserDrawingState().drawings[1]).toMatchObject({
          id: 'drawing_2',
          kind: tool,
          points: [
            { time: 11, price: 20 },
            { time: 11.25, price: 22.5 },
            { time: 11.75, price: 27.5 },
            { time: 12.25, price: 32.5 },
            { time: 12.75, price: 37.5 },
            { time: 13, price: 40 },
          ],
        });
        expect(widget.undoUserDrawingCommand()).toBe(true);
        expect(widget.getUserDrawingState().drawings).toEqual([expect.objectContaining({ id: 'drawing_1' })]);

        widget.remove();
      }
    });

    it('generates drawing IDs without colliding with restored drawing state', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      const initial = widget.getUserDrawingState();
      widget.setUserDrawingState({
        ...initial,
        activeTool: 'trendLine',
        drawings: [
          {
            id: 'drawing_1',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 10,
          },
        ],
      });

      const testWidget = widget as unknown as {
        _handleUserDrawingInput(point: { paneId: string; anchor: { time: number; price: number } }): boolean;
      };

      expect(testWidget._handleUserDrawingInput({ paneId: 'main', anchor: { time: 1, price: 10 } })).toBe(true);
      expect(testWidget._handleUserDrawingInput({ paneId: 'main', anchor: { time: 2, price: 20 } })).toBe(true);
      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['drawing_1', 'drawing_2']);
    });

    it('selects drawings from chart-surface input in select mode', () => {
      const datafeed = createMockDatafeed();
      const onChange = vi.fn();
      const widget = createWidget(datafeed, { onUserDrawingStateChange: onChange });
      const initial = widget.getUserDrawingState();
      widget.setUserDrawingState({
        ...initial,
        activeTool: 'select',
        drawings: [
          {
            id: 'h',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 50,
          },
        ],
      });

      const testWidget = widget as unknown as {
        _handleUserDrawingSelection(
          point: { x: number; y: number },
          spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
          options?: { additive?: boolean },
        ): { hit: boolean; changed: boolean };
      };

      expect(testWidget._handleUserDrawingSelection({ x: 40, y: 50 }, new Map([['main', userDrawingSpace]]))).toEqual(
        expect.objectContaining({ hit: true, changed: true }),
      );
      expect(widget.getUserDrawingState().selection).toEqual({ drawingId: 'h' });
      expect(onChange).toHaveBeenLastCalledWith(widget.getUserDrawingState());

      const additive = testWidget._handleUserDrawingSelection({ x: 40, y: 50 }, new Map([['main', userDrawingSpace]]), {
        additive: true,
      });
      expect(additive).toEqual(expect.objectContaining({ hit: true, changed: true }));
      expect(widget.getUserDrawingState().selection).toBeNull();

      testWidget._handleUserDrawingSelection({ x: 40, y: 50 }, new Map([['main', userDrawingSpace]]));
      expect(widget.getUserDrawingState().selection).toEqual({ drawingId: 'h' });

      const miss = testWidget._handleUserDrawingSelection({ x: 40, y: 20 }, new Map([['main', userDrawingSpace]]));
      expect(miss).toEqual(expect.objectContaining({ hit: false, changed: true }));
      expect(widget.getUserDrawingState().selection).toBeNull();
      expect(widget.canUndoUserDrawingCommand()).toBe(false);
    });

    it('edits selected drawings from chart-surface drag input in select mode', () => {
      const datafeed = createMockDatafeed();
      const onChange = vi.fn();
      const widget = createWidget(datafeed, { onUserDrawingStateChange: onChange });
      const initial = widget.getUserDrawingState();
      widget.setUserDrawingState({
        ...initial,
        activeTool: 'select',
        drawings: [
          {
            id: 'h',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 50,
          },
        ],
      });

      const testWidget = widget as unknown as {
        _handleUserDrawingEditStart(
          point: { x: number; y: number },
          spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
          options?: DrawingDragEventOptions,
        ): boolean;
        _handleUserDrawingEditMove(point: { x: number; y: number }): boolean;
        _handleUserDrawingEditEnd(): void;
      };

      expect(testWidget._handleUserDrawingEditStart({ x: 40, y: 50 }, new Map([['main', userDrawingSpace]]))).toBe(
        true,
      );
      expect(testWidget._handleUserDrawingEditMove({ x: 40, y: 60 })).toBe(true);
      testWidget._handleUserDrawingEditEnd();

      expect(widget.getUserDrawingState().drawings[0]).toMatchObject({ price: 40 });
      expect(widget.getUserDrawingState().selection).toEqual({ drawingId: 'h' });
      expect(onChange).toHaveBeenLastCalledWith(widget.getUserDrawingState());
    });

    it('duplicates selected drawings from Shift-modified chart-surface drag input in select mode', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      const initial = widget.getUserDrawingState();
      widget.setUserDrawingState({
        ...initial,
        activeTool: 'select',
        drawings: [
          {
            id: 'h',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 50,
          },
        ],
      });

      const testWidget = widget as unknown as {
        _handleUserDrawingEditStart(
          point: { x: number; y: number },
          spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
          options?: DrawingDragEventOptions,
        ): boolean;
        _handleUserDrawingEditMove(point: { x: number; y: number }): boolean;
        _handleUserDrawingEditEnd(): void;
      };

      expect(
        testWidget._handleUserDrawingEditStart({ x: 40, y: 50 }, new Map([['main', userDrawingSpace]]), {
          duplicateOnDrag: true,
        }),
      ).toBe(true);
      expect(testWidget._handleUserDrawingEditMove({ x: 40, y: 60 })).toBe(true);
      testWidget._handleUserDrawingEditEnd();

      expect(widget.getUserDrawingState().drawings).toHaveLength(2);
      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['h', 'drawing_1']);
      expect(widget.getUserDrawingState().drawings[0]).toMatchObject({ id: 'h', price: 50 });
      expect(widget.getUserDrawingState().drawings[1]).toMatchObject({ id: 'drawing_1', price: 40 });
      expect(widget.getUserDrawingState().selection).toEqual({ drawingId: 'drawing_1' });

      expect(widget.undoUserDrawingCommand()).toBe(true);
      expect(widget.getUserDrawingState().drawings).toEqual([expect.objectContaining({ id: 'h', price: 50 })]);
    });

    it('duplicates selected drawings from chart-surface drag input when duplicate-drag mode is enabled', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      const initial = widget.getUserDrawingState();
      widget.setUserDrawingState({
        ...initial,
        activeTool: 'select',
        drawings: [
          {
            id: 'h',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 50,
          },
        ],
      });

      const testWidget = widget as unknown as {
        _handleUserDrawingEditStart(
          point: { x: number; y: number },
          spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
          options?: DrawingDragEventOptions,
        ): boolean;
        _handleUserDrawingEditMove(point: { x: number; y: number }): boolean;
        _handleUserDrawingEditEnd(): void;
        _setUserDrawingDuplicateEditDragEnabled(enabled: boolean): void;
      };

      testWidget._setUserDrawingDuplicateEditDragEnabled(true);

      expect(testWidget._handleUserDrawingEditStart({ x: 40, y: 50 }, new Map([['main', userDrawingSpace]]))).toBe(
        true,
      );
      expect(testWidget._handleUserDrawingEditMove({ x: 40, y: 60 })).toBe(true);
      testWidget._handleUserDrawingEditEnd();

      expect(widget.getUserDrawingState().drawings).toHaveLength(2);
      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['h', 'drawing_1']);
      expect(widget.getUserDrawingState().drawings[1]).toMatchObject({ id: 'drawing_1', price: 40 });
      expect(widget.getUserDrawingState().selection).toEqual({ drawingId: 'drawing_1' });
    });

    it('applies public drawing action commands through the widget state owner', () => {
      const datafeed = createMockDatafeed();
      const onChange = vi.fn();
      const widget = createWidget(datafeed, { onUserDrawingStateChange: onChange });
      const initial = widget.getUserDrawingState();

      widget.setUserDrawingState({
        ...initial,
        activeTool: 'trendLine',
        draft: {
          tool: 'trendLine',
          paneId: 'main',
          anchors: [{ time: 1, price: 10 }],
          style: {
            lineColor: '#f5c542',
            lineWidth: 1,
            lineStyle: 'solid',
          },
          startedAt: 1,
        },
        drawings: [
          {
            id: 'a',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 50,
          },
          {
            id: 'b',
            kind: 'verticalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 2,
            updatedAt: 2,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            time: 20,
          },
        ],
      });

      widget.setActiveUserDrawingTool('select');
      widget.selectUserDrawing('a');

      expect(widget.getUserDrawingState()).toMatchObject({
        activeTool: 'select',
        selection: { drawingId: 'a' },
        draft: null,
      });

      expect(widget.deleteSelectedUserDrawing()).toBe(true);
      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['b']);
      expect(widget.getUserDrawingState().selection).toBeNull();

      expect(widget.deleteUserDrawing('missing')).toBe(false);
      expect(widget.deleteUserDrawing('b')).toBe(true);
      expect(widget.getUserDrawingState().drawings).toEqual([]);

      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        draft: {
          tool: 'rectangle',
          paneId: 'main',
          anchors: [{ time: 1, price: 10 }],
          style: {
            lineColor: '#f5c542',
            lineWidth: 1,
            lineStyle: 'solid',
          },
          startedAt: 1,
        },
      });
      widget.cancelUserDrawingDraft();
      expect(widget.getUserDrawingState().draft).toBeNull();

      widget.clearUserDrawings();
      expect(widget.getUserDrawingState()).toMatchObject({
        drawings: [],
        selection: null,
        draft: null,
      });
      expect(onChange).toHaveBeenCalled();
    });

    it('duplicates selected or targeted drawings through the widget state owner', () => {
      const datafeed = createMockDatafeed();
      const onChange = vi.fn();
      const widget = createWidget(datafeed, { onUserDrawingStateChange: onChange });
      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        activeTool: 'trendLine',
        selection: { drawingId: 'a' },
        draft: {
          tool: 'rectangle',
          paneId: 'main',
          anchors: [{ time: 1, price: 10 }],
          style: {
            lineColor: '#f5c542',
            lineWidth: 1,
            lineStyle: 'solid',
          },
          startedAt: 1,
        },
        drawings: [
          {
            id: 'a',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 50,
          },
          {
            id: 'b',
            kind: 'verticalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 2,
            updatedAt: 2,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            time: 20,
          },
        ],
      });

      expect(widget.duplicateSelectedUserDrawing()).toBe(true);
      const selectedCopy = widget.getUserDrawingState().drawings[1]!;
      expect(widget.getUserDrawingState()).toMatchObject({
        activeTool: 'select',
        selection: { drawingId: selectedCopy.id },
        draft: null,
      });
      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.kind)).toEqual([
        'horizontalLine',
        'horizontalLine',
        'verticalLine',
      ]);

      expect(widget.duplicateUserDrawing('b')).toBe(true);
      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.kind)).toEqual([
        'horizontalLine',
        'horizontalLine',
        'verticalLine',
        'verticalLine',
      ]);
      expect(widget.duplicateUserDrawing('missing')).toBe(false);
      expect(onChange).toHaveBeenCalled();
    });

    it('reports clipboard clear no-ops through the widget API', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);

      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        selection: { drawingId: 'h' },
        drawings: [
          {
            id: 'h',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 50,
          },
        ],
      });

      expect(widget.clearUserDrawingClipboard()).toBe(false);
      expect(widget.copySelectedUserDrawing()).toBe(true);
      expect(widget.clearUserDrawingClipboard()).toBe(true);
      expect(widget.clearUserDrawingClipboard()).toBe(false);
      expect(widget.pasteUserDrawingClipboard()).toBe(false);
    });

    it('copies selected drawings from the web drawing context menu into the widget clipboard', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);

      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        activeTool: 'select',
        drawings: [
          {
            id: 'h',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 50,
          },
        ],
      });

      const contextItems = (
        widget as unknown as {
          _handleUserDrawingContextMenu(
            point: { x: number; y: number },
            spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
          ): Array<{ text: string; enabled: boolean; click: () => void }>;
        }
      )._handleUserDrawingContextMenu({ x: 50, y: 50 }, new Map([['main', userDrawingSpace]]));

      const copyItem = contextItems.find((item) => item.text === 'Copy selected drawing');
      expect(copyItem).toMatchObject({ enabled: true });
      copyItem?.click();

      expect(widget.pasteUserDrawingClipboard()).toBe(true);
      expect(widget.getUserDrawingState().drawings).toHaveLength(2);
      expect(widget.getUserDrawingState().selection?.drawingId).not.toBe('h');
    });

    it('selects and duplicates hit drawings from the web drawing context menu', () => {
      const datafeed = createMockDatafeed();
      const onCommand = vi.fn<(event: UserDrawingCommandEvent) => void>();
      const widget = createWidget(datafeed, { onUserDrawingCommand: onCommand });

      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        activeTool: 'select',
        selection: null,
        drawings: [
          {
            id: 'h',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 50,
          },
          {
            id: 'far',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 2,
            updatedAt: 2,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 60,
          },
        ],
      });

      const contextItems = (
        widget as unknown as {
          _handleUserDrawingContextMenu(
            point: { x: number; y: number },
            spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
          ): Array<{ text: string; enabled: boolean; click: () => void }>;
        }
      )._handleUserDrawingContextMenu({ x: 50, y: 50 }, new Map([['main', userDrawingSpace]]));

      expect(widget.getUserDrawingState().selection).toEqual({ drawingId: 'h' });
      expect(onCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          command: expect.objectContaining({ type: 'selectAtPoint', meta: { source: 'contextMenu' } }),
          source: 'contextMenu',
        }),
      );

      const duplicateItem = contextItems.find((item) => item.text === 'Duplicate selected drawing');
      expect(duplicateItem).toMatchObject({ enabled: true });
      duplicateItem?.click();

      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['h', 'drawing_1', 'far']);
      expect(widget.getUserDrawingState().selection).toEqual({ drawingId: 'drawing_1' });
      expect(onCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          command: expect.objectContaining({ type: 'duplicate', meta: { source: 'contextMenu' } }),
          source: 'contextMenu',
        }),
      );

      const deleteItems = (
        widget as unknown as {
          _handleUserDrawingContextMenu(
            point: { x: number; y: number },
            spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
          ): Array<{ text: string; enabled: boolean; click: () => void }>;
        }
      )._handleUserDrawingContextMenu({ x: 50, y: 50 }, new Map([['main', userDrawingSpace]]));
      const deleteItem = deleteItems.find((item) => item.text === 'Delete selected drawing');
      expect(deleteItem).toMatchObject({ enabled: true });
      deleteItem?.click();

      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['h', 'far']);
      expect(widget.getUserDrawingState().selection).toBeNull();
      expect(onCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          command: expect.objectContaining({ type: 'delete', meta: { source: 'contextMenu' } }),
          source: 'contextMenu',
        }),
      );

      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        selection: { drawingId: 'h' },
      });
      const reorderItems = (
        widget as unknown as {
          _handleUserDrawingContextMenu(
            point: { x: number; y: number },
            spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
          ): Array<{ text: string; enabled: boolean; click: () => void }>;
        }
      )._handleUserDrawingContextMenu({ x: 50, y: 50 }, new Map([['main', userDrawingSpace]]));
      const bringForwardItem = reorderItems.find((item) => item.text === 'Bring selected drawing forward');
      expect(bringForwardItem).toMatchObject({ enabled: true });
      bringForwardItem?.click();

      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['far', 'h']);
      expect(widget.getUserDrawingState().selection).toEqual({ drawingId: 'h' });
      expect(onCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          command: expect.objectContaining({
            type: 'reorder',
            action: 'bringForward',
            meta: { source: 'contextMenu' },
          }),
          source: 'contextMenu',
        }),
      );

      widget.remove();
    });

    it('reorders selected or targeted drawings through the widget state owner', () => {
      const datafeed = createMockDatafeed();
      const onChange = vi.fn();
      const widget = createWidget(datafeed, { onUserDrawingStateChange: onChange });
      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        selection: { drawingId: 'a', drawingIds: ['a', 'c'] },
        drawings: [
          {
            id: 'a',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 50,
          },
          {
            id: 'b',
            kind: 'verticalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 2,
            updatedAt: 2,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            time: 20,
          },
          {
            id: 'c',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 3,
            updatedAt: 3,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 40,
          },
        ],
      });

      expect(widget.bringUserDrawingForward()).toBe(true);
      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['b', 'a', 'c']);
      expect(widget.getUserDrawingState().selection).toEqual({ drawingId: 'a', drawingIds: ['a', 'c'] });

      expect(widget.sendUserDrawingToBack({ drawingId: 'c' })).toBe(true);
      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['c', 'b', 'a']);
      expect(widget.undoUserDrawingCommand()).toBe(true);
      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['b', 'a', 'c']);
      expect(widget.redoUserDrawingCommand()).toBe(true);
      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['c', 'b', 'a']);

      expect(widget.reorderUserDrawings('bringToFront', { drawingId: 'missing' })).toBe(false);
      expect(onChange).toHaveBeenCalled();
    });

    it('applies public drawing style and property commands through the widget state owner', () => {
      const datafeed = createMockDatafeed();
      const onChange = vi.fn();
      const widget = createWidget(datafeed, { onUserDrawingStateChange: onChange });
      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        selection: { drawingId: 'line' },
        drawings: [
          {
            id: 'line',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 50,
          },
        ],
      });

      expect(widget.updateUserDrawingStyle({ lineColor: '#00ffcc', lineWidth: 3 })).toBe(true);
      expect(widget.getUserDrawingState().drawings[0]).toMatchObject({
        style: expect.objectContaining({ lineColor: '#00ffcc', lineWidth: 3 }),
      });
      expect(widget.undoUserDrawingCommand()).toBe(true);
      expect(widget.getUserDrawingState().drawings[0]).toMatchObject({
        style: expect.objectContaining({ lineColor: '#f5c542', lineWidth: 1 }),
      });
      expect(widget.redoUserDrawingCommand()).toBe(true);
      expect(widget.getUserDrawingState().drawings[0]).toMatchObject({
        style: expect.objectContaining({ lineColor: '#00ffcc', lineWidth: 3 }),
      });

      expect(widget.setUserDrawingLocked(true)).toBe(true);
      expect(widget.getUserDrawingState()).toMatchObject({
        selection: null,
        drawings: [expect.objectContaining({ id: 'line', locked: true })],
      });
      expect(widget.undoUserDrawingCommand()).toBe(true);
      expect(widget.getUserDrawingState()).toMatchObject({
        selection: { drawingId: 'line' },
        drawings: [expect.objectContaining({ id: 'line', locked: false })],
      });
      expect(widget.redoUserDrawingCommand()).toBe(true);
      expect(widget.getUserDrawingState()).toMatchObject({
        selection: null,
        drawings: [expect.objectContaining({ id: 'line', locked: true })],
      });

      expect(widget.updateUserDrawingStyle({ lineColor: '#ffffff' }, { drawingId: 'line' })).toBe(false);
      expect(widget.updateUserDrawingStyle({ lineColor: '#ffffff' }, { drawingId: 'line', includeLocked: true })).toBe(
        true,
      );
      expect(widget.getUserDrawingState().drawings[0]).toMatchObject({
        style: expect.objectContaining({ lineColor: '#ffffff' }),
      });

      expect(widget.setUserDrawingVisibility(false, { drawingId: 'line' })).toBe(false);
      expect(widget.setUserDrawingVisibility(false, { drawingId: 'line', includeLocked: true })).toBe(true);
      expect(widget.getUserDrawingState().drawings[0]).toMatchObject({ visible: false });
      expect(onChange).toHaveBeenCalled();
    });

    it('applies public global drawing visibility and lock actions through all drawing ids', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        drawings: [
          {
            id: 'line',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 50,
          },
          {
            id: 'locked-hidden',
            kind: 'verticalLine',
            paneId: 'main',
            visible: false,
            locked: true,
            createdAt: 2,
            updatedAt: 2,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            time: 20,
          },
        ],
      });

      expect(widget.hideAllUserDrawings()).toBe(true);
      expect(widget.getUserDrawingState().drawings.map((drawing) => [drawing.id, drawing.visible])).toEqual([
        ['line', false],
        ['locked-hidden', false],
      ]);
      expect(widget.hideAllUserDrawings()).toBe(false);

      expect(widget.showAllUserDrawings()).toBe(true);
      expect(widget.getUserDrawingState().drawings.map((drawing) => [drawing.id, drawing.visible])).toEqual([
        ['line', true],
        ['locked-hidden', true],
      ]);
      expect(widget.showAllUserDrawings()).toBe(false);

      expect(widget.lockAllUserDrawings()).toBe(true);
      expect(widget.getUserDrawingState().drawings.map((drawing) => [drawing.id, drawing.locked])).toEqual([
        ['line', true],
        ['locked-hidden', true],
      ]);
      expect(widget.lockAllUserDrawings()).toBe(false);

      expect(widget.unlockAllUserDrawings()).toBe(true);
      expect(widget.getUserDrawingState().drawings.map((drawing) => [drawing.id, drawing.locked])).toEqual([
        ['line', false],
        ['locked-hidden', false],
      ]);
      expect(widget.unlockAllUserDrawings()).toBe(false);

      expect(widget.clearUserDrawings()).toBe(true);
      expect(widget.hideAllUserDrawings()).toBe(false);
      expect(widget.showAllUserDrawings()).toBe(false);
      expect(widget.lockAllUserDrawings()).toBe(false);
      expect(widget.unlockAllUserDrawings()).toBe(false);
    });

    it('exposes object tree model, open callback, and shared action dispatch', () => {
      const datafeed = createMockDatafeed();
      const onOpenObjectTree = vi.fn();
      const onCommand = vi.fn<(event: UserDrawingCommandEvent) => void>();
      const widget = createWidget(datafeed, { onUserDrawingObjectTreeOpen: onOpenObjectTree, onUserDrawingCommand: onCommand });
      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        selection: { drawingId: 'line' },
        drawings: [
          {
            id: 'line',
            name: 'Breakout',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 50,
          },
          {
            id: 'target',
            kind: 'rectangle',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 2,
            updatedAt: 2,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            points: [
              { time: 1, price: 45 },
              { time: 2, price: 55 },
            ],
          },
        ],
      });

      expect(
        widget.getUserDrawingObjectTreeModel().rows.map((row) => [row.drawingId, row.label, row.selected]),
      ).toEqual([
        ['target', 'Rectangle', false],
        ['line', 'Breakout', true],
      ]);

      const opened = widget.openUserDrawingObjectTree();
      expect(onOpenObjectTree).toHaveBeenCalledWith(opened);
      expect(opened.rows).toHaveLength(2);

      onOpenObjectTree.mockClear();
      const contextItems = (
        widget as unknown as {
          _handleUserDrawingContextMenu(
            point: { x: number; y: number },
            spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
          ): Array<{ text: string; click: () => void }>;
        }
      )._handleUserDrawingContextMenu({ x: 50, y: 50 }, new Map([['main', userDrawingSpace]]));
      contextItems.find((item) => item.text === 'Open drawing object tree')?.click();
      expect(onOpenObjectTree).toHaveBeenCalledWith(expect.objectContaining({ rows: expect.any(Array) }));

      const targetRow = widget.getUserDrawingObjectTreeModel().rows.find((row) => row.drawingId === 'target')!;
      const hideTargetAction = resolveUserDrawingObjectTreeRowDispatchAction(targetRow, 'hide');
      expect(hideTargetAction).toEqual({ type: 'hide', drawingIds: ['target'], includeLocked: true });
      onCommand.mockClear();
      expect(hideTargetAction && widget.dispatchUserDrawingObjectTreeAction(hideTargetAction)).toBe(true);
      expect(widget.getUserDrawingState().drawings).toEqual([
        expect.objectContaining({ id: 'line', visible: true }),
        expect.objectContaining({ id: 'target', visible: false }),
      ]);
      expect(widget.getUserDrawingState().selection).toEqual({ drawingId: 'line' });
      expect(onCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          command: expect.objectContaining({
            type: 'setVisibility',
            visible: false,
            meta: { source: 'objectTree', affectedIds: ['target'] },
          }),
          source: 'objectTree',
        }),
      );

      onCommand.mockClear();
      expect(widget.dispatchUserDrawingObjectTreeAction({ type: 'lock', drawingIds: ['target'] })).toBe(true);
      expect(onCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          command: expect.objectContaining({
            type: 'setLocked',
            locked: true,
            meta: { source: 'objectTree', affectedIds: ['target'] },
          }),
          source: 'objectTree',
        }),
      );
      const lockedTargetRow = widget.getUserDrawingObjectTreeModel().rows.find((row) => row.drawingId === 'target')!;
      const unlockTargetAction = resolveUserDrawingObjectTreeRowDispatchAction(lockedTargetRow, 'unlock');
      expect(unlockTargetAction).toEqual({ type: 'unlock', drawingIds: ['target'], includeLocked: true });
      onCommand.mockClear();
      expect(unlockTargetAction && widget.dispatchUserDrawingObjectTreeAction(unlockTargetAction)).toBe(true);
      expect(widget.getUserDrawingState().drawings.find((drawing) => drawing.id === 'target')).toMatchObject({
        locked: false,
      });
      expect(onCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          command: expect.objectContaining({
            type: 'setLocked',
            locked: false,
            meta: { source: 'objectTree', affectedIds: ['target'] },
          }),
          source: 'objectTree',
        }),
      );

      expect(widget.dispatchUserDrawingObjectTreeAction({ type: 'select', drawingId: 'target', additive: true })).toBe(
        true,
      );
      const selectedHideAction = resolveUserDrawingObjectTreeSelectionDispatchAction(
        widget.getUserDrawingObjectTreeModel(),
        'hide',
      );
      expect(selectedHideAction).toEqual({
        type: 'hide',
        drawingIds: ['line', 'target'],
        includeLocked: true,
      });
      expect(selectedHideAction && widget.dispatchUserDrawingObjectTreeAction(selectedHideAction)).toBe(true);
      expect(widget.getUserDrawingState().drawings.map((drawing) => [drawing.id, drawing.visible])).toEqual([
        ['line', false],
        ['target', false],
      ]);

      const renameTargetAction = resolveUserDrawingObjectTreeDrawingDispatchAction(
        widget.getUserDrawingObjectTreeModel(),
        'target',
        'rename',
        { name: 'Range box' },
      );
      expect(renameTargetAction).toEqual({
        type: 'rename',
        drawingId: 'target',
        name: 'Range box',
        includeLocked: undefined,
      });
      onCommand.mockClear();
      expect(renameTargetAction && widget.dispatchUserDrawingObjectTreeAction(renameTargetAction)).toBe(true);
      expect(widget.getUserDrawingObjectTreeModel().rows[0]).toMatchObject({
        drawingId: 'target',
        label: 'Range box',
        customName: 'Range box',
      });
      expect(onCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          command: expect.objectContaining({
            type: 'setName',
            drawingId: 'target',
            name: 'Range box',
            meta: { source: 'objectTree', affectedIds: ['target'] },
          }),
          source: 'objectTree',
        }),
      );

      expect(widget.dispatchUserDrawingObjectTreeAction({ type: 'duplicate', drawingIds: ['line'] })).toBe(true);
      expect(widget.getUserDrawingState()).toMatchObject({
        selection: { drawingId: 'drawing_1' },
        drawings: [
          expect.objectContaining({ id: 'line', name: 'Breakout' }),
          expect.objectContaining({ id: 'drawing_1', name: 'Breakout' }),
          expect.objectContaining({ id: 'target', name: 'Range box' }),
        ],
      });
    });

    it('opens the built-in web object tree panel when no app-owned callback is provided', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      const testWidget = widget as unknown as { _isHovered: boolean };
      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        selection: { drawingId: 'line' },
        drawings: [
          {
            id: 'line',
            name: 'Breakout',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 50,
          },
          {
            id: 'target',
            kind: 'rectangle',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 2,
            updatedAt: 2,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            points: [
              { time: 1, price: 45 },
              { time: 2, price: 55 },
            ],
          },
        ],
      });

      widget.openUserDrawingObjectTree();

      let panel = document.querySelector<HTMLElement>('[aria-label="Drawing object tree"]');
      expect(panel).not.toBeNull();
      expect(panel?.textContent).toContain('Drawings (2)');
      const rectangleRow = panel?.querySelector<HTMLElement>('[aria-label="Select Rectangle"]');
      expect(rectangleRow?.getAttribute('aria-pressed')).toBe('false');

      const onChartMouseDown = vi.fn();
      const onChartMouseUp = vi.fn();
      const onChartClick = vi.fn();
      const onChartContextMenu = vi.fn();
      document.body.addEventListener('mousedown', onChartMouseDown);
      document.body.addEventListener('mouseup', onChartMouseUp);
      document.body.addEventListener('click', onChartClick);
      document.body.addEventListener('contextmenu', onChartContextMenu);
      try {
        panel?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        panel?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        panel?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        panel?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
        expect(onChartMouseDown).not.toHaveBeenCalled();
        expect(onChartMouseUp).not.toHaveBeenCalled();
        expect(onChartClick).not.toHaveBeenCalled();
        expect(onChartContextMenu).not.toHaveBeenCalled();
      } finally {
        document.body.removeEventListener('mousedown', onChartMouseDown);
        document.body.removeEventListener('mouseup', onChartMouseUp);
        document.body.removeEventListener('click', onChartClick);
        document.body.removeEventListener('contextmenu', onChartContextMenu);
      }

      rectangleRow?.click();
      expect(widget.getUserDrawingState().selection).toEqual({ drawingId: 'target' });
      expect(panel?.querySelector<HTMLElement>('[aria-label="Select Rectangle"]')?.getAttribute('aria-pressed')).toBe(
        'true',
      );
      panel?.querySelector<HTMLButtonElement>('[aria-label="Rename drawing"]')?.click();
      const renameInput = panel?.querySelector<HTMLInputElement>('[aria-label="Rename Rectangle"]');
      expect(renameInput).not.toBeNull();
      renameInput!.value = 'Range box';
      renameInput!.dispatchEvent(new Event('input', { bubbles: true }));
      panel?.querySelector<HTMLButtonElement>('[aria-label="Save drawing name"]')?.click();
      expect(widget.getUserDrawingState().drawings.find((drawing) => drawing.id === 'target')).toMatchObject({
        name: 'Range box',
      });
      expect(panel?.textContent).toContain('Range box');

      testWidget._isHovered = true;
      const escape = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
      document.dispatchEvent(escape);

      expect(escape.defaultPrevented).toBe(true);
      expect(document.querySelector('[aria-label="Drawing object tree"]')).toBeNull();
      expect(widget.getUserDrawingState().selection).toEqual({ drawingId: 'target' });
      testWidget._isHovered = false;

      widget.openUserDrawingObjectTree();
      panel = document.querySelector<HTMLElement>('[aria-label="Drawing object tree"]');
      panel?.querySelector<HTMLButtonElement>('[aria-label="Hide drawing"]')?.click();
      expect(widget.getUserDrawingState().drawings.find((drawing) => drawing.id === 'target')).toMatchObject({
        visible: false,
      });
      expect(panel?.textContent).toContain('hidden');
      panel?.querySelector<HTMLButtonElement>('[aria-label="Send drawing to back"]')?.click();
      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['target', 'line']);
      expect(panel?.textContent).toContain('Back');
      panel = document.querySelector<HTMLElement>('[aria-label="Drawing object tree"]');
      const bringToFrontButtons = panel?.querySelectorAll<HTMLButtonElement>('[aria-label="Bring drawing to front"]');
      bringToFrontButtons?.[bringToFrontButtons.length - 1]?.click();
      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['line', 'target']);

      panel?.querySelector<HTMLButtonElement>('[aria-label="Close drawing object tree"]')?.click();
      expect(document.querySelector('[aria-label="Drawing object tree"]')).toBeNull();
      widget.remove();
    });

    it('exposes selected drawing properties intent and open callback', () => {
      const datafeed = createMockDatafeed();
      const onOpenProperties = vi.fn();
      const widget = createWidget(datafeed, { onUserDrawingPropertiesOpen: onOpenProperties });
      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        selection: { drawingId: 'line' },
        drawings: [
          {
            id: 'line',
            name: 'Breakout',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 50,
          },
          {
            id: 'target',
            kind: 'rectangle',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 2,
            updatedAt: 2,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            points: [
              { time: 1, price: 45 },
              { time: 2, price: 55 },
            ],
          },
          {
            id: 'locked',
            kind: 'rectangle',
            paneId: 'main',
            visible: true,
            locked: true,
            createdAt: 3,
            updatedAt: 3,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            points: [
              { time: 1, price: 45 },
              { time: 2, price: 55 },
            ],
          },
        ],
      });

      expect(widget.getUserDrawingPropertiesIntent()).toMatchObject({
        type: 'properties',
        drawingId: 'line',
        selected: true,
        editable: true,
        drawing: expect.objectContaining({ id: 'line', kind: 'horizontalLine' }),
      });
      expect(widget.getUserDrawingPropertiesIntent('locked')).toMatchObject({
        drawingId: 'locked',
        selected: false,
        editable: false,
        drawing: expect.objectContaining({ id: 'locked', kind: 'rectangle' }),
      });
      expect(widget.getUserDrawingPropertiesIntent('missing')).toBeNull();
      expect(widget.getUserDrawingPropertiesSurface().drawing).toMatchObject({ id: 'line', kind: 'horizontalLine' });
      expect(widget.getUserDrawingPropertiesSurface().groups.map((group) => group.id)).toEqual(['line']);
      expect(widget.getUserDrawingPropertiesSurface('locked')).toMatchObject({
        drawing: { id: 'locked', kind: 'rectangle' },
        editable: false,
      });
      expect(
        widget
          .getUserDrawingPropertiesSurface('locked')
          .groups.flatMap((group) => group.controls)
          .every((control) => control.enabled === false),
      ).toBe(true);
      expect(
        widget.dispatchUserDrawingPropertiesSurfaceCommand(
          { type: 'updateStyle', style: { lineColor: '#38bdf8' } },
          { drawingId: 'line' },
        ),
      ).toBe(true);
      expect(widget.getUserDrawingState().drawings.find((drawing) => drawing.id === 'line')?.style.lineColor).toBe(
        '#38bdf8',
      );

      const opened = widget.openUserDrawingProperties('locked');
      expect(onOpenProperties).toHaveBeenCalledWith(opened);
      expect(opened).toMatchObject({ drawingId: 'locked', editable: false });
      widget.remove();
    });

    it('opens the built-in web properties panel when no app-owned callback is provided', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      const testWidget = widget as unknown as { _isHovered: boolean };
      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        selection: { drawingId: 'line' },
        drawings: [
          {
            id: 'line',
            name: 'Breakout',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 50,
          },
          {
            id: 'target',
            kind: 'rectangle',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 2,
            updatedAt: 2,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            points: [
              { time: 1, price: 45 },
              { time: 2, price: 55 },
            ],
          },
          {
            id: 'locked',
            kind: 'rectangle',
            paneId: 'main',
            visible: true,
            locked: true,
            createdAt: 3,
            updatedAt: 3,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            points: [
              { time: 1, price: 45 },
              { time: 2, price: 55 },
            ],
          },
          {
            id: 'marker',
            kind: 'highlighter',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 4,
            updatedAt: 4,
            style: {
              lineColor: '#f5c542',
              lineWidth: 8,
              lineStyle: 'solid',
              opacity: 0.35,
            },
            points: [
              { time: 1, price: 45 },
              { time: 2, price: 55 },
              { time: 3, price: 50 },
            ],
          },
        ],
      });

      widget.openUserDrawingProperties();

      let panel = document.querySelector<HTMLElement>('[aria-label="Drawing properties"]');
      expect(panel).not.toBeNull();
      expect(panel?.textContent).toContain('horizontalLine properties');
      panel?.querySelector<HTMLButtonElement>('[aria-label="Blue line color"]')?.click();
      expect(widget.getUserDrawingState().drawings.find((drawing) => drawing.id === 'line')?.style.lineColor).toBe(
        '#38bdf8',
      );

      testWidget._isHovered = true;
      const escape = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
      document.dispatchEvent(escape);

      expect(escape.defaultPrevented).toBe(true);
      expect(document.querySelector('[aria-label="Drawing properties"]')).toBeNull();
      expect(widget.getUserDrawingState().selection).toEqual({ drawingId: 'line' });
      testWidget._isHovered = false;

      widget.openUserDrawingProperties('target');
      panel = document.querySelector<HTMLElement>('[aria-label="Drawing properties"]');
      panel?.querySelector<HTMLButtonElement>('[aria-label="Blue line color"]')?.click();
      expect(widget.getUserDrawingState().drawings.find((drawing) => drawing.id === 'target')?.style.lineColor).toBe(
        '#38bdf8',
      );
      expect(widget.getUserDrawingState().drawings.find((drawing) => drawing.id === 'line')?.style.lineColor).toBe(
        '#38bdf8',
      );

      widget.openUserDrawingProperties('marker');
      panel = document.querySelector<HTMLElement>('[aria-label="Drawing properties"]');
      expect(panel?.textContent).toContain('Stroke');
      expect(
        panel
          ?.querySelector<HTMLButtonElement>('[aria-label="Medium highlighter stroke width"]')
          ?.getAttribute('aria-pressed'),
      ).toBe('true');
      panel?.querySelector<HTMLButtonElement>('[aria-label="Extra wide highlighter stroke width"]')?.click();
      expect(widget.getUserDrawingState().drawings.find((drawing) => drawing.id === 'marker')?.style.lineWidth).toBe(
        28,
      );

      widget.openUserDrawingProperties('locked');
      panel = document.querySelector<HTMLElement>('[aria-label="Drawing properties"]');
      const lockedLineColor = panel?.querySelector<HTMLButtonElement>('[aria-label="Blue line color"]');
      expect(lockedLineColor?.getAttribute('aria-disabled')).toBe('true');
      lockedLineColor?.click();
      expect(widget.getUserDrawingState().drawings.find((drawing) => drawing.id === 'locked')?.style.lineColor).toBe(
        '#f5c542',
      );

      panel?.querySelector<HTMLButtonElement>('[aria-label="Close drawing properties"]')?.click();
      expect(document.querySelector('[aria-label="Drawing properties"]')).toBeNull();
      widget.remove();
    });

    it('defines public drawing API failure returns for unavailable targets and callbacks', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        selection: { drawingId: 'locked' },
        drawings: [
          {
            id: 'locked',
            kind: 'textLabel',
            paneId: 'main',
            visible: true,
            locked: true,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            point: { time: 1, price: 50 },
            text: 'Locked label',
            textAlign: 'center',
          },
        ],
      });

      expect(widget.deleteUserDrawing('missing')).toBe(false);
      expect(widget.duplicateUserDrawing('missing')).toBe(false);
      expect(widget.reorderUserDrawings('bringToFront', { drawingId: 'missing' })).toBe(false);
      expect(widget.updateUserDrawingStyle({ lineColor: '#ffffff' }, { drawingId: 'locked' })).toBe(false);
      expect(widget.beginUserDrawingTextEdit('locked')).toBe(false);
      expect(widget.beginUserDrawingTextEdit()).toBe(false);

      expect(() => widget.openUserDrawingObjectTree()).not.toThrow();
      expect(widget.openUserDrawingObjectTree().rows).toHaveLength(1);
      expect(widget.openUserDrawingProperties('missing')).toBeNull();
      expect(widget.getUserDrawingPropertiesIntent('missing')).toBeNull();
      expect(
        widget.updateUserDrawingStyle({ lineColor: '#ffffff' }, { drawingId: 'locked', includeLocked: true }),
      ).toBe(true);
    });

    it('applies public image source commands through the widget state owner', () => {
      const datafeed = createMockDatafeed();
      const onChange = vi.fn();
      const widget = createWidget(datafeed, { onUserDrawingStateChange: onChange });
      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        selection: { drawingId: 'image' },
        drawings: [
          {
            id: 'image',
            kind: 'image',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            points: [
              { time: 40, price: 40 },
              { time: 60, price: 60 },
            ],
            src: '',
            alt: 'Image',
          },
        ],
      });

      expect(widget.setUserDrawingImageSource({ src: 'https://example.test/chart.png', alt: 'Chart snapshot' })).toBe(
        true,
      );
      expect(widget.getUserDrawingState().drawings[0]).toMatchObject({
        src: 'https://example.test/chart.png',
        alt: 'Chart snapshot',
      });
      expect(widget.setUserDrawingImageSource({ src: 'https://example.test/chart.png' })).toBe(false);
      expect(onChange).toHaveBeenCalled();
    });

    it('applies public table cell commands through the widget state owner', () => {
      const datafeed = createMockDatafeed();
      const onChange = vi.fn();
      const widget = createWidget(datafeed, { onUserDrawingStateChange: onChange });
      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        selection: { drawingId: 'table' },
        drawings: [
          {
            id: 'table',
            kind: 'table',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            point: { time: 50, price: 50 },
            textAlign: 'left',
            cells: [['Metric', 'Value']],
          },
        ],
      });

      expect(
        widget.setUserDrawingTableCells([
          ['Metric', 'Value'],
          ['Price', 101.25],
        ]),
      ).toBe(true);
      expect(widget.getUserDrawingState().drawings[0]).toMatchObject({
        cells: [
          ['Metric', 'Value'],
          ['Price', '101.25'],
        ],
      });
      expect(
        widget.setUserDrawingTableCells([
          ['Metric', 'Value'],
          ['Price', '101.25'],
        ]),
      ).toBe(false);
      expect(widget.setUserDrawingTableCell(1, 1, 102.5)).toBe(true);
      expect(widget.getUserDrawingState().drawings[0]).toMatchObject({
        cells: [
          ['Metric', 'Value'],
          ['Price', '102.5'],
        ],
      });
      expect(widget.setUserDrawingTableCell(1, 1, '102.5')).toBe(false);
      expect(widget.setUserDrawingTableDimensions(3, 3)).toBe(true);
      expect(widget.getUserDrawingState().drawings[0]).toMatchObject({
        cells: [
          ['Metric', 'Value', ''],
          ['Price', '102.5', ''],
          ['', '', ''],
        ],
      });
      expect(widget.setUserDrawingTableDimensions(3, 3)).toBe(false);
      expect(widget.insertUserDrawingTableRow(1, ['Volume', 10_000, 'Spot'])).toBe(true);
      expect(widget.deleteUserDrawingTableColumn(2)).toBe(true);
      expect(widget.insertUserDrawingTableColumn(1, ['Type', 'Total', 'Spot'])).toBe(true);
      expect(widget.deleteUserDrawingTableRow(3)).toBe(true);
      expect(widget.getUserDrawingState().drawings[0]).toMatchObject({
        cells: [
          ['Metric', 'Type', 'Value'],
          ['Volume', 'Total', '10000'],
          ['Price', 'Spot', '102.5'],
        ],
      });
      expect(widget.deleteUserDrawingTableRow(10)).toBe(false);
      expect(widget.insertUserDrawingTableColumn(Number.NaN)).toBe(false);
      expect(onChange).toHaveBeenCalled();
    });

    it('applies public text drawing edit commands through the widget state owner', () => {
      const datafeed = createMockDatafeed();
      const onChange = vi.fn();
      const widget = createWidget(datafeed, { onUserDrawingStateChange: onChange });
      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        drawings: [
          {
            id: 'label',
            kind: 'textLabel',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            point: { time: 50, price: 50 },
            text: 'Note',
            textAlign: 'center',
          },
        ],
      });

      expect(widget.beginUserDrawingTextEdit('label')).toBe(true);
      expect(widget.getUserDrawingState().textEdit).toMatchObject({
        drawingId: 'label',
        value: 'Note',
      });

      expect(widget.updateUserDrawingTextEdit('Updated')).toBe(true);
      expect(widget.commitUserDrawingTextEdit()).toBe(true);
      expect(widget.getUserDrawingState().textEdit).toBeNull();
      expect(widget.getUserDrawingState().drawings[0]).toMatchObject({
        id: 'label',
        text: 'Updated',
      });

      expect(widget.setUserDrawingText('label', 'Direct')).toBe(true);
      expect(widget.getUserDrawingState().drawings[0]).toMatchObject({ text: 'Direct' });
      expect(widget.setUserDrawingTextContent('Selected direct')).toBe(true);
      expect(widget.getUserDrawingState().drawings[0]).toMatchObject({ text: 'Selected direct' });
      expect(widget.setUserDrawingTextContent('Selected direct')).toBe(false);

      expect(widget.beginUserDrawingTextEdit('label')).toBe(true);
      expect(widget.updateUserDrawingTextEdit('Draft')).toBe(true);
      expect(widget.cancelUserDrawingTextEdit()).toBe(true);
      expect(widget.getUserDrawingState().drawings[0]).toMatchObject({ text: 'Selected direct' });

      const contextItems = (
        widget as unknown as {
          _handleUserDrawingContextMenu(
            point: { x: number; y: number },
            spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
          ): Array<{ text: string; click: () => void }>;
        }
      )._handleUserDrawingContextMenu({ x: 50, y: 50 }, new Map([['main', userDrawingSpace]]));
      contextItems.find((item) => item.text === 'Edit drawing text')?.click();
      expect(widget.getUserDrawingState().textEdit).toMatchObject({ drawingId: 'label', value: 'Selected direct' });
      expect(widget.cancelUserDrawingTextEdit()).toBe(true);
      expect(onChange).toHaveBeenCalled();
    });

    it('opens text editing on text-label double-click instead of maximizing the pane', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        activeTool: 'select',
        drawings: [
          {
            id: 'label',
            kind: 'textLabel',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            point: { time: 50, price: 50 },
            text: 'Note',
            textAlign: 'center',
          },
        ],
      });
      const testWidget = widget as unknown as {
        _paneManager: { toggleMaximizePane: ReturnType<typeof vi.fn> };
        _handlePaneDoubleClick(
          paneId: string,
          point: { x: number; y: number },
          spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
        ): void;
      };
      testWidget._paneManager.toggleMaximizePane = vi.fn();

      testWidget._handlePaneDoubleClick('main', { x: 50, y: 50 }, new Map([['main', userDrawingSpace]]));

      expect(widget.getUserDrawingState().textEdit).toMatchObject({
        drawingId: 'label',
        value: 'Note',
      });
      expect(testWidget._paneManager.toggleMaximizePane).not.toHaveBeenCalled();

      widget.cancelUserDrawingTextEdit();
      testWidget._handlePaneDoubleClick('main', { x: 95, y: 5 }, new Map([['main', userDrawingSpace]]));

      expect(testWidget._paneManager.toggleMaximizePane).toHaveBeenCalledWith('main');

      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        selection: null,
        textEdit: null,
        drawings: [{ ...widget.getUserDrawingState().drawings[0]!, locked: true }],
      });
      testWidget._paneManager.toggleMaximizePane.mockClear();
      testWidget._handlePaneDoubleClick('main', { x: 50, y: 50 }, new Map([['main', userDrawingSpace]]));

      expect(widget.getUserDrawingState().textEdit).toBeNull();
      expect(testWidget._paneManager.toggleMaximizePane).toHaveBeenCalledWith('main');
    });

    it('does not record cancelled web click placements in drawing undo history', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      const testWidget = widget as unknown as {
        _handleUserDrawingInput(point: {
          paneId: string;
          anchor: { time: number; price: number };
        }): boolean;
      };
      widget.setActiveUserDrawingTool('rectangle');

      expect(
        testWidget._handleUserDrawingInput({
          paneId: 'main',
          anchor: { time: 1_000, price: 100 },
        }),
      ).toBe(true);
      expect(widget.getUserDrawingState().draft).toMatchObject({
        tool: 'rectangle',
        anchors: [{ time: 1_000, price: 100 }],
      });
      expect(widget.canUndoUserDrawingCommand()).toBe(false);

      widget.cancelUserDrawingDraft();

      expect(widget.getUserDrawingState().drawings).toEqual([]);
      expect(widget.getUserDrawingState().draft).toBeNull();
      expect(widget.canUndoUserDrawingCommand()).toBe(false);
    });

    it('deletes the selected drawing from keyboard delete shortcuts only while chart owns input', () => {
      const datafeed = createMockDatafeed();
      const container = document.createElement('div');
      const input = document.createElement('input');
      const button = document.createElement('button');
      const onChange = vi.fn();
      container.appendChild(input);
      container.appendChild(button);
      const widget = createWidget(datafeed, { container, onUserDrawingStateChange: onChange });
      const testWidget = widget as unknown as { _isHovered: boolean };
      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        selection: { drawingId: 'h' },
        drawings: [
          {
            id: 'h',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 50,
          },
        ],
      });

      testWidget._isHovered = true;
      const inputDelete = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true });
      input.dispatchEvent(inputDelete);

      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['h']);
      expect(inputDelete.defaultPrevented).toBe(false);

      const modifiedDelete = new KeyboardEvent('keydown', { key: 'Backspace', metaKey: true, cancelable: true });
      document.dispatchEvent(modifiedDelete);

      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['h']);
      expect(modifiedDelete.defaultPrevented).toBe(false);

      const buttonDelete = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true });
      button.dispatchEvent(buttonDelete);

      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['h']);
      expect(buttonDelete.defaultPrevented).toBe(false);

      expect(widget.dispatchUserDrawingKeyboardAction({ key: 'Delete', focusOwner: 'textInput' })).toBe(false);
      expect(widget.dispatchUserDrawingKeyboardAction({ key: 'Delete', focusOwner: 'appControl' })).toBe(false);
      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['h']);

      const chartDelete = new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true });
      document.dispatchEvent(chartDelete);

      expect(widget.getUserDrawingState().drawings).toEqual([]);
      expect(widget.getUserDrawingState().selection).toBeNull();
      expect(chartDelete.defaultPrevented).toBe(true);
      expect(widget.canUndoUserDrawingCommand()).toBe(true);

      expect(widget.undoUserDrawingCommand()).toBe(true);
      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['h']);

      widget.remove();
    });

    it('does not capture drawing shortcuts from textarea, select, or contenteditable targets', () => {
      const datafeed = createMockDatafeed();
      const container = document.createElement('div');
      const textarea = document.createElement('textarea');
      const select = document.createElement('select');
      const option = document.createElement('option');
      const editable = document.createElement('div');
      const onChange = vi.fn();
      option.value = 'one';
      option.textContent = 'One';
      select.appendChild(option);
      editable.contentEditable = 'true';
      container.appendChild(textarea);
      container.appendChild(select);
      container.appendChild(editable);
      const widget = createWidget(datafeed, { container, onUserDrawingStateChange: onChange });
      const testWidget = widget as unknown as { _isHovered: boolean };
      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        selection: { drawingId: 'h' },
        drawings: [
          {
            id: 'h',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 50,
          },
        ],
      });

      testWidget._isHovered = true;
      for (const target of [textarea, select, editable]) {
        const event = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true });
        target.dispatchEvent(event);

        expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['h']);
        expect(event.defaultPrevented).toBe(false);
      }
      expect(widget.canUndoUserDrawingCommand()).toBe(false);
      expect(onChange).toHaveBeenCalledTimes(1);

      const chartDelete = new KeyboardEvent('keydown', { key: 'Delete', cancelable: true });
      document.dispatchEvent(chartDelete);

      expect(widget.getUserDrawingState().drawings).toEqual([]);
      expect(chartDelete.defaultPrevented).toBe(true);
      expect(widget.canUndoUserDrawingCommand()).toBe(true);

      widget.remove();
    });

    it('clears selected drawing actions with Escape while chart owns keyboard input', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      const testWidget = widget as unknown as { _isHovered: boolean };
      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        activeTool: 'select',
        selection: { drawingId: 'h' },
        drawings: [
          {
            id: 'h',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 50,
          },
        ],
      });
      testWidget._isHovered = true;

      const escape = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
      document.dispatchEvent(escape);

      expect(widget.getUserDrawingState().selection).toBeNull();
      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['h']);
      expect(widget.canUndoUserDrawingCommand()).toBe(false);
      expect(escape.defaultPrevented).toBe(true);

      widget.remove();
    });

    it('undoes and redoes drawing commands from keyboard shortcuts while chart owns input', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      const testWidget = widget as unknown as { _isHovered: boolean };
      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        selection: { drawingId: 'h' },
        drawings: [
          {
            id: 'h',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 50,
          },
        ],
      });

      testWidget._isHovered = true;
      expect(widget.deleteSelectedUserDrawing()).toBe(true);
      expect(widget.canUndoUserDrawingCommand()).toBe(true);
      expect(widget.getUserDrawingState().drawings).toEqual([]);

      const undo = new KeyboardEvent('keydown', { key: 'z', metaKey: true, cancelable: true });
      document.dispatchEvent(undo);

      expect(undo.defaultPrevented).toBe(true);
      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['h']);
      expect(widget.canRedoUserDrawingCommand()).toBe(true);

      const redo = new KeyboardEvent('keydown', { key: 'Z', metaKey: true, shiftKey: true, cancelable: true });
      document.dispatchEvent(redo);

      expect(redo.defaultPrevented).toBe(true);
      expect(widget.getUserDrawingState().drawings).toEqual([]);

      widget.remove();
    });

    it('clears redo when a new web drawing command lands after undo', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        selection: { drawingId: 'h' },
        drawings: [
          {
            id: 'h',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 50,
          },
        ],
      });

      expect(widget.duplicateSelectedUserDrawing()).toBe(true);
      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['h', 'drawing_1']);
      expect(widget.undoUserDrawingCommand()).toBe(true);
      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['h']);
      expect(widget.canRedoUserDrawingCommand()).toBe(true);

      expect(widget.duplicateSelectedUserDrawing()).toBe(true);
      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['h', 'drawing_2']);
      expect(widget.canRedoUserDrawingCommand()).toBe(false);
      expect(widget.redoUserDrawingCommand()).toBe(false);
      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['h', 'drawing_2']);

      widget.remove();
    });

    it('copies and pastes selected drawings from keyboard shortcuts while chart owns input', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      const testWidget = widget as unknown as { _isHovered: boolean };
      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        selection: { drawingId: 'h' },
        drawings: [
          {
            id: 'h',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 50,
          },
        ],
      });

      testWidget._isHovered = true;
      const pasteWithoutClipboard = new KeyboardEvent('keydown', { key: 'v', metaKey: true, cancelable: true });
      document.dispatchEvent(pasteWithoutClipboard);

      expect(pasteWithoutClipboard.defaultPrevented).toBe(false);
      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['h']);

      const copy = new KeyboardEvent('keydown', { key: 'c', metaKey: true, cancelable: true });
      document.dispatchEvent(copy);

      expect(copy.defaultPrevented).toBe(true);
      expect(widget.canUndoUserDrawingCommand()).toBe(false);

      const paste = new KeyboardEvent('keydown', { key: 'v', metaKey: true, cancelable: true });
      document.dispatchEvent(paste);

      expect(paste.defaultPrevented).toBe(true);
      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['h', 'drawing_1']);
      expect(widget.getUserDrawingState().selection).toEqual({ drawingId: 'drawing_1' });
      expect(widget.canUndoUserDrawingCommand()).toBe(true);

      expect(widget.undoUserDrawingCommand()).toBe(true);
      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['h']);

      widget.remove();
    });

    it('duplicates selected drawings from keyboard shortcuts while chart owns input', () => {
      const datafeed = createMockDatafeed();
      const container = document.createElement('div');
      const input = document.createElement('input');
      container.appendChild(input);
      const widget = createWidget(datafeed, { container });
      const testWidget = widget as unknown as { _isHovered: boolean };
      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        selection: { drawingId: 'h' },
        drawings: [
          {
            id: 'h',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 50,
          },
        ],
      });

      testWidget._isHovered = true;
      const inputDuplicate = new KeyboardEvent('keydown', { key: 'd', metaKey: true, bubbles: true, cancelable: true });
      input.dispatchEvent(inputDuplicate);

      expect(inputDuplicate.defaultPrevented).toBe(false);
      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['h']);

      const chartDuplicate = new KeyboardEvent('keydown', { key: 'd', metaKey: true, cancelable: true });
      document.dispatchEvent(chartDuplicate);

      expect(chartDuplicate.defaultPrevented).toBe(true);
      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['h', 'drawing_1']);
      expect(widget.getUserDrawingState().selection).toEqual({ drawingId: 'drawing_1' });
      expect(widget.canUndoUserDrawingCommand()).toBe(true);

      expect(widget.undoUserDrawingCommand()).toBe(true);
      expect(widget.getUserDrawingState().drawings.map((drawing) => drawing.id)).toEqual(['h']);

      widget.remove();
    });

    it('selects all drawings from keyboard shortcuts while chart owns input', () => {
      const datafeed = createMockDatafeed();
      const container = document.createElement('div');
      const input = document.createElement('input');
      container.appendChild(input);
      const widget = createWidget(datafeed, { container });
      const testWidget = widget as unknown as { _isHovered: boolean };
      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        selection: null,
        drawings: [
          {
            id: 'h',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 50,
          },
          {
            id: 'v',
            kind: 'verticalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            time: 20,
          },
        ],
      });

      testWidget._isHovered = true;
      const inputSelectAll = new KeyboardEvent('keydown', { key: 'a', metaKey: true, bubbles: true, cancelable: true });
      input.dispatchEvent(inputSelectAll);

      expect(inputSelectAll.defaultPrevented).toBe(false);
      expect(widget.getUserDrawingState().selection).toBeNull();

      const chartSelectAll = new KeyboardEvent('keydown', { key: 'a', metaKey: true, cancelable: true });
      document.dispatchEvent(chartSelectAll);

      expect(chartSelectAll.defaultPrevented).toBe(true);
      expect(widget.getUserDrawingState().selection).toEqual({ drawingId: 'h', drawingIds: ['h', 'v'] });
      expect(widget.canUndoUserDrawingCommand()).toBe(false);

      widget.remove();
    });

    it('nudges selected drawings from arrow keys while chart owns input', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      const testWidget = widget as unknown as {
        _isHovered: boolean;
        _ui?: {
          getChartCore?: () => {
            getUserDrawingSpacesForCurrentViewport: () => Map<string, DrawingCoordinateSpace>;
          };
        };
      };
      testWidget._ui!.getChartCore = () => ({
        getUserDrawingSpacesForCurrentViewport: () => new Map([['main', userDrawingSpace]]),
      });
      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        selection: { drawingId: 'line' },
        drawings: [
          {
            id: 'line',
            kind: 'trendLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            points: [
              { time: 10, price: 20 },
              { time: 20, price: 40 },
            ],
            extend: 'none',
          },
        ],
      });

      testWidget._isHovered = true;
      const nudge = new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true });
      document.dispatchEvent(nudge);

      const [moved] = widget.getUserDrawingState().drawings;
      expect(nudge.defaultPrevented).toBe(true);
      expect(moved).toMatchObject({
        id: 'line',
        kind: 'trendLine',
        points: [
          { time: 11, price: 20 },
          { time: 21, price: 40 },
        ],
      });
      expect(widget.canUndoUserDrawingCommand()).toBe(true);

      expect(widget.undoUserDrawingCommand()).toBe(true);
      expect(widget.getUserDrawingState().drawings[0]).toMatchObject({
        id: 'line',
        kind: 'trendLine',
        points: [
          { time: 10, price: 20 },
          { time: 20, price: 40 },
        ],
      });

      widget.remove();
    });

    it('clears drawing command history when user drawing state is externally replaced', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      widget.setUserDrawingState({
        ...widget.getUserDrawingState(),
        selection: { drawingId: 'h' },
        drawings: [
          {
            id: 'h',
            kind: 'horizontalLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              lineColor: '#f5c542',
              lineWidth: 1,
              lineStyle: 'solid',
            },
            price: 50,
          },
        ],
      });

      expect(widget.deleteSelectedUserDrawing()).toBe(true);
      expect(widget.canUndoUserDrawingCommand()).toBe(true);

      widget.setUserDrawingState(createUserDrawingState());

      expect(widget.canUndoUserDrawingCommand()).toBe(false);
      expect(widget.undoUserDrawingCommand()).toBe(false);
      expect(widget.getUserDrawingState().drawings).toEqual([]);

      widget.remove();
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

    it('initial load resolves prefixed symbols while storing the clean symbol', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed, { symbol: 'BYBITV5:BTCUSDT' });

      expect(widget.symbol()).toBe('BTCUSDT');
      expect(datafeed._resolveSymbolCalls).toContain('BYBITV5:BTCUSDT');
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
    it('accepts numeric legacy intervals from consumers', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed, { interval: 60 });
      completeInit(datafeed);

      expect(widget.resolution()).toBe('60');
      expect(datafeed._getBarsCalls[datafeed._getBarsCalls.length - 1].resolution).toBe('60');
    });

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

    it('setResolution normalizes numeric legacy intervals before datafeed calls', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      completeInit(datafeed);

      widget.chart().setResolution(15);
      datafeed._resolveSymbolCb?.(defaultSymbolInfo);

      expect(widget.resolution()).toBe('15');
      expect(datafeed._getBarsCalls[datafeed._getBarsCalls.length - 1].resolution).toBe('15');
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

    it('setSymbol reloads when the exchange prefix changes for the same clean symbol', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed, { symbol: 'BYBITV5:BTCUSDT' });
      completeInit(datafeed, makeBars(10, 1000000, 60000, 50000), {
        ...defaultSymbolInfo,
        name: 'BTCUSDT',
        full_name: 'BYBITV5:BTCUSDT',
        ticker: 'BYBITV5:BTCUSDT',
        exchange: 'BYBITV5',
      });

      widget.setSymbol('BINANCE:BTCUSDT');

      expect(widget.symbol()).toBe('BTCUSDT');
      expect(datafeed._resolveSymbolCalls).toContain('BINANCE:BTCUSDT');
      datafeed._resolveSymbolCb?.({
        ...defaultSymbolInfo,
        name: 'BTCUSDT',
        full_name: 'BINANCE:BTCUSDT',
        ticker: 'BINANCE:BTCUSDT',
        exchange: 'BINANCE',
      });
      expect(datafeed._getBarsCalls[datafeed._getBarsCalls.length - 1].symbolInfo.full_name).toBe(
        'BINANCE:BTCUSDT',
      );
    });

    it('resetData resolves the current full symbol when symbol info has an exchange prefix', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed, { symbol: 'BYBITV5:BTCUSDT' });
      completeInit(datafeed, makeBars(10, 1000000, 60000, 50000), {
        ...defaultSymbolInfo,
        name: 'BTCUSDT',
        full_name: 'BYBITV5:BTCUSDT',
        ticker: 'BYBITV5:BTCUSDT',
        exchange: 'BYBITV5',
      });

      widget.chart().resetData();

      expect(datafeed._resolveSymbolCalls[datafeed._resolveSymbolCalls.length - 1]).toBe(
        'BYBITV5:BTCUSDT',
      );
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

    it('activeChart().symbolExt() exposes TradingView-compatible symbol info', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      completeInit(datafeed, undefined, { ...defaultSymbolInfo, name: 'BTCUSDT', exchange: 'BYBITV5' });

      expect(widget.activeChart().symbolExt()).toMatchObject({
        name: 'BTCUSDT',
        symbol: 'BTCUSDT',
        exchange: 'BYBITV5',
      });
    });

    it('activeChart().symbolExt() derives symbol from full_name when resolved info is sparse', () => {
      const datafeed = createMockDatafeed();
      const widget = createWidget(datafeed);
      completeInit(datafeed, undefined, {
        ...defaultSymbolInfo,
        name: undefined as unknown as string,
        full_name: 'BYBITV5:BTCUSDT',
        ticker: 'BYBITV5:BTCUSDT',
        exchange: 'BYBITV5',
      });

      expect(widget.activeChart().symbolExt()).toMatchObject({
        name: 'BTCUSDT',
        symbol: 'BTCUSDT',
        full_name: 'BYBITV5:BTCUSDT',
        exchange: 'BYBITV5',
      });
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
