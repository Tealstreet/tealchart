import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.concat
describe('Matrix concatenation appends UDT references into the original matrix', () => {
  for (const call of ['left.concat(right)', 'matrix.concat(id2=right, id1=left)']) {
    it(call, () => {
      const nodes = Array.from({ length: 9 }, (_, i) => `n${i + 1} = Cell.new(${i + 1})`).join('\n');
      const writes = Array.from({ length: 9 }, (_, i) => i < 6 ? `left.set(${Math.floor(i / 3)}, ${i % 3}, n${i + 1})` : `right.set(0, ${i - 6}, n${i + 1})`).join('\n');
      const slots = Array.from({ length: 9 }, (_, i) => `plot(joined.get(${Math.floor(i / 3)}, ${i % 3}).value, "Slot${i}")`).join('\n');
      const result = runCompatScript(`//@version=6
indicator("Concatenated objects")
type Cell
    int value
${nodes}
left = matrix.new<Cell>(2, 3)
right = matrix.new<Cell>(1, 3)
${writes}
alias = left
joined = ${call}
${slots}
plot(left.rows(), "LeftRows")
plot(alias.rows(), "AliasRows")
plot(right.rows(), "RightRows")
plot(joined.columns(), "Columns")
selected = joined.get(2, 1)
selected.value := 99
plot(right.get(0, 1).value, "SourceShared")
plot(n8.value, "ExternalShared")
joined.set(2, 1, Cell.new(77))
plot(left.get(2, 1).value, "OriginalMatrixSlot")
plot(alias.get(2, 1).value, "AliasSlot")
plot(right.get(0, 1).value, "SourceRetained")
plot(selected.value, "RemovedRetained")
n9.value := 71
right.set(0, 2, Cell.new(88))
plot(joined.get(2, 2).value, "JoinedRetained")
plot(right.get(0, 2).value, "SourceReplacement")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors).toEqual([]);
      expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile?.swallowedErrors ?? []).toEqual([]);
      Array.from({ length: 9 }, (_, i) => i + 1).forEach((value, i) => expect(getPlot(result, `Slot${i}`).values).toEqual([value]));
      const expected = { LeftRows: 3, AliasRows: 3, RightRows: 1, Columns: 3, SourceShared: 99, ExternalShared: 99, OriginalMatrixSlot: 77, AliasSlot: 77, SourceRetained: 99, RemovedRetained: 99, JoinedRetained: 71, SourceReplacement: 88 };
      for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
    });
  }
});
