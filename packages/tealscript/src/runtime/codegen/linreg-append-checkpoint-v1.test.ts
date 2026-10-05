import { expect, it, vi } from 'vitest';

import { NumericSeries } from './runtime';
import { LinReg } from './ta-classes';

// Archive reference/pine-v6-reference-v1.json entries[684]: ta.linreg formula.
it('keeps private LinReg undo independent of public full copies', () => {
  const spy = vi.spyOn(NumericSeries.prototype, 'save');
  try {
    const regression = new LinReg(7, 0);
    for (let index = 0; index < 40; index++) regression.compute(index);
    expect(spy).toHaveBeenCalledTimes(0);
    const saved = regression.save();
    expect(spy).toHaveBeenCalledTimes(1);
    regression.compute(1000);
    regression.restore(saved);
    expect(regression.save()).toEqual(saved);
  } finally {
    spy.mockRestore();
  }
});

// Archive reference/pine-v6-reference-v1.json entries[684]: ta.linreg source/offset.
it('restores the overwritten slot on repeated LinReg recomputations', () => {
  for (const length of [2, 7, 32]) {
    const regression = new LinReg(length, 0);
    const reference = new LinReg(length, 0);
    for (let index = 0; index < 100; index++) {
      const before = reference.save();
      expect(regression.compute(index)).toBe(reference.compute(index));
      for (const replacement of [1000, -10, 0]) {
        reference.restore(before);
        expect(regression.recompute(replacement)).toBe(reference.compute(replacement));
      }
    }
  }
});

// Archive reference/pine-v6-reference-v1.json entries[684]: ta.linreg source/offset.
it('preserves missing sources and offset paths across LinReg rollback', () => {
  for (const offset of [NaN, -2, 0, 3]) {
    const exact = new LinReg(3, offset);
    exact.compute(1);
    exact.compute(2);
    expect(exact.compute(3)).toBe(Number.isNaN(offset) ? NaN : 3 - offset);
    expect(exact.recompute(NaN)).toBeNaN();
    expect(exact.recompute(3)).toBe(Number.isNaN(offset) ? NaN : 3 - offset);
  }
  for (const offset of [NaN, -2, 0, 3]) {
    const regression = new LinReg(3, offset);
    const reference = new LinReg(3, offset);
    for (const value of [1, 3, 7, NaN, 12, 15, 20, 25]) {
      const before = reference.save();
      expect(regression.compute(value)).toBe(reference.compute(value));
      for (const replacement of [NaN, 9]) {
        reference.restore(before);
        expect(regression.recompute(replacement)).toBe(reference.compute(replacement));
      }
    }
  }
});

// Archive reference/pine-v6-reference-v1.json entries[684]: ta.linreg source/offset.
it('keeps public LinReg snapshots independent and clears private undo on restore', () => {
  const regression = new LinReg(3, 1);
  for (const value of [2, 4, 8]) regression.compute(value);
  const saved = regression.save();
  const savedBytes = Array.from(saved.series.buf);
  regression.compute(999);
  regression.compute(888);
  expect(Array.from(saved.series.buf)).toEqual(savedBytes);
  regression.restore(saved);
  const reference = new LinReg(3, 1);
  reference.restore(saved);
  expect(regression.recompute(16)).toBe(reference.compute(16));
});
