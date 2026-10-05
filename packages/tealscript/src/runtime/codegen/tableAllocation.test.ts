import { describe, expect, it } from 'vitest';
import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

const bars = Array.from({ length: 160 }, (_, i) => ({
  time: (i + 1) * 60000, open: 1, high: 2, low: 0, close: 1, volume: 1,
}));

describe('sparse table allocation', () => {
  it('does not treat unused table dimensions as populated cells', () => {
    // Keep both sparse grids within the verified c9f981a54b allocation budget.
    const result = executeScript(parse(`//@version=6
indicator("sparse grids")
var first = table.new(position.top_left, 50, 100)
var second = table.new(position.top_right, 50, 100)
table.cell(first, 49, 99, "first")
table.cell(second, 0, 0, "second")
plot(bar_index)
`), bars.slice(0, 2));
    expect(result.errors).toEqual([]);
    expect(result.plots[0]?.values).toEqual([0, 1]);
    expect(result.drawings.filter(d => d.type === 'table').map(d => d.cells.length)).toEqual([1, 1]);
  });

  it('continues executing when a script recreates a sparse table each bar', () => {
    const result = executeScript(parse(`//@version=5
indicator("recreated table")
t = table.new(position.bottom_right, 9, 9)
table.cell(t, 0, 0, str.tostring(bar_index))
plot(bar_index)
`), bars);
    expect(result.errors).toEqual([]);
    expect(result.plots[0]?.values).toEqual(bars.map((_, i) => i));
    expect(result.profile.swallowedErrors).toBeUndefined();
  });
});
