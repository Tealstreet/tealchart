import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const bars = [{ time: 1700000000000, open: 1, high: 2, low: 0, close: 1, volume: 10 }];
// CF018 native explicit column1 + omitted array:2 rows/3 columns/missing1.
// Hand-built matrices only; array shorthand is an existing engine compatibility control.
describe('matrix insertion index versus array argument', () => {
  for (const method of ['add_col', 'add_row']) {
    const dim = method === 'add_col' ? 'columns' : 'rows';
    for (const call of [`matrix.${method}(m, index)`, `matrix.${method}(id=m, index)`, `m.${method}(index)`]) {
      it(`keeps numeric insertion index with omitted array: ${call}`, () => {
        const result = runCompatScript(
          `//@version=6\nindicator("insert index")\nm = matrix.new<float>(2, 2, 4.0)\nindex = 1\n${call}\nplot(m.${dim}(), "dimension")\nplot(na(m.get(1, 1)) ? 1 : 0, "missing")\nplot(m.get(0, 0), "existing")`,
          { bars },
        );
        expect(result.errors).toEqual([]);
        expect(result.profile.swallowedErrors ?? []).toEqual([]);
        expect(getPlot(result, 'dimension').values).toEqual([3]);
        expect(getPlot(result, 'missing').values).toEqual([1]);
        expect(getPlot(result, 'existing').values).toEqual([4]);
      });
    }
    for (const call of [
      `matrix.${method}(m, array.from(8.0, 9.0))`,
      `matrix.${method}(id=m, array.from(8.0, 9.0))`,
      `m.${method}(array.from(8.0, 9.0))`,
    ]) {
      it(`preserves existing omitted-index array routing: ${call}`, () => {
        const result = runCompatScript(
          `//@version=6\nindicator("insert array")\nm = matrix.new<float>(2, 2, 4.0)\n${call}\nplot(m.${dim}(), "dimension")\nplot(m.get(${method === 'add_col' ? '1, 2' : '2, 1'}), "inserted")`,
          { bars },
        );
        expect(result.errors).toEqual([]);
        expect(result.profile.swallowedErrors ?? []).toEqual([]);
        expect(getPlot(result, 'dimension').values).toEqual([3]);
        expect(getPlot(result, 'inserted').values).toEqual([9]);
      });
    }
  }
  it.each(['index', 'array'])('evaluates an untyped UDF returning %s exactly once', (kind) => {
    const result = runCompatScript(
      `//@version=6\nindicator("once")\nargument(array<int> calls) =>\n    calls.set(0, calls.get(0) + 1)\n    ${kind === 'index' ? '1' : 'array.from(8.0, 9.0)'}\ncalls = array.new_int(1, 0)\nm = matrix.new<float>(2, 2, 4.0)\nm.add_col(argument(calls))\nplot(calls.get(0), "calls")\nplot(m.columns(), "columns")\nplot(${kind === 'index' ? 'na(m.get(1, 1)) ? 1 : 0' : 'm.get(1, 2)'}, "inserted")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(result.profile.swallowedErrors ?? []).toEqual([]);
    expect(getPlot(result, 'calls').values).toEqual([1]);
    expect(getPlot(result, 'columns').values).toEqual([3]);
    expect(getPlot(result, 'inserted').values).toEqual([kind === 'index' ? 1 : 9]);
  });
});
