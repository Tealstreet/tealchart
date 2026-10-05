import { expect, it } from 'vitest';

import { InMemoryRequestDatafeed } from '../../src/runtime/requestDatafeed';
import { getPlot, runCompatScript } from './fixtures';

const bars = Array.from({ length: 12 }, (_, i) => ({
  time: i * 120000,
  open: i + 1,
  high: i + 2,
  low: i,
  close: i + 1,
  volume: 100,
}));
const remote = Array.from({ length: 4 }, (_, i) => ({
  time: i * 360000,
  open: 50 + i * 10,
  high: 51 + i * 10,
  low: 49 + i * 10,
  close: 50 + i * 10,
  volume: 300,
}));
const datafeed = new InMemoryRequestDatafeed([{ symbol: 'BINANCE:BTCUSDT', timeframe: '6', bars: remote }]);
for (const persistence of ['', 'var ', 'varip ']) {
  for (const nested of [false, true]) {
    for (const read of [false, true]) {
      it(`requested global UDT field write with ${persistence || 'regular '}storage, nested ${nested}, subsequent read ${read}`, () => {
        const result = runCompatScript(
          `//@version=6
indicator("Requested global UDT")
type Alerts
    bool bos = false
${persistence}Alerts bralert = Alerts.new()
${
  nested
    ? `writeField(bool inner) =>
    if inner
        bralert.bos := true
    close
`
    : ''
}structure(bool inner) =>
    ${nested ? 'writeField(inner)' : 'if inner\n        bralert.bos := true'}
    ${read ? 'seen = bralert.bos' : 'unused = true'}
    close
plot(request.security(syminfo.tickerid, "6", structure(true), lookahead=barmerge.lookahead_on), title="remote")`,
          {
            bars,
            engineOptions: {
              requestDatafeed: datafeed,
              runtime: {
                syminfo: { ticker: 'BTCUSDT', tickerid: 'BINANCE:BTCUSDT', timezone: 'Etc/UTC', mintick: 0.01 },
                timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true },
              },
            },
          },
        );
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'remote').values.at(-1)).toBe(80);
      });
    }
  }
}
