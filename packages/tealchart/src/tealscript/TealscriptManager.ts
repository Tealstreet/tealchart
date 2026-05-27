/**
 * TealscriptManager - Coordinates Tealscript execution via Web Workers
 *
 * This class manages the lifecycle of Tealscript workers and provides
 * an interface for the chart to push bar data and receive plot outputs.
 */

import type {
  TealscriptWorker,
  TealscriptWorkerOptions,
  WorkerResult,
  WorkerError,
  PlotOutput,
  InputDefinition,
  Bar,
} from '@tealstreet/tealscript';

/**
 * Managed script state
 */
interface ManagedScript {
  id: string;
  code: string;
  worker: TealscriptWorker;
  plots: PlotOutput[];
  inputs: InputDefinition[];
  isReady: boolean;
  isVisible: boolean;
  error?: WorkerError;
}

/**
 * Options for TealscriptManager
 */
export interface TealscriptManagerOptions {
  /**
   * Factory function to create a Web Worker.
   * This must be defined in the consuming app so the bundler can see and process it.
   *
   * For Vite/Turbopack:
   * ```typescript
   * createWorker: () => new Worker(
   *   new URL('@tealstreet/tealscript/src/worker/worker.ts', import.meta.url),
   *   { type: 'module' }
   * )
   * ```
   */
  createWorker: () => Worker;

  /**
   * Called when any script produces new plot outputs
   */
  onPlotsUpdated?: (plots: PlotOutput[]) => void;

  /**
   * Called when a script encounters an error
   */
  onError?: (scriptId: string, error: WorkerError) => void;

  /**
   * Called when a script's input definitions are available
   */
  onInputsDiscovered?: (scriptId: string, inputs: InputDefinition[]) => void;
}

/**
 * Lightweight wrapper around a raw Worker that provides the TealscriptWorker interface.
 */
class TealscriptWorkerWrapper {
  private worker: Worker;
  private scriptId: string | null = null;
  private isReady = false;
  private readyPromise: Promise<void>;
  private readyResolve: (() => void) | null = null;
  private options: TealscriptWorkerOptions;

  constructor(worker: Worker, options: TealscriptWorkerOptions) {
    this.worker = worker;
    this.options = options;

    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });

    // Set up message handler
    this.worker.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.worker.onerror = (event) => {
      console.error('Worker error:', event);
      this.options.onError?.({
        type: 'runtime',
        message: event.message || 'Unknown worker error',
      });
    };
  }

  private handleMessage(message: { type: string; [key: string]: unknown }): void {
    switch (message.type) {
      case 'ready':
        this.isReady = true;
        this.readyResolve?.();
        this.options.onReady?.();
        break;

      case 'result':
        this.options.onResult?.({
          plots: message.plots as PlotOutput[],
          inputs: message.inputs as InputDefinition[],
        });
        break;

      case 'error':
      case 'parseError':
        this.options.onError?.({
          type: message.type === 'parseError' ? 'parse' : 'runtime',
          message: message.message as string,
          line: message.line as number | undefined,
          column: message.column as number | undefined,
        });
        break;
    }
  }

  async waitForReady(): Promise<void> {
    return this.readyPromise;
  }

  async init(
    scriptId: string,
    script: string,
    bars: Bar[],
    inputs: Record<string, unknown> = {}
  ): Promise<void> {
    await this.waitForReady();
    this.scriptId = scriptId;
    this.worker.postMessage({
      type: 'init',
      scriptId,
      script,
      bars,
      inputs,
    });
  }

  updateBars(bars: Bar[]): void {
    this.worker.postMessage({ type: 'updateBars', bars });
  }

  updateBar(bar: Bar): void {
    this.worker.postMessage({ type: 'updateBar', bar });
  }

  setInputs(inputs: Record<string, unknown>): void {
    this.worker.postMessage({ type: 'setInputs', inputs });
  }

  dispose(): void {
    this.worker.postMessage({ type: 'dispose' });
    this.worker.terminate();
  }

  get ready(): boolean {
    return this.isReady;
  }
}

/**
 * TealscriptManager coordinates multiple Tealscript workers.
 *
 * Usage:
 * ```typescript
 * const manager = new TealscriptManager({
 *   createWorker: () => new Worker(
 *     new URL('@tealstreet/tealscript/src/worker/worker.ts', import.meta.url),
 *     { type: 'module' }
 *   ),
 *   onPlotsUpdated: (plots) => renderer.setPlots(plots),
 * });
 *
 * await manager.addScript('sma', '//@version=6\nindicator("SMA")\nplot(ta.sma(close, 14))');
 * manager.setBars(bars);
 * ```
 */
export class TealscriptManager {
  private scripts: Map<string, ManagedScript> = new Map();
  private bars: Bar[] = [];
  private options: TealscriptManagerOptions;

  constructor(options: TealscriptManagerOptions) {
    this.options = options;
  }

  /**
   * Add a new Tealscript to the manager
   */
  async addScript(
    scriptId: string,
    code: string,
    inputs: Record<string, unknown> = {}
  ): Promise<void> {
    // Remove existing script with same ID if present
    if (this.scripts.has(scriptId)) {
      this.removeScript(scriptId);
    }

    // Create a new worker using the factory
    const rawWorker = this.options.createWorker();

    // Create wrapper with callbacks
    const worker = new TealscriptWorkerWrapper(rawWorker, {
      onResult: (result) => this.handleResult(scriptId, result),
      onError: (error) => this.handleError(scriptId, error),
      onReady: () => this.handleReady(scriptId),
    });

    // Store managed script state
    const managedScript: ManagedScript = {
      id: scriptId,
      code,
      worker: worker as unknown as TealscriptWorker,
      plots: [],
      inputs: [],
      isReady: false,
      isVisible: true,
    };
    this.scripts.set(scriptId, managedScript);

    // Initialize worker with script and current bars
    await worker.init(scriptId, code, this.bars, inputs);
  }

  /**
   * Remove a script from the manager
   */
  removeScript(scriptId: string): void {
    const script = this.scripts.get(scriptId);
    if (script) {
      script.worker.dispose();
      this.scripts.delete(scriptId);
      this.notifyPlotsUpdated();
    }
  }

  /**
   * Update bars for all scripts (e.g., on symbol/timeframe change)
   */
  setBars(bars: Bar[]): void {
    this.bars = bars;

    // Update all workers
    for (const script of this.scripts.values()) {
      if (script.isReady) {
        script.worker.updateBars(bars);
      }
    }
  }

  /**
   * Update a single bar (realtime tick)
   */
  updateBar(bar: Bar): void {
    // Update local bar array
    if (this.bars.length === 0) {
      this.bars.push(bar);
    } else {
      const lastBar = this.bars[this.bars.length - 1];
      if (bar.time === lastBar.time) {
        // Update existing bar
        this.bars[this.bars.length - 1] = bar;
      } else if (bar.time > lastBar.time) {
        // New bar
        this.bars.push(bar);
      }
    }

    // Notify all workers
    for (const script of this.scripts.values()) {
      if (script.isReady) {
        script.worker.updateBar(bar);
      }
    }
  }

  /**
   * Set input values for a specific script
   */
  setInputs(scriptId: string, inputs: Record<string, unknown>): void {
    const script = this.scripts.get(scriptId);
    if (script && script.isReady) {
      script.worker.setInputs(inputs);
    }
  }

  /**
   * Get all plot outputs from all visible scripts
   */
  getAllPlots(): PlotOutput[] {
    const allPlots: PlotOutput[] = [];
    for (const script of this.scripts.values()) {
      if (script.isVisible) {
        // Tag each plot with its script ID for pane routing
        for (const plot of script.plots) {
          allPlots.push({ ...plot, scriptId: script.id });
        }
      }
    }
    return allPlots;
  }

  /**
   * Get plots for a specific script
   */
  getPlots(scriptId: string): PlotOutput[] {
    const script = this.scripts.get(scriptId);
    return script?.plots ?? [];
  }

  /**
   * Set visibility for a script
   */
  setScriptVisibility(scriptId: string, isVisible: boolean): void {
    const script = this.scripts.get(scriptId);
    if (script) {
      script.isVisible = isVisible;
      // Notify listeners that plots have changed
      this.options.onPlotsUpdated?.(this.getAllPlots());
    }
  }

  /**
   * Toggle visibility for a script
   */
  toggleScriptVisibility(scriptId: string): void {
    const script = this.scripts.get(scriptId);
    if (script) {
      script.isVisible = !script.isVisible;
      // Notify listeners that plots have changed
      this.options.onPlotsUpdated?.(this.getAllPlots());
    }
  }

  /**
   * Get input definitions for a specific script
   */
  getInputDefinitions(scriptId: string): InputDefinition[] {
    const script = this.scripts.get(scriptId);
    return script?.inputs ?? [];
  }

  /**
   * Get all managed script IDs
   */
  getScriptIds(): string[] {
    return Array.from(this.scripts.keys());
  }

  /**
   * Get error for a script (if any)
   */
  getError(scriptId: string): WorkerError | undefined {
    return this.scripts.get(scriptId)?.error;
  }

  /**
   * Check if a script is ready
   */
  isScriptReady(scriptId: string): boolean {
    return this.scripts.get(scriptId)?.isReady ?? false;
  }

  /**
   * Dispose all workers and clean up
   */
  dispose(): void {
    for (const script of this.scripts.values()) {
      script.worker.dispose();
    }
    this.scripts.clear();
    this.bars = [];
  }

  // =========================================================================
  // Private handlers
  // =========================================================================

  private handleResult(scriptId: string, result: WorkerResult): void {
    const script = this.scripts.get(scriptId);
    if (!script) return;

    // Clear any previous error
    script.error = undefined;

    // Update plots
    script.plots = result.plots;

    // Update input definitions if changed
    if (JSON.stringify(script.inputs) !== JSON.stringify(result.inputs)) {
      script.inputs = result.inputs;
      this.options.onInputsDiscovered?.(scriptId, result.inputs);
    }

    // Notify listeners
    this.notifyPlotsUpdated();
  }

  private handleError(scriptId: string, error: WorkerError): void {
    const script = this.scripts.get(scriptId);
    if (!script) return;

    script.error = error;
    script.plots = []; // Clear plots on error

    this.options.onError?.(scriptId, error);
    this.notifyPlotsUpdated();
  }

  private handleReady(scriptId: string): void {
    const script = this.scripts.get(scriptId);
    if (script) {
      script.isReady = true;
    }
  }

  private notifyPlotsUpdated(): void {
    this.options.onPlotsUpdated?.(this.getAllPlots());
  }
}
