import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { InMemoryRequestDatafeed } from '../../src/runtime/requestDatafeed';

const authority = 'https://www.tradingview.com/pine-script-docs/writing/limitations/#request-calls';
const bars = [{ time: 120_000, open: 10, high: 11, low: 9, close: 10, volume: 100 }];

function run(count: number) {
  const source = `//@version=6\nindicator("Default context boundary")\n${Array.from({ length: count }, (_, i) => `plot(request.security("S${i}", "2", close), "R${i}")`).join('\n')}`;
  const datafeed = new InMemoryRequestDatafeed(
    Array.from({ length: count }, (_, i) => ({ symbol: `S${i}`, timeframe: '2', bars })),
  );
  return executeScript(parse(source), bars, undefined, {
    requestDatafeed: datafeed,
    runtime: { timeframe: { period: '2' } },
  });
}

describe('Documented default request context boundary', () => {
  it('admits forty distinct contexts with no host entitlement selector', () => {
    const result = run(40);
    expect(result.errors, authority).toEqual([]);
    expect(result.plots).toHaveLength(40);
    expect(
      result.plots.map((plot) => plot.values),
      authority,
    ).toEqual(Array.from({ length: 40 }, () => [10]));
  });

  it('refuses the forty-first distinct context', () => {
    expect(
      run(41).errors.map((error) => error.message),
      authority,
    ).toEqual([
      'Too many unique request.* contexts: maximum is 40 per script. Reuse the same symbol/timeframe/expression request or reduce dynamic symbol and timeframe combinations.',
    ]);
  });
});
