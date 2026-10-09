import type {
  AnalysisBar,
  AnalysisSnapshotRequest,
  AnalysisSnapshotResult,
  AnalysisTimeRange,
  AnalysisUnavailableResult,
  LoadedAnalysisContext,
} from './types';

export const MAX_ANALYSIS_SNAPSHOT_BARS = 500;

export function validateLoadedAnalysisContext(context: LoadedAnalysisContext): AnalysisUnavailableResult | null {
  if (!context.bars.length) return { status: 'unavailable', reason: 'no-data' };
  if (
    !context.symbol ||
    !context.interval ||
    !Number.isSafeInteger(context.contextRevision) ||
    context.contextRevision < 0
  )
    return { status: 'unavailable', reason: 'invalid-data' };
  let previousTime = -Infinity;
  for (const bar of context.bars) {
    if (
      !bar ||
      ![bar.time, bar.open, bar.high, bar.low, bar.close, bar.volume].every(Number.isFinite) ||
      !Number.isSafeInteger(bar.time) ||
      bar.time < 0 ||
      bar.volume < 0 ||
      bar.high < Math.max(bar.open, bar.close, bar.low) ||
      bar.low > Math.min(bar.open, bar.close, bar.high) ||
      bar.time <= previousTime
    )
      return { status: 'unavailable', reason: 'invalid-data' };
    previousTime = bar.time;
  }
  return null;
}

export function validAnalysisRange(range: AnalysisTimeRange): boolean {
  return !!range && Number.isFinite(range.from) && Number.isFinite(range.to) && range.from <= range.to;
}

export function selectLoadedAnalysisRange(
  bars: readonly AnalysisBar[],
  range: AnalysisTimeRange,
): { start: number; end: number } {
  const lowerBound = (time: number, inclusive: boolean): number => {
    let left = 0,
      right = bars.length;
    while (left < right) {
      const middle = Math.floor((left + right) / 2);
      if (bars[middle]!.time < time || (!inclusive && bars[middle]!.time === time)) left = middle + 1;
      else right = middle;
    }
    return left;
  };
  return { start: lowerBound(range.from, true), end: lowerBound(range.to, false) };
}

export function getLoadedAnalysisSnapshot(
  context: LoadedAnalysisContext,
  request: AnalysisSnapshotRequest = {},
): AnalysisSnapshotResult {
  const invalid = validateLoadedAnalysisContext(context);
  if (invalid) return invalid;
  const range = request.range ?? context.visibleRange;
  if (!range) return { status: 'unavailable', reason: 'no-viewport' };
  if (!validAnalysisRange(range)) return { status: 'unavailable', reason: 'invalid-range' };
  const requestedLimit = request.maxBars ?? MAX_ANALYSIS_SNAPSHOT_BARS;
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1)
    return { status: 'unavailable', reason: 'invalid-limit' };
  const limit = Math.min(requestedLimit, MAX_ANALYSIS_SNAPSHOT_BARS);
  const { start, end } = selectLoadedAnalysisRange(context.bars, range);
  if (end <= start) return { status: 'unavailable', reason: 'empty-range' };
  const bars = context.bars
    .slice(Math.max(start, end - limit), end)
    .map(({ time, open, high, low, close, volume }) => ({ time, open, high, low, close, volume }));
  const loadedRange = { from: context.bars[0]!.time, to: context.bars.at(-1)!.time };
  return {
    status: 'ready',
    snapshot: {
      schemaVersion: 1,
      timeUnit: 'milliseconds',
      symbol: context.symbol,
      interval: context.interval,
      contextRevision: context.contextRevision,
      requestedRange: { ...range },
      loadedRange,
      clippedRange: { from: Math.max(range.from, loadedRange.from), to: Math.min(range.to, loadedRange.to) },
      returnedRange: { from: bars[0]!.time, to: bars.at(-1)!.time },
      eligibleBarCount: end - start,
      truncated: end - start > bars.length,
      coverage: { leftClipped: range.from < loadedRange.from, rightClipped: range.to > loadedRange.to },
      bars,
    },
  };
}
