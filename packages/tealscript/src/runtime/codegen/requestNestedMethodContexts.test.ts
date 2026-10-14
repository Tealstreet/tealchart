import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeCompiled, tryCompile } from './execute';

const start = Date.UTC(2026, 9, 1);
const bars = [3, 4, 5].map((close, index) => ({
  time: start + index * 60_000,
  open: close, high: close, low: close, close, volume: 1,
}));
const requestedBars = [{ ...bars[0]!, close: 41 }, { ...bars[0]!, time: start + 86_400_000, close: 42 }];
const methods = `method sample(int self) => self + 100
method sample(float self) => self`;

function request(expression: string): string {
  return `request.security("REMOTE", "1D", ${expression}, lookahead=barmerge.lookahead_on)`;
}

function values(body: string): unknown[][] {
  const ast = parse(`//@version=6
indicator("Nested method requests")
${body}`);
  expect(checkProgram(ast, { requireDeclaration: true }).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
  const compiled = tryCompile(ast);
  expect(compiled.success, JSON.stringify(compiled.unsupported)).toBe(true);
  const result = executeCompiled(compiled, bars, undefined, {
    runtime: { timeframe: { period: '1' } },
    requestDatafeed: {
      getBars(query) {
        return { ok: true, context: { symbol: query.symbol, timeframe: query.timeframe, bars: requestedBars } };
      },
    },
  });
  expect(result).toBeDefined();
  expect(result!.errors).toEqual([]);
  expect(result!.profile.compiledBarErrors?.firstMessage).toBeUndefined();
  return result!.plots.map((plot) => plot.values);
}

const wrappers = [
  ['direct', `outer(value) => ${request(request('value.sample()'))}`],
  ['helper', `inner(value) => ${request('value.sample()')}\nouter(value) => ${request('inner(value)')}`],
  ['triple', `outer(value) => ${request(request(request('value.sample()')))}`],
] as const;

const calls = [
  ['float', 'plot(outer(close))', [[41, 41, 41]]],
  ['int', 'plot(outer(7))', [[107, 107, 107]]],
  ['both', 'plot(outer(close))\nplot(outer(7))', [[41, 41, 41], [107, 107, 107]]],
] as const;

describe('nested requested method contexts', () => {
  for (const [wrapperName, wrapper] of wrappers) {
    for (const [kind, call, expected] of calls) {
      it(`keeps the ${kind} receiver context through ${wrapperName} requests`, () => {
        expect(values(`${methods}\n${wrapper}\n${call}`)).toEqual(expected);
      });
    }
  }

  for (const reversed of [false, true]) {
    it(`selects the float method with reversed declarations=${reversed}`, () => {
      const declarations = reversed ? methods.split('\n').reverse().join('\n') : methods;
      expect(values(`${declarations}\n${wrappers[0][1]}\nplot(outer(close))`)).toEqual([[41, 41, 41]]);
    });
  }

  for (const wrapper of wrappers.slice(0, 2)) {
    it(`refuses an overload global and excludes a valid int dependency in ${wrapper[0]} requests`, () => {
      const invalid = parse(`//@version=6
indicator("Overloaded global")
float unused = array.get(array.from(1.0), timeframe.isdaily ? 1 : 0)
method sample(int self) => unused
method sample(float self) => self
${wrapper[1]}
plot(outer(close))`);
      expect(checkProgram(invalid).diagnostics.filter(d => d.severity === 'error')).toEqual([
        expect.objectContaining({ code: 'overload-global-variable', message: 'Cannot use global variable "unused" in the local scope of overloaded function "sample()"' }),
      ]);
      expect(values(`method sample(int self) => array.get(array.from(1.0), timeframe.isdaily ? 1 : 0) + self * 0
method sample(float self) => self
${wrapper[1]}
plot(outer(close))`)).toEqual([[41, 41, 41]]);
    });
  }

  it('keeps a single selected overload through another requested level', () => {
    expect(values(`method sample(float self) => self
${wrappers[2][1]}
plot(outer(close))`)).toEqual([[41, 41, 41]]);
  });

  for (const expression of ['41', 'value', 'math.abs(value)']) {
    it(`preserves the nested ${expression} control`, () => {
      expect(values(`${methods}\nouter(value) => ${request(request(expression))}\nplot(outer(close))`)).toEqual([[41, 41, 41]]);
    });
  }

  it('preserves a root single-method call', () => {
    expect(values('method sample(float self) => self\nplot(float(close).sample())')).toEqual([[3, 4, 5]]);
  });

  it('preserves a single requested method call', () => {
    expect(values(`${methods}\nplot(${request('close.sample()')})`)).toEqual([[41, 41, 41]]);
  });

  it('preserves a nested builtin collection method', () => {
    expect(values(`plot(${request(request('array.from(41.0).get(0)'))})`)).toEqual([[41, 41, 41]]);
  });
});
