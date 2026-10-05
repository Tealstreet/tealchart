import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeCompiled, tryCompile } from './execute';

const bars = Array.from({ length: 200 }, (_, index) => ({
  time: 1788134400000 + index * 120000,
  open: 1,
  high: 3,
  low: 1,
  close: 2,
  volume: 1,
}));
function source(method: boolean) {
  return `//@version=6
indicator("drawing receiver dispatch")
type Level
    line ln
var state = Level.new(line.new(0, 7, 1, 7))
float checksum = 0
for i = 0 to 4999
    ${method ? 'state.ln.set_x2(bar_index)' : 'line.set_x2(state.ln, bar_index)'}
    checksum += ${method ? 'state.ln.get_y2()' : 'line.get_y2(state.ln)'}
plot(checksum)`;
}
function run(pine: string, count = 3) {
  const compiled = tryCompile(parse(pine));
  expect(compiled.success).toBe(true);
  const result = executeCompiled(compiled, bars.slice(0, count));
  expect(result?.errors).toEqual([]);
  return result!;
}

describe('drawing receiver argument dispatch', () => {
  it('matches namespace calls and reads live setter changes', () => {
    const method = run(source(true));
    const namespace = run(source(false));
    expect(method.plots).toEqual(namespace.plots);
    expect(method.drawings).toEqual(namespace.drawings);
    expect(method.plots[0].values).toEqual([35000, 35000, 35000]);
  });

  it('retains multiple positional arguments and successive named values', () => {
    const result = run(`//@version=6
indicator("drawing argument shapes")
var line id = line.new(0, 1, 1, 2)
id.set_xy2(bar_index + 2, 9)
plot(id.get_y2(), "multi")
id.set_y2(y=11)
plot(id.get_y2(), "named")
id.set_y2(y=13)
plot(id.get_y2(), "next")`);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      [9, 9, 9],
      [11, 11, 11],
      [13, 13, 13],
    ]);
    expect(result.drawings[0]).toMatchObject({ x2: 4, y2: 13 });
  });

  it('keeps deleted and missing drawing reads missing', () => {
    const result = run(
      `//@version=6
indicator("drawing lifecycle")
var line id = line.new(0, 7, 1, 7)
plot(id.get_y2(), "before")
id.delete()
plot(id.get_y2(), "deleted")
line absent = na
plot(absent.get_y2(), "missing")`,
      1,
    );
    expect(result.plots.map((plot) => plot.values)).toEqual([[7], [null], [null]]);
  });

  it('retains receiver methods on distinct drawing families', () => {
    const result = run(`//@version=6
indicator("drawing families")
var line trend = line.new(0, 7, 1, 7)
var box zone = box.new(0, 11, 1, 3)
var label tag = label.new(0, 7, "old")
trend.set_y2(9)
zone.set_top(13)
tag.set_text("new")
plot(trend.get_y2(), "line")
plot(zone.get_top(), "box")
plot(str.length(tag.get_text()), "label")`);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      [9, 9, 9],
      [13, 13, 13],
      [3, 3, 3],
    ]);
  });

  it('retains generic receiver families and local method precedence', () => {
    const result = run(`//@version=6
indicator("generic drawing receivers")
paint(id) =>
    id.set_bgcolor(color.red)
var box zone = box.new(0, 11, 1, 3)
var table panel = table.new(position.top_right, 1, 1)
paint(zone)
paint(panel)
method get_y2(line id) =>
    99.0
var line trend = line.new(0, 7, 1, 7)
plot(trend.get_y2(), "override")
plot(line.get_y2(trend), "namespace")`);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      [99, 99, 99],
      [7, 7, 7],
    ]);
    expect(result.drawings.filter((drawing) => drawing.type === 'box' || drawing.type === 'table')).toHaveLength(2);
    expect(result.drawings.find((drawing) => drawing.type === 'box')).toMatchObject({ bgcolor: '#F23645' });
    expect(result.drawings.find((drawing) => drawing.type === 'table')).toMatchObject({ bgcolor: '#F23645' });
  });

  const timingIt = process.env.TEALSCRIPT_PERF_ASSERT === '1' ? it : it.skip;
  timingIt('keeps receiver loop CPU close to equivalent namespace calls', () => {
    const method = tryCompile(parse(source(true)));
    const namespace = tryCompile(parse(source(false)));
    expect(method.success && namespace.success).toBe(true);
    executeCompiled(method, bars.slice(0, 20));
    executeCompiled(namespace, bars.slice(0, 20));
    const samples: { methodMs: number; namespaceMs: number; ratio: number }[] = [];
    function measure(compiled: typeof method) {
      const start = process.cpuUsage();
      const result = executeCompiled(compiled, bars);
      const cpu = process.cpuUsage(start);
      expect(result?.errors).toEqual([]);
      expect(result?.plots[0].values).toEqual(Array(200).fill(35000));
      return (cpu.user + cpu.system) / 1000;
    }
    for (let repeat = 0; repeat < 5; repeat++) {
      const methodMs = measure(method);
      const namespaceMs = measure(namespace);
      samples.push({ methodMs, namespaceMs, ratio: methodMs / namespaceMs });
    }
    const ratio = samples.map((sample) => sample.ratio).sort((left, right) => left - right)[2]!;
    console.info(JSON.stringify({ drawingReceiverCpuRatio: ratio, samples }));
    expect(ratio).toBeLessThan(1.25);
  });
});
