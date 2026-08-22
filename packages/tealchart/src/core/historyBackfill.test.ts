import type { Viewport } from '../types';

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_HISTORY_BACKFILL_BAR_COUNT,
  MAX_HISTORY_BACKFILL_BAR_COUNT,
  mergeLeftHistoryBackfillRequestHints,
  resolveLeftHistoryBackfillContinuationHint,
  resolveLeftHistoryBackfillRequest,
  resolveViewportHistoryBackfillHint,
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

describe('viewport history coverage', () => {
  // The view scale is stored as a bar count, so a chart zoomed out past the
  // initial page comes back showing a range no loaded bar covers. Nothing asked
  // for the rest, because only a gesture ever asked.
  it('asks for the history the restored viewport shows and the bars do not cover', () => {
    expect(
      resolveViewportHistoryBackfillHint({
        earliestBarTime,
        hasMoreHistoricalData: true,
        viewport: viewport(earliestBarTime - 500 * intervalMs),
      }),
    ).toMatchObject({ requiredStartTime: earliestBarTime - 500 * intervalMs });
  });

  it('asks for nothing when the bars already reach the start of the viewport', () => {
    expect(
      resolveViewportHistoryBackfillHint({
        earliestBarTime,
        hasMoreHistoricalData: true,
        viewport: viewport(earliestBarTime),
      }),
    ).toBeNull();
  });

  it('asks for nothing once the feed has said there is no more history', () => {
    expect(
      resolveViewportHistoryBackfillHint({
        earliestBarTime,
        hasMoreHistoricalData: false,
        viewport: viewport(earliestBarTime - 500 * intervalMs),
      }),
    ).toBeNull();
  });

  it('asks for nothing before any bars have arrived', () => {
    expect(
      resolveViewportHistoryBackfillHint({
        earliestBarTime: undefined,
        hasMoreHistoricalData: true,
        viewport: viewport(earliestBarTime - 500 * intervalMs),
      }),
    ).toBeNull();
  });

  // The hint has to survive the paging loop, which compares against
  // `requiredStartTime`, not against the viewport it came from.
  it('carries a required start time the continuation can page towards', () => {
    const hint = resolveViewportHistoryBackfillHint({
      earliestBarTime,
      hasMoreHistoricalData: true,
      viewport: viewport(earliestBarTime - 500 * intervalMs),
    });

    expect(
      resolveLeftHistoryBackfillContinuationHint({
        activeHint: hint ?? undefined,
        currentEarliestBarTime: earliestBarTime - 300 * intervalMs,
        previousEarliestBarTime: earliestBarTime,
      }),
    ).toMatchObject({ requiredStartTime: earliestBarTime - 500 * intervalMs });

    expect(
      resolveLeftHistoryBackfillContinuationHint({
        activeHint: hint ?? undefined,
        currentEarliestBarTime: earliestBarTime - 500 * intervalMs,
        previousEarliestBarTime: earliestBarTime - 300 * intervalMs,
      }),
    ).toBeNull();
  });
});
