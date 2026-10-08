import type { Bar } from '../../src/runtime';
import type { CompiledBarContext } from '../../src/runtime/codegen/compile';

import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

// Reference: https://www.tradingview.com/pine-script-reference/v6/ /entries/704.
// Dataset metadata reads are a deterministic work gate; the requested vector stays complete.
it.each([
  ['2', 120_000],
  ['5S', 5000],
] as const)('reads %s metadata once while constructing requested close times', (timeframe, duration) => {
  const bars: Bar[] = Array.from({ length: 100 }, (_, index) => ({
    time: 1_700_000_000_000 + index * duration,
    open: index,
    high: index,
    low: index,
    close: index,
    volume: 1,
  }));
  const chartDuration = timeframe === '2' ? 60_000 : 1000;
  const chartBars = Array.from({ length: (100 * duration) / chartDuration }, (_, index) => ({
    ...bars[0],
    time: bars[0].time + index * chartDuration,
  }));
  const expected = chartBars.map((_, index) => {
    const confirmed = Math.floor(((index + 1) * chartDuration) / duration) - 1;
    return confirmed < 0 ? null : confirmed;
  });
  const compiled = tryCompile(
    parse(`//@version=6
indicator("Requested close times")
plot(request.security("BTCUSDT", "${timeframe}", close))
`),
  );
  const child = compiled.securityScripts?.get(0);
  if (!child) throw new Error('Missing request script');
  let evaluated = false;
  let metadataReads = 0;
  const onBar = child.ScriptClass.prototype.onBar;
  child.ScriptClass.prototype.onBar = function (ctx: CompiledBarContext) {
    const value = onBar.call(this, ctx);
    if (ctx.barIndex === ctx.lastBarIndex) evaluated = true;
    return value;
  };
  const result = executeCompiled(compiled, chartBars, undefined, {
    requestDatafeed: {
      getBars(query) {
        return {
          ok: true,
          context: {
            symbol: query.symbol,
            bars,
            get timeframe() {
              if (evaluated) metadataReads++;
              return timeframe;
            },
          },
        };
      },
    },
    runtime: {
      timeframe: {
        period: timeframe === '2' ? '1' : '1S',
        multiplier: 1,
        isminutes: timeframe === '2',
        isseconds: timeframe === '5S',
        isintraday: true,
      },
    },
  });
  expect(result?.errors).toEqual([]);
  expect(result?.plots[0].values).toEqual(expected);
  expect(metadataReads).toBeLessThanOrEqual(4);
});
