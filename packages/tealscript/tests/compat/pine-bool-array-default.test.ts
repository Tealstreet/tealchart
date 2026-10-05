import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

describe('Pine boolean array defaults', () => {
  it.each(['array.new_bool', 'array.new<bool>'])('fills omitted %s initial values with false in v6', (constructor) => {
    const result = runCompatScript(`//@version=6
indicator("Boolean defaults")
a = ${constructor}(2)
b = ${constructor}(size=2)
c = ${constructor}(initial_value=true, size=2)
plot(a.get(0) == false and a.get(1) == false ? 1 : 0, "Positional")
plot(b.get(0) == false and b.get(1) == false ? 1 : 0, "Named")
plot(c.get(0) == true and c.get(1) == true ? 1 : 0, "Explicit")
plot(array.size(${constructor}()), "Empty")
plot(na(array.get(array.new_float(1), 0)) ? 1 : 0, "Float default")
`, { bars: [{ time: 0, open: 1, high: 1, low: 1, close: 1, volume: 1 }] });

    expect(result.errors).toEqual([]);
    for (const title of ['Positional', 'Named', 'Explicit', 'Float default']) {
      expect(getPlot(result, title).values).toEqual([1]);
    }
    expect(getPlot(result, 'Empty').values).toEqual([0]);
  });

  it('preserves v5 boolean na defaults', () => {
    const result = runCompatScript(`//@version=5
indicator("Legacy boolean default")
plot(na(array.get(array.new_bool(1), 0)) ? 1 : 0, "Default")
`, { bars: [{ time: 0, open: 1, high: 1, low: 1, close: 1, volume: 1 }] });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Default').values).toEqual([1]);
  });
});
