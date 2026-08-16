import type { NativePaneFrame } from './nativeChartFrame';

export interface NativePaneRange {
  yMin: number;
  yMax: number;
}

/**
 * Live value ranges for indicator panes, keyed by pane id.
 *
 * A pane's committed range lives on the frame, which only changes through React.
 * While a drag is in flight the range has to move on the UI thread instead, or
 * every frame of the gesture rebuilds the chart — so gestures write here, the
 * render layers prefer it, and the value is committed to the pane on release.
 */
export type NativePaneRangeOverrides = Record<string, NativePaneRange>;

export function resolveNativePaneRange(
  pane: NativePaneFrame,
  overrides: NativePaneRangeOverrides | undefined,
): NativePaneRange {
  'worklet';
  const override = overrides ? overrides[pane.id] : undefined;
  if (override) return override;
  return { yMin: pane.yMin, yMax: pane.yMax };
}

export function nativePaneValueToYWithRange(value: number, pane: NativePaneFrame, range: NativePaneRange): number {
  'worklet';
  const span = range.yMax - range.yMin;
  if (span === 0) return pane.top + pane.height / 2;
  return pane.top + ((range.yMax - value) / span) * pane.height;
}

/**
 * Works out which overrides the frame has caught up with.
 *
 * An override outlives its gesture on purpose: the commit reaches the pane
 * through React, so dropping it on release would leave the in-between renders
 * falling back to the pre-drag range. It is retired only once the frame agrees,
 * or once its pane is gone.
 */
export function resolveSettledNativePaneRangeOverrides({
  overrides,
  panes,
}: {
  overrides: NativePaneRangeOverrides;
  panes: readonly NativePaneFrame[];
}): { remaining: NativePaneRangeOverrides; settled: boolean } {
  const remaining: NativePaneRangeOverrides = {};
  let settled = false;

  for (const paneId of Object.keys(overrides)) {
    const override = overrides[paneId];
    const pane = panes.find((entry) => entry.id === paneId);
    if (!pane) {
      settled = true;
      continue;
    }
    if (pane.yMin === override.yMin && pane.yMax === override.yMax) {
      settled = true;
      continue;
    }
    remaining[paneId] = override;
  }

  return { remaining, settled };
}

/**
 * Slide a pane's range by a vertical drag. Matches the main viewport's sign
 * convention in `panViewport`: dragging down raises the values on screen.
 */
export function resolveNativeIndicatorPaneTranslateRange({
  paneHeight,
  startYMax,
  startYMin,
  translationY,
}: {
  paneHeight: number;
  startYMax: number;
  startYMin: number;
  translationY: number;
}): NativePaneRange {
  'worklet';
  const span = startYMax - startYMin;
  if (!(span > 0) || !(paneHeight > 0)) return { yMin: startYMin, yMax: startYMax };
  const delta = translationY * (span / paneHeight);
  return { yMin: startYMin + delta, yMax: startYMax + delta };
}
