import type {
  BoxDrawingOutput,
  LabelDrawingOutput,
  LineDrawingOutput,
  LineFillDrawingOutput,
  PolylineDrawingOutput,
  TableDrawingOutput,
} from '@tealstreet/tealscript';
import type { Bar, ChartMargins, ComputedPane, RenderOptions } from '../types';
import type { CanvasContext } from './CanvasContext';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearChartStoreCache } from '../state/chartState';
import { DEFAULT_MARGINS, DEFAULT_RENDER_OPTIONS } from '../types';
import { partitionTealScriptDrawings } from './TealScriptDrawingPartition';
import { TealScriptDrawingRenderer } from './TealScriptDrawingRenderer';

afterEach(() => {
  clearChartStoreCache();
});

function createRecordingContext(events: string[]): CanvasContext {
  const context: CanvasContext = {
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
    beginPath: () => events.push('beginPath'),
    moveTo: (x, y) => events.push(`moveTo:${x},${y}`),
    lineTo: (x, y) => events.push(`lineTo:${x},${y}`),
    quadraticCurveTo: (cpx, cpy, x, y) => events.push(`quadraticCurveTo:${cpx},${cpy},${x},${y}`),
    bezierCurveTo: (cp1x, cp1y, cp2x, cp2y, x, y) =>
      events.push(`bezierCurveTo:${cp1x},${cp1y},${cp2x},${cp2y},${x},${y}`),
    arc: () => events.push('arc'),
    rect: (x, y, width, height) => events.push(`rect:${x},${y},${width},${height}`),
    roundRect: (x, y, width, height) => events.push(`roundRect:${x},${y},${width},${height}`),
    closePath: () => events.push('closePath'),
    fill: () => events.push('fill'),
    stroke: () => events.push('stroke'),
    fillRect: (x, y, width, height) => events.push(`fillRect:${x},${y},${width},${height}`),
    strokeRect: (x, y, width, height) => events.push(`strokeRect:${x},${y},${width},${height}`),
    fillText: (text, x, y) => {
      events.push(`font:${context.font}`);
      events.push(`fillTextStyle:${context.textAlign},${context.textBaseline}`);
      events.push(`fillText:${text}:${x},${y}`);
    },
    save: () => events.push('save'),
    restore: () => events.push('restore'),
    clip: () => events.push('clip'),
    scale: () => events.push('scale'),
    translate: () => events.push('translate'),
    setLineDash: (segments) => events.push(`setLineDash:${segments.join(',')}`),
    getLineDash: () => [],
    measureText: (text) => ({ width: text.length * 8 }) as TextMetrics,
  };
  return context;
}

interface DrawingRendererHarnessOptions {
  options?: Partial<RenderOptions>;
  margins?: Partial<ChartMargins>;
  getTextWidth?: (ctx: CanvasContext, text: string, font: string) => number;
}

function createDrawingRenderer(
  events: string[],
  harnessOptions: DrawingRendererHarnessOptions = {},
): {
  ctx: CanvasContext;
  getTextWidth: (ctx: CanvasContext, text: string, font: string) => number;
  renderer: TealScriptDrawingRenderer;
} {
  const ctx = createRecordingContext(events);
  const getTextWidth = harnessOptions.getTextWidth ?? ((activeCtx, text) => activeCtx.measureText(text).width);
  const renderer = new TealScriptDrawingRenderer({
    ctx,
    options: { ...DEFAULT_RENDER_OPTIONS, width: 120, height: 240, ...harnessOptions.options },
    margins: { ...DEFAULT_MARGINS, left: 0, right: 0, ...harnessOptions.margins },
    font: 'sans-serif',
    coordinateResolvers: {
      timeToX: (time, viewport, chartWidth) =>
        ((time - viewport.startTime) / (viewport.endTime - viewport.startTime)) * chartWidth,
      valueToY: (value, activePane) =>
        activePane.top + ((activePane.yMax - value) / (activePane.yMax - activePane.yMin)) * activePane.height,
    },
    getTextWidth,
  });

  return { ctx, getTextWidth, renderer };
}

const bars: Bar[] = [
  { time: 1_000, open: 10, high: 15, low: 8, close: 12, volume: 100 },
  { time: 2_000, open: 12, high: 18, low: 11, close: 17, volume: 110 },
  { time: 3_000, open: 17, high: 20, low: 16, close: 19, volume: 120 },
];

const pane: ComputedPane = {
  id: 'main',
  type: 'main',
  heightRatio: 1,
  yMin: 0,
  yMax: 20,
  fixedRange: false,
  top: 10,
  height: 200,
  bottom: 210,
};

function makeLine(id: string, overrides: Partial<LineDrawingOutput> = {}): LineDrawingOutput {
  return {
    id,
    type: 'line',
    barIndex: 0,
    x1: 0,
    y1: 10,
    x2: 2,
    y2: 20,
    xloc: 'bar_index',
    extend: 'none',
    color: '#2962FF',
    style: 'solid',
    width: 1,
    ...overrides,
  };
}

function makeBox(overrides: Partial<BoxDrawingOutput> = {}): BoxDrawingOutput {
  return {
    id: 'box-1',
    type: 'box',
    barIndex: 0,
    left: 0,
    top: 18,
    right: 2,
    bottom: 8,
    xloc: 'bar_index',
    extend: 'none',
    borderColor: '#2962FF',
    borderWidth: 1,
    borderStyle: 'solid',
    bgcolor: null,
    text: '',
    textColor: '#363A45',
    textSize: 'normal',
    ...overrides,
  };
}

function makeLabel(overrides: Partial<LabelDrawingOutput> = {}): LabelDrawingOutput {
  return {
    id: 'label-1',
    type: 'label',
    barIndex: 1,
    x: 1,
    y: 17,
    text: 'Label',
    xloc: 'bar_index',
    yloc: 'price',
    style: 'label_down',
    color: '#2196F3',
    textColor: '#FFFFFF',
    size: 'normal',
    ...overrides,
  };
}

function makeLinefill(overrides: Partial<LineFillDrawingOutput> = {}): LineFillDrawingOutput {
  return {
    id: 'linefill-1',
    type: 'linefill',
    barIndex: 0,
    line1: 'line-1',
    line2: 'line-2',
    color: 'rgba(41, 98, 255, 0.18)',
    ...overrides,
  };
}

function makePolyline(overrides: Partial<PolylineDrawingOutput> = {}): PolylineDrawingOutput {
  return {
    id: 'polyline-1',
    type: 'polyline',
    barIndex: 0,
    points: [
      { type: 'chart.point', time: null, index: 0, price: 10 },
      { type: 'chart.point', time: null, index: 1, price: 15 },
      { type: 'chart.point', time: null, index: 2, price: 12 },
    ],
    curved: false,
    closed: false,
    xloc: 'bar_index',
    lineColor: '#2962FF',
    fillColor: null,
    lineStyle: 'solid',
    lineWidth: 1,
    ...overrides,
  };
}

function makeTable(overrides: Partial<TableDrawingOutput> = {}): TableDrawingOutput {
  return {
    id: 'table-1',
    type: 'table',
    barIndex: 0,
    position: 'top_right',
    columns: 1,
    rows: 1,
    bgcolor: null,
    frameColor: '#111111',
    frameWidth: 1,
    borderColor: '#222222',
    borderWidth: 1,
    cells: [
      {
        column: 0,
        row: 0,
        text: 'ATR',
        textColor: '#ffffff',
        textSize: 'normal',
        textHalign: 'center',
        textValign: 'middle',
        textFontFamily: 'monospace',
        textFormatting: 'bolditalic',
        bgcolor: '#111827',
      },
    ],
    ...overrides,
  };
}

describe('TealScriptDrawingRenderer', () => {
  it('renders linefills, boxes, lines, then labels in pane-clipped order', () => {
    const events: string[] = [];
    const getTextWidth = vi.fn(
      (activeCtx: CanvasContext, text: string, font: string) => activeCtx.measureText(text).width,
    );
    const { ctx, renderer } = createDrawingRenderer(events, { getTextWidth });

    const drawings = partitionTealScriptDrawings([
      makeLine('line-1'),
      makeBox(),
      makeLinefill(),
      makeLabel({ size: 'large' }),
      makeLine('line-2', { y1: 8, y2: 18 }),
    ]);

    renderer.render(drawings, bars, { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 }, pane);

    const firstFillIndex = events.indexOf('fill');
    const boxIndex = events.findIndex((event) => event.startsWith('strokeRect:'));
    const firstStrokeAfterBox = events.findIndex((event, index) => index > boxIndex && event === 'stroke');
    const labelTextIndex = events.findIndex((event) => event.startsWith('fillText:Label:'));
    const clipCount = events.filter((event) => event === 'clip').length;

    expect(firstFillIndex).toBeGreaterThan(-1);
    expect(boxIndex).toBeGreaterThan(firstFillIndex);
    expect(firstStrokeAfterBox).toBeGreaterThan(boxIndex);
    expect(labelTextIndex).toBeGreaterThan(firstStrokeAfterBox);
    expect(clipCount).toBe(3);
    expect(getTextWidth).toHaveBeenCalledWith(ctx, 'Label', '18px sans-serif');
  });

  it('renders Pine line arrow styles with endpoint arrowheads', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);

    renderer.render(
      partitionTealScriptDrawings([makeLine('line-1', { style: 'arrow_both', width: 2 })]),
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );

    expect(events).toContain('moveTo:0,110');
    expect(events).toContain('lineTo:120,10');
    expect(events.filter((event) => event === 'fill')).toHaveLength(2);
    expect(events.filter((event) => event === 'closePath')).toHaveLength(2);
    expect(events.filter((event) => event === 'setLineDash:').length).toBeGreaterThanOrEqual(3);
  });

  it('renders box text using stored horizontal and vertical alignment', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);

    renderer.render(
      partitionTealScriptDrawings([
        makeBox({
          text: 'Box',
          textHalign: 'right',
          textValign: 'bottom',
        }),
      ]),
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );

    expect(events).toContain('fillTextStyle:right,bottom');
    expect(events).toContain('fillText:Box:114,124');
  });

  // Pine v6 reference: label sizes differ from box/table text sizes.
  it.each([
    ['tiny', 7, 8], ['small', 10, 10], ['normal', 12, 14],
    ['large', 18, 20], ['huge', 24, 36], ['23', 23, 23],
  ])('uses family-specific font pixels for %s', (size, labelPixels, textPixels) => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);
    renderer.render(partitionTealScriptDrawings([
      makeLabel({ size }), makeBox({ text: 'Box', textSize: size }),
      makeTable({ cells: [{ ...makeTable().cells[0]!, textSize: size, textFontFamily: 'default', textFormatting: 'none' }] }),
    ]), bars, { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 }, pane);
    expect(events.filter((event) => event.startsWith('font:'))).toEqual([
      `font:${textPixels}px sans-serif`, `font:${labelPixels}px sans-serif`, `font:${textPixels}px sans-serif`,
    ]);
  });

  it('renders numeric Pine box text sizes as canvas font pixels', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);

    renderer.render(
      partitionTealScriptDrawings([makeBox({ text: 'Box', textSize: '18' })]),
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );

    expect(events).toContain('font:18px sans-serif');
    expect(events).toContain('fillText:Box:60,80');
  });

  it('renders unconfigured box text with Pine centered defaults', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);

    renderer.render(
      partitionTealScriptDrawings([makeBox({ text: 'Box' })]),
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );

    expect(events).toContain('fillTextStyle:center,middle');
    expect(events).toContain('fillText:Box:60,80');
  });

  it('renders multiline non-wrapped box text using stored alignment', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);

    renderer.render(
      partitionTealScriptDrawings([
        makeBox({
          text: 'Box\r\nText',
          textHalign: 'right',
          textValign: 'bottom',
        }),
      ]),
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );

    expect(events).toContain('fillTextStyle:right,bottom');
    expect(events).toContain('fillText:Box:114,106');
    expect(events).toContain('fillText:Text:114,124');
  });

  it('wraps Pine box text with stored alignment and font metadata', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);

    renderer.render(
      partitionTealScriptDrawings([
        makeBox({
          right: 1,
          text: 'Alpha Beta Gamma',
          textHalign: 'center',
          textValign: 'middle',
          textWrap: 'auto',
          textFontFamily: 'monospace',
          textFormatting: 'bolditalic',
        }),
      ]),
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );

    expect(events).toContain('font:italic bold 14px monospace');
    expect(events).toContain('fillTextStyle:center,top');
    expect(events.some((event) => event.startsWith('fillText:Alpha:'))).toBe(true);
    expect(events.some((event) => event.startsWith('fillText:Beta:'))).toBe(true);
    expect(events.some((event) => event.startsWith('fillText:Gamma:'))).toBe(true);
  });

  it('renders polyline paths with optional fill when closed', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);

    renderer.render(
      partitionTealScriptDrawings([makePolyline({ closed: true, fillColor: 'rgba(41, 98, 255, 0.18)' })]),
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );

    expect(events).toContain('moveTo:0,110');
    expect(events).toContain('lineTo:60,60');
    expect(events).toContain('lineTo:120,90');
    expect(events).toContain('closePath');
    expect(events).toContain('fill');
    expect(events).toContain('stroke');
  });

  it('renders Pine polyline arrow styles with endpoint arrowheads', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);

    renderer.render(
      partitionTealScriptDrawings([makePolyline({ lineStyle: 'arrow_both', lineWidth: 2 })]),
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );

    expect(events).toContain('moveTo:0,110');
    expect(events).toContain('lineTo:60,60');
    expect(events).toContain('lineTo:120,90');
    expect(events.filter((event) => event === 'stroke')).toHaveLength(1);
    expect(events.filter((event) => event === 'fill')).toHaveLength(2);
    expect(events.filter((event) => event === 'closePath')).toHaveLength(2);
  });

  it('passes curved polyline segments through every supplied point', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);

    renderer.render(
      partitionTealScriptDrawings([
        makePolyline({ curved: true }),
        makePolyline({ id: 'polyline-2', curved: true, closed: true, fillColor: 'rgba(41, 98, 255, 0.18)' }),
      ]),
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );

    expect(events).toContain('moveTo:0,110');
    const ends = events.filter((event) => event.startsWith('bezierCurveTo:')).map((event) => event.split(',').slice(-2).join(','));
    expect(ends).toEqual(['60,60', '120,90', '60,60', '120,90', '0,110']);
    expect(events.some((event) => event.startsWith('quadraticCurveTo:'))).toBe(false);
    expect(events).not.toContain('lineTo:60,60');
    expect(events).toContain('closePath');
    expect(events).toContain('fill');
    expect(events).toContain('stroke');
  });

  it('does not draw line, box, or polyline strokes for explicit null colors', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);

    renderer.render(
      partitionTealScriptDrawings([
        makeLine('line-null', { color: null }),
        makeBox({ borderColor: null, bgcolor: null, text: 'Hidden', textColor: null }),
        makePolyline({ lineColor: null, fillColor: null }),
      ]),
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );

    expect(events).not.toContain('stroke');
    expect(events).not.toContain('strokeRect:0,30,120,100');
    expect(events.some((event) => event.startsWith('fillText:Hidden:'))).toBe(false);
  });

  it('does not draw linefill areas for explicit null colors', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);

    renderer.render(
      partitionTealScriptDrawings([
        makeLine('line-1'),
        makeLine('line-2', { y1: 8, y2: 18 }),
        makeLinefill({ color: null }),
      ]),
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );

    expect(events).not.toContain('fill');
    expect(events.filter((event) => event === 'stroke')).toHaveLength(2);
  });

  it('does not draw label body or text for explicit null label colors', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);

    renderer.render(
      partitionTealScriptDrawings([makeLabel({ color: null, text: 'Hidden', textColor: null })]),
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );

    expect(events).not.toContain('fill');
    expect(events.some((event) => event.startsWith('fillText:Hidden:'))).toBe(false);
  });

  it('renders Pine label pointer styles instead of plain rounded pills', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);

    renderer.render(
      partitionTealScriptDrawings([
        makeLabel({ style: 'label_up', text: 'Up' }),
        makeLabel({ id: 'label-2', style: 'label_right', text: 'Right' }),
        makeLabel({ id: 'label-3', style: 'label_upper_left', text: 'Upper' }),
        makeLabel({ id: 'label-4', style: 'label_center', text: 'Center' }),
      ]),
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );

    expect(events.filter((event) => event.startsWith('roundRect:'))).toHaveLength(4);
    expect(events.filter((event) => event === 'closePath')).toHaveLength(3);
    expect(events.filter((event) => event.startsWith('moveTo:'))).toHaveLength(3);
    expect(events.some((event) => event.startsWith('fillText:Up:'))).toBe(true);
    expect(events.some((event) => event.startsWith('fillText:Right:'))).toBe(true);
    expect(events.some((event) => event.startsWith('fillText:Upper:'))).toBe(true);
    expect(events.some((event) => event.startsWith('fillText:Center:'))).toBe(true);
  });

  it('renders label text using stored text alignment', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);

    renderer.render(
      partitionTealScriptDrawings([
        makeLabel({
          style: 'label_left',
          text: 'Align',
          textAlign: 'right',
          textFontFamily: 'monospace',
          textFormatting: 'bolditalic',
        }),
        makeLabel({ id: 'label-2', style: 'none', text: 'Bare', textAlign: 'left' }),
      ]),
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );

    expect(events).toContain('fillTextStyle:right,middle');
    expect(events).toContain('font:italic bold 12px monospace');
    expect(events).toContain('fillText:Align:112,40');
    expect(events).toContain('fillTextStyle:left,middle');
    expect(events).toContain('fillText:Bare:60,40');
  });

  it('renders multiline label text with expanded body bounds', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);

    renderer.render(
      partitionTealScriptDrawings([
        makeLabel({ style: 'label_left', text: 'Entry\nStop' }),
        makeLabel({ id: 'label-2', style: 'none', text: 'Bare\r\nText', textAlign: 'left' }),
        makeLabel({ id: 'label-3', style: 'square', text: 'Icon\nText' }),
      ]),
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );

    expect(events).toContain('roundRect:64,21,56,38');
    expect(events).toContain('fillTextStyle:center,middle');
    expect(events).toContain('fillText:Entry:92,32.5');
    expect(events).toContain('fillText:Stop:92,47.5');
    expect(events.filter((event) => event === 'fillText:Bare:60,32.5')).toHaveLength(1);
    expect(events.filter((event) => event === 'fillText:Text:60,47.5')).toHaveLength(1);
    expect(events).toContain('rect:49,29,22,22');
    expect(events).toContain('fillText:Icon:79,32.5');
  });

  it('renders price labels at projected bar_index positions', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events, { options: { width: 300 } });

    renderer.render(
      partitionTealScriptDrawings([makeLabel({ style: 'label_left', x: 3, y: 12, text: 'Future' })]),
      bars,
      { startTime: 1_000, endTime: 5_000, priceMin: 0, priceMax: 20 },
      pane,
    );

    expect(events).toContain('roundRect:231,79,64,22');
    expect(events).toContain('fillText:Future:263,90');
  });

  it('renders bar_time abovebar labels at their timestamp candle anchor', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);

    renderer.render(
      partitionTealScriptDrawings([
        makeLabel({
          barIndex: 2,
          xloc: 'bar_time',
          x: 1_000,
          yloc: 'abovebar',
          style: 'label_left',
          text: 'Historical',
        }),
      ]),
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );

    expect(events).toContain('roundRect:6,43,96,22');
    expect(events).toContain('fillText:Historical:54,54');
  });

  it('renders Pine symbol label styles and keeps style_none text-only', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);

    renderer.render(
      partitionTealScriptDrawings([
        makeLabel({ style: 'circle', text: 'Circle' }),
        makeLabel({ id: 'label-2', style: 'diamond', text: 'Diamond' }),
        makeLabel({ id: 'label-3', style: 'xcross', text: 'Cross' }),
        makeLabel({ id: 'label-4', style: 'none', text: 'Text' }),
      ]),
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );

    expect(events).toContain('arc');
    expect(events).toContain('stroke');
    expect(events.filter((event) => event.startsWith('roundRect:'))).toHaveLength(0);
    expect(events.some((event) => event.startsWith('fillText:Circle:'))).toBe(true);
    expect(events.some((event) => event.startsWith('fillText:Diamond:'))).toBe(true);
    expect(events.some((event) => event.startsWith('fillText:Cross:'))).toBe(true);
    expect(events).toContain('fillText:Text:60,40');
  });

  it('uses the leading cell tooltip over a merged span', () => {
    const events: string[] = [];
    const { ctx, renderer } = createDrawingRenderer(events);
    renderer.render(partitionTealScriptDrawings([
      makeTable({ position: 'top_left', columns: 2, cells: [
        { ...makeTable().cells[0]!, tooltip: 'Leading cell' },
        { ...makeTable().cells[0]!, column: 1, tooltip: 'Hidden cell' },
      ], mergedCells: [{ startColumn: 0, startRow: 0, endColumn: 1, endRow: 0 }] }),
    ]), bars, { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 }, pane);
    events.length = 0;
    expect(renderer.renderTooltip(ctx, 90, 29)).toBe(true);
    expect(events.some((event) => event.startsWith('fillText:Leading cell:'))).toBe(true);
    expect(events.some((event) => event.startsWith('fillText:Hidden cell:'))).toBe(false);
  });

  it('includes symbol label text in the hover bounds and clips hits to the pane', () => {
    const events: string[] = [];
    const { ctx, renderer } = createDrawingRenderer(events);
    renderer.render(partitionTealScriptDrawings([
      makeLabel({ style: 'flag', text: 'Text', tooltip: 'Symbol details' }),
    ]), bars, { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 }, pane);
    events.length = 0;
    expect(renderer.renderTooltip(ctx, 100, 40)).toBe(true);
    expect(events.some((event) => event.startsWith('fillText:Symbol details:'))).toBe(true);
    expect(renderer.renderTooltip(ctx, 100, pane.bottom + 1)).toBe(false);
    expect(renderer.renderTooltip(ctx, 121, 40)).toBe(false);
  });

  it('uses painted label and table bounds for hover tooltips', () => {
    const events: string[] = [];
    const { ctx, renderer } = createDrawingRenderer(events);
    const draw = () => renderer.render(partitionTealScriptDrawings([
      makeLabel({ tooltip: 'Label details' }),
      makeTable({ cells: [{ ...makeTable().cells[0]!, tooltip: 'Cell details' }] }),
    ]), bars, { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 }, pane);
    draw();
    const labelBody = events.find((event) => event.startsWith('roundRect:'))!;
    const [x, y, width, height] = labelBody.slice('roundRect:'.length).split(',').map(Number);
    events.length = 0;
    expect(renderer.renderTooltip(ctx, x! + width! / 2, y! + height! / 2)).toBe(true);
    expect(events.some((event) => event.startsWith('fillText:Label details:'))).toBe(true);
    events.length = 0;
    expect(renderer.renderTooltip(ctx, 88, 29)).toBe(true);
    expect(events.some((event) => event.startsWith('fillText:Cell details:'))).toBe(true);
    events.length = 0;
    expect(renderer.renderTooltip(ctx, 2, 200)).toBe(false);
    expect(events).toEqual([]);
    renderer.render(partitionTealScriptDrawings([]), bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 }, pane);
    expect(renderer.renderTooltip(ctx, 88, 29)).toBe(false);
  });

  it('distinguishes arrow label geometry from triangular labels', () => {
    const paint = (style: string) => {
      const events: string[] = [];
      createDrawingRenderer(events).renderer.render(partitionTealScriptDrawings([
        makeLabel({ style, text: '' }),
      ]), bars, { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 }, pane);
      return events.filter((event) => event.startsWith('lineTo:'));
    };
    expect(paint('arrowup').length).toBeGreaterThan(paint('triangleup').length);
    expect(paint('arrowdown').length).toBeGreaterThan(paint('triangledown').length);
  });

  it('outlines label text in the label color without painting a label body', () => {
    const events: string[] = [];
    const { ctx, renderer } = createDrawingRenderer(events);
    ctx.strokeText = vi.fn();
    renderer.render(partitionTealScriptDrawings([
      makeLabel({ style: 'text_outline', text: 'Outlined', color: '#123456' }),
    ]), bars, { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 }, pane);
    expect(ctx.strokeText).toHaveBeenCalledWith('Outlined', expect.any(Number), expect.any(Number));
    expect(ctx.strokeStyle).toBe('#123456');
    expect(events.some((event) => event.startsWith('roundRect:'))).toBe(false);
    expect(events.some((event) => event.startsWith('fillText:Outlined:'))).toBe(true);
  });

  // Ledger visual-output-v1#609: table.new has no visible output until a cell exists.
  // An empty string is still a populated cell and must display its background/frame.
  it('draws a styled table only after population, including a cell with empty text', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);
    const table = makeTable({ bgcolor: '#2196F3', cells: [] });
    const viewport = { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 };

    renderer.render(partitionTealScriptDrawings([table]), bars, viewport, pane);
    expect(events.filter((event) => /^(fillRect|strokeRect|fillText):/.test(event))).toEqual([]);

    events.length = 0;
    table.cells = [{ ...makeTable().cells[0]!, text: '' }];
    renderer.render(partitionTealScriptDrawings([table]), bars, viewport, pane);
    expect(events.some((event) => event.startsWith('fillRect:'))).toBe(true);
    expect(events.some((event) => event.startsWith('strokeRect:'))).toBe(true);
    expect(events.some((event) => event.startsWith('fillText:'))).toBe(false);
  });

  it('renders fixed-position table cells above chart drawings', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);

    renderer.render(
      partitionTealScriptDrawings([makeTable()]),
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );

    expect(events).toContain('fillRect:64,18,48,22');
    expect(events).toContain('strokeRect:64,18,48,22');
    expect(events).toContain('font:italic bold 14px monospace');
    expect(events).toContain('fillTextStyle:center,middle');
    expect(events).toContain('fillText:ATR:88,29');
  });

  it('renders numeric Pine table text sizes as canvas font pixels', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);

    renderer.render(
      partitionTealScriptDrawings([
        makeTable({
          cells: [
            {
              column: 0,
              row: 0,
              text: 'ATR',
              textColor: '#ffffff',
              textSize: '21',
              textHalign: 'center',
              textValign: 'middle',
              textFontFamily: 'monospace',
              textFormatting: 'bolditalic',
              bgcolor: '#111827',
            },
          ],
        }),
      ]),
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );

    expect(events).toContain('font:italic bold 21px monospace');
    expect(events).toContain('fillText:ATR:88,29');
  });

  it('does not draw table borders or frames for explicit null colors', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);

    renderer.render(
      partitionTealScriptDrawings([
        makeTable({
          frameColor: null,
          frameWidth: 2,
          borderColor: null,
          borderWidth: 2,
        }),
      ]),
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );

    expect(events.some((event) => event.startsWith('strokeRect:'))).toBe(false);
    expect(events).toContain('fillRect:64,18,48,22');
    expect(events).toContain('fillText:ATR:88,29');
  });

  it('renders multiline table cell text with expanded auto row height', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);

    renderer.render(
      partitionTealScriptDrawings([
        makeTable({
          cells: [
            {
              column: 0,
              row: 0,
              text: 'High\r\nLow',
              textColor: '#ffffff',
              textSize: 'normal',
              textHalign: 'center',
              textValign: 'middle',
              bgcolor: '#111827',
            },
          ],
        }),
      ]),
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );

    expect(events).toContain('fillRect:64,18,48,48');
    expect(events).toContain('strokeRect:64,18,48,48');
    expect(events).toContain('fillTextStyle:center,middle');
    expect(events).toContain('fillText:High:88,33');
    expect(events).toContain('fillText:Low:88,51');
  });

  it('uses automatic table measurements for explicit zero dimensions', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);
    const draw = (width?: number, height?: number) => {
      renderer.render(partitionTealScriptDrawings([
        makeTable({ cells: [{ ...makeTable().cells[0]!, text: 'Long header\nSecond line', width, height }] }),
      ]), bars, { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 }, pane);
      return events.splice(0);
    };
    const auto = draw();
    expect(draw(0, 0)).toEqual(auto);
    expect(draw(0)).toEqual(auto);
    expect(draw(undefined, 0)).toEqual(auto);
    expect(auto).toContain('fillRect:12,18,100,48');
  });

  it('interprets explicit table cell sizes as pane percentages', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events, {
      options: { width: 200 },
      margins: { left: 20, right: 20 },
    });

    renderer.render(
      partitionTealScriptDrawings([
        makeTable({
          position: 'middle_center',
          cells: [
            {
              column: 0,
              row: 0,
              text: 'Sized',
              width: 25,
              height: 10,
              textColor: '#ffffff',
              textSize: 'normal',
              textHalign: 'right',
              textValign: 'bottom',
              bgcolor: '#111827',
            },
          ],
        }),
      ]),
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );

    expect(events).toContain('fillRect:80,100,40,20');
    expect(events).toContain('strokeRect:80,100,40,20');
    expect(events).toContain('fillTextStyle:right,bottom');
    expect(events).toContain('fillText:Sized:114,114');
  });

  it('renders merged table cells as a single span', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);

    renderer.render(
      partitionTealScriptDrawings([
        makeTable({
          columns: 2,
          rows: 2,
          cells: [
            {
              column: 0,
              row: 0,
              text: 'Header',
              textColor: '#ffffff',
              textSize: 'normal',
              textHalign: 'center',
              textValign: 'middle',
              bgcolor: '#111827',
            },
            {
              column: 1,
              row: 0,
              text: '',
              textColor: '#ffffff',
              textSize: 'normal',
              textHalign: 'center',
              textValign: 'middle',
              bgcolor: '#1f2937',
            },
            {
              column: 0,
              row: 1,
              text: '',
              width: 50,
              textColor: null,
              textSize: 'normal',
              textHalign: 'center',
              textValign: 'center',
              bgcolor: null,
            },
            {
              column: 1,
              row: 1,
              text: '',
              width: 40,
              textColor: null,
              textSize: 'normal',
              textHalign: 'center',
              textValign: 'center',
              bgcolor: null,
            },
          ],
          mergedCells: [
            {
              startColumn: 0,
              startRow: 0,
              endColumn: 1,
              endRow: 0,
            },
          ],
        }),
      ]),
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );

    expect(events).toContain('fillRect:4,18,108,22');
    expect(events).toContain('strokeRect:4,18,108,22');
    expect(events).not.toContain('strokeRect:64,18,48,22');
    expect(events).toContain('fillText:Header:58,29');
  });

  it('ignores invalid table text formatting values', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);

    renderer.render(
      partitionTealScriptDrawings([
        makeTable({
          cells: [
            {
              column: 0,
              row: 0,
              text: 'ATR',
              textColor: '#ffffff',
              textSize: 'normal',
              textHalign: 'center',
              textValign: 'middle',
              textFontFamily: 'monospace',
              textFormatting: 'not-bold-or-italic',
              bgcolor: '#111827',
            },
          ],
        }),
      ]),
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );

    expect(events).toContain('font:14px monospace');
    expect(events).not.toContain('font:italic bold 14px monospace');
  });
});

// Authority: Pine v6 table.cell remark 3 and table.new remark 2 (2026-10-03).
describe('Documented table display replacement', () => {
  it('displays the newest table per location within each script', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);
    const cell = (text: string) => [
      {
        column: 0,
        row: 0,
        text,
        textColor: '#ffffff',
        textSize: 'normal',
        textHalign: 'center',
        textValign: 'center',
        bgcolor: null,
      },
    ];
    renderer.render(
      partitionTealScriptDrawings([
        makeTable({ id: 'old', scriptId: 'one', cells: cell('obsolete') }),
        makeTable({ id: 'control', scriptId: 'two', cells: cell('other script') }),
        makeTable({ id: 'new', scriptId: 'one', cells: cell('replacement') }),
        makeTable({ id: 'other-location', scriptId: 'one', position: 'bottom_left', cells: cell('other location') }),
      ]),
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );
    const texts = events.filter((event) => event.startsWith('fillText:')).map((event) => event.split(':')[1]);
    expect(texts.sort()).toEqual(['other location', 'other script', 'replacement']);
  });

  it('does not reveal an older table when the newest table is empty', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);
    renderer.render(
      partitionTealScriptDrawings([makeTable({ id: 'old' }), makeTable({ id: 'new', cells: [] })]),
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );
    expect(events.filter((event) => event.startsWith('fillText:') || event.startsWith('strokeRect:'))).toEqual([]);
  });

  it('displays only the newest table from a call site after its position changes', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);
    const cell = (text: string) => [
      {
        column: 0,
        row: 0,
        text,
        textColor: '#ffffff',
        textSize: 'normal',
        textHalign: 'center',
        textValign: 'center',
        bgcolor: null,
      },
    ];
    renderer.render(
      partitionTealScriptDrawings([
        makeTable({ id: 'old-site', creationSite: 'a', position: 'top_left', cells: cell('obsolete') }),
        makeTable({ id: 'control-site', creationSite: 'b', position: 'middle_left', cells: cell('control') }),
        makeTable({ id: 'new-site', creationSite: 'a', position: 'bottom_right', cells: cell('replacement') }),
      ]),
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );
    const texts = events.filter((event) => event.startsWith('fillText:')).map((event) => event.split(':')[1]);
    expect(texts.sort()).toEqual(['control', 'replacement']);
  });
});

// Authority: Pine v6 table.merge_cells remark 2: merged dimensions come from
// neighboring cells; attributes come from the start cell, not covered cells.
describe('Documented merged table dimensions', () => {
  it('ignores sizes and text inside a merged span when measuring neighboring rows and columns', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);
    const cell = {
      textColor: '#ffffff',
      textSize: 'normal',
      textHalign: 'center',
      textValign: 'center',
      bgcolor: '#123456',
    };
    renderer.render(
      partitionTealScriptDrawings([
        makeTable({
          position: 'top_left',
          columns: 3,
          rows: 3,
          frameWidth: 0,
          cells: [
            { ...cell, column: 0, row: 0, text: 'start', width: 95, height: 95 },
            { ...cell, column: 1, row: 1, text: 'hidden\ncovered\ntext', width: 75, height: 75 },
            { ...cell, column: 0, row: 2, text: '', width: 10 },
            { ...cell, column: 1, row: 2, text: '', width: 25 },
            { ...cell, column: 2, row: 0, text: '', height: 10 },
            { ...cell, column: 2, row: 1, text: '', height: 15 },
          ],
          mergedCells: [{ startColumn: 0, startRow: 0, endColumn: 1, endRow: 1 }],
        }),
      ]),
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );
    expect(events).toContain('strokeRect:8,18,42,50');
    expect(events).toContain('fillRect:8,18,42,50');
    expect(events).toContain('fillText:start:29,43');
    expect(events.some((event) => event.includes('hidden') || event.includes('covered'))).toBe(false);
  });
});

// Authority: Pine v6 line.style_arrow_* endpoints and linefill.new remarks 1-2.
function filledVertices(events: string[]): string[][] {
  let vertices: string[] = [];
  const fills: string[][] = [];
  for (const event of events) {
    if (event === 'beginPath') vertices = [];
    else if (event.startsWith('moveTo:') || event.startsWith('lineTo:')) vertices.push(event);
    else if (event === 'fill') fills.push([...vertices]);
  }
  return fills;
}

describe('Documented line arrows and linefill parents', () => {
  for (const reverse of [false, true]) {
    for (const [style, endpoints] of [
      ['arrow_left', ['first']],
      ['arrow_right', ['second']],
      ['arrow_both', ['first', 'second']],
    ] as const) {
      it(`${style} attaches to named endpoints when reversed=${reverse}`, () => {
        const events: string[] = [];
        const { renderer } = createDrawingRenderer(events);
        renderer.render(
          partitionTealScriptDrawings([
            makeLine('line-1', { style, ...(reverse ? { x1: 2, y1: 20, x2: 0, y2: 10 } : {}) }),
          ]),
          bars,
          { startTime: 1000, endTime: 3000, priceMin: 0, priceMax: 20 },
          pane,
        );
        const first = reverse ? '120,10' : '0,110';
        const second = reverse ? '0,110' : '120,10';
        expect(filledVertices(events).map((vertices) => vertices[0])).toEqual(
          endpoints.map((end) => `moveTo:${end === 'first' ? first : second}`),
        );
        expect(events.filter((event) => event === 'setLineDash:').length).toBeGreaterThan(0);
      });
    }
  }
  it('linefill follows moved parent coordinates on the next render', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events);
    const first = makeLine('line-1', { y1: 10, y2: 10 });
    const second = makeLine('line-2', { y1: 4, y2: 4 });
    const viewport = { startTime: 1000, endTime: 3000, priceMin: 0, priceMax: 20 };
    renderer.render(partitionTealScriptDrawings([first, second, makeLinefill()]), bars, viewport, pane);
    expect(filledVertices(events)).toEqual([['moveTo:0,110', 'lineTo:120,110', 'lineTo:120,170', 'lineTo:0,170']]);
    Object.assign(first, { x1: 1, y1: 13, x2: 2, y2: 15 });
    Object.assign(second, { x1: 0, y1: 8, x2: 1, y2: 7 });
    events.length = 0;
    renderer.render(partitionTealScriptDrawings([first, second, makeLinefill()]), bars, viewport, pane);
    expect(filledVertices(events)).toEqual([['moveTo:60,80', 'lineTo:120,60', 'lineTo:60,140', 'lineTo:0,130']]);
  });
  for (const [extend, start, end] of [
    ['left', 0, 90],
    ['right', 30, 120],
    ['both', 0, 120],
  ] as const) {
    it(`linefill includes both parent extend.${extend} regions`, () => {
      const events: string[] = [];
      const { renderer } = createDrawingRenderer(events);
      renderer.render(
        partitionTealScriptDrawings([
          makeLine('line-1', { extend, y1: 10, y2: 10 }),
          makeLine('line-2', { extend, y1: 4, y2: 4 }),
          makeLinefill(),
        ]),
        bars,
        { startTime: 0, endTime: 4000, priceMin: 0, priceMax: 20 },
        pane,
      );
      expect(filledVertices(events)).toEqual([
        [`moveTo:${start},110`, `lineTo:${end},110`, `lineTo:${end},170`, `lineTo:${start},170`],
      ]);
    });
  }
});

// Authority: line.style_* broad stroke styles and Tables manual cell maxima.
describe('Documented drawing stroke and table sizing', () => {
  for (const style of ['solid', 'dotted', 'dashed'] as const) {
    it(`documented stroke ${style} selects its broad dash pattern`, () => {
      const events: string[] = [];
      const { renderer } = createDrawingRenderer(events);
      renderer.render(
        partitionTealScriptDrawings([makeLine('line', { style })]),
        bars,
        { startTime: 1000, endTime: 3000, priceMin: 0, priceMax: 20 },
        pane,
      );
      expect(events).toContain('stroke');
      const beforeStroke = events.slice(0, events.indexOf('stroke'));
      const pattern = beforeStroke
        .filter((e) => e.startsWith('setLineDash:'))
        .at(-1)
        ?.slice('setLineDash:'.length);
      expect(pattern).toBeDefined();
      if (style === 'solid') expect(pattern).toBe('');
      else {
        const [paint, gap] = pattern!.split(',').map(Number);
        expect(paint).toBeGreaterThan(0);
        expect(gap).toBeGreaterThan(0);
        expect(style === 'dotted' ? paint! < gap! : paint! > gap!).toBe(true);
      }
    });
  }
  it('documented table sizing uses the maximum across each column and row', () => {
    const events: string[] = [];
    const { renderer } = createDrawingRenderer(events, { options: { width: 200 }, margins: { left: 20, right: 20 } });
    const cell = {
      text: '',
      textColor: '#ffffff',
      textSize: 'normal',
      textHalign: 'center',
      textValign: 'middle',
      bgcolor: '#123456',
    };
    renderer.render(
      partitionTealScriptDrawings([
        makeTable({
          position: 'top_left',
          columns: 2,
          rows: 2,
          frameWidth: 0,
          borderWidth: 0,
          bgcolor: null,
          cells: [
            { ...cell, column: 0, row: 0, width: 30, height: 15 },
            { ...cell, column: 1, row: 0, width: 20, height: 25 },
            { ...cell, column: 0, row: 1, width: 10, height: 10 },
            { ...cell, column: 1, row: 1, width: 5, height: 5 },
          ],
        }),
      ]),
      bars,
      { startTime: 1000, endTime: 3000, priceMin: 0, priceMax: 20 },
      pane,
    );
    expect(events.filter((e) => e.startsWith('fillRect:'))).toEqual([
      'fillRect:28,18,48,50',
      'fillRect:76,18,32,50',
      'fillRect:28,68,48,20',
      'fillRect:76,68,32,20',
    ]);
  });
});
