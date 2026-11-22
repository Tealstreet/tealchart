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

import type { AnalysisContextReadResult, AnalysisTimeRange } from '../analysis/types';
import type { BuiltinIndicator } from '../indicators/builtinIndicators';
import type {
  Bar,
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
import { barCloseTimeMs, intervalToMs } from '../utils/intervalMs';
import { normalizeDatafeedBar, normalizeDatafeedBars } from '../utils/normalizeDatafeedBars';
import { normalizeResolution } from '../utils/normalizeResolution';
import {
  DEFAULT_HISTORY_BACKFILL_BAR_COUNT,
  mergeLeftHistoryBackfillRequestHints,
  resolveLeftHistoryBackfillContinuationHint,
  resolveLeftHistoryBackfillRequest,
} from './historyBackfill';
import {
  resolveInitialHistoryBarCount,
  resolveWarmupHistoryStartTime,
  trimBarsToHistoryAnchor,
} from './historyWarmup';

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
/**
 * A rollover after this much stream silence refetches the bar it closed: the
 * runtime was suspended (iOS backgrounding) or the socket was down, so the
 * closed bar never received its final ticks.
 */
export const LIVE_SILENCE_BACKFILL_MS = 30_000;
const LIVE_GAP_BACKFILL_MAX_ATTEMPTS = 6;
const LIVE_GAP_BACKFILL_RETRY_BASE_MS = 5_000;
const LIVE_GAP_BACKFILL_RETRY_MAX_MS = 60_000;

/**
 * Convert resolution string to milliseconds
 */
export function getIntervalMs(resolution: ResolutionString | string): number {
  return intervalToMs(resolution);
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
  /** Largest TealScript `historyRequirement.bars` across active studies. */
  getHistoryRequirementBars?(): number;
  /** Called when a study's declaration changes that requirement. */
  setOnHistoryRequirementChanged?(callback: (() => void) | null): void;
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
  realtimeUpdateThrottleMs?: number;
  scheduleRender?: () => void;

  // Callbacks
  onBarsChanged?: (bars: Bar[], context: ChartWidgetBarsChangedContext) => void;
  onPlotsChanged?: (plots: PlotOutput[]) => void;
  onViewportChanged?: (viewport: Viewport) => void;
  onLoadingChanged?: (loading: boolean, context: ChartWidgetDataContext) => void;
  /**
   * A history load or symbol resolve for this context failed. `loading: false`
   * alone cannot say so, and hosts drew the previous market's bars as if the
   * load had finished (AGT-127).
   */
  onLoadFailed?: (context: ChartWidgetDataContext) => void;
  onLoadingMoreBarsChanged?: (loading: boolean, context: ChartWidgetDataContext) => void;
  /** The datafeed switched venue under the same symbol; hosts reset the view as for a symbol switch. */
  onSourceChange?: (source: string | undefined) => void;
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
  // The datafeed source `_symbolInfo` (and the bars loaded for it) came from.
  // A reset under a different one is a market switch, not a reconnect (AGT-136).
  protected _symbolInfoSource: string | undefined;
  protected _bars: Bar[] = [];
  private _barsDataContext?: ChartWidgetDataContext;
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
  // Left pages launched; lets a continuation tell whether it requested another.
  private _leftHistoryRequestSeq = 0;
  // Paging back for indicator warm-up: studies get the bars once, when it ends.
  private _warmupBackfillPending = false;
  protected _loadBarsRequestId = 0;
  protected _resolveSymbolRequestId = 0;
  protected _disposed = false;
  protected _lastRealtimeUpdateEmittedAt = 0;
  protected _pendingRealtimeUpdateTimer: ReturnType<typeof setTimeout> | null = null;
  protected _hasPendingRealtimeUpdate = false;
  protected _realtimeUpdateThrottleMs: number;

  // Subscription tracking
  protected _barSubscriptionGuid: string | null = null;
  // Wall-clock receipt of the last live bar, for the rollover silence check.
  protected _lastLiveBarAt = 0;
  // Earliest bar time a live-gap backfill must cover; set while one is in flight.
  protected _liveGapBackfillFrom: number | null = null;
  protected _liveGapBackfillPending = false;
  protected _liveGapRetryTimer: ReturnType<typeof setTimeout> | null = null;

  // Managers
  protected _paneManager: PaneManager;
  protected _indicatorManager: IIndicatorManager | null = null;
  protected _eventEmitter: EventEmitter;

  // Callbacks
  protected _onBarsChanged?: (bars: Bar[], context: ChartWidgetBarsChangedContext) => void;
  protected _onPlotsChanged?: (plots: PlotOutput[]) => void;
  protected _onViewportChanged?: (viewport: Viewport) => void;
  protected _onLoadingChanged?: (loading: boolean, context: ChartWidgetDataContext) => void;
  protected _onLoadFailed?: (context: ChartWidgetDataContext) => void;
  protected _onLoadingMoreBarsChanged?: (loading: boolean, context: ChartWidgetDataContext) => void;
  protected _onSourceChange?: (source: string | undefined) => void;
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
    this._onLoadFailed = options.onLoadFailed;
    this._onLoadingMoreBarsChanged = options.onLoadingMoreBarsChanged;
    this._onSourceChange = options.onSourceChange;
    this._onSymbolChange = options.onSymbolChange;
    this._onIntervalChange = options.onIntervalChange;
    this._scheduleRender = options.scheduleRender || (() => {});
    this._indicatorManager = options.indicatorManager || null;
    this._indicatorManager?.setOnHistoryRequirementChanged?.(this._syncIndicatorHistoryWarmup);
    this._realtimeUpdateThrottleMs =
      Number.isFinite(options.realtimeUpdateThrottleMs) && options.realtimeUpdateThrottleMs! > 0
        ? options.realtimeUpdateThrottleMs!
        : 0;

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

    // The config only feeds the timeframe selector, and nothing in the resolve
    // or load path reads it — so the first bar load must not queue behind it.
    // A datafeed's onReady is typically a setTimeout(0) returning a literal,
    // and that hop cost 0.7-1.1s on a mobile warm start, where the main thread
    // is saturated by account restore at exactly the moment the chart mounts.
    this._datafeed.onReady((config) => {
      if (this._disposed) return;
      this._supportedResolutions = config.supported_resolutions ?? null;
    });

    this._paintCachedBars();
    this._resolveSymbolAndLoad(this._symbol);
  }

  protected _buildInitialPeriodParams(interval: string, warmupBars = 0) {
    const now = Date.now();
    const intervalMs = getIntervalMs(interval);
    const countBack = resolveInitialHistoryBarCount({ intervalMs, now, warmupBars });
    const fromTime = now - countBack * intervalMs;

    return {
      countBack,
      from: Math.floor(fromTime / 1000),
      to: Math.floor(now / 1000),
      firstDataRequest: true,
    };
  }

  /**
   * Paints whatever history the datafeed already holds, before resolving.
   *
   * Loading stays on: these bars are one request behind, and the live response
   * replaces them. Leaving it on is also what keeps the chart's usual
   * loading treatment — and its chart_loaded event — tied to real data.
   */
  protected _paintCachedBars(): void {
    if (!this._datafeed.getCachedBars) {
      return;
    }

    const cached = this._datafeed.getCachedBars(
      this._symbol,
      this._interval as ResolutionString,
      this._buildInitialPeriodParams(this._interval),
    );
    if (!cached?.length) return;

    const normalizedBars = dedupeBarsByTime(normalizeDatafeedBars(cached, this._interval), 'cache load');
    if (!normalizedBars.length) return;

    this._bars = normalizedBars;
    this._plots = [];
    this._emitBarsChanged('history');
    this._scheduleRender();
    this._indicatorManager?.setBars(normalizedBars);
  }

  /**
   * Resolves a symbol and loads its bars, discarding a resolve that a newer one
   * has superseded.
   *
   * The guard matters now that init resolves immediately: a host can call
   * setSymbol in the same tick as initialize(), and without it the init
   * callback can land last and load bars for the symbol the chart just left.
   */
  protected _resolveSymbolAndLoad(symbol: string, resubscribeOnError = false): void {
    const resolveRequestId = ++this._resolveSymbolRequestId;
    const source = this._datafeed.getSourceIdentity?.();

    this._datafeed.resolveSymbol(
      symbol,
      (symbolInfo) => {
        if (this._disposed || resolveRequestId !== this._resolveSymbolRequestId) return;
        this._symbolInfo = symbolInfo;
        this._symbolInfoSymbol = symbol;
        this._symbolInfoSource = source;
        this._loadBars(resubscribeOnError);
      },
      (error) => {
        if (this._disposed || resolveRequestId !== this._resolveSymbolRequestId) return;
        console.error('[ChartWidgetCore] Failed to resolve symbol:', error);
        this._setLoading(false);
        this._onLoadFailed?.(this._getDataContext());
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
    if (this._indicatorManager !== manager) this._indicatorManager?.setOnHistoryRequirementChanged?.(null);
    this._indicatorManager = manager;
    manager.setOnHistoryRequirementChanged?.(this._syncIndicatorHistoryWarmup);
    // If we already have bars, update the indicator manager
    if (this._bars.length > 0) {
      manager.setBars(this._bars);
      this._syncIndicatorHistoryWarmup();
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
    if (source === 'history') this._barsDataContext = context;
    this._onBarsChanged?.(this._bars, context);
  }

  /**
   * @param resubscribeOnError Re-subscribe to bars even if the history load
   * fails. Only the datafeed's cache-reset callback passes this, and only it
   * needs to: see the error handler below.
   */
  protected _loadBars(resubscribeOnError = false): void {
    if (this._disposed) return;
    if (!this._symbolInfo) {
      console.warn('[ChartWidgetCore] _loadBars called with no resolved symbol; no bars will load');
      return;
    }
    // An interval change loads directly, without resolving. If a symbol change
    // is still resolving at that moment — a multi-second window on a cold
    // exchange, where resolveSymbol polls for markets — the info in hand is the
    // market we just left, and its bars would render under the new symbol. Its
    // own resolve calls back here.
    if (this._symbolInfoSymbol !== this._symbol) return;

    const requestId = ++this._loadBarsRequestId;
    this._clearPendingRealtimeUpdate();
    this._clearLiveGapBackfill();
    this._setLoadingMoreBars(false);
    this._clearQueuedLeftHistoryBackfill();
    const requestSymbol = this._symbol;
    const requestInterval = this._interval;
    const requestSymbolInfo = this._symbolInfo;
    this._setLoading(true);

    this._warmupBackfillPending = false;
    const periodParams = this._buildInitialPeriodParams(requestInterval, this._indicatorWarmupBars());

    this._datafeed.getBars(
      requestSymbolInfo,
      requestInterval,
      periodParams,
      (bars) => {
        if (this._disposed) return;
        if (requestId !== this._loadBarsRequestId) return;
        if (requestSymbol !== this._symbol || requestInterval !== this._interval) return;

        // Normalize on ingest — drop duplicate/out-of-order timestamps so candles
        // don't render as overlapping bodies (feeds occasionally emit dupes).
        const loadedBars = dedupeBarsByTime(normalizeDatafeedBars(bars, requestInterval), 'history load');
        const normalizedBars = trimBarsToHistoryAnchor(
          loadedBars,
          getIntervalMs(requestInterval),
          this._warmupHistoryStartTime(loadedBars),
        );
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
        this._syncIndicatorHistoryWarmup();
      },
      (error) => {
        if (this._disposed) return;
        if (requestId !== this._loadBarsRequestId) return;

        this._setLoading(false);
        console.error('[ChartWidgetCore] Failed to load bars:', error);
        // The request's own market: a symbol change still resolving has not
        // bumped the request id yet, and its failure is not the new market's.
        this._onLoadFailed?.({ symbol: requestSymbol, interval: requestInterval, requestId });

        // Re-subscribe even though the history load failed, but ONLY for the
        // cache-reset caller. `_subscribeToBars` is what calls
        // `unsubscribeBars(oldGuid)` and registers a FRESH
        // `onResetCacheNeededCallback`, and the datafeed's reset is one-shot per
        // subscription: skip it and the old guid keeps `hasResetCache === true`
        // forever, so every later `forceResetCacheCallbacks()` — the host's
        // reconnect path — is a silent no-op for this chart and its kline
        // listener stays bound to the exchange the account reload disposed. A
        // failed load is exactly when that matters.
        //
        // Scoped to that one caller for the same reasons as the web widget: the
        // reset callback already bailed unless its subscription is current, so
        // the symbol and interval are unchanged, while the other callers would
        // re-subscribe under a symbol `_bars` does not belong to.
        if (resubscribeOnError) {
          this._subscribeToBars();
        }
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

  /** @returns whether another page was requested */
  private _loadNextLeftHistoryBackfill(
    activeHint: HistoryBackfillRequestHint | undefined,
    previousEarliestBarTime: number,
  ): boolean {
    const queuedHint = this._consumeQueuedLeftHistoryBackfill();
    const hint = resolveLeftHistoryBackfillContinuationHint({
      activeHint,
      currentEarliestBarTime: this._bars[0]?.time,
      previousEarliestBarTime,
      queuedHint,
    });
    if (hint === null) return false;
    const seq = this._leftHistoryRequestSeq;
    this._loadMoreBars('left', hint);
    return this._leftHistoryRequestSeq !== seq;
  }

  private _indicatorWarmupBars(): number {
    return this._indicatorManager?.getHistoryRequirementBars?.() ?? 0;
  }

  private _warmupHistoryStartTime(bars: Bar[]): number | null {
    return resolveWarmupHistoryStartTime({
      intervalMs: getIntervalMs(this._interval),
      latestTime: bars.at(-1)?.time,
      warmupBars: this._indicatorWarmupBars(),
    });
  }

  /**
   * Pages left until the loaded history covers the active studies' warm-up
   * (see `historyWarmup.ts`). A declaration lands after its study compiles,
   * usually after the first page, so the manager calls this then too.
   */
  private _syncIndicatorHistoryWarmup = (): void => {
    if (this._disposed || this._isLoading || !this._hasMoreHistoricalData) return;
    const earliest = this._bars[0]?.time;
    const startTime = this._warmupHistoryStartTime(this._bars);
    if (startTime === null || earliest === undefined || earliest <= startTime) return;
    this._warmupBackfillPending = true;
    const seq = this._leftHistoryRequestSeq;
    this._loadMoreBars('left', { requiredStartTime: startTime });
    // A busy pager queues the hint; the page in flight finishes the warm-up.
    if (this._leftHistoryRequestSeq === seq && !this._isLoadingMoreBars) this._warmupBackfillPending = false;
  };

  private _finishWarmupBackfill(): void {
    if (!this._warmupBackfillPending) return;
    this._warmupBackfillPending = false;
    if (this._bars.length > 0) this._indicatorManager?.setBars(this._bars);
  }

  protected _loadMoreBars(direction: HistoryBackfillDirection, hint?: HistoryBackfillRequestHint): void {
    if (this._disposed) return;
    if (direction !== 'left') return;
    if (!this._symbolInfo) return;
    // A failed setSymbol leaves the previous symbol's info and bars: never page them under the new one.
    if (this._symbolInfoSymbol !== this._symbol) return;
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
    this._leftHistoryRequestSeq += 1;
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
          this._finishWarmupBackfill();
          return;
        }

        const existingTimes = new Set(this._bars.map((bar) => bar.time));
        const newBars = normalizeDatafeedBars(bars, requestInterval).filter((bar) => !existingTimes.has(bar.time));
        if (newBars.length > 0) {
          const merged = dedupeBarsByTime([...newBars, ...this._bars], 'history prepend');
          this._bars = trimBarsToHistoryAnchor(
            merged,
            intervalMs,
            this._warmupHistoryStartTime(merged),
            previousEarliestBarTime,
          );
          this._emitBarsChanged('history');
          this._scheduleRender();
        }
        const continued = this._loadNextLeftHistoryBackfill(hint, previousEarliestBarTime);
        // A warm-up hands studies its bars once, at the end, not per page.
        if (!continued && this._warmupBackfillPending) this._finishWarmupBackfill();
        else if (newBars.length > 0 && !this._warmupBackfillPending) this._indicatorManager?.setBars(this._bars);
      },
      (error) => {
        if (this._disposed) return;
        if (requestId !== this._loadBarsRequestId) return;

        this._setLoadingMoreBars(false);
        this._clearQueuedLeftHistoryBackfill();
        this._finishWarmupBackfill();
        console.error('[ChartWidgetCore] Failed to load more bars:', error);
      },
    );
  }

  protected _subscribeToBars(): void {
    if (this._disposed) return;
    if (!this._symbolInfo) {
      console.warn('[ChartWidgetCore] _subscribeToBars called with no resolved symbol; live candles will not start');
      return;
    }

    // Unsubscribe from previous
    if (this._barSubscriptionGuid) {
      this._datafeed.unsubscribeBars(this._barSubscriptionGuid);
    }

    this._barSubscriptionGuid = `chart_${this._symbol}_${this._interval}_${Date.now()}`;
    this._lastLiveBarAt = 0;
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
        this._handleNewBar(normalizeDatafeedBar(bar, subscriptionInterval));
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
        const source = this._datafeed.getSourceIdentity?.();
        if (source !== undefined && source !== this._symbolInfoSource) {
          this._switchSource();
          return;
        }
        // Re-subscribe even if the reload fails: honouring this callback spends
        // the datafeed's one-shot reset, so only a fresh `subscribeBars` can
        // re-arm it.
        this._loadBars(true);
      },
    );
  }

  protected _handleNewBar(bar: Bar): void {
    if (this._disposed) return;
    const receivedAt = Date.now();
    const silentForMs = this._lastLiveBarAt ? receivedAt - this._lastLiveBarAt : 0;
    this._lastLiveBarAt = receivedAt;
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
        if (this._hasPendingRealtimeUpdate) {
          this._emitRealtimeUpdate();
        }
        this._bars.push(bar);
        // A live stream only carries the bar in progress. Bars that closed while
        // the app was backgrounded or the socket was down never arrive on it, so
        // fetch them — and the final values of the bar the gap started on.
        const skippedBars = bar.time > barCloseTimeMs(this._interval, lastBar.time);
        if (skippedBars || silentForMs > LIVE_SILENCE_BACKFILL_MS) {
          this._backfillLiveGap(lastBar.time);
        }
      } else {
        return;
      }
    }

    this._queueRealtimeUpdate();
  }

  /**
   * Fetches bars from `fromTime` to now and merges them under the live bar.
   *
   * The live bar stays authoritative for its own slot: it is newer than any
   * history response. A second gap while one fetch is in flight widens the
   * range of a follow-up request instead of racing it.
   */
  protected _backfillLiveGap(fromTime: number): void {
    if (this._disposed || !this._symbolInfo || this._isLoading) return;
    if (this._liveGapBackfillFrom !== null) {
      this._liveGapBackfillFrom = Math.min(this._liveGapBackfillFrom, fromTime);
      this._liveGapBackfillPending = true;
      return;
    }
    this._liveGapBackfillFrom = fromTime;
    this._liveGapBackfillPending = false;
    this._requestLiveGap(fromTime, 0);
  }

  /**
   * A failed read retries with backoff: right after a resume the account's
   * route can refuse until its socket and auth recover, which is exactly when
   * the gap exists.
   */
  private _requestLiveGap(fromTime: number, attempt: number): void {
    if (!this._symbolInfo) return;
    const requestId = this._loadBarsRequestId;
    const requestSymbol = this._symbol;
    const requestInterval = this._interval;
    const intervalMs = getIntervalMs(requestInterval);
    const now = Date.now();
    const countBack = Math.max(2, Math.ceil((now - fromTime) / intervalMs) + 1);
    // The bar in progress when the request went out: the venue's copy of it is
    // mid-bar, so it and anything newer stay with the stream.
    const liveTimeAtRequest = this._bars[this._bars.length - 1]?.time ?? Number.POSITIVE_INFINITY;
    const isCurrent = () =>
      !this._disposed &&
      requestId === this._loadBarsRequestId &&
      requestSymbol === this._symbol &&
      requestInterval === this._interval;
    const finish = () => {
      const followUpFrom = this._liveGapBackfillPending ? this._liveGapBackfillFrom : null;
      this._clearLiveGapBackfill();
      if (followUpFrom !== null) this._backfillLiveGap(followUpFrom);
    };

    this._datafeed.getBars(
      this._symbolInfo,
      requestInterval,
      {
        countBack,
        from: Math.floor(fromTime / 1000),
        to: Math.ceil(now / 1000),
        firstDataRequest: false,
      },
      (bars) => {
        if (!isCurrent()) return;
        this._mergeLiveGapBars(normalizeDatafeedBars(bars, requestInterval), fromTime, liveTimeAtRequest);
        finish();
      },
      (error) => {
        if (!isCurrent()) return;
        console.error('[ChartWidgetCore] Failed to backfill live bar gap:', error);
        if (attempt + 1 >= LIVE_GAP_BACKFILL_MAX_ATTEMPTS) {
          finish();
          return;
        }
        const delay = Math.min(LIVE_GAP_BACKFILL_RETRY_BASE_MS * 2 ** attempt, LIVE_GAP_BACKFILL_RETRY_MAX_MS);
        this._liveGapRetryTimer = setTimeout(() => {
          this._liveGapRetryTimer = null;
          if (!isCurrent() || this._liveGapBackfillFrom === null) return;
          // The retry covers any gap that arrived while it waited.
          this._liveGapBackfillPending = false;
          this._requestLiveGap(this._liveGapBackfillFrom, attempt + 1);
        }, delay);
      },
    );
  }

  protected _mergeLiveGapBars(fetched: Bar[], fromTime: number, liveTimeAtRequest: number): void {
    if (this._bars.length === 0) return;
    const byTime = new Map<number, Bar>();
    for (const bar of this._bars) byTime.set(bar.time, bar);
    let changed = false;
    for (const bar of fetched) {
      if (bar.time < fromTime || bar.time >= liveTimeAtRequest) continue;
      const existing = byTime.get(bar.time);
      if (existing && barValuesEqual(existing, bar)) continue;
      byTime.set(bar.time, bar);
      changed = true;
    }
    if (!changed) return;

    this._clearPendingRealtimeUpdate();
    this._bars = [...byTime.values()].sort((a, b) => a.time - b.time);
    this._emitBarsChanged('history');
    this._scheduleRender();
    this._indicatorManager?.setBars(this._bars);
  }

  protected _clearLiveGapBackfill(): void {
    this._liveGapBackfillFrom = null;
    this._liveGapBackfillPending = false;
    if (this._liveGapRetryTimer !== null) {
      clearTimeout(this._liveGapRetryTimer);
      this._liveGapRetryTimer = null;
    }
  }

  protected _emitRealtimeUpdate(): void {
    if (this._disposed) return;
    this._hasPendingRealtimeUpdate = false;
    if (this._pendingRealtimeUpdateTimer !== null) {
      clearTimeout(this._pendingRealtimeUpdateTimer);
      this._pendingRealtimeUpdateTimer = null;
    }

    const bar = this._bars[this._bars.length - 1];
    if (!bar) return;

    if (this._indicatorManager?.updateBar) {
      this._indicatorManager.updateBar(bar);
    } else {
      this._indicatorManager?.setBars(this._bars);
    }

    this._emitBarsChanged('realtime');
    this._scheduleRender();
    this._lastRealtimeUpdateEmittedAt = Date.now();
  }

  protected _queueRealtimeUpdate(): void {
    if (this._disposed) return;
    if (this._realtimeUpdateThrottleMs <= 0) {
      this._emitRealtimeUpdate();
      return;
    }

    this._hasPendingRealtimeUpdate = true;
    const elapsedMs = Date.now() - this._lastRealtimeUpdateEmittedAt;
    if (elapsedMs >= this._realtimeUpdateThrottleMs) {
      this._emitRealtimeUpdate();
      return;
    }

    if (this._pendingRealtimeUpdateTimer !== null) return;
    this._pendingRealtimeUpdateTimer = setTimeout(() => {
      this._pendingRealtimeUpdateTimer = null;
      if (!this._hasPendingRealtimeUpdate) return;
      this._emitRealtimeUpdate();
    }, this._realtimeUpdateThrottleMs - elapsedMs);
  }

  protected _clearPendingRealtimeUpdate(): void {
    this._hasPendingRealtimeUpdate = false;
    if (this._pendingRealtimeUpdateTimer !== null) {
      clearTimeout(this._pendingRealtimeUpdateTimer);
      this._pendingRealtimeUpdateTimer = null;
    }
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
    this._clearPendingRealtimeUpdate();

    this._symbol = symbol;
    this._onSymbolChange?.(symbol);
    // Bars are kept, tagged with their market; hosts must not draw another
    // symbol's under this one (native clears them, AGT-127).
    this._hasMoreHistoricalData = true;
    this._setLoadingMoreBars(false);
    this._clearQueuedLeftHistoryBackfill();
    this._setLoading(true);

    this._resolveSymbolAndLoad(symbol);
  }

  /**
   * The datafeed now serves another venue under the same symbol (okx-t BTCUSDT
   * -> woo-t BTCUSDT): handled like a symbol switch, except that nothing of the
   * previous venue may stay on screen, not even faded, because its candles read
   * as this venue's (AGT-136). Bars are dropped, the symbol is re-resolved for the
   * new venue's precision, and the reload re-arms the reset even if it fails.
   */
  protected _switchSource(): void {
    if (this._barSubscriptionGuid) {
      this._datafeed.unsubscribeBars(this._barSubscriptionGuid);
      this._barSubscriptionGuid = null;
    }
    this._clearPendingRealtimeUpdate();
    this._clearLiveGapBackfill();
    this._symbolInfo = null;
    this._symbolInfoSymbol = null;
    this._symbolInfoSource = undefined;
    this._bars = [];
    this._plots = [];
    this._hasMoreHistoricalData = true;
    this._setLoadingMoreBars(false);
    this._clearQueuedLeftHistoryBackfill();
    this._setLoading(true);
    this._emitBarsChanged('history');
    this._onPlotsChanged?.(this._plots);
    this._indicatorManager?.setBars(this._bars);
    this._onSourceChange?.(this._datafeed.getSourceIdentity?.());
    this._scheduleRender();
    this._resolveSymbolAndLoad(this._symbol, true);
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
    this._clearPendingRealtimeUpdate();

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

  /** The datafeed source the current market was resolved from, when the feed reports one. */
  getSourceIdentity(): string | undefined {
    return this._symbolInfoSource ?? this._datafeed.getSourceIdentity?.();
  }

  getAnalysisContext(visibleRange?: AnalysisTimeRange): AnalysisContextReadResult {
    if (this._disposed) return { status: 'unavailable', reason: 'disposed' };
    if (this._isLoading) return { status: 'unavailable', reason: 'loading' };
    if (!this._bars.length) return { status: 'unavailable', reason: 'no-data' };
    if (this._barsDataContext?.symbol !== this._symbol || this._barsDataContext?.interval !== this._interval)
      return { status: 'unavailable', reason: 'stale-market' };
    return {
      status: 'ready',
      context: {
        bars: this._bars,
        symbol: this._symbol,
        interval: this._interval,
        contextRevision: this._resolveSymbolRequestId + this._loadBarsRequestId,
        visibleRange,
      },
    };
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
    this._clearPendingRealtimeUpdate();
    this._clearLiveGapBackfill();
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
    this._onLoadFailed = undefined;
    this._onSourceChange = undefined;
    this._onSymbolChange = undefined;
    this._onIntervalChange = undefined;
    this._scheduleRender = () => {};
    this._eventEmitter.removeAllListeners();
  }
}
