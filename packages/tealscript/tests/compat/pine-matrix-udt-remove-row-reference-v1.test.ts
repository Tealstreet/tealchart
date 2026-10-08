import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Removing a row returns its element values; UDT values retain their object references.
// https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.remove_row
describe('UDT removed matrix rows retain ordered original objects', () => {
  for (const call of ['m.remove_row(1)', 'matrix.remove_row(row=1, id=m)']) {
    it(call, () => {
      const nodes = Array.from({ length: 9 }, (_, i) => `n${i + 1} = Cell.new(${i + 1})`).join('\n');
      const writes = Array.from({ length: 9 }, (_, i) => `m.set(${Math.floor(i / 3)}, ${i % 3}, n${i + 1})`).join('\n');
      const slots = Array.from({ length: 6 }, (_, i) => `plot(matrixAlias.get(${Math.floor(i / 3)}, ${i % 3}).value, "Remaining${i}")`).join('\n');
      const result = runCompatScript(`//@version=6
indicator("UDT removed row")
type Cell
    int value
${nodes}
m = matrix.new<Cell>(3, 3)
${writes}
matrixAlias = m
removed = ${call}
arrayAlias = removed
plot(removed.get(0).value, "Removed0")
plot(removed.get(1).value, "Removed1")
plot(removed.get(2).value, "Removed2")
${slots}
selected = removed.get(1)
selected.value := 99
plot(n5.value, "OriginalShared")
n6.value := 71
plot(removed.get(2).value, "ExternalShared")
removed.set(1, Cell.new(77))
plot(arrayAlias.get(1).value, "ArrayAliasReplacement")
plot(selected.value, "DisplacedRetained")
plot(n5.value, "OriginalRetained")
plot(m.get(1, 1).value, "MatrixUnchanged")
m.set(1, 2, Cell.new(88))
plot(removed.get(2).value, "RemovedRetained")
plot(m.get(1, 2).value, "MatrixReplacement")
plot(m.rows(), "Rows")
plot(m.columns(), "Columns")
plot(removed.size(), "RemovedSize")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors).toEqual([]);
      expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile?.swallowedErrors ?? []).toEqual([]);
      [4, 5, 6].forEach((value, i) => expect(getPlot(result, `Removed${i}`).values).toEqual([value]));
      [1, 2, 3, 7, 8, 9].forEach((value, i) => expect(getPlot(result, `Remaining${i}`).values).toEqual([value]));
      const expected = { OriginalShared: 99, ExternalShared: 71, ArrayAliasReplacement: 77, DisplacedRetained: 99, OriginalRetained: 99, MatrixUnchanged: 8, RemovedRetained: 71, MatrixReplacement: 88, Rows: 2, Columns: 3, RemovedSize: 3 };
      for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
    });
  }
});
