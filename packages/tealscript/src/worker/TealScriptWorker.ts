/**
 * TealscriptWorker - Main Thread Wrapper
 *
 * Manages a Web Worker that executes Tealscript in isolation.
 * Provides a clean async API for the chart integration.
 */

import type { AlertOutput, Bar, DrawingOutput, PlotOutput, InputDefinition, LogOutput } from '../runtime/context';
import { getResultOutput } from './protocol';
import type {
  ToWorkerMessage,
  FromWorkerMessage,
  ResultMessage,
  ErrorMessage,
  ParseErrorMessage,
  WorkerOutputMetadata,
} from './protocol';

/**
 * Result from script execution
 */
export interface WorkerResult {
  plots: PlotOutput[];
  drawings: DrawingOutput[];
  alerts: AlertOutput[];
  logs: LogOutput[];
  inputs: InputDefinition[];
}

/**
 * Error from script execution
 */
export interface WorkerError {
  type: 'parse' | 'runtime';
  message: string;
  line?: number;
  column?: number;
}

/**
 * Callback for execution results
 */
export type ResultCallback = (result: WorkerResult) => void;

/**
 * Callback for execution errors
 */
export type ErrorCallback = (error: WorkerError) => void;

/**
 * Options for creating a TealscriptWorker
 */
export interface TealscriptWorkerOptions {
  /**
   * Called when execution completes successfully
   */
  onResult?: ResultCallback;

  /**
   * Called when an error occurs
   */
  onError?: ErrorCallback;

  /**
   * Called when the worker is ready
   */
  onReady?: () => void;
}

/**
 * TealscriptWorker manages a Web Worker for isolated Tealscript execution.
 *
 * Usage:
 * ```typescript
 * const worker = new TealscriptWorker({
 *   onResult: (result) => renderPlots(result.plots),
 *   onError: (error) => showError(error.message),
 * });
 *
 * await worker.init('my-script', scriptCode, bars, inputs);
 *
 * // Update on new tick
 * worker.updateBar(newBar);
 *
 * // Clean up
 * worker.dispose();
 * ```
 */
export class TealscriptWorker {
  private worker: Worker | null = null;
  private scriptId: string | null = null;
  private isReady = false;
  private readyPromise: Promise<void>;
  private readyResolve: (() => void) | null = null;
  private requestId = 0;
  private latestRequestId = 0;
  private lastSettledRequestId = 0;
  private generation = 0;

  private onResult: ResultCallback | null;
  private onError: ErrorCallback | null;
  private onReady: (() => void) | null;

  constructor(options: TealscriptWorkerOptions = {}) {
    this.onResult = options.onResult ?? null;
    this.onError = options.onError ?? null;
    this.onReady = options.onReady ?? null;

    // Create promise for ready state
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });

    // Create the worker
    this.createWorker();
  }

  /**
   * Create the Web Worker from blob URL
   */
  private createWorker(): void {
    // Get the worker code - this will be bundled separately
    // For now, we use a simple inline approach
    const workerUrl = this.getWorkerUrl();
    this.worker = new Worker(workerUrl, { type: 'module' });

    // Handle messages from worker
    this.worker.onmessage = (event: MessageEvent<FromWorkerMessage>) => {
      this.handleMessage(event.data);
    };

    // Handle worker errors
    this.worker.onerror = (event) => {
      console.error('Worker error:', event);
      this.onError?.({
        type: 'runtime',
        message: event.message || 'Unknown worker error',
      });
    };
  }

  /**
   * Get the URL for the worker script.
   * This should be overridden by the build system or chart integration.
   */
  protected getWorkerUrl(): string {
    // This is a placeholder - in production, the build system should
    // provide the actual bundled worker URL.
    //
    // Options for production:
    // 1. Vite: new URL('./worker.ts', import.meta.url)
    // 2. Webpack: new Worker(new URL('./worker.ts', import.meta.url))
    // 3. Manual: Pass URL in constructor options
    //
    // For now, throw an error indicating this needs to be configured
    throw new Error(
      'TealscriptWorker.getWorkerUrl() must be implemented. ' +
      'Use TealscriptWorkerFactory.create() or extend this class.'
    );
  }

  /**
   * Handle messages from the worker
   */
  private handleMessage(message: FromWorkerMessage): void {
    switch (message.type) {
      case 'ready':
        this.isReady = true;
        this.readyResolve?.();
        this.onReady?.();
        break;

      case 'result':
        this.handleResult(message);
        break;

      case 'error':
        this.handleError(message);
        break;

      case 'parseError':
        this.handleParseError(message);
        break;
    }
  }

  /**
   * Handle successful execution result
   */
  private handleResult(message: ResultMessage): void {
    if (this.isStaleMessage(message.output?.metadata)) {
      return;
    }
    this.markRequestSettled(message.output?.metadata);
    this.onResult?.(getResultOutput(message));
  }

  /**
   * Handle runtime error
   */
  private handleError(message: ErrorMessage): void {
    if (this.isStaleError(message.metadata)) {
      return;
    }
    this.onError?.({
      type: 'runtime',
      message: message.message,
      line: message.line,
      column: message.column,
    });
  }

  /**
   * Handle parse error
   */
  private handleParseError(message: ParseErrorMessage): void {
    if (this.isStaleError(message.metadata)) {
      return;
    }
    this.onError?.({
      type: 'parse',
      message: message.message,
      line: message.line,
      column: message.column,
    });
  }

  /**
   * Send a message to the worker
   */
  private postMessage(message: ToWorkerMessage): void {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }
    this.worker.postMessage(message);
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

  /**
   * Wait for worker to be ready
   */
  async waitForReady(): Promise<void> {
    return this.readyPromise;
  }

  /**
   * Initialize with a script and data
   */
  async init(
    scriptId: string,
    script: string,
    bars: Bar[],
    inputs: Record<string, unknown> = {}
  ): Promise<void> {
    await this.waitForReady();

    this.scriptId = scriptId;
    this.postMessage({
      type: 'init',
      scriptId,
      script,
      bars,
      inputs,
      metadata: this.nextRequestMetadata(true),
    });
  }

  /**
   * Replace all bars (e.g., symbol/timeframe change)
   */
  updateBars(bars: Bar[]): void {
    if (!this.scriptId) {
      throw new Error('Worker not initialized with script');
    }
    this.postMessage({
      type: 'updateBars',
      bars,
      metadata: this.nextRequestMetadata(true),
    });
  }

  /**
   * Update current bar (realtime tick)
   */
  updateBar(bar: Bar): void {
    if (!this.scriptId) {
      throw new Error('Worker not initialized with script');
    }
    this.postMessage({
      type: 'updateBar',
      bar,
      metadata: this.nextRequestMetadata(),
    });
  }

  /**
   * Update input values
   */
  setInputs(inputs: Record<string, unknown>): void {
    if (!this.scriptId) {
      throw new Error('Worker not initialized with script');
    }
    this.postMessage({
      type: 'setInputs',
      inputs,
      metadata: this.nextRequestMetadata(true),
    });
  }

  /**
   * Clean up worker resources
   */
  dispose(): void {
    if (this.worker) {
      this.postMessage({ type: 'dispose' });
      this.worker.terminate();
      this.worker = null;
    }
    this.scriptId = null;
    this.isReady = false;
  }

  /**
   * Check if worker is ready
   */
  get ready(): boolean {
    return this.isReady;
  }
}

/**
 * Factory for creating TealscriptWorker instances with proper bundling.
 *
 * This should be used by the chart integration to create workers
 * with the correct worker URL for the build system.
 */
export class TealscriptWorkerFactory {
  private workerUrl: string | URL;

  constructor(workerUrl: string | URL) {
    this.workerUrl = workerUrl;
  }

  /**
   * Create a new TealscriptWorker with the configured worker URL
   */
  create(options: TealscriptWorkerOptions = {}): TealscriptWorker {
    const url = this.workerUrl;

    // Create a subclass that provides the worker URL
    class ConfiguredWorker extends TealscriptWorker {
      protected getWorkerUrl(): string {
        return url instanceof URL ? url.href : url;
      }
    }

    return new ConfiguredWorker(options);
  }
}
