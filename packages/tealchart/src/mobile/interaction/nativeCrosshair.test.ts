import type { SharedValue } from 'react-native-reanimated';
import type { NativeCrosshairSharedValues } from './nativeCrosshair';

import { describe, expect, it } from 'vitest';

import { createNativeChartFrameFromPanes, getNativePaneAtY } from '../render/nativeChartFrame';
import {
  beginNativeCrosshairDrag,
  hideNativeCrosshair,
  isNativeCrosshairPointInPlot,
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

const multiPaneFrame = createNativeChartFrameFromPanes({
  dimensions: { width: 220, height: 220, margins: { top: 0, right: 50, bottom: 40, left: 20 } },
  panes: [
    { id: 'main', type: 'main', top: 36, height: 84, yMin: 62_000, yMax: 64_000 },
    { id: 'pane_1', type: 'indicator', top: 120, height: 60, yMin: -1, yMax: 1 },
  ],
});

describe('native crosshair across panes', () => {
  it('activates over a secondary pane, not just the price pane', () => {
    const crosshair = createCrosshair();

    expect(showNativeCrosshair(crosshair, multiPaneFrame, 90, 150)).toBe(true);
    expect(crosshair.y.value).toBe(150);
  });

  it('drags down through a secondary pane instead of stopping at the price pane', () => {
    const crosshair = createCrosshair();
    showNativeCrosshair(crosshair, multiPaneFrame, 90, 60);
    beginNativeCrosshairDrag(crosshair);

    updateNativeCrosshairDrag(crosshair, multiPaneFrame, 0, 90);

    expect(crosshair.y.value).toBe(150);
  });

  it('stops at the time axis', () => {
    const crosshair = createCrosshair();
    showNativeCrosshair(crosshair, multiPaneFrame, 90, 60);
    beginNativeCrosshairDrag(crosshair);

    updateNativeCrosshairDrag(crosshair, multiPaneFrame, 0, 500);

    expect(crosshair.y.value).toBe(multiPaneFrame.timeAxisTop);
  });

  it('reads the maximised pane at the seam, not the pane collapsed underneath it', () => {
    const maximized = createNativeChartFrameFromPanes({
      dimensions: { width: 220, height: 220, margins: { top: 0, right: 50, bottom: 40, left: 20 } },
      panes: [
        { id: 'main', type: 'main', top: 36, height: 0, yMin: 62_000, yMax: 64_000 },
        { id: 'pane_1', type: 'indicator', top: 36, height: 144, yMin: -1, yMax: 1 },
      ],
    });

    // Both panes contain y=36; only the height filter decides which wins, and
    // the collapsed one winning is what put main-pane readouts over a
    // maximised indicator.
    expect(getNativePaneAtY(maximized, 36)?.id).toBe('pane_1');
    expect(isNativeCrosshairPointInPlot(maximized, 90, 100)).toBe(true);
  });
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
    expect(isNativeCrosshairPointInPlot(frame, frame.priceAxisLeft - 1, 60)).toBe(true);
    expect(isNativeCrosshairPointInPlot(frame, frame.priceAxisLeft, 60)).toBe(false);
    expect(isNativeCrosshairPointInPlot(frame, frame.priceAxisLeft + 1, 60)).toBe(false);
    expect(isNativeCrosshairPointInPlot(frame, frame.priceAxisHitLeft, 60)).toBe(false);
    expect(isNativeCrosshairPointInPlot(frame, frame.priceAxisHitLeft - 1, 60)).toBe(true);
  });
});
