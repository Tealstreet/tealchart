import type { Bar, Viewport } from '../../types';
import type { NativeViewportRuntimeInput } from './useNativeViewportRuntime';

import { useLayoutEffect } from 'react';

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useNativeViewportRuntime } from './useNativeViewportRuntime';

vi.mock('react-native-worklets', () => ({
  runOnJS: (callback: (...args: unknown[]) => unknown) => callback,
  runOnUI: (callback: (...args: unknown[]) => unknown) => callback,
}));

const INTERVAL_MS = 60_000;

function makeBars(count: number): Bar[] {
  return Array.from({ length: count }, (_, index) => ({
    time: (index + 1) * INTERVAL_MS,
    open: 100 + index,
    high: 102 + index,
    low: 98 + index,
    close: 101 + index,
    volume: 10,
  }));
}

function shared<T>(value: T) {
  return { value } as { value: T };
}

interface CommittedFrame {
  lastBarTime: number | undefined;
  viewport: Viewport;
  projectionEndTime: number | undefined;
  sharedEndTime: number;
}

/**
 * Records what each COMMIT carried, not each render: a render-phase update that
 * re-runs the render before committing is invisible on screen, a commit is not.
 */
function renderRolloverRuntime(bars: Bar[]) {
  const sharedViewport = { startTime: shared(0), endTime: shared(1), priceMin: shared(0), priceMax: shared(1) };
  const commits: CommittedFrame[] = [];
  const frame = { contentWidth: 300, dimensions: { width: 360, height: 400 } };
  const hook = renderHook(
    (props: { bars: Bar[] }) => {
      const runtime = useNativeViewportRuntime({
        autoScaleEnabled: true,
        bars: props.bars,
        barsMatchRequestedData: props.bars.length > 0,
        frame,
        interval: '1',
        isLoading: false,
        loadedBarsInterval: '1',
        onViewportChange: vi.fn(),
        onRequestMoreBars: vi.fn(),
        panActive: shared(false),
        panMetrics: {
          intervalMs: shared(INTERVAL_MS),
          contentWidth: shared(300),
          timePerPixel: shared(1),
          pricePerPixel: shared(1),
        },
        panStartViewport: { startTime: shared(0), endTime: shared(1), priceMin: shared(0), priceMax: shared(1) },
        pinchActive: shared(false),
        priceAutoScale: { active: shared(true), bars: shared([]) },
        priceScaleActive: shared(false),
        sharedViewport,
        symbol: 'BTCUSDT',
        timeScaleActive: shared(false),
        viewportSyncEpoch: shared(0),
      } as unknown as NativeViewportRuntimeInput);
      // Declared after the runtime, so it runs after the runtime's own layout effects.
      useLayoutEffect(() => {
        commits.push({
          lastBarTime: props.bars[props.bars.length - 1]?.time,
          viewport: runtime.viewport,
          projectionEndTime: runtime.projection?.viewport.endTime,
          sharedEndTime: sharedViewport.endTime.value,
        });
      });
      return runtime;
    },
    { initialProps: { bars } },
  );
  return { ...hook, commits, sharedViewport };
}

vi.mock('../render/nativeProjection', () => ({
  createNativeChartProjection: ({ viewport }: { viewport: Viewport }) => ({
    viewport,
    timePerPixel: 1,
    getPricePerPixel: () => 1,
  }),
}));

describe('native bar rollover on an auto-followed view (AGT-90)', () => {
  it('commits the new bar and the followed window together, never the new bar in the old window', () => {
    const bars = makeBars(60);
    const { commits, rerender, result, sharedViewport } = renderRolloverRuntime(bars);
    const before = result.current.viewport;
    const rightOffset = before.endTime - bars[bars.length - 1]!.time;

    const firstRolloverCommit = commits.length;
    act(() => rerender({ bars: makeBars(61) }));

    const rolloverCommits = commits.slice(firstRolloverCommit);
    const newBarTime = 61 * INTERVAL_MS;
    expect(rolloverCommits.length).toBeGreaterThan(0);
    for (const frame of rolloverCommits) {
      expect(frame.lastBarTime).toBeCloseTo(newBarTime, 3);
      // The window keeps its right-edge offset from the newest bar...
      expect(frame.viewport.endTime).toBeCloseTo(newBarTime + rightOffset, 3);
      expect(frame.viewport.endTime - frame.viewport.startTime).toBeCloseTo(before.endTime - before.startTime, 3);
      // ...in the projection the JS layers draw with, and in the shared values the
      // candle worklets read, in that same commit.
      expect(frame.projectionEndTime).toBeCloseTo(newBarTime + rightOffset, 3);
      expect(frame.sharedEndTime).toBeCloseTo(newBarTime + rightOffset, 3);
    }
    expect(sharedViewport.endTime.value).toBeCloseTo(newBarTime + rightOffset, 3);
  });

  it('follows every rollover by exactly one slot', () => {
    const { commits, rerender, result } = renderRolloverRuntime(makeBars(60));
    const start = result.current.viewport;
    for (let count = 61; count <= 64; count += 1) {
      const from = commits.length;
      act(() => rerender({ bars: makeBars(count) }));
      for (const frame of commits.slice(from)) {
        expect(frame.viewport.endTime).toBeCloseTo(start.endTime + (count - 60) * INTERVAL_MS, 3);
      }
    }
  });

  it('leaves a same-slot tick where it is', () => {
    const bars = makeBars(60);
    const { rerender, result } = renderRolloverRuntime(bars);
    const before = result.current.viewport;
    const ticked = [...bars.slice(0, -1), { ...bars[bars.length - 1]!, close: 160.5 }];
    act(() => rerender({ bars: ticked }));
    expect(result.current.viewport.startTime).toBeCloseTo(before.startTime, 3);
    expect(result.current.viewport.endTime).toBeCloseTo(before.endTime, 3);
  });

  it('does not move a hand-placed view at rollover', () => {
    const { rerender, result } = renderRolloverRuntime(makeBars(60));
    const placed = { startTime: 20 * INTERVAL_MS, endTime: 40 * INTERVAL_MS, priceMin: 100, priceMax: 150 };
    act(() => {
      result.current.applyNativeViewport(placed, { autoScaleEnabled: true });
      result.current.cancelNativeViewportInteraction();
    });
    act(() => rerender({ bars: makeBars(61) }));
    expect(result.current.viewport.startTime).toBeCloseTo(placed.startTime, 3);
    expect(result.current.viewport.endTime).toBeCloseTo(placed.endTime, 3);
  });
});
