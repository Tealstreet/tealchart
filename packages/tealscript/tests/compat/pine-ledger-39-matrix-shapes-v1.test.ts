import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Reference matrix.is_antidiagonal/is_triangular remarks require square shape.
// Ledger ranks1521-1524 cover namespace and receiver forms independently.
describe('documented square requirement for matrix predicates', () => {
  for (const predicate of ['is_antidiagonal', 'is_triangular']) {
    for (const binding of ['namespace', 'receiver']) {
      it(`${predicate} refuses both rectangular orientations via ${binding}`, () => {
        const call = (id: string) => (binding === 'namespace' ? `matrix.${predicate}(${id})` : `${id}.${predicate}()`);
        const result = runCompatScript(`//@version=6
indicator("Matrix shapes")
wide = matrix.new<float>(2, 3, 0.0)
tall = matrix.new<float>(3, 2, 0.0)
square = matrix.new<float>(2, 2, 0.0)
plot(${call('wide')} ? 1 : 0, "Wide")
plot(${call('tall')} ? 1 : 0, "Tall")
plot(${call('square')} ? 1 : 0, "Square")
`);
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'Wide').values).toEqual(Array(compatibilityBars.length).fill(0));
        expect(getPlot(result, 'Tall').values).toEqual(Array(compatibilityBars.length).fill(0));
        expect(getPlot(result, 'Square').values).toEqual(Array(compatibilityBars.length).fill(1));
      });
    }
  }
});
