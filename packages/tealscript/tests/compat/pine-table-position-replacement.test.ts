import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('documented table position replacement', () => {
  it('runs the native scalar-07 repeated merge past the former cumulative cell limit', () => {
    const bars = Array.from({ length: 2601 }, (_, index) => ({
      ...compatibilityBars[0]!,
      time: compatibilityBars[0]!.time + index * 60_000,
    }));
    const result = runCompatScript(
      `//@version=6
indicator("V3-SCALAR-07", max_bars_back=256)
t=table.new(position.top_right,2,2)
table.merge_cells(t,0,0,1,0)
table.merge_cells(t,0,0,1,0)
plot(1,"OUTCOME")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'OUTCOME').values).toEqual(bars.map(() => 1));
    expect(result.drawings).toHaveLength(1);
  });

  for (const historical of [false, true]) {
    it(`invalidates replaced references ${historical ? 'across bars' : 'across call sites'} while preserving another position`, () => {
      const result = runCompatScript(
        `//@version=6
indicator("Table replacement aliases")
var survivor = table.new(position.bottom_left,1,1)
var dropped = table.new(position.top_right,1,1)
var alias = dropped
var refs = array.from(dropped)
${historical ? 'if bar_index == 1\n    ' : ''}replacement = table.new(position.top_right,2,2)
plot(na(dropped) ? 1 : 0,"direct")
plot(na(alias) ? 1 : 0,"alias")
plot(na(array.get(refs,0)) ? 1 : 0,"array")
plot(na(survivor) ? 1 : 0,"survivor")
plot(array.size(table.all),"count")`,
        { bars: compatibilityBars.slice(0, 3) },
      );
      expect(result.errors).toEqual([]);
      for (const title of ['direct', 'alias', 'array']) {
        expect(getPlot(result, title).values).toEqual(historical ? [0, 1, 1] : [1, 1, 1]);
      }
      expect(getPlot(result, 'survivor').values).toEqual([0, 0, 0]);
      expect(getPlot(result, 'count').values).toEqual([2, 2, 2]);
      expect(
        result.drawings.filter((drawing) => drawing.type === 'table' && drawing.position === 'top_right'),
      ).toHaveLength(1);
    });
  }

  it('releases the previous allocation before admitting a same-position full-size replacement', () => {
    const result = runCompatScript(
      `//@version=6
indicator("Full table replacement")
t = table.new(position.top_right,100,100)
replacement = table.new(position.top_right,100,100)
plot(array.size(table.all),"count")`,
      { bars: compatibilityBars.slice(0, 2) },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'count').values).toEqual([1, 1]);
  });

  it('counts surviving tables at other positions against the existing cell limit', () => {
    const result = runCompatScript(
      `//@version=6
indicator("Other position capacity")
survivor = table.new(position.bottom_left,100,100)
table.cell(survivor,0,0,"survivor")
table.new(position.top_right,1,1)
plot(1,"unreachable")`,
      { bars: compatibilityBars.slice(0, 1) },
    );
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.message).toContain('Too many table cells');
    expect(result.plots).toEqual([]);
    expect(result.drawings).toHaveLength(1);
    expect(result.drawings[0]).toMatchObject({ position: 'bottom_left', cells: [{ text: 'survivor' }] });
  });

  it('preserves the previous table when a replacement itself exceeds capacity', () => {
    const result = runCompatScript(
      `//@version=6
indicator("Invalid table replacement")
previous = table.new(position.top_right,1,1)
table.cell(previous,0,0,"previous")
table.new(position.top_right,101,101)
plot(1,"unreachable")`,
      { bars: compatibilityBars.slice(0, 1) },
    );
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.message).toContain('Too many table cells');
    expect(result.plots).toEqual([]);
    expect(result.drawings).toHaveLength(1);
    expect(result.drawings[0]).toMatchObject({ position: 'top_right', cells: [{ text: 'previous' }] });
  });
});
