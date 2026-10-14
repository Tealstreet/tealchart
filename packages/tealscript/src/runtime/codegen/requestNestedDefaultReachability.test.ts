import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeCompiled, tryCompile } from './execute';

const start = Date.UTC(2026, 9, 1);
const bars = [3, 4, 5].map((close, index) => ({
  time: start + index * 60_000, open: close, high: close, low: close, close, volume: 1,
}));
const dailyBars = [{ ...bars[0]!, close: 41 }, { ...bars[0]!, time: start + 86_400_000, close: 42 }];

// UDF defaults equal explicit arguments, including dynamic nested requests.
describe('nested requests reach omitted-default helpers', () => {
  it.each(['omitted', 'explicit outer', 'explicit inner'] as const)('%s', (form) => {
    const outerArgument = form === 'explicit inner' ? 'close.wrap()' : '';
    const invocation = form === 'explicit outer'
      ? 'request.security("REMOTE","1D",read(close.wrap()),lookahead=barmerge.lookahead_on)'
      : 'outer()';
    const compiled = tryCompile(parse(`//@version=6
indicator("Nested default reachability", dynamic_requests=true)
float unused = array.get(array.from(1.0), timeframe.isdaily ? 1 : 0)
method sample(int self) => unused
method sample(float self) => self
inner(value) => request.security("REMOTE", "1D", value.sample(), lookahead=barmerge.lookahead_on)
method wrap(int self) => inner(self)
method wrap(float self) => inner(self)
read(float a=close.wrap())=>a
outer()=>request.security("REMOTE","1D",read(${outerArgument}),lookahead=barmerge.lookahead_on)
int scalar=1
if false
    ignored=inner(scalar)
tkRun()=>${invocation}
plot(tkRun())`));
    expect(compiled.success).toBe(true);
    expect(compiled.unsupported).toEqual([]);
    const result = executeCompiled(compiled, bars, undefined, {
      runtime: { timeframe: { period: '1' } },
      requestDatafeed: {
        getBars(query) {
          return { ok: true, context: { symbol: query.symbol, timeframe: query.timeframe, bars: dailyBars } };
        },
      },
    });
    expect(result!.errors).toEqual([]);
    expect(result!.profile.compiledBarErrors?.firstMessage).toBeUndefined();
    expect(result!.plots.map((plot) => plot.values)).toEqual([[41, 41, 41]]);
  });
});
