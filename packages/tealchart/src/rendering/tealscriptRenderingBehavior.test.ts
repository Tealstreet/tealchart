// @vitest-environment node
import type {
  BoxDrawingOutput,
  DrawingOutput,
  LabelDrawingOutput,
  LineDrawingOutput,
  LineFillDrawingOutput,
  PlotOutput,
  PlotStyle,
  PolylineDrawingOutput,
  TableDrawingOutput,
} from '@tealstreet/tealscript';
import type { CanvasContext } from './CanvasContext';
import type { Bar, ComputedPane, PaneLayout, Viewport } from '../types';

import { afterEach, describe, expect, it } from 'vitest';

import { TealchartRenderer, type IndicatorPaneInfo } from '../TealchartRenderer';
import { clearChartStoreCache } from '../state/chartState';
import {
  formatIndicatorOutputAxisValue,
  getIndicatorOutputAxisLabelSources,
} from './indicatorOutputAxisLabels';
import { partitionTealScriptDrawings } from './TealScriptDrawingPartition';
import { TealScriptDrawingRenderer } from './TealScriptDrawingRenderer';

type DrawCall =
  | { op: 'arc'; fillStyle: string; strokeStyle: string; x: number; y: number; radius: number }
  | { op: 'beginPath' }
  | { op: 'clip' }
  | { op: 'closePath' }
  | { op: 'fill'; fillStyle: string }
  | { op: 'fillRect'; fillStyle: string; x: number; y: number; width: number; height: number }
  | { op: 'fillText'; fillStyle: string; font: string; text: string; textAlign: CanvasTextAlign; textBaseline: CanvasTextBaseline; x: number; y: number }
  | { op: 'lineTo'; x: number; y: number }
  | { op: 'moveTo'; x: number; y: number }
  | { op: 'rect'; x: number; y: number; width: number; height: number }
  | { op: 'restore' }
  | { op: 'save' }
  | { op: 'scale'; x: number; y: number }
  | { op: 'setLineDash'; segments: number[] }
  | { op: 'stroke'; lineDash: number[]; lineWidth: number; strokeStyle: string }
  | { op: 'strokeRect'; lineWidth: number; strokeStyle: string; x: number; y: number; width: number; height: number };

interface CanvasState {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  lineDashOffset: number;
  globalAlpha: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  lineDash: number[];
}

class RecordingCanvasContext implements CanvasContext {
  readonly calls: DrawCall[] = [];
  fillStyle: string | CanvasGradient | CanvasPattern = '#000000';
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000000';
  lineWidth = 1;
  font = '10px sans-serif';
  textAlign: CanvasTextAlign = 'left';
  textBaseline: CanvasTextBaseline = 'alphabetic';
  lineDashOffset = 0;
  globalAlpha = 1;
  lineCap: CanvasLineCap = 'butt';
  lineJoin: CanvasLineJoin = 'miter';
  private lineDash: number[] = [];
  private readonly stateStack: CanvasState[] = [];

  beginPath(): void {
    this.calls.push({ op: 'beginPath' });
  }

  moveTo(x: number, y: number): void {
    this.calls.push({ op: 'moveTo', x: roundCoord(x), y: roundCoord(y) });
  }

  lineTo(x: number, y: number): void {
    this.calls.push({ op: 'lineTo', x: roundCoord(x), y: roundCoord(y) });
  }

  quadraticCurveTo(_cpx: number, _cpy: number, x: number, y: number): void {
    this.lineTo(x, y);
  }

  bezierCurveTo(_cp1x: number, _cp1y: number, _cp2x: number, _cp2y: number, x: number, y: number): void {
    this.lineTo(x, y);
  }

  arc(x: number, y: number, radius: number): void {
    this.calls.push({
      op: 'arc',
      x: roundCoord(x),
      y: roundCoord(y),
      radius: roundCoord(radius),
      fillStyle: String(this.fillStyle),
      strokeStyle: String(this.strokeStyle),
    });
  }

  rect(x: number, y: number, width: number, height: number): void {
    this.calls.push({ op: 'rect', x: roundCoord(x), y: roundCoord(y), width: roundCoord(width), height: roundCoord(height) });
  }

  roundRect(x: number, y: number, width: number, height: number): void {
    this.rect(x, y, width, height);
  }

  closePath(): void {
    this.calls.push({ op: 'closePath' });
  }

  fill(): void {
    this.calls.push({ op: 'fill', fillStyle: String(this.fillStyle) });
  }

  stroke(): void {
    this.calls.push({
      op: 'stroke',
      strokeStyle: String(this.strokeStyle),
      lineWidth: this.lineWidth,
      lineDash: [...this.lineDash],
    });
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    this.calls.push({
      op: 'fillRect',
      fillStyle: String(this.fillStyle),
      x: roundCoord(x),
      y: roundCoord(y),
      width: roundCoord(width),
      height: roundCoord(height),
    });
  }

  strokeRect(x: number, y: number, width: number, height: number): void {
    this.calls.push({
      op: 'strokeRect',
      strokeStyle: String(this.strokeStyle),
      lineWidth: this.lineWidth,
      x: roundCoord(x),
      y: roundCoord(y),
      width: roundCoord(width),
      height: roundCoord(height),
    });
  }

  fillText(text: string, x: number, y: number): void {
    this.calls.push({
      op: 'fillText',
      text,
      x: roundCoord(x),
      y: roundCoord(y),
      fillStyle: String(this.fillStyle),
      font: this.font,
      textAlign: this.textAlign,
      textBaseline: this.textBaseline,
    });
  }

  save(): void {
    this.stateStack.push({
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      font: this.font,
      textAlign: this.textAlign,
      textBaseline: this.textBaseline,
      lineDashOffset: this.lineDashOffset,
      globalAlpha: this.globalAlpha,
      lineCap: this.lineCap,
      lineJoin: this.lineJoin,
      lineDash: [...this.lineDash],
    });
    this.calls.push({ op: 'save' });
  }

  restore(): void {
    const state = this.stateStack.pop();
    if (state) {
      this.fillStyle = state.fillStyle;
      this.strokeStyle = state.strokeStyle;
      this.lineWidth = state.lineWidth;
      this.font = state.font;
      this.textAlign = state.textAlign;
      this.textBaseline = state.textBaseline;
      this.lineDashOffset = state.lineDashOffset;
      this.globalAlpha = state.globalAlpha;
      this.lineCap = state.lineCap;
      this.lineJoin = state.lineJoin;
      this.lineDash = [...state.lineDash];
    }
    this.calls.push({ op: 'restore' });
  }

  clip(): void {
    this.calls.push({ op: 'clip' });
  }

  scale(x: number, y: number): void {
    this.calls.push({ op: 'scale', x, y });
  }

  translate(_x: number, _y: number): void {
    return;
  }

  setLineDash(segments: number[]): void {
    this.lineDash = [...segments];
    this.calls.push({ op: 'setLineDash', segments: [...segments] });
  }

  getLineDash(): number[] {
    return [...this.lineDash];
  }

  measureText(text: string): TextMetrics {
    return { width: text.length * 7 } as TextMetrics;
  }
}

const BARS: Bar[] = [
  { time: 1_000, open: 100, high: 108, low: 98, close: 104, volume: 100 },
  { time: 2_000, open: 104, high: 110, low: 101, close: 102, volume: 110 },
  { time: 3_000, open: 102, high: 112, low: 100, close: 109, volume: 120 },
  { time: 4_000, open: 109, high: 114, low: 106, close: 111, volume: 130 },
];

const VIEWPORT: Viewport = {
  startTime: 1_000,
  endTime: 4_000,
  priceMin: 90,
  priceMax: 120,
};

const INDICATOR_LAYOUT: PaneLayout = {
  mainPaneHeight: 0.6,
  volumePaneHeight: 0,
  indicatorPanes: [{
    id: 'pane_rsi',
    indicatorIds: ['pane-script'],
    heightRatio: 0.4,
    yMin: 0,
    yMax: 100,
    fixedRange: true,
  }],
};

const DRAWING_PANE: ComputedPane = {
  id: 'main',
  type: 'main',
  heightRatio: 1,
  yMin: 90,
  yMax: 120,
  fixedRange: false,
  top: 10,
  height: 210,
  bottom: 220,
};

function roundCoord(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function makeRenderer(ctx: RecordingCanvasContext): TealchartRenderer {
  return new TealchartRenderer(ctx, {
    width: 360,
    height: 260,
    showVolume: false,
    backgroundColor: '#101214',
    gridColor: '#25282c',
    textColor: '#d0d4dc',
    devicePixelRatio: 1,
  });
}

function renderPlots(
  plots: PlotOutput[],
  options: {
    indicatorPaneInfo?: Record<string, IndicatorPaneInfo>;
    paneLayout?: PaneLayout;
  } = {},
): RecordingCanvasContext {
  const ctx = new RecordingCanvasContext();
  makeRenderer(ctx).renderPlots(plots, BARS, VIEWPORT, options.paneLayout, options.indicatorPaneInfo);
  return ctx;
}

function basePlot(overrides: Partial<PlotOutput> = {}): PlotOutput {
  return {
    id: 'plot',
    type: 'plot',
    title: 'Plot',
    values: BARS.map((bar) => bar.close),
    color: '#2962ff',
    scriptId: 'overlay-script',
    ...overrides,
  };
}

function strokeCalls(ctx: RecordingCanvasContext): Extract<DrawCall, { op: 'stroke' }>[] {
  return ctx.calls.filter((call): call is Extract<DrawCall, { op: 'stroke' }> => call.op === 'stroke');
}

function fillRectCalls(ctx: RecordingCanvasContext): Extract<DrawCall, { op: 'fillRect' }>[] {
  return ctx.calls.filter((call): call is Extract<DrawCall, { op: 'fillRect' }> => call.op === 'fillRect');
}

function fillTextCalls(ctx: RecordingCanvasContext): Extract<DrawCall, { op: 'fillText' }>[] {
  return ctx.calls.filter((call): call is Extract<DrawCall, { op: 'fillText' }> => call.op === 'fillText');
}

function makeLine(id: string, overrides: Partial<LineDrawingOutput> = {}): LineDrawingOutput {
  return {
    id,
    type: 'line',
    barIndex: 0,
    x1: 0,
    y1: 100,
    x2: 3,
    y2: 112,
    xloc: 'bar_index',
    extend: 'none',
    color: '#2962ff',
    style: 'dashed',
    width: 2,
    ...overrides,
  };
}

function makeBox(overrides: Partial<BoxDrawingOutput> = {}): BoxDrawingOutput {
  return {
    id: 'box',
    type: 'box',
    barIndex: 0,
    left: 0,
    top: 113,
    right: 3,
    bottom: 99,
    xloc: 'bar_index',
    extend: 'none',
    borderColor: '#f59e0b',
    borderWidth: 2,
    borderStyle: 'dotted',
    bgcolor: '#11182780',
    text: 'Range',
    textColor: '#ffffff',
    textSize: 'normal',
    textHalign: 'center',
    textValign: 'middle',
    ...overrides,
  };
}

function makeLabel(overrides: Partial<LabelDrawingOutput> = {}): LabelDrawingOutput {
  return {
    id: 'label',
    type: 'label',
    barIndex: 1,
    x: 2,
    y: 110,
    text: 'Buy',
    xloc: 'bar_index',
    yloc: 'price',
    style: 'label_up',
    color: '#16a34a',
    textColor: '#ffffff',
    size: 'normal',
    ...overrides,
  };
}

function makePolyline(overrides: Partial<PolylineDrawingOutput> = {}): PolylineDrawingOutput {
  return {
    id: 'polyline',
    type: 'polyline',
    barIndex: 0,
    points: [
      { type: 'chart.point', time: null, index: 0, price: 101 },
      { type: 'chart.point', time: null, index: 1, price: 108 },
      { type: 'chart.point', time: null, index: 3, price: 104 },
    ],
    curved: false,
    closed: true,
    xloc: 'bar_index',
    lineColor: '#06b6d4',
    fillColor: '#06b6d433',
    lineStyle: 'solid',
    lineWidth: 1,
    ...overrides,
  };
}

function makeLineFill(overrides: Partial<LineFillDrawingOutput> = {}): LineFillDrawingOutput {
  return {
    id: 'linefill',
    type: 'linefill',
    barIndex: 0,
    line1: 'line-a',
    line2: 'line-b',
    color: '#8b5cf633',
    ...overrides,
  };
}

function makeTable(overrides: Partial<TableDrawingOutput> = {}): TableDrawingOutput {
  return {
    id: 'table',
    type: 'table',
    barIndex: 0,
    position: 'top_right',
    columns: 1,
    rows: 1,
    bgcolor: '#020617',
    frameColor: '#475569',
    frameWidth: 1,
    borderColor: '#64748b',
    borderWidth: 1,
    cells: [{
      column: 0,
      row: 0,
      text: 'ATR',
      textColor: '#f8fafc',
      textSize: 'normal',
      textHalign: 'center',
      textValign: 'middle',
      bgcolor: '#1e293b',
    }],
    ...overrides,
  };
}

function renderDrawings(drawings: DrawingOutput[]): RecordingCanvasContext {
  const ctx = new RecordingCanvasContext();
  const renderer = makeRenderer(ctx);
  const options = renderer.getOptions();
  const drawingRenderer = new TealScriptDrawingRenderer({
    ctx,
    options,
    margins: options.margins,
    font: 'sans-serif',
    coordinateResolvers: {
      timeToX: (time, viewport, chartWidth) => {
        const ratio = (time - viewport.startTime) / (viewport.endTime - viewport.startTime);
        return options.margins.left + ratio * chartWidth;
      },
      valueToY: (value, pane) => renderer.valueToY(value, pane),
    },
    getTextWidth: (_ctx, text) => text.length * 7,
  });

  drawingRenderer.render(partitionTealScriptDrawings(drawings), BARS, VIEWPORT, DRAWING_PANE);
  return ctx;
}

describe('TealScript rendering behavior matrix', () => {
  afterEach(() => {
    clearChartStoreCache();
  });

  it('covers every plot style with named render-command behavior', () => {
    const cases: Array<{
      expected: (ctx: RecordingCanvasContext) => void;
      style: PlotStyle;
      values?: (number | null)[];
    }> = [
      {
        style: 'line',
        expected: (ctx) => {
          expect(strokeCalls(ctx)).toEqual([expect.objectContaining({ strokeStyle: '#2962ff', lineWidth: 2 })]);
        },
      },
      {
        style: 'linebr',
        values: [100, 104, null, 109],
        expected: (ctx) => {
          expect(strokeCalls(ctx)).toHaveLength(2);
        },
      },
      {
        style: 'stepline',
        expected: (ctx) => {
          const lineTos = ctx.calls.filter((call) => call.op === 'lineTo');
          expect(lineTos.length).toBeGreaterThanOrEqual(6);
        },
      },
      {
        style: 'steplinebr',
        values: [100, 104, null, 109],
        expected: (ctx) => {
          expect(strokeCalls(ctx)).toHaveLength(2);
        },
      },
      {
        style: 'stepline_diamond',
        expected: (ctx) => {
          expect(ctx.calls.filter((call) => call.op === 'fill')).toHaveLength(BARS.length);
        },
      },
      {
        style: 'histogram',
        expected: (ctx) => {
          expect(fillRectCalls(ctx)).toHaveLength(BARS.length);
        },
      },
      {
        style: 'columns',
        expected: (ctx) => {
          expect(fillRectCalls(ctx).map((call) => call.fillStyle)).toEqual(['#2962ff', '#2962ff', '#2962ff', '#2962ff']);
        },
      },
      {
        style: 'cross',
        expected: (ctx) => {
          expect(strokeCalls(ctx)).toHaveLength(BARS.length);
        },
      },
      {
        style: 'circles',
        expected: (ctx) => {
          expect(ctx.calls.filter((call) => call.op === 'arc')).toHaveLength(BARS.length);
          expect(ctx.calls.filter((call) => call.op === 'fill')).toHaveLength(BARS.length);
        },
      },
      {
        style: 'area',
        expected: (ctx) => {
          expect(ctx.calls).toContainEqual(expect.objectContaining({ op: 'fill', fillStyle: '#2962ff33' }));
        },
      },
      {
        style: 'areabr',
        values: [100, 104, null, 109],
        expected: (ctx) => {
          expect(ctx.calls.filter((call) => call.op === 'fill')).toHaveLength(2);
        },
      },
    ];

    for (const testCase of cases) {
      const ctx = renderPlots([
        basePlot({
          id: `plot-${testCase.style}`,
          linewidth: 2,
          style: testCase.style,
          values: testCase.values ?? [100, 104, 107, 109],
        }),
      ]);

      testCase.expected(ctx);
    }
  });

  it('applies per-bar colors, transparency, hlines, bgcolor, and fill gaps as visible commands', () => {
    const ctx = renderPlots([
      basePlot({
        id: 'colored-line',
        values: [101, 105, 104, 109],
        color: ['#ef4444', '#22c55e', '#3b82f6', '#a855f7'],
        linewidth: 2,
      }),
      basePlot({
        id: 'upper',
        values: [110, 111, null, 113],
        color: '#f97316',
      }),
      {
        ...basePlot({
          id: 'floor',
          type: 'hline',
          price: 100,
          values: [],
          color: '#94a3b8',
          lineStyle: 'dashed',
        }),
      },
      {
        ...basePlot({
          id: 'fill-upper-floor',
          type: 'fill',
          values: [],
          plot1Id: 'upper',
          plot2Id: 'floor',
          color: ['#10b98122', '#10b98144', '#10b98166', '#10b98188'],
          fillgaps: false,
        }),
      },
      {
        ...basePlot({
          id: 'bg',
          type: 'bgcolor',
          values: [1, null, 1, 1],
          color: ['#11182722', null, '#7c3aed22', '#dc262622'],
        }),
      },
    ]);

    expect(strokeCalls(ctx).map((call) => call.strokeStyle)).toEqual(
      expect.arrayContaining(['#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#94a3b8']),
    );
    expect(strokeCalls(ctx)).toContainEqual(expect.objectContaining({ strokeStyle: '#94a3b8', lineDash: [6, 4] }));
    expect(ctx.calls).toContainEqual(expect.objectContaining({ op: 'fill', fillStyle: '#10b98144' }));
    expect(ctx.calls).not.toContainEqual(expect.objectContaining({ op: 'fill', fillStyle: '#10b98166' }));
    expect(fillRectCalls(ctx).map((call) => call.fillStyle)).toEqual(
      expect.arrayContaining(['#11182722', '#7c3aed22', '#dc262622']),
    );
  });

  it('renders OHLC and arrow outputs with Pine skip and color semantics', () => {
    const candle = renderPlots([
      basePlot({
        id: 'candle',
        type: 'plotcandle',
        values: [1, 1, 1, 1],
        openValues: [100, null, 102, 109],
        highValues: [108, 110, 112, 114],
        lowValues: [98, 101, 100, 106],
        closeValues: [104, 102, 109, 111],
        color: ['#22c55e', '#ef4444', '#22c55e', '#22c55e'],
        wickColor: ['#86efac', '#fca5a5', '#86efac', '#86efac'],
        borderColor: ['#15803d', '#b91c1c', '#15803d', '#15803d'],
      }),
    ]);

    expect(fillRectCalls(candle)).toHaveLength(3);
    expect(fillRectCalls(candle).map((call) => call.fillStyle)).toEqual(['#22c55e', '#22c55e', '#22c55e']);
    expect(strokeCalls(candle).map((call) => call.strokeStyle)).toEqual(['#86efac', '#86efac', '#86efac']);
    expect(candle.calls.filter((call) => call.op === 'strokeRect').map((call) => call.strokeStyle)).toEqual([
      '#15803d',
      '#15803d',
      '#15803d',
    ]);

    const plotbar = renderPlots([
      basePlot({
        id: 'plotbar',
        type: 'plotbar',
        values: [1, 1, 1, 1],
        openValues: [100, 104, 102, 109],
        highValues: [108, 110, null, 114],
        lowValues: [98, 101, 100, 106],
        closeValues: [104, 102, 109, 111],
        color: ['#22c55e', '#ef4444', '#3b82f6', '#22c55e'],
      }),
    ]);
    expect(strokeCalls(plotbar).map((call) => call.strokeStyle)).toEqual(['#22c55e', '#ef4444', '#22c55e']);

    const arrows = renderPlots([
      basePlot({
        id: 'arrows',
        type: 'plotarrow',
        values: [2, -1, 0, null],
        color: ['#16a34a', '#dc2626', '#999999', '#999999'],
        minHeight: 4,
        maxHeight: 16,
      }),
    ]);
    expect(arrows.calls.filter((call) => call.op === 'fill')).toHaveLength(2);
    expect(arrows.calls.filter((call) => call.op === 'closePath')).toHaveLength(2);
  });

  it('routes overlay, forced overlay, and pane plots through the production render router', () => {
    const ctx = renderPlots(
      [
        basePlot({
          id: 'pane-plot',
          scriptId: 'pane-script',
          values: [20, 40, 60, 80],
          color: '#f59e0b',
        }),
        basePlot({
          id: 'forced-plot',
          scriptId: 'pane-script',
          values: [100, 101, 102, 103],
          color: '#22c55e',
          forceOverlay: true,
        }),
        basePlot({
          id: 'overlay-plot',
          scriptId: 'overlay-script',
          values: [105, 106, 107, 108],
          color: '#3b82f6',
        }),
      ],
      {
        paneLayout: INDICATOR_LAYOUT,
        indicatorPaneInfo: {
          'pane-script': { overlay: false, paneId: 'pane_rsi' } as IndicatorPaneInfo & { paneId: string },
          'overlay-script': { overlay: true },
        },
      },
    );

      expect(ctx.calls).toContainEqual(expect.objectContaining({
        op: 'fillRect',
        fillStyle: '#101214',
        y: 144.4,
        height: 89.6,
      }));
    expect(ctx.calls).toContainEqual(expect.objectContaining({ op: 'clip' }));
    expect(strokeCalls(ctx).map((call) => call.strokeStyle)).toEqual(
      expect.arrayContaining(['#f59e0b', '#22c55e', '#3b82f6']),
    );
  });

  it('formats output-axis labels with declaration scale and precision semantics', () => {
    const labels = getIndicatorOutputAxisLabelSources({
      indicatorPaneInfo: {
        volumePane: { overlay: false, paneId: 'pane_volume', format: 'volume', precision: 0 },
        percentPane: { overlay: false, paneId: 'pane_percent', format: 'percent', precision: 2 },
        hiddenPane: { overlay: false, paneId: 'pane_hidden', scale: 'none' },
      },
      panes: [
        { id: 'pane_volume', type: 'indicator' },
        { id: 'pane_percent', type: 'indicator' },
        { id: 'pane_hidden', type: 'indicator' },
      ],
      plots: [
        basePlot({ id: 'volume', scriptId: 'volumePane', values: [1_250_000] }),
        basePlot({ id: 'percent', scriptId: 'percentPane', values: [0.1289], format: 'price', precision: 3 }),
        basePlot({ id: 'hidden', scriptId: 'hiddenPane', values: [42] }),
      ],
      totalBarCount: 1,
    });

    expect(labels.map((label) => label.plotId)).toEqual(['volume', 'percent']);
    expect(formatIndicatorOutputAxisValue(labels[0]!.value, 2_000_000, labels[0]!.precision, labels[0]!.format)).toBe('1.25M');
    expect(formatIndicatorOutputAxisValue(labels[1]!.value, 1, labels[1]!.precision, labels[1]!.format)).toBe('0.129');
  });

  it('renders drawing objects with coordinates, mutator-visible styles, text, and layer order', () => {
    const ctx = renderDrawings([
      makeLine('line-a', { y1: 100, y2: 108 }),
      makeLine('line-b', { y1: 111, y2: 104 }),
      makeLineFill(),
      makeBox(),
      makePolyline(),
      makeLine('line-c'),
      makeLabel(),
      makeTable(),
    ]);

    const firstFill = ctx.calls.findIndex((call) => call.op === 'fill' && call.fillStyle === '#8b5cf633');
    const boxFill = ctx.calls.findIndex((call) => call.op === 'fillRect' && call.fillStyle === '#11182780');
    const polyFill = ctx.calls.findIndex((call) => call.op === 'fill' && call.fillStyle === '#06b6d433');
    const lineStroke = ctx.calls.findIndex((call) => call.op === 'stroke' && call.strokeStyle === '#2962ff');
    const labelText = ctx.calls.findIndex((call) => call.op === 'fillText' && call.text === 'Buy');
    const tableText = ctx.calls.findIndex((call) => call.op === 'fillText' && call.text === 'ATR');

    expect(firstFill).toBeGreaterThanOrEqual(0);
    expect(boxFill).toBeGreaterThan(firstFill);
    expect(polyFill).toBeGreaterThan(boxFill);
    expect(lineStroke).toBeGreaterThan(polyFill);
    expect(labelText).toBeGreaterThan(lineStroke);
    expect(tableText).toBeGreaterThan(labelText);
    expect(ctx.calls).toContainEqual(expect.objectContaining({ op: 'setLineDash', segments: [2, 4] }));
    expect(ctx.calls).toContainEqual(expect.objectContaining({ op: 'stroke', strokeStyle: '#2962ff', lineWidth: 2 }));
    expect(ctx.calls).toContainEqual(expect.objectContaining({
      op: 'fillText',
      text: 'Range',
      fillStyle: '#ffffff',
      textAlign: 'center',
      textBaseline: 'middle',
    }));
  });
});
