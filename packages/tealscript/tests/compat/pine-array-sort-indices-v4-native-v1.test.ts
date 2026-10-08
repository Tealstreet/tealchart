import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('equal-key numeric sort indices', () => {
  it('preserves tie ordering without changing source slots', () => {
    const source = `//@version=6
indicator("Sort indices")
a = array.from(2, 1, 2, 1, 2, 3)
asc = array.sort_indices(a, order.ascending)
desc = array.sort_indices(a, order.descending)
${Array.from(
  { length: 6 },
  (_, index) => `plot(array.get(a, ${index}), "Source ${index}")
plot(array.get(asc, ${index}), "Ascending ${index}")
plot(array.get(desc, ${index}), "Descending ${index}")`,
).join('\n')}`;
    const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 1) });
    expect(result.errors).toEqual([]);
    for (const [prefix, expected] of [
      ['Source', [2, 1, 2, 1, 2, 3]],
      ['Ascending', [1, 3, 0, 2, 4, 5]],
      ['Descending', [5, 4, 2, 0, 3, 1]],
    ] as const) {
      expected.forEach((value, index) => expect(getPlot(result, `${prefix} ${index}`).values).toEqual([value]));
    }
  });
});
