type RuntimeTimeframeUnit = 'tick' | 'second' | 'minute' | 'day' | 'week' | 'month';

export interface RuntimeTimeframeSpec {
  readonly period: string;
  readonly multiplier: number;
  readonly unit: RuntimeTimeframeUnit;
}

interface TimeframeSpecCacheEntry {
  timeframe: string;
  currentPeriod: string;
  spec: RuntimeTimeframeSpec | null;
}

const timeframeSpecCache = new Map<string, Map<string, TimeframeSpecCacheEntry>>();
const timeframeSpecInsertionOrder = new Map<TimeframeSpecCacheEntry, undefined>();
const TIMEFRAME_SPEC_CACHE_LIMIT = 256;

export function parseRuntimeTimeframeSpec(timeframe: string, currentPeriod: string): RuntimeTimeframeSpec | null {
  const cached = timeframeSpecCache.get(timeframe)?.get(currentPeriod);
  if (cached) return cached.spec;

  const parsed = parseUncachedRuntimeTimeframeSpec(timeframe, currentPeriod);
  const spec = parsed === null ? null : Object.freeze(parsed);
  if (timeframeSpecInsertionOrder.size === TIMEFRAME_SPEC_CACHE_LIMIT) {
    const oldest = timeframeSpecInsertionOrder.keys().next().value!;
    const periods = timeframeSpecCache.get(oldest.timeframe)!;
    periods.delete(oldest.currentPeriod);
    if (periods.size === 0) timeframeSpecCache.delete(oldest.timeframe);
    timeframeSpecInsertionOrder.delete(oldest);
  }
  let periods = timeframeSpecCache.get(timeframe);
  if (!periods) {
    periods = new Map();
    timeframeSpecCache.set(timeframe, periods);
  }
  const entry = { timeframe, currentPeriod, spec };
  periods.set(currentPeriod, entry);
  timeframeSpecInsertionOrder.set(entry, undefined);
  return spec;
}

function parseUncachedRuntimeTimeframeSpec(timeframe: string, currentPeriod: string): RuntimeTimeframeSpec | null {
  const normalized = timeframe.trim().toUpperCase();
  if (normalized === '') {
    const normalizedCurrent = currentPeriod.trim().toUpperCase();
    return parseRuntimeTimeframeSpec(normalizedCurrent === '' ? '60' : normalizedCurrent, '60');
  }

  if (/^\d+$/.test(normalized)) {
    const multiplier = Number(normalized);
    return multiplier >= 1 && multiplier <= 1440 ? { period: normalized, multiplier, unit: 'minute' } : null;
  }

  const match = /^(\d+)?([TSDWM])$/.exec(normalized);
  if (!match) return null;

  const multiplier = match[1] === undefined ? 1 : Number(match[1]);
  if (!Number.isInteger(multiplier) || multiplier <= 0) return null;

  switch (match[2]) {
    case 'T':
      if (![1, 10, 100, 1000].includes(multiplier)) return null;
      return { period: normalized, multiplier, unit: 'tick' };
    case 'S':
      if (![1, 5, 10, 15, 30, 45].includes(multiplier)) return null;
      return { period: normalized, multiplier, unit: 'second' };
    case 'D':
      if (multiplier > 365) return null;
      return { period: normalized, multiplier, unit: 'day' };
    case 'W':
      if (multiplier > 52) return null;
      return { period: normalized, multiplier, unit: 'week' };
    case 'M':
      if (multiplier > 12) return null;
      return { period: normalized, multiplier, unit: 'month' };
    default:
      return null;
  }
}
