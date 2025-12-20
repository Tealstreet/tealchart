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
} from './TealscriptWorker';

export type {
  ToWorkerMessage,
  FromWorkerMessage,
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
