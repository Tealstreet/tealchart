import type { Viewport } from '../../types';

import { describe, expect, it, vi } from 'vitest';

import {
  captureNativeDataLoadViewScale,
  createNativeViewportDataKey,
  NATIVE_EMPTY_RENDER_VIEWPORT,
  resolveNativeHistoryBackfillHint,
  resolveNativeRenderViewport,
  restoreNativeDataLoadViewport,
  shouldRebaseNativeCandidateViewport,
  shouldResetNativeViewScalePricePadding,
  shouldSyncNativeCandidateViewport,
} from './useNativeViewportRuntime';

vi.mock('react-native-reanimated', () => ({
  useAnimatedReaction: vi.fn(),
  useSharedValue: (value: number) => ({ value }),
}));

vi.mock('react-native-worklets', () => ({
  runOnJS: (fn: unknown) => fn,
}));

function makeBars(
  count: number,
  interval: number,
): { time: number; open: number; high: number; low: number; close: number; volume: number }[] {
  return Array.from({ length: count }, (_, index) => {
    const price = 100 + index;
    return {
      time: 1_000_000 + index * interval,
      open: price,
      high: price + 2,
      low: price - 2,
      close: price + 1,
      volume: 100,
    };
  });
}

/** Flat bars, so a market's price level is whatever it is told to be. */
function makeBarsAtPrice(count: number, interval: number, price: number) {
  return Array.from({ length: count }, (_, index) => ({
    time: 1_000_000 + index * interval,
    open: price,
    high: price * 1.01,
    low: price * 0.99,
    close: price,
    volume: 100,
  }));
}

const autoViewport: Viewport = {
  startTime: 10,
  endTime: 20,
  priceMin: 100,
  priceMax: 200,
};

const settledViewport: Viewport = {
  startTime: 30,
  endTime: 40,
  priceMin: 300,
  priceMax: 400,
};

describe('useNativeViewportRuntime helpers', () => {
  it('provides a finite render viewport before bar data arrives', () => {
    expect(resolveNativeRenderViewport({ autoViewport: null, settledViewport: null })).toEqual({
      hasDataViewport: false,
      viewport: NATIVE_EMPTY_RENDER_VIEWPORT,
    });
  });

  it('uses the data-backed auto viewport when available', () => {
    expect(resolveNativeRenderViewport({ autoViewport, settledViewport: null })).toEqual({
      hasDataViewport: true,
      viewport: autoViewport,
    });
  });

  it('keeps the committed viewport ahead of incoming auto viewport updates', () => {
    expect(resolveNativeRenderViewport({ autoViewport, settledViewport })).toEqual({
      hasDataViewport: true,
      viewport: settledViewport,
    });
  });

  it('keeps the candidate viewport for in-range pan commits', () => {
    expect(
      shouldRebaseNativeCandidateViewport(autoViewport, {
        startTime: 8,
        endTime: 18,
        priceMin: 80,
        priceMax: 180,
      }),
    ).toBe(false);
  });

  it('keeps candidate viewport geometry when only the committed price range changes', () => {
    expect(
      shouldRebaseNativeCandidateViewport(autoViewport, {
        startTime: 10,
        endTime: 20,
        priceMin: 80,
        priceMax: 220,
      }),
    ).toBe(false);
  });

  it('keeps candidate viewport geometry for in-overscan time scale commits', () => {
    expect(
      shouldRebaseNativeCandidateViewport(autoViewport, {
        startTime: 10,
        endTime: 25,
        priceMin: 100,
        priceMax: 200,
      }),
    ).toBe(false);
  });

  it('rebases the candidate cache for wider native time scale scrunches outside one-window overscan', () => {
    expect(
      shouldRebaseNativeCandidateViewport(autoViewport, {
        startTime: -20,
        endTime: 60,
        priceMin: 100,
        priceMax: 200,
      }),
    ).toBe(true);
  });

  it('rebases candidate viewport geometry when pan moves beyond time overscan', () => {
    expect(
      shouldRebaseNativeCandidateViewport(autoViewport, {
        startTime: -50,
        endTime: -40,
        priceMin: 100,
        priceMax: 200,
      }),
    ).toBe(true);
  });

  it('requests native history from the candidate overscan window, not only the visible left edge', () => {
    expect(resolveNativeHistoryBackfillHint(autoViewport)).toMatchObject({
      viewport: autoViewport,
      requiredStartTime: 0,
    });
  });

  it('syncs the candidate viewport while auto-owned and idle', () => {
    expect(
      shouldSyncNativeCandidateViewport({
        currentCandidateViewport: null,
        hasDataViewport: true,
        hasManualViewport: false,
        nativeViewportOwned: false,
        viewport: autoViewport,
      }),
    ).toBe(true);
  });

  it('does not reset candidate viewport while a native interaction owns the viewport', () => {
    expect(
      shouldSyncNativeCandidateViewport({
        currentCandidateViewport: autoViewport,
        hasDataViewport: true,
        hasManualViewport: false,
        nativeViewportOwned: true,
        viewport: {
          startTime: 11,
          endTime: 21,
          priceMin: 100,
          priceMax: 200,
        },
      }),
    ).toBe(false);
  });

  it('does not reset candidate viewport after a manual viewport commit', () => {
    expect(
      shouldSyncNativeCandidateViewport({
        currentCandidateViewport: autoViewport,
        hasDataViewport: true,
        hasManualViewport: true,
        nativeViewportOwned: false,
        viewport: settledViewport,
      }),
    ).toBe(false);
  });

  it('skips candidate viewport state churn when the auto viewport is unchanged', () => {
    expect(
      shouldSyncNativeCandidateViewport({
        currentCandidateViewport: autoViewport,
        hasDataViewport: true,
        hasManualViewport: false,
        nativeViewportOwned: false,
        viewport: { ...autoViewport },
      }),
    ).toBe(false);
  });

  it('captures and restores data-load viewport by visible candle count', () => {
    const oneMinuteBars = makeBars(120, 60_000);
    const oneHourBars = makeBars(120, 3_600_000);
    const nextDataKey = createNativeViewportDataKey('BTC-USD', '60');
    const viewport: Viewport = {
      startTime: oneMinuteBars[60].time,
      endTime: oneMinuteBars[90].time,
      priceMin: 140,
      priceMax: 200,
    };
    const pending = captureNativeDataLoadViewScale({
      bars: oneMinuteBars,
      dataKey: nextDataKey,
      hasDataViewport: true,
      interval: '1',
      viewport,
    });

    expect(pending).not.toBeNull();
    const restored = restoreNativeDataLoadViewport({
      bars: oneHourBars,
      dataKey: nextDataKey,
      interval: '60',
      pending,
    });

    expect(restored).not.toBeNull();
    expect((restored!.endTime - restored!.startTime) / 3_600_000).toBeCloseTo(30, 4);
  });

  it('does not restore against the stale source bars still visible during a failed reload', () => {
    const sourceBars = makeBars(120, 60_000);
    const dataKey = createNativeViewportDataKey('ETH-USD', '15');
    const pending = captureNativeDataLoadViewScale({
      bars: sourceBars,
      dataKey,
      hasDataViewport: true,
      interval: '1',
      viewport: {
        startTime: sourceBars[30].time,
        endTime: sourceBars[70].time,
        priceMin: 90,
        priceMax: 180,
      },
    });

    expect(
      restoreNativeDataLoadViewport({
        bars: sourceBars,
        dataKey,
        interval: '15',
        pending,
      }),
    ).toBeNull();
  });

  it('restores as soon as target bars arrive, even while loading remains true', () => {
    const fifteenMinuteBars = makeBars(120, 15 * 60_000);
    const fiveMinuteBars = makeBars(120, 5 * 60_000);
    const nextDataKey = createNativeViewportDataKey('BTC-USD', '5');
    const viewport: Viewport = {
      startTime: fifteenMinuteBars[60].time,
      endTime: fifteenMinuteBars[100].time,
      priceMin: 140,
      priceMax: 220,
    };
    const pending = captureNativeDataLoadViewScale({
      bars: fifteenMinuteBars,
      dataKey: nextDataKey,
      hasDataViewport: true,
      interval: '15',
      viewport,
    });

    const restored = restoreNativeDataLoadViewport({
      bars: fiveMinuteBars,
      dataKey: nextDataKey,
      interval: '5',
      pending,
    });

    expect(restored).not.toBeNull();
    expect((restored!.endTime - restored!.startTime) / (5 * 60_000)).toBeCloseTo(40, 4);
  });

  it('drops the captured price fit on a symbol switch but keeps it across intervals', () => {
    expect(shouldResetNativeViewScalePricePadding({ nextSymbol: 'DOGE-USDC', previousSymbol: 'BTC-USD' })).toBe(true);
    expect(shouldResetNativeViewScalePricePadding({ nextSymbol: 'BTC-USD', previousSymbol: 'BTC-USD' })).toBe(false);
  });

  // Native only auto-scales inside a gesture, so unlike web nothing corrects a
  // restored price range afterwards - it has to be neutralised at capture.
  it('refits a hand-scaled price axis to the new market while keeping the zoom', () => {
    const expensiveBars = makeBarsAtPrice(120, 60_000, 50_000);
    const cheapBars = makeBarsAtPrice(120, 60_000, 3.27);
    const dataKey = createNativeViewportDataKey('CHEAP-USD', '1');
    // A price axis dragged far wider than the candles need.
    const handScaled: Viewport = {
      startTime: expensiveBars[80].time,
      endTime: expensiveBars[119].time,
      priceMin: 0,
      priceMax: 200_000,
    };

    const carried = restoreNativeDataLoadViewport({
      bars: cheapBars,
      dataKey,
      interval: '1',
      pending: captureNativeDataLoadViewScale({
        bars: expensiveBars,
        dataKey,
        hasDataViewport: true,
        interval: '1',
        viewport: handScaled,
      }),
    });
    const refit = restoreNativeDataLoadViewport({
      bars: cheapBars,
      dataKey,
      interval: '1',
      pending: captureNativeDataLoadViewScale({
        bars: expensiveBars,
        dataKey,
        hasDataViewport: true,
        interval: '1',
        resetPricePadding: true,
        viewport: handScaled,
      }),
    });

    expect(carried).not.toBeNull();
    expect(refit).not.toBeNull();

    // How much of the axis the candles actually get. Carrying the padding over
    // rebuilds the same squashed axis on a market that never trades near it.
    const candleFill = (vp: Viewport) => (3.27 * 1.01 - 3.27 * 0.99) / (vp.priceMax - vp.priceMin);
    expect(candleFill(carried!)).toBeLessThan(0.02);
    expect(candleFill(refit!)).toBeGreaterThan(0.5);

    // Same zoom either way - only the price fit differs.
    expect(refit!.endTime - refit!.startTime).toBe(carried!.endTime - carried!.startTime);
  });
});
