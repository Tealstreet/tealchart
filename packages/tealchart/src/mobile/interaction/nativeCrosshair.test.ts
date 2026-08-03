import type { SharedValue } from 'react-native-reanimated';
import type { NativeCrosshairSharedValues } from './nativeCrosshair';

import { describe, expect, it } from 'vitest';

import { createNativeChartFrameFromPanes } from '../render/nativeChartFrame';
import {
  beginNativeCrosshairDrag,
  hideNativeCrosshair,
  isNativeCrosshairPointInMainPane,
  showNativeCrosshair,
  toggleNativeCrosshair,
  updateNativeCrosshairDrag,
} from './nativeCrosshair';

function shared<T>(value: T): SharedValue<T> {
  return { value } as SharedValue<T>;
}

function createCrosshair(): NativeCrosshairSharedValues {
  return {
    visible: shared(false),
    x: shared(0),
    y: shared(0),
    dragOriginX: shared(0),
    dragOriginY: shared(0),
  };
}

const frame = createNativeChartFrameFromPanes({
  dimensions: { width: 220, height: 180, margins: { top: 0, right: 50, bottom: 40, left: 20 } },
  panes: [{ id: 'main', type: 'main', top: 36, height: 104, yMin: 62_000, yMax: 64_000 }],
});

describe('native crosshair state', () => {
  it('shows, toggles, and hides inside the main pane only', () => {
    const crosshair = createCrosshair();

    expect(showNativeCrosshair(crosshair, frame, 10, 60)).toBe(false);
    expect(crosshair.visible.value).toBe(false);

    expect(toggleNativeCrosshair(crosshair, frame, 80, 60)).toBe(true);
    expect(crosshair.visible.value).toBe(true);
    expect(crosshair.x.value).toBe(80);
    expect(crosshair.y.value).toBe(60);

    expect(toggleNativeCrosshair(crosshair, frame, 120, 80)).toBe(false);
    expect(crosshair.visible.value).toBe(false);

    showNativeCrosshair(crosshair, frame, 90, 70);
    hideNativeCrosshair(crosshair);
    expect(crosshair.visible.value).toBe(false);
  });

  it('moves from the crosshair origin by drag translation and clamps to the main pane', () => {
    const crosshair = createCrosshair();
    showNativeCrosshair(crosshair, frame, 90, 80);

    expect(beginNativeCrosshairDrag(crosshair)).toBe(true);
    updateNativeCrosshairDrag(crosshair, frame, 20, -60);
    expect(crosshair.x.value).toBe(110);
    expect(crosshair.y.value).toBe(frame.mainPane.top);

    updateNativeCrosshairDrag(crosshair, frame, 500, 500);
    expect(crosshair.x.value).toBe(frame.priceAxisHitLeft - 1);
    expect(crosshair.y.value).toBe(frame.mainPane.bottom);
  });

  it('keeps crosshair taps out of the full price-axis label lane', () => {
    expect(isNativeCrosshairPointInMainPane(frame, frame.priceAxisLeft - 1, 60)).toBe(true);
    expect(isNativeCrosshairPointInMainPane(frame, frame.priceAxisLeft, 60)).toBe(false);
    expect(isNativeCrosshairPointInMainPane(frame, frame.priceAxisLeft + 1, 60)).toBe(false);
    expect(isNativeCrosshairPointInMainPane(frame, frame.priceAxisHitLeft, 60)).toBe(false);
    expect(isNativeCrosshairPointInMainPane(frame, frame.priceAxisHitLeft - 1, 60)).toBe(true);
  });
});
