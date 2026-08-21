import type { ReactElement, ReactNode } from 'react';

import { Path as SkiaPath, Rect, Line as SkiaLine } from '@shopify/react-native-skia';
import { describe, expect, it, vi } from 'vitest';

import { NativeAxisChromeLayer } from './NativeAxisChromeLayer';
import { NativeChartChromeLayerImpl } from './NativeChartChromeLayer';
import { createNativeChartFrameFromPanes } from './nativeChartFrame';

function walkElements(node: ReactNode, visitor: (element: ReactElement) => void): void {
  if (node === null || node === undefined || typeof node === 'boolean') return;
  if (Array.isArray(node)) {
    for (const child of node) walkElements(child, visitor);
    return;
  }
  if (typeof node !== 'object' || !('props' in node)) return;

  const element = node as ReactElement;
  visitor(element);
  walkElements(element.props.children as ReactNode, visitor);
}

function collectElementsByType(root: ReactNode, type: unknown): ReactElement[] {
  const elements: ReactElement[] = [];
  walkElements(root, (element) => {
    if (element.type === type) elements.push(element);
  });
  return elements;
}

const frame = createNativeChartFrameFromPanes({
  dimensions: {
    width: 390,
    height: 480,
    margins: { bottom: 32, left: 62, right: 76, top: 36 },
  },
  panes: [{ id: 'main', type: 'main', top: 36, height: 412, yMin: 62000, yMax: 66000 }],
});

describe('NativeChartChromeLayer', () => {
  it('keeps canvas chrome limited to chart-derived surfaces', () => {
    const layer = NativeChartChromeLayerImpl({
      backgroundColor: '#101418',
      frame,
      gridColor: '#222831',
      separatorColor: '#d1d4dc',
    });

    const rootBackgrounds = collectElementsByType(layer, Rect);

    expect(collectElementsByType(layer, NativeAxisChromeLayer)).toHaveLength(1);
    expect(rootBackgrounds).toHaveLength(1);
    expect(rootBackgrounds[0].props).toMatchObject({
      x: 0,
      y: 0,
      width: frame.dimensions.width,
      height: frame.dimensions.height,
      color: '#101418',
    });
  });

  it('emits transparent price-axis chrome with full-width time-axis primitives', () => {
    const layer = NativeAxisChromeLayer({
      backgroundColor: '#101418',
      frame,
      gridColor: '#222831',
      separatorColor: '#d1d4dc',
    });
    const rects = collectElementsByType(layer, Rect);
    const lines = collectElementsByType(layer, SkiaLine);

    expect(rects).toHaveLength(1);
    expect(rects[0].props).toMatchObject({
      x: frame.contentLeft,
      y: frame.timeAxisTop,
      width: frame.contentWidth,
      height: frame.timeAxisBottom - frame.timeAxisTop,
      color: '#101418',
    });
    expect(lines).toHaveLength(1);
    expect(lines[0].props).toMatchObject({
      p1: { x: frame.contentLeft, y: frame.timeAxisTop + 0.5 },
      p2: { x: frame.contentRight, y: frame.timeAxisTop + 0.5 },
      color: '#222831',
      strokeWidth: 1,
    });
  });

  // One path for every separator rather than a line each, so the element count
  // stops tracking pane geometry - mount and unmount happen on the React commit
  // and are the half of a pane maximize that cannot be made late.
  it('draws pane separators as a single path, skipping collapsed panes', () => {
    const twoPanes = createNativeChartFrameFromPanes({
      dimensions: frame.dimensions,
      panes: [
        { id: 'main', type: 'main', top: 36, height: 300, yMin: 62000, yMax: 66000 },
        { id: 'pane_1', type: 'indicator', top: 336, height: 112, yMin: 0, yMax: 100 },
      ],
    });
    const layer = NativeAxisChromeLayer({
      backgroundColor: '#101418',
      frame: twoPanes,
      gridColor: '#222831',
      separatorColor: '#d1d4dc',
    });
    const paths = collectElementsByType(layer, SkiaPath);

    expect(paths).toHaveLength(1);
    expect(paths[0].props).toMatchObject({ color: '#d1d4dc', style: 'stroke', strokeWidth: 2 });

    const drawn = (paths[0].props as { path: { value: { lineTo: unknown } } }).path.value;
    expect(vi.mocked(drawn.lineTo as never).mock.calls).toEqual([[twoPanes.contentRight, 336]]);
  });

  // Maximising the indicator pane collapses main, which is NOT the last pane, so
  // it is the one the separator loop would otherwise draw - on a boundary the
  // pane below already occupies, doubling the stroke.
  it('emits no separator segment for a pane a maximize has collapsed', () => {
    const collapsed = createNativeChartFrameFromPanes({
      dimensions: frame.dimensions,
      panes: [
        { id: 'main', type: 'main', top: 36, height: 0, yMin: 62000, yMax: 66000 },
        { id: 'pane_1', type: 'indicator', top: 36, height: 412, yMin: 0, yMax: 100 },
      ],
    });
    const layer = NativeAxisChromeLayer({
      backgroundColor: '#101418',
      frame: collapsed,
      gridColor: '#222831',
      separatorColor: '#d1d4dc',
    });
    const drawn = (collectElementsByType(layer, SkiaPath)[0].props as { path: { value: { lineTo: unknown } } }).path
      .value;

    expect(vi.mocked(drawn.lineTo as never).mock.calls).toEqual([]);
  });

  // Maximising main pushes its boundary onto the chart's bottom edge, where the
  // time-axis border already draws. A divider there is a 2px line on the frame.
  it('emits no separator on a boundary that has reached the time axis', () => {
    const mainMaximized = createNativeChartFrameFromPanes({
      dimensions: frame.dimensions,
      panes: [
        { id: 'main', type: 'main', top: 36, height: 412, yMin: 62000, yMax: 66000 },
        { id: 'pane_1', type: 'indicator', top: 448, height: 0, yMin: 0, yMax: 100 },
      ],
    });
    const layer = NativeAxisChromeLayer({
      backgroundColor: '#101418',
      frame: mainMaximized,
      gridColor: '#222831',
      separatorColor: '#d1d4dc',
    });
    const drawn = (collectElementsByType(layer, SkiaPath)[0].props as { path: { value: { lineTo: unknown } } }).path
      .value;

    expect(mainMaximized.panes[0].bottom).toBe(mainMaximized.timeAxisTop);
    expect(vi.mocked(drawn.lineTo as never).mock.calls).toEqual([]);
  });
});

