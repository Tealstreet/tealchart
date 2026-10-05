import { expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeCompiled, tryCompile } from './execute';

const source = `//@version=6
indicator("drawing binding allocation", max_labels_count=500)
float checksum = 0
for i = 0 to 1999
    id = label.new(bar_index, i, "abc", xloc.bar_index, yloc.price, color.green, label.style_label_up, color.white, size.small)
    checksum += str.length(label.get_text(id))
plot(checksum)`;
const bars = Array.from({ length: 20 }, (_, i) => ({
  time: 1788134400000 + i * 120000,
  open: 1,
  high: 3,
  low: 1,
  close: 2,
  volume: 1,
}));

it('binds positional drawing arguments without temporary parameter arrays', () => {
  const compiled = tryCompile(parse(source));
  expect(compiled.success).toBe(true);
  const originalSlice = Array.prototype.slice;
  let slices = 0;
  Array.prototype.slice = function (...args) {
    if (this[0] === 'x' && this[1] === 'y' && this[2] === 'text' && Number(args[1]) > 2) slices++;
    return originalSlice.apply(this, args);
  };
  const start = process.cpuUsage();
  let result;
  try {
    result = executeCompiled(compiled, bars);
  } finally {
    Array.prototype.slice = originalSlice;
  }
  const cpu = process.cpuUsage(start);
  const cpuMs = (cpu.user + cpu.system) / 1000;
  console.log('drawing-binding-cpu-ms', cpuMs, 'slices', slices);
  expect(result?.errors).toEqual([]);
  expect(result?.plots[0].values).toEqual(Array(20).fill(6000));
  // Native v21 quota500 trims on creation506; 40,000 creations leave502.
  expect(result?.drawings).toHaveLength(502);
  expect(result?.drawings.at(-1)).toMatchObject({ text: 'abc', y: 1999, style: 'label_up', size: 'small' });
  expect(slices).toBeLessThan(1000);
  if (process.env.TEALSCRIPT_PERF_ASSERT === '1') expect(cpuMs).toBeLessThan(1000);
});

it('retains reordered named drawing values and undefined defaults', () => {
  const compiled = tryCompile(
    parse(`//@version=6
indicator("drawing named binding")
a = label.new(text="abc", y=7, x=bar_index, size=size.small, color=color.green)
b = label.new(bar_index, text="xyz", y=9, color=color.red)
plot(str.length(label.get_text(a)) + str.length(label.get_text(b)))`),
  );
  expect(compiled.success).toBe(true);
  const result = executeCompiled(compiled, bars.slice(0, 1));
  expect(result?.errors).toEqual([]);
  expect(result?.plots[0].values).toEqual([6]);
  expect(result?.drawings).toMatchObject([
    { text: 'abc', x: 0, y: 7, size: 'small' },
    { text: 'xyz', x: 0, y: 9 },
  ]);
});

it('binds runtime aliases without temporary matching arrays', () => {
  const compiled = tryCompile(
    parse(`//@version=6
indicator("runtime alias binding")
int checksum = 0
for i = 0 to 1999
    checksum += str.length(str.substring("abcdef", 1, 4))
plot(checksum)
plot(str.substring(end_pos=4, source="abcdef", begin_pos=1) == "bcd" ? 1 : 0)`),
  );
  expect(compiled.success).toBe(true);
  const originalFilter = Array.prototype.filter;
  let matches = 0;
  Array.prototype.filter = function (...args: Parameters<typeof originalFilter>) {
    if (this[0] === 'source' && this[1] === 'string') matches++;
    return originalFilter.apply(this, args);
  };
  let result;
  try {
    result = executeCompiled(compiled, bars);
  } finally {
    Array.prototype.filter = originalFilter;
  }
  expect(result?.errors).toEqual([]);
  expect(result?.plots.map((plot) => plot.values)).toEqual([Array(20).fill(6000), Array(20).fill(1)]);
  expect(matches).toBeLessThan(1000);
});
