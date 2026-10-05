import type { CompiledBarContext } from '../../src/runtime/codegen/compile';

import { expect, it, vi } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

const bars = Array.from({ length: 12 }, (_, index) => ({
  time: index * 120_000,
  open: index + 1,
  high: index + 1,
  low: index + 1,
  close: index + 1,
  volume: 1,
}));
const runtime = { timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true } };

function compile(body: string) {
  const compiled = tryCompile(
    parse(`//@version=6
indicator("Dispatch metadata")
${body}`),
  );
  expect(compiled.success).toBe(true);
  return compiled;
}

it('reuses dispatch normalization across alternating symbols at one request site', () => {
  const compiled = compile(`f(symbol) => request.security(symbol, "2", close)
value = 0.0
for i = 0 to 7
    value += f("ALT" + str.tostring(i))
plot(value)`);
  const stringify = JSON.stringify;
  let expressionKeys = 0;
  const spy = vi.spyOn(JSON, 'stringify').mockImplementation((...args: Parameters<typeof stringify>) => {
    if (Array.isArray(args[0]) && args[0].length === 6 && args[0][0] === 'expression:0') expressionKeys++;
    return stringify(...args);
  });
  let result;
  try {
    result = executeCompiled(compiled, bars, undefined, {
      runtime,
      requestDatafeed: { getBars: (query) => ({ ok: true, context: { ...query, bars } }) },
    });
  } finally {
    spy.mockRestore();
  }
  expect(result?.errors).toEqual([]);
  expect(result?.plots[0].values).toEqual(bars.map((bar) => bar.close * 8));
  expect(expressionKeys).toBe(8);
});

it('still refuses the forty-first context before querying its provider', () => {
  const compiled = compile(`f(symbol) => request.security(symbol, "2", close)
for i = 0 to 40
    f("ALT" + str.tostring(i))
plot(close)`);
  const queried: string[] = [];
  const result = executeCompiled(compiled, bars, undefined, {
    runtime,
    requestDatafeed: {
      getBars(query) {
        queried.push(query.symbol);
        return { ok: true, context: { ...query, bars } };
      },
    },
  });
  expect(queried).toEqual(Array.from({ length: 40 }, (_, index) => `ALT${index}`));
  expect(result?.errors.map((error) => error.message)).toEqual([
    'Too many unique request.* contexts: maximum is 40 per script. Reuse the same symbol/timeframe/expression request or reduce dynamic symbol and timeframe combinations.',
  ]);
});

it('separates timeframe and expression values for the same symbol', () => {
  const compiled = compile(`f(tf) => request.security("ALT", tf, close)
g(tf) => request.security("ALT", tf, close * 10)
plot(f("2"))
plot(f("4"))
plot(g("2"))
plot(g("4"))`);
  const queried: string[] = [];
  const result = executeCompiled(compiled, bars, undefined, {
    runtime,
    requestDatafeed: {
      getBars(query) {
        queried.push(query.timeframe);
        return {
          ok: true,
          context: {
            ...query,
            bars: bars.map((bar) => ({ ...bar, close: query.timeframe === '4' ? bar.close * 2 : bar.close })),
          },
        };
      },
    },
  });
  expect(result?.errors).toEqual([]);
  expect(result?.plots[0].values).toEqual(bars.map((bar) => bar.close));
  expect(result?.plots[2].values).toEqual(bars.map((bar) => bar.close * 10));
  expect(result?.plots[1].values).not.toEqual(result?.plots[0].values);
  expect(result?.plots[3].values).toEqual(
    result?.plots[1].values.map((value) => (value === null ? null : Number(value) * 10)),
  );
  expect(queried).toEqual(['2', '4']);
});

it('retains per-call provider refusal timing while symbols alternate', () => {
  const compiled = compile(`f(symbol) => request.security(symbol, "2", close)
plot(f("MISSING"))
plot(f("ALT"))`);
  const queried: string[] = [];
  const result = executeCompiled(compiled, bars, undefined, {
    runtime,
    requestDatafeed: {
      getBars(query) {
        queried.push(query.symbol);
        return query.symbol === 'MISSING'
          ? { ok: false, code: 'invalid_symbol', message: 'missing context' }
          : { ok: true, context: { ...query, bars } };
      },
    },
  });
  expect(result?.errors.map((error) => error.message)).toEqual(
    bars.map(() => 'request.security failed: missing context'),
  );
  expect(queried).toEqual(['MISSING', 'ALT', ...bars.slice(1).map(() => 'MISSING')]);
  expect(result?.plots[0].values).toEqual(bars.map(() => null));
  expect(result?.plots[1].values).toEqual(bars.map((bar) => bar.close));
});

it('keeps changing expression captures independent across alternating symbols', () => {
  const compiled = compile(`f(symbol, value) => request.security(symbol, "2", value)
plot(f("ALT", close * 2))
plot(f("OTHER", close * 3))`);
  const result = executeCompiled(compiled, bars, undefined, {
    runtime,
    requestDatafeed: { getBars: (query) => ({ ok: true, context: { ...query, bars } }) },
  });
  expect(result?.errors).toEqual([]);
  expect(result?.plots.map((plot) => plot.values)).toEqual(
    [2, 3].map((factor) => bars.map((bar) => bar.close * factor)),
  );
});

it('preserves object-option coercion when a cached primitive call intervenes', () => {
  const compiled = compile('plot(request.security("ALT", "2", close))');
  const onBar = compiled.ScriptClass.prototype.onBar;
  let conversions = 0;
  const timeframe = {
    toString() {
      conversions++;
      return '2';
    },
  };
  compiled.ScriptClass.prototype.onBar = function (ctx: CompiledBarContext) {
    const request = (symbol: string, tf: unknown) =>
      ctx.requestSecurity(0, symbol, tf, 'barmerge.gaps_off', 'barmerge.lookahead_off', false, undefined, undefined);
    request('OTHER', '2');
    request('ALT', timeframe);
    request('OTHER', '2');
    request('ALT', timeframe);
    onBar.call(this, ctx);
  };
  const result = executeCompiled(compiled, bars, undefined, {
    runtime,
    requestDatafeed: { getBars: (query) => ({ ok: true, context: { ...query, bars } }) },
  });
  expect(result?.errors).toEqual([]);
  expect(result?.plots[0].values).toEqual(bars.map((bar) => bar.close));
  expect(conversions).toBe(bars.length * 2);
});
