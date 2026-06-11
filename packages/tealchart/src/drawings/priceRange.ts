import type { UserDrawingAnchor } from './types';

export interface UserDrawingPriceRangeMetrics {
  delta: number;
  percent: number | null;
  label: string;
}

function formatSignedNumber(value: number): string {
  const normalized = Object.is(value, -0) ? 0 : value;
  const rounded = Number(normalized.toFixed(2));
  const finalValue = Object.is(rounded, -0) ? 0 : rounded;
  const sign = finalValue > 0 ? '+' : '';
  return `${sign}${finalValue.toFixed(2)}`;
}

export function resolveUserDrawingPriceRangeMetrics(
  startPrice: number,
  endPrice: number,
): UserDrawingPriceRangeMetrics {
  const delta = endPrice - startPrice;
  const percent = startPrice === 0 ? null : (delta / startPrice) * 100;
  const deltaLabel = formatSignedNumber(delta);
  const percentLabel = percent === null ? '' : ` (${formatSignedNumber(percent)}%)`;

  return {
    delta,
    percent,
    label: `${deltaLabel}${percentLabel}`,
  };
}

export function resolveUserDrawingVisualPriceRangeMetrics(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
): UserDrawingPriceRangeMetrics {
  const low = Math.min(first.price, second.price);
  const high = Math.max(first.price, second.price);
  return resolveUserDrawingPriceRangeMetrics(low, high);
}
