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
  createPineMatrix,
  isPineMatrix,
  isValidMatrix,
  isSquareMatrix,
  getMatrixRows,
  getMatrixColumns,
  getMatrixElementCount,
  getMatrixValue,
  setMatrixValue,
  copyMatrix,
  matrixRow,
  matrixColumn,
  fillMatrix,
  reshapeMatrix,
  addMatrixRow,
  addMatrixColumn,
  removeMatrixRow,
  removeMatrixColumn,
  swapMatrixRows,
  swapMatrixColumns,
  reverseMatrix,
  transposeMatrix,
  avgMatrixValue,
  minMatrixValue,
  maxMatrixValue,
  medianMatrixValue,
  modeMatrixValue,
  type PineMatrix,
} from './matrices';

export {
  createPineMap,
  isPineMap,
  getMapSize,
  putMapValue,
  getMapValue,
  containsMapKey,
  removeMapValue,
  clearMap,
  copyMap,
  mapKeys,
  mapValues,
  putAllMapValues,
  mapEntries,
  type PineMap,
} from './maps';

export {
  ExecutionContext,
  createContext,
  type Bar,
  type BarState,
  type SymInfo,
  type TimeframeInfo,
  type PlotOutput,
  type PlotStyle,
  type PlotLineStyle,
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
  PolylineDrawingOutput,
  TableCellDrawingOutput,
  TableDrawingOutput,
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
