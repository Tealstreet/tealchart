import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

// Native v3 bounds-11/bounds-12 attempt1 error screenshots: CE10039,
// negative text_size is rejected at compilation, rather than execution.
const prefix = `//@version=6
indicator("table text size")
t = table.new(position.top_right, 1, 1)
`;

describe('native table text_size compile boundary', () => {
  it.each([
    'table.cell(t, 0, 0, "x", text_size=-1)',
    'table.cell(table_id=t, column=0, row=0, text="x", text_size=-1)',
    'table.cell_set_text_size(t, 0, 0, -1)',
    'table.cell_set_text_size(table_id=t, column=0, row=0, text_size=-1)',
  ])('rejects %s', (call) => {
    const result = checkProgram(parse(prefix + call));
    expect(result.diagnostics.some(d => /negative.*text_size|text_size.*non-negative/.test(d.message))).toBe(true);
  });

  it.each([
    'table.cell(t, 0, 0, "x", text_size=1)',
    'table.cell(t, 0, 0, "x", text_size=size.normal)',
    'table.cell_set_text_size(t, 0, 0, 1)',
    'table.cell_set_text_size(t, 0, 0, size.normal)',
  ])('preserves %s', (call) => {
    expect(checkProgram(parse(prefix + call)).diagnostics).toEqual([]);
  });
});

describe('native identical table merge acceptance', () => {
  // scalar-07 attempt1.csv: OUTCOME=1 throughout historical execution.
  it('accepts identical repeated ranges without an anchor reset', () => {
    const result = runCompatScript(`//@version=6
indicator("identical merge")
t = table.new(position.top_right, 2, 2)
table.merge_cells(t, 0, 0, 1, 0)
table.merge_cells(t, 0, 0, 1, 0)
plot(1, "OUTCOME")`);
    expect(result.errors).toEqual([]);
    expect(result.profile?.swallowedErrors ?? []).toEqual([]);
    expect(getPlot(result, 'OUTCOME').values).toEqual(Array(12).fill(1));
  });
});
