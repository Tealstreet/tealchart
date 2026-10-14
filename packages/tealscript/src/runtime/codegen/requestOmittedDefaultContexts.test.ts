import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeCompiled, tryCompile } from './execute';

const start = Date.UTC(2026, 9, 1);
const bars = [3, 4, 5].map((close, index) => ({
  time: start + index * 60_000,
  open: close, high: close, low: close, close, volume: 1,
}));
const dailyBars = [{ ...bars[0]!, close: 41 }, { ...bars[0]!, time: start + 86_400_000, close: 42 }];

function requestedSource(form: 'receiver' | 'function', deadFirst: boolean, supplied: boolean, depth: number): string {
  const call = form === 'receiver' ? 'close.wrap()' : 'wrap(close)';
  const defaults = Array.from({ length: depth }, (_, index) =>
    `default${index}(float value = ${index ? `default${index - 1}()` : call}) => value`);
  const readDefault = depth ? `default${depth - 1}()` : call;
  const deadCall = 'if false\n    ignored=inner(scalar)';
  return `//@version=6
indicator("R3 nested default")
float unused = array.get(array.from(1.0), timeframe.isdaily ? 1 : 0)
method sample(int self) => unused
method sample(float self) => self
inner(value) => request.security("REMOTE", "1D", value.sample(), lookahead=barmerge.lookahead_on)
method wrap(int self) => inner(self)
method wrap(float self) => inner(self)
${defaults.length ? `${defaults.join('\n')}\n` : ''}read(float value = ${readDefault}) => value
outer() => read(${supplied ? call : ''})
int scalar=1
${deadFirst ? `${deadCall}\nplot(outer())` : `plot(outer())\n${deadCall}`}`;
}

describe('omitted default request call contexts', () => {
  for (const form of ['receiver', 'function'] as const) {
    for (const deadFirst of [true, false]) {
      for (const supplied of [false, true]) {
        for (const depth of [0, 1, 2, 4]) {
          it(`${form}, ${deadFirst ? 'dead' : 'live'} caller first, ${supplied ? 'supplied' : 'omitted'}, default depth ${depth}`, () => {
            const compiled = tryCompile(parse(requestedSource(form, deadFirst, supplied, depth)));
            expect(compiled.success).toBe(true);
            const result = executeCompiled(compiled, bars, undefined, {
              runtime: { timeframe: { period: '1' } },
              requestDatafeed: {
                getBars(query) {
                  return { ok: true, context: { symbol: query.symbol, timeframe: query.timeframe, bars: dailyBars } };
                },
              },
            });
            expect(result).toBeDefined();
            expect(result!.errors).toEqual([]);
            expect(result!.profile.compiledBarErrors?.firstMessage).toBeUndefined();
            expect(result!.plots[0]!.values).toEqual([41, 41, 41]);
          });
        }
      }
    }
  }
});
