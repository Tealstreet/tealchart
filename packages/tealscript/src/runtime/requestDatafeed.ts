import type { Bar, SessionClassificationInfo, SymInfo } from './context';

export type RequestDatafeedErrorCode =
  | 'invalid_currency'
  | 'invalid_symbol'
  | 'invalid_timeframe'
  | 'missing_context'
  | 'unsupported_context';

export interface RequestDatafeedKey {
  symbol: string;
  timeframe: string;
}

export interface RequestDatafeedQuery extends RequestDatafeedKey {
  calcBarsCount?: number;
  currency?: string;
}

export interface RequestDataContext extends RequestDatafeedKey {
  bars: Bar[];
  syminfo?: Partial<SymInfo>;
  session?: Partial<SessionClassificationInfo>;
  currency?: string;
}

export type RequestSeriesFamily =
  | 'currency_rate'
  | 'dividends'
  | 'earnings'
  | 'splits'
  | 'financial'
  | 'economic'
  | 'quandl';

export interface RequestSeriesPoint {
  time: number;
  value: number;
}

export interface RequestSeriesQuery {
  family: RequestSeriesFamily;
  key: string;
}

export interface RequestSeriesContext extends RequestSeriesQuery {
  points: RequestSeriesPoint[];
}

export interface RequestCurrencyRateQuery {
  baseCurrency: string;
  quoteCurrency: string;
  time: number;
}

export interface RequestCurrencyRateContext {
  baseCurrency: string;
  quoteCurrency: string;
  rates: RequestSeriesPoint[];
}

export interface RequestEconomicSeriesQuery {
  countryCode: string;
  field: string;
  time: number;
}

export interface RequestEconomicSeriesContext {
  countryCode: string;
  field: string;
  points: RequestSeriesPoint[];
}

export interface RequestFinancialMetricQuery {
  symbol: string;
  financialId: string;
  period: string;
  time: number;
  currency?: string;
}

export interface RequestFinancialMetricContext {
  symbol: string;
  financialId: string;
  period: string;
  currency?: string;
  points: RequestSeriesPoint[];
}

export interface RequestQuandlSeriesQuery {
  ticker: string;
  column: number;
  time: number;
}

export interface RequestQuandlSeriesContext {
  ticker: string;
  column: number;
  points: RequestSeriesPoint[];
}

export interface RequestFootprintQuery {
  symbol: string;
  timeframe: string;
  ticksPerRow: number;
  valueAreaPercent: number;
  imbalancePercent: number;
  time: number;
}

export interface RequestFootprintData {
  time: number;
  rows?: RequestVolumeRowData[];
  pointOfControl?: number;
  valueAreaHigh?: number;
  valueAreaLow?: number;
  totalVolume?: number;
  buyVolume?: number;
  sellVolume?: number;
}

export interface RequestVolumeRowData {
  upPrice?: number;
  downPrice?: number;
  totalVolume?: number;
  buyVolume?: number;
  sellVolume?: number;
  hasBuyImbalance?: boolean;
  hasSellImbalance?: boolean;
}

export interface RequestFootprintContext {
  symbol: string;
  timeframe: string;
  ticksPerRow: number;
  valueAreaPercent: number;
  imbalancePercent: number;
  footprints: RequestFootprintData[];
}

export type RequestCorporateActionKind = 'dividends' | 'splits' | 'earnings';

export type RequestCorporateActionValue =
  | { kind: 'dividends'; gross?: number; net?: number }
  | { kind: 'splits'; numerator?: number; denominator?: number }
  | { kind: 'earnings'; actual?: number; estimate?: number; standardized?: number };

export interface RequestCorporateActionEvent {
  time: number;
  value: RequestCorporateActionValue;
}

export interface RequestCorporateActionQuery {
  kind: RequestCorporateActionKind;
  ticker: string;
  time: number;
  currency?: string;
}

export interface RequestCorporateActionContext {
  kind: RequestCorporateActionKind;
  ticker: string;
  currency?: string;
  events: RequestCorporateActionEvent[];
}

export interface RequestDatafeedSuccess {
  ok: true;
  context: RequestDataContext;
}

export interface RequestDatafeedFailure {
  ok: false;
  code: RequestDatafeedErrorCode;
  message: string;
}

export type RequestDatafeedResult = RequestDatafeedSuccess | RequestDatafeedFailure;

export interface RequestSeriesSuccess {
  ok: true;
  context: RequestSeriesContext;
}

export type RequestSeriesResult = RequestSeriesSuccess | RequestDatafeedFailure;

export interface RequestDatafeed {
  getBars(query: RequestDatafeedQuery): RequestDatafeedResult;
  getSeries?(query: RequestSeriesQuery): RequestSeriesResult;
  getCurrencyRate?(query: RequestCurrencyRateQuery): number | undefined;
  getEconomicSeries?(query: RequestEconomicSeriesQuery): number | undefined;
  getCorporateAction?(query: RequestCorporateActionQuery): RequestCorporateActionEvent | undefined;
  getFinancialMetric?(query: RequestFinancialMetricQuery): RequestSeriesPoint | undefined;
  getQuandlSeries?(query: RequestQuandlSeriesQuery): RequestSeriesPoint | undefined;
  getFootprint?(query: RequestFootprintQuery): RequestFootprintData | undefined;
}

export type WorkerRequestDataCacheKind =
  | 'bars'
  | 'series'
  | 'currency_rate'
  | 'corporate_action'
  | 'economic'
  | 'financial'
  | 'quandl'
  | 'footprint';

export type WorkerRequestDataCacheQuery =
  | RequestDatafeedQuery
  | RequestSeriesQuery
  | RequestCurrencyRateQuery
  | RequestCorporateActionQuery
  | RequestEconomicSeriesQuery
  | RequestFinancialMetricQuery
  | RequestQuandlSeriesQuery
  | RequestFootprintQuery;

export type WorkerRequestDataCacheValue =
  | RequestDataContext
  | RequestSeriesPoint[]
  | RequestCorporateActionEvent[]
  | RequestCorporateActionEvent
  | RequestFootprintData[]
  | RequestFootprintData
  | number
  | null;

export interface WorkerRequestDataCacheEntry {
  kind: WorkerRequestDataCacheKind;
  query: WorkerRequestDataCacheQuery;
  value: WorkerRequestDataCacheValue;
  error?: {
    code: string;
    message: string;
  };
}

export interface WorkerRequestDataDiscoveryQuery {
  kind: WorkerRequestDataCacheKind;
  query: WorkerRequestDataCacheQuery;
  cacheKey: string;
}

export function workerRequestDataCacheKey(kind: WorkerRequestDataCacheKind, query: WorkerRequestDataCacheQuery): string {
  return `${kind}\u0000${JSON.stringify(normalizeWorkerRequestDataQuery(kind, query))}`;
}

export class CacheBackedRequestDatafeed implements RequestDatafeed {
  constructor(private readonly entries: Map<string, WorkerRequestDataCacheEntry>) {}

  getBars(query: RequestDatafeedQuery): RequestDatafeedResult {
    const entry = this.entries.get(workerRequestDataCacheKey('bars', query));
    if (!entry) {
      return {
        ok: false,
        code: 'missing_context',
        message: `No cached request data context for ${query.symbol} ${query.timeframe}`,
      };
    }
    if (entry.error) {
      return {
        ok: false,
        code: 'missing_context',
        message: entry.error.message,
      };
    }
    if (entry.value === null) {
      return {
        ok: true,
        context: {
          symbol: query.symbol,
          timeframe: query.timeframe,
          currency: query.currency,
          bars: [],
        },
      };
    }
    if (!isRequestDataContext(entry.value)) {
      return {
        ok: false,
        code: 'missing_context',
        message: `Cached request data context for ${query.symbol} ${query.timeframe} is invalid`,
      };
    }

    const bars = trimBars(entry.value.bars, query.calcBarsCount);
    return {
      ok: true,
      context: {
        ...entry.value,
        currency: query.currency ?? entry.value.currency,
        bars: bars.map((bar) => ({ ...bar })),
        syminfo: entry.value.syminfo === undefined ? undefined : { ...entry.value.syminfo },
        session: entry.value.session === undefined ? undefined : { ...entry.value.session },
      },
    };
  }

  getSeries(query: RequestSeriesQuery): RequestSeriesResult {
    const entry = this.entries.get(workerRequestDataCacheKey('series', query));
    if (!entry) {
      return {
        ok: false,
        code: 'missing_context',
        message: `No cached request series for ${query.family} ${query.key}`,
      };
    }
    if (entry.error) {
      return {
        ok: false,
        code: 'missing_context',
        message: entry.error.message,
      };
    }
    const points = Array.isArray(entry.value) ? entry.value : [];
    return {
      ok: true,
      context: {
        family: query.family,
        key: query.key,
        points: points.filter(isRequestSeriesPoint).map((point) => ({ ...point })),
      },
    };
  }

  getCurrencyRate(query: RequestCurrencyRateQuery): number | undefined {
    const entry = this.entries.get(workerRequestDataCacheKey('currency_rate', query));
    if (!entry || entry.error || entry.value === null) return undefined;
    if (typeof entry.value === 'number') return entry.value;
    return selectPointValue(entry.value, query.time);
  }

  getEconomicSeries(query: RequestEconomicSeriesQuery): number | undefined {
    const entry = this.entries.get(workerRequestDataCacheKey('economic', query));
    if (!entry || entry.error || entry.value === null) return undefined;
    if (typeof entry.value === 'number') return entry.value;
    return selectPointValue(entry.value, query.time);
  }

  getCorporateAction(query: RequestCorporateActionQuery): RequestCorporateActionEvent | undefined {
    const entry = this.entries.get(workerRequestDataCacheKey('corporate_action', query));
    if (!entry || entry.error || entry.value === null) return undefined;
    const events = Array.isArray(entry.value) ? entry.value : [entry.value];
    let value: RequestCorporateActionEvent | undefined;
    for (const event of events.filter(isCorporateActionEvent).sort((left, right) => left.time - right.time)) {
      if (event.time > query.time) break;
      value = event;
    }
    return value === undefined ? undefined : { ...value, value: { ...value.value } as RequestCorporateActionValue };
  }

  getFinancialMetric(query: RequestFinancialMetricQuery): RequestSeriesPoint | undefined {
    const entry = this.entries.get(workerRequestDataCacheKey('financial', query));
    if (!entry || entry.error || entry.value === null) return undefined;
    const point = selectPoint(entry.value, query.time);
    return point === undefined ? undefined : { ...point };
  }

  getQuandlSeries(query: RequestQuandlSeriesQuery): RequestSeriesPoint | undefined {
    const entry = this.entries.get(workerRequestDataCacheKey('quandl', query));
    if (!entry || entry.error || entry.value === null) return undefined;
    const point = selectPoint(entry.value, query.time);
    return point === undefined ? undefined : { ...point };
  }

  getFootprint(query: RequestFootprintQuery): RequestFootprintData | undefined {
    const entry = this.entries.get(workerRequestDataCacheKey('footprint', query));
    if (!entry || entry.error || entry.value === null) return undefined;
    const footprints = Array.isArray(entry.value) ? entry.value : [entry.value];
    let value: RequestFootprintData | undefined;
    for (const footprint of footprints.filter(isFootprintData).sort((left, right) => left.time - right.time)) {
      if (footprint.time > query.time) break;
      value = footprint;
    }
    return value === undefined ? undefined : cloneFootprintData(value);
  }
}

export class CacheDiscoveringRequestDatafeed implements RequestDatafeed {
  private readonly cacheBacked: CacheBackedRequestDatafeed;
  private readonly misses = new Map<string, WorkerRequestDataDiscoveryQuery>();

  constructor(private readonly entries: Map<string, WorkerRequestDataCacheEntry>) {
    this.cacheBacked = new CacheBackedRequestDatafeed(entries);
  }

  get discoveredQueries(): WorkerRequestDataDiscoveryQuery[] {
    return [...this.misses.values()];
  }

  getBars(query: RequestDatafeedQuery): RequestDatafeedResult {
    const cacheKey = workerRequestDataCacheKey('bars', query);
    if (this.entries.has(cacheKey)) return this.cacheBacked.getBars(query);

    this.recordMiss('bars', query);
    return {
      ok: true,
      context: {
        symbol: query.symbol,
        timeframe: query.timeframe,
        currency: query.currency,
        bars: [],
      },
    };
  }

  getSeries(query: RequestSeriesQuery): RequestSeriesResult {
    const cacheKey = workerRequestDataCacheKey('series', query);
    if (this.entries.has(cacheKey)) return this.cacheBacked.getSeries(query);

    this.recordMiss('series', query);
    return {
      ok: true,
      context: {
        family: query.family,
        key: query.key,
        points: [],
      },
    };
  }

  getCurrencyRate(query: RequestCurrencyRateQuery): number | undefined {
    const cacheKey = workerRequestDataCacheKey('currency_rate', query);
    if (this.entries.has(cacheKey)) return this.cacheBacked.getCurrencyRate(query) ?? NaN;

    this.recordMiss('currency_rate', this.withCanonicalTime(query));
    return NaN;
  }

  getEconomicSeries(query: RequestEconomicSeriesQuery): number | undefined {
    const cacheKey = workerRequestDataCacheKey('economic', query);
    if (this.entries.has(cacheKey)) return this.cacheBacked.getEconomicSeries(query) ?? NaN;

    this.recordMiss('economic', this.withCanonicalTime(query));
    return NaN;
  }

  getCorporateAction(query: RequestCorporateActionQuery): RequestCorporateActionEvent | undefined {
    const cacheKey = workerRequestDataCacheKey('corporate_action', query);
    if (this.entries.has(cacheKey)) {
      return this.cacheBacked.getCorporateAction(query)
        ?? { time: query.time, value: { kind: query.kind } as RequestCorporateActionValue };
    }

    this.recordMiss('corporate_action', this.withCanonicalTime(query));
    return { time: query.time, value: { kind: query.kind } as RequestCorporateActionValue };
  }

  getFinancialMetric(query: RequestFinancialMetricQuery): RequestSeriesPoint | undefined {
    const cacheKey = workerRequestDataCacheKey('financial', query);
    if (this.entries.has(cacheKey)) return this.cacheBacked.getFinancialMetric(query) ?? { time: query.time, value: NaN };

    this.recordMiss('financial', this.withCanonicalTime(query));
    return { time: query.time, value: NaN };
  }

  getQuandlSeries(query: RequestQuandlSeriesQuery): RequestSeriesPoint | undefined {
    const cacheKey = workerRequestDataCacheKey('quandl', query);
    if (this.entries.has(cacheKey)) return this.cacheBacked.getQuandlSeries(query) ?? { time: query.time, value: NaN };

    this.recordMiss('quandl', this.withCanonicalTime(query));
    return { time: query.time, value: NaN };
  }

  getFootprint(query: RequestFootprintQuery): RequestFootprintData | undefined {
    const cacheKey = workerRequestDataCacheKey('footprint', query);
    if (this.entries.has(cacheKey)) return this.cacheBacked.getFootprint(query);

    this.recordMiss('footprint', this.withCanonicalTime(query));
    return undefined;
  }

  private recordMiss(kind: WorkerRequestDataCacheKind, query: WorkerRequestDataCacheQuery): void {
    const cacheKey = workerRequestDataCacheKey(kind, query);
    if (this.misses.has(cacheKey)) return;
    this.misses.set(cacheKey, { kind, query, cacheKey });
  }

  private withCanonicalTime<Query extends { time: number }>(query: Query): Query {
    return { ...query, time: 0 };
  }
}

function normalizeWorkerRequestDataQuery(kind: WorkerRequestDataCacheKind, query: WorkerRequestDataCacheQuery): Record<string, unknown> {
  if (kind === 'bars') {
    const barsQuery = query as RequestDatafeedQuery;
    return {
      symbol: barsQuery.symbol,
      timeframe: barsQuery.timeframe,
      calcBarsCount: barsQuery.calcBarsCount,
      currency: barsQuery.currency,
    };
  }
  if (kind === 'series') {
    const seriesQuery = query as RequestSeriesQuery;
    return { family: seriesQuery.family, key: seriesQuery.key };
  }
  if (kind === 'currency_rate') {
    const rateQuery = query as RequestCurrencyRateQuery;
    return { baseCurrency: rateQuery.baseCurrency, quoteCurrency: rateQuery.quoteCurrency };
  }
  if (kind === 'corporate_action') {
    const actionQuery = query as RequestCorporateActionQuery;
    return { kind: actionQuery.kind, ticker: actionQuery.ticker, currency: actionQuery.currency };
  }
  if (kind === 'economic') {
    const economicQuery = query as RequestEconomicSeriesQuery;
    return { countryCode: economicQuery.countryCode, field: economicQuery.field };
  }
  if (kind === 'financial') {
    const financialQuery = query as RequestFinancialMetricQuery;
    return {
      symbol: financialQuery.symbol,
      financialId: financialQuery.financialId,
      period: financialQuery.period.toUpperCase(),
      currency: financialQuery.currency,
    };
  }
  if (kind === 'quandl') {
    const quandlQuery = query as RequestQuandlSeriesQuery;
    return { ticker: quandlQuery.ticker, column: Math.trunc(quandlQuery.column) };
  }
  const footprintQuery = query as RequestFootprintQuery;
  return {
    symbol: footprintQuery.symbol,
    timeframe: footprintQuery.timeframe,
    ticksPerRow: Math.trunc(footprintQuery.ticksPerRow),
    valueAreaPercent: footprintQuery.valueAreaPercent,
    imbalancePercent: footprintQuery.imbalancePercent,
  };
}

function isRequestDataContext(value: WorkerRequestDataCacheValue): value is RequestDataContext {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && Array.isArray((value as RequestDataContext).bars);
}

function isRequestSeriesPoint(value: unknown): value is RequestSeriesPoint {
  return typeof value === 'object' && value !== null
    && typeof (value as RequestSeriesPoint).time === 'number'
    && typeof (value as RequestSeriesPoint).value === 'number';
}

function isCorporateActionEvent(value: unknown): value is RequestCorporateActionEvent {
  return typeof value === 'object' && value !== null
    && typeof (value as RequestCorporateActionEvent).time === 'number'
    && typeof (value as RequestCorporateActionEvent).value === 'object';
}

function isFootprintData(value: unknown): value is RequestFootprintData {
  return typeof value === 'object' && value !== null
    && typeof (value as RequestFootprintData).time === 'number';
}

function selectPoint(value: WorkerRequestDataCacheValue, time: number): RequestSeriesPoint | undefined {
  const points = Array.isArray(value)
    ? value.filter(isRequestSeriesPoint)
    : isRequestSeriesPoint(value) ? [value] : [];
  let selected: RequestSeriesPoint | undefined;
  for (const point of points.sort((left, right) => left.time - right.time)) {
    if (point.time > time) break;
    selected = point;
  }
  return selected;
}

function selectPointValue(value: WorkerRequestDataCacheValue, time: number): number | undefined {
  return selectPoint(value, time)?.value;
}

export function requestDatafeedKey(symbol: string, timeframe: string): string {
  return `${symbol}\u0000${timeframe}`;
}

export function requestSeriesKey(family: RequestSeriesFamily, key: string): string {
  return `${family}\u0000${key}`;
}

export function currencyRateRequestKey(fromCurrency: string, toCurrency: string): string {
  return `${fromCurrency}\u0000${toCurrency}`;
}

export function seedCurrencyRate(baseCurrency: string, quoteCurrency: string, rates: RequestSeriesPoint[]): RequestCurrencyRateContext {
  return {
    baseCurrency,
    quoteCurrency,
    rates: rates.map((rate) => ({ ...rate })),
  };
}

export function seedEconomicSeries(countryCode: string, field: string, points: RequestSeriesPoint[]): RequestEconomicSeriesContext {
  return {
    countryCode,
    field,
    points: points.map((point) => ({ ...point })),
  };
}

export function seedFinancialMetric(
  symbol: string,
  financialId: string,
  period: string,
  points: RequestSeriesPoint[],
  currency?: string,
): RequestFinancialMetricContext {
  return {
    symbol,
    financialId,
    period: period.toUpperCase(),
    currency,
    points: points.map((point) => ({ ...point })),
  };
}

export function seedQuandlSeries(ticker: string, column: number, points: RequestSeriesPoint[]): RequestQuandlSeriesContext {
  return {
    ticker,
    column: Math.trunc(column),
    points: points.map((point) => ({ ...point })),
  };
}

export function seedFootprints(
  symbol: string,
  timeframe: string,
  ticksPerRow: number,
  valueAreaPercent: number,
  footprints: RequestFootprintData[],
  imbalancePercent = 300,
): RequestFootprintContext {
  return {
    symbol,
    timeframe,
    ticksPerRow: Math.trunc(ticksPerRow),
    valueAreaPercent,
    imbalancePercent,
    footprints: footprints.map(cloneFootprintData),
  };
}

export function seedCorporateAction(
  kind: RequestCorporateActionKind,
  ticker: string,
  events: RequestCorporateActionEvent[],
  currency?: string,
): RequestCorporateActionContext {
  return {
    kind,
    ticker,
    currency,
    events: events.map((event) => ({ ...event, value: { ...event.value } as RequestCorporateActionValue })),
  };
}

export function corporateActionRequestKey(ticker: string, field: string, currency?: string): string {
  return [ticker, field, currency ?? ''].join('\u0000');
}

export function corporateActionContextKey(kind: RequestCorporateActionKind, ticker: string, currency?: string): string {
  return [kind, ticker, currency ?? ''].join('\u0000');
}

export function selectCorporateActionField(value: RequestCorporateActionValue, field: string): number | undefined {
  if (value.kind === 'dividends') {
    if (field === 'dividends.gross') return value.gross;
    if (field === 'dividends.net') return value.net;
  }
  if (value.kind === 'splits') {
    if (field === 'splits.numerator') return value.numerator;
    if (field === 'splits.denominator') return value.denominator;
  }
  if (value.kind === 'earnings') {
    if (field === 'earnings.actual') return value.actual;
    if (field === 'earnings.estimate') return value.estimate;
    if (field === 'earnings.standardized') return value.standardized;
  }
  return undefined;
}

export function financialRequestKey(symbol: string, financialId: string, period: string, currency?: string): string {
  return [symbol, financialId, period, currency ?? ''].join('\u0000');
}

export function financialMetricContextKey(symbol: string, financialId: string, period: string, currency?: string): string {
  return [symbol, financialId, period.toUpperCase(), currency ?? ''].join('\u0000');
}

export function economicRequestKey(countryCode: string, field: string): string {
  return `${countryCode}\u0000${field}`;
}

export function quandlRequestKey(ticker: string, column: number): string {
  return `${ticker}\u0000${Math.trunc(column)}`;
}

export function footprintRequestKey(
  symbol: string,
  timeframe: string,
  ticksPerRow: number,
  valueAreaPercent: number,
  imbalancePercent: number,
): string {
  return [symbol, timeframe, Math.trunc(ticksPerRow), valueAreaPercent, imbalancePercent].join('\u0000');
}

export function seedRequestSymbol(source: string, symbol: string): string {
  return `seed\u0000${source}\u0000${symbol}`;
}

function splitTickerModifiers(symbol: string): { base: string; modifiers: string[] } {
  const [base = '', ...modifiers] = symbol.split('|');
  return { base, modifiers };
}

function removeTickerModifier(symbol: string, prefix: string): string {
  const { base, modifiers } = splitTickerModifiers(symbol);
  const kept = modifiers.filter((modifier) => !modifier.startsWith(prefix));
  return kept.length === 0 ? base : `${base}|${kept.join('|')}`;
}

function removeTickerModifiers(symbol: string, prefixes: readonly string[]): string {
  const { base, modifiers } = splitTickerModifiers(symbol);
  const kept = modifiers.filter((modifier) => !prefixes.some((prefix) => modifier.startsWith(prefix)));
  return kept.length === 0 ? base : `${base}|${kept.join('|')}`;
}

function trimBars(bars: Bar[], calcBarsCount: number | undefined): Bar[] {
  if (calcBarsCount === undefined) {
    return bars;
  }

  const count = Math.trunc(calcBarsCount);
  if (!Number.isFinite(count) || count <= 0) {
    return [];
  }

  return bars.slice(Math.max(0, bars.length - count));
}

export class InMemoryRequestDatafeed implements RequestDatafeed {
  private readonly contexts = new Map<string, RequestDataContext>();
  private readonly seriesContexts = new Map<string, RequestSeriesContext>();
  private readonly currencyRates = new Map<string, RequestCurrencyRateContext>();
  private readonly economicSeries = new Map<string, RequestEconomicSeriesContext>();
  private readonly corporateActions = new Map<string, RequestCorporateActionContext>();
  private readonly financialMetrics = new Map<string, RequestFinancialMetricContext>();
  private readonly quandlSeries = new Map<string, RequestQuandlSeriesContext>();
  private readonly footprints = new Map<string, RequestFootprintContext>();

  constructor(
    contexts: RequestDataContext[] = [],
    seriesContexts: RequestSeriesContext[] = [],
    currencyRates: RequestCurrencyRateContext[] = [],
    economicSeries: RequestEconomicSeriesContext[] = [],
    corporateActions: RequestCorporateActionContext[] = [],
    financialMetrics: RequestFinancialMetricContext[] = [],
    quandlSeries: RequestQuandlSeriesContext[] = [],
    footprints: RequestFootprintContext[] = [],
  ) {
    for (const context of contexts) {
      this.setContext(context);
    }
    for (const context of seriesContexts) {
      this.setSeriesContext(context);
    }
    for (const context of currencyRates) {
      this.setCurrencyRateContext(context);
    }
    for (const context of economicSeries) {
      this.setEconomicSeriesContext(context);
    }
    for (const context of corporateActions) {
      this.setCorporateActionContext(context);
    }
    for (const context of financialMetrics) {
      this.setFinancialMetricContext(context);
    }
    for (const context of quandlSeries) {
      this.setQuandlSeriesContext(context);
    }
    for (const context of footprints) {
      this.setFootprintContext(context);
    }
  }

  setContext(context: RequestDataContext): void {
    this.contexts.set(requestDatafeedKey(context.symbol, context.timeframe), {
      ...context,
      bars: context.bars.map((bar) => ({ ...bar })),
      syminfo: context.syminfo === undefined ? undefined : { ...context.syminfo },
      session: context.session === undefined ? undefined : { ...context.session },
    });
  }

  setSeriesContext(context: RequestSeriesContext): void {
    this.seriesContexts.set(requestSeriesKey(context.family, context.key), {
      ...context,
      points: context.points.map((point) => ({ ...point })),
    });
  }

  setCurrencyRateContext(context: RequestCurrencyRateContext): void {
    this.currencyRates.set(currencyRateRequestKey(context.baseCurrency, context.quoteCurrency), {
      ...context,
      rates: context.rates.map((rate) => ({ ...rate })),
    });
  }

  setEconomicSeriesContext(context: RequestEconomicSeriesContext): void {
    this.economicSeries.set(economicRequestKey(context.countryCode, context.field), {
      ...context,
      points: context.points.map((point) => ({ ...point })),
    });
  }

  setCorporateActionContext(context: RequestCorporateActionContext): void {
    this.corporateActions.set(corporateActionContextKey(context.kind, context.ticker, context.currency), {
      ...context,
      events: context.events.map((event) => ({ ...event, value: { ...event.value } as RequestCorporateActionValue })),
    });
  }

  setFinancialMetricContext(context: RequestFinancialMetricContext): void {
    this.financialMetrics.set(financialMetricContextKey(context.symbol, context.financialId, context.period, context.currency), {
      ...context,
      period: context.period.toUpperCase(),
      points: context.points.map((point) => ({ ...point })),
    });
  }

  setQuandlSeriesContext(context: RequestQuandlSeriesContext): void {
    const column = Math.trunc(context.column);
    this.quandlSeries.set(quandlRequestKey(context.ticker, column), {
      ...context,
      column,
      points: context.points.map((point) => ({ ...point })),
    });
  }

  setFootprintContext(context: RequestFootprintContext): void {
    const ticksPerRow = Math.trunc(context.ticksPerRow);
    this.footprints.set(
      footprintRequestKey(context.symbol, context.timeframe, ticksPerRow, context.valueAreaPercent, context.imbalancePercent),
      {
        ...context,
        ticksPerRow,
        footprints: context.footprints.map(cloneFootprintData),
      },
    );
  }

  getBars(query: RequestDatafeedQuery): RequestDatafeedResult {
    const exactContext = this.contexts.get(requestDatafeedKey(query.symbol, query.timeframe));
    const syntheticResult = exactContext ? undefined : this.getSyntheticContext(query.symbol, query.timeframe);
    if (syntheticResult && 'ok' in syntheticResult) {
      return syntheticResult;
    }
    const context = exactContext ?? syntheticResult;
    if (!context) {
      return {
        ok: false,
        code: 'missing_context',
        message: `No request data context for ${query.symbol} ${query.timeframe}`,
      };
    }

    const bars = trimBars(context.bars, query.calcBarsCount);

    return {
      ok: true,
      context: {
        ...context,
        currency: query.currency ?? context.currency,
        bars: bars.map((bar) => ({ ...bar })),
        syminfo: context.syminfo === undefined ? undefined : { ...context.syminfo },
        session: context.session === undefined ? undefined : { ...context.session },
      },
    };
  }

  private getSyntheticContext(symbol: string, timeframe: string): RequestDataContext | RequestDatafeedFailure | undefined {
    const chartModifier = splitTickerModifiers(symbol).modifiers.find((modifier) => modifier.startsWith('chart='));
    if (chartModifier === 'chart=heikinashi') {
      const baseSymbol = removeTickerModifier(symbol, 'chart=');
      const baseContext = this.getNearestHostContext(baseSymbol, timeframe);
      if (!baseContext) {
        return undefined;
      }

      return {
        ...baseContext,
        symbol,
        bars: toHeikinAshiBars(baseContext.bars),
        syminfo: {
          ...baseContext.syminfo,
          ticker: symbol,
        },
      };
    }
    if (chartModifier) {
      const baseSymbol = removeTickerModifier(symbol, 'chart=');
      if (this.getNearestHostContext(baseSymbol, timeframe)) {
        return {
          ok: false,
          code: 'unsupported_context',
          message: `Synthetic chart request ${chartModifier} for ${symbol} ${timeframe} requires host-provided bars`,
        };
      }
    }

    return undefined;
  }

  private getNearestHostContext(symbol: string, timeframe: string): RequestDataContext | undefined {
    const candidates = [
      symbol,
      removeTickerModifiers(symbol, ['adjustment=', 'backadjustment=', 'settlement_as_close=']),
      removeTickerModifiers(symbol, ['session=', 'adjustment=', 'backadjustment=', 'settlement_as_close=']),
    ];

    for (const candidate of candidates) {
      const context = this.contexts.get(requestDatafeedKey(candidate, timeframe));
      if (context) return context;
    }
    return undefined;
  }

  getSeries(query: RequestSeriesQuery): RequestSeriesResult {
    const context = this.seriesContexts.get(requestSeriesKey(query.family, query.key));
    if (!context) {
      return {
        ok: false,
        code: 'missing_context',
        message: `No request series context for ${query.family} ${query.key}`,
      };
    }

    return {
      ok: true,
      context: {
        ...context,
        points: context.points.map((point) => ({ ...point })),
      },
    };
  }

  getCurrencyRate(query: RequestCurrencyRateQuery): number | undefined {
    const context = this.currencyRates.get(currencyRateRequestKey(query.baseCurrency, query.quoteCurrency));
    if (!context) return undefined;
    let value: number | undefined;
    const sortedRates = [...context.rates].sort((left, right) => left.time - right.time);
    for (const rate of sortedRates) {
      if (rate.time > query.time) break;
      value = rate.value;
    }
    return value;
  }

  getEconomicSeries(query: RequestEconomicSeriesQuery): number | undefined {
    const context = this.economicSeries.get(economicRequestKey(query.countryCode, query.field));
    if (!context) return undefined;
    let value: number | undefined;
    const sortedPoints = [...context.points].sort((left, right) => left.time - right.time);
    for (const point of sortedPoints) {
      if (point.time > query.time) break;
      value = point.value;
    }
    return value;
  }

  getCorporateAction(query: RequestCorporateActionQuery): RequestCorporateActionEvent | undefined {
    const context = this.corporateActions.get(corporateActionContextKey(query.kind, query.ticker, query.currency))
      ?? this.corporateActions.get(corporateActionContextKey(query.kind, query.ticker));
    if (!context) return undefined;
    let event: RequestCorporateActionEvent | undefined;
    const sortedEvents = [...context.events].sort((left, right) => left.time - right.time);
    for (const candidate of sortedEvents) {
      if (candidate.time > query.time) break;
      event = candidate;
    }
    return event === undefined ? undefined : { ...event, value: { ...event.value } as RequestCorporateActionValue };
  }

  getFinancialMetric(query: RequestFinancialMetricQuery): RequestSeriesPoint | undefined {
    const context = this.financialMetrics.get(financialMetricContextKey(query.symbol, query.financialId, query.period, query.currency))
      ?? this.financialMetrics.get(financialMetricContextKey(query.symbol, query.financialId, query.period));
    if (!context) return undefined;
    let point: RequestSeriesPoint | undefined;
    const sortedPoints = [...context.points].sort((left, right) => left.time - right.time);
    for (const candidate of sortedPoints) {
      if (candidate.time > query.time) break;
      point = candidate;
    }
    return point === undefined ? undefined : { ...point };
  }

  getQuandlSeries(query: RequestQuandlSeriesQuery): RequestSeriesPoint | undefined {
    const context = this.quandlSeries.get(quandlRequestKey(query.ticker, query.column));
    if (!context) return undefined;
    let point: RequestSeriesPoint | undefined;
    const sortedPoints = [...context.points].sort((left, right) => left.time - right.time);
    for (const candidate of sortedPoints) {
      if (candidate.time > query.time) break;
      point = candidate;
    }
    return point === undefined ? undefined : { ...point };
  }

  getFootprint(query: RequestFootprintQuery): RequestFootprintData | undefined {
    const context = this.footprints.get(
      footprintRequestKey(query.symbol, query.timeframe, query.ticksPerRow, query.valueAreaPercent, query.imbalancePercent),
    );
    if (!context) return undefined;
    let footprint: RequestFootprintData | undefined;
    const sortedFootprints = [...context.footprints].sort((left, right) => left.time - right.time);
    for (const candidate of sortedFootprints) {
      if (candidate.time > query.time) break;
      footprint = candidate;
    }
    return footprint === undefined
      ? undefined
      : cloneFootprintData(footprint);
  }
}

export function cloneFootprintData(footprint: RequestFootprintData): RequestFootprintData {
  return {
    ...footprint,
    rows: footprint.rows?.map(cloneVolumeRowData),
  };
}

export function cloneVolumeRowData(row: RequestVolumeRowData): RequestVolumeRowData {
  return { ...row };
}

export function isRequestFootprintData(value: unknown): value is RequestFootprintData {
  return isFootprintData(unwrapSourceAwareRequestValue(value));
}

export function isRequestVolumeRowData(value: unknown): value is RequestVolumeRowData {
  value = unwrapSourceAwareRequestValue(value);
  return typeof value === 'object' && value !== null && (
    'upPrice' in value
    || 'downPrice' in value
    || 'totalVolume' in value
    || 'buyVolume' in value
    || 'sellVolume' in value
    || 'hasBuyImbalance' in value
    || 'hasSellImbalance' in value
  );
}

export function footprintRows(footprint: unknown): RequestVolumeRowData[] {
  footprint = unwrapSourceAwareRequestValue(footprint);
  if (!isFootprintData(footprint)) return [];
  return [...(footprint.rows ?? [])]
    .filter(isRequestVolumeRowData)
    .sort((left, right) => rowSortPrice(left) - rowSortPrice(right))
    .map(cloneVolumeRowData);
}

export function footprintRowByPrice(footprint: unknown, price: unknown): RequestVolumeRowData | undefined {
  footprint = unwrapSourceAwareRequestValue(footprint);
  if (!isFootprintData(footprint) || typeof price !== 'number' || !Number.isFinite(price)) return undefined;
  return findRowContaining(footprintRows(footprint), price);
}

export function footprintValue(footprint: unknown, field: keyof Pick<RequestFootprintData, 'totalVolume' | 'buyVolume' | 'sellVolume'>): number {
  footprint = unwrapSourceAwareRequestValue(footprint);
  return isFootprintData(footprint) && typeof footprint[field] === 'number' ? footprint[field] : Number.NaN;
}

export function footprintDelta(footprint: unknown): number {
  footprint = unwrapSourceAwareRequestValue(footprint);
  if (!isFootprintData(footprint)) return Number.NaN;
  const buy = typeof footprint.buyVolume === 'number' ? footprint.buyVolume : Number.NaN;
  const sell = typeof footprint.sellVolume === 'number' ? footprint.sellVolume : Number.NaN;
  return Number.isNaN(buy) || Number.isNaN(sell) ? Number.NaN : buy - sell;
}

export function footprintPoc(footprint: unknown): RequestVolumeRowData | undefined {
  footprint = unwrapSourceAwareRequestValue(footprint);
  if (!isFootprintData(footprint)) return undefined;
  const rows = footprintRows(footprint);
  if (typeof footprint.pointOfControl === 'number') {
    return findRowContaining(rows, footprint.pointOfControl);
  }
  return rows.reduce<RequestVolumeRowData | undefined>((best, row) => (
    (row.totalVolume ?? Number.NEGATIVE_INFINITY) > (best?.totalVolume ?? Number.NEGATIVE_INFINITY) ? row : best
  ), undefined);
}

export function footprintValueAreaHigh(footprint: unknown): RequestVolumeRowData | undefined {
  footprint = unwrapSourceAwareRequestValue(footprint);
  if (!isFootprintData(footprint)) return undefined;
  const rows = footprintRows(footprint);
  return typeof footprint.valueAreaHigh === 'number'
    ? findRowContaining(rows, footprint.valueAreaHigh)
    : rows.at(-1);
}

export function footprintValueAreaLow(footprint: unknown): RequestVolumeRowData | undefined {
  footprint = unwrapSourceAwareRequestValue(footprint);
  if (!isFootprintData(footprint)) return undefined;
  const rows = footprintRows(footprint);
  return typeof footprint.valueAreaLow === 'number'
    ? findRowContaining(rows, footprint.valueAreaLow)
    : rows[0];
}

export function volumeRowValue(row: unknown, field: keyof Pick<RequestVolumeRowData, 'upPrice' | 'downPrice' | 'totalVolume' | 'buyVolume' | 'sellVolume'>): number {
  row = unwrapSourceAwareRequestValue(row);
  return isRequestVolumeRowData(row) && typeof row[field] === 'number' ? row[field] : Number.NaN;
}

export function volumeRowDelta(row: unknown): number {
  row = unwrapSourceAwareRequestValue(row);
  if (!isRequestVolumeRowData(row)) return Number.NaN;
  const buy = typeof row.buyVolume === 'number' ? row.buyVolume : Number.NaN;
  const sell = typeof row.sellVolume === 'number' ? row.sellVolume : Number.NaN;
  return Number.isNaN(buy) || Number.isNaN(sell) ? Number.NaN : buy - sell;
}

export function volumeRowImbalance(row: unknown, field: 'hasBuyImbalance' | 'hasSellImbalance'): boolean {
  row = unwrapSourceAwareRequestValue(row);
  return isRequestVolumeRowData(row) && row[field] === true;
}

function unwrapSourceAwareRequestValue(value: unknown): unknown {
  return typeof value === 'object'
    && value !== null
    && (value as { __tealscriptKnownSource?: unknown }).__tealscriptKnownSource === true
    ? (value as { value?: unknown }).value
    : value;
}

function findRowContaining(rows: RequestVolumeRowData[], price: number): RequestVolumeRowData | undefined {
  return rows.find((row) => (
    typeof row.downPrice === 'number'
    && typeof row.upPrice === 'number'
    && row.downPrice <= price
    && price <= row.upPrice
  ));
}

function rowSortPrice(row: RequestVolumeRowData): number {
  return row.downPrice ?? row.upPrice ?? Number.POSITIVE_INFINITY;
}

function toHeikinAshiBars(bars: Bar[]): Bar[] {
  const result: Bar[] = [];
  let previousOpen: number | undefined;
  let previousClose: number | undefined;

  for (const bar of bars) {
    const close = (bar.open + bar.high + bar.low + bar.close) / 4;
    const open = previousOpen === undefined || previousClose === undefined
      ? (bar.open + bar.close) / 2
      : (previousOpen + previousClose) / 2;
    const high = Math.max(bar.high, open, close);
    const low = Math.min(bar.low, open, close);

    result.push({
      ...bar,
      open,
      high,
      low,
      close,
    });

    previousOpen = open;
    previousClose = close;
  }

  return result;
}
