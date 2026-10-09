import type { AnalysisBar, LoadedAnalysisContext } from './types';

import { describe, expect, it } from 'vitest';

import { BUILTIN_INDICATORS } from '../indicators/builtinIndicators';
import {
  ANALYSIS_INDICATORS,
  findLoadedSimilarPatterns,
  getLoadedAnalysisSnapshot,
  MAX_ANALYSIS_SEARCH_WINDOWS,
} from './index';

function bars(count: number, start = 1000): AnalysisBar[] {
  return Array.from({ length: count }, (_, index) => ({
    time: start + index * 1000,
    open: 100 + (index % 7),
    high: 103 + (index % 7),
    low: 98 + (index % 7),
    close: 101 + (index % 7),
    volume: 10,
  }));
}
function context(values = bars(10)): LoadedAnalysisContext {
  return { bars: values, symbol: 'TEST', interval: '1', contextRevision: 3, visibleRange: { from: 3000, to: 7000 } };
}

describe('loaded analysis snapshots', () => {
  it('selects visible millisecond timestamps inclusively and strips extras into detached OHLCV bars', () => {
    const values = bars(10).map((bar) => ({ ...bar, account: 'secret', custom: { private: true } }));
    const source = context(values);
    const result = getLoadedAnalysisSnapshot(source);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error('Expected snapshot');
    expect(result.snapshot).toMatchObject({
      schemaVersion: 1,
      timeUnit: 'milliseconds',
      contextRevision: 3,
      eligibleBarCount: 5,
      truncated: false,
      returnedRange: { from: 3000, to: 7000 },
      coverage: { leftClipped: false, rightClipped: false },
    });
    expect(Object.keys(result.snapshot.bars[0]!)).toEqual(['time', 'open', 'high', 'low', 'close', 'volume']);
    result.snapshot.bars[0]!.close = 99;
    result.snapshot.requestedRange.from = 0;
    expect(values[2]!.close).toBe(103);
    expect(source.visibleRange!.from).toBe(3000);
  });

  it('keeps at most the newest 500 contiguous bars and discloses clipping separately from truncation', () => {
    const result = getLoadedAnalysisSnapshot(context(bars(600)), { range: { from: 0, to: 900_000 }, maxBars: 9999 });
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error('Expected snapshot');
    expect(result.snapshot.bars).toHaveLength(500);
    expect(result.snapshot).toMatchObject({
      eligibleBarCount: 600,
      truncated: true,
      clippedRange: { from: 1000, to: 600_000 },
      returnedRange: { from: 101_000, to: 600_000 },
      coverage: { leftClipped: true, rightClipped: true },
    });
    expect(
      result.snapshot.bars.every((bar, index, values) => index === 0 || bar.time - values[index - 1]!.time === 1000),
    ).toBe(true);
  });

  it('uses actual loaded timestamps through session gaps, without synthesizing candles', () => {
    const values = [bars(1)[0]!, { ...bars(1)[0]!, time: 100_000 }];
    const result = getLoadedAnalysisSnapshot(context(values), { range: { from: 5000, to: 120_000 } });
    expect(result).toMatchObject({
      status: 'ready',
      snapshot: { eligibleBarCount: 1, bars: [{ time: 100_000 }], coverage: { rightClipped: true } },
    });
  });

  it.each(
    [
      [{ ...bars(1)[0]!, close: NaN }],
      [{ ...bars(1)[0]!, high: 90 }],
      [{ ...bars(1)[0]!, low: 105 }],
      [{ ...bars(1)[0]!, volume: -1 }],
      [{ ...bars(1)[0]!, time: -1 }],
      [{ ...bars(1)[0]!, time: 1000.5 }],
      [bars(1)[0]!, bars(1)[0]!],
      bars(3).reverse(),
    ].map((values) => [values]),
  )('refuses invalid/unsorted/duplicate loaded data without modifying it (%#)', (values) => {
    const original = values.map((bar) => ({ ...bar }));
    expect(getLoadedAnalysisSnapshot(context(values))).toEqual({ status: 'unavailable', reason: 'invalid-data' });
    expect(values).toEqual(original);
  });

  it('accepts finite negative instrument prices', () => {
    const result = getLoadedAnalysisSnapshot(
      context([{ time: 3000, open: -10, high: -5, low: -12, close: -8, volume: 0 }]),
    );
    expect(result.status).toBe('ready');
  });

  it.each([
    [{ range: { from: 0, to: NaN } }, 'invalid-range'],
    [{ range: { from: 9, to: 2 } }, 'invalid-range'],
    [{ range: { from: 20_000, to: 30_000 } }, 'empty-range'],
    [{ maxBars: 0 }, 'invalid-limit'],
  ] as const)('returns an explicit unavailable reason for an invalid or empty request (%#)', (request, reason) => {
    expect(getLoadedAnalysisSnapshot(context(), request)).toEqual({ status: 'unavailable', reason });
  });
});

describe('loaded normalized OHLC shape similarity', () => {
  it('finds offset/scaled copies, excludes the seed and returns deterministic newest ties', () => {
    const seed = bars(5);
    const repeated = [
      ...seed,
      ...seed.map((bar) => ({
        ...bar,
        time: bar.time + 10_000,
        open: bar.open * 2 + 100,
        high: bar.high * 2 + 100,
        low: bar.low * 2 + 100,
        close: bar.close * 2 + 100,
      })),
      ...seed.map((bar) => ({ ...bar, time: bar.time + 20_000 })),
    ];
    const result = findLoadedSimilarPatterns(context(repeated), { range: { from: 1000, to: 5000 }, limit: 2 });
    expect(result).toMatchObject({
      status: 'ready',
      queryBarCount: 5,
      contextRevision: 3,
      matches: [
        { range: { from: 21_000, to: 25_000 }, score: 1 },
        { range: { from: 11_000, to: 15_000 }, score: 1 },
      ],
    });
    if (result.status !== 'ready') throw new Error('Expected matches');
    expect(result.matches.every((match) => match.range.from > 5000 && Number.isFinite(match.score))).toBe(true);
  });

  it('caps search to the newest 2000 windows and reports the exact searched envelope and count', () => {
    const result = findLoadedSimilarPatterns(context(bars(2110)), { range: { from: 1000, to: 5000 } });
    expect(result).toMatchObject({
      status: 'ready',
      searchedWindowCount: MAX_ANALYSIS_SEARCH_WINDOWS,
      searchTruncated: true,
      searchedRange: { from: 107_000, to: 2_110_000 },
    });
  });

  it.each([
    [{ range: { from: 0, to: 5000 } }, 'query-not-loaded'],
    [{ range: { from: 1000, to: 3000 } }, 'query-too-short'],
    [{ range: { from: 1000, to: 501_000 } }, 'query-too-large'],
    [{ range: { from: 1000, to: 5000 }, limit: 21 }, 'invalid-limit'],
  ] as const)('refuses incomplete/short/large queries or an excessive result limit (%#)', (request, reason) => {
    expect(findLoadedSimilarPatterns(context(bars(600)), request)).toEqual({ status: 'unavailable', reason });
  });

  it('handles flat queries explicitly and returns no matches when all windows overlap the seed', () => {
    const flat = bars(5).map((bar) => ({ ...bar, open: 1, high: 1, low: 1, close: 1 }));
    expect(findLoadedSimilarPatterns(context(flat), { range: { from: 1000, to: 5000 } })).toEqual({
      status: 'unavailable',
      reason: 'flat-query',
    });
    expect(findLoadedSimilarPatterns(context(bars(5)), { range: { from: 1000, to: 5000 } })).toMatchObject({
      status: 'ready',
      matches: [],
      searchedRange: null,
      searchedWindowCount: 0,
      searchTruncated: false,
    });
  });
});

it('exposes a loaded-bars-only action catalog without executable source or request-capable indicators', () => {
  expect(ANALYSIS_INDICATORS).toHaveLength(10);
  for (const descriptor of ANALYSIS_INDICATORS) {
    const definition = BUILTIN_INDICATORS.find((indicator) => indicator.id === descriptor.id)!;
    expect(definition).toBeDefined();
    expect(definition.jailbreak).toBeUndefined();
    expect(definition.code).not.toMatch(/\brequest\s*\./);
    expect(Object.keys(descriptor)).toEqual(['id', 'name', 'description', 'overlay']);
  }
});
