import { describe, expect, it } from 'vitest';

import { type Bar } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const bars: Bar[] = [8, -3, 12, 0, -7].map((close, index) => ({
  time: 1_700_000_000_000 + index * 60_000,
  open: close, high: close, low: close, close, volume: 100,
}));

// Pine v6 reference []: numeric bars-back offsets; positive floats round down.
// Its example explicitly publishes na before a previous value exists.
describe('documented numeric history offsets', () => {
  it.each([
    ['current', '0', [8, -3, 12, 0, -7]],
    ['previous', '1', [null, 8, -3, 12, 0]],
    ['two bars', '2', [null, null, 8, -3, 12]],
    ['dynamic integer', 'bar_index % 3', [8, 8, 8, 0, 0]],
    ['positive fractional', '1.9', [null, 8, -3, 12, 0]],
    ['dynamic fractional', '(bar_index % 3) + 0.9', [8, 8, 8, 0, 0]],
  ] as const)('%s selects the documented bar', (_name, offset, expected) => {
    const result = runCompatScript(`//@version=6\nindicator("Numeric history offsets")\nfloat sample = close\nplot(sample[${offset}], "value")`, { bars });
    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    expect(getPlot(result, 'value').values).toEqual(expected);
  });
});
