import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('partial submatrix names retain every other documented default', () => {
  const cases = [
    { args: 'from_row=1', fromRow: 1, toRow: 3, fromColumn: 0, toColumn: 4 },
    { args: 'to_row=2', fromRow: 0, toRow: 2, fromColumn: 0, toColumn: 4 },
    { args: 'from_column=1', fromRow: 0, toRow: 3, fromColumn: 1, toColumn: 4 },
    { args: 'to_column=3', fromRow: 0, toRow: 3, fromColumn: 0, toColumn: 3 },
  ];
  for (const version of [5, 6]) for (const method of [false, true]) for (const window of cases) {
    it(`v${version} method=${method} ${window.args}`, () => {
      const original = [-31, 5, 17, 43, -8, 71, 97, -53, 113, -83, 29, 61];
      const rows = window.toRow - window.fromRow;
      const columns = window.toColumn - window.fromColumn;
      const expected = Array.from({ length: rows * columns }, (_, i) => original[(window.fromRow + Math.floor(i / columns)) * 4 + window.fromColumn + i % columns]);
      const call = method ? `m.submatrix(${window.args})` : `matrix.submatrix(${window.args}, id=m)`;
      const result = runCompatScript(`//@version=${version}
indicator("Partial submatrix defaults")
m = matrix.new<int>(3, 4, 0)
${original.map((value, i) => `m.set(${Math.floor(i / 4)}, ${i % 4}, ${value})`).join('\n')}
s = ${call}
${expected.map((_, i) => `plot(s.get(${Math.floor(i / columns)}, ${i % columns}), "Cell${i}")`).join('\n')}
plot(s.rows(), "Rows")
plot(s.columns(), "Columns")
plot(s.elements_count(), "Elements")
${original.map((_, i) => `plot(m.get(${Math.floor(i / 4)}, ${i % 4}), "Source${i}")`).join('\n')}`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      expected.forEach((value, i) => expect(getPlot(result, `Cell${i}`).values).toEqual([value, value, value]));
      original.forEach((value, i) => expect(getPlot(result, `Source${i}`).values).toEqual([value, value, value]));
      expect(getPlot(result, 'Rows').values).toEqual([rows, rows, rows]);
      expect(getPlot(result, 'Columns').values).toEqual([columns, columns, columns]);
      expect(getPlot(result, 'Elements').values).toEqual([expected.length, expected.length, expected.length]);
    });
  }
});
