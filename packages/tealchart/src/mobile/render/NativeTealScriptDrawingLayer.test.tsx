import type { SkCanvas } from '@shopify/react-native-skia';
import type { DrawingOutput, LineDrawingOutput } from '@tealstreet/tealscript';

import { createPicture, matchFont, Skia } from '@shopify/react-native-skia';
import { describe, expect, it, vi } from 'vitest';

import { createNativeChartFrameFromPanes } from './nativeChartFrame';
import { createNativeDrawingContext } from './nativeDrawingContext';
import { createNativeDrawingFonts } from './nativeDrawingFonts';
import { createNativeChartProjection } from './nativeProjection';
import { NativeTealScriptDrawingLayer } from './NativeTealScriptDrawingLayer';
import { paintNativeTealScriptDrawings } from './nativeTealScriptDrawings';

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, useMemo: <T,>(factory: () => T) => factory() };
});

const bars = [
  { time: 1000, open: 10, high: 15, low: 8, close: 12, volume: 100 },
  { time: 2000, open: 12, high: 18, low: 11, close: 17, volume: 110 },
  { time: 3000, open: 17, high: 20, low: 16, close: 19, volume: 120 },
];
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
const viewport = { startTime: 1000, endTime: 3000, priceMin: 0, priceMax: 20 };
const line: LineDrawingOutput = {
  id: 'l',
  type: 'line',
  barIndex: 0,
  x1: 0,
  y1: 10,
  x2: 2,
  y2: 20,
  xloc: 'bar_index',
  extend: 'none',
  color: '#12345680',
  width: 3,
  style: 'solid',
};

function paint(drawings: DrawingOutput[], activeViewport = viewport, activePane = pane) {
  const calls: { kind: string; args: unknown[] }[] = [];
  const canvas = Object.fromEntries(
    ['save', 'restore', 'scale', 'translate', 'clipPath', 'drawPath', 'drawRect', 'drawText'].map((kind) => [
      kind,
      vi.fn((...args: unknown[]) => calls.push({ kind, args })),
    ]),
  ) as unknown as SkCanvas;
  const ctx = createNativeDrawingContext(canvas, createNativeDrawingFonts(drawings));
  paintNativeTealScriptDrawings({
    ctx,
    drawings,
    bars,
    viewport: activeViewport,
    panes: [
      {
        ...activePane,
        ...(activePane.type === 'main' ? { yMin: activeViewport.priceMin, yMax: activeViewport.priceMax } : {}),
      },
    ],
    width: 140,
    margins: { left: 10, right: 10, top: 10, bottom: 0 },
  });
  return { calls, ctx };
}

describe('native TealScript lines', () => {
  it('projects both endpoints and clips to the pane, preserving alpha and width', () => {
    const { calls } = paint([line]);
    const path = calls.find((call) => call.kind === 'drawPath')!.args[0] as {
      moveTo: ReturnType<typeof vi.fn>;
      lineTo: ReturnType<typeof vi.fn>;
    };
    expect(path.moveTo).toHaveBeenCalledWith(10, 110);
    expect(path.lineTo).toHaveBeenCalledWith(130, 10);
    expect(calls.filter((call) => call.kind === 'clipPath')).toHaveLength(1);
    expect(
      vi
        .mocked(Skia.Paint)
        .mock.results.some(({ value }) =>
          vi.mocked(value.setStrokeWidth).mock.calls.some((args: number[]) => args[0] === 3),
        ),
    ).toBe(true);
    expect(
      vi
        .mocked(Skia.Paint)
        .mock.results.some(({ value }) =>
          vi.mocked(value.setColor).mock.calls.some((args: unknown[]) => args[0] === '#12345680'),
        ),
    ).toBe(true);
  });
  it.each(['dashed', 'dotted', 'arrow_left', 'arrow_right', 'arrow_both'] as const)(
    'paints %s strokes and arrowheads',
    (style) => {
      const { calls } = paint([{ ...line, style, extend: 'both' }]);
      expect(calls.filter((call) => call.kind === 'drawPath')).toHaveLength(
        style === 'arrow_both' ? 3 : style.startsWith('arrow_') ? 2 : 1,
      );
      if (style === 'dashed' || style === 'dotted')
        expect(Skia.PathEffect.MakeDash).toHaveBeenCalledWith(style === 'dashed' ? [6, 4] : [2, 4], 0);
    },
  );
  it('reprojects after pan/zoom without scaling the stroke', () => {
    const { calls } = paint([line], { ...viewport, startTime: 0, endTime: 4000, priceMax: 40 });
    const path = calls.find((call) => call.kind === 'drawPath')!.args[0] as { moveTo: ReturnType<typeof vi.fn> };
    expect(path.moveTo).toHaveBeenCalledWith(40, 160);
  });
  it('skips invalid coordinates and deleted drawings', () => {
    expect(
      paint([
        { ...line, y1: null },
        { ...line, color: null },
      ]).calls.some((call) => call.kind === 'drawPath'),
    ).toBe(false);
    expect(paint([]).calls.some((call) => call.kind === 'drawPath')).toBe(false);
  });
});

const label = {
  id: 'label',
  type: 'label' as const,
  barIndex: 1,
  x: 1,
  y: 17,
  text: 'Hello\nworld',
  xloc: 'bar_index' as const,
  yloc: 'price' as const,
  style: 'label_left' as const,
  color: '#12345680',
  textColor: '#ffffff',
  size: 'normal' as const,
};
describe('native TealScript labels', () => {
  it('paints multiline text and the pointer body', () => {
    const { calls } = paint([label]);
    expect(calls.filter((call) => call.kind === 'drawText').map((call) => call.args[0])).toEqual(['Hello', 'world']);
    expect(calls.filter((call) => call.kind === 'drawPath')).toHaveLength(2);
  });
  it.each([
    'none',
    'text_outline',
    'circle',
    'square',
    'diamond',
    'cross',
    'xcross',
    'triangleup',
    'triangledown',
    'flag',
    'arrowup',
    'arrowdown',
    'label_up',
    'label_down',
    'label_left',
    'label_right',
    'label_center',
    'label_upper_left',
    'label_upper_right',
    'label_lower_left',
    'label_lower_right',
  ] as const)('supports %s body geometry', (style) => {
    const { calls } = paint([{ ...label, style }]);
    expect(calls.filter((call) => call.kind === 'drawText')).toHaveLength(style === 'text_outline' ? 4 : 2);
    expect(calls.some((call) => call.kind === 'drawPath')).toBe(style !== 'none' && style !== 'text_outline');
  });
  it('uses bar high/low anchors and does not paint out-of-window labels', () => {
    const above = paint([{ ...label, style: 'none', text: 'above', yloc: 'abovebar', y: null }]);
    const below = paint([{ ...label, style: 'none', text: 'below', yloc: 'belowbar', y: null }]);
    expect(above.calls.find((call) => call.kind === 'drawText')!.args.slice(1, 3)).toEqual([52.5, 27]);
    expect(below.calls.find((call) => call.kind === 'drawText')!.args.slice(1, 3)).toEqual([52.5, 109]);
    expect(paint([{ ...label, x: 9 }]).calls.some((call) => call.kind === 'drawText')).toBe(false);
  });
});

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
  text: 'one two three four five',
  textColor: '#ffffff',
  textSize: 'normal' as const,
};
describe('native TealScript boxes', () => {
  it('paints projected fill, border and wrapped text with shared padding', () => {
    const { calls } = paint([{ ...box, textWrap: 'auto' }]);
    expect(calls.filter((call) => call.kind === 'drawRect')).toHaveLength(2);
    expect(calls.find((call) => call.kind === 'drawRect')!.args[0]).toEqual({ x: 10, y: 30, width: 120, height: 100 });
    expect(calls.filter((call) => call.kind === 'drawText').map((call) => call.args.slice(0, 3))).toEqual([
      ['one two three', 24.5, 71],
      ['four five', 38.5, 89],
    ]);
  });
  it.each(['solid', 'dashed', 'dotted'] as const)('paints %s borders', (borderStyle) => {
    expect(paint([{ ...box, borderStyle, text: '' }]).calls.filter((call) => call.kind === 'drawRect')).toHaveLength(2);
    if (borderStyle !== 'solid')
      expect(Skia.PathEffect.MakeDash).toHaveBeenCalledWith(borderStyle === 'dashed' ? [6, 4] : [2, 4], 0);
  });
  it.each(['left', 'center', 'right'] as const)('keeps %s multiline text inside a box', (textHalign) => {
    const calls = paint([{ ...box, text: 'A\nBB', textHalign, textValign: 'bottom' }]).calls.filter(
      (call) => call.kind === 'drawText',
    );
    expect(calls).toHaveLength(2);
    expect(calls.map((call) => call.args[1])).toEqual(
      textHalign === 'left' ? [16, 16] : textHalign === 'right' ? [117, 110] : [66.5, 63],
    );
  });
  it('handles mutator snapshots, null colors and invalid geometry', () => {
    expect(
      paint([{ ...box, bgcolor: null, borderColor: null, textColor: null }]).calls.some((call) =>
        call.kind.startsWith('draw'),
      ),
    ).toBe(false);
    expect(paint([{ ...box, left: null }]).calls.some((call) => call.kind.startsWith('draw'))).toBe(false);
    const updated = paint([{ ...box, left: 1, text: 'updated' }]).calls;
    expect(updated.find((call) => call.kind === 'drawRect')!.args[0]).toEqual({ x: 70, y: 30, width: 60, height: 100 });
    expect(updated.filter((call) => call.kind === 'drawText').map((call) => call.args[0])).toEqual(['updated']);
  });
});

const cell = {
  column: 0,
  row: 0,
  text: 'ATR',
  textColor: '#ffffff',
  textSize: 'normal' as const,
  textHalign: 'center' as const,
  textValign: 'middle' as const,
  bgcolor: '#111827',
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
describe('native TealScript tables', () => {
  it.each([
    'top_left',
    'top_center',
    'top_right',
    'middle_left',
    'middle_center',
    'middle_right',
    'bottom_left',
    'bottom_center',
    'bottom_right',
  ] as const)('anchors %s in pane pixels', (position) => {
    const { calls } = paint([{ ...table, position }]);
    const x = position.endsWith('left') ? 18 : position.endsWith('right') ? 74 : 46;
    const y = position.startsWith('top') ? 18 : position.startsWith('bottom') ? 180 : 99;
    expect(calls.find((call) => call.kind === 'drawRect')!.args[0]).toEqual({ x, y, width: 48, height: 22 });
    expect(calls.filter((call) => call.kind === 'drawText').map((call) => call.args[0])).toEqual(['ATR']);
    expect(calls.filter((call) => call.kind === 'drawRect')).toHaveLength(4);
  });
  it('honors explicit percent dimensions for unmerged cells', () => {
    const { calls } = paint([
      {
        ...table,
        columns: 2,
        cells: [
          { ...cell, text: 'A\nB', width: 25, height: 30 },
          { ...cell, column: 1, text: 'other', width: 25, height: 30 },
        ],
      },
    ]);
    expect(calls.find((call) => call.kind === 'drawRect')!.args[0]).toEqual({ x: 62, y: 18, width: 60, height: 60 });
    expect(calls.filter((call) => call.kind === 'drawText').map((call) => call.args[0])).toEqual(['A', 'B', 'other']);
  });
  it('ignores cell dimensions inside a merged span', () => {
    const { calls } = paint([
      {
        ...table,
        columns: 3,
        rows: 2,
        cells: [
          { ...cell, text: 'A\nB', width: 95, height: 95 },
          { ...cell, column: 1, text: 'hidden', width: 95, height: 95 },
          // Merged dimensions come from unmerged neighboring cells.
          // Authority: https://www.tradingview.com/pine-script-docs/visuals/tables/#merging-cells
          { ...cell, row: 1, text: '', width: 25 },
          { ...cell, column: 1, row: 1, text: '', width: 25 },
          { ...cell, column: 2, text: '', height: 30 },
        ],
        mergedCells: [{ startColumn: 0, startRow: 0, endColumn: 1, endRow: 0 }],
      },
    ]);
    expect(calls.find((call) => call.kind === 'drawRect')!.args[0]).toEqual({ x: 14, y: 18, width: 108, height: 82 });
    expect(calls.filter((call) => call.kind === 'drawRect').map((call) => call.args[0])).toContainEqual({
      x: 14, y: 18, width: 60, height: 60,
    });
    expect(calls.filter((call) => call.kind === 'drawText').map((call) => call.args[0])).toEqual(['A', 'B']);
  });
  it('clears cells and deleted tables without keeping stale native primitives', () => {
    expect(paint([{ ...table, cells: [] }]).calls.some((call) => call.kind.startsWith('draw'))).toBe(false);
    expect(paint([]).calls.some((call) => call.kind.startsWith('draw'))).toBe(false);
  });
});

const polyline = {
  id: 'poly',
  type: 'polyline' as const,
  barIndex: 0,
  points: [
    { type: 'chart.point' as const, time: null, index: 0, price: 10 },
    { type: 'chart.point' as const, time: null, index: 1, price: 15 },
    { type: 'chart.point' as const, time: null, index: 2, price: 12 },
  ],
  curved: false,
  closed: false,
  xloc: 'bar_index' as const,
  lineColor: '#2962ff80',
  fillColor: '#ff000040',
  lineStyle: 'solid' as const,
  lineWidth: 2,
};
describe('native TealScript polylines', () => {
  it('paints curved closed geometry with fill before stroke', () => {
    const { calls } = paint([{ ...polyline, curved: true, closed: true }]);
    const paths = calls.filter((call) => call.kind === 'drawPath');
    expect(paths).toHaveLength(2);
    const path = paths[0]!.args[0] as { cubicTo: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };
    expect(path.cubicTo.mock.calls.map((call) => call.slice(4))).toEqual([
      [70, 60],
      [130, 90],
      [10, 110],
    ]);
    expect(path.close).toHaveBeenCalledOnce();
    expect(paths[0]!.args[1]).not.toBe(paths[1]!.args[1]);
  });
  it.each(['solid', 'dashed', 'dotted', 'arrow_left', 'arrow_right', 'arrow_both'] as const)(
    'supports %s line styles',
    (lineStyle) => {
      const { calls } = paint([{ ...polyline, lineStyle }]);
      expect(calls.filter((call) => call.kind === 'drawPath')).toHaveLength(
        lineStyle === 'arrow_both' ? 3 : lineStyle.startsWith('arrow_') ? 2 : 1,
      );
      if (lineStyle === 'dashed' || lineStyle === 'dotted')
        expect(Skia.PathEffect.MakeDash).toHaveBeenCalledWith(lineStyle === 'dashed' ? [6, 4] : [2, 4], 0);
    },
  );
  it('resolves chart.point time coordinates and drops invalid points', () => {
    const points = polyline.points.map((point) => ({ ...point, time: 1000 + point.index * 1000, index: null }));
    const { calls } = paint([{ ...polyline, xloc: 'bar_time', points }]);
    const path = calls.find((call) => call.kind === 'drawPath')!.args[0] as {
      moveTo: ReturnType<typeof vi.fn>;
      lineTo: ReturnType<typeof vi.fn>;
    };
    expect(path.moveTo).toHaveBeenCalledWith(10, 110);
    expect(path.lineTo).toHaveBeenCalledWith(130, 90);
    expect(
      paint([{ ...polyline, points: [{ ...polyline.points[0]!, price: null }] }]).calls.some(
        (call) => call.kind === 'drawPath',
      ),
    ).toBe(false);
  });
});

const linefill = { id: 'lf', type: 'linefill' as const, barIndex: 0, line1: 'l', line2: 'l2', color: '#00ff0040' };
describe('native TealScript linefills', () => {
  it('paints the referenced extended-line polygon before strokes', () => {
    const { calls } = paint([
      linefill,
      { ...line, extend: 'both' },
      { ...line, id: 'l2', y1: 5, y2: 15, extend: 'both' },
    ]);
    const paths = calls.filter((call) => call.kind === 'drawPath');
    expect(paths).toHaveLength(3);
    const polygon = paths[0]!.args[0] as {
      moveTo: ReturnType<typeof vi.fn>;
      lineTo: ReturnType<typeof vi.fn>;
      close: ReturnType<typeof vi.fn>;
    };
    expect(polygon.moveTo).toHaveBeenCalledWith(10, 110);
    expect(polygon.lineTo.mock.calls).toEqual([
      [130, 10],
      [130, 60],
      [10, 160],
    ]);
    expect(polygon.close).toHaveBeenCalledOnce();
  });
  it('does not retain fills after referenced lines disappear or become invalid', () => {
    expect(paint([linefill, line]).calls.filter((call) => call.kind === 'drawPath')).toHaveLength(1);
    expect(paint([linefill]).calls.some((call) => call.kind === 'drawPath')).toBe(false);
    expect(
      paint([linefill, line, { ...line, id: 'l2', y1: null }]).calls.filter((call) => call.kind === 'drawPath'),
    ).toHaveLength(1);
    expect(
      paint([{ ...linefill, color: null }, line, { ...line, id: 'l2' }]).calls.filter(
        (call) => call.kind === 'drawPath',
      ),
    ).toHaveLength(2);
  });
});

describe('native drawing canvas integration', () => {
  function harness(drawings: DrawingOutput[], staticViewport?: typeof viewport) {
    const frame = createNativeChartFrameFromPanes({
      dimensions: { width: 140, height: 430, margins: { left: 10, right: 10, top: 10, bottom: 10 } },
      panes: [pane, { id: 'study', type: 'indicator', top: 220, height: 200, yMin: 0, yMax: 20 }],
    });
    const sharedViewport = {
      startTime: { value: 1000 },
      endTime: { value: 3000 },
      priceMin: { value: 0 },
      priceMax: { value: 20 },
    };
    const paneRangeOverrides = { value: {} as Record<string, { yMin: number; yMax: number }> };
    const paths: Array<{ moveTo: ReturnType<typeof vi.fn>; lineTo: ReturnType<typeof vi.fn> }> = [];
    vi.mocked(createPicture).mockImplementation((callback) => {
      callback({
        save: vi.fn(),
        restore: vi.fn(),
        clipPath: vi.fn(),
        drawPath: (path: unknown) => paths.push(path as (typeof paths)[number]),
        drawRect: vi.fn(),
        drawText: vi.fn(),
      } as unknown as SkCanvas);
      return {} as ReturnType<typeof createPicture>;
    });
    const element = NativeTealScriptDrawingLayer({
      drawings,
      bars,
      frame,
      sharedViewport,
      paneRangeOverrides,
      indicatorPaneInfo: { ind: { overlay: false, paneId: 'study' } },
      staticProjection: staticViewport ? createNativeChartProjection({ frame, viewport: staticViewport }) : undefined,
    });
    const repaint = () => {
      paths.length = 0;
      void element.props.picture.value;
      return paths;
    };
    return { sharedViewport, paneRangeOverrides, repaint };
  }
  it('routes study objects to their pane and force_overlay to the main price scale', () => {
    const { repaint } = harness([
      { ...line, scriptId: 'ind' },
      { ...line, id: 'overlay', scriptId: 'ind', forceOverlay: true },
    ]);
    const paths = repaint();
    expect(paths).toHaveLength(2);
    expect(paths[0]!.moveTo).toHaveBeenCalledWith(10, 110);
    expect(paths[1]!.moveTo).toHaveBeenCalledWith(10, 320);
  });
  it('repaints from live pan, main scale and pane range overrides', () => {
    const { repaint, sharedViewport, paneRangeOverrides } = harness([{ ...line, scriptId: 'ind' }, line]);
    sharedViewport.startTime.value = 0;
    sharedViewport.endTime.value = 4000;
    sharedViewport.priceMax.value = 40;
    paneRangeOverrides.value = { study: { yMin: 0, yMax: 40 } };
    const paths = repaint();
    expect(paths[0]!.moveTo).toHaveBeenCalledWith(40, 160);
    expect(paths[1]!.moveTo).toHaveBeenCalledWith(40, 370);
  });
  it('honors a held static projection during a render transition', () => {
    const { repaint, sharedViewport } = harness([line], viewport);
    sharedViewport.startTime.value = 0;
    sharedViewport.endTime.value = 4000;
    sharedViewport.priceMax.value = 40;
    expect(repaint()[0]!.moveTo).toHaveBeenCalledWith(10, 110);
  });
  it('prepares numeric sizes, monospace and bold italic without mutating fonts during paint', () => {
    const fonts = createNativeDrawingFonts([
      { ...label, size: '19', textFontFamily: 'monospace', textFormatting: 'bolditalic' },
    ]);
    expect(Object.keys(fonts)).toEqual(['italic bold 19px monospace']);
    expect(matchFont).toHaveBeenCalledWith(
      expect.objectContaining({ fontSize: 19, fontWeight: 'bold', fontStyle: 'italic' }),
    );
  });
});
