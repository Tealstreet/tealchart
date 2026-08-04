export interface NativeOverlayHitRect {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

/**
 * Canvas-overlaid action controls should render as passive overlays and route
 * critical taps through gesture hit targets. Register those rects as control
 * zones to reserve ownership.
 */
export function findNativeOverlayHitTarget<T extends NativeOverlayHitRect>(
  targets: readonly T[],
  x: number,
  y: number,
): T | null {
  'worklet';
  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index];
    if (x >= target.x1 && x <= target.x2 && y >= target.y1 && y <= target.y2) return target;
  }
  return null;
}
