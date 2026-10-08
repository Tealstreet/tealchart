import { expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

for (const version of [5, 6]) {
  it(`v${version} developing DM levels recalculate within each anchor period`, () => {
    const prices = [[2, 4, 1, 3], [3, 6, 2, 5], [5, 8, 4, 7], [7, 9, 2, 3]];
    const result = runCompatScript(`//@version=${version}
indicator("DM developing periods")
levels = ta.pivot_point_levels("DM", bar_index == 0 or bar_index == 2, true)
plot(array.get(levels, 0), "P")
plot(array.get(levels, 1), "R1")
plot(array.get(levels, 2), "S1")`, {
      bars: prices.map(([open, high, low, close], i) => ({ ...compatibilityBars[i], open, high, low, close })),
    });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'P').values).toEqual([3, 4.5, 6.75, 4]);
    expect(getPlot(result, 'R1').values).toEqual([5, 8, 9.5, 6]);
    expect(getPlot(result, 'S1').values).toEqual([2, 3, 5.5, -1]);
  });
}
