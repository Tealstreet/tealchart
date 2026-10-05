import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

describe('Worklist 1052: variance non-missing publication', () => {
  // Reference ta.variance remarks: length non-na samples; no native hole conflict found.
  it.each([true, false])('holds the finite-sample variance across holes, biased=%s', (biased) => {
    const result = runCompatScript(`//@version=6
indicator("Variance publication")
src = bar_index == 1 ? 2.0 : bar_index == 3 ? 6.0 : bar_index == 6 ? 10.0 : float(na)
plot(ta.variance(src, 2, ${biased}), "Result")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Result').values).toEqual([
      null,
      null,
      null,
      biased ? 4 : 8,
      biased ? 4 : 8,
      biased ? 4 : 8,
      biased ? 4 : 8,
      biased ? 4 : 8,
      biased ? 4 : 8,
      biased ? 4 : 8,
      biased ? 4 : 8,
      biased ? 4 : 8,
    ]);
  });
});
