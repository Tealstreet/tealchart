import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Reference and/or short-circuit remarks and v6 migration lazy evaluation.
// A reached missing-value calculation writes observable state before returning false.
describe('v6 skipped missing-value computations', () => {
  for (const operator of ['and', 'or']) {
    it(`evaluates missing RHS only when required by ${operator}`, () => {
      const result = runCompatScript(
        `//@version=6
indicator("Lazy missing computation")
var calls = array.new_int(1, 0)
missing() =>
    array.set(calls, 0, array.get(calls, 0) + 1)
    float hole = na
    bool(hole)
selected = (bar_index % 2 == 0) ${operator} missing()
plot(selected ? 1 : 0, "Selected")
plot(array.get(calls, 0), "Calls")`,
        { bars: compatibilityBars.slice(0, 4) },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(getPlot(result, 'Selected').values).toEqual(operator === 'and' ? [0, 0, 0, 0] : [1, 0, 1, 0]);
      expect(getPlot(result, 'Calls').values).toEqual(operator === 'and' ? [1, 1, 2, 2] : [0, 1, 1, 2]);
    });
  }
});
