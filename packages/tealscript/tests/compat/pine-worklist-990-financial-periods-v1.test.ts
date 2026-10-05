import { expect, it } from 'vitest';

import { financialRequestKey, InMemoryRequestDatafeed } from '../../src/runtime';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

it('rank 990 SYNTHETIC provider preserves four distinct fiscal period keys', () => {
  const periods = ['FQ', 'FH', 'FY', 'TTM'];
  const feed = new InMemoryRequestDatafeed(
    [],
    periods.map((period, i) => ({
      family: 'financial' as const,
      key: financialRequestKey('NASDAQ:AAPL', 'TOTAL_REVENUE', period),
      points: [{ time: compatibilityBars[1]!.time, value: 70 + i }],
    })),
  );
  const result = runCompatScript(
    `//@version=6
indicator("Synthetic fiscal periods")
${periods.map((period) => `plot(request.financial("NASDAQ:AAPL", "TOTAL_REVENUE", "${period}"), "${period}")`).join('\n')}`,
    {
      bars: compatibilityBars.slice(0, 3),
      engineOptions: { requestDatafeed: { getBars: (q) => feed.getBars(q), getSeries: (q) => feed.getSeries(q) } },
    },
  );
  expect(result.errors).toEqual([]);
  periods.forEach((period, i) => expect(getPlot(result, period).values).toEqual([null, 70 + i, 70 + i]));
});
