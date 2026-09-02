import { describe, expect, it } from 'vitest';

import {
  InMemoryRequestDatafeed,
  classifyPineCompatibilitySource,
  corporateActionRequestKey,
  createPineScriptLedger,
  currencyRateRequestKey,
  formatPineCompatibilityCorpusMarkdown,
  getCompiledFallbackBaselineGroup,
  parse,
  runPineCompatibilityCorpus,
  seedCorporateAction,
  seedCurrencyRate,
  seedEconomicSeries,
  seedFinancialMetric,
  seedFootprints,
  seedQuandlSeries,
  seedRequestSymbol,
  type Bar,
  type PineScriptLedgerEntry,
  type TealscriptEngineOptions,
} from '../../src';
import { summarizeCompiledFallbackReasons } from '../../src/compat/compiledFallbackBaseline';
import {
  getProductionWorkerFallbackBaselineGroup,
  summarizeRealtimeParityMismatches,
  summarizeProductionWorkerExecutionModes,
  summarizeProductionWorkerFallbackReasons,
} from '../../src/compat/productionWorkerFallbackBaseline';
import { tryCompile } from '../../src/runtime/codegen';
import { compatibilityBars } from './fixtures';
import { measureForcedCompiledRealtimeSafety, measureProductionWorkerSessions, measureRealtimeReentryParity } from './productionWorkerHarness';

const chartBars: Bar[] = compatibilityBars.slice(0, 6);
const RUN_REALTIME_SWEEP = process.env.TEALSCRIPT_REALTIME_SWEEP === '1';
const REALTIME_SWEEP_BACKEND = process.env.TEALSCRIPT_REALTIME_BACKEND === 'closure' ? 'closure' : 'worker';
const realtimeSweepIt = RUN_REALTIME_SWEEP ? it : it.skip;
const htfBars: Bar[] = [
  { time: chartBars[0]!.time, open: 10, high: 13, low: 9, close: 12, volume: 5_000 },
  { time: chartBars[2]!.time, open: 12, high: 15, low: 11, close: 14, volume: 5_500 },
  { time: chartBars[4]!.time, open: 14, high: 17, low: 13, close: 16, volume: 5_800 },
];
const lowerChartBars: Bar[] = [
  { time: 1_700_000_000_000, open: 100, high: 103, low: 99, close: 102, volume: 1_000 },
  { time: 1_700_000_120_000, open: 105, high: 108, low: 104, close: 107, volume: 900 },
  { time: 1_700_000_240_000, open: 103, high: 104, low: 98, close: 99, volume: 1_400 },
];
const lowerTfBars: Bar[] = [
  { time: 1_700_000_000_000, open: 50, high: 52, low: 49, close: 51, volume: 100 },
  { time: 1_700_000_060_000, open: 51, high: 54, low: 50, close: 53, volume: 120 },
  { time: 1_700_000_120_000, open: 53, high: 55, low: 52, close: 54, volume: 130 },
  { time: 1_700_000_180_000, open: 54, high: 56, low: 53, close: 55, volume: 140 },
  { time: 1_700_000_240_000, open: 55, high: 57, low: 54, close: 56, volume: 150 },
  { time: 1_700_000_300_000, open: 56, high: 58, low: 55, close: 57, volume: 160 },
];

const requestDatafeed = new InMemoryRequestDatafeed([
  {
    symbol: 'TEST',
    timeframe: 'D',
    bars: htfBars,
    syminfo: { ticker: 'TEST', tickerid: 'TEST', currency: 'USD', timezone: 'Etc/UTC' },
    session: { timezone: 'Etc/UTC', regular: '0000-2359:1234567' },
  },
  {
    symbol: 'BINANCE:BTCUSDT',
    timeframe: 'D',
    bars: htfBars,
    syminfo: { ticker: 'BTCUSDT', tickerid: 'BINANCE:BTCUSDT', currency: 'USDT', timezone: 'Etc/UTC' },
  },
  {
    symbol: 'TEST',
    timeframe: '1',
    bars: lowerTfBars,
    syminfo: { ticker: 'TEST', tickerid: 'TEST', currency: 'USD', timezone: 'Etc/UTC' },
  },
  {
    symbol: 'NASDAQ:AAPL',
    timeframe: 'D',
    bars: htfBars,
    syminfo: { ticker: 'AAPL', tickerid: 'NASDAQ:AAPL', currency: 'USD', timezone: 'Etc/UTC' },
    session: { timezone: 'Etc/UTC', regular: '0000-2359:1234567' },
  },
  {
    symbol: 'NASDAQ:AAPL|session=extended',
    timeframe: 'D',
    bars: htfBars.map((bar) => ({ ...bar, close: bar.close + 1 })),
    syminfo: { ticker: 'AAPL', tickerid: 'NASDAQ:AAPL|session=extended', currency: 'USD', timezone: 'Etc/UTC' },
  },
  {
    symbol: 'NASDAQ:AAPL|chart=renko:ATR:10',
    timeframe: 'D',
    bars: htfBars.map((bar) => ({ ...bar, close: bar.close + 30 })),
    syminfo: { ticker: 'AAPL', tickerid: 'NASDAQ:AAPL|chart=renko:ATR:10', currency: 'USD', timezone: 'Etc/UTC' },
  },
  {
    symbol: 'NASDAQ:AAPL|chart=linebreak:3',
    timeframe: 'D',
    bars: htfBars.map((bar) => ({ ...bar, close: bar.close + 40 })),
    syminfo: { ticker: 'AAPL', tickerid: 'NASDAQ:AAPL|chart=linebreak:3', currency: 'USD', timezone: 'Etc/UTC' },
  },
  {
    symbol: 'NASDAQ:AAPL|chart=kagi:ATR:10',
    timeframe: 'D',
    bars: htfBars.map((bar) => ({ ...bar, close: bar.close + 50 })),
    syminfo: { ticker: 'AAPL', tickerid: 'NASDAQ:AAPL|chart=kagi:ATR:10', currency: 'USD', timezone: 'Etc/UTC' },
  },
  {
    symbol: 'NASDAQ:AAPL|chart=pointfigure:hl:ATR:14:3',
    timeframe: 'D',
    bars: htfBars.map((bar) => ({ ...bar, close: bar.close + 60 })),
    syminfo: { ticker: 'AAPL', tickerid: 'NASDAQ:AAPL|chart=pointfigure:hl:ATR:14:3', currency: 'USD', timezone: 'Etc/UTC' },
  },
  {
    symbol: seedRequestSymbol('tradingview-pine-seeds/demo', 'BTC_DEV'),
    timeframe: '60',
    bars: htfBars,
  },
], [
  {
    family: 'currency_rate',
    key: currencyRateRequestKey('USD', 'EUR'),
    points: [{ time: chartBars[0]!.time, value: 0.91 }, { time: chartBars[3]!.time, value: 0.93 }],
  },
  {
    family: 'dividends',
    key: corporateActionRequestKey('NASDAQ:AAPL', 'dividends.gross', 'USD'),
    points: [{ time: chartBars[2]!.time, value: 0.24 }],
  },
  {
    family: 'earnings',
    key: corporateActionRequestKey('NASDAQ:AAPL', 'earnings.actual', 'USD'),
    points: [{ time: chartBars[1]!.time, value: 1.5 }, { time: chartBars[4]!.time, value: 1.8 }],
  },
  {
    family: 'splits',
    key: corporateActionRequestKey('NASDAQ:AAPL', 'splits.denominator'),
    points: [{ time: chartBars[3]!.time, value: 4 }],
  },
  {
    family: 'financial',
    key: ['NASDAQ:AAPL', 'TOTAL_REVENUE', 'FQ', 'USD'].join('\u0000'),
    points: [{ time: chartBars[0]!.time, value: 1000 }, { time: chartBars[3]!.time, value: 1100 }],
  },
  {
    family: 'economic',
    key: ['US', 'GDP'].join('\u0000'),
    points: [{ time: chartBars[2]!.time, value: 3.1 }],
  },
], [
  seedCurrencyRate('USD', 'JPY', [
    { time: chartBars[0]!.time, value: 150 },
    { time: chartBars[3]!.time, value: 151 },
  ]),
], [
  seedEconomicSeries('ZZ', 'GDP', [
    { time: chartBars[0]!.time, value: 2.8 },
    { time: chartBars[3]!.time, value: 2.9 },
  ]),
], [
  seedCorporateAction('dividends', 'NASDAQ:MSFT', [
    { time: chartBars[1]!.time, value: { kind: 'dividends', gross: 0.6, net: 0.5 } },
  ], 'USD'),
  seedCorporateAction('earnings', 'NASDAQ:MSFT', [
    { time: chartBars[0]!.time, value: { kind: 'earnings', actual: 2.1, estimate: 2, standardized: 2.05 } },
  ], 'USD'),
  seedCorporateAction('splits', 'NASDAQ:MSFT', [
    { time: chartBars[2]!.time, value: { kind: 'splits', numerator: 2, denominator: 1 } },
  ]),
], [
  seedFinancialMetric('NASDAQ:MSFT', 'TOTAL_REVENUE', 'FQ', [
    { time: chartBars[0]!.time, value: 2000 },
    { time: chartBars[3]!.time, value: 2200 },
  ], 'USD'),
  seedFinancialMetric('NASDAQ:MSFT', 'TOTAL_REVENUE', 'FY', [
    { time: chartBars[0]!.time, value: 8000 },
    { time: chartBars[3]!.time, value: 8800 },
  ], 'USD'),
], [
  seedQuandlSeries('MULTPL/SHILLER_PE_RATIO_MONTH', 0, [
    { time: chartBars[0]!.time, value: 28.5 },
    { time: chartBars[3]!.time, value: 29.25 },
  ]),
], [
  seedFootprints('BINANCE:BTCUSDT', '60', 10, 70, [
    { time: chartBars[0]!.time, totalVolume: 1200, buyVolume: 700, sellVolume: 500 },
    { time: chartBars[3]!.time, totalVolume: 1300, buyVolume: 760, sellVolume: 540 },
  ]),
]);

const library = parse(`
library("PublicHelper", true)
export type Pivot
    float level = na
    string label = "pivot"
export enum Mode
    strict = "Strict"
    loose
export value(series float source) =>
    ta.sma(source, 2)
export blockValue(series float source, simple int len) =>
    smoothed = ta.sma(source, len)
    smoothed + 1
export method lifted(Pivot this, float amount, float factor=1) =>
    adjusted = this.level + amount * factor
    adjusted
`);

interface ExternalCorpusFixture {
  id: string;
  title: string;
  source: string;
  bars?: Bar[];
  featureTags: string[];
  expectedPassed?: boolean;
  expectedFirstFailureClass?: string;
  excludedFailureReason?: 'classifier_self_test' | 'intentional_negative';
  engineOptions?: TealscriptEngineOptions;
}

const defaultEngineOptions: TealscriptEngineOptions = {
  requestDatafeed,
  runtime: {
    now: Date.UTC(2024, 0, 5, 8, 15),
    syminfo: { ticker: 'BTCUSDT', tickerid: 'BINANCE:BTCUSDT', timezone: 'Etc/UTC' },
    chart: {
      leftVisibleBarTime: chartBars[1]!.time,
      rightVisibleBarTime: chartBars[4]!.time,
    },
    session: {
      timezone: 'Etc/UTC',
      regular: '2218-2224:1234567',
      premarket: '2210-2217:1234567',
      postmarket: '2225-2230:1234567',
    },
  },
};

const corpus: ExternalCorpusFixture[] = [
  {
    id: 'external-security-htf-confirmed',
    title: 'HTF request.security confirmed close',
    featureTags: ['request.security', 'timeframe', 'plot'],
    source: `//@version=6
indicator("HTF confirmed")
htfClose = request.security("TEST", "D", close[1], lookahead=barmerge.lookahead_on)
plot(htfClose, "HTF")`,
  },
  {
    id: 'external-security-tuple-metadata',
    title: 'Tuple request.security with symbol metadata',
    featureTags: ['request.security', 'tuple', 'syminfo'],
    source: `//@version=6
indicator("Tuple metadata")
[htfClose, tickerLength] = request.security("NASDAQ:AAPL", "D", [close, str.length(syminfo.tickerid)], lookahead=barmerge.lookahead_on)
plot(htfClose, "Close")
plot(tickerLength, "Ticker ID Length")`,
  },
  {
    id: 'external-security-lower-tf-counts',
    title: 'Lower timeframe request arrays',
    featureTags: ['request.security_lower_tf', 'array', 'timeframe'],
    bars: lowerChartBars,
    source: `//@version=6
indicator("Lower TF arrays", timeframe="2")
intrabars = request.security_lower_tf("TEST", "1", close)
plot(array.size(intrabars), "Count")
plot(array.get(intrabars, 0), "First")`,
  },
  {
    id: 'external-security-lower-tf-root-input-wrapper',
    title: 'Lower timeframe wrapper with root input',
    featureTags: ['request.security_lower_tf', 'udf', 'ta', 'input'],
    bars: lowerChartBars,
    source: `//@version=6
indicator("Lower TF root input wrapper", timeframe="2")
len = input.int(2)
lower(series float source, string tf) =>
    request.security_lower_tf("TEST", tf, ta.sma(source, len))
intrabars = lower(close, "1")
plot(array.size(intrabars), "Count")
plot(array.get(intrabars, 1), "Second")`,
  },
  {
    id: 'external-security-ignore-invalid',
    title: 'Ignored invalid security symbol',
    featureTags: ['request.security', 'datafeed', 'ignore_invalid_symbol'],
    source: `//@version=6
indicator("Ignored invalid")
missing = request.security("MISSING", "D", close, ignore_invalid_symbol=true)
plot(missing, "Missing")`,
  },
  {
    id: 'external-currency-dividend-series',
    title: 'Currency and dividend point requests',
    featureTags: ['request.currency_rate', 'request.dividends', 'datafeed'],
    source: `//@version=6
indicator("Point requests")
rate = request.currency_rate(currency.USD, "EUR")
dividend = request.dividends("NASDAQ:AAPL", dividends.gross, currency=currency.USD)
plot(rate, "Rate")
plot(dividend, "Dividend")`,
  },
  {
    id: 'external-seed-request',
    title: 'Pine seed request expression',
    featureTags: ['request.seed', 'ta', 'datafeed'],
    source: `//@version=6
indicator("Seed")
seedAverage = request.seed("tradingview-pine-seeds/demo", "BTC_DEV", ta.sma(close, 2))
plot(seedAverage, "Seed Average")`,
  },
  {
    id: 'external-seed-root-input-wrapper',
    title: 'Seed wrapper with root input',
    featureTags: ['request.seed', 'udf', 'ta', 'input'],
    source: `//@version=6
indicator("Seed root input wrapper")
len = input.int(2)
seedWrap(series float source) =>
    request.seed("tradingview-pine-seeds/demo", "BTC_DEV", ta.sma(source, len))
plot(seedWrap(close), "Seed Average")`,
  },
  {
    id: 'external-ticker-session-modifier',
    title: 'Ticker session modifier request',
    featureTags: ['ticker.modify', 'session', 'request.security'],
    source: `//@version=6
indicator("Ticker session")
extendedTicker = ticker.modify("NASDAQ:AAPL", session=session.extended)
regularTicker = ticker.standard(extendedTicker)
extendedClose = request.security(extendedTicker, "D", close, lookahead=barmerge.lookahead_on)
plot(extendedClose, "Extended")
plot(str.length(regularTicker), "Standard Length")`,
  },
  {
    id: 'external-ticker-heikinashi',
    title: 'Heikin Ashi ticker request',
    featureTags: ['ticker.heikinashi', 'request.security', 'synthetic_chart'],
    source: `//@version=6
indicator("Heikin request")
haTicker = ticker.heikinashi("NASDAQ:AAPL")
haClose = request.security(haTicker, "D", close, lookahead=barmerge.lookahead_on)
plot(haClose, "HA Close")`,
  },
  {
    id: 'external-session-dynamic-filter',
    title: 'Dynamic session filter',
    featureTags: ['session', 'time', 'input.session'],
    source: `//@version=6
indicator("Dynamic session")
weekdaySessionInput = input.session("2218-2224", "Weekday Session")
daysInput = input.string("23456", "Weekdays")
dynamicSession = weekdaySessionInput + ":" + daysInput
inSession = not na(time(timeframe.period, dynamicSession))
plot(inSession ? 1 : 0, "In Session")`,
  },
  {
    id: 'external-timeframe-chart-metadata',
    title: 'Timeframe and chart visible metadata',
    featureTags: ['timeframe', 'chart', 'visible_range'],
    source: `//@version=6
indicator("Chart metadata", timeframe="30S")
visible = chart.left_visible_bar_time <= time and time <= chart.right_visible_bar_time
plot(timeframe.in_seconds(), "Seconds")
plot(chart.right_visible_bar_time - chart.left_visible_bar_time, "Visible Duration")
plot(visible ? 1 : 0, "Visible")`,
  },
  {
    id: 'external-runtime-logs',
    title: 'Runtime log output',
    featureTags: ['runtime.log', 'barstate'],
    source: `//@version=6
indicator("Runtime logs")
if barstate.isfirst
    log.info("Loaded {0}", syminfo.ticker)
if barstate.islast
    log.warning("Last close {0:#.0}", close)
plot(close, "Close")`,
  },
  {
    id: 'external-render-normalization',
    title: 'Plotshape rendering normalization',
    featureTags: ['plotshape', 'render'],
    source: `//@version=6
indicator("Shapes", overlay=true)
signal = close > open
plotshape(signal, title="Bull", location=location.abovebar, style=shape.triangleup, text="B")
plot(close, "Close")`,
  },
  {
    id: 'external-missing-datafeed',
    title: 'Missing request datafeed context',
    featureTags: ['request.security', 'datafeed'],
    engineOptions: { runtime: defaultEngineOptions.runtime },
    expectedPassed: false,
    expectedFirstFailureClass: 'data_gap',
    source: `//@version=6
indicator("Missing request data")
plot(request.security("NOPE", "D", close), "Missing")`,
  },
  {
    id: 'external-datafeed-footprint-seeded',
    title: 'Seeded footprint request',
    featureTags: ['request.footprint', 'datafeed'],
    source: `//@version=6
indicator("Footprint")
fp = request.footprint(10, 70)
plot(na(fp) ? 0 : 1, "Has Footprint")`,
  },
  {
    id: 'external-datafeed-footprint-missing',
    title: 'Unseeded footprint request',
    featureTags: ['request.footprint', 'datafeed'],
    source: `//@version=6
indicator("Missing footprint")
fp = request.footprint(5, 68, 250)
plot(na(fp) ? 1 : 0, "Missing Is NA")`,
  },
  {
    id: 'external-parse-gap',
    title: 'Parser gap classification',
    featureTags: ['parse'],
    expectedPassed: false,
    expectedFirstFailureClass: 'parse_gap',
    excludedFailureReason: 'classifier_self_test',
    source: `//@version=6
indicator("Parse gap"
plot(close)`,
  },
  {
    id: 'external-semantic-gap',
    title: 'Semantic gap classification',
    featureTags: ['semantic'],
    expectedPassed: false,
    expectedFirstFailureClass: 'semantic_gap',
    excludedFailureReason: 'classifier_self_test',
    source: `//@version=6
indicator("Semantic gap")
plot(ta.not_a_function(close), "Bad")`,
  },
  {
    id: 'external-runtime-error',
    title: 'Runtime error classification',
    featureTags: ['runtime.error'],
    expectedPassed: false,
    expectedFirstFailureClass: 'runtime_gap',
    excludedFailureReason: 'classifier_self_test',
    source: `//@version=6
indicator("Runtime guard")
if bar_index == 2
    runtime.error("Guard tripped")
plot(close, "Close")`,
  },
  {
    id: 'external-compiled-fallback-import',
    title: 'Imported helper compiled execution',
    featureTags: ['import', 'library_registry'],
    engineOptions: { ...defaultEngineOptions, libraries: new Map([['PublicUser/PublicHelper/1', library]]) },
    source: `//@version=6
indicator("Import helper")
import PublicUser/PublicHelper/1 as helper
plot(helper.value(close), "Value")`,
  },
  {
    id: 'external-security-legacy-alias',
    title: 'Legacy security alias',
    featureTags: ['security', 'request.security', 'timeframe'],
    source: `//@version=5
indicator("Legacy security")
legacyClose = security("TEST", "D", close, lookahead=barmerge.lookahead_on)
plot(legacyClose, "Legacy")`,
  },
  {
    id: 'external-security-calc-bars-count',
    title: 'Security calc bars count',
    featureTags: ['request.security', 'calc_bars_count'],
    source: `//@version=6
indicator("Calc bars")
trimmed = request.security("TEST", "D", close, calc_bars_count=2, lookahead=barmerge.lookahead_on)
plot(trimmed, "Trimmed")`,
  },
  {
    id: 'external-security-gaps-on',
    title: 'Security gaps on',
    featureTags: ['request.security', 'barmerge.gaps'],
    source: `//@version=6
indicator("Gaps")
gapped = request.security("TEST", "D", close, gaps=barmerge.gaps_on, lookahead=barmerge.lookahead_on)
plot(gapped, "Gapped")`,
  },
  {
    id: 'external-security-ignore-invalid-timeframe',
    title: 'Ignored invalid lower timeframe',
    featureTags: ['request.security_lower_tf', 'ignore_invalid_timeframe'],
    bars: lowerChartBars,
    source: `//@version=6
indicator("Ignored invalid lower", timeframe="2")
sameTf = request.security_lower_tf("TEST", "2", close, ignore_invalid_timeframe=true)
plot(array.size(sameTf), "Same TF")`,
  },
  {
    id: 'external-request-earnings-splits',
    title: 'Earnings and splits point requests',
    featureTags: ['request.earnings', 'request.splits', 'datafeed'],
    source: `//@version=6
indicator("Events")
eps = request.earnings("NASDAQ:AAPL", earnings.actual, currency=currency.USD)
split = request.splits("NASDAQ:AAPL", splits.denominator)
plot(eps, "EPS")
plot(split, "Split")`,
  },
  {
    id: 'external-request-financial-economic',
    title: 'Financial and economic point requests',
    featureTags: ['request.financial', 'request.economic', 'datafeed'],
    source: `//@version=6
indicator("Fundamental")
revenue = request.financial("NASDAQ:AAPL", "TOTAL_REVENUE", "FQ", currency="USD")
gdp = request.economic("US", "GDP")
plot(revenue, "Revenue")
plot(gdp, "GDP")`,
  },
  {
    id: 'external-request-currency-same',
    title: 'Same-currency request',
    featureTags: ['request.currency_rate', 'currency'],
    source: `//@version=6
indicator("Same currency")
same = request.currency_rate(currency.USD, "USD")
plot(same, "Same")`,
  },
  {
    id: 'external-request-mtf-wrapper-function',
    title: 'MTF wrapper helper',
    featureTags: ['request.security', 'udf', 'timeframe'],
    source: `//@version=6
indicator("MTF wrapper")
mtf(series float source, string tf) =>
    request.security(syminfo.tickerid, tf, source, lookahead=barmerge.lookahead_on)
plot(mtf(close, "D"), "Wrapped")`,
  },
  {
    id: 'external-request-mtf-wrapper-computed-ta',
    title: 'MTF wrapper computed TA expression',
    featureTags: ['request.security', 'udf', 'ta', 'timeframe'],
    source: `//@version=6
indicator("MTF computed wrapper")
mtf(series float source, string tf, int len) =>
    request.security(syminfo.tickerid, tf, ta.sma(source, len), lookahead=barmerge.lookahead_on)
plot(mtf(close, "D", 2), "Wrapped SMA")`,
  },
  {
    id: 'external-request-mtf-wrapper-root-input',
    title: 'MTF wrapper helper with root input',
    featureTags: ['request.security', 'udf', 'ta', 'input'],
    source: `//@version=6
indicator("MTF root input wrapper")
len = input.int(2)
smooth(series float source) => ta.sma(source, len)
mtf(series float source, string tf) =>
    request.security("TEST", tf, smooth(source), lookahead=barmerge.lookahead_on)
plot(mtf(close, "D"), "Wrapped SMA")`,
  },
  {
    id: 'external-request-mtf-wrapper-tuple',
    title: 'MTF wrapper tuple expression',
    featureTags: ['request.security', 'udf', 'tuple', 'timeframe'],
    source: `//@version=6
indicator("MTF tuple wrapper")
mtf(series float source, string tf, int len) =>
    request.security(syminfo.tickerid, tf, [source, ta.sma(source, len)], lookahead=barmerge.lookahead_on)
[raw, smooth] = mtf(close, "D", 2)
plot(raw, "Raw")
plot(smooth, "Smooth")`,
  },
  {
    id: 'external-request-mtf-wrapper-symbol-expression-param',
    title: 'MTF wrapper symbol and expression param',
    featureTags: ['request.security', 'udf', 'symbol', 'timeframe'],
    source: `//@version=6
indicator("MTF symbol expression wrapper")
mtf(string tickerId, series float source) =>
    request.security(tickerId, "D", source + str.length(tickerId), lookahead=barmerge.lookahead_on)
plot(mtf("TEST", close), "Wrapped")`,
  },
  {
    id: 'external-ticker-new-named',
    title: 'Ticker new named arguments',
    featureTags: ['ticker.new', 'session'],
    source: `//@version=6
indicator("Ticker new")
symbol = ticker.new(prefix="NASDAQ", ticker="AAPL", session=session.extended)
plot(str.length(symbol), "Symbol Length")`,
  },
  {
    id: 'external-ticker-modifier-chain',
    title: 'Ticker modifier chain',
    featureTags: ['ticker.modify', 'ticker.heikinashi', 'request.security'],
    source: `//@version=6
indicator("Ticker chain")
base = ticker.modify("NASDAQ:AAPL", session=session.extended, adjustment=adjustment.dividends)
ha = ticker.heikinashi(base)
standard = ticker.standard(ha)
plot(str.length(standard), "Standard")
plot(request.security(ha, "D", close, lookahead=barmerge.lookahead_on), "HA")`,
  },
  {
    id: 'external-ticker-heikinashi-standard-request',
    title: 'Heikinashi request from standard host bars',
    featureTags: ['ticker.heikinashi', 'request.security'],
    source: `//@version=6
indicator("Heikinashi standard request")
ha = ticker.heikinashi("NASDAQ:AAPL")
plot(request.security(ha, "D", close, lookahead=barmerge.lookahead_on), "HA")`,
  },
  {
    id: 'external-ticker-modified-heikinashi-standard-fallback',
    title: 'Modified heikinashi request using standard host bars',
    featureTags: ['ticker.modify', 'ticker.heikinashi', 'request.security'],
    source: `//@version=6
indicator("Modified HA fallback")
modified = ticker.modify("NASDAQ:AAPL", adjustment=adjustment.splits)
ha = ticker.heikinashi(modified)
plot(request.security(ha, "D", close, lookahead=barmerge.lookahead_on), "HA")`,
  },
  {
    id: 'external-ticker-inherit-chain',
    title: 'Ticker inherit modifier chain',
    featureTags: ['ticker.inherit', 'ticker.heikinashi', 'request.security'],
    source: `//@version=6
indicator("Ticker inherit")
sourceTicker = ticker.heikinashi(ticker.modify("NASDAQ:AAPL", session.extended))
targetTicker = ticker.inherit(sourceTicker, "NASDAQ:MSFT")
plot(str.length(targetTicker), "Inherited Length")`,
  },
  {
    id: 'external-ticker-renko',
    title: 'Renko ticker identifier',
    featureTags: ['ticker.renko', 'synthetic_chart'],
    source: `//@version=6
indicator("Renko")
renkoTicker = ticker.renko("NASDAQ:AAPL", "ATR", 10)
plot(str.length(renkoTicker), "Renko Length")`,
  },
  {
    id: 'external-ticker-renko-provider-gap',
    title: 'Renko request seeded datafeed',
    featureTags: ['ticker.renko', 'request.security', 'synthetic_chart', 'datafeed'],
    source: `//@version=6
indicator("Renko provider")
renkoTicker = ticker.renko("NASDAQ:AAPL", "ATR", 10)
renkoClose = request.security(renkoTicker, "D", close)
plot(renkoClose, "Renko Close")`,
  },
  {
    id: 'external-ticker-linebreak',
    title: 'Linebreak ticker identifier',
    featureTags: ['ticker.linebreak', 'synthetic_chart'],
    source: `//@version=6
indicator("Linebreak")
lineBreakTicker = ticker.linebreak("NASDAQ:AAPL", 3)
plot(str.length(lineBreakTicker), "Linebreak Length")`,
  },
  {
    id: 'external-ticker-linebreak-request-seeded',
    title: 'Linebreak request seeded datafeed',
    featureTags: ['ticker.linebreak', 'request.security', 'synthetic_chart', 'datafeed'],
    source: `//@version=6
indicator("Linebreak provider")
lineBreakTicker = ticker.linebreak("NASDAQ:AAPL", 3)
lineBreakClose = request.security(lineBreakTicker, "D", close)
plot(lineBreakClose, "Linebreak Close")`,
  },
  {
    id: 'external-ticker-kagi',
    title: 'Kagi ticker identifier',
    featureTags: ['ticker.kagi', 'synthetic_chart'],
    source: `//@version=6
indicator("Kagi")
kagiTicker = ticker.kagi("NASDAQ:AAPL", "ATR", 10)
plot(str.length(kagiTicker), "Kagi Length")`,
  },
  {
    id: 'external-ticker-kagi-request-seeded',
    title: 'Kagi request seeded datafeed',
    featureTags: ['ticker.kagi', 'request.security', 'synthetic_chart', 'datafeed'],
    source: `//@version=6
indicator("Kagi provider")
kagiTicker = ticker.kagi("NASDAQ:AAPL", "ATR", 10)
kagiClose = request.security(kagiTicker, "D", close)
plot(kagiClose, "Kagi Close")`,
  },
  {
    id: 'external-ticker-pointfigure',
    title: 'Point-and-figure ticker identifier',
    featureTags: ['ticker.pointfigure', 'synthetic_chart'],
    source: `//@version=6
indicator("Point figure")
pnfTicker = ticker.pointfigure("NASDAQ:AAPL", "hl", "ATR", 14, 3)
plot(str.length(pnfTicker), "PNF Length")`,
  },
  {
    id: 'external-ticker-pointfigure-request-seeded',
    title: 'Point-and-figure request seeded datafeed',
    featureTags: ['ticker.pointfigure', 'request.security', 'synthetic_chart', 'datafeed'],
    source: `//@version=6
indicator("Point figure provider")
pnfTicker = ticker.pointfigure("NASDAQ:AAPL", "hl", "ATR", 14, 3)
pnfClose = request.security(pnfTicker, "D", close)
plot(pnfClose, "PNF Close")`,
  },
  {
    id: 'external-session-state-helpers',
    title: 'Session state helpers',
    featureTags: ['session', 'session.state'],
    source: `//@version=6
indicator("Session states")
active = session.ispremarket or session.ismarket or session.ispostmarket
plot(active ? 1 : 0, "Active")
plot(session.isfirstbar ? 1 : 0, "First")
plot(session.islastbar ? 1 : 0, "Last")`,
  },
  {
    id: 'external-session-time-close',
    title: 'Session time close filter',
    featureTags: ['session', 'time_close'],
    source: `//@version=6
indicator("Session close")
sessionClose = time_close(timeframe.period, "2218-2224", "Etc/UTC")
plot(na(sessionClose) ? 0 : 1, "Session Close")`,
  },
  {
    id: 'external-session-input-weekdays',
    title: 'Session input weekdays',
    featureTags: ['session', 'input.session', 'input.string'],
    source: `//@version=6
indicator("Session input")
sess = input.session("2218-2224", "Session")
days = input.string("23456", "Days")
plot(not na(time(timeframe.period, sess + ":" + days)) ? 1 : 0, "Open")`,
  },
  {
    id: 'external-timeframe-comparisons',
    title: 'Timeframe comparison helpers',
    featureTags: ['timeframe', 'comparison'],
    source: `//@version=6
indicator("Timeframe compare", timeframe="5")
fast = timeframe.in_seconds() < timeframe.in_seconds("1D")
plot(fast ? 1 : 0, "Fast")
plot(timeframe.from_seconds(3600) == "60" ? 1 : 0, "From Hour")`,
  },
  {
    id: 'external-timeframe-change-day',
    title: 'Timeframe change helper',
    featureTags: ['timeframe.change', 'timeframe'],
    source: `//@version=6
indicator("Timeframe change")
plot(timeframe.change("3") ? 1 : 0, "Three")
plot(timeframe.change("1D") ? 1 : 0, "Daily")`,
  },
  {
    id: 'external-chart-visible-label',
    title: 'Visible-range label',
    featureTags: ['chart', 'visible_range', 'label'],
    source: `//@version=6
indicator("Visible label", overlay=true)
if barstate.islast
    label.new(bar_index, close, str.tostring(chart.right_visible_bar_time - chart.left_visible_bar_time))
plot(close, "Close")`,
  },
  {
    id: 'external-request-data-table',
    title: 'Request data table',
    featureTags: ['request.security', 'table'],
    source: `//@version=6
indicator("Request table")
htf = request.security("TEST", "D", close, lookahead=barmerge.lookahead_on)
var table t = table.new(position.top_right, 1, 1)
if barstate.islast
    table.cell(t, 0, 0, str.tostring(htf, "#.0"))
plot(htf, "HTF")`,
  },
  {
    id: 'external-request-data-label',
    title: 'Request data label',
    featureTags: ['request.security', 'label'],
    source: `//@version=6
indicator("Request label", overlay=true)
htf = request.security("TEST", "D", close, lookahead=barmerge.lookahead_on)
if barstate.islast
    label.new(bar_index, htf, "HTF " + str.tostring(htf))
plot(htf, "HTF")`,
  },
  {
    id: 'external-log-named-message',
    title: 'Log named message formatting',
    featureTags: ['runtime.log', 'log.placeholders'],
    source: `//@version=6
indicator("Named logs")
if bar_index == 1
    log.info(message="Index {0} close {1:#.00}", bar_index, close)
plot(close, "Close")`,
  },
  {
    id: 'external-session-timeframe-filter',
    title: 'Session and timeframe filter',
    featureTags: ['session', 'timeframe'],
    source: `//@version=6
indicator("Session timeframe filter", timeframe="30")
isFast = timeframe.isintraday and timeframe.in_seconds() < timeframe.in_seconds("D")
inMarket = session.ismarket or session.ispremarket or session.ispostmarket
plot(isFast ? 1 : 0, "Fast")
plot(inMarket ? 1 : 0, "Session")`,
  },
  {
    id: 'external-visible-range-label',
    title: 'Visible range label output',
    featureTags: ['chart', 'label', 'visible_range'],
    source: `//@version=6
indicator("Visible label", overlay=true)
visible = chart.left_visible_bar_time <= time and time <= chart.right_visible_bar_time
if visible and barstate.islast
    label.new(bar_index, close, "visible " + str.tostring(chart.right_visible_bar_time))
plot(visible ? close : na, "Visible Close")`,
  },
  {
    id: 'external-runtime-error-named',
    title: 'Named runtime error guard',
    featureTags: ['runtime.error'],
    source: `//@version=6
indicator("Named runtime error")
if close < open and false
    runtime.error(message="Bear bar")
plot(close, "Close")`,
  },
  {
    id: 'external-runtime-short-circuit-guard',
    title: 'Runtime short-circuit guard',
    featureTags: ['runtime.error', 'short_circuit'],
    source: `//@version=6
indicator("Short circuit guard")
safeAnd = false and runtime.error("and guard failed")
safeOr = true or runtime.error("or guard failed")
plot((safeAnd ? 1 : 0) + (safeOr ? 1 : 0), "Safe")`,
  },
  {
    id: 'external-local-enum-title',
    title: 'Local enum title method',
    featureTags: ['enum', 'method'],
    source: `//@version=6
indicator("Enum title")
enum Mode
    strict = "Strict Mode"
    loose
plot(str.length(Mode.strict.title()), "Strict")
plot(str.length(Mode.loose.title()), "Loose")`,
  },
  {
    id: 'external-import-missing-library',
    title: 'Missing imported library',
    featureTags: ['import', 'library_registry'],
    expectedPassed: false,
    expectedFirstFailureClass: 'semantic_gap',
    excludedFailureReason: 'intentional_negative',
    source: `//@version=6
indicator("Missing import")
import TradingView/PivotLabels/1 as dpl
plot(close, "Close")`,
  },
  {
    id: 'external-import-type-diagnostic',
    title: 'Imported alias runtime diagnostic',
    featureTags: ['import', 'semantic'],
    engineOptions: { ...defaultEngineOptions, libraries: new Map([['PublicUser/PublicHelper/1', library]]) },
    expectedPassed: false,
    expectedFirstFailureClass: 'semantic_gap',
    excludedFailureReason: 'intentional_negative',
    source: `//@version=6
indicator("Import diagnostic")
import PublicUser/PublicHelper/1 as helper
float bad = helper.value
plot(close, "Close")`,
  },
  {
    id: 'external-import-block-helper',
    title: 'Imported library block helper',
    featureTags: ['import', 'function', 'ta'],
    engineOptions: { ...defaultEngineOptions, libraries: new Map([['PublicUser/PublicHelper/1', library]]) },
    source: `//@version=6
indicator("Import block helper")
import PublicUser/PublicHelper/1 as helper
plot(helper.blockValue(close, 2), "Block")`,
  },
  {
    id: 'external-import-udt-method',
    title: 'Imported UDT method helper',
    featureTags: ['import', 'udt', 'method'],
    engineOptions: { ...defaultEngineOptions, libraries: new Map([['PublicUser/PublicHelper/1', library]]) },
    source: `//@version=6
indicator("Import UDT method")
import PublicUser/PublicHelper/1 as helper
p = helper.Pivot.new(level=close, label="close")
plot(p.level, "Level")
plot(p.lifted(1, factor=2), "Lifted")`,
  },
  {
    id: 'external-import-enum-member',
    title: 'Imported enum member',
    featureTags: ['import', 'enum'],
    engineOptions: { ...defaultEngineOptions, libraries: new Map([['PublicUser/PublicHelper/1', library]]) },
    source: `//@version=6
indicator("Import enum member")
import PublicUser/PublicHelper/1 as helper
plot(helper.Mode.strict == helper.Mode.loose ? 0 : 1, "Mode")`,
  },
  {
    id: 'external-import-enum-title',
    title: 'Imported enum title method',
    featureTags: ['import', 'enum'],
    engineOptions: { ...defaultEngineOptions, libraries: new Map([['PublicUser/PublicHelper/1', library]]) },
    source: `//@version=6
indicator("Import enum title")
import PublicUser/PublicHelper/1 as helper
plot(str.length(helper.Mode.strict.title()), "Strict")
plot(str.length(helper.Mode.loose.title()), "Loose")`,
  },
  {
    id: 'external-import-helper-in-security',
    title: 'Imported helper inside request expression',
    featureTags: ['import', 'request.security', 'function'],
    engineOptions: { ...defaultEngineOptions, libraries: new Map([['PublicUser/PublicHelper/1', library]]) },
    source: `//@version=6
indicator("Import helper request")
import PublicUser/PublicHelper/1 as helper
requested = request.security("TEST", "D", helper.blockValue(close, 2), lookahead=barmerge.lookahead_on)
plot(requested, "Requested")`,
  },
  {
    id: 'external-import-method-in-security',
    title: 'Imported UDT method inside request expression',
    featureTags: ['import', 'request.security', 'method', 'udt'],
    engineOptions: { ...defaultEngineOptions, libraries: new Map([['PublicUser/PublicHelper/1', library]]) },
    source: `//@version=6
indicator("Import method request")
import PublicUser/PublicHelper/1 as helper
requested = request.security("TEST", "D", helper.Pivot.new(level=close).lifted(2), lookahead=barmerge.lookahead_on)
plot(requested, "Requested")`,
  },
  {
    id: 'external-import-enum-in-security',
    title: 'Imported enum inside request expression',
    featureTags: ['import', 'request.security', 'enum'],
    engineOptions: { ...defaultEngineOptions, libraries: new Map([['PublicUser/PublicHelper/1', library]]) },
    source: `//@version=6
indicator("Import enum request")
import PublicUser/PublicHelper/1 as helper
requested = request.security("TEST", "D", str.length(helper.Mode.strict.title()) + close, lookahead=barmerge.lookahead_on)
plot(requested, "Requested")`,
  },
  {
    id: 'external-unsupported-quandl',
    title: 'Seeded Quandl datafeed',
    featureTags: ['request.quandl', 'datafeed'],
    source: `//@version=5
indicator("Quandl")
plot(request.quandl("MULTPL/SHILLER_PE_RATIO_MONTH", barmerge.gaps_off, 0), "Quandl")`,
  },
  {
    id: 'external-datafeed-quandl-unseeded-na',
    title: 'Unseeded Quandl datafeed returns na',
    featureTags: ['request.quandl', 'datafeed'],
    source: `//@version=6
indicator("Unseeded Quandl")
metric = request.quandl("MULTPL/SP500_PE_RATIO_MONTH", barmerge.gaps_off, 0, ignore_invalid_symbol=true)
plot(na(metric) ? 1 : 0, "Missing Is NA")`,
  },
  {
    id: 'external-semantic-invalid-ignore-flag',
    title: 'Invalid ignore flag diagnostic',
    featureTags: ['request.security', 'semantic'],
    expectedPassed: false,
    expectedFirstFailureClass: 'semantic_gap',
    excludedFailureReason: 'intentional_negative',
    source: `//@version=6
indicator("Bad ignore flag")
plot(request.security("TEST", "D", close, ignore_invalid_symbol="yes"), "Bad")`,
  },
  {
    id: 'external-semantic-invalid-ticker-session',
    title: 'Invalid ticker session diagnostic',
    featureTags: ['ticker.modify', 'semantic'],
    expectedPassed: false,
    expectedFirstFailureClass: 'semantic_gap',
    excludedFailureReason: 'intentional_negative',
    source: `//@version=6
indicator("Bad ticker session")
badTicker = ticker.modify("NASDAQ:AAPL", session="overnight")
plot(str.length(badTicker), "Bad")`,
  },
  {
    id: 'external-datafeed-currency-missing',
    title: 'Seeded currency datafeed',
    featureTags: ['request.currency_rate', 'datafeed'],
    source: `//@version=6
indicator("Seeded currency")
plot(request.currency_rate("USD", "JPY"), "JPY")`,
  },
  {
    id: 'external-datafeed-currency-unseeded-na',
    title: 'Unseeded currency datafeed returns na',
    featureTags: ['request.currency_rate', 'datafeed'],
    source: `//@version=6
indicator("Unseeded currency")
rate = request.currency_rate("EUR", "JPY")
plot(na(rate) ? 1 : 0, "Missing Is NA")`,
  },
  {
    id: 'external-datafeed-point-missing',
    title: 'Seeded economic datafeed',
    featureTags: ['request.economic', 'datafeed'],
    source: `//@version=6
indicator("Seeded economic")
plot(request.economic("ZZ", "GDP"), "Economic")`,
  },
  {
    id: 'external-datafeed-economic-unseeded-na',
    title: 'Unseeded economic datafeed returns na',
    featureTags: ['request.economic', 'datafeed'],
    source: `//@version=6
indicator("Unseeded economic")
gdp = request.economic("CA", "GDP")
plot(na(gdp) ? 1 : 0, "Missing Is NA")`,
  },
  {
    id: 'external-datafeed-dividends-seeded',
    title: 'Seeded dividends datafeed',
    featureTags: ['request.dividends', 'datafeed'],
    source: `//@version=6
indicator("Seeded dividends")
gross = request.dividends("NASDAQ:MSFT", dividends.gross, currency=currency.USD)
net = request.dividends("NASDAQ:MSFT", dividends.net, gaps=barmerge.gaps_on, currency="USD")
plot(gross, "Gross")
plot(net, "Net")`,
  },
  {
    id: 'external-datafeed-dividends-unseeded-na',
    title: 'Unseeded dividends datafeed returns na',
    featureTags: ['request.dividends', 'datafeed'],
    source: `//@version=6
indicator("Unseeded dividends")
dividend = request.dividends("NASDAQ:IBM", dividends.gross)
plot(na(dividend) ? 1 : 0, "Missing Is NA")`,
  },
  {
    id: 'external-datafeed-earnings-seeded',
    title: 'Seeded earnings datafeed',
    featureTags: ['request.earnings', 'datafeed'],
    source: `//@version=6
indicator("Seeded earnings")
actual = request.earnings("NASDAQ:MSFT", earnings.actual, currency="USD")
standardized = request.earnings("NASDAQ:MSFT", earnings.standardized, gaps=barmerge.gaps_on, currency=currency.USD)
plot(actual, "Actual")
plot(standardized, "Standardized")`,
  },
  {
    id: 'external-datafeed-earnings-unseeded-na',
    title: 'Unseeded earnings datafeed returns na',
    featureTags: ['request.earnings', 'datafeed'],
    source: `//@version=6
indicator("Unseeded earnings")
eps = request.earnings("NASDAQ:IBM", earnings.actual)
plot(na(eps) ? 1 : 0, "Missing Is NA")`,
  },
  {
    id: 'external-datafeed-splits-seeded',
    title: 'Seeded splits datafeed',
    featureTags: ['request.splits', 'datafeed'],
    source: `//@version=6
indicator("Seeded splits")
num = request.splits("NASDAQ:MSFT", splits.numerator)
den = request.splits("NASDAQ:MSFT", splits.denominator, gaps=barmerge.gaps_on)
plot(num, "Numerator")
plot(den, "Denominator")`,
  },
  {
    id: 'external-datafeed-splits-unseeded-na',
    title: 'Unseeded splits datafeed returns na',
    featureTags: ['request.splits', 'datafeed'],
    source: `//@version=6
indicator("Unseeded splits")
split = request.splits("NASDAQ:IBM", splits.denominator)
plot(na(split) ? 1 : 0, "Missing Is NA")`,
  },
  {
    id: 'external-datafeed-financial-seeded',
    title: 'Seeded financial datafeed',
    featureTags: ['request.financial', 'datafeed'],
    source: `//@version=6
indicator("Seeded financial")
quarterly = request.financial("NASDAQ:MSFT", "TOTAL_REVENUE", "FQ", currency=currency.USD)
annual = request.financial("NASDAQ:MSFT", "TOTAL_REVENUE", "FY", gaps=barmerge.gaps_on, currency="USD")
plot(quarterly, "Quarterly")
plot(annual, "Annual")`,
  },
  {
    id: 'external-datafeed-financial-unseeded-na',
    title: 'Unseeded financial datafeed returns na',
    featureTags: ['request.financial', 'datafeed'],
    source: `//@version=6
indicator("Unseeded financial")
metric = request.financial("NASDAQ:MSFT", "NET_INCOME", "FQ")
plot(na(metric) ? 1 : 0, "Missing Is NA")`,
  },
];

function entryFor(fixture: ExternalCorpusFixture): PineScriptLedgerEntry {
  return {
    id: fixture.id,
    title: fixture.title,
    pineVersion: 'v6',
    category: 'indicator',
    source: {
      kind: 'public_script',
      searchContext: `Reduced public-style TradingView indicator idiom: ${fixture.title}`,
      licenseStatus: 'unknown',
    },
    featureTags: fixture.featureTags,
    storagePolicy: 'reduced_fixture_only',
  };
}

describe('Pine external corpus source classifier', () => {
  it('classifies reduced public-style request/ticker/session/runtime fixtures', () => {
    const run = runPineCompatibilityCorpus(corpus.map((fixture) => ({
      ledgerEntry: entryFor(fixture),
      excludedFailureReason: fixture.excludedFailureReason,
      stages: () => classifyPineCompatibilitySource(fixture.source, {
        bars: fixture.bars ?? chartBars,
        engineOptions: fixture.engineOptions ?? defaultEngineOptions,
      }),
    })));

    expect(run.summary.validationErrors).toEqual({});
    expect(run.summary).toMatchObject({
      total: 85,
      passed: 77,
      failed: 8,
      plannedUnsupported: 0,
      excludedFailed: 7,
      actionableFailed: 1,
    });
    expect(run.summary.byFirstFailureClass).toEqual({
      data_gap: 1,
      parse_gap: 1,
      runtime_gap: 1,
      semantic_gap: 5,
    });
    expect(run.summary.byExcludedFailureReason).toEqual({
      classifier_self_test: 3,
      intentional_negative: 4,
    });

    const expectations = new Map(corpus.map((fixture) => [fixture.id, fixture]));
    for (const outcome of run.outcomes) {
      const fixture = expectations.get(outcome.scriptId)!;
      if (outcome.summary.passed !== (fixture.expectedPassed ?? true)) {
        throw new Error(`${outcome.scriptId} pass state mismatch: ${JSON.stringify(outcome.stages)}`);
      }
      if (outcome.summary.firstFailureClass !== fixture.expectedFirstFailureClass) {
        throw new Error(`${outcome.scriptId} failure class mismatch: ${JSON.stringify(outcome.stages)}`);
      }
    }
  });

  it('renders a deterministic corpus summary for review artifacts', () => {
    const ledger = createPineScriptLedger(corpus.map(entryFor));
    const run = runPineCompatibilityCorpus(ledger.entries.map((ledgerEntry) => {
      const fixture = corpus.find((candidate) => candidate.id === ledgerEntry.id)!;
      return {
        ledgerEntry,
        excludedFailureReason: fixture.excludedFailureReason,
        stages: () => classifyPineCompatibilitySource(fixture.source, {
          bars: fixture.bars ?? chartBars,
          engineOptions: fixture.engineOptions ?? defaultEngineOptions,
        }),
      };
    }));

    expect(formatPineCompatibilityCorpusMarkdown(run)).toContain('Total: 85');
    expect(formatPineCompatibilityCorpusMarkdown(run)).toContain('Excluded failed: 7');
    expect(formatPineCompatibilityCorpusMarkdown(run)).not.toContain('| compiled_fallback |');
    expect(formatPineCompatibilityCorpusMarkdown(run)).toContain('| request.security | 28 | 26 | 2 |');
  });

  it('tracks compiled fallback rate for external fixtures expected to run', () => {
    const baseline = getCompiledFallbackBaselineGroup('external-corpus');
    const eligible = corpus.filter((fixture) => fixture.expectedPassed ?? true);
    const fallbacks = eligible.flatMap((fixture) => {
      const ast = parse(fixture.source);
      const compiled = tryCompile(ast, undefined, { libraries: fixture.engineOptions?.libraries ?? defaultEngineOptions.libraries });
      return compiled.success ? [] : [{ scriptId: fixture.id, reasons: compiled.unsupported }];
    });
    const reasonSummary = summarizeCompiledFallbackReasons(fallbacks);

    expect(corpus.length).toBe(baseline.scriptCount);
    expect(eligible.length).toBe(baseline.eligible);
    expect(eligible.length - fallbacks.length).toBe(baseline.compiled);
    expect(fallbacks.length).toBe(baseline.fallback);
    expect(fallbacks.length / eligible.length).toBe(baseline.fallbackRate);
    expect(reasonSummary).toEqual(baseline.knownFallbackReasons);
  });

  it('tracks production worker fallback rate for external fixtures expected to run', async () => {
    const baseline = getProductionWorkerFallbackBaselineGroup('external-corpus');
    const eligible = corpus.filter((fixture) => fixture.expectedPassed ?? true);
    const session = await measureProductionWorkerSessions(eligible.map((fixture) => ({
      scriptId: fixture.id,
      source: fixture.source,
      bars: fixture.bars ?? chartBars,
      engineOptions: fixture.engineOptions ?? defaultEngineOptions,
    })), { includeLiveUpdates: true });
    const measurements = session.loadMeasurements;
    const updateMeasurements = session.updateMeasurements;
    const fallbacks = measurements.filter((measurement) => measurement.executionMode !== 'compiled');
    const updateFallbacks = updateMeasurements.filter((measurement) => measurement.executionMode !== 'compiled');

    expect(corpus.length).toBe(baseline.scriptCount);
    expect(eligible.length).toBe(baseline.eligible);
    expect(eligible.length - fallbacks.length).toBe(baseline.compiled);
    expect(fallbacks.length).toBe(baseline.fallback);
    expect(fallbacks.length / eligible.length).toBe(baseline.fallbackRate);
    expect(summarizeProductionWorkerExecutionModes(measurements)).toEqual(baseline.executionModes);
    expect(summarizeProductionWorkerFallbackReasons(measurements)).toEqual(baseline.knownFallbackReasons);
    expect(updateMeasurements.length).toBe(baseline.liveUpdates.total);
    expect(updateMeasurements.length - updateFallbacks.length).toBe(baseline.liveUpdates.compiled);
    expect(updateFallbacks.length).toBe(baseline.liveUpdates.fallback);
    expect(updateFallbacks.length / updateMeasurements.length).toBe(baseline.liveUpdates.fallbackRate);
    expect(summarizeProductionWorkerExecutionModes(updateMeasurements)).toEqual(baseline.liveUpdates.executionModes);
    expect(summarizeProductionWorkerFallbackReasons(updateMeasurements)).toEqual(baseline.liveUpdates.knownFallbackReasons);
  });

  it('classifies external realtime safety fallbacks by forced compiled behaviour', () => {
    const fallbackScriptIds = [
      'external-security-lower-tf-root-input-wrapper',
      'external-seed-request',
      'external-seed-root-input-wrapper',
      'external-request-mtf-wrapper-computed-ta',
      'external-request-mtf-wrapper-root-input',
      'external-request-mtf-wrapper-tuple',
      'external-request-data-table',
    ];
    const eligible = fallbackScriptIds.map((id) => {
      const fixture = corpus.find((candidate) => candidate.id === id);
      expect(fixture).toBeDefined();
      return fixture!;
    });
    const measurement = measureForcedCompiledRealtimeSafety(eligible.map((fixture) => ({
      scriptId: fixture.id,
      source: fixture.source,
      bars: fixture.bars ?? chartBars,
      engineOptions: fixture.engineOptions ?? defaultEngineOptions,
    })), { includeSafe: true });

    expect(measurement.scripts.map((entry) => ({
      scriptId: entry.scriptId,
      classification: entry.classification,
    }))).toEqual(fallbackScriptIds.map((scriptId) => ({
      scriptId,
      classification: 'overtrigger-matched',
    })));
    expect(measurement.updates).toHaveLength(21);
    expect(measurement.updates.every((entry) => entry.classification === 'overtrigger-matched')).toBe(true);
  });

  it('checks representative realtime re-entry output parity through requests and imports', async () => {
    const representativeIds = [
      'external-security-lower-tf-counts',
      'external-request-financial-economic',
      'external-request-mtf-wrapper-symbol-expression-param',
      'external-import-block-helper',
      'external-import-helper-in-security',
    ];
    const representative = representativeIds.map((id) => {
      const fixture = corpus.find((entry) => entry.id === id);
      expect(fixture).toBeDefined();
      return fixture!;
    });
    const measurement = await measureRealtimeReentryParity(representative.map((fixture) => ({
      scriptId: fixture.id,
      source: fixture.source,
      bars: fixture.bars ?? chartBars,
      engineOptions: fixture.engineOptions ?? defaultEngineOptions,
    })), {
      backend: REALTIME_SWEEP_BACKEND,
    });

    expect({
      backend: measurement.backend,
      totalUpdates: measurement.totalUpdates,
      workerMatched: measurement.workerMatched,
      workerMismatches: summarizeRealtimeParityMismatches(measurement.workerMismatches),
      interpreterMatched: measurement.interpreterMatched,
      interpreterMismatches: summarizeRealtimeParityMismatches(measurement.interpreterMismatches),
    }).toEqual({
      backend: REALTIME_SWEEP_BACKEND,
      totalUpdates: representative.length * 3,
      workerMatched: representative.length * 3,
      workerMismatches: [],
      interpreterMatched: representative.length * 3,
      interpreterMismatches: [],
    });
    if (REALTIME_SWEEP_BACKEND === 'closure') {
      expect(measurement.closureMatched).toBe(representative.length * 3);
      expect(measurement.closureMismatches).toEqual([]);
    }
  });

  realtimeSweepIt('tracks realtime re-entry output parity for external fixtures expected to run', async () => {
    const baseline = getProductionWorkerFallbackBaselineGroup('external-corpus').realtimeParity;
    const eligible = corpus.filter((fixture) => fixture.expectedPassed ?? true);
    const measurement = await measureRealtimeReentryParity(eligible.map((fixture) => ({
      scriptId: fixture.id,
      source: fixture.source,
      bars: fixture.bars ?? chartBars,
      engineOptions: fixture.engineOptions ?? defaultEngineOptions,
    })), {
      backend: REALTIME_SWEEP_BACKEND,
    });
    const expected = REALTIME_SWEEP_BACKEND === 'closure'
      ? {
          totalUpdates: baseline.totalUpdates,
          workerMatched: baseline.totalUpdates,
          workerMismatches: [],
          interpreterMatched: baseline.totalUpdates,
          interpreterMismatches: [],
        }
      : baseline;

    expect({
      backend: measurement.backend,
      totalUpdates: measurement.totalUpdates,
      workerMatched: measurement.workerMatched,
      workerMismatches: summarizeRealtimeParityMismatches(measurement.workerMismatches),
      interpreterMatched: measurement.interpreterMatched,
      interpreterMismatches: summarizeRealtimeParityMismatches(measurement.interpreterMismatches),
    }).toEqual({
      backend: REALTIME_SWEEP_BACKEND,
      ...expected,
    });
    if (REALTIME_SWEEP_BACKEND === 'closure') {
      expect(measurement.closureMatched).toBe(baseline.totalUpdates);
      expect(measurement.closureMismatches).toEqual([]);
    }
  }, 30_000);
});
