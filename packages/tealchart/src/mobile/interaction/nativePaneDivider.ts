import type { NativeChartFrame } from '../render/nativeChartFrame';

/** Touch target around a divider. Larger than web's 6px mouse zone — a finger is not a cursor. */
export const NATIVE_PANE_DIVIDER_HIT_ZONE = 14;

/** Each pane keeps at least this share of the two panes' combined space. Matches web. */
const NATIVE_PANE_DIVIDER_MIN_RATIO = 0.1;

/** A pane's geometry at drag start: the source rect of its frozen bitmap. */
export interface NativePaneDividerPaneRect {
  height: number;
  paneId: string;
  top: number;
}

export interface NativePaneDividerTarget {
  /** Total height the panes are laid out over, i.e. what a ratio is a ratio of. */
  availableHeight: number;
  dividerIndex: number;
  paneAboveId: string;
  paneAboveRatio: number;
  paneBelowId: string;
  paneBelowRatio: number;
  /** Every pane's geometry at drag start, in order. One bitmap each. */
  panes: readonly NativePaneDividerPaneRect[];
  y: number;
}

export interface NativePaneHeight {
  heightRatio: number;
  paneId: string;
}

/** Where a pane's bitmap is drawn this frame, and the rect it was captured from. */
export interface NativePaneDividerBand {
  height: number;
  paneId: string;
  srcHeight: number;
  srcTop: number;
  top: number;
}

/**
 * The divider under a touch, or null.
 *
 * Ratios come from the frame rather than the layout: `computePaneGeometry` lays
 * panes out over `height - timeAxisHeight - topOffset`, so the pane heights
 * already sum to exactly that, and dividing by the sum needs no margin knowledge.
 */
export function resolveNativePaneDividerAtY(
  frame: NativeChartFrame,
  y: number,
  hitZone: number = NATIVE_PANE_DIVIDER_HIT_ZONE,
): NativePaneDividerTarget | null {
  'worklet';
  const panes = frame.panes;
  if (panes.length < 2) return null;

  let availableHeight = 0;
  for (let index = 0; index < panes.length; index += 1) availableHeight += panes[index]!.height;
  if (!(availableHeight > 0)) return null;

  for (let index = 0; index < panes.length - 1; index += 1) {
    const above = panes[index]!;
    const below = panes[index + 1]!;
    if (Math.abs(y - above.bottom) > hitZone) continue;

    const rects: NativePaneDividerPaneRect[] = [];
    for (let paneIndex = 0; paneIndex < panes.length; paneIndex += 1) {
      const pane = panes[paneIndex]!;
      rects.push({ height: pane.height, paneId: pane.id, top: pane.top });
    }

    return {
      availableHeight,
      dividerIndex: index,
      paneAboveId: above.id,
      paneAboveRatio: above.height / availableHeight,
      paneBelowId: below.id,
      paneBelowRatio: below.height / availableHeight,
      panes: rects,
      y: above.bottom,
    };
  }

  return null;
}

/**
 * New heights for the two panes a divider separates. Dragging down grows the
 * pane above, and the pair's combined share is conserved so panes further away
 * never move.
 */
export function resolveNativePaneDividerHeights({
  target,
  translationY,
}: {
  target: NativePaneDividerTarget;
  translationY: number;
}): NativePaneHeight[] {
  'worklet';
  const combined = target.paneAboveRatio + target.paneBelowRatio;
  const minRatio = combined * NATIVE_PANE_DIVIDER_MIN_RATIO;
  const ratioChange = target.availableHeight > 0 ? translationY / target.availableHeight : 0;

  let above = target.paneAboveRatio + ratioChange;
  let below = target.paneBelowRatio - ratioChange;

  if (above < minRatio) {
    above = minRatio;
    below = combined - minRatio;
  }
  if (below < minRatio) {
    below = minRatio;
    above = combined - minRatio;
  }

  return [
    { heightRatio: above, paneId: target.paneAboveId },
    { heightRatio: below, paneId: target.paneBelowId },
  ];
}

/**
 * Where every pane's frozen bitmap goes this frame.
 *
 * The live chart cannot re-lay-out per frame — doing that is what made this drag
 * crawl — so each pane is captured once and stretched independently, the same
 * trade a container resize makes. Only the dragged pair changes; the rest keep
 * their captured geometry, because the pair conserves its combined height.
 */
export function resolveNativePaneDividerBands({
  target,
  translationY,
}: {
  target: NativePaneDividerTarget;
  translationY: number;
}): NativePaneDividerBand[] {
  'worklet';
  const heights = resolveNativePaneDividerHeights({ target, translationY });
  const aboveHeight = heights[0]!.heightRatio * target.availableHeight;
  const belowHeight = heights[1]!.heightRatio * target.availableHeight;

  const bands: NativePaneDividerBand[] = [];
  for (let index = 0; index < target.panes.length; index += 1) {
    const pane = target.panes[index]!;
    let top = pane.top;
    let height = pane.height;
    if (pane.paneId === target.paneAboveId) {
      height = aboveHeight;
    } else if (pane.paneId === target.paneBelowId) {
      top = pane.top + (aboveHeight - (target.paneAboveRatio * target.availableHeight));
      height = belowHeight;
    }
    bands.push({ height, paneId: pane.paneId, srcHeight: pane.height, srcTop: pane.top, top });
  }
  return bands;
}
