import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/matrices/#submatrices
// Shallow copies share UDT objects, while matrix slots remain independent.
describe('UDT submatrix references and independent slots', () => {
  for (const call of ['m.submatrix(1, 3, 1, 3)', 'matrix.submatrix(to_column=3, from_column=1, to_row=3, from_row=1, id=m)']) {
    it(call, () => {
      const nodes = Array.from({ length: 9 }, (_, i) => `n${i + 1} = Cell.new(${i + 1})`).join('\n');
      const writes = Array.from({ length: 9 }, (_, i) => `m.set(${Math.floor(i / 3)}, ${i % 3}, n${i + 1})`).join('\n');
      const result = runCompatScript(`//@version=6
indicator("UDT submatrix")
type Cell
    int value
${nodes}
m = matrix.new<Cell>(3, 3)
${writes}
s = ${call}
alias = s
plot(s.rows(), "Rows")
plot(s.columns(), "Columns")
plot(s.get(0, 0).value, "First")
plot(s.get(0, 1).value, "Second")
plot(s.get(1, 0).value, "Third")
plot(s.get(1, 1).value, "Fourth")
selected = s.get(0, 0)
selected.value := 99
plot(m.get(1, 1).value, "SharedSource")
plot(n5.value, "SharedOriginal")
s.set(0, 0, Cell.new(77))
plot(alias.get(0, 0).value, "AliasReplacement")
plot(m.get(1, 1).value, "SourceRetained")
plot(selected.value, "DisplacedRetained")
m.set(2, 2, Cell.new(88))
plot(alias.get(1, 1).value, "CropRetained")
plot(n9.value, "OriginalRetained")
plot(m.get(2, 2).value, "SourceReplacement")
plot(m.get(0, 0).value, "Outside")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors).toEqual([]);
      const expected = { Rows: 2, Columns: 2, First: 5, Second: 6, Third: 8, Fourth: 9, SharedSource: 99, SharedOriginal: 99, AliasReplacement: 77, SourceRetained: 99, DisplacedRetained: 99, CropRetained: 9, OriginalRetained: 9, SourceReplacement: 88, Outside: 1 };
      for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
    });
  }
});
