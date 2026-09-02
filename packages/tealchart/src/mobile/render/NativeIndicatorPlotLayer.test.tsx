import type { PlotOutput } from '@tealstreet/tealscript';
import type { ReactElement, ReactNode } from 'react';
import type { NativeVisibleBar } from './nativeVisibleBars';

import { Group, Rect, Path as SkiaPath } from '@shopify/react-native-skia';
import { describe, expect, it, vi } from 'vitest';

import { createNativeChartFrameFromPanes } from './nativeChartFrame';
import { getNativeIndicatorPlotPoints, NativeIndicatorPlotLayerImpl } from './NativeIndicatorPlotLayer';
import { createNativeChartProjection } from './nativeProjection';

// The plot components are invoked as plain functions here, outside any renderer,
// so React's own useMemo has no dispatcher to bind to. Evaluating it eagerly is
// exactly what a memo does on first render, which is all this test needs.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, useMemo: <T,>(factory: () => T) => factory() };
});

function walkElements(node: ReactNode, visitor: (element: ReactElement<Record<string, unknown>>) => void): void {
  if (node === null || node === undefined || typeof node === 'boolean') return;
  if (Array.isArray(node)) {
    for (const child of node) walkElements(child, visitor);
    return;
  }
  if (typeof node !== 'object' || !('props' in node)) return;
  const element = node as ReactElement<Record<string, unknown>>;
  visitor(element);
  walkElements((element.props as { children?: ReactNode }).children, visitor);
}

/** One level of component expansion; the paths live inside child components. */
function expandChildren(root: ReactNode): ReactNode[] {
  const rendered: ReactNode[] = [];
  walkElements(root, (element) => {
    if (typeof element.type === 'function' && element.type !== Group && element.type !== SkiaPath) {
      rendered.push((element.type as (props: unknown) => ReactNode)(element.props));
    }
  });
  return rendered;
}

function expandAll(root: ReactNode, levels = 4): ReactNode[] {
  let current = [root];
  const all = [...current];
  for (let level = 0; level < levels; level += 1) {
    current = current.flatMap((node) => expandChildren(node));
    all.push(...current);
  }
  return all;
}

function findProps(root: ReactNode, type: unknown): Array<Record<string, unknown>> {
  const found: Array<Record<string, unknown>> = [];
  walkElements(root, (element) => {
    if (element.type === type) found.push(element.props);
  });
  return found;
}

function findPathPropsWithCloseCalls(
  paths: Array<Record<string, unknown>>,
  color: string,
  closeCalls: number,
): { value: { close: unknown } } | undefined {
  return paths
    .filter((props) => props.color === color)
    .map((props) => props.path as { value: { close: unknown } })
    .find((path) => vi.mocked(path.value.close as never).mock.calls.length === closeCalls);
}

function bar(sourceIndex: number, time: number): NativeVisibleBar {
  return {
    close: 100 + sourceIndex,
    high: 101 + sourceIndex,
    interval: 1_000,
    low: 99 + sourceIndex,
    open: 100 + sourceIndex,
    sourceIndex,
    time,
    volume: 10,
    x: time / 100,
  };
}

function plot(overrides: Partial<PlotOutput> = {}): PlotOutput {
  return {
    color: '#00bcd4',
    id: 'plot',
    title: 'Plot',
    type: 'plot',
    values: [10, 11, 12, 13, 14],
    ...overrides,
  } as PlotOutput;
}

describe('NativeIndicatorPlotLayer', () => {
  it('aligns visible bars to original indicator value indexes', () => {
    const points = getNativeIndicatorPlotPoints({
      plot: plot(),
      totalBarCount: 5,
      visibleBars: [bar(2, 20_000), bar(3, 30_000)],
    });

    expect(points).toEqual([
      { interval: 1_000, time: 20_000, value: 12 },
      { interval: 1_000, time: 30_000, value: 13 },
    ]);
  });

  it('applies plot offset and showLast before drawing points', () => {
    const points = getNativeIndicatorPlotPoints({
      plot: plot({ offset: 2, showLast: 2 }),
      totalBarCount: 5,
      visibleBars: [bar(1, 10_000), bar(2, 20_000), bar(3, 30_000), bar(4, 40_000)],
    });

    expect(points).toEqual([
      { interval: 1_000, time: 32_000, value: 13 },
      { interval: 1_000, time: 42_000, value: 14 },
    ]);
  });
});

describe('indicator plot clip channel', () => {
  const frame = createNativeChartFrameFromPanes({
    dimensions: { width: 400, height: 600, margins: { top: 0, right: 58, bottom: 24, left: 0 } },
    panes: [
      { id: 'main', type: 'main', top: 0, height: 400, yMin: 0, yMax: 100 },
      { id: 'pane_1', type: 'indicator', top: 400, height: 176, yMin: 0, yMax: 100 },
    ],
  });
  const sharedViewport = {
    startTime: { value: 0 },
    endTime: { value: 60_000 },
    priceMin: { value: 0 },
    priceMax: { value: 100 },
  } as never;
  const visibleBars = [
    { close: 10, high: 11, low: 9, open: 10, time: 0, volume: 1, interval: 1_000, sourceIndex: 0, x: 10 },
    { close: 12, high: 13, low: 11, open: 12, time: 1_000, volume: 1, interval: 1_000, sourceIndex: 1, x: 30 },
  ] as never;
  const plots = [{ type: 'plot', id: 'p1', scriptId: 's1', style: 'line', values: [10, 12], color: '#fff' }] as never;

  function render(staticProjection: unknown) {
    return NativeIndicatorPlotLayerImpl({
      frame,
      indicatorPaneInfo: {},
      plots,
      sharedViewport,
      staticProjection: staticProjection as never,
      totalBarCount: 2,
      visibleBars,
    });
  }

  function renderWithFrame(targetFrame: typeof frame, staticProjection: unknown) {
    return NativeIndicatorPlotLayerImpl({
      frame: targetFrame,
      indicatorPaneInfo: {},
      plots,
      sharedViewport,
      staticProjection: staticProjection as never,
      totalBarCount: 2,
      visibleBars,
    });
  }

  // A plain-prop clip lands on the React commit while a derived path lands a
  // propagation later, so a pane whose height just changed paints clipped to the
  // new geometry and drawn at the old one. Each branch keeps both on one channel.
  it('gives the live branch a derived clip and the projected branch a plain one', () => {
    // Two component levels: the layer renders a plot component, which renders
    // the live-or-projected path component that owns the Group and its clip.
    const live = expandChildren(expandChildren(render(null)));
    const liveClip = findProps(live, Group)[0]?.clip;
    const livePath = findProps(live, SkiaPath)[0]?.path;

    expect(liveClip).toHaveProperty('value');
    expect(livePath).toHaveProperty('value');

    const projected = expandChildren(
      expandChildren(
        render(
          createNativeChartProjection({
            frame,
            paneRanges: { main: { yMin: 0, yMax: 100 } },
            viewport: { startTime: 0, endTime: 60_000 },
          }),
        ),
      ),
    );
    const projectedClip = findProps(projected, Group)[0]?.clip;
    const projectedPath = findProps(projected, SkiaPath)[0]?.path;

    expect(projectedClip).not.toHaveProperty('value');
    expect(projectedPath).not.toHaveProperty('value');
  });

  it('builds empty overlay plot paths when another pane has maximized the main pane away', () => {
    const collapsedMainFrame = createNativeChartFrameFromPanes({
      dimensions: { width: 400, height: 600, margins: { top: 0, right: 58, bottom: 24, left: 0 } },
      panes: [
        { id: 'main', type: 'main', top: 0, height: 0, yMin: 0, yMax: 100 },
        { id: 'pane_1', type: 'indicator', top: 0, height: 576, yMin: 0, yMax: 100 },
      ],
    });

    const live = expandChildren(expandChildren(renderWithFrame(collapsedMainFrame, null)));
    const livePath = findProps(live, SkiaPath)[0]?.path as { value: { moveTo: unknown; lineTo: unknown } };

    expect(vi.mocked(livePath.value.moveTo as never).mock.calls).toHaveLength(0);
    expect(vi.mocked(livePath.value.lineTo as never).mock.calls).toHaveLength(0);

    const projected = expandChildren(
      expandChildren(
        renderWithFrame(
          collapsedMainFrame,
          createNativeChartProjection({
            frame: collapsedMainFrame,
            paneRanges: { main: { yMin: 0, yMax: 100 } },
            viewport: { startTime: 0, endTime: 60_000 },
          }),
        ),
      ),
    );
    const projectedPath = findProps(projected, SkiaPath)[0]?.path as { moveTo: unknown; lineTo: unknown };

    expect(vi.mocked(projectedPath.moveTo as never).mock.calls).toHaveLength(0);
    expect(vi.mocked(projectedPath.lineTo as never).mock.calls).toHaveLength(0);
  });
});

describe('native Pine visual output rendering', () => {
  const frame = createNativeChartFrameFromPanes({
    dimensions: { width: 400, height: 600, margins: { top: 0, right: 58, bottom: 24, left: 0 } },
    panes: [
      { id: 'main', type: 'main', top: 0, height: 400, yMin: 0, yMax: 100 },
      { id: 'pane_1', type: 'indicator', top: 400, height: 176, yMin: 0, yMax: 100 },
    ],
  });
  const sharedViewport = {
    startTime: { value: 0 },
    endTime: { value: 60_000 },
    priceMin: { value: 0 },
    priceMax: { value: 100 },
  } as never;
  const visibleBars = [bar(0, 0), bar(1, 30_000), bar(2, 60_000)] as never;

  function renderVisuals(plots: PlotOutput[]) {
    return expandAll(
      NativeIndicatorPlotLayerImpl({
        frame,
        indicatorPaneInfo: { script: { overlay: false, paneId: 'pane_1' } },
        plots,
        sharedViewport,
        staticProjection: null,
        totalBarCount: 3,
        visibleBars,
      }),
    );
  }

  it('renders hline, fill, and bgcolor outputs instead of dropping non-plot TealScript visuals', () => {
    const upper = plot({ id: 'upper', scriptId: 'script', values: [60, null, 70] });
    const lower: PlotOutput = {
      color: '#787B86',
      id: 'lower',
      price: 45,
      scriptId: 'script',
      title: 'Lower',
      type: 'hline',
      values: [],
    };
    const fill: PlotOutput = {
      color: ['#00897b33', '#00897b33', '#d81b6033'],
      fillgaps: true,
      id: 'zone',
      plot1Id: upper.id,
      plot2Id: lower.id,
      scriptId: 'script',
      title: 'Zone',
      type: 'fill',
      values: [],
    };
    const background: PlotOutput = {
      color: [null, '#1565c033', '#1565c033'],
      id: 'background',
      scriptId: 'script',
      title: 'Background',
      type: 'bgcolor',
      values: [null, 1, 1],
    };

    const rendered = renderVisuals([upper, lower, fill, background]);
    const paths = findProps(rendered, SkiaPath);
    const rects = findProps(rendered, Rect);
    const pathColors = paths.map((props) => props.color);

    expect(pathColors).toContain('#787B86');
    expect(pathColors).toContain('#00897b33');
    expect(pathColors).toContain('#d81b6033');
    expect(rects.map((props) => props.color)).toEqual(['#1565c033', '#1565c033']);
  });

  it('keeps overlay plots in the main pane and separate-pane plots in their indicator pane', () => {
    const rendered = renderVisuals([
      plot({ id: 'overlay', forceOverlay: true, scriptId: 'script', values: [50, 51, 52] }),
      plot({ id: 'pane', scriptId: 'script', values: [10, 11, 12] }),
    ]);
    const paths = findProps(rendered, SkiaPath);
    const overlayPath = paths[0]?.path as { value: { moveTo: unknown } };
    const panePath = paths[1]?.path as { value: { moveTo: unknown } };

    expect(vi.mocked(overlayPath.value.moveTo as never).mock.calls[0]?.[1]).toBeLessThan(400);
    expect(vi.mocked(panePath.value.moveTo as never).mock.calls[0]?.[1]).toBeGreaterThanOrEqual(400);
  });

  it('renders plotcandle outputs with per-bar body, wick, and border colors, skipping na OHLC bars', () => {
    const rendered = renderVisuals([
      {
        color: ['#00aa00', '#aaaa00', '#aa0000'],
        borderColor: ['#ffffff', '#eeeeee', '#111111'],
        closeValues: [20, null, 30],
        highValues: [25, 40, 35],
        id: 'plotcandle_Custom',
        lowValues: [5, 10, 15],
        openValues: [10, 20, 25],
        scriptId: 'script',
        title: 'Custom',
        type: 'plotcandle',
        values: [20, null, 30],
        wickColor: ['#0000ff', '#00ffff', '#ff00ff'],
      },
    ]);
    const paths = findProps(rendered, SkiaPath);
    const bodyUpPath = findPathPropsWithCloseCalls(paths, '#00aa00', 1);
    const skippedBodyPath = findPathPropsWithCloseCalls(paths, '#aaaa00', 0);
    const wickUpPath = findPathPropsWithCloseCalls(paths, '#0000ff', 1);
    const borderDownPath = findPathPropsWithCloseCalls(paths, '#111111', 1);

    expect(paths.map((props) => props.color)).toEqual(
      expect.arrayContaining(['#00aa00', '#aa0000', '#0000ff', '#ff00ff', '#ffffff', '#111111']),
    );
    expect(bodyUpPath).toBeDefined();
    expect(skippedBodyPath).toBeDefined();
    expect(wickUpPath).toBeDefined();
    expect(borderDownPath).toBeDefined();
  });

  it('renders plotbar high-low bars with open and close ticks, skipping na OHLC bars', () => {
    const rendered = renderVisuals([
      {
        color: ['#00aa00', '#aaaa00', '#aa0000'],
        closeValues: [20, 30, 30],
        highValues: [25, null, 35],
        id: 'plotbar_Custom',
        lowValues: [5, 10, 15],
        openValues: [10, 20, 25],
        scriptId: 'script',
        title: 'Custom',
        type: 'plotbar',
        values: [20, null, 30],
      },
    ]);
    const paths = findProps(rendered, SkiaPath);
    const upPath = paths.find((props) => props.color === '#00aa00')?.path as {
      value: { lineTo: unknown; moveTo: unknown };
    };
    const skippedPath = paths.find((props) => props.color === '#aaaa00')?.path as {
      value: { lineTo: unknown; moveTo: unknown };
    };

    expect(vi.mocked(upPath.value.moveTo as never).mock.calls).toHaveLength(3);
    expect(vi.mocked(upPath.value.lineTo as never).mock.calls).toHaveLength(3);
    expect(vi.mocked(skippedPath.value.moveTo as never).mock.calls).toHaveLength(0);
    expect(vi.mocked(skippedPath.value.lineTo as never).mock.calls).toHaveLength(0);
  });

  it('renders plotarrow directions with per-bar colors and skips zero or na values', () => {
    const rendered = renderVisuals([
      {
        color: [null, '#00aa00', '#aa0000'],
        id: 'plotarrow_Move',
        maxHeight: 20,
        minHeight: 5,
        scriptId: 'script',
        title: 'Move',
        type: 'plotarrow',
        values: [0, 5, -10],
      },
    ]);
    const paths = findProps(rendered, SkiaPath);
    const upPath = paths.find((props) => props.color === '#00aa00')?.path as { value: { close: unknown } };
    const downPath = paths.find((props) => props.color === '#aa0000')?.path as { value: { close: unknown } };

    expect(paths.map((props) => props.color)).not.toContain('#2196F3');
    expect(vi.mocked(upPath.value.close as never).mock.calls).toHaveLength(1);
    expect(vi.mocked(downPath.value.close as never).mock.calls).toHaveLength(1);
  });

  it('renders plotarrow with TradingView-style default up and down colors', () => {
    const rendered = renderVisuals([
      {
        color: undefined as never,
        id: 'plotarrow_Default',
        scriptId: 'script',
        title: 'Default',
        type: 'plotarrow',
        values: [1, -1, 0],
      },
    ]);
    const paths = findProps(rendered, SkiaPath);
    const defaultUpPath = paths.find((props) => props.color === '#4CAF50')?.path as { value: { close: unknown } };
    const defaultDownPath = paths.find((props) => props.color === '#F23645')?.path as { value: { close: unknown } };

    expect(vi.mocked(defaultUpPath.value.close as never).mock.calls).toHaveLength(1);
    expect(vi.mocked(defaultDownPath.value.close as never).mock.calls).toHaveLength(1);
  });
});
