import type { Program, Expression, FunctionDeclaration, Statement } from '../../parser/ast';
import { analyze } from './analyzer';
import type { AnalysisContext, AnalyzeOptions, SecurityCallSite } from './analyzer';
import { emit, RUNTIME_HELPERS } from './emitter';
import {
  NumericSeries, ValueSeries,
  SMA, EMA, RMA, RSI, BarsSince, ValueWhen, Cross, Crossover, Crossunder, Change,
  Highest, Lowest, HighestBars, LowestBars, PivotHigh, PivotLow, Range, Rising, Falling, Max, Min,
  MACD, ATR, DMI, ADX, Supertrend, SAR, Stoch, StdDev, Variance, Dev, Covariance, Correlation, COG, Median, Mode,
  PercentileNearestRank, PercentileLinearInterpolation, PercentRank, LinReg, TrueRange, MFI, TSI, BBW, KC, KCW, KST, VWAP, RCI, BB,
  DEMA, TEMA, Cum, HMA, WMA, VWMA, SWMA, ALMA, CCI, CMO, WPR,
  AccumulationDistribution, IntradayIntensityIndex, NegativeVolumeIndex, PositiveVolumeIndex, PriceVolumeTrend,
  WilliamsAccumulationDistribution, WilliamsVariableAccumulationDistribution, BarIndex,
} from './index';
import * as arrFuncs from '../arrays';
import * as mapFuncs from '../maps';
import * as udtFuncs from '../objects';
import * as mtxFuncs from '../matrices';

export interface CompiledSecurityScript {
  ScriptClass: new (deps: ScriptDependencies) => GeneratedScriptInstance;
  generatedCode?: string;
}

export interface CompiledScript {
  ScriptClass: new (deps: ScriptDependencies) => GeneratedScriptInstance;
  analysis: AnalysisContext;
  success: boolean;
  unsupported: string[];
  generatedCode?: string;
  securityScripts: Map<number, CompiledSecurityScript>;
}

export type CompileOptions = AnalyzeOptions;

export interface ArrayHelpers {
  create(size?: unknown, val?: unknown): arrFuncs.PineArray;
  from(...args: unknown[]): arrFuncs.PineArray;
  push(arr: arrFuncs.PineArray, val: unknown): number;
  pop(arr: arrFuncs.PineArray): unknown;
  shift(arr: arrFuncs.PineArray): unknown;
  unshift(arr: arrFuncs.PineArray, val: unknown): number;
  get(arr: arrFuncs.PineArray, idx: number): unknown;
  set(arr: arrFuncs.PineArray, idx: number, val: unknown): void;
  size(arr: arrFuncs.PineArray): number;
  clear(arr: arrFuncs.PineArray): void;
  copy(arr: arrFuncs.PineArray): arrFuncs.PineArray;
  sort(arr: arrFuncs.PineArray, order?: unknown): void;
  sortIndices(arr: arrFuncs.PineArray, order?: unknown): arrFuncs.PineArray;
  reverse(arr: arrFuncs.PineArray): void;
  concat(arr: arrFuncs.PineArray, other: arrFuncs.PineArray): arrFuncs.PineArray;
  join(arr: arrFuncs.PineArray, sep?: unknown): string;
  slice(arr: arrFuncs.PineArray, from: number, to: number): arrFuncs.PineArray;
  includes(arr: arrFuncs.PineArray, val: unknown): boolean;
  indexOf(arr: arrFuncs.PineArray, val: unknown): number;
  lastIndexOf(arr: arrFuncs.PineArray, val: unknown): number;
  insert(arr: arrFuncs.PineArray, idx: number, val: unknown): number;
  remove(arr: arrFuncs.PineArray, idx: number): unknown;
  first(arr: arrFuncs.PineArray): unknown;
  last(arr: arrFuncs.PineArray): unknown;
  min(arr: arrFuncs.PineArray): number;
  max(arr: arrFuncs.PineArray): number;
  sum(arr: arrFuncs.PineArray): number;
  avg(arr: arrFuncs.PineArray): number;
  range(arr: arrFuncs.PineArray): number;
  median(arr: arrFuncs.PineArray): number;
  mode(arr: arrFuncs.PineArray): number;
  abs(arr: arrFuncs.PineArray): arrFuncs.PineArray;
  variance(arr: arrFuncs.PineArray, biased?: boolean): number;
  stdev(arr: arrFuncs.PineArray, biased?: boolean): number;
  covariance(left: arrFuncs.PineArray, right: arrFuncs.PineArray, biased?: boolean): number;
  standardize(arr: arrFuncs.PineArray): arrFuncs.PineArray;
  binarySearch(arr: arrFuncs.PineArray, val: unknown): number;
  binarySearchLeftmost(arr: arrFuncs.PineArray, val: unknown): number;
  binarySearchRightmost(arr: arrFuncs.PineArray, val: unknown): number;
  percentileNearestRank(arr: arrFuncs.PineArray, pct: number): number;
  percentileLinearInterpolation(arr: arrFuncs.PineArray, pct: number): number;
  percentRank(arr: arrFuncs.PineArray, idx: number): number;
  fill(arr: arrFuncs.PineArray, val: unknown, from?: number, to?: number): void;
  every(arr: arrFuncs.PineArray, fn: (val: unknown) => boolean): boolean;
  some(arr: arrFuncs.PineArray, fn: (val: unknown) => boolean): boolean;
  map(arr: arrFuncs.PineArray, fn: (val: unknown) => unknown): arrFuncs.PineArray;
  filter(arr: arrFuncs.PineArray, fn: (val: unknown) => boolean): arrFuncs.PineArray;
}

export interface MapHelpers {
  create(): mapFuncs.PineMap;
  put(map: mapFuncs.PineMap, key: unknown, value: unknown): unknown;
  get(map: mapFuncs.PineMap, key: unknown): unknown;
  contains(map: mapFuncs.PineMap, key: unknown): boolean;
  remove(map: mapFuncs.PineMap, key: unknown): unknown;
  clear(map: mapFuncs.PineMap): void;
  copy(map: mapFuncs.PineMap): mapFuncs.PineMap;
  keys(map: mapFuncs.PineMap): arrFuncs.PineArray;
  values(map: mapFuncs.PineMap): arrFuncs.PineArray;
  size(map: mapFuncs.PineMap): number;
  putAll(target: mapFuncs.PineMap, source: mapFuncs.PineMap): void;
}

export interface UdtHelpers {
  create(typeName: string, fields: Iterable<[string, unknown]>, varipFields: Iterable<string>): udtFuncs.PineUdtObject;
  getField(obj: udtFuncs.PineUdtObject, fieldName: string): unknown;
  setField(obj: udtFuncs.PineUdtObject, fieldName: string, value: unknown): void;
  copy(obj: udtFuncs.PineUdtObject): udtFuncs.PineUdtObject;
}

export interface MatrixHelpers {
  create(rows?: unknown, cols?: unknown, val?: unknown): mtxFuncs.PineMatrix;
  get(m: mtxFuncs.PineMatrix, row: number, col: number): unknown;
  set(m: mtxFuncs.PineMatrix, row: number, col: number, val: unknown): void;
  rows(m: mtxFuncs.PineMatrix): number;
  columns(m: mtxFuncs.PineMatrix): number;
  elementCount(m: mtxFuncs.PineMatrix): number;
  copy(m: mtxFuncs.PineMatrix): mtxFuncs.PineMatrix;
  concat(a: mtxFuncs.PineMatrix, b: mtxFuncs.PineMatrix): mtxFuncs.PineMatrix;
  row(m: mtxFuncs.PineMatrix, r: number): arrFuncs.PineArray;
  col(m: mtxFuncs.PineMatrix, c: number): arrFuncs.PineArray;
  fill(m: mtxFuncs.PineMatrix, val: unknown): void;
  reshape(m: mtxFuncs.PineMatrix, r: number, c: number): void;
  addRow(m: mtxFuncs.PineMatrix, r: number, vals?: arrFuncs.PineArray): void;
  addCol(m: mtxFuncs.PineMatrix, c: number, vals?: arrFuncs.PineArray): void;
  removeRow(m: mtxFuncs.PineMatrix, r: number): arrFuncs.PineArray;
  removeCol(m: mtxFuncs.PineMatrix, c: number): arrFuncs.PineArray;
  swapRows(m: mtxFuncs.PineMatrix, a: number, b: number): void;
  swapCols(m: mtxFuncs.PineMatrix, a: number, b: number): void;
  reverse(m: mtxFuncs.PineMatrix): void;
  transpose(m: mtxFuncs.PineMatrix): mtxFuncs.PineMatrix;
  avg(m: mtxFuncs.PineMatrix): number;
  min(m: mtxFuncs.PineMatrix): number;
  max(m: mtxFuncs.PineMatrix): number;
  median(m: mtxFuncs.PineMatrix): number;
  mode(m: mtxFuncs.PineMatrix): number;
  sum(a: mtxFuncs.PineMatrix, b?: mtxFuncs.PineMatrix): mtxFuncs.PineMatrix | number;
  diff(a: mtxFuncs.PineMatrix, b: mtxFuncs.PineMatrix): mtxFuncs.PineMatrix;
  mult(a: mtxFuncs.PineMatrix, b: unknown): mtxFuncs.PineMatrix;
  pow(m: mtxFuncs.PineMatrix, p: number): mtxFuncs.PineMatrix;
  trace(m: mtxFuncs.PineMatrix): number;
  det(m: mtxFuncs.PineMatrix): number;
  rank(m: mtxFuncs.PineMatrix): number;
  inv(m: mtxFuncs.PineMatrix): mtxFuncs.PineMatrix;
  pinv(m: mtxFuncs.PineMatrix): mtxFuncs.PineMatrix;
  eigenvalues(m: mtxFuncs.PineMatrix): arrFuncs.PineArray;
  eigenvectors(m: mtxFuncs.PineMatrix): mtxFuncs.PineMatrix;
  kron(a: mtxFuncs.PineMatrix, b: mtxFuncs.PineMatrix): mtxFuncs.PineMatrix;
  sort(m: mtxFuncs.PineMatrix, col: number, order?: unknown): void;
  submatrix(m: mtxFuncs.PineMatrix, fr: number, tr: number, fc: number, tc: number): mtxFuncs.PineMatrix;
  isSquare(m: mtxFuncs.PineMatrix): boolean;
  isZero(m: mtxFuncs.PineMatrix): boolean;
  isBinary(m: mtxFuncs.PineMatrix): boolean;
  isIdentity(m: mtxFuncs.PineMatrix): boolean;
  isDiagonal(m: mtxFuncs.PineMatrix): boolean;
  isAntidiagonal(m: mtxFuncs.PineMatrix): boolean;
  isSymmetric(m: mtxFuncs.PineMatrix): boolean;
  isAntisymmetric(m: mtxFuncs.PineMatrix): boolean;
  isTriangular(m: mtxFuncs.PineMatrix): boolean;
  isStochastic(m: mtxFuncs.PineMatrix): boolean;
  isValid(m: mtxFuncs.PineMatrix): boolean;
}

export interface ScriptDependencies {
  NumericSeries: typeof NumericSeries;
  ValueSeries: typeof ValueSeries;
  maxBarsBack: number;
  _arr: ArrayHelpers;
  _map: MapHelpers;
  _udt: UdtHelpers;
  _mtx: MatrixHelpers;
  SMA: typeof SMA;
  EMA: typeof EMA;
  RMA: typeof RMA;
  RSI: typeof RSI;
  BarsSince: typeof BarsSince;
  ValueWhen: typeof ValueWhen;
  Cross: typeof Cross;
  Crossover: typeof Crossover;
  Crossunder: typeof Crossunder;
  Change: typeof Change;
  Highest: typeof Highest;
  Lowest: typeof Lowest;
  HighestBars: typeof HighestBars;
  LowestBars: typeof LowestBars;
  PivotHigh: typeof PivotHigh;
  PivotLow: typeof PivotLow;
  Range: typeof Range;
  Rising: typeof Rising;
  Falling: typeof Falling;
  Max: typeof Max;
  Min: typeof Min;
  MACD: typeof MACD;
  ATR: typeof ATR;
  DMI: typeof DMI;
  ADX: typeof ADX;
  Supertrend: typeof Supertrend;
  SAR: typeof SAR;
  Stoch: typeof Stoch;
  StdDev: typeof StdDev;
  Variance: typeof Variance;
  Dev: typeof Dev;
  Covariance: typeof Covariance;
  Correlation: typeof Correlation;
  COG: typeof COG;
  Median: typeof Median;
  Mode: typeof Mode;
  PercentileNearestRank: typeof PercentileNearestRank;
  PercentileLinearInterpolation: typeof PercentileLinearInterpolation;
  PercentRank: typeof PercentRank;
  LinReg: typeof LinReg;
  TrueRange: typeof TrueRange;
  MFI: typeof MFI;
  TSI: typeof TSI;
  BBW: typeof BBW;
  KC: typeof KC;
  KCW: typeof KCW;
  KST: typeof KST;
  VWAP: typeof VWAP;
  RCI: typeof RCI;
  BB: typeof BB;
  DEMA: typeof DEMA;
  TEMA: typeof TEMA;
  Cum: typeof Cum;
  HMA: typeof HMA;
  WMA: typeof WMA;
  VWMA: typeof VWMA;
  SWMA: typeof SWMA;
  ALMA: typeof ALMA;
  CCI: typeof CCI;
  CMO: typeof CMO;
  WPR: typeof WPR;
  AccumulationDistribution: typeof AccumulationDistribution;
  IntradayIntensityIndex: typeof IntradayIntensityIndex;
  NegativeVolumeIndex: typeof NegativeVolumeIndex;
  PositiveVolumeIndex: typeof PositiveVolumeIndex;
  PriceVolumeTrend: typeof PriceVolumeTrend;
  WilliamsAccumulationDistribution: typeof WilliamsAccumulationDistribution;
  WilliamsVariableAccumulationDistribution: typeof WilliamsVariableAccumulationDistribution;
  BarIndex: typeof BarIndex;
}

export interface GeneratedScriptInstance {
  onBar(ctx: CompiledBarContext): void;
  save(): unknown;
  restore(snap: unknown): void;
}

export interface CompiledBarContext {
  bar: { open: number; high: number; low: number; close: number; volume: number; time: number };
  barIndex: number;
  lastBarIndex: number;
  isFirstTick: boolean;
  barstate: {
    isfirst: boolean;
    islast: boolean;
    ishistory: boolean;
    isrealtime: boolean;
    isnew: boolean;
    isconfirmed: boolean;
    islastconfirmedhistory: boolean;
  };
  syminfo: Record<string, unknown>;
  timeframe: Record<string, unknown>;
  chart: Record<string, unknown>;
  plot(index: number, funcName: string, funcCallIndex: number, value: unknown, named: Record<string, string>, extraArgs: unknown[]): void;
  input(id: string, funcName: string, defval: unknown, named: Record<string, string>, extraArgs: unknown[]): unknown;
  strategyEntry(...args: unknown[]): void;
  strategyExit(...args: unknown[]): void;
  strategyClose(...args: unknown[]): void;
  strategyCloseAll(...args: unknown[]): void;
  strategyCancel(...args: unknown[]): void;
  strategyCancelAll(...args: unknown[]): void;
  strategyOrder(...args: unknown[]): void;
  strategyDefaultEntryQty(args: unknown[], named?: Record<string, unknown>): unknown;
  strategyProp(name: string): unknown;
  strategyPropHistory(name: string, offset: unknown): unknown;
  strategyTradeProp(name: string, args: unknown[], named?: Record<string, unknown>): unknown;
  strategyRisk(name: string, args: unknown[], named?: Record<string, unknown>): unknown;
  alert(args: unknown[], named?: Record<string, unknown>, callId?: string): void;
  alertCondition(args: unknown[], named?: Record<string, unknown>, callId?: string): unknown;
  logInfo(args: unknown[], named?: Record<string, unknown>): void;
  logWarning(args: unknown[], named?: Record<string, unknown>): void;
  logError(args: unknown[], named?: Record<string, unknown>): void;
  drawingCount(): number;
  markDrawingsPersistentFrom(index: number): void;
  markPersistentRuntimeValue(value: unknown): void;
  markPersistentArrayDrawing(array: arrFuncs.PineArray, value: unknown): void;
  markPersistentUdtField(object: unknown, fieldName: string): void;
  arrayPush(array: arrFuncs.PineArray, value: unknown): number;
  arraySet(array: arrFuncs.PineArray, index: number, value: unknown): void;
  arrayUnshift(array: arrFuncs.PineArray, value: unknown): number;
  arrayInsert(array: arrFuncs.PineArray, index: number, value: unknown): number;
  arrayConcat(array: arrFuncs.PineArray, other: arrFuncs.PineArray): arrFuncs.PineArray;
  runtimeError(args: unknown[], named?: Record<string, unknown>, line?: number, column?: number): void;
  capture(name: string): unknown;
  captureSource(name: string): unknown;
  timestamp(args: unknown[], named?: Record<string, unknown>): number;
  timeFilter(closeTime: boolean, args: unknown[], named?: Record<string, unknown>): number;
  calendarPart(part: string, args: unknown[], named?: Record<string, unknown>): number;
  runtimeTimeValue(name: string, offset?: number): number;
  sessionValue(name: string): unknown;
  requestSecurity(
    secId: number,
    symbol: unknown,
    timeframe: unknown,
    gaps: unknown,
    lookahead: unknown,
    ignoreInvalidSymbol: unknown,
    currency: unknown,
    calcBarsCount: unknown,
    sourceDescriptor?: unknown,
    captures?: Record<string, unknown>,
  ): unknown;
  requestSecurityLowerTf(
    secId: number,
    symbol: unknown,
    timeframe: unknown,
    ignoreInvalidSymbol: unknown,
    currency: unknown,
    ignoreInvalidTimeframe: unknown,
    calcBarsCount: unknown,
    sourceDescriptor?: unknown,
    captures?: Record<string, unknown>,
  ): unknown;
  requestCurrencyRate(args: unknown[], named?: Record<string, unknown>): unknown;
  requestPointSeries(name: string, args: unknown[], named?: Record<string, unknown>): unknown;
  requestFootprint(args: unknown[], named?: Record<string, unknown>): unknown;
  requestSeed(
    secId: number,
    source: unknown,
    symbol: unknown,
    ignoreInvalidSymbol: unknown,
    calcBarsCount: unknown,
    sourceDescriptor?: unknown,
    captures?: Record<string, unknown>,
  ): unknown;
  nextBuiltinCallId(name: string): string;
  callBuiltin(name: string, args: unknown[], named?: Record<string, unknown>, callId?: string): unknown;
  callMethodBuiltin(name: string, receiver: unknown, args: unknown[], named?: Record<string, unknown>, callId?: string): unknown;
  footprintMethod(name: string, receiver: unknown, args: unknown[], named?: Record<string, unknown>, callId?: string): unknown;
  tickerNew(args: unknown[], named?: Record<string, unknown>): string;
  tickerModify(args: unknown[], named?: Record<string, unknown>): string;
  tickerStandard(args: unknown[], named?: Record<string, unknown>): string;
  tickerInherit(args: unknown[], named?: Record<string, unknown>): string;
  tickerHeikinashi(args: unknown[], named?: Record<string, unknown>): string;
  tickerRenko(args: unknown[], named?: Record<string, unknown>): string;
  tickerKagi(args: unknown[], named?: Record<string, unknown>): string;
  tickerLinebreak(args: unknown[], named?: Record<string, unknown>): string;
  tickerPointfigure(args: unknown[], named?: Record<string, unknown>): string;
  colorNew(args: unknown[], named?: Record<string, unknown>): unknown;
  colorRgb(args: unknown[], named?: Record<string, unknown>): unknown;
  colorR(args: unknown[], named?: Record<string, unknown>): unknown;
  colorG(args: unknown[], named?: Record<string, unknown>): unknown;
  colorB(args: unknown[], named?: Record<string, unknown>): unknown;
  colorT(args: unknown[], named?: Record<string, unknown>): unknown;
  colorFromGradient(args: unknown[], named?: Record<string, unknown>): unknown;
  mathCall(name: string, args: unknown[], named?: Record<string, unknown>, callId?: string): unknown;
  mathSum(...args: unknown[]): unknown;
  strFormat(args: unknown[], named?: Record<string, unknown>): string;
  strFormatTime(args: unknown[], named?: Record<string, unknown>): string;
}

function fillArray(arr: arrFuncs.PineArray, val: unknown, from?: number, to?: number): void {
  const size = arrFuncs.getArraySize(arr);
  const start = from ?? 0;
  const end = to ?? size;
  for (let i = start; i < end; i++) {
    arrFuncs.setArrayValue(arr, i, val);
  }
}

function isPineTruthy(value: unknown): boolean {
  return value !== false
    && value !== 0
    && value !== null
    && value !== undefined
    && !(typeof value === 'number' && Number.isNaN(value));
}

function everyArray(arr: arrFuncs.PineArray, fn?: (val: unknown) => boolean): boolean {
  const size = arrFuncs.getArraySize(arr);
  for (let i = 0; i < size; i++) {
    const value = arrFuncs.getArrayValue(arr, i);
    if (!(fn ? fn(value) : isPineTruthy(value))) return false;
  }
  return true;
}

function someArray(arr: arrFuncs.PineArray, fn?: (val: unknown) => boolean): boolean {
  const size = arrFuncs.getArraySize(arr);
  for (let i = 0; i < size; i++) {
    const value = arrFuncs.getArrayValue(arr, i);
    if (fn ? fn(value) : isPineTruthy(value)) return true;
  }
  return false;
}

function mapArray(arr: arrFuncs.PineArray, fn: (val: unknown) => unknown): arrFuncs.PineArray {
  const result = arrFuncs.createPineArray();
  const size = arrFuncs.getArraySize(arr);
  for (let i = 0; i < size; i++) {
    arrFuncs.pushArrayValue(result, fn(arrFuncs.getArrayValue(arr, i)));
  }
  return result;
}

function filterArray(arr: arrFuncs.PineArray, fn: (val: unknown) => boolean): arrFuncs.PineArray {
  const result = arrFuncs.createPineArray();
  const size = arrFuncs.getArraySize(arr);
  for (let i = 0; i < size; i++) {
    const val = arrFuncs.getArrayValue(arr, i);
    if (fn(val)) arrFuncs.pushArrayValue(result, val);
  }
  return result;
}

export const ARRAY_HELPERS: ArrayHelpers = {
  create: (size?: unknown, val?: unknown) => arrFuncs.createPineArray(Number(size) || 0, val),
  from: (...args: unknown[]) => {
    const arr = arrFuncs.createPineArray();
    for (const v of args) arrFuncs.pushArrayValue(arr, v);
    return arr;
  },
  push: arrFuncs.pushArrayValue,
  pop: arrFuncs.popArrayValue,
  shift: arrFuncs.shiftArrayValue,
  unshift: arrFuncs.unshiftArrayValue,
  get: arrFuncs.getArrayValue,
  set: arrFuncs.setArrayValue,
  size: arrFuncs.getArraySize,
  clear: arrFuncs.clearArray,
  copy: arrFuncs.copyArray,
  sort: arrFuncs.sortArray,
  sortIndices: arrFuncs.sortIndicesArrayValue,
  reverse: arrFuncs.reverseArray,
  concat: arrFuncs.concatArray,
  join: arrFuncs.joinArray,
  slice: arrFuncs.sliceArray,
  includes: arrFuncs.includesArrayValue,
  indexOf: arrFuncs.indexOfArrayValue,
  lastIndexOf: arrFuncs.lastIndexOfArrayValue,
  insert: arrFuncs.insertArrayValue,
  remove: arrFuncs.removeArrayValue,
  first: arrFuncs.firstArrayValue,
  last: arrFuncs.lastArrayValue,
  min: arrFuncs.minArrayValue,
  max: arrFuncs.maxArrayValue,
  sum: arrFuncs.sumArrayValue,
  avg: arrFuncs.avgArrayValue,
  range: arrFuncs.rangeArrayValue,
  median: arrFuncs.medianArrayValue,
  mode: arrFuncs.modeArrayValue,
  abs: arrFuncs.absArrayValue,
  variance: arrFuncs.varianceArrayValue,
  stdev: arrFuncs.stdevArrayValue,
  covariance: arrFuncs.covarianceArrayValue,
  standardize: arrFuncs.standardizeArrayValue,
  binarySearch: arrFuncs.binarySearchArrayValue,
  binarySearchLeftmost: arrFuncs.binarySearchLeftmostArrayValue,
  binarySearchRightmost: arrFuncs.binarySearchRightmostArrayValue,
  percentileNearestRank: arrFuncs.percentileNearestRankArrayValue,
  percentileLinearInterpolation: arrFuncs.percentileLinearInterpolationArrayValue,
  percentRank: arrFuncs.percentRankArrayValue,
  fill: fillArray,
  every: everyArray,
  some: someArray,
  map: mapArray,
  filter: filterArray,
} as ArrayHelpers;

export const MAP_HELPERS: MapHelpers = {
  create: mapFuncs.createPineMap,
  put: mapFuncs.putMapValue,
  get: mapFuncs.getMapValue,
  contains: mapFuncs.containsMapKey,
  remove: mapFuncs.removeMapValue,
  clear: mapFuncs.clearMap,
  copy: mapFuncs.copyMap,
  keys: mapFuncs.mapKeys,
  values: mapFuncs.mapValues,
  size: mapFuncs.getMapSize,
  putAll: mapFuncs.putAllMapValues,
};

export const UDT_HELPERS: UdtHelpers = {
  create: udtFuncs.createPineUdtObject,
  getField: udtFuncs.getUdtField,
  setField: udtFuncs.setUdtField,
  copy: udtFuncs.copyUdtObject,
};

export const MATRIX_HELPERS: MatrixHelpers = {
  create: (rows?: unknown, cols?: unknown, val?: unknown) =>
    mtxFuncs.createPineMatrix(Number(rows) || 0, Number(cols) || 0, val),
  get: mtxFuncs.getMatrixValue,
  set: mtxFuncs.setMatrixValue,
  rows: mtxFuncs.getMatrixRows,
  columns: mtxFuncs.getMatrixColumns,
  elementCount: mtxFuncs.getMatrixElementCount,
  copy: mtxFuncs.copyMatrix,
  concat: mtxFuncs.concatMatrix,
  row: mtxFuncs.matrixRow,
  col: mtxFuncs.matrixColumn,
  fill: mtxFuncs.fillMatrix,
  reshape: mtxFuncs.reshapeMatrix,
  addRow: mtxFuncs.addMatrixRow,
  addCol: mtxFuncs.addMatrixColumn,
  removeRow: mtxFuncs.removeMatrixRow,
  removeCol: mtxFuncs.removeMatrixColumn,
  swapRows: mtxFuncs.swapMatrixRows,
  swapCols: mtxFuncs.swapMatrixColumns,
  reverse: mtxFuncs.reverseMatrix,
  transpose: mtxFuncs.transposeMatrix,
  avg: mtxFuncs.avgMatrixValue,
  min: mtxFuncs.minMatrixValue,
  max: mtxFuncs.maxMatrixValue,
  median: mtxFuncs.medianMatrixValue,
  mode: mtxFuncs.modeMatrixValue,
  sum: mtxFuncs.sumMatrixValue,
  diff: mtxFuncs.diffMatrixValue,
  mult: mtxFuncs.multMatrixValue,
  pow: mtxFuncs.powMatrixValue,
  trace: mtxFuncs.traceMatrixValue,
  det: mtxFuncs.detMatrixValue,
  rank: mtxFuncs.rankMatrixValue,
  inv: mtxFuncs.invMatrixValue,
  pinv: mtxFuncs.pinvMatrixValue,
  eigenvalues: mtxFuncs.eigenvaluesMatrixValue,
  eigenvectors: mtxFuncs.eigenvectorsMatrixValue,
  kron: mtxFuncs.kronMatrixValue,
  sort: mtxFuncs.sortMatrixRows,
  submatrix: mtxFuncs.submatrixValue,
  isSquare: mtxFuncs.isSquareMatrix,
  isZero: mtxFuncs.isZeroMatrix,
  isBinary: mtxFuncs.isBinaryMatrix,
  isIdentity: mtxFuncs.isIdentityMatrix,
  isDiagonal: mtxFuncs.isDiagonalMatrix,
  isAntidiagonal: mtxFuncs.isAntidiagonalMatrix,
  isSymmetric: mtxFuncs.isSymmetricMatrix,
  isAntisymmetric: mtxFuncs.isAntisymmetricMatrix,
  isTriangular: mtxFuncs.isTriangularMatrix,
  isStochastic: mtxFuncs.isStochasticMatrix,
  isValid: mtxFuncs.isValidMatrix,
} as MatrixHelpers;

const DEFAULT_DEPS: ScriptDependencies = {
  NumericSeries,
  ValueSeries,
  maxBarsBack: 500,
  _arr: ARRAY_HELPERS,
  _map: MAP_HELPERS,
  _udt: UDT_HELPERS,
  _mtx: MATRIX_HELPERS,
  SMA, EMA, RMA, RSI, BarsSince, ValueWhen, Cross, Crossover, Crossunder, Change,
  Highest, Lowest, HighestBars, LowestBars, PivotHigh, PivotLow, Range, Rising, Falling, Max, Min,
  MACD, ATR, DMI, ADX, Supertrend, SAR, Stoch, StdDev, Variance, Dev, Covariance, Correlation, COG, Median, Mode,
  PercentileNearestRank, PercentileLinearInterpolation, PercentRank, LinReg, TrueRange, MFI, TSI, BBW, KC, KCW, KST, VWAP, RCI, BB,
  DEMA, TEMA, Cum, HMA, WMA, VWMA, SWMA, ALMA, CCI, CMO, WPR,
  AccumulationDistribution, IntradayIntensityIndex, NegativeVolumeIndex, PositiveVolumeIndex, PriceVolumeTrend,
  WilliamsAccumulationDistribution, WilliamsVariableAccumulationDistribution, BarIndex,
};

function expressionFullName(expr: Expression): string | null {
  if (expr.type === 'Identifier') return expr.name;
  if (expr.type === 'MemberExpression') {
    const objectName = expressionFullName(expr.object);
    return objectName ? `${objectName}.${expr.property.name}` : expr.property.name;
  }
  return null;
}

function isRequestFullName(fullName: string | null): boolean {
  return fullName === 'request.security'
    || fullName === 'security'
    || fullName === 'request.security_lower_tf'
    || fullName === 'request.seed';
}

function buildRequestFunctionMap(parentAST: Program, securityNodes: Set<unknown>): Map<string, boolean> {
  const functionBodies = new Map<string, Expression | Statement[]>();
  for (const stmt of parentAST.body) {
    if (stmt.type === 'FunctionDeclaration') {
      functionBodies.set(stmt.name.name, stmt.body);
    }
  }

  const functionContainsRequest = new Map<string, boolean>();
  const visiting = new Set<string>();
  const hasRequest = (name: string): boolean => {
    const cached = functionContainsRequest.get(name);
    if (cached !== undefined) return cached;
    const body = functionBodies.get(name);
    if (!body || visiting.has(name)) return false;
    visiting.add(name);
    const contains = Array.isArray(body)
      ? body.some((stmt) => nodeContainsRequest(stmt, securityNodes, hasRequest))
      : nodeContainsRequest(body, securityNodes, hasRequest);
    visiting.delete(name);
    functionContainsRequest.set(name, contains);
    return contains;
  };

  for (const stmt of parentAST.body) {
    if (stmt.type === 'FunctionDeclaration') {
      hasRequest(stmt.name.name);
    }
  }
  return functionContainsRequest;
}

function nodeContainsRequest(
  node: unknown,
  securityNodes: Set<unknown>,
  functionContainsRequest: (name: string) => boolean,
): boolean {
  if (!node || typeof node !== 'object') return false;
  const maybeNode = node as { type?: string; callee?: Expression };
  if (maybeNode.type === 'CallExpression') {
    if (securityNodes.has(node)) return true;
    const fullName = maybeNode.callee ? expressionFullName(maybeNode.callee) : null;
    if (isRequestFullName(fullName)) return true;
    if (fullName && !fullName.includes('.') && functionContainsRequest(fullName)) return true;
  }

  for (const value of Object.values(node)) {
    if (value === node || typeof value === 'function') continue;
    if (Array.isArray(value)) {
      if (value.some((item) => nodeContainsRequest(item, securityNodes, functionContainsRequest))) return true;
    } else if (value && typeof value === 'object' && nodeContainsRequest(value, securityNodes, functionContainsRequest)) {
      return true;
    }
  }
  return false;
}

function nodeContainsExact(node: unknown, target: unknown): boolean {
  if (node === target) return true;
  if (!node || typeof node !== 'object') return false;
  for (const value of Object.values(node)) {
    if (value === target) return true;
    if (Array.isArray(value)) {
      if (value.some((item) => nodeContainsExact(item, target))) return true;
    } else if (value && typeof value === 'object' && nodeContainsExact(value, target)) {
      return true;
    }
  }
  return false;
}

function variableDeclarationNames(stmt: Statement): string[] {
  if (stmt.type !== 'VariableDeclaration') return [];
  if (stmt.names.type === 'VariableDeclarator') return [stmt.names.name.name];
  return stmt.names.names.map((name) => name.name).filter((name) => name !== '_');
}

function collectExpressionReferences(expr: Expression, references = new Set<string>()): Set<string> {
  switch (expr.type) {
    case 'Identifier':
      references.add(expr.name);
      return references;
    case 'MemberExpression':
      collectExpressionReferences(expr.object, references);
      return references;
    case 'CallExpression':
      collectExpressionReferences(expr.callee, references);
      for (const arg of expr.arguments) collectExpressionReferences(arg.value, references);
      return references;
    case 'UnaryExpression':
      return collectExpressionReferences(expr.argument, references);
    case 'BinaryExpression':
      collectExpressionReferences(expr.left, references);
      collectExpressionReferences(expr.right, references);
      return references;
    case 'ConditionalExpression':
      collectExpressionReferences(expr.test, references);
      collectExpressionReferences(expr.consequent, references);
      collectExpressionReferences(expr.alternate, references);
      return references;
    case 'ArrayExpression':
      for (const element of expr.elements) collectExpressionReferences(element, references);
      return references;
    case 'IndexExpression':
      collectExpressionReferences(expr.object, references);
      collectExpressionReferences(expr.index, references);
      return references;
    case 'SwitchExpression':
      if (expr.discriminant) collectExpressionReferences(expr.discriminant, references);
      for (const switchCase of expr.cases) {
        if (switchCase.test) collectExpressionReferences(switchCase.test, references);
        if (Array.isArray(switchCase.consequent)) {
          for (const stmt of switchCase.consequent) collectStatementReferences(stmt, references);
        } else {
          collectExpressionReferences(switchCase.consequent, references);
        }
      }
      return references;
    case 'ForStatement':
      collectStatementReferences(expr, references);
      return references;
    case 'WhileStatement':
      collectStatementReferences(expr, references);
      return references;
    case 'LambdaExpression':
      collectExpressionReferences(expr.body, references);
      for (const param of expr.params) references.delete(param.name);
      return references;
    default:
      return references;
  }
}

function collectStatementReferences(stmt: Statement, references = new Set<string>()): Set<string> {
  if (stmt.type === 'VariableDeclaration' && stmt.init.type !== 'IfStatement') {
    collectExpressionReferences(stmt.init, references);
  } else if (stmt.type === 'ExpressionStatement') {
    collectExpressionReferences(stmt.expression, references);
  } else if (stmt.type === 'MultiExpressionStatement') {
    for (const expr of stmt.expressions) collectExpressionReferences(expr, references);
  } else if (stmt.type === 'MultiDeclaration') {
    for (const declaration of stmt.declarations) collectStatementReferences(declaration, references);
  } else if (stmt.type === 'MultiAssignment') {
    for (const assignment of stmt.assignments) collectStatementReferences(assignment, references);
  } else if (stmt.type === 'MultiStatement') {
    for (const child of stmt.statements) collectStatementReferences(child, references);
  } else if (stmt.type === 'TupleAssignment' && stmt.right.type !== 'IfStatement') {
    collectExpressionReferences(stmt.right, references);
  } else if (stmt.type === 'AssignmentStatement' && stmt.right.type !== 'IfStatement') {
    collectExpressionReferences(stmt.right, references);
  } else if (stmt.type === 'IfStatement') {
    collectExpressionReferences(stmt.test, references);
    for (const child of stmt.consequent) collectStatementReferences(child, references);
    if (Array.isArray(stmt.alternate)) {
      for (const child of stmt.alternate) collectStatementReferences(child, references);
    } else if (stmt.alternate) {
      collectStatementReferences(stmt.alternate, references);
    }
  } else if (stmt.type === 'OnceStatement') {
    if (stmt.test) collectExpressionReferences(stmt.test, references);
    for (const child of stmt.body) collectStatementReferences(child, references);
  } else if (stmt.type === 'ForStatement') {
    if (stmt.kind === 'numeric') {
      collectExpressionReferences(stmt.start, references);
      collectExpressionReferences(stmt.end, references);
      if (stmt.step) collectExpressionReferences(stmt.step, references);
    } else {
      collectExpressionReferences(stmt.iterable, references);
    }
    for (const child of stmt.body) collectStatementReferences(child, references);
  } else if (stmt.type === 'WhileStatement') {
    collectExpressionReferences(stmt.test, references);
    for (const child of stmt.body) collectStatementReferences(child, references);
  }
  return references;
}

function collectFunctionBodyReferences(fn: FunctionDeclaration): Set<string> {
  const references = new Set<string>();
  if (Array.isArray(fn.body)) {
    for (const stmt of fn.body) collectStatementReferences(stmt, references);
  } else {
    collectExpressionReferences(fn.body, references);
  }

  for (const param of fn.params) references.delete(param.name);
  if (Array.isArray(fn.body)) {
    for (const stmt of fn.body) {
      for (const name of variableDeclarationNames(stmt)) references.delete(name);
    }
  }
  return references;
}

function collectSecurityGlobalDependencies(
  site: SecurityCallSite,
  parentAST: Program,
  ownerIndex: number,
  securityNodes: Set<unknown>,
  functionContainsRequest: (name: string) => boolean,
  captureNames?: Set<string>,
): Set<Statement> {
  const priorDeclarations = parentAST.body.slice(0, ownerIndex === -1 ? parentAST.body.length : ownerIndex)
    .filter((stmt): stmt is Extract<Statement, { type: 'VariableDeclaration' }> => stmt.type === 'VariableDeclaration');
  const declarationByName = new Map<string, Extract<Statement, { type: 'VariableDeclaration' }>>();
  for (const stmt of priorDeclarations) {
    for (const name of variableDeclarationNames(stmt)) declarationByName.set(name, stmt);
  }
  const candidates = priorDeclarations
    .filter((stmt): stmt is Extract<Statement, { type: 'VariableDeclaration' }> => (
      isRequestReplayableGlobalStatement(stmt, securityNodes, functionContainsRequest)
    ));
  const functionDecls = new Map<string, FunctionDeclaration>();
  for (const stmt of parentAST.body) {
    if (stmt.type === 'FunctionDeclaration') functionDecls.set(stmt.name.name, stmt);
  }
  const needed = collectSecuritySiteReferences(site);
  const expandedFunctions = new Set<string>();
  const included = new Set<Statement>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const name of Array.from(needed)) {
      if (expandedFunctions.has(name)) continue;
      const fn = functionDecls.get(name);
      if (!fn) continue;
      expandedFunctions.add(name);
      for (const reference of collectFunctionBodyReferences(fn)) {
        if (!needed.has(reference)) {
          needed.add(reference);
          changed = true;
        }
      }
    }
    for (const stmt of candidates) {
      if (included.has(stmt)) continue;
      if (!variableDeclarationNames(stmt).some((name) => needed.has(name))) continue;
      included.add(stmt);
      for (const reference of collectStatementReferences(stmt)) {
        if (!needed.has(reference)) {
          needed.add(reference);
          changed = true;
        }
      }
    }
  }
  if (captureNames) {
    for (const name of needed) {
      const declaration = declarationByName.get(name);
      if (declaration && !included.has(declaration)) captureNames.add(name);
    }
  }
  return included;
}

function isRequestReplayableGlobalStatement(
  stmt: Extract<Statement, { type: 'VariableDeclaration' }>,
  securityNodes: Set<unknown>,
  functionContainsRequest: (name: string) => boolean,
): boolean {
  // Dependency-selected `var`/`varip` globals get an independent requested-
  // context state, just like regular globals. Only declarations that perform a
  // request or depend on block execution are excluded from replay.
  if (stmt.init.type === 'IfStatement') return false;
  if (nodeContainsRequest(stmt.init, securityNodes, functionContainsRequest)) return false;
  return true;
}

function collectSecuritySiteReferences(site: SecurityCallSite): Set<string> {
  // Keep this list aligned with every expression/statement-bearing field on
  // SecurityCallSite. Non-expression metadata fields are `id`, `kind`, `node`,
  // `taCallSites`, `expressionSourceParam`, `expressionCaptureParams`, and
  // `importedAliasContext`.
  const references = collectExpressionReferences(site.expressionExpr);
  if (site.sourceExpr) collectExpressionReferences(site.sourceExpr, references);
  collectExpressionReferences(site.symbolExpr, references);
  collectExpressionReferences(site.timeframeExpr, references);
  if (site.gapsExpr) collectExpressionReferences(site.gapsExpr, references);
  if (site.lookaheadExpr) collectExpressionReferences(site.lookaheadExpr, references);
  if (site.ignoreInvalidSymbolExpr) collectExpressionReferences(site.ignoreInvalidSymbolExpr, references);
  if (site.currencyExpr) collectExpressionReferences(site.currencyExpr, references);
  if (site.ignoreInvalidTimeframeExpr) collectExpressionReferences(site.ignoreInvalidTimeframeExpr, references);
  if (site.calcBarsCountExpr) collectExpressionReferences(site.calcBarsCountExpr, references);
  for (const stmt of site.expressionLocalStatements ?? []) {
    collectStatementReferences(stmt, references);
  }
  return references;
}

function prepareSecurityCaptureParams(parentAST: Program, analysis: AnalysisContext, securityNodes: Set<unknown>): void {
  const requestFunctionMap = buildRequestFunctionMap(parentAST, securityNodes);
  const functionContainsRequest = (name: string) => requestFunctionMap.get(name) === true;
  for (const site of analysis.securitySites) {
    const ownerIndex = parentAST.body.findIndex((stmt) => nodeContainsExact(stmt, site.node));
    const captureNames = new Set(site.expressionCaptureParams ?? []);
    collectSecurityGlobalDependencies(site, parentAST, ownerIndex, securityNodes, functionContainsRequest, captureNames);
    site.expressionCaptureParams = captureNames.size > 0 ? [...captureNames].sort() : undefined;
  }
}

function buildSecurityAST(site: SecurityCallSite, parentAST: Program, securityNodes: Set<unknown>): Program {
  const body: Statement[] = [
    {
      type: 'IndicatorDeclaration',
      declarationKind: 'indicator',
      title: { type: 'StringLiteral', value: `security_${site.id}` },
    } as Statement,
  ];
  const requestFunctionMap = buildRequestFunctionMap(parentAST, securityNodes);
  const functionContainsRequest = (name: string) => requestFunctionMap.get(name) === true;
  const ownerIndex = parentAST.body.findIndex((stmt) => nodeContainsExact(stmt, site.node));
  const dependencyGlobals = collectSecurityGlobalDependencies(site, parentAST, ownerIndex, securityNodes, functionContainsRequest);

  for (let index = 0; index < parentAST.body.length; index += 1) {
    const stmt = parentAST.body[index]!;
    if (
      stmt.type === 'FunctionDeclaration'
      || stmt.type === 'ImportDeclaration'
      || stmt.type === 'TypeDeclaration'
      || stmt.type === 'EnumDeclaration'
    ) {
      body.push(stmt);
    } else if (
      stmt.type === 'VariableDeclaration'
      && (ownerIndex === -1 || index < ownerIndex)
      && dependencyGlobals.has(stmt)
    ) {
      body.push(stmt);
    }
  }

  for (const stmt of site.expressionLocalStatements ?? []) {
    body.push(stmt);
  }

  body.push({
    type: 'ExpressionStatement',
    expression: {
      type: 'CallExpression',
      callee: { type: 'Identifier', name: 'plot' },
      arguments: [{ type: 'CallArgument', value: site.expressionExpr }],
    },
  } as Statement);

  return { type: 'Program', version: parentAST.version, explicitVersion: parentAST.explicitVersion, body };
}

function compileSecurityExpression(
  site: SecurityCallSite,
  parentAST: Program,
  securityNodes: Set<unknown>,
  maxBarsBack?: number,
  options: CompileOptions = {},
): CompiledSecurityScript | null {
  const secAST = buildSecurityAST(site, parentAST, securityNodes);
  const secAnalysis = analyze(secAST, {
    ...options,
    capturedParams: new Set(site.expressionCaptureParams ?? []),
    importedAliasContext: site.importedAliasContext,
  });
  if (secAnalysis.unsupported.length > 0) return null;

  const code = emit(secAST, secAnalysis);
  try {
    const factory = new Function('deps', `${RUNTIME_HELPERS}\n${code}`);
    const deps = { ...DEFAULT_DEPS };
    if (maxBarsBack !== undefined) deps.maxBarsBack = maxBarsBack;
    return { ScriptClass: factory(deps), generatedCode: code };
  } catch {
    return null;
  }
}

export function compile(ast: Program, maxBarsBack?: number, options: CompileOptions = {}): CompiledScript {
  const analysis = analyze(ast, options);

  if (analysis.unsupported.length > 0) {
    return {
      ScriptClass: null as unknown as CompiledScript['ScriptClass'],
      analysis,
      success: false,
      unsupported: analysis.unsupported,
      securityScripts: new Map(),
    };
  }

  const securityNodes = new Set<unknown>(analysis.securitySites.map((s) => s.node));
  prepareSecurityCaptureParams(ast, analysis, securityNodes);
  const code = emit(ast, analysis);

  try {
    const factory = new Function(
      'deps',
      `${RUNTIME_HELPERS}\n${code}`
    );

    const deps = { ...DEFAULT_DEPS };
    if (maxBarsBack !== undefined) deps.maxBarsBack = maxBarsBack;

    const ScriptClass = factory(deps);

    const securityScripts = new Map<number, CompiledSecurityScript>();
    for (const site of analysis.securitySites) {
      if (site.expressionSourceParam) continue;
      const secScript = compileSecurityExpression(site, ast, securityNodes, maxBarsBack, options);
      if (secScript) {
        securityScripts.set(site.id, secScript);
      } else {
        return {
          ScriptClass: null as unknown as CompiledScript['ScriptClass'],
          analysis,
          success: false,
          unsupported: [`${site.kind} expression subprogram ${site.id} could not be compiled`],
          generatedCode: code,
          securityScripts: new Map(),
        };
      }
    }

    return {
      ScriptClass,
      analysis,
      success: true,
      unsupported: [],
      generatedCode: code,
      securityScripts,
    };
  } catch (error) {
    return {
      ScriptClass: null as unknown as CompiledScript['ScriptClass'],
      analysis,
      success: false,
      unsupported: [`Compilation error: ${error instanceof Error ? error.message : String(error)}`],
      generatedCode: code,
      securityScripts: new Map(),
    };
  }
}
