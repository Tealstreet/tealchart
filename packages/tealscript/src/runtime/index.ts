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
  copyArray,
  firstArrayValue,
  lastArrayValue,
  includesArrayValue,
  indexOfArrayValue,
  lastIndexOfArrayValue,
  insertArrayValue,
  removeArrayValue,
  minArrayValue,
  maxArrayValue,
  sumArrayValue,
  avgArrayValue,
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
  type AlertEvent,
  type AlertFrequency,
  type AlertOutput,
  type InputDefinition,
} from './context';

export type {
  DrawingOutput,
  LabelDrawingOutput,
  LineDrawingOutput,
  LineFillDrawingOutput,
  BoxDrawingOutput,
} from './drawings/types';

export { Scope, createRootScope, type VarKind, type VariableEntry, type ScopeSnapshot } from './scope';

export {
  TealscriptEngine,
  executeScript,
  type ExecutionResult,
  type ExecutionError,
} from './engine';
