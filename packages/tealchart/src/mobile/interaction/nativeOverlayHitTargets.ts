export interface NativeOverlayHitRect {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

/**
 * The one containment test for native chart chrome.
 *
 * Control zones and action targets are the same rect in the same coordinate
 * space and must agree on their edges, so they share this rather than each
 * inlining the comparison and drifting on inclusivity or tolerance.
 */
export function isPointInNativeHitRect(rect: NativeOverlayHitRect, x: number, y: number): boolean {
  'worklet';
  return x >= rect.x1 && x <= rect.x2 && y >= rect.y1 && y <= rect.y2;
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
    if (isPointInNativeHitRect(target, x, y)) return target;
  }
  return null;
}
