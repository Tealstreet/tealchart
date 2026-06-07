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
      id: 'public-legacy-v4-copy-paste-checkpoint',
      title: 'Public Legacy V4 Copy-Paste Checkpoint',
      searchContext: 'TradingView public scripts search: legacy v4 indicator study input iff',
      pineVersion: 'v4',
      featureTags: ['legacy', 'inputs', 'signals', 'ta', 'builtins', 'output'],
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
      id: 'public-supertrend-signal-checkpoint',
      title: 'Public Supertrend Signal Checkpoint',
      searchContext: 'TradingView public scripts search: supertrend signal',
      featureTags: ['ta', 'signals', 'supertrend', 'trend_filter', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-adx-dmi-trend-strength-checkpoint',
      title: 'Public ADX DMI Trend Strength Checkpoint',
      searchContext: 'TradingView public scripts search: adx dmi trend strength',
      featureTags: ['ta', 'signals', 'adx', 'dmi', 'trend_filter', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-parabolic-sar-reversal-checkpoint',
      title: 'Public Parabolic SAR Reversal Checkpoint',
      searchContext: 'TradingView public scripts search: parabolic sar reversal',
      featureTags: ['ta', 'signals', 'sar', 'trend_filter', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-linear-regression-channel-checkpoint',
      title: 'Public Linear Regression Channel Checkpoint',
      searchContext: 'TradingView public scripts search: linear regression channel',
      featureTags: ['ta', 'signals', 'linreg', 'channels', 'trend_filter', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-keltner-channel-signal-checkpoint',
      title: 'Public Keltner Channel Signal Checkpoint',
      searchContext: 'TradingView public scripts search: keltner channel signal',
      featureTags: ['ta', 'signals', 'kc', 'channels', 'volatility', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-donchian-channel-signal-checkpoint',
      title: 'Public Donchian Channel Signal Checkpoint',
      searchContext: 'TradingView public scripts search: donchian channel signal',
      featureTags: ['ta', 'signals', 'donchian', 'channels', 'highest', 'lowest', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-range-trend-filter-checkpoint',
      title: 'Public Range Trend Filter Checkpoint',
      searchContext: 'TradingView public scripts search: range breakout trend filter',
      featureTags: ['ta', 'signals', 'range', 'rising', 'falling', 'trend_filter', 'volatility', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-event-memory-signal-checkpoint',
      title: 'Public Event Memory Signal Checkpoint',
      searchContext: 'TradingView public scripts search: bars since signal valuewhen',
      featureTags: ['ta', 'signals', 'event_memory', 'barssince', 'valuewhen', 'crossover', 'state', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-moving-average-ribbon-checkpoint',
      title: 'Public Moving Average Ribbon Checkpoint',
      searchContext: 'TradingView public scripts search: moving average ribbon',
      featureTags: ['ta', 'signals', 'moving_average', 'vwma', 'wma', 'alma', 'hma', 'trend_filter', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-percentile-rank-signal-checkpoint',
      title: 'Public Percentile Rank Signal Checkpoint',
      searchContext: 'TradingView public scripts search: percentile rank signal',
      featureTags: ['ta', 'signals', 'percentile', 'percentrank', 'statistics', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-stochastic-signal-checkpoint',
      title: 'Public Stochastic Signal Checkpoint',
      searchContext: 'TradingView public scripts search: stochastic oscillator signal',
      featureTags: ['ta', 'signals', 'stoch', 'oscillator', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-mfi-signal-checkpoint',
      title: 'Public MFI Signal Checkpoint',
      searchContext: 'TradingView public scripts search: money flow index signal',
      featureTags: ['ta', 'signals', 'mfi', 'oscillator', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-cci-signal-checkpoint',
      title: 'Public CCI Signal Checkpoint',
      searchContext: 'TradingView public scripts search: commodity channel index signal',
      featureTags: ['ta', 'signals', 'cci', 'oscillator', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-cmo-signal-checkpoint',
      title: 'Public CMO Signal Checkpoint',
      searchContext: 'TradingView public scripts search: chande momentum oscillator signal',
      featureTags: ['ta', 'signals', 'cmo', 'oscillator', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-tsi-signal-checkpoint',
      title: 'Public TSI Signal Checkpoint',
      searchContext: 'TradingView public scripts search: true strength index signal',
      featureTags: ['ta', 'signals', 'tsi', 'oscillator', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-roc-signal-checkpoint',
      title: 'Public ROC Signal Checkpoint',
      searchContext: 'TradingView public scripts search: rate of change signal',
      featureTags: ['ta', 'signals', 'roc', 'momentum', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-momentum-signal-checkpoint',
      title: 'Public Momentum Signal Checkpoint',
      searchContext: 'TradingView public scripts search: momentum indicator signal',
      featureTags: ['ta', 'signals', 'mom', 'momentum', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-williams-r-signal-checkpoint',
      title: 'Public Williams %R Signal Checkpoint',
      searchContext: 'TradingView public scripts search: williams percent r signal',
      featureTags: ['ta', 'signals', 'wpr', 'oscillator', 'output'],
    }),
    stages: passedThroughOutput,
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
      id: 'public-anchored-vwap-band-checkpoint',
      title: 'Public Anchored VWAP Band Checkpoint',
      searchContext: 'TradingView public scripts search: anchored vwap bands',
      featureTags: ['visuals', 'signals', 'ta', 'bands', 'fills', 'vwap'],
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
      id: 'public-loop-header-layout-checkpoint',
      title: 'Public Loop Header Layout Checkpoint',
      searchContext: 'TradingView public scripts search: array loop signal',
      featureTags: ['layout', 'arrays', 'signals', 'udf'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-wrapped-call-layout-checkpoint',
      title: 'Public Wrapped Call Layout Checkpoint',
      searchContext: 'TradingView public scripts search: wrapped indicator call layout',
      featureTags: ['layout', 'udf', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
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
      id: 'public-barstate-dashboard-checkpoint',
      title: 'Public Barstate Dashboard Checkpoint',
      searchContext: 'TradingView public scripts search: barstate dashboard',
      featureTags: ['barstate', 'tables', 'dashboard', 'visuals', 'state', 'output'],
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
      id: 'public-strategy-metadata-checkpoint',
      title: 'Public Strategy Metadata Checkpoint',
      searchContext: 'TradingView public scripts search: strategy declaration metadata',
      category: 'strategy',
      featureTags: ['strategy', 'declaration_metadata', 'output'],
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
  {
    ledgerEntry: publicSearchEntry({
      id: 'public-obv-signal-checkpoint',
      title: 'Public OBV Signal Checkpoint',
      searchContext: 'TradingView public scripts search: on balance volume signal',
      featureTags: ['ta', 'signals', 'obv', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realworld-rsi-ob-os-signal-checkpoint',
      title: 'Real-World RSI OB/OS Signal Checkpoint',
      searchContext: 'TradingView public scripts search: rsi signal overbought oversold',
      featureTags: ['ta', 'signals', 'rsi', 'oscillator', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realworld-macd-crossover-signal-checkpoint',
      title: 'Real-World MACD Crossover Signal Checkpoint',
      searchContext: 'TradingView public scripts search: MACD signal crossover',
      featureTags: ['ta', 'signals', 'macd', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realworld-atr-position-sizing-checkpoint',
      title: 'Real-World ATR Position Sizing Checkpoint',
      searchContext: 'TradingView public scripts search: average true range signal',
      featureTags: ['ta', 'signals', 'atr', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realworld-pvt-signal-checkpoint',
      title: 'Real-World PVT Signal Checkpoint',
      searchContext: 'TradingView public scripts search: price volume trend signal',
      featureTags: ['ta', 'signals', 'pvt', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realworld-bb-kc-squeeze-checkpoint',
      title: 'Real-World BB KC Squeeze Checkpoint',
      searchContext: 'TradingView public scripts search: bollinger band keltner squeeze',
      featureTags: ['ta', 'signals', 'volatility', 'channels', 'kc', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realworld-ma-ribbon-checkpoint',
      title: 'Real-World MA Ribbon Checkpoint',
      searchContext: 'TradingView public scripts search: moving average ribbon ema',
      featureTags: ['ta', 'signals', 'moving_average', 'trend_filter', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realworld-barcolor-trend-checkpoint',
      title: 'Real-World Barcolor Trend Checkpoint',
      searchContext: 'TradingView public scripts search: bar color trend sma',
      featureTags: ['visuals', 'signals', 'trend_filter', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realworld-udf-smoothed-rsi-checkpoint',
      title: 'Real-World UDF Smoothed RSI Checkpoint',
      searchContext: 'TradingView public scripts search: smoothed rsi function',
      featureTags: ['ta', 'signals', 'udf', 'rsi', 'oscillator', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realworld-rsi-divergence-checkpoint',
      title: 'Real-World RSI Divergence Checkpoint',
      searchContext: 'TradingView public scripts search: rsi divergence scanner',
      featureTags: ['ta', 'signals', 'rsi', 'divergence', 'pivots', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realworld-volume-analysis-checkpoint',
      title: 'Real-World Volume Analysis Checkpoint',
      searchContext: 'TradingView public scripts search: obv volume trend analysis',
      featureTags: ['ta', 'signals', 'obv', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realworld-multi-indicator-dashboard-checkpoint',
      title: 'Real-World Multi-Indicator Dashboard Checkpoint',
      searchContext: 'TradingView public scripts search: multi indicator dashboard table',
      featureTags: ['ta', 'signals', 'tables', 'dashboard', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realworld-oscillator-combo-checkpoint',
      title: 'Real-World Oscillator Combo Checkpoint',
      searchContext: 'TradingView public scripts search: rsi stochastic oscillator combo',
      featureTags: ['ta', 'signals', 'rsi', 'stoch', 'oscillator', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realworld-ma-crossover-alert-checkpoint',
      title: 'Real-World MA Crossover Alert Checkpoint',
      searchContext: 'TradingView public scripts search: ma crossover alert signal',
      featureTags: ['ta', 'signals', 'alerts', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realworld-vwap-dev-bands-checkpoint',
      title: 'Real-World VWAP Dev Bands Checkpoint',
      searchContext: 'TradingView public scripts search: vwap standard deviation bands',
      featureTags: ['ta', 'signals', 'vwap', 'var', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realworld-pivot-support-resistance-checkpoint',
      title: 'Real-World Pivot Support Resistance Checkpoint',
      searchContext: 'TradingView public scripts search: support resistance pivot levels',
      featureTags: ['ta', 'signals', 'drawings', 'lines', 'pivots', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realworld-adv-strategy-stats-checkpoint',
      title: 'Real-World Advanced Strategy Stats Checkpoint',
      searchContext: 'TradingView public scripts search: strategy performance stats table',
      category: 'strategy',
      featureTags: ['strategy', 'performance', 'tables', 'dashboard', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realworld-adv-udt-methods-checkpoint',
      title: 'Real-World Advanced UDT Methods Checkpoint',
      searchContext: 'TradingView public scripts search: user defined type method array',
      featureTags: ['udt', 'methods', 'arrays', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realworld-adv-udf-defaults-checkpoint',
      title: 'Real-World Advanced UDF Defaults Checkpoint',
      searchContext: 'TradingView public scripts search: normalize function default parameters',
      featureTags: ['udf', 'signals', 'ta', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realworld-adv-drawing-lifecycle-checkpoint',
      title: 'Real-World Advanced Drawing Lifecycle Checkpoint',
      searchContext: 'TradingView public scripts search: label array delete oldest',
      featureTags: ['drawings', 'labels', 'arrays', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realworld-adv-switch-enum-checkpoint',
      title: 'Real-World Advanced Switch Enum Checkpoint',
      searchContext: 'TradingView public scripts search: enum state machine switch',
      featureTags: ['signals', 'state', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realworld-adv-matrix-operations-checkpoint',
      title: 'Real-World Advanced Matrix Operations Checkpoint',
      searchContext: 'TradingView public scripts search: matrix score indicator',
      featureTags: ['matrix', 'ta', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realworld-adv-map-state-checkpoint',
      title: 'Real-World Advanced Map State Checkpoint',
      searchContext: 'TradingView public scripts search: map state tracking accumulate',
      featureTags: ['map', 'state', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realworld-adv-conditional-plotting-checkpoint',
      title: 'Real-World Advanced Conditional Plotting Checkpoint',
      searchContext: 'TradingView public scripts search: dynamic color fill plotshape indicator',
      featureTags: ['visuals', 'signals', 'ta', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realworld-adv-forin-array-checkpoint',
      title: 'Real-World Advanced For-In Array Checkpoint',
      searchContext: 'TradingView public scripts search: rolling window average median array',
      featureTags: ['arrays', 'signals', 'state', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realworld-adv-strformat-dashboard-checkpoint',
      title: 'Real-World Advanced Str.Format Dashboard Checkpoint',
      searchContext: 'TradingView public scripts search: str.format dashboard rsi atr',
      featureTags: ['tables', 'dashboard', 'ta', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'edge-nested-calls-checkpoint',
      title: 'Edge Nested Calls Checkpoint',
      searchContext: 'TradingView public scripts search: nested indicator function call',
      featureTags: ['parser', 'edge_case', 'nested_calls', 'ta', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'edge-ternary-arg-checkpoint',
      title: 'Edge Ternary Arg Checkpoint',
      searchContext: 'TradingView public scripts search: ternary argument source selection',
      featureTags: ['parser', 'edge_case', 'ternary', 'ta', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'edge-empty-udf-body-checkpoint',
      title: 'Edge Empty UDF Body Checkpoint',
      searchContext: 'TradingView public scripts search: function returns na guard',
      featureTags: ['parser', 'edge_case', 'udf', 'na', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'edge-tuple-return-checkpoint',
      title: 'Edge Tuple Return Checkpoint',
      searchContext: 'TradingView public scripts search: function returns tuple three values',
      featureTags: ['parser', 'edge_case', 'udf', 'tuple', 'ta', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'edge-na-propagation-checkpoint',
      title: 'Edge NA Propagation Checkpoint',
      searchContext: 'TradingView public scripts search: sma na warmup period null',
      featureTags: ['runtime', 'edge_case', 'na', 'ta', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'edge-cumsum-accumulation-checkpoint',
      title: 'Edge Cumsum Accumulation Checkpoint',
      searchContext: 'TradingView public scripts search: cumulative sum var accumulate',
      featureTags: ['runtime', 'edge_case', 'var', 'state', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'edge-valuewhen-crossover-checkpoint',
      title: 'Edge ValueWhen Crossover Checkpoint',
      searchContext: 'TradingView public scripts search: valuewhen sma crossover condition',
      featureTags: ['runtime', 'edge_case', 'ta', 'valuewhen', 'crossover', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'edge-plotshape-dynamic-text-checkpoint',
      title: 'Edge Plotshape Dynamic Text Checkpoint',
      searchContext: 'TradingView public scripts search: plotshape dynamic text tostring',
      featureTags: ['runtime', 'edge_case', 'visuals', 'plotshape', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'edge-color-rgb-clamp-checkpoint',
      title: 'Edge Color RGB Clamp Checkpoint',
      searchContext: 'TradingView public scripts search: color.rgb transparency clamping',
      featureTags: ['runtime', 'edge_case', 'visuals', 'color', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'edge-input-source-udf-checkpoint',
      title: 'Edge Input Source UDF Checkpoint',
      searchContext: 'TradingView public scripts search: input.source user function argument',
      featureTags: ['runtime', 'edge_case', 'inputs', 'udf', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'edge-multi-exit-checkpoint',
      title: 'Edge Multi-Exit Checkpoint',
      searchContext: 'TradingView public scripts search: strategy exit profit loss trail',
      category: 'strategy',
      featureTags: ['runtime', 'edge_case', 'strategy', 'broker', 'orders', 'trailing_stop', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'edge-array-copy-sort-checkpoint',
      title: 'Edge Array Copy Sort Checkpoint',
      searchContext: 'TradingView public scripts search: array copy sort min value',
      featureTags: ['runtime', 'edge_case', 'arrays', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'v5-study-checkpoint',
      title: 'V5 Study Checkpoint',
      searchContext: 'TradingView public scripts search: study overlay v5',
      pineVersion: 'v5',
      featureTags: ['legacy', 'v5_compat', 'ta', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'v5-generic-input-checkpoint',
      title: 'V5 Generic Input Checkpoint',
      searchContext: 'TradingView public scripts search: input length v5 generic',
      pineVersion: 'v5',
      featureTags: ['legacy', 'v5_compat', 'inputs', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'v5-hex-color-checkpoint',
      title: 'V5 Hex Color Checkpoint',
      searchContext: 'TradingView public scripts search: hex color literal v5',
      pineVersion: 'v5',
      featureTags: ['legacy', 'v5_compat', 'visuals', 'color', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'v5-sma-global-checkpoint',
      title: 'V5 SMA Global Checkpoint',
      searchContext: 'TradingView public scripts search: sma global v5 no namespace',
      pineVersion: 'v5',
      featureTags: ['legacy', 'v5_compat', 'ta', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'v5-ema-global-checkpoint',
      title: 'V5 EMA Global Checkpoint',
      searchContext: 'TradingView public scripts search: ema global v5 no namespace',
      pineVersion: 'v5',
      featureTags: ['legacy', 'v5_compat', 'ta', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'v5-rsi-global-checkpoint',
      title: 'V5 RSI Global Checkpoint',
      searchContext: 'TradingView public scripts search: rsi global v5 no namespace',
      pineVersion: 'v5',
      featureTags: ['legacy', 'v5_compat', 'ta', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'v5-mixed-checkpoint',
      title: 'V5 Mixed Indicator Checkpoint',
      searchContext: 'TradingView public scripts search: study sma ema input v5',
      pineVersion: 'v5',
      featureTags: ['legacy', 'v5_compat', 'inputs', 'ta', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'parser-long-line-checkpoint',
      title: 'Parser Long Line Checkpoint',
      searchContext: 'TradingView public scripts search: long formula single line',
      featureTags: ['parser', 'layout', 'edge_case', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'parser-nested-ternary-checkpoint',
      title: 'Parser Nested Ternary Checkpoint',
      searchContext: 'TradingView public scripts search: nested ternary expression',
      featureTags: ['parser', 'layout', 'ternary', 'edge_case', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'parser-continued-lines-checkpoint',
      title: 'Parser Continued Lines Checkpoint',
      searchContext: 'TradingView public scripts search: multi line expression continuation',
      featureTags: ['parser', 'layout', 'edge_case', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'parser-comment-continuation-checkpoint',
      title: 'Parser Comment Continuation Checkpoint',
      searchContext: 'TradingView public scripts search: comment in continuation',
      featureTags: ['parser', 'layout', 'edge_case', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'parser-empty-lines-checkpoint',
      title: 'Parser Empty Lines Checkpoint',
      searchContext: 'TradingView public scripts search: empty lines if block',
      featureTags: ['parser', 'layout', 'edge_case', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'parser-inline-comments-checkpoint',
      title: 'Parser Inline Comments Checkpoint',
      searchContext: 'TradingView public scripts search: inline comment every line',
      featureTags: ['parser', 'layout', 'ta', 'edge_case', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'parser-long-switch-checkpoint',
      title: 'Parser Long Switch Checkpoint',
      searchContext: 'TradingView public scripts search: switch many cases expression',
      featureTags: ['parser', 'layout', 'edge_case', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'deep-v4-integer-input-checkpoint',
      title: 'Deep V4 Integer Input Checkpoint',
      searchContext: 'TradingView public scripts search: v4 study input integer type',
      pineVersion: 'v4',
      featureTags: ['legacy', 'v4_compat', 'inputs', 'ta', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'deep-for-map-kv-checkpoint',
      title: 'Deep For Map Key-Value Checkpoint',
      searchContext: 'TradingView public scripts search: for map key value iterate',
      featureTags: ['map', 'state', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'deep-generic-array-checkpoint',
      title: 'Deep Generic Array Checkpoint',
      searchContext: 'TradingView public scripts search: array.new generic float type',
      featureTags: ['arrays', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'deep-switch-string-checkpoint',
      title: 'Deep Switch String Checkpoint',
      searchContext: 'TradingView public scripts search: switch string mode signal',
      featureTags: ['signals', 'state', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'deep-string-concat-checkpoint',
      title: 'Deep String Concat Checkpoint',
      searchContext: 'TradingView public scripts search: multiline string concatenation label',
      featureTags: ['signals', 'parser', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'deep-request-security-tuple-checkpoint',
      title: 'Deep Request Security Tuple Checkpoint',
      searchContext: 'TradingView public scripts search: request.security ohlc tuple destructure',
      featureTags: ['request', 'tuple', 'intrabar', 'unsupported'],
    }),
    stages: [
      { stage: 'parse', status: 'passed' },
      { stage: 'semantic', status: 'passed' },
      {
        stage: 'runtime',
        status: 'failed',
        failureClass: 'unsupported_planned',
        message: 'request.security tuple expression: runtime cannot forward [open,high,low,close] array through the HTF merge — expression evaluates in chart context, not HTF context',
        diagnostics: [{
          code: 'unsupported-feature',
          message: 'request.security with tuple expression argument cannot be destructured at runtime',
          line: 2,
          column: 1,
        }],
      },
    ],
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'deep-plotcandle-colors-checkpoint',
      title: 'Deep Plotcandle Conditional Colors Checkpoint',
      searchContext: 'TradingView public scripts search: plotcandle bull bear color',
      featureTags: ['visuals', 'candles', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'deep-bb-fill-checkpoint',
      title: 'Deep BB Fill Checkpoint',
      searchContext: 'TradingView public scripts search: bollinger bands fill standard',
      featureTags: ['ta', 'signals', 'bands', 'fills', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'deep-strategy-oca-exit-checkpoint',
      title: 'Deep Strategy OCA Exit Checkpoint',
      searchContext: 'TradingView public scripts search: strategy exit take profit stop loss',
      category: 'strategy',
      featureTags: ['strategy', 'broker', 'orders', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'deep-type-cast-chain-checkpoint',
      title: 'Deep Type Cast Chain Checkpoint',
      searchContext: 'TradingView public scripts search: type casting int float math.round',
      featureTags: ['runtime', 'edge_case', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'deep-nested-udf-state-checkpoint',
      title: 'Deep Nested UDF State Checkpoint',
      searchContext: 'TradingView public scripts search: nested function var accumulate state',
      featureTags: ['udf', 'state', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'deep-label-delete-lifecycle-checkpoint',
      title: 'Deep Label Delete Lifecycle Checkpoint',
      searchContext: 'TradingView public scripts search: label delete previous bar lifecycle',
      featureTags: ['drawings', 'labels', 'state', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-exec-model-barstate-checkpoint',
      title: 'Official Exec Model Barstate Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/concepts/execution-model/',
      featureTags: ['barstate', 'runtime', 'signals', 'output'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-type-cast-checkpoint',
      title: 'Official Type Cast Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/language/type-system/',
      featureTags: ['runtime', 'signals', 'output'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-array-stats-checkpoint',
      title: 'Official Array Stats Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/language/arrays/',
      featureTags: ['arrays', 'signals', 'output'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-array-slice-checkpoint',
      title: 'Official Array Slice Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/language/arrays/',
      featureTags: ['arrays', 'state', 'signals', 'output'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-map-checkpoint',
      title: 'Official Map Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/language/maps/',
      featureTags: ['map', 'state', 'signals', 'output'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-udt-checkpoint',
      title: 'Official UDT Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/language/objects/',
      featureTags: ['udt', 'objects', 'signals', 'output'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-method-dispatch-checkpoint',
      title: 'Official Method Dispatch Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/language/methods/',
      featureTags: ['udt', 'objects', 'methods', 'signals', 'output'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-inputs-all-types-checkpoint',
      title: 'Official Inputs All Types Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/concepts/inputs/',
      featureTags: ['inputs', 'signals', 'output'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-plots-hline-fill-checkpoint',
      title: 'Official Plots Hline Fill Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/concepts/plots/',
      featureTags: ['visuals', 'plot', 'fills', 'output'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-bgcolor-trend-checkpoint',
      title: 'Official Bgcolor Trend Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/concepts/backgrounds/',
      featureTags: ['visuals', 'signals', 'ta', 'output'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-strategy-entry-close-checkpoint',
      title: 'Official Strategy Entry Close Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/concepts/strategies/',
      category: 'strategy',
      featureTags: ['strategy', 'broker', 'orders', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-plotshape-plotchar-checkpoint',
      title: 'Official Plotshape Plotchar Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/concepts/text-and-shapes/',
      featureTags: ['visuals', 'plotshape', 'plotchar', 'signals', 'output'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-repainting-guard-checkpoint',
      title: 'Official Repainting Guard Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/concepts/repainting/',
      featureTags: ['barstate', 'runtime', 'signals', 'state', 'output'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'official-conditionals-checkpoint',
      title: 'Official Conditionals Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/language/conditional-structures/',
      featureTags: ['runtime', 'signals', 'state', 'output'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'integration-trend-system-checkpoint',
      title: 'Integration Trend System Checkpoint',
      searchContext: 'TradingView public scripts search: ema crossover trend win rate table',
      featureTags: ['integration', 'ta', 'signals', 'barcolor', 'tables', 'state', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'integration-volatility-dashboard-checkpoint',
      title: 'Integration Volatility Dashboard Checkpoint',
      searchContext: 'TradingView public scripts search: atr bollinger keltner squeeze dashboard',
      featureTags: ['integration', 'ta', 'signals', 'arrays', 'volatility', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'integration-ma-strategy-checkpoint',
      title: 'Integration MA Strategy Checkpoint',
      searchContext: 'TradingView public scripts search: strategy ma crossover equity bgcolor',
      category: 'strategy',
      featureTags: ['integration', 'strategy', 'ta', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'integration-price-action-scanner-checkpoint',
      title: 'Integration Price Action Scanner Checkpoint',
      searchContext: 'TradingView public scripts search: udt candle pattern method array',
      featureTags: ['integration', 'udt', 'methods', 'arrays', 'signals', 'visuals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'integration-risk-management-checkpoint',
      title: 'Integration Risk Management Checkpoint',
      searchContext: 'TradingView public scripts search: risk management atr entry rr ratio',
      featureTags: ['integration', 'ta', 'signals', 'state', 'var', 'inputs', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'integration-custom-oscillator-checkpoint',
      title: 'Integration Custom Oscillator Checkpoint',
      searchContext: 'TradingView public scripts search: custom oscillator udf fill alert',
      featureTags: ['integration', 'udf', 'ta', 'signals', 'fills', 'alerts', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'integration-ema-state-table-checkpoint',
      title: 'Integration EMA State Table Checkpoint',
      searchContext: 'TradingView public scripts search: ema crossover barcolor state table',
      featureTags: ['integration', 'ta', 'signals', 'barcolor', 'state', 'tables', 'visuals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'integration-equity-tracker-checkpoint',
      title: 'Integration Equity Tracker Checkpoint',
      searchContext: 'TradingView public scripts search: strategy equity performance stats table',
      category: 'strategy',
      featureTags: ['integration', 'strategy', 'performance', 'tables', 'dashboard', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'integration-divergence-detector-checkpoint',
      title: 'Integration Divergence Detector Checkpoint',
      searchContext: 'TradingView public scripts search: rsi divergence highest lowest plotshape',
      featureTags: ['integration', 'ta', 'signals', 'rsi', 'divergence', 'visuals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'integration-oscillator-gradient-checkpoint',
      title: 'Integration Oscillator Gradient Checkpoint',
      searchContext: 'TradingView public scripts search: custom oscillator gradient fill zero line',
      featureTags: ['integration', 'udf', 'ta', 'signals', 'fills', 'alerts', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'integration-ichimoku-checkpoint',
      title: 'Integration Ichimoku Checkpoint',
      searchContext: 'TradingView public scripts search: ichimoku cloud fill crossover plotshape',
      featureTags: ['integration', 'ta', 'signals', 'fills', 'visuals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'legacy-v4-study-resolution-checkpoint',
      title: 'Legacy V4 Study Resolution Checkpoint',
      searchContext: 'TradingView public scripts search: v4 study resolution parameter',
      pineVersion: 'v4',
      featureTags: ['legacy', 'v4_compat', 'ta', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'legacy-v4-input-type-integer-bool-checkpoint',
      title: 'Legacy V4 Input Type Integer Bool Checkpoint',
      searchContext: 'TradingView public scripts search: v4 input type integer bool',
      pineVersion: 'v4',
      featureTags: ['legacy', 'v4_compat', 'inputs', 'ta', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'legacy-plotshape-default-location-checkpoint',
      title: 'Legacy Plotshape Default Location Checkpoint',
      searchContext: 'TradingView public scripts search: plotshape default location omitted',
      featureTags: ['legacy', 'visuals', 'plotshape', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'legacy-strategy-position-size-zero-checkpoint',
      title: 'Legacy Strategy Position Size Zero Checkpoint',
      searchContext: 'TradingView public scripts search: strategy position_size equals zero check',
      category: 'strategy',
      featureTags: ['legacy', 'strategy', 'broker', 'orders', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'legacy-array-new-float-checkpoint',
      title: 'Legacy array.new_float() Checkpoint',
      searchContext: 'TradingView public scripts search: array.new_float v5 no generic',
      pineVersion: 'v5',
      featureTags: ['legacy', 'v5_compat', 'arrays', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'legacy-str-tostring-format-checkpoint',
      title: 'Legacy str.tostring Format Checkpoint',
      searchContext: 'TradingView public scripts search: str.tostring number format decimal',
      featureTags: ['legacy', 'drawings', 'labels', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'legacy-timeframe-period-checkpoint',
      title: 'Legacy timeframe.period Checkpoint',
      searchContext: 'TradingView public scripts search: timeframe.period comparison string',
      featureTags: ['legacy', 'timeframes', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'legacy-ta-change-two-arg-checkpoint',
      title: 'Legacy ta.change Two-Arg Checkpoint',
      searchContext: 'TradingView public scripts search: ta.change two argument length',
      pineVersion: 'v5',
      featureTags: ['legacy', 'v5_compat', 'ta', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'legacy-nz-two-arg-checkpoint',
      title: 'Legacy nz() Two-Arg Checkpoint',
      searchContext: 'TradingView public scripts search: nz two argument replacement',
      featureTags: ['legacy', 'na', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'legacy-math-max-variadic-checkpoint',
      title: 'Legacy math.max Variadic Checkpoint',
      searchContext: 'TradingView public scripts search: math.max variadic multiple args',
      pineVersion: 'v5',
      featureTags: ['legacy', 'v5_compat', 'ta', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'libfin-library-export-checkpoint',
      title: 'Library Export Declaration Checkpoint',
      searchContext: 'TradingView public scripts search: library export functions',
      featureTags: ['libraries', 'imports', 'udf', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'libfin-enum-switch-barcolor-checkpoint',
      title: 'Enum Switch Barcolor Checkpoint',
      searchContext: 'TradingView public scripts search: enum switch barcolor plotshape',
      featureTags: ['signals', 'state', 'visuals', 'barcolor', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'libfin-request-financial-checkpoint',
      title: 'Request Financial Empty Datafeed Checkpoint',
      searchContext: 'TradingView public scripts search: request.financial fundamental',
      featureTags: ['request', 'financial', 'na', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'libfin-request-dividends-earnings-checkpoint',
      title: 'Request Dividends Earnings Empty Datafeed Checkpoint',
      searchContext: 'TradingView public scripts search: request.dividends request.earnings event',
      featureTags: ['request', 'dividends', 'earnings', 'na', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'libfin-strategy-pyramiding-checkpoint',
      title: 'Strategy Pyramiding Checkpoint',
      searchContext: 'TradingView public scripts search: strategy pyramiding scale in',
      category: 'strategy',
      featureTags: ['strategy', 'broker', 'orders', 'pyramiding', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'libfin-strategy-commission-checkpoint',
      title: 'Strategy Commission Percent Checkpoint',
      searchContext: 'TradingView public scripts search: strategy commission percent cost',
      category: 'strategy',
      featureTags: ['strategy', 'broker', 'orders', 'commission', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'libfin-ta-vwap-anchor-checkpoint',
      title: 'TA VWAP Anchor Reset Checkpoint',
      searchContext: 'TradingView public scripts search: ta.vwap anchor reset session',
      featureTags: ['ta', 'signals', 'vwap', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'libfin-str-format-time-timezone-checkpoint',
      title: 'Str Format Time Timezone Checkpoint',
      searchContext: 'TradingView public scripts search: str.format_time timezone display',
      featureTags: ['signals', 'time', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'libfin-conditional-na-inference-checkpoint',
      title: 'Conditional NA Inference Checkpoint',
      searchContext: 'TradingView public scripts search: conditional na ternary sparse series',
      featureTags: ['runtime', 'na', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'libfin-runtime-error-guard-checkpoint',
      title: 'Runtime Error Guard Checkpoint',
      searchContext: 'TradingView public scripts search: runtime.error invariant guard',
      featureTags: ['runtime', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'adv-label-array-cap-checkpoint',
      title: 'Adv Label Array Cap Checkpoint',
      searchContext: 'TradingView public scripts search: label array oldest delete cap',
      featureTags: ['drawings', 'labels', 'arrays', 'state', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'adv-table-merged-header-checkpoint',
      title: 'Adv Table Merged Header Checkpoint',
      searchContext: 'TradingView public scripts search: table merge cells header row',
      featureTags: ['tables', 'dashboard', 'drawings', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'adv-line-extend-dashed-checkpoint',
      title: 'Adv Line Extend Dashed Checkpoint',
      searchContext: 'TradingView public scripts search: trend line extend right dashed color',
      featureTags: ['drawings', 'lines', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'adv-box-with-text-checkpoint',
      title: 'Adv Box With Text Checkpoint',
      searchContext: 'TradingView public scripts search: box with text border zone',
      featureTags: ['drawings', 'boxes', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'adv-polyline-price-action-checkpoint',
      title: 'Adv Polyline Price Action Checkpoint',
      searchContext: 'TradingView public scripts search: polyline chart point price action',
      featureTags: ['drawings', 'polylines', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'adv-label-dynamic-tooltip-checkpoint',
      title: 'Adv Label Dynamic Tooltip Checkpoint',
      searchContext: 'TradingView public scripts search: label tooltip str format signal',
      featureTags: ['drawings', 'labels', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'adv-hline-fill-checkpoint',
      title: 'Adv Hline Fill Checkpoint',
      searchContext: 'TradingView public scripts search: hline fill overbought oversold zone',
      featureTags: ['visuals', 'fills', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'adv-plotbar-ohlc-checkpoint',
      title: 'Adv Plotbar OHLC Checkpoint',
      searchContext: 'TradingView public scripts search: plotbar ohlc custom candle color',
      featureTags: ['visuals', 'candles', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'adv-table-gradient-color-checkpoint',
      title: 'Adv Table Gradient Color Checkpoint',
      searchContext: 'TradingView public scripts search: table color gradient heatmap',
      featureTags: ['tables', 'dashboard', 'drawings', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'adv-drawing-cleanup-checkpoint',
      title: 'Adv Drawing Cleanup Checkpoint',
      searchContext: 'TradingView public scripts search: line delete recreate per bar',
      featureTags: ['drawings', 'lines', 'state', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'ctrl-series-history-udf-checkpoint',
      title: 'Ctrl Series History UDF Checkpoint',
      searchContext: 'TradingView public scripts search: udf series history close lag',
      featureTags: ['runtime', 'udf', 'history', 'series', 'scope', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'ctrl-var-in-for-expr-checkpoint',
      title: 'Ctrl Var In For Expr Checkpoint',
      searchContext: 'TradingView public scripts search: var for loop accumulate state',
      featureTags: ['runtime', 'var', 'scope', 'control_flow', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'ctrl-udf-var-isolation-checkpoint',
      title: 'Ctrl UDF Var Isolation Checkpoint',
      searchContext: 'TradingView public scripts search: udf call site var isolation',
      featureTags: ['runtime', 'udf', 'var', 'scope', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'ctrl-switch-expr-checkpoint',
      title: 'Ctrl Switch Expr Checkpoint',
      searchContext: 'TradingView public scripts search: switch expression assign variable',
      featureTags: ['runtime', 'control_flow', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'ctrl-nested-udf-state-checkpoint',
      title: 'Ctrl Nested UDF State Checkpoint',
      searchContext: 'TradingView public scripts search: nested function var state series',
      featureTags: ['runtime', 'udf', 'var', 'scope', 'series', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'ctrl-for-expr-return-checkpoint',
      title: 'Ctrl For Expr Return Checkpoint',
      searchContext: 'TradingView public scripts search: for loop expression return value',
      featureTags: ['runtime', 'control_flow', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'ctrl-if-block-multi-stmt-checkpoint',
      title: 'Ctrl If Block Multi Stmt Checkpoint',
      searchContext: 'TradingView public scripts search: if block multi statement return',
      featureTags: ['runtime', 'control_flow', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'ctrl-for-break-expr-checkpoint',
      title: 'Ctrl For Break Expr Checkpoint',
      searchContext: 'TradingView public scripts search: for break expression return last',
      featureTags: ['runtime', 'control_flow', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'ctrl-while-expr-checkpoint',
      title: 'Ctrl While Expr Checkpoint',
      searchContext: 'TradingView public scripts search: while loop expression accumulate sum',
      featureTags: ['runtime', 'udf', 'control_flow', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'ctrl-chained-ternary-na-checkpoint',
      title: 'Ctrl Chained Ternary Na Checkpoint',
      searchContext: 'TradingView public scripts search: chained ternary na propagation',
      featureTags: ['runtime', 'na', 'ternary', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'string-time-na-strformat-multi-checkpoint',
      title: 'Str Format Multi Placeholder Checkpoint',
      searchContext: 'TradingView public scripts search: str.format price pct change label',
      featureTags: ['strings', 'str_format', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'string-time-na-strsplit-iteration-checkpoint',
      title: 'Str Split Iteration Checkpoint',
      searchContext: 'TradingView public scripts search: str.split iterate array values',
      featureTags: ['strings', 'str_split', 'arrays', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'string-time-na-strmatch-regex-checkpoint',
      title: 'Str Match Regex Checkpoint',
      searchContext: 'TradingView public scripts search: str.match ticker symbol regex',
      featureTags: ['strings', 'str_match', 'syminfo', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'string-time-na-calendar-gate-checkpoint',
      title: 'Calendar Gate Checkpoint',
      searchContext: 'TradingView public scripts search: dayofweek session hour filter signal',
      featureTags: ['time', 'calendar', 'dayofweek', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'string-time-na-timestamp-filter-checkpoint',
      title: 'Timestamp Filter Checkpoint',
      searchContext: 'TradingView public scripts search: timestamp date range filter indicator',
      featureTags: ['time', 'timestamp', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'string-time-na-na-arith-propagation-checkpoint',
      title: 'NA Arithmetic Propagation Checkpoint',
      searchContext: 'TradingView public scripts search: na propagation arithmetic chain',
      featureTags: ['runtime', 'na', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'string-time-na-nz-replacement-checkpoint',
      title: 'NZ Replacement Checkpoint',
      searchContext: 'TradingView public scripts search: nz na replacement default value',
      featureTags: ['runtime', 'na', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'string-time-na-fixnan-forwardfill-checkpoint',
      title: 'Fixnan Forward Fill Checkpoint',
      searchContext: 'TradingView public scripts search: fixnan forward fill series',
      featureTags: ['runtime', 'na', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'string-time-na-barssince-never-true-checkpoint',
      title: 'Barssince Never True Checkpoint',
      searchContext: 'TradingView public scripts search: ta.barssince never true na edge',
      featureTags: ['runtime', 'na', 'ta', 'barssince', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'string-time-na-color-new-hex-checkpoint',
      title: 'Color New Hex Checkpoint',
      searchContext: 'TradingView public scripts search: color.new hex literal transparency',
      featureTags: ['runtime', 'visuals', 'color', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'coll-matrix-avg-col-checkpoint',
      title: 'Adv Matrix Avg Col Checkpoint',
      searchContext: 'TradingView public scripts search: matrix column average indicator',
      featureTags: ['matrix', 'arrays', 'collections', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'coll-matrix-transpose-checkpoint',
      title: 'Adv Matrix Transpose Checkpoint',
      searchContext: 'TradingView public scripts search: matrix transpose indicator',
      featureTags: ['matrix', 'collections', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'coll-array-stats-pipeline-checkpoint',
      title: 'Adv Array Stats Pipeline Checkpoint',
      searchContext: 'TradingView public scripts search: array stdev percentrank pipeline',
      featureTags: ['arrays', 'collections', 'statistics', 'percentrank', 'percentile', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'coll-array-binary-search-checkpoint',
      title: 'Adv Array Binary Search Checkpoint',
      searchContext: 'TradingView public scripts search: array binary search sorted prices',
      featureTags: ['arrays', 'collections', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'coll-map-category-aggregation-checkpoint',
      title: 'Adv Map Category Aggregation Checkpoint',
      searchContext: 'TradingView public scripts search: map category aggregation scanner',
      featureTags: ['map', 'collections', 'state', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'coll-array-every-some-checkpoint',
      title: 'Adv Array Every Some Checkpoint',
      searchContext: 'TradingView public scripts search: array every some condition filter',
      featureTags: ['arrays', 'collections', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'coll-matrix-identity-check-checkpoint',
      title: 'Adv Matrix Identity Check Checkpoint',
      searchContext: 'TradingView public scripts search: matrix identity symmetric check',
      featureTags: ['matrix', 'collections', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'coll-size-tracking-checkpoint',
      title: 'Adv Collection Size Tracking Checkpoint',
      searchContext: 'TradingView public scripts search: array size cap rolling window',
      featureTags: ['arrays', 'collections', 'state', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'coll-array-standardize-checkpoint',
      title: 'Adv Array Standardize Checkpoint',
      searchContext: 'TradingView public scripts search: array standardize zscore normalize',
      featureTags: ['arrays', 'collections', 'statistics', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'coll-map-key-delete-checkpoint',
      title: 'Adv Map Key Delete Checkpoint',
      searchContext: 'TradingView public scripts search: map keys iterate remove entries',
      featureTags: ['map', 'collections', 'state', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'input-int-range-checkpoint',
      title: 'Input Int Range Checkpoint',
      searchContext: 'TradingView public scripts search: input.int minval maxval step',
      featureTags: ['inputs', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'input-string-options-checkpoint',
      title: 'Input String Options Checkpoint',
      searchContext: 'TradingView public scripts search: input.string options list MA type',
      featureTags: ['inputs', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'indicator-overlay-precision-format-checkpoint',
      title: 'Indicator Meta Checkpoint',
      searchContext: 'TradingView public scripts search: indicator overlay precision format price',
      featureTags: ['declaration_metadata', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'strategy-full-declaration-checkpoint',
      title: 'Strategy Full Declaration Checkpoint',
      searchContext: 'TradingView public scripts search: strategy initial_capital currency default_qty_type',
      category: 'strategy',
      featureTags: ['strategy', 'declaration_metadata', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'runtime-error-specific-bar-checkpoint',
      title: 'Runtime Error Specific Bar Checkpoint',
      searchContext: 'TradingView public scripts search: runtime.error guard negative value',
      featureTags: ['runtime', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'input-multi-type-checkpoint',
      title: 'Multi Input Checkpoint',
      searchContext: 'TradingView public scripts search: indicator all input types combined',
      featureTags: ['inputs', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'input-time-default-checkpoint',
      title: 'Input Time Checkpoint',
      searchContext: 'TradingView public scripts search: input.time start date filter',
      featureTags: ['inputs', 'time', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'indicator-max-bars-back-checkpoint',
      title: 'Indicator Max Bars Back Checkpoint',
      searchContext: 'TradingView public scripts search: indicator max_bars_back history access',
      featureTags: ['declaration_metadata', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'input-driven-ta-rsi-checkpoint',
      title: 'Input Driven RSI Checkpoint',
      searchContext: 'TradingView public scripts search: rsi input.int length parameter',
      featureTags: ['inputs', 'ta', 'rsi', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'indicator-shorttitle-overlay-checkpoint',
      title: 'Indicator Shorttitle Overlay Checkpoint',
      searchContext: 'TradingView public scripts search: indicator shorttitle overlay legend',
      featureTags: ['declaration_metadata', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'ops-float-division-checkpoint',
      title: 'Ops Float Division Checkpoint',
      searchContext: 'TradingView public scripts search: pine script division float result',
      featureTags: ['operators', 'arithmetic', 'runtime', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'ops-modulo-checkpoint',
      title: 'Ops Modulo Checkpoint',
      searchContext: 'TradingView public scripts search: pine script modulo operator negative float',
      featureTags: ['operators', 'arithmetic', 'runtime', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'ops-string-comparison-checkpoint',
      title: 'Ops String Comparison Checkpoint',
      searchContext: 'TradingView public scripts search: pine script string equality lexicographic',
      featureTags: ['operators', 'strings', 'runtime', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'ops-boolean-arithmetic-checkpoint',
      title: 'Ops Boolean Arithmetic Checkpoint',
      searchContext: 'TradingView public scripts search: pine script boolean coerce numeric arithmetic',
      featureTags: ['operators', 'arithmetic', 'runtime', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'ops-comparison-chaining-checkpoint',
      title: 'Ops Comparison Chaining Checkpoint',
      searchContext: 'TradingView public scripts search: pine script and comparison chaining range check',
      featureTags: ['operators', 'signals', 'runtime', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'ops-precedence-checkpoint',
      title: 'Ops Precedence Checkpoint',
      searchContext: 'TradingView public scripts search: pine script operator precedence multiply add unary',
      featureTags: ['operators', 'arithmetic', 'runtime', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'ops-compound-assignment-checkpoint',
      title: 'Ops Compound Assignment Checkpoint',
      searchContext: 'TradingView public scripts search: pine script compound assignment plus equals accumulate',
      featureTags: ['operators', 'state', 'var', 'runtime', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'ops-unary-minus-series-checkpoint',
      title: 'Ops Unary Minus Series Checkpoint',
      searchContext: 'TradingView public scripts search: pine script unary minus negate series',
      featureTags: ['operators', 'arithmetic', 'series', 'runtime', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'ops-not-operator-checkpoint',
      title: 'Ops Not Operator Checkpoint',
      searchContext: 'TradingView public scripts search: pine script not operator boolean negate',
      featureTags: ['operators', 'runtime', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'ops-na-equality-checkpoint',
      title: 'Ops Na Equality Checkpoint',
      searchContext: 'TradingView public scripts search: pine script na equality comparison false',
      featureTags: ['operators', 'na', 'runtime', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realtime-islast-table-checkpoint',
      title: 'Realtime Islast Table Checkpoint',
      searchContext: 'TradingView public scripts search: barstate islast dashboard table',
      featureTags: ['barstate', 'tables', 'dashboard', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realtime-isconfirmed-checkpoint',
      title: 'Realtime Isconfirmed Checkpoint',
      searchContext: 'TradingView public scripts search: barstate isconfirmed anti repainting',
      featureTags: ['barstate', 'signals', 'realtime', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realtime-multi-alert-checkpoint',
      title: 'Realtime Multi Alert Checkpoint',
      searchContext: 'TradingView public scripts search: multiple alertcondition signals',
      featureTags: ['alerts', 'signals', 'ta', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realtime-alert-freq-checkpoint',
      title: 'Realtime Alert Freq Checkpoint',
      searchContext: 'TradingView public scripts search: alert frequency once per bar',
      featureTags: ['alerts', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realtime-isfirst-init-checkpoint',
      title: 'Realtime Isfirst Init Checkpoint',
      searchContext: 'TradingView public scripts search: barstate isfirst initialization',
      featureTags: ['barstate', 'arrays', 'var', 'state', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realtime-isnew-checkpoint',
      title: 'Realtime Isnew Checkpoint',
      searchContext: 'TradingView public scripts search: barstate isnew candle open',
      featureTags: ['barstate', 'state', 'realtime', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realtime-log-levels-checkpoint',
      title: 'Realtime Log Levels Checkpoint',
      searchContext: 'TradingView public scripts search: log info warning error signal',
      featureTags: ['logs', 'barstate', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realtime-strformat-alert-checkpoint',
      title: 'Realtime Strformat Alert Checkpoint',
      searchContext: 'TradingView public scripts search: alert str.format price message',
      featureTags: ['alerts', 'signals', 'str_format', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realtime-alertcondition-crossover-checkpoint',
      title: 'Realtime Alertcondition Crossover Checkpoint',
      searchContext: 'TradingView public scripts search: alertcondition crossover plot',
      featureTags: ['alerts', 'signals', 'ta', 'crossover', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'realtime-lastbar-summary-checkpoint',
      title: 'Realtime Lastbar Summary Checkpoint',
      searchContext: 'TradingView public scripts search: last bar summary statistics',
      featureTags: ['barstate', 'state', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'series-history-deep-lookback-checkpoint',
      title: 'Series Deep Lookback Checkpoint',
      searchContext: 'TradingView public scripts search: history lookback na boundary',
      featureTags: ['runtime', 'series', 'history', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'series-history-derived-series-checkpoint',
      title: 'Series Derived History Checkpoint',
      searchContext: 'TradingView public scripts search: derived series history lag',
      featureTags: ['runtime', 'series', 'history', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'series-history-varip-vs-var-checkpoint',
      title: 'Series Varip Vs Var Checkpoint',
      searchContext: 'TradingView public scripts search: varip var historical persist',
      featureTags: ['runtime', 'series', 'history', 'varip', 'var', 'state', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'series-history-udf-arg-history-checkpoint',
      title: 'Series UDF Arg History Checkpoint',
      searchContext: 'TradingView public scripts search: udf series argument history lag',
      featureTags: ['runtime', 'udf', 'series', 'history', 'scope', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'series-history-rolling-sum-checkpoint',
      title: 'Series Rolling Sum Checkpoint',
      searchContext: 'TradingView public scripts search: manual rolling sum for loop history',
      featureTags: ['runtime', 'series', 'history', 'ta', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'series-history-change-of-sma-checkpoint',
      title: 'Series Change Of SMA Checkpoint',
      searchContext: 'TradingView public scripts search: ta.change sma derived series',
      featureTags: ['runtime', 'series', 'history', 'ta', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'series-history-bar-index-semantics-checkpoint',
      title: 'Series Bar Index Semantics Checkpoint',
      searchContext: 'TradingView public scripts search: bar_index last_bar_index semantics',
      featureTags: ['runtime', 'series', 'history', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'series-history-variable-shadowing-checkpoint',
      title: 'Series Variable Shadowing Checkpoint',
      searchContext: 'TradingView public scripts search: variable shadowing scope if block',
      featureTags: ['runtime', 'series', 'scope', 'state', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'series-history-ema-warmup-checkpoint',
      title: 'Series EMA Warmup Checkpoint',
      searchContext: 'TradingView public scripts search: ema seeding first bar value',
      featureTags: ['runtime', 'series', 'ta', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'series-history-prev-bar-tracking-checkpoint',
      title: 'Series Prev Bar Index Checkpoint',
      searchContext: 'TradingView public scripts search: bar_index previous bar tracking',
      featureTags: ['runtime', 'series', 'var', 'state', 'signals', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'adv-strategy-tp-sl-checkpoint',
      title: 'Advanced Strategy TP SL Checkpoint',
      searchContext: 'TradingView public scripts search: strategy take profit stop loss exit',
      category: 'strategy',
      featureTags: ['strategy', 'broker', 'orders', 'brackets', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'adv-strategy-pyramiding-checkpoint',
      title: 'Advanced Strategy Pyramiding Checkpoint',
      searchContext: 'TradingView public scripts search: strategy pyramiding scale in entries',
      category: 'strategy',
      featureTags: ['strategy', 'broker', 'orders', 'pyramiding', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'adv-strategy-bidirectional-checkpoint',
      title: 'Advanced Strategy Bidirectional Checkpoint',
      searchContext: 'TradingView public scripts search: strategy long short bidirectional',
      category: 'strategy',
      featureTags: ['strategy', 'broker', 'orders', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'adv-strategy-closedtrades-accessors-checkpoint',
      title: 'Advanced Strategy Closed Trades Accessors Checkpoint',
      searchContext: 'TradingView public scripts search: strategy closedtrades accessor entry exit profit',
      category: 'strategy',
      featureTags: ['strategy', 'broker', 'orders', 'trade_accessors', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'adv-strategy-opentrades-accessors-checkpoint',
      title: 'Advanced Strategy Open Trades Accessors Checkpoint',
      searchContext: 'TradingView public scripts search: strategy opentrades entry price size dashboard',
      category: 'strategy',
      featureTags: ['strategy', 'broker', 'orders', 'trade_accessors', 'open_trades', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'adv-strategy-risk-max-position-checkpoint',
      title: 'Advanced Strategy Risk Max Position Checkpoint',
      searchContext: 'TradingView public scripts search: strategy risk max position size',
      category: 'strategy',
      featureTags: ['strategy', 'broker', 'orders', 'risk', 'fills', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'adv-strategy-process-orders-on-close-checkpoint',
      title: 'Advanced Strategy Process Orders On Close Checkpoint',
      searchContext: 'TradingView public scripts search: strategy process orders on close',
      category: 'strategy',
      featureTags: ['strategy', 'broker', 'orders', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'adv-strategy-equity-tracking-checkpoint',
      title: 'Advanced Strategy Equity Tracking Checkpoint',
      searchContext: 'TradingView public scripts search: strategy equity netprofit tracker',
      category: 'strategy',
      featureTags: ['strategy', 'broker', 'orders', 'performance', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'adv-strategy-multi-exit-from-entry-checkpoint',
      title: 'Advanced Strategy Multi Exit From Entry Checkpoint',
      searchContext: 'TradingView public scripts search: strategy exit from_entry multiple brackets',
      category: 'strategy',
      featureTags: ['strategy', 'broker', 'orders', 'brackets', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'adv-strategy-cancel-checkpoint',
      title: 'Advanced Strategy Cancel Checkpoint',
      searchContext: 'TradingView public scripts search: strategy cancel pending order',
      category: 'strategy',
      featureTags: ['strategy', 'broker', 'orders', 'cancel', 'output'],
    }),
    stages: passedThroughOutput,
  },
  // ── End-to-end indicator replicas ─────────────────────────────────────────
  {
    ledgerEntry: publicSearchEntry({
      id: 'replica-squeeze-momentum-checkpoint',
      title: 'Replica Squeeze Momentum Checkpoint',
      searchContext: 'TradingView public scripts search: squeeze momentum lazybear BB KC barcolor',
      featureTags: ['ta', 'signals', 'barcolor', 'kc', 'channels', 'volatility', 'indicator_replica', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'replica-supertrend-trailing-stop-checkpoint',
      title: 'Replica SuperTrend Trailing Stop Checkpoint',
      searchContext: 'TradingView public scripts search: supertrend trailing stop barcolor plotshape',
      featureTags: ['ta', 'signals', 'barcolor', 'state', 'var', 'supertrend', 'indicator_replica', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'replica-volume-profile-lite-checkpoint',
      title: 'Replica Volume Profile Lite Checkpoint',
      searchContext: 'TradingView public scripts search: volume profile colored bars sma bgcolor',
      featureTags: ['ta', 'signals', 'barcolor', 'visuals', 'indicator_replica', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'replica-rsi-divergence-scanner-checkpoint',
      title: 'Replica RSI Divergence Scanner Checkpoint',
      searchContext: 'TradingView public scripts search: rsi divergence scanner pivot plotshape',
      featureTags: ['ta', 'signals', 'rsi', 'divergence', 'pivots', 'indicator_replica', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'replica-mtf-ma-system-checkpoint',
      title: 'Replica MTF MA System Checkpoint',
      searchContext: 'TradingView public scripts search: moving average system fast medium slow fill barcolor',
      featureTags: ['ta', 'signals', 'barcolor', 'state', 'var', 'fills', 'indicator_replica', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'replica-smc-structure-checkpoint',
      title: 'Replica SMC Structure Checkpoint',
      searchContext: 'TradingView public scripts search: smart money concepts structure break plotshape',
      featureTags: ['ta', 'signals', 'state', 'var', 'indicator_replica', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'replica-ha-oscillator-checkpoint',
      title: 'Replica HA Oscillator Checkpoint',
      searchContext: 'TradingView public scripts search: heikin ashi smoothed oscillator ema',
      featureTags: ['ta', 'signals', 'heikin_ashi', 'oscillator', 'indicator_replica', 'output'],
    }),
    stages: passedThroughOutput,
  },
  {
    ledgerEntry: publicSearchEntry({
      id: 'replica-position-size-calculator-checkpoint',
      title: 'Replica Position Size Calculator Checkpoint',
      searchContext: 'TradingView public scripts search: position size calculator risk percent stop distance',
      featureTags: ['inputs', 'signals', 'indicator_replica', 'output'],
    }),
    stages: passedThroughOutput,
  },
  // ── Type system and enum patterns ─────────────────────────────────────────
  {
    ledgerEntry: officialDocsEntry({
      id: 'type-enum-basic-checkpoint',
      title: 'Type Enum Basic Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/language/enums/',
      featureTags: ['enum', 'type_system', 'signals', 'runtime', 'output'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'type-enum-switch-checkpoint',
      title: 'Type Enum Switch Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/language/enums/',
      featureTags: ['enum', 'type_system', 'signals', 'runtime', 'output'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'type-enum-title-checkpoint',
      title: 'Type Enum Title Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/language/enums/',
      featureTags: ['enum', 'type_system', 'unsupported'],
    }),
    stages: [
      { stage: 'parse', status: 'passed' },
      { stage: 'semantic', status: 'passed' },
      {
        stage: 'runtime',
        status: 'failed',
        failureClass: 'unsupported_planned',
        message: 'enum .title() built-in method is not implemented — member access is resolved as a namespace call that the runtime does not recognise',
        diagnostics: [{
          code: 'unsupported-feature',
          message: 'enum .title() built-in method is not yet implemented in the runtime',
          line: 6,
          column: 5,
        }],
      },
    ],
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'type-annotations-checkpoint',
      title: 'Type Annotations Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/language/type-system/',
      featureTags: ['type_system', 'type_annotations', 'signals', 'runtime', 'output'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'type-collection-ann-checkpoint',
      title: 'Collection Type Ann Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/language/arrays/',
      featureTags: ['type_system', 'type_annotations', 'collections', 'arrays', 'map', 'runtime', 'output'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'type-udt-fields-checkpoint',
      title: 'UDT Type Fields Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/language/objects/',
      featureTags: ['udt', 'type_system', 'objects', 'signals', 'runtime', 'output'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'type-builtin-method-checkpoint',
      title: 'Builtin Method Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/language/methods/',
      featureTags: ['methods', 'method_extension', 'type_system', 'signals', 'runtime', 'output'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'type-tuple-return-checkpoint',
      title: 'Tuple Type Return Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/language/user-defined-functions/',
      featureTags: ['udf', 'tuple', 'type_system', 'signals', 'runtime', 'output'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'type-na-typed-default-checkpoint',
      title: 'NA Typed Default Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/language/type-system/',
      featureTags: ['type_system', 'type_annotations', 'na', 'signals', 'runtime', 'output'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'type-qualified-types-checkpoint',
      title: 'Qualified Types Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/language/type-system/',
      featureTags: ['type_system', 'qualified_types', 'signals', 'runtime', 'output'],
    }),
    stages: passedThroughRuntime,
  },
  {
    ledgerEntry: officialDocsEntry({
      id: 'type-conditional-compat-checkpoint',
      title: 'Conditional Type Compat Checkpoint',
      url: 'https://www.tradingview.com/pine-script-docs/language/type-system/',
      featureTags: ['type_system', 'type_annotations', 'ternary', 'signals', 'runtime', 'output'],
    }),
    stages: passedThroughRuntime,
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
  pineVersion?: PineScriptLedgerEntry['pineVersion'];
  category?: PineScriptLedgerEntry['category'];
  featureTags: string[];
}): PineScriptLedgerEntry {
  return {
    id: input.id,
    title: input.title,
    pineVersion: input.pineVersion ?? 'v6',
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
