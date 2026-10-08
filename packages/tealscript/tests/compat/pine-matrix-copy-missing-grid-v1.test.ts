import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('matrix copy preserves missing cells and independent numeric storage', () => {
  for (const version of [5, 6]) for (const method of [false, true]) {
    it(`v${version} method=${method}`, () => {
      const values = [17, null, -8, 43, -31, null];
      const result = runCompatScript(`//@version=${version}
indicator("Missing matrix copy")
m = matrix.new<float>(2, 3, 0)
${values.map((v, i) => `m.set(${Math.floor(i / 3)}, ${i % 3}, ${v === null ? 'na' : v})`).join('\n')}
c = ${method ? 'm.copy()' : 'matrix.copy(id=m)'}
${values.map((_, i) => `plot(c.get(${Math.floor(i / 3)}, ${i % 3}), "Copy${i}")`).join('\n')}
c.set(0, 1, 5)
m.set(1, 2, 29)
plot(m.get(0, 1), "SourceMissing")
plot(c.get(1, 2), "CopyMissing")
plot(c.get(0, 1), "CopyChanged")
plot(m.get(1, 2), "SourceChanged")
plot(c.rows(), "Rows")
plot(c.columns(), "Columns")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      values.forEach((value, i) => expect(getPlot(result, `Copy${i}`).values).toEqual([value, value, value]));
      for (const title of ['SourceMissing', 'CopyMissing']) expect(getPlot(result, title).values).toEqual([null, null, null]);
      expect(getPlot(result, 'CopyChanged').values).toEqual([5, 5, 5]);
      expect(getPlot(result, 'SourceChanged').values).toEqual([29, 29, 29]);
      expect(getPlot(result, 'Rows').values).toEqual([2, 2, 2]);
      expect(getPlot(result, 'Columns').values).toEqual([3, 3, 3]);
    });
  }
});
