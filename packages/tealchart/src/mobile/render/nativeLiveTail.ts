import type { Skia } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import type { Bar } from '../../types';
import type { NativeVisibleBar } from './nativeVisibleBars';

import { useCallback, useRef } from 'react';

import { useSharedValue } from 'react-native-reanimated';

import { buildLastTradePriceLine } from '../../utils/buildLastTradePriceLine';
import { getNativeVisibleBarsBoundingBox } from '../interaction/nativeAutoScale';
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
  market,
  pricePrecision,
  upColor,
}: {
  axisFont: ReturnType<typeof Skia.Font>;
  bar: Bar | null | undefined;
  downColor?: string;
  market: string;
  pricePrecision: number;
  upColor?: string;
}): NativeLiveLastTrade | null {
  if (!market) return null;
  // The interval only feeds the countdown, which the live channel does not carry.
  const line = buildLastTradePriceLine({ latestBar: bar, interval: '1', pricePrecision, upColor, downColor });
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

/**
 * The price range autoscale fitted around a bar: `offscreen` when the drawn window
 * does not hold the bar, so the fit cannot depend on it; null when it is unknown.
 */
export type NativeLiveTailFittedRange = { high: number; low: number } | 'offscreen' | null;

/** What the chart last committed, against which a tick decides whether it can skip React. */
export interface NativeLiveTailCommit {
  /** Live branches are on screen: no snapshot hold, no static projection. */
  drawingLive: boolean;
  fittedRange: NativeLiveTailFittedRange;
  /** An indicator marker rides the committed bar's high or low, which only React moves. */
  markerOnLastBar: boolean;
  lastTradeMatch: { market: string; time: number; maxTextWidth?: number } | undefined;
  market: string;
  time: number | undefined;
}

/**
 * Whether a tick is fully painted by the live channel: same market and bar as the commit,
 * inside the range autoscale already fitted, and with a price the committed tag can hold.
 */
export function canPaintNativeLiveTail({
  bar,
  commit,
  lastTrade,
  market,
}: {
  bar: Bar | null;
  commit: NativeLiveTailCommit | null;
  lastTrade: NativeLiveLastTrade | null;
  market: string;
}): boolean {
  if (!bar || !commit || !commit.drawingLive || commit.markerOnLastBar || !market || market !== commit.market) {
    return false;
  }
  const fittedRange = commit.fittedRange;
  if (commit.time === undefined || bar.time !== commit.time || !fittedRange) return false;
  if (fittedRange !== 'offscreen' && (!(bar.high <= fittedRange.high) || !(bar.low >= fittedRange.low))) return false;
  // No last-trade line on screen means nothing whose text could outgrow its tag.
  return commit.lastTradeMatch === undefined || isNativeLiveLastTradeCurrent(lastTrade, commit.lastTradeMatch);
}

export interface NativeLiveTailFormat {
  axisFont: ReturnType<typeof Skia.Font>;
  downColor?: string;
  pricePrecision: number;
  upColor?: string;
}

export interface NativeLiveTailChannel {
  lastTrade: NativeLiveLastTradeSharedValue;
  /** Publishes the newest bar and returns the last trade it published with it. */
  onLatestBar: (bar: Bar | null, context: { symbol: string; interval: string }) => NativeLiveLastTrade | null;
  setFormat: (format: NativeLiveTailFormat) => void;
  /** JS-side consumers (the legend) hear each published bar without a UI round trip. */
  subscribe: (listener: (bar: NativeLiveTailBar | null) => void) => () => void;
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
  const listenersRef = useRef(new Set<(bar: NativeLiveTailBar | null) => void>());
  const lastPublishedRef = useRef<NativeLiveTailBar | null>(null);

  const publish = useCallback((): NativeLiveLastTrade | null => {
    const latest = latestRef.current;
    const format = formatRef.current;
    const nextLastTrade =
      latest && format ? createNativeLiveLastTrade({ ...format, bar: latest.bar, market: latest.market }) : null;
    const nextTail = toNativeLiveTailBar(latest?.bar, latest?.market ?? '');
    tail.value = nextTail;
    lastTrade.value = nextLastTrade;
    lastPublishedRef.current = nextTail;
    listenersRef.current.forEach((listener) => listener(nextTail));
    return nextLastTrade;
  }, [lastTrade, tail]);

  const onLatestBar = useCallback(
    (bar: Bar | null, context: { symbol: string; interval: string }) => {
      latestRef.current = { bar, market: getNativeLiveTailMarket(context) };
      return publish();
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

  const subscribe = useCallback((listener: (bar: NativeLiveTailBar | null) => void) => {
    const listeners = listenersRef.current;
    listeners.add(listener);
    // A late subscriber starts from the bar on screen, not the one React last committed.
    listener(lastPublishedRef.current);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return { lastTrade, onLatestBar, setFormat, subscribe, tail };
}

/**
 * The fitted range for a committed last bar: `offscreen` when the committed window does
 * not hold it. Computed on JS from the committed bars and viewport, never from shared
 * values, whose JS-thread reads are synchronous round trips to the UI runtime.
 */
export function getNativeLiveTailFittedRange(
  bars: readonly Bar[],
  viewport: { startTime: number; endTime: number } | null | undefined,
): NativeLiveTailFittedRange {
  const last = bars[bars.length - 1];
  if (!last || !viewport) return null;
  if (last.time < viewport.startTime || last.time > viewport.endTime) return 'offscreen';
  const fitted = getNativeVisibleBarsBoundingBox(bars, viewport.startTime, viewport.endTime);
  return fitted ? { high: fitted.highest, low: fitted.lowest } : null;
}
