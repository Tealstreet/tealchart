import type { CallExpression, Expression, Program, Statement } from '../../parser/ast';
import type { Bar, PlotOutput, InputDefinition, SessionClosureKind } from '../context';
import { ExecutionContext } from '../context';
import { TEALSCRIPT_MAX_UNIQUE_REQUEST_CONTEXTS } from '../engine';
import type { ExecutionError, ExecutionResult, IndicatorDeclarationMetadata, RuntimeProfile, RuntimeSwallowedErrorSummary, TealscriptRuntimeOptions } from '../engine';
import type { BuiltinRegistry } from '../builtins/registry';
import type { SecurityCallSite } from './analyzer';
import {
  registerBoxBuiltins,
  registerDrawingConstants,
  registerLabelBuiltins,
  registerLineBuiltins,
  registerLineFillBuiltins,
  registerPolylineBuiltins,
  registerTableBuiltins,
} from '../builtins/drawings';
import type { DrawingBuiltinRuntime } from '../builtins/drawings';
import type { LineDrawingOutput } from '../drawings/types';
import { getDrawingValue, toDrawingId as toDrawingIdValue, toLineWidth as toLineWidthValue, withDrawing } from '../drawings/helpers';
import { DEFAULT_DRAWING_LIMITS } from '../drawings/store';
import type { StrategyLedger, StrategyDirection, StrategyOcaType, StrategyQuantityType, StrategyTrade } from '../strategy';
import {
  createStrategyLedger,
  createDefaultStrategyOhlcTicks,
  submitStrategyOrder,
  submitOrReplaceStrategyExitOrder,
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
} from '../strategy';
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
  RequestQuandlSeriesQuery,
  RequestSeriesFamily,
  RequestSeriesPoint,
  WorkerRequestDataCacheKind,
  WorkerRequestDataCacheQuery,
} from '../requestDatafeed';
import {
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
import { Scope } from '../scope';
import { NumericSeries, ValueSeries } from './runtime';
import * as ta from './ta-classes';
import { createPineArray, getArraySize, getArrayValue, isPineArray, pushArrayValue, type PineArray } from '../arrays';
import { createPineMap, isPineMap } from '../maps';
import { createPineMatrix, isPineMatrix } from '../matrices';
import { copyUdtObject, isPineUdtObject } from '../objects';

export interface CompiledExecutionOptions {
  runtime?: TealscriptRuntimeOptions;
  maxBarsBack?: number;
  requestDatafeed?: RequestDatafeed;
  libraries?: Map<string, Program>;
  onFallback?: (reason: string) => void;
  realtimeLastBar?: {
    isNew: boolean;
  };
  confirmedRealtimeBarIndex?: number;
  confirmedRealtimeBarStartIndex?: number;
}

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

function createCompiledExecutionError(error: unknown): ExecutionError {
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
  return { message };
}

type RuntimeSwallowedErrorAccumulator = Map<string, RuntimeSwallowedErrorSummary>;

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

function sortedSwallowedRuntimeErrors(accumulator: RuntimeSwallowedErrorAccumulator): RuntimeSwallowedErrorSummary[] | undefined {
  if (accumulator.size === 0) return undefined;
  return [...accumulator.values()].sort((left, right) => left.site.localeCompare(right.site));
}

export function tryCompile(ast: Program, maxBarsBack?: number, options?: CompileOptions): CompiledScript {
  return compile(ast, maxBarsBack, options);
}

const compiledCache = new WeakMap<Program, CompiledScript>();

export function tryExecuteScript(
  ast: Program,
  bars: Bar[],
  inputs?: Map<string, unknown>,
  options?: CompiledExecutionOptions,
): ExecutionResult | null {
  let compiled = options?.libraries ? undefined : compiledCache.get(ast);
  if (!compiled) {
    compiled = compile(ast, options?.maxBarsBack, { libraries: options?.libraries });
    if (!options?.libraries) compiledCache.set(ast, compiled);
  }
  if (!compiled.success) {
    options?.onFallback?.(`compile-unsupported: ${compiled.unsupported.join('; ')}`);
    return null;
  }
  if (compiled.securityScripts.size > 0 && !options?.requestDatafeed) {
    options?.onFallback?.('missing-request-datafeed');
    return null;
  }
  try {
    return executeCompiled(compiled, bars, inputs, options);
  } catch (error) {
    options?.onFallback?.(`compiled-execution-error: ${error instanceof Error ? error.message : String(error)}`);
    return null;
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
  for (const call of collectCallExpressions(ast)) {
    const query = collectPointRequestQuery(call, inputs, options?.runtime);
    if (query) {
      addQuery(query);
    } else {
      const reason = unpreloadablePointRequestReason(call, inputs, options?.runtime);
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
    const e = expr as { type?: string; value?: string; name?: string; object?: { name?: string }; property?: { name?: string } } | undefined;
    if (!e) return undefined;
    if (e.type === 'StringLiteral') return e.value;
    if (e.type === 'MemberExpression' && e.object?.name && e.property?.name) {
      return `${e.object.name}.${e.property.name}`;
    }
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
  const ml = numVal(node.margin_long);
  if (ml !== undefined) settings.marginLong = ml;
  const ms = numVal(node.margin_short);
  if (ms !== undefined) settings.marginShort = ms;
  const coof = boolVal(node.calc_on_order_fills);
  if (coof !== undefined) settings.calcOnOrderFills = coof;
  const coet = boolVal(node.calc_on_every_tick);
  if (coet !== undefined) settings.calcOnEveryTick = coet;
  const pooc = boolVal(node.process_orders_on_close);
  if (pooc !== undefined) settings.processOrdersOnClose = pooc;
  const ubm = boolVal(node.use_bar_magnifier);
  if (ubm !== undefined) settings.useBarMagnifier = ubm;
  const foos = boolVal(node.fill_orders_on_standard_ohlc);
  if (foos !== undefined) settings.fillOrdersOnStandardOhlc = foos;
  const rfr = numVal(node.risk_free_rate);
  if (rfr !== undefined) settings.riskFreeRate = rfr;
  const cur = strVal(node.currency);
  if (cur !== undefined) settings.currency = cur;

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
  if (ticks === undefined || !Number.isFinite(ticks) || ticks <= 0) return undefined;
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
): number | undefined {
  if (trailPrice !== undefined) return trailPrice;
  if (trailPoints === undefined || !Number.isFinite(trailPoints) || trailPoints < 0) return undefined;
  const entryPrice = resolveCompiledStrategyWeightedEntryPrice(trades);
  if (entryPrice === undefined || !Number.isFinite(mintick) || mintick <= 0) return undefined;
  const offset = trailPoints * mintick;
  return direction === 'long' ? entryPrice + offset : entryPrice - offset;
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

function normalizeRuntimePlotStyle(value: unknown): PlotOutput['style'] | undefined {
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

function toRuntimeString(value: unknown): string {
  if (value === null || value === undefined || isRuntimeNa(value)) return 'NaN';
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
  const normalizedFormat = format.trim().toLowerCase();
  if (normalizedFormat === 'integer') return Math.round(value).toString();
  if (normalizedFormat === 'currency') {
    return value < 0 ? `-$${formatRuntimeGroupedNumber(Math.abs(value), 2)}` : `$${formatRuntimeGroupedNumber(value, 2)}`;
  }
  if (normalizedFormat === 'percent') return `${Math.round(value * 100)}%`;

  const decimalMatch = format.match(/\.([0#]+)/);
  if (decimalMatch) {
    const formatted = value.toFixed(decimalMatch[1].length);
    return format.includes(',') ? addRuntimeThousandsSeparators(formatted) : formatted;
  }
  if (/^[#0,]+$/.test(format)) {
    const formatted = Math.round(value).toString();
    return format.includes(',') ? addRuntimeThousandsSeparators(formatted) : formatted;
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
    return typeof value === 'number' && normalizedFormat ? formatRuntimeNumber(value, normalizedFormat) : toRuntimeString(value);
  }
  if (normalizedModifier === 'number') {
    if (isRuntimeNa(value)) return toRuntimeString(value);
    return typeof value === 'number' ? formatRuntimeNumber(value, normalizedFormat ?? '') : toRuntimeString(value);
  }
  return toRuntimeString(value);
}

function formatRuntimeString(args: unknown[], named?: Record<string, unknown>): string {
  const hasNamedFormat = !!named && Object.prototype.hasOwnProperty.call(named, 'format');
  const template = toRuntimeString(hasNamedFormat ? named.format : args[0]);
  const valueOffset = hasNamedFormat ? 0 : 1;
  return template.replace(
    /\{(\d+)(?::([^}]+)|\s*,\s*([^,{}]+)\s*(?:,\s*([^{}]+?)\s*)?)?\}/g,
    (_match, index: string, colonFormat: string | undefined, modifier: string | undefined, commaFormat: string | undefined) =>
      formatRuntimeStringPlaceholder(args[Number(index) + valueOffset], modifier, colonFormat ?? commaFormat),
  );
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

function getRuntimeIanaTimezoneOffsetMinutes(timezone: string, timestamp: number): number | null {
  if (!Number.isFinite(timestamp)) return null;

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(timestamp));
    const values = new Map(parts.map((part) => [part.type, part.value]));
    const year = Number(values.get('year'));
    const month = Number(values.get('month'));
    const day = Number(values.get('day'));
    const hour = Number(values.get('hour'));
    const minute = Number(values.get('minute'));
    const second = Number(values.get('second'));
    if ([year, month, day, hour, minute, second].some((value) => !Number.isFinite(value))) return null;
    return Math.round((Date.UTC(year, month - 1, day, hour, minute, second) - timestamp) / 60000);
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

type RuntimeTimeframeUnit = 'tick' | 'second' | 'minute' | 'day' | 'week' | 'month';
type RuntimeSessionKind = Extract<SessionClosureKind, 'premarket' | 'regular' | 'postmarket' | 'extended'>;

interface RuntimeTimeframeSpec {
  period: string;
  multiplier: number;
  unit: RuntimeTimeframeUnit;
}

function parseRuntimeTimeframeSpec(timeframe: string, currentPeriod: string): RuntimeTimeframeSpec | null {
  const normalized = timeframe.trim().toUpperCase();
  if (normalized === '') {
    const normalizedCurrent = currentPeriod.trim().toUpperCase();
    return parseRuntimeTimeframeSpec(normalizedCurrent === '' ? '60' : normalizedCurrent, '60');
  }

  if (/^\d+$/.test(normalized)) {
    const multiplier = Number(normalized);
    return multiplier >= 1 && multiplier <= 1440 ? { period: normalized, multiplier, unit: 'minute' } : null;
  }

  const match = /^(\d+)?([TSDWM])$/.exec(normalized);
  if (!match) return null;

  const multiplier = match[1] === undefined ? 1 : Number(match[1]);
  if (!Number.isInteger(multiplier) || multiplier <= 0) return null;

  switch (match[2]) {
    case 'T':
      if (![1, 10, 100, 1000].includes(multiplier)) return null;
      return { period: normalized, multiplier, unit: 'tick' };
    case 'S':
      if (![1, 5, 10, 15, 30, 45].includes(multiplier)) return null;
      return { period: normalized, multiplier, unit: 'second' };
    case 'D':
      if (multiplier > 365) return null;
      return { period: normalized, multiplier, unit: 'day' };
    case 'W':
      if (multiplier > 52) return null;
      return { period: normalized, multiplier, unit: 'week' };
    case 'M':
      if (multiplier > 12) return null;
      return { period: normalized, multiplier, unit: 'month' };
    default:
      return null;
  }
}

function normalizeRuntimeTimeframePeriod(timeframe: string, currentPeriod: string): string {
  const normalized = timeframe.trim().toUpperCase();
  if (normalized !== '') return normalized;
  const normalizedCurrent = currentPeriod.trim().toUpperCase();
  return normalizedCurrent === '' ? '60' : normalizedCurrent;
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
      return spec.multiplier * 30 * 86_400_000;
    default:
      return null;
  }
}

function runtimeTimeframeInfo(period: string, currentPeriod: string): ExecutionContext['timeframe'] | null {
  const spec = parseRuntimeTimeframeSpec(period, currentPeriod);
  if (!spec) return null;
  return {
    period: spec.period,
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
): CompiledRequestDataQuery | null {
  const fullName = requestCalleeName(call.callee);
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
    const countryCode = staticRequestCallStringArg(call, ['country_code', 'field', 'gaps', 'ignore_invalid_symbol'], 0, inputs, runtime)?.trim().toUpperCase();
    const field = staticRequestCallStringArg(call, ['country_code', 'field', 'gaps', 'ignore_invalid_symbol'], 1, inputs, runtime)?.trim();
    if (!countryCode || !field) return null;
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

  if (fullName === 'request.quandl') {
    const names = ['ticker', 'gaps', 'index', 'ignore_invalid_symbol'];
    const ticker = staticRequestCallStringArg(call, names, 0, inputs, runtime)?.trim();
    const column = Math.trunc(staticRequestCallNumberArg(call, names, 2, inputs) ?? 0);
    if (!ticker || !Number.isFinite(column)) return null;
    return {
      kind: 'quandl',
      query: { ticker, column, time: 0 } satisfies RequestQuandlSeriesQuery,
    };
  }

  if (fullName === 'request.footprint') {
    const names = ['ticks_per_row', 'va_percent', 'imbalance_percent'];
    const ticksPerRow = Math.trunc(staticRequestCallNumberArg(call, names, 0, inputs) ?? Number.NaN);
    const valueAreaPercent = staticRequestCallNumberArg(call, names, 1, inputs);
    const imbalancePercent = staticRequestCallNumberArg(call, names, 2, inputs) ?? 300;
    const symbol = String(runtime?.syminfo?.tickerid ?? runtime?.syminfo?.ticker ?? '');
    const timeframe = String(runtime?.timeframe?.period ?? '60');
    if (!symbol || !Number.isFinite(ticksPerRow) || ticksPerRow <= 0 || valueAreaPercent === undefined || !Number.isFinite(valueAreaPercent) || !Number.isFinite(imbalancePercent)) {
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
): string | null {
  const fullName = requestCalleeName(call.callee);
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

  if (fullName === 'request.quandl') {
    const names = ['ticker', 'gaps', 'index', 'ignore_invalid_symbol'];
    const ticker = staticRequestCallStringArg(call, names, 0, inputs, runtime);
    const indexArg = staticRequestCallArg(call, names, 2);
    const column = indexArg ? staticRequestNumberValue(indexArg, inputs) : 0;
    return !ticker || !Number.isFinite(column) ? 'request.quandl:non-static-routing' : null;
  }

  if (fullName === 'request.footprint') {
    const names = ['ticks_per_row', 'va_percent', 'imbalance_percent'];
    const ticksPerRowArg = staticRequestCallArg(call, names, 0);
    const valueAreaArg = staticRequestCallArg(call, names, 1);
    const imbalanceArg = staticRequestCallArg(call, names, 2);
    const ticksPerRow = ticksPerRowArg ? staticRequestNumberValue(ticksPerRowArg, inputs) : undefined;
    const valueAreaPercent = valueAreaArg ? staticRequestNumberValue(valueAreaArg, inputs) : undefined;
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
  if (!Number.isFinite(seconds) || seconds <= 0) return '';

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
    return `${Math.min(52, Math.ceil(roundedSeconds / 604_800))}W`;
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

function getRuntimeTimeValue(ctx: ExecutionContext, bars: Bar[], name: string, offset = 0): number {
  const normalizedOffset = Math.trunc(toRuntimeNumber(offset));
  if (!Number.isFinite(normalizedOffset) || normalizedOffset < 0) return Number.NaN;

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

function parseRuntimeSessionMinute(value: string): number | null {
  const hour = Number(value.slice(0, 2));
  const minute = Number(value.slice(2, 4));
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function nextRuntimePineDay(day: number): number {
  return day >= 7 ? 1 : day + 1;
}

function isTimestampInRuntimeSessionPeriod(timestamp: number, period: string, days: string, timezone: string): boolean {
  const match = /^(\d{4})-(\d{4})$/.exec(period);
  if (!match) return false;

  const start = parseRuntimeSessionMinute(match[1]);
  const end = parseRuntimeSessionMinute(match[2]);
  if (start === null || end === null) return false;

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
  const normalized = session.trim().toLowerCase();
  if (normalized === '' || normalized === 'regular' || normalized === 'extended' || normalized === 'session.regular' || normalized === 'session.extended') {
    return true;
  }
  if (normalized === '24x7') return true;

  const [periods, days = '1234567'] = session.split(':', 2);
  if (!periods || !/^[1-7]+$/.test(days)) return false;
  return periods.split(',').some((period) => isTimestampInRuntimeSessionPeriod(timestamp, period.trim(), days, timezone));
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
  const session = runtimeOptions?.session?.[kind];
  if (session === undefined || session === '') {
    throw new CompiledRuntimeErrorException(`${name} requires exchange session classification, which is not available in this runtime`);
  }

  const timestamp = ctx.time.get(0);
  if (timestamp === undefined || !Number.isFinite(timestamp)) return false;
  const timezone = runtimeOptions?.session?.timezone?.trim() || ctx.syminfo.timezone;
  if (isRuntimeExchangeSessionClosed(runtimeOptions, timestamp, timezone, kind)) return false;
  return isTimestampInRuntimeSession(timestamp, session, timezone);
}

function evaluateRuntimeSessionBarBoundary(
  runtimeOptions: TealscriptRuntimeOptions | undefined,
  ctx: ExecutionContext,
  bars: Bar[],
  scope: 'any' | 'regular',
  boundary: 'first' | 'last',
  name: string,
): boolean {
  const timezone = runtimeOptions?.session?.timezone?.trim() || ctx.syminfo.timezone;

  if (scope === 'regular') {
    const regularSession = runtimeOptions?.session?.regular;
    if (regularSession === undefined || regularSession === '') {
      throw new CompiledRuntimeErrorException(`${name} requires exchange session classification, which is not available in this runtime`);
    }
  } else {
    const hasAnySession = ['premarket', 'regular', 'postmarket'].some((kind) => (
      runtimeOptions?.session?.[kind as 'premarket' | 'regular' | 'postmarket']
    ));
    if (!hasAnySession) {
      throw new CompiledRuntimeErrorException(`${name} requires exchange session classification, which is not available in this runtime`);
    }
  }

  const timestamp = ctx.time.get(0);
  if (timestamp === undefined || !Number.isFinite(timestamp)) return false;

  const isInSession = (candidateTime: number): boolean => {
    if (scope === 'regular') {
      const session = runtimeOptions!.session!.regular!;
      if (isRuntimeExchangeSessionClosed(runtimeOptions, candidateTime, timezone, 'regular')) return false;
      return isTimestampInRuntimeSession(candidateTime, session, timezone);
    }
    return isTimestampInAnyRuntimeSession(runtimeOptions, candidateTime, timezone);
  };

  if (!isInSession(timestamp)) return false;

  const adjacentBar = boundary === 'first' ? bars[ctx.bar_index - 1] : bars[ctx.bar_index + 1];
  if (adjacentBar === undefined) return true;
  return !isInSession(adjacentBar.time);
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
      return evaluateRuntimeSessionState(runtimeOptions, ctx, 'premarket', 'session.ispremarket');
    case 'ispostmarket':
      return evaluateRuntimeSessionState(runtimeOptions, ctx, 'postmarket', 'session.ispostmarket');
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

function evaluateRuntimeTickerNew(args: unknown[], named?: Record<string, unknown>): string {
  const tickerNewArgs = [['prefix'], ['ticker'], ['session'], ['adjustment'], ['backadjustment'], ['settlement_as_close']] as const;
  const prefix = toRuntimeString(runtimeTickerArg(args, named, tickerNewArgs, 0, ''));
  const ticker = toRuntimeString(runtimeTickerArg(args, named, tickerNewArgs, 1, ''));
  const base = prefix.trim() === '' ? ticker.trim() : `${prefix.trim()}:${ticker.trim()}`;
  return applyRuntimeTickerModifiers(base, {
    session: normalizeRuntimeTickerSession(runtimeTickerArg(args, named, tickerNewArgs, 2)),
    adjustment: normalizeRuntimeTickerModifier(runtimeTickerArg(args, named, tickerNewArgs, 3), 'adjustment', ['none', 'splits', 'dividends']),
    backadjustment: normalizeRuntimeTickerModifier(runtimeTickerArg(args, named, tickerNewArgs, 4), 'backadjustment', ['on', 'off', 'inherit']),
    settlementAsClose: normalizeRuntimeTickerModifier(runtimeTickerArg(args, named, tickerNewArgs, 5), 'settlement_as_close', ['on', 'off', 'inherit']),
  });
}

function evaluateRuntimeTickerModify(args: unknown[], named?: Record<string, unknown>): string {
  const tickerModifyArgs = [['tickerid'], ['session'], ['adjustment'], ['backadjustment'], ['settlement_as_close']] as const;
  const tickerId = toRuntimeString(runtimeTickerArg(args, named, tickerModifyArgs, 0, ''));
  const current = parseRuntimeTickerModifierMap(parseRuntimeTickerModifierParts(tickerId, 'ticker.modify').modifiers);
  const sessionArg = runtimeTickerArg(args, named, tickerModifyArgs, 1);
  const adjustmentArg = runtimeTickerArg(args, named, tickerModifyArgs, 2);
  const backadjustmentArg = runtimeTickerArg(args, named, tickerModifyArgs, 3);
  const settlementAsCloseArg = runtimeTickerArg(args, named, tickerModifyArgs, 4);
  return applyRuntimeTickerModifiers(tickerId, {
    session: sessionArg !== undefined ? normalizeRuntimeTickerSession(sessionArg) : normalizeRuntimeTickerSession(current.get('session')),
    adjustment: adjustmentArg !== undefined
      ? normalizeRuntimeTickerModifier(adjustmentArg, 'adjustment', ['none', 'splits', 'dividends'])
      : normalizeRuntimeTickerModifier(current.get('adjustment'), 'adjustment', ['none', 'splits', 'dividends']),
    backadjustment: backadjustmentArg !== undefined
      ? normalizeRuntimeTickerModifier(backadjustmentArg, 'backadjustment', ['on', 'off', 'inherit'])
      : normalizeRuntimeTickerModifier(current.get('backadjustment'), 'backadjustment', ['on', 'off', 'inherit']),
    settlementAsClose: settlementAsCloseArg !== undefined
      ? normalizeRuntimeTickerModifier(settlementAsCloseArg, 'settlement_as_close', ['on', 'off', 'inherit'])
      : normalizeRuntimeTickerModifier(current.get('settlement_as_close'), 'settlement_as_close', ['on', 'off', 'inherit']),
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

function normalizeRuntimeTimeOffset(value: unknown): number | null {
  const offset = toRuntimeNumber(value ?? 0);
  if (!Number.isInteger(offset) || offset < -500 || offset > 5000) return null;
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
): number {
  const timezoneCandidate = orderedRuntimeArg(args, named, ['timeframe', 'session', 'timezone'], 2);
  const hasTimezoneArgument = !!(named && Object.prototype.hasOwnProperty.call(named, 'timezone'))
    || (timezoneCandidate !== undefined && typeof timezoneCandidate === 'string');
  const timeArgs = hasTimezoneArgument
    ? ['timeframe', 'session', 'timezone', 'bars_back', 'timeframe_bars_back']
    : ['timeframe', 'session', 'bars_back', 'timeframe_bars_back'];
  const timeframeArg = orderedRuntimeArg(args, named, timeArgs, 0, ctx.timeframe.period);
  const sessionArg = orderedRuntimeArg(args, named, timeArgs, 1);
  const timezoneArg = hasTimezoneArgument ? orderedRuntimeArg(args, named, timeArgs, 2, ctx.syminfo.timezone) : ctx.syminfo.timezone;
  const barsBack = normalizeRuntimeTimeOffset(orderedRuntimeArg(args, named, timeArgs, hasTimezoneArgument ? 3 : 2, 0));
  const timeframeBarsBack = normalizeRuntimeTimeOffset(orderedRuntimeArg(args, named, timeArgs, hasTimezoneArgument ? 4 : 3, 0));
  if (barsBack === null || timeframeBarsBack === null) return Number.NaN;

  const targetBarIndex = ctx.bar_index - barsBack;
  const timestamp = barsBack === 0
    ? toRuntimeNumber(ctx.time.get(0) ?? Number.NaN)
    : toRuntimeNumber(bars[targetBarIndex]?.time ?? projectFutureRuntimeChartBarTime(ctx, barsBack));
  const timeframe = timeframeArg === undefined || timeframeArg === '' ? ctx.timeframe.period : toRuntimeString(timeframeArg);
  const session = sessionArg === undefined || sessionArg === '' ? undefined : toRuntimeString(sessionArg);
  const timezone = timezoneArg === undefined || timezoneArg === '' ? ctx.syminfo.timezone : toRuntimeString(timezoneArg);

  if (!Number.isFinite(timestamp)) return Number.NaN;
  if (session && isRuntimeExchangeSessionClosed(runtimeOptions, timestamp, timezone, getRuntimeSessionKind(runtimeOptions, session, timestamp, timezone))) {
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

function normalizeRuntimeLookbackLength(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function runtimeDecimalPlacesForTick(tick: number): number {
  const text = tick.toString().toLowerCase();
  if (text.includes('e-')) return Math.min(12, Math.max(0, Number(text.split('e-')[1]) || 0));
  return Math.min(12, (text.split('.')[1] ?? '').replace(/0+$/, '').length);
}

function prependRuntimeBoundedHistory<T>(history: T[], source: T, keep: number): void {
  history.unshift(source);
  if (history.length > keep) history.length = keep;
}

function completeRuntimeNonNaWindow(histories: Map<string, number[]>, key: string, source: unknown, length: number): number[] | null {
  const numericSource = toRuntimeNumber(source);
  const history = histories.get(key) ?? [];
  if (!Number.isNaN(numericSource)) {
    prependRuntimeBoundedHistory(history, numericSource, length);
  }
  histories.set(key, history);
  if (history.length < length) return null;
  return history.slice(0, length);
}

interface RuntimeRandomState {
  seed: number;
  state: number;
}

function hashRuntimeRandomSeed(seed: number): number {
  let value = seed >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return value >>> 0;
}

function hashRuntimeRandomCallId(callId: string): number {
  let value = 0x811c9dc5;
  for (let index = 0; index < callId.length; index += 1) {
    value ^= callId.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

function nextRuntimeSeededRandom(states: Map<string, RuntimeRandomState>, key: string, seed: number): number {
  const state = states.get(key);
  const current = state?.seed === seed ? state.state : hashRuntimeRandomSeed(seed);
  const nextState = (current + 0x6d2b79f5) >>> 0;
  let value = nextState;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  states.set(key, { seed, state: nextState });
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

function toRuntimeExclusiveUnitRandom(value: number): number {
  if (value <= 0) return Number.EPSILON;
  if (value >= 1) return 1 - Number.EPSILON;
  return value;
}

function evaluateRuntimeMath(
  name: string,
  args: unknown[],
  named: Record<string, unknown> | undefined,
  histories: Map<string, number[]>,
  randomStates: Map<string, RuntimeRandomState>,
  callId = name,
  mintick = 0.01,
): unknown {
  const unary = (fn: (value: number) => number): number => fn(toRuntimeNumber(orderedRuntimeArg(args, named, ['number'], 0)));

  switch (name) {
    case 'math.abs': return unary(Math.abs);
    case 'math.sqrt': return unary(Math.sqrt);
    case 'math.log': return unary(Math.log);
    case 'math.log10': return unary(Math.log10);
    case 'math.exp': return unary(Math.exp);
    case 'math.floor': return unary(Math.floor);
    case 'math.ceil': return unary(Math.ceil);
    case 'math.trunc': return unary(Math.trunc);
    case 'math.sign': return unary(Math.sign);
    case 'math.sin': return unary(Math.sin);
    case 'math.cos': return unary(Math.cos);
    case 'math.tan': return unary(Math.tan);
    case 'math.asin': return unary(Math.asin);
    case 'math.acos': return unary(Math.acos);
    case 'math.atan': return unary(Math.atan);
    case 'math.toradians': return unary((number) => number * (Math.PI / 180));
    case 'math.todegrees': return unary((number) => number * (180 / Math.PI));
    case 'math.max': {
      const values = runtimeVariadicNumberArgs(args, named, 'number');
      return values.length > 0 ? Math.max(...values) : Number.NaN;
    }
    case 'math.min': {
      const values = runtimeVariadicNumberArgs(args, named, 'number');
      return values.length > 0 ? Math.min(...values) : Number.NaN;
    }
    case 'math.avg': {
      const values = runtimeVariadicNumberArgs(args, named, 'number');
      if (values.length === 0 || values.some((value) => Number.isNaN(value))) return Number.NaN;
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    }
    case 'math.random': {
      const names = ['min', 'max', 'seed'] as const;
      const min = toRuntimeNumber(orderedRuntimeArg(args, named, names, 0, 0));
      const max = toRuntimeNumber(orderedRuntimeArg(args, named, names, 1, 1));
      const seedArg = orderedRuntimeArg(args, named, names, 2);
      if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return Number.NaN;
      const seed = seedArg === undefined ? hashRuntimeRandomCallId(callId) : Math.trunc(toRuntimeNumber(seedArg));
      if (!Number.isFinite(seed)) return Number.NaN;
      const value = nextRuntimeSeededRandom(randomStates, `_math_random_${callId}`, seed);
      return min + toRuntimeExclusiveUnitRandom(value) * (max - min);
    }
    case 'math.pow': {
      const names = ['base', 'exponent'] as const;
      return Math.pow(
        toRuntimeNumber(orderedRuntimeArg(args, named, names, 0)),
        toRuntimeNumber(orderedRuntimeArg(args, named, names, 1)),
      );
    }
    case 'math.clamp': {
      const names = ['val', 'min', 'max'] as const;
      const value = toRuntimeNumber(orderedRuntimeArg(args, named, names, 0));
      const min = toRuntimeNumber(orderedRuntimeArg(args, named, names, 1));
      const max = toRuntimeNumber(orderedRuntimeArg(args, named, names, 2));
      if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) return Number.NaN;
      return Math.max(min, Math.min(max, value));
    }
    case 'math.round': {
      const names = ['number', 'precision'] as const;
      const value = toRuntimeNumber(orderedRuntimeArg(args, named, names, 0));
      const precisionArg = orderedRuntimeArg(args, named, names, 1);
      const precision = precisionArg === undefined ? 0 : Math.trunc(toRuntimeNumber(precisionArg));
      const factor = 10 ** precision;
      return Math.round(value * factor) / factor;
    }
    case 'math.round_to_mintick': {
      const value = toRuntimeNumber(orderedRuntimeArg(args, named, ['number'], 0));
      if (!Number.isFinite(value) || !Number.isFinite(mintick) || mintick <= 0) return Number.NaN;
      const quotient = value / mintick;
      const epsilon = Number.EPSILON * Math.max(1, Math.abs(quotient));
      return Number((Math.round(quotient + epsilon) * mintick).toFixed(runtimeDecimalPlacesForTick(mintick)));
    }
    case 'math.sum': {
      const names = ['source', 'length'] as const;
      const source = orderedRuntimeArg(args, named, names, 0);
      const length = normalizeRuntimeLookbackLength(orderedRuntimeArg(args, named, names, 1));
      const values = completeRuntimeNonNaWindow(histories, `_math_sum_source_${callId}`, source, length);
      return values ? values.reduce((sum, value) => sum + value, 0) : Number.NaN;
    }
    default:
      return Number.NaN;
  }
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

function transparencyToRuntimeAlpha(transparency: unknown): number {
  const normalizedTransparency = clampRuntimeChannel(transparency ?? 0, 0, 100);
  return clampRuntimeChannel(((100 - normalizedTransparency) / 100) * 255, 0, 255);
}

function alphaToRuntimeTransparency(alpha: number): number {
  return clampRuntimeChannel(100 - (alpha / 255) * 100, 0, 100);
}

function formatRuntimeColor(red: unknown, green: unknown, blue: unknown, transparency: unknown = 0): string {
  const channels = [red, green, blue, transparencyToRuntimeAlpha(transparency)];
  return `#${channels.map((channel) => clampRuntimeChannel(channel, 0, 255).toString(16).padStart(2, '0').toUpperCase()).join('')}`;
}

function parseRuntimeColor(value: unknown): { red: number; green: number; blue: number; alpha: number } | null {
  if (typeof value !== 'string') return null;

  const match = value.match(/^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/);
  if (!match) return null;

  const hex = match[1];
  return {
    red: parseInt(hex.slice(0, 2), 16),
    green: parseInt(hex.slice(2, 4), 16),
    blue: parseInt(hex.slice(4, 6), 16),
    alpha: match[2] ? parseInt(match[2], 16) : 255,
  };
}

function parseRuntimeColorInput(value: unknown): { red: number; green: number; blue: number; alpha: number } | null {
  return parseRuntimeColor(toPlotColor(value) ?? value);
}

function toRuntimeLineWidth(value: unknown): number {
  return toLineWidthValue(value, (candidate, min, max) => {
    const numberValue = typeof candidate === 'number' ? candidate : Number(candidate ?? 0);
    if (!Number.isFinite(numberValue)) return min;
    return Math.min(max, Math.max(min, Math.round(numberValue)));
  });
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

function interpolateLinePrice(line: LineDrawingOutput, x: number): number {
  if (line.xloc !== 'bar_index') return Number.NaN;
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

function markPersistentContainedValue(ctx: ExecutionContext, value: unknown, seen = new Set<unknown>()): void {
  if (!value || typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);
  (value as { persistent?: boolean }).persistent = true;
  if (isPineArray(value)) {
    for (let index = 0; index < getArraySize(value); index++) {
      const element = getArrayValue(value, index);
      markPersistentContainedValue(ctx, element, seen);
      markPersistentDrawingHandle(ctx, element);
    }
    return;
  }
  if (isPineUdtObject(value)) {
    for (const fieldValue of value.fields.values()) {
      markPersistentContainedValue(ctx, fieldValue, seen);
      markPersistentDrawingHandle(ctx, fieldValue);
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

function createCompiledBuiltinRegistry(): BuiltinRegistry {
  const builtins: BuiltinRegistry = new Map();
  const runtime = createCompiledDrawingRuntime();
  registerCompiledStringBuiltins(builtins);
  registerLabelBuiltins(builtins, runtime);
  registerLineBuiltins(builtins, runtime);
  registerLineFillBuiltins(builtins, runtime);
  registerBoxBuiltins(builtins, runtime);
  registerPolylineBuiltins(builtins, runtime);
  registerTableBuiltins(builtins, runtime);
  registerDrawingConstants(builtins);
  registerCompiledTimeframeBuiltins(builtins);
  registerCompiledFootprintBuiltins(builtins);
  registerCompiledLegacyBuiltins(builtins);
  builtins.set('syminfo.prefix', (args, named, ctx) => runtimeSyminfoPrefix(args, named, ctx));
  builtins.set('syminfo.ticker', (args, named, ctx) => runtimeSyminfoTicker(args, named, ctx));
  return builtins;
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
    const rows = createPineArray();
    rows.values = footprintRows(footprintArg(args, named));
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

  builtins.set('volume_row.up_price', (args, named) => volumeRowValue(rowArg(args, named), 'upPrice'));
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
    return undefined;
  });
}

function registerCompiledTimeframeBuiltins(builtins: BuiltinRegistry): void {
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
    if (previousTime === undefined || !Number.isFinite(previousTime)) return true;

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

  builtins.set('str.tostring', (args, named) => {
    const names = [['value'], ['format']] as const;
    const value = orderedRuntimeAliasedArg(args, named, names, 0);
    const format = orderedRuntimeAliasedArg(args, named, names, 1);
    return typeof value === 'number' && format !== undefined
      ? formatRuntimeNumber(value, toRuntimeString(format))
      : toRuntimeString(value);
  });
  builtins.set('str.tonumber', (args, named) => {
    const parsed = Number(toRuntimeString(orderedRuntimeAliasedArg(args, named, stringSourceArgs, 0)));
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  });
  builtins.set('str.tointeger', (args, named) => {
    const parsed = Number(toRuntimeString(orderedRuntimeAliasedArg(args, named, stringSourceArgs, 0)));
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
    const begin = Math.trunc(toRuntimeNumber(orderedRuntimeAliasedArg(args, named, stringSubstringArgs, 1, 0)));
    const endArg = orderedRuntimeAliasedArg(args, named, stringSubstringArgs, 2);
    const end = endArg === undefined ? undefined : Math.trunc(toRuntimeNumber(endArg));
    return source.substring(begin, end);
  });
  builtins.set('str.match', (args, named) => {
    const regex = toRuntimeString(orderedRuntimeAliasedArg(args, named, stringMatchArgs, 1));
    return toRuntimeString(sourceArg(args, named)).match(new RegExp(regex))?.[0] ?? '';
  });
  builtins.set('str.repeat', (args, named) => {
    const source = sourceArg(args, named);
    if (isRuntimeNa(source)) return Number.NaN;
    const repeat = Math.trunc(toRuntimeNumber(orderedRuntimeAliasedArg(args, named, stringRepeatArgs, 1)));
    if (!Number.isFinite(repeat) || repeat < 0) return Number.NaN;
    const separator = orderedRuntimeAliasedArg(args, named, stringRepeatArgs, 2, '');
    return Array.from({ length: repeat }, () => toRuntimeString(source)).join(toRuntimeString(separator));
  });
  builtins.set('str.split', (args, named) => {
    const array = createPineArray<string>();
    const separator = orderedRuntimeAliasedArg(args, named, stringSplitArgs, 1);
    array.values.push(...toRuntimeString(sourceArg(args, named)).split(toRuntimeString(separator)));
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
  builtins.set('str.replace_all', (args, named) =>
    toRuntimeString(sourceArg(args, named))
      .split(toRuntimeString(patternArg(args, named)))
      .join(toRuntimeString(orderedRuntimeAliasedArg(args, named, stringReplaceAllArgs, 2))));
}

function namedRecordToMap(named?: Record<string, unknown>): Map<string, unknown> {
  return new Map(Object.entries(named ?? {}));
}

function orderedRuntimeAliasedArg(
  args: unknown[],
  named: Map<string, unknown>,
  namesByIndex: readonly (readonly string[])[],
  index: number,
  fallback?: unknown,
): unknown {
  const names = namesByIndex[index] ?? [];
  const matches = names.filter((name) => named.has(name));
  if (matches.length > 1) {
    throw new Error(`Argument ${names.join('/')} was supplied multiple times: ${matches.join(', ')}`);
  }
  if (matches.length === 1) return named.get(matches[0]);

  const priorNamedCount = namesByIndex
    .slice(0, index)
    .filter((priorNames) => priorNames.some((name) => named.has(name))).length;
  const positionalIndex = index - priorNamedCount;
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
  const positionalIndex = index - names.slice(0, index).filter((name) => (
    named ? Object.prototype.hasOwnProperty.call(named, name) : false
  )).length;
  return args[positionalIndex] !== undefined ? args[positionalIndex] : fallback;
}

function normalizeRuntimeInputDisplay(value: unknown): unknown {
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
  return formatRuntimeString([rawMessage ?? '', ...args]);
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

const PLOT_COLOR_NAMES: Record<string, string> = {
  red: '#F23645',
  green: '#4CAF50',
  blue: '#2196F3',
  white: '#FFFFFF',
  yellow: '#FDD835',
  black: '#363A45',
  gray: '#787B86',
  grey: '#787B86',
  orange: '#FF9800',
  purple: '#9C27B0',
  aqua: '#00BCD4',
  fuchsia: '#E040FB',
  lime: '#00E676',
  maroon: '#880E4F',
  navy: '#311B92',
  olive: '#808000',
  silver: '#B2B5BE',
  teal: '#089981',
};

function toPlotColor(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return null;
  if (value in PLOT_COLOR_NAMES) return PLOT_COLOR_NAMES[value];
  return value;
}

function resolveRuntimeInputSource(value: unknown, ctx: ExecutionContext): unknown {
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
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return `${color}${alpha.toString(16).padStart(2, '0').toUpperCase()}`;
  return color;
}

function toPlotValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toMarkerValue(value: unknown): number | null {
  if (typeof value === 'boolean') return value ? 1 : null;
  if (typeof value === 'number') return Number.isFinite(value) && value !== 0 ? value : null;
  return null;
}

function ensureColorArray(plot: PlotOutput | undefined): (string | null)[] | null {
  if (!plot) return null;
  if (!Array.isArray(plot.color)) plot.color = [];
  return plot.color;
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

function evaluateSecuritySeries(
  secScript: CompiledSecurityScript,
  requestContext: RequestDataContext,
  outerSyminfo: ExecutionContext['syminfo'],
  runtimeOptions: TealscriptRuntimeOptions | undefined,
  maxBarsBack: number,
  captures?: Record<string, unknown>,
  recordSwallowedError?: (barIndex: number, error: unknown) => void,
): unknown[] {
  const deps = {
    NumericSeries, ValueSeries, maxBarsBack,
    _arr: ARRAY_HELPERS, _map: MAP_HELPERS, _udt: UDT_HELPERS, _mtx: MATRIX_HELPERS,
    ...ta,
  };
  const inst = new secScript.ScriptClass(deps);
  const values: unknown[] = [];
  let lastPlotValue: unknown = NaN;
  const requestBars = requestContext.bars;
  const requestTimeframe = runtimeTimeframeInfo(requestContext.timeframe, requestContext.timeframe) ?? {};
  const requestSyminfo = {
    ...requestContext.syminfo,
    ticker: requestContext.syminfo?.ticker ?? requestContext.symbol,
    tickerid: requestContext.syminfo?.tickerid ?? requestContext.symbol,
    main_tickerid: outerSyminfo.tickerid ?? outerSyminfo.ticker ?? '',
    currency: requestContext.currency ?? requestContext.syminfo?.currency ?? outerSyminfo.currency,
  };
  const requestRuntimeOptions: TealscriptRuntimeOptions = {
    ...runtimeOptions,
    session: {
      ...runtimeOptions?.session,
      ...requestContext.session,
    },
  };
  const builtinRegistry = createCompiledBuiltinRegistry();
  const builtinScope = new Scope();
  const builtinCtx = new ExecutionContext();
  builtinCtx.syminfo = requestSyminfo as ExecutionContext['syminfo'];
  builtinCtx.timeframe = requestTimeframe as ExecutionContext['timeframe'];
  builtinCtx.chart = { ...builtinCtx.chart, ...runtimeOptions?.chart };
  builtinCtx.loadBars(requestBars);
  applyCompiledChartFallbacks(builtinCtx, requestBars);

  for (let i = 0; i < requestBars.length; i++) {
    builtinCtx.advanceBar();
    const b = requestBars[i];
    lastPlotValue = NaN;
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
      strategyProp() { return 0; },
      strategyPropHistory() { return NaN; },
      strategyTradeProp() { return NaN; },
      strategyRisk() { return undefined; },
      requestSecurity() { return NaN; },
      requestSecurityLowerTf() { return createPineArray(); },
      requestCurrencyRate() { return NaN; },
      requestPointSeries() { return NaN; },
      requestFootprint() { return NaN; },
      requestSeed() { return NaN; },
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
        return resolveRuntimeCaptureValue(captures?.[name], b);
      },
      captureSource(name: string) {
        return resolveRuntimeCaptureSource(captures?.[name]);
      },
      timestamp(args: unknown[], named?: Record<string, unknown>) {
        const timeCtx = { time: { get: () => b.time }, syminfo: { timezone: 'Etc/UTC' } };
        return evaluateRuntimeTimestamp(args, named, timeCtx);
      },
      timeFilter() { return NaN; },
      calendarPart() { return NaN; },
      runtimeTimeValue() { return NaN; },
      sessionValue(name: string) {
        return getRuntimeSessionValue(requestRuntimeOptions, builtinCtx, requestBars, name);
      },
      nextBuiltinCallId(name: string) {
        return name;
      },
      callBuiltin(name: string, args: unknown[], named?: Record<string, unknown>, callId?: string) {
        const builtin = builtinRegistry.get(name);
        if (!builtin) return NaN;
        return builtin(args, namedRecordToMap(named), builtinCtx, builtinScope, callId ?? name);
      },
      callMethodBuiltin(name: string, receiver: unknown, args: unknown[], named?: Record<string, unknown>, callId?: string) {
        const builtinName = runtimeMethodBuiltinName(name, receiver, builtinCtx);
        const builtin = builtinName ? builtinRegistry.get(builtinName) : undefined;
        if (!builtin) return NaN;
        return builtin([receiver, ...args], namedRecordToMap(named), builtinCtx, builtinScope, callId ?? builtinName!);
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
        return builtin([receiver, ...args], namedRecordToMap(named), builtinCtx, builtinScope, callId ?? `${namespace}.${name}`);
      },
      colorNew() { return ''; }, colorRgb() { return ''; },
      colorR() { return 0; }, colorG() { return 0; }, colorB() { return 0; }, colorT() { return 0; },
      colorFromGradient() { return ''; },
      mathCall() { return NaN; },
      mathSum() { return NaN; },
      strFormat(args: unknown[], named?: Record<string, unknown>) { return formatRuntimeString(args, named); },
      strFormatTime(args: unknown[], named?: Record<string, unknown>) {
        const timeCtx = { time: { get: () => b.time }, syminfo: { timezone: 'Etc/UTC' } };
        return formatRuntimeTime(args, named, timeCtx);
      },
      tickerNew() { return ''; }, tickerModify() { return ''; }, tickerStandard() { return ''; }, tickerInherit() { return ''; },
      tickerHeikinashi() { return ''; }, tickerRenko() { return ''; }, tickerKagi() { return ''; },
      tickerLinebreak() { return ''; }, tickerPointfigure() { return ''; },
    };
    try {
      inst.onBar(secBarCtx as CompiledBarContext);
    } catch (error) {
      if (error instanceof CompiledRuntimeErrorException) {
        throw error;
      }
      recordSwallowedError?.(i, error);
      // Continue execution: non-runtime-error request expression failures return na for this requested bar.
    }
    values.push(lastPlotValue);
  }
  return values;
}

interface RuntimeSourceDescriptor {
  kind: 'series';
  name: string;
}

interface RuntimeCaptureDescriptor {
  kind: 'capture';
  value: unknown;
  source?: unknown;
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

function runtimeSourceDescriptorKey(value: unknown): string {
  return isRuntimeSourceDescriptor(value) ? `series:${value.name}` : '';
}

function runtimeCapturesKey(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right));
  return entries.map(([name, descriptor]) => {
    if (isRuntimeCaptureDescriptor(descriptor)) {
      const sourceKey = runtimeSourceDescriptorKey(descriptor.source);
      if (sourceKey) return `${name}:${sourceKey}`;
      return `${name}:${JSON.stringify(descriptor.value)}`;
    }
    return `${name}:${JSON.stringify(descriptor)}`;
  }).join('|');
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
  return isRuntimeSourceDescriptor(value.source) ? value.source : undefined;
}

function findConfirmedRequestBarIndex(requestBars: Bar[], chartTime: number): number {
  let index = -1;
  for (let i = 0; i < requestBars.length - 1; i++) {
    if (requestBars[i + 1]!.time <= chartTime) {
      index = i;
    } else {
      break;
    }
  }
  return index;
}

function findActiveRequestBarIndex(requestBars: Bar[], chartTime: number): number {
  let index = -1;
  for (let i = 0; i < requestBars.length; i++) {
    if (requestBars[i]!.time <= chartTime) {
      index = i;
    } else {
      break;
    }
  }
  return index;
}

function mergeRequestedValue(
  requestBars: Bar[],
  requestedValues: unknown[],
  chartTime: number,
  previousChartTime: number | undefined,
  gaps: string,
  lookahead: string,
  isRealtimeUnconfirmed = false,
): unknown {
  if (requestBars.length === 0) return NaN;

  const selectedIndex = lookahead === 'barmerge.lookahead_on' || isRealtimeUnconfirmed
    ? findActiveRequestBarIndex(requestBars, chartTime)
    : findConfirmedRequestBarIndex(requestBars, chartTime);
  if (selectedIndex < 0) return NaN;

  if (gaps === 'barmerge.gaps_on') {
    const availableAt = lookahead === 'barmerge.lookahead_on' || isRealtimeUnconfirmed
      ? requestBars[selectedIndex]?.time
      : requestBars[selectedIndex + 1]?.time;
    if (availableAt === undefined || (previousChartTime !== undefined && previousChartTime >= availableAt)) {
      return NaN;
    }
  }

  return requestedValues[selectedIndex] ?? NaN;
}

function collectLowerTimeframeValues(
  requestBars: Bar[],
  requestedValues: unknown[],
  chartStart: number,
  chartEnd: number,
): PineArray {
  const array = createPineArray();
  if (!Number.isFinite(chartStart) || !Number.isFinite(chartEnd) || chartEnd <= chartStart) {
    return array;
  }

  for (let i = 0; i < requestBars.length; i++) {
    const requestTime = requestBars[i]!.time;
    if (requestTime >= chartStart && requestTime < chartEnd) {
      pushArrayValue(array, requestedValues[i] ?? NaN);
    }
  }

  return array;
}

function mergeRequestSeriesValue(
  points: RequestSeriesPoint[],
  chartTime: number,
  previousChartTime: number | undefined,
  gaps: unknown = 'barmerge.gaps_off',
): number {
  if (!Number.isFinite(chartTime) || points.length === 0) return NaN;
  const sortedPoints = [...points].sort((left, right) => left.time - right.time);
  let value = NaN;
  let valueTime = NaN;
  for (const point of sortedPoints) {
    if (point.time <= chartTime) {
      value = point.value;
      valueTime = point.time;
    } else {
      break;
    }
  }
  if (String(gaps ?? 'barmerge.gaps_off') === 'barmerge.gaps_on') {
    return Number.isFinite(value) && (previousChartTime === undefined || previousChartTime < valueTime)
      ? value
      : NaN;
  }
  return value;
}

function normalizeRuntimeRequestSeriesField(value: unknown, defaultField: string): string {
  if (value === undefined || isRuntimeNa(value)) return defaultField;
  const field = toRuntimeString(value).trim();
  return field === '' ? defaultField : field;
}

function requestPointSeriesSpec(
  name: string,
  args: unknown[],
  named: Record<string, unknown> | undefined,
): { family: RequestSeriesFamily; key: string; gaps: unknown; ignoreInvalid: boolean } {
  if (name === 'request.dividends' || name === 'request.earnings' || name === 'request.splits') {
    const names = ['ticker', 'field', 'gaps', 'lookahead', 'ignore_invalid_symbol', 'currency'] as const;
    const family = name.slice('request.'.length) as 'dividends' | 'earnings' | 'splits';
    const ticker = toRuntimeString(orderedRuntimeArg(args, named, names, 0)).trim();
    const defaultField = family === 'dividends' ? 'dividends.gross' : family === 'earnings' ? 'earnings.actual' : 'splits.denominator';
    const field = normalizeRuntimeRequestSeriesField(orderedRuntimeArg(args, named, names, 1), defaultField);
    const gaps = orderedRuntimeArg(args, named, names, 2, 'barmerge.gaps_off');
    const ignoreInvalid = isRuntimeTruthy(orderedRuntimeArg(args, named, names, 4, false));
    const currency = family === 'splits'
      ? undefined
      : normalizeRuntimeRequestCurrency(orderedRuntimeArg(args, named, names, 5));
    return { family, key: corporateActionRequestKey(ticker, field, currency), gaps, ignoreInvalid };
  }

  if (name === 'request.financial') {
    const names = ['symbol', 'financial_id', 'period', 'gaps', 'ignore_invalid_symbol', 'currency'] as const;
    const symbol = toRuntimeString(orderedRuntimeArg(args, named, names, 0)).trim();
    const financialId = toRuntimeString(orderedRuntimeArg(args, named, names, 1)).trim();
    const period = toRuntimeString(orderedRuntimeArg(args, named, names, 2)).trim().toUpperCase();
    const gaps = orderedRuntimeArg(args, named, names, 3, 'barmerge.gaps_off');
    const ignoreInvalid = isRuntimeTruthy(orderedRuntimeArg(args, named, names, 4, false));
    const currency = normalizeRuntimeRequestCurrency(orderedRuntimeArg(args, named, names, 5));
    return { family: 'financial', key: financialRequestKey(symbol, financialId, period, currency), gaps, ignoreInvalid };
  }

  if (name === 'request.economic') {
    const names = ['country_code', 'field', 'gaps', 'ignore_invalid_symbol'] as const;
    const countryCode = toRuntimeString(orderedRuntimeArg(args, named, names, 0)).trim().toUpperCase();
    const field = toRuntimeString(orderedRuntimeArg(args, named, names, 1)).trim();
    const gaps = orderedRuntimeArg(args, named, names, 2, 'barmerge.gaps_off');
    const ignoreInvalid = isRuntimeTruthy(orderedRuntimeArg(args, named, names, 3, false));
    return { family: 'economic', key: economicRequestKey(countryCode, field), gaps, ignoreInvalid };
  }

  const names = ['ticker', 'gaps', 'index', 'ignore_invalid_symbol'] as const;
  const ticker = toRuntimeString(orderedRuntimeArg(args, named, names, 0)).trim();
  const gaps = orderedRuntimeArg(args, named, names, 1, 'barmerge.gaps_off');
  const column = Math.trunc(toRuntimeNumber(orderedRuntimeArg(args, named, names, 2, 0)));
  const ignoreInvalid = isRuntimeTruthy(orderedRuntimeArg(args, named, names, 3, false));
  return { family: 'quandl', key: quandlRequestKey(ticker, column), gaps, ignoreInvalid };
}

export function executeCompiled(
  compiled: CompiledScript,
  bars: Bar[],
  inputs?: Map<string, unknown>,
  options?: CompiledExecutionOptions,
): ExecutionResult | null {
  if (!compiled.success) return null;

  const startMs = performance.now();
  const ctx = new ExecutionContext();
  const builtinRegistry = createCompiledBuiltinRegistry();
  const builtinScope = new Scope();
  const mathHistories = new Map<string, number[]>();
  const mathRandomStates = new Map<string, RuntimeRandomState>();
  const inputDefs = new Map<string, InputDefinition>();
  const inputCallSiteIds = new Map<string, string>();

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

  const declarationNode = compiled.analysis.declarationInfo?.node;
  const labelLimit = staticNumberValue(declarationNode?.max_labels_count);
  const lineLimit = staticNumberValue(declarationNode?.max_lines_count);
  const boxLimit = staticNumberValue(declarationNode?.max_boxes_count);
  const polylineLimit = staticNumberValue(declarationNode?.max_polylines_count);
  if (labelLimit !== undefined) ctx.setDrawingLimit('label', labelLimit);
  if (lineLimit !== undefined) ctx.setDrawingLimit('line', lineLimit);
  if (boxLimit !== undefined) ctx.setDrawingLimit('box', boxLimit);
  if (polylineLimit !== undefined) ctx.setDrawingLimit('polyline', polylineLimit);

  const declarationTimeframe = resolveDeclarationTimeframe(
    declarationNode?.timeframe,
    inputs,
    inputDefs,
    compiled.analysis.inputSites,
  );
  if (declarationTimeframe !== null && declarationTimeframe.trim() !== '') {
    const info = runtimeTimeframeInfo(declarationTimeframe, ctx.timeframe.period);
    if (info === null) {
      throw new Error(`Invalid indicator timeframe: ${declarationTimeframe.trim().toUpperCase()}`);
    }
    ctx.timeframe = info;
    ctx.indicatorTimeframe = info.period;
  }
  if (options?.runtime?.chart) {
    ctx.chart = { ...ctx.chart, ...options.runtime.chart };
  }
  ctx.loadBars(bars);
  applyCompiledChartFallbacks(ctx, bars);

  const isStrategy = compiled.analysis.declarationInfo?.kind === 'strategy';
  const strategySettings = extractStrategySettings(compiled);
  if (options?.runtime?.syminfo?.currency) {
    strategySettings.currency = options.runtime.syminfo.currency;
  }
  const ledger = createStrategyLedger(strategySettings);
  const mintick = (ctx.syminfo as unknown as { mintick: number }).mintick ?? 0.01;
  const lastBarIndex = bars.length - 1;

  const deps = {
    NumericSeries,
    ValueSeries,
    maxBarsBack: options?.maxBarsBack ?? 500,
    _arr: ARRAY_HELPERS,
    _map: MAP_HELPERS,
    _udt: UDT_HELPERS,
    _mtx: MATRIX_HELPERS,
    ...ta,
  };

  const inst = new compiled.ScriptClass(deps);

  const plotRegistered = new Map<number, string>();
  const plotArrays = new Map<number, (number | null)[]>();
  const plotColors = new Map<number, string>();
  const alertRegistered = new Map<string, string>();
  const strategyPropHistories = new Map<string, ValueSeries>();
  const securityCache = new Map<string, { bars: Bar[]; values: unknown[] }>();
  const requestSeriesCache = new Map<string, RequestSeriesPoint[]>();
  const requestContextKeys = new Set<string>();
  const requestDatafeed = options?.requestDatafeed;
  const errors: ExecutionError[] = [];
  const swallowedErrors: RuntimeSwallowedErrorAccumulator = new Map();
  const runtimeBuiltinCallCounts = new Map<string, number>();
  const trackRequestContext = (key: string): void => {
    requestContextKeys.add(key);
    if (requestContextKeys.size > TEALSCRIPT_MAX_UNIQUE_REQUEST_CONTEXTS) {
      throwCompiledRuntimeError(`Too many unique request.* contexts: maximum is ${TEALSCRIPT_MAX_UNIQUE_REQUEST_CONTEXTS}`);
    }
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
    if (isStrategyHistoryProp(name)) return readStrategyHistoryProp(ledger, name);
    return 0;
  };
  const strategyPropSeries = (name: string): ValueSeries => {
    let series = strategyPropHistories.get(name);
    if (!series) {
      series = new ValueSeries(options?.maxBarsBack ?? 500);
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
      const activeFillArgs = visualPineVersion <= 4 ? fillV4Args : fillArgs;
      const activeBgcolorArgs = visualPineVersion <= 4 ? bgcolorV4Args : bgcolorArgs;
      const activeMarkerArgs = visualPineVersion <= 4 ? markerV4Args : markerArgs;
      const activePlotarrowArgs = visualPineVersion <= 4 ? plotarrowV4Args : plotarrowArgs;

      if (funcName === 'hline') {
        let arr = plotArrays.get(index);
        if (!arr) {
          const title = String(plotArg(value, named, extraArgs, hlineArgs, 'title', 'HLine'));
          const plotId = visualOutputId('hline', `hline_${funcCallIndex}`, `hline_${title}`);
          ctx.registerPlot({
            id: plotId,
            type: 'hline',
            title,
            color: toPlotColor(plotArg(value, named, extraArgs, hlineArgs, 'color', '#787B86')) ?? '#787B86',
            linewidth: toOptionalNumber(plotArg(value, named, extraArgs, hlineArgs, 'linewidth', 1)),
            lineStyle: normalizeRuntimePlotLineStyle(plotArg(value, named, extraArgs, hlineArgs, 'linestyle', 'solid')),
            editable: toOptionalBoolean(plotArg(value, named, extraArgs, hlineArgs, 'editable')),
            display: toOptionalDisplay(plotArg(value, named, extraArgs, hlineArgs, 'display')),
            price: toOptionalNumber(plotArg(value, named, extraArgs, hlineArgs, 'price')),
          });
          plotRegistered.set(index, plotId);
          arr = ctx.getPlots().find((p) => p.id === plotId)!.values;
          plotArrays.set(index, arr);
        }
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
        const titleArg = plotArg(value, canonicalNamed, extraArgs, activeFillArgs, 'title');
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
            plot1Id: toOptionalString(plotArg(value, canonicalNamed, extraArgs, activeFillArgs, 'plot1')),
            plot2Id: toOptionalString(plotArg(value, canonicalNamed, extraArgs, activeFillArgs, 'plot2')),
            editable: toOptionalBoolean(plotArg(value, canonicalNamed, extraArgs, activeFillArgs, 'editable')),
            showLast: toOptionalNumber(plotArg(value, canonicalNamed, extraArgs, activeFillArgs, 'show_last')),
            fillgaps: toOptionalBoolean(plotArg(value, canonicalNamed, extraArgs, activeFillArgs, 'fillgaps')),
            display: toOptionalDisplay(plotArg(value, canonicalNamed, extraArgs, activeFillArgs, 'display')),
          });
          plotRegistered.set(index, plotId);
          arr = ctx.getPlots().find((p) => p.id === plotId)!.values;
          plotArrays.set(index, arr);
        }
        const color = applyPlotTransparency(
          toPlotColor(plotArg(value, canonicalNamed, extraArgs, activeFillArgs, 'color', 'rgba(33, 150, 243, 0.2)')),
          plotArg(value, canonicalNamed, extraArgs, activeFillArgs, 'transp'),
        );
        const plot = ctx.getPlots().find((p) => p.id === plotRegistered.get(index));
        ensureColorArray(plot)?.push(color);
        arr.push(color === null ? null : 1);
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
            shape: funcName === 'plotshape' ? normalizeRuntimePlotshapeStyle(plotArg(value, named, extraArgs, activeMarkerArgs, 'style', 'circle')) : undefined,
            char: funcName === 'plotchar' ? toOptionalString(plotArg(value, named, extraArgs, activeMarkerArgs, 'char', '●')) : undefined,
            location: toOptionalString(plotArg(value, named, extraArgs, activeMarkerArgs, 'location', 'abovebar')) as PlotOutput['location'],
            size: toOptionalString(plotArg(value, named, extraArgs, activeMarkerArgs, 'size', 'normal')) as PlotOutput['size'],
            text: toOptionalString(plotArg(value, named, extraArgs, activeMarkerArgs, 'text', '')),
            textValues: [],
            textColor: toPlotColor(plotArg(value, named, extraArgs, activeMarkerArgs, 'textcolor', '#FFFFFF')) ?? [],
            offset: toOptionalNumber(plotArg(value, named, extraArgs, activeMarkerArgs, 'offset')),
            editable: toOptionalBoolean(plotArg(value, named, extraArgs, activeMarkerArgs, 'editable')),
            showLast: toOptionalNumber(plotArg(value, named, extraArgs, activeMarkerArgs, 'show_last')),
            display: toOptionalDisplay(plotArg(value, named, extraArgs, activeMarkerArgs, 'display')),
            format: toOptionalString(plotArg(value, named, extraArgs, activeMarkerArgs, 'format')),
            precision: toOptionalNumber(plotArg(value, named, extraArgs, activeMarkerArgs, 'precision')),
            forceOverlay: toOptionalBoolean(plotArg(value, named, extraArgs, activeMarkerArgs, 'force_overlay')),
          });
          plotRegistered.set(index, plotId);
          arr = ctx.getPlots().find((p) => p.id === plotId)!.values;
          plotArrays.set(index, arr);
        }
        const markerValue = toMarkerValue(value);
        const plot = ctx.getPlots().find((p) => p.id === plotRegistered.get(index));
        const markerColor = applyPlotTransparency(
          toPlotColor(plotArg(value, named, extraArgs, activeMarkerArgs, 'color', '#2196F3')),
          plotArg(value, named, extraArgs, activeMarkerArgs, 'transp'),
        );
        ensureColorArray(plot)?.push(markerValue === null ? null : markerColor);
        setPlotTextColorValue(plot, ctx.bar_index, markerValue === null ? null : toPlotColor(plotArg(value, named, extraArgs, activeMarkerArgs, 'textcolor', '#FFFFFF')));
        setPlotTextValue(plot, ctx.bar_index, markerValue === null ? null : toOptionalString(plotArg(value, named, extraArgs, activeMarkerArgs, 'text', '')) ?? '');
        arr.push(markerValue);
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
            offset: toOptionalNumber(plotArg(value, named, extraArgs, activePlotarrowArgs, 'offset')),
            minHeight: toOptionalNumber(plotArg(value, named, extraArgs, activePlotarrowArgs, 'minheight')),
            maxHeight: toOptionalNumber(plotArg(value, named, extraArgs, activePlotarrowArgs, 'maxheight')),
            editable: toOptionalBoolean(plotArg(value, named, extraArgs, activePlotarrowArgs, 'editable')),
            showLast: toOptionalNumber(plotArg(value, named, extraArgs, activePlotarrowArgs, 'show_last')),
            display: toOptionalDisplay(plotArg(value, named, extraArgs, activePlotarrowArgs, 'display')),
            format: toOptionalString(plotArg(value, named, extraArgs, activePlotarrowArgs, 'format')),
            precision: toOptionalNumber(plotArg(value, named, extraArgs, activePlotarrowArgs, 'precision')),
            forceOverlay: toOptionalBoolean(plotArg(value, named, extraArgs, activePlotarrowArgs, 'force_overlay')),
          });
          plotRegistered.set(index, plotId);
          arr = ctx.getPlots().find((p) => p.id === plotId)!.values;
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
        const plot = ctx.getPlots().find((p) => p.id === plotRegistered.get(index));
        ensureColorArray(plot)?.push(Number.isFinite(series) && series !== 0 ? (series > 0 ? colorup : colordown) : null);
        if (plot && Array.isArray(plot.colorup)) plot.colorup.push(Number.isFinite(series) && series > 0 ? colorup : null);
        if (plot && Array.isArray(plot.colordown)) plot.colordown.push(Number.isFinite(series) && series < 0 ? colordown : null);
        arr.push(Number.isFinite(series) && series !== 0 ? series : null);
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
            offset: toOptionalNumber(plotArg(value, named, extraArgs, args, 'offset')),
            editable: toOptionalBoolean(plotArg(value, named, extraArgs, args, 'editable')),
            showLast: toOptionalNumber(plotArg(value, named, extraArgs, args, 'show_last')),
            display: toOptionalDisplay(plotArg(value, named, extraArgs, args, 'display')),
            forceOverlay: funcName === 'bgcolor' ? toOptionalBoolean(plotArg(value, named, extraArgs, activeBgcolorArgs, 'force_overlay')) : undefined,
          });
          plotRegistered.set(index, plotId);
          arr = ctx.getPlots().find((p) => p.id === plotId)!.values;
          plotArrays.set(index, arr);
        }
        const color = applyPlotTransparency(
          toPlotColor(plotArg(value, named, extraArgs, args, 'color')),
          plotArg(value, named, extraArgs, args, 'transp'),
        );
        ensureColorArray(ctx.getPlots().find((p) => p.id === plotRegistered.get(index)))?.push(color);
        arr.push(funcName === 'bgcolor' && color !== null ? 1 : null);
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
            editable: toOptionalBoolean(plotArg(value, named, extraArgs, args, 'editable')),
            showLast: toOptionalNumber(plotArg(value, named, extraArgs, args, 'show_last')),
            display: toOptionalDisplay(plotArg(value, named, extraArgs, args, 'display')),
            format: toOptionalString(plotArg(value, named, extraArgs, args, 'format')),
            precision: toOptionalNumber(plotArg(value, named, extraArgs, args, 'precision')),
            forceOverlay: toOptionalBoolean(plotArg(value, named, extraArgs, args, 'force_overlay')),
          });
          plotRegistered.set(index, plotId);
          arr = ctx.getPlots().find((p) => p.id === plotId)!.values;
          plotArrays.set(index, arr);
        }

        const open = toPlotValue(plotArg(value, named, extraArgs, args, 'open'));
        const high = toPlotValue(plotArg(value, named, extraArgs, args, 'high'));
        const low = toPlotValue(plotArg(value, named, extraArgs, args, 'low'));
        const close = toPlotValue(plotArg(value, named, extraArgs, args, 'close'));
        const hasGap = open === null || high === null || low === null || close === null;
        const normalizedOpen = hasGap ? null : open;
        const normalizedHigh = hasGap ? null : high;
        const normalizedLow = hasGap ? null : low;
        const normalizedClose = hasGap ? null : close;
        const defaultColor = close !== null && open !== null && close >= open ? '#4CAF50' : '#F23645';
        const transp = plotArg(value, named, extraArgs, args, 'transp');
        const color = applyPlotTransparency(toPlotColor(plotArg(value, named, extraArgs, args, 'color', defaultColor)) ?? defaultColor, transp) ?? defaultColor;
        const normalizedColor = hasGap ? null : color;
        const plot = ctx.getPlots().find((p) => p.id === plotRegistered.get(index));
        const setAtBar = <T>(values: T[] | undefined, barIndex: number, plotValue: T): void => {
          if (!values) return;
          while (values.length < barIndex) values.push(null as T);
          values[barIndex] = plotValue;
        };
        setAtBar(plot?.openValues, ctx.bar_index, normalizedOpen);
        setAtBar(plot?.highValues, ctx.bar_index, normalizedHigh);
        setAtBar(plot?.lowValues, ctx.bar_index, normalizedLow);
        setAtBar(plot?.closeValues, ctx.bar_index, normalizedClose);
        setAtBar(ensureColorArray(plot) ?? undefined, ctx.bar_index, normalizedColor);
        if (funcName === 'plotcandle') {
          const wickColor = applyPlotTransparency(toPlotColor(plotArg(value, named, extraArgs, plotcandleArgs, 'wickcolor', color)) ?? color, transp) ?? color;
          const borderColor = applyPlotTransparency(toPlotColor(plotArg(value, named, extraArgs, plotcandleArgs, 'bordercolor', color)) ?? color, transp) ?? color;
          if (plot && Array.isArray(plot.wickColor)) setAtBar(plot.wickColor, ctx.bar_index, hasGap ? null : wickColor);
          if (plot && Array.isArray(plot.borderColor)) setAtBar(plot.borderColor, ctx.bar_index, hasGap ? null : borderColor);
        }
        setAtBar(arr, ctx.bar_index, normalizedClose);
        return normalizedClose;
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
        ) ?? 'blue';
        plotColors.set(index, color);

        ctx.registerPlot({
          id: plotId,
          type: funcName as PlotOutput['type'],
          title,
          color: [],
          linewidth: toOptionalNumber(plotArg(value, named, extraArgs, activePlotArgs, 'linewidth')),
          style: normalizeRuntimePlotStyle(plotArg(value, named, extraArgs, activePlotArgs, 'style')),
          offset: toOptionalNumber(plotArg(value, named, extraArgs, activePlotArgs, 'offset')),
          trackprice: toOptionalBoolean(plotArg(value, named, extraArgs, activePlotArgs, 'trackprice')),
          histbase: toOptionalNumber(plotArg(value, named, extraArgs, activePlotArgs, 'histbase')),
          join: toOptionalBoolean(plotArg(value, named, extraArgs, activePlotArgs, 'join')),
          editable: toOptionalBoolean(plotArg(value, named, extraArgs, activePlotArgs, 'editable')),
          showLast: toOptionalNumber(plotArg(value, named, extraArgs, activePlotArgs, 'show_last')),
          display: toOptionalDisplay(plotArg(value, named, extraArgs, activePlotArgs, 'display')),
          format: toOptionalString(plotArg(value, named, extraArgs, activePlotArgs, 'format')),
          precision: toOptionalNumber(plotArg(value, named, extraArgs, activePlotArgs, 'precision')),
          forceOverlay: toOptionalBoolean(plotArg(value, named, extraArgs, activePlotArgs, 'force_overlay')),
          lineStyle: normalizeRuntimePlotLineStyle(plotArg(value, named, extraArgs, activePlotArgs, 'linestyle')),
        });
        plotRegistered.set(index, plotId);
        const plot = ctx.getPlots().find((p) => p.id === plotId);
        arr = plot!.values;
        plotArrays.set(index, arr);
      }

      const plot = ctx.getPlots().find((p) => p.id === plotRegistered.get(index));
      ensureColorArray(plot)?.push(applyPlotTransparency(
        toPlotColor(plotArg(value, named, extraArgs, activePlotArgs, 'color', 'blue')),
        plotArg(value, named, extraArgs, activePlotArgs, 'transp'),
      ) ?? 'blue');
      const numValue = toPlotValue(value);
      arr.push(numValue);
      return plotRegistered.get(index);
    },

    input(id: string, funcName: string, defval: unknown, named: Record<string, unknown>, extraArgs: unknown[]) {
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
      const inputBareArgs = ['defval', 'title', 'tooltip', 'inline', 'group', 'display', 'active'] as const;
      const legacyInputArgs = ['defval', 'title', 'type', 'minval', 'maxval', 'confirm', 'step', 'options', 'tooltip', 'inline', 'group', 'display', 'active'] as const;
      const explicitType = funcName === 'input'
        ? normalizeRuntimeInputType(inputArg(legacyInputArgs, 2))
        : normalizeRuntimeInputType(funcName.replace('input.', ''));
      const hasGenericSourceDefval = funcName === 'input' && typeof named.__tealscriptInputDefaultSource === 'string';
      const defaultInputType = explicitType ?? (hasGenericSourceDefval ? 'source' : inferRuntimeInputType(inputArg(inputSimpleArgs, 0)));
      const type = defaultInputType;
      const legacy = funcName === 'input' && explicitType !== undefined;
      const hasOptions = legacy
        ? Array.isArray(inputArg(legacyInputArgs, 7))
        : Object.prototype.hasOwnProperty.call(named, 'options') || Array.isArray(inputArg(inputOptionsArgs, 2));
      const metadataNames = legacy
        ? legacyInputArgs
        : (funcName === 'input' ? inputBareArgs : undefined)
          ?? ((type === 'int' || type === 'float')
            ? (hasOptions ? inputOptionsArgs : inputRangeArgs)
            : (type === 'string' || type === 'timeframe' || type === 'enum' ? inputOptionsArgs : inputSimpleArgs));
      const metadataStart = legacy
        ? 8
        : funcName === 'input'
          ? 2
        : type === 'int' || type === 'float'
          ? (hasOptions ? 3 : 5)
          : (type === 'string' || type === 'timeframe' || type === 'enum' ? 3 : 2);
      const defaultValue = inputArg(metadataNames, 0);
      const title = toRuntimeString(inputArg(metadataNames, 1, type));
      const inputDefaultValue = type === 'color' ? toPlotColor(defaultValue) ?? defaultValue : defaultValue;
      const metadata: Partial<InputDefinition> = {
        tooltip: optionalString(metadataNames, metadataStart),
        inline: optionalString(metadataNames, metadataStart + 1),
        group: optionalString(metadataNames, metadataStart + 2),
        confirm: funcName === 'input' && !legacy ? undefined : optionalBoolean(metadataNames, legacy ? 5 : metadataStart + 3),
        display: normalizeRuntimeInputDisplay(inputArg(metadataNames, legacy ? 11 : metadataStart + (funcName === 'input' ? 3 : 4))),
        active: inputArg(metadataNames, legacy ? 12 : metadataStart + (funcName === 'input' ? 4 : 5)),
      };
      const options = inputArg(metadataNames, legacy ? 7 : 2);
      if (type === 'int' || type === 'float' || type === 'string' || type === 'timeframe' || type === 'enum') {
        metadata.options = Array.isArray(options) ? options : undefined;
      }
      if (!hasOptions && (type === 'int' || type === 'float')) {
        metadata.minval = optionalNumber(metadataNames, legacy ? 3 : 2);
        metadata.maxval = optionalNumber(metadataNames, legacy ? 4 : 3);
        metadata.step = optionalNumber(metadataNames, legacy ? 6 : 4);
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
        inputDefs.set(inputId, {
          id: inputId,
          type,
          title,
          defval: inputDefaultValue,
          ...metadata,
        });
      }

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
        if (!canSubmitCompiledStrategyEntry(ledger, direction)) return;
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
        const order = submitStrategyOrder(ledger, {
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
        const limitPrice = toOptionalNumber(compiledOrderedArg(pos, named, COMPILED_STRATEGY_EXIT_ARGS, 5))
          ?? resolveCompiledStrategyExitOffsetPrice(entryDirection, openTrades, profitTicks, 'profit', mintick);
        const stopPrice = toOptionalNumber(compiledOrderedArg(pos, named, COMPILED_STRATEGY_EXIT_ARGS, 7))
          ?? resolveCompiledStrategyExitOffsetPrice(entryDirection, openTrades, lossTicks, 'loss', mintick);
        const trailActivationPrice = resolveCompiledStrategyTrailActivationPrice(
          entryDirection,
          openTrades,
          toOptionalNumber(compiledOrderedArg(pos, named, COMPILED_STRATEGY_EXIT_ARGS, 8)),
          toOptionalNumber(compiledOrderedArg(pos, named, COMPILED_STRATEGY_EXIT_ARGS, 9)),
          mintick,
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
        const ocaName = suffixOrders ? (fromEntry === undefined ? id : `${fromEntry}:${id}`) : undefined;
        if (limitPrice !== undefined) {
          submitOrReplaceStrategyExitOrder(ledger, {
            id: suffixOrders ? `${id} Limit` : id, sourceId: id, direction: exitDir, qty, qtyType: 'fixed', qtyValue: qty,
            isExit: true, fromEntry, limitPrice, ocaName, ocaType: suffixOrders ? 'cancel' : undefined,
            comment: toOptionalString(compiledOrderedArg(pos, named, COMPILED_STRATEGY_EXIT_ARGS, 13)) ?? comment,
            alertMessage: toOptionalString(compiledOrderedArg(pos, named, COMPILED_STRATEGY_EXIT_ARGS, 17)) ?? alertMessage,
            disableAlert, barIndex, time: bar.time,
          });
        }
        if (stopPrice !== undefined) {
          submitOrReplaceStrategyExitOrder(ledger, {
            id: suffixOrders ? `${id} Stop` : id, sourceId: id, direction: exitDir, qty, qtyType: 'fixed', qtyValue: qty,
            isExit: true, fromEntry, stopPrice, ocaName, ocaType: suffixOrders ? 'cancel' : undefined,
            comment: toOptionalString(compiledOrderedArg(pos, named, COMPILED_STRATEGY_EXIT_ARGS, 14)) ?? comment,
            alertMessage: toOptionalString(compiledOrderedArg(pos, named, COMPILED_STRATEGY_EXIT_ARGS, 18)) ?? alertMessage,
            disableAlert, barIndex, time: bar.time,
          });
        }
        if (trailActivationPrice !== undefined && trailOffset !== undefined) {
          submitOrReplaceStrategyExitOrder(ledger, {
            id: suffixOrders ? `${id} Trail` : id, sourceId: id, direction: exitDir, qty, qtyType: 'fixed', qtyValue: qty,
            isExit: true, fromEntry, trailActivationPrice, trailOffset, ocaName, ocaType: suffixOrders ? 'cancel' : undefined,
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
        const id = String(compiledOrderedArg(pos, named, ['id'], 0, '') ?? '');
        if (id) cancelStrategyOrder(ledger, id, barIndex, bar.time);
      },
      strategyCancelAll() {
        if (!isStrategy) return;
        cancelAllStrategyOrders(ledger, barIndex, bar.time);
      },
      strategyProp(name: string) {
        return readStrategyProp(name);
      },
      strategyPropHistory(name: string, offset: unknown) {
        const numericOffset = toRuntimeNumber(offset);
        const index = Number.isFinite(numericOffset) ? Math.trunc(numericOffset) : 0;
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
          : trade.profit;
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
        const symStr = String(symbol ?? '');
        const tfStr = normalizeRuntimeTimeframePeriod(String(timeframe ?? ''), String(ctx.timeframe.period ?? ''));
        const gapsStr = String(gaps ?? 'barmerge.gaps_off');
        const laStr = String(lookahead ?? 'barmerge.lookahead_off');
        const currencyStr = normalizeRuntimeRequestCurrency(currency);
        const calcBars = normalizeRuntimePositiveInteger(calcBarsCount);
        const sourceKey = runtimeSourceDescriptorKey(sourceDescriptor);
        const capturesKey = runtimeCapturesKey(captures);
        const cacheKey = `${secId}:${symStr}:${tfStr}:${currencyStr ?? ''}:${calcBars ?? ''}:${sourceKey}:${capturesKey}`;
        trackRequestContext(`request.security\u0000${secId}\u0000${symStr}\u0000${tfStr}\u0000${currencyStr ?? ''}\u0000${calcBars ?? ''}\u0000${sourceKey}\u0000${capturesKey}`);

        let cached = securityCache.get(cacheKey);
        if (!cached) {
          const secScript = compiled.securityScripts.get(secId);
          if (!requestDatafeed) {
            throwCompiledRuntimeError('request.security requires a request datafeed');
          }

          const result = requestDatafeed.getBars({
            symbol: symStr,
            timeframe: tfStr,
            currency: currencyStr,
            calcBarsCount: calcBars,
          });
          if (!result.ok) {
            if (
              isRuntimeTruthy(ignoreInvalidSymbol)
              && isInvalidOrUnavailableRequestContext(result.code)
            ) {
              return NaN;
            }
            throwCompiledRuntimeError(`request.security failed: ${result.message}`);
          }

          const values = secScript
            ? evaluateSecuritySeries(
              secScript,
              result.context,
              ctx.syminfo,
              options?.runtime,
              options?.maxBarsBack ?? 500,
              captures,
              (requestBarIndex, error) => recordSwallowedRuntimeError(
                swallowedErrors,
                `compiled-request-expression:request.security:${secId}`,
                requestBarIndex,
                error,
              ),
            )
            : evaluateRequestedSourceSeries(result.context, sourceDescriptor);
          if (!values) return NaN;
          cached = { bars: result.context.bars, values };
          securityCache.set(cacheKey, cached);
        }

        const chartTime = bar.time;
        const prevBar = barIndex > 0 ? bars[barIndex - 1] : undefined;
        return mergeRequestedValue(
          cached.bars, cached.values, chartTime, prevBar?.time, gapsStr, laStr, ctx.barstate.isrealtime && !ctx.barstate.isconfirmed,
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
      ): unknown {
        const symStr = String(symbol ?? '');
        const tfStr = normalizeRuntimeTimeframePeriod(String(timeframe ?? ''), String(ctx.timeframe.period ?? ''));
        const currencyStr = normalizeRuntimeRequestCurrency(currency);
        const calcBars = normalizeRuntimePositiveInteger(calcBarsCount);
        const requestDuration = getRuntimeTimeframeDurationMs(tfStr, String(ctx.timeframe.period ?? ''));
        const chartDuration = getRuntimeTimeframeDurationMs(String(ctx.timeframe.period ?? ''), String(ctx.timeframe.period ?? ''));
        const sourceKey = runtimeSourceDescriptorKey(sourceDescriptor);
        const capturesKey = runtimeCapturesKey(captures);
        trackRequestContext(`request.security_lower_tf\u0000${secId}\u0000${symStr}\u0000${tfStr}\u0000${currencyStr ?? ''}\u0000${calcBars ?? ''}\u0000${sourceKey}\u0000${capturesKey}`);

        if (requestDuration === null || chartDuration === null || requestDuration >= chartDuration) {
          if (isRuntimeTruthy(ignoreInvalidTimeframe)) return createPineArray();
          throwCompiledRuntimeError(`request.security_lower_tf requires a lower timeframe than the chart timeframe: ${tfStr}`);
        }

        const cacheKey = `${secId}:${symStr}:${tfStr}:${currencyStr ?? ''}:${calcBars ?? ''}:${sourceKey}:${capturesKey}`;
        let cached = securityCache.get(cacheKey);
        if (!cached) {
          const secScript = compiled.securityScripts.get(secId);
          if (!requestDatafeed) {
            throwCompiledRuntimeError('request.security_lower_tf requires a request datafeed');
          }

          const result = requestDatafeed.getBars({
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
              return createPineArray();
            }
            if (isRuntimeTruthy(ignoreInvalidTimeframe) && result.code === 'invalid_timeframe') {
              return createPineArray();
            }
            throwCompiledRuntimeError(`request.security_lower_tf failed: ${result.message}`);
          }

          const values = secScript
            ? evaluateSecuritySeries(
              secScript,
              result.context,
              ctx.syminfo,
              options?.runtime,
              options?.maxBarsBack ?? 500,
              captures,
              (requestBarIndex, error) => recordSwallowedRuntimeError(
                swallowedErrors,
                `compiled-request-expression:request.security_lower_tf:${secId}`,
                requestBarIndex,
                error,
              ),
            )
            : evaluateRequestedSourceSeries(result.context, sourceDescriptor);
          if (!values) return createPineArray();
          cached = { bars: result.context.bars, values };
          securityCache.set(cacheKey, cached);
        }

        const chartStart = bar.time;
        const chartEnd = bars[barIndex + 1]?.time ?? chartStart + chartDuration;
        return collectLowerTimeframeValues(cached.bars, cached.values, chartStart, chartEnd);
      },

      requestCurrencyRate(args: unknown[], named?: Record<string, unknown>): unknown {
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
          time: bar.time,
        });
        if (providerRate !== undefined) return providerRate;

        const seriesDatafeed = requestDatafeed?.getSeries ? requestDatafeed : undefined;
        if (!seriesDatafeed) return NaN;

        const cacheKey = `currency_rate:${key}`;
        let points = requestSeriesCache.get(cacheKey);
        if (!points) {
          const result = seriesDatafeed.getSeries!({ family: 'currency_rate', key });
          if (!result.ok) {
            if (
              ignoreInvalidCurrency
              && (result.code === 'invalid_currency' || result.code === 'missing_context')
            ) {
              return NaN;
            }
            return NaN;
          }
          points = result.context.points;
          requestSeriesCache.set(cacheKey, points);
        }

        return mergeRequestSeriesValue(points, bar.time, undefined);
      },

      requestFootprint(args: unknown[], named?: Record<string, unknown>): unknown {
        const names = ['ticks_per_row', 'va_percent', 'imbalance_percent'] as const;
        const ticksPerRow = Math.trunc(toRuntimeNumber(orderedRuntimeArg(args, named, names, 0)));
        const valueAreaPercent = toRuntimeNumber(orderedRuntimeArg(args, named, names, 1));
        const imbalancePercent = toRuntimeNumber(orderedRuntimeArg(args, named, names, 2, 300));
        if (!Number.isFinite(ticksPerRow) || ticksPerRow <= 0 || !Number.isFinite(valueAreaPercent) || !Number.isFinite(imbalancePercent)) {
          return NaN;
        }

        const symbol = String(ctx.syminfo.tickerid || ctx.syminfo.ticker || '');
        const timeframe = String(ctx.timeframe.period || '');
        trackRequestContext(`request.footprint\u0000${footprintRequestKey(symbol, timeframe, ticksPerRow, valueAreaPercent, imbalancePercent)}`);
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
        const spec = requestPointSeriesSpec(name, args, named);
        trackRequestContext(`${name}\u0000${spec.key}`);
        if (spec.family === 'dividends' || spec.family === 'earnings' || spec.family === 'splits') {
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

        if (name === 'request.economic') {
          const [countryCode, field] = spec.key.split('\u0000');
          const providerValue = requestDatafeed?.getEconomicSeries?.({
            countryCode: countryCode ?? '',
            field: field ?? '',
            time: bar.time,
          });
          if (providerValue !== undefined) return providerValue;
        }
        if (name === 'request.financial') {
          const [symbol, financialId, period, currency = ''] = spec.key.split('\u0000');
          const providerPoint = requestDatafeed?.getFinancialMetric?.({
            symbol: symbol ?? '',
            financialId: financialId ?? '',
            period: period ?? '',
            currency: currency === '' ? undefined : currency,
            time: bar.time,
          });
          if (providerPoint !== undefined) {
            if (spec.gaps === 'barmerge.gaps_on' && providerPoint.time !== bar.time) return NaN;
            return providerPoint.value;
          }
        }
        if (name === 'request.quandl') {
          const [ticker, columnRaw] = spec.key.split('\u0000');
          const column = Math.trunc(Number(columnRaw ?? 0));
          const providerPoint = requestDatafeed?.getQuandlSeries?.({
            ticker: ticker ?? '',
            column,
            time: bar.time,
          });
          if (providerPoint !== undefined) {
            if (spec.gaps === 'barmerge.gaps_on' && providerPoint.time !== bar.time) return NaN;
            return providerPoint.value;
          }
        }

        const seriesDatafeed = requestDatafeed?.getSeries ? requestDatafeed : undefined;
        if (
          !seriesDatafeed
          && (
            name === 'request.economic'
            || name === 'request.financial'
            || name === 'request.quandl'
            || spec.family === 'dividends'
            || spec.family === 'earnings'
            || spec.family === 'splits'
          )
        ) {
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
            if (
              spec.ignoreInvalid
              && (result.code === 'invalid_symbol' || result.code === 'missing_context' || result.code === 'unsupported_context')
            ) {
              return NaN;
            }
            if (spec.family === 'dividends' || spec.family === 'earnings' || spec.family === 'splits') return NaN;
            if (name === 'request.financial') return NaN;
            if (name === 'request.economic') return NaN;
            if (name === 'request.quandl') return NaN;
            throwCompiledRuntimeError(`${name} failed: ${result.message}`);
          }
          points = result.context.points;
          requestSeriesCache.set(cacheKey, points);
        }

        return mergeRequestSeriesValue(points, bar.time, bars[barIndex - 1]?.time, spec.gaps);
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
        const sourceStr = toRuntimeString(source).trim();
        const symbolStr = toRuntimeString(symbol).trim();
        const requestSymbol = seedRequestSymbol(sourceStr, symbolStr);
        const timeframe = String(ctx.timeframe.period ?? '');
        const calcBars = normalizeRuntimePositiveInteger(calcBarsCount);
        const sourceKey = runtimeSourceDescriptorKey(sourceDescriptor);
        const capturesKey = runtimeCapturesKey(captures);
        const cacheKey = `${secId}:${requestSymbol}:${timeframe}:${calcBars ?? ''}:${sourceKey}:${capturesKey}`;
        trackRequestContext(`request.seed\u0000${secId}\u0000${requestSymbol}\u0000${timeframe}\u0000${calcBars ?? ''}\u0000${sourceKey}\u0000${capturesKey}`);

        let cached = securityCache.get(cacheKey);
        if (!cached) {
          const secScript = compiled.securityScripts.get(secId);
          if (!requestDatafeed) {
            throwCompiledRuntimeError('request.seed requires a request datafeed');
          }

          const result = requestDatafeed.getBars({
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
            throwCompiledRuntimeError(`request.seed failed: ${result.message}`);
          }

          const values = secScript
            ? evaluateSecuritySeries(
              secScript,
              result.context,
              ctx.syminfo,
              options?.runtime,
              options?.maxBarsBack ?? 500,
              captures,
              (requestBarIndex, error) => recordSwallowedRuntimeError(
                swallowedErrors,
                `compiled-request-expression:request.seed:${secId}`,
                requestBarIndex,
                error,
              ),
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
      timestamp(args: unknown[], named?: Record<string, unknown>) { return evaluateRuntimeTimestamp(args, named, ctx); },
      timeFilter(closeTime: boolean, args: unknown[], named?: Record<string, unknown>) {
        return evaluateRuntimeTimeFilter(args, named, ctx, bars, options?.runtime, closeTime);
      },
      calendarPart(part: string, args: unknown[], named?: Record<string, unknown>) {
        return evaluateRuntimeCalendarPart(part, args, named, ctx);
      },
      runtimeTimeValue(name: string, offset?: number) {
        return getRuntimeTimeValue(ctx, bars, name, offset);
      },
      sessionValue(name: string) {
        return getRuntimeSessionValue(options?.runtime, ctx, bars, name);
      },
      callBuiltin(name: string, args: unknown[], named?: Record<string, unknown>, callId?: string) {
        const builtin = builtinRegistry.get(name);
        if (!builtin) return NaN;
        return builtin(args, namedRecordToMap(named), ctx, builtinScope, callId ?? name);
      },
      callMethodBuiltin(name: string, receiver: unknown, args: unknown[], named?: Record<string, unknown>, callId?: string) {
        const builtinName = runtimeMethodBuiltinName(name, receiver, ctx);
        const builtin = builtinName ? builtinRegistry.get(builtinName) : undefined;
        if (!builtin) return NaN;
        return builtin([receiver, ...args], namedRecordToMap(named), ctx, builtinScope, callId ?? builtinName!);
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
        const parsedColor = parseRuntimeColorInput(color);
        return parsedColor
          ? formatRuntimeColor(parsedColor.red, parsedColor.green, parsedColor.blue, transparency)
          : color;
      },
      colorRgb(args: unknown[], named?: Record<string, unknown>) {
        const transparency = named && Object.prototype.hasOwnProperty.call(named, 'transp')
          ? named.transp
          : named && Object.prototype.hasOwnProperty.call(named, 'transparency')
            ? named.transparency
            : orderedRuntimeArg(args, named, ['red', 'green', 'blue', 'transp'], 3, 0);
        return formatRuntimeColor(
          orderedRuntimeArg(args, named, ['red', 'green', 'blue', 'transp'], 0),
          orderedRuntimeArg(args, named, ['red', 'green', 'blue', 'transp'], 1),
          orderedRuntimeArg(args, named, ['red', 'green', 'blue', 'transp'], 2),
          transparency,
        );
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

        if (!isFiniteRuntimeNumber(value) || !isFiniteRuntimeNumber(bottomValue) || !isFiniteRuntimeNumber(topValue) || !bottomColor || !topColor) {
          return Number.NaN;
        }

        const range = topValue - bottomValue;
        const ratio = range === 0 ? 0 : Math.min(1, Math.max(0, (value - bottomValue) / range));
        const interpolate = (from: number, to: number): number => from + (to - from) * ratio;
        return formatRuntimeColor(
          interpolate(bottomColor.red, topColor.red),
          interpolate(bottomColor.green, topColor.green),
          interpolate(bottomColor.blue, topColor.blue),
          alphaToRuntimeTransparency(interpolate(bottomColor.alpha, topColor.alpha)),
        );
      },
      mathCall(name: string, args: unknown[], named?: Record<string, unknown>, callId?: string) {
        return evaluateRuntimeMath(name, args, named, mathHistories, mathRandomStates, callId, mintick);
      },
      mathSum(..._args: unknown[]) { return NaN; },
      strFormat(args: unknown[], named?: Record<string, unknown>) { return formatRuntimeString(args, named); },
      strFormatTime(args: unknown[], named?: Record<string, unknown>) { return formatRuntimeTime(args, named, ctx); },
      tickerNew(args: unknown[], named?: Record<string, unknown>) { return evaluateRuntimeTickerNew(args, named); },
      tickerModify(args: unknown[], named?: Record<string, unknown>) { return evaluateRuntimeTickerModify(args, named); },
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

  for (barIndex = 0; barIndex < bars.length; barIndex++) {
    barCount++;
    if (!ctx.advanceBar()) break;
    runtimeBuiltinCallCounts.clear();
    const isLastBar = barIndex === lastBarIndex;
    bar = bars[barIndex];
    if (
      options?.confirmedRealtimeBarStartIndex !== undefined &&
      options.confirmedRealtimeBarStartIndex > 0 &&
      barIndex === options.confirmedRealtimeBarStartIndex - 1
    ) {
      ctx.barstate.islast = true;
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
      try {
        inst.onBar(barCtx);
      } catch (error) {
        if (error instanceof CompiledRuntimeErrorException) {
          errors.push(createCompiledExecutionError(error));
          break;
        }
        compiledBarErrorCount += 1;
        if (!firstCompiledBarError) {
          firstCompiledBarError = {
            barIndex,
            message: error instanceof Error ? error.message : String(error),
          };
        }
        recordSwallowedRuntimeError(swallowedErrors, 'compiled-bar', barIndex, error);
        // Continue execution — single bar errors shouldn't abort
      }
    }

    if (finalizeStrategyLedger) {
      if (ledger.settings.processOrdersOnClose) {
        markStrategyLedgerToMarket(ledger, bar.close, bar.close, bar.close, { barIndex, time: bar.time });
      } else {
        markStrategyLedgerToMarket(ledger, bar.close, bar.high, bar.low, { barIndex, time: bar.time });
      }
      fillPendingStrategyOrdersOnTicks(ledger, createDefaultStrategyOhlcTicks(bar, barIndex), barIndex, mintick);
      if (ledger.settings.processOrdersOnClose) {
        markStrategyLedgerToMarket(ledger, bar.close, bar.close, bar.close, { barIndex, time: bar.time });
      } else {
        markStrategyLedgerToMarket(ledger, bar.close, bar.high, bar.low, { barIndex, time: bar.time });
      }
    } else if (processRealtimeBrokerFills) {
      fillPendingStrategyOrdersOnTicks(ledger, createDefaultStrategyOhlcTicks(bar, barIndex), barIndex, mintick);
    }

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
    maxBarsBack: options?.maxBarsBack ?? 500,
    errors: errors.length,
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
    dynamicRequests: false,
    drawingLimits: { ...DEFAULT_DRAWING_LIMITS },
  };

  // Parse indicator declaration metadata from the AST
  if (decl?.node) {
    const node = decl.node;
    declaration.shortTitle = staticStringValue(node.shorttitle);
    declaration.overlay = staticBooleanValue(node.overlay) ?? declaration.overlay;
    declaration.precision = staticNumberValue(node.precision);
    declaration.format = staticDeclarationString(node.format, 'format');
    declaration.scale = staticDeclarationString(node.scale, 'scale');
    declaration.timeframeGaps = staticBooleanValue(node.timeframe_gaps);
    declaration.explicitPlotZOrder = staticBooleanValue(node.explicit_plot_zorder);
    declaration.behindChart = staticBooleanValue(node.behind_chart);
    declaration.calcBarsCount = staticNumberValue(node.calc_bars_count);
    declaration.maxBarsBack = staticNumberValue(node.max_bars_back);
    declaration.dynamicRequests = staticBooleanValue(node.dynamic_requests) ?? declaration.dynamicRequests;
    declaration.drawingLimits = {
      label: staticNumberValue(node.max_labels_count) ?? declaration.drawingLimits.label,
      line: staticNumberValue(node.max_lines_count) ?? declaration.drawingLimits.line,
      box: staticNumberValue(node.max_boxes_count) ?? declaration.drawingLimits.box,
      polyline: staticNumberValue(node.max_polylines_count) ?? declaration.drawingLimits.polyline,
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
