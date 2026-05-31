/**
 * Tealscript Web Worker Entry Point
 *
 * This file runs inside the Web Worker and handles:
 * - Receiving messages from main thread
 * - Parsing and executing Tealscript
 * - Sending results back to main thread
 */

import { parse, TealscriptParseError } from '../parser';
import { TealscriptEngine } from '../runtime/engine';
import type { Program } from '../parser/ast';
import type { Bar, InputDefinition } from '../runtime/context';
import { createResultMessage } from './protocol';
import type { ToWorkerMessage, FromWorkerMessage, WorkerOutputMetadata, ErrorMessage, ParseErrorMessage } from './protocol';

/**
 * Worker state for a single script
 */
interface ScriptState {
  scriptId: string;
  ast: Program;
  engine: TealscriptEngine;
  bars: Bar[];
  inputs: Record<string, unknown>;
  lastInputs: InputDefinition[];
}

// Current script state
let state: ScriptState | null = null;

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
        handleInit(message.scriptId, message.script, message.bars, message.inputs, metadata);
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
  metadata?: WorkerOutputMetadata
): void {
  try {
    // Parse the script
    const ast = parse(script);

    // Create engine
    const engine = new TealscriptEngine();

    // Store state
    state = {
      scriptId,
      ast,
      engine,
      bars,
      inputs,
      lastInputs: [],
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

/**
 * Handle full bar replacement (symbol/timeframe change)
 */
function handleUpdateBars(bars: Bar[], metadata?: WorkerOutputMetadata): void {
  if (!state) {
    console.warn('Worker not initialized');
    return;
  }

  state.bars = bars;

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
    // Same bar update (intrabar tick) — rollback + re-execute just this bar
    state.bars[state.bars.length - 1] = bar;
    const plots = state.engine.updateBar(state.ast, bar);
    postResult(createResultMessage(state.scriptId, {
      plots,
      drawings: state.engine.getDrawings(),
      alerts: state.engine.getAlerts(),
      logs: state.engine.getLogs(),
      inputs: state.lastInputs, // send cached inputs from last full execution
      metadata,
    }));
  } else {
    // New bar — need full execute to process the new bar through all statements
    state.bars.push(bar);
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

  // Re-execute with new inputs
  executeAndSendResults(metadata);
}

/**
 * Clean up worker resources
 */
function handleDispose(): void {
  state = null;
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

    // Execute the script
    const result = state.engine.execute(state.ast, state.bars, inputsMap);

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
      metadata,
    });
    postResult(resultMessage);
  } catch (error) {
    handleError(error, metadata);
  }
}

/**
 * Handle execution errors
 */
function handleError(error: unknown, metadata?: WorkerOutputMetadata): void {
  const errorMessage: ErrorMessage = {
    type: 'error',
    scriptId: state?.scriptId ?? 'unknown',
    message: error instanceof Error ? error.message : String(error),
    metadata,
  };
  postResult(errorMessage);
}

// Signal that worker is ready
postResult({ type: 'ready' });
