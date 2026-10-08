import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('color matrix copy retains every cell and separate value storage', () => {
  for (const version of [5, 6]) for (const method of [false, true]) {
    it(`v${version} method=${method}`, () => {
      const colors = ['color.red', 'color.blue', 'color.green', 'color.yellow', 'color.orange', 'color.purple'];
      const result = runCompatScript(`//@version=${version}
indicator("Color matrix copy")
m = matrix.new<color>(2, 3, color.black)
${colors.map((c, i) => `m.set(${Math.floor(i / 3)}, ${i % 3}, ${c})`).join('\n')}
c = ${method ? 'm.copy()' : 'matrix.copy(id=m)'}
${colors.map((v, i) => `plot(c.get(${Math.floor(i / 3)}, ${i % 3}) == ${v} ? 1 : 0, "Copy${i}")`).join('\n')}
c.set(0, 1, color.white)
m.set(1, 2, color.black)
plot(m.get(0, 1) == color.blue ? 1 : 0, "SourceRetained")
plot(c.get(1, 2) == color.purple ? 1 : 0, "CopyRetained")
plot(c.get(0, 1) == color.white ? 1 : 0, "CopyChanged")
plot(m.get(1, 2) == color.black ? 1 : 0, "SourceChanged")
plot(c.rows(), "Rows")
plot(c.columns(), "Columns")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const title of [...colors.map((_, i) => `Copy${i}`), 'SourceRetained', 'CopyRetained', 'CopyChanged', 'SourceChanged']) expect(getPlot(result, title).values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Rows').values).toEqual([2, 2, 2]);
      expect(getPlot(result, 'Columns').values).toEqual([3, 3, 3]);
    });
  }
});
