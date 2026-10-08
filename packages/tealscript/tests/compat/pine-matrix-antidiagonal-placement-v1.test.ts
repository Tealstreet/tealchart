import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.is_antidiagonal
describe('antidiagonal placement reads both far outer rows and permits the center', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} ${receiver ? 'receiver' : 'namespace'}`, () => {
      const call = receiver ? 'm.is_antidiagonal()' : 'matrix.is_antidiagonal(id=m)';
      const result = runCompatScript(`//@version=${version}
indicator("Antidiagonal placement")
m = matrix.new<int>(3, 3, 0)
m.set(0, 2, 7)
m.set(1, 1, -2)
m.set(2, 0, 5)
plot(${call} ? 1 : 0, "Initial")
m.set(0, 0, 3)
plot(${call} ? 1 : 0, "First outer violation")
m.set(0, 0, 0)
m.set(2, 2, -4)
plot(${call} ? 1 : 0, "Last outer violation")
m.set(2, 2, 0)
plot(${call} ? 1 : 0, "Restored")`, { bars: compatibilityBars.slice(0, 2) });
      expect(result.errors).toEqual([]);
      for (const [title, value] of Object.entries({ Initial: 1, 'First outer violation': 0,
        'Last outer violation': 0, Restored: 1 })) {
        expect(getPlot(result, title).values, title).toEqual([value, value]);
      }
    });
  }
});
