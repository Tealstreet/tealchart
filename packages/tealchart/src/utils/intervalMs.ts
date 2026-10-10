import type { ResolutionInput } from './normalizeResolution';

import { normalizeResolution } from './normalizeResolution';

/** Nominal month length for duration math only (see `intervalToMs`). */
export const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Convert a TradingView-style resolution string to a bar duration in ms.
 */
export function intervalToMs(resolution: ResolutionInput): number {
  const trimmed = normalizeResolution(resolution);
  const upper = trimmed.toUpperCase();

  // Handle day/week resolutions without numeric prefix
  if (upper === '1D' || upper === 'D') return 24 * 60 * 60 * 1000;
  if (upper === '1W' || upper === 'W') return 7 * 24 * 60 * 60 * 1000;

  // Months: TradingView's `M` is UPPERCASE ("1M", "3M", "M"); a lowercase `m`
  // is minutes. Checked on the raw string, BEFORE the case-insensitive unit
  // switch below, which used to read "1M" as one minute — so a monthly chart
  // asked for the last few hundred MINUTES of history and loaded empty. A
  // month is not a fixed length; this nominal 30 days is only for durations
  // (fetch ranges, viewport math, gap timeouts), never for bucketing.
  if (trimmed === 'M') return MONTH_MS;
  const months = trimmed.match(/^(\d+)\s*M$/);
  if (months && Number(months[1]) > 0) return Number(months[1]) * MONTH_MS;

  // Handle pure numeric minute resolutions (e.g., "1", "5", "15", "60", "240")
  const numeric = Number(trimmed);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric * 60 * 1000;
  }

  // Handle suffixed resolutions (e.g., "1h", "4H", "5m", "30S", "1D", "1W")
  const match = trimmed.match(/^(\d+)\s*([smhdwSMHDW])$/);
  if (match) {
    const value = Number(match[1]);
    const unit = match[2].toUpperCase();
    if (value > 0) {
      switch (unit) {
        case 'S':
          return value * 1000;
        case 'M':
          return value * 60 * 1000;
        case 'H':
          return value * 60 * 60 * 1000;
        case 'D':
          return value * 24 * 60 * 60 * 1000;
        case 'W':
          return value * 7 * 24 * 60 * 60 * 1000;
      }
    }
  }

  // Default to 1 hour
  return 60 * 60 * 1000;
}
