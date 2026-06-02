import { describe, expect, it } from 'vitest';

import {
  formatPineCompatibilityCorpusMarkdown,
  runPineCompatibilityCorpus,
  type CompatibilityStageOutcome,
  type PineCompatibilityCorpusCase,
  type PineScriptLedgerEntry,
} from '../../src';

const retrievedAt = '2026-06-02';

const passedThroughOutput: CompatibilityStageOutcome[] = [
  { stage: 'parse', status: 'passed' },
  { stage: 'semantic', status: 'passed' },
  { stage: 'runtime', status: 'passed' },
  { stage: 'datafeed', status: 'passed' },
  { stage: 'output', status: 'passed' },
  { stage: 'render', status: 'skipped', message: 'numeric fixture; render comparison is manual' },
];

const passedThroughRuntime: CompatibilityStageOutcome[] = [
  { stage: 'parse', status: 'passed' },
  { stage: 'semantic', status: 'passed' },
  { stage: 'runtime', status: 'passed' },
  { stage: 'datafeed', status: 'skipped', message: 'local compatibilityBars only' },
  { stage: 'output', status: 'passed' },
  { stage: 'render', status: 'skipped', message: 'numeric fixture; render comparison is manual' },
];

const compatibilityCheckpointCorpus: PineCompatibilityCorpusCase[] = [
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-builtins-checkpoint',
      title: 'Official Built-ins Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/language/built-ins/',
      featureTags: ['builtins', 'series', 'ta', 'plot'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-array-checkpoint',
      title: 'Official Array Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/language/arrays/',
      featureTags: ['arrays', 'barstate', 'var'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-barcolor-checkpoint',
      title: 'Official Barcolor Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/visuals/bar-coloring/',
      featureTags: ['visuals', 'barcolor', 'output'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-alert-checkpoint',
      title: 'Official Alert Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/concepts/alerts/',
      featureTags: ['alerts', 'visuals', 'output'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-strategy-checkpoint',
      title: 'Official Strategy Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/concepts/strategies/',
      category: 'strategy',
      featureTags: ['strategy', 'broker', 'orders'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-bar-magnifier-checkpoint',
      title: 'Official Bar Magnifier Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/concepts/strategies/',
      category: 'strategy',
      featureTags: ['strategy', 'bar_magnifier', 'intrabar'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-recalculate-after-fill-checkpoint',
      title: 'Official Recalculate After Fill Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/concepts/strategies/',
      category: 'strategy',
      featureTags: ['strategy', 'recalculation', 'orders'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-request-limit-checkpoint',
      title: 'Official Request Limit Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/writing/limitations/',
      featureTags: ['request', 'limits', 'runtime'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-mtf-trend-checkpoint',
      title: 'Public MTF Trend Checkpoint',
      searchContext: 'TradingView public scripts search: mtf trend filter',
      featureTags: ['request', 'mtf', 'trend_filter'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-divergence-checkpoint',
      title: 'Public Divergence Checkpoint',
      searchContext: 'TradingView public scripts search: rsi divergence',
      featureTags: ['divergence', 'pivots', 'oscillator'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-session-filter-checkpoint',
      title: 'Public Session Filter Checkpoint',
      searchContext: 'TradingView public scripts search: session filter',
      featureTags: ['sessions', 'time', 'filters'],
    }),
    stages: passedThroughRuntime,
  },
];

describe('Pine compatibility checkpoint corpus', () => {
  it('keeps source-linked reduced checkpoints in the offline corpus', () => {
    const run = runPineCompatibilityCorpus(compatibilityCheckpointCorpus);

    expect(run.summary.total).toBe(11);
    expect(run.summary.passed).toBe(11);
    expect(run.summary.failed).toBe(0);
    expect(run.summary.validationErrors).toEqual({});
    expect(run.summary.byFeatureTag).toMatchObject({
      request: { total: 2, passed: 2, failed: 0 },
      strategy: { total: 3, passed: 3, failed: 0 },
      visuals: { total: 2, passed: 2, failed: 0 },
    });
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-mtf-trend-checkpoint');
  });

  it('renders a stable checkpoint corpus report', () => {
    const markdown = formatPineCompatibilityCorpusMarkdown(runPineCompatibilityCorpus(compatibilityCheckpointCorpus));

    expect(markdown).toContain('Total: 11');
    expect(markdown).toContain('Pass rate: 100.0%');
    expect(markdown).toContain('| strategy | 3 | 3 | 0 |');
    expect(markdown).toContain('| request | 2 | 2 | 0 |');
    expect(markdown).not.toContain('Validation Errors');
  });
});

function officialDocsEntry(input: {
  id: string;
  title: string;
  url: string;
  category?: PineScriptLedgerEntry['category'];
  featureTags: string[];
}): PineScriptLedgerEntry {
  return {
    id: input.id,
    title: input.title,
    pineVersion: 'v6',
    category: input.category ?? 'indicator',
    source: {
      kind: 'official_docs',
      url: input.url,
      retrievedAt,
      licenseStatus: 'unknown',
    },
    featureTags: input.featureTags,
    storagePolicy: 'reduced_fixture_only',
  };
}

function publicSearchEntry(input: {
  id: string;
  title: string;
  searchContext: string;
  category?: PineScriptLedgerEntry['category'];
  featureTags: string[];
}): PineScriptLedgerEntry {
  return {
    id: input.id,
    title: input.title,
    pineVersion: 'v6',
    category: input.category ?? 'indicator',
    source: {
      kind: 'public_script',
      searchContext: input.searchContext,
      retrievedAt,
      licenseStatus: 'unknown',
    },
    featureTags: input.featureTags,
    storagePolicy: 'reduced_fixture_only',
  };
}
