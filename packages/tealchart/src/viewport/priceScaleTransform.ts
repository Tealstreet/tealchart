import type { Viewport } from '../types';

const DEFAULT_PRICE_SCALE_SENSITIVITY = 0.005;
const DEFAULT_PRICE_SCALE_MIN = 0.05;
const DEFAULT_PRICE_SCALE_MAX = 20;

export interface PriceScaleTransform {
  deltaY: number;
  sensitivity?: number;
  anchorPrice?: number;
  minScale?: number;
  maxScale?: number;
}

function clampPriceScale(value: number, minScale: number, maxScale: number): number {
  'worklet';
  return Math.min(maxScale, Math.max(minScale, value));
}

export function resolvePriceAxisScaleFactor({
  deltaY,
  maxScale = DEFAULT_PRICE_SCALE_MAX,
  minScale = DEFAULT_PRICE_SCALE_MIN,
  sensitivity = DEFAULT_PRICE_SCALE_SENSITIVITY,
}: PriceScaleTransform): number {
  'worklet';
  const scale = Math.exp(-deltaY * sensitivity);
  return clampPriceScale(scale, minScale, maxScale);
}

export function scaleViewportPricesFromAxisDrag(viewport: Viewport, transform: PriceScaleTransform): Viewport {
  'worklet';
  const range = viewport.priceMax - viewport.priceMin;
  const scale = resolvePriceAxisScaleFactor(transform);
  const nextRange = Math.max(Number.EPSILON, range / scale);
  const anchorPrice = transform.anchorPrice ?? (viewport.priceMin + viewport.priceMax) / 2;
  const anchorRatio = range === 0 ? 0.5 : (anchorPrice - viewport.priceMin) / range;

  return {
    ...viewport,
    priceMin: anchorPrice - nextRange * anchorRatio,
    priceMax: anchorPrice + nextRange * (1 - anchorRatio),
  };
}
