import { expect, it } from 'vitest';
import { NegativeVolumeIndex, PositiveVolumeIndex } from './ta-classes';

it('holds NVI and PVI when current or previous close is zero', () => {
  for (const [Index, volumes] of [[NegativeVolumeIndex, [3, 2, 1, .5, .25]], [PositiveVolumeIndex, [1, 2, 3, 4, 5]]] as const) {
    const index = new Index();
    const values = [10, 12, 0, 14, 21].map((close, i) => index.compute(close, close, close, close, volumes[i]));
    expect(values).toEqual([1, 1.2, 1.2, 1.2, 1.7999999999999998]);
  }
});

it('compares PVI volume against nz(previous volume, 0) after a missing observation', () => {
  const index = new PositiveVolumeIndex();
  const values = [10, 11, 12, 13].map((close, i) => index.compute(close, close, close, close, [NaN, 5, NaN, 6][i]));
  expect(values[0]).toBe(1);
  expect(values[1]).toBeCloseTo(1.1, 12);
  expect(values[2]).toBeCloseTo(1.1, 12);
  expect(values[3]).toBeCloseTo(1.1 + (1 / 12) * 1.1, 12);
});
