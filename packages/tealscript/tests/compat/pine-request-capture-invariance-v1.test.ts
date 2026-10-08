import { describe, expect, it, vi } from 'vitest';

import { parse } from '../../src/parser';
import { InMemoryRequestDatafeed } from '../../src/runtime';
import { compile } from '../../src/runtime/codegen/compile';
import { executeCompiled } from '../../src/runtime/codegen/execute';

const start = Date.UTC(2026, 0, 1);
const bar = (time: number, close: number) => ({ time, open: close, high: close + 1, low: close - 1, close, volume: 1 });
const requested = [10, 20, 40, 80].map((close, index) => bar(start + index * 360_000, close));
const chart = Array.from({ length: 12 }, (_, index) => bar(start + index * 120_000, 100 + index));

function run(argument: string, expression = 'close + value', parameter = 'value') {
  const compiled = compile(
    parse(`//@version=6
indicator("Capture invariance")
f(float ${parameter}) => request.security("ALT", "6", ${expression}, lookahead=barmerge.lookahead_on)
float total = 0
for i = 0 to 1
    total += f(${argument})
plot(total)`),
  );
  expect(compiled.success).toBe(true);
  const sourcePrograms = [...(compiled.sourceScripts?.values() ?? [])];
  const spies = sourcePrograms.map((source) => vi.spyOn(source.ScriptClass.prototype, 'onBar'));
  try {
    const result = executeCompiled(compiled, chart, undefined, {
      requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'ALT', timeframe: '6', bars: requested }]),
      runtime: { syminfo: { tickerid: 'CHART', timezone: 'UTC' }, timeframe: { period: '2' } },
    });
    expect(result?.errors).toEqual([]);
    expect(result?.profile.swallowedErrors ?? []).toEqual([]);
    return {
      values: result?.plots[0].values,
      sourceCalls: spies.reduce((count, spy) => count + spy.mock.calls.length, 0),
    };
  } finally {
    for (const spy of spies) spy.mockRestore();
  }
}

const repeated = (values: Array<number | null>) => values.flatMap((value) => [value, value, value]);

function runRequested(expression: string, declarations = '') {
  const compiled = compile(
    parse(`//@version=6
indicator("Requested invariance controls")
${declarations}
plot(request.security("ALT", "6", ${expression}, lookahead=barmerge.lookahead_on))`),
  );
  expect(compiled.success).toBe(true);
  const result = executeCompiled(compiled, chart, undefined, {
    requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'ALT', timeframe: '6', bars: requested }]),
    runtime: { syminfo: { tickerid: 'CHART', timezone: 'UTC' }, timeframe: { period: '2' } },
  });
  expect(result?.errors).toEqual([]);
  expect(result?.profile.swallowedErrors ?? []).toEqual([]);
  return result?.plots[0].values ?? [];
}

describe('bar-invariant captured expression replay', () => {
  it('evaluates signed primitive loop captures once per requested dataset and binding', () => {
    const result = run('-i');
    expect(result.values).toEqual(repeated([19, 39, 79, 159]));
    expect(result.sourceCalls).toBeLessThanOrEqual(2);
  });

  it('preserves different bindings of a positive loop capture', () => {
    const result = run('i');
    expect(result.values).toEqual(repeated([21, 41, 81, 161]));
    expect(result.sourceCalls).toBeLessThanOrEqual(2);
  });

  it('keeps source-backed captures dependent on each requested bar', () => {
    expect(run('close + i').values).toEqual(repeated([41, 81, 161, 321]));
  });

  it('does not freeze a source-backed capture used as the complete expression', () => {
    expect(run('close + i', 'value').values).toEqual(repeated([21, 41, 81, 161]));
  });

  it('preserves requested builtin emission when a capture name overlaps close', () => {
    expect(run('i', 'close', 'close').values).toEqual(repeated([20, 40, 80, 160]));
  });

  it('keeps captured history initialization and physical lag', () => {
    expect(run('i', 'nz(value[1], -10)').values).toEqual(repeated([-20, 1, 1, 1]));
  });

  it('keeps requested default-time dependence', () => {
    expect(run('i', 'minute() + value').values).toEqual(repeated([1, 13, 25, 37]));
  });

  it('keeps stateful UDF calls on every requested bar', () => {
    expect(
      runRequested(
        'counter()',
        `counter() =>
    var int count = 0
    count += 1
    count`,
      ),
    ).toEqual(repeated([1, 2, 3, 4]));
  });

  it('keeps reference-backed values dependent on requested prices', () => {
    expect(runRequested('array.get(array.from(close), 0)')).toEqual(repeated([10, 20, 40, 80]));
  });

  it('keeps captured array identifiers on the reference replay path', () => {
    const compiled = compile(
      parse(`//@version=6
indicator("Captured reference")
f(array<float> value) => request.security("ALT", "6", value, lookahead=barmerge.lookahead_on)
source = array.from(close)
remote = f(source)
plot(array.get(remote, 0))`),
    );
    expect(compiled.success).toBe(true);
    const result = executeCompiled(compiled, chart, undefined, {
      requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'ALT', timeframe: '6', bars: requested }]),
      runtime: { syminfo: { tickerid: 'CHART', timezone: 'UTC' }, timeframe: { period: '2' } },
    });
    expect(result?.errors).toEqual([]);
    expect(result?.profile.swallowedErrors ?? []).toEqual([]);
    expect(result?.plots[0].values).toEqual(repeated([10, 20, 40, 80]));
  });

  it('keeps TA state advancing on requested bars', () => {
    expect(runRequested('ta.sma(close, 2)')).toEqual(repeated([null, 15, 30, 60]));
  });

  it('retains missing output at every requested slot', () => {
    expect(runRequested('na')).toEqual(Array(12).fill(null));
  });

  it('retains the signed zero of a bar-invariant output', () => {
    const values = runRequested('-0.0');
    expect(values).toHaveLength(12);
    expect(values.every((value) => Object.is(value, -0))).toBe(true);
  });

  it('materializes literal arithmetic without sharing prior execution state', () => {
    expect(runRequested('(4 + 2) / 3')).toEqual(Array(12).fill(2));
    expect(runRequested('(4 + 8) / 3')).toEqual(Array(12).fill(4));
  });

  it('retains same-timeframe incremental slots, chart history and realtime recalculation', () => {
    const compiled = compile(
      parse(`//@version=6
indicator("Incremental invariant request")
remote = request.security("ALT", "2", (4 + 2) / 3)
plot(nz(remote[2], -1))`),
    );
    expect(compiled.success).toBe(true);
    for (const count of [4, 6]) {
      const bars = chart.slice(0, count);
      const result = executeCompiled(compiled, bars, undefined, {
        requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'ALT', timeframe: '2', bars }]),
        realtimeLastBar: { isNew: false, previousIsNew: false },
        runtime: { syminfo: { tickerid: 'CHART', timezone: 'UTC' }, timeframe: { period: '2' } },
      });
      expect(result?.errors).toEqual([]);
      expect(result?.profile.swallowedErrors ?? []).toEqual([]);
      expect(result?.plots[0].values).toEqual([-1, -1, ...Array(count - 2).fill(2)]);
    }
  });
});
