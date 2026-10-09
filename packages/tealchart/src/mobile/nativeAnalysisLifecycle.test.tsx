import type { SkiaTealchartHandle } from '../SkiaTealchart';
import type { IBasicDataFeed } from '../types';

import React, { createRef, StrictMode, useLayoutEffect } from 'react';

import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { SkiaTealchart } from '../SkiaTealchart';

vi.mock('react-native-reanimated', async (original) => ({
  ...(await original<typeof import('react-native-reanimated')>()),
  useSharedValue: (value: unknown) => React.useRef({ value }).current,
  useAnimatedReaction: (prepare: () => unknown, react: (next: unknown, previous: null) => void) => {
    const value = prepare();
    React.useEffect(() => react(value, null), [value]);
  },
}));
vi.mock('react-native', async (original) => ({
  ...(await original<typeof import('react-native')>()),
  AppState: { addEventListener: () => ({ remove() {} }) },
}));
vi.mock('@shopify/react-native-skia', async (original) => {
  const runtime = await original<typeof import('@shopify/react-native-skia')>();
  return { ...runtime, useCanvasRef: () => React.useRef(null), RoundedRect: runtime.Rect };
});
vi.mock('./TealscriptWebViewWorkerHost', () => ({
  useTealscriptWebViewWorkerBridge: () => ({ createWorker: undefined, hostElement: null }),
}));

afterEach(cleanup);

const datafeed: IBasicDataFeed = {
  onReady() {},
  searchSymbols() {},
  resolveSymbol() {},
  getBars() {},
  subscribeBars() {},
  unsubscribeBars() {},
};

it.each([false, true])('a live native widget remains undisposed (StrictMode=%s)', (strict) => {
  const ref = createRef<SkiaTealchartHandle>();
  const child = <SkiaTealchart ref={ref} symbol="TEST" interval="1" datafeed={datafeed} />;
  render(strict ? <StrictMode>{child}</StrictMode> : child);
  expect(ref.current).toBeTruthy();
  expect(ref.current!.activeChart().getAnalysisSnapshot()).not.toEqual({ status: 'unavailable', reason: 'disposed' });
  act(() => ref.current!.setAnalysisRequestHandler(vi.fn()));
  expect(screen.getByLabelText('Analyze chart')).toBeTruthy();
});

it('keeps explicit remove terminal when StrictMode replays mount effects', () => {
  const ref = createRef<SkiaTealchartHandle>();
  function RemovedChart() {
    useLayoutEffect(() => ref.current!.remove(), []);
    return <SkiaTealchart ref={ref} symbol="TEST" interval="1" datafeed={datafeed} />;
  }
  render(
    <StrictMode>
      <RemovedChart />
    </StrictMode>,
  );
  expect(ref.current!.activeChart().getAnalysisSnapshot()).toEqual({ status: 'unavailable', reason: 'disposed' });
  act(() => ref.current!.setAnalysisRequestHandler(vi.fn()));
  expect(screen.queryByLabelText('Analyze chart')).toBeNull();
  expect(ref.current!.startAnalysisSelection()).toBe(false);
});

it('admits owner layout effects during StrictMode replay', () => {
  const ref = createRef<SkiaTealchartHandle>();
  const reads: unknown[] = [];
  const handler = vi.fn();
  function OwnerChart() {
    useLayoutEffect(() => {
      reads.push(ref.current!.activeChart().getAnalysisSnapshot());
      ref.current!.setAnalysisRequestHandler(handler);
    }, []);
    return <SkiaTealchart ref={ref} symbol="TEST" interval="1" datafeed={datafeed} />;
  }
  render(
    <StrictMode>
      <OwnerChart />
    </StrictMode>,
  );
  expect(reads).toHaveLength(2);
  expect(reads).not.toContainEqual({ status: 'unavailable', reason: 'disposed' });
  expect(screen.getByLabelText('Analyze chart')).toBeTruthy();
});

it('invalidates analysis revision when the native datafeed replaces its core', async () => {
  const ref = createRef<SkiaTealchartHandle>();
  const start = 1_700_000_000_000;
  function feed(price: number): IBasicDataFeed {
    return {
      onReady(callback) {
        callback({ supported_resolutions: ['1'] });
      },
      searchSymbols(_query, _exchange, _type, callback) {
        callback([]);
      },
      resolveSymbol(name, callback) {
        callback({
          name,
          full_name: name,
          description: name,
          type: 'crypto',
          session: '24x7',
          exchange: 'Fixture',
          pricescale: 100,
          minmov: 1,
          supported_resolutions: ['1'],
        });
      },
      getBars(_symbol, _interval, _period, callback) {
        callback(
          [0, 1, 2].map((index) => ({
            time: start + index * 60_000,
            open: price,
            high: price + 2,
            low: price - 2,
            close: price + 1,
            volume: 5,
          })),
        );
      },
      subscribeBars() {},
      unsubscribeBars() {},
    };
  }
  const request = { range: { from: start, to: start + 120_000 } };
  const mounted = render(
    <SkiaTealchart
      ref={ref}
      chartKey="analysis-replacement"
      symbol="TEST"
      interval="1"
      width={800}
      height={500}
      hideLegend
      showTopBar={false}
      datafeed={feed(100)}
    />,
  );
  await waitFor(() => expect(ref.current!.activeChart().getAnalysisSnapshot(request).status).toBe('ready'));
  const api = ref.current!.activeChart();
  const before = api.getAnalysisSnapshot(request);
  if (before.status !== 'ready') throw new Error('First native owner never became ready');
  expect(before.snapshot.bars[0]!.open).toBe(100);
  mounted.rerender(
    <SkiaTealchart
      ref={ref}
      chartKey="analysis-replacement"
      symbol="TEST"
      interval="1"
      width={800}
      height={500}
      hideLegend
      showTopBar={false}
      datafeed={feed(200)}
    />,
  );
  await waitFor(() => {
    const result = api.getAnalysisSnapshot(request);
    expect(result.status).toBe('ready');
    if (result.status === 'ready') expect(result.snapshot.bars[0]!.open).toBe(200);
  });
  const after = api.getAnalysisSnapshot(request);
  if (after.status !== 'ready') throw new Error('Replacement native owner never became ready');
  expect(ref.current!.activeChart()).toBe(api);
  expect(after.snapshot.contextRevision).toBeGreaterThan(before.snapshot.contextRevision);
});
