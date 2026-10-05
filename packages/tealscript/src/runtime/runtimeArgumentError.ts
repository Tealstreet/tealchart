import type { RuntimeErrorCode } from './types';

/** A captured Pine runtime argument failure, raised when the call executes. */
export class PineRuntimeArgumentError extends Error {
  readonly runtimeErrorCode: Exclude<RuntimeErrorCode, 'runtime.error'>;

  constructor(message: string, runtimeErrorCode: Exclude<RuntimeErrorCode, 'runtime.error'> = 'RE10001') {
    super(message);
    this.name = 'PineRuntimeArgumentError';
    this.runtimeErrorCode = runtimeErrorCode;
  }
}
