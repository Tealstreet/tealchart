import type { UserDrawingAnchor } from './types';

import { resolveUserDrawingDateRangeMetrics } from './dateRange';
import { resolveUserDrawingPriceRangeMetrics } from './priceRange';

export interface UserDrawingInfoLineMetrics {
  priceDelta: number;
  percent: number | null;
  deltaMs: number;
  label: string;
}

export function resolveUserDrawingInfoLineMetrics(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
): UserDrawingInfoLineMetrics {
  const priceMetrics = resolveUserDrawingPriceRangeMetrics(first.price, second.price);
  const dateMetrics = resolveUserDrawingDateRangeMetrics(first, second);

  return {
    priceDelta: priceMetrics.delta,
    percent: priceMetrics.percent,
    deltaMs: dateMetrics.deltaMs,
    label: `${priceMetrics.label} / ${dateMetrics.label}`,
  };
}
