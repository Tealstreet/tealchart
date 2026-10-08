import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

describe('Mean absolute deviation at short lengths', () => {
  it('length 1 subtracts the window mean before absolute deviation', () => {
    const bars = [0, 12, -24, 0, 24, -6, 0, -18].map((close, index) => ({
      time: 1700000000000 + index * 60000,
      open: close,
      high: close + 1,
      low: close - 1,
      close,
      volume: 10,
    }));
    const result = runCompatScript(
      `//@version=6
indicator("Short absolute deviation")
plot(ta.dev(close,1), "Base")
plot(ta.dev(source=-3*close,length=1), "Reflected")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    expect(result.profile.swallowedErrors ?? []).toEqual([]);
    expect(getPlot(result, 'Base').values.slice(0)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(getPlot(result, 'Reflected').values.slice(0)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });
  it('length 2 subtracts the window mean before absolute deviation', () => {
    const bars = [0, 12, -24, 0, 24, -6, 0, -18].map((close, index) => ({
      time: 1700000000000 + index * 60000,
      open: close,
      high: close + 1,
      low: close - 1,
      close,
      volume: 10,
    }));
    const result = runCompatScript(
      `//@version=6
indicator("Short absolute deviation")
plot(ta.dev(close,2), "Base")
plot(ta.dev(source=-3*close,length=2), "Reflected")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    expect(result.profile.swallowedErrors ?? []).toEqual([]);
    expect(getPlot(result, 'Base').values.slice(1)).toEqual([6, 18, 12, 12, 15, 3, 9]);
    expect(getPlot(result, 'Reflected').values.slice(1)).toEqual([18, 54, 36, 36, 45, 9, 27]);
  });
});
