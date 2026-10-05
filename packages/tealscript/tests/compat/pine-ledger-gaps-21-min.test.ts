import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json, fun_array.min/method_array.min.
// Ledger805–808: omitted nth is disputed; these min witnesses specify nth0.
describe('documented empty array min', () => {
  it.each([['int', false], ['float', false], ['int', true], ['float', true]] as const)('returns na for empty%s array, receiver%s', (kind, receiver) => {
    const expression = receiver ? 'a.min(0)' : 'array.min(a, 0)';
    const result = runCompatScript(`//@version=6
indicator("Empty min")
a = array.new_${kind}(0)
plot(na(${expression}) ? 1 : 0, "Empty")
array.push(a, 7)
array.push(a, 2)
plot(${expression}, "Populated")`, { bars: compatibilityBars.slice(0, 1) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Empty').values).toEqual([1]);
    expect(getPlot(result, 'Populated').values).toEqual([2]);
  });
});
