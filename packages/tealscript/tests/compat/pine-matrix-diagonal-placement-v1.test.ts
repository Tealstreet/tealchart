import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.is_diagonal
describe('diagonal placement permits signed diagonal values and checks both far corners', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} ${receiver ? 'receiver' : 'namespace'}`, () => {
      const call = receiver ? 'm.is_diagonal()' : 'matrix.is_diagonal(id=m)';
      const result = runCompatScript(`//@version=${version}
indicator("Diagonal placement")
m = matrix.new<int>(3, 3, 0)
m.set(0, 0, 5)
m.set(1, 1, -2)
plot(${call} ? 1 : 0, "Initial")
m.set(0, 2, 3)
plot(${call} ? 1 : 0, "First far violation")
m.set(0, 2, 0)
m.set(2, 0, -4)
plot(${call} ? 1 : 0, "Last far violation")
m.set(2, 0, 0)
plot(${call} ? 1 : 0, "Restored")`, { bars: compatibilityBars.slice(0, 2) });
      expect(result.errors).toEqual([]);
      for (const [title, value] of Object.entries({ Initial: 1, 'First far violation': 0,
        'Last far violation': 0, Restored: 1 })) {
        expect(getPlot(result, title).values, title).toEqual([value, value]);
      }
    });
  }
});
