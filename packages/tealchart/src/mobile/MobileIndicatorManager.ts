/**
 * MobileIndicatorManager - Class-based indicator management (matches web pattern)
 *
 * This class mirrors web's TealchartWidget indicator management:
 * - Web: TealchartWidget uses TealscriptManager (WebWorker-based)
 * - Mobile: MobileIndicatorManager requires the compiled WebView host
 *
 * Usage in React:
 * ```typescript
 * const indicatorManager = useRef(new MobileIndicatorManager()).current;
 * const [, forceUpdate] = useReducer(x => x + 1, 0);
 *
 * useEffect(() => {
 *   indicatorManager.setOnUpdate(forceUpdate);
 * }, []);
 * ```
 */
import type {
  DrawingOutput,
  FromWorkerMessage,
  IndicatorDeclarationMetadata,
  InputDefinition,
  PlotOutput,
  Program,
  RequestCorporateActionQuery,
  RequestCurrencyRateQuery,
  RequestDatafeed,
  RequestDatafeedErrorCode,
  RequestEconomicSeriesQuery,
  RequestFinancialMetricQuery,
  RequestFootprintQuery,
  RequestQuandlSeriesQuery,
  RequestSeriesQuery,
  RuntimeProfile,
  TealscriptExecutionBackend,
  TealscriptRuntimeOptions,
  WorkerError,
} from '@tealstreet/tealscript';
import type { EventCallback } from '../events/EventEmitter';
import type { IndicatorInstance, PlotStyleOverride } from '../state/chartState';
import type { Bar, TealscriptRequestDataResolver, UnifiedPaneLayout } from '../types';

import { parse, TealscriptParseError } from '@tealstreet/tealscript';
import { LogCategory, TealchartLogger } from '../debug/TealchartLogger';
import { EventEmitter } from '../events/EventEmitter';
import { type BuiltinIndicator } from '../indicators/builtinIndicators';
import { PaneManager } from '../rendering/PaneManager';
import { TealscriptManager } from '../tealscript/TealscriptManager';

/**
 * An active indicator instance
 */
export interface ActiveIndicator {
  /** Unique instance ID (different from indicator.id - allows multiple of same indicator) */
  instanceId: string;
  /** The base indicator definition */
  indicator: BuiltinIndicator;
  /** Built-in id to write into saved chart layouts when the indicator was created from a built-in id. */
  layoutBuiltinId?: string;
  /** Current input values */
  inputs?: Record<string, unknown>;
  /** Parsed AST (cached for performance) */
  ast?: Program;
  /** Style overrides for plots */
  styleOverrides?: PlotStyleOverride[];
  /** Whether this indicator currently contributes plots/drawings */
  isVisible: boolean;
  /** Pine indicator declaration metadata discovered during execution */
  declaration?: IndicatorDeclarationMetadata;
  /** Last Tealscript execution profile for diagnostics and backend rollout visibility. */
  runtimeProfile?: RuntimeProfile;
}

/**
 * Indicator pane info for rendering
 */
export interface IndicatorPaneInfo {
  name: string;
  overlay: boolean;
  yAxisRange?: { min: number; max: number };
  explicitPlotZOrder?: boolean;
  format?: string;
  inputs?: Record<string, unknown>;
  precision?: number;
  scale?: string;
}

/**
 * Options for adding a caller-provided Tealscript indicator.
 */
export interface MobileTealscriptIndicatorOptions {
  /** Stable script/instance ID. A generated ID is used when omitted. */
  id?: string;
  /** Raw Tealscript source. */
  code: string;
  /** Built-in indicator id used for layout restore, when this source came from the built-in registry. */
  builtinId?: string;
  /** Display name shown in pane labels/settings. */
  name?: string;
  /** Whether the indicator renders on the main price pane. Defaults to false. */
  overlay?: boolean;
  /** Runtime input values. */
  inputs?: Record<string, unknown>;
  /** Fixed Y range for oscillator-style panes. */
  yAxisRange?: { min: number; max: number };
}

export interface MobileIndicatorManagerOptions {
  createWorker?: () => Worker;
  tealscriptExecutionBackend?: TealscriptExecutionBackend;
  getRuntimeOptions?: () => TealscriptRuntimeOptions | undefined;
  getLibraries?: () => Map<string, Program> | undefined;
  getRequestDatafeed?: () => RequestDatafeed | undefined;
}

export type MobileIndicatorErrorCallback = (scriptId: string, error: WorkerError) => void;

const MOBILE_INDICATOR_ERROR_EVENT = 'indicator:error';
type RequestDataMessage = Extract<FromWorkerMessage, { type: 'requestData' }>;

/**
 * MobileIndicatorManager - React-agnostic class for managing indicators
 *
 * Mobile TealScript execution is intentionally unavailable until the compiled
 * WebView host lands. Inline execution was removed.
 */
export class MobileIndicatorManager {
  private _paneManager: PaneManager;
  private _indicators: ActiveIndicator[] = [];
  private _plots: PlotOutput[] = [];
  private _drawings: DrawingOutput[] = [];
  private _astCache: Map<string, Program> = new Map();
  private _inputDefsCache: Map<string, InputDefinition[]> = new Map();
  private _declarationCache: Map<string, IndicatorDeclarationMetadata> = new Map();
  private _bars: Bar[] = [];
  private _onUpdate: (() => void) | null = null;
  private _events = new EventEmitter();
  private _logger = new TealchartLogger({
    consoleOutput: false,
    consolePrefix: '[MobileIndicatorManager]',
  });
  private _lastErrorKeys: Map<string, string> = new Map();
  private _instanceCounter = 0;
  private _plotsRevision = 0;
  private _indicatorsRevision = 0;
  private _getLibraries: (() => Map<string, Program> | undefined) | undefined;
  private _getRuntimeOptions: (() => TealscriptRuntimeOptions | undefined) | undefined;
  private _getRequestDatafeed: (() => RequestDatafeed | undefined) | undefined;
  private _tealscriptExecutionBackend: TealscriptExecutionBackend | undefined;
  private _tealscriptManager: TealscriptManager | undefined;

  constructor(options: MobileIndicatorManagerOptions = {}) {
    this._paneManager = new PaneManager();
    this._getRuntimeOptions = options.getRuntimeOptions;
    this._getLibraries = options.getLibraries;
    this._getRequestDatafeed = options.getRequestDatafeed;
    this._tealscriptExecutionBackend = options.tealscriptExecutionBackend;
    if (options.createWorker) {
      this._tealscriptManager = new TealscriptManager({
        createWorker: options.createWorker,
        getLibraries: () => this._getLibraries?.() ?? new Map(),
        getRuntimeOptions: this._createRuntimeOptions,
        onDeclarationDiscovered: this._handleDeclarationDiscovered,
        onDrawingsUpdated: this._handleDrawingsUpdated,
        onError: this._emitError,
        onInputsDiscovered: this._handleInputsDiscovered,
        onPlotsUpdated: this._handlePlotsUpdated,
        resolveRequestData: this._resolveRequestData,
      });
    }
  }

  setLibrariesProvider(getLibraries: (() => Map<string, Program> | undefined) | undefined): void {
    if (this._getLibraries === getLibraries) return;
    this._getLibraries = getLibraries;
    this._restartWorkerScripts();
    this._recomputePlots();
  }

  setRuntimeOptionsProvider(getRuntimeOptions: (() => TealscriptRuntimeOptions | undefined) | undefined): void {
    if (this._getRuntimeOptions === getRuntimeOptions) return;
    this._getRuntimeOptions = getRuntimeOptions;
    this._restartWorkerScripts();
    this._recomputePlots();
  }

  setRequestDatafeedProvider(getRequestDatafeed: (() => RequestDatafeed | undefined) | undefined): void {
    if (this._getRequestDatafeed === getRequestDatafeed) return;
    this._getRequestDatafeed = getRequestDatafeed;
    this._restartWorkerScripts();
    this._recomputePlots();
  }

  setTealscriptBackendSelection(options: { tealscriptExecutionBackend?: TealscriptExecutionBackend }): void {
    if (this._tealscriptExecutionBackend === options.tealscriptExecutionBackend) {
      return;
    }
    this._tealscriptExecutionBackend = options.tealscriptExecutionBackend;
    this._restartWorkerScripts();
    this._recomputePlots();
  }

  /**
   * Subscribe to state changes
   * React can use this to trigger re-renders when indicators/plots change
   */
  setOnUpdate(callback: () => void): void {
    this._onUpdate = callback;
  }

  onErrorSubscribe(callback: MobileIndicatorErrorCallback): void {
    this._events.subscribe(MOBILE_INDICATOR_ERROR_EVENT, callback as EventCallback);
  }

  onErrorUnsubscribe(callback: MobileIndicatorErrorCallback): void {
    this._events.unsubscribe(MOBILE_INDICATOR_ERROR_EVENT, callback as EventCallback);
  }

  /**
   * Update bar data and recompute all indicator plots
   * Call this when new bar data arrives
   * @param silent - If true, don't trigger onUpdate callback (use when batching with RAF)
   */
  setBars(bars: Bar[], silent = false): void {
    // Epoch, not array identity: ChartWidgetCore appends a live bar in place and
    // hands back the same array, which reference equality would read as no change.
    this._bars = bars;
    this._tealscriptManager?.setBars(bars);
    this._recomputePlots(silent);
  }

  /**
   * Realtime tick path. ChartWidgetCore probes for this method and falls back to
   * setBars when it is absent — and setBars restarts every ready worker to cancel
   * stale full recalculations, clearing plots and drawings each time. Without this
   * override every tick tore down and rebuilt all indicator workers, which is what
   * made indicators flicker on device.
   */
  updateBar(bar: Bar, silent = false): void {
    this._tealscriptManager?.updateBar(bar);
    this._recomputePlots(silent);
  }

  /** Advances whenever the plot set changes. */
  getPlotsRevision(): number {
    return this._plotsRevision;
  }

  /** Advances only when indicators are added, removed, retuned or hidden. */
  getIndicatorsRevision(): number {
    return this._indicatorsRevision;
  }

  /**
   * Get current bar data
   */
  getBars(): Bar[] {
    return this._bars;
  }

  /**
   * Add an indicator
   * @param indicator - The indicator definition from builtinIndicators
   * @param inputs - Optional input values (defaults come from indicator definition)
   * @returns The unique instance ID for this indicator
   */
  addIndicator(indicator: BuiltinIndicator, inputs?: Record<string, unknown>): string {
    const instanceId = `${indicator.id}_${++this._instanceCounter}`;

    // Add to PaneManager (handles pane creation for non-overlay indicators)
    this._paneManager.addIndicator({
      indicatorId: instanceId,
      overlay: indicator.overlay,
      yAxisRange: indicator.yAxisRange,
    });

    // Parse the indicator code (cached by indicator.id, not instanceId)
    let ast: Program | undefined;
    try {
      if (this._astCache.has(indicator.id)) {
        ast = this._astCache.get(indicator.id);
      } else if (indicator.code) {
        ast = parse(indicator.code);
        this._astCache.set(indicator.id, ast);
      }
    } catch (err) {
      this._logger.error(LogCategory.Indicators, 'Failed to parse indicator code', {
        indicatorId: indicator.id,
        error: err,
      });
      this._emitError(instanceId, this._toParseError(err));
    }

    // Add to indicators list
    this._indicators.push({
      instanceId,
      indicator,
      layoutBuiltinId: indicator.id,
      inputs,
      ast,
      isVisible: true,
    });
    this._addWorkerScript(instanceId, indicator.code, inputs);

    // Recompute plots with new indicator
    this._indicatorsRevision += 1;
    this._recomputePlots();

    return instanceId;
  }

  /**
   * Add a caller-provided Tealscript indicator.
   *
   * This mirrors the worker-backed web path metadata for mobile.
   * TealScript execution now requires the compiled WebView host.
   */
  addTealscriptIndicator(options: MobileTealscriptIndicatorOptions): string {
    const instanceId = options.id?.trim() || `custom_${++this._instanceCounter}`;
    if (this._indicators.some((indicator) => indicator.instanceId === instanceId)) {
      this.removeIndicator(instanceId);
    }

    const indicator: BuiltinIndicator = {
      id: instanceId,
      name: options.name?.trim() || 'Custom Indicator',
      category: 'other',
      overlay: options.overlay ?? false,
      yAxisRange: options.yAxisRange,
      code: options.code,
    };

    this._paneManager.addIndicator({
      indicatorId: instanceId,
      overlay: indicator.overlay,
      yAxisRange: indicator.yAxisRange,
    });

    let ast: Program | undefined;
    try {
      ast = parse(options.code);
      this._astCache.set(instanceId, ast);
      this._clearError(instanceId);
    } catch (err) {
      this._emitError(instanceId, this._toParseError(err));
    }

    this._indicators.push({
      instanceId,
      indicator,
      layoutBuiltinId: options.builtinId,
      inputs: options.inputs,
      ast,
      isVisible: true,
    });
    this._addWorkerScript(instanceId, indicator.code, options.inputs);

    this._indicatorsRevision += 1;
    this._recomputePlots();

    return instanceId;
  }

  /**
   * Compatibility with the optional IIndicatorManager script API.
   */
  async addScript(scriptId: string, code: string, inputs?: Record<string, unknown>): Promise<void> {
    this.addTealscriptIndicator({ id: scriptId, code, name: scriptId, inputs });
  }

  /**
   * Compatibility with the optional IIndicatorManager script API.
   */
  removeScript(scriptId: string): void {
    this.removeIndicator(scriptId);
  }

  /**
   * Remove an indicator by instance ID
   */
  removeIndicator(instanceId: string): void {
    // Remove from PaneManager
    this._paneManager.removeIndicator(instanceId);

    // Remove from indicators list
    this._indicators = this._indicators.filter((ind) => ind.instanceId !== instanceId);

    // Clear cached input definitions
    this._inputDefsCache.delete(instanceId);
    this._declarationCache.delete(instanceId);
    this._astCache.delete(instanceId);
    this._lastErrorKeys.delete(instanceId);
    this._tealscriptManager?.removeScript(instanceId);

    // Recompute plots without this indicator
    this._indicatorsRevision += 1;
    this._recomputePlots();
  }

  /**
   * Update inputs for an indicator
   */
  updateInputs(instanceId: string, inputs: Record<string, unknown>): void {
    const indicator = this._indicators.find((ind) => ind.instanceId === instanceId);
    if (indicator) {
      indicator.inputs = inputs;
      this._tealscriptManager?.setInputs(instanceId, inputs);
      this._indicatorsRevision += 1;
      this._recomputePlots();
    }
  }

  /**
   * Update indicator plot visibility without removing it from layout state.
   */
  setIndicatorVisibility(instanceId: string, isVisible: boolean): void {
    const indicator = this._indicators.find((ind) => ind.instanceId === instanceId);
    if (!indicator || indicator.isVisible === isVisible) return;

    indicator.isVisible = isVisible;
    this._tealscriptManager?.setScriptVisibility(instanceId, isVisible);
    this._indicatorsRevision += 1;
    this._recomputePlots();
  }

  /**
   * Toggle indicator plot visibility.
   */
  toggleIndicatorVisibility(instanceId: string): void {
    const indicator = this._indicators.find((ind) => ind.instanceId === instanceId);
    if (!indicator) return;

    this.setIndicatorVisibility(instanceId, !indicator.isVisible);
  }

  /**
   * Get an indicator by instance ID
   */
  getIndicator(instanceId: string): ActiveIndicator | undefined {
    return this._indicators.find((ind) => ind.instanceId === instanceId);
  }

  /**
   * Get all active indicators
   */
  getIndicators(): ActiveIndicator[] {
    return [...this._indicators];
  }

  /**
   * Snapshot indicators into the shared layout schema.
   */
  getLayoutIndicators(): IndicatorInstance[] {
    return this._indicators.map((activeIndicator, index) => ({
      id: activeIndicator.instanceId,
      name: activeIndicator.indicator.name,
      builtinId: activeIndicator.layoutBuiltinId ?? activeIndicator.indicator.id,
      inputs: activeIndicator.inputs ?? {},
      styleOverrides: activeIndicator.styleOverrides,
      isVisible: activeIndicator.isVisible,
      createdAt: index,
    }));
  }

  /**
   * Get computed plot outputs from all indicators
   */
  getPlots(): PlotOutput[] {
    return this._plots;
  }

  /**
   * Get drawing outputs from all indicators.
   */
  getDrawings(): DrawingOutput[] {
    return this._drawings;
  }

  /**
   * Get unified pane layout for rendering
   */
  getUnifiedLayout(): UnifiedPaneLayout {
    return this._paneManager.getUnifiedLayout();
  }

  /**
   * Get indicator pane info map (for rendering indicator names, etc.)
   */
  getIndicatorPaneInfo(): Record<string, IndicatorPaneInfo> {
    const info: Record<string, IndicatorPaneInfo> = {};

    for (const activeInd of this._indicators) {
      info[activeInd.instanceId] = {
        name: activeInd.indicator.name,
        overlay: activeInd.indicator.overlay,
        yAxisRange: activeInd.indicator.yAxisRange,
        explicitPlotZOrder: activeInd.declaration?.explicitPlotZOrder,
        format: activeInd.declaration?.format,
        inputs: activeInd.inputs,
        precision: activeInd.declaration?.precision,
        scale: activeInd.declaration?.scale,
      };
    }

    return info;
  }

  /**
   * Get input definitions for a given indicator instance
   */
  getInputDefinitions(instanceId: string): InputDefinition[] {
    return this._inputDefsCache.get(instanceId) ?? [];
  }

  /**
   * Get declaration metadata for a given indicator instance.
   */
  getDeclaration(instanceId: string): IndicatorDeclarationMetadata | undefined {
    return this._declarationCache.get(instanceId);
  }

  /**
   * Update style overrides for an indicator
   */
  updateStyleOverrides(instanceId: string, styleOverrides?: PlotStyleOverride[]): void {
    const indicator = this._indicators.find((ind) => ind.instanceId === instanceId);
    if (indicator) {
      indicator.styleOverrides = styleOverrides;
      this._indicatorsRevision += 1;
      this._onUpdate?.();
    }
  }

  /**
   * Get the underlying PaneManager (for advanced use cases)
   */
  getPaneManager(): PaneManager {
    return this._paneManager;
  }

  /**
   * Pin an indicator pane's value range because the user dragged its axis.
   * Auto-scale leaves the pane alone from here; `resetIndicatorPaneAutoScale`
   * hands it back.
   */
  setIndicatorPaneManualRange(paneId: string, yMin: number, yMax: number): void {
    this._paneManager.setPaneManualRange(paneId, yMin, yMax);
    this._onUpdate?.();
  }

  resetIndicatorPaneAutoScale(paneId: string): void {
    this._paneManager.resetPaneAutoScale(paneId);
    // The next recompute may be all cache hits and skip the range pass, so the
    // pane would keep the range the user dragged it to.
    this._updateAutoPaneRanges(this._plots);
    this._onUpdate?.();
  }

  private _toParseError(error: unknown): WorkerError {
    if (error instanceof TealscriptParseError) {
      return {
        type: 'parse',
        severity: 'error',
        message: error.message,
        line: error.location?.start.line,
        column: error.location?.start.column,
      };
    }

    return {
      type: 'parse',
      severity: 'error',
      message: error instanceof Error ? error.message : String(error),
    };
  }

  private _toRuntimeError(error: unknown): WorkerError {
    return {
      type: 'runtime',
      severity: 'error',
      message: error instanceof Error ? error.message : String(error),
    };
  }

  private _emitError = (instanceId: string, error: WorkerError): void => {
    const key = `${error.type}:${error.line ?? ''}:${error.column ?? ''}:${error.message}`;
    if (this._lastErrorKeys.get(instanceId) === key) {
      return;
    }

    this._lastErrorKeys.set(instanceId, key);
    this._events.emit(MOBILE_INDICATOR_ERROR_EVENT, instanceId, error);
  };

  private _clearError(instanceId: string): void {
    this._lastErrorKeys.delete(instanceId);
  }

  private _addWorkerScript(
    instanceId: string,
    code: string | undefined,
    inputs: Record<string, unknown> | undefined,
  ): void {
    if (!code || !this._tealscriptManager) return;
    void this._tealscriptManager.addScript(instanceId, code, inputs).catch((error: unknown) => {
      this._emitError(instanceId, this._toRuntimeError(error));
    });
  }

  private _restartWorkerScripts(): void {
    if (!this._tealscriptManager) return;
    for (const indicator of this._indicators) {
      this._tealscriptManager.setInputs(indicator.instanceId, indicator.inputs ?? {});
    }
  }

  private _handlePlotsUpdated = (plots: PlotOutput[]): void => {
    if (this._plotsMatchCurrent(plots)) return;
    this._plots = plots;
    this._plotsRevision += 1;
    this._updateAutoPaneRanges(plots);
    this._onUpdate?.();
  };

  private _handleDrawingsUpdated = (drawings: DrawingOutput[]): void => {
    if (this._drawingsMatchCurrent(drawings)) return;
    this._drawings = drawings;
    this._plotsRevision += 1;
    this._onUpdate?.();
  };

  private _handleInputsDiscovered = (instanceId: string, inputs: InputDefinition[]): void => {
    this._inputDefsCache.set(instanceId, inputs);
  };

  private _handleDeclarationDiscovered = (instanceId: string, declaration: IndicatorDeclarationMetadata): void => {
    this._declarationCache.set(instanceId, declaration);
    const indicator = this._indicators.find((candidate) => candidate.instanceId === instanceId);
    if (indicator) indicator.declaration = declaration;
    this._indicatorsRevision += 1;
    this._onUpdate?.();
  };

  private _resolveRequestData: TealscriptRequestDataResolver = (request) => {
    const datafeed = this._getRequestDatafeed?.();
    if (!datafeed) {
      return {
        ok: false,
        error: {
          code: 'missing-provider',
          message: 'No Tealscript request data resolver configured',
        },
      };
    }

    return this._resolveRequestDataFromDatafeed(request, datafeed);
  };

  private _createRuntimeOptions = (): TealscriptRuntimeOptions => {
    const runtime = this._getRuntimeOptions?.();
    return {
      ...runtime,
      backend: {
        ...runtime?.backend,
        executionBackendOverride: this._tealscriptExecutionBackend,
      },
    };
  };

  private _resolveRequestDataFromDatafeed(
    request: RequestDataMessage,
    datafeed: RequestDatafeed,
  ): ReturnType<TealscriptRequestDataResolver> {
    switch (request.kind) {
      case 'bars': {
        const result = datafeed.getBars(request.query as Parameters<RequestDatafeed['getBars']>[0]);
        return result.ok
          ? { ok: true, value: result.context }
          : { ok: false, error: { code: this._mapRequestDatafeedErrorCode(result.code), message: result.message } };
      }
      case 'series': {
        const result = datafeed.getSeries?.(request.query as RequestSeriesQuery);
        if (!result) return this._missingRequestData('series');
        return result.ok
          ? { ok: true, value: result.context.points }
          : { ok: false, error: { code: this._mapRequestDatafeedErrorCode(result.code), message: result.message } };
      }
      case 'currency_rate':
        return this._optionalRequestDataValue(
          datafeed.getCurrencyRate?.(request.query as RequestCurrencyRateQuery),
          'currency_rate',
        );
      case 'corporate_action':
        return this._optionalRequestDataValue(
          datafeed.getCorporateAction?.(request.query as RequestCorporateActionQuery),
          'corporate_action',
        );
      case 'economic':
        return this._optionalRequestDataValue(
          datafeed.getEconomicSeries?.(request.query as RequestEconomicSeriesQuery),
          'economic',
        );
      case 'financial':
        return this._optionalRequestDataValue(
          datafeed.getFinancialMetric?.(request.query as RequestFinancialMetricQuery),
          'financial',
        );
      case 'quandl':
        return this._optionalRequestDataValue(
          datafeed.getQuandlSeries?.(request.query as RequestQuandlSeriesQuery),
          'quandl',
        );
      case 'footprint':
        return this._optionalRequestDataValue(
          datafeed.getFootprint?.(request.query as RequestFootprintQuery),
          'footprint',
        );
    }
  }

  private _optionalRequestDataValue(
    value: unknown,
    kind: RequestDataMessage['kind'],
  ): ReturnType<TealscriptRequestDataResolver> {
    return value === undefined ? this._missingRequestData(kind) : { ok: true, value: value as never };
  }

  private _missingRequestData(kind: RequestDataMessage['kind']): ReturnType<TealscriptRequestDataResolver> {
    return {
      ok: false,
      error: {
        code: 'not-found',
        message: `No mobile Tealscript request data available for ${kind}`,
      },
    };
  }

  private _mapRequestDatafeedErrorCode(
    code: RequestDatafeedErrorCode,
  ): 'invalid-query' | 'not-found' | 'provider-error' {
    if (code === 'invalid_currency' || code === 'invalid_symbol' || code === 'invalid_timeframe')
      return 'invalid-query';
    if (code === 'missing_context') return 'not-found';
    return 'provider-error';
  }

  /**
   * Recompute all indicator plots
   * Called when bars change or indicators are added/removed
   * @param silent - If true, don't trigger onUpdate callback (for RAF batching)
   */
  private _recomputePlots(silent = false): void {
    if (this._tealscriptManager) {
      if (!silent) this._onUpdate?.();
      return;
    }

    if (this._bars.length === 0) {
      if (this._plots.length > 0 || this._drawings.length > 0) {
        this._plots = [];
        this._drawings = [];
        this._plotsRevision += 1;
      }
      if (!silent) this._onUpdate?.();
      return;
    }

    const allPlots: PlotOutput[] = [];
    const allDrawings: DrawingOutput[] = [];

    for (const ind of this._indicators) {
      const { indicator, instanceId, ast, inputs } = ind;

      if (!ind.isVisible) {
        continue;
      }

      if (!ast) {
        // Silently skip - no need to log for every bar update
        continue;
      }

      this._emitError(instanceId, {
        type: 'runtime',
        severity: 'error',
        code: 'mobile-tealscript-webview-required',
        message: 'Mobile TealScript execution requires the compiled WebView host.',
      });
      continue;
    }

    // Identical output means the pane ranges cannot have moved either, and
    // holding the previous arrays keeps their identity stable for React.
    if (this._plotsMatchCurrent(allPlots) && this._drawingsMatchCurrent(allDrawings)) {
      if (!silent) this._onUpdate?.();
      return;
    }

    this._plots = allPlots;
    this._drawings = allDrawings;
    this._plotsRevision += 1;
    this._updateAutoPaneRanges(allPlots);

    // Notify React to re-render (unless silent mode for RAF batching)
    if (!silent) this._onUpdate?.();
  }

  private _plotsMatchCurrent(plots: readonly PlotOutput[]): boolean {
    return plots.length === this._plots.length && plots.every((plot, index) => plot === this._plots[index]);
  }

  private _drawingsMatchCurrent(drawings: readonly DrawingOutput[]): boolean {
    return drawings.length === this._drawings.length && drawings.every((d, index) => d === this._drawings[index]);
  }

  private _updateAutoPaneRanges(plots: readonly PlotOutput[]): void {
    const panes = this._paneManager.getIndicatorPanes();
    if (panes.length === 0) return;

    for (const pane of panes) {
      if (pane.fixedRange) continue;

      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;
      for (const plot of plots) {
        if (!plot.scriptId || !pane.indicatorIds?.includes(plot.scriptId) || plot.forceOverlay) continue;
        if (Number.isFinite(plot.histbase)) {
          min = Math.min(min, plot.histbase!);
          max = Math.max(max, plot.histbase!);
        }
        for (const value of plot.values) {
          if (typeof value !== 'number' || !Number.isFinite(value)) continue;
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      }

      if (!Number.isFinite(min) || !Number.isFinite(max)) continue;
      const range = max - min;
      const padding = range === 0 ? Math.max(Math.abs(max) * 0.05, 1) : range * 0.1;
      this._paneManager.updatePaneRange(pane.id, min - padding, max + padding);
    }
  }
}
