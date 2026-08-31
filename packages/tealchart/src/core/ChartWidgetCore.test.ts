import type { DatafeedBar, IBasicDataFeed, LibrarySymbolInfo, PeriodParams, ResolutionString } from '../types';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChartWidgetCore } from './ChartWidgetCore';
import { MAX_HISTORY_BACKFILL_BAR_COUNT } from './historyBackfill';

afterEach(() => {
  vi.useRealTimers();
});

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

  it('emits both loading edges for an interval change that starts while already loading', () => {
    // Consumers reject updates whose context does not match their own, so every
    // context needs its own true/false pair. Deduping on the boolean alone
    // swallowed the `true` when a switch began mid-load, leaving only a closing
    // `false` — and a consumer that dropped that one edge stayed stuck loading,
    // which froze the native chart for ~20-35s per switch.
    const { datafeed, historyRequests } = createControlledDatafeed();
    const loading: Array<{ loading: boolean; interval: string }> = [];
    const core = new ChartWidgetCore({
      datafeed,
      symbol: 'BTC',
      interval: '15',
      onLoadingChanged: (isLoading, context) => {
        loading.push({ loading: isLoading, interval: context.interval });
      },
    });

    core.initialize();
    expect(loading).toEqual([{ loading: true, interval: '15' }]);

    // Switch while the first load is still in flight.
    core.setInterval('5');
    expect(loading).toEqual([
      { loading: true, interval: '15' },
      { loading: true, interval: '5' },
    ]);

    historyRequests[1]!.onResult(makeBars(2_000_000, 5 * 60_000, 3));
    expect(loading).toEqual([
      { loading: true, interval: '15' },
      { loading: true, interval: '5' },
      { loading: false, interval: '5' },
    ]);
  });

  it('does not re-emit an unchanged loading flag for the same context', () => {
    const { datafeed, historyRequests } = createControlledDatafeed();
    const loading: Array<{ loading: boolean; interval: string }> = [];
    const core = new ChartWidgetCore({
      datafeed,
      symbol: 'BTC',
      interval: '15',
      onLoadingChanged: (isLoading, context) => {
        loading.push({ loading: isLoading, interval: context.interval });
      },
    });

    core.initialize();
    historyRequests[0]!.onResult(makeBars(1_000_000, 15 * 60_000, 3));

    expect(loading).toEqual([
      { loading: true, interval: '15' },
      { loading: false, interval: '15' },
    ]);
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

  it('normalizes historical and realtime current bars to the same open time', () => {
    const { datafeed, historyRequests, subscriptions } = createControlledDatafeed();
    const emitted: Array<{ lastClose: number; lastTime: number; length: number; source: string }> = [];
    const core = new ChartWidgetCore({
      datafeed,
      symbol: 'BTC',
      interval: '5',
      onBarsChanged: (bars, context) => {
        const lastBar = bars[bars.length - 1]!;
        emitted.push({
          lastClose: lastBar.close,
          lastTime: lastBar.time,
          length: bars.length,
          source: context.source,
        });
      },
    });
    const bucketOpen = 1_700_000_100_000;
    const bars = makeBars(bucketOpen - 2 * 5 * 60_000, 5 * 60_000, 3);
    bars[bars.length - 1] = {
      ...bars[bars.length - 1]!,
      time: bucketOpen + 12_345,
      close: 120,
    };

    core.initialize();
    historyRequests[0]!.onResult(bars);
    subscriptions[0]!.onTick({
      ...bars[bars.length - 1]!,
      time: bucketOpen,
      close: 125,
    });

    expect(emitted).toEqual([
      { lastClose: 120, lastTime: bucketOpen, length: 3, source: 'history' },
      { lastClose: 125, lastTime: bucketOpen, length: 3, source: 'realtime' },
    ]);
    expect(core.getBars()).toHaveLength(3);
    expect(core.getBars().at(-1)).toMatchObject({ time: bucketOpen, close: 125 });
  });

  it('coalesces realtime notifications while keeping the latest bar', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);

    const { datafeed, historyRequests, subscriptions } = createControlledDatafeed();
    const emitted: Array<{ lastClose: number; source: string }> = [];
    const updatedBars: number[] = [];
    const scheduleRender = vi.fn();
    const core = new ChartWidgetCore({
      datafeed,
      symbol: 'BTC',
      interval: '5',
      realtimeUpdateThrottleMs: 250,
      scheduleRender,
      indicatorManager: {
        setBars: (bars) => {
          updatedBars.push(bars.at(-1)?.close ?? 0);
        },
        updateBar: (bar) => {
          updatedBars.push(bar.close);
        },
        getPlots: () => [],
      },
      onBarsChanged: (bars, context) => {
        emitted.push({
          lastClose: bars.at(-1)?.close ?? 0,
          source: context.source,
        });
      },
    });
    const bars = makeBars(1_700_000_000_000, 5 * 60_000, 3);

    core.initialize();
    historyRequests[0]!.onResult(bars);
    expect(emitted).toEqual([{ lastClose: 103, source: 'history' }]);

    subscriptions[0]!.onTick({ ...bars.at(-1)!, close: 125 });
    expect(emitted).toEqual([
      { lastClose: 103, source: 'history' },
      { lastClose: 125, source: 'realtime' },
    ]);

    vi.setSystemTime(1_100);
    subscriptions[0]!.onTick({ ...bars.at(-1)!, close: 126 });
    vi.setSystemTime(1_150);
    subscriptions[0]!.onTick({ ...bars.at(-1)!, close: 127 });

    expect(core.getBars().at(-1)).toMatchObject({ close: 127 });
    expect(emitted).toEqual([
      { lastClose: 103, source: 'history' },
      { lastClose: 125, source: 'realtime' },
    ]);

    vi.advanceTimersByTime(150);

    expect(emitted).toEqual([
      { lastClose: 103, source: 'history' },
      { lastClose: 125, source: 'realtime' },
      { lastClose: 127, source: 'realtime' },
    ]);
    expect(updatedBars).toEqual([103, 125, 127]);
    expect(scheduleRender).toHaveBeenCalledTimes(3);
  });

  it('flushes a pending realtime candle before queuing a newer candle', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);

    const { datafeed, historyRequests, subscriptions } = createControlledDatafeed();
    const emitted: Array<{ lastClose: number; lastTime: number; source: string }> = [];
    const updatedBars: Array<{ close: number; time: number }> = [];
    const scheduleRender = vi.fn();
    const core = new ChartWidgetCore({
      datafeed,
      symbol: 'BTC',
      interval: '5',
      realtimeUpdateThrottleMs: 250,
      scheduleRender,
      indicatorManager: {
        setBars: (bars) => {
          const lastBar = bars.at(-1);
          if (lastBar) updatedBars.push({ close: lastBar.close, time: lastBar.time });
        },
        updateBar: (bar) => {
          updatedBars.push({ close: bar.close, time: bar.time });
        },
        getPlots: () => [],
      },
      onBarsChanged: (bars, context) => {
        const lastBar = bars.at(-1);
        if (!lastBar) return;
        emitted.push({
          lastClose: lastBar.close,
          lastTime: lastBar.time,
          source: context.source,
        });
      },
    });
    const bars = makeBars(1_700_000_000_000, 5 * 60_000, 3);

    core.initialize();
    historyRequests[0]!.onResult(bars);
    const sameCandleTime = core.getBars().at(-1)!.time;
    const nextCandleTime = sameCandleTime + 5 * 60_000;
    subscriptions[0]!.onTick({ ...bars.at(-1)!, close: 125 });

    vi.setSystemTime(1_100);
    subscriptions[0]!.onTick({ ...bars.at(-1)!, close: 126 });
    vi.setSystemTime(1_150);
    subscriptions[0]!.onTick({
      ...bars.at(-1)!,
      close: 130,
      high: 130,
      low: 130,
      open: 130,
      time: nextCandleTime,
    });

    expect(emitted).toEqual([
      { lastClose: 103, lastTime: sameCandleTime, source: 'history' },
      { lastClose: 125, lastTime: sameCandleTime, source: 'realtime' },
      { lastClose: 126, lastTime: sameCandleTime, source: 'realtime' },
    ]);
    expect(updatedBars).toEqual([
      { close: 103, time: sameCandleTime },
      { close: 125, time: sameCandleTime },
      { close: 126, time: sameCandleTime },
    ]);
    expect(core.getBars().at(-1)).toMatchObject({ close: 130, time: nextCandleTime });

    vi.advanceTimersByTime(250);

    expect(emitted).toEqual([
      { lastClose: 103, lastTime: sameCandleTime, source: 'history' },
      { lastClose: 125, lastTime: sameCandleTime, source: 'realtime' },
      { lastClose: 126, lastTime: sameCandleTime, source: 'realtime' },
      { lastClose: 130, lastTime: nextCandleTime, source: 'realtime' },
    ]);
    expect(updatedBars).toEqual([
      { close: 103, time: sameCandleTime },
      { close: 125, time: sameCandleTime },
      { close: 126, time: sameCandleTime },
      { close: 130, time: nextCandleTime },
    ]);
    expect(scheduleRender).toHaveBeenCalledTimes(4);
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

// A datafeed's onReady is typically a deferred callback returning a static
// config, and nothing in the resolve or load path reads that config. Waiting
// for it cost 0.7-1.1s on a mobile warm start, where the main thread is
// saturated at exactly the moment the chart mounts.
describe('ChartWidgetCore first load', () => {
  function createDeferredReadyDatafeed() {
    const controlled = createControlledDatafeed();
    let readyCallback: ((config: { supported_resolutions?: ResolutionString[] }) => void) | null = null;

    return {
      ...controlled,
      datafeed: {
        ...controlled.datafeed,
        onReady(callback: (config: { supported_resolutions?: ResolutionString[] }) => void) {
          readyCallback = callback;
        },
      } as IBasicDataFeed,
      fireReady: (resolutions: ResolutionString[]) => readyCallback?.({ supported_resolutions: resolutions }),
    };
  }

  it('requests bars without waiting for the datafeed to report ready', () => {
    const { datafeed, historyRequests } = createDeferredReadyDatafeed();
    const core = new ChartWidgetCore({ datafeed, symbol: 'BTC', interval: '5' });

    core.initialize();

    expect(historyRequests).toHaveLength(1);
    expect(historyRequests[0]!.symbol).toBe('BTC');
  });

  it('still records supported resolutions when ready lands after the bars', () => {
    const { datafeed, fireReady, historyRequests } = createDeferredReadyDatafeed();
    const core = new ChartWidgetCore({ datafeed, symbol: 'BTC', interval: '5' });

    core.initialize();
    historyRequests[0]!.onResult(makeBars(1_000_000, 5 * 60_000, 10));
    fireReady(['1', '5'] as ResolutionString[]);

    expect(core.getSupportedResolutions()).toEqual(['1', '5']);
  });

  // Resolving immediately makes this overlap likely: a host can call setSymbol
  // in the same tick as initialize(), and the init resolve can land last.
  it('discards an initial resolve that a later symbol change superseded', () => {
    const controlled = createControlledDatafeed();
    const pendingResolves: Array<{ symbol: string; onResolve: (info: LibrarySymbolInfo) => void }> = [];
    const datafeed = {
      ...controlled.datafeed,
      resolveSymbol(symbolName: string, onResolve: (info: LibrarySymbolInfo) => void) {
        pendingResolves.push({ symbol: symbolName, onResolve });
      },
    } as IBasicDataFeed;
    const core = new ChartWidgetCore({ datafeed, symbol: 'BTC', interval: '5' });

    core.initialize();
    core.setSymbol('ETH');
    pendingResolves[1]!.onResolve(makeSymbolInfo('ETH'));
    pendingResolves[0]!.onResolve(makeSymbolInfo('BTC'));

    expect(controlled.historyRequests).toHaveLength(1);
    expect(controlled.historyRequests[0]!.symbol).toBe('ETH');
  });
});

describe('ChartWidgetCore interval changes during a pending resolve', () => {
  it('does not fetch the previous market under the new symbol', () => {
    const controlled = createControlledDatafeed();
    const pendingResolves: Array<{ symbol: string; onResolve: (info: LibrarySymbolInfo) => void }> = [];
    const datafeed = {
      ...controlled.datafeed,
      resolveSymbol(symbolName: string, onResolve: (info: LibrarySymbolInfo) => void) {
        pendingResolves.push({ symbol: symbolName, onResolve });
      },
    } as IBasicDataFeed;
    const core = new ChartWidgetCore({ datafeed, symbol: 'BTC', interval: '5' });

    core.initialize();
    pendingResolves[0]!.onResolve(makeSymbolInfo('BTC'));
    core.setSymbol('ETH');
    core.setInterval('15');

    expect(controlled.historyRequests.map((request) => request.symbol)).toEqual(['BTC']);

    pendingResolves[1]!.onResolve(makeSymbolInfo('ETH'));

    expect(controlled.historyRequests.map((request) => request.symbol)).toEqual(['BTC', 'ETH']);
  });
});

// resolveSymbol blocks on the exchange's market list, which candles do not
// need — so a datafeed that already holds history paints it straight away.
describe('ChartWidgetCore cached first paint', () => {
  function createCachingDatafeed(cachedBars: DatafeedBar[]) {
    const controlled = createControlledDatafeed();
    const pendingResolves: Array<{ symbol: string; onResolve: (info: LibrarySymbolInfo) => void }> = [];

    return {
      ...controlled,
      pendingResolves,
      datafeed: {
        ...controlled.datafeed,
        getCachedBars: () => cachedBars,
        resolveSymbol(symbolName: string, onResolve: (info: LibrarySymbolInfo) => void) {
          pendingResolves.push({ symbol: symbolName, onResolve });
        },
      } as IBasicDataFeed,
    };
  }

  const intervalMs = 5 * 60_000;
  const cached = makeBars(1_000_000, intervalMs, 10);

  // The cache is keyed on symbol and resolution; asking with the wrong ones
  // returns another market's history, or nothing at all.
  it('asks the datafeed for the market and window it is about to request', () => {
    const controlled = createControlledDatafeed();
    const asked: Array<{ symbol: string; resolution: string; countBack: PeriodParams['countBack']; from: number; to: number }> = [];
    const datafeed = {
      ...controlled.datafeed,
      getCachedBars: (symbol: string, resolution: ResolutionString, periodParams: PeriodParams) => {
        asked.push({
          symbol,
          resolution,
          countBack: periodParams.countBack,
          from: periodParams.from,
          to: periodParams.to,
        });
        return [];
      },
    } as IBasicDataFeed;
    const core = new ChartWidgetCore({ datafeed, symbol: 'BTC', interval: '5' });

    core.initialize();

    expect(asked).toHaveLength(1);
    expect(asked[0]!.symbol).toBe('BTC');
    expect(asked[0]!.resolution).toBe('5');
    expect(asked[0]!.countBack).toBe(controlled.historyRequests[0]!.periodParams.countBack);
    expect(asked[0]!.to - asked[0]!.from).toBe(
      controlled.historyRequests[0]!.periodParams.to - controlled.historyRequests[0]!.periodParams.from,
    );
  });

  it('paints cached bars before the symbol has resolved', () => {
    const emitted: number[] = [];
    const { datafeed } = createCachingDatafeed(cached);
    const core = new ChartWidgetCore({
      datafeed,
      symbol: 'BTC',
      interval: '5',
      onBarsChanged: (bars) => emitted.push(bars.length),
    });

    core.initialize();

    expect(emitted).toEqual([10]);
    expect(core.getBars()).toHaveLength(10);
  });

  // The cached set is one request behind, so the chart must keep showing its
  // loading treatment until the live response lands.
  it('stays loading through the cached paint', () => {
    const loadingStates: boolean[] = [];
    const { datafeed } = createCachingDatafeed(cached);
    const core = new ChartWidgetCore({
      datafeed,
      symbol: 'BTC',
      interval: '5',
      onLoadingChanged: (loading) => loadingStates.push(loading),
    });

    core.initialize();

    expect(loadingStates).not.toContain(false);
  });

  it('replaces the cached bars with the live response', () => {
    const { datafeed, historyRequests, pendingResolves } = createCachingDatafeed(cached);
    const core = new ChartWidgetCore({ datafeed, symbol: 'BTC', interval: '5' });

    core.initialize();
    pendingResolves[0]!.onResolve(makeSymbolInfo('BTC'));
    historyRequests[0]!.onResult(makeBars(1_000_000, intervalMs, 300));

    expect(core.getBars()).toHaveLength(300);
  });

  it('does nothing when the datafeed holds no cached bars', () => {
    const emitted: number[] = [];
    const { datafeed } = createCachingDatafeed([]);
    const core = new ChartWidgetCore({
      datafeed,
      symbol: 'BTC',
      interval: '5',
      onBarsChanged: (bars) => emitted.push(bars.length),
    });

    core.initialize();

    expect(emitted).toEqual([]);
  });

  it('works with a datafeed that does not implement the extension', () => {
    const { datafeed, historyRequests } = createControlledDatafeed();
    const core = new ChartWidgetCore({ datafeed, symbol: 'BTC', interval: '5' });

    expect(() => core.initialize()).not.toThrow();
    expect(historyRequests).toHaveLength(1);
  });
});
