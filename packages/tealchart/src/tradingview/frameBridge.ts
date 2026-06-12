import type { IndicatorDrawArgs } from '../jailbreak/types';
import type { Bar } from '../types';
import type {
  TradingViewCoordinateBar,
  TradingViewRawRenderFrame,
  TradingViewRealBar,
  TradingViewRenderFrame,
  TradingViewRenderFrameInput,
} from './types';

type IndicatorDrawArgsWithoutSettings = Omit<IndicatorDrawArgs, 'settings'>;

export function normalizeTradingViewRenderFrame(
  frame: TradingViewRenderFrameInput
): TradingViewRenderFrame | null {
  const rawFrame = frame as TradingViewRawRenderFrame;
  if (!rawFrame.ctx || !rawFrame.priceToCoord || !rawFrame.coordToPrice) {
    return null;
  }

  const bars = normalizeBars(rawFrame.bars ?? rawFrame.realBars);
  const candleCoords = normalizeCandleCoords(rawFrame.candleCoords ?? rawFrame.coordinateBars);
  if (!bars.length || !candleCoords.length) {
    return null;
  }

  return {
    ctx: rawFrame.ctx,
    bars,
    candleCoords,
    exchange: rawFrame.exchange ?? '',
    symbol: rawFrame.symbol ?? '',
    resolutionString: rawFrame.resolutionString ?? '',
    chartWidth: rawFrame.chartWidth ?? rawFrame.coordinates?.mediaSize?.width ?? rawFrame.coordinates?.width ?? 0,
    chartHeight: rawFrame.chartHeight ?? rawFrame.coordinates?.mediaSize?.height ?? rawFrame.coordinates?.height ?? 0,
    priceToCoord: rawFrame.priceToCoord,
    coordToPrice: rawFrame.coordToPrice,
    studySources: rawFrame.studySources ?? [],
    coordinates: rawFrame.coordinates?.mediaSize ?? toDimensions(rawFrame.coordinates),
    raw: rawFrame.raw ?? frame,
  };
}

export function toIndicatorDrawArgs(
  frame: TradingViewRenderFrameInput
): IndicatorDrawArgsWithoutSettings | null {
  const normalized = normalizeTradingViewRenderFrame(frame);
  if (!normalized) return null;

  return {
    ctx: normalized.ctx,
    bars: normalized.bars,
    candleCoords: normalized.candleCoords,
    exchange: normalized.exchange,
    symbol: normalized.symbol,
    resolutionString: normalized.resolutionString,
    chartWidth: normalized.chartWidth,
    chartHeight: normalized.chartHeight,
    priceToCoord: normalized.priceToCoord,
    coordToPrice: normalized.coordToPrice,
  };
}

function normalizeBars(bars: readonly Bar[] | readonly TradingViewRealBar[] | undefined): Bar[] {
  if (!bars) return [];

  return bars.map((bar) => {
    if (isBarObject(bar)) {
      return {
        time: Number(bar.time),
        open: Number(bar.open),
        high: Number(bar.high),
        low: Number(bar.low),
        close: Number(bar.close),
        volume: Number(bar.volume),
      };
    }

    return {
      time: normalizeEpochToMilliseconds(Number(bar[0])),
      open: Number(bar[1]),
      high: Number(bar[2]),
      low: Number(bar[3]),
      close: Number(bar[4]),
      volume: Number(bar[5] ?? 0),
    };
  });
}

function isBarObject(bar: TradingViewRealBar): bar is Bar {
  return !Array.isArray(bar);
}

function normalizeCandleCoords(
  candleCoords: readonly TradingViewCoordinateBar[] | undefined
): TradingViewRenderFrame['candleCoords'] {
  if (!candleCoords) return [];

  return candleCoords.map((bar) => {
    const left = Number(bar.left ?? bar.center);
    const right = Number(bar.right ?? bar.center);
    const width = Math.max(0, right - left);

    return {
      top: Number(bar.top ?? 0),
      bottom: Number(bar.bottom ?? 0),
      center: Number(bar.center),
      left,
      right,
      candleWidth: Number(bar.candleWidth ?? width),
      high: Number(bar.high ?? bar.top ?? 0),
      low: Number(bar.low ?? bar.bottom ?? 0),
      wickWidth: Number(bar.wickWidth ?? 1),
    };
  });
}

function normalizeEpochToMilliseconds(time: number): number {
  if (!Number.isFinite(time)) return time;
  return time < 10_000_000_000 ? time * 1000 : time;
}

function toDimensions(
  coordinates: TradingViewRawRenderFrame['coordinates']
): TradingViewRenderFrame['coordinates'] {
  if (!coordinates?.width || !coordinates.height) return undefined;
  return {
    width: coordinates.width,
    height: coordinates.height,
  };
}
