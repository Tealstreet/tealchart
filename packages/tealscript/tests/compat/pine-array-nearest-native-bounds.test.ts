import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const bars = Array.from({ length: 45 }, (_, index) => ({ time: 1000 + index * 1000, open: 1, high: 2, low: 0, close: 1, volume: 1 }));

// Native v4 b994 captures: trace-array-nearest-rank-{int,float}-dynamic-{low,high}-v6, error at bar 40.
describe('native array nearest-rank percentage bounds', () => {
  for (const kind of ['int', 'float']) {
    const values = kind === 'int' ? '10, 20, 30, 40, 50' : '10.5, 20.5, 30.5, 40.5, 50.5';
    for (const method of [false, true]) {
      const call = method ? 'a.percentile_nearest_rank(percentage)' : 'array.percentile_nearest_rank(a, percentage)';
      it.each([-1, 101])(`refuses a dynamic percentage for ${kind}, method=${method}: %s`, invalid => {
        const result = runCompatScript(`//@version=6\nindicator("Native nearest bounds")\na = array.from(${values})\npercentage = bar_index < 40 ? 50.0 : ${invalid}.0\nresult = ${call}\nplot(result, "OUTCOME")`, { bars });
        expect(result.errors).toEqual(expect.arrayContaining([expect.objectContaining({
          barIndex: 40,
          message: `Error on bar 40: Invalid value of the 'percentage' argument (${invalid}) in the 'array.percentile_nearest_rank' function. It must be in the range [0..100].`,
        })]));
        expect(getPlot(result, 'OUTCOME').values.slice(0, 40)).toEqual(Array(40).fill(kind === 'int' ? 30 : 30.5));
      });

      it(`keeps valid dynamic endpoints for ${kind}, method=${method}`, () => {
        const result = runCompatScript(`//@version=6\nindicator("Valid nearest bounds")\na = array.from(${values})\npercentage = bar_index < 40 ? 0.0 : 100.0\nplot(${call}, "OUTCOME")`, { bars });
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'OUTCOME').values).toEqual([
          ...Array(40).fill(kind === 'int' ? 10 : 10.5), ...Array(5).fill(kind === 'int' ? 50 : 50.5),
        ]);
      });
    }
  }
});
