import type { RequestSeriesQuery, RequestSeriesResult } from '../../src/runtime/requestDatafeed';

import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed } from '../../src/runtime';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

class InvalidCurrencyDatafeed extends InMemoryRequestDatafeed {
  invalidResponses = 0;

  override getSeries(query: RequestSeriesQuery): RequestSeriesResult {
    if (query.family !== 'currency_rate') return super.getSeries(query);
    this.invalidResponses += 1;
    return { ok: false, code: 'invalid_currency', message: 'Conversion unavailable for USD/ZZZ' };
  }
}

// Authority: https://www.tradingview.com/pine-script-reference/v6/ entries[703].params[2] (ignore_invalid_currency).
// Explicit provider failure distinguishes this contract from an unseeded host fixture.
describe('documented invalid currency response', () => {
  for (const nested of [false, true]) {
    it.each([
      { policy: 'omitted', argument: '', ignored: false },
      { policy: 'false', argument: ', ignore_invalid_currency=false', ignored: false },
      { policy: 'true', argument: ', ignore_invalid_currency=true', ignored: true },
    ])(`${nested ? 'nested' : 'direct'} $policy policy halts or continues as documented`, ({ argument, ignored }) => {
      const datafeed = new InvalidCurrencyDatafeed([
        { symbol: 'NASDAQ:AAPL', timeframe: '1', bars: compatibilityBars },
      ]);
      const currency = `request.currency_rate("USD", "ZZZ"${argument})`;
      const expression = nested ? `request.security("NASDAQ:AAPL", "1", ${currency})` : currency;
      const result = runCompatScript(
        `//@version=6\nindicator("invalid currency", dynamic_requests=true)\nplot(${expression}, "rate")\nplot(99, "after")`,
        {
          engineOptions: { requestDatafeed: datafeed, runtime: { timeframe: { period: '1' } } },
        },
      );
      expect(datafeed.invalidResponses).toBeGreaterThan(0);
      if (ignored) {
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'rate').values).toEqual(Array(12).fill(null));
        expect(getPlot(result, 'after').values).toEqual(Array(12).fill(99));
      } else {
        expect(result.errors.some((error) => error.message.includes('USD/ZZZ'))).toBe(true);
        expect(
          result.plots.flatMap((plot) => plot.values).some((value) => value !== null && Number.isFinite(value)),
        ).toBe(false);
      }
    });
  }
});
