import type { Bar, DatafeedBar, IBasicDataFeed, LibrarySymbolInfo } from '../types';

import React from 'react';

import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { SkiaTealchart } from '../SkiaTealchart';

// AGT-127, end to end through the native host: woo-t's BTCUSDT chart showed
// okx-t's BTCUSD candles while its history loaded, and kept them once the load
// failed with a 403.

const drawn = vi.hoisted(() => ({ frames: [] as Array<{ bars: readonly Bar[]; hasDataViewport: boolean }> }));

vi.mock('./render/NativeChartCanvasLayers', () => ({
  NativeChartCanvasLayers: (props: { bars: readonly Bar[]; hasDataViewport: boolean }) => {
    drawn.frames.push({ bars: props.bars, hasDataViewport: props.hasDataViewport });
    return null;
  },
}));
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

afterEach(() => {
  cleanup();
  drawn.frames.length = 0;
});

const OKX_PRICE = 58_093;
const start = 1_700_000_000_000;

function symbolInfo(name: string): LibrarySymbolInfo {
  return {
    name,
    full_name: name,
    description: name,
    type: 'crypto',
    session: '24x7',
    exchange: 'Fixture',
    pricescale: 10,
    minmov: 1,
    supported_resolutions: ['1'],
  };
}

function okxBars(): DatafeedBar[] {
  return [0, 1, 2].map((index) => ({
    time: start + index * 60_000,
    open: OKX_PRICE,
    high: OKX_PRICE + 5,
    low: OKX_PRICE - 5,
    close: OKX_PRICE,
    volume: 5,
  }));
}

function switchingFeed() {
  const pending: Array<{ onError: (reason: string) => void; onResult: (bars: DatafeedBar[]) => void }> = [];
  const datafeed: IBasicDataFeed = {
    onReady(callback) {
      callback({ supported_resolutions: ['1'] });
    },
    searchSymbols(_query, _exchange, _type, callback) {
      callback([]);
    },
    resolveSymbol(name, callback) {
      callback(symbolInfo(name));
    },
    getBars(info, _interval, _period, onResult, onError) {
      if (info.name === 'BTCUSD') onResult(okxBars());
      else pending.push({ onError, onResult });
    },
    subscribeBars() {},
    unsubscribeBars() {},
  };
  return { datafeed, pending };
}

function chart(datafeed: IBasicDataFeed, symbol: string) {
  return (
    <SkiaTealchart
      chartKey="agt-127"
      symbol={symbol}
      interval="1"
      width={800}
      height={500}
      hideLegend
      showTopBar={false}
      datafeed={datafeed}
    />
  );
}

const lastFrame = () => drawn.frames.at(-1)!;
const drawsOkx = () => lastFrame().hasDataViewport && lastFrame().bars.some((bar) => bar.close === OKX_PRICE);

it('clears the previous symbol at once and shows the failure explicitly', async () => {
  const { datafeed, pending } = switchingFeed();
  const mounted = render(chart(datafeed, 'BTCUSD'));
  await waitFor(() => expect(drawsOkx()).toBe(true));

  mounted.rerender(chart(datafeed, 'BTCUSDT'));
  await waitFor(() => expect(pending).toHaveLength(1));
  expect(drawsOkx()).toBe(false);
  expect(screen.queryByText('Chart data unavailable')).toBeNull();

  act(() => pending[0]!.onError('[woo] GET /v1/kline failed with 403 Forbidden'));

  expect(drawsOkx()).toBe(false);
  expect(screen.getByText('Chart data unavailable')).toBeTruthy();
});

it('draws nothing of the previous symbol through a slow load, then the new market', async () => {
  const { datafeed, pending } = switchingFeed();
  const mounted = render(chart(datafeed, 'BTCUSD'));
  await waitFor(() => expect(drawsOkx()).toBe(true));

  mounted.rerender(chart(datafeed, 'BTC-PERP'));
  await waitFor(() => expect(pending).toHaveLength(1));
  expect(drawsOkx()).toBe(false);

  const hlPrice = 56_280;
  act(() => pending[0]!.onResult(okxBars().map((bar) => ({ ...bar, close: hlPrice }))));

  await waitFor(() =>
    expect(lastFrame().hasDataViewport && lastFrame().bars.some((bar) => bar.close === hlPrice)).toBe(true),
  );
  expect(drawsOkx()).toBe(false);
  expect(screen.queryByText('Chart data unavailable')).toBeNull();
});
