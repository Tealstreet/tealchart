import assert from 'node:assert/strict';

import { parse } from '../src/parser/parser';
import { executeCompiled, tryCompile } from '../src/runtime/codegen/execute';
import { nativeMathLog } from '../src/runtime/mathPrecision';

const compiled = tryCompile(
  parse(`//@version=6
indicator("Scalar log CPU fixture v1")
f(float value) =>
    float total = 0
    for i = 0 to 1549
        total += math.log(value + i)
    total
plot(f(close))`),
);
assert.equal(compiled.success, true);
const bars = Array.from({ length: 4096 }, (_, index) => ({
  time: 1788134400000 + index * 120000,
  open: 10.25,
  high: 11,
  low: 10,
  close: 10.25,
  volume: 1,
}));
let expected = 0;
for (let index = 0; index < 1550; index++) expected += nativeMathLog(10.25 + index);
const started = process.cpuUsage();
const result = executeCompiled(compiled, bars);
const cpu = process.cpuUsage(started);
const cpuMs = (cpu.user + cpu.system) / 1000;
assert.deepEqual(result?.errors, []);
assert.equal(result?.profile.bars, bars.length);
assert.deepEqual(
  result?.plots[0].values,
  bars.map(() => expected),
);
process.stdout.write(`${JSON.stringify({ cpuMs, expected, bars: bars.length, logCalls: 6348800 })}\n`);
if (process.env.TEALSCRIPT_PERF_ASSERT === '1') {
  assert.ok(cpuMs < 2000, `Scalar log CPU ${cpuMs}ms exceeds 2000ms`);
}
