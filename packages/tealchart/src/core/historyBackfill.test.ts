import type { Viewport } from '../types';

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_HISTORY_BACKFILL_BAR_COUNT,
  MAX_HISTORY_BACKFILL_BAR_COUNT,
  mergeLeftHistoryBackfillRequestHints,
  resolveLeftHistoryBackfillContinuationHint,
  resolveLeftHistoryBackfillRequest,
} from './historyBackfill';

const intervalMs = 60_000;
const earliestBarTime = 1_000_000;

function viewport(startTime: number, endTime = earliestBarTime + 60 * intervalMs): Viewport {
  return {
    startTime,
    endTime,
    priceMin: 100,
    priceMax: 200,
  };
}

describe('history backfill request sizing', () => {
  it('keeps legacy fixed-size requests when no viewport hint is provided', () => {
    expect(resolveLeftHistoryBackfillRequest({ earliestBarTime, intervalMs })).toMatchObject({
      countBack: DEFAULT_HISTORY_BACKFILL_BAR_COUNT,
    });
  });

  it('does not request backfill when the requested viewport is already covered', () => {
    expect(
      resolveLeftHistoryBackfillRequest({
        earliestBarTime,
        hint: { viewport: viewport(earliestBarTime + intervalMs) },
        intervalMs,
      }),
    ).toBeNull();
  });

  it('sizes the request to cover a wider requested left edge', () => {
    const request = resolveLeftHistoryBackfillRequest({
      earliestBarTime,
      hint: { viewport: viewport(earliestBarTime - 900 * intervalMs) },
      intervalMs,
    });

    expect(request).toMatchObject({ countBack: 900 });
    expect(request!.from).toBe(request!.to - 900 * 60);
  });

  it('caps pathological zoom-out requests', () => {
    expect(
      resolveLeftHistoryBackfillRequest({
        earliestBarTime,
        hint: { viewport: viewport(earliestBarTime - 10_000 * intervalMs) },
        intervalMs,
      }),
    ).toMatchObject({
      countBack: MAX_HISTORY_BACKFILL_BAR_COUNT,
    });
  });

  it('uses native overscan hints over the visible viewport edge', () => {
    expect(
      resolveLeftHistoryBackfillRequest({
        earliestBarTime,
        hint: {
          requiredStartTime: earliestBarTime - 700 * intervalMs,
          viewport: viewport(earliestBarTime - 100 * intervalMs),
        },
        intervalMs,
      }),
    ).toMatchObject({ countBack: 700 });
  });

  it('coalesces queued left hints to the farthest requested start', () => {
    expect(
      mergeLeftHistoryBackfillRequestHints(
        { viewport: viewport(earliestBarTime - 500 * intervalMs) },
        { viewport: viewport(earliestBarTime - 900 * intervalMs) },
      ),
    ).toMatchObject({
      requiredStartTime: earliestBarTime - 900 * intervalMs,
    });

    expect(
      mergeLeftHistoryBackfillRequestHints(
        { requiredStartTime: earliestBarTime - 900 * intervalMs },
        { viewport: viewport(earliestBarTime - 500 * intervalMs) },
      ),
    ).toMatchObject({
      requiredStartTime: earliestBarTime - 900 * intervalMs,
    });
  });

  it('continues a capped request toward the original finite target after progress', () => {
    const requiredStartTime = earliestBarTime - (MAX_HISTORY_BACKFILL_BAR_COUNT + 300) * intervalMs;
    const currentEarliestBarTime = earliestBarTime - MAX_HISTORY_BACKFILL_BAR_COUNT * intervalMs;

    expect(
      resolveLeftHistoryBackfillContinuationHint({
        activeHint: { requiredStartTime },
        currentEarliestBarTime,
        previousEarliestBarTime: earliestBarTime,
        queuedHint: null,
      }),
    ).toMatchObject({
      requiredStartTime,
    });
  });

  it('does not continue legacy fixed-size requests without a finite target', () => {
    expect(
      resolveLeftHistoryBackfillContinuationHint({
        currentEarliestBarTime: earliestBarTime - DEFAULT_HISTORY_BACKFILL_BAR_COUNT * intervalMs,
        previousEarliestBarTime: earliestBarTime,
        queuedHint: null,
      }),
    ).toBeNull();
  });

  it('stops finite continuation when a response makes no leftward progress', () => {
    expect(
      resolveLeftHistoryBackfillContinuationHint({
        activeHint: { requiredStartTime: earliestBarTime - 900 * intervalMs },
        currentEarliestBarTime: earliestBarTime,
        previousEarliestBarTime: earliestBarTime,
        queuedHint: null,
      }),
    ).toBeNull();
  });

  it('honors one queued target after a no-progress response without inventing an endless loop', () => {
    const queuedStartTime = earliestBarTime - 1_200 * intervalMs;

    expect(
      resolveLeftHistoryBackfillContinuationHint({
        activeHint: { requiredStartTime: earliestBarTime - 900 * intervalMs },
        currentEarliestBarTime: earliestBarTime,
        previousEarliestBarTime: earliestBarTime,
        queuedHint: { requiredStartTime: queuedStartTime },
      }),
    ).toMatchObject({
      requiredStartTime: queuedStartTime,
    });
  });
});
