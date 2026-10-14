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
describe('Selected traversal controls', () => {
  for (const mode of ['pure', 'transitive', 'selected-request', 'dynamic']) {
    it(mode, () => {
      const definitions =
        mode === 'pure'
          ? 'sample(float value) => value'
          : mode === 'transitive'
            ? 'leaf(float value) => value\nleaf(int value) => request.security("REMOTE", "1D", close, lookahead=barmerge.lookahead_on)\nsample(float value) => leaf(value)'
            : mode === 'selected-request'
              ? 'sample(float value) => request.security("REMOTE", "1D", close, lookahead=barmerge.lookahead_on)\nsample(int value) => value'
              : 'sample(float value) => value\nsample(int value) => request.security("REMOTE", "1D", close, lookahead=barmerge.lookahead_on)';
      const result = runCompatScript(
        `//@version=6
indicator("Controls", dynamic_requests=${mode === 'dynamic'})
${definitions}
float selected = sample(close)
plot(selected, title="Chart")
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
      expect(getPlot(result, 'Result').values).toEqual([41, 41, 41]);
      if (mode !== 'selected-request') expect(getPlot(result, 'Chart').values).toEqual([3, 4, 5]);
    });
  }
});
