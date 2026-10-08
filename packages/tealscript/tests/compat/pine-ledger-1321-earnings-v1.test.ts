import { expect, it } from 'vitest';

import { corporateActionRequestKey, InMemoryRequestDatafeed } from '../../src/runtime';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Ranks1338/1339; https://www.tradingview.com/pine-script-reference/v6/, constants206.
it('earnings.estimate selects the estimated earnings field', () => {
  const datafeed = new InMemoryRequestDatafeed([], ['estimate', 'actual'].map((field) => ({
    family: 'earnings' as const,
    key: corporateActionRequestKey('NASDAQ:AAPL', `earnings.${field}`, 'USD'),
    points: [{ time: compatibilityBars[0]!.time, value: field === 'estimate' ? 42 : 7 }],
  })));
  const result = runCompatScript(`//@version=6
indicator("Estimated earnings selector")
plot(request.earnings("NASDAQ:AAPL", earnings.estimate, currency="USD"), title="Estimate")
plot(request.earnings("NASDAQ:AAPL", earnings.actual, currency="USD"), title="Actual")
`, { engineOptions: { requestDatafeed: datafeed } });
  expect(result.errors).toEqual([]);
  expect(getPlot(result, 'Estimate').values[0]).toBe(42);
  expect(getPlot(result, 'Actual').values[0]).toBe(7);
});
