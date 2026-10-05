import { expect, it } from 'vitest';

import { InMemoryRequestDatafeed } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const base = 1791156600000;
const cases = [
  [360000, 2, false],
  [360000, 175, false],
  [360000, 346, true],
  [480000, 1, false],
  [480000, 172, false],
  [480000, 351, true],
  [360000, 1, false],
] as const;
const source = `//@version=6
indicator("Requested live phase")
pack() =>
    [time, barstate.isconfirmed ? 1 : 0, barstate.ishistory ? 1 : 0, barstate.isrealtime ? 1 : 0, barstate.isnew ? 1 : 0]
[t, c, h, r, n] = request.security("BINANCE:BTCUSDT", "2", pack())
[ht, hc, hh, hr, hn] = request.security("BINANCE:BTCUSDT", "10", pack())
plot(t, "Time")
plot(c, "Confirmed")
plot(h, "History")
plot(r, "Realtime")
plot(n, "New")
plot(ht, "HTF Time")
plot(hc, "HTF Confirmed")
plot(hh, "HTF History")
plot(hr, "HTF Realtime")
plot(hn, "HTF New")`;

it.each(cases)('v23 clock-only requested phase offset%s count%s closing%s', (offset, count, closing) => {
  const liveTime = base + offset;
  const bar = (time: number) => ({ time, open: 1, high: 1, low: 1, close: 1, volume: 0 });
  const bars = Array.from({ length: offset / 120000 + 1 }, (_, i) => bar(base + i * 120000));
  const feed = new InMemoryRequestDatafeed([
    { symbol: 'BINANCE:BTCUSDT', timeframe: '2', bars },
    { symbol: 'BINANCE:BTCUSDT', timeframe: '10', bars: [bar(base - 600000), bar(base)] },
  ]);
  const phase = closing
    ? { confirmedRealtimeBarIndex: bars.length - 1 }
    : { realtimeLastBar: { isNew: count === 1, previousIsNew: count === 2 } };
  const result = runCompatScript(source, {
    bars,
    engineOptions: {
      requestDatafeed: feed,
      ...phase,
      confirmedRealtimeBarStartIndex: 2,
      runtime: {
        now: liveTime + (closing ? 120000 : 0) + 1480,
        syminfo: { tickerid: 'BINANCE:BTCUSDT', timezone: 'Etc/UTC' },
        timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true },
      },
    },
  });
  expect(result.errors).toEqual([]);
  const value = (title: string) => getPlot(result, title).values.at(-1);
  expect([value('Time'), value('Confirmed'), value('History'), value('Realtime'), value('New')]).toEqual([
    liveTime,
    closing ? 1 : 0,
    0,
    1,
    count <= 2 ? 1 : 0,
  ]);
  expect(value('HTF Time')).toBe(base);
  expect([value('HTF Confirmed'), value('HTF History'), value('HTF Realtime'), value('HTF New')]).toEqual([
    closing && offset === 480000 ? 1 : 0,
    0,
    1,
    0,
  ]);
});
