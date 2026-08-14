/**
 * ChartWidgetCore - Platform-agnostic core widget logic
 *
 * Contains shared logic for bar fetching, indicator management, pane management.
 * NO DOM dependencies - can be used on web or mobile.
 *
 * Usage:
 * - Web: TealchartWidget creates ChartWidgetCore internally
 * - Mobile: useTealchartCore() hook wraps ChartWidgetCore for React
 */

import type { BuiltinIndicator } from '../indicators/builtinIndicators';
import type {
  Bar,
  DatafeedBar,
  IBasicDataFeed,
  LibrarySymbolInfo,
  ResolutionString,
  UnifiedPaneLayout,
  Viewport,
} from '../types';
import type { ResolutionInput } from '../utils/normalizeResolution';
import type { HistoryBackfillDirection, HistoryBackfillRequestHint } from './historyBackfill';

import { EventEmitter } from '../events/EventEmitter';
import { PaneManager } from '../rendering/PaneManager';
import { barValuesEqual, dedupeBarsByTime } from '../utils/dedupeBars';
import { normalizeResolution } from '../utils/normalizeResolution';
import {
  DEFAULT_HISTORY_BACKFILL_BAR_COUNT,
  mergeLeftHistoryBackfillRequestHints,
  resolveHistoryBackfillRequiredStartTime,
  resolveLeftHistoryBackfillContinuationHint,
  resolveLeftHistoryBackfillRequest,
} from './historyBackfill';

// Use generic PlotOutput type to avoid import issues across platforms
type PlotOutput = {
  plotId: string;
  scriptId?: string;
  type: string;
  values: (number | null)[];
  color?: string;
  lineWidth?: number;
  transparency?: number;
};

// Constants
export const INITIAL_BAR_COUNT = DEFAULT_HISTORY_BACKFILL_BAR_COUNT;

const normalizeDatafeedBar = (bar: DatafeedBar): Bar => ({
  ...bar,
  volume: bar.volume ?? 0,
});

const normalizeDatafeedBars = (bars: DatafeedBar[]): Bar[] => bars.map(normalizeDatafeedBar);

/**
 * Convert resolution string to milliseconds
 */
export function getIntervalMs(resolution: ResolutionString | string): number {
  const upper = resolution.toUpperCase();

  // Handle day/week resolutions
  if (upper === '1D' || upper === 'D') return 24 * 60 * 60 * 1000;
  if (upper === '1W' || upper === 'W') return 7 * 24 * 60 * 60 * 1000;

  // Parse numeric value and optional suffix (e.g., "1h", "4H", "1D", "15", "60")
  const match = resolution.match(/^(\d+)([hHdDwW]?)$/);
  if (match) {
    const value = parseInt(match[1], 10);
    const suffix = match[2].toUpperCase();

    if (suffix === 'H') return value * 60 * 60 * 1000;
    if (suffix === 'D') return value * 24 * 60 * 60 * 1000;
    if (suffix === 'W') return value * 7 * 24 * 60 * 60 * 1000;

    // No suffix means minutes
    return value * 60 * 1000;
  }

  // Default to 1 hour
  return 60 * 60 * 1000;
}

/**
 * Interface for indicator managers (web uses TealscriptManager, mobile uses MobileIndicatorManager)
 */
export interface IIndicatorManager {
  setBars(bars: Bar[]): void;
  updateBar?(bar: Bar): void;
  addScript?(scriptId: string, code: string, inputs?: Record<string, unknown>): Promise<void>;
  removeScript?(scriptId: string): void;
  getPlots(): PlotOutput[];
  dispose?(): void;
}

/**
 * Core widget options (platform-agnostic)
 */
export interface ChartWidgetCoreOptions {
  // Required
  datafeed: IBasicDataFeed;
  symbol: string;

  // Optional
  interval?: ResolutionInput;

  // Platform-specific injections
  indicatorManager?: IIndicatorManager;
  scheduleRender?: () => void;

  // Callbacks
  onBarsChanged?: (bars: Bar[], context: ChartWidgetBarsChangedContext) => void;
  onPlotsChanged?: (plots: PlotOutput[]) => void;
  onViewportChanged?: (viewport: Viewport) => void;
  onLoadingChanged?: (loading: boolean, context: ChartWidgetDataContext) => void;
  onLoadingMoreBarsChanged?: (loading: boolean, context: ChartWidgetDataContext) => void;
  onSymbolChange?: (symbol: string) => void;
  onIntervalChange?: (interval: string) => void;
}

export interface ChartWidgetDataContext {
  symbol: string;
  interval: ResolutionString;
  requestId: number;
}

export interface ChartWidgetBarsChangedContext extends ChartWidgetDataContext {
  source: 'history' | 'realtime';
}

/**
 * ChartWidgetCore - Concrete class for chart widget logic
 *
 * Platform-agnostic: works on both web and mobile.
 * Accepts injected indicator manager and render callback.
 */
export class ChartWidgetCore {
  protected _datafeed: IBasicDataFeed;
  protected _symbol: string;
  protected _interval: ResolutionString;
  protected _symbolInfo: LibrarySymbolInfo | null = null;
  // The symbol `_symbolInfo` was resolved for. `symbolInfo.name` cannot answer
  // this: an exchange-prefixed request resolves to a clean-symbol name.
  protected _symbolInfoSymbol: string | null = null;
  protected _bars: Bar[] = [];
  protected _viewport: Viewport | null = null;
  protected _plots: PlotOutput[] = [];

  // Supported resolutions from datafeed config (for filtering timeframe selector)
  protected _supportedResolutions: string[] | null = null;

  // State flags
  protected _isLoading = false;
  protected _isLoadingMoreBars = false;
  protected _lastEmittedLoading: { loading: boolean; symbol: string; interval: string } | null = null;
  protected _lastEmittedLoadingMoreBars: { loading: boolean; symbol: string; interval: string } | null = null;
  protected _hasQueuedLeftHistoryBackfill = false;
  protected _queuedLeftHistoryBackfillHint: HistoryBackfillRequestHint | undefined;
  protected _hasMoreHistoricalData = true;
  protected _loadBarsRequestId = 0;
  protected _resolveSymbolRequestId = 0;
  protected _disposed = false;

  // Subscription tracking
  protected _barSubscriptionGuid: string | null = null;

  // Managers
  protected _paneManager: PaneManager;
  protected _indicatorManager: IIndicatorManager | null = null;
  protected _eventEmitter: EventEmitter;

  // Callbacks
  protected _onBarsChanged?: (bars: Bar[], context: ChartWidgetBarsChangedContext) => void;
  protected _onPlotsChanged?: (plots: PlotOutput[]) => void;
  protected _onViewportChanged?: (viewport: Viewport) => void;
  protected _onLoadingChanged?: (loading: boolean, context: ChartWidgetDataContext) => void;
  protected _onLoadingMoreBarsChanged?: (loading: boolean, context: ChartWidgetDataContext) => void;
  protected _onSymbolChange?: (symbol: string) => void;
  protected _onIntervalChange?: (interval: string) => void;
  protected _scheduleRender: () => void;

  constructor(options: ChartWidgetCoreOptions) {
    this._datafeed = options.datafeed;
    this._symbol = options.symbol;
    this._interval = normalizeResolution(options.interval, '1h');

    this._onBarsChanged = options.onBarsChanged;
    this._onPlotsChanged = options.onPlotsChanged;
    this._onViewportChanged = options.onViewportChanged;
    this._onLoadingChanged = options.onLoadingChanged;
    this._onLoadingMoreBarsChanged = options.onLoadingMoreBarsChanged;
    this._onSymbolChange = options.onSymbolChange;
    this._onIntervalChange = options.onIntervalChange;
    this._scheduleRender = options.scheduleRender || (() => {});
    this._indicatorManager = options.indicatorManager || null;

    this._paneManager = new PaneManager();
    this._eventEmitter = new EventEmitter();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the widget - resolve symbol and load bars
   */
  initialize(): void {
    if (this._disposed) return;
    console.log('[chartboot]', Date.now(), 'core-initialize', this._symbol, this._interval);

    // The config only feeds the timeframe selector, and nothing in the resolve
    // or load path reads it — so the first bar load must not queue behind it.
    // A datafeed's onReady is typically a setTimeout(0) returning a literal,
    // and that hop cost 0.7-1.1s on a mobile warm start, where the main thread
    // is saturated by account restore at exactly the moment the chart mounts.
    this._datafeed.onReady((config) => {
      if (this._disposed) return;
      console.log('[chartboot]', Date.now(), 'datafeed-ready');
      this._supportedResolutions = config.supported_resolutions ?? null;
    });

    this._resolveSymbolAndLoad(this._symbol);
  }

  /**
   * Resolves a symbol and loads its bars, discarding a resolve that a newer one
   * has superseded.
   *
   * The guard matters now that init resolves immediately: a host can call
   * setSymbol in the same tick as initialize(), and without it the init
   * callback can land last and load bars for the symbol the chart just left.
   */
  protected _resolveSymbolAndLoad(symbol: string): void {
    const resolveRequestId = ++this._resolveSymbolRequestId;

    this._datafeed.resolveSymbol(
      symbol,
      (symbolInfo) => {
        if (this._disposed || resolveRequestId !== this._resolveSymbolRequestId) return;
        console.log('[chartboot]', Date.now(), 'symbol-resolved', symbol);
        this._symbolInfo = symbolInfo;
        this._symbolInfoSymbol = symbol;
        this._loadBars();
      },
      (error) => {
        if (this._disposed || resolveRequestId !== this._resolveSymbolRequestId) return;
        console.error('[ChartWidgetCore] Failed to resolve symbol:', error);
        this._setLoading(false);
      },
    );
  }

  /**
   * Get supported resolutions from datafeed config (for filtering timeframe selector)
   */
  getSupportedResolutions(): string[] | null {
    return this._supportedResolutions;
  }

  /**
   * Set the indicator manager (allows late injection for React hooks)
   */
  setIndicatorManager(manager: IIndicatorManager): void {
    this._indicatorManager = manager;
    // If we already have bars, update the indicator manager
    if (this._bars.length > 0) {
      manager.setBars(this._bars);
    }
  }

  // ============================================================================
  // Bar Management
  // ============================================================================

  /**
   * True when this flag was already emitted for exactly this data context.
   *
   * Deduping on the boolean alone is not enough. Consumers reject updates whose
   * context does not match their own (see dataContextMatches in
   * useTealchartCore), and a symbol/interval change can start a new load while
   * the flag is already true — so `true` is swallowed as a no-op and only the
   * closing `false` is ever sent for that context. If the consumer's own
   * context has not caught up at that instant it drops that single edge, and
   * nothing re-sends it: the consumer stays stuck loading forever, which held
   * the native chart's render snapshot and froze it for ~20-35s per switch.
   * Keying on the context guarantees each context gets its own transitions.
   */
  protected _loadingFlagEmittedFor(
    last: { loading: boolean; symbol: string; interval: string } | null,
    loading: boolean,
    context: ChartWidgetDataContext,
  ): boolean {
    return (
      last !== null && last.loading === loading && last.symbol === context.symbol && last.interval === context.interval
    );
  }

  protected _setLoading(loading: boolean): void {
    if (this._disposed) return;
    this._isLoading = loading;
    const context = this._getDataContext();
    if (this._loadingFlagEmittedFor(this._lastEmittedLoading, loading, context)) return;
    this._lastEmittedLoading = { loading, symbol: context.symbol, interval: context.interval };
    this._onLoadingChanged?.(loading, context);
  }

  protected _setLoadingMoreBars(loading: boolean): void {
    if (this._disposed) return;
    this._isLoadingMoreBars = loading;
    const context = this._getDataContext();
    if (this._loadingFlagEmittedFor(this._lastEmittedLoadingMoreBars, loading, context)) return;
    this._lastEmittedLoadingMoreBars = { loading, symbol: context.symbol, interval: context.interval };
    this._onLoadingMoreBarsChanged?.(loading, context);
  }

  protected _getDataContext(): ChartWidgetDataContext {
    return {
      symbol: this._symbol,
      interval: this._interval,
      requestId: this._loadBarsRequestId,
    };
  }

  protected _emitBarsChanged(source: ChartWidgetBarsChangedContext['source']): void {
    if (this._disposed) return;
    const context = {
      ...this._getDataContext(),
      source,
    };
    this._onBarsChanged?.(this._bars, context);
  }

  protected _loadBars(): void {
    if (this._disposed) return;
    if (!this._symbolInfo) return;
    // An interval change loads directly, without resolving. If a symbol change
    // is still resolving at that moment — a multi-second window on a cold
    // exchange, where resolveSymbol polls for markets — the info in hand is the
    // market we just left, and its bars would render under the new symbol. Its
    // own resolve calls back here.
    if (this._symbolInfoSymbol !== this._symbol) return;

    const requestId = ++this._loadBarsRequestId;
    this._setLoadingMoreBars(false);
    this._clearQueuedLeftHistoryBackfill();
    const requestSymbol = this._symbol;
    const requestInterval = this._interval;
    const requestSymbolInfo = this._symbolInfo;
    this._setLoading(true);

    const now = Date.now();
    const intervalMs = getIntervalMs(requestInterval);
    const countBack = INITIAL_BAR_COUNT;
    const fromTime = now - countBack * intervalMs;

    const periodParams = {
      countBack,
      from: Math.floor(fromTime / 1000),
      to: Math.floor(now / 1000),
      firstDataRequest: true,
    };

    console.log('[chartboot]', Date.now(), 'getbars-request', requestSymbol, requestInterval, countBack);
    this._datafeed.getBars(
      requestSymbolInfo,
      requestInterval,
      periodParams,
      (bars) => {
        console.log('[chartboot]', Date.now(), 'getbars-response', requestSymbol, bars.length);
        if (this._disposed) return;
        if (requestId !== this._loadBarsRequestId) return;
        if (requestSymbol !== this._symbol || requestInterval !== this._interval) return;

        // Normalize on ingest — drop duplicate/out-of-order timestamps so candles
        // don't render as overlapping bodies (feeds occasionally emit dupes).
        const normalizedBars = dedupeBarsByTime(normalizeDatafeedBars(bars), 'history load');
        this._bars = normalizedBars;
        // Clear old plots — they belong to the old symbol/interval
        this._plots = [];

        // Notify data before clearing loading so consumers never render a
        // completed load state against bars from the previous symbol/interval.
        this._emitBarsChanged('history');
        this._setLoading(false);
        this._onPlotsChanged?.(this._plots);
        this._scheduleRender();
        this._subscribeToBars();

        // Notify indicator manager AFTER — worker callback fires later with new data
        this._indicatorManager?.setBars(normalizedBars);
      },
      (error) => {
        if (this._disposed) return;
        if (requestId !== this._loadBarsRequestId) return;

        this._setLoading(false);
        console.error('[ChartWidgetCore] Failed to load bars:', error);
      },
    );
  }

  requestMoreBars(direction: HistoryBackfillDirection, hint?: HistoryBackfillRequestHint): void {
    this._loadMoreBars(direction, hint);
  }

  private _queueLeftHistoryBackfill(hint?: HistoryBackfillRequestHint): void {
    this._hasQueuedLeftHistoryBackfill = true;
    this._queuedLeftHistoryBackfillHint = mergeLeftHistoryBackfillRequestHints(
      this._queuedLeftHistoryBackfillHint,
      hint,
    );
  }

  private _clearQueuedLeftHistoryBackfill(): void {
    this._hasQueuedLeftHistoryBackfill = false;
    this._queuedLeftHistoryBackfillHint = undefined;
  }

  private _consumeQueuedLeftHistoryBackfill(): HistoryBackfillRequestHint | undefined | null {
    if (!this._hasQueuedLeftHistoryBackfill) return null;
    const hint = this._queuedLeftHistoryBackfillHint;
    this._clearQueuedLeftHistoryBackfill();
    return hint;
  }

  private _loadNextLeftHistoryBackfill(
    activeHint: HistoryBackfillRequestHint | undefined,
    previousEarliestBarTime: number,
  ): void {
    const queuedHint = this._consumeQueuedLeftHistoryBackfill();
    const hint = resolveLeftHistoryBackfillContinuationHint({
      activeHint,
      currentEarliestBarTime: this._bars[0]?.time,
      previousEarliestBarTime,
      queuedHint,
    });
    if (hint !== null) {
      this._loadMoreBars('left', hint);
    }
  }

  protected _loadMoreBars(direction: HistoryBackfillDirection, hint?: HistoryBackfillRequestHint): void {
    if (this._disposed) return;
    if (direction !== 'left') return;
    if (!this._symbolInfo) return;
    if (this._isLoadingMoreBars) {
      this._queueLeftHistoryBackfill(hint);
      return;
    }
    if (!this._hasMoreHistoricalData) {
      return;
    }

    const earliestBar = this._bars[0];
    if (!earliestBar) return;
    const previousEarliestBarTime = earliestBar.time;

    const intervalMs = getIntervalMs(this._interval);
    const request = resolveLeftHistoryBackfillRequest({
      earliestBarTime: earliestBar.time,
      hint,
      intervalMs,
    });
    if (!request) {
      return;
    }

    this._setLoadingMoreBars(true);
    const requestId = this._loadBarsRequestId;
    const requestSymbol = this._symbol;
    const requestInterval = this._interval;
    const requestSymbolInfo = this._symbolInfo;

    this._datafeed.getBars(
      requestSymbolInfo,
      requestInterval,
      {
        countBack: request.countBack,
        from: request.from,
        to: request.to,
        firstDataRequest: false,
      },
      (bars) => {
        if (this._disposed) return;
        if (requestId !== this._loadBarsRequestId) return;
        if (requestSymbol !== this._symbol || requestInterval !== this._interval) return;

        this._setLoadingMoreBars(false);
        if (bars.length === 0) {
          this._hasMoreHistoricalData = false;
          this._clearQueuedLeftHistoryBackfill();
          return;
        }

        const existingTimes = new Set(this._bars.map((bar) => bar.time));
        const newBars = normalizeDatafeedBars(bars).filter((bar) => !existingTimes.has(bar.time));
        if (newBars.length === 0) {
          this._loadNextLeftHistoryBackfill(hint, previousEarliestBarTime);
          return;
        }

        this._bars = dedupeBarsByTime([...newBars, ...this._bars], 'history prepend');
        this._emitBarsChanged('history');
        this._scheduleRender();
        this._indicatorManager?.setBars(this._bars);
        this._loadNextLeftHistoryBackfill(hint, previousEarliestBarTime);
      },
      (error) => {
        if (this._disposed) return;
        if (requestId !== this._loadBarsRequestId) return;

        this._setLoadingMoreBars(false);
        this._clearQueuedLeftHistoryBackfill();
        console.error('[ChartWidgetCore] Failed to load more bars:', error);
      },
    );
  }

  protected _subscribeToBars(): void {
    if (this._disposed) return;
    if (!this._symbolInfo) return;

    // Unsubscribe from previous
    if (this._barSubscriptionGuid) {
      this._datafeed.unsubscribeBars(this._barSubscriptionGuid);
    }

    this._barSubscriptionGuid = `chart_${this._symbol}_${this._interval}_${Date.now()}`;
    const subscriptionGuid = this._barSubscriptionGuid;
    const subscriptionSymbol = this._symbol;
    const subscriptionInterval = this._interval;

    this._datafeed.subscribeBars(
      this._symbolInfo,
      subscriptionInterval,
      (bar) => {
        if (this._disposed) return;
        if (
          this._barSubscriptionGuid !== subscriptionGuid ||
          this._symbol !== subscriptionSymbol ||
          this._interval !== subscriptionInterval
        ) {
          return;
        }
        this._handleNewBar(normalizeDatafeedBar(bar));
      },
      subscriptionGuid,
      () => {
        if (this._disposed) return;
        if (
          this._barSubscriptionGuid !== subscriptionGuid ||
          this._symbol !== subscriptionSymbol ||
          this._interval !== subscriptionInterval
        ) {
          return;
        }
        this._loadBars();
      },
    );
  }

  protected _handleNewBar(bar: Bar): void {
    if (this._disposed) return;
    if (this._bars.length === 0) {
      this._bars.push(bar);
    } else {
      const lastBar = this._bars[this._bars.length - 1];
      if (bar.time === lastBar.time) {
        // Skip no-op ticks — an identical bar recomputes indicators and repaints
        // for zero visible change (feeds re-send unchanged bars as heartbeats).
        if (barValuesEqual(bar, lastBar)) {
          return;
        }
        this._bars[this._bars.length - 1] = bar;
      } else if (bar.time > lastBar.time) {
        this._bars.push(bar);
      }
    }

    // Notify indicator manager
    if (this._indicatorManager?.updateBar) {
      this._indicatorManager.updateBar(bar);
    } else {
      this._indicatorManager?.setBars(this._bars);
    }

    this._emitBarsChanged('realtime');
    this._scheduleRender();
  }

  // ============================================================================
  // Symbol/Interval Changes
  // ============================================================================

  setSymbol(symbol: string): void {
    if (this._disposed) return;
    if (this._symbol === symbol) return;

    // Unsubscribe from old
    if (this._barSubscriptionGuid) {
      this._datafeed.unsubscribeBars(this._barSubscriptionGuid);
      this._barSubscriptionGuid = null;
    }

    this._symbol = symbol;
    this._onSymbolChange?.(symbol);
    // Don't clear bars — keep old candles visible (faded) until new data arrives
    this._hasMoreHistoricalData = true;
    this._setLoadingMoreBars(false);
    this._clearQueuedLeftHistoryBackfill();
    this._setLoading(true);

    this._resolveSymbolAndLoad(symbol);
  }

  setInterval(interval: ResolutionInput): void {
    if (this._disposed) return;
    const normalizedInterval = normalizeResolution(interval, this._interval);
    if (this._interval === normalizedInterval) return;

    // Unsubscribe from old
    if (this._barSubscriptionGuid) {
      this._datafeed.unsubscribeBars(this._barSubscriptionGuid);
      this._barSubscriptionGuid = null;
    }

    this._interval = normalizedInterval;
    this._onIntervalChange?.(normalizedInterval);
    // Don't clear bars — keep old candles visible (faded) until new data arrives
    this._hasMoreHistoricalData = true;
    this._setLoadingMoreBars(false);
    this._clearQueuedLeftHistoryBackfill();
    this._setLoading(true);
    this._scheduleRender();
    this._loadBars();
  }

  // ============================================================================
  // Getters
  // ============================================================================

  getBars(): Bar[] {
    return this._bars;
  }

  getSymbol(): string {
    return this._symbol;
  }

  getInterval(): string {
    return this._interval;
  }

  isLoading(): boolean {
    return this._isLoading;
  }

  isLoadingMoreBars(): boolean {
    return this._isLoadingMoreBars;
  }

  getPlots(): PlotOutput[] {
    return this._indicatorManager?.getPlots() ?? [];
  }

  getUnifiedLayout(): UnifiedPaneLayout {
    return this._paneManager.getUnifiedLayout();
  }

  getPaneManager(): PaneManager {
    return this._paneManager;
  }

  /**
   * Toggle maximize/restore for a pane (delegates to PaneManager)
   */
  toggleMaximizePane(paneId: string): void {
    this._paneManager.toggleMaximizePane(paneId);
    this._scheduleRender();
  }

  // ============================================================================
  // Indicator Management
  // ============================================================================

  addIndicator(_indicator: BuiltinIndicator, _inputs?: Record<string, unknown>): string | null {
    // To be implemented by subclasses that support indicators
    return null;
  }

  removeIndicator(indicatorId: string): void {
    this._paneManager.removeIndicator(indicatorId);
    this._indicatorManager?.removeScript?.(indicatorId);
    this._scheduleRender();
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this._loadBarsRequestId += 1;
    this._clearQueuedLeftHistoryBackfill();
    const subscriptionGuid = this._barSubscriptionGuid;
    this._barSubscriptionGuid = null;
    if (subscriptionGuid) {
      this._datafeed.unsubscribeBars(subscriptionGuid);
    }
    this._indicatorManager?.dispose?.();
    this._indicatorManager = null;
    this._onBarsChanged = undefined;
    this._onPlotsChanged = undefined;
    this._onViewportChanged = undefined;
    this._onLoadingChanged = undefined;
    this._onSymbolChange = undefined;
    this._onIntervalChange = undefined;
    this._scheduleRender = () => {};
    this._eventEmitter.removeAllListeners();
  }
}
