import type { PlotOutput } from '@tealstreet/tealscript';
import type { ReactElement, ReactNode } from 'react';
import type { CanvasContext } from '../../rendering/CanvasContext';
import type { Bar, Viewport } from '../../types';
import type { NativeIndicatorPaneInfo } from './NativeIndicatorPlotLayer';
import type { NativeVisibleBar } from './nativeVisibleBars';

import { Fragment } from 'react';

import {
  DashPathEffect,
  Group,
  LinearGradient,
  matchFont,
  Path,
  Picture,
  Rect,
  Skia,
  Text,
} from '@shopify/react-native-skia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { executeScript, parse } from '@tealstreet/tealscript';
import { TealchartRenderer } from '../../TealchartRenderer';
import { nativePictureRects } from '../../test/nativePictureRects';
import { createNativeChartFrameFromPanes } from './nativeChartFrame';
import { NativeIndicatorPlotLayerImpl } from './NativeIndicatorPlotLayer';
import { createNativeChartProjection } from './nativeProjection';

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useMemo: <T,>(factory: () => T) => factory(),
}));
vi.mock('@shopify/react-native-skia', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shopify/react-native-skia')>()),
  LinearGradient: () => null,
}));

type Command = [string, ...unknown[]];
type Gradient = { from: number[]; to: number[]; stops: Array<[number, string]> };
type Paint = {
  kind: 'fill' | 'stroke' | 'text';
  color: string | Gradient;
  commands?: Command[];
  width?: number;
  dash?: number[];
  text?: string;
  x?: number;
  y?: number;
  size?: number;
  opacity: number;
};
const round = (value: number) => Math.round(value * 1e6) / 1e6;
const frame = createNativeChartFrameFromPanes({
  dimensions: { width: 400, height: 420, margins: { left: 0, right: 0, top: 0, bottom: 20 } },
  panes: [
    { id: 'main', type: 'main', top: 0, height: 200, yMin: 0, yMax: 100 },
    { id: 'study', type: 'indicator', top: 200, height: 200, yMin: 0, yMax: 100 },
  ],
});
const bars: NativeVisibleBar[] = [0, 1000, 2000, 3000, 4000].map((time, sourceIndex) => ({
  time,
  sourceIndex,
  interval: 1000,
  x: sourceIndex * 100,
  open: 10,
  close: 15,
  high: 20,
  low: 5,
  volume: 1,
}));
const viewport: Viewport = { startTime: 0, endTime: 4000, priceMin: 0, priceMax: 100 };
const info = { s: { overlay: false, paneId: 'study' } };
function plot(overrides: Partial<PlotOutput> = {}): PlotOutput {
  return { id: 'p', type: 'plot', title: 'P', color: '#12345680', values: [10, 20, 30, 40, 50], ...overrides };
}
function font(size: number) {
  return {
    ...Skia.Font(null, size),
    getSize: () => size,
    getMetrics: () => ({ ascent: -size * 0.75, descent: size * 0.25, leading: 0 }),
    measureText: (text: string) => ({ width: text.length * 7, height: size }),
  };
}
beforeEach(() => {
  vi.mocked(matchFont).mockImplementation((options) => font(Number(options.fontSize ?? 12)));
});
function rectCommands(x: number, y: number, width: number, height: number): Command[] {
  return [['M', x, y], ['L', x + width, y], ['L', x + width, y + height], ['L', x, y + height], ['Z']];
}
function rounded(commands: Command[]) {
  return commands.map(
    (command) => command.map((value) => (typeof value === 'number' ? round(value) : value)) as Command,
  );
}
// Native batches subpaths by color while canvas paints each island separately.
// Split only at moveTo/close boundaries; retain every vertex and stroke style.
function islands(commands: Command[]): Command[][] {
  const result: Command[][] = [];
  let current: Command[] = [];
  for (const command of commands) {
    if (command[0] === 'M' && current.length) {
      result.push(current);
      current = [];
    }
    current.push(command);
    if (command[0] === 'Z') {
      result.push(current);
      current = [];
    }
  }
  if (current.length) result.push(current);
  return result;
}
function normalize(paints: Paint[]) {
  return (
    paints
      // Canvas gradients with coincident endpoints paint transparently. Native
      // suppresses the same mask with opacity=0, so neither contributes ink.
      .filter(
        ({ color }) =>
          typeof color === 'string' || color.from.some((coordinate, index) => coordinate !== color.to[index]),
      )
      .flatMap((paint) =>
        paint.commands
          ? islands(paint.commands)
              .filter((path) => path.length > 1)
              .map((commands) => ({ ...paint, commands: rounded(commands) }))
          : [paint],
      )
      .map((paint) =>
        JSON.parse(JSON.stringify(paint, (_key, value) => (typeof value === 'number' ? round(value) : value))),
      )
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  );
}
function webContext() {
  const paints: Paint[] = [];
  let commands: Command[] = [];
  let dash: number[] = [];
  const state: Array<Record<string, unknown>> = [];
  const ctx = {
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
    beginPath() {
      commands = [];
    },
    moveTo(x: number, y: number) {
      commands.push(['M', x, y]);
    },
    lineTo(x: number, y: number) {
      commands.push(['L', x, y]);
    },
    closePath() {
      commands.push(['Z']);
    },
    quadraticCurveTo(...args: number[]) {
      commands.push(['Q', ...args]);
    },
    bezierCurveTo(...args: number[]) {
      commands.push(['C', ...args]);
    },
    rect(x: number, y: number, w: number, h: number) {
      commands.push(...rectCommands(x, y, w, h));
    },
    roundRect(x: number, y: number, w: number, h: number, r: number) {
      commands.push(['RR', x, y, w, h, r], ['Z']);
    },
    arc(x: number, y: number, r: number) {
      commands.push(['circle', x, y, r], ['Z']);
    },
    fill() {
      paints.push({ kind: 'fill', color: ctx.fillStyle as string, commands: [...commands], opacity: ctx.globalAlpha });
    },
    stroke() {
      paints.push({
        kind: 'stroke',
        color: ctx.strokeStyle as string,
        commands: [...commands],
        width: ctx.lineWidth,
        dash: [...dash],
        opacity: ctx.globalAlpha,
      });
    },
    fillRect(x: number, y: number, w: number, h: number) {
      paints.push({
        kind: 'fill',
        color: ctx.fillStyle as string,
        commands: rectCommands(x, y, w, h),
        opacity: ctx.globalAlpha,
      });
    },
    strokeRect() {},
    fillText(text: string, x: number, y: number) {
      if (!text) return;
      const size = Number(/([\d.]+)px/.exec(ctx.font)?.[1] ?? 12);
      const metrics = font(size).getMetrics();
      const left =
        ctx.textAlign === 'center' ? x - (text.length * 7) / 2 : ctx.textAlign === 'right' ? x - text.length * 7 : x;
      const baseline =
        ctx.textBaseline === 'top'
          ? y - metrics.ascent
          : ctx.textBaseline === 'middle'
            ? y - (metrics.ascent + metrics.descent) / 2
            : ctx.textBaseline === 'bottom'
              ? y - metrics.descent
              : y;
      paints.push({
        kind: 'text',
        color: ctx.fillStyle as string,
        text,
        x: left,
        y: baseline,
        size,
        opacity: ctx.globalAlpha,
      });
    },
    save() {
      state.push({
        fillStyle: ctx.fillStyle,
        strokeStyle: ctx.strokeStyle,
        lineWidth: ctx.lineWidth,
        font: ctx.font,
        textAlign: ctx.textAlign,
        textBaseline: ctx.textBaseline,
        globalAlpha: ctx.globalAlpha,
        dash: [...dash],
      });
    },
    restore() {
      const saved = state.pop();
      if (saved) {
        dash = saved.dash as number[];
        Object.assign(ctx, saved);
      }
    },
    clip() {},
    scale() {},
    translate() {},
    setLineDash(value: number[]) {
      dash = [...value];
    },
    getLineDash() {
      return dash;
    },
    measureText(text: string) {
      return { width: text.length * 7 };
    },
    createLinearGradient(x1: number, y1: number, x2: number, y2: number) {
      const gradient: Gradient = { from: [x1, y1], to: [x2, y2], stops: [] };
      return {
        ...gradient,
        addColorStop(position: number, color: string) {
          gradient.stops.push([position, color]);
        },
      };
    },
  } as unknown as CanvasContext & { createLinearGradient(...args: number[]): unknown };
  return { ctx, paints };
}
function nativePath(path: Record<string, unknown>) {
  const calls: Array<{ order: number; method: string; args: unknown[] }> = [];
  for (const [method, fn] of Object.entries(path))
    if (vi.isMockFunction(fn))
      fn.mock.calls.forEach((args, index) => calls.push({ order: fn.mock.invocationCallOrder[index]!, method, args }));
  const commands: Command[] = [];
  for (const { method, args } of calls.sort((a, b) => a.order - b.order)) {
    if (method === 'moveTo') commands.push(['M', ...args]);
    else if (method === 'lineTo') commands.push(['L', ...args]);
    else if (method === 'close') commands.push(['Z']);
    else if (method === 'quadTo') commands.push(['Q', ...args]);
    else if (method === 'cubicTo') commands.push(['C', ...args]);
    else if (method === 'addCircle') commands.push(['circle', ...args], ['Z']);
    else if (method === 'addRect') {
      const r = args[0] as { x: number; y: number; width: number; height: number };
      commands.push(...rectCommands(r.x, r.y, r.width, r.height));
    } else if (method === 'addRRect') {
      const r = args[0] as { rect: { x: number; y: number; width: number; height: number }; rx: number };
      commands.push(['RR', r.rect.x, r.rect.y, r.rect.width, r.rect.height, r.rx], ['Z']);
    } else if (method === 'addPath') commands.push(...nativePath(args[0] as Record<string, unknown>));
  }
  return commands;
}
function value<T>(input: T | { value: T }): T {
  return input && typeof input === 'object' && 'value' in input ? input.value : (input as T);
}
function nativePaints(node: ReactNode, opacity = 1): Paint[] {
  if (node === null || node === undefined || typeof node === 'boolean') return [];
  if (Array.isArray(node)) return node.flatMap((child) => nativePaints(child, opacity));
  if (typeof node !== 'object' || !('props' in node)) return [];
  const element = node as ReactElement<Record<string, unknown>>;
  const props = element.props;
  opacity *= Number(value(props.opacity ?? 1));
  if (!opacity) return [];
  if (element.type === Picture)
    return nativePictureRects(props.picture).map((rect) => ({
      kind: 'fill',
      color: rect.color,
      commands: rectCommands(rect.x, rect.y, rect.width, rect.height),
      opacity,
    }));
  if (element.type === Fragment || element.type === Group) return nativePaints(props.children as ReactNode, opacity);
  if (element.type === Path) {
    let color = props.color as string | Gradient;
    const children = Array.isArray(props.children) ? props.children : [props.children];
    const gradient = children.find(
      (child) => child && typeof child === 'object' && 'type' in child && child.type === LinearGradient,
    ) as ReactElement<Record<string, unknown>> | undefined;
    if (gradient) {
      const start = value(gradient.props.start) as { x: number; y: number };
      const end = value(gradient.props.end) as { x: number; y: number };
      const colors = value(gradient.props.colors) as string[];
      const positions = value(gradient.props.positions ?? [0, 1]) as number[];
      color = {
        from: [start.x, start.y],
        to: [end.x, end.y],
        stops: colors.map((color, index) => [positions[index]!, color]),
      };
    }
    const commands = nativePath(value(props.path) as Record<string, unknown>);
    if (!commands.length) return [];
    const stroke = props.style === 'stroke';
    const dash = children.find(
      (child) => child && typeof child === 'object' && 'type' in child && child.type === DashPathEffect,
    ) as ReactElement<{ intervals: number[] }> | undefined;
    return [
      {
        kind: stroke ? 'stroke' : 'fill',
        color,
        commands,
        ...(stroke ? { width: Number(value(props.strokeWidth ?? 1)), dash: dash?.props.intervals ?? [] } : {}),
        opacity,
      },
    ];
  }
  if (element.type === Rect)
    return [
      {
        kind: 'fill',
        color: props.color as string,
        commands: rectCommands(
          Number(value(props.x)),
          Number(value(props.y)),
          Number(value(props.width)),
          Number(value(props.height)),
        ),
        opacity,
      },
    ];
  if (element.type === Text)
    return [
      {
        kind: 'text',
        color: props.color as string,
        text: value(props.text) as string,
        x: Number(value(props.x)),
        y: Number(value(props.y)),
        size: (props.font as ReturnType<typeof font>).getSize(),
        opacity,
      },
    ];
  if (typeof element.type === 'function')
    return nativePaints((element.type as (props: unknown) => ReactNode)(props), opacity);
  return [];
}
interface ComparisonOptions {
  staticMode?: boolean;
  viewport?: Viewport;
  visibleBars?: NativeVisibleBar[];
  paneMax?: number;
  bars?: NativeVisibleBar[];
}
function recordPlots(plots: PlotOutput[], options: ComparisonOptions = {}) {
  const active = options.viewport ?? viewport;
  // Held projections read the captured pane range; gestures use shared overrides.
  const activeFrame =
    options.staticMode && options.paneMax !== undefined
      ? createNativeChartFrameFromPanes({
          dimensions: frame.dimensions,
          panes: frame.panes.map((pane) => (pane.id === 'study' ? { ...pane, yMax: options.paneMax! } : pane)),
        })
      : frame;
  const sourceBars = options.bars ?? bars;
  const shown = options.visibleBars ?? sourceBars;
  const shared = {
    startTime: { value: active.startTime },
    endTime: { value: active.endTime },
    priceMin: { value: active.priceMin },
    priceMax: { value: active.priceMax },
  };
  const paneRanges = { value: options.paneMax ? { study: { yMin: 0, yMax: options.paneMax } } : {} };
  const native = nativePaints(
    NativeIndicatorPlotLayerImpl({
      bars: sourceBars,
      frame: activeFrame,
      plots,
      visibleBars: shown,
      totalBarCount: sourceBars.length,
      indicatorPaneInfo: info,
      sharedViewport: shared,
      paneRangeOverrides: paneRanges,
      textFont: font(12),
      staticProjection: options.staticMode
        ? createNativeChartProjection({ frame: activeFrame, viewport: active })
        : undefined,
    }),
  );
  const { ctx, paints } = webContext();
  const renderer = new TealchartRenderer(
    ctx,
    { width: 400, height: 220, showVolume: false, devicePixelRatio: 1 },
    { left: 0, right: 0, top: 0, bottom: 20 },
  );
  const adapter = renderer as unknown as {
    renderPlotsInPane(
      plots: PlotOutput[],
      bars: Bar[],
      viewport: Viewport,
      pane: { top: number; height: number; yMin: number; yMax: number },
    ): void;
  };
  for (const pane of activeFrame.panes) {
    const routed = plots.filter((plot) => {
      const target =
        plot.forceOverlay ||
        !plot.scriptId ||
        (info as Record<string, NativeIndicatorPaneInfo>)[plot.scriptId]?.overlay !== false
          ? 'main'
          : 'study';
      return target === pane.id;
    });
    if (routed.length)
      adapter.renderPlotsInPane(routed, sourceBars, active, {
        top: pane.top,
        height: pane.height,
        yMin: pane.id === 'main' ? active.priceMin : 0,
        yMax: pane.id === 'main' ? active.priceMax : (options.paneMax ?? 100),
      });
  }
  return { native: normalize(native), web: normalize(paints) };
}
function compare(plots: PlotOutput[], options: ComparisonOptions = {}) {
  const { native, web } = recordPlots(plots, options);
  expect(native).toEqual(web);
  return native;
}
const upper = plot({ id: 'upper', values: [20, 30, 40, 50, 60], display: 0 });
const lower = plot({ id: 'lower', values: [10, 15, 20, 25, 30], display: 0 });
const fill = plot({ id: 'fill', type: 'fill', plot1Id: 'upper', plot2Id: 'lower', color: '#aabbcc80', values: [] });
const marker = plot({
  type: 'plotshape',
  location: 'absolute',
  shape: 'circle',
  size: 'normal',
  values: [null, null, 50, null, null],
});

describe('native/web plot adapter comparisons', () => {
  it.each([false, true])('compares line and historical tracking geometry (static=%s)', (staticMode) => {
    const paints = compare([plot({ trackprice: true })], {
      staticMode,
      viewport: { ...viewport, endTime: 2000 },
      visibleBars: bars.slice(0, 3),
    });
    expect(
      paints.some(
        (paint) =>
          paint.kind === 'stroke' &&
          paint.dash?.join(',') === '2,3' &&
          JSON.stringify(paint.commands) === '[["M",0,100],["L",400,100]]',
      ),
    ).toBe(true);
  });
  it('retains the residual when show_last=1 and all plot positions are shifted outside history', () => {
    expect(compare([plot({ trackprice: true, showLast: 1, offset: -99999 })])).toHaveLength(1);
  });
  it('tracks the latest finite value and its current color', () => {
    compare([
      plot({
        trackprice: true,
        values: [10, 20, 30, 40, null],
        color: ['#ff000080', '#ff000080', '#00ff0080', '#0000ff80', null],
      }),
    ]);
  });
  it.each([false, true])('compares fill gap islands (fillgaps=%s)', (fillgaps) => {
    compare([{ ...upper, values: [20, 30, null, 50, 60] }, lower, { ...fill, fillgaps }]);
  });
  it('compares fill color transitions and na-color holes', () => {
    compare([upper, lower, { ...fill, color: ['#ff000080', '#ff000080', null, '#0000ff80', '#0000ff80'] }]);
  });
  it('applies show_last to destination fill segments', () => {
    expect(compare([upper, lower, { ...fill, showLast: 2 }])).toHaveLength(1);
  });
  it('samples both fill boundaries at their shifted bar indices', () => {
    compare([{ ...upper, offset: 1 }, { ...lower, offset: -1 }, fill]);
  });
  it('uses hidden hlines as fill boundaries', () => {
    compare([
      plot({ id: 'upper', type: 'hline', price: 80, display: 0 }),
      plot({ id: 'lower', type: 'hline', price: 20, display: 0 }),
      fill,
    ]);
  });
  it('compares vertical gradient stop coordinates, alpha and polygon masks', () => {
    compare([
      upper,
      lower,
      {
        ...fill,
        color: undefined,
        gradient: {
          topValues: [80, 80, 80, 80, 80],
          bottomValues: [20, 20, 20, 20, 20],
          topColors: Array(5).fill('#ff000080'),
          bottomColors: Array(5).fill('#0000ff40'),
        },
      },
    ]);
  });
  it.each([false, true])('compares per-bar gradient stops and transparent endpoints (static=%s)', (staticMode) => {
    compare(
      [
        upper,
        lower,
        {
          ...fill,
          gradient: {
            topValues: [80, 70, 20, 50, 90],
            bottomValues: [20, 30, 80, 50, 10],
            topColors: ['#ff000080', '#00ff0040', null, '#ffff0080', '#11223380'],
            bottomColors: ['#0000ff40', null, '#0000ff80', '#00ffff40', '#44556640'],
          },
        },
      ],
      { staticMode },
    );
  });
  it.each([false, true])('breaks gradient islands at invalid stops and fully na colors (static=%s)', (staticMode) => {
    compare(
      [
        upper,
        lower,
        {
          ...fill,
          fillgaps: true,
          gradient: {
            topValues: [80, 80, null, 80, 80],
            bottomValues: [20, 20, 20, 20, 20],
            topColors: ['#ff000080', '#ff000080', '#ff000080', null, '#ff000080'],
            bottomColors: ['#0000ff40', '#0000ff40', '#0000ff40', null, '#0000ff40'],
          },
        },
      ],
      { staticMode },
    );
  });
  it.each([false, true])('projects study gradient stops with held or live pane ranges (static=%s)', (staticMode) => {
    compare(
      [
        { ...upper, scriptId: 's' },
        { ...lower, scriptId: 's' },
        {
          ...fill,
          scriptId: 's',
          gradient: {
            topValues: [80, 80, 80, 80, 80],
            bottomValues: [20, 20, 20, 20, 20],
            topColors: Array(5).fill('#ff000080'),
            bottomColors: Array(5).fill('#0000ff40'),
          },
        },
      ],
      { staticMode, paneMax: 200 },
    );
  });
  it.each([false, true])('honors hidden boundary show_last while bridging value gaps (static=%s)', (staticMode) => {
    compare([{ ...upper, showLast: 3, values: [20, 30, 40, null, 60] }, lower, { ...fill, fillgaps: true }], {
      staticMode,
    });
  });
  it.each([
    'circle',
    'square',
    'diamond',
    'triangleup',
    'triangledown',
    'arrowup',
    'arrowdown',
    'cross',
    'xcross',
    'flag',
    'labelup',
    'labeldown',
  ] as const)('compares %s marker geometry', (shape) => {
    compare([{ ...marker, shape }]);
    compare([{ ...marker, shape }], { staticMode: true });
  });
  it.each(['tiny', 'small', 'normal', 'large', 'huge', 'auto'] as const)(
    'compares %s glyph and label font metrics',
    (size) => {
      compare([{ ...marker, type: 'plotchar', char: '↗', text: 'A\nBB', size }]);
      compare([{ ...marker, type: 'plotchar', char: '↗', text: 'A\nBB', size }], { staticMode: true });
    },
  );
  it.each(['abovebar', 'belowbar', 'top', 'bottom', 'absolute'] as const)(
    'compares multiline %s label alignment',
    (location) => {
      compare([{ ...marker, location, text: 'A\r\nBB' }]);
      compare([{ ...marker, location, text: 'A\r\nBB' }], { staticMode: true });
    },
  );
  it('keeps text when an explicit empty plotchar suppresses the glyph', () => {
    compare([{ ...marker, type: 'plotchar', char: '', text: 'Text' }]);
  });
  it.each([false, true])('compares study and forced-overlay backgrounds during a pan (static=%s)', (staticMode) => {
    const colors = ['#11223340', null, '#44556680', '#77889940', '#abcdef80'];
    compare(
      [
        plot({ type: 'bgcolor', id: 'study', scriptId: 's', color: colors, showLast: 3 }),
        plot({ type: 'bgcolor', id: 'overlay', scriptId: 's', forceOverlay: true, color: colors, showLast: 3 }),
      ],
      {
        staticMode,
        viewport: { ...viewport, startTime: 1000, endTime: 4000, priceMax: 200 },
        visibleBars: bars.slice(1),
        paneMax: 200,
      },
    );
  });
  it('resolves shifted line positions across loaded session gaps', () => {
    const gapped = bars.map((bar, index) => ({ ...bar, time: [0, 1000, 5000, 6000, 7000][index]! }));
    compare([plot({ offset: 1 })], { bars: gapped, viewport: { ...viewport, endTime: 7000 } });
  });
  it('selects source history outside the visible window for a negative marker offset', () => {
    compare([{ ...marker, offset: -2 }], { viewport: { ...viewport, endTime: 1000 }, visibleBars: bars.slice(0, 2) });
  });
  it('compares positive and negative plotarrow glyphs and ignores hidden-color magnitudes', () => {
    compare([
      plot({
        type: 'plotarrow',
        values: [5, -10, 0, null, 100],
        color: ['#00ff0080', '#ff000080', '#00ff0080', '#00ff0080', null],
        minHeight: 6,
        maxHeight: 30,
      }),
    ]);
  });
  it('compares runtime-resolved default plotarrow colors through the actual nested adapter', () => {
    // The worker resolves directional defaults before the native adapter sees
    // PlotOutput (execute.ts plotarrow). Zero and na have no color or glyph.
    const paints = compare([
      plot({
        type: 'plotarrow',
        color: ['#4CAF50', '#F23645', null, null, '#4CAF50'],
        values: [5, -10, null, null, 100],
      }),
    ]);
    expect(paints.map((paint) => paint.color)).toEqual(expect.arrayContaining(['#4CAF50', '#F23645']));
  });
  it('recomputes plotarrow scale during a historical pan', () => {
    compare([plot({ type: 'plotarrow', values: [5, -10, 0, null, 100], minHeight: 6, maxHeight: 30 })], {
      viewport: { ...viewport, endTime: 2000 },
      visibleBars: bars.slice(0, 3),
    });
  });
  it('matches hline defaults and suppresses explicit na colors', () => {
    compare([
      plot({ type: 'hline', price: 50, color: undefined }),
      plot({ type: 'hline', id: 'na', price: 80, color: [null] }),
    ]);
  });
});

// TradingView v6 plotbar remarks: all-four extrema and any unavailable field suppresses the glyph.
// https://www.tradingview.com/pine-script-reference/v6/#fun_plotbar
// These are semantic draw-command witnesses, independent of proprietary pixel metrics.
describe('TOP20 job 7 documented OHLC rendering contract', () => {
  for (const family of ['plotbar', 'plotcandle'] as const) {
    for (const field of ['openValues', 'highValues', 'lowValues', 'closeValues'] as const) {
      it.each([false, true])(
        `${family} retains raw ${field} while normalizing and suppressing glyphs (static=%s)`,
        (staticMode) => {
          const fields = ['openValues', 'highValues', 'lowValues', 'closeValues'];
          const supplied = [10, 3, 7, 20];
          const args = supplied.map((value, index) =>
            fields[index] === field ? `bar_index == 0 ? ${value} : na` : `${value}`,
          );
          const source = `//@version=6\nindicator("OHLC documented witness")\n${family}(${args.join(', ')}, title="Raw", color=#112233)`;
          const result = executeScript(parse(source), bars);
          expect(result.errors).toEqual([]);
          expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
          const raw = result.plots.find((candidate) => candidate.title === 'Raw')!;
          expect(raw.type).toBe(family);
          for (const [index, name] of fields.entries()) {
            expect(raw[name as typeof field]).toEqual(
              bars.map((_, i) => (name === field && i > 0 ? null : supplied[index])),
            );
          }
          const before = JSON.stringify(raw);
          // A present values mask forces each renderer to validate the raw quartet itself.
          const drawing = { ...raw, values: bars.map(() => 20), color: '#112233' };
          const recorded = recordPlots([drawing], { staticMode });
          for (const [layer, paints] of Object.entries(recorded)) {
            const wickCommands =
              family === 'plotcandle' && layer === 'native'
                ? rectCommands(-0.5, 160, 1, 34)
                : [
                    ['M', 0, 160],
                    ['L', 0, 194],
                  ];
            expect(
              paints.filter(
                (paint) =>
                  JSON.stringify(paint.commands?.slice(0, wickCommands.length)) === JSON.stringify(wickCommands),
              ),
            ).toHaveLength(1);
            expect(
              paints
                .flatMap((paint) => paint.commands ?? [])
                .filter((command) => command[0] === 'M')
                .every((command) => Number(command[1]) <= 60),
            ).toBe(true);
          }
          expect(JSON.stringify(raw)).toBe(before);
        },
      );
    }
  }
});

// TradingView's vertical-gradients announcement defines the IDs as a mask.
// https://www.tradingview.com/blog/en/pine-script-vertical-gradients-33586/
// Endpoint values and colors determine the gradient independently of that mask.
describe('TOP20 job 8 documented hline gradient rendering contract', () => {
  for (const boundary of ['hline', 'plot'] as const) {
    const sourcePrefix = `//@version=6\nindicator("Documented gradient")\nupper=${boundary}(10, display=display.none)\nlower=${boundary}(0, display=display.none)`;
    for (const [binding, call] of [
      ['mixed', 'fill(upper, lower, 8, 2, color.red, color.blue, title="Gradient")'],
      ['positional', 'fill(upper, lower, 8, 2, color.red, color.blue, "Gradient")'],
      [
        'named',
        `fill(bottom_color=color.blue, ${boundary}2=lower, top_value=8, ${boundary}1=upper, bottom_value=2, top_color=color.red, title="Gradient")`,
      ],
    ]) {
      it.each([false, true])(
        `renders ${binding} ${boundary} masks independently of gradient endpoints (static=%s)`,
        (staticMode) => {
          const result = executeScript(parse(`${sourcePrefix}\n${call}`), bars);
          expect(result.errors).toEqual([]);
          expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
          const [upper, lower] = result.plots.filter((candidate) => candidate.type === boundary);
          if (boundary === 'hline') {
            expect(upper?.price).toBe(10);
            expect(lower?.price).toBe(0);
          } else {
            expect(upper?.values).toEqual(bars.map(() => 10));
            expect(lower?.values).toEqual(bars.map(() => 0));
          }
          const fill = result.plots.find((candidate) => candidate.title === 'Gradient');
          expect(fill).toMatchObject({
            type: 'fill',
            plot1Id: upper?.id,
            plot2Id: lower?.id,
            gradient: {
              topValues: bars.map(() => 8),
              bottomValues: bars.map(() => 2),
              topColors: bars.map(() => '#F23645'),
              bottomColors: bars.map(() => '#2962FF'),
            },
          });
          const before = JSON.stringify(result.plots);
          const paints = compare(result.plots, { staticMode });
          expect(paints).toHaveLength(4);
          for (const paint of paints) {
            expect(paint.kind).toBe('fill');
            expect(paint.color).toEqual({
              from: [0, 184],
              to: [0, 196],
              stops: [
                [0, '#F23645'],
                [1, '#2962FF'],
              ],
            });
            expect(paint.commands?.filter((command) => command[0] !== 'Z').map((command) => command[2])).toEqual([
              180, 180, 200, 200,
            ]);
          }
          expect(JSON.stringify(result.plots)).toBe(before);
        },
      );
    }
    it.each([false, true])(`keeps the mixed ${boundary} color/title overload flat (static=%s)`, (staticMode) => {
      const result = executeScript(parse(`${sourcePrefix}\nfill(upper, lower, color.blue, title="Flat")`), bars);
      expect(result.errors).toEqual([]);
      const fill = result.plots.find((candidate) => candidate.title === 'Flat');
      expect(fill?.gradient).toBeUndefined();
      expect(fill?.color).toEqual(bars.map(() => '#2962FF'));
      const paints = compare(result.plots, { staticMode });
      expect(paints).toHaveLength(4);
      expect(paints.every((paint) => paint.color === '#2962FF')).toBe(true);
    });
  }
});
