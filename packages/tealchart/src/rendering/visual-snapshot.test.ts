// @vitest-environment node
import type { PlotOutput } from '@tealstreet/tealscript';
import type { Bar, Viewport } from '../types';
import type { CanvasContext } from './CanvasContext';

import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, type Canvas } from '@napi-rs/canvas';
import { afterEach, describe, expect, it } from 'vitest';

import { TealchartRenderer } from '../TealchartRenderer';
import { clearChartStoreCache } from '../state/chartState';

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

function freshCanvas(): Canvas {
  return createCanvas(WIDTH, HEIGHT);
}

function wrapNapiCanvas(canvas: Canvas): CanvasContext {
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

function makeRenderer(canvas: Canvas): TealchartRenderer {
  const ctx = wrapNapiCanvas(canvas);
  return new TealchartRenderer(ctx, {
    width: WIDTH,
    height: HEIGHT,
    showVolume: false,
    backgroundColor: '#1e222d',
  });
}

function renderToBuffer(plots: PlotOutput[], bars: Bar[], viewport: Viewport): Buffer {
  const canvas = freshCanvas();
  const nativeCtx = canvas.getContext('2d');
  nativeCtx.fillStyle = '#1e222d';
  nativeCtx.fillRect(0, 0, WIDTH, HEIGHT);
  const renderer = makeRenderer(canvas);
  renderer.renderPlots(plots, bars, viewport);
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

describe('visual snapshot rendering', () => {
  const bars = makeBars(50);
  const viewport = makeViewport(bars);

  describe('line plots', () => {
    it('renders a basic line plot', () => {
      const plots: PlotOutput[] = [{
        id: 'line1',
        type: 'plot',
        title: 'Close',
        values: bars.map((b) => b.close),
        color: '#2196F3',
        linewidth: 2,
        style: 'line',
        scriptId: 'test',
      }];
      const buffer = renderToBuffer(plots, bars, viewport);
      expect(buffer.length).toBeGreaterThan(100);
      assertSnapshot('line-basic', buffer);
    });

    it('renders a line plot with per-bar colors', () => {
      const plots: PlotOutput[] = [{
        id: 'line_colored',
        type: 'plot',
        title: 'Colored',
        values: bars.map((b) => b.close),
        color: bars.map((b) => b.close > b.open ? '#26a69a' : '#ef5350'),
        linewidth: 2,
        style: 'line',
        scriptId: 'test',
      }];
      const buffer = renderToBuffer(plots, bars, viewport);
      assertSnapshot('line-per-bar-color', buffer);
    });

    it('renders stepline plot style', () => {
      const plots: PlotOutput[] = [{
        id: 'step1',
        type: 'plot',
        title: 'Step',
        values: bars.map((b) => b.close),
        color: '#FF9800',
        linewidth: 2,
        style: 'stepline',
        scriptId: 'test',
      }];
      const buffer = renderToBuffer(plots, bars, viewport);
      assertSnapshot('line-stepline', buffer);
    });

    it('renders cross marker plot style', () => {
      const plots: PlotOutput[] = [{
        id: 'cross1',
        type: 'plot',
        title: 'Cross',
        values: bars.map((b) => b.close),
        color: '#E91E63',
        linewidth: 2,
        style: 'cross',
        scriptId: 'test',
      }];
      const buffer = renderToBuffer(plots, bars, viewport);
      assertSnapshot('line-cross', buffer);
    });

    it('renders circles marker plot style', () => {
      const plots: PlotOutput[] = [{
        id: 'circles1',
        type: 'plot',
        title: 'Circles',
        values: bars.map((b) => b.close),
        color: '#9C27B0',
        linewidth: 2,
        style: 'circles',
        scriptId: 'test',
      }];
      const buffer = renderToBuffer(plots, bars, viewport);
      assertSnapshot('line-circles', buffer);
    });

    it('renders linebr with gaps', () => {
      const plots: PlotOutput[] = [{
        id: 'linebr1',
        type: 'plot',
        title: 'LineBR',
        values: bars.map((b, i) => i % 5 === 0 ? null : b.close),
        color: '#4CAF50',
        linewidth: 2,
        style: 'linebr',
        scriptId: 'test',
      }];
      const buffer = renderToBuffer(plots, bars, viewport);
      assertSnapshot('line-linebr-gaps', buffer);
    });
  });

  describe('histogram and area', () => {
    it('renders histogram plot style', () => {
      const plots: PlotOutput[] = [{
        id: 'hist1',
        type: 'plot',
        title: 'Histogram',
        values: bars.map((b) => b.close - b.open),
        color: bars.map((b) => b.close > b.open ? '#26a69a' : '#ef5350'),
        style: 'histogram',
        scriptId: 'test',
      }];
      const vp = { ...viewport, priceMin: -15, priceMax: 15 };
      const buffer = renderToBuffer(plots, bars, vp);
      assertSnapshot('histogram-basic', buffer);
    });

    it('renders area plot style with color alpha', () => {
      const plots: PlotOutput[] = [{
        id: 'area1',
        type: 'plot',
        title: 'Area',
        values: bars.map((b) => b.close),
        color: '#2196F380',
        linewidth: 2,
        style: 'area',
        scriptId: 'test',
      }];
      const buffer = renderToBuffer(plots, bars, viewport);
      assertSnapshot('area-with-alpha', buffer);
    });

    it('renders area plot with per-bar colors', () => {
      const plots: PlotOutput[] = [{
        id: 'area_colored',
        type: 'plot',
        title: 'ColoredArea',
        values: bars.map((b) => b.close),
        color: bars.map((b) => b.close > b.open ? '#26a69a80' : '#ef535080'),
        linewidth: 2,
        style: 'area',
        scriptId: 'test',
      }];
      const buffer = renderToBuffer(plots, bars, viewport);
      assertSnapshot('area-per-bar-color', buffer);
    });
  });

  describe('shapes and markers', () => {
    it('renders plotshape above bar', () => {
      const plots: PlotOutput[] = [{
        id: 'shape1',
        type: 'plotshape',
        title: 'Buy',
        values: bars.map((_, i) => i % 7 === 0 ? 1 : null),
        color: '#26a69a',
        shape: 'triangleup',
        location: 'belowbar',
        size: 'normal',
        scriptId: 'test',
      }];
      const buffer = renderToBuffer(plots, bars, viewport);
      assertSnapshot('plotshape-triangleup-belowbar', buffer);
    });

    it('renders plotarrow with positive and negative values', () => {
      const arrowValues = bars.map((_, i) => {
        const v = Math.sin(i * 0.4) * 5;
        return Math.abs(v) > 1 ? v : null;
      });
      const plots: PlotOutput[] = [{
        id: 'arrow1',
        type: 'plotarrow',
        title: 'Arrow',
        values: arrowValues,
        color: arrowValues.map((v) => v !== null && v > 0 ? '#26a69a' : '#ef5350'),
        scriptId: 'test',
      }];
      const buffer = renderToBuffer(plots, bars, viewport);
      assertSnapshot('plotarrow-mixed', buffer);
    });

    it('renders plotchar with custom character', () => {
      const plots: PlotOutput[] = [{
        id: 'char1',
        type: 'plotchar',
        title: 'Char',
        values: bars.map((_, i) => i % 5 === 0 ? 1 : null),
        color: '#FF9800',
        char: '★',
        location: 'abovebar',
        size: 'normal',
        scriptId: 'test',
      }];
      const buffer = renderToBuffer(plots, bars, viewport);
      assertSnapshot('plotchar-star', buffer);
    });

    it('renders all shape types', () => {
      const shapes = ['circle', 'square', 'diamond', 'triangleup', 'triangledown', 'cross', 'xcross', 'flag', 'labelup', 'labeldown', 'arrowup', 'arrowdown'];
      const midPrice = (viewport.priceMin + viewport.priceMax) / 2;
      const plots: PlotOutput[] = shapes.map((shape, si) => ({
        id: `shape_${shape}`,
        type: 'plotshape' as const,
        title: shape,
        values: bars.map((_, i) => i === si * 4 + 2 ? midPrice : null),
        color: '#2196F3',
        shape,
        location: 'absolute' as const,
        size: 'large' as const,
        scriptId: 'test',
      }));
      const buffer = renderToBuffer(plots, bars, viewport);
      assertSnapshot('plotshape-all-types', buffer);
    });
  });

  describe('hline and bgcolor', () => {
    it('renders horizontal line', () => {
      const plots: PlotOutput[] = [{
        id: 'hline1',
        type: 'hline',
        title: 'Overbought',
        values: [],
        color: '#F44336',
        price: 110,
        linewidth: 1,
        lineStyle: 'dashed',
        scriptId: 'test',
      }];
      const buffer = renderToBuffer(plots, bars, viewport);
      assertSnapshot('hline-dashed', buffer);
    });

    it('renders bgcolor highlights', () => {
      const plots: PlotOutput[] = [{
        id: 'bg1',
        type: 'bgcolor',
        title: 'BG',
        values: bars.map((b) => b.close > b.open ? 1 : null),
        color: bars.map((b) => b.close > b.open ? 'rgba(38, 166, 154, 0.2)' : null),
        scriptId: 'test',
      }];
      const buffer = renderToBuffer(plots, bars, viewport);
      assertSnapshot('bgcolor-conditional', buffer);
    });
  });

  describe('fill between plots', () => {
    it('renders fill between two line plots', () => {
      const plots: PlotOutput[] = [
        {
          id: 'upper',
          type: 'plot',
          title: 'Upper',
          values: bars.map((b) => b.high),
          color: '#26a69a',
          linewidth: 1,
          style: 'line',
          scriptId: 'test',
        },
        {
          id: 'lower',
          type: 'plot',
          title: 'Lower',
          values: bars.map((b) => b.low),
          color: '#ef5350',
          linewidth: 1,
          style: 'line',
          scriptId: 'test',
        },
        {
          id: 'fill1',
          type: 'fill',
          title: 'Band',
          values: bars.map(() => 1),
          color: 'rgba(33, 150, 243, 0.2)',
          plot1Id: 'upper',
          plot2Id: 'lower',
          scriptId: 'test',
        },
      ];
      const buffer = renderToBuffer(plots, bars, viewport);
      assertSnapshot('fill-between-plots', buffer);
    });

    it('renders fill between crossing plots', () => {
      const sma10 = bars.map((_, i) => {
        if (i < 10) return null;
        let sum = 0;
        for (let j = i - 9; j <= i; j++) sum += bars[j]!.close;
        return sum / 10;
      });
      const sma20 = bars.map((_, i) => {
        if (i < 20) return null;
        let sum = 0;
        for (let j = i - 19; j <= i; j++) sum += bars[j]!.close;
        return sum / 20;
      });
      const plots: PlotOutput[] = [
        {
          id: 'sma10',
          type: 'plot',
          title: 'SMA10',
          values: sma10,
          color: '#2196F3',
          linewidth: 2,
          style: 'line',
          scriptId: 'test',
        },
        {
          id: 'sma20',
          type: 'plot',
          title: 'SMA20',
          values: sma20,
          color: '#FF9800',
          linewidth: 2,
          style: 'line',
          scriptId: 'test',
        },
        {
          id: 'fill_cross',
          type: 'fill',
          title: 'Cross Fill',
          values: bars.map(() => 1),
          color: bars.map((_, i) => {
            const v10 = sma10[i];
            const v20 = sma20[i];
            if (v10 === null || v20 === null) return null;
            return v10 > v20 ? 'rgba(38, 166, 154, 0.3)' : 'rgba(239, 83, 80, 0.3)';
          }),
          plot1Id: 'sma10',
          plot2Id: 'sma20',
          scriptId: 'test',
        },
      ];
      const buffer = renderToBuffer(plots, bars, viewport);
      assertSnapshot('fill-crossing-smas', buffer);
    });
  });

  describe('composite indicator', () => {
    it('renders RSI-like indicator with hlines and fill', () => {
      const rsiValues = bars.map((_, i) => 30 + Math.sin(i * 0.2) * 25 + Math.cos(i * 0.5) * 10);
      const overbought = 70;
      const oversold = 30;

      const plots: PlotOutput[] = [
        {
          id: 'rsi',
          type: 'plot',
          title: 'RSI',
          values: rsiValues,
          color: '#7B1FA2',
          linewidth: 2,
          style: 'line',
          scriptId: 'test',
        },
        {
          id: 'hline_ob',
          type: 'hline',
          title: 'OB',
          values: [],
          color: '#78909C',
          price: overbought,
          lineStyle: 'dashed',
          scriptId: 'test',
        },
        {
          id: 'hline_os',
          type: 'hline',
          title: 'OS',
          values: [],
          color: '#78909C',
          price: oversold,
          lineStyle: 'dashed',
          scriptId: 'test',
        },
        {
          id: 'fill_rsi',
          type: 'fill',
          title: 'RSI Band',
          values: bars.map(() => 1),
          color: 'rgba(120, 144, 156, 0.1)',
          plot1Id: 'hline_ob',
          plot2Id: 'hline_os',
          scriptId: 'test',
        },
        {
          id: 'bg_ob',
          type: 'bgcolor',
          title: 'OB BG',
          values: rsiValues.map((v) => v > overbought ? 1 : null),
          color: rsiValues.map((v) => v > overbought ? 'rgba(239, 83, 80, 0.15)' : null),
          scriptId: 'test',
        },
        {
          id: 'bg_os',
          type: 'bgcolor',
          title: 'OS BG',
          values: rsiValues.map((v) => v < oversold ? 1 : null),
          color: rsiValues.map((v) => v < oversold ? 'rgba(38, 166, 154, 0.15)' : null),
          scriptId: 'test',
        },
      ];

      const rsiViewport: Viewport = {
        startTime: viewport.startTime,
        endTime: viewport.endTime,
        priceMin: 0,
        priceMax: 100,
      };

      const buffer = renderToBuffer(plots, bars, rsiViewport);
      assertSnapshot('composite-rsi', buffer);
    });

    it('renders MACD-like indicator with histogram and signal lines', () => {
      const macdLine = bars.map((_, i) => Math.sin(i * 0.15) * 5);
      const signalLine = bars.map((_, i) => Math.sin(i * 0.15 - 0.5) * 4);
      const histogram = macdLine.map((m, i) => m - signalLine[i]!);

      const plots: PlotOutput[] = [
        {
          id: 'hist',
          type: 'plot',
          title: 'Histogram',
          values: histogram,
          color: histogram.map((h) => h! >= 0 ? '#26a69a' : '#ef5350'),
          style: 'histogram',
          scriptId: 'test',
        },
        {
          id: 'macd',
          type: 'plot',
          title: 'MACD',
          values: macdLine,
          color: '#2196F3',
          linewidth: 2,
          style: 'line',
          scriptId: 'test',
        },
        {
          id: 'signal',
          type: 'plot',
          title: 'Signal',
          values: signalLine,
          color: '#FF9800',
          linewidth: 1,
          style: 'line',
          scriptId: 'test',
        },
      ];

      const macdViewport: Viewport = {
        startTime: viewport.startTime,
        endTime: viewport.endTime,
        priceMin: -8,
        priceMax: 8,
      };

      const buffer = renderToBuffer(plots, bars, macdViewport);
      assertSnapshot('composite-macd', buffer);
    });
  });
});
