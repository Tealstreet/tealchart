import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeCompiled, tryCompile } from './execute';

const bars = Array.from({ length: 200 }, (_, index) => ({
  time: (index + 1) * 60000,
  open: 7,
  high: 8,
  low: 6,
  close: 7,
  volume: 100,
}));
const program = (method: boolean) => `//@version=6
indicator("Collection method CPU")
var a = array.new_float(4, 7)
float result = 0
for i = 0 to 4999
    result += ${method ? 'a.get(i % 4) + a.size() + a.avg() + a.min() + a.max() + a.sum()' : 'array.get(a, i % 4) + array.size(a) + array.avg(a) + array.min(a) + array.max(a) + array.sum(a)'}
plot(result)`;

describe('compiled collection method dispatch', () => {
  it('matches namespace reads through the actual compiled runtime', () => {
    const method = executeCompiled(tryCompile(parse(program(true))), bars)!;
    const namespace = executeCompiled(tryCompile(parse(program(false))), bars)!;
    expect(method.errors).toEqual([]);
    expect(namespace.errors).toEqual([]);
    expect(method.plots).toEqual(namespace.plots);
    expect(method.plots[0]!.values).toEqual(Array(200).fill(300000));
  });

  it('preserves named argument aliases and mutations through a slice', () => {
    const compiled = tryCompile(
      parse(`//@version=6
indicator("Method aliases")
a = array.from(1.0, 2.0, 3.0)
a.set(value=8.0, index=0)
b = a.slice(0, 2)
b.set(1, 9.0)
plot(a.get(0) + a.get(1))`),
    );
    const result = executeCompiled(compiled, bars.slice(0, 3))!;
    expect(result.errors).toEqual([]);
    expect(result.plots[0]!.values).toEqual([17, 17, 17]);
  });

  it('preserves local method precedence', () => {
    const compiled = tryCompile(
      parse(`//@version=6
indicator("Local method")
method get(array<float> id, int index) =>
    99.0
a = array.new_float(1, 7)
plot(a.get(0))`),
    );
    const result = executeCompiled(compiled, bars.slice(0, 3))!;
    expect(result.errors).toEqual([]);
    expect(result.plots[0]!.values).toEqual([99, 99, 99]);
  });

  it('retains the legacy negative-index refusal and v6 wrapping', () => {
    const source = (version: number) => `//@version=${version}
indicator("Method negative index")
a = array.from(1.0, 2.0)
plot(a.get(-1))`;
    const legacy = executeCompiled(tryCompile(parse(source(5))), bars.slice(0, 1))!;
    const modern = executeCompiled(tryCompile(parse(source(6))), bars.slice(0, 1))!;
    expect(legacy.errors[0]!.message).toContain('negative in this Pine version');
    expect(modern.errors).toEqual([]);
    expect(modern.plots[0]!.values).toEqual([2]);
  });

  it('preserves map and matrix method argument binding', () => {
    const compiled = tryCompile(
      parse(`//@version=6
indicator("Other collection methods")
m = map.new<string, float>()
m.put(key="x", value=3.0)
x = matrix.new<float>(1, 1, 0.0)
x.set(row=0, column=0, value=4.0)
plot(m.get("x") + x.get(0, 0))`),
    );
    const result = executeCompiled(compiled, bars.slice(0, 3))!;
    expect(result.errors).toEqual([]);
    expect(result.plots[0]!.values).toEqual([7, 7, 7]);
  });

  it('preserves missing receiver errors', () => {
    const compiled = tryCompile(
      parse(`//@version=6
indicator("Missing method receiver")
array<float> a = na
plot(a.get(0))`),
    );
    const result = executeCompiled(compiled, bars.slice(0, 1))!;
    expect(result.errors[0]!.message).toContain('Array methods cannot be called when the ID is na');
  });

  const timingIt = process.env.TEALSCRIPT_PERF_ASSERT === '1' ? it : it.skip;
  timingIt('keeps built-in method reads close to namespace reads', () => {
    const method = tryCompile(parse(program(true)));
    const namespace = tryCompile(parse(program(false)));
    const run = (compiled: typeof method) => {
      const start = process.cpuUsage();
      const result = executeCompiled(compiled, bars)!;
      const cpu = process.cpuUsage(start);
      expect(result.errors).toEqual([]);
      expect(result.plots[0]!.values).toEqual(Array(200).fill(300000));
      return (cpu.user + cpu.system) / 1000;
    };
    run(method);
    run(namespace);
    const ratios: number[] = [];
    const samples: { method: number; namespace: number }[] = [];
    for (let index = 0; index < 5; index++) {
      const first = run(index % 2 ? namespace : method);
      const second = run(index % 2 ? method : namespace);
      const m = index % 2 ? second : first;
      const n = index % 2 ? first : second;
      samples.push({ method: m, namespace: n });
      ratios.push(m / n);
    }
    const ratio = [...ratios].sort((a, b) => a - b)[2]!;
    console.info(JSON.stringify({ collectionReadCpuRatio: ratio, samples, ratios }));
    expect(ratio).toBeLessThan(1.15);
  });
});
