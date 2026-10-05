import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';

const bars = Array.from({ length: 6 }, (_, i) => ({ time: i * 60_000, open: 1, high: 1, low: 1, close: 1, volume: 1 }));

// Operators ternary section: selected expression only; no local block scope.
// v5 migration removed iff: ternary remains lazy in v5 and v6.
describe('worklist ternary value, laziness and scope', () => {
  for (const version of [5, 6]) {
    it(`v${version} selects nested values and keeps its assignment visible`, () => {
      const result = executeScript(parse(`//@version=${version}
indicator("Ternary values")
selected = bar_index % 2 == 0 ? 11 : 22
nested = bar_index == 0 ? 3 : bar_index == 1 ? 5 : 7
plot(selected, "selected")
plot(nested, "nested")
plot(selected + nested, "visible")`), bars);
      expect(result.errors).toEqual([]);
      expect(result.plots.map((p) => p.values)).toEqual([[11, 22, 11, 22, 11, 22], [3, 5, 7, 7, 7, 7], [14, 27, 18, 29, 18, 29]]);
    });
    it(`v${version} evaluates only the selected mutating branch`, () => {
      const result = executeScript(parse(`//@version=${version}
indicator("Ternary laziness")
var counts = array.new_int(2, 0)
bump(int index) =>
    array.set(counts, index, array.get(counts, index) + 1)
    array.get(counts, index)
chosen = bar_index % 2 == 0 ? bump(0) : bump(1)
plot(chosen, "chosen")
plot(array.get(counts, 0), "left")
plot(array.get(counts, 1), "right")`), bars);
      expect(result.errors).toEqual([]);
      expect(result.plots.map((p) => p.values)).toEqual([[1, 1, 2, 2, 3, 3], [1, 1, 2, 2, 3, 3], [0, 1, 1, 2, 2, 3]]);
    });
  }
});
