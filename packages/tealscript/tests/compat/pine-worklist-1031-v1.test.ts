import type { RequestCorporateActionQuery } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed } from '../../src/runtime';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const reference = 'https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/#nested-requests';

describe('worklist1031 SYNTHETIC nested earnings callback contract', () => {
  // Frozen reference request.earnings[541]: ticker, field and currency.
  // SYNTHETIC provider events give no native release-time or remote-value credit.
  it.each([
    ['earnings.actual', 'currency.EUR', 'EUR', 11],
    ['earnings.standardized', 'currency.GBP', 'GBP', 29],
  ] as const)(
    'inherits requested ticker and clock while selecting %s in %s',
    (field, currencyExpression, currency, value) => {
      const bars = compatibilityBars.slice(0, 4);
      const requested = [bars[0]!, bars[2]!];
      const queries: RequestCorporateActionQuery[] = [];
      const feed = new InMemoryRequestDatafeed([{ symbol: 'NASDAQ:MSFT', timeframe: '2', bars: requested }]);
      const result = runCompatScript(
        `//@version=6
indicator("Synthetic nested earnings", dynamic_requests=true)
plot(request.security("NASDAQ:MSFT", "2", request.earnings(syminfo.tickerid, ${field}, currency=${currencyExpression})), "Earnings")`,
        {
          bars,
          engineOptions: {
            runtime: { syminfo: { tickerid: 'NASDAQ:AAPL' }, timeframe: { period: '1' } },
            requestDatafeed: {
              getBars: (query) => feed.getBars(query),
              getCorporateAction: (query) => {
                queries.push({ ...query });
                return { time: query.time, value: { kind: 'earnings', actual: 11, standardized: 29, estimate: 73 } };
              },
            },
          },
        },
      );
      expect(result.errors, reference).toEqual([]);
      expect(queries, reference).toEqual(
        requested.map((bar) => ({ kind: 'earnings', ticker: 'NASDAQ:MSFT', time: bar.time, currency })),
      );
      expect(getPlot(result, 'Earnings').values, reference).toHaveLength(bars.length);
      expect(getPlot(result, 'Earnings').values, reference).toContain(value);
    },
  );
});
