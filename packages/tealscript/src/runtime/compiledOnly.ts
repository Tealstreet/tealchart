import type { Program } from '../parser/ast';
import type { Bar } from './context';
import { tryExecuteScript } from './codegen/execute';
import type { ExecutionResult, TealscriptExecutionOptions } from './types';

export type {
  ExecutionError,
  ExecutionResult,
  IndicatorDeclarationMetadata,
  RuntimeProfile,
  TealscriptExecutionOptions,
  TealscriptRuntimeOptions,
} from './types';

export function executeScript(
  ast: Program,
  bars: Bar[],
  inputs?: Map<string, unknown>,
  options?: TealscriptExecutionOptions,
): ExecutionResult {
  let fallbackReason: string | undefined;
  const result = tryExecuteScript(ast, bars, inputs, {
    runtime: options?.runtime,
    maxBarsBack: undefined,
    requestDatafeed: options?.requestDatafeed,
    libraries: options?.libraries,
    realtimeLastBar: options?.realtimeLastBar,
    confirmedRealtimeBarIndex: options?.confirmedRealtimeBarIndex,
    confirmedRealtimeBarStartIndex: options?.confirmedRealtimeBarStartIndex,
    onFallback: (reason) => {
      fallbackReason = reason;
    },
  });
  if (!result) {
    throw new Error(`Compiled TealScript execution failed${fallbackReason ? `: ${fallbackReason}` : ''}`);
  }
  return result;
}
