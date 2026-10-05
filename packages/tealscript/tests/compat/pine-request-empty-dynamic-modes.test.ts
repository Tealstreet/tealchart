import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed } from '../../src/runtime/requestDatafeed';
import { getPlot, runCompatScript } from './fixtures';

// Exact verifier-v7y3ux counterexample fixture: 4f22/4e40 both RED before
// original J aliases were merged into 9e523055d5. Distinct chart/request prices.
const start = Date.UTC(2026, 1, 3, 12);
const bar = (index: number, close: number, span = 2) => ({
  time: start + index * span * 60_000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
});
const bars = Array.from({ length: 72 }, (_, i) => bar(i, 100 + i));
const request = Array.from({ length: 24 }, (_, i) => bar(i, 10 + i * 10, 6));
const alt = Array.from({ length: 24 }, (_, i) => bar(i, 1000 + i, 6));

describe('empty nested request context in both dynamic modes', () => {
  it.each([false, true])('normalizes empty aliases without errors, dynamic_requests=%s', (dynamic) => {
    const requestDatafeed = new InMemoryRequestDatafeed([
      { symbol: 'TEST', timeframe: '2', bars },
      { symbol: 'TEST', timeframe: '6', bars: request },
      { symbol: 'ALT', timeframe: '6', bars: alt },
    ]);
    const result = runCompatScript(
      `//@version=6\nindicator("empty context", dynamic_requests=${dynamic})\nplot(request.security("ALT", "6", request.security("", "", close, lookahead=barmerge.lookahead_on), lookahead=barmerge.lookahead_on), title="Result")`,
      {
        bars: bars.slice(0, 12),
        engineOptions: {
          requestDatafeed,
          runtime: { timeframe: { period: '2' }, syminfo: { tickerid: 'TEST', timezone: 'Etc/UTC' } },
        },
      },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Result').values).toEqual(
      dynamic
        ? [1000, 1000, 1000, 1001, 1001, 1001, 1002, 1002, 1002, 1003, 1003, 1003]
        : [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111],
    );
  });
});
