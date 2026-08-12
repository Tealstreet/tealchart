import type { NativeOverlayHitRect } from './nativeOverlayHitTargets';

import { isPointInNativeHitRect } from './nativeOverlayHitTargets';

export type NativeGestureControlZoneOwner = 'resetView';

/**
 * A reserved rect is an overlay hit rect with an owner. Sharing the shape means
 * an action target can be registered as its own control zone without being
 * restated — which is how the two stay identical.
 */
export interface NativeGestureControlZone extends NativeOverlayHitRect {
  /**
   * Gesture that owns this zone. The owning gesture must not treat its own
   * reserved rect as a foreign control, or it blocks its own taps.
   */
  owner?: NativeGestureControlZoneOwner;
}

// Reserved overlay rectangles. Broad canvas gestures must fail starts here so
// gesture-owned controls do not fight crosshair, pan, scale, or drag handlers.
export function isNativeGestureControlPoint(
  zones: readonly NativeGestureControlZone[],
  x: number,
  y: number,
  ignoreOwner?: NativeGestureControlZoneOwner,
): boolean {
  'worklet';
  for (let index = 0; index < zones.length; index += 1) {
    const zone = zones[index];
    if (ignoreOwner !== undefined && zone.owner === ignoreOwner) continue;
    if (isPointInNativeHitRect(zone, x, y)) return true;
  }
  return false;
}
