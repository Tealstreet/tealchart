import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('matrix string removal returns the ordered axis and preserves remaining cells', () => {
  const cells = ['Az', '', 'a', 'Z', 'B', 'first'];
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const row of [false, true]) {
    it(`v${version} receiver=${receiver} row=${row}`, () => {
      const removed = row ? ['Z', 'B', 'first'] : ['', 'B'];
      const remaining = row ? ['Az', '', 'a'] : ['Az', 'a', 'Z', 'first'];
      const columns = row ? 3 : 2;
      const result = runCompatScript(`//@version=${version}
indicator("String removed axis")
m = matrix.new<string>(2, 3, "")
${cells.map((value, i) => `m.set(${Math.floor(i / 3)}, ${i % 3}, "${value}")`).join('\n')}
a = ${receiver ? `m.remove_${row ? 'row' : 'col'}(1)` : `matrix.remove_${row ? 'row' : 'col'}(m, 1)`}
${removed.map((value, i) => `plot(a.get(${i}) == "${value}" ? 1 : 0, "Removed${i}")`).join('\n')}
${remaining.map((value, i) => `plot(m.get(${Math.floor(i / columns)}, ${i % columns}) == "${value}" ? 1 : 0, "Retained${i}")`).join('\n')}
plot(a.size(), "Size")
plot(m.rows(), "Rows")
plot(m.columns(), "Columns")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (let i = 0; i < removed.length; i++) expect(getPlot(result, `Removed${i}`).values).toEqual([1, 1, 1]);
      for (let i = 0; i < remaining.length; i++) expect(getPlot(result, `Retained${i}`).values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Size').values).toEqual(Array(3).fill(removed.length));
      expect(getPlot(result, 'Rows').values).toEqual(Array(3).fill(row ? 1 : 2));
      expect(getPlot(result, 'Columns').values).toEqual(Array(3).fill(columns));
    });
  }
});
