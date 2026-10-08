import { expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// TradingView Pivot Points Standard: Woodie uses prior H/L and current open.
for (const version of [5, 6]) {
  it(`v${version} pins finite Woodie levels across two completed periods`, () => {
    const prices = [[100, 103, 99, 102], [102, 106, 101, 105], [105, 108, 104, 107],
      [107, 109, 105, 108], [100, 130, 90, 120], [120, 140, 115, 125]];
    const plots = Array.from({ length: 9 }, (_, i) => `plot(array.get(levels, ${i}), "L${i}")`).join('\n');
    const result = runCompatScript(`//@version=${version}
indicator("Woodie completed periods")
levels = ta.pivot_point_levels("Woodie", bar_index == 0 or bar_index == 2 or bar_index == 4, false)
${plots}`, {
      bars: prices.map(([open, high, low, close], i) => ({ ...compatibilityBars[i], open, high, low, close })),
    });
    expect(result.errors).toEqual([]);
    const first = [103.75, 108.5, 101.5, 110.75, 96.75, 115.5, 94.5, 122.5, 87.5];
    const second = [103.25, 102.5, 97.5, 108.25, 98.25, 107.5, 92.5, 112.5, 87.5];
    first.forEach((value, i) => expect(getPlot(result, `L${i}`).values.slice(2)).toEqual([value, value, second[i], second[i]]));
  });
}
