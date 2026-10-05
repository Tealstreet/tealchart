import { describe, expect, it } from 'vitest';

import { ExecutionContext } from '../context';
import { Scope } from '../scope';
import { registerLineBuiltins, registerBoxBuiltins, registerLabelBuiltins, type DrawingBuiltinRuntime } from '../builtins/drawings';
import type { BuiltinRegistry } from '../builtins/registry';
import type { DrawingOutput } from '../drawings/types';
import { getDrawingValue } from '../drawings/helpers';

import { parse } from '../../parser';
import { executeCompiled, tryCompile } from './execute';

const bars = Array.from({ length: 16 }, (_, i) => ({ time: 1788134400000 + i * 120000, open: 1, high: 3, low: 1, close: 2, volume: 1 }));

// ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json: functions line.get_y2, line.get_x1/x2, box.get_*, label.get_*.
const getters = [
  ['line.get_x1', 'line.new(3, 7, 11, 13)', 3],
  ['line.get_x2', 'line.new(3, 7, 11, 13)', 11],
  ['line.get_y2', 'line.new(3, 7, 11, 13)', 13],
  ['box.get_left', 'box.new(3, 13, 11, 7)', 3],
  ['box.get_right', 'box.new(3, 13, 11, 7)', 11],
  ['box.get_top', 'box.new(3, 13, 11, 7)', 13],
  ['box.get_bottom', 'box.new(3, 13, 11, 7)', 7],
  ['label.get_x', 'label.new(3, 13)', 3],
  ['label.get_y', 'label.new(3, 13)', 13],
] as const;

describe('single-ID drawing getter positional dispatch', () => {
  it.each(getters)('%s avoids per-read named binding and retains its field', (name, constructor, expected) => {
    const compiled = tryCompile(parse(`//@version=6
indicator("positional getters")
var id = ${constructor}
float value = 0
for i = 0 to 2047
    value += ${name}(id)
plot(value)`));
    expect(compiled.success).toBe(true);
    const originalHas = Map.prototype.has;
    let bindings = 0;
    Map.prototype.has = function (key: unknown): boolean { if (key === 'id') bindings++; return originalHas.call(this, key); };
    let result;
    try { result = executeCompiled(compiled, bars); } finally { Map.prototype.has = originalHas; }
    expect(result?.errors).toEqual([]);
    expect(result?.plots[0].values).toEqual(Array(16).fill(expected * 2048));
    expect(bindings).toBeLessThan(4000);
  });

  it('uses the same live registered reader for a positional receiver', () => {
    const compiled = tryCompile(parse(`//@version=6
indicator("receiver Y2")
var id = line.new(0, 7, 1, 13)
float value = 0
for i = 0 to 2047
    value += id.get_y2()
plot(value)`));
    const originalHas = Map.prototype.has;
    let bindings = 0;
    Map.prototype.has = function (key: unknown): boolean { if (key === 'id') bindings++; return originalHas.call(this, key); };
    let result;
    try { result = executeCompiled(compiled, bars); } finally { Map.prototype.has = originalHas; }
    expect(result?.errors).toEqual([]);
    expect(result?.plots[0].values).toEqual(Array(16).fill(13 * 2048));
    expect(bindings).toBeLessThan(4000);
  });

  it('reduces CPU against the unchanged named-ID route', () => {
    const run = (named: boolean) => {
      const compiled = tryCompile(parse(`//@version=6
indicator("Y2 CPU")
var id = line.new(0, 7, 1, 13)
float value = 0
for i = 0 to 8191
    value += line.get_y2(${named ? 'id=id' : 'id'})
plot(value)`));
      const start = process.cpuUsage();
      const result = executeCompiled(compiled, Array.from({ length: 512 }, (_, i) => ({ ...bars[0], time: bars[0].time + i * 120000 })));
      const cpu = process.cpuUsage(start);
      expect(result?.errors).toEqual([]);
      expect(result?.plots[0].values).toEqual(Array(512).fill(13 * 8192));
      return cpu.user + cpu.system;
    };
    const ratios = [0, 1, 2].map(i => {
      if (i % 2) { const positional = run(false); return positional / run(true); }
      const named = run(true); return run(false) / named;
    }).sort((a, b) => a - b);
    console.log('Y2 positional/named CPU ratios', ratios);
    if (process.env.TEALSCRIPT_PERF_ASSERT === '1') expect(ratios[1]).toBeLessThan(0.65);
  });

  it('retains named IDs and live Y2 mutations', () => {
    const compiled = tryCompile(parse(`//@version=6
indicator("live named Y2")
var id = line.new(0, 7, 1, 13)
line.set_y2(id, 17)
plot(line.get_y2(id=id))
line.set_y2(id=id, y=19)
plot(line.get_y2(id))`));
    const result = executeCompiled(compiled, bars);
    expect(result?.errors).toEqual([]);
    expect(result?.plots.map(p => p.values)).toEqual([Array(16).fill(17), Array(16).fill(19)]);
  });

  it('retains missing and expired Y2 handles', () => {
    const compiled = tryCompile(parse(`//@version=6
indicator("Y2 handles")
line id = line.new(0, 7, 1, 13)
plot(line.get_y2(id))
line.delete(id)
plot(line.get_y2(id))
plot(line.get_y2(line(na)))
plot(line.get_y2(id=line(na)))`));
    const result = executeCompiled(compiled, bars);
    expect(result?.errors).toEqual([]);
    expect(result?.plots.map(p => p.values)).toEqual([Array(16).fill(13), ...Array.from({ length: 3 }, () => Array(16).fill(null))]);
  });
});


describe('Y2 registered reader handle checks', () => {
  it('retains wrong-family rejection in positional and named routes', () => {
    const ctx = new ExecutionContext();
    ctx.addDrawing({ id: 'other', type: 'label', barIndex: 0, x: 3, y: 13, text: 'label', xloc: 'bar_index', yloc: 'price', style: 'label_up', color: null, textColor: null, size: 'normal' });
    Object.assign(ctx.getDrawing('other')!, { y2: 101 });
    const builtins: BuiltinRegistry = new Map();
    const runtime = {
      isNa: Number.isNaN,
      getLineValue: (value, context, read) => getDrawingValue(value, context, 'line', Number.isNaN, read),
    } as DrawingBuiltinRuntime;
    registerLineBuiltins(builtins, runtime);
    const getter = builtins.get('line.get_y2')!;
    expect(getter.positionalSingleArgument!('other', ctx)).toBeNaN();
    expect(getter([], new Map([['id', 'other']]), ctx, new Scope(), 'named')).toBeNaN();
  });
});


// Non-reference sibling extensions retain their existing runtime fields; no new Pine admission claim.
const siblingFields = [
  ['label.get_xloc', 'xloc', 'bar_time'], ['label.get_yloc', 'yloc', 'price'],
  ['label.get_style', 'style', 'label_up'], ['label.get_color', 'color', '#123456'],
  ['label.get_textcolor', 'textColor', '#654321'], ['label.get_size', 'size', 'small'],
  ['label.get_tooltip', 'tooltip', 'tip'], ['line.get_color', 'color', '#123456'],
  ['line.get_extend', 'extend', 'both'], ['line.get_style', 'style', 'dashed'],
  ['line.get_width', 'width', 3], ['box.get_bgcolor', 'bgcolor', '#123456'],
  ['box.get_border_color', 'borderColor', '#654321'], ['box.get_text', 'text', 'box'],
  ['box.get_text_halign', 'textHalign', 'left'], ['box.get_text_valign', 'textValign', 'top'],
] as const;

describe('existing single-ID sibling runtime fields', () => {
  it.each(siblingFields)('%s preserves its registered positional and named values', (name, field, expected) => {
    const ctx = new ExecutionContext();
    const family = name.split('.')[0] as 'line' | 'label' | 'box';
    ctx.addDrawing({ id: 'valid', type: family, barIndex: 0, x: 1, y: 2, x1: 1, x2: 2, y1: 3, y2: 4, left: 1, right: 2, top: 3, bottom: 4, xloc: 'bar_index', yloc: 'price', text: '', style: 'solid', color: null, textColor: null, size: 'normal', extend: 'none', width: 1, borderColor: null, borderWidth: 1, borderStyle: 'solid', bgcolor: null, textSize: 'normal', [field]: expected } as DrawingOutput);
    const builtins: BuiltinRegistry = new Map();
    const runtime = { isNa: Number.isNaN, getLineValue: (value, context, read) => getDrawingValue(value, context, 'line', Number.isNaN, read) } as DrawingBuiltinRuntime;
    registerLineBuiltins(builtins, runtime);
    registerBoxBuiltins(builtins, runtime);
    registerLabelBuiltins(builtins, runtime);
    const getter = builtins.get(name)!;
    expect(getter.positionalSingleArgument).toBeTypeOf('function');
    expect(getter.positionalSingleArgument!('valid', ctx)).toBe(expected);
    expect(getter([], new Map([['id', 'valid']]), ctx, new Scope(), 'named')).toBe(expected);
  });
});
