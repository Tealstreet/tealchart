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
  TealscriptRuntimeOptions,
  Program,
  Bar,
  FromWorkerMessage,
  ToWorkerMessage,
  WorkerOutputMetadata,
} from '@tealstreet/tealscript';
import type { TealscriptExecutionTelemetry, TealscriptRequestDataResolver } from '../types';
import { isTealchartPlotDebugEnabled, summarizePlotsForDebug } from '../debug/plotDebug';
import { preserveLongerCurrentPlotSeries } from './plotSeriesFreshness';

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
  reportedRuntimeProfileDiagnostics: Set<string>;
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
   * Called with a compact execution summary after every accepted worker
   * execution result or runtime halt.
   */
  onExecution?: (summary: TealscriptExecutionTelemetry) => void;

  /**
   * Called when a script's input definitions are available
   */
  onInputsDiscovered?: (scriptId: string, inputs: InputDefinition[]) => void;

  /**
   * Called when a script's indicator declaration metadata is available
   */
  onDeclarationDiscovered?: (scriptId: string, declaration: IndicatorDeclarationMetadata) => void;

  /**
   * Provides the current chart runtime context for newly initialized scripts.
   */
  getRuntimeOptions?: () => TealscriptRuntimeOptions;

  /**
   * Provides host-registered Pine library ASTs for newly initialized scripts.
   */
  getLibraries?: () => Map<string, Program>;

  /**
   * Resolves serializable request.* data misses emitted by worker execution.
   */
  resolveRequestData?: TealscriptRequestDataResolver;
}

type RequestDataMessage = Extract<FromWorkerMessage, { type: 'requestData' }>;
type RequestDataResultMessage = Extract<ToWorkerMessage, { type: 'requestDataResult' }>;
type RequestDataFailure = Extract<RequestDataResultMessage, { ok: false }>['error'];
const REQUEST_DATA_UNAVAILABLE_ERROR_CODE = 'request-data-unavailable' as const;
const REALTIME_COMPILED_FALLBACK_ERROR_CODE = 'realtime-compiled-fallback' as const;
const REALTIME_STATELESS_FALLBACK_PREFIX = 'compiled-worker-stateless-intrabar-reentry';

interface TealscriptWorkerWrapperOptions extends TealscriptWorkerOptions {
  resolveRequestData?: TealscriptRequestDataResolver;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function formatValue(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

function describeRequestDataQuery(message: RequestDataMessage): string {
  const query = message.query;
  if (!isRecord(query)) return `request.${message.kind}`;

  switch (message.kind) {
    case 'bars': {
      const symbol = formatValue(query.symbol) ?? 'unknown symbol';
      const timeframe = formatValue(query.timeframe) ?? 'unknown timeframe';
      return `request.security symbol ${symbol} timeframe ${timeframe}`;
    }
    case 'currency_rate': {
      const base = formatValue(query.baseCurrency) ?? 'unknown';
      const quote = formatValue(query.quoteCurrency) ?? 'unknown';
      return `request.currency_rate ${base}/${quote}`;
    }
    case 'economic': {
      const country = formatValue(query.countryCode) ?? 'unknown country';
      const field = formatValue(query.field) ?? 'unknown field';
      return `request.economic ${country}.${field}`;
    }
    case 'financial': {
      const symbol = formatValue(query.symbol) ?? 'unknown symbol';
      const metric = formatValue(query.financialId) ?? 'unknown field';
      const period = formatValue(query.period) ?? 'unknown period';
      const currency = formatValue(query.currency);
      return `request.financial ${symbol}.${metric} period ${period}${currency ? ` currency ${currency}` : ''}`;
    }
    case 'corporate_action': {
      const action = formatValue(query.kind) ?? 'corporate_action';
      const ticker = formatValue(query.ticker) ?? 'unknown ticker';
      const currency = formatValue(query.currency);
      return `request.${action} ${ticker}${currency ? ` currency ${currency}` : ''}`;
    }
    case 'quandl': {
      const ticker = formatValue(query.ticker) ?? 'unknown ticker';
      const column = formatValue(query.column) ?? 'unknown column';
      return `request.quandl ${ticker} column ${column}`;
    }
    case 'footprint': {
      const symbol = formatValue(query.symbol) ?? 'unknown symbol';
      const timeframe = formatValue(query.timeframe) ?? 'unknown timeframe';
      return `request.footprint ${symbol} timeframe ${timeframe}`;
    }
    case 'series': {
      const family = formatValue(query.family) ?? 'series';
      const key = formatValue(query.key) ?? 'unknown key';
      return `request.${family} ${key}`;
    }
  }
}

function classifyRequestDataFailure(error: RequestDataFailure): string {
  switch (error.code) {
    case 'missing-provider':
      return 'not supported in this chart because no Tealscript request data resolver is configured';
    case 'not-found':
      return 'not seeded by the chart provider';
    case 'timeout':
      return 'unavailable because the chart provider timed out';
    case 'provider-error':
      return 'unavailable because the chart provider failed while loading it';
    case 'invalid-query':
      return 'unavailable because the request query is invalid for this provider';
  }
}

function formatRequestDataDiagnostic(message: RequestDataMessage, error: RequestDataFailure): WorkerError {
  const queryDescription = describeRequestDataQuery(message);
  return {
    type: 'runtime',
    severity: 'warning',
    code: REQUEST_DATA_UNAVAILABLE_ERROR_CODE,
    message:
      `Tealscript request data unavailable for ${queryDescription}: ${classifyRequestDataFailure(error)}. ` +
      `The script is valid, but Tealstreet cannot supply that data here. Provider detail: ${error.message}`,
  };
}

function formatRealtimeCompiledFallbackDiagnostic(result: WorkerResult): WorkerError | undefined {
  const profile = result.profile;
  const reason = profile?.fallbackReason;
  if (!profile || !reason?.startsWith(REALTIME_STATELESS_FALLBACK_PREFIX)) return undefined;

  const diagnostics = profile.fallbackDiagnostics ?? [];
  const primary = diagnostics[0];
  const location = primary?.line === undefined
    ? ''
    : ` at line ${primary.line}${primary.column === undefined ? '' : `, column ${primary.column}`}`;
  const trigger = primary ? `${primary.construct}${location}` : reason;
  const additional = diagnostics.length > 1
    ? ` ${diagnostics.length - 1} more realtime stateful construct(s) also contributed.`
    : '';

  return {
    type: 'runtime',
    severity: 'warning',
    code: REALTIME_COMPILED_FALLBACK_ERROR_CODE,
    line: primary?.line,
    column: primary?.column,
    message:
      `Tealscript is using the interpreter for realtime updates so this script's output stays correct; live ticks can be slower. ` +
      `Trigger: ${trigger}. ${primary?.message ?? 'The compiled worker cannot prove this intrabar state shape is safe.'}${additional} ` +
      `To keep compiled realtime execution, remove or rewrite that stateful intrabar construct. Fallback reason: ${reason}`,
  };
}

function classifyFallbackKind(profile: WorkerResult['profile'] | WorkerError['profile']): TealscriptExecutionTelemetry['fallbackKind'] {
  const reason = profile?.fallbackReason;
  if (!reason) return 'none';
  if (reason.startsWith(REALTIME_STATELESS_FALLBACK_PREFIX)) return 'realtime-safety';
  if (reason.startsWith('unpreloadable-request-data')) return 'request-data';
  return 'other';
}

function summarizeResultExecution(
  scriptId: string,
  result: WorkerResult,
  effectivePlots: number,
  effectiveDrawings: number,
): TealscriptExecutionTelemetry {
  const sideEffects = result.alerts.length + result.logs.length;
  const visualOutputs = effectivePlots + effectiveDrawings;
  const outputKind: TealscriptExecutionTelemetry['outputKind'] = visualOutputs > 0
    ? 'visual'
    : sideEffects > 0
      ? 'side-effect'
      : 'empty';

  return {
    scriptId,
    status: outputKind === 'empty' ? 'empty-output' : 'ok',
    outputKind,
    executionMode: result.profile?.executionMode,
    selectedBackend: result.profile?.selectedBackend,
    backendSelectionSource: result.profile?.backendSelectionSource,
    fallbackKind: classifyFallbackKind(result.profile),
    elapsedMs: result.profile?.elapsedMs,
    bars: result.profile?.bars,
    requestKind: result.metadata?.requestKind,
    generation: result.metadata?.generation,
    plots: effectivePlots,
    drawings: effectiveDrawings,
    alerts: result.alerts.length,
    logs: result.logs.length,
    runtimeErrors: result.profile?.errors ?? 0,
  };
}

function summarizeRuntimeErrorExecution(scriptId: string, error: WorkerError): TealscriptExecutionTelemetry {
  return {
    scriptId,
    status: 'runtime-error',
    outputKind: 'empty',
    executionMode: error.profile?.executionMode,
    selectedBackend: error.profile?.selectedBackend,
    backendSelectionSource: error.profile?.backendSelectionSource,
    fallbackKind: error.code === 'runtime.error' ? 'runtime-error' : classifyFallbackKind(error.profile),
    elapsedMs: error.profile?.elapsedMs,
    bars: error.profile?.bars,
    plots: 0,
    drawings: 0,
    alerts: 0,
    logs: 0,
    runtimeErrors: error.profile?.errors ?? 1,
  };
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
  private options: TealscriptWorkerWrapperOptions;
  private requestId = 0;
  private latestRequestId = 0;
  private latestFullRequestId = 0;
  private lastSettledRequestId = 0;
  private generation = 0;
  private reportedRequestDataFailures = new Set<string>();

  constructor(worker: Worker, options: TealscriptWorkerWrapperOptions) {
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
        severity: 'error',
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

      case 'requestData':
        void this.handleRequestData(message);
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
          severity: 'error',
          message: message.message as string,
          line: message.line as number | undefined,
          column: message.column as number | undefined,
          ...(message.type === 'error' && message.code ? { code: message.code } : {}),
          ...(message.type === 'error' && message.runtimeError ? { runtimeError: message.runtimeError } : {}),
          ...(message.type === 'error' && message.profile ? { profile: message.profile } : {}),
          diagnostics: message.type === 'semanticError' ? message.diagnostics : undefined,
        });
        break;
      }
    }
  }

  private async handleRequestData(message: RequestDataMessage): Promise<void> {
    const payload = this.options.resolveRequestData
      ? await this.resolveRequestData(message)
      : {
        ok: false as const,
        error: {
          code: 'missing-provider' as const,
          message: 'No Tealscript request data resolver configured',
        },
      };

    if (this.scriptId !== message.scriptId) return;

    const response: RequestDataResultMessage = payload.ok
      ? {
        type: 'requestDataResult',
        scriptId: message.scriptId,
        requestId: message.requestId,
        generation: message.generation,
        kind: message.kind,
        ok: true,
        value: payload.value,
      }
      : {
        type: 'requestDataResult',
        scriptId: message.scriptId,
        requestId: message.requestId,
        generation: message.generation,
        kind: message.kind,
        ok: false,
        error: payload.error,
      };

    if (!payload.ok && this.shouldReportRequestDataFailure(message, payload.error)) {
      this.options.onError?.(formatRequestDataDiagnostic(message, payload.error));
    }

    this.worker.postMessage(response);
  }

  private async resolveRequestData(message: RequestDataMessage) {
    try {
      return await this.options.resolveRequestData!(message);
    } catch (error) {
      return {
        ok: false as const,
        error: {
          code: 'provider-error' as const,
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  private shouldReportRequestDataFailure(message: RequestDataMessage, error: RequestDataFailure): boolean {
    const key = `${message.kind}\u0000${JSON.stringify(message.query)}\u0000${error.code}\u0000${error.message}`;
    if (this.reportedRequestDataFailures.has(key)) return false;
    this.reportedRequestDataFailures.add(key);
    return true;
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
    inputs: Record<string, unknown> = {},
    runtime?: TealscriptRuntimeOptions,
    libraries?: Map<string, Program>,
  ): Promise<void> {
    await this.waitForReady();
    this.scriptId = scriptId;
    this.worker.postMessage({
      type: 'init',
      scriptId,
      script,
      bars,
      inputs,
      runtime,
      libraries,
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
    if (newGeneration) {
      this.latestFullRequestId = this.latestRequestId;
    }
    return {
      generation: this.generation,
      requestId: this.latestRequestId,
      requestKind: newGeneration ? 'full' : 'incremental',
    };
  }

  private isStaleMessage(metadata: WorkerOutputMetadata | undefined): boolean {
    if (typeof metadata?.generation === 'number' && metadata.generation < this.generation) {
      return true;
    }
    if (metadata?.requestKind === 'full') {
      return typeof metadata.requestId === 'number' && metadata.requestId < this.latestFullRequestId;
    }
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
      reportedRuntimeProfileDiagnostics: new Set(),
    };
    this.scripts.set(scriptId, managedScript);

    // Initialize worker with the latest bars and inputs once the worker is ready.
    if (isTealchartPlotDebugEnabled()) {
      console.info('[tealchart:plots] manager addScript', {
        scriptId,
        barCount: this.bars.length,
        inputs,
      });
    }
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

    if (isTealchartPlotDebugEnabled()) {
      console.info('[tealchart:plots] manager setBars', {
        barCount: bars.length,
        scriptIds: Array.from(this.scripts.keys()),
      });
    }

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
      resolveRequestData: this.options.resolveRequestData,
    }) as unknown as TealscriptWorker;
  }

  private restartScriptWorker(script: ManagedScript): void {
    script.worker.dispose();
    const workerGeneration = ++this.nextWorkerGeneration;
    script.workerGeneration = workerGeneration;
    script.worker = this.createScriptWorker(script.id, workerGeneration);
    script.plots = [];
    script.drawings = [];
    script.isReady = false;

    if (isTealchartPlotDebugEnabled()) {
      console.info('[tealchart:plots] manager restartScriptWorker', {
        scriptId: script.id,
        workerGeneration,
        barCount: this.bars.length,
      });
    }

    void this.initializeCurrentWorker(script.id, workerGeneration).catch((error: unknown) => {
      this.handleError(script.id, workerGeneration, {
        type: 'runtime',
        severity: 'error',
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
      this.options.getRuntimeOptions?.(),
      this.options.getLibraries?.(),
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

    const resultMetadata = result.metadata;
    const shouldPreserveExistingPlots =
      resultMetadata?.requestKind === 'incremental' && result.plots.length === 0 && script.plots.length > 0;

    // Update visual outputs. Incremental live-bar responses should update the
    // current series, not replace a full-history plot with a shorter payload.
    script.plots = shouldPreserveExistingPlots
      ? script.plots
      : preserveLongerCurrentPlotSeries(script.plots, result.plots);
    script.drawings = result.drawings;

    if (isTealchartPlotDebugEnabled()) {
      console.info('[tealchart:plots] manager result', {
        scriptId,
        workerGeneration,
        metadata: resultMetadata,
        preservedExistingPlots: shouldPreserveExistingPlots,
        inputPlotCount: result.plots.length,
        storedPlotCount: script.plots.length,
        bars: this.bars.length,
        inputPlots: summarizePlotsForDebug(result.plots),
        storedPlots: summarizePlotsForDebug(script.plots),
        declaration: result.declaration
          ? { title: result.declaration.title, shortTitle: result.declaration.shortTitle, overlay: result.declaration.overlay }
          : undefined,
      });
    }

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
    this.options.onExecution?.(summarizeResultExecution(scriptId, result, script.plots.length, script.drawings.length));
    this.reportRuntimeProfileDiagnostic(scriptId, script, result);
  }

  private handleError(scriptId: string, workerGeneration: number, error: WorkerError): void {
    const script = this.getCurrentScript(scriptId, workerGeneration);
    if (!script) return;

    script.error = error;
    if (error.code !== REQUEST_DATA_UNAVAILABLE_ERROR_CODE && error.code !== REALTIME_COMPILED_FALLBACK_ERROR_CODE) {
      script.plots = []; // Clear plots on fatal errors
      script.drawings = []; // Clear drawings on fatal errors
    }

    if (isTealchartPlotDebugEnabled()) {
      console.error('[tealchart:plots] manager error', { scriptId, workerGeneration, error });
    }

    this.options.onError?.(scriptId, error);
    if (error.type === 'runtime' && error.severity === 'error') {
      this.options.onExecution?.(summarizeRuntimeErrorExecution(scriptId, error));
    }
    if (error.code !== REQUEST_DATA_UNAVAILABLE_ERROR_CODE && error.code !== REALTIME_COMPILED_FALLBACK_ERROR_CODE) {
      this.notifyPlotsUpdated();
      this.notifyDrawingsUpdated();
    }
  }

  private reportRuntimeProfileDiagnostic(scriptId: string, script: ManagedScript, result: WorkerResult): void {
    const error = formatRealtimeCompiledFallbackDiagnostic(result);
    if (!error) return;

    const key = `${error.code}\u0000${error.message}`;
    if (script.reportedRuntimeProfileDiagnostics.has(key)) return;
    script.reportedRuntimeProfileDiagnostics.add(key);
    script.error = error;
    this.options.onError?.(scriptId, error);
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
