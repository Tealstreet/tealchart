import { PineRuntimeArgumentError } from '../runtimeArgumentError';
import type { Program, Expression, FunctionDeclaration, Statement, CallExpression } from '../../parser/ast';
import { checkProgram, normalizeV5DuplicateCallArguments, type SemanticExpressionTypeContext, type SemanticType } from '../../semantic/checker';
import { pineVersionRules } from '../../pineVersionRules';
import { analyze } from './analyzer';
import type { AnalysisContext, AnalyzeOptions, SecurityCallSite } from './analyzer';
import { type RequestContextSelection, emit, RUNTIME_HELPERS } from './emitter';
import {
  NumericSeries, ValueSeries,
  SMA, EMA, RMA, RSI, BarsSince, ValueWhen, Cross, Crossover, Crossunder, Change,
  Highest, Lowest, HighestBars, LowestBars, PivotHigh, PivotLow, PivotPointLevels, Range, Rising, Falling, Max, Min,
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
import { divideV5ConstInts } from './runtime';
import { discardedFootprintCalls } from './footprintDependencies';

export interface CompiledSecurityScript {
  ScriptClass: new (deps: ScriptDependencies) => GeneratedScriptInstance;
  constantInputValue?: number;
  inputSourceName?: 'hlc3';
  fixedEmaProgram?: { captures: string[]; count: number };
  generatedCode?: string;
  securityScripts?: Map<number, CompiledSecurityScript>;
  sourceScripts?: Map<number, CompiledSecurityScript>;
  securitySites?: SecurityCallSite[];
  independentScalarProgram?: boolean;
  scalarBuiltinContextProgram?: boolean;
  invariantCaptureNames?: string[];
}

export interface CompiledScript {
  ScriptClass: new (deps: ScriptDependencies) => GeneratedScriptInstance;
  analysis: AnalysisContext;
  indicatorDynamicRequests?: boolean;
  success: boolean;
  unsupported: string[];
  generatedCode?: string;
  securityScripts: Map<number, CompiledSecurityScript>;
  sourceScripts?: Map<number, CompiledSecurityScript>;
}

export type CompileOptions = AnalyzeOptions;

export interface ArrayHelpers {
  withUdtElementType<T>(value: T): T;
  create(size?: unknown, val?: unknown): arrFuncs.PineArray;
  from(...args: unknown[]): arrFuncs.PineArray;
  readOnlyFrom(...args: unknown[]): arrFuncs.PineArray;
  readOnlyCopy(arr: arrFuncs.PineArray): arrFuncs.PineArray;
  push(arr: arrFuncs.PineArray, val: unknown): number;
  pop(arr: arrFuncs.PineArray): unknown;
  shift(arr: arrFuncs.PineArray): unknown;
  unshift(arr: arrFuncs.PineArray, val: unknown): number;
  get(arr: arrFuncs.PineArray, idx: number): unknown;
  set(arr: arrFuncs.PineArray, idx: number, val: unknown): void;
  size(arr: arrFuncs.PineArray): number;
  clear(arr: arrFuncs.PineArray): void;
  copy(arr: arrFuncs.PineArray, preserveReadOnly?: boolean): arrFuncs.PineArray;
  sort(arr: arrFuncs.PineArray, order?: unknown): void;
  sortIndices(arr: arrFuncs.PineArray, order?: unknown, sortField?: unknown): arrFuncs.PineArray;
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
  min(arr: arrFuncs.PineArray, nth?: unknown): number;
  max(arr: arrFuncs.PineArray, nth?: unknown): number;
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
  binarySearch(arr: arrFuncs.PineArray, val: unknown, sortField?: unknown): number;
  binarySearchLeftmost(arr: arrFuncs.PineArray, val: unknown, sortField?: unknown): number;
  binarySearchRightmost(arr: arrFuncs.PineArray, val: unknown, sortField?: unknown): number;
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
  beginIteration(map: mapFuncs.PineMap): void;
  endIteration(map: mapFuncs.PineMap): void;
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
  factory: typeof udtFuncs.createPineUdtFactory;
  captureVaripReference(value: unknown, barTime: number, before: boolean): unknown;
  restoreVaripReference(value: unknown): unknown;
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
  removeRow(m: mtxFuncs.PineMatrix, r?: number): arrFuncs.PineArray;
  removeCol(m: mtxFuncs.PineMatrix, c?: number): arrFuncs.PineArray;
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
  constIntDivide: typeof divideV5ConstInts;
  NumericSeries: typeof NumericSeries;
  ValueSeries: typeof ValueSeries;
  maxBarsBack: number;
  historyCheck(key: string, offset: number, hint?: number): void;
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
  PivotPointLevels: typeof PivotPointLevels;
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
  saveVarip(barTime?: number, before?: boolean): unknown;
  restoreVarip(snap: unknown): void;
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
  strategyConvertToAccount(args: unknown[], named?: Record<string, unknown>): unknown;
  strategyConvertToSymbol(args: unknown[], named?: Record<string, unknown>): unknown;
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
  requestSource?(id: number, captures?: Record<string, unknown>): unknown;
  timestamp(args: unknown[], named?: Record<string, unknown>, literalId?: string, literalTimezone?: string): number;
  timeFilter(closeTime: boolean, args: unknown[], named?: Record<string, unknown>): number;
  calendarPart(part: string, args: unknown[], named?: Record<string, unknown>): number;
  runtimeTimeValue(name: string, offset?: number, maxBarsBack?: number): number;
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
    tupleArity?: number,
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
  readDrawingGetter(name: string, value: unknown): unknown;
  readLineY1(value: unknown): unknown;
  readLabelText(value: unknown): unknown;
  callBuiltin(name: string, args: unknown[], named?: Record<string, unknown>, callId?: string): unknown;
  hasMethodBuiltin(name: string, receiver: unknown): boolean;
  callMethodBuiltin(name: string, receiver: unknown, args: unknown[], named?: Record<string, unknown>, callId?: string, resolvedName?: string): unknown;
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
  mathLog(value: unknown): number;
  mathSum(...args: unknown[]): unknown;
  strFormat(args: unknown[], named?: Record<string, unknown>): string;
  strFormatTime(args: unknown[], named?: Record<string, unknown>): string;
}

function fillArray(arr: arrFuncs.PineArray, val: unknown, from?: number, to?: number): void {
  const size = arrFuncs.getArraySize(arr);
  const start = Math.floor(from ?? 0);
  const end = Math.floor(to ?? size);
  const invalidEndpoint = start < 0 ? start : end > size ? end : undefined;
  if (invalidEndpoint !== undefined) {
    throw new PineRuntimeArgumentError(`In 'array.fill()' function. Index ${invalidEndpoint} is out of bounds, array size is ${size}.`, 'RE10045');
  }
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

function withCollectionReceiverChecks<T extends object>(
  helpers: T,
  isValid: (value: unknown) => boolean,
  kind: 'Array' | 'Matrix',
  withoutReceiver: readonly string[],
): T {
  return Object.fromEntries(Object.entries(helpers).map(([name, helper]) => {
    if (withoutReceiver.includes(name)) return [name, helper];
    if (kind === 'Array' && name === 'push') {
      return [name, (array: unknown, value: unknown) => {
        if (!isValid(array)) throw new Error('Array methods cannot be called when the ID is na');
        return (helper as (array: unknown, value: unknown) => unknown)(array, value);
      }];
    }
    const receiverCount = name === 'concat'
      || (kind === 'Array' && name === 'covariance')
      || (kind === 'Matrix' && name === 'kron') ? 2 : 1;
    return [name, (...args: unknown[]) => {
      for (let index = 0; index < receiverCount; index++) {
        if (!isValid(args[index])) {
          throw new Error(`${kind} methods cannot be called when the ID is na`);
        }
      }
      return (helper as (...args: unknown[]) => unknown)(...args);
    }];
  })) as T;
}

export const ARRAY_HELPERS: ArrayHelpers = withCollectionReceiverChecks({
  withUdtElementType: arrFuncs.withUdtArrayElementType,
  create: (size?: unknown, val?: unknown) => arrFuncs.createPineArray(Number(size) || 0, val),
  readOnlyFrom: (...args: unknown[]) => arrFuncs.createReadOnlyPineArray(args),
  readOnlyCopy: arrFuncs.asReadOnlyPineArray,
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
} as ArrayHelpers, arrFuncs.isPineArray, 'Array', ['create', 'from', 'readOnlyFrom', 'withUdtElementType']);

export const MAP_HELPERS: MapHelpers = {
  beginIteration: mapFuncs.beginMapIteration,
  endIteration: mapFuncs.endMapIteration,
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
  factory: udtFuncs.createPineUdtFactory,
  captureVaripReference: udtFuncs.captureVaripReference,
  restoreVaripReference: udtFuncs.restoreVaripReference,
  create: udtFuncs.createPineUdtObject,
  getField: udtFuncs.getUdtField,
  setField: udtFuncs.setUdtField,
  copy: udtFuncs.copyUdtObject,
};

export const MATRIX_HELPERS: MatrixHelpers = withCollectionReceiverChecks({
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
} as MatrixHelpers, mtxFuncs.isPineMatrix, 'Matrix', ['create', 'isValid']);

const DEFAULT_DEPS: ScriptDependencies = {
  constIntDivide: divideV5ConstInts,
  NumericSeries,
  ValueSeries,
  maxBarsBack: 500,
  historyCheck(_key, offset, hint = 0) {
    const limit = Math.max(500, hint);
    if (offset > limit) throw new Error(`Historical offset ${offset} exceeds max_bars_back ${limit}`);
  },
  _arr: ARRAY_HELPERS,
  _map: MAP_HELPERS,
  _udt: UDT_HELPERS,
  _mtx: MATRIX_HELPERS,
  SMA, EMA, RMA, RSI, BarsSince, ValueWhen, Cross, Crossover, Crossunder, Change,
  Highest, Lowest, HighestBars, LowestBars, PivotHigh, PivotLow, PivotPointLevels, Range, Rising, Falling, Max, Min,
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

interface SecurityParentContext {
  ownerIndices: WeakMap<object, number>;
  functionContainsRequest: (name: string) => boolean;
  dynamicRequestsEnabled: boolean;
  rootTypes: SemanticExpressionTypeContext;
  callDeclarations: Map<CallExpression, FunctionDeclaration>;
  resolvedMethods: WeakMap<CallExpression, FunctionDeclaration | null>;
  siteTypes: WeakMap<object, Set<SemanticExpressionTypeContext>>;
  dependencies: WeakMap<SecurityCallSite, SecurityDependencies>;
  dependencyTypes: WeakMap<SecurityCallSite, SemanticExpressionTypeContext>;
}

function buildSecurityParentContext(parentAST: Program, securityNodes: Set<unknown>, dynamicRequestsEnabled: boolean, options: CompileOptions): SecurityParentContext {
  const requestFunctionMap = buildRequestFunctionMap(parentAST, securityNodes);
  const ownerIndices = new WeakMap<object, number>();
  const visit = (node: unknown, index: number): void => {
    if (!node || typeof node !== 'object' || ownerIndices.has(node)) return;
    // First owner wins, matching the previous body.findIndex() scans even for
    // source nodes shared by several statements.
    ownerIndices.set(node, index);
    for (const child of Object.values(node)) visit(child, index);
  };
  if (securityNodes.size > 0) parentAST.body.forEach((stmt, index) => visit(stmt, index));
  const resolvedMethods = new WeakMap<CallExpression, FunctionDeclaration | null>();
  const expressionTypes = new WeakMap<Expression, SemanticType>();
  const types = securityNodes.size > 0 ? checkProgram(parentAST, {
    libraries: options.libraries, expressionTypes, resolvedUserMethods: resolvedMethods,
    recordCallTypeContexts: true, recordMethodFunctionCallTypeContexts: true,
  }) : undefined;
  const context: SecurityParentContext = {
    ownerIndices, functionContainsRequest: (name) => requestFunctionMap.get(name) === true, dynamicRequestsEnabled,
    rootTypes: { expressionTypes, callTypeContexts: types?.callTypeContexts ?? new WeakMap() },
    callDeclarations: types?.userFunctionCallDeclarations ?? new Map(), resolvedMethods,
    siteTypes: new WeakMap(), dependencies: new WeakMap(), dependencyTypes: new WeakMap(),
  };
  if (securityNodes.size > 0) {
    walkRequestedCalls(parentAST.body, context.rootTypes, context, (node, scope) => {
      if (!securityNodes.has(node)) return;
      const scopes = context.siteTypes.get(node) ?? new Set();
      scopes.add(scope);
      context.siteTypes.set(node, scopes);
    });
  }
  return context;
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
      { const name = expressionFullName(expr.callee); if (name) references.add(name); }
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
  if (stmt.type === 'AssignmentStatement' && stmt.left.type === 'MemberExpression') {
    collectExpressionReferences(stmt.left, references);
  }
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

interface SecurityDependencies {
  globals: Set<Statement>;
  functions: Set<FunctionDeclaration>;
}

function requestedCallDeclaration(call: CallExpression, types: SemanticExpressionTypeContext, context: SecurityParentContext): FunctionDeclaration | undefined {
  const child = types.callTypeContexts.get(call);
  if (call.callee.type === 'MemberExpression') {
    return child?.resolvedUserMethod ?? context.resolvedMethods.get(call) ?? undefined;
  }
  return child?.resolvedUserFunction ?? context.callDeclarations.get(call);
}

function omittedCallDefaults(call: CallExpression, declaration: FunctionDeclaration): Expression[] {
  const receiver = declaration.isMethod && call.callee.type === 'MemberExpression';
  const parameters = declaration.params.slice(receiver ? 1 : 0);
  const named = new Set(call.arguments.flatMap((argument) => argument.name ? [argument.name.name] : []));
  const positional = call.arguments.filter((argument) => !argument.name);
  let position = 0;
  return parameters.flatMap((parameter) => {
    const supplied = named.has(parameter.name) || Boolean(positional[position++]);
    return !supplied && parameter.defaultValue ? [parameter.defaultValue] : [];
  });
}

function walkRequestedCalls(
  node: unknown,
  types: SemanticExpressionTypeContext,
  context: SecurityParentContext,
  visit: (node: object, types: SemanticExpressionTypeContext) => void,
  seen = new WeakMap<object, Set<SemanticExpressionTypeContext>>(),
): void {
  if (!node || typeof node !== 'object') return;
  const scopes = seen.get(node) ?? new Set();
  if (scopes.has(types)) return;
  scopes.add(types);
  seen.set(node, scopes);
  visit(node, types);
  if (Array.isArray(node)) {
    node.forEach((child) => walkRequestedCalls(child, types, context, visit, seen));
    return;
  }
  if ('type' in node && node.type === 'FunctionDeclaration') return;
  if ('type' in node && node.type === 'CallExpression') {
    const call = node as CallExpression;
    const declaration = requestedCallDeclaration(call, types, context);
    if (declaration) {
      for (const value of omittedCallDefaults(call, declaration)) walkRequestedCalls(value, types, context, visit, seen);
      walkRequestedCalls(declaration.body, types.callTypeContexts.get(call) ?? types, context, visit, seen);
    }
  }
  for (const [key, value] of Object.entries(node)) {
    if (key !== 'loc') walkRequestedCalls(value, types, context, visit, seen);
  }
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
  captureNames: Set<string> | undefined,
  parentContext: SecurityParentContext,
): SecurityDependencies {
  const priorDeclarations = parentAST.body.slice(0, ownerIndex === -1 ? parentAST.body.length : ownerIndex)
    .filter((stmt): stmt is Extract<Statement, { type: 'VariableDeclaration' }> => stmt.type === 'VariableDeclaration');
  const declarationByName = new Map<string, Extract<Statement, { type: 'VariableDeclaration' }>>();
  for (const stmt of priorDeclarations) {
    for (const name of variableDeclarationNames(stmt)) declarationByName.set(name, stmt);
  }
  const securityNodes = new Set<unknown>();
  const functionContainsRequest = parentContext.functionContainsRequest;
  const replayRequests = parentContext.dynamicRequestsEnabled;
  const candidates = priorDeclarations
    .filter((stmt): stmt is Extract<Statement, { type: 'VariableDeclaration' }> => (
      isRequestReplayableGlobalStatement(stmt)
      && (replayRequests || !nodeContainsRequest(stmt.init, securityNodes, functionContainsRequest))
    ));
  const localFunctions = new Set(parentAST.body.filter((stmt): stmt is FunctionDeclaration => stmt.type === 'FunctionDeclaration'));
  const functions = new Set<FunctionDeclaration>();
  const needed = collectSecuritySiteReferences(site);
  const capturedNames = new Set(site.expressionCaptureParams ?? []);
  const included = new Set<Statement>();
  const collectCalls = (node: unknown, types: SemanticExpressionTypeContext): void => {
    walkRequestedCalls(node, types, parentContext, (child, scope) => {
      if (!('type' in child) || child.type !== 'CallExpression') return;
      const call = child as CallExpression;
      const declaration = requestedCallDeclaration(call, scope, parentContext);
      if (!declaration || !localFunctions.has(declaration)) return;
      functions.add(declaration);
      for (const name of collectFunctionBodyReferences(declaration)) needed.add(name);
      for (const value of omittedCallDefaults(call, declaration)) collectExpressionReferences(value, needed);
    });
  };
  for (const types of parentContext.dependencyTypes.has(site)
    ? [parentContext.dependencyTypes.get(site)!]
    : parentContext.siteTypes.get(site.node) ?? [parentContext.rootTypes]) {
    for (const node of [site.expressionExpr, site.sourceExpr, site.symbolExpr, site.timeframeExpr,
      site.gapsExpr, site.lookaheadExpr, site.ignoreInvalidSymbolExpr, site.currencyExpr,
      site.ignoreInvalidTimeframeExpr, site.calcBarsCountExpr, site.expressionLocalStatements]) collectCalls(node, types);
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const stmt of candidates) {
      if (included.has(stmt)) continue;
      if (!variableDeclarationNames(stmt).some((name) => needed.has(name) && !capturedNames.has(name))) continue;
      included.add(stmt);
      changed = true;
      collectCalls(stmt, parentContext.rootTypes);
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
  const dependencies = { globals: included, functions };
  parentContext.dependencies.set(site, dependencies);
  return dependencies;
}

function isRequestReplayableGlobalStatement(
  stmt: Extract<Statement, { type: 'VariableDeclaration' }>,
): boolean {
  // Dependency-selected `var`/`varip` globals get an independent requested-
  // context state, just like regular globals. Block execution is not yet replayed.
  if (stmt.init.type === 'IfStatement') return false;
  // Prior requests are dependencies too; each requested subprogram compiles
  // its own nested request graph rather than sampling the chart result.
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

function specializeSecurityDependencies(parentAST: Program, analysis: AnalysisContext, context: SecurityParentContext): RequestContextSelection | undefined {
  let nextId = Math.max(-1, ...analysis.securitySites.map(site => site.id)) + 1;
  const variants: SecurityCallSite[] = [];
  const contextIds = new WeakMap<SemanticExpressionTypeContext, Map<CallExpression, number>>();
  let specialized = false;
  const nodes = new WeakSet<CallExpression>();
  for (const site of analysis.securitySites) {
    const scopes = context.siteTypes.get(site.node);
    if (!site.ownerFunctionName || !scopes || scopes.size < 2) {
      variants.push(site);
      continue;
    }
    const ownerIndex = Math.min(context.ownerIndices.get(site.node) ?? parentAST.body.length,
      context.ownerIndices.get(site.expressionExpr) ?? parentAST.body.length);
    const groups = new Map<string, SecurityCallSite>();
    const selections: [SemanticExpressionTypeContext, SecurityCallSite][] = [];
    for (const scope of scopes) {
      const variant = { ...site };
      context.dependencyTypes.set(variant, scope);
      const dependencies = collectSecurityGlobalDependencies(variant, parentAST, ownerIndex, undefined, context);
      const key = JSON.stringify(parentAST.body.map((statement, index) =>
        dependencies.globals.has(statement) || statement.type === 'FunctionDeclaration' && dependencies.functions.has(statement) ? index : null));
      let selected = groups.get(key);
      if (!selected) {
        selected = variant;
        groups.set(key, selected);
      }
      selections.push([scope, selected]);
    }
    if (groups.size < 2) {
      variants.push(site);
      continue;
    }
    specialized = true;
    for (const [index, variant] of [...groups.values()].entries()) {
      variant.id = index === 0 ? site.id : nextId++;
      nodes.add(variant.node);
      variants.push(variant);
    }
    for (const [scope, variant] of selections) {
      const ids = contextIds.get(scope) ?? new Map();
      ids.set(site.node, variant.id);
      contextIds.set(scope, ids);
    }
  }
  if (specialized) {
    analysis.securitySites = variants;
    return { ids: contextIds, callTypes: context.rootTypes.callTypeContexts, nodes };
  }
}

function prepareSecurityCaptureParams(parentAST: Program, analysis: AnalysisContext, parentContext: SecurityParentContext): void {
  const independentRequests = !parentContext.dynamicRequestsEnabled;
  const requestsByNode = new Map(analysis.securitySites.map((site) => [site.node, site]));
  const usedNames = new Set<string>();
  for (const stmt of parentAST.body) collectStatementReferences(stmt, usedNames);
  for (const site of analysis.securitySites) {
    const ownerIndex = Math.min(parentContext.ownerIndices.get(site.node) ?? parentAST.body.length, parentContext.ownerIndices.get(site.expressionExpr) ?? parentAST.body.length);
    const captureNames = new Set(site.expressionCaptureParams ?? []);
    if (site.expressionSourceParam) captureNames.add(site.expressionSourceParam);
    const dependencies = collectSecurityGlobalDependencies(site, parentAST, ownerIndex, captureNames, parentContext);
    for (const statement of dependencies.globals) {
      for (const name of collectStatementReferences(statement)) {
        if (analysis.capturedParams.has(name)) captureNames.add(name);
      }
    }
    if (independentRequests) {
      const captures = new Map<string, Expression>();
      const collect = (node: unknown): void => {
        if (!node || typeof node !== 'object') return;
        const request = requestsByNode.get(node as SecurityCallSite['node']);
        if (request) {
          let name = `__independent_request_${site.id}_${request.id}`;
          while (usedNames.has(name)) name += '_';
          usedNames.add(name);
          captures.set(name, request.node);
          captureNames.add(name);
          return;
        }
        for (const value of Object.values(node)) {
          if (Array.isArray(value)) value.forEach(collect);
          else collect(value);
        }
      };
      collect(site.expressionExpr);
      if (captures.size > 0) site.independentRequestCaptures = captures;
      if (site.requiresDynamicRequestsReason === 'nested-request') {
        site.requiresDynamicRequestsReason = undefined;
      }
    }
    site.expressionCaptureParams = captureNames.size > 0 ? [...captureNames].sort() : undefined;
  }
  const capturesByNode = new Map<CallExpression, Set<string>>();
  for (const site of analysis.securitySites) {
    const captures = capturesByNode.get(site.node) ?? new Set();
    for (const name of site.expressionCaptureParams ?? []) captures.add(name);
    capturesByNode.set(site.node, captures);
  }
  for (const site of analysis.securitySites) {
    const captures = capturesByNode.get(site.node)!;
    if (captures.size) site.expressionCaptureParams = [...captures].sort();
  }
}

function independentSecurityExpression(site: SecurityCallSite): Expression {
  if (!site.independentRequestCaptures) return site.expressionExpr;
  const replacements = new Map([...site.independentRequestCaptures].map(([name, expr]) => [expr, name]));
  const replace = (node: unknown): unknown => {
    if (!node || typeof node !== 'object') return node;
    const name = replacements.get(node as Expression);
    if (name) return { type: 'Identifier', name };
    if (Array.isArray(node)) return node.map(replace);
    return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, replace(value)]));
  };
  return replace(site.expressionExpr) as Expression;
}

function buildSecurityAST(site: SecurityCallSite, parentAST: Program, parentContext: SecurityParentContext): Program {
  const body: Statement[] = [
    {
      type: 'IndicatorDeclaration',
      declarationKind: 'indicator',
      title: { type: 'StringLiteral', value: `security_${site.id}`, raw: JSON.stringify(`security_${site.id}`) },
      dynamic_requests: { type: 'BooleanLiteral', value: parentContext.dynamicRequestsEnabled },
    } as Statement,
  ];
  const ownerIndex = Math.min(parentContext.ownerIndices.get(site.node) ?? parentAST.body.length, parentContext.ownerIndices.get(site.expressionExpr) ?? parentAST.body.length);
  const dependencies = parentContext.dependencies.get(site)!;
  const dependencyGlobals = dependencies.globals;

  for (let index = 0; index < parentAST.body.length; index += 1) {
    const stmt = parentAST.body[index]!;
    if (
      (stmt.type === 'FunctionDeclaration' && dependencies.functions.has(stmt))
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
      arguments: [{ type: 'CallArgument', value: independentSecurityExpression(site) }],
    },
  } as Statement);

  return { type: 'Program', version: parentAST.version, explicitVersion: parentAST.explicitVersion, body };
}

function requestedInputDefault(ast: Program): Expression | undefined {
  if (ast.body.length !== 3) return undefined;
  const declaration = ast.body[1];
  const output = ast.body[2];
  if (declaration?.type !== 'VariableDeclaration' || declaration.kind !== 'none'
    || declaration.names.type !== 'VariableDeclarator' || declaration.init.type !== 'CallExpression'
    || output?.type !== 'ExpressionStatement' || output.expression.type !== 'CallExpression') return undefined;
  if (!['input', 'input.int', 'input.float'].includes(expressionFullName(declaration.init.callee) ?? '')) return undefined;
  const defaultValue = declaration.init.arguments.find(argument => !argument.name)?.value;
  if (declaration.init.arguments.some(argument => argument.name?.name === 'defval'
    || (argument.value !== defaultValue && !['NumericLiteral', 'StringLiteral', 'BooleanLiteral'].includes(argument.value.type)))) return undefined;
  const result = output.expression.arguments[0]?.value;
  if (expressionFullName(output.expression.callee) !== 'plot'
    || result?.type !== 'Identifier' || result.name !== declaration.names.name.name) return undefined;
  return defaultValue;
}

function constantRequestedInputValue(ast: Program): number | undefined {
  const value = requestedInputDefault(ast);
  return value?.type === 'NumericLiteral' && Number.isFinite(value.value) ? value.value : undefined;
}

function requestedInputSourceName(ast: Program): 'hlc3' | undefined {
  const value = requestedInputDefault(ast);
  return value?.type === 'Identifier' && value.name === 'hlc3' ? 'hlc3' : undefined;
}

function fixedRequestedEmaProgram(ast: Program, captures: string[]): CompiledSecurityScript['fixedEmaProgram'] {
  const names = new Set(captures);
  let count = 0;
  let plotted = false;
  const numeric = (value: Expression): boolean => {
    if (value.type === 'NumericLiteral') return true;
    if (value.type === 'Identifier') return value.name === 'na' || (names.has(value.name) && !['open', 'high', 'low', 'close', 'volume', 'time', 'timenow', 'bar_index', 'last_bar_index', 'hl2', 'hlc3', 'ohlc4', 'hlcc4', 'bid', 'ask'].includes(value.name));
    if (value.type === 'UnaryExpression') return ['+', '-'].includes(value.operator) && numeric(value.argument);
    if (value.type === 'BinaryExpression') return ['+', '-', '*', '/', '%'].includes(value.operator) && numeric(value.left) && numeric(value.right);
    if (value.type !== 'CallExpression' || value.arguments.some(argument => argument.name)) return false;
    const callee = value.callee;
    if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier') {
      const name = `${callee.object.name}.${callee.property.name}`;
      if (name === 'ta.ema' && value.arguments.length === 2) count++;
      else if (name !== 'math.abs' || value.arguments.length !== 1) return false;
    } else if (callee.type !== 'Identifier' || !['float', 'int'].includes(callee.name) || value.arguments.length !== 1) return false;
    return value.arguments.every(argument => numeric(argument.value));
  };
  for (const statement of ast.body) {
    if (statement.type === 'IndicatorDeclaration' && statement.declarationKind === 'indicator') continue;
    if (statement.type === 'FunctionDeclaration') {
      if (['ema', 'abs', 'float', 'int', 'plot'].includes(statement.name.name)) return undefined;
      continue;
    }
    if (plotted) return undefined;
    if (statement.type === 'VariableDeclaration' && statement.kind === 'none' && statement.names.type === 'VariableDeclarator'
      && !['ta', 'math'].includes(statement.names.name.name) && !names.has(statement.names.name.name) && statement.init.type !== 'IfStatement' && numeric(statement.init)) {
      names.add(statement.names.name.name);
      continue;
    }
    if (statement.type !== 'ExpressionStatement' || statement.expression.type !== 'CallExpression') return undefined;
    const call = statement.expression;
    if (call.callee.type !== 'Identifier' || call.callee.name !== 'plot' || call.arguments.length === 0 || !numeric(call.arguments[0].value)) return undefined;
    if (call.arguments.slice(1).some(argument => !['NumericLiteral', 'StringLiteral', 'BoolLiteral'].includes(argument.value.type))) return undefined;
    plotted = true;
  }
  return plotted && count > 0 ? { captures, count } : undefined;
}

function requestedInvariantCaptureNames(ast: Program, captures: string[]): string[] | undefined {
  const captured = new Set(captures);
  const names = new Set(captures);
  const required = new Set<string>();
  const numeric = (value: Expression): boolean => {
    if (value.type === 'NumericLiteral') return true;
    if (value.type === 'Identifier') {
      if (captured.has(value.name)) required.add(value.name);
      return names.has(value.name) || value.name === 'na';
    }
    if (value.type === 'UnaryExpression') return ['+', '-'].includes(value.operator) && numeric(value.argument);
    return value.type === 'BinaryExpression' && ['+', '-', '*', '/', '%'].includes(value.operator)
      && numeric(value.left) && numeric(value.right);
  };
  let plotted = false;
  for (const statement of ast.body) {
    if (statement.type === 'IndicatorDeclaration' && statement.declarationKind === 'indicator') continue;
    if (statement.type === 'FunctionDeclaration' && statement.name.name !== 'plot') continue;
    if (plotted) return undefined;
    if (statement.type === 'VariableDeclaration' && statement.kind === 'none'
      && statement.names.type === 'VariableDeclarator' && !names.has(statement.names.name.name)
      && statement.init.type !== 'IfStatement' && numeric(statement.init)) {
      names.add(statement.names.name.name);
      continue;
    }
    if (statement.type !== 'ExpressionStatement' || statement.expression.type !== 'CallExpression') return undefined;
    const call = statement.expression;
    if (call.callee.type !== 'Identifier' || call.callee.name !== 'plot' || call.arguments.length !== 1
      || !numeric(call.arguments[0]!.value)) return undefined;
    plotted = true;
  }
  return plotted ? [...required] : undefined;
}

function compileSecurityExpression(
  site: SecurityCallSite,
  parentAST: Program,
  parentContext: SecurityParentContext,
  maxBarsBack?: number,
  options: CompileOptions = {},
): CompiledSecurityScript | null {
  const secAST = buildSecurityAST(site, parentAST, parentContext);
  const compiled = compile(secAST, maxBarsBack, {
    ...options,
    capturedParams: new Set(site.expressionCaptureParams ?? []),
    importedAliasContext: site.importedAliasContext,
  });
  const scalarProgram = compiled.success && isIndependentScalarProgram(secAST);
  return compiled.success ? {
    ScriptClass: compiled.ScriptClass,
    constantInputValue: constantRequestedInputValue(secAST),
    inputSourceName: requestedInputSourceName(secAST),
    fixedEmaProgram: fixedRequestedEmaProgram(secAST, site.expressionCaptureParams ?? []),
    generatedCode: compiled.generatedCode,
    securityScripts: compiled.securityScripts,
    sourceScripts: compiled.sourceScripts,
    securitySites: compiled.analysis.securitySites,
    independentScalarProgram: !site.expressionCaptureParams?.length && scalarProgram,
    scalarBuiltinContextProgram: scalarProgram,
    invariantCaptureNames: requestedInvariantCaptureNames(secAST, site.expressionCaptureParams ?? []),
  } : null;
}

function isIndependentScalarProgram(ast: Program): boolean {
  const functions = new Set(ast.body.filter((stmt) => stmt.type === 'FunctionDeclaration').map((stmt) => stmt.name.name));
  const scalarCalls = new Set(['plot', 'input', 'na', 'nz', 'fixnan', 'int', 'float', 'bool', 'string', 'color', 'timestamp', 'time', 'time_close', 'year', 'month', 'weekofyear', 'dayofmonth', 'dayofweek', 'hour', 'minute', 'second']);
  const scalarNamespaces = new Set(['ta', 'math', 'str', 'color', 'input', 'ticker']);
  const referenceNamespaces = new Set(['array', 'map', 'matrix', 'line', 'label', 'box', 'table', 'polyline', 'linefill', 'chart', 'request', 'strategy']);
  const visit = (node: unknown): boolean => {
    if (!node || typeof node !== 'object') return true;
    if (Array.isArray(node)) return node.every(visit);
    const value = node as Record<string, unknown>;
    if (value.type === 'Identifier' && value.name === 'timenow') return false;
    if (value.type === 'ImportDeclaration' || value.type === 'TypeDeclaration' || value.type === 'EnumDeclaration') return false;
    if (value.type === 'FunctionDeclaration' && value.isMethod) return false;
    if (value.type === 'MemberExpression') {
      const name = expressionFullName(node as Expression);
      if (name && referenceNamespaces.has(name.split('.')[0]!)) return false;
    }
    if (value.type === 'CallExpression') {
      const name = expressionFullName(value.callee as Expression);
      if (!name) return false;
      if (name.includes('.')) {
        if (!scalarNamespaces.has(name.split('.')[0]!) || name === 'str.split' || name === 'ta.pivot_point_levels' || name === 'math.random') return false;
      } else if (!functions.has(name) && !scalarCalls.has(name)) return false;
    }
    return Object.entries(value).every(([key, child]) => key === 'loc' || visit(child));
  };
  return visit(ast);
}

function executableFunctionNames(ast: Program, analysis: AnalysisContext): Set<string> {
  const references = new Set<string>();
  for (const stmt of ast.body) {
    if (stmt.type !== 'FunctionDeclaration') collectStatementReferences(stmt, references);
  }
  const functions = new Set<string>();
  const pending = [...references];
  while (pending.length > 0) {
    const reference = pending.pop()!;
    const qualified = analysis.importedAliasContext ? `${analysis.importedAliasContext}.${reference}` : reference;
    const name = analysis.importedFunctions.get(reference) ?? analysis.importedFunctions.get(qualified) ?? reference;
    for (const overload of analysis.userFunctionOverloads.get(reference) ?? []) {
      if (!functions.has(overload)) pending.push(overload);
    }
    const methodName = reference.split('.').at(-1)!;
    for (const overload of analysis.localMethodOverloads.get(methodName) ?? []) {
      if (!functions.has(overload.internalName)) pending.push(overload.internalName);
    }
    for (const [method, overloads] of analysis.importedMethodOverloads) {
      if (method === reference || method.endsWith(`.${methodName}`)) {
        for (const overload of overloads) if (!functions.has(overload.internalName)) pending.push(overload.internalName);
      }
    }
    const fn = analysis.funcInfos.get(name);
    if (!fn || functions.has(name)) continue;
    functions.add(name);
    const dependencies = new Set<string>();
    if (Array.isArray(fn.body)) for (const stmt of fn.body) collectStatementReferences(stmt, dependencies);
    else collectExpressionReferences(fn.body, dependencies);
    const importedName = [...analysis.importedFunctions].find(([, internal]) => internal === name)?.[0];
    const alias = importedName?.slice(0, importedName.lastIndexOf('.'));
    for (const dependency of dependencies) {
      pending.push(alias && analysis.importedFunctions.has(`${alias}.${dependency}`) ? `${alias}.${dependency}` : dependency);
    }
  }
  return functions;
}

export function compile(ast: Program, maxBarsBack?: number, options: CompileOptions = {}): CompiledScript {
  ast = normalizeV5DuplicateCallArguments(ast, options);
  const analysis = analyze(ast, options);
  const executableFunctions = executableFunctionNames(ast, analysis);
  const reachableTupleSites = analysis.securitySites.filter(
    (site) => !site.ownerFunctionName || executableFunctions.has(site.ownerFunctionName),
  );
  const explicitTupleElements = reachableTupleSites.reduce(
    (count, site) =>
      site.expressionExpr.type === 'ArrayExpression' ? count + (site.expressionTupleArity ?? 0) : count,
    0,
  );
  const largestReturnedTuple = reachableTupleSites.reduce(
    (largest, site) => Math.max(largest, site.expressionTupleArity ?? 0),
    0,
  );
  const requestedTupleElements = Math.max(explicitTupleElements, largestReturnedTuple);
  if (requestedTupleElements > 127) {
    analysis.unsupported.push(`request.* calls cannot collectively return more than 127 tuple elements (got ${requestedTupleElements}).`);
  }
  const dynamicOption = analysis.declarationInfo?.node.dynamic_requests;
  let dynamicRequestsEnabled = dynamicOption?.type === 'BooleanLiteral'
    ? dynamicOption.value
    : pineVersionRules(ast.version).dynamicRequestsDefault;
  if (analysis.declarationInfo?.kind === 'indicator') {
    if (dynamicOption && dynamicOption.type !== 'BooleanLiteral') {
      const prepared = options.semanticTypes?.ast === ast && options.semanticTypes.libraries === options.libraries
        ? options.semanticTypes.result : undefined;
      dynamicRequestsEnabled = (prepared ?? checkProgram(ast, { libraries: options.libraries })).indicatorDynamicRequests
        ?? dynamicRequestsEnabled;
    }
  }
  if (!dynamicRequestsEnabled) {
    for (const site of analysis.securitySites) {
      if (site.requiresDynamicRequestsReason !== 'local-scope') continue;
      analysis.unsupported.push(`request.* calls in local scopes require dynamic_requests=true: request.${site.kind}`);
    }
  }
  if (analysis.plotSites.some((site) => site.funcName === 'fill')) {
    const qualifiers = checkProgram(ast, { libraries: options.libraries }).fillColorQualifiers;
    for (const site of analysis.plotSites) {
      if (site.funcName !== 'fill') continue;
      const qualifier = qualifiers.get(site.node);
      site.plotCount = qualifier === undefined || qualifier === 'series' ? 1 : 0;
    }
  }
  if (pineVersionRules(ast.version).allowsLegacyGlobalBuiltinAliases) {
    for (const diagnostic of checkProgram(ast, options).diagnostics) {
      if (diagnostic.code === 'mutable-security-expression') analysis.unsupported.push(diagnostic.message);
    }
  }

  if (analysis.unsupported.length > 0) {
    return {
      ScriptClass: null as unknown as CompiledScript['ScriptClass'],
      analysis,
      success: false,
      unsupported: analysis.unsupported,
      securityScripts: new Map(),
    };
  }

  const securityNodes = new Set<unknown>(analysis.securitySites.map((site) => site.node));
  const parentContext = buildSecurityParentContext(ast, securityNodes, dynamicRequestsEnabled, options);
  const requestedContexts = specializeSecurityDependencies(ast, analysis, parentContext);
  prepareSecurityCaptureParams(ast, analysis, parentContext);
  analysis.discardedFootprintCalls = discardedFootprintCalls(ast, analysis);
  const code = emit(ast, analysis, options.libraries, requestedContexts);

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
      if (site.ownerFunctionName && !executableFunctions.has(site.ownerFunctionName)) continue;
      const secScript = compileSecurityExpression(site, ast, parentContext, maxBarsBack, options);
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

    const sourceScripts = new Map<number, CompiledSecurityScript>();
    for (const source of analysis.requestSourceSites.values()) {
      if (source.ownerFunctionName && !executableFunctions.has(source.ownerFunctionName)) continue;
      const site: SecurityCallSite = {
        id: source.id, kind: 'security', sourceExpr: null,
        symbolExpr: { type: 'StringLiteral', value: '', raw: '""' },
        timeframeExpr: { type: 'StringLiteral', value: '', raw: '""' },
        expressionExpr: source.expression,
        gapsExpr: null, lookaheadExpr: null, ignoreInvalidSymbolExpr: null,
        currencyExpr: null, ignoreInvalidTimeframeExpr: null, calcBarsCountExpr: null,
        taCallSites: [],
        node: { type: 'CallExpression', callee: { type: 'Identifier', name: 'plot' }, arguments: [{ type: 'CallArgument', value: source.expression }] },
        expressionCaptureParams: source.params,
        expressionLocalStatements: source.locals,
      };
      const ownerIndex = parentContext.ownerIndices.get(source.expression) ?? -1;
      const captures = new Set(source.params);
      collectSecurityGlobalDependencies(site, ast, ownerIndex, captures, parentContext);
      site.expressionCaptureParams = [...captures];
      const sourceScript = compileSecurityExpression(site, ast, parentContext, maxBarsBack, options);
      if (!sourceScript) throw new Error(`Request source expression ${source.id} could not be compiled`);
      sourceScripts.set(source.id, sourceScript);
    }

    return {
      ScriptClass,
      analysis,
      indicatorDynamicRequests: analysis.declarationInfo?.kind === 'indicator' ? dynamicRequestsEnabled : undefined,
      success: true,
      unsupported: [],
      generatedCode: code,
      securityScripts,
      sourceScripts,
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
