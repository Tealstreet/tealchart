import { describe, expect, it } from 'vitest';

import {
  isNativeBarSnapshotPendingRequestedData,
  nativeBarsBelongToOtherMarket,
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
        loadFailed: false,
        previousBarsContext: null,
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
        loadFailed: false,
        previousBarsContext: null,
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
        loadFailed: false,
        previousBarsContext: null,
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
        loadFailed: false,
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
        loadFailed: false,
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
        loadFailed: false,
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
        loadFailed: false,
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
    loadFailed: false,
    previousBarsContext: null,
    previousBarsLength: 500,
    previousHasDataViewport: true,
    previousProjectionReady: true,
    projectionReady: true,
    symbol: 'BTCUSDT',
  };

  it('keeps drawing live while a native interaction loads more history', () => {
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

// AGT-127: okx-t's BTCUSD candles stayed on screen under woo-t's BTCUSDT
// label, faded to 0.7, for as long as woo's history took to load, and for good
// once it failed. Another symbol's bars are another market's prices.
describe('native render transition after a market switch', () => {
  const okx = { interval: '1', requestId: 4, source: 'history' as const, symbol: 'BTCUSD' };

  it('never draws bars that belong to another symbol', () => {
    expect(
      nativeBarsBelongToOtherMarket({ barsContext: okx, interval: '1', loadFailed: false, symbol: 'BTCUSDT' }),
    ).toBe(true);
    expect(
      nativeBarsBelongToOtherMarket({ barsContext: okx, interval: '1', loadFailed: false, symbol: 'BTCUSD' }),
    ).toBe(false);
  });

  it('keeps the previous interval of the same market faded until its load fails', () => {
    expect(
      nativeBarsBelongToOtherMarket({ barsContext: okx, interval: '5', loadFailed: false, symbol: 'BTCUSD' }),
    ).toBe(false);
    expect(nativeBarsBelongToOtherMarket({ barsContext: okx, interval: '5', loadFailed: true, symbol: 'BTCUSD' })).toBe(
      true,
    );
  });

  it('does not hold a render snapshot of another symbol while the new one loads', () => {
    expect(
      shouldHoldNativeRenderSnapshotForTransition({
        barsContext: okx,
        barsLength: 300,
        hasDataViewport: true,
        interval: '1',
        isLoading: true,
        loadFailed: false,
        previousBarsContext: okx,
        previousBarsLength: 300,
        previousHasDataViewport: true,
        previousProjectionReady: true,
        projectionReady: true,
        symbol: 'BTC-PERP',
      }),
    ).toBe(false);
  });

  it('does not hold the previous interval once its replacement failed', () => {
    expect(
      shouldHoldNativeRenderSnapshotForTransition({
        barsContext: okx,
        barsLength: 300,
        hasDataViewport: true,
        interval: '5',
        isLoading: false,
        loadFailed: true,
        previousBarsContext: okx,
        previousBarsLength: 300,
        previousHasDataViewport: true,
        previousProjectionReady: true,
        projectionReady: true,
        symbol: 'BTCUSD',
      }),
    ).toBe(false);
  });

  it('stops signalling a pending load once the load has failed', () => {
    expect(
      shouldDimNativeRenderForTransition({
        barsContext: okx,
        barsLength: 300,
        interval: '1',
        isLoading: false,
        loadFailed: true,
        symbol: 'BTCUSDT',
      }),
    ).toBe(false);
  });
});
