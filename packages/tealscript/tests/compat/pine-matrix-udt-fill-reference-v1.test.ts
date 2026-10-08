import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// All replaced UDT slots point to the same object supplied to matrix.fill.
// https://www.tradingview.com/pine-script-docs/language/matrices/#matrixfill
const calls = [
  'm.fill(incoming, 1, 3, 1, 3)',
  'matrix.fill(to_column=3, value=incoming, from_row=1, id=m, to_row=3, from_column=1)',
];

describe('UDT matrix fill preserves rectangular bounds and supplied identity', () => {
  for (const call of calls) {
    it(call, () => {
      const nodes = Array.from({ length: 12 }, (_, i) => `n${i + 1} = Cell.new(${i + 1})`).join('\n');
      const writes = Array.from({ length: 12 }, (_, i) => `m.set(${Math.floor(i / 4)}, ${i % 4}, n${i + 1})`).join('\n');
      const slots = Array.from({ length: 12 }, (_, i) => `plot(alias.get(${Math.floor(i / 4)}, ${i % 4}).value, "Slot${i}")`).join('\n');
      const result = runCompatScript(`//@version=6
indicator("UDT rectangular fill")
type Cell
    int value
${nodes}
m = matrix.new<Cell>(3, 4)
${writes}
alias = m
incoming = Cell.new(71)
${call}
${slots}
selected = m.get(1, 1)
selected.value := 99
plot(incoming.value, "SuppliedShared")
plot(m.get(1, 2).value, "SharedSecond")
plot(m.get(2, 1).value, "SharedThird")
plot(m.get(2, 2).value, "SharedFourth")
m.set(1, 1, Cell.new(77))
plot(alias.get(1, 1).value, "Replacement")
plot(selected.value, "DisplacedRetained")
plot(alias.get(1, 2).value, "OtherSlotRetained")
plot(n6.value, "OriginalRetained")
plot(m.get(0, 1).value, "TopUntouched")
plot(m.get(1, 3).value, "RightUntouched")
plot(m.get(2, 0).value, "LeftUntouched")
plot(m.rows(), "Rows")
plot(m.columns(), "Columns")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors).toEqual([]);
      expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile?.swallowedErrors ?? []).toEqual([]);
      [1, 2, 3, 4, 5, 71, 71, 8, 9, 71, 71, 12].forEach((value, i) => {
        expect(getPlot(result, `Slot${i}`).values).toEqual([value]);
      });
      const expected = { SuppliedShared: 99, SharedSecond: 99, SharedThird: 99, SharedFourth: 99, Replacement: 77, DisplacedRetained: 99, OtherSlotRetained: 99, OriginalRetained: 6, TopUntouched: 2, RightUntouched: 8, LeftUntouched: 9, Rows: 3, Columns: 4 };
      for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
    });
  }
});

// https://www.tradingview.com/pine-script-docs/language/matrices/#filling-a-matrix
describe('matrix fill repeats UDT references within the selected rectangle', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} ${receiver ? 'receiver' : 'namespace'}`, () => {
      const call = receiver ? 'm.fill(shared, 0, 2, 1, 2)' : 'matrix.fill(id=m, value=shared, from_row=0, to_row=2, from_column=1, to_column=2)';
      const result = runCompatScript(`//@version=${version}
indicator("UDT fill references")
type Cell
    int value
outside = Cell.new(3)
shared = Cell.new(7)
m = matrix.new<Cell>(2, 2, outside)
${call}
shared.value := 17
plot(m.get(0, 1).value, "First filled")
plot(m.get(1, 1).value, "Last filled")
plot(m.get(0, 0).value, "Outside first")
plot(m.get(1, 0).value, "Outside last")
m.set(0, 1, Cell.new(100))
plot(m.get(0, 1).value, "Replacement")
plot(m.get(1, 1).value, "Retained filled")
plot(shared.value, "External")`, { bars: compatibilityBars.slice(0, 2) });
      expect(result.errors).toEqual([]);
      for (const [title, value] of Object.entries({ 'First filled': 17, 'Last filled': 17,
        'Outside first': 3, 'Outside last': 3, Replacement: 100, 'Retained filled': 17, External: 17 })) {
        expect(getPlot(result, title).values, title).toEqual([value, value]);
      }
    });
  }
});
