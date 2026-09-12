import type { Program } from '../parser/ast';
import type { Bar } from './context';
import type { ExecutionResult, TealscriptExecutionOptions } from './types';
import {
  applyTealscriptBackendSelectionProfile,
  selectTealscriptExecutionBackend,
} from './backendSelection';
import { executeCompiledScript, type CompiledExecutionOptions } from './codegen/execute';

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

  const execution = executeCompiledScript(ast, bars, inputs, {
    runtime: options.runtime,
    maxBarsBack: options.maxBarsBack,
    requestDatafeed: options.requestDatafeed,
    libraries: options.libraries,
    realtimeLastBar: options.realtimeLastBar,
    confirmedRealtimeBarIndex: options.confirmedRealtimeBarIndex,
    confirmedRealtimeBarStartIndex: options.confirmedRealtimeBarStartIndex,
  });
  if (execution.status === 'failure') {
    throw new Error(`Compiled TealScript execution failed: ${execution.reason}`);
  }
  return applyTealscriptBackendSelectionProfile(execution.result, selection);
}
