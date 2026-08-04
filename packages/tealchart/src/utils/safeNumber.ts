/**
 * Safe number utilities for defensive rendering.
 *
 * Values flowing from adapters, save/load, or external APIs may arrive as
 * strings or undefined. These helpers coerce to number without crashing.
 */

/**
 * Safely call toFixed on a value that should be a number.
 * If the value is not a number, coerces it or falls back to zero.
 */
export function safeToFixed(value: unknown, decimals: number, _warnKey?: string): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toFixed(decimals);
  }
  const num = Number(value);
  if (Number.isFinite(num)) {
    return num.toFixed(decimals);
  }
  return (0).toFixed(decimals);
}

/**
 * Coerce a value to a finite number. Returns fallback if not possible.
 */
export function safeNum(value: unknown, fallback = 0, _warnKey?: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}
