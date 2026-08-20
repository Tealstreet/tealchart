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
  symbol,
}: {
  barsContext: ChartWidgetBarsChangedContext | null;
  barsLength: number;
  interval: string;
  isLoading: boolean;
  symbol: string;
}): boolean {
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
  previousBarsLength,
  previousHasDataViewport,
  previousProjectionReady,
  projectionReady,
  symbol,
  viewportGestureActive = false,
}: {
  barsContext: ChartWidgetBarsChangedContext | null;
  barsLength: number;
  hasDataViewport: boolean;
  interval: string;
  isLoading: boolean;
  previousBarsLength: number;
  previousHasDataViewport: boolean;
  previousProjectionReady: boolean;
  projectionReady: boolean;
  symbol: string;
  /** A live pan or pinch drives the canvas from shared values; freezing it mid-drag reads as the chart jumping back a few frames. */
  viewportGestureActive?: boolean;
}): boolean {
  const canHoldPreviousSnapshot = previousBarsLength > 0 && previousHasDataViewport && previousProjectionReady;
  if (!canHoldPreviousSnapshot) return false;
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
