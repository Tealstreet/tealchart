import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed } from '../../src/runtime/requestDatafeed';
import { getPlot, runCompatScript } from './fixtures';

const reference = 'https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/#nested-requests';
const start = Date.UTC(2026, 1, 3, 12);
const bar = (index: number, close: number, minutes: number) => ({
  time: start + index * minutes * 60_000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
});

describe('worklist1744 SYNTHETIC nested expression context', () => {
  // Rejoins P7286 empty-alias context proof; no native/provider timing credit.
  it.each([
    ['empty aliases', '""', '""'],
    ['builtin aliases', 'syminfo.tickerid', 'timeframe.period'],
  ])('%s inherit the enclosing context only with dynamic requests enabled', (_, symbol, timeframe) => {
    const chart = Array.from({ length: 72 }, (_, index) => bar(index, 100 + index, 2));
    const chartHigher = Array.from({ length: 24 }, (_, index) => bar(index, 10 + index * 10, 6));
    const requested = Array.from({ length: 24 }, (_, index) => bar(index, 1000 + index, 6));
    const feed = new InMemoryRequestDatafeed([
      { symbol: 'TEST', timeframe: '2', bars: chart },
      { symbol: 'TEST', timeframe: '6', bars: chartHigher },
      { symbol: 'ALT', timeframe: '6', bars: requested },
    ]);
    const outputs = [false, true].map((dynamic) => {
      const result = runCompatScript(
        `//@version=6
indicator("Synthetic nested aliases", dynamic_requests=${dynamic})
plot(request.security("ALT", "6", request.security(${symbol}, ${timeframe}, close, lookahead=barmerge.lookahead_on), lookahead=barmerge.lookahead_on), "Context")`,
        {
          bars: chart.slice(0, 12),
          engineOptions: {
            requestDatafeed: feed,
            runtime: { timeframe: { period: '2' }, syminfo: { tickerid: 'TEST', timezone: 'Etc/UTC' } },
          },
        },
      );
      expect(result.errors, reference).toEqual([]);
      return getPlot(result, 'Context').values;
    });
    expect(outputs, reference).toEqual([
      [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111],
      [1000, 1000, 1000, 1001, 1001, 1001, 1002, 1002, 1002, 1003, 1003, 1003],
    ]);
  });
});
