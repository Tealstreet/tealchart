import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('color matrix axes retain order and independent array storage', () => {
  for (const version of [5, 6]) for (const row of [false, true]) {
    it(`v${version} row=${row}`, () => {
      const colors = ['color.red', 'color.blue', 'color.green', 'color.yellow', 'color.orange', 'color.purple'];
      const axis = row ? [3, 4, 5] : [1, 4];
      const result = runCompatScript(`//@version=${version}
indicator("Color axes")
m = matrix.new<color>(2, 3, color.black)
${colors.map((c, i) => `m.set(${Math.floor(i / 3)}, ${i % 3}, ${c})`).join('\n')}
a = m.${row ? 'row' : 'col'}(1)
${axis.map((i, j) => `plot(a.get(${j}) == ${colors[i]} ? 1 : 0, "Axis${j}")`).join('\n')}
a.set(0, color.white)
m.set(1, 1, color.black)
plot(a.get(0) == color.white ? 1 : 0, "ArrayChanged")
plot(a.get(1) == color.orange ? 1 : 0, "ArrayRetained")
plot(m.get(${row ? '1, 0' : '0, 1'}) == ${row ? 'color.yellow' : 'color.blue'} ? 1 : 0, "MatrixRetained")
plot(m.get(1, 1) == color.black ? 1 : 0, "MatrixChanged")
plot(a.size(), "Size")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const title of [...axis.map((_, i) => `Axis${i}`), 'ArrayChanged', 'ArrayRetained', 'MatrixRetained', 'MatrixChanged']) expect(getPlot(result, title).values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Size').values).toEqual([axis.length, axis.length, axis.length]);
    });
  }
});
