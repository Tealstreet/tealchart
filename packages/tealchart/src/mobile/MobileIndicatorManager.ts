// 📱 MOBILE-PATCHED FILE
// This file has been customized for mobile and will NOT be overwritten by yarn sync.
// Class-based indicator management matching web's React-agnostic pattern.

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
import type { InputDefinition, PlotOutput, Program, WorkerError } from '@tealstreet/tealscript';
import type { PlotStyleOverride } from '../state/chartState';
import type { Bar, UnifiedPaneLayout } from '../types';

import { parse, TealscriptEngine, TealscriptParseError } from '@tealstreet/tealscript';
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
  /** Current input values */
  inputs?: Record<string, unknown>;
  /** Parsed AST (cached for performance) */
  ast?: Program;
  /** Style overrides for plots */
  styleOverrides?: PlotStyleOverride[];
}

/**
 * Indicator pane info for rendering
 */
export interface IndicatorPaneInfo {
  name: string;
  overlay: boolean;
  yAxisRange?: { min: number; max: number };
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
  /** Display name shown in pane labels/settings. */
  name?: string;
  /** Whether the indicator renders on the main price pane. Defaults to false. */
  overlay?: boolean;
  /** Runtime input values. */
  inputs?: Record<string, unknown>;
  /** Fixed Y range for oscillator-style panes. */
  yAxisRange?: { min: number; max: number };
}

export type MobileIndicatorErrorCallback = (scriptId: string, error: WorkerError) => void;

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
  private _astCache: Map<string, Program> = new Map();
  private _inputDefsCache: Map<string, InputDefinition[]> = new Map();
  private _bars: Bar[] = [];
  private _onUpdate: (() => void) | null = null;
  private _onError: MobileIndicatorErrorCallback | null = null;
  private _lastErrorKeys: Map<string, string> = new Map();
  private _instanceCounter = 0;

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

  /**
   * Subscribe to parse/runtime errors from custom or built-in indicators.
   */
  setOnError(callback: MobileIndicatorErrorCallback | null): void {
    this._onError = callback;
  }

  /**
   * Update bar data and recompute all indicator plots
   * Call this when new bar data arrives
   * @param silent - If true, don't trigger onUpdate callback (use when batching with RAF)
   */
  setBars(bars: Bar[], silent = false): void {
    this._bars = bars;
    this._recomputePlots(silent);
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
      console.error('[MobileIndicatorManager] Failed to parse indicator code:', indicator.id, err);
      this._emitError(instanceId, this._toParseError(err));
    }

    // Add to indicators list
    this._indicators.push({
      instanceId,
      indicator,
      inputs,
      ast,
    });

    // Recompute plots with new indicator
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
      inputs: options.inputs,
      ast,
    });

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
    this._astCache.delete(instanceId);
    this._lastErrorKeys.delete(instanceId);

    // Recompute plots without this indicator
    this._recomputePlots();
  }

  /**
   * Update inputs for an indicator
   */
  updateInputs(instanceId: string, inputs: Record<string, unknown>): void {
    const indicator = this._indicators.find((ind) => ind.instanceId === instanceId);
    if (indicator) {
      indicator.inputs = inputs;
      this._recomputePlots();
    }
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
   * Get computed plot outputs from all indicators
   */
  getPlots(): PlotOutput[] {
    return this._plots;
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
   * Update style overrides for an indicator
   */
  updateStyleOverrides(instanceId: string, styleOverrides?: PlotStyleOverride[]): void {
    const indicator = this._indicators.find((ind) => ind.instanceId === instanceId);
    if (indicator) {
      indicator.styleOverrides = styleOverrides;
      this._onUpdate?.();
    }
  }

  /**
   * Get the underlying PaneManager (for advanced use cases)
   */
  getPaneManager(): PaneManager {
    return this._paneManager;
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
    this._onError?.(instanceId, error);
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
      this._plots = [];
      if (!silent) this._onUpdate?.();
      return;
    }

    const allPlots: PlotOutput[] = [];

    for (const ind of this._indicators) {
      const { indicator, instanceId, ast, inputs } = ind;

      if (!ast) {
        // Silently skip - no need to log for every bar update
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

        // Tag plots with the instance ID so renderer knows which pane to use
        for (const plot of result.plots) {
          allPlots.push({
            ...plot,
            scriptId: instanceId,
          });
        }
      } catch (err) {
        console.error('[MobileIndicatorManager] Error executing indicator:', indicator.id, err);
        this._emitError(instanceId, this._toRuntimeError(err));
      }
    }

    this._plots = allPlots;

    // Notify React to re-render (unless silent mode for RAF batching)
    if (!silent) this._onUpdate?.();
  }
}
