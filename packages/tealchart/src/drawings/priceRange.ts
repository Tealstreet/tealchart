export interface UserDrawingPriceRangeMetrics {
  delta: number;
  percent: number | null;
  label: string;
}

function formatSignedNumber(value: number): string {
  const normalized = Object.is(value, -0) ? 0 : value;
  const sign = normalized > 0 ? '+' : '';
  return `${sign}${normalized.toFixed(2)}`;
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
