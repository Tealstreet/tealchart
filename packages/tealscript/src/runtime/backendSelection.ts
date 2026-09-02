import type { ExecutionResult } from './engine';

export type TealscriptExecutionBackend = 'compiled' | 'closure' | 'interpreter';
export type TealscriptBackendSelectionSource = 'explicit' | 'flag' | 'default';

export interface TealscriptBackendSelectionOptions {
  executionBackendOverride?: TealscriptExecutionBackend;
  enableClosureBackend?: boolean;
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
    return {
      backend: options.executionBackendOverride,
      source: 'explicit',
    };
  }

  if (options?.enableClosureBackend) {
    return {
      backend: 'closure',
      source: 'flag',
    };
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
