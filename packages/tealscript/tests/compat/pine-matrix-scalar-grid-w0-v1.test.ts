import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const left = [2.5, -3, 7.25, 0, 4.5, -1.75];
describe('rectangular scalar arithmetic keeps independent source and result slots', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const member of ['sum', 'diff']) {
    it(`v${version} ${receiver ? 'receiver' : 'namespace'} ${member}`, () => {
      const call = receiver ? `a.${member}(1.25)` : `matrix.${member}(id2=1.25, id1=a)`;
      const expected = member === 'sum' ? [3.75, -1.75, 8.5, 1.25, 5.75, -0.5] : [1.25, -4.25, 6, -1.25, 3.25, -3];
      const result = runCompatScript(`//@version=${version}
indicator("Scalar arithmetic grid")
a = matrix.new<float>(2, 3, 0)
${left.map((value, index) => `a.set(${Math.floor(index / 3)}, ${index % 3}, ${value})`).join('\n')}
c = ${call}
${expected.map((_, index) => `plot(c.get(${Math.floor(index / 3)}, ${index % 3}), "Cell${index}")`).join('\n')}
c.set(0, 0, 99)
plot(a.get(0, 0), "Source")
a.set(1, 2, 77)
plot(c.get(1, 2), "Retained")
plot(c.rows(), "Rows")
plot(c.columns(), "Columns")`, { bars: compatibilityBars.slice(0, 2) });
      expect(result.errors).toEqual([]);
      expected.forEach((value, index) => expect(getPlot(result, `Cell${index}`).values).toEqual([value, value]));
      expect(getPlot(result, 'Source').values).toEqual([2.5, 2.5]);
      expect(getPlot(result, 'Retained').values).toEqual([expected[5], expected[5]]);
      expect(getPlot(result, 'Rows').values).toEqual([2, 2]);
      expect(getPlot(result, 'Columns').values).toEqual([3, 3]);
    });
  }
});
