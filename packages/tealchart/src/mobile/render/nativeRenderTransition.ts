import type { ChartWidgetBarsChangedContext } from '../../core/ChartWidgetCore';

export function nativeBarsMatchRequestedData({
  barsContext,
  barsLength,
  interval,
  symbol,
}: {
  barsContext: ChartWidgetBarsChangedContext | null;
  barsLength: number;
  interval: string;
  symbol: string;
}): boolean {
  if (barsLength === 0) return false;
  if (!barsContext) return true;
  return barsContext.symbol === symbol && barsContext.interval === interval;
}

export function isNativeBarSnapshotPendingRequestedData({
  barsContext,
  barsLength,
  interval,
  symbol,
}: {
  barsContext: ChartWidgetBarsChangedContext | null;
  barsLength: number;
  interval: string;
  symbol: string;
}): boolean {
  return (
    barsLength > 0 &&
    barsContext !== null &&
    !nativeBarsMatchRequestedData({
      barsContext,
      barsLength,
      interval,
      symbol,
    })
  );
}

/**
 * Whether the bars on hand must not be drawn for the requested market at all.
 *
 * Another symbol's bars are another market's prices: on an account switch they
 * are another venue's, and faded under the new label they still read as that
 * market's chart (AGT-127). The previous interval of the same market stays
 * faded while its replacement loads, but not once that load has failed.
 */
export function nativeBarsBelongToOtherMarket({
  barsContext,
  interval,
  loadFailed,
  symbol,
}: {
  barsContext: ChartWidgetBarsChangedContext | null;
  interval: string;
  loadFailed: boolean;
  symbol: string;
}): boolean {
  if (!barsContext) return false;
  if (barsContext.symbol !== symbol) return true;
  return loadFailed && barsContext.interval !== interval;
}

/**
 * Whether to fade what is on screen.
 *
 * The fade means "these candles are not the market you asked for", not "a
 * request is in flight". Cached history painted before the live response is
 * real data for the requested market, and dimming it made a chart that had
 * already drawn look like it was still fetching, then flash to full strength
 * when the response landed. Bars for the market you just left still fade.
 */
export function shouldDimNativeRenderForTransition({
  barsContext,
  barsLength,
  interval,
  isLoading,
  loadFailed,
  symbol,
}: {
  barsContext: ChartWidgetBarsChangedContext | null;
  barsLength: number;
  interval: string;
  isLoading: boolean;
  /** A failed load is not pending, so nothing on screen may suggest it is. */
  loadFailed: boolean;
  symbol: string;
}): boolean {
  if (loadFailed) return false;
  if (barsLength === 0) return isLoading;

  return isNativeBarSnapshotPendingRequestedData({
    barsContext,
    barsLength,
    interval,
    symbol,
  });
}

export function shouldHoldNativeRenderSnapshotForTransition({
  barsContext,
  barsLength,
  hasDataViewport,
  interval,
  isLoading,
  loadFailed,
  viewportGestureActive = false,
  previousBarsContext,
  previousBarsLength,
  previousHasDataViewport,
  previousProjectionReady,
  projectionReady,
  symbol,
}: {
  barsContext: ChartWidgetBarsChangedContext | null;
  barsLength: number;
  hasDataViewport: boolean;
  interval: string;
  isLoading: boolean;
  loadFailed: boolean;
  /** A live pan or pinch drives the canvas from shared values; freezing it mid-drag reads as the chart jumping back a few frames. */
  viewportGestureActive?: boolean;
  /** The market the held snapshot was drawn for; `null` when its bars carried no context. */
  previousBarsContext: ChartWidgetBarsChangedContext | null;
  previousBarsLength: number;
  previousHasDataViewport: boolean;
  previousProjectionReady: boolean;
  projectionReady: boolean;
  symbol: string;
}): boolean {
  const canHoldPreviousSnapshot = previousBarsLength > 0 && previousHasDataViewport && previousProjectionReady;
  if (!canHoldPreviousSnapshot) return false;
  // Holding another market's snapshot is how its candles stayed up (AGT-127).
  if (nativeBarsBelongToOtherMarket({ barsContext: previousBarsContext, interval, loadFailed, symbol })) return false;
  if (barsLength === 0 || !hasDataViewport || !projectionReady) return true;
  // Only the loading clause gives way to a gesture. The others mean the data on
  // hand belongs to nothing the chart can draw, and holding is still right.
  if (isLoading && !viewportGestureActive) return true;

  const barsMatchRequestedData = nativeBarsMatchRequestedData({
    barsContext,
    barsLength,
    interval,
    symbol,
  });
  if (!barsMatchRequestedData) return true;

  return false;
}

export function shouldUseNativeStaticRenderProjectionForTransition({
  dataLoadRenderBlocked,
  holdingSnapshot,
  viewportGestureActive = false,
}: {
  dataLoadRenderBlocked: boolean;
  holdingSnapshot: boolean;
  /** A live gesture drives the canvas from shared values, so a data-load block must not freeze it onto the JS-side projection. */
  viewportGestureActive?: boolean;
}): boolean {
  if (holdingSnapshot) return true;
  return dataLoadRenderBlocked && !viewportGestureActive;
}
