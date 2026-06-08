// @vitest-environment node
import type { DrawingOutput, PlotOutput } from '@tealstreet/tealscript';
import type { Bar, ComputedPane, Viewport } from '../types';
import type { CanvasContext } from './CanvasContext';

import fs from 'node:fs';
import path from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { afterEach, describe, expect, it } from 'vitest';

import { TealchartRenderer } from '../TealchartRenderer';
import { clearChartStoreCache } from '../state/chartState';
import { partitionTealScriptDrawings } from './TealScriptDrawingPartition';
import { TealScriptDrawingRenderer } from './TealScriptDrawingRenderer';

afterEach(() => {
  clearChartStoreCache();
});

const WIDTH = 400;
const HEIGHT = 300;
const SNAPSHOT_DIR = path.join(__dirname, '__visual_snapshots__');

function ensureSnapshotDir(): void {
  if (!fs.existsSync(SNAPSHOT_DIR)) {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }
}

function wrapNapiCanvas(canvas: ReturnType<typeof createCanvas>): CanvasContext {
  const ctx = canvas.getContext('2d');
  return ctx as unknown as CanvasContext;
}

function makeBars(count: number, startTime = 1_000_000, interval = 60_000, basePrice = 100): Bar[] {
  return Array.from({ length: count }, (_, i) => {
    const mid = basePrice + Math.sin(i * 0.3) * 20;
    return {
      time: startTime + i * interval,
      open: mid - 2 + Math.sin(i) * 3,
      high: mid + 5 + Math.abs(Math.sin(i * 0.7)) * 5,
      low: mid - 5 - Math.abs(Math.cos(i * 0.7)) * 5,
      close: mid + 2 + Math.cos(i) * 3,
      volume: 100 + Math.abs(Math.sin(i)) * 200,
    };
  });
}

function makeViewport(bars: Bar[]): Viewport {
  const prices = bars.flatMap((b) => [b.high, b.low]);
  return {
    startTime: bars[0]!.time,
    endTime: bars[bars.length - 1]!.time,
    priceMin: Math.min(...prices) - 5,
    priceMax: Math.max(...prices) + 5,
  };
}

function makeRenderer(canvas: ReturnType<typeof createCanvas>): TealchartRenderer {
  const ctx = wrapNapiCanvas(canvas);
  return new TealchartRenderer(ctx, {
    width: WIDTH,
    height: HEIGHT,
    showVolume: false,
    backgroundColor: '#1e222d',
  });
}

function renderToBuffer(plots: PlotOutput[], bars: Bar[], viewport: Viewport): Buffer {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const nativeCtx = canvas.getContext('2d');
  nativeCtx.fillStyle = '#1e222d';
  nativeCtx.fillRect(0, 0, WIDTH, HEIGHT);
  const renderer = makeRenderer(canvas);
  renderer.renderPlots(plots, bars, viewport);
  return canvas.toBuffer('image/png');
}

function renderDrawingsToBuffer(
  drawings: DrawingOutput[],
  bars: Bar[],
  viewport: Viewport,
): Buffer {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const nativeCtx = canvas.getContext('2d');
  nativeCtx.fillStyle = '#1e222d';
  nativeCtx.fillRect(0, 0, WIDTH, HEIGHT);
  const ctx = wrapNapiCanvas(canvas);

  const renderer = makeRenderer(canvas);
  const margins = renderer.getOptions().margins;

  const pane: ComputedPane = {
    id: 'main',
    type: 'main',
    heightRatio: 1.0,
    yMin: viewport.priceMin,
    yMax: viewport.priceMax,
    fixedRange: false,
    top: margins.top,
    height: HEIGHT - margins.top - margins.bottom,
    bottom: HEIGHT - margins.bottom,
  };

  const drawingRenderer = new TealScriptDrawingRenderer({
    ctx,
    options: renderer.getOptions(),
    margins,
    font: 'sans-serif',
    coordinateResolvers: {
      timeToX: (time, vp, cw) => {
        const ratio = (time - vp.startTime) / (vp.endTime - vp.startTime);
        return margins.left + ratio * cw;
      },
      valueToY: (value, p) => renderer.valueToY(value, p),
    },
    getTextWidth: (_c, text, _font) => text.length * 7,
  });

  const partition = partitionTealScriptDrawings(drawings);
  drawingRenderer.render(partition, bars, viewport, pane);
  return canvas.toBuffer('image/png');
}

function assertSnapshot(name: string, buffer: Buffer): void {
  ensureSnapshotDir();
  const filePath = path.join(SNAPSHOT_DIR, `${name}.png`);

  if (!fs.existsSync(filePath) || process.env['UPDATE_SNAPSHOTS']) {
    fs.writeFileSync(filePath, buffer);
    return;
  }

  const existing = fs.readFileSync(filePath);
  if (!existing.equals(buffer)) {
    const diffPath = path.join(SNAPSHOT_DIR, `${name}.diff.png`);
    fs.writeFileSync(diffPath, buffer);
    expect.fail(
      `Visual snapshot "${name}" changed. ` +
      `Compare ${filePath} (expected) with ${diffPath} (actual). ` +
      `Run with UPDATE_SNAPSHOTS=1 to accept the new baseline.`,
    );
  }
}

describe('visual snapshot rendering (extended)', () => {
  const bars = makeBars(50);
  const viewport = makeViewport(bars);

  describe('OHLC plots', () => {
    it('renders plotcandle with body and wick', () => {
      const plots: PlotOutput[] = [{
        id: 'candle1',
        type: 'plotcandle',
        title: 'Candle',
        values: bars.map(() => 1),
        openValues: bars.map((b) => b.open),
        highValues: bars.map((b) => b.high),
        lowValues: bars.map((b) => b.low),
        closeValues: bars.map((b) => b.close),
        color: bars.map((b) => b.close >= b.open ? '#26a69a' : '#ef5350'),
        wickColor: bars.map((b) => b.close >= b.open ? '#26a69a' : '#ef5350'),
        borderColor: bars.map((b) => b.close >= b.open ? '#26a69a' : '#ef5350'),
        scriptId: 'test',
      }];
      const buffer = renderToBuffer(plots, bars, viewport);
      assertSnapshot('plotcandle-basic', buffer);
    });

    it('renders plotbar (OHLC bars)', () => {
      const plots: PlotOutput[] = [{
        id: 'bar1',
        type: 'plotbar',
        title: 'Bar',
        values: bars.map(() => 1),
        openValues: bars.map((b) => b.open),
        highValues: bars.map((b) => b.high),
        lowValues: bars.map((b) => b.low),
        closeValues: bars.map((b) => b.close),
        color: bars.map((b) => b.close >= b.open ? '#26a69a' : '#ef5350'),
        scriptId: 'test',
      }];
      const buffer = renderToBuffer(plots, bars, viewport);
      assertSnapshot('plotbar-basic', buffer);
    });
  });

  describe('drawing objects', () => {
    it('renders label drawings with different styles', () => {
      const drawings: DrawingOutput[] = [
        {
          id: 'label1', type: 'label', barIndex: 10,
          x: 10, y: bars[10]!.high + 3, text: 'Buy Here',
          xloc: 'bar_index', yloc: 'price', style: 'label_down',
          color: '#26a69a', textColor: '#ffffff', size: 'normal',
        },
        {
          id: 'label2', type: 'label', barIndex: 25,
          x: 25, y: bars[25]!.low - 3, text: 'Sell',
          xloc: 'bar_index', yloc: 'price', style: 'label_up',
          color: '#ef5350', textColor: '#ffffff', size: 'normal',
        },
        {
          id: 'label3', type: 'label', barIndex: 40,
          x: 40, y: (viewport.priceMin + viewport.priceMax) / 2, text: 'Mid',
          xloc: 'bar_index', yloc: 'price', style: 'circle',
          color: '#FF9800', textColor: '#ffffff', size: 'normal',
        },
      ];
      const buffer = renderDrawingsToBuffer(drawings, bars, viewport);
      assertSnapshot('drawing-labels', buffer);
    });

    it('renders line drawings with extend', () => {
      const drawings: DrawingOutput[] = [
        {
          id: 'line1', type: 'line', barIndex: 0,
          x1: 5, y1: bars[5]!.low, x2: 20, y2: bars[20]!.high,
          xloc: 'bar_index', extend: 'right',
          color: '#2196F3', style: 'solid', width: 2,
        },
        {
          id: 'line2', type: 'line', barIndex: 0,
          x1: 10, y1: bars[10]!.high, x2: 40, y2: bars[40]!.low,
          xloc: 'bar_index', extend: 'none',
          color: '#F44336', style: 'dashed', width: 1,
        },
      ];
      const buffer = renderDrawingsToBuffer(drawings, bars, viewport);
      assertSnapshot('drawing-lines', buffer);
    });

    it('renders box drawings with border and fill', () => {
      const drawings: DrawingOutput[] = [{
        id: 'box1', type: 'box', barIndex: 0,
        left: 5, top: bars[5]!.high + 2, right: 15, bottom: bars[15]!.low - 2,
        xloc: 'bar_index', extend: 'none',
        borderColor: '#2196F3', borderWidth: 2, borderStyle: 'solid',
        bgcolor: 'rgba(33, 150, 243, 0.15)',
        text: 'Zone A', textColor: '#2196F3', textSize: 'normal',
      }];
      const buffer = renderDrawingsToBuffer(drawings, bars, viewport);
      assertSnapshot('drawing-boxes', buffer);
    });

    it('renders polyline drawings', () => {
      const drawings: DrawingOutput[] = [{
        id: 'poly1', type: 'polyline', barIndex: 0,
        points: [0, 10, 20, 30, 40].map((i) => ({
          type: 'chart.point' as const,
          time: null,
          index: i,
          price: bars[i]!.close + 5,
        })),
        curved: false, closed: false, xloc: 'bar_index',
        lineColor: '#E91E63', fillColor: null,
        lineStyle: 'solid', lineWidth: 2,
      }];
      const buffer = renderDrawingsToBuffer(drawings, bars, viewport);
      assertSnapshot('drawing-polylines', buffer);
    });

    it('renders closed filled polyline', () => {
      const drawings: DrawingOutput[] = [{
        id: 'poly_filled', type: 'polyline', barIndex: 0,
        points: [
          { type: 'chart.point', time: null, index: 10, price: viewport.priceMax - 10 },
          { type: 'chart.point', time: null, index: 25, price: viewport.priceMax - 5 },
          { type: 'chart.point', time: null, index: 40, price: viewport.priceMax - 10 },
          { type: 'chart.point', time: null, index: 35, price: viewport.priceMin + 10 },
          { type: 'chart.point', time: null, index: 15, price: viewport.priceMin + 10 },
        ],
        curved: false, closed: true, xloc: 'bar_index',
        lineColor: '#00BCD4', fillColor: 'rgba(0, 188, 212, 0.2)',
        lineStyle: 'solid', lineWidth: 2,
      }];
      const buffer = renderDrawingsToBuffer(drawings, bars, viewport);
      assertSnapshot('drawing-polyline-filled', buffer);
    });

    it('renders table drawing', () => {
      const drawings: DrawingOutput[] = [{
        id: 'table1', type: 'table', barIndex: 0,
        position: 'top_right', columns: 2, rows: 3,
        bgcolor: '#1e222d', frameColor: '#363a45', frameWidth: 1,
        borderColor: '#363a45', borderWidth: 1,
        cells: [
          { column: 0, row: 0, text: 'Metric', textColor: '#787b86', textSize: 'small', textHalign: 'left', textValign: 'center', bgcolor: '#2a2e39' },
          { column: 1, row: 0, text: 'Value', textColor: '#787b86', textSize: 'small', textHalign: 'right', textValign: 'center', bgcolor: '#2a2e39' },
          { column: 0, row: 1, text: 'RSI', textColor: '#d1d4dc', textSize: 'normal', textHalign: 'left', textValign: 'center', bgcolor: null },
          { column: 1, row: 1, text: '65.4', textColor: '#26a69a', textSize: 'normal', textHalign: 'right', textValign: 'center', bgcolor: null },
          { column: 0, row: 2, text: 'MACD', textColor: '#d1d4dc', textSize: 'normal', textHalign: 'left', textValign: 'center', bgcolor: null },
          { column: 1, row: 2, text: '-2.1', textColor: '#ef5350', textSize: 'normal', textHalign: 'right', textValign: 'center', bgcolor: null },
        ],
      }];
      const buffer = renderDrawingsToBuffer(drawings, bars, viewport);
      assertSnapshot('drawing-table', buffer);
    });

    it('renders linefill between two line drawings', () => {
      const drawings: DrawingOutput[] = [
        {
          id: 'lf_line1', type: 'line', barIndex: 0,
          x1: 5, y1: bars[5]!.high + 3, x2: 45, y2: bars[45]!.high + 3,
          xloc: 'bar_index', extend: 'none',
          color: '#26a69a', style: 'solid', width: 1,
        },
        {
          id: 'lf_line2', type: 'line', barIndex: 0,
          x1: 5, y1: bars[5]!.low - 3, x2: 45, y2: bars[45]!.low - 3,
          xloc: 'bar_index', extend: 'none',
          color: '#ef5350', style: 'solid', width: 1,
        },
        {
          id: 'lf_fill', type: 'linefill', barIndex: 0,
          line1: 'lf_line1', line2: 'lf_line2',
          color: 'rgba(33, 150, 243, 0.15)',
        },
      ];
      const buffer = renderDrawingsToBuffer(drawings, bars, viewport);
      assertSnapshot('drawing-linefill', buffer);
    });
  });

  describe('edge cases', () => {
    it('renders with all-null values (empty plot)', () => {
      const plots: PlotOutput[] = [{
        id: 'empty', type: 'plot', title: 'Empty',
        values: bars.map(() => null), color: '#2196F3',
        linewidth: 2, style: 'line', scriptId: 'test',
      }];
      const buffer = renderToBuffer(plots, bars, viewport);
      assertSnapshot('edge-all-null', buffer);
    });

    it('renders showLast limiting visible bars', () => {
      const plots: PlotOutput[] = [{
        id: 'showlast', type: 'plot', title: 'Last10',
        values: bars.map((b) => b.close), color: '#FF9800',
        linewidth: 2, style: 'line', showLast: 10, scriptId: 'test',
      }];
      const buffer = renderToBuffer(plots, bars, viewport);
      assertSnapshot('edge-show-last-10', buffer);
    });

    it('renders dashed and dotted line styles', () => {
      const plots: PlotOutput[] = [
        {
          id: 'solid_line', type: 'plot', title: 'Solid',
          values: bars.map((b) => b.high + 2), color: '#2196F3',
          linewidth: 2, style: 'line', lineStyle: 'solid', scriptId: 'test',
        },
        {
          id: 'dashed_line', type: 'plot', title: 'Dashed',
          values: bars.map((b) => (b.high + b.low) / 2), color: '#FF9800',
          linewidth: 2, style: 'line', lineStyle: 'dashed', scriptId: 'test',
        },
        {
          id: 'dotted_line', type: 'plot', title: 'Dotted',
          values: bars.map((b) => b.low - 2), color: '#4CAF50',
          linewidth: 2, style: 'line', lineStyle: 'dotted', scriptId: 'test',
        },
      ];
      const buffer = renderToBuffer(plots, bars, viewport);
      assertSnapshot('edge-line-styles', buffer);
    });

    it('renders columns plot style', () => {
      const plots: PlotOutput[] = [{
        id: 'cols1', type: 'plot', title: 'Volume-like',
        values: bars.map((b) => b.volume),
        color: bars.map((b) => b.close >= b.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'),
        style: 'columns', scriptId: 'test',
      }];
      const volViewport: Viewport = {
        startTime: viewport.startTime, endTime: viewport.endTime,
        priceMin: 0, priceMax: Math.max(...bars.map((b) => b.volume)) * 1.1,
      };
      const buffer = renderToBuffer(plots, bars, volViewport);
      assertSnapshot('columns-volume-like', buffer);
    });

    it('renders stepline_diamond plot style', () => {
      const plots: PlotOutput[] = [{
        id: 'stepdiamond', type: 'plot', title: 'StepDiamond',
        values: bars.map((b) => b.close), color: '#E91E63',
        linewidth: 2, style: 'stepline_diamond', scriptId: 'test',
      }];
      const buffer = renderToBuffer(plots, bars, viewport);
      assertSnapshot('stepline-diamond', buffer);
    });

    it('renders areabr with gaps', () => {
      const plots: PlotOutput[] = [{
        id: 'areabr1', type: 'plot', title: 'AreaBR',
        values: bars.map((b, i) => i % 8 < 5 ? b.close : null),
        color: '#9C27B080', linewidth: 2, style: 'areabr', scriptId: 'test',
      }];
      const buffer = renderToBuffer(plots, bars, viewport);
      assertSnapshot('areabr-with-gaps', buffer);
    });
  });

  describe('multi-plot composites', () => {
    it('renders Bollinger Bands composite', () => {
      const period = 20;
      const sma = bars.map((_, i) => {
        if (i < period - 1) return null;
        let sum = 0;
        for (let j = i - period + 1; j <= i; j++) sum += bars[j]!.close;
        return sum / period;
      });
      const stddev = bars.map((_, i) => {
        if (i < period - 1) return null;
        const mean = sma[i]!;
        let sumSqDiff = 0;
        for (let j = i - period + 1; j <= i; j++) {
          const diff = bars[j]!.close - mean;
          sumSqDiff += diff * diff;
        }
        return Math.sqrt(sumSqDiff / period);
      });
      const upper = sma.map((s, i) => s !== null && stddev[i] !== null ? s + 2 * stddev[i]! : null);
      const lower = sma.map((s, i) => s !== null && stddev[i] !== null ? s - 2 * stddev[i]! : null);

      const plots: PlotOutput[] = [
        { id: 'bb_upper', type: 'plot', title: 'Upper', values: upper, color: '#2196F3', linewidth: 1, style: 'line', scriptId: 'test' },
        { id: 'bb_basis', type: 'plot', title: 'Basis', values: sma, color: '#FF9800', linewidth: 1, style: 'line', scriptId: 'test' },
        { id: 'bb_lower', type: 'plot', title: 'Lower', values: lower, color: '#2196F3', linewidth: 1, style: 'line', scriptId: 'test' },
        { id: 'bb_fill', type: 'fill', title: 'BB Fill', values: bars.map(() => 1), color: 'rgba(33, 150, 243, 0.1)', plot1Id: 'bb_upper', plot2Id: 'bb_lower', scriptId: 'test' },
      ];
      const buffer = renderToBuffer(plots, bars, viewport);
      assertSnapshot('composite-bollinger', buffer);
    });

    it('renders signal markers with background highlights', () => {
      const plots: PlotOutput[] = [
        { id: 'price_line', type: 'plot', title: 'Close', values: bars.map((b) => b.close), color: '#787b86', linewidth: 1, style: 'line', scriptId: 'test' },
        {
          id: 'buy_shape', type: 'plotshape', title: 'Buy',
          values: bars.map((_, i) => i === 12 || i === 30 ? 1 : null),
          color: '#26a69a', shape: 'triangleup', location: 'belowbar',
          size: 'small', text: 'BUY', textColor: '#26a69a', scriptId: 'test',
        },
        {
          id: 'sell_shape', type: 'plotshape', title: 'Sell',
          values: bars.map((_, i) => i === 22 || i === 42 ? 1 : null),
          color: '#ef5350', shape: 'triangledown', location: 'abovebar',
          size: 'small', text: 'SELL', textColor: '#ef5350', scriptId: 'test',
        },
      ];
      const buffer = renderToBuffer(plots, bars, viewport);
      assertSnapshot('composite-signals', buffer);
    });
  });
});
