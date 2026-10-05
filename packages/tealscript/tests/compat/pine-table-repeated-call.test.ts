import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('table replacement within one drawing call site', () => {
  it('keeps the final repeated allocation live and invalidates earlier handles', () => {
    const result = runCompatScript(
      `//@version=6
indicator("Repeated table allocation")
ids = array.new<table>()
for i = 0 to 2
    t = table.new(position.top_right,1,1)
    array.push(ids,t)
    table.cell(t,0,0,str.tostring(i))
plot(na(array.get(ids,0)) ? 1 : 0,"first")
plot(na(array.get(ids,1)) ? 1 : 0,"second")
plot(na(array.get(ids,2)) ? 1 : 0,"last")
plot(array.indexof(table.all,array.get(ids,0)),"first_index")
plot(array.indexof(table.all,array.get(ids,2)),"last_index")`,
      { bars: compatibilityBars.slice(0, 1) },
    );
    expect(result.errors).toEqual([]);
    for (const [title, value] of [
      ['first', 1],
      ['second', 1],
      ['last', 0],
      ['first_index', -1],
      ['last_index', 0],
    ] as const) {
      expect(getPlot(result, title).values).toEqual([value]);
    }
    expect(result.drawings).toHaveLength(1);
    expect(result.drawings[0]).toMatchObject({ type: 'table', cells: [{ text: '2' }] });
  });
});
