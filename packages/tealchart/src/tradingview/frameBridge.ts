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
  const framePriceScale = deriveFramePriceScale(bars, candleCoords);

  return {
    ctx: rawFrame.ctx,
    bars,
    candleCoords,
    exchange: rawFrame.exchange ?? '',
    symbol: rawFrame.symbol ?? '',
    resolutionString: rawFrame.resolutionString ?? '',
    chartWidth: rawFrame.chartWidth ?? rawFrame.coordinates?.mediaSize?.width ?? rawFrame.coordinates?.width ?? 0,
    chartHeight: rawFrame.chartHeight ?? rawFrame.coordinates?.mediaSize?.height ?? rawFrame.coordinates?.height ?? 0,
    priceToCoord: framePriceScale?.priceToCoord ?? rawFrame.priceToCoord,
    coordToPrice: framePriceScale?.coordToPrice ?? rawFrame.coordToPrice,
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

interface PriceScaleModel {
  priceToCoord: (price: number) => number;
  coordToPrice: (coord: number) => number;
  error: number;
}

function deriveFramePriceScale(
  bars: readonly Bar[],
  candleCoords: readonly TradingViewRenderFrame['candleCoords'][number][]
): Pick<PriceScaleModel, 'priceToCoord' | 'coordToPrice'> | null {
  const samples: Array<{ price: number; coord: number }> = [];
  const count = Math.min(bars.length, candleCoords.length);

  for (let index = 0; index < count; index += 1) {
    const bar = bars[index];
    const coord = candleCoords[index];
    if (!bar || !coord) continue;
    addPriceCoordSample(samples, bar.high, coord.high);
    addPriceCoordSample(samples, bar.low, coord.low);
  }

  const linear = fitPriceScaleModel(samples, (price) => price, (value) => value);
  const log = samples.every((sample) => sample.price > 0)
    ? fitPriceScaleModel(samples, Math.log, Math.exp)
    : null;
  const model = log && (!linear || log.error < linear.error) ? log : linear;

  return model
    ? {
        priceToCoord: model.priceToCoord,
        coordToPrice: model.coordToPrice,
      }
    : null;
}

function addPriceCoordSample(
  samples: Array<{ price: number; coord: number }>,
  price: number,
  coord: number
): void {
  if (!Number.isFinite(price) || !Number.isFinite(coord)) return;
  samples.push({ price, coord });
}

function fitPriceScaleModel(
  samples: readonly { price: number; coord: number }[],
  toDomain: (price: number) => number,
  fromDomain: (value: number) => number
): PriceScaleModel | null {
  const points = samples
    .map((sample) => ({ x: toDomain(sample.price), y: sample.coord }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (points.length < 2) return null;

  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;
  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
    sumXX += point.x * point.x;
    sumXY += point.x * point.y;
  }

  const denominator = points.length * sumXX - sumX * sumX;
  if (Math.abs(denominator) < 1e-9) return null;

  const slope = (points.length * sumXY - sumX * sumY) / denominator;
  if (!Number.isFinite(slope) || Math.abs(slope) < 1e-9) return null;

  const intercept = (sumY - slope * sumX) / points.length;
  const error =
    points.reduce((total, point) => total + Math.abs(slope * point.x + intercept - point.y), 0) /
    points.length;

  return {
    error,
    priceToCoord: (price) => slope * toDomain(price) + intercept,
    coordToPrice: (coord) => fromDomain((coord - intercept) / slope),
  };
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
