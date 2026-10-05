import { describe, expect, it } from 'vitest';
import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

const bars = [4, 6].map((close, i) => ({ time: i * 60000, open: close, high: close + 1, low: close - 1, close, volume: 1 }));
const run = (body: string) => executeScript(parse(`//@version=6\nindicator("merge errors")\n${body}`), bars);

describe('native identical table merge acceptance and distinct-overlap controls', () => {
  // Native v3 scalar-07 overrides the reference already-merged-cell remark.
  it('accepts a repeated identical merge on the same table', () => {
    const result = run('t = table.new(position.top_left, 2, 2)\ntable.merge_cells(t, 0, 0, 1, 0)\ntable.merge_cells(t, 0, 0, 1, 0)\nplot(1)');
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([1, 1]);
    expect(result.profile.swallowedErrors ?? []).toEqual([]);
  });

  it('retains idempotence for a persistent existing range', () => {
    const result = run('var t = table.new(position.top_left, 2, 2)\nif bar_index == 0\n    table.merge_cells(t, 0, 0, 1, 0)\nif bar_index == 1\n    table.merge_cells(t, 0, 0, 1, 0)\nplot(1)');
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([1, 1]);
  });

  it('allows identical re-merges after redefining the anchor each bar', () => {
    const result = run('var t = table.new(position.top_left, 3, 2)\ntable.cell(t, 0, 0, str.tostring(bar_index))\ntable.merge_cells(t, 0, 0, 2, 0)\nplot(1)');
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([1, 1]);
    const table = result.drawings.find((drawing) => drawing.type === 'table');
    expect(table?.type === 'table' && table.mergedCells).toHaveLength(1);
  });

  it.each([
    ['covered cell', 'table.cell(t, 1, 0, "reset")', '0, 0, 2, 0'],
    ['anchor setter', 'table.cell_set_text(t, 0, 0, "reset")', '0, 0, 2, 0'],
    ['consumed reset', 'table.cell(t, 0, 0, "reset")\ntable.merge_cells(t, 0, 0, 2, 0)', '0, 0, 2, 0'],
  ])('keeps an identical range idempotent after %s', (_label, reset, range) => {
    const result = run(`t = table.new(position.top_left, 3, 2)\ntable.merge_cells(t, 0, 0, 2, 0)\n${reset}\ntable.merge_cells(t, ${range})\nplot(1)`);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([1, 1]);
  });

  it('retains the existing distinct-overlap refusal', () => {
    // Engine compatibility control; arbitrary overlaps lack a native v3 result.
    const result = run('t = table.new(position.top_left, 3, 2)\ntable.merge_cells(t, 0, 0, 2, 0)\ntable.cell(t, 0, 0, "reset")\ntable.merge_cells(t, 0, 0, 1, 0)\nplot(1)');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('existing merged cells');
  });

  it('keeps disjoint ranges and equal coordinates on different tables legal', () => {
    const result = run('t = table.new(position.top_left, 2, 2)\nu = table.new(position.bottom_left, 2, 2)\ntable.merge_cells(t, 0, 0, 1, 0)\ntable.merge_cells(t, 0, 1, 1, 1)\ntable.merge_cells(u, 0, 0, 1, 0)\nplot(1)');
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([1, 1]);
  });

  it('does not execute a skipped duplicate merge', () => {
    const result = run('t = table.new(position.top_left, 2, 2)\ntable.merge_cells(t, 0, 0, 1, 0)\nif bar_index < 0\n    table.merge_cells(t, 0, 0, 1, 0)\nplot(1)');
    expect(result.errors).toEqual([]);
  });
});
