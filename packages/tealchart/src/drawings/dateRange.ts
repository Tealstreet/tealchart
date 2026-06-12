import type { Bar } from '../types';
import type { UserDrawingAnchor } from './types';

export interface UserDrawingDateRangeMetrics {
  deltaMs: number;
  barCount: number | null;
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

export function formatUserDrawingDateRangeBars(barCount: number): string {
  return `${barCount} bar${barCount === 1 ? '' : 's'}`;
}

function resolveUserDrawingDateRangeBarCount(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  bars: readonly Pick<Bar, 'time'>[],
): number {
  const startTime = Math.min(first.time, second.time);
  const endTime = Math.max(first.time, second.time);
  return bars.filter((bar) => bar.time >= startTime && bar.time <= endTime).length;
}

export function resolveUserDrawingDateRangeMetrics(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  bars?: readonly Pick<Bar, 'time'>[],
): UserDrawingDateRangeMetrics {
  const deltaMs = Math.abs(second.time - first.time);
  const durationLabel = formatUserDrawingDateRangeDuration(deltaMs);
  const barCount = bars ? resolveUserDrawingDateRangeBarCount(first, second, bars) : null;
  return {
    deltaMs,
    barCount,
    label: barCount === null ? durationLabel : `${formatUserDrawingDateRangeBars(barCount)}, ${durationLabel}`,
  };
}
