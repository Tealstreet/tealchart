import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import {
  corporateActionRequestKey,
  currencyRateRequestKey,
  economicRequestKey,
  financialRequestKey,
  footprintRequestKey,
  InMemoryRequestDatafeed,
  quandlRequestKey,
  seedCorporateAction,
  seedCurrencyRate,
  seedEconomicSeries,
  seedFinancialMetric,
  seedFootprints,
  seedQuandlSeries,
  seedRequestSymbol,
  type Bar,
  type ExecutionResult,
  type RequestCorporateActionQuery,
  type RequestCurrencyRateQuery,
  type RequestDatafeed,
  type RequestDatafeedQuery,
  type RequestDatafeedResult,
  type RequestEconomicSeriesQuery,
  type RequestFinancialMetricQuery,
  type RequestFootprintQuery,
  type RequestQuandlSeriesQuery,
  type RequestSeriesQuery,
  type RequestSeriesResult,
  type TealscriptEngineOptions,
} from '../../src/runtime';
import { executeScript } from '../../src/runtime';
import { executeCompiled, type CompiledExecutionOptions, tryCompile } from '../../src/runtime/codegen/execute';
import { getPlot, roundSeries } from './fixtures';

type ExpectedSeries = Array<number | null>;

interface RequestTickerOptionCase {
  name: string;
  source: string;
  bars?: Bar[];
  options?: TealscriptEngineOptions & CompiledExecutionOptions;
  expectedPlots: Record<string, ExpectedSeries>;
  assertResult?(result: ExecutionResult): void;
  assertDatafeed?(datafeed: RecordingRequestDatafeed): void;
}

const chartBars: Bar[] = [
  [1_700_000_000_000, 100, 101, 99, 100, 100],
  [1_700_000_060_000, 101, 102, 100, 101, 110],
  [1_700_000_120_000, 102, 103, 101, 102, 120],
  [1_700_000_180_000, 103, 104, 102, 103, 130],
  [1_700_000_240_000, 104, 105, 103, 104, 140],
  [1_700_000_300_000, 105, 106, 104, 105, 150],
].map(([time, open, high, low, close, volume]) => ({ time, open, high, low, close, volume }));

const chartBarsWithUnconfirmedLast: Bar[] = chartBars.map((bar, index) => (
  index === chartBars.length - 1 ? { ...bar, time: 1_700_000_330_000, close: 106 } : bar
));

const htfBars: Bar[] = [
  { time: 1_700_000_000_000, open: 10, high: 13, low: 9, close: 12, volume: 1_000 },
  { time: 1_700_000_120_000, open: 20, high: 23, low: 19, close: 22, volume: 1_100 },
  { time: 1_700_000_240_000, open: 30, high: 33, low: 29, close: 32, volume: 1_200 },
];

const lowerTfBars: Bar[] = [
  { time: 1_700_000_000_000, open: 1, high: 2, low: 0, close: 11, volume: 10 },
  { time: 1_700_000_060_000, open: 1, high: 2, low: 0, close: 12, volume: 10 },
  { time: 1_700_000_120_000, open: 1, high: 2, low: 0, close: 21, volume: 10 },
  { time: 1_700_000_180_000, open: 1, high: 2, low: 0, close: 22, volume: 10 },
  { time: 1_700_000_240_000, open: 1, high: 2, low: 0, close: 31, volume: 10 },
  { time: 1_700_000_300_000, open: 1, high: 2, low: 0, close: 32, volume: 10 },
];

class RecordingRequestDatafeed implements RequestDatafeed {
  readonly barQueries: RequestDatafeedQuery[] = [];
  readonly seriesQueries: RequestSeriesQuery[] = [];
  readonly currencyQueries: RequestCurrencyRateQuery[] = [];
  readonly economicQueries: RequestEconomicSeriesQuery[] = [];
  readonly corporateQueries: RequestCorporateActionQuery[] = [];
  readonly financialQueries: RequestFinancialMetricQuery[] = [];
  readonly quandlQueries: RequestQuandlSeriesQuery[] = [];
  readonly footprintQueries: RequestFootprintQuery[] = [];

  constructor(private readonly inner = seededDatafeed()) {}

  getBars(query: RequestDatafeedQuery): RequestDatafeedResult {
    this.barQueries.push({ ...query });
    if (query.symbol.includes('INVALID')) {
      return { ok: false, code: 'invalid_symbol', message: `Invalid symbol ${query.symbol}` };
    }
    if (query.symbol === 'NASDAQ:AAPL' && query.timeframe === '1' && query.currency === 'EUR') {
      return {
        ok: true,
        context: requestContext(
          query.symbol,
          query.timeframe,
          trimBars(chartBars.map((bar) => ({ ...bar, close: bar.close + 1 })), query.calcBarsCount),
          query.currency,
        ),
      };
    }
    return this.inner.getBars(query);
  }

  getSeries(query: RequestSeriesQuery): RequestSeriesResult {
    this.seriesQueries.push({ ...query });
    if (query.key.includes('INVALID') || query.key.includes('ZZ')) {
      return { ok: false, code: 'invalid_symbol', message: `Invalid request series ${query.family} ${query.key}` };
    }
    return this.inner.getSeries?.(query) ?? { ok: false, code: 'missing_context', message: `Missing ${query.family} ${query.key}` };
  }

  getCurrencyRate(query: RequestCurrencyRateQuery): number | undefined {
    this.currencyQueries.push({ ...query });
    return this.inner.getCurrencyRate?.(query);
  }

  getEconomicSeries(query: RequestEconomicSeriesQuery): number | undefined {
    this.economicQueries.push({ ...query });
    if (query.countryCode === 'ZZ') return undefined;
    return this.inner.getEconomicSeries?.(query);
  }

  getCorporateAction(query: RequestCorporateActionQuery) {
    this.corporateQueries.push({ ...query });
    if (query.ticker.includes('INVALID')) return undefined;
    return this.inner.getCorporateAction?.(query);
  }

  getFinancialMetric(query: RequestFinancialMetricQuery) {
    this.financialQueries.push({ ...query });
    if (query.symbol.includes('INVALID')) return undefined;
    return this.inner.getFinancialMetric?.(query);
  }

  getQuandlSeries(query: RequestQuandlSeriesQuery) {
    this.quandlQueries.push({ ...query });
    if (query.ticker.includes('INVALID')) return undefined;
    return this.inner.getQuandlSeries?.(query);
  }

  getFootprint(query: RequestFootprintQuery) {
    this.footprintQueries.push({ ...query });
    return this.inner.getFootprint?.(query);
  }
}

function seededDatafeed(): InMemoryRequestDatafeed {
  return new InMemoryRequestDatafeed(
    [
      requestContext('NASDAQ:AAPL', '2', htfBars),
      requestContext('NASDAQ:AAPL', '1', chartBars),
      requestContext('NASDAQ:AAPL|session=extended|adjustment=dividends|backadjustment=on|settlement_as_close=off', '1', chartBars.map((bar) => ({ ...bar, close: 200 + (bar.close - 100) }))),
      requestContext('NASDAQ:AAPL|adjustment=splits|backadjustment=off|settlement_as_close=on', '1', chartBars.map((bar) => ({ ...bar, close: 300 + (bar.close - 100) }))),
      requestContext('NASDAQ:MSFT|session=extended|adjustment=dividends|backadjustment=on|settlement_as_close=off', '1', chartBars.map((bar) => ({ ...bar, close: 400 + (bar.close - 100) }))),
      requestContext('NASDAQ:AAPL|chart=renko:ATR:10:true:Close', '1', chartBars.map((bar) => ({ ...bar, close: 500 + (bar.close - 100) }))),
      requestContext('NASDAQ:AAPL|chart=linebreak:3', '1', chartBars.map((bar) => ({ ...bar, close: 600 + (bar.close - 100) }))),
      requestContext('NASDAQ:AAPL|chart=kagi:ATR:10', '1', chartBars.map((bar) => ({ ...bar, close: 700 + (bar.close - 100) }))),
      requestContext('NASDAQ:AAPL|chart=pointfigure:hl:ATR:14:3', '1', chartBars.map((bar) => ({ ...bar, close: 800 + (bar.close - 100) }))),
      requestContext(seedRequestSymbol('seed/repo', 'AAPL'), '60', chartBars.map((bar) => ({ ...bar, close: 900 + (bar.close - 100) }))),
      requestContext('BINANCE:BTCUSDT', '1', lowerTfBars),
    ],
    [
      {
        family: 'dividends',
        key: corporateActionRequestKey('NASDAQ:AAPL', 'dividends.gross', 'USD'),
        points: [{ time: chartBars[2]!.time, value: 1.25 }],
      },
      {
        family: 'earnings',
        key: corporateActionRequestKey('NASDAQ:AAPL', 'earnings.actual', 'USD'),
        points: [{ time: chartBars[2]!.time, value: 2.5 }],
      },
      {
        family: 'splits',
        key: corporateActionRequestKey('NASDAQ:AAPL', 'splits.denominator'),
        points: [{ time: chartBars[2]!.time, value: 4 }],
      },
      {
        family: 'financial',
        key: financialRequestKey('NASDAQ:AAPL', 'TOTAL_REVENUE', 'FQ', 'USD'),
        points: [{ time: chartBars[2]!.time, value: 1000 }],
      },
      {
        family: 'economic',
        key: economicRequestKey('US', 'GDP'),
        points: [{ time: chartBars[2]!.time, value: 3.2 }],
      },
      {
        family: 'quandl',
        key: quandlRequestKey('MULTPL/SHILLER_PE_RATIO_MONTH', 1),
        points: [{ time: chartBars[2]!.time, value: 29.5 }],
      },
    ],
    [
      seedCurrencyRate('USD', 'EUR', [{ time: chartBars[0]!.time, value: 0.9 }]),
    ],
    [
      seedEconomicSeries('US', 'GDP', [{ time: chartBars[2]!.time, value: 3.2 }]),
    ],
    [
      seedCorporateAction('dividends', 'NASDAQ:AAPL', [{ time: chartBars[2]!.time, value: { kind: 'dividends', gross: 1.25 } }], 'USD'),
      seedCorporateAction('earnings', 'NASDAQ:AAPL', [{ time: chartBars[2]!.time, value: { kind: 'earnings', actual: 2.5 } }], 'USD'),
      seedCorporateAction('splits', 'NASDAQ:AAPL', [{ time: chartBars[2]!.time, value: { kind: 'splits', denominator: 4 } }]),
    ],
    [
      seedFinancialMetric('NASDAQ:AAPL', 'TOTAL_REVENUE', 'FQ', [{ time: chartBars[2]!.time, value: 1000 }], 'USD'),
    ],
    [
      seedQuandlSeries('MULTPL/SHILLER_PE_RATIO_MONTH', 1, [{ time: chartBars[2]!.time, value: 29.5 }]),
    ],
    [
      seedFootprints('NASDAQ:AAPL', '1', 10, 70, [
        { time: chartBars[0]!.time, totalVolume: 1200, buyVolume: 750, sellVolume: 450 },
      ]),
      seedFootprints('BTCUSDT', '60', 10, 70, [
        { time: chartBars[0]!.time, totalVolume: 1200, buyVolume: 750, sellVolume: 450 },
      ]),
    ],
  );
}

function requestContext(symbol: string, timeframe: string, bars: Bar[], currency?: string) {
  return {
    symbol,
    timeframe,
    currency,
    bars,
    syminfo: {
      ticker: symbol,
      tickerid: symbol,
      currency: currency ?? 'USD',
      timezone: 'Etc/UTC',
    },
  };
}

function trimBars(bars: Bar[], calcBarsCount: number | undefined): Bar[] {
  if (calcBarsCount === undefined) return bars;
  return bars.slice(Math.max(0, bars.length - Math.trunc(calcBarsCount)));
}

function runBoth(entry: RequestTickerOptionCase): {
  interpreted: ExecutionResult;
  compiled: ExecutionResult;
  interpretedDatafeed: RecordingRequestDatafeed;
  compiledDatafeed: RecordingRequestDatafeed;
} {
  const ast = parse(entry.source);
  const compiledScript = tryCompile(ast);
  if (!compiledScript.success) {
    throw new Error(`Compilation failed for ${entry.name}: ${compiledScript.unsupported.join(', ')}`);
  }

  const interpretedDatafeed = new RecordingRequestDatafeed();
  const compiledDatafeed = new RecordingRequestDatafeed();
  const interpreted = executeScript(ast, entry.bars ?? chartBars, undefined, {
    ...entry.options,
    requestDatafeed: interpretedDatafeed,
  });
  const compiled = executeCompiled(compiledScript, entry.bars ?? chartBars, undefined, {
    ...entry.options,
    requestDatafeed: compiledDatafeed,
  });
  if (!compiled) {
    throw new Error(`Compiled execution returned null for ${entry.name}`);
  }

  expect(interpreted.errors).toEqual([]);
  expect(compiled.errors).toEqual([]);
  expect(compiled.profile.executionMode).toBe('compiled');
  return { interpreted, compiled, interpretedDatafeed, compiledDatafeed };
}

function expectExpectedPlots(result: ExecutionResult, expectedPlots: Record<string, ExpectedSeries>): void {
  for (const [title, expected] of Object.entries(expectedPlots)) {
    expect(roundSeries(getPlot(result, title).values)).toEqual(expected);
  }
}

function expectPlotParity(left: ExecutionResult, right: ExecutionResult): void {
  expect(left.plots.map((plot) => plot.title)).toEqual(right.plots.map((plot) => plot.title));
  for (let index = 0; index < left.plots.length; index++) {
    expect(roundSeries(left.plots[index]!.values)).toEqual(roundSeries(right.plots[index]!.values));
  }
}

const requestTickerOptionCases: RequestTickerOptionCase[] = [
  {
    name: 'ignore_invalid_symbol and ignore_invalid_currency options across request families',
    source: `//@version=6
indicator("Request ignore invalid options")
securityMissing = request.security("INVALID:MISS", "1", close, ignore_invalid_symbol=true)
lowerMissing = request.security_lower_tf("INVALID:MISS", "1", close, ignore_invalid_symbol=true)
seedMissing = request.seed("seed/repo", "INVALID", close, ignore_invalid_symbol=true)
divMissing = request.dividends("INVALID:MISS", dividends.gross, ignore_invalid_symbol=true)
earnMissing = request.earnings("INVALID:MISS", earnings.actual, ignore_invalid_symbol=true)
splitMissing = request.splits("INVALID:MISS", splits.denominator, ignore_invalid_symbol=true)
financialMissing = request.financial("INVALID:MISS", "TOTAL_REVENUE", "FQ", ignore_invalid_symbol=true)
economicMissing = request.economic("ZZ", "GDP", ignore_invalid_symbol=true)
quandlMissing = request.quandl("INVALID/DATA", barmerge.gaps_off, 1, ignore_invalid_symbol=true)
currencyMissing = request.currency_rate("USD", "ZZZ", ignore_invalid_currency=true)
footprintMissing = request.footprint(5, 68, 250)
plot(na(securityMissing) ? 1 : 0, "Security Missing")
plot(array.size(lowerMissing), "Lower Missing Count")
plot(na(seedMissing) ? 1 : 0, "Seed Missing")
plot(na(divMissing) ? 1 : 0, "Dividend Missing")
plot(na(earnMissing) ? 1 : 0, "Earnings Missing")
plot(na(splitMissing) ? 1 : 0, "Split Missing")
plot(na(financialMissing) ? 1 : 0, "Financial Missing")
plot(na(economicMissing) ? 1 : 0, "Economic Missing")
plot(na(quandlMissing) ? 1 : 0, "Quandl Missing")
plot(na(currencyMissing) ? 1 : 0, "Currency Missing")
plot(na(footprintMissing) ? 1 : 0, "Footprint Missing")`,
    expectedPlots: {
      'Security Missing': [1, 1, 1, 1, 1, 1],
      'Lower Missing Count': [0, 0, 0, 0, 0, 0],
      'Seed Missing': [1, 1, 1, 1, 1, 1],
      'Dividend Missing': [1, 1, 1, 1, 1, 1],
      'Earnings Missing': [1, 1, 1, 1, 1, 1],
      'Split Missing': [1, 1, 1, 1, 1, 1],
      'Financial Missing': [1, 1, 1, 1, 1, 1],
      'Economic Missing': [1, 1, 1, 1, 1, 1],
      'Quandl Missing': [1, 1, 1, 1, 1, 1],
      'Currency Missing': [1, 1, 1, 1, 1, 1],
      'Footprint Missing': [1, 1, 1, 1, 1, 1],
    },
    assertDatafeed(datafeed) {
      expect(datafeed.barQueries.some((query) => query.symbol === 'INVALID:MISS')).toBe(true);
      expect(datafeed.seriesQueries.some((query) => query.family === 'dividends' && query.key === corporateActionRequestKey('INVALID:MISS', 'dividends.gross'))).toBe(true);
      expect(datafeed.seriesQueries.some((query) => query.family === 'earnings' && query.key === corporateActionRequestKey('INVALID:MISS', 'earnings.actual'))).toBe(true);
      expect(datafeed.seriesQueries.some((query) => query.family === 'splits' && query.key === corporateActionRequestKey('INVALID:MISS', 'splits.denominator'))).toBe(true);
      expect(datafeed.seriesQueries.some((query) => query.family === 'financial' && query.key === financialRequestKey('INVALID:MISS', 'TOTAL_REVENUE', 'FQ'))).toBe(true);
      expect(datafeed.seriesQueries.some((query) => query.family === 'economic' && query.key === economicRequestKey('ZZ', 'GDP'))).toBe(true);
      expect(datafeed.seriesQueries.some((query) => query.family === 'quandl' && query.key === quandlRequestKey('INVALID/DATA', 1))).toBe(true);
      expect(datafeed.currencyQueries.some((query) => query.baseCurrency === 'USD' && query.quoteCurrency === 'ZZZ')).toBe(true);
      expect(datafeed.footprintQueries.some((query) => footprintRequestKey(query.symbol, query.timeframe, query.ticksPerRow, query.valueAreaPercent, query.imbalancePercent) === footprintRequestKey('BTCUSDT', '60', 5, 68, 250))).toBe(true);
    },
  },
  {
    name: 'currency and calc_bars_count options route into request.security contexts',
    source: `//@version=6
indicator("Request currency and calc bars", calc_bars_count=250)
eurClose = request.security("NASDAQ:AAPL", "1", close, currency=currency.EUR, calc_bars_count=3, lookahead=barmerge.lookahead_on)
plot(eurClose, "EUR Close")`,
    expectedPlots: {
      'EUR Close': [null, null, null, 104, 105, 106],
    },
    assertResult(result) {
      expect(result.declaration.calcBarsCount).toBe(250);
    },
    assertDatafeed(datafeed) {
      expect(datafeed.barQueries).toContainEqual({
        symbol: 'NASDAQ:AAPL',
        timeframe: '1',
        currency: 'EUR',
        calcBarsCount: 3,
      });
    },
  },
  {
    name: 'lookahead distinguishes unconfirmed and confirmed higher-timeframe values',
    source: `//@version=6
indicator("Request repainting option")
futureLeak = request.security("NASDAQ:AAPL", "2", close, lookahead=barmerge.lookahead_on)
confirmedOnly = request.security("NASDAQ:AAPL", "2", close)
confirmedOffset = request.security("NASDAQ:AAPL", "2", close[1], lookahead=barmerge.lookahead_on)
plot(futureLeak, "Future Leak")
plot(confirmedOnly, "Confirmed Only")
plot(confirmedOffset, "Confirmed Offset")`,
    bars: chartBarsWithUnconfirmedLast,
    expectedPlots: {
      'Future Leak': [12, 12, 22, 22, 32, 32],
      'Confirmed Only': [null, null, 12, 12, 22, 22],
      'Confirmed Offset': [null, null, 12, 12, 22, 22],
    },
  },
  {
    name: 'ticker modifiers feed concrete request.security symbols',
    source: `//@version=6
indicator("Ticker modifiers into requests")
modified = ticker.new("NASDAQ", "AAPL", session.extended, adjustment.dividends, backadjustment.on, settlement_as_close.off)
regularized = ticker.modify(modified, session=session.regular, adjustment=adjustment.splits, backadjustment=backadjustment.off, settlement_as_close=settlement_as_close.on)
inherited = ticker.inherit(modified, "NASDAQ:MSFT")
renko = ticker.renko("NASDAQ:AAPL", "ATR", 10, true, "Close")
linebreak = ticker.linebreak("NASDAQ:AAPL", 3)
kagi = ticker.kagi("NASDAQ:AAPL", "ATR", 10)
pnf = ticker.pointfigure("NASDAQ:AAPL", "hl", "ATR", 14, 3)
plot(request.security(modified, "1", close, lookahead=barmerge.lookahead_on), "Modified")
plot(request.security(regularized, "1", close, lookahead=barmerge.lookahead_on), "Regularized")
plot(request.security(inherited, "1", close, lookahead=barmerge.lookahead_on), "Inherited")
plot(request.security(renko, "1", close, lookahead=barmerge.lookahead_on), "Renko")
plot(request.security(linebreak, "1", close, lookahead=barmerge.lookahead_on), "Linebreak")
plot(request.security(kagi, "1", close, lookahead=barmerge.lookahead_on), "Kagi")
plot(request.security(pnf, "1", close, lookahead=barmerge.lookahead_on), "Pointfigure")
plot(request.security(ticker.standard(renko), "1", close, lookahead=barmerge.lookahead_on), "Standard")`,
    expectedPlots: {
      Modified: [200, 201, 202, 203, 204, 205],
      Regularized: [300, 301, 302, 303, 304, 305],
      Inherited: [400, 401, 402, 403, 404, 405],
      Renko: [500, 501, 502, 503, 504, 505],
      Linebreak: [600, 601, 602, 603, 604, 605],
      Kagi: [700, 701, 702, 703, 704, 705],
      Pointfigure: [800, 801, 802, 803, 804, 805],
      Standard: [100, 101, 102, 103, 104, 105],
    },
    assertDatafeed(datafeed) {
      const symbols = datafeed.barQueries.map((query) => query.symbol);
      expect(symbols).toContain('NASDAQ:AAPL|session=extended|adjustment=dividends|backadjustment=on|settlement_as_close=off');
      expect(symbols).toContain('NASDAQ:AAPL|adjustment=splits|backadjustment=off|settlement_as_close=on');
      expect(symbols).toContain('NASDAQ:MSFT|session=extended|adjustment=dividends|backadjustment=on|settlement_as_close=off');
      expect(symbols).toContain('NASDAQ:AAPL|chart=renko:ATR:10:true:Close');
      expect(symbols).toContain('NASDAQ:AAPL|chart=linebreak:3');
      expect(symbols).toContain('NASDAQ:AAPL|chart=kagi:ATR:10');
      expect(symbols).toContain('NASDAQ:AAPL|chart=pointfigure:hl:ATR:14:3');
      expect(symbols).toContain('NASDAQ:AAPL');
    },
  },
  {
    name: 'seeded request values route through each provider seam',
    source: `//@version=6
indicator("Seeded request option values")
seedClose = request.seed("seed/repo", "AAPL", close, calc_bars_count=2)
dividend = request.dividends("NASDAQ:AAPL", dividends.gross, currency=currency.USD)
earnings = request.earnings("NASDAQ:AAPL", earnings.actual, currency=currency.USD)
split = request.splits("NASDAQ:AAPL", splits.denominator)
financial = request.financial("NASDAQ:AAPL", "TOTAL_REVENUE", "FQ", currency=currency.USD)
economic = request.economic("US", "GDP")
quandl = request.quandl("MULTPL/SHILLER_PE_RATIO_MONTH", barmerge.gaps_off, 1)
rate = request.currency_rate(currency.USD, currency.EUR)
fp = request.footprint(10, 70)
plot(seedClose, "Seed Close")
plot(dividend, "Dividend")
plot(earnings, "Earnings")
plot(split, "Split")
plot(financial, "Financial")
plot(economic, "Economic")
plot(quandl, "Quandl")
plot(rate, "Rate")
plot(na(fp) ? na : fp.total_volume(), "Footprint Total")`,
    expectedPlots: {
      'Seed Close': [null, null, null, null, null, 904],
      Dividend: [null, null, 1.25, 1.25, 1.25, 1.25],
      Earnings: [null, null, 2.5, 2.5, 2.5, 2.5],
      Split: [null, null, 4, 4, 4, 4],
      Financial: [null, null, 1000, 1000, 1000, 1000],
      Economic: [null, null, 3.2, 3.2, 3.2, 3.2],
      Quandl: [null, null, 29.5, 29.5, 29.5, 29.5],
      Rate: [0.9, 0.9, 0.9, 0.9, 0.9, 0.9],
      'Footprint Total': [1200, 1200, 1200, 1200, 1200, 1200],
    },
    assertDatafeed(datafeed) {
      expect(datafeed.barQueries).toContainEqual({
        symbol: seedRequestSymbol('seed/repo', 'AAPL'),
        timeframe: '60',
        calcBarsCount: 2,
      });
      expect(datafeed.corporateQueries.some((query) => query.kind === 'dividends' && query.ticker === 'NASDAQ:AAPL' && query.currency === 'USD')).toBe(true);
      expect(datafeed.corporateQueries.some((query) => query.kind === 'earnings' && query.ticker === 'NASDAQ:AAPL' && query.currency === 'USD')).toBe(true);
      expect(datafeed.corporateQueries.some((query) => query.kind === 'splits' && query.ticker === 'NASDAQ:AAPL')).toBe(true);
      expect(datafeed.financialQueries.some((query) => query.symbol === 'NASDAQ:AAPL' && query.financialId === 'TOTAL_REVENUE' && query.period === 'FQ' && query.currency === 'USD')).toBe(true);
      expect(datafeed.economicQueries.some((query) => query.countryCode === 'US' && query.field === 'GDP')).toBe(true);
      expect(datafeed.quandlQueries.some((query) => query.ticker === 'MULTPL/SHILLER_PE_RATIO_MONTH' && query.column === 1)).toBe(true);
      expect(datafeed.currencyQueries.some((query) => query.baseCurrency === 'USD' && query.quoteCurrency === 'EUR')).toBe(true);
      expect(datafeed.footprintQueries.some((query) => query.symbol === 'BTCUSDT' && query.timeframe === '60' && query.ticksPerRow === 10 && query.valueAreaPercent === 70)).toBe(true);
    },
  },
];

describe('Pine request and ticker option behavior', () => {
  for (const entry of requestTickerOptionCases) {
    it(`matches fixed option semantics for ${entry.name}`, () => {
      const { interpreted, compiled, interpretedDatafeed, compiledDatafeed } = runBoth(entry);

      expectExpectedPlots(interpreted, entry.expectedPlots);
      expectExpectedPlots(compiled, entry.expectedPlots);
      expectPlotParity(compiled, interpreted);
      entry.assertResult?.(interpreted);
      entry.assertResult?.(compiled);
      entry.assertDatafeed?.(interpretedDatafeed);
      entry.assertDatafeed?.(compiledDatafeed);
    });
  }
});
