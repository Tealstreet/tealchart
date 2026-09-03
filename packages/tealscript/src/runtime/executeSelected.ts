import type { Program } from '../parser/ast';
import type { Bar } from './context';
import type { ExecutionResult, TealscriptExecutionOptions } from './types';
import {
  applyTealscriptBackendSelectionProfile,
  selectTealscriptExecutionBackend,
} from './backendSelection';
import { tryExecuteScript, type CompiledExecutionOptions } from './codegen/execute';

export interface SelectedTealscriptExecutionOptions extends TealscriptExecutionOptions {
  maxBarsBack?: number;
  realtimeLastBar?: CompiledExecutionOptions['realtimeLastBar'];
  confirmedRealtimeBarIndex?: CompiledExecutionOptions['confirmedRealtimeBarIndex'];
  confirmedRealtimeBarStartIndex?: CompiledExecutionOptions['confirmedRealtimeBarStartIndex'];
}

export function executeSelectedTealscriptBackend(
  ast: Program,
  bars: Bar[],
  inputs?: Map<string, unknown>,
  options: SelectedTealscriptExecutionOptions = {},
): ExecutionResult {
  const selection = selectTealscriptExecutionBackend(options.runtime?.backend);

  let fallbackReason: string | undefined;
  const compiledResult = tryExecuteScript(ast, bars, inputs, {
    runtime: options.runtime,
    maxBarsBack: options.maxBarsBack,
    requestDatafeed: options.requestDatafeed,
    libraries: options.libraries,
    realtimeLastBar: options.realtimeLastBar,
    confirmedRealtimeBarIndex: options.confirmedRealtimeBarIndex,
    confirmedRealtimeBarStartIndex: options.confirmedRealtimeBarStartIndex,
    onFallback: (reason) => {
      fallbackReason = reason;
    },
  });
  if (!compiledResult) {
    throw new Error(`Compiled TealScript execution failed${fallbackReason ? `: ${fallbackReason}` : ''}`);
  }
  return applyTealscriptBackendSelectionProfile(compiledResult, selection);
}
