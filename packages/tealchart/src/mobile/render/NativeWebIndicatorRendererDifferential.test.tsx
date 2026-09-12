import type { PlotOutput } from '@tealstreet/tealscript';
import type { ReactElement, ReactNode } from 'react';
import type { Bar, ComputedPane, Viewport } from '../../types';
import type { NativeVisibleBar } from './nativeVisibleBars';

import { Group, Rect, Skia, Path as SkiaPath, Text as SkiaText } from '@shopify/react-native-skia';
import { describe, expect, it, vi } from 'vitest';

import { TealchartRenderer } from '../../TealchartRenderer';
import { NativeCandleVolumeLayerImpl } from './NativeCandleVolumeLayer';
import { MobileIndicatorManager } from '../MobileIndicatorManager';
import { createNativeChartFrameFromPanes } from './nativeChartFrame';
import { NativeIndicatorPlotLayerImpl } from './NativeIndicatorPlotLayer';
import { getVisiblePlotRange } from '../../viewport/viewScale';

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, useMemo: <T,>(factory: () => T) => factory() };
});

interface PrimitiveSummary {
  filledGeometry: boolean;
  strokedGeometry: boolean;
  colors: string[];
  text: string[];
}

interface RecordingCanvasContext {
  canvas: { width: number; height: number };
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  textAlign: string;
  textBaseline: string;
  globalAlpha: number;
  lineCap: string;
  lineJoin: string;
  operations: Array<{ kind: 'fill' | 'stroke' | 'text'; color: string; text?: string }>;
  arc: ReturnType<typeof vi.fn>;
  beginPath: ReturnType<typeof vi.fn>;
  clearRect: ReturnType<typeof vi.fn>;
  clip: ReturnType<typeof vi.fn>;
  closePath: ReturnType<typeof vi.fn>;
  createLinearGradient: ReturnType<typeof vi.fn>;
  fill: ReturnType<typeof vi.fn>;
  fillRect: ReturnType<typeof vi.fn>;
  fillText: ReturnType<typeof vi.fn>;
  getTransform: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  measureText: (text: string) => { width: number };
  moveTo: ReturnType<typeof vi.fn>;
  rect: ReturnType<typeof vi.fn>;
  restore: ReturnType<typeof vi.fn>;
  roundRect: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  scale: ReturnType<typeof vi.fn>;
  setLineDash: ReturnType<typeof vi.fn>;
  setTransform: ReturnType<typeof vi.fn>;
  stroke: ReturnType<typeof vi.fn>;
  strokeRect: ReturnType<typeof vi.fn>;
  translate: ReturnType<typeof vi.fn>;
}

function createRecordingCtx(): RecordingCanvasContext {
  const ctx: RecordingCanvasContext = {
    canvas: { width: 800, height: 600 },
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    textAlign: 'left',
    textBaseline: 'top',
    globalAlpha: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    operations: [],
    arc: vi.fn(),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    clip: vi.fn(),
    closePath: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    fill: vi.fn(() => ctx.operations.push({ kind: 'fill', color: ctx.fillStyle })),
    fillRect: vi.fn(() => ctx.operations.push({ kind: 'fill', color: ctx.fillStyle })),
    fillText: vi.fn((text: string) => ctx.operations.push({ kind: 'text', color: ctx.fillStyle, text })),
    getTransform: vi.fn(() => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })),
    lineTo: vi.fn(),
    measureText: (text: string) => ({ width: text.length * 7 }),
    moveTo: vi.fn(),
    rect: vi.fn(),
    restore: vi.fn(),
    roundRect: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    setLineDash: vi.fn(),
    setTransform: vi.fn(),
    stroke: vi.fn(() => ctx.operations.push({ kind: 'stroke', color: ctx.strokeStyle })),
    strokeRect: vi.fn(() => ctx.operations.push({ kind: 'stroke', color: ctx.strokeStyle })),
    translate: vi.fn(),
  };
  return ctx;
}

function makeBars(): Bar[] {
  return [
    { close: 100, high: 110, low: 90, open: 95, time: 1_000_000, volume: 100 },
    { close: 105, high: 115, low: 95, open: 110, time: 1_060_000, volume: 120 },
    { close: 112, high: 120, low: 102, open: 106, time: 1_120_000, volume: 140 },
  ];
}

function makeVisibleBars(bars: readonly Bar[]): NativeVisibleBar[] {
  return bars.map((bar, sourceIndex) => ({
    ...bar,
    interval: 60_000,
    sourceIndex,
    x: 0,
  }));
}

function summarizeWebIndicatorPrimitives(plots: PlotOutput[]): PrimitiveSummary {
  const ctx = createRecordingCtx();
  const bars = makeBars();
  const renderer = new TealchartRenderer(ctx, { width: 800, height: 600, showVolume: false });
  const viewport: Viewport = {
    startTime: bars[0]!.time,
    endTime: bars[2]!.time,
    priceMin: 0,
    priceMax: 130,
  };

  renderer.renderPlots(plots, bars, viewport);
  return normalizeCanvasOperations(ctx.operations);
}

function normalizeCanvasOperations(
  operations: RecordingCanvasContext['operations'],
  ignoredColors: readonly string[] = [],
): PrimitiveSummary {
  const ignored = new Set(ignoredColors);
  const relevant = operations.filter((operation) => operation.color && !ignored.has(operation.color));
  return {
    filledGeometry: relevant.some((operation) => operation.kind === 'fill'),
    strokedGeometry: relevant.some((operation) => operation.kind === 'stroke'),
    colors: sortedUnique(relevant.map((operation) => operation.color)),
    text: relevant.filter((operation) => operation.kind === 'text').map((operation) => operation.text ?? ''),
  };
}

function walkElements(
  node: ReactNode,
  visitor: (element: ReactElement<Record<string, unknown>>, inheritedOpacity: number) => void,
  inheritedOpacity = 1,
): void {
  if (node === null || node === undefined || typeof node === 'boolean') return;
  if (Array.isArray(node)) {
    for (const child of node) walkElements(child, visitor, inheritedOpacity);
    return;
  }
  if (typeof node !== 'object' || !('props' in node)) return;
  const element = node as ReactElement<Record<string, unknown>>;
  const ownOpacity = typeof element.props.opacity === 'number' ? element.props.opacity : 1;
  const opacity = inheritedOpacity * ownOpacity;
  visitor(element, opacity);
  walkElements(element.props.children as ReactNode, visitor, opacity);
}

function expandChildren(root: ReactNode): ReactNode[] {
  const rendered: ReactNode[] = [];
  walkElements(root, (element, opacity) => {
    if (opacity === 0) return;
    if (typeof element.type !== 'function') return;
    if (element.type === Group || element.type === Rect || element.type === SkiaPath || element.type === SkiaText)
      return;
    rendered.push((element.type as (props: unknown) => ReactNode)(element.props));
  });
  return rendered;
}

function expandAll(root: ReactNode, levels = 5): ReactNode[] {
  let current = [root];
  const all = [...current];
  for (let level = 0; level < levels; level += 1) {
    current = current.flatMap((node) => expandChildren(node));
    all.push(...current);
  }
  return all;
}

function summarizeNativeIndicatorPrimitives(plots: PlotOutput[]): PrimitiveSummary {
  const bars = makeBars();
  const frame = createNativeChartFrameFromPanes({
    dimensions: { width: 800, height: 600, margins: { top: 0, right: 76, bottom: 24, left: 0 } },
    panes: [{ id: 'main', type: 'main', top: 0, height: 576, yMin: 0, yMax: 130 }],
  });
  const sharedViewport = {
    startTime: { value: bars[0]!.time },
    endTime: { value: bars[2]!.time },
    priceMin: { value: 0 },
    priceMax: { value: 130 },
  } as never;
  const rendered = expandAll(
    NativeIndicatorPlotLayerImpl({
      frame,
      indicatorPaneInfo: {},
      plots,
      sharedViewport,
      staticProjection: null,
      textFont: Skia.Font(),
      totalBarCount: bars.length,
      visibleBars: makeVisibleBars(bars),
    }),
  );
  return normalizeNativeElements(rendered);
}

function summarizeWebIndicatorPaneRange(plots: PlotOutput[]): { min: number; max: number } | null {
  const bars = makeBars();
  return getVisiblePlotRange(plots, ['script'], bars, bars[0]!.time, bars[bars.length - 1]!.time);
}

function summarizeNativeIndicatorPaneRange(plots: PlotOutput[]): { min: number; max: number } | null {
  const manager = new MobileIndicatorManager();
  let range: { min: number; max: number } | null = null;
  (manager as unknown as { _paneManager: unknown })._paneManager = {
    getIndicatorPanes: () => [{ fixedRange: false, id: 'pane', indicatorIds: ['script'] }],
    updatePaneRange: (_paneId: string, min: number, max: number) => {
      range = { min, max };
    },
  };

  (manager as unknown as { _updateAutoPaneRanges: (plots: readonly PlotOutput[]) => void })._updateAutoPaneRanges(plots);
  return range;
}

function normalizeNativeElements(nodes: readonly ReactNode[]): PrimitiveSummary {
  const operations: RecordingCanvasContext['operations'] = [];
  walkElements(nodes, (element, opacity) => {
    if (opacity === 0) return;
    if (element.type === Rect) {
      operations.push({ kind: 'fill', color: String(element.props.color ?? '') });
      return;
    }
    if (element.type === SkiaText) {
      operations.push({
        kind: 'text',
        color: String(element.props.color ?? ''),
        text: String(element.props.text ?? ''),
      });
      return;
    }
    if (element.type !== SkiaPath) return;
    const path = element.props.path as { value?: Record<string, ReturnType<typeof vi.fn>> } | undefined;
    const pathValue = path && 'value' in path ? path.value : path;
    const hasPaint =
      Boolean(pathValue) &&
      Object.values(pathValue).some(
        (method) => typeof method === 'function' && vi.mocked(method as never).mock.calls.length > 0,
      );
    if (!hasPaint) return;
    operations.push({
      kind: element.props.style === 'stroke' ? 'stroke' : 'fill',
      color: String(element.props.color ?? ''),
    });
  });
  return normalizeCanvasOperations(operations);
}

function sortedUnique(values: readonly string[]): string[] {
  return Array.from(new Set(values)).sort();
}

function plot(overrides: Partial<PlotOutput>): PlotOutput {
  return {
    color: '#2196F3',
    id: 'plot',
    title: 'Plot',
    type: 'plot',
    values: [100, 105, 112],
    ...overrides,
  } as PlotOutput;
}

// Renderer-boundary differential: the external corpus fixtures are not checked
// into this package, so these corpus-shaped PlotOutput bundles compare the
// actual web Canvas and native Skia paths without pretending to execute corpus
// scripts end to end.
describe('native/web Pine indicator renderer differential', () => {
  it.each([
    {
      name: 'line plot',
      plots: [plot({ id: 'line_plot', color: ['#00aa00', null, '#aa0000'] })],
    },
    {
      name: 'histogram',
      plots: [plot({ id: 'histogram', color: ['#00aa00', null, '#aa0000'], histbase: 90, style: 'histogram' })],
    },
    {
      name: 'area',
      plots: [plot({ id: 'area', color: '#00aa00', histbase: 90, style: 'area' })],
    },
    {
      name: 'cross markers',
      plots: [plot({ id: 'cross_markers', color: ['#00aa00', null, '#aa0000'], style: 'cross' })],
    },
    {
      name: 'stepline diamonds',
      plots: [plot({ id: 'stepline_diamond', color: '#00aa00', linewidth: 2, style: 'stepline_diamond' })],
    },
    {
      name: 'plotshape marker and text',
      plots: [
        plot({
          id: 'plotshape_signals',
          color: ['#00aa00', null, '#aa0000'],
          location: 'belowbar',
          shape: 'triangleup',
          textValues: ['Buy', 'Text only', 'Buy'],
          type: 'plotshape',
          values: [1, 1, 1],
        }),
      ],
    },
    {
      name: 'plotchar glyph',
      plots: [
        plot({
          char: 'X',
          color: ['#00aa00', null, '#aa0000'],
          id: 'plotchar_state',
          type: 'plotchar',
          values: [1, 1, 1],
        }),
      ],
    },
    {
      name: 'plotarrow',
      plots: [
        plot({ color: ['#00aa00', null, '#aa0000'], id: 'plotarrow_move', type: 'plotarrow', values: [1, 0, -1] }),
      ],
    },
    {
      name: 'hline',
      plots: [plot({ color: '#787B86', id: 'hline_level', price: 100, type: 'hline', values: [] })],
    },
    {
      name: 'bgcolor',
      plots: [
        plot({ color: ['#1565c033', null, '#1565c033'], id: 'bgcolor_session', type: 'bgcolor', values: [1, null, 1] }),
      ],
    },
    {
      name: 'fill between plots',
      plots: [
        plot({ id: 'upper', values: [110, 112, 114] }),
        plot({ id: 'lower', values: [90, 92, 94] }),
        plot({ color: '#4CAF5033', id: 'fill_band', plot1Id: 'upper', plot2Id: 'lower', type: 'fill', values: [] }),
      ],
    },
    {
      name: 'plotbar',
      plots: [
        plot({
          closeValues: [100, 105, 112],
          highValues: [110, 115, 120],
          id: 'plotbar_ohlc',
          lowValues: [90, 95, 102],
          openValues: [95, 110, 106],
          type: 'plotbar',
          values: [100, 105, 112],
        }),
      ],
    },
    {
      name: 'plotcandle',
      plots: [
        plot({
          borderColor: '#111111',
          closeValues: [100, 105, 112],
          highValues: [110, 115, 120],
          id: 'plotcandle_ohlc',
          lowValues: [90, 95, 102],
          openValues: [95, 110, 106],
          type: 'plotcandle',
          values: [100, 105, 112],
          wickColor: '#222222',
        }),
      ],
    },
  ])('matches web semantic primitives for $name', ({ plots }) => {
    expect(summarizeNativeIndicatorPrimitives(plots)).toEqual(summarizeWebIndicatorPrimitives(plots));
  });

  it('preserves eight-digit hex alpha across native TealScript indicator visuals', () => {
    const plots = [
      plot({ color: '#0a141e80', id: 'line_alpha', values: [100, 105, 112] }),
      plot({ color: '#10203080', id: 'histogram_alpha', style: 'histogram', values: [20, 25, 30] }),
      plot({ id: 'upper_alpha', values: [110, 112, 114] }),
      plot({ id: 'lower_alpha', values: [90, 92, 94] }),
      plot({
        color: '#11223380',
        id: 'fill_alpha',
        plot1Id: 'upper_alpha',
        plot2Id: 'lower_alpha',
        type: 'fill',
        values: [],
      }),
      plot({ color: ['#22334480', null, '#22334480'], id: 'bgcolor_alpha', type: 'bgcolor', values: [1, null, 1] }),
      plot({
        color: '#33445580',
        id: 'plotshape_alpha',
        location: 'belowbar',
        shape: 'triangleup',
        type: 'plotshape',
        values: [1, null, 1],
      }),
      plot({ char: 'A', color: '#44556680', id: 'plotchar_alpha', type: 'plotchar', values: [1, null, 1] }),
      plot({ color: '#55667780', id: 'plotarrow_alpha', type: 'plotarrow', values: [1, 0, -1] }),
      plot({
        closeValues: [100, 105, 112],
        color: '#66778880',
        highValues: [110, 115, 120],
        id: 'plotbar_alpha',
        lowValues: [90, 95, 102],
        openValues: [95, 110, 106],
        type: 'plotbar',
        values: [100, 105, 112],
      }),
      plot({
        borderColor: '#99aabb80',
        closeValues: [100, 105, 112],
        color: '#77889980',
        highValues: [110, 115, 120],
        id: 'plotcandle_alpha',
        lowValues: [90, 95, 102],
        openValues: [95, 110, 106],
        type: 'plotcandle',
        values: [100, 105, 112],
        wickColor: '#8899aa80',
      }),
    ];

    const native = summarizeNativeIndicatorPrimitives(plots);
    const web = summarizeWebIndicatorPrimitives(plots);

    expect(native).toEqual(web);
    expect(native.colors).toEqual(
      expect.arrayContaining([
        '#0a141e80',
        '#10203080',
        '#11223380',
        '#22334480',
        '#33445580',
        '#44556680',
        '#55667780',
        '#66778880',
        '#77889980',
        '#8899aa80',
        '#99aabb80',
      ]),
    );
  });

  it.each([
    { display: 1, expectedOverrideVisible: true },
    { display: 2, expectedOverrideVisible: false },
    { display: 0, expectedOverrideVisible: false },
  ])('matches web barcolor display semantics for display=$display', ({ display, expectedOverrideVisible }) => {
    expect(nativeBarcolorShowsOverride(display)).toBe(expectedOverrideVisible);
    expect(webBarcolorShowsOverride(display)).toBe(expectedOverrideVisible);
  });

  it('preserves eight-digit hex alpha for native barcolor candle overrides', () => {
    expect(nativeBarcolorRenderedColors('#7c3aed80')).toContain('#7c3aed80');
    expect(webBarcolorRenderedColors('#7c3aed80')).toContain('#7c3aed80');
  });

  it('matches web pane range semantics for absolute shape and char markers without treating plotarrow magnitude as price', () => {
    const plots = [
      plot({ id: 'baseline', scriptId: 'script', values: [10, 20, 30] }),
      plot({ id: 'shape', location: 'absolute', scriptId: 'script', type: 'plotshape', values: [500, null, 600] }),
      plot({ id: 'char', location: 'absolute', scriptId: 'script', type: 'plotchar', values: [null, -200, null] }),
      plot({ id: 'arrow', scriptId: 'script', type: 'plotarrow', values: [10_000, -10_000, 5_000] }),
    ];

    expect(summarizeNativeIndicatorPaneRange(plots)).toEqual(summarizeWebIndicatorPaneRange(plots));
    expect(summarizeWebIndicatorPaneRange(plots)).toEqual({ min: -280, max: 680 });
  });
});

function webBarcolorShowsOverride(display: number): boolean {
  const ctx = createRecordingCtx();
  const renderer = new TealchartRenderer(ctx, { downColor: '#bbbbbb', showVolume: false, upColor: '#aaaaaa' });
  const bars = makeBars();
  const viewport: Viewport = {
    startTime: bars[0]!.time,
    endTime: bars[2]!.time,
    priceMin: 0,
    priceMax: 130,
  };
  const pane: ComputedPane = {
    bottom: 576,
    fixedRange: false,
    height: 576,
    heightRatio: 1,
    id: 'main',
    top: 0,
    type: 'main',
    yMax: 130,
    yMin: 0,
  };
  const barcolor = plot({
    color: ['#7c3aed', '#7c3aed', '#7c3aed'],
    display,
    id: 'barcolor_override',
    type: 'barcolor',
    values: [1, 1, 1],
  });

  (
    renderer as unknown as {
      drawCandlesInPane: (bars: Bar[], viewport: Viewport, pane: ComputedPane, plots: PlotOutput[]) => void;
    }
  ).drawCandlesInPane(bars, viewport, pane, [barcolor]);
  return ctx.operations.some((operation) => operation.color === '#7c3aed');
}

function webBarcolorRenderedColors(color: string): string[] {
  const ctx = createRecordingCtx();
  const renderer = new TealchartRenderer(ctx, { downColor: '#bbbbbb', showVolume: false, upColor: '#aaaaaa' });
  const bars = makeBars();
  const viewport: Viewport = {
    startTime: bars[0]!.time,
    endTime: bars[2]!.time,
    priceMin: 0,
    priceMax: 130,
  };
  const pane: ComputedPane = {
    bottom: 576,
    fixedRange: false,
    height: 576,
    heightRatio: 1,
    id: 'main',
    top: 0,
    type: 'main',
    yMax: 130,
    yMin: 0,
  };
  const barcolor = plot({
    color: [color, color, color],
    display: 1,
    id: 'barcolor_alpha',
    type: 'barcolor',
    values: [1, 1, 1],
  });

  (
    renderer as unknown as {
      drawCandlesInPane: (bars: Bar[], viewport: Viewport, pane: ComputedPane, plots: PlotOutput[]) => void;
    }
  ).drawCandlesInPane(bars, viewport, pane, [barcolor]);
  return normalizeCanvasOperations(ctx.operations).colors;
}

function nativeBarcolorShowsOverride(display: number): boolean {
  const bars = makeBars();
  const frame = createNativeChartFrameFromPanes({
    dimensions: { width: 800, height: 600, margins: { top: 0, right: 76, bottom: 24, left: 0 } },
    panes: [{ id: 'main', type: 'main', top: 0, height: 576, yMin: 0, yMax: 130 }],
  });
  const sharedViewport = {
    startTime: { value: bars[0]!.time },
    endTime: { value: bars[2]!.time },
    priceMin: { value: 0 },
    priceMax: { value: 130 },
  } as never;
  const barcolor = plot({
    color: ['#7c3aed', '#7c3aed', '#7c3aed'],
    display,
    id: 'barcolor_override',
    type: 'barcolor',
    values: [1, 1, 1],
  });
  const rendered = expandAll(
    NativeCandleVolumeLayerImpl({
      barColorPlots: [barcolor],
      frame,
      options: { downColor: '#bbbbbb', upColor: '#aaaaaa' } as never,
      sharedViewport,
      visibleBars: makeVisibleBars(bars),
      volumeHeight: 0,
    }),
  );

  return normalizeNativeElements(rendered).colors.includes('#7c3aed');
}

function nativeBarcolorRenderedColors(color: string): string[] {
  const bars = makeBars();
  const frame = createNativeChartFrameFromPanes({
    dimensions: { width: 800, height: 600, margins: { top: 0, right: 76, bottom: 24, left: 0 } },
    panes: [{ id: 'main', type: 'main', top: 0, height: 576, yMin: 0, yMax: 130 }],
  });
  const sharedViewport = {
    startTime: { value: bars[0]!.time },
    endTime: { value: bars[2]!.time },
    priceMin: { value: 0 },
    priceMax: { value: 130 },
  } as never;
  const barcolor = plot({
    color: [color, color, color],
    display: 1,
    id: 'barcolor_alpha',
    type: 'barcolor',
    values: [1, 1, 1],
  });
  const rendered = expandAll(
    NativeCandleVolumeLayerImpl({
      barColorPlots: [barcolor],
      frame,
      options: { downColor: '#bbbbbb', upColor: '#aaaaaa' } as never,
      sharedViewport,
      visibleBars: makeVisibleBars(bars),
      volumeHeight: 0,
    }),
  );

  return normalizeNativeElements(rendered).colors;
}
