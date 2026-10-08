import { expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

for (const version of [5, 6]) {
  it(`v${version} sizes static history for an 800-bar reference`, () => {
    const bars = Array.from({ length: 804 }, (_, i) => ({ ...compatibilityBars[0], time: (i + 1) * 60000, close: i + 1 }));
    const result = runCompatScript(`//@version=${version}
indicator("Static history")
plot(close[800], "Past")`, { bars });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Past').values).toEqual([...Array(800).fill(null), 1, 2, 3, 4]);
  });
}
