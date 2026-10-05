import type { SkCanvas } from '@shopify/react-native-skia';
import type { DrawingOutput } from '@tealstreet/tealscript';
import type { CanvasContext } from '../../rendering/CanvasContext';

import { matchFont } from '@shopify/react-native-skia';
import { describe, expect, it, vi } from 'vitest';

import { partitionTealScriptDrawings } from '../../rendering/TealScriptDrawingPartition';
import { TealScriptDrawingRenderer } from '../../rendering/TealScriptDrawingRenderer';
import { DEFAULT_RENDER_OPTIONS } from '../../types';
import { createNativeDrawingContext } from './nativeDrawingContext';
import { createNativeDrawingFonts } from './nativeDrawingFonts';
import { paintNativeTealScriptDrawings } from './nativeTealScriptDrawings';

const bars = [1000, 2000, 3000].map((time) => ({ time, open: 10, high: 20, low: 5, close: 15, volume: 1 }));
const viewport = { startTime: 1000, endTime: 3000, priceMin: 0, priceMax: 20 };
const pane = {
  id: 'main',
  type: 'main' as const,
  heightRatio: 1,
  fixedRange: false,
  top: 10,
  bottom: 210,
  height: 200,
  yMin: 0,
  yMax: 20,
};
const margins = { left: 10, right: 10, top: 10, bottom: 0 };
const line = {
  id: 'l',
  type: 'line' as const,
  barIndex: 0,
  x1: 0,
  y1: 10,
  x2: 2,
  y2: 20,
  xloc: 'bar_index' as const,
  extend: 'both' as const,
  color: '#12345680',
  width: 3,
  style: 'dashed' as const,
};
const label = {
  id: 'label',
  type: 'label' as const,
  barIndex: 1,
  x: 1,
  y: 10,
  text: 'Hi',
  xloc: 'bar_index' as const,
  yloc: 'price' as const,
  style: 'none' as const,
  color: '#12345680',
  textColor: '#ffffff',
  size: 'normal' as const,
};
const box = {
  id: 'box',
  type: 'box' as const,
  barIndex: 0,
  left: 0,
  right: 2,
  top: 18,
  bottom: 8,
  xloc: 'bar_index' as const,
  extend: 'none' as const,
  borderColor: '#aabbcc80',
  borderWidth: 2,
  borderStyle: 'solid' as const,
  bgcolor: '#11223344',
  text: 'A\nB',
  textColor: '#ffffff',
  textSize: 'normal' as const,
};
const cell = {
  column: 0,
  row: 0,
  text: 'ATR',
  textColor: '#ffffff',
  textSize: 'normal' as const,
  textHalign: 'center' as const,
  textValign: 'middle' as const,
  bgcolor: '#111827',
  width: 0,
  height: 0,
};
const table = {
  id: 'table',
  type: 'table' as const,
  barIndex: 0,
  position: 'top_right' as const,
  columns: 1,
  rows: 1,
  bgcolor: '#44556680',
  frameColor: '#111111',
  frameWidth: 2,
  borderColor: '#222222',
  borderWidth: 1,
  cells: [cell],
};
const polyline = {
  id: 'poly',
  type: 'polyline' as const,
  barIndex: 0,
  points: [10, 15, 12].map((price, index) => ({ type: 'chart.point' as const, time: null, index, price })),
  curved: true,
  closed: true,
  xloc: 'bar_index' as const,
  lineColor: '#2962ff80',
  fillColor: '#ff000040',
  lineStyle: 'solid' as const,
  lineWidth: 2,
};

// Record the logical canvas commands at each adapter boundary. Native commands
// still execute against Skia, so missing font host objects also fail below.
function record(ctx: CanvasContext) {
  const events: unknown[][] = [];
  for (const method of [
    'beginPath',
    'moveTo',
    'lineTo',
    'quadraticCurveTo',
    'bezierCurveTo',
    'arc',
    'rect',
    'roundRect',
    'closePath',
    'fill',
    'stroke',
    'fillRect',
    'strokeRect',
    'fillText',
    'strokeText',
    'save',
    'restore',
    'clip',
    'setLineDash',
  ] as const) {
    const original = ctx[method].bind(ctx) as (...args: unknown[]) => unknown;
    vi.spyOn(ctx, method).mockImplementation(((...args: unknown[]) => {
      events.push([
        method,
        ...args,
        ctx.font,
        ctx.fillStyle,
        ctx.strokeStyle,
        ctx.lineWidth,
        ctx.textAlign,
        ctx.textBaseline,
      ]);
      return original(...args);
    }) as never);
  }
  return events;
}
function compare(drawings: DrawingOutput[]) {
  const canvas = Object.fromEntries(
    ['save', 'restore', 'scale', 'translate', 'clipPath', 'drawPath', 'drawRect', 'drawText'].map((method) => [
      method,
      vi.fn(),
    ]),
  ) as unknown as SkCanvas;
  const nativeCtx = createNativeDrawingContext(canvas, createNativeDrawingFonts(drawings));
  // Same deterministic text measurement, with independent Canvas2D state.
  const state = {
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '12px sans-serif',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    lineDashOffset: 0,
    globalAlpha: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
  };
  const stack: (typeof state)[] = [];
  const webCtx = {
    ...state,
    ...Object.fromEntries(
      [
        'beginPath',
        'moveTo',
        'lineTo',
        'quadraticCurveTo',
        'bezierCurveTo',
        'arc',
        'rect',
        'roundRect',
        'closePath',
        'fill',
        'stroke',
        'fillRect',
        'strokeRect',
        'fillText',
        'strokeText',
        'clip',
        'scale',
        'translate',
        'setLineDash',
      ].map((method) => [method, () => {}]),
    ),
    save() {
      stack.push(
        Object.fromEntries(Object.keys(state).map((key) => [key, webCtx[key as keyof CanvasContext]])) as typeof state,
      );
    },
    restore() {
      Object.assign(webCtx, stack.pop());
    },
    getLineDash() {
      return [];
    },
    measureText(text: string) {
      return { width: text.length * 7 };
    },
  } as CanvasContext;
  const webEvents = record(webCtx);
  const nativeEvents = record(nativeCtx);
  new TealScriptDrawingRenderer({
    ctx: webCtx,
    options: { ...DEFAULT_RENDER_OPTIONS, width: 140, height: 210 },
    margins,
    font: 'sans-serif',
    coordinateResolvers: {
      timeToX: (time) => 10 + ((time - 1000) / 2000) * 120,
      valueToY: (value) => 210 - value * 10,
    },
    getTextWidth(ctx, text, font) {
      ctx.font = font;
      return ctx.measureText(text).width;
    },
  }).render(partitionTealScriptDrawings(drawings), bars, viewport, pane);
  paintNativeTealScriptDrawings({ ctx: nativeCtx, drawings, bars, viewport, panes: [pane], width: 140, margins });
  expect(nativeEvents).toEqual(webEvents);
  expect(vi.mocked(canvas.drawText).mock.calls.length).toBe(
    nativeEvents.filter((event) => event[0] === 'fillText' || event[0] === 'strokeText').length,
  );
  return { events: nativeEvents, canvas };
}

describe('native/web drawing parity', () => {
  it.each([0, 1, 151])('box border width %s controls the actual stroke while preserving fill', (borderWidth) => {
    const { events } = compare([{ ...box, borderWidth, text: '' }]);
    const strokes = events.filter(event => event[0] === 'strokeRect');
    expect(strokes).toHaveLength(borderWidth === 0 ? 0 : 1);
    if (borderWidth > 0) expect(strokes[0]!.at(-3)).toBe(borderWidth);
    expect(events.filter(event => event[0] === 'fillRect')).toHaveLength(1);
  });

  it.each([0, 1, 151])('line/polyline width %s reaches both painter adapters without a ceiling', (width) => {
    const { events } = compare([{ ...line, width, extend: 'none' }, { ...polyline, lineWidth: width, fillColor: null }]);
    const strokes = events.filter(event => event[0] === 'stroke');
    expect(strokes).toHaveLength(2);
    expect(strokes.map(event => event.at(-3))).toEqual([Math.max(1, width), Math.max(1, width)]);
  });

  // Official Text and shapes style illustrations put a lower-corner tip below
  // its body and an upper-corner tip above it. Adapter agreement alone cannot
  // establish this direction, so check the documented topology separately.
  it.each(['label_lower_left', 'label_lower_right', 'label_upper_left', 'label_upper_right', 'label_up', 'label_down'])(
    'paints documented corner body and pointer orientation for %s',
    (style) => {
      const { events } = compare([{ ...label, style }]);
      const bodies = events.filter((event) => event[0] === 'roundRect');
      expect(bodies).toHaveLength(1);
      const [, bodyX, bodyY, bodyWidth, bodyHeight] = bodies[0] as [string, number, number, number, number];
      const anchorX = 70;
      const anchorY = 110;
      const lower = style.includes('lower') || style === 'label_down';
      if (lower) expect(bodyY + bodyHeight).toBeLessThan(anchorY);
      else expect(bodyY).toBeGreaterThan(anchorY);
      if (style.endsWith('left')) expect(bodyX).toBe(anchorX);
      else if (style.endsWith('right')) expect(bodyX + bodyWidth).toBe(anchorX);
      else expect(bodyX + bodyWidth / 2).toBe(anchorX);

      const baseY = lower ? bodyY + bodyHeight : bodyY;
      const pointerStart = events.find((event) => event[0] === 'moveTo')!;
      const pointerLines = events.filter((event) => event[0] === 'lineTo');
      expect(pointerStart[2]).toBe(baseY);
      expect(pointerLines[0]![2]).toBe(baseY);
      expect(pointerLines[1]!.slice(1, 3)).toEqual([anchorX, anchorY]);
      const text = events.find((event) => event[0] === 'fillText')!;
      expect(text[3]).toBeGreaterThan(bodyY);
      expect(text[3]).toBeLessThan(bodyY + bodyHeight);
    },
  );

  it.each([
    'circle',
    'square',
    'diamond',
    'cross',
    'xcross',
    'triangleup',
    'triangledown',
    'flag',
    'label_up',
    'label_down',
    'label_left',
    'label_right',
    'label_lower_left',
    'label_lower_right',
    'label_upper_left',
    'label_upper_right',
    'label_center',
    'none',
  ] as const)('label: %s preserves the shared glyph and body placement', (style) => {
    const { events } = compare([{ ...label, style }]);
    if (style !== 'label_left' && style !== 'label_right') return;

    // The documented horizontal tip points outward from the nearest body edge,
    // with the reference point outside the body. Exact pixel sizes are unpinned.
    const body = events.find((event) => event[0] === 'roundRect')!;
    const bodyX = body[1] as number;
    const bodyWidth = body[3] as number;
    const nearestEdge = style === 'label_left' ? bodyX : bodyX + bodyWidth;
    if (style === 'label_left') expect(bodyX).toBeGreaterThan(70);
    else expect(bodyX + bodyWidth).toBeLessThan(70);
    const pointer = events.filter((event) => event[0] === 'moveTo' || event[0] === 'lineTo');
    expect(pointer.map((event) => event[1])).toEqual([nearestEdge, nearestEdge, 70]);
    expect(pointer[2]?.slice(1, 3)).toEqual([70, 110]);
  });
  it('line: preserves projected extensions and dashed strokes', () => {
    compare([line]);
  });
  it('linefill: uses parent geometry and paints before strokes', () => {
    const { events } = compare([
      line,
      { ...line, id: 'l2', y1: 5, y2: 12 },
      { id: 'fill', type: 'linefill', barIndex: 0, line1: 'l', line2: 'l2', color: '#ff000080' },
    ]);
    expect(events.findIndex((event) => event[0] === 'fill')).toBeLessThan(
      events.findIndex((event) => event[0] === 'stroke'),
    );
  });
  it('box: uses the corrected text font and multiline layout', () => {
    const { events } = compare([box]);
    expect(events.find((event) => event[0] === 'fillText')?.[4]).toBe('14px sans-serif');
  });
  it('table: zero dimensions auto-size instead of collapsing', () => {
    const { events } = compare([table]);
    expect(events.find((event) => event[0] === 'fillRect')?.slice(1, 5)).toEqual([74, 18, 48, 22]);
  });
  it('polyline: closed cubics interpolate every supplied point', () => {
    const { events } = compare([polyline]);
    expect(events.filter((event) => event[0] === 'bezierCurveTo').map((event) => event.slice(5, 7))).toEqual([
      [70, 60],
      [130, 90],
      [10, 110],
    ]);
    expect(events.some((event) => event[0] === 'quadraticCurveTo')).toBe(false);
  });
  it.each(['arrowup', 'arrowdown'] as const)('label: %s has a seven-vertex head and shaft', (style) => {
    const { events } = compare([{ ...label, style }]);
    expect(events.filter((event) => event[0] === 'lineTo')).toHaveLength(6);
  });
  it('label: outlined text stays anchored without a label body', () => {
    const { events } = compare([{ ...label, style: 'text_outline' }]);
    expect(events.some((event) => event[0] === 'roundRect' || event[0] === 'fill')).toBe(false);
    expect(events.filter((event) => event[0] === 'fillText')).toHaveLength(1);
    expect(events.filter((event) => event[0] === 'strokeText')).toHaveLength(1);
  });
  it.each([
    ['tiny', 7, 8],
    ['small', 10, 10],
    ['normal', 12, 14],
    ['large', 18, 20],
    ['huge', 24, 36],
    ['17', 17, 17],
  ] as const)('prepares and paints family-specific %s fonts', (size, labelPx, textPx) => {
    const before = vi.mocked(matchFont).mock.calls.length;
    compare([
      { ...label, size },
      { ...box, textSize: size },
      { ...table, cells: [{ ...cell, textSize: size }] },
    ]);
    expect(
      vi
        .mocked(matchFont)
        .mock.calls.slice(before)
        .map(([font]) => font.fontSize),
    ).toEqual(labelPx === textPx ? [labelPx] : [labelPx, textPx]);
  });
});
