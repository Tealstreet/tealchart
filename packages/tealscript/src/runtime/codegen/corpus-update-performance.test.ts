import type { Bar } from '../context';

import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeCompiled, tryCompile } from './execute';

const bars: Bar[] = Array.from({ length: 32 }, (_, index) => ({
  time: (index + 1) * 60_000,
  open: 100 + index,
  high: 102 + index,
  low: 99 + index,
  close: 101 + index,
  volume: 10,
}));

const libraries = new Map([
  [
    'Test/Counters/1',
    parse(`//@version=6
library("Counters")
export type Counter
    int count = 0
export method update(Counter this) =>
    this.count += 1
    this.count
`),
  ],
]);

function compileWrapper(name: string) {
  const ast = parse(`//@version=6
indicator("Update snapshot throughput")
import Test/Counters/1 as lib
${name}() =>
    var counter = lib.Counter.new()
    smoothed = ta.rma(close, 10)
    counter.update() + nz(smoothed) * 0
plot(${name}())
`);
  expect(checkProgram(ast, { libraries }).diagnostics.filter(({ severity }) => severity === 'error')).toEqual([]);
  const compiled = tryCompile(ast, undefined, { libraries });
  expect(compiled.success).toBe(true);
  return compiled;
}

function measure(compiled: ReturnType<typeof tryCompile>) {
  const samples = Array.from({ length: 3 }, () => {
    const before = process.cpuUsage();
    const result = executeCompiled(compiled, bars, undefined, { libraries });
    const used = process.cpuUsage(before);
    return { cpuUs: used.user + used.system, result };
  });
  return samples.sort((left, right) => left.cpuUs - right.cpuUs)[1];
}

describe('generated update wrapper throughput', () => {
  it('keeps imported update dispatch within the cost of a distinct wrapper name', () => {
    const distinct = compileWrapper('advance');
    const colliding = compileWrapper('update');
    executeCompiled(distinct, bars, undefined, { libraries });
    const control = measure(distinct);
    const actual = measure(colliding);

    if (process.env.TEALSCRIPT_PERF_ASSERT === '1') {
      expect(actual.cpuUs).toBeLessThan(control.cpuUs * 10 + 25_000);
    }
    expect(actual.result?.errors).toEqual([]);
    expect(actual.result?.profile.compiledBarErrors?.count ?? 0).toBe(0);
    expect(actual.result?.plots.map(({ values }) => values)).toEqual([
      Array.from({ length: bars.length }, (_, index) => index + 1),
    ]);
    expect(actual.result?.plots).toEqual(control.result?.plots);
  }, 30_000);
});
