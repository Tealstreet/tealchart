/**
 * Tealscript Web Worker Entry Point
 *
 * This file runs inside the Web Worker and handles:
 * - Receiving messages from main thread
 * - Parsing and executing Tealscript
 * - Sending results back to main thread
 */

import { parse, TealscriptParseError } from '../parser';
import { createRuntimeErrorPayload } from '../runtime/types';
import type { ExecutionResult, RuntimeFallbackDiagnostic, TealscriptRuntimeOptions } from '../runtime/types';
import {
  applyTealscriptBackendSelectionProfile,
  selectTealscriptExecutionBackend,
} from '../runtime/backendSelection';
import { collectCompiledRequestDataQueryCollection, tryExecuteScript } from '../runtime/codegen';
import type { CompiledRequestDataQuery } from '../runtime/codegen';
import { checkProgram } from '../semantic';
import type { Program } from '../parser/ast';
import type { Bar, InputDefinition } from '../runtime/context';
import {
  CacheBackedRequestDatafeed,
  CacheDiscoveringRequestDatafeed,
  workerRequestDataCacheKey,
  type WorkerRequestDataCacheEntry,
  type WorkerRequestDataCacheQuery,
  type WorkerRequestDataCacheValue,
  type WorkerRequestDataDiscoveryQuery,
} from '../runtime/requestDatafeed';
import { createResultMessage, createSemanticErrorMessage } from './protocol';
import { semanticOptionsFromLibraries } from './semanticOptions';
import type {
  ToWorkerMessage,
  FromWorkerMessage,
  WorkerOutputMetadata,
  ErrorMessage,
  ParseErrorMessage,
  SemanticErrorMessage,
  RequestDataResultMessage,
} from './protocol';

/**
 * Worker state for a single script
 */
interface ScriptState {
  scriptId: string;
  ast: Program;
  bars: Bar[];
  inputs: Record<string, unknown>;
  runtime?: TealscriptRuntimeOptions;
  libraries?: Map<string, Program>;
  lastInputs: InputDefinition[];
  requestCache: Map<string, WorkerRequestDataCacheEntry>;
  pendingRequestKeys: Set<string>;
  pendingRequestGeneration?: number;
  pendingRequestMetadata?: WorkerOutputMetadata;
  realtimeLastBar?: {
    time: number;
    isNew: boolean;
  };
  confirmedRealtimeBarIndex?: number;
  confirmedRealtimeBarStartIndex?: number;
  requestDiscoveryGeneration?: number;
  requestDiscoveryFetchRounds: number;
}

// Current script state
let state: ScriptState | null = null;
let nextRequestDataId = 0;
const pendingRequestData = new Map<number, { generation: number; cacheKey: string; query: WorkerRequestDataCacheQuery }>();
const MAX_RUNTIME_REQUEST_DISCOVERY_FETCH_ROUNDS = 3;

/**
 * Post a message to the main thread
 */
function postResult(message: FromWorkerMessage): void {
  self.postMessage(message);
}

/**
 * Handle incoming messages from main thread
 */
self.onmessage = (event: MessageEvent<ToWorkerMessage>) => {
  const message = event.data;
  const metadata = 'metadata' in message ? message.metadata : undefined;

  try {
    switch (message.type) {
      case 'init':
        handleInit(message.scriptId, message.script, message.bars, message.inputs, message.runtime, message.libraries, metadata);
        break;

      case 'updateBars':
        handleUpdateBars(message.bars, metadata);
        break;

      case 'updateBar':
        handleUpdateBar(message.bar, metadata);
        break;

      case 'setInputs':
        handleSetInputs(message.inputs, metadata);
        break;

      case 'requestDataResult':
        handleRequestDataResult(message);
        break;

      case 'dispose':
        handleDispose();
        break;

      default:
        // Unknown message type
        console.warn('Unknown message type:', (message as { type: string }).type);
    }
  } catch (error) {
    handleError(error, metadata);
  }
};

/**
 * Initialize with script and data
 */
function handleInit(
  scriptId: string,
  script: string,
  bars: Bar[],
  inputs: Record<string, unknown>,
  runtime?: TealscriptRuntimeOptions,
  libraries?: Map<string, Program>,
  metadata?: WorkerOutputMetadata
): void {
  try {
    // Parse the script
    const ast = parse(script);
    const semanticResult = checkProgram(ast, semanticOptionsFromLibraries(libraries));
    const semanticErrors = semanticResult.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    if (semanticErrors[0]) {
      postResult(createSemanticErrorMessage(
        scriptId,
        semanticErrors,
        formatSemanticError(semanticErrors),
        metadata
      ));
      return;
    }

    // Store state
    pendingRequestData.clear();
    state = {
      scriptId,
      ast,
      bars,
      inputs,
      runtime,
      libraries,
      lastInputs: [],
      requestCache: new Map(),
      pendingRequestKeys: new Set(),
      realtimeLastBar: undefined,
      confirmedRealtimeBarIndex: undefined,
      confirmedRealtimeBarStartIndex: undefined,
      requestDiscoveryFetchRounds: 0,
    };

    // Execute and send results
    executeAndSendResults(metadata);
  } catch (error) {
    if (error instanceof TealscriptParseError) {
      const parseError: ParseErrorMessage = {
        type: 'parseError',
        scriptId,
        message: error.message,
        line: error.location?.start.line,
        column: error.location?.start.column,
        metadata,
      };
      postResult(parseError);
    } else {
      throw error;
    }
  }
}

function formatSemanticError(diagnostics: SemanticErrorMessage['diagnostics']): string {
  return diagnostics.map((diagnostic) => {
    const column = diagnostic.column ? `:${diagnostic.column}` : '';
    const location = diagnostic.line ? `line ${diagnostic.line}${column}: ` : '';
    return `${location}${diagnostic.message}`;
  }).join('\n');
}

/**
 * Handle full bar replacement (symbol/timeframe change)
 */
function handleUpdateBars(bars: Bar[], metadata?: WorkerOutputMetadata): void {
  if (!state) {
    console.warn('Worker not initialized');
    return;
  }

  state.bars = bars;
  state.realtimeLastBar = undefined;
  state.confirmedRealtimeBarIndex = undefined;
  state.confirmedRealtimeBarStartIndex = undefined;
  state.requestCache.clear();
  resetPendingRequests();
  resetRequestDiscovery();

  // Re-execute with new bars
  executeAndSendResults(metadata);
}

/**
 * Handle realtime bar update
 */
function handleUpdateBar(bar: Bar, metadata?: WorkerOutputMetadata): void {
  if (!state) {
    console.warn('Worker not initialized');
    return;
  }

  const lastBar = state.bars[state.bars.length - 1];

  if (lastBar && bar.time === lastBar.time) {
    state.bars[state.bars.length - 1] = bar;
    state.realtimeLastBar = { time: bar.time, isNew: false };
    state.confirmedRealtimeBarIndex = undefined;
    resetPendingRequests();
    resetRequestDiscovery();
    executeAndSendResults(metadata);
  } else {
    // New bar — need full execute to process the new bar through all statements
    state.confirmedRealtimeBarIndex = state.realtimeLastBar?.time === lastBar?.time
      ? state.bars.length - 1
      : undefined;
    if (state.confirmedRealtimeBarStartIndex === undefined) {
      state.confirmedRealtimeBarStartIndex = state.bars.length;
    }
    state.bars.push(bar);
    state.realtimeLastBar = { time: bar.time, isNew: true };
    resetPendingRequests();
    resetRequestDiscovery();
    executeAndSendResults(metadata);
  }
}

/**
 * Handle input value changes
 */
function handleSetInputs(inputs: Record<string, unknown>, metadata?: WorkerOutputMetadata): void {
  if (!state) {
    console.warn('Worker not initialized');
    return;
  }

  state.inputs = inputs;
  state.realtimeLastBar = undefined;
  state.confirmedRealtimeBarIndex = undefined;
  state.confirmedRealtimeBarStartIndex = undefined;
  state.requestCache.clear();
  resetPendingRequests();
  resetRequestDiscovery();

  // Re-execute with new inputs
  executeAndSendResults(metadata);
}

/**
 * Clean up worker resources
 */
function handleDispose(): void {
  state = null;
  pendingRequestData.clear();
}

function resetPendingRequests(): void {
  pendingRequestData.clear();
  if (!state) return;
  state.pendingRequestKeys.clear();
  state.pendingRequestGeneration = undefined;
  state.pendingRequestMetadata = undefined;
}

function resetRequestDiscovery(): void {
  if (!state) return;
  state.requestDiscoveryGeneration = undefined;
  state.requestDiscoveryFetchRounds = 0;
}

/**
 * Convert Record to Map for engine.execute()
 */
function recordToMap(record: Record<string, unknown>): Map<string, unknown> {
  return new Map(Object.entries(record));
}

/**
 * Execute script and send results to main thread
 */
function executeAndSendResults(metadata?: WorkerOutputMetadata): void {
  if (!state) {
    return;
  }

  try {
    // Convert inputs Record to Map
    const inputsMap = recordToMap(state.inputs);
    const preloadCollection = collectCompiledRequestDataQueryCollection(state.ast, inputsMap, {
      runtime: state.runtime,
      libraries: state.libraries,
    });
    const preloadQueries = preloadCollection.queries;
    const generation = metadata?.generation ?? 0;
    const missingQueries = preloadQueries.filter(({ kind, query }) => !state?.requestCache.has(workerRequestDataCacheKey(kind, query)));
    if (missingQueries.length > 0) {
      postRequestDataMisses(missingQueries.map(({ kind, query }) => ({
        kind,
        query,
        cacheKey: workerRequestDataCacheKey(kind, query),
      })), generation, metadata);
      return;
    }

    const cacheBackedRequestDatafeed = (preloadQueries.length > 0 || preloadCollection.hasUnpreloadableQueries)
      ? new CacheBackedRequestDatafeed(state.requestCache)
      : undefined;
    const backendSelection = selectTealscriptExecutionBackend(state.runtime?.backend);
    if (preloadCollection.hasUnpreloadableQueries) {
      const discovery = discoverRuntimeRequestDataMisses(inputsMap);
      const discoveredMisses = discovery.misses;
      if (discoveredMisses.length > 0) {
        const fetchRounds = state.requestDiscoveryGeneration === generation
          ? state.requestDiscoveryFetchRounds
          : 0;
        if (fetchRounds >= MAX_RUNTIME_REQUEST_DISCOVERY_FETCH_ROUNDS) {
          postCompiledUnsupported(
            backendSelection,
            `unpreloadable-request-data: discovery-not-converged: ${summarizeRequestDataKinds(discoveredMisses)}; static: ${preloadCollection.unpreloadableReasons.join('; ')}`,
            [],
            metadata,
          );
          return;
        }

        state.requestDiscoveryGeneration = generation;
        state.requestDiscoveryFetchRounds = fetchRounds + 1;
        postRequestDataMisses(discoveredMisses, generation, metadata);
        return;
      }

      if (discovery.errors.length > 0) {
        const firstError = discovery.errors[0]!;
        throw new Error(`Runtime request discovery failed before request data could be resolved: ${firstError.message}`);
      }

      state.requestDiscoveryGeneration = undefined;
      state.requestDiscoveryFetchRounds = 0;
    }

    let fallbackReason: string | undefined;
    const compiledResult = tryExecuteScript(state.ast, state.bars, inputsMap, {
      runtime: state.runtime,
      libraries: state.libraries,
      requestDatafeed: cacheBackedRequestDatafeed,
      realtimeLastBar: state.realtimeLastBar,
      confirmedRealtimeBarIndex: state.confirmedRealtimeBarIndex,
      confirmedRealtimeBarStartIndex: state.confirmedRealtimeBarStartIndex,
      onFallback: (reason) => {
        fallbackReason = reason;
      },
    });
    if (!compiledResult) {
      postCompiledUnsupported(backendSelection, fallbackReason ?? 'compiled-execution-unavailable', [], metadata);
      return;
    }
    sendExecutionResult(applyTealscriptBackendSelectionProfile(compiledResult, backendSelection), metadata);
  } catch (error) {
    handleError(error, metadata);
  }
}

function discoverRuntimeRequestDataMisses(
  inputsMap: Map<string, unknown>,
): { misses: WorkerRequestDataDiscoveryQuery[]; errors: ExecutionResult['errors'] } {
  if (!state) throw new Error('Worker not initialized');

  const discoveryDatafeed = new CacheDiscoveringRequestDatafeed(state.requestCache);
  const discoveryResult = tryExecuteScript(state.ast, state.bars, inputsMap, {
    runtime: state.runtime,
    libraries: state.libraries,
    requestDatafeed: discoveryDatafeed,
    realtimeLastBar: state.realtimeLastBar,
    confirmedRealtimeBarIndex: state.confirmedRealtimeBarIndex,
    confirmedRealtimeBarStartIndex: state.confirmedRealtimeBarStartIndex,
  });

  return {
    misses: discoveryDatafeed.discoveredQueries.filter(({ cacheKey }) => !state?.requestCache.has(cacheKey)),
    errors: discoveryResult?.errors ?? [{ message: 'Compiled runtime request discovery failed' }],
  };
}

function postRequestDataMisses(
  misses: Array<CompiledRequestDataQuery | WorkerRequestDataDiscoveryQuery>,
  generation: number,
  metadata?: WorkerOutputMetadata,
): void {
  if (!state) return;

  const cacheKeyForMiss = (miss: CompiledRequestDataQuery | WorkerRequestDataDiscoveryQuery): string =>
    'cacheKey' in miss ? miss.cacheKey : workerRequestDataCacheKey(miss.kind, miss.query);

  state.pendingRequestGeneration = generation;
  state.pendingRequestMetadata = metadata;
  state.pendingRequestKeys = new Set(misses.map(cacheKeyForMiss));
  for (const miss of misses) {
    const requestId = ++nextRequestDataId;
    const cacheKey = cacheKeyForMiss(miss);
    pendingRequestData.set(requestId, { generation, cacheKey, query: miss.query });
    postResult({
      type: 'requestData',
      scriptId: state.scriptId,
      requestId,
      generation,
      kind: miss.kind,
      query: miss.query,
    });
  }
}

function postCompiledUnsupported(
  backendSelection: ReturnType<typeof selectTealscriptExecutionBackend>,
  reason: string,
  fallbackDiagnostics: RuntimeFallbackDiagnostic[],
  metadata?: WorkerOutputMetadata,
): void {
  if (!state) return;
  postResult({
    type: 'error',
    scriptId: state.scriptId,
    message: `Compiled TealScript execution does not support this script: ${reason}`,
    profile: {
      executionMode: 'compiled',
      selectedBackend: backendSelection.backend,
      backendSelectionSource: backendSelection.source,
      fallbackReason: reason,
      fallbackDiagnostics,
      elapsedMs: 0,
      bars: state.bars.length,
      statements: 0,
      expressions: 0,
      builtinCalls: 0,
      requestContexts: 0,
      maxBarsBack: 0,
      errors: 1,
    },
    metadata,
  });
}

function summarizeRequestDataKinds(misses: Array<{ kind: string }>): string {
  return [...new Set(misses.map((miss) => miss.kind))].sort().join(', ');
}

function sendExecutionResult(result: ExecutionResult, metadata?: WorkerOutputMetadata): void {
  if (!state) return;

  const runtimeError = result.errors.find((error) => error.runtimeError)?.runtimeError;
  if (runtimeError) {
    postResult(createRuntimeErrorMessage(state.scriptId, runtimeError, metadata, result.profile));
    return;
  }

  // Convert result inputs to InputDefinition[]
  const inputs: InputDefinition[] = result.inputs.map((input) => ({
    ...input,
    type: input.type as InputDefinition['type'],
  }));

  // Cache inputs for intrabar ticks
  state.lastInputs = inputs;

  // Send results
  const resultMessage = createResultMessage(state.scriptId, {
    plots: result.plots,
    drawings: result.drawings,
    alerts: result.alerts,
    logs: result.logs,
    inputs,
    declaration: result.declaration,
    strategy: result.strategy,
    profile: result.profile,
    metadata,
  });
  postResult(resultMessage);
}

function handleRequestDataResult(message: RequestDataResultMessage): void {
  if (!state) return;
  if (message.scriptId !== state.scriptId) return;
  const pending = pendingRequestData.get(message.requestId);
  if (!pending || pending.generation !== message.generation) return;
  pendingRequestData.delete(message.requestId);
  if (state.pendingRequestGeneration !== message.generation) return;

  const entry: WorkerRequestDataCacheEntry = message.ok
    ? {
      kind: message.kind,
      query: pending.query,
      value: message.value as WorkerRequestDataCacheValue,
    }
    : {
      kind: message.kind,
      query: pending.query,
      value: null,
    };
  state.requestCache.set(pending.cacheKey, entry);
  state.pendingRequestKeys.delete(pending.cacheKey);

  if (state.pendingRequestKeys.size === 0) {
    const retryMetadata = state.pendingRequestMetadata;
    state.pendingRequestGeneration = undefined;
    state.pendingRequestMetadata = undefined;
    executeAndSendResults(retryMetadata);
  }
}

/**
 * Handle execution errors
 */
function handleError(error: unknown, metadata?: WorkerOutputMetadata): void {
  const runtimeError = createRuntimeErrorPayload(error);
  if (runtimeError) {
    postResult(createRuntimeErrorMessage(state?.scriptId ?? 'unknown', runtimeError, metadata));
    return;
  }

  const errorMessage: ErrorMessage = {
    type: 'error',
    scriptId: state?.scriptId ?? 'unknown',
    message: error instanceof Error ? error.message : String(error),
    metadata,
  };
  postResult(errorMessage);
}

function createRuntimeErrorMessage(
  scriptId: string,
  runtimeError: NonNullable<ErrorMessage['runtimeError']>,
  metadata?: WorkerOutputMetadata,
  profile?: ErrorMessage['profile'],
): ErrorMessage {
  return {
    type: 'error',
    scriptId,
    message: runtimeError.message,
    code: runtimeError.code,
    line: runtimeError.line,
    column: runtimeError.column,
    runtimeError,
    profile,
    metadata,
  };
}

// Signal that worker is ready
postResult({ type: 'ready' });
