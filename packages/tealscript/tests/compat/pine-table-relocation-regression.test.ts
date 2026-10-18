import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('table relocation collision regressions', () => {
  for (const overlay of [false, true]) for (const force of [false, true]) {
    it(`replaces only the effective target pane, overlay=${overlay}, force=${force}`, () => {
      const result = runCompatScript(`//@version=5
indicator("Relocation pane", overlay=${overlay})
a = table.new(position.top_left, 1, 1, force_overlay=false)
b = table.new(position.bottom_left, 1, 1, force_overlay=${force})
table.set_position(b, position.top_left)
plot(array.size(table.all), "count")
plot(na(a) ? 1 : 0, "old")
plot(na(b) ? 1 : 0, "mover")
table.set_position(b, position.top_left)
plot(na(b) ? 1 : 0, "self")`, { bars: compatibilityBars.slice(0, 1) });
      const replaces = overlay || !force;
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'count').values).toEqual([replaces ? 1 : 2]);
      expect(getPlot(result, 'old').values).toEqual([replaces ? 1 : 0]);
      for (const title of ['mover', 'self']) expect(getPlot(result, title).values).toEqual([0]);
    });
  }

  it('invalidates aliases, frees replaced cells, and tolerates deleting the old handle', () => {
    const result = runCompatScript(`//@version=5
indicator("Relocation capacity")
a = table.new(position.top_left, 50, 100)
alias = a
refs = array.from(a)
b = table.new(position.bottom_left, 50, 100)
table.set_position(b, position.top_left)
plot(na(alias) ? 1 : 0, "alias")
plot(na(array.get(refs, 0)) ? 1 : 0, "array")
table.delete(a)
table.set_position(b, position.bottom_right)
c = table.new(position.bottom_left, 50, 100)
plot(array.size(table.all), "count")
plot(na(b) ? 1 : 0, "mover")`, { bars: compatibilityBars.slice(0, 1) });
    expect(result.errors).toEqual([]);
    for (const title of ['alias', 'array']) expect(getPlot(result, title).values).toEqual([1]);
    expect(getPlot(result, 'count').values).toEqual([2]);
    expect(getPlot(result, 'mover').values).toEqual([0]);
  });
});
