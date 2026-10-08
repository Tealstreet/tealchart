import type { Bar } from '../../src/runtime/context';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';
import { Stoch } from '../../src/runtime/codegen/ta-classes';
import { checkProgram } from '../../src/semantic/checker';

const finite = [null, null, 100 * 12 / 21, 100 * 13 / 21, 100 * 10 / 21,
  100 * 11 / 21, 100 * 12 / 21, 100 * 13 / 21, 100 * 10 / 21,
  100 * 11 / 21, 100 * 12 / 21, 100 * 13 / 21];

function boundHolePlots(kind: number) {
  const ast = parse(`//@version=6
indicator("Stoch independent bound holes")
finiteHigh = 20.0 + bar_index % 3
finiteLow = 1.0 + bar_index % 2
finiteClose = 11.0 + bar_index % 4
highSource = bar_index == 8 and ${kind} == 1 ? float(na) : finiteHigh
lowSource = bar_index == 8 and ${kind} == 2 ? float(na) : finiteLow
closeSource = bar_index == 8 and ${kind} == 3 ? float(na) : finiteClose
value = ta.stoch(closeSource, highSource, lowSource, 3)
plot(value, "Value")
plot(na(value) ? 1 : 0, "Missing")
plot(nz(value, 123456.0), "Sentinel")
plot(ta.stoch(finiteClose, finiteHigh, finiteLow, 3), "Clean")`);
  expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  const bars: Bar[] = Array.from({ length: 12 }, (_, index) => ({
    time: Date.UTC(2026, 9, 7) + index * 120000,
    open: 10, high: 15, low: 5, close: 11, volume: 100,
  }));
  const execution = executeCompiledScript(ast, bars, new Map());
  expect(execution.status).toBe('success');
  if (execution.status !== 'success') throw new Error(execution.reason);
  expect(execution.result.errors).toEqual([]);
  expect(execution.result.profile.swallowedErrors).toBeUndefined();
  return execution.result.plots.map((plot) => plot.values);
}

describe('Stoch independent bound holes', () => {
  it.each([1, 2])('holds the native previous value for missing bound kind %i', (kind) => {
    const [values, missing, sentinel, clean] = boundHolePlots(kind);
    const expected = [...finite];
    expected[8] = finite[7];
    expected[9] = kind === 1 ? 100 * 11 / 19 : 50;
    expected[10] = kind === 1 ? 60 : 100 * 12 / 21;
    expect(values).toEqual(expected);
    expect(missing).toEqual([1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(sentinel).toEqual(expected.map((value) => value ?? 123456));
    expect(clean).toEqual(finite);
  });

  it('keeps finite-source values and physical-sample warmup', () => {
    const [values, missing] = boundHolePlots(0);
    expect(values).toEqual(finite);
    expect(missing).toEqual([1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('keeps the existing current-source-hole hold', () => {
    const [values, missing] = boundHolePlots(3);
    const expected = [...finite];
    expected[8] = finite[7];
    expect(values).toEqual(expected);
    expect(missing).toEqual([1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('holds a finite value when the whole bound window has zero range', () => {
    const state = new Stoch(3);
    state.compute(5, 9, 1);
    state.compute(5, 9, 1);
    expect(state.compute(5, 9, 1)).toBe(50);
    expect(state.compute(5, 5, 5)).toBe(50);
    expect(state.compute(5, 5, 5)).toBe(50);
    expect(state.compute(5, 5, 5)).toBe(50);
  });

  it.each(['high', 'low'])('recomputes a speculative %s hole from the prior windows', (bound) => {
    const state = new Stoch(3);
    state.compute(11, 21, 1);
    state.compute(11, 21, 1);
    expect(state.compute(11, 21, 1)).toBe(50);
    expect(state.compute(13, bound === 'high' ? NaN : 22, bound === 'low' ? NaN : 2)).toBe(50);
    expect(state.recompute(13, 22, 2)).toBe(100 * 12 / 21);
    expect(state.compute(14, 23, 3)).toBe(100 * 13 / 22);
  });

  it('restores independent public snapshots of each bound window and value', () => {
    const state = new Stoch(3);
    state.compute(11, 21, 1);
    state.compute(11, 21, 1);
    state.compute(11, 21, 1);
    const prior = state.save();
    expect(state.compute(13, NaN, 2)).toBe(50);
    const afterHole = state.save();
    expect(state.compute(14, 23, 3)).toBe(100 * 13 / 22);
    state.restore(prior);
    expect(state.compute(13, NaN, 2)).toBe(50);
    state.restore(prior);
    expect(state.compute(13, 22, 2)).toBe(100 * 12 / 21);
    state.restore(afterHole);
    expect(state.compute(14, 23, NaN)).toBe(50);
    state.restore(afterHole);
    expect(state.compute(14, 23, 3)).toBe(100 * 13 / 22);
    expect(prior.value).toBe(50);
    expect(afterHole.value).toBe(50);
  });
});
