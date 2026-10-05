import { expect, it, vi } from 'vitest';

import { NumericSeries } from './runtime';
import { WMA } from './ta-classes';

it('keeps private hole-filled WMA undo independent of full public copies', () => {
  const spy = vi.spyOn(NumericSeries.prototype, 'save');
  try {
    const wma = new WMA(64, true);
    for (let i = 0; i < 300; i++) wma.compute(i);
    expect(spy).toHaveBeenCalledTimes(0);
    const snapshot = wma.save();
    expect(spy).toHaveBeenCalledTimes(1);
    wma.compute(999);
    wma.restore(snapshot);
    expect(wma.save()).toEqual(snapshot);
  } finally {
    spy.mockRestore();
  }
});

it('matches full-snapshot WMA through wraps, missing carries and repeated recomputation', () => {
  let seed = 434;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  for (const length of [1, 2, 7, 64]) {
    const wma = new WMA(length, true);
    let state = { values: [] as number[], lastSource: NaN, validCount: 0 };
    const copy = () => ({ ...state, values: state.values.slice() });
    const advance = (value: number) => {
      if (!Number.isNaN(value)) {
        state.lastSource = value;
        state.validCount = Math.min(length, state.validCount + 1);
      }
      state.values = [...state.values, state.lastSource].slice(-length);
      if (Number.isNaN(value) || state.validCount < length) return NaN;
      let weighted = 0;
      let weights = 0;
      for (let i = 0; i < state.values.length; i++) {
        weighted += state.values[i]! * (i + 1);
        weights += i + 1;
      }
      return weighted / weights;
    };
    for (let i = 0; i < 1200; i++) {
      const input = [NaN, 0, -0, Infinity, -Infinity, (random() % 99) - 49][random() % 6]!;
      const before = copy();
      expect(Object.is(wma.compute(input), advance(input))).toBe(true);
      if (i % 5 === 0) {
        for (const replacement of [17, NaN, -0]) {
          state = { ...before, values: before.values.slice() };
          expect(Object.is(wma.recompute(replacement), advance(replacement))).toBe(true);
        }
      }
      if (i % 23 === 0) {
        const saved = wma.save();
        const reference = copy();
        wma.compute(777);
        wma.compute(NaN);
        wma.restore(saved);
        state = reference;
        expect(Object.is(wma.compute(3), advance(3))).toBe(true);
      }
    }
  }
});

it('rolls back a partial bar before restoring and advancing again', () => {
  const wma = new WMA(4, true);
  for (const value of [1, 2, 3, 4]) wma.compute(value);
  const closedBar = wma.save();
  wma.compute(100);
  expect(Number.isNaN(wma.recompute(NaN))).toBe(true);
  expect(wma.compute(5)).toBe(4.3);
  wma.restore(closedBar);
  expect(wma.save()).toEqual(closedBar);
  expect(wma.compute(5)).toBe(4);
});
