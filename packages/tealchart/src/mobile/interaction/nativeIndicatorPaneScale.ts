const NATIVE_PANE_SCALE_SENSITIVITY = 0.005;
const NATIVE_PANE_SCALE_MIN_FACTOR = 0.1;
const NATIVE_PANE_SCALE_MAX_FACTOR = 10;

export interface NativeIndicatorPaneScaleRange {
  yMin: number;
  yMax: number;
}

/**
 * The range an indicator pane takes while its axis is being dragged.
 *
 * Matches the web price-axis zoom (`EventManager.handlePriceAxisZoom`): the drag
 * scales around the range's centre, and the factor is normalised by how tall the
 * pane is relative to the whole plot, so a short indicator pane responds to a
 * drag the same way the main pane does rather than flying open.
 */
export function resolveNativeIndicatorPaneScaleRange({
  paneHeight,
  plotHeight,
  startYMax,
  startYMin,
  translationY,
}: {
  paneHeight: number;
  plotHeight: number;
  startYMax: number;
  startYMin: number;
  translationY: number;
}): NativeIndicatorPaneScaleRange {
  'worklet';
  const range = startYMax - startYMin;
  if (!(range > 0)) return { yMin: startYMin, yMax: startYMax };

  const safePaneHeight = paneHeight > 0 ? paneHeight : plotHeight;
  const heightScale = safePaneHeight > 0 ? plotHeight / safePaneHeight : 1;
  const factor = Math.min(
    NATIVE_PANE_SCALE_MAX_FACTOR,
    Math.max(NATIVE_PANE_SCALE_MIN_FACTOR, 1 + translationY * NATIVE_PANE_SCALE_SENSITIVITY * heightScale),
  );

  const center = (startYMax + startYMin) / 2;
  const nextRange = range * factor;

  return {
    yMin: center - nextRange / 2,
    yMax: center + nextRange / 2,
  };
}
