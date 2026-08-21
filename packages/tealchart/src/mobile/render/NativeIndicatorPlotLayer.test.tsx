import type { PlotOutput } from '@tealstreet/tealscript';
import type { NativeVisibleBar } from './nativeVisibleBars';

import type { ReactElement, ReactNode } from 'react';

import { Group, Path as SkiaPath } from '@shopify/react-native-skia';
import { describe, expect, it, vi } from 'vitest';

// The plot components are invoked as plain functions here, outside any renderer,
// so React's own useMemo has no dispatcher to bind to. Evaluating it eagerly is
// exactly what a memo does on first render, which is all this test needs.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, useMemo: <T,>(factory: () => T) => factory() };
});

import { createNativeChartFrameFromPanes } from './nativeChartFrame';
import { createNativeChartProjection } from './nativeProjection';
import { getNativeIndicatorPlotPoints, NativeIndicatorPlotLayerImpl } from './NativeIndicatorPlotLayer';

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

function findProps(root: ReactNode, type: unknown): Array<Record<string, unknown>> {
  const found: Array<Record<string, unknown>> = [];
  walkElements(root, (element) => {
    if (element.type === type) found.push(element.props);
  });
  return found;
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
  const plots = [
    { type: 'plot', id: 'p1', scriptId: 's1', style: 'line', values: [10, 12], color: '#fff' },
  ] as never;

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
});

