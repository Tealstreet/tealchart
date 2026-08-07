export type NativeGestureControlZoneOwner = 'resetView';

export interface NativeGestureControlZone {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
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
    if (x >= zone.x1 && x <= zone.x2 && y >= zone.y1 && y <= zone.y2) return true;
  }
  return false;
}
