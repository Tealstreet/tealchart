import { describe, expect, it } from 'vitest';

import type { RequestDatafeed, RequestDatafeedQuery } from '../../src/runtime/requestDatafeed';
import { getPlot, runCompatScript } from './fixtures';

// Reference currency contract: price values convert; numeric literal200 does not.
// The provider returns independently specified prices for each target currency.
// https://www.tradingview.com/pine-script-reference/v6/#fun_request.security
const start = Date.UTC(2024, 0, 1);
const chart = [0, 1, 2].map((index) => ({ time: start + index * 120_000, open: 100, high: 110, low: 90, close: 101, volume: 100 }));
const closes = { USD: [10, 30, 20, 11, 15, 12], EUR: [20, 60, 40, 22, 30, 24] };

function provider(): RequestDatafeed {
  return {
    getBars(query: RequestDatafeedQuery) {
      const values = query.currency === 'EUR' ? closes.EUR : closes.USD;
      return {
        ok: true,
        context: {
          symbol: query.symbol, timeframe: query.timeframe, currency: query.currency,
          bars: values.map((close, index) => ({ time: start + index * 60_000, open: close, high: close + 1, low: close - 1, close, volume: 100 })),
        },
      };
    },
  };
}

describe('ledger gaps 8: request currency literal units', () => {
  it('keeps tuple literals unchanged while security receives converted prices', () => {
    const result = runCompatScript(`//@version=6
indicator("Security currency literals")
[usdPrice, usdLiteral] = request.security("ALT", "1", [close, 200], currency="USD")
[eurPrice, eurLiteral] = request.security("ALT", "1", [close, 200], currency="EUR")
plot(usdPrice, title="USD")
plot(eurPrice, title="EUR")
plot(usdLiteral, title="USD literal")
plot(eurLiteral, title="EUR literal")`, { bars: chart, engineOptions: { runtime: { timeframe: { period: '2' } }, requestDatafeed: provider() } });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'USD').values).toEqual([30, 11, 12]);
    expect(getPlot(result, 'EUR').values).toEqual([60, 22, 24]);
    expect(getPlot(result, 'USD literal').values).toEqual([200, 200, 200]);
    expect(getPlot(result, 'EUR literal').values).toEqual([200, 200, 200]);
  });

  it('keeps lower_tf tuple literals unchanged alongside converted intrabar prices', () => {
    const result = runCompatScript(`//@version=6
indicator("Intrabar currency literals")
[usdPrices, usdLiterals] = request.security_lower_tf("ALT", "1", [close, 200], currency="USD")
[eurPrices, eurLiterals] = request.security_lower_tf("ALT", "1", [close, 200], currency="EUR")
plot(array.sum(usdPrices), title="USD")
plot(array.sum(eurPrices), title="EUR")
plot(array.sum(usdLiterals), title="USD literal")
plot(array.sum(eurLiterals), title="EUR literal")`, { bars: chart, engineOptions: { runtime: { timeframe: { period: '2' } }, requestDatafeed: provider() } });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'USD').values).toEqual([40, 31, 27]);
    expect(getPlot(result, 'EUR').values).toEqual([80, 62, 54]);
    expect(getPlot(result, 'USD literal').values).toEqual([400, 400, 400]);
    expect(getPlot(result, 'EUR literal').values).toEqual([400, 400, 400]);
  });
});
