import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { InMemoryRequestDatafeed } from '../../src/runtime/requestDatafeed';

const authority = 'https://www.tradingview.com/pine-script-docs/writing/limitations/#request-calls';

it('reuses fifty identical requests in the documented loop witness', () => {
  const bars = [{ time: 120_000, open: 10, high: 11, low: 9, close: 10, volume: 100 }];
  const datafeed = new InMemoryRequestDatafeed([{ symbol: 'ALT', timeframe: '2', bars }]);
  const result = executeScript(
    parse(`//@version=6
indicator("Identical request reuse")
float total = 0.0
for i = 0 to 49
    total += request.security("ALT", "2", close)
plot(total, "Total")
`),
    bars,
    undefined,
    { requestDatafeed: datafeed, runtime: { timeframe: { period: '2' } } },
  );
  expect(result.errors, authority).toEqual([]);
  expect(result.plots[0]?.values, authority).toEqual([500]);
});
