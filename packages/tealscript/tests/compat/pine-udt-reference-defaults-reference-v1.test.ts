import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/type-system/#user-defined-types
describe('Omitted UDT fields have independent missing references', () => {
  for (const supplied of [false, true]) {
    it(`supplied count=${supplied}`, () => {
      const result = runCompatScript(`//@version=6
indicator("UDT field defaults")
type Cell
    int value = 7
type Holder
    int count
    bool flag
    array<Cell> items
    matrix<Cell> grid
    map<string, Cell> lookup
    chart.point point
first = Holder.new(${supplied ? 'count=17' : ''})
second = Holder.new()
plot(na(first.count) ? 1 : 0, "CountMissing")
plot(first.flag ? 1 : 0, "Flag")
plot(na(first.items) ? 1 : 0, "ArrayMissing")
plot(na(first.grid) ? 1 : 0, "MatrixMissing")
plot(na(first.lookup) ? 1 : 0, "MapMissing")
plot(na(first.point) ? 1 : 0, "PointMissing")
first.flag := true
first.items := array.from(Cell.new(23))
first.grid := matrix.new<Cell>(1, 1, Cell.new(31))
first.lookup := map.new<string, Cell>()
first.lookup.put("a", Cell.new(41))
first.point := chart.point.from_index(bar_index, 53)
plot(second.flag ? 1 : 0, "SecondFlag")
plot(na(second.items) and na(second.grid) and na(second.lookup) and na(second.point) ? 1 : 0, "SecondMissing")
plot(first.items.get(0).value, "ArrayValue")
plot(first.grid.get(0, 0).value, "MatrixValue")
plot(first.lookup.get("a").value, "MapValue")
plot(first.point.price, "PointValue")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors, JSON.stringify(result.errors)).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      const expected = { CountMissing: supplied ? 0 : 1, Flag: 0, ArrayMissing: 1, MatrixMissing: 1, MapMissing: 1, PointMissing: 1, SecondFlag: 0, SecondMissing: 1, ArrayValue: 23, MatrixValue: 31, MapValue: 41, PointValue: 53 };
      for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
    });
  }
  it('missing UDT array still refuses actual element reads', () => {
    const result = runCompatScript(`//@version=6
indicator("Missing array read")
type Cell
    int value
type Holder
    array<Cell> items
holder = Holder.new()
plot(holder.items.get(0).value)`, { bars: compatibilityBars.slice(0, 1) });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.message).toContain('Array methods cannot be called when the ID is na');
  });
});
