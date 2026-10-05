import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { InMemoryRequestDatafeed } from '../../src/runtime';
import { executeScript } from '../../src/runtime/compiledOnly';

// Reference: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json
// /entries/704: request.security evaluates its expression in the requested context.
const bars: Bar[] = [1, 2, 3].map((close, index) => ({
  time: 1_700_000_000_000 + index * 120_000,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 100,
}));

describe('nested requested derived parameter dependencies', () => {
  it('retains parameters referenced through a derived local across three requests', () => {
    const ast = parse(`//@version=5
indicator("Nested derived capture")
chain(src, delta, tf) =>
    requested = request.security("BTCUSDT", tf, src)
    shifted = requested + delta
    second = request.security("BTCUSDT", tf, shifted)
    request.security("BTCUSDT", tf, second * 2)
plot(chain(close, 10, "2"))
`);
    const result = executeScript(ast, bars, undefined, {
      requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'BTCUSDT', timeframe: '2', bars }]),
      runtime: {
        syminfo: { ticker: 'BTCUSDT', tickerid: 'BTCUSDT', timezone: 'UTC' },
        timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true },
      },
    });
    expect(result.errors).toEqual([]);
    expect(result.profile.swallowedErrors ?? []).toEqual([]);
    expect(result.plots[0].values).toEqual([22, 24, 26]);
  });
});
