import type { ReactElement, ReactNode } from 'react';

import { describe, expect, it } from 'vitest';
import {
  Line as SkiaLine,
  Rect,
} from '@shopify/react-native-skia';

import { NativeAxisChromeLayer } from './NativeAxisChromeLayer';
import { NativeChartChromeLayer } from './NativeChartChromeLayer';
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
    const layer = NativeChartChromeLayer({
      backgroundColor: '#101418',
      frame,
      gridColor: '#222831',
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
});
