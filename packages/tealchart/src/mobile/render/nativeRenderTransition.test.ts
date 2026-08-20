import { describe, expect, it } from 'vitest';

import {
  isNativeBarSnapshotPendingRequestedData,
  nativeBarsMatchRequestedData,
  shouldDimNativeRenderForTransition,
  shouldHoldNativeRenderSnapshotForTransition,
  shouldUseNativeStaticRenderProjectionForTransition,
} from './nativeRenderTransition';

describe('native render transition data identity', () => {
  it('keeps a native render transition pending while retained bars belong to the previous interval', () => {
    expect(
      isNativeBarSnapshotPendingRequestedData({
        barsContext: {
          interval: '15',
          requestId: 1,
          source: 'history',
          symbol: 'BTC',
        },
        barsLength: 250,
        interval: '5',
        symbol: 'BTC',
      }),
    ).toBe(true);
  });

  it('keeps a native render transition pending while retained bars belong to the previous symbol', () => {
    expect(
      isNativeBarSnapshotPendingRequestedData({
        barsContext: {
          interval: '15',
          requestId: 1,
          source: 'history',
          symbol: 'ETH',
        },
        barsLength: 250,
        interval: '15',
        symbol: 'BTC',
      }),
    ).toBe(true);
  });

  it('allows the render snapshot to promote when bars match the requested data', () => {
    const barsContext = {
      interval: '5',
      requestId: 2,
      source: 'history' as const,
      symbol: 'BTC',
    };

    expect(
      nativeBarsMatchRequestedData({
        barsContext,
        barsLength: 250,
        interval: '5',
        symbol: 'BTC',
      }),
    ).toBe(true);
    expect(
      isNativeBarSnapshotPendingRequestedData({
        barsContext,
        barsLength: 250,
        interval: '5',
        symbol: 'BTC',
      }),
    ).toBe(false);
  });

  it('does not block legacy bar snapshots that have no request context', () => {
    expect(
      isNativeBarSnapshotPendingRequestedData({
        barsContext: null,
        barsLength: 250,
        interval: '5',
        symbol: 'BTC',
      }),
    ).toBe(false);
  });

  it('holds the previous native render snapshot while requested bars are still loading', () => {
    expect(
      shouldHoldNativeRenderSnapshotForTransition({
        barsContext: {
          interval: '15',
          requestId: 1,
          source: 'realtime',
          symbol: 'BTC',
        },
        barsLength: 250,
        hasDataViewport: true,
        interval: '5',
        isLoading: true,
        previousBarsLength: 250,
        previousHasDataViewport: true,
        previousProjectionReady: true,
        projectionReady: true,
        symbol: 'BTC',
      }),
    ).toBe(true);
  });

  it('promotes matching requested bars even if viewport sync is still blocked', () => {
    expect(
      shouldHoldNativeRenderSnapshotForTransition({
        barsContext: {
          interval: '5',
          requestId: 2,
          source: 'history',
          symbol: 'BTC',
        },
        barsLength: 250,
        hasDataViewport: true,
        interval: '5',
        isLoading: false,
        previousBarsLength: 250,
        previousHasDataViewport: true,
        previousProjectionReady: true,
        projectionReady: true,
        symbol: 'BTC',
      }),
    ).toBe(false);
  });

  it('does not hold when there is no valid previous native render snapshot', () => {
    expect(
      shouldHoldNativeRenderSnapshotForTransition({
        barsContext: {
          interval: '15',
          requestId: 1,
          source: 'realtime',
          symbol: 'BTC',
        },
        barsLength: 250,
        hasDataViewport: true,
        interval: '5',
        isLoading: true,
        previousBarsLength: 0,
        previousHasDataViewport: false,
        previousProjectionReady: false,
        projectionReady: true,
        symbol: 'BTC',
      }),
    ).toBe(false);
  });

  // A cached first paint is real history for the requested market. Fading it
  // made a chart that had already drawn look like it was still fetching, then
  // flash to full strength when the live response landed.
  it('does not dim cached bars for the requested market while the live response loads', () => {
    expect(
      shouldDimNativeRenderForTransition({
        barsContext: {
          interval: '5',
          requestId: 1,
          source: 'history',
          symbol: 'BTC',
        },
        barsLength: 300,
        interval: '5',
        isLoading: true,
        symbol: 'BTC',
      }),
    ).toBe(false);
  });

  it('still dims while an empty chart is loading', () => {
    expect(
      shouldDimNativeRenderForTransition({
        barsContext: null,
        barsLength: 0,
        interval: '5',
        isLoading: true,
        symbol: 'BTC',
      }),
    ).toBe(true);
  });

  it('removes native render dimming when requested bars arrive', () => {
    expect(
      shouldDimNativeRenderForTransition({
        barsContext: {
          interval: '5',
          requestId: 2,
          source: 'history',
          symbol: 'BTC',
        },
        barsLength: 250,
        interval: '5',
        isLoading: false,
        symbol: 'BTC',
      }),
    ).toBe(false);
  });

  it('keeps native render dimming while displayed bars belong to old data', () => {
    expect(
      shouldDimNativeRenderForTransition({
        barsContext: {
          interval: '15',
          requestId: 1,
          source: 'realtime',
          symbol: 'BTC',
        },
        barsLength: 250,
        interval: '5',
        isLoading: false,
        symbol: 'BTC',
      }),
    ).toBe(true);
  });

  it('uses a static render projection while shared native viewport sync is pending', () => {
    expect(
      shouldUseNativeStaticRenderProjectionForTransition({
        dataLoadRenderBlocked: true,
        holdingSnapshot: false,
      }),
    ).toBe(true);
  });

  it('uses a static render projection while holding the previous render snapshot', () => {
    expect(
      shouldUseNativeStaticRenderProjectionForTransition({
        dataLoadRenderBlocked: false,
        holdingSnapshot: true,
      }),
    ).toBe(true);
  });

  it('uses live shared viewport projection after data and viewport sync settle', () => {
    expect(
      shouldUseNativeStaticRenderProjectionForTransition({
        dataLoadRenderBlocked: false,
        holdingSnapshot: false,
      }),
    ).toBe(false);
  });
});

describe('native render transition during a live gesture', () => {
  const holdInput = {
    barsContext: null,
    barsLength: 500,
    hasDataViewport: true,
    interval: '15',
    isLoading: true,
    previousBarsLength: 500,
    previousHasDataViewport: true,
    previousProjectionReady: true,
    projectionReady: true,
    symbol: 'BTCUSDT',
  };

  it('keeps drawing live while a pan loads more history', () => {
    expect(shouldHoldNativeRenderSnapshotForTransition(holdInput)).toBe(true);
    expect(shouldHoldNativeRenderSnapshotForTransition({ ...holdInput, viewportGestureActive: true })).toBe(false);
  });

  it('still holds when the bars on hand cannot be drawn, gesture or not', () => {
    expect(
      shouldHoldNativeRenderSnapshotForTransition({ ...holdInput, barsLength: 0, viewportGestureActive: true }),
    ).toBe(true);
    expect(
      shouldHoldNativeRenderSnapshotForTransition({ ...holdInput, hasDataViewport: false, viewportGestureActive: true }),
    ).toBe(true);
    expect(
      shouldHoldNativeRenderSnapshotForTransition({ ...holdInput, projectionReady: false, viewportGestureActive: true }),
    ).toBe(true);
  });

  it('keeps the static projection while a data load blocks, unless a gesture owns the canvas', () => {
    expect(shouldUseNativeStaticRenderProjectionForTransition({ dataLoadRenderBlocked: true, holdingSnapshot: false })).toBe(
      true,
    );
    expect(
      shouldUseNativeStaticRenderProjectionForTransition({
        dataLoadRenderBlocked: true,
        holdingSnapshot: false,
        viewportGestureActive: true,
      }),
    ).toBe(false);
    // A held snapshot outranks the gesture: there is nothing live to draw.
    expect(
      shouldUseNativeStaticRenderProjectionForTransition({
        dataLoadRenderBlocked: false,
        holdingSnapshot: true,
        viewportGestureActive: true,
      }),
    ).toBe(true);
  });

  it('still holds for bars that belong to another market', () => {
    expect(
      shouldHoldNativeRenderSnapshotForTransition({
        ...holdInput,
        isLoading: false,
        barsContext: { interval: '15', requestId: 1, source: 'history' as const, symbol: 'ETHUSDT' },
        viewportGestureActive: true,
      }),
    ).toBe(true);
  });
});
