import type { Bar, DatafeedBar, IBasicDataFeed, LibrarySymbolInfo, PeriodParams, ResolutionString } from '../types';
import type { IIndicatorManager } from './ChartWidgetCore';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChartWidgetCore } from './ChartWidgetCore';
import { DEFAULT_HISTORY_BACKFILL_BAR_COUNT } from './historyBackfill';
import { HISTORY_ANCHOR_GRID_BARS, resolveWarmupHistoryStartTime } from './historyWarmup';

const INTERVAL = 15 * 60_000;
const GRID = INTERVAL * HISTORY_ANCHOR_GRID_BARS;
// A latest bar a little way into a grid cell.
const NOW = Math.floor(Date.UTC(2026, 10, 22) / GRID) * GRID + 123 * INTERVAL;

interface HistoryRequest {
  periodParams: PeriodParams;
  onResult: (bars: DatafeedBar[]) => void;
}

function makeBars(startTime: number, count: number): DatafeedBar[] {
  return Array.from({ length: count }, (_, index) => ({
    time: startTime + index * INTERVAL,
    open: 1,
    high: 2,
    low: 0,
    close: 1,
    volume: 1,
  }));
}

function createDatafeed(): { datafeed: IBasicDataFeed; requests: HistoryRequest[] } {
  const requests: HistoryRequest[] = [];
  const symbolInfo = (name: string): LibrarySymbolInfo => ({
    name,
    full_name: name,
    description: name,
    type: 'crypto',
    session: '24x7',
    exchange: 'Test',
    pricescale: 100,
    minmov: 1,
  });
  return {
    requests,
    datafeed: {
      onReady: (callback) => callback({ supported_resolutions: ['15'] as ResolutionString[] }),
      searchSymbols: (_input, _exchange, _type, onResult) => onResult([]),
      resolveSymbol: (name, onResolve) => onResolve(symbolInfo(name)),
      getBars: (_info, _resolution, periodParams, onResult) => {
        requests.push({ periodParams, onResult: (bars) => onResult(bars, { noData: bars.length === 0 }) });
      },
      subscribeBars: () => {},
      unsubscribeBars: () => {},
    },
  };
}

function createManager(initialBars: number) {
  let requirement = initialBars;
  let onChanged: (() => void) | null = null;
  const setBarsCalls: Bar[][] = [];
  const manager: IIndicatorManager = {
    setBars: (bars) => setBarsCalls.push(bars),
    getPlots: () => [],
    getHistoryRequirementBars: () => requirement,
    setOnHistoryRequirementChanged: (callback) => {
      onChanged = callback;
    },
  };
  return {
    manager,
    setBarsCalls,
    discover(bars: number) {
      requirement = bars;
      onChanged?.();
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ChartWidgetCore indicator warm-up', () => {
  it('sizes the first load to a requirement it already knows, and starts the bars on the grid', () => {
    const { datafeed, requests } = createDatafeed();
    const { manager, setBarsCalls } = createManager(501);
    const core = new ChartWidgetCore({ datafeed, symbol: 'BTC', interval: '15', indicatorManager: manager });

    core.initialize();
    const countBack = requests[0]!.periodParams.countBack!;
    const startTime = resolveWarmupHistoryStartTime({ intervalMs: INTERVAL, latestTime: NOW, warmupBars: 501 })!;
    expect(countBack).toBeGreaterThan(DEFAULT_HISTORY_BACKFILL_BAR_COUNT);
    expect(NOW - (countBack - 1) * INTERVAL).toBeLessThanOrEqual(startTime);

    requests[0]!.onResult(makeBars(NOW - (countBack - 1) * INTERVAL, countBack));

    expect(requests).toHaveLength(1);
    expect(core.getBars()[0]!.time % GRID).toBe(0);
    expect(setBarsCalls.at(-1)![0]!.time % GRID).toBe(0);
  });

  it('feeds studies the same first bar on refreshes inside one grid cell', () => {
    const firstBars: number[] = [];
    for (const offset of [0, 7, 90]) {
      vi.setSystemTime(NOW + offset * INTERVAL);
      const { datafeed, requests } = createDatafeed();
      const { manager, setBarsCalls } = createManager(501);
      const core = new ChartWidgetCore({ datafeed, symbol: 'BTC', interval: '15', indicatorManager: manager });
      core.initialize();
      const countBack = requests[0]!.periodParams.countBack!;
      requests[0]!.onResult(makeBars(NOW + offset * INTERVAL - (countBack - 1) * INTERVAL, countBack));
      firstBars.push(setBarsCalls.at(-1)![0]!.time);
      core.dispose();
    }
    expect(new Set(firstBars).size).toBe(1);
  });

  it('pages back once a declaration reports a requirement, handing studies the bars once', () => {
    const { datafeed, requests } = createDatafeed();
    const { manager, setBarsCalls, discover } = createManager(0);
    const core = new ChartWidgetCore({ datafeed, symbol: 'BTC', interval: '15', indicatorManager: manager });

    core.initialize();
    expect(requests[0]!.periodParams.countBack).toBe(DEFAULT_HISTORY_BACKFILL_BAR_COUNT);
    const firstEarliest = NOW - (DEFAULT_HISTORY_BACKFILL_BAR_COUNT - 1) * INTERVAL;
    requests[0]!.onResult(makeBars(firstEarliest, DEFAULT_HISTORY_BACKFILL_BAR_COUNT));
    expect(setBarsCalls).toHaveLength(1);

    discover(501);
    expect(requests).toHaveLength(2);

    // A short page: still not at the warm-up start, so paging continues and
    // the studies are not recomputed on the partial history.
    requests[1]!.onResult(makeBars(firstEarliest - 200 * INTERVAL, 200));
    expect(requests).toHaveLength(3);
    expect(setBarsCalls).toHaveLength(1);

    const secondEarliest = firstEarliest - 200 * INTERVAL;
    const countBack = requests[2]!.periodParams.countBack!;
    requests[2]!.onResult(makeBars(secondEarliest - countBack * INTERVAL, countBack));

    expect(requests).toHaveLength(3);
    expect(setBarsCalls).toHaveLength(2);
    const startTime = resolveWarmupHistoryStartTime({ intervalMs: INTERVAL, latestTime: NOW, warmupBars: 501 })!;
    expect(setBarsCalls[1]![0]!.time % GRID).toBe(0);
    expect(setBarsCalls[1]![0]!.time).toBeLessThanOrEqual(startTime);
  });

  it('hands studies the bars when the venue runs out of history mid warm-up', () => {
    const { datafeed, requests } = createDatafeed();
    const { manager, setBarsCalls, discover } = createManager(0);
    const core = new ChartWidgetCore({ datafeed, symbol: 'BTC', interval: '15', indicatorManager: manager });

    core.initialize();
    const firstEarliest = NOW - (DEFAULT_HISTORY_BACKFILL_BAR_COUNT - 1) * INTERVAL;
    requests[0]!.onResult(makeBars(firstEarliest, DEFAULT_HISTORY_BACKFILL_BAR_COUNT));
    discover(501);
    requests[1]!.onResult(makeBars(firstEarliest - 50 * INTERVAL, 50));
    requests[2]!.onResult([]);

    expect(setBarsCalls).toHaveLength(2);
    expect(setBarsCalls[1]).toHaveLength(DEFAULT_HISTORY_BACKFILL_BAR_COUNT + 50);
  });
});

describe('ChartWidgetCore scrollback after warm-up', () => {
  it('keeps extending history left with a default page once the warm-up is covered', () => {
    const { datafeed, requests } = createDatafeed();
    const { manager } = createManager(501);
    const core = new ChartWidgetCore({ datafeed, symbol: 'BTC', interval: '15', indicatorManager: manager });

    core.initialize();
    const countBack = requests[0]!.periodParams.countBack!;
    requests[0]!.onResult(makeBars(NOW - (countBack - 1) * INTERVAL, countBack));
    const warmedStart = core.getBars()[0]!.time;

    // The user scrolls back: each page is shorter than one anchor-grid cell.
    core.requestMoreBars('left');
    const page = requests.at(-1)!;
    page.onResult(makeBars(warmedStart - DEFAULT_HISTORY_BACKFILL_BAR_COUNT * INTERVAL, DEFAULT_HISTORY_BACKFILL_BAR_COUNT));

    expect(core.getBars()[0]!.time).toBe(warmedStart - DEFAULT_HISTORY_BACKFILL_BAR_COUNT * INTERVAL);
  });
});

describe('ChartWidgetCore late indicator manager', () => {
  it('pages back for warm-up when a manager with a known requirement attaches to loaded bars', () => {
    const { datafeed, requests } = createDatafeed();
    const core = new ChartWidgetCore({ datafeed, symbol: 'BTC', interval: '15' });
    core.initialize();
    const countBack = requests[0]!.periodParams.countBack!;
    requests[0]!.onResult(makeBars(NOW - (countBack - 1) * INTERVAL, countBack));
    expect(requests).toHaveLength(1);

    const { manager } = createManager(501);
    core.setIndicatorManager(manager);

    const startTime = resolveWarmupHistoryStartTime({ intervalMs: INTERVAL, latestTime: NOW, warmupBars: 501 })!;
    expect(requests).toHaveLength(2);
    expect(requests[1]!.periodParams.from * 1000).toBeLessThanOrEqual(startTime);
  });
});
