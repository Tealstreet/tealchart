import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.is_antisymmetric
describe('antisymmetry reads signed far pairs and the diagonal', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} ${receiver ? 'receiver' : 'namespace'}`, () => {
      const call = receiver ? 'm.is_antisymmetric()' : 'matrix.is_antisymmetric(id=m)';
      const values = [0, -2, 7, 2, 0, 5, -7, -5, 0];
      const result = runCompatScript(`//@version=${version}
indicator("Far pair antisymmetry")
m = matrix.new<int>(3, 3, 0)
${values.map((value, index) => `m.set(${Math.floor(index / 3)}, ${index % 3}, ${value})`).join('\n')}
plot(${call} ? 1 : 0, "Initial")
m.set(1, 1, 9)
plot(${call} ? 1 : 0, "Nonzero diagonal")
m.set(1, 1, 0)
m.set(2, 0, 7)
plot(${call} ? 1 : 0, "Far sign broken")
m.set(2, 0, -7)
plot(${call} ? 1 : 0, "Restored pair")`, { bars: compatibilityBars.slice(0, 2) });
      expect(result.errors).toEqual([]);
      for (const [title, value] of Object.entries({ Initial: 1, 'Nonzero diagonal': 0,
        'Far sign broken': 0, 'Restored pair': 1 })) {
        expect(getPlot(result, title).values, title).toEqual([value, value]);
      }
    });
  }
});
