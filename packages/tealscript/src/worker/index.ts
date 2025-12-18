/**
 * TealScript Worker exports
 */

export {
  TealScriptWorker,
  TealScriptWorkerFactory,
  type TealScriptWorkerOptions,
  type WorkerResult,
  type WorkerError,
  type ResultCallback,
  type ErrorCallback,
} from './TealScriptWorker';

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
