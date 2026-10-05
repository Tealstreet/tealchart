import { expect, it } from 'vitest';

import { financialRequestKey, InMemoryRequestDatafeed } from '../../src/runtime';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

it('rank 991 SYNTHETIC provider timestamps align without future leakage', () => {
  const bars = compatibilityBars.slice(0, 5);
  const feed = new InMemoryRequestDatafeed(
    [],
    [
      {
        family: 'financial',
        key: financialRequestKey('NASDAQ:AAPL', 'TOTAL_REVENUE', 'FQ'),
        points: [
          { time: bars[1]!.time, value: 73 },
          { time: bars[3]!.time, value: 89 },
        ],
      },
    ],
  );
  const result = runCompatScript(
    `//@version=6
indicator("Synthetic financial timestamp alignment")
plot(request.financial("NASDAQ:AAPL", "TOTAL_REVENUE", "FQ", gaps=barmerge.gaps_off), "Carry")
plot(request.financial("NASDAQ:AAPL", "TOTAL_REVENUE", "FQ", gaps=barmerge.gaps_on), "Sparse")`,
    {
      bars,
      engineOptions: { requestDatafeed: { getBars: (q) => feed.getBars(q), getSeries: (q) => feed.getSeries(q) } },
    },
  );
  expect(result.errors).toEqual([]);
  expect(getPlot(result, 'Carry').values).toEqual([null, 73, 73, 89, 89]);
  expect(getPlot(result, 'Sparse').values).toEqual([null, 73, null, 89, null]);
});
