import type { AnalysisBar, LoadedAnalysisContext, SimilarPatternsRequest, SimilarPatternsResult } from './types';

import {
  MAX_ANALYSIS_SNAPSHOT_BARS,
  selectLoadedAnalysisRange,
  validAnalysisRange,
  validateLoadedAnalysisContext,
} from './loadedBars';

export const MIN_ANALYSIS_PATTERN_BARS = 5;
export const MAX_ANALYSIS_SEARCH_WINDOWS = 2_000;
export const MAX_ANALYSIS_PATTERN_MATCHES = 20;

function normalizedShape(bars: readonly AnalysisBar[], start: number, end: number): number[] | null {
  let low = Infinity,
    high = -Infinity;
  for (let index = start; index < end; index++) {
    const bar = bars[index]!;
    low = Math.min(low, bar.open, bar.high, bar.low, bar.close);
    high = Math.max(high, bar.open, bar.high, bar.low, bar.close);
  }
  const amplitude = high - low;
  if (!Number.isFinite(amplitude) || amplitude <= 0) return null;
  const origin = bars[start]!.close;
  const values: number[] = [];
  for (let index = start; index < end; index++) {
    const bar = bars[index]!;
    values.push(
      (bar.open - origin) / amplitude,
      (bar.high - origin) / amplitude,
      (bar.low - origin) / amplitude,
      (bar.close - origin) / amplitude,
    );
  }
  return values.every(Number.isFinite) ? values : null;
}

export function findLoadedSimilarPatterns(
  context: LoadedAnalysisContext,
  request: SimilarPatternsRequest,
): SimilarPatternsResult {
  const invalid = validateLoadedAnalysisContext(context);
  if (invalid) return invalid;
  if (!validAnalysisRange(request.range)) return { status: 'unavailable', reason: 'invalid-range' };
  const limit = request.limit ?? 5;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_ANALYSIS_PATTERN_MATCHES)
    return { status: 'unavailable', reason: 'invalid-limit' };
  const bars = context.bars;
  if (request.range.from < bars[0]!.time || request.range.to > bars.at(-1)!.time)
    return { status: 'unavailable', reason: 'query-not-loaded' };
  const { start, end } = selectLoadedAnalysisRange(bars, request.range);
  const length = end - start;
  if (length < MIN_ANALYSIS_PATTERN_BARS) return { status: 'unavailable', reason: 'query-too-short' };
  if (length > MAX_ANALYSIS_SNAPSHOT_BARS) return { status: 'unavailable', reason: 'query-too-large' };
  const query = normalizedShape(bars, start, end);
  if (!query) return { status: 'unavailable', reason: 'flat-query' };
  const matches: Array<{ range: { from: number; to: number }; score: number }> = [];
  let searchedWindowCount = 0;
  let searchTruncated = false;
  let oldestSearchedStart: number | undefined;
  let newestSearchedEnd: number | undefined;
  for (let candidate = bars.length - length; candidate >= 0; candidate--) {
    const candidateEnd = candidate + length;
    if (candidate < end && candidateEnd > start) continue;
    if (searchedWindowCount === MAX_ANALYSIS_SEARCH_WINDOWS) {
      searchTruncated = true;
      break;
    }
    searchedWindowCount++;
    oldestSearchedStart = candidate;
    newestSearchedEnd ??= candidateEnd - 1;
    const shape = normalizedShape(bars, candidate, candidateEnd);
    if (!shape) continue;
    let squaredDistance = 0;
    for (let index = 0; index < query.length; index++) squaredDistance += (query[index]! - shape[index]!) ** 2;
    const score = 1 / (1 + Math.sqrt(squaredDistance / query.length));
    matches.push({ range: { from: bars[candidate]!.time, to: bars[candidateEnd - 1]!.time }, score });
    matches.sort((a, b) => b.score - a.score || b.range.from - a.range.from);
    if (matches.length > limit) matches.pop();
  }
  return {
    status: 'ready',
    contextRevision: context.contextRevision,
    queryRange: { from: bars[start]!.time, to: bars[end - 1]!.time },
    queryBarCount: length,
    searchedRange:
      oldestSearchedStart === undefined
        ? null
        : { from: bars[oldestSearchedStart]!.time, to: bars[newestSearchedEnd!]!.time },
    searchedWindowCount,
    searchTruncated,
    matches,
  };
}
