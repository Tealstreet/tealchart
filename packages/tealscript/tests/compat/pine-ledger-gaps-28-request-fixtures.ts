import type { RequestCorporateActionQuery, RequestDatafeed } from '../../src/runtime';

export const bars = Array.from({ length: 3 }, (_, i) => ({
  time: 1700000000000 + i * 60000,
  open: 1,
  high: 2,
  low: 0,
  close: 1,
  volume: 10,
}));
export function provider() {
  const queries: RequestCorporateActionQuery[] = [];
  const feed: RequestDatafeed = {
    getBars: (query) => ({
      ok: true,
      context: {
        symbol: query.symbol,
        timeframe: query.timeframe,
        bars,
        syminfo: { ticker: query.symbol, tickerid: query.symbol, currency: 'USD', timezone: 'Etc/UTC' },
      },
    }),
    getCorporateAction: (query) => {
      queries.push({ ...query });
      return {
        time: bars[0]!.time,
        value: {
          kind: 'dividends',
          gross: query.ticker === 'NASDAQ:OUTER' ? 7 : 3,
          net: query.ticker === 'NASDAQ:OUTER' ? 5 : 2,
        },
      };
    },
  };
  return { queries, feed };
}
