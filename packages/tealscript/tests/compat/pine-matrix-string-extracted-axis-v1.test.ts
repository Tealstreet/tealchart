import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('string matrix extracted axes preserve order and independent slots', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const row of [false, true]) {
    it(`v${version} receiver=${receiver} row=${row}`, () => {
      const cells = ['Az', '', 'a', 'B', 'Z', 'first', 'A', 'last', 'end'];
      const method = row ? 'row' : 'col', expected = row ? ['B', 'Z', 'first'] : ['', 'Z', 'last'];
      const result = runCompatScript(`//@version=${version}
indicator("String extracted axis")
m = matrix.new<string>(3, 3, "")
${cells.map((v, i) => `m.set(${Math.floor(i / 3)}, ${i % 3}, "${v}")`).join('\n')}
a = ${receiver ? `m.${method}(1)` : `matrix.${method}(m, 1)`}
${expected.map((v, i) => `plot(a.get(${i}) == "${v}" ? 1 : 0, "Cell${i}")`).join('\n')}
a.set(0, "changed")
plot(m.get(${row ? '1, 0' : '0, 1'}) == "${expected[0]}" ? 1 : 0, "Source")
m.set(${row ? '1, 2' : '2, 1'}, "new")
plot(a.get(2) == "${expected[2]}" ? 1 : 0, "Extracted")
plot(a.size(), "Size")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const title of ['Cell0', 'Cell1', 'Cell2', 'Source', 'Extracted']) expect(getPlot(result, title).values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Size').values).toEqual([3, 3, 3]);
    });
  }
});
