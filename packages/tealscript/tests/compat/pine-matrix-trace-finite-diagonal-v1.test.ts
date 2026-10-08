import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.trace
describe('matrix trace reads only the signed finite main diagonal', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const missingOutside of [false, true]) {
    it(`v${version} ${receiver ? 'receiver' : 'namespace'} ${missingOutside ? 'missing outside' : 'finite outside'}`, () => {
      const constructor = missingOutside ? 'matrix.new<float>(3, 3)' : 'matrix.new<float>(3, 3, 11.0)';
      const call = receiver ? 'm.trace()' : 'matrix.trace(id=m)';
      const result = runCompatScript(`//@version=${version}
indicator("Finite signed matrix trace")
m = ${constructor}
m.set(0, 0, 5)
m.set(1, 1, -2)
m.set(2, 2, 4)
plot(${call}, "Trace")
plot(m.get(0, 0), "First retained")
plot(m.get(1, 1), "Middle retained")
plot(m.get(2, 2), "Last retained")
plot(na(m.get(0, 2)) ? 1 : 0, "Outside missing")`, { bars: compatibilityBars.slice(0, 2) });
      expect(result.errors).toEqual([]);
      for (const [title, value] of Object.entries({ Trace: 7, 'First retained': 5, 'Middle retained': -2,
        'Last retained': 4, 'Outside missing': missingOutside ? 1 : 0 })) {
        expect(getPlot(result, title).values, title).toEqual([value, value]);
      }
    });
  }
});
