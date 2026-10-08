import type { Bar } from '../../src/runtime/context';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';
import { VWAP } from '../../src/runtime/codegen/ta-classes';
import { checkProgram } from '../../src/semantic/checker';

function sourceHolePlots(bands: boolean, binding: 'positional' | 'named' | 'mixed' = 'positional') {
  const scalar = binding === 'named' ? 'ta.vwap(source=source, anchor=anchor)'
    : binding === 'mixed' ? 'ta.vwap(source=source, anchor)' : 'ta.vwap(source, anchor)';
  const ast = parse(`//@version=6
indicator("VWAP finite-volume source hole")
anchor = bar_index == 0 or bar_index == 6
source = bar_index == 3 ? float(na) : close
${bands ? '[value, upper, lower] = ta.vwap(source, anchor, 1.0)' : `value = ${scalar}`}
plot(value, "Value")
plot(na(value) ? 1 : 0, "Missing")
plot(nz(value, 123456.0), "Sentinel")
plot(ta.vwap(close, anchor), "Clean")
${bands ? 'plot(upper, "Upper")\nplot(lower, "Lower")' : ''}`);
  expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  const bars: Bar[] = Array.from({ length: 8 }, (_, index) => ({
    time: Date.UTC(2026, 9, 7) + index * 120000,
    open: 10 * (index + 1),
    high: 10 * (index + 1) + 1,
    low: 10 * (index + 1) - 1,
    close: 10 * (index + 1),
    volume: 1,
  }));
  const execution = executeCompiledScript(ast, bars, new Map());
  expect(execution.status).toBe('success');
  if (execution.status !== 'success') throw new Error(execution.reason);
  expect(execution.result.errors).toEqual([]);
  expect(execution.result.profile.swallowedErrors).toBeUndefined();
  return execution.result.plots.map((plot) => plot.values);
}

describe('VWAP finite-volume source holes', () => {
  it.each(['ta.vwap(close)', 'ta.vwap(source=close)', 'ta.vwap'])(
    'preserves the held omitted-anchor behavior of %s',
    (expression) => {
      const ast = parse(`//@version=6
indicator("VWAP omitted-anchor preservation")
plot(${expression})`);
      expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
      const bars: Bar[] = Array.from({ length: 8 }, (_, index) => ({
        time: Date.UTC(2026, 9, 7) + index * 120000,
        open: 10 * (index + 1),
        high: index === 3 ? NaN : 10 * (index + 1) + 1,
        low: index === 3 ? NaN : 10 * (index + 1) - 1,
        close: index === 3 ? NaN : 10 * (index + 1),
        volume: 1,
      }));
      const execution = executeCompiledScript(ast, bars, new Map());
      expect(execution.status).toBe('success');
      if (execution.status !== 'success') throw new Error(execution.reason);
      expect(execution.result.errors).toEqual([]);
      expect(execution.result.plots[0].values).toEqual([10, 15, 20, null, 27.5, 34, 40, 320 / 7]);
    },
  );

  it('keeps the captured missing mask and sentinel until the next anchor', () => {
    const [values, missing, sentinel, clean] = sourceHolePlots(false);
    expect(values).toEqual([10, 15, 20, null, null, null, 70, 75]);
    expect(missing).toEqual([0, 0, 0, 1, 1, 1, 0, 0]);
    expect(sentinel).toEqual([10, 15, 20, 123456, 123456, 123456, 70, 75]);
    expect(clean).toEqual([10, 15, 20, 25, 30, 35, 70, 75]);
  });

  it.each(['named', 'mixed'] as const)('selects the explicit-anchor policy for %s arguments', (binding) => {
    const [values, missing, sentinel] = sourceHolePlots(false, binding);
    expect(values).toEqual([10, 15, 20, null, null, null, 70, 75]);
    expect(missing).toEqual([0, 0, 0, 1, 1, 1, 0, 0]);
    expect(sentinel).toEqual([10, 15, 20, 123456, 123456, 123456, 70, 75]);
  });

  it('carries the poisoned weighted state into band output and resets it', () => {
    const [values, missing, , clean, upper, lower] = sourceHolePlots(true);
    expect(values).toEqual([10, 15, 20, null, null, null, 70, 75]);
    expect(missing).toEqual([0, 0, 0, 1, 1, 1, 0, 0]);
    expect(clean).toEqual([10, 15, 20, 25, 30, 35, 70, 75]);
    expect(upper.slice(3)).toEqual([null, null, null, 70, 80]);
    expect(lower.slice(3)).toEqual([null, null, null, 70, 70]);
  });

  it('retains a missing source in the period accumulators', () => {
    const state = new VWAP(false, NaN, true);
    expect(state.compute(10, true, 2)).toBe(10);
    expect(state.compute(NaN, false, 3)).toBeNaN();
    expect(state.compute(30, false, 5)).toBeNaN();
    expect(state.save().cumTpv).toBeNaN();
    expect(state.save().cumSourceSquaredVolume).toBeNaN();
    expect(state.save().cumVolume).toBe(10);
    expect(state.compute(40, true, 2)).toBe(40);
  });

  it('undoes a speculative missing source before recomputing the same bar', () => {
    const state = new VWAP(false, NaN, true);
    expect(state.compute(10, true, 1)).toBe(10);
    expect(state.compute(NaN, false, 1)).toBeNaN();
    expect(state.recompute(20, false, 1)).toBe(15);
    expect(state.compute(30, false, 1)).toBe(20);
  });

  it('does not heal a prior poisoned period during a finite recompute', () => {
    const state = new VWAP(false, NaN, true);
    state.compute(10, true, 1);
    state.compute(NaN, false, 1);
    expect(state.compute(20, false, 1)).toBeNaN();
    expect(state.recompute(30, false, 1)).toBeNaN();
    expect(state.recompute(60, true, 1)).toBe(60);
    expect(state.recompute(70, false, 1)).toBeNaN();
  });

  it('restores independent finite and poisoned public snapshots', () => {
    const state = new VWAP(false, NaN, true);
    state.compute(10, true, 1);
    const finite = state.save();
    state.compute(NaN, false, 1);
    const poisoned = state.save();
    expect(state.compute(20, true, 1)).toBe(20);
    state.restore(poisoned);
    expect(state.compute(30, false, 1)).toBeNaN();
    state.restore(finite);
    expect(state.compute(20, false, 1)).toBe(15);
    expect(finite.cumTpv).toBe(10);
    expect(finite.cumVolume).toBe(1);
    expect(poisoned.cumTpv).toBeNaN();
  });

  it('preserves the existing interior missing-volume-only skip', () => {
    const state = new VWAP(false, NaN, true);
    expect(state.compute(10, true, 1)).toBe(10);
    expect(state.compute(20, false, NaN)).toBeNaN();
    expect(state.compute(30, false, 1)).toBe(20);
    expect(state.compute(40, true, NaN)).toBeNaN();
    expect(state.compute(50, false, 1)).toBeNaN();
    expect(state.compute(60, true, 1)).toBe(60);
  });

  it('waits for the first explicit anchor even with finite source and volume', () => {
    const state = new VWAP(false, NaN, true);
    expect(state.compute(10, false, 1)).toBeNaN();
    expect(state.compute(20, false, 1)).toBeNaN();
    expect(state.compute(30, true, 1)).toBe(30);
  });
});
