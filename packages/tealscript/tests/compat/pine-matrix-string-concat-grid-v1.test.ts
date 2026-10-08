import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('string matrix concat appends rows and keeps independent second-matrix slots', () => {
  const cells = ['Az', '', 'a', 'B', 'Z', 'first'];
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const leftRows of [1, 2]) {
    it(`v${version} receiver=${receiver} leftRows=${leftRows}`, () => {
      const left = cells.slice(0, leftRows * 2), right = cells.slice(leftRows * 2);
      const result = runCompatScript(`//@version=${version}
indicator("String matrix concat grid")
a = matrix.new<string>(${leftRows}, 2, "")
b = matrix.new<string>(${3 - leftRows}, 2, "")
${left.map((value, i) => `a.set(${Math.floor(i / 2)}, ${i % 2}, "${value}")`).join('\n')}
${right.map((value, i) => `b.set(${Math.floor(i / 2)}, ${i % 2}, "${value}")`).join('\n')}
c = ${receiver ? 'a.concat(b)' : 'matrix.concat(id2=b, id1=a)'}
${cells.map((value, i) => `plot(c.get(${Math.floor(i / 2)}, ${i % 2}) == "${value}" ? 1 : 0, "Cell${i}")`).join('\n')}
c.set(${leftRows}, 0, "changed")
plot(b.get(0, 0) == "${right[0]}" ? 1 : 0, "SecondPreserved")
a.set(0, 0, "new")
plot(c.get(0, 0) == "new" ? 1 : 0, "FirstIdentity")
plot(a.rows(), "Rows")
plot(a.columns(), "Columns")
plot(b.rows(), "SecondRows")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const title of ['Cell0', 'Cell1', 'Cell2', 'Cell3', 'Cell4', 'Cell5', 'SecondPreserved', 'FirstIdentity']) expect(getPlot(result, title).values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Rows').values).toEqual([3, 3, 3]);
      expect(getPlot(result, 'Columns').values).toEqual([2, 2, 2]);
      expect(getPlot(result, 'SecondRows').values).toEqual(Array(3).fill(3 - leftRows));
    });
  }
});
