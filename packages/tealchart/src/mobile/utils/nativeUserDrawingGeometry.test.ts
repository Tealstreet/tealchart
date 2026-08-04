import type { Bar, Viewport } from '../../types';

import { describe, expect, it } from 'vitest';

import { createUserDrawingState } from '../../drawings';
import { createNativeChartFrameFromPanes } from '../render/nativeChartFrame';
import {
  createNativeUserDrawingCoordinateSpaces,
  resolveNativeUserDrawingInputPoint,
  resolveNativeUserDrawingSelectionPoint,
} from './nativeUserDrawingGeometry';

const frame = createNativeChartFrameFromPanes({
  dimensions: {
    width: 400,
    height: 300,
    margins: { bottom: 30, left: 50, right: 70, top: 10 },
  },
  panes: [{ id: 'main', type: 'main', top: 20, height: 200, yMin: 0, yMax: 1 }],
});

const viewport: Viewport = {
  startTime: 1000,
  endTime: 2000,
  priceMin: 100,
  priceMax: 200,
};

const bars: Bar[] = [
  { time: 1500, open: 120, high: 180, low: 110, close: 160, volume: 10 },
];

describe('native user drawing geometry', () => {
  it('maps native plot taps through the same chart span as native candles', () => {
    const point = resolveNativeUserDrawingInputPoint({
      bars,
      frame,
      state: createUserDrawingState(),
      viewport,
      x: 225,
      y: 120,
    });

    expect(point?.paneId).toBe('main');
    expect(point?.anchor.time).toBe(1500);
    expect(point?.anchor.price).toBe(150);
    expect(point?.position).toEqual({ x: 0.5, y: 0.5 });
  });

  it('uses the native time content boundary instead of the price axis width', () => {
    const spaces = createNativeUserDrawingCoordinateSpaces({ bars, frame, viewport });
    const space = spaces.get('main');

    expect(space?.chartLeft).toBe(frame.contentLeft);
    expect(space?.chartRight).toBe(frame.contentRight);
  });

  it('rejects drawing taps in the visible price-axis label lane', () => {
    const point = resolveNativeUserDrawingInputPoint({
      bars,
      frame,
      state: createUserDrawingState(),
      viewport,
      x: frame.priceAxisLeft + 4,
      y: 120,
    });

    expect(point).toBeNull();
  });

  it('accepts drawing taps immediately before the price-axis lane', () => {
    const point = resolveNativeUserDrawingInputPoint({
      bars,
      frame,
      state: createUserDrawingState(),
      viewport,
      x: frame.priceAxisLeft - 1,
      y: 120,
    });

    expect(point?.paneId).toBe('main');
  });

  it('resolves selection taps against the native drawing spaces', () => {
    const selection = resolveNativeUserDrawingSelectionPoint({
      bars,
      frame,
      viewport,
      x: 225,
      y: 120,
    });

    expect(selection?.point).toEqual({ x: 225, y: 120 });
    expect(selection?.spacesByPaneId.get('main')?.chartLeft).toBe(frame.contentLeft);
  });

  it('reuses provided drawing spaces for selection taps', () => {
    const spacesByPaneId = createNativeUserDrawingCoordinateSpaces({ bars, frame, viewport });
    const selection = resolveNativeUserDrawingSelectionPoint({
      bars,
      frame,
      spacesByPaneId,
      viewport,
      x: 225,
      y: 120,
    });

    expect(selection?.spacesByPaneId).toBe(spacesByPaneId);
  });

  it('rejects selection taps in the price-axis scrunch hit strip', () => {
    expect(
      resolveNativeUserDrawingSelectionPoint({
        bars,
        frame,
        viewport,
        x: frame.priceAxisHitLeft + 4,
        y: 120,
      }),
    ).toBeNull();
  });
});
