import type { Viewport } from '../types';

export type HistoryBackfillDirection = 'left' | 'right';

export interface HistoryBackfillRequestHint {
  viewport?: Viewport | null;
  requiredStartTime?: number | null;
  requiredEndTime?: number | null;
}

export interface HistoryBackfillRequest {
  countBack: number;
  from: number;
  to: number;
}

export const DEFAULT_HISTORY_BACKFILL_BAR_COUNT = 300;
export const MAX_HISTORY_BACKFILL_BAR_COUNT = DEFAULT_HISTORY_BACKFILL_BAR_COUNT * 5;

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeBarCount(value: number, fallback: number): number {
  if (!finiteNumber(value)) return fallback;
  return Math.max(1, Math.floor(value));
}

function withRequiredStartTime(
  hint: HistoryBackfillRequestHint | undefined,
  requiredStartTime: number,
): HistoryBackfillRequestHint {
  return hint ? { ...hint, requiredStartTime } : { requiredStartTime };
}

export function resolveHistoryBackfillRequiredStartTime(hint: HistoryBackfillRequestHint | undefined): number | null {
  if (finiteNumber(hint?.requiredStartTime)) return hint.requiredStartTime;
  if (finiteNumber(hint?.viewport?.startTime)) return hint.viewport.startTime;
  return null;
}

export function mergeLeftHistoryBackfillRequestHints(
  current: HistoryBackfillRequestHint | undefined,
  next: HistoryBackfillRequestHint | undefined,
): HistoryBackfillRequestHint | undefined {
  const currentStartTime = resolveHistoryBackfillRequiredStartTime(current);
  const nextStartTime = resolveHistoryBackfillRequiredStartTime(next);

  if (currentStartTime === null) return next ?? current;
  if (nextStartTime === null) return current;
  return nextStartTime < currentStartTime ? { ...next, requiredStartTime: nextStartTime } : current;
}

export function resolveLeftHistoryBackfillContinuationHint({
  activeHint,
  currentEarliestBarTime,
  previousEarliestBarTime,
  queuedHint,
}: {
  activeHint?: HistoryBackfillRequestHint;
  currentEarliestBarTime: number | undefined;
  previousEarliestBarTime: number;
  queuedHint?: HistoryBackfillRequestHint | null;
}): HistoryBackfillRequestHint | undefined | null {
  if (!finiteNumber(currentEarliestBarTime) || !finiteNumber(previousEarliestBarTime)) return null;

  const hasQueuedHint = queuedHint !== null;
  const targetHint = hasQueuedHint ? mergeLeftHistoryBackfillRequestHints(activeHint, queuedHint) : activeHint;
  const requiredStartTime = resolveHistoryBackfillRequiredStartTime(targetHint);

  if (requiredStartTime === null) return hasQueuedHint ? targetHint : null;
  if (currentEarliestBarTime <= requiredStartTime) return null;

  if (currentEarliestBarTime >= previousEarliestBarTime) {
    return hasQueuedHint ? withRequiredStartTime(targetHint, requiredStartTime) : null;
  }

  return withRequiredStartTime(targetHint, requiredStartTime);
}

export function resolveLeftHistoryBackfillRequest({
  defaultCount = DEFAULT_HISTORY_BACKFILL_BAR_COUNT,
  earliestBarTime,
  hint,
  intervalMs,
  maxCount = MAX_HISTORY_BACKFILL_BAR_COUNT,
}: {
  defaultCount?: number;
  earliestBarTime: number;
  hint?: HistoryBackfillRequestHint;
  intervalMs: number;
  maxCount?: number;
}): HistoryBackfillRequest | null {
  if (!finiteNumber(earliestBarTime) || !finiteNumber(intervalMs) || intervalMs <= 0) return null;

  const normalizedDefaultCount = normalizeBarCount(defaultCount, DEFAULT_HISTORY_BACKFILL_BAR_COUNT);
  const normalizedMaxCount = Math.max(normalizedDefaultCount, normalizeBarCount(maxCount, normalizedDefaultCount));
  const requiredStartTime = resolveHistoryBackfillRequiredStartTime(hint);
  let countBack = normalizedDefaultCount;

  if (requiredStartTime !== null) {
    if (requiredStartTime >= earliestBarTime) return null;
    countBack = Math.max(countBack, Math.ceil((earliestBarTime - requiredStartTime) / intervalMs));
  }

  const cappedCountBack = Math.min(normalizedMaxCount, countBack);
  const to = Math.floor(earliestBarTime / 1000) - 1;
  const from = to - Math.ceil((cappedCountBack * intervalMs) / 1000);

  return {
    countBack: cappedCountBack,
    from,
    to,
  };
}
