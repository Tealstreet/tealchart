import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

// Reference: https://www.tradingview.com/pine-script-reference/v6/ /entries/704.
// Provider datasets are independent of the changing captured expression values.
it('fetches a nested requested dataset once while evaluating changing captures separately', () => {
  const bars = [1, 2, 3].map((close, index) => ({
    time: index * 120_000,
    open: close,
    high: close,
    low: close,
    close,
    volume: 1,
  }));
  const compiled = tryCompile(
    parse(`//@version=6
indicator("Requested datasets")
g(src) => request.security("ALT", "2", src * 2)
f() =>
    value = close + 1
    g(value)
plot(request.security("ALT", "2", f()))
`),
  );
  expect(compiled.success).toBe(true);
  let queries = 0;
  const result = executeCompiled(compiled, bars, undefined, {
    requestDatafeed: {
      getBars(query) {
        queries++;
        return { ok: true, context: { ...query, bars } };
      },
    },
    runtime: { timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true } },
  });
  expect(result?.errors).toEqual([]);
  expect(result?.profile.swallowedErrors ?? []).toEqual([]);
  expect(result?.plots[0].values).toEqual([4, 6, 8]);
  expect(queries).toBe(1);
});

it('binds the complete requested dataset context without merging distinct queries', () => {
  const bars = [1, 2, 3].map((close, index) => ({
    time: index * 120_000,
    open: close,
    high: close,
    low: close,
    close,
    volume: 1,
  }));
  const compiled = tryCompile(
    parse(`//@version=6
indicator("Dataset binding")
plot(request.security("ALT", "2", close, currency="USD", calc_bars_count=1))
plot(request.security("ALT", "2", open, currency="EUR", calc_bars_count=2))
plot(request.security("OTHER", "2", close, currency="USD", calc_bars_count=1))
plot(request.security("ALT", "1", close, currency="USD", calc_bars_count=1))
`),
  );
  expect(compiled.success).toBe(true);
  const queries: unknown[] = [];
  const result = executeCompiled(compiled, bars, undefined, {
    requestDatafeed: {
      getBars(query) {
        queries.push(query);
        return { ok: true, context: { ...query, bars } };
      },
    },
    runtime: { timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true } },
  });
  expect(result?.errors).toEqual([]);
  expect(queries).toEqual([
    { symbol: 'ALT', timeframe: '2', currency: 'USD', calcBarsCount: 1 },
    { symbol: 'ALT', timeframe: '2', currency: 'EUR', calcBarsCount: 2 },
    { symbol: 'OTHER', timeframe: '2', currency: 'USD', calcBarsCount: 1 },
    { symbol: 'ALT', timeframe: '1', currency: 'USD', calcBarsCount: 1 },
  ]);
});

it('retries unavailable datasets instead of caching a provider refusal', () => {
  const bars = [1, 2, 3].map((close, index) => ({
    time: index * 120_000,
    open: close,
    high: close,
    low: close,
    close,
    volume: 1,
  }));
  const compiled = tryCompile(
    parse(`//@version=6
indicator("Dataset retry")
plot(request.security("ALT", "2", close, ignore_invalid_symbol=true))
`),
  );
  expect(compiled.success).toBe(true);
  let queries = 0;
  const result = executeCompiled(compiled, bars, undefined, {
    requestDatafeed: {
      getBars(query) {
        queries++;
        return queries === 1
          ? { ok: false, code: 'invalid_symbol', message: 'Not available yet' }
          : { ok: true, context: { ...query, bars } };
      },
    },
    runtime: { timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true } },
  });
  expect(result?.errors).toEqual([]);
  expect(result?.plots[0].values).toEqual([null, 2, 3]);
  expect(queries).toBe(2);
});

it('reads a fresh provider dataset on each execution', () => {
  const compiled = tryCompile(
    parse(`//@version=6
indicator("Dataset execution")
plot(request.security("ALT", "2", close))
`),
  );
  expect(compiled.success).toBe(true);
  for (const factor of [1, 10]) {
    const bars = [1, 2, 3].map((value, index) => ({
      time: index * 120_000,
      open: value * factor,
      high: value * factor,
      low: value * factor,
      close: value * factor,
      volume: 1,
    }));
    const result = executeCompiled(compiled, bars, undefined, {
      requestDatafeed: {
        getBars(query) {
          return { ok: true, context: { ...query, bars } };
        },
      },
      runtime: { timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true } },
    });
    expect(result?.errors).toEqual([]);
    expect(result?.plots[0].values).toEqual([1, 2, 3].map((value) => value * factor));
  }
});

it('fetches realtime expressions from the current provider instead of reusing historical datasets', () => {
  const bars = [{ time: 0, open: 1, high: 1, low: 1, close: 1, volume: 1 }];
  const compiled = tryCompile(
    parse(`//@version=6
indicator("Realtime dataset", dynamic_requests=false)
plot(request.security("ALT", "2", close))
plot(request.security("ALT", "2", open))
`),
  );
  expect(compiled.success).toBe(true);
  let queries = 0;
  const result = executeCompiled(compiled, bars, undefined, {
    requestDatafeed: {
      getBars(query) {
        queries++;
        return { ok: true, context: { ...query, bars: bars.map((bar) => ({ ...bar, open: bar.open * queries })) } };
      },
    },
    runtime: { timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true } },
    realtimeLastBar: { isNew: true },
  });
  expect(result?.errors).toEqual([]);
  expect(result?.plots[0].values).toEqual([1]);
  expect(result?.plots[1].values).toEqual([2]);
  expect(queries).toBe(2);
});
