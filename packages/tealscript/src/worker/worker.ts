/**
 * TealScript Web Worker Entry Point
 *
 * This file runs inside the Web Worker and handles:
 * - Receiving messages from main thread
 * - Parsing and executing TealScript
 * - Sending results back to main thread
 */

import { parse, TealScriptParseError } from '../parser';
import { TealScriptEngine } from '../runtime/engine';
import type { Program } from '../parser/ast';
import type { Bar, InputDefinition } from '../runtime/context';
import type {
  ToWorkerMessage,
  FromWorkerMessage,
  ResultMessage,
  ErrorMessage,
  ParseErrorMessage,
} from './protocol';

/**
 * Worker state for a single script
 */
interface ScriptState {
  scriptId: string;
  ast: Program;
  engine: TealScriptEngine;
  bars: Bar[];
  inputs: Record<string, unknown>;
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

  try {
    switch (message.type) {
      case 'init':
        handleInit(message.scriptId, message.script, message.bars, message.inputs);
        break;

      case 'updateBars':
        handleUpdateBars(message.bars);
        break;

      case 'updateBar':
        handleUpdateBar(message.bar);
        break;

      case 'setInputs':
        handleSetInputs(message.inputs);
        break;

      case 'dispose':
        handleDispose();
        break;

      default:
        // Unknown message type
        console.warn('Unknown message type:', (message as { type: string }).type);
    }
  } catch (error) {
    handleError(error);
  }
};

/**
 * Initialize with script and data
 */
function handleInit(
  scriptId: string,
  script: string,
  bars: Bar[],
  inputs: Record<string, unknown>
): void {
  try {
    // Parse the script
    const ast = parse(script);

    // Create engine
    const engine = new TealScriptEngine();

    // Store state
    state = {
      scriptId,
      ast,
      engine,
      bars,
      inputs,
    };

    // Execute and send results
    executeAndSendResults();
  } catch (error) {
    if (error instanceof TealScriptParseError) {
      const parseError: ParseErrorMessage = {
        type: 'parseError',
        scriptId,
        message: error.message,
        line: error.location?.start.line,
        column: error.location?.start.column,
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
function handleUpdateBars(bars: Bar[]): void {
  if (!state) {
    console.warn('Worker not initialized');
    return;
  }

  state.bars = bars;

  // Re-execute with new bars
  executeAndSendResults();
}

/**
 * Handle realtime bar update
 */
function handleUpdateBar(bar: Bar): void {
  if (!state) {
    console.warn('Worker not initialized');
    return;
  }

  // Check if this is an update to the last bar or a new bar
  const lastBar = state.bars[state.bars.length - 1];

  if (lastBar && bar.time === lastBar.time) {
    // Update existing bar
    state.bars[state.bars.length - 1] = bar;
  } else {
    // New bar
    state.bars.push(bar);
  }

  // Re-execute (engine handles rollback internally)
  executeAndSendResults();
}

/**
 * Handle input value changes
 */
function handleSetInputs(inputs: Record<string, unknown>): void {
  if (!state) {
    console.warn('Worker not initialized');
    return;
  }

  state.inputs = inputs;

  // Re-execute with new inputs
  executeAndSendResults();
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
function executeAndSendResults(): void {
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

    // Send results
    const resultMessage: ResultMessage = {
      type: 'result',
      scriptId: state.scriptId,
      plots: result.plots,
      inputs,
    };
    postResult(resultMessage);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Handle execution errors
 */
function handleError(error: unknown): void {
  const errorMessage: ErrorMessage = {
    type: 'error',
    scriptId: state?.scriptId ?? 'unknown',
    message: error instanceof Error ? error.message : String(error),
  };
  postResult(errorMessage);
}

// Signal that worker is ready
postResult({ type: 'ready' });
