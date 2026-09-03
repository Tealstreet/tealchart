import type { ExecutionResult } from './types';

export type TealscriptExecutionBackend = 'compiled';
export type TealscriptBackendSelectionSource = 'explicit' | 'default';

export interface TealscriptBackendSelectionOptions {
  executionBackendOverride?: TealscriptExecutionBackend;
  defaultBackend?: TealscriptExecutionBackend;
}

export interface TealscriptBackendSelection {
  backend: TealscriptExecutionBackend;
  source: TealscriptBackendSelectionSource;
}

export const DEFAULT_TEALSCRIPT_EXECUTION_BACKEND: TealscriptExecutionBackend = 'compiled';

export function selectTealscriptExecutionBackend(
  options: TealscriptBackendSelectionOptions | undefined,
): TealscriptBackendSelection {
  if (options?.executionBackendOverride) {
    if (options.executionBackendOverride !== 'compiled') {
      throw new Error(`Unsupported TealScript execution backend: ${options.executionBackendOverride}`);
    }
    return {
      backend: options.executionBackendOverride,
      source: 'explicit',
    };
  }

  if (options?.defaultBackend && options.defaultBackend !== 'compiled') {
    throw new Error(`Unsupported TealScript default execution backend: ${options.defaultBackend}`);
  }

  return {
    backend: options?.defaultBackend ?? DEFAULT_TEALSCRIPT_EXECUTION_BACKEND,
    source: 'default',
  };
}

export function applyTealscriptBackendSelectionProfile(
  result: ExecutionResult,
  selection: TealscriptBackendSelection,
): ExecutionResult {
  result.profile = {
    ...result.profile,
    selectedBackend: selection.backend,
    backendSelectionSource: selection.source,
  };
  return result;
}
