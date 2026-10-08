import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('barssince startup and reset', () => {
  it.each([5, 6])('v%s is missing before the first event', (version) => {
    const result = runCompatScript(
      `//@version=${version}
indicator("Event startup")
plot(ta.barssince(bar_index > 0), "Count")`,
      { bars: compatibilityBars.slice(0, 4) },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Count').values).toEqual([null, 0, 0, 0]);
  });
});
