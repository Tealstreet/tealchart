import { describe, expect, it } from 'vitest';

import {
  corporateActionRequestKey,
  currencyRateRequestKey,
  economicRequestKey,
  financialRequestKey,
  InMemoryRequestDatafeed,
  requestDatafeedKey,
  requestSeriesKey,
  seedRequestSymbol,
  type Bar,
  type RequestDataContext,
} from '../../src/runtime';

const bars: Bar[] = [
  { time: 1_700_000_000_000, open: 100, high: 110, low: 90, close: 105, volume: 1_000 },
  { time: 1_700_086_400_000, open: 105, high: 115, low: 95, close: 110, volume: 1_100 },
  { time: 1_700_172_800_000, open: 110, high: 120, low: 100, close: 115, volume: 1_200 },
];

describe('request datafeed contract', () => {
  it('builds stable symbol/timeframe keys', () => {
    expect(requestDatafeedKey('BINANCE:BTCUSDT', '1D')).toBe('BINANCE:BTCUSDT\u00001D');
    expect(requestSeriesKey('currency_rate', currencyRateRequestKey('USD', 'GBP'))).toBe('currency_rate\u0000USD\u0000GBP');
    expect(requestSeriesKey('dividends', corporateActionRequestKey('NASDAQ:AAPL', 'dividends.gross', 'USD'))).toBe('dividends\u0000NASDAQ:AAPL\u0000dividends.gross\u0000USD');
    expect(requestSeriesKey('financial', financialRequestKey('NASDAQ:AAPL', 'TOTAL_REVENUE', 'FQ'))).toBe('financial\u0000NASDAQ:AAPL\u0000TOTAL_REVENUE\u0000FQ\u0000');
    expect(requestSeriesKey('economic', economicRequestKey('US', 'GDP'))).toBe('economic\u0000US\u0000GDP');
    expect(requestDatafeedKey(seedRequestSymbol('user/repo', 'BTC_DEV'), '1D')).toBe('seed\u0000user/repo\u0000BTC_DEV\u00001D');
  });

  it('returns cloned bars for deterministic request fixtures', () => {
    const context: RequestDataContext = {
      symbol: 'BINANCE:BTCUSDT',
      timeframe: '1D',
      bars,
      currency: 'USDT',
      syminfo: { ticker: 'BTCUSDT', timezone: 'Etc/UTC' },
    };
    const datafeed = new InMemoryRequestDatafeed([context]);
    const result = datafeed.getBars({ symbol: 'BINANCE:BTCUSDT', timeframe: '1D', calcBarsCount: 2 });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(result.context.bars).toEqual(bars.slice(1));
    expect(result.context.bars).not.toBe(bars);

    result.context.bars[0].close = 999;
    const second = datafeed.getBars({ symbol: 'BINANCE:BTCUSDT', timeframe: '1D' });
    expect(second.ok).toBe(true);
    if (!second.ok) throw new Error(second.message);
    expect(second.context.bars[1].close).toBe(110);
  });

  it('normalizes non-positive calc bars count to an empty window', () => {
    const datafeed = new InMemoryRequestDatafeed([
      { symbol: 'BINANCE:BTCUSDT', timeframe: '1D', bars },
    ]);

    const zero = datafeed.getBars({ symbol: 'BINANCE:BTCUSDT', timeframe: '1D', calcBarsCount: 0 });
    const negative = datafeed.getBars({ symbol: 'BINANCE:BTCUSDT', timeframe: '1D', calcBarsCount: -1 });
    const infinity = datafeed.getBars({ symbol: 'BINANCE:BTCUSDT', timeframe: '1D', calcBarsCount: Infinity });

    expect(zero.ok).toBe(true);
    expect(negative.ok).toBe(true);
    expect(infinity.ok).toBe(true);
    if (!zero.ok || !negative.ok || !infinity.ok) throw new Error('expected fixture contexts');
    expect(zero.context.bars).toEqual([]);
    expect(negative.context.bars).toEqual([]);
    expect(infinity.context.bars).toEqual([]);
  });

  it('reports missing request contexts without throwing', () => {
    const datafeed = new InMemoryRequestDatafeed();
    const result = datafeed.getBars({ symbol: 'BINANCE:ETHUSDT', timeframe: '240' });

    expect(result).toEqual({
      ok: false,
      code: 'missing_context',
      message: 'No request data context for BINANCE:ETHUSDT 240',
    });
  });

  it('echoes requested currency routing metadata when provided', () => {
    const datafeed = new InMemoryRequestDatafeed([
      { symbol: 'NASDAQ:AAPL', timeframe: '1D', bars, currency: 'USD' },
    ]);
    const result = datafeed.getBars({ symbol: 'NASDAQ:AAPL', timeframe: '1D', currency: 'EUR' });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(result.context.currency).toBe('EUR');
  });

  it('derives Heikin-Ashi fixture bars from a matching base context', () => {
    const datafeed = new InMemoryRequestDatafeed([
      { symbol: 'NASDAQ:AAPL|session=extended', timeframe: '1D', bars },
    ]);
    const result = datafeed.getBars({ symbol: 'NASDAQ:AAPL|session=extended|chart=heikinashi', timeframe: '1D' });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(result.context.symbol).toBe('NASDAQ:AAPL|session=extended|chart=heikinashi');
    expect(result.context.bars).toEqual([
      { time: 1_700_000_000_000, open: 102.5, high: 110, low: 90, close: 101.25, volume: 1_000 },
      { time: 1_700_086_400_000, open: 101.875, high: 115, low: 95, close: 106.25, volume: 1_100 },
      { time: 1_700_172_800_000, open: 104.0625, high: 120, low: 100, close: 111.25, volume: 1_200 },
    ]);
  });

  it('returns cloned request series fixture points', () => {
    const datafeed = new InMemoryRequestDatafeed([], [
      {
        family: 'currency_rate',
        key: currencyRateRequestKey('USD', 'GBP'),
        points: [
          { time: 1_700_000_000_000, value: 0.8 },
          { time: 1_700_086_400_000, value: 0.82 },
        ],
      },
    ]);
    const result = datafeed.getSeries?.({ family: 'currency_rate', key: currencyRateRequestKey('USD', 'GBP') });

    expect(result?.ok).toBe(true);
    if (!result?.ok) throw new Error(result?.message ?? 'expected series context');
    expect(result.context.points).toEqual([
      { time: 1_700_000_000_000, value: 0.8 },
      { time: 1_700_086_400_000, value: 0.82 },
    ]);

    result.context.points[0].value = 9;
    const second = datafeed.getSeries?.({ family: 'currency_rate', key: currencyRateRequestKey('USD', 'GBP') });
    expect(second?.ok).toBe(true);
    if (!second?.ok) throw new Error(second?.message ?? 'expected series context');
    expect(second.context.points[0].value).toBe(0.8);
  });
});
