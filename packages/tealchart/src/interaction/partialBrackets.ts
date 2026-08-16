/**
 * Calculate the partial TP/SL percentage from horizontal drag distance.
 *
 * These thresholds mirror TradingView's bracket magnet behavior: dragging the
 * TP/SL handle farther horizontally reduces the bracket size.
 */
export function calculatePartialBracketPercentFromDelta(deltaX: number): number {
  'worklet';
  const absoluteDeltaX = Math.abs(deltaX);
  if (absoluteDeltaX <= 27) return 100;
  if (absoluteDeltaX <= 82) return 75;
  if (absoluteDeltaX <= 137) return 50;
  if (absoluteDeltaX <= 192) return 25;
  return 10;
}

export function calculatePartialBracketPercent(startX: number, currentX: number): number {
  return calculatePartialBracketPercentFromDelta(currentX - startX);
}

export const PARTIAL_BRACKET_MARKER_INTERVAL = 55;
export const PARTIAL_BRACKET_ZONE_HALF_WIDTH = 220;

/** Ordered outward from the drag origin; the offsets are the band midpoints
 *  `calculatePartialBracketPercentFromDelta` splits on. */
export const PARTIAL_BRACKET_PERCENTS = [100, 75, 50, 25, 10];

/** Enough to read as present without competing with the active marker. */
export const PARTIAL_BRACKET_DIMMED_OPACITY = 0.35;

export interface PartialBracketMarker {
  percent: number;
  text: string;
  centerX: number;
  width: number;
  isActive: boolean;
  opacity: number;
}

/**
 * The ladder of percent markers drawn under a bracket drag.
 *
 * Shared because both runtimes drew it and both drew it wrong, in the same two
 * ways and one different one:
 *
 * - It was mirrored around the drag origin, so every percent except 100
 *   appeared twice with nothing saying which side was yours. Only the arm you
 *   are actually dragging toward is drawn now.
 * - Native deleted any marker sitting too close to the active one, so markers
 *   blinked out and back as the finger moved. They dim instead. Web never
 *   collapsed them at all, so its labels could overlap outright.
 * - Markers were clipped individually at the pane edge, leaving a lopsided run.
 *   The whole ladder shifts to stay inside the zone instead.
 *
 * Takes a character width rather than a measuring callback: this runs inside
 * Reanimated worklets on native, which cannot call into a Skia font or a canvas
 * context. Native already approximates from one monospace character measured
 * once on the JS thread, and web can pass the same.
 */
export function resolvePartialBracketMarkers({
  dragStartX,
  currentX,
  zoneLeft,
  zoneRight,
  characterWidth,
  paddingX,
  minGap,
}: {
  dragStartX: number;
  currentX: number;
  zoneLeft: number;
  zoneRight: number;
  characterWidth: number;
  paddingX: number;
  minGap: number;
}): PartialBracketMarker[] {
  'worklet';
  const deltaX = currentX - dragStartX;
  // The percent itself stays direction-agnostic - it is derived from |deltaX| by
  // the same function the drag commit uses. Only which arm gets DRAWN depends on
  // the sign, so a one-sided ladder cannot make dragging one-way.
  const activePercent = calculatePartialBracketPercentFromDelta(deltaX);
  const direction = deltaX < 0 ? -1 : 1;

  const markers: PartialBracketMarker[] = [];
  for (let index = 0; index < PARTIAL_BRACKET_PERCENTS.length; index += 1) {
    const percent = PARTIAL_BRACKET_PERCENTS[index];
    const text = `${percent}%`;
    markers.push({
      percent,
      text,
      centerX: dragStartX + direction * index * PARTIAL_BRACKET_MARKER_INTERVAL,
      width: Math.ceil(text.length * characterWidth) + paddingX * 2,
      isActive: percent === activePercent,
      opacity: 1,
    });
  }

  // Shift the ladder as one piece so a run near the pane edge stays evenly
  // spaced rather than losing its outer members.
  let shift = 0;
  let minLeft = Infinity;
  let maxRight = -Infinity;
  for (const marker of markers) {
    minLeft = Math.min(minLeft, marker.centerX - marker.width / 2);
    maxRight = Math.max(maxRight, marker.centerX + marker.width / 2);
  }
  if (minLeft < zoneLeft) shift = zoneLeft - minLeft;
  else if (maxRight > zoneRight) shift = zoneRight - maxRight;

  let activeCenter = 0;
  let activeWidth = 0;
  for (const marker of markers) {
    marker.centerX += shift;
    if (marker.isActive) {
      activeCenter = marker.centerX;
      activeWidth = marker.width;
    }
  }

  for (const marker of markers) {
    if (marker.isActive) continue;
    const clearance = Math.abs(marker.centerX - activeCenter);
    if (clearance < (marker.width + activeWidth) / 2 + minGap) {
      marker.opacity = PARTIAL_BRACKET_DIMMED_OPACITY;
    }
  }

  return markers;
}
