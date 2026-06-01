/**
 * Tealscript Worker Protocol
 *
 * Message types for communication between main thread and Web Worker.
 */

import type { AlertOutput, Bar, DrawingOutput, PlotOutput, InputDefinition, LogOutput } from '../runtime/context';
import type { IndicatorDeclarationMetadata, TealscriptRuntimeOptions } from '../runtime/engine';
import type { SemanticDiagnostic } from '../semantic';

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
  runtime?: TealscriptRuntimeOptions;
  metadata?: WorkerOutputMetadata;
}

/**
 * Replace all bars (e.g., symbol/timeframe change)
 */
export interface UpdateBarsMessage {
  type: 'updateBars';
  bars: Bar[];
  metadata?: WorkerOutputMetadata;
}

/**
 * Update current bar (realtime tick)
 */
export interface UpdateBarMessage {
  type: 'updateBar';
  bar: Bar;
  metadata?: WorkerOutputMetadata;
}

/**
 * Update input values
 */
export interface SetInputsMessage {
  type: 'setInputs';
  inputs: Record<string, unknown>;
  metadata?: WorkerOutputMetadata;
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
  | SemanticErrorMessage
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
  logs?: LogOutput[];
  inputs: InputDefinition[];
  declaration?: IndicatorDeclarationMetadata;
  metadata?: WorkerOutputMetadata;
}

export interface NormalizedWorkerOutputBundle extends Omit<WorkerOutputBundle, 'logs'> {
  logs: LogOutput[];
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
  logs?: LogOutput[];
  inputs: InputDefinition[];
  declaration?: IndicatorDeclarationMetadata;
}

/**
 * Build a result message with both the atomic output bundle and legacy fields.
 */
export function createResultMessage(scriptId: string, output: WorkerOutputBundle): ResultMessage {
  const normalizedOutput: NormalizedWorkerOutputBundle = {
    ...output,
    logs: output.logs ?? [],
  };

  return {
    type: 'result',
    scriptId,
    output: normalizedOutput,
    plots: normalizedOutput.plots,
    drawings: normalizedOutput.drawings,
    alerts: normalizedOutput.alerts,
    logs: normalizedOutput.logs,
    inputs: normalizedOutput.inputs,
    declaration: normalizedOutput.declaration,
  };
}

/**
 * Normalize result messages from bundled or legacy workers into one payload.
 */
export function getResultOutput(message: ResultMessage): NormalizedWorkerOutputBundle {
  if (message.output) {
    return {
      ...message.output,
      logs: message.output.logs ?? [],
    };
  }

  return {
    plots: message.plots,
    drawings: message.drawings,
    alerts: message.alerts,
    logs: message.logs ?? [],
    inputs: message.inputs,
    declaration: message.declaration,
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
  metadata?: WorkerOutputMetadata;
}

/**
 * Semantic checker error in script
 */
export interface SemanticErrorMessage {
  type: 'semanticError';
  scriptId: string;
  message: string;
  diagnostics: SemanticDiagnostic[];
  line?: number;
  column?: number;
  metadata?: WorkerOutputMetadata;
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
  metadata?: WorkerOutputMetadata;
}
