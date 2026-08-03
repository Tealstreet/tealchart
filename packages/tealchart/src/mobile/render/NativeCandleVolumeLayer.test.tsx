import type { ReactElement, ReactNode } from 'react';
import type { RenderOptions } from '../../types';
import type { NativeVisibleBar } from './nativeVisibleBars';

import { Group, Path as SkiaPath } from '@shopify/react-native-skia';
import { describe, expect, it } from 'vitest';

import {
  getNativeLiveCandleGeometry,
  getNativeLiveVolumeGeometry,
  NativeCandleVolumeLayer,
} from './NativeCandleVolumeLayer';
import { createNativeChartFrameFromPanes } from './nativeChartFrame';

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

function renderFunctionChildren(root: ReactNode): ReactNode[] {
  const children: ReactElement[] = [];
  walkElements(root, (element) => {
    if (typeof element.type === 'function' && element.type !== Group && element.type !== SkiaPath) {
      children.push(element);
    }
  });
  return children.map((child) => (child.type as (props: unknown) => ReactNode)(child.props));
}

function valueOf(prop: { value: number } | number): number {
  return typeof prop === 'number' ? prop : prop.value;
}

const frame = createNativeChartFrameFromPanes({
  dimensions: {
    width: 390,
    height: 420,
    margins: { bottom: 32, left: 62, right: 76, top: 24 },
  },
  panes: [{ id: 'main', type: 'main', top: 24, height: 364, yMin: 63000, yMax: 64000 }],
});

const options = {
  upColor: '#12c48b',
  downColor: '#f04465',
} as RenderOptions;

const sharedViewport = {
  startTime: shared(0),
  endTime: shared(60_000),
  priceMin: shared(63000),
  priceMax: shared(64000),
};
const bars: NativeVisibleBar[] = [
  {
    time: 15_000,
    interval: 15_000,
    x: 0,
    open: 63300,
    high: 63600,
    low: 63200,
    close: 63500,
    volume: 100,
  },
  {
    time: 30_000,
    interval: 15_000,
    x: 0,
    open: 63600,
    high: 63700,
    low: 63350,
    close: 63400,
    volume: 200,
  },
];

describe('NativeCandleVolumeLayer', () => {
  function renderFirstCandle(startTime: number, endTime: number) {
    return getNativeLiveCandleGeometry({
      bar: bars[0],
      frame,
      sharedViewport: {
        ...sharedViewport,
        startTime: shared(startTime),
        endTime: shared(endTime),
      },
    });
  }

  it('emits wick, body, and volume primitives for visible candles', () => {
    const layer = NativeCandleVolumeLayer({
      frame,
      options,
      sharedViewport,
      visibleBars: bars,
      volumeHeight: 80,
    });
    const clipGroups = collectElementsByType(layer, Group).filter((element) => element.props.clip);
    const renderedCandles = renderFunctionChildren(layer);
    const upPaths = collectElementsByType(renderedCandles[0], SkiaPath);
    const downPaths = collectElementsByType(renderedCandles[1], SkiaPath);
    const upVolumePaths = collectElementsByType(renderedCandles[2], SkiaPath);
    const downVolumePaths = collectElementsByType(renderedCandles[3], SkiaPath);
    const upGeometry = getNativeLiveCandleGeometry({ bar: bars[0], frame, sharedViewport });
    const downGeometry = getNativeLiveCandleGeometry({ bar: bars[1], frame, sharedViewport });
    const upVolumeGeometry = getNativeLiveVolumeGeometry({
      bar: bars[0],
      frame,
      maxVolume: 200,
      sharedViewport,
      volumeHeight: 80,
    });
    const downVolumeGeometry = getNativeLiveVolumeGeometry({
      bar: bars[1],
      frame,
      maxVolume: 200,
      sharedViewport,
      volumeHeight: 80,
    });

    expect(clipGroups).toHaveLength(1);
    expect(clipGroups[0]?.props.clip).toEqual({
      x: frame.contentLeft,
      y: frame.mainPane.top,
      width: frame.priceAxisRight - frame.contentLeft,
      height: frame.timeAxisBottom - frame.mainPane.top,
    });
    expect(upPaths).toHaveLength(1);
    expect(downPaths).toHaveLength(1);
    expect(upPaths[0].props.color).toBe('#12c48b');
    expect(downPaths[0].props.color).toBe('#f04465');
    expect(upVolumePaths).toHaveLength(1);
    expect(downVolumePaths).toHaveLength(1);
    expect(upGeometry.visible).toBe(true);
    expect(upGeometry.bodyHeight).toBeGreaterThan(0);
    expect(upGeometry.bodyX + upGeometry.bodyWidth / 2).toBe(upGeometry.x);
    expect(downGeometry.visible).toBe(true);
    expect(downGeometry.bodyHeight).toBeGreaterThan(0);
    expect(downGeometry.bodyX + downGeometry.bodyWidth / 2).toBe(downGeometry.x);
    expect(valueOf(upVolumePaths[0].props.opacity)).toBe(0.55);
    expect(upVolumeGeometry.bodyX).toBe(upGeometry.bodyX);
    expect(upVolumeGeometry.bodyWidth).toBe(upGeometry.bodyWidth);
    expect(upVolumeGeometry.bodyY + upVolumeGeometry.bodyHeight).toBe(frame.mainPane.bottom);
    expect(upVolumeGeometry.bodyHeight).toBe(40);
    expect(valueOf(downVolumePaths[0].props.opacity)).toBe(0.55);
    expect(downVolumeGeometry.bodyX).toBe(downGeometry.bodyX);
    expect(downVolumeGeometry.bodyWidth).toBe(downGeometry.bodyWidth);
    expect(downVolumeGeometry.bodyY + downVolumeGeometry.bodyHeight).toBe(frame.mainPane.bottom);
    expect(downVolumeGeometry.bodyHeight).toBe(80);
  });

  it('keeps OHLCV visible when paint extends into the right price-axis lane', () => {
    const axisLaneBar = {
      ...bars[0],
      time: 50_000,
    };
    const axisLaneVolumeGeometry = getNativeLiveVolumeGeometry({
      bar: axisLaneBar,
      frame,
      maxVolume: 200,
      sharedViewport,
      volumeHeight: 80,
    });

    expect(axisLaneVolumeGeometry.bodyX).toBeGreaterThan(frame.priceAxisLeft);
    expect(axisLaneVolumeGeometry.bodyX).toBeLessThan(frame.priceAxisRight);
    expect(axisLaneVolumeGeometry.opacity).toBe(0.55);
  });

  it('derives candle x and width from the shared viewport at render time', () => {
    const narrow = renderFirstCandle(0, 1_200_000);
    const wide = renderFirstCandle(0, 2_400_000);

    expect(narrow.x).toBeGreaterThan(wide.x);
    expect(narrow.bodyWidth).toBeGreaterThan(wide.bodyWidth);
  });

  it('derives candle y and body height from the shared price viewport at render time', () => {
    const normal = getNativeLiveCandleGeometry({ bar: bars[0], frame, sharedViewport });
    const scrunched = getNativeLiveCandleGeometry({
      bar: bars[0],
      frame,
      sharedViewport: {
        ...sharedViewport,
        priceMin: shared(63200),
        priceMax: shared(63600),
      },
    });

    expect(scrunched.bodyHeight).toBeGreaterThan(normal.bodyHeight);
    expect(scrunched.bodyY).not.toBe(normal.bodyY);
  });
});
