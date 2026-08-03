export interface NativeGestureControlZone {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

export function isNativeGestureControlPoint(zones: readonly NativeGestureControlZone[], x: number, y: number): boolean {
  'worklet';
  for (let index = 0; index < zones.length; index += 1) {
    const zone = zones[index];
    if (x >= zone.x1 && x <= zone.x2 && y >= zone.y1 && y <= zone.y2) return true;
  }
  return false;
}
