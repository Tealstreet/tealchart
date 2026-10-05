import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

describe('Worklist 1478: all-time max missing samples', () => {
  // Captured trace-max-all-na-seed and all-na-seed-matrix confirm the seed.
  it('keeps all-na and leading-na missing, including the native five-bar prefix', () => {
    const result = runCompatScript(`//@version=6
indicator("Max seed")
plot(ta.max(float(na)), "All missing")
plot(ta.max(bar_index < 5 ? float(na) : float(bar_index)), "Leading")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'All missing').values).toEqual(Array(12).fill(null));
    expect(getPlot(result, 'Leading').values).toEqual([null, null, null, null, null, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('retains negative extrema through consecutive holes and lower finite samples', () => {
    const result = runCompatScript(`//@version=6
indicator("Max holes")
src = bar_index == 1 ? -9.0 : bar_index == 4 ? -3.0 : bar_index == 7 ? -8.0 : float(na)
plot(ta.max(src), "Result")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Result').values).toEqual([null, -9, -9, -9, -3, -3, -3, -3, -3, -3, -3, -3]);
  });
});
