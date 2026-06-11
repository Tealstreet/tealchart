export { NumericSeries } from './runtime';
export type { NumericSeriesSnapshot } from './runtime';

export {
  SMA, EMA, RMA, RSI,
  Crossover, Crossunder, Change,
  Highest, Lowest,
  MACD, ATR, Stoch, StdDev, BB,
  DEMA, TEMA, Cum,
} from './ta-classes';
export type { Saveable, MACDResult, BBResult } from './ta-classes';

export { analyze } from './analyzer';
export type { AnalysisContext, TACallSite, VarDeclInfo, FuncInfo } from './analyzer';

export { emit, RUNTIME_HELPERS } from './emitter';

export { compile } from './compile';
export type { CompiledScript, CompiledBarContext, GeneratedScriptInstance, ScriptDependencies } from './compile';

export { executeCompiled, tryCompile } from './execute';
export type { CompiledExecutionOptions } from './execute';
