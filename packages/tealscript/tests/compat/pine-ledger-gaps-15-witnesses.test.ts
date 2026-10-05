import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const run = (body: string) => runCompatScript(`//@version=6\nindicator("Ledger gaps15")\n${body}`, { bars: compatibilityBars.slice(0, 1) });

// Each registration failed under its targeted engine mutant and passed after
// restoration in the discarded copy (pine-gaps15-witnesses-proof-v1.log).
describe('ledger gaps15 documented boundary witnesses', () => {
  // Rank562/pinned v6 color.from_gradient: series color even with const inputs.
  it('rank562: a gradient with exclusively const arguments still returns series color', () => {
    const result = checkProgram(parse('//@version=6\nindicator("Gradient qualifier")\nvalue = color.from_gradient(5, 0, 10, color.red, color.blue)\nplot(close, color=value)'));
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toEqual({ kind: 'color', qualifier: 'series' });
  });

  // Ranks565/575: the new_box/new_label reference remarks specify index zero.
  for (const [rank, family, first, second, getter] of [
    [565, 'box', 'box.new(4, 13, 5, 7)', 'box.new(9, 23, 10, 17)', 'get_left'],
    [575, 'label', 'label.new(4, 13, "first")', 'label.new(9, 23, "second")', 'get_x'],
  ] as const) {
    it(`rank${rank}: array.new_${family} indexes two distinct handles from zero`, () => {
      const result = run(`first = ${first}\nsecond = ${second}\nitems = array.new_${family}(2, first)\narray.set(items, 1, second)\nplot(${family}.${getter}(array.get(items, 0)), title="zero")\nplot(${family}.${getter}(array.get(items, 1)), title="one")`);
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'zero').values).toEqual([4]);
      expect(getPlot(result, 'one').values).toEqual([9]);
    });
  }

  // Ranks567/572: table.merge_cells remarks target start coordinates for setters.
  for (const method of [false, true]) {
    it(`rank${method ? 572 : 567}: ${method ? 'method' : 'namespace'} setters update the merged anchor and preserve neighboring cells`, () => {
      const call = (name: string, args: string) => method ? `id.${name}(${args})` : `table.${name}(id, ${args})`;
      const result = run(`id = table.new(position.top_left, 3, 2)\ntable.cell(id, 0, 0, "anchor", bgcolor=color.red)\ntable.cell(id, 1, 0, "covered", bgcolor=color.blue)\ntable.cell(id, 2, 1, "neighbor", bgcolor=color.white)\n${call('merge_cells', '0, 0, 1, 0')}\n${call('cell_set_text', '0, 0, "changed"')}\n${call('cell_set_bgcolor', '0, 0, color.green')}`);
      expect(result.errors).toEqual([]);
      const table = result.drawings?.find((drawing) => drawing.type === 'table');
      if (table?.type !== 'table') throw new Error('Expected table');
      expect(table.mergedCells).toEqual([{ startColumn: 0, startRow: 0, endColumn: 1, endRow: 0 }]);
      expect(table.cells.find((cell) => cell.column === 0 && cell.row === 0)).toMatchObject({ text: 'changed', bgcolor: '#4CAF50' });
      expect(table.cells.find((cell) => cell.column === 2 && cell.row === 1)).toMatchObject({ text: 'neighbor', bgcolor: '#FFFFFF' });
    });
  }

  // Rank570: merge method remark explicitly permits cells without table.cell.
  it('rank570: the merge method stores an inclusive rectangle before any cells are defined', () => {
    const result = run('id = table.new(position.top_left, 3, 3)\nid.merge_cells(1, 0, 2, 1)');
    expect(result.errors).toEqual([]);
    const table = result.drawings?.find((drawing) => drawing.type === 'table');
    if (table?.type !== 'table') throw new Error('Expected table');
    expect(table.cells).toEqual([]);
    expect(table.mergedCells).toEqual([{ startColumn: 1, startRow: 0, endColumn: 2, endRow: 1 }]);
  });
});
