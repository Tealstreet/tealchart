import type { UnifiedPaneLayout } from '../../types';

export type NativePaneHeightOverrides = Readonly<Record<string, number>>;

/**
 * Identity of a pane layout once the user's dragged heights are folded in.
 *
 * `PaneManager.getUnifiedLayout()` mints a fresh wrapper on every call, so a
 * memo keyed on the object rebuilds each render as soon as an override exists -
 * which rebuilt the chart frame, and with it every gesture, continuously. The
 * signature is what actually changed.
 */
export function createNativePaneLayoutSignature(
  layout: UnifiedPaneLayout | null | undefined,
  overrides: NativePaneHeightOverrides = {},
): string {
  if (!layout) return '';
  // Every field the frame is built from, because the pane manager mutates its
  // pane objects in place: a signature that watched only heights would hold a
  // clone whose y range never moved again, and auto-scale would quietly die on
  // any pane the user had resized.
  const panes = layout.panes
    .map((pane) =>
      [
        pane.id,
        pane.type,
        overrides[pane.id] ?? pane.heightRatio,
        pane.yMin,
        pane.yMax,
        pane.fixedRange ? 'fixed' : 'auto',
        pane.autoScale === false ? 'manual' : 'scaled',
        pane.indicatorIds?.join(',') ?? '',
      ].join(':'),
    )
    .join('|');
  return `${layout.timeAxisHeight}#${panes}`;
}

export function applyNativePaneHeightOverrides<T extends UnifiedPaneLayout>(
  layout: T,
  overrides: NativePaneHeightOverrides,
): T {
  if (!layout.panes.some((pane) => overrides[pane.id] !== undefined)) return layout;
  return {
    ...layout,
    panes: layout.panes.map((pane) => {
      const heightRatio = overrides[pane.id];
      return heightRatio === undefined ? pane : { ...pane, heightRatio };
    }),
  };
}

/**
 * Whether a frame has finished laying its panes out at the given ratios.
 *
 * A plain maximize applies in a single commit, so this is normally already true
 * the first time it is asked and the hold that uses it comes down to waiting out
 * one Reanimated propagation. It earns its place in the cases that take more
 * than one commit - a pane added or removed while maximized restores first - and
 * it is safer than counting frames, because the indicator manager rewrites pane
 * ranges on any bar tick and mints a new frame mid-hold.
 *
 * Both sides are normalised: ratios do not always sum to one, since a pane that
 * appeared while another was maximized keeps its own height rather than a saved
 * share, and comparing a share against a raw ratio would never match.
 */
export function nativePaneHeightsMatchRatios(
  panes: readonly { height: number; id: string }[],
  ratios: Readonly<Record<string, number>>,
): boolean {
  const totalHeight = panes.reduce((sum, pane) => sum + pane.height, 0);
  if (totalHeight <= 0) return false;
  // Nothing the ratios say applies to the panes on hand, so there is nothing to
  // wait for - holding until the ceiling would be the worse answer.
  const totalRatio = panes.reduce((sum, pane) => sum + (ratios[pane.id] ?? 0), 0);
  if (totalRatio <= 0) return true;
  return panes.every((pane) => {
    const target = ratios[pane.id];
    if (target === undefined) return true;
    return Math.abs(pane.height / totalHeight - target / totalRatio) <= 0.01;
  });
}

/**
 * Drops dragged pane heights once the panes they balanced are not all present.
 *
 * A divider drag writes a ratio per pane on both sides of it, and those ratios
 * only mean anything together - `computePaneGeometry` multiplies by them without
 * normalising, so one surviving 0.154 lays the main pane out at 15% of the plot
 * and leaves the rest blank. Deleting the indicator under a dragged divider did
 * exactly that. Partial pruning would not help: what is left is still a share of
 * a layout that no longer exists.
 */
export function pruneNativePaneHeightOverrides(
  overrides: NativePaneHeightOverrides,
  paneIds: readonly string[],
): NativePaneHeightOverrides {
  const overriddenIds = Object.keys(overrides);
  if (overriddenIds.length === 0) return overrides;
  const present = new Set(paneIds);
  return overriddenIds.every((paneId) => present.has(paneId)) ? overrides : {};
}
