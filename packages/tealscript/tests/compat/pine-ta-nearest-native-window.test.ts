import { describe, expect, it } from 'vitest';

import { PercentileNearestRank } from '../../src/runtime/codegen/ta-classes';
import { getPlot, runCompatScript } from './fixtures';

// ranked-window-missing-slots-v2 attempt2, historical CSV SHA256 7964e9e2c555593b74f5c3aaac947f5dad7b6b6d6ce642ae8da4af469ec1f864.
const observations = [
  { length: 4, percentage: 25, shape: 'clean', start: 0, expected: [null, null, null, 10, 11, 12, 13, 10, 10, 10, 10, 11, 12, 13, 10, 10, 10, 10, 11, 12, 13, 10] },
  { length: 4, percentage: 50, shape: 'clean', start: 0, expected: [null, null, null, 11, 12, 13, 14, 14, 11, 11, 11, 12, 13, 14, 14, 11, 11, 11, 12, 13, 14, 14] },
  { length: 4, percentage: 75, shape: 'clean', start: 0, expected: [null, null, null, 12, 13, 14, 15, 15, 15, 12, 12, 13, 14, 15, 15, 15, 12, 12, 13, 14, 15, 15] },
  { length: 14, percentage: 25, shape: 'clean', start: 0, expected: [null, null, null, null, null, null, null, null, null, null, null, null, null, 11, 11, 11, 11, 11, 11, 11, 11, 11] },
  { length: 14, percentage: 50, shape: 'clean', start: 0, expected: [null, null, null, null, null, null, null, null, null, null, null, null, null, 13, 13, 13, 13, 13, 13, 13, 13, 13] },
  { length: 14, percentage: 75, shape: 'clean', start: 0, expected: [null, null, null, null, null, null, null, null, null, null, null, null, null, 15, 15, 15, 15, 15, 15, 15, 15, 15] },
  { length: 4, percentage: 25, shape: 'hole', start: 18, expected: [11, 12, 13, 14, 11, 11, 11, 11, 12, 13, 10, 10, 10, 10, 11, 12, 13, 10, 10, 10] },
  { length: 4, percentage: 50, shape: 'hole', start: 18, expected: [12, 13, 14, 15, 15, 12, 12, 12, 13, 14, 14, 11, 11, 11, 12, 13, 14, 14, 11, 11] },
  { length: 4, percentage: 75, shape: 'hole', start: 18, expected: [13, 14, 15, null, null, null, null, 13, 14, 15, 15, 15, 12, 12, 13, 14, 15, 15, 15, 12] },
  { length: 14, percentage: 25, shape: 'hole', start: 18, expected: [11, 11, 11, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 11, 11, 11] },
  { length: 14, percentage: 50, shape: 'hole', start: 18, expected: [13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13] },
  { length: 14, percentage: 75, shape: 'hole', start: 18, expected: [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15] },
  { length: 4, percentage: 25, shape: 'leading', start: 0, expected: [null, null, null, null, null, null, null, null, 10, 10, 10, 11, 12, 13, 10, 10, 10, 10, 11, 12, 13, 10] },
  { length: 4, percentage: 50, shape: 'leading', start: 0, expected: [null, null, null, null, null, null, null, 10, 11, 11, 11, 12, 13, 14, 14, 11, 11, 11, 12, 13, 14, 14] },
  { length: 4, percentage: 75, shape: 'leading', start: 0, expected: [null, null, null, null, null, null, 15, 15, 15, 12, 12, 13, 14, 15, 15, 15, 12, 12, 13, 14, 15, 15] },
  { length: 14, percentage: 25, shape: 'leading', start: 0, expected: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 10, 10, 11, 11, 11, 11, 11] },
  { length: 14, percentage: 50, shape: 'leading', start: 0, expected: [null, null, null, null, null, null, null, null, null, null, null, null, null, 11, 11, 11, 12, 12, 13, 13, 13, 13] },
  { length: 14, percentage: 75, shape: 'leading', start: 0, expected: [null, null, null, null, null, null, null, null, null, null, null, null, null, 15, 15, 15, 15, 15, 15, 15, 15, 15] },
];

const normalize = (value: number): number | null => Number.isNaN(value) ? null : value;
const sample = (bar: number, shape: string): number => (shape === 'leading' && bar < 5) || (shape === 'hole' && [20, 21].includes(bar % 64)) ? NaN : 10 + (bar % 64) % 7;

describe('captured TA nearest-rank missing slots', () => {
  for (const observation of observations) {
    const { length, percentage, shape, start, expected } = observation;
    it(`matches ${shape} length=${length} percentage=${percentage} in class and compiled execution`, () => {
      const count = start + expected.length;
      const instance = new PercentileNearestRank(length, percentage);
      const actual = Array.from({ length: count }, (_, bar) => normalize(instance.compute(sample(bar, shape))));
      expect(actual.slice(start)).toEqual(expected);
      const source = shape === 'leading' ? 'bar_index < 5 ? na : clean' : shape === 'hole' ? 'phase == 20 or phase == 21 ? na : clean' : 'clean';
      const result = runCompatScript(`//@version=6\nindicator("Native nearest slots")\nphase = bar_index % 64\nclean = 10.0 + phase % 7\nsource = ${source}\nplot(ta.percentile_nearest_rank(source, ${length}, ${percentage}), "OUTCOME")`, {
        bars: Array.from({ length: count }, (_, bar) => ({ time: 1000 + bar * 1000, open: 1, high: 2, low: 0, close: 1, volume: 1 })),
      });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'OUTCOME').values.slice(start)).toEqual(expected);
    });
  }

  it('replaces a same-bar missing sample without advancing the window', () => {
    const instance = new PercentileNearestRank(4, 75);
    for (let bar = 0; bar < 21; bar++) instance.compute(sample(bar, 'hole'));
    expect(normalize(instance.compute(NaN))).toBeNull();
    expect(instance.recompute(10)).toBe(15);
    expect(normalize(instance.recompute(NaN))).toBeNull();
    expect(normalize(instance.compute(11))).toBeNull();
  });

  it('restores physical history and ranked missing positions from a detached snapshot', () => {
    const instance = new PercentileNearestRank(4, 75);
    for (let bar = 0; bar < 22; bar++) instance.compute(sample(bar, 'hole'));
    const snapshot = instance.save();
    const continuation = [11, 12, 13, 14];
    expect(continuation.map(value => normalize(instance.compute(value)))).toEqual([null, null, null, 13]);
    instance.restore(snapshot);
    expect(continuation.map(value => normalize(instance.compute(value)))).toEqual([null, null, null, 13]);
  });
});
