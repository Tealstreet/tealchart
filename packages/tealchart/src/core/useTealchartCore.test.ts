import type { Bar, UnifiedPaneLayout } from '../types';
import type { TealchartCoreState } from './useTealchartCore';

import { describe, expect, it } from 'vitest';

import { tealchartCoreStateReducer } from './useTealchartCore';

const emptyLayout: UnifiedPaneLayout = {
  panes: [
    {
      id: 'main',
      type: 'main',
      heightRatio: 1,
      yMin: 0,
      yMax: 0,
      fixedRange: false,
    },
  ],
  timeAxisHeight: 24,
};

function makeState(overrides: Partial<TealchartCoreState> = {}): TealchartCoreState {
  return {
    bars: [],
    barsContext: null,
    interval: '5',
    isLoading: true,
    symbol: 'BTC',
    unifiedLayout: emptyLayout,
    ...overrides,
  };
}

function makeBars(startTime: number, intervalMs: number, count: number): Bar[] {
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

describe('tealchartCoreStateReducer', () => {
  it('keeps stale bar arrays out of the current symbol and interval state', () => {
    const currentState = makeState({
      bars: makeBars(2_000_000, 5 * 60_000, 3),
      interval: '5',
      isLoading: false,
      symbol: 'BTC',
    });

    const result = tealchartCoreStateReducer(currentState, {
      type: 'barsChanged',
      bars: makeBars(1_000_000, 15 * 60_000, 3),
      context: {
        interval: '15',
        requestId: 1,
        source: 'history',
        symbol: 'BTC',
      },
    });

    expect(result).toBe(currentState);
  });

  it('accepts bar arrays whose identity matches the current state', () => {
    const currentState = makeState({ interval: '5', symbol: 'BTC' });
    const nextBars = makeBars(2_000_000, 5 * 60_000, 3);

    const result = tealchartCoreStateReducer(currentState, {
      type: 'barsChanged',
      bars: nextBars,
      context: {
        interval: '5',
        requestId: 2,
        source: 'history',
        symbol: 'BTC',
      },
    });

    expect(result).not.toBe(currentState);
    expect(result.bars).toEqual(nextBars);
    expect(result.barsContext).toEqual({
      interval: '5',
      requestId: 2,
      source: 'history',
      symbol: 'BTC',
    });
  });

  it('keeps loaded bar context while a new interval request is loading', () => {
    const currentState = makeState({
      bars: makeBars(2_000_000, 15 * 60_000, 3),
      barsContext: {
        interval: '15',
        requestId: 1,
        source: 'history',
        symbol: 'BTC',
      },
      interval: '15',
      isLoading: false,
      symbol: 'BTC',
    });

    const result = tealchartCoreStateReducer(currentState, {
      type: 'intervalChanged',
      interval: '5',
    });

    expect(result.interval).toBe('5');
    expect(result.isLoading).toBe(true);
    expect(result.bars).toBe(currentState.bars);
    expect(result.barsContext).toBe(currentState.barsContext);
  });

  it('accepts history for a replacement controlled symbol after syncing the active context', () => {
    const currentState = makeState({
      bars: makeBars(2_000_000, 15 * 60_000, 3),
      barsContext: {
        interval: '15',
        requestId: 1,
        source: 'history',
        symbol: 'BTC',
      },
      interval: '15',
      isLoading: false,
      symbol: 'BTC',
    });
    const dogeBars = makeBars(3_000_000, 15 * 60_000, 3);

    const loadingDoge = tealchartCoreStateReducer(currentState, {
      type: 'controlledDataContextChanged',
      symbol: 'DOGE',
      interval: '15',
    });
    const result = tealchartCoreStateReducer(loadingDoge, {
      type: 'barsChanged',
      bars: dogeBars,
      context: {
        interval: '15',
        requestId: 1,
        source: 'history',
        symbol: 'DOGE',
      },
    });

    expect(loadingDoge.symbol).toBe('DOGE');
    expect(loadingDoge.isLoading).toBe(true);
    expect(loadingDoge.bars).toBe(currentState.bars);
    expect(result.bars).toEqual(dogeBars);
    expect(result.barsContext?.symbol).toBe('DOGE');
  });

  it('keeps stale loading transitions from ending the active data load', () => {
    const currentState = makeState({
      interval: '5',
      isLoading: true,
      symbol: 'BTC',
    });

    const result = tealchartCoreStateReducer(currentState, {
      type: 'loadingChanged',
      loading: false,
      context: {
        interval: '15',
        requestId: 1,
        symbol: 'BTC',
      },
    });

    expect(result).toBe(currentState);
  });
});
