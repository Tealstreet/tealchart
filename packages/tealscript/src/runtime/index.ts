/**
 * Tealscript Runtime exports
 */

export { Series, seriesFrom, constantSeries, getValue, isSeries, type SeriesSnapshot, type MaybeSeriesValue } from './series';

export {
  createPineArray,
  isPineArray,
  getArraySize,
  getArrayValue,
  setArrayValue,
  pushArrayValue,
  popArrayValue,
  shiftArrayValue,
  unshiftArrayValue,
  clearArray,
  type PineArray,
} from './arrays';

export {
  ExecutionContext,
  createContext,
  type Bar,
  type BarState,
  type SymInfo,
  type TimeframeInfo,
  type PlotOutput,
  type PlotStyle,
  type InputDefinition,
} from './context';

export { Scope, createRootScope, type VarKind, type VariableEntry, type ScopeSnapshot } from './scope';

export {
  TealscriptEngine,
  executeScript,
  type ExecutionResult,
  type ExecutionError,
} from './engine';
