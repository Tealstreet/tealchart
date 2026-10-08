import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('string submatrix selects a detached interior rectangle', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} receiver=${receiver}`, () => {
      const cells = ['guard0', 'guard1', 'guard2', 'guard3', 'guard4', 'Az', '', 'guard7', 'guard8', 'a', 'B', 'guard11'];
      const result = runCompatScript(`//@version=${version}
indicator("String submatrix window")
m = matrix.new<string>(3, 4, "")
${cells.map((v, i) => `m.set(${Math.floor(i / 4)}, ${i % 4}, "${v}")`).join('\n')}
s = ${receiver ? 'm.submatrix(1, 3, 1, 3)' : 'matrix.submatrix(id=m, from_row=1, to_row=3, from_column=1, to_column=3)'}
${['Az', '', 'a', 'B'].map((v, i) => `plot(s.get(${Math.floor(i / 2)}, ${i % 2}) == "${v}" ? 1 : 0, "Cell${i}")`).join('\n')}
s.set(0, 0, "changed")
plot(m.get(1, 1) == "Az" ? 1 : 0, "Source")
m.set(2, 2, "new")
plot(s.get(1, 1) == "B" ? 1 : 0, "Selected")
plot(s.rows(), "Rows")
plot(s.columns(), "Columns")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const title of ['Cell0', 'Cell1', 'Cell2', 'Cell3', 'Source', 'Selected']) expect(getPlot(result, title).values).toEqual([1, 1, 1]);
      for (const title of ['Rows', 'Columns']) expect(getPlot(result, title).values).toEqual([2, 2, 2]);
    });
  }
});
