import type { SharedValue } from 'react-native-reanimated';
import type { NativeChartFrame } from '../render/nativeChartFrame';
import type { NativeOverlayHitRect } from './nativeOverlayHitTargets';

import { isNativeResetViewControlPoint } from './nativeResetViewButton';
import { isPointInNativeHitRect } from './nativeOverlayHitTargets';

/**
 * A reserved rect is an overlay hit rect. Sharing the shape means an action
 * target can be registered as its own control zone without being restated —
 * which is how the two stay identical.
 */
export type NativeGestureControlZone = NativeOverlayHitRect;

// Reserved overlay rectangles. Broad canvas gestures must fail starts here so
// gesture-owned controls do not fight crosshair, pan, scale, or drag handlers.
export function isNativeGestureControlPoint(
  zones: readonly NativeGestureControlZone[],
  x: number,
  y: number,
): boolean {
  'worklet';
  for (let index = 0; index < zones.length; index += 1) {
    if (isPointInNativeHitRect(zones[index], x, y)) return true;
  }
  return false;
}

export interface NativeReservedControlPointInput {
  controlZones: readonly NativeGestureControlZone[];
  frame: NativeChartFrame | null;
  resetViewVisible?: SharedValue<boolean>;
  x: number;
  y: number;
}

/**
 * Every reserved surface a broad canvas gesture must yield to: the zones React
 * knows about, plus the reset-view button, whose visibility is a shared value
 * and so is read at touch time rather than captured when the gesture was built.
 */
export function isNativeReservedControlPoint({
  controlZones,
  frame,
  resetViewVisible,
  x,
  y,
}: NativeReservedControlPointInput): boolean {
  'worklet';
  if (isNativeGestureControlPoint(controlZones, x, y)) return true;
  return isNativeResetViewControlPoint(frame, resetViewVisible?.value === true, x, y);
}
