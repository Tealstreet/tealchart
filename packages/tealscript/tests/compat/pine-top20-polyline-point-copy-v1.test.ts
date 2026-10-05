import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';

describe('TOP20 job9 straight polyline point isolation', () => {
  it('copies creation coordinates before point mutation and source-array reordering', () => {
    const result = executeScript(parse(`//@version=6
indicator("Polyline copy witness", overlay=true)
p0 = chart.point.from_index(0, 10)
p1 = chart.point.from_index(1, 20)
points = array.from(p0, p1)
polyline.new(points, curved=false, closed=false)
p0.price := 99
p0.index := 7
p1.price := 77
p1.index := 9
array.reverse(points)
polyline.new(points, curved=false, closed=false)
`), [{ time: 60000, open: 10, high: 20, low: 5, close: 15, volume: 100 }]);
    expect(result.errors).toEqual([]);
    expect(result.profile.swallowedErrors ?? []).toEqual([]);
    const polylines = result.drawings.filter(drawing => drawing.type === 'polyline');
    expect(polylines).toHaveLength(2);
    expect(polylines[0].points.map(point => [point.index, point.price])).toEqual([[0, 10], [1, 20]]);
    expect(polylines[1].points.map(point => [point.index, point.price])).toEqual([[9, 77], [7, 99]]);
    expect(polylines.map(line => [line.curved, line.closed])).toEqual([[false, false], [false, false]]);
  });
});
