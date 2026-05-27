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
import type { Bar, IBasicDataFeed, LibrarySymbolInfo, ResolutionString, UnifiedPaneLayout, Viewport } from '../types';

import { EventEmitter } from '../events/EventEmitter';
import { PaneManager } from '../rendering/PaneManager';

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
export const INITIAL_BAR_COUNT = 300;

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
  interval?: string;

  // Platform-specific injections
  indicatorManager?: IIndicatorManager;
  scheduleRender?: () => void;

  // Callbacks
  onBarsChanged?: (bars: Bar[]) => void;
  onPlotsChanged?: (plots: PlotOutput[]) => void;
  onViewportChanged?: (viewport: Viewport) => void;
  onLoadingChanged?: (loading: boolean) => void;
  onSymbolChange?: (symbol: string) => void;
  onIntervalChange?: (interval: string) => void;
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
  protected _bars: Bar[] = [];
  protected _viewport: Viewport | null = null;
  protected _plots: PlotOutput[] = [];

  // Supported resolutions from datafeed config (for filtering timeframe selector)
  protected _supportedResolutions: string[] | null = null;

  // State flags
  protected _isLoading = false;
  protected _isLoadingMoreBars = false;
  protected _hasMoreHistoricalData = true;
  protected _loadBarsRequestId = 0;

  // Subscription tracking
  protected _barSubscriptionGuid: string | null = null;

  // Managers
  protected _paneManager: PaneManager;
  protected _indicatorManager: IIndicatorManager | null = null;
  protected _eventEmitter: EventEmitter;

  // Callbacks
  protected _onBarsChanged?: (bars: Bar[]) => void;
  protected _onPlotsChanged?: (plots: PlotOutput[]) => void;
  protected _onViewportChanged?: (viewport: Viewport) => void;
  protected _onLoadingChanged?: (loading: boolean) => void;
  protected _onSymbolChange?: (symbol: string) => void;
  protected _onIntervalChange?: (interval: string) => void;
  protected _scheduleRender: () => void;

  constructor(options: ChartWidgetCoreOptions) {
    this._datafeed = options.datafeed;
    this._symbol = options.symbol;
    this._interval = (options.interval || '1h') as ResolutionString;

    this._onBarsChanged = options.onBarsChanged;
    this._onPlotsChanged = options.onPlotsChanged;
    this._onViewportChanged = options.onViewportChanged;
    this._onLoadingChanged = options.onLoadingChanged;
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
    this._datafeed.onReady((config) => {
      // Store supported resolutions from datafeed config
      this._supportedResolutions = config.supported_resolutions ?? null;
      this._datafeed.resolveSymbol(
        this._symbol,
        (symbolInfo) => {
          this._symbolInfo = symbolInfo;
          this._loadBars();
        },
        (error) => {
          console.error('[ChartWidgetCore] Failed to resolve symbol:', error);
          this._setLoading(false);
        },
      );
    });
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

  protected _setLoading(loading: boolean): void {
    if (this._isLoading !== loading) {
      this._isLoading = loading;
      this._onLoadingChanged?.(loading);
    }
  }

  protected _loadBars(): void {
    if (!this._symbolInfo) return;

    const requestId = ++this._loadBarsRequestId;
    this._setLoading(true);

    const now = Date.now();
    const intervalMs = getIntervalMs(this._interval);
    const countBack = INITIAL_BAR_COUNT;
    const fromTime = now - countBack * intervalMs;

    const periodParams = {
      countBack,
      from: Math.floor(fromTime / 1000),
      to: Math.floor(now / 1000),
      firstDataRequest: true,
    };

    this._datafeed.getBars(
      this._symbolInfo,
      this._interval,
      periodParams,
      (bars) => {
        if (requestId !== this._loadBarsRequestId) return; // Stale

        this._bars = bars;
        // Clear old plots — they belong to the old symbol/interval
        this._plots = [];
        this._setLoading(false);

        // Notify listeners BEFORE indicator manager — ensures empty plots
        // are pushed to UI before worker callback can race with stale data
        this._onBarsChanged?.(bars);
        this._onPlotsChanged?.(this._plots);
        this._scheduleRender();
        this._subscribeToBars();

        // Notify indicator manager AFTER — worker callback fires later with new data
        this._indicatorManager?.setBars(bars);
      },
      (error) => {
        if (requestId !== this._loadBarsRequestId) return;

        this._setLoading(false);
        console.error('[ChartWidgetCore] Failed to load bars:', error);
      },
    );
  }

  protected _subscribeToBars(): void {
    if (!this._symbolInfo) return;

    // Unsubscribe from previous
    if (this._barSubscriptionGuid) {
      this._datafeed.unsubscribeBars(this._barSubscriptionGuid);
    }

    this._barSubscriptionGuid = `chart_${this._symbol}_${this._interval}_${Date.now()}`;

    this._datafeed.subscribeBars(
      this._symbolInfo,
      this._interval,
      (bar) => this._handleNewBar(bar),
      this._barSubscriptionGuid,
      () => this._loadBars(), // Reset callback
    );
  }

  protected _handleNewBar(bar: Bar): void {
    if (this._bars.length === 0) {
      this._bars.push(bar);
    } else {
      const lastBar = this._bars[this._bars.length - 1];
      if (bar.time === lastBar.time) {
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

    this._onBarsChanged?.(this._bars);
    this._scheduleRender();
  }

  // ============================================================================
  // Symbol/Interval Changes
  // ============================================================================

  setSymbol(symbol: string): void {
    if (this._symbol === symbol) return;

    // Unsubscribe from old
    if (this._barSubscriptionGuid) {
      this._datafeed.unsubscribeBars(this._barSubscriptionGuid);
      this._barSubscriptionGuid = null;
    }

    this._symbol = symbol;
    // Don't clear bars — keep old candles visible (faded) until new data arrives
    this._hasMoreHistoricalData = true;
    this._setLoading(true);

    this._datafeed.resolveSymbol(
      symbol,
      (symbolInfo) => {
        this._symbolInfo = symbolInfo;
        this._loadBars();
      },
      (error) => {
        console.error('[ChartWidgetCore] Failed to resolve symbol:', error);
        this._setLoading(false);
      },
    );

    this._onSymbolChange?.(symbol);
  }

  setInterval(interval: string): void {
    if (this._interval === interval) return;

    // Unsubscribe from old
    if (this._barSubscriptionGuid) {
      this._datafeed.unsubscribeBars(this._barSubscriptionGuid);
      this._barSubscriptionGuid = null;
    }

    this._interval = interval as ResolutionString;
    // Don't clear bars — keep old candles visible (faded) until new data arrives
    this._hasMoreHistoricalData = true;
    this._setLoading(true);
    this._scheduleRender();
    this._loadBars();

    this._onIntervalChange?.(interval);
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

  addIndicator(indicator: BuiltinIndicator, inputs?: Record<string, unknown>): string | null {
    // To be implemented by subclasses that support indicators
    console.warn('[ChartWidgetCore] addIndicator not implemented');
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
    if (this._barSubscriptionGuid) {
      this._datafeed.unsubscribeBars(this._barSubscriptionGuid);
    }
    this._indicatorManager?.dispose?.();
    this._eventEmitter.removeAllListeners();
  }
}
