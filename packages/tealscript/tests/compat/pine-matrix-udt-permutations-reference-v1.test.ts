import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Official matrix reshape/swap/reverse clauses and shallow UDT reference semantics.
// https://www.tradingview.com/pine-script-docs/language/matrices/
const operations = [
  { member: 'reshape', args: 'columns=2, rows=3', order: [1, 2, 3, 4, 5, 6], rows: 3, columns: 2 },
  { member: 'swap_rows', args: 'row2=1, row1=0', order: [4, 5, 6, 1, 2, 3], rows: 2, columns: 3 },
  { member: 'swap_columns', args: 'column2=2, column1=0', order: [3, 2, 1, 6, 5, 4], rows: 2, columns: 3 },
  { member: 'reverse', args: '', order: [6, 5, 4, 3, 2, 1], rows: 2, columns: 3 },
];

describe('compiled UDT matrix permutations retain slots and shared references', () => {
  for (const operation of operations) {
    for (const receiver of [false, true]) {
      it(`${operation.member} ${receiver ? 'receiver' : 'namespace'} preserves all six positions and identity`, () => {
        const nodes = Array.from({ length: 6 }, (_, index) => `n${index + 1} = Cell.new(${index + 1})`).join('\n');
        const writes = Array.from(
          { length: 6 },
          (_, index) => `m.set(${Math.floor(index / 3)}, ${index % 3}, n${index + 1})`,
        ).join('\n');
        const slots = operation.order
          .map(
            (_, index) =>
              `plot(alias.get(${Math.floor(index / operation.columns)}, ${index % operation.columns}).value, "Slot${index}")`,
          )
          .join('\n');
        const args = receiver ? operation.args : ['id=m', operation.args].filter(Boolean).join(', ');
        const call = receiver ? `m.${operation.member}(${args})` : `matrix.${operation.member}(${args})`;
        const result = runCompatScript(
          `//@version=6
indicator("UDT permutations")
type Cell
    int value
${nodes}
m = matrix.new<Cell>(2, 3)
${writes}
alias = m
${call}
${slots}
plot(alias.rows(), "Rows")
plot(alias.columns(), "Columns")
moved = alias.get(0, 0)
moved.value := 99
plot(m.get(0, 0).value, "Shared")
plot(n${operation.order[0]}.value, "Original")
m.set(0, 0, Cell.new(77))
plot(alias.get(0, 0).value, "Replacement")
plot(moved.value, "Retained")
plot(alias.get(${operation.rows - 1}, ${operation.columns - 1}).value, "Tail")`,
          {
            bars: compatibilityBars.slice(0, 1),
          },
        );
        expect(result.errors).toEqual([]);
        operation.order.forEach((value, index) => expect(getPlot(result, `Slot${index}`).values).toEqual([value]));
        for (const [title, value] of [
          ['Rows', operation.rows],
          ['Columns', operation.columns],
          ['Shared', 99],
          ['Original', 99],
          ['Replacement', 77],
          ['Retained', 99],
          ['Tail', operation.order.at(-1)],
        ] as const) {
          expect(getPlot(result, title).values).toEqual([value]);
        }
      });
    }
  }
});
