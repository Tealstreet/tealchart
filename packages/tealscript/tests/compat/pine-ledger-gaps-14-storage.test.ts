import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const reference = '~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json';

describe(`Ledger gap560: ${reference} functions[462] remarks[0]`, () => {
  it('indexes the first and second array.new_line handles at zero and one', () => {
    const result = runCompatScript(`//@version=6
indicator("Zero-based line array")
lines = array.new_line(2)
array.set(lines, 0, line.new(0, 11, 1, 12))
array.set(lines, 1, line.new(0, 21, 1, 22))
plot(line.get_y1(array.get(lines, 0)), title="First")
plot(line.get_y1(array.get(lines, 1)), title="Second")
`, { bars: compatibilityBars.slice(0, 1) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'First').values).toEqual([11]);
    expect(getPlot(result, 'Second').values).toEqual([21]);
  });
});
