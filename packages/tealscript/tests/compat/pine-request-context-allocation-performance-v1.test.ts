import type { Bar } from '../../src/runtime';
import type { CompiledBarContext } from '../../src/runtime/codegen/compile';

import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { InMemoryRequestDatafeed } from '../../src/runtime';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

// Reference: https://www.tradingview.com/pine-script-reference/v6/ /entries/704.
// Callback reuse is a deterministic allocation gate; requested bar values remain distinct.
it('reuses requested callbacks while advancing bar values and timestamps', () => {
  const bars: Bar[] = [1, 2, 3].map((close, index) => ({
    time: 1_700_000_000_000 + index * 120_000,
    open: close,
    high: close,
    low: close,
    close,
    volume: 1,
  }));
  const compiled = tryCompile(
    parse(`//@version=6
indicator("Requested contexts")
plot(request.security("BTCUSDT", "2", close + bar_index))
`),
  );
  const child = compiled.securityScripts?.get(0);
  if (!child) throw new Error('Missing request script');
  const callbacks = new Set<unknown>();
  const observed: unknown[] = [];
  const onBar = child.ScriptClass.prototype.onBar;
  child.ScriptClass.prototype.onBar = function (ctx: CompiledBarContext) {
    callbacks.add(ctx.mathCall);
    observed.push([ctx.barIndex, ctx.bar.close, ctx.bar.time, ctx.barstate.isfirst, ctx.barstate.islast]);
    return onBar.call(this, ctx);
  };
  const result = executeCompiled(compiled, bars, undefined, {
    requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'BTCUSDT', timeframe: '2', bars }]),
    runtime: { timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true } },
  });
  expect(result?.errors).toEqual([]);
  expect(result?.plots[0].values).toEqual([1, 3, 5]);
  expect(observed).toEqual(bars.map((bar, index) => [index, bar.close, bar.time, index === 0, index === 2]));
  expect(callbacks.size).toBe(1);
});
