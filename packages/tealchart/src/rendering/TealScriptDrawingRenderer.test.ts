import type {
  BoxDrawingOutput,
  LabelDrawingOutput,
  LineDrawingOutput,
  LineFillDrawingOutput,
} from '@tealstreet/tealscript';
import type { Bar, ComputedPane } from '../types';
import type { CanvasContext } from './CanvasContext';

import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_MARGINS, DEFAULT_RENDER_OPTIONS } from '../types';
import { partitionTealScriptDrawings } from './TealScriptDrawingPartition';
import { TealScriptDrawingRenderer } from './TealScriptDrawingRenderer';

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
    arc: () => events.push('arc'),
    rect: (x, y, width, height) => events.push(`rect:${x},${y},${width},${height}`),
    roundRect: (x, y, width, height) => events.push(`roundRect:${x},${y},${width},${height}`),
    closePath: () => events.push('closePath'),
    fill: () => events.push('fill'),
    stroke: () => events.push('stroke'),
    fillRect: (x, y, width, height) => events.push(`fillRect:${x},${y},${width},${height}`),
    strokeRect: (x, y, width, height) => events.push(`strokeRect:${x},${y},${width},${height}`),
    fillText: (text, x, y) => {
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
});
