import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('sequential matrix removals use updated row and column dimensions', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const rowFirst of [false, true]) {
    it(`v${version} receiver=${receiver} rowFirst=${rowFirst}`, () => {
      const call = (axis: string, index: number) => receiver ? `m.remove_${axis}(${index})` : `matrix.remove_${axis}(m, ${index})`;
      const first = rowFirst ? [43, -31, 11] : [5, -31, 29];
      const second = rowFirst ? [5, 29] : [43, 11];
      const result = runCompatScript(`//@version=${version}
indicator("Sequential axis removal")
m = matrix.new<int>(3, 3, 0)
${[17, 5, -8, 43, -31, 11, -47, 29, 71].map((value, i) => `m.set(${Math.floor(i / 3)}, ${i % 3}, ${value})`).join('\n')}
a = ${call(rowFirst ? 'row' : 'col', 1)}
b = ${call(rowFirst ? 'col' : 'row', 1)}
${first.map((_, i) => `plot(a.get(${i}), "First${i}")`).join('\n')}
${second.map((_, i) => `plot(b.get(${i}), "Second${i}")`).join('\n')}
${[17, -8, -47, 71].map((_, i) => `plot(m.get(${Math.floor(i / 2)}, ${i % 2}), "Middle${i}")`).join('\n')}
c = ${call('row', 0)}
d = ${call('col', 0)}
plot(c.get(0), "Third0")
plot(c.get(1), "Third1")
plot(d.get(0), "Fourth")
plot(m.get(0, 0), "Last")
plot(m.rows(), "Rows")
plot(m.columns(), "Columns")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      const expected: Record<string, number> = { Third0: 17, Third1: -8, Fourth: -47, Last: 71, Rows: 1, Columns: 1 };
      first.forEach((value, i) => { expected[`First${i}`] = value; });
      second.forEach((value, i) => { expected[`Second${i}`] = value; });
      [17, -8, -47, 71].forEach((value, i) => { expected[`Middle${i}`] = value; });
      for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values).toEqual(Array(3).fill(value));
    });
  }
});
