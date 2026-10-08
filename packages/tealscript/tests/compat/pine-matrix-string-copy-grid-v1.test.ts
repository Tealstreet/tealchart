import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('string matrix copy preserves empty and case-sensitive cells independently', () => {
  for (const version of [5, 6]) for (const method of [false, true]) {
    it(`v${version} method=${method}`, () => {
      const values = ['Az', '', 'a', 'Z', 'B', 'first'];
      const result = runCompatScript(`//@version=${version}
indicator("String matrix copy")
m = matrix.new<string>(2, 3, "")
${values.map((v, i) => `m.set(${Math.floor(i / 3)}, ${i % 3}, ${JSON.stringify(v)})`).join('\n')}
c = ${method ? 'm.copy()' : 'matrix.copy(id=m)'}
${values.map((v, i) => `plot(c.get(${Math.floor(i / 3)}, ${i % 3}) == ${JSON.stringify(v)} ? 1 : 0, "Copy${i}")`).join('\n')}
c.set(0, 1, "copy")
m.set(1, 2, "source")
plot(m.get(0, 1) == "" ? 1 : 0, "SourceEmptyRetained")
plot(c.get(1, 2) == "first" ? 1 : 0, "CopyRetained")
plot(c.get(0, 1) == "copy" ? 1 : 0, "CopyChanged")
plot(m.get(1, 2) == "source" ? 1 : 0, "SourceChanged")
plot(c.rows(), "Rows")
plot(c.columns(), "Columns")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const title of [...values.map((_, i) => `Copy${i}`), 'SourceEmptyRetained', 'CopyRetained', 'CopyChanged', 'SourceChanged']) expect(getPlot(result, title).values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Rows').values).toEqual([2, 2, 2]);
      expect(getPlot(result, 'Columns').values).toEqual([3, 3, 3]);
    });
  }
});
