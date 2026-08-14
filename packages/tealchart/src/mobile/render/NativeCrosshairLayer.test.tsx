import type { ReactElement, ReactNode } from 'react';
import type { RenderOptions } from '../../types';

import { matchFont, RoundedRect } from '@shopify/react-native-skia';
import { describe, expect, it } from 'vitest';

import { resolveNativeCrosshairContextMenuButtonLayout } from '../interaction/nativeCrosshairContextMenu';
import { createNativeChartFrameFromPanes } from './nativeChartFrame';
import { NativeCrosshairLayer } from './NativeCrosshairLayer';

function shared<T>(value: T) {
  return { value };
}

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

function valueOf<T>(prop: T | { value: T }): T {
  if (typeof prop === 'object' && prop !== null && 'value' in prop) return (prop as { value: T }).value;
  return prop as T;
}

const frame = createNativeChartFrameFromPanes({
  dimensions: {
    width: 390,
    height: 420,
    margins: { bottom: 32, left: 62, right: 90, top: 24 },
  },
  panes: [{ id: 'main', type: 'main', top: 24, height: 364, yMin: 63000, yMax: 64000 }],
});

const sharedViewport = {
  startTime: shared(0),
  endTime: shared(60_000),
  priceMin: shared(63000),
  priceMax: shared(64000),
};

function renderCrosshair(hasContextMenu = false) {
  return NativeCrosshairLayer({
    axisFont: matchFont({ fontSize: 11 }),
    crosshair: {
      visible: shared(true),
      x: shared(200),
      y: shared(180),
      dragOriginX: shared(200),
      dragOriginY: shared(180),
    },
    frame,
    hasContextMenu,
    options: { crosshairColor: '#888888', backgroundColor: '#131722' } as RenderOptions,
    pricePrecision: 0.1,
    sharedViewport,
  });
}

// The crosshair renders its own price-axis tag rather than going through the
// shared lane primitives, so nothing else guards its geometry. These pin it
// before it is moved onto the shared renderer.
describe('NativeCrosshairLayer price axis tag', () => {
  it('pins the price tag to the crosshair rather than any stacked position', () => {
    const boxes = collectElementsByType(renderCrosshair(), RoundedRect);
    const priceBox = boxes[0];

    expect(valueOf<number>(priceBox.props.y) + valueOf<number>(priceBox.props.height) / 2).toBe(180);
  });

  it('sizes the price tag from its text, not the whole axis lane', () => {
    const boxes = collectElementsByType(renderCrosshair(), RoundedRect);
    const priceBox = boxes[0];
    const laneWidth = frame.dimensions.width - frame.priceAxisLeft;

    expect(valueOf<number>(priceBox.props.width)).toBeGreaterThan(0);
    expect(valueOf<number>(priceBox.props.width)).toBeLessThan(laneWidth);
  });

  it('keeps the price and time tags the same height', () => {
    const boxes = collectElementsByType(renderCrosshair(), RoundedRect);

    expect(valueOf<number>(boxes[0].props.height)).toBe(valueOf<number>(boxes[1].props.height));
  });

  // The "+" button is positioned from the price label's measured width, so any
  // change to how that width is derived moves the button and its tap target.
  // Unifying the crosshair onto the full-lane layout would do exactly that.
  it('moves the context menu button with the price tag width', () => {
    const short = resolveNativeCrosshairContextMenuButtonLayout(frame, 180, 0.1, '1.0');
    const long = resolveNativeCrosshairContextMenuButtonLayout(frame, 180, 0.1, '123,456.7890');

    expect(long.centerX).toBeLessThan(short.centerX);
  });
});
