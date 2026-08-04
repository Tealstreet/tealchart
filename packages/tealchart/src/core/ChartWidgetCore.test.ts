import type { DatafeedBar, IBasicDataFeed, LibrarySymbolInfo, PeriodParams, ResolutionString } from '../types';

import { describe, expect, it } from 'vitest';

import { ChartWidgetCore } from './ChartWidgetCore';
import { MAX_HISTORY_BACKFILL_BAR_COUNT } from './historyBackfill';

interface PendingHistoryRequest {
  periodParams: PeriodParams;
  resolution: ResolutionString;
  symbol: string;
  onResult: (bars: DatafeedBar[]) => void;
  onError: (reason: string) => void;
}

interface PendingSubscription {
  guid: string;
  resolution: ResolutionString;
  symbol: string;
  onTick: (bar: DatafeedBar) => void;
  onReset: () => void;
}

function makeSymbolInfo(symbol: string): LibrarySymbolInfo {
  return {
    name: symbol,
    full_name: symbol,
    description: symbol,
    type: 'crypto',
    session: '24x7',
    exchange: 'Test',
    pricescale: 100,
    minmov: 1,
    supported_resolutions: ['5', '15'] as ResolutionString[],
  };
}

function makeBars(startTime: number, intervalMs: number, count: number): DatafeedBar[] {
  return Array.from({ length: count }, (_, index) => {
    const price = 100 + index;
    return {
      time: startTime + index * intervalMs,
      open: price,
      high: price + 2,
      low: price - 2,
      close: price + 1,
      volume: 100,
    };
  });
}

function createControlledDatafeed(): {
  datafeed: IBasicDataFeed;
  historyRequests: PendingHistoryRequest[];
  subscriptions: PendingSubscription[];
  unsubscribedGuids: string[];
} {
  const historyRequests: PendingHistoryRequest[] = [];
  const subscriptions: PendingSubscription[] = [];
  const unsubscribedGuids: string[] = [];

  return {
    datafeed: {
      onReady(callback) {
        callback({ supported_resolutions: ['5', '15'] as ResolutionString[] });
      },
      searchSymbols(_userInput, _exchange, _symbolType, onResult) {
        onResult([]);
      },
      resolveSymbol(symbolName, onResolve) {
        onResolve(makeSymbolInfo(symbolName));
      },
      getBars(symbolInfo, resolution, periodParams: PeriodParams, onResult, onError) {
        historyRequests.push({
          periodParams,
          resolution,
          symbol: symbolInfo.name,
          onResult,
          onError,
        });
      },
      subscribeBars(symbolInfo, resolution, onTick, listenerGuid, onResetCacheNeededCallback) {
        subscriptions.push({
          guid: listenerGuid,
          resolution,
          symbol: symbolInfo.name,
          onTick,
          onReset: onResetCacheNeededCallback,
        });
      },
      unsubscribeBars(listenerGuid) {
        unsubscribedGuids.push(listenerGuid);
      },
    },
    historyRequests,
    subscriptions,
    unsubscribedGuids,
  };
}

describe('ChartWidgetCore data identity', () => {
  it('ignores stale history results after an interval change', () => {
    const { datafeed, historyRequests } = createControlledDatafeed();
    const emitted: Array<{ interval: string; firstTime: number; source: string }> = [];
    const core = new ChartWidgetCore({
      datafeed,
      symbol: 'BTC',
      interval: '15',
      onBarsChanged: (bars, context) => {
        emitted.push({
          interval: context.interval,
          firstTime: bars[0]!.time,
          source: context.source,
        });
      },
    });

    core.initialize();
    core.setInterval('5');

    expect(historyRequests.map((request) => request.resolution)).toEqual(['15', '5']);

    historyRequests[1]!.onResult(makeBars(2_000_000, 5 * 60_000, 3));

    expect(emitted).toEqual([{ interval: '5', firstTime: 2_000_000, source: 'history' }]);

    historyRequests[0]!.onResult(makeBars(1_000_000, 15 * 60_000, 3));

    expect(emitted).toEqual([{ interval: '5', firstTime: 2_000_000, source: 'history' }]);
  });

  it('ignores ticks from stale bar subscriptions after an interval change', () => {
    const { datafeed, historyRequests, subscriptions, unsubscribedGuids } = createControlledDatafeed();
    const emitted: Array<{ interval: string; lastTime: number; source: string }> = [];
    const core = new ChartWidgetCore({
      datafeed,
      symbol: 'BTC',
      interval: '15',
      onBarsChanged: (bars, context) => {
        emitted.push({
          interval: context.interval,
          lastTime: bars[bars.length - 1]!.time,
          source: context.source,
        });
      },
    });

    core.initialize();
    historyRequests[0]!.onResult(makeBars(1_000_000, 15 * 60_000, 3));
    core.setInterval('5');
    historyRequests[1]!.onResult(makeBars(2_000_000, 5 * 60_000, 3));

    expect(subscriptions.map((subscription) => subscription.resolution)).toEqual(['15', '5']);
    expect(unsubscribedGuids).toEqual([subscriptions[0]!.guid]);

    const beforeStaleTick = [...emitted];
    subscriptions[0]!.onTick({
      time: 1_000_000 + 3 * 15 * 60_000,
      open: 200,
      high: 201,
      low: 199,
      close: 200,
      volume: 50,
    });

    expect(emitted).toEqual(beforeStaleTick);

    subscriptions[1]!.onTick({
      time: 2_000_000 + 3 * 5 * 60_000,
      open: 300,
      high: 301,
      low: 299,
      close: 300,
      volume: 75,
    });

    expect(emitted.at(-1)).toEqual({
      interval: '5',
      lastTime: 2_000_000 + 3 * 5 * 60_000,
      source: 'realtime',
    });
  });

  it('does not emit or subscribe when disposed before history resolves', () => {
    const { datafeed, historyRequests, subscriptions, unsubscribedGuids } = createControlledDatafeed();
    const emitted: Array<{ interval: string; source: string }> = [];
    const core = new ChartWidgetCore({
      datafeed,
      symbol: 'BTC',
      interval: '15',
      onBarsChanged: (_bars, context) => {
        emitted.push({
          interval: context.interval,
          source: context.source,
        });
      },
    });

    core.initialize();
    expect(historyRequests.map((request) => request.resolution)).toEqual(['15']);

    core.dispose();
    historyRequests[0]!.onResult(makeBars(1_000_000, 15 * 60_000, 3));

    expect(emitted).toEqual([]);
    expect(subscriptions).toEqual([]);
    expect(unsubscribedGuids).toEqual([]);
  });

  it('sizes left history requests from the requested viewport', () => {
    const { datafeed, historyRequests } = createControlledDatafeed();
    const core = new ChartWidgetCore({
      datafeed,
      symbol: 'BTC',
      interval: '5',
    });

    core.initialize();
    historyRequests[0]!.onResult(makeBars(1_000_000, 5 * 60_000, 10));

    core.requestMoreBars('left', {
      viewport: {
        startTime: 1_000_000 - 900 * 5 * 60_000,
        endTime: 1_000_000 + 60 * 5 * 60_000,
        priceMin: 100,
        priceMax: 200,
      },
    });

    expect(historyRequests.at(-1)!.periodParams.countBack).toBe(900);
  });

  it('caps oversized left history requests', () => {
    const { datafeed, historyRequests } = createControlledDatafeed();
    const core = new ChartWidgetCore({
      datafeed,
      symbol: 'BTC',
      interval: '5',
    });

    core.initialize();
    historyRequests[0]!.onResult(makeBars(1_000_000, 5 * 60_000, 10));

    core.requestMoreBars('left', {
      viewport: {
        startTime: 1_000_000 - 10_000 * 5 * 60_000,
        endTime: 1_000_000 + 60 * 5 * 60_000,
        priceMin: 100,
        priceMax: 200,
      },
    });

    expect(historyRequests.at(-1)!.periodParams.countBack).toBe(MAX_HISTORY_BACKFILL_BAR_COUNT);
  });

  it('continues oversized left viewport requests in capped pages until covered', () => {
    const { datafeed, historyRequests } = createControlledDatafeed();
    const intervalMs = 5 * 60_000;
    const earliestTime = 1_000_000;
    const requiredStartTime = earliestTime - (MAX_HISTORY_BACKFILL_BAR_COUNT + 300) * intervalMs;
    const core = new ChartWidgetCore({
      datafeed,
      symbol: 'BTC',
      interval: '5',
    });

    core.initialize();
    historyRequests[0]!.onResult(makeBars(earliestTime, intervalMs, 10));

    core.requestMoreBars('left', {
      viewport: {
        startTime: requiredStartTime,
        endTime: earliestTime + 60 * intervalMs,
        priceMin: 100,
        priceMax: 200,
      },
    });

    expect(historyRequests).toHaveLength(2);
    expect(historyRequests.at(-1)!.periodParams.countBack).toBe(MAX_HISTORY_BACKFILL_BAR_COUNT);

    historyRequests
      .at(-1)!
      .onResult(
        makeBars(
          earliestTime - MAX_HISTORY_BACKFILL_BAR_COUNT * intervalMs,
          intervalMs,
          MAX_HISTORY_BACKFILL_BAR_COUNT,
        ),
      );

    expect(historyRequests).toHaveLength(3);
    expect(historyRequests.at(-1)!.periodParams.countBack).toBe(300);

    historyRequests.at(-1)!.onResult(makeBars(requiredStartTime, intervalMs, 300));

    expect(historyRequests).toHaveLength(3);
  });

  it('stops oversized left viewport continuation when history makes no progress', () => {
    const { datafeed, historyRequests } = createControlledDatafeed();
    const intervalMs = 5 * 60_000;
    const earliestTime = 1_000_000;
    const core = new ChartWidgetCore({
      datafeed,
      symbol: 'BTC',
      interval: '5',
    });

    core.initialize();
    historyRequests[0]!.onResult(makeBars(earliestTime, intervalMs, 10));

    core.requestMoreBars('left', {
      viewport: {
        startTime: earliestTime - (MAX_HISTORY_BACKFILL_BAR_COUNT + 300) * intervalMs,
        endTime: earliestTime + 60 * intervalMs,
        priceMin: 100,
        priceMax: 200,
      },
    });

    expect(historyRequests).toHaveLength(2);

    historyRequests.at(-1)!.onResult(makeBars(earliestTime, intervalMs, 10));

    expect(historyRequests).toHaveLength(2);
  });

  it('coalesces in-flight left history requests into one bounded follow-up', () => {
    const { datafeed, historyRequests } = createControlledDatafeed();
    const intervalMs = 5 * 60_000;
    const earliestTime = 1_000_000;
    const core = new ChartWidgetCore({
      datafeed,
      symbol: 'BTC',
      interval: '5',
    });

    core.initialize();
    historyRequests[0]!.onResult(makeBars(earliestTime, intervalMs, 10));

    core.requestMoreBars('left', {
      viewport: {
        startTime: earliestTime - 900 * intervalMs,
        endTime: earliestTime + 60 * intervalMs,
        priceMin: 100,
        priceMax: 200,
      },
    });
    const activeRequest = historyRequests.at(-1)!;

    core.requestMoreBars('left', {
      viewport: {
        startTime: earliestTime - 500 * intervalMs,
        endTime: earliestTime + 60 * intervalMs,
        priceMin: 100,
        priceMax: 200,
      },
    });
    core.requestMoreBars('left', {
      viewport: {
        startTime: earliestTime - 1_200 * intervalMs,
        endTime: earliestTime + 60 * intervalMs,
        priceMin: 100,
        priceMax: 200,
      },
    });

    expect(historyRequests).toHaveLength(2);

    activeRequest.onResult(makeBars(earliestTime - 900 * intervalMs, intervalMs, 900));

    expect(historyRequests).toHaveLength(3);
    expect(historyRequests.at(-1)!.periodParams.countBack).toBe(300);
  });

  it('clears queued left history requests when the feed has no more data', () => {
    const { datafeed, historyRequests } = createControlledDatafeed();
    const intervalMs = 5 * 60_000;
    const earliestTime = 1_000_000;
    const core = new ChartWidgetCore({
      datafeed,
      symbol: 'BTC',
      interval: '5',
    });

    core.initialize();
    historyRequests[0]!.onResult(makeBars(earliestTime, intervalMs, 10));

    core.requestMoreBars('left', {
      viewport: {
        startTime: earliestTime - 900 * intervalMs,
        endTime: earliestTime + 60 * intervalMs,
        priceMin: 100,
        priceMax: 200,
      },
    });
    const activeRequest = historyRequests.at(-1)!;
    core.requestMoreBars('left', {
      viewport: {
        startTime: earliestTime - 1_200 * intervalMs,
        endTime: earliestTime + 60 * intervalMs,
        priceMin: 100,
        priceMax: 200,
      },
    });

    activeRequest.onResult([]);

    expect(historyRequests).toHaveLength(2);
  });
});
