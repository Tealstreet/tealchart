import type { SharedValue } from 'react-native-reanimated';
import type { HistoryBackfillDirection, HistoryBackfillRequestHint } from '../../core/historyBackfill';
import type { Bar, Viewport, ViewScaleState } from '../../types';
import type { NativeChartFrame } from '../render/nativeChartFrame';
import type { NativeChartProjection } from '../render/nativeProjection';
import type { NativeViewportSharedValues } from '../render/nativeSharedViewport';
import type { NativePriceAutoScaleSharedValues, NativeViewportGestureMetrics } from './nativeViewportGestureState';
import type { NativeViewportOwnershipState } from './nativeViewportSync';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useAnimatedReaction, useSharedValue } from 'react-native-reanimated';
import { runOnJS } from 'react-native-worklets';

import { resolveHistoryBackfillRequiredStartTime } from '../../core/historyBackfill';
import { TealchartRenderer } from '../../TealchartRenderer';
import { captureViewScale, intervalToMs, restoreViewport } from '../../viewport/viewScale';
import { createNativeChartProjection } from '../render/nativeProjection';
import { getNativeCandidateTimeWindow, nativeViewportCoversCandidateTimeWindow } from '../render/nativeTimeWindow';
import { createNativeAutoScaleBars } from './nativeAutoScale';
import { resetNativeViewportGestureActiveFlags, syncNativeViewportGestureMetrics } from './nativeViewportGestureState';
import {
  applyNativeViewportSync,
  beginNativeViewportOwnership,
  cancelNativeViewportOwnership,
  commitNativeViewportOwnership,
  createNativeViewportOwnershipState,
  getNativeSharedViewport,
  nativeSharedViewportsMatch,
  nativeViewportsMatch,
  requestNativeSharedViewportSync,
  syncNativeSharedViewportIfChanged,
} from './nativeViewportSync';

export interface NativeViewportRuntimeInput {
  autoScaleEnabled: boolean;
  bars: readonly Bar[];
  barsMatchRequestedData: boolean;
  frame: NativeChartFrame | null;
  interval: string;
  isLoading: boolean;
  loadedBarsInterval: string;
  onRequestMoreBars?: (direction: HistoryBackfillDirection, hint?: HistoryBackfillRequestHint) => void;
  onViewportChange?: (viewport: Viewport) => void;
  panActive: SharedValue<boolean>;
  panMetrics: NativeViewportGestureMetrics;
  panStartViewport: NativeViewportSharedValues;
  pinchActive: SharedValue<boolean>;
  priceAutoScale: NativePriceAutoScaleSharedValues;
  priceScaleActive: SharedValue<boolean>;
  sharedViewport: NativeViewportSharedValues;
  symbol: string;
  timeScaleActive: SharedValue<boolean>;
  viewportSyncEpoch: SharedValue<number>;
}

export interface NativeViewportRuntime {
  applyNativeViewport: (nextViewport?: Viewport | null) => boolean;
  beginNativeViewportInteraction: () => void;
  cancelNativeViewportInteraction: () => void;
  commitPanViewport: (nextViewport: Viewport) => void;
  dataLoadRenderBlocked: boolean;
  hasDataViewport: boolean;
  projection: NativeChartProjection | null;
  resetNativeViewport: () => void;
  viewport: Viewport;
}

export const NATIVE_EMPTY_RENDER_VIEWPORT: Viewport = {
  startTime: 0,
  endTime: 1,
  priceMin: 0,
  priceMax: 1,
};
const EMPTY_NATIVE_VIEWPORT_BARS: readonly Bar[] = [];

function normalizeNativeViewport(viewport: Viewport | null, bars: readonly Bar[]): Viewport | null {
  if (viewport) return viewport;
  if (bars.length === 0) return null;
  return TealchartRenderer.calculateViewport([...bars]);
}

export interface NativeDataLoadViewScaleCapture {
  dataKey: string;
  sourceBars: readonly Bar[];
  viewScale: ViewScaleState;
}

export function createNativeViewportDataKey(symbol: string, interval: string): string {
  return `${symbol}\n${interval}`;
}

export function shouldPreserveNativeDataLoadViewScale({
  nextInterval,
  nextSymbol,
  previousInterval,
  previousSymbol,
}: {
  nextInterval: string;
  nextSymbol: string;
  previousInterval: string;
  previousSymbol: string;
}): boolean {
  return previousSymbol === nextSymbol && previousInterval !== nextInterval;
}

export function captureNativeDataLoadViewScale({
  bars,
  dataKey,
  hasDataViewport,
  interval,
  viewport,
}: {
  bars: readonly Bar[];
  dataKey: string;
  hasDataViewport: boolean;
  interval: string;
  viewport: Viewport;
}): NativeDataLoadViewScaleCapture | null {
  if (!hasDataViewport || bars.length === 0) return null;
  return {
    dataKey,
    sourceBars: bars,
    viewScale: captureViewScale(viewport, [...bars], intervalToMs(interval)),
  };
}

export function restoreNativeDataLoadViewport({
  bars,
  dataKey,
  interval,
  pending,
}: {
  bars: readonly Bar[];
  dataKey: string;
  interval: string;
  pending: NativeDataLoadViewScaleCapture | null;
}): Viewport | null {
  if (!pending || pending.dataKey !== dataKey || bars.length === 0) return null;
  if (Object.is(pending.sourceBars, bars)) return null;
  return restoreViewport(pending.viewScale, [...bars], intervalToMs(interval));
}

export function resolveNativeRenderViewport({
  autoViewport,
  settledViewport,
}: {
  autoViewport: Viewport | null;
  settledViewport: Viewport | null;
}): { hasDataViewport: boolean; viewport: Viewport } {
  const dataViewport = settledViewport ?? autoViewport;
  if (dataViewport) {
    return { hasDataViewport: true, viewport: dataViewport };
  }
  return { hasDataViewport: false, viewport: NATIVE_EMPTY_RENDER_VIEWPORT };
}

export function shouldRebaseNativeCandidateViewport(candidateViewport: Viewport, nextViewport: Viewport): boolean {
  return !nativeViewportCoversCandidateTimeWindow(candidateViewport, nextViewport);
}

export function resolveNativeHistoryBackfillHint(viewport: Viewport): HistoryBackfillRequestHint {
  return {
    viewport,
    requiredStartTime: getNativeCandidateTimeWindow(viewport).startTime,
  };
}

export function shouldSyncNativeCandidateViewport({
  currentCandidateViewport,
  hasDataViewport,
  hasManualViewport,
  nativeViewportOwned,
  viewport,
}: {
  currentCandidateViewport: Viewport | null;
  hasDataViewport: boolean;
  hasManualViewport: boolean;
  nativeViewportOwned: boolean;
  viewport: Viewport;
}): boolean {
  if (!hasDataViewport) return currentCandidateViewport !== null;
  if (hasManualViewport || nativeViewportOwned) return false;
  return !currentCandidateViewport || !nativeViewportsMatch(currentCandidateViewport, viewport);
}

export function useNativeViewportRuntime({
  autoScaleEnabled,
  bars,
  barsMatchRequestedData,
  frame,
  interval,
  isLoading,
  loadedBarsInterval,
  onRequestMoreBars,
  onViewportChange,
  panActive,
  panMetrics,
  panStartViewport,
  pinchActive,
  priceAutoScale,
  priceScaleActive,
  sharedViewport,
  symbol,
  timeScaleActive,
  viewportSyncEpoch,
}: NativeViewportRuntimeInput): NativeViewportRuntime {
  const [settledViewport, setSettledViewport] = useState<Viewport | null>(null);
  const [candidateViewport, setCandidateViewport] = useState<Viewport | null>(null);
  const [pendingSharedViewportSyncEpoch, setPendingSharedViewportSyncEpoch] = useState<number | null>(null);
  const viewportOwnershipRef = useRef<NativeViewportOwnershipState>(createNativeViewportOwnershipState());
  const candidateViewportRef = useRef<Viewport | null>(null);
  const dataKey = createNativeViewportDataKey(symbol, interval);
  const previousDataKeyRef = useRef(dataKey);
  const previousSymbolRef = useRef(symbol);
  const previousIntervalRef = useRef(interval);
  const loadedBarsRef = useRef<readonly Bar[]>(bars);
  const loadedBarsIntervalRef = useRef(loadedBarsInterval);
  const pendingDataLoadViewScaleRef = useRef<NativeDataLoadViewScaleCapture | null>(null);
  const nextSharedViewportSyncEpochRef = useRef(0);
  const pendingSharedViewportSyncEpochRef = useRef<number | null>(null);
  const pendingSharedViewportSyncTargetRef = useRef<Viewport | null>(null);
  const syncTargetStartTime = useSharedValue(0);
  const syncTargetEndTime = useSharedValue(1);
  const syncTargetPriceMin = useSharedValue(0);
  const syncTargetPriceMax = useSharedValue(1);
  const syncTargetEpoch = useSharedValue(0);
  const syncTargetViewport = useMemo<NativeViewportSharedValues>(
    () => ({
      startTime: syncTargetStartTime,
      endTime: syncTargetEndTime,
      priceMin: syncTargetPriceMin,
      priceMax: syncTargetPriceMax,
    }),
    [syncTargetEndTime, syncTargetPriceMax, syncTargetPriceMin, syncTargetStartTime],
  );
  const viewportBars = barsMatchRequestedData ? bars : EMPTY_NATIVE_VIEWPORT_BARS;
  const autoViewport = useMemo(() => normalizeNativeViewport(null, viewportBars), [viewportBars]);
  const pendingDataLoadViewport = useMemo(
    () =>
      restoreNativeDataLoadViewport({
        bars: viewportBars,
        dataKey,
        interval,
        pending: pendingDataLoadViewScaleRef.current,
      }),
    [dataKey, interval, viewportBars],
  );

  useEffect(() => {
    priceAutoScale.bars.value = createNativeAutoScaleBars(viewportBars);
  }, [priceAutoScale, viewportBars]);

  useEffect(() => {
    priceAutoScale.active.value = autoScaleEnabled;
  }, [autoScaleEnabled, priceAutoScale]);

  const { hasDataViewport, viewport } = useMemo(
    () => resolveNativeRenderViewport({ autoViewport, settledViewport }),
    [autoViewport, settledViewport],
  );
  const projectionViewport = candidateViewport ?? viewport;
  const projection = useMemo(
    () => (frame ? createNativeChartProjection({ frame, viewport: projectionViewport }) : null),
    [frame, projectionViewport],
  );

  const confirmSharedViewportSyncEpoch = useCallback((epoch: number) => {
    if (pendingSharedViewportSyncEpochRef.current !== epoch) return;
    pendingSharedViewportSyncEpochRef.current = null;
    pendingSharedViewportSyncTargetRef.current = null;
    setPendingSharedViewportSyncEpoch(null);
  }, []);

  useAnimatedReaction(
    () => {
      const epoch = viewportSyncEpoch.value;
      if (epoch === 0 || syncTargetEpoch.value !== epoch) return 0;
      return nativeSharedViewportsMatch(sharedViewport, syncTargetViewport) ? epoch : 0;
    },
    (epoch, previousEpoch) => {
      if (epoch === previousEpoch || epoch === 0) return;
      runOnJS(confirmSharedViewportSyncEpoch)(epoch);
    },
    [confirmSharedViewportSyncEpoch, sharedViewport, syncTargetEpoch, syncTargetViewport, viewportSyncEpoch],
  );

  const requestNativeRenderViewportSync = useCallback(
    (nextViewport: Viewport) => {
      nextSharedViewportSyncEpochRef.current += 1;
      const nextEpoch = nextSharedViewportSyncEpochRef.current;
      pendingSharedViewportSyncEpochRef.current = nextEpoch;
      pendingSharedViewportSyncTargetRef.current = nextViewport;
      const syncComplete = requestNativeSharedViewportSync({
        epoch: nextEpoch,
        panStartViewport,
        sharedViewport,
        syncTargetEpoch,
        syncTargetViewport,
        viewport: nextViewport,
        viewportSyncEpoch,
      });
      if (syncComplete) {
        pendingSharedViewportSyncEpochRef.current = null;
        pendingSharedViewportSyncTargetRef.current = null;
        setPendingSharedViewportSyncEpoch(null);
        return;
      }
      setPendingSharedViewportSyncEpoch(nextEpoch);
    },
    [panStartViewport, sharedViewport, syncTargetEpoch, syncTargetViewport, viewportSyncEpoch],
  );

  useEffect(() => {
    if (previousDataKeyRef.current === dataKey) return;
    const previousSymbol = previousSymbolRef.current;
    const previousInterval = previousIntervalRef.current;
    const shouldPreserveViewScale = shouldPreserveNativeDataLoadViewScale({
      nextInterval: interval,
      nextSymbol: symbol,
      previousInterval,
      previousSymbol,
    });

    pendingSharedViewportSyncEpochRef.current = null;
    pendingSharedViewportSyncTargetRef.current = null;
    setPendingSharedViewportSyncEpoch(null);
    resetNativeViewportGestureActiveFlags({ panActive, pinchActive, priceScaleActive, timeScaleActive });

    if (shouldPreserveViewScale) {
      viewportOwnershipRef.current = cancelNativeViewportOwnership(viewportOwnershipRef.current);
      const sourceBars = loadedBarsRef.current.length > 0 ? loadedBarsRef.current : bars;
      pendingDataLoadViewScaleRef.current = captureNativeDataLoadViewScale({
        bars: sourceBars,
        dataKey,
        hasDataViewport,
        interval: loadedBarsIntervalRef.current,
        viewport: candidateViewportRef.current ?? viewport,
      });
    } else {
      pendingDataLoadViewScaleRef.current = null;
      viewportOwnershipRef.current = createNativeViewportOwnershipState();
      candidateViewportRef.current = autoViewport;
      setCandidateViewport(autoViewport);
      setSettledViewport(null);
      priceAutoScale.active.value = autoScaleEnabled;
      if (autoViewport) {
        syncNativeSharedViewportIfChanged(sharedViewport, autoViewport);
        syncNativeSharedViewportIfChanged(panStartViewport, autoViewport);
        onViewportChange?.(autoViewport);
      }
    }

    previousDataKeyRef.current = dataKey;
    previousSymbolRef.current = symbol;
    previousIntervalRef.current = interval;
  }, [
    autoScaleEnabled,
    autoViewport,
    bars,
    dataKey,
    hasDataViewport,
    interval,
    onViewportChange,
    panActive,
    panStartViewport,
    pinchActive,
    priceAutoScale,
    priceScaleActive,
    sharedViewport,
    symbol,
    timeScaleActive,
    viewport,
  ]);

  useLayoutEffect(() => {
    if (!pendingDataLoadViewport) return;

    pendingDataLoadViewScaleRef.current = null;
    loadedBarsRef.current = bars;
    loadedBarsIntervalRef.current = loadedBarsInterval;
    viewportOwnershipRef.current = cancelNativeViewportOwnership(
      commitNativeViewportOwnership(viewportOwnershipRef.current, pendingDataLoadViewport),
    );
    candidateViewportRef.current = pendingDataLoadViewport;
    setCandidateViewport(pendingDataLoadViewport);
    setSettledViewport(pendingDataLoadViewport);
    requestNativeRenderViewportSync(pendingDataLoadViewport);
    onViewportChange?.(pendingDataLoadViewport);
  }, [bars, dataKey, loadedBarsInterval, onViewportChange, pendingDataLoadViewport, requestNativeRenderViewportSync]);

  useEffect(() => {
    if (!barsMatchRequestedData || isLoading || bars.length === 0 || Object.is(loadedBarsRef.current, bars)) return;
    loadedBarsRef.current = bars;
    loadedBarsIntervalRef.current = loadedBarsInterval;
  }, [bars, barsMatchRequestedData, isLoading, loadedBarsInterval]);

  useEffect(() => {
    candidateViewportRef.current = projectionViewport;
  }, [projectionViewport]);

  useEffect(() => {
    if (!hasDataViewport) {
      if (
        shouldSyncNativeCandidateViewport({
          currentCandidateViewport: candidateViewportRef.current,
          hasDataViewport,
          hasManualViewport: viewportOwnershipRef.current.hasManualViewport,
          nativeViewportOwned: viewportOwnershipRef.current.nativeViewportOwned,
          viewport,
        })
      ) {
        candidateViewportRef.current = null;
        setCandidateViewport(null);
      }
      return;
    }
    if (
      shouldSyncNativeCandidateViewport({
        currentCandidateViewport: candidateViewportRef.current,
        hasDataViewport,
        hasManualViewport: viewportOwnershipRef.current.hasManualViewport,
        nativeViewportOwned: viewportOwnershipRef.current.nativeViewportOwned,
        viewport,
      })
    ) {
      candidateViewportRef.current = viewport;
      setCandidateViewport(viewport);
    }
  }, [hasDataViewport, viewport]);

  useEffect(() => {
    const nativeInteractionActive =
      panActive.value || pinchActive.value || priceScaleActive.value || timeScaleActive.value;
    const result = applyNativeViewportSync({
      state: viewportOwnershipRef.current,
      sharedViewport,
      panStartViewport,
      nativeInteractionActive,
      viewport,
    });
    viewportOwnershipRef.current = result.state;
    if (result.type === 'confirmed') {
      resetNativeViewportGestureActiveFlags({ panActive, pinchActive, priceScaleActive, timeScaleActive });
    }
  }, [panActive, panStartViewport, pinchActive, priceScaleActive, sharedViewport, timeScaleActive, viewport]);

  useEffect(() => {
    if (!projection) return;
    syncNativeViewportGestureMetrics({
      metrics: panMetrics,
      intervalMs: intervalToMs(loadedBarsInterval),
      contentWidth: frame?.contentWidth ?? 1,
      timePerPixel: projection.timePerPixel,
      pricePerPixel: projection.getPricePerPixel(),
    });
  }, [frame, loadedBarsInterval, panMetrics, projection]);

  useLayoutEffect(() => {
    if (!hasDataViewport || pendingDataLoadViewport) return;
    const nativeInteractionActive =
      panActive.value || pinchActive.value || priceScaleActive.value || timeScaleActive.value;
    if (viewportOwnershipRef.current.nativeViewportOwned || nativeInteractionActive) return;

    const pendingTarget = pendingSharedViewportSyncTargetRef.current;
    if (pendingTarget && nativeViewportsMatch(pendingTarget, projectionViewport)) return;
    if (nativeViewportsMatch(getNativeSharedViewport(sharedViewport), projectionViewport)) return;

    requestNativeRenderViewportSync(projectionViewport);
  }, [
    hasDataViewport,
    panActive,
    pendingDataLoadViewport,
    pinchActive,
    priceScaleActive,
    projectionViewport,
    requestNativeRenderViewportSync,
    sharedViewport,
    timeScaleActive,
  ]);

  const commitPanViewport = useCallback(
    (nextViewport: Viewport) => {
      const candidateBefore = candidateViewportRef.current ?? viewport;
      const shouldRebase = shouldRebaseNativeCandidateViewport(candidateBefore, nextViewport);
      const hint = resolveNativeHistoryBackfillHint(nextViewport);
      viewportOwnershipRef.current = commitNativeViewportOwnership(viewportOwnershipRef.current, nextViewport);
      candidateViewportRef.current = shouldRebase ? nextViewport : candidateBefore;
      setCandidateViewport(shouldRebase ? nextViewport : candidateBefore);
      setSettledViewport(nextViewport);
      const earliestBar = bars[0];
      const requiredStartTime = resolveHistoryBackfillRequiredStartTime(hint);
      const backfillRequested =
        earliestBar && typeof requiredStartTime === 'number' && requiredStartTime < earliestBar.time;
      if (backfillRequested) {
        onRequestMoreBars?.('left', hint);
      }
      onViewportChange?.(nextViewport);
    },
    [bars, onRequestMoreBars, onViewportChange, viewport],
  );

  const beginNativeViewportInteraction = useCallback(() => {
    viewportOwnershipRef.current = beginNativeViewportOwnership(viewportOwnershipRef.current);
  }, []);

  const cancelNativeViewportInteraction = useCallback(() => {
    viewportOwnershipRef.current = cancelNativeViewportOwnership(viewportOwnershipRef.current);
  }, []);

  const resetNativeViewport = useCallback(() => {
    if (!autoViewport) return;
    priceAutoScale.active.value = true;
    viewportOwnershipRef.current = createNativeViewportOwnershipState();
    candidateViewportRef.current = autoViewport;
    setCandidateViewport(autoViewport);
    setSettledViewport(null);
    syncNativeSharedViewportIfChanged(sharedViewport, autoViewport);
    syncNativeSharedViewportIfChanged(panStartViewport, autoViewport);
    resetNativeViewportGestureActiveFlags({ panActive, pinchActive, priceScaleActive, timeScaleActive });
    onViewportChange?.(autoViewport);
  }, [
    autoViewport,
    onViewportChange,
    panActive,
    panStartViewport,
    pinchActive,
    priceAutoScale,
    priceScaleActive,
    sharedViewport,
    timeScaleActive,
  ]);

  const applyNativeViewport = useCallback(
    (nextViewport?: Viewport | null): boolean => {
      if (!nextViewport) return false;
      viewportOwnershipRef.current = commitNativeViewportOwnership(viewportOwnershipRef.current, nextViewport);
      candidateViewportRef.current = nextViewport;
      setCandidateViewport(nextViewport);
      setSettledViewport(nextViewport);
      syncNativeSharedViewportIfChanged(sharedViewport, nextViewport);
      syncNativeSharedViewportIfChanged(panStartViewport, nextViewport);
      resetNativeViewportGestureActiveFlags({ panActive, pinchActive, priceScaleActive, timeScaleActive });
      onViewportChange?.(nextViewport);
      return true;
    },
    [onViewportChange, panActive, panStartViewport, pinchActive, priceScaleActive, sharedViewport, timeScaleActive],
  );

  return {
    applyNativeViewport,
    beginNativeViewportInteraction,
    cancelNativeViewportInteraction,
    commitPanViewport,
    dataLoadRenderBlocked: Boolean(pendingDataLoadViewport || pendingSharedViewportSyncEpoch !== null),
    hasDataViewport,
    projection,
    resetNativeViewport,
    viewport,
  };
}
