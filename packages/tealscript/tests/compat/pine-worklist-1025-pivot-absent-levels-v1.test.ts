import { expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

it('rank 1025 documented DM pivot levels retain eight nonapplicable NA slots', () => {
  const result = runCompatScript(
    `//@version=6
indicator("DM absent levels")
a = ta.pivot_point_levels("DM", bar_index == 0 or bar_index == 2)
plot(array.size(a), "Count")
${Array.from({ length: 11 }, (_, i) => `plot(array.get(a, ${i}), "L${i}")`).join('\n')}`,
    { bars: compatibilityBars.slice(0, 4) },
  );
  expect(result.errors).toEqual([]);
  expect(getPlot(result, 'Count').values).toEqual([11, 11, 11, 11]);
  for (let i = 0; i < 11; i++) {
    const values = getPlot(result, `L${i}`).values;
    expect(values.slice(0, 2)).toEqual([null, null]);
    if (i >= 3) expect(values).toEqual([null, null, null, null]);
    else {
      expect(Number.isFinite(values[2])).toBe(true);
      expect(values[3]).toBe(values[2]);
    }
  }
});
