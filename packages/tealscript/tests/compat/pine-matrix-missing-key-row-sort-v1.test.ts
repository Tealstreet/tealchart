import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('matrix missing-key sorting moves its complete tagged row', () => {
  for (const receiver of [false, true]) for (const descending of [false, true]) {
    it(`receiver=${receiver} descending=${descending}`, () => {
      const order = descending ? 'order.descending' : 'order.ascending';
      const call = receiver ? `m.sort(1, ${order})` : `matrix.sort(m, 1, ${order})`;
      const result = runCompatScript(`//@version=6
indicator("Missing-key row sort")
m = matrix.new<float>(3, 2, na)
${[17, -2.5, -8, null, 43, 3.25].map((value, i) => value === null ? '' : `matrix.set(m, ${Math.floor(i / 2)}, ${i % 2}, ${value})`).join('\n')}
${call}
${Array.from({ length: 6 }, (_, i) => `plot(matrix.get(m, ${Math.floor(i / 2)}, ${i % 2}), "Cell${i}")`).join('\n')}
plot(matrix.rows(m), "Rows")
plot(matrix.columns(m), "Columns")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      const expected = descending ? [-8, null, 43, 3.25, 17, -2.5] : [17, -2.5, 43, 3.25, -8, null];
      expected.forEach((value, i) => expect(getPlot(result, `Cell${i}`).values).toEqual([value, value, value]));
      expect(getPlot(result, 'Rows').values).toEqual([3, 3, 3]);
      expect(getPlot(result, 'Columns').values).toEqual([2, 2, 2]);
    });
  }
});
