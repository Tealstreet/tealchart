/**
 * TealScript Worker Protocol
 *
 * Message types for communication between main thread and Web Worker.
 */

import type { Bar, PlotOutput, InputDefinition } from '../runtime/context';

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
 * Execution completed successfully
 */
export interface ResultMessage {
  type: 'result';
  scriptId: string;
  plots: PlotOutput[];
  inputs: InputDefinition[];
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
