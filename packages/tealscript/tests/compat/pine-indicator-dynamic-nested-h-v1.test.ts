import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const chartBars = [1, 2, 3].map((index) => ({
  time: index * 120_000, open: index, high: index + 1, low: index - 1, close: index, volume: 100,
}));

function nestedValues(version: number, option: string, setup = '') {
  const datafeed = new InMemoryRequestDatafeed([
    {
      symbol: 'BTCUSDT', timeframe: '2',
      bars: chartBars.map((bar, index) => ({ ...bar, close: (index + 1) * 10 })),
      syminfo: { tickerid: 'BTCUSDT', ticker: 'BTCUSDT', timezone: 'Etc/UTC' },
    },
    {
      symbol: 'NASDAQ:AAPL', timeframe: '2',
      bars: chartBars.map((bar, index) => ({ ...bar, close: 101 + index })),
      syminfo: { tickerid: 'NASDAQ:AAPL', ticker: 'AAPL', timezone: 'America/New_York' },
    },
  ]);
  const result = runCompatScript(`//@version=${version}
${setup}indicator("Nested dynamic option", dynamic_requests=${option})
plot(request.security("NASDAQ:AAPL", "2",
    request.security(syminfo.tickerid, "2", close, lookahead=barmerge.lookahead_on),
    lookahead=barmerge.lookahead_on), "Nested")`, {
    bars: chartBars,
    engineOptions: {
      requestDatafeed: datafeed,
      runtime: { syminfo: { tickerid: 'BTCUSDT', ticker: 'BTCUSDT' }, timeframe: { period: '2' } },
    },
  });
  expect(result.errors).toEqual([]);
  return { values: getPlot(result, 'Nested').values, dynamicRequests: result.declaration.dynamicRequests };
}

describe('indicator dynamic option expressions retain nested-request context', () => {
  for (const version of [5, 6]) {
    const enabled = version === 5;
    const expected = enabled ? [101, 102, 103] : [10, 20, 30];
    it(`v${version} honors a constant negation in nested requests`, () => {
      expect(nestedValues(version, `not ${!enabled}`)).toEqual({ values: expected, dynamicRequests: enabled });
    });
    it(`v${version} honors a constant alias in nested requests`, () => {
      expect(nestedValues(version, 'DYNAMIC', `const bool DYNAMIC = ${enabled}\n`))
        .toEqual({ values: expected, dynamicRequests: enabled });
    });
    it.each([false, true])(`v${version} preserves nested requests with literal %s`, (literal) => {
      expect(nestedValues(version, String(literal)))
        .toEqual({ values: literal ? [101, 102, 103] : [10, 20, 30], dynamicRequests: literal });
    });
  }
});
