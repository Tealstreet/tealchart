import type { Bar } from '../../src/runtime';

import { describe, expect, it, vi } from 'vitest';

import { parse } from '../../src/parser';
import { InMemoryRequestDatafeed } from '../../src/runtime';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

// Reference: https://www.tradingview.com/pine-script-reference/v6/
// /entries/704: requested expressions; /entries/511–516: input overloads.
const bars: Bar[] = [1, 2, 3].map((close, index) => ({
  time: 1_700_000_000_000 + index * 120_000,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 100,
}));

function execute(source: string) {
  const compiled = tryCompile(parse(source));
  expect(compiled.success).toBe(true);
  const spies = [...(compiled.sourceScripts?.values() ?? [])]
    .filter((script) => script.generatedCode?.includes('this._g_amount = ctx.input'))
    .map((script) => vi.spyOn(script.ScriptClass.prototype, 'onBar'));
  expect(spies.length).toBeGreaterThan(0);
  try {
    const result = executeCompiled(compiled, bars, undefined, {
      requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'BTCUSDT', timeframe: '2', bars }]),
      runtime: {
        syminfo: { ticker: 'BTCUSDT', tickerid: 'BTCUSDT', timezone: 'UTC' },
        timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true },
      },
    });
    expect(result?.errors).toEqual([]);
    expect(result?.profile.swallowedErrors ?? []).toEqual([]);
    return {
      values: result?.plots[0].values,
      sourceBars: spies.reduce((total, spy) => total + spy.mock.calls.length, 0),
    };
  } finally {
    spies.forEach((spy) => spy.mockRestore());
  }
}

describe('constant input source replay', () => {
  it('preserves requested values without replaying an unchanged numeric default on every request', () => {
    const result = execute(`//@version=5
indicator("Constant input source")
amount = input(10, title="Amount")
chain(src, delta, tf) =>
    requested = request.security("BTCUSDT", tf, src)
    shifted = requested + delta
    second = request.security("BTCUSDT", tf, shifted)
    request.security("BTCUSDT", tf, second * 2)
plot(chain(close, amount, "2"))
`);
    expect(result.values).toEqual([22, 24, 26]);
    expect(result.sourceBars).toBeLessThanOrEqual(bars.length);
  });

  it('retains per-bar defaults for source inputs', () => {
    const result = execute(`//@version=5
indicator("Series input source")
amount = input(close, title="Amount")
chain(src, delta, tf) =>
    requested = request.security("BTCUSDT", tf, src)
    shifted = requested + delta
    second = request.security("BTCUSDT", tf, shifted)
    request.security("BTCUSDT", tf, second * 2)
plot(chain(close, amount, "2"))
`);
    expect(result.values).toEqual([4, 8, 12]);
    expect(result.sourceBars).toBeGreaterThan(0);
  });

  it('projects an uncaptured hlc3 input from each requested bar without replaying its source script', () => {
    const result = execute(`//@version=5
indicator("Requested hlc3 input")
amount = input(hlc3, title="Amount")
chain(src, delta, tf) =>
    requested = request.security("BTCUSDT", tf, src)
    shifted = requested + delta
    second = request.security("BTCUSDT", tf, shifted)
    request.security("BTCUSDT", tf, second * 2)
plot(chain(close, amount, "2"))
`);
    expect(result.values).toEqual([4, 8, 12]);
    expect(result.sourceBars).toBeLessThanOrEqual(bars.length);
  });
});
