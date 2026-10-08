import { describe, expect, it } from 'vitest';

import { type Bar } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const bars: Bar[] = [8, -3, 12, 0, -7].map((close, index) => ({
  time: 1_700_000_000_000 + index * 60_000,
  open: close, high: close, low: close, close, volume: 100,
}));

// Execution model, time-series-in-scopes: global values commit once per bar.
// Loop iterations change the current value, rather than adding historical bars.
describe('global committed history across loop writes', () => {
  it.each([
    ['for', 'for i = 1 to 3\n    value := close * i'],
    ['while', 'int i = 1\nwhile i <= 3\n    value := close * i\n    i += 1'],
  ])('%s commits the final reassignment once', (_name, loop) => {
    const result = runCompatScript(`//@version=6\nindicator("Global loop history")\nfloat value = close\n${loop}\nplot(value, "Current")\nplot(value[1], "Prior")\nplot(value[2], "Prior2")`, { bars });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Current').values).toEqual([24, -9, 36, 0, -21]);
    expect(getPlot(result, 'Prior').values).toEqual([null, 24, -9, 36, 0]);
    expect(getPlot(result, 'Prior2').values).toEqual([null, null, 24, -9, 36]);
  });
});
