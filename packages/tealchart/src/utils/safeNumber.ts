/**
 * Safe number utilities for defensive rendering.
 *
 * Values flowing from adapters, save/load, or external APIs may arrive as
 * strings or undefined. These helpers coerce to number and warn instead of crashing.
 */

/**
 * Safely call toFixed on a value that should be a number.
 * If the value is not a number, coerces it and logs a warning (once per callsite).
 */
const warnedKeys = new Set<string>();

export function safeToFixed(value: unknown, decimals: number, warnKey?: string): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toFixed(decimals);
  }
  const num = Number(value);
  if (warnKey && !warnedKeys.has(warnKey)) {
    warnedKeys.add(warnKey);
    console.warn(`[tealchart] safeToFixed: expected number, got ${typeof value} (${String(value)}) at ${warnKey}`);
  }
  if (Number.isFinite(num)) {
    return num.toFixed(decimals);
  }
  return '0';
}

/**
 * Coerce a value to a finite number. Returns fallback if not possible.
 * Logs a warning on first occurrence per key.
 */
export function safeNum(value: unknown, fallback = 0, warnKey?: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const num = Number(value);
  if (warnKey && !warnedKeys.has(warnKey)) {
    warnedKeys.add(warnKey);
    console.warn(`[tealchart] safeNum: expected number, got ${typeof value} (${String(value)}) at ${warnKey}`);
  }
  return Number.isFinite(num) ? num : fallback;
}
