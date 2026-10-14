import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeCompiled, tryCompile } from './execute';

const start = Date.UTC(2026, 9, 1);
const bars = [3, 4, 5].map((close, index) => ({
  time: start + index * 60_000, open: close, high: close, low: close, close, volume: 1,
}));
const daily = [{ ...bars[0]!, close: 41 }, { ...bars[0]!, time: start + 86_400_000, close: 42 }];

function source(form: 'receiver' | 'function', method: boolean, deadFirst: boolean, supplied: boolean): string {
  const call = form === 'receiver' ? 'close.wrap()' : 'wrap(close)';
  const read = method ? 'method read(float self,float a='+call+',float b=2)=>a+b' : 'read(float a='+call+',float b=2)=>a+b';
  const invoke = `${method ? 'close.read' : 'read'}(${supplied ? `a=${call},` : ''}b=7)`;
  const dead = 'if false\n    ignored=inner(scalar)';
  return `//@version=6
indicator("Named default context",dynamic_requests=true)
float unused=array.get(array.from(1.0),timeframe.isdaily?1:0)
method sample(int self)=>unused
method sample(float self)=>self
inner(value)=>request.security("REMOTE","1D",value.sample(),lookahead=barmerge.lookahead_on)
method wrap(int self)=>inner(self)
method wrap(float self)=>inner(self)
${read}
int scalar=1
${deadFirst ? dead : ''}
run()=>${invoke}
plot(run())
${deadFirst ? '' : dead}`;
}

describe('named UDF arguments do not occupy omitted parameter slots', () => {
  for (const form of ['receiver', 'function'] as const) for (const method of [false, true]) {
    for (const deadFirst of [true, false]) for (const supplied of [false, true]) {
      it(`${form}, ${method ? 'method' : 'UDF'}, ${deadFirst ? 'dead first' : 'live first'}, ${supplied ? 'explicit' : 'omitted'}`, () => {
        const compiled = tryCompile(parse(source(form, method, deadFirst, supplied)));
        expect(compiled.success).toBe(true);
        const result = executeCompiled(compiled, bars, undefined, {
          runtime: { timeframe: { period: '1' } },
          requestDatafeed: { getBars(query) { return { ok: true, context: { symbol: query.symbol, timeframe: query.timeframe, bars: daily } }; } },
        });
        expect(result!.errors).toEqual([]);
        expect(result!.profile.compiledBarErrors?.firstMessage).toBeUndefined();
        expect(result!.plots[0]!.values).toEqual([48, 48, 48]);
      });
    }
  }
  for (const header of ['read(float a)=>a\nread(float a,float b=2)=>a+b', 'read(float a)=>a\nread(float b)=>b']) {
    it(`keeps true ambiguity refused: ${header.split('\n')[0]}`, () => {
      const compiled = tryCompile(parse(`//@version=6\nindicator("Ambiguous")\n${header}\nplot(${header.startsWith('method') ? '1.0.read()' : 'read(1.0)'})`));
      expect(compiled.success).toBe(false);
      expect(compiled.unsupported.join(' ')).toMatch(/ambiguous/i);
    });
  }
});
