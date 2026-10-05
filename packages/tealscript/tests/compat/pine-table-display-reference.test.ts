import { describe, expect, it } from 'vitest';
import { compatibilityBars, runCompatScript } from './fixtures';

// Authority: Pine v6 table.new remark 2; repeated calls display the last table.
describe('Table creation-site identity', () => {
  it('keeps one creation site across bars and distinguishes another call', () => {
    const result = runCompatScript(`//@version=6
indicator("Table sites")
a = table.new(position.top_left, 1, 1)
b = table.new(position.bottom_left, 1, 1)
table.cell(a, 0, 0, "a")
table.cell(b, 0, 0, "b")`, { bars: compatibilityBars.slice(0, 3) });
    expect(result.errors).toEqual([]);
    const tables = result.drawings!.filter((drawing) => drawing.type === 'table');
    expect(tables).toHaveLength(2);
    const first = tables.filter((table) => table.position === 'top_left');
    const second = tables.filter((table) => table.position === 'bottom_left');
    expect(first.every((table) => typeof table.creationSite === 'string' && table.creationSite === first[0]!.creationSite)).toBe(true);
    expect(second.every((table) => typeof table.creationSite === 'string' && table.creationSite === second[0]!.creationSite)).toBe(true);
    expect(first[0]!.creationSite).not.toEqual(second[0]!.creationSite);
  });
});
