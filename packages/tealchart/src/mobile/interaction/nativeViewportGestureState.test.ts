import type { SharedValue } from 'react-native-reanimated';
import type { Viewport } from '../../types';
import type { NativeViewportSharedValues } from '../render/nativeSharedViewport';
import type {
  NativeChartAxisPinchGestureState,
  NativeChartPanGestureState,
  NativePriceAutoScaleSharedValues,
  NativePriceScaleGestureState,
  NativeTimeScaleGestureState,
  NativeViewportGestureMetrics,
} from './nativeViewportGestureState';

import { describe, expect, it } from 'vitest';

import { DEFAULT_MIN_VISIBLE_BAR_WIDTH_PX } from '../../viewport/timeRangeConstraints';
import { createNativeChartFrameFromPanes } from '../render/nativeChartFrame';
import {
  acceptNativeViewportGestureTransaction,
  beginNativeChartAxisPinchGestureState,
  beginNativeChartPanGestureState,
  beginNativePriceScaleGestureState,
  beginNativeTimeScaleGestureState,
  canBeginNativePriceScaleGesture,
  canBeginNativeTimeScaleGesture,
  cancelNativeViewportGestureState,
  commitNativeViewportGestureTransaction,
  finalizeNativeViewportGestureState,
  getNativeChartAxisPinchGeometry,
  getNativeChartAxisPinchRatios,
  getNativePriceScaleHitGeometry,
  getNativeTimeScaleHitGeometry,
  getNativeViewportGestureCommit,
  nativeViewportGestureTransactionAccepted,
  nativeViewportGestureTransactionCommitted,
  resetNativeViewportGestureActiveFlags,
  resetNativeViewportGestureTransaction,
  resolveNativeAxisPinchScale,
  syncNativeViewportGestureMetrics,
  updateNativeChartAxisPinchGestureState,
  updateNativeChartPanGestureState,
  updateNativePriceScaleGestureState,
  updateNativeTimeScaleGestureState,
} from './nativeViewportGestureState';

function shared<T>(value: T): SharedValue<T> {
  return { value } as SharedValue<T>;
}

function sharedViewport(viewport: Viewport): NativeViewportSharedValues {
  return {
    startTime: shared(viewport.startTime),
    endTime: shared(viewport.endTime),
    priceMin: shared(viewport.priceMin),
    priceMax: shared(viewport.priceMax),
  };
}

function priceAutoScale(active = false): NativePriceAutoScaleSharedValues {
  return {
    active: shared(active),
    bars: shared([
      { time: 900, high: 110, low: 90 },
      { time: 1_000, high: 120, low: 100 },
      { time: 1_500, high: 180, low: 140 },
      { time: 1_900, high: 160, low: 130 },
      { time: 2_000, high: 150, low: 125 },
    ]),
  };
}

function readViewport(viewport: NativeViewportSharedValues): Viewport {
  return {
    startTime: viewport.startTime.value,
    endTime: viewport.endTime.value,
    priceMin: viewport.priceMin.value,
    priceMax: viewport.priceMax.value,
  };
}

function gestureMetrics({
  intervalMs = 1,
  pricePerPixel = 0.5,
  contentWidth = 10_000,
  timePerPixel = 2,
}: Partial<{
  intervalMs: number;
  pricePerPixel: number;
  contentWidth: number;
  timePerPixel: number;
}> = {}): NativeViewportGestureMetrics {
  return {
    intervalMs: shared(intervalMs),
    contentWidth: shared(contentWidth),
    timePerPixel: shared(timePerPixel),
    pricePerPixel: shared(pricePerPixel),
  };
}

const viewport: Viewport = {
  startTime: 1_000,
  endTime: 2_000,
  priceMin: 100,
  priceMax: 200,
};

const frame = createNativeChartFrameFromPanes({
  dimensions: { width: 200, height: 140, margins: { top: 0, right: 40, bottom: 40, left: 10 } },
  panes: [{ id: 'main', type: 'main', top: 5, height: 95, yMin: 0, yMax: 1 }],
});

describe('native viewport gesture state', () => {
  it('begins and updates chart pan from the gesture-start viewport', () => {
    const state: NativeChartPanGestureState = {
      active: shared(false),
      sharedViewport: sharedViewport(viewport),
      startViewport: sharedViewport({ startTime: 0, endTime: 1, priceMin: 0, priceMax: 1 }),
      metrics: gestureMetrics(),
      priceAutoScale: priceAutoScale(),
      activeTimePerPixel: shared(0),
      activePricePerPixel: shared(0),
    };

    beginNativeChartPanGestureState(state);
    expect(state.active.value).toBe(true);
    expect(readViewport(state.startViewport)).toEqual(viewport);

    expect(updateNativeChartPanGestureState(state, 50, -10)).toBe(true);
    expect(readViewport(state.sharedViewport)).toEqual({
      startTime: 900,
      endTime: 1_900,
      priceMin: 95,
      priceMax: 195,
    });
  });

  it('auto-scales chart pan on the live shared viewport while ignoring vertical drag', () => {
    const state: NativeChartPanGestureState = {
      active: shared(false),
      sharedViewport: sharedViewport(viewport),
      startViewport: sharedViewport({ startTime: 0, endTime: 1, priceMin: 0, priceMax: 1 }),
      metrics: gestureMetrics(),
      priceAutoScale: priceAutoScale(true),
      activeTimePerPixel: shared(0),
      activePricePerPixel: shared(0),
    };

    beginNativeChartPanGestureState(state);
    expect(updateNativeChartPanGestureState(state, 50, -10)).toBe(true);

    expect(readViewport(state.sharedViewport)).toEqual({
      startTime: 900,
      endTime: 1_900,
      priceMin: 81,
      priceMax: 189,
    });
  });

  it('rolls back active viewport gestures to the gesture-start viewport', () => {
    const sharedLive = sharedViewport(viewport);
    const start = sharedViewport({ startTime: 900, endTime: 1_900, priceMin: 95, priceMax: 195 });
    const active = shared(true);

    sharedLive.startTime.value = 800;

    expect(cancelNativeViewportGestureState(active, sharedLive, start)).toBe(true);
    expect(active.value).toBe(false);
    expect(readViewport(sharedLive)).toEqual(readViewport(start));
  });

  it('reads a commit viewport only while the gesture is active', () => {
    const sharedLive = sharedViewport(viewport);
    const active = shared(true);

    expect(getNativeViewportGestureCommit(active, sharedLive)).toEqual(viewport);

    active.value = false;
    expect(getNativeViewportGestureCommit(active, sharedLive)).toBeNull();
  });

  it('finalizes failed viewport gestures by rolling back once', () => {
    const sharedLive = sharedViewport(viewport);
    const start = sharedViewport({ startTime: 900, endTime: 1_900, priceMin: 95, priceMax: 195 });
    const active = shared(true);

    sharedLive.startTime.value = 800;

    expect(
      finalizeNativeViewportGestureState({
        active,
        sharedViewport: sharedLive,
        startViewport: start,
        success: false,
      }),
    ).toBe(true);
    expect(active.value).toBe(false);
    expect(readViewport(sharedLive)).toEqual(readViewport(start));

    expect(
      finalizeNativeViewportGestureState({
        active,
        sharedViewport: sharedLive,
        startViewport: start,
        success: false,
      }),
    ).toBe(false);
  });

  it('does not roll back successful viewport gesture finalization', () => {
    const sharedLive = sharedViewport(viewport);
    const start = sharedViewport({ startTime: 900, endTime: 1_900, priceMin: 95, priceMax: 195 });
    const active = shared(true);

    expect(
      finalizeNativeViewportGestureState({
        active,
        sharedViewport: sharedLive,
        startViewport: start,
        success: true,
      }),
    ).toBe(false);
    expect(active.value).toBe(true);
    expect(readViewport(sharedLive)).toEqual(viewport);
  });

  it('tracks accepted and committed gesture transactions on the UI thread', () => {
    const transaction = { accepted: shared(false), committed: shared(false) };

    resetNativeViewportGestureTransaction(transaction);
    expect(nativeViewportGestureTransactionAccepted(transaction)).toBe(false);
    expect(nativeViewportGestureTransactionCommitted(transaction)).toBe(false);

    acceptNativeViewportGestureTransaction(transaction);
    expect(nativeViewportGestureTransactionAccepted(transaction)).toBe(true);

    commitNativeViewportGestureTransaction(transaction);
    expect(nativeViewportGestureTransactionCommitted(transaction)).toBe(true);

    resetNativeViewportGestureTransaction(transaction);
    expect(nativeViewportGestureTransactionAccepted(transaction)).toBe(false);
    expect(nativeViewportGestureTransactionCommitted(transaction)).toBe(false);
  });

  it('scales prices around the touched anchor', () => {
    const state: NativePriceScaleGestureState = {
      active: shared(false),
      sharedViewport: sharedViewport(viewport),
      startViewport: sharedViewport({ startTime: 0, endTime: 1, priceMin: 0, priceMax: 1 }),
      priceAutoScale: priceAutoScale(),
      activeAnchorPrice: shared(0),
    };

    beginNativePriceScaleGestureState(state, 25, 0, 100);
    expect(state.activeAnchorPrice.value).toBe(175);

    expect(updateNativePriceScaleGestureState(state, Math.log(2) / 0.005)).toBe(true);
    expect(readViewport(state.sharedViewport).priceMin).toBeCloseTo(25);
    expect(readViewport(state.sharedViewport).priceMax).toBeCloseTo(225);
  });

  it('disables price auto-scale when price-axis scale begins', () => {
    const autoScale = priceAutoScale(true);
    const state: NativePriceScaleGestureState = {
      active: shared(false),
      sharedViewport: sharedViewport(viewport),
      startViewport: sharedViewport({ startTime: 0, endTime: 1, priceMin: 0, priceMax: 1 }),
      priceAutoScale: autoScale,
      activeAnchorPrice: shared(0),
    };

    beginNativePriceScaleGestureState(state, 25, 0, 100);

    expect(autoScale.active.value).toBe(false);
  });

  it('axis-pinches chart time and price from independent touch-span components', () => {
    const state: NativeChartAxisPinchGestureState = {
      active: shared(false),
      sharedViewport: sharedViewport(viewport),
      startViewport: sharedViewport({ startTime: 0, endTime: 1, priceMin: 0, priceMax: 1 }),
      metrics: gestureMetrics(),
      priceAutoScale: priceAutoScale(),
      activeAnchorTime: shared(0),
      activeAnchorPrice: shared(0),
      activeStartSpanX: shared(0),
      activeStartSpanY: shared(0),
    };

    beginNativeChartAxisPinchGestureState(state, 47.5, 28.75, 40, 80, frame);
    expect(state.active.value).toBe(true);
    expect(state.activeAnchorTime.value).toBeCloseTo(1_197.368421);
    expect(state.activeAnchorPrice.value).toBeCloseTo(175);
    expect(state.activeStartSpanX.value).toBe(40);
    expect(state.activeStartSpanY.value).toBe(80);

    expect(updateNativeChartAxisPinchGestureState(state, 47.5, 28.75, 80, 40, frame)).toBe(true);
    expect(readViewport(state.sharedViewport)).toEqual({
      startTime: 1_098.6842105263158,
      endTime: 1_598.6842105263158,
      priceMin: 25,
      priceMax: 225,
    });
  });

  it('auto-scales chart pinch on the live shared viewport while autoscale is active', () => {
    const state: NativeChartAxisPinchGestureState = {
      active: shared(false),
      sharedViewport: sharedViewport(viewport),
      startViewport: sharedViewport({ startTime: 0, endTime: 1, priceMin: 0, priceMax: 1 }),
      metrics: gestureMetrics(),
      priceAutoScale: priceAutoScale(true),
      activeAnchorTime: shared(0),
      activeAnchorPrice: shared(0),
      activeStartSpanX: shared(0),
      activeStartSpanY: shared(0),
    };

    beginNativeChartAxisPinchGestureState(state, 47.5, 28.75, 40, 80, frame);
    expect(updateNativeChartAxisPinchGestureState(state, 47.5, 28.75, 80, 40, frame)).toBe(true);

    expect(readViewport(state.sharedViewport)).toEqual({
      startTime: 1_098.6842105263158,
      endTime: 1_598.6842105263158,
      priceMin: 136,
      priceMax: 184,
    });
  });

  it('uses center movement as two-finger pan for axis-pinch state', () => {
    const state: NativeChartAxisPinchGestureState = {
      active: shared(false),
      sharedViewport: sharedViewport(viewport),
      startViewport: sharedViewport({ startTime: 0, endTime: 1, priceMin: 0, priceMax: 1 }),
      metrics: gestureMetrics(),
      priceAutoScale: priceAutoScale(),
      activeAnchorTime: shared(0),
      activeAnchorPrice: shared(0),
      activeStartSpanX: shared(0),
      activeStartSpanY: shared(0),
    };

    beginNativeChartAxisPinchGestureState(state, 85, 52.5, 80, 80, frame);
    expect(updateNativeChartAxisPinchGestureState(state, 122.5, 28.75, 80, 80, frame)).toBe(true);
    expect(readViewport(state.sharedViewport)).toEqual({
      startTime: 802.6315789473684,
      endTime: 1_802.6315789473683,
      priceMin: 75,
      priceMax: 175,
    });
  });

  it('scales time from the right edge like web time-axis drag', () => {
    const state: NativeTimeScaleGestureState = {
      active: shared(false),
      sharedViewport: sharedViewport(viewport),
      startViewport: sharedViewport({ startTime: 0, endTime: 1, priceMin: 0, priceMax: 1 }),
      metrics: gestureMetrics(),
      priceAutoScale: priceAutoScale(),
      activeAnchorTime: shared(0),
    };

    beginNativeTimeScaleGestureState(state);
    expect(state.activeAnchorTime.value).toBe(2_000);

    expect(updateNativeTimeScaleGestureState(state, Math.log(0.5) / 0.005)).toBe(true);
    expect(readViewport(state.sharedViewport).startTime).toBeCloseTo(1_500);
    expect(readViewport(state.sharedViewport).endTime).toBeCloseTo(2_000);
  });

  it('auto-scales time-axis scale on the live shared viewport', () => {
    const state: NativeTimeScaleGestureState = {
      active: shared(false),
      sharedViewport: sharedViewport(viewport),
      startViewport: sharedViewport({ startTime: 0, endTime: 1, priceMin: 0, priceMax: 1 }),
      metrics: gestureMetrics(),
      priceAutoScale: priceAutoScale(true),
      activeAnchorTime: shared(0),
    };

    beginNativeTimeScaleGestureState(state);
    expect(updateNativeTimeScaleGestureState(state, Math.log(0.5) / 0.005)).toBe(true);

    const nextViewport = readViewport(state.sharedViewport);
    expect(nextViewport.startTime).toBeCloseTo(1_500);
    expect(nextViewport.endTime).toBeCloseTo(2_000);
    expect(nextViewport.priceMin).toBeCloseTo(119.5);
    expect(nextViewport.priceMax).toBeCloseTo(185.5);
  });

  it('identifies price-scale hit geometry from the chart frame', () => {
    const geometry = getNativePriceScaleHitGeometry(frame);

    expect(geometry).toEqual({
      axisLeft: 160,
      axisRight: 200,
      plotTop: 5,
      plotBottom: 100,
      plotHeight: 95,
    });
    expect(canBeginNativePriceScaleGesture(geometry, 180, 50)).toBe(true);
    expect(canBeginNativePriceScaleGesture(geometry, 159, 50)).toBe(false);
    expect(canBeginNativePriceScaleGesture(geometry, 160, 101)).toBe(false);
  });

  it('identifies time-scale hit geometry from the chart frame', () => {
    const geometry = getNativeTimeScaleHitGeometry(frame);

    expect(geometry).toEqual({
      timeLeft: 10,
      timeRight: 200,
      axisTop: 100,
      axisBottom: 140,
      timeWidth: 190,
    });
    expect(canBeginNativeTimeScaleGesture(geometry, 80, 120)).toBe(true);
    expect(canBeginNativeTimeScaleGesture(geometry, 9, 120)).toBe(false);
    expect(canBeginNativeTimeScaleGesture(geometry, 80, 99)).toBe(false);
  });

  it('identifies chart axis-pinch ratios from the chart frame', () => {
    const geometry = getNativeChartAxisPinchGeometry(frame);

    expect(geometry).toEqual({
      timeLeft: 10,
      timeWidth: 190,
      plotTop: 5,
      plotHeight: 95,
    });
    expect(getNativeChartAxisPinchRatios(geometry, 85, 52.5)).toEqual({
      focalTimeRatio: 75 / 190,
      focalPriceRatio: 0.5,
    });
    expect(getNativeChartAxisPinchRatios(geometry, -100, 500)).toEqual({
      focalTimeRatio: 0,
      focalPriceRatio: 1,
    });
  });

  it('ignores sub-threshold touch-span jitter on a collapsed axis component', () => {
    expect(resolveNativeAxisPinchScale(2, 8)).toBe(1);
    expect(resolveNativeAxisPinchScale(40, 80)).toBe(2);
    expect(resolveNativeAxisPinchScale(80, 40)).toBe(0.5);
  });

  it('resets viewport gesture active flags together', () => {
    const panActive = shared(true);
    const pinchActive = shared(true);
    const priceScaleActive = shared(true);
    const timeScaleActive = shared(true);

    resetNativeViewportGestureActiveFlags({ panActive, pinchActive, priceScaleActive, timeScaleActive });

    expect(panActive.value).toBe(false);
    expect(pinchActive.value).toBe(false);
    expect(priceScaleActive.value).toBe(false);
    expect(timeScaleActive.value).toBe(false);
  });

  it('syncs viewport gesture metrics together', () => {
    const metrics = gestureMetrics({
      intervalMs: 0,
      contentWidth: 0,
      timePerPixel: 0,
      pricePerPixel: 0,
    });

    syncNativeViewportGestureMetrics({
      metrics,
      intervalMs: 60_000,
      contentWidth: 400,
      timePerPixel: 3,
      pricePerPixel: 0.25,
    });

    expect(metrics.intervalMs.value).toBe(60_000);
    expect(metrics.contentWidth.value).toBe(400);
    expect(metrics.timePerPixel.value).toBe(3);
    expect(metrics.pricePerPixel.value).toBe(0.25);
  });

  it('clamps time-scale zoom-out to the shared minimum visible bar width', () => {
    const state: NativeTimeScaleGestureState = {
      active: shared(false),
      sharedViewport: sharedViewport(viewport),
      startViewport: sharedViewport({ startTime: 0, endTime: 1, priceMin: 0, priceMax: 1 }),
      metrics: gestureMetrics({ intervalMs: 100, contentWidth: 4 }),
      priceAutoScale: priceAutoScale(),
      activeAnchorTime: shared(0),
    };

    beginNativeTimeScaleGestureState(state);
    expect(updateNativeTimeScaleGestureState(state, Math.log(100) / 0.005)).toBe(true);
    // contentWidth 4 / minimum bar width -> that many bars of 100ms each.
    const maxRange = Math.floor(4 / DEFAULT_MIN_VISIBLE_BAR_WIDTH_PX) * 100;
    expect(readViewport(state.sharedViewport)).toEqual({
      startTime: 2_000 - maxRange,
      endTime: 2_000,
      priceMin: 100,
      priceMax: 200,
    });
  });

  it('clamps chart pinch zoom-out around the touch focal ratio', () => {
    const state: NativeChartAxisPinchGestureState = {
      active: shared(false),
      sharedViewport: sharedViewport(viewport),
      startViewport: sharedViewport({ startTime: 0, endTime: 1, priceMin: 0, priceMax: 1 }),
      metrics: gestureMetrics({ intervalMs: 100, contentWidth: 4 }),
      priceAutoScale: priceAutoScale(),
      activeAnchorTime: shared(0),
      activeAnchorPrice: shared(0),
      activeStartSpanX: shared(0),
      activeStartSpanY: shared(0),
    };

    beginNativeChartAxisPinchGestureState(state, 47.5, 52.5, 80, 80, frame);
    expect(updateNativeChartAxisPinchGestureState(state, 47.5, 52.5, 12, 80, frame)).toBe(true);
    // The clamp width is derived; the anchor keeps the touch focal point fixed.
    const maxRange = Math.floor(4 / DEFAULT_MIN_VISIBLE_BAR_WIDTH_PX) * 100;
    const clamped = readViewport(state.sharedViewport);
    expect(clamped.endTime - clamped.startTime).toBeCloseTo(maxRange);
    expect(clamped.startTime).toBeCloseTo(1_118.421053);
  });
});
