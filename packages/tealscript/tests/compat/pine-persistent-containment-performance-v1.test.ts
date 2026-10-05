import { expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

it('revisits scalar UDT fields without cycle bookkeeping overhead', () => {
  const bars = Array.from({ length: 512 }, (_, index) => ({
    ...compatibilityBars[0],
    time: compatibilityBars[0].time + index * 120_000,
  }));
  const started = process.cpuUsage();
  const result = runCompatScript(`//@version=6
indicator("Persistent scalar graph")
type Level
    float price
type Snapshot
    array<Level> levels
var levels = array.new<Level>()
var state = Snapshot.new(levels)
if barstate.isfirst
    for i = 0 to 255
        levels.push(Level.new(float(i)))
for pass = 0 to 127
    state.levels := levels
lastLevel = levels.get(255)
lastLevel.price := float(bar_index)
plot(state.levels.size(), "Size")
plot(state.levels.get(255).price, "Last")`, { bars });
  const cpu = process.cpuUsage(started);
  expect(result.errors).toEqual([]);
  expect(getPlot(result, 'Size').values).toEqual(bars.map(() => 256));
  expect(getPlot(result, 'Last').values).toEqual(bars.map((_, index) => index));
  if (process.env.TEALSCRIPT_PERF_ASSERT === '1') {
    expect(cpu.user + cpu.system).toBeLessThan(3_000_000);
  }
});

it('retains new drawing descendants through cyclic aliases and copied containers', () => {
  const result = runCompatScript(`//@version=6
indicator("Mutable persistent cycles")
type Slot
    array<Slot> children
    line drawing
var pool = array.new<Slot>()
var slot = Slot.new(pool, na)
if barstate.isfirst
    pool.push(slot)
slot.drawing := line.new(bar_index, close, bar_index + 1, close)
copy = pool.copy()
slot.children := copy
pool.set(0, slot)
plot(line.get_y2(slot.drawing), "Drawing")`);
  expect(result.errors).toEqual([]);
  expect(getPlot(result, 'Drawing').values).toEqual(compatibilityBars.map((bar) => bar.close));
  expect(result.drawings).toHaveLength(compatibilityBars.length);
  expect(result.drawings.every((drawing) => drawing.persistent === true)).toBe(true);
});
