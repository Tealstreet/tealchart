import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('matrix sort defaults bind column zero and ascending order independently', () => {
  const cases = [
    { args: '', values: [-31, 43, 5, 71, 17, -8] },
    { args: 'order=order.descending', values: [17, -8, 5, 71, -31, 43] },
    { args: 'column=1', values: [17, -8, -31, 43, 5, 71] },
  ];
  for (const version of [5, 6]) for (const method of [false, true]) for (const { args, values } of cases) {
    it(`v${version} method=${method} args=${args}`, () => {
      const original = [-31, 43, 17, -8, 5, 71];
      const call = method ? `m.sort(${args})` : `matrix.sort(id=m${args ? `, ${args}` : ''})`;
      const result = runCompatScript(`//@version=${version}
indicator("Matrix sort defaults")
m = matrix.new<int>(3, 2, 0)
${original.map((value, i) => `m.set(${Math.floor(i / 2)}, ${i % 2}, ${value})`).join('\n')}
${call}
${values.map((_, i) => `plot(m.get(${Math.floor(i / 2)}, ${i % 2}), "Cell${i}")`).join('\n')}
plot(m.rows(), "Rows")
plot(m.columns(), "Columns")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      values.forEach((value, i) => expect(getPlot(result, `Cell${i}`).values).toEqual([value, value, value]));
      expect(getPlot(result, 'Rows').values).toEqual([3, 3, 3]);
      expect(getPlot(result, 'Columns').values).toEqual([2, 2, 2]);
    });
  }
});
