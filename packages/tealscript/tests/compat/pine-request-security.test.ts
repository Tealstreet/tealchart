import { describe, expect, it } from 'vitest';

import {
  corporateActionRequestKey,
  currencyRateRequestKey,
  economicRequestKey,
  financialRequestKey,
  InMemoryRequestDatafeed,
  seedRequestSymbol,
  type Bar,
} from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const chartBars: Bar[] = [
  { time: 1_700_000_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
  { time: 1_700_000_060_000, open: 100, high: 102, low: 99, close: 101, volume: 110 },
  { time: 1_700_000_120_000, open: 101, high: 103, low: 100, close: 102, volume: 120 },
  { time: 1_700_000_180_000, open: 102, high: 104, low: 101, close: 103, volume: 130 },
  { time: 1_700_000_240_000, open: 103, high: 105, low: 102, close: 104, volume: 140 },
  { time: 1_700_000_300_000, open: 104, high: 106, low: 103, close: 105, volume: 150 },
];

const requestedBars: Bar[] = [
  { time: 1_700_000_000_000, open: 11, high: 15, low: 9, close: 10, volume: 1_000 },
  { time: 1_700_000_120_000, open: 21, high: 25, low: 19, close: 20, volume: 1_100 },
  { time: 1_700_000_240_000, open: 31, high: 35, low: 29, close: 30, volume: 1_200 },
];

const lowerChartBars: Bar[] = [
  { time: 1_700_000_000_000, open: 100, high: 103, low: 99, close: 102, volume: 210 },
  { time: 1_700_000_120_000, open: 102, high: 105, low: 101, close: 104, volume: 250 },
  { time: 1_700_000_240_000, open: 104, high: 107, low: 103, close: 106, volume: 290 },
];

const lowerRequestedBars: Bar[] = [
  { time: 1_700_000_000_000, open: 10, high: 12, low: 9, close: 11, volume: 100 },
  { time: 1_700_000_060_000, open: 11, high: 14, low: 10, close: 13, volume: 110 },
  { time: 1_700_000_120_000, open: 20, high: 23, low: 18, close: 21, volume: 120 },
  { time: 1_700_000_180_000, open: 21, high: 25, low: 20, close: 24, volume: 130 },
  { time: 1_700_000_240_000, open: 30, high: 32, low: 29, close: 31, volume: 140 },
  { time: 1_700_000_300_000, open: 31, high: 35, low: 30, close: 34, volume: 150 },
];

function requestDatafeed(calcBarsCount?: number): InMemoryRequestDatafeed {
  return new InMemoryRequestDatafeed([
    {
      symbol: 'BTCUSDT',
      timeframe: '2',
      bars: calcBarsCount === undefined ? requestedBars : requestedBars.slice(-calcBarsCount),
      syminfo: { ticker: 'BTCUSDT', timezone: 'Etc/UTC' },
    },
  ]);
}

function lowerTimeframeRequestDatafeed(): InMemoryRequestDatafeed {
  return new InMemoryRequestDatafeed([
    {
      symbol: 'BTCUSDT',
      timeframe: '1',
      bars: lowerRequestedBars,
      syminfo: { ticker: 'BTCUSDT', timezone: 'Etc/UTC' },
    },
  ]);
}

function multiSymbolRequestDatafeed(): InMemoryRequestDatafeed {
  return new InMemoryRequestDatafeed([
    {
      symbol: 'BTCUSDT',
      timeframe: '2',
      bars: requestedBars,
      syminfo: { ticker: 'BTCUSDT', timezone: 'Etc/UTC' },
    },
    {
      symbol: 'NASDAQ:AAPL',
      timeframe: '2',
      bars: [
        { time: 1_700_000_000_000, open: 180, high: 184, low: 179, close: 181, volume: 10_000 },
        { time: 1_700_000_120_000, open: 181, high: 186, low: 180, close: 185, volume: 11_000 },
        { time: 1_700_000_240_000, open: 185, high: 190, low: 184, close: 188, volume: 12_000 },
      ],
      currency: 'USD',
      syminfo: {
        ticker: 'NASDAQ:AAPL',
        description: 'Apple Inc.',
        type: 'stock',
        currency: 'USD',
        basecurrency: 'AAPL',
        timezone: 'America/New_York',
      },
    },
  ]);
}

function requestSessionDatafeed(): InMemoryRequestDatafeed {
  return new InMemoryRequestDatafeed([
    {
      symbol: 'NASDAQ:AAPL',
      timeframe: '2',
      bars: requestedBars,
      syminfo: { ticker: 'NASDAQ:AAPL', timezone: 'Etc/UTC' },
      session: {
        timezone: 'Etc/UTC',
        regular: '0000-2359:1234567',
      },
    },
  ]);
}

function currencyRateDatafeed(): InMemoryRequestDatafeed {
  return new InMemoryRequestDatafeed([], [
    {
      family: 'currency_rate',
      key: currencyRateRequestKey('USD', 'GBP'),
      points: [
        { time: 1_700_000_000_000, value: 0.8 },
        { time: 1_700_000_120_000, value: 0.82 },
        { time: 1_700_000_240_000, value: 0.85 },
      ],
    },
  ]);
}

function pointSeriesDatafeed(): InMemoryRequestDatafeed {
  return new InMemoryRequestDatafeed([], [
    {
      family: 'dividends',
      key: corporateActionRequestKey('NASDAQ:AAPL', 'dividends.gross', 'USD'),
      points: [
        { time: 1_700_000_120_000, value: 0.24 },
        { time: 1_700_000_240_000, value: 0.25 },
      ],
    },
    {
      family: 'earnings',
      key: corporateActionRequestKey('NASDAQ:AAPL', 'earnings.actual', 'USD'),
      points: [
        { time: 1_700_000_000_000, value: 1.5 },
        { time: 1_700_000_240_000, value: 1.8 },
      ],
    },
    {
      family: 'splits',
      key: corporateActionRequestKey('NASDAQ:AAPL', 'splits.denominator'),
      points: [
        { time: 1_700_000_180_000, value: 4 },
      ],
    },
    {
      family: 'financial',
      key: financialRequestKey('NASDAQ:AAPL', 'TOTAL_REVENUE', 'FQ', 'USD'),
      points: [
        { time: 1_700_000_000_000, value: 1000 },
        { time: 1_700_000_240_000, value: 1100 },
      ],
    },
    {
      family: 'economic',
      key: economicRequestKey('US', 'GDP'),
      points: [
        { time: 1_700_000_120_000, value: 3.1 },
      ],
    },
  ]);
}

function seedDatafeed(calcBarsCount?: number): InMemoryRequestDatafeed {
  const seedBars: Bar[] = [
    { time: 1_700_000_000_000, open: 1, high: 2, low: 1, close: 10, volume: 100 },
    { time: 1_700_000_120_000, open: 2, high: 4, low: 2, close: 20, volume: 200 },
    { time: 1_700_000_240_000, open: 3, high: 6, low: 3, close: 30, volume: 300 },
  ];
  return new InMemoryRequestDatafeed([
    {
      symbol: seedRequestSymbol('tradingview-pine-seeds/demo', 'BTC_DEV'),
      timeframe: '60',
      bars: calcBarsCount === undefined ? seedBars : seedBars.slice(-calcBarsCount),
      syminfo: {
        ticker: 'BTC_DEV',
        timezone: 'Etc/UTC',
      },
    },
  ]);
}

describe('Pine request.security compatibility', () => {
  it('merges same-symbol higher timeframe values with default confirmed lookahead-off semantics', () => {
    const result = runCompatScript(`
indicator("HTF request")
htfClose = request.security(syminfo.tickerid, "2", close)
plot(htfClose, title="HTF Close")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: requestDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'HTF Close').values).toEqual([null, null, 10, 10, 20, 20]);
  });

  it('accepts the legacy global security alias', () => {
    const result = runCompatScript(`
//@version=4
study("Legacy security")
htfClose = security(syminfo.tickerid, "2", close, lookahead=barmerge.lookahead_on)
plot(htfClose, title="HTF Close")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: requestDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'HTF Close').values).toEqual([10, 10, 20, 20, 30, 30]);
  });

  it('supports lookahead and gaps barmerge modes', () => {
    const result = runCompatScript(`
indicator("HTF request modes")
lookahead = request.security(syminfo.tickerid, "2", close, lookahead=barmerge.lookahead_on)
confirmedGaps = request.security(syminfo.tickerid, "2", close, gaps=barmerge.gaps_on)
lookaheadGaps = request.security(syminfo.tickerid, "2", close, gaps=barmerge.gaps_on, lookahead=barmerge.lookahead_on)
plot(lookahead, title="Lookahead")
plot(confirmedGaps, title="Confirmed Gaps")
plot(lookaheadGaps, title="Lookahead Gaps")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: requestDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Lookahead').values).toEqual([10, 10, 20, 20, 30, 30]);
    expect(getPlot(result, 'Confirmed Gaps').values).toEqual([null, null, 10, null, 20, null]);
    expect(getPlot(result, 'Lookahead Gaps').values).toEqual([10, null, 20, null, 30, null]);
  });

  it('resolves mixed named and positional request.security arguments in Pine order', () => {
    const result = runCompatScript(`
indicator("Mixed HTF request")
mixed = request.security(symbol=syminfo.tickerid, "2", close, barmerge.gaps_on, barmerge.lookahead_on)
plot(mixed, title="Mixed")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: requestDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Mixed').values).toEqual([10, null, 20, null, 30, null]);
  });

  it('locks the official repaint-safe higher-timeframe offset idiom', () => {
    const result = runCompatScript(`
indicator("HTF repaint-safe request")
futureLeak = request.security(syminfo.tickerid, "2", close, lookahead=barmerge.lookahead_on)
confirmedOnly = request.security(syminfo.tickerid, "2", close[1], lookahead=barmerge.lookahead_on)
plot(futureLeak, title="Future Leak")
plot(confirmedOnly, title="Confirmed Only")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: requestDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Future Leak').values).toEqual([10, 10, 20, 20, 30, 30]);
    expect(getPlot(result, 'Confirmed Only').values).toEqual([null, null, 10, 10, 20, 20]);
  });

  it('supports repaint-safe higher-timeframe requests with derived source offsets', () => {
    const result = runCompatScript(`
indicator("HTF repaint-safe derived request")
futureLeakSource = request.security(syminfo.tickerid, "2", hl2, lookahead=barmerge.lookahead_on)
confirmedSource = request.security(syminfo.tickerid, "2", hl2[1], lookahead=barmerge.lookahead_on)
plot(futureLeakSource, title="Future Leak Source")
plot(confirmedSource, title="Confirmed Source")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: requestDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Future Leak Source').values).toEqual([12, 12, 22, 22, 32, 32]);
    expect(getPlot(result, 'Confirmed Source').values).toEqual([null, null, 12, 12, 22, 22]);
  });

  it('evaluates request expressions inside the requested context', () => {
    const result = runCompatScript(`
indicator("HTF expression")
htfAverage = request.security(syminfo.tickerid, "2", ta.sma(close, 2), lookahead=barmerge.lookahead_on)
plot(htfAverage, title="HTF Average")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: requestDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'HTF Average').values).toEqual([null, null, 15, 15, 25, 25]);
  });

  it('does not reuse cached values across conditional request expressions', () => {
    const result = runCompatScript(`
indicator("HTF conditional requests")
value = bar_index % 2 == 0 ?
    request.security(syminfo.tickerid, "2", close, lookahead=barmerge.lookahead_on) :
    request.security(syminfo.tickerid, "2", open, lookahead=barmerge.lookahead_on)
plot(value, title="Conditional")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: requestDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Conditional').values).toEqual([10, 11, 20, 21, 30, 31]);
  });

  it('passes calc_bars_count to the request datafeed', () => {
    const result = runCompatScript(`
indicator("HTF calc bars")
htfClose = request.security(syminfo.tickerid, "2", close, calc_bars_count=2)
plot(htfClose, title="HTF Close")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: requestDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'HTF Close').values).toEqual([null, null, null, null, 20, 20]);
  });

  it('evaluates other-symbol metadata inside the requested context', () => {
    const result = runCompatScript(`
indicator("Other symbol request")
aaplClose = request.security("NASDAQ:AAPL", "2", close, lookahead=barmerge.lookahead_on)
aaplTickerLen = request.security("NASDAQ:AAPL", "2", str.length(syminfo.tickerid), lookahead=barmerge.lookahead_on)
aaplCurrencyLen = request.security("NASDAQ:AAPL", "2", str.length(syminfo.currency), currency="EUR", lookahead=barmerge.lookahead_on)
aaplPeriodLen = request.security("NASDAQ:AAPL", "2", str.length(timeframe.period), lookahead=barmerge.lookahead_on)
plot(aaplClose, title="AAPL Close")
plot(aaplTickerLen, title="AAPL Ticker Len")
plot(aaplCurrencyLen, title="AAPL Currency Len")
plot(aaplPeriodLen, title="AAPL Period Len")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: multiSymbolRequestDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'AAPL Close').values).toEqual([181, 181, 185, 185, 188, 188]);
    expect(getPlot(result, 'AAPL Ticker Len').values).toEqual([11, 11, 11, 11, 11, 11]);
    expect(getPlot(result, 'AAPL Currency Len').values).toEqual([3, 3, 3, 3, 3, 3]);
    expect(getPlot(result, 'AAPL Period Len').values).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it('preserves main chart ticker IDs inside requested contexts', () => {
    const result = runCompatScript(`
indicator("Request ticker id metadata")
aaplTickerLen = request.security("NASDAQ:AAPL", "2", str.length(syminfo.ticker), lookahead=barmerge.lookahead_on)
aaplTickerIdLen = request.security("NASDAQ:AAPL", "2", str.length(syminfo.tickerid), lookahead=barmerge.lookahead_on)
mainTickerIdLen = request.security("NASDAQ:AAPL", "2", str.length(syminfo.main_tickerid), lookahead=barmerge.lookahead_on)
plot(aaplTickerLen, title="AAPL Ticker Len")
plot(aaplTickerIdLen, title="AAPL Ticker ID Len")
plot(mainTickerIdLen, title="Main Ticker ID Len")
`, {
      bars: chartBars,
      engineOptions: {
        requestDatafeed: new InMemoryRequestDatafeed([
          {
            symbol: 'NASDAQ:AAPL',
            timeframe: '2',
            bars: requestedBars,
            syminfo: {
              ticker: 'AAPL',
              tickerid: 'NASDAQ:AAPL',
              timezone: 'America/New_York',
            },
          },
        ]),
        runtime: {
          syminfo: {
            ticker: 'BTCUSDT',
            tickerid: 'BINANCE:BTCUSDT',
          },
        },
      },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'AAPL Ticker Len').values).toEqual([4, 4, 4, 4, 4, 4]);
    expect(getPlot(result, 'AAPL Ticker ID Len').values).toEqual([11, 11, 11, 11, 11, 11]);
    expect(getPlot(result, 'Main Ticker ID Len').values).toEqual([15, 15, 15, 15, 15, 15]);
  });

  it('evaluates session state helpers from the requested context', () => {
    const result = runCompatScript(`
indicator("Request session state")
aaplMarket = request.security("NASDAQ:AAPL", "2", session.ismarket ? 1 : 0, lookahead=barmerge.lookahead_on)
plot(aaplMarket, title="AAPL Market")
`, {
      bars: chartBars,
      engineOptions: {
        requestDatafeed: requestSessionDatafeed(),
        runtime: {
          session: {
            timezone: 'Etc/UTC',
            regular: '0000-0001:1234567',
          },
        },
      },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'AAPL Market').values).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it('allows global static requests when dynamic_requests is false', () => {
    const result = runCompatScript(`
indicator("Static request", dynamic_requests=false)
htfClose = request.security(syminfo.tickerid, "2", close, lookahead=barmerge.lookahead_on)
plot(htfClose, title="HTF Close")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: requestDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'HTF Close').values).toEqual([10, 10, 20, 20, 30, 30]);
  });

  it('allows nested requests when dynamic_requests is true by default', () => {
    const result = runCompatScript(`
indicator("Nested dynamic request")
nested = request.security(
    "NASDAQ:AAPL",
    "2",
    request.security(syminfo.tickerid, "2", close, lookahead=barmerge.lookahead_on),
    lookahead=barmerge.lookahead_on
)
plot(nested, title="Nested")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: multiSymbolRequestDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Nested').values).toEqual([181, 181, 185, 185, 188, 188]);
  });

  it('rejects local-scope and conditional-operand requests when dynamic_requests is false', () => {
    const local = runCompatScript(`
indicator("Local request disabled", dynamic_requests=false)
if close > open
    plot(request.security(syminfo.tickerid, "2", close), title="Local")
`, {
      bars: [chartBars[1]!],
      engineOptions: { requestDatafeed: requestDatafeed() },
    });

    const conditional = runCompatScript(`
indicator("Conditional request disabled", dynamic_requests=false)
plot(close > open ? request.security(syminfo.tickerid, "2", close) : close, title="Conditional")
`, {
      bars: [chartBars[1]!],
      engineOptions: { requestDatafeed: requestDatafeed() },
    });

    const initializer = runCompatScript(`
indicator("Initializer request disabled", dynamic_requests=false)
value = if close > open
    request.security(syminfo.tickerid, "2", close)
else
    close
`, {
      bars: [chartBars[1]!],
      engineOptions: { requestDatafeed: requestDatafeed() },
    });

    const logical = runCompatScript(`
indicator("Logical request disabled", dynamic_requests=false)
plot(request.security(syminfo.tickerid, "2", close) and close > open ? 1 : 0, title="Logical")
`, {
      bars: [chartBars[1]!],
      engineOptions: { requestDatafeed: requestDatafeed() },
    });

    expect(local.errors.map((error) => error.message)).toEqual([
      'request.* calls in local scopes require dynamic_requests=true: request.security',
    ]);
    expect(conditional.errors.map((error) => error.message)).toEqual([
      'request.* calls in local scopes require dynamic_requests=true: request.security',
    ]);
    expect(initializer.errors.map((error) => error.message)).toEqual([
      'request.* calls in local scopes require dynamic_requests=true: request.security',
    ]);
    expect(logical.errors.map((error) => error.message)).toEqual([
      'request.* calls in local scopes require dynamic_requests=true: request.security',
    ]);
  });

  it('rejects nested requests when dynamic_requests is false', () => {
    const result = runCompatScript(`
indicator("Nested request disabled", dynamic_requests=false)
plot(request.security(
    "NASDAQ:AAPL",
    "2",
    request.security(syminfo.tickerid, "2", close, lookahead=barmerge.lookahead_on),
    lookahead=barmerge.lookahead_on
), title="Nested")
`, {
      bars: [chartBars[0]!],
      engineOptions: { requestDatafeed: multiSymbolRequestDatafeed() },
    });

    expect(result.errors.map((error) => error.message)).toEqual([
      'Nested request.* calls require dynamic_requests=true: request.security',
    ]);
  });

  it('supports ignore_invalid_symbol for missing fixture contexts', () => {
    const result = runCompatScript(`
indicator("HTF ignore missing")
missing = request.security("MISSING", "2", close, ignore_invalid_symbol=true)
plot(missing, title="Missing")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: requestDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Missing').values).toEqual([null, null, null, null, null, null]);
  });

  it('reports a missing host datafeed explicitly', () => {
    const result = runCompatScript(`
indicator("HTF no datafeed")
plot(request.security(syminfo.tickerid, "2", close), title="HTF Close")
`, { bars: [chartBars[0]!] });

    expect(result.errors.map((error) => error.message)).toEqual([
      'request.security requires a request datafeed',
    ]);
  });

  it('reports missing request contexts when ignore_invalid_symbol is false', () => {
    const result = runCompatScript(`
indicator("HTF missing")
plot(request.security("MISSING", "2", close), title="Missing")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: requestDatafeed() },
    });

    expect(result.errors.map((error) => error.message)).toEqual([
      'request.security failed: No request data context for MISSING 2',
      'request.security failed: No request data context for MISSING 2',
      'request.security failed: No request data context for MISSING 2',
      'request.security failed: No request data context for MISSING 2',
      'request.security failed: No request data context for MISSING 2',
      'request.security failed: No request data context for MISSING 2',
    ]);
  });

  it('caps unique request.security contexts before querying the host datafeed', () => {
    const requestPlots = Array.from(
      { length: 41 },
      (_, index) => `plot(request.security("MISSING${index}", "2", close, ignore_invalid_symbol=true), title="R${index}")`,
    ).join('\n');
    const result = runCompatScript(`
indicator("HTF request cap")
${requestPlots}
`, {
      bars: [chartBars[0]!],
      engineOptions: { requestDatafeed: requestDatafeed() },
    });

    expect(result.errors.map((error) => error.message)).toEqual([
      'Too many unique request.* contexts: maximum is 40',
    ]);
  });
});

describe('Pine request.security_lower_tf compatibility', () => {
  it('returns lower-timeframe expression values as intrabar arrays ordered by time', () => {
    const result = runCompatScript(`
indicator("Lower TF request", timeframe="2")
intrabars = request.security_lower_tf(syminfo.tickerid, "1", close)
plot(array.size(intrabars), title="Count")
plot(array.get(intrabars, 0), title="First")
plot(array.get(intrabars, array.size(intrabars) - 1), title="Last")
`, {
      bars: lowerChartBars,
      engineOptions: { requestDatafeed: lowerTimeframeRequestDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Count').values).toEqual([2, 2, 2]);
    expect(getPlot(result, 'First').values).toEqual([11, 21, 31]);
    expect(getPlot(result, 'Last').values).toEqual([13, 24, 34]);
  });

  it('evaluates lower-timeframe expressions in the requested context', () => {
    const result = runCompatScript(`
indicator("Lower TF expression", timeframe="2")
ranges = request.security_lower_tf(syminfo.tickerid, "1", high - low)
plot(array.get(ranges, 0), title="First Range")
plot(array.get(ranges, 1), title="Second Range")
`, {
      bars: lowerChartBars,
      engineOptions: { requestDatafeed: lowerTimeframeRequestDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'First Range').values).toEqual([3, 5, 3]);
    expect(getPlot(result, 'Second Range').values).toEqual([4, 5, 5]);
  });

  it('passes calc_bars_count to lower-timeframe requests', () => {
    const result = runCompatScript(`
indicator("Lower TF calc bars", timeframe="2")
intrabars = request.security_lower_tf(syminfo.tickerid, "1", close, calc_bars_count=2)
plot(array.size(intrabars), title="Count")
`, {
      bars: lowerChartBars,
      engineOptions: { requestDatafeed: lowerTimeframeRequestDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Count').values).toEqual([0, 0, 2]);
  });

  it('resolves mixed named and positional request.security_lower_tf arguments in Pine order', () => {
    const result = runCompatScript(`
indicator("Mixed Lower TF request", timeframe="2")
intrabars = request.security_lower_tf(symbol=syminfo.tickerid, "1", close, false, na, false, 2)
plot(array.size(intrabars), title="Count")
`, {
      bars: lowerChartBars,
      engineOptions: { requestDatafeed: lowerTimeframeRequestDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Count').values).toEqual([0, 0, 2]);
  });

  it('supports ignore_invalid_symbol for missing lower-timeframe contexts', () => {
    const result = runCompatScript(`
indicator("Lower TF missing", timeframe="2")
missing = request.security_lower_tf("MISSING", "1", close, ignore_invalid_symbol=true)
plot(array.size(missing), title="Missing Count")
`, {
      bars: lowerChartBars,
      engineOptions: { requestDatafeed: lowerTimeframeRequestDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Missing Count').values).toEqual([0, 0, 0]);
  });

  it('reports missing lower-timeframe contexts when ignore_invalid_symbol is false', () => {
    const result = runCompatScript(`
indicator("Lower TF missing error", timeframe="2")
plot(array.size(request.security_lower_tf("MISSING", "1", close)), title="Missing Count")
`, {
      bars: lowerChartBars,
      engineOptions: { requestDatafeed: lowerTimeframeRequestDatafeed() },
    });

    expect(result.errors.map((error) => error.message)).toEqual([
      'request.security_lower_tf failed: No request data context for MISSING 1',
      'request.security_lower_tf failed: No request data context for MISSING 1',
      'request.security_lower_tf failed: No request data context for MISSING 1',
    ]);
  });

  it('rejects equal or higher timeframe requests unless ignore_invalid_timeframe is true', () => {
    const invalid = runCompatScript(`
indicator("Lower TF invalid", timeframe="2")
plot(array.size(request.security_lower_tf(syminfo.tickerid, "2", close)), title="Count")
`, {
      bars: [lowerChartBars[0]!],
      engineOptions: { requestDatafeed: lowerTimeframeRequestDatafeed() },
    });

    const ignored = runCompatScript(`
indicator("Lower TF invalid ignored", timeframe="2")
values = request.security_lower_tf(syminfo.tickerid, "2", close, ignore_invalid_timeframe=true)
plot(array.size(values), title="Count")
`, {
      bars: [lowerChartBars[0]!],
      engineOptions: { requestDatafeed: lowerTimeframeRequestDatafeed() },
    });

    expect(invalid.errors.map((error) => error.message)).toEqual([
      'request.security_lower_tf requires a lower timeframe than the chart timeframe: 2',
    ]);
    expect(ignored.errors).toEqual([]);
    expect(getPlot(ignored, 'Count').values).toEqual([0]);
  });

  it('caps unique request.security_lower_tf contexts', () => {
    const requestPlots = Array.from(
      { length: 41 },
      (_, index) => `plot(array.size(request.security_lower_tf("MISSING${index}", "1", close, ignore_invalid_symbol=true)), title="R${index}")`,
    ).join('\n');
    const result = runCompatScript(`
indicator("Lower TF request cap", timeframe="2")
${requestPlots}
`, {
      bars: [lowerChartBars[0]!],
      engineOptions: { requestDatafeed: lowerTimeframeRequestDatafeed() },
    });

    expect(result.errors.map((error) => error.message)).toEqual([
      'Too many unique request.* contexts: maximum is 40',
    ]);
  });
});

describe('Pine request.currency_rate compatibility', () => {
  it('merges currency rate fixture values by chart time', () => {
    const result = runCompatScript(`
indicator("Currency rate request")
rate = request.currency_rate(currency.USD, "GBP")
plot(rate, title="USDGBP")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: currencyRateDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'USDGBP').values).toEqual([0.8, 0.8, 0.82, 0.82, 0.85, 0.85]);
  });

  it('merges currency rate fixture values deterministically when points are unsorted', () => {
    const datafeed = new InMemoryRequestDatafeed([], [
      {
        family: 'currency_rate',
        key: currencyRateRequestKey('USD', 'GBP'),
        points: [
          { time: 1_700_000_240_000, value: 0.85 },
          { time: 1_700_000_000_000, value: 0.8 },
          { time: 1_700_000_120_000, value: 0.82 },
        ],
      },
    ]);
    const result = runCompatScript(`
indicator("Unsorted currency rate request")
plot(request.currency_rate("USD", "GBP"), title="USDGBP")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: datafeed },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'USDGBP').values).toEqual([0.8, 0.8, 0.82, 0.82, 0.85, 0.85]);
  });

  it('returns one for matching currencies without a request datafeed', () => {
    const result = runCompatScript(`
indicator("Same currency request")
plot(request.currency_rate("USD", currency.USD), title="Same")
`, { bars: [chartBars[0]!] });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Same').values).toEqual([1]);
  });

  it('supports ignore_invalid_currency for missing conversion fixtures', () => {
    const result = runCompatScript(`
indicator("Missing currency request")
plot(request.currency_rate("USD", "EUR", ignore_invalid_currency=true), title="Missing")
`, {
      bars: [chartBars[0]!],
      engineOptions: { requestDatafeed: currencyRateDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Missing').values).toEqual([null]);
  });

  it('reports missing conversion fixtures when ignore_invalid_currency is false', () => {
    const result = runCompatScript(`
indicator("Missing currency request error")
plot(request.currency_rate("USD", "EUR"), title="Missing")
`, {
      bars: [chartBars[0]!],
      engineOptions: { requestDatafeed: currencyRateDatafeed() },
    });

    expect(result.errors.map((error) => error.message)).toEqual([
      'request.currency_rate failed: No request series context for currency_rate USD\u0000EUR',
    ]);
  });

  it('caps unique request.currency_rate contexts', () => {
    const requestPlots = Array.from(
      { length: 41 },
      (_, index) => `plot(request.currency_rate("USD", "C${index}", ignore_invalid_currency=true), title="R${index}")`,
    ).join('\n');
    const result = runCompatScript(`
indicator("Currency request cap")
${requestPlots}
`, {
      bars: [chartBars[0]!],
      engineOptions: { requestDatafeed: currencyRateDatafeed() },
    });

    expect(result.errors.map((error) => error.message)).toEqual([
      'Too many unique request.* contexts: maximum is 40',
    ]);
  });
});

describe('Pine optional request series compatibility', () => {
  it('merges dividends, earnings, splits, financial, and economic series from the request datafeed', () => {
    const result = runCompatScript(`
indicator("Point request families")
dividend = request.dividends("NASDAQ:AAPL", dividends.gross, currency=currency.USD)
earnings = request.earnings("NASDAQ:AAPL", earnings.actual, currency="USD")
split = request.splits("NASDAQ:AAPL", splits.denominator)
revenue = request.financial("NASDAQ:AAPL", "TOTAL_REVENUE", "FQ", currency="USD")
gdp = request.economic("US", "GDP")
plot(dividend, title="Dividend")
plot(earnings, title="Earnings")
plot(split, title="Split")
plot(revenue, title="Revenue")
plot(gdp, title="GDP")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: pointSeriesDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Dividend').values).toEqual([null, null, 0.24, 0.24, 0.25, 0.25]);
    expect(getPlot(result, 'Earnings').values).toEqual([1.5, 1.5, 1.5, 1.5, 1.8, 1.8]);
    expect(getPlot(result, 'Split').values).toEqual([null, null, null, 4, 4, 4]);
    expect(getPlot(result, 'Revenue').values).toEqual([1000, 1000, 1000, 1000, 1100, 1100]);
    expect(getPlot(result, 'GDP').values).toEqual([null, null, 3.1, 3.1, 3.1, 3.1]);
  });

  it('supports gaps_on for sparse point request families', () => {
    const result = runCompatScript(`
indicator("Point request gaps")
dividend = request.dividends("NASDAQ:AAPL", dividends.gross, gaps=barmerge.gaps_on, currency="USD")
plot(dividend, title="Dividend")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: pointSeriesDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Dividend').values).toEqual([null, null, 0.24, null, 0.25, null]);
  });

  it('accepts lookahead_on for sparse corporate action request families', () => {
    const result = runCompatScript(`
indicator("Point request lookahead")
dividend = request.dividends("NASDAQ:AAPL", dividends.gross, lookahead=barmerge.lookahead_on, currency="USD")
earnings = request.earnings("NASDAQ:AAPL", earnings.actual, gaps=barmerge.gaps_on, lookahead=barmerge.lookahead_on, currency="USD")
split = request.splits("NASDAQ:AAPL", splits.denominator, gaps=barmerge.gaps_on, lookahead=barmerge.lookahead_on)
plot(dividend, title="Dividend")
plot(earnings, title="Earnings")
plot(split, title="Split")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: pointSeriesDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Dividend').values).toEqual([null, null, 0.24, 0.24, 0.25, 0.25]);
    expect(getPlot(result, 'Earnings').values).toEqual([1.5, null, null, null, 1.8, null]);
    expect(getPlot(result, 'Split').values).toEqual([null, null, null, 4, null, null]);
  });

  it('supports ignore_invalid_symbol for missing optional request series', () => {
    const result = runCompatScript(`
indicator("Missing optional requests")
dividend = request.dividends("MISSING", dividends.gross, ignore_invalid_symbol=true)
financial = request.financial("MISSING", "TOTAL_REVENUE", "FQ", ignore_invalid_symbol=true)
economic = request.economic("ZZ", "GDP", ignore_invalid_symbol=true)
plot(dividend, title="Dividend")
plot(financial, title="Financial")
plot(economic, title="Economic")
`, {
      bars: [chartBars[0]!],
      engineOptions: { requestDatafeed: pointSeriesDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Dividend').values).toEqual([null]);
    expect(getPlot(result, 'Financial').values).toEqual([null]);
    expect(getPlot(result, 'Economic').values).toEqual([null]);
  });

  it('reports missing optional request series when ignore_invalid_symbol is false', () => {
    const result = runCompatScript(`
indicator("Missing optional request error")
plot(request.economic("ZZ", "GDP"), title="Economic")
`, {
      bars: [chartBars[0]!],
      engineOptions: { requestDatafeed: pointSeriesDatafeed() },
    });

    expect(result.errors.map((error) => error.message)).toEqual([
      'request.economic failed: No request series context for economic ZZ\u0000GDP',
    ]);
  });
});

describe('Pine request.seed compatibility', () => {
  it('evaluates seed expressions in deterministic seed data contexts', () => {
    const result = runCompatScript(`
indicator("Seed request")
seedClose = request.seed("tradingview-pine-seeds/demo", "BTC_DEV", close)
seedAverage = request.seed("tradingview-pine-seeds/demo", "BTC_DEV", ta.sma(close, 2))
plot(seedClose, title="Seed Close")
plot(seedAverage, title="Seed Average")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: seedDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Seed Close').values).toEqual([null, null, 10, 10, 20, 20]);
    expect(getPlot(result, 'Seed Average').values).toEqual([null, null, null, null, 15, 15]);
  });

  it('passes calc_bars_count to request.seed contexts', () => {
    const result = runCompatScript(`
indicator("Seed calc bars")
seedClose = request.seed("tradingview-pine-seeds/demo", "BTC_DEV", close, calc_bars_count=2)
plot(seedClose, title="Seed Close")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: seedDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Seed Close').values).toEqual([null, null, null, null, 20, 20]);
  });

  it('supports ignore_invalid_symbol for missing seed contexts', () => {
    const result = runCompatScript(`
indicator("Seed missing ignored")
missing = request.seed("missing/repo", "MISSING", close, ignore_invalid_symbol=true)
plot(missing, title="Missing")
`, {
      bars: [chartBars[0]!],
      engineOptions: { requestDatafeed: seedDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Missing').values).toEqual([null]);
  });

  it('reports missing seed contexts when ignore_invalid_symbol is false', () => {
    const result = runCompatScript(`
indicator("Seed missing error")
plot(request.seed("missing/repo", "MISSING", close), title="Missing")
`, {
      bars: [chartBars[0]!],
      engineOptions: { requestDatafeed: seedDatafeed() },
    });

    expect(result.errors.map((error) => error.message)).toEqual([
      'request.seed failed: No request data context for seed\u0000missing/repo\u0000MISSING 60',
    ]);
  });
});
