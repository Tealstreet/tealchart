import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeCompiled, tryCompile } from './execute';

const bars = Array.from({ length: 100 }, (_, i) => ({
  time: 1788134400000 + i * 120000,
  open: 1,
  high: 3,
  low: 1,
  close: 2,
  volume: 1,
}));
const source = `//@version=6
indicator("drawing getter allocation")
var line id = line.new(0, 7, 1, 7)
float value = 0
for i = 0 to 19999
    value += line.get_y1(id)
plot(value)`;

describe('compiled positional drawing getter allocation', () => {
  it('avoids a named-argument Map allocation per positional getter', () => {
    const compiled = tryCompile(parse(source));
    expect(compiled.success).toBe(true);
    const OriginalMap = globalThis.Map;
    let allocations = 0;
    globalThis.Map = new Proxy(OriginalMap, {
      construct(target, args) {
        allocations++;
        return Reflect.construct(target, args);
      },
    });
    let result;
    try {
      result = executeCompiled(compiled, bars);
    } finally {
      globalThis.Map = OriginalMap;
    }
    expect(result?.errors).toEqual([]);
    expect(result?.plots[0].values).toEqual(Array(100).fill(140000));
    expect(allocations).toBeLessThan(10000);
  });

  it('runs the minimal drawing getter loop within its CPU budget', () => {
    const compiled = tryCompile(parse(source));
    expect(compiled.success).toBe(true);
    const timingBars = Array.from({ length: 1000 }, (_, i) => ({ ...bars[0], time: bars[0].time + i * 120000 }));
    const start = process.cpuUsage();
    const result = executeCompiled(compiled, timingBars);
    const cpu = process.cpuUsage(start);
    const elapsed = (cpu.user + cpu.system) / 1000;
    console.log('drawing-getter-loop-cpu-ms', elapsed);
    expect(result?.errors).toEqual([]);
    expect(result?.plots[0].values).toEqual(Array(1000).fill(140000));
    if (process.env.TEALSCRIPT_PERF_ASSERT === '1') expect(elapsed).toBeLessThan(2000);
  });
  it('preserves named ID binding and isolates successive named records', () => {
    const compiled = tryCompile(
      parse(`//@version=6
indicator("named getters")
var line id = line.new(0, 7, 1, 7)
line.set_y1(id, 7)
plot(line.get_y1(id=id), "named")
line.set_y1(y=9, id=id)
plot(line.get_y1(id), "positional")
plot(line.get_y1(id=line(na)), "missing")`),
    );
    expect(compiled.success).toBe(true);
    const result = executeCompiled(compiled, bars);
    expect(result?.errors).toEqual([]);
    expect(result?.plots[0].values).toEqual(Array(100).fill(7));
    expect(result?.plots[1].values).toEqual(Array(100).fill(9));
    expect(result?.plots[2].values).toEqual(Array(100).fill(null));
  });
  it('makes the shared empty named map immutable', () => {
    const compiled = tryCompile(parse(source.replace('float value = 0', 'line.set_y1(id, 7)\nfloat value = 0')));
    const originalHas = Map.prototype.has;
    const emptyNamedMaps = new Set<Map<string, unknown>>();
    Map.prototype.has = function (key: unknown): boolean {
      if (key === 'id' && this.size === 0) emptyNamedMaps.add(this);
      return originalHas.call(this, key);
    };
    try {
      executeCompiled(compiled, bars.slice(0, 1));
    } finally {
      Map.prototype.has = originalHas;
    }
    expect(emptyNamedMaps.size).toBe(1);
    for (const map of emptyNamedMaps) {
      expect(() => map.set('id', 'poison')).toThrow('immutable');
      expect(() => map.delete('id')).toThrow('immutable');
      expect(() => map.clear()).toThrow('immutable');
      expect(map.size).toBe(0);
    }
  });
  it('reads live label updates and preserves expired or missing handles', () => {
    const compiled = tryCompile(
      parse(`//@version=6
indicator("getter lifecycle")
var line id = line.new(0, 7, 1, 7)
var label textId = label.new(0, 7, "before")
label.set_text(textId, "after")
plot(str.length(label.get_text(textId)), "text")
line.delete(id)
plot(line.get_y1(id), "expired")
plot(line.get_y1(line(na)), "missing line")
plot(na(label.get_text(label(na))) ? 1 : 0, "missing label")`),
    );
    expect(compiled.success).toBe(true);
    const result = executeCompiled(compiled, bars);
    expect(result?.errors).toEqual([]);
    expect(result?.plots[0].values).toEqual(Array(100).fill(5));
    expect(result?.plots[1].values).toEqual(Array(100).fill(null));
    expect(result?.plots[2].values).toEqual(Array(100).fill(null));
    expect(result?.plots[3].values).toEqual(Array(100).fill(1));
  });
});
