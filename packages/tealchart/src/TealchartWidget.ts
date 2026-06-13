/**
 * TealchartWidget - TradingView-compatible widget class
 * Mirrors TradingView's IChartingLibraryWidget for drop-in replacement
 */

import type {
  DrawingOutput,
  IndicatorDeclarationMetadata,
  PlotOutput,
  TealscriptRuntimeOptions,
} from '@tealstreet/tealscript';
import type {
  DrawingCoordinateSpace,
  DrawingScreenPoint,
  UserDrawingObjectTreeAction,
  UserDrawingObjectTreeDispatchAction,
  UserDrawingObjectTreeModel,
  UserDrawingObjectTreeOptions,
  UserDrawingContextActionItem,
  UserDrawingEditDrag,
  UserDrawingCommandHistory,
  UserDrawingHandleRole,
  UserDrawingHitTestOptions,
  UserDrawingIconName,
  UserDrawingImageSourceInput,
  UserDrawingInputPoint,
  UserDrawingSelectionAtPointResult,
  UserDrawingSelectionInputOptions,
  UserDrawingState,
  UserDrawingStyle,
  UserDrawingTableCellInput,
  UserDrawingTableCellsInput,
  UserDrawingTableColumnInput,
  UserDrawingTableRowInput,
  UserDrawingTextAnnotation,
  UserDrawingTextAlign,
  UserDrawingTrendLineExtend,
  UserDrawingTool,
  UserDrawingZOrderAction,
  UpdateUserDrawingOptions,
} from './drawings';
import type { BuiltinIndicator } from './indicators/builtinIndicators';
import type { DirtyFlags } from './rendering/RenderScheduler';
import type { ChartSettings, ChartStore, IndicatorInstance, PlotStyleOverride } from './state/chartState';

import { LOADING_OPACITY } from './constants';
import {
  canRedoUserDrawingCommand as canRedoUserDrawingCommandHistory,
  canUndoUserDrawingCommand as canUndoUserDrawingCommandHistory,
  clearUserDrawingCommandHistory,
  createUserDrawingCommandHistory,
  createUserDrawingState,
  deserializeUserDrawingStateFromLayout,
  dispatchUserDrawingCommand,
  dispatchUserDrawingCommandWithHistory,
  isUserDrawingLayoutStateEqual,
  normalizeUserDrawingFontFamily,
  normalizeUserDrawingFontSize,
  redoUserDrawingCommand as redoUserDrawingCommandHistory,
  resolveUserDrawingContextActionsAtPoint,
  resolveUserDrawingEditIntentAtPoint,
  resolveUserDrawingObjectTreeActionCommands,
  resolveUserDrawingObjectTreeModel,
  serializeUserDrawingStateForLayout,
  undoUserDrawingCommand as undoUserDrawingCommandHistory,
} from './drawings';
import { LogCategory, TealchartLogger } from './debug/TealchartLogger';
import { EventEmitter } from './events/EventEmitter';
import { GapDetectionManager } from './GapDetectionManager';
import {
  getIndicatorById,
  isJailbreakIndicator,
  jailbreakInputsToInputDefinitions,
} from './indicators/builtinIndicators';
import { JailbreakIndicatorManager } from './jailbreak/JailbreakIndicatorManager';
import { PaneManager } from './rendering/PaneManager';
import { DIRTY, RenderScheduler } from './rendering/RenderScheduler';
import { getChartStore, hasChartStore } from './state/chartState';
import { generateIndicatorId } from './state/indicatorActions';
import { TealchartApi } from './TealchartApi';
import { TealscriptManager } from './tealscript/TealscriptManager';
import { chartThemeToRenderOptions, mergeChartThemeRenderOptions } from './theme';
import type { ChartThemeInput } from './theme';
import {
  Bar,
  ChartOverrides,
  ContextMenuItem,
  ContextMenuCallback,
  DEFAULT_RENDER_OPTIONS,
  GapDetectionErrorState,
  GapDetectionEvent,
  IBasicDataFeed,
  LibrarySymbolInfo,
  RenderOptions,
  ResolutionString,
  TealchartWidgetOptions,
  Viewport,
  WidgetEvent,
} from './types';
import { TealchartWidgetUI } from './ui/TealchartWidgetUI';
import { buildLastTradePriceLine } from './utils/buildLastTradePriceLine';
import { ViewportController } from './viewport/ViewportController';
import { intervalToMs } from './viewport/viewScale';

type EventCallback = (...args: unknown[]) => void;

/**
 * Main widget class (equivalent to TradingView's IChartingLibraryWidget)
 */
export class TealchartWidget {
  private _container: HTMLElement;
  private _options: TealchartWidgetOptions;
  private _datafeed: IBasicDataFeed;
  private _chartApi: TealchartApi;
  private _eventEmitter: EventEmitter;
  private _ui: TealchartWidgetUI | null = null;

  // Chart key for per-chart state persistence
  private _chartKey: string;

  // Chart state
  private _symbol: string;
  private _interval: ResolutionString;
  private _symbolInfo: LibrarySymbolInfo | null = null;
  private _bars: Bar[] = [];
  private _viewport: Viewport | null = null;
  private _isReady = false;
  private _readyCallbacks: Array<() => void> = [];

  // Render options derived from overrides
  private _renderOptions: Partial<RenderOptions> = {};

  // Context menu
  private _contextMenuCallback: ContextMenuCallback | null = null;

  // Keyboard shortcuts
  private _shortcuts: Map<string, (e: KeyboardEvent) => void> = new Map();

  // Subscription tracking
  private _barSubscriptionGuid: string | null = null;

  // Historical data loading
  private _isLoadingMoreBars = false;
  private _hasMoreHistoricalData = true;

  // Loading state for timeframe changes
  private _isLoadingBars = false;
  private _wasLoadingBars = false;
  private _loadBarsRequestId = 0;
  private _resolveSymbolRequestId = 0;
  private _disposed = false;

  // Tealscript indicator support
  private _tealScriptManager: TealscriptManager | null = null;
  private _plots: PlotOutput[] = [];
  private _drawings: DrawingOutput[] = [];
  private _userDrawingState: UserDrawingState;
  private _userDrawingHistory: UserDrawingCommandHistory = createUserDrawingCommandHistory();
  private _userDrawingEditDrag: UserDrawingEditDrag | null = null;
  private _userDrawingIdCounter = 0;
  private _userDrawingTextMeasureCtx: CanvasRenderingContext2D | null = null;

  // Jailbreak (canvas-drawing) indicator support
  private _jailbreakManager: JailbreakIndicatorManager | null = null;
  // Set of indicator instance IDs that are jailbreak indicators (for routing toggle/remove/settings)
  private _jailbreakInstanceIds = new Set<string>();

  // Nanostores for imperative state access
  private _chartStore: ChartStore | null = null;

  // Unified viewport controller for all panes (main + indicator)
  private _viewportController = new ViewportController();

  // Map from indicator instance ID to study ID (used for persistence tracking)
  private _indicatorStudyMap = new Map<string, string>();
  // Reverse map from study ID to indicator instance ID
  private _studyInstanceMap = new Map<string, string>();

  // Pane management for non-overlay indicators
  private _paneManager: PaneManager;
  // Map from study ID to indicator config (for pane lookup)
  private _indicatorConfigMap = new Map<string, BuiltinIndicator>();
  private _indicatorDeclarationMap = new Map<string, IndicatorDeclarationMetadata>();
  // Auto-save timer ID
  private _autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  // Throttled crosshair emission (50ms matches TradingView's throttle in useWidgetStateManagement)
  private _lastCrossHairEmit = 0;
  private _crossHairEmitThrottleMs = 50;

  // Gap detection for automatic bar recovery
  private _gapDetectionManager: GapDetectionManager | null = null;
  private _gapDetectionError: GapDetectionErrorState | null = null;
  private _gapDetectionErrorCallback: ((error: GapDetectionErrorState | null) => void) | null = null;

  // Supported resolutions from datafeed config (for filtering timeframe selector)
  private _supportedResolutions: ResolutionString[] | null = null;

  // Track if interval was explicitly provided (for controlled vs uncontrolled behavior)
  private _intervalWasProvided: boolean;

  // Resize observer for container auto-sizing
  private _resizeObserver: ResizeObserver | null = null;
  private _lastContainerWidth = 0;
  private _lastContainerHeight = 0;

  // Debug logger for this chart instance (null if disabled)
  private _logger: TealchartLogger | null = null;

  // ============================================================================
  // Unified Render Scheduler (dirty bitmask + single RAF)
  // ============================================================================
  // All state updates call _scheduler.markDirty(DIRTY.XXX) with the appropriate flag.
  // Multiple calls within the same frame coalesce into one RAF callback.
  // The _render(dirty) method pushes only what changed to ChartCore, then calls paint().
  private _scheduler = new RenderScheduler((dirty) => this._render(dirty));

  constructor(container: HTMLElement, options: TealchartWidgetOptions) {
    this._container = container;
    this._options = options;
    this._datafeed = options.datafeed;
    this._symbol = options.symbol;

    // Track if interval was explicitly provided (for controlled vs uncontrolled behavior)
    this._intervalWasProvided = options.interval !== undefined && options.interval !== '';

    // Generate chart key for per-chart state persistence
    // Use provided chartKey, or derive from account/panelId, or generate unique ID
    this._chartKey = options.chartKey || `chart_${options.account || ''}_${Date.now()}`;

    // Did a prior widget with this chartKey already create a store? If so, its
    // persisted interval should be restored when no explicit interval is given.
    const hadPersistedStore = hasChartStore(this._chartKey);

    // Initialize Nanostores for this chart (in-memory settings, layout ID from localStorage)
    this._chartStore = getChartStore(this._chartKey);

    // Interval resolution: explicit option wins; otherwise restore the interval
    // a prior widget persisted for this chartKey; otherwise default to '60' (1h).
    // Settings store is in-memory only — layout from adapter may override later.
    if (this._intervalWasProvided) {
      this._interval = options.interval as ResolutionString;
    } else if (hadPersistedStore) {
      this._interval = (this._chartStore.settings.get().interval as ResolutionString) || ('60' as ResolutionString);
    } else {
      this._interval = '60' as ResolutionString;
    }
    // Sync the resolved interval back to the in-memory store
    this._chartStore.settings.setKey('interval', this._interval);

    // Initialize pane manager for multi-pane indicator support
    this._paneManager = new PaneManager();

    // Initialize debug logger (skip if disabled for performance profiling)
    if (!options.disableDebugOverlay) {
      this._logger = new TealchartLogger({
        consoleOutput: options.debugLoggingEnabled === true,
        consolePrefix: `[Tealchart:${this._chartKey}]`,
      });
      this._logger.info(LogCategory.Widget, 'Widget initializing', {
        chartKey: this._chartKey,
        symbol: this._symbol,
        interval: this._interval,
      });
    }

    this._eventEmitter = new EventEmitter();
    this._chartApi = new TealchartApi(this._symbol, this._interval, options.account);
    this._renderOptions = mergeChartThemeRenderOptions(options.theme, options.renderOptions);
    this._userDrawingState = options.userDrawingState ?? createUserDrawingState();

    // Apply initial overrides if provided
    if (options.overrides) {
      this.applyOverrides(options.overrides);
    }

    // Set up chart API callbacks
    this._chartApi.setOnSymbolChange((symbol) => this._handleSymbolChange(symbol));
    this._chartApi.setOnIntervalChange((interval) => this._handleIntervalChange(interval));
    this._chartApi.setOnResetData(() => this._handleResetData());

    // Subscribe to order/position line changes to trigger re-renders
    this._chartApi.setOnLinesChanged(() => {
      this._scheduler.markDirty(DIRTY.LINES);
    });

    // Initialize Tealscript manager if worker factory is provided
    if (options.createTealscriptWorker) {
      this._tealScriptManager = new TealscriptManager({
        createWorker: options.createTealscriptWorker,
        onPlotsUpdated: (plots) => {
          this._plots = plots;
          this._scheduler.markDirty(DIRTY.PLOTS);
        },
        onDrawingsUpdated: (drawings) => {
          this._drawings = drawings;
          this._scheduler.markDirty(DIRTY.DRAWINGS);
        },
        onError: (scriptId, error) => {
          this._logger?.error(LogCategory.Indicators, `Tealscript error in ${scriptId}`, error);
          // Isolate the consumer callback from the widget's error path.
          try {
            this._options.onTealscriptError?.(scriptId, error);
          } catch (cbErr) {
            this._logger?.error(LogCategory.Indicators, `onTealscriptError callback threw for ${scriptId}`, cbErr);
          }
        },
        onInputsDiscovered: (scriptId, inputDefs) => {
          // Populate study's inputs with default values from input definitions
          const study = this._chartApi.getStudyById(scriptId);
          if (study) {
            const currentInputs = study.getInputs();
            const defaultInputs: Record<string, unknown> = {};
            for (const def of inputDefs) {
              // Only set default if not already set
              if (!(def.id in currentInputs)) {
                defaultInputs[def.id] = def.defval;
              }
            }
            if (Object.keys(defaultInputs).length > 0) {
              study.setInputs({ ...currentInputs, ...defaultInputs });
              this._scheduler.markDirty(DIRTY.PLOTS);
            }
          }
        },
        onDeclarationDiscovered: (scriptId, declaration) => {
          this._indicatorDeclarationMap.set(scriptId, declaration);
          this._scheduler.markDirty(DIRTY.PLOTS);
        },
        getRuntimeOptions: () => this._getTealscriptRuntimeOptions(),
      });

      // Set up study creation callback
      this._chartApi.setOnStudyCreate(async (studyId, name, inputs) => {
        if (!this._tealScriptManager) return false;
        try {
          // For now, assume 'name' is the Tealscript code for built-in indicators
          // In the future, we can have a registry of built-in scripts
          await this._tealScriptManager.addScript(studyId, name, inputs);
          // Push current bars to the new script
          if (this._bars.length > 0) {
            this._tealScriptManager.setBars(this._bars);
          }
          return true;
        } catch (error) {
          this._logger?.error(LogCategory.Indicators, `Failed to create study ${studyId}`, error);
          return false;
        }
      });

      // Set up study removal callback
      this._chartApi.setOnStudyRemove((studyId) => {
        if (this._tealScriptManager) {
          this._tealScriptManager.removeScript(studyId);
        }
        this._indicatorDeclarationMap.delete(studyId);
      });
    }

    // Initialize JailbreakIndicatorManager if factories are provided
    if (options.jailbreakIndicatorFactories && Object.keys(options.jailbreakIndicatorFactories).length > 0) {
      this._jailbreakManager = new JailbreakIndicatorManager();
    }

    // Set up keyboard event listeners
    this._setupKeyboardListeners();

    // Set up resize observer for autosize mode
    if (options.autosize || options.fullscreen) {
      const target = options.fullscreen ? document.documentElement : container;
      this._resizeObserver = new ResizeObserver(() => {
        const { width, height } = this._getContainerSize();
        if (width !== this._lastContainerWidth || height !== this._lastContainerHeight) {
          this._lastContainerWidth = width;
          this._lastContainerHeight = height;
          if (this._ui) {
            this._ui.resize(width, height);
          }
        }
      });
      this._resizeObserver.observe(target);
    }

    // Initialize gap detection manager (enabled by default)
    if (options.gapDetection?.enabled !== false) {
      this._gapDetectionManager = new GapDetectionManager(
        (event) => this._handleRecoveryNeeded(event),
        options.gapDetection,
      );
      // Pass logger to gap detection manager
      this._gapDetectionManager.setLogger(this._logger);
      // Wire up error state change callback
      this._gapDetectionManager.setOnErrorStateChange((error) => {
        this._gapDetectionError = error;
        // Notify UI if callback is set
        if (this._gapDetectionErrorCallback) {
          this._gapDetectionErrorCallback(error);
        }
      });
    }

    // Create UI synchronously so the canvas exists immediately.
    // Without this, there's a blank gap between remove() and first bars arriving
    // because _ensureUI() was deferred until first _render() call.
    // This prevents blank canvas on HMR, theme switch, or any widget recreation.
    this._ensureUI();

    // Initialize (async: onReady → resolveSymbol → loadBars)
    this._initialize();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  private _initialize(): void {
    // Initialize datafeed
    this._datafeed.onReady((config) => {
      // Store supported resolutions from datafeed config (for filtering timeframe selector)
      this._supportedResolutions = config.supported_resolutions ?? null;

      const resolveRequestId = ++this._resolveSymbolRequestId;

      // Resolve symbol
      this._datafeed.resolveSymbol(
        this._symbol,
        (symbolInfo) => {
          if (this._disposed || resolveRequestId !== this._resolveSymbolRequestId) {
            this._logger?.debug(LogCategory.Widget, 'Discarded stale resolveSymbol callback (init)', {
              symbol: symbolInfo.name,
            });
            return;
          }
          this._symbolInfo = symbolInfo;
          // Extract price precision from pricescale (e.g., 100 -> 0.01, 100000 -> 0.00001)
          if (symbolInfo.pricescale && symbolInfo.pricescale > 0) {
            this._renderOptions = {
              ...this._renderOptions,
              pricePrecision: 1 / symbolInfo.pricescale,
            };
          }
          // Pass symbol/interval metadata for jailbreak indicators
          this._renderOptions = {
            ...this._renderOptions,
            symbol: this._symbol,
            resolutionString: this._interval,
            exchange: ((symbolInfo as any).exchange || '').toLowerCase(),
          };
          // Push supported resolutions to UI (filters timeframe selector)
          this._ui?.setSupportedResolutions(this._supportedResolutions);
          // Start loading bars immediately (don't wait for layout)
          this._loadBars();
          // Load active layout from adapter async (races with bar load)
          this._loadLayoutFromAdapter();
        },
        (error) => {
          if (this._disposed || resolveRequestId !== this._resolveSymbolRequestId) {
            return;
          }
          this._logger?.error(LogCategory.Datafeed, 'Failed to resolve symbol', error);
          this._setReady();
        },
      );
    });
  }

  /**
   * Load the active layout from the SaveLoadAdapter on startup.
   * Runs async — races with bar loading. Layout applies when it arrives.
   * If no layoutId stored or adapter unavailable, chart starts with defaults.
   */
  private _loadLayoutFromAdapter(): void {
    if (!this._options.save_load_adapter || !this._chartStore) return;

    const current = this._chartStore.currentLayout.get();
    if (!current.layoutId) {
      // No layout saved — fresh client, chart uses defaults
      return;
    }

    import('./transformer').then(({ loadAsTealchart }) => {
      loadAsTealchart(current.layoutId!, this._options.save_load_adapter!)
        .then((result) => {
          if (this._disposed) return;
          this._handleLoadLayout(result.data, result.warnings, current.layoutId!, current.layoutName || 'tealstreet');
          // Sync layout selector UI
          this._ui?.setCurrentLayout(current.layoutId, current.layoutName);
        })
        .catch((error) => {
          if (this._disposed) return;
          // Layout no longer exists — clear the reference, start fresh
          this._logger?.warn(LogCategory.Layout, 'Failed to load saved layout, starting fresh', error);
          this._chartStore!.currentLayout.set({
            layoutId: null,
            layoutName: null,
          });
          this._ui?.setCurrentLayout(null, null);
        });
    });
  }

  // Number of bars to request initially - enough to fill viewport with buffer
  private static readonly INITIAL_BAR_COUNT = 300;

  private _loadBars(): void {
    if (!this._symbolInfo) {
      this._logger?.warn(LogCategory.Datafeed, '_loadBars called but no symbolInfo');
      return;
    }

    // Increment request ID to cancel any in-flight requests
    const requestId = ++this._loadBarsRequestId;
    this._isLoadingBars = true;
    this._scheduler.markDirty(DIRTY.CROSSHAIR); // Re-render to show faded/loading state

    const now = Date.now();
    const intervalMs = intervalToMs(this._interval);
    const countBack = TealchartWidget.INITIAL_BAR_COUNT;

    // Calculate from time: go back countBack bars from now
    const fromTime = now - countBack * intervalMs;

    const periodParams = {
      countBack,
      from: Math.floor(fromTime / 1000), // Convert to seconds
      to: Math.floor(now / 1000),
      firstDataRequest: true,
    };

    this._datafeed.getBars(
      this._symbolInfo,
      this._interval,
      periodParams,
      (bars, _meta) => {
        // Check if this request is still valid (not superseded or disposed)
        if (this._disposed || requestId !== this._loadBarsRequestId) {
          return;
        }

        // Atomic data transition: set all state before markDirty so it renders in one frame
        this._bars = bars;

        // Clear old plots — they belong to the old symbol/interval.
        // New visual outputs will arrive async via Tealscript callbacks.
        this._plots = [];
        this._drawings = [];

        // Restore viewport from viewScale or calculate default (first load)
        if (bars.length > 0) {
          const vp = this._viewportController.handleBarsLoaded(bars, intervalToMs(this._interval));
          this._viewport = vp;
        }

        this._isLoadingBars = false;
        // Single dirty flag triggers atomic render of viewport + bars + empty plots
        this._scheduler.markDirty(DIRTY.DATA_LOAD);

        // Notify Tealscript AFTER markDirty — worker callback may fire fast and
        // overwrite _plots. DATA_LOAD in the RAF snapshot ensures empty plots are
        // pushed first, then PLOTS from worker callback gets its own render frame.
        if (this._tealScriptManager) {
          this._tealScriptManager.setBars(bars);
        }

        this._subscribeToBars();
        this._setReady();

        // Clean up old widget DOM now that we have bars to paint.
        // Old DOM stayed visible to prevent blank flash during widget recreation.
        this._ui?.cleanupStaleSiblings?.();
      },
      (error) => {
        // Check if this request is still valid
        if (this._disposed || requestId !== this._loadBarsRequestId) {
          return; // Ignore stale error
        }

        this._isLoadingBars = false;
        this._logger?.error(LogCategory.Datafeed, 'Failed to load bars', error);
        this._scheduler.markDirty(DIRTY.FULL); // Re-render to hide loading state
        this._setReady();
      },
    );
  }

  private _subscribeToBars(): void {
    if (!this._symbolInfo) {
      this._logger?.warn(LogCategory.Datafeed, '_subscribeToBars called but no symbolInfo');
      return;
    }

    // Unsubscribe from previous subscription
    if (this._barSubscriptionGuid) {
      this._datafeed.unsubscribeBars(this._barSubscriptionGuid);
    }

    this._barSubscriptionGuid = `custom_chart_${this._symbol}_${this._interval}_${Date.now()}`;

    // Configure gap detection with the current interval
    const intervalMs = intervalToMs(this._interval);
    if (this._gapDetectionManager) {
      this._gapDetectionManager.setInterval(intervalMs);
      // Record the last bar time if we have bars
      if (this._bars.length > 0) {
        const lastBar = this._bars[this._bars.length - 1];
        this._gapDetectionManager.recordBar(lastBar.time);
      }
      this._gapDetectionManager.start();
    }

    // Capture guid for stale-check in the callback — if the subscription
    // is replaced before the datafeed fully unsubscribes, late ticks are discarded.
    const subscriptionGuid = this._barSubscriptionGuid;

    this._datafeed.subscribeBars(
      this._symbolInfo,
      this._interval,
      (bar) => {
        if (this._disposed || subscriptionGuid !== this._barSubscriptionGuid) {
          return;
        }
        this._handleNewBar(bar);
      },
      this._barSubscriptionGuid,
      () => {
        if (this._disposed || subscriptionGuid !== this._barSubscriptionGuid) {
          return;
        }
        // Reset cache callback - reload bars
        this._loadBars();
      },
    );
  }

  private _handleNewBar(bar: Bar): void {
    // Check for bar gap before processing
    if (this._gapDetectionManager && this._bars.length > 0) {
      const gapEvent = this._gapDetectionManager.checkBarGap(bar.time);
      if (gapEvent) {
        // Gap detected - trigger recovery and return
        // The recovery will refetch all bars including this one
        this._handleRecoveryNeeded(gapEvent);
        return;
      }
    }

    if (this._bars.length === 0) {
      this._bars.push(bar);
    } else {
      const lastBar = this._bars[this._bars.length - 1];
      if (bar.time === lastBar.time) {
        // Update existing bar
        this._bars[this._bars.length - 1] = bar;
      } else if (bar.time > lastBar.time) {
        // New bar
        this._bars.push(bar);
      }
    }

    // Record the bar time for gap detection and reset retry state on successful bar
    if (this._gapDetectionManager) {
      this._gapDetectionManager.recordBar(bar.time);
      // Reset retry state - successful bar means gap is resolved
      this._gapDetectionManager.resetRetryState();
    }

    // Notify Tealscript manager of bar update
    if (this._tealScriptManager) {
      this._tealScriptManager.updateBar(bar);
    }

    // Lightweight real-time update — goes directly to ChartCore.updateBar()
    // which handles mutation + scheduleRender internally.
    this._ui?.updateBar(bar, this._bars);

    // Auto-scale: refit price axis if a new tick extends beyond visible range
    if (this._viewportController.isAutoScale('main') && this._viewport) {
      const fitted = this._viewportController.handleViewportChange(
        this._viewport,
        this._bars,
        intervalToMs(this._interval),
      );
      if (fitted.priceMin !== this._viewport.priceMin || fitted.priceMax !== this._viewport.priceMax) {
        this._viewport = fitted;
        this._ui?.setViewport(fitted);
      }
    }

    // Schedule widget-level render to update last-trade price line,
    // order/position lines, and other state. updateBar fast path already
    // painted candles — we only need LINES for interactive line updates.
    this._scheduler.markDirty(DIRTY.LINES);
  }

  private _loadMoreBars(direction: 'left' | 'right'): void {
    // Only support loading older data (left) for now
    if (direction !== 'left') return;
    if (!this._symbolInfo) return;
    if (this._isLoadingMoreBars) return;
    if (!this._hasMoreHistoricalData) return;

    this._isLoadingMoreBars = true;

    // Find the earliest bar we have
    const earliestBar = this._bars[0];
    if (!earliestBar) {
      this._isLoadingMoreBars = false;
      return;
    }

    // Capture current request ID — if symbol/interval changes while this request
    // is in flight, _loadBarsRequestId will be incremented and this callback
    // will be discarded as stale.
    const requestId = this._loadBarsRequestId;

    // Request same number of bars as initial load, going back from earliest bar
    const intervalMs = intervalToMs(this._interval);
    const countBack = TealchartWidget.INITIAL_BAR_COUNT;
    const toTime = Math.floor(earliestBar.time / 1000) - 1; // 1 second before earliest bar
    const fromTime = toTime - Math.floor((countBack * intervalMs) / 1000);

    this._datafeed.getBars(
      this._symbolInfo,
      this._interval,
      {
        countBack,
        from: fromTime,
        to: toTime,
        firstDataRequest: false,
      },
      (bars, _meta) => {
        // Discard if widget was disposed or symbol/interval changed
        if (this._disposed || requestId !== this._loadBarsRequestId) {
          this._logger?.debug(LogCategory.Widget, 'Discarded stale loadMoreBars response', { barCount: bars.length });
          return;
        }

        this._isLoadingMoreBars = false;

        if (bars.length === 0) {
          this._hasMoreHistoricalData = false;
          return;
        }

        // Prepend new bars to existing bars (avoid duplicates)
        const existingTimes = new Set(this._bars.map((b) => b.time));
        const newBars = bars.filter((b) => !existingTimes.has(b.time));

        if (newBars.length > 0) {
          this._bars = [...newBars, ...this._bars];

          // Render prepended bars immediately; Tealscript plots realign on the
          // next worker callback. Gating the bar render on onPlotsUpdated means a
          // chart with no active indicator (manager present, no scripts) never
          // repaints after scrollback, so its callback never fires.
          this._scheduler.markDirty(DIRTY.BARS);
          this._tealScriptManager?.setBars(this._bars);
        }
      },
      (error) => {
        if (this._disposed || requestId !== this._loadBarsRequestId) {
          return;
        }
        this._isLoadingMoreBars = false;
        this._logger?.error(LogCategory.Datafeed, 'Failed to load more bars', error);
      },
    );
  }

  /**
   * Handle recovery needed from gap detection
   * Clears bars and refetches the visible region
   */
  private _handleRecoveryNeeded(event: GapDetectionEvent): void {
    this._logger?.info(LogCategory.GapDetection, `Recovery triggered: ${event.reason}`, event.details);

    // Stop gap detection while recovering
    this._gapDetectionManager?.stop();

    // Unsubscribe from real-time updates
    if (this._barSubscriptionGuid) {
      this._datafeed.unsubscribeBars(this._barSubscriptionGuid);
      this._barSubscriptionGuid = null;
    }

    // Don't clear bars — keep old candles visible (faded) until new data arrives
    this._hasMoreHistoricalData = true;
    this._isLoadingMoreBars = false;
    this._isLoadingBars = true;

    // Reload bars (this will also re-subscribe)
    this._loadBars();
  }

  private _setReady(): void {
    if (this._isReady) return;
    this._isReady = true;

    // Emit initial interval to external listeners if not controlled
    // This allows the parent (useWidgetStateManagement) to sync its state
    if (!this._intervalWasProvided) {
      this._chartApi.emitCurrentInterval();
    }

    // Restore persisted indicators
    this._restorePersistedIndicators();

    // Call all pending ready callbacks
    this._readyCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        this._logger?.error(LogCategory.Widget, 'Error in onChartReady callback', e);
      }
    });
    this._readyCallbacks = [];

    // Emit chart_loaded event
    this._eventEmitter.emit('chart_loaded');
  }

  /**
   * Restore indicators from persisted state
   */
  private _restorePersistedIndicators(): void {
    if (!this._chartStore) return;

    const indicators = this._chartStore.settings.get().indicators;
    if (!indicators || indicators.length === 0) return;

    for (const instance of indicators) {
      // Look up the built-in indicator by ID
      const builtinIndicator = getIndicatorById(instance.builtinId);
      if (!builtinIndicator) {
        this._logger?.warn(LogCategory.Indicators, `Unknown indicator ID: ${instance.builtinId}, skipping`);
        continue;
      }

      // Handle jailbreak indicators separately
      if (isJailbreakIndicator(builtinIndicator)) {
        this._restoreJailbreakIndicator(instance, builtinIndicator);
        continue;
      }

      // Tealscript indicators require the manager
      if (!this._tealScriptManager) continue;

      // Create the study with persisted inputs
      this._chartApi
        .createStudy(
          builtinIndicator.code,
          builtinIndicator.overlay,
          false,
          instance.inputs,
          {},
          { displayName: instance.name },
        )
        .then((studyApi) => {
          if (studyApi) {
            const studyId = studyApi.getId();

            // Track the mapping from instance ID to study ID
            this._indicatorStudyMap.set(instance.id, studyId);
            this._studyInstanceMap.set(studyId, instance.id);

            // Store indicator config for pane lookup
            this._indicatorConfigMap.set(studyId, builtinIndicator);

            // Register with pane manager
            this._paneManager.addIndicator({
              indicatorId: studyId,
              overlay: builtinIndicator.overlay,
              yAxisRange: builtinIndicator.yAxisRange,
            });

            // Apply visibility state
            if (!instance.isVisible) {
              this._chartApi.toggleStudyVisibility(studyId);
              this._tealScriptManager?.toggleScriptVisibility(studyId);
            }
          }
        })
        .catch((error) => {
          this._logger?.error(LogCategory.Indicators, `Failed to restore indicator ${instance.name}`, error);
        });
    }
  }

  /**
   * Restore a jailbreak indicator from persisted state
   */
  private _restoreJailbreakIndicator(instance: IndicatorInstance, builtin: BuiltinIndicator): void {
    if (!this._jailbreakManager || !builtin.jailbreak) return;

    const factory = this._options.jailbreakIndicatorFactories?.[builtin.id];
    if (!factory) {
      this._logger?.warn(LogCategory.Indicators, `No factory for jailbreak indicator: ${builtin.id}`);
      return;
    }

    const barsIndicator = factory();
    // Merge defaults with persisted inputs, then palette colors
    const settings = this._buildJailbreakSettings(builtin, instance.inputs);
    const behindCandles =
      (instance.inputs.behindCandles as boolean | undefined) ?? builtin.jailbreak.behindCandles ?? false;

    this._jailbreakManager.register(instance.id, barsIndicator, settings, behindCandles);
    this._jailbreakInstanceIds.add(instance.id);

    // Store indicator config for pane lookup
    this._indicatorConfigMap.set(instance.id, builtin);

    // Apply visibility: use internal visibility on the BarsIndicator
    if (!instance.isVisible) {
      // BarsIndicator.isVisible() returns true by default; we need to make the manager skip it.
      // We'll store visibility in the settings and check it during draw.
      // For now, unregister to hide (toggle will re-register).
      this._jailbreakManager.unregister(instance.id);
    }

    // Notify UI to propagate the jailbreak manager
    this._ui?.setJailbreakManager(this._jailbreakManager);
    this._scheduler.markDirty(DIRTY.FULL);
  }

  /**
   * Build combined settings object for a jailbreak indicator.
   * Merges builtin defaults, palette colors, and user-provided input overrides.
   */
  private _buildJailbreakSettings(builtin: BuiltinIndicator, inputs: Record<string, unknown>): Record<string, unknown> {
    const jb = builtin.jailbreak!;
    const settings: Record<string, unknown> = { ...jb.defaults };

    // Add palette defaults as palette_<key> entries
    if (jb.palette) {
      for (const [key, value] of Object.entries(jb.palette)) {
        settings[`palette_${key}`] = value.defaultColor;
      }
    }

    // Override with user inputs
    Object.assign(settings, inputs);

    return settings;
  }

  /**
   * Initialize the UI (called once on first render).
   * Separated from _render() for clarity.
   */
  private _ensureUI(): void {
    if (this._ui) return;

    const showTopBar = this._options.showTopBar !== false; // Default to true
    this._ui = new TealchartWidgetUI({
      container: this._container,
      chartKey: this._chartKey,
      symbol: this._symbol,
      interval: this._interval,
      showTopBar,
      renderOptions: this._renderOptions,
      onIntervalChange: (interval) => {
        this._chartApi.setResolution(interval);
      },
      onAddIndicator: (indicator) => {
        this._handleAddIndicator(indicator);
      },
      onToggleIndicator: (indicatorId) => {
        this._handleToggleIndicator(indicatorId);
      },
      onSettingsIndicator: (indicatorId) => {
        this._ui?.openIndicatorSettings(indicatorId);
      },
      onRemoveIndicator: (indicatorId) => {
        this._handleRemoveIndicator(indicatorId);
      },
      getStudyInputDefinitions: (studyId) => {
        return this.getStudyInputDefinitions(studyId);
      },
      onSaveIndicatorSettings: (indicatorId, inputs, styleOverrides) => {
        this.setStudyInputs(indicatorId, inputs);
        if (styleOverrides) {
          this.setStudyStyleOverrides(indicatorId, styleOverrides);
        }
      },
      onViewportChange: (viewport) => {
        const fitted = this._viewportController.handleViewportChange(
          viewport,
          this._bars,
          intervalToMs(this._interval),
        );
        this._viewport = fitted;
        if (fitted.priceMin !== viewport.priceMin || fitted.priceMax !== viewport.priceMax) {
          this._ui?.setViewport(fitted);
        }
      },
      onAutoScaleDisabled: (paneId: string) => {
        this._viewportController.disableAutoScale(paneId);
      },
      onResetViewport: () => {
        this._viewportController.handleReset(this._bars, intervalToMs(this._interval));
      },
      isAutoScale: (paneId: string) => this._viewportController.isAutoScale(paneId),
      onRequestMoreBars: (direction) => {
        this._loadMoreBars(direction);
      },
      onOrderMove: (orderId, newPrice) => {
        this._chartApi.triggerOrderMove(orderId, newPrice);
      },
      onOrderCancel: (orderId) => {
        this._chartApi.triggerOrderCancel(orderId);
      },
      onPositionClose: (positionId) => {
        this._chartApi.triggerPositionClose(positionId);
      },
      onPositionReverse: (positionId) => {
        this._chartApi.triggerPositionReverse(positionId);
      },
      onContextMenu: this._contextMenuCallback || undefined,
      onMouseDown: () => {
        this._eventEmitter.emit('mouse_down');
      },
      onMouseUp: () => {
        this._eventEmitter.emit('mouse_up');
      },
      onCrossHairMoved: (price, time) => {
        const now = Date.now();
        if (now - this._lastCrossHairEmit >= this._crossHairEmitThrottleMs) {
          this._lastCrossHairEmit = now;
          this._chartApi.emitCrossHairMoved({ price, time });
        }
      },
      onUserDrawingInput: (point) => this._handleUserDrawingInput(point),
      onUserDrawingSelection: (point, spacesByPaneId, options) =>
        this._handleUserDrawingSelection(point, spacesByPaneId, options),
      onUserDrawingEditStart: (point, spacesByPaneId) => this._handleUserDrawingEditStart(point, spacesByPaneId),
      onUserDrawingContextMenu: (point, spacesByPaneId) => this._handleUserDrawingContextMenu(point, spacesByPaneId),
      onUserDrawingEditMove: (point) => this._handleUserDrawingEditMove(point),
      onUserDrawingEditEnd: () => this._handleUserDrawingEditEnd(),
      onUserDrawingPlacementDragStart: (point) => this._handleUserDrawingPlacementDragStart(point),
      onUserDrawingPlacementDragEnd: (point) => this._handleUserDrawingPlacementDragEnd(point),
      onUserDrawingPathDragStart: (point) => this._handleUserDrawingPathDragStart(point),
      onUserDrawingPathDragMove: (point) => this._handleUserDrawingPathDragMove(point),
      onUserDrawingPathDragEnd: () => this._handleUserDrawingPathDragEnd(),
      userDrawingState: this._userDrawingState,
      onUserDrawingToolSelect: (tool) => this.setActiveUserDrawingTool(tool),
      onUserDrawingDuplicateSelected: () => {
        this.duplicateSelectedUserDrawing();
      },
      onUserDrawingDeleteSelected: () => {
        this.deleteSelectedUserDrawing();
      },
      onUserDrawingCancelDraft: () => this.cancelUserDrawingDraft(),
      onUserDrawingClearAll: () => this.clearUserDrawings(),
      onUserDrawingZOrderChange: (action) => {
        this.reorderUserDrawings(action);
      },
      onUserDrawingStyleChange: (style) => {
        this.updateUserDrawingStyle(style);
      },
      onUserDrawingTextAlignChange: (textAlign) => {
        this.setUserDrawingTextAlign(textAlign);
      },
      onUserDrawingTrendLineExtendChange: (extend) => {
        this.setUserDrawingTrendLineExtend(extend);
      },
      onUserDrawingIconNameChange: (iconName) => {
        this.setUserDrawingIconName(iconName);
      },
      onUserDrawingVisibilityChange: (visible) => {
        this.setUserDrawingVisibility(visible);
      },
      onUserDrawingLockedChange: (locked, includeLocked) => {
        this.setUserDrawingLocked(locked, { includeLocked });
      },
      onUserDrawingTextEditChange: (value) => this.updateUserDrawingTextEdit(value),
      onUserDrawingTextEditCommit: () => this.commitUserDrawingTextEdit(),
      onUserDrawingTextEditCancel: () => this.cancelUserDrawingTextEdit(),
      onPaneDoubleClick: (paneId, point, spacesByPaneId) => this._handlePaneDoubleClick(paneId, point, spacesByPaneId),
      layoutCallbacks: this._options.save_load_adapter
        ? {
            getAllLayouts: () => {
              return import('./transformer').then(({ getAllLayouts }) =>
                getAllLayouts(this._options.save_load_adapter!),
              );
            },
            onSave: () => {
              this._handleSaveCurrentLayout();
            },
            onSaveAs: (name: string) => {
              this._handleSaveAsLayout(name);
            },
            onLoad: (id: string | number) => {
              this._handleLoadLayoutById(id);
            },
            onDelete: (id: string | number) => {
              this._handleDeleteLayout(id);
            },
            onRename: (id: string | number, newName: string) => {
              this._handleRenameLayout(id, newName);
            },
          }
        : undefined,
    });

    // Sync the layout selector with the current layout state
    if (this._chartStore && this._options.save_load_adapter) {
      const current = this._chartStore.currentLayout.get();
      this._ui.setCurrentLayout(current.layoutId, current.layoutName);
    }
  }

  /**
   * Unified render method — called by RenderScheduler with accumulated dirty flags.
   * Only pushes what changed to ChartCore, then calls paint() synchronously.
   */
  private _render(dirty: DirtyFlags): void {
    // Initialize UI on first render
    this._ensureUI();
    if (!this._ui) return;

    // Atomic data transition: push viewport + bars + FORCE empty plots in one go.
    // Worker callback may have raced and set _plots to stale data between
    // markDirty(DATA_LOAD) and this RAF — override with empty to guarantee clean slate.
    if (dirty & DIRTY.DATA_LOAD) {
      this._plots = []; // Force empty — reject any stale worker callback
      this._drawings = [];
      if (this._viewport) {
        this._ui.setViewport(this._viewport);
      }
      this._ui.setBars(this._bars);
      this._ui.setPlots([]); // Explicitly empty
      this._ui.setDrawings([]);
      dirty = DIRTY.FULL; // Force full repaint of everything
    }

    // Viewport changed (pan/zoom)
    if (dirty & DIRTY.VIEWPORT) {
      if (this._viewport) {
        this._ui.setViewport(this._viewport);
      }
    }

    // Bars changed (historical data prepend)
    if (dirty & DIRTY.BARS) {
      this._ui.setBars(this._bars);
    }

    // Plots changed (worker callback with new indicator data)
    if (dirty & DIRTY.PLOTS) {
      this._ui.setPlots(this._plots);
    }

    // Drawings changed (worker callback with new drawing data)
    if (dirty & DIRTY.DRAWINGS) {
      this._ui.setDrawings(this._drawings);
    }

    // User drawings changed (public state API)
    if (dirty & DIRTY.USER_DRAWINGS) {
      this._ui.setUserDrawingState(this._userDrawingState);
    }

    // Lines changed (order/position updates, last-trade line)
    if (dirty & DIRTY.LINES) {
      this._ui.setOrderLines(this._chartApi.getOrderLinesRenderData());
      this._ui.setPositionLines(this._chartApi.getPositionLinesRenderData());
      this._ui.setExecutionLines(this._chartApi.getExecutionLinesRenderData());
      this._updateLastTradeLine();
    }

    // Layout changed (indicator pane added/removed)
    if (dirty & DIRTY.LAYOUT) {
      const paneLayout = this._paneManager.getLayout();
      this._ui.setPaneLayout(paneLayout);
    }

    // Options changed (colors, styles)
    if (dirty & DIRTY.OPTIONS) {
      this._ui.setRenderOptions(this._renderOptions);
      this._ui.setSymbol(this._symbol);
      this._ui.setInterval(this._interval);
    }

    // Always update opacity + loading dots
    this._ui.setCanvasOpacity(this._isLoadingBars ? LOADING_OPACITY : 1, this._bars.length > 0);

    // Compute indicator pane Y ranges when plots have data
    if (dirty & (DIRTY.PLOTS | DIRTY.VIEWPORT | DIRTY.BARS | DIRTY.DATA_LOAD) && this._plots.length > 0) {
      const paneLayout = this._paneManager.getLayout();
      if (this._viewport && paneLayout) {
        const autoScaleRanges = this._viewportController.computePaneYRanges(
          paneLayout.indicatorPanes,
          this._plots,
          this._bars,
          this._viewport.startTime,
          this._viewport.endTime,
        );
        this._ui.setPaneYRanges(autoScaleRanges);
      }
    }

    // Update active indicators + pane info only when indicator/layout metadata changes.
    // Real-time bar and price-line ticks should not reapply render options or rebuild this UI state.
    if (dirty & (DIRTY.LAYOUT | DIRTY.PLOTS | DIRTY.OPTIONS | DIRTY.DATA_LOAD)) {
      // Update pane layout (in case not already done by LAYOUT flag)
      if (!(dirty & DIRTY.LAYOUT)) {
        const paneLayout = this._paneManager.getLayout();
        this._ui.setPaneLayout(paneLayout);
      }

      const studyInfos = this._chartApi.getAllStudies();
      const persistedIndicators = this._chartStore ? this._chartStore.settings.get().indicators : [];

      const activeIndicators = studyInfos.map((study) => {
        const instanceId = this._studyInstanceMap.get(study.id);
        const persisted = instanceId ? persistedIndicators.find((ind) => ind.id === instanceId) : undefined;
        return {
          ...study,
          styleOverrides: persisted?.styleOverrides,
        };
      });

      // Add jailbreak indicators to active list
      for (const instanceId of this._jailbreakInstanceIds) {
        const persisted = persistedIndicators.find((ind) => ind.id === instanceId);
        if (persisted) {
          activeIndicators.push({
            id: instanceId,
            name: persisted.name,
            isVisible: persisted.isVisible,
            inputs: persisted.inputs,
            styleOverrides: persisted.styleOverrides,
          });
        }
      }

      // Build indicator pane info
      const indicatorPaneInfo: Record<
        string,
        {
          overlay: boolean;
          yAxisRange?: { min: number; max: number };
          explicitPlotZOrder?: boolean;
          name?: string;
          inputs?: Record<string, unknown>;
        }
      > = {};
      for (const [studyId, config] of this._indicatorConfigMap) {
        // For jailbreak indicators, get inputs from persisted state
        if (this._jailbreakInstanceIds.has(studyId)) {
          const persisted = persistedIndicators.find((ind) => ind.id === studyId);
          indicatorPaneInfo[studyId] = {
            overlay: config.overlay,
            yAxisRange: config.yAxisRange,
            explicitPlotZOrder: this._indicatorDeclarationMap.get(studyId)?.explicitPlotZOrder,
            name: config.name,
            inputs: persisted?.inputs ?? {},
          };
        } else {
          const study = this._chartApi.getStudyById(studyId);
          const inputs = study?.getInputs() ?? {};
          indicatorPaneInfo[studyId] = {
            overlay: config.overlay,
            yAxisRange: config.yAxisRange,
            explicitPlotZOrder: this._indicatorDeclarationMap.get(studyId)?.explicitPlotZOrder,
            name: config.name,
            inputs,
          };
        }
      }

      this._ui.setActiveIndicators(activeIndicators, indicatorPaneInfo);
    }

    // Tell ChartCore to paint — synchronous, no second RAF
    this._ui.paint(dirty);
  }

  /**
   * Update the last-trade price line from latest bar data
   */
  private _updateLastTradeLine(): void {
    if (!this._ui) return;
    const latestBar = this._bars.length > 0 ? this._bars[this._bars.length - 1] : null;
    if (latestBar) {
      const lastTradeLine = buildLastTradePriceLine({
        latestBar,
        interval: this._interval,
        pricePrecision: this._renderOptions?.pricePrecision,
        upColor: this._renderOptions?.upColor,
        downColor: this._renderOptions?.downColor,
        renderLineOnCanvas: true,
      });
      if (!lastTradeLine) return;
      this._ui.setPriceLines([lastTradeLine]);
    }
  }

  /**
   * Handle adding a built-in indicator
   */
  private _handleAddIndicator(indicator: BuiltinIndicator): void {
    // Handle jailbreak indicators
    if (isJailbreakIndicator(indicator)) {
      this._handleAddJailbreakIndicator(indicator);
      return;
    }

    if (!this._tealScriptManager) {
      this._logger?.warn(LogCategory.Indicators, 'Tealscript not available - cannot add indicator');
      return;
    }

    // Generate a persistent instance ID
    const instanceId = generateIndicatorId(indicator.id);

    // Create a study using the indicator's Tealscript code
    this._chartApi
      .createStudy(
        indicator.code,
        indicator.overlay, // forceOverlay
        false, // lock
        {}, // inputs
        {}, // overrides
        { displayName: indicator.name }, // Use friendly name for display
      )
      .then((studyApi) => {
        if (studyApi) {
          const studyId = studyApi.getId();

          // Track the mapping from instance ID to study ID
          this._indicatorStudyMap.set(instanceId, studyId);

          // Also track reverse mapping for persistence updates
          this._studyInstanceMap.set(studyId, instanceId);

          // Store indicator config for pane lookup
          this._indicatorConfigMap.set(studyId, indicator);

          // Register with pane manager (non-overlay indicators get their own pane)
          this._paneManager.addIndicator({
            indicatorId: studyId,
            overlay: indicator.overlay,
            yAxisRange: indicator.yAxisRange,
          });

          // Persist to settings
          this._persistAddIndicator(instanceId, indicator);

          // Trigger immediate re-render to update chart layout for the new pane
          this._scheduler.markDirty(DIRTY.FULL);
        }
      })
      .catch((error) => {
        this._logger?.error(LogCategory.Indicators, `Failed to add indicator ${indicator.name}`, error);
      });
  }

  /**
   * Handle adding a jailbreak (canvas-drawing) indicator
   */
  private _handleAddJailbreakIndicator(indicator: BuiltinIndicator): void {
    if (!this._jailbreakManager || !indicator.jailbreak) {
      this._logger?.warn(LogCategory.Indicators, 'Jailbreak manager not available or indicator not jailbreak');
      return;
    }

    const factory = this._options.jailbreakIndicatorFactories?.[indicator.id];
    if (!factory) {
      this._logger?.warn(LogCategory.Indicators, `No factory for jailbreak indicator: ${indicator.id}`);
      return;
    }

    const instanceId = generateIndicatorId(indicator.id);
    const barsIndicator = factory();
    const settings = this._buildJailbreakSettings(indicator, {});
    const behindCandles = indicator.jailbreak.behindCandles ?? false;

    this._jailbreakManager.register(instanceId, barsIndicator, settings, behindCandles);
    this._jailbreakInstanceIds.add(instanceId);

    // Store indicator config for pane lookup
    this._indicatorConfigMap.set(instanceId, indicator);

    // Persist to settings (inputs get the defaults)
    this._persistAddIndicator(instanceId, indicator);

    // Propagate jailbreak manager to rendering pipeline
    this._ui?.setJailbreakManager(this._jailbreakManager);

    this._scheduler.markDirty(DIRTY.FULL);
  }

  /**
   * Mark the layout as having unsaved changes and schedule auto-save
   */
  private _markDirty(): void {
    if (!this._chartStore) return;
    this._chartStore.isDirty.set(true);
    this._scheduleAutoSave();
  }

  /**
   * Schedule auto-save after the configured delay.
   * Always fires when adapter is available — creates a new "tealstreet" layout
   * for fresh clients, or updates the existing layout.
   */
  private _scheduleAutoSave(): void {
    // Clear any existing timer
    if (this._autoSaveTimer) {
      clearTimeout(this._autoSaveTimer);
      this._autoSaveTimer = null;
    }

    // Only auto-save if enabled and we have an adapter
    const delay = this._options.auto_save_delay;
    if (!delay || delay <= 0 || !this._options.save_load_adapter) {
      return;
    }

    if (!this._chartStore) return;

    // Schedule auto-save (works for both existing and fresh layouts)
    this._autoSaveTimer = setTimeout(() => {
      this._handleAutoSave();
    }, delay * 1000);
  }

  /**
   * Auto-save the current layout
   */
  private _handleAutoSave(): void {
    this._autoSaveTimer = null;

    if (!this._chartStore || !this._options.save_load_adapter) return;

    // Check if still dirty
    const isDirty = this._chartStore.isDirty.get();
    if (!isDirty) {
      return;
    }

    // Get current settings and save
    const settings = this._getCurrentSettings();
    const currentLayout = this._chartStore.currentLayout.get();

    // Set saving status
    this._chartStore.saveStatus.set('saving');
    this._scheduler.markDirty(DIRTY.FULL);

    if (currentLayout.layoutId && currentLayout.layoutName) {
      // Update existing layout
      import('./transformer').then(({ updateTealchartLayout }) => {
        updateTealchartLayout(
          String(currentLayout.layoutId),
          settings,
          currentLayout.layoutName!,
          this._options.save_load_adapter!,
        )
          .then((chartId) => {
            if (!this._chartStore) return;
            this._chartStore.currentLayout.set({
              layoutId: chartId,
              layoutName: currentLayout.layoutName,
            });
            this._chartStore.isDirty.set(false);
            this._showSaveSuccess();
            this._ui?.setCurrentLayout(chartId, currentLayout.layoutName);
          })
          .catch((error) => {
            this._logger?.error(LogCategory.Layout, 'Auto-save failed', error);
            if (!this._chartStore) return;
            this._chartStore.saveStatus.set('error');
            this._scheduler.markDirty(DIRTY.FULL);
          });
      });
    } else {
      // No layout yet — create a new one named "tealstreet"
      const layoutName = 'tealstreet';
      import('./transformer').then(({ saveTealchartLayout }) => {
        saveTealchartLayout(settings, layoutName, this._options.save_load_adapter!)
          .then((chartId) => {
            if (!this._chartStore) return;
            this._chartStore.currentLayout.set({
              layoutId: chartId,
              layoutName,
            });
            this._chartStore.isDirty.set(false);
            this._showSaveSuccess();
            this._ui?.setCurrentLayout(chartId, layoutName);
          })
          .catch((error) => {
            this._logger?.error(LogCategory.Layout, 'Auto-save (create) failed', error);
            if (!this._chartStore) return;
            this._chartStore.saveStatus.set('error');
            this._scheduler.markDirty(DIRTY.FULL);
          });
      });
    }
  }

  /**
   * Persist a new indicator to settings
   */
  private _persistAddIndicator(instanceId: string, indicator: BuiltinIndicator): void {
    if (!this._chartStore) return;

    // For jailbreak indicators, persist the defaults so the settings modal shows correct values
    const defaultInputs = indicator.jailbreak?.defaults ?? {};

    const currentIndicators = this._chartStore.settings.get().indicators;
    const newInstance: IndicatorInstance = {
      id: instanceId,
      name: indicator.name,
      builtinId: indicator.id,
      inputs: { ...defaultInputs },
      isVisible: true,
      createdAt: Date.now(),
    };

    this._chartStore.settings.setKey('indicators', [...currentIndicators, newInstance]);
    this._markDirty();
  }

  /**
   * Handle toggling indicator visibility
   */
  private _handleToggleIndicator(indicatorId: string): void {
    // Check if this is a jailbreak indicator (indicatorId IS the instanceId)
    if (this._jailbreakInstanceIds.has(indicatorId)) {
      this._handleToggleJailbreakIndicator(indicatorId);
      return;
    }

    // Toggle visibility on both the API (for UI state) and TealscriptManager (for plot rendering)
    this._chartApi.toggleStudyVisibility(indicatorId);
    this._tealScriptManager?.toggleScriptVisibility(indicatorId);

    // Persist visibility change
    this._persistToggleIndicatorVisibility(indicatorId);

    // Re-render to update the legend
    this._scheduler.markDirty(DIRTY.FULL);
  }

  /**
   * Toggle visibility for a jailbreak indicator
   */
  private _handleToggleJailbreakIndicator(instanceId: string): void {
    if (!this._jailbreakManager || !this._chartStore) return;

    const currentIndicators = this._chartStore.settings.get().indicators;
    const instance = currentIndicators.find((ind) => ind.id === instanceId);
    if (!instance) return;

    const newVisible = !instance.isVisible;

    if (newVisible) {
      // Re-register the indicator if it was hidden
      const builtin = getIndicatorById(instance.builtinId);
      if (builtin?.jailbreak) {
        const factory = this._options.jailbreakIndicatorFactories?.[builtin.id];
        if (factory) {
          const barsIndicator = factory();
          const settings = this._buildJailbreakSettings(builtin, instance.inputs);
          const behindCandles =
            (instance.inputs.behindCandles as boolean | undefined) ?? builtin.jailbreak.behindCandles ?? false;
          this._jailbreakManager.register(instanceId, barsIndicator, settings, behindCandles);
        }
      }
    } else {
      // Unregister to hide
      this._jailbreakManager.unregister(instanceId);
    }

    // Persist
    const updatedIndicators = currentIndicators.map((ind) =>
      ind.id === instanceId ? { ...ind, isVisible: newVisible } : ind,
    );
    this._chartStore.settings.setKey('indicators', updatedIndicators);
    this._markDirty();
    this._scheduler.markDirty(DIRTY.FULL);
  }

  /**
   * Persist indicator visibility toggle
   */
  private _persistToggleIndicatorVisibility(studyId: string): void {
    if (!this._chartStore) return;

    const instanceId = this._studyInstanceMap.get(studyId);
    if (!instanceId) return;

    const currentIndicators = this._chartStore.settings.get().indicators;
    const updatedIndicators = currentIndicators.map((ind) =>
      ind.id === instanceId ? { ...ind, isVisible: !ind.isVisible } : ind,
    );

    this._chartStore.settings.setKey('indicators', updatedIndicators);
    this._markDirty();
  }

  /**
   * Handle removing an indicator
   */
  private _handleRemoveIndicator(indicatorId: string): void {
    // Check if this is a jailbreak indicator
    if (this._jailbreakInstanceIds.has(indicatorId)) {
      this._handleRemoveJailbreakIndicator(indicatorId);
      return;
    }

    // Persist removal
    this._persistRemoveIndicator(indicatorId);

    // Clean up tracking maps
    const instanceId = this._studyInstanceMap.get(indicatorId);
    if (instanceId) {
      this._indicatorStudyMap.delete(instanceId);
    }
    this._studyInstanceMap.delete(indicatorId);
    this._indicatorConfigMap.delete(indicatorId);
    this._indicatorDeclarationMap.delete(indicatorId);

    // Remove from pane manager
    this._paneManager.removeIndicator(indicatorId);

    // Remove the study via the API
    this._chartApi.removeStudy(indicatorId);
    // Re-render to update the legend
    this._scheduler.markDirty(DIRTY.FULL);
  }

  /**
   * Handle removing a jailbreak indicator
   */
  private _handleRemoveJailbreakIndicator(instanceId: string): void {
    if (!this._chartStore) return;

    // Unregister from jailbreak manager
    this._jailbreakManager?.unregister(instanceId);
    this._jailbreakInstanceIds.delete(instanceId);
    this._indicatorConfigMap.delete(instanceId);
    this._indicatorDeclarationMap.delete(instanceId);

    // Remove from persisted settings
    const currentIndicators = this._chartStore.settings.get().indicators;
    const updatedIndicators = currentIndicators.filter((ind) => ind.id !== instanceId);
    this._chartStore.settings.setKey('indicators', updatedIndicators);
    this._markDirty();
    this._scheduler.markDirty(DIRTY.FULL);
  }

  /**
   * Persist indicator removal
   */
  private _persistRemoveIndicator(studyId: string): void {
    if (!this._chartStore) return;

    const instanceId = this._studyInstanceMap.get(studyId);
    if (!instanceId) return;

    const currentIndicators = this._chartStore.settings.get().indicators;
    const updatedIndicators = currentIndicators.filter((ind) => ind.id !== instanceId);

    this._chartStore.settings.setKey('indicators', updatedIndicators);
    this._markDirty();
  }

  /**
   * Get input definitions for a study (or jailbreak indicator instance)
   */
  getStudyInputDefinitions(studyId: string): import('@tealstreet/tealscript').InputDefinition[] {
    // Check if this is a jailbreak indicator
    if (this._jailbreakInstanceIds.has(studyId)) {
      return this._getJailbreakInputDefinitions(studyId);
    }
    return this._tealScriptManager?.getInputDefinitions(studyId) ?? [];
  }

  /**
   * Get input definitions for a jailbreak indicator instance
   */
  private _getJailbreakInputDefinitions(instanceId: string): import('@tealstreet/tealscript').InputDefinition[] {
    if (!this._chartStore) return [];

    const instance = this._chartStore.settings.get().indicators.find((ind) => ind.id === instanceId);
    if (!instance) return [];

    const builtin = getIndicatorById(instance.builtinId);
    if (!builtin?.jailbreak) return [];

    return jailbreakInputsToInputDefinitions(builtin.jailbreak.inputs);
  }

  private _getTealscriptRuntimeOptions(): TealscriptRuntimeOptions {
    const symbolInfo = this._symbolInfo;
    const pricescale = symbolInfo?.pricescale && symbolInfo.pricescale > 0 ? symbolInfo.pricescale : undefined;
    const minmov = symbolInfo?.minmov && symbolInfo.minmov > 0 ? symbolInfo.minmov : 1;

    return {
      syminfo: {
        ticker: symbolInfo?.ticker ?? symbolInfo?.name ?? this._symbol,
        description: symbolInfo?.description ?? symbolInfo?.name ?? this._symbol,
        type: symbolInfo?.type ?? undefined,
        timezone: symbolInfo?.timezone ?? 'UTC',
        ...(pricescale !== undefined
          ? {
              pricescale,
              mintick: minmov / pricescale,
            }
          : {}),
      },
      timeframe: this._getTealscriptTimeframeInfo(this._interval),
    };
  }

  private _getTealscriptTimeframeInfo(period: ResolutionString): TealscriptRuntimeOptions['timeframe'] {
    const normalized = String(period).trim().toUpperCase();
    const numericMinutes = Number(normalized);
    if (Number.isFinite(numericMinutes) && numericMinutes > 0) {
      return {
        period: String(period),
        multiplier: numericMinutes,
        isminutes: true,
        isdaily: false,
        isweekly: false,
        ismonthly: false,
        isintraday: true,
        isseconds: false,
        isticks: false,
      };
    }

    const match = /^(\d+)?([STDWM])$/.exec(normalized);
    const multiplier = match?.[1] === undefined ? 1 : Number(match[1]);
    const unit = match?.[2];
    return {
      period: String(period),
      multiplier: Number.isFinite(multiplier) ? multiplier : 1,
      isminutes: false,
      isdaily: unit === 'D',
      isweekly: unit === 'W',
      ismonthly: unit === 'M',
      isintraday: unit === 'S' || unit === 'T',
      isseconds: unit === 'S',
      isticks: unit === 'T',
    };
  }

  /**
   * Set input values for a study (or jailbreak indicator instance)
   */
  setStudyInputs(studyId: string, inputs: Record<string, unknown>): void {
    // Check if this is a jailbreak indicator
    if (this._jailbreakInstanceIds.has(studyId)) {
      this._setJailbreakInputs(studyId, inputs);
      return;
    }

    if (this._tealScriptManager) {
      this._tealScriptManager.setInputs(studyId, inputs);
      // Also update the API's study state
      const study = this._chartApi.getStudyById(studyId);
      if (study) {
        study.setInputs(inputs);
      }

      // Persist inputs change
      this._persistUpdateIndicatorInputs(studyId, inputs);

      // Re-render to update the legend
      this._scheduler.markDirty(DIRTY.FULL);
    }
  }

  /**
   * Set inputs for a jailbreak indicator and update its registration
   */
  private _setJailbreakInputs(instanceId: string, inputs: Record<string, unknown>): void {
    if (!this._jailbreakManager || !this._chartStore) return;

    const instance = this._chartStore.settings.get().indicators.find((ind) => ind.id === instanceId);
    if (!instance) return;

    const builtin = getIndicatorById(instance.builtinId);
    if (!builtin?.jailbreak) return;

    // Merge new inputs with existing
    const mergedInputs = { ...instance.inputs, ...inputs };

    // Rebuild settings and update the jailbreak manager
    const settings = this._buildJailbreakSettings(builtin, mergedInputs);
    this._jailbreakManager.updateSettings(instanceId, settings);

    // Handle behindCandles change: need to re-register since behindCandles is set at register time
    const newBehindCandles =
      (mergedInputs.behindCandles as boolean | undefined) ?? builtin.jailbreak.behindCandles ?? false;
    const factory = this._options.jailbreakIndicatorFactories?.[builtin.id];
    if (factory && instance.isVisible) {
      const barsIndicator = factory();
      this._jailbreakManager.unregister(instanceId);
      this._jailbreakManager.register(instanceId, barsIndicator, settings, newBehindCandles);
    }

    // Persist
    const currentIndicators = this._chartStore.settings.get().indicators;
    const updatedIndicators = currentIndicators.map((ind) =>
      ind.id === instanceId ? { ...ind, inputs: mergedInputs } : ind,
    );
    this._chartStore.settings.setKey('indicators', updatedIndicators);
    this._markDirty();
    this._scheduler.markDirty(DIRTY.FULL);
  }

  /**
   * Persist indicator inputs update
   */
  private _persistUpdateIndicatorInputs(studyId: string, inputs: Record<string, unknown>): void {
    if (!this._chartStore) return;

    const instanceId = this._studyInstanceMap.get(studyId);
    if (!instanceId) return;

    const currentIndicators = this._chartStore.settings.get().indicators;
    const updatedIndicators = currentIndicators.map((ind) =>
      ind.id === instanceId ? { ...ind, inputs: { ...ind.inputs, ...inputs } } : ind,
    );

    this._chartStore.settings.setKey('indicators', updatedIndicators);
    this._markDirty();
  }

  /**
   * Set style overrides for a study's plots
   */
  setStudyStyleOverrides(studyId: string, styleOverrides: PlotStyleOverride[]): void {
    // Persist style overrides
    this._persistUpdateIndicatorStyles(studyId, styleOverrides);

    // Re-render to apply the new styles
    this._scheduler.markDirty(DIRTY.FULL);
  }

  /**
   * Persist indicator style overrides
   */
  private _persistUpdateIndicatorStyles(studyId: string, styleOverrides: PlotStyleOverride[]): void {
    if (!this._chartStore) return;

    const instanceId = this._studyInstanceMap.get(studyId);
    if (!instanceId) return;

    const currentIndicators = this._chartStore.settings.get().indicators;
    const updatedIndicators = currentIndicators.map((ind) =>
      ind.id === instanceId ? { ...ind, styleOverrides } : ind,
    );

    this._chartStore.settings.setKey('indicators', updatedIndicators);
    this._markDirty();
  }

  /**
   * Handle opening indicator settings modal
   */
  private _handleSettingsIndicator(_indicatorId: string): void {
    // This is handled by ChartContainer state, which will call getStudyInputDefinitions
    // and render the modal. The settings save callback will call setStudyInputs.
  }

  private _getContainerSize(): { width: number; height: number } {
    if (this._options.fullscreen) {
      return {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }

    if (this._options.autosize) {
      const rect = this._container.getBoundingClientRect();
      return {
        width: rect.width || DEFAULT_RENDER_OPTIONS.width,
        height: rect.height || DEFAULT_RENDER_OPTIONS.height,
      };
    }

    return {
      width: DEFAULT_RENDER_OPTIONS.width,
      height: DEFAULT_RENDER_OPTIONS.height,
    };
  }

  // ============================================================================
  // Symbol/Interval Change Handlers
  // ============================================================================

  /**
   * Shared transition logic for symbol change, interval change, and resetData.
   * Handles the common pattern: stop gap detection → unsubscribe → set loading →
   * update state → schedule render (faded) → resolve symbol → load bars.
   *
   * Old bars/plots/viewport are NOT cleared — they stay visible (faded) until
   * new data arrives, at which point _loadBars atomically replaces them.
   */
  private _startDataLoad(options: {
    newSymbol?: string;
    newInterval?: ResolutionString;
    resolveSymbolName?: string; // The symbol name to pass to resolveSymbol (may include exchange prefix)
    reason: 'symbol' | 'interval' | 'reset';
  }): void {
    // Stop gap detection during transition
    this._gapDetectionManager?.stop();

    // Unsubscribe from old bars
    if (this._barSubscriptionGuid) {
      this._datafeed.unsubscribeBars(this._barSubscriptionGuid);
      this._barSubscriptionGuid = null;
    }

    // Set loading state — old data stays visible but faded
    this._isLoadingBars = true;
    this._hasMoreHistoricalData = true;
    this._isLoadingMoreBars = false;

    // Update symbol if changed
    if (options.newSymbol !== undefined) {
      this._symbol = options.newSymbol;
      this._ui?.setSymbol(options.newSymbol);
    }

    // Update interval if changed
    if (options.newInterval !== undefined) {
      this._interval = options.newInterval;
      this._ui?.setInterval(options.newInterval);
      // Sync interval to in-memory store (for auto-save via _getCurrentSettings)
      this._chartStore?.settings.setKey('interval', options.newInterval);
    }

    // Schedule render to show faded state immediately (opacity change only)
    this._scheduler.markDirty(DIRTY.CROSSHAIR);

    // Increment to invalidate any in-flight resolveSymbol callbacks
    const resolveRequestId = ++this._resolveSymbolRequestId;
    const symbolToResolve = options.resolveSymbolName ?? this._symbol;

    // Resolve symbol and start loading bars
    this._datafeed.resolveSymbol(
      symbolToResolve,
      (symbolInfo) => {
        if (this._disposed || resolveRequestId !== this._resolveSymbolRequestId) {
          this._logger?.debug(LogCategory.Widget, 'Discarded stale resolveSymbol callback', {
            symbol: symbolInfo.name,
            reason: options.reason,
          });
          return;
        }
        this._symbolInfo = symbolInfo;
        // Update price precision from symbol's pricescale
        if (symbolInfo.pricescale && symbolInfo.pricescale > 0) {
          this._renderOptions = {
            ...this._renderOptions,
            pricePrecision: 1 / symbolInfo.pricescale,
          };
        }
        // Push supported resolutions to UI (may have changed on exchange switch)
        this._ui?.setSupportedResolutions(this._supportedResolutions);
        this._loadBars();
      },
      (error) => {
        if (this._disposed || resolveRequestId !== this._resolveSymbolRequestId) {
          return;
        }
        this._logger?.error(LogCategory.Datafeed, `Failed to resolve symbol (${options.reason})`, error);
        this._isLoadingBars = false;
        this._scheduler.markDirty(DIRTY.FULL);
      },
    );
  }

  private _handleSymbolChange(symbol: string): void {
    // Strip exchange prefix if present (e.g., "bybit:BTCUSDT" → "BTCUSDT")
    // The datafeed resolveSymbol receives the full string including prefix,
    // but our internal _symbol should be the clean symbol for comparisons.
    const parts = symbol.split(':');
    const cleanSymbol = parts.length > 1 ? parts[1] : symbol;

    // Skip if symbol hasn't actually changed — prevents reload on click
    if (this._symbol === cleanSymbol) {
      return;
    }

    this._startDataLoad({
      newSymbol: cleanSymbol,
      resolveSymbolName: symbol, // Pass original with exchange prefix
      reason: 'symbol',
    });
  }

  private _handleIntervalChange(interval: ResolutionString): void {
    if (this._interval === interval) {
      return;
    }

    // _startDataLoad persists newInterval to the per-chart store, so a later
    // widget with the same chartKey (and no explicit interval) restores it.
    this._startDataLoad({
      newInterval: interval,
      reason: 'interval',
    });
  }

  /**
   * Handle resetData() — full data reload without symbol/interval change.
   * Called when the exchange changes, reconnection happens, or the datafeed
   * cache is invalidated. Mirrors TradingView's resetData() behavior:
   * unsubscribe → clear bars → re-resolve symbol → reload → resubscribe.
   */
  private _handleResetData(): void {
    this._startDataLoad({
      reason: 'reset',
    });
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Register callback for when chart is ready
   */
  onChartReady(callback: () => void): void {
    if (this._isReady) {
      try {
        callback();
      } catch (e) {
        this._logger?.error(LogCategory.Widget, 'Error in onChartReady callback', e);
      }
    } else {
      this._readyCallbacks.push(callback);
    }
  }

  /**
   * Returns a promise that resolves when header UI is ready
   */
  headerReady(): Promise<void> {
    // We don't have a header UI, so resolve immediately
    return Promise.resolve();
  }

  // ============================================================================
  // Gap Detection Error State
  // ============================================================================

  /**
   * Get current gap detection error state.
   * Returns null if no error, or error state if max retries exceeded.
   */
  getGapDetectionError(): GapDetectionErrorState | null {
    return this._gapDetectionError;
  }

  /**
   * Set callback for gap detection error updates.
   * Used by UI components to receive error state changes.
   */
  setGapDetectionErrorCallback(callback: ((error: GapDetectionErrorState | null) => void) | null): void {
    this._gapDetectionErrorCallback = callback;
  }

  /**
   * Get the debug logger for this chart instance.
   * Used by React components to display logs in the UI.
   * Returns null if debug overlay is disabled.
   */
  getLogger(): TealchartLogger | null {
    return this._logger;
  }

  /**
   * Set the jailbreak indicator manager for custom indicator rendering.
   * Delegates to the UI / ChartCore / Renderer chain.
   */
  setJailbreakManager(manager: import('./jailbreak/JailbreakIndicatorManager').JailbreakIndicatorManager | null): void {
    this._ui?.setJailbreakManager(manager);
  }

  /**
   * Set extra tooltip context for jailbreak indicators (e.g., exchange object).
   * Merged into tooltip args when collecting crosshair tooltips.
   */
  setJailbreakTooltipContext(context: Record<string, unknown>): void {
    this._jailbreakManager?.setTooltipContext(context);
  }

  /**
   * Remove the widget and clean up
   */
  remove(): void {
    // Mark as disposed to invalidate all in-flight async callbacks
    this._disposed = true;

    // Unsubscribe from bars
    if (this._barSubscriptionGuid) {
      this._datafeed.unsubscribeBars(this._barSubscriptionGuid);
    }

    // Clean up keyboard event listeners (document-level)
    if (this._boundHandleKeyDown) {
      document.removeEventListener('keydown', this._boundHandleKeyDown);
      this._boundHandleKeyDown = null;
    }
    if (this._boundHandleKeyUp) {
      document.removeEventListener('keyup', this._boundHandleKeyUp);
      this._boundHandleKeyUp = null;
    }
    // Clean up hover tracking listeners
    if (this._boundHandleMouseEnter) {
      this._container.removeEventListener('mouseenter', this._boundHandleMouseEnter);
      this._boundHandleMouseEnter = null;
    }
    if (this._boundHandleMouseLeave) {
      this._container.removeEventListener('mouseleave', this._boundHandleMouseLeave);
      this._boundHandleMouseLeave = null;
    }

    // Cancel pending auto-save
    if (this._autoSaveTimer) {
      clearTimeout(this._autoSaveTimer);
      this._autoSaveTimer = null;
    }

    // Cancel pending render scheduler
    this._scheduler.dispose();

    // Clean up resize observer
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }

    // Clean up gap detection manager
    if (this._gapDetectionManager) {
      this._gapDetectionManager.dispose();
      this._gapDetectionManager = null;
    }

    // Clean up Tealscript manager
    if (this._tealScriptManager) {
      this._tealScriptManager.dispose();
      this._tealScriptManager = null;
    }

    // Clean up jailbreak indicator state
    this._jailbreakManager = null;
    this._jailbreakInstanceIds.clear();

    // Clean up chart API
    this._chartApi.dispose();

    // Clean up event emitter
    this._eventEmitter.removeAllListeners();

    // Dispose vanilla UI — preserve DOM so the new widget can show old
    // content until its first paint with bars (prevents blank flash).
    // The new widget's cleanupStaleSiblings() handles removal.
    if (this._ui) {
      this._ui.dispose(true);
      this._ui = null;
    }
  }

  // ============================================================================
  // Multi-Chart Support (Single chart for now)
  // ============================================================================

  /**
   * Get number of charts (synchronous - TradingView compatible)
   */
  chartsCount(): number {
    return 1;
  }

  /**
   * Get chart API by index
   */
  chart(_index?: number): TealchartApi {
    // Only support single chart for now
    return this._chartApi;
  }

  /**
   * Get active chart API
   */
  activeChart(): TealchartApi {
    return this._chartApi;
  }

  getUserDrawingState(): UserDrawingState {
    return this._userDrawingState;
  }

  exportUserDrawingStateForLayout(): UserDrawingState | undefined {
    return serializeUserDrawingStateForLayout(this._userDrawingState);
  }

  importUserDrawingStateFromLayout(state?: UserDrawingState | null): void {
    this._userDrawingHistory = clearUserDrawingCommandHistory(this._userDrawingHistory);
    this.setUserDrawingState(deserializeUserDrawingStateFromLayout(state) ?? createUserDrawingState(), {
      markLayoutDirty: false,
    });
  }

  setUserDrawingState(
    state: UserDrawingState,
    options: { markLayoutDirty?: boolean; preserveHistory?: boolean } = {},
  ): void {
    if (state === this._userDrawingState) return;
    const previousState = this._userDrawingState;
    if (!options.preserveHistory) {
      this._userDrawingHistory = clearUserDrawingCommandHistory(this._userDrawingHistory);
    }
    this._userDrawingState = state;
    this._options.onUserDrawingStateChange?.(state);
    this._scheduler.markDirty(DIRTY.USER_DRAWINGS);
    if (options.markLayoutDirty !== false && !isUserDrawingLayoutStateEqual(previousState, state)) {
      this._markDirty();
    }
  }

  setActiveUserDrawingTool(tool: UserDrawingTool): void {
    this.dispatchUserDrawingCommand({ type: 'setActiveTool', tool, meta: { source: 'api' } });
  }

  canUndoUserDrawingCommand(): boolean {
    return canUndoUserDrawingCommandHistory(this._userDrawingHistory);
  }

  canRedoUserDrawingCommand(): boolean {
    return canRedoUserDrawingCommandHistory(this._userDrawingHistory);
  }

  undoUserDrawingCommand(): boolean {
    const result = undoUserDrawingCommandHistory(this._userDrawingState, this._userDrawingHistory);
    this._userDrawingHistory = result.history;
    if (result.changed) {
      this.setUserDrawingState(result.state, { preserveHistory: true });
    }
    return result.changed;
  }

  redoUserDrawingCommand(): boolean {
    const result = redoUserDrawingCommandHistory(this._userDrawingState, this._userDrawingHistory);
    this._userDrawingHistory = result.history;
    if (result.changed) {
      this.setUserDrawingState(result.state, { preserveHistory: true });
    }
    return result.changed;
  }

  selectUserDrawing(drawingId: string | null, handle?: UserDrawingHandleRole): void {
    this.dispatchUserDrawingCommand({ type: 'select', drawingId, handle, meta: { source: 'api' } });
  }

  selectUserDrawings(drawingIds: readonly string[]): void {
    this.dispatchUserDrawingCommand({ type: 'selectMany', drawingIds, meta: { source: 'api' } });
  }

  deleteUserDrawing(drawingId?: string): boolean {
    return this.dispatchUserDrawingCommand({ type: 'delete', options: { drawingId }, meta: { source: 'api' } });
  }

  deleteSelectedUserDrawing(): boolean {
    return this.deleteUserDrawing();
  }

  duplicateUserDrawing(drawingId?: string): boolean {
    return this.dispatchUserDrawingCommand({
      type: 'duplicate',
      options: {
        drawingId,
        createId: () => this._createUserDrawingId(),
      },
      meta: { source: 'api' },
    });
  }

  duplicateSelectedUserDrawing(): boolean {
    return this.duplicateUserDrawing();
  }

  clearUserDrawings(): void {
    this.dispatchUserDrawingCommand({ type: 'clear', meta: { source: 'api' } });
  }

  cancelUserDrawingDraft(): void {
    this.dispatchUserDrawingCommand({ type: 'cancelDraft', meta: { source: 'api' } });
  }

  beginUserDrawingTextEdit(drawingId = this._userDrawingState.selection?.drawingId): boolean {
    return this.dispatchUserDrawingCommand({ type: 'beginTextEdit', drawingId, meta: { source: 'api' } });
  }

  updateUserDrawingTextEdit(value: string): boolean {
    return this.dispatchUserDrawingCommand({ type: 'updateTextEdit', value, meta: { source: 'textEditor' } });
  }

  commitUserDrawingTextEdit(): boolean {
    return this.dispatchUserDrawingCommand({ type: 'commitTextEdit', meta: { source: 'textEditor' } });
  }

  cancelUserDrawingTextEdit(): boolean {
    return this.dispatchUserDrawingCommand({ type: 'cancelTextEdit', meta: { source: 'textEditor' } });
  }

  setUserDrawingText(drawingId: string, text: string): boolean {
    return this.dispatchUserDrawingCommand({ type: 'setText', drawingId, text, meta: { source: 'api' } });
  }

  setUserDrawingTextContent(text: string, options: UpdateUserDrawingOptions = {}): boolean {
    return this.dispatchUserDrawingCommand({ type: 'setTextContent', text, options, meta: { source: 'api' } });
  }

  updateUserDrawingStyle(style: Partial<UserDrawingStyle>, options: UpdateUserDrawingOptions = {}): boolean {
    return this.dispatchUserDrawingCommand({ type: 'updateStyle', style, options, meta: { source: 'api' } });
  }

  setUserDrawingName(drawingId: string, name: string | null, options: UpdateUserDrawingOptions = {}): boolean {
    return this.dispatchUserDrawingCommand({ type: 'setName', drawingId, name, options, meta: { source: 'api' } });
  }

  setUserDrawingTextAlign(textAlign: UserDrawingTextAlign, options: UpdateUserDrawingOptions = {}): boolean {
    return this.dispatchUserDrawingCommand({ type: 'setTextAlign', textAlign, options, meta: { source: 'api' } });
  }

  setUserDrawingTrendLineExtend(
    extend: UserDrawingTrendLineExtend,
    options: UpdateUserDrawingOptions = {},
  ): boolean {
    return this.dispatchUserDrawingCommand({ type: 'setTrendLineExtend', extend, options, meta: { source: 'api' } });
  }

  setUserDrawingIconName(iconName: UserDrawingIconName, options: UpdateUserDrawingOptions = {}): boolean {
    return this.dispatchUserDrawingCommand({ type: 'setIconName', iconName, options, meta: { source: 'api' } });
  }

  setUserDrawingImageSource(source: UserDrawingImageSourceInput, options: UpdateUserDrawingOptions = {}): boolean {
    return this.dispatchUserDrawingCommand({ type: 'setImageSource', source, options, meta: { source: 'api' } });
  }

  setUserDrawingTableCells(cells: UserDrawingTableCellsInput, options: UpdateUserDrawingOptions = {}): boolean {
    return this.dispatchUserDrawingCommand({ type: 'setTableCells', cells, options, meta: { source: 'api' } });
  }

  setUserDrawingTableCell(
    row: number,
    column: number,
    value: UserDrawingTableCellInput,
    options: UpdateUserDrawingOptions = {},
  ): boolean {
    return this.dispatchUserDrawingCommand({
      type: 'setTableCell',
      row,
      column,
      value,
      options,
      meta: { source: 'api' },
    });
  }

  setUserDrawingTableDimensions(rows: number, columns: number, options: UpdateUserDrawingOptions = {}): boolean {
    return this.dispatchUserDrawingCommand({ type: 'setTableDimensions', rows, columns, options, meta: { source: 'api' } });
  }

  insertUserDrawingTableRow(
    row: number,
    values?: UserDrawingTableRowInput,
    options: UpdateUserDrawingOptions = {},
  ): boolean {
    return this.dispatchUserDrawingCommand({ type: 'insertTableRow', row, values, options, meta: { source: 'api' } });
  }

  deleteUserDrawingTableRow(row: number, options: UpdateUserDrawingOptions = {}): boolean {
    return this.dispatchUserDrawingCommand({ type: 'deleteTableRow', row, options, meta: { source: 'api' } });
  }

  insertUserDrawingTableColumn(
    column: number,
    values?: UserDrawingTableColumnInput,
    options: UpdateUserDrawingOptions = {},
  ): boolean {
    return this.dispatchUserDrawingCommand({ type: 'insertTableColumn', column, values, options, meta: { source: 'api' } });
  }

  deleteUserDrawingTableColumn(column: number, options: UpdateUserDrawingOptions = {}): boolean {
    return this.dispatchUserDrawingCommand({ type: 'deleteTableColumn', column, options, meta: { source: 'api' } });
  }

  setUserDrawingVisibility(visible: boolean, options: UpdateUserDrawingOptions = {}): boolean {
    return this.dispatchUserDrawingCommand({ type: 'setVisibility', visible, options, meta: { source: 'api' } });
  }

  setUserDrawingLocked(locked: boolean, options: UpdateUserDrawingOptions = {}): boolean {
    return this.dispatchUserDrawingCommand({ type: 'setLocked', locked, options, meta: { source: 'api' } });
  }

  reorderUserDrawings(action: UserDrawingZOrderAction, options: UpdateUserDrawingOptions = {}): boolean {
    return this.dispatchUserDrawingCommand({ type: 'reorder', action, options, meta: { source: 'api' } });
  }

  bringUserDrawingForward(options: UpdateUserDrawingOptions = {}): boolean {
    return this.reorderUserDrawings('bringForward', options);
  }

  sendUserDrawingBackward(options: UpdateUserDrawingOptions = {}): boolean {
    return this.reorderUserDrawings('sendBackward', options);
  }

  bringUserDrawingToFront(options: UpdateUserDrawingOptions = {}): boolean {
    return this.reorderUserDrawings('bringToFront', options);
  }

  sendUserDrawingToBack(options: UpdateUserDrawingOptions = {}): boolean {
    return this.reorderUserDrawings('sendToBack', options);
  }

  getUserDrawingObjectTreeModel(options: UserDrawingObjectTreeOptions = {}): UserDrawingObjectTreeModel {
    return resolveUserDrawingObjectTreeModel(this._userDrawingState, options);
  }

  openUserDrawingObjectTree(options: UserDrawingObjectTreeOptions = {}): UserDrawingObjectTreeModel {
    const model = this.getUserDrawingObjectTreeModel(options);
    this._options.onUserDrawingObjectTreeOpen?.(model);
    return model;
  }

  dispatchUserDrawingObjectTreeAction(action: UserDrawingObjectTreeDispatchAction): boolean {
    const resolvedAction: UserDrawingObjectTreeAction =
      action.type === 'duplicate' ? { ...action, createId: action.createId ?? (() => this._createUserDrawingId()) } : action;
    const commands = resolveUserDrawingObjectTreeActionCommands(this._userDrawingState, resolvedAction, {
      now: () => Date.now(),
    });
    let changed = false;
    for (const command of commands) {
      changed = this.dispatchUserDrawingCommand(command) || changed;
    }
    return changed;
  }

  private _createUserDrawingId(): string {
    const existingIds = new Set(this._userDrawingState.drawings.map((drawing) => drawing.id));
    let id = '';
    do {
      id = `drawing_${++this._userDrawingIdCounter}`;
    } while (existingIds.has(id));
    return id;
  }

  private dispatchUserDrawingCommand(command: Parameters<typeof dispatchUserDrawingCommand>[1]): boolean {
    const result = dispatchUserDrawingCommandWithHistory(this._userDrawingState, this._userDrawingHistory, command);
    this._userDrawingHistory = result.history;
    this.setUserDrawingState(result.state, { preserveHistory: true });
    return result.changed;
  }

  private _measureUserDrawingTextLabelLine = (drawing: UserDrawingTextAnnotation, line: string): number => {
    this._userDrawingTextMeasureCtx ??= document.createElement('canvas').getContext('2d');
    const ctx = this._userDrawingTextMeasureCtx;
    if (!ctx) return line.length * 6;

    const fontSize = normalizeUserDrawingFontSize(drawing.style.fontSize ?? 12);
    const fontFamily = normalizeUserDrawingFontFamily(drawing.style.fontFamily ?? 'sans-serif');
    ctx.font = `${fontSize}px ${fontFamily}`;
    return ctx.measureText(line).width;
  };

  private _getUserDrawingHitTestOptions(): UserDrawingHitTestOptions {
    return {
      labelHeight: 20,
      measureTextLabelLine: this._measureUserDrawingTextLabelLine,
    };
  }

  private _handleUserDrawingInput(point: UserDrawingInputPoint): boolean {
    if (this._userDrawingState.activeTool === 'select') return false;

    return this.dispatchUserDrawingCommand({
      type: 'handleInput',
      point,
      options: {
        createId: () => this._createUserDrawingId(),
      },
      meta: { source: 'pointer' },
    });
  }

  private _handleUserDrawingPlacementDragStart(point: UserDrawingInputPoint): boolean {
    return this.dispatchUserDrawingCommand({
      type: 'beginPlacementDrag',
      point,
      meta: { source: 'pointer', transactionKey: 'placement-drag' },
    });
  }

  private _handleUserDrawingPlacementDragEnd(point: UserDrawingInputPoint): boolean {
    return this.dispatchUserDrawingCommand({
      type: 'commitPlacementDrag',
      point,
      options: {
        createId: () => this._createUserDrawingId(),
      },
      meta: { source: 'pointer', transactionKey: 'placement-drag' },
    });
  }

  private _handleUserDrawingPathDragStart(point: UserDrawingInputPoint): boolean {
    if (this._userDrawingState.activeTool !== 'path') return false;

    return this.dispatchUserDrawingCommand({
      type: 'beginPathDrag',
      point,
      meta: { source: 'pointer', transactionKey: 'path-drag' },
    });
  }

  private _handleUserDrawingPathDragMove(point: UserDrawingInputPoint): boolean {
    if (this._userDrawingState.activeTool !== 'path') return false;

    return this.dispatchUserDrawingCommand({
      type: 'appendPathDragPoint',
      point,
      meta: { source: 'pointer', transactionKey: 'path-drag' },
    });
  }

  private _handleUserDrawingPathDragEnd(): void {
    if (this._userDrawingState.activeTool !== 'path') return;

    this.dispatchUserDrawingCommand({
      type: 'commitPathDrag',
      options: {
        createId: () => this._createUserDrawingId(),
      },
      meta: { source: 'pointer', transactionKey: 'path-drag' },
    });
  }

  private _handleUserDrawingSelection(
    point: DrawingScreenPoint,
    spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
    options: Pick<UserDrawingSelectionInputOptions, 'additive'> = {},
  ): UserDrawingSelectionAtPointResult {
    if (this._userDrawingState.activeTool !== 'select') {
      return { state: this._userDrawingState, hit: false, changed: false };
    }

    const result = dispatchUserDrawingCommand(this._userDrawingState, {
      type: 'selectAtPoint',
      point,
      spacesByPaneId,
      options: {
        additive: options.additive,
        hitTest: this._getUserDrawingHitTestOptions(),
      },
      meta: { source: 'pointer' },
    });
    this.setUserDrawingState(result.state, { preserveHistory: true });
    return {
      state: result.state,
      hit: result.hit ?? false,
      changed: result.changed,
    };
  }

  private _handleUserDrawingEditStart(
    point: DrawingScreenPoint,
    spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
  ): boolean {
    if (this._userDrawingState.activeTool !== 'select') return false;

    const result = dispatchUserDrawingCommand(this._userDrawingState, {
      type: 'beginEditDragAtPoint',
      point,
      spacesByPaneId,
      options: {
        hitTest: this._getUserDrawingHitTestOptions(),
      },
      meta: { source: 'pointer', transactionKey: 'edit-drag' },
    });
    if (!result.hit || !result.editDrag) return false;

    this._userDrawingEditDrag = result.editDrag;
    this.setUserDrawingState(result.state, { preserveHistory: true });
    return true;
  }

  private _handleUserDrawingContextMenu(
    point: DrawingScreenPoint,
    spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
  ): ContextMenuItem[] {
    if (this._userDrawingState.activeTool !== 'select') return [];

    const result = resolveUserDrawingContextActionsAtPoint(this._userDrawingState, point, spacesByPaneId, {
      hitTest: this._getUserDrawingHitTestOptions(),
    });
    if (!result.hit) return [];
    if (result.changed) {
      this.setUserDrawingState(result.state, { preserveHistory: true });
    }

    return result.items.map((item) => ({
      position: item.groupId === 'visibility' ? 'bottom' : 'top',
      text: item.label,
      enabled: item.enabled,
      click: () => this._dispatchUserDrawingContextAction(item),
    }));
  }

  private _dispatchUserDrawingContextAction(item: UserDrawingContextActionItem): void {
    if (!item.enabled) return;
    const { command } = item;
    if (command.type === 'styleAction') {
      if (command.visible !== undefined) {
        this.setUserDrawingVisibility(command.visible);
      }
      if (command.locked !== undefined) {
        this.setUserDrawingLocked(command.locked, { includeLocked: command.includeLocked });
      }
      return;
    }

    if (command.action === 'duplicateSelected') {
      this.duplicateSelectedUserDrawing();
    } else if (command.action === 'deleteSelected') {
      this.deleteSelectedUserDrawing();
    } else {
      this.reorderUserDrawings(command.action);
    }
  }

  private _handleUserDrawingEditMove(point: DrawingScreenPoint): boolean {
    if (!this._userDrawingEditDrag) return false;

    return this.dispatchUserDrawingCommand({
      type: 'applyEditDrag',
      drag: this._userDrawingEditDrag,
      point,
      meta: { source: 'pointer', transactionKey: 'edit-drag' },
    });
  }

  private _handleUserDrawingEditEnd(): void {
    this._userDrawingEditDrag = null;
  }

  private _handlePaneDoubleClick(
    paneId: string,
    point: DrawingScreenPoint,
    spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
  ): void {
    const intent = resolveUserDrawingEditIntentAtPoint(this._userDrawingState, point, spacesByPaneId, {
      source: 'pointer',
      hitTest: this._getUserDrawingHitTestOptions(),
    });

    if (intent.type !== 'pane') {
      let nextState = this._userDrawingState;
      let changed = false;
      for (const command of intent.commands) {
        const result = dispatchUserDrawingCommand(nextState, command);
        nextState = result.state;
        changed = result.changed || changed;
      }
      if (changed) {
        this.setUserDrawingState(nextState, { preserveHistory: true });
      }
      return;
    }

    this._paneManager.toggleMaximizePane(paneId);
    this._scheduler.markDirty(DIRTY.LAYOUT | DIRTY.VIEWPORT);
  }

  /**
   * Get active chart index (synchronous - TradingView compatible)
   */
  activeChartIndex(): number {
    return 0;
  }

  // ============================================================================
  // Styling
  // ============================================================================

  /**
   * Apply style overrides (TradingView-style dot-notation paths)
   */
  applyOverrides(overrides: ChartOverrides): void {
    // Map TradingView override paths to our render options
    const newOptions: Partial<RenderOptions> = { ...this._renderOptions };

    if (overrides['mainSeriesProperties.candleStyle.upColor']) {
      newOptions.upColor = overrides['mainSeriesProperties.candleStyle.upColor'];
    }
    if (overrides['mainSeriesProperties.candleStyle.downColor']) {
      newOptions.downColor = overrides['mainSeriesProperties.candleStyle.downColor'];
    }
    if (overrides['paneProperties.background']) {
      newOptions.backgroundColor = overrides['paneProperties.background'];
    }
    if (overrides['paneProperties.vertGridProperties.color']) {
      newOptions.gridColor = overrides['paneProperties.vertGridProperties.color'];
    }
    if (overrides['paneProperties.horzGridProperties.color']) {
      newOptions.gridColor = overrides['paneProperties.horzGridProperties.color'];
    }
    if (overrides['scalesProperties.textColor']) {
      newOptions.textColor = overrides['scalesProperties.textColor'];
    }
    if (overrides['paneProperties.crossHairProperties.color']) {
      newOptions.crosshairColor = overrides['paneProperties.crossHairProperties.color'];
    }
    if (overrides['volumePaneProperties.showVolume'] !== undefined) {
      newOptions.showVolume = overrides['volumePaneProperties.showVolume'];
    }
    if (overrides['volumePaneProperties.volumeHeight'] !== undefined) {
      newOptions.volumeHeight = overrides['volumePaneProperties.volumeHeight'];
    }

    this._renderOptions = newOptions;

    // Re-render if already mounted
    if (this._ui && this._bars.length > 0) {
      this._scheduler.markDirty(DIRTY.FULL);
    }
  }

  /**
   * Apply study overrides
   * @stub Not yet implemented
   */
  applyStudiesOverrides(_overrides: Record<string, unknown>): void {
    // TODO: Implement when study support is added
  }

  /**
   * Set CSS custom property
   * @stub Not yet implemented
   */
  setCSSCustomProperty(_key: string, _value: string): void {
    // TODO: Implement CSS custom properties support
  }

  // ============================================================================
  // Events
  // ============================================================================

  /**
   * Subscribe to widget events
   */
  subscribe(event: WidgetEvent, callback: EventCallback): void {
    this._eventEmitter.subscribe(event, callback);
  }

  /**
   * Unsubscribe from widget events
   */
  unsubscribe(event: WidgetEvent, callback: EventCallback): void {
    this._eventEmitter.unsubscribe(event, callback);
  }

  // ============================================================================
  // Keyboard Shortcuts
  // ============================================================================

  // Bound event handlers for cleanup
  private _boundHandleKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _boundHandleKeyUp: ((e: KeyboardEvent) => void) | null = null;
  private _boundHandleMouseEnter: (() => void) | null = null;
  private _boundHandleMouseLeave: (() => void) | null = null;

  // Track if mouse is over the container (for keyboard event handling)
  private _isHovered = false;

  /**
   * Set up keyboard event listeners
   * Uses document-level listeners with hover tracking for robust keyboard handling
   * This matches TradingView's behavior where shortcuts work when mouse is over chart
   */
  private _setupKeyboardListeners(): void {
    // Make container focusable (tabIndex -1 = focusable but not in tab order)
    this._container.tabIndex = -1;
    // Remove focus outline since we're using hover-based activation
    this._container.style.outline = 'none';

    // Store bound handlers for cleanup
    this._boundHandleKeyDown = this._handleKeyDown.bind(this);
    this._boundHandleKeyUp = this._handleKeyUp.bind(this);
    this._boundHandleMouseEnter = () => {
      this._isHovered = true;
      // Focus the container so keyboard events have it as target
      // This is important for useHotkeyHandlers' isValidHotkeyPress check
      this._container.focus();
    };
    this._boundHandleMouseLeave = () => {
      this._isHovered = false;
    };

    // Use document-level listeners so we can receive keyboard events regardless of focus
    document.addEventListener('keydown', this._boundHandleKeyDown);
    document.addEventListener('keyup', this._boundHandleKeyUp);

    // Track mouse hover state and manage focus
    this._container.addEventListener('mouseenter', this._boundHandleMouseEnter);
    this._container.addEventListener('mouseleave', this._boundHandleMouseLeave);
  }

  /**
   * Create a synthetic KeyboardEvent with the chart container as target
   * This is necessary because document-level events have arbitrary targets,
   * but useHotkeyHandlers checks if target is an input element to reject events
   */
  private _createSyntheticKeyboardEvent(original: KeyboardEvent): KeyboardEvent {
    // Create a new event that will be dispatched on our container
    // This way, e.target will be our container instead of some random focused element
    const syntheticEvent = new KeyboardEvent(original.type, {
      key: original.key,
      code: original.code,
      keyCode: original.keyCode,
      charCode: original.charCode,
      which: original.which,
      ctrlKey: original.ctrlKey,
      shiftKey: original.shiftKey,
      altKey: original.altKey,
      metaKey: original.metaKey,
      repeat: original.repeat,
      bubbles: false, // Don't bubble to prevent double-handling
      cancelable: true,
    });
    return syntheticEvent;
  }

  /**
   * Check if keyboard event originated from an input element
   * If so, we should not process it as a hotkey
   */
  private _isInputElement(e: KeyboardEvent): boolean {
    const target = e.target as HTMLElement;
    if (!target) return false;

    const tagName = target.tagName?.toUpperCase();
    if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
      return true;
    }

    // Also check for contenteditable elements
    if (target.isContentEditable) {
      return true;
    }

    return false;
  }

  /**
   * Handle keyboard down event
   */
  private _handleKeyDown(e: KeyboardEvent): void {
    // Only process keyboard events when mouse is over the chart
    if (!this._isHovered) {
      return;
    }

    // Don't capture events when user is typing in an input (e.g., modal search)
    if (this._isInputElement(e)) {
      return;
    }

    const key = e.key.toLowerCase();
    const isDrawingUndoKey = (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && key === 'z';
    if (isDrawingUndoKey && this.undoUserDrawingCommand()) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    const isDrawingRedoKey =
      (e.metaKey || e.ctrlKey) && !e.altKey && ((e.shiftKey && key === 'z') || (!e.shiftKey && key === 'y'));
    if (isDrawingRedoKey && this.redoUserDrawingCommand()) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    const isBareDeleteKey =
      (e.key === 'Delete' || e.key === 'Backspace') && !e.metaKey && !e.ctrlKey && !e.altKey;
    if (isBareDeleteKey && this.deleteSelectedUserDrawing()) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    for (const [shortcut, callback] of this._shortcuts) {
      if (this._matchShortcut(e, shortcut)) {
        callback(e);
        // Stop propagation to prevent other listeners from handling the same event
        // This prevents double-triggering of hotkey actions
        e.stopPropagation();
        e.preventDefault();
      }
    }
  }

  /**
   * Handle keyboard up event
   */
  private _handleKeyUp(e: KeyboardEvent): void {
    // Only process keyboard events when mouse is over the chart
    if (!this._isHovered) {
      return;
    }

    // Don't capture events when user is typing in an input (e.g., modal search)
    if (this._isInputElement(e)) {
      return;
    }

    for (const [shortcut, callback] of this._shortcuts) {
      if (this._matchShortcut(e, shortcut)) {
        callback(e);
        // Stop propagation to prevent other listeners from handling the same event
        e.stopPropagation();
        e.preventDefault();
      }
    }
  }

  /**
   * Match a keyboard event against a shortcut string
   * Supports formats: "b", "ctrl+b", "shift+a", "Escape", "ctrl+shift+c"
   */
  private _matchShortcut(e: KeyboardEvent, shortcut: string): boolean {
    const parts = shortcut.toLowerCase().split('+');
    const key = parts.pop()!;
    const modifiers = new Set(parts);

    // Check key - match against both key and code (for special keys)
    const eventKey = e.key.toLowerCase();
    const eventCode = e.code.toLowerCase();
    if (eventKey !== key && eventCode !== key) {
      return false;
    }

    // Check modifiers
    if (modifiers.has('ctrl') !== e.ctrlKey) return false;
    if (modifiers.has('alt') !== e.altKey) return false;
    if (modifiers.has('shift') !== e.shiftKey) return false;
    if (modifiers.has('meta') !== e.metaKey) return false;

    return true;
  }

  /**
   * Register keyboard shortcut handler
   */
  onShortcut(shortcut: string, callback: (e: KeyboardEvent) => void): void {
    this._shortcuts.set(shortcut, callback);
  }

  // ============================================================================
  // Context Menu
  // ============================================================================

  /**
   * Register context menu callback
   * Called with (unixTime, price) when user right-clicks on chart or clicks "+" button
   */
  onContextMenu(callback: ContextMenuCallback): void {
    this._contextMenuCallback = callback;
    // Update the UI's context menu callback so it can handle clicks
    if (this._ui) {
      this._ui.setContextMenuCallback(callback);
    }
  }

  // ============================================================================
  // Save/Load (Stubs)
  // ============================================================================

  /**
   * Save chart state
   * @stub Not yet implemented
   */
  save(callback: (state: object) => void): void {
    this._logger?.warn(LogCategory.Layout, 'Method not implemented: save');
    // Return minimal state
    callback({
      symbol: this._symbol,
      interval: this._interval,
      viewport: this._viewport,
    });
  }

  /**
   * Load chart state
   * @stub Not yet implemented
   */
  load(_state: object): Promise<void> {
    this._logger?.warn(LogCategory.Layout, 'Method not implemented: load');
    // TODO: Implement state restoration
    return Promise.resolve();
  }

  /**
   * Save chart to server
   * @stub Not yet implemented
   */
  saveChartToServer(_onComplete?: () => void, onFail?: () => void, _options?: { chartName?: string }): void {
    this._logger?.warn(LogCategory.Layout, 'Method not implemented: saveChartToServer');
    onFail?.();
  }

  // ============================================================================
  // Layout Selector Handlers
  // ============================================================================

  /**
   * Handle loading a layout from the LayoutSelector
   */
  private _handleLoadLayout(
    settings: ChartSettings,
    warnings: string[],
    _layoutId: string | number,
    _layoutName: string,
  ): void {
    if (warnings.length > 0) {
      this._logger?.warn(LogCategory.Layout, 'Layout load warnings', warnings);
    }

    // Update symbol if different
    if (settings.symbol && settings.symbol !== this._symbol) {
      this._chartApi.setSymbol(settings.symbol);
    }

    // Update interval if different
    if (settings.interval && settings.interval !== this._interval) {
      this._chartApi.setResolution(settings.interval);
    }

    // Clear existing indicators
    const existingStudies = this._chartApi.getAllStudies();
    for (const study of existingStudies) {
      this._handleRemoveIndicator(study.id);
    }

    // Add indicators from loaded settings
    if (settings.indicators && settings.indicators.length > 0) {
      for (const indicator of settings.indicators) {
        const builtinIndicator = getIndicatorById(indicator.builtinId);
        if (!builtinIndicator) {
          this._logger?.warn(LogCategory.Indicators, `Unknown indicator: ${indicator.builtinId}`);
          continue;
        }

        // Route jailbreak indicators to their own handler (they use BarsIndicator, not tealscript)
        if (builtinIndicator.jailbreak) {
          this._restoreJailbreakIndicator(indicator, builtinIndicator);
          continue;
        }

        // Tealscript indicators: create study with saved inputs
        this._chartApi
          .createStudy(
            builtinIndicator.code,
            builtinIndicator.overlay,
            false,
            indicator.inputs,
            {},
            { displayName: indicator.name },
          )
          .then((studyApi) => {
            if (studyApi) {
              const studyId = studyApi.getId();
              this._indicatorStudyMap.set(indicator.id, studyId);
              this._studyInstanceMap.set(studyId, indicator.id);
              this._indicatorConfigMap.set(studyId, builtinIndicator);
              this._paneManager.addIndicator({
                indicatorId: studyId,
                overlay: builtinIndicator.overlay,
                yAxisRange: builtinIndicator.yAxisRange,
              });
              this._scheduler.markDirty(DIRTY.FULL);
            }
          });
      }
    }

    // Apply loaded settings to the in-memory store so auto-save can read them
    if (this._chartStore) {
      this._chartStore.settings.setKey('indicators', settings.indicators || []);
      this._chartStore.settings.setKey('userDrawingState', settings.userDrawingState);
      this._chartStore.settings.setKey('showVolume', settings.showVolume);
      this._chartStore.settings.setKey('volumeHeight', settings.volumeHeight);
      this._chartStore.settings.setKey('chartType', settings.chartType || 'candle');
      this._chartStore.settings.setKey('autoScale', settings.autoScale);
      this._chartStore.settings.setKey('symbol', settings.symbol || this._symbol);
      this._chartStore.settings.setKey('interval', settings.interval || this._interval);
    }

    this.setUserDrawingState(settings.userDrawingState ?? createUserDrawingState(), { markLayoutDirty: false });

    if (!settings.autoScale) {
      this._viewportController.disableAutoScale('main');
    }

    // Apply viewport if saved (after symbol/interval change triggers bar load)
    if (settings.viewport) {
      const vp = {
        startTime: settings.viewport.startTime,
        endTime: settings.viewport.endTime,
        priceMin: settings.viewport.priceMin,
        priceMax: settings.viewport.priceMax,
      };
      this._viewport = vp;
      this._ui?.setViewport(vp);
      if (this._chartStore) {
        this._chartStore.settings.setKey('viewport', settings.viewport);
      }
    }

    // Re-render to reflect the loaded layout
    this._scheduler.markDirty(DIRTY.FULL);
  }

  /**
   * Handle save layout request from LayoutSelector
   */
  private _handleSaveLayout(): void {
    if (!this._chartStore) return;

    // Cancel any pending auto-save
    if (this._autoSaveTimer) {
      clearTimeout(this._autoSaveTimer);
      this._autoSaveTimer = null;
    }

    // Get current settings
    const settings = this._getCurrentSettings();
    const currentLayout = this._chartStore.currentLayout.get();

    // Pre-fill with current layout name if one is loaded
    const defaultName = currentLayout.layoutName || '';
    const layoutName = prompt('Enter layout name:', defaultName);
    if (!layoutName) return;

    // Save via adapter if available
    if (this._options.save_load_adapter) {
      // Set saving status
      this._chartStore.saveStatus.set('saving');
      this._scheduler.markDirty(DIRTY.FULL);

      // Determine if we should update existing or create new
      // Update if: same name as current layout AND we have a layout ID
      const shouldUpdate = currentLayout.layoutId && layoutName === currentLayout.layoutName;

      if (shouldUpdate) {
        // Update existing layout
        import('./transformer').then(({ updateTealchartLayout }) => {
          updateTealchartLayout(String(currentLayout.layoutId), settings, layoutName, this._options.save_load_adapter!)
            .then((chartId) => {
              if (!this._chartStore) return;
              this._chartStore.currentLayout.set({
                layoutId: chartId,
                layoutName,
              });
              this._chartStore.isDirty.set(false);
              this._chartStore.saveStatus.set('success');
              this._scheduler.markDirty(DIRTY.FULL);

              setTimeout(() => {
                if (!this._chartStore) return;
                this._chartStore.saveStatus.set('success-fading');
                this._scheduler.markDirty(DIRTY.FULL);
                setTimeout(() => {
                  if (!this._chartStore) return;
                  this._chartStore.saveStatus.set('idle');
                  this._scheduler.markDirty(DIRTY.FULL);
                }, 500);
              }, 500);
            })
            .catch((error) => {
              this._logger?.error(LogCategory.Layout, 'Failed to update layout', error);
              if (!this._chartStore) return;
              this._chartStore.saveStatus.set('error');
              this._scheduler.markDirty(DIRTY.FULL);
            });
        });
      } else {
        // Create new layout
        import('./transformer').then(({ saveTealchartLayout }) => {
          saveTealchartLayout(settings, layoutName, this._options.save_load_adapter!)
            .then((chartId) => {
              if (!this._chartStore) return;
              this._chartStore.currentLayout.set({
                layoutId: chartId,
                layoutName,
              });
              this._chartStore.isDirty.set(false);
              this._chartStore.saveStatus.set('success');
              this._scheduler.markDirty(DIRTY.FULL);

              setTimeout(() => {
                if (!this._chartStore) return;
                this._chartStore.saveStatus.set('success-fading');
                this._scheduler.markDirty(DIRTY.FULL);
                setTimeout(() => {
                  if (!this._chartStore) return;
                  this._chartStore.saveStatus.set('idle');
                  this._scheduler.markDirty(DIRTY.FULL);
                }, 500);
              }, 500);
            })
            .catch((error) => {
              this._logger?.error(LogCategory.Layout, 'Failed to save layout', error);
              if (!this._chartStore) return;
              this._chartStore.saveStatus.set('error');
              this._scheduler.markDirty(DIRTY.FULL);
            });
        });
      }
    }
  }

  /**
   * Save the current layout (update in place).
   * Called from the layout selector "Save" action.
   */
  private _handleSaveCurrentLayout(): void {
    if (!this._chartStore || !this._options.save_load_adapter) return;

    const currentLayout = this._chartStore.currentLayout.get();
    if (!currentLayout.layoutId || !currentLayout.layoutName) {
      // No layout loaded — treat as "Save As"
      const name = prompt('Layout name:');
      if (name && name.trim()) {
        this._handleSaveAsLayout(name.trim());
      }
      return;
    }

    const settings = this._getCurrentSettings();
    this._chartStore.saveStatus.set('saving');
    this._scheduler.markDirty(DIRTY.FULL);

    import('./transformer').then(({ updateTealchartLayout }) => {
      updateTealchartLayout(
        String(currentLayout.layoutId),
        settings,
        currentLayout.layoutName!,
        this._options.save_load_adapter!,
      )
        .then((chartId) => {
          if (!this._chartStore) return;
          this._chartStore.currentLayout.set({ layoutId: chartId, layoutName: currentLayout.layoutName });
          this._chartStore.isDirty.set(false);
          this._showSaveSuccess();
          this._ui?.setCurrentLayout(chartId, currentLayout.layoutName);
        })
        .catch((error) => {
          this._logger?.error(LogCategory.Layout, 'Failed to save layout', error);
          if (!this._chartStore) return;
          this._chartStore.saveStatus.set('error');
          this._scheduler.markDirty(DIRTY.FULL);
        });
    });
  }

  /**
   * Save as a new layout with the given name.
   * Called from the layout selector "Save As" action.
   */
  private _handleSaveAsLayout(layoutName: string): void {
    if (!this._chartStore || !this._options.save_load_adapter) return;

    const settings = this._getCurrentSettings();
    this._chartStore.saveStatus.set('saving');
    this._scheduler.markDirty(DIRTY.FULL);

    import('./transformer').then(({ saveTealchartLayout }) => {
      saveTealchartLayout(settings, layoutName, this._options.save_load_adapter!)
        .then((chartId) => {
          if (!this._chartStore) return;
          this._chartStore.currentLayout.set({ layoutId: chartId, layoutName });
          this._chartStore.isDirty.set(false);
          this._showSaveSuccess();
          this._ui?.setCurrentLayout(chartId, layoutName);
        })
        .catch((error) => {
          this._logger?.error(LogCategory.Layout, 'Failed to save layout', error);
          if (!this._chartStore) return;
          this._chartStore.saveStatus.set('error');
          this._scheduler.markDirty(DIRTY.FULL);
        });
    });
  }

  /**
   * Load a layout by ID.
   * Called from the layout selector list items.
   */
  private _handleLoadLayoutById(layoutId: string | number): void {
    if (!this._options.save_load_adapter) return;

    import('./transformer')
      .then(({ loadAsTealchart, getAllLayouts }) =>
        getAllLayouts(this._options.save_load_adapter!).then((layouts) => {
          const meta = layouts.find((l) => l.id === layoutId);
          const layoutName = meta?.name || 'Untitled';

          return loadAsTealchart(layoutId, this._options.save_load_adapter!).then((result) => ({
            layoutName,
            result,
          }));
        }),
      )
      .then(({ layoutName, result }) => {
        this._handleLoadLayout(result.data, result.warnings, layoutId, layoutName);

        // Update layout selector state
        if (this._chartStore) {
          this._chartStore.currentLayout.set({ layoutId: String(layoutId), layoutName });
          this._chartStore.isDirty.set(false);
        }
        this._ui?.setCurrentLayout(layoutId, layoutName);
      })
      .catch((error) => {
        this._logger?.error(LogCategory.Layout, 'Failed to load layout', error);
      });
  }

  /**
   * Delete a layout by ID.
   * Called from the layout selector delete action.
   */
  private _handleDeleteLayout(layoutId: string | number): void {
    if (!this._options.save_load_adapter) return;

    import('./transformer').then(({ deleteLayout }) => {
      deleteLayout(layoutId, this._options.save_load_adapter!)
        .then(() => {
          // If we deleted the currently loaded layout, clear it
          if (this._chartStore) {
            const current = this._chartStore.currentLayout.get();
            if (current.layoutId && String(current.layoutId) === String(layoutId)) {
              this._chartStore.currentLayout.set({ layoutId: null, layoutName: null });
              this._ui?.setCurrentLayout(null, null);
            }
          }
        })
        .catch((error) => {
          this._logger?.error(LogCategory.Layout, 'Failed to delete layout', error);
        });
    });
  }

  /**
   * Rename a layout.
   * Called from the layout selector rename action.
   */
  private _handleRenameLayout(layoutId: string | number, newName: string): void {
    if (!this._options.save_load_adapter) return;

    // To rename, we load the content, then save it back with the new name
    import('./transformer')
      .then(({ loadAsTealchart, updateTealchartLayout }) =>
        loadAsTealchart(layoutId, this._options.save_load_adapter!).then((result) =>
          updateTealchartLayout(String(layoutId), result.data, newName, this._options.save_load_adapter!),
        ),
      )
      .then(() => {
        // If this is the current layout, update state
        if (this._chartStore) {
          const current = this._chartStore.currentLayout.get();
          if (current.layoutId && String(current.layoutId) === String(layoutId)) {
            this._chartStore.currentLayout.set({ layoutId: current.layoutId, layoutName: newName });
            this._ui?.setCurrentLayout(current.layoutId, newName);
          }
        }
      })
      .catch((error) => {
        this._logger?.error(LogCategory.Layout, 'Failed to rename layout', error);
      });
  }

  /**
   * Show save success status with auto-fade
   */
  private _showSaveSuccess(): void {
    if (!this._chartStore) return;
    this._chartStore.saveStatus.set('success');
    this._scheduler.markDirty(DIRTY.FULL);

    setTimeout(() => {
      if (!this._chartStore) return;
      this._chartStore.saveStatus.set('success-fading');
      this._scheduler.markDirty(DIRTY.FULL);
      setTimeout(() => {
        if (!this._chartStore) return;
        this._chartStore.saveStatus.set('idle');
        this._scheduler.markDirty(DIRTY.FULL);
      }, 500);
    }, 500);
  }

  /**
   * Get current chart settings for saving
   */
  private _getCurrentSettings(): ChartSettings {
    // Gather settings from persisted state
    const storeSettings = this._chartStore?.settings.get();
    const indicators = storeSettings?.indicators ?? [];

    return {
      symbol: this._symbol,
      interval: this._interval,
      showVolume: this._renderOptions.showVolume ?? true,
      volumeHeight: this._renderOptions.volumeHeight ?? 0.2,
      chartType: storeSettings?.chartType ?? 'candle',
      autoScale: storeSettings?.autoScale ?? true,
      viewport: this._viewport
        ? {
            startTime: this._viewport.startTime,
            endTime: this._viewport.endTime,
            priceMin: this._viewport.priceMin,
            priceMax: this._viewport.priceMax,
          }
        : undefined,
      indicators,
      userDrawingState: this._userDrawingState,
      version: 1,
    };
  }

  // ============================================================================
  // Additional TradingView-compatible methods
  // ============================================================================

  /**
   * Get current symbol
   */
  symbol(): string {
    return this._symbol;
  }

  /**
   * Set symbol
   */
  setSymbol(symbol: string, interval?: ResolutionString, callback?: () => void): void {
    this._chartApi.setSymbol(symbol);
    if (interval) {
      this._chartApi.setResolution(interval);
    }
    // Call callback after symbol change completes
    if (callback) {
      // Use setTimeout to ensure async behavior
      setTimeout(callback, 0);
    }
  }

  /**
   * Get current interval
   */
  resolution(): ResolutionString {
    return this._interval;
  }

  /**
   * Change theme
   */
  changeTheme(theme: ChartThemeInput): void {
    this._renderOptions = {
      ...this._renderOptions,
      ...chartThemeToRenderOptions(theme),
      ...this._options.renderOptions,
    };

    if (this._ui) {
      this._scheduler.markDirty(DIRTY.OPTIONS | DIRTY.FULL);
    }
  }
}

/**
 * Factory function to create a TealchartWidget
 * Matches TradingView's widget creation pattern
 */
export function createTealchartWidget(options: TealchartWidgetOptions): TealchartWidget {
  return new TealchartWidget(options.container, options);
}
