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
  return (
    isLoading ||
    isNativeBarSnapshotPendingRequestedData({
      barsContext,
      barsLength,
      interval,
      symbol,
    })
  );
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
}): boolean {
  const canHoldPreviousSnapshot = previousBarsLength > 0 && previousHasDataViewport && previousProjectionReady;
  if (!canHoldPreviousSnapshot) return false;
  if (barsLength === 0 || !hasDataViewport || !projectionReady || isLoading) return true;

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
}: {
  dataLoadRenderBlocked: boolean;
  holdingSnapshot: boolean;
}): boolean {
  return holdingSnapshot || dataLoadRenderBlocked;
}
