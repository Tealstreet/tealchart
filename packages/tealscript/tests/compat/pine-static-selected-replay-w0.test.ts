import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const start = Date.UTC(2026, 0, 1);
const bar = (time: number, close: number): Bar => ({
  time,
  close,
  open: close,
  high: close + 1,
  low: close - 1,
  volume: 1,
});
describe('Static selected overload replay', () => {
  for (const reversed of [false, true]) {
    it(`replays selected pure overload, reversed=${reversed}`, () => {
      const declarations = [
        'sample(float value) => value',
        'sample(int value) => request.security("REMOTE", "1D", close)',
      ];
      if (reversed) declarations.reverse();
      const result = runCompatScript(
        `//@version=6
indicator("Static replay", dynamic_requests=false)
${declarations.join('\n')}
float selected = sample(close)
plot(selected, title="Chart")
plot(request.security("REMOTE", "1D", close, lookahead=barmerge.lookahead_on), title="Feed")
plot(request.security("REMOTE", "1D", selected, lookahead=barmerge.lookahead_on), title="Result")`,
        {
          bars: [3, 4, 5].map((close, index) => bar(start + index * 60000, close)),
          engineOptions: {
            runtime: { timeframe: { period: '1' }, syminfo: { tickerid: 'CHART', timezone: 'Etc/UTC' } },
            requestDatafeed: new InMemoryRequestDatafeed([
              {
                symbol: 'REMOTE',
                timeframe: '1D',
                bars: [41, 42].map((close, index) => bar(start + index * 86400000, close)),
              },
            ]),
          },
        },
      );
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Chart').values).toEqual([3, 4, 5]);
      expect(getPlot(result, 'Feed').values).toEqual([41, 41, 41]);
      expect(getPlot(result, 'Result').values).toEqual([41, 41, 41]);
    });
  }
});
