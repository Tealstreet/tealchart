import { describe, expect, it, vi } from 'vitest';

import { parse } from '../../src/parser';
import { compile } from '../../src/runtime/codegen/compile';
import { executeCompiled } from '../../src/runtime/codegen/execute';

const bars = [{ time: 0, open: 1, high: 1, low: 1, close: 1, volume: 1 }];

function run(source: string, cost: (body: number) => number) {
  let elapsed = 0;
  let bodies = 0;
  const now = vi.spyOn(performance, 'now').mockImplementation(() => elapsed);
  try {
    const compiled = compile(parse(source));
    if (!compiled.success) throw new Error(JSON.stringify(compiled.unsupported));
    const onBar = compiled.ScriptClass.prototype.onBar;
    compiled.ScriptClass.prototype.onBar = function (ctx: Parameters<typeof onBar>[0]) {
      const sort = this._deps._arr.sort;
      this._deps._arr.sort = () => { elapsed += cost(++bodies); };
      try { return onBar.call(this, ctx); } finally { this._deps._arr.sort = sort; }
    };
    const result = executeCompiled(compiled, bars);
    if (!result) throw new Error('Execution failed');
    return { result, elapsed, bodies, reads: now.mock.calls.length };
  } finally {
    now.mockRestore();
  }
}

const prefix = '//@version=6\nindicator("Shared budget")\nvar data=array.new_float(1,1)\ncount=0\n';

describe('execution-wide loop sampling', () => {
  it.each([
    'array.sort(data)\nfor i=0 to 0\n    count+=1',
    'array.sort(data)\nwhile count<1\n    count+=1',
    'for i=0 to 0\n    count+=1\narray.sort(data)\nfor j=0 to 0\n    count+=1',
    'for i=0 to 0\n    count+=1\narray.sort(data)\nwhile count<2\n    count+=1',
  ])('excludes non-loop work before an outermost loop: %s', (body) => {
    const { result, elapsed } = run(prefix + body + '\nplot(count)', () => 600);
    expect(elapsed).toBe(600);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([body.startsWith('array.sort') ? 1 : 2]);
  });

  it.each([
    'for i=0 to 4999\n    array.sort(data)\n    count+=1',
    'while count<5000\n    array.sort(data)\n    count+=1',
    'for value in array.new_int(5000,1)\n    array.sort(data)\n    count+=1',
    'for [index,value] in array.new_int(5000,1)\n    array.sort(data)\n    count+=1',
    'for i=0 to 4999\n    for j=0 to 0\n        array.sort(data)\n        count+=1',
  ])('bounds a cheap-to-heavy transition: %s', (body) => {
    const { result, elapsed, bodies } = run(prefix + body + '\nplot(count)', (n) => n <= 1025 ? 0 : 7);
    expect(result.errors[0]).toEqual({
      message: 'Loop at line 5 exceeds the 500 ms execution time limit',
      code: 'runtime.error', line: 5,
      runtimeError: { code: 'runtime.error', message: 'Loop at line 5 exceeds the 500 ms execution time limit', line: 5 },
    });
    expect(elapsed).toBeGreaterThan(500);
    expect(elapsed).toBeLessThanOrEqual(500 + 64 * 7);
    expect(bodies).toBeLessThanOrEqual(1025 + Math.ceil(500 / 7) + 64);
  });

  it('shares the active counter and deadline with UDF-called inner loops', () => {
    const { result, elapsed } = run(prefix + `f() =>
    int n = 0
    for i=0 to 4999
        array.sort(data)
        n+=1
    n
for outer=0 to 0
    count+=f()
plot(count)`, () => 7);
    expect(result.errors[0]?.message).toContain('exceeds the 500 ms execution time limit');
    expect(elapsed).toBeGreaterThan(500);
    expect(elapsed).toBeLessThanOrEqual(500 + 64 * 7);
  });

  it('shares sampling across short nested loops without nested-entry clock reads', () => {
    const { result, reads } = run(prefix + 'for i=0 to 9\n    for j=0 to 9\n        count+=1\nplot(count)', () => 0);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([100]);
    expect(reads).toBeLessThanOrEqual(5);
  });

  it.each([
    ['for i=0 to 0', ''], ['while count<1', ''],
    ['for i=0 to 99', '\n    break'], ['for i=0 to 0', '\n    continue'],
  ])('keeps the exact exit boundary for %s', (header, tail) => {
    for (const cost of [500, 501]) {
      const { result } = run(prefix + header + '\n    array.sort(data)\n    count+=1' + tail + '\nplot(count)', () => cost);
      expect(result.errors).toEqual(cost === 500 ? [] : [{
        message: 'Loop at line 5 exceeds the 500 ms execution time limit',
        code: 'runtime.error', line: 5,
        runtimeError: { code: 'runtime.error', message: 'Loop at line 5 exceeds the 500 ms execution time limit', line: 5 },
      }]);
      expect(result.plots.map((plot) => plot.values)).toEqual(cost === 500 ? [[1]] : []);
    }
  });
});
