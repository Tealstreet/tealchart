import { createLiteralTimestampCache } from './literalTimestampCache';
import type { LiteralTimestampCache } from './literalTimestampCache';
import { POSITIONAL_DRAWING_GETTERS } from '../drawings/singleIdGetters';
import { parseRuntimeTimeframeSpec } from './runtimeTimeframeSpec';
import { parseRuntimeSessionDescriptor, parseRuntimeSessionMinute, type RuntimeSessionPeriod } from './runtimeSessionDescriptor';
import { pineExp } from './pineExp';
import type { CallExpression, Expression, Program, Statement } from '../../parser/ast';
import type { Bar, PlotOutput, InputDefinition, SessionClassificationInfo, SessionClosureKind, SymInfo } from '../context';
import { ExecutionContext, mergeChartInfo } from '../context';
import { CALCULATED_BARS_INPUT_ID, projectCalculatedBarOutputs } from '../calculatedBars';
import { TEALSCRIPT_MAX_UNIQUE_REQUEST_CONTEXTS } from '../types';
import { PineRuntimeArgumentError } from '../runtimeArgumentError';
import { nativeMathLog } from '../mathPrecision';
import type { ExecutionError, ExecutionResult, IndicatorDeclarationMetadata, RuntimeApproximationSummary, RuntimeProfile, RuntimeSwallowedErrorSummary, TealscriptRuntimeOptions } from '../types';
import type { BuiltinFunction, BuiltinRegistry } from '../builtins/registry';
import { pineVersionListDescription, pineVersionRules, pineVersionsWhere } from '../../pineVersionRules';
import { pineColorConstant } from '../../pineColorConstants';
import { nativeLog10 } from './nativeLog10';
import type { DeclarationInfo, SecurityCallSite } from './analyzer';
import {
  registerBoxBuiltins,
  registerDrawingConstants,
  registerDrawingObjectCastBuiltins,
  registerLabelBuiltins,
  registerLineBuiltins,
  registerLineFillBuiltins,
  registerPolylineBuiltins,
  registerTableBuiltins,
  pushDrawingRuntimeApproximationReporter,
} from '../builtins/drawings';
import type { DrawingBuiltinRuntime } from '../builtins/drawings';
import type { LineDrawingOutput } from '../drawings/types';
import { getDrawingValue, toDrawingId as toDrawingIdValue, toLineWidth as toLineWidthValue, withDrawing } from '../drawings/helpers';
import { DEFAULT_DRAWING_LIMITS, PineTableReference } from '../drawings/store';
import { pushMatrixRuntimeApproximationReporter } from '../matrices';
import type { StrategyIntrabarContext, StrategyIntrabarDatafeed, StrategyLedger, StrategyDirection, StrategyOcaType, StrategyQuantityType, StrategyTrade } from '../strategy';
import {
  createStrategyLedger,
  createDefaultStrategyOhlcTicks,
  submitStrategyOrder,
  submitOrReplaceStrategyExitOrder,
  submitOrReplaceStrategyEntryOrder,
  fillStrategyMarketOrder,
  fillPendingStrategyMarketOrders,
  fillPendingStrategyOrdersOnTicks,
  markStrategyLedgerToMarket,
  cancelStrategyOrder,
  cancelAllStrategyOrders,
  hasReachedStrategyOrderRiskLimit,
  isStrategyHistoryProp,
  readStrategyHistoryProp,
  STRATEGY_HISTORY_PROPS,
  selectStrategyIntrabarContext,
} from '../strategy';
import { pushArrayRuntimeApproximationReporter } from '../arrays';
import { compile, ARRAY_HELPERS, MAP_HELPERS, UDT_HELPERS, MATRIX_HELPERS } from './compile';
import type { CompiledSecurityScript } from './compile';
import type { CompiledScript, CompiledBarContext, CompileOptions } from './compile';
import type {
  RequestCurrencyRateQuery,
  RequestDatafeed,
  RequestDataContext,
  RequestDatafeedQuery,
  RequestEconomicSeriesQuery,
  RequestFinancialMetricQuery,
  RequestFootprintQuery,
  RequestSeriesFamily,
  RequestSeriesPoint,
  WorkerRequestDataCacheKind,
  WorkerRequestDataCacheQuery,
} from '../requestDatafeed';
import {
  FinancialSymbolResolutionError,
  corporateActionRequestKey,
  currencyRateRequestKey,
  economicRequestKey,
  financialRequestKey,
  footprintDelta,
  footprintPoc,
  footprintRowByPrice,
  footprintRequestKey,
  footprintRows,
  footprintValue,
  footprintValueAreaHigh,
  footprintValueAreaLow,
  isRequestFootprintData,
  isRequestVolumeRowData,
  quandlRequestKey,
  selectCorporateActionField,
  seedRequestSymbol,
  volumeRowDelta,
  volumeRowImbalance,
  volumeRowValue,
} from '../requestDatafeed';
import { Scope, cloneRuntimeSnapshot } from '../scope';
import type { ValueSeries } from './runtime';
import { HistoryBufferSizing, isHistoryBufferResize } from './history';
import { divideV5ConstInts } from './runtime';
import { NumericSeries } from './runtime';
import * as ta from './ta-classes';
import { advanceRollingSum, createRollingSumState } from './rolling-sum';
import type { RollingSumState } from './rolling-sum';
import { createPineArray, normalizeArraySize, getArraySize, getArrayValue, isPineArray, pushArrayValue, removeArrayValue, type PineArray } from '../arrays';
import { createPineMap, isPineMap } from '../maps';
import { createPineMatrix, isPineMatrix } from '../matrices';
import { copyUdtObject, createPineUdtObject, isPineUdtObject, type PineUdtObject } from '../objects';

const LOCAL_REQUEST_DYNAMIC_REQUESTS_MESSAGE = (name: string): string => {
  const legacyVersions = pineVersionListDescription(
    pineVersionsWhere((rules) => rules.allowsNonExportedFunctionRequestsWithoutDynamicRequests),
  );
  return `request.* calls in local scopes require dynamic_requests=true: ${name}. Non-exported request wrapper functions were valid without dynamic_requests in ${legacyVersions} but require dynamic_requests=true in Pine v6.`;
};

export interface CompiledExecutionOptions {
  timenowObservations?: Array<number | undefined>;
  runtime?: TealscriptRuntimeOptions;
  maxBarsBack?: number;
  requestDatafeed?: RequestDatafeed;
  strategyIntrabarDatafeed?: StrategyIntrabarDatafeed;
  libraries?: Map<string, Program>;
  realtimeLastBar?: {
    isNew: boolean;
    previousIsNew?: boolean;
  };
  confirmedRealtimeBarIndex?: number;
  confirmedRealtimeBarStartIndex?: number;
  intrabarState?: Map<number, { before: unknown; after: unknown }>;
}

export type CompiledScriptExecution =
  | { status: 'success'; result: ExecutionResult }
  | { status: 'failure'; kind: 'compile' | 'runtime'; reason: string };

export interface CompiledRequestDataQuery {
  kind: WorkerRequestDataCacheKind;
  query: WorkerRequestDataCacheQuery;
}

export interface CompiledRequestDataQueryCollection {
  queries: CompiledRequestDataQuery[];
  hasUnpreloadableQueries: boolean;
  unpreloadableReasons: string[];
}

class CompiledRuntimeErrorException extends Error {
  readonly line?: number;
  readonly column?: number;

  constructor(message: string, line?: number, column?: number) {
    super(message);
    this.name = 'CompiledRuntimeErrorException';
    this.line = line;
    this.column = column;
  }
}

function throwCompiledRuntimeError(message: string): never {
  throw new CompiledRuntimeErrorException(message);
}

function createCompiledExecutionError(error: unknown, barIndex?: number): ExecutionError {
  if (error instanceof PineRuntimeArgumentError) {
    const message = barIndex === undefined ? error.message : `Error on bar ${barIndex}: ${error.message}`;
    return {
      message,
      code: error.runtimeErrorCode,
      barIndex,
      runtimeError: { message, code: error.runtimeErrorCode, barIndex },
    };
  }
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof CompiledRuntimeErrorException) {
    return {
      message,
      code: 'runtime.error',
      line: error.line,
      column: error.column,
      runtimeError: {
        code: 'runtime.error',
        message,
        line: error.line,
        column: error.column,
      },
    };
  }
  if (isKnownPineRuntimeError(error)) {
    return { message, runtimeError: { code: 'runtime.error', message, barIndex } };
  }
  return { message };
}

function isKnownPineRuntimeError(error: unknown): boolean {
  if (error instanceof PineRuntimeArgumentError) return true;
  if (!(error instanceof Error)) return false;
  if (/^Error on bar \d+: Objects positioned using xloc\.bar_index cannot be drawn further than 500 bars into the future\.$/.test(error.message)) return true;
  if (error.message.startsWith('Trace-undetermined Pine v5 const-int division:')) return true;
  if (error.message.startsWith('Invalid argument ')
    && error.message.includes("' for 'type' in the 'ta.pivot_point_levels' function. Possible values:")) return true;
  return /^(Array|Drawing objects using xloc\.bar_index |Cannot create an array|Cannot use (pop|shift)\(\)|Historical offset |Index 'from' should be less than index 'to'|Slice is out of bounds|Map (cannot|keys must)|Matrix( |\-)|TA |ta\.|(box|label|line|linefill|table) x requires |line\.get_price |Table |Too many (plot outputs|table cells))/.test(error.message);
}

type RuntimeSwallowedErrorAccumulator = Map<string, RuntimeSwallowedErrorSummary>;
type RuntimeApproximationAccumulator = Map<string, RuntimeApproximationSummary>;

function recordSwallowedRuntimeError(
  accumulator: RuntimeSwallowedErrorAccumulator,
  site: string,
  barIndex: number,
  error: unknown,
): void {
  const existing = accumulator.get(site);
  if (existing) {
    existing.count += 1;
    return;
  }
  accumulator.set(site, {
    site,
    count: 1,
    firstBarIndex: barIndex,
    firstMessage: error instanceof Error ? error.message : String(error),
  });
}

function recordRuntimeApproximation(
  accumulator: RuntimeApproximationAccumulator,
  site: string,
  message: string,
  barIndex?: number,
): void {
  const existing = accumulator.get(site);
  if (existing) {
    existing.count += 1;
    if (existing.firstBarIndex === undefined && barIndex !== undefined) existing.firstBarIndex = barIndex;
    return;
  }
  accumulator.set(site, {
    site,
    count: 1,
    firstBarIndex: barIndex,
    message,
  });
}

function sortedRuntimeApproximations(accumulator: RuntimeApproximationAccumulator): RuntimeApproximationSummary[] | undefined {
  const values = [...accumulator.values()];
  return values.length > 0 ? values.sort((left, right) => left.site.localeCompare(right.site)) : undefined;
}

function sortedSwallowedRuntimeErrors(accumulator: RuntimeSwallowedErrorAccumulator): RuntimeSwallowedErrorSummary[] | undefined {
  if (accumulator.size === 0) return undefined;
  return [...accumulator.values()].sort((left, right) => left.site.localeCompare(right.site));
}

export function tryCompile(ast: Program, maxBarsBack?: number, options?: CompileOptions): CompiledScript {
  return compile(ast, maxBarsBack, options);
}

const compiledCache = new WeakMap<Program, CompiledScript>();
const compiledLibraryCache = new WeakMap<Program, WeakMap<Map<string, Program>, CompiledScript>>();

export function executeCompiledScript(
  ast: Program,
  bars: Bar[],
  inputs?: Map<string, unknown>,
  options?: CompiledExecutionOptions,
): CompiledScriptExecution {
  let compiled: CompiledScript | undefined;
  if (options?.libraries) {
    compiled = compiledLibraryCache.get(ast)?.get(options.libraries);
  } else {
    compiled = compiledCache.get(ast);
  }
  if (!compiled) {
    compiled = compile(ast, options?.maxBarsBack, { libraries: options?.libraries });
    if (options?.libraries) {
      let cache = compiledLibraryCache.get(ast);
      if (!cache) {
        cache = new WeakMap<Map<string, Program>, CompiledScript>();
        compiledLibraryCache.set(ast, cache);
      }
      cache.set(options.libraries, compiled);
    } else {
      compiledCache.set(ast, compiled);
    }
  }
  if (!compiled.success) {
    return {
      status: 'failure',
      kind: 'compile',
      reason: `compile-unsupported: ${compiled.unsupported.join('; ')}`,
    };
  }
  try {
    const result = executeCompiled(compiled, bars, inputs, options);
    if (!result) {
      return {
        status: 'failure',
        kind: 'runtime',
        reason: 'compiled-execution-error: compiled runtime returned no result',
      };
    }
    return { status: 'success', result };
  } catch (error) {
    return {
      status: 'failure',
      kind: 'runtime',
      reason: `compiled-execution-error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export function collectCompiledRequestDataQueries(
  ast: Program,
  inputs?: Map<string, unknown>,
  options?: Pick<CompiledExecutionOptions, 'libraries' | 'maxBarsBack' | 'runtime'>,
): CompiledRequestDataQuery[] {
  return collectCompiledRequestDataQueryCollection(ast, inputs, options).queries;
}

export function collectCompiledRequestDataQueryCollection(
  ast: Program,
  inputs?: Map<string, unknown>,
  options?: Pick<CompiledExecutionOptions, 'libraries' | 'maxBarsBack' | 'runtime'>,
): CompiledRequestDataQueryCollection {
  const compiled = compile(ast, options?.maxBarsBack, { libraries: options?.libraries });
  if (!compiled.success) {
    return { queries: [], hasUnpreloadableQueries: false, unpreloadableReasons: [] };
  }

  const queries: CompiledRequestDataQuery[] = [];
  const seen = new Set<string>();
  const unpreloadableReasons = new Set<string>();
  const addQuery = (query: CompiledRequestDataQuery): void => {
    const key = `${query.kind}\u0000${JSON.stringify(query.query)}`;
    if (seen.has(key)) return;
    seen.add(key);
    queries.push(query);
  };

  for (const site of compiled.analysis.securitySites) {
    const query = collectSecurityBarsQuery(site, inputs, options?.runtime);
    if (query) {
      addQuery({ kind: 'bars', query });
    } else {
      unpreloadableReasons.add(`${site.kind}:non-static-routing-or-expression`);
    }
  }
  const shadowsDividends = ast.body.some(node => node.type === 'FunctionDeclaration' && node.name.name === 'dividends');
  for (const call of collectCallExpressions(ast)) {
    const sourceName = requestCalleeName(call.callee);
    const fullName = sourceName === 'dividends' && (ast.version ?? 6) < 5 && !shadowsDividends
      ? 'request.dividends' : sourceName;
    const query = collectPointRequestQuery(call, inputs, options?.runtime, fullName);
    if (query) {
      addQuery(query);
    } else {
      const reason = unpreloadablePointRequestReason(call, inputs, options?.runtime, fullName);
      if (reason) unpreloadableReasons.add(reason);
    }
  }

  return {
    queries,
    hasUnpreloadableQueries: unpreloadableReasons.size > 0,
    unpreloadableReasons: [...unpreloadableReasons],
  };
}

function extractStrategySettings(compiled: CompiledScript): Partial<StrategyLedger['settings']> {
  const decl = compiled.analysis.declarationInfo;
  if (!decl || decl.kind !== 'strategy') return {};
  const node = decl.node;
  if (node.type !== 'IndicatorDeclaration') return {};
  const settings: Partial<StrategyLedger['settings']> = { title: decl.title };

  const numVal = (expr: unknown): number | undefined => {
    const e = expr as { type?: string; value?: number } | undefined;
    if (!e) return undefined;
    if (e.type === 'NumericLiteral') return e.value;
    return undefined;
  };
  const boolVal = (expr: unknown): boolean | undefined => {
    const e = expr as { type?: string; value?: boolean } | undefined;
    if (!e) return undefined;
    if (e.type === 'BooleanLiteral') return e.value;
    return undefined;
  };
  const strVal = (expr: unknown): string | undefined => {
    const e = expr as {
      type?: string;
      value?: string;
      name?: string;
      object?: unknown;
      property?: { name?: string };
    } | undefined;
    if (!e) return undefined;
    if (e.type === 'StringLiteral') return e.value;
    if (e.type === 'MemberExpression' && e.property?.name) {
      const objectPath = strVal(e.object);
      return objectPath ? `${objectPath}.${e.property.name}` : undefined;
    }
    if (e.type === 'Identifier') return e.name;
    return undefined;
  };

  const ic = numVal(node.initial_capital);
  if (ic !== undefined) settings.initialCapital = ic;
  const dqv = numVal(node.default_qty_value);
  if (dqv !== undefined) settings.defaultQtyValue = dqv;
  const pyr = numVal(node.pyramiding);
  if (pyr !== undefined) settings.pyramiding = pyr;
  const cv = numVal(node.commission_value);
  if (cv !== undefined) settings.commissionValue = cv;
  const slip = numVal(node.slippage);
  if (slip !== undefined) settings.slippageTicks = slip;
  const bfla = numVal(node.backtest_fill_limits_assumption);
  if (bfla !== undefined) settings.backtestFillLimitsAssumptionTicks = bfla;
  const ml = numVal(node.margin_long);
  if (ml !== undefined) settings.marginLong = ml;
  const ms = numVal(node.margin_short);
  if (ms !== undefined) settings.marginShort = ms;
  const coof = boolVal(node.calc_on_order_fills);
  if (coof !== undefined) settings.calcOnOrderFills = coof;
  const coet = boolVal(node.calc_on_every_tick);
  if (coet !== undefined) settings.calcOnEveryTick = coet;
  const coeht = boolVal(node.calc_on_every_history_tick);
  if (coeht !== undefined) settings.calcOnEveryHistoryTick = coeht;
  const pooc = boolVal(node.process_orders_on_close);
  if (pooc !== undefined) settings.processOrdersOnClose = pooc;
  const ubm = boolVal(node.use_bar_magnifier);
  if (ubm !== undefined) settings.useBarMagnifier = ubm;
  const foos = boolVal(node.fill_orders_on_standard_ohlc);
  if (foos !== undefined) settings.fillOrdersOnStandardOhlc = foos;
  const rfr = numVal(node.risk_free_rate);
  if (rfr !== undefined) settings.riskFreeRate = rfr;
  const cur = strVal(node.currency);
  if (cur !== undefined) settings.currency = cur.startsWith('currency.') ? cur.slice('currency.'.length) : cur;

  const dqt = strVal(node.default_qty_type);
  if (dqt !== undefined) {
    if (dqt.includes('fixed')) settings.defaultQtyType = 'fixed';
    else if (dqt.includes('cash')) settings.defaultQtyType = 'cash';
    else if (dqt.includes('percent_of_equity')) settings.defaultQtyType = 'percent_of_equity';
  }
  const ct = strVal(node.commission_type);
  if (ct !== undefined) {
    if (ct.includes('cash_per_contract')) settings.commissionType = 'cash_per_contract';
    else if (ct.includes('cash_per_order')) settings.commissionType = 'cash_per_order';
    else if (ct.includes('percent')) settings.commissionType = 'percent';
  }
  const cer = strVal(node.close_entries_rule);
  if (cer === 'ANY' || cer === 'FIFO') settings.closeEntriesRule = cer;

  return settings;
}

function normalizeDirection(val: unknown): StrategyDirection {
  if (val === 'long' || val === true || val === 1) return 'long';
  if (val === 'short' || val === false || val === -1) return 'short';
  return 'long';
}

function toOptionalNumber(val: unknown): number | undefined {
  if (val === undefined || val === null) return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}

function toOptionalBoolean(val: unknown): boolean | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return Number.isFinite(val) ? val !== 0 : undefined;
  return undefined;
}

function toOptionalString(val: unknown): string | undefined {
  if (val === undefined || val === null) return undefined;
  return String(val);
}

function normalizeOptionalCompiledStrategyOcaType(val: unknown): StrategyOcaType | undefined {
  if (val === undefined || val === null || (typeof val === 'number' && Number.isNaN(val))) return undefined;
  if (val === 'cancel' || val === 'reduce' || val === 'none') return val;
  throw new Error(`Invalid strategy oca_type: ${String(val)}`);
}

const COMPILED_STRATEGY_ORDER_ARGS = ['id', 'direction', 'qty', 'limit', 'stop', 'oca_name', 'oca_type', 'comment', 'alert_message', 'disable_alert'] as const;
const COMPILED_STRATEGY_EXIT_ARGS = [
  'id',
  'from_entry',
  'qty',
  'qty_percent',
  'profit',
  'limit',
  'loss',
  'stop',
  'trail_price',
  'trail_points',
  'trail_offset',
  'oca_name',
  'comment',
  'comment_profit',
  'comment_loss',
  'comment_trailing',
  'alert_message',
  'alert_profit',
  'alert_loss',
  'alert_trailing',
  'disable_alert',
] as const;
const COMPILED_STRATEGY_CLOSE_ARGS = ['id', 'comment', 'qty', 'qty_percent', 'alert_message', 'immediately', 'disable_alert'] as const;
const COMPILED_STRATEGY_CLOSE_ALL_ARGS = ['comment', 'alert_message', 'immediately', 'disable_alert'] as const;

function splitCompiledStrategyArgs(args: unknown[]): { pos: unknown[]; named: Record<string, unknown> } {
  const pos = [...args];
  const last = pos[pos.length - 1];
  const named = typeof last === 'object' && last !== null && !Array.isArray(last)
    ? pos.pop() as Record<string, unknown>
    : {};
  return { pos, named };
}

function compiledOrderedArg(
  pos: unknown[],
  named: Record<string, unknown> | undefined,
  names: readonly string[],
  index: number,
  fallback?: unknown,
): unknown {
  const paramName = names[index];
  if (paramName && named && Object.prototype.hasOwnProperty.call(named, paramName)) {
    return named[paramName];
  }
  const precedingNamed = named
    ? names.slice(0, index).filter((name) => Object.prototype.hasOwnProperty.call(named, name)).length
    : 0;
  return pos[index - precedingNamed] ?? fallback;
}

function resolveCompiledStrategyOrderQty(
  ledger: StrategyLedger,
  qtyType: StrategyQuantityType,
  qtyValue: number,
  limitPrice: number | undefined,
  stopPrice: number | undefined,
  closePrice: number,
): number {
  if (qtyType === 'fixed') return qtyValue;
  const priceBasis = limitPrice ?? stopPrice ?? closePrice;
  if (!Number.isFinite(priceBasis) || priceBasis <= 0) return NaN;
  if (qtyType === 'cash') return qtyValue / priceBasis;
  return (ledger.equity * (qtyValue / 100)) / priceBasis;
}

function canSubmitCompiledStrategyEntry(ledger: StrategyLedger, direction: StrategyDirection): boolean {
  const openEntries = ledger.openTrades.filter((trade) => trade.direction === direction).length;
  return openEntries < Math.max(1, ledger.settings.pyramiding);
}

function isCompiledStrategyEntryDirectionRestricted(ledger: StrategyLedger, direction: StrategyDirection): boolean {
  const allowed = ledger.settings.allowedEntryDirection;
  return allowed !== 'all' && allowed !== direction;
}

function resolveCompiledRestrictedStrategyEntryCloseQty(ledger: StrategyLedger, direction: StrategyDirection): number {
  const position = ledger.position;
  if (position.direction === null || position.direction === direction) {
    return 0;
  }
  return Math.abs(position.size);
}

function applyCompiledStrategyMaxPositionSize(ledger: StrategyLedger, direction: StrategyDirection, requestedQty: number): number {
  const maxPositionSize = ledger.settings.maxPositionSize;
  if (maxPositionSize === null) {
    return requestedQty;
  }

  const sameDirectionSize = ledger.position.direction === direction ? Math.abs(ledger.position.size) : 0;
  const pendingSameDirectionSize = ledger.orders.reduce((total, order) => {
    if (order.status !== 'pending' || !order.isEntry || order.direction !== direction) {
      return total;
    }
    return total + (order.requestedQty ?? order.qty ?? 0);
  }, 0);
  return Math.min(requestedQty, Math.max(0, maxPositionSize - sameDirectionSize - pendingSameDirectionSize));
}

function compiledPositiveNumber(value: unknown): number | undefined {
  const num = toOptionalNumber(value);
  return num !== undefined && num > 0 ? num : undefined;
}

function compiledRiskCashOrPercent(value: unknown): 'cash' | 'percent_of_equity' {
  return value === 'cash' ? 'cash' : 'percent_of_equity';
}

function resolveCompiledStrategyCloseQty(openQty: number, rawQty: number | undefined, rawQtyPercent: number | undefined): number {
  if (rawQty !== undefined) return Number.isFinite(rawQty) && rawQty > 0 ? Math.min(rawQty, openQty) : 0;
  if (rawQtyPercent !== undefined) return Number.isFinite(rawQtyPercent) && rawQtyPercent > 0 ? Math.min(openQty * (rawQtyPercent / 100), openQty) : 0;
  return openQty;
}

function resolveCompiledStrategyWeightedEntryPrice(trades: Array<{ entryPrice: number; qty?: number }>): number | undefined {
  let weightedTotal = 0;
  let totalQty = 0;
  let unweightedTotal = 0;
  for (const trade of trades) {
    unweightedTotal += trade.entryPrice;
    if (trade.qty !== undefined && Number.isFinite(trade.qty) && trade.qty > 0) {
      weightedTotal += trade.entryPrice * trade.qty;
      totalQty += trade.qty;
    }
  }
  return totalQty > 0 ? weightedTotal / totalQty : trades.length > 0 ? unweightedTotal / trades.length : undefined;
}

function resolveCompiledStrategyExitOffsetPrice(
  direction: StrategyDirection,
  trades: Array<{ entryPrice: number; qty?: number }>,
  ticks: number | undefined,
  kind: 'profit' | 'loss',
  mintick: number,
): number | undefined {
  if (ticks === undefined || !Number.isFinite(ticks) || ticks < 0) return undefined;
  const entryPrice = resolveCompiledStrategyWeightedEntryPrice(trades);
  if (entryPrice === undefined || !Number.isFinite(mintick) || mintick <= 0) return undefined;
  const offset = ticks * mintick;
  if (kind === 'profit') return direction === 'long' ? entryPrice + offset : entryPrice - offset;
  return direction === 'long' ? entryPrice - offset : entryPrice + offset;
}

function resolveCompiledStrategyTrailActivationPrice(
  direction: StrategyDirection,
  trades: Array<{ entryPrice: number; qty?: number }>,
  trailPrice: number | undefined,
  trailPoints: number | undefined,
  mintick: number,
  pineVersion: number,
): number | undefined {
  if (trailPoints === undefined || !Number.isFinite(trailPoints)) return trailPrice;
  const entryPrice = resolveCompiledStrategyWeightedEntryPrice(trades);
  if (entryPrice === undefined || !Number.isFinite(mintick) || mintick <= 0) return trailPrice;
  const offset = trailPoints * mintick;
  const relativePrice = direction === 'long' ? entryPrice + offset : entryPrice - offset;
  return resolveCompiledStrategyExitPairPrice(trailPrice, relativePrice, direction, 'profit', pineVersion);
}

function resolveCompiledStrategyExitPairPrice(
  absolutePrice: number | undefined,
  relativePrice: number | undefined,
  direction: StrategyDirection,
  kind: 'profit' | 'loss',
  pineVersion: number,
): number | undefined {
  if (absolutePrice === undefined) return relativePrice;
  if (relativePrice === undefined || !pineVersionRules(pineVersion).strategyExitUsesRelativeAndAbsoluteTargets) {
    return absolutePrice;
  }
  // v6 evaluates each same-kind pair; v5 retains absolute precedence.
  // https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#strategyexit-evaluates-parameter-pairs
  const increasingPriceTriggersFirst = (direction === 'long') === (kind === 'profit');
  return increasingPriceTriggersFirst
    ? Math.min(absolutePrice, relativePrice)
    : Math.max(absolutePrice, relativePrice);
}

function compiledStrategyTradePercent(trade: StrategyTrade | undefined, value: number): number {
  if (!trade) return NaN;
  const basis = trade.entryPrice * Math.abs(trade.qty);
  return Number.isFinite(basis) && basis > 0 ? (value / basis) * 100 : NaN;
}

function normalizeRuntimePlotshapeStyle(value: unknown): string | undefined {
  const style = toOptionalString(value);
  if (!style?.startsWith('plotshape.style_')) return style;
  const alias = style.slice('plotshape.style_'.length);
  if (alias === 'label_up') return 'labelup';
  if (alias === 'label_down') return 'labeldown';
  return alias;
}

function normalizeRuntimePlotStyle(value: unknown, columnsStyleNumericValue: number | undefined): PlotOutput['style'] | undefined {
  if (columnsStyleNumericValue !== undefined && value === columnsStyleNumericValue) return 'columns';
  const style = toOptionalString(value);
  if (!style?.startsWith('plot.style_')) return style as PlotOutput['style'] | undefined;
  const alias = style.slice('plot.style_'.length);
  return (alias === 'step' ? 'stepline' : alias) as PlotOutput['style'];
}

function normalizeRuntimePlotLineStyle(value: unknown): PlotOutput['lineStyle'] | undefined {
  const style = toOptionalString(value);
  if (style?.startsWith('plot.linestyle_')) return style.slice('plot.linestyle_'.length) as PlotOutput['lineStyle'];
  if (style?.startsWith('hline.style_')) return style.slice('hline.style_'.length) as PlotOutput['lineStyle'];
  return style as PlotOutput['lineStyle'] | undefined;
}

function isRuntimeNa(value: unknown): boolean {
  return typeof value === 'number' && Number.isNaN(value);
}

function toRuntimeNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function isFiniteRuntimeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function toRuntimeString(value: unknown, numericFormat?: string): string {
  if (value === null || value === undefined || isRuntimeNa(value)) return 'NaN';
  if (typeof value === 'number' && numericFormat !== undefined) return formatRuntimeNumber(value, numericFormat);
  if (isPineArray(value)) return `[${value.values.map((item) => toRuntimeString(item, numericFormat)).join(', ')}]`;
  if (isPineMatrix(value)) {
    return `[${Array.from({ length: value.rows }, (_, row) =>
      `[${Array.from({ length: value.columns }, (_, column) => toRuntimeString(value.values[row * value.columns + column], numericFormat)).join(', ')}]`
    ).join(', ')}]`;
  }
  return String(value);
}

function replaceRuntimeStringOccurrence(source: string, target: string, replacement: string, occurrenceArg: unknown): string {
  const occurrence = occurrenceArg === undefined ? 0 : Math.trunc(toRuntimeNumber(occurrenceArg));
  if (!Number.isFinite(occurrence) || occurrence < 0) return source;
  if (target === '') return occurrence === 0 ? source.replace(target, replacement) : source;
  if (occurrence === 0) return source.replace(target, replacement);

  let fromIndex = 0;
  for (let index = 0; index <= occurrence; index += 1) {
    const matchIndex = source.indexOf(target, fromIndex);
    if (matchIndex === -1) return source;
    if (index === occurrence) {
      return source.slice(0, matchIndex) + replacement + source.slice(matchIndex + target.length);
    }
    fromIndex = matchIndex + target.length;
  }
  return source;
}

function formatRuntimeNumber(value: number, format: string): string {
  if (isRuntimeNa(value)) return toRuntimeString(value);
  const normalizedFormat = format.trim().toLowerCase();
  if (normalizedFormat === 'integer') return Math.round(value).toString();
  if (normalizedFormat === 'currency') {
    return value < 0 ? `-$${formatRuntimeGroupedNumber(Math.abs(value), 2)}` : `$${formatRuntimeGroupedNumber(value, 2)}`;
  }
  if (normalizedFormat === 'percent') return `${Math.round(value * 100)}%`;

  const mask = /^([#0,]+)(?:\.([0#]+))?(%)?$/.exec(format);
  if (mask) {
    const [, integerMask, digits = '', percent] = mask;
    const scaled = percent ? value * 100 : value;
    const rounded = digits ? scaled.toFixed(digits.length) : Math.round(scaled).toString();
    const [integer, fractional = ''] = rounded.split('.');
    const sign = integer.startsWith('-') ? '-' : '';
    const minimumIntegerDigits = integerMask.split('0').length - 1;
    const paddedInteger = sign + integer.slice(sign.length).padStart(minimumIntegerDigits, '0');
    const requiredDigits = digits.lastIndexOf('0') + 1;
    let fraction = fractional;
    while (fraction.length > requiredDigits && fraction.endsWith('0')) fraction = fraction.slice(0, -1);
    const formatted = fraction ? `${paddedInteger}.${fraction}` : paddedInteger;
    const grouped = integerMask.includes(',') ? addRuntimeThousandsSeparators(formatted) : formatted;
    return percent ? `${grouped}%` : grouped;
  }
  return String(value);
}

function formatRuntimeGroupedNumber(value: number, precision: number): string {
  return addRuntimeThousandsSeparators(value.toFixed(precision));
}

function addRuntimeThousandsSeparators(value: string): string {
  const sign = value.startsWith('-') ? '-' : '';
  const unsigned = sign ? value.slice(1) : value;
  const [integerPart, decimalPart] = unsigned.split('.');
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${groupedInteger}${decimalPart === undefined ? '' : `.${decimalPart}`}`;
}

function formatRuntimeStringPlaceholder(value: unknown, modifier?: string, format?: string): string {
  const normalizedModifier = modifier?.trim().toLowerCase();
  const normalizedFormat = format?.trim();

  if (normalizedModifier === undefined) {
    return typeof value === 'number'
      ? formatRuntimeNumber(value, normalizedFormat ?? '#,###.###')
      : toRuntimeString(value);
  }
  if (normalizedModifier === 'number') {
    if (isRuntimeNa(value)) return toRuntimeString(value);
    if (isPineArray(value)) throwCompiledRuntimeError('Cannot format given Object as a Number');
    return typeof value === 'number' ? formatRuntimeNumber(value, normalizedFormat ?? '#,###.###') : toRuntimeString(value);
  }
  return toRuntimeString(value);
}

function formatRuntimeString(args: unknown[], named?: Record<string, unknown>, requireBalancedRightBraces = false): string {
  const hasNamedFormat = !!named && Object.prototype.hasOwnProperty.call(named, 'format');
  const hasNamedFormatString = !!named && Object.prototype.hasOwnProperty.call(named, 'formatString');
  const template = toRuntimeString(hasNamedFormat ? named.format : hasNamedFormatString ? named.formatString : args[0]);
  const valueOffset = hasNamedFormat || hasNamedFormatString ? 0 : 1;
  const values = args.slice(valueOffset);
  if (named) {
    for (const [name, value] of Object.entries(named)) {
      const match = /^arg(\d+)$/.exec(name);
      if (!match) continue;
      values[Number(match[1])] = value;
    }
  }
  // Apostrophe-quoted text is literal. Doubled apostrophes do not open a quote.
  let quoted = false;
  let depth = 0;
  for (let i = 0; i < template.length; i += 1) {
    const char = template[i];
    if (char === "'") {
      if (template[i + 1] === "'") { i += 1; continue; }
      quoted = !quoted;
    } else if (!quoted && char === '{') {
      depth += 1;
    } else if (!quoted && char === '}') {
      if (depth > 0) depth -= 1;
      else if (requireBalancedRightBraces) throwCompiledRuntimeError('Formatting pattern contains unbalanced curly braces');
    }
  }
  if (depth > 0) throwCompiledRuntimeError('Formatting pattern contains unbalanced curly braces');

  let result = '';
  quoted = false;
  for (let i = 0; i < template.length; i += 1) {
    const char = template[i];
    if (char === "'") {
      if (template[i + 1] === "'") { result += "'"; i += 1; }
      else quoted = !quoted;
      continue;
    }
    if (!quoted && char === '{') {
      const match = /^\{(\d+)(?::([^}]+)|\s*,\s*([^,{}]+)\s*(?:,\s*([^{}]+?)\s*)?)?\}/.exec(template.slice(i));
      if (match) {
        result += formatRuntimeStringPlaceholder(values[Number(match[1])], match[3], match[2] ?? match[4]);
        i += match[0].length - 1;
        continue;
      }
    }
    result += char;
  }
  return result;
}

const RUNTIME_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const RUNTIME_WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

function parseRuntimeFixedTimezoneOffsetMinutes(timezone: string): number | null {
  if (timezone === 'UTC' || timezone === 'GMT' || timezone === 'Etc/UTC') return 0;
  const match = /^(?:UTC|GMT)([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(timezone);
  if (!match) return null;
  const sign = match[1] === '+' ? 1 : -1;
  const hours = Number(match[2]);
  const minutes = match[3] === undefined ? 0 : Number(match[3]);
  return sign * (hours * 60 + minutes);
}

const RUNTIME_IANA_FORMATTER_CACHE_LIMIT = 64;
const runtimeIanaTimezoneFormatters = new Map<string, Intl.DateTimeFormat>();
const RUNTIME_IANA_OFFSET_CACHE_LIMIT = 8192;
const runtimeIanaTimezoneOffsets = new Map<string, number>();

function getRuntimeIanaTimezoneOffsetMinutes(timezone: string, timestamp: number): number | null {
  if (!Number.isFinite(timestamp)) return null;

  const cacheKey = `${timezone}\0${timestamp}`;
  const cachedOffset = runtimeIanaTimezoneOffsets.get(cacheKey);
  if (cachedOffset !== undefined) return cachedOffset;

  try {
    let formatter = runtimeIanaTimezoneFormatters.get(timezone);
    if (!formatter) {
      formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      });
      if (runtimeIanaTimezoneFormatters.size >= RUNTIME_IANA_FORMATTER_CACHE_LIMIT) {
        const oldestTimezone = runtimeIanaTimezoneFormatters.keys().next().value;
        if (oldestTimezone !== undefined) runtimeIanaTimezoneFormatters.delete(oldestTimezone);
      }
      runtimeIanaTimezoneFormatters.set(timezone, formatter);
    }
    const parts = formatter.formatToParts(new Date(timestamp));
    const values = new Map(parts.map((part) => [part.type, part.value]));
    const year = Number(values.get('year'));
    const month = Number(values.get('month'));
    const day = Number(values.get('day'));
    const hour = Number(values.get('hour'));
    const minute = Number(values.get('minute'));
    const second = Number(values.get('second'));
    if ([year, month, day, hour, minute, second].some((value) => !Number.isFinite(value))) return null;
    const offset = Math.round((Date.UTC(year, month - 1, day, hour, minute, second) - timestamp) / 60000);
    if (Number.isFinite(offset)) {
      if (runtimeIanaTimezoneOffsets.size >= RUNTIME_IANA_OFFSET_CACHE_LIMIT) {
        const oldestKey = runtimeIanaTimezoneOffsets.keys().next().value;
        if (oldestKey !== undefined) runtimeIanaTimezoneOffsets.delete(oldestKey);
      }
      runtimeIanaTimezoneOffsets.set(cacheKey, offset);
    }
    return offset;
  } catch {
    return null;
  }
}

function getRuntimeTimezoneOffsetMinutes(timezone: string, timestamp: number): number {
  return parseRuntimeFixedTimezoneOffsetMinutes(timezone)
    ?? getRuntimeIanaTimezoneOffsetMinutes(timezone, timestamp)
    ?? 0;
}

function getRuntimeIsoWeek(date: Date): number {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  return Math.ceil(((copy.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function formatRuntimeTimestamp(timestamp: unknown, format: string, timezone: string): string {
  const value = toRuntimeNumber(timestamp);
  if (!Number.isFinite(value)) return 'NaN';

  const offsetMinutes = getRuntimeTimezoneOffsetMinutes(timezone, value);
  const date = new Date(value + offsetMinutes * 60_000);
  const pad = (part: number, length = 2): string => String(part).padStart(length, '0');
  const formatOffset = (): string => {
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absolute = Math.abs(offsetMinutes);
    return `${sign}${pad(Math.trunc(absolute / 60))}${pad(absolute % 60)}`;
  };
  const formatTimezoneName = (style: 'short' | 'long'): string => {
    const fixedOffset = parseRuntimeFixedTimezoneOffsetMinutes(timezone);
    if (fixedOffset !== null && fixedOffset !== 0) return `GMT${formatOffset()}`;

    try {
      const part = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: style,
      }).formatToParts(new Date(value)).find((candidate) => candidate.type === 'timeZoneName');
      return part?.value ?? (style === 'short' ? 'UTC' : timezone);
    } catch {
      return fixedOffset === 0
        ? (style === 'short' ? 'UTC' : 'Coordinated Universal Time')
        : `GMT${formatOffset()}`;
    }
  };

  const hour24 = date.getUTCHours();
  const hour12 = hour24 % 12 || 12;
  const millisecond = pad(date.getUTCMilliseconds(), 3);
  const monthName = RUNTIME_MONTH_NAMES[date.getUTCMonth()];
  const weekdayName = RUNTIME_WEEKDAY_NAMES[date.getUTCDay()];
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const currentDate = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const dayOfYear = Math.floor((currentDate - yearStart) / 86_400_000) + 1;
  const weekOfYear = getRuntimeIsoWeek(date);
  const firstDayOfMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).getUTCDay();
  const weekOfMonth = Math.ceil((date.getUTCDate() + firstDayOfMonth) / 7);
  const timezoneNameLong = format.includes('zzzz') ? formatTimezoneName('long') : '';
  const timezoneNameShort = format.includes('z') ? formatTimezoneName('short') : '';
  const tokens: Array<[string, string]> = [
    ['yyyy', String(date.getUTCFullYear())],
    ['yy', pad(date.getUTCFullYear() % 100)],
    ['y', String(date.getUTCFullYear())],
    ['MMMM', monthName],
    ['MMM', monthName.slice(0, 3)],
    ['EEEE', weekdayName],
    ['E', weekdayName.slice(0, 3)],
    ['DDD', pad(dayOfYear, 3)],
    ['DD', pad(dayOfYear)],
    ['D', String(dayOfYear)],
    ['ww', pad(weekOfYear)],
    ['w', String(weekOfYear)],
    ['W', String(weekOfMonth)],
    ['MM', pad(date.getUTCMonth() + 1)],
    ['M', String(date.getUTCMonth() + 1)],
    ['dd', pad(date.getUTCDate())],
    ['d', String(date.getUTCDate())],
    ['HH', pad(hour24)],
    ['H', String(hour24)],
    ['hh', pad(hour12)],
    ['h', String(hour12)],
    ['mm', pad(date.getUTCMinutes())],
    ['m', String(date.getUTCMinutes())],
    ['ss', pad(date.getUTCSeconds())],
    ['s', String(date.getUTCSeconds())],
    ['SSS', millisecond],
    ['SS', millisecond.slice(0, 2)],
    ['S', millisecond.slice(0, 1)],
    ['a', hour24 < 12 ? 'AM' : 'PM'],
    ['Z', formatOffset()],
    ['zzzz', timezoneNameLong],
    ['z', timezoneNameShort],
  ];

  let result = '';
  for (let index = 0; index < format.length;) {
    if (format[index] === "'") {
      index += 1;
      while (index < format.length) {
        if (format[index] === "'") {
          if (format[index + 1] === "'") {
            result += "'";
            index += 2;
            continue;
          }
          index += 1;
          break;
        }
        result += format[index];
        index += 1;
      }
      continue;
    }

    const token = tokens.find(([candidate]) => format.startsWith(candidate, index));
    if (token) {
      result += token[1];
      index += token[0].length;
    } else {
      result += format[index];
      index += 1;
    }
  }
  return result;
}

interface RuntimeTimeContext {
  time: { get(index: number): unknown };
  syminfo: { timezone: string };
}

type RuntimeSessionKind = Extract<SessionClosureKind, 'premarket' | 'regular' | 'postmarket' | 'extended'>;

const US_EQUITY_SESSION_EXCHANGES = new Set([
  'AMEX',
  'ARCA',
  'BATS',
  'CBOE',
  'IEX',
  'NASDAQ',
  'NYSE',
  'NYSEARCA',
  'OTC',
]);

const CONTINUOUS_SESSION_EXCHANGES = new Set([
  'BINANCE',
  'BITFINEX',
  'BITMEX',
  'BITSTAMP',
  'BYBIT',
  'COINBASE',
  'CRYPTO',
  'GEMINI',
  'KRAKEN',
  'KUCOIN',
  'OKX',
]);

function runtimeSessionExchange(syminfo: Partial<SymInfo>): string {
  const explicit = syminfo.exchange ?? syminfo.prefix;
  if (explicit && explicit.trim() !== '') return explicit.trim().toUpperCase();
  const tickerId = syminfo.tickerid ?? syminfo.ticker;
  const separator = tickerId?.indexOf(':') ?? -1;
  return separator > 0 ? tickerId!.slice(0, separator).trim().toUpperCase() : '';
}

function inferRuntimeSessionClassification(syminfo: Partial<SymInfo>): SessionClassificationInfo {
  const exchange = runtimeSessionExchange(syminfo);
  const type = syminfo.type?.trim().toLowerCase();

  if (US_EQUITY_SESSION_EXCHANGES.has(exchange) || (type === 'stock' && syminfo.country === 'US')) {
    return {
      premarket: '0400-0930:23456',
      regular: '0930-1600:23456',
      postmarket: '1600-2000:23456',
      timezone: syminfo.timezone || 'America/New_York',
    };
  }

  return {
    premarket: '',
    regular: CONTINUOUS_SESSION_EXCHANGES.has(exchange) || type === 'crypto' ? '24x7' : '0000-2359:1234567',
    postmarket: '',
    timezone: syminfo.timezone || 'Etc/UTC',
  };
}

function resolveRuntimeSessionOptions(
  runtimeOptions: TealscriptRuntimeOptions | undefined,
  ctx: Pick<ExecutionContext, 'syminfo'>,
): TealscriptRuntimeOptions {
  const inferred = inferRuntimeSessionClassification(ctx.syminfo);
  return {
    ...runtimeOptions,
    session: {
      ...inferred,
      ...runtimeOptions?.session,
    },
  };
}

function normalizeRuntimeTimeframePeriod(timeframe: string, currentPeriod: string): string {
  const normalized = timeframe.trim().toUpperCase();
  if (normalized !== '') return normalized;
  const normalizedCurrent = currentPeriod.trim().toUpperCase();
  return normalizedCurrent === '' ? '60' : normalizedCurrent;
}

function normalizeVersionedTimeframePeriod(period: string, pineVersion: number): string {
  return pineVersionRules(pineVersion).timeframePeriodIncludesMultiplier && /^[TSDWM]$/.test(period)
    ? `1${period}`
    : period;
}

function getRuntimeTimeframeDurationMs(timeframe: string, currentPeriod: string): number | null {
  const spec = parseRuntimeTimeframeSpec(timeframe, currentPeriod);
  if (!spec) return null;

  switch (spec.unit) {
    case 'tick':
      return null;
    case 'second':
      return spec.multiplier * 1_000;
    case 'minute':
      return spec.multiplier * 60_000;
    case 'day':
      return spec.multiplier * 86_400_000;
    case 'week':
      return spec.multiplier * 7 * 86_400_000;
    case 'month':
      return spec.multiplier * 2_628_003_000;
    default:
      return null;
  }
}

function isRuntimeLowerTimeframe(requestTimeframe: string, chartTimeframe: string): boolean {
  const requestSpec = parseRuntimeTimeframeSpec(requestTimeframe, chartTimeframe);
  const chartSpec = parseRuntimeTimeframeSpec(chartTimeframe, chartTimeframe);
  if (!requestSpec || !chartSpec) return false;
  if (requestSpec.unit === 'tick' && chartSpec.unit === 'tick') {
    return requestSpec.multiplier < chartSpec.multiplier;
  }
  if (requestSpec.unit === 'tick') return chartSpec.unit !== 'tick';
  if (chartSpec.unit === 'tick') return false;

  const requestDuration = getRuntimeTimeframeDurationMs(requestTimeframe, chartTimeframe);
  const chartDuration = getRuntimeTimeframeDurationMs(chartTimeframe, chartTimeframe);
  return requestDuration !== null && chartDuration !== null && requestDuration < chartDuration;
}

function isRuntimeSameTimeframe(requestTimeframe: string, chartTimeframe: string): boolean {
  const requestSpec = parseRuntimeTimeframeSpec(requestTimeframe, chartTimeframe);
  const chartSpec = parseRuntimeTimeframeSpec(chartTimeframe, chartTimeframe);
  if (!requestSpec || !chartSpec) return false;
  return requestSpec.unit === chartSpec.unit && requestSpec.multiplier === chartSpec.multiplier;
}

function runtimeTimeframeInfo(period: string, currentPeriod: string, pineVersion?: number): ExecutionContext['timeframe'] | null {
  const spec = parseRuntimeTimeframeSpec(period, currentPeriod);
  if (!spec) return null;
  return {
    period: pineVersion === undefined ? spec.period : normalizeVersionedTimeframePeriod(spec.period, pineVersion),
    multiplier: spec.multiplier,
    isminutes: spec.unit === 'minute',
    isdaily: spec.unit === 'day',
    isweekly: spec.unit === 'week',
    ismonthly: spec.unit === 'month',
    isintraday: spec.unit === 'minute' || spec.unit === 'second' || spec.unit === 'tick',
    isseconds: spec.unit === 'second',
    isticks: spec.unit === 'tick',
  };
}

function extractStaticDeclarationTimeframe(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const expr = value as {
    type?: string;
    value?: unknown;
    callee?: { type?: string; object?: { type?: string; name?: string }; property?: { name?: string } };
    arguments?: Array<{ name?: { name?: string } | null; value?: unknown }>;
  };
  if (expr.type === 'StringLiteral' && typeof expr.value === 'string') return expr.value;
  if (
    expr.type === 'CallExpression'
    && expr.callee?.type === 'MemberExpression'
    && expr.callee.object?.type === 'Identifier'
    && expr.callee.object.name === 'input'
    && expr.callee.property?.name === 'timeframe'
  ) {
    const defval = expr.arguments?.find((arg) => arg.name?.name === 'defval')?.value
      ?? expr.arguments?.filter((arg) => !arg.name)[0]?.value;
    return extractStaticDeclarationTimeframe(defval);
  }
  return null;
}

function staticCallArg(
  args: Array<{ name?: { name?: string } | null; value?: unknown }> | undefined,
  name: string,
  index: number,
): unknown {
  return args?.find((arg) => arg.name?.name === name)?.value
    ?? args?.filter((arg) => !arg.name)[index]?.value;
}

function staticStringValue(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const expr = value as { type?: string; value?: unknown };
  return expr.type === 'StringLiteral' && typeof expr.value === 'string' ? expr.value : undefined;
}

function staticNumberValue(value: unknown): number | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const expr = value as { type?: string; value?: unknown };
  return expr.type === 'NumericLiteral' && typeof expr.value === 'number' ? expr.value : undefined;
}

function declarationNumberValue(
  expression: Expression | undefined,
  declaration?: DeclarationInfo | null,
  resolving = new Set<string>(),
): number | undefined {
  if (!expression) return undefined;
  const literal = staticNumberValue(expression);
  if (literal !== undefined) return literal;
  if (expression.type === 'Identifier') {
    if (resolving.has(expression.name)) return undefined;
    const value = declaration?.constantExpressions?.get(expression.name);
    if (!value) return undefined;
    resolving.add(expression.name);
    const result = declarationNumberValue(value, declaration, resolving);
    resolving.delete(expression.name);
    return result;
  }
  if (expression.type === 'UnaryExpression') {
    const value = declarationNumberValue(expression.argument, declaration, resolving);
    if (value === undefined) return undefined;
    if (expression.operator === '+') return value;
    if (expression.operator === '-') return -value;
  }
  if (expression.type === 'BinaryExpression') {
    const left = declarationNumberValue(expression.left, declaration, resolving);
    const right = declarationNumberValue(expression.right, declaration, resolving);
    if (left === undefined || right === undefined) return undefined;
    switch (expression.operator) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': {
        const leftType = declaration?.constantExpressionTypes?.get(expression.left);
        const rightType = declaration?.constantExpressionTypes?.get(expression.right);
        return leftType?.kind === 'int' && leftType.qualifier === 'const'
          && rightType?.kind === 'int' && rightType.qualifier === 'const'
          ? divideV5ConstInts(left, right) : left / right;
      }
      case '%': return left % right;
    }
  }
  return undefined;
}

function staticBooleanValue(value: unknown): boolean | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const expr = value as { type?: string; value?: unknown };
  return expr.type === 'BooleanLiteral' && typeof expr.value === 'boolean' ? expr.value : undefined;
}

function collectSecurityBarsQuery(
  site: SecurityCallSite,
  inputs: Map<string, unknown> | undefined,
  runtime: TealscriptRuntimeOptions | undefined,
): RequestDatafeedQuery | null {
  if (!isPreloadableOhlcExpression(site.expressionExpr)) return null;

  if (site.kind === 'seed') {
    const source = site.sourceExpr ? staticRequestStringValue(site.sourceExpr, inputs, runtime) : undefined;
    const symbolValue = staticRequestStringValue(site.symbolExpr, inputs, runtime);
    if (!source || !symbolValue) return null;
    const timeframe = runtime?.timeframe?.period ?? '60';
    const calcBarsCount = normalizeRuntimePositiveInteger(staticRequestNumberValue(site.calcBarsCountExpr, inputs));
    return {
      symbol: seedRequestSymbol(source.trim(), symbolValue.trim()),
      timeframe,
      ...(calcBarsCount !== undefined ? { calcBarsCount } : {}),
    };
  }

  if (site.kind !== 'security' && site.kind !== 'security_lower_tf') return null;

  const symbol = staticRequestStringValue(site.symbolExpr, inputs, runtime)?.trim();
  const timeframe = staticRequestStringValue(site.timeframeExpr, inputs, runtime);
  if (!symbol || timeframe === undefined) return null;

  const currency = normalizeRuntimeRequestCurrency(staticRequestStringValue(site.currencyExpr, inputs, runtime));
  const calcBarsCount = normalizeRuntimePositiveInteger(staticRequestNumberValue(site.calcBarsCountExpr, inputs));
  return {
    symbol,
    timeframe: normalizeRuntimeTimeframePeriod(timeframe, runtime?.timeframe?.period ?? '60'),
    ...(currency ? { currency } : {}),
    ...(calcBarsCount !== undefined ? { calcBarsCount } : {}),
  };
}

function isPreloadableOhlcExpression(expression: Expression): boolean {
  if (expression.type === 'Identifier') {
    return expression.name === 'open' || expression.name === 'high' || expression.name === 'low' || expression.name === 'close';
  }
  if (expression.type === 'ArrayExpression') {
    return expression.elements.every((element) => element !== null && isPreloadableOhlcExpression(element));
  }
  return false;
}

function collectPointRequestQuery(
  call: CallExpression,
  inputs: Map<string, unknown> | undefined,
  runtime: TealscriptRuntimeOptions | undefined,
  fullName = requestCalleeName(call.callee),
): CompiledRequestDataQuery | null {
  if (fullName === 'request.currency_rate') {
    const fromCurrency = normalizeRuntimeRequestCurrency(staticRequestCallStringArg(call, ['from', 'to', 'ignore_invalid_currency'], 0, inputs, runtime));
    const toCurrency = normalizeRuntimeRequestCurrency(staticRequestCallStringArg(call, ['from', 'to', 'ignore_invalid_currency'], 1, inputs, runtime));
    if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) return null;
    return {
      kind: 'currency_rate',
      query: { baseCurrency: fromCurrency, quoteCurrency: toCurrency, time: 0 } satisfies RequestCurrencyRateQuery,
    };
  }

  if (fullName === 'request.economic') {
    const names = ['country_code', 'field', 'gaps', 'ignore_invalid_symbol'] as const;
    const countryCode = staticRequestCallStringArg(call, names, 0, inputs, runtime)?.trim().toUpperCase();
    const field = staticRequestCallStringArg(call, names, 1, inputs, runtime)?.trim();
    if (!countryCode || !field) return null;
    const gapsExpr = staticRequestCallArg(call, names, 2);
    if (gapsExpr && staticRequestMemberName(gapsExpr) === 'barmerge.gaps_on') {
      return {
        kind: 'series',
        query: { family: 'economic', key: economicRequestKey(countryCode, field) },
      };
    }
    return {
      kind: 'economic',
      query: { countryCode, field, time: 0 } satisfies RequestEconomicSeriesQuery,
    };
  }

  if (fullName === 'request.dividends' || fullName === 'request.earnings' || fullName === 'request.splits') {
    const names = ['ticker', 'field', 'gaps', 'lookahead', 'ignore_invalid_symbol', 'currency'];
    const family = fullName.slice('request.'.length) as 'dividends' | 'earnings' | 'splits';
    const ticker = staticRequestCallStringArg(call, names, 0, inputs, runtime)?.trim();
    if (!ticker) return null;
    const defaultField = family === 'dividends' ? 'dividends.gross' : family === 'earnings' ? 'earnings.actual' : 'splits.denominator';
    const field = staticRequestCallStringArg(call, names, 1, inputs, runtime)?.trim() || defaultField;
    const currency = family === 'splits'
      ? undefined
      : normalizeRuntimeRequestCurrency(staticRequestCallStringArg(call, names, 5, inputs, runtime));
    return {
      kind: 'corporate_action',
      query: { kind: family, ticker, currency, time: 0 },
    };
  }

  if (fullName === 'request.financial') {
    const names = ['symbol', 'financial_id', 'period', 'gaps', 'ignore_invalid_symbol', 'currency'];
    const symbol = staticRequestCallStringArg(call, names, 0, inputs, runtime)?.trim();
    const financialId = staticRequestCallStringArg(call, names, 1, inputs, runtime)?.trim();
    const period = staticRequestCallStringArg(call, names, 2, inputs, runtime)?.trim().toUpperCase();
    const currency = normalizeRuntimeRequestCurrency(staticRequestCallStringArg(call, names, 5, inputs, runtime));
    if (!symbol || !financialId || !period) return null;
    return {
      kind: 'financial',
      query: { symbol, financialId, period, currency, time: 0 } satisfies RequestFinancialMetricQuery,
    };
  }

  if (fullName === 'request.footprint') {
    const names = ['ticks_per_row', 'va_percent', 'imbalance_percent'];
    const ticksPerRow = Math.trunc(staticRequestCallNumberArg(call, names, 0, inputs) ?? Number.NaN);
    const valueAreaPercent = staticRequestCallArg(call, names, 1) ? staticRequestCallNumberArg(call, names, 1, inputs) : 70;
    const imbalancePercent = staticRequestCallArg(call, names, 2) ? staticRequestCallNumberArg(call, names, 2, inputs) : 300;
    const symbol = String(runtime?.syminfo?.tickerid ?? runtime?.syminfo?.ticker ?? '');
    const timeframe = String(runtime?.timeframe?.period ?? '60');
    if (!symbol || !Number.isFinite(ticksPerRow) || ticksPerRow <= 0 || valueAreaPercent === undefined || !Number.isFinite(valueAreaPercent) || imbalancePercent === undefined || !Number.isFinite(imbalancePercent)) {
      return null;
    }
    return {
      kind: 'footprint',
      query: { symbol, timeframe, ticksPerRow, valueAreaPercent, imbalancePercent, time: 0 } satisfies RequestFootprintQuery,
    };
  }

  return null;
}

function unpreloadablePointRequestReason(
  call: CallExpression,
  inputs: Map<string, unknown> | undefined,
  runtime: TealscriptRuntimeOptions | undefined,
  fullName = requestCalleeName(call.callee),
): string | null {
  if (fullName === 'request.currency_rate') {
    const names = ['from', 'to', 'ignore_invalid_currency'];
    const fromCurrency = normalizeRuntimeRequestCurrency(staticRequestCallStringArg(call, names, 0, inputs, runtime));
    const toCurrency = normalizeRuntimeRequestCurrency(staticRequestCallStringArg(call, names, 1, inputs, runtime));
    if (fromCurrency && toCurrency && fromCurrency === toCurrency) return null;
    return !fromCurrency || !toCurrency ? 'request.currency_rate:non-static-routing' : null;
  }

  if (fullName === 'request.economic') {
    const names = ['country_code', 'field', 'gaps', 'ignore_invalid_symbol'];
    const countryCode = staticRequestCallStringArg(call, names, 0, inputs, runtime);
    const field = staticRequestCallStringArg(call, names, 1, inputs, runtime);
    return !countryCode || !field ? 'request.economic:non-static-routing' : null;
  }

  if (fullName === 'request.dividends' || fullName === 'request.earnings' || fullName === 'request.splits') {
    const names = ['ticker', 'field', 'gaps', 'lookahead', 'ignore_invalid_symbol', 'currency'];
    const ticker = staticRequestCallStringArg(call, names, 0, inputs, runtime);
    const fieldArg = staticRequestCallArg(call, names, 1);
    const field = fieldArg ? staticRequestStringValue(fieldArg, inputs, runtime) : undefined;
    const currencyArg = fullName === 'request.splits' ? undefined : staticRequestCallArg(call, names, 5);
    const currency = currencyArg ? normalizeRuntimeRequestCurrency(staticRequestStringValue(currencyArg, inputs, runtime)) : undefined;
    const hasDynamicField = !!fieldArg && !field;
    const hasDynamicCurrency = !!currencyArg && !currency;
    return !ticker || hasDynamicField || hasDynamicCurrency ? `${fullName}:non-static-routing` : null;
  }

  if (fullName === 'request.financial') {
    const names = ['symbol', 'financial_id', 'period', 'gaps', 'ignore_invalid_symbol', 'currency'];
    const symbol = staticRequestCallStringArg(call, names, 0, inputs, runtime);
    const financialId = staticRequestCallStringArg(call, names, 1, inputs, runtime);
    const period = staticRequestCallStringArg(call, names, 2, inputs, runtime);
    const currencyArg = staticRequestCallArg(call, names, 5);
    const currency = currencyArg ? normalizeRuntimeRequestCurrency(staticRequestStringValue(currencyArg, inputs, runtime)) : undefined;
    return !symbol || !financialId || !period || (!!currencyArg && !currency)
      ? 'request.financial:non-static-routing'
      : null;
  }

  if (fullName === 'request.footprint') {
    const names = ['ticks_per_row', 'va_percent', 'imbalance_percent'];
    const ticksPerRowArg = staticRequestCallArg(call, names, 0);
    const valueAreaArg = staticRequestCallArg(call, names, 1);
    const imbalanceArg = staticRequestCallArg(call, names, 2);
    const ticksPerRow = ticksPerRowArg ? staticRequestNumberValue(ticksPerRowArg, inputs) : undefined;
    const valueAreaPercent = valueAreaArg ? staticRequestNumberValue(valueAreaArg, inputs) : 70;
    const imbalancePercent = imbalanceArg ? staticRequestNumberValue(imbalanceArg, inputs) : 300;
    const symbol = String(runtime?.syminfo?.tickerid ?? runtime?.syminfo?.ticker ?? '');
    const timeframe = String(runtime?.timeframe?.period ?? '60');
    return !symbol || !timeframe || ticksPerRow === undefined || valueAreaPercent === undefined || imbalancePercent === undefined
      ? 'request.footprint:non-static-routing'
      : null;
  }

  return null;
}

function collectCallExpressions(ast: Program): CallExpression[] {
  const calls: CallExpression[] = [];
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    if ((node as { type?: string }).type === 'CallExpression') {
      calls.push(node as CallExpression);
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const child of value) visit(child);
      } else if (value && typeof value === 'object') {
        visit(value);
      }
    }
  };
  visit(ast);
  return calls;
}

function requestCalleeName(callee: CallExpression['callee']): string {
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type !== 'MemberExpression') return '';
  if (callee.object.type === 'Identifier') return `${callee.object.name}.${callee.property.name}`;
  return `${requestCalleeName(callee.object)}.${callee.property.name}`;
}

function staticRequestCallStringArg(
  call: CallExpression,
  names: readonly string[],
  index: number,
  inputs: Map<string, unknown> | undefined,
  runtime: TealscriptRuntimeOptions | undefined,
): string | undefined {
  const expr = staticRequestCallArg(call, names, index);
  return expr ? staticRequestStringValue(expr, inputs, runtime) : undefined;
}

function staticRequestCallNumberArg(
  call: CallExpression,
  names: readonly string[],
  index: number,
  inputs: Map<string, unknown> | undefined,
): number | undefined {
  const expr = staticRequestCallArg(call, names, index);
  return expr ? staticRequestNumberValue(expr, inputs) : undefined;
}

function staticRequestCallArg(call: CallExpression, names: readonly string[], index: number): Expression | undefined {
  const name = names[index];
  const named = name ? call.arguments.find((arg) => arg.name?.name === name)?.value : undefined;
  if (named) return named;
  let positionalIndex = 0;
  for (const arg of call.arguments) {
    if (arg.name) continue;
    if (positionalIndex === index) return arg.value;
    positionalIndex += 1;
  }
  return undefined;
}

function staticRequestMemberName(expression: Expression): string | undefined {
  if (expression.type !== 'MemberExpression') return undefined;
  if (expression.object.type === 'Identifier') return `${expression.object.name}.${expression.property.name}`;
  const prefix = staticRequestMemberName(expression.object);
  return prefix ? `${prefix}.${expression.property.name}` : undefined;
}

function staticRequestStringValue(
  expression: Expression | null,
  inputs: Map<string, unknown> | undefined,
  runtime: TealscriptRuntimeOptions | undefined,
): string | undefined {
  if (!expression) return undefined;
  const literal = staticStringValue(expression);
  if (literal !== undefined) return literal;
  const memberName = staticRequestMemberName(expression);
  if (memberName?.startsWith('currency.')) return memberName.slice('currency.'.length);
  if (memberName?.startsWith('dividends.') || memberName?.startsWith('earnings.') || memberName?.startsWith('splits.')) {
    return memberName;
  }

  if (
    expression.type === 'MemberExpression'
    && expression.object.type === 'Identifier'
    && expression.object.name === 'syminfo'
    && expression.property.type === 'Identifier'
  ) {
    const key = expression.property.name;
    if (key === 'tickerid' || key === 'main_tickerid') {
      return String(runtime?.syminfo?.tickerid ?? runtime?.syminfo?.ticker ?? '');
    }
    if (key === 'ticker') {
      return String(runtime?.syminfo?.ticker ?? runtime?.syminfo?.tickerid ?? '');
    }
    if (key === 'currency') {
      return runtime?.syminfo?.currency === undefined ? undefined : String(runtime.syminfo.currency);
    }
  }

  const declarationTimeframe = resolveDeclarationTimeframe(expression, inputs, new Map());
  return declarationTimeframe ?? undefined;
}

function staticRequestNumberValue(expression: Expression | null, inputs: Map<string, unknown> | undefined): number | undefined {
  if (!expression) return undefined;
  const literal = staticNumberValue(expression);
  if (literal !== undefined) return literal;
  if (expression.type === 'UnaryExpression' && expression.operator === '-') {
    const inner = staticRequestNumberValue(expression.argument, inputs);
    return inner === undefined ? undefined : -inner;
  }
  if (
    expression.type === 'CallExpression'
    && expression.callee.type === 'MemberExpression'
    && expression.callee.object.type === 'Identifier'
    && expression.callee.object.name === 'input'
    && expression.callee.property.name === 'int'
  ) {
    const title = staticStringValue(staticCallArg(expression.arguments, 'title', 1)) ?? 'int';
    const inputId = `input_${title}`;
    const userValue = inputs?.get(inputId);
    return typeof userValue === 'number' ? userValue : staticNumberValue(staticCallArg(expression.arguments, 'defval', 0));
  }
  return undefined;
}

function staticEnumValue(value: unknown, namespace: string): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const expr = value as {
    type?: string;
    object?: { type?: string; name?: string };
    property?: { type?: string; name?: string };
  };
  return expr.type === 'MemberExpression'
    && expr.object?.type === 'Identifier'
    && expr.object.name === namespace
    && expr.property?.type === 'Identifier'
    && expr.property.name
    ? expr.property.name
    : undefined;
}

function staticArrayValues(value: unknown): unknown[] | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const expr = value as { type?: string; elements?: unknown[] };
  if (expr.type !== 'ArrayExpression' || !Array.isArray(expr.elements)) return undefined;
  const values = expr.elements.map(staticStringValue);
  return values.every((item) => item !== undefined) ? values : undefined;
}

function resolveDeclarationTimeframe(
  value: unknown,
  inputs: Map<string, unknown> | undefined,
  inputDefs: Map<string, InputDefinition>,
  inputSites: Array<{ node: unknown; id: string }> = [],
): string | null {
  if (!value || typeof value !== 'object') return null;
  const expr = value as {
    type?: string;
    value?: unknown;
    callee?: { type?: string; object?: { type?: string; name?: string }; property?: { name?: string } };
    arguments?: Array<{ name?: { name?: string } | null; value?: unknown }>;
  };
  if (expr.type === 'StringLiteral' && typeof expr.value === 'string') return expr.value;
  if (
    expr.type !== 'CallExpression'
    || expr.callee?.type !== 'MemberExpression'
    || expr.callee.object?.type !== 'Identifier'
    || expr.callee.object.name !== 'input'
    || expr.callee.property?.name !== 'timeframe'
  ) {
    return null;
  }

  const defaultValue = extractStaticDeclarationTimeframe(staticCallArg(expr.arguments, 'defval', 0));
  if (defaultValue === null) return null;
  const title = staticStringValue(staticCallArg(expr.arguments, 'title', 1)) ?? 'timeframe';
  const inputId = `input_${title}`;
  const siteId = inputSites.find((site) => site.node === value)?.id;
  if (!inputDefs.has(inputId)) {
    inputDefs.set(inputId, {
      id: inputId,
      type: 'timeframe',
      title,
      defval: defaultValue,
      options: staticArrayValues(staticCallArg(expr.arguments, 'options', 2)),
    });
  }

  const userValue = inputs?.get(inputId) ?? (siteId ? inputs?.get(siteId) : undefined);
  return userValue === undefined ? defaultValue : String(userValue);
}

function staticDeclarationString(value: unknown, namespace?: string): string | undefined {
  return staticStringValue(value) ?? (namespace ? staticEnumValue(value, namespace) : undefined);
}

function normalizeRuntimeRequestCurrency(value: unknown): string | undefined {
  if (value === undefined || isRuntimeNa(value)) return undefined;
  const currency = toRuntimeString(value).trim().toUpperCase();
  return currency === '' ? undefined : currency;
}

function normalizeRuntimePositiveInteger(value: unknown): number | undefined {
  if (value === undefined || isRuntimeNa(value)) return undefined;
  const count = Math.trunc(toRuntimeNumber(value));
  return Number.isFinite(count) && count > 0 ? count : undefined;
}

function isInvalidOrUnavailableRequestContext(code: string): boolean {
  return code === 'invalid_symbol' || code === 'missing_context' || code === 'unsupported_context';
}

function runtimeTimeframeFromSeconds(seconds: number): string {
  if (!Number.isFinite(seconds)) return '';
  if (seconds <= 1) return '1S';

  const roundedSeconds = Math.ceil(seconds);
  const secondsMultipliers = [1, 5, 10, 15, 30, 45];
  const secondsMatch = secondsMultipliers.find((multiplier) => roundedSeconds <= multiplier);
  if (secondsMatch !== undefined) return `${secondsMatch}S`;

  if (roundedSeconds < 86_400) {
    return String(Math.min(1440, Math.ceil(roundedSeconds / 60)));
  }

  if (roundedSeconds < 604_800) {
    return `${Math.min(365, Math.ceil(roundedSeconds / 86_400))}D`;
  }

  if (roundedSeconds < 2_592_000) {
    return roundedSeconds % 604_800 === 0
      ? `${roundedSeconds / 604_800}W`
      : `${Math.ceil(roundedSeconds / 86_400)}D`;
  }

  return `${Math.min(12, Math.ceil(roundedSeconds / 2_592_000))}M`;
}

function getRuntimeCalendarPart(part: string, timestamp: number, timezone: string): number {
  if (!Number.isFinite(timestamp)) return Number.NaN;

  const date = new Date(timestamp + getRuntimeTimezoneOffsetMinutes(timezone, timestamp) * 60_000);
  switch (part) {
    case 'year':
      return date.getUTCFullYear();
    case 'month':
      return date.getUTCMonth() + 1;
    case 'weekofyear':
      return getRuntimeIsoWeek(date);
    case 'dayofmonth':
      return date.getUTCDate();
    case 'dayofweek':
      return date.getUTCDay() + 1;
    case 'hour':
      return date.getUTCHours();
    case 'minute':
      return date.getUTCMinutes();
    case 'second':
      return date.getUTCSeconds();
    default:
      return Number.NaN;
  }
}

function getRuntimeTradingDayTime(timestamp: unknown, timezone: string): number {
  const value = toRuntimeNumber(timestamp);
  if (!Number.isFinite(value)) return Number.NaN;
  return resolveRuntimeLocalTimestamp(
    timezone,
    getRuntimeCalendarPart('year', value, timezone),
    getRuntimeCalendarPart('month', value, timezone),
    getRuntimeCalendarPart('dayofmonth', value, timezone),
    0,
    0,
    0,
  );
}

function evaluateRuntimeCalendarPart(
  part: string,
  args: unknown[],
  named: Record<string, unknown> | undefined,
  ctx: ExecutionContext,
): number {
  const names = ['time', 'timezone'] as const;
  const timestamp = toRuntimeNumber(orderedRuntimeArg(args, named, names, 0, ctx.time.get(0)));
  const timezoneArg = orderedRuntimeArg(args, named, names, 1, ctx.syminfo.timezone);
  const timezone = timezoneArg === undefined || timezoneArg === '' ? ctx.syminfo.timezone : toRuntimeString(timezoneArg);
  return getRuntimeCalendarPart(part, timestamp, timezone);
}

function getRuntimeTimeValue(ctx: ExecutionContext, bars: Bar[], name: string, offset = 0, maxBarsBack = 500): number {
  const normalizedOffset = Math.trunc(toRuntimeNumber(offset));
  if (!Number.isFinite(normalizedOffset) || normalizedOffset < 0) return Number.NaN;
  if (normalizedOffset > maxBarsBack) {
    throw new Error(`Historical offset ${normalizedOffset} exceeds max_bars_back ${maxBarsBack}`);
  }

  switch (name) {
    case 'time_close': {
      const openTime = ctx.time.get(normalizedOffset);
      if (openTime === undefined) return Number.NaN;
      return getRuntimeTimeframeCloseTime(toRuntimeNumber(openTime), ctx.timeframe.period, ctx.syminfo.timezone, ctx.timeframe.period);
    }
    case 'time_tradingday':
      return getRuntimeTradingDayTime(ctx.time.get(normalizedOffset), ctx.syminfo.timezone);
    case 'timenow':
      return toRuntimeNumber(ctx.timenow.get(normalizedOffset) ?? Number.NaN);
    case 'last_bar_time':
      return normalizedOffset > ctx.bar_index ? Number.NaN : toRuntimeNumber(bars[bars.length - 1]?.time ?? Number.NaN);
    default:
      return Number.NaN;
  }
}

function getRuntimeTimeframeOpenTime(timestamp: number, timeframe: string, timezone: string, currentPeriod: string): number {
  const spec = parseRuntimeTimeframeSpec(timeframe, currentPeriod);
  if (!spec || spec.unit === 'tick') return Number.NaN;
  if (spec.period === currentPeriod) return timestamp;

  if (spec.unit === 'month') {
    const year = getRuntimeCalendarPart('year', timestamp, timezone);
    const month = getRuntimeCalendarPart('month', timestamp, timezone);
    const monthIndex = year * 12 + (month - 1);
    const bucketMonthIndex = Math.floor(monthIndex / spec.multiplier) * spec.multiplier;
    return resolveRuntimeLocalTimestamp(
      timezone,
      Math.floor(bucketMonthIndex / 12),
      (bucketMonthIndex % 12) + 1,
      1,
      0,
      0,
      0,
    );
  }

  if (spec.unit === 'week') {
    const offsetMinutes = getRuntimeTimezoneOffsetMinutes(timezone, timestamp);
    const localDate = new Date(timestamp + offsetMinutes * 60_000);
    const localMidnight = Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate());
    const mondayOffset = (localDate.getUTCDay() + 6) % 7;
    const weekStartLocal = localMidnight - mondayOffset * 86_400_000;
    const anchorMonday = Date.UTC(1970, 0, 5);
    const bucketLocal = Math.floor((weekStartLocal - anchorMonday) / (spec.multiplier * 7 * 86_400_000))
      * spec.multiplier * 7 * 86_400_000 + anchorMonday;
    const bucketDate = new Date(bucketLocal);
    return resolveRuntimeLocalTimestamp(
      timezone,
      bucketDate.getUTCFullYear(),
      bucketDate.getUTCMonth() + 1,
      bucketDate.getUTCDate(),
      0,
      0,
      0,
    );
  }

  if (spec.unit === 'day') {
    const offsetMinutes = getRuntimeTimezoneOffsetMinutes(timezone, timestamp);
    const localDate = new Date(timestamp + offsetMinutes * 60_000);
    const localMidnight = Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate());
    const bucketLocal = Math.floor(localMidnight / (spec.multiplier * 86_400_000)) * spec.multiplier * 86_400_000;
    const bucketDate = new Date(bucketLocal);
    return resolveRuntimeLocalTimestamp(
      timezone,
      bucketDate.getUTCFullYear(),
      bucketDate.getUTCMonth() + 1,
      bucketDate.getUTCDate(),
      0,
      0,
      0,
    );
  }

  const duration = getRuntimeTimeframeDurationMs(timeframe, currentPeriod);
  if (duration === null) return Number.NaN;
  const offsetMs = getRuntimeTimezoneOffsetMinutes(timezone, timestamp) * 60_000;
  return Math.floor((timestamp + offsetMs) / duration) * duration - offsetMs;
}

function getRuntimeTimeframeCloseTime(openTime: number, timeframe: string, timezone: string, currentPeriod: string): number {
  if (!Number.isFinite(openTime)) return Number.NaN;
  const spec = parseRuntimeTimeframeSpec(timeframe, currentPeriod);
  if (!spec || spec.unit === 'tick') return Number.NaN;

  if (spec.unit === 'month') {
    return resolveRuntimeLocalTimestamp(
      timezone,
      getRuntimeCalendarPart('year', openTime, timezone),
      getRuntimeCalendarPart('month', openTime, timezone) + spec.multiplier,
      1,
      0,
      0,
      0,
    );
  }

  if (spec.unit === 'week' || spec.unit === 'day') {
    const days = spec.unit === 'week' ? spec.multiplier * 7 : spec.multiplier;
    return resolveRuntimeLocalTimestamp(
      timezone,
      getRuntimeCalendarPart('year', openTime, timezone),
      getRuntimeCalendarPart('month', openTime, timezone),
      getRuntimeCalendarPart('dayofmonth', openTime, timezone) + days,
      0,
      0,
      0,
    );
  }

  const duration = getRuntimeTimeframeDurationMs(timeframe, currentPeriod);
  return duration === null ? Number.NaN : openTime + duration;
}

function shiftRuntimeTimeframeOpenTime(
  openTime: number,
  timeframe: string,
  timezone: string,
  offset: number,
  currentPeriod: string,
): number {
  if (!Number.isFinite(openTime) || offset === 0) return openTime;
  const spec = parseRuntimeTimeframeSpec(timeframe, currentPeriod);
  if (!spec || spec.unit === 'tick') return Number.NaN;

  if (spec.unit === 'month') {
    return resolveRuntimeLocalTimestamp(
      timezone,
      getRuntimeCalendarPart('year', openTime, timezone),
      getRuntimeCalendarPart('month', openTime, timezone) + spec.multiplier * offset,
      1,
      0,
      0,
      0,
    );
  }

  if (spec.unit === 'week' || spec.unit === 'day') {
    const days = spec.unit === 'week' ? spec.multiplier * 7 : spec.multiplier;
    return resolveRuntimeLocalTimestamp(
      timezone,
      getRuntimeCalendarPart('year', openTime, timezone),
      getRuntimeCalendarPart('month', openTime, timezone),
      getRuntimeCalendarPart('dayofmonth', openTime, timezone) + days * offset,
      0,
      0,
      0,
    );
  }

  const duration = getRuntimeTimeframeDurationMs(timeframe, currentPeriod);
  return duration === null ? Number.NaN : openTime + duration * offset;
}

function nextRuntimePineDay(day: number): number {
  return day >= 7 ? 1 : day + 1;
}

function isTimestampInRuntimeSessionPeriod(timestamp: number, period: RuntimeSessionPeriod | null, days: string, timezone: string): boolean {
  if (period === null) return false;
  const { start, end } = period;

  const day = getRuntimeCalendarPart('dayofweek', timestamp, timezone);
  const minuteOfDay =
    getRuntimeCalendarPart('hour', timestamp, timezone) * 60
    + getRuntimeCalendarPart('minute', timestamp, timezone);

  if (start === end) {
    const sessionDay = start === 0 || minuteOfDay < start ? day : nextRuntimePineDay(day);
    return days.includes(String(sessionDay));
  }

  if (start < end) {
    return days.includes(String(day)) && minuteOfDay >= start && minuteOfDay < end;
  }

  if (minuteOfDay >= start) return days.includes(String(nextRuntimePineDay(day)));
  if (minuteOfDay < end) return days.includes(String(day));
  return false;
}

function isTimestampInRuntimeSession(timestamp: number, session: string, timezone: string): boolean {
  const descriptor = parseRuntimeSessionDescriptor(session);
  if (descriptor.unrestricted) return true;
  return descriptor.periods.some((period) => isTimestampInRuntimeSessionPeriod(timestamp, period, descriptor.days, timezone));
}

function normalizeRuntimeSessionDays(session: string, pineVersion: number): string {
  const normalized = session.trim().toLowerCase();
  if (
    normalized === ''
    || normalized === 'regular'
    || normalized === 'extended'
    || normalized === 'session.regular'
    || normalized === 'session.extended'
    || normalized === '24x7'
    || normalized.includes(':')
  ) {
    return session;
  }
  return `${session}:${pineVersion <= 4 ? '23456' : '1234567'}`;
}

function getRuntimeExchangeCalendarDate(timestamp: number, timezone: string): string {
  const year = getRuntimeCalendarPart('year', timestamp, timezone);
  const month = getRuntimeCalendarPart('month', timestamp, timezone);
  const day = getRuntimeCalendarPart('dayofmonth', timestamp, timezone);
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function isRuntimeSessionSegmentActive(
  runtimeOptions: TealscriptRuntimeOptions | undefined,
  timestamp: number,
  kind: Exclude<RuntimeSessionKind, 'extended'>,
  timezone: string,
): boolean {
  const session = runtimeOptions?.session?.[kind];
  if (session === undefined || session === '') return false;
  const sessionTimezone = runtimeOptions?.session?.timezone?.trim() || timezone;
  return isTimestampInRuntimeSession(timestamp, session, sessionTimezone);
}

function getRuntimeSessionKind(
  runtimeOptions: TealscriptRuntimeOptions | undefined,
  session: string,
  timestamp: number,
  timezone: string,
): RuntimeSessionKind | undefined {
  const normalized = session.trim().toLowerCase();
  if (normalized === 'regular' || normalized === 'session.regular') return 'regular';
  if (normalized === 'extended' || normalized === 'session.extended') return 'extended';

  for (const kind of ['premarket', 'regular', 'postmarket'] as const) {
    if (isRuntimeSessionSegmentActive(runtimeOptions, timestamp, kind, timezone) && isTimestampInRuntimeSession(timestamp, session, timezone)) {
      return kind;
    }
  }
  return undefined;
}

function isClosedRuntimeExtendedSessionSegment(
  runtimeOptions: TealscriptRuntimeOptions | undefined,
  timestamp: number,
  timezone: string,
  sessions: SessionClosureKind[],
): boolean {
  return (['premarket', 'regular', 'postmarket'] as const).some((kind) => (
    sessions.includes(kind) && isRuntimeSessionSegmentActive(runtimeOptions, timestamp, kind, timezone)
  ));
}

function isRuntimeExchangeSessionClosed(
  runtimeOptions: TealscriptRuntimeOptions | undefined,
  timestamp: number,
  timezone: string,
  kind?: RuntimeSessionKind,
): boolean {
  const session = runtimeOptions?.session;
  if (!session) return false;

  const localDate = getRuntimeExchangeCalendarDate(timestamp, timezone);
  if (session.closedDates?.some((date) => date.trim() === localDate)) return true;

  return session.closures?.some((closure) => {
    if (closure.date.trim() !== localDate) return false;
    const sessions = closure.sessions;
    if (!sessions || sessions.length === 0 || sessions.includes('all')) return true;
    if (!kind) return false;
    if (sessions.includes(kind)) return true;
    if (kind === 'extended') {
      return isClosedRuntimeExtendedSessionSegment(runtimeOptions, timestamp, timezone, sessions);
    }
    return sessions.includes('extended');
  }) ?? false;
}

function isTimestampInAnyRuntimeSession(runtimeOptions: TealscriptRuntimeOptions | undefined, timestamp: number, timezone: string): boolean {
  for (const kind of ['premarket', 'regular', 'postmarket'] as const) {
    const session = runtimeOptions?.session?.[kind];
    if (session && session !== '' && !isRuntimeExchangeSessionClosed(runtimeOptions, timestamp, timezone, kind)) {
      if (isTimestampInRuntimeSession(timestamp, session, timezone)) return true;
    }
  }
  return false;
}

function evaluateRuntimeSessionState(
  runtimeOptions: TealscriptRuntimeOptions | undefined,
  ctx: ExecutionContext,
  kind: Exclude<RuntimeSessionKind, 'extended'>,
  name: string,
): boolean {
  const resolvedOptions = resolveRuntimeSessionOptions(runtimeOptions, ctx);
  const session = resolvedOptions.session?.[kind];
  if (session === undefined || session === '') {
    if (kind === 'regular') {
      throw new CompiledRuntimeErrorException(`${name} requires exchange session classification, which is not available in this runtime`);
    }
    return false;
  }

  const timestamp = ctx.time.get(0);
  if (timestamp === undefined || !Number.isFinite(timestamp)) return false;
  const timezone = resolvedOptions.session?.timezone?.trim() || ctx.syminfo.timezone;
  if (isRuntimeExchangeSessionClosed(resolvedOptions, timestamp, timezone, kind)) return false;
  return isTimestampInRuntimeSession(timestamp, session, timezone);
}

function getRuntimeContinuousSessionCycle(timestamp: number, session: string, timezone: string): number | null {
  const normalized = session.trim().toLowerCase();
  const [period = ''] = normalized.split(':', 2);
  const match = /^(\d{4})-\1$/.exec(period);
  const start = normalized === '24x7' ? 0 : match ? parseRuntimeSessionMinute(match[1]) : null;
  if (start === null) return null;

  const minute =
    getRuntimeCalendarPart('hour', timestamp, timezone) * 60 + getRuntimeCalendarPart('minute', timestamp, timezone);
  return Date.UTC(
    getRuntimeCalendarPart('year', timestamp, timezone),
    getRuntimeCalendarPart('month', timestamp, timezone) - 1,
    getRuntimeCalendarPart('dayofmonth', timestamp, timezone) - Number(minute < start),
  );
}

function evaluateRuntimeSessionBarBoundary(
  runtimeOptions: TealscriptRuntimeOptions | undefined,
  ctx: ExecutionContext,
  bars: Bar[],
  scope: 'any' | 'regular',
  boundary: 'first' | 'last',
  name: string,
): boolean {
  const resolvedOptions = resolveRuntimeSessionOptions(runtimeOptions, ctx);
  const timezone = resolvedOptions.session?.timezone?.trim() || ctx.syminfo.timezone;

  if (scope === 'regular') {
    const regularSession = resolvedOptions.session?.regular;
    if (regularSession === undefined || regularSession === '') {
      throw new CompiledRuntimeErrorException(`${name} requires exchange session classification, which is not available in this runtime`);
    }
  } else {
    const hasAnySession = ['premarket', 'regular', 'postmarket'].some((kind) => (
      resolvedOptions.session?.[kind as 'premarket' | 'regular' | 'postmarket']
    ));
    if (!hasAnySession) {
      throw new CompiledRuntimeErrorException(`${name} requires exchange session classification, which is not available in this runtime`);
    }
  }

  const timestamp = ctx.time.get(0);
  if (timestamp === undefined || !Number.isFinite(timestamp)) return false;

  const isInSession = (candidateTime: number): boolean => {
    if (scope === 'regular') {
      const session = resolvedOptions.session!.regular!;
      if (isRuntimeExchangeSessionClosed(resolvedOptions, candidateTime, timezone, 'regular')) return false;
      return isTimestampInRuntimeSession(candidateTime, session, timezone);
    }
    return isTimestampInAnyRuntimeSession(resolvedOptions, candidateTime, timezone);
  };

  if (!isInSession(timestamp)) return false;

  const kinds = scope === 'regular' ? (['regular'] as const) : (['regular', 'premarket', 'postmarket'] as const);
  const timeframe = parseRuntimeTimeframeSpec(ctx.timeframe.period, ctx.timeframe.period);
  if (boundary === 'last' && (timeframe?.unit === 'minute' || timeframe?.unit === 'second')
    && !kinds.some((kind) => getRuntimeContinuousSessionCycle(timestamp, resolvedOptions.session?.[kind] ?? '', timezone) !== null)) {
    const closeTime = getRuntimeTimeframeCloseTime(timestamp, ctx.timeframe.period, timezone, ctx.timeframe.period);
    return Number.isFinite(closeTime) && !isInSession(closeTime);
  }

  const adjacentBar = boundary === 'first' ? bars[ctx.bar_index - 1] : bars[ctx.bar_index + 1];
  if (adjacentBar === undefined) return true;
  if (!isInSession(adjacentBar.time)) return true;

  for (const kind of kinds) {
    const session = resolvedOptions.session?.[kind];
    if (!session) continue;
    const cycle = getRuntimeContinuousSessionCycle(timestamp, session, timezone);
    if (cycle !== null) return cycle !== getRuntimeContinuousSessionCycle(adjacentBar.time, session, timezone);
  }
  return false;
}

function getRuntimeSessionValue(
  runtimeOptions: TealscriptRuntimeOptions | undefined,
  ctx: ExecutionContext,
  bars: Bar[],
  name: string,
): unknown {
  switch (name) {
    case 'regular':
      return 'regular';
    case 'extended':
      return 'extended';
    case 'ismarket':
      return evaluateRuntimeSessionState(runtimeOptions, ctx, 'regular', 'session.ismarket');
    case 'ispremarket':
      return ctx.timeframe.isintraday && evaluateRuntimeSessionState(runtimeOptions, ctx, 'premarket', 'session.ispremarket');
    case 'ispostmarket':
      return ctx.timeframe.isintraday && evaluateRuntimeSessionState(runtimeOptions, ctx, 'postmarket', 'session.ispostmarket');
    case 'isfirstbar':
      return evaluateRuntimeSessionBarBoundary(runtimeOptions, ctx, bars, 'any', 'first', 'session.isfirstbar');
    case 'isfirstbar_regular':
      return evaluateRuntimeSessionBarBoundary(runtimeOptions, ctx, bars, 'regular', 'first', 'session.isfirstbar_regular');
    case 'islastbar':
      return evaluateRuntimeSessionBarBoundary(runtimeOptions, ctx, bars, 'any', 'last', 'session.islastbar');
    case 'islastbar_regular':
      return evaluateRuntimeSessionBarBoundary(runtimeOptions, ctx, bars, 'regular', 'last', 'session.islastbar_regular');
    default:
      return Number.NaN;
  }
}

function parseRuntimeTickerModifierParts(tickerId: string, context: string): { base: string; modifiers: string[] } {
  const [base = '', ...modifiers] = tickerId.trim().split('|');
  const normalizedBase = base.trim();
  if (normalizedBase === '') throw new Error(`${context} requires a non-empty ticker id`);
  return { base: normalizedBase, modifiers: modifiers.filter((modifier) => modifier.trim() !== '') };
}

function parseRuntimeTickerModifierMap(modifiers: string[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const modifier of modifiers) {
    const separatorIndex = modifier.indexOf('=');
    if (separatorIndex <= 0) continue;
    const key = modifier.slice(0, separatorIndex).trim();
    const value = modifier.slice(separatorIndex + 1).trim();
    if (key !== '') result.set(key, value);
  }
  return result;
}

function upsertRuntimeTickerModifier(tickerId: string, key: string, value: string | undefined, context: string): string {
  const { base, modifiers } = parseRuntimeTickerModifierParts(tickerId, context);
  const prefix = `${key}=`;
  const kept = modifiers.filter((modifier) => !modifier.startsWith(prefix));
  if (value !== undefined) kept.push(`${key}=${value}`);
  return kept.length === 0 ? base : `${base}|${kept.join('|')}`;
}

function normalizeRuntimeTickerSession(value: unknown): 'regular' | 'extended' | undefined {
  if (value === undefined || isRuntimeNa(value)) return undefined;
  const session = toRuntimeString(value).trim().toLowerCase();
  if (session === '' || session === 'regular' || session === 'session.regular') return 'regular';
  if (session === 'extended' || session === 'session.extended') return 'extended';
  throw new Error(`Unsupported ticker session: ${session}`);
}

function normalizeRuntimeTickerModifier(value: unknown, name: string, allowedValues: readonly string[]): string | undefined {
  if (value === undefined || isRuntimeNa(value)) return undefined;
  const normalized = toRuntimeString(value).trim().toLowerCase();
  if (normalized === '') return undefined;
  const bareValue = normalized.startsWith(`${name}.`) ? normalized.slice(name.length + 1) : normalized;
  if (!allowedValues.includes(bareValue)) throw new Error(`Unsupported ticker ${name}: ${normalized}`);
  return bareValue;
}

function applyRuntimeTickerModifiers(
  tickerId: string,
  modifiers: {
    session?: 'regular' | 'extended';
    adjustment?: string;
    backadjustment?: string;
    settlementAsClose?: string;
  },
): string {
  let result = tickerId;
  result = upsertRuntimeTickerModifier(result, 'session', modifiers.session === 'extended' ? 'extended' : undefined, 'ticker.new/ticker.modify');
  result = upsertRuntimeTickerModifier(
    result,
    'adjustment',
    modifiers.adjustment === undefined || modifiers.adjustment === 'none' ? undefined : modifiers.adjustment,
    'ticker.new/ticker.modify',
  );
  result = upsertRuntimeTickerModifier(
    result,
    'backadjustment',
    modifiers.backadjustment === undefined || modifiers.backadjustment === 'inherit' ? undefined : modifiers.backadjustment,
    'ticker.new/ticker.modify',
  );
  result = upsertRuntimeTickerModifier(
    result,
    'settlement_as_close',
    modifiers.settlementAsClose === undefined || modifiers.settlementAsClose === 'inherit' ? undefined : modifiers.settlementAsClose,
    'ticker.new/ticker.modify',
  );
  return result;
}

function applyRuntimeTickerChart(tickerId: string, chart: string, params: unknown[] = []): string {
  const normalizedParams = params
    .filter((param) => param !== undefined && !isRuntimeNa(param))
    .map((param) => encodeURIComponent(toRuntimeString(param).trim()));
  const chartModifier = normalizedParams.length === 0 ? chart : `${chart}:${normalizedParams.join(':')}`;
  return upsertRuntimeTickerModifier(tickerId, 'chart', chartModifier, `ticker.${chart}`);
}

function runtimeTickerArg(
  args: unknown[],
  named: Record<string, unknown> | undefined,
  params: readonly (readonly string[])[],
  index: number,
  fallback?: unknown,
): unknown {
  return orderedRuntimeAliasedArg(args, namedRecordToMap(named), params, index, fallback);
}

function evaluateRuntimeTickerNew(args: unknown[], named?: Record<string, unknown>, session?: unknown): string {
  const tickerNewArgs = [['prefix'], ['ticker'], ['session'], ['adjustment'], ['backadjustment'], ['settlement_as_close']] as const;
  const prefix = toRuntimeString(runtimeTickerArg(args, named, tickerNewArgs, 0, ''));
  const ticker = toRuntimeString(runtimeTickerArg(args, named, tickerNewArgs, 1, ''));
  const base = prefix.trim() === '' ? ticker.trim() : `${prefix.trim()}:${ticker.trim()}`;
  return applyRuntimeTickerModifiers(base, {
    session: normalizeRuntimeTickerSession(runtimeTickerArg(args, named, tickerNewArgs, 2, session)),
    adjustment: normalizeRuntimeTickerModifier(runtimeTickerArg(args, named, tickerNewArgs, 3), 'adjustment', ['none', 'splits', 'dividends']),
    backadjustment: normalizeRuntimeTickerModifier(runtimeTickerArg(args, named, tickerNewArgs, 4), 'backadjustment', ['on', 'off', 'inherit']),
    settlementAsClose: normalizeRuntimeTickerModifier(runtimeTickerArg(args, named, tickerNewArgs, 5), 'settlement_as_close', ['on', 'off', 'inherit']),
  });
}

function evaluateRuntimeTickerModify(args: unknown[], named: Record<string, unknown> | undefined, contextSession: unknown): string {
  const tickerModifyArgs = [['tickerid'], ['session'], ['adjustment'], ['backadjustment'], ['settlement_as_close']] as const;
  const tickerId = toRuntimeString(runtimeTickerArg(args, named, tickerModifyArgs, 0, ''));
  const current = parseRuntimeTickerModifierMap(parseRuntimeTickerModifierParts(tickerId, 'ticker.modify').modifiers);
  const sessionArg = runtimeTickerArg(args, named, tickerModifyArgs, 1);
  const adjustmentArg = runtimeTickerArg(args, named, tickerModifyArgs, 2);
  const backadjustmentArg = runtimeTickerArg(args, named, tickerModifyArgs, 3);
  const settlementAsCloseArg = runtimeTickerArg(args, named, tickerModifyArgs, 4);
  const backadjustment = normalizeRuntimeTickerModifier(backadjustmentArg, 'backadjustment', ['on', 'off', 'inherit']);
  const settlementAsClose = normalizeRuntimeTickerModifier(settlementAsCloseArg, 'settlement_as_close', ['on', 'off', 'inherit']);
  return applyRuntimeTickerModifiers(tickerId, {
    session: sessionArg !== undefined ? normalizeRuntimeTickerSession(sessionArg) : normalizeRuntimeTickerSession(contextSession),
    adjustment: normalizeRuntimeTickerModifier(adjustmentArg, 'adjustment', ['none', 'splits', 'dividends']),
    backadjustment: backadjustmentArg === undefined || backadjustment === 'inherit'
      ? normalizeRuntimeTickerModifier(current.get('backadjustment'), 'backadjustment', ['on', 'off', 'inherit'])
      : backadjustment,
    settlementAsClose: settlementAsCloseArg === undefined || settlementAsClose === 'inherit'
      ? normalizeRuntimeTickerModifier(current.get('settlement_as_close'), 'settlement_as_close', ['on', 'off', 'inherit'])
      : settlementAsClose,
  });
}

function evaluateRuntimeTickerInherit(args: unknown[], named?: Record<string, unknown>): string {
  const tickerInheritArgs = [['from_tickerid'], ['symbol']] as const;
  const source = parseRuntimeTickerModifierParts(toRuntimeString(runtimeTickerArg(args, named, tickerInheritArgs, 0, '')), 'ticker.inherit');
  const target = parseRuntimeTickerModifierParts(toRuntimeString(runtimeTickerArg(args, named, tickerInheritArgs, 1, '')), 'ticker.inherit');
  return source.modifiers.length === 0 ? target.base : `${target.base}|${source.modifiers.join('|')}`;
}

function evaluateRuntimeTickerChart(name: string, args: unknown[], named?: Record<string, unknown>): string {
  const tickerSymbolArgs = [['symbol', 'tickerid']] as const;
  const tickerRenkoArgs = [['symbol', 'tickerid'], ['style'], ['param'], ['request_wicks'], ['source']] as const;
  const tickerLinebreakArgs = [['symbol', 'tickerid'], ['number_of_lines']] as const;
  const tickerKagiArgs = [['symbol', 'tickerid'], ['style'], ['param', 'reversal', 'reversal_amount']] as const;
  const tickerPointfigureArgs = [['symbol', 'tickerid'], ['source'], ['style'], ['param'], ['reversal']] as const;

  if (name === 'heikinashi') {
    return applyRuntimeTickerChart(toRuntimeString(runtimeTickerArg(args, named, tickerSymbolArgs, 0, '')), 'heikinashi');
  }
  if (name === 'renko') {
    return applyRuntimeTickerChart(toRuntimeString(runtimeTickerArg(args, named, tickerRenkoArgs, 0, '')), 'renko', [
      toRuntimeString(runtimeTickerArg(args, named, tickerRenkoArgs, 1, '')),
      runtimeTickerArg(args, named, tickerRenkoArgs, 2),
      runtimeTickerArg(args, named, tickerRenkoArgs, 3),
      runtimeTickerArg(args, named, tickerRenkoArgs, 4),
    ]);
  }
  if (name === 'linebreak') {
    return applyRuntimeTickerChart(toRuntimeString(runtimeTickerArg(args, named, tickerLinebreakArgs, 0, '')), 'linebreak', [
      runtimeTickerArg(args, named, tickerLinebreakArgs, 1),
    ]);
  }
  if (name === 'kagi') {
    return applyRuntimeTickerChart(toRuntimeString(runtimeTickerArg(args, named, tickerKagiArgs, 0, '')), 'kagi', [
      runtimeTickerArg(args, named, tickerKagiArgs, 1),
      runtimeTickerArg(args, named, tickerKagiArgs, 2),
    ]);
  }
  return applyRuntimeTickerChart(toRuntimeString(runtimeTickerArg(args, named, tickerPointfigureArgs, 0, '')), 'pointfigure', [
    toRuntimeString(runtimeTickerArg(args, named, tickerPointfigureArgs, 1, '')),
    toRuntimeString(runtimeTickerArg(args, named, tickerPointfigureArgs, 2, '')),
    runtimeTickerArg(args, named, tickerPointfigureArgs, 3),
    runtimeTickerArg(args, named, tickerPointfigureArgs, 4),
  ]);
}

function syminfoBaseFromRuntimeSymbol(symbol: unknown): string {
  return toRuntimeString(symbol).trim().split('|')[0]?.trim() ?? '';
}

function runtimeSyminfoPrefix(args: unknown[], named: Map<string, unknown>, ctx: ExecutionContext): string {
  const symbol = orderedRuntimeAliasedArg(args, named, [['symbol']], 0, ctx.syminfo.tickerid ?? ctx.syminfo.ticker);
  const base = syminfoBaseFromRuntimeSymbol(symbol);
  const separatorIndex = base.indexOf(':');
  return separatorIndex >= 0 ? base.slice(0, separatorIndex) : '';
}

function runtimeSyminfoTicker(args: unknown[], named: Map<string, unknown>, ctx: ExecutionContext): string {
  const symbol = orderedRuntimeAliasedArg(args, named, [['symbol']], 0, ctx.syminfo.tickerid ?? ctx.syminfo.ticker);
  const base = syminfoBaseFromRuntimeSymbol(symbol);
  const separatorIndex = base.indexOf(':');
  return separatorIndex >= 0 ? base.slice(separatorIndex + 1) : base;
}

function normalizeRuntimeTimeOffset(value: unknown, argument: string, functionName: string): number | null {
  const offset = toRuntimeNumber(value ?? 0);
  if (!Number.isInteger(offset)) return null;
  if (offset < -500 || offset > 5000) {
    throw new PineRuntimeArgumentError(
      `Invalid value of the '${argument}' argument (${offset}) in the '${functionName}' function. It must be in the range [-500..5000].`,
      'RE10002',
    );
  }
  return offset;
}

function projectFutureRuntimeChartBarTime(ctx: ExecutionContext, barsBack: number): number {
  if (barsBack >= 0) return Number.NaN;
  return shiftRuntimeTimeframeOpenTime(
    toRuntimeNumber(ctx.time.get(0) ?? Number.NaN),
    ctx.timeframe.period,
    ctx.syminfo.timezone,
    -barsBack,
    ctx.timeframe.period,
  );
}

function evaluateRuntimeTimeFilter(
  args: unknown[],
  named: Record<string, unknown> | undefined,
  ctx: ExecutionContext,
  bars: Bar[],
  runtimeOptions: TealscriptRuntimeOptions | undefined,
  closeTime: boolean,
  pineVersion: number,
): number {
  if (!closeTime && pineVersionRules(pineVersion).supportsLegacyTimeResolutionArgument && named && Object.prototype.hasOwnProperty.call(named, 'resolution')) {
    named = { ...named, timeframe: named.resolution };
  }
  const timezoneCandidate = orderedRuntimeArg(args, named, ['timeframe', 'session', 'timezone'], 2);
  const hasTimezoneArgument = !!(named && Object.prototype.hasOwnProperty.call(named, 'timezone'))
    || (timezoneCandidate !== undefined && typeof timezoneCandidate === 'string');
  const timeArgs = hasTimezoneArgument
    ? ['timeframe', 'session', 'timezone', 'bars_back', 'timeframe_bars_back']
    : ['timeframe', 'session', 'bars_back', 'timeframe_bars_back'];
  const timeframeArg = orderedRuntimeArg(args, named, timeArgs, 0, ctx.timeframe.period);
  const sessionArg = orderedRuntimeArg(args, named, timeArgs, 1);
  const timezoneArg = hasTimezoneArgument ? orderedRuntimeArg(args, named, timeArgs, 2, ctx.syminfo.timezone) : ctx.syminfo.timezone;
  const functionName = closeTime ? 'time_close' : 'time';
  const barsBack = normalizeRuntimeTimeOffset(orderedRuntimeArg(args, named, timeArgs, hasTimezoneArgument ? 3 : 2, 0), 'bars_back', functionName);
  const timeframeBarsBack = normalizeRuntimeTimeOffset(orderedRuntimeArg(args, named, timeArgs, hasTimezoneArgument ? 4 : 3, 0), 'timeframe_bars_back', functionName);
  if (barsBack === null || timeframeBarsBack === null) return Number.NaN;

  const targetBarIndex = ctx.bar_index - barsBack;
  const timestamp = barsBack === 0
    ? toRuntimeNumber(ctx.time.get(0) ?? Number.NaN)
    : toRuntimeNumber(bars[targetBarIndex]?.time ?? projectFutureRuntimeChartBarTime(ctx, barsBack));
  const timeframe = timeframeArg === undefined || timeframeArg === '' ? ctx.timeframe.period : toRuntimeString(timeframeArg);
  const session = sessionArg === undefined || sessionArg === '' ? undefined : normalizeRuntimeSessionDays(toRuntimeString(sessionArg), pineVersion);
  const timezone = timezoneArg === undefined || timezoneArg === '' ? ctx.syminfo.timezone : toRuntimeString(timezoneArg);

  if (!Number.isFinite(timestamp)) return Number.NaN;
  const resolvedSessionOptions = resolveRuntimeSessionOptions(runtimeOptions, ctx);
  if (session && isRuntimeExchangeSessionClosed(resolvedSessionOptions, timestamp, timezone, getRuntimeSessionKind(resolvedSessionOptions, session, timestamp, timezone))) {
    return Number.NaN;
  }
  if (session && !isTimestampInRuntimeSession(timestamp, session, timezone)) return Number.NaN;

  const openTime = shiftRuntimeTimeframeOpenTime(
    getRuntimeTimeframeOpenTime(timestamp, timeframe, timezone, ctx.timeframe.period),
    timeframe,
    timezone,
    -timeframeBarsBack,
    ctx.timeframe.period,
  );
  return closeTime ? getRuntimeTimeframeCloseTime(openTime, timeframe, timezone, ctx.timeframe.period) : openTime;
}

function formatRuntimeTime(args: unknown[], named: Record<string, unknown> | undefined, ctx: RuntimeTimeContext): string {
  const names = ['time', 'format', 'timezone'] as const;
  const timestamp = orderedRuntimeArg(args, named, names, 0, ctx.time.get(0));
  const formatArg = orderedRuntimeArg(args, named, names, 1);
  const timezoneArg = orderedRuntimeArg(args, named, names, 2);
  const format = formatArg === undefined || formatArg === '' ? "yyyy-MM-dd'T'HH:mm:ssZ" : toRuntimeString(formatArg);
  const timezone = timezoneArg === undefined || timezoneArg === '' ? ctx.syminfo.timezone : toRuntimeString(timezoneArg);
  return formatRuntimeTimestamp(timestamp, format, timezone);
}

function resolveRuntimeLocalTimestamp(timezone: string, year: number, month: number, day: number, hour: number, minute: number, second: number): number {
  const utcGuess = Date.UTC(Math.trunc(year), Math.trunc(month) - 1, Math.trunc(day), Math.trunc(hour), Math.trunc(minute), Math.trunc(second));
  const initialOffset = getRuntimeTimezoneOffsetMinutes(timezone, utcGuess);
  const resolvedTimestamp = utcGuess - initialOffset * 60000;
  const resolvedOffset = getRuntimeTimezoneOffsetMinutes(timezone, resolvedTimestamp);
  const finalTimestamp = utcGuess - resolvedOffset * 60000;
  const finalOffset = getRuntimeTimezoneOffsetMinutes(timezone, finalTimestamp);
  const localDate = new Date(finalTimestamp + finalOffset * 60000);
  const roundTrips =
    localDate.getUTCFullYear() === Math.trunc(year) &&
    localDate.getUTCMonth() === Math.trunc(month) - 1 &&
    localDate.getUTCDate() === Math.trunc(day) &&
    localDate.getUTCHours() === Math.trunc(hour) &&
    localDate.getUTCMinutes() === Math.trunc(minute) &&
    localDate.getUTCSeconds() === Math.trunc(second);

  if (!roundTrips && resolvedOffset !== initialOffset) {
    return finalTimestamp + (resolvedOffset - initialOffset) * 60000;
  }

  return finalTimestamp;
}

function evaluateRuntimeTimestamp(args: unknown[], named: Record<string, unknown> | undefined, ctx: RuntimeTimeContext): number {
  const timestampDateArgs = ['year', 'month', 'day', 'hour', 'minute', 'second'] as const;
  if (args.length === 0 && Object.keys(named ?? {}).length === 0) return Number.NaN;

  if (Object.keys(named ?? {}).length === 0 && args.length === 1 && typeof args[0] === 'string') {
    const parsed = Date.parse(args[0]);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  let timezone = ctx.syminfo.timezone;
  let positionalDateArgs = args;
  if (named && Object.prototype.hasOwnProperty.call(named, 'timezone')) {
    timezone = toRuntimeString(named.timezone);
  } else if (typeof args[0] === 'string') {
    timezone = toRuntimeString(args[0]);
    positionalDateArgs = args.slice(1);
  }

  const year = toRuntimeNumber(orderedRuntimeArg(positionalDateArgs, named, timestampDateArgs, 0));
  const month = toRuntimeNumber(orderedRuntimeArg(positionalDateArgs, named, timestampDateArgs, 1));
  const day = toRuntimeNumber(orderedRuntimeArg(positionalDateArgs, named, timestampDateArgs, 2));
  const hour = toRuntimeNumber(orderedRuntimeArg(positionalDateArgs, named, timestampDateArgs, 3, 0));
  const minute = toRuntimeNumber(orderedRuntimeArg(positionalDateArgs, named, timestampDateArgs, 4, 0));
  const second = toRuntimeNumber(orderedRuntimeArg(positionalDateArgs, named, timestampDateArgs, 5, 0));
  if ([year, month, day, hour, minute, second].some((value) => !Number.isFinite(value))) return Number.NaN;

  return resolveRuntimeLocalTimestamp(timezone, year, month, day, hour, minute, second);
}

function evaluateLiteralRuntimeTimestamp(
  cache: LiteralTimestampCache, id: string, timezone: string | undefined,
  args: unknown[], named: Record<string, unknown> | undefined, ctx: RuntimeTimeContext,
): number {
  const effectiveTimezone = timezone ?? ctx.syminfo.timezone;
  const cached = cache.get(id);
  if (cached?.timezone === effectiveTimezone) return cached.value;
  const value = evaluateRuntimeTimestamp(args, named, ctx);
  cache.set(id, { timezone: effectiveTimezone, value });
  return value;
}

function runtimeVariadicNumberArgs(args: unknown[], named: Record<string, unknown> | undefined, prefix: string): number[] {
  const values: number[] = [];
  const assigned: boolean[] = [];
  for (const [name, value] of Object.entries(named ?? {})) {
    if (!name.startsWith(prefix)) continue;
    const suffix = name.slice(prefix.length);
    if (!/^\d+$/.test(suffix)) continue;
    const index = Number(suffix);
    if (!Number.isSafeInteger(index)) continue;
    values[index] = toRuntimeNumber(value);
    assigned[index] = true;
  }
  for (const arg of args) {
    let index = 0;
    while (assigned[index]) index += 1;
    values[index] = toRuntimeNumber(arg);
    assigned[index] = true;
  }
  for (let index = 0; index < values.length; index += 1) {
    if (!assigned[index]) throw new Error(`Missing variadic argument: ${prefix}${index}`);
  }
  return values;
}

function runtimeDecimalPlacesForTick(tick: number): number {
  const text = tick.toString().toLowerCase();
  const [coefficient, exponent = '0'] = text.split('e');
  const fractionDigits = (coefficient.split('.')[1] ?? '').replace(/0+$/, '').length;
  return Math.min(100, Math.max(0, fractionDigits - Number(exponent)));
}


interface RuntimeRandomState {
  seed: number;
  state: bigint;
}

function nextRuntimeSeededRandom(states: Map<string, RuntimeRandomState>, key: string, seed: number): number {
  // Native seed42 captures match the 48-bit LCG and 26+27-bit double extraction.
  const multiplier = 0x5deece66dn;
  const mask = (1n << 48n) - 1n;
  const state = states.get(key);
  let current = state?.seed === seed ? state.state : (BigInt(seed) ^ multiplier) & mask;
  current = (current * multiplier + 11n) & mask;
  const high = Number(current >> 22n);
  current = (current * multiplier + 11n) & mask;
  const low = Number(current >> 21n);
  states.set(key, { seed, state: current });
  return (high * 134217728 + low) / 9007199254740992;
}

function toRuntimeExclusiveUnitRandom(value: number): number {
  if (value <= 0) return Number.EPSILON;
  if (value >= 1) return 1 - Number.EPSILON;
  return value;
}

type RuntimeMathEvaluator = (args: unknown[], named: Record<string, unknown> | undefined) => unknown;

interface CachedRuntimeMathEvaluator {
  name: string;
  evaluate: RuntimeMathEvaluator;
}

function createRuntimeMathEvaluator(
  name: string,
  sums: Map<string, RollingSumState>,
  randomStates: Map<string, RuntimeRandomState>,
  callId = name,
  mintick = 0.01,
): RuntimeMathEvaluator {
  const unary =
    (fn: (value: number) => number, names: readonly string[] = ['number']): RuntimeMathEvaluator =>
    (args, named) =>
      fn(toRuntimeNumber(orderedRuntimeAliasedArg(args, namedRecordToMap(named), [names], 0)));

  switch (name) {
    case 'math.abs':
      return unary(Math.abs);
    case 'math.sqrt':
      return unary(Math.sqrt);
    case 'math.log':
      return unary(nativeMathLog);
    case 'math.log10':
      return unary(nativeLog10);
    case 'math.exp':
      return unary(pineExp);
    case 'math.floor':
      return unary(Math.floor);
    case 'math.ceil':
      return unary(Math.ceil);
    case 'math.trunc':
      return unary(Math.trunc);
    case 'math.sign':
      return unary(Math.sign);
    case 'math.sin':
      return unary(Math.sin, ['number', 'angle']);
    case 'math.cos':
      return unary(Math.cos, ['number', 'angle']);
    case 'math.tan':
      return unary(Math.tan, ['number', 'angle']);
    case 'math.asin':
      return unary(Math.asin, ['number', 'angle']);
    case 'math.acos':
      return unary(Math.acos, ['number', 'angle']);
    case 'math.atan':
      return unary(Math.atan, ['number', 'angle']);
    case 'math.tanh':
      return unary(Math.tanh);
    case 'math.toradians':
      return unary((number) => (number * Math.PI) / 180, ['number', 'degrees']);
    case 'math.todegrees':
      return unary((number) => number * (180 / Math.PI), ['number', 'radians']);
    case 'math.max':
      return (args, named) => {
        const values = runtimeVariadicNumberArgs(args, named, 'number');
        return values.length > 0 ? Math.max(...values) : Number.NaN;
      };
    case 'math.min':
      return (args, named) => {
        const values = runtimeVariadicNumberArgs(args, named, 'number');
        return values.length > 0 ? Math.min(...values) : Number.NaN;
      };
    case 'math.avg':
      return (args, named) => {
        const values = runtimeVariadicNumberArgs(args, named, 'number');
        if (values.length === 0 || values.some((value) => Number.isNaN(value))) return Number.NaN;
        return values.reduce((sum, value) => sum + value, 0) / values.length;
      };
    case 'math.random':
      return (args, named) => {
        const names = ['min', 'max', 'seed'] as const;
        const min = toRuntimeNumber(orderedRuntimeArg(args, named, names, 0, 0));
        const max = toRuntimeNumber(orderedRuntimeArg(args, named, names, 1, 1));
        const seedArg = orderedRuntimeArg(args, named, names, 2);
        if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return Number.NaN;
        let value: number;
        if (seedArg === undefined) {
          value = Math.random();
        } else {
          const seed = Math.trunc(toRuntimeNumber(seedArg));
          if (!Number.isFinite(seed)) return Number.NaN;
          value = nextRuntimeSeededRandom(randomStates, `_math_random_${callId}`, seed);
        }
        return min + toRuntimeExclusiveUnitRandom(value) * (max - min);
      };
    case 'math.pow':
      return (args, named) => {
        const names = ['base', 'exponent'] as const;
        return Math.pow(
          toRuntimeNumber(orderedRuntimeArg(args, named, names, 0)),
          toRuntimeNumber(orderedRuntimeArg(args, named, names, 1)),
        );
      };
    case 'math.clamp':
      return (args, named) => {
        const names = ['val', 'min', 'max'] as const;
        const value = toRuntimeNumber(orderedRuntimeArg(args, named, names, 0));
        const min = toRuntimeNumber(orderedRuntimeArg(args, named, names, 1));
        const max = toRuntimeNumber(orderedRuntimeArg(args, named, names, 2));
        if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) return Number.NaN;
        return Math.max(min, Math.min(max, value));
      };
    case 'math.round':
      return (args, named) => {
        const names = ['number', 'precision'] as const;
        const value = toRuntimeNumber(orderedRuntimeArg(args, named, names, 0));
        const precisionArg = orderedRuntimeArg(args, named, names, 1);
        const precision = precisionArg === undefined ? 0 : Math.trunc(toRuntimeNumber(precisionArg));
        const factor = 10 ** precision;
        return (Math.sign(value) * Math.round(Math.abs(value) * factor)) / factor;
      };
    case 'math.round_to_mintick':
      return (args, named) => {
        const value = toRuntimeNumber(orderedRuntimeArg(args, named, ['number'], 0));
        if (!Number.isFinite(value) || !Number.isFinite(mintick) || mintick <= 0) return Number.NaN;
        const quotient = value / mintick;
        const epsilon = Number.EPSILON * Math.max(1, Math.abs(quotient));
        return Number((Math.round(quotient + epsilon) * mintick).toFixed(runtimeDecimalPlacesForTick(mintick)));
      };
    case 'math.sum':
      return (args, named) => {
        const names = ['source', 'length'] as const;
        const source = orderedRuntimeArg(args, named, names, 0);
        const length = toRuntimeNumber(orderedRuntimeArg(args, named, names, 1));
        const state = sums.get(callId) ?? createRollingSumState();
        sums.set(callId, state);
        return advanceRollingSum(state, toRuntimeNumber(source), length);
      };
    default:
      return () => Number.NaN;
  }
}

function evaluateRuntimeMath(
  name: string,
  args: unknown[],
  named: Record<string, unknown> | undefined,
  evaluators: Map<string, CachedRuntimeMathEvaluator>,
  sums: Map<string, RollingSumState>,
  randomStates: Map<string, RuntimeRandomState>,
  callId = name,
  mintick = 0.01,
): unknown {
  let evaluator = evaluators.get(callId);
  if (!evaluator || evaluator.name !== name) {
    evaluator = { name, evaluate: createRuntimeMathEvaluator(name, sums, randomStates, callId, mintick) };
    evaluators.set(callId, evaluator);



  }
  return evaluator.evaluate(args, named);
}

function toRuntimeNullableNumber(value: unknown): number | null {
  const numberValue = toRuntimeNumber(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function toRuntimeOptionalString(value: unknown): string | undefined {
  if (value === null || value === undefined || isRuntimeNa(value)) return undefined;
  return String(value);
}

function clampRuntimeChannel(value: unknown, min: number, max: number): number {
  const numberValue = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(numberValue)) return min;
  return Math.min(max, Math.max(min, Math.round(numberValue)));
}

function clampRuntimeChannelFloat(value: unknown, min: number, max: number): number {
  const numberValue = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(numberValue)) return min;
  return Math.min(max, Math.max(min, numberValue));
}

function transparencyToRuntimeAlpha(transparency: unknown): number {
  const normalizedTransparency = clampRuntimeChannelFloat(transparency ?? 0, 0, 100);
  return clampRuntimeChannel(((100 - normalizedTransparency) / 100) * 255, 0, 255);
}

function alphaToRuntimeTransparency(alpha: number): number {
  return clampRuntimeChannel(100 - (alpha / 255) * 100, 0, 100);
}

function formatRuntimeColor(red: unknown, green: unknown, blue: unknown, transparency: unknown = 0): string {
  return formatRuntimeColorAlpha(red, green, blue, transparencyToRuntimeAlpha(transparency));
}

const RUNTIME_COLOR_HEX_BYTES = Array.from({ length: 256 }, (_, channel) =>
  channel.toString(16).padStart(2, '0').toUpperCase(),
);

function formatRuntimeColorAlpha(red: unknown, green: unknown, blue: unknown, alpha: unknown): string {
  return `#${RUNTIME_COLOR_HEX_BYTES[clampRuntimeChannel(red, 0, 255)]}${RUNTIME_COLOR_HEX_BYTES[clampRuntimeChannel(green, 0, 255)]}${RUNTIME_COLOR_HEX_BYTES[clampRuntimeChannel(blue, 0, 255)]}${RUNTIME_COLOR_HEX_BYTES[clampRuntimeChannel(alpha, 0, 255)]}`;
}

function isRuntimeColorChannelOutOfRange(value: unknown, min: number, max: number): boolean {
  const numberValue = typeof value === 'number' ? value : Number(value ?? 0);
  return !Number.isFinite(numberValue) || numberValue < min || numberValue > max;
}

type RuntimeColorChannels = Readonly<{ red: number; green: number; blue: number; alpha: number }>;
const runtimeColorChannelsByString = new Map<string, RuntimeColorChannels>();
const MAX_RUNTIME_COLOR_PARSES = 512;

function parseRuntimeColor(value: unknown): RuntimeColorChannels | null {
  if (typeof value !== 'string') return null;

  const cached = runtimeColorChannelsByString.get(value);
  if (cached) return cached;

  const match = value.match(/^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/);
  if (!match) return null;

  const rgb = parseInt(match[1], 16);
  const channels = Object.freeze({
    red: (rgb >>> 16) & 255,
    green: (rgb >>> 8) & 255,
    blue: rgb & 255,
    alpha: match[2] ? parseInt(match[2], 16) : 255,
  });
  if (runtimeColorChannelsByString.size === MAX_RUNTIME_COLOR_PARSES) {
    runtimeColorChannelsByString.delete(runtimeColorChannelsByString.keys().next().value!);
  }
  runtimeColorChannelsByString.set(value, channels);
  return channels;
}

function parseRuntimeColorInput(value: unknown): { red: number; green: number; blue: number; alpha: number } | null {
  return parseRuntimeColor(toPlotColor(value) ?? value);
}

function runtimeColorTupleFromArgs(args: unknown[], named: Map<string, unknown>, names: string[]): [number, number, number, number] {
  const namedArgs = Object.fromEntries(named);
  if (args.length === 1 && named.size === 0) {
    const parsed = parseRuntimeColorInput(args[0]);
    if (!parsed) return [Number.NaN, Number.NaN, Number.NaN, Number.NaN];
    return [parsed.red, parsed.green, parsed.blue, alphaToRuntimeTransparency(parsed.alpha)];
  }
  const red = toRuntimeNumber(orderedRuntimeArg(args, namedArgs, names, 0));
  const green = toRuntimeNumber(orderedRuntimeArg(args, namedArgs, names, 1));
  const blue = toRuntimeNumber(orderedRuntimeArg(args, namedArgs, names, 2));
  const transparency = toRuntimeNumber(orderedRuntimeArg(args, namedArgs, names, 3, 0));
  return [red, green, blue, transparency];
}

function runtimeColorFromTuple(tuple: readonly unknown[]): string {
  return formatRuntimeColor(tuple[0], tuple[1], tuple[2], tuple[3] ?? 0);
}

function clampRuntimeUnit(value: number): number {
  if (!Number.isFinite(value)) return Number.NaN;
  return Math.min(1, Math.max(0, value));
}

function clampRuntimeHue(value: number): number {
  if (!Number.isFinite(value)) return Number.NaN;
  return ((value % 360) + 360) % 360;
}

function runtimeRgbToLinear(channel: number): number {
  const value = clampRuntimeUnit(channel / 255);
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function runtimeLinearToRgb(channel: number): number {
  const value = clampRuntimeUnit(channel);
  return clampRuntimeChannel((value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055) * 255, 0, 255);
}

function runtimeRgbToHsl(red: number, green: number, blue: number): [number, number, number] {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  if (max === min) return [0, 0, lightness * 100];
  const delta = max - min;
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  const hue = max === r
    ? 60 * (((g - b) / delta) % 6)
    : max === g
      ? 60 * ((b - r) / delta + 2)
      : 60 * ((r - g) / delta + 4);
  return [clampRuntimeHue(hue), saturation * 100, lightness * 100];
}

function runtimeHslToRgb(hue: number, saturation: number, lightness: number): [number, number, number] {
  const h = clampRuntimeHue(hue);
  const s = clampRuntimeUnit(saturation / 100);
  const l = clampRuntimeUnit(lightness / 100);
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0]
    : h < 120 ? [x, c, 0]
      : h < 180 ? [0, c, x]
        : h < 240 ? [0, x, c]
          : h < 300 ? [x, 0, c]
            : [c, 0, x];
  return [
    clampRuntimeChannel((r + m) * 255, 0, 255),
    clampRuntimeChannel((g + m) * 255, 0, 255),
    clampRuntimeChannel((b + m) * 255, 0, 255),
  ];
}

function runtimeRgbToHsv(red: number, green: number, blue: number): [number, number, number] {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const hue = delta === 0 ? 0 : max === r
    ? 60 * (((g - b) / delta) % 6)
    : max === g
      ? 60 * ((b - r) / delta + 2)
      : 60 * ((r - g) / delta + 4);
  return [clampRuntimeHue(hue), max === 0 ? 0 : (delta / max) * 100, max * 100];
}

function runtimeHsvToRgb(hue: number, saturation: number, value: number): [number, number, number] {
  const h = clampRuntimeHue(hue);
  const s = clampRuntimeUnit(saturation / 100);
  const v = clampRuntimeUnit(value / 100);
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0]
    : h < 120 ? [x, c, 0]
      : h < 180 ? [0, c, x]
        : h < 240 ? [0, x, c]
          : h < 300 ? [x, 0, c]
            : [c, 0, x];
  return [
    clampRuntimeChannel((r + m) * 255, 0, 255),
    clampRuntimeChannel((g + m) * 255, 0, 255),
    clampRuntimeChannel((b + m) * 255, 0, 255),
  ];
}

function runtimeRgbToXyz(red: number, green: number, blue: number): [number, number, number] {
  const r = runtimeRgbToLinear(red);
  const g = runtimeRgbToLinear(green);
  const b = runtimeRgbToLinear(blue);
  return [
    (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) * 100,
    (0.2126729 * r + 0.7151522 * g + 0.0721750 * b) * 100,
    (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) * 100,
  ];
}

function runtimeXyzToRgb(x: number, y: number, z: number): [number, number, number] {
  const nx = x / 100;
  const ny = y / 100;
  const nz = z / 100;
  return [
    runtimeLinearToRgb(3.2404542 * nx - 1.5371385 * ny - 0.4985314 * nz),
    runtimeLinearToRgb(-0.9692660 * nx + 1.8760108 * ny + 0.0415560 * nz),
    runtimeLinearToRgb(0.0556434 * nx - 0.2040259 * ny + 1.0572252 * nz),
  ];
}

function runtimeXyzToLab(x: number, y: number, z: number): [number, number, number] {
  const ref = [95.047, 100, 108.883];
  const f = (value: number) => {
    const t = value > 0 ? value : 0;
    return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  };
  const fx = f(x / ref[0]);
  const fy = f(y / ref[1]);
  const fz = f(z / ref[2]);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function runtimeLabToXyz(l: number, a: number, b: number): [number, number, number] {
  const fy = (l + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;
  const inv = (value: number) => {
    const cube = value ** 3;
    return cube > 0.008856 ? cube : (value - 16 / 116) / 7.787;
  };
  return [95.047 * inv(fx), 100 * inv(fy), 108.883 * inv(fz)];
}

function runtimeXyzToOklab(x: number, y: number, z: number): [number, number, number] {
  const nx = x / 100;
  const ny = y / 100;
  const nz = z / 100;
  const l = Math.cbrt(0.8189330101 * nx + 0.3618667424 * ny - 0.1288597137 * nz);
  const m = Math.cbrt(0.0329845436 * nx + 0.9293118715 * ny + 0.0361456387 * nz);
  const s = Math.cbrt(0.0482003018 * nx + 0.2643662691 * ny + 0.6338517070 * nz);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

function runtimeOklabToXyz(l: number, a: number, b: number): [number, number, number] {
  const ll = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const ss = (l - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    (1.2270138511 * ll - 0.5577999807 * mm + 0.2812561490 * ss) * 100,
    (-0.0405801784 * ll + 1.1122568696 * mm - 0.0716766787 * ss) * 100,
    (-0.0763812845 * ll - 0.4214819784 * mm + 1.5861632204 * ss) * 100,
  ];
}

function runtimeLabToLch(l: number, a: number, b: number): [number, number, number] {
  return [l, Math.hypot(a, b), clampRuntimeHue(Math.atan2(b, a) * 180 / Math.PI)];
}

function runtimeLchToLab(l: number, c: number, h: number): [number, number, number] {
  const radians = clampRuntimeHue(h) * Math.PI / 180;
  return [l, c * Math.cos(radians), c * Math.sin(radians)];
}

function runtimeColorTupleForSpace(color: unknown, space: string): [number, number, number, number] {
  const parsed = parseRuntimeColorInput(color);
  if (!parsed) return [Number.NaN, Number.NaN, Number.NaN, Number.NaN];
  const transparency = alphaToRuntimeTransparency(parsed.alpha);
  if (space === 'hsl') return [...runtimeRgbToHsl(parsed.red, parsed.green, parsed.blue), transparency];
  if (space === 'hsv') return [...runtimeRgbToHsv(parsed.red, parsed.green, parsed.blue), transparency];
  if (space === 'hwb') {
    const [h] = runtimeRgbToHsv(parsed.red, parsed.green, parsed.blue);
    return [h, Math.min(parsed.red, parsed.green, parsed.blue) / 255 * 100, (1 - Math.max(parsed.red, parsed.green, parsed.blue) / 255) * 100, transparency];
  }
  const xyz = runtimeRgbToXyz(parsed.red, parsed.green, parsed.blue);
  if (space === 'xyz') return [...xyz, transparency];
  if (space === 'xyy') {
    const sum = xyz[0] + xyz[1] + xyz[2];
    return [sum === 0 ? 0 : xyz[0] / sum, sum === 0 ? 0 : xyz[1] / sum, xyz[1], transparency];
  }
  const lab = runtimeXyzToLab(...xyz);
  if (space === 'lab') return [...lab, transparency];
  const oklab = runtimeXyzToOklab(...xyz);
  if (space === 'oklab') return [...oklab, transparency];
  if (space === 'lch') return [...runtimeLabToLch(...lab), transparency];
  if (space === 'oklch') return [...runtimeLabToLch(...oklab), transparency];
  return [parsed.red, parsed.green, parsed.blue, transparency];
}

function runtimeColorWithHue(source: unknown, rotation: number, colorSpace: unknown): string {
  const space = String(colorSpace ?? 'HSL').toLowerCase();
  const parsed = parseRuntimeColorInput(source);
  if (!parsed) return '#00000000';
  if (space.includes('oklch')) {
    const [l, c, h, t] = runtimeColorTupleForSpace(source, 'oklch');
    return runtimeColorFromTuple([...runtimeXyzToRgb(...runtimeOklabToXyz(...runtimeLchToLab(l, c, h + rotation))), t]);
  }
  if (space.includes('lch')) {
    const [l, c, h, t] = runtimeColorTupleForSpace(source, 'lch');
    return runtimeColorFromTuple([...runtimeXyzToRgb(...runtimeLabToXyz(...runtimeLchToLab(l, c, h + rotation))), t]);
  }
  const [h, s, l, t] = runtimeColorTupleForSpace(source, 'hsl');
  return runtimeColorFromTuple([...runtimeHslToRgb(h + rotation, s, l), t]);
}

function toRuntimeLineWidth(value: unknown, allowZero = false): number {
  return toLineWidthValue(value, (candidate, min, max) => {
    const numberValue = typeof candidate === 'number' ? candidate : Number(candidate ?? 0);
    if (!Number.isFinite(numberValue)) return min;
    return Math.min(max, Math.max(min, Math.round(numberValue)));
  }, allowZero);
}

function runtimeDrawingMethodNamespace(receiver: unknown, ctx: ExecutionContext): string | undefined {
  const drawingId = toDrawingIdValue(receiver, isRuntimeNa);
  if (!drawingId) return undefined;
  const existing = ctx.getDrawing(drawingId);
  if (existing) return existing.type;

  const separatorIndex = drawingId.indexOf('_');
  if (separatorIndex < 0) return undefined;
  const prefix = drawingId.slice(0, separatorIndex);
  return (
    prefix === 'line'
    || prefix === 'label'
    || prefix === 'box'
    || prefix === 'table'
    || prefix === 'polyline'
    || prefix === 'linefill'
  )
    ? prefix
    : undefined;
}

function runtimeMethodBuiltinName(methodName: string, receiver: unknown, ctx: ExecutionContext): string | undefined {
  const drawingNamespace = runtimeDrawingMethodNamespace(receiver, ctx);
  if (drawingNamespace) return `${drawingNamespace}.${methodName}`;
  if (isRequestFootprintData(receiver)) return `footprint.${methodName}`;
  if (isRequestVolumeRowData(receiver)) return `volume_row.${methodName}`;
  if (isPineMatrix(receiver)) return `matrix.${methodName}`;
  if (isPineMap(receiver)) return `map.${methodName}`;
  if (isPineArray(receiver) || Array.isArray(receiver)) return `array.${methodName}`;
  return undefined;
}

function interpolateLinePrice(line: LineDrawingOutput, x: number, barIndex: number): number {
  if (line.xloc !== 'bar_index') throwCompiledRuntimeError(`Error on bar ${barIndex}: 'line.get_price' must be used with lines created using 'xloc=xloc.bar_index'.`);
  if (
    line.x1 === null
    || line.x2 === null
    || line.y1 === null
    || line.y2 === null
    || !Number.isFinite(x)
  ) {
    return Number.NaN;
  }
  if (line.x1 === line.x2) return x === line.x1 ? line.y1 : Number.NaN;
  return line.y1 + ((line.y2 - line.y1) / (line.x2 - line.x1)) * (x - line.x1);
}

function createCompiledDrawingRuntime(): DrawingBuiltinRuntime {
  return {
    raiseRuntimeError: throwCompiledRuntimeError,
    isNa: isRuntimeNa,
    toNullableNumber: toRuntimeNullableNumber,
    toStringValue: toRuntimeString,
    toNumber: toRuntimeNumber,
    toNullableColor: (value) => toPlotColor(value),
    toOptionalString: toRuntimeOptionalString,
    toLineWidth: toRuntimeLineWidth,
    toDrawingId: (value) => toDrawingIdValue(value, isRuntimeNa),
    withLine: (value, ctx, fn) => withDrawing(value, ctx, 'line', isRuntimeNa, fn),
    getLineValue: (value, ctx, fn) => getDrawingValue(value, ctx, 'line', isRuntimeNa, fn),
    interpolateLinePrice,
  };
}

function markPersistentRuntimeValue(ctx: ExecutionContext, value: unknown): void {
  markPersistentContainedValue(ctx, value);
}

function markPersistentContainedValue(ctx: ExecutionContext, value: unknown, seen?: Set<unknown>): void {
  if (!value || typeof value !== 'object' || value instanceof PineTableReference) return;
  (value as { persistent?: boolean }).persistent = true;
  if (isPineArray(value)) {
    seen ??= new Set<unknown>();
    if (seen.has(value)) return;
    seen.add(value);
    for (let index = 0; index < getArraySize(value); index++) {
      const element = getArrayValue(value, index);
      if (element && typeof element === 'object') {
        if (element instanceof PineTableReference) markPersistentDrawingHandle(ctx, element);
        else markPersistentContainedValue(ctx, element, seen);
      } else if (typeof element === 'string') {
        markPersistentDrawingHandle(ctx, element);
      }
    }
    return;
  }
  if (isPineUdtObject(value)) {
    let registered = false;
    for (const fieldValue of value.fields.values()) {
      if (fieldValue && typeof fieldValue === 'object') {
        if (fieldValue instanceof PineTableReference) {
          markPersistentDrawingHandle(ctx, fieldValue);
        } else {
          if (!registered) {
            seen ??= new Set<unknown>();
            if (seen.has(value)) return;
            seen.add(value);
            registered = true;
          }
          markPersistentContainedValue(ctx, fieldValue, seen);
        }
      } else if (typeof fieldValue === 'string') {
        markPersistentDrawingHandle(ctx, fieldValue);
      }
    }
  }
}

function markPersistentArrayDrawing(ctx: ExecutionContext, array: PineArray, value: unknown): void {
  if (!array.persistent) return;
  markPersistentContainedValue(ctx, value);
  markPersistentDrawingHandle(ctx, value);
}

function markPersistentUdtField(ctx: ExecutionContext, object: unknown, fieldName: string): void {
  if (!isPineUdtObject(object) || !object.persistent) return;
  const value = object.fields.get(fieldName);
  markPersistentContainedValue(ctx, value);
  markPersistentDrawingHandle(ctx, value);
}

function markPersistentDrawingHandle(ctx: ExecutionContext, value: unknown): void {
  // Tables use immutable handles; other drawing IDs remain strings.
  if (typeof value !== 'string' && (typeof value !== 'object' || !(value instanceof PineTableReference))) return;
  const drawingId = toDrawingIdValue(value, isRuntimeNa);
  if (drawingId) {
    ctx.markDrawingPersistent(drawingId);
  }
}

function arrayPushPersistent(ctx: ExecutionContext, array: PineArray, value: unknown): number {
  const result = ARRAY_HELPERS.push(array, value);
  markPersistentArrayDrawing(ctx, array, value);
  return result;
}

function arraySetPersistent(ctx: ExecutionContext, array: PineArray, index: number, value: unknown): void {
  ARRAY_HELPERS.set(array, index, value);
  markPersistentArrayDrawing(ctx, array, value);
}

function arrayUnshiftPersistent(ctx: ExecutionContext, array: PineArray, value: unknown): number {
  const result = ARRAY_HELPERS.unshift(array, value);
  markPersistentArrayDrawing(ctx, array, value);
  return result;
}

function arrayInsertPersistent(ctx: ExecutionContext, array: PineArray, index: number, value: unknown): number {
  const result = ARRAY_HELPERS.insert(array, index, value);
  markPersistentArrayDrawing(ctx, array, value);
  return result;
}

function arrayConcatPersistent(ctx: ExecutionContext, array: PineArray, other: PineArray): PineArray {
  const result = ARRAY_HELPERS.concat(array, other);
  for (let index = 0; index < getArraySize(other); index++) {
    markPersistentArrayDrawing(ctx, array, getArrayValue(other, index));
  }
  return result;
}

class DuplicateCheckingBuiltinRegistry extends Map<string, BuiltinFunction> {
  override set(name: string, builtin: BuiltinFunction): this {
    if (this.has(name)) {
      throw new Error(`Duplicate compiled builtin registration: ${name}`);
    }
    return super.set(name, builtin);
  }
}

function createCompiledBuiltinRegistry(pineVersion = 6): BuiltinRegistry {
  const builtins: BuiltinRegistry = new DuplicateCheckingBuiltinRegistry();
  const runtime = createCompiledDrawingRuntime();
  registerDrawingObjectCastBuiltins(builtins);
  registerCompiledStringBuiltins(builtins);
  registerLabelBuiltins(builtins, runtime, pineVersion);
  registerLineBuiltins(builtins, runtime);
  registerLineFillBuiltins(builtins, runtime);
  registerBoxBuiltins(builtins, runtime, pineVersion);
  registerPolylineBuiltins(builtins, runtime, pineVersion);
  registerTableBuiltins(builtins, runtime, pineVersion);
  registerDrawingConstants(builtins);
  registerCompiledTimeframeBuiltins(builtins, pineVersion);
  registerCompiledFootprintBuiltins(builtins);
  registerOfficialTradingViewBuiltins(builtins);
  registerCompiledLegacyBuiltins(builtins);
  builtins.set('syminfo.prefix', (args, named, ctx) => runtimeSyminfoPrefix(args, named, ctx));
  builtins.set('syminfo.ticker', (args, named, ctx) => runtimeSyminfoTicker(args, named, ctx));
  return builtins;
}

export function compiledBuiltinRegistryNamesForCoverage(): string[] {
  return [...createCompiledBuiltinRegistry().keys()].sort((a, b) => a.localeCompare(b));
}

export function assertCompiledBuiltinRegistryDuplicateRejectedForCoverage(name: string): void {
  const builtins = createCompiledBuiltinRegistry();
  builtins.set(name, () => Number.NaN);
}

function registerOfficialTradingViewBuiltins(builtins: BuiltinRegistry): void {
  registerTradingViewColorBuiltins(builtins);
  registerTradingViewValueAtTimeBuiltins(builtins);
  builtins.set('TradingView.ta.changePercent', (args, named) => {
    const namedArgs = Object.fromEntries(named);
    const newValue = toRuntimeNumber(orderedRuntimeArg(args, namedArgs, ['newValue', 'oldValue'], 0));
    const oldValue = toRuntimeNumber(orderedRuntimeArg(args, namedArgs, ['newValue', 'oldValue'], 1));
    if (!Number.isFinite(newValue) || !Number.isFinite(oldValue) || oldValue === 0) return Number.NaN;
    return ((newValue - oldValue) / oldValue) * 100;
  });
  builtins.set('TradingView.ta.kama', (args, named, _ctx, scope, callId) => {
    const namedArgs = Object.fromEntries(named);
    const source = toRuntimeNumber(orderedRuntimeArg(args, namedArgs, ['source', 'erLen', 'fastLen', 'slowLen'], 0));
    const erLen = Math.max(1, Math.trunc(toRuntimeNumber(orderedRuntimeArg(args, namedArgs, ['source', 'erLen', 'fastLen', 'slowLen'], 1))));
    const fastLen = Math.max(1, Math.trunc(toRuntimeNumber(orderedRuntimeArg(args, namedArgs, ['source', 'erLen', 'fastLen', 'slowLen'], 2))));
    const slowLen = Math.max(1, Math.trunc(toRuntimeNumber(orderedRuntimeArg(args, namedArgs, ['source', 'erLen', 'fastLen', 'slowLen'], 3))));
    const historyKey = `__tv_ta_kama_source_${callId}`;
    const valueKey = `__tv_ta_kama_value_${callId}`;
    const historyRaw = scope.get(historyKey);
    const history = Array.isArray(historyRaw) ? historyRaw as number[] : [];
    history.unshift(source);
    history.length = Math.min(history.length, erLen + 1);
    const previous = toRuntimeNumber(scope.get(valueKey));
    let efficiency = 0;
    if (history.length > erLen) {
      let volatility = 0;
      for (let index = 0; index < erLen; index++) {
        volatility += Math.abs(history[index] - history[index + 1]);
      }
      efficiency = volatility === 0 ? 0 : Math.abs(source - history[erLen]) / volatility;
    }
    const fastAlpha = 2 / (fastLen + 1);
    const slowAlpha = 2 / (slowLen + 1);
    const smoothing = Math.pow(efficiency * (fastAlpha - slowAlpha) + slowAlpha, 2);
    const value = Number.isNaN(previous) ? source : previous + smoothing * (source - previous);
    if (historyRaw === undefined) scope.declare(historyKey, 'var', history, 'array');
    else scope.set(historyKey, history);
    if (scope.get(valueKey) === undefined) scope.declare(valueKey, 'var', value, 'float');
    else scope.set(valueKey, value);
    return value;
  });
}

const orderedValueAtTimeData = new WeakMap<PineUdtObject, boolean>();
const borrowedValueAtTimeData = new WeakSet<PineUdtObject>();
const privateValueAtTimeData = new WeakMap<Scope, Map<string, PineUdtObject>>();

function preserveValueAtTimeBuffers(data: PineUdtObject): void {
  if (!borrowedValueAtTimeData.delete(data)) return;
  const times = tradingViewValueAtTimeArray<number>(data.fields.get('times'));
  const values = tradingViewValueAtTimeArray<number>(data.fields.get('values'));
  times.values = times.values.slice();
  values.values = values.values.slice();
}
interface ValueAtTimePeriodConversion {
  period: string;
  unit: string;
  amount: number;
  calendarDays: Map<number, number>;
}
type ValueAtTimePeriodCache = Map<string, ValueAtTimePeriodConversion>;
const valueAtTimeHistoryPeriodCaches = new WeakMap<HistoryBufferSizing, ValueAtTimePeriodCache>();
const valueAtTimeContextPeriodCaches = new WeakMap<ExecutionContext, ValueAtTimePeriodCache>();

function valueAtTimePeriodCache(history: HistoryBufferSizing): ValueAtTimePeriodCache {
  let cache = valueAtTimeHistoryPeriodCaches.get(history);
  if (!cache) {
    cache = new Map();
    valueAtTimeHistoryPeriodCaches.set(history, cache);
  }
  return cache;
}

function createTradingViewValueAtTimeData(): PineUdtObject {
  return createPineUdtObject('TradingView.ValueAtTime.Data', [
    ['times', createPineArray<number>()],
    ['values', createPineArray<number>()],
  ]);
}

function tradingViewValueAtTimeArray<T = unknown>(value: unknown): PineArray<T> {
  return isPineArray(value) ? (value as PineArray<T>) : createPineArray<T>();
}

function tradingViewValueAtTimeData(value: unknown): PineUdtObject {
  if (!isPineUdtObject(value)) return createTradingViewValueAtTimeData();
  if (!isPineArray(value.fields.get('times'))) value.fields.set('times', createPineArray<number>());
  if (!isPineArray(value.fields.get('values'))) value.fields.set('values', createPineArray<number>());
  return value;
}

function tradingViewValueAtTimeLimitMs(
  timeOffsetLimit: unknown,
  timeframeLimit: unknown,
  ctx: ExecutionContext,
): number | null {
  const offset = toRuntimeNumber(timeOffsetLimit);
  const timeframe = toRuntimeString(timeframeLimit ?? '').trim();
  const timeframeMs = timeframe === '' ? null : getRuntimeTimeframeDurationMs(timeframe, ctx.timeframe.period);
  if (Number.isFinite(offset)) return timeframeMs === null ? offset : Math.max(offset, timeframeMs);
  return timeframeMs;
}

function collectTradingViewValueAtTimeData(
  args: unknown[],
  named: Map<string, unknown>,
  ctx: ExecutionContext,
  scope: Scope,
  callId: string,
  trackNearestOrder = true,
): PineUdtObject {
  const namedArgs = Object.fromEntries(named);
  const source = toRuntimeNumber(
    orderedRuntimeArg(args, namedArgs, ['source', 'timeOffsetLimit', 'timeframeLimit'], 0),
  );
  const timeOffsetLimit = orderedRuntimeArg(args, namedArgs, ['source', 'timeOffsetLimit', 'timeframeLimit'], 1);
  const timeframeLimit = orderedRuntimeArg(args, namedArgs, ['source', 'timeOffsetLimit', 'timeframeLimit'], 2, '');
  return collectBoundValueAtTimeData(source, timeOffsetLimit, timeframeLimit, ctx, scope, callId, trackNearestOrder);
}

function collectBoundValueAtTimeData(
  source: number,
  timeOffsetLimit: unknown,
  timeframeLimit: unknown,
  ctx: ExecutionContext,
  scope: Scope,
  callId: string,
  trackNearestOrder = true,
): PineUdtObject {
  const key = trackNearestOrder ? callId : `__tv_valueAtTime_data_${callId}`;
  let collections = privateValueAtTimeData.get(scope);
  if (trackNearestOrder && !collections) {
    collections = new Map();
    privateValueAtTimeData.set(scope, collections);
  }
  const existing = trackNearestOrder ? collections!.get(key) : scope.get(key);
  const data =
    trackNearestOrder && existing !== undefined ? (existing as PineUdtObject) : tradingViewValueAtTimeData(existing);
  const times = data.fields.get('times') as PineArray<number>;
  const values = data.fields.get('values') as PineArray<number>;
  const currentTime = toRuntimeNumber(ctx.time.get(0));
  const lastIndex = (trackNearestOrder ? times.values.length : getArraySize(times)) - 1;

  if (trackNearestOrder) {
    const ordered =
      lastIndex < 0 || (orderedValueAtTimeData.get(data) === true && times.values[lastIndex] <= currentTime);
    orderedValueAtTimeData.set(data, ordered && Number.isFinite(currentTime));
  } else {
    orderedValueAtTimeData.delete(data);
  }

  if (
    lastIndex >= 0 &&
    (trackNearestOrder ? times.values[lastIndex] : getArrayValue(times, lastIndex)) === currentTime
  ) {
    preserveValueAtTimeBuffers(data);
    values.values[lastIndex] = source;
  } else {
    pushArrayValue(times, currentTime);
    pushArrayValue(values, source);
  }

  const limit = tradingViewValueAtTimeLimitMs(timeOffsetLimit, timeframeLimit, ctx);
  if (limit !== null && Number.isFinite(currentTime)) {
    const minTime = currentTime - limit;
    if (
      trackNearestOrder
        ? times.values.length > 1 && times.values[0] < minTime
        : getArraySize(times) > 1 && toRuntimeNumber(getArrayValue(times, 0)) < minTime
    )
      preserveValueAtTimeBuffers(data);
    while (
      trackNearestOrder
        ? times.values.length > 1 && times.values[0] < minTime
        : getArraySize(times) > 1 && toRuntimeNumber(getArrayValue(times, 0)) < minTime
    ) {
      removeArrayValue(times, 0);
      removeArrayValue(values, 0);
    }
  }

  if (trackNearestOrder) {
    if (existing === undefined) collections!.set(key, data);
  } else if (existing === undefined) scope.declare(key, 'var', data, 'TradingView.ValueAtTime.Data');
  else scope.set(key, data);
  return data;
}

function tradingViewValueAtTimeNearest(dataValue: unknown, timestampValue: unknown): [number, number] {
  const data = tradingViewValueAtTimeData(dataValue);
  const times = tradingViewValueAtTimeArray<number>(data.fields.get('times'));
  const values = tradingViewValueAtTimeArray<number>(data.fields.get('values'));
  const size = Math.min(getArraySize(times), getArraySize(values));
  if (size === 0) return [Number.NaN, Number.NaN];

  const timestamp = toRuntimeNumber(timestampValue);
  if (!Number.isFinite(timestamp)) return [Number.NaN, Number.NaN];
  let bestIndex = 0;
  if (orderedValueAtTimeData.get(data) === true) {
    bestIndex = tradingViewValueAtTimeOrderedIndex(times.values, size, timestamp);
  } else {
    let bestDistance = Math.abs(toRuntimeNumber(getArrayValue(times, 0)) - timestamp);
    for (let index = 1; index < size; index += 1) {
      const distance = Math.abs(toRuntimeNumber(getArrayValue(times, index)) - timestamp);
      if (distance < bestDistance) {
        bestIndex = index;
        bestDistance = distance;
      }
    }
  }
  return [toRuntimeNumber(getArrayValue(values, bestIndex)), toRuntimeNumber(getArrayValue(times, bestIndex))];
}

function tradingViewValueAtTimePeriodTimestamp(
  periodValue: unknown,
  referenceTimeValue: unknown,
  ctx: ExecutionContext,
): number {
  if (typeof periodValue !== 'string' || typeof referenceTimeValue !== 'number') {
    return computeTradingViewValueAtTimePeriodTimestamp(periodValue, referenceTimeValue, ctx);
  }
  const cache = valueAtTimeContextPeriodCaches.get(ctx);
  if (!cache) return computeTradingViewValueAtTimePeriodTimestamp(periodValue, referenceTimeValue, ctx);
  let conversion = cache.get(periodValue);
  if (!conversion) {
    const period = periodValue.trim().toUpperCase();
    const match = /^(\d+)([DWMY])$/.exec(period);
    conversion = {
      period,
      unit: period === 'YTD' ? 'YTD' : (match?.[2] ?? ''),
      amount: Number(match?.[1]),
      calendarDays: new Map(),
    };
    cache.set(periodValue, conversion);
  }
  if (!Number.isFinite(referenceTimeValue)) return Number.NaN;
  if (conversion.unit === 'D') return referenceTimeValue - conversion.amount * 86_400_000;
  if (conversion.unit === 'W') return referenceTimeValue - conversion.amount * 7 * 86_400_000;
  if (
    !Number.isFinite(referenceTimeValue) ||
    Math.abs(referenceTimeValue) > 8_640_000_000_000_000 ||
    conversion.unit === ''
  )
    return Number.NaN;
  const referenceTime = Math.trunc(referenceTimeValue);
  const dayStart = Math.floor(referenceTime / 86_400_000) * 86_400_000;
  let calendarStart = conversion.calendarDays.get(dayStart);
  if (calendarStart === undefined) {
    calendarStart = computeTradingViewValueAtTimePeriodTimestamp(conversion.period, dayStart, ctx);
    conversion.calendarDays.set(dayStart, calendarStart);
  }
  if (conversion.unit === 'YTD') return calendarStart;
  const timestamp = calendarStart + (referenceTime - dayStart);
  return Math.abs(timestamp) > 8_640_000_000_000_000 ? Number.NaN : timestamp;
}

function computeTradingViewValueAtTimePeriodTimestamp(
  periodValue: unknown,
  referenceTimeValue: unknown,
  ctx: ExecutionContext,
): number {
  const period = toRuntimeString(periodValue).trim().toUpperCase();
  const referenceTime = toRuntimeNumber(referenceTimeValue);
  if (!Number.isFinite(referenceTime) || period === '') return Number.NaN;
  if (period === 'YTD') {
    const date = new Date(referenceTime);
    return Date.UTC(date.getUTCFullYear(), 0, 1);
  }
  const match = /^(\d+)([DWMY])$/.exec(period);
  if (!match) return Number.NaN;
  const amount = Number(match[1]);
  switch (match[2]) {
    case 'D':
      return referenceTime - amount * 86_400_000;
    case 'W':
      return referenceTime - amount * 7 * 86_400_000;
    case 'M': {
      const date = new Date(referenceTime);
      return Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth() - amount,
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds(),
        date.getUTCMilliseconds(),
      );
    }
    case 'Y': {
      const date = new Date(referenceTime);
      return Date.UTC(
        date.getUTCFullYear() - amount,
        date.getUTCMonth(),
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds(),
        date.getUTCMilliseconds(),
      );
    }
    default:
      return getRuntimeTimeframeDurationMs(period, ctx.timeframe.period) ?? Number.NaN;
  }
}

function tradingViewValueAtTimeStringArray(input: unknown): PineArray<string> {
  const result = createPineArray<string>();
  for (const part of toRuntimeString(input).split(',')) {
    const trimmed = part.trim();
    if (trimmed !== '') pushArrayValue(result, trimmed);
  }
  return result;
}

const valueAtTimeTargetSnapshots = new WeakMap<PineArray, readonly unknown[]>();

function snapshotValueAtTimeTargets(targets: PineArray): readonly unknown[] {
  const count = normalizeArraySize(getArraySize(targets));
  const stored = valueAtTimeTargetSnapshots.get(targets);
  const values = targets.view ? undefined : targets.values;
  if (stored?.length === count) {
    let unchanged = true;
    for (let index = 0; index < count; index++) {
      if (!Object.is(stored[index], values ? values[index] : getArrayValue(targets, index))) {
        unchanged = false;
        break;
      }
    }
    if (unchanged) return stored;
  }
  const snapshot = values ? values.slice() : Array.from({ length: count }, (_, index) => getArrayValue(targets, index));
  valueAtTimeTargetSnapshots.set(targets, snapshot);
  return snapshot;
}

type ValueAtTimeTargetTimestamp = (target: unknown, referenceTime: number, ctx: ExecutionContext) => unknown;

interface ValueAtTimeBatchDescriptor {
  deferConversion: boolean;
  targets: readonly unknown[];
  timeValues: number[];
  sourceValues: number[];
  ordered: boolean;
  timestampForTarget: ValueAtTimeTargetTimestamp;
  ctx: ExecutionContext;
}

const valueAtTimeBatchDescriptors = new WeakMap<PineUdtObject, ValueAtTimeBatchDescriptor>();

interface ValueAtTimeBatchSnapshot {
  descriptor: ValueAtTimeBatchDescriptor;
  size: number;
  referenceTime: number;
  output?: [number[], number[]];
}

function materializeValueAtTimeBatch(tuple: ValueAtTimeBatchSnapshot): [number[], number[]] {
  const descriptor = tuple.descriptor;
  if (tuple.output) return tuple.output;
  const count = descriptor.targets.length;
  const outputValues = new Array<number>(count);
  const outputTimes = new Array<number>(count);
  const output: [number[], number[]] = [outputValues, outputTimes];
  for (let index = 0; index < count; index++) {
    const timestamp = toRuntimeNumber(
      descriptor.timestampForTarget(descriptor.targets[index], tuple.referenceTime, descriptor.ctx),
    );
    let selected = -1;
    if (descriptor.ordered) selected = tradingViewValueAtTimeOrderedIndex(descriptor.timeValues, tuple.size, timestamp);
    else if (tuple.size > 0 && Number.isFinite(timestamp)) {
      selected = 0;
      let distance = Math.abs(toRuntimeNumber(descriptor.timeValues[0]) - timestamp);
      for (let candidate = 1; candidate < tuple.size; candidate++) {
        const nextDistance = Math.abs(toRuntimeNumber(descriptor.timeValues[candidate]) - timestamp);
        if (nextDistance < distance) {
          selected = candidate;
          distance = nextDistance;
        }
      }
    }
    outputValues[index] = selected < 0 ? Number.NaN : toRuntimeNumber(descriptor.sourceValues[selected]);
    outputTimes[index] = selected < 0 ? Number.NaN : toRuntimeNumber(descriptor.timeValues[selected]);
  }
  tuple.output = output;
  return output;
}

class DeferredValueAtTimeBatch implements ValueAtTimeBatchSnapshot, PineArray<number> {
  output?: [number[], number[]];

  constructor(
    readonly descriptor: ValueAtTimeBatchDescriptor,
    readonly size: number,
    readonly referenceTime: number,
  ) {}

  get __tealscriptArray(): true {
    return true;
  }
  get values(): number[] {
    return materializeValueAtTimeBatch(this)[0];
  }
  set values(values: number[]) {
    materializeValueAtTimeBatch(this)[0] = values;
  }
  toJSON() {
    return { __tealscriptArray: true, values: this.values };
  }
}

class DeferredValueAtTimeArray implements PineArray<number> {
  constructor(private batch: ValueAtTimeBatchSnapshot) {}

  get __tealscriptArray(): true {
    return true;
  }
  get values(): number[] {
    return materializeValueAtTimeBatch(this.batch)[1];
  }
  set values(values: number[]) {
    materializeValueAtTimeBatch(this.batch)[1] = values;
  }
  toJSON() {
    return { __tealscriptArray: true, values: this.values };
  }
}

function tradingViewValueAtTimeBatch(
  targets: PineArray,
  timestampForTarget: ValueAtTimeTargetTimestamp,
  source: unknown,
  data: PineUdtObject,
  ctx: ExecutionContext,
): [PineArray<number>, PineArray<number>, number, string] {
  const targetSnapshot = snapshotValueAtTimeTargets(targets);
  const timeValues = (data.fields.get('times') as PineArray<number>).values;
  const sourceValues = (data.fields.get('values') as PineArray<number>).values;
  const ordered = orderedValueAtTimeData.get(data) === true;
  let descriptor = valueAtTimeBatchDescriptors.get(data);
  if (
    !descriptor ||
    descriptor.targets !== targetSnapshot ||
    descriptor.timeValues !== timeValues ||
    descriptor.sourceValues !== sourceValues ||
    descriptor.ordered !== ordered ||
    descriptor.timestampForTarget !== timestampForTarget ||
    descriptor.ctx !== ctx
  ) {
    descriptor = {
      deferConversion: targetSnapshot.every(
        (target) => target === null || !['object', 'function'].includes(typeof target),
      ),
      targets: targetSnapshot,
      timeValues,
      sourceValues,
      ordered,
      timestampForTarget,
      ctx,
    };
    valueAtTimeBatchDescriptors.set(data, descriptor);
  }
  const batch = new DeferredValueAtTimeBatch(
    descriptor,
    Math.min(timeValues.length, sourceValues.length),
    toRuntimeNumber(ctx.time.get(0)),
  );
  borrowedValueAtTimeData.add(data);
  if (!descriptor.deferConversion) materializeValueAtTimeBatch(batch);
  return [batch, new DeferredValueAtTimeArray(batch), toRuntimeNumber(source), ctx.syminfo.description ?? ''];
}

function tradingViewValueAtTimeOrderedIndex(times: readonly number[], size: number, timestamp: number): number {
  if (size === 0 || !Number.isFinite(timestamp)) return -1;
  if (timestamp <= times[0]) return 0;
  let low = 0;
  let high = size;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if (times[middle] < timestamp) low = middle + 1;
    else high = middle;
  }
  let bestIndex = Math.min(low, size - 1);
  if (low > 0 && Math.abs(times[low - 1] - timestamp) <= Math.abs(times[bestIndex] - timestamp)) bestIndex = low - 1;
  const bestDistance = Math.abs(times[bestIndex] - timestamp);
  low = 0;
  high = bestIndex;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if (Math.abs(times[middle] - timestamp) <= bestDistance) high = middle;
    else low = middle + 1;
  }
  return low;
}

function registerTradingViewValueAtTimeBuiltins(builtins: BuiltinRegistry): void {
  builtins.set('TradingView.ValueAtTime.getArrayFromString', (args) => tradingViewValueAtTimeStringArray(args[0]));
  builtins.set('TradingView.ValueAtTime.periodToTimestamp', (args, named, ctx) => {
    const namedArgs = Object.fromEntries(named);
    return tradingViewValueAtTimePeriodTimestamp(
      orderedRuntimeArg(args, namedArgs, ['period', 'referenceTime'], 0),
      orderedRuntimeArg(args, namedArgs, ['period', 'referenceTime'], 1),
      ctx,
    );
  });
  builtins.set('TradingView.ValueAtTime.collectData', (args, named, ctx, scope, callId) =>
    collectTradingViewValueAtTimeData(args, named, ctx, scope, callId, false),
  );
  builtins.set('TradingView.ValueAtTime.valueAtTime', (args, named, ctx, scope, callId) => {
    const namedArgs = Object.fromEntries(named);
    const source = orderedRuntimeArg(args, namedArgs, ['source', 'timestamp', 'timeOffsetLimit', 'timeframeLimit'], 0);
    const timestamp = orderedRuntimeArg(
      args,
      namedArgs,
      ['source', 'timestamp', 'timeOffsetLimit', 'timeframeLimit'],
      1,
    );
    const data = collectTradingViewValueAtTimeData(
      [
        source,
        orderedRuntimeArg(args, namedArgs, ['source', 'timestamp', 'timeOffsetLimit', 'timeframeLimit'], 2),
        orderedRuntimeArg(args, namedArgs, ['source', 'timestamp', 'timeOffsetLimit', 'timeframeLimit'], 3, ''),
      ],
      new Map(),
      ctx,
      scope,
      callId,
    );
    const [value, valueTime] = tradingViewValueAtTimeNearest(data, timestamp);
    return [value, valueTime, toRuntimeNumber(source)];
  });
  builtins.set('TradingView.ValueAtTime.valueAtTimeOffset', (args, named, ctx, scope, callId) => {
    const namedArgs = Object.fromEntries(named);
    const source = orderedRuntimeArg(args, namedArgs, ['source', 'timeOffset', 'timeOffsetLimit', 'timeframeLimit'], 0);
    const offset = orderedRuntimeArg(args, namedArgs, ['source', 'timeOffset', 'timeOffsetLimit', 'timeframeLimit'], 1);
    const data = collectTradingViewValueAtTimeData(
      [
        source,
        orderedRuntimeArg(args, namedArgs, ['source', 'timeOffset', 'timeOffsetLimit', 'timeframeLimit'], 2),
        orderedRuntimeArg(args, namedArgs, ['source', 'timeOffset', 'timeOffsetLimit', 'timeframeLimit'], 3, ''),
      ],
      new Map(),
      ctx,
      scope,
      callId,
    );
    const [value, valueTime] = tradingViewValueAtTimeNearest(
      data,
      toRuntimeNumber(ctx.time.get(0)) - toRuntimeNumber(offset),
    );
    return [value, valueTime, toRuntimeNumber(source)];
  });
  builtins.set('TradingView.ValueAtTime.valueAtPeriodOffset', (args, named, ctx, scope, callId) => {
    const namedArgs = Object.fromEntries(named);
    const source = orderedRuntimeArg(args, namedArgs, ['source', 'period', 'timeOffsetLimit', 'timeframeLimit'], 0);
    const period = orderedRuntimeArg(args, namedArgs, ['source', 'period', 'timeOffsetLimit', 'timeframeLimit'], 1);
    const data = collectTradingViewValueAtTimeData(
      [
        source,
        orderedRuntimeArg(args, namedArgs, ['source', 'period', 'timeOffsetLimit', 'timeframeLimit'], 2),
        orderedRuntimeArg(args, namedArgs, ['source', 'period', 'timeOffsetLimit', 'timeframeLimit'], 3, ''),
      ],
      new Map(),
      ctx,
      scope,
      callId,
    );
    const [value, valueTime] = tradingViewValueAtTimeNearest(
      data,
      tradingViewValueAtTimePeriodTimestamp(period, ctx.time.get(0), ctx),
    );
    return [value, valueTime, toRuntimeNumber(source)];
  });
  const registerBatch = (
    name: string,
    targetName: string,
    timestampForTarget: (target: unknown, referenceTime: number, ctx: ExecutionContext) => unknown,
    collectionSuffix: string,
  ) => {
    builtins.set(`TradingView.ValueAtTime.${name}`, (args, named, ctx, scope, callId) => {
      const targets = tradingViewValueAtTimeArray(named.has(targetName) ? named.get(targetName) : args[0]);
      const source = named.has('source') ? named.get('source') : args[1];
      const timeOffsetLimit = named.has('timeOffsetLimit') ? named.get('timeOffsetLimit') : args[2];
      const timeframeLimit = named.has('timeframeLimit') ? named.get('timeframeLimit') : (args[3] ?? '');
      const data = collectBoundValueAtTimeData(
        toRuntimeNumber(source),
        timeOffsetLimit,
        timeframeLimit,
        ctx,
        scope,
        `${callId}${collectionSuffix}`,
      );
      return tradingViewValueAtTimeBatch(targets, timestampForTarget, source, data, ctx);
    });
  };
  registerBatch('getDataAtTimes', 'timestamps', (target) => target, '');
  registerBatch(
    'getDataAtTimeOffsets',
    'timeOffsets',
    (target, referenceTime) => referenceTime - toRuntimeNumber(target),
    ':times',
  );
  registerBatch(
    'getDataAtPeriodOffsets',
    'periods',
    (target, referenceTime, ctx) => tradingViewValueAtTimePeriodTimestamp(target, referenceTime, ctx),
    ':times',
  );
}

function registerTradingViewColorBuiltins(builtins: BuiltinRegistry): void {
  const arg = (args: unknown[], named: Map<string, unknown>, names: string[], index: number, fallback?: unknown) => (
    orderedRuntimeArg(args, Object.fromEntries(named), names, index, fallback)
  );
  const rgba = (args: unknown[], named: Map<string, unknown>) => runtimeColorTupleFromArgs(args, named, ['r', 'g', 'b', 't']);
  const rgbColor = (values: readonly unknown[]) => runtimeColorFromTuple(values);
  const colorArray = (values: string[]) => {
    const array = createPineArray<string>();
    for (const value of values) pushArrayValue(array, value);
    return array;
  };

  builtins.set('TradingView.Color.getRGB', (args, named) => rgba(args, named));
  builtins.set('TradingView.Color.getHexString', (args, named) => {
    const values = rgba(args, named);
    return rgbColor(values);
  });
  builtins.set('TradingView.Color.hexStringToRGB', (args, named) => runtimeColorTupleForSpace(arg(args, named, ['source'], 0), 'rgb'));
  builtins.set('TradingView.Color.hexStringToColor', (args, named) => rgbColor(runtimeColorTupleForSpace(arg(args, named, ['source'], 0), 'rgb')));

  builtins.set('TradingView.Color.getLRGB', (args, named) => {
    const [r, g, b, t] = rgba(args, named);
    return [runtimeRgbToLinear(r), runtimeRgbToLinear(g), runtimeRgbToLinear(b), t];
  });
  builtins.set('TradingView.Color.lrgbToRGB', (args, named) => {
    const names = ['lr', 'lg', 'lb', 't'];
    return [
      runtimeLinearToRgb(toRuntimeNumber(arg(args, named, names, 0))),
      runtimeLinearToRgb(toRuntimeNumber(arg(args, named, names, 1))),
      runtimeLinearToRgb(toRuntimeNumber(arg(args, named, names, 2))),
      toRuntimeNumber(arg(args, named, names, 3)),
    ];
  });
  builtins.set('TradingView.Color.lrgbToColor', (args, named) => rgbColor(builtins.get('TradingView.Color.lrgbToRGB')!(args, named, {} as ExecutionContext, new Scope(), 'lrgb') as unknown[]));

  const tupleGetter = (name: string, space: string) => builtins.set(`TradingView.Color.${name}`, (args, named) => {
    if (args.length === 1 && named.size === 0) return runtimeColorTupleForSpace(args[0], space);
    return runtimeColorTupleForSpace(rgbColor(rgba(args, named)), space);
  });
  tupleGetter('getHSL', 'hsl');
  tupleGetter('getHSV', 'hsv');
  tupleGetter('getHWB', 'hwb');
  tupleGetter('getXYZ', 'xyz');
  tupleGetter('getXYY', 'xyy');
  tupleGetter('getLAB', 'lab');
  tupleGetter('getOKLAB', 'oklab');
  tupleGetter('getLCH', 'lch');
  tupleGetter('getOKLCH', 'oklch');

  builtins.set('TradingView.Color.hslToRGB', (args, named) => [...runtimeHslToRgb(toRuntimeNumber(arg(args, named, ['h', 's', 'l', 't'], 0)), toRuntimeNumber(arg(args, named, ['h', 's', 'l', 't'], 1)), toRuntimeNumber(arg(args, named, ['h', 's', 'l', 't'], 2))), toRuntimeNumber(arg(args, named, ['h', 's', 'l', 't'], 3))]);
  builtins.set('TradingView.Color.hslToColor', (args, named) => rgbColor(builtins.get('TradingView.Color.hslToRGB')!(args, named, {} as ExecutionContext, new Scope(), 'hsl') as unknown[]));
  builtins.set('TradingView.Color.hsvToRGB', (args, named) => [...runtimeHsvToRgb(toRuntimeNumber(arg(args, named, ['h', 's', 'v', 't'], 0)), toRuntimeNumber(arg(args, named, ['h', 's', 'v', 't'], 1)), toRuntimeNumber(arg(args, named, ['h', 's', 'v', 't'], 2))), toRuntimeNumber(arg(args, named, ['h', 's', 'v', 't'], 3))]);
  builtins.set('TradingView.Color.hsvToColor', (args, named) => rgbColor(builtins.get('TradingView.Color.hsvToRGB')!(args, named, {} as ExecutionContext, new Scope(), 'hsv') as unknown[]));
  builtins.set('TradingView.Color.hwbToRGB', (args, named) => {
    const names = ['h', 'w', 'b', 't'];
    const [r, g, b] = runtimeHsvToRgb(toRuntimeNumber(arg(args, named, names, 0)), 100, 100);
    const white = clampRuntimeUnit(toRuntimeNumber(arg(args, named, names, 1)) / 100);
    const black = clampRuntimeUnit(toRuntimeNumber(arg(args, named, names, 2)) / 100);
    const factor = Math.max(0, 1 - white - black);
    return [r * factor + white * 255, g * factor + white * 255, b * factor + white * 255, toRuntimeNumber(arg(args, named, names, 3))];
  });
  builtins.set('TradingView.Color.hwbToColor', (args, named) => rgbColor(builtins.get('TradingView.Color.hwbToRGB')!(args, named, {} as ExecutionContext, new Scope(), 'hwb') as unknown[]));

  builtins.set('TradingView.Color.xyzToRGB', (args, named) => {
    const names = ['x', 'y', 'z', 't'];
    return [...runtimeXyzToRgb(toRuntimeNumber(arg(args, named, names, 0)), toRuntimeNumber(arg(args, named, names, 1)), toRuntimeNumber(arg(args, named, names, 2))), toRuntimeNumber(arg(args, named, names, 3))];
  });
  builtins.set('TradingView.Color.xyzToColor', (args, named) => rgbColor(builtins.get('TradingView.Color.xyzToRGB')!(args, named, {} as ExecutionContext, new Scope(), 'xyz') as unknown[]));
  builtins.set('TradingView.Color.xyyToRGB', (args, named) => {
    const names = ['xc', 'yc', 'y', 't'];
    const x = toRuntimeNumber(arg(args, named, names, 0));
    const yChrom = toRuntimeNumber(arg(args, named, names, 1));
    const luminance = toRuntimeNumber(arg(args, named, names, 2));
    const xyz: [number, number, number] = yChrom === 0 ? [0, 0, 0] : [(x * luminance) / yChrom, luminance, ((1 - x - yChrom) * luminance) / yChrom];
    return [...runtimeXyzToRgb(...xyz), toRuntimeNumber(arg(args, named, names, 3))];
  });
  builtins.set('TradingView.Color.xyyToColor', (args, named) => rgbColor(builtins.get('TradingView.Color.xyyToRGB')!(args, named, {} as ExecutionContext, new Scope(), 'xyy') as unknown[]));
  builtins.set('TradingView.Color.labToRGB', (args, named) => {
    const names = ['l', 'a', 'b', 't'];
    const xyz = runtimeLabToXyz(toRuntimeNumber(arg(args, named, names, 0)), toRuntimeNumber(arg(args, named, names, 1)), toRuntimeNumber(arg(args, named, names, 2)));
    return [...runtimeXyzToRgb(...xyz), toRuntimeNumber(arg(args, named, names, 3))];
  });
  builtins.set('TradingView.Color.labToColor', (args, named) => rgbColor(builtins.get('TradingView.Color.labToRGB')!(args, named, {} as ExecutionContext, new Scope(), 'lab') as unknown[]));
  builtins.set('TradingView.Color.oklabToRGB', (args, named) => {
    const names = ['l', 'a', 'b', 't'];
    const xyz = runtimeOklabToXyz(toRuntimeNumber(arg(args, named, names, 0)), toRuntimeNumber(arg(args, named, names, 1)), toRuntimeNumber(arg(args, named, names, 2)));
    return [...runtimeXyzToRgb(...xyz), toRuntimeNumber(arg(args, named, names, 3))];
  });
  builtins.set('TradingView.Color.oklabToColor', (args, named) => rgbColor(builtins.get('TradingView.Color.oklabToRGB')!(args, named, {} as ExecutionContext, new Scope(), 'oklab') as unknown[]));
  builtins.set('TradingView.Color.lchToRGB', (args, named) => {
    const names = ['l', 'c', 'h', 't'];
    const lab = runtimeLchToLab(toRuntimeNumber(arg(args, named, names, 0)), toRuntimeNumber(arg(args, named, names, 1)), toRuntimeNumber(arg(args, named, names, 2)));
    return [...runtimeXyzToRgb(...runtimeLabToXyz(...lab)), toRuntimeNumber(arg(args, named, names, 3))];
  });
  builtins.set('TradingView.Color.lchToColor', (args, named) => rgbColor(builtins.get('TradingView.Color.lchToRGB')!(args, named, {} as ExecutionContext, new Scope(), 'lch') as unknown[]));
  builtins.set('TradingView.Color.oklchToRGB', (args, named) => {
    const names = ['l', 'c', 'h', 't'];
    const oklab = runtimeLchToLab(toRuntimeNumber(arg(args, named, names, 0)), toRuntimeNumber(arg(args, named, names, 1)), toRuntimeNumber(arg(args, named, names, 2)));
    return [...runtimeXyzToRgb(...runtimeOklabToXyz(...oklab)), toRuntimeNumber(arg(args, named, names, 3))];
  });
  builtins.set('TradingView.Color.oklchToColor', (args, named) => rgbColor(builtins.get('TradingView.Color.oklchToRGB')!(args, named, {} as ExecutionContext, new Scope(), 'oklch') as unknown[]));

  builtins.set('TradingView.Color.contrastRatio', (args, named) => {
    const y1 = runtimeColorTupleForSpace(arg(args, named, ['value1', 'value2'], 0), 'xyz')[1] / 100;
    const y2 = runtimeColorTupleForSpace(arg(args, named, ['value1', 'value2'], 1), 'xyz')[1] / 100;
    const light = Math.max(y1, y2);
    const dark = Math.min(y1, y2);
    return (light + 0.05) / (dark + 0.05);
  });
  builtins.set('TradingView.Color.isLightTheme', (args, named) => runtimeColorTupleForSpace(arg(args, named, ['source'], 0), 'xyz')[1] > 50);
  builtins.set('TradingView.Color.grayscale', (args, named) => {
    const y = runtimeColorTupleForSpace(arg(args, named, ['source'], 0), 'xyz')[1] / 100;
    const gray = clampRuntimeChannel(y * 255, 0, 255);
    const t = runtimeColorTupleForSpace(arg(args, named, ['source'], 0), 'rgb')[3];
    return rgbColor([gray, gray, gray, t]);
  });
  builtins.set('TradingView.Color.negative', (args, named) => {
    const [r, g, b, t] = runtimeColorTupleForSpace(arg(args, named, ['source', 'colorSpace'], 0), 'rgb');
    return rgbColor([255 - r, 255 - g, 255 - b, t]);
  });
  builtins.set('TradingView.Color.complement', (args, named) => runtimeColorWithHue(arg(args, named, ['source', 'colorSpace'], 0), 180, arg(args, named, ['source', 'colorSpace'], 1, 'HSL')));
  builtins.set('TradingView.Color.analogousColors', (args, named) => [
    runtimeColorWithHue(arg(args, named, ['source', 'colorSpace'], 0), -30, arg(args, named, ['source', 'colorSpace'], 1, 'HSL')),
    runtimeColorWithHue(arg(args, named, ['source', 'colorSpace'], 0), 30, arg(args, named, ['source', 'colorSpace'], 1, 'HSL')),
  ]);
  builtins.set('TradingView.Color.splitComplements', (args, named) => [
    runtimeColorWithHue(arg(args, named, ['source', 'colorSpace'], 0), 150, arg(args, named, ['source', 'colorSpace'], 1, 'HSL')),
    runtimeColorWithHue(arg(args, named, ['source', 'colorSpace'], 0), 210, arg(args, named, ['source', 'colorSpace'], 1, 'HSL')),
  ]);
  builtins.set('TradingView.Color.triadicColors', (args, named) => [
    runtimeColorWithHue(arg(args, named, ['source', 'colorSpace'], 0), 120, arg(args, named, ['source', 'colorSpace'], 1, 'HSL')),
    runtimeColorWithHue(arg(args, named, ['source', 'colorSpace'], 0), 240, arg(args, named, ['source', 'colorSpace'], 1, 'HSL')),
  ]);
  builtins.set('TradingView.Color.tetradicColors', (args, named) => {
    const source = arg(args, named, ['source', 'colorSpace', 'square'], 0);
    const space = arg(args, named, ['source', 'colorSpace', 'square'], 1, 'HSL');
    const square = isRuntimeTruthy(arg(args, named, ['source', 'colorSpace', 'square'], 2, false));
    const rotations = square ? [90, 180, 270] : [60, 180, 240];
    return rotations.map((rotation) => runtimeColorWithHue(source, rotation, space));
  });
  builtins.set('TradingView.Color.pentadicColors', (args, named) => [72, 144, 216, 288].map((rotation) => runtimeColorWithHue(arg(args, named, ['source', 'colorSpace'], 0), rotation, arg(args, named, ['source', 'colorSpace'], 1, 'HSL'))));
  builtins.set('TradingView.Color.hexadicColors', (args, named) => [60, 120, 180, 240, 300].map((rotation) => runtimeColorWithHue(arg(args, named, ['source', 'colorSpace'], 0), rotation, arg(args, named, ['source', 'colorSpace'], 1, 'HSL'))));
  builtins.set('TradingView.Color.add', (args, named) => {
    const c1 = runtimeColorTupleForSpace(arg(args, named, ['value1', 'value2', 'transpWeight'], 0), 'rgb');
    const c2 = runtimeColorTupleForSpace(arg(args, named, ['value1', 'value2', 'transpWeight'], 1), 'rgb');
    const alphaWeight = isRuntimeTruthy(arg(args, named, ['value1', 'value2', 'transpWeight'], 2, false));
    const a1 = (100 - c1[3]) / 100;
    const a2 = (100 - c2[3]) / 100;
    const w1 = alphaWeight ? a1 : 1;
    const w2 = alphaWeight ? a2 : 1;
    return rgbColor([Math.min(255, c1[0] * w1 + c2[0] * w2), Math.min(255, c1[1] * w1 + c2[1] * w2), Math.min(255, c1[2] * w1 + c2[2] * w2), 100 - Math.min(1, a1 + a2) * 100]);
  });
  builtins.set('TradingView.Color.overlay', (args, named) => {
    const fg = runtimeColorTupleForSpace(arg(args, named, ['fg', 'bg'], 0), 'rgb');
    const bg = runtimeColorTupleForSpace(arg(args, named, ['fg', 'bg'], 1), 'rgb');
    const af = (100 - fg[3]) / 100;
    const ab = (100 - bg[3]) / 100;
    const outA = af + ab * (1 - af);
    if (outA === 0) return '#00000000';
    return rgbColor([(fg[0] * af + bg[0] * ab * (1 - af)) / outA, (fg[1] * af + bg[1] * ab * (1 - af)) / outA, (fg[2] * af + bg[2] * ab * (1 - af)) / outA, 100 - outA * 100]);
  });
  builtins.set('TradingView.Color.fromGradient', (args, named) => {
    const names = ['value', 'bottomValue', 'topValue', 'bottomColor', 'topColor', 'colorSpace'];
    const value = toRuntimeNumber(arg(args, named, names, 0));
    const bottom = toRuntimeNumber(arg(args, named, names, 1));
    const top = toRuntimeNumber(arg(args, named, names, 2));
    const ratio = top === bottom ? 0 : clampRuntimeUnit((value - bottom) / (top - bottom));
    const c1 = runtimeColorTupleForSpace(arg(args, named, names, 3), 'rgb');
    const c2 = runtimeColorTupleForSpace(arg(args, named, names, 4), 'rgb');
    return rgbColor(c1.map((value, index) => value + (c2[index] - value) * ratio));
  });
  builtins.set('TradingView.Color.fromMultiStepGradient', (args, named) => {
    const value = toRuntimeNumber(arg(args, named, ['value', 'steps', 'colors', 'colorSpace'], 0));
    const steps = arg(args, named, ['value', 'steps', 'colors', 'colorSpace'], 1);
    const colors = arg(args, named, ['value', 'steps', 'colors', 'colorSpace'], 2);
    if (!isPineArray(steps) || !isPineArray(colors) || getArraySize(steps) === 0 || getArraySize(colors) === 0) return '#00000000';
    let index = 0;
    while (index + 1 < getArraySize(steps) && value > toRuntimeNumber(getArrayValue(steps, index + 1))) index += 1;
    const next = Math.min(index + 1, getArraySize(colors) - 1);
    return builtins.get('TradingView.Color.fromGradient')!([value, getArrayValue(steps, index), getArrayValue(steps, next), getArrayValue(colors, index), getArrayValue(colors, next)], new Map(), {} as ExecutionContext, new Scope(), 'gradient') as string;
  });
  builtins.set('TradingView.Color.gradientPalette', (args, named) => {
    const steps = Math.max(1, Math.trunc(toRuntimeNumber(arg(args, named, ['baseColor', 'stopColor', 'steps', 'strength', 'model'], 2, 5))));
    return colorArray(Array.from({ length: steps }, (_, index) => builtins.get('TradingView.Color.fromGradient')!([index, 0, Math.max(1, steps - 1), arg(args, named, ['baseColor', 'stopColor', 'steps', 'strength', 'model'], 0), arg(args, named, ['baseColor', 'stopColor', 'steps', 'strength', 'model'], 1)], new Map(), {} as ExecutionContext, new Scope(), 'palette') as string));
  });
  builtins.set('TradingView.Color.monoPalette', (args, named) => {
    const base = arg(args, named, ['baseColor', 'grayLuminance', 'variations', 'strength', 'colorSpace'], 0);
    const variations = Math.max(1, Math.trunc(toRuntimeNumber(arg(args, named, ['baseColor', 'grayLuminance', 'variations', 'strength', 'colorSpace'], 2, 5))));
    const target = runtimeColorTupleForSpace(base, 'xyz')[1] > 50 ? '#000000FF' : '#FFFFFFFF';
    return colorArray(Array.from({ length: variations }, (_, index) => builtins.get('TradingView.Color.fromGradient')!([index, 0, Math.max(1, variations - 1), base, target], new Map(), {} as ExecutionContext, new Scope(), 'mono') as string));
  });
  builtins.set('TradingView.Color.harmonyPalette', (args, named) => {
    const base = arg(args, named, ['baseColor', 'harmonyType', 'grayLuminance', 'variations', 'strength', 'colorSpace'], 0);
    const variations = Math.max(1, Math.trunc(toRuntimeNumber(arg(args, named, ['baseColor', 'harmonyType', 'grayLuminance', 'variations', 'strength', 'colorSpace'], 3, 3))));
    const harmonies = [base, ...([120, 240].map((rotation) => runtimeColorWithHue(base, rotation, arg(args, named, ['baseColor', 'harmonyType', 'grayLuminance', 'variations', 'strength', 'colorSpace'], 5, 'HSL'))))];
    const matrix = createPineMatrix<string>(harmonies.length, variations);
    harmonies.forEach((color, row) => {
      const palette = builtins.get('TradingView.Color.monoPalette')!([color, 0.5, variations], new Map(), {} as ExecutionContext, new Scope(), 'harmony') as PineArray<string>;
      for (let column = 0; column < variations; column += 1) matrix.values[row * variations + column] = getArrayValue(palette, column) as string;
    });
    return matrix;
  });
}

function registerCompiledFootprintBuiltins(builtins: BuiltinRegistry): void {
  const footprintArg = (args: unknown[], named: Map<string, unknown>) => (
    named.has('id') ? named.get('id') : args[0]
  );
  const rowArg = footprintArg;

  builtins.set('footprint.total_volume', (args, named) => footprintValue(footprintArg(args, named), 'totalVolume'));
  builtins.set('footprint.buy_volume', (args, named) => footprintValue(footprintArg(args, named), 'buyVolume'));
  builtins.set('footprint.sell_volume', (args, named) => footprintValue(footprintArg(args, named), 'sellVolume'));
  builtins.set('footprint.delta', (args, named) => footprintDelta(footprintArg(args, named)));
  builtins.set('footprint.rows', (args, named) => {
    const footprint = footprintArg(args, named);
    if (footprint == null || isRuntimeNa(footprint)) {
      throw new PineRuntimeArgumentError('The `footprint` ID used in the `rows()` call cannot be `na`.', 'RE10029');
    }
    const rows = createPineArray();
    rows.values = footprintRows(footprint);
    return rows;
  });
  builtins.set('footprint.poc', (args, named) => footprintPoc(footprintArg(args, named)) ?? NaN);
  builtins.set('footprint.vah', (args, named) => footprintValueAreaHigh(footprintArg(args, named)) ?? NaN);
  builtins.set('footprint.val', (args, named) => footprintValueAreaLow(footprintArg(args, named)) ?? NaN);
  builtins.set('footprint.get_row_by_price', (args, named) => {
    const footprint = footprintArg(args, named);
    const price = named.has('price') ? named.get('price') : args[named.has('id') ? 0 : 1];
    return footprintRowByPrice(footprint, price) ?? NaN;
  });

  builtins.set('volume_row.up_price', (args, named) => {
    const row = rowArg(args, named);
    if (row == null || isRuntimeNa(row)) {
      throw new PineRuntimeArgumentError('The `volume_row` ID used in the `up_price()` call cannot be `na`.', 'RE10145');
    }
    return volumeRowValue(row, 'upPrice');
  });
  builtins.set('volume_row.down_price', (args, named) => volumeRowValue(rowArg(args, named), 'downPrice'));
  builtins.set('volume_row.total_volume', (args, named) => volumeRowValue(rowArg(args, named), 'totalVolume'));
  builtins.set('volume_row.buy_volume', (args, named) => volumeRowValue(rowArg(args, named), 'buyVolume'));
  builtins.set('volume_row.sell_volume', (args, named) => volumeRowValue(rowArg(args, named), 'sellVolume'));
  builtins.set('volume_row.delta', (args, named) => volumeRowDelta(rowArg(args, named)));
  builtins.set('volume_row.has_buy_imbalance', (args, named) => volumeRowImbalance(rowArg(args, named), 'hasBuyImbalance'));
  builtins.set('volume_row.has_sell_imbalance', (args, named) => volumeRowImbalance(rowArg(args, named), 'hasSellImbalance'));
}

function registerCompiledLegacyBuiltins(builtins: BuiltinRegistry): void {
  const iffArgs = [['condition'], ['then'], ['else']] as const;
  const maxBarsBackArgs = [['var'], ['num']] as const;
  builtins.set('iff', (args, named) => {
    const condition = orderedRuntimeAliasedArg(args, named, iffArgs, 0);
    return isRuntimeTruthy(condition)
      ? orderedRuntimeAliasedArg(args, named, iffArgs, 1)
      : orderedRuntimeAliasedArg(args, named, iffArgs, 2);
  });
  builtins.set('max_bars_back', (args, named) => {
    const value = orderedRuntimeAliasedArg(args, named, maxBarsBackArgs, 1);
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
      throwCompiledRuntimeError('max_bars_back num must be a non-negative integer');
    }
    if (value > 5000) {
      throwCompiledRuntimeError('max_bars_back num must be at most 5000');
    }
    return undefined;
  });
}

function registerCompiledTimeframeBuiltins(builtins: BuiltinRegistry, pineVersion: number): void {
  const timeframeArgs = [['timeframe']] as const;
  const secondsArgs = [['seconds']] as const;
  const timeframeToSeconds = (args: unknown[], named: Map<string, unknown>, ctx: ExecutionContext): number => {
    const rawTimeframe = orderedRuntimeAliasedArg(args, named, timeframeArgs, 0, ctx.timeframe.period);
    const timeframe = rawTimeframe === undefined || rawTimeframe === '' ? ctx.timeframe.period : toRuntimeString(rawTimeframe);
    const duration = getRuntimeTimeframeDurationMs(timeframe, ctx.timeframe.period);
    return duration === null ? Number.NaN : duration / 1000;
  };

  builtins.set('timeframe.in_seconds', timeframeToSeconds);
  builtins.set('timeframe.to_seconds', timeframeToSeconds);
  builtins.set('timeframe.from_seconds', (args, named) => {
    return runtimeTimeframeFromSeconds(toRuntimeNumber(orderedRuntimeAliasedArg(args, named, secondsArgs, 0)));
  });
  builtins.set('timeframe.change', (args, named, ctx) => {
    const rawTimeframe = orderedRuntimeAliasedArg(args, named, timeframeArgs, 0, ctx.timeframe.period);
    const timeframe = rawTimeframe === undefined || rawTimeframe === '' ? ctx.timeframe.period : toRuntimeString(rawTimeframe);
    const duration = getRuntimeTimeframeDurationMs(timeframe, ctx.timeframe.period);
    const currentTime = ctx.time.get(0);
    const previousTime = ctx.time.get(1);
    if (duration === null || currentTime === undefined || !Number.isFinite(currentTime)) return false;
    if (previousTime === undefined || !Number.isFinite(previousTime)) return pineVersion < 6;

    return getRuntimeTimeframeOpenTime(currentTime, timeframe, ctx.syminfo.timezone, ctx.timeframe.period)
      !== getRuntimeTimeframeOpenTime(previousTime, timeframe, ctx.syminfo.timezone, ctx.timeframe.period);
  });
}

function registerCompiledStringBuiltins(builtins: BuiltinRegistry): void {
  const stringSourceArgs = [['source', 'string']] as const;
  const stringPatternArgs = [['source', 'string'], ['str', 'substring', 'target']] as const;
  const stringSubstringArgs = [['source', 'string'], ['begin_pos'], ['end_pos']] as const;
  const stringMatchArgs = [['source', 'string'], ['regex', 'pattern']] as const;
  const stringRepeatArgs = [['source', 'string'], ['repeat', 'count', 'repeat_count'], ['separator']] as const;
  const stringSplitArgs = [['source', 'string'], ['separator']] as const;
  const stringReplaceArgs = [['source', 'string'], ['target', 'str', 'substring'], ['replacement'], ['occurrence']] as const;
  const stringReplaceAllArgs = [['source', 'string'], ['target', 'str', 'substring'], ['replacement']] as const;
  const sourceArg = (args: unknown[], named: Map<string, unknown>, index = 0) =>
    orderedRuntimeAliasedArg(args, named, stringSourceArgs, index);
  const patternArg = (args: unknown[], named: Map<string, unknown>, index = 1) =>
    orderedRuntimeAliasedArg(args, named, stringPatternArgs, index);

  builtins.set('str.tostring', (args, named, ctx) => {
    const names = [['value'], ['format']] as const;
    const value = orderedRuntimeAliasedArg(args, named, names, 0);
    const format = orderedRuntimeAliasedArg(args, named, names, 1);
    if (typeof value === 'number' && toRuntimeString(format).trim().toLowerCase() === 'mintick') {
      const mintick = ctx.syminfo.mintick;
      const quotient = value / mintick;
      const epsilon = Number.EPSILON * Math.max(1, Math.abs(quotient)) * 4;
      return (Math.round(quotient + epsilon) * mintick).toFixed(runtimeDecimalPlacesForTick(mintick));
    }
    return toRuntimeString(value, format === undefined ? '#.##########' : toRuntimeString(format));
  });
  builtins.set('str.tonumber', (args, named) => {
    const raw = toRuntimeString(orderedRuntimeAliasedArg(args, named, stringSourceArgs, 0));
    const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.exec(raw)?.[0];
    // JS $ can precede a final newline; require complete source consumption.
    const parsed = decimal === raw ? Number(raw) : Number.NaN;
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  });
  builtins.set('str.tointeger', (args, named) => {
    const raw = toRuntimeString(orderedRuntimeAliasedArg(args, named, stringSourceArgs, 0)).trim();
    const parsed = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw) ? Number(raw) : Number.NaN;
    return Number.isFinite(parsed) ? Math.trunc(parsed) : Number.NaN;
  });
  builtins.set('str.length', (args, named) => {
    const source = sourceArg(args, named);
    return isRuntimeNa(source) ? Number.NaN : toRuntimeString(source).length;
  });
  builtins.set('str.contains', (args, named) =>
    toRuntimeString(sourceArg(args, named)).includes(toRuntimeString(patternArg(args, named))));
  builtins.set('str.startswith', (args, named) =>
    toRuntimeString(sourceArg(args, named)).startsWith(toRuntimeString(patternArg(args, named))));
  builtins.set('str.endswith', (args, named) =>
    toRuntimeString(sourceArg(args, named)).endsWith(toRuntimeString(patternArg(args, named))));
  builtins.set('str.pos', (args, named) => {
    const index = toRuntimeString(sourceArg(args, named)).indexOf(toRuntimeString(patternArg(args, named)));
    return index === -1 ? Number.NaN : index;
  });
  builtins.set('str.substring', (args, named) => {
    const source = toRuntimeString(sourceArg(args, named));
    const beginArg = toRuntimeNumber(orderedRuntimeAliasedArg(args, named, stringSubstringArgs, 1, 0));
    const begin = Number.isNaN(beginArg) ? 0 : Math.trunc(beginArg);
    const endArg = orderedRuntimeAliasedArg(args, named, stringSubstringArgs, 2);
    const end = endArg === undefined ? undefined : Math.trunc(toRuntimeNumber(endArg));
    if (begin < 0 || begin > source.length) {
      throwCompiledRuntimeError(`str.substring begin_pos ${begin} is outside the source string`);
    }
    if (end !== undefined && end < begin) {
      throwCompiledRuntimeError(`str.substring end_pos ${end} is before begin_pos ${begin}`);
    }
    return source.substring(begin, end);
  });
  builtins.set('str.match', (args, named) => {
    const regex = toRuntimeString(orderedRuntimeAliasedArg(args, named, stringMatchArgs, 1));
    const inlineFlags = /^\(\?([ms]+)\)/.exec(regex);
    const expression = inlineFlags ? regex.slice(inlineFlags[0].length) : regex;
    const flags = inlineFlags ? [...new Set(inlineFlags[1])].join('') : '';
    return toRuntimeString(sourceArg(args, named)).match(new RegExp(expression, flags))?.[0] ?? '';
  });
  builtins.set('str.repeat', (args, named) => {
    const source = sourceArg(args, named);
    if (isRuntimeNa(source)) return Number.NaN;
    const repeat = Math.trunc(toRuntimeNumber(orderedRuntimeAliasedArg(args, named, stringRepeatArgs, 1)));
    if (Number.isFinite(repeat) && repeat < 0) throwCompiledRuntimeError(`Invalid value of the 'repeat' parameter '${repeat}' in the 'str.repeat' function. It must be >= 0.`);
    if (!Number.isFinite(repeat)) return Number.NaN;
    const separator = orderedRuntimeAliasedArg(args, named, stringRepeatArgs, 2, '');
    return Array.from({ length: repeat }, () => toRuntimeString(source)).join(toRuntimeString(separator));
  });
  builtins.set('str.split', (args, named) => {
    const array = createPineArray<string>();
    const separator = orderedRuntimeAliasedArg(args, named, stringSplitArgs, 1);
    const source = toRuntimeString(sourceArg(args, named));
    array.values.push(...(source === '' ? [''] : source.split(toRuntimeString(separator))));
    return array;
  });
  builtins.set('str.upper', (args, named) => toRuntimeString(sourceArg(args, named)).toUpperCase());
  builtins.set('str.lower', (args, named) => toRuntimeString(sourceArg(args, named)).toLowerCase());
  builtins.set('str.trim', (args, named) => {
    const source = sourceArg(args, named);
    return isRuntimeNa(source) ? '' : toRuntimeString(source).trim();
  });
  builtins.set('str.replace', (args, named) =>
    replaceRuntimeStringOccurrence(
      toRuntimeString(sourceArg(args, named)),
      toRuntimeString(patternArg(args, named)),
      toRuntimeString(orderedRuntimeAliasedArg(args, named, stringReplaceArgs, 2)),
      orderedRuntimeAliasedArg(args, named, stringReplaceArgs, 3),
    ));
  builtins.set('str.replace_all', (args, named) => {
    const source = toRuntimeString(sourceArg(args, named));
    const target = toRuntimeString(patternArg(args, named));
    const replacement = toRuntimeString(orderedRuntimeAliasedArg(args, named, stringReplaceAllArgs, 2));
    return source.replaceAll(target, () => replacement);
  });
}

class EmptyNamedArguments extends Map<string, unknown> {
  override set(): this {
    throw new Error('Empty named arguments are immutable');
  }

  override delete(): boolean {
    throw new Error('Empty named arguments are immutable');
  }

  override clear(): void {
    throw new Error('Empty named arguments are immutable');
  }
}

const EMPTY_NAMED_ARGUMENTS = new EmptyNamedArguments();

function namedRecordToMap(named?: Record<string, unknown>): Map<string, unknown> {
  if (named === undefined || Object.keys(named).length === 0) return EMPTY_NAMED_ARGUMENTS;
  const values = new Map<string, unknown>();
  if (named) {
    for (const name of Object.keys(named)) values.set(name, named[name]);
  }
  return values;
}

function orderedRuntimeAliasedArg(
  args: unknown[],
  named: Map<string, unknown>,
  namesByIndex: readonly (readonly string[])[],
  index: number,
  fallback?: unknown,
): unknown {
  const names = namesByIndex[index] ?? [];
  let match: string | undefined;
  for (const name of names) {
    if (!named.has(name)) continue;
    if (match !== undefined) {
      const matches = names.filter((alias) => named.has(alias));
      throw new Error(`Argument ${names.join('/')} was supplied multiple times: ${matches.join(', ')}`);
    }
    match = name;
  }
  if (match !== undefined) return named.get(match);

  let positionalIndex = index;
  for (let priorIndex = 0; priorIndex < Math.min(index, namesByIndex.length); priorIndex += 1) {
    for (const name of namesByIndex[priorIndex]) {
      if (named.has(name)) {
        positionalIndex -= 1;
        break;
      }
    }
  }
  return args[positionalIndex] !== undefined ? args[positionalIndex] : fallback;
}

function orderedRuntimeArg(
  args: unknown[],
  named: Record<string, unknown> | undefined,
  names: readonly string[],
  index: number,
  fallback?: unknown,
): unknown {
  const key = names[index];
  if (key && named && Object.prototype.hasOwnProperty.call(named, key)) return named[key];
  let namedBefore = 0;
  if (named) {
    for (let position = 0; position < index; position += 1) {
      const priorKey = names[position];
      if (priorKey && Object.prototype.hasOwnProperty.call(named, priorKey)) namedBefore += 1;
    }
  }
  const positionalIndex = index - namedBefore;
  return args[positionalIndex] !== undefined ? args[positionalIndex] : fallback;
}

function normalizeRuntimeInputDisplay(value: unknown): unknown {
  if (typeof value === 'string' && value.startsWith('display.')) return normalizeRuntimeInputDisplay(value.slice('display.'.length));
  if (value === 'none') return 0;
  if (value === 'pane') return 1;
  if (value === 'data_window') return 2;
  if (value === 'status_line') return 4;
  if (value === 'price_scale') return 8;
  if (value === 'pine_screener') return 16;
  if (value === 'all') return 31;
  return value;
}

function toOptionalDisplay(value: unknown): number | undefined {
  return toOptionalNumber(normalizeRuntimeInputDisplay(value));
}

function defaultRuntimeInputDisplay(type: InputDefinition['type'] | undefined): unknown {
  return type === 'bool' || type === 'color' || type === 'time' || type === 'text_area'
    ? 'display.none'
    : 'display.all';
}

function normalizeRuntimeInputType(value: unknown): InputDefinition['type'] | undefined {
  if (typeof value !== 'string') return undefined;
  if (value === 'integer' || value === 'int') return 'int';
  if (value === 'resolution' || value === 'timeframe') return 'timeframe';
  if (
    value === 'float'
    || value === 'bool'
    || value === 'string'
    || value === 'source'
    || value === 'color'
    || value === 'price'
    || value === 'time'
    || value === 'symbol'
    || value === 'session'
    || value === 'text_area'
    || value === 'enum'
  ) {
    return value;
  }
  return undefined;
}

function inferRuntimeInputType(value: unknown): InputDefinition['type'] {
  if (typeof value === 'number') return Number.isInteger(value) ? 'int' : 'float';
  if (typeof value === 'boolean') return 'bool';
  if (typeof value === 'string') return 'string';
  return 'source';
}

function validateCompiledInputDefault(
  type: InputDefinition['type'],
  defval: unknown,
  metadata: Partial<InputDefinition>,
): void {
  if ((type === 'int' || type === 'float' || type === 'price' || type === 'time') && typeof defval !== 'number') {
    throwCompiledRuntimeError(`input.${type} defval must be a number`);
  }
  if (type === 'int' && !Number.isInteger(defval)) {
    throwCompiledRuntimeError('input.int defval must be an integer');
  }
  if (type === 'bool' && typeof defval !== 'boolean') {
    throwCompiledRuntimeError('input.bool defval must be a boolean');
  }
  if (
    (type === 'string' || type === 'timeframe' || type === 'symbol' || type === 'session' || type === 'text_area' || type === 'enum')
    && typeof defval !== 'string'
  ) {
    throwCompiledRuntimeError(`input.${type} defval must be a string`);
  }
  if (typeof defval === 'number' && typeof metadata.minval === 'number' && defval < metadata.minval) {
    throwCompiledRuntimeError(`input.${type} defval must be greater than or equal to minval`);
  }
  if (typeof defval === 'number' && typeof metadata.maxval === 'number' && defval > metadata.maxval) {
    throwCompiledRuntimeError(`input.${type} defval must be less than or equal to maxval`);
  }
  if (metadata.options !== undefined && !metadata.options.some((option) => Object.is(option, defval))) {
    throwCompiledRuntimeError(`input.${type} defval must be one of options`);
  }
}

function isRuntimeTruthy(value: unknown): boolean {
  if (isRuntimeNa(value)) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value.length > 0;
  return !!value;
}

function normalizeAlertFrequency(value: unknown): 'all' | 'once_per_bar' | 'once_per_bar_close' {
  if (value === 'all' || value === 'once_per_bar' || value === 'once_per_bar_close') return value;
  return 'once_per_bar';
}

function formatRuntimeLogMessage(rawMessage: unknown, args: unknown[]): string {
  if (args.length === 0) return toRuntimeString(rawMessage ?? '');
  return formatRuntimeString([rawMessage ?? '', ...args], undefined, true);
}

function renderRuntimeAlertConditionMessage(message: string, ctx: ExecutionContext): string {
  return message.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (placeholder, rawName: string) => {
    const value = resolveRuntimeAlertPlaceholder(rawName.trim(), ctx);
    return value === undefined ? placeholder : toRuntimeString(value);
  });
}

function resolveRuntimeAlertPlaceholder(name: string, ctx: ExecutionContext): unknown {
  switch (name) {
    case 'open':
      return ctx.open.get(0);
    case 'high':
      return ctx.high.get(0);
    case 'low':
      return ctx.low.get(0);
    case 'close':
      return ctx.close.get(0);
    case 'volume':
      return ctx.volume.get(0);
    case 'bid':
      return ctx.bid.get(0);
    case 'ask':
      return ctx.ask.get(0);
    case 'ticker':
      return ctx.syminfo.ticker;
    case 'exchange': {
      const ticker = toRuntimeString(ctx.syminfo.ticker ?? '');
      return ticker.includes(':') ? ticker.split(':')[0] : '';
    }
    case 'interval':
      return ctx.timeframe.period;
    default:
      return resolveRuntimeAlertPlotPlaceholder(name, ctx);
  }
}

function resolveRuntimeAlertPlotPlaceholder(name: string, ctx: ExecutionContext): unknown {
  const indexMatch = /^plot_(\d+)$/.exec(name);
  if (indexMatch) {
    const index = Number(indexMatch[1]);
    const plot = ctx.getPlots().filter((output) => output.type === 'plot')[index];
    return plot?.values[ctx.bar_index];
  }

  const titleMatch = /^plot\("(.+)"\)$/.exec(name);
  if (titleMatch) {
    const title = titleMatch[1];
    const plot = ctx.getPlots().find((output) => output.type === 'plot' && output.title === title);
    return plot?.values[ctx.bar_index];
  }

  return undefined;
}

function plotArg(
  value: unknown,
  named: Record<string, unknown>,
  extraArgs: unknown[],
  names: readonly string[],
  name: string,
  fallback?: unknown,
): unknown {
  if (Object.prototype.hasOwnProperty.call(named, name)) return named[name];
  const index = names.indexOf(name);
  if (index < 0) return fallback;
  if (index === 0) return value ?? fallback;
  const precedingNamed = names.slice(1, index).filter((param) => Object.prototype.hasOwnProperty.call(named, param)).length;
  return extraArgs[index - 1 - precedingNamed] ?? fallback;
}

function toPlotColor(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return null;
  if (value === 'none') return null;
  if (value.charCodeAt(0) === 35) return value;
  return pineColorConstant(value) ?? value;
}

function resolveRuntimeInputSource(value: unknown, ctx: ExecutionContext): unknown {
  if (value && typeof value === 'object' && 'type' in value && value.type === 'plot-source' && 'values' in value && Array.isArray(value.values)) {
    return value.values[ctx.bar_index] ?? Number.NaN;
  }
  if (typeof value !== 'string') return value;
  switch (value) {
    case 'open': return ctx.open.get(0);
    case 'high': return ctx.high.get(0);
    case 'low': return ctx.low.get(0);
    case 'close': return ctx.close.get(0);
    case 'bid': return ctx.bid.get(0);
    case 'ask': return ctx.ask.get(0);
    case 'hl2': return ctx.hl2;
    case 'hlc3': return ctx.hlc3;
    case 'ohlc4': return ctx.ohlc4;
    case 'hlcc4': return ctx.hlcc4;
    default: {
      const plot = ctx.getPlots().find((candidate) =>
        candidate.type === 'plot'
        && (candidate.id === value || candidate.title === value)
      );
      return plot ? plot.values[ctx.bar_index] : value;
    }
  }
}

function applyPlotTransparency(color: string | null, transparency: unknown): string | null {
  if (color === null || typeof transparency !== 'number' || !Number.isFinite(transparency)) return color;
  const alpha = Math.round(255 * (100 - Math.min(100, Math.max(0, transparency))) / 100);
  const alphaHex = alpha.toString(16).padStart(2, '0').toUpperCase();
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return `${color}${alphaHex}`;
  // An alpha-bearing color takes precedence over the deprecated transp argument.
  if (/^#[0-9a-fA-F]{8}$/.test(color)) return color;
  return color;
}

function toPlotValue(value: unknown): number | null {
  if (typeof value === 'boolean') return value as unknown as number;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toNumericPlotValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toInputOptions(value: unknown): unknown[] | undefined {
  if (Array.isArray(value)) return value;
  if (isPineArray(value)) return value.values;
  return undefined;
}

function toMarkerValue(value: unknown, location: PlotOutput['location']): number | null {
  if (typeof value === 'boolean') return value ? 1 : null;
  if (typeof value === 'number') return Number.isFinite(value) && (location === 'absolute' || value !== 0) ? value : null;
  return null;
}

function ensureColorArray(plot: PlotOutput | undefined): (string | null)[] | null {
  if (!plot) return null;
  if (!Array.isArray(plot.color)) plot.color = [];
  return plot.color;
}

function setPlotArrayValueAtBar<T>(values: T[] | undefined, barIndex: number, plotValue: T): void {
  if (!values) return;
  while (values.length < barIndex) values.push(null as T);
  values[barIndex] = plotValue;
}

function setPlotTextColorValue(plot: PlotOutput | undefined, barIndex: number, color: string | null): void {
  if (!plot || barIndex < 0) return;

  if (Array.isArray(plot.textColor)) {
    while (plot.textColor.length < barIndex) plot.textColor.push(null);
    plot.textColor[barIndex] = color;
    return;
  }

  if (plot.textColor === color) return;

  const previousColor = plot.textColor ?? null;
  if (barIndex === 0) {
    plot.textColor = color ?? [];
    if (Array.isArray(plot.textColor)) plot.textColor[0] = null;
    return;
  }

  plot.textColor = Array.from({ length: barIndex }, () => previousColor);
  plot.textColor[barIndex] = color;
}

function setPlotTextValue(plot: PlotOutput | undefined, barIndex: number, text: string | null): void {
  if (!plot || barIndex < 0) return;
  if (!Array.isArray(plot.textValues)) plot.textValues = [];
  while (plot.textValues.length < barIndex) plot.textValues.push(null);
  plot.textValues[barIndex] = text;
}

function applyCompiledChartFallbacks(ctx: ExecutionContext, bars: Bar[]): void {
  ctx.chart = {
    ...ctx.chart,
    leftVisibleBarTime: ctx.chart.leftVisibleBarTime ?? bars[0]?.time ?? Number.NaN,
    rightVisibleBarTime: ctx.chart.rightVisibleBarTime ?? bars[bars.length - 1]?.time ?? Number.NaN,
  };
}

type RequestedPointSeriesResolver = (
  name: string,
  args: unknown[],
  named: Record<string, unknown> | undefined,
  time: number,
  previousTime: number | undefined,
) => unknown;

type RequestedDatasetResolver = (query: RequestDatafeedQuery) => ReturnType<RequestDatafeed['getBars']>;

function createRequestedDatasetResolver(feed: RequestDatafeed, isRealtime: () => boolean): RequestedDatasetResolver {
  const datasets = new Map<string, ReturnType<RequestDatafeed['getBars']>>();
  return (query) => {
    if (isRealtime()) return feed.getBars(query);
    const key = JSON.stringify([query.symbol, query.timeframe, query.currency, query.calcBarsCount]);
    const cached = datasets.get(key);
    if (cached) return cached;
    const result = feed.getBars(query);
    if (result.ok) datasets.set(key, result);
    return result;
  };
}

interface RequestedRealtimePhase {
  startTime: number;
  chartTime: number;
  chartCloseTime: number;
  isConfirmed: boolean;
  isNew: boolean;
  previousIsNew: boolean;
}

function evaluateSecuritySeries(
  secScript: CompiledSecurityScript,
  requestContext: RequestDataContext,
  outerSyminfo: ExecutionContext['syminfo'],
  mainTimeframePeriod: string,
  runtimeOptions: TealscriptRuntimeOptions | undefined,
  maxBarsBack: number,
  captures?: Record<string, unknown>,
  recordSwallowedError?: (barIndex: number, error: unknown) => void,
  requestDatafeed?: RequestDatafeed,
  securityScripts?: Map<number, CompiledSecurityScript>,
  securitySites?: SecurityCallSite[],
  dynamicRequestsEnabled = true,
  pineVersion = 6,
  parentHistory?: HistoryBufferSizing,
  resolveRequestedPointSeries?: RequestedPointSeriesResolver,
  trackFootprintRequest?: (key: string) => void,
  recordCapture?: (name: string) => void,
  resolveRequestDataset?: RequestedDatasetResolver,
  registerProgress?: (advance: (count: number) => void) => void,
  realtimePhase?: RequestedRealtimePhase,
): unknown[] {
  const history = new HistoryBufferSizing(parentHistory?.minimum, parentHistory?.hardLimit);
  if (parentHistory) valueAtTimeHistoryPeriodCaches.set(history, valueAtTimePeriodCache(parentHistory));
  const create = () => evaluateSecuritySeriesPass(
    history, secScript, requestContext, outerSyminfo, mainTimeframePeriod, runtimeOptions, maxBarsBack, captures, recordSwallowedError, requestDatafeed, securityScripts, securitySites, dynamicRequestsEnabled, pineVersion, resolveRequestedPointSeries, trackFootprintRequest, recordCapture, resolveRequestDataset,
    realtimePhase,
  );
  let cursor: ReturnType<typeof create> | undefined;
  const values: unknown[] = [];
  const advance = (count: number): void => {
    history.run(() => {
      if (values.length < Math.min(count, requestContext.bars.length)) {
        cursor ??= create();
        const isSettled = cursor.isSettled;
        if (isSettled) {
          while (values.length < Math.min(count, requestContext.bars.length)) {
            const value = cursor(values.length);
            values.push(value);
            if (isSettled()) {
              const start = values.length;
              values.length = Math.min(count, requestContext.bars.length);
              values.fill(value, start);
            }
          }
        } else {
          while (values.length < Math.min(count, requestContext.bars.length)) {
            values.push(cursor(values.length));
          }
        }
      }
    }, () => {
      values.length = 0;
      cursor = undefined;
    });
  };
  if (registerProgress) registerProgress(advance);
  else advance(requestContext.bars.length);
  return values;
}

function evaluateSecuritySeriesPass(
  history: HistoryBufferSizing,
  secScript: CompiledSecurityScript,
  requestContext: RequestDataContext,
  outerSyminfo: ExecutionContext['syminfo'],
  mainTimeframePeriod: string,
  runtimeOptions: TealscriptRuntimeOptions | undefined,
  maxBarsBack: number,
  captures?: Record<string, unknown>,
  recordSwallowedError?: (barIndex: number, error: unknown) => void,
  requestDatafeed?: RequestDatafeed,
  securityScripts?: Map<number, CompiledSecurityScript>,
  securitySites?: SecurityCallSite[],
  dynamicRequestsEnabled = true,
  pineVersion = 6,
  resolveRequestedPointSeries?: RequestedPointSeriesResolver,
  trackFootprintRequest?: (key: string) => void,
  recordCapture?: (name: string) => void,
  resolveRequestDataset?: RequestedDatasetResolver,
  realtimePhase?: RequestedRealtimePhase,
): ((index: number) => unknown) & { isSettled?: () => boolean } {
  const deps = {
    constIntDivide: divideV5ConstInts,
    ...history.dependencies(maxBarsBack, () => false), maxBarsBack,
    _arr: ARRAY_HELPERS, _map: MAP_HELPERS, _udt: UDT_HELPERS, _mtx: MATRIX_HELPERS,
    ...ta,
  };
  securityScripts = secScript.securityScripts ?? securityScripts;
  securitySites = secScript.securitySites ?? securitySites;
  const inst = new secScript.ScriptClass(deps);
  let lastPlotValue: unknown = NaN;
  const requestBars = requestContext.bars;
  const realtimeCloseTimes = realtimePhase ? requestBarCloseTimes(requestContext) : undefined;
  const requestTimeframe = {
    ...runtimeTimeframeInfo(requestContext.timeframe, requestContext.timeframe, pineVersion),
    main_period: mainTimeframePeriod,
  };
  const builtinCtx = new ExecutionContext();
  valueAtTimeContextPeriodCaches.set(builtinCtx, valueAtTimePeriodCache(history));
  const requestSyminfo = {
    ...builtinCtx.syminfo,
    ...requestContext.syminfo,
    ticker: requestContext.syminfo?.ticker ?? requestContext.symbol,
    tickerid: requestContext.syminfo?.tickerid ?? requestContext.symbol,
    main_tickerid: outerSyminfo.tickerid ?? outerSyminfo.ticker ?? '',
    currency: requestContext.currency ?? requestContext.syminfo?.currency ?? outerSyminfo.currency,
    mintick: requestContext.syminfo?.mintick ?? outerSyminfo.mintick ?? 0.01,
    pricescale: requestContext.syminfo?.pricescale ?? outerSyminfo.pricescale ?? 100,
  };
  const requestRuntimeOptions: TealscriptRuntimeOptions = {
    ...runtimeOptions,
    session: {
      ...runtimeOptions?.session,
      ...requestContext.session,
    },
  };
  const builtinRegistry = createCompiledBuiltinRegistry(pineVersion);
  const lineY1Reader = builtinRegistry.get('line.get_y1')!.positionalSingleArgument!;
  const labelTextReader = builtinRegistry.get('label.get_text')!.positionalSingleArgument!;
  const drawingReaders = Object.fromEntries([...POSITIONAL_DRAWING_GETTERS].map(name => [name, builtinRegistry.get(name)!.positionalSingleArgument!]));
  const builtinScope = new Scope();
  builtinCtx.syminfo = requestSyminfo as ExecutionContext['syminfo'];
  builtinCtx.timeframe = requestTimeframe as ExecutionContext['timeframe'];
  builtinCtx.chart = mergeChartInfo(builtinCtx.chart, runtimeOptions?.chart);
  builtinCtx.loadBars(requestBars);
  applyCompiledChartFallbacks(builtinCtx, requestBars);
  const securityCache = new Map<string, CachedSecuritySeries>();
  const resolveRequestCalcBars = createRequestCalcBarsResolver(securitySites);
  const mathEvaluators = new Map<string, CachedRuntimeMathEvaluator>();
  let literalTimestamps: LiteralTimestampCache | undefined;
  const mathHistories = new Map<string, RollingSumState>();
  const mathRandomStates = new Map<string, RuntimeRandomState>();
  const requestMintick = requestSyminfo.mintick;
  const capturedSourceSeries = new Map<string, unknown[]>();
  const capturedInputDefaults = new Map<string, number>();
  const capturedInputSources = new Map<string, string>();
  for (const [name, capture] of Object.entries(captures ?? {})) {
    const source = isRuntimeCaptureDescriptor(capture) ? capture.source : undefined;
    if (!isRuntimeExpressionSource(source)) continue;
    recordCapture?.(name);
    if (source.script.inputSourceName !== undefined && Object.keys(source.captures ?? {}).length === 0) {
      capturedInputSources.set(name, source.script.inputSourceName);
      continue;
    }
    if (source.script.constantInputValue !== undefined && Object.keys(source.captures ?? {}).length === 0) {
      capturedInputDefaults.set(name, source.script.constantInputValue);
      continue;
    }
    capturedSourceSeries.set(name, evaluateSecuritySeries(
      source.script, requestContext, outerSyminfo, mainTimeframePeriod, runtimeOptions, maxBarsBack,
      source.captures, recordSwallowedError, requestDatafeed, undefined, undefined,
      dynamicRequestsEnabled, pineVersion, history, resolveRequestedPointSeries, trackFootprintRequest, recordCapture, resolveRequestDataset,
      undefined,
      realtimePhase,
    ));
  }
  const fixedProgram = secScript.fixedEmaProgram;
  const fixedInputs = fixedProgram?.captures.every(name => {
    if (capturedInputDefaults.has(name)) return true;
    const capture = captures?.[name];
    return typeof capture === 'number' || (isRuntimeCaptureDescriptor(capture) && capture.source === undefined && typeof capture.value === 'number');
  }) ?? false;
  let previousFixedState: unknown[] | undefined;
  let previousFixedOutput: unknown;
  let fixedSettled = false;
  const fixedState = (): unknown[] | undefined => {
    const state = inst as unknown as Record<string, unknown>;
    const instances = new Set(Object.values(state).filter(value => value instanceof ta.EMA));
    const dynamic = state._dynamicTACache as Map<string, { instance: unknown }> | undefined;
    for (const entry of dynamic?.values() ?? []) if (entry.instance instanceof ta.EMA) instances.add(entry.instance);
    if (instances.size !== fixedProgram?.count) return undefined;
    return [...instances].flatMap(instance => Object.values((instance as ta.EMA).save()));
  };
  const capturedValue = (name: string, requestBar: Bar, index: number): unknown =>
    capturedInputDefaults.has(name) ? capturedInputDefaults.get(name)
      : capturedInputSources.has(name) ? requestSourceValueFromBar(requestBar, capturedInputSources.get(name)!)
      : capturedSourceSeries.has(name) ? capturedSourceSeries.get(name)![index] : resolveRuntimeCaptureValue(captures?.[name], requestBar);
  const seedCapturedSeriesParams = (requestBar: Bar, requestBarIndex: number): void => {
    for (const name of Object.keys(captures ?? {})) {
      const series = (inst as unknown as Record<string, unknown>)[`_sv_${name}`] as ValueSeries | undefined;
      if (!series || typeof series.push !== 'function' || typeof series.update !== 'function') continue;
      const barKey = `_sv_bar_${name}`;
      const state = inst as unknown as Record<string, unknown>;
      recordCapture?.(name);
      const value = capturedValue(name, requestBar, requestBarIndex);
      if (state[barKey] !== requestBarIndex) {
        series.push(value);
        state[barKey] = requestBarIndex;
      } else {
        series.update(value);
      }
    }
  };
  const requestDisabledByDynamicRequests = (secId: number, name: string): boolean => {
    if (dynamicRequestsEnabled) return false;
    const reason = securitySites?.[secId]?.requiresDynamicRequestsReason;
    if (!reason) return false;
    throw new CompiledRuntimeErrorException(reason === 'nested-request'
      ? `Nested request.* calls require dynamic_requests=true: ${name}`
      : `request.* calls in local scopes require dynamic_requests=true: ${name}`);
  };

  let i = 0;
  let b = requestBars[0];
  const syncBuiltinContext = () => {
    while (builtinCtx.bar_index < i) builtinCtx.advanceBar();
  };
  const secBarCtx = {
    bar: { open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume, time: b.time },
    barIndex: i,
    lastBarIndex: requestBars.length - 1,
    isFirstTick: true,
    barstate: { isfirst: i === 0, islast: i === requestBars.length - 1, ishistory: true, isrealtime: false, isnew: true, isconfirmed: true, islastconfirmedhistory: i === requestBars.length - 1 },
    syminfo: requestSyminfo,
    timeframe: requestTimeframe,
    chart: builtinCtx.chart as unknown as Record<string, unknown>,
    plot(_index: number, _funcName: string, _funcCallIndex: number, value: unknown) {
      lastPlotValue = value;
    },
    input(_id: string, _fn: string, defval: unknown, named?: Record<string, unknown>) {
      return Object.prototype.hasOwnProperty.call(named ?? {}, 'defval') ? named?.defval : defval;
    },
    strategyEntry() {}, strategyExit() {}, strategyClose() {}, strategyCloseAll() {},
    strategyCancel() {}, strategyCancelAll() {}, strategyOrder() {},
    strategyDefaultEntryQty() { return 0; },
    strategyConvertToAccount() { return NaN; },
    strategyConvertToSymbol() { return NaN; },
    strategyProp() { return 0; },
    strategyPropHistory() { return NaN; },
    strategyTradeProp() { return NaN; },
    strategyRisk() { return undefined; },
    requestSecurity(secId: number, symbol: unknown, timeframe: unknown, gaps: unknown, lookahead: unknown, ignoreInvalidSymbol: unknown, currency: unknown, calcBarsCount: unknown, sourceDescriptor?: unknown, nestedCaptures?: Record<string, unknown>, requestName: 'request.security' | 'request.seed' = 'request.security'): unknown {
      if (requestDisabledByDynamicRequests(secId, requestName)) return NaN;
      if (!requestDatafeed) throw new CompiledRuntimeErrorException(`${requestName} requires a request datafeed`);
      const symStr = String(symbol ?? '').trim() || (requestName === 'request.security' ? String(builtinCtx.syminfo.tickerid ?? builtinCtx.syminfo.ticker ?? '') : '');
      const tfStr = normalizeRuntimeTimeframePeriod(String(timeframe ?? ''), String(builtinCtx.timeframe.period ?? ''));
      const currencyStr = normalizeRuntimeRequestCurrency(currency);
      const sourceKey = runtimeSourceDescriptorKey(sourceDescriptor);
      const capturesKey = runtimeCapturesKey(nestedCaptures);
      const calcBars = resolveRequestCalcBars(secId, symStr, tfStr, currencyStr, sourceKey, capturesKey, normalizeRuntimePositiveInteger(calcBarsCount));
      const cacheKey = `${requestName === 'request.seed' ? 'seed' : 'security'}:${secId}:${symStr}:${tfStr}:${currencyStr ?? ''}:${calcBars ?? ''}:${sourceKey}:${capturesKey}`;
      let cached = securityCache.get(cacheKey);
      if (!cached) {
        const result = resolveRequestDataset!({ symbol: symStr, timeframe: tfStr, currency: currencyStr, calcBarsCount: calcBars });
        if (!result.ok) {
          if (isRuntimeTruthy(ignoreInvalidSymbol) && isInvalidOrUnavailableRequestContext(result.code)) return NaN;
          throw new CompiledRuntimeErrorException(`${requestName} failed: ${result.message}`);
        }
        const nestedScript = securityScripts?.get(secId);
        const nestedValues = nestedScript
          ? evaluateSecuritySeries(
            nestedScript,
            result.context,
            builtinCtx.syminfo,
            mainTimeframePeriod,
            runtimeOptions,
            maxBarsBack,
            nestedCaptures,
            recordSwallowedError,
            requestDatafeed,
            securityScripts,
            securitySites,
            dynamicRequestsEnabled,
            pineVersion,
            history,
            resolveRequestedPointSeries,
            trackFootprintRequest,
            recordCapture,
            resolveRequestDataset,
            undefined,
            realtimePhase,
          )
          : evaluateRequestedSourceSeries(result.context, sourceDescriptor);
        cached = createScalarSecuritySeriesCache(result.context, nestedValues ?? []);
        securityCache.set(cacheKey, cached);
      }
      if (requestName === 'request.seed') {
        return mergeRequestedValue(cached.bars, cached.values, b.time, requestBars[i - 1]?.time, 'barmerge.gaps_off', 'barmerge.lookahead_off', false);
      }
      return mergeRequestedValue(
        cached.bars,
        cached.values,
        b.time,
        requestBars[i - 1]?.time,
        normalizeRuntimeRequestGapsMode(gaps, pineVersion),
        normalizeRuntimeRequestLookaheadMode(lookahead, pineVersion),
        false,
        isRuntimeLowerTimeframe(tfStr, String(builtinCtx.timeframe.period ?? ''))
          ? getRuntimeTimeframeDurationMs(requestContext.timeframe, requestContext.timeframe) ?? undefined
          : undefined,
        isRuntimeSameTimeframe(tfStr, String(builtinCtx.timeframe.period ?? '')),
        normalizeRuntimeRequestLookaheadMode(lookahead, pineVersion) === 'barmerge.lookahead_on' ||
        isRuntimeLowerTimeframe(tfStr, String(builtinCtx.timeframe.period ?? '')) ? undefined : {
          closeTimes: cached.closeTimes!,
          chartCloseTime: getRuntimeTimeValue(builtinCtx, requestBars, 'time_close'),
          previousChartCloseTime: i > 0 ? getRuntimeTimeValue(builtinCtx, requestBars, 'time_close', 1) : undefined,
        },
        false,
        cached,
      );
    },
    requestSecurityLowerTf(secId: number, symbol: unknown, timeframe: unknown, ignoreInvalidSymbol: unknown, currency: unknown, ignoreInvalidTimeframe: unknown, calcBarsCount: unknown, sourceDescriptor?: unknown, nestedCaptures?: Record<string, unknown>, tupleArity?: number) {
      if (requestDisabledByDynamicRequests(secId, 'request.security_lower_tf')) return createLowerTimeframeEmptyResult(tupleArity);
      const symStr = String(symbol ?? '').trim() || String(builtinCtx.syminfo.tickerid ?? builtinCtx.syminfo.ticker ?? '');
      const tfStr = normalizeRuntimeTimeframePeriod(String(timeframe ?? ''), String(builtinCtx.timeframe.period ?? ''));
      const chartDuration = getRuntimeTimeframeDurationMs(String(builtinCtx.timeframe.period ?? ''), String(builtinCtx.timeframe.period ?? ''));
      if ((!isRuntimeLowerTimeframe(tfStr, String(builtinCtx.timeframe.period ?? ''))
        && !isRuntimeSameTimeframe(tfStr, String(builtinCtx.timeframe.period ?? ''))) || chartDuration === null) {
        if (isRuntimeTruthy(ignoreInvalidTimeframe)) return NaN;
        throw new CompiledRuntimeErrorException(`request.security_lower_tf requires a lower timeframe than the chart timeframe: ${tfStr}`);
      }
      if (!requestDatafeed) throw new CompiledRuntimeErrorException('request.security_lower_tf requires a request datafeed');
      const currencyStr = normalizeRuntimeRequestCurrency(currency);
      const sourceKey = runtimeSourceDescriptorKey(sourceDescriptor);
      const capturesKey = runtimeCapturesKey(nestedCaptures);
      const calcBars = resolveRequestCalcBars(secId, symStr, tfStr, currencyStr, sourceKey, capturesKey, normalizeRuntimePositiveInteger(calcBarsCount));
      const cacheKey = `lower:${secId}:${symStr}:${tfStr}:${currencyStr ?? ''}:${calcBars ?? ''}:${sourceKey}:${capturesKey}`;
      let cached = securityCache.get(cacheKey);
      if (!cached) {
        const result = resolveRequestDataset!({ symbol: symStr, timeframe: tfStr, currency: currencyStr, calcBarsCount: calcBars });
        if (!result.ok) {
          if (isRuntimeTruthy(ignoreInvalidSymbol) && isInvalidOrUnavailableRequestContext(result.code)) return NaN;
          if (isRuntimeTruthy(ignoreInvalidTimeframe) && result.code === 'invalid_timeframe') return NaN;
          throw new CompiledRuntimeErrorException(`request.security_lower_tf failed: ${result.message}`);
        }
        const nestedScript = securityScripts?.get(secId);
        const nestedValues = nestedScript
          ? evaluateSecuritySeries(
            nestedScript,
            result.context,
            builtinCtx.syminfo,
            mainTimeframePeriod,
            runtimeOptions,
            maxBarsBack,
            nestedCaptures,
            recordSwallowedError,
            requestDatafeed,
            securityScripts,
            securitySites,
            dynamicRequestsEnabled,
            pineVersion,
            history,
            resolveRequestedPointSeries,
            trackFootprintRequest,
            recordCapture,
            resolveRequestDataset,
            undefined,
            realtimePhase,
          )
          : evaluateRequestedSourceSeries(result.context, sourceDescriptor);
        cached = { bars: result.context.bars, values: nestedValues ?? [] };
        securityCache.set(cacheKey, cached);
      }
      const chartEnd = requestBars[i + 1]?.time ?? b.time + chartDuration;
      return collectLowerTimeframeValues(cached.bars, cached.values, b.time, chartEnd, tupleArity, cached);
    },
    requestCurrencyRate(args: unknown[], named?: Record<string, unknown>) {
      return resolveRequestedPointSeries?.('request.currency_rate', args, named, b.time, requestBars[i - 1]?.time) ?? NaN;
    },
    requestPointSeries(name: string, args: unknown[], named?: Record<string, unknown>) {
      if (name === 'request.quandl') return unavailableQuandlRequest(requestPointSeriesSpec(name, args, named));
      return resolveRequestedPointSeries?.(name, args, named, b.time, requestBars[i - 1]?.time) ?? NaN;
    },
    requestFootprint(args: unknown[], named?: Record<string, unknown>): unknown {
      const names = ['ticks_per_row', 'va_percent', 'imbalance_percent'] as const;
      const ticksPerRow = Math.trunc(toRuntimeNumber(orderedRuntimeArg(args, named, names, 0)));
      const valueAreaPercent = toRuntimeNumber(orderedRuntimeArg(args, named, names, 1, 70));
      const imbalancePercent = toRuntimeNumber(orderedRuntimeArg(args, named, names, 2, 300));
      if (!Number.isFinite(ticksPerRow) || ticksPerRow <= 0 || !Number.isFinite(valueAreaPercent) || !Number.isFinite(imbalancePercent)) {
        return NaN;
      }
      trackFootprintRequest?.(footprintRequestKey(requestContext.symbol, requestContext.timeframe, ticksPerRow, valueAreaPercent, imbalancePercent));
      return requestDatafeed?.getFootprint?.({
        symbol: requestContext.symbol,
        timeframe: requestContext.timeframe,
        ticksPerRow,
        valueAreaPercent,
        imbalancePercent,
        time: b.time,
      }) ?? NaN;
    },
    requestSeed(secId: number, source: unknown, symbol: unknown, ignoreInvalidSymbol: unknown, calcBarsCount: unknown, sourceDescriptor?: unknown, captures?: Record<string, unknown>): unknown {
      const requestSymbol = seedRequestSymbol(toRuntimeString(source).trim(), toRuntimeString(symbol).trim());
      return secBarCtx.requestSecurity(secId, requestSymbol, requestContext.timeframe, 'barmerge.gaps_off', 'barmerge.lookahead_off', ignoreInvalidSymbol, undefined, calcBarsCount, sourceDescriptor, captures, 'request.seed');
    },
    alert() {}, alertCondition() { return NaN; }, logInfo() {}, logWarning() {}, logError() {},
    drawingCount() { return 0; },
    markDrawingsPersistentFrom() {},
    markPersistentRuntimeValue() {},
    markPersistentArrayDrawing() {},
    markPersistentUdtField() {},
    arrayPush(array: PineArray, value: unknown) { return ARRAY_HELPERS.push(array, value); },
    arraySet(array: PineArray, index: number, value: unknown) { ARRAY_HELPERS.set(array, index, value); },
    arrayUnshift(array: PineArray, value: unknown) { return ARRAY_HELPERS.unshift(array, value); },
    arrayInsert(array: PineArray, index: number, value: unknown) { return ARRAY_HELPERS.insert(array, index, value); },
    arrayConcat(array: PineArray, other: PineArray) { return ARRAY_HELPERS.concat(array, other); },
    runtimeError(args: unknown[], named?: Record<string, unknown>, line?: number, column?: number) {
      const message = orderedRuntimeArg(args, named, ['message'], 0, '');
      throw new CompiledRuntimeErrorException(toRuntimeString(message), line, column);
    },
    capture(name: string) {
      recordCapture?.(name);
      return capturedValue(name, b, i);
    },
    captureSource(name: string) {
      recordCapture?.(name);
      return resolveRuntimeCaptureSource(captures?.[name]);
    },
    requestSource(id: number, sourceCaptures?: Record<string, unknown>) {
      return { kind: 'expression', script: secScript.sourceScripts?.get(id), captures: sourceCaptures };
    },
    timestamp(args: unknown[], named?: Record<string, unknown>, literalId?: string, literalTimezone?: string) {
      const timeCtx = { time: { get: () => b.time }, syminfo: requestSyminfo };
      return literalId === undefined ? evaluateRuntimeTimestamp(args, named, timeCtx)
        : evaluateLiteralRuntimeTimestamp(literalTimestamps ??= createLiteralTimestampCache(), literalId, literalTimezone, args, named, timeCtx);
    },
    timeFilter(closeTime: boolean, args: unknown[], named?: Record<string, unknown>) {
      syncBuiltinContext();
      return evaluateRuntimeTimeFilter(args, named, builtinCtx, requestBars, requestRuntimeOptions, closeTime, pineVersion);
    },
    calendarPart(part: string, args: unknown[], named?: Record<string, unknown>) {
      if (!secScript.scalarBuiltinContextProgram
        || (args[0] === undefined && !Object.prototype.hasOwnProperty.call(named ?? {}, 'time'))) syncBuiltinContext();
      return evaluateRuntimeCalendarPart(part, args, named, builtinCtx);
    },
    runtimeTimeValue(name: string, offset = 0, hint = 0) {
      syncBuiltinContext();
      deps.historyCheck(`calendar:${name}`, offset, hint);
      return getRuntimeTimeValue(builtinCtx, requestBars, name, offset, Infinity);
    },
    sessionValue(name: string) {
      syncBuiltinContext();
      return getRuntimeSessionValue(requestRuntimeOptions, builtinCtx, requestBars, name);
    },
    nextBuiltinCallId(name: string) {
      return name;
    },
    readDrawingGetter(name: string, value: unknown) { return drawingReaders[name](value, builtinCtx); },
    readLineY1(value: unknown) { return lineY1Reader(value, builtinCtx); },
    readLabelText(value: unknown) { return labelTextReader(value, builtinCtx); },
    callBuiltin(name: string, args: unknown[], named?: Record<string, unknown>, callId?: string) {
      if (name !== '__resolveTableReference') syncBuiltinContext();
      const builtin = builtinRegistry.get(name);
      if (!builtin) return NaN;
      return builtin(args, namedRecordToMap(named), builtinCtx, builtinScope, callId ?? name);
    },
    hasMethodBuiltin(name: string, receiver: unknown) {
      syncBuiltinContext();
      const builtinName = runtimeMethodBuiltinName(name, receiver, builtinCtx);
      return builtinName !== undefined && builtinRegistry.has(builtinName);
    },
    callMethodBuiltin(name: string, receiver: unknown, args: unknown[], named?: Record<string, unknown>, callId?: string, resolvedName?: string) {
      syncBuiltinContext();
      const builtinName = resolvedName
        ? receiver === null || receiver === undefined || isRuntimeNa(receiver) ? undefined : resolvedName
        : runtimeMethodBuiltinName(name, receiver, builtinCtx);
      const builtin = builtinName ? builtinRegistry.get(builtinName) : undefined;
      if (!builtin) return NaN;
      const builtinArgs = resolvedName && args.length < 2
        ? args.length === 0 ? [receiver] : [receiver, args[0]]
        : [receiver, ...args];
      return builtin(builtinArgs, namedRecordToMap(named), builtinCtx, builtinScope, callId ?? builtinName!);
    },
    footprintMethod(name: string, receiver: unknown, args: unknown[], named?: Record<string, unknown>, callId?: string) {
      syncBuiltinContext();
      const namespace = isRequestFootprintData(receiver)
        ? 'footprint'
        : isRequestVolumeRowData(receiver)
          ? 'volume_row'
          : '';
      if (!namespace) return NaN;
      const builtin = builtinRegistry.get(`${namespace}.${name}`);
      if (!builtin) return NaN;
      return builtin([receiver, ...args], namedRecordToMap(named), builtinCtx, builtinScope, callId ?? `${namespace}.${name}`);
    },
    colorNew() { return ''; }, colorRgb() { return ''; },
    colorR() { return 0; }, colorG() { return 0; }, colorB() { return 0; }, colorT() { return 0; },
    colorFromGradient() { return ''; },
    mathCall(name: string, args: unknown[], named?: Record<string, unknown>, callId?: string) {
      return evaluateRuntimeMath(name, args, named, mathEvaluators, mathHistories, mathRandomStates, callId, requestMintick);
    },
    mathLog(value: unknown) { return nativeMathLog(toRuntimeNumber(value)); },
    mathSum() { return NaN; },
    strFormat(args: unknown[], named?: Record<string, unknown>) { return formatRuntimeString(args, named); },
    strFormatTime(args: unknown[], named?: Record<string, unknown>) {
      const timeCtx = { time: { get: () => b.time }, syminfo: { timezone: 'Etc/UTC' } };
      return formatRuntimeTime(args, named, timeCtx);
    },
    tickerNew(args: unknown[], named?: Record<string, unknown>) { return evaluateRuntimeTickerNew(args, named, builtinCtx.syminfo.session); },
    tickerModify(args: unknown[], named?: Record<string, unknown>) { return evaluateRuntimeTickerModify(args, named, builtinCtx.syminfo.session); }, tickerStandard() { return ''; }, tickerInherit() { return ''; },
    tickerHeikinashi() { return ''; }, tickerRenko() { return ''; }, tickerKagi() { return ''; },
    tickerLinebreak() { return ''; }, tickerPointfigure() { return ''; },
  };
  const evaluate = (index: number): unknown => {
    if (fixedSettled) return previousFixedOutput;
    i = index;
    if (!secScript.independentScalarProgram && !secScript.scalarBuiltinContextProgram) syncBuiltinContext();
    b = requestBars[i];
    lastPlotValue = NaN;
    seedCapturedSeriesParams(b, i);
    secBarCtx.bar = { open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume, time: b.time };
    secBarCtx.barIndex = i;
    secBarCtx.barstate.isfirst = i === 0;
    secBarCtx.barstate.islast = i === requestBars.length - 1;
    secBarCtx.barstate.islastconfirmedhistory = i === requestBars.length - 1;
    if (realtimePhase && realtimeCloseTimes) {
      const closeTime = realtimeCloseTimes[i]!;
      const isRealtime = closeTime > realtimePhase.startTime && b.time <= realtimePhase.chartTime;
      secBarCtx.barstate.ishistory = !isRealtime;
      secBarCtx.barstate.isrealtime = isRealtime;
      secBarCtx.barstate.isconfirmed =
        !isRealtime ||
        closeTime <= (realtimePhase.isConfirmed ? realtimePhase.chartCloseTime : realtimePhase.chartTime);
      secBarCtx.barstate.isnew =
        !isRealtime || (b.time === realtimePhase.chartTime && (realtimePhase.isNew || realtimePhase.previousIsNew));
      if (isRealtime) secBarCtx.barstate.islastconfirmedhistory = false;
    }
    try {
      history.beginBar(i, false);
      inst.onBar(secBarCtx as CompiledBarContext);
    } catch (error) {
      if (isHistoryBufferResize(error)) throw error;
      if (error instanceof CompiledRuntimeErrorException || isKnownPineRuntimeError(error)) {
        throw error;
      }
      recordSwallowedError?.(i, error);
      // Continue execution: non-runtime-error request expression failures return na for this requested bar.
    }
    if (fixedInputs) {
      const state = fixedState();
      fixedSettled = !!(state && previousFixedState && state.length === previousFixedState.length
        && state.every((value, index) => Object.is(value, previousFixedState![index]))
        && Object.is(lastPlotValue, previousFixedOutput));
      previousFixedState = state;
      previousFixedOutput = lastPlotValue;
    }
    return lastPlotValue;
  };
  if (fixedInputs) return Object.assign(evaluate, { isSettled: () => fixedSettled });
  return evaluate;
}

interface RuntimeSourceDescriptor {
  kind: 'series';
  name: string;
}

interface RuntimeExpressionSource {
  kind: 'expression';
  script: CompiledSecurityScript;
  captures?: Record<string, unknown>;
}

function isRuntimeExpressionSource(value: unknown): value is RuntimeExpressionSource {
  return !!value && typeof value === 'object'
    && (value as RuntimeExpressionSource).kind === 'expression'
    && !!(value as RuntimeExpressionSource).script;
}

const requestSourceIds = new WeakMap<CompiledSecurityScript, number>();
let nextRequestSourceId = 0;

interface RuntimeCaptureDescriptor {
  kind: 'capture';
  value: unknown;
  source?: unknown;
  scope?: object;
}

function isRuntimeSourceDescriptor(value: unknown): value is RuntimeSourceDescriptor {
  return !!value
    && typeof value === 'object'
    && (value as RuntimeSourceDescriptor).kind === 'series'
    && typeof (value as RuntimeSourceDescriptor).name === 'string';
}

function isRuntimeCaptureDescriptor(value: unknown): value is RuntimeCaptureDescriptor {
  return !!value
    && typeof value === 'object'
    && (value as RuntimeCaptureDescriptor).kind === 'capture';
}

function createRequestCalcBarsResolver(securitySites?: SecurityCallSite[]) {
  const expressionKeys = new Map<number, string>();
  const expressionIds = new Map<string, string>();
  for (const site of securitySites ?? []) {
    const expressionKey = JSON.stringify({
      kind: site.kind,
      scope: site.ownerFunctionName,
      importedAlias: site.importedAliasContext,
      expression: site.expressionExpr,
      locals: site.expressionLocalStatements,
    }, (key, value: unknown) => key === 'loc' ? undefined : value);
    let expressionId = expressionIds.get(expressionKey);
    if (expressionId === undefined) {
      expressionId = `expression:${expressionIds.size}`;
      expressionIds.set(expressionKey, expressionId);
    }
    expressionKeys.set(site.id, expressionId);
  }
  const firstCounts = new Map<string, number | undefined>();
  return (secId: number, symbol: string, timeframe: string, currency: string | undefined,
    sourceKey: string, capturesKey: string, calcBars: number | undefined): number | undefined => {
    const key = JSON.stringify([expressionKeys.get(secId) ?? secId, symbol, timeframe, currency, sourceKey, capturesKey]);
    if (!firstCounts.has(key)) firstCounts.set(key, calcBars);
    return firstCounts.get(key);
  };
}

function runtimeSourceDescriptorKey(value: unknown): string {
  if (isRuntimeSourceDescriptor(value)) return `series:${value.name}`;
  if (!isRuntimeExpressionSource(value)) return '';
  let id = requestSourceIds.get(value.script);
  if (id === undefined) { id = nextRequestSourceId++; requestSourceIds.set(value.script, id); }
  return `expression:${id}:${runtimeCapturesKey(value.captures)}`;
}

function runtimeCapturesKey(value: unknown, scopeIdentity?: (scope: object) => number): string {
  if (!value || typeof value !== 'object') return '';
  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right));
  return entries.map(([name, descriptor]) => {
    if (isRuntimeCaptureDescriptor(descriptor)) {
      if (scopeIdentity && descriptor.scope && typeof descriptor.scope === 'object') {
        return `${name}:scope:${scopeIdentity(descriptor.scope)}`;
      }
      const sourceKey = runtimeSourceDescriptorKey(descriptor.source);
      if (sourceKey) return `${name}:${sourceKey}`;
      return `${name}:${JSON.stringify(descriptor.value)}`;
    }
    return `${name}:${JSON.stringify(descriptor)}`;
  }).join('|');
}

export function captureDispatchMatcher(captures: Record<string, unknown> | undefined): (value: Record<string, unknown> | undefined) => boolean {
  const sourceMatcher = (source: unknown): ((value: unknown) => boolean) => {
    if (isRuntimeSourceDescriptor(source)) {
      const name = source.name;
      return value => isRuntimeSourceDescriptor(value) && value.name === name;
    }
    if (isRuntimeExpressionSource(source)) {
      const script = source.script;
      const matches = captureDispatchMatcher(source.captures);
      return value => isRuntimeExpressionSource(value) && value.script === script && matches(value.captures);
    }
    return value => !isRuntimeSourceDescriptor(value) && !isRuntimeExpressionSource(value);
  };
  if (!captures) return value => value === undefined;
  const names = Object.keys(captures);
  const matches = names.map(name => {
    const descriptor = captures[name];
    if (isRuntimeCaptureDescriptor(descriptor)) {
      const scope = descriptor.scope;
      const matchesSource = sourceMatcher(descriptor.source);
      const hasSource = isRuntimeSourceDescriptor(descriptor.source) || isRuntimeExpressionSource(descriptor.source);
      const primitive = descriptor.value === null || typeof descriptor.value !== 'object';
      const capturedValue = descriptor.value;
      const serialized = hasSource || primitive ? undefined : JSON.stringify(capturedValue);
      return (value: unknown) => isRuntimeCaptureDescriptor(value) && value.scope === scope
        && matchesSource(value.source) && (hasSource || (primitive ? Object.is(value.value, capturedValue) : JSON.stringify(value.value) === serialized));
    }
    const serialized = JSON.stringify(descriptor);
    return (value: unknown) => !isRuntimeCaptureDescriptor(value) && JSON.stringify(value) === serialized;
  });
  return value => {
    if (!value) return false;
    let count = 0;
    for (const name in value) if (Object.prototype.hasOwnProperty.call(value, name)) count++;
    if (count !== names.length) return false;
    for (let index = 0; index < names.length; index++) {
      const name = names[index]!;
      if (!Object.prototype.hasOwnProperty.call(value, name) || !matches[index]!(value[name])) return false;
    }
    return true;
  };
}

function requestSourceValueFromBar(bar: Bar, name: string): unknown {
  switch (name) {
    case 'open':
      return bar.open;
    case 'high':
      return bar.high;
    case 'low':
      return bar.low;
    case 'close':
      return bar.close;
    case 'volume':
      return bar.volume;
    case 'time':
      return bar.time;
    case 'hl2':
      return (bar.high + bar.low) / 2;
    case 'hlc3':
      return (bar.high + bar.low + bar.close) / 3;
    case 'ohlc4':
      return (bar.open + bar.high + bar.low + bar.close) / 4;
    case 'hlcc4':
      return (bar.high + bar.low + bar.close + bar.close) / 4;
    default:
      return Number.NaN;
  }
}

function evaluateRequestedSourceSeries(requestContext: RequestDataContext, sourceDescriptor: unknown): unknown[] | null {
  if (!isRuntimeSourceDescriptor(sourceDescriptor)) return null;
  return requestContext.bars.map((requestBar) => requestSourceValueFromBar(requestBar, sourceDescriptor.name));
}

function resolveRuntimeCaptureValue(value: unknown, requestBar: Bar): unknown {
  if (!isRuntimeCaptureDescriptor(value)) return value;
  const resolved = isRuntimeSourceDescriptor(value.source)
    ? requestSourceValueFromBar(requestBar, value.source.name)
    : value.value;
  return resolveRuntimeCapturedFieldValue(resolved, requestBar);
}

function resolveRuntimeCapturedFieldValue(value: unknown, requestBar: Bar): unknown {
  if (isRuntimeCaptureDescriptor(value)) {
    return resolveRuntimeCaptureValue(value, requestBar);
  }
  if (isRuntimeSourceDescriptor(value)) {
    return requestSourceValueFromBar(requestBar, value.name);
  }
  if (isPineArray(value)) {
    const copy = createPineArray();
    for (let i = 0; i < getArraySize(value); i++) {
      pushArrayValue(copy, resolveRuntimeCapturedFieldValue(getArrayValue(value, i), requestBar));
    }
    return copy;
  }
  if (isPineMatrix(value)) {
    const copy = createPineMatrix(value.rows, value.columns);
    copy.values = value.values.map((entryValue) => resolveRuntimeCapturedFieldValue(entryValue, requestBar));
    return copy;
  }
  if (isPineMap(value)) {
    const copy = createPineMap();
    for (const [key, entryValue] of value.entries) {
      copy.entries.set(key, resolveRuntimeCapturedFieldValue(entryValue, requestBar));
    }
    return copy;
  }
  if (isPineUdtObject(value)) {
    return copyUdtObject(value, (fieldValue) => resolveRuntimeCapturedFieldValue(fieldValue, requestBar));
  }
  return value;
}

function resolveRuntimeCaptureSource(value: unknown): unknown {
  if (!isRuntimeCaptureDescriptor(value)) return undefined;
  return isRuntimeSourceDescriptor(value.source) || isRuntimeExpressionSource(value.source) ? value.source : undefined;
}

function requestBarCloseTimes(context: RequestDataContext): number[] {
  const timezone = context.syminfo?.timezone ?? 'Etc/UTC';
  const bars = context.bars;
  const count = bars.length;
  if (count > 0) {
    const timeframe = context.timeframe;
    const spec = typeof timeframe === 'string' ? parseRuntimeTimeframeSpec(timeframe, timeframe) : null;
    if (spec?.unit === 'minute' || spec?.unit === 'second') {
      const duration = spec.multiplier * (spec.unit === 'minute' ? 60_000 : 1000);
      const closeTimes = new Array<number>(count);
      for (let index = 0; index < count; index++) {
        const openTime = bars[index]!.time;
        closeTimes[index] = Number.isFinite(openTime) ? openTime + duration : Number.NaN;
      }
      return closeTimes;
    }
  }
  return context.bars.map((bar) => getRuntimeTimeframeCloseTime(bar.time, context.timeframe, timezone, context.timeframe));
}

function createScalarSecuritySeriesCache(context: RequestDataContext, values: unknown[]): CachedSecuritySeries {
  const bars = context.bars;
  if (values.length > 0 && values.every(Number.isNaN)) return { bars: [], values: [], closeTimes: [] };
  let closeTimes: number[] | undefined;
  return {
    bars,
    values,
    get closeTimes() {
      return (closeTimes ??= requestBarCloseTimes(context));
    },
  };
}

interface RequestConfirmation {
  closeTimes: number[];
  chartCloseTime: number;
  previousChartCloseTime?: number;
}

function findConfirmedRequestBarIndex(requestBars: Bar[], chartTime: number, confirmation?: RequestConfirmation): number {
  if (!confirmation) return upperBoundRequestBarIndex(requestBars, chartTime) - 2;
  let low = 0;
  let high = confirmation.closeTimes.length;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if (confirmation.closeTimes[middle]! <= confirmation.chartCloseTime) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low - 1;
}

function findActiveRequestBarIndex(requestBars: Bar[], chartTime: number): number {
  return upperBoundRequestBarIndex(requestBars, chartTime) - 1;
}

function upperBoundRequestBarIndex(requestBars: Bar[], chartTime: number): number {
  let low = 0;
  let high = requestBars.length;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if (requestBars[middle]!.time <= chartTime) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
}

interface CachedSecuritySeries {
  bars: Bar[];
  values: unknown[];
  advance?: (count: number) => void;
  closeTimes?: number[];
  lowerTimeframeSelection?: ReturnType<typeof createLowerTimeframeSelection>;
}

function createLowerTimeframeSelection(requestBars: Bar[]) {
  let ordered = true;
  for (let index = 0; index < requestBars.length; index++) {
    const time = requestBars[index]!.time;
    if (!Number.isFinite(time) || (index > 0 && time < requestBars[index - 1]!.time)) {
      ordered = false;
      break;
    }
  }
  const lowerBound = (time: number): number => {
    let low = 0;
    let high = requestBars.length;
    while (low < high) {
      const middle = low + Math.floor((high - low) / 2);
      if (requestBars[middle]!.time < time) low = middle + 1;
      else high = middle;
    }
    return low;
  };
  const range = (start: number, end: number): [number, number] => ordered
    ? [lowerBound(start), lowerBound(end)]
    : [0, requestBars.length];
  const select = (start: number, end: number, first: boolean): number => {
    if (!(end > start)) return -1;
    if (ordered) {
      const [begin, finish] = range(start, end);
      return begin < finish ? (first ? begin : finish - 1) : -1;
    }
    // Unordered datasets retain the first/last matching input index.
    for (let index = first ? 0 : requestBars.length - 1;
      index >= 0 && index < requestBars.length;
      index += first ? 1 : -1) {
      const time = requestBars[index]!.time;
      if (time >= start && time < end) return index;
    }
    return -1;
  };
  return Object.assign(select, { range });
}

function mergeRequestedValue(
  requestBars: Bar[],
  requestedValues: unknown[],
  chartTime: number,
  previousChartTime: number | undefined,
  gaps: string,
  lookahead: string,
  useActiveRequestedBar = false,
  lowerTimeframeDurationMs?: number | null,
  sameTimeframe = false,
  confirmation?: RequestConfirmation,
  isRealtime = false,
  cached?: CachedSecuritySeries,
): unknown {
  if (requestBars.length === 0) return NaN;

  if (lowerTimeframeDurationMs !== undefined) {
    const endTime = chartTime + (lowerTimeframeDurationMs ?? 0);
    const select = cached
      ? cached.lowerTimeframeSelection ??= createLowerTimeframeSelection(requestBars)
      : createLowerTimeframeSelection(requestBars);
    const selected = select(chartTime, endTime, lookahead === 'barmerge.lookahead_on' && !isRealtime);
    return selected >= 0 ? requestedValues[selected] ?? NaN : NaN;
  }

  const selectedIndex = lookahead === 'barmerge.lookahead_on' || useActiveRequestedBar || sameTimeframe
    ? findActiveRequestBarIndex(requestBars, chartTime)
    : findConfirmedRequestBarIndex(requestBars, chartTime, confirmation);
  if (selectedIndex < 0) return NaN;

  if (gaps === 'barmerge.gaps_on') {
    const availableAt = lookahead === 'barmerge.lookahead_on' || useActiveRequestedBar || sameTimeframe
      ? requestBars[selectedIndex]?.time
      : confirmation?.closeTimes[selectedIndex] ?? requestBars[selectedIndex + 1]?.time;
    const previousTime = lookahead === 'barmerge.lookahead_on' || useActiveRequestedBar || sameTimeframe
      ? previousChartTime
      : confirmation?.previousChartCloseTime ?? previousChartTime;
    if (availableAt === undefined || (previousTime !== undefined && previousTime >= availableAt)) {
      return NaN;
    }
  }

  return requestedValues[selectedIndex] ?? NaN;
}

function normalizeRuntimeRequestGapsMode(value: unknown, pineVersion: number): string {
  if (pineVersion <= 4 && typeof value === 'boolean') {
    return value ? 'barmerge.gaps_on' : 'barmerge.gaps_off';
  }
  return String(value ?? 'barmerge.gaps_off');
}

function normalizeRuntimeRequestLookaheadMode(value: unknown, pineVersion: number): string {
  if (pineVersion <= 4 && typeof value === 'boolean') {
    return value ? 'barmerge.lookahead_on' : 'barmerge.lookahead_off';
  }
  return String(value ?? 'barmerge.lookahead_off');
}

function collectLowerTimeframeValues(
  requestBars: Bar[],
  requestedValues: unknown[],
  chartStart: number,
  chartEnd: number,
  tupleArityHint?: number,
  cached?: CachedSecuritySeries,
): PineArray | unknown[] {
  const array = createPineArray();
  const tupleArrays: PineArray[] = tupleArityHint
    ? Array.from({ length: tupleArityHint }, () => createPineArray())
    : [];
  let tupleArity: number | null = tupleArityHint ?? null;
  if (!Number.isFinite(chartStart) || !Number.isFinite(chartEnd) || chartEnd <= chartStart) {
    return tupleArity !== null ? tupleArrays : array;
  }

  const select = cached
    ? cached.lowerTimeframeSelection ??= createLowerTimeframeSelection(requestBars)
    : createLowerTimeframeSelection(requestBars);
  const [begin, finish] = select.range(chartStart, chartEnd);
  for (let i = begin; i < finish; i++) {
    const requestTime = requestBars[i]!.time;
    if (requestTime >= chartStart && requestTime < chartEnd) {
      const value = requestedValues[i] ?? NaN;
      const tupleValues = lowerTimeframeTupleValues(value);
      if (tupleValues) {
        tupleArity ??= tupleValues.length;
        for (let itemIndex = 0; itemIndex < tupleArity; itemIndex += 1) {
          tupleArrays[itemIndex] ??= createPineArray();
          pushArrayValue(tupleArrays[itemIndex]!, tupleValues[itemIndex] ?? NaN);
        }
      } else {
        pushArrayValue(array, value);
      }
    }
  }

  if (tupleArity !== null) return tupleArrays;
  return array;
}

function createLowerTimeframeEmptyResult(tupleArity?: number): PineArray | PineArray[] {
  if (tupleArity === undefined || !Number.isInteger(tupleArity) || tupleArity <= 0) {
    return createPineArray();
  }
  return Array.from({ length: tupleArity }, () => createPineArray());
}

function lowerTimeframeTupleValues(value: unknown): unknown[] | null {
  if (Array.isArray(value) && !isPineArray(value)) return value;
  if (isPineArray(value)) {
    return Array.from({ length: getArraySize(value) }, (_, index) => getArrayValue(value, index));
  }
  return null;
}

interface RuntimeRequestPointSeries {
  points: RequestSeriesPoint[];
  finiteTimes: boolean;
}

function prepareRequestPointSeries(points: RequestSeriesPoint[]): RuntimeRequestPointSeries {
  return {
    points: [...points].sort((left, right) => left.time - right.time),
    finiteTimes: points.every((point) => Number.isFinite(point.time)),
  };
}

function mergeRequestSeriesValue(
  series: RuntimeRequestPointSeries,
  chartTime: number,
  previousChartTime: number | undefined,
  gaps: unknown = 'barmerge.gaps_off',
  lookahead: unknown = 'barmerge.lookahead_off',
): number {
  const sortedPoints = series.points;
  if (!Number.isFinite(chartTime) || sortedPoints.length === 0) return NaN;
  const lookaheadMode = String(lookahead ?? 'barmerge.lookahead_off');
  const lookaheadOn = lookaheadMode === 'barmerge.lookahead_on';
  const selectPoint = (time: number): RequestSeriesPoint | undefined => {
    if (Number.isNaN(time)) return undefined;
    if (!series.finiteTimes) {
      let lastPoint: RequestSeriesPoint | undefined;
      for (const point of sortedPoints) {
        if (lookaheadOn && point.time >= time) return point;
        if (point.time <= time) lastPoint = point;
        else break;
      }
      return lastPoint;
    }
    let low = 0;
    let high = sortedPoints.length;
    while (low < high) {
      const middle = low + Math.floor((high - low) / 2);
      const precedes = lookaheadOn ? sortedPoints[middle].time < time : sortedPoints[middle].time <= time;
      if (precedes) low = middle + 1;
      else high = middle;
    }
    return lookaheadOn && low < sortedPoints.length ? sortedPoints[low] : sortedPoints[low - 1];
  };
  const selectedPoint = selectPoint(chartTime);
  if (!selectedPoint) return NaN;
  if (String(gaps ?? 'barmerge.gaps_off') !== 'barmerge.gaps_on') {
    return selectedPoint.value;
  }
  if (lookaheadOn) {
    const previousPoint = previousChartTime === undefined ? undefined : selectPoint(previousChartTime);
    return previousPoint?.time !== selectedPoint.time ? selectedPoint.value : NaN;
  }
  return previousChartTime === undefined || previousChartTime < selectedPoint.time ? selectedPoint.value : NaN;
}

function normalizeRuntimeRequestSeriesField(value: unknown, defaultField: string): string {
  if (value === undefined || isRuntimeNa(value)) return defaultField;
  const field = toRuntimeString(value).trim();
  return field === '' ? defaultField : field;
}

function unavailableQuandlRequest(spec: { key: string; ignoreInvalid: boolean }): number {
  if (spec.ignoreInvalid) return NaN;
  const [ticker, column] = spec.key.split('\u0000');
  if (column === '0') throwCompiledRuntimeError(`Invalid symbol: QUANDL:${ticker}|0.0`);
  throwCompiledRuntimeError('request.quandl is deprecated: QUANDL requests are no longer valid');
}

function requestPointSeriesSpec(
  name: string,
  args: unknown[],
  named: Record<string, unknown> | undefined,
): { family: RequestSeriesFamily; key: string; gaps: unknown; lookahead: unknown; ignoreInvalid: boolean } {
  if (name === 'request.dividends' || name === 'request.earnings' || name === 'request.splits') {
    const names = ['ticker', 'field', 'gaps', 'lookahead', 'ignore_invalid_symbol', 'currency'] as const;
    const family = name.slice('request.'.length) as 'dividends' | 'earnings' | 'splits';
    const ticker = toRuntimeString(orderedRuntimeArg(args, named, names, 0)).trim();
    const defaultField = family === 'dividends' ? 'dividends.gross' : family === 'earnings' ? 'earnings.actual' : 'splits.denominator';
    const field = normalizeRuntimeRequestSeriesField(orderedRuntimeArg(args, named, names, 1), defaultField);
    const gaps = orderedRuntimeArg(args, named, names, 2, 'barmerge.gaps_off');
    const lookahead = orderedRuntimeArg(args, named, names, 3, 'barmerge.lookahead_off');
    const ignoreInvalid = isRuntimeTruthy(orderedRuntimeArg(args, named, names, 4, false));
    const currency = family === 'splits'
      ? undefined
      : normalizeRuntimeRequestCurrency(orderedRuntimeArg(args, named, names, 5));
    return { family, key: corporateActionRequestKey(ticker, field, currency), gaps, lookahead, ignoreInvalid };
  }

  if (name === 'request.financial') {
    const names = ['symbol', 'financial_id', 'period', 'gaps', 'ignore_invalid_symbol', 'currency'] as const;
    const symbol = toRuntimeString(orderedRuntimeArg(args, named, names, 0)).trim();
    const financialId = toRuntimeString(orderedRuntimeArg(args, named, names, 1)).trim();
    const period = toRuntimeString(orderedRuntimeArg(args, named, names, 2)).trim().toUpperCase();
    const gaps = orderedRuntimeArg(args, named, names, 3, 'barmerge.gaps_off');
    const ignoreInvalid = isRuntimeTruthy(orderedRuntimeArg(args, named, names, 4, false));
    const currency = normalizeRuntimeRequestCurrency(orderedRuntimeArg(args, named, names, 5));
    return { family: 'financial', key: financialRequestKey(symbol, financialId, period, currency), gaps, lookahead: 'barmerge.lookahead_off', ignoreInvalid };
  }

  if (name === 'request.economic') {
    const names = ['country_code', 'field', 'gaps', 'ignore_invalid_symbol'] as const;
    const countryCode = toRuntimeString(orderedRuntimeArg(args, named, names, 0)).trim().toUpperCase();
    const field = toRuntimeString(orderedRuntimeArg(args, named, names, 1)).trim();
    const gaps = orderedRuntimeArg(args, named, names, 2, 'barmerge.gaps_off');
    const ignoreInvalid = isRuntimeTruthy(orderedRuntimeArg(args, named, names, 3, false));
    return { family: 'economic', key: economicRequestKey(countryCode, field), gaps, lookahead: 'barmerge.lookahead_off', ignoreInvalid };
  }

  const names = ['ticker', 'gaps', 'index', 'ignore_invalid_symbol'] as const;
  const ticker = toRuntimeString(orderedRuntimeArg(args, named, names, 0)).trim();
  const gaps = orderedRuntimeArg(args, named, names, 1, 'barmerge.gaps_off');
  const column = Math.trunc(toRuntimeNumber(orderedRuntimeArg(args, named, names, 2, 0)));
  const ignoreInvalid = isRuntimeTruthy(orderedRuntimeArg(args, named, names, 3, false));
  return { family: 'quandl', key: quandlRequestKey(ticker, column), gaps, lookahead: 'barmerge.lookahead_off', ignoreInvalid };
}

export function executeCompiled(
  compiled: CompiledScript,
  bars: Bar[],
  inputs?: Map<string, unknown>,
  options?: CompiledExecutionOptions,
): ExecutionResult | null {
  const declaration = compiled.analysis.declarationInfo?.node;
  const minimum = declaration && 'max_bars_back' in declaration
    ? declarationNumberValue(declaration.max_bars_back ?? undefined, compiled.analysis.declarationInfo) ?? 0
    : 0;
  const defaultCalculatedBars = declaration?.type === 'IndicatorDeclaration' && compiled.analysis.declarationInfo?.kind === 'indicator'
    ? declarationNumberValue(declaration.calc_bars_count ?? undefined, compiled.analysis.declarationInfo) ?? 0 : 0;
  const calculatedBars = defaultCalculatedBars > 0
    ? inputs?.get(CALCULATED_BARS_INPUT_ID) ?? defaultCalculatedBars : 0;
  if (typeof calculatedBars !== 'number' || !Number.isInteger(calculatedBars) || calculatedBars < 0) {
    throwCompiledRuntimeError('Calculated bars must be a non-negative integer');
  }
  const historicalBars = options?.confirmedRealtimeBarStartIndex
    ?? options?.confirmedRealtimeBarIndex
    ?? (options?.realtimeLastBar ? bars.length - 1 : bars.length);
  const startIndex = calculatedBars > 0 ? Math.max(0, historicalBars - calculatedBars) : 0;
  const rebaseIndex = (index: number | undefined): number | undefined =>
    index !== undefined && index >= startIndex ? index - startIndex : undefined;
  const executionOptions = startIndex > 0 ? {
    ...options,
    confirmedRealtimeBarIndex: rebaseIndex(options?.confirmedRealtimeBarIndex),
    confirmedRealtimeBarStartIndex: rebaseIndex(options?.confirmedRealtimeBarStartIndex),
  } : options;
  const history = new HistoryBufferSizing(minimum, options?.maxBarsBack);
  const result = history.run(() => executeCompiledPass(compiled, startIndex > 0 ? bars.slice(startIndex) : bars, inputs, executionOptions, history));
  if (!result) return result;
  if (defaultCalculatedBars > 0) {
    result.inputs.push({ id: CALCULATED_BARS_INPUT_ID, type: 'int', title: 'Calculated bars', group: 'Calculation', defval: defaultCalculatedBars, minval: 0 });
  }
  return startIndex > 0 ? projectCalculatedBarOutputs(result, startIndex) : result;
}

function executeCompiledPass(
  compiled: CompiledScript,
  bars: Bar[],
  inputs: Map<string, unknown> | undefined,
  options: CompiledExecutionOptions | undefined,
  history: HistoryBufferSizing,
): ExecutionResult | null {
  if (!compiled.success) return null;

  const startMs = performance.now();
  const declarationNode = compiled.analysis.declarationInfo?.node;
  const ctx = new ExecutionContext();
  valueAtTimeContextPeriodCaches.set(ctx, valueAtTimePeriodCache(history));
  const builtinRegistry = createCompiledBuiltinRegistry(compiled.analysis.pineVersion);
  const lineY1Reader = builtinRegistry.get('line.get_y1')!.positionalSingleArgument!;
  const labelTextReader = builtinRegistry.get('label.get_text')!.positionalSingleArgument!;
  const drawingReaders = Object.fromEntries([...POSITIONAL_DRAWING_GETTERS].map(name => [name, builtinRegistry.get(name)!.positionalSingleArgument!]));
  const builtinScope = new Scope();
  const mathEvaluators = new Map<string, CachedRuntimeMathEvaluator>();
  let literalTimestamps: LiteralTimestampCache | undefined;
  const mathHistories = new Map<string, RollingSumState>();
  const mathRandomStates = new Map<string, RuntimeRandomState>();
  const inputDefs = new Map<string, InputDefinition>();
  const inputCallSiteIds = new Map<string, string>();
  const inputCallCache = new Map<string, { inputId: string; type: InputDefinition['type'] }>();

  if (options?.timenowObservations) ctx.setTimenowObservations(options.timenowObservations);

  if (typeof options?.runtime?.now === 'number') {
    ctx.setNow(options.runtime.now);
  }
  if (options?.runtime?.syminfo) {
    ctx.syminfo = { ...ctx.syminfo, ...options.runtime.syminfo };
  }
  if (options?.runtime?.timeframe) {
    ctx.timeframe = { ...ctx.timeframe, ...options.runtime.timeframe };
  }
  if (inputs) {
    for (const [key, value] of inputs) {
      ctx.setInput(key, value);
    }
  }

  const versionRules = pineVersionRules(compiled.analysis.pineVersion);
  ctx.timeframe.period = normalizeVersionedTimeframePeriod(ctx.timeframe.period, compiled.analysis.pineVersion);
  const dynamicRequestsEnabled = declarationNode && 'dynamic_requests' in declarationNode
    ? staticBooleanValue(declarationNode.dynamic_requests) ?? versionRules.dynamicRequestsDefault
    : versionRules.dynamicRequestsDefault;
  const indicatorDeclarationNode = declarationNode?.type === 'IndicatorDeclaration'
    ? declarationNode
    : undefined;
  const declaredMaxBarsBack = declarationNode && 'max_bars_back' in declarationNode
    ? declarationNumberValue(declarationNode.max_bars_back ?? undefined, compiled.analysis.declarationInfo)
    : undefined;
  const maxStaticHistoryBarsBack = compiled.analysis.maxStaticHistoryOffset;
  const effectiveMaxBarsBack = options?.maxBarsBack ?? Math.max(declaredMaxBarsBack ?? 500, maxStaticHistoryBarsBack);
  const labelLimit = declarationNumberValue(indicatorDeclarationNode?.max_labels_count ?? undefined, compiled.analysis.declarationInfo);
  const lineLimit = declarationNumberValue(indicatorDeclarationNode?.max_lines_count ?? undefined, compiled.analysis.declarationInfo);
  const boxLimit = declarationNumberValue(indicatorDeclarationNode?.max_boxes_count ?? undefined, compiled.analysis.declarationInfo);
  const polylineLimit = declarationNumberValue(indicatorDeclarationNode?.max_polylines_count ?? undefined, compiled.analysis.declarationInfo);
  if (labelLimit !== undefined) ctx.setDrawingLimit('label', labelLimit);
  if (lineLimit !== undefined) ctx.setDrawingLimit('line', lineLimit);
  if (boxLimit !== undefined) ctx.setDrawingLimit('box', boxLimit);
  if (polylineLimit !== undefined) ctx.setDrawingLimit('polyline', polylineLimit);

  const declarationTimeframe = resolveDeclarationTimeframe(
    indicatorDeclarationNode?.timeframe,
    inputs,
    inputDefs,
    compiled.analysis.inputSites,
  );
  if (declarationTimeframe !== null && declarationTimeframe.trim() !== '') {
    const info = runtimeTimeframeInfo(declarationTimeframe, ctx.timeframe.period, compiled.analysis.pineVersion);
    if (info === null) {
      throw new Error(`Invalid indicator timeframe: ${declarationTimeframe.trim().toUpperCase()}`);
    }
    ctx.timeframe = info;
    ctx.indicatorTimeframe = info.period;
  }
  ctx.chart = mergeChartInfo(ctx.chart, options?.runtime?.chart);
  ctx.loadBars(bars);
  applyCompiledChartFallbacks(ctx, bars);
  const chartTimeframePeriod = String(ctx.timeframe.period ?? '');
  ctx.timeframe.main_period = chartTimeframePeriod;
  const chartDuration = getRuntimeTimeframeDurationMs(chartTimeframePeriod, chartTimeframePeriod);

  const isStrategy = compiled.analysis.declarationInfo?.kind === 'strategy';
  const strategySettings = extractStrategySettings(compiled);
  if (options?.runtime?.syminfo?.currency && (strategySettings.currency === undefined || strategySettings.currency === 'NONE')) {
    strategySettings.currency = options.runtime.syminfo.currency;
  }
  const ledger = createStrategyLedger(strategySettings);
  const mintick = (ctx.syminfo as unknown as { mintick: number }).mintick ?? 0.01;
  const lastBarIndex = bars.length - 1;

  const deps = {
    constIntDivide: divideV5ConstInts,
    ...history.dependencies(effectiveMaxBarsBack, () => ctx.barstate.isrealtime),
    maxBarsBack: effectiveMaxBarsBack,
    _arr: ARRAY_HELPERS,
    _map: MAP_HELPERS,
    _udt: UDT_HELPERS,
    _mtx: MATRIX_HELPERS,
    ...ta,
  };

  const plotRegistered = new Map<number, string>();
  const plotArrays = new Map<number, (number | null)[]>();
  const plotColors = new Map<number, string | null>();
  const alertRegistered = new Map<string, string>();
  const strategyPropHistories = new Map<string, ValueSeries>();
  const securityCache = new Map<string, CachedSecuritySeries>();
  const unusedCaptureLowerTimeframeCache = new Map<string, CachedSecuritySeries>();
  const resolveRequestCalcBars = createRequestCalcBarsResolver(compiled.analysis.securitySites);
  type SecurityDispatch = {
    symbol: unknown;
    timeframe: unknown;
    gaps: unknown;
    lookahead: unknown;
    currency: unknown;
    calcBarsCount: unknown;
    sourceKey: string;
    matchesCaptures: (value: Record<string, unknown> | undefined) => boolean;
    symStr: string;
    tfStr: string;
    gapsStr: string;
    laStr: string;
    currencyStr: string | undefined;
    calcBars: number | undefined;
    cacheKey: string;
    contextKey: string;
    lowerTimeframeDurationMs: number | undefined;
    sameTimeframe: boolean;
  };
  const securityDispatchCache = new Map<number, SecurityDispatch>();
  const securitySymbolDispatchCache = new Map<number, Map<unknown, SecurityDispatch>>();
  const requestSeriesCache = new Map<string, RuntimeRequestPointSeries>();
  const requestContextKeys = new Set<string>();
  const requestDatafeed = options?.requestDatafeed;
  const resolveRequestDataset = requestDatafeed
    ? createRequestedDatasetResolver(requestDatafeed, () => ctx.barstate.isrealtime)
    : undefined;
  const errors: ExecutionError[] = [];
  const swallowedErrors: RuntimeSwallowedErrorAccumulator = new Map();
  const runtimeApproximations: RuntimeApproximationAccumulator = new Map();
  if (!options?.runtime?.syminfo) {
    recordRuntimeApproximation(
      runtimeApproximations,
      'context.syminfo.synthetic-defaults',
      'Host syminfo metadata was not supplied; synthetic ExecutionContext.syminfo values and documented na placeholders were used.',
    );
  }
  if (!options?.runtime?.timeframe && declarationTimeframe === null) {
    recordRuntimeApproximation(
      runtimeApproximations,
      'context.timeframe.synthetic-defaults',
      'Host timeframe metadata was not supplied and the script declaration did not specify one; synthetic ExecutionContext.timeframe values were used.',
    );
  }
  if (!options?.runtime?.session) {
    recordRuntimeApproximation(
      runtimeApproximations,
      'context.session.inferred-defaults',
      'Host session metadata was not supplied; exchange session classification was inferred from syminfo metadata and may not match TradingView chart settings.',
    );
  }
  if (!options?.runtime?.chart) {
    recordRuntimeApproximation(
      runtimeApproximations,
      'context.chart.synthetic-defaults',
      'Host chart metadata was not supplied; synthetic ExecutionContext.chart values and bar-range visible times were used.',
    );
  }
  const runtimeBuiltinCallCounts = new Map<string, number>();
  const recordRuntimeError = (message: string): void => {
    errors.push(createCompiledExecutionError(new CompiledRuntimeErrorException(message)));
  };
  const instantiateCompiledScript = (): InstanceType<CompiledScript['ScriptClass']> | null => {
    try {
      if (lineLimit === 0) {
        throwCompiledRuntimeError("Invalid value of the 'max_lines_count' argument (0) in the 'study' function. It must be > 0.");
      }
      return new compiled.ScriptClass(deps);
    } catch (error) {
      if (isHistoryBufferResize(error)) throw error;
      if (error instanceof CompiledRuntimeErrorException || isKnownPineRuntimeError(error)) {
        errors.push(createCompiledExecutionError(error));
        return null;
      }
      throw error;
    }
  };
  const inst = instantiateCompiledScript();
  const requestDisabledByDynamicRequests = (secId: number, name: string): boolean => {
    if (dynamicRequestsEnabled) return false;
    const reason = compiled.analysis.securitySites[secId]?.requiresDynamicRequestsReason;
    if (!reason) return false;
    recordRuntimeError(reason === 'nested-request'
      ? `Nested request.* calls require dynamic_requests=true: ${name}`
      : versionRules.allowsNonExportedFunctionRequestsWithoutDynamicRequests
        ? `request.* calls in local scopes require dynamic_requests=true: ${name}`
        : LOCAL_REQUEST_DYNAMIC_REQUESTS_MESSAGE(name));
    return true;
  };
  const trackRequestContext = (key: string): void => {
    if (dynamicRequestsEnabled && ctx.barstate.isrealtime && !requestContextKeys.has(key)) {
      throwCompiledRuntimeError('Dynamic request.* contexts and expressions must be accessed on historical bars before realtime execution.');
    }
    requestContextKeys.add(key);
    if (requestContextKeys.size > TEALSCRIPT_MAX_UNIQUE_REQUEST_CONTEXTS) {
      throwCompiledRuntimeError(`Too many unique request.* contexts: maximum is ${TEALSCRIPT_MAX_UNIQUE_REQUEST_CONTEXTS} per script. Reuse the same symbol/timeframe/expression request or reduce dynamic symbol and timeframe combinations.`);
    }
  };
  const footprintContextKeys = new Set<string>();
  const trackFootprintContext = (key: string): void => {
    footprintContextKeys.add(key);
    if (footprintContextKeys.size > 1) {
      throwCompiledRuntimeError('Too many unique request.footprint calls: maximum is 1 per script, including requested contexts.');
    }
  };
  const requestScopeIdentities = new WeakMap<object, number>();
  let nextRequestScopeIdentity = 0;
  const requestScopeIdentity = (scope: object): number => {
    let identity = requestScopeIdentities.get(scope);
    if (identity === undefined) {
      identity = nextRequestScopeIdentity++;
      requestScopeIdentities.set(scope, identity);
    }
    return identity;
  };
  const resolveCurrencyRate = (args: unknown[], named: Record<string, unknown> | undefined, time: number): unknown => {
    const names = ['from', 'to', 'ignore_invalid_currency'] as const;
    const fromCurrency = normalizeRuntimeRequestCurrency(orderedRuntimeArg(args, named, names, 0));
    const toCurrency = normalizeRuntimeRequestCurrency(orderedRuntimeArg(args, named, names, 1));
    const ignoreInvalidCurrency = isRuntimeTruthy(orderedRuntimeArg(args, named, names, 2, false));

    if (!fromCurrency || !toCurrency) {
      if (ignoreInvalidCurrency) return NaN;
      throwCompiledRuntimeError('request.currency_rate requires non-empty currency codes');
    }
    if (fromCurrency === toCurrency) return 1;

    const key = currencyRateRequestKey(fromCurrency, toCurrency);
    trackRequestContext(`request.currency_rate\u0000${key}`);
    const providerRate = requestDatafeed?.getCurrencyRate?.({
      baseCurrency: fromCurrency,
      quoteCurrency: toCurrency,
      time,
    });
    if (providerRate !== undefined) return providerRate;

    const seriesDatafeed = requestDatafeed?.getSeries ? requestDatafeed : undefined;
    if (!seriesDatafeed) return NaN;

    const cacheKey = `currency_rate:${key}`;
    let points = requestSeriesCache.get(cacheKey);
    if (!points) {
      const result = seriesDatafeed.getSeries!({ family: 'currency_rate', key });
      if (!result.ok) {
        if (result.code === 'invalid_currency' && !ignoreInvalidCurrency) {
          throwCompiledRuntimeError(`request.currency_rate failed: ${result.message}`);
        }
        return NaN;
      }
      points = prepareRequestPointSeries(result.context.points);
      requestSeriesCache.set(cacheKey, points);
    }

    return mergeRequestSeriesValue(points, time, undefined);
  };
  const resolveRequestedPointSeries: RequestedPointSeriesResolver = (name, args, named, time, previousTime) => {
    if (name === 'request.currency_rate') return resolveCurrencyRate(args, named, time);
    if (name === 'request.quandl') return unavailableQuandlRequest(requestPointSeriesSpec(name, args, named));

    if (name !== 'request.financial' && name !== 'request.dividends' && name !== 'request.economic' && name !== 'request.earnings' && name !== 'request.splits') return NaN;
    const spec = requestPointSeriesSpec(name, args, named);
    trackRequestContext(`${name}\u0000${spec.key}`);
    if (name === 'request.economic') {
      const seriesDatafeed = spec.gaps === 'barmerge.gaps_on' && requestDatafeed?.getSeries ? requestDatafeed : undefined;
      if (seriesDatafeed) {
        const cacheKey = `${spec.family}:${spec.key}`;
        let points = requestSeriesCache.get(cacheKey);
        if (!points) {
          const result = seriesDatafeed.getSeries!({ family: 'economic', key: spec.key });
          if (!result.ok && result.code === 'invalid_symbol') {
            if (spec.ignoreInvalid) return NaN;
            throwCompiledRuntimeError(`${name} failed: ${result.message}`);
          }
          if (result.ok) {
            points = prepareRequestPointSeries(result.context.points);
            requestSeriesCache.set(cacheKey, points);
          }
        }
        if (points) {
          return mergeRequestSeriesValue(points, time, previousTime, spec.gaps, spec.lookahead);
        }
      }
      const [countryCode, field] = spec.key.split('\u0000');
      const providerValue = requestDatafeed?.getEconomicSeries?.({
        countryCode: countryCode ?? '',
        field: field ?? '',
        time,
      });
      if (providerValue !== undefined) return providerValue;
    }
    if (name === 'request.financial') {
      const [symbol, financialId, period, currency = ''] = spec.key.split('\u0000');
      let providerPoint: RequestSeriesPoint | undefined;
      try {
        providerPoint = requestDatafeed?.getFinancialMetric?.({
          symbol: symbol ?? '',
          financialId: financialId ?? '',
          period: period ?? '',
          currency: currency === '' ? undefined : currency,
          time,
        });
      } catch (error) {
        if (!(error instanceof FinancialSymbolResolutionError)) throw error;
        if (spec.ignoreInvalid) return NaN;
        throwCompiledRuntimeError(error.message);
      }
      if (providerPoint !== undefined) {
        if (spec.gaps === 'barmerge.gaps_on' && providerPoint.time !== time) return NaN;
        return providerPoint.value;
      }
    } else if ((name === 'request.dividends' || name === 'request.earnings' || name === 'request.splits') && String(spec.lookahead ?? 'barmerge.lookahead_off') !== 'barmerge.lookahead_on') {
      const [ticker, field, currency = ''] = spec.key.split('\u0000');
      const event = requestDatafeed?.getCorporateAction?.({
        kind: name === 'request.earnings' ? 'earnings' : name === 'request.splits' ? 'splits' : 'dividends', ticker: ticker ?? '',
        currency: currency === '' ? undefined : currency, time,
      });
      if (event !== undefined) {
        if (spec.gaps === 'barmerge.gaps_on' && event.time !== time) return NaN;
        return selectCorporateActionField(event.value, field ?? '') ?? NaN;
      }
    }
    if (!requestDatafeed?.getSeries) return NaN;
    const cacheKey = `${spec.family}:${spec.key}`;
    let points = requestSeriesCache.get(cacheKey);
    if (!points) {
      const result = requestDatafeed.getSeries({ family: spec.family, key: spec.key });
      if (!result.ok) {
        if (result.code === 'invalid_symbol' && !spec.ignoreInvalid) {
          throwCompiledRuntimeError(`${name} failed: ${result.message}`);
        }
        return NaN;
      }
      points = prepareRequestPointSeries(result.context.points);
      requestSeriesCache.set(cacheKey, points);
    }
    return mergeRequestSeriesValue(points, time, previousTime, spec.gaps, spec.lookahead);
  };
  const strategyAccountCurrency = (): string | undefined => {
    const symbolCurrency = normalizeRuntimeRequestCurrency(ctx.syminfo.currency);
    const accountCurrency = normalizeRuntimeRequestCurrency(ledger.settings.currency);
    return accountCurrency === undefined || accountCurrency === 'NONE' ? symbolCurrency : accountCurrency;
  };
  const strategyCurrencyRate = (fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency) return 1;
    const key = currencyRateRequestKey(fromCurrency, toCurrency);
    const providerRate = requestDatafeed?.getCurrencyRate?.({
      baseCurrency: fromCurrency,
      quoteCurrency: toCurrency,
      time: bar.time,
    });
    if (providerRate !== undefined) return providerRate;

    const seriesDatafeed = requestDatafeed?.getSeries ? requestDatafeed : undefined;
    if (!seriesDatafeed) {
      throwCompiledRuntimeError(`strategy currency conversion requires ${fromCurrency}/${toCurrency} rate data`);
    }

    const cacheKey = `currency_rate:${key}`;
    let points = requestSeriesCache.get(cacheKey);
    if (!points) {
      const result = seriesDatafeed.getSeries!({ family: 'currency_rate', key });
      if (!result.ok) {
        throwCompiledRuntimeError(`strategy currency conversion requires ${fromCurrency}/${toCurrency} rate data`);
      }
      points = prepareRequestPointSeries(result.context.points);
      requestSeriesCache.set(cacheKey, points);
    }
    const rate = mergeRequestSeriesValue(points, bar.time, undefined);
    if (typeof rate !== 'number' || !Number.isFinite(rate)) {
      throwCompiledRuntimeError(`strategy currency conversion requires ${fromCurrency}/${toCurrency} rate data`);
    }
    return rate;
  };
  const nextRuntimeBuiltinCallId = (name: string): string => {
    const index = runtimeBuiltinCallCounts.get(name) ?? 0;
    runtimeBuiltinCallCounts.set(name, index + 1);
    return `${name}_${index}`;
  };
  const visualOutputId = (kind: string, uniqueId: string, legacyId: string): string => {
    let id = ctx.plots.has(legacyId) ? uniqueId : legacyId;
    let suffix = 1;
    while (ctx.plots.has(id)) {
      id = `${kind}_${uniqueId}_${suffix}`;
      suffix += 1;
    }
    return id;
  };
  const resolveLegacyPlotReference = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return toOptionalString(value);
    if (ctx.plots.has(value)) return value;
    const legacyPlotId = `plot_${value}`;
    const legacyHlineId = `hline_${value}`;
    if (ctx.plots.has(legacyPlotId)) return legacyPlotId;
    if (ctx.plots.has(legacyHlineId)) return legacyHlineId;
    return value.startsWith('plot_') || value.startsWith('hline_') ? value : legacyPlotId;
  };
  const alertConditionOutputId = (callId: string | undefined, title: string): string => {
    const key = callId ?? title;
    const cached = alertRegistered.get(key);
    if (cached) return cached;
    const legacyId = `alertcondition_${title}`;
    let id = ctx.alerts.has(legacyId) ? key : legacyId;
    let suffix = 1;
    while (ctx.alerts.has(id)) {
      id = `alertcondition_${key}_${suffix}`;
      suffix += 1;
    }
    alertRegistered.set(key, id);
    return id;
  };
  const readStrategyProp = (name: string): unknown => {
    if (name === 'long') return 'long';
    if (name === 'short') return 'short';
    if (name === 'cash') return 'cash';
    if (name === 'fixed') return 'fixed';
    if (name === 'percent_of_equity') return 'percent_of_equity';
    if (name === 'account_currency') return ledger.settings.currency;
    if (isStrategyHistoryProp(name)) return readStrategyHistoryProp(ledger, name);
    return 0;
  };
  const strategyPropSeries = (name: string): ValueSeries => {
    let series = strategyPropHistories.get(name);
    if (!series) {
      series = new deps.ValueSeries(effectiveMaxBarsBack + 1, effectiveMaxBarsBack, `strategy:${name}`);
      strategyPropHistories.set(name, series);
    }
    return series;
  };
  const updateStrategyPropHistory = (name: string): void => {
    const series = strategyPropSeries(name);
    const value = readStrategyProp(name);
    if (series.size < barIndex + 1) series.push(value);
    else series.update(value);
  };
  const updateStrategyPropHistories = (): void => {
    if (!isStrategy) return;
    for (const name of STRATEGY_HISTORY_PROPS) updateStrategyPropHistory(name);
  };

  let barCount = 0;

  const barData = { open: 0, high: 0, low: 0, close: 0, volume: 0, time: 0 };
  const barstateObj = {
    isfirst: false, islast: false, ishistory: true, isrealtime: false,
    isnew: true, isconfirmed: true, islastconfirmedhistory: false,
  };

  const barCtx: CompiledBarContext = {
    bar: barData,
    barIndex: 0,
    lastBarIndex,
    isFirstTick: true,
    barstate: barstateObj,
    syminfo: ctx.syminfo as unknown as Record<string, unknown>,
    timeframe: ctx.timeframe as unknown as Record<string, unknown>,
    chart: ctx.chart as unknown as Record<string, unknown>,

    plot(index: number, funcName: string, funcCallIndex: number, value: unknown, named: Record<string, unknown>, extraArgs: unknown[]) {
      const plotArgs = ['series', 'title', 'color', 'linewidth', 'style', 'trackprice', 'histbase', 'offset', 'join', 'editable', 'show_last', 'display', 'format', 'precision', 'force_overlay', 'linestyle', 'transp'] as const;
      const plotV4Args = ['series', 'title', 'color', 'linewidth', 'style', 'trackprice', 'transp', 'histbase', 'offset', 'join', 'editable', 'show_last', 'display', 'format', 'precision', 'force_overlay', 'linestyle'] as const;
      const hlineArgs = ['price', 'title', 'color', 'linestyle', 'linewidth', 'editable', 'display'] as const;
      const fillArgs = ['plot1', 'plot2', 'color', 'title', 'editable', 'show_last', 'fillgaps', 'display', 'transp'] as const;
      const hlineFillArgs = ['plot1', 'plot2', 'color', 'title', 'editable', 'fillgaps', 'display'] as const;
      const fillV4Args = ['plot1', 'plot2', 'color', 'transp', 'title', 'editable', 'show_last', 'fillgaps', 'display'] as const;
      const bgcolorArgs = ['color', 'offset', 'editable', 'show_last', 'title', 'display', 'force_overlay', 'transp'] as const;
      const bgcolorV4Args = ['color', 'transp', 'offset', 'editable', 'show_last', 'title', 'display', 'force_overlay'] as const;
      const barcolorArgs = ['color', 'offset', 'editable', 'show_last', 'title', 'display', 'transp'] as const;
      const markerArgs = funcName === 'plotchar'
        ? ['series', 'title', 'char', 'location', 'color', 'offset', 'text', 'textcolor', 'editable', 'size', 'show_last', 'display', 'format', 'precision', 'force_overlay', 'transp'] as const
        : ['series', 'title', 'style', 'location', 'color', 'offset', 'text', 'textcolor', 'editable', 'size', 'show_last', 'display', 'format', 'precision', 'force_overlay', 'transp'] as const;
      const markerV4Args = funcName === 'plotchar'
        ? ['series', 'title', 'char', 'location', 'color', 'transp', 'offset', 'text', 'textcolor', 'editable', 'size', 'show_last', 'display', 'format', 'precision', 'force_overlay'] as const
        : ['series', 'title', 'style', 'location', 'color', 'transp', 'offset', 'text', 'textcolor', 'editable', 'size', 'show_last', 'display', 'format', 'precision', 'force_overlay'] as const;
      const plotarrowArgs = ['series', 'title', 'colorup', 'colordown', 'offset', 'minheight', 'maxheight', 'editable', 'show_last', 'display', 'format', 'precision', 'force_overlay', 'transp'] as const;
      const plotarrowV4Args = ['series', 'title', 'colorup', 'colordown', 'transp', 'offset', 'minheight', 'maxheight', 'editable', 'show_last', 'display', 'format', 'precision', 'force_overlay'] as const;
      const plotbarArgs = ['open', 'high', 'low', 'close', 'title', 'color', 'editable', 'show_last', 'display', 'format', 'precision', 'force_overlay', 'transp'] as const;
      const plotcandleArgs = ['open', 'high', 'low', 'close', 'title', 'color', 'wickcolor', 'editable', 'show_last', 'bordercolor', 'display', 'format', 'precision', 'force_overlay', 'transp'] as const;
      const visualPineVersion = compiled.analysis.pineVersion;
      const activePlotArgs = visualPineVersion <= 4 ? plotV4Args : plotArgs;
      const defaultFillArgs = visualPineVersion <= 4 ? fillV4Args : fillArgs;
      const activeBgcolorArgs = visualPineVersion <= 4 ? bgcolorV4Args : bgcolorArgs;
      const activeMarkerArgs = visualPineVersion <= 4 ? markerV4Args : markerArgs;
      const activePlotarrowArgs = visualPineVersion <= 4 ? plotarrowV4Args : plotarrowArgs;

      if (funcName === 'hline') {
        let arr = plotArrays.get(index);
        const price = toOptionalNumber(plotArg(value, named, extraArgs, hlineArgs, 'price'));
        if (!arr) {
          const title = String(plotArg(value, named, extraArgs, hlineArgs, 'title', 'HLine'));
          const plotId = visualOutputId('hline', `hline_${funcCallIndex}`, `hline_${title}`);
          ctx.registerPlot({
            id: plotId,
            type: 'hline',
            title,
            color: toPlotColor(plotArg(value, named, extraArgs, hlineArgs, 'color', '#787B86')) ?? [],
            linewidth: toOptionalNumber(plotArg(value, named, extraArgs, hlineArgs, 'linewidth', 1)),
            lineStyle: normalizeRuntimePlotLineStyle(plotArg(value, named, extraArgs, hlineArgs, 'linestyle', 'solid')),
            editable: toOptionalBoolean(plotArg(value, named, extraArgs, hlineArgs, 'editable', true)),
            display: toOptionalDisplay(plotArg(value, named, extraArgs, hlineArgs, 'display', 'display.all')),
            price,
          });
          plotRegistered.set(index, plotId);
          arr = ctx.plots.get(plotId)!.values;
          plotArrays.set(index, arr);
        }
        setPlotArrayValueAtBar(arr, barCtx.barIndex, price ?? null);
        return plotRegistered.get(index);
      }

      if (funcName === 'fill') {
        let arr = plotArrays.get(index);
        const canonicalNamed = { ...named };
        if (!Object.prototype.hasOwnProperty.call(canonicalNamed, 'plot1') && Object.prototype.hasOwnProperty.call(canonicalNamed, 'hline1')) {
          canonicalNamed.plot1 = canonicalNamed.hline1;
        }
        if (!Object.prototype.hasOwnProperty.call(canonicalNamed, 'plot2') && Object.prototype.hasOwnProperty.call(canonicalNamed, 'hline2')) {
          canonicalNamed.plot2 = canonicalNamed.hline2;
        }
        const thirdArg = plotArg(value, canonicalNamed, extraArgs, defaultFillArgs, 'color');
        const isGradient = ['top_value', 'bottom_value', 'top_color', 'bottom_color'].some((name) =>
          Object.prototype.hasOwnProperty.call(canonicalNamed, name),
        ) || (extraArgs.length >= 5 && typeof thirdArg === 'number'
          && typeof extraArgs[2] === 'number');
        const plot1Id = resolveLegacyPlotReference(plotArg(value, canonicalNamed, extraArgs, defaultFillArgs, 'plot1'));
        const plot2Id = resolveLegacyPlotReference(plotArg(value, canonicalNamed, extraArgs, defaultFillArgs, 'plot2'));
        const isHlineFill = plot1Id !== undefined && ctx.plots.get(plot1Id)?.type === 'hline';
        const args = isGradient
          ? ['plot1', 'plot2', 'top_value', 'bottom_value', 'top_color', 'bottom_color', 'title', 'display', 'fillgaps', 'editable']
          : visualPineVersion > 4 && isHlineFill ? hlineFillArgs : defaultFillArgs;
        const titleArg = plotArg(value, canonicalNamed, extraArgs, args, 'title');
        const hasExplicitTitle = Object.prototype.hasOwnProperty.call(canonicalNamed, 'title') || titleArg !== undefined;
        const title = String(titleArg ?? 'Fill');
        if (!arr) {
          const legacyId = hasExplicitTitle ? `fill_${title}` : `fill_fill_${funcCallIndex}`;
          const plotId = visualOutputId('fill', `fill_${funcCallIndex}`, legacyId);
          ctx.registerPlot({
            id: plotId,
            type: 'fill',
            title,
            color: [],
            gradient: isGradient ? { topValues: [], bottomValues: [], topColors: [], bottomColors: [] } : undefined,
            plot1Id,
            plot2Id,
            editable: toOptionalBoolean(plotArg(value, canonicalNamed, extraArgs, args, 'editable', true)),
            showLast: toOptionalNumber(plotArg(value, canonicalNamed, extraArgs, args, 'show_last')),
            fillgaps: toOptionalBoolean(plotArg(value, canonicalNamed, extraArgs, args, 'fillgaps', false)),
            display: toOptionalDisplay(plotArg(value, canonicalNamed, extraArgs, args, 'display', 'display.all')),

          }, compiled.analysis.plotSites.find((site) => site.index === index)?.plotCount);
          plotRegistered.set(index, plotId);
          arr = ctx.plots.get(plotId)!.values;
          plotArrays.set(index, arr);
        }
        const plot = ctx.plots.get(plotRegistered.get(index)!);
        if (plot?.gradient) {
          const topValue = toNumericPlotValue(plotArg(value, canonicalNamed, extraArgs, args, 'top_value'));
          const bottomValue = toNumericPlotValue(plotArg(value, canonicalNamed, extraArgs, args, 'bottom_value'));
          const topColor = toPlotColor(plotArg(value, canonicalNamed, extraArgs, args, 'top_color'));
          const bottomColor = toPlotColor(plotArg(value, canonicalNamed, extraArgs, args, 'bottom_color'));
          setPlotArrayValueAtBar(plot.gradient.topValues, ctx.bar_index, topValue);
          setPlotArrayValueAtBar(plot.gradient.bottomValues, ctx.bar_index, bottomValue);
          setPlotArrayValueAtBar(plot.gradient.topColors, ctx.bar_index, topColor);
          setPlotArrayValueAtBar(plot.gradient.bottomColors, ctx.bar_index, bottomColor);
          setPlotArrayValueAtBar(arr, ctx.bar_index, topValue === null || bottomValue === null || (topColor === null && bottomColor === null) ? null : 1);
          return plotRegistered.get(index);
        }
        const fillColor = toPlotColor(plotArg(value, canonicalNamed, extraArgs, args, 'color', 'rgba(33, 150, 243, 0.2)'));
        const embeddedAlpha = fillColor !== null && /^#[0-9a-fA-F]{8}$/.test(fillColor);
        const color = embeddedAlpha ? fillColor : applyPlotTransparency(
          fillColor,
          plotArg(value, canonicalNamed, extraArgs, args, 'transp', visualPineVersion <= 4 ? 90 : undefined),
        );
        setPlotArrayValueAtBar(ensureColorArray(plot) ?? undefined, ctx.bar_index, color);
        setPlotArrayValueAtBar(arr, ctx.bar_index, color === null ? null : 1);
        return plotRegistered.get(index);
      }

      if (funcName === 'plotshape' || funcName === 'plotchar') {
        let arr = plotArrays.get(index);
        if (!arr) {
          const title = String(plotArg(value, named, extraArgs, activeMarkerArgs, 'title', funcName === 'plotchar' ? 'Char' : 'Shape'));
          const plotId = visualOutputId(funcName, `${funcName}_${funcCallIndex}`, `${funcName}_${title}`);
          ctx.registerPlot({
            id: plotId,
            type: funcName,
            title,
            color: [],
            displayValues: [],
            shape: funcName === 'plotshape' ? normalizeRuntimePlotshapeStyle(plotArg(value, named, extraArgs, activeMarkerArgs, 'style', 'xcross')) : undefined,
            char: funcName === 'plotchar' ? toOptionalString(plotArg(value, named, extraArgs, activeMarkerArgs, 'char', '●')) : undefined,
            location: toOptionalString(plotArg(value, named, extraArgs, activeMarkerArgs, 'location', 'abovebar')) as PlotOutput['location'],
            size: toOptionalString(plotArg(value, named, extraArgs, activeMarkerArgs, 'size', 'auto')) as PlotOutput['size'],
            text: toOptionalString(plotArg(value, named, extraArgs, activeMarkerArgs, 'text', '')),
            textValues: [],
            textColor: toPlotColor(plotArg(value, named, extraArgs, activeMarkerArgs, 'textcolor', '#FFFFFF')) ?? [],
            offset: toOptionalNumber(plotArg(value, named, extraArgs, activeMarkerArgs, 'offset', 0)),
            editable: toOptionalBoolean(plotArg(value, named, extraArgs, activeMarkerArgs, 'editable', true)),
            showLast: toOptionalNumber(plotArg(value, named, extraArgs, activeMarkerArgs, 'show_last')),
            display: toOptionalDisplay(plotArg(value, named, extraArgs, activeMarkerArgs, 'display', 'display.all')),
            format: toOptionalString(plotArg(value, named, extraArgs, activeMarkerArgs, 'format')),
            precision: toOptionalNumber(plotArg(value, named, extraArgs, activeMarkerArgs, 'precision')),
            forceOverlay: toOptionalBoolean(plotArg(value, named, extraArgs, activeMarkerArgs, 'force_overlay', false)),
          });
          plotRegistered.set(index, plotId);
          arr = ctx.plots.get(plotId)!.values;
          plotArrays.set(index, arr);
        }
        const plot = ctx.plots.get(plotRegistered.get(index)!);
        setPlotArrayValueAtBar(plot?.displayValues, ctx.bar_index, typeof value === 'boolean' ? Number(value) : toNumericPlotValue(value));
        const markerValue = toMarkerValue(value, plot?.location);
        const markerColor = applyPlotTransparency(
          toPlotColor(plotArg(value, named, extraArgs, activeMarkerArgs, 'color', '#2196F3')),
          plotArg(value, named, extraArgs, activeMarkerArgs, 'transp'),
        );
        setPlotArrayValueAtBar(ensureColorArray(plot) ?? undefined, ctx.bar_index, markerValue === null ? null : markerColor);
        setPlotTextColorValue(plot, ctx.bar_index, markerValue === null ? null : toPlotColor(plotArg(value, named, extraArgs, activeMarkerArgs, 'textcolor', '#FFFFFF')));
        setPlotTextValue(plot, ctx.bar_index, markerValue === null ? null : toOptionalString(plotArg(value, named, extraArgs, activeMarkerArgs, 'text', '')) ?? '');
        setPlotArrayValueAtBar(arr, ctx.bar_index, markerValue);
        return value;
      }

      if (funcName === 'plotarrow') {
        let arr = plotArrays.get(index);
        if (!arr) {
          const title = String(plotArg(value, named, extraArgs, activePlotarrowArgs, 'title', 'Arrow'));
          const plotId = visualOutputId('plotarrow', `plotarrow_${funcCallIndex}`, `plotarrow_${title}`);
          ctx.registerPlot({
            id: plotId,
            type: 'plotarrow',
            title,
            color: [],
            colorup: [],
            colordown: [],
            location: 'abovebar',
            offset: toOptionalNumber(plotArg(value, named, extraArgs, activePlotarrowArgs, 'offset', 0)),
            minHeight: toOptionalNumber(plotArg(value, named, extraArgs, activePlotarrowArgs, 'minheight', 5)),
            maxHeight: toOptionalNumber(plotArg(value, named, extraArgs, activePlotarrowArgs, 'maxheight', 100)),
            editable: toOptionalBoolean(plotArg(value, named, extraArgs, activePlotarrowArgs, 'editable', true)),
            showLast: toOptionalNumber(plotArg(value, named, extraArgs, activePlotarrowArgs, 'show_last')),
            display: toOptionalDisplay(plotArg(value, named, extraArgs, activePlotarrowArgs, 'display', 'display.all')),
            format: toOptionalString(plotArg(value, named, extraArgs, activePlotarrowArgs, 'format')),
            precision: toOptionalNumber(plotArg(value, named, extraArgs, activePlotarrowArgs, 'precision')),
            forceOverlay: toOptionalBoolean(plotArg(value, named, extraArgs, activePlotarrowArgs, 'force_overlay', false)),
          });
          plotRegistered.set(index, plotId);
          arr = ctx.plots.get(plotId)!.values;
          plotArrays.set(index, arr);
        }
        const series = typeof value === 'number' ? value : NaN;
        const colorup = applyPlotTransparency(
          toPlotColor(plotArg(value, named, extraArgs, activePlotarrowArgs, 'colorup', '#4CAF50')),
          plotArg(value, named, extraArgs, activePlotarrowArgs, 'transp'),
        );
        const colordown = applyPlotTransparency(
          toPlotColor(plotArg(value, named, extraArgs, activePlotarrowArgs, 'colordown', '#F23645')),
          plotArg(value, named, extraArgs, activePlotarrowArgs, 'transp'),
        );
        const plot = ctx.plots.get(plotRegistered.get(index)!);
        setPlotArrayValueAtBar(ensureColorArray(plot) ?? undefined, ctx.bar_index, Number.isFinite(series) && series !== 0 ? (series > 0 ? colorup : colordown) : null);
        if (plot && Array.isArray(plot.colorup)) setPlotArrayValueAtBar(plot.colorup, ctx.bar_index, Number.isFinite(series) && series > 0 ? colorup : null);
        if (plot && Array.isArray(plot.colordown)) setPlotArrayValueAtBar(plot.colordown, ctx.bar_index, Number.isFinite(series) && series < 0 ? colordown : null);
        setPlotArrayValueAtBar(arr, ctx.bar_index, Number.isFinite(series) && series !== 0 ? series : null);
        return value;
      }

      if (funcName === 'bgcolor' || funcName === 'barcolor') {
        const args = funcName === 'bgcolor' ? activeBgcolorArgs : barcolorArgs;
        let arr = plotArrays.get(index);
        if (!arr) {
          const defaultTitle = funcName === 'barcolor' ? `${funcName}_${funcCallIndex}` : funcName;
          const title = String(plotArg(value, named, extraArgs, args, 'title', defaultTitle));
          const plotId = visualOutputId(funcName, `${funcName}_${funcCallIndex}`, `${funcName}_${title}`);
          ctx.registerPlot({
            id: plotId,
            type: funcName,
            title,
            color: [],
            offset: toOptionalNumber(plotArg(value, named, extraArgs, args, 'offset', 0)),
            editable: toOptionalBoolean(plotArg(value, named, extraArgs, args, 'editable', true)),
            showLast: toOptionalNumber(plotArg(value, named, extraArgs, args, 'show_last')),
            display: toOptionalDisplay(plotArg(value, named, extraArgs, args, 'display', 'display.all')),
            forceOverlay: funcName === 'bgcolor' ? toOptionalBoolean(plotArg(value, named, extraArgs, activeBgcolorArgs, 'force_overlay', false)) : undefined,
          });
          plotRegistered.set(index, plotId);
          arr = ctx.plots.get(plotId)!.values;
          plotArrays.set(index, arr);
        }
        const baseColor = toPlotColor(plotArg(value, named, extraArgs, args, 'color'));
        const legacyBgcolor = funcName === 'bgcolor' && visualPineVersion === 4;
        // v4 defaults bgcolor transparency to 90. Embedded alpha takes
        // precedence over transp, including its omitted default.
        const color = legacyBgcolor && baseColor !== null && /^#[0-9a-fA-F]{8}$/.test(baseColor)
          ? baseColor
          : applyPlotTransparency(baseColor, plotArg(value, named, extraArgs, args, 'transp', legacyBgcolor ? 90 : undefined));
        const offset = Math.trunc(toRuntimeNumber(plotArg(value, named, extraArgs, args, 'offset', 0)));
        const targetBar = ctx.bar_index;
        const plot = ctx.plots.get(plotRegistered.get(index)!);
        if (plot) plot.offset = Number.isFinite(offset) ? offset : 0;
        setPlotArrayValueAtBar(ensureColorArray(plot) ?? undefined, targetBar, color);
        setPlotArrayValueAtBar(arr, targetBar, funcName === 'bgcolor' && color !== null ? 1 : null);
        return value;
      }

      if (funcName === 'plotbar' || funcName === 'plotcandle') {
        const args = funcName === 'plotbar' ? plotbarArgs : plotcandleArgs;
        let arr = plotArrays.get(index);
        if (!arr) {
          const title = String(plotArg(value, named, extraArgs, args, 'title', `${funcName}_${funcCallIndex}`));
          const plotId = visualOutputId(funcName, `${funcName}_${funcCallIndex}`, `${funcName}_${title}`);
          ctx.registerPlot({
            id: plotId,
            type: funcName,
            title,
            color: [],
            openValues: [],
            highValues: [],
            lowValues: [],
            closeValues: [],
            wickColor: funcName === 'plotcandle' ? [] : undefined,
            borderColor: funcName === 'plotcandle' ? [] : undefined,
            editable: toOptionalBoolean(plotArg(value, named, extraArgs, args, 'editable', true)),
            showLast: toOptionalNumber(plotArg(value, named, extraArgs, args, 'show_last')),
            display: toOptionalDisplay(plotArg(value, named, extraArgs, args, 'display', 'display.all')),
            format: toOptionalString(plotArg(value, named, extraArgs, args, 'format')),
            precision: toOptionalNumber(plotArg(value, named, extraArgs, args, 'precision')),
            forceOverlay: toOptionalBoolean(plotArg(value, named, extraArgs, args, 'force_overlay', false)),
          });
          plotRegistered.set(index, plotId);
          arr = ctx.plots.get(plotId)!.values;
          plotArrays.set(index, arr);
        }

        const open = toNumericPlotValue(plotArg(value, named, extraArgs, args, 'open'));
        const high = toNumericPlotValue(plotArg(value, named, extraArgs, args, 'high'));
        const low = toNumericPlotValue(plotArg(value, named, extraArgs, args, 'low'));
        const close = toNumericPlotValue(plotArg(value, named, extraArgs, args, 'close'));
        const hasGap = open === null || high === null || low === null || close === null;
        const visibleClose = hasGap ? null : close;
        const defaultColor = close !== null && open !== null && close >= open ? '#4CAF50' : '#F23645';
        const transp = plotArg(value, named, extraArgs, args, 'transp');
        const color = applyPlotTransparency(toPlotColor(plotArg(value, named, extraArgs, args, 'color', defaultColor)) ?? defaultColor, transp) ?? defaultColor;
        const visibleColor = hasGap ? null : color;
        const plot = ctx.plots.get(plotRegistered.get(index)!);
        setPlotArrayValueAtBar(plot?.openValues, ctx.bar_index, open);
        setPlotArrayValueAtBar(plot?.highValues, ctx.bar_index, high);
        setPlotArrayValueAtBar(plot?.lowValues, ctx.bar_index, low);
        setPlotArrayValueAtBar(plot?.closeValues, ctx.bar_index, close);
        setPlotArrayValueAtBar(ensureColorArray(plot) ?? undefined, ctx.bar_index, visibleColor);
        if (funcName === 'plotcandle') {
          const wickColor = applyPlotTransparency(toPlotColor(plotArg(value, named, extraArgs, plotcandleArgs, 'wickcolor', color)) ?? color, transp) ?? color;
          const borderColor = applyPlotTransparency(toPlotColor(plotArg(value, named, extraArgs, plotcandleArgs, 'bordercolor', color)) ?? color, transp) ?? color;
          if (plot && Array.isArray(plot.wickColor)) setPlotArrayValueAtBar(plot.wickColor, ctx.bar_index, hasGap ? null : wickColor);
          if (plot && Array.isArray(plot.borderColor)) setPlotArrayValueAtBar(plot.borderColor, ctx.bar_index, hasGap ? null : borderColor);
        }
        setPlotArrayValueAtBar(arr, ctx.bar_index, visibleClose);
        return visibleClose;
      }

      let arr = plotArrays.get(index);
      if (!arr) {
        const titleArg = plotArg(value, named, extraArgs, activePlotArgs, 'title');
        const title = typeof titleArg === 'string' ? titleArg : `Plot ${funcCallIndex + 1}`;
        const legacyId = typeof titleArg === 'string' ? `plot_${title}` : `plot_untitled_${funcCallIndex}`;
        const plotId = visualOutputId('plot', `plot_${funcCallIndex}`, legacyId);
        const color = applyPlotTransparency(
          toPlotColor(plotArg(value, named, extraArgs, activePlotArgs, 'color', 'blue')),
          plotArg(value, named, extraArgs, activePlotArgs, 'transp'),
        );
        plotColors.set(index, color);

        ctx.registerPlot({
          id: plotId,
          type: funcName as PlotOutput['type'],
          title,
          color: [],
          linewidth: toOptionalNumber(plotArg(value, named, extraArgs, activePlotArgs, 'linewidth', 1)),
          style: normalizeRuntimePlotStyle(
            plotArg(value, named, extraArgs, activePlotArgs, 'style', 'plot.style_line'),
            versionRules.columnsStyleNumericValue,
          ),
          offset: toOptionalNumber(plotArg(value, named, extraArgs, activePlotArgs, 'offset', 0)),
          trackprice: toOptionalBoolean(plotArg(value, named, extraArgs, activePlotArgs, 'trackprice', false)),
          histbase: toOptionalNumber(plotArg(value, named, extraArgs, activePlotArgs, 'histbase', 0)),
          join: toOptionalBoolean(plotArg(value, named, extraArgs, activePlotArgs, 'join', false)),
          editable: toOptionalBoolean(plotArg(value, named, extraArgs, activePlotArgs, 'editable', true)),
          showLast: toOptionalNumber(plotArg(value, named, extraArgs, activePlotArgs, 'show_last')),
          display: toOptionalDisplay(plotArg(value, named, extraArgs, activePlotArgs, 'display', 'display.all')),
          format: toOptionalString(plotArg(value, named, extraArgs, activePlotArgs, 'format')),
          precision: toOptionalNumber(plotArg(value, named, extraArgs, activePlotArgs, 'precision')),
          forceOverlay: toOptionalBoolean(plotArg(value, named, extraArgs, activePlotArgs, 'force_overlay', false)),
          lineStyle: normalizeRuntimePlotLineStyle(plotArg(value, named, extraArgs, activePlotArgs, 'linestyle', 'plot.linestyle_solid')),
        });
        plotRegistered.set(index, plotId);
        const plot = ctx.plots.get(plotId);
        arr = plot!.values;
        plotArrays.set(index, arr);
      }

      const plot = ctx.plots.get(plotRegistered.get(index)!);
      if (funcName === 'plot' && visualPineVersion === 5 && plot) {
        // Legacy v5 applies the last calculated offset to the entire plot.
        // Other visual members and v3/v4 need their own rendering evidence.
        // https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#no-series-offset-values
        plot.offset = toOptionalNumber(plotArg(value, named, extraArgs, activePlotArgs, 'offset', 0));
      }
      setPlotArrayValueAtBar(ensureColorArray(plot) ?? undefined, ctx.bar_index, applyPlotTransparency(
        toPlotColor(plotArg(value, named, extraArgs, activePlotArgs, 'color', 'blue')),
        plotArg(value, named, extraArgs, activePlotArgs, 'transp'),
      ));
      const numValue = toPlotValue(value);
      const visibleValue = funcName === 'plot' && numValue !== null && Math.abs(numValue) >= 1e100 ? null : numValue;
      setPlotArrayValueAtBar(arr, ctx.bar_index, visibleValue);
      return plotRegistered.get(index);
    },

    input(id: string, funcName: string, defval: unknown, named: Record<string, unknown>, extraArgs: unknown[]) {
      const cached = id === 'unknown' ? undefined : inputCallCache.get(id);
      if (cached && cached.type !== 'source' && named.__tealscriptStaticTitle !== false) {
        const userValue = inputs?.get(cached.inputId) ?? inputs?.get(id);
        const defaultValue = Object.prototype.hasOwnProperty.call(named, 'defval') ? named.defval : defval;
        return userValue === undefined ? defaultValue : userValue;
      }
      const args = [defval, ...extraArgs];
      const inputArg = (names: readonly string[], index: number, fallback?: unknown) =>
        orderedRuntimeArg(args, named, names, index, fallback);
      const optionalNumber = (names: readonly string[], index: number): number | undefined => {
        const value = inputArg(names, index);
        if (value === undefined) return undefined;
        const number = toRuntimeNumber(value);
        return Number.isFinite(number) ? number : undefined;
      };
      const optionalString = (names: readonly string[], index: number): string | undefined => {
        const value = inputArg(names, index);
        return value === undefined || isRuntimeNa(value) ? undefined : toRuntimeString(value);
      };
      const optionalBoolean = (names: readonly string[], index: number): boolean | undefined => {
        const value = inputArg(names, index);
        return value === undefined ? undefined : isRuntimeTruthy(value);
      };
      const inputRangeArgs = ['defval', 'title', 'minval', 'maxval', 'step', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'] as const;
      const inputOptionsArgs = ['defval', 'title', 'options', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'] as const;
      const inputSimpleArgs = ['defval', 'title', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'] as const;
      const inputSourceArgs = ['defval', 'title', 'tooltip', 'inline', 'group', 'display', 'active', 'confirm'] as const;
      const inputTextAreaArgs = ['defval', 'title', 'tooltip', 'group', 'confirm', 'display', 'active'] as const;
      const inputBareArgs = ['defval', 'title', 'tooltip', 'inline', 'group', 'display', 'active'] as const;
      const inputGenericSourceArgs = ['defval', 'title', 'inline', 'group', 'tooltip', 'display', 'active'] as const;
      const legacyInputArgs = ['defval', 'title', 'type', 'minval', 'maxval', 'confirm', 'step', 'options', 'tooltip', 'inline', 'group', 'display', 'active'] as const;
      const explicitType = funcName === 'input'
        ? normalizeRuntimeInputType(inputArg(legacyInputArgs, 2))
        : normalizeRuntimeInputType(funcName.replace('input.', ''));
      const hasGenericSourceDefval = funcName === 'input' && typeof named.__tealscriptInputDefaultSource === 'string';
      const inferredType = funcName === 'input' ? normalizeRuntimeInputType(named.__tealscriptInputDefaultType) : undefined;
      const defaultInputType = explicitType ?? (hasGenericSourceDefval ? 'source' : inferredType ?? inferRuntimeInputType(inputArg(inputSimpleArgs, 0)));
      const type = defaultInputType;
      const legacy = funcName === 'input' && explicitType !== undefined;
      const hasOptions = legacy
        ? toInputOptions(inputArg(legacyInputArgs, 7)) !== undefined
        : Object.prototype.hasOwnProperty.call(named, 'options') || toInputOptions(inputArg(inputOptionsArgs, 2)) !== undefined;
      const genericInputArgs = hasGenericSourceDefval && versionRules.usesSourceGenericInputMetadataOrder
        ? inputGenericSourceArgs
        : inputBareArgs;
      const metadataNames: readonly string[] = legacy
        ? legacyInputArgs
        : (funcName === 'input' ? genericInputArgs : funcName === 'input.text_area' ? inputTextAreaArgs : funcName === 'input.source' ? inputSourceArgs : undefined)
          ?? ((type === 'int' || type === 'float')
            ? (hasOptions ? inputOptionsArgs : inputRangeArgs)
            : (type === 'string' || type === 'timeframe' || type === 'session' || type === 'enum'
              ? (hasOptions ? inputOptionsArgs : inputSimpleArgs)
              : inputSimpleArgs));
      const defaultValue = inputArg(metadataNames, 0);
      const title = toRuntimeString(inputArg(metadataNames, 1, named.__tealscriptInputDefaultTitle ?? type));
      const inputDefaultValue = type === 'color' ? toPlotColor(defaultValue) ?? defaultValue : defaultValue;
      const metadata: Partial<InputDefinition> = {
        tooltip: optionalString(metadataNames, metadataNames.indexOf('tooltip')),
        inline: optionalString(metadataNames, metadataNames.indexOf('inline')),
        group: optionalString(metadataNames, metadataNames.indexOf('group')),
        confirm: funcName === 'input' && !legacy ? undefined : (optionalBoolean(metadataNames, metadataNames.indexOf('confirm')) ?? false),
        display: normalizeRuntimeInputDisplay(inputArg(metadataNames, metadataNames.indexOf('display'), defaultRuntimeInputDisplay(type))),
        active: inputArg(metadataNames, metadataNames.indexOf('active'), true),
      };
      const options = inputArg(metadataNames, legacy ? 7 : 2);
      if (type === 'int' || type === 'float' || type === 'string' || type === 'timeframe' || type === 'session' || type === 'enum') {
        metadata.options = toInputOptions(options);
      }
      const supportsRangeMetadata = legacy || funcName !== 'input';
      if (supportsRangeMetadata && !hasOptions && (type === 'int' || type === 'float')) {
        metadata.minval = optionalNumber(metadataNames, legacy ? 3 : 2);
        metadata.maxval = optionalNumber(metadataNames, legacy ? 4 : 3);
        metadata.step = optionalNumber(metadataNames, legacy ? 6 : 4) ?? 1;
      }
      const baseInputId = `input_${title}`;
      const staticTitle = named.__tealscriptStaticTitle !== false;
      let inputId = baseInputId;
      if (staticTitle) {
        inputId = inputCallSiteIds.get(id) ?? inputId;
        if (inputId === baseInputId && !inputCallSiteIds.has(id)) {
          inputId = inputDefs.has(baseInputId) ? `${baseInputId}_${id}` : baseInputId;
          inputCallSiteIds.set(id, inputId);
        }
      }

      if (!inputDefs.has(inputId)) {
        validateCompiledInputDefault(type, inputDefaultValue, metadata);
        const inputDefinition: InputDefinition = {
          id: inputId,
          type,
          title,
          defval: inputDefaultValue,
          ...metadata,
        };
        const mutableInputDefinition = inputDefinition as unknown as Record<string, unknown>;
        for (const key of Object.keys(inputDefinition)) {
          if (mutableInputDefinition[key] === undefined) {
            delete mutableInputDefinition[key];
          }
        }
        inputDefs.set(inputId, inputDefinition);
      }

      if (id !== 'unknown') inputCallCache.set(id, { inputId, type });
      const userValue = inputs?.get(inputId) ?? inputs?.get(id);
      if (userValue !== undefined) {
        return type === 'source' ? resolveRuntimeInputSource(userValue, ctx) : userValue;
      }

      return defaultValue;
    },

      strategyEntry(...args: unknown[]) {
        if (!isStrategy) return;
        const { pos, named } = splitCompiledStrategyArgs(args);
        if ('when' in named && !isRuntimeTruthy(named.when)) return;
        const id = String(compiledOrderedArg(pos, named, COMPILED_STRATEGY_ORDER_ARGS, 0, '') ?? '');
        const direction = normalizeDirection(compiledOrderedArg(pos, named, COMPILED_STRATEGY_ORDER_ARGS, 1));
        const rawQty = toOptionalNumber(compiledOrderedArg(pos, named, COMPILED_STRATEGY_ORDER_ARGS, 2));
        const qtyType = rawQty === undefined ? ledger.settings.defaultQtyType : 'fixed' as const;
        const qtyValue = rawQty ?? ledger.settings.defaultQtyValue;
        const limitPrice = toOptionalNumber(compiledOrderedArg(pos, named, COMPILED_STRATEGY_ORDER_ARGS, 3));
        const stopPrice = toOptionalNumber(compiledOrderedArg(pos, named, COMPILED_STRATEGY_ORDER_ARGS, 4));
        const ocaName = toOptionalString(compiledOrderedArg(pos, named, COMPILED_STRATEGY_ORDER_ARGS, 5));
        const ocaType = normalizeOptionalCompiledStrategyOcaType(compiledOrderedArg(pos, named, COMPILED_STRATEGY_ORDER_ARGS, 6));
        const comment = toOptionalString(compiledOrderedArg(pos, named, COMPILED_STRATEGY_ORDER_ARGS, 7));
        const alertMessage = toOptionalString(compiledOrderedArg(pos, named, COMPILED_STRATEGY_ORDER_ARGS, 8));
        const disableAlert = isRuntimeTruthy(compiledOrderedArg(pos, named, COMPILED_STRATEGY_ORDER_ARGS, 9, false));
        if (!id || !Number.isFinite(qtyValue) || qtyValue <= 0) return;
        const hasPendingSameId = ledger.orders.some((order) => (
          order.status === 'pending'
          && order.isEntry
          && order.id === id
        ));
        if (!hasPendingSameId && !canSubmitCompiledStrategyEntry(ledger, direction)) return;
        if (hasReachedStrategyOrderRiskLimit(ledger, bar.time)) return;
        let requestedQty = resolveCompiledStrategyOrderQty(ledger, qtyType, qtyValue, limitPrice, stopPrice, bar.close);
        let orderQty = requestedQty;
        if (isCompiledStrategyEntryDirectionRestricted(ledger, direction)) {
          const closeOnlyQty = resolveCompiledRestrictedStrategyEntryCloseQty(ledger, direction);
          if (closeOnlyQty <= 0) return;
          requestedQty = 0;
          orderQty = closeOnlyQty;
        } else {
          requestedQty = applyCompiledStrategyMaxPositionSize(ledger, direction, requestedQty);
          if (!Number.isFinite(requestedQty) || requestedQty <= 0) return;
          orderQty = ledger.position.direction !== null && ledger.position.direction !== direction
            ? Math.abs(ledger.position.size) + requestedQty
            : requestedQty;
        }
        const order = submitOrReplaceStrategyEntryOrder(ledger, {
          id, direction, qty: orderQty, qtyType, qtyValue,
          isEntry: true, requestedQty,
          limitPrice, stopPrice, ocaName, ocaType, comment, alertMessage, disableAlert,
          barIndex, time: bar.time,
        });
        if (ledger.settings.processOrdersOnClose) {
          fillStrategyMarketOrder(ledger, order, bar.close, barIndex, bar.time, mintick);
          markStrategyLedgerToMarket(ledger, bar.close, bar.close, bar.close, { barIndex, time: bar.time });
        }
      },
      strategyOrder(...args: unknown[]) {
        if (!isStrategy) return;
        const { pos, named } = splitCompiledStrategyArgs(args);
        if ('when' in named && !isRuntimeTruthy(named.when)) return;
        const id = String(compiledOrderedArg(pos, named, COMPILED_STRATEGY_ORDER_ARGS, 0, '') ?? '');
        const direction = normalizeDirection(compiledOrderedArg(pos, named, COMPILED_STRATEGY_ORDER_ARGS, 1));
        const rawQty = toOptionalNumber(compiledOrderedArg(pos, named, COMPILED_STRATEGY_ORDER_ARGS, 2));
        const qtyType = rawQty === undefined ? ledger.settings.defaultQtyType : 'fixed' as const;
        const qtyValue = rawQty ?? ledger.settings.defaultQtyValue;
        const limitPrice = toOptionalNumber(compiledOrderedArg(pos, named, COMPILED_STRATEGY_ORDER_ARGS, 3));
        const stopPrice = toOptionalNumber(compiledOrderedArg(pos, named, COMPILED_STRATEGY_ORDER_ARGS, 4));
        const ocaName = toOptionalString(compiledOrderedArg(pos, named, COMPILED_STRATEGY_ORDER_ARGS, 5));
        const ocaType = normalizeOptionalCompiledStrategyOcaType(compiledOrderedArg(pos, named, COMPILED_STRATEGY_ORDER_ARGS, 6));
        const comment = toOptionalString(compiledOrderedArg(pos, named, COMPILED_STRATEGY_ORDER_ARGS, 7));
        const alertMessage = toOptionalString(compiledOrderedArg(pos, named, COMPILED_STRATEGY_ORDER_ARGS, 8));
        const disableAlert = isRuntimeTruthy(compiledOrderedArg(pos, named, COMPILED_STRATEGY_ORDER_ARGS, 9, false));
        if (!id || !Number.isFinite(qtyValue) || qtyValue <= 0) return;
        if (hasReachedStrategyOrderRiskLimit(ledger, bar.time)) return;
        const requestedQty = resolveCompiledStrategyOrderQty(ledger, qtyType, qtyValue, limitPrice, stopPrice, bar.close);
        if (!Number.isFinite(requestedQty) || requestedQty <= 0) return;
        const order = submitStrategyOrder(ledger, {
          id, direction, qty: requestedQty, qtyType, qtyValue,
          isEntry: false, requestedQty,
          limitPrice, stopPrice, ocaName, ocaType, comment, alertMessage, disableAlert,
          barIndex, time: bar.time,
        });
        if (ledger.settings.processOrdersOnClose) {
          fillStrategyMarketOrder(ledger, order, bar.close, barIndex, bar.time, mintick);
          markStrategyLedgerToMarket(ledger, bar.close, bar.close, bar.close, { barIndex, time: bar.time });
        }
      },
      strategyExit(...args: unknown[]) {
        if (!isStrategy) return;
        const { pos, named } = splitCompiledStrategyArgs(args);
        if ('when' in named && !isRuntimeTruthy(named.when)) return;
        const id = String(compiledOrderedArg(pos, named, COMPILED_STRATEGY_EXIT_ARGS, 0, '') ?? '');
        const fromEntry = toOptionalString(compiledOrderedArg(pos, named, COMPILED_STRATEGY_EXIT_ARGS, 1));
        const openTrades = ledger.openTrades.filter((t) => fromEntry === undefined || t.entryOrderId === fromEntry);
        if (openTrades.length === 0) return;
        if (!id) return;
        const exitDir: StrategyDirection = openTrades[0].direction === 'long' ? 'short' : 'long';
        const openQty = openTrades.reduce((t, tr) => t + tr.qty, 0);
        const qty = resolveCompiledStrategyCloseQty(
          openQty,
          toOptionalNumber(compiledOrderedArg(pos, named, COMPILED_STRATEGY_EXIT_ARGS, 2)),
          toOptionalNumber(compiledOrderedArg(pos, named, COMPILED_STRATEGY_EXIT_ARGS, 3)),
        );
        if (qty <= 0) return;
        const entryDirection = openTrades[0].direction;
        const profitTicks = toOptionalNumber(compiledOrderedArg(pos, named, COMPILED_STRATEGY_EXIT_ARGS, 4));
        const lossTicks = toOptionalNumber(compiledOrderedArg(pos, named, COMPILED_STRATEGY_EXIT_ARGS, 6));
        const limitPrice = resolveCompiledStrategyExitPairPrice(
          toOptionalNumber(compiledOrderedArg(pos, named, COMPILED_STRATEGY_EXIT_ARGS, 5)),
          resolveCompiledStrategyExitOffsetPrice(entryDirection, openTrades, profitTicks, 'profit', mintick),
          entryDirection, 'profit', compiled.analysis.pineVersion,
        );
        const stopPrice = resolveCompiledStrategyExitPairPrice(
          toOptionalNumber(compiledOrderedArg(pos, named, COMPILED_STRATEGY_EXIT_ARGS, 7)),
          resolveCompiledStrategyExitOffsetPrice(entryDirection, openTrades, lossTicks, 'loss', mintick),
          entryDirection, 'loss', compiled.analysis.pineVersion,
        );
        const trailActivationPrice = resolveCompiledStrategyTrailActivationPrice(
          entryDirection,
          openTrades,
          toOptionalNumber(compiledOrderedArg(pos, named, COMPILED_STRATEGY_EXIT_ARGS, 8)),
          toOptionalNumber(compiledOrderedArg(pos, named, COMPILED_STRATEGY_EXIT_ARGS, 9)),
          mintick,
          compiled.analysis.pineVersion,
        );
        const trailOffsetTicks = toOptionalNumber(compiledOrderedArg(pos, named, COMPILED_STRATEGY_EXIT_ARGS, 10));
        const trailOffset = trailActivationPrice === undefined || trailOffsetTicks === undefined || trailOffsetTicks <= 0
          ? undefined
          : trailOffsetTicks * mintick;
        if (limitPrice === undefined && stopPrice === undefined && trailActivationPrice === undefined) return;
        const comment = toOptionalString(compiledOrderedArg(pos, named, COMPILED_STRATEGY_EXIT_ARGS, 12));
        const alertMessage = toOptionalString(compiledOrderedArg(pos, named, COMPILED_STRATEGY_EXIT_ARGS, 16));
        const disableAlert = isRuntimeTruthy(compiledOrderedArg(pos, named, COMPILED_STRATEGY_EXIT_ARGS, 20, false));
        const exitOrderCount = [limitPrice, stopPrice, trailActivationPrice].filter((value) => value !== undefined).length;
        const suffixOrders = exitOrderCount > 1;
        const explicitOcaName = toOptionalString(compiledOrderedArg(pos, named, COMPILED_STRATEGY_EXIT_ARGS, 11));
        const ocaName = explicitOcaName ?? (suffixOrders ? (fromEntry === undefined ? id : `${fromEntry}:${id}`) : undefined);
        const ocaType = ocaName === undefined ? undefined : 'reduce';
        if (limitPrice !== undefined) {
          submitOrReplaceStrategyExitOrder(ledger, {
            id: suffixOrders ? `${id} Limit` : id, sourceId: id, direction: exitDir, qty, qtyType: 'fixed', qtyValue: qty,
            isExit: true, fromEntry, limitPrice, ocaName, ocaType,
            comment: toOptionalString(compiledOrderedArg(pos, named, COMPILED_STRATEGY_EXIT_ARGS, 13)) ?? comment,
            alertMessage: toOptionalString(compiledOrderedArg(pos, named, COMPILED_STRATEGY_EXIT_ARGS, 17)) ?? alertMessage,
            disableAlert, barIndex, time: bar.time,
          });
        }
        if (stopPrice !== undefined) {
          submitOrReplaceStrategyExitOrder(ledger, {
            id: suffixOrders ? `${id} Stop` : id, sourceId: id, direction: exitDir, qty, qtyType: 'fixed', qtyValue: qty,
            isExit: true, fromEntry, stopPrice, ocaName, ocaType,
            comment: toOptionalString(compiledOrderedArg(pos, named, COMPILED_STRATEGY_EXIT_ARGS, 14)) ?? comment,
            alertMessage: toOptionalString(compiledOrderedArg(pos, named, COMPILED_STRATEGY_EXIT_ARGS, 18)) ?? alertMessage,
            disableAlert, barIndex, time: bar.time,
          });
        }
        if (trailActivationPrice !== undefined && trailOffset !== undefined) {
          submitOrReplaceStrategyExitOrder(ledger, {
            id: suffixOrders ? `${id} Trail` : id, sourceId: id, direction: exitDir, qty, qtyType: 'fixed', qtyValue: qty,
            isExit: true, fromEntry, trailActivationPrice, trailOffset, ocaName, ocaType,
            comment: toOptionalString(compiledOrderedArg(pos, named, COMPILED_STRATEGY_EXIT_ARGS, 15)) ?? comment,
            alertMessage: toOptionalString(compiledOrderedArg(pos, named, COMPILED_STRATEGY_EXIT_ARGS, 19)) ?? alertMessage,
            disableAlert, barIndex, time: bar.time,
          });
        }
      },
      strategyClose(...args: unknown[]) {
        if (!isStrategy) return;
        const { pos, named } = splitCompiledStrategyArgs(args);
        if ('when' in named && !isRuntimeTruthy(named.when)) return;
        const entryId = String(compiledOrderedArg(pos, named, COMPILED_STRATEGY_CLOSE_ARGS, 0, '') ?? '');
        const matchingTrades = ledger.openTrades.filter((t) => t.entryOrderId === entryId);
        if (matchingTrades.length === 0) return;
        const exitDir: StrategyDirection = matchingTrades[0].direction === 'long' ? 'short' : 'long';
        const openQty = matchingTrades.reduce((t, tr) => t + tr.qty, 0);
        const qty = resolveCompiledStrategyCloseQty(
          openQty,
          toOptionalNumber(compiledOrderedArg(pos, named, COMPILED_STRATEGY_CLOSE_ARGS, 2)),
          toOptionalNumber(compiledOrderedArg(pos, named, COMPILED_STRATEGY_CLOSE_ARGS, 3)),
        );
        if (qty <= 0) return;
        const order = submitStrategyOrder(ledger, {
          id: `Close ${entryId}`, direction: exitDir, qty, qtyType: 'fixed', qtyValue: qty,
          isExit: true, fromEntry: entryId,
          comment: toOptionalString(compiledOrderedArg(pos, named, COMPILED_STRATEGY_CLOSE_ARGS, 1)),
          alertMessage: toOptionalString(compiledOrderedArg(pos, named, COMPILED_STRATEGY_CLOSE_ARGS, 4)),
          disableAlert: isRuntimeTruthy(compiledOrderedArg(pos, named, COMPILED_STRATEGY_CLOSE_ARGS, 6, false)),
          barIndex, time: bar.time,
        });
        if (ledger.settings.processOrdersOnClose || isRuntimeTruthy(compiledOrderedArg(pos, named, COMPILED_STRATEGY_CLOSE_ARGS, 5, false))) {
          fillStrategyMarketOrder(ledger, order, bar.close, barIndex, bar.time, mintick);
          markStrategyLedgerToMarket(ledger, bar.close, bar.close, bar.close, { barIndex, time: bar.time });
        }
      },
      strategyCloseAll(...args: unknown[]) {
        if (!isStrategy) return;
        const { pos, named } = splitCompiledStrategyArgs(args);
        if ('when' in named && !isRuntimeTruthy(named.when)) return;
        const comment = toOptionalString(compiledOrderedArg(pos, named, COMPILED_STRATEGY_CLOSE_ALL_ARGS, 0));
        const openTrades = ledger.openTrades;
        if (openTrades.length === 0) return;
        const exitDir: StrategyDirection = openTrades[0].direction === 'long' ? 'short' : 'long';
        const qty = openTrades.reduce((t, tr) => t + tr.qty, 0);
        const order = submitStrategyOrder(ledger, {
          id: 'Close All', direction: exitDir, qty, qtyType: 'fixed', qtyValue: qty,
          isExit: true, comment,
          alertMessage: toOptionalString(compiledOrderedArg(pos, named, COMPILED_STRATEGY_CLOSE_ALL_ARGS, 1)),
          disableAlert: isRuntimeTruthy(compiledOrderedArg(pos, named, COMPILED_STRATEGY_CLOSE_ALL_ARGS, 3, false)),
          barIndex, time: bar.time,
        });
        if (ledger.settings.processOrdersOnClose || isRuntimeTruthy(compiledOrderedArg(pos, named, COMPILED_STRATEGY_CLOSE_ALL_ARGS, 2, false))) {
          fillStrategyMarketOrder(ledger, order, bar.close, barIndex, bar.time, mintick);
          markStrategyLedgerToMarket(ledger, bar.close, bar.close, bar.close, { barIndex, time: bar.time });
        }
      },
      strategyCancel(...args: unknown[]) {
        if (!isStrategy) return;
        const { pos, named } = splitCompiledStrategyArgs(args);
        if (named?.when !== undefined && !isRuntimeTruthy(named.when)) return;
        const id = String(compiledOrderedArg(pos, named, ['id'], 0, '') ?? '');
        if (id) cancelStrategyOrder(ledger, id, barIndex, bar.time);
      },
      strategyCancelAll(...args: unknown[]) {
        if (!isStrategy) return;
        const { named } = splitCompiledStrategyArgs(args);
        if (named?.when !== undefined && !isRuntimeTruthy(named.when)) return;
        cancelAllStrategyOrders(ledger, barIndex, bar.time);
      },
      strategyDefaultEntryQty(args: unknown[], named?: Record<string, unknown>) {
        if (!isStrategy) return 0;
        const fillPrice = toOptionalNumber(compiledOrderedArg(args, named, ['fill_price'], 0));
        if (fillPrice === undefined || !Number.isFinite(fillPrice) || fillPrice <= 0) return NaN;
        return resolveCompiledStrategyOrderQty(
          ledger,
          ledger.settings.defaultQtyType,
          ledger.settings.defaultQtyValue,
          fillPrice,
          undefined,
          bar.close,
        );
      },
      strategyConvertToAccount(args: unknown[], named?: Record<string, unknown>) {
        if (!isStrategy) return NaN;
        const value = toRuntimeNumber(compiledOrderedArg(args, named, ['value'], 0));
        if (!Number.isFinite(value)) return NaN;
        const symbolCurrency = normalizeRuntimeRequestCurrency(ctx.syminfo.currency);
        const accountCurrency = strategyAccountCurrency();
        if (!symbolCurrency || !accountCurrency) return NaN;
        return value * strategyCurrencyRate(symbolCurrency, accountCurrency);
      },
      strategyConvertToSymbol(args: unknown[], named?: Record<string, unknown>) {
        if (!isStrategy) return NaN;
        const value = toRuntimeNumber(compiledOrderedArg(args, named, ['value'], 0));
        if (!Number.isFinite(value)) return NaN;
        const symbolCurrency = normalizeRuntimeRequestCurrency(ctx.syminfo.currency);
        const accountCurrency = strategyAccountCurrency();
        if (!symbolCurrency || !accountCurrency) return NaN;
        return value / strategyCurrencyRate(symbolCurrency, accountCurrency);
      },
      strategyProp(name: string) {
        return readStrategyProp(name);
      },
      strategyPropHistory(name: string, offset: unknown) {
        const numericOffset = toRuntimeNumber(offset);
        const index = Number.isFinite(numericOffset) ? Math.trunc(numericOffset) : Number.NaN;
        return strategyPropSeries(name).get(index);
      },
      strategyTradeProp(name: string, args: unknown[], named?: Record<string, unknown>) {
        const indexValue = compiledOrderedArg(args, named, ['trade_num'], 0);
        const index = toOptionalNumber(indexValue);
        if (index === undefined || index < 0 || !Number.isInteger(index)) return NaN;
        const open = name.startsWith('strategy.opentrades.');
        const trade = open ? ledger.openTrades[index] : ledger.closedTrades[index];
        if (!trade) return NaN;
        const field = name.split('.').pop() ?? '';
        if (field === 'entry_id') return trade.entryOrderId;
        if (field === 'entry_comment') return trade.entryComment ?? '';
        if (field === 'exit_id') return trade.exitOrderId ?? '';
        if (field === 'exit_comment') return trade.exitComment ?? '';
        if (field === 'entry_price') return trade.entryPrice;
        if (field === 'exit_price') return trade.exitPrice ?? NaN;
        if (field === 'entry_bar_index') return trade.entryBarIndex;
        if (field === 'exit_bar_index') return trade.exitBarIndex ?? NaN;
        if (field === 'entry_time') return trade.entryTime;
        if (field === 'exit_time') return trade.exitTime ?? NaN;
        if (field === 'size') return trade.direction === 'long' ? trade.qty : -trade.qty;
        if (field === 'profit') return open
          ? (bar.close - trade.entryPrice) * trade.qty * (trade.direction === 'long' ? 1 : -1)
          : trade.profit - trade.commission;
        if (field === 'profit_percent') {
          const profit = open
            ? (bar.close - trade.entryPrice) * trade.qty * (trade.direction === 'long' ? 1 : -1)
            : trade.profit;
          return compiledStrategyTradePercent(trade, profit);
        }
        if (field === 'commission') return trade.commission;
        if (field === 'max_runup') return trade.maxRunup;
        if (field === 'max_drawdown') return trade.maxDrawdown;
        if (field === 'max_runup_percent') return compiledStrategyTradePercent(trade, trade.maxRunup);
        if (field === 'max_drawdown_percent') return compiledStrategyTradePercent(trade, trade.maxDrawdown);
        return NaN;
      },
      strategyRisk(name: string, args: unknown[], named?: Record<string, unknown>) {
        if (!isStrategy) return undefined;
        if (name === 'strategy.risk.allow_entry_in') {
          const value = compiledOrderedArg(args, named, ['value'], 0, 'all');
          ledger.settings.allowedEntryDirection = value === 'long' || value === 'short' ? value : 'all';
          return undefined;
        }
        if (name === 'strategy.risk.max_position_size') {
          ledger.settings.maxPositionSize = compiledPositiveNumber(compiledOrderedArg(args, named, ['contracts'], 0)) ?? null;
          return undefined;
        }
        if (name === 'strategy.risk.max_drawdown') {
          const value = compiledPositiveNumber(compiledOrderedArg(args, named, ['value', 'type', 'alert_message'], 0));
          if (value !== undefined) {
            ledger.settings.riskRules.maxDrawdown = {
              value,
              type: compiledRiskCashOrPercent(compiledOrderedArg(args, named, ['value', 'type', 'alert_message'], 1)),
              alertMessage: toOptionalString(compiledOrderedArg(args, named, ['value', 'type', 'alert_message'], 2)),
            };
          }
          return undefined;
        }
        if (name === 'strategy.risk.max_intraday_loss') {
          const value = compiledPositiveNumber(compiledOrderedArg(args, named, ['value', 'type', 'alert_message'], 0));
          if (value !== undefined) {
            ledger.settings.riskRules.maxIntradayLoss = {
              value,
              type: compiledRiskCashOrPercent(compiledOrderedArg(args, named, ['value', 'type', 'alert_message'], 1)),
              alertMessage: toOptionalString(compiledOrderedArg(args, named, ['value', 'type', 'alert_message'], 2)),
            };
          }
          return undefined;
        }
        if (name === 'strategy.risk.max_intraday_filled_orders') {
          const count = compiledPositiveNumber(compiledOrderedArg(args, named, ['count', 'alert_message'], 0));
          if (count !== undefined) {
            ledger.settings.riskRules.maxIntradayFilledOrders = {
              count,
              alertMessage: toOptionalString(compiledOrderedArg(args, named, ['count', 'alert_message'], 1)),
            };
          }
          return undefined;
        }
        if (name === 'strategy.risk.max_cons_loss_days') {
          const count = compiledPositiveNumber(compiledOrderedArg(args, named, ['count', 'alert_message'], 0));
          if (count !== undefined) {
            ledger.settings.riskRules.maxConsLossDays = {
              count,
              alertMessage: toOptionalString(compiledOrderedArg(args, named, ['count', 'alert_message'], 1)),
            };
          }
        }
        return undefined;
      },

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
      ): unknown {
        if (requestDisabledByDynamicRequests(secId, 'request.security')) return NaN;
        const sourceKey = runtimeSourceDescriptorKey(sourceDescriptor);
        let dispatch = securityDispatchCache.get(secId);
        if (!Object.is(dispatch?.symbol, symbol)) {
          dispatch = securitySymbolDispatchCache.get(secId)?.get(symbol) ?? dispatch;
        }
        if (
          !dispatch
          || !Object.is(dispatch.symbol, symbol)
          || !Object.is(dispatch.timeframe, timeframe)
          || !Object.is(dispatch.gaps, gaps)
          || !Object.is(dispatch.lookahead, lookahead)
          || !Object.is(dispatch.currency, currency)
          || !Object.is(dispatch.calcBarsCount, calcBarsCount)
          || dispatch.sourceKey !== sourceKey
          || !dispatch.matchesCaptures(captures)
        ) {
          const symStr = String(symbol ?? '').trim() || String(ctx.syminfo.tickerid ?? ctx.syminfo.ticker ?? '');
          const tfStr = normalizeRuntimeTimeframePeriod(String(timeframe ?? ''), chartTimeframePeriod);
          const gapsStr = normalizeRuntimeRequestGapsMode(gaps, compiled.analysis.pineVersion);
          const laStr = normalizeRuntimeRequestLookaheadMode(lookahead, compiled.analysis.pineVersion);
          const currencyStr = normalizeRuntimeRequestCurrency(currency);
          const capturesKey = runtimeCapturesKey(captures);
          const calcBars = resolveRequestCalcBars(secId, symStr, tfStr, currencyStr, sourceKey, capturesKey, normalizeRuntimePositiveInteger(calcBarsCount));
          const cacheKey = `${secId}:${symStr}:${tfStr}:${currencyStr ?? ''}:${calcBars ?? ''}:${sourceKey}:${capturesKey}`;
          dispatch = {
            symbol,
            timeframe,
            gaps,
            lookahead,
            currency,
            calcBarsCount,
            sourceKey,
            matchesCaptures: captureDispatchMatcher(captures),
            symStr,
            tfStr,
            gapsStr,
            laStr,
            currencyStr,
            calcBars,
            cacheKey,
            contextKey: `request.security\u0000${secId}\u0000${symStr}\u0000${tfStr}\u0000${currencyStr ?? ''}\u0000${calcBars ?? ''}\u0000${sourceKey}\u0000${runtimeCapturesKey(captures, requestScopeIdentity)}`,
            lowerTimeframeDurationMs: options?.runtime?.timeframe?.period !== undefined
              && isRuntimeLowerTimeframe(tfStr, String(ctx.timeframe.period ?? ''))
              ? chartDuration ?? undefined
              : undefined,
            sameTimeframe: isRuntimeSameTimeframe(tfStr, chartTimeframePeriod),
          };
          if ([symbol, timeframe, gaps, lookahead, currency, calcBarsCount].every((value) =>
            value === null || (typeof value !== 'object' && typeof value !== 'function'))) {
            let symbols = securitySymbolDispatchCache.get(secId);
            if (!symbols) {
              symbols = new Map();
              securitySymbolDispatchCache.set(secId, symbols);
            }
            if (!symbols.has(symbol) && symbols.size >= TEALSCRIPT_MAX_UNIQUE_REQUEST_CONTEXTS) {
              symbols.delete(symbols.keys().next().value);
            }
            symbols.set(symbol, dispatch);
          }
        }
        securityDispatchCache.set(secId, dispatch);
        trackRequestContext(dispatch.contextKey);

        let cached = securityCache.get(dispatch.cacheKey);
        if (!cached) {
          const secScript = compiled.securityScripts.get(secId);
          if (!requestDatafeed) {
            recordRuntimeError('request.security requires a request datafeed');
            return NaN;
          }

          const result = resolveRequestDataset!({
            symbol: dispatch.symStr,
            timeframe: dispatch.tfStr,
            currency: dispatch.currencyStr,
            calcBarsCount: dispatch.calcBars,
          });
          if (!result.ok) {
            if (
              isRuntimeTruthy(ignoreInvalidSymbol)
              && isInvalidOrUnavailableRequestContext(result.code)
            ) {
              return NaN;
            }
            recordRuntimeError(`request.security failed: ${result.message}`);
            return NaN;
          }

          let advance: CachedSecuritySeries['advance'];
          const incremental = secScript?.independentScalarProgram && captures === undefined
            && dispatch.sameTimeframe && result.context.bars.every((requestedBar, index, requestedBars) =>
              Number.isFinite(requestedBar.time) && (index === 0 || requestedBar.time >= requestedBars[index - 1]!.time));
          const values = secScript
            ? evaluateSecuritySeries(
              secScript,
              result.context,
              ctx.syminfo,
              chartTimeframePeriod,
              options?.runtime,
              effectiveMaxBarsBack,
              captures,
              (requestBarIndex, error) => recordSwallowedRuntimeError(
                swallowedErrors,
                `compiled-request-expression:request.security:${secId}`,
                requestBarIndex,
                error,
              ),
              requestDatafeed,
              compiled.securityScripts,
              compiled.analysis.securitySites,
              dynamicRequestsEnabled,
              compiled.analysis.pineVersion,
              history,
              resolveRequestedPointSeries,
              trackFootprintContext,
              undefined,
              resolveRequestDataset,
              incremental ? (progress) => { advance = progress; } : undefined,
              options?.realtimeLastBar ||
                options?.confirmedRealtimeBarIndex !== undefined ||
                options?.confirmedRealtimeBarStartIndex !== undefined
                ? {
                    startTime:
                      bars[
                        options?.confirmedRealtimeBarStartIndex ?? options?.confirmedRealtimeBarIndex ?? bars.length - 1
                      ]!.time,
                    chartTime: bars[bars.length - 1]!.time,
                    chartCloseTime: requestBarCloseTimes({
                      symbol: ctx.syminfo.tickerid ?? '',
                      timeframe: chartTimeframePeriod,
                      syminfo: ctx.syminfo,
                      bars: [bars[bars.length - 1]!],
                    })[0]!,
                    isConfirmed: options?.confirmedRealtimeBarIndex === bars.length - 1,
                    isNew: options?.realtimeLastBar?.isNew ?? false,
                    previousIsNew: options?.realtimeLastBar?.previousIsNew ?? false,
                  }
                : undefined,
            )
            : evaluateRequestedSourceSeries(result.context, sourceDescriptor);
          if (!values) return NaN;
          let closeTimes: number[] | undefined;
          cached = advance ? {
            bars: result.context.bars, values, advance,
            get closeTimes() {
              return (closeTimes ??= requestBarCloseTimes(result.context));
            },
          } : createScalarSecuritySeriesCache(result.context, values);
          securityCache.set(dispatch.cacheKey, cached);
        }

        const chartTime = bar.time;
        if (cached.advance) {
          const previousLength = cached.values.length;
          cached.advance(findActiveRequestBarIndex(cached.bars, chartTime) + 1);
          if (cached.values.length > previousLength && cached.values.length === cached.bars.length
            && cached.values.every(Number.isNaN)) {
            cached = { bars: [], values: [], closeTimes: [] };
            securityCache.set(dispatch.cacheKey, cached);
          }
        }
        const prevBar = barIndex > 0 ? bars[barIndex - 1] : undefined;
        return mergeRequestedValue(
          cached.bars,
          cached.values,
          chartTime,
          prevBar?.time,
          dispatch.gapsStr,
          dispatch.laStr,
          ctx.barstate.isrealtime,
          dispatch.lowerTimeframeDurationMs,
          dispatch.sameTimeframe,
          dispatch.sameTimeframe || dispatch.laStr === 'barmerge.lookahead_on'
            || isRuntimeLowerTimeframe(dispatch.tfStr, chartTimeframePeriod) ? undefined : {
            closeTimes: cached.closeTimes!,
            chartCloseTime: getRuntimeTimeValue(ctx, bars, 'time_close'),
            previousChartCloseTime: prevBar ? getRuntimeTimeValue(ctx, bars, 'time_close', 1) : undefined,
          },
          ctx.barstate.isrealtime,
          cached,
        );
      },

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
      ): unknown {
        if (requestDisabledByDynamicRequests(secId, 'request.security_lower_tf')) return createLowerTimeframeEmptyResult(tupleArity);
        const symStr = String(symbol ?? '').trim() || String(ctx.syminfo.tickerid ?? ctx.syminfo.ticker ?? '');
        const tfStr = normalizeRuntimeTimeframePeriod(String(timeframe ?? ''), chartTimeframePeriod);
        const currencyStr = normalizeRuntimeRequestCurrency(currency);
        const sourceKey = runtimeSourceDescriptorKey(sourceDescriptor);
        const capturesKey = runtimeCapturesKey(captures);
        const calcBars = resolveRequestCalcBars(secId, symStr, tfStr, currencyStr, sourceKey, capturesKey, normalizeRuntimePositiveInteger(calcBarsCount));
        trackRequestContext(`request.security_lower_tf\u0000${secId}\u0000${symStr}\u0000${tfStr}\u0000${currencyStr ?? ''}\u0000${calcBars ?? ''}\u0000${sourceKey}\u0000${runtimeCapturesKey(captures, requestScopeIdentity)}`);

        if ((!isRuntimeLowerTimeframe(tfStr, chartTimeframePeriod)
          && !isRuntimeSameTimeframe(tfStr, chartTimeframePeriod)) || chartDuration === null) {
          if (isRuntimeTruthy(ignoreInvalidTimeframe)) return NaN;
          throwCompiledRuntimeError(`request.security_lower_tf requires a lower timeframe than the chart timeframe: ${tfStr}`);
        }

        const cacheKey = `${secId}:${symStr}:${tfStr}:${currencyStr ?? ''}:${calcBars ?? ''}:${sourceKey}:${capturesKey}`;
        const contextKey = `${secId}:${symStr}:${tfStr}:${currencyStr ?? ''}:${calcBars ?? ''}:${sourceKey}:${runtimeCapturesKey(captures, requestScopeIdentity)}`;
        let cached = securityCache.get(cacheKey) ?? unusedCaptureLowerTimeframeCache.get(contextKey);
        if (!cached) {
          const secScript = compiled.securityScripts.get(secId);
          if (!requestDatafeed) {
            recordRuntimeError('request.security_lower_tf requires a request datafeed');
            return createLowerTimeframeEmptyResult(tupleArity);
          }

          const result = resolveRequestDataset!({
            symbol: symStr,
            timeframe: tfStr,
            calcBarsCount: calcBars,
            currency: currencyStr,
          });
          if (!result.ok) {
            if (
              isRuntimeTruthy(ignoreInvalidSymbol)
              && isInvalidOrUnavailableRequestContext(result.code)
            ) {
              return NaN;
            }
            if (isRuntimeTruthy(ignoreInvalidTimeframe) && result.code === 'invalid_timeframe') {
              return NaN;
            }
            recordRuntimeError(`request.security_lower_tf failed: ${result.message}`);
            return createLowerTimeframeEmptyResult(tupleArity);
          }

          let captureRead = false;
          const values = secScript
            ? evaluateSecuritySeries(
              secScript,
              result.context,
              ctx.syminfo,
              chartTimeframePeriod,
              options?.runtime,
              effectiveMaxBarsBack,
              captures,
              (requestBarIndex, error) => recordSwallowedRuntimeError(
                swallowedErrors,
                `compiled-request-expression:request.security_lower_tf:${secId}`,
                requestBarIndex,
                error,
              ),
              requestDatafeed,
              compiled.securityScripts,
              compiled.analysis.securitySites,
              dynamicRequestsEnabled,
              compiled.analysis.pineVersion,
              history,
              resolveRequestedPointSeries,
              trackFootprintContext,
              () => { captureRead = true; },
              resolveRequestDataset,
            )
            : evaluateRequestedSourceSeries(result.context, sourceDescriptor);
          if (!values) return createLowerTimeframeEmptyResult(tupleArity);
          cached = { bars: result.context.bars, values };
          securityCache.set(cacheKey, cached);
          if (secScript && captures && Object.keys(captures).length > 0 && !captureRead) {
            unusedCaptureLowerTimeframeCache.set(contextKey, cached);
          }
        }

        const chartStart = bar.time;
        const chartEnd = bars[barIndex + 1]?.time ?? chartStart + chartDuration;
        return collectLowerTimeframeValues(cached.bars, cached.values, chartStart, chartEnd, tupleArity, cached);
      },

      requestCurrencyRate(args: unknown[], named?: Record<string, unknown>): unknown {
        return resolveCurrencyRate(args, named, bar.time);
      },

      requestFootprint(args: unknown[], named?: Record<string, unknown>): unknown {
        const names = ['ticks_per_row', 'va_percent', 'imbalance_percent'] as const;
        const ticksPerRow = Math.trunc(toRuntimeNumber(orderedRuntimeArg(args, named, names, 0)));
        const valueAreaPercent = toRuntimeNumber(orderedRuntimeArg(args, named, names, 1, 70));
        const imbalancePercent = toRuntimeNumber(orderedRuntimeArg(args, named, names, 2, 300));
        if (!Number.isFinite(ticksPerRow) || ticksPerRow <= 0 || !Number.isFinite(valueAreaPercent) || !Number.isFinite(imbalancePercent)) {
          return NaN;
        }

        const symbol = String(ctx.syminfo.tickerid || ctx.syminfo.ticker || '');
        const timeframe = String(ctx.timeframe.period || '');
        const key = footprintRequestKey(symbol, timeframe, ticksPerRow, valueAreaPercent, imbalancePercent);
        trackFootprintContext(key);
        trackRequestContext(`request.footprint\u0000${key}`);
        return requestDatafeed?.getFootprint?.({
          symbol,
          timeframe,
          ticksPerRow,
          valueAreaPercent,
          imbalancePercent,
          time: bar.time,
        }) ?? NaN;
      },

      requestPointSeries(name: string, args: unknown[], named?: Record<string, unknown>): unknown {
        if (name === 'request.financial' || name === 'request.dividends' || name === 'request.economic' || name === 'request.earnings' || name === 'request.splits') {
          return resolveRequestedPointSeries(name, args, named, bar.time, bars[barIndex - 1]?.time);
        }
        const spec = requestPointSeriesSpec(name, args, named);
        trackRequestContext(`${name}\u0000${spec.key}`);
        if (name === 'request.quandl') return unavailableQuandlRequest(spec);
        if (
          String(spec.lookahead ?? 'barmerge.lookahead_off') !== 'barmerge.lookahead_on'
          && spec.family === 'splits'
        ) {
          const [ticker, field, currency = ''] = spec.key.split('\u0000');
          const providerEvent = requestDatafeed?.getCorporateAction?.({
            kind: spec.family,
            ticker: ticker ?? '',
            currency: currency === '' ? undefined : currency,
            time: bar.time,
          });
          if (providerEvent !== undefined) {
            if (spec.gaps === 'barmerge.gaps_on' && providerEvent.time !== bar.time) return NaN;
            return selectCorporateActionField(providerEvent.value, field ?? '') ?? NaN;
          }
        }

        const seriesDatafeed = requestDatafeed?.getSeries ? requestDatafeed : undefined;
        if (!seriesDatafeed && (name === 'request.economic' || name === 'request.quandl' || spec.family === 'splits')) {
          return NaN;
        }
        if (!seriesDatafeed) {
          throwCompiledRuntimeError(`${name} requires a request series datafeed`);
        }

        const cacheKey = `${spec.family}:${spec.key}`;
        let points = requestSeriesCache.get(cacheKey);
        if (!points) {
          const result = seriesDatafeed.getSeries!({ family: spec.family, key: spec.key });
          if (!result.ok) {
            if (result.code === 'invalid_symbol' && !spec.ignoreInvalid) {
              throwCompiledRuntimeError(`${name} failed: ${result.message}`);
            }
            if (
              spec.ignoreInvalid
              && (result.code === 'invalid_symbol' || result.code === 'missing_context' || result.code === 'unsupported_context')
            ) {
              return NaN;
            }
            if (spec.family === 'splits') return NaN;
            if (name === 'request.economic') return NaN;
            throwCompiledRuntimeError(`${name} failed: ${result.message}`);
          }
          points = prepareRequestPointSeries(result.context.points);
          requestSeriesCache.set(cacheKey, points);
        }

        return mergeRequestSeriesValue(points, bar.time, bars[barIndex - 1]?.time, spec.gaps, spec.lookahead);
      },

      requestSeed(
        secId: number,
        source: unknown,
        symbol: unknown,
        ignoreInvalidSymbol: unknown,
        calcBarsCount: unknown,
        sourceDescriptor?: unknown,
        captures?: Record<string, unknown>,
      ): unknown {
        if (requestDisabledByDynamicRequests(secId, 'request.seed')) return NaN;
        const sourceStr = toRuntimeString(source).trim();
        const symbolStr = toRuntimeString(symbol).trim();
        const requestSymbol = seedRequestSymbol(sourceStr, symbolStr);
        const timeframe = String(ctx.timeframe.period ?? '');
        const calcBars = normalizeRuntimePositiveInteger(calcBarsCount);
        const sourceKey = runtimeSourceDescriptorKey(sourceDescriptor);
        const capturesKey = runtimeCapturesKey(captures);
        const cacheKey = `${secId}:${requestSymbol}:${timeframe}:${calcBars ?? ''}:${sourceKey}:${capturesKey}`;
        trackRequestContext(`request.seed\u0000${secId}\u0000${requestSymbol}\u0000${timeframe}\u0000${calcBars ?? ''}\u0000${sourceKey}\u0000${runtimeCapturesKey(captures, requestScopeIdentity)}`);

        let cached = securityCache.get(cacheKey);
        if (!cached) {
          const secScript = compiled.securityScripts.get(secId);
          if (!requestDatafeed) {
            recordRuntimeError('request.seed requires a request datafeed');
            return NaN;
          }

          const result = resolveRequestDataset!({
            symbol: requestSymbol,
            timeframe,
            calcBarsCount: calcBars,
          });
          if (!result.ok) {
            if (
              isRuntimeTruthy(ignoreInvalidSymbol)
              && isInvalidOrUnavailableRequestContext(result.code)
            ) {
              return NaN;
            }
            recordRuntimeError(`request.seed failed: ${result.message}`);
            return NaN;
          }

          const values = secScript
            ? evaluateSecuritySeries(
              secScript,
              result.context,
              ctx.syminfo,
              chartTimeframePeriod,
              options?.runtime,
              effectiveMaxBarsBack,
              captures,
              (requestBarIndex, error) => recordSwallowedRuntimeError(
                swallowedErrors,
                `compiled-request-expression:request.seed:${secId}`,
                requestBarIndex,
                error,
              ),
              requestDatafeed,
              compiled.securityScripts,
              compiled.analysis.securitySites,
              dynamicRequestsEnabled,
              compiled.analysis.pineVersion,
              history,
              resolveRequestedPointSeries,
              trackFootprintContext,
              undefined,
              resolveRequestDataset,
            )
            : evaluateRequestedSourceSeries(result.context, sourceDescriptor);
          if (!values) return NaN;
          cached = { bars: result.context.bars, values };
          securityCache.set(cacheKey, cached);
        }

        return mergeRequestedValue(
          cached.bars,
          cached.values,
          bar.time,
          bars[barIndex - 1]?.time,
          'barmerge.gaps_off',
          'barmerge.lookahead_off',
          ctx.barstate.isrealtime && !ctx.barstate.isconfirmed,
        );
      },
      nextBuiltinCallId(name: string) {
        return nextRuntimeBuiltinCallId(name);
      },

      alert(args: unknown[], named?: Record<string, unknown>, callId?: string) {
        const message = toRuntimeString(orderedRuntimeArg(args, named, ['message', 'freq'], 0, ''));
        const frequency = normalizeAlertFrequency(orderedRuntimeArg(args, named, ['message', 'freq'], 1));
        ctx.addAlertEvent(`alert_${callId ?? 'alert'}`, message, frequency);
      },
      alertCondition(args: unknown[], named?: Record<string, unknown>, callId?: string) {
        const condition = orderedRuntimeArg(args, named, ['condition', 'title', 'message'], 0);
        const title = toRuntimeString(orderedRuntimeArg(args, named, ['condition', 'title', 'message'], 1, callId ?? 'alertcondition'));
        const message = toRuntimeString(orderedRuntimeArg(args, named, ['condition', 'title', 'message'], 2, ''));
        const id = alertConditionOutputId(callId, title);
        if (!ctx.alerts.has(id)) {
          ctx.registerAlert({ id, type: 'alertcondition', title, message, renderedMessages: [] });
        }
        const isActive = isRuntimeTruthy(condition);
        const renderedMessage = isActive ? renderRuntimeAlertConditionMessage(message, ctx) : null;
        ctx.setAlertConditionValue(id, isActive ? true : null, renderedMessage);
        return condition;
      },
      logInfo(args: unknown[], named?: Record<string, unknown>) {
        const rawMessage = named && Object.prototype.hasOwnProperty.call(named, 'message') ? named.message : args[0];
        const formatArgs = named && Object.prototype.hasOwnProperty.call(named, 'message') ? args : args.slice(1);
        ctx.addLog('info', formatRuntimeLogMessage(rawMessage, formatArgs));
      },
      logWarning(args: unknown[], named?: Record<string, unknown>) {
        const rawMessage = named && Object.prototype.hasOwnProperty.call(named, 'message') ? named.message : args[0];
        const formatArgs = named && Object.prototype.hasOwnProperty.call(named, 'message') ? args : args.slice(1);
        ctx.addLog('warning', formatRuntimeLogMessage(rawMessage, formatArgs));
      },
      logError(args: unknown[], named?: Record<string, unknown>) {
        const rawMessage = named && Object.prototype.hasOwnProperty.call(named, 'message') ? named.message : args[0];
        const formatArgs = named && Object.prototype.hasOwnProperty.call(named, 'message') ? args : args.slice(1);
        ctx.addLog('error', formatRuntimeLogMessage(rawMessage, formatArgs));
      },
      drawingCount() { return ctx.getDrawingCount(); },
      markDrawingsPersistentFrom(index: number) { ctx.markDrawingsPersistentFrom(index); },
      markPersistentRuntimeValue(value: unknown) { markPersistentRuntimeValue(ctx, value); },
      markPersistentArrayDrawing(array: PineArray, value: unknown) { markPersistentArrayDrawing(ctx, array, value); },
      markPersistentUdtField(object: unknown, fieldName: string) { markPersistentUdtField(ctx, object, fieldName); },
      arrayPush(array: PineArray, value: unknown) { return arrayPushPersistent(ctx, array, value); },
      arraySet(array: PineArray, index: number, value: unknown) { arraySetPersistent(ctx, array, index, value); },
      arrayUnshift(array: PineArray, value: unknown) { return arrayUnshiftPersistent(ctx, array, value); },
      arrayInsert(array: PineArray, index: number, value: unknown) { return arrayInsertPersistent(ctx, array, index, value); },
      arrayConcat(array: PineArray, other: PineArray) { return arrayConcatPersistent(ctx, array, other); },
      runtimeError(args: unknown[], named?: Record<string, unknown>, line?: number, column?: number) {
        const message = orderedRuntimeArg(args, named, ['message'], 0, '');
        throw new CompiledRuntimeErrorException(toRuntimeString(message), line, column);
      },
      capture() { return NaN; },
      captureSource() { return undefined; },
      requestSource(id: number, sourceCaptures?: Record<string, unknown>) {
        return { kind: 'expression', script: compiled.sourceScripts?.get(id), captures: sourceCaptures };
      },
      timestamp(args: unknown[], named?: Record<string, unknown>, literalId?: string, literalTimezone?: string) {
        return literalId === undefined ? evaluateRuntimeTimestamp(args, named, ctx)
          : evaluateLiteralRuntimeTimestamp(literalTimestamps ??= createLiteralTimestampCache(), literalId, literalTimezone, args, named, ctx);
      },
      timeFilter(closeTime: boolean, args: unknown[], named?: Record<string, unknown>) {
        return evaluateRuntimeTimeFilter(args, named, ctx, bars, options?.runtime, closeTime, compiled.analysis.pineVersion);
      },
      calendarPart(part: string, args: unknown[], named?: Record<string, unknown>) {
        return evaluateRuntimeCalendarPart(part, args, named, ctx);
      },
      runtimeTimeValue(name: string, offset = 0, hint = 0) {
        deps.historyCheck(`calendar:${name}`, offset, hint);
        return getRuntimeTimeValue(ctx, bars, name, offset, Infinity);
      },
      sessionValue(name: string) {
        return getRuntimeSessionValue(options?.runtime, ctx, bars, name);
      },
      readDrawingGetter(name: string, value: unknown) { return drawingReaders[name](value, ctx); },
      readLineY1(value: unknown) { return lineY1Reader(value, ctx); },
      readLabelText(value: unknown) { return labelTextReader(value, ctx); },
      callBuiltin(name: string, args: unknown[], named?: Record<string, unknown>, callId?: string) {
        const builtin = builtinRegistry.get(name);
        if (!builtin) return NaN;
        return builtin(args, namedRecordToMap(named), ctx, builtinScope, callId ?? name);
      },
      hasMethodBuiltin(name: string, receiver: unknown) {
        const builtinName = runtimeMethodBuiltinName(name, receiver, ctx);
        return builtinName !== undefined && builtinRegistry.has(builtinName);
      },
      callMethodBuiltin(name: string, receiver: unknown, args: unknown[], named?: Record<string, unknown>, callId?: string, resolvedName?: string) {
        const builtinName = resolvedName
          ? receiver === null || receiver === undefined || isRuntimeNa(receiver) ? undefined : resolvedName
          : runtimeMethodBuiltinName(name, receiver, ctx);
        const builtin = builtinName ? builtinRegistry.get(builtinName) : undefined;
        if (!builtin) return NaN;
        const builtinArgs = resolvedName && args.length < 2
          ? args.length === 0 ? [receiver] : [receiver, args[0]]
          : [receiver, ...args];
        return builtin(builtinArgs, namedRecordToMap(named), ctx, builtinScope, callId ?? builtinName!);
      },
      footprintMethod(name: string, receiver: unknown, args: unknown[], named?: Record<string, unknown>, callId?: string) {
        const namespace = isRequestFootprintData(receiver)
          ? 'footprint'
          : isRequestVolumeRowData(receiver)
            ? 'volume_row'
            : '';
        if (!namespace) return NaN;
        const builtin = builtinRegistry.get(`${namespace}.${name}`);
        if (!builtin) return NaN;
        return builtin([receiver, ...args], namedRecordToMap(named), ctx, builtinScope, callId ?? `${namespace}.${name}`);
      },
      colorNew(args: unknown[], named?: Record<string, unknown>) {
        const color = orderedRuntimeArg(args, named, ['color', 'transp'], 0);
        const transparency = named && Object.prototype.hasOwnProperty.call(named, 'transp')
          ? named.transp
          : named && Object.prototype.hasOwnProperty.call(named, 'transparency')
            ? named.transparency
            : orderedRuntimeArg(args, named, ['color', 'transp'], 1, 0);
        if (!isRuntimeNa(transparency) && isRuntimeColorChannelOutOfRange(transparency, 0, 100)) {
          recordRuntimeApproximation(
            runtimeApproximations,
            'color.new.transparency-clamp',
            'color.new transparency was outside the documented 0..100 range and was clamped; exact TradingView runtime behavior for dynamic out-of-range values is trace-required.',
            barIndex,
          );
        }
        const parsedColor = parseRuntimeColorInput(color);
        const colorTransparency = isRuntimeNa(transparency) ? 100 : transparency;
        return parsedColor
          ? formatRuntimeColor(parsedColor.red, parsedColor.green, parsedColor.blue, colorTransparency)
          : color;
      },
      colorRgb(args: unknown[], named?: Record<string, unknown>) {
        const transparency = named && Object.prototype.hasOwnProperty.call(named, 'transp')
          ? named.transp
          : named && Object.prototype.hasOwnProperty.call(named, 'transparency')
            ? named.transparency
            : orderedRuntimeArg(args, named, ['red', 'green', 'blue', 'transp'], 3, 0);
        const red = orderedRuntimeArg(args, named, ['red', 'green', 'blue', 'transp'], 0);
        const green = orderedRuntimeArg(args, named, ['red', 'green', 'blue', 'transp'], 1);
        const blue = orderedRuntimeArg(args, named, ['red', 'green', 'blue', 'transp'], 2);
        if (
          isRuntimeColorChannelOutOfRange(red, 0, 255)
          || isRuntimeColorChannelOutOfRange(green, 0, 255)
          || isRuntimeColorChannelOutOfRange(blue, 0, 255)
        ) {
          recordRuntimeApproximation(
            runtimeApproximations,
            'color.rgb.channel-packing',
            'color.rgb RGB channel value was outside the documented 0..255 range and was packed using native-derived integer channels; outcomes beyond captured integer boundaries remain trace-required.',
            barIndex,
          );
        }
        if (isRuntimeColorChannelOutOfRange(transparency, 0, 100)) {
          recordRuntimeApproximation(
            runtimeApproximations,
            'color.rgb.transparency-clamp',
            'color.rgb transparency was outside the documented 0..100 range and was clamped; exact TradingView runtime behavior for dynamic out-of-range values is trace-required.',
            barIndex,
          );
        }
        const rgb = Math.round(toRuntimeNumber(red))
          | (Math.round(toRuntimeNumber(green)) << 8)
          | (Math.round(toRuntimeNumber(blue)) << 16);
        return formatRuntimeColor(rgb & 0xff, (rgb >>> 8) & 0xff, (rgb >>> 16) & 0xff, transparency);
      },
      colorR(args: unknown[], named?: Record<string, unknown>) {
        return parseRuntimeColorInput(orderedRuntimeArg(args, named, ['color'], 0))?.red ?? Number.NaN;
      },
      colorG(args: unknown[], named?: Record<string, unknown>) {
        return parseRuntimeColorInput(orderedRuntimeArg(args, named, ['color'], 0))?.green ?? Number.NaN;
      },
      colorB(args: unknown[], named?: Record<string, unknown>) {
        return parseRuntimeColorInput(orderedRuntimeArg(args, named, ['color'], 0))?.blue ?? Number.NaN;
      },
      colorT(args: unknown[], named?: Record<string, unknown>) {
        const parsedColor = parseRuntimeColorInput(orderedRuntimeArg(args, named, ['color'], 0));
        return parsedColor ? alphaToRuntimeTransparency(parsedColor.alpha) : Number.NaN;
      },
      colorFromGradient(args: unknown[], named?: Record<string, unknown>) {
        const names = ['value', 'bottom_value', 'top_value', 'bottom_color', 'top_color'] as const;
        const value = orderedRuntimeArg(args, named, names, 0);
        const bottomValue = orderedRuntimeArg(args, named, names, 1);
        const topValue = orderedRuntimeArg(args, named, names, 2);
        const bottomColor = parseRuntimeColorInput(orderedRuntimeArg(args, named, names, 3));
        const topColor = parseRuntimeColorInput(orderedRuntimeArg(args, named, names, 4));

        if (!isFiniteRuntimeNumber(bottomValue) || !isFiniteRuntimeNumber(topValue) || !bottomColor || !topColor) {
          return Number.NaN;
        }

        const range = topValue - bottomValue;
        if (range === 0) return formatRuntimeColorAlpha(0, 0, 0, 0);
        if (!isFiniteRuntimeNumber(value)) return Number.NaN;
        const ratio = Math.min(1, Math.max(0, (value - bottomValue) / range));
        const interpolate = (from: number, to: number): number => from + (to - from) * ratio;
        return formatRuntimeColorAlpha(
          interpolate(bottomColor.red, topColor.red),
          interpolate(bottomColor.green, topColor.green),
          interpolate(bottomColor.blue, topColor.blue),
          interpolate(bottomColor.alpha, topColor.alpha),
        );
      },
      mathCall(name: string, args: unknown[], named?: Record<string, unknown>, callId?: string) {
        return evaluateRuntimeMath(name, args, named, mathEvaluators, mathHistories, mathRandomStates, callId, mintick);
      },
      mathLog(value: unknown) { return nativeMathLog(toRuntimeNumber(value)); },
      mathSum(..._args: unknown[]) { return NaN; },
      strFormat(args: unknown[], named?: Record<string, unknown>) { return formatRuntimeString(args, named); },
      strFormatTime(args: unknown[], named?: Record<string, unknown>) { return formatRuntimeTime(args, named, ctx); },
      tickerNew(args: unknown[], named?: Record<string, unknown>) { return evaluateRuntimeTickerNew(args, named, ctx.syminfo.session); },
      tickerModify(args: unknown[], named?: Record<string, unknown>) { return evaluateRuntimeTickerModify(args, named, ctx.syminfo.session); },
      tickerStandard(args: unknown[], named?: Record<string, unknown>) {
        const tickerSymbolArgs = [['symbol', 'tickerid']] as const;
        const tickerId = toRuntimeString(runtimeTickerArg(args, named, tickerSymbolArgs, 0, ctx.syminfo.tickerid ?? ''));
        return parseRuntimeTickerModifierParts(tickerId, 'ticker.standard').base;
      },
      tickerInherit(args: unknown[], named?: Record<string, unknown>) { return evaluateRuntimeTickerInherit(args, named); },
      tickerHeikinashi(args: unknown[], named?: Record<string, unknown>) { return evaluateRuntimeTickerChart('heikinashi', args, named); },
      tickerRenko(args: unknown[], named?: Record<string, unknown>) { return evaluateRuntimeTickerChart('renko', args, named); },
      tickerKagi(args: unknown[], named?: Record<string, unknown>) { return evaluateRuntimeTickerChart('kagi', args, named); },
      tickerLinebreak(args: unknown[], named?: Record<string, unknown>) { return evaluateRuntimeTickerChart('linebreak', args, named); },
      tickerPointfigure(args: unknown[], named?: Record<string, unknown>) { return evaluateRuntimeTickerChart('pointfigure', args, named); },
    };

  let bar = bars[0];
  let barIndex = 0;
  let compiledBarErrorCount = 0;
  let firstCompiledBarError: { barIndex: number; message: string } | undefined;
  const strategyIntrabarUnavailableReasons = new Set<NonNullable<StrategyIntrabarContext['unavailableReason']>>();
  const strategyMarginApproximationReasons = new Set<'margin_long' | 'margin_short'>();
  if (isStrategy && ledger.settings.marginLong !== 100) strategyMarginApproximationReasons.add('margin_long');
  if (isStrategy && ledger.settings.marginShort !== 100) strategyMarginApproximationReasons.add('margin_short');

  const disposeMatrixApproximationReporter = pushMatrixRuntimeApproximationReporter((approximation) => {
    recordRuntimeApproximation(runtimeApproximations, approximation.site, approximation.message, barIndex);
  });
  const disposeArrayApproximationReporter = pushArrayRuntimeApproximationReporter((approximation) => {
    recordRuntimeApproximation(runtimeApproximations, approximation.site, approximation.message, barIndex);
  });
  const disposeDrawingApproximationReporter = pushDrawingRuntimeApproximationReporter((approximation) => {
    recordRuntimeApproximation(runtimeApproximations, approximation.site, approximation.message, barIndex);
  });
  try {
    if (inst) {
      for (barIndex = 0; barIndex < bars.length; barIndex++) {
    barCount++;
    if (!ctx.advanceBar()) break;
    runtimeBuiltinCallCounts.clear();
    const isLastBar = barIndex === lastBarIndex;
    const realtimeBarStartIndex =
      options?.confirmedRealtimeBarStartIndex ??
      (options?.realtimeLastBar ? lastBarIndex : undefined);
    bar = bars[barIndex];
    const strategyIntrabarContext = isStrategy
      ? selectStrategyIntrabarContext({
          useBarMagnifier: ledger.settings.useBarMagnifier,
          datafeed: options?.strategyIntrabarDatafeed,
          request: {
            symbol: ctx.syminfo.tickerid ?? '',
            timeframe: ctx.timeframe.period,
            chartBarTime: bar.time,
            chartBarIndex: barIndex,
            chartBar: { ...bar },
          },
        })
      : undefined;
    if (strategyIntrabarContext) {
      ledger.intrabarContexts.push(strategyIntrabarContext);
      if (strategyIntrabarContext.unavailableReason) {
        strategyIntrabarUnavailableReasons.add(strategyIntrabarContext.unavailableReason);
      }
    }
    if (
      realtimeBarStartIndex !== undefined &&
      realtimeBarStartIndex > 0 &&
      barIndex === realtimeBarStartIndex - 1
    ) {
      ctx.barstate.islast = false;
      ctx.barstate.ishistory = true;
      ctx.barstate.isrealtime = false;
      ctx.barstate.isnew = true;
      ctx.barstate.isconfirmed = true;
      ctx.barstate.islastconfirmedhistory = true;
    }
    const isConfirmedRealtimeBar =
      barIndex === options?.confirmedRealtimeBarIndex ||
      (
        options?.confirmedRealtimeBarStartIndex !== undefined &&
        barIndex >= options.confirmedRealtimeBarStartIndex &&
        !isLastBar
      );
    if (isConfirmedRealtimeBar) {
      ctx.barstate.islast = true;
      ctx.barstate.ishistory = false;
      ctx.barstate.isrealtime = true;
      ctx.barstate.isnew = false;
      ctx.barstate.isconfirmed = true;
      ctx.barstate.islastconfirmedhistory = false;
    }
    if (isLastBar && options?.realtimeLastBar) {
      ctx.barstate.islast = true;
      ctx.barstate.ishistory = false;
      ctx.barstate.isrealtime = true;
      ctx.barstate.isnew = options.realtimeLastBar.isNew;
      ctx.barstate.isconfirmed = false;
      ctx.barstate.islastconfirmedhistory = false;
    }

    barData.open = bar.open;
    barData.high = bar.high;
    barData.low = bar.low;
    barData.close = bar.close;
    barData.volume = bar.volume;
    barData.time = bar.time;
    barCtx.barIndex = barIndex;
    barstateObj.isfirst = ctx.barstate.isfirst;
    barstateObj.islast = ctx.barstate.islast;
    barstateObj.ishistory = ctx.barstate.ishistory;
    barstateObj.isrealtime = ctx.barstate.isrealtime;
    barstateObj.isnew = ctx.barstate.isnew;
    barstateObj.isconfirmed = ctx.barstate.isconfirmed;
    barstateObj.islastconfirmedhistory = ctx.barstate.islastconfirmedhistory;

    const isLoadedBarReplacement =
      isStrategy &&
      options?.realtimeLastBar &&
      !options.realtimeLastBar.isNew &&
      options.confirmedRealtimeBarStartIndex === undefined;
    const finalizeStrategyLedger =
      isStrategy &&
      (
        !ctx.barstate.isrealtime ||
        ctx.barstate.isconfirmed ||
        isLoadedBarReplacement ||
        ledger.settings.calcOnEveryTick
      );
    const processRealtimeBrokerFills =
      isStrategy &&
      ctx.barstate.isrealtime &&
      !ctx.barstate.isconfirmed &&
      !ledger.settings.calcOnEveryTick;
    const intrabarState = ctx.barstate.isrealtime ? options?.intrabarState : undefined;
    const previousIntrabarState = intrabarState?.get(bar.time);
    if (previousIntrabarState) {
      inst.restoreVarip(cloneRuntimeSnapshot(ctx.barstate.isconfirmed ? previousIntrabarState.before : previousIntrabarState.after));
    }
    const varipBefore = intrabarState ? cloneRuntimeSnapshot(inst.saveVarip(bar.time, true)) : undefined;
    const executeStrategyCalculation = (): boolean => {
      try {
        history.beginBar(barIndex, ctx.barstate.isrealtime);
        inst.onBar(barCtx);
        return false;
      } catch (error) {
        if (isHistoryBufferResize(error)) throw error;
        if (error instanceof CompiledRuntimeErrorException || isKnownPineRuntimeError(error)) {
          errors.push(createCompiledExecutionError(error, barIndex));
          return true;
        }
        compiledBarErrorCount += 1;
        if (!firstCompiledBarError) {
          firstCompiledBarError = {
            barIndex,
            message: error instanceof Error ? error.message : String(error),
          };
        }
        recordSwallowedRuntimeError(swallowedErrors, 'compiled-bar', barIndex, error);
        return false;
      }
    };
    const fillsBeforeBar = ledger.fills.length;
    if (finalizeStrategyLedger) {
      fillPendingStrategyMarketOrders(ledger, bar.open, barIndex, bar.time, mintick);
      markStrategyLedgerToMarket(ledger, bar.close, bar.high, bar.low, { barIndex, time: bar.time });
    } else if (processRealtimeBrokerFills) {
      fillPendingStrategyMarketOrders(ledger, bar.open, barIndex, bar.time, mintick);
    }
    updateStrategyPropHistories();

    const executeStatements =
      !isStrategy ||
      !ctx.barstate.isrealtime ||
      ctx.barstate.isconfirmed ||
      isLoadedBarReplacement ||
      ledger.settings.calcOnEveryTick;
    if (executeStatements) {
      const executeHistoryTicks = isStrategy && !ctx.barstate.isrealtime && ledger.settings.calcOnEveryHistoryTick;
      if (executeHistoryTicks) {
        const historyTicks = strategyIntrabarContext?.ticks ?? createDefaultStrategyOhlcTicks(bar, barIndex);
        for (const tick of historyTicks) {
          barData.close = tick.price;
          barData.time = tick.time;
          barCtx.isFirstTick = tick.sequence === 0;
          if (executeStrategyCalculation()) break;
        }
        barData.open = bar.open;
        barData.high = bar.high;
        barData.low = bar.low;
        barData.close = bar.close;
        barData.volume = bar.volume;
        barData.time = bar.time;
        barCtx.isFirstTick = true;
      } else if (executeStrategyCalculation()) break;
    }

    if (finalizeStrategyLedger) {
      if (ledger.settings.processOrdersOnClose) {
        markStrategyLedgerToMarket(ledger, bar.close, bar.close, bar.close, { barIndex, time: bar.time });
      } else {
        markStrategyLedgerToMarket(ledger, bar.close, bar.high, bar.low, { barIndex, time: bar.time });
      }
      fillPendingStrategyOrdersOnTicks(ledger, strategyIntrabarContext?.ticks ?? createDefaultStrategyOhlcTicks(bar, barIndex), barIndex, mintick);
      if (ledger.settings.processOrdersOnClose) {
        markStrategyLedgerToMarket(ledger, bar.close, bar.close, bar.close, { barIndex, time: bar.time });
      } else {
        markStrategyLedgerToMarket(ledger, bar.close, bar.high, bar.low, { barIndex, time: bar.time });
      }
    } else if (processRealtimeBrokerFills) {
      fillPendingStrategyOrdersOnTicks(ledger, strategyIntrabarContext?.ticks ?? createDefaultStrategyOhlcTicks(bar, barIndex), barIndex, mintick);
    }

    if (isStrategy && ledger.settings.calcOnOrderFills && ledger.fills.length > fillsBeforeBar) {
      updateStrategyPropHistories();
      ctx.truncatePlots(barIndex);
      if (executeStrategyCalculation()) break;
    }
    if (intrabarState && !ctx.barstate.isconfirmed) {
      intrabarState.set(bar.time, { before: varipBefore, after: cloneRuntimeSnapshot(inst.saveVarip(bar.time)) });
    }

      }
    }
  } finally {
    disposeDrawingApproximationReporter();
    disposeArrayApproximationReporter();
    disposeMatrixApproximationReporter();
  }

  const decl = compiled.analysis.declarationInfo;
  const profile: RuntimeProfile = {
    executionMode: 'compiled',
    elapsedMs: performance.now() - startMs,
    bars: barCount,
    statements: 0,
    expressions: 0,
    builtinCalls: 0,
    requestContexts: 0,
    maxBarsBack: Math.max(effectiveMaxBarsBack, history.maxBarsBack),
    errors: errors.length,
    strategyIntrabarUnavailableReasons: [...strategyIntrabarUnavailableReasons],
    strategyMarginApproximationReasons: [...strategyMarginApproximationReasons],
    runtimeApproximations: sortedRuntimeApproximations(runtimeApproximations),
    swallowedErrors: sortedSwallowedRuntimeErrors(swallowedErrors),
    compiledBarErrors: firstCompiledBarError
      ? {
          count: compiledBarErrorCount,
          firstBarIndex: firstCompiledBarError.barIndex,
          firstMessage: firstCompiledBarError.message,
        }
      : undefined,
  };

  const declaration: IndicatorDeclarationMetadata = {
    title: decl?.title ?? 'Compiled Script',
    shortTitle: undefined,
    overlay: false,
    format: undefined,
    scale: undefined,
    timeframe: ctx.indicatorTimeframe,
    timeframeGaps: undefined,
    explicitPlotZOrder: undefined,
    behindChart: undefined,
    calcBarsCount: undefined,
    maxBarsBack: undefined,
    dynamicRequests: dynamicRequestsEnabled,
    drawingLimits: { ...DEFAULT_DRAWING_LIMITS },
  };

  // Parse indicator declaration metadata from the AST
  if (decl?.node?.type === 'LibraryDeclaration') {
    const node = decl.node;
    declaration.overlay = staticBooleanValue(node.overlay) ?? declaration.overlay;
    declaration.dynamicRequests = staticBooleanValue(node.dynamic_requests) ?? declaration.dynamicRequests;
  }
  if (decl?.node?.type === 'IndicatorDeclaration') {
    const node = decl.node;
    declaration.shortTitle = staticStringValue(node.shorttitle);
    declaration.overlay = staticBooleanValue(node.overlay) ?? declaration.overlay;
    declaration.precision = declarationNumberValue(node.precision ?? undefined, decl);
    declaration.format = staticDeclarationString(node.format, 'format');
    declaration.scale = staticDeclarationString(node.scale, 'scale');
    declaration.timeframeGaps = staticBooleanValue(node.timeframe_gaps);
    declaration.explicitPlotZOrder = staticBooleanValue(node.explicit_plot_zorder);
    declaration.behindChart = staticBooleanValue(node.behind_chart);
    declaration.calcBarsCount = declarationNumberValue(node.calc_bars_count ?? undefined, decl);
    declaration.maxBarsBack = declarationNumberValue(node.max_bars_back ?? undefined, decl);
    declaration.dynamicRequests = staticBooleanValue(node.dynamic_requests) ?? declaration.dynamicRequests;
    declaration.drawingLimits = {
      label: declarationNumberValue(node.max_labels_count ?? undefined, decl) ?? declaration.drawingLimits.label,
      line: declarationNumberValue(node.max_lines_count ?? undefined, decl) ?? declaration.drawingLimits.line,
      box: declarationNumberValue(node.max_boxes_count ?? undefined, decl) ?? declaration.drawingLimits.box,
      polyline: declarationNumberValue(node.max_polylines_count ?? undefined, decl) ?? declaration.drawingLimits.polyline,
    };
  }

  return {
    plots: ctx.getPlots(),
    drawings: ctx.getDrawings(),
    alerts: ctx.getAlerts(),
    logs: ctx.getLogs(),
    inputs: Array.from(inputDefs.values()),
    declaration,
    indicatorTitle: declaration.title,
    indicatorShortTitle: declaration.shortTitle,
    indicatorOverlay: declaration.overlay,
    indicatorPrecision: declaration.precision,
    indicatorFormat: declaration.format,
    indicatorScale: declaration.scale,
    indicatorTimeframe: declaration.timeframe,
    indicatorTimeframeGaps: declaration.timeframeGaps,
    indicatorExplicitPlotZOrder: declaration.explicitPlotZOrder,
    indicatorBehindChart: declaration.behindChart,
    indicatorCalcBarsCount: declaration.calcBarsCount,
    indicatorMaxBarsBack: declaration.maxBarsBack,
    indicatorDynamicRequests: declaration.dynamicRequests,
    indicatorDrawingLimits: declaration.drawingLimits,
    strategy: ledger,
    errors,
    profile,
  };
}
