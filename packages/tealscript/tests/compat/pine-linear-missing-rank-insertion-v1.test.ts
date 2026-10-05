import { describe, expect, it } from 'vitest';

import { PercentileLinearInterpolation } from '../../src/runtime/codegen/ta-classes';
import { getPlot, runCompatScript } from './fixtures';

// Native v4 ranked-window attempt2, source SHA82d45781f7b6, CSV SHA7964e9e2c555.
// The physical holes interrupt numeric rank ordering; eviction restores the window.
const observations = [
  {
    length: 4,
    percentage: 25,
    expected: [
      11.5, 12.5, 13.5, 14.5, 13.0, 11.5, 11.5, 11.5, 12.5, 13.5, 12.0, 10.5, 10.5, 10.5, 11.5, 12.5, 13.5, 12.0, 10.5,
      10.5,
    ],
  },
  {
    length: 4,
    percentage: 50,
    expected: [
      12.5,
      13.5,
      14.5,
      null,
      null,
      null,
      null,
      12.5,
      13.5,
      14.5,
      14.5,
      13.0,
      11.5,
      11.5,
      12.5,
      13.5,
      14.5,
      14.5,
      13.0,
      11.5,
    ],
  },
  {
    length: 4,
    percentage: 75,
    expected: [
      13.5,
      14.5,
      null,
      null,
      null,
      null,
      null,
      13.5,
      14.5,
      15.5,
      15.5,
      15.5,
      14.0,
      12.5,
      13.5,
      14.5,
      15.5,
      15.5,
      15.5,
      14.0,
    ],
  },
  {
    length: 14,
    percentage: 25,
    expected: [
      11.0, 11.0, 11.0, 12.0, 12.0, 12.0, 12.0, 12.0, 12.0, 12.0, 12.0, 12.0, 12.0, 12.0, 12.0, 12.0, 12.0, 11.0, 11.0,
      11.0,
    ],
  },
  {
    length: 14,
    percentage: 50,
    expected: [
      13.0, 13.0, 13.0, 13.5, 13.5, 13.5, 13.5, 13.5, 13.5, 13.5, 13.5, 13.5, 13.5, 13.5, 13.5, 13.5, 13.5, 13.0, 13.0,
      13.0,
    ],
  },
  {
    length: 14,
    percentage: 75,
    expected: [
      15.0, 15.0, 15.0, 15.0, 15.0, 15.0, 15.0, 15.0, 15.0, 15.0, 15.0, 15.0, 15.0, 15.0, 15.0, 15.0, 15.0, 15.0, 15.0,
      15.0,
    ],
  },
];

const sourceAt = (index: number) => (index % 64 === 20 || index % 64 === 21 ? NaN : 10 + ((index % 64) % 7));

function assertValue(actual: number, expected: number | null, index: number) {
  if (expected === null) expect(actual, `bar ${index}`).toBeNaN();
  else expect(actual, `bar ${index}`).toBe(expected);
}

describe('linear percentile ordered insertion across missing rank slots', () => {
  it.each(observations)(
    'restores native length$length pct$percentage hole ranks and snapshots',
    ({ length, percentage, expected }) => {
      const linear = new PercentileLinearInterpolation(length, percentage);
      for (let index = 0; index < 38; index += 1) {
        const snapshot = linear.save();
        const actual = linear.compute(sourceAt(index));
        if (index >= 18) assertValue(actual, expected[index - 18], index);
        linear.recompute(99);
        const replaced = linear.recompute(sourceAt(index));
        if (index >= 18) assertValue(replaced, expected[index - 18], index);
        linear.restore(snapshot);
        const restored = linear.compute(sourceAt(index));
        if (index >= 18) assertValue(restored, expected[index - 18], index);
      }
    },
  );

  it.each(observations.filter(({ length, percentage }) => length === 4 && percentage !== 75))(
    'publishes native length$length pct$percentage after holes in compiled calls',
    ({ length, percentage, expected }) => {
      const result = runCompatScript(
        `//@version=6
indicator("Linear missing ranks")
phase = bar_index % 64
src = phase == 20 or phase == 21 ? na : 10.0 + phase % 7
plot(ta.percentile_linear_interpolation(src, ${length}, ${percentage}), "LINEAR")`,
        {
          bars: Array.from({ length: 38 }, (_, index) => ({
            time: 1700000000 + index * 60,
            open: 1,
            high: 2,
            low: 0,
            close: 1,
            volume: 1,
          })),
        },
      );
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'LINEAR').values.slice(18)).toEqual(expected);
    },
  );
});
