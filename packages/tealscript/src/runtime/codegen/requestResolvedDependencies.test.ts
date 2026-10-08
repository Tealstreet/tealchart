import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeCompiled, tryCompile } from './execute';

const start = Date.UTC(2026, 9, 1);
const bars = [3, 4, 5].map((close, index) => ({
  time: start + index * 60_000,
  open: close, high: close, low: close, close, volume: 1,
}));
const dailyBars = [{ ...bars[0]!, close: 41 }, { ...bars[0]!, time: start + 86_400_000, close: 42 }];

function requestedValues(body: string): unknown[] {
  const compiled = tryCompile(parse(`//@version=6
indicator("Resolved request dependencies")
float unused = array.get(array.from(1.0), timeframe.isdaily ? 1 : 0)
${body}`));
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
  return result!.plots[0]!.values;
}

describe('resolved requested function dependencies', () => {
  it('does not replay the global read by an unselected scalar method overload', () => {
    expect(requestedValues(`method sample(int self) => unused
method sample(float self) => self
plot(request.security("REMOTE", "1D", close.sample(), lookahead=barmerge.lookahead_on))`)).toEqual([41, 41, 41]);
  });

  it('keeps nested receiver selections separate from chart-only calls', () => {
    expect(requestedValues(`method sample(array<int> self) => unused
method sample(array<float> self) => array.get(self, 0)
observe(value) => value.sample()
chartOnly = observe(array.from(1))
plot(request.security("REMOTE", "1D", observe(array.from(close)), lookahead=barmerge.lookahead_on))`)).toEqual([41, 41, 41]);
  });

  it('does not expand a default omitted only by a chart call', () => {
    expect(requestedValues(`read(float value = unused) => value
chartOnly = read()
plot(request.security("REMOTE", "1D", read(close), lookahead=barmerge.lookahead_on))`)).toEqual([41, 41, 41]);
  });

  it('keeps a function-syntax UDT method without its unselected scalar overload', () => {
    expect(requestedValues(`type Data
    float value
method sample(Data self) => self.value
sample(float source) => unused
data = Data.new(close)
read() => sample(data)
chartOnly = sample(close)
plot(request.security("REMOTE", "1D", read(), lookahead=barmerge.lookahead_on))`)).toEqual([41, 41, 41]);
  });

  it('does not replay dependencies from an unreachable sibling specialization', () => {
    expect(requestedValues(`method sample(int self) => unused
method sample(float self) => self
read(value) => request.security("REMOTE", "1D", value.sample(), lookahead=barmerge.lookahead_on)
if false
    ignored = read(1)
plot(read(close))`)).toEqual([41, 41, 41]);
  });

  it('replays the global of the executing specialization in requested context', () => {
    expect(requestedValues(`requested = close + 7
method sample(int self) => requested
method sample(float self) => self
read(value) => request.security("REMOTE", "1D", value.sample(), lookahead=barmerge.lookahead_on)
floatCall = read(close)
plot(read(1) + floatCall)`)).toEqual([89, 89, 89]);
  });

  it('retains globals and nested calls in a requested omitted default', () => {
    expect(requestedValues(`requestedDefault = close + 2
seed() => requestedDefault
read(float value = seed()) => value
plot(request.security("REMOTE", "1D", read(), lookahead=barmerge.lookahead_on))`)).toEqual([43, 43, 43]);
  });
});

function wrappedRequest(depth: number, form: 'receiver' | 'function', wrappers: 'function' | 'overload' | 'method' | 'mixed', deadFirst: boolean): string {
  const call = (name: string, value: string, method: boolean) => method && form === 'receiver'
    ? `${value}.${name}()` : `${name}(${value})`;
  const declarations = [
    'method sample(int self) => unused',
    'method sample(float self) => self',
    `inner(value) => request.security("REMOTE", "1D", ${call('sample', 'value', true)}, lookahead=barmerge.lookahead_on)`,
  ];
  let previous = 'inner';
  let previousMethod = false;
  for (let layer = 0; layer < depth; layer += 1) {
    const name = `wrap${layer}`;
    const method = wrappers === 'method' || wrappers === 'mixed' && layer % 2 === 0;
    if (method) {
      for (const type of ['int', 'float']) declarations.push(`method ${name}(${type} self) => ${call(previous, 'self', previousMethod)}`);
    } else if (wrappers === 'overload') {
      for (const type of ['int', 'float']) declarations.push(`${name}(${type} value) => ${call(previous, 'value', previousMethod)}`);
    } else declarations.push(`${name}(value) => ${call(previous, 'value', previousMethod)}`);
    previous = name;
    previousMethod = method;
  }
  const dead = `if false
    ignored = ${call(previous, 'scalar', previousMethod)}`;
  const live = `plot(${call(previous, 'close', previousMethod)})`;
  return [...declarations, 'int scalar = 1', ...(deadFirst ? [dead, live] : [live, dead])].join('\n');
}

for (const depth of [0, 1, 2, 4]) {
  for (const form of ['receiver', 'function'] as const) {
    for (const wrappers of ['function', 'overload', 'method', 'mixed'] as const) {
      for (const deadFirst of [true, false]) {
        it(`isolates depth=${depth} form=${form} wrappers=${wrappers} deadFirst=${deadFirst}`, () => {
          expect(requestedValues(wrappedRequest(depth, form, wrappers, deadFirst))).toEqual([41, 41, 41]);
        });
      }
    }
  }
}
