import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('v5 valuewhen keeps missing boolean events', () => {
  it('counts a missing source as an occurrence', () => {
    const result = runCompatScript(
      `//@version=5
indicator("Missing boolean events")
event = bar_index == 0 or bar_index == 2 or bar_index == 4
bool source = bar_index == 0 ? bool(na) : bar_index < 4
latest = ta.valuewhen(event, source, 0)
previous = ta.valuewhen(event, source, 1)
older = ta.valuewhen(event, source, 2)
plot(na(latest) ? 2 : latest ? 1 : 0, "Latest")
plot(na(previous) ? 2 : previous ? 1 : 0, "Previous")
plot(na(older) ? 2 : older ? 1 : 0, "Older")`,
      { bars: compatibilityBars.slice(0, 6) },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Latest').values).toEqual([2, 2, 1, 1, 0, 0]);
    expect(getPlot(result, 'Previous').values).toEqual([2, 2, 2, 2, 1, 1]);
    expect(getPlot(result, 'Older').values).toEqual([2, 2, 2, 2, 2, 2]);
  });
});
