import type { ChartPoint } from '../../src/runtime/drawings/types';

import { describe, expect, it } from 'vitest';

import { createPineArray } from '../../src/runtime/arrays';
import { createPineMap } from '../../src/runtime/maps';
import { createPineMatrix } from '../../src/runtime/matrices';
import { cloneRuntimeSnapshot } from '../../src/runtime/scope';
import { getPlot, runCompatScript } from './fixtures';
import { workerPlots } from './ledgerGaps24Worker';

// Variable declarations / varip: built-in reference mutations survive rollback.
describe('census varip state and historical replay', () => {
  it('historical replay cannot reconstruct discarded intrabar executions (913)', async () => {
    const body = 'varip int ticks = 0\nticks += 1\nplot(ticks, "ticks")';
    const live = await workerPlots(body);
    expect(live('ticks')).toEqual([1, 2, 3, 4, 5, 6]);
    const bars = Array.from({ length: 3 }, (_, index) => ({
      time: Date.UTC(2026, 0, 1) + index * 60_000,
      open: 10,
      high: 13,
      low: 7,
      close: [11, 12, 7][index],
      volume: 100,
    }));
    const reloaded = runCompatScript(`//@version=6\nindicator("Historical ticks")\n${body}`, { bars });
    expect(reloaded.errors).toEqual([]);
    expect(getPlot(reloaded, 'ticks').values).toEqual([1, 2, 3]);
  });

  it('preserves chart.point fields through repeated same-bar rollback (915)', async () => {
    const values = await workerPlots(`varip chart.point persistent = chart.point.new(0, 0, 0)
var chart.point regular = chart.point.from_index(0, 0)
persistent.price += 1
persistent.index += 1
persistent.time += 1
regular.price += 1
plot(persistent.price, "persistent")
plot(persistent.index, "index")
plot(persistent.time, "time")
plot(regular.price, "regular")`);
    expect(values('persistent')).toEqual([1, 2, 3, 4, 5, 6]);
    expect(values('index')).toEqual([1, 2, 3, 4, 5, 6]);
    expect(values('time')).toEqual([1, 2, 3, 4, 5, 6]);
    expect(values('regular')).toEqual([1, 2, 2, 2, 2, 3]);
  });

  it.each([
    [
      'array',
      'varip array<chart.point> points = array.from(chart.point.from_index(0, 0))',
      'points.get(0)',
      'points.size()',
    ],
    [
      'matrix',
      'varip matrix<chart.point> points = matrix.new<chart.point>(1, 1, chart.point.from_index(0, 0))',
      'points.get(0, 0)',
      'points.rows() * points.columns()',
    ],
    [
      'map',
      'varip map<int, chart.point> points = map.new<int, chart.point>()\nif barstate.isfirst\n    points.put(0, chart.point.from_index(0, 0))',
      'points.get(0)',
      'points.size()',
    ],
  ])('preserves points held by a varip %s through confirmation (916)', async (_family, declaration, read, size) => {
    const values = await workerPlots(`${declaration}
point = ${read}
point.price += 1
plot(point.price, "price")
plot(${size}, "size")`);
    expect(values('price')).toEqual([1, 2, 3, 4, 5, 6]);
    expect(values('size')).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it('isolates saved point fields and preserves aliases across collection families', () => {
    const point: ChartPoint = { type: 'chart.point', time: 10, index: 2, price: 3 };
    const array = createPineArray(1, point);
    const matrix = createPineMatrix(1, 1, point);
    const map = createPineMap<number, ChartPoint>();
    map.entries.set(0, point);
    const saved = cloneRuntimeSnapshot([point, array, matrix, map]) as [
      ChartPoint,
      typeof array,
      typeof matrix,
      typeof map,
    ];
    point.time = 20;
    point.index = 4;
    point.price = 6;
    expect(saved[0]).toEqual({ type: 'chart.point', time: 10, index: 2, price: 3 });
    expect(saved[0]).not.toBe(point);
    expect(saved[1].values[0]).toBe(saved[0]);
    expect(saved[2].values[0]).toBe(saved[0]);
    expect(saved[3].entries.get(0)).toBe(saved[0]);
  });
});
