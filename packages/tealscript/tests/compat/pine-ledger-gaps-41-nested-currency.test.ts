import { describe, expect, it } from 'vitest';

import { currencyRateRequestKey, InMemoryRequestDatafeed } from '../../src/runtime';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Rank1610: https://www.tradingview.com/pine-script-reference/v6/ functions[227].
// Nested evaluation: https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/#nested-requests
const source = '//@version=6\nindicator("nested currency", dynamic_requests=true)\nplot(request.currency_rate("USD", "GBP"), "direct")\nplot(request.security("NASDAQ:AAPL", "1", request.currency_rate("USD", "GBP")), "nested")';

describe('currency conversion inside a requested context', () => {
  it('resolves the seeded daily rate from both chart and requested executions', () => {
    const requestDatafeed = new InMemoryRequestDatafeed(
      [{ symbol: 'NASDAQ:AAPL', timeframe: '1', bars: compatibilityBars }],
      [{ family: 'currency_rate', key: currencyRateRequestKey('USD', 'GBP'), points: [{ time: compatibilityBars[0]!.time, value: 1.25 }] }],
    );
    const result = runCompatScript(source, { engineOptions: { requestDatafeed, runtime: { timeframe: { period: '1' } } } });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'direct').values).toEqual(Array(12).fill(1.25));
    expect(getPlot(result, 'nested').values).toEqual(Array(12).fill(1.25));
  });
});
