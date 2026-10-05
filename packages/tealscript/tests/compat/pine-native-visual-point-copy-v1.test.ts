import { describe, expect, it } from 'vitest';

import { compatibilityBars, runCompatScript } from './fixtures';

// Native v5 trace-polyline-point-array-mutation-v1, source SHA 089f2667794f2b45.
// Captured original/green coordinates coincide; blue remains ten units higher.
describe('Captured polyline point mutation boundary', () => {
  it('retains original points after coordinate mutations and array.clear', () => {
    const bars = compatibilityBars.slice(0, 8);
    const result = runCompatScript(
      `//@version=6
indicator("Polyline point mutation outcome", max_polylines_count=3)
if barstate.islastconfirmedhistory
    first = chart.point.from_index(bar_index - 5, close)
    second = chart.point.from_index(bar_index, close + 1)
    points = array.from(first, second)
    polyline.new(points, line_color=color.red, line_width=5)
    polyline.new(array.from(chart.point.from_index(bar_index - 5, close), chart.point.from_index(bar_index, close + 1)), line_color=color.green, line_width=1)
    first.price := close + 10
    second.price := close + 11
    polyline.new(array.from(chart.point.from_index(bar_index - 5, close + 10), chart.point.from_index(bar_index, close + 11)), line_color=color.blue, line_width=1)
    array.clear(points)
plot(close, "READINESS_CLOSE")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    const drawings = result.drawings!;
    expect(drawings).toHaveLength(3);
    const original = drawings[0];
    const control = drawings[1];
    const changed = drawings[2];
    expect(original.type).toBe('polyline');
    expect(control.type).toBe('polyline');
    expect(changed.type).toBe('polyline');
    if (original.type !== 'polyline' || control.type !== 'polyline' || changed.type !== 'polyline')
      throw new Error('Expected three polylines');
    expect(original.points).toEqual(control.points);
    expect(original.points.map((p) => p.price)).toEqual([bars[7].close, bars[7].close + 1]);
    expect(changed.points.map((p) => p.price)).toEqual([bars[7].close + 10, bars[7].close + 11]);
    expect(original.points.map((p) => p.index)).toEqual([2, 7]);
  });
});
