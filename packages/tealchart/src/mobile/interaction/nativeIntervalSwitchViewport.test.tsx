import type { Bar, Viewport } from '../../types';
import type { NativeViewportRuntimeInput } from './useNativeViewportRuntime';

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useNativeViewportRuntime } from './useNativeViewportRuntime';

vi.mock('react-native-worklets', () => ({
  runOnJS: (callback: (...args: unknown[]) => unknown) => callback,
  runOnUI: (callback: (...args: unknown[]) => unknown) => callback,
}));

vi.mock('../render/nativeProjection', () => ({
  createNativeChartProjection: ({ viewport }: { viewport: Viewport }) => ({
    viewport,
    timePerPixel: 1,
    getPricePerPixel: () => 1,
  }),
}));

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const NOW = Date.UTC(2026, 10, 21, 16, 40);

/** `count` bars ending at NOW, rising from `from` to `to`. */
function makeBars(count: number, intervalMs: number, from: number, to: number): Bar[] {
  return Array.from({ length: count }, (_, index) => {
    const price = from + ((to - from) * index) / (count - 1);
    return {
      time: NOW - (count - 1 - index) * intervalMs,
      open: price,
      high: price + 50,
      low: price - 50,
      close: price,
      volume: 10,
    };
  });
}

function shared<T>(value: T) {
  return { value } as { value: T };
}

interface Props {
  bars: Bar[];
  interval: string;
}

function renderRuntime(initial: Props) {
  const priceAutoScale = { active: shared(true), bars: shared([]) };
  const rendered = renderHook(
    (props: Props) =>
      useNativeViewportRuntime({
        autoScaleEnabled: true,
        bars: props.bars,
        barsMatchRequestedData: props.bars.length > 0,
        frame: { contentWidth: 300, dimensions: { width: 360, height: 400 } },
        interval: props.interval,
        isLoading: false,
        loadedBarsInterval: props.interval,
        onViewportChange: vi.fn(),
        onRequestMoreBars: vi.fn(),
        panActive: shared(false),
        panMetrics: {
          intervalMs: shared(MINUTE),
          contentWidth: shared(300),
          timePerPixel: shared(1),
          pricePerPixel: shared(1),
        },
        panStartViewport: { startTime: shared(0), endTime: shared(1), priceMin: shared(0), priceMax: shared(1) },
        pinchActive: shared(false),
        priceAutoScale,
        priceScaleActive: shared(false),
        sharedViewport: { startTime: shared(0), endTime: shared(1), priceMin: shared(0), priceMax: shared(1) },
        symbol: 'BTC-PERP',
        timeScaleActive: shared(false),
        viewportSyncEpoch: shared(0),
      } as unknown as NativeViewportRuntimeInput),
    { initialProps: initial },
  );
  return { ...rendered, priceAutoScale };
}

function expectLiveEdgeFit(viewport: Viewport, bars: Bar[]) {
  const latest = bars[bars.length - 1]!;
  expect(viewport.startTime).toBeLessThanOrEqual(latest.time);
  expect(viewport.endTime).toBeGreaterThanOrEqual(latest.time);
  const visible = bars.filter((bar) => bar.time >= viewport.startTime && bar.time <= viewport.endTime);
  expect(visible.length).toBeGreaterThan(1);
  const low = Math.min(...visible.map((bar) => bar.low));
  const high = Math.max(...visible.map((bar) => bar.high));
  // The axis is fitted to the candles in view, not carried over from the old interval.
  expect(viewport.priceMin).toBeGreaterThan(low - (high - low));
  expect(viewport.priceMax).toBeLessThan(high + (high - low));
  expect(viewport.priceMin).toBeLessThanOrEqual(low);
  expect(viewport.priceMax).toBeGreaterThanOrEqual(high);
}

// AGT-147: a timeframe switch carried the old scroll position as a BAR COUNT and the
// old price padding, so a 1m view ~670 bars behind live opened 670 hours back on 1h,
// with no candles in the window and an axis fitted to the whole history (negative on HL).
describe('native interval switch lands at the live edge (AGT-147)', () => {
  const oneMinute = makeBars(700, MINUTE, 55_000, 60_100);
  const oneHour = makeBars(720, HOUR, 90_000, 60_100);
  // The stale 1m window from a restored layout: 05:00-06:40Z while the live bar is 16:40Z.
  const staleWindow: Viewport = {
    startTime: oneMinute[0]!.time,
    endTime: oneMinute[100]!.time,
    priceMin: 55_000,
    priceMax: 56_500,
  };

  it('opens the new interval at the live edge with candles in view and a fitted axis', () => {
    const { result, rerender } = renderRuntime({ bars: oneMinute, interval: '1' });
    act(() => {
      result.current.applyNativeViewport(staleWindow);
    });

    act(() => rerender({ bars: [], interval: '60' }));
    act(() => rerender({ bars: oneHour, interval: '60' }));

    expectLiveEdgeFit(result.current.viewport, oneHour);
  });

  it('does not carry a hand-dragged price axis into the new interval', () => {
    const { result, rerender } = renderRuntime({ bars: oneMinute, interval: '1' });
    // A vertical drag that threw the axis to +20,000...-60,000.
    act(() => {
      result.current.applyNativeViewport({ ...staleWindow, priceMin: -60_000, priceMax: 20_000 });
    });

    act(() => rerender({ bars: [], interval: '60' }));
    act(() => rerender({ bars: oneHour, interval: '60' }));

    expect(result.current.viewport.priceMin).toBeGreaterThan(0);
    expectLiveEdgeFit(result.current.viewport, oneHour);
  });

  it('keeps the zoom: the same number of candles stays in view', () => {
    const { result, rerender } = renderRuntime({ bars: oneMinute, interval: '1' });
    act(() => {
      result.current.applyNativeViewport(staleWindow);
    });

    act(() => rerender({ bars: [], interval: '60' }));
    act(() => rerender({ bars: oneHour, interval: '60' }));

    const span = result.current.viewport.endTime - result.current.viewport.startTime;
    expect(span / HOUR).toBeCloseTo((staleWindow.endTime - staleWindow.startTime) / MINUTE, 4);
  });

  it('keeps following new bars after the switch instead of freezing on the restored window', () => {
    const { result, rerender } = renderRuntime({ bars: oneMinute, interval: '1' });
    act(() => {
      result.current.applyNativeViewport(staleWindow);
    });
    act(() => rerender({ bars: [], interval: '60' }));
    act(() => rerender({ bars: oneHour, interval: '60' }));
    const before = result.current.viewport;

    const next = { ...oneHour[oneHour.length - 1]!, time: NOW + HOUR, high: 61_000, low: 60_500, close: 60_900 };
    act(() => rerender({ bars: [...oneHour, next], interval: '60' }));

    expect(result.current.viewport.endTime).toBeCloseTo(before.endTime + HOUR, 3);
    expect(result.current.viewport.priceMax).toBeGreaterThanOrEqual(61_000);
  });
});
