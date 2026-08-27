import type { NativeChartFrame } from '../render/nativeChartFrame';

export const NATIVE_RESET_VIEW_BUTTON_SIZE = 28;
export const NATIVE_RESET_VIEW_HIT_SIZE = 80;
export const NATIVE_RESET_VIEW_DISMISS_MS = 2500;
export const NATIVE_RESET_VIEW_REVEAL_TOP_BUFFER = 8;
export const NATIVE_RESET_VIEW_BOTTOM_OFFSET = 30;

export interface NativeResetViewButtonLayout {
  centerX: number;
  centerY: number;
  radius: number;
  hitRadius: number;
}

export type NativeResetViewTapTarget = 'button' | 'reveal';

export function resolveNativeResetViewButtonLayout(
  frame: NativeChartFrame,
): NativeResetViewButtonLayout {
  'worklet';
  return {
    centerX: frame.dimensions.width / 2,
    centerY: frame.dimensions.height - frame.dimensions.margins.bottom - NATIVE_RESET_VIEW_BOTTOM_OFFSET,
    radius: NATIVE_RESET_VIEW_BUTTON_SIZE / 2,
    hitRadius: NATIVE_RESET_VIEW_HIT_SIZE / 2,
  };
}

export function resolveNativeResetViewRevealTopY(frame: NativeChartFrame): number {
  'worklet';
  const layout = resolveNativeResetViewButtonLayout(frame);
  return layout.centerY - layout.radius - NATIVE_RESET_VIEW_REVEAL_TOP_BUFFER;
}

export function isNativeResetViewRevealTap(frame: NativeChartFrame, x: number, y: number): boolean {
  'worklet';
  const layout = resolveNativeResetViewButtonLayout(frame);
  return (
    x >= layout.centerX - layout.hitRadius &&
    x <= layout.centerX + layout.hitRadius &&
    y >= resolveNativeResetViewRevealTopY(frame) &&
    y <= frame.dimensions.height
  );
}

export function isNativeResetViewButtonTap(
  layout: NativeResetViewButtonLayout,
  x: number,
  y: number,
): boolean {
  'worklet';
  const dx = x - layout.centerX;
  const dy = y - layout.centerY;
  return dx * dx + dy * dy <= layout.hitRadius * layout.hitRadius;
}

/**
 * The visible reset button reserves its own circle, the way an overlay reserves
 * a rect. It cannot live in the control-zone array: visibility is a shared
 * value now, so React never learns it changed - which is the point, since the
 * array's identity is what used to rebuild every gesture on every reveal.
 */
export function isNativeResetViewControlPoint(
  frame: NativeChartFrame | null,
  visible: boolean,
  x: number,
  y: number,
): boolean {
  'worklet';
  if (!visible || !frame) return false;
  return isNativeResetViewButtonTap(resolveNativeResetViewButtonLayout(frame), x, y);
}

export function isNativeResetViewTapWithinTolerance(
  startX: number,
  startY: number,
  x: number,
  y: number,
  tolerance: number,
): boolean {
  'worklet';
  const dx = x - startX;
  const dy = y - startY;
  return dx * dx + dy * dy <= tolerance * tolerance;
}

export function resolveNativeResetViewTapTarget({
  frame,
  resetButtonVisible,
  x,
  y,
  isTradeLineTarget,
  isControlTarget = false,
}: {
  frame: NativeChartFrame;
  resetButtonVisible: boolean;
  x: number;
  y: number;
  isTradeLineTarget: boolean;
  isControlTarget?: boolean;
}): NativeResetViewTapTarget | null {
  if (resetButtonVisible && isNativeResetViewButtonTap(resolveNativeResetViewButtonLayout(frame), x, y)) {
    return 'button';
  }

  if (!isControlTarget && !isTradeLineTarget && isNativeResetViewRevealTap(frame, x, y)) {
    return 'reveal';
  }

  return null;
}
