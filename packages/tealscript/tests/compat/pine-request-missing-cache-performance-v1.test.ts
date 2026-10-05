import type { Bar } from '../../src/runtime';
import type { CompiledBarContext } from '../../src/runtime/codegen/compile';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

// Reference: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json /entries/704–705.
// The cached-bar read bound is an engine regression gate; missing requested values stay missing.
const bars: Bar[] = [1, 2, 3].map((close, index) => ({
  time: 1_700_000_000_000 + index * 120_000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));

function execute(expression: string, lowerTf = false) {
  const compiled = tryCompile(
    parse(`//@version=6
indicator("Missing request cache")
${
  lowerTf
    ? `values = request.security_lower_tf("BTCUSDT", "1", ${expression})
plot(array.size(values), "size")
plot(array.get(values, 0), "value")`
    : `plot(request.security("BTCUSDT", "2", ${expression}), "value")`
}
`),
  );
  expect(compiled.success).toBe(true);
  const child = compiled.securityScripts?.get(0);
  expect(child).toBeDefined();
  if (!child) throw new Error('Missing request script');
  let evaluated = false;
  let retainedBarReads = 0;
  let completedLengthReads = 0;
  let requests = 0;
  const onBar = child.ScriptClass.prototype.onBar;
  child.ScriptClass.prototype.onBar = function (ctx: CompiledBarContext) {
    const result = onBar.call(this, ctx);
    if (ctx.barIndex === ctx.lastBarIndex) evaluated = true;
    return result;
  };
  const requested = lowerTf
    ? Array.from({ length: 6 }, (_, index) => ({ ...bars[0], time: bars[0].time + index * 60_000 }))
    : bars;
  const requestedBars = new Proxy(requested, {
    get(target, key, receiver) {
      if (evaluated && key === 'length') {
        completedLengthReads += 1;
        if (completedLengthReads > 1) retainedBarReads += 1;
      }
      return Reflect.get(target, key, receiver);
    },
  });
  const result = executeCompiled(compiled, bars, undefined, {
    requestDatafeed: {
      getBars(query) {
        requests += 1;
        return { ok: true, context: { symbol: query.symbol, timeframe: query.timeframe, bars: requestedBars } };
      },
    },
    runtime: {
      syminfo: { ticker: 'BTCUSDT', tickerid: 'BTCUSDT', timezone: 'UTC' },
      timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true },
    },
  });
  expect(result?.errors).toEqual([]);
  expect(result?.profile.swallowedErrors ?? []).toEqual([]);
  expect(requests).toBe(1);
  return { retainedBarReads, plots: result?.plots };
}

describe('missing scalar request cache memory', () => {
  it('keeps a missing scalar result without revisiting its requested bars after evaluation', () => {
    const result = execute('close * float(na)');
    expect(result.plots?.[0].values).toEqual([null, null, null]);
    expect(result.retainedBarReads).toBeLessThanOrEqual(1);
  });

  it('retains finite scalar results', () => {
    expect(execute('close').plots?.[0].values).toEqual([1, 2, 3]);
  });

  it('retains the finite bars of a partly missing scalar result', () => {
    expect(execute('bar_index == 0 ? float(na) : close').plots?.[0].values).toEqual([null, 2, 3]);
  });

  it('retains intrabar cardinality for missing lower-timeframe arrays', () => {
    const result = execute('close * float(na)', true);
    expect(result.plots?.find((plot) => plot.title === 'size')?.values).toEqual([2, 2, 2]);
    expect(result.plots?.find((plot) => plot.title === 'value')?.values).toEqual([null, null, null]);
  });
});
