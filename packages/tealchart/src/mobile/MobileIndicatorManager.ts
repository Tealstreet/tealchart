/**
 * MobileIndicatorManager - Class-based indicator management (matches web pattern)
 *
 * This class mirrors web's TealchartWidget indicator management:
 * - Web: TealchartWidget uses TealscriptManager (WebWorker-based)
 * - Mobile: MobileIndicatorManager uses TealscriptEngine (sync, main thread)
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
  IndicatorDeclarationMetadata,
  InputDefinition,
  PlotOutput,
  Program,
  WorkerError,
} from '@tealstreet/tealscript';
import type { EventCallback } from '../events/EventEmitter';
import type { IndicatorInstance, PlotStyleOverride } from '../state/chartState';
import type { Bar, UnifiedPaneLayout } from '../types';

import { parse, TealscriptEngine, TealscriptParseError } from '@tealstreet/tealscript';
import { LogCategory, TealchartLogger } from '../debug/TealchartLogger';
import { EventEmitter } from '../events/EventEmitter';
import { type BuiltinIndicator } from '../indicators/builtinIndicators';
import { PaneManager } from '../rendering/PaneManager';

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
}

/**
 * Indicator pane info for rendering
 */
export interface IndicatorPaneInfo {
  name: string;
  overlay: boolean;
  yAxisRange?: { min: number; max: number };
  explicitPlotZOrder?: boolean;
  inputs?: Record<string, unknown>;
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

/**
 * One indicator's last execution, reusable while its script, inputs and bars
 * are all unchanged. Plots are stored already tagged with `scriptId`, so a
 * reused entry also keeps the PlotOutput identities React memoisation keys on.
 */
interface CachedIndicatorResult {
  ast: Program;
  barsEpoch: number;
  drawings: DrawingOutput[];
  inputsKey: string;
  plots: PlotOutput[];
}

let uncacheableInputsCounter = 0;

/** Order-independent, so a re-minted inputs object is not a false cache miss. */
function createIndicatorInputsKey(inputs: Record<string, unknown> | undefined): string {
  const entries = Object.entries(inputs ?? {});
  if (entries.length === 0) return '';
  try {
    return JSON.stringify(entries.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)));
  } catch {
    // Cyclic, BigInt or a throwing toJSON. A key that never matches costs this
    // indicator its cache; throwing here would kill every later bar tick.
    uncacheableInputsCounter += 1;
    return `uncacheable:${uncacheableInputsCounter}`;
  }
}

export type MobileIndicatorErrorCallback = (scriptId: string, error: WorkerError) => void;

const MOBILE_INDICATOR_ERROR_EVENT = 'indicator:error';

/**
 * MobileIndicatorManager - React-agnostic class for managing indicators
 *
 * Key differences from web's TealscriptManager:
 * - Synchronous execution on main thread (no WebWorkers)
 * - Simpler - no message passing or async coordination
 * - Suitable for mobile where we have fewer indicators
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
  private _resultCache: Map<string, CachedIndicatorResult> = new Map();
  private _barsEpoch = 0;
  private _plotsRevision = 0;
  private _indicatorsRevision = 0;

  constructor() {
    this._paneManager = new PaneManager();
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
    this._barsEpoch += 1;
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

    // Recompute plots with new indicator
    this._indicatorsRevision += 1;
    this._recomputePlots();

    return instanceId;
  }

  /**
   * Add a caller-provided Tealscript indicator.
   *
   * This mirrors the worker-backed web path for mobile, but executes
   * synchronously through TealscriptEngine so Skia can render the plots.
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
    this._resultCache.delete(instanceId);

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
        inputs: activeInd.inputs,
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
        message: error.message,
        line: error.location?.start.line,
        column: error.location?.start.column,
      };
    }

    return {
      type: 'parse',
      message: error instanceof Error ? error.message : String(error),
    };
  }

  private _toRuntimeError(error: unknown): WorkerError {
    return {
      type: 'runtime',
      message: error instanceof Error ? error.message : String(error),
    };
  }

  private _toExecutionError(error: { message: string; line?: number; column?: number }): WorkerError {
    return {
      type: 'runtime',
      message: error.message,
      line: error.line,
      column: error.column,
    };
  }

  private _emitError(instanceId: string, error: WorkerError): void {
    const key = `${error.type}:${error.line ?? ''}:${error.column ?? ''}:${error.message}`;
    if (this._lastErrorKeys.get(instanceId) === key) {
      return;
    }

    this._lastErrorKeys.set(instanceId, key);
    this._events.emit(MOBILE_INDICATOR_ERROR_EVENT, instanceId, error);
  }

  private _clearError(instanceId: string): void {
    this._lastErrorKeys.delete(instanceId);
  }

  /**
   * Recompute all indicator plots
   * Called when bars change or indicators are added/removed
   * @param silent - If true, don't trigger onUpdate callback (for RAF batching)
   */
  private _recomputePlots(silent = false): void {
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

      // Nothing this indicator's output depends on has moved, so re-running the
      // engine over every bar would only mint identical results. Hiding one
      // indicator or adding another must not re-execute the ones left alone.
      const inputsKey = createIndicatorInputsKey(inputs);
      const cached = this._resultCache.get(instanceId);
      if (cached && cached.ast === ast && cached.barsEpoch === this._barsEpoch && cached.inputsKey === inputsKey) {
        allPlots.push(...cached.plots);
        allDrawings.push(...cached.drawings);
        continue;
      }

      try {
        // Create a fresh engine for each execution
        const engine = new TealscriptEngine();

        // Convert inputs to Map
        const inputsMap = new Map<string, unknown>();
        if (inputs) {
          for (const [key, value] of Object.entries(inputs)) {
            inputsMap.set(key, value);
          }
        }

        // Execute the script
        const result = engine.execute(ast, this._bars, inputsMap);
        const firstError = result.errors[0];
        if (firstError) {
          this._emitError(instanceId, this._toExecutionError(firstError));
        } else {
          this._clearError(instanceId);
        }

        // Cache input definitions for settings modal
        if (result.inputs && result.inputs.length > 0) {
          this._inputDefsCache.set(instanceId, result.inputs as InputDefinition[]);
        }

        this._declarationCache.set(instanceId, result.declaration);
        if (ind.declaration?.explicitPlotZOrder !== result.declaration?.explicitPlotZOrder) {
          this._indicatorsRevision += 1;
        }
        ind.declaration = result.declaration;

        // Tag plots with the instance ID so renderer knows which pane to use
        const taggedPlots = result.plots.map((plot) => ({ ...plot, scriptId: instanceId }));
        const taggedDrawings = result.drawings.map((drawing) => ({ ...drawing, scriptId: instanceId }));
        this._resultCache.set(instanceId, {
          ast,
          barsEpoch: this._barsEpoch,
          drawings: taggedDrawings,
          inputsKey,
          plots: taggedPlots,
        });
        allPlots.push(...taggedPlots);
        allDrawings.push(...taggedDrawings);
      } catch (err) {
        this._logger.error(LogCategory.Indicators, 'Error executing indicator', {
          indicatorId: indicator.id,
          error: err,
        });
        this._emitError(instanceId, this._toRuntimeError(err));
      }
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
