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
