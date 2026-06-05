import {
  createPineScriptLedger,
  type CompatibilityStageOutcome,
  type PineCompatibilityCorpusCase,
  type PineScriptLedger,
  type PineScriptLedgerEntry,
} from '../../src/compat/index.ts';

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

export const compatibilityCheckpointCorpus: PineCompatibilityCorpusCase[] = [
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
      id: 'official-max-bars-back-checkpoint',
      title: 'Official Max Bars Back Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/error-messages/',
      featureTags: ['runtime', 'history', 'max_bars_back'],
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
      id: 'official-marker-payload-checkpoint',
      title: 'Official Marker Payload Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/visuals/text-and-shapes/',
      featureTags: ['visuals', 'plotshape', 'plotchar', 'output'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-plot-style-checkpoint',
      title: 'Official Plot Style Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/visuals/plots/',
      featureTags: ['visuals', 'plot', 'output'],
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
      id: 'official-trailing-exit-checkpoint',
      title: 'Official Trailing Exit Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/concepts/strategies/',
      category: 'strategy',
      featureTags: ['strategy', 'broker', 'orders', 'trailing_stop'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-broker-emulator-path-checkpoint',
      title: 'Official Broker Emulator Path Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/concepts/strategies/#broker-emulator',
      category: 'strategy',
      featureTags: ['strategy', 'broker', 'orders', 'gap_fills'],
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
      id: 'official-stop-limit-checkpoint',
      title: 'Official Stop Limit Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/concepts/strategies/#order-types',
      category: 'strategy',
      featureTags: ['strategy', 'broker', 'orders', 'stop_limit'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-immediate-close-checkpoint',
      title: 'Official Immediate Close Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/concepts/strategies/#strategyclose-and-strategyclose_all',
      category: 'strategy',
      featureTags: ['strategy', 'broker', 'orders', 'close_immediately'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-disable-alert-checkpoint',
      title: 'Official Disable Alert Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/concepts/strategies/',
      category: 'strategy',
      featureTags: ['strategy', 'alerts', 'orders', 'disable_alert'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-allow-entry-in-checkpoint',
      title: 'Official Allow Entry In Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/concepts/strategies/',
      category: 'strategy',
      featureTags: ['strategy', 'broker', 'orders', 'allow_entry_in'],
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
      id: 'official-calc-on-every-tick-checkpoint',
      title: 'Official Calc On Every Tick Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/concepts/strategies/',
      category: 'strategy',
      featureTags: ['strategy', 'realtime', 'recalculation'],
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
    ledgerEntry: officialDocsEntry({
      id: 'official-lower-tf-array-checkpoint',
      title: 'Official Lower TF Array Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/',
      featureTags: ['request', 'lower_timeframe', 'arrays'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-ticker-request-checkpoint',
      title: 'Official Ticker Request Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/concepts/non-standard-charts-data/',
      featureTags: ['ticker', 'request', 'heikin_ashi'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-dynamic-session-checkpoint',
      title: 'Official Dynamic Session Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/concepts/sessions/',
      featureTags: ['sessions', 'time', 'inputs'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-timeframe-comparison-checkpoint',
      title: 'Official Timeframe Comparison Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/concepts/timeframes/',
      featureTags: ['timeframes', 'inputs'],
    }),
    stages: passedThroughRuntime,
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
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-dashboard-table-checkpoint',
      title: 'Public Dashboard Table Checkpoint',
      searchContext: 'TradingView public scripts search: dashboard table',
      featureTags: ['tables', 'dashboard', 'visuals', 'signals'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-screener-checkpoint',
      title: 'Public Screener Checkpoint',
      searchContext: 'TradingView public scripts search: screener',
      featureTags: ['request', 'screener', 'multi_symbol', 'tables', 'signals'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-library-helper-checkpoint',
      title: 'Public Library Helper Checkpoint',
      searchContext: 'TradingView public scripts search: library helper',
      featureTags: ['libraries', 'imports', 'udf', 'signals'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-strategy-bracket-checkpoint',
      title: 'Public Strategy Bracket Checkpoint',
      searchContext: 'TradingView public scripts search: strategy bracket',
      category: 'strategy',
      featureTags: ['strategy', 'broker', 'orders', 'brackets'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-alert-signal-checkpoint',
      title: 'Public Alert Signal Checkpoint',
      searchContext: 'TradingView public scripts search: alert signal',
      featureTags: ['alerts', 'signals', 'ta', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-synthetic-ticker-checkpoint',
      title: 'Public Synthetic Ticker Checkpoint',
      searchContext: 'TradingView public scripts search: heikin ashi trend',
      featureTags: ['ticker', 'request', 'heikin_ashi', 'signals'],
    }),
    stages: passedThroughOutput,
  },
];

export const compatibilityCheckpointLedger: PineScriptLedger = createPineScriptLedger(
  compatibilityCheckpointCorpus.map((corpusCase) => corpusCase.ledgerEntry),
);

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
