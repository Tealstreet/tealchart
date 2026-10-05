import assert from 'node:assert/strict';

import { parse } from '../src/parser/parser';
import { executeCompiled, tryCompile } from '../src/runtime/codegen/execute';

const compiled = tryCompile(
  parse(`//@version=6
indicator("Math dispatch CPU fixture v1")
float total = 0
for i = 0 to 1549
    total += math.round(close + i / 10.0)
plot(total)`),
);
assert.equal(compiled.success, true);
const bars = Array.from({ length: 4096 }, (_, i) => ({
  time: 1788134400000 + i * 120000,
  open: 10.25,
  high: 11,
  low: 10,
  close: 10.25,
  volume: 1,
}));
let expected = 0;
for (let i = 0; i < 1550; i++) expected += Math.round(10.25 + i / 10);
const before = process.cpuUsage();
const result = executeCompiled(compiled, bars);
const cpu = process.cpuUsage(before);
const cpuMs = (cpu.user + cpu.system) / 1000;
assert.deepEqual(result?.errors, []);
assert.equal(result?.profile.bars, 4096);
assert.deepEqual(result?.plots[0].values, Array(4096).fill(expected));
console.log(
  JSON.stringify({ cpuMs, expected, bars: 4096, roundCalls: 6348800, errors: result?.errors, budgetMs: 2000 }),
);
if (process.env.TEALSCRIPT_PERF_ASSERT === '1') assert.ok(cpuMs < 2000, `math dispatch CPU ${cpuMs}ms exceeds 2000ms`);
