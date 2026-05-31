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
  type LogLevel,
  type LogOutput,
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
  type TealscriptEngineOptions,
} from './engine';

export {
  InMemoryRequestDatafeed,
  currencyRateRequestKey,
  requestDatafeedKey,
  requestSeriesKey,
  type RequestDataContext,
  type RequestDatafeed,
  type RequestDatafeedErrorCode,
  type RequestDatafeedFailure,
  type RequestDatafeedKey,
  type RequestDatafeedQuery,
  type RequestDatafeedResult,
  type RequestDatafeedSuccess,
  type RequestSeriesContext,
  type RequestSeriesFamily,
  type RequestSeriesPoint,
  type RequestSeriesQuery,
  type RequestSeriesResult,
  type RequestSeriesSuccess,
} from './requestDatafeed';
