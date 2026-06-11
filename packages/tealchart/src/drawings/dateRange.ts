import type { UserDrawingAnchor } from './types';

export interface UserDrawingDateRangeMetrics {
  deltaMs: number;
  label: string;
}

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function formatUnit(value: number, singular: string): string {
  const rounded = Number(value.toFixed(1));
  const normalized = Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
  return `${normalized} ${singular}${rounded === 1 ? '' : 's'}`;
}

export function formatUserDrawingDateRangeDuration(deltaMs: number): string {
  const absolute = Math.abs(deltaMs);
  if (absolute >= DAY) return formatUnit(absolute / DAY, 'day');
  if (absolute >= HOUR) return formatUnit(absolute / HOUR, 'hour');
  if (absolute >= MINUTE) return formatUnit(absolute / MINUTE, 'minute');
  if (absolute >= SECOND) return formatUnit(absolute / SECOND, 'second');
  return `${Math.round(absolute)} ms`;
}

export function resolveUserDrawingDateRangeMetrics(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
): UserDrawingDateRangeMetrics {
  const deltaMs = Math.abs(second.time - first.time);
  return {
    deltaMs,
    label: formatUserDrawingDateRangeDuration(deltaMs),
  };
}
