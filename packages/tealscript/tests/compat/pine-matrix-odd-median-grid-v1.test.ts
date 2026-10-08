import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('odd matrix median selects the middle signed rank without changing cells', () => {
  for (const version of [5, 6]) for (const method of [false, true]) {
    it(`v${version} method=${method}`, () => {
      const values = [43, -8, 17, -31, 5, 29, -47, 71, 11];
      const result = runCompatScript(`//@version=${version}
indicator("Odd matrix median")
m = matrix.new<int>(3, 3, 0)
${values.map((v, i) => `m.set(${Math.floor(i / 3)}, ${i % 3}, ${v})`).join('\n')}
plot(${method ? 'm.median()' : 'matrix.median(id=m)'}, "Median")
${values.map((_, i) => `plot(m.get(${Math.floor(i / 3)}, ${i % 3}), "Cell${i}")`).join('\n')}
plot(m.rows(), "Rows")
plot(m.columns(), "Columns")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Median').values).toEqual([11, 11, 11]);
      values.forEach((value, i) => expect(getPlot(result, `Cell${i}`).values).toEqual([value, value, value]));
      for (const title of ['Rows', 'Columns']) expect(getPlot(result, title).values).toEqual([3, 3, 3]);
    });
  }
});
