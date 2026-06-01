/**
 * TealscriptManager - Coordinates Tealscript execution via Web Workers
 *
 * This class manages the lifecycle of Tealscript workers and provides
 * an interface for the chart to push bar data and receive plot outputs.
 */

import { getResultOutput } from '@tealstreet/tealscript';
import type {
  TealscriptWorker,
  TealscriptWorkerOptions,
  WorkerResult,
  WorkerError,
  PlotOutput,
  DrawingOutput,
  InputDefinition,
  IndicatorDeclarationMetadata,
  Bar,
  FromWorkerMessage,
  WorkerOutputMetadata,
} from '@tealstreet/tealscript';

/**
 * Managed script state
 */
interface ManagedScript {
  id: string;
  code: string;
  worker: TealscriptWorker;
  workerGeneration: number;
  plots: PlotOutput[];
  drawings: DrawingOutput[];
  inputs: InputDefinition[];
  declaration?: IndicatorDeclarationMetadata;
  inputValues: Record<string, unknown>;
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
   * Called when any script produces new drawing outputs
   */
  onDrawingsUpdated?: (drawings: DrawingOutput[]) => void;

  /**
   * Called when a script encounters an error
   */
  onError?: (scriptId: string, error: WorkerError) => void;

  /**
   * Called when a script's input definitions are available
   */
  onInputsDiscovered?: (scriptId: string, inputs: InputDefinition[]) => void;

  /**
   * Called when a script's indicator declaration metadata is available
   */
  onDeclarationDiscovered?: (scriptId: string, declaration: IndicatorDeclarationMetadata) => void;
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
  private requestId = 0;
  private latestRequestId = 0;
  private lastSettledRequestId = 0;
  private generation = 0;

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

  private handleMessage(message: FromWorkerMessage): void {
    switch (message.type) {
      case 'ready':
        this.isReady = true;
        this.readyResolve?.();
        this.options.onReady?.();
        break;

      case 'result':
        if (this.isStaleMessage(message.output?.metadata)) {
          return;
        }
        this.markRequestSettled(message.output?.metadata);
        this.options.onResult?.(getResultOutput(message));
        break;

      case 'error':
      case 'parseError':
      case 'semanticError': {
        if (this.isStaleError(message.metadata)) {
          return;
        }
        const type = this.toWorkerErrorType(message.type);
        this.options.onError?.({
          type,
          message: message.message as string,
          line: message.line as number | undefined,
          column: message.column as number | undefined,
          diagnostics: message.type === 'semanticError' ? message.diagnostics : undefined,
        });
        break;
      }
    }
  }

  private toWorkerErrorType(messageType: 'error' | 'parseError' | 'semanticError'): WorkerError['type'] {
    if (messageType === 'parseError') return 'parse';
    if (messageType === 'semanticError') return 'semantic';
    return 'runtime';
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
      metadata: this.nextRequestMetadata(true),
    });
  }

  updateBars(bars: Bar[]): void {
    this.worker.postMessage({ type: 'updateBars', bars, metadata: this.nextRequestMetadata(true) });
  }

  updateBar(bar: Bar): void {
    this.worker.postMessage({ type: 'updateBar', bar, metadata: this.nextRequestMetadata() });
  }

  setInputs(inputs: Record<string, unknown>): void {
    this.worker.postMessage({ type: 'setInputs', inputs, metadata: this.nextRequestMetadata(true) });
  }

  dispose(): void {
    this.worker.postMessage({ type: 'dispose' });
    this.worker.terminate();
  }

  get ready(): boolean {
    return this.isReady;
  }

  private nextRequestMetadata(newGeneration = false): WorkerOutputMetadata {
    if (newGeneration) {
      this.generation += 1;
    }
    this.latestRequestId = ++this.requestId;
    return {
      generation: this.generation,
      requestId: this.latestRequestId,
    };
  }

  private isStaleMessage(metadata: WorkerOutputMetadata | undefined): boolean {
    return typeof metadata?.requestId === 'number' && metadata.requestId < this.latestRequestId;
  }

  private isStaleError(metadata: WorkerOutputMetadata | undefined): boolean {
    return typeof metadata?.requestId === 'number' && metadata.requestId <= this.lastSettledRequestId;
  }

  private markRequestSettled(metadata: WorkerOutputMetadata | undefined): void {
    if (typeof metadata?.requestId === 'number') {
      this.lastSettledRequestId = Math.max(this.lastSettledRequestId, metadata.requestId);
    }
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
  private nextWorkerGeneration = 0;

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

    const workerGeneration = ++this.nextWorkerGeneration;
    const worker = this.createScriptWorker(scriptId, workerGeneration);

    // Store managed script state
    const managedScript: ManagedScript = {
      id: scriptId,
      code,
      worker: worker as unknown as TealscriptWorker,
      workerGeneration,
      plots: [],
      drawings: [],
      inputs: [],
      inputValues: { ...inputs },
      isReady: false,
      isVisible: true,
    };
    this.scripts.set(scriptId, managedScript);

    // Initialize worker with the latest bars and inputs once the worker is ready.
    await this.initializeCurrentWorker(scriptId, workerGeneration);
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
      this.notifyDrawingsUpdated();
    }
  }

  /**
   * Update bars for all scripts (e.g., on symbol/timeframe change)
   */
  setBars(bars: Bar[]): void {
    this.bars = bars;

    // Restart all workers so expensive stale full recalculations are cancelled.
    for (const script of this.scripts.values()) {
      if (script.isReady) {
        this.restartScriptWorker(script);
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
    if (script) {
      script.inputValues = { ...inputs };
      if (script.isReady) {
        this.restartScriptWorker(script);
      }
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
   * Get all drawing outputs from all visible scripts
   */
  getAllDrawings(): DrawingOutput[] {
    const allDrawings: DrawingOutput[] = [];
    for (const script of this.scripts.values()) {
      if (script.isVisible) {
        // Tag each drawing with its script ID for downstream routing.
        for (const drawing of script.drawings) {
          allDrawings.push({ ...drawing, scriptId: script.id });
        }
      }
    }
    return allDrawings;
  }

  /**
   * Get drawings for a specific script
   */
  getDrawings(scriptId: string): DrawingOutput[] {
    const script = this.scripts.get(scriptId);
    return script?.drawings ?? [];
  }

  /**
   * Set visibility for a script
   */
  setScriptVisibility(scriptId: string, isVisible: boolean): void {
    const script = this.scripts.get(scriptId);
    if (script) {
      script.isVisible = isVisible;
      // Notify listeners that visual outputs have changed
      this.notifyPlotsUpdated();
      this.notifyDrawingsUpdated();
    }
  }

  /**
   * Toggle visibility for a script
   */
  toggleScriptVisibility(scriptId: string): void {
    const script = this.scripts.get(scriptId);
    if (script) {
      script.isVisible = !script.isVisible;
      // Notify listeners that visual outputs have changed
      this.notifyPlotsUpdated();
      this.notifyDrawingsUpdated();
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
   * Get indicator declaration metadata for a specific script
   */
  getDeclaration(scriptId: string): IndicatorDeclarationMetadata | undefined {
    return this.scripts.get(scriptId)?.declaration;
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
    this.notifyPlotsUpdated();
    this.notifyDrawingsUpdated();
  }

  // =========================================================================
  // Private handlers
  // =========================================================================

  private createScriptWorker(scriptId: string, workerGeneration: number): TealscriptWorker {
    const rawWorker = this.options.createWorker();
    return new TealscriptWorkerWrapper(rawWorker, {
      onResult: (result) => this.handleResult(scriptId, workerGeneration, result),
      onError: (error) => this.handleError(scriptId, workerGeneration, error),
      onReady: () => this.handleReady(scriptId, workerGeneration),
    }) as unknown as TealscriptWorker;
  }

  private restartScriptWorker(script: ManagedScript): void {
    script.worker.dispose();
    const workerGeneration = ++this.nextWorkerGeneration;
    script.workerGeneration = workerGeneration;
    script.worker = this.createScriptWorker(script.id, workerGeneration);
    script.isReady = false;

    void this.initializeCurrentWorker(script.id, workerGeneration).catch((error: unknown) => {
      this.handleError(script.id, workerGeneration, {
        type: 'runtime',
        message: error instanceof Error ? error.message : String(error),
      });
    });
  }

  private async initializeCurrentWorker(scriptId: string, workerGeneration: number): Promise<void> {
    const script = this.getCurrentScript(scriptId, workerGeneration);
    if (!script) return;

    await script.worker.waitForReady();

    const currentScript = this.getCurrentScript(scriptId, workerGeneration);
    if (!currentScript) return;

    await currentScript.worker.init(
      currentScript.id,
      currentScript.code,
      this.bars,
      currentScript.inputValues,
    );
  }

  private getCurrentScript(scriptId: string, workerGeneration: number): ManagedScript | undefined {
    const script = this.scripts.get(scriptId);
    if (!script || script.workerGeneration !== workerGeneration) return undefined;
    return script;
  }

  private handleResult(scriptId: string, workerGeneration: number, result: WorkerResult): void {
    const script = this.getCurrentScript(scriptId, workerGeneration);
    if (!script) return;

    // Clear any previous error
    script.error = undefined;

    // Update visual outputs
    script.plots = result.plots;
    script.drawings = result.drawings;

    // Update input definitions if changed
    if (JSON.stringify(script.inputs) !== JSON.stringify(result.inputs)) {
      script.inputs = result.inputs;
      this.options.onInputsDiscovered?.(scriptId, result.inputs);
    }

    if (result.declaration && JSON.stringify(script.declaration) !== JSON.stringify(result.declaration)) {
      script.declaration = result.declaration;
      this.options.onDeclarationDiscovered?.(scriptId, result.declaration);
    }

    // Notify listeners
    this.notifyPlotsUpdated();
    this.notifyDrawingsUpdated();
  }

  private handleError(scriptId: string, workerGeneration: number, error: WorkerError): void {
    const script = this.getCurrentScript(scriptId, workerGeneration);
    if (!script) return;

    script.error = error;
    script.plots = []; // Clear plots on error
    script.drawings = []; // Clear drawings on error

    this.options.onError?.(scriptId, error);
    this.notifyPlotsUpdated();
    this.notifyDrawingsUpdated();
  }

  private handleReady(scriptId: string, workerGeneration: number): void {
    const script = this.getCurrentScript(scriptId, workerGeneration);
    if (script) {
      script.isReady = true;
    }
  }

  private notifyPlotsUpdated(): void {
    this.options.onPlotsUpdated?.(this.getAllPlots());
  }

  private notifyDrawingsUpdated(): void {
    this.options.onDrawingsUpdated?.(this.getAllDrawings());
  }
}
