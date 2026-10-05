import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';

const captures = [
  {
    name: 'point-copy-polyline-mutate-v21-v1.pine',
    source:
      '//@version=6\nindicator("Polyline point mutate isolation v21 v1", overlay=false, precision=16, max_polylines_count=3)\nvar float CREATION_INDEX = na\nvar float CALL_COMPLETED = 0\nvar float SOURCE_COUNT = na\nvar float POLYLINE_ALL_SIZE = na\nvar float BEFORE_P0_X = na\nvar float AFTER_P0_X = na\nvar float BEFORE_P0_Y = na\nvar float AFTER_P0_Y = na\nvar float BEFORE_P1_X = na\nvar float AFTER_P1_X = na\nvar float BEFORE_P1_Y = na\nvar float AFTER_P1_Y = na\nvar float BEFORE_P2_X = na\nvar float AFTER_P2_X = na\nvar float BEFORE_P2_Y = na\nvar float AFTER_P2_Y = na\nvar float BEFORE_P3_X = na\nvar float AFTER_P3_X = na\nvar float BEFORE_P3_Y = na\nvar float AFTER_P3_Y = na\nif barstate.islastconfirmedhistory and bar_index >= 32\n    p0 = chart.point.from_index(bar_index - 24, 1.0)\n    p1 = chart.point.from_index(bar_index - 16, 4.0)\n    p2 = chart.point.from_index(bar_index - 8, 2.0)\n    p3 = chart.point.from_index(bar_index, 5.0)\n    points = array.from(p0, p1, p2, p3)\n    polyline.new(points, curved=false, closed=false, xloc=xloc.bar_index, line_color=color.red, line_width=6)\n    reference = array.from(chart.point.from_index(bar_index - 24, 1.0), chart.point.from_index(bar_index - 16, 4.0), chart.point.from_index(bar_index - 8, 2.0), chart.point.from_index(bar_index, 5.0))\n    polyline.new(reference, curved=false, closed=false, xloc=xloc.bar_index, line_color=color.green, line_width=2)\n    CREATION_INDEX := bar_index\n    BEFORE_P0_X := p0.index\n    BEFORE_P0_Y := p0.price\n    BEFORE_P1_X := p1.index\n    BEFORE_P1_Y := p1.price\n    BEFORE_P2_X := p2.index\n    BEFORE_P2_Y := p2.price\n    BEFORE_P3_X := p3.index\n    BEFORE_P3_Y := p3.price\n    p0.price := 6.0\n    p1.index := bar_index - 12\n    p1.price := 8.0\n    p2.price := 7.0\n    p3.price := 9.0\n    after0 = array.get(points, 0)\n    AFTER_P0_X := after0.index\n    AFTER_P0_Y := after0.price\n    after1 = array.get(points, 1)\n    AFTER_P1_X := after1.index\n    AFTER_P1_Y := after1.price\n    after2 = array.get(points, 2)\n    AFTER_P2_X := after2.index\n    AFTER_P2_Y := after2.price\n    after3 = array.get(points, 3)\n    AFTER_P3_X := after3.index\n    AFTER_P3_Y := after3.price\n    polyline.new(points, curved=false, closed=false, xloc=xloc.bar_index, line_color=color.blue, line_width=2)\n    SOURCE_COUNT := array.size(points)\n    POLYLINE_ALL_SIZE := array.size(polyline.all)\n    CALL_COMPLETED := 1\nplot(CREATION_INDEX, "CREATION_INDEX", display=display.data_window)\nplot(CALL_COMPLETED, "CALL_COMPLETED", display=display.data_window)\nplot(SOURCE_COUNT, "SOURCE_COUNT", display=display.data_window)\nplot(POLYLINE_ALL_SIZE, "POLYLINE_ALL_SIZE", display=display.data_window)\nplot(BEFORE_P0_X, "BEFORE_P0_X", display=display.data_window)\nplot(AFTER_P0_X, "AFTER_P0_X", display=display.data_window)\nplot(BEFORE_P0_Y, "BEFORE_P0_Y", display=display.data_window)\nplot(AFTER_P0_Y, "AFTER_P0_Y", display=display.data_window)\nplot(BEFORE_P1_X, "BEFORE_P1_X", display=display.data_window)\nplot(AFTER_P1_X, "AFTER_P1_X", display=display.data_window)\nplot(BEFORE_P1_Y, "BEFORE_P1_Y", display=display.data_window)\nplot(AFTER_P1_Y, "AFTER_P1_Y", display=display.data_window)\nplot(BEFORE_P2_X, "BEFORE_P2_X", display=display.data_window)\nplot(AFTER_P2_X, "AFTER_P2_X", display=display.data_window)\nplot(BEFORE_P2_Y, "BEFORE_P2_Y", display=display.data_window)\nplot(AFTER_P2_Y, "AFTER_P2_Y", display=display.data_window)\nplot(BEFORE_P3_X, "BEFORE_P3_X", display=display.data_window)\nplot(AFTER_P3_X, "AFTER_P3_X", display=display.data_window)\nplot(BEFORE_P3_Y, "BEFORE_P3_Y", display=display.data_window)\nplot(AFTER_P3_Y, "AFTER_P3_Y", display=display.data_window)\nplot(bar_index, "CHART_INDEX", display=display.data_window)\nplot(time, "CHART_TIME_MS", display=display.data_window)\nplot(time_close, "CHART_END_MS", display=display.data_window)\nplot(barstate.isrealtime ? 1 : 0, "CHART_REALTIME", display=display.data_window)\nplot(barstate.isconfirmed ? 1 : 0, "CHART_CONFIRMED", display=display.data_window)\nplot(0, "PANE_ZERO", display=display.data_window)\nplot(10, "PANE_TEN", display=display.data_window)\n',
    sourceSha256: 'df8e67435265f4ce37b39e6cb300e01f035d06cbd2852c23d00def6d7c4c3bda',
    csvSha256: '2a51e70a4c89863e2ac5376bcafa5d519d58462e64968f59556622e78f0edccf',
    after: [
      [-24, 6],
      [-12, 8],
      [-8, 7],
      [0, 9],
    ],
  },
  {
    name: 'point-copy-polyline-reorder-v21-v1.pine',
    source:
      '//@version=6\nindicator("Polyline point reorder isolation v21 v1", overlay=false, precision=16, max_polylines_count=3)\nvar float CREATION_INDEX = na\nvar float CALL_COMPLETED = 0\nvar float SOURCE_COUNT = na\nvar float POLYLINE_ALL_SIZE = na\nvar float BEFORE_P0_X = na\nvar float AFTER_P0_X = na\nvar float BEFORE_P0_Y = na\nvar float AFTER_P0_Y = na\nvar float BEFORE_P1_X = na\nvar float AFTER_P1_X = na\nvar float BEFORE_P1_Y = na\nvar float AFTER_P1_Y = na\nvar float BEFORE_P2_X = na\nvar float AFTER_P2_X = na\nvar float BEFORE_P2_Y = na\nvar float AFTER_P2_Y = na\nvar float BEFORE_P3_X = na\nvar float AFTER_P3_X = na\nvar float BEFORE_P3_Y = na\nvar float AFTER_P3_Y = na\nif barstate.islastconfirmedhistory and bar_index >= 32\n    p0 = chart.point.from_index(bar_index - 24, 1.0)\n    p1 = chart.point.from_index(bar_index - 16, 4.0)\n    p2 = chart.point.from_index(bar_index - 8, 2.0)\n    p3 = chart.point.from_index(bar_index, 5.0)\n    points = array.from(p0, p1, p2, p3)\n    polyline.new(points, curved=false, closed=false, xloc=xloc.bar_index, line_color=color.red, line_width=6)\n    reference = array.from(chart.point.from_index(bar_index - 24, 1.0), chart.point.from_index(bar_index - 16, 4.0), chart.point.from_index(bar_index - 8, 2.0), chart.point.from_index(bar_index, 5.0))\n    polyline.new(reference, curved=false, closed=false, xloc=xloc.bar_index, line_color=color.green, line_width=2)\n    CREATION_INDEX := bar_index\n    BEFORE_P0_X := p0.index\n    BEFORE_P0_Y := p0.price\n    BEFORE_P1_X := p1.index\n    BEFORE_P1_Y := p1.price\n    BEFORE_P2_X := p2.index\n    BEFORE_P2_Y := p2.price\n    BEFORE_P3_X := p3.index\n    BEFORE_P3_Y := p3.price\n    savedSecond = array.get(points, 1)\n    array.set(points, 1, array.get(points, 2))\n    array.set(points, 2, savedSecond)\n    after0 = array.get(points, 0)\n    AFTER_P0_X := after0.index\n    AFTER_P0_Y := after0.price\n    after1 = array.get(points, 1)\n    AFTER_P1_X := after1.index\n    AFTER_P1_Y := after1.price\n    after2 = array.get(points, 2)\n    AFTER_P2_X := after2.index\n    AFTER_P2_Y := after2.price\n    after3 = array.get(points, 3)\n    AFTER_P3_X := after3.index\n    AFTER_P3_Y := after3.price\n    polyline.new(points, curved=false, closed=false, xloc=xloc.bar_index, line_color=color.blue, line_width=2)\n    SOURCE_COUNT := array.size(points)\n    POLYLINE_ALL_SIZE := array.size(polyline.all)\n    CALL_COMPLETED := 1\nplot(CREATION_INDEX, "CREATION_INDEX", display=display.data_window)\nplot(CALL_COMPLETED, "CALL_COMPLETED", display=display.data_window)\nplot(SOURCE_COUNT, "SOURCE_COUNT", display=display.data_window)\nplot(POLYLINE_ALL_SIZE, "POLYLINE_ALL_SIZE", display=display.data_window)\nplot(BEFORE_P0_X, "BEFORE_P0_X", display=display.data_window)\nplot(AFTER_P0_X, "AFTER_P0_X", display=display.data_window)\nplot(BEFORE_P0_Y, "BEFORE_P0_Y", display=display.data_window)\nplot(AFTER_P0_Y, "AFTER_P0_Y", display=display.data_window)\nplot(BEFORE_P1_X, "BEFORE_P1_X", display=display.data_window)\nplot(AFTER_P1_X, "AFTER_P1_X", display=display.data_window)\nplot(BEFORE_P1_Y, "BEFORE_P1_Y", display=display.data_window)\nplot(AFTER_P1_Y, "AFTER_P1_Y", display=display.data_window)\nplot(BEFORE_P2_X, "BEFORE_P2_X", display=display.data_window)\nplot(AFTER_P2_X, "AFTER_P2_X", display=display.data_window)\nplot(BEFORE_P2_Y, "BEFORE_P2_Y", display=display.data_window)\nplot(AFTER_P2_Y, "AFTER_P2_Y", display=display.data_window)\nplot(BEFORE_P3_X, "BEFORE_P3_X", display=display.data_window)\nplot(AFTER_P3_X, "AFTER_P3_X", display=display.data_window)\nplot(BEFORE_P3_Y, "BEFORE_P3_Y", display=display.data_window)\nplot(AFTER_P3_Y, "AFTER_P3_Y", display=display.data_window)\nplot(bar_index, "CHART_INDEX", display=display.data_window)\nplot(time, "CHART_TIME_MS", display=display.data_window)\nplot(time_close, "CHART_END_MS", display=display.data_window)\nplot(barstate.isrealtime ? 1 : 0, "CHART_REALTIME", display=display.data_window)\nplot(barstate.isconfirmed ? 1 : 0, "CHART_CONFIRMED", display=display.data_window)\nplot(0, "PANE_ZERO", display=display.data_window)\nplot(10, "PANE_TEN", display=display.data_window)\n',
    sourceSha256: '115975544118135bfec00c11cdda7632fda3a1cfc2e3cbbdcd74bc58c9038e26',
    csvSha256: 'b5e04ac9e50eac35626c34382e80c3f1bf76c8ccaa207c20fd45709261919758',
    after: [
      [-24, 1],
      [-8, 2],
      [-16, 4],
      [0, 5],
    ],
  },
];
const bars = Array.from({ length: 64 }, (_, i) => ({
  time: 1700000040000 + i * 120000,
  open: 1,
  high: 2,
  low: 0,
  close: 1,
  volume: 1,
}));

// Native v21 renderer target retains the green original, distinct from the blue mutated/reordered path.
// These exact source/CSV bindings extend the cb740b4560 copy-isolation invariant to clause1926.
describe('native v21 polyline creation point copy', () => {
  it.each(captures)('$name [$csvSha256]', (capture) => {
    expect(createHash('sha256').update(capture.source).digest('hex')).toBe(capture.sourceSha256);
    const result = executeScript(parse(capture.source), bars);
    expect(result.errors).toEqual([]);
    expect(result.profile.swallowedErrors ?? []).toEqual([]);
    const polylines = result.drawings.filter((drawing) => drawing.type === 'polyline');
    expect(polylines).toHaveLength(3);
    const original = [
      [39, 1],
      [47, 4],
      [55, 2],
      [63, 5],
    ];
    expect(polylines[0].points.map((point) => [point.index, point.price])).toEqual(original);
    expect(polylines[1].points.map((point) => [point.index, point.price])).toEqual(original);
    expect(polylines[2].points.map((point) => [point.index, point.price])).toEqual(
      capture.after.map(([offset, price]) => [63 + offset, price]),
    );
  });
});
