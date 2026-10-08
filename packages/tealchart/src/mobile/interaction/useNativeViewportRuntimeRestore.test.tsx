import type { Bar, Viewport } from '../../types';
import type { NativeViewportRuntimeInput } from './useNativeViewportRuntime';

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useNativeViewportRuntime } from './useNativeViewportRuntime';

// The worklets runtime needs a native module; the hook only ever hops back to JS.
vi.mock('react-native-worklets', () => ({
  runOnJS: (callback: (...args: unknown[]) => unknown) => callback,
  runOnUI: (callback: (...args: unknown[]) => unknown) => callback,
}));

function shared<T>(value: T) {
  return { value } as { value: T };
}

function makeBars(): Bar[] {
  return [
    { time: 1_000, open: 71_400, high: 71_800, low: 71_300, close: 71_700, volume: 10 },
    { time: 2_000, open: 71_700, high: 72_100, low: 71_600, close: 72_000, volume: 11 },
  ];
}

const RESTORED_VIEWPORT: Viewport = { startTime: 500, endTime: 2_500, priceMin: 48_000, priceMax: 54_000 };

function renderViewportRuntime(bars: Bar[], symbol = 'BTCUSDT') {
  const onViewportChange = vi.fn();
  const onRequestMoreBars = vi.fn();
  const panActive = shared(false);
  const rendered = renderHook(
    (props: { bars: Bar[]; symbol: string }) =>
      useNativeViewportRuntime({
        autoScaleEnabled: true,
        bars: props.bars,
        barsMatchRequestedData: props.bars.length > 0,
        frame: null,
        interval: '15',
        isLoading: false,
        loadedBarsInterval: '15',
        onViewportChange,
        onRequestMoreBars,
        panActive,
        panMetrics: {
          intervalMs: shared(900_000),
          contentWidth: shared(300),
          timePerPixel: shared(1),
          pricePerPixel: shared(1),
        },
        panStartViewport: {
          startTime: shared(0),
          endTime: shared(1),
          priceMin: shared(0),
          priceMax: shared(1),
        },
        pinchActive: shared(false),
        priceAutoScale: { active: shared(true), bars: shared([]) },
        priceScaleActive: shared(false),
        sharedViewport: {
          startTime: shared(0),
          endTime: shared(1),
          priceMin: shared(0),
          priceMax: shared(1),
        },
        symbol: props.symbol,
        timeScaleActive: shared(false),
        viewportSyncEpoch: shared(0),
      } as unknown as NativeViewportRuntimeInput),
    { initialProps: { bars, symbol } },
  );
  return { ...rendered, onRequestMoreBars, onViewportChange, panActive };
}

describe('native viewport runtime layout restore', () => {
  it('settles the first loaded auto viewport so same-candle ticks do not rebuild the time window', () => {
    const initialBars = makeBars();
    const { result, rerender } = renderViewportRuntime([]);

    rerender({ bars: initialBars, symbol: 'BTCUSDT' });
    const initialViewport = result.current.viewport;

    rerender({
      bars: [initialBars[0]!, { ...initialBars[1]!, high: 84_000, close: 83_000 }],
      symbol: 'BTCUSDT',
    });

    expect(result.current.viewport.startTime).toBe(initialViewport.startTime);
    expect(result.current.viewport.endTime).toBe(initialViewport.endTime);
    expect(result.current.viewport.priceMax).toBeGreaterThan(initialViewport.priceMax);
  });

  it('re-frames a restored price range against the bars it lands on', () => {
    const { result } = renderViewportRuntime(makeBars());

    act(() => {
      result.current.applyNativeViewport(RESTORED_VIEWPORT, { autoScaleEnabled: true, fitPriceToBars: true });
    });

    expect(result.current.viewport.startTime).toBe(RESTORED_VIEWPORT.startTime);
    expect(result.current.viewport.priceMax).toBeGreaterThan(72_000);
    expect(result.current.viewport.priceMin).toBeGreaterThan(60_000);
  });

  it('re-frames once the first bars arrive when the layout restored before them', () => {
    const { result, rerender } = renderViewportRuntime([]);

    act(() => {
      result.current.applyNativeViewport(RESTORED_VIEWPORT, { autoScaleEnabled: true, fitPriceToBars: true });
    });
    // Nothing to measure yet, so the saved range stands for now.
    expect(result.current.viewport.priceMax).toBe(54_000);

    rerender({ bars: makeBars(), symbol: 'BTCUSDT' });

    expect(result.current.viewport.priceMax).toBeGreaterThan(72_000);
    expect(result.current.viewport.startTime).toBe(RESTORED_VIEWPORT.startTime);
  });

  it('leaves the restored range alone when the layout had auto-scale off', () => {
    const { result } = renderViewportRuntime(makeBars());

    act(() => {
      result.current.applyNativeViewport(RESTORED_VIEWPORT, { autoScaleEnabled: false, fitPriceToBars: true });
    });

    expect(result.current.viewport).toEqual(RESTORED_VIEWPORT);
  });
  it('drops a restore still waiting on bars when the market changes under it', () => {
    const { result, rerender } = renderViewportRuntime([]);

    act(() => {
      result.current.applyNativeViewport(RESTORED_VIEWPORT, { autoScaleEnabled: true, fitPriceToBars: true });
    });
    rerender({ bars: [], symbol: 'ETHUSDT' });
    rerender({ bars: makeBars(), symbol: 'ETHUSDT' });

    // The new market frames itself; it must not inherit the old layout's window.
    expect(result.current.viewport.startTime).not.toBe(RESTORED_VIEWPORT.startTime);
  });

  // Dragging back into history the chart has not fetched yet asked the price
  // fit to measure a window with no bars in it. The fit answered with the auto
  // viewport — the DEFAULT window — so the chart threw away where the user had
  // scrolled to and snapped to the latest candles, then snapped back once the
  // backfill landed. That is the reported "chart jumps on backfill".
  describe('a window older than the loaded page', () => {
    const olderThanLoaded: Viewport = { startTime: -50_000, endTime: -40_000, priceMin: 10, priceMax: 20 };

    it('keeps the window the user asked for instead of snapping to the default', () => {
      const { result } = renderViewportRuntime(makeBars());

      act(() => {
        result.current.applyNativeViewport(olderThanLoaded, { autoScaleEnabled: true, fitPriceToBars: true });
      });

      expect(result.current.viewport.startTime).toBe(olderThanLoaded.startTime);
      expect(result.current.viewport.endTime).toBe(olderThanLoaded.endTime);
    });

    it('asks for the bars that window needs', () => {
      const { result, onRequestMoreBars } = renderViewportRuntime(makeBars());

      act(() => {
        result.current.applyNativeViewport(olderThanLoaded, { autoScaleEnabled: true, fitPriceToBars: true });
      });

      // The hint used to be derived from the FITTED viewport, so the fallback
      // to the default window silently suppressed the request that would have
      // filled the gap.
      expect(onRequestMoreBars).toHaveBeenCalledWith(
        'left',
        expect.objectContaining({ requiredStartTime: olderThanLoaded.startTime }),
      );
    });

    it('fits the price once bars covering the window arrive', () => {
      const { result, rerender } = renderViewportRuntime(makeBars());

      act(() => {
        result.current.applyNativeViewport(olderThanLoaded, { autoScaleEnabled: true, fitPriceToBars: true });
      });
      const beforeBackfill = result.current.viewport;

      const backfilled: Bar[] = [
        { time: -50_000, open: 100, high: 180, low: 90, close: 150, volume: 5 },
        { time: -45_000, open: 150, high: 200, low: 140, close: 190, volume: 6 },
        ...makeBars(),
      ];
      rerender({ bars: backfilled, symbol: 'BTCUSDT' });

      // The window still stands, and the price axis has now been measured
      // against the bars that arrived for it.
      expect(result.current.viewport.startTime).toBe(olderThanLoaded.startTime);
      expect(result.current.viewport.priceMax).not.toBe(beforeBackfill.priceMax);
    });
  });

  // The other half of the same branch, and the reason the fallback exists: a
  // window with no bars that no backfill will ever fill — a stale layout
  // pointing past the end of the data — should not strand the user on a
  // permanently empty chart.
  it('still falls back to the default for a window no backfill can fill', () => {
    const { result } = renderViewportRuntime(makeBars());
    const beyondTheData: Viewport = { startTime: 90_000, endTime: 95_000, priceMin: 10, priceMax: 20 };

    act(() => {
      result.current.applyNativeViewport(beyondTheData, { autoScaleEnabled: true, fitPriceToBars: true });
    });

    expect(result.current.viewport.startTime).not.toBe(beyondTheData.startTime);
  });

  // `bars` is a fresh array on every emit, so the deferred-fit effect runs on
  // every realtime tick. Re-applying on a tick that brought no new history
  // re-commits ownership and resets the gesture flags, which cancels a pan in
  // progress — and because `hasMoreHistoricalData` is hard-coded true it would
  // never stop. It must wait for the page to actually grow leftward.
  it('does not re-apply a deferred fit on a tick that brought no older bars', () => {
    const olderThanLoaded: Viewport = { startTime: -50_000, endTime: -40_000, priceMin: 10, priceMax: 20 };
    const { result, rerender, onViewportChange } = renderViewportRuntime(makeBars());

    act(() => {
      result.current.applyNativeViewport(olderThanLoaded, { autoScaleEnabled: true, fitPriceToBars: true });
    });
    const callsAfterApply = onViewportChange.mock.calls.length;

    // A realtime tick: same bars, new array identity, nothing older.
    rerender({ bars: [...makeBars()], symbol: 'BTCUSDT' });
    rerender({ bars: [...makeBars()], symbol: 'BTCUSDT' });

    expect(onViewportChange.mock.calls.length).toBe(callsAfterApply);
    expect(result.current.viewport.startTime).toBe(olderThanLoaded.startTime);
  });

  // The harm the tick-guard exists to prevent: re-applying mid-pan runs
  // `resetNativeViewportGestureActiveFlags`, which cancels the drag under the
  // user's finger. Asserting the call count alone would not catch that.
  it('does not cancel an in-flight pan when a tick brings no older bars', () => {
    const olderThanLoaded: Viewport = { startTime: -50_000, endTime: -40_000, priceMin: 10, priceMax: 20 };
    const { result, rerender, panActive } = renderViewportRuntime(makeBars());

    act(() => {
      result.current.applyNativeViewport(olderThanLoaded, { autoScaleEnabled: true, fitPriceToBars: true });
    });

    panActive.value = true;
    rerender({ bars: [...makeBars()], symbol: 'BTCUSDT' });

    expect(panActive.value).toBe(true);
  });

  // Waiting must be bounded. A window older than the market's first bar is
  // never covered — the core stops backfilling and says nothing — and sitting
  // forever on a layout's stale saved price range with no bars in frame is
  // worse than the auto viewport the old code fell back to immediately.
  it('takes the fallback once the backfill has had its chance', () => {
    vi.useFakeTimers();
    try {
      const olderThanLoaded: Viewport = { startTime: -50_000, endTime: -40_000, priceMin: 10, priceMax: 20 };
      const { result, rerender } = renderViewportRuntime(makeBars());

      act(() => {
        result.current.applyNativeViewport(olderThanLoaded, { autoScaleEnabled: true, fitPriceToBars: true });
      });
      expect(result.current.viewport.startTime).toBe(olderThanLoaded.startTime);

      // No older bars ever arrive; time passes and ticks keep coming.
      vi.advanceTimersByTime(11_000);
      rerender({ bars: [...makeBars()], symbol: 'BTCUSDT' });

      expect(result.current.viewport.startTime).not.toBe(olderThanLoaded.startTime);
    } finally {
      vi.useRealTimers();
    }
  });
});

