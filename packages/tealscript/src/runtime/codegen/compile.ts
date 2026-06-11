import type { Program } from '../../parser/ast';
import { analyze } from './analyzer';
import type { AnalysisContext } from './analyzer';
import { emit, RUNTIME_HELPERS } from './emitter';
import {
  NumericSeries,
  SMA, EMA, RMA, RSI, Crossover, Crossunder, Change,
  Highest, Lowest, MACD, ATR, Stoch, StdDev, BB,
  DEMA, TEMA, Cum,
} from './index';
import * as arrFuncs from '../arrays';
import * as mapFuncs from '../maps';
import * as udtFuncs from '../objects';
import * as mtxFuncs from '../matrices';

export interface CompiledScript {
  ScriptClass: new (deps: ScriptDependencies) => GeneratedScriptInstance;
  analysis: AnalysisContext;
  success: boolean;
  unsupported: string[];
  generatedCode?: string;
}

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
  maxBarsBack: number;
  _arr: ArrayHelpers;
  _map: MapHelpers;
  _udt: UdtHelpers;
  _mtx: MatrixHelpers;
  SMA: typeof SMA;
  EMA: typeof EMA;
  RMA: typeof RMA;
  RSI: typeof RSI;
  Crossover: typeof Crossover;
  Crossunder: typeof Crossunder;
  Change: typeof Change;
  Highest: typeof Highest;
  Lowest: typeof Lowest;
  MACD: typeof MACD;
  ATR: typeof ATR;
  Stoch: typeof Stoch;
  StdDev: typeof StdDev;
  BB: typeof BB;
  DEMA: typeof DEMA;
  TEMA: typeof TEMA;
  Cum: typeof Cum;
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
  plot(index: number, funcName: string, value: unknown, named: Record<string, string>, extraArgs: unknown[]): void;
  input(id: string, funcName: string, defval: unknown, named: Record<string, string>, extraArgs: unknown[]): unknown;
  strategyEntry(...args: unknown[]): void;
  strategyExit(...args: unknown[]): void;
  strategyClose(...args: unknown[]): void;
  strategyCloseAll(...args: unknown[]): void;
  strategyCancel(...args: unknown[]): void;
  strategyCancelAll(...args: unknown[]): void;
  strategyOrder(...args: unknown[]): void;
  strategyProp(name: string): unknown;
  alert(...args: unknown[]): void;
  alertCondition(...args: unknown[]): void;
  logInfo(...args: unknown[]): void;
  logWarning(...args: unknown[]): void;
  logError(...args: unknown[]): void;
  runtimeError(...args: unknown[]): void;
  callBuiltin(name: string, args: unknown[], named?: Record<string, unknown>): unknown;
  tickerNew(...args: unknown[]): string;
  tickerModify(...args: unknown[]): string;
  tickerStandard(...args: unknown[]): string;
  tickerHeikinashi(...args: unknown[]): string;
  tickerRenko(...args: unknown[]): string;
  tickerKagi(...args: unknown[]): string;
  tickerLinebreak(...args: unknown[]): string;
  tickerPointfigure(...args: unknown[]): string;
  colorNew(...args: unknown[]): unknown;
  colorRgb(...args: unknown[]): unknown;
  colorR(c: unknown): unknown;
  colorG(c: unknown): unknown;
  colorB(c: unknown): unknown;
  colorT(c: unknown): unknown;
  mathSum(...args: unknown[]): unknown;
  strFormat(...args: unknown[]): string;
  strFormatTime(...args: unknown[]): string;
}

function fillArray(arr: arrFuncs.PineArray, val: unknown, from?: number, to?: number): void {
  const size = arrFuncs.getArraySize(arr);
  const start = from ?? 0;
  const end = to ?? size;
  for (let i = start; i < end; i++) {
    arrFuncs.setArrayValue(arr, i, val);
  }
}

function everyArray(arr: arrFuncs.PineArray, fn: (val: unknown) => boolean): boolean {
  const size = arrFuncs.getArraySize(arr);
  for (let i = 0; i < size; i++) {
    if (!fn(arrFuncs.getArrayValue(arr, i))) return false;
  }
  return true;
}

function someArray(arr: arrFuncs.PineArray, fn: (val: unknown) => boolean): boolean {
  const size = arrFuncs.getArraySize(arr);
  for (let i = 0; i < size; i++) {
    if (fn(arrFuncs.getArrayValue(arr, i))) return true;
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
  maxBarsBack: 500,
  _arr: ARRAY_HELPERS,
  _map: MAP_HELPERS,
  _udt: UDT_HELPERS,
  _mtx: MATRIX_HELPERS,
  SMA, EMA, RMA, RSI, Crossover, Crossunder, Change,
  Highest, Lowest, MACD, ATR, Stoch, StdDev, BB,
  DEMA, TEMA, Cum,
};

export function compile(ast: Program, maxBarsBack?: number): CompiledScript {
  const analysis = analyze(ast);

  if (analysis.unsupported.length > 0) {
    return {
      ScriptClass: null as unknown as CompiledScript['ScriptClass'],
      analysis,
      success: false,
      unsupported: analysis.unsupported,
    };
  }

  const code = emit(ast, analysis);

  try {
    const factory = new Function(
      'deps',
      `${RUNTIME_HELPERS}\n${code}`
    );

    const deps = { ...DEFAULT_DEPS };
    if (maxBarsBack !== undefined) deps.maxBarsBack = maxBarsBack;

    const ScriptClass = factory(deps);

    return {
      ScriptClass,
      analysis,
      success: true,
      unsupported: [],
      generatedCode: code,
    };
  } catch (error) {
    return {
      ScriptClass: null as unknown as CompiledScript['ScriptClass'],
      analysis,
      success: false,
      unsupported: [`Compilation error: ${error instanceof Error ? error.message : String(error)}`],
      generatedCode: code,
    };
  }
}
