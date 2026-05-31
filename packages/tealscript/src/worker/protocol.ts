/**
 * Tealscript Worker Protocol
 *
 * Message types for communication between main thread and Web Worker.
 */

import type { AlertOutput, Bar, DrawingOutput, PlotOutput, InputDefinition } from '../runtime/context';

/**
 * Messages sent from main thread to worker
 */
export type ToWorkerMessage =
  | InitMessage
  | UpdateBarsMessage
  | UpdateBarMessage
  | SetInputsMessage
  | DisposeMessage;

/**
 * Initialize worker with script and data
 */
export interface InitMessage {
  type: 'init';
  scriptId: string;
  script: string;
  bars: Bar[];
  inputs: Record<string, unknown>;
}

/**
 * Replace all bars (e.g., symbol/timeframe change)
 */
export interface UpdateBarsMessage {
  type: 'updateBars';
  bars: Bar[];
}

/**
 * Update current bar (realtime tick)
 */
export interface UpdateBarMessage {
  type: 'updateBar';
  bar: Bar;
}

/**
 * Update input values
 */
export interface SetInputsMessage {
  type: 'setInputs';
  inputs: Record<string, unknown>;
}

/**
 * Dispose worker resources
 */
export interface DisposeMessage {
  type: 'dispose';
}

/**
 * Messages sent from worker to main thread
 */
export type FromWorkerMessage =
  | ReadyMessage
  | ResultMessage
  | ErrorMessage
  | ParseErrorMessage;

/**
 * Worker is ready to receive messages
 */
export interface ReadyMessage {
  type: 'ready';
}

/**
 * Optional metadata that lets callers reason about result freshness without
 * coupling plot, drawing, alert, and input payloads to separate channels.
 */
export interface WorkerOutputMetadata {
  generation?: number;
  requestId?: number;
}

/**
 * Atomic output produced by one TealScript execution.
 */
export interface WorkerOutputBundle {
  plots: PlotOutput[];
  drawings: DrawingOutput[];
  alerts: AlertOutput[];
  inputs: InputDefinition[];
  metadata?: WorkerOutputMetadata;
}

/**
 * Execution completed successfully
 */
export interface ResultMessage {
  type: 'result';
  scriptId: string;
  output?: WorkerOutputBundle;

  /**
   * Legacy top-level fields kept while Tealchart consumers migrate to
   * ResultMessage.output.
   */
  plots: PlotOutput[];
  drawings: DrawingOutput[];
  alerts: AlertOutput[];
  inputs: InputDefinition[];
}

/**
 * Build a result message with both the atomic output bundle and legacy fields.
 */
export function createResultMessage(scriptId: string, output: WorkerOutputBundle): ResultMessage {
  return {
    type: 'result',
    scriptId,
    output,
    plots: output.plots,
    drawings: output.drawings,
    alerts: output.alerts,
    inputs: output.inputs,
  };
}

/**
 * Normalize result messages from bundled or legacy workers into one payload.
 */
export function getResultOutput(message: ResultMessage): WorkerOutputBundle {
  return message.output ?? {
    plots: message.plots,
    drawings: message.drawings,
    alerts: message.alerts,
    inputs: message.inputs,
  };
}

/**
 * Runtime error during execution
 */
export interface ErrorMessage {
  type: 'error';
  scriptId: string;
  message: string;
  line?: number;
  column?: number;
}

/**
 * Parse error in script
 */
export interface ParseErrorMessage {
  type: 'parseError';
  scriptId: string;
  message: string;
  line?: number;
  column?: number;
}
