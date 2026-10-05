import type { RequestCorporateActionQuery } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed } from '../../src/runtime';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('PARTIAL 1031: seeded earnings inside a requested context', () => {
  // Frozen reference function[541] selects ticker/field/currency.
  // Seeded events certify context dispatch; provider release timing stays open.
  for (const nested of [false, true]) {
    it(`${nested ? 'nested' : 'root'} queries the selected ticker, clock and currency`, () => {
      const bars = compatibilityBars.slice(0, 4);
      const requested = nested ? [bars[0]!, bars[2]!] : bars;
      const ticker = nested ? 'NASDAQ:MSFT' : 'NASDAQ:AAPL';
      const queries: RequestCorporateActionQuery[] = [];
      const inner = new InMemoryRequestDatafeed([{ symbol: 'NASDAQ:MSFT', timeframe: '2', bars: requested }]);
      const expression = 'request.earnings(syminfo.tickerid, earnings.estimate, currency=currency.EUR)';
      const result = runCompatScript(
        `//@version=6
indicator("Requested earnings context", dynamic_requests=true)
plot(${nested ? `request.security("NASDAQ:MSFT", "2", ${expression})` : expression}, "Value")`,
        {
          bars,
          engineOptions: {
            runtime: { syminfo: { tickerid: 'NASDAQ:AAPL' }, timeframe: { period: '1' } },
            requestDatafeed: {
              getBars: (query) => inner.getBars(query),
              getCorporateAction: (query) => {
                queries.push({ ...query });
                return {
                  time: query.time,
                  value: {
                    kind: 'earnings',
                    actual: 11,
                    standardized: 29,
                    estimate: query.time === requested[0]!.time ? 73 : 89,
                  },
                };
              },
            },
          },
        },
      );
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Value').values).toHaveLength(4);
      expect(queries).toEqual(requested.map((bar) => ({ kind: 'earnings', ticker, time: bar.time, currency: 'EUR' })));
      if (nested) {
        // HTF publication is a separate security contract; verify provider data reaches the chart.
        expect(getPlot(result, 'Value').values).toContain(73);
      } else {
        expect(getPlot(result, 'Value').values).toEqual([73, 89, 89, 89]);
      }
    });
  }
});
