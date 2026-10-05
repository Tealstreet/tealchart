import { expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeCompiled, tryCompile } from './execute';

it('completes repeated TPO level reads within the CPU budget', () => {
  const compiled = tryCompile(
    parse(`//@version=5
indicator("TPO level read cost", max_lines_count=500)
var lines = array.new_line()
if barstate.isfirst
    for x = 0 to 499
        array.push(lines, line.new(0, 7, 1, 7))
float total = 0
for i = 0 to 39
    for x = 0 to 499
        if line.get_y1(array.get(lines, x)) <= high and line.get_y1(array.get(lines, x)) >= low
            total += 1
plot(total)`),
  );
  expect(compiled.success).toBe(true);
  const bars = Array.from({ length: 1000 }, (_, i) => ({
    time: 1788134400000 + i * 120000,
    open: 1,
    high: 10,
    low: 1,
    close: 2,
    volume: 1,
  }));
  const start = process.cpuUsage();
  const result = executeCompiled(compiled, bars);
  const cpu = process.cpuUsage(start);
  const elapsed = (cpu.user + cpu.system) / 1000;
  console.log('tpo-level-read-cpu-ms', elapsed);
  expect(result?.errors).toEqual([]);
  expect(result?.plots[0].values).toEqual(Array(1000).fill(20000));
  if (process.env.TEALSCRIPT_PERF_ASSERT === '1') expect(elapsed).toBeLessThan(2000);
});

const controlBars = Array.from({ length: 3 }, (_, i) => ({
  time: 1788134400000 + i * 120000,
  open: 1,
  high: 10,
  low: 1,
  close: 2,
  volume: 1,
}));

it('refreshes invariant levels on each bar and keeps missing history', () => {
  const compiled = tryCompile(
    parse(`//@version=5
indicator("history levels")
var lines = array.new_line()
if barstate.isfirst
    array.push(lines, line.new(0, 1, 1, 1))
line.set_y1(array.get(lines, 0), bar_index == 1 ? 100 : 2)
float total = 0
for i = 0 to 2
    for x = 0 to 0
        if line.get_y1(array.get(lines, x)) <= high[i] and line.get_y1(array.get(lines, x)) >= low[i]
            total += 1
plot(total)`),
  );
  expect(compiled.success).toBe(true);
  const result = executeCompiled(compiled, controlBars);
  expect(result?.errors).toEqual([]);
  expect(result?.plots[0].values).toEqual([1, 0, 3]);
});

it.each([
  ['line mutation', 'line.set_y1(array.get(lines, 0), 7 + i)', 22],
  ['line array alias mutation', 'array.set(alias, 0, other)', 25],
  ['line array reassignment', 'lines := replacement', 25],
  ['user function mutation', 'change(lines, 7 + i)', 22],
] as const)('keeps live reads after %s inside a loop', (_, mutation, expected) => {
  const compiled = tryCompile(
    parse(`//@version=5
indicator("mutable levels")
change(array<line> values, int y) =>
    line.set_y1(array.get(values, 0), y)
var lines = array.new_line()
var line other = line.new(0, 9, 1, 9)
if barstate.isfirst
    array.push(lines, line.new(0, 7, 1, 7))
alias = lines
replacement = array.new_line(1, other)
line.set_y1(array.get(lines, 0), 7)
float total = 0
for i = 0 to 2
    for x = 0 to 0
        total += line.get_y1(array.get(lines, x))
        ${mutation}
plot(total)`),
  );
  expect(compiled.success).toBe(true);
  const result = executeCompiled(compiled, controlBars.slice(0, 1));
  expect(result?.errors).toEqual([]);
  expect(result?.plots[0].values).toEqual([expected]);
});

it('keeps v6 lazy bounds after a false comparison', () => {
  const compiled = tryCompile(
    parse(`//@version=6
indicator("lazy levels")
var lines = array.new_line()
if barstate.isfirst
    array.push(lines, line.new(0, 100, 1, 100))
float total = 0
for i = 0 to 2
    for x = 0 to 0
        if line.get_y1(array.get(lines, x)) <= high and line.get_y1(array.get(lines, x)) >= low[-1]
            total += 1
plot(total)`),
  );
  expect(compiled.success).toBe(true);
  const result = executeCompiled(compiled, controlBars);
  expect(result?.errors).toEqual([]);
  expect(result?.plots[0].values).toEqual([0, 0, 0]);
});

it('keeps live reads when an imported namespace shadows a pure builtin', () => {
  const libraries = new Map([
    [
      'Tests/Levels/1',
      parse(`//@version=5
library("Levels")
export abs(array<line> values, int y) =>
    line.set_y1(array.get(values, 0), y)`),
    ],
  ]);
  const compiled = tryCompile(
    parse(`//@version=5
import Tests/Levels/1 as math
indicator("imported mutable level")
var lines = array.new_line()
if barstate.isfirst
    array.push(lines, line.new(0, 7, 1, 7))
float total = 0
for i = 0 to 2
    for x = 0 to 0
        total += line.get_y1(array.get(lines, x))
        math.abs(lines, 7 + i)
plot(total)`),
    undefined,
    { libraries },
  );
  expect(compiled.success).toBe(true);
  const result = executeCompiled(compiled, controlBars.slice(0, 1), undefined, { libraries });
  expect(result?.errors).toEqual([]);
  expect(result?.plots[0].values).toEqual([22]);
});
