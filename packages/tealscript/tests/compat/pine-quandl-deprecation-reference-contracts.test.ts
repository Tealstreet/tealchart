import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed, seedQuandlSeries } from '../../src/runtime';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const ticker = 'CFTC/SB_FO_ALL';
const provider = new InMemoryRequestDatafeed([{ symbol: 'TEST', timeframe: 'D', bars: compatibilityBars }], [], [], [], [], [], [
  seedQuandlSeries(ticker, 0, [{ time: compatibilityBars[0]!.time, value: 29 }]),
]);

// fun_request.quandl description[0]: QUANDL requests are deprecated and return a runtime error.
describe('deprecated Quandl requests', () => {
  it.each([false, true])('surfaces an error with a seeded provider=%s', seeded => {
    const result = runCompatScript(`//@version=6\nindicator("Quandl deprecated")\nplot(request.quandl("${ticker}"))`, {
      engineOptions: { requestDatafeed: seeded ? provider : undefined },
    });
    expect(result.errors).toEqual(expect.arrayContaining([expect.objectContaining({ message: expect.stringMatching(/quandl|invalid symbol/i), code: 'runtime.error' })]));
  });
  it('surfaces the deprecated request error inside a requested context', () => {
    const result = runCompatScript(`//@version=6\nindicator("Nested Quandl deprecated")\nvalue = request.security("TEST", "D", request.quandl("${ticker}"))\nplot(value)`, { engineOptions: { requestDatafeed: provider } });
    expect(result.errors).toEqual(expect.arrayContaining([expect.objectContaining({ message: expect.stringMatching(/quandl|invalid symbol/i), code: 'runtime.error' })]));
  });

  it.each([false, true])('continues with na when invalid symbols are ignored, nested=%s', nested => {
    const request = `request.quandl("${ticker}", ignore_invalid_symbol=true)`;
    const expression = nested ? `request.security("TEST", "D", ${request})` : request;
    const result = runCompatScript(`//@version=6\nindicator("Ignore deprecated Quandl")\nplot(na(${expression}) ? 1 : 0, "Missing")`, { engineOptions: { requestDatafeed: provider } });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Missing').values).toEqual(Array(compatibilityBars.length).fill(1));
  });
});
