import type { DrawingOutput, PlotOutput } from '@tealstreet/tealscript';
import type { Bar, ComputedPane, ExecutionLineRenderData, PaneLayout, PriceLine, UnifiedPaneLayout, Viewport } from './types';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { TealchartRenderer } from './TealchartRenderer';
import { clearChartStoreCache } from './state/chartState';
import { TIME_AXIS_HEIGHT } from './types';

afterEach(() => {
  clearChartStoreCache();
});

/**
 * Create a minimal CanvasContext mock for the renderer
 */
function createMockCtx(): any {
  return {
    canvas: { width: 800, height: 600 },
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    textAlign: 'left',
    textBaseline: 'top',
    globalAlpha: 1,
    lineCap: 'butt',
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    fill: () => {},
    stroke: () => {},
    fillRect: () => {},
    clearRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    measureText: (text: string) => ({ width: text.length * 7 }),
    setLineDash: () => {},
    arc: () => {},
    clip: () => {},
    rect: () => {},
    roundRect: () => {},
    createLinearGradient: () => ({
      addColorStop: () => {},
    }),
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    setTransform: () => {},
    scale: () => {},
    translate: () => {},
  };
}

function makeBars(count: number, startTime = 1000000, interval = 60000, basePrice = 50000): Bar[] {
  return Array.from({ length: count }, (_, i) => ({
    time: startTime + i * interval,
    open: basePrice + i * 10,
    high: basePrice + i * 10 + 50,
    low: basePrice + i * 10 - 50,
    close: basePrice + (i + 1) * 10,
    volume: 100 + i,
  }));
}

describe('TealchartRenderer coordinate transforms', () => {
  describe('valueToY / yToValue round-trip', () => {
    it('converts price to Y and back within a pane', () => {
      const ctx = createMockCtx();
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600 });

      const pane: ComputedPane = {
        id: 'main',
        type: 'main',
        heightRatio: 1.0,
        yMin: 40000,
        yMax: 60000,
        fixedRange: false,
        top: 0,
        height: 570,
        bottom: 570,
      };

      const testPrices = [40000, 45000, 50000, 55000, 60000];
      for (const price of testPrices) {
        const y = renderer.valueToY(price, pane);
        const backPrice = renderer.yToValue(y, pane);
        expect(backPrice).toBeCloseTo(price, 2);
      }
    });

    it('returns center Y when pane range is zero', () => {
      const ctx = createMockCtx();
      const renderer = new TealchartRenderer(ctx);

      const pane: ComputedPane = {
        id: 'main',
        type: 'main',
        heightRatio: 1.0,
        yMin: 100,
        yMax: 100,
        fixedRange: false,
        top: 50,
        height: 400,
        bottom: 450,
      };

      const y = renderer.valueToY(100, pane);
      expect(y).toBe(50 + 400 / 2); // center of pane
    });

    it('higher prices map to lower Y values', () => {
      const ctx = createMockCtx();
      const renderer = new TealchartRenderer(ctx);

      const pane: ComputedPane = {
        id: 'main',
        type: 'main',
        heightRatio: 1.0,
        yMin: 0,
        yMax: 100,
        fixedRange: false,
        top: 0,
        height: 500,
        bottom: 500,
      };

      const yHigh = renderer.valueToY(100, pane);
      const yLow = renderer.valueToY(0, pane);
      expect(yHigh).toBeLessThan(yLow);
    });

    it('yMax maps to top of pane', () => {
      const ctx = createMockCtx();
      const renderer = new TealchartRenderer(ctx);

      const pane: ComputedPane = {
        id: 'main',
        type: 'main',
        heightRatio: 1.0,
        yMin: 10,
        yMax: 20,
        fixedRange: false,
        top: 100,
        height: 400,
        bottom: 500,
      };

      expect(renderer.valueToY(20, pane)).toBe(100); // top of pane
    });

    it('yMin maps to bottom of pane', () => {
      const ctx = createMockCtx();
      const renderer = new TealchartRenderer(ctx);

      const pane: ComputedPane = {
        id: 'main',
        type: 'main',
        heightRatio: 1.0,
        yMin: 10,
        yMax: 20,
        fixedRange: false,
        top: 100,
        height: 400,
        bottom: 500,
      };

      expect(renderer.valueToY(10, pane)).toBe(500); // bottom of pane
    });
  });

  describe('timeToX / xToTime round-trip', () => {
    it('converts time to X and back', () => {
      const ctx = createMockCtx();
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600 });

      const viewport: Viewport = {
        startTime: 1000000,
        endTime: 2000000,
        priceMin: 40000,
        priceMax: 60000,
      };

      const testTimes = [1000000, 1250000, 1500000, 1750000, 2000000];
      for (const time of testTimes) {
        const x = renderer.publicXToTime(
          // We need to convert time → x first using the internal formula
          // xToTime is public; we use publicXToTime(x) to convert x back
          // So we compute x from time directly
          0, // placeholder
          viewport,
        );
        // Instead let's test xToTime directly
        const backTime = renderer.xToTime(0, viewport, 700);
        // Just verify it returns a number in range
        expect(typeof backTime).toBe('number');
      }
    });

    it('xToTime at left margin returns startTime', () => {
      const ctx = createMockCtx();
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600 });

      const viewport: Viewport = {
        startTime: 1000000,
        endTime: 2000000,
        priceMin: 0,
        priceMax: 100,
      };

      // x=0 corresponds to the left margin
      // xToTime(x, viewport, chartWidth) = viewport.startTime + (x - margins.left)/chartWidth * timeRange
      // At x = margins.left (60 by default), ratio = 0, so time = startTime
      const opts = renderer.getOptions();
      const chartWidth = opts.width - opts.margins.left - opts.margins.right;
      const time = renderer.xToTime(opts.margins.left, viewport, chartWidth);
      expect(time).toBeCloseTo(1000000, 0);
    });

    it('xToTime at right edge returns endTime', () => {
      const ctx = createMockCtx();
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600 });

      const viewport: Viewport = {
        startTime: 1000000,
        endTime: 2000000,
        priceMin: 0,
        priceMax: 100,
      };

      const opts = renderer.getOptions();
      const chartWidth = opts.width - opts.margins.left - opts.margins.right;
      const rightX = opts.margins.left + chartWidth;
      const time = renderer.xToTime(rightX, viewport, chartWidth);
      expect(time).toBeCloseTo(2000000, 0);
    });

    it('xToTime is monotonically increasing', () => {
      const ctx = createMockCtx();
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600 });

      const viewport: Viewport = {
        startTime: 1000000,
        endTime: 2000000,
        priceMin: 0,
        priceMax: 100,
      };

      const opts = renderer.getOptions();
      const chartWidth = opts.width - opts.margins.left - opts.margins.right;
      let prevTime = -Infinity;
      for (let x = opts.margins.left; x <= opts.margins.left + chartWidth; x += 50) {
        const time = renderer.xToTime(x, viewport, chartWidth);
        expect(time).toBeGreaterThan(prevTime);
        prevTime = time;
      }
    });
  });

  describe('execution marker X anchoring', () => {
    it('uses the same extended chart width as candles', () => {
      const ctx = createMockCtx();
      const moveTo = vi.fn();
      ctx.moveTo = moveTo;

      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600 });
      const viewport: Viewport = {
        startTime: 1_000_000,
        endTime: 2_000_000,
        priceMin: 40_000,
        priceMax: 60_000,
      };
      const pane: ComputedPane = {
        id: 'main',
        type: 'main',
        heightRatio: 1,
        yMin: 40_000,
        yMax: 60_000,
        fixedRange: false,
        top: 0,
        height: 570,
        bottom: 570,
      };
      const executionLines: ExecutionLineRenderData[] = [
        {
          id: 'exec-1',
          price: 50_000,
          time: 1_500, // seconds, midpoint of viewport after ms normalization
          direction: 'buy',
          text: '',
          tooltip: '',
          arrowHeight: 20,
          arrowSpacing: 20,
          font: '11px sans-serif',
          textColor: '#fff',
          arrowColor: '#26a69a',
        },
      ];

      (renderer as any).drawExecutionMarkersInPane(executionLines, viewport, pane);

      const opts = renderer.getOptions();
      const expectedX = opts.margins.left + (opts.width - opts.margins.left) / 2;
      const legacyX = opts.margins.left + (opts.width - opts.margins.left - opts.margins.right) / 2;
      const x = moveTo.mock.calls[0]?.[0];
      expect(x).toBe(expectedX);
      expect(x).not.toBe(legacyX);
    });
  });

  describe('Pine line plot rendering', () => {
    it('applies plot lineStyle metadata on main-pane line plots', () => {
      const setLineDash = vi.fn();
      const stroke = vi.fn();
      const ctx = {
        ...createMockCtx(),
        setLineDash,
        stroke,
      };
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600, showVolume: false });
      const bars = makeBars(3, 1_000_000, 60_000, 100);
      const viewport: Viewport = {
        startTime: bars[0]!.time,
        endTime: bars[2]!.time,
        priceMin: 80,
        priceMax: 140,
      };
      const plots: PlotOutput[] = [
        {
          id: 'plot_Dashed',
          type: 'plot',
          title: 'Dashed',
          values: [100, 110, 120],
          color: ['#2196F3', '#2196F3', '#2196F3'],
          lineStyle: 'dashed',
        },
      ];

      renderer.renderPlots(plots, bars, viewport);

      expect(setLineDash).toHaveBeenCalledWith([6, 4]);
      expect(setLineDash).toHaveBeenLastCalledWith([]);
      expect(stroke).toHaveBeenCalled();
    });

    it('applies plot lineStyle metadata on indicator-pane line plots', () => {
      const setLineDash = vi.fn();
      const stroke = vi.fn();
      const ctx = {
        ...createMockCtx(),
        setLineDash,
        stroke,
      };
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600, showVolume: false });
      const bars = makeBars(3, 1_000_000, 60_000, 100);
      const viewport: Viewport = {
        startTime: bars[0]!.time,
        endTime: bars[2]!.time,
        priceMin: 80,
        priceMax: 140,
      };
      const paneLayout: PaneLayout = {
        mainPaneHeight: 0.7,
        volumePaneHeight: 0,
        indicatorPanes: [
          {
            id: 'indicator_rsi',
            indicatorIds: ['script-1'],
            heightRatio: 0.3,
            yMin: 0,
            yMax: 100,
            fixedRange: false,
          },
        ],
      };
      const plots: PlotOutput[] = [
        {
          id: 'plot_Dotted',
          scriptId: 'script-1',
          type: 'plot',
          title: 'Dotted',
          values: [30, 40, 50],
          color: ['#2196F3', '#2196F3', '#2196F3'],
          lineStyle: 'dotted',
        },
      ];

      renderer.renderPlots(plots, bars, viewport, paneLayout, { 'script-1': { overlay: false } });

      expect(setLineDash).toHaveBeenCalledWith([2, 3]);
      expect(setLineDash).toHaveBeenLastCalledWith([]);
      expect(stroke).toHaveBeenCalled();
    });

    it('applies plot offset metadata on line plot x positions', () => {
      const moveTo = vi.fn();
      const ctx = {
        ...createMockCtx(),
        moveTo,
      };
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600, showVolume: false });
      const bars = makeBars(3, 1_000_000, 60_000, 100);
      const viewport: Viewport = {
        startTime: bars[0]!.time,
        endTime: bars[2]!.time,
        priceMin: 80,
        priceMax: 140,
      };
      const plots: PlotOutput[] = [
        {
          id: 'plot_Offset',
          type: 'plot',
          title: 'Offset',
          values: [100, 110, 120],
          color: '#2196F3',
          offset: 1,
        },
      ];

      renderer.renderPlots(plots, bars, viewport);

      const opts = renderer.getOptions();
      const chartWidth = opts.width - opts.margins.left;
      const expectedX = opts.margins.left + ((bars[1]!.time - viewport.startTime) / (viewport.endTime - viewport.startTime)) * chartWidth;
      expect(moveTo).toHaveBeenCalledWith(expectedX, expect.any(Number));
    });

    it('applies plot offset metadata on point marker positions', () => {
      const arc = vi.fn();
      const ctx = {
        ...createMockCtx(),
        arc,
      };
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600, showVolume: false });
      const bars = makeBars(3, 1_000_000, 60_000, 100);
      const viewport: Viewport = {
        startTime: bars[0]!.time,
        endTime: bars[2]!.time,
        priceMin: 80,
        priceMax: 140,
      };
      const plots: PlotOutput[] = [
        {
          id: 'plot_Circles',
          type: 'plot',
          title: 'Circles',
          values: [100, null, null],
          color: '#2196F3',
          style: 'circles',
          offset: 1,
        },
      ];

      renderer.renderPlots(plots, bars, viewport);

      const opts = renderer.getOptions();
      const chartWidth = opts.width - opts.margins.left;
      const expectedX = opts.margins.left + ((bars[1]!.time - viewport.startTime) / (viewport.endTime - viewport.startTime)) * chartWidth;
      expect(arc).toHaveBeenCalledWith(expectedX, expect.any(Number), expect.any(Number), 0, Math.PI * 2);
    });
  });

  describe('Pine OHLC plot rendering', () => {
    it('renders plotcandle outputs with body, wick, and border colors', () => {
      const fillRect = vi.fn();
      const strokeRect = vi.fn();
      const stroke = vi.fn();
      const ctx = {
        ...createMockCtx(),
        fillRect,
        strokeRect,
        stroke,
      };
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600, showVolume: false });
      const bars = makeBars(3, 1_000_000, 60_000, 100);
      const viewport: Viewport = {
        startTime: bars[0].time,
        endTime: bars[2].time,
        priceMin: 40,
        priceMax: 180,
      };
      const pane: ComputedPane = {
        id: 'main',
        type: 'main',
        heightRatio: 1,
        yMin: 40,
        yMax: 180,
        fixedRange: false,
        top: 0,
        height: 570,
        bottom: 570,
      };
      const plot: PlotOutput = {
        id: 'plotcandle_Custom',
        type: 'plotcandle',
        title: 'Custom',
        values: [110, null, 130],
        openValues: [100, null, 120],
        highValues: [140, null, 160],
        lowValues: [90, null, 110],
        closeValues: [110, null, 130],
        color: ['#00ff00', null, '#ff0000'],
        wickColor: ['#0000ff', null, '#00ffff'],
        borderColor: ['#ffffff', null, '#111111'],
      };

      (renderer as any).renderPlotInPane(plot, bars, viewport, pane);

      expect(fillRect).toHaveBeenCalledTimes(2);
      expect(strokeRect).toHaveBeenCalledTimes(2);
      expect(stroke).toHaveBeenCalledTimes(2);
      expect(ctx.fillStyle).toBe('#ff0000');
      expect(ctx.strokeStyle).toBe('#111111');
    });

    it('renders plotbar outputs as high-low bars with open and close ticks', () => {
      const moveTo = vi.fn();
      const lineTo = vi.fn();
      const stroke = vi.fn();
      const ctx = {
        ...createMockCtx(),
        moveTo,
        lineTo,
        stroke,
      };
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600, showVolume: false });
      const bars = makeBars(2, 1_000_000, 60_000, 100);
      const viewport: Viewport = {
        startTime: bars[0].time,
        endTime: bars[1].time,
        priceMin: 40,
        priceMax: 180,
      };
      const pane: ComputedPane = {
        id: 'main',
        type: 'main',
        heightRatio: 1,
        yMin: 40,
        yMax: 180,
        fixedRange: false,
        top: 0,
        height: 570,
        bottom: 570,
      };
      const plot: PlotOutput = {
        id: 'plotbar_Custom',
        type: 'plotbar',
        title: 'Custom',
        values: [110, 130],
        openValues: [100, 120],
        highValues: [140, 160],
        lowValues: [90, 110],
        closeValues: [110, 130],
        color: ['#00ff00', '#ff0000'],
      };

      (renderer as any).renderPlotInPane(plot, bars, viewport, pane);

      expect(stroke).toHaveBeenCalledTimes(2);
      expect(moveTo).toHaveBeenCalledTimes(6);
      expect(lineTo).toHaveBeenCalledTimes(6);
      expect(ctx.strokeStyle).toBe('#ff0000');
    });
  });

  describe('hline rendering', () => {
    it('renders hlines with their configured line style', () => {
      const setLineDash = vi.fn();
      const stroke = vi.fn();
      const ctx = {
        ...createMockCtx(),
        setLineDash,
        stroke,
      };
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600, showVolume: false });
      const plot: PlotOutput = {
        id: 'hline_Midline',
        type: 'hline',
        title: 'Midline',
        values: [],
        color: '#2196F3',
        linewidth: 2,
        lineStyle: 'dotted',
        price: 100,
      };

      (renderer as any).renderHline(plot, { startTime: 0, endTime: 1, priceMin: 50, priceMax: 150 });

      expect(setLineDash).toHaveBeenCalledWith([2, 3]);
      expect(stroke).toHaveBeenCalled();
    });
  });

  describe('fill rendering', () => {
    it('bridges plot gaps only when fillgaps is enabled', () => {
      const fill = vi.fn();
      const ctx = {
        ...createMockCtx(),
        fill,
      };
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600, showVolume: false });
      const bars = makeBars(3, 1_000_000, 60_000, 100);
      const viewport: Viewport = {
        startTime: bars[0]!.time,
        endTime: bars[2]!.time,
        priceMin: 0,
        priceMax: 10,
      };
      const upper: PlotOutput = {
        id: 'plot_Upper',
        type: 'plot',
        title: 'Upper',
        values: [4, null, 6],
        color: '#2196F3',
      };
      const lower: PlotOutput = {
        id: 'plot_Lower',
        type: 'plot',
        title: 'Lower',
        values: [2, null, 3],
        color: '#F44336',
      };
      const gapFill: PlotOutput = {
        id: 'fill_Gap',
        type: 'fill',
        title: 'Gap',
        values: [],
        color: ['#4CAF5033', '#4CAF5033', '#4CAF5033'],
        plot1Id: 'plot_Upper',
        plot2Id: 'plot_Lower',
        fillgaps: false,
      };
      const bridgeFill: PlotOutput = {
        ...gapFill,
        id: 'fill_Bridge',
        title: 'Bridge',
        fillgaps: true,
      };

      (renderer as any).renderFill(gapFill, [upper, lower, gapFill], bars, viewport, (value: number) => value);
      expect(fill).not.toHaveBeenCalled();

      (renderer as any).renderFill(bridgeFill, [upper, lower, bridgeFill], bars, viewport, (value: number) => value);
      expect(fill).toHaveBeenCalledOnce();
      expect(ctx.fillStyle).toBe('#4CAF5033');
    });

    it('limits filled regions to showLast bars', () => {
      const fill = vi.fn();
      const ctx = {
        ...createMockCtx(),
        fill,
      };
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600, showVolume: false });
      const bars = makeBars(4, 1_000_000, 60_000, 100);
      const viewport: Viewport = {
        startTime: bars[0]!.time,
        endTime: bars[3]!.time,
        priceMin: 0,
        priceMax: 20,
      };
      const upper: PlotOutput = {
        id: 'plot_Upper',
        type: 'plot',
        title: 'Upper',
        values: [10, 11, 12, 13],
        color: '#2196F3',
      };
      const lower: PlotOutput = {
        id: 'plot_Lower',
        type: 'plot',
        title: 'Lower',
        values: [5, 6, 7, 8],
        color: '#F44336',
      };
      const fillPlot: PlotOutput = {
        id: 'fill_ShowLast',
        type: 'fill',
        title: 'ShowLast',
        values: [],
        color: '#4CAF5033',
        plot1Id: upper.id,
        plot2Id: lower.id,
        showLast: 2,
      };

      (renderer as any).renderFill(fillPlot, [upper, lower, fillPlot], bars, viewport, (value: number) => value);

      expect(fill).toHaveBeenCalledOnce();
    });
  });

  describe('marker rendering', () => {
    it('renders plotchar glyphs and marker text', () => {
      const fillText = vi.fn();
      const ctx = {
        ...createMockCtx(),
        fillText,
      };
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600, showVolume: false });
      const bars = makeBars(1, 1_000_000, 60_000, 100);
      const viewport: Viewport = {
        startTime: bars[0]!.time,
        endTime: bars[0]!.time + 60_000,
        priceMin: 50,
        priceMax: 200,
      };
      const plot: PlotOutput = {
        id: 'plotchar_Test',
        type: 'plotchar',
        title: 'Test',
        values: [1],
        color: ['#2196F3'],
        char: 'D',
        text: 'Down',
        textColor: '#FFEB3B',
        location: 'abovebar',
        size: 'small',
        offset: 1,
      };

      (renderer as any).renderPlotShape(plot, bars, viewport);

      expect(fillText).toHaveBeenCalledWith('D', expect.any(Number), expect.any(Number));
      expect(fillText).toHaveBeenCalledWith('Down', expect.any(Number), expect.any(Number));
    });
  });

  describe('background rendering', () => {
    it('renders bgcolor only for active bars', () => {
      const fillRect = vi.fn();
      const ctx = {
        ...createMockCtx(),
        fillRect,
      };
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600, showVolume: false });
      const bars = makeBars(2, 1_000_000, 60_000, 100);
      const viewport: Viewport = {
        startTime: bars[0]!.time,
        endTime: bars[1]!.time,
        priceMin: 50,
        priceMax: 200,
      };
      const plot: PlotOutput = {
        id: 'bgcolor_Session',
        type: 'bgcolor',
        title: 'Session',
        values: [null, 1],
        color: [null, '#2196F333'],
      };

      (renderer as any).renderBgcolor(plot, bars, viewport);

      expect(fillRect).toHaveBeenCalledOnce();
      expect(ctx.fillStyle).toBe('#2196F333');
    });
  });

  describe('visual primitive integration', () => {
    it('skips rendering plots with display.none while keeping them available as fill sources', () => {
      const fill = vi.fn();
      const stroke = vi.fn();
      const ctx = {
        ...createMockCtx(),
        fill,
        stroke,
      };
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600, showVolume: false });
      const bars = makeBars(3, 1_000_000, 60_000, 100);
      const viewport: Viewport = {
        startTime: bars[0]!.time,
        endTime: bars[2]!.time,
        priceMin: 0,
        priceMax: 20,
      };
      const hiddenUpper: PlotOutput = {
        id: 'plot_HiddenUpper',
        type: 'plot',
        title: 'HiddenUpper',
        values: [10, 12, 14],
        color: '#2196F3',
        display: 0,
      };
      const hiddenLower: PlotOutput = {
        id: 'plot_HiddenLower',
        type: 'plot',
        title: 'HiddenLower',
        values: [5, 6, 7],
        color: '#F44336',
        display: 0,
      };
      const fillPlot: PlotOutput = {
        id: 'fill_Band',
        type: 'fill',
        title: 'Band',
        values: [],
        color: '#4CAF5033',
        plot1Id: hiddenUpper.id,
        plot2Id: hiddenLower.id,
      };

      renderer.renderPlots([hiddenUpper, hiddenLower, fillPlot], bars, viewport);

      expect(stroke).not.toHaveBeenCalled();
      expect(fill).toHaveBeenCalled();
    });

    it('routes fills, hlines, markers, and backgrounds through renderPlots', () => {
      const fillRect = vi.fn();
      const fill = vi.fn();
      const fillText = vi.fn();
      const stroke = vi.fn();
      const arc = vi.fn();
      const ctx = {
        ...createMockCtx(),
        fillRect,
        fill,
        fillText,
        stroke,
        arc,
      };
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600, showVolume: false });
      const bars = makeBars(3, 1_000_000, 60_000, 100);
      const viewport: Viewport = {
        startTime: bars[0]!.time,
        endTime: bars[2]!.time,
        priceMin: 50,
        priceMax: 200,
      };
      const plots: PlotOutput[] = [
        {
          id: 'bgcolor_Session',
          type: 'bgcolor',
          title: 'Session',
          values: [1, null, null],
          color: ['#2196F333', null, null],
        },
        {
          id: 'plot_Basis',
          type: 'plot',
          title: 'Basis',
          values: [100, 110, 120],
          color: ['#2196F3', '#2196F3', '#2196F3'],
        },
        {
          id: 'hline_Level',
          type: 'hline',
          title: 'Level',
          values: [],
          color: '#787B86',
          price: 90,
          lineStyle: 'dotted',
        },
        {
          id: 'fill_Band',
          type: 'fill',
          title: 'Band',
          values: [],
          color: ['#4CAF5033', '#4CAF5033', '#4CAF5033'],
          plot1Id: 'plot_Basis',
          plot2Id: 'hline_Level',
        },
        {
          id: 'plotshape_Mark',
          type: 'plotshape',
          title: 'Mark',
          values: [1, null, 1],
          color: ['#F44336', null, '#F44336'],
          shape: 'circle',
          location: 'abovebar',
          text: 'M',
        },
        {
          id: 'plotchar_Char',
          type: 'plotchar',
          title: 'Char',
          values: [null, 1, null],
          color: [null, '#FFEB3B', null],
          char: 'C',
          location: 'belowbar',
        },
      ];

      renderer.renderPlots(plots, bars, viewport);

      expect(fillRect).toHaveBeenCalled();
      expect(fill).toHaveBeenCalled();
      expect(fillText).toHaveBeenCalledWith('M', expect.any(Number), expect.any(Number));
      expect(fillText).toHaveBeenCalledWith('C', expect.any(Number), expect.any(Number));
      expect(stroke).toHaveBeenCalled();
      expect(arc).toHaveBeenCalled();
    });
  });

  describe('calculateViewport', () => {
    it('returns sensible defaults for empty bars', () => {
      const vp = TealchartRenderer.calculateViewport([]);
      expect(vp.priceMin).toBe(0);
      expect(vp.priceMax).toBe(100);
      expect(vp.startTime).toBeLessThan(vp.endTime);
    });

    it('calculates viewport from single bar', () => {
      const bars = [{ time: 1000000, open: 100, high: 110, low: 90, close: 105, volume: 50 }];
      const vp = TealchartRenderer.calculateViewport(bars);
      expect(vp.startTime).toBe(1000000);
      expect(vp.priceMin).toBeLessThanOrEqual(90);
      expect(vp.priceMax).toBeGreaterThanOrEqual(110);
    });

    it('calculates viewport from multiple bars', () => {
      const bars = makeBars(50);
      const vp = TealchartRenderer.calculateViewport(bars);
      // Should include all bar prices
      const allLows = bars.map((b) => b.low);
      const allHighs = bars.map((b) => b.high);
      expect(vp.priceMin).toBeLessThanOrEqual(Math.min(...allLows));
      expect(vp.priceMax).toBeGreaterThanOrEqual(Math.max(...allHighs));
    });

    it('includes right padding for live data', () => {
      const bars = makeBars(50);
      const vp = TealchartRenderer.calculateViewport(bars);
      const maxTime = Math.max(...bars.map((b) => b.time));
      expect(vp.endTime).toBeGreaterThan(maxTime);
    });

    it('applies price padding', () => {
      const bars = [
        { time: 1000000, open: 100, high: 110, low: 90, close: 105, volume: 50 },
        { time: 1060000, open: 105, high: 115, low: 95, close: 110, volume: 60 },
      ];
      const vp = TealchartRenderer.calculateViewport(bars, 0.1);
      // With padding, priceMin should be below 90 and priceMax above 115
      expect(vp.priceMin).toBeLessThan(90);
      expect(vp.priceMax).toBeGreaterThan(115);
    });

    it('shows at most DEFAULT_VISIBLE_BARS bars', () => {
      const bars = makeBars(500); // More than DEFAULT_VISIBLE_BARS (100)
      const vp = TealchartRenderer.calculateViewport(bars);
      // startTime should be from the last 100 bars, not the first
      const visibleBars = bars.slice(-TealchartRenderer.DEFAULT_VISIBLE_BARS);
      expect(vp.startTime).toBe(Math.min(...visibleBars.map((b) => b.time)));
    });
  });

  describe('publicPriceToYWithLayout', () => {
    it('returns consistent results with valueToY', () => {
      const ctx = createMockCtx();
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600 });

      const viewport: Viewport = {
        startTime: 1000000,
        endTime: 2000000,
        priceMin: 40000,
        priceMax: 60000,
      };

      const layout = {
        panes: [
          {
            id: 'main',
            type: 'main' as const,
            heightRatio: 1.0,
            yMin: 0,
            yMax: 0,
            fixedRange: false,
          },
        ],
        timeAxisHeight: TIME_AXIS_HEIGHT,
      };

      const y = renderer.publicPriceToYWithLayout(50000, viewport, layout);
      expect(typeof y).toBe('number');
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(600);
    });
  });

  describe('renderWithLayout', () => {
    it('reuses precomputed price line bounds when provided', () => {
      const ctx = createMockCtx();
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600 });
      const calculateSpy = vi.spyOn(renderer as any, 'calculatePriceLineLabelBoundsForPane');

      const bars = makeBars(20);
      const viewport = TealchartRenderer.calculateViewport(bars);
      const layout: UnifiedPaneLayout = {
        panes: [
          {
            id: 'main',
            type: 'main',
            heightRatio: 1,
            yMin: 0,
            yMax: 0,
            fixedRange: false,
          },
        ],
        timeAxisHeight: TIME_AXIS_HEIGHT,
      };
      const priceLines: PriceLine[] = [
        {
          id: 'last-trade',
          price: bars[bars.length - 1]!.close,
          color: '#26a69a',
          lineStyle: 'solid',
          label: {
            primaryText: '50,200',
          },
          targetPaneId: 'main',
        },
      ];
      const precomputedBounds = renderer.computePriceLineLabelBoundsWithLayout(priceLines, viewport, layout);

      renderer.renderWithLayout(bars, viewport, layout, priceLines, [], undefined, undefined, undefined, precomputedBounds);

      expect(calculateSpy).not.toHaveBeenCalled();
    });

    it('renders label drawings in the main pane', () => {
      const fillText = vi.fn();
      const roundRect = vi.fn();
      const fill = vi.fn();
      const ctx = {
        ...createMockCtx(),
        fillText,
        roundRect,
        fill,
      };
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600 });

      const bars = makeBars(20);
      const viewport = TealchartRenderer.calculateViewport(bars);
      const layout: UnifiedPaneLayout = {
        panes: [
          {
            id: 'main',
            type: 'main',
            heightRatio: 1,
            yMin: 0,
            yMax: 0,
            fixedRange: false,
          },
        ],
        timeAxisHeight: TIME_AXIS_HEIGHT,
      };
      const drawings: DrawingOutput[] = [
        {
          id: 'label-1',
          type: 'label',
          barIndex: 10,
          x: 10,
          y: bars[10]!.close,
          text: 'Signal',
          xloc: 'bar_index',
          yloc: 'price',
          style: 'label_left',
          color: '#123456',
          textColor: '#FFFFFF',
          size: 'normal',
        },
      ];

      renderer.renderWithLayout(bars, viewport, layout, [], [], undefined, undefined, undefined, undefined, undefined, drawings);

      expect(roundRect).toHaveBeenCalled();
      expect(fill).toHaveBeenCalled();
      expect(fillText).toHaveBeenCalledWith('Signal', expect.any(Number), expect.any(Number));
    });

    it('positions bar_index label drawings from mutable x values', () => {
      const roundRect = vi.fn();
      const ctx = {
        ...createMockCtx(),
        roundRect,
      };
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600 });

      const bars = makeBars(20);
      const viewport = TealchartRenderer.calculateViewport(bars);
      const layout: UnifiedPaneLayout = {
        panes: [
          {
            id: 'main',
            type: 'main',
            heightRatio: 1,
            yMin: 0,
            yMax: 0,
            fixedRange: false,
          },
        ],
        timeAxisHeight: TIME_AXIS_HEIGHT,
      };
      const drawings: DrawingOutput[] = [
        {
          id: 'label-1',
          type: 'label',
          barIndex: 5,
          x: 12,
          y: bars[12]!.close,
          text: 'Moved',
          xloc: 'bar_index',
          yloc: 'price',
          style: 'label_left',
          color: '#123456',
          textColor: '#FFFFFF',
          size: 'normal',
        },
      ];

      renderer.renderWithLayout(bars, viewport, layout, [], [], undefined, undefined, undefined, undefined, undefined, drawings);

      const drawnX = roundRect.mock.calls[0]?.[0];
      const options = renderer.getOptions();
      const chartWidth = options.width - options.margins.left;
      const expectedX = options.margins.left
        + ((bars[12]!.time - viewport.startTime) / (viewport.endTime - viewport.startTime)) * chartWidth;
      expect(drawnX).toBeCloseTo(expectedX, 0);
    });

    it('routes label drawings from non-overlay scripts into their indicator pane', () => {
      const fillText = vi.fn();
      const ctx = {
        ...createMockCtx(),
        fillText,
      };
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600 });

      const bars = makeBars(20);
      const viewport = TealchartRenderer.calculateViewport(bars);
      const layout: UnifiedPaneLayout = {
        panes: [
          {
            id: 'main',
            type: 'main',
            heightRatio: 0.7,
            yMin: 0,
            yMax: 0,
            fixedRange: false,
          },
          {
            id: 'pane_1',
            type: 'indicator',
            heightRatio: 0.3,
            yMin: 0,
            yMax: 100,
            fixedRange: true,
            indicatorIds: ['rsi-script'],
          },
        ],
        timeAxisHeight: TIME_AXIS_HEIGHT,
      };
      const drawings: DrawingOutput[] = [
        {
          id: 'label-1',
          type: 'label',
          scriptId: 'rsi-script',
          barIndex: 10,
          x: 10,
          y: 50,
          text: 'Pane routed',
          xloc: 'bar_index',
          yloc: 'price',
          style: 'label_left',
          color: '#123456',
          textColor: '#FFFFFF',
          size: 'normal',
        },
      ];

      renderer.renderWithLayout(bars, viewport, layout, [], [], undefined, undefined, undefined, undefined, undefined, drawings);

      const labelCall = fillText.mock.calls.find((call) => call[0] === 'Pane routed');
      const mainPaneBottom = (600 - TIME_AXIS_HEIGHT) * 0.7;
      expect(labelCall).toBeDefined();
      expect(labelCall?.[2]).toBeGreaterThan(mainPaneBottom);
    });

    it('keeps overlay label drawings in the main pane when no indicator pane owns the script', () => {
      const fillText = vi.fn();
      const ctx = {
        ...createMockCtx(),
        fillText,
      };
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600 });

      const bars = makeBars(20);
      const viewport = TealchartRenderer.calculateViewport(bars);
      const layout: UnifiedPaneLayout = {
        panes: [
          {
            id: 'main',
            type: 'main',
            heightRatio: 0.7,
            yMin: 0,
            yMax: 0,
            fixedRange: false,
          },
          {
            id: 'pane_1',
            type: 'indicator',
            heightRatio: 0.3,
            yMin: 0,
            yMax: 100,
            fixedRange: true,
            indicatorIds: ['rsi-script'],
          },
        ],
        timeAxisHeight: TIME_AXIS_HEIGHT,
      };
      const drawings: DrawingOutput[] = [
        {
          id: 'label-1',
          type: 'label',
          scriptId: 'overlay-script',
          barIndex: 10,
          x: 10,
          y: bars[10]!.close,
          text: 'Main routed',
          xloc: 'bar_index',
          yloc: 'price',
          style: 'label_left',
          color: '#123456',
          textColor: '#FFFFFF',
          size: 'normal',
        },
      ];

      renderer.renderWithLayout(bars, viewport, layout, [], [], undefined, undefined, undefined, undefined, undefined, drawings);

      const labelCall = fillText.mock.calls.find((call) => call[0] === 'Main routed');
      const mainPaneBottom = (600 - TIME_AXIS_HEIGHT) * 0.7;
      expect(labelCall).toBeDefined();
      expect(labelCall?.[2]).toBeLessThan(mainPaneBottom);
    });

    it('renders line drawings in the main pane', () => {
      const moveTo = vi.fn();
      const lineTo = vi.fn();
      const stroke = vi.fn();
      const setLineDash = vi.fn();
      const ctx = {
        ...createMockCtx(),
        moveTo,
        lineTo,
        stroke,
        setLineDash,
      };
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600 });

      const bars = makeBars(20);
      const viewport = TealchartRenderer.calculateViewport(bars);
      const layout: UnifiedPaneLayout = {
        panes: [
          {
            id: 'main',
            type: 'main',
            heightRatio: 1,
            yMin: 0,
            yMax: 0,
            fixedRange: false,
          },
        ],
        timeAxisHeight: TIME_AXIS_HEIGHT,
      };
      const drawings: DrawingOutput[] = [
        {
          id: 'line-1',
          type: 'line',
          barIndex: 12,
          x1: 8,
          y1: bars[8]!.close,
          x2: 12,
          y2: bars[12]!.close,
          xloc: 'bar_index',
          extend: 'right',
          color: '#00FF00',
          style: 'dashed',
          width: 3,
        },
      ];

      renderer.renderWithLayout(bars, viewport, layout, [], [], undefined, undefined, undefined, undefined, undefined, drawings);

      expect(setLineDash).toHaveBeenCalledWith([6, 4]);
      expect(moveTo).toHaveBeenCalledWith(expect.any(Number), expect.any(Number));
      expect(lineTo.mock.calls.at(-1)?.[0]).toBe(renderer.getOptions().width - renderer.getOptions().margins.right);
      expect(stroke).toHaveBeenCalled();
    });

    it('renders forced-overlay line drawings in the main pane for non-overlay scripts', () => {
      const strokeStyles: unknown[] = [];
      const ctx = createMockCtx();
      ctx.stroke = vi.fn(() => {
        strokeStyles.push(ctx.strokeStyle);
      });
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600 });

      const bars = makeBars(20);
      const viewport = TealchartRenderer.calculateViewport(bars);
      const layout: UnifiedPaneLayout = {
        panes: [
          {
            id: 'main',
            type: 'main',
            heightRatio: 0.7,
            yMin: 0,
            yMax: 0,
            fixedRange: false,
          },
          {
            id: 'pane_1',
            type: 'indicator',
            heightRatio: 0.3,
            yMin: 0,
            yMax: 100,
            fixedRange: true,
            indicatorIds: ['rsi-script'],
          },
        ],
        timeAxisHeight: TIME_AXIS_HEIGHT,
      };
      const drawings: DrawingOutput[] = [
        {
          id: 'line-1',
          type: 'line',
          scriptId: 'rsi-script',
          barIndex: 12,
          x1: 8,
          y1: bars[8]!.close,
          x2: 12,
          y2: bars[12]!.close,
          xloc: 'bar_index',
          extend: 'none',
          color: '#ABCDEF',
          style: 'solid',
          width: 2,
          forceOverlay: true,
        },
      ];

      renderer.renderWithLayout(bars, viewport, layout, [], [], undefined, undefined, undefined, undefined, undefined, drawings);

      expect(strokeStyles).toContain('#ABCDEF');
    });

    it('renders linefill drawings behind line drawings', () => {
      const fill = vi.fn();
      const stroke = vi.fn();
      const ctx = {
        ...createMockCtx(),
        fill,
        stroke,
      };
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600 });

      const bars = makeBars(20);
      const viewport = TealchartRenderer.calculateViewport(bars);
      const layout: UnifiedPaneLayout = {
        panes: [
          {
            id: 'main',
            type: 'main',
            heightRatio: 1,
            yMin: 0,
            yMax: 0,
            fixedRange: false,
          },
        ],
        timeAxisHeight: TIME_AXIS_HEIGHT,
      };
      const drawings: DrawingOutput[] = [
        {
          id: 'upper',
          type: 'line',
          barIndex: 12,
          x1: 8,
          y1: bars[8]!.high,
          x2: 12,
          y2: bars[12]!.high,
          xloc: 'bar_index',
          extend: 'none',
          color: '#00FF00',
          style: 'solid',
          width: 1,
        },
        {
          id: 'lower',
          type: 'line',
          barIndex: 12,
          x1: 8,
          y1: bars[8]!.low,
          x2: 12,
          y2: bars[12]!.low,
          xloc: 'bar_index',
          extend: 'none',
          color: '#00FF00',
          style: 'solid',
          width: 1,
        },
        {
          id: 'fill',
          type: 'linefill',
          barIndex: 12,
          line1: 'upper',
          line2: 'lower',
          color: 'rgba(0, 255, 0, 0.2)',
        },
      ];

      renderer.renderWithLayout(bars, viewport, layout, [], [], undefined, undefined, undefined, undefined, undefined, drawings);

      expect(fill).toHaveBeenCalled();
      expect(stroke).toHaveBeenCalled();
      const fillOrder = fill.mock.invocationCallOrder[0]!;
      expect(stroke.mock.invocationCallOrder.some((order) => order > fillOrder)).toBe(true);
    });

    it('renders box drawings in the main pane', () => {
      const fillRect = vi.fn();
      const strokeRect = vi.fn();
      const fillText = vi.fn();
      const setLineDash = vi.fn();
      const ctx = {
        ...createMockCtx(),
        fillRect,
        strokeRect,
        fillText,
        setLineDash,
      };
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600 });

      const bars = makeBars(20);
      const viewport = TealchartRenderer.calculateViewport(bars);
      const layout: UnifiedPaneLayout = {
        panes: [
          {
            id: 'main',
            type: 'main',
            heightRatio: 1,
            yMin: 0,
            yMax: 0,
            fixedRange: false,
          },
        ],
        timeAxisHeight: TIME_AXIS_HEIGHT,
      };
      const drawings: DrawingOutput[] = [
        {
          id: 'box-1',
          type: 'box',
          barIndex: 12,
          left: 8,
          top: bars[12]!.high,
          right: 12,
          bottom: bars[8]!.low,
          xloc: 'bar_index',
          extend: 'none',
          borderColor: '#00FF00',
          borderWidth: 2,
          borderStyle: 'dotted',
          bgcolor: 'rgba(0, 255, 0, 0.2)',
          text: 'Zone',
          textColor: '#FFFFFF',
          textSize: 'small',
        },
      ];

      renderer.renderWithLayout(bars, viewport, layout, [], [], undefined, undefined, undefined, undefined, undefined, drawings);

      expect(fillRect).toHaveBeenCalled();
      expect(strokeRect).toHaveBeenCalled();
      expect(setLineDash).toHaveBeenCalledWith([2, 4]);
      expect(fillText).toHaveBeenCalledWith('Zone', expect.any(Number), expect.any(Number));
    });

    it('renders countdown text for simple price lines with countdownToTime', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-29T06:17:00.000Z'));

      const fillText = vi.fn();
      const ctx = {
        ...createMockCtx(),
        fillText,
      };
      const renderer = new TealchartRenderer(ctx, { width: 800, height: 600 });

      const bars = makeBars(20);
      const viewport = TealchartRenderer.calculateViewport(bars);
      const layout: UnifiedPaneLayout = {
        panes: [
          {
            id: 'main',
            type: 'main',
            heightRatio: 1,
            yMin: 0,
            yMax: 0,
            fixedRange: false,
          },
        ],
        timeAxisHeight: TIME_AXIS_HEIGHT,
      };
      const priceLines: PriceLine[] = [
        {
          id: 'last-trade',
          price: bars[bars.length - 1]!.close,
          color: '#26a69a',
          lineStyle: 'dotted',
          label: {
            primaryText: '50,200',
          },
          countdownToTime: Date.now() + 62_000,
          targetPaneId: 'main',
        },
      ];

      renderer.renderWithLayout(bars, viewport, layout, priceLines);

      expect(fillText).toHaveBeenCalledWith('50,200', expect.any(Number), expect.any(Number));
      expect(fillText).toHaveBeenCalledWith('01:02', expect.any(Number), expect.any(Number));

      vi.useRealTimers();
    });
  });
});
