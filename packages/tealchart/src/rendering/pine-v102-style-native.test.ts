import { describe, expect, it } from 'vitest';

import { styleEntries } from '../../../tealscript/tests/fixtures/v102Style';
import { traceStyle } from '../test/v102StylePaint';

const entry = styleEntries.find(e => e.id === 'v102-extend-stroke-v6')!;
for (const channel of ['web', 'native'] as const) describe(`v102 original PNG-bound extension/stroke/width ${channel}`, () => {
  it('paints each captured none/left/right/both line and box extension on its registered side', () => {
    expect(entry.regions.facets[0]).toMatchObject({ verdict: 'SUPPORTED', supportedCandidate: 'FOUR_REGISTERED_EXTENSION_MODES_APPLIED' });
    const { paints, result, bars } = traceStyle(entry, channel);
    const last = bars.length - 1;
    const red = result.drawings.filter(d => d.type === 'line').filter(d => d.color === '#F23645');
    expect(red).toHaveLength(4);
    for (const [i, extend] of ['none', 'left', 'right', 'both'].entries()) {
      const line = red[i];
      expect(line).toMatchObject({ extend, y1: 45 + 12 * i, y2: 45 + 12 * i });
      const stroke = paints.find(p => p.kind === 'stroke' && p.color === line.color && p.points.length === 2 && Math.round(p.points[0].y) === 100 - (45 + 12 * i))!;
      expect(stroke).toBeDefined();
      expect(stroke.points[0].x).toBe(extend === 'left' || extend === 'both' ? 0 : (last - 100) / last * 1000);
      expect(stroke.points[1].x).toBe(extend === 'right' || extend === 'both' ? 1000 : (last - 60) / last * 1000);
      const box = result.drawings.filter(d => d.type === 'box').find(d => d.top === 50 + 12 * i)!;
      expect(box).toMatchObject({ extend });
      const fill = paints.find(p => p.kind === 'fill' && p.color === box.bgcolor && p.points.some(point => Math.round(point.y) === 100 - (50 + 12 * i)))!;
      expect(fill).toBeDefined();
      expect(Math.min(...fill.points.map(p => p.x))).toBe(extend === 'left' || extend === 'both' ? 0 : (last - 45) / last * 1000);
      expect(Math.max(...fill.points.map(p => p.x))).toBe(extend === 'right' || extend === 'both' ? 1000 : (last - 15) / last * 1000);
    }
  });
  it('paints separate solid/dash/dot classes and two outward arrowheads at the supplied endpoints', () => {
    expect(entry.regions.facets[1]).toMatchObject({ verdict: 'SUPPORTED', supportedCandidate: 'FOUR_REGISTERED_LINE_STROKES_VISIBLE' });
    const { paints, bars } = traceStyle(entry, channel);
    const last = bars.length - 1;
    const strokes = [45, 57, 69, 81].map(y => paints.find(p => p.kind === 'stroke' && p.color === '#F23645' && p.points.length === 2 && Math.round(p.points[0].y) === 100 - y)!);
    expect(strokes.map(s => s.dash.length > 0)).toEqual([false, true, true, false]);
    expect(strokes[1].dash[0]).toBeGreaterThan(strokes[2].dash[0]);
    for (const i of [0, 1, 2, 3]) {
      const border = paints.find(p => p.kind === 'stroke' && p.color === '#2962FF' && p.points.some(point => Math.round(point.y) === 100 - (50 + 12 * i)))!;
      expect(border).toBeDefined();
      expect(border.dash.length > 0).toBe(i % 2 !== 0);
    }
    const heads = paints.filter(p => p.kind === 'stroke' && p.color === '#F23645' && p.points.length === 3);
    expect(heads).toHaveLength(2);
    const supplied = [(last - 100) / last * 1000, (last - 60) / last * 1000];
    for (const [i, head] of heads.entries()) {
      expect(head.points[1].x).toBe(supplied[i]);
      expect(Math.round(head.points[1].y)).toBe(19);
      expect(head.points.filter((_p, index) => index !== 1).every(p => i === 0 ? p.x > supplied[i] : p.x < supplied[i])).toBe(true);
    }
  });
  it('width setters reach the same thick class as constructor4 while thin box controls stay thin', () => {
    expect(entry.regions.facets[2]).toMatchObject({ verdict: 'SUPPORTED', supportedCandidate: 'SETTER_STROKES_HAVE_CONSTRUCTOR_WIDTH4_CLASS' });
    const { paints } = traceStyle(entry, channel);
    const blue = paints.filter(p => p.kind === 'stroke' && p.color === '#2962FF');
    const line = blue.find(p => p.points.length === 2 && Math.round(p.points[0].y) === 85)!;
    const red = paints.find(p => p.kind === 'stroke' && p.color === '#F23645' && Math.round(p.points[0].y) === 55)!;
    expect(line.width).toBe(4);
    expect(line.dash.length).toBeGreaterThan(0);
    expect(red.width).toBe(4);
    const setterBox = blue.filter(p => p.points.some(point => Math.round(point.y) === 65 || Math.round(point.y) === 75));
    expect(setterBox.length).toBeGreaterThan(0);
    expect(setterBox.every(p => p.width === 4 && p.dash.length > 0)).toBe(true);
    const controls = blue.filter(p => p.points.some(point => Math.round(point.y) === 50));
    expect(controls.length).toBeGreaterThan(0);
    expect(controls.every(p => p.width === 1)).toBe(true);
  });
});
