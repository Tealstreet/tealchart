import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('partial matrix fill names retain every other documented default', () => {
  const cases = [
    { args: 'from_row=1', fromRow: 1, toRow: 3, fromColumn: 0, toColumn: 4 },
    { args: 'to_row=2', fromRow: 0, toRow: 2, fromColumn: 0, toColumn: 4 },
    { args: 'from_column=1', fromRow: 0, toRow: 3, fromColumn: 1, toColumn: 4 },
    { args: 'to_column=3', fromRow: 0, toRow: 3, fromColumn: 0, toColumn: 3 },
  ];
  for (const version of [5, 6]) for (const method of [false, true]) for (const window of cases) {
    it(`v${version} method=${method} ${window.args}`, () => {
      const original = [-31, 5, 17, 43, -8, 71, 97, -53, 113, -83, 29, 61];
      const expected = original.map((value, i) => Math.floor(i / 4) >= window.fromRow && Math.floor(i / 4) < window.toRow && i % 4 >= window.fromColumn && i % 4 < window.toColumn ? -101 : value);
      const call = method ? `m.fill(value=-101, ${window.args})` : `matrix.fill(${window.args}, value=-101, id=m)`;
      const result = runCompatScript(`//@version=${version}
indicator("Partial fill defaults")
m = matrix.new<int>(3, 4, 0)
${original.map((value, i) => `m.set(${Math.floor(i / 4)}, ${i % 4}, ${value})`).join('\n')}
${call}
${expected.map((_, i) => `plot(m.get(${Math.floor(i / 4)}, ${i % 4}), "Cell${i}")`).join('\n')}
plot(m.rows(), "Rows")
plot(m.columns(), "Columns")
plot(m.elements_count(), "Elements")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      expected.forEach((value, i) => expect(getPlot(result, `Cell${i}`).values).toEqual([value, value, value]));
      expect(getPlot(result, 'Rows').values).toEqual([3, 3, 3]);
      expect(getPlot(result, 'Columns').values).toEqual([4, 4, 4]);
      expect(getPlot(result, 'Elements').values).toEqual([12, 12, 12]);
    });
  }
});
