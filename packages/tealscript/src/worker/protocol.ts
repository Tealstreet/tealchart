/**
 * Tealscript Worker Protocol
 *
 * Message types for communication between main thread and Web Worker.
 */

import type { AlertOutput, Bar, DrawingOutput, PlotOutput, InputDefinition, LogOutput } from '../runtime/context';
import type { IndicatorDeclarationMetadata, RuntimeErrorCode, RuntimeErrorPayload, RuntimeProfile, TealscriptRuntimeOptions } from '../runtime/types';
import type { StrategyLedger } from '../runtime/strategy';
import type {
  RequestCorporateActionEvent,
  RequestCorporateActionQuery,
  RequestCurrencyRateQuery,
  RequestDataContext,
  RequestDatafeedQuery,
  RequestEconomicSeriesQuery,
  RequestFinancialMetricQuery,
  RequestFootprintData,
  RequestFootprintQuery,
  RequestQuandlSeriesQuery,
  RequestSeriesPoint,
  RequestSeriesQuery,
} from '../runtime/requestDatafeed';
import type { Program } from '../parser/ast';
import type { SemanticDiagnostic } from '../semantic';

/**
 * Messages sent from main thread to worker
 */
export type ToWorkerMessage =
  | InitMessage
  | UpdateBarsMessage
  | UpdateBarMessage
  | SetInputsMessage
  | DisposeMessage
  | RequestDataResultMessage;

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
  libraries?: Map<string, Program>;
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
  | RequestDataMessage
  | ResultMessage
  | ErrorMessage
  | SemanticErrorMessage
  | ParseErrorMessage;

export type WorkerRequestDataKind =
  | 'bars'
  | 'series'
  | 'currency_rate'
  | 'corporate_action'
  | 'economic'
  | 'financial'
  | 'quandl'
  | 'footprint';

export type WorkerRequestDataQuery =
  | RequestDatafeedQuery
  | RequestSeriesQuery
  | RequestCurrencyRateQuery
  | RequestCorporateActionQuery
  | RequestEconomicSeriesQuery
  | RequestFinancialMetricQuery
  | RequestQuandlSeriesQuery
  | RequestFootprintQuery;

export type WorkerRequestDataValue =
  | RequestDataContext
  | RequestSeriesPoint[]
  | RequestCorporateActionEvent[]
  | RequestCorporateActionEvent
  | RequestFootprintData[]
  | RequestFootprintData
  | number
  | null;

export type WorkerRequestDataErrorCode =
  | 'missing-provider'
  | 'not-found'
  | 'timeout'
  | 'invalid-query'
  | 'provider-error';

export interface RequestDataMessage {
  type: 'requestData';
  scriptId: string;
  requestId: number;
  generation: number;
  kind: WorkerRequestDataKind;
  query: WorkerRequestDataQuery;
}

export interface RequestDataSuccessMessage {
  type: 'requestDataResult';
  scriptId: string;
  requestId: number;
  generation: number;
  kind: WorkerRequestDataKind;
  ok: true;
  value: WorkerRequestDataValue;
}

export interface RequestDataErrorMessage {
  type: 'requestDataResult';
  scriptId: string;
  requestId: number;
  generation: number;
  kind: WorkerRequestDataKind;
  ok: false;
  error: {
    code: WorkerRequestDataErrorCode;
    message: string;
  };
}

export type RequestDataResultMessage = RequestDataSuccessMessage | RequestDataErrorMessage;

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
  requestKind?: 'full' | 'incremental';
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
  strategy?: StrategyLedger;
  profile?: RuntimeProfile;
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
  output: WorkerOutputBundle;
}

/**
 * Build a result message with one atomic output bundle.
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
  };
}

/**
 * Normalize the optional log field into the public output shape.
 */
export function getResultOutput(message: ResultMessage): NormalizedWorkerOutputBundle {
  return {
    ...message.output,
    logs: message.output.logs ?? [],
  };
}

/**
 * Runtime error during execution
 */
export interface ErrorMessage {
  type: 'error';
  scriptId: string;
  message: string;
  code?: RuntimeErrorCode;
  line?: number;
  column?: number;
  runtimeError?: RuntimeErrorPayload;
  profile?: RuntimeProfile;
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
 * Build a semantic error message while preserving the structured diagnostic
 * payload expected by editor integrations.
 */
export function createSemanticErrorMessage(
  scriptId: string,
  diagnostics: SemanticDiagnostic[],
  message: string,
  metadata?: WorkerOutputMetadata
): SemanticErrorMessage {
  const firstDiagnostic = diagnostics[0];

  return {
    type: 'semanticError',
    scriptId,
    message,
    diagnostics,
    line: firstDiagnostic?.line,
    column: firstDiagnostic?.column,
    metadata,
  };
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
