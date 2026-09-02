import type { Program } from '../parser/ast';
import type { Bar } from './context';
import { TealscriptEngine, type ExecutionResult, type TealscriptEngineOptions } from './engine';
import {
  applyTealscriptBackendSelectionProfile,
  selectTealscriptExecutionBackend,
} from './backendSelection';
import { tryExecuteScript, type CompiledExecutionOptions } from './codegen/execute';
import { executeClosureScript, type ClosureExecutionOptions } from './closure/execute';

export interface SelectedTealscriptExecutionOptions extends TealscriptEngineOptions {
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
  if (selection.backend === 'closure') {
    return applyTealscriptBackendSelectionProfile(
      executeClosureScript(ast, bars, inputs, options as ClosureExecutionOptions),
      selection,
    );
  }

  if (selection.backend === 'interpreter') {
    return applyTealscriptBackendSelectionProfile(new TealscriptEngine(options).execute(ast, bars, inputs), selection);
  }

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
  const result = compiledResult ?? new TealscriptEngine(options).execute(ast, bars, inputs);
  if (!compiledResult && fallbackReason) {
    result.profile = {
      ...result.profile,
      fallbackReason,
    };
  }
  return applyTealscriptBackendSelectionProfile(result, selection);
}
