import type { SharedValue } from 'react-native-reanimated';
import type { NativeChartFrame } from '../render/nativeChartFrame';

export interface NativeCrosshairSharedValues {
  visible: SharedValue<boolean>;
  x: SharedValue<number>;
  y: SharedValue<number>;
  dragOriginX: SharedValue<number>;
  dragOriginY: SharedValue<number>;
}

function getNativeCrosshairMaxX(frame: NativeChartFrame): number {
  'worklet';
  return Math.max(frame.contentLeft, frame.priceAxisHitLeft - 1);
}

export function isNativeCrosshairPointInMainPane(frame: NativeChartFrame, x: number, y: number): boolean {
  'worklet';
  return x >= frame.contentLeft && x < frame.priceAxisHitLeft && y >= frame.mainPane.top && y <= frame.mainPane.bottom;
}

export function showNativeCrosshair(
  crosshair: NativeCrosshairSharedValues,
  frame: NativeChartFrame,
  x: number,
  y: number,
): boolean {
  'worklet';
  if (!isNativeCrosshairPointInMainPane(frame, x, y)) return false;
  crosshair.visible.value = true;
  crosshair.x.value = x;
  crosshair.y.value = y;
  return true;
}

export function hideNativeCrosshair(crosshair: NativeCrosshairSharedValues): void {
  'worklet';
  crosshair.visible.value = false;
}

export function toggleNativeCrosshair(
  crosshair: NativeCrosshairSharedValues,
  frame: NativeChartFrame,
  x: number,
  y: number,
): boolean {
  'worklet';
  if (!isNativeCrosshairPointInMainPane(frame, x, y)) return false;
  if (crosshair.visible.value) {
    hideNativeCrosshair(crosshair);
    return false;
  }
  return showNativeCrosshair(crosshair, frame, x, y);
}

export function beginNativeCrosshairDrag(crosshair: NativeCrosshairSharedValues): boolean {
  'worklet';
  if (!crosshair.visible.value) return false;
  crosshair.dragOriginX.value = crosshair.x.value;
  crosshair.dragOriginY.value = crosshair.y.value;
  return true;
}

export function updateNativeCrosshairDrag(
  crosshair: NativeCrosshairSharedValues,
  frame: NativeChartFrame,
  translationX: number,
  translationY: number,
): void {
  'worklet';
  if (!crosshair.visible.value) return;
  crosshair.x.value = Math.min(
    Math.max(crosshair.dragOriginX.value + translationX, frame.contentLeft),
    getNativeCrosshairMaxX(frame),
  );
  crosshair.y.value = Math.min(
    Math.max(crosshair.dragOriginY.value + translationY, frame.mainPane.top),
    frame.mainPane.bottom,
  );
}
