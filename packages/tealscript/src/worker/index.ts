/**
 * Tealscript Worker exports
 */

export {
  TealscriptWorker,
  TealscriptWorkerFactory,
  type TealscriptWorkerOptions,
  type WorkerResult,
  type WorkerError,
  type ResultCallback,
  type ErrorCallback,
} from './TealScriptWorker';

export type {
  ToWorkerMessage,
  FromWorkerMessage,
  WorkerOutputBundle,
  WorkerOutputMetadata,
  InitMessage,
  UpdateBarsMessage,
  UpdateBarMessage,
  SetInputsMessage,
  DisposeMessage,
  ReadyMessage,
  ResultMessage,
  ErrorMessage,
  ParseErrorMessage,
} from './protocol';

export { createResultMessage, getResultOutput } from './protocol';
