import type { Bar } from '../../src/runtime/context';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';
import { TSI } from '../../src/runtime/codegen/ta-classes';
import { checkProgram } from '../../src/semantic/checker';

function seededFlatState() {
  const state = new TSI(2, 3);
  for (let index = 0; index < 5; index += 1) state.compute(100);
  return state;
}

describe('TSI exact-zero denominator', () => {
  it.each([5, 6])('keeps an all-flat source missing in v%i', (version) => {
    const ast = parse(`//@version=${version}
indicator("TSI flat momentum")
source = bar_index % 8 <= 1 ? 100 : bar_index % 8 <= 4 ? 101 : bar_index % 8 <= 6 ? 99 : 103
value = ta.tsi(100.0, 2, 3)
plot(value, "Value")
plot(na(value) ? 1 : 0, "Missing")
plot(nz(value, 123456.0), "Sentinel")
plot(ta.tsi(source, 2, 3), "Movement")`);
    expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const bars: Bar[] = Array.from({ length: 32 }, (_, index) => ({
      time: Date.UTC(2026, 9, 7) + index * 120000,
      open: 100, high: 110, low: 90, close: 100, volume: 100,
    }));
    const execution = executeCompiledScript(ast, bars, new Map());
    expect(execution.status).toBe('success');
    if (execution.status !== 'success') throw new Error(execution.reason);
    expect(execution.result.errors).toEqual([]);
    expect(execution.result.profile.swallowedErrors).toBeUndefined();
    const [values, missing, sentinel, movement] = execution.result.plots.map((plot) => plot.values);
    expect(values).toEqual(Array(32).fill(null));
    expect(missing).toEqual(Array(32).fill(1));
    expect(sentinel).toEqual(Array(32).fill(123456));
    expect(movement.slice(0, 8)).toEqual([null, null, null, null, 1,
      -0.6551724137931034, -0.7647058823529412, 0.5917636526410027]);
  });

  it.each([1, -1])('keeps finite one-sided momentum ratios for direction %i', (direction) => {
    const state = new TSI(2, 3);
    const values = Array.from({ length: 8 }, (_, index) => state.compute(direction * index));
    expect(values.slice(0, 4).every(Number.isNaN)).toBe(true);
    expect(values.slice(4)).toEqual(Array(4).fill(direction));
  });

  it('keeps zero numerator with a nonzero denominator as finite zero', () => {
    const state = new TSI(2, 2);
    expect(state.compute(0)).toBeNaN();
    expect(state.compute(1)).toBeNaN();
    expect(state.compute(2)).toBeNaN();
    expect(state.compute(0)).toBe(0);
  });

  it('divides arbitrarily small nonzero momentum without an epsilon cutoff', () => {
    const state = new TSI(1, 1);
    expect(state.compute(0)).toBeNaN();
    expect(state.compute(1e-300)).toBe(1);
    expect(state.compute(0)).toBe(-1);
  });

  it('recomputes a speculative movement from the pre-bar flat state', () => {
    const state = seededFlatState();
    expect(state.compute(101)).toBe(1);
    expect(state.recompute(100)).toBeNaN();
    expect(state.recompute(101)).toBe(1);
    expect(state.compute(101)).toBe(1);
  });

  it('restores independent public snapshots before and after movement', () => {
    const state = seededFlatState();
    const flat = state.save();
    expect(state.compute(101)).toBe(1);
    const moved = state.save();
    state.compute(99);
    state.restore(flat);
    expect(state.compute(100)).toBeNaN();
    state.restore(flat);
    expect(state.compute(101)).toBe(1);
    state.restore(moved);
    expect(state.compute(101)).toBe(1);
  });

  it('keeps source-hole adjacency missing and resumes the existing smoothing state', () => {
    const state = seededFlatState();
    expect(state.compute(101)).toBe(1);
    expect(state.compute(NaN)).toBeNaN();
    expect(state.compute(100)).toBeNaN();
    expect(state.compute(101)).toBe(1);
  });
});
