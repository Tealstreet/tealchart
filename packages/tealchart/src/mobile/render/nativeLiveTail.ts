import type { Skia } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import type { Bar } from '../../types';
import type { NativeVisibleBar } from './nativeVisibleBars';

import { useCallback, useRef } from 'react';

import { useSharedValue } from 'react-native-reanimated';

import { buildLastTradePriceLine } from '../../utils/buildLastTradePriceLine';
import { measureNativeSkiaTextWidth } from './nativeSkiaText';
import { getNativeViewportMaxVolume } from './nativeVisibleBars';

/**
 * The newest bar, written on the JS thread the moment the core emits it. Worklets
 * read it in place of the same bar their closure captured, so a tick that only moves
 * the last bar repaints on the UI thread. `market` names the symbol and interval.
 */
export interface NativeLiveTailBar {
  market: string;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** The last-trade line's moving parts, resolved on JS with the same formatting the line uses. */
export interface NativeLiveLastTrade {
  market: string;
  time: number;
  price: number;
  color: string;
  text: string;
  textWidth: number;
}

export type NativeLiveTailSharedValue = SharedValue<NativeLiveTailBar | null>;
export type NativeLiveLastTradeSharedValue = SharedValue<NativeLiveLastTrade | null>;

/** Bar times repeat across markets and intervals, so a time alone never identifies a tail. */
export function getNativeLiveTailMarket(context: { symbol: string; interval: string } | null | undefined): string {
  return context ? `${context.symbol}\n${context.interval}` : '';
}

export function toNativeLiveTailBar(bar: Bar | null | undefined, market: string): NativeLiveTailBar | null {
  if (!bar || !market) return null;
  return {
    market,
    time: bar.time,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume ?? 0,
  };
}

export function applyNativeLiveTailBar<T extends NativeVisibleBar>(
  bar: T,
  tail: NativeLiveTailBar | null,
  market: string,
): T {
  'worklet';
  if (!tail || !market || tail.market !== market || tail.time !== bar.time) return bar;
  return { ...bar, open: tail.open, high: tail.high, low: tail.low, close: tail.close, volume: tail.volume };
}

/** The tail can only ever be the last loaded bar, so only the last visible slot is checked. */
export function getNativeLiveTailVisibleBar(
  bars: readonly NativeVisibleBar[],
  index: number,
  tail: NativeLiveTailBar | null,
  market: string,
): NativeVisibleBar {
  'worklet';
  const bar = bars[index];
  return index === bars.length - 1 ? applyNativeLiveTailBar(bar, tail, market) : bar;
}

export function getNativeLiveViewportMaxVolume(
  bars: readonly NativeVisibleBar[],
  tail: NativeLiveTailBar | null,
  market: string,
  startTime: number,
  endTime: number,
): number {
  'worklet';
  const maxVolume = getNativeViewportMaxVolume(bars, startTime, endTime);
  const last = bars[bars.length - 1];
  if (!last || !tail || !market || tail.market !== market || tail.time !== last.time) return maxVolume;
  const halfInterval = Math.max(0, last.interval) / 2;
  if (last.time + halfInterval < startTime || last.time - halfInterval > endTime) return maxVolume;
  return Math.max(maxVolume, tail.volume || 0);
}

/**
 * Whether a live last trade may replace what a closure committed: same market, the same
 * bar or a newer one (right for a price, never for a candle), and text the tag can hold.
 */
export function isNativeLiveLastTradeCurrent(
  live: NativeLiveLastTrade | null,
  match: { market: string; time: number; maxTextWidth?: number } | undefined,
): live is NativeLiveLastTrade {
  'worklet';
  if (!live || !match || !match.market || live.market !== match.market || live.time < match.time) return false;
  return match.maxTextWidth === undefined || live.textWidth <= match.maxTextWidth;
}

export function createNativeLiveLastTrade({
  axisFont,
  bar,
  downColor,
  interval,
  market,
  pricePrecision,
  upColor,
}: {
  axisFont: ReturnType<typeof Skia.Font>;
  bar: Bar | null | undefined;
  downColor?: string;
  interval: string;
  market: string;
  pricePrecision: number;
  upColor?: string;
}): NativeLiveLastTrade | null {
  if (!market) return null;
  const line = buildLastTradePriceLine({ latestBar: bar, interval, pricePrecision, upColor, downColor });
  if (!line || !bar) return null;
  const text = line.label?.primaryText ?? '';
  return {
    market,
    time: bar.time,
    price: line.price,
    color: line.color,
    text,
    textWidth: measureNativeSkiaTextWidth(axisFont, text),
  };
}

export interface NativeLiveTailFormat {
  axisFont: ReturnType<typeof Skia.Font>;
  downColor?: string;
  interval: string;
  pricePrecision: number;
  upColor?: string;
}

export interface NativeLiveTailChannel {
  lastTrade: NativeLiveLastTradeSharedValue;
  onLatestBar: (bar: Bar | null, context: { symbol: string; interval: string }) => void;
  setFormat: (format: NativeLiveTailFormat) => void;
  tail: NativeLiveTailSharedValue;
}

/**
 * Owns the live tail. The core reports every emit here before React does, and the
 * chart's formatting inputs arrive from render; either republishes the newest bar.
 */
export function useNativeLiveTailChannel(): NativeLiveTailChannel {
  const tail = useSharedValue<NativeLiveTailBar | null>(null);
  const lastTrade = useSharedValue<NativeLiveLastTrade | null>(null);
  const latestRef = useRef<{ bar: Bar | null; market: string } | null>(null);
  const formatRef = useRef<NativeLiveTailFormat | null>(null);

  const publish = useCallback(() => {
    const latest = latestRef.current;
    const format = formatRef.current;
    tail.value = toNativeLiveTailBar(latest?.bar, latest?.market ?? '');
    lastTrade.value =
      latest && format ? createNativeLiveLastTrade({ ...format, bar: latest.bar, market: latest.market }) : null;
  }, [lastTrade, tail]);

  const onLatestBar = useCallback(
    (bar: Bar | null, context: { symbol: string; interval: string }) => {
      latestRef.current = { bar, market: getNativeLiveTailMarket(context) };
      publish();
    },
    [publish],
  );

  const setFormat = useCallback(
    (format: NativeLiveTailFormat) => {
      formatRef.current = format;
      publish();
    },
    [publish],
  );

  return { lastTrade, onLatestBar, setFormat, tail };
}
