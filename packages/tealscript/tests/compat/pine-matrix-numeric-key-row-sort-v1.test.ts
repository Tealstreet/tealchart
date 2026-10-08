import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('numeric matrix sorting moves complete tagged rows by a nonzero column', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const descending of [false, true]) {
    it(`v${version} receiver=${receiver} descending=${descending}`, () => {
      const order = descending ? 'order.descending' : 'order.ascending';
      const call = receiver ? `alias.sort(1, ${order})` : `matrix.sort(alias, 1, ${order})`;
      const source = `//@version=${version}
indicator("Numeric row sort")
m = matrix.new<float>(3, 2, 0)
${[17, -2.5, -8, 3.25, 43, -4.75].map((value, i) => `matrix.set(m, ${Math.floor(i / 2)}, ${i % 2}, ${value})`).join('\n')}
alias = m
${call}
${Array.from({ length: 6 }, (_, i) => `plot(matrix.get(m, ${Math.floor(i / 2)}, ${i % 2}), "Cell${i}")`).join('\n')}
plot(matrix.rows(m), "Rows")
plot(matrix.columns(m), "Columns")`;
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      const expected = descending ? [-8, 3.25, 17, -2.5, 43, -4.75] : [43, -4.75, 17, -2.5, -8, 3.25];
      expected.forEach((value, i) => expect(getPlot(result, `Cell${i}`).values).toEqual([value, value, value]));
      expect(getPlot(result, 'Rows').values).toEqual([3, 3, 3]);
      expect(getPlot(result, 'Columns').values).toEqual([2, 2, 2]);
    });
  }
});
