import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('string matrix insertion shifts distinct cells and retains source array values', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const row of [false, true]) {
    it(`v${version} receiver=${receiver} row=${row}`, () => {
      const expected = row ? ['Az', 'a', '', 'B', 'Z', 'first'] : ['Az', '', 'a', 'Z', 'B', 'first'];
      const columns = row ? 2 : 3;
      const result = runCompatScript(`//@version=${version}
indicator("String inserted axis")
m = matrix.new<string>(2, 2, "")
m.set(0, 0, "Az")
m.set(0, 1, "a")
m.set(1, 0, "Z")
m.set(1, 1, "first")
a = array.from("", "B")
${receiver ? `m.add_${row ? 'row' : 'col'}(1, a)` : `matrix.add_${row ? 'row' : 'col'}(m, 1, a)`}
a.set(0, "changed")
${expected.map((value, i) => `plot(m.get(${Math.floor(i / columns)}, ${i % columns}) == "${value}" ? 1 : 0, "Cell${i}")`).join('\n')}
plot(m.rows(), "Rows")
plot(m.columns(), "Columns")
plot(a.size(), "SourceSize")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (let i = 0; i < expected.length; i++) expect(getPlot(result, `Cell${i}`).values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Rows').values).toEqual(Array(3).fill(row ? 3 : 2));
      expect(getPlot(result, 'Columns').values).toEqual(Array(3).fill(columns));
      expect(getPlot(result, 'SourceSize').values).toEqual([2, 2, 2]);
    });
  }
});
