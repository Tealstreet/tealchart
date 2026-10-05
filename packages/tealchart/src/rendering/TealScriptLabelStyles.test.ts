import type { LabelDrawingOutput } from '@tealstreet/tealscript';
import type { CanvasContext } from './CanvasContext';

import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_MARGINS, DEFAULT_RENDER_OPTIONS } from '../types';
import { partitionTealScriptDrawings } from './TealScriptDrawingPartition';
import { TealScriptDrawingRenderer } from './TealScriptDrawingRenderer';

function paint(style: string) {
  const ctx: CanvasContext = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
    lineDashOffset: 0,
    globalAlpha: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    roundRect: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    clip: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    setLineDash: vi.fn(),
    getLineDash: () => [],
    measureText: () => ({ width: 40 }) as TextMetrics,
  };
  const renderer = new TealScriptDrawingRenderer({
    ctx,
    options: { ...DEFAULT_RENDER_OPTIONS, width: 400, height: 240 },
    margins: { ...DEFAULT_MARGINS, left: 0, right: 0 },
    font: 'sans-serif',
    coordinateResolvers: { timeToX: () => 200, valueToY: () => 110 },
    getTextWidth: () => 40,
  });
  const label: LabelDrawingOutput = {
    id: 'style',
    type: 'label',
    barIndex: 0,
    x: 1000,
    y: 10,
    text: 'Text',
    xloc: 'bar_time',
    yloc: 'price',
    style,
    color: '#123456',
    textColor: '#654321',
    size: 'normal',
  };
  renderer.render(
    partitionTealScriptDrawings([label]),
    [],
    { startTime: 0, endTime: 2000, priceMin: 0, priceMax: 20 },
    {
      id: 'main',
      type: 'main',
      heightRatio: 1,
      yMin: 0,
      yMax: 20,
      fixedRange: false,
      top: 10,
      height: 200,
      bottom: 210,
    },
  );
  expect(ctx.fillText).toHaveBeenCalledOnce();
  return ctx;
}

function polygon(ctx: CanvasContext) {
  expect(ctx.moveTo).toHaveBeenCalledOnce();
  return [...vi.mocked(ctx.moveTo).mock.calls, ...vi.mocked(ctx.lineTo).mock.calls];
}

function triangleDirection(ctx: CanvasContext, direction: 'up' | 'down') {
  const points = polygon(ctx);
  expect(points).toHaveLength(3);
  expect(ctx.closePath).toHaveBeenCalledOnce();
  expect(ctx.fill).toHaveBeenCalledOnce();
  const ys = points.map((point) => point[1]);
  const apexY = direction === 'up' ? Math.min(...ys) : Math.max(...ys);
  expect(ys.filter((y) => y === apexY)).toHaveLength(1);
  const base = points.filter((point) => point[1] !== apexY);
  const apex = points.find((point) => point[1] === apexY)!;
  expect(base[0]![1]).toBe(base[1]![1]);
  expect(apex[0]).toBeGreaterThan(Math.min(base[0]![0], base[1]![0]));
  expect(apex[0]).toBeLessThan(Math.max(base[0]![0], base[1]![0]));
}

describe('documented broad label styles', () => {
  it('circle paints a closed circular body', () => {
    const ctx = paint('circle');
    expect(ctx.arc).toHaveBeenCalledOnce();
    const [, , radius, start, end] = vi.mocked(ctx.arc).mock.calls[0]!;
    expect(radius).toBeGreaterThan(0);
    expect(end - start).toBeCloseTo(2 * Math.PI);
    expect(ctx.fill).toHaveBeenCalledOnce();
    expect(ctx.roundRect).not.toHaveBeenCalled();
  });
  it('square paints a square body', () => {
    const ctx = paint('square');
    expect(ctx.rect).toHaveBeenCalledOnce();
    const [, , width, height] = vi.mocked(ctx.rect).mock.calls[0]!;
    expect(width).toBeGreaterThan(0);
    expect(width).toBe(height);
    expect(ctx.fill).toHaveBeenCalledOnce();
  });
  it('diamond paints four axis-extreme vertices', () => {
    const ctx = paint('diamond');
    const points = polygon(ctx);
    expect(points).toHaveLength(4);
    const [top, right, bottom, left] = points;
    expect(top![0]).toBe(bottom![0]);
    expect(left![1]).toBe(right![1]);
    expect(top![1]).toBeLessThan(left![1]);
    expect(bottom![1]).toBeGreaterThan(left![1]);
    expect(left![0]).toBeLessThan(top![0]);
    expect(right![0]).toBeGreaterThan(top![0]);
    expect(ctx.closePath).toHaveBeenCalledOnce();
    expect(ctx.fill).toHaveBeenCalledOnce();
  });
  for (const direction of ['up', 'down'] as const) {
    it(`triangle${direction} paints a ${direction} apex`, () =>
      triangleDirection(paint(`triangle${direction}`), direction));
  }
  it('flag paints a cloth and a longer narrow pole', () => {
    const ctx = paint('flag');
    expect(ctx.rect).toHaveBeenCalledTimes(2);
    const [cloth, pole] = vi.mocked(ctx.rect).mock.calls;
    expect(cloth![0]).toBe(pole![0]);
    expect(cloth![1]).toBe(pole![1]);
    expect(cloth![2]).toBeGreaterThan(pole![2]);
    expect(pole![3]).toBeGreaterThan(cloth![3]);
    expect(ctx.fill).toHaveBeenCalledTimes(2);
  });
  for (const style of ['cross', 'xcross']) {
    it(`${style} paints two crossing ${style === 'cross' ? 'axis' : 'diagonal'} strokes`, () => {
      const ctx = paint(style);
      expect(ctx.stroke).toHaveBeenCalledOnce();
      expect(ctx.fill).not.toHaveBeenCalled();
      expect(ctx.moveTo).toHaveBeenCalledTimes(2);
      expect(ctx.lineTo).toHaveBeenCalledTimes(2);
      const starts = vi.mocked(ctx.moveTo).mock.calls;
      const ends = vi.mocked(ctx.lineTo).mock.calls;
      const delta = starts.map((start, index) => [ends[index]![0] - start[0], ends[index]![1] - start[1]]);
      if (style === 'cross') {
        expect(delta[0]![0]).toBe(0);
        expect(delta[0]![1]).not.toBe(0);
        expect(delta[1]![0]).not.toBe(0);
        expect(delta[1]![1]).toBe(0);
      } else {
        expect(delta.every(([dx, dy]) => dx !== 0 && dy !== 0)).toBe(true);
        expect(delta[0]![0]! * delta[0]![1]! * delta[1]![0]! * delta[1]![1]!).toBeLessThan(0);
      }
    });
  }
  for (const style of [
    'label_up',
    'label_down',
    'label_lower_left',
    'label_lower_right',
    'label_upper_left',
    'label_upper_right',
    'label_center',
  ]) {
    it(`${style} places its body and pointer relative to the anchor`, () => {
      const ctx = paint(style);
      expect(ctx.roundRect).toHaveBeenCalledOnce();
      const [x, y, width, height] = vi.mocked(ctx.roundRect).mock.calls[0]!;
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
      const [, textX, textY] = vi.mocked(ctx.fillText).mock.calls[0]!;
      expect(textX).toBeGreaterThanOrEqual(x);
      expect(textX).toBeLessThanOrEqual(x + width);
      expect(textY).toBeGreaterThanOrEqual(y);
      expect(textY).toBeLessThanOrEqual(y + height);
      if (style.includes('left')) expect(x).toBeGreaterThanOrEqual(200);
      else if (style.includes('right')) expect(x + width).toBeLessThanOrEqual(200);
      else {
        expect(x).toBeLessThan(200);
        expect(x + width).toBeGreaterThan(200);
      }
      const below = style === 'label_up' || style.includes('upper');
      const above = style === 'label_down' || style.includes('lower');
      if (below) expect(y).toBeGreaterThan(110);
      else if (above) expect(y + height).toBeLessThan(110);
      else {
        expect(y).toBeLessThan(110);
        expect(y + height).toBeGreaterThan(110);
      }
      if (style === 'label_center') {
        expect(ctx.lineTo).not.toHaveBeenCalled();
        expect(ctx.fill).toHaveBeenCalledOnce();
      } else {
        const points = polygon(ctx);
        expect(points).toHaveLength(3);
        expect(points[2]).toEqual([200, 110]);
        expect(points[0]![1]).toBe(below ? y : y + height);
        expect(points[1]![1]).toBe(points[0]![1]);
        expect(ctx.closePath).toHaveBeenCalledOnce();
        expect(ctx.fill).toHaveBeenCalledTimes(2);
      }
    });
  }
  it('none paints only text at the anchor', () => {
    const ctx = paint('none');
    expect(ctx.fillText).toHaveBeenCalledWith('Text', 200, 110);
    for (const method of [ctx.fill, ctx.stroke, ctx.arc, ctx.rect, ctx.roundRect, ctx.lineTo]) {
      expect(method).not.toHaveBeenCalled();
    }
  });
});
