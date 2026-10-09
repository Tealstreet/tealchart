export interface AnalysisBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Inclusive Unix timestamps in milliseconds. */
export interface AnalysisTimeRange {
  from: number;
  to: number;
}

export type AnalysisUnavailableReason =
  | 'unsupported'
  | 'disposed'
  | 'loading'
  | 'stale-market'
  | 'no-data'
  | 'no-viewport'
  | 'invalid-data'
  | 'invalid-range'
  | 'empty-range'
  | 'invalid-limit'
  | 'query-not-loaded'
  | 'query-too-short'
  | 'query-too-large'
  | 'flat-query';

export interface AnalysisUnavailableResult {
  status: 'unavailable';
  reason: AnalysisUnavailableReason;
}

export interface LoadedAnalysisContext {
  bars: readonly AnalysisBar[];
  symbol: string;
  interval: string;
  contextRevision: number;
  visibleRange?: AnalysisTimeRange;
}

export type AnalysisContextReadResult = { status: 'ready'; context: LoadedAnalysisContext } | AnalysisUnavailableResult;

export interface AnalysisSnapshotRequest {
  range?: AnalysisTimeRange;
  maxBars?: number;
}

export interface AnalysisSnapshot {
  schemaVersion: 1;
  timeUnit: 'milliseconds';
  symbol: string;
  interval: string;
  contextRevision: number;
  requestedRange: AnalysisTimeRange;
  loadedRange: AnalysisTimeRange;
  clippedRange: AnalysisTimeRange;
  returnedRange: AnalysisTimeRange;
  eligibleBarCount: number;
  truncated: boolean;
  coverage: { leftClipped: boolean; rightClipped: boolean };
  bars: AnalysisBar[];
}

export type AnalysisSnapshotResult = { status: 'ready'; snapshot: AnalysisSnapshot } | AnalysisUnavailableResult;

export interface SimilarPatternsRequest {
  range: AnalysisTimeRange;
  limit?: number;
}

export interface SimilarPatternMatch {
  range: AnalysisTimeRange;
  score: number;
}

export type SimilarPatternsResult =
  | {
      status: 'ready';
      contextRevision: number;
      queryRange: AnalysisTimeRange;
      queryBarCount: number;
      searchedRange: AnalysisTimeRange | null;
      searchedWindowCount: number;
      searchTruncated: boolean;
      matches: SimilarPatternMatch[];
    }
  | AnalysisUnavailableResult;
