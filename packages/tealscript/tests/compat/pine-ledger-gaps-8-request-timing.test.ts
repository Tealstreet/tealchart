import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

// Historical lookahead selects first/on or last/off; realtime selects last.
// Zigzag intrabars distinguish the last value from the maximum in each bucket.
// https://www.tradingview.com/pine-script-docs/v5/faq/other-data-and-timeframes/
const start = Date.UTC(2024, 0, 1);
const chart = [0, 1, 2].map((index) => ({ time: start + index * 120_000, open: 100, high: 110, low: 90, close: 101, volume: 100 }));
const requested = [17, 9, 23, 7, 31, 11].map((close, index) => ({ time: start + index * 60_000, open: close, high: close + 1, low: close - 1, close, volume: 100 }));
const source = `//@version=6
indicator("Lower timeframe endpoints")
plot(request.security("ALT", "1", close, lookahead=barmerge.lookahead_on), title="on")
plot(request.security("ALT", "1", close, lookahead=barmerge.lookahead_off), title="off")
plot(barstate.isrealtime ? 1 : 0, title="realtime")
plot(barstate.isconfirmed ? 1 : 0, title="confirmed")`;

describe('ledger gaps 8: lower-timeframe security endpoints', () => {
  it('selects chronological first/on and last/off on historical bars', () => {
    const result = runCompatScript(source, { bars: chart, engineOptions: { runtime: { timeframe: { period: '2' } }, requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'ALT', timeframe: '1', bars: requested }]) } });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'on').values).toEqual([17, 23, 31]);
    expect(getPlot(result, 'off').values).toEqual([9, 7, 11]);
    expect(getPlot(result, 'realtime').values).toEqual([0, 0, 0]);
  });

  it.each([false, true])('selects the latest intrabar when realtime is confirmed=%s', (confirmed) => {
    const result = runCompatScript(source, {
      bars: chart,
      engineOptions: {
        runtime: { timeframe: { period: '2' } },
        requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'ALT', timeframe: '1', bars: requested }]),
        ...(confirmed ? { confirmedRealtimeBarIndex: 2 } : { realtimeLastBar: { isNew: false } }),
      },
    });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'on').values).toEqual([17, 23, 11]);
    expect(getPlot(result, 'off').values).toEqual([9, 7, 11]);
    expect(getPlot(result, 'realtime').values).toEqual([0, 0, 1]);
    expect(getPlot(result, 'confirmed').values).toEqual([1, 1, confirmed ? 1 : 0]);
  });
  it('observes successive documented developing HTF values on an open realtime bar', () => {
    const source = `//@version=6
indicator("Developing HTF value")
plot(request.security("ALT", "4", close, lookahead=barmerge.lookahead_off), title="developing")
plot(barstate.isrealtime ? 1 : 0, title="realtime")`;
    const bars = [0, 1, 2].map((index) => ({ time: start + index * 60_000, open: 100, high: 110, low: 90, close: 101, volume: 100 }));
    for (const provisional of [17, 9]) {
      const result = runCompatScript(source, {
        bars,
        engineOptions: {
          runtime: { timeframe: { period: '1' } },
          realtimeLastBar: { isNew: false },
          requestDatafeed: new InMemoryRequestDatafeed([{
            symbol: 'ALT', timeframe: '4',
            bars: [{ time: start, open: 15, high: 20, low: 8, close: provisional, volume: 100 }],
          }]),
        },
      });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'developing').values).toEqual([null, null, provisional]);
      expect(getPlot(result, 'realtime').values).toEqual([0, 0, 1]);
    }
  });
});
