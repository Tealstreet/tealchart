// Reference: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json entries949/958/972/975.
import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeCompiled, tryCompile } from './execute';

const bars = Array.from({ length: 40 }, (_, index) => ({
  time: (index + 1) * 60000,
  open: 7,
  high: 8,
  low: 6,
  close: 7,
  volume: 100,
}));
const run = (source: string) => executeCompiled(tryCompile(parse(source)), bars.slice(0, 3))!;
const program = (method: boolean) => `//@version=${method ? 5 : 6}
indicator("Legacy dispatch CPU")
var a = array.from(7.0, 8.0, 9.0, 10.0)
float result = 0
for i = 0 to 7999
    result += a.get(i % 4) + a.get(i % 4) + a.get(i % 4) + a.get(i % 4)
plot(result)`;

describe('legacy guarded array method dispatch', () => {
  it.each(['get', 'set', 'insert', 'remove'])('preserves %s refusal text and timing in v5 and v6', (method) => {
    for (const version of [5, 6]) {
      for (const index of [-3, -1, 3]) {
        const extra = method === 'set' || method === 'insert' ? ', 9.0' : '';
        const source = (receiver: boolean) => `//@version=${version}
indicator("Index refusal")
a = array.from(1.0, 2.0)
if bar_index == 0
    ${receiver ? `a.${method}(${index}${extra})` : `array.${method}(a, ${index}${extra})`}
plot(a.get(0))`;
        const actual = run(source(true));
        const control = run(source(false));
        expect(actual.errors.map(({ message, barIndex }) => ({ message, barIndex }))).toEqual(
          control.errors.map(({ message, barIndex }) => ({ message, barIndex })),
        );
        expect(actual.plots.map(({ values }) => values)).toEqual(control.plots.map(({ values }) => values));
        if (version === 5 && index < 0) {
          expect(actual.errors[0]!.message).toBe(`Array index ${index} is negative in this Pine version`);
        } else if (index === 3 || index === -3) {
          expect(actual.errors).toHaveLength(1);
          expect(actual.profile.bars).toBe(control.profile.bars);
          expect(actual.profile.compiledBarErrors).toEqual(control.profile.compiledBarErrors);
        } else {
          expect(actual.errors).toEqual([]);
        }
      }
    }
  });

  it('evaluates mutation arguments before refusing the legacy index', () => {
    const result = run(`//@version=5
indicator("Argument evaluation")
f_value() =>
    log.info("value evaluated")
    9.0
a = array.from(1.0, 2.0)
a.set(-1, f_value())
plot(1)`);
    expect(result.logs.map(({ message }) => message)).toEqual(['value evaluated']);
    expect(result.errors[0]!.message).toBe('Array index -1 is negative in this Pine version');
  });

  const timingIt = process.env.TEALSCRIPT_PERF_ASSERT === '1' ? it : it.skip;
  timingIt('keeps legacy reads close to the modern positive-index path', () => {
    const method = tryCompile(parse(program(true)));
    const namespace = tryCompile(parse(program(false)));
    const measure = (compiled: typeof method) => {
      const start = process.cpuUsage();
      const result = executeCompiled(compiled, bars)!;
      const cpu = process.cpuUsage(start);
      expect(result.errors).toEqual([]);
      expect(result.plots[0]!.values).toEqual(Array(40).fill(272000));
      return cpu.user + cpu.system;
    };
    measure(method);
    measure(namespace);
    const ratios: number[] = [];
    for (let pair = 0; pair < 5; pair++) {
      const first = measure(pair % 2 ? namespace : method);
      const second = measure(pair % 2 ? method : namespace);
      ratios.push(pair % 2 ? second / first : first / second);
    }
    const median = [...ratios].sort((a, b) => a - b)[2]!;
    console.info(JSON.stringify({ legacyMethodCpuRatios: ratios, median }));
    expect(median).toBeLessThan(1.15);
  });
});
