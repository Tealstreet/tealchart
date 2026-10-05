import { expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

it('rank 1017 finite SAR startup follows the published Pine initialization', () => {
  for (const close of [2, 8, 9]) {
    const result = runCompatScript(
      `//@version=6
indicator("Published SAR startup")
plot(ta.sar(0.02, 0.02, 0.2), "SAR")`,
      {
        bars: [
          { time: 1000, open: 8, high: 10, low: 0, close: 8, volume: 1 },
          { time: 2000, open: close, high: 9, low: 1, close, volume: 1 },
        ],
      },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'SAR').values).toEqual([null, close > 8 ? 0 : 10]);
  }
});
