import type { NativeVisibleBar } from './nativeVisibleBars';

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { buildLastTradePriceLine } from '../../utils/buildLastTradePriceLine';
import {
  applyNativeLiveTailBar,
  canPaintNativeLiveTail,
  createNativeLiveLastTrade,
  getNativeLiveTailFittedRange,
  getNativeLiveTailMarket,
  getNativeLiveTailVisibleBar,
  getNativeLiveViewportMaxVolume,
  isNativeLiveLastTradeCurrent,
  routeNativeLatestBar,
  shouldDeferNativeLiveTail,
  toNativeLiveTailBar,
  useNativeLiveTailChannel,
} from './nativeLiveTail';

const market = getNativeLiveTailMarket({ symbol: 'BTCUSDT', interval: '1' });
const bar = (time: number, close: number, volume = 10): NativeVisibleBar => ({
  time,
  interval: 60_000,
  sourceIndex: time / 60_000,
  x: 0,
  open: 100,
  high: 110,
  low: 90,
  close,
  volume,
});
const visible = [bar(60_000, 105), bar(120_000, 101)];

describe('nativeLiveTail', () => {
  it('keys a tail by market and interval, never by time alone', () => {
    expect(getNativeLiveTailMarket({ symbol: 'BTCUSDT', interval: '1' })).not.toBe(
      getNativeLiveTailMarket({ symbol: 'BTCUSDT', interval: '5' }),
    );
    expect(toNativeLiveTailBar(visible[1], '')).toBeNull();
  });

  it('replaces only the same bar of the same market', () => {
    const tail = toNativeLiveTailBar({ ...visible[1], close: 109, volume: 40 }, market);

    expect(applyNativeLiveTailBar(visible[1], tail, market)).toMatchObject({ close: 109, volume: 40, sourceIndex: 2 });
    expect(applyNativeLiveTailBar(visible[1], tail, 'ETHUSDT\n1')).toBe(visible[1]);
    expect(applyNativeLiveTailBar(visible[0], tail, market)).toBe(visible[0]);
  });

  it('only ever substitutes the last visible slot', () => {
    const tail = toNativeLiveTailBar({ ...visible[0], close: 50 }, market);

    expect(getNativeLiveTailVisibleBar(visible, 0, tail, market)).toBe(visible[0]);
    expect(
      getNativeLiveTailVisibleBar(visible, 1, toNativeLiveTailBar({ ...visible[1], close: 99 }, market), market),
    ).toMatchObject({ close: 99 });
  });

  it('scales volume to a live tail that outgrows the window', () => {
    const tail = toNativeLiveTailBar({ ...visible[1], volume: 500 }, market);

    expect(getNativeLiveViewportMaxVolume(visible, null, market, 0, 200_000)).toBe(10);
    expect(getNativeLiveViewportMaxVolume(visible, tail, market, 0, 200_000)).toBe(500);
    expect(getNativeLiveViewportMaxVolume(visible, tail, 'ETHUSDT\n1', 0, 200_000)).toBe(10);
  });

  it('accepts a live last trade for the same market at the same bar or a newer one', () => {
    const live = { market, time: 120_000, price: 1, color: '#0f0', text: '1', textWidth: 4 };
    const match = { market, time: 120_000, maxTextWidth: 4 };

    expect(isNativeLiveLastTradeCurrent(live, match)).toBe(true);
    expect(isNativeLiveLastTradeCurrent({ ...live, time: 180_000 }, match)).toBe(true);
    expect(isNativeLiveLastTradeCurrent({ ...live, time: 60_000 }, match)).toBe(false);
    expect(isNativeLiveLastTradeCurrent(live, { ...match, market: 'ETHUSDT\n1' })).toBe(false);
    expect(isNativeLiveLastTradeCurrent({ ...live, textWidth: 5 }, match)).toBe(false);
    expect(isNativeLiveLastTradeCurrent(null, match)).toBe(false);
    expect(isNativeLiveLastTradeCurrent(live, undefined)).toBe(false);
  });

  it('formats the live last trade exactly as the committed line does', () => {
    const axisFont = { measureText: (text: string) => ({ width: text.length * 6 }) } as never;
    const latest = { time: 120_000, open: 100, high: 110, low: 90, close: 63777.25, volume: 1 };
    const line = buildLastTradePriceLine({ latestBar: latest, interval: '1', pricePrecision: 0.1, upColor: '#0f0' });
    const live = createNativeLiveLastTrade({
      axisFont,
      bar: latest,
      market,
      pricePrecision: 0.1,
      upColor: '#0f0',
    });

    expect(live).toMatchObject({ price: line?.price, color: line?.color, text: line?.label?.primaryText });
    expect(live?.textWidth).toBe((line?.label?.primaryText ?? '').length * 6);
  });
});

describe('canPaintNativeLiveTail', () => {
  const tick = { time: 120_000, open: 100, high: 108, low: 92, close: 104, volume: 5 };
  const lastTrade = { market, time: 120_000, price: 104, color: '#0f0', text: '104.0', textWidth: 20 };
  const commit = {
    drawingLive: true,
    fittedRange: { high: 110, low: 90 } as const,
    markerOnLastBar: false,
    lastTradeMatch: { market, time: 120_000, maxTextWidth: 30 },
    market,
    time: 120_000,
  };
  const paint = (overrides: Partial<Parameters<typeof canPaintNativeLiveTail>[0]>) =>
    canPaintNativeLiveTail({ bar: tick, commit, lastTrade, market, ...overrides });

  it('paints a tick inside the fitted range of the committed bar', () => {
    expect(paint({})).toBe(true);
    expect(paint({ bar: { ...tick, high: 110, low: 90 } })).toBe(true);
  });

  it('paints any tick of a bar the drawn window does not hold', () => {
    expect(paint({ bar: { ...tick, high: 500, low: 1 }, commit: { ...commit, fittedRange: 'offscreen' } })).toBe(true);
  });

  it('fits the committed window, not the overscan around it', () => {
    const bars = [
      { time: 60_000, open: 1, high: 200, low: 1, close: 1, volume: 1 },
      { time: 120_000, open: 100, high: 110, low: 90, close: 104, volume: 1 },
    ];

    expect(getNativeLiveTailFittedRange(bars, { startTime: 100_000, endTime: 130_000 })).toEqual({
      high: 110,
      low: 90,
    });
    expect(getNativeLiveTailFittedRange(bars, { startTime: 0, endTime: 100_000 })).toBe('offscreen');
    expect(getNativeLiveTailFittedRange(bars, null)).toBeNull();
  });

  it('hands to React whatever would move autoscale, the tag, or another bar', () => {
    expect(paint({ bar: { ...tick, high: 110.5 } })).toBe(false);
    expect(paint({ bar: { ...tick, low: 89 } })).toBe(false);
    expect(paint({ bar: { ...tick, time: 180_000 } })).toBe(false);
    expect(paint({ lastTrade: { ...lastTrade, textWidth: 31 } })).toBe(false);
    expect(paint({ lastTrade: null })).toBe(false);
    expect(paint({ lastTrade: null, commit: { ...commit, lastTradeMatch: undefined } })).toBe(true);
    expect(paint({ market: 'ETHUSDT\n1' })).toBe(false);
    expect(paint({ commit: { ...commit, drawingLive: false } })).toBe(false);
    expect(paint({ commit: null })).toBe(false);
    expect(paint({ commit: { ...commit, markerOnLastBar: true } })).toBe(false);
    expect(paint({ commit: { ...commit, fittedRange: null } })).toBe(false);
    expect(paint({ bar: null })).toBe(false);
  });
});

describe('live tail across a bar rollover (AGT-90)', () => {
  const context = { symbol: 'BTCUSDT', interval: '1' };
  const ohlc = (time: number, close: number, high = Math.max(100, close), low = Math.min(100, close)) => ({
    time,
    open: 100,
    high,
    low,
    close,
    volume: 10,
  });
  const toVisible = (bars: ReturnType<typeof ohlc>[]): NativeVisibleBar[] =>
    bars.map((entry, index) => ({ ...entry, interval: 60_000, sourceIndex: index, x: 0 }));
  const commitFor = (bars: ReturnType<typeof ohlc>[]) => ({
    drawingLive: true,
    fittedRange: { high: 1_000, low: 0 } as const,
    markerOnLastBar: false,
    lastTradeMatch: undefined,
    market,
    time: bars[bars.length - 1]?.time,
  });
  /** What the candle worklets draw: each committed bar, the last one through the live tail. */
  const drawn = (committed: NativeVisibleBar[], tail: Parameters<typeof getNativeLiveTailVisibleBar>[2]) =>
    committed.map((_, index) => getNativeLiveTailVisibleBar(committed, index, tail, market));

  it('defers only a new slot of the committed market', () => {
    const commit = { market, time: 120_000 };
    expect(shouldDeferNativeLiveTail({ bar: ohlc(180_000, 1), commit, market })).toBe(true);
    expect(shouldDeferNativeLiveTail({ bar: ohlc(120_000, 1), commit, market })).toBe(false);
    expect(shouldDeferNativeLiveTail({ bar: ohlc(180_000, 1), commit, market: 'ETHUSDT\n1' })).toBe(false);
    expect(shouldDeferNativeLiveTail({ bar: ohlc(180_000, 1), commit: null, market })).toBe(false);
    expect(shouldDeferNativeLiveTail({ bar: null, commit, market })).toBe(false);
  });

  it('keeps the closing candle on its final values until the new bar commits', () => {
    const { result } = renderHook(() => useNativeLiveTailChannel());
    const channel = result.current;

    // React committed the bar early in its life; every later tick was painted live.
    const committedBars = [ohlc(60_000, 105), ohlc(120_000, 101)];
    let committed = toVisible(committedBars);
    let commit = commitFor(committedBars);
    const finalClosing = ohlc(120_000, 118, 120, 99);
    expect(routeNativeLatestBar({ bar: finalClosing, channel, commit, context })).toBe(true);
    expect(drawn(committed, channel.tail.value)[1]).toMatchObject({ close: 118, high: 120 });

    // The first bar of the next slot: React has to render it.
    const opening = ohlc(180_000, 118.5);
    act(() => {
      expect(routeNativeLatestBar({ bar: opening, channel, commit, context })).toBe(false);
    });
    // Until that commit lands, the closing candle must not fall back to what React
    // committed for it long ago.
    expect(drawn(committed, channel.tail.value)[1]).toMatchObject({ close: 118, high: 120 });

    // The commit carries the final closing bar and the new one; its layout effect flushes.
    const nextBars = [ohlc(60_000, 105), finalClosing, opening];
    committed = toVisible(nextBars);
    commit = commitFor(nextBars);
    act(() => channel.flushDeferred(commit));
    const frame = drawn(committed, channel.tail.value);
    expect(frame[1]).toMatchObject({ close: 118, high: 120 });
    expect(frame[2]).toMatchObject({ time: 180_000, close: 118.5 });
    expect(channel.tail.value).toMatchObject({ time: 180_000, close: 118.5 });
  });

  it('holds a deferred bar across a commit that does not carry it yet', () => {
    const { result } = renderHook(() => useNativeLiveTailChannel());
    const channel = result.current;
    const bars = [ohlc(60_000, 105), ohlc(120_000, 101)];
    routeNativeLatestBar({ bar: ohlc(120_000, 110), channel, commit: commitFor(bars), context });
    routeNativeLatestBar({ bar: ohlc(180_000, 111), channel, commit: commitFor(bars), context });
    // An unrelated render commits the same bars: the tail stays on the closing candle.
    channel.flushDeferred(commitFor(bars));
    expect(channel.tail.value).toMatchObject({ time: 120_000, close: 110 });
    // A market switch releases it: the old commit no longer describes the drawn market.
    channel.flushDeferred({ market: 'ETHUSDT\n1', time: 60_000 });
    expect(channel.tail.value).toMatchObject({ time: 180_000, close: 111 });
  });
});
