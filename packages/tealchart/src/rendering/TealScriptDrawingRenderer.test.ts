import type {
  BoxDrawingOutput,
  LabelDrawingOutput,
  LineDrawingOutput,
  LineFillDrawingOutput,
  PolylineDrawingOutput,
  TableDrawingOutput,
} from '@tealstreet/tealscript';
import type { Bar, ComputedPane } from '../types';
import type { CanvasContext } from './CanvasContext';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_MARGINS, DEFAULT_RENDER_OPTIONS } from '../types';
import { clearChartStoreCache } from '../state/chartState';
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
    textColor: null,
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
    style: 'label_left',
    color: '#1f2937',
    textColor: '#ffffff',
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
    const ctx = createRecordingContext(events);
    const getTextWidth = vi.fn((activeCtx: CanvasContext, text: string, font: string) => activeCtx.measureText(text).width);
    const renderer = new TealScriptDrawingRenderer({
      ctx,
      options: { ...DEFAULT_RENDER_OPTIONS, width: 120, height: 240 },
      margins: { ...DEFAULT_MARGINS, left: 0, right: 0 },
      font: 'sans-serif',
      coordinateResolvers: {
        timeToX: (time, viewport, chartWidth) =>
          ((time - viewport.startTime) / (viewport.endTime - viewport.startTime)) * chartWidth,
        valueToY: (value, activePane) =>
          activePane.top + ((activePane.yMax - value) / (activePane.yMax - activePane.yMin)) * activePane.height,
      },
      getTextWidth,
    });

    const drawings = partitionTealScriptDrawings([
      makeLine('line-1'),
      makeBox(),
      makeLinefill(),
      makeLabel({ size: 'large' }),
      makeLine('line-2', { y1: 8, y2: 18 }),
    ]);

    renderer.render(
      drawings,
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );

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
    expect(getTextWidth).toHaveBeenCalledWith(ctx, 'Label', '14px sans-serif');
  });

  it('renders box text using stored horizontal and vertical alignment', () => {
    const events: string[] = [];
    const renderer = new TealScriptDrawingRenderer({
      ctx: createRecordingContext(events),
      options: { ...DEFAULT_RENDER_OPTIONS, width: 120, height: 240 },
      margins: { ...DEFAULT_MARGINS, left: 0, right: 0 },
      font: 'sans-serif',
      coordinateResolvers: {
        timeToX: (time, viewport, chartWidth) =>
          ((time - viewport.startTime) / (viewport.endTime - viewport.startTime)) * chartWidth,
        valueToY: (value, activePane) =>
          activePane.top + ((activePane.yMax - value) / (activePane.yMax - activePane.yMin)) * activePane.height,
      },
      getTextWidth: (ctx, text) => ctx.measureText(text).width,
    });

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

  it('wraps Pine box text with stored alignment and font metadata', () => {
    const events: string[] = [];
    const renderer = new TealScriptDrawingRenderer({
      ctx: createRecordingContext(events),
      options: { ...DEFAULT_RENDER_OPTIONS, width: 120, height: 240 },
      margins: { ...DEFAULT_MARGINS, left: 0, right: 0 },
      font: 'sans-serif',
      coordinateResolvers: {
        timeToX: (time, viewport, chartWidth) =>
          ((time - viewport.startTime) / (viewport.endTime - viewport.startTime)) * chartWidth,
        valueToY: (value, activePane) =>
          activePane.top + ((activePane.yMax - value) / (activePane.yMax - activePane.yMin)) * activePane.height,
      },
      getTextWidth: (ctx, text) => ctx.measureText(text).width,
    });

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

    expect(events).toContain('font:italic bold 12px monospace');
    expect(events).toContain('fillTextStyle:center,top');
    expect(events.some((event) => event.startsWith('fillText:Alpha:'))).toBe(true);
    expect(events.some((event) => event.startsWith('fillText:Beta:'))).toBe(true);
    expect(events.some((event) => event.startsWith('fillText:Gamma:'))).toBe(true);
  });

  it('renders polyline paths with optional fill when closed', () => {
    const events: string[] = [];
    const renderer = new TealScriptDrawingRenderer({
      ctx: createRecordingContext(events),
      options: { ...DEFAULT_RENDER_OPTIONS, width: 120, height: 240 },
      margins: { ...DEFAULT_MARGINS, left: 0, right: 0 },
      font: 'sans-serif',
      coordinateResolvers: {
        timeToX: (time, viewport, chartWidth) =>
          ((time - viewport.startTime) / (viewport.endTime - viewport.startTime)) * chartWidth,
        valueToY: (value, activePane) =>
          activePane.top + ((activePane.yMax - value) / (activePane.yMax - activePane.yMin)) * activePane.height,
      },
      getTextWidth: (ctx, text) => ctx.measureText(text).width,
    });

    renderer.render(
      partitionTealScriptDrawings([
        makePolyline({ closed: true, fillColor: 'rgba(41, 98, 255, 0.18)' }),
      ]),
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

  it('renders curved polyline paths with quadratic segments', () => {
    const events: string[] = [];
    const renderer = new TealScriptDrawingRenderer({
      ctx: createRecordingContext(events),
      options: { ...DEFAULT_RENDER_OPTIONS, width: 120, height: 240 },
      margins: { ...DEFAULT_MARGINS, left: 0, right: 0 },
      font: 'sans-serif',
      coordinateResolvers: {
        timeToX: (time, viewport, chartWidth) =>
          ((time - viewport.startTime) / (viewport.endTime - viewport.startTime)) * chartWidth,
        valueToY: (value, activePane) =>
          activePane.top + ((activePane.yMax - value) / (activePane.yMax - activePane.yMin)) * activePane.height,
      },
      getTextWidth: (ctx, text) => ctx.measureText(text).width,
    });

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
    expect(events).toContain('quadraticCurveTo:60,60,120,90');
    expect(events).not.toContain('lineTo:60,60');
    expect(events).toContain('closePath');
    expect(events).toContain('fill');
    expect(events).toContain('stroke');
  });

  it('renders Pine label pointer styles instead of plain rounded pills', () => {
    const events: string[] = [];
    const renderer = new TealScriptDrawingRenderer({
      ctx: createRecordingContext(events),
      options: { ...DEFAULT_RENDER_OPTIONS, width: 120, height: 240 },
      margins: { ...DEFAULT_MARGINS, left: 0, right: 0 },
      font: 'sans-serif',
      coordinateResolvers: {
        timeToX: (time, viewport, chartWidth) =>
          ((time - viewport.startTime) / (viewport.endTime - viewport.startTime)) * chartWidth,
        valueToY: (value, activePane) =>
          activePane.top + ((activePane.yMax - value) / (activePane.yMax - activePane.yMin)) * activePane.height,
      },
      getTextWidth: (ctx, text) => ctx.measureText(text).width,
    });

    renderer.render(
      partitionTealScriptDrawings([
        makeLabel({ style: 'label_up', text: 'Up' }),
        makeLabel({ id: 'label-2', style: 'label_right', text: 'Right' }),
        makeLabel({ id: 'label-3', style: 'label_upper_left', text: 'Upper' }),
      ]),
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );

    expect(events.filter((event) => event.startsWith('roundRect:'))).toHaveLength(3);
    expect(events.filter((event) => event === 'closePath')).toHaveLength(3);
    expect(events).toContain('moveTo:82,34');
    expect(events.some((event) => event.startsWith('fillText:Up:'))).toBe(true);
    expect(events.some((event) => event.startsWith('fillText:Right:'))).toBe(true);
    expect(events.some((event) => event.startsWith('fillText:Upper:'))).toBe(true);
  });

  it('renders Pine symbol label styles and keeps style_none text-only', () => {
    const events: string[] = [];
    const renderer = new TealScriptDrawingRenderer({
      ctx: createRecordingContext(events),
      options: { ...DEFAULT_RENDER_OPTIONS, width: 120, height: 240 },
      margins: { ...DEFAULT_MARGINS, left: 0, right: 0 },
      font: 'sans-serif',
      coordinateResolvers: {
        timeToX: (time, viewport, chartWidth) =>
          ((time - viewport.startTime) / (viewport.endTime - viewport.startTime)) * chartWidth,
        valueToY: (value, activePane) =>
          activePane.top + ((activePane.yMax - value) / (activePane.yMax - activePane.yMin)) * activePane.height,
      },
      getTextWidth: (ctx, text) => ctx.measureText(text).width,
    });

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

  it('renders fixed-position table cells above chart drawings', () => {
    const events: string[] = [];
    const renderer = new TealScriptDrawingRenderer({
      ctx: createRecordingContext(events),
      options: { ...DEFAULT_RENDER_OPTIONS, width: 120, height: 240 },
      margins: { ...DEFAULT_MARGINS, left: 0, right: 0 },
      font: 'sans-serif',
      coordinateResolvers: {
        timeToX: (time, viewport, chartWidth) =>
          ((time - viewport.startTime) / (viewport.endTime - viewport.startTime)) * chartWidth,
        valueToY: (value, activePane) =>
          activePane.top + ((activePane.yMax - value) / (activePane.yMax - activePane.yMin)) * activePane.height,
      },
      getTextWidth: (ctx, text) => ctx.measureText(text).width,
    });

    renderer.render(
      partitionTealScriptDrawings([makeTable()]),
      bars,
      { startTime: 1_000, endTime: 3_000, priceMin: 0, priceMax: 20 },
      pane,
    );

    expect(events).toContain('fillRect:64,18,48,22');
    expect(events).toContain('strokeRect:64,18,48,22');
    expect(events).toContain('font:italic bold 12px monospace');
    expect(events).toContain('fillTextStyle:center,middle');
    expect(events).toContain('fillText:ATR:88,29');
  });

  it('renders merged table cells as a single span', () => {
    const events: string[] = [];
    const renderer = new TealScriptDrawingRenderer({
      ctx: createRecordingContext(events),
      options: { ...DEFAULT_RENDER_OPTIONS, width: 120, height: 240 },
      margins: { ...DEFAULT_MARGINS, left: 0, right: 0 },
      font: 'sans-serif',
      coordinateResolvers: {
        timeToX: (time, viewport, chartWidth) =>
          ((time - viewport.startTime) / (viewport.endTime - viewport.startTime)) * chartWidth,
        valueToY: (value, activePane) =>
          activePane.top + ((activePane.yMax - value) / (activePane.yMax - activePane.yMin)) * activePane.height,
      },
      getTextWidth: (ctx, text) => ctx.measureText(text).width,
    });

    renderer.render(
      partitionTealScriptDrawings([
        makeTable({
          columns: 2,
          rows: 1,
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
    const renderer = new TealScriptDrawingRenderer({
      ctx: createRecordingContext(events),
      options: { ...DEFAULT_RENDER_OPTIONS, width: 120, height: 240 },
      margins: { ...DEFAULT_MARGINS, left: 0, right: 0 },
      font: 'sans-serif',
      coordinateResolvers: {
        timeToX: (time, viewport, chartWidth) =>
          ((time - viewport.startTime) / (viewport.endTime - viewport.startTime)) * chartWidth,
        valueToY: (value, activePane) =>
          activePane.top + ((activePane.yMax - value) / (activePane.yMax - activePane.yMin)) * activePane.height,
      },
      getTextWidth: (ctx, text) => ctx.measureText(text).width,
    });

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

    expect(events).toContain('font:12px monospace');
    expect(events).not.toContain('font:italic bold 12px monospace');
  });
});
