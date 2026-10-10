import type { PlotOutput } from '@tealstreet/tealscript';

import { describe, expect, it } from 'vitest';

import {
  applyNativeIndicatorTailToPoints,
  areNativeDrawingOutputsEqual,
  diffNativeIndicatorPlotTail,
  getNativeIndicatorPlotKey,
  mergeNativeIndicatorTail,
} from './nativeIndicatorTail';

const line = (overrides: Partial<PlotOutput> = {}): PlotOutput => ({
  id: 'ma',
  scriptId: 'study-1',
  type: 'plot',
  title: 'MA',
  values: [1, 2, 3],
  color: '#fff',
  ...overrides,
});

describe('diffNativeIndicatorPlotTail', () => {
  it('names the plots whose last bar alone moved', () => {
    const previous = [line(), line({ id: 'signal', values: [4, 5, 6] })];
    const next = [line({ values: [1, 2, 9] }), { ...previous[1]! }];

    expect(diffNativeIndicatorPlotTail(previous, next)).toEqual({ index: 2, keys: ['study-1\nma'] });
  });

  it('reports a result that re-sent identical content as unchanged', () => {
    const previous = [line()];
    expect(diffNativeIndicatorPlotTail(previous, [{ ...previous[0]! }])).toBe('unchanged');
    expect(diffNativeIndicatorPlotTail(previous, [{ ...previous[0]!, values: [1, 2, 3] }])).toBe('unchanged');
    expect(diffNativeIndicatorPlotTail([], [])).toBe('unchanged');
  });

  it('rejects anything but a last-bar move of a plain plot series', () => {
    const previous = [line()];
    const diff = (next: PlotOutput, extra: PlotOutput[] = []) =>
      diffNativeIndicatorPlotTail([...previous, ...extra], [next, ...extra]);

    expect(diff(line({ values: [1, 7, 9] }))).toBeNull();
    expect(diff(line({ values: [1, 2, 3, 4] }))).toBeNull();
    expect(diff(line({ values: [1, 2, 9], linewidth: 2 }))).toBeNull();
    expect(diff(line({ values: [1, 2, 9], offset: 2 }))).toBeNull();
    expect(diff(line({ values: [1, 2, 9], trackprice: true }))).toBeNull();
    expect(diff(line({ values: [1, 2, 9] }), [line({ id: 'band', type: 'fill', values: [] })])).toBeNull();
    expect(diffNativeIndicatorPlotTail([line({ type: 'bgcolor' })], [line({ type: 'bgcolor', values: [1, 2, 9] })])).toBeNull();
    expect(diffNativeIndicatorPlotTail([line({ id: 'a' })], [line({ id: 'b', values: [1, 2, 9] })])).toBeNull();
  });

  it('compares nested fields by content, since every result re-sends them', () => {
    const gradient = { topValue: 1, bottomValue: 0, topColors: ['#fff'], bottomColors: ['#000'] };
    const previous = [line({ gradient } as Partial<PlotOutput>)];
    const next = [line({ values: [1, 2, 9], gradient: JSON.parse(JSON.stringify(gradient)) } as Partial<PlotOutput>)];

    expect(diffNativeIndicatorPlotTail(previous, next)?.keys).toEqual(['study-1\nma']);
  });
});

describe('the live indicator tail', () => {
  const points = [
    { time: 1, value: 1, color: '#fff' },
    { time: 2, value: 2, color: '#fff' },
  ];
  const key = getNativeIndicatorPlotKey(line());
  const tail = { market: 'BTC\n1', time: 2, points: { [key]: { value: 9, color: '#0f0' } } };

  it('replaces the last point of its own plot, market and bar', () => {
    expect(applyNativeIndicatorTailToPoints(points, tail, key, 'BTC\n1')[1]).toEqual({ time: 2, value: 9, color: '#0f0' });
    expect(applyNativeIndicatorTailToPoints(points, tail, key, 'ETH\n1')).toBe(points);
    expect(applyNativeIndicatorTailToPoints(points, tail, 'other\nplot', 'BTC\n1')).toBe(points);
    expect(applyNativeIndicatorTailToPoints(points, { ...tail, time: 3 }, key, 'BTC\n1')).toBe(points);
  });

  it('merges one script result into the tail another already published for the bar', () => {
    const other = { market: 'BTC\n1', time: 2, points: { 'study-2\nrsi': { value: 50, color: null } } };

    expect(Object.keys(mergeNativeIndicatorTail(tail, other).points)).toEqual([key, 'study-2\nrsi']);
    expect(mergeNativeIndicatorTail(tail, { ...other, time: 3 }).points).toBe(other.points);
  });
});

describe('areNativeDrawingOutputsEqual', () => {
  it('treats re-sent drawings with the same content as unchanged', () => {
    const drawing = { id: 'l1', type: 'line', points: [{ x: 1, y: 2 }], style: { color: '#fff' } };

    expect(areNativeDrawingOutputsEqual([drawing], [JSON.parse(JSON.stringify(drawing))])).toBe(true);
    expect(areNativeDrawingOutputsEqual([drawing], [{ ...drawing, points: [{ x: 1, y: 3 }] }])).toBe(false);
    expect(areNativeDrawingOutputsEqual([drawing], [])).toBe(false);
  });
});
