import type { Bar } from '../types';
import type { UserDrawingAnchor } from './types';

import { resolveUserDrawingDateRangeMetrics } from './dateRange';
import { resolveUserDrawingPriceRangeMetrics } from './priceRange';

export interface UserDrawingInfoLineMetrics {
  priceDelta: number;
  percent: number | null;
  deltaMs: number;
  barCount: number | null;
  label: string;
}

export function resolveUserDrawingInfoLineMetrics(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  bars?: readonly Pick<Bar, 'time'>[],
): UserDrawingInfoLineMetrics {
  const priceMetrics = resolveUserDrawingPriceRangeMetrics(first.price, second.price);
  const dateMetrics = resolveUserDrawingDateRangeMetrics(first, second, bars);

  return {
    priceDelta: priceMetrics.delta,
    percent: priceMetrics.percent,
    deltaMs: dateMetrics.deltaMs,
    barCount: dateMetrics.barCount,
    label: `${priceMetrics.label} / ${dateMetrics.label}`,
  };
}
