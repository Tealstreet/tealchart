import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const bars = [{ time: 1700000000000, open: 1, high: 2, low: 0, close: 1, volume: 10 }];
// Current Arrays/Matrices manuals: arrays index from0, add_col dimensions/defaults,
// row arrays copy primitive values but shallow-share reference objects.
describe('ledger1088-1092/1098-1101 collections', () => {
  it('indexes a new table array from zero and fills initial references', () => {
    const result = runCompatScript(
      `//@version=6
indicator("table array")
t = table.new(position.top_right, 1, 1)
a = array.new_table(2, t)
array.get(a, 0).cell(0, 0, "zero")
array.get(a, 1).cell_set_text(0, 0, "one")
plot(array.size(a), "size")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'size').values).toEqual([2]);
    const table = result.drawings.find((d) => d.type === 'table');
    expect(table?.type).toBe('table');
    if (table?.type === 'table') expect(table.cells[0]?.text).toBe('one');
  });
  // Native CF018 batch17, omitted array_id with explicit column1:
  // SHA256 c5d98e40fdd9bdf385156e0c95167d4bbc371122337317082c0d7834c4e8af5c.
  // Native rows/columns/missing flag are2/3/1; input matrix is hand-built.
  it.each(['matrix.add_col(m, 1)', 'm.add_col(1)'])(
    'matches native CF018 omitted array with explicit column: %s',
    (call) => {
      const result = runCompatScript(
        `//@version=6\nindicator("CF018")\nm = matrix.new<float>(2, 2, 4.0)\n${call}\nplot(m.rows(), "rows")\nplot(m.columns(), "columns")\nplot(na(m.get(1, 1)) ? 1 : 0, "missing")\nplot(m.get(1, 2), "shifted")`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'rows').values).toEqual([2]);
      expect(getPlot(result, 'columns').values).toEqual([3]);
      expect(getPlot(result, 'missing').values).toEqual([1]);
      expect(getPlot(result, 'shifted').values).toEqual([4]);
    },
  );
  it.each(['matrix.add_col(m)', 'm.add_col()'])('inserts missing-valued column by default: %s', (call) => {
    const result = runCompatScript(
      `//@version=6\nindicator("add col")\nm = matrix.new<float>(2, 1, 7)\n${call}\nplot(m.columns(), "columns")\nplot(m.get(0, 0), "existing")\nplot(m.get(0, 1), "new0")\nplot(m.get(1, 1), "new1")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'columns').values).toEqual([2]);
    expect(getPlot(result, 'existing').values).toEqual([7]);
    expect(getPlot(result, 'new0').values).toEqual([null]);
    expect(getPlot(result, 'new1').values).toEqual([null]);
  });
  it.each(['matrix.add_col(m, 0, array.from(3))', 'm.add_col(0, array.from(3))'])(
    'rejects mismatched array length at runtime: %s',
    (call) => {
      const result = runCompatScript(
        `//@version=6\nindicator("mismatch")\nm = matrix.new<float>(2, 1, 7)\n${call}\nplot(m.columns(), "columns")`,
        { bars },
      );
      expect(result.errors.some((e) => /size|length|rows/i.test(e.message))).toBe(true);
    },
  );
  it('lets an empty matrix adopt the array dimensions and inserts before existing columns', () => {
    const result = runCompatScript(
      `//@version=6
indicator("add col order")
m = matrix.new<float>()
m.add_col(0, array.from(3.0, 4.0))
m.add_col(0, array.from(8.0, 9.0))
plot(m.rows(), "rows")
plot(m.get(0, 0), "first")
plot(m.get(1, 1), "shifted")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'rows').values).toEqual([2]);
    expect(getPlot(result, 'first').values).toEqual([8]);
    expect(getPlot(result, 'shifted').values).toEqual([4]);
  });
  it.each(['matrix.row(m, 0)', 'm.row(0)'])('copies primitive row values into independent array: %s', (call) => {
    const result = runCompatScript(
      `//@version=6\nindicator("row independence")\nm = matrix.new<float>(1, 2, 7)\na = ${call}\na.set(0, 12)\nm.set(0, 1, 19)\nplot(m.get(0, 0), "matrix")\nplot(a.get(1), "array")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'matrix').values).toEqual([7]);
    expect(getPlot(result, 'array').values).toEqual([7]);
  });
  it.each(['matrix.row(m, 0)', 'm.row(0)'])('shares reference elements but keeps independent row slots: %s', (call) => {
    const result = runCompatScript(
      `//@version=6
indicator("row sharing")
b = label.new(0, 7, "original")
m = matrix.new<label>(1, 1, b)
a = ${call}
a.get(0).set_y(12)
plot(m.get(0, 0).get_y(), "shared")
a.set(0, label.new(0, 19, "replacement"))
plot(m.get(0, 0).get_y(), "matrix")
plot(a.get(0).get_y(), "array")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'shared').values).toEqual([12]);
    expect(getPlot(result, 'matrix').values).toEqual([12]);
    expect(getPlot(result, 'array').values).toEqual([19]);
  });
});
