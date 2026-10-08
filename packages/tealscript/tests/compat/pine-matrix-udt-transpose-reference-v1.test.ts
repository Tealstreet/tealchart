import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Transpose creates a new matrix with exchanged row/column indices.
// https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.transpose
describe('UDT rectangular transpose retains objects and detaches matrix slots', () => {
  for (const call of ['m.transpose()', 'matrix.transpose(id=m)']) {
    it(call, () => {
      const nodes = Array.from({ length: 6 }, (_, i) => `n${i + 1} = Cell.new(${i + 1})`).join('\n');
      const writes = Array.from({ length: 6 }, (_, i) => `m.set(${Math.floor(i / 3)}, ${i % 3}, n${i + 1})`).join('\n');
      const slots = Array.from({ length: 6 }, (_, i) => `plot(t.get(${Math.floor(i / 2)}, ${i % 2}).value, "Slot${i}")`).join('\n');
      const result = runCompatScript(`//@version=6
indicator("UDT transpose references")
type Cell
    int value
${nodes}
m = matrix.new<Cell>(2, 3)
${writes}
t = ${call}
alias = t
${slots}
plot(t.rows(), "Rows")
plot(t.columns(), "Columns")
selected = t.get(1, 0)
selected.value := 99
plot(m.get(0, 1).value, "SharedSource")
plot(n2.value, "SharedOriginal")
t.set(1, 0, Cell.new(77))
plot(alias.get(1, 0).value, "AliasReplacement")
plot(m.get(0, 1).value, "SourceRetained")
plot(selected.value, "DisplacedRetained")
m.set(1, 2, Cell.new(88))
plot(t.get(2, 1).value, "TransposeRetained")
plot(n6.value, "OriginalRetained")
plot(m.get(1, 2).value, "SourceReplacement")
plot(m.rows(), "SourceRows")
plot(m.columns(), "SourceColumns")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors).toEqual([]);
      expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile?.swallowedErrors ?? []).toEqual([]);
      [1, 4, 2, 5, 3, 6].forEach((value, i) => expect(getPlot(result, `Slot${i}`).values).toEqual([value]));
      const expected = { Rows: 3, Columns: 2, SharedSource: 99, SharedOriginal: 99, AliasReplacement: 77, SourceRetained: 99, DisplacedRetained: 99, TransposeRetained: 6, OriginalRetained: 6, SourceReplacement: 88, SourceRows: 2, SourceColumns: 3 };
      for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
    });
  }
});
