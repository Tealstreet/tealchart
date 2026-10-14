import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { InMemoryRequestDatafeed } from '../../src/runtime/requestDatafeed';

const origin = Date.UTC(2024, 0, 1);
const bar = (time: number) => ({ time, open: 10, high: 12, low: 8, close: 11, volume: 5 });
const runtime = {
  syminfo: { tickerid: 'TEST:QA', ticker: 'QA', timezone: 'Etc/UTC', mintick: 0.01 },
  timeframe: { period: '60', multiplier: 60, isminutes: true, isintraday: true },
};

// These unwitnessed inputs retain the original engine behavior, without native credit.
describe('requested first-change correction scope', () => {
  for (const version of [5, 6]) {
    const chartSource = `//@version=${version}
indicator("Chart QA")
plot(timeframe.change("1D") ? 1 : 0, "CHANGE")
plot(na(timeframe.change("1D")) ? 1 : 0, "MISSING")`;

    it(`preserves the v${version} chart first bar and finite boundaries`, () => {
      const compiled = tryCompile(parse(chartSource));
      expect(compiled.success).toBe(true);
      const result = executeCompiled(compiled,
        [origin, origin + 3_600_000, origin + 86_400_000, origin + 7 * 86_400_000].map(bar),
        undefined, { runtime });
      expect(result?.errors).toEqual([]);
      expect(result?.plots.map((plot) => plot.values)).toEqual([
        [version < 6 ? 1 : 0, 0, 1, 1], [0, 0, 0, 0],
      ]);
    });

    it(`preserves the v${version} chart evaluation after a nonfinite timestamp`, () => {
      const compiled = tryCompile(parse(chartSource));
      expect(compiled.success).toBe(true);
      const result = executeCompiled(compiled, [origin, Number.NaN, origin + 86_400_000].map(bar),
        undefined, { runtime });
      expect(result?.errors).toEqual([]);
      expect(result?.plots.map((plot) => plot.values)).toEqual([
        version < 6 ? [1, 0, 1] : [0, 0, 0], [0, 0, 0],
      ]);
    });

    it(`preserves the unwitnessed v${version} weekly request startup`, () => {
      const source = `//@version=${version}
indicator("Weekly QA")
f() =>
    var int n = 0
    if timeframe.change("1W")
        n += 1
    n
plot(request.security(syminfo.tickerid, "1W", f(), lookahead=barmerge.lookahead_on), "COUNTER")`;
      const compiled = tryCompile(parse(source));
      expect(compiled.success).toBe(true);
      const feed = new InMemoryRequestDatafeed([
        { symbol: 'TEST:QA', timeframe: '1W', bars: [bar(origin), bar(origin + 7 * 86_400_000)], syminfo: runtime.syminfo },
      ]);
      const result = executeCompiled(compiled,
        [origin, origin + 3_600_000, origin + 86_400_000, origin + 7 * 86_400_000].map(bar),
        undefined, { runtime, requestDatafeed: feed });
      expect(result?.errors).toEqual([]);
      expect(result?.plots[0].values).toEqual(version < 6 ? [1, 1, 1, 2] : [0, 0, 0, 1]);
    });
  }
});
