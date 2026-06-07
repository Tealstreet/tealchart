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
    ledgerEntry: publicSearchEntry({
      id: 'public-input-configuration-checkpoint',
      title: 'Public Input Configuration Checkpoint',
      searchContext: 'TradingView public scripts search: configurable indicator inputs',
      featureTags: ['inputs', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-date-session-input-checkpoint',
      title: 'Public Date Session Input Checkpoint',
      searchContext: 'TradingView public scripts search: date session filter',
      featureTags: ['inputs', 'time', 'sessions', 'timeframes', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-syminfo-metadata-checkpoint',
      title: 'Public Syminfo Metadata Checkpoint',
      searchContext: 'TradingView public scripts search: syminfo metadata',
      featureTags: ['syminfo', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-varip-array-checkpoint',
      title: 'Public Varip Array Checkpoint',
      searchContext: 'TradingView public scripts search: varip array',
      featureTags: ['arrays', 'varip', 'realtime', 'intrabar', 'state'],
    }),
    stages: passedThroughOutput,
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
      id: 'official-max-position-risk-checkpoint',
      title: 'Official Max Position Risk Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/concepts/strategies/',
      category: 'strategy',
      featureTags: ['strategy', 'broker', 'orders', 'risk', 'fills'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-intraday-filled-orders-risk-checkpoint',
      title: 'Official Intraday Filled Orders Risk Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/concepts/strategies/',
      category: 'strategy',
      featureTags: ['strategy', 'broker', 'orders', 'risk', 'fills'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-consecutive-loss-days-risk-checkpoint',
      title: 'Official Consecutive Loss Days Risk Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/concepts/strategies/',
      category: 'strategy',
      featureTags: ['strategy', 'broker', 'orders', 'risk', 'fills'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-intraday-loss-risk-checkpoint',
      title: 'Official Intraday Loss Risk Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/concepts/strategies/',
      category: 'strategy',
      featureTags: ['strategy', 'broker', 'orders', 'risk', 'fills'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-max-drawdown-risk-checkpoint',
      title: 'Official Max Drawdown Risk Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/concepts/strategies/',
      category: 'strategy',
      featureTags: ['strategy', 'broker', 'orders', 'risk', 'fills'],
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
      id: 'official-bar-magnifier-recalculate-checkpoint',
      title: 'Official Bar Magnifier Recalculate Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/concepts/strategies/',
      category: 'strategy',
      featureTags: ['strategy', 'bar_magnifier', 'intrabar', 'recalculation', 'orders'],
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
      id: 'public-marker-signal-checkpoint',
      title: 'Public Marker Signal Checkpoint',
      searchContext: 'TradingView public scripts search: buy sell signal markers',
      featureTags: ['visuals', 'signals', 'markers'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-label-signal-checkpoint',
      title: 'Public Label Signal Checkpoint',
      searchContext: 'TradingView public scripts search: signal label',
      featureTags: ['drawings', 'labels', 'visuals', 'signals'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-line-signal-checkpoint',
      title: 'Public Line Signal Checkpoint',
      searchContext: 'TradingView public scripts search: trendline breakout',
      featureTags: ['drawings', 'lines', 'visuals', 'signals'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-volatility-band-checkpoint',
      title: 'Public Volatility Band Checkpoint',
      searchContext: 'TradingView public scripts search: bollinger band squeeze',
      featureTags: ['visuals', 'signals', 'ta', 'bands', 'fills', 'volatility'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-object-method-checkpoint',
      title: 'Public Object Method Checkpoint',
      searchContext: 'TradingView public scripts search: market structure object',
      featureTags: ['objects', 'udt', 'methods', 'state'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-udt-state-layout-checkpoint',
      title: 'Public UDT State Layout Checkpoint',
      searchContext: 'TradingView public scripts search: market structure object',
      featureTags: ['objects', 'udt', 'methods', 'state', 'layout'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-udt-array-checkpoint',
      title: 'Public UDT Array Checkpoint',
      searchContext: 'TradingView public scripts search: market structure object array',
      featureTags: ['objects', 'udt', 'arrays', 'methods', 'state', 'tables', 'dashboard'],
    }),
    stages: passedThroughOutput,
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
      id: 'public-session-state-checkpoint',
      title: 'Public Session State Checkpoint',
      searchContext: 'TradingView public scripts search: session ismarket',
      featureTags: ['sessions', 'state', 'filters'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-drawing-zone-checkpoint',
      title: 'Public Drawing Zone Checkpoint',
      searchContext: 'TradingView public scripts search: supply demand zones',
      featureTags: ['drawings', 'boxes', 'zones', 'visuals'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-box-zone-checkpoint',
      title: 'Public Box Zone Checkpoint',
      searchContext: 'TradingView public scripts search: supply demand box',
      featureTags: ['drawings', 'boxes', 'box_setters', 'zones', 'visuals'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-drawing-copy-checkpoint',
      title: 'Public Drawing Copy Checkpoint',
      searchContext: 'TradingView public scripts search: drawing copy',
      featureTags: ['drawings', 'labels', 'lines', 'boxes', 'objects', 'visuals'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-linefill-channel-checkpoint',
      title: 'Public Linefill Channel Checkpoint',
      searchContext: 'TradingView public scripts search: channel linefill',
      featureTags: ['drawings', 'linefills', 'channels', 'visuals'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-zigzag-polyline-checkpoint',
      title: 'Public Zigzag Polyline Checkpoint',
      searchContext: 'TradingView public scripts search: zigzag polyline',
      featureTags: ['drawings', 'polylines', 'pivots', 'visuals', 'zigzag'],
    }),
    stages: passedThroughOutput,
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
      id: 'public-table-setter-checkpoint',
      title: 'Public Table Setter Checkpoint',
      searchContext: 'TradingView public scripts search: dashboard table settings',
      featureTags: ['tables', 'dashboard', 'visuals', 'table_setters'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-matrix-scoreboard-checkpoint',
      title: 'Public Matrix Scoreboard Checkpoint',
      searchContext: 'TradingView public scripts search: matrix dashboard',
      featureTags: ['matrix', 'tables', 'dashboard', 'signals'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-map-signal-checkpoint',
      title: 'Public Map Signal Checkpoint',
      searchContext: 'TradingView public scripts search: map dashboard',
      featureTags: ['map', 'tables', 'dashboard', 'signals'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-array-signal-checkpoint',
      title: 'Public Array Signal Checkpoint',
      searchContext: 'TradingView public scripts search: array signal dashboard',
      featureTags: ['arrays', 'tables', 'dashboard', 'signals'],
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
      id: 'public-currency-conversion-checkpoint',
      title: 'Public Currency Conversion Checkpoint',
      searchContext: 'TradingView public scripts search: currency conversion',
      featureTags: ['request', 'currency'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-earnings-event-checkpoint',
      title: 'Public Earnings Event Checkpoint',
      searchContext: 'TradingView public scripts search: earnings surprise',
      featureTags: ['request', 'earnings', 'markers', 'visuals'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-corporate-actions-checkpoint',
      title: 'Public Corporate Actions Checkpoint',
      searchContext: 'TradingView public scripts search: dividends splits',
      featureTags: ['request', 'dividends', 'splits', 'corporate_actions', 'markers', 'visuals'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-financial-dashboard-checkpoint',
      title: 'Public Financial Dashboard Checkpoint',
      searchContext: 'TradingView public scripts search: fundamental dashboard',
      featureTags: ['request', 'financial', 'tables', 'dashboard', 'visuals'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-economic-macro-checkpoint',
      title: 'Public Economic Macro Checkpoint',
      searchContext: 'TradingView public scripts search: macro economic',
      featureTags: ['request', 'economic'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-seed-dataset-checkpoint',
      title: 'Public Seed Dataset Checkpoint',
      searchContext: 'TradingView public scripts search: pine seeds',
      featureTags: ['request', 'seed'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-footprint-request-diagnostic-checkpoint',
      title: 'Public Footprint Request Diagnostic Checkpoint',
      searchContext: 'TradingView public scripts search: footprint request',
      featureTags: ['request', 'footprint', 'intrabar', 'unsupported'],
    }),
    stages: [
      { stage: 'parse', status: 'passed' },
      {
        stage: 'semantic',
        status: 'failed',
        failureClass: 'unsupported_planned',
        diagnostics: [{
          code: 'unsupported-feature',
          message: 'request.footprint is not supported yet: footprint data requires a host-provided footprint/intrabar volume model',
          line: 3,
          column: 13,
        }],
      },
    ],
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
      id: 'public-library-source-helper-checkpoint',
      title: 'Public Library Source Helper Checkpoint',
      searchContext: 'TradingView public scripts search: library source helper',
      featureTags: ['libraries', 'imports', 'udf', 'signals', 'source_identity'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-library-block-source-helper-checkpoint',
      title: 'Public Library Block Source Helper Checkpoint',
      searchContext: 'TradingView public scripts search: library source helper if wrapper',
      featureTags: ['libraries', 'imports', 'udf', 'signals', 'source_identity'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-library-block-switch-source-helper-checkpoint',
      title: 'Public Library Block Switch Source Helper Checkpoint',
      searchContext: 'TradingView public scripts search: library source helper switch wrapper',
      featureTags: ['libraries', 'imports', 'udf', 'signals', 'source_identity'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-library-arithmetic-source-helper-checkpoint',
      title: 'Public Library Arithmetic Source Helper Checkpoint',
      searchContext: 'TradingView public scripts search: library source helper arithmetic wrapper',
      featureTags: ['libraries', 'imports', 'udf', 'signals', 'source_identity'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-library-arithmetic-branch-source-helper-checkpoint',
      title: 'Public Library Arithmetic Branch Source Helper Checkpoint',
      searchContext: 'TradingView public scripts search: library source helper arithmetic branch wrapper',
      featureTags: ['libraries', 'imports', 'udf', 'signals', 'source_identity'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-library-arithmetic-block-if-source-helper-checkpoint',
      title: 'Public Library Arithmetic Block If Source Helper Checkpoint',
      searchContext: 'TradingView public scripts search: library source helper arithmetic if wrapper',
      featureTags: ['libraries', 'imports', 'udf', 'signals', 'source_identity'],
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
      id: 'public-strategy-trailing-stop-checkpoint',
      title: 'Public Strategy Trailing Stop Checkpoint',
      searchContext: 'TradingView public scripts search: strategy trailing stop',
      category: 'strategy',
      featureTags: ['strategy', 'broker', 'orders', 'trailing_stop'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-strategy-stats-checkpoint',
      title: 'Public Strategy Stats Checkpoint',
      searchContext: 'TradingView public scripts search: strategy performance table',
      category: 'strategy',
      featureTags: ['strategy', 'performance', 'tables'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-strategy-trade-list-checkpoint',
      title: 'Public Strategy Trade List Checkpoint',
      searchContext: 'TradingView public scripts search: strategy trade list',
      category: 'strategy',
      featureTags: ['strategy', 'performance', 'tables', 'trade_accessors'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-strategy-open-trade-checkpoint',
      title: 'Public Strategy Open Trade Checkpoint',
      searchContext: 'TradingView public scripts search: strategy open trade dashboard',
      category: 'strategy',
      featureTags: ['strategy', 'performance', 'tables', 'trade_accessors', 'open_trades'],
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
      id: 'public-log-signal-checkpoint',
      title: 'Public Log Signal Checkpoint',
      searchContext: 'TradingView public scripts search: log signal',
      featureTags: ['logs', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-runtime-error-guard-checkpoint',
      title: 'Public Runtime Error Guard Checkpoint',
      searchContext: 'TradingView public scripts search: runtime.error guard',
      featureTags: ['runtime', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-custom-candle-checkpoint',
      title: 'Public Custom Candle Checkpoint',
      searchContext: 'TradingView public scripts search: heikin ashi candles',
      featureTags: ['visuals', 'heikin_ashi', 'candles', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-custom-bar-checkpoint',
      title: 'Public Custom Bar Checkpoint',
      searchContext: 'TradingView public scripts search: custom bars',
      featureTags: ['visuals', 'custom_bars', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-plot-metadata-checkpoint',
      title: 'Public Plot Metadata Checkpoint',
      searchContext: 'TradingView public scripts search: projected levels',
      featureTags: ['visuals', 'plot_metadata', 'signals', 'output'],
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
