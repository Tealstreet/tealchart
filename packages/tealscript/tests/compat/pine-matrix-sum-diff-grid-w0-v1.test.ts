import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const left = [2.5, -3, 7.25, 0, 4.5, -1.75];
const right = [-1.25, 8, 0.5, 3.75, -2.5, 6];
const setup = (name: string, values: number[]) => `${name} = matrix.new<float>(2, 3, 0)
${values.map((value, index) => `${name}.set(${Math.floor(index / 3)}, ${index % 3}, ${value})`).join('\n')}`;

describe('rectangular fractional sum and directional difference cells', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const member of ['sum', 'diff']) {
    it(`v${version} ${receiver ? 'receiver' : 'namespace'} ${member}`, () => {
      const call = receiver ? `a.${member}(b)` : `matrix.${member}(id2=b, id1=a)`;
      const expected = member === 'sum' ? [1.25, 5, 7.75, 3.75, 2, 4.25] : [3.75, -11, 6.75, -3.75, 7, -7.75];
      const result = runCompatScript(`//@version=${version}
indicator("Rectangular arithmetic cells")
${setup('a', left)}
${setup('b', right)}
c = ${call}
${expected.map((_, index) => `plot(c.get(${Math.floor(index / 3)}, ${index % 3}), "Cell${index}")`).join('\n')}
plot(c.rows(), "Rows")
plot(c.columns(), "Columns")`, { bars: compatibilityBars.slice(0, 2) });
      expect(result.errors).toEqual([]);
      expected.forEach((value, index) => expect(getPlot(result, `Cell${index}`).values).toEqual([value, value]));
      expect(getPlot(result, 'Rows').values).toEqual([2, 2]);
      expect(getPlot(result, 'Columns').values).toEqual([3, 3]);
    });
  }
});
