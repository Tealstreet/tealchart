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

export type RequestSeriesFamily = 'currency_rate';

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
    const context = this.contexts.get(requestDatafeedKey(query.symbol, query.timeframe));
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
