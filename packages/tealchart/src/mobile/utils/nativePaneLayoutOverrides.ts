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
