import type { NativeChartFrame } from '../render/nativeChartFrame';

import {
  PARTIAL_BRACKET_MARKER_INTERVAL,
  PARTIAL_BRACKET_PERCENTS,
  PARTIAL_BRACKET_ZONE_HALF_WIDTH,
  resolvePartialBracketLadderDirection,
} from '../../interaction/partialBrackets';

export const NATIVE_PARTIAL_PREVIEW_INSET_X = 8;

function clampWorklet(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

/** The span a native partial ladder is clamped inside, for a drag started at `dragStartX`. */
export function resolveNativePartialBracketZone(
  frame: NativeChartFrame,
  dragStartX: number,
): { boundsLeft: number; boundsRight: number; zoneLeft: number; zoneRight: number } {
  'worklet';
  const boundsLeft = frame.contentLeft + NATIVE_PARTIAL_PREVIEW_INSET_X;
  const boundsRight = Math.max(boundsLeft, frame.priceAxisLeft - NATIVE_PARTIAL_PREVIEW_INSET_X);
  const zoneLeft = clampWorklet(
    dragStartX - PARTIAL_BRACKET_ZONE_HALF_WIDTH,
    boundsLeft,
    Math.max(boundsLeft, boundsRight - PARTIAL_BRACKET_MARKER_INTERVAL),
  );
  const zoneRight = clampWorklet(
    dragStartX + PARTIAL_BRACKET_ZONE_HALF_WIDTH,
    Math.min(boundsRight, zoneLeft + PARTIAL_BRACKET_MARKER_INTERVAL),
    boundsRight,
  );
  return { boundsLeft, boundsRight, zoneLeft, zoneRight };
}

/**
 * Resolved once, when the drag begins, and held in the drag state. Deriving it
 * in the preview instead re-read the live frame, so a resize mid-drag could
 * still flip the ladder with the finger at rest.
 */
export function resolveNativePartialBracketLadderDirection(frame: NativeChartFrame, dragStartX: number): 1 | -1 {
  'worklet';
  const { zoneLeft, zoneRight } = resolveNativePartialBracketZone(frame, dragStartX);
  return resolvePartialBracketLadderDirection({
    dragStartX,
    zoneLeft,
    zoneRight,
    bandCount: PARTIAL_BRACKET_PERCENTS.length,
  });
}
