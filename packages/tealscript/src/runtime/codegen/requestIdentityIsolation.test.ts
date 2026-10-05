import { expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeCompiled, tryCompile } from './execute';

it('keeps equal-data requests with different expressions or lookahead independent', () => {
  const bars = [1, 2, 3, 4].map((close, i) => ({
    time: i * 60_000,
    open: close,
    high: close + 10,
    low: close,
    close,
    volume: 1,
  }));
  const compiled = tryCompile(
    parse(`//@version=6
indicator("requested identities")
plot(request.security("OTHER", "1", close, lookahead=barmerge.lookahead_off))
plot(request.security("OTHER", "1", close, lookahead=barmerge.lookahead_on))
plot(request.security("OTHER", "1", high, lookahead=barmerge.lookahead_off))`),
  );
  expect(compiled.success).toBe(true);
  let evaluations = 0;
  for (const child of compiled.securityScripts.values()) {
    const Original = child.ScriptClass;
    child.ScriptClass = class extends Original {
      onBar(ctx: Parameters<InstanceType<typeof Original>['onBar']>[0]) {
        evaluations += 1;
        super.onBar(ctx);
      }
    };
  }
  const result = executeCompiled(compiled, bars, undefined, {
    runtime: { timeframe: { period: '1' } },
    requestDatafeed: {
      getBars(query) {
        return { ok: true, context: { symbol: query.symbol, timeframe: query.timeframe, bars } };
      },
    },
  })!;
  expect(result.errors).toEqual([]);
  expect(result.plots.map((plot) => plot.values)).toEqual([
    [1, 2, 3, 4],
    [1, 2, 3, 4],
    [11, 12, 13, 14],
  ]);
  expect(evaluations).toBe(12);
});
