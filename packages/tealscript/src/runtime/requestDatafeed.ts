import type { Bar, SymInfo } from './context';

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
  currency?: string;
}

export type RequestSeriesFamily =
  | 'currency_rate'
  | 'dividends'
  | 'earnings'
  | 'splits'
  | 'financial'
  | 'economic';

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

export function corporateActionRequestKey(ticker: string, field: string, currency?: string): string {
  return [ticker, field, currency ?? ''].join('\u0000');
}

export function financialRequestKey(symbol: string, financialId: string, period: string, currency?: string): string {
  return [symbol, financialId, period, currency ?? ''].join('\u0000');
}

export function economicRequestKey(countryCode: string, field: string): string {
  return `${countryCode}\u0000${field}`;
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

  constructor(contexts: RequestDataContext[] = [], seriesContexts: RequestSeriesContext[] = []) {
    for (const context of contexts) {
      this.setContext(context);
    }
    for (const context of seriesContexts) {
      this.setSeriesContext(context);
    }
  }

  setContext(context: RequestDataContext): void {
    this.contexts.set(requestDatafeedKey(context.symbol, context.timeframe), {
      ...context,
      bars: context.bars.map((bar) => ({ ...bar })),
      syminfo: context.syminfo === undefined ? undefined : { ...context.syminfo },
    });
  }

  setSeriesContext(context: RequestSeriesContext): void {
    this.seriesContexts.set(requestSeriesKey(context.family, context.key), {
      ...context,
      points: context.points.map((point) => ({ ...point })),
    });
  }

  getBars(query: RequestDatafeedQuery): RequestDatafeedResult {
    const context = this.contexts.get(requestDatafeedKey(query.symbol, query.timeframe))
      ?? this.getSyntheticContext(query.symbol, query.timeframe);
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
      },
    };
  }

  private getSyntheticContext(symbol: string, timeframe: string): RequestDataContext | undefined {
    if (splitTickerModifiers(symbol).modifiers.includes('chart=heikinashi')) {
      const baseSymbol = removeTickerModifier(symbol, 'chart=');
      const baseContext = this.contexts.get(requestDatafeedKey(baseSymbol, timeframe));
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
