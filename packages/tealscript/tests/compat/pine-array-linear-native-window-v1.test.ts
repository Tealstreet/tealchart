import { describe, expect, it } from 'vitest';

import { createPineArray, percentileLinearInterpolationArrayValue } from '../../src/runtime/arrays';
import { getPlot, runCompatScript } from './fixtures';

// Native ranked-window-missing-slots-v2 attempt2, original source SHA82d45781f7b6.
// CSV SHA7964e9e2c555593b74f5c3aaac947f5dad7b6b6d6ce642ae8da4af469ec1f864; historical rows only.
const observations = [
  {
    shape: 'clean',
    percentage: 50,
    start: 0,
    expected: [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      13.0,
      13.0,
      13.0,
      13.0,
      13.0,
      13.0,
      13.0,
      13.0,
      13.0,
    ],
  },
  {
    shape: 'clean',
    percentage: 75,
    start: 0,
    expected: [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      16.0,
      15.0,
      15.0,
      15.0,
      15.0,
      15.0,
      15.0,
      15.0,
      15.0,
      15.0,
      15.0,
      15.0,
    ],
  },
  {
    shape: 'hole20_21',
    percentage: 50,
    start: 18,
    expected: [
      13.0,
      13.0,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      13.0,
      13.0,
      13.0,
    ],
  },
  {
    shape: 'hole20_21',
    percentage: 75,
    start: 18,
    expected: [
      15.0, 15.0, 15.0, 15.0, 15.0, 15.0, 15.0, 15.0, 15.0, 15.0, 15.0, 15.0, 15.0, 15.0, 15.0, 15.0, 15.0, 15.0, 15.0,
      15.0,
    ],
  },
  {
    shape: 'lead0_4',
    percentage: 50,
    start: 0,
    expected: [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      13.0,
      13.0,
      13.0,
      13.0,
    ],
  },
  {
    shape: 'lead0_4',
    percentage: 75,
    start: 0,
    expected: [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      16.0,
      16.0,
      15.0,
      15.0,
      15.0,
      15.0,
      15.0,
    ],
  },
];

const sample = (bar: number, shape: string): number =>
  bar < 0 || (shape === 'lead0_4' && bar < 5) || (shape === 'hole20_21' && [20, 21].includes(bar % 64))
    ? NaN
    : 10 + ((bar % 64) % 7);
const normalize = (value: number): number | null => (Number.isNaN(value) ? null : value);

describe('native array linear percentiles retain missing rank slots', () => {
  for (const observation of observations) {
    const { shape, percentage, start, expected } = observation;
    it(`matches captured ${shape} pct${percentage} array values without mutating the source`, () => {
      const actual = expected.map((_, offset) => {
        const items = createPineArray<number>(14, NaN);
        const values = Array.from({ length: 14 }, (_, index) => sample(start + offset - index, shape));
        items.values = [...values];
        const value = normalize(percentileLinearInterpolationArrayValue(items, percentage));
        expect(items.values).toEqual(values);
        return value;
      });
      expect(actual).toEqual(expected);
    });
    it(`routes captured ${shape} pct${percentage} through namespace and receiver calls`, () => {
      const count = start + expected.length;
      const source =
        shape === 'lead0_4'
          ? 'bar_index < 5 ? na : clean'
          : shape === 'hole20_21'
            ? 'phase == 20 or phase == 21 ? na : clean'
            : 'clean';
      const elements = Array.from({ length: 14 }, (_, index) => (index === 0 ? 'source' : `source[${index}]`)).join(
        ', ',
      );
      const result = runCompatScript(
        `//@version=6
indicator("Native array linear")
phase = bar_index % 64
clean = 10.0 + phase % 7
source = ${source}
items = array.from(${elements})
plot(array.percentile_linear_interpolation(items, ${percentage}), "NAMESPACE")
plot(items.percentile_linear_interpolation(${percentage}), "METHOD")`,
        {
          bars: Array.from({ length: count }, (_, bar) => ({
            time: 1000 + bar * 1000,
            open: 1,
            high: 2,
            low: 0,
            close: 1,
            volume: 1,
          })),
        },
      );
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'NAMESPACE').values.slice(start)).toEqual(expected);
      expect(getPlot(result, 'METHOD').values.slice(start)).toEqual(expected);
    });
  }
});
