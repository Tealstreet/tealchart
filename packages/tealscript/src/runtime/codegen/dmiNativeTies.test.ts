import { describe, expect, it } from 'vitest';
import { DMI } from './ta-classes';

describe('DMI directional movement ties', () => {
  it('zeroes both movements for the native decimal tie at row 223', () => {
    const dmi = new DMI(1, 1);
    dmi.compute(98.846, 98.84, 98.843);
    expect(dmi.compute(98.848, 98.838, 98.84).slice(0, 2)).toEqual([0, 0]);
  });
  it('zeroes both movements for the native decimal tie at row 491', () => {
    const dmi = new DMI(1, 1);
    dmi.compute(98.966, 98.954, 98.96);
    expect(dmi.compute(98.971, 98.949, 98.952).slice(0, 2)).toEqual([0, 0]);
  });
  it('retains unequal positive and contracting movement controls', () => {
    const dmi = new DMI(1, 1);
    dmi.compute(10, 5, 7);
    expect(dmi.compute(12, 4, 8).slice(0, 2)).toEqual([25, 0]);
    expect(dmi.compute(13, 2, 8).slice(0, 2)).toEqual([0, 100 * 2 / 11]);
    expect(dmi.compute(12, 3, 8).slice(0, 2)).toEqual([0, 0]);
  });
});
