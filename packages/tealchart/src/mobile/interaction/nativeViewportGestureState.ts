import type { SharedValue } from 'react-native-reanimated';
import type { Viewport } from '../../types';
import type { TimeRangeClampAnchor } from '../../viewport/timeRangeConstraints';
import type { NativeChartFrame } from '../render/nativeChartFrame';
import type { NativeViewportSharedValues } from '../render/nativeSharedViewport';
import type { NativeAutoScaleBar } from './nativeAutoScale';

import { clampViewportTimeRange } from '../../viewport/timeRangeConstraints';
import { applyNativePriceAutoScale } from './nativeAutoScale';
import { axisPinchViewport, panViewport, scaleViewportPrices, scaleViewportTime } from './nativeInteractionRuntime';
import { getNativeSharedViewport, syncNativeSharedViewport } from './nativeViewportSync';

const NATIVE_AXIS_PINCH_MIN_COMPONENT_SPAN = 12;
const NATIVE_AXIS_PINCH_MIN_SCALE = 0.05;
const NATIVE_AXIS_PINCH_MAX_SCALE = 20;

export interface NativeViewportGestureMetrics {
  intervalMs: SharedValue<number>;
  contentWidth: SharedValue<number>;
  timePerPixel: SharedValue<number>;
  pricePerPixel: SharedValue<number>;
}

export interface NativePriceAutoScaleSharedValues {
  active: SharedValue<boolean>;
  bars: SharedValue<NativeAutoScaleBar[]>;
}

export interface NativeChartPanGestureState {
  /**
   * Set when a pan starts inside an indicator pane. Those panes carry their own
   * value scale, so a vertical drag there must not haul the main price viewport
   * around — web suppresses the same movement via `isAutoScale`.
   */
  lockVertical: SharedValue<boolean>;
  active: SharedValue<boolean>;
  sharedViewport: NativeViewportSharedValues;
  startViewport: NativeViewportSharedValues;
  metrics: NativeViewportGestureMetrics;
  priceAutoScale: NativePriceAutoScaleSharedValues;
  activeTimePerPixel: SharedValue<number>;
  activePricePerPixel: SharedValue<number>;
}

export interface NativeChartAxisPinchGestureState {
  active: SharedValue<boolean>;
  sharedViewport: NativeViewportSharedValues;
  startViewport: NativeViewportSharedValues;
  metrics: NativeViewportGestureMetrics;
  priceAutoScale: NativePriceAutoScaleSharedValues;
  activeAnchorTime: SharedValue<number>;
  activeAnchorPrice: SharedValue<number>;
  activeStartSpanX: SharedValue<number>;
  activeStartSpanY: SharedValue<number>;
}

/**
 * The indicator pane an axis drag is scaling, captured at touch-down.
 *
 * Lives on the gesture state rather than inside the gesture factory: the frame
 * changes whenever a pane's range does, which rebuilds the gesture, and a target
 * held in the factory would come back null mid-drag. When that happened the
 * update fell through to the main-viewport path and both axes rescaled at once.
 */
export interface NativeIndicatorPaneScaleTarget {
  id: string;
  height: number;
  startYMin: number;
  startYMax: number;
  yMin: number;
  yMax: number;
}

export interface NativePriceScaleGestureState {
  active: SharedValue<boolean>;
  sharedViewport: NativeViewportSharedValues;
  startViewport: NativeViewportSharedValues;
  priceAutoScale: NativePriceAutoScaleSharedValues;
  activeAnchorPrice: SharedValue<number>;
  indicatorPaneTarget: SharedValue<NativeIndicatorPaneScaleTarget | null>;
}

export interface NativeTimeScaleGestureState {
  active: SharedValue<boolean>;
  sharedViewport: NativeViewportSharedValues;
  startViewport: NativeViewportSharedValues;
  metrics: NativeViewportGestureMetrics;
  priceAutoScale: NativePriceAutoScaleSharedValues;
  activeAnchorTime: SharedValue<number>;
}

export interface NativePriceScaleHitGeometry {
  axisLeft: number;
  axisRight: number;
  plotTop: number;
  plotBottom: number;
  plotHeight: number;
}

export interface NativeTimeScaleHitGeometry {
  timeLeft: number;
  timeRight: number;
  axisTop: number;
  axisBottom: number;
  timeWidth: number;
}

export interface NativeChartAxisPinchGeometry {
  timeLeft: number;
  timeWidth: number;
  plotTop: number;
  plotHeight: number;
}

function clampNativeRatio(value: number): number {
  'worklet';
  return Math.min(1, Math.max(0, value));
}

function clampNativeAxisScale(value: number): number {
  'worklet';
  return Math.min(NATIVE_AXIS_PINCH_MAX_SCALE, Math.max(NATIVE_AXIS_PINCH_MIN_SCALE, value));
}

function clampNativeGestureTimeRange(
  viewport: Viewport,
  metrics: NativeViewportGestureMetrics,
  anchor: TimeRangeClampAnchor,
): Viewport {
  'worklet';
  return clampViewportTimeRange({
    viewport,
    intervalMs: metrics.intervalMs.value,
    plotWidth: metrics.contentWidth.value,
    anchor,
  });
}

function applyNativeGesturePriceAutoScale(
  viewport: Viewport,
  priceAutoScale: NativePriceAutoScaleSharedValues,
): Viewport {
  'worklet';
  if (!priceAutoScale.active.value) return viewport;
  return applyNativePriceAutoScale(viewport, priceAutoScale.bars.value);
}

export function getNativePriceScaleHitGeometry(frame: NativeChartFrame | null): NativePriceScaleHitGeometry {
  'worklet';
  const axisLeft = frame?.priceAxisHitLeft ?? 0;
  const axisRight = frame?.dimensions.width ?? 0;
  const plotTop = frame?.mainPane.top ?? 0;
  const plotBottom = frame?.mainPane.bottom ?? 0;
  return {
    axisLeft,
    axisRight,
    plotTop,
    plotBottom,
    plotHeight: Math.max(1, plotBottom - plotTop),
  };
}

export function canBeginNativePriceScaleGesture(geometry: NativePriceScaleHitGeometry, x: number, y: number): boolean {
  'worklet';
  return x >= geometry.axisLeft && x <= geometry.axisRight && y >= geometry.plotTop && y <= geometry.plotBottom;
}

export function getNativeTimeScaleHitGeometry(frame: NativeChartFrame | null): NativeTimeScaleHitGeometry {
  'worklet';
  const timeLeft = frame?.contentLeft ?? 0;
  const timeRight = frame ? frame.contentLeft + frame.contentWidth : 0;
  const axisTop = frame?.mainPane.bottom ?? 0;
  const axisBottom = frame?.dimensions.height ?? 0;
  return {
    timeLeft,
    timeRight,
    axisTop,
    axisBottom,
    timeWidth: Math.max(1, timeRight - timeLeft),
  };
}

export function canBeginNativeTimeScaleGesture(geometry: NativeTimeScaleHitGeometry, x: number, y: number): boolean {
  'worklet';
  return x >= geometry.timeLeft && x <= geometry.timeRight && y >= geometry.axisTop && y <= geometry.axisBottom;
}

export function getNativeChartAxisPinchGeometry(frame: NativeChartFrame): NativeChartAxisPinchGeometry {
  'worklet';
  return {
    timeLeft: frame.contentLeft,
    timeWidth: Math.max(1, frame.contentWidth),
    plotTop: frame.mainPane.top,
    plotHeight: Math.max(1, frame.mainPane.height),
  };
}

export function getNativeChartAxisPinchRatios(
  geometry: NativeChartAxisPinchGeometry,
  centerX: number,
  centerY: number,
): { focalTimeRatio: number; focalPriceRatio: number } {
  'worklet';
  return {
    focalTimeRatio: clampNativeRatio((centerX - geometry.timeLeft) / geometry.timeWidth),
    focalPriceRatio: clampNativeRatio((centerY - geometry.plotTop) / geometry.plotHeight),
  };
}

export function resolveNativeAxisPinchScale(startSpan: number, currentSpan: number): number {
  'worklet';
  const start = Math.abs(startSpan);
  const current = Math.abs(currentSpan);
  if (start < NATIVE_AXIS_PINCH_MIN_COMPONENT_SPAN && current < NATIVE_AXIS_PINCH_MIN_COMPONENT_SPAN) {
    return 1;
  }
  return clampNativeAxisScale(
    Math.max(current, NATIVE_AXIS_PINCH_MIN_COMPONENT_SPAN) / Math.max(start, NATIVE_AXIS_PINCH_MIN_COMPONENT_SPAN),
  );
}

export function resetNativeViewportGestureActiveFlags({
  panActive,
  pinchActive,
  priceScaleActive,
  timeScaleActive,
}: {
  panActive: SharedValue<boolean>;
  pinchActive: SharedValue<boolean>;
  priceScaleActive: SharedValue<boolean>;
  timeScaleActive: SharedValue<boolean>;
}): void {
  panActive.value = false;
  pinchActive.value = false;
  priceScaleActive.value = false;
  timeScaleActive.value = false;
}

export function syncNativeViewportGestureMetrics({
  metrics,
  intervalMs,
  contentWidth,
  timePerPixel,
  pricePerPixel,
}: {
  metrics: NativeViewportGestureMetrics;
  intervalMs: number;
  contentWidth: number;
  timePerPixel: number;
  pricePerPixel: number;
}): void {
  metrics.intervalMs.value = intervalMs;
  metrics.contentWidth.value = contentWidth;
  metrics.timePerPixel.value = timePerPixel;
  metrics.pricePerPixel.value = pricePerPixel;
}

export function getNativeViewportGestureCommit(
  active: SharedValue<boolean>,
  sharedViewport: NativeViewportSharedValues,
): Viewport | null {
  'worklet';
  if (!active.value) return null;
  return getNativeSharedViewport(sharedViewport);
}

export function beginNativeChartPanGestureState(state: NativeChartPanGestureState): void {
  'worklet';
  state.active.value = true;
  syncNativeSharedViewport(state.startViewport, getNativeSharedViewport(state.sharedViewport));
  state.activeTimePerPixel.value = state.metrics.timePerPixel.value;
  state.activePricePerPixel.value = state.metrics.pricePerPixel.value;
}

export function beginNativeChartPanGestureStateFromFrame(
  state: NativeChartPanGestureState,
  frame: NativeChartFrame,
): void {
  'worklet';
  state.active.value = true;
  syncNativeSharedViewport(state.startViewport, getNativeSharedViewport(state.sharedViewport));

  const timeRange = state.sharedViewport.endTime.value - state.sharedViewport.startTime.value;
  const priceRange = state.sharedViewport.priceMax.value - state.sharedViewport.priceMin.value;
  state.activeTimePerPixel.value = frame.contentWidth > 0 ? timeRange / frame.contentWidth : 0;
  state.activePricePerPixel.value = frame.mainPane.height > 0 ? priceRange / frame.mainPane.height : 0;
}

export function updateNativeChartPanGestureState(
  state: NativeChartPanGestureState,
  translationX: number,
  translationY: number,
): boolean {
  'worklet';
  if (!state.active.value) return false;
  const pricePerPixel = state.priceAutoScale.active.value ? 0 : state.activePricePerPixel.value;
  const nextViewport = panViewport(getNativeSharedViewport(state.startViewport), {
    delta: { x: translationX, y: translationY },
    timePerPixel: state.activeTimePerPixel.value,
    pricePerPixel,
  });
  syncNativeSharedViewport(state.sharedViewport, applyNativeGesturePriceAutoScale(nextViewport, state.priceAutoScale));
  return true;
}

export function beginNativeChartAxisPinchGestureState(
  state: NativeChartAxisPinchGestureState,
  centerX: number,
  centerY: number,
  spanX: number,
  spanY: number,
  frame: NativeChartFrame,
): void {
  'worklet';
  state.active.value = true;
  syncNativeSharedViewport(state.startViewport, getNativeSharedViewport(state.sharedViewport));

  const viewport = getNativeSharedViewport(state.sharedViewport);
  const geometry = getNativeChartAxisPinchGeometry(frame);
  const { focalTimeRatio, focalPriceRatio } = getNativeChartAxisPinchRatios(geometry, centerX, centerY);
  const timeRange = viewport.endTime - viewport.startTime;
  const priceRange = viewport.priceMax - viewport.priceMin;

  state.activeAnchorTime.value = viewport.startTime + timeRange * focalTimeRatio;
  state.activeAnchorPrice.value = viewport.priceMax - priceRange * focalPriceRatio;
  state.activeStartSpanX.value = Math.abs(spanX);
  state.activeStartSpanY.value = Math.abs(spanY);
}

export function updateNativeChartAxisPinchGestureState(
  state: NativeChartAxisPinchGestureState,
  centerX: number,
  centerY: number,
  spanX: number,
  spanY: number,
  frame: NativeChartFrame,
): boolean {
  'worklet';
  if (!state.active.value) return false;

  const geometry = getNativeChartAxisPinchGeometry(frame);
  const { focalTimeRatio, focalPriceRatio } = getNativeChartAxisPinchRatios(geometry, centerX, centerY);
  const startViewport = getNativeSharedViewport(state.startViewport);
  const startPriceRange = startViewport.priceMax - startViewport.priceMin;
  const lockedFocalPriceRatio =
    startPriceRange === 0
      ? focalPriceRatio
      : (startViewport.priceMax - state.activeAnchorPrice.value) / startPriceRange;
  const nextViewport = axisPinchViewport(getNativeSharedViewport(state.startViewport), {
    scaleX: resolveNativeAxisPinchScale(state.activeStartSpanX.value, spanX),
    scaleY: state.priceAutoScale.active.value ? 1 : resolveNativeAxisPinchScale(state.activeStartSpanY.value, spanY),
    anchorTime: state.activeAnchorTime.value,
    anchorPrice: state.activeAnchorPrice.value,
    focalTimeRatio,
    focalPriceRatio: state.priceAutoScale.active.value ? lockedFocalPriceRatio : focalPriceRatio,
  });
  syncNativeSharedViewport(
    state.sharedViewport,
    applyNativeGesturePriceAutoScale(
      clampNativeGestureTimeRange(nextViewport, state.metrics, { ratio: focalTimeRatio }),
      state.priceAutoScale,
    ),
  );
  return true;
}

export function beginNativePriceScaleGestureState(
  state: NativePriceScaleGestureState,
  eventY: number,
  plotTop: number,
  plotHeight: number,
): void {
  'worklet';
  state.priceAutoScale.active.value = false;
  state.active.value = true;
  syncNativeSharedViewport(state.startViewport, getNativeSharedViewport(state.sharedViewport));

  const range = state.sharedViewport.priceMax.value - state.sharedViewport.priceMin.value;
  const anchorRatio = (eventY - plotTop) / Math.max(1, plotHeight);
  state.activeAnchorPrice.value = state.sharedViewport.priceMax.value - range * anchorRatio;
}

export function updateNativePriceScaleGestureState(state: NativePriceScaleGestureState, translationY: number): boolean {
  'worklet';
  if (!state.active.value) return false;
  syncNativeSharedViewport(
    state.sharedViewport,
    scaleViewportPrices(getNativeSharedViewport(state.startViewport), {
      deltaY: translationY,
      anchorPrice: state.activeAnchorPrice.value,
    }),
  );
  return true;
}

export function beginNativeTimeScaleGestureState(state: NativeTimeScaleGestureState): void {
  'worklet';
  state.active.value = true;
  syncNativeSharedViewport(state.startViewport, getNativeSharedViewport(state.sharedViewport));

  state.activeAnchorTime.value = state.sharedViewport.endTime.value;
}

export function updateNativeTimeScaleGestureState(state: NativeTimeScaleGestureState, translationX: number): boolean {
  'worklet';
  if (!state.active.value) return false;
  const nextViewport = scaleViewportTime(getNativeSharedViewport(state.startViewport), {
    deltaX: translationX,
    anchorTime: state.activeAnchorTime.value,
  });
  syncNativeSharedViewport(
    state.sharedViewport,
    applyNativeGesturePriceAutoScale(
      clampNativeGestureTimeRange(nextViewport, state.metrics, 'right'),
      state.priceAutoScale,
    ),
  );
  return true;
}

export function cancelNativeViewportGestureState(
  active: SharedValue<boolean>,
  sharedViewport: NativeViewportSharedValues,
  startViewport: NativeViewportSharedValues,
): boolean {
  'worklet';
  if (!active.value) return false;
  syncNativeSharedViewport(sharedViewport, getNativeSharedViewport(startViewport));
  active.value = false;
  return true;
}

export function finalizeNativeViewportGestureState({
  active,
  sharedViewport,
  startViewport,
  success,
}: {
  active: SharedValue<boolean>;
  sharedViewport: NativeViewportSharedValues;
  startViewport: NativeViewportSharedValues;
  success: boolean;
}): boolean {
  'worklet';
  if (!active.value || success) return false;
  return cancelNativeViewportGestureState(active, sharedViewport, startViewport);
}
