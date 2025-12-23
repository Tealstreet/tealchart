/**
 * TealchartWidget - TradingView-compatible widget class
 * Mirrors TradingView's IChartingLibraryWidget for drop-in replacement
 */

import { EventEmitter } from './events/EventEmitter';
import { TealchartApi } from './TealchartApi';
import { TealchartWidgetUI } from './ui/TealchartWidgetUI';
import { TealscriptManager } from './tealscript/TealscriptManager';
import { type BuiltinIndicator, getIndicatorById } from './indicators/builtinIndicators';
import { getChartStore, type ChartSettings, type IndicatorInstance, type PlotStyleOverride, type ChartStore } from './state/chartState';
import { generateIndicatorId } from './state/indicatorActions';
import { PaneManager } from './rendering/PaneManager';
import { GapDetectionManager } from './GapDetectionManager';
import { TealchartLogger, LogCategory } from './debug/TealchartLogger';
import type { PlotOutput } from '@tealstreet/tealscript';
import {
  Bar,
  ChartOverrides,
  ContextMenuCallback,
  TealchartWidgetOptions,
  GapDetectionEvent,
  GapDetectionErrorState,
  IBasicDataFeed,
  LibrarySymbolInfo,
  RenderOptions,
  ResolutionString,
  Viewport,
  WidgetEvent,
  DEFAULT_RENDER_OPTIONS,
} from './types';

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
  private _loadBarsRequestId = 0;

  // Tealscript indicator support
  private _tealScriptManager: TealscriptManager | null = null;
  private _plots: PlotOutput[] = [];

  // Nanostores for imperative state access
  private _chartStore: ChartStore | null = null;

  // Map from indicator instance ID to study ID (used for persistence tracking)
  private _indicatorStudyMap = new Map<string, string>();
  // Reverse map from study ID to indicator instance ID
  private _studyInstanceMap = new Map<string, string>();

  // Pane management for non-overlay indicators
  private _paneManager: PaneManager;
  // Map from study ID to indicator config (for pane lookup)
  private _indicatorConfigMap = new Map<string, BuiltinIndicator>();
  // Auto-save timer ID
  private _autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  // Throttled crosshair emission (50ms matches TradingView's throttle in useWidgetStateManagement)
  private _lastCrossHairEmit = 0;
  private _crossHairEmitThrottleMs = 50;

  // Gap detection for automatic bar recovery
  private _gapDetectionManager: GapDetectionManager | null = null;
  private _gapDetectionError: GapDetectionErrorState | null = null;
  private _gapDetectionErrorCallback: ((error: GapDetectionErrorState | null) => void) | null = null;

  // Track if interval was explicitly provided (for controlled vs uncontrolled behavior)
  private _intervalWasProvided: boolean;

  // Debug logger for this chart instance (null if disabled)
  private _logger: TealchartLogger | null = null;

  // ============================================================================
  // Batched Rendering System
  // ============================================================================
  // All state updates schedule a single batched render via RAF.
  // The actual render passes current state to UI - ChartCore setters
  // use reference equality to skip unchanged data (like React refs).
  private _renderRafId: number | null = null;

  /**
   * Schedule a batched render. Multiple calls within the same frame
   * collapse into a single render (like React's batching).
   */
  private _scheduleRender(): void {
    if (this._renderRafId !== null) return; // Already scheduled
    this._renderRafId = requestAnimationFrame(() => {
      this._renderRafId = null;
      this._doRender();
    });
  }

  constructor(container: HTMLElement, options: TealchartWidgetOptions) {
    this._container = container;
    this._options = options;
    this._datafeed = options.datafeed;
    this._symbol = options.symbol;

    // Track if interval was explicitly provided (for controlled vs uncontrolled behavior)
    this._intervalWasProvided = options.interval !== undefined && options.interval !== '';
    // Default to '1h' if no interval provided
    this._interval = (options.interval || '1h') as ResolutionString;

    // Generate chart key for per-chart state persistence
    // Use provided chartKey, or derive from account/panelId, or generate unique ID
    this._chartKey = options.chartKey || `chart_${options.account || ''}_${Date.now()}`;

    // Initialize Nanostores for this chart
    this._chartStore = getChartStore(this._chartKey);

    // Sync interval to store so ChartTopBar shows correct selection
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

    // Apply initial overrides if provided
    if (options.overrides) {
      this.applyOverrides(options.overrides);
    }

    // Set up chart API callbacks
    this._chartApi.setOnSymbolChange((symbol) => this._handleSymbolChange(symbol));
    this._chartApi.setOnIntervalChange((interval) => this._handleIntervalChange(interval));

    // Subscribe to order/position line changes to trigger re-renders
    this._chartApi.setOnLinesChanged(() => {
      this._scheduleRender();
    });

    // Initialize Tealscript manager if worker factory is provided
    if (options.createTealscriptWorker) {
      this._tealScriptManager = new TealscriptManager({
        createWorker: options.createTealscriptWorker,
        onPlotsUpdated: (plots) => {
          this._plots = plots;
          this._scheduleRender();
        },
        onError: (scriptId, error) => {
          console.error(`[Tealchart] Tealscript error in ${scriptId}:`, error.message);
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
              this._scheduleRender();
            }
          }
        },
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
          console.error(`[Tealchart] Failed to create study ${studyId}:`, error);
          return false;
        }
      });

      // Set up study removal callback
      this._chartApi.setOnStudyRemove((studyId) => {
        if (this._tealScriptManager) {
          this._tealScriptManager.removeScript(studyId);
        }
      });
    }

    // Set up keyboard event listeners
    this._setupKeyboardListeners();

    // Initialize gap detection manager (enabled by default)
    if (options.gapDetection?.enabled !== false) {
      this._gapDetectionManager = new GapDetectionManager(
        (event) => this._handleRecoveryNeeded(event),
        options.gapDetection
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

    // Initialize
    this._initialize();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  private _initialize(): void {
    // Initialize datafeed
    this._datafeed.onReady((config) => {
      // Resolve symbol
      this._datafeed.resolveSymbol(
        this._symbol,
        (symbolInfo) => {
          this._symbolInfo = symbolInfo;
          // Extract price precision from pricescale (e.g., 100 -> 0.01, 100000 -> 0.00001)
          if (symbolInfo.pricescale && symbolInfo.pricescale > 0) {
            this._renderOptions = {
              ...this._renderOptions,
              pricePrecision: 1 / symbolInfo.pricescale,
            };
          }
          this._loadBars();
        },
        (error) => {
          console.error('[Tealchart] Failed to resolve symbol:', error);
          this._setReady();
        }
      );
    });
  }

  // Number of bars to request initially - enough to fill viewport with buffer
  private static readonly INITIAL_BAR_COUNT = 300;

  /**
   * Convert resolution string to milliseconds
   */
  private _getIntervalMs(resolution: ResolutionString): number {
    // Handle day/week resolutions
    if (resolution === '1D' || resolution === 'D') return 24 * 60 * 60 * 1000;
    if (resolution === '1W' || resolution === 'W') return 7 * 24 * 60 * 60 * 1000;

    // Handle minute resolutions (numeric strings like "1", "5", "15", "60", "240")
    const minutes = parseInt(resolution, 10);
    if (!isNaN(minutes)) {
      return minutes * 60 * 1000;
    }

    // Default to 1 hour
    return 60 * 60 * 1000;
  }

  private _loadBars(): void {
    if (!this._symbolInfo) {
      return;
    }

    // Increment request ID to cancel any in-flight requests
    const requestId = ++this._loadBarsRequestId;
    this._isLoadingBars = true;
    this._scheduleRender(); // Re-render to show loading state

    const now = Date.now();
    const intervalMs = this._getIntervalMs(this._interval);
    const countBack = TealchartWidget.INITIAL_BAR_COUNT;

    // Calculate from time: go back countBack bars from now
    const fromTime = now - (countBack * intervalMs);

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
        // Check if this request is still valid (not superseded by a newer request)
        if (requestId !== this._loadBarsRequestId) {
          return; // Ignore stale response
        }

        this._isLoadingBars = false;
        this._bars = bars;

        // Notify Tealscript manager of all bars
        if (this._tealScriptManager) {
          this._tealScriptManager.setBars(bars);
        }

        this._scheduleRender();
        this._subscribeToBars();
        this._setReady();
      },
      (error) => {
        // Check if this request is still valid
        if (requestId !== this._loadBarsRequestId) {
          return; // Ignore stale error
        }

        this._isLoadingBars = false;
        console.error('[Tealchart] Failed to load bars:', error);
        this._scheduleRender(); // Re-render to hide loading state
        this._setReady();
      }
    );
  }

  private _subscribeToBars(): void {
    if (!this._symbolInfo) return;

    // Unsubscribe from previous subscription
    if (this._barSubscriptionGuid) {
      this._datafeed.unsubscribeBars(this._barSubscriptionGuid);
    }

    this._barSubscriptionGuid = `custom_chart_${this._symbol}_${this._interval}_${Date.now()}`;

    // Configure gap detection with the current interval
    const intervalMs = this._getIntervalMs(this._interval);
    if (this._gapDetectionManager) {
      this._gapDetectionManager.setInterval(intervalMs);
      // Record the last bar time if we have bars
      if (this._bars.length > 0) {
        const lastBar = this._bars[this._bars.length - 1];
        this._gapDetectionManager.recordBar(lastBar.time);
      }
      this._gapDetectionManager.start();
    }

    this._datafeed.subscribeBars(
      this._symbolInfo,
      this._interval,
      (bar) => {
        this._handleNewBar(bar);
      },
      this._barSubscriptionGuid,
      () => {
        // Reset cache callback - reload bars
        this._loadBars();
      }
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

    // Update UI directly
    this._ui?.setBars(this._bars);
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

    // Request same number of bars as initial load, going back from earliest bar
    const intervalMs = this._getIntervalMs(this._interval);
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
        this._isLoadingMoreBars = false;

        if (bars.length === 0) {
          this._hasMoreHistoricalData = false;
          return;
        }

        // Prepend new bars to existing bars (avoid duplicates)
        const existingTimes = new Set(this._bars.map(b => b.time));
        const newBars = bars.filter(b => !existingTimes.has(b.time));

        if (newBars.length > 0) {
          this._bars = [...newBars, ...this._bars];

          // Notify Tealscript manager of updated bars
          // Don't render yet - wait for onPlotsUpdated callback to ensure
          // bars and plots are in sync (aligned by index)
          if (this._tealScriptManager) {
            this._tealScriptManager.setBars(this._bars);
          } else {
            // No indicator manager, safe to update UI directly
            this._ui?.setBars(this._bars);
          }
        }
      },
      (error) => {
        this._isLoadingMoreBars = false;
        console.error('[Tealchart] Failed to load more bars:', error);
      }
    );
  }

  /**
   * Handle recovery needed from gap detection
   * Clears bars and refetches the visible region
   */
  private _handleRecoveryNeeded(event: GapDetectionEvent): void {
    console.log(`[Tealchart] Recovery triggered: ${event.reason}`, event.details);

    // Stop gap detection while recovering
    this._gapDetectionManager?.stop();

    // Unsubscribe from real-time updates
    if (this._barSubscriptionGuid) {
      this._datafeed.unsubscribeBars(this._barSubscriptionGuid);
      this._barSubscriptionGuid = null;
    }

    // Clear existing bars
    this._bars = [];
    this._hasMoreHistoricalData = true;
    this._isLoadingMoreBars = false;

    // Notify Tealscript manager of cleared bars
    if (this._tealScriptManager) {
      this._tealScriptManager.setBars([]);
    }

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
        console.error('[Tealchart] Error in onChartReady callback:', e);
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
    if (!this._tealScriptManager || !this._chartStore) return;

    const indicators = this._chartStore.settings.get().indicators;
    if (!indicators || indicators.length === 0) return;

    for (const instance of indicators) {
      // Look up the built-in indicator by ID
      const builtinIndicator = getIndicatorById(instance.builtinId);
      if (!builtinIndicator) {
        console.warn(`[Tealchart] Unknown indicator ID: ${instance.builtinId}, skipping`);
        continue;
      }

      // Create the study with persisted inputs
      this._chartApi.createStudy(
        builtinIndicator.code,
        builtinIndicator.overlay,
        false,
        instance.inputs,
        {},
        { displayName: instance.name },
      ).then((studyApi) => {
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
      }).catch((error) => {
        console.error(`[Tealchart] Failed to restore indicator ${instance.name}:`, error);
      });
    }
  }

  /**
   * Actual render implementation - called by _scheduleRender() via RAF.
   * Passes current state to UI. ChartCore setters skip unchanged data.
   */
  private _doRender(): void {
    const showTopBar = this._options.showTopBar !== false;  // Default to true

    // Initialize UI if needed
    if (!this._ui) {
      this._ui = new TealchartWidgetUI({
        container: this._container,
        chartKey: this._chartKey,
        symbol: this._symbol,
        interval: this._interval,
        showTopBar,
        renderOptions: this._renderOptions,
        onIntervalChange: (interval) => {
          // ChartTopBar already calls chartApi.setResolution() which handles
          // the subscription emission and data reload
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
          this._viewport = viewport;
        },
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
        onTPDragEnd: (positionId, price, partialPercent) => {
          this._chartApi.triggerTPMoveEnd(positionId, price, partialPercent);
        },
        onSLDragEnd: (positionId, price, partialPercent) => {
          this._chartApi.triggerSLMoveEnd(positionId, price, partialPercent);
        },
        onTPClick: (positionId) => {
          this._chartApi.triggerTPClick(positionId);
        },
        onSLClick: (positionId) => {
          this._chartApi.triggerSLClick(positionId);
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
      });
    }

    // Update render options if they've changed
    this._ui.setRenderOptions(this._renderOptions);

    // Update UI state
    this._ui.setBars(this._bars);
    this._ui.setPlots(this._plots);
    this._ui.setLoading(this._isLoadingBars);

    // Update order and position lines
    const orderLines = this._chartApi.getOrderLinesRenderData();
    const positionLines = this._chartApi.getPositionLinesRenderData();
    this._ui.setOrderLines(orderLines);
    this._ui.setPositionLines(positionLines);

    // Update pane layout
    const paneLayout = this._paneManager.getLayout();
    this._ui.setPaneLayout(paneLayout);

    // Update active indicators
    const studyInfos = this._chartApi.getAllStudies();
    const persistedIndicators = this._chartStore
      ? this._chartStore.settings.get().indicators
      : [];

    const activeIndicators = studyInfos.map((study) => {
      const instanceId = this._studyInstanceMap.get(study.id);
      const persisted = instanceId
        ? persistedIndicators.find((ind) => ind.id === instanceId)
        : undefined;
      return {
        ...study,
        styleOverrides: persisted?.styleOverrides,
      };
    });

    // Build indicator pane info
    const indicatorPaneInfo: Record<string, { overlay: boolean; yAxisRange?: { min: number; max: number }; name?: string; inputs?: Record<string, unknown> }> = {};
    for (const [studyId, config] of this._indicatorConfigMap) {
      const study = this._chartApi.getStudyById(studyId);
      const inputs = study?.getInputs() ?? {};
      indicatorPaneInfo[studyId] = {
        overlay: config.overlay,
        yAxisRange: config.yAxisRange,
        name: config.name,
        inputs,
      };
    }

    this._ui.setActiveIndicators(activeIndicators, indicatorPaneInfo);
  }

  /**
   * Handle adding a built-in indicator
   */
  private _handleAddIndicator(indicator: BuiltinIndicator): void {
    if (!this._tealScriptManager) {
      console.warn('[Tealchart] Tealscript not available - cannot add indicator');
      return;
    }

    // Generate a persistent instance ID
    const instanceId = generateIndicatorId(indicator.id);

    // Create a study using the indicator's Tealscript code
    this._chartApi.createStudy(
      indicator.code,
      indicator.overlay,  // forceOverlay
      false,  // lock
      {},  // inputs
      {},  // overrides
      { displayName: indicator.name },  // Use friendly name for display
    ).then((studyApi) => {
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
        this._scheduleRender();
      }
    }).catch((error) => {
      console.error(`[Tealchart] Failed to add indicator ${indicator.name}:`, error);
    });
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
   * Schedule auto-save after the configured delay
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

    // Only auto-save if we have a current layout loaded
    if (!this._chartStore) return;
    const currentLayout = this._chartStore.currentLayout.get();
    if (!currentLayout.layoutId || !currentLayout.layoutName) {
      return;
    }

    // Schedule auto-save
    this._autoSaveTimer = setTimeout(() => {
      this._handleAutoSave();
    }, delay * 1000);
  }

  /**
   * Auto-save the current layout
   */
  private _handleAutoSave(): void {
    this._autoSaveTimer = null;

    if (!this._chartStore) return;
    const currentLayout = this._chartStore.currentLayout.get();

    // Double-check we still have a layout to save to
    if (!currentLayout.layoutId || !currentLayout.layoutName) {
      return;
    }

    // Check if still dirty
    const isDirty = this._chartStore.isDirty.get();
    if (!isDirty) {
      return;
    }

    // Get current settings and save
    const settings = this._getCurrentSettings();

    // Set saving status
    this._chartStore.saveStatus.set('saving');
    this._scheduleRender();

    import('./transformer').then(({ updateTealchartLayout }) => {
      // Use update since we have an existing layout ID
      updateTealchartLayout(
        String(currentLayout.layoutId),
        settings,
        currentLayout.layoutName!,
        this._options.save_load_adapter!
      )
        .then((chartId) => {
          if (!this._chartStore) return;
          // Update layout ID (in case it changed) and clear dirty state
          this._chartStore.currentLayout.set({
            layoutId: chartId,
            layoutName: currentLayout.layoutName,
          });
          this._chartStore.isDirty.set(false);
          this._chartStore.saveStatus.set('success');
          this._scheduleRender();

          // Start fade after showing success briefly
          setTimeout(() => {
            if (!this._chartStore) return;
            this._chartStore.saveStatus.set('success-fading');
            this._scheduleRender();

            // Clear after fade animation (500ms)
            setTimeout(() => {
              if (!this._chartStore) return;
              this._chartStore.saveStatus.set('idle');
              this._scheduleRender();
            }, 500);
          }, 500);
        })
        .catch((error) => {
          console.error('[Tealchart] Auto-save failed:', error);
          if (!this._chartStore) return;
          this._chartStore.saveStatus.set('error');
          this._scheduleRender();
        });
    });
  }

  /**
   * Persist a new indicator to settings
   */
  private _persistAddIndicator(instanceId: string, indicator: BuiltinIndicator): void {
    if (!this._chartStore) return;

    const currentIndicators = this._chartStore.settings.get().indicators;
    const newInstance: IndicatorInstance = {
      id: instanceId,
      name: indicator.name,
      builtinId: indicator.id,
      inputs: {},
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
    // Toggle visibility on both the API (for UI state) and TealscriptManager (for plot rendering)
    this._chartApi.toggleStudyVisibility(indicatorId);
    this._tealScriptManager?.toggleScriptVisibility(indicatorId);

    // Persist visibility change
    this._persistToggleIndicatorVisibility(indicatorId);

    // Re-render to update the legend
    this._scheduleRender();
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
      ind.id === instanceId ? { ...ind, isVisible: !ind.isVisible } : ind
    );

    this._chartStore.settings.setKey('indicators', updatedIndicators);
    this._markDirty();
  }

  /**
   * Handle removing an indicator
   */
  private _handleRemoveIndicator(indicatorId: string): void {
    // Persist removal
    this._persistRemoveIndicator(indicatorId);

    // Clean up tracking maps
    const instanceId = this._studyInstanceMap.get(indicatorId);
    if (instanceId) {
      this._indicatorStudyMap.delete(instanceId);
    }
    this._studyInstanceMap.delete(indicatorId);
    this._indicatorConfigMap.delete(indicatorId);

    // Remove from pane manager
    this._paneManager.removeIndicator(indicatorId);

    // Remove the study via the API
    this._chartApi.removeStudy(indicatorId);
    // Re-render to update the legend
    this._scheduleRender();
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
   * Get input definitions for a study
   */
  getStudyInputDefinitions(studyId: string): import('@tealstreet/tealscript').InputDefinition[] {
    return this._tealScriptManager?.getInputDefinitions(studyId) ?? [];
  }

  /**
   * Set input values for a study
   */
  setStudyInputs(studyId: string, inputs: Record<string, unknown>): void {
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
      this._scheduleRender();
    }
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
      ind.id === instanceId ? { ...ind, inputs: { ...ind.inputs, ...inputs } } : ind
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
    this._scheduleRender();
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
      ind.id === instanceId ? { ...ind, styleOverrides } : ind
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

  private _handleSymbolChange(symbol: string): void {
    if (this._symbol === symbol) return;

    // Stop gap detection while changing symbol
    this._gapDetectionManager?.stop();

    // Unsubscribe from old symbol
    if (this._barSubscriptionGuid) {
      this._datafeed.unsubscribeBars(this._barSubscriptionGuid);
      this._barSubscriptionGuid = null;
    }

    this._symbol = symbol;
    this._bars = [];
    this._hasMoreHistoricalData = true; // Reset for new symbol
    this._isLoadingMoreBars = false;

    // Resolve new symbol and load bars
    this._datafeed.resolveSymbol(
      symbol,
      (symbolInfo) => {
        this._symbolInfo = symbolInfo;
        // Update price precision from new symbol's pricescale
        if (symbolInfo.pricescale && symbolInfo.pricescale > 0) {
          this._renderOptions = {
            ...this._renderOptions,
            pricePrecision: 1 / symbolInfo.pricescale,
          };
        }
        this._loadBars();
      },
      (error) => {
        console.error('[Tealchart] Failed to resolve symbol:', error);
      }
    );
  }

  private _handleIntervalChange(interval: ResolutionString): void {
    if (this._interval === interval) {
      return;
    }

    // Stop gap detection while changing interval
    this._gapDetectionManager?.stop();

    // Set loading state FIRST before any other changes
    // This ensures we don't render stale data during transition
    this._isLoadingBars = true;

    // Unsubscribe from old interval
    if (this._barSubscriptionGuid) {
      this._datafeed.unsubscribeBars(this._barSubscriptionGuid);
      this._barSubscriptionGuid = null;
    }

    this._interval = interval;
    this._bars = [];
    this._hasMoreHistoricalData = true; // Reset for new interval
    this._isLoadingMoreBars = false;

    // Render immediately to show loading state (hides chart)
    this._scheduleRender();

    // Reload bars with new interval
    this._loadBars();
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
        console.error('[Tealchart] Error in onChartReady callback:', e);
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
   * Remove the widget and clean up
   */
  remove(): void {
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

    // Cancel pending render RAF
    if (this._renderRafId !== null) {
      cancelAnimationFrame(this._renderRafId);
      this._renderRafId = null;
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

    // Clean up chart API
    this._chartApi.dispose();

    // Clean up event emitter
    this._eventEmitter.removeAllListeners();

    // Dispose vanilla UI
    if (this._ui) {
      this._ui.dispose();
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
  chart(index?: number): TealchartApi {
    // Only support single chart for now
    return this._chartApi;
  }

  /**
   * Get active chart API
   */
  activeChart(): TealchartApi {
    return this._chartApi;
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
      this._scheduleRender();
    }
  }

  /**
   * Apply study overrides
   * @stub Not yet implemented
   */
  applyStudiesOverrides(overrides: Record<string, unknown>): void {
    console.warn('[Tealchart] Method not implemented: applyStudiesOverrides');
    // TODO: Implement when study support is added
  }

  /**
   * Set CSS custom property
   * @stub Not yet implemented
   */
  setCSSCustomProperty(key: string, value: string): void {
    console.warn('[Tealchart] Method not implemented: setCSSCustomProperty');
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
    // Re-render to enable the context menu UI
    if (this._ui) {
      this._scheduleRender();
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
    console.warn('[Tealchart] Method not implemented: save');
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
  load(state: object): Promise<void> {
    console.warn('[Tealchart] Method not implemented: load');
    // TODO: Implement state restoration
    return Promise.resolve();
  }

  /**
   * Save chart to server
   * @stub Not yet implemented
   */
  saveChartToServer(
    onComplete?: () => void,
    onFail?: () => void,
    options?: { chartName?: string }
  ): void {
    console.warn('[Tealchart] Method not implemented: saveChartToServer');
    onFail?.();
  }

  // ============================================================================
  // Layout Selector Handlers
  // ============================================================================

  /**
   * Handle loading a layout from the LayoutSelector
   */
  private _handleLoadLayout(settings: ChartSettings, warnings: string[], layoutId: string | number, layoutName: string): void {
    if (warnings.length > 0) {
      console.warn('[Tealchart] Layout load warnings:', warnings);
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
        if (builtinIndicator) {
          // Create study with saved inputs
          this._chartApi.createStudy(
            builtinIndicator.code,
            builtinIndicator.overlay,
            false,
            indicator.inputs,
            {},
            { displayName: indicator.name },
          ).then((studyApi) => {
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
              this._scheduleRender();
            }
          });
        } else {
          console.warn('[Tealchart] Unknown indicator:', indicator.builtinId);
        }
      }
    }

    // Re-render to reflect the loaded layout
    this._scheduleRender();
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
      this._scheduleRender();

      // Determine if we should update existing or create new
      // Update if: same name as current layout AND we have a layout ID
      const shouldUpdate = currentLayout.layoutId && layoutName === currentLayout.layoutName;

      if (shouldUpdate) {
        // Update existing layout
        import('./transformer').then(({ updateTealchartLayout }) => {
          updateTealchartLayout(
            String(currentLayout.layoutId),
            settings,
            layoutName,
            this._options.save_load_adapter!
          )
            .then((chartId) => {
              if (!this._chartStore) return;
              this._chartStore.currentLayout.set({
                layoutId: chartId,
                layoutName,
              });
              this._chartStore.isDirty.set(false);
              this._chartStore.saveStatus.set('success');
              this._scheduleRender();

              setTimeout(() => {
                if (!this._chartStore) return;
                this._chartStore.saveStatus.set('success-fading');
                this._scheduleRender();
                setTimeout(() => {
                  if (!this._chartStore) return;
                  this._chartStore.saveStatus.set('idle');
                  this._scheduleRender();
                }, 500);
              }, 500);
            })
            .catch((error) => {
              console.error('[Tealchart] Failed to update layout:', error);
              if (!this._chartStore) return;
              this._chartStore.saveStatus.set('error');
              this._scheduleRender();
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
              this._scheduleRender();

              setTimeout(() => {
                if (!this._chartStore) return;
                this._chartStore.saveStatus.set('success-fading');
                this._scheduleRender();
                setTimeout(() => {
                  if (!this._chartStore) return;
                  this._chartStore.saveStatus.set('idle');
                  this._scheduleRender();
                }, 500);
              }, 500);
            })
            .catch((error) => {
              console.error('[Tealchart] Failed to save layout:', error);
              if (!this._chartStore) return;
              this._chartStore.saveStatus.set('error');
              this._scheduleRender();
            });
        });
      }
    }
  }

  /**
   * Get current chart settings for saving
   */
  private _getCurrentSettings(): ChartSettings {
    // Gather indicator instances from persisted state
    const indicators = this._chartStore
      ? this._chartStore.settings.get().indicators
      : [];

    return {
      symbol: this._symbol,
      interval: this._interval,
      showVolume: this._renderOptions.showVolume ?? true,
      volumeHeight: this._renderOptions.volumeHeight ?? 0.2,
      chartType: 'candle',
      autoScale: true,
      indicators,
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
  changeTheme(theme: 'Light' | 'Dark'): void {
    // Apply theme-specific overrides
    if (theme === 'Dark') {
      this.applyOverrides({
        'paneProperties.background': '#1e222d',
        'scalesProperties.textColor': '#787b86',
        'paneProperties.vertGridProperties.color': '#363a45',
        'paneProperties.horzGridProperties.color': '#363a45',
      });
    } else {
      this.applyOverrides({
        'paneProperties.background': '#ffffff',
        'scalesProperties.textColor': '#131722',
        'paneProperties.vertGridProperties.color': '#e0e3eb',
        'paneProperties.horzGridProperties.color': '#e0e3eb',
      });
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
