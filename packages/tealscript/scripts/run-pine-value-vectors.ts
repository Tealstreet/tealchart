import { existsSync, readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { parse } from '../src/parser/parser.ts';
import { checkProgram } from '../src/semantic/checker.ts';
import type { Program } from '../src/parser/ast.ts';
import type { AlertOutput, Bar, LogOutput } from '../src/runtime/context.ts';
import {
  InMemoryRequestDatafeed,
  seedCorporateAction,
  seedCurrencyRate,
  seedEconomicSeries,
  seedFinancialMetric,
} from '../src/runtime/requestDatafeed.ts';
import { executeScript } from '../src/runtime/compiledOnly.ts';
import { executeCompiled, tryCompile } from '../src/runtime/codegen/execute.ts';
import type { DrawingOutput } from '../src/runtime/drawings/types.ts';
import type { PlotOutput } from '../src/runtime/context.ts';
import type { TealscriptExecutionOptions } from '../src/runtime/types.ts';
import { pineV6ReferenceManualBuiltinNames } from '../src/compat/pineV6ReferenceManualAudit.ts';

type VectorValue = number | null;
type ExpectedDrawingValue = Record<string, unknown>;
type ExpectedPlotValue = Record<string, unknown>;
type ExpectedAlertValue = Record<string, unknown>;
type ExpectedLogValue = Record<string, unknown>;
type ValueVectorDiscriminationMutation =
  | 'truncate-first-output'
  | 'flip-first-value'
  | 'flip-first-non-null-value'
  | 'drop-first-output';

export interface ValueVectorDiscriminationProof {
  assertedLength: 'bar-count';
  mutations: readonly ValueVectorDiscriminationMutation[];
  helperFormulaCitation?: string;
}

interface ValueVectorDiscriminationExemption {
  id: string;
  rank: number;
  reason: string;
}

export interface ValueVectorCase {
  id: string;
  namespace: string;
  pine: string;
  officialMembers?: readonly string[];
  rule?: string;
  expected: (bars: Bar[]) => VectorValue[];
  expectedOutputs?: (bars: Bar[]) => VectorValue[][];
  outputMembers?: readonly (readonly string[])[];
  expectedPlots?: (bars: Bar[]) => ExpectedPlotValue[];
  expectedDrawings?: (bars: Bar[]) => ExpectedDrawingValue[];
  expectedAlerts?: (bars: Bar[]) => ExpectedAlertValue[];
  expectedLogs?: (bars: Bar[]) => ExpectedLogValue[];
  expectedDiagnostics?: readonly string[];
  discriminationProof?: ValueVectorDiscriminationProof;
  bars?: Bar[];
  options?: () => TealscriptExecutionOptions;
}

export interface ValueVectorResult {
  id: string;
  namespace: string;
  officialMembers: string[];
  bars: number;
  rule?: string;
  expected: VectorValue[];
  expectedOutputs?: VectorValue[][];
  compiled: VectorValue[] | null;
  publicPath: VectorValue[] | null;
  compiledOutputs?: VectorValue[][] | null;
  publicPathOutputs?: VectorValue[][] | null;
  expectedPlots?: ExpectedPlotValue[];
  compiledPlots?: unknown[] | null;
  publicPathPlots?: unknown[] | null;
  expectedDrawings?: ExpectedDrawingValue[];
  compiledDrawings?: unknown[] | null;
  publicPathDrawings?: unknown[] | null;
  expectedAlerts?: ExpectedAlertValue[];
  compiledAlerts?: unknown[] | null;
  publicPathAlerts?: unknown[] | null;
  expectedLogs?: ExpectedLogValue[];
  compiledLogs?: unknown[] | null;
  publicPathLogs?: unknown[] | null;
  compiledMatches: boolean;
  publicPathMatches: boolean;
  compiledMismatchBars: number[];
  publicPathMismatchBars: number[];
  compiledMismatchDetails: Array<{ bar: number; expected: VectorValue[]; actual: VectorValue[] | null }>;
  publicPathMismatchDetails: Array<{ bar: number; expected: VectorValue[]; actual: VectorValue[] | null }>;
  compiledPlotPayloadMismatch?: { expected: ExpectedPlotValue[]; actual: unknown[] | null };
  publicPathPlotPayloadMismatch?: { expected: ExpectedPlotValue[]; actual: unknown[] | null };
  compiledDrawingMismatch?: { expected: ExpectedDrawingValue[]; actual: unknown[] | null };
  publicPathDrawingMismatch?: { expected: ExpectedDrawingValue[]; actual: unknown[] | null };
  compiledAlertMismatch?: { expected: ExpectedAlertValue[]; actual: unknown[] | null };
  publicPathAlertMismatch?: { expected: ExpectedAlertValue[]; actual: unknown[] | null };
  compiledLogMismatch?: { expected: ExpectedLogValue[]; actual: unknown[] | null };
  publicPathLogMismatch?: { expected: ExpectedLogValue[]; actual: unknown[] | null };
  diagnostics: string[];
}

type ExpectedValueVectorFailureOwner =
  | 'parser'
  | 'semantic'
  | 'semantic/codegen'
  | 'runtime/strategy';

type ExpectedValueVectorFailureReason =
  | 'trace-required'
  | 'other-lane'
  | 'open-defect';

export interface ExpectedValueVectorFailure {
  ownerLane: ExpectedValueVectorFailureOwner;
  reason: ExpectedValueVectorFailureReason;
  openDefect?: string;
  cause: string;
  citation: string;
}

interface ValueVectorGateResult {
  results: ValueVectorResult[];
  expectedFailures: Record<string, ExpectedValueVectorFailure>;
  unexpectedFailures: ValueVectorResult[];
  unexpectedPasses: ValueVectorResult[];
  missingExpectedFailures: string[];
  invalidExpectedFailureMetadata: string[];
  duplicateCaseIds: string[];
  missingSourceCitations: string[];
  incompleteSourceCitations: string[];
  invalidDiscriminationProofs: string[];
}

const CLOSES = [10, 11, 13, 12, 14, 15, 13, 16, 18, 17, 19, 20];
const CURRENCY_CODES = [
  'AED', 'ARS', 'AUD', 'BDT', 'BHD', 'BRL', 'BTC', 'CAD', 'CHF', 'CLP', 'CNY', 'COP', 'CZK', 'DKK',
  'EGP', 'ETH', 'EUR', 'GBP', 'HKD', 'HUF', 'IDR', 'ILS', 'INR', 'ISK', 'JPY', 'KES', 'KRW', 'KWD',
  'LKR', 'MAD', 'MXN', 'MYR', 'NGN', 'NOK', 'NONE', 'NZD', 'PEN', 'PHP', 'PKR', 'PLN', 'QAR', 'RON',
  'RSD', 'RUB', 'SAR', 'SEK', 'SGD', 'THB', 'TND', 'TRY', 'TWD', 'USD', 'USDT', 'VES', 'VND', 'ZAR',
];
const COLOR_CONSTANT_CODES = [
  ['aqua', 0, 188, 212],
  ['black', 54, 58, 69],
  ['blue', 33, 150, 243],
  ['fuchsia', 224, 64, 251],
  ['gray', 120, 123, 134],
  ['green', 76, 175, 80],
  ['lime', 0, 230, 118],
  ['maroon', 136, 14, 79],
  ['navy', 49, 27, 146],
  ['olive', 128, 128, 0],
  ['orange', 255, 152, 0],
  ['purple', 156, 39, 176],
  ['red', 242, 54, 69],
  ['silver', 178, 181, 190],
  ['teal', 8, 153, 129],
  ['white', 255, 255, 255],
  ['yellow', 253, 216, 53],
] as const;

const OFFICIAL_VALUE_VECTOR_MEMBER_NAMES = pineV6ReferenceManualBuiltinNames();
const OFFICIAL_VALUE_VECTOR_MEMBER_SET = new Set(OFFICIAL_VALUE_VECTOR_MEMBER_NAMES);
const SOURCE_CITATION_PATTERN = /https:\/\/www\.tradingview\.com\/|TealScript local extension:/;
const VALUE_VECTOR_DISCRIMINATION_EXEMPTIONS_REPORT = 'reports/pine-value-vector-red-first-exemptions-v1.json';
const PROTECTED_VALUE_VECTOR_REPORT_PATHS = new Set([
  VALUE_VECTOR_DISCRIMINATION_EXEMPTIONS_REPORT,
  'reports/pine-value-vectors-coverage-v174.json',
]);
const VALUE_VECTOR_HELPER_NAMES = [
  'accdist',
  'alma',
  'anchoredVwapBands',
  'aroon',
  'atr',
  'bollingerBands',
  'bollingerWidth',
  'cci',
  'chandelier',
  'cmo',
  'cog',
  'dema',
  'dmi',
  'donchian',
  'ema',
  'emaValues',
  'highest',
  'highestBars',
  'hma',
  'iii',
  'keltner',
  'keltnerWidth',
  'kst',
  'linreg',
  'lowest',
  'lowestBars',
  'macd',
  'median',
  'mfi',
  'mfiFromSource',
  'nvi',
  'obv',
  'obvWithSourceVolume',
  'percentagePriceOscillator',
  'pvi',
  'pvt',
  'rma',
  'rocValues',
  'rsi',
  'sma',
  'smaValues',
  'stdev',
  'stdevUnbiased',
  'stochastic',
  'supertrend',
  'swma',
  'tema',
  'tripleExponentialAverageOscillator',
  'tsi',
  'variance',
  'varianceUnbiased',
  'wad',
  'williamsR',
  'wma',
  'wmaValues',
  'wvad',
] as const;
const HELPER_FORMULA_KEYWORD_PATTERN = /\b(formula|composition|equivalent implementation|manual-specified|published expression|reference composition|published source|source uses)\b/i;
const URL_PATTERN = /https:\/\/\S+/;
const TA_HIGHEST_FORMULA_CITATION = 'Published formula: TradingView v6 Reference defines ta.highest(source, length) as the highest source value over length bars, with na values ignored so the calculation uses length non-na source values. https://www.tradingview.com/pine-script-reference/v6/#fun_ta.highest';
const TA_LOWEST_FORMULA_CITATION = 'Published formula: TradingView v6 Reference defines ta.lowest(source, length) as the lowest source value over length bars, with na values ignored so the calculation uses length non-na source values. https://www.tradingview.com/pine-script-reference/v6/#fun_ta.lowest';
const TA_RMA_FORMULA_CITATION = 'Published formula: TradingView v6 Reference defines ta.rma(source, length) as alpha * source + (1 - alpha) * prior rma with alpha = 1 / length, seeded by ta.sma(source, length). https://www.tradingview.com/pine-script-reference/v6/#fun_ta.rma';
const TA_SMA_FORMULA_CITATION = 'Published formula: TradingView v6 Reference defines ta.sma(source, length) as the arithmetic mean of the last length source values, ignoring na so it calculates on length non-na values. https://www.tradingview.com/pine-script-reference/v6/#fun_ta.sma';
const TA_EMA_FORMULA_CITATION = 'Published formula: TradingView v6 Reference defines ta.ema(source, length) with alpha = 2 / (length + 1); its equivalent implementation seeds the recursive sum from the first non-na source value, then applies alpha * source + (1 - alpha) * prior ema. https://www.tradingview.com/pine-script-reference/v6/#fun_ta.ema';
const TA_ATR_FORMULA_CITATION = `Published composition: TradingView v6 Reference defines ta.atr(length) as ta.rma(trueRange, length), where true range is max(high - low, abs(high - close[1]), abs(low - close[1])) and the first bar uses high - low. ${TA_RMA_FORMULA_CITATION} https://www.tradingview.com/pine-script-reference/v6/#fun_ta.atr`;
const TA_RSI_FORMULA_CITATION = `Published composition: TradingView v6 Reference defines ta.rsi(source, length) from ta.rma of upward and downward source changes, then 100 - 100 / (1 + rma(up) / rma(down)). ${TA_RMA_FORMULA_CITATION} https://www.tradingview.com/pine-script-reference/v6/#fun_ta.rsi`;
const TA_EXTREMA_VALUE_DISCRIMINATION = {
  assertedLength: 'bar-count',
  mutations: ['flip-first-value'],
} as const;
const TA_MOVING_AVERAGE_SEED_DISCRIMINATION = {
  assertedLength: 'bar-count',
  mutations: ['flip-first-non-null-value'],
} as const;
const TA_RMA_SEED_DISCRIMINATION = {
  assertedLength: 'bar-count',
  mutations: ['flip-first-non-null-value'],
  helperFormulaCitation: TA_RMA_FORMULA_CITATION,
} as const;
const LIVE_REFERENCE_ROOT = 'https://www.tradingview.com/pine-script-reference/v6/';
const BUILT_INS_DOCS_URL = 'https://www.tradingview.com/pine-script-docs/language/built-ins/';
const TIME_SERIES_DOCS_URL = 'https://www.tradingview.com/pine-script-docs/language/time-series/';
const FUNCTIONS_FAQ_URL = 'https://www.tradingview.com/pine-script-docs/faq/functions/';
const EXTREMA_BARS_OFFSET_RULE = 'PineCoders FAQ states highestbars()/lowestbars() return negative offsets, and TradingView/ta/7 aroon() source uses highestbars/lowestbars + length, requiring negative-or-zero offsets. https://www.pinecoders.com/faq_and_code/ https://www.tradingview.com/pine-script-reference/v6/';
const LIBRARIES_DOCS_URL = 'https://www.tradingview.com/pine-script-docs/concepts/libraries/';
const VARIABLE_DECLARATIONS_DOCS_URL = 'https://www.tradingview.com/pine-script-docs/language/variable-declarations/';
const EXECUTION_MODEL_DOCS_URL = 'https://www.tradingview.com/pine-script-docs/language/execution-model/';
const USER_DEFINED_FUNCTIONS_DOCS_URL = 'https://www.tradingview.com/pine-script-docs/language/user-defined-functions/';
const OPERATORS_DOCS_URL = 'https://www.tradingview.com/pine-script-docs/language/operators/';
const ARRAYS_DOCS_URL = 'https://www.tradingview.com/pine-script-docs/language/arrays/';
const MAPS_DOCS_URL = 'https://www.tradingview.com/pine-script-docs/language/maps/';
const MATRICES_DOCS_URL = 'https://www.tradingview.com/pine-script-docs/language/matrices/';
const STRATEGIES_DOCS_URL = 'https://www.tradingview.com/pine-script-docs/concepts/strategies/';
const STRATEGIES_FAQ_URL = 'https://www.tradingview.com/pine-script-docs/faq/strategies/';
const TYPE_SYSTEM_DOCS_URL = 'https://www.tradingview.com/pine-script-docs/language/type-system/';
const STRINGS_DOCS_URL = 'https://www.tradingview.com/pine-script-docs/concepts/strings/';
const TA_LEGACY_RULE = `TradingView v6 Reference Manual and language docs: TA functions and variables define formulas, equivalent implementations, ranges, signatures and missing-value notes; time-series and FAQ pages define series/history and length constraints used by this hand-derived expectation. ${LIVE_REFERENCE_ROOT} ${BUILT_INS_DOCS_URL} ${TIME_SERIES_DOCS_URL} ${FUNCTIONS_FAQ_URL}`;
const TRADINGVIEW_TA_LIBRARY_RULE = `TradingView published library documentation: TradingView/ta exported helpers define the formulas and state updates used by this hand-derived expectation. https://www.tradingview.com/script/BICzyhq0-ta/ ${LIBRARIES_DOCS_URL}`;
const LANGUAGE_LEGACY_RULE = `TradingView v6 language documentation: variable declarations, execution model, functions, operators, type-system and time-series semantics define the hand-derived expectation. ${VARIABLE_DECLARATIONS_DOCS_URL} ${EXECUTION_MODEL_DOCS_URL} ${USER_DEFINED_FUNCTIONS_DOCS_URL} ${OPERATORS_DOCS_URL} ${TYPE_SYSTEM_DOCS_URL} ${TIME_SERIES_DOCS_URL}`;
const ARRAY_LEGACY_RULE = `TradingView v6 Arrays and Operators documentation: arrays are reference-type collections, var arrays persist across bars, and history references read prior series values. ${ARRAYS_DOCS_URL} ${OPERATORS_DOCS_URL}`;
const MATH_LEGACY_RULE = `TradingView v6 Reference Manual: math.* functions define the numeric operation used by this hand-derived expectation. ${LIVE_REFERENCE_ROOT}`;
const STRING_LEGACY_RULE = `TradingView v6 Strings and Reference Manual: str.* functions define the string operation used by this hand-derived expectation. ${STRINGS_DOCS_URL} ${LIVE_REFERENCE_ROOT}`;

export const BARS: Bar[] = CLOSES.map((close, index) => ({
  time: 1_700_000_000_000 + index * 60_000,
  open: close - 0.5,
  high: close + 1,
  low: close - 1,
  close,
  volume: 100 + index * 10,
}));
const QUOTE_BARS: Bar[] = BARS.map((bar, index) => ({
  ...bar,
  bid: bar.close - 0.25 - index * 0.01,
  ask: bar.close + 0.25 + index * 0.01,
}));

function makeBars(closes: number[], volumeStart = 100): Bar[] {
  return closes.map((close, index) => ({
    time: 1_700_100_000_000 + index * 60_000,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: volumeStart + index * 10,
  }));
}

const HOSTILE_BARS = makeBars([0, -2, 0, 2, -1, 3, 0, -3, 1, 0, -2, 2]);
const FLAT_BARS = makeBars(Array.from({ length: 8 }, () => 0));
const LONG_BARS = makeBars(Array.from({ length: 256 }, (_value, index) =>
  Math.sin(index * 0.37) * 7 + (index % 11) - 5,
));
const LEADING_NA_BARS = HOSTILE_BARS.map((bar, index) => index === 0
  ? { ...bar, open: Number.NaN, high: Number.NaN, low: Number.NaN, close: Number.NaN, volume: Number.NaN }
  : bar);
const HOLE_BARS = HOSTILE_BARS.map((bar, index) => index === 5
  ? { ...bar, high: Number.NaN, low: Number.NaN, close: Number.NaN }
  : bar);
const MULTI_HOLE_BARS = HOSTILE_BARS.map((bar, index) => [2, 7, 10].includes(index)
  ? { ...bar, high: Number.NaN, low: Number.NaN, close: Number.NaN }
  : bar);
const ALL_NA_BARS = HOSTILE_BARS.map((bar) => ({
  ...bar,
  open: Number.NaN,
  high: Number.NaN,
  low: Number.NaN,
  close: Number.NaN,
  volume: Number.NaN,
}));
const LONG_HOLE_BARS = LONG_BARS.map((bar, index) => [17, 64, 129, 211].includes(index)
  ? { ...bar, high: Number.NaN, low: Number.NaN, close: Number.NaN }
  : bar);
const DAILY_BARS = makeBars([100, 101, 103, 99, 104, 108, 107, 111, 115, 113, 117, 121])
  .map((bar, index) => ({ ...bar, time: 1_700_000_000_000 + index * 86_400_000 }));
const NVI_BARS = HOSTILE_BARS.map((bar, index) => ({
  ...bar,
  volume: [100, 80, 120, 90, 70, 140, 60, 110, 50, 130, 40, 100][index]!,
}));
const NVI_LEADING_NA_BARS = NVI_BARS.map((bar, index) => index === 0
  ? { ...bar, open: Number.NaN, high: Number.NaN, low: Number.NaN, close: Number.NaN, volume: Number.NaN }
  : bar);
const NVI_HOLE_BARS = NVI_BARS.map((bar, index) => index === 5
  ? { ...bar, high: Number.NaN, low: Number.NaN, close: Number.NaN }
  : bar);
const NVI_ALL_NA_BARS = NVI_BARS.map((bar) => ({
  ...bar,
  open: Number.NaN,
  high: Number.NaN,
  low: Number.NaN,
  close: Number.NaN,
  volume: Number.NaN,
}));
const ZERO_RANGE_BARS = HOSTILE_BARS.map((bar, index) => index === 3
  ? { ...bar, high: bar.close, low: bar.close }
  : bar);
const ZERO_SPREAD_BARS = HOSTILE_BARS.map((bar) => ({
  ...bar,
  high: bar.close,
  low: bar.close,
}));
const ZERO_SPREAD_FLAT_BARS = FLAT_BARS.map((bar) => ({
  ...bar,
  high: bar.close,
  low: bar.close,
}));
const MFI_CLEAN_BARS = [
  { open: 9, high: 12, low: 8, close: 10, volume: 100 },
  { open: 10, high: 14, low: 9, close: 11, volume: 120 },
  { open: 11, high: 13, low: 7, close: 9, volume: 90 },
  { open: 9, high: 16, low: 10, close: 13, volume: 150 },
  { open: 13, high: 15, low: 6, close: 8, volume: 110 },
  { open: 8, high: 18, low: 12, close: 15, volume: 160 },
].map((bar, index) => ({
  ...bar,
  time: 1_700_300_000_000 + index * 60_000,
}));
const PLATEAU_BARS = makeBars([1, 3, 3, 2, 3, 1, 1, 4, 4, 2, 4, 0]);
const STRATEGY_BARS: Bar[] = [100, 105, 110, 120].map((close, index) => ({
  time: (index + 1) * 60_000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 100 + index,
}));
const STRATEGY_LEDGER_ORACLE_BARS: Bar[] = [100, 110, 105, 120].map((close, index) => ({
  time: (index + 1) * 60_000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 100 + index,
}));
const STRATEGY_RISK_LOSS_BARS: Bar[] = [100, 90, 110, 120].map((close, index) => ({
  time: (index + 1) * 60_000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 100 + index,
}));
const STRATEGY_TIMING_BARS: Bar[] = [
  { time: 60_000, open: 90, high: 100, low: 90, close: 100, volume: 100 },
  { time: 120_000, open: 107, high: 110, low: 107, close: 110, volume: 100 },
  { time: 180_000, open: 105, high: 120, low: 105, close: 120, volume: 100 },
];
const STRATEGY_OCA_BARS: Bar[] = [
  { time: 60_000, open: 100, high: 100, low: 100, close: 100, volume: 100 },
  { time: 120_000, open: 100, high: 100, low: 100, close: 100, volume: 100 },
  { time: 180_000, open: 99, high: 100, low: 99, close: 100, volume: 100 },
  { time: 240_000, open: 98, high: 100, low: 98, close: 100, volume: 100 },
  { time: 300_000, open: 98, high: 100, low: 98, close: 100, volume: 100 },
];
const STRATEGY_EXIT_BARS: Bar[] = [
  { time: 1, open: 100, high: 100, low: 100, close: 100, volume: 100 },
  { time: 2, open: 100, high: 100, low: 100, close: 100, volume: 100 },
  { time: 3, open: 100, high: 102, low: 99, close: 100, volume: 100 },
  { time: 4, open: 100, high: 100, low: 100, close: 100, volume: 100 },
];
const STRATEGY_ACCESSOR_BARS: Bar[] = [100, 110, 105, 101, 108, 108, 106, 104].map((close, index) => ({
  time: (index + 1) * 60_000,
  open: close,
  high: close + 2,
  low: close - 2,
  close,
  volume: 1_000 + index,
}));
const STRATEGY_PYRAMIDING_BARS: Bar[] = [100, 105, 110, 115].map((close, index) => ({
  time: (index + 1) * 60_000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1_000 + index,
}));
const STRATEGY_LIMIT_CANCEL_BARS: Bar[] = [
  { time: 1, open: 100, high: 100, low: 100, close: 100, volume: 100 },
  { time: 2, open: 100, high: 105, low: 85, close: 100, volume: 100 },
  { time: 3, open: 100, high: 100, low: 100, close: 100, volume: 100 },
];
const STRATEGY_LIMIT_VERIFY_BARS: Bar[] = [
  { time: 1, open: 101, high: 101, low: 101, close: 101, volume: 100 },
  { time: 2, open: 101, high: 102, low: 99, close: 101, volume: 100 },
  { time: 3, open: 101, high: 102, low: 98, close: 101, volume: 100 },
  { time: 4, open: 101, high: 101, low: 101, close: 101, volume: 100 },
];
const STRATEGY_HISTORY_TICK_BARS: Bar[] = [100, 105].map((price, index) => ({
  time: (index + 1) * 60_000,
  open: price,
  high: price + 2,
  low: price - 1,
  close: price + 1,
  volume: 1_000 + index,
}));
const CALENDAR_BARS: Bar[] = [
  Date.UTC(2024, 0, 1, 9, 30, 15),
  Date.UTC(2024, 0, 1, 16, 30, 45),
  Date.UTC(2024, 0, 2, 10, 5, 30),
].map((time, index) => ({
  time,
  open: 100 + index,
  high: 101 + index,
  low: 99 + index,
  close: 100.5 + index,
  volume: 1_000 + index,
}));
const SESSION_BARS: Bar[] = [
  Date.UTC(2024, 0, 2, 9, 0),
  Date.UTC(2024, 0, 2, 9, 30),
  Date.UTC(2024, 0, 2, 15, 30),
  Date.UTC(2024, 0, 2, 16, 30),
].map((time, index) => ({
  time,
  open: 100 + index,
  high: 101 + index,
  low: 99 + index,
  close: 100.5 + index,
  volume: 1_000 + index,
}));
const RUNTIME_METADATA_OPTIONS: TealscriptExecutionOptions = {
  runtime: {
    syminfo: {
      ticker: 'BINANCE:BTCUSDT',
      tickerid: 'BINANCE:BTCUSDT',
      main_tickerid: 'BINANCE:BTCUSDT',
      exchange: 'BINANCE',
      root: 'BTCUSDT',
      prefix: 'BINANCE',
      description: 'Bitcoin TetherUS',
      type: 'crypto',
      session: '24x7',
      country: 'US',
      sector: 'Technology',
      industry: 'Crypto',
      isin: 'TESTISIN',
      current_contract: '',
      currency: 'USDT',
      basecurrency: 'BTC',
      mintick: 0.1,
      pricescale: 10,
      pointvalue: 1,
      mincontract: 0.001,
      volumetype: 'base',
      expiration_date: 0,
      employees: 0,
      shareholders: 0,
      shares_outstanding_float: 0,
      shares_outstanding_total: 0,
      recommendations_date: 0,
      target_price_date: 0,
      target_price_average: 0,
      target_price_estimates: 0,
      target_price_high: 0,
      target_price_low: 0,
      target_price_median: 0,
      timezone: 'Etc/UTC',
    },
    timeframe: {
      period: '5',
      multiplier: 5,
      isminutes: true,
      isdaily: false,
      isweekly: false,
      ismonthly: false,
      isintraday: true,
      isseconds: false,
      isticks: false,
    },
  },
};
const SESSION_OPTIONS: TealscriptExecutionOptions = {
  runtime: {
    syminfo: {
      ...RUNTIME_METADATA_OPTIONS.runtime!.syminfo!,
      timezone: 'Etc/UTC',
    },
    timeframe: {
      period: '60',
      multiplier: 60,
      isminutes: true,
      isdaily: false,
      isweekly: false,
      ismonthly: false,
      isintraday: true,
      isseconds: false,
      isticks: false,
    },
    session: {
      regular: '0930-1600',
      premarket: '0400-0929',
      postmarket: '1601-2000',
      timezone: 'Etc/UTC',
    },
  },
};
const CHART_CONTEXT_OPTIONS: TealscriptExecutionOptions = {
  runtime: {
    chart: {
      bgColor: '#102030',
      fgColor: '#ABCDEF',
      type: 'kagi',
      leftVisibleBarTime: BARS[2]!.time,
      rightVisibleBarTime: BARS[8]!.time,
    },
  },
};
const REQUEST_CHART_BARS: Bar[] = [
  { time: 100, open: 10, high: 12, low: 9, close: 11, volume: 100 },
  { time: 200, open: 11, high: 13, low: 10, close: 12, volume: 110 },
  { time: 300, open: 12, high: 14, low: 11, close: 13, volume: 120 },
  { time: 400, open: 13, high: 15, low: 12, close: 14, volume: 130 },
  { time: 500, open: 14, high: 16, low: 13, close: 15, volume: 140 },
  { time: 600, open: 15, high: 17, low: 14, close: 16, volume: 150 },
];
const REQUEST_HTF_BARS: Bar[] = [
  { time: 100, open: 10, high: 13, low: 9, close: 12, volume: 210 },
  { time: 300, open: 12, high: 15, low: 11, close: 14, volume: 250 },
  { time: 500, open: 14, high: 17, low: 13, close: 16, volume: 290 },
];
const REQUEST_LOWER_CHART_BARS: Bar[] = [
  { time: 0, open: 10, high: 15, low: 9, close: 12, volume: 100 },
  { time: 120_000, open: 20, high: 25, low: 19, close: 22, volume: 110 },
  { time: 240_000, open: 30, high: 35, low: 29, close: 32, volume: 120 },
];
const REQUEST_LOWER_TF_BARS: Bar[] = [
  { time: 0, open: 10, high: 13, low: 10, close: 11, volume: 50 },
  { time: 60_000, open: 12, high: 15, low: 11, close: 13, volume: 55 },
  { time: 120_000, open: 20, high: 24, low: 19, close: 21, volume: 60 },
  { time: 180_000, open: 23, high: 27, low: 22, close: 24, volume: 65 },
  { time: 240_000, open: 30, high: 33, low: 30, close: 31, volume: 70 },
  { time: 300_000, open: 32, high: 36, low: 31, close: 34, volume: 75 },
];
const VERSION_RULE_SESSION_BARS: Bar[] = [
  Date.UTC(2024, 0, 7, 14, 30),
  Date.UTC(2024, 0, 8, 14, 30),
  Date.UTC(2024, 0, 9, 14, 30),
].map((time, index) => ({
  time,
  open: 100 + index,
  high: 101 + index,
  low: 99 + index,
  close: 100 + index,
  volume: 1_000 + index,
}));

function requestDatafeed(): InMemoryRequestDatafeed {
  return new InMemoryRequestDatafeed([
    { symbol: 'TEST', timeframe: 'D', bars: REQUEST_HTF_BARS },
    { symbol: 'TEST', timeframe: '1', bars: REQUEST_LOWER_TF_BARS },
    { symbol: 'AAA', timeframe: 'D', bars: REQUEST_HTF_BARS.map((bar) => ({ ...bar, close: bar.close + 100 })) },
    { symbol: 'BBB', timeframe: 'D', bars: REQUEST_HTF_BARS.map((bar) => ({ ...bar, close: bar.close + 200 })) },
  ]);
}

function requestPointDatafeed(): InMemoryRequestDatafeed {
  return new InMemoryRequestDatafeed([
    { symbol: 'TEST', timeframe: 'D', bars: REQUEST_HTF_BARS },
  ], [], [
    seedCurrencyRate('USD', 'JPY', [
      { time: REQUEST_CHART_BARS[0]!.time, value: 150 },
      { time: REQUEST_CHART_BARS[3]!.time, value: 151 },
    ]),
  ], [
    seedEconomicSeries('US', 'GDP', [
      { time: REQUEST_CHART_BARS[0]!.time, value: 3.1 },
      { time: REQUEST_CHART_BARS[3]!.time, value: 3.3 },
    ]),
  ], [
    seedCorporateAction('dividends', 'NASDAQ:AAPL', [
      { time: REQUEST_CHART_BARS[1]!.time, value: { kind: 'dividends', gross: 0.24, net: 0.2 } },
      { time: REQUEST_CHART_BARS[4]!.time, value: { kind: 'dividends', gross: 0.25, net: 0.21 } },
    ], 'USD'),
    seedCorporateAction('earnings', 'NASDAQ:AAPL', [
      { time: REQUEST_CHART_BARS[0]!.time, value: { kind: 'earnings', actual: 1.5, standardized: 1.45 } },
      { time: REQUEST_CHART_BARS[4]!.time, value: { kind: 'earnings', actual: 1.8, standardized: 1.75 } },
    ], 'USD'),
    seedCorporateAction('splits', 'NASDAQ:AAPL', [
      { time: REQUEST_CHART_BARS[3]!.time, value: { kind: 'splits', numerator: 2, denominator: 1 } },
    ]),
  ], [
    seedFinancialMetric('NASDAQ:AAPL', 'TOTAL_REVENUE', 'FQ', [
      { time: REQUEST_CHART_BARS[0]!.time, value: 1000 },
      { time: REQUEST_CHART_BARS[4]!.time, value: 1100 },
    ], 'USD'),
  ]);
}

export const EXPECTED_VALUE_VECTOR_FAILURES: Record<string, ExpectedValueVectorFailure> = {
  'strategy.calc-on-order-fills-values': {
    ownerLane: 'runtime/strategy',
    reason: 'trace-required',
    cause: 'calc_on_order_fills=true is trace-required and currently rejected because fill-triggered strategy re-entry is not simulated.',
    citation: 'TradingView v6 Strategies: calc_on_order_fills=true recalculates the strategy immediately after an order fills. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
  },
};

function pine(body: string): string {
  return `//@version=6\nindicator("value vector")\nplot(${body})`;
}

function pineWithImport(version: number, body: string): string {
  return `//@version=6\nimport TradingView/ta/${version} as tvta\nindicator("value vector")\nplot(${body})`;
}

function singleTargetProxyCase(id: string, namespace: string, member: string, expression: string, rule: string): ValueVectorCase {
  return {
    id,
    namespace,
    pine: pine(`${expression} ? 1 : 0`),
    officialMembers: [member],
    outputMembers: [[member]],
    rule,
    expected: (bars: Bar[]) => constantVector(bars, 1),
    bars: HOSTILE_BARS,
  };
}

function singleTargetConstantCase(member: string, value: string, rule: string): ValueVectorCase {
  const namespace = member.split('.')[0] ?? 'runtime';
  return singleTargetProxyCase(
    `property.single.${member}`,
    namespace,
    member,
    `${member} == "${value}"`,
    rule,
  );
}

function singleTargetNumericConstantCase(member: string, value: number, rule: string): ValueVectorCase {
  const namespace = member.split('.')[0] ?? 'runtime';
  return singleTargetProxyCase(
    `property.single.${member}`,
    namespace,
    member,
    `${member} == ${value}`,
    rule,
  );
}

function singleTargetConstantCases(rows: readonly (readonly [string, string, string])[]): ValueVectorCase[] {
  return rows.map(([member, value, rule]) => singleTargetConstantCase(member, value, rule));
}

const TA_INVALID_LENGTH_DIAGNOSTIC = 'must be a positive integer';
const TA_INVALID_LENGTH_RULE = 'TradingView Pine Script FAQ: TA function lengths cannot be zero and must be kept at a minimum of one; reference signatures type length parameters as int/simple int, so zero, negative, fractional and non-finite lengths are invalid rather than coerced. https://www.tradingview.com/pine-script-docs/faq/functions/ https://www.tradingview.com/pine-script-reference/v6/';
const TA_INVALID_LENGTH_VALUES = [
  ['zero', '0'],
  ['negative', '-1'],
  ['fractional', '1.5'],
  ['nonfinite', 'na'],
] as const;
const TA_LENGTH_REJECTION_TEMPLATES = [
  ['adx.diLength', 'plot(ta.adx(LENGTH, 3))'],
  ['adx.adxSmoothing', 'plot(ta.adx(3, LENGTH))'],
  ['alma', 'plot(ta.alma(close, LENGTH, 0.5, 6))'],
  ['atr', 'plot(ta.atr(LENGTH))'],
  ['bb', '[basis, upper, lower] = ta.bb(close, LENGTH, 2)\nplot(basis)'],
  ['bbw', 'plot(ta.bbw(close, LENGTH, 2))'],
  ['cci', 'plot(ta.cci(close, LENGTH))'],
  ['change', 'plot(ta.change(close, LENGTH))'],
  ['cmo', 'plot(ta.cmo(close, LENGTH))'],
  ['cog', 'plot(ta.cog(close, LENGTH))'],
  ['correlation', 'plot(ta.correlation(close, volume, LENGTH))'],
  ['covariance', 'plot(ta.covariance(close, volume, LENGTH))'],
  ['dema', 'plot(ta.dema(close, LENGTH))'],
  ['dev', 'plot(ta.dev(close, LENGTH))'],
  ['dmi.diLength', '[plus, minus, adx] = ta.dmi(LENGTH, 3)\nplot(plus)'],
  ['dmi.adxSmoothing', '[plus, minus, adx] = ta.dmi(3, LENGTH)\nplot(adx)'],
  ['ema', 'plot(ta.ema(close, LENGTH))'],
  ['falling', 'plot(ta.falling(close, LENGTH) ? 1 : 0)'],
  ['highest', 'plot(ta.highest(high, LENGTH))'],
  ['highestbars', 'plot(ta.highestbars(close, LENGTH))'],
  ['hma', 'plot(ta.hma(close, LENGTH))'],
  ['kc', '[basis, upper, lower] = ta.kc(close, LENGTH, 1.5)\nplot(basis)'],
  ['kcw', 'plot(ta.kcw(close, LENGTH, 1.5))'],
  ['kst.roclength1', '[line, signal] = ta.kst(close, LENGTH, 15, 20, 30, 10, 10, 10, 15, 9)\nplot(line)'],
  ['kst.roclength2', '[line, signal] = ta.kst(close, 10, LENGTH, 20, 30, 10, 10, 10, 15, 9)\nplot(line)'],
  ['kst.roclength3', '[line, signal] = ta.kst(close, 10, 15, LENGTH, 30, 10, 10, 10, 15, 9)\nplot(line)'],
  ['kst.roclength4', '[line, signal] = ta.kst(close, 10, 15, 20, LENGTH, 10, 10, 10, 15, 9)\nplot(line)'],
  ['kst.smalen1', '[line, signal] = ta.kst(close, 10, 15, 20, 30, LENGTH, 10, 10, 15, 9)\nplot(line)'],
  ['kst.smalen2', '[line, signal] = ta.kst(close, 10, 15, 20, 30, 10, LENGTH, 10, 15, 9)\nplot(line)'],
  ['kst.smalen3', '[line, signal] = ta.kst(close, 10, 15, 20, 30, 10, 10, LENGTH, 15, 9)\nplot(line)'],
  ['kst.smalen4', '[line, signal] = ta.kst(close, 10, 15, 20, 30, 10, 10, 10, LENGTH, 9)\nplot(line)'],
  ['kst.signalLength', '[line, signal] = ta.kst(close, 10, 15, 20, 30, 10, 10, 10, 15, LENGTH)\nplot(signal)'],
  ['linreg', 'plot(ta.linreg(close, LENGTH, 0))'],
  ['lowest', 'plot(ta.lowest(low, LENGTH))'],
  ['lowestbars', 'plot(ta.lowestbars(close, LENGTH))'],
  ['median', 'plot(ta.median(close, LENGTH))'],
  ['mfi', 'plot(ta.mfi(close, LENGTH))'],
  ['mode', 'plot(ta.mode(close, LENGTH))'],
  ['mom', 'plot(ta.mom(close, LENGTH))'],
  ['percentile_linear_interpolation', 'plot(ta.percentile_linear_interpolation(close, LENGTH, 50))'],
  ['percentile_nearest_rank', 'plot(ta.percentile_nearest_rank(close, LENGTH, 75))'],
  ['percentrank', 'plot(ta.percentrank(close, LENGTH))'],
  ['range', 'plot(ta.range(close, LENGTH))'],
  ['rci', 'plot(ta.rci(close, LENGTH))'],
  ['rising', 'plot(ta.rising(close, LENGTH) ? 1 : 0)'],
  ['rma', 'plot(ta.rma(close, LENGTH))'],
  ['roc', 'plot(ta.roc(close, LENGTH))'],
  ['rsi', 'plot(ta.rsi(close, LENGTH))'],
  ['sma', 'plot(ta.sma(close, LENGTH))'],
  ['smma', 'plot(ta.smma(close, LENGTH))'],
  ['stdev', 'plot(ta.stdev(close, LENGTH))'],
  ['stoch', 'plot(ta.stoch(close, high, low, LENGTH))'],
  ['sum', 'plot(ta.sum(close, LENGTH))'],
  ['supertrend.atrPeriod', '[trend, direction] = ta.supertrend(2, LENGTH)\nplot(trend)'],
  ['tema', 'plot(ta.tema(close, LENGTH))'],
  ['tsi.short_length', 'plot(ta.tsi(close, LENGTH, 5))'],
  ['tsi.long_length', 'plot(ta.tsi(close, 3, LENGTH))'],
  ['variance', 'plot(ta.variance(close, LENGTH))'],
  ['vwma', 'plot(ta.vwma(close, LENGTH))'],
  ['wma', 'plot(ta.wma(close, LENGTH))'],
  ['wpr', 'plot(ta.wpr(LENGTH))'],
] as const;

function taInvalidLengthCases(): ValueVectorCase[] {
  return TA_LENGTH_REJECTION_TEMPLATES.flatMap(([name, template]) =>
    TA_INVALID_LENGTH_VALUES.map(([kind, value]) => ({
      id: `ta.invalid-length.${name}.${kind}`,
      namespace: 'ta',
      pine: `//@version=6\nindicator("TA invalid length ${name} ${kind}")\n${template.replaceAll('LENGTH', value)}`,
      rule: TA_INVALID_LENGTH_RULE,
      expected: nullVector,
      expectedDiagnostics: [TA_INVALID_LENGTH_DIAGNOSTIC],
      bars: HOSTILE_BARS,
    })));
}

const ARRAY_SLICE_DOMAIN_RULE = 'TradingView v6 Arrays: array.slice() uses a half-open range from index_from inclusive to index_to exclusive. A descending range has no documented meaning and should fail loudly rather than silently dropping output. https://www.tradingview.com/pine-script-docs/language/arrays/ https://www.tradingview.com/pine-script-reference/v6/#fun_array.slice';
const ARRAY_SLICE_DOMAIN_DIAGNOSTIC = "Index 'from' should be less than index 'to'";
const ARRAY_PERCENTILE_PERCENTAGE_TYPE_RULE = `TradingView v6 Reference Manual: array.percentile_* percentage is declared as series int/float. Pine type-system docs document automatic int-to-float casts and require incompatible builtin argument types to fail at compile time rather than coerce strings. ${LIVE_REFERENCE_ROOT} ${TYPE_SYSTEM_DOCS_URL}`;
const BUILTIN_QUALIFIER_RULE = `TradingView Pine type-system docs: qualifiers form const < input < simple < series. A builtin parameter requiring simple cannot accept a series value, and a builtin parameter requiring const cannot accept input or series values. ${TYPE_SYSTEM_DOCS_URL}`;

function inputDomainDiagnosticCases(): ValueVectorCase[] {
  return [
    {
      id: 'domain.array-slice-descending-range-rejection',
      namespace: 'array',
      pine: `//@version=6
indicator("array slice descending range rejection")
values = array.from(1.0, 2.0)
window = array.slice(values, 2, 1)
plot(array.size(window))`,
      rule: ARRAY_SLICE_DOMAIN_RULE,
      expected: nullVector,
      expectedDiagnostics: [ARRAY_SLICE_DOMAIN_DIAGNOSTIC],
    },
    {
      id: 'semantic.array-percentile-string-percentage-rejection',
      namespace: 'array',
      pine: `//@version=6
indicator("array percentile string percentage rejection")
values = array.from(1, 2, 3)
nearest = array.percentile_nearest_rank(values, "50")
linear = array.percentile_linear_interpolation(id=values, percentage="50")
plot(nearest + linear)`,
      rule: ARRAY_PERCENTILE_PERCENTAGE_TYPE_RULE,
      expected: nullVector,
      expectedDiagnostics: [
        'array.percentile_nearest_rank percentage must be a number, got string',
        'array.percentile_linear_interpolation percentage must be a number, got string',
      ],
    },
    {
      id: 'semantic.builtin-argument-qualifier-rejection',
      namespace: 'semantic',
      pine: `//@version=6
indicator("builtin argument qualifier rejection")
dynamicLength = bar_index + 1
taValue = ta.ema(close, dynamicLength)
base = input.int(10)
badInput = input.int(base)
badSeries = input.float(close)
plot(taValue + badInput + badSeries)`,
      rule: BUILTIN_QUALIFIER_RULE,
      expected: nullVector,
      expectedDiagnostics: [
        "Cannot pass series value to simple parameter 'length' for ta.ema",
        "Cannot pass input value to const parameter 'defval' for input.int",
        "Cannot pass series value to const parameter 'defval' for input.float",
      ],
    },
    {
      id: 'semantic.ta-sma-series-length-accepted',
      namespace: 'semantic',
      pine: `//@version=6
indicator("TA SMA series length accepted")
dynamicLength = int(math.max(1, bar_index % 3 + 1))
plot(ta.sma(close, dynamicLength))`,
      rule: 'TradingView live v5/v6 reference bundle lists ta.sma:length allowedTypeIDs as series int, simple int, input int, and const int; series length is documented for ta.sma and must not trip the simple-parameter diagnostic. https://www.tradingview.com/pine-script-reference/v6/#fun_ta.sma',
      expected: (bars) => bars.map((bar, index) => {
        const length = Math.max(1, index % 3 + 1);
        if (index + 1 < length) return null;
        const window = bars.slice(index - length + 1, index + 1).map((entry) => entry.close);
        return window.reduce((sum, value) => sum + value, 0) / length;
      }),
      discriminationProof: {
        assertedLength: 'bar-count',
        mutations: ['flip-first-non-null-value'],
      },
    },
  ];
}

function boundsInvariantPine(title: string, expression: string, lower: number, upper: number): string {
  return `//@version=6
indicator("${title}")
value = ${expression}
plot(na(value) or (value >= ${lower} and value <= ${upper}) ? 1 : 0)`;
}

const TA_III_RULE = 'TradingView v6 Reference: ta.iii is defined by the published expression ((2 * close - high - low) / (high - low)) * volume. Missing inputs and zero denominators follow ordinary Pine arithmetic for that expression. https://www.tradingview.com/pine-script-reference/v6/#var_ta.iii';
const TA_NVI_RULE = 'TradingView v6 Reference: ta.nvi includes an equivalent implementation with a 1.0 seed, previous-value carry, volume-decrease update branch, and hold-on-no-change branch. https://www.tradingview.com/pine-script-reference/v6/#var_ta.nvi';
const TA_OBV_RULE = 'TradingView v6 Reference: ta.obv is defined by the published composition ta.cum(math.sign(ta.change(close)) * volume). https://www.tradingview.com/pine-script-reference/v6/#var_ta.obv';
const TA_PVI_RULE = 'TradingView v6 Reference: ta.pvi includes an equivalent implementation with a 1.0 seed, previous-value carry, volume-increase update branch, and hold-on-no-change branch. https://www.tradingview.com/pine-script-reference/v6/#var_ta.pvi';
const TA_PVT_RULE = 'TradingView v6 Reference: ta.pvt is defined by the published composition ta.cum((ta.change(close) / close[1]) * volume). https://www.tradingview.com/pine-script-reference/v6/#var_ta.pvt';
const TA_WAD_RULE = 'TradingView v6 Reference: ta.wad is defined by a published composition using ta.change(close), true high/low via math.max/math.min, and ta.cum of the selected gain. https://www.tradingview.com/pine-script-reference/v6/#var_ta.wad';
const TA_WVAD_RULE = 'TradingView v6 Reference: ta.wvad is defined by the published expression (close - open) / (high - low) * volume. Missing inputs and zero denominators follow ordinary Pine arithmetic for that expression. https://www.tradingview.com/pine-script-reference/v6/#var_ta.wvad';
const TA_INVARIANT_BOUNDS_RULE = 'TradingView v6 Reference: the referenced oscillator output is documented as bounded, so every non-na emitted value must remain inside the documented range even when seed and hole behavior require traces. https://www.tradingview.com/pine-script-reference/v6/';
const TA_INVARIANT_BANDS_RULE = 'TradingView v6 Reference: band/channel tuple outputs are ordered as basis, upper, lower; finite values must preserve upper >= basis >= lower, and tuple members must not split into mixed na/finite states unless separately documented. https://www.tradingview.com/pine-script-reference/v6/';
const TA_INVARIANT_PIVOT_RULE = 'TradingView v6 Reference: ta.pivothigh()/ta.pivotlow() require rightbars future bars before confirming a pivot, so no pivot value can emit before the confirmation bar. https://www.tradingview.com/pine-script-reference/v6/#fun_ta.pivothigh https://www.tradingview.com/pine-script-reference/v6/#fun_ta.pivotlow';
const TA_INVARIANT_DEGENERATE_RULE = 'TradingView v6 Reference: formula denominators that become zero must not produce an ordinary finite value when the documented expression has no defined finite result. https://www.tradingview.com/pine-script-reference/v6/';
const TA_INVARIANT_CROSS_RULE = 'TradingView v6 Reference: ta.cross() is true when either ta.crossover() or ta.crossunder() is true, and a series cannot cross both over and under the same comparison value on the same bar. https://www.tradingview.com/pine-script-reference/v6/#fun_ta.cross https://www.tradingview.com/pine-script-reference/v6/#fun_ta.crossover https://www.tradingview.com/pine-script-reference/v6/#fun_ta.crossunder';
const TA_INVARIANT_ACCUMULATOR_RULE = 'TradingView v6 Reference: ta.cum(source) returns the cumulative sum of source; with nonnegative finite source values, finite cumulative outputs must be monotonic nondecreasing. https://www.tradingview.com/pine-script-reference/v6/#fun_ta.cum';
const TA_INVARIANT_CONVEX_AVERAGE_RULE = 'TradingView v6 Reference: ALMA and SWMA are weighted moving averages with nonnegative normalized weights, so finite full-window outputs over finite inputs must stay within that window range. https://www.tradingview.com/pine-script-reference/v6/#fun_ta.alma https://www.tradingview.com/pine-script-reference/v6/#fun_ta.swma';
const TA_INVARIANT_MACD_RULE = 'TradingView v6 Reference: ta.macd() returns MACD line, signal line, and histogram; finite tuple values must satisfy histogram = line - signal. https://www.tradingview.com/pine-script-reference/v6/#fun_ta.macd';
const TA_INVARIANT_SUPERTREND_RULE = 'TradingView v6 Reference: ta.supertrend() returns the supertrend value and a direction series whose finite direction values are the trend direction states. https://www.tradingview.com/pine-script-reference/v6/#fun_ta.supertrend';
const TA_INVARIANT_VWAP_RULE = 'TradingView v6 Reference: ta.vwap(source) is volume weighted average price; with positive volume and finite source values, finite VWAP outputs must stay inside the running source range. https://www.tradingview.com/pine-script-reference/v6/#fun_ta.vwap';

function stripPineLiteralsAndComments(source: string): string {
  return source
    .replace(/\/\/[^\n\r]*/g, '')
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
}

function memberPattern(member: string): RegExp {
  const escaped = member
    .split('.')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s*\\.\\s*');
  return new RegExp(`(?<![A-Za-z0-9_])${escaped}(?![A-Za-z0-9_])`);
}

export function inferOfficialMembersForValueVector(source: string): string[] {
  const stripped = stripPineLiteralsAndComments(source);
  return OFFICIAL_VALUE_VECTOR_MEMBER_NAMES
    .filter((member) => memberPattern(member).test(stripped));
}

export function officialMembersForValueVectorCase(testCase: ValueVectorCase): string[] {
  const members = testCase.officialMembers ?? inferOfficialMembersForValueVector(testCase.pine);
  const unknownMembers = members.filter((member) => !OFFICIAL_VALUE_VECTOR_MEMBER_SET.has(member));
  if (unknownMembers.length > 0) {
    throw new Error(`${testCase.id} declares non-official Pine v6 members: ${unknownMembers.join(', ')}`);
  }
  return [...new Set(members)].sort((a, b) => a.localeCompare(b));
}

function legacyRuleForCase(testCase: ValueVectorCase): string {
  if (testCase.id === 'math.clamp') return 'TealScript local extension: math.clamp(val, min, max) clamps numeric values to the inclusive bounds.';
  if (testCase.id.startsWith('tradingview-ta.')) return TRADINGVIEW_TA_LIBRARY_RULE;
  if (testCase.namespace === 'ta') return TA_LEGACY_RULE;
  if (testCase.namespace === 'math') return MATH_LEGACY_RULE;
  if (testCase.namespace === 'str') return STRING_LEGACY_RULE;
  if (testCase.namespace === 'array') return ARRAY_LEGACY_RULE;
  if (testCase.namespace === 'runtime' || testCase.namespace === 'language') return LANGUAGE_LEGACY_RULE;
  return `TradingView v6 Reference Manual: the documented members used by this case define the hand-derived expectation. ${LIVE_REFERENCE_ROOT}`;
}

function membersForCitationCompleteness(testCase: ValueVectorCase): string[] {
  try {
    return officialMembersForValueVectorCase(testCase);
  } catch {
    return [...new Set(testCase.officialMembers ?? inferOfficialMembersForValueVector(testCase.pine))];
  }
}

function appendCitation(rule: string, citation: string): string {
  return rule.includes(citation) ? rule : `${rule} ${citation}`;
}

function appendCitationGroup(rule: string, citations: readonly string[]): string {
  return citations.reduce((nextRule, citation) => appendCitation(nextRule, citation), rule);
}

function requiredCompletenessCitations(testCase: ValueVectorCase): string[] {
  const members = membersForCitationCompleteness(testCase);
  const required = new Set<string>();
  const hasMember = (prefix: string) => members.some((member) => member === prefix || member.startsWith(`${prefix}.`));

  if (hasMember('ta')) {
    required.add(BUILT_INS_DOCS_URL);
    required.add(TIME_SERIES_DOCS_URL);
    required.add(FUNCTIONS_FAQ_URL);
  }
  if (hasMember('array')) {
    required.add(ARRAYS_DOCS_URL);
    required.add(OPERATORS_DOCS_URL);
  }
  if (hasMember('map')) {
    required.add(MAPS_DOCS_URL);
  }
  if (hasMember('matrix')) {
    required.add(MATRICES_DOCS_URL);
  }
  if (hasMember('strategy')) {
    required.add(STRATEGIES_DOCS_URL);
    required.add(STRATEGIES_FAQ_URL);
  }
  if (testCase.namespace === 'runtime' || testCase.namespace === 'language') {
    required.add(BUILT_INS_DOCS_URL);
    required.add(TYPE_SYSTEM_DOCS_URL);
    required.add(TIME_SERIES_DOCS_URL);
    required.add(OPERATORS_DOCS_URL);
  }

  return [...required].sort((a, b) => a.localeCompare(b));
}

function addCitationCompleteness(testCase: ValueVectorCase): ValueVectorCase {
  if (!testCase.rule?.trim() || testCase.rule.includes('TealScript local extension:')) return testCase;
  const rule = appendCitationGroup(testCase.rule, requiredCompletenessCitations(testCase));
  return rule === testCase.rule ? testCase : { ...testCase, rule };
}

function withSourceCitations(cases: ValueVectorCase[]): ValueVectorCase[] {
  return cases.map((testCase) => {
    if (testCase.rule?.trim()) return addCitationCompleteness(testCase);
    return addCitationCompleteness({
      ...testCase,
      rule: legacyRuleForCase(testCase),
    });
  });
}

function windowValues(bars: Bar[], length: number, value: (bar: Bar) => number): number[][] {
  return bars.map((_bar, index) => index + 1 < length
    ? []
    : bars.slice(index + 1 - length, index + 1).map(value));
}

function nonNaWindowValues(bars: Bar[], length: number, value: (bar: Bar) => number): number[][] {
  const result: number[][] = [];
  const history: number[] = [];
  for (const bar of bars) {
    const current = value(bar);
    if (!Number.isNaN(current)) history.push(current);
    result.push(history.slice(-length));
  }
  return result;
}

function sma(bars: Bar[], length: number, value: (bar: Bar) => number = (bar) => bar.close): VectorValue[] {
  return nonNaWindowValues(bars, length, value).map((values) => values.length < length
    ? null
    : values.reduce((sum, item) => sum + item, 0) / values.length);
}

function rollingSum(bars: Bar[], length: number, value: (bar: Bar) => number = (bar) => bar.close): VectorValue[] {
  return nonNaWindowValues(bars, length, value).map((values) => values.length < length
    ? null
    : values.reduce((sum, item) => sum + item, 0));
}

function ema(bars: Bar[], length: number, value: (bar: Bar) => number = (bar) => bar.close): VectorValue[] {
  const result: VectorValue[] = [];
  const alpha = 2 / (length + 1);
  let previous: number | null = null;
  for (let index = 0; index < bars.length; index += 1) {
    const current = value(bars[index]!);
    if (Number.isNaN(current)) {
      result.push(previous);
      continue;
    }
    previous = previous === null ? current : current * alpha + previous * (1 - alpha);
    result.push(previous);
  }
  return result;
}

function emaValues(values: VectorValue[], length: number): VectorValue[] {
  const result: VectorValue[] = [];
  let previous: number | null = null;
  const alpha = 2 / (length + 1);
  for (const value of values) {
    if (value === null || !Number.isFinite(value)) {
      result.push(previous);
      continue;
    }
    previous = previous === null ? value : value * alpha + previous * (1 - alpha);
    result.push(previous);
  }
  return result;
}

function dema(bars: Bar[], length: number): VectorValue[] {
  const source = bars.map((bar) => Number.isFinite(bar.close) ? bar.close : null);
  const first = emaValues(source, length);
  const second = emaValues(first, length);
  return first.map((value, index) => value === null || second[index] === null
    ? null
    : 2 * value - second[index]!);
}

function tema(bars: Bar[], length: number): VectorValue[] {
  const source = bars.map((bar) => Number.isFinite(bar.close) ? bar.close : null);
  const first = emaValues(source, length);
  const second = emaValues(first, length);
  const third = emaValues(second, length);
  return first.map((value, index) => value === null || second[index] === null || third[index] === null
    ? null
    : 3 * value - 3 * second[index]! + third[index]!);
}

function tsi(bars: Bar[], shortLength: number, longLength: number): VectorValue[] {
  const momentum = bars.map((bar, index) => index === 0 ? null : bar.close - bars[index - 1]!.close);
  const absoluteMomentum = momentum.map((value) => value === null ? null : Math.abs(value));
  const smoothMomentum = emaValues(emaValues(momentum, shortLength), longLength);
  const smoothAbsoluteMomentum = emaValues(emaValues(absoluteMomentum, shortLength), longLength);
  return smoothMomentum.map((value, index) => value === null || smoothAbsoluteMomentum[index] === null
    ? null
    : smoothAbsoluteMomentum[index] === 0 ? null : value / smoothAbsoluteMomentum[index]!);
}

function swma(bars: Bar[]): VectorValue[] {
  return windowValues(bars, 4, (bar) => bar.close).map((values) => values.length === 0
    ? null
    : values.length < 4 || values.some((value) => Number.isNaN(value))
    ? null
    : (values[0]! + 2 * values[1]! + 2 * values[2]! + values[3]!) / 6);
}

function rma(values: number[], length: number): VectorValue[] {
  const result: VectorValue[] = [];
  let previous: number | null = null;
  const seed: number[] = [];
  for (let index = 0; index < values.length; index += 1) {
    const current = values[index]!;
    if (Number.isNaN(current)) {
      result.push(previous);
      continue;
    }
    if (seed.length < length) {
      seed.push(current);
    }
    if (seed.length < length) {
      result.push(null);
      continue;
    }
    previous = previous === null
      ? seed.reduce((sum, value) => sum + value, 0) / length
      : (previous * (length - 1) + current) / length;
    result.push(previous);
  }
  return result;
}

function trueRanges(bars: Bar[]): VectorValue[] {
  return bars.map((bar, index) => !Number.isFinite(bar.high) || !Number.isFinite(bar.low)
    ? null
    : index === 0 || !Number.isFinite(bars[index - 1]!.close)
    ? bar.high - bar.low
    : Math.max(bar.high - bar.low, Math.abs(bar.high - bars[index - 1]!.close), Math.abs(bar.low - bars[index - 1]!.close)));
}

function rsi(bars: Bar[], length: number): VectorValue[] {
  const source = bars.flatMap((bar) => Number.isFinite(bar.close) ? [bar.close] : []);
  const gains: VectorValue[] = source.map((value, index) => index === 0
    ? null
    : Math.max(0, value - source[index - 1]!));
  const losses: VectorValue[] = gains.map((gain, index) => {
    if (gain === null) return null;
    return Math.max(0, source[index - 1]! - source[index]!);
  });
  const averageGain = rma(gains.map((value) => value ?? Number.NaN), length);
  const averageLoss = rma(losses.map((value) => value ?? Number.NaN), length);
  const values = averageGain.map((gain, index) => {
    const loss = averageLoss[index];
    if (gain === null || loss === null) return null;
    return loss === 0 ? 100 : gain === 0 ? 0 : 100 - 100 / (1 + gain / loss);
  });
  let sourceIndex = 0;
  return bars.map((bar) => !Number.isFinite(bar.close) ? null : values[sourceIndex++] ?? null);
}

function stdev(bars: Bar[], length: number): VectorValue[] {
  return nonNaWindowValues(bars, length, (bar) => bar.close).map((values) => {
    if (values.length < length) return null;
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
  });
}

function stdevUnbiased(bars: Bar[], length: number): VectorValue[] {
  return nonNaWindowValues(bars, length, (bar) => bar.close).map((values) => {
    if (values.length < length) return null;
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1));
  });
}

function atr(bars: Bar[], length: number): VectorValue[] {
  const ranges = trueRanges(bars);
  return rma(ranges.map((value) => value ?? Number.NaN), length);
}

function wma(bars: Bar[], length: number): VectorValue[] {
  const denominator = (length * (length + 1)) / 2;
  return nonNaWindowValues(bars, length, (bar) => bar.close).map((values) => values.length < length
    ? null
    : values.reduce((sum, value, index) => sum + value * (index + 1), 0) / denominator);
}

function wmaValues(values: VectorValue[], length: number): VectorValue[] {
  const denominator = (length * (length + 1)) / 2;
  return values.map((_value, index) => {
    const window = values.slice(Math.max(0, index + 1 - length), index + 1);
    if (window.length < length || window.some((item) => item === null)) return null;
    return window.reduce<number>((sum, item, itemIndex) => sum + (item ?? 0) * (itemIndex + 1), 0) / denominator;
  });
}

function smaValues(values: VectorValue[], length: number): VectorValue[] {
  return values.map((_value, index) => {
    const window = values.slice(Math.max(0, index + 1 - length), index + 1);
    if (window.length < length || window.some((item) => item === null)) return null;
    return window.reduce<number>((sum, item) => sum + (item ?? 0), 0) / length;
  });
}

function hma(bars: Bar[], length: number): VectorValue[] {
  const source = bars.map((bar) => Number.isFinite(bar.close) ? bar.close : null);
  const half = Math.max(1, Math.floor(length / 2));
  const root = Math.max(1, Math.floor(Math.sqrt(length)));
  const halfWma = wmaValues(source, half);
  const fullWma = wmaValues(source, length);
  const difference = halfWma.map((value, index) => value === null || fullWma[index] === null
    ? null
    : 2 * value - fullWma[index]!);
  return wmaValues(difference, root);
}

function rocValues(values: VectorValue[], length: number): VectorValue[] {
  return values.map((value, index) => {
    const previous = index < length ? null : values[index - length];
    if (value === null || previous === null || previous === undefined || previous === 0) return null;
    return (value - previous) / previous * 100;
  });
}

function kst(bars: Bar[]): VectorValue[][] {
  const source = bars.map((bar) => Number.isFinite(bar.close) ? bar.close : null);
  const roc1 = smaValues(rocValues(source, 10), 10);
  const roc2 = smaValues(rocValues(source, 15), 10);
  const roc3 = smaValues(rocValues(source, 20), 10);
  const roc4 = smaValues(rocValues(source, 30), 15);
  const line = roc1.map((value, index) => value === null || roc2[index] === null || roc3[index] === null || roc4[index] === null
    ? null : value + 2 * roc2[index]! + 3 * roc3[index]! + 4 * roc4[index]!);
  return [line, smaValues(line, 9)];
}

function variance(bars: Bar[], length: number): VectorValue[] {
  return stdev(bars, length).map((value) => value === null ? null : value ** 2);
}

function varianceUnbiased(bars: Bar[], length: number): VectorValue[] {
  return stdevUnbiased(bars, length).map((value) => value === null ? null : value ** 2);
}

function meanDeviation(bars: Bar[], length: number): VectorValue[] {
  return nonNaWindowValues(bars, length, (bar) => bar.close).map((values) => {
    if (values.length < length) return null;
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return values.reduce((sum, value) => sum + Math.abs(value - mean), 0) / values.length;
  });
}

function highest(bars: Bar[], length: number, value: (bar: Bar) => number): VectorValue[] {
  return nonNaWindowValues(bars, length, value).map((values) => values.length < length ? null : Math.max(...values));
}

function lowest(bars: Bar[], length: number, value: (bar: Bar) => number): VectorValue[] {
  return nonNaWindowValues(bars, length, value).map((values) => values.length < length ? null : Math.min(...values));
}

function previousVector(values: VectorValue[]): VectorValue[] {
  return values.map((_value, index) => index === 0 ? null : values[index - 1] ?? null);
}

function previousBoolVector(values: VectorValue[]): VectorValue[] {
  return values.map((_value, index) => index === 0 ? 0 : values[index - 1] ?? 0);
}

function cumulative(bars: Bar[]): VectorValue[] {
  let total = 0;
  return bars.map((bar) => {
    total += bar.close;
    return total;
  });
}

function change(bars: Bar[]): VectorValue[] {
  return bars.map((bar, index) => index === 0 ? null : bar.close - bars[index - 1]!.close);
}

function changeLength(bars: Bar[], length: number): VectorValue[] {
  return bars.map((bar, index) => index < length ? null : bar.close - bars[index - length]!.close);
}

function decliningClose(bars: Bar[], index: number): boolean {
  return index > 0 && bars[index]!.close < bars[index - 1]!.close;
}

function barsSince(bars: Bar[]): VectorValue[] {
  let elapsed: number | null = null;
  return bars.map((_bar, index) => {
    if (decliningClose(bars, index)) elapsed = 0;
    else if (elapsed !== null) elapsed += 1;
    return elapsed;
  });
}

function valueWhen(bars: Bar[]): VectorValue[] {
  let latest: number | null = null;
  return bars.map((bar, index) => {
    if (decliningClose(bars, index)) latest = bar.close;
    return latest;
  });
}

function barsSinceAbove(bars: Bar[], level: number): VectorValue[] {
  let elapsed: number | null = null;
  return bars.map((bar) => {
    if (Number.isFinite(bar.close) && bar.close > level) elapsed = 0;
    else if (elapsed !== null) elapsed += 1;
    return elapsed;
  });
}

function valueWhenAbove(bars: Bar[], level: number): VectorValue[] {
  let latest: number | null = null;
  return bars.map((bar) => {
    if (Number.isFinite(bar.close) && bar.close > level) latest = bar.close;
    return latest;
  });
}

function crossover(bars: Bar[], level: number): VectorValue[] {
  return bars.map((_bar, index) => index === 0 ? 0 : Number(
    bars[index]!.close > level && bars[index - 1]!.close <= level,
  ));
}

function crossunder(bars: Bar[], level: number): VectorValue[] {
  return bars.map((_bar, index) => index === 0 ? 0 : Number(
    bars[index]!.close < level && bars[index - 1]!.close >= level,
  ));
}

function cross(bars: Bar[], level: number): VectorValue[] {
  return bars.map((_bar, index) => index === 0 ? 0 : Number(
    (bars[index]!.close > level && bars[index - 1]!.close <= level)
      || (bars[index]!.close < level && bars[index - 1]!.close >= level),
  ));
}

function rising(bars: Bar[]): VectorValue[] {
  return bars.map((_bar, index) => index === 0 ? 0 : Number(bars[index]!.close > bars[index - 1]!.close));
}

function falling(bars: Bar[]): VectorValue[] {
  return bars.map((_bar, index) => index === 0 ? 0 : Number(bars[index]!.close < bars[index - 1]!.close));
}

function allTimeExtremum(bars: Bar[], find: (left: number, right: number) => number): VectorValue[] {
  let value: number | null = null;
  return bars.map((bar) => {
    value = value === null ? bar.close : find(value, bar.close);
    return value;
  });
}

function allTimeMaxIgnoringNa(bars: Bar[]): VectorValue[] {
  let value: number | null = null;
  return bars.map((bar) => {
    if (Number.isFinite(bar.close)) value = value === null ? bar.close : Math.max(value, bar.close);
    return value;
  });
}

function cci(bars: Bar[], length: number): VectorValue[] {
  return windowValues(bars, length, (bar) => bar.close).map((values) => {
    if (values.length === 0) return null;
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const deviation = values.reduce((sum, value) => sum + Math.abs(value - mean), 0) / values.length;
    return deviation === 0 ? null : (values[values.length - 1]! - mean) / (0.015 * deviation);
  });
}

function williamsR(bars: Bar[], length: number): VectorValue[] {
  return bars.map((_bar, index) => {
    if (index + 1 < length) return null;
    const window = bars.slice(index + 1 - length, index + 1);
    const highestHigh = Math.max(...window.map((bar) => bar.high));
    const lowestLow = Math.min(...window.map((bar) => bar.low));
    return highestHigh === lowestLow ? null : -100 * (highestHigh - bars[index]!.close) / (highestHigh - lowestLow);
  });
}

function bollingerBands(bars: Bar[], length: number, multiplier: number): VectorValue[][] {
  const basis = sma(bars, length);
  const deviation = stdev(bars, length);
  return [
    basis,
    basis.map((value, index) => value === null || deviation[index] === null ? null : value + multiplier * deviation[index]!),
    basis.map((value, index) => value === null || deviation[index] === null ? null : value - multiplier * deviation[index]!),
  ];
}

function bollingerWidth(bars: Bar[], length: number, multiplier: number): VectorValue[] {
  const [basis, upper, lower] = bollingerBands(bars, length, multiplier);
  return basis.map((value, index) => value === null || upper[index] === null || lower[index] === null || value === 0
    ? null
    : (upper[index]! - lower[index]!) / value);
}

function median(bars: Bar[], length: number): VectorValue[] {
  return nonNaWindowValues(bars, length, (bar) => bar.close).map((values) => {
    if (values.length < length) return null;
    const ordered = [...values].sort((left, right) => left - right);
    const middle = Math.floor(ordered.length / 2);
    return ordered.length % 2 === 1 ? ordered[middle]! : (ordered[middle - 1]! + ordered[middle]!) / 2;
  });
}

function linreg(bars: Bar[], length: number, offset: number): VectorValue[] {
  return windowValues(bars, length, (bar) => bar.close).map((values) => {
    if (values.length < length || values.some((value) => !Number.isFinite(value))) return null;
    const xMean = (length - 1) / 2;
    const yMean = values.reduce((sum, value) => sum + value, 0) / length;
    const denominator = values.reduce((sum, _value, index) => sum + (index - xMean) ** 2, 0);
    const slope = denominator === 0
      ? 0
      : values.reduce((sum, value, index) => sum + (index - xMean) * (value - yMean), 0) / denominator;
    return yMean + slope * (length - 1 - offset - xMean);
  });
}

function alma(bars: Bar[], length: number, offset: number, sigma: number, floor = false): VectorValue[] {
  const center = floor ? Math.floor(offset * (length - 1)) : offset * (length - 1);
  const scale = length / sigma;
  const weights = Array.from({ length }, (_value, index) => Math.exp(-((index - center) ** 2) / (2 * scale ** 2)));
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  return windowValues(bars, length, (bar) => bar.close).map((values) => values.length < length
    || values.some((value) => !Number.isFinite(value))
    ? null
    : values.reduce((sum, value, index) => sum + value * weights[index]!, 0) / weightTotal);
}

function macd(bars: Bar[], fastLength: number, slowLength: number, signalLength: number): VectorValue[][] {
  const fast = ema(bars, fastLength);
  const slow = ema(bars, slowLength);
  const line = fast.map((value, index) => value === null || slow[index] === null ? null : value - slow[index]!);
  const signal = emaValues(line, signalLength);
  return [line, signal, line.map((value, index) => value === null || signal[index] === null ? null : value - signal[index]!)];
}

function keltner(bars: Bar[], length: number, multiplier: number, useTrueRange = true): VectorValue[][] {
  const basis = ema(bars, length);
  const range = useTrueRange ? trueRanges(bars) : bars.map((bar) => bar.high - bar.low);
  const width = emaValues(range, length);
  return [
    basis,
    basis.map((value, index) => value === null || width[index] === null ? null : value + width[index]! * multiplier),
    basis.map((value, index) => value === null || width[index] === null ? null : value - width[index]! * multiplier),
  ];
}

function keltnerWidth(bars: Bar[], length: number, multiplier: number, useTrueRange = true): VectorValue[] {
  const [basis, upper, lower] = keltner(bars, length, multiplier, useTrueRange);
  return basis.map((value, index) => value === null || upper[index] === null || lower[index] === null || value === 0
    ? null
    : (upper[index]! - lower[index]!) / value);
}

function stochastic(bars: Bar[], length: number): VectorValue[] {
  return bars.map((_bar, index) => {
    if (index + 1 < length) return null;
    const window = bars.slice(index + 1 - length, index + 1);
    const highestHigh = Math.max(...window.map((bar) => bar.high));
    const lowestLow = Math.min(...window.map((bar) => bar.low));
    const spread = highestHigh - lowestLow;
    return spread === 0 ? null : (bars[index]!.close - lowestLow) / spread * 100;
  });
}

function obv(bars: Bar[]): VectorValue[] {
  let total = 0;
  let previousClose: number | null = null;
  return bars.map((bar, index) => {
    if (index === 0) {
      previousClose = Number.isFinite(bar.close) ? bar.close : null;
      return previousClose === null ? null : 0;
    }
    if (!Number.isFinite(bar.close)) return null;
    if (previousClose === null) {
      previousClose = bar.close;
      return total;
    }
    const delta = bar.close - previousClose;
    total += Math.sign(delta) * bar.volume;
    previousClose = bar.close;
    return total;
  });
}

function obvWithSourceVolume(bars: Bar[], source: (bar: Bar) => number, volume: (bar: Bar) => number): VectorValue[] {
  let total = 0;
  let previousSource: number | null = null;
  return bars.map((bar, index) => {
    const current = source(bar);
    if (index === 0) {
      previousSource = Number.isFinite(current) ? current : null;
      return previousSource === null ? null : 0;
    }
    if (!Number.isFinite(current)) return null;
    if (previousSource === null) {
      previousSource = current;
      return total;
    }
    total += Math.sign(current - previousSource) * volume(bar);
    previousSource = current;
    return total;
  });
}

function cmo(bars: Bar[], length: number): VectorValue[] {
  return bars.map((_bar, index) => {
    if (index < length) return null;
    const changes = bars.slice(index - length + 1, index + 1).map((bar, changeIndex) => {
      const previous = bars[index - length + changeIndex]!.close;
      return bar.close - previous;
    });
    const gains = changes.reduce((sum, change) => sum + Math.max(change, 0), 0);
    const losses = changes.reduce((sum, change) => sum + Math.max(-change, 0), 0);
    return gains + losses === 0 ? 0 : (gains - losses) / (gains + losses) * 100;
  });
}

function mfiFromSource(bars: Bar[], length: number, sourceForBar: (bar: Bar) => number): VectorValue[] {
  const flows = bars.map((bar, index) => {
    const source = sourceForBar(bar);
    const previous = index === 0 ? Number.NaN : sourceForBar(bars[index - 1]!);
    if (index === 0 || !Number.isFinite(source) || !Number.isFinite(previous)) return null;
    const rawFlow = Math.abs(source * bar.volume);
    return {
      positive: source > previous ? rawFlow : 0,
      negative: source < previous ? rawFlow : 0,
    };
  });
  const validFlows: Array<{ index: number; positive: number; negative: number }> = [];
  return flows.map((flow, index) => {
    if (!Number.isFinite(bars[index]!.close)) return null;
    if (flow !== null) validFlows.push({ index, ...flow });
    const window = validFlows.slice(-length);
    if (window.length < length) return null;
    const positive = window.reduce((sum, item) => sum + item!.positive, 0);
    const negative = window.reduce((sum, item) => sum + item!.negative, 0);
    return negative === 0 ? 100 : 100 - 100 / (1 + positive / negative);
  });
}

function mfi(bars: Bar[], length: number): VectorValue[] {
  return mfiFromSource(bars, length, (bar) => bar.close);
}

function typicalPrice(bar: Bar): number {
  return (bar.high + bar.low + bar.close) / 3;
}

function nz(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function wad(bars: Bar[]): VectorValue[] {
  let total = 0;
  return bars.map((bar, index) => {
    const previousClose = index === 0 ? Number.NaN : bars[index - 1]!.close;
    const momentum = bar.close - previousClose;
    const gain = momentum > 0
      ? bar.close - Math.min(bar.low, previousClose)
      : momentum < 0
        ? bar.close - Math.max(bar.high, previousClose)
        : 0;
    total += gain;
    return total;
  });
}

function iii(bars: Bar[]): VectorValue[] {
  return bars.map((bar) => (2 * bar.close - bar.high - bar.low) / (bar.high - bar.low) * bar.volume);
}

function nvi(bars: Bar[]): VectorValue[] {
  let value = 1;
  return bars.map((bar, index) => {
    if (index === 0) return value;
    const previous = bars[index - 1]!;
    if (Number.isFinite(bar.close) && Number.isFinite(previous.close) && previous.close !== 0
      && nz(bar.volume) < nz(previous.volume)) {
      value += ((bar.close - previous.close) / previous.close) * value;
    }
    return value;
  });
}

function pvi(bars: Bar[]): VectorValue[] {
  let value = 1;
  return bars.map((bar, index) => {
    if (index === 0) return value;
    const previous = bars[index - 1]!;
    if (Number.isFinite(bar.close) && Number.isFinite(previous.close) && previous.close !== 0
      && nz(bar.volume) > nz(previous.volume)) {
      value += ((bar.close - previous.close) / previous.close) * value;
    }
    return value;
  });
}

function pvt(bars: Bar[]): VectorValue[] {
  let total = 0;
  return bars.map((bar, index) => {
    if (index === 0) return total;
    const previous = bars[index - 1]!.close;
    if (Number.isFinite(bar.close) && Number.isFinite(previous) && previous !== 0 && Number.isFinite(bar.volume)) {
      total += ((bar.close - previous) / previous) * bar.volume;
    }
    return total;
  });
}

function accdist(bars: Bar[]): VectorValue[] {
  let total = 0;
  return bars.map((bar) => {
    total += ((bar.close - bar.low) - (bar.high - bar.close)) / (bar.high - bar.low) * bar.volume;
    return total;
  });
}

function wvad(bars: Bar[]): VectorValue[] {
  return bars.map((bar) => (bar.close - bar.open) / (bar.high - bar.low) * bar.volume);
}

function cog(bars: Bar[], length: number): VectorValue[] {
  return bars.map((_bar, index) => {
    if (index + 1 < length) return null;
    const values = bars.slice(index + 1 - length, index + 1).map((bar) => bar.close);
    const denominator = values.reduce((sum, value) => sum + value, 0);
    return denominator === 0
      ? null
      : -values.reduce((sum, _value, historyIndex) => sum + values[length - 1 - historyIndex]! * (historyIndex + 1), 0) / denominator;
  });
}

function percentRank(bars: Bar[], length: number): VectorValue[] {
  return bars.map((bar, index) => {
    if (index + 1 < length) return null;
    const window = bars.slice(index + 1 - length, index + 1).map((item) => item.close);
    return window.filter((value) => value <= bar.close).length / length * 100;
  });
}

function dmi(bars: Bar[], diLength: number, adxLength: number): VectorValue[][] {
  const plusDirectional = bars.map((_bar, index) => {
    if (index === 0) return Number.NaN;
    const up = bars[index]!.high - bars[index - 1]!.high;
    const down = bars[index - 1]!.low - bars[index]!.low;
    return up > down && up > 0 ? up : 0;
  });
  const minusDirectional = bars.map((_bar, index) => {
    if (index === 0) return Number.NaN;
    const up = bars[index]!.high - bars[index - 1]!.high;
    const down = bars[index - 1]!.low - bars[index]!.low;
    return down > up && down > 0 ? down : 0;
  });
  const ranges = trueRanges(bars).map((value) => value ?? Number.NaN);
  const averageTrueRange = rma(ranges, diLength);
  const plus = rma(plusDirectional, diLength).map((value, index) => value === null || averageTrueRange[index] === null
    ? null : 100 * value / averageTrueRange[index]!);
  const minus = rma(minusDirectional, diLength).map((value, index) => value === null || averageTrueRange[index] === null
    ? null : 100 * value / averageTrueRange[index]!);
  const dx = plus.map((value, index) => value === null || minus[index] === null || value + minus[index]! === 0
    ? null : 100 * Math.abs(value - minus[index]!) / (value + minus[index]!));
  const adx = rma(dx.map((value) => value ?? Number.NaN), adxLength);
  return [plus, minus, adx];
}

function supertrend(bars: Bar[], factor: number, atrLength: number): VectorValue[][] {
  const averageTrueRange = atr(bars, atrLength);
  const line: VectorValue[] = [];
  const direction: VectorValue[] = [];
  let lowerBand: number | null = null;
  let upperBand: number | null = null;
  let previousLine: number | null = null;
  for (let index = 0; index < bars.length; index += 1) {
    const average = averageTrueRange[index];
    const current = bars[index]!;
    if (average === null || !Number.isFinite(current.high) || !Number.isFinite(current.low) || !Number.isFinite(current.close)) {
      line.push(null);
      direction.push(null);
      continue;
    }
    const midpoint = (current.high + current.low) / 2;
    const basicLower = midpoint - factor * average;
    const basicUpper = midpoint + factor * average;
    const previous = index === 0 ? null : bars[index - 1]!;
    const previousLowerBand: number | null = lowerBand;
    const previousUpperBand: number | null = upperBand;
    lowerBand = previousLowerBand === null || basicLower > previousLowerBand || (previous !== null && previous.close < previousLowerBand)
      ? basicLower : previousLowerBand;
    upperBand = previousUpperBand === null || basicUpper < previousUpperBand || (previous !== null && previous.close > previousUpperBand)
      ? basicUpper : previousUpperBand;
    const trend: number = previous === null || previousLine === null
      ? 1
      : previousLine === previousUpperBand
      ? current.close > upperBand! ? -1 : 1
      : current.close < lowerBand! ? 1 : -1;
    const currentLine: number | null = trend === -1 ? lowerBand : upperBand;
    line.push(currentLine);
    direction.push(trend);
    previousLine = currentLine;
  }
  return [line, direction];
}

function sar(bars: Bar[], start: number, increment: number, maximum: number): VectorValue[] {
  if (bars.length === 0) return [];
  let rising = false;
  let acceleration = start;
  let extreme = bars[0]!.low;
  let value = bars[0]!.high;
  return bars.map((bar, index) => {
    if (index === 0) return value;
    const previous = bars[index - 1]!;
    const prior = index > 1 ? bars[index - 2]! : previous;
    let next = value + acceleration * (extreme - value);
    if (rising) {
      next = Math.min(next, previous.low, prior.low);
      if (bar.low < next) {
        rising = false;
        next = extreme;
        extreme = bar.low;
        acceleration = start;
      } else if (bar.high > extreme) {
        extreme = bar.high;
        acceleration = Math.min(maximum, acceleration + increment);
      }
    } else {
      next = Math.max(next, previous.high, prior.high);
      if (bar.high > next) {
        rising = true;
        next = extreme;
        extreme = bar.high;
        acceleration = start;
      } else if (bar.low < extreme) {
        extreme = bar.low;
        acceleration = Math.min(maximum, acceleration + increment);
      }
    }
    value = next;
    return value;
  });
}

function mode(bars: Bar[], length: number): VectorValue[] {
  return bars.map((_bar, index) => {
    if (index + 1 < length) return null;
    const counts = new Map<number, number>();
    for (const value of bars.slice(index + 1 - length, index + 1).map((item) => item.close)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return [...counts.entries()].reduce((best, entry) => entry[1] > best[1] ? entry : best)[0];
  });
}

function rci(bars: Bar[], length: number): VectorValue[] {
  return bars.map((_bar, index) => {
    if (index + 1 < length) return null;
    const values = bars.slice(index + 1 - length, index + 1).map((item) => item.close);
    const ordered = [...values].sort((left, right) => left - right);
    const sumSquaredDifferences = values.reduce((sum, value, valueIndex) => {
      const priceRank = ordered.indexOf(value) + 1;
      const timeRank = valueIndex + 1;
      return sum + (timeRank - priceRank) ** 2;
    }, 0);
    return (1 - 6 * sumSquaredDifferences / (length * (length ** 2 - 1))) * 100;
  });
}

function mathAbs(bars: Bar[]): VectorValue[] {
  return bars.map((bar) => Math.abs(bar.close));
}

function mathMax(bars: Bar[]): VectorValue[] {
  return bars.map((bar) => Math.max(bar.close, bar.open));
}

function mathMin(bars: Bar[]): VectorValue[] {
  return bars.map((bar) => Math.min(bar.close, bar.open));
}

function mathSign(bars: Bar[]): VectorValue[] {
  return bars.map((bar) => Math.sign(bar.close));
}

function mathSqrtAbs(bars: Bar[]): VectorValue[] {
  return bars.map((bar) => Math.sqrt(Math.abs(bar.close)));
}

function mathPowAbs(bars: Bar[]): VectorValue[] {
  return bars.map((bar) => Math.abs(bar.close) ** 2.5);
}

function mathAvgOhl(bars: Bar[]): VectorValue[] {
  return bars.map((bar) => (bar.open + bar.high + bar.low) / 3);
}

function roundTo(value: number, precision = 0): number {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}

function mathRound2(bars: Bar[]): VectorValue[] {
  return bars.map((bar) => roundTo(bar.close / 3, 2));
}

function mathTruncHalf(bars: Bar[]): VectorValue[] {
  return bars.map((bar) => Math.trunc(bar.close / 2));
}

function mathFloorHalf(bars: Bar[]): VectorValue[] {
  return bars.map((bar) => Math.floor(bar.close / 2));
}

function mathCeilHalf(bars: Bar[]): VectorValue[] {
  return bars.map((bar) => Math.ceil(bar.close / 2));
}

function mathLogAbsPlusOne(bars: Bar[]): VectorValue[] {
  return bars.map((bar) => Math.log(Math.abs(bar.close) + 1));
}

function mathLog10AbsPlusOne(bars: Bar[]): VectorValue[] {
  return bars.map((bar) => Math.log10(Math.abs(bar.close) + 1));
}

function mathExpScaled(bars: Bar[]): VectorValue[] {
  return bars.map((bar) => Math.exp(bar.close / 10));
}

function mathSinScaled(bars: Bar[]): VectorValue[] {
  return bars.map((bar) => Math.sin(bar.close / 10));
}

function mathCosScaled(bars: Bar[]): VectorValue[] {
  return bars.map((bar) => Math.cos(bar.close / 10));
}

function mathTanScaled(bars: Bar[]): VectorValue[] {
  return bars.map((bar) => Math.tan(bar.close / 10));
}

function mathAsinScaled(bars: Bar[]): VectorValue[] {
  return bars.map((bar) => Math.asin(Math.max(-1, Math.min(1, bar.close / 10))));
}

function mathAcosScaled(bars: Bar[]): VectorValue[] {
  return bars.map((bar) => Math.acos(Math.max(-1, Math.min(1, bar.close / 10))));
}

function mathAtanScaled(bars: Bar[]): VectorValue[] {
  return bars.map((bar) => Math.atan(bar.close / 10));
}

function mathToRadians(bars: Bar[]): VectorValue[] {
  return bars.map((bar) => bar.close * Math.PI / 180);
}

function mathToDegrees(bars: Bar[]): VectorValue[] {
  return bars.map((bar) => bar.close * 180 / Math.PI);
}

function mathClampSigned(bars: Bar[]): VectorValue[] {
  return bars.map((bar) => Math.max(-1, Math.min(1, bar.close)));
}

function rgbCode(red: number, green: number, blue: number): number {
  return red * 1_000_000 + green * 1_000 + blue;
}

function colorHex(red: number, green: number, blue: number, transparency = 0): string {
  const alpha = Math.round(255 * (100 - transparency) / 100);
  return `#${[red, green, blue, alpha].map((channel) => channel.toString(16).padStart(2, '0').toUpperCase()).join('')}`;
}

function colorGradientMidpointHex(red: number, green: number, blue: number, bottomTransparency: number, topTransparency: number): string {
  const bottomAlpha = Math.round(255 * (100 - bottomTransparency) / 100);
  const topAlpha = Math.round(255 * (100 - topTransparency) / 100);
  const alpha = Math.round((bottomAlpha + topAlpha) / 2);
  return `#${[red, green, blue, alpha].map((channel) => channel.toString(16).padStart(2, '0').toUpperCase()).join('')}`;
}

function constantVector(bars: Bar[], value: number): VectorValue[] {
  return bars.map(() => value);
}

function nullVector(bars: Bar[]): VectorValue[] {
  return bars.map(() => null);
}

function arraySize(bars: Bar[]): VectorValue[] {
  return bars.map((_bar, index) => index + 1);
}

function arrayCurrentClose(bars: Bar[]): VectorValue[] {
  return bars.map(() => bars[0]!.close);
}

function previousValue(bars: Bar[], value: (bar: Bar, index: number) => number): VectorValue[] {
  return bars.map((_bar, index) => index === 0 ? null : value(bars[index - 1]!, index - 1));
}

function previousNthValue(bars: Bar[], offset: number, value: (bar: Bar) => number): VectorValue[] {
  return bars.map((_bar, index) => index < offset ? null : value(bars[index - offset]!));
}

function barIndexes(bars: Bar[]): VectorValue[] {
  return bars.map((_bar, index) => index);
}

function barIndexesPlus(bars: Bar[], offset: number): VectorValue[] {
  return bars.map((_bar, index) => index + offset);
}

function arithmeticChangePercent(bars: Bar[]): VectorValue[] {
  return bars.map((bar, index) => {
    const previous = index === 0 ? null : bars[index - 1]!.close;
    return previous === null || previous === 0 ? null : (bar.close - previous) / previous * 100;
  });
}

function covariance(bars: Bar[], length: number): VectorValue[] {
  const pairs: { close: number; volume: number }[] = [];
  return bars.map((bar) => {
    if (!Number.isNaN(bar.close) && !Number.isNaN(bar.volume)) pairs.push({ close: bar.close, volume: bar.volume });
    const window = pairs.slice(-length);
    if (window.length < length) return null;
    const xMean = window.reduce((sum, item) => sum + item.close, 0) / length;
    const yMean = window.reduce((sum, item) => sum + item.volume, 0) / length;
    return window.reduce((sum, item) => sum + (item.close - xMean) * (item.volume - yMean), 0) / length;
  });
}

function correlation(bars: Bar[], length: number): VectorValue[] {
  const pairs: { close: number; volume: number }[] = [];
  return bars.map((bar) => {
    if (!Number.isNaN(bar.close) && !Number.isNaN(bar.volume)) pairs.push({ close: bar.close, volume: bar.volume });
    const window = pairs.slice(-length);
    if (window.length < length) return null;
    const xMean = window.reduce((sum, item) => sum + item.close, 0) / length;
    const yMean = window.reduce((sum, item) => sum + item.volume, 0) / length;
    const xy = window.reduce((sum, item) => sum + (item.close - xMean) * (item.volume - yMean), 0);
    const xx = window.reduce((sum, item) => sum + (item.close - xMean) ** 2, 0);
    const yy = window.reduce((sum, item) => sum + (item.volume - yMean) ** 2, 0);
    return xx === 0 || yy === 0 ? null : xy / Math.sqrt(xx * yy);
  });
}

function percentileNearestRank(bars: Bar[], length: number, percentage: number): VectorValue[] {
  return nonNaWindowValues(bars, length, (bar) => bar.close).map((values) => {
    if (values.length < length) return null;
    const ordered = [...values].sort((left, right) => left - right);
    const rank = Math.max(1, Math.ceil(percentage / 100 * ordered.length));
    return ordered[rank - 1]!;
  });
}

function percentileLinear(bars: Bar[], length: number, percentage: number): VectorValue[] {
  return nonNaWindowValues(bars, length, (bar) => bar.close).map((values) => {
    if (values.length < length) return null;
    const ordered = [...values].sort((left, right) => left - right);
    const position = (ordered.length - 1) * percentage / 100;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    return ordered[lower]! + (ordered[upper]! - ordered[lower]!) * (position - lower);
  });
}

function pivotHigh(bars: Bar[], left: number, right: number): VectorValue[] {
  return bars.map((_bar, index) => {
    const pivotIndex = index - right;
    if (pivotIndex < left || index >= bars.length || pivotIndex + right >= bars.length) return null;
    const pivot = bars[pivotIndex]!.close;
    const neighbors = bars.slice(pivotIndex - left, pivotIndex + right + 1)
      .filter((_value, offset) => offset !== left)
      .map((bar) => bar.close);
    return neighbors.every((value) => pivot > value) ? pivot : null;
  });
}

function pivotLow(bars: Bar[], left: number, right: number): VectorValue[] {
  return bars.map((_bar, index) => {
    const pivotIndex = index - right;
    if (pivotIndex < left || pivotIndex + right >= bars.length) return null;
    const pivot = bars[pivotIndex]!.close;
    const neighbors = bars.slice(pivotIndex - left, pivotIndex + right + 1)
      .filter((_value, offset) => offset !== left)
      .map((bar) => bar.close);
    return neighbors.every((value) => pivot < value) ? pivot : null;
  });
}

function extremaBars(bars: Bar[], length: number, find: (values: number[]) => number): VectorValue[] {
  const samples: { value: number; index: number }[] = [];
  return bars.map((bar, index) => {
    if (!Number.isNaN(bar.close)) samples.push({ value: bar.close, index });
    const window = samples.slice(-length);
    if (window.length < length) return null;
    const target = find(window.map((sample) => sample.value));
    return window[target]!.index - index;
  });
}

function extremaBarsBy(
  bars: Bar[],
  length: number,
  value: (bar: Bar) => number,
  find: (values: number[]) => number,
): VectorValue[] {
  const samples: { value: number; index: number }[] = [];
  return bars.map((bar, index) => {
    const current = value(bar);
    if (!Number.isNaN(current)) samples.push({ value: current, index });
    const window = samples.slice(-length);
    if (window.length < length) return null;
    const target = find(window.map((sample) => sample.value));
    return window[target]!.index - index;
  });
}

function aroon(bars: Bar[], length: number): VectorValue[][] {
  const len = Math.max(1, Math.trunc(length));
  const highBars = extremaBarsBy(bars, len + 1, (bar) => bar.high, (values) => values.lastIndexOf(Math.max(...values)));
  const lowBars = extremaBarsBy(bars, len + 1, (bar) => bar.low, (values) => values.lastIndexOf(Math.min(...values)));
  return [
    highBars.map((value) => value === null ? null : 100 * (len + value) / len),
    lowBars.map((value) => value === null ? null : 100 * (len + value) / len),
  ];
}

function donchian(bars: Bar[], length: number): VectorValue[][] {
  const high = highest(bars, length, (bar) => bar.high);
  const low = lowest(bars, length, (bar) => bar.low);
  return [high, low, high.map((value, index) => value === null || low[index] === null ? null : (value + low[index]!) / 2)];
}

function highestSince(bars: Bar[], condition: (bar: Bar) => boolean, value: (bar: Bar) => number): VectorValue[] {
  let current: number | null = null;
  return bars.map((bar) => {
    current = condition(bar) || current === null ? value(bar) : Math.max(value(bar), current);
    return current;
  });
}

function lowestSince(bars: Bar[], condition: (bar: Bar) => boolean, value: (bar: Bar) => number): VectorValue[] {
  let current: number | null = null;
  return bars.map((bar) => {
    current = condition(bar) || current === null ? value(bar) : Math.min(value(bar), current);
    return current;
  });
}

function triangularMovingAverage(bars: Bar[], length: number): VectorValue[] {
  const source = bars.map((bar) => Number.isFinite(bar.close) ? bar.close : null);
  return smaValues(smaValues(source, Math.ceil(length / 2)), Math.floor(length / 2) + 1);
}

function cagr(bars: Bar[]): VectorValue[] {
  return bars.map((bar, index) => {
    const previous = index < 5 ? null : bars[index - 5]!;
    if (previous === null) return null;
    const elapsed = bar.time - previous.time;
    return elapsed >= 86_400_000 && previous.close > 0 && bar.close > 0
      ? (Math.abs(bar.close / previous.close) ** (31_557_600_000 / elapsed) - 1) * 100
      : null;
  });
}

function efficiencyRatio(bars: Bar[], length: number): VectorValue[] {
  return bars.map((bar, index) => {
    if (index < length) return null;
    const net = Math.abs(bar.close - bars[index - length]!.close);
    let volatility = 0;
    for (let offset = index - length + 1; offset <= index; offset += 1) {
      volatility += Math.abs(bars[offset]!.close - bars[offset - 1]!.close);
    }
    return volatility === 0 ? null : net / volatility;
  });
}

function kaufmanAdaptiveMovingAverage(bars: Bar[], erLength: number, fastLength: number, slowLength: number): VectorValue[] {
  const fastAlpha = 2 / (fastLength + 1);
  const slowAlpha = 2 / (slowLength + 1);
  const ratio = efficiencyRatio(bars, erLength);
  let previous: number | null = null;
  return bars.map((bar, index) => {
    const smoothing = (((ratio[index] ?? 0) * (fastAlpha - slowAlpha)) + slowAlpha) ** 2;
    previous = previous === null ? bar.close : previous + smoothing * (bar.close - previous);
    return previous;
  });
}

function chandelier(bars: Bar[], length: number, atrLength: number, multiplier: number): VectorValue[][] {
  const averageTrueRange = atr(bars, atrLength);
  const highestHigh = highest(bars, length, (bar) => bar.high);
  const lowestLow = lowest(bars, length, (bar) => bar.low);
  return [
    highestHigh.map((value, index) => value === null || averageTrueRange[index] === null ? null : value - averageTrueRange[index]! * multiplier),
    lowestLow.map((value, index) => value === null || averageTrueRange[index] === null ? null : value + averageTrueRange[index]! * multiplier),
  ];
}

function percentagePriceOscillator(bars: Bar[], fastLength: number, slowLength: number, signalLength: number): VectorValue[][] {
  const fast = ema(bars, fastLength);
  const slow = ema(bars, slowLength);
  const value = fast.map((item, index) => item === null || slow[index] === null || slow[index] === 0
    ? null
    : (item - slow[index]!) / slow[index]! * 100);
  const signal = emaValues(value, signalLength);
  return [value, signal, value.map((item, index) => item === null || signal[index] === null ? null : item - signal[index]!)];
}

function tripleExponentialAverageOscillator(
  bars: Bar[],
  length: number,
  signalLength: number,
  exponential = true,
): VectorValue[][] {
  const source = bars.map((bar) => Number.isFinite(bar.close) ? bar.close : null);
  const first = emaValues(source, length);
  const second = emaValues(first, length);
  const third = emaValues(second, length);
  const value = rocValues(third, 1);
  const signal = exponential ? emaValues(value, signalLength) : smaValues(value, signalLength);
  return [value, signal, value.map((item, index) => item === null || signal[index] === null ? null : item - signal[index]!)];
}

function ulcerIndex(bars: Bar[], length: number): VectorValue[] {
  const peak = highest(bars, length, (bar) => bar.close);
  return bars.map((bar, index) => {
    if (index + 1 < length || peak[index] === null || peak[index] === 0) return null;
    const drawdowns = bars.slice(index + 1 - length, index + 1).map((item, offset) => {
      const localPeak = peak[index - length + 1 + offset]!;
      return localPeak === null || localPeak === 0 ? null : (item.close - localPeak) / localPeak * 100;
    });
    return drawdowns.some((value) => value === null)
      ? null
      : Math.sqrt(drawdowns.reduce<number>((sum, value) => sum + (value ?? 0) ** 2, 0) / length);
  });
}

function range(bars: Bar[], length: number): VectorValue[] {
  return nonNaWindowValues(bars, length, (bar) => bar.close).map((values) => values.length < length
    ? null
    : Math.max(...values) - Math.min(...values));
}

function momentum(bars: Bar[], length: number): VectorValue[] {
  return bars.map((_bar, index) => index < length || !Number.isFinite(bars[index]!.close)
    || !Number.isFinite(bars[index - length]!.close) ? null : bars[index]!.close - bars[index - length]!.close);
}

function rateOfChange(bars: Bar[], length: number): VectorValue[] {
  return bars.map((_bar, index) => {
    if (index < length) return null;
    const previous = bars[index - length]!.close;
    return !Number.isFinite(bars[index]!.close) || !Number.isFinite(previous) || previous === 0
      ? null : (bars[index]!.close - previous) / previous * 100;
  });
}

function trueRange(bars: Bar[]): VectorValue[] {
  return trueRanges(bars);
}

function vwap(bars: Bar[]): VectorValue[] {
  let weightedTotal = 0;
  let volumeTotal = 0;
  return bars.map((bar) => {
    if (!Number.isFinite(bar.close)) return null;
    weightedTotal += bar.close * bar.volume;
    volumeTotal += bar.volume;
    return weightedTotal / volumeTotal;
  });
}

function anchoredVwap(bars: Bar[], anchor: (bar: Bar, index: number) => boolean): VectorValue[] {
  let weightedTotal = 0;
  let volumeTotal = 0;
  return bars.map((bar, index) => {
    if (anchor(bar, index)) {
      weightedTotal = 0;
      volumeTotal = 0;
    }
    if (!Number.isFinite(bar.close)) return null;
    weightedTotal += bar.close * bar.volume;
    volumeTotal += bar.volume;
    return volumeTotal === 0 ? null : weightedTotal / volumeTotal;
  });
}

function anchoredVwapBands(bars: Bar[], anchor: (bar: Bar, index: number) => boolean, stdevMult: number): VectorValue[][] {
  let weightedTotal = 0;
  let squaredWeightedTotal = 0;
  let volumeTotal = 0;
  return bars.reduce<VectorValue[][]>((series, bar, index) => {
    if (anchor(bar, index)) {
      weightedTotal = 0;
      squaredWeightedTotal = 0;
      volumeTotal = 0;
    }
    if (!Number.isFinite(bar.close) || !Number.isFinite(bar.volume)) {
      series[0]!.push(null);
      series[1]!.push(null);
      series[2]!.push(null);
      return series;
    }
    weightedTotal += bar.close * bar.volume;
    squaredWeightedTotal += bar.close * bar.close * bar.volume;
    volumeTotal += bar.volume;
    if (volumeTotal === 0) {
      series[0]!.push(null);
      series[1]!.push(null);
      series[2]!.push(null);
      return series;
    }
    const basis = weightedTotal / volumeTotal;
    const variance = Math.max(squaredWeightedTotal / volumeTotal - basis * basis, 0);
    const deviation = Math.sqrt(variance) * stdevMult;
    series[0]!.push(basis);
    series[1]!.push(basis + deviation);
    series[2]!.push(basis - deviation);
    return series;
  }, [[], [], []]);
}

function persistentSum(bars: Bar[]): VectorValue[] {
  let total = 0;
  return bars.map((bar) => {
    total += bar.close;
    return total;
  });
}

function persistentSeries(bars: Bar[], value: (bar: Bar) => number): VectorValue[] {
  let total = 0;
  return bars.map((bar) => {
    total += value(bar);
    return total;
  });
}

function vwma(bars: Bar[], length: number): VectorValue[] {
  const numerator = sma(bars, length, (bar) => bar.close * bar.volume);
  const denominator = sma(bars, length, (bar) => bar.volume);
  return numerator.map((value, index) => {
    const volume = denominator[index];
    return value === null || volume === null || volume === 0 ? null : value / volume;
  });
}

const VALUE_VECTOR_CASES_WITH_SOURCE_CITATIONS: ValueVectorCase[] = withSourceCitations([
  singleTargetProxyCase(
    'property.single.alert.freq_all',
    'alert',
    'alert.freq_all',
    'alert.freq_all == "all"',
    'TradingView v6 Reference: alert.freq_all is the alert() frequency option for all function calls. https://www.tradingview.com/pine-script-reference/v6/#var_alert.freq_all',
  ),
  singleTargetProxyCase(
    'property.single.alert.freq_once_per_bar',
    'alert',
    'alert.freq_once_per_bar',
    'alert.freq_once_per_bar == "once_per_bar"',
    'TradingView v6 Reference: alert.freq_once_per_bar is the alert() frequency option for once per realtime bar. https://www.tradingview.com/pine-script-reference/v6/#var_alert.freq_once_per_bar',
  ),
  singleTargetProxyCase(
    'property.single.alert.freq_once_per_bar_close',
    'alert',
    'alert.freq_once_per_bar_close',
    'alert.freq_once_per_bar_close == "once_per_bar_close"',
    'TradingView v6 Reference: alert.freq_once_per_bar_close is the alert() frequency option for once per bar close. https://www.tradingview.com/pine-script-reference/v6/#var_alert.freq_once_per_bar_close',
  ),
  singleTargetProxyCase(
    'property.single.barmerge.gaps_off',
    'barmerge',
    'barmerge.gaps_off',
    'barmerge.gaps_off == "barmerge.gaps_off"',
    'TradingView v6 Reference: barmerge.gaps_off is the request.* gaps mode that fills gaps. https://www.tradingview.com/pine-script-reference/v6/#var_barmerge.gaps_off',
  ),
  singleTargetProxyCase(
    'property.single.barmerge.gaps_on',
    'barmerge',
    'barmerge.gaps_on',
    'barmerge.gaps_on == "barmerge.gaps_on"',
    'TradingView v6 Reference: barmerge.gaps_on is the request.* gaps mode that preserves gaps. https://www.tradingview.com/pine-script-reference/v6/#var_barmerge.gaps_on',
  ),
  singleTargetProxyCase(
    'property.single.barmerge.lookahead_off',
    'barmerge',
    'barmerge.lookahead_off',
    'barmerge.lookahead_off == "barmerge.lookahead_off"',
    'TradingView v6 Reference: barmerge.lookahead_off is the request.* lookahead mode that avoids lookahead on historical bars. https://www.tradingview.com/pine-script-reference/v6/#var_barmerge.lookahead_off',
  ),
  singleTargetProxyCase(
    'property.single.barmerge.lookahead_on',
    'barmerge',
    'barmerge.lookahead_on',
    'barmerge.lookahead_on == "barmerge.lookahead_on"',
    'TradingView v6 Reference: barmerge.lookahead_on is the request.* lookahead mode. https://www.tradingview.com/pine-script-reference/v6/#var_barmerge.lookahead_on',
  ),
  {
    id: 'property.single.bar_index',
    namespace: 'runtime',
    pine: pine('bar_index'),
    officialMembers: ['bar_index'],
    outputMembers: [['bar_index']],
    rule: 'TradingView v6 Reference: bar_index is a zero-based integer index of the current bar. https://www.tradingview.com/pine-script-reference/v6/#var_bar_index',
    expected: (bars) => bars.map((_bar, index) => index),
  },
  {
    id: 'property.single.array.first',
    namespace: 'array',
    pine: `//@version=6
indicator("value vector")
a = array.from(7, 9)
plot(array.first(a))`,
    officialMembers: ['array.first'],
    outputMembers: [['array.first']],
    rule: 'TradingView v6 Reference: array.first(id) returns the first element of an array. https://www.tradingview.com/pine-script-reference/v6/#fun_array.first',
    expected: (bars) => constantVector(bars, 7),
  },
  {
    id: 'property.single.array.last',
    namespace: 'array',
    pine: `//@version=6
indicator("value vector")
a = array.from(7, 9)
plot(array.last(a))`,
    officialMembers: ['array.last'],
    outputMembers: [['array.last']],
    rule: 'TradingView v6 Reference: array.last(id) returns the last element of an array. https://www.tradingview.com/pine-script-reference/v6/#fun_array.last',
    expected: (bars) => constantVector(bars, 9),
  },
  {
    id: 'property.single.array.from',
    namespace: 'array',
    pine: `//@version=6
indicator("value vector")
a = array.from(1, 2, 3)
plot(array.size(a))`,
    officialMembers: ['array.from'],
    outputMembers: [['array.from']],
    rule: 'TradingView v6 Reference: array.from(arg0, arg1, ...) creates an array containing the supplied values. https://www.tradingview.com/pine-script-reference/v6/#fun_array.from',
    expected: (bars) => constantVector(bars, 3),
  },
  {
    id: 'property.single.array.new_bool',
    namespace: 'array',
    pine: `//@version=6
indicator("value vector")
a = array.new_bool(3, true)
plot(array.size(a))`,
    officialMembers: ['array.new_bool'],
    outputMembers: [['array.new_bool']],
    rule: 'TradingView v6 Reference: array.new_bool(size, initial_value) creates a bool array with the requested element count. https://www.tradingview.com/pine-script-reference/v6/#fun_array.new_bool',
    expected: (bars) => constantVector(bars, 3),
  },
  {
    id: 'property.single.array.new_float',
    namespace: 'array',
    pine: `//@version=6
indicator("value vector")
a = array.new_float(4, 1.5)
plot(array.size(a))`,
    officialMembers: ['array.new_float'],
    outputMembers: [['array.new_float']],
    rule: 'TradingView v6 Reference: array.new_float(size, initial_value) creates a float array with the requested element count. https://www.tradingview.com/pine-script-reference/v6/#fun_array.new_float',
    expected: (bars) => constantVector(bars, 4),
  },
  {
    id: 'property.single.array.new_int',
    namespace: 'array',
    pine: `//@version=6
indicator("value vector")
a = array.new_int(5, 2)
plot(array.size(a))`,
    officialMembers: ['array.new_int'],
    outputMembers: [['array.new_int']],
    rule: 'TradingView v6 Reference: array.new_int(size, initial_value) creates an int array with the requested element count. https://www.tradingview.com/pine-script-reference/v6/#fun_array.new_int',
    expected: (bars) => constantVector(bars, 5),
  },
  {
    id: 'array.new-default-na-values',
    namespace: 'array',
    pine: `//@version=6
indicator("array new default na values")
floats = array.new_float(2)
ints = array.new_int(2)
colors = array.new_color(1)
plot(na(array.get(floats, 0)) ? 1 : 0)
plot(na(array.get(ints, 1)) ? 1 : 0)
plot(na(array.get(colors, 0)) ? 1 : 0)`,
    officialMembers: ['array.new_float', 'array.new_int', 'array.new_color', 'array.get', 'na'],
    outputMembers: [
      ['array.new_float', 'array.get', 'na'],
      ['array.new_int', 'array.get', 'na'],
      ['array.new_color', 'array.get', 'na'],
    ],
    rule: 'TradingView v6 Reference: typed array constructors accept an optional initial_value argument whose default is na, and array.get() returns the stored element. https://www.tradingview.com/pine-script-reference/v6/#fun_array.new_float https://www.tradingview.com/pine-script-reference/v6/#fun_array.new_int https://www.tradingview.com/pine-script-reference/v6/#fun_array.new_color https://www.tradingview.com/pine-script-reference/v6/#fun_array.get',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => [
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
    ],
  },
  {
    id: 'property.single.bool',
    namespace: 'runtime',
    pine: pine('bool(close > 0) ? 1 : 0'),
    officialMembers: ['bool'],
    outputMembers: [['bool']],
    rule: 'TradingView v6 Reference: bool(x) casts its argument to bool. A positive comparison remains true. https://www.tradingview.com/pine-script-reference/v6/#fun_bool',
    expected: (bars) => constantVector(bars, 1),
  },
  {
    id: 'property.single.false',
    namespace: 'runtime',
    pine: pine('false ? 0 : 1'),
    officialMembers: ['false'],
    outputMembers: [['false']],
    rule: 'TradingView v6 Reference: false is the literal boolean false value. https://www.tradingview.com/pine-script-reference/v6/#var_false',
    expected: (bars) => constantVector(bars, 1),
  },
  {
    id: 'property.single.true',
    namespace: 'runtime',
    pine: pine('true ? 1 : 0'),
    officialMembers: ['true'],
    outputMembers: [['true']],
    rule: 'TradingView v6 Reference: true is the literal boolean true value. https://www.tradingview.com/pine-script-reference/v6/#var_true',
    expected: (bars) => constantVector(bars, 1),
  },
  {
    id: 'property.single.map.clear',
    namespace: 'map',
    pine: `//@version=6
indicator("value vector")
m = map.new<string, float>()
map.put(m, "a", 1)
map.clear(m)
plot(map.size(m))`,
    officialMembers: ['map.clear'],
    outputMembers: [['map.clear']],
    rule: 'TradingView v6 Reference: map.clear(id) removes all key/value pairs from a map. https://www.tradingview.com/pine-script-reference/v6/#fun_map.clear',
    expected: (bars) => constantVector(bars, 0),
  },
  {
    id: 'property.single.map.contains',
    namespace: 'map',
    pine: `//@version=6
indicator("value vector")
m = map.new<string, float>()
map.put(m, "a", 1)
plot(map.contains(m, "a") ? 1 : 0)`,
    officialMembers: ['map.contains'],
    outputMembers: [['map.contains']],
    rule: 'TradingView v6 Reference: map.contains(id, key) returns true when the map contains the key. https://www.tradingview.com/pine-script-reference/v6/#fun_map.contains',
    expected: (bars) => constantVector(bars, 1),
  },
  {
    id: 'property.single.map.copy',
    namespace: 'map',
    pine: `//@version=6
indicator("value vector")
m = map.new<string, float>()
map.put(m, "a", 1)
copy = map.copy(m)
plot(map.size(copy))`,
    officialMembers: ['map.copy'],
    outputMembers: [['map.copy']],
    rule: 'TradingView v6 Reference: map.copy(id) returns a copied map with the source key/value pairs. https://www.tradingview.com/pine-script-reference/v6/#fun_map.copy',
    expected: (bars) => constantVector(bars, 1),
  },
  {
    id: 'property.single.map.get',
    namespace: 'map',
    pine: `//@version=6
indicator("value vector")
m = map.new<string, float>()
map.put(m, "a", 7)
plot(map.get(m, "a"))`,
    officialMembers: ['map.get'],
    outputMembers: [['map.get']],
    rule: 'TradingView v6 Reference: map.get(id, key) returns the value associated with the key. https://www.tradingview.com/pine-script-reference/v6/#fun_map.get',
    expected: (bars) => constantVector(bars, 7),
  },
  {
    id: 'property.single.map.keys',
    namespace: 'map',
    pine: `//@version=6
indicator("value vector")
m = map.new<string, float>()
map.put(m, "a", 1)
map.put(m, "b", 2)
keys = map.keys(m)
plot(array.size(keys))`,
    officialMembers: ['map.keys'],
    outputMembers: [['map.keys']],
    rule: 'TradingView v6 Reference: map.keys(id) returns an array containing all keys from the map. https://www.tradingview.com/pine-script-reference/v6/#fun_map.keys',
    expected: (bars) => constantVector(bars, 2),
  },
  {
    id: 'property.single.map.new',
    namespace: 'map',
    pine: `//@version=6
indicator("value vector")
m = map.new<string, float>()
plot(map.size(m))`,
    officialMembers: ['map.new'],
    outputMembers: [['map.new']],
    rule: 'TradingView v6 Reference: map.new<key_type, value_type>() creates an empty map. https://www.tradingview.com/pine-script-reference/v6/#fun_map.new',
    expected: (bars) => constantVector(bars, 0),
  },
  {
    id: 'property.single.map.put',
    namespace: 'map',
    pine: `//@version=6
indicator("value vector")
m = map.new<string, float>()
map.put(m, "a", 1)
plot(map.size(m))`,
    officialMembers: ['map.put'],
    outputMembers: [['map.put']],
    rule: 'TradingView v6 Reference: map.put(id, key, value) adds or replaces a key/value pair in the map. https://www.tradingview.com/pine-script-reference/v6/#fun_map.put',
    expected: (bars) => constantVector(bars, 1),
  },
  {
    id: 'property.single.map.put_all',
    namespace: 'map',
    pine: `//@version=6
indicator("value vector")
left = map.new<string, float>()
right = map.new<string, float>()
map.put(right, "a", 1)
map.put(right, "b", 2)
map.put_all(left, right)
plot(map.size(left))`,
    officialMembers: ['map.put_all'],
    outputMembers: [['map.put_all']],
    rule: 'TradingView v6 Reference: map.put_all(id, source) puts all source map key/value pairs into the target map. https://www.tradingview.com/pine-script-reference/v6/#fun_map.put_all',
    expected: (bars) => constantVector(bars, 2),
  },
  {
    id: 'property.single.map.remove',
    namespace: 'map',
    pine: `//@version=6
indicator("value vector")
m = map.new<string, float>()
map.put(m, "a", 1)
map.put(m, "b", 2)
map.remove(m, "a")
plot(map.size(m))`,
    officialMembers: ['map.remove'],
    outputMembers: [['map.remove']],
    rule: 'TradingView v6 Reference: map.remove(id, key) removes the key/value pair for the supplied key. https://www.tradingview.com/pine-script-reference/v6/#fun_map.remove',
    expected: (bars) => constantVector(bars, 1),
  },
  {
    id: 'property.single.map.size',
    namespace: 'map',
    pine: `//@version=6
indicator("value vector")
m = map.new<string, float>()
map.put(m, "a", 1)
map.put(m, "b", 2)
plot(map.size(m))`,
    officialMembers: ['map.size'],
    outputMembers: [['map.size']],
    rule: 'TradingView v6 Reference: map.size(id) returns the number of key/value pairs in a map. https://www.tradingview.com/pine-script-reference/v6/#fun_map.size',
    expected: (bars) => constantVector(bars, 2),
  },
  {
    id: 'property.single.map.values',
    namespace: 'map',
    pine: `//@version=6
indicator("value vector")
m = map.new<string, float>()
map.put(m, "a", 1)
map.put(m, "b", 2)
values = map.values(m)
plot(array.size(values))`,
    officialMembers: ['map.values'],
    outputMembers: [['map.values']],
    rule: 'TradingView v6 Reference: map.values(id) returns an array containing all values from the map. https://www.tradingview.com/pine-script-reference/v6/#fun_map.values',
    expected: (bars) => constantVector(bars, 2),
  },
  {
    id: 'property.single.matrix.new',
    namespace: 'matrix',
    pine: `//@version=6
indicator("value vector")
m = matrix.new<float>(2, 3, 1.0)
plot(matrix.rows(m) * 10 + matrix.columns(m))`,
    officialMembers: ['matrix.new'],
    outputMembers: [['matrix.new']],
    rule: 'TradingView v6 Reference: matrix.new<type>(rows, columns, initial_value) creates a matrix with the requested row and column counts. https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.new',
    expected: (bars) => constantVector(bars, 23),
  },
  {
    id: 'property.single.na',
    namespace: 'runtime',
    pine: pine('na(close[100]) ? 1 : 0'),
    officialMembers: ['na'],
    outputMembers: [['na']],
    rule: 'TradingView v6 Reference: na(x) returns true when x is not available. https://www.tradingview.com/pine-script-reference/v6/#fun_na',
    expected: (bars) => constantVector(bars, 1),
  },
  {
    id: 'property.single.nz',
    namespace: 'runtime',
    pine: pine('nz(close[100], 7)'),
    officialMembers: ['nz'],
    outputMembers: [['nz']],
    rule: 'TradingView v6 Reference: nz(source, replacement) replaces na values with the supplied replacement. https://www.tradingview.com/pine-script-reference/v6/#fun_nz',
    expected: (bars) => constantVector(bars, 7),
  },
  {
    id: 'property.single.str.tostring',
    namespace: 'str',
    pine: pine('str.tostring(12.5) == "12.5" ? 1 : 0'),
    officialMembers: ['str.tostring'],
    outputMembers: [['str.tostring']],
    rule: 'TradingView v6 Reference: str.tostring(value) returns the string representation of a value. https://www.tradingview.com/pine-script-reference/v6/#fun_str.tostring',
    expected: (bars) => constantVector(bars, 1),
  },
  singleTargetProxyCase(
    'property.single.math.e',
    'math',
    'math.e',
    'math.e == 2.718281828459045',
    'TradingView v6 Reference: math.e is Euler\'s number. https://www.tradingview.com/pine-script-reference/v6/#var_math.e',
  ),
  singleTargetProxyCase(
    'property.single.math.exp',
    'math',
    'math.exp',
    'math.exp(1) == math.e',
    'TradingView v6 Reference: math.exp(number) returns e raised to the supplied power. https://www.tradingview.com/pine-script-reference/v6/#fun_math.exp https://www.tradingview.com/pine-script-reference/v6/#var_math.e',
  ),
  singleTargetProxyCase(
    'property.single.math.phi',
    'math',
    'math.phi',
    'math.phi == 1.618033988749895',
    'TradingView v6 Reference: math.phi is the golden ratio constant. https://www.tradingview.com/pine-script-reference/v6/#var_math.phi',
  ),
  singleTargetProxyCase(
    'property.single.math.pi',
    'math',
    'math.pi',
    'math.pi == 3.141592653589793',
    'TradingView v6 Reference: math.pi is the mathematical constant pi. https://www.tradingview.com/pine-script-reference/v6/#var_math.pi',
  ),
  singleTargetProxyCase(
    'property.single.str.format',
    'str',
    'str.format',
    'str.format("{0,number,#.#}", 1.34) == "1.3"',
    'TradingView v6 Reference: str.format() formats placeholders with optional number modifiers. https://www.tradingview.com/pine-script-reference/v6/#fun_str.format',
  ),
  singleTargetProxyCase(
    'property.single.str.format_time',
    'str',
    'str.format_time',
    'str.format_time(timestamp("UTC", 2024, 1, 5, 7, 30, 15), "yyyy-MM-dd HH:mm:ss", "UTC") == "2024-01-05 07:30:15"',
    'TradingView v6 Reference: str.format_time() formats a UNIX timestamp using the supplied date-time pattern and timezone. https://www.tradingview.com/pine-script-reference/v6/#fun_str.format_time',
  ),
  singleTargetProxyCase(
    'property.single.str.lower',
    'str',
    'str.lower',
    'str.lower("BTCUSDT") == "btcusdt"',
    'TradingView v6 Reference: str.lower() returns the source string in lowercase. https://www.tradingview.com/pine-script-reference/v6/#fun_str.lower',
  ),
  singleTargetProxyCase(
    'property.single.str.match',
    'str',
    'str.match',
    'str.match("Trade NASDAQ:AAPL now", "[A-Z]+:[A-Z]+") == "NASDAQ:AAPL"',
    'TradingView v6 Reference: str.match() returns the substring matching a regular expression. https://www.tradingview.com/pine-script-reference/v6/#fun_str.match',
  ),
  singleTargetProxyCase(
    'property.single.str.repeat',
    'str',
    'str.repeat',
    'str.repeat("?", 3, ",") == "?,?,?"',
    'TradingView v6 Reference: str.repeat() repeats a source string with an optional separator. https://www.tradingview.com/pine-script-reference/v6/#fun_str.repeat',
  ),
  singleTargetProxyCase(
    'property.single.str.replace',
    'str',
    'str.replace',
    'str.replace("btc-usdt-usdt", "usdt", "perp", 1) == "btc-usdt-perp"',
    'TradingView v6 Reference: str.replace() replaces one occurrence of a substring. https://www.tradingview.com/pine-script-reference/v6/#fun_str.replace',
  ),
  singleTargetProxyCase(
    'property.single.str.replace_all',
    'str',
    'str.replace_all',
    'str.replace_all("btc-usdt-usdt", "usdt", "perp") == "btc-perp-perp"',
    'TradingView v6 Reference: str.replace_all() replaces every occurrence of a substring. https://www.tradingview.com/pine-script-reference/v6/#fun_str.replace_all',
  ),
  singleTargetProxyCase(
    'property.single.str.substring',
    'str',
    'str.substring',
    'str.substring("BTCUSDT", 0, 3) == "BTC"',
    'TradingView v6 Reference: str.substring() returns the characters from begin_pos up to end_pos. https://www.tradingview.com/pine-script-reference/v6/#fun_str.substring',
  ),
  singleTargetProxyCase(
    'property.single.str.trim',
    'str',
    'str.trim',
    'str.trim("  BTC  ") == "BTC"',
    'TradingView v6 Reference: str.trim() removes leading and trailing whitespace. https://www.tradingview.com/pine-script-reference/v6/#fun_str.trim',
  ),
  singleTargetProxyCase(
    'property.single.str.upper',
    'str',
    'str.upper',
    'str.upper("btcusdt") == "BTCUSDT"',
    'TradingView v6 Reference: str.upper() returns the source string in uppercase. https://www.tradingview.com/pine-script-reference/v6/#fun_str.upper',
  ),
  {
    id: 'property.single.ticker.heikinashi',
    namespace: 'ticker',
    pine: pine('str.length(ticker.heikinashi(syminfo.tickerid)) > 0 ? 1 : 0'),
    officialMembers: ['ticker.heikinashi'],
    outputMembers: [['ticker.heikinashi']],
    rule: 'TradingView v6 Non-standard charts data: ticker.heikinashi(symbol) returns a ticker identifier for Heikin Ashi data. https://www.tradingview.com/pine-script-docs/concepts/non-standard-charts-data/ https://www.tradingview.com/pine-script-reference/v6/#fun_ticker.heikinashi',
    expected: (bars) => constantVector(bars, 1),
  },
  {
    id: 'property.single.ticker.inherit',
    namespace: 'ticker',
    pine: pine('str.length(ticker.inherit(syminfo.tickerid, "NASDAQ:AAPL")) > 0 ? 1 : 0'),
    officialMembers: ['ticker.inherit'],
    outputMembers: [['ticker.inherit']],
    rule: 'TradingView v6 Reference: ticker.inherit(from_tickerid, symbol) returns a ticker identifier inheriting modifiers from another ticker id. https://www.tradingview.com/pine-script-reference/v6/#fun_ticker.inherit',
    expected: (bars) => constantVector(bars, 1),
  },
  {
    id: 'property.single.ticker.linebreak',
    namespace: 'ticker',
    pine: pine('str.length(ticker.linebreak(syminfo.tickerid, 3)) > 0 ? 1 : 0'),
    officialMembers: ['ticker.linebreak'],
    outputMembers: [['ticker.linebreak']],
    rule: 'TradingView v6 Non-standard charts data: ticker.linebreak(symbol, number_of_lines) returns a ticker identifier for Line Break data. https://www.tradingview.com/pine-script-docs/concepts/non-standard-charts-data/ https://www.tradingview.com/pine-script-reference/v6/#fun_ticker.linebreak',
    expected: (bars) => constantVector(bars, 1),
  },
  {
    id: 'property.single.ticker.modify',
    namespace: 'ticker',
    pine: pine('str.length(ticker.modify(syminfo.tickerid, session=session.regular, adjustment=adjustment.none)) > 0 ? 1 : 0'),
    officialMembers: ['ticker.modify'],
    outputMembers: [['ticker.modify']],
    rule: 'TradingView v6 Reference: ticker.modify(tickerid, session, adjustment) returns a ticker identifier with the requested modifiers. https://www.tradingview.com/pine-script-reference/v6/#fun_ticker.modify',
    expected: (bars) => constantVector(bars, 1),
  },
  {
    id: 'property.single.ticker.new',
    namespace: 'ticker',
    pine: pine('str.length(ticker.new("NASDAQ", "AAPL")) > 0 ? 1 : 0'),
    officialMembers: ['ticker.new'],
    outputMembers: [['ticker.new']],
    rule: 'TradingView v6 Reference: ticker.new(prefix, ticker, session, adjustment) creates a ticker identifier. https://www.tradingview.com/pine-script-reference/v6/#fun_ticker.new',
    expected: (bars) => constantVector(bars, 1),
  },
  {
    id: 'property.single.ticker.pointfigure',
    namespace: 'ticker',
    pine: pine('str.length(ticker.pointfigure(syminfo.tickerid, "hl", "ATR", 14, 3)) > 0 ? 1 : 0'),
    officialMembers: ['ticker.pointfigure'],
    outputMembers: [['ticker.pointfigure']],
    rule: 'TradingView v6 Non-standard charts data: ticker.pointfigure() returns a ticker identifier for Point and Figure data. https://www.tradingview.com/pine-script-docs/concepts/non-standard-charts-data/ https://www.tradingview.com/pine-script-reference/v6/#fun_ticker.pointfigure',
    expected: (bars) => constantVector(bars, 1),
  },
  {
    id: 'property.single.ticker.renko',
    namespace: 'ticker',
    pine: pine('str.length(ticker.renko(syminfo.tickerid, "ATR", 14)) > 0 ? 1 : 0'),
    officialMembers: ['ticker.renko'],
    outputMembers: [['ticker.renko']],
    rule: 'TradingView v6 Non-standard charts data: ticker.renko(symbol, style, param) returns a ticker identifier for Renko data. https://www.tradingview.com/pine-script-docs/concepts/non-standard-charts-data/ https://www.tradingview.com/pine-script-reference/v6/#fun_ticker.renko',
    expected: (bars) => constantVector(bars, 1),
  },
  {
    id: 'property.single.ticker.standard',
    namespace: 'ticker',
    pine: pine('str.length(ticker.standard(syminfo.tickerid)) > 0 ? 1 : 0'),
    officialMembers: ['ticker.standard'],
    outputMembers: [['ticker.standard']],
    rule: 'TradingView v6 Reference: ticker.standard(tickerid) returns the standard-chart ticker identifier without non-standard modifiers. https://www.tradingview.com/pine-script-reference/v6/#fun_ticker.standard',
    expected: (bars) => constantVector(bars, 1),
  },
  ...singleTargetConstantCases([
    ['dividends.gross', 'dividends.gross', 'TradingView v6 Reference: dividends.gross is the gross-dividend field selector for request.dividends(). https://www.tradingview.com/pine-script-reference/v6/#var_dividends.gross'],
    ['dividends.net', 'dividends.net', 'TradingView v6 Reference: dividends.net is the net-dividend field selector for request.dividends(). https://www.tradingview.com/pine-script-reference/v6/#var_dividends.net'],
    ['earnings.actual', 'earnings.actual', 'TradingView v6 Reference: earnings.actual is the actual-earnings field selector for request.earnings(). https://www.tradingview.com/pine-script-reference/v6/#var_earnings.actual'],
    ['earnings.standardized', 'earnings.standardized', 'TradingView v6 Reference: earnings.standardized is the standardized-earnings field selector for request.earnings(). https://www.tradingview.com/pine-script-reference/v6/#var_earnings.standardized'],
    ['extend.both', 'both', 'TradingView v6 Reference: extend.both extends a line in both directions. https://www.tradingview.com/pine-script-reference/v6/#var_extend.both'],
    ['extend.left', 'left', 'TradingView v6 Reference: extend.left extends a line to the left. https://www.tradingview.com/pine-script-reference/v6/#var_extend.left'],
    ['extend.none', 'none', 'TradingView v6 Reference: extend.none does not extend a line past its endpoints. https://www.tradingview.com/pine-script-reference/v6/#var_extend.none'],
    ['extend.right', 'right', 'TradingView v6 Reference: extend.right extends a line to the right. https://www.tradingview.com/pine-script-reference/v6/#var_extend.right'],
    ['font.family_default', 'default', 'TradingView v6 Reference: font.family_default selects the default text font family. https://www.tradingview.com/pine-script-reference/v6/#var_font.family_default'],
    ['font.family_monospace', 'monospace', 'TradingView v6 Reference: font.family_monospace selects the monospace text font family. https://www.tradingview.com/pine-script-reference/v6/#var_font.family_monospace'],
    ['format.inherit', 'inherit', 'TradingView v6 Reference: format.inherit selects inherited plot formatting. https://www.tradingview.com/pine-script-reference/v6/#var_format.inherit'],
    ['format.price', 'price', 'TradingView v6 Reference: format.price selects price formatting. https://www.tradingview.com/pine-script-reference/v6/#var_format.price'],
    ['location.abovebar', 'abovebar', 'TradingView v6 Reference: location.abovebar places a shape above a bar. https://www.tradingview.com/pine-script-reference/v6/#var_location.abovebar'],
    ['location.belowbar', 'belowbar', 'TradingView v6 Reference: location.belowbar places a shape below a bar. https://www.tradingview.com/pine-script-reference/v6/#var_location.belowbar'],
    ['order.ascending', 'ascending', 'TradingView v6 Reference: order.ascending is the ascending sort-order constant. https://www.tradingview.com/pine-script-reference/v6/#var_order.ascending'],
    ['position.bottom_left', 'bottom_left', 'TradingView v6 Reference: position.bottom_left places a table or visual at the bottom-left position. https://www.tradingview.com/pine-script-reference/v6/#var_position.bottom_left'],
    ['position.middle_center', 'middle_center', 'TradingView v6 Reference: position.middle_center places a table or visual at the middle-center position. https://www.tradingview.com/pine-script-reference/v6/#var_position.middle_center'],
    ['position.top_right', 'top_right', 'TradingView v6 Reference: position.top_right places a table or visual at the top-right position. https://www.tradingview.com/pine-script-reference/v6/#var_position.top_right'],
    ['scale.left', 'left', 'TradingView v6 Reference: scale.left selects the left price scale. https://www.tradingview.com/pine-script-reference/v6/#var_scale.left'],
    ['session.extended', 'extended', 'TradingView v6 Reference: session.extended requests extended-session data where the exchange provides it. https://www.tradingview.com/pine-script-reference/v6/#var_session.extended'],
    ['shape.triangleup', 'triangleup', 'TradingView v6 Reference: shape.triangleup selects the upward triangle plotshape style. https://www.tradingview.com/pine-script-reference/v6/#var_shape.triangleup'],
    ['size.auto', 'auto', 'TradingView v6 Reference: size.auto selects automatic text/shape size. https://www.tradingview.com/pine-script-reference/v6/#var_size.auto'],
    ['size.huge', 'huge', 'TradingView v6 Reference: size.huge selects huge text/shape size. https://www.tradingview.com/pine-script-reference/v6/#var_size.huge'],
    ['size.large', 'large', 'TradingView v6 Reference: size.large selects large text/shape size. https://www.tradingview.com/pine-script-reference/v6/#var_size.large'],
    ['size.normal', 'normal', 'TradingView v6 Reference: size.normal selects normal text/shape size. https://www.tradingview.com/pine-script-reference/v6/#var_size.normal'],
    ['size.small', 'small', 'TradingView v6 Reference: size.small selects small text/shape size. https://www.tradingview.com/pine-script-reference/v6/#var_size.small'],
    ['size.tiny', 'tiny', 'TradingView v6 Reference: size.tiny selects tiny text/shape size. https://www.tradingview.com/pine-script-reference/v6/#var_size.tiny'],
    ['splits.denominator', 'splits.denominator', 'TradingView v6 Reference: splits.denominator is the split denominator field selector for request.splits(). https://www.tradingview.com/pine-script-reference/v6/#var_splits.denominator'],
    ['splits.numerator', 'splits.numerator', 'TradingView v6 Reference: splits.numerator is the split numerator field selector for request.splits(). https://www.tradingview.com/pine-script-reference/v6/#var_splits.numerator'],
    ['text.align_bottom', 'bottom', 'TradingView v6 Reference: text.align_bottom vertically aligns text to the bottom. https://www.tradingview.com/pine-script-reference/v6/#var_text.align_bottom'],
    ['text.align_left', 'left', 'TradingView v6 Reference: text.align_left horizontally aligns text to the left. https://www.tradingview.com/pine-script-reference/v6/#var_text.align_left'],
    ['text.align_right', 'right', 'TradingView v6 Reference: text.align_right horizontally aligns text to the right. https://www.tradingview.com/pine-script-reference/v6/#var_text.align_right'],
    ['text.align_top', 'top', 'TradingView v6 Reference: text.align_top vertically aligns text to the top. https://www.tradingview.com/pine-script-reference/v6/#var_text.align_top'],
    ['text.format_bold', 'bold', 'TradingView v6 Reference: text.format_bold selects bold text formatting. https://www.tradingview.com/pine-script-reference/v6/#var_text.format_bold'],
    ['text.wrap_auto', 'auto', 'TradingView v6 Reference: text.wrap_auto enables automatic text wrapping. https://www.tradingview.com/pine-script-reference/v6/#var_text.wrap_auto'],
    ['text.wrap_none', 'none', 'TradingView v6 Reference: text.wrap_none disables text wrapping. https://www.tradingview.com/pine-script-reference/v6/#var_text.wrap_none'],
    ['xloc.bar_index', 'bar_index', 'TradingView v6 Reference: xloc.bar_index positions drawing x-coordinates by bar index. https://www.tradingview.com/pine-script-reference/v6/#var_xloc.bar_index'],
    ['xloc.bar_time', 'bar_time', 'TradingView v6 Reference: xloc.bar_time positions drawing x-coordinates by bar time. https://www.tradingview.com/pine-script-reference/v6/#var_xloc.bar_time'],
    ['yloc.abovebar', 'abovebar', 'TradingView v6 Reference: yloc.abovebar positions labels above bars. https://www.tradingview.com/pine-script-reference/v6/#var_yloc.abovebar'],
    ['yloc.belowbar', 'belowbar', 'TradingView v6 Reference: yloc.belowbar positions labels below bars. https://www.tradingview.com/pine-script-reference/v6/#var_yloc.belowbar'],
    ['yloc.price', 'price', 'TradingView v6 Reference: yloc.price positions labels at explicit price values. https://www.tradingview.com/pine-script-reference/v6/#var_yloc.price'],
    ['strategy.cash', 'cash', 'TradingView v6 Reference: strategy.cash is the cash-amount default quantity type. https://www.tradingview.com/pine-script-reference/v6/#var_strategy.cash'],
    ['strategy.commission.cash_per_contract', 'cash_per_contract', 'TradingView v6 Reference: strategy.commission.cash_per_contract selects cash-per-contract commission. https://www.tradingview.com/pine-script-reference/v6/#var_strategy.commission.cash_per_contract'],
    ['strategy.commission.cash_per_order', 'cash_per_order', 'TradingView v6 Reference: strategy.commission.cash_per_order selects cash-per-order commission. https://www.tradingview.com/pine-script-reference/v6/#var_strategy.commission.cash_per_order'],
    ['strategy.commission.percent', 'percent', 'TradingView v6 Reference: strategy.commission.percent selects percent-of-position commission. https://www.tradingview.com/pine-script-reference/v6/#var_strategy.commission.percent'],
    ['strategy.direction.all', 'all', 'TradingView v6 Reference: strategy.direction.all allows both long and short entries. https://www.tradingview.com/pine-script-reference/v6/#var_strategy.direction.all'],
    ['strategy.direction.long', 'long', 'TradingView v6 Reference: strategy.direction.long allows long entries. https://www.tradingview.com/pine-script-reference/v6/#var_strategy.direction.long'],
    ['strategy.direction.short', 'short', 'TradingView v6 Reference: strategy.direction.short allows short entries. https://www.tradingview.com/pine-script-reference/v6/#var_strategy.direction.short'],
    ['strategy.fixed', 'fixed', 'TradingView v6 Reference: strategy.fixed is the fixed-contract default quantity type. https://www.tradingview.com/pine-script-reference/v6/#var_strategy.fixed'],
    ['strategy.long', 'long', 'TradingView v6 Reference: strategy.long is the long order direction. https://www.tradingview.com/pine-script-reference/v6/#var_strategy.long'],
    ['strategy.oca.cancel', 'cancel', 'TradingView v6 Reference: strategy.oca.cancel cancels sibling OCA orders after a fill. https://www.tradingview.com/pine-script-reference/v6/#var_strategy.oca.cancel'],
    ['strategy.oca.none', 'none', 'TradingView v6 Reference: strategy.oca.none leaves sibling OCA orders active after a fill. https://www.tradingview.com/pine-script-reference/v6/#var_strategy.oca.none'],
    ['strategy.oca.reduce', 'reduce', 'TradingView v6 Reference: strategy.oca.reduce reduces sibling OCA order quantities after a fill. https://www.tradingview.com/pine-script-reference/v6/#var_strategy.oca.reduce'],
    ['strategy.percent_of_equity', 'percent_of_equity', 'TradingView v6 Reference: strategy.percent_of_equity is the percent-of-equity default quantity type. https://www.tradingview.com/pine-script-reference/v6/#var_strategy.percent_of_equity'],
    ['strategy.short', 'short', 'TradingView v6 Reference: strategy.short is the short order direction. https://www.tradingview.com/pine-script-reference/v6/#var_strategy.short'],
  ]),
  {
    id: 'property.single.strategy.account_currency',
    namespace: 'strategy',
    pine: `//@version=6
strategy("value vector", initial_capital=1000, currency=currency.USD)
plot(strategy.account_currency == "USD" ? 1 : 0)`,
    officialMembers: ['strategy.account_currency'],
    outputMembers: [['strategy.account_currency']],
    rule: 'TradingView v6 Strategies: the strategy declaration currency argument sets the account currency exposed by strategy.account_currency. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/#var_strategy.account_currency',
    expected: (bars) => constantVector(bars, 1),
  },
  {
    id: 'property.single.strategy.initial_capital',
    namespace: 'strategy',
    pine: `//@version=6
strategy("value vector", initial_capital=1000, currency=currency.USD)
plot(strategy.initial_capital)`,
    officialMembers: ['strategy.initial_capital'],
    outputMembers: [['strategy.initial_capital']],
    rule: 'TradingView v6 Strategies: initial_capital in the strategy declaration sets the initial capital metric. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/#var_strategy.initial_capital',
    expected: (bars) => constantVector(bars, 1000),
  },
  {
    id: 'property.single.strategy.no-trade-percent-metrics',
    namespace: 'strategy',
    pine: `//@version=6
strategy("value vector", initial_capital=1000, currency=currency.USD)
plot(strategy.avg_trade_percent)
plot(strategy.avg_winning_trade_percent)
plot(strategy.avg_losing_trade_percent)`,
    officialMembers: ['strategy.avg_trade_percent', 'strategy.avg_winning_trade_percent', 'strategy.avg_losing_trade_percent'],
    outputMembers: [['strategy.avg_trade_percent'], ['strategy.avg_winning_trade_percent'], ['strategy.avg_losing_trade_percent']],
    rule: 'TradingView v6 Strategies: average trade percent metrics are broker-emulator series and have no finite value before any closed trades exist. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: nullVector,
    expectedOutputs: (bars) => [nullVector(bars), nullVector(bars), nullVector(bars)],
  },
  {
    id: 'property.single.strategy.closedtrades.profit_percent',
    namespace: 'strategy',
    pine: `//@version=6
strategy("value vector", initial_capital=1000, currency=currency.USD)
plot(strategy.closedtrades.profit_percent(0))`,
    officialMembers: ['strategy.closedtrades.profit_percent'],
    outputMembers: [['strategy.closedtrades.profit_percent']],
    rule: 'TradingView v6 Reference: strategy.closedtrades.profit_percent(trade_num) returns na when the trade number does not identify a closed trade. https://www.tradingview.com/pine-script-reference/v6/#fun_strategy.closedtrades.profit_percent',
    expected: nullVector,
  },
  {
    id: 'property.single.strategy.runup-drawdown-zero',
    namespace: 'strategy',
    pine: `//@version=6
strategy("value vector", initial_capital=1000, currency=currency.USD)
plot(strategy.max_drawdown)
plot(strategy.max_drawdown_percent)
plot(strategy.max_runup)
plot(strategy.max_runup_percent)`,
    officialMembers: ['strategy.max_drawdown', 'strategy.max_drawdown_percent', 'strategy.max_runup', 'strategy.max_runup_percent'],
    outputMembers: [['strategy.max_drawdown'], ['strategy.max_drawdown_percent'], ['strategy.max_runup'], ['strategy.max_runup_percent']],
    rule: 'TradingView v6 Strategies: before any trade changes equity, max drawdown and max runup metrics are zero. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 0),
    expectedOutputs: (bars) => [constantVector(bars, 0), constantVector(bars, 0), constantVector(bars, 0), constantVector(bars, 0)],
  },
  {
    id: 'property.single.strategy.open-entry-metadata',
    namespace: 'strategy',
    pine: `//@version=6
strategy("value vector", initial_capital=1000, currency=currency.USD, process_orders_on_close=true)
if bar_index == 0
    strategy.entry("L", strategy.long, qty=2, comment="entry")
plot(strategy.opentrades > 0 and strategy.opentrades.entry_id(0) == "L" ? 1 : na)
plot(strategy.opentrades > 0 and strategy.opentrades.entry_comment(0) == "entry" ? 1 : na)
plot(strategy.position_entry_name == "L" ? 1 : na)`,
    officialMembers: ['strategy.opentrades.entry_id', 'strategy.opentrades.entry_comment', 'strategy.position_entry_name'],
    outputMembers: [['strategy.opentrades.entry_id'], ['strategy.opentrades.entry_comment'], ['strategy.position_entry_name']],
    rule: 'TradingView v6 Strategies: a filled entry records its entry id/comment and strategy.position_entry_name identifies the open position entry. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => [constantVector(bars, 1), constantVector(bars, 1), constantVector(bars, 1)],
  },
  {
    id: 'property.single.strategy.open-entry-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("value vector", initial_capital=1000, currency=currency.USD, process_orders_on_close=true)
if bar_index == 0
    strategy.entry("L", strategy.long, qty=2)
plot(strategy.opentrades.entry_bar_index(0))
plot(strategy.opentrades.entry_time(0))
plot(strategy.opentrades.entry_price(0))
plot(strategy.opentrades.size(0))
plot(strategy.opentrades.commission(0))`,
    officialMembers: ['strategy.opentrades.entry_bar_index', 'strategy.opentrades.entry_time', 'strategy.opentrades.entry_price', 'strategy.opentrades.size', 'strategy.opentrades.commission'],
    outputMembers: [['strategy.opentrades.entry_bar_index'], ['strategy.opentrades.entry_time'], ['strategy.opentrades.entry_price'], ['strategy.opentrades.size'], ['strategy.opentrades.commission']],
    rule: 'TradingView v6 Strategies: a process_orders_on_close market entry fills on the signal bar close; the open-trade entry metadata then reports the entry bar, time, fill price, size and commission. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 0),
    expectedOutputs: (bars) => [
      constantVector(bars, 0),
      constantVector(bars, bars[0]?.time ?? null),
      constantVector(bars, bars[0]?.close ?? null),
      constantVector(bars, 2),
      constantVector(bars, 0),
    ],
  },
  {
    id: 'property.single.strategy.open-profit-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("value vector", initial_capital=1000, currency=currency.USD, process_orders_on_close=true)
if bar_index == 0
    strategy.entry("L", strategy.long, qty=2)
plot(strategy.opentrades.profit(0))
plot(strategy.opentrades.profit_percent(0))`,
    officialMembers: ['strategy.opentrades.profit', 'strategy.opentrades.profit_percent'],
    outputMembers: [['strategy.opentrades.profit'], ['strategy.opentrades.profit_percent']],
    rule: 'TradingView v6 Strategies: open-trade profit is mark-to-market against the entry fill price, and profit_percent is profit divided by entry value times 100. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => bars.map((bar) => (bar.close - (bars[0]?.close ?? 0)) * 2),
    expectedOutputs: (bars) => [
      bars.map((bar) => (bar.close - (bars[0]?.close ?? 0)) * 2),
      bars.map((bar) => ((bar.close - (bars[0]?.close ?? 0)) / (bars[0]?.close ?? 1)) * 100),
    ],
  },
  {
    id: 'property.single.strategy.convert_to_account',
    namespace: 'strategy',
    pine: `//@version=6
strategy("value vector", currency=currency.JPY)
plot(strategy.convert_to_account(2))`,
    officialMembers: ['strategy.convert_to_account'],
    outputMembers: [['strategy.convert_to_account']],
    rule: 'TradingView v6 Strategies: strategy.convert_to_account() converts symbol-currency values into the strategy account currency using the relevant currency rate. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/#fun_strategy.convert_to_account',
    expected: () => [300, 300, 300, 302, 302, 302],
    bars: REQUEST_CHART_BARS,
    options: () => ({ requestDatafeed: requestPointDatafeed(), runtime: { syminfo: { currency: 'USD' } } }),
  },
  {
    id: 'property.single.strategy.convert_to_symbol',
    namespace: 'strategy',
    pine: `//@version=6
strategy("value vector", currency=currency.JPY)
plot(strategy.convert_to_symbol(300))`,
    officialMembers: ['strategy.convert_to_symbol'],
    outputMembers: [['strategy.convert_to_symbol']],
    rule: 'TradingView v6 Strategies: strategy.convert_to_symbol() converts account-currency values into the symbol currency using the relevant currency rate. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/#fun_strategy.convert_to_symbol',
    expected: () => [2, 2, 2, 300 / 151, 300 / 151, 300 / 151],
    bars: REQUEST_CHART_BARS,
    options: () => ({ requestDatafeed: requestPointDatafeed(), runtime: { syminfo: { currency: 'USD' } } }),
  },
  {
    id: 'property.single.strategy.opentrades.capital_held',
    namespace: 'strategy',
    pine: `//@version=6
strategy("value vector", process_orders_on_close=true, initial_capital=1000)
if bar_index == 0
    strategy.entry("Open", strategy.short, qty=3)
plot(strategy.opentrades.capital_held)`,
    officialMembers: ['strategy.opentrades.capital_held'],
    outputMembers: [['strategy.opentrades.capital_held']],
    rule: 'TradingView v6 Strategies: strategy.opentrades.capital_held reports capital reserved by open trades. A three-contract short filled at 100 reserves 300. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/#var_strategy.opentrades.capital_held',
    expected: () => [300, 300, 300, 300, 300, 300, 300, 300],
    bars: STRATEGY_ACCESSOR_BARS,
  },
  {
    id: 'property.single.strategy.closedtrades.entry_id',
    namespace: 'strategy',
    pine: `//@version=6
strategy("value vector", process_orders_on_close=true, initial_capital=1000)
if bar_index == 0
    strategy.entry("Win", strategy.long, qty=1, comment="entry-comment")
if bar_index == 1
    strategy.close("Win", comment="exit-comment")
idx = strategy.closedtrades - 1
plot(strategy.closedtrades > 0 and strategy.closedtrades.entry_id(idx) == "Win" ? 1 : na)`,
    officialMembers: ['strategy.closedtrades.entry_id'],
    outputMembers: [['strategy.closedtrades.entry_id']],
    rule: 'TradingView v6 Strategies: strategy.closedtrades.entry_id(trade_num) returns the entry id for the closed trade at the supplied zero-based index. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/#fun_strategy.closedtrades.entry_id',
    expected: () => [null, 1, 1, 1, 1, 1, 1, 1],
    bars: STRATEGY_ACCESSOR_BARS,
  },
  {
    id: 'property.single.strategy.closedtrades.entry_comment',
    namespace: 'strategy',
    pine: `//@version=6
strategy("value vector", process_orders_on_close=true, initial_capital=1000)
if bar_index == 0
    strategy.entry("Win", strategy.long, qty=1, comment="entry-comment")
if bar_index == 1
    strategy.close("Win", comment="exit-comment")
idx = strategy.closedtrades - 1
plot(strategy.closedtrades > 0 and strategy.closedtrades.entry_comment(idx) == "entry-comment" ? 1 : na)`,
    officialMembers: ['strategy.closedtrades.entry_comment'],
    outputMembers: [['strategy.closedtrades.entry_comment']],
    rule: 'TradingView v6 Strategies: strategy.closedtrades.entry_comment(trade_num) returns the entry comment for the closed trade at the supplied zero-based index. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/#fun_strategy.closedtrades.entry_comment',
    expected: () => [null, 1, 1, 1, 1, 1, 1, 1],
    bars: STRATEGY_ACCESSOR_BARS,
  },
  {
    id: 'property.single.strategy.closedtrades.exit_id',
    namespace: 'strategy',
    pine: `//@version=6
strategy("value vector", process_orders_on_close=true, initial_capital=1000)
if bar_index == 0
    strategy.entry("Win", strategy.long, qty=1, comment="entry-comment")
if bar_index == 1
    strategy.close("Win", comment="exit-comment")
idx = strategy.closedtrades - 1
plot(strategy.closedtrades > 0 and str.length(strategy.closedtrades.exit_id(idx)) > 0 ? 1 : na)`,
    officialMembers: ['strategy.closedtrades.exit_id', 'str.length'],
    outputMembers: [['strategy.closedtrades.exit_id']],
    rule: 'TradingView v6 Strategies: strategy.closedtrades.exit_id(trade_num) returns the generated exit order id for the closed trade at the supplied zero-based index. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/#fun_strategy.closedtrades.exit_id',
    expected: () => [null, 1, 1, 1, 1, 1, 1, 1],
    bars: STRATEGY_ACCESSOR_BARS,
  },
  {
    id: 'property.single.strategy.closedtrades.exit_comment',
    namespace: 'strategy',
    pine: `//@version=6
strategy("value vector", process_orders_on_close=true, initial_capital=1000)
if bar_index == 0
    strategy.entry("Win", strategy.long, qty=1, comment="entry-comment")
if bar_index == 1
    strategy.close("Win", comment="exit-comment")
idx = strategy.closedtrades - 1
plot(strategy.closedtrades > 0 and strategy.closedtrades.exit_comment(idx) == "exit-comment" ? 1 : na)`,
    officialMembers: ['strategy.closedtrades.exit_comment'],
    outputMembers: [['strategy.closedtrades.exit_comment']],
    rule: 'TradingView v6 Strategies: strategy.closedtrades.exit_comment(trade_num) returns the exit comment for the closed trade at the supplied zero-based index. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/#fun_strategy.closedtrades.exit_comment',
    expected: () => [null, 1, 1, 1, 1, 1, 1, 1],
    bars: STRATEGY_ACCESSOR_BARS,
  },
  {
    id: 'ta.sma',
    namespace: 'ta',
    pine: pine('ta.sma(close, 3)'),
    rule: TA_SMA_FORMULA_CITATION,
    expected: (bars) => sma(bars, 3),
    discriminationProof: {
      ...TA_MOVING_AVERAGE_SEED_DISCRIMINATION,
      helperFormulaCitation: TA_SMA_FORMULA_CITATION,
    },
  },
  {
    id: 'ta.sma.nested-expression-source-order-values',
    namespace: 'ta',
    pine: pine('ta.sma(ta.sma(close, 2) + 1, 2)'),
    rule: 'TradingView v6 Reference: ta.sma(source, length) is the arithmetic mean of the last length non-na source values. A nested source expression must be evaluated before the outer SMA length is bound, so ta.sma(ta.sma(close, 2) + 1, 2) first forms the inner 2-bar close average plus one, then averages two of those values. https://www.tradingview.com/pine-script-reference/v6/#fun_ta.sma',
    expected: (bars) => smaValues(sma(bars, 2).map((value) => value === null ? null : value + 1), 2),
    discriminationProof: {
      ...TA_MOVING_AVERAGE_SEED_DISCRIMINATION,
      helperFormulaCitation: TA_SMA_FORMULA_CITATION,
    },
  },
  {
    id: 'ta.ema',
    namespace: 'ta',
    pine: pine('ta.ema(close, 3)'),
    rule: TA_EMA_FORMULA_CITATION,
    expected: (bars) => ema(bars, 3),
    discriminationProof: {
      ...TA_MOVING_AVERAGE_SEED_DISCRIMINATION,
      helperFormulaCitation: TA_EMA_FORMULA_CITATION,
    },
  },
  { id: 'ta.dema', namespace: 'ta', pine: pine('ta.dema(close, 20)'), expected: (bars) => dema(bars, 20), bars: LONG_BARS },
  { id: 'ta.tema', namespace: 'ta', pine: pine('ta.tema(close, 20)'), expected: (bars) => tema(bars, 20), bars: LONG_BARS },
  { id: 'ta.hma', namespace: 'ta', pine: pine('ta.hma(close, 16)'), expected: (bars) => hma(bars, 16), bars: LONG_BARS },
  { id: 'ta.tsi', namespace: 'ta', pine: pine('ta.tsi(close, 13, 25)'), expected: (bars) => tsi(bars, 13, 25), bars: LONG_BARS },
  {
    id: 'ta.rma',
    namespace: 'ta',
    pine: pine('ta.rma(close, 3)'),
    rule: TA_RMA_FORMULA_CITATION,
    expected: (bars) => rma(bars.map((bar) => bar.close), 3),
    discriminationProof: TA_RMA_SEED_DISCRIMINATION,
  },
  {
    id: 'ta.smma',
    namespace: 'ta',
    pine: pine('ta.smma(close, 20)'),
    rule: TA_RMA_FORMULA_CITATION,
    expected: (bars) => rma(bars.map((bar) => bar.close), 20),
    bars: LONG_BARS,
    discriminationProof: TA_RMA_SEED_DISCRIMINATION,
  },
  {
    id: 'ta.rsi',
    namespace: 'ta',
    pine: pine('ta.rsi(close, 3)'),
    rule: TA_RSI_FORMULA_CITATION,
    expected: (bars) => rsi(bars, 3),
    discriminationProof: {
      ...TA_MOVING_AVERAGE_SEED_DISCRIMINATION,
      helperFormulaCitation: TA_RSI_FORMULA_CITATION,
    },
  },
  { id: 'ta.stdev', namespace: 'ta', pine: pine('ta.stdev(close, 3)'), expected: (bars) => stdev(bars, 3) },
  {
    id: 'ta.stdev.unbiased',
    namespace: 'ta',
    pine: pine('ta.stdev(close, 3, false)'),
    rule: 'TradingView v6 Reference: ta.stdev(source, length, biased) uses a biased estimate by default, and biased=false selects the unbiased estimate. https://www.tradingview.com/pine-script-reference/v6/#fun_ta.stdev',
    expected: (bars) => stdevUnbiased(bars, 3),
  },
  { id: 'ta.variance', namespace: 'ta', pine: pine('ta.variance(close, 3)'), expected: (bars) => variance(bars, 3) },
  {
    id: 'ta.variance.unbiased',
    namespace: 'ta',
    pine: pine('ta.variance(close, 3, false)'),
    rule: 'TradingView v6 Reference: ta.variance(source, length, biased) uses a biased estimate by default, and biased=false selects the unbiased estimate. https://www.tradingview.com/pine-script-reference/v6/#fun_ta.variance',
    expected: (bars) => varianceUnbiased(bars, 3),
  },
  {
    id: 'ta.atr',
    namespace: 'ta',
    pine: pine('ta.atr(3)'),
    rule: TA_ATR_FORMULA_CITATION,
    expected: (bars) => atr(bars, 3),
    discriminationProof: {
      ...TA_MOVING_AVERAGE_SEED_DISCRIMINATION,
      helperFormulaCitation: TA_ATR_FORMULA_CITATION,
    },
  },
  { id: 'ta.wma', namespace: 'ta', pine: pine('ta.wma(close, 3)'), expected: (bars) => wma(bars, 3) },
  { id: 'ta.dev', namespace: 'ta', pine: pine('ta.dev(close, 3)'), expected: (bars) => meanDeviation(bars, 3) },
  {
    id: 'ta.highest',
    namespace: 'ta',
    pine: pine('ta.highest(high, 3)'),
    rule: TA_HIGHEST_FORMULA_CITATION,
    expected: (bars) => highest(bars, 3, (bar) => bar.high),
    discriminationProof: {
      ...TA_EXTREMA_VALUE_DISCRIMINATION,
      helperFormulaCitation: TA_HIGHEST_FORMULA_CITATION,
    },
  },
  {
    id: 'ta.lowest',
    namespace: 'ta',
    pine: pine('ta.lowest(low, 3)'),
    rule: TA_LOWEST_FORMULA_CITATION,
    expected: (bars) => lowest(bars, 3, (bar) => bar.low),
    discriminationProof: {
      ...TA_EXTREMA_VALUE_DISCRIMINATION,
      helperFormulaCitation: TA_LOWEST_FORMULA_CITATION,
    },
  },
  { id: 'ta.vwma', namespace: 'ta', pine: pine('ta.vwma(close, 3)'), expected: (bars) => vwma(bars, 3) },
  { id: 'ta.cum', namespace: 'ta', pine: pine('ta.cum(close)'), expected: cumulative },
  { id: 'ta.change', namespace: 'ta', pine: pine('ta.change(close)'), expected: change },
  {
    id: 'ta.change.length',
    namespace: 'ta',
    pine: pine('ta.change(close, 3)'),
    rule: 'TradingView v6 Reference: ta.change(source, length) returns the difference between the current source and the source length bars ago. https://www.tradingview.com/pine-script-reference/v6/#fun_ta.change',
    expected: (bars) => changeLength(bars, 3),
  },
  { id: 'ta.barssince', namespace: 'ta', pine: pine('ta.barssince(close < close[1])'), expected: barsSince },
  { id: 'ta.valuewhen', namespace: 'ta', pine: pine('ta.valuewhen(close < close[1], close, 0)'), expected: valueWhen },
  { id: 'ta.crossover', namespace: 'ta', pine: pine('ta.crossover(close, 13) ? 1 : 0'), expected: (bars) => crossover(bars, 13) },
  { id: 'ta.crossunder', namespace: 'ta', pine: pine('ta.crossunder(close, 13) ? 1 : 0'), expected: (bars) => crossunder(bars, 13) },
  { id: 'ta.cross', namespace: 'ta', pine: pine('ta.cross(close, 13) ? 1 : 0'), expected: (bars) => cross(bars, 13) },
  {
    id: 'depth.ta-named-workhorse-values',
    namespace: 'ta',
    pine: `//@version=6
indicator("TA named workhorse depth")
plot(ta.ema(source=close, length=3))
plot(ta.sma(source=close, length=3))
plot(ta.highest(source=high, length=3))
plot(ta.lowest(source=low, length=3))
plot(ta.atr(length=3))
plot(ta.crossover(source1=close, source2=0) ? 1 : 0)
plot(ta.crossunder(source1=close, source2=0) ? 1 : 0)`,
    officialMembers: ['ta.ema', 'ta.sma', 'ta.highest', 'ta.lowest', 'ta.atr', 'ta.crossover', 'ta.crossunder'],
    outputMembers: [['ta.ema'], ['ta.sma'], ['ta.highest'], ['ta.lowest'], ['ta.atr'], ['ta.crossover'], ['ta.crossunder']],
    rule: 'TradingView v6 Reference: named arguments bind to the same TA source/length slots as positional calls; EMA, SMA, rolling extrema, ATR, crossover, and crossunder then follow their documented formulas. https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => ema(bars, 3),
    expectedOutputs: (bars) => [
      ema(bars, 3),
      sma(bars, 3),
      highest(bars, 3, (bar) => bar.high),
      lowest(bars, 3, (bar) => bar.low),
      atr(bars, 3),
      crossover(bars, 0),
      crossunder(bars, 0),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'priority.ta-workhorse-history-values',
    namespace: 'ta',
    pine: `//@version=6
indicator("priority ta workhorse history values")
plot(ta.sma(close, 3)[1])
plot(ta.ema(close, 3)[1])
plot(ta.atr(3)[1])
plot(ta.highest(high, 3)[1])
plot(ta.lowest(low, 3)[1])
plot(ta.crossover(close, 0)[1] ? 1 : 0)
plot(ta.crossunder(close, 0)[1] ? 1 : 0)
plot(ta.rsi(close, 3)[1])
plot(ta.rma(close, 3)[1])
plot(ta.wma(close, 3)[1])
plot(ta.barssince(close > 0)[1])
plot(ta.tr(true)[1])`,
    officialMembers: ['ta.sma', 'ta.ema', 'ta.atr', 'ta.highest', 'ta.lowest', 'ta.crossover', 'ta.crossunder', 'ta.rsi', 'ta.rma', 'ta.wma', 'ta.barssince', 'ta.tr'],
    outputMembers: [
      ['ta.sma'],
      ['ta.ema'],
      ['ta.atr'],
      ['ta.highest'],
      ['ta.lowest'],
      ['ta.crossover'],
      ['ta.crossunder'],
      ['ta.rsi'],
      ['ta.rma'],
      ['ta.wma'],
      ['ta.barssince'],
      ['ta.tr'],
    ],
    rule: 'TradingView v6 Operators and TA functions: history references on TA call results read the prior bar value of that computed series; each TA value follows its documented formula before the history offset is applied. https://www.tradingview.com/pine-script-docs/language/operators/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => previousVector(sma(bars, 3)),
    expectedOutputs: (bars) => [
      previousVector(sma(bars, 3)),
      previousVector(ema(bars, 3)),
      previousVector(atr(bars, 3)),
      previousVector(highest(bars, 3, (bar) => bar.high)),
      previousVector(lowest(bars, 3, (bar) => bar.low)),
      previousBoolVector(crossover(bars, 0)),
      previousBoolVector(crossunder(bars, 0)),
      previousVector(rsi(bars, 3)),
      previousVector(rma(bars.map((bar) => bar.close), 3)),
      previousVector(wma(bars, 3)),
      previousVector(barsSinceAbove(bars, 0)),
      previousVector(trueRange(bars)),
    ],
    bars: HOSTILE_BARS,
  },
  { id: 'ta.rising', namespace: 'ta', pine: pine('ta.rising(close, 1) ? 1 : 0'), expected: rising },
  { id: 'ta.falling', namespace: 'ta', pine: pine('ta.falling(close, 1) ? 1 : 0'), expected: falling },
  { id: 'ta.max', namespace: 'ta', pine: pine('ta.max(close)'), expected: (bars) => allTimeExtremum(bars, Math.max) },
  { id: 'ta.min', namespace: 'ta', pine: pine('ta.min(close)'), expected: (bars) => allTimeExtremum(bars, Math.min) },
  { id: 'ta.cci', namespace: 'ta', pine: pine('ta.cci(close, 3)'), expected: (bars) => cci(bars, 3) },
  { id: 'ta.wpr', namespace: 'ta', pine: pine('ta.wpr(3)'), expected: (bars) => williamsR(bars, 3) },
  { id: 'hostile.wpr.zero-range', namespace: 'ta', pine: pine('ta.wpr(3)'), expected: (bars) => williamsR(bars, 3), bars: ZERO_SPREAD_BARS },
  {
    id: 'ta.pivot_point_levels.size',
    namespace: 'ta',
    pine: `//@version=6
indicator("Pivot point levels size")
levels = ta.pivot_point_levels("Traditional", "Daily", developing=true)
plot(array.size(levels))`,
    rule: 'TradingView v6 Reference: ta.pivot_point_levels(type, timeframe, developing) returns the current pivot levels array; developing=true permits levels to update during the active period for supported pivot types without changing the array arity. https://www.tradingview.com/pine-script-reference/v6/#fun_ta.pivot_point_levels',
    expected: (bars) => constantVector(bars, 11),
  },
  {
    id: 'ta.bb',
    namespace: 'ta',
    pine: `//@version=6\nindicator("BB vector")\n[basis, upper, lower] = ta.bb(close, 3, 2)\nplot(basis)\nplot(upper)\nplot(lower)`,
    expected: (bars) => bollingerBands(bars, 3, 2)[0]!,
    expectedOutputs: (bars) => bollingerBands(bars, 3, 2),
  },
  {
    id: 'hostile.bb.middle-na',
    namespace: 'ta',
    pine: `//@version=6
indicator("BB hostile vector")
[basis, upper, lower] = ta.bb(close, 3, 2)
plot(basis)
plot(upper)
plot(lower)`,
    expected: (bars) => bollingerBands(bars, 3, 2)[0]!,
    expectedOutputs: (bars) => bollingerBands(bars, 3, 2),
    bars: HOLE_BARS,
  },
  { id: 'ta.bbw', namespace: 'ta', pine: pine('ta.bbw(close, 3, 2)'), expected: (bars) => bollingerWidth(bars, 3, 2) },
  { id: 'hostile.bbw.flat', namespace: 'ta', pine: pine('ta.bbw(close, 3, 2)'), expected: (bars) => bollingerWidth(bars, 3, 2), bars: FLAT_BARS },
  { id: 'ta.median', namespace: 'ta', pine: pine('ta.median(close, 3)'), expected: (bars) => median(bars, 3) },
  { id: 'hostile.median.middle-na', namespace: 'ta', pine: pine('ta.median(close, 3)'), expected: (bars) => median(bars, 3), bars: HOLE_BARS },
  { id: 'hostile.median.flat', namespace: 'ta', pine: pine('ta.median(close, 3)'), expected: (bars) => median(bars, 3), bars: FLAT_BARS },
  { id: 'ta.linreg', namespace: 'ta', pine: pine('ta.linreg(close, 3, 1)'), expected: (bars) => linreg(bars, 3, 1) },
  { id: 'hostile.linreg.middle-na', namespace: 'ta', pine: pine('ta.linreg(close, 3, 1)'), expected: (bars) => linreg(bars, 3, 1), bars: HOLE_BARS },
  { id: 'hostile.linreg.flat', namespace: 'ta', pine: pine('ta.linreg(close, 3, 1)'), expected: (bars) => linreg(bars, 3, 1), bars: FLAT_BARS },
  { id: 'ta.alma', namespace: 'ta', pine: pine('ta.alma(close, 5, 0.85, 6)'), expected: (bars) => alma(bars, 5, 0.85, 6) },
  { id: 'ta.alma.explicit-floor', namespace: 'ta', pine: pine('ta.alma(close, 5, 0.85, 6, true)'), expected: (bars) => alma(bars, 5, 0.85, 6, true) },
  {
    id: 'ta.macd',
    namespace: 'ta',
    pine: `//@version=6
indicator("MACD vector")
[line, signal, histogram] = ta.macd(close, 12, 26, 9)
plot(line)
plot(signal)
plot(histogram)`,
    expected: (bars) => macd(bars, 12, 26, 9)[0]!,
    expectedOutputs: (bars) => macd(bars, 12, 26, 9),
    bars: LONG_BARS,
  },
  {
    id: 'hostile.macd.middle-na',
    namespace: 'ta',
    pine: `//@version=6
indicator("MACD hostile vector")
[line, signal, histogram] = ta.macd(close, 3, 5, 2)
plot(line)
plot(signal)
plot(histogram)`,
    expected: (bars) => macd(bars, 3, 5, 2)[0]!,
    expectedOutputs: (bars) => macd(bars, 3, 5, 2),
    bars: HOLE_BARS,
  },
  {
    id: 'ta.kc',
    namespace: 'ta',
    pine: `//@version=6
indicator("Keltner vector")
[basis, upper, lower] = ta.kc(close, 20, 1.5)
plot(basis)
plot(upper)
plot(lower)`,
    expected: (bars) => keltner(bars, 20, 1.5)[0]!,
    expectedOutputs: (bars) => keltner(bars, 20, 1.5),
    bars: LONG_BARS,
  },
  {
    id: 'hostile.kc.middle-na',
    namespace: 'ta',
    pine: `//@version=6
indicator("KC hostile vector")
[basis, upper, lower] = ta.kc(close, 3, 1.5)
plot(basis)
plot(upper)
plot(lower)`,
    expected: (bars) => keltner(bars, 3, 1.5)[0]!,
    expectedOutputs: (bars) => keltner(bars, 3, 1.5),
    bars: HOLE_BARS,
  },
  {
    id: 'ta.kc.high-low-range',
    namespace: 'ta',
    pine: `//@version=6
indicator("Keltner high-low range vector")
[basis, upper, lower] = ta.kc(close, 20, 1.5, false)
plot(basis)
plot(upper)
plot(lower)`,
    rule: 'TradingView v6 Reference: ta.kc(series, length, mult, useTrueRange) uses true range by default; useTrueRange=false uses the high-low range. https://www.tradingview.com/pine-script-reference/v6/#fun_ta.kc',
    expected: (bars) => keltner(bars, 20, 1.5, false)[0]!,
    expectedOutputs: (bars) => keltner(bars, 20, 1.5, false),
    bars: LONG_BARS,
  },
  { id: 'ta.kcw', namespace: 'ta', pine: pine('ta.kcw(close, 20, 1.5)'), expected: (bars) => keltnerWidth(bars, 20, 1.5), bars: LONG_BARS },
  {
    id: 'ta.kcw.high-low-range',
    namespace: 'ta',
    pine: pine('ta.kcw(close, 20, 1.5, false)'),
    rule: 'TradingView v6 Reference: ta.kcw(series, length, mult, useTrueRange) uses true range by default; useTrueRange=false uses the high-low range. https://www.tradingview.com/pine-script-reference/v6/#fun_ta.kcw',
    expected: (bars) => keltnerWidth(bars, 20, 1.5, false),
    bars: LONG_BARS,
  },
  { id: 'ta.stoch', namespace: 'ta', pine: pine('ta.stoch(close, high, low, 3)'), expected: (bars) => stochastic(bars, 3), bars: HOSTILE_BARS },
  { id: 'hostile.stoch.zero-range', namespace: 'ta', pine: pine('ta.stoch(close, high, low, 3)'), expected: (bars) => stochastic(bars, 3), bars: ZERO_SPREAD_BARS },
  { id: 'ta.obv', namespace: 'ta', pine: pine('ta.obv'), rule: TA_OBV_RULE, expected: obv, bars: LONG_BARS },
  {
    id: 'ta.obv.source-volume',
    namespace: 'ta',
    pine: pine('ta.obv(open, volume * 2)'),
    rule: 'TradingView v6 Reference: ta.obv(source, volume) accumulates signed volume from changes in the supplied source; omitted arguments default to close and volume. https://www.tradingview.com/pine-script-reference/v6/#fun_ta.obv',
    expected: (bars) => obvWithSourceVolume(bars, (bar) => bar.open, (bar) => bar.volume * 2),
    bars: LONG_BARS,
  },
  { id: 'hostile.obv.leading-na', namespace: 'ta', pine: pine('ta.obv'), rule: TA_OBV_RULE, expected: obv, bars: LEADING_NA_BARS },
  { id: 'hostile.obv.middle-na', namespace: 'ta', pine: pine('ta.obv'), rule: TA_OBV_RULE, expected: obv, bars: HOLE_BARS },
  { id: 'hostile.obv.all-na', namespace: 'ta', pine: pine('ta.obv'), rule: TA_OBV_RULE, expected: obv, bars: ALL_NA_BARS },
  { id: 'ta.cmo', namespace: 'ta', pine: pine('ta.cmo(close, 3)'), expected: (bars) => cmo(bars, 3), bars: HOSTILE_BARS },
  { id: 'hostile.cmo.middle-na', namespace: 'ta', pine: pine('ta.cmo(close, 3)'), expected: (bars) => cmo(bars, 3), bars: HOLE_BARS },
  {
    id: 'ta.mfi',
    namespace: 'ta',
    pine: pine('ta.mfi(close, 20)'),
    rule: 'TradingView v6 Reference: ta.mfi(source, length) computes Money Flow Index from signed source * volume money flow over the requested window. https://www.tradingview.com/pine-script-reference/v6/#fun_ta.mfi',
    expected: (bars) => mfi(bars, 20),
    bars: LONG_BARS,
  },
  {
    id: 'ta.mfi.clean-typical-price-values',
    namespace: 'ta',
    pine: pine('ta.mfi(hlc3, 3)'),
    rule: 'TradingView v6 Reference: hlc3 is (high + low + close) / 3 and ta.mfi(source, length) computes the money flow ratio from positive and negative source * volume flows. https://www.tradingview.com/pine-script-reference/v6/#var_hlc3 https://www.tradingview.com/pine-script-reference/v6/#fun_ta.mfi',
    expected: (bars) => mfiFromSource(bars, 3, typicalPrice),
    bars: MFI_CLEAN_BARS,
  },
  {
    id: 'hostile.mfi.middle-na',
    namespace: 'ta',
    pine: pine('ta.mfi(close, 3)'),
    rule: 'TradingView v6 Reference: ta.mfi(source, length) computes Money Flow Index from signed source * volume money flow; exact interior-na behavior remains trace-required outside clean-data arithmetic. https://www.tradingview.com/pine-script-reference/v6/#fun_ta.mfi',
    expected: (bars) => mfi(bars, 3),
    bars: HOLE_BARS,
  },
  { id: 'ta.wad', namespace: 'ta', pine: pine('ta.wad'), rule: TA_WAD_RULE, expected: wad, bars: LONG_BARS },
  { id: 'hostile.wad.leading-na', namespace: 'ta', pine: pine('ta.wad'), rule: TA_WAD_RULE, expected: wad, bars: LEADING_NA_BARS },
  { id: 'hostile.wad.middle-na', namespace: 'ta', pine: pine('ta.wad'), rule: TA_WAD_RULE, expected: wad, bars: HOLE_BARS },
  { id: 'hostile.wad.all-na', namespace: 'ta', pine: pine('ta.wad'), rule: TA_WAD_RULE, expected: wad, bars: ALL_NA_BARS },
  { id: 'ta.iii', namespace: 'ta', pine: pine('ta.iii'), rule: TA_III_RULE, expected: iii, bars: LONG_BARS },
  { id: 'hostile.iii.leading-na', namespace: 'ta', pine: pine('ta.iii'), rule: TA_III_RULE, expected: iii, bars: LEADING_NA_BARS },
  { id: 'hostile.iii.middle-na', namespace: 'ta', pine: pine('ta.iii'), rule: TA_III_RULE, expected: iii, bars: HOLE_BARS },
  { id: 'hostile.iii.zero-range', namespace: 'ta', pine: pine('ta.iii'), rule: TA_III_RULE, expected: iii, bars: ZERO_RANGE_BARS },
  { id: 'hostile.iii.all-na', namespace: 'ta', pine: pine('ta.iii'), rule: TA_III_RULE, expected: iii, bars: ALL_NA_BARS },
  { id: 'ta.nvi', namespace: 'ta', pine: pine('ta.nvi'), rule: TA_NVI_RULE, expected: nvi, bars: NVI_BARS },
  { id: 'hostile.nvi.leading-na', namespace: 'ta', pine: pine('ta.nvi'), rule: TA_NVI_RULE, expected: nvi, bars: NVI_LEADING_NA_BARS },
  { id: 'hostile.nvi.middle-na', namespace: 'ta', pine: pine('ta.nvi'), rule: TA_NVI_RULE, expected: nvi, bars: NVI_HOLE_BARS },
  { id: 'hostile.nvi.all-na', namespace: 'ta', pine: pine('ta.nvi'), rule: TA_NVI_RULE, expected: nvi, bars: NVI_ALL_NA_BARS },
  { id: 'ta.pvi', namespace: 'ta', pine: pine('ta.pvi'), rule: TA_PVI_RULE, expected: pvi, bars: NVI_BARS },
  { id: 'hostile.pvi.leading-na', namespace: 'ta', pine: pine('ta.pvi'), rule: TA_PVI_RULE, expected: pvi, bars: NVI_LEADING_NA_BARS },
  { id: 'hostile.pvi.middle-na', namespace: 'ta', pine: pine('ta.pvi'), rule: TA_PVI_RULE, expected: pvi, bars: NVI_HOLE_BARS },
  { id: 'hostile.pvi.all-na', namespace: 'ta', pine: pine('ta.pvi'), rule: TA_PVI_RULE, expected: pvi, bars: NVI_ALL_NA_BARS },
  { id: 'ta.pvt', namespace: 'ta', pine: pine('ta.pvt'), rule: TA_PVT_RULE, expected: pvt, bars: LONG_BARS },
  { id: 'hostile.pvt.leading-na', namespace: 'ta', pine: pine('ta.pvt'), rule: TA_PVT_RULE, expected: pvt, bars: LEADING_NA_BARS },
  { id: 'hostile.pvt.middle-na', namespace: 'ta', pine: pine('ta.pvt'), rule: TA_PVT_RULE, expected: pvt, bars: HOLE_BARS },
  { id: 'hostile.pvt.all-na', namespace: 'ta', pine: pine('ta.pvt'), rule: TA_PVT_RULE, expected: pvt, bars: ALL_NA_BARS },
  { id: 'ta.accdist', namespace: 'ta', pine: pine('ta.accdist'), expected: accdist, bars: LONG_BARS },
  { id: 'ta.wvad', namespace: 'ta', pine: pine('ta.wvad'), rule: TA_WVAD_RULE, expected: wvad, bars: LONG_BARS },
  { id: 'hostile.wvad.leading-na', namespace: 'ta', pine: pine('ta.wvad'), rule: TA_WVAD_RULE, expected: wvad, bars: LEADING_NA_BARS },
  { id: 'hostile.wvad.middle-na', namespace: 'ta', pine: pine('ta.wvad'), rule: TA_WVAD_RULE, expected: wvad, bars: HOLE_BARS },
  { id: 'hostile.wvad.all-na', namespace: 'ta', pine: pine('ta.wvad'), rule: TA_WVAD_RULE, expected: wvad, bars: ALL_NA_BARS },
  { id: 'ta.cog', namespace: 'ta', pine: pine('ta.cog(close, 20)'), expected: (bars) => cog(bars, 20), bars: LONG_BARS },
  { id: 'ta.percentrank', namespace: 'ta', pine: pine('ta.percentrank(close, 20)'), expected: (bars) => percentRank(bars, 20), bars: LONG_BARS },
  { id: 'ta.mode', namespace: 'ta', pine: pine('ta.mode(close, 3)'), expected: (bars) => mode(bars, 3), bars: FLAT_BARS },
  { id: 'ta.rci', namespace: 'ta', pine: pine('ta.rci(close, 20)'), expected: (bars) => rci(bars, 20), bars: LONG_BARS },
  { id: 'ta.sum', namespace: 'ta', pine: pine('ta.sum(close, 3)'), expected: (bars) => rollingSum(bars, 3), bars: HOSTILE_BARS },
  { id: 'hostile.sum.middle-na', namespace: 'ta', pine: pine('ta.sum(close, 3)'), expected: (bars) => rollingSum(bars, 3), bars: HOLE_BARS },
  { id: 'tradingview-ta.changePercent.v7', namespace: 'ta', pine: pineWithImport(7, 'tvta.changePercent(close, close[1])'), expected: arithmeticChangePercent, bars: HOSTILE_BARS },
  {
    id: 'tradingview-ta.aroon.v7',
    namespace: 'ta',
    pine: `//@version=6
import TradingView/ta/7 as tvta
indicator("Aroon vector")
[up, down] = tvta.aroon(3)
plot(up)
plot(down)`,
    rule: EXTREMA_BARS_OFFSET_RULE,
    expected: (bars) => aroon(bars, 3)[0]!,
    expectedOutputs: (bars) => aroon(bars, 3),
    bars: PLATEAU_BARS,
  },
  {
    id: 'tradingview-ta.donchian.v7',
    namespace: 'ta',
    pine: `//@version=6
import TradingView/ta/7 as tvta
indicator("Donchian vector")
[highBand, lowBand, middleBand] = tvta.donchian(3)
plot(highBand)
plot(lowBand)
plot(middleBand)`,
    expected: (bars) => donchian(bars, 3)[0]!,
    expectedOutputs: (bars) => donchian(bars, 3),
    bars: HOSTILE_BARS,
  },
  { id: 'tradingview-ta.highestSince.v7', namespace: 'ta', pine: pineWithImport(7, 'tvta.highestSince(close < 0, high)'), expected: (bars) => highestSince(bars, (bar) => bar.close < 0, (bar) => bar.high), bars: HOSTILE_BARS },
  { id: 'tradingview-ta.lowestSince.v7', namespace: 'ta', pine: pineWithImport(7, 'tvta.lowestSince(close > 2, low)'), expected: (bars) => lowestSince(bars, (bar) => bar.close > 2, (bar) => bar.low), bars: HOSTILE_BARS },
  { id: 'tradingview-ta.trima.v7', namespace: 'ta', pine: pineWithImport(7, 'tvta.trima(close, 5)'), expected: (bars) => triangularMovingAverage(bars, 5), bars: LONG_BARS },
  { id: 'tradingview-ta.cagr.v1', namespace: 'ta', pine: pineWithImport(1, 'tvta.cagr(time[5], close[5], time, close)'), expected: cagr, bars: DAILY_BARS },
  { id: 'tradingview-ta.er.v12', namespace: 'ta', pine: pineWithImport(12, 'tvta.er(close, 3)'), expected: (bars) => efficiencyRatio(bars, 3), bars: HOSTILE_BARS },
  { id: 'tradingview-ta.kama.v12', namespace: 'ta', pine: pineWithImport(12, 'tvta.kama(close, 3, 2, 5)'), expected: (bars) => kaufmanAdaptiveMovingAverage(bars, 3, 2, 5), bars: HOSTILE_BARS },
  {
    id: 'tradingview-ta.chandelier.v12',
    namespace: 'ta',
    pine: `//@version=6
import TradingView/ta/12 as tvta
indicator("Chandelier vector")
[longStop, shortStop] = tvta.chandelier(3, 3, 2)
plot(longStop)
plot(shortStop)`,
    expected: (bars) => chandelier(bars, 3, 3, 2)[0]!,
    expectedOutputs: (bars) => chandelier(bars, 3, 3, 2),
    bars: HOSTILE_BARS,
  },
  {
    id: 'tradingview-ta.ppo.v12',
    namespace: 'ta',
    pine: `//@version=6
import TradingView/ta/12 as tvta
indicator("PPO vector")
[line, signal, histogram] = tvta.ppo(close, 3, 5, 2)
plot(line)
plot(signal)
plot(histogram)`,
    expected: (bars) => percentagePriceOscillator(bars, 3, 5, 2)[0]!,
    expectedOutputs: (bars) => percentagePriceOscillator(bars, 3, 5, 2),
    bars: LONG_BARS,
  },
  {
    id: 'tradingview-ta.trix.v12',
    namespace: 'ta',
    pine: `//@version=6
import TradingView/ta/12 as tvta
indicator("TRIX vector")
[line, signal, histogram] = tvta.trix(close, 3, 2)
plot(line)
plot(signal)
plot(histogram)`,
    expected: (bars) => tripleExponentialAverageOscillator(bars, 3, 2)[0]!,
    expectedOutputs: (bars) => tripleExponentialAverageOscillator(bars, 3, 2),
    bars: LONG_BARS,
  },
  { id: 'tradingview-ta.ulcerIndex.v12', namespace: 'ta', pine: pineWithImport(12, 'tvta.ulcerIndex(close, 3)'), expected: (bars) => ulcerIndex(bars, 3), bars: HOSTILE_BARS },
  { id: 'math.abs', namespace: 'math', pine: pine('math.abs(close)'), expected: mathAbs, bars: HOSTILE_BARS },
  { id: 'math.max', namespace: 'math', pine: pine('math.max(close, open)'), expected: mathMax, bars: HOSTILE_BARS },
  { id: 'math.min', namespace: 'math', pine: pine('math.min(close, open)'), expected: mathMin, bars: HOSTILE_BARS },
  { id: 'math.sign', namespace: 'math', pine: pine('math.sign(close)'), expected: mathSign, bars: HOSTILE_BARS },
  { id: 'math.sqrt', namespace: 'math', pine: pine('math.sqrt(math.abs(close))'), expected: mathSqrtAbs, bars: HOSTILE_BARS },
  { id: 'math.pow', namespace: 'math', pine: pine('math.pow(math.abs(close), 2.5)'), expected: mathPowAbs, bars: HOSTILE_BARS },
  { id: 'math.avg', namespace: 'math', pine: pine('math.avg(open, high, low)'), rule: 'TradingView v6 Reference: math.avg() returns the average of its numeric arguments. https://www.tradingview.com/pine-script-reference/v6/#fun_math.avg', expected: mathAvgOhl, bars: HOSTILE_BARS },
  { id: 'math.round', namespace: 'math', pine: pine('math.round(close / 3, 2)'), rule: 'TradingView v6 Reference: math.round(number, precision) rounds to the requested decimal precision. https://www.tradingview.com/pine-script-reference/v6/#fun_math.round', expected: mathRound2, bars: HOSTILE_BARS },
  {
    id: 'depth.math-variadic-round-values',
    namespace: 'math',
    pine: `//@version=6
indicator("math variadic round depth")
plot(math.max(open, close, high))
plot(math.min(open, close, low))
plot(math.round(close / 3))`,
    officialMembers: ['math.max', 'math.min', 'math.round'],
    outputMembers: [['math.max'], ['math.min'], ['math.round']],
    rule: 'TradingView v6 Reference: math.max()/math.min() return the maximum/minimum of all supplied arguments, and math.round(number) rounds to the nearest integer when precision is omitted. https://www.tradingview.com/pine-script-reference/v6/#fun_math.max https://www.tradingview.com/pine-script-reference/v6/#fun_math.min https://www.tradingview.com/pine-script-reference/v6/#fun_math.round',
    expected: (bars) => bars.map((bar) => Math.max(bar.open, bar.close, bar.high)),
    expectedOutputs: (bars) => [
      bars.map((bar) => Math.max(bar.open, bar.close, bar.high)),
      bars.map((bar) => Math.min(bar.open, bar.close, bar.low)),
      bars.map((bar) => Math.round(bar.close / 3)),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'depth.math-composed-workhorse-values',
    namespace: 'math',
    pine: `//@version=6
indicator("math composed workhorse depth")
plot(math.abs(open - close))
plot(math.avg(open, high, low, close))
plot(math.pow(math.sqrt(math.abs(close) + 1), 2))
plot(math.log(math.max(math.abs(close), 0) + 1))
plot(math.floor(math.sum(close, 3) / 2))`,
    officialMembers: ['math.abs', 'math.avg', 'math.pow', 'math.sqrt', 'math.max', 'math.log', 'math.floor', 'math.sum'],
    outputMembers: [
      ['math.abs'],
      ['math.avg'],
      ['math.pow', 'math.sqrt', 'math.abs'],
      ['math.log', 'math.max', 'math.abs'],
      ['math.floor', 'math.sum'],
    ],
    rule: 'TradingView v6 Reference: math.abs returns absolute value, math.avg returns the average of its arguments, math.sqrt/math.pow are inverse over nonnegative inputs, math.log is the natural log, math.floor rounds down, and math.sum returns a moving sum over length. https://www.tradingview.com/pine-script-reference/v6/#fun_math.abs https://www.tradingview.com/pine-script-reference/v6/#fun_math.avg https://www.tradingview.com/pine-script-reference/v6/#fun_math.pow https://www.tradingview.com/pine-script-reference/v6/#fun_math.sqrt https://www.tradingview.com/pine-script-reference/v6/#fun_math.log https://www.tradingview.com/pine-script-reference/v6/#fun_math.floor https://www.tradingview.com/pine-script-reference/v6/#fun_math.sum',
    expected: (bars) => bars.map((bar) => Math.abs(bar.open - bar.close)),
    expectedOutputs: (bars) => [
      bars.map((bar) => Math.abs(bar.open - bar.close)),
      bars.map((bar) => (bar.open + bar.high + bar.low + bar.close) / 4),
      bars.map((bar) => Math.abs(bar.close) + 1),
      bars.map((bar) => Math.log(Math.max(Math.abs(bar.close), 0) + 1)),
      rollingSum(bars, 3).map((value) => typeof value === 'number' ? Math.floor(value / 2) : null),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'priority.math-workhorse-expression-values',
    namespace: 'math',
    pine: `//@version=6
indicator("priority math workhorse expression values")
previous = nz(close[1], close)
plot(math.max(open - close, high - low, previous - close, close - previous))
plot(math.min(open - close, high - low, previous - close, close - previous))
plot(math.round(number=(close + open) / 3, precision=1))`,
    officialMembers: ['math.max', 'math.min', 'math.round', 'nz'],
    outputMembers: [['math.max'], ['math.min'], ['math.round']],
    rule: 'TradingView v6 Reference: math.max()/math.min() return extrema across all supplied numeric arguments, math.round(number, precision) rounds to the requested decimal places, and nz(source, replacement) substitutes the replacement for na. https://www.tradingview.com/pine-script-reference/v6/#fun_math.max https://www.tradingview.com/pine-script-reference/v6/#fun_math.min https://www.tradingview.com/pine-script-reference/v6/#fun_math.round',
    expected: (bars) => bars.map((bar, index) => {
      const previous = index === 0 ? bar.close : bars[index - 1]!.close;
      return Math.max(bar.open - bar.close, bar.high - bar.low, previous - bar.close, bar.close - previous);
    }),
    expectedOutputs: (bars) => [
      bars.map((bar, index) => {
        const previous = index === 0 ? bar.close : bars[index - 1]!.close;
        return Math.max(bar.open - bar.close, bar.high - bar.low, previous - bar.close, bar.close - previous);
      }),
      bars.map((bar, index) => {
        const previous = index === 0 ? bar.close : bars[index - 1]!.close;
        return Math.min(bar.open - bar.close, bar.high - bar.low, previous - bar.close, bar.close - previous);
      }),
      bars.map((bar) => Math.round(((bar.close + bar.open) / 3) * 10) / 10),
    ],
    bars: HOSTILE_BARS,
  },
  { id: 'math.trunc', namespace: 'math', pine: pine('math.trunc(close / 2)'), rule: 'TradingView v6 Reference: math.trunc() truncates the fractional part of a number. https://www.tradingview.com/pine-script-reference/v6/#fun_math.trunc', expected: mathTruncHalf, bars: HOSTILE_BARS },
  { id: 'math.floor', namespace: 'math', pine: pine('math.floor(close / 2)'), rule: 'TradingView v6 Reference: math.floor() returns the greatest integer less than or equal to the argument. https://www.tradingview.com/pine-script-reference/v6/#fun_math.floor', expected: mathFloorHalf, bars: HOSTILE_BARS },
  { id: 'math.ceil', namespace: 'math', pine: pine('math.ceil(close / 2)'), rule: 'TradingView v6 Reference: math.ceil() returns the smallest integer greater than or equal to the argument. https://www.tradingview.com/pine-script-reference/v6/#fun_math.ceil', expected: mathCeilHalf, bars: HOSTILE_BARS },
  { id: 'math.log', namespace: 'math', pine: pine('math.log(math.abs(close) + 1)'), rule: 'TradingView v6 Reference: math.log() returns the natural logarithm. https://www.tradingview.com/pine-script-reference/v6/#fun_math.log', expected: mathLogAbsPlusOne, bars: HOSTILE_BARS },
  { id: 'math.log10', namespace: 'math', pine: pine('math.log10(math.abs(close) + 1)'), rule: 'TradingView v6 Reference: math.log10() returns the base-10 logarithm. https://www.tradingview.com/pine-script-reference/v6/#fun_math.log10', expected: mathLog10AbsPlusOne, bars: HOSTILE_BARS },
  { id: 'math.exp', namespace: 'math', pine: pine('math.exp(close / 10)'), rule: 'TradingView v6 Reference: math.exp() returns e raised to the argument. https://www.tradingview.com/pine-script-reference/v6/#fun_math.exp', expected: mathExpScaled, bars: HOSTILE_BARS },
  { id: 'math.sin', namespace: 'math', pine: pine('math.sin(close / 10)'), rule: 'TradingView v6 Reference: math.sin() returns the sine of the argument in radians. https://www.tradingview.com/pine-script-reference/v6/#fun_math.sin', expected: mathSinScaled, bars: HOSTILE_BARS },
  { id: 'math.cos', namespace: 'math', pine: pine('math.cos(close / 10)'), rule: 'TradingView v6 Reference: math.cos() returns the cosine of the argument in radians. https://www.tradingview.com/pine-script-reference/v6/#fun_math.cos', expected: mathCosScaled, bars: HOSTILE_BARS },
  { id: 'math.tan', namespace: 'math', pine: pine('math.tan(close / 10)'), rule: 'TradingView v6 Reference: math.tan() returns the tangent of the argument in radians. https://www.tradingview.com/pine-script-reference/v6/#fun_math.tan', expected: mathTanScaled, bars: HOSTILE_BARS },
  { id: 'math.asin', namespace: 'math', pine: pine('math.asin(math.max(-1, math.min(1, close / 10)))'), rule: 'TradingView v6 Reference: math.asin() returns the arcsine in radians. https://www.tradingview.com/pine-script-reference/v6/#fun_math.asin', expected: mathAsinScaled, bars: HOSTILE_BARS },
  { id: 'math.acos', namespace: 'math', pine: pine('math.acos(math.max(-1, math.min(1, close / 10)))'), rule: 'TradingView v6 Reference: math.acos() returns the arccosine in radians. https://www.tradingview.com/pine-script-reference/v6/#fun_math.acos', expected: mathAcosScaled, bars: HOSTILE_BARS },
  { id: 'math.atan', namespace: 'math', pine: pine('math.atan(close / 10)'), rule: 'TradingView v6 Reference: math.atan() returns the arctangent in radians. https://www.tradingview.com/pine-script-reference/v6/#fun_math.atan', expected: mathAtanScaled, bars: HOSTILE_BARS },
  { id: 'math.toradians', namespace: 'math', pine: pine('math.toradians(close)'), rule: 'TradingView v6 Reference: math.toradians() converts degrees to radians. https://www.tradingview.com/pine-script-reference/v6/#fun_math.toradians', expected: mathToRadians, bars: HOSTILE_BARS },
  { id: 'math.todegrees', namespace: 'math', pine: pine('math.todegrees(close)'), rule: 'TradingView v6 Reference: math.todegrees() converts radians to degrees. https://www.tradingview.com/pine-script-reference/v6/#fun_math.todegrees', expected: mathToDegrees, bars: HOSTILE_BARS },
  { id: 'math.sum', namespace: 'math', pine: pine('math.sum(close, 3)'), rule: 'TradingView v6 Reference: math.sum(source, length) returns the moving sum over the requested length. https://www.tradingview.com/pine-script-reference/v6/#fun_math.sum', expected: (bars) => rollingSum(bars, 3), bars: HOSTILE_BARS },
  { id: 'math.clamp', namespace: 'math', pine: pine('math.clamp(close, -1, 1)'), rule: 'TealScript local extension: math.clamp(val, min, max) clamps numeric values to the inclusive bounds.', expected: mathClampSigned, bars: HOSTILE_BARS },
  { id: 'math.pi', namespace: 'math', pine: pine('math.pi'), rule: 'TradingView v6 Reference: math.pi is the mathematical constant pi. https://www.tradingview.com/pine-script-reference/v6/#var_math.pi', expected: (bars) => constantVector(bars, Math.PI), bars: HOSTILE_BARS },
  { id: 'math.e', namespace: 'math', pine: pine('math.e'), rule: 'TradingView v6 Reference: math.e is Euler\'s number. https://www.tradingview.com/pine-script-reference/v6/#var_math.e', expected: (bars) => constantVector(bars, Math.E), bars: HOSTILE_BARS },
  { id: 'math.phi', namespace: 'math', pine: pine('math.phi'), rule: 'TradingView v6 Reference: math.phi is the golden ratio constant. https://www.tradingview.com/pine-script-reference/v6/#var_math.phi', expected: (bars) => constantVector(bars, (1 + Math.sqrt(5)) / 2), bars: HOSTILE_BARS },
  { id: 'str.length', namespace: 'str', pine: pine('str.length("abc")'), expected: (bars) => constantVector(bars, 3), bars: HOSTILE_BARS },
  { id: 'str.pos', namespace: 'str', pine: pine('str.pos("abc", "b")'), expected: (bars) => constantVector(bars, 1), bars: HOSTILE_BARS },
  { id: 'str.tonumber', namespace: 'str', pine: pine('str.tonumber("-12.5")'), expected: (bars) => constantVector(bars, -12.5), bars: HOSTILE_BARS },
  { id: 'str.contains', namespace: 'str', pine: pine('str.contains("abc", "b") ? 1 : 0'), expected: (bars) => constantVector(bars, 1), bars: HOSTILE_BARS },
  { id: 'str.startswith', namespace: 'str', pine: pine('str.startswith("abc", "a") ? 1 : 0'), expected: (bars) => constantVector(bars, 1), bars: HOSTILE_BARS },
  { id: 'str.endswith', namespace: 'str', pine: pine('str.endswith("BTCUSDT", "USDT") ? 1 : 0'), rule: 'TradingView v6 Reference: str.endswith() returns true when the source string ends with the target string. https://www.tradingview.com/pine-script-reference/v6/#fun_str.endswith', expected: (bars) => constantVector(bars, 1), bars: HOSTILE_BARS },
  { id: 'str.format', namespace: 'str', pine: pine('str.format("{0,number,#.#}", 1.34) == "1.3" ? 1 : 0'), rule: 'TradingView v6 Reference: str.format() formats placeholders with optional number modifiers. https://www.tradingview.com/pine-script-reference/v6/#fun_str.format', expected: (bars) => constantVector(bars, 1), bars: HOSTILE_BARS },
  {
    id: 'str.format_time',
    namespace: 'str',
    pine: `//@version=6
indicator("format time vector")
stamp = timestamp("UTC", 2024, 1, 5, 7, 30, 15)
plot(str.format_time(stamp, "yyyy-MM-dd HH:mm:ss", "UTC") == "2024-01-05 07:30:15" ? 1 : 0)`,
    rule: 'TradingView v6 Reference: str.format_time() formats a UNIX timestamp using the supplied date-time pattern and timezone. https://www.tradingview.com/pine-script-reference/v6/#fun_str.format_time',
    expected: (bars) => constantVector(bars, 1),
    bars: HOSTILE_BARS,
  },
  { id: 'str.lower', namespace: 'str', pine: pine('str.lower("BTCUSDT") == "btcusdt" ? 1 : 0'), rule: 'TradingView v6 Reference: str.lower() returns the source string in lowercase. https://www.tradingview.com/pine-script-reference/v6/#fun_str.lower', expected: (bars) => constantVector(bars, 1), bars: HOSTILE_BARS },
  { id: 'str.match', namespace: 'str', pine: pine('str.match("Trade NASDAQ:AAPL now", "[A-Z]+:[A-Z]+") == "NASDAQ:AAPL" ? 1 : 0'), rule: 'TradingView v6 Reference: str.match() returns the substring matching a regular expression. https://www.tradingview.com/pine-script-reference/v6/#fun_str.match', expected: (bars) => constantVector(bars, 1), bars: HOSTILE_BARS },
  { id: 'str.repeat', namespace: 'str', pine: pine('str.repeat("?", 3, ",") == "?,?,?" ? 1 : 0'), rule: 'TradingView v6 Reference: str.repeat() repeats a source string with an optional separator. https://www.tradingview.com/pine-script-reference/v6/#fun_str.repeat', expected: (bars) => constantVector(bars, 1), bars: HOSTILE_BARS },
  { id: 'str.replace', namespace: 'str', pine: pine('str.replace("btc-usdt-usdt", "usdt", "perp", 1) == "btc-usdt-perp" ? 1 : 0'), rule: 'TradingView v6 Reference: str.replace() replaces one occurrence of a substring. https://www.tradingview.com/pine-script-reference/v6/#fun_str.replace', expected: (bars) => constantVector(bars, 1), bars: HOSTILE_BARS },
  { id: 'str.replace_all', namespace: 'str', pine: pine('str.replace_all("btc-usdt-usdt", "usdt", "perp") == "btc-perp-perp" ? 1 : 0'), rule: 'TradingView v6 Reference: str.replace_all() replaces every occurrence of a substring. https://www.tradingview.com/pine-script-reference/v6/#fun_str.replace_all', expected: (bars) => constantVector(bars, 1), bars: HOSTILE_BARS },
  { id: 'str.split', namespace: 'str', pine: pine('array.size(str.split("BTC-USDT", "-"))'), officialMembers: ['str.split'], outputMembers: [['str.split']], rule: 'TradingView v6 Reference: str.split() returns an array of substrings split by the separator. https://www.tradingview.com/pine-script-reference/v6/#fun_str.split', expected: (bars) => constantVector(bars, 2), bars: HOSTILE_BARS },
  { id: 'str.substring', namespace: 'str', pine: pine('str.substring("BTCUSDT", 0, 3) == "BTC" ? 1 : 0'), rule: 'TradingView v6 Reference: str.substring() returns the characters from begin_pos up to end_pos. https://www.tradingview.com/pine-script-reference/v6/#fun_str.substring', expected: (bars) => constantVector(bars, 1), bars: HOSTILE_BARS },
  { id: 'str.tostring', namespace: 'str', pine: pine('str.tostring(1.25) == "1.25" ? 1 : 0'), rule: 'TradingView v6 Reference: str.tostring() converts a value to its string representation. https://www.tradingview.com/pine-script-reference/v6/#fun_str.tostring', expected: (bars) => constantVector(bars, 1), bars: HOSTILE_BARS },
  { id: 'str.tostring.format', namespace: 'str', pine: pine('str.tostring(1.25, "#.00") == "1.25" ? 1 : 0'), rule: 'TradingView v6 Reference: str.tostring(value, format) converts a value using the supplied format pattern. https://www.tradingview.com/pine-script-reference/v6/#fun_str.tostring', expected: (bars) => constantVector(bars, 1), bars: HOSTILE_BARS },
  { id: 'str.trim', namespace: 'str', pine: pine('str.trim("  BTC  ") == "BTC" ? 1 : 0'), rule: 'TradingView v6 Reference: str.trim() removes leading and trailing whitespace. https://www.tradingview.com/pine-script-reference/v6/#fun_str.trim', expected: (bars) => constantVector(bars, 1), bars: HOSTILE_BARS },
  { id: 'str.upper', namespace: 'str', pine: pine('str.upper("btcusdt") == "BTCUSDT" ? 1 : 0'), rule: 'TradingView v6 Reference: str.upper() returns the source string in uppercase. https://www.tradingview.com/pine-script-reference/v6/#fun_str.upper', expected: (bars) => constantVector(bars, 1), bars: HOSTILE_BARS },
  {
    id: 'array.persistent-size',
    namespace: 'array',
    pine: `//@version=6
indicator("Array size vector")
var array<float> values = array.new_float()
array.push(values, close)
plot(array.size(values))`,
    expected: arraySize,
    bars: HOSTILE_BARS,
  },
  {
    id: 'array.persistent-get',
    namespace: 'array',
    pine: `//@version=6
indicator("Array get vector")
var array<float> values = array.new_float()
array.push(values, close)
plot(array.get(values, 0))`,
    expected: arrayCurrentClose,
    bars: HOSTILE_BARS,
  },
  {
    id: 'array.mutation-accessors',
    namespace: 'array',
    pine: `//@version=6
indicator("array mutation accessors")
values = array.new_int(2, 1)
mixed = array.new_float(2, 2.5)
fromValues = array.from(1, 2, 3)
array.push(values, 3)
array.unshift(values, 0)
array.set(values, 1, 5)
removed = array.remove(values, 2)
array.insert(values, 2, 9)
first = array.first(values)
last = array.last(values)
value = array.get(values, 1)
copied = array.copy(values)
popped = array.pop(copied)
shifted = array.shift(copied)
size = array.size(copied)
array.clear(copied)
plot(first + last + value + removed + popped + shifted + size + array.size(fromValues) + array.size(mixed))`,
    rule: 'TradingView v6 Arrays: array mutation functions update the array in place, accessors return the current element, copy() creates a distinct array, and size() reports the current element count. https://www.tradingview.com/pine-script-docs/language/arrays/',
    expected: (bars) => constantVector(bars, 19),
    outputMembers: [
      ['array.push', 'array.unshift', 'array.set', 'array.remove', 'array.insert', 'array.copy', 'array.pop', 'array.shift', 'array.clear'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'array.receiver-result-chain-values',
    namespace: 'array',
    pine: `//@version=5
indicator("array receiver result chain values")
values = array.from(-2.0, 0.0, 3.0)
absolute = values.abs()
copied = array.copy(values)
plot(absolute.get(0))
plot(absolute.get(2))
plot(copied.get(0))
plot(copied.size())`,
    rule: 'TradingView v5 Arrays: array.abs() returns an array with absolute values of numeric elements, array.copy() creates a copy of the array, and array receiver methods are equivalent to namespace calls. https://www.tradingview.com/pine-script-docs/v5/language/arrays/ https://www.tradingview.com/pine-script-reference/v5/',
    expected: (bars) => constantVector(bars, 2),
    expectedOutputs: (bars) => [
      constantVector(bars, 2),
      constantVector(bars, 3),
      constantVector(bars, -2),
      constantVector(bars, 3),
    ],
    outputMembers: [
      ['array.abs'],
      ['array.abs'],
      ['array.copy'],
      ['array.copy'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'array.statistics',
    namespace: 'array',
    pine: `//@version=6
indicator("array statistics")
values = array.from(1.0, 2.0, 2.0, 5.0)
plot(array.sum(values))
plot(array.avg(values))
plot(array.min(values))
plot(array.max(values))
plot(array.range(values))
plot(array.median(values))
plot(array.mode(values))`,
    rule: 'TradingView v6 Arrays: array statistical functions operate over the array contents and return aggregate values such as sum, average, extrema, range, median, and mode. https://www.tradingview.com/pine-script-docs/language/arrays/',
    expected: (bars) => constantVector(bars, 10),
    expectedOutputs: (bars) => [
      constantVector(bars, 10),
      constantVector(bars, 2.5),
      constantVector(bars, 1),
      constantVector(bars, 5),
      constantVector(bars, 4),
      constantVector(bars, 2),
      constantVector(bars, 2),
    ],
    outputMembers: [
      ['array.sum'],
      ['array.avg'],
      ['array.min'],
      ['array.max'],
      ['array.range'],
      ['array.median'],
      ['array.mode'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'array.nth-extrema-values',
    namespace: 'array',
    pine: `//@version=6
indicator("array nth extrema values")
values = array.from(1.0, 7.0, 3.0, 7.0, 5.0)
plot(array.min(values, 2))
plot(array.max(values, 1))`,
    rule: 'TradingView v6 Reference: array.min(id, nth) and array.max(id, nth) select the nth ordered element from numeric array contents. https://www.tradingview.com/pine-script-reference/v6/#fun_array.min https://www.tradingview.com/pine-script-reference/v6/#fun_array.max',
    expected: (bars) => constantVector(bars, 5),
    expectedOutputs: (bars) => [
      constantVector(bars, 5),
      constantVector(bars, 7),
    ],
    outputMembers: [
      ['array.min'],
      ['array.max'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'array.search-sort-values',
    namespace: 'array',
    pine: `//@version=6
indicator("array search sort values")
values = array.from(3.0, 1.0, 3.0, 2.0)
hasThree = array.includes(values, 3.0)
firstThree = array.indexof(values, 3.0)
lastThree = array.lastindexof(values, 3.0)
indices = array.sort_indices(values, order.ascending)
array.sort(values, order.ascending)
array.reverse(values)
plot(hasThree ? 1 : 0)
plot(firstThree)
plot(lastThree)
plot(array.get(indices, 0))
plot(array.get(indices, 1))
plot(array.get(values, 0))
plot(array.get(values, 3))`,
    rule: 'TradingView v6 Arrays: includes/indexof/lastindexof search array contents; sort_indices() returns indexes that would sort the array; sort() and reverse() mutate the array in place. https://www.tradingview.com/pine-script-docs/language/arrays/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => [
      constantVector(bars, 1),
      constantVector(bars, 0),
      constantVector(bars, 2),
      constantVector(bars, 1),
      constantVector(bars, 3),
      constantVector(bars, 3),
      constantVector(bars, 1),
    ],
    outputMembers: [
      ['array.includes'],
      ['array.indexof'],
      ['array.lastindexof'],
      ['array.sort_indices'],
      ['array.sort_indices'],
      ['array.sort', 'array.reverse'],
      ['array.sort', 'array.reverse'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'array.slice-reverse-join-values',
    namespace: 'array',
    pine: `//@version=6
indicator("array slice reverse join values")
values = array.from(1, 2, 3, 4)
window = array.slice(values, 1, 3)
joined = array.join(window, "-")
array.reverse(window)
plot(joined == "2-3" ? 1 : 0)
plot(array.size(window))
plot(array.get(window, 0))
plot(array.get(window, 1))`,
    rule: 'TradingView v6 Arrays: slice() copies the half-open index range, join() stringifies array contents with a separator, and reverse() mutates the array in place. https://www.tradingview.com/pine-script-docs/language/arrays/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => [
      constantVector(bars, 1),
      constantVector(bars, 2),
      constantVector(bars, 3),
      constantVector(bars, 2),
    ],
    outputMembers: [
      ['array.join'],
      ['array.size'],
      ['array.slice', 'array.reverse'],
      ['array.slice', 'array.reverse'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'array.advanced-search-fill-values',
    namespace: 'array',
    pine: `//@version=6
indicator("array advanced search fill values")
values = array.from(1.0, 2.0, 2.0, 4.0)
left = array.from(5.0, 6.0)
right = array.from(7.0, 8.0)
filled = array.new_float(4, 0.0)
array.fill(filled, 9.0, 1, 3)
joined = array.concat(left, right)
plot(array.binary_search(values, 2.0))
plot(array.binary_search_leftmost(values, 2.0))
plot(array.binary_search_rightmost(values, 2.0))
plot(array.get(filled, 0))
plot(array.get(filled, 1))
plot(array.get(filled, 2))
plot(array.get(filled, 3))
plot(array.size(joined))
plot(array.get(joined, 3))`,
    rule: 'TradingView v6 Arrays: binary_search variants return matching indexes in sorted arrays, fill() assigns the half-open index range, and concat() appends the second array to the first. https://www.tradingview.com/pine-script-docs/language/arrays/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => [
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 2),
      constantVector(bars, 0),
      constantVector(bars, 9),
      constantVector(bars, 9),
      constantVector(bars, 0),
      constantVector(bars, 4),
      constantVector(bars, 8),
    ],
    outputMembers: [
      ['array.binary_search'],
      ['array.binary_search_leftmost'],
      ['array.binary_search_rightmost'],
      ['array.fill'],
      ['array.fill'],
      ['array.fill'],
      ['array.fill'],
      ['array.concat'],
      ['array.concat'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'array.bool-and-constructor-values',
    namespace: 'array',
    pine: `//@version=6
indicator("array bool constructor values")
bools = array.new_bool(3, true)
array.set(bools, 1, false)
strings = array.new_string(2, "x")
colors = array.new_color(2, color.red)
lines = array.new_line(1)
labels = array.new_label(1)
boxes = array.new_box(1)
tables = array.new_table(1)
linefills = array.new_linefill(1)
plot(array.some(bools) ? 1 : 0)
plot(array.every(bools) ? 1 : 0)
plot(array.size(strings))
plot(array.size(colors))
plot(array.size(lines) + array.size(labels) + array.size(boxes) + array.size(tables) + array.size(linefills))`,
    rule: 'TradingView v6 Arrays: typed array constructors create arrays of the requested length, and some()/every() reduce boolean arrays using existential and universal tests. https://www.tradingview.com/pine-script-docs/language/arrays/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => [
      constantVector(bars, 1),
      constantVector(bars, 0),
      constantVector(bars, 2),
      constantVector(bars, 2),
      constantVector(bars, 5),
    ],
    outputMembers: [
      ['array.some'],
      ['array.every'],
      ['array.new_string'],
      ['array.new_color'],
      ['array.new_line', 'array.new_label', 'array.new_box', 'array.new_table', 'array.new_linefill'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'depth.array-receiver-mutation-values',
    namespace: 'array',
    pine: `//@version=6
indicator("array receiver mutation depth")
values = array.new<float>()
values.push(close)
values.push(open)
values.set(1, high)
plot(values.size())
plot(values.get(0))
plot(values.get(1))`,
    officialMembers: ['array.new', 'array.push', 'array.set', 'array.size', 'array.get'],
    outputMembers: [['array.size'], ['array.get'], ['array.get']],
    rule: 'TradingView v6 Arrays: receiver-method forms such as values.push(), values.set(), values.size(), and values.get() are equivalent to namespace calls on the receiver array. https://www.tradingview.com/pine-script-docs/language/arrays/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 2),
    expectedOutputs: (bars) => [
      constantVector(bars, 2),
      bars.map((bar) => bar.close),
      bars.map((bar) => bar.high),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'depth.array-receiver-destructive-values',
    namespace: 'array',
    pine: `//@version=6
indicator("array receiver destructive depth")
values = array.from(1.0, 2.0, 3.0)
values.unshift(0.0)
popped = values.pop()
shifted = values.shift()
values.push(4.0)
removed = values.remove(1)
values.clear()
plot(popped)
plot(shifted)
plot(removed)
plot(values.size())`,
    officialMembers: ['array.from', 'array.unshift', 'array.pop', 'array.shift', 'array.push', 'array.remove', 'array.clear', 'array.size'],
    outputMembers: [['array.pop'], ['array.shift'], ['array.remove'], ['array.clear', 'array.size']],
    rule: 'TradingView v6 Arrays: receiver-method destructive operations mutate array order and size in place; pop removes the last element, shift removes the first, remove deletes the indexed element, and clear empties the array. https://www.tradingview.com/pine-script-docs/language/arrays/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 3),
    expectedOutputs: (bars) => [
      constantVector(bars, 3),
      constantVector(bars, 0),
      constantVector(bars, 2),
      constantVector(bars, 0),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'priority.array-new-get-history-values',
    namespace: 'array',
    pine: `//@version=6
indicator("priority array new get history values")
fromSize = array.new<float>(3, close)
fromLiteral = array.from(open, high, low, close)
picked = array.get(fromSize, 1)
literalPicked = array.get(fromLiteral, 2)
array.push(fromSize, open)
plot(picked)
plot(picked[1])
plot(literalPicked)
plot(array.size(fromSize))
plot(array.get(fromSize, 3))`,
    officialMembers: ['array.new', 'array.from', 'array.get', 'array.push', 'array.size'],
    outputMembers: [
      ['array.new', 'array.get'],
      ['array.get'],
      ['array.from', 'array.get'],
      ['array.push', 'array.size'],
      ['array.push', 'array.get'],
    ],
    rule: 'TradingView v6 Arrays and Operators: array.new<T>(size, initial_value) creates a filled array, array.from creates an array literal from its arguments, array.get reads by zero-based index, array.push appends, array.size returns length, and history references read the previous bar value of a series expression. https://www.tradingview.com/pine-script-docs/language/arrays/ https://www.tradingview.com/pine-script-docs/language/operators/',
    expected: (bars) => bars.map((bar) => bar.close),
    expectedOutputs: (bars) => [
      bars.map((bar) => bar.close),
      bars.map((bar, index) => index === 0 ? null : bars[index - 1]!.close),
      bars.map((bar) => bar.low),
      constantVector(bars, 4),
      bars.map((bar) => bar.open),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'priority.array-new-dynamic-size-values',
    namespace: 'array',
    pine: `//@version=6
indicator("priority array new dynamic size values")
dynamicSize = bar_index % 3 + 1
values = array.new<float>(dynamicSize, close)
plot(array.size(values))
plot(array.get(values, dynamicSize - 1))`,
    officialMembers: ['array.new', 'array.size', 'array.get'],
    outputMembers: [
      ['array.new', 'array.size'],
      ['array.new', 'array.get'],
    ],
    rule: 'TradingView v6 Arrays: array.new<T>(size, initial_value) creates an array with the evaluated size and fills every element with the evaluated initial value; array.get reads by zero-based index. https://www.tradingview.com/pine-script-docs/language/arrays/ https://www.tradingview.com/pine-script-reference/v6/#fun_array.new',
    expected: (bars) => bars.map((_bar, index) => index % 3 + 1),
    expectedOutputs: (bars) => [
      bars.map((_bar, index) => index % 3 + 1),
      bars.map((bar) => bar.close),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'priority.array-get-variable-index-values',
    namespace: 'array',
    pine: `//@version=6
indicator("priority array get variable index values")
values = array.from(open, high, low, close)
index = bar_index % array.size(values)
plot(array.get(values, index))`,
    officialMembers: ['array.from', 'array.get', 'array.size'],
    outputMembers: [['array.get']],
    rule: 'TradingView v6 Arrays: array.from() creates an array from the evaluated arguments, array.size() returns its element count, and array.get(id, index) reads the element at the evaluated zero-based index. https://www.tradingview.com/pine-script-docs/language/arrays/ https://www.tradingview.com/pine-script-reference/v6/#fun_array.get',
    expected: (bars) => bars.map((bar, index) => {
      const values = [bar.open, bar.high, bar.low, bar.close];
      return values[index % values.length]!;
    }),
    bars: HOSTILE_BARS,
  },
  {
    id: 'priority.array-push-loop-values',
    namespace: 'array',
    pine: `//@version=6
indicator("priority array push loop values")
values = array.new<float>()
for i = 0 to 2
    array.push(values, close + i)
plot(array.size(values))
plot(array.get(values, 2))`,
    officialMembers: ['array.new', 'array.push', 'array.size', 'array.get'],
    outputMembers: [
      ['array.push', 'array.size'],
      ['array.push', 'array.get'],
    ],
    rule: 'TradingView v6 Arrays and loops: array.push() appends each loop-produced value in order, array.size() returns the appended count, and array.get() reads the appended element at the requested index. https://www.tradingview.com/pine-script-docs/language/arrays/ https://www.tradingview.com/pine-script-docs/language/loops/',
    expected: (bars) => constantVector(bars, 3),
    expectedOutputs: (bars) => [
      constantVector(bars, 3),
      bars.map((bar) => bar.close + 2),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'priority.array-set-variable-index-values',
    namespace: 'array',
    pine: `//@version=6
indicator("priority array set variable index values")
values = array.new<float>(4, 0.0)
index = bar_index % array.size(values)
array.set(values, index, close)
plot(array.get(values, index))
plot(array.get(values, 0))`,
    officialMembers: ['array.new', 'array.size', 'array.set', 'array.get'],
    outputMembers: [
      ['array.set', 'array.get'],
      ['array.set', 'array.get'],
    ],
    rule: 'TradingView v6 Arrays: array.set(id, index, value) replaces the element at the evaluated zero-based index, and later array.get() calls read the mutated array contents. https://www.tradingview.com/pine-script-docs/language/arrays/ https://www.tradingview.com/pine-script-reference/v6/#fun_array.set',
    expected: (bars) => bars.map((bar) => bar.close),
    expectedOutputs: (bars) => [
      bars.map((bar) => bar.close),
      bars.map((bar, index) => index % 4 === 0 ? bar.close : 0),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'priority.array-destructive-accessor-values',
    namespace: 'array',
    pine: `//@version=6
indicator("priority array destructive accessor values")
values = array.from(open, high, low, close)
shifted = array.shift(values)
popped = array.pop(values)
plot(shifted)
plot(popped)
plot(array.size(values))
plot(array.get(values, 0))
plot(array.get(values, 1))`,
    officialMembers: ['array.from', 'array.shift', 'array.pop', 'array.size', 'array.get'],
    outputMembers: [
      ['array.shift'],
      ['array.pop'],
      ['array.shift', 'array.pop', 'array.size'],
      ['array.shift', 'array.pop', 'array.get'],
      ['array.shift', 'array.pop', 'array.get'],
    ],
    rule: 'TradingView v6 Arrays: array.shift() removes and returns the first element, array.pop() removes and returns the last element, and the remaining array preserves the middle elements in order. https://www.tradingview.com/pine-script-docs/language/arrays/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => bars.map((bar) => bar.open),
    expectedOutputs: (bars) => [
      bars.map((bar) => bar.open),
      bars.map((bar) => bar.close),
      constantVector(bars, 2),
      bars.map((bar) => bar.high),
      bars.map((bar) => bar.low),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'priority.array-new-line-handle-values',
    namespace: 'array',
    pine: `//@version=6
indicator("priority array new line handle values", overlay=true)
base = line.new(bar_index, close, bar_index + 1, close + 1)
lines = array.new_line(2, base)
first = array.get(lines, 0)
plot(array.size(lines))
plot(line.get_x1(first))
plot(line.get_y2(first))
plot(line.get_y2(first)[1])`,
    officialMembers: ['array.new_line', 'array.get', 'array.size', 'line.new', 'line.get_x1', 'line.get_y2'],
    outputMembers: [
      ['array.new_line', 'array.size'],
      ['array.new_line', 'array.get', 'line.get_x1'],
      ['array.new_line', 'array.get', 'line.get_y2'],
      ['line.get_y2'],
    ],
    rule: 'TradingView v6 Arrays and Lines: array.new_line(size, initial_value) creates a line-id array initialized with that handle; array.get retrieves the handle, array.size returns length, line.get_x1()/line.get_y2() read stored coordinates, and history references read the prior bar series value. https://www.tradingview.com/pine-script-docs/language/arrays/ https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/ https://www.tradingview.com/pine-script-docs/language/operators/',
    expected: (bars) => constantVector(bars, 2),
    expectedOutputs: (bars) => [
      constantVector(bars, 2),
      bars.map((_bar, index) => index),
      bars.map((bar) => bar.close + 1),
      bars.map((_bar, index) => index === 0 ? null : bars[index - 1]!.close + 1),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'priority.array-drawing-handle-initial-values',
    namespace: 'array',
    pine: `//@version=6
indicator("priority array drawing handle initial values", overlay=true)
tag = label.new(bar_index, close, text="tag")
labels = array.new_label(1, tag)
upper = line.new(bar_index, high, bar_index + 1, high + 1)
lower = line.new(bar_index, low, bar_index + 1, low - 1)
band = linefill.new(upper, lower)
bands = array.new_linefill(1, band)
dashboard = table.new(position.top_right, 1, 1)
tables = array.new_table(1, dashboard)
plot(label.get_text(array.get(labels, 0)) == "tag" ? 1 : 0)
plot(linefill.get_line1(array.get(bands, 0)) == upper ? 1 : 0)
plot(array.size(tables))`,
    officialMembers: ['array.new_label', 'array.new_linefill', 'array.new_table', 'array.get', 'array.size', 'label.new', 'label.get_text', 'line.new', 'linefill.new', 'linefill.get_line1', 'table.new'],
    outputMembers: [
      ['array.new_label', 'array.get', 'label.get_text'],
      ['array.new_linefill', 'array.get', 'linefill.get_line1'],
      ['array.new_table', 'array.size'],
    ],
    rule: 'TradingView v6 Arrays and drawing objects: typed drawing-handle array constructors accept size and initial_value, array.get returns the stored handle, label/linefill getters expose the referenced object fields, and table handles are opaque without value getters so only array length is locally observable. https://www.tradingview.com/pine-script-docs/language/arrays/ https://www.tradingview.com/pine-script-docs/visuals/text-and-shapes/ https://www.tradingview.com/pine-script-docs/visuals/fills/ https://www.tradingview.com/pine-script-docs/visuals/tables/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => [
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'priority.array-udt-sort-field-values',
    namespace: 'array',
    pine: `//@version=6
type Ranked
    float score
indicator("priority array udt sort field values")
items = array.from(Ranked.new(2.0), Ranked.new(1.0), Ranked.new(3.0))
indices = array.sort_indices(items, order.ascending, "score")
array.sort(items, order.descending, "score")
plot(array.get(indices, 0))
plot(array.get(indices, 1))
plot(array.get(indices, 2))
plot(array.get(items, 0).score)
plot(array.get(items, 2).score)`,
    officialMembers: ['array.from', 'array.sort_indices', 'array.sort', 'array.get', 'order.ascending', 'order.descending'],
    outputMembers: [
      ['array.sort_indices', 'array.get'],
      ['array.sort_indices', 'array.get'],
      ['array.sort_indices', 'array.get'],
      ['array.sort', 'array.get'],
      ['array.sort', 'array.get'],
    ],
    rule: 'TradingView v6 Arrays: array.sort_indices() returns the original indexes that would sort the array, array.sort() mutates array order, and sort_field selects a UDT field for ordering UDT array values. https://www.tradingview.com/pine-script-docs/language/arrays/ https://www.tradingview.com/pine-script-reference/v6/#fun_array.sort https://www.tradingview.com/pine-script-reference/v6/#fun_array.sort_indices',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => [
      constantVector(bars, 1),
      constantVector(bars, 0),
      constantVector(bars, 2),
      constantVector(bars, 3),
      constantVector(bars, 1),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'array.distribution-values',
    namespace: 'array',
    pine: `//@version=6
indicator("array distribution values")
values = array.from(1.0, 2.0, 4.0, 7.0)
plot(array.percentile_nearest_rank(values, 50))
plot(array.percentile_linear_interpolation(values, 50))
plot(array.percentrank(values, 4.0))
plot(array.stdev(values))
plot(array.variance(values))
plot(array.covariance(values, array.from(2.0, 4.0, 8.0, 14.0)))
plot(array.standardize(values).get(0))`,
    rule: 'TradingView v6 Arrays: percentile, percentrank, stdev, variance, covariance, and standardize compute distribution statistics over array contents. https://www.tradingview.com/pine-script-docs/language/arrays/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 2),
    expectedOutputs: (bars) => [
      constantVector(bars, 2),
      constantVector(bars, 3),
      constantVector(bars, 75),
      constantVector(bars, Math.sqrt(5.25)),
      constantVector(bars, 5.25),
      constantVector(bars, 10.5),
      constantVector(bars, (1 - 3.5) / Math.sqrt(5.25)),
    ],
    outputMembers: [
      ['array.percentile_nearest_rank'],
      ['array.percentile_linear_interpolation'],
      ['array.percentrank'],
      ['array.stdev'],
      ['array.variance'],
      ['array.covariance'],
      ['array.standardize'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'array.unbiased-distribution-values',
    namespace: 'array',
    pine: `//@version=6
indicator("array unbiased distribution values")
values = array.from(1.0, 2.0, 4.0, 7.0)
other = array.from(2.0, 4.0, 8.0, 14.0)
plot(array.stdev(values, false))
plot(array.variance(values, false))
plot(array.covariance(values, other, false))`,
    rule: 'TradingView v6 Reference: array.stdev(), array.variance(), and array.covariance() accept biased=false to use an unbiased estimate. https://www.tradingview.com/pine-script-reference/v6/#fun_array.stdev https://www.tradingview.com/pine-script-reference/v6/#fun_array.variance https://www.tradingview.com/pine-script-reference/v6/#fun_array.covariance',
    expected: (bars) => constantVector(bars, Math.sqrt(7)),
    expectedOutputs: (bars) => [
      constantVector(bars, Math.sqrt(7)),
      constantVector(bars, 7),
      constantVector(bars, 14),
    ],
    outputMembers: [
      ['array.stdev'],
      ['array.variance'],
      ['array.covariance'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'matrix.basic-aggregates',
    namespace: 'matrix',
    pine: `//@version=6
indicator("matrix aggregate values")
grid = matrix.new<float>(2, 2, 0)
matrix.set(grid, 0, 0, 1)
matrix.set(grid, 0, 1, 2)
matrix.set(grid, 1, 0, 3)
matrix.set(grid, 1, 1, 4)
plot(matrix.get(grid, 1, 0))
plot(matrix.rows(grid))
plot(matrix.columns(grid))
plot(matrix.elements_count(grid))
plot(matrix.avg(grid))
plot(matrix.min(grid))
plot(matrix.max(grid))
plot(matrix.trace(grid))
plot(matrix.det(grid))`,
    rule: 'TradingView v6 Matrices: matrix accessors and aggregate functions operate over row/column-indexed matrix elements; det() returns the determinant of a square matrix. https://www.tradingview.com/pine-script-docs/language/matrices/',
    expected: (bars) => constantVector(bars, 3),
    expectedOutputs: (bars) => [
      constantVector(bars, 3),
      constantVector(bars, 2),
      constantVector(bars, 2),
      constantVector(bars, 4),
      constantVector(bars, 2.5),
      constantVector(bars, 1),
      constantVector(bars, 4),
      constantVector(bars, 5),
      constantVector(bars, -2),
    ],
    outputMembers: [
      ['matrix.get'],
      ['matrix.rows'],
      ['matrix.columns'],
      ['matrix.elements_count'],
      ['matrix.avg'],
      ['matrix.min'],
      ['matrix.max'],
      ['matrix.trace'],
      ['matrix.det'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'matrix.fill-sort-values',
    namespace: 'matrix',
    pine: `//@version=6
indicator("matrix fill sort values")
filled = matrix.new<float>(2, 2, 0)
matrix.fill(filled, 7)
sortable = matrix.new<float>(3, 2, 0)
matrix.set(sortable, 0, 0, 3)
matrix.set(sortable, 0, 1, 30)
matrix.set(sortable, 1, 0, 1)
matrix.set(sortable, 1, 1, 10)
matrix.set(sortable, 2, 0, 2)
matrix.set(sortable, 2, 1, 20)
matrix.sort(sortable, 0, order.ascending)
plot(matrix.get(filled, 1, 1))
plot(matrix.get(sortable, 0, 0))
plot(matrix.get(sortable, 0, 1))
plot(matrix.get(sortable, 2, 0))
plot(matrix.get(sortable, 2, 1))`,
    rule: 'TradingView v6 Matrices: fill() assigns a value across matrix cells, and sort() reorders rows by a selected column and order. https://www.tradingview.com/pine-script-docs/language/matrices/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 7),
    expectedOutputs: (bars) => [
      constantVector(bars, 7),
      constantVector(bars, 1),
      constantVector(bars, 10),
      constantVector(bars, 3),
      constantVector(bars, 30),
    ],
    outputMembers: [
      ['matrix.fill'],
      ['matrix.sort'],
      ['matrix.sort'],
      ['matrix.sort'],
      ['matrix.sort'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'matrix.range-fill-sort-column-values',
    namespace: 'matrix',
    pine: `//@version=6
indicator("matrix range fill sort column values")
filled = matrix.new<float>(3, 3, 0)
matrix.fill(filled, 5, 1, 3, 0, 2)
sortable = matrix.new<float>(3, 2, 0)
matrix.set(sortable, 0, 0, 30)
matrix.set(sortable, 0, 1, 3)
matrix.set(sortable, 1, 0, 10)
matrix.set(sortable, 1, 1, 1)
matrix.set(sortable, 2, 0, 20)
matrix.set(sortable, 2, 1, 2)
matrix.sort(sortable, 1, order.descending)
plot(matrix.get(filled, 0, 0))
plot(matrix.get(filled, 1, 0))
plot(matrix.get(filled, 2, 1))
plot(matrix.get(filled, 2, 2))
plot(matrix.get(sortable, 0, 0))
plot(matrix.get(sortable, 2, 0))`,
    rule: 'TradingView v6 Matrices: matrix.fill(id, value, from_row, to_row, from_column, to_column) fills the selected half-open cell range, and matrix.sort(id, column, order) reorders rows by the selected column. https://www.tradingview.com/pine-script-docs/language/matrices/ https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.fill https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.sort',
    expected: (bars) => constantVector(bars, 0),
    expectedOutputs: (bars) => [
      constantVector(bars, 0),
      constantVector(bars, 5),
      constantVector(bars, 5),
      constantVector(bars, 0),
      constantVector(bars, 30),
      constantVector(bars, 10),
    ],
    outputMembers: [
      ['matrix.fill'],
      ['matrix.fill'],
      ['matrix.fill'],
      ['matrix.fill'],
      ['matrix.sort'],
      ['matrix.sort'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'matrix.shape-mutation-values',
    namespace: 'matrix',
    pine: `//@version=6
indicator("matrix shape mutation values")
grid = matrix.new<float>(2, 2, 0)
matrix.set(grid, 0, 0, 1)
matrix.set(grid, 0, 1, 2)
matrix.set(grid, 1, 0, 3)
matrix.set(grid, 1, 1, 4)
matrix.add_row(grid, 1, array.from(5.0, 6.0))
matrix.add_col(grid, 0, array.from(7.0, 8.0, 9.0))
row = matrix.row(grid, 1)
col = matrix.col(grid, 0)
matrix.swap_rows(grid, 0, 2)
matrix.swap_columns(grid, 0, 2)
removedRow = matrix.remove_row(grid, 1)
removedCol = matrix.remove_col(grid, 1)
copy = matrix.copy(grid)
matrix.set(grid, 0, 0, 10)
matrix.reshape(grid, 1, 4)
matrix.reverse(grid)
sub = matrix.submatrix(copy, 0, 1, 0, 1)
joined = matrix.concat(copy, matrix.new<float>(1, 2, 11))
plot(array.get(row, 0))
plot(array.get(row, 2))
plot(array.get(col, 2))
plot(array.get(removedRow, 1))
plot(array.get(removedCol, 0))
plot(matrix.get(copy, 0, 0))
plot(matrix.get(grid, 0, 0))
plot(matrix.get(sub, 0, 0))
plot(matrix.rows(joined))
plot(matrix.columns(joined))`,
    rule: 'TradingView v6 Matrices: row/column insertion, removal, swapping, copying, reshaping, reversing, submatrix extraction, and concat mutate or return matrix values according to their documented row/column order. https://www.tradingview.com/pine-script-docs/language/matrices/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 8),
    expectedOutputs: (bars) => [
      constantVector(bars, 8),
      constantVector(bars, 6),
      constantVector(bars, 9),
      constantVector(bars, 5),
      constantVector(bars, 3),
      constantVector(bars, 4),
      constantVector(bars, 7),
      constantVector(bars, 4),
      constantVector(bars, 3),
      constantVector(bars, 2),
    ],
    outputMembers: [
      ['matrix.add_row', 'matrix.row'],
      ['matrix.add_row', 'matrix.row'],
      ['matrix.add_col', 'matrix.col'],
      ['matrix.remove_row'],
      ['matrix.remove_col'],
      ['matrix.copy', 'matrix.swap_rows', 'matrix.swap_columns'],
      ['matrix.set', 'matrix.reshape', 'matrix.reverse'],
      ['matrix.submatrix'],
      ['matrix.concat'],
      ['matrix.concat'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'matrix.algebra-values',
    namespace: 'matrix',
    pine: `//@version=6
indicator("matrix algebra values")
left = matrix.new<float>(2, 2, 0)
right = matrix.new<float>(2, 2, 0)
matrix.set(left, 0, 0, 1)
matrix.set(left, 0, 1, 2)
matrix.set(left, 1, 0, 3)
matrix.set(left, 1, 1, 4)
matrix.set(right, 0, 0, 5)
matrix.set(right, 0, 1, 6)
matrix.set(right, 1, 0, 7)
matrix.set(right, 1, 1, 8)
sum = matrix.sum(left, right)
diff = matrix.diff(right, left)
product = matrix.mult(left, right)
kronecker = matrix.kron(left, right)
power = matrix.pow(left, 2)
transposed = matrix.transpose(left)
inverse = matrix.inv(left)
pinverse = matrix.pinv(left)
values = matrix.eigenvalues(left)
vectors = matrix.eigenvectors(left)
plot(matrix.get(sum, 1, 1))
plot(matrix.get(diff, 0, 0))
plot(matrix.get(product, 1, 1))
plot(matrix.get(kronecker, 3, 3))
plot(matrix.get(power, 0, 1))
plot(matrix.get(transposed, 0, 1))
plot(matrix.get(inverse, 0, 0))
plot(matrix.get(pinverse, 0, 0))
plot(matrix.rank(left))
plot(array.size(values))
plot(matrix.rows(vectors))`,
    rule: 'TradingView v6 Matrices: matrix.sum/diff/mult/kron/pow/transpose/inv/pinv/rank/eigenvalues/eigenvectors return algebraic matrix or array values derived from the source matrices. https://www.tradingview.com/pine-script-docs/language/matrices/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 12),
    expectedOutputs: (bars) => [
      constantVector(bars, 12),
      constantVector(bars, 4),
      constantVector(bars, 50),
      constantVector(bars, 32),
      constantVector(bars, 10),
      constantVector(bars, 3),
      constantVector(bars, -2),
      constantVector(bars, -2),
      constantVector(bars, 2),
      constantVector(bars, 2),
      constantVector(bars, 2),
    ],
    outputMembers: [
      ['matrix.sum'],
      ['matrix.diff'],
      ['matrix.mult'],
      ['matrix.kron'],
      ['matrix.pow'],
      ['matrix.transpose'],
      ['matrix.inv'],
      ['matrix.pinv'],
      ['matrix.rank'],
      ['matrix.eigenvalues'],
      ['matrix.eigenvectors'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'matrix.mixed-kron-values',
    namespace: 'matrix',
    pine: `//@version=6
indicator("mixed matrix kron values")
ints = matrix.new<int>(1, 1, 2)
floats = matrix.new<float>(1, 2, 0.0)
matrix.set(floats, 0, 0, 1.5)
matrix.set(floats, 0, 1, 2.5)
product = matrix.kron(ints, floats)
plot(matrix.rows(product))
plot(matrix.columns(product))
plot(matrix.get(product, 0, 0))
plot(matrix.get(product, 0, 1))`,
    rule: 'TradingView v6 Matrices: matrix.kron() returns the Kronecker product of two matrices; int and float operands are numeric and produce float-compatible products. https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.kron https://www.tradingview.com/pine-script-docs/language/type-system/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => [
      constantVector(bars, 1),
      constantVector(bars, 2),
      constantVector(bars, 3),
      constantVector(bars, 5),
    ],
    outputMembers: [
      ['matrix.rows'],
      ['matrix.columns'],
      ['matrix.get'],
      ['matrix.get'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'matrix.complex-eigen-shape-values',
    namespace: 'matrix',
    pine: `//@version=6
indicator("complex eigen shape values")
m = matrix.new<float>(2, 2, 0.0)
m.set(0, 1, -1.0)
m.set(1, 0, 1.0)
values = matrix.eigenvalues(m)
vectors = matrix.eigenvectors(m)
plot(array.size(values))
plot(matrix.rows(vectors))
plot(matrix.columns(vectors))`,
    rule: 'TradingView v6 Reference: matrix.eigenvalues() returns an array containing the eigenvalues of a square matrix, and matrix.eigenvectors() returns a matrix of eigenvectors. This vector asserts only the documented output shape, not an invented complex-value representation. https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.eigenvalues https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.eigenvectors',
    expected: (bars) => constantVector(bars, 2),
    expectedOutputs: (bars) => [
      constantVector(bars, 2),
      constantVector(bars, 2),
      constantVector(bars, 2),
    ],
    outputMembers: [
      ['array.size'],
      ['matrix.rows'],
      ['matrix.columns'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'matrix.predicate-distribution-values',
    namespace: 'matrix',
    pine: `//@version=6
indicator("matrix predicate distribution values")
identity = matrix.new<float>(2, 2, 0)
matrix.set(identity, 0, 0, 1)
matrix.set(identity, 1, 1, 1)
anti = matrix.new<float>(2, 2, 0)
matrix.set(anti, 0, 1, 1)
matrix.set(anti, 1, 0, 1)
skew = matrix.new<float>(2, 2, 0)
matrix.set(skew, 0, 1, 2)
matrix.set(skew, 1, 0, -2)
stochastic = matrix.new<float>(2, 2, 0)
matrix.set(stochastic, 0, 0, 0.25)
matrix.set(stochastic, 0, 1, 0.75)
matrix.set(stochastic, 1, 0, 0.5)
matrix.set(stochastic, 1, 1, 0.5)
zero = matrix.new<float>(2, 2, 0)
values = matrix.new<float>(2, 2, 0)
matrix.set(values, 0, 0, 1)
matrix.set(values, 0, 1, 2)
matrix.set(values, 1, 0, 2)
matrix.set(values, 1, 1, 4)
plot(matrix.is_identity(identity) ? 1 : 0)
plot(matrix.is_diagonal(identity) ? 1 : 0)
plot(matrix.is_square(identity) ? 1 : 0)
plot(matrix.is_symmetric(identity) ? 1 : 0)
plot(matrix.is_triangular(identity) ? 1 : 0)
plot(matrix.is_binary(identity) ? 1 : 0)
plot(matrix.is_antidiagonal(anti) ? 1 : 0)
plot(matrix.is_antisymmetric(skew) ? 1 : 0)
plot(matrix.is_stochastic(stochastic) ? 1 : 0)
plot(matrix.is_zero(zero) ? 1 : 0)
plot(matrix.median(values))
plot(matrix.mode(values))`,
    rule: 'TradingView v6 Matrices: matrix predicate functions test documented structural properties, and median()/mode() compute distribution values over matrix elements. https://www.tradingview.com/pine-script-docs/language/matrices/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => [
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 2),
      constantVector(bars, 2),
    ],
    outputMembers: [
      ['matrix.is_identity'],
      ['matrix.is_diagonal'],
      ['matrix.is_square'],
      ['matrix.is_symmetric'],
      ['matrix.is_triangular'],
      ['matrix.is_binary'],
      ['matrix.is_antidiagonal'],
      ['matrix.is_antisymmetric'],
      ['matrix.is_stochastic'],
      ['matrix.is_zero'],
      ['matrix.median'],
      ['matrix.mode'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'map.mutation-accessors',
    namespace: 'map',
    pine: `//@version=6
indicator("map mutation values")
left = map.new<string, float>()
right = map.new<string, float>()
previous = map.put(left, "BTC", 1.0)
value = map.get(left, "BTC")
exists = map.contains(left, "BTC")
removed = map.remove(left, "BTC")
map.put(right, "ETH", 2.0)
map.put(left, "SOL", 3.0)
map.put_all(left, right)
copied = map.copy(left)
keys = map.keys(copied)
values = map.values(copied)
size = map.size(copied)
map.clear(right)
plot(nz(previous) + value + removed + size + array.size(keys) + array.size(values) + (exists ? 1 : 0))`,
    rule: 'TradingView v6 Maps: map.put() returns the previous value for an existing key or na, map mutation/accessor functions update and read keyed entries, and keys()/values() return arrays of map contents. https://www.tradingview.com/pine-script-docs/language/maps/',
    expected: (bars) => constantVector(bars, 9),
    bars: HOSTILE_BARS,
  },
  {
    id: 'visual.plot-hline-fill-metadata-values',
    namespace: 'visual',
    pine: `//@version=6
indicator("plot hline fill metadata values", overlay=false)
fast = plot(close, title="Fast", color=color.rgb(10, 20, 30), linewidth=2, style=plot.style_stepline, offset=1, trackprice=true, histbase=5, join=true, editable=false, show_last=4, display=display.data_window, format=format.price, precision=3, force_overlay=true)
slow = plot(open, title="Slow", color=color.rgb(40, 50, 60), linewidth=3)
hline(10, title="Mid", color=color.rgb(70, 80, 90), linestyle=hline.style_dashed, linewidth=4, editable=false, display=display.price_scale)
fill(fast, slow, color=color.rgb(100, 110, 120), title="Band", editable=false, show_last=3, fillgaps=false)`,
    rule: 'TradingView v6 Plots and fills: plot(), hline(), and fill() preserve their documented value and presentation arguments on the output object without changing the underlying series values. https://www.tradingview.com/pine-script-docs/visuals/plots/ https://www.tradingview.com/pine-script-docs/visuals/fills/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => bars.map((bar) => bar.close),
    expectedOutputs: (bars) => [
      bars.map((bar) => bar.close),
      bars.map((bar) => bar.open),
      constantVector(bars, 10),
      constantVector(bars, 1),
    ],
    expectedPlots: (bars) => [
      {
        type: 'plot',
        title: 'Fast',
        color: bars.map(() => '#0A141EFF'),
        linewidth: 2,
        style: 'stepline',
        offset: 1,
        trackprice: true,
        histbase: 5,
        join: true,
        editable: false,
        showLast: 4,
        display: 2,
        format: 'price',
        precision: 3,
        forceOverlay: true,
      },
      {
        type: 'plot',
        title: 'Slow',
        color: bars.map(() => '#28323CFF'),
        linewidth: 3,
      },
      {
        type: 'hline',
        title: 'Mid',
        price: 10,
        color: '#46505AFF',
        lineStyle: 'dashed',
        linewidth: 4,
        editable: false,
        display: 8,
      },
      {
        type: 'fill',
        title: 'Band',
        color: bars.map(() => '#646E78FF'),
        editable: false,
        showLast: 3,
        fillgaps: false,
      },
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'visual.marker-candle-metadata-values',
    namespace: 'visual',
    pine: `//@version=6
indicator("marker candle metadata values", overlay=true)
plotshape(close > open, title="Shape", location=location.abovebar, style=shape.triangleup, color=color.rgb(1, 2, 3), size=size.large, text="S", textcolor=color.rgb(4, 5, 6), offset=1, show_last=4, force_overlay=true)
plotchar(close < open, title="Char", char="X", location=location.belowbar, color=color.rgb(7, 8, 9), text="C", textcolor=color.rgb(10, 11, 12))
plotarrow(close - open, title="Arrow", colorup=color.rgb(13, 14, 15), colordown=color.rgb(16, 17, 18), minheight=5, maxheight=25)
plotbar(open, high, low, close, title="Bars", color=color.rgb(19, 20, 21))
plotcandle(open, high, low, close, title="Candles", color=color.rgb(22, 23, 24), wickcolor=color.rgb(25, 26, 27), bordercolor=color.rgb(28, 29, 30))`,
    rule: 'TradingView v6 Visuals: plotshape(), plotchar(), plotarrow(), plotbar(), and plotcandle() preserve documented marker/candle metadata while output series values follow their value arguments. https://www.tradingview.com/pine-script-docs/visuals/text-and-shapes/ https://www.tradingview.com/pine-script-docs/visuals/bar-plotting/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => bars.map((bar) => bar.close > bar.open ? 1 : null),
    expectedOutputs: (bars) => [
      bars.map((bar) => bar.close > bar.open ? 1 : null),
      bars.map((bar) => bar.close < bar.open ? 1 : null),
      bars.map((bar) => bar.close - bar.open === 0 ? null : bar.close - bar.open),
      bars.map((bar) => bar.close),
      bars.map((bar) => bar.close),
    ],
    expectedPlots: () => [
      {
        type: 'plotshape',
        title: 'Shape',
        location: 'abovebar',
        shape: 'triangleup',
        size: 'large',
        text: 'S',
        offset: 1,
        showLast: 4,
        forceOverlay: true,
      },
      {
        type: 'plotchar',
        title: 'Char',
        location: 'belowbar',
        char: 'X',
        text: 'C',
      },
      {
        type: 'plotarrow',
        title: 'Arrow',
        minHeight: 5,
        maxHeight: 25,
      },
      {
        type: 'plotbar',
        title: 'Bars',
      },
      {
        type: 'plotcandle',
        title: 'Candles',
      },
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'priority.plotchar-metadata-depth-values',
    namespace: 'visual',
    pine: `//@version=6
indicator("priority plotchar metadata depth", overlay=false)
plotchar(close > open, title="CharDepth", char="D", location=location.abovebar, color=color.green, offset=1, text="txt", textcolor=color.white, editable=false, size=size.tiny, show_last=3, display=display.data_window, format=format.price, precision=2, force_overlay=true)
plot(close)`,
    officialMembers: ['plotchar'],
    outputMembers: [['plotchar'], ['plot']],
    rule: 'TradingView v6 Text and shapes/reference: plotchar() emits markers where the series is true/non-na; offset, editable, show_last, display, format, precision, and force_overlay are output metadata and do not alter the underlying series truth values. https://www.tradingview.com/pine-script-docs/visuals/text-and-shapes/ https://www.tradingview.com/pine-script-reference/v6/#fun_plotchar',
    expected: (bars) => bars.map((bar) => bar.close > bar.open ? 1 : null),
    expectedOutputs: (bars) => [
      bars.map((bar) => bar.close > bar.open ? 1 : null),
      bars.map((bar) => bar.close),
    ],
    expectedPlots: () => [
      {
        type: 'plotchar',
        title: 'CharDepth',
        char: 'D',
        location: 'abovebar',
        offset: 1,
        text: 'txt',
        editable: false,
        size: 'tiny',
        showLast: 3,
        display: 2,
        format: 'price',
        precision: 2,
        forceOverlay: true,
      },
      { type: 'plot' },
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'priority.plotarrow-metadata-depth-values',
    namespace: 'visual',
    pine: `//@version=6
indicator("priority plotarrow metadata depth", overlay=false)
plotarrow(close - open, title="ArrowDepth", colorup=color.green, colordown=color.red, offset=-1, minheight=4, maxheight=18, editable=false, show_last=5, display=display.all, format=format.volume, precision=0, force_overlay=true)
plot(close)`,
    officialMembers: ['plotarrow'],
    outputMembers: [['plotarrow'], ['plot']],
    rule: 'TradingView v6 Text and shapes/reference: plotarrow() uses positive/negative numeric series values for arrow direction; offset, editable, show_last, display, format, precision, and force_overlay are output metadata and do not alter the numeric series. https://www.tradingview.com/pine-script-docs/visuals/text-and-shapes/ https://www.tradingview.com/pine-script-reference/v6/#fun_plotarrow',
    expected: (bars) => bars.map((bar) => bar.close - bar.open === 0 ? null : bar.close - bar.open),
    expectedOutputs: (bars) => [
      bars.map((bar) => bar.close - bar.open === 0 ? null : bar.close - bar.open),
      bars.map((bar) => bar.close),
    ],
    expectedPlots: () => [
      {
        type: 'plotarrow',
        title: 'ArrowDepth',
        offset: -1,
        minHeight: 4,
        maxHeight: 18,
        editable: false,
        showLast: 5,
        display: 31,
        format: 'volume',
        precision: 0,
        forceOverlay: true,
      },
      { type: 'plot' },
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'priority.plotbar-plotcandle-metadata-depth-values',
    namespace: 'visual',
    pine: `//@version=6
indicator("priority plotbar plotcandle metadata depth", overlay=false)
plotbar(open, high, low, close, title="BarDepth", color=color.green, editable=false, show_last=4, display=display.all, force_overlay=true)
plotcandle(open, high, low, close, title="CandleDepth", color=color.red, wickcolor=color.green, editable=false, show_last=5, bordercolor=color.blue, display=display.data_window, force_overlay=true)
plot(close)`,
    officialMembers: ['plotbar', 'plotcandle'],
    outputMembers: [['plotbar'], ['plotcandle'], ['plot']],
    rule: 'TradingView v6 Bar plotting/reference: plotbar() and plotcandle() draw supplied OHLC values; editable, show_last, display, and force_overlay are output metadata and do not alter the close-value series. https://www.tradingview.com/pine-script-docs/visuals/bar-plotting/ https://www.tradingview.com/pine-script-reference/v6/#fun_plotbar https://www.tradingview.com/pine-script-reference/v6/#fun_plotcandle',
    expected: (bars) => bars.map((bar) => bar.close),
    expectedOutputs: (bars) => [
      bars.map((bar) => bar.close),
      bars.map((bar) => bar.close),
      bars.map((bar) => bar.close),
    ],
    expectedPlots: () => [
      {
        type: 'plotbar',
        title: 'BarDepth',
        editable: false,
        showLast: 4,
        display: 31,
        forceOverlay: true,
      },
      {
        type: 'plotcandle',
        title: 'CandleDepth',
        editable: false,
        showLast: 5,
        display: 2,
        forceOverlay: true,
      },
      { type: 'plot' },
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'depth.plotshape-conditional-metadata-values',
    namespace: 'visual',
    pine: `//@version=6
indicator("plotshape conditional metadata depth", overlay=true)
plotshape(close > 0, title="AboveZero", location=location.absolute, style=shape.circle, color=color.green, text="A", textcolor=color.white, size=size.small, display=display.all)
plot(close)`,
    officialMembers: ['plotshape'],
    rule: 'TradingView v6 Text and shapes: plotshape() emits markers only where its series argument is true/non-na, while location/style/color/text metadata controls presentation. https://www.tradingview.com/pine-script-docs/visuals/text-and-shapes/ https://www.tradingview.com/pine-script-reference/v6/#fun_plotshape',
    expected: (bars) => bars.map((bar) => bar.close > 0 ? 1 : null),
    expectedOutputs: (bars) => [
      bars.map((bar) => bar.close > 0 ? 1 : null),
      bars.map((bar) => bar.close),
    ],
    expectedPlots: () => [
      {
        type: 'plotshape',
        title: 'AboveZero',
        location: 'absolute',
        shape: 'circle',
        text: 'A',
        size: 'small',
        display: 31,
      },
      { type: 'plot' },
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'visual.bgcolor-barcolor-metadata-values',
    namespace: 'visual',
    pine: `//@version=6
indicator("bgcolor barcolor metadata values", overlay=true)
bgcolor(color.rgb(10, 20, 30), title="Background", editable=false, show_last=4, display=display.all, force_overlay=true)
barcolor(color.rgb(40, 50, 60), title="Bars", editable=false, show_last=5, display=display.all)
plot(close)`,
    rule: 'TradingView v6 Backgrounds and bar coloring: bgcolor() and barcolor() preserve documented metadata arguments while the color series controls the visual output only. https://www.tradingview.com/pine-script-docs/visuals/backgrounds/ https://www.tradingview.com/pine-script-docs/visuals/bar-coloring/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => [
      constantVector(bars, 1),
      bars.map(() => null),
      bars.map((bar) => bar.close),
    ],
    expectedPlots: (bars) => [
      {
        type: 'bgcolor',
        title: 'Background',
        color: bars.map(() => '#0A141EFF'),
        editable: false,
        showLast: 4,
        display: 31,
        forceOverlay: true,
      },
      {
        type: 'barcolor',
        title: 'Bars',
        color: bars.map(() => '#28323CFF'),
        editable: false,
        showLast: 5,
        display: 31,
      },
      {
        type: 'plot',
      },
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'priority.visual-output-metadata-values',
    namespace: 'visual',
    pine: `//@version=6
indicator("priority visual output metadata values", overlay=true)
upper = plot(close, title="Upper")
lower = plot(open, title="Lower")
fill(upper, lower, color=color.rgb(1, 2, 3), title="FillDisplay", display=display.data_window)
bgcolor(color.rgb(10, 20, 30), title="BackgroundOffsetTransp", offset=1, transp=50)
barcolor(color.rgb(40, 50, 60), title="BarOffset", offset=-1)
plotshape(close > open, title="ShapeEditableFormat", editable=false, format=format.price, precision=2)
plot(close, title="Close")`,
    officialMembers: ['plot', 'fill', 'bgcolor', 'barcolor', 'plotshape'],
    outputMembers: [['plot'], ['plot'], ['fill'], ['bgcolor'], ['barcolor'], ['plotshape'], ['plot']],
    rule: 'TradingView v6 Visuals: fill display, bgcolor/barcolor offsets and legacy transparency, and plotshape editable/format/precision arguments are presentation metadata; they do not change the underlying output series values. The legacy transp argument uses the documented 0-100 transparency scale. https://www.tradingview.com/pine-script-docs/visuals/fills/ https://www.tradingview.com/pine-script-docs/visuals/backgrounds/ https://www.tradingview.com/pine-script-docs/visuals/bar-coloring/ https://www.tradingview.com/pine-script-docs/visuals/text-and-shapes/',
    expected: (bars) => bars.map((bar) => bar.close),
    expectedOutputs: (bars) => [
      bars.map((bar) => bar.close),
      bars.map((bar) => bar.open),
      constantVector(bars, 1),
      [null, ...constantVector(bars, 1)],
      bars.slice(0, -1).map(() => null),
      bars.map((bar) => bar.close > bar.open ? 1 : null),
      bars.map((bar) => bar.close),
    ],
    expectedPlots: (bars) => [
      { type: 'plot', title: 'Upper' },
      { type: 'plot', title: 'Lower' },
      {
        type: 'fill',
        title: 'FillDisplay',
        color: bars.map(() => '#010203FF'),
        display: 2,
      },
      {
        type: 'bgcolor',
        title: 'BackgroundOffsetTransp',
        color: [null, ...bars.map(() => '#0A141E80')],
        offset: 1,
      },
      {
        type: 'barcolor',
        title: 'BarOffset',
        color: bars.slice(0, -1).map(() => '#28323CFF'),
        offset: -1,
      },
      {
        type: 'plotshape',
        title: 'ShapeEditableFormat',
        editable: false,
        format: 'price',
        precision: 2,
      },
      { type: 'plot', title: 'Close' },
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'visual.constant-identity-values',
    namespace: 'visual',
    pine: `//@version=6
indicator("visual constant identity values", overlay=true, format=format.inherit, scale=scale.left)
plot(close, title="style_line", style=plot.style_line)
plot(close, title="style_linebr", style=plot.style_linebr)
plot(close, title="style_area", style=plot.style_area)
plot(close, title="style_areabr", style=plot.style_areabr)
plot(close, title="style_circles", style=plot.style_circles)
plot(close, title="style_columns", style=plot.style_columns)
plot(close, title="style_cross", style=plot.style_cross)
plot(close, title="style_histogram", style=plot.style_histogram)
plot(close, title="style_stepline_diamond", style=plot.style_stepline_diamond)
plot(close, title="style_steplinebr", style=plot.style_steplinebr)
plot(close, title="linestyle_solid", linestyle=plot.linestyle_solid)
plot(close, title="linestyle_dashed", linestyle=plot.linestyle_dashed)
plot(close, title="linestyle_dotted", linestyle=plot.linestyle_dotted)
hline(1, title="hline_solid", linestyle=hline.style_solid)
hline(2, title="hline_dotted", linestyle=hline.style_dotted)
plot(format.volume == "volume" ? 1 : 0)
plot(format.percent == "percent" ? 1 : 0)
plot(format.mintick == "mintick" ? 1 : 0)
plot(scale.right == "right" ? 1 : 0)
plot(scale.none == "none" ? 1 : 0)
plot(location.top == "top" ? 1 : 0)
plot(location.bottom == "bottom" ? 1 : 0)
plot(location.absolute == "absolute" ? 1 : 0)`,
    rule: 'TradingView v6 reference: visual enum constants resolve to stable identifiers used by plot, hline, declaration format/scale, and marker location parameters. Plot and hline style constants are asserted through emitted metadata rather than raw enum identity. https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => bars.map((bar) => bar.close),
    expectedOutputs: (bars) => [
      ...Array.from({ length: 13 }, () => bars.map((bar) => bar.close)),
      constantVector(bars, 1),
      constantVector(bars, 2),
      ...Array.from({ length: 8 }, () => constantVector(bars, 1)),
    ],
    outputMembers: [
      ...Array.from({ length: 15 }, () => []),
      ['format.volume'],
      ['format.percent'],
      ['format.mintick'],
      ['scale.right'],
      ['scale.none'],
      ['location.top'],
      ['location.bottom'],
      ['location.absolute'],
    ],
    expectedPlots: () => [
      { type: 'plot', title: 'style_line', style: 'line' },
      { type: 'plot', title: 'style_linebr', style: 'linebr' },
      { type: 'plot', title: 'style_area', style: 'area' },
      { type: 'plot', title: 'style_areabr', style: 'areabr' },
      { type: 'plot', title: 'style_circles', style: 'circles' },
      { type: 'plot', title: 'style_columns', style: 'columns' },
      { type: 'plot', title: 'style_cross', style: 'cross' },
      { type: 'plot', title: 'style_histogram', style: 'histogram' },
      { type: 'plot', title: 'style_stepline_diamond', style: 'stepline_diamond' },
      { type: 'plot', title: 'style_steplinebr', style: 'steplinebr' },
      { type: 'plot', title: 'linestyle_solid', lineStyle: 'solid' },
      { type: 'plot', title: 'linestyle_dashed', lineStyle: 'dashed' },
      { type: 'plot', title: 'linestyle_dotted', lineStyle: 'dotted' },
      { type: 'hline', title: 'hline_solid', lineStyle: 'solid' },
      { type: 'hline', title: 'hline_dotted', lineStyle: 'dotted' },
      ...Array.from({ length: 8 }, () => ({ type: 'plot' })),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'visual.shape-position-constant-values',
    namespace: 'visual',
    pine: `//@version=6
indicator("shape position constant values")
plot(shape.arrowdown == "arrowdown" ? 1 : 0)
plot(shape.arrowup == "arrowup" ? 1 : 0)
plot(shape.circle == "circle" ? 1 : 0)
plot(shape.cross == "cross" ? 1 : 0)
plot(shape.diamond == "diamond" ? 1 : 0)
plot(shape.flag == "flag" ? 1 : 0)
plot(shape.labeldown == "labeldown" ? 1 : 0)
plot(shape.labelup == "labelup" ? 1 : 0)
plot(shape.square == "square" ? 1 : 0)
plot(shape.triangledown == "triangledown" ? 1 : 0)
plot(shape.xcross == "xcross" ? 1 : 0)
plot(position.top_left == "top_left" ? 1 : 0)
plot(position.top_center == "top_center" ? 1 : 0)
plot(position.middle_left == "middle_left" ? 1 : 0)
plot(position.middle_right == "middle_right" ? 1 : 0)
plot(position.bottom_center == "bottom_center" ? 1 : 0)
plot(position.bottom_right == "bottom_right" ? 1 : 0)`,
    rule: 'TradingView v6 reference: shape.* and position.* constants resolve to stable identifiers used by marker and table drawing APIs. https://www.tradingview.com/pine-script-docs/visuals/text-and-shapes/ https://www.tradingview.com/pine-script-docs/visuals/tables/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => Array.from({ length: 17 }, () => constantVector(bars, 1)),
    outputMembers: [
      ['shape.arrowdown'],
      ['shape.arrowup'],
      ['shape.circle'],
      ['shape.cross'],
      ['shape.diamond'],
      ['shape.flag'],
      ['shape.labeldown'],
      ['shape.labelup'],
      ['shape.square'],
      ['shape.triangledown'],
      ['shape.xcross'],
      ['position.top_left'],
      ['position.top_center'],
      ['position.middle_left'],
      ['position.middle_right'],
      ['position.bottom_center'],
      ['position.bottom_right'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'runtime.color-math-array-values',
    namespace: 'runtime',
    pine: `//@version=6
indicator("color math array values")
endpointLow = color.from_gradient(0, 0, 10, color.rgb(10, 20, 30), color.rgb(40, 50, 60))
endpointHigh = color.from_gradient(10, 0, 10, color.rgb(10, 20, 30), color.rgb(40, 50, 60))
transparent = color.new(color.rgb(70, 80, 90), 25)
absolute = array.abs(array.from(-2.0, 0.0, 3.0))
plot(color.r(endpointLow))
plot(color.g(endpointHigh))
plot(color.b(transparent))
plot(color.t(transparent))
plot(array.get(absolute, 0))
plot(array.get(absolute, 2))
plot(math.round_to_mintick(1.26))
plot(math.rphi > 0.61 and math.rphi < 0.62 ? 1 : 0)
plot(math.tanh(1))`,
    rule: 'TradingView v6 reference: color.from_gradient() returns endpoint colors at the gradient bounds, color.new() applies transparency without changing RGB channels, array.abs() maps numeric elements to absolute values, round_to_mintick() rounds to symbol mintick, math.rphi is the reciprocal golden ratio, and tanh() returns hyperbolic tangent. https://www.tradingview.com/pine-script-docs/visuals/colors/ https://www.tradingview.com/pine-script-docs/language/arrays/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 10),
    expectedOutputs: (bars) => [
      constantVector(bars, 10),
      constantVector(bars, 50),
      constantVector(bars, 90),
      constantVector(bars, 25),
      constantVector(bars, 2),
      constantVector(bars, 3),
      constantVector(bars, 1.3),
      constantVector(bars, 1),
      constantVector(bars, Math.tanh(1)),
    ],
    outputMembers: [
      ['color.r'],
      ['color.g'],
      ['color.b'],
      ['color.t'],
      ['array.get'],
      ['array.get'],
      ['math.round_to_mintick'],
      ['math.rphi'],
      ['math.tanh'],
    ],
    bars: HOSTILE_BARS,
    options: () => RUNTIME_METADATA_OPTIONS,
  },
  {
    id: 'depth.color-new-series-transparency-values',
    namespace: 'color',
    pine: `//@version=6
indicator("color new series transparency depth")
transp = bar_index % 2 == 0 ? 0 : 50
tint = color.new(color.rgb(12, 34, 56, 20), transp)
plot(color.r(tint))
plot(color.g(tint))
plot(color.b(tint))
plot(color.t(tint))`,
    officialMembers: ['color.new'],
    outputMembers: [['color.new'], ['color.new'], ['color.new'], ['color.new']],
    rule: 'TradingView v6 Colors: color.new(color, transp) returns the same RGB color with the supplied transparency, and a series transparency argument can vary by bar. https://www.tradingview.com/pine-script-docs/visuals/colors/ https://www.tradingview.com/pine-script-reference/v6/#fun_color.new',
    expected: (bars) => constantVector(bars, 12),
    expectedOutputs: (bars) => [
      constantVector(bars, 12),
      constantVector(bars, 34),
      constantVector(bars, 56),
      bars.map((_bar, index) => index % 2 === 0 ? 0 : 50),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'priority.color-fractional-transparency-values',
    namespace: 'color',
    pine: `//@version=6
indicator("priority color fractional transparency values")
plot(close, title="new12", color=color.new(color.blue, 12))
plot(close, title="new12_4", color=color.new(color.blue, 12.4))
plot(close, title="new12_5", color=color.new(color.blue, 12.5))
plot(close, title="new12_6", color=color.new(color.blue, 12.6))
plot(close, title="new13", color=color.new(color.blue, 13))
plot(close, title="olive40", color=color.new(color.olive, 40))
plot(close, title="rgb12_5", color=color.rgb(33, 66, 99, 12.5))
plot(close, title="gradient12_5", color=color.from_gradient(1, 0, 2, color.rgb(33, 66, 99, 10), color.rgb(33, 66, 99, 15)))`,
    officialMembers: ['color.new', 'color.rgb', 'color.from_gradient', 'color.blue', 'color.olive'],
    outputMembers: [
      ['color.new'],
      ['color.new'],
      ['color.new'],
      ['color.new'],
      ['color.new'],
      ['color.new'],
      ['color.rgb'],
      ['color.from_gradient'],
    ],
    rule: 'TradingView v6 Colors: transparency is 0 fully opaque and 100 fully transparent; color.new() and color.rgb() accept float transparency, and color.from_gradient() interpolates endpoint color channels. Expected #RRGGBBAA alpha for direct transparency is round(255 * (100 - transparency) / 100); gradient alpha is interpolated from endpoint color alpha bytes. The docs anchor color.new(color.olive, 40) as a valid transparency-setting form. https://www.tradingview.com/pine-script-docs/visuals/colors/ https://www.tradingview.com/pine-script-reference/v6/#fun_color.new https://www.tradingview.com/pine-script-reference/v6/#fun_color.rgb https://www.tradingview.com/pine-script-reference/v6/#fun_color.from_gradient',
    expected: (bars) => bars.map((bar) => bar.close),
    expectedOutputs: (bars) => Array.from({ length: 8 }, () => bars.map((bar) => bar.close)),
    expectedPlots: (bars) => [
      { type: 'plot', title: 'new12', color: bars.map(() => colorHex(33, 150, 243, 12)) },
      { type: 'plot', title: 'new12_4', color: bars.map(() => colorHex(33, 150, 243, 12.4)) },
      { type: 'plot', title: 'new12_5', color: bars.map(() => colorHex(33, 150, 243, 12.5)) },
      { type: 'plot', title: 'new12_6', color: bars.map(() => colorHex(33, 150, 243, 12.6)) },
      { type: 'plot', title: 'new13', color: bars.map(() => colorHex(33, 150, 243, 13)) },
      { type: 'plot', title: 'olive40', color: bars.map(() => colorHex(128, 128, 0, 40)) },
      { type: 'plot', title: 'rgb12_5', color: bars.map(() => colorHex(33, 66, 99, 12.5)) },
      { type: 'plot', title: 'gradient12_5', color: bars.map(() => colorGradientMidpointHex(33, 66, 99, 10, 15)) },
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'priority.color-new-nested-transparency-values',
    namespace: 'color',
    pine: `//@version=6
indicator("priority color new nested transparency values")
base = color.new(color.rgb(242, 54, 69, 80), 60)
tint = color.new(base, close > open ? 25 : 75)
plot(color.r(tint))
plot(color.g(tint))
plot(color.b(tint))
plot(color.t(tint))`,
    officialMembers: ['color.new', 'color.rgb', 'color.r', 'color.g', 'color.b', 'color.t'],
    outputMembers: [['color.new'], ['color.new'], ['color.new'], ['color.new']],
    rule: 'TradingView v6 Colors: color.new(color, transp) returns the source RGB channels with the supplied transparency, replacing any existing transparency on the source color. https://www.tradingview.com/pine-script-docs/visuals/colors/ https://www.tradingview.com/pine-script-reference/v6/#fun_color.new',
    expected: (bars) => constantVector(bars, 242),
    expectedOutputs: (bars) => [
      constantVector(bars, 242),
      constantVector(bars, 54),
      constantVector(bars, 69),
      bars.map((bar) => bar.close > bar.open ? 25 : 75),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'priority.color-new-conditional-source-values',
    namespace: 'color',
    pine: `//@version=6
indicator("priority color new conditional source values")
source = close >= open ? color.green : color.red
tint = color.new(source, bar_index % 4 * 20)
plot(color.r(tint))
plot(color.g(tint))
plot(color.b(tint))
plot(color.t(tint))`,
    officialMembers: ['color.new', 'color.green', 'color.red', 'color.r', 'color.g', 'color.b', 'color.t'],
    outputMembers: [['color.new'], ['color.new'], ['color.new'], ['color.new']],
    rule: 'TradingView v6 Colors: color.new() accepts a series color source and a series transparency, preserving the selected source RGB channels and applying the evaluated transparency. https://www.tradingview.com/pine-script-docs/visuals/colors/ https://www.tradingview.com/pine-script-reference/v6/#fun_color.new',
    expected: (bars) => bars.map((bar) => bar.close >= bar.open ? 76 : 242),
    expectedOutputs: (bars) => [
      bars.map((bar) => bar.close >= bar.open ? 76 : 242),
      bars.map((bar) => bar.close >= bar.open ? 175 : 54),
      bars.map((bar) => bar.close >= bar.open ? 80 : 69),
      bars.map((_bar, index) => index % 4 * 20),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'runtime.global-context-values',
    namespace: 'runtime',
    pine: `//@version=6
indicator("global context values")
max_bars_back(close, 5)
hole = bar_index == 0 ? na : close
plot(fixnan(hole))
plot(hl2)
plot(hlc3)
plot(ohlc4)
plot(hlcc4)
plot(last_bar_index)
plot(last_bar_time == time[0] ? 1 : 0)
plot(time_close > time ? 1 : 0)
plot(time_tradingday <= time ? 1 : 0)
plot(barstate.ishistory ? 1 : 0)`,
    rule: 'TradingView v6 Time, chart information, and built-ins: OHLC-derived globals compute from each bar, bid/ask expose quote fields, last_bar_* expose dataset bounds, time_close/time_tradingday derive from bar time, barstate.ishistory is true on historical execution, fixnan carries forward the last non-na value, and max_bars_back declares history requirements without changing values. https://www.tradingview.com/pine-script-docs/concepts/chart-information/ https://www.tradingview.com/pine-script-docs/concepts/time/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => bars.map((bar) => bar.close),
    expectedOutputs: (bars) => [
      bars.map((bar, index) => index === 0 ? null : bar.close),
      bars.map((bar) => (bar.high + bar.low) / 2),
      bars.map((bar) => (bar.high + bar.low + bar.close) / 3),
      bars.map((bar) => (bar.open + bar.high + bar.low + bar.close) / 4),
      bars.map((bar) => (bar.high + bar.low + bar.close + bar.close) / 4),
      constantVector(bars, bars.length - 1),
      bars.map((bar) => bar.time === bars[bars.length - 1]!.time ? 1 : 0),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
    ],
    outputMembers: [
      ['fixnan'],
      ['hl2'],
      ['hlc3'],
      ['ohlc4'],
      ['hlcc4'],
      ['last_bar_index'],
      ['last_bar_time'],
      ['time_close'],
      ['time_tradingday'],
      ['barstate.ishistory'],
    ],
    bars: QUOTE_BARS,
  },
  {
    id: 'visual.secondary-constant-metadata-values',
    namespace: 'visual',
    pine: `//@version=6
indicator("secondary constant metadata values", overlay=true, scale=scale.none, format=format.mintick)
plot(close, title="none", display=display.none)
plot(close, title="pane", display=display.pane)
plot(close, title="status", display=display.status_line)
plot(close, title="price", display=display.price_scale)
plot(close, title="screener", display=display.pine_screener)
if bar_index == 0
    label.new(0, 1.0, text="label", yloc=yloc.abovebar, size=size.tiny, text_font_family=font.family_default)
    box.new(0, 2.0, 1, 1.0, extend=extend.both, text_wrap=text.wrap_none, text_size=size.normal)
    line.new(0, 1.0, 1, 2.0, extend=extend.left)
plot(text.align_center == "center" ? 1 : 0)
plot(text.format_none == "none" ? 1 : 0)
plot(text.format_italic == "italic" ? 1 : 0)
plot(order.descending == "descending" ? 1 : 0)`,
    rule: 'TradingView v6 reference: display, scale, format, yloc, size, font, text, extend, and order constants resolve to the documented identifiers used by visual and ordering APIs. https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => bars.map((bar) => bar.close),
    expectedOutputs: (bars) => [
      bars.map((bar) => bar.close),
      bars.map((bar) => bar.close),
      bars.map((bar) => bar.close),
      bars.map((bar) => bar.close),
      bars.map((bar) => bar.close),
      ...Array.from({ length: 4 }, () => constantVector(bars, 1)),
    ],
    outputMembers: [
      ...Array.from({ length: 5 }, () => []),
      ['text.align_center'],
      ['text.format_none'],
      ['text.format_italic'],
      ['order.descending'],
    ],
    expectedPlots: () => [
      { type: 'plot', title: 'none', display: 0 },
      { type: 'plot', title: 'pane', display: 1 },
      { type: 'plot', title: 'status', display: 4 },
      { type: 'plot', title: 'price', display: 8 },
      { type: 'plot', title: 'screener', display: 16 },
      ...Array.from({ length: 4 }, () => ({ type: 'plot' })),
    ],
    expectedDrawings: () => [
      {
        type: 'label',
        barIndex: 0,
        x: 0,
        y: 1,
        yloc: 'abovebar',
        size: 'tiny',
        textFontFamily: 'default',
      },
      {
        type: 'box',
        barIndex: 0,
        left: 0,
        top: 2,
        right: 1,
        bottom: 1,
        extend: 'both',
        textWrap: 'none',
        textSize: 'normal',
      },
      {
        type: 'line',
        barIndex: 0,
        x1: 0,
        y1: 1,
        x2: 1,
        y2: 2,
        extend: 'left',
      },
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'runtime.host-constant-identity-values',
    namespace: 'runtime',
pine: `//@version=6
indicator("host constant identity values")
if bar_index == 0
    label.new(0, 1.0, text="below", yloc=yloc.belowbar, size=size.auto)
    line.new(0, 1.0, 1, 2.0, extend=extend.none)
plot(dayofweek.sunday == 1 ? 1 : 0)
plot(dayofweek.wednesday == 4 ? 1 : 0)
plot(dayofweek.thursday == 5 ? 1 : 0)
plot(dayofweek.friday == 6 ? 1 : 0)
plot(dayofweek.saturday == 7 ? 1 : 0)
plot(dayofmonth)
plot(weekofyear)
plot(session.regular == "regular" ? 1 : 0)
plot(adjustment.none == "none" ? 1 : 0)
plot(adjustment.dividends == "dividends" ? 1 : 0)
plot(adjustment.splits == "splits" ? 1 : 0)
plot(backadjustment.inherit == "inherit" ? 1 : 0)
plot(backadjustment.on == "on" ? 1 : 0)
plot(backadjustment.off == "off" ? 1 : 0)
plot(settlement_as_close.inherit == "inherit" ? 1 : 0)
plot(settlement_as_close.on == "on" ? 1 : 0)
plot(settlement_as_close.off == "off" ? 1 : 0)`,
    rule: 'TradingView v6 reference: dayofweek constants use the documented numeric weekday values, while session/adjustment/backadjustment/settlement constants and remaining visual constants resolve to their documented API identifiers. https://www.tradingview.com/pine-script-docs/concepts/time/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => [
      ...Array.from({ length: 5 }, () => constantVector(bars, 1)),
      constantVector(bars, 16),
      constantVector(bars, 46),
      ...Array.from({ length: 10 }, () => constantVector(bars, 1)),
    ],
    outputMembers: [
      ['dayofweek.sunday'],
      ['dayofweek.wednesday'],
      ['dayofweek.thursday'],
      ['dayofweek.friday'],
      ['dayofweek.saturday'],
      ['dayofmonth'],
      ['weekofyear'],
      ['session.regular'],
      ['adjustment.none'],
      ['adjustment.dividends'],
      ['adjustment.splits'],
      ['backadjustment.inherit'],
      ['backadjustment.on'],
      ['backadjustment.off'],
      ['settlement_as_close.inherit'],
      ['settlement_as_close.on'],
      ['settlement_as_close.off'],
    ],
    expectedDrawings: () => [
      {
        type: 'label',
        barIndex: 0,
        x: 0,
        y: 1,
        yloc: 'belowbar',
        size: 'auto',
      },
      {
        type: 'line',
        barIndex: 0,
        x1: 0,
        y1: 1,
        x2: 1,
        y2: 2,
        extend: 'none',
      },
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'runtime.ticker-helper-values',
    namespace: 'ticker',
    pine: `//@version=6
indicator("ticker helper values")
regular = ticker.new("NASDAQ", "AAPL")
modified = ticker.new("NASDAQ", "AAPL", session.extended, adjustment.dividends, backadjustment.on, settlement_as_close.off)
inherited = ticker.inherit(modified, "NYSE:IBM|chart=heikinashi")
ha = ticker.heikinashi(modified)
renko = ticker.renko(symbol=regular, style="ATR", param=14, request_wicks=true, source="OHLC")
lineBreak = ticker.linebreak(regular, 3)
kagi = ticker.kagi(regular, "ATR", 2)
pointFigure = ticker.pointfigure(regular, "hl", "ATR", 14, 3)
plot(regular == "NASDAQ:AAPL" ? 1 : 0)
plot(str.contains(inherited, "session=extended") and str.contains(inherited, "adjustment=dividends") ? 1 : 0)
plot(str.contains(ha, "chart=heikinashi") ? 1 : 0)
plot(str.contains(renko, "chart=renko:ATR:14:true:OHLC") ? 1 : 0)
plot(str.contains(lineBreak, "chart=linebreak:3") ? 1 : 0)
plot(str.contains(kagi, "chart=kagi:ATR:2") ? 1 : 0)
plot(str.contains(pointFigure, "chart=pointfigure:hl:ATR:14:3") ? 1 : 0)`,
    rule: 'TradingView v6 Non-standard charts data: ticker.new(), inherit(), heikinashi(), renko(), linebreak(), kagi(), and pointfigure() return ticker identifiers that carry symbol and requested chart/session/adjustment modifiers into request.* calls. https://www.tradingview.com/pine-script-docs/concepts/non-standard-charts-data/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => Array.from({ length: 7 }, () => constantVector(bars, 1)),
    bars: HOSTILE_BARS,
  },
  {
    id: 'ticker.kagi-two-argument-values',
    namespace: 'ticker',
    pine: `//@version=6
indicator("ticker kagi two argument values")
regular = ticker.new("NASDAQ", "AAPL")
kagi = ticker.kagi(regular, 3)
plot(str.contains(kagi, "NASDAQ:AAPL") ? 1 : 0)
plot(str.contains(kagi, "chart=kagi") ? 1 : 0)
plot(str.contains(kagi, "3") ? 1 : 0)`,
    rule: 'TradingView v6 Non-standard charts data: ticker.kagi() creates a Kagi ticker identifier from a symbol and reversal configuration for request.* calls. This vector asserts the ticker-id structure needed by request routing, not provider-returned Kagi OHLC values. https://www.tradingview.com/pine-script-docs/concepts/non-standard-charts-data/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => Array.from({ length: 3 }, () => constantVector(bars, 1)),
    bars: HOSTILE_BARS,
  },
  {
    id: 'output.alertcondition-values',
    namespace: 'alert',
    pine: `//@version=6
indicator("alertcondition value vector")
basis = close + 1
plot(basis, title="Basis")
alertcondition(close > 12, title="Above", message="above threshold")`,
    rule: 'TradingView v6 Alerts: alertcondition() declares an alert event source, and its condition series determines which bars can trigger that alert. https://www.tradingview.com/pine-script-docs/concepts/alerts/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => bars.map((bar) => bar.close + 1),
    expectedAlerts: (bars) => [{
      type: 'alertcondition',
      title: 'Above',
      message: 'above threshold',
      values: bars.map((bar) => bar.close > 12 ? true : null),
      renderedMessages: bars.map((bar) => bar.close > 12 ? 'above threshold' : null),
    }],
    bars: BARS,
  },
  {
    id: 'output.alert-frequency-values',
    namespace: 'alert',
    pine: `//@version=6
indicator("alert frequency value vector")
if bar_index <= 1
    alert("all " + str.tostring(bar_index), alert.freq_all)
    alert("once " + str.tostring(bar_index), alert.freq_once_per_bar)
    alert("once " + str.tostring(bar_index) + " duplicate", alert.freq_once_per_bar)
    alert("close " + str.tostring(bar_index), alert.freq_once_per_bar_close)
plot(close)`,
    rule: 'TradingView v6 Alerts: alert.freq_all fires on every alert() call, alert.freq_once_per_bar keeps one event per written call per bar, and alert.freq_once_per_bar_close fires only on confirmed bars. https://www.tradingview.com/pine-script-docs/concepts/alerts/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => bars.map((bar) => bar.close),
    expectedAlerts: (bars) => [
      {
        type: 'alert',
        title: 'alert',
        message: 'all 1',
        values: [true, true],
        frequency: 'all',
        events: [
          { barIndex: 0, time: bars[0]!.time, message: 'all 0', frequency: 'all', isRealtime: false },
          { barIndex: 1, time: bars[1]!.time, message: 'all 1', frequency: 'all', isRealtime: false },
        ],
      },
      {
        type: 'alert',
        title: 'alert',
        message: 'once 1',
        values: [true, true],
        frequency: 'once_per_bar',
        events: [
          { barIndex: 0, time: bars[0]!.time, message: 'once 0', frequency: 'once_per_bar', isRealtime: false },
          { barIndex: 1, time: bars[1]!.time, message: 'once 1', frequency: 'once_per_bar', isRealtime: false },
        ],
      },
      {
        type: 'alert',
        title: 'alert',
        message: 'once 1 duplicate',
        values: [true, true],
        frequency: 'once_per_bar',
        events: [
          { barIndex: 0, time: bars[0]!.time, message: 'once 0 duplicate', frequency: 'once_per_bar', isRealtime: false },
          { barIndex: 1, time: bars[1]!.time, message: 'once 1 duplicate', frequency: 'once_per_bar', isRealtime: false },
        ],
      },
      {
        type: 'alert',
        title: 'alert',
        message: 'close 1',
        values: [true, true],
        frequency: 'once_per_bar_close',
        events: [
          { barIndex: 0, time: bars[0]!.time, message: 'close 0', frequency: 'once_per_bar_close', isRealtime: false },
          { barIndex: 1, time: bars[1]!.time, message: 'close 1', frequency: 'once_per_bar_close', isRealtime: false },
        ],
      },
    ],
    bars: BARS,
  },
  {
    id: 'output.log-format-values',
    namespace: 'log',
    pine: `//@version=6
indicator("log format value vector")
if bar_index == 1
    log.info("close {0} high {1}", close, high)
    log.warning(message="named {0} {1}", close, "warn")
    log.error("literal {0} missing {9}", "err")
plot(close)`,
    rule: 'TradingView v6 Logs: log.info(), log.warning(), and log.error() emit formatted runtime log messages without changing plotted series values. https://www.tradingview.com/pine-script-docs/writing/debugging/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => bars.map((bar) => bar.close),
    expectedLogs: (bars) => [
      { level: 'info', barIndex: 1, time: bars[1]!.time, message: 'close 11 high 12' },
      { level: 'warning', barIndex: 1, time: bars[1]!.time, message: 'named 11 warn' },
      { level: 'error', barIndex: 1, time: bars[1]!.time, message: 'literal err missing NaN' },
    ],
    bars: BARS,
  },
  {
    id: 'drawing.line-getters',
    namespace: 'line',
    pine: `//@version=6
indicator("line getter values", overlay=true)
ln = line.new(bar_index, close, bar_index + 2, close + 10)
plot(line.get_x1(ln))
plot(line.get_x2(ln))
plot(line.get_y1(ln))
plot(line.get_y2(ln))
plot(line.get_price(ln, bar_index + 1))`,
    rule: 'TradingView v6 Lines and boxes: line.new() creates a line object and line.get_* accessors return its coordinates or interpolated price. https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/',
    expected: barIndexes,
    expectedOutputs: (bars) => [
      barIndexes(bars),
      barIndexesPlus(bars, 2),
      bars.map((bar) => bar.close),
      bars.map((bar) => bar.close + 10),
      bars.map((bar) => bar.close + 5),
    ],
    outputMembers: [
      ['line.get_x1'],
      ['line.get_x2'],
      ['line.get_y1'],
      ['line.get_y2'],
      ['line.get_price'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'drawing.line-mutation-copy-values',
    namespace: 'line',
    pine: `//@version=6
indicator("line mutation copy values", overlay=true)
ln = line.new(0, 1.0, 1, 2.0)
line.set_xy1(ln, 2, 3.0)
line.set_xy2(ln, 4, 5.0)
clone = line.copy(ln)
line.set_x1(ln, 6)
line.set_y1(ln, 7.0)
line.set_x2(ln, 8)
line.set_y2(ln, 9.0)
plot(line.get_x1(ln))
plot(line.get_y1(ln))
plot(line.get_x2(ln))
plot(line.get_y2(ln))
plot(line.get_x1(clone))
plot(line.get_y1(clone))
plot(line.get_x2(clone))
plot(line.get_y2(clone))`,
    rule: 'TradingView v6 Lines and boxes: line.set_* mutates line coordinates in place, and line.copy() creates an independent drawing object whose coordinates are not changed by later mutations to the source line. https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/',
    expected: (bars) => constantVector(bars, 6),
    expectedOutputs: (bars) => [
      constantVector(bars, 6),
      constantVector(bars, 7),
      constantVector(bars, 8),
      constantVector(bars, 9),
      constantVector(bars, 2),
      constantVector(bars, 3),
      constantVector(bars, 4),
      constantVector(bars, 5),
    ],
    outputMembers: [
      ['line.get_x1'],
      ['line.get_y1'],
      ['line.get_x2'],
      ['line.get_y2'],
      ['line.get_x1'],
      ['line.get_y1'],
      ['line.get_x2'],
      ['line.get_y2'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'drawing.line-style-payload-values',
    namespace: 'line',
    pine: `//@version=6
indicator("line style payload values", overlay=true)
var line ln = na
if bar_index == 0
    ln := line.new(0, 1.0, 1, 2.0)
    line.set_color(ln, color.rgb(12, 34, 56))
    line.set_extend(ln, extend.right)
    line.set_style(ln, line.style_dotted)
    line.set_width(ln, 4)
plot(array.size(line.all))`,
    rule: 'TradingView v6 Lines and boxes: line.set_* mutates line presentation fields, and line.all returns live line ids. https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 1),
    expectedDrawings: () => [{
      type: 'line',
      barIndex: 0,
      x1: 0,
      y1: 1,
      x2: 1,
      y2: 2,
      color: '#0C2238FF',
      extend: 'right',
      style: 'dotted',
      width: 4,
    }],
    bars: HOSTILE_BARS,
  },
  {
    id: 'drawing.line-style-getter-values',
    namespace: 'line',
    pine: `//@version=6
indicator("line style getter values", overlay=true)
ln = line.new(0, 1.0, 1, 2.0, color=color.rgb(12, 34, 56), extend=extend.right, style=line.style_dotted, width=4)
plot(color.r(line.get_color(ln)))
plot(color.g(line.get_color(ln)))
plot(color.b(line.get_color(ln)))
plot(line.get_extend(ln) == extend.right ? 1 : 0)
plot(line.get_style(ln) == line.style_dotted ? 1 : 0)
plot(line.get_width(ln))`,
    rule: 'TradingView v6 Lines and boxes/reference: line.get_* accessors expose current line presentation fields. https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 12),
    expectedOutputs: (bars) => [
      constantVector(bars, 12),
      constantVector(bars, 34),
      constantVector(bars, 56),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 4),
    ],
    outputMembers: [
      ['color.r'],
      ['color.g'],
      ['color.b'],
      ['line.get_extend'],
      ['line.get_style'],
      ['line.get_width'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'drawing.box-getters',
    namespace: 'box',
    pine: `//@version=6
indicator("box getter values", overlay=true)
bx = box.new(bar_index, high, bar_index + 2, low)
plot(box.get_left(bx))
plot(box.get_right(bx))
plot(box.get_top(bx))
plot(box.get_bottom(bx))`,
    rule: 'TradingView v6 Lines and boxes: box.new() creates a box object and box.get_* accessors return its coordinates. https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/',
    expected: barIndexes,
    expectedOutputs: (bars) => [
      barIndexes(bars),
      barIndexesPlus(bars, 2),
      bars.map((bar) => bar.high),
      bars.map((bar) => bar.low),
    ],
    outputMembers: [
      ['box.get_left'],
      ['box.get_right'],
      ['box.get_top'],
      ['box.get_bottom'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'drawing.box-mutation-copy-values',
    namespace: 'box',
    pine: `//@version=6
indicator("box mutation copy values", overlay=true)
bx = box.new(0, 10.0, 1, 5.0)
box.set_lefttop(bx, 2, 20.0)
box.set_rightbottom(bx, 4, 8.0)
clone = box.copy(bx)
box.set_left(bx, 6)
box.set_top(bx, 30.0)
box.set_right(bx, 7)
box.set_bottom(bx, 9.0)
plot(box.get_left(bx))
plot(box.get_top(bx))
plot(box.get_right(bx))
plot(box.get_bottom(bx))
plot(box.get_left(clone))
plot(box.get_top(clone))
plot(box.get_right(clone))
plot(box.get_bottom(clone))`,
    rule: 'TradingView v6 Lines and boxes: box.set_* mutates box coordinates in place, and box.copy() creates an independent drawing object whose coordinates are not changed by later mutations to the source box. https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/',
    expected: (bars) => constantVector(bars, 6),
    expectedOutputs: (bars) => [
      constantVector(bars, 6),
      constantVector(bars, 30),
      constantVector(bars, 7),
      constantVector(bars, 9),
      constantVector(bars, 2),
      constantVector(bars, 20),
      constantVector(bars, 4),
      constantVector(bars, 8),
    ],
    outputMembers: [
      ['box.get_left'],
      ['box.get_top'],
      ['box.get_right'],
      ['box.get_bottom'],
      ['box.get_left'],
      ['box.get_top'],
      ['box.get_right'],
      ['box.get_bottom'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'drawing.label-getters',
    namespace: 'label',
    pine: `//@version=6
indicator("label getter values", overlay=true)
tag = label.new(bar_index, close, text="entry")
plot(label.get_x(tag))
plot(label.get_y(tag))
plot(label.get_text(tag) == "entry" ? 1 : 0)`,
    rule: 'TradingView v6 Text and shapes: label.new() creates a label object and label.get_* accessors return its coordinates and text. https://www.tradingview.com/pine-script-docs/visuals/text-and-shapes/',
    expected: barIndexes,
    expectedOutputs: (bars) => [
      barIndexes(bars),
      bars.map((bar) => bar.close),
      constantVector(bars, 1),
    ],
    outputMembers: [
      ['label.get_x'],
      ['label.get_y'],
      ['label.get_text'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'drawing.label-mutation-copy-values',
    namespace: 'label',
    pine: `//@version=6
indicator("label mutation copy values", overlay=true)
tag = label.new(0, 1.0, text="seed")
label.set_x(tag, 2)
label.set_y(tag, 3.0)
label.set_text(tag, "live")
clone = label.copy(tag)
label.set_xy(tag, 4, 5.0)
label.set_text(tag, "mutated")
plot(label.get_x(tag))
plot(label.get_y(tag))
plot(label.get_text(tag) == "mutated" ? 1 : 0)
plot(label.get_x(clone))
plot(label.get_y(clone))
plot(label.get_text(clone) == "live" ? 1 : 0)`,
    rule: 'TradingView v6 Text and shapes: label.set_* mutates label fields in place, and label.copy() creates an independent label object whose fields are not changed by later mutations to the source label. https://www.tradingview.com/pine-script-docs/visuals/text-and-shapes/',
    expected: (bars) => constantVector(bars, 4),
    expectedOutputs: (bars) => [
      constantVector(bars, 4),
      constantVector(bars, 5),
      constantVector(bars, 1),
      constantVector(bars, 2),
      constantVector(bars, 3),
      constantVector(bars, 1),
    ],
    outputMembers: [
      ['label.get_x'],
      ['label.get_y'],
      ['label.get_text'],
      ['label.get_x'],
      ['label.get_y'],
      ['label.get_text'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'drawing.label-style-metadata-values',
    namespace: 'label',
    pine: `//@version=6
indicator("label style metadata values", overlay=true)
tag = label.new(0, 1.0, text="seed")
label.set_point(tag, chart.point.from_index(3, 4.0))
label.set_xloc(tag, 5, xloc.bar_index)
label.set_yloc(tag, yloc.price)
label.set_style(tag, label.style_label_up)
label.set_color(tag, color.rgb(10, 20, 30))
label.set_textcolor(tag, color.rgb(40, 50, 60))
label.set_size(tag, size.large)
label.set_tooltip(tag, "tip")
plot(label.get_x(tag))
plot(label.get_y(tag))
plot(label.get_xloc(tag) == xloc.bar_index ? 1 : 0)
plot(label.get_yloc(tag) == yloc.price ? 1 : 0)
plot(label.get_style(tag) == label.style_label_up ? 1 : 0)
plot(color.r(label.get_color(tag)))
plot(color.g(label.get_color(tag)))
plot(color.b(label.get_color(tag)))
plot(color.r(label.get_textcolor(tag)))
plot(color.g(label.get_textcolor(tag)))
plot(color.b(label.get_textcolor(tag)))
plot(label.get_size(tag) == size.large ? 1 : 0)
plot(label.get_tooltip(tag) == "tip" ? 1 : 0)`,
    rule: 'TradingView v6 Text and shapes: label.set_* mutates label coordinates and presentation fields, and label.get_* accessors return the current label field values. https://www.tradingview.com/pine-script-docs/visuals/text-and-shapes/',
    expected: (bars) => constantVector(bars, 5),
    expectedOutputs: (bars) => [
      constantVector(bars, 5),
      constantVector(bars, 4),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 10),
      constantVector(bars, 20),
      constantVector(bars, 30),
      constantVector(bars, 40),
      constantVector(bars, 50),
      constantVector(bars, 60),
      constantVector(bars, 1),
      constantVector(bars, 1),
    ],
    outputMembers: [
      ['label.get_x'],
      ['label.get_y'],
      ['label.get_xloc'],
      ['label.get_yloc'],
      ['label.get_style'],
      ['color.r'],
      ['color.g'],
      ['color.b'],
      ['color.r'],
      ['color.g'],
      ['color.b'],
      ['label.get_size'],
      ['label.get_tooltip'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'drawing.linefill-getters',
    namespace: 'linefill',
    pine: `//@version=6
indicator("linefill getter values", overlay=true)
upper = line.new(bar_index, high, bar_index + 1, high + 1)
lower = line.new(bar_index, low, bar_index + 1, low - 1)
fill = linefill.new(upper, lower, color.blue)
plot(linefill.get_line1(fill) == upper ? 1 : 0)
plot(linefill.get_line2(fill) == lower ? 1 : 0)`,
    rule: 'TradingView v6 Fills: linefill.new() links two line objects, and linefill.get_line1()/get_line2() return those handles. https://www.tradingview.com/pine-script-docs/visuals/fills/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => [
      constantVector(bars, 1),
      constantVector(bars, 1),
    ],
    outputMembers: [
      ['linefill.get_line1'],
      ['linefill.get_line2'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'property.single.line.copy',
    namespace: 'line',
    pine: `//@version=6
indicator("line copy handle shape", overlay=true)
source = line.new(0, 1.0, 1, 2.0)
clone = line.copy(source)
plot(line.get_x1(clone) == 0 and line.get_y2(clone) == 2.0 ? 1 : 0)`,
    officialMembers: ['line.copy'],
    outputMembers: [['line.copy']],
    rule: 'TradingView v6 Lines and boxes: line.copy(id) returns a copied line object whose fields match the source line. https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/ https://www.tradingview.com/pine-script-reference/v6/#fun_line.copy',
    expected: (bars) => constantVector(bars, 1),
    bars: HOSTILE_BARS,
  },
  {
    id: 'property.single.box.copy',
    namespace: 'box',
    pine: `//@version=6
indicator("box copy handle shape", overlay=true)
source = box.new(0, 10.0, 1, 5.0)
clone = box.copy(source)
plot(box.get_left(clone) == 0 and box.get_bottom(clone) == 5.0 ? 1 : 0)`,
    officialMembers: ['box.copy'],
    outputMembers: [['box.copy']],
    rule: 'TradingView v6 Lines and boxes: box.copy(id) returns a copied box object whose fields match the source box. https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/ https://www.tradingview.com/pine-script-reference/v6/#fun_box.copy',
    expected: (bars) => constantVector(bars, 1),
    bars: HOSTILE_BARS,
  },
  {
    id: 'property.single.label.copy',
    namespace: 'label',
    pine: `//@version=6
indicator("label copy handle shape", overlay=true)
source = label.new(0, 1.0, text="seed")
clone = label.copy(source)
plot(label.get_x(clone) == 0 and label.get_text(clone) == "seed" ? 1 : 0)`,
    officialMembers: ['label.copy'],
    outputMembers: [['label.copy']],
    rule: 'TradingView v6 Text and shapes: label.copy(id) returns a copied label object whose fields match the source label. https://www.tradingview.com/pine-script-docs/visuals/text-and-shapes/ https://www.tradingview.com/pine-script-reference/v6/#fun_label.copy',
    expected: (bars) => constantVector(bars, 1),
    bars: HOSTILE_BARS,
  },
  {
    id: 'property.single.chart.point.from_index',
    namespace: 'chart.point',
    pine: `//@version=6
indicator("chart point from index handle shape", overlay=true)
point = chart.point.from_index(bar_index, close)
plot(point.index == bar_index and point.price == close ? 1 : 0)`,
    officialMembers: ['chart.point.from_index'],
    outputMembers: [['chart.point.from_index']],
    rule: 'TradingView v6 Lines and boxes: chart.point.from_index(index, price) returns a chart point with an index and price. https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/ https://www.tradingview.com/pine-script-reference/v6/#fun_chart.point.from_index',
    expected: (bars) => constantVector(bars, 1),
    bars: HOSTILE_BARS,
  },
  {
    id: 'property.single.chart.point.from_time',
    namespace: 'chart.point',
    pine: `//@version=6
indicator("chart point from time handle shape", overlay=true)
point = chart.point.from_time(time, close)
plot(point.time == time and point.price == close ? 1 : 0)`,
    officialMembers: ['chart.point.from_time'],
    outputMembers: [['chart.point.from_time']],
    rule: 'TradingView v6 Lines and boxes: chart.point.from_time(time, price) returns a chart point with a time and price. https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/ https://www.tradingview.com/pine-script-reference/v6/#fun_chart.point.from_time',
    expected: (bars) => constantVector(bars, 1),
    bars: HOSTILE_BARS,
  },
  {
    id: 'property.single.chart.point.new',
    namespace: 'chart.point',
    pine: `//@version=6
indicator("chart point new handle shape", overlay=true)
point = chart.point.new(time, bar_index, close)
plot(point.time == time and point.index == bar_index and point.price == close ? 1 : 0)`,
    officialMembers: ['chart.point.new'],
    outputMembers: [['chart.point.new']],
    rule: 'TradingView v6 Lines and boxes: chart.point.new(time, index, price) returns a chart point with the supplied fields. https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/ https://www.tradingview.com/pine-script-reference/v6/#fun_chart.point.new',
    expected: (bars) => constantVector(bars, 1),
    bars: HOSTILE_BARS,
  },
  {
    id: 'property.single.chart.point.now',
    namespace: 'chart.point',
    pine: `//@version=6
indicator("chart point now handle shape", overlay=true)
point = chart.point.now(close)
plot(point.index == bar_index and point.time == time and point.price == close ? 1 : 0)`,
    officialMembers: ['chart.point.now'],
    outputMembers: [['chart.point.now']],
    rule: 'TradingView v6 Lines and boxes: chart.point.now(price) returns a chart point at the current bar time/index and supplied price. https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/ https://www.tradingview.com/pine-script-reference/v6/#fun_chart.point.now',
    expected: (bars) => constantVector(bars, 1),
    bars: HOSTILE_BARS,
  },
  {
    id: 'property.single.chart.point.copy',
    namespace: 'chart.point',
    pine: `//@version=6
indicator("chart point copy handle shape", overlay=true)
source = chart.point.new(time, bar_index, close)
copy = chart.point.copy(source)
plot(copy.time == time and copy.index == bar_index and copy.price == close ? 1 : 0)`,
    officialMembers: ['chart.point.copy'],
    outputMembers: [['chart.point.copy']],
    rule: 'TradingView v6 Lines and boxes: chart.point.copy(point) returns a copied chart point with the source point fields. https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/ https://www.tradingview.com/pine-script-reference/v6/#fun_chart.point.copy',
    expected: (bars) => constantVector(bars, 1),
    bars: HOSTILE_BARS,
  },
  {
    id: 'drawing.linefill-color-copy-values',
    namespace: 'linefill',
    pine: `//@version=6
indicator("linefill color copy values", overlay=true)
upper = line.new(0, 10.0, 1, 11.0)
lower = line.new(0, 5.0, 1, 4.0)
fill = linefill.new(upper, lower, color.rgb(1, 2, 3))
linefill.set_color(fill, color.rgb(10, 20, 30))
clone = linefill.copy(fill)
linefill.set_color(fill, color.rgb(40, 50, 60))
plot(linefill.get_line1(fill) == upper ? 1 : 0)
plot(linefill.get_line2(fill) == lower ? 1 : 0)
plot(color.r(linefill.get_color(fill)))
plot(color.g(linefill.get_color(fill)))
plot(color.b(linefill.get_color(fill)))
plot(linefill.get_line1(clone) == upper ? 1 : 0)
plot(linefill.get_line2(clone) == lower ? 1 : 0)
plot(color.r(linefill.get_color(clone)))
plot(color.g(linefill.get_color(clone)))
plot(color.b(linefill.get_color(clone)))`,
    rule: 'TradingView v6 Fills: linefill.set_color() changes a linefill color, linefill.get_* accessors return the current fields, and linefill.copy() creates an independent linefill object copied from the source. https://www.tradingview.com/pine-script-docs/visuals/fills/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => [
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 40),
      constantVector(bars, 50),
      constantVector(bars, 60),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 10),
      constantVector(bars, 20),
      constantVector(bars, 30),
    ],
    outputMembers: [
      ['linefill.get_line1'],
      ['linefill.get_line2'],
      ['color.r'],
      ['color.g'],
      ['color.b'],
      ['linefill.get_line1'],
      ['linefill.get_line2'],
      ['color.r'],
      ['color.g'],
      ['color.b'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'drawing.delete-all-values',
    namespace: 'drawing',
    pine: `//@version=6
indicator("drawing delete all values", overlay=true, max_lines_count=10, max_labels_count=10, max_boxes_count=10)
var line keepLine = na
var line dropLine = na
var label keepLabel = na
var label dropLabel = na
var box keepBox = na
var box dropBox = na
var linefill keepFill = na
var linefill dropFill = na
if bar_index == 0
    keepLine := line.new(0, 1.0, 1, 2.0)
    dropLine := line.new(0, 2.0, 1, 3.0)
    keepLabel := label.new(0, 1.0, text="keep")
    dropLabel := label.new(0, 2.0, text="drop")
    keepBox := box.new(0, 3.0, 1, 1.0)
    dropBox := box.new(0, 4.0, 1, 2.0)
    keepFill := linefill.new(keepLine, dropLine, color.rgb(1, 2, 3))
    dropFill := linefill.copy(keepFill)
    label.delete(dropLabel)
    box.delete(dropBox)
    linefill.delete(dropFill)
    line.delete(dropLine)
plot(array.size(line.all))
plot(array.size(label.all))
plot(array.size(box.all))
plot(array.size(linefill.all))`,
    rule: 'TradingView v6 Drawing objects: the *.all arrays contain live drawing ids of that object type, and *.delete removes a drawing object so it no longer appears in the corresponding all array. https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/ https://www.tradingview.com/pine-script-docs/visuals/text-and-shapes/ https://www.tradingview.com/pine-script-docs/visuals/fills/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => [
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
    ],
    outputMembers: [
      ['line.all'],
      ['label.all'],
      ['box.all'],
      ['linefill.all'],
    ],
    expectedDrawings: () => [
      { type: 'line', barIndex: 0, x1: 0, y1: 1, x2: 1, y2: 2 },
      { type: 'label', barIndex: 0, x: 0, y: 1, text: 'keep' },
      { type: 'box', barIndex: 0, left: 0, top: 3, right: 1, bottom: 1 },
      { type: 'linefill', barIndex: 0, color: '#010203FF' },
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'drawing.box-style-text-values',
    namespace: 'box',
    pine: `//@version=6
indicator("box style text values", overlay=true)
zone = box.new(0, 10.0, 1, 5.0)
box.set_bgcolor(zone, color.rgb(10, 20, 30))
box.set_border_color(zone, color.rgb(40, 50, 60))
box.set_text(zone, "zone")
box.set_text_halign(zone, text.align_right)
box.set_text_valign(zone, text.align_bottom)
plot(color.r(box.get_bgcolor(zone)))
plot(color.g(box.get_bgcolor(zone)))
plot(color.b(box.get_bgcolor(zone)))
plot(color.r(box.get_border_color(zone)))
plot(color.g(box.get_border_color(zone)))
plot(color.b(box.get_border_color(zone)))
plot(box.get_text(zone) == "zone" ? 1 : 0)
plot(box.get_text_halign(zone) == text.align_right ? 1 : 0)
plot(box.get_text_valign(zone) == text.align_bottom ? 1 : 0)`,
    rule: 'TradingView v6 Lines and boxes: box.set_* mutates box presentation and text fields, and box.get_* accessors return the current box field values. https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => [
      constantVector(bars, 10),
      constantVector(bars, 20),
      constantVector(bars, 30),
      constantVector(bars, 40),
      constantVector(bars, 50),
      constantVector(bars, 60),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
    ],
    outputMembers: [
      ['color.r'],
      ['color.g'],
      ['color.b'],
      ['color.r'],
      ['color.g'],
      ['color.b'],
      ['box.get_text'],
      ['box.get_text_halign'],
      ['box.get_text_valign'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'drawing.table-payload-values',
    namespace: 'table',
    pine: `//@version=6
indicator("table payload values", overlay=true)
var table dashboard = table.new(position.top_right, 2, 2, bgcolor=color.rgb(1, 2, 3), frame_color=color.rgb(4, 5, 6), frame_width=2, border_color=color.rgb(7, 8, 9), border_width=1)
var table deleted = table.new(position.bottom_left, 1, 1)
if bar_index == 0
    table.delete(deleted)
if barstate.islast
    table.set_position(dashboard, position.middle_center)
    table.set_bgcolor(dashboard, color.rgb(10, 20, 30))
    table.set_frame_color(dashboard, color.rgb(40, 50, 60))
    table.set_frame_width(dashboard, 3)
    table.set_border_color(dashboard, color.rgb(70, 80, 90))
    table.set_border_width(dashboard, 4)
    table.cell(dashboard, 0, 0, "A", width=12, height=34, text_color=color.rgb(100, 110, 120), text_halign=text.align_right, text_valign=text.align_bottom, text_size=size.large, bgcolor=color.rgb(130, 140, 150), tooltip="tip")
    table.cell(dashboard, 1, 1, "B")
    table.cell_set_text(dashboard, 1, 1, "C")
    table.cell_set_bgcolor(dashboard, 1, 1, color.rgb(160, 170, 180))
    table.cell_set_text_color(dashboard, 1, 1, color.rgb(190, 200, 210))
    table.merge_cells(dashboard, 0, 0, 1, 0)
plot(array.size(table.all))`,
    rule: 'TradingView v6 Tables: table.new() creates a persistent table object, table.set_* and table.cell_set_* mutate table/cell fields, table.merge_cells() records a merged cell range, and table.delete() removes a table from table.all. https://www.tradingview.com/pine-script-docs/visuals/tables/',
    expected: (bars) => constantVector(bars, 1),
    outputMembers: [['table.all']],
    expectedDrawings: () => [{
      type: 'table',
      barIndex: 0,
      position: 'middle_center',
      columns: 2,
      rows: 2,
      bgcolor: '#0A141EFF',
      frameColor: '#28323CFF',
      frameWidth: 3,
      borderColor: '#46505AFF',
      borderWidth: 4,
      cells: [
        {
          column: 0,
          row: 0,
          text: 'A',
          width: 12,
          height: 34,
          textColor: '#646E78FF',
          textHalign: 'right',
          textValign: 'bottom',
          textSize: 'large',
          bgcolor: '#828C96FF',
          tooltip: 'tip',
        },
        {
          column: 1,
          row: 1,
          text: 'C',
          textColor: '#BEC8D2FF',
          bgcolor: '#A0AAB4FF',
        },
      ],
      mergedCells: [
        { startColumn: 0, startRow: 0, endColumn: 1, endRow: 0 },
      ],
    }],
    bars: HOSTILE_BARS,
  },
  {
    id: 'drawing.table-cell-setter-clear-values',
    namespace: 'table',
    pine: `//@version=6
indicator("table cell setter clear values", overlay=true)
var table dashboard = table.new(position.top_right, 2, 2)
if barstate.islast
    table.cell(dashboard, 0, 0, "cleared")
    table.cell(dashboard, 1, 1, "seed")
    table.cell_set_width(dashboard, 1, 1, 21)
    table.cell_set_height(dashboard, 1, 1, 34)
    table.cell_set_text_halign(dashboard, 1, 1, text.align_left)
    table.cell_set_text_valign(dashboard, 1, 1, text.align_top)
    table.cell_set_text_size(dashboard, 1, 1, size.small)
    table.cell_set_text_font_family(dashboard, 1, 1, font.family_monospace)
    table.cell_set_text_formatting(dashboard, 1, 1, text.format_bold)
    table.cell_set_tooltip(dashboard, 1, 1, "cell tip")
    table.clear(dashboard, 0, 0, 0, 0)
plot(array.size(table.all))`,
    rule: 'TradingView v6 Tables: table.cell_set_* functions mutate an existing cell, and table.clear() removes cells in the supplied inclusive column/row range without deleting the table. https://www.tradingview.com/pine-script-docs/visuals/tables/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 1),
    outputMembers: [['table.all']],
    expectedDrawings: () => [{
      type: 'table',
      barIndex: 0,
      position: 'top_right',
      columns: 2,
      rows: 2,
      cells: [
        {
          column: 1,
          row: 1,
          text: 'seed',
          width: 21,
          height: 34,
          textHalign: 'left',
          textValign: 'top',
          textSize: 'small',
          textFontFamily: 'monospace',
          textFormatting: 'bold',
          tooltip: 'cell tip',
        },
      ],
    }],
    bars: HOSTILE_BARS,
  },
  {
    id: 'priority.drawing-table-metadata-values',
    namespace: 'visual',
    pine: `//@version=6
indicator("priority drawing table metadata values", overlay=true)
var line trend = line.new(0, 1.0, 1, 2.0, force_overlay=true)
var box zone = box.new(0, 5.0, 1, 1.0, text="B", text_font_family=font.family_monospace, force_overlay=true, text_formatting=text.format_bold)
var label tag = label.new(0, 3.0, text="L", force_overlay=true, text_formatting=text.format_italic)
var table panel = table.new(position.top_left, 1, 1, force_overlay=true)
if barstate.islast
    table.cell(panel, 0, 0, "T", text_font_family=font.family_monospace, text_formatting=text.format_bold)
plot(array.size(line.all) + array.size(box.all) + array.size(label.all) + array.size(table.all))`,
    officialMembers: ['line.new', 'box.new', 'label.new', 'table.new', 'table.cell', 'array.size'],
    outputMembers: [['line.new', 'box.new', 'label.new', 'table.new', 'table.cell', 'array.size']],
    rule: 'TradingView v6 Lines, boxes, labels, and tables: drawing constructors and table.cell() preserve force_overlay, text_font_family, and text_formatting metadata on their drawing payloads without changing drawing counts. https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/ https://www.tradingview.com/pine-script-docs/visuals/text-and-shapes/ https://www.tradingview.com/pine-script-docs/visuals/tables/',
    expected: (bars) => constantVector(bars, 4),
    expectedDrawings: () => [
      { type: 'line', x1: 0, y1: 1, x2: 1, y2: 2, forceOverlay: true },
      {
        type: 'box',
        left: 0,
        top: 5,
        right: 1,
        bottom: 1,
        text: 'B',
        textFontFamily: 'monospace',
        textFormatting: 'bold',
        forceOverlay: true,
      },
      { type: 'label', x: 0, y: 3, text: 'L', textFormatting: 'italic', forceOverlay: true },
      {
        type: 'table',
        position: 'top_left',
        columns: 1,
        rows: 1,
        forceOverlay: true,
        cells: [{ column: 0, row: 0, text: 'T', textFontFamily: 'monospace', textFormatting: 'bold' }],
      },
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'drawing.polyline-payload-values',
    namespace: 'polyline',
    pine: `//@version=6
indicator("polyline payload values", overlay=true, max_polylines_count=2)
var polyline path = na
var polyline deleted = na
if bar_index == 0
    points = array.from(chart.point.from_index(0, 1.0), chart.point.from_index(1, 2.0), chart.point.from_index(2, 1.5))
    path := polyline.new(points, curved=true, closed=true, xloc=xloc.bar_index, line_color=color.rgb(10, 20, 30), fill_color=color.rgb(40, 50, 60), line_style=line.style_dashed, line_width=3, force_overlay=true)
    deleted := polyline.copy(path)
    polyline.delete(deleted)
plot(array.size(polyline.all))`,
    rule: 'TradingView v6 Lines and boxes: polyline.new() stores a point array and presentation fields, polyline.copy() creates a separate object, and polyline.delete() removes a polyline from polyline.all. https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/',
    expected: (bars) => constantVector(bars, 1),
    outputMembers: [['polyline.all']],
    expectedDrawings: () => [{
      type: 'polyline',
      barIndex: 0,
      points: [
        { type: 'chart.point', time: null, index: 0, price: 1 },
        { type: 'chart.point', time: null, index: 1, price: 2 },
        { type: 'chart.point', time: null, index: 2, price: 1.5 },
      ],
      curved: true,
      closed: true,
      xloc: 'bar_index',
      lineColor: '#0A141EFF',
      fillColor: '#28323CFF',
      lineStyle: 'dashed',
      lineWidth: 3,
      forceOverlay: true,
    }],
    bars: HOSTILE_BARS,
  },
  {
    id: 'drawing.chart-point-values',
    namespace: 'chart.point',
    pine: `//@version=6
indicator("chart point values", overlay=true)
point = chart.point.from_index(bar_index, close)
copy = point.copy()
plot(point.index)
plot(point.price)
plot(copy.index)
plot(copy.price)`,
    rule: 'TradingView v6 Lines and boxes: chart.point.from_index() creates a point with an index and price, and copy() creates a point with the same field values. https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/',
    expected: barIndexes,
    expectedOutputs: (bars) => [
      barIndexes(bars),
      bars.map((bar) => bar.close),
      barIndexes(bars),
      bars.map((bar) => bar.close),
    ],
    outputMembers: [
      ['chart.point.from_index'],
      ['chart.point.from_index'],
      ['chart.point.copy'],
      ['chart.point.copy'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'drawing.chart-point-constructor-values',
    namespace: 'chart.point',
    pine: `//@version=6
indicator("chart point constructor values", overlay=true)
fromTime = chart.point.from_time(time, close + 1)
explicit = chart.point.new(time, bar_index, close + 2)
nowPoint = chart.point.now(close + 3)
copy = chart.point.copy(explicit)
plot(fromTime.time == time ? 1 : 0)
plot(fromTime.price)
plot(explicit.time == time ? 1 : 0)
plot(explicit.index)
plot(explicit.price)
plot(nowPoint.time == time ? 1 : 0)
plot(nowPoint.index)
plot(nowPoint.price)
plot(copy.time == time ? 1 : 0)
plot(copy.index)
plot(copy.price)`,
    rule: 'TradingView v6 Lines and boxes: chart.point.from_time(), chart.point.new(), chart.point.now(), and chart.point.copy() create point objects with documented time/index/price fields without mutating the source point. https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => [
      constantVector(bars, 1),
      bars.map((bar) => bar.close + 1),
      constantVector(bars, 1),
      barIndexes(bars),
      bars.map((bar) => bar.close + 2),
      constantVector(bars, 1),
      barIndexes(bars),
      bars.map((bar) => bar.close + 3),
      constantVector(bars, 1),
      barIndexes(bars),
      bars.map((bar) => bar.close + 2),
    ],
    outputMembers: [
      ['chart.point.from_time'],
      ['chart.point.from_time'],
      ['chart.point.new'],
      ['chart.point.new'],
      ['chart.point.new'],
      ['chart.point.now'],
      ['chart.point.now'],
      ['chart.point.now'],
      ['chart.point.copy'],
      ['chart.point.copy'],
      ['chart.point.copy'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'drawing.line-point-style-values',
    namespace: 'line',
    pine: `//@version=6
indicator("line point style values", overlay=true)
var line ln = na
if bar_index == 0
    firstPoint = chart.point.from_index(1, 10.0)
    secondPoint = chart.point.from_index(2, 20.0)
    ln := line.new(firstPoint, secondPoint, style=line.style_arrow_left)
    line.set_first_point(ln, chart.point.from_index(3, 30.0))
    line.set_second_point(ln, chart.point.from_index(4, 40.0))
    line.set_style(ln, line.style_arrow_right)
    line.set_style(ln, line.style_arrow_both)
    line.set_style(ln, line.style_solid)
    line.set_xloc(ln, time, time + 60000, xloc.bar_time)
plot(array.size(line.all))`,
    rule: 'TradingView v6 Lines and boxes: line.new() and line.set_first_point()/set_second_point()/set_xloc()/set_style() update a line object in place; line style constants select the stored line style. https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 1),
    expectedDrawings: (bars) => [{
      type: 'line',
      barIndex: 0,
      x1: bars[0]!.time,
      y1: 30,
      x2: bars[0]!.time + 60000,
      y2: 40,
      xloc: 'bar_time',
      style: 'solid',
    }],
    bars: HOSTILE_BARS,
  },
  {
    id: 'drawing.box-point-style-values',
    namespace: 'box',
    pine: `//@version=6
indicator("box point style values", overlay=true)
var box zone = na
if bar_index == 0
    zone := box.new(chart.point.from_index(1, 10.0), chart.point.from_index(2, 5.0), border_width=1, border_style=line.style_dotted)
    box.set_top_left_point(zone, chart.point.from_index(3, 30.0))
    box.set_bottom_right_point(zone, chart.point.from_index(4, 8.0))
    box.set_xloc(zone, time, time + 60000, xloc.bar_time)
    box.set_extend(zone, extend.right)
    box.set_border_style(zone, line.style_dashed)
    box.set_border_width(zone, 4)
    box.set_text_color(zone, color.rgb(10, 20, 30))
    box.set_text_size(zone, size.huge)
    box.set_text_wrap(zone, text.wrap_auto)
    box.set_text_font_family(zone, font.family_monospace)
    box.set_text_formatting(zone, text.format_bold)
plot(array.size(box.all))`,
    rule: 'TradingView v6 Lines and boxes: box point overloads and box.set_* presentation functions update box coordinates, xloc, extend, border, and text fields on the drawing object. https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 1),
    expectedDrawings: (bars) => [{
      type: 'box',
      barIndex: 0,
      left: bars[0]!.time,
      top: 30,
      right: bars[0]!.time + 60000,
      bottom: 8,
      xloc: 'bar_time',
      extend: 'right',
      borderStyle: 'dashed',
      borderWidth: 4,
      textColor: '#0A141EFF',
      textSize: 'huge',
      textWrap: 'auto',
      textFontFamily: 'monospace',
      textFormatting: 'bold',
    }],
    bars: HOSTILE_BARS,
  },
  {
    id: 'drawing.named-point-overload-values',
    namespace: 'drawing',
    pine: `//@version=6
indicator("named point overload values", overlay=true)
var line ln = na
var box bx = na
var label tag = na
if bar_index == 0
    first = chart.point.from_index(1, 10.0)
    second = chart.point.from_index(2, 20.0)
    ln := line.new(first_point=first, second_point=second, color=color.rgb(1, 2, 3))
    bx := box.new(top_left=first, bottom_right=second, border_color=color.rgb(4, 5, 6))
    tag := label.new(point=first, text="P", color=color.rgb(7, 8, 9))
plot(line.get_x1(ln))
plot(box.get_left(bx))
plot(label.get_x(tag))`,
    rule: 'TradingView v6 Lines and boxes/text-and-shapes: line.new(first_point, second_point), box.new(top_left, bottom_right), and label.new(point, ...) are distinct chart.point constructor overloads. Named point parameters must select the point overload rather than the coordinate overload. https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/ https://www.tradingview.com/pine-script-docs/visuals/text-and-shapes/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => [
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
    ],
    expectedDrawings: () => [
      { type: 'line', x1: 1, y1: 10, x2: 2, y2: 20, color: '#010203FF' },
      { type: 'box', left: 1, top: 10, right: 2, bottom: 20, borderColor: '#040506FF' },
      { type: 'label', x: 1, y: 10, text: 'P', color: '#070809FF' },
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'drawing.named-coordinate-overload-values',
    namespace: 'drawing',
    pine: `//@version=6
indicator("named coordinate overload values", overlay=true)
var line ln = na
var box bx = na
var label tag = na
if bar_index == 0
    ln := line.new(x1=3, y1=30.0, x2=4, y2=40.0, color=color.rgb(11, 12, 13))
    bx := box.new(left=5, top=50.0, right=6, bottom=60.0, border_color=color.rgb(14, 15, 16))
    tag := label.new(x=7, y=70.0, text="C", color=color.rgb(17, 18, 19))
plot(line.get_x1(ln))
plot(box.get_left(bx))
plot(label.get_x(tag))`,
    rule: 'TradingView v6 Lines and boxes/text-and-shapes: line.new(x1, y1, x2, y2), box.new(left, top, right, bottom), and label.new(x, y, ...) are coordinate constructor overloads distinct from chart.point overloads. Named coordinate parameters must select the coordinate overload. https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/ https://www.tradingview.com/pine-script-docs/visuals/text-and-shapes/',
    expected: (bars) => constantVector(bars, 3),
    expectedOutputs: (bars) => [
      constantVector(bars, 3),
      constantVector(bars, 5),
      constantVector(bars, 7),
    ],
    expectedDrawings: () => [
      { type: 'line', x1: 3, y1: 30, x2: 4, y2: 40, color: '#0B0C0DFF' },
      { type: 'box', left: 5, top: 50, right: 6, bottom: 60, borderColor: '#0E0F10FF' },
      { type: 'label', x: 7, y: 70, text: 'C', color: '#111213FF' },
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'drawing.label-style-constant-values',
    namespace: 'label',
    pine: `//@version=6
indicator("label style constant values", overlay=true)
plot(label.style_arrowdown == "arrowdown" ? 1 : 0)
plot(label.style_arrowup == "arrowup" ? 1 : 0)
plot(label.style_circle == "circle" ? 1 : 0)
plot(label.style_cross == "cross" ? 1 : 0)
plot(label.style_diamond == "diamond" ? 1 : 0)
plot(label.style_flag == "flag" ? 1 : 0)
plot(label.style_label_center == "label_center" ? 1 : 0)
plot(label.style_label_down == "label_down" ? 1 : 0)
plot(label.style_label_left == "label_left" ? 1 : 0)
plot(label.style_label_lower_left == "label_lower_left" ? 1 : 0)
plot(label.style_label_lower_right == "label_lower_right" ? 1 : 0)
plot(label.style_label_right == "label_right" ? 1 : 0)
plot(label.style_label_up == "label_up" ? 1 : 0)
plot(label.style_label_upper_left == "label_upper_left" ? 1 : 0)
plot(label.style_label_upper_right == "label_upper_right" ? 1 : 0)
plot(label.style_none == "none" ? 1 : 0)
plot(label.style_square == "square" ? 1 : 0)
plot(label.style_text_outline == "text_outline" ? 1 : 0)
plot(label.style_triangledown == "triangledown" ? 1 : 0)
plot(label.style_triangleup == "triangleup" ? 1 : 0)
plot(label.style_xcross == "xcross" ? 1 : 0)`,
    rule: 'TradingView v6 Text and shapes/reference: label.style_* constants are string style identifiers consumed by label.new() and label.set_style(). https://www.tradingview.com/pine-script-docs/visuals/text-and-shapes/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => Array.from({ length: 21 }, () => constantVector(bars, 1)),
    outputMembers: [
      ['label.style_arrowdown'],
      ['label.style_arrowup'],
      ['label.style_circle'],
      ['label.style_cross'],
      ['label.style_diamond'],
      ['label.style_flag'],
      ['label.style_label_center'],
      ['label.style_label_down'],
      ['label.style_label_left'],
      ['label.style_label_lower_left'],
      ['label.style_label_lower_right'],
      ['label.style_label_right'],
      ['label.style_label_up'],
      ['label.style_label_upper_left'],
      ['label.style_label_upper_right'],
      ['label.style_none'],
      ['label.style_square'],
      ['label.style_text_outline'],
      ['label.style_triangledown'],
      ['label.style_triangleup'],
      ['label.style_xcross'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'drawing.label-text-style-values',
    namespace: 'label',
    pine: `//@version=6
indicator("label text style values", overlay=true)
var label tag = na
if bar_index == 0
    tag := label.new(0, 1.0, text="text")
    label.set_textalign(tag, text.align_right)
    label.set_text_font_family(tag, font.family_monospace)
    label.set_text_formatting(tag, text.format_bold)
    label.set_style(tag, label.style_arrowup)
plot(array.size(label.all))`,
    rule: 'TradingView v6 Text and shapes: label.set_textalign(), set_text_font_family(), set_text_formatting(), and set_style() update visible label presentation fields without changing its coordinates. https://www.tradingview.com/pine-script-docs/visuals/text-and-shapes/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 1),
    expectedDrawings: () => [{
      type: 'label',
      barIndex: 0,
      x: 0,
      y: 1,
      text: 'text',
      textAlign: 'right',
      textFontFamily: 'monospace',
      textFormatting: 'bold',
      style: 'arrowup',
    }],
    bars: HOSTILE_BARS,
  },
  {
    id: 'optional.visual-high-use-drawing-arguments',
    namespace: 'visual',
    pine: `//@version=6
indicator("high-use drawing optional arguments", overlay=false)
if bar_index == 0
    line.new(x1=time, y1=1.0, x2=time + 60000, y2=2.0, xloc=xloc.bar_time)
    box.new(left=time, top=3.0, right=time + 60000, bottom=1.0, xloc=xloc.bar_time, bgcolor=color.rgb(10, 20, 30), text="box", text_color=color.rgb(40, 50, 60), text_halign=text.align_right, text_valign=text.align_bottom)
    label.new(x=time, y=4.0, text="label", xloc=xloc.bar_time, style=label.style_label_down, textcolor=color.rgb(70, 80, 90), textalign=text.align_center, tooltip="tip", force_overlay=true)
plot(array.size(line.all))
plot(array.size(box.all))
plot(array.size(label.all))`,
    officialMembers: ['line.new', 'box.new', 'label.new'],
    rule: 'TradingView v6 Lines and boxes/text-and-shapes: drawing constructor optional arguments set x-coordinate interpretation, text/color/alignment metadata, label style/tooltips, and force_overlay routes the drawing to the main pane from a non-overlay script. https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/ https://www.tradingview.com/pine-script-docs/visuals/text-and-shapes/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => [
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
    ],
    expectedDrawings: (bars) => [
      {
        type: 'line',
        barIndex: 0,
        x1: bars[0]!.time,
        y1: 1,
        x2: bars[0]!.time + 60000,
        y2: 2,
        xloc: 'bar_time',
      },
      {
        type: 'box',
        barIndex: 0,
        left: bars[0]!.time,
        top: 3,
        right: bars[0]!.time + 60000,
        bottom: 1,
        xloc: 'bar_time',
        bgcolor: '#0A141EFF',
        text: 'box',
        textColor: '#28323CFF',
        textHalign: 'right',
        textValign: 'bottom',
      },
      {
        type: 'label',
        barIndex: 0,
        x: bars[0]!.time,
        y: 4,
        text: 'label',
        xloc: 'bar_time',
        style: 'label_down',
        textColor: '#46505AFF',
        textAlign: 'center',
        tooltip: 'tip',
        forceOverlay: true,
      },
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'priority.label-new-high-use-arguments',
    namespace: 'label',
    pine: `//@version=6
indicator("priority label new high use arguments", overlay=false)
if bar_index == 0
    label.new(x=time, y=close, text="signal", xloc=xloc.bar_time, yloc=yloc.price, color=color.rgb(10, 20, 30), style=label.style_label_down, textcolor=color.rgb(40, 50, 60), size=size.small, textalign=text.align_center, tooltip="tip", force_overlay=true, text_font_family=font.family_monospace, text_formatting=text.format_bold)
plot(array.size(label.all))`,
    officialMembers: ['label.new', 'array.size'],
    outputMembers: [['label.new'], ['array.size']],
    rule: 'TradingView v6 Text and shapes/reference: label.new() creates a label at the supplied coordinate and its optional style, text color, xloc, alignment, tooltip, force_overlay, font family, and text formatting arguments are drawing payload metadata without changing label count. https://www.tradingview.com/pine-script-docs/visuals/text-and-shapes/ https://www.tradingview.com/pine-script-reference/v6/#fun_label.new',
    expected: (bars) => constantVector(bars, 1),
    expectedDrawings: (bars) => [
      {
        type: 'label',
        barIndex: 0,
        x: bars[0]!.time,
        y: bars[0]!.close,
        text: 'signal',
        xloc: 'bar_time',
        yloc: 'price',
        color: '#0A141EFF',
        style: 'label_down',
        textColor: '#28323CFF',
        size: 'small',
        textAlign: 'center',
        tooltip: 'tip',
        forceOverlay: true,
        textFontFamily: 'monospace',
        textFormatting: 'bold',
      },
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'priority.box-new-high-use-arguments',
    namespace: 'box',
    pine: `//@version=6
indicator("priority box new high use arguments", overlay=false)
if bar_index == 0
    box.new(left=time, top=high, right=time + 60000, bottom=low, xloc=xloc.bar_time, bgcolor=color.rgb(10, 20, 30), border_color=color.rgb(40, 50, 60), border_width=2, border_style=line.style_dashed, extend=extend.right, text="zone", text_color=color.rgb(70, 80, 90), text_halign=text.align_right, text_valign=text.align_bottom, text_size=size.small, text_wrap=text.wrap_auto, text_font_family=font.family_monospace, force_overlay=true, text_formatting=text.format_bold)
plot(array.size(box.all))`,
    officialMembers: ['box.new', 'array.size'],
    outputMembers: [['box.new'], ['array.size']],
    rule: 'TradingView v6 Lines and boxes/reference: box.new() creates a box from supplied coordinates; bgcolor, xloc, text fields, border fields, extend, force_overlay, font family, and text formatting are drawing payload metadata and do not change box count. https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/ https://www.tradingview.com/pine-script-reference/v6/#fun_box.new',
    expected: (bars) => constantVector(bars, 1),
    expectedDrawings: (bars) => [
      {
        type: 'box',
        barIndex: 0,
        left: bars[0]!.time,
        top: bars[0]!.high,
        right: bars[0]!.time + 60000,
        bottom: bars[0]!.low,
        xloc: 'bar_time',
        bgcolor: '#0A141EFF',
        borderColor: '#28323CFF',
        borderWidth: 2,
        borderStyle: 'dashed',
        extend: 'right',
        text: 'zone',
        textColor: '#46505AFF',
        textHalign: 'right',
        textValign: 'bottom',
        textSize: 'small',
        textWrap: 'auto',
        textFontFamily: 'monospace',
        forceOverlay: true,
        textFormatting: 'bold',
      },
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'optional.visual-high-use-plotchar-size',
    namespace: 'visual',
    pine: `//@version=6
indicator("high-use plotchar size argument")
plotchar(close > open, title="Sized", char="S", size=size.large)
plot(close)`,
    officialMembers: ['plotchar'],
    rule: 'TradingView v6 Text and shapes: plotchar() size controls marker presentation while the plotted condition still controls marker presence. https://www.tradingview.com/pine-script-docs/visuals/text-and-shapes/',
    expected: (bars) => bars.map((bar) => bar.close > bar.open ? 1 : null),
    expectedOutputs: (bars) => [
      bars.map((bar) => bar.close > bar.open ? 1 : null),
      bars.map((bar) => bar.close),
    ],
    expectedPlots: () => [
      { type: 'plotchar', title: 'Sized', char: 'S', size: 'large' },
      { type: 'plot' },
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'optional.collection-array-new-arguments',
    namespace: 'array',
    pine: `//@version=6
indicator("array new optional arguments", overlay=true)
values = array.new<float>(size=3, initial_value=2.5)
var box seed = na
if bar_index == 0
    seed := box.new(0, 10.0, 1, 5.0)
boxes = array.new_box(2, seed)
plot(array.size(values))
plot(array.get(values, 0))
plot(array.size(boxes))
plot(box.get_top(array.get(boxes, 0)))`,
    officialMembers: ['array.new', 'array.new_box'],
    rule: 'TradingView v6 Arrays: array.new<T>(size, initial_value) and array.new_box(size, initial_value) create arrays with the requested length and seed value. https://www.tradingview.com/pine-script-docs/language/arrays/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 3),
    expectedOutputs: (bars) => [
      constantVector(bars, 3),
      constantVector(bars, 2.5),
      constantVector(bars, 2),
      constantVector(bars, 10),
    ],
    outputMembers: [
      ['array.new'],
      ['array.new'],
      ['array.new_box'],
      ['array.new_box'],
    ],
    expectedDrawings: () => [
      { type: 'box', left: 0, top: 10, right: 1, bottom: 5 },
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'optional.timeframe-in-seconds-argument',
    namespace: 'timeframe',
    pine: `//@version=6
indicator("timeframe in seconds optional argument")
plot(timeframe.in_seconds(timeframe="60"))`,
    officialMembers: ['timeframe.in_seconds'],
    outputMembers: [['timeframe.in_seconds']],
    rule: 'TradingView v6 Timeframes: timeframe.in_seconds(timeframe) converts the supplied timeframe string to seconds instead of the chart timeframe when the argument is provided. https://www.tradingview.com/pine-script-docs/concepts/timeframes/',
    expected: (bars) => constantVector(bars, 3600),
    bars: HOSTILE_BARS,
  },
  {
    id: 'optional.ta-vwap-anchor-argument',
    namespace: 'ta',
    pine: `//@version=6
indicator("vwap anchor optional argument")
anchor = bar_index == 3
plot(ta.vwap(close, anchor))`,
    officialMembers: ['ta.vwap'],
    outputMembers: [['ta.vwap']],
    rule: 'TradingView v6 Reference: ta.vwap(source, anchor) starts a new VWAP calculation period when anchor is true. https://www.tradingview.com/pine-script-reference/v6/#fun_ta.vwap',
    expected: (bars) => anchoredVwap(bars, (_bar, index) => index === 3),
    bars: HOSTILE_BARS,
  },
  {
    id: 'priority.ta-vwap-stdev-mult-values',
    namespace: 'ta',
    pine: `//@version=6
indicator("vwap stdev mult optional argument")
anchor = bar_index == 0 or bar_index == 4
[basis, upper, lower] = ta.vwap(close, anchor, stdev_mult=2.0)
plot(basis)
plot(upper)
plot(lower)`,
    officialMembers: ['ta.vwap'],
    outputMembers: [['ta.vwap'], ['ta.vwap'], ['ta.vwap']],
    rule: 'TradingView v6 Reference: ta.vwap(source, anchor, stdev_mult) returns VWAP plus upper and lower bands separated from the basis by stdev_mult times the anchored weighted standard deviation. https://www.tradingview.com/pine-script-reference/v6/#fun_ta.vwap',
    expected: (bars) => anchoredVwapBands(bars, (_bar, index) => index === 0 || index === 4, 2)[0]!,
    expectedOutputs: (bars) => anchoredVwapBands(bars, (_bar, index) => index === 0 || index === 4, 2),
    bars: HOSTILE_BARS,
  },
  {
    id: 'ta.dmi',
    namespace: 'ta',
    pine: `//@version=6
indicator("DMI vector")
[plus, minus, adx] = ta.dmi(14, 14)
plot(plus)
plot(minus)
plot(adx)`,
    expected: (bars) => dmi(bars, 14, 14)[0]!,
    expectedOutputs: (bars) => dmi(bars, 14, 14),
    bars: LONG_BARS,
  },
  { id: 'ta.adx', namespace: 'ta', pine: pine('ta.adx(14, 14)'), expected: (bars) => dmi(bars, 14, 14)[2]!, bars: LONG_BARS },
  {
    id: 'ta.supertrend',
    namespace: 'ta',
    pine: `//@version=6
indicator("Supertrend vector")
[trend, direction] = ta.supertrend(3, 14)
plot(trend)
plot(direction)`,
    expected: (bars) => supertrend(bars, 3, 14)[0]!,
    expectedOutputs: (bars) => supertrend(bars, 3, 14),
    bars: LONG_BARS,
  },
  {
    id: 'hostile.supertrend.zero-range',
    namespace: 'ta',
    pine: `//@version=6
indicator("Supertrend zero-range vector")
[trend, direction] = ta.supertrend(2, 3)
plot(trend)
plot(direction)`,
    expected: (bars) => supertrend(bars, 2, 3)[0]!,
    expectedOutputs: (bars) => supertrend(bars, 2, 3),
    bars: ZERO_SPREAD_BARS,
  },
  {
    id: 'hostile.supertrend.middle-na',
    namespace: 'ta',
    pine: `//@version=6
indicator("Supertrend hostile vector")
[trend, direction] = ta.supertrend(2, 3)
plot(trend)
plot(direction)`,
    expected: (bars) => supertrend(bars, 2, 3)[0]!,
    expectedOutputs: (bars) => supertrend(bars, 2, 3),
    bars: HOLE_BARS,
  },
  {
    id: 'ta.kst',
    namespace: 'ta',
    pine: `//@version=6
indicator("KST vector")
[line, signal] = ta.kst(close, 10, 15, 20, 30, 10, 10, 10, 15, 9)
plot(line)
plot(signal)`,
    expected: (bars) => kst(bars)[0]!,
    expectedOutputs: (bars) => kst(bars),
    bars: LONG_BARS,
  },
  { id: 'ta.sar', namespace: 'ta', pine: pine('ta.sar(0.02, 0.02, 0.2)'), expected: (bars) => sar(bars, 0.02, 0.02, 0.2), bars: LONG_BARS },
  { id: 'hostile.sar.flat', namespace: 'ta', pine: pine('ta.sar(0.02, 0.02, 0.2)'), expected: (bars) => sar(bars, 0.02, 0.02, 0.2), bars: FLAT_BARS },
  { id: 'ta.covariance', namespace: 'ta', pine: pine('ta.covariance(close, volume, 3)'), expected: (bars) => covariance(bars, 3) },
  { id: 'ta.correlation', namespace: 'ta', pine: pine('ta.correlation(close, volume, 3)'), expected: (bars) => correlation(bars, 3) },
  { id: 'ta.percentile_nearest_rank', namespace: 'ta', pine: pine('ta.percentile_nearest_rank(close, 3, 75)'), expected: (bars) => percentileNearestRank(bars, 3, 75) },
  { id: 'ta.percentile_linear_interpolation', namespace: 'ta', pine: pine('ta.percentile_linear_interpolation(close, 3, 50)'), expected: (bars) => percentileLinear(bars, 3, 50) },
  { id: 'ta.pivothigh', namespace: 'ta', pine: pine('ta.pivothigh(close, 1, 1)'), expected: (bars) => pivotHigh(bars, 1, 1) },
  { id: 'ta.pivotlow', namespace: 'ta', pine: pine('ta.pivotlow(close, 1, 1)'), expected: (bars) => pivotLow(bars, 1, 1) },
  { id: 'ta.highestbars', namespace: 'ta', pine: pine('ta.highestbars(close, 3)'), rule: EXTREMA_BARS_OFFSET_RULE, expected: (bars) => extremaBars(bars, 3, (values) => values.indexOf(Math.max(...values))) },
  { id: 'ta.lowestbars', namespace: 'ta', pine: pine('ta.lowestbars(close, 3)'), rule: EXTREMA_BARS_OFFSET_RULE, expected: (bars) => extremaBars(bars, 3, (values) => values.lastIndexOf(Math.min(...values))) },
  { id: 'ta.range', namespace: 'ta', pine: pine('ta.range(close, 3)'), expected: (bars) => range(bars, 3) },
  { id: 'ta.mom', namespace: 'ta', pine: pine('ta.mom(close, 3)'), expected: (bars) => momentum(bars, 3) },
  { id: 'ta.roc', namespace: 'ta', pine: pine('ta.roc(close, 3)'), expected: (bars) => rateOfChange(bars, 3) },
  { id: 'ta.tr', namespace: 'ta', pine: pine('ta.tr(true)'), expected: trueRange },
  { id: 'ta.vwap', namespace: 'ta', pine: pine('ta.vwap(close)'), expected: vwap },
  { id: 'hostile.vwap.middle-na', namespace: 'ta', pine: pine('ta.vwap(close)'), expected: vwap, bars: HOLE_BARS },
  { id: 'ta.swma', namespace: 'ta', pine: pine('ta.swma(close)'), expected: swma },
  { id: 'hostile.vwma.middle-na', namespace: 'ta', pine: pine('ta.vwma(close, 3)'), expected: (bars) => vwma(bars, 3), bars: HOLE_BARS },
  { id: 'hostile.sma.length1', namespace: 'ta', pine: pine('ta.sma(close, 1)'), expected: (bars) => bars.map((bar) => bar.close), bars: HOSTILE_BARS },
  { id: 'hostile.sma.overlong', namespace: 'ta', pine: pine('ta.sma(close, 20)'), expected: (bars) => bars.map(() => null), bars: HOSTILE_BARS },
  { id: 'hostile.stdev.flat', namespace: 'ta', pine: pine('ta.stdev(close, 3)'), expected: (bars) => stdev(bars, 3), bars: FLAT_BARS },
  { id: 'hostile.range.flat', namespace: 'ta', pine: pine('ta.range(close, 3)'), expected: (bars) => range(bars, 3), bars: FLAT_BARS },
  { id: 'hostile.variance.flat', namespace: 'ta', pine: pine('ta.variance(close, 3)'), expected: (bars) => variance(bars, 3), bars: FLAT_BARS },
  { id: 'hostile.dev.flat', namespace: 'ta', pine: pine('ta.dev(close, 3)'), expected: (bars) => meanDeviation(bars, 3), bars: FLAT_BARS },
  {
    id: 'hostile.rsi.signed',
    namespace: 'ta',
    pine: pine('ta.rsi(close, 3)'),
    rule: TA_RSI_FORMULA_CITATION,
    expected: (bars) => rsi(bars, 3),
    bars: HOSTILE_BARS,
    discriminationProof: {
      ...TA_MOVING_AVERAGE_SEED_DISCRIMINATION,
      helperFormulaCitation: TA_RSI_FORMULA_CITATION,
    },
  },
  {
    id: 'hostile.rsi.flat',
    namespace: 'ta',
    pine: pine('ta.rsi(close, 3)'),
    rule: TA_RSI_FORMULA_CITATION,
    expected: (bars) => rsi(bars, 3),
    bars: FLAT_BARS,
    discriminationProof: {
      ...TA_MOVING_AVERAGE_SEED_DISCRIMINATION,
      helperFormulaCitation: TA_RSI_FORMULA_CITATION,
    },
  },
  {
    id: 'hostile.rma.overlong',
    namespace: 'ta',
    pine: pine('ta.rma(close, 20)'),
    rule: TA_RMA_FORMULA_CITATION,
    expected: (bars) => rma(bars.map((bar) => bar.close), 20),
    bars: HOSTILE_BARS,
  },
  {
    id: 'hostile.atr.overlong',
    namespace: 'ta',
    pine: pine('ta.atr(20)'),
    rule: TA_ATR_FORMULA_CITATION,
    expected: (bars) => atr(bars, 20),
    bars: HOSTILE_BARS,
  },
  {
    id: 'hostile.atr.middle-na',
    namespace: 'ta',
    pine: pine('ta.atr(3)'),
    rule: TA_ATR_FORMULA_CITATION,
    expected: (bars) => atr(bars, 3),
    bars: HOLE_BARS,
    discriminationProof: {
      ...TA_MOVING_AVERAGE_SEED_DISCRIMINATION,
      helperFormulaCitation: TA_ATR_FORMULA_CITATION,
    },
  },
  { id: 'hostile.wvad.zero-range', namespace: 'ta', pine: pine('ta.wvad'), expected: wvad, bars: ZERO_RANGE_BARS },
  {
    id: 'hostile.ema.long',
    namespace: 'ta',
    pine: pine('ta.ema(close, 20)'),
    rule: TA_EMA_FORMULA_CITATION,
    expected: (bars) => ema(bars, 20),
    bars: LONG_BARS,
    discriminationProof: {
      ...TA_MOVING_AVERAGE_SEED_DISCRIMINATION,
      helperFormulaCitation: TA_EMA_FORMULA_CITATION,
    },
  },
  {
    id: 'hostile.rma.long',
    namespace: 'ta',
    pine: pine('ta.rma(close, 20)'),
    rule: TA_RMA_FORMULA_CITATION,
    expected: (bars) => rma(bars.map((bar) => bar.close), 20),
    bars: LONG_BARS,
    discriminationProof: TA_RMA_SEED_DISCRIMINATION,
  },
  { id: 'hostile.max.middle-na', namespace: 'ta', pine: pine('ta.max(close)'), expected: allTimeMaxIgnoringNa, bars: HOLE_BARS },
  {
    id: 'hostile.sma.middle-na',
    namespace: 'ta',
    pine: pine('ta.sma(close, 3)'),
    rule: TA_SMA_FORMULA_CITATION,
    expected: (bars) => sma(bars, 3),
    bars: HOLE_BARS,
    discriminationProof: {
      ...TA_MOVING_AVERAGE_SEED_DISCRIMINATION,
      helperFormulaCitation: TA_SMA_FORMULA_CITATION,
    },
  },
  {
    id: 'hostile.ema.middle-na',
    namespace: 'ta',
    pine: pine('ta.ema(close, 3)'),
    rule: TA_EMA_FORMULA_CITATION,
    expected: (bars) => ema(bars, 3),
    bars: HOLE_BARS,
    discriminationProof: {
      ...TA_MOVING_AVERAGE_SEED_DISCRIMINATION,
      helperFormulaCitation: TA_EMA_FORMULA_CITATION,
    },
  },
  {
    id: 'hostile.rma.middle-na',
    namespace: 'ta',
    pine: pine('ta.rma(close, 3)'),
    rule: TA_RMA_FORMULA_CITATION,
    expected: (bars) => rma(bars.map((bar) => bar.close), 3),
    bars: HOLE_BARS,
    discriminationProof: TA_RMA_SEED_DISCRIMINATION,
  },
  {
    id: 'hostile.sma.multi-middle-na',
    namespace: 'ta',
    pine: pine('ta.sma(close, 3)'),
    rule: TA_SMA_FORMULA_CITATION,
    expected: (bars) => sma(bars, 3),
    bars: MULTI_HOLE_BARS,
    discriminationProof: {
      ...TA_MOVING_AVERAGE_SEED_DISCRIMINATION,
      helperFormulaCitation: TA_SMA_FORMULA_CITATION,
    },
  },
  {
    id: 'hostile.ema.multi-middle-na',
    namespace: 'ta',
    pine: pine('ta.ema(close, 3)'),
    rule: TA_EMA_FORMULA_CITATION,
    expected: (bars) => ema(bars, 3),
    bars: MULTI_HOLE_BARS,
    discriminationProof: {
      ...TA_MOVING_AVERAGE_SEED_DISCRIMINATION,
      helperFormulaCitation: TA_EMA_FORMULA_CITATION,
    },
  },
  {
    id: 'hostile.rma.multi-middle-na',
    namespace: 'ta',
    pine: pine('ta.rma(close, 3)'),
    rule: TA_RMA_FORMULA_CITATION,
    expected: (bars) => rma(bars.map((bar) => bar.close), 3),
    bars: MULTI_HOLE_BARS,
    discriminationProof: TA_RMA_SEED_DISCRIMINATION,
  },
  { id: 'hostile.stdev.multi-middle-na', namespace: 'ta', pine: pine('ta.stdev(close, 3)'), expected: (bars) => stdev(bars, 3), bars: MULTI_HOLE_BARS },
  {
    id: 'hostile.highest.multi-middle-na',
    namespace: 'ta',
    pine: pine('ta.highest(high, 3)'),
    rule: TA_HIGHEST_FORMULA_CITATION,
    expected: (bars) => highest(bars, 3, (bar) => bar.high),
    bars: MULTI_HOLE_BARS,
    discriminationProof: {
      ...TA_EXTREMA_VALUE_DISCRIMINATION,
      helperFormulaCitation: TA_HIGHEST_FORMULA_CITATION,
    },
  },
  { id: 'hostile.range.multi-middle-na', namespace: 'ta', pine: pine('ta.range(close, 3)'), expected: (bars) => range(bars, 3), bars: MULTI_HOLE_BARS },
  { id: 'hostile.barssince.multi-middle-na', namespace: 'ta', pine: pine('ta.barssince(close > 0)'), expected: (bars) => barsSinceAbove(bars, 0), bars: MULTI_HOLE_BARS },
  { id: 'hostile.crossover.multi-middle-na', namespace: 'ta', pine: pine('ta.crossover(close, 0) ? 1 : 0'), expected: (bars) => crossover(bars, 0), bars: MULTI_HOLE_BARS },
  { id: 'hostile.pivothigh.multi-middle-na', namespace: 'ta', pine: pine('ta.pivothigh(close, 1, 1)'), expected: (bars) => pivotHigh(bars, 1, 1), bars: MULTI_HOLE_BARS },
  { id: 'hostile.pivotlow.multi-middle-na', namespace: 'ta', pine: pine('ta.pivotlow(close, 1, 1)'), expected: (bars) => pivotLow(bars, 1, 1), bars: MULTI_HOLE_BARS },
  {
    id: 'hostile.rsi.multi-middle-na',
    namespace: 'ta',
    pine: pine('ta.rsi(close, 3)'),
    rule: TA_RSI_FORMULA_CITATION,
    expected: (bars) => rsi(bars, 3),
    bars: MULTI_HOLE_BARS,
    discriminationProof: {
      ...TA_MOVING_AVERAGE_SEED_DISCRIMINATION,
      helperFormulaCitation: TA_RSI_FORMULA_CITATION,
    },
  },
  {
    id: 'hostile.atr.multi-middle-na',
    namespace: 'ta',
    pine: pine('ta.atr(3)'),
    rule: TA_ATR_FORMULA_CITATION,
    expected: (bars) => atr(bars, 3),
    bars: MULTI_HOLE_BARS,
    discriminationProof: {
      ...TA_MOVING_AVERAGE_SEED_DISCRIMINATION,
      helperFormulaCitation: TA_ATR_FORMULA_CITATION,
    },
  },
  { id: 'hostile.valuewhen.multi-middle-na', namespace: 'ta', pine: pine('ta.valuewhen(close > 0, close, 0)'), expected: (bars) => valueWhenAbove(bars, 0), bars: MULTI_HOLE_BARS },
  { id: 'hostile.crossunder.multi-middle-na', namespace: 'ta', pine: pine('ta.crossunder(close, 0) ? 1 : 0'), expected: (bars) => crossunder(bars, 0), bars: MULTI_HOLE_BARS },
  {
    id: 'hostile.dmi.multi-middle-na',
    namespace: 'ta',
    pine: `//@version=6
indicator("DMI hostile vector")
[plus, minus, adx] = ta.dmi(3, 3)
plot(plus)
plot(minus)
plot(adx)`,
    expected: (bars) => dmi(bars, 3, 3)[0]!,
    expectedOutputs: (bars) => dmi(bars, 3, 3),
    bars: MULTI_HOLE_BARS,
  },
  ...taInvalidLengthCases(),
  ...inputDomainDiagnosticCases(),
  {
    id: 'invariant.rsi.bounds',
    namespace: 'ta',
    pine: boundsInvariantPine('RSI bounds invariant', 'ta.rsi(close, 3)', 0, 100),
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: MULTI_HOLE_BARS,
  },
  {
    id: 'invariant.rsi.leading-na-bounds',
    namespace: 'ta',
    pine: boundsInvariantPine('RSI leading-na bounds invariant', 'ta.rsi(close, 3)', 0, 100),
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: LEADING_NA_BARS,
  },
  {
    id: 'invariant.rsi.flat-bounds',
    namespace: 'ta',
    pine: boundsInvariantPine('RSI flat bounds invariant', 'ta.rsi(close, 3)', 0, 100),
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: FLAT_BARS,
  },
  {
    id: 'invariant.rsi.all-na-bounds',
    namespace: 'ta',
    pine: boundsInvariantPine('RSI all-na bounds invariant', 'ta.rsi(close, 3)', 0, 100),
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: ALL_NA_BARS,
  },
  {
    id: 'invariant.mfi.bounds',
    namespace: 'ta',
    pine: boundsInvariantPine('MFI bounds invariant', 'ta.mfi(close, 3)', 0, 100),
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: MULTI_HOLE_BARS,
  },
  {
    id: 'invariant.mfi.leading-na-bounds',
    namespace: 'ta',
    pine: boundsInvariantPine('MFI leading-na bounds invariant', 'ta.mfi(close, 3)', 0, 100),
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: LEADING_NA_BARS,
  },
  {
    id: 'invariant.mfi.zero-flow-bounds',
    namespace: 'ta',
    pine: boundsInvariantPine('MFI zero-flow bounds invariant', 'ta.mfi(close, 3)', 0, 100),
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: FLAT_BARS,
  },
  {
    id: 'invariant.mfi.all-na-bounds',
    namespace: 'ta',
    pine: boundsInvariantPine('MFI all-na bounds invariant', 'ta.mfi(close, 3)', 0, 100),
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: ALL_NA_BARS,
  },
  {
    id: 'invariant.stoch.bounds',
    namespace: 'ta',
    pine: boundsInvariantPine('Stochastic bounds invariant', 'ta.stoch(close, high, low, 3)', 0, 100),
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: MULTI_HOLE_BARS,
  },
  {
    id: 'invariant.stoch.leading-na-bounds',
    namespace: 'ta',
    pine: boundsInvariantPine('Stochastic leading-na bounds invariant', 'ta.stoch(close, high, low, 3)', 0, 100),
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: LEADING_NA_BARS,
  },
  {
    id: 'invariant.stoch.zero-range-bounds',
    namespace: 'ta',
    pine: boundsInvariantPine('Stochastic zero-range invariant', 'ta.stoch(close, high, low, 3)', 0, 100),
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: ZERO_SPREAD_FLAT_BARS,
  },
  {
    id: 'invariant.stoch.all-na-bounds',
    namespace: 'ta',
    pine: boundsInvariantPine('Stochastic all-na bounds invariant', 'ta.stoch(close, high, low, 3)', 0, 100),
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: ALL_NA_BARS,
  },
  {
    id: 'invariant.rci.bounds',
    namespace: 'ta',
    pine: boundsInvariantPine('RCI bounds invariant', 'ta.rci(close, 3)', -100, 100),
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: MULTI_HOLE_BARS,
  },
  {
    id: 'invariant.rci.leading-na-bounds',
    namespace: 'ta',
    pine: boundsInvariantPine('RCI leading-na bounds invariant', 'ta.rci(close, 3)', -100, 100),
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: LEADING_NA_BARS,
  },
  {
    id: 'invariant.rci.flat-bounds',
    namespace: 'ta',
    pine: boundsInvariantPine('RCI flat bounds invariant', 'ta.rci(close, 3)', -100, 100),
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: FLAT_BARS,
  },
  {
    id: 'invariant.rci.all-na-bounds',
    namespace: 'ta',
    pine: boundsInvariantPine('RCI all-na bounds invariant', 'ta.rci(close, 3)', -100, 100),
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: ALL_NA_BARS,
  },
  {
    id: 'invariant.cmo.bounds',
    namespace: 'ta',
    pine: boundsInvariantPine('CMO bounds invariant', 'ta.cmo(close, 3)', -100, 100),
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: MULTI_HOLE_BARS,
  },
  {
    id: 'invariant.cmo.leading-na-bounds',
    namespace: 'ta',
    pine: boundsInvariantPine('CMO leading-na bounds invariant', 'ta.cmo(close, 3)', -100, 100),
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: LEADING_NA_BARS,
  },
  {
    id: 'invariant.cmo.flat-bounds',
    namespace: 'ta',
    pine: boundsInvariantPine('CMO flat bounds invariant', 'ta.cmo(close, 3)', -100, 100),
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: FLAT_BARS,
  },
  {
    id: 'invariant.cmo.all-na-bounds',
    namespace: 'ta',
    pine: boundsInvariantPine('CMO all-na bounds invariant', 'ta.cmo(close, 3)', -100, 100),
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: ALL_NA_BARS,
  },
  {
    id: 'invariant.wpr.bounds',
    namespace: 'ta',
    pine: boundsInvariantPine('WPR bounds invariant', 'ta.wpr(3)', -100, 0),
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: MULTI_HOLE_BARS,
  },
  {
    id: 'invariant.wpr.leading-na-bounds',
    namespace: 'ta',
    pine: boundsInvariantPine('WPR leading-na bounds invariant', 'ta.wpr(3)', -100, 0),
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: LEADING_NA_BARS,
  },
  {
    id: 'invariant.wpr.zero-range-bounds',
    namespace: 'ta',
    pine: boundsInvariantPine('WPR zero-range bounds invariant', 'ta.wpr(3)', -100, 0),
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: ZERO_SPREAD_FLAT_BARS,
  },
  {
    id: 'invariant.wpr.all-na-bounds',
    namespace: 'ta',
    pine: boundsInvariantPine('WPR all-na bounds invariant', 'ta.wpr(3)', -100, 0),
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: ALL_NA_BARS,
  },
  {
    id: 'invariant.tsi.bounds',
    namespace: 'ta',
    pine: boundsInvariantPine('TSI bounds invariant', 'ta.tsi(close, 3, 5)', -100, 100),
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: MULTI_HOLE_BARS,
  },
  {
    id: 'invariant.tsi.leading-na-bounds',
    namespace: 'ta',
    pine: boundsInvariantPine('TSI leading-na bounds invariant', 'ta.tsi(close, 3, 5)', -100, 100),
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: LEADING_NA_BARS,
  },
  {
    id: 'invariant.tsi.flat-bounds',
    namespace: 'ta',
    pine: boundsInvariantPine('TSI flat bounds invariant', 'ta.tsi(close, 3, 5)', -100, 100),
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: FLAT_BARS,
  },
  {
    id: 'invariant.tsi.all-na-bounds',
    namespace: 'ta',
    pine: boundsInvariantPine('TSI all-na bounds invariant', 'ta.tsi(close, 3, 5)', -100, 100),
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: ALL_NA_BARS,
  },
  {
    id: 'invariant.dmi.bounds',
    namespace: 'ta',
    pine: `//@version=6
indicator("DMI bounds invariant")
ok(value) => na(value) or (value >= 0 and value <= 100)
[plus, minus, adx] = ta.dmi(3, 3)
plot(ok(plus) and ok(minus) and ok(adx) ? 1 : 0)`,
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: MULTI_HOLE_BARS,
  },
  {
    id: 'invariant.dmi.leading-na-bounds',
    namespace: 'ta',
    pine: `//@version=6
indicator("DMI leading-na bounds invariant")
ok(value) => na(value) or (value >= 0 and value <= 100)
[plus, minus, adx] = ta.dmi(3, 3)
plot(ok(plus) and ok(minus) and ok(adx) ? 1 : 0)`,
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: LEADING_NA_BARS,
  },
  {
    id: 'invariant.dmi.flat-bounds',
    namespace: 'ta',
    pine: `//@version=6
indicator("DMI flat bounds invariant")
ok(value) => na(value) or (value >= 0 and value <= 100)
[plus, minus, adx] = ta.dmi(3, 3)
plot(ok(plus) and ok(minus) and ok(adx) ? 1 : 0)`,
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: FLAT_BARS,
  },
  {
    id: 'invariant.dmi.all-na-bounds',
    namespace: 'ta',
    pine: `//@version=6
indicator("DMI all-na bounds invariant")
ok(value) => na(value) or (value >= 0 and value <= 100)
[plus, minus, adx] = ta.dmi(3, 3)
plot(ok(plus) and ok(minus) and ok(adx) ? 1 : 0)`,
    rule: TA_INVARIANT_BOUNDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: ALL_NA_BARS,
  },
  {
    id: 'invariant.bb.tuple-coherence',
    namespace: 'ta',
    pine: `//@version=6
indicator("BB tuple coherence invariant")
[basis, upper, lower] = ta.bb(close, 3, 2)
allNa = na(basis) and na(upper) and na(lower)
allValid = not na(basis) and not na(upper) and not na(lower)
plot(allNa or (allValid and upper >= basis and basis >= lower) ? 1 : 0)`,
    rule: TA_INVARIANT_BANDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: MULTI_HOLE_BARS,
  },
  {
    id: 'invariant.kc.tuple-coherence',
    namespace: 'ta',
    pine: `//@version=6
indicator("KC tuple coherence invariant")
[basis, upper, lower] = ta.kc(close, 3, 1.5)
allNa = na(basis) and na(upper) and na(lower)
allValid = not na(basis) and not na(upper) and not na(lower)
plot(allNa or (allValid and upper >= basis and basis >= lower) ? 1 : 0)`,
    rule: TA_INVARIANT_BANDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: MULTI_HOLE_BARS,
  },
  {
    id: 'invariant.bbw.zero-basis-na',
    namespace: 'ta',
    pine: `//@version=6
indicator("BBW zero-basis invariant")
value = ta.bbw(close, 3, 2)
plot(na(value) ? 1 : 0)`,
    rule: TA_INVARIANT_DEGENERATE_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: FLAT_BARS,
  },
  {
    id: 'invariant.pivothigh.confirmation-offset',
    namespace: 'ta',
    pine: `//@version=6
indicator("Pivot high confirmation invariant")
value = ta.pivothigh(close, 1, 2)
plot(bar_index < 3 ? (na(value) ? 1 : 0) : 1)`,
    rule: TA_INVARIANT_PIVOT_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: HOSTILE_BARS,
  },
  {
    id: 'invariant.pivotlow.confirmation-offset',
    namespace: 'ta',
    pine: `//@version=6
indicator("Pivot low confirmation invariant")
value = ta.pivotlow(close, 1, 2)
plot(bar_index < 3 ? (na(value) ? 1 : 0) : 1)`,
    rule: TA_INVARIANT_PIVOT_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: HOSTILE_BARS,
  },
  {
    id: 'invariant.cross.family-coherence',
    namespace: 'ta',
    pine: `//@version=6
indicator("Cross family coherence invariant")
up = ta.crossover(close, 0)
down = ta.crossunder(close, 0)
bothExclusive = not (up and down)
crossMatches = ta.cross(close, 0) == (up or down)
plot(bothExclusive and crossMatches ? 1 : 0)`,
    rule: TA_INVARIANT_CROSS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: MULTI_HOLE_BARS,
  },
  {
    id: 'invariant.cum.nonnegative-monotonic',
    namespace: 'ta',
    pine: `//@version=6
indicator("Cumulative nonnegative monotonic invariant")
value = ta.cum(math.abs(close))
plot(na(value) or na(value[1]) or value >= value[1] ? 1 : 0)`,
    rule: TA_INVARIANT_ACCUMULATOR_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: MULTI_HOLE_BARS,
  },
  {
    id: 'invariant.alma.convex-window',
    namespace: 'ta',
    pine: `//@version=6
indicator("ALMA convex window invariant")
value = ta.alma(close, 5, 0.85, 6)
lo = ta.lowest(close, 5)
hi = ta.highest(close, 5)
plot(na(value) or na(lo) or na(hi) or (value >= lo and value <= hi) ? 1 : 0)`,
    rule: TA_INVARIANT_CONVEX_AVERAGE_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: LONG_BARS,
  },
  {
    id: 'invariant.swma.convex-window',
    namespace: 'ta',
    pine: `//@version=6
indicator("SWMA convex window invariant")
value = ta.swma(close)
lo = ta.lowest(close, 4)
hi = ta.highest(close, 4)
plot(na(value) or na(lo) or na(hi) or (value >= lo and value <= hi) ? 1 : 0)`,
    rule: TA_INVARIANT_CONVEX_AVERAGE_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: MULTI_HOLE_BARS,
  },
  {
    id: 'invariant.kcw.nonnegative-positive-basis',
    namespace: 'ta',
    pine: `//@version=6
indicator("KCW nonnegative invariant")
value = ta.kcw(close, 3, 1.5)
plot(na(value) or value >= 0 ? 1 : 0)`,
    rule: TA_INVARIANT_BANDS_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: BARS,
  },
  {
    id: 'invariant.macd.histogram-coherence',
    namespace: 'ta',
    pine: `//@version=6
indicator("MACD histogram coherence invariant")
[line, signal, histogram] = ta.macd(close, 3, 5, 2)
plot(na(line) or na(signal) or na(histogram) or math.abs(histogram - (line - signal)) < 0.00000001 ? 1 : 0)`,
    rule: TA_INVARIANT_MACD_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: MULTI_HOLE_BARS,
  },
  {
    id: 'invariant.supertrend.direction-domain',
    namespace: 'ta',
    pine: `//@version=6
indicator("Supertrend direction domain invariant")
[trend, direction] = ta.supertrend(2, 3)
plot(na(direction) or direction == 1 or direction == -1 ? 1 : 0)`,
    rule: TA_INVARIANT_SUPERTREND_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: MULTI_HOLE_BARS,
  },
  {
    id: 'invariant.vwap.running-range',
    namespace: 'ta',
    pine: `//@version=6
indicator("VWAP running range invariant")
value = ta.vwap(close)
var float lo = na
var float hi = na
lo := na(lo) ? close : math.min(lo, close)
hi := na(hi) ? close : math.max(hi, close)
plot(na(value) or na(lo) or na(hi) or (value >= lo and value <= hi) ? 1 : 0)`,
    rule: TA_INVARIANT_VWAP_RULE,
    expected: (bars) => constantVector(bars, 1),
    bars: BARS,
  },
  { id: 'hostile.tr.multi-middle-na', namespace: 'ta', pine: pine('ta.tr(true)'), expected: trueRange, bars: MULTI_HOLE_BARS },
  {
    id: 'hostile.rma.synthetic.multi-middle-na',
    namespace: 'ta',
    pine: pine('ta.rma(close, 3)'),
    rule: TA_RMA_FORMULA_CITATION,
    expected: (bars) => rma(bars.map((bar) => bar.close), 3),
    bars: MULTI_HOLE_BARS,
    discriminationProof: TA_RMA_SEED_DISCRIMINATION,
  },
  { id: 'hostile.highest.length1-plateau', namespace: 'ta', pine: pine('ta.highest(close, 1)'), expected: (bars) => bars.map((bar) => bar.close), bars: PLATEAU_BARS },
  { id: 'hostile.lowest.length1-plateau', namespace: 'ta', pine: pine('ta.lowest(close, 1)'), expected: (bars) => bars.map((bar) => bar.close), bars: PLATEAU_BARS },
  { id: 'hostile.range.length1-plateau', namespace: 'ta', pine: pine('ta.range(close, 1)'), expected: (bars) => bars.map(() => 0), bars: PLATEAU_BARS },
  { id: 'hostile.highestbars.plateau', namespace: 'ta', pine: pine('ta.highestbars(close, 3)'), rule: EXTREMA_BARS_OFFSET_RULE, expected: (bars) => extremaBars(bars, 3, (values) => values.lastIndexOf(Math.max(...values))), bars: PLATEAU_BARS },
  { id: 'hostile.lowestbars.plateau', namespace: 'ta', pine: pine('ta.lowestbars(close, 3)'), rule: EXTREMA_BARS_OFFSET_RULE, expected: (bars) => extremaBars(bars, 3, (values) => values.lastIndexOf(Math.min(...values))), bars: PLATEAU_BARS },
  { id: 'hostile.pivothigh.plateau', namespace: 'ta', pine: pine('ta.pivothigh(close, 1, 1)'), expected: (bars) => pivotHigh(bars, 1, 1), bars: PLATEAU_BARS },
  { id: 'hostile.pivotlow.plateau', namespace: 'ta', pine: pine('ta.pivotlow(close, 1, 1)'), expected: (bars) => pivotLow(bars, 1, 1), bars: PLATEAU_BARS },
  {
    id: 'hostile.ema.long-middle-na',
    namespace: 'ta',
    pine: pine('ta.ema(close, 20)'),
    rule: TA_EMA_FORMULA_CITATION,
    expected: (bars) => ema(bars, 20),
    bars: LONG_HOLE_BARS,
    discriminationProof: {
      ...TA_MOVING_AVERAGE_SEED_DISCRIMINATION,
      helperFormulaCitation: TA_EMA_FORMULA_CITATION,
    },
  },
  {
    id: 'hostile.rma.long-middle-na',
    namespace: 'ta',
    pine: pine('ta.rma(close, 20)'),
    rule: TA_RMA_FORMULA_CITATION,
    expected: (bars) => rma(bars.map((bar) => bar.close), 20),
    bars: LONG_HOLE_BARS,
    discriminationProof: TA_RMA_SEED_DISCRIMINATION,
  },
  { id: 'hostile.wma.middle-na', namespace: 'ta', pine: pine('ta.wma(close, 3)'), expected: (bars) => wma(bars, 3), bars: HOLE_BARS },
  { id: 'hostile.stdev.middle-na', namespace: 'ta', pine: pine('ta.stdev(close, 3)'), expected: (bars) => stdev(bars, 3), bars: HOLE_BARS },
  { id: 'hostile.variance.middle-na', namespace: 'ta', pine: pine('ta.variance(close, 3)'), expected: (bars) => variance(bars, 3), bars: HOLE_BARS },
  { id: 'hostile.dev.middle-na', namespace: 'ta', pine: pine('ta.dev(close, 3)'), expected: (bars) => meanDeviation(bars, 3), bars: HOLE_BARS },
  { id: 'hostile.cci.flat', namespace: 'ta', pine: pine('ta.cci(close, 3)'), expected: (bars) => cci(bars, 3), bars: FLAT_BARS },
  { id: 'hostile.cog.flat', namespace: 'ta', pine: pine('ta.cog(close, 3)'), expected: (bars) => cog(bars, 3), bars: FLAT_BARS },
  { id: 'hostile.correlation.flat', namespace: 'ta', pine: pine('ta.correlation(close, volume, 3)'), expected: (bars) => correlation(bars, 3), bars: FLAT_BARS },
  { id: 'hostile.correlation.middle-na', namespace: 'ta', pine: pine('ta.correlation(close, volume, 3)'), expected: (bars) => correlation(bars, 3), bars: HOLE_BARS },
  { id: 'hostile.covariance.middle-na', namespace: 'ta', pine: pine('ta.covariance(close, volume, 3)'), expected: (bars) => covariance(bars, 3), bars: HOLE_BARS },
  { id: 'hostile.percentile_nearest_rank.middle-na', namespace: 'ta', pine: pine('ta.percentile_nearest_rank(close, 3, 75)'), expected: (bars) => percentileNearestRank(bars, 3, 75), bars: HOLE_BARS },
  { id: 'hostile.percentile_linear_interpolation.middle-na', namespace: 'ta', pine: pine('ta.percentile_linear_interpolation(close, 3, 50)'), expected: (bars) => percentileLinear(bars, 3, 50), bars: HOLE_BARS },
  {
    id: 'hostile.highest.middle-na',
    namespace: 'ta',
    pine: pine('ta.highest(high, 3)'),
    rule: TA_HIGHEST_FORMULA_CITATION,
    expected: (bars) => highest(bars, 3, (bar) => bar.high),
    bars: HOLE_BARS,
    discriminationProof: {
      ...TA_EXTREMA_VALUE_DISCRIMINATION,
      helperFormulaCitation: TA_HIGHEST_FORMULA_CITATION,
    },
  },
  {
    id: 'hostile.lowest.middle-na',
    namespace: 'ta',
    pine: pine('ta.lowest(low, 3)'),
    rule: TA_LOWEST_FORMULA_CITATION,
    expected: (bars) => lowest(bars, 3, (bar) => bar.low),
    bars: HOLE_BARS,
    discriminationProof: {
      ...TA_EXTREMA_VALUE_DISCRIMINATION,
      helperFormulaCitation: TA_LOWEST_FORMULA_CITATION,
    },
  },
  { id: 'hostile.highestbars.middle-na', namespace: 'ta', pine: pine('ta.highestbars(close, 3)'), rule: EXTREMA_BARS_OFFSET_RULE, expected: (bars) => extremaBars(bars, 3, (values) => values.lastIndexOf(Math.max(...values))), bars: HOLE_BARS },
  { id: 'hostile.lowestbars.middle-na', namespace: 'ta', pine: pine('ta.lowestbars(close, 3)'), rule: EXTREMA_BARS_OFFSET_RULE, expected: (bars) => extremaBars(bars, 3, (values) => values.lastIndexOf(Math.min(...values))), bars: HOLE_BARS },
  { id: 'hostile.range.middle-na', namespace: 'ta', pine: pine('ta.range(close, 3)'), expected: (bars) => range(bars, 3), bars: HOLE_BARS },
  { id: 'hostile.barssince.middle-na', namespace: 'ta', pine: pine('ta.barssince(close < close[1])'), expected: barsSince, bars: HOLE_BARS },
  { id: 'hostile.valuewhen.middle-na', namespace: 'ta', pine: pine('ta.valuewhen(close < close[1], close, 0)'), expected: valueWhen, bars: HOLE_BARS },
  { id: 'hostile.crossover.middle-na', namespace: 'ta', pine: pine('ta.crossover(close, 0) ? 1 : 0'), expected: (bars) => crossover(bars, 0), bars: HOLE_BARS },
  { id: 'hostile.crossunder.middle-na', namespace: 'ta', pine: pine('ta.crossunder(close, 0) ? 1 : 0'), expected: (bars) => crossunder(bars, 0), bars: HOLE_BARS },
  { id: 'hostile.cross.middle-na', namespace: 'ta', pine: pine('ta.cross(close, 0) ? 1 : 0'), expected: (bars) => cross(bars, 0), bars: HOLE_BARS },
  { id: 'hostile.pivothigh.middle-na', namespace: 'ta', pine: pine('ta.pivothigh(close, 1, 1)'), expected: (bars) => pivotHigh(bars, 1, 1), bars: HOLE_BARS },
  { id: 'hostile.pivotlow.middle-na', namespace: 'ta', pine: pine('ta.pivotlow(close, 1, 1)'), expected: (bars) => pivotLow(bars, 1, 1), bars: HOLE_BARS },
  { id: 'hostile.barssince.direct-middle-na', namespace: 'ta', pine: pine('ta.barssince(close < close[1])'), expected: barsSince, bars: HOLE_BARS },
  { id: 'hostile.valuewhen.direct-middle-na', namespace: 'ta', pine: pine('ta.valuewhen(close < close[1], close, 0)'), expected: valueWhen, bars: HOLE_BARS },
  { id: 'hostile.mom.middle-na', namespace: 'ta', pine: pine('ta.mom(close, 3)'), expected: (bars) => momentum(bars, 3), bars: HOLE_BARS },
  { id: 'hostile.roc.middle-na', namespace: 'ta', pine: pine('ta.roc(close, 3)'), expected: (bars) => rateOfChange(bars, 3), bars: HOLE_BARS },
  { id: 'hostile.tr.middle-na', namespace: 'ta', pine: pine('ta.tr(true)'), expected: trueRange, bars: HOLE_BARS },
  { id: 'hostile.swma.middle-na', namespace: 'ta', pine: pine('ta.swma(close)'), expected: swma, bars: HOLE_BARS },
  {
    id: 'runtime.barstate-historical-flags',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("barstate historical flags")\nplot(barstate.isfirst ? 1 : 0)\nplot(barstate.islast ? 1 : 0)\nplot(barstate.isconfirmed ? 1 : 0)\nplot(barstate.isrealtime ? 1 : 0)`,
    rule: 'TradingView v6 Bar states: historical bars are confirmed, the first bar sets barstate.isfirst, the last calculation bar sets barstate.islast, and historical execution is not realtime. https://www.tradingview.com/pine-script-docs/concepts/bar-states/',
    expected: (bars) => bars.map((_bar, index) => index === 0 ? 1 : 0),
    expectedOutputs: (bars) => [
      bars.map((_bar, index) => index === 0 ? 1 : 0),
      bars.map((_bar, index) => index === bars.length - 1 ? 1 : 0),
      constantVector(bars, 1),
      constantVector(bars, 0),
    ],
    outputMembers: [
      ['barstate.isfirst'],
      ['barstate.islast'],
      ['barstate.isconfirmed'],
      ['barstate.isrealtime'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'runtime.barstate-lastconfirmedhistory-closed-market',
    namespace: 'runtime',
    pine: `//@version=6
indicator("last confirmed history closed")
lch = barstate.islastconfirmedhistory ? 1 : 0
plot(lch)
plot(lch[1])
plot(barstate.islast ? 1 : 0)
plot(barstate.isrealtime ? 1 : 0)`,
    rule: 'TradingView v6 Bar states: barstate.islastconfirmedhistory is true on the dataset last bar when the market is closed; barstate.islastconfirmedhistory[1] detects the first realtime bar, so historical-only execution has no next realtime bar to detect. https://www.tradingview.com/pine-script-docs/concepts/bar-states/',
    expected: (bars) => bars.map((_bar, index) => index === bars.length - 1 ? 1 : 0),
    expectedOutputs: (bars) => [
      bars.map((_bar, index) => index === bars.length - 1 ? 1 : 0),
      bars.map((_bar, index) => index === 0 ? null : index === bars.length ? 1 : 0),
      bars.map((_bar, index) => index === bars.length - 1 ? 1 : 0),
      constantVector(bars, 0),
    ],
    outputMembers: [
      ['barstate.islastconfirmedhistory'],
      ['barstate.islastconfirmedhistory'],
      ['barstate.islast'],
      ['barstate.isrealtime'],
    ],
    bars: HOSTILE_BARS.slice(0, 4),
  },
  {
    id: 'runtime.barstate-lastconfirmedhistory-realtime-last-only',
    namespace: 'runtime',
    pine: `//@version=6
indicator("last confirmed history realtime last")
lch = barstate.islastconfirmedhistory ? 1 : 0
plot(lch)
plot(lch[1])
plot(barstate.islast ? 1 : 0)
plot(barstate.isrealtime ? 1 : 0)`,
    rule: 'TradingView v6 Bar states: on open markets, barstate.islastconfirmedhistory is true on the bar immediately preceding the realtime bar, and barstate.islastconfirmedhistory[1] detects the first realtime bar. https://www.tradingview.com/pine-script-docs/concepts/bar-states/',
    expected: (bars) => bars.map((_bar, index) => index === bars.length - 2 ? 1 : 0),
    expectedOutputs: (bars) => [
      bars.map((_bar, index) => index === bars.length - 2 ? 1 : 0),
      bars.map((_bar, index) => index === 0 ? null : index === bars.length - 1 ? 1 : 0),
      bars.map((_bar, index) => index >= bars.length - 2 ? 1 : 0),
      bars.map((_bar, index) => index === bars.length - 1 ? 1 : 0),
    ],
    outputMembers: [
      ['barstate.islastconfirmedhistory'],
      ['barstate.islastconfirmedhistory'],
      ['barstate.islast'],
      ['barstate.isrealtime'],
    ],
    bars: HOSTILE_BARS.slice(0, 4),
    options: () => ({ realtimeLastBar: { isNew: true } }),
  },
  {
    id: 'runtime.barstate-lastconfirmedhistory-realtime-segment',
    namespace: 'runtime',
    pine: `//@version=6
indicator("last confirmed history realtime segment")
lch = barstate.islastconfirmedhistory ? 1 : 0
plot(lch)
plot(lch[1])
plot(barstate.isconfirmed ? 1 : 0)
plot(barstate.isrealtime ? 1 : 0)`,
    rule: 'TradingView v6 Bar states: on open markets, barstate.islastconfirmedhistory is true on the bar immediately preceding the realtime bar; elapsed realtime bars are confirmed but are not historical, so the last-confirmed-history marker does not advance through a multi-bar realtime segment. https://www.tradingview.com/pine-script-docs/concepts/bar-states/',
    expected: (bars) => bars.map((_bar, index) => index === 2 ? 1 : 0),
    expectedOutputs: (bars) => [
      bars.map((_bar, index) => index === 2 ? 1 : 0),
      bars.map((_bar, index) => index === 0 ? null : index === 3 ? 1 : 0),
      bars.map((_bar, index) => index === bars.length - 1 ? 0 : 1),
      bars.map((_bar, index) => index >= 3 ? 1 : 0),
    ],
    outputMembers: [
      ['barstate.islastconfirmedhistory'],
      ['barstate.islastconfirmedhistory'],
      ['barstate.isconfirmed'],
      ['barstate.isrealtime'],
    ],
    bars: HOSTILE_BARS.slice(0, 6),
    options: () => ({
      confirmedRealtimeBarStartIndex: 3,
      realtimeLastBar: { isNew: true },
    }),
  },
  {
    id: 'runtime.input-default-values',
    namespace: 'input',
    pine: `//@version=6\nindicator("input default values")\nlength = input.int(5, "Length")\nratio = input.float(1.5, "Ratio")\nflag = input.bool(true, "Flag")\nsource = input.source(open, "Source")\nplot(length)\nplot(ratio)\nplot(flag ? 1 : 0)\nplot(source)`,
    rule: 'TradingView v6 Inputs: input.* calls return the configured value, or the defval when no user override is supplied; input.source returns the selected source series. https://www.tradingview.com/pine-script-docs/concepts/inputs/',
    expected: (bars) => constantVector(bars, 5),
    expectedOutputs: (bars) => [
      constantVector(bars, 5),
      constantVector(bars, 1.5),
      constantVector(bars, 1),
      bars.map((bar) => bar.open),
    ],
    outputMembers: [
      ['input.int'],
      ['input.float'],
      ['input.bool'],
      ['input.source'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'runtime.input-expanded-default-values',
    namespace: 'input',
    pine: `//@version=6\nenum Mode\n    fast\n    slow\nindicator("input expanded default values")\nmode = input.string("EMA", "Mode", options=["SMA", "EMA"])\ntf = input.timeframe("60", "Timeframe", options=["15", "60"])\nsym = input.symbol("NASDAQ:AAPL", "Symbol")\nsess = input.session("0930-1600", "Session")\nlevel = input.price(101.25, "Level")\nnotes = input.text_area("note", "Notes")\nstart = input.time(1700000000000, "Start")\ntint = input.color(color.rgb(12, 34, 56, 40), "Tint")\nchoice = input.enum(Mode.fast, "Choice", options=[Mode.fast, Mode.slow])\nplot(mode == "EMA" ? 1 : 0)\nplot(tf == "60" ? 1 : 0)\nplot(sym == "NASDAQ:AAPL" ? 1 : 0)\nplot(sess == "0930-1600" ? 1 : 0)\nplot(level)\nplot(notes == "note" ? 1 : 0)\nplot(start)\nplot(color.r(tint))\nplot(color.g(tint))\nplot(color.b(tint))\nplot(color.t(tint))\nplot(choice == Mode.fast ? 1 : 0)`,
    rule: 'TradingView v6 Inputs: input.* calls return their configured value or defval; input.color returns a color value whose channels are readable through color.r/g/b/t, and input.enum returns the selected enum member. https://www.tradingview.com/pine-script-docs/concepts/inputs/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => [
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 101.25),
      constantVector(bars, 1),
      constantVector(bars, 1_700_000_000_000),
      constantVector(bars, 12),
      constantVector(bars, 34),
      constantVector(bars, 56),
      constantVector(bars, 40),
      constantVector(bars, 1),
    ],
    outputMembers: [
      ['input.string'],
      ['input.timeframe'],
      ['input.symbol'],
      ['input.session'],
      ['input.price'],
      ['input.text_area'],
      ['input.time'],
      ['input.color', 'color.r'],
      ['input.color', 'color.g'],
      ['input.color', 'color.b'],
      ['input.color', 'color.t'],
      ['input.enum'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'runtime.input-range-overload-values',
    namespace: 'input',
    pine: `//@version=6
indicator("input range overload values")
length = input.int(defval=5, title="Length", minval=1, maxval=10, step=1)
ratio = input.float(defval=1.5, title="Ratio", minval=0.5, maxval=2.5, step=0.25)
plot(length)
plot(ratio)`,
    rule: 'TradingView v6 Inputs: input.int() and input.float() have a minval/maxval/step overload distinct from the options overload, and return the defval when no user override is supplied. https://www.tradingview.com/pine-script-docs/concepts/inputs/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 5),
    expectedOutputs: (bars) => [
      constantVector(bars, 5),
      constantVector(bars, 1.5),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'runtime.input-options-overload-values',
    namespace: 'input',
    pine: `//@version=6
indicator("input options overload values")
length = input.int(defval=3, title="Length", options=[1, 3, 5])
ratio = input.float(defval=1.5, title="Ratio", options=[0.5, 1.5, 2.5])
plot(length)
plot(ratio)`,
    rule: 'TradingView v6 Inputs: input.int() and input.float() have an options overload distinct from the minval/maxval/step overload, and return the defval when no user override is supplied. https://www.tradingview.com/pine-script-docs/concepts/inputs/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 3),
    expectedOutputs: (bars) => [
      constantVector(bars, 3),
      constantVector(bars, 1.5),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'runtime.input-high-use-metadata-values',
    namespace: 'input',
    pine: `//@version=6
indicator("input high-use metadata values")
length = input.int(defval=5, title="Length", minval=1, maxval=10, step=1, tooltip="Length tooltip", inline="len", group="Inputs", display=display.data_window, active=true)
enabled = input.bool(defval=true, title="Enabled", tooltip="Enabled tooltip", inline="len", group="Inputs", display=display.status_line, active=true)
mode = input.string(defval="EMA", title="Mode", options=["SMA", "EMA"], tooltip="Mode tooltip", inline="mode", group="Inputs", display=display.data_window, active=true)
ratio = input.float(defval=1.5, title="Ratio", minval=0.5, maxval=2.5, step=0.25, tooltip="Ratio tooltip", inline="ratio", group="Inputs", display=display.status_line, active=true)
tint = input.color(defval=color.rgb(12, 34, 56, 40), title="Tint", tooltip="Tint tooltip", inline="style", group="Style", display=display.data_window, active=true)
tf = input.timeframe(defval="60", title="Timeframe", options=["15", "60"], tooltip="Timeframe tooltip", inline="tf", group="Data", display=display.none, confirm=true)
src = input.source(defval=open, title="Source", tooltip="Source tooltip", inline="src", group="Data", display=display.data_window, active=true)
sess = input.session(defval="0930-1600", title="Session", tooltip="Session tooltip", inline="sess", group="Data", confirm=true)
start = input.time(defval=1700000000000, title="Start", tooltip="Start tooltip", inline="time", group="Data", confirm=true)
sym = input.symbol(defval="NASDAQ:AAPL", title="Symbol", tooltip="Symbol tooltip", inline="sym", group="Data", confirm=true, active=true)
generic = input(defval=3, title="Generic", tooltip="Generic tooltip", inline="gen", group="Generic")
plot(length)
plot(enabled ? 1 : 0)
plot(mode == "EMA" ? 1 : 0)
plot(ratio)
plot(color.r(tint))
plot(color.g(tint))
plot(color.b(tint))
plot(color.t(tint))
plot(tf == "60" ? 1 : 0)
plot(src)
plot(sess == "0930-1600" ? 1 : 0)
plot(start)
plot(sym == "NASDAQ:AAPL" ? 1 : 0)
plot(generic)`,
    rule: 'TradingView v6 Inputs: group, tooltip, inline, display, active and confirm are UI/input-dialog metadata; input calls still return the configured value or defval in script execution. https://www.tradingview.com/pine-script-docs/concepts/inputs/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 5),
    expectedOutputs: (bars) => [
      constantVector(bars, 5),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1.5),
      constantVector(bars, 12),
      constantVector(bars, 34),
      constantVector(bars, 56),
      constantVector(bars, 40),
      constantVector(bars, 1),
      bars.map((bar) => bar.open),
      constantVector(bars, 1),
      constantVector(bars, 1_700_000_000_000),
      constantVector(bars, 1),
      constantVector(bars, 3),
    ],
    outputMembers: [
      ['input.int'],
      ['input.bool'],
      ['input.string'],
      ['input.float'],
      ['input.color', 'color.r'],
      ['input.color', 'color.g'],
      ['input.color', 'color.b'],
      ['input.color', 'color.t'],
      ['input.timeframe'],
      ['input.source'],
      ['input.session'],
      ['input.time'],
      ['input.symbol'],
      ['input'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'priority.input-declaration-qualifier-metadata-values',
    namespace: 'input',
    pine: `//@version=6
indicator("priority input declaration qualifier metadata")
input int length = input.int(defval=5, title="Length", minval=1, maxval=10, step=1, group="Signals", inline="a", tooltip="Length", display=display.data_window, active=true), input bool enabled = input.bool(defval=true, title="Enabled", group="Signals", inline="a", tooltip="Enabled", display=display.status_line, active=true), input string mode = input.string(defval="fast", title="Mode", options=["fast", "slow"], group="Signals", inline="b", tooltip="Mode", display=display.data_window, active=true)
input float ratio = input.float(defval=1.25, title="Ratio", minval=0.5, maxval=2.5, step=0.25, group="Signals", inline="b", tooltip="Ratio", display=display.status_line, active=true), input color tint = input.color(defval=color.rgb(20, 40, 60, 25), title="Tint", group="Style", inline="c", tooltip="Tint", display=display.data_window, active=true)
plot(length)
plot(enabled ? 1 : 0)
plot(mode == "fast" ? 1 : 0)
plot(ratio)
plot(color.r(tint))
plot(color.g(tint))
plot(color.b(tint))
plot(color.t(tint))`,
    officialMembers: ['input.int', 'input.bool', 'input.string', 'input.float', 'input.color', 'color.r', 'color.g', 'color.b', 'color.t'],
    outputMembers: [
      ['input.int'],
      ['input.bool'],
      ['input.string'],
      ['input.float'],
      ['input.color', 'color.r'],
      ['input.color', 'color.g'],
      ['input.color', 'color.b'],
      ['input.color', 'color.t'],
    ],
    rule: 'TradingView v6 Inputs and Type system: input-qualified declarations can be initialized from input.* calls; group, inline, tooltip, display, and active are input UI/display metadata and do not change the returned defval in headless script execution. https://www.tradingview.com/pine-script-docs/concepts/inputs/ https://www.tradingview.com/pine-script-docs/language/type-system/',
    expected: (bars) => constantVector(bars, 5),
    expectedOutputs: (bars) => [
      constantVector(bars, 5),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1.25),
      constantVector(bars, 20),
      constantVector(bars, 40),
      constantVector(bars, 60),
      constantVector(bars, 25),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'priority.input-confirm-display-edge-values',
    namespace: 'input',
    pine: `//@version=6
enum Choice
    one
    two
indicator("priority input confirm display edge values")
generic = input(defval=7, title="Generic", display=display.data_window, active=true)
flag = input.bool(defval=false, title="Flag", confirm=true)
length = input.int(defval=2, title="Length", confirm=true)
name = input.string(defval="alpha", title="Name", confirm=true)
ratio = input.float(defval=2.5, title="Ratio", confirm=true)
tint = input.color(defval=color.rgb(1, 2, 3), title="Tint", confirm=true)
notes = input.text_area(defval="memo", title="Notes", group="Text", inline="txt", tooltip="Notes", display=display.status_line, active=true, confirm=true)
choice = input.enum(defval=Choice.two, title="Choice", options=[Choice.one, Choice.two], group="Enum", inline="e", tooltip="Choice", display=display.data_window, active=true, confirm=true)
level = input.price(defval=101.5, title="Level", group="Price", inline="p", tooltip="Level", display=display.data_window, active=true, confirm=true)
plot(generic)
plot(flag ? 1 : 0)
plot(length)
plot(name == "alpha" ? 1 : 0)
plot(ratio)
plot(color.r(tint))
plot(notes == "memo" ? 1 : 0)
plot(choice == Choice.two ? 1 : 0)
plot(level)`,
    officialMembers: ['input', 'input.bool', 'input.int', 'input.string', 'input.float', 'input.color', 'input.text_area', 'input.enum', 'input.price', 'color.r'],
    outputMembers: [
      ['input'],
      ['input.bool'],
      ['input.int'],
      ['input.string'],
      ['input.float'],
      ['input.color', 'color.r'],
      ['input.text_area'],
      ['input.enum'],
      ['input.price'],
    ],
    rule: 'TradingView v6 Inputs: confirm requests user confirmation before adding an indicator, and group/inline/tooltip/display/active are input UI metadata; when no user override is supplied, these slots do not change the runtime value returned by the input call. https://www.tradingview.com/pine-script-docs/concepts/inputs/',
    expected: (bars) => constantVector(bars, 7),
    expectedOutputs: (bars) => [
      constantVector(bars, 7),
      constantVector(bars, 0),
      constantVector(bars, 2),
      constantVector(bars, 1),
      constantVector(bars, 2.5),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 101.5),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'priority.input-context-metadata-values',
    namespace: 'input',
    pine: `//@version=6
indicator("priority input context metadata values")
tf = input.timeframe(defval="D", title="Timeframe", active=true)
src = input.source(defval=high, title="Source", confirm=true)
start = input.time(defval=1700000100000, title="Start", display=display.data_window, active=true)
sess = input.session(defval="0000-2359", title="Session", display=display.status_line, active=true)
sym = input.symbol(defval="NASDAQ:MSFT", title="Symbol", display=display.data_window)
plot(tf == "D" ? 1 : 0)
plot(src)
plot(start)
plot(sess == "0000-2359" ? 1 : 0)
plot(sym == "NASDAQ:MSFT" ? 1 : 0)`,
    officialMembers: ['input.timeframe', 'input.source', 'input.time', 'input.session', 'input.symbol'],
    outputMembers: [
      ['input.timeframe'],
      ['input.source'],
      ['input.time'],
      ['input.session'],
      ['input.symbol'],
    ],
    rule: 'TradingView v6 Inputs: input.timeframe/source/time/session/symbol return their configured value or source series; active, display, and confirm are input UI/display metadata and do not change the runtime value returned by the input call. https://www.tradingview.com/pine-script-docs/concepts/inputs/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => [
      constantVector(bars, 1),
      bars.map((bar) => bar.high),
      constantVector(bars, 1_700_000_100_000),
      constantVector(bars, 1),
      constantVector(bars, 1),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'version.v4-security-raw-lookahead-true',
    namespace: 'version',
    pine: `//@version=4
study("v4 raw security lookahead")
value = security("TEST", "D", close, lookahead=true)
plot(value)`,
    rule: 'TradingView v5 migration guide: v4 allowed raw equivalents for unique constants, while v5 requires named constants such as barmerge.lookahead_on/off. In a v4-declared script, lookahead=true is the legacy raw value for lookahead-on. https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/',
    expected: () => [12, 12, 14, 14, 16, 16],
    outputMembers: [['security']],
    bars: REQUEST_CHART_BARS,
    options: () => ({ requestDatafeed: requestDatafeed() }),
  },
  {
    id: 'version.v4-default-session-days-weekdays',
    namespace: 'version',
    pine: `//@version=4
study("v4 default session days")
plot(not na(time(timeframe.period, "0930-1600", "UTC")) ? 1 : 0)`,
    rule: 'TradingView v5 migration guide: default session day masks changed in v5 from weekdays to all days. A v4 bare session string therefore excludes Sunday unless the day mask is explicit. https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/',
    expected: () => [0, 1, 1],
    outputMembers: [['time']],
    bars: VERSION_RULE_SESSION_BARS,
  },
  {
    id: 'version.v4-strategy-exit-noop-allowed',
    namespace: 'version',
    pine: `//@version=4
strategy("v4 no-op strategy exit")
strategy.exit("noop")
plot(close)`,
    rule: 'TradingView v5 migration guide: the requirement that strategy.exit() calls must have an effectful parameter was introduced in v5, so a v4 no-op exit remains accepted. https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/',
    expected: (bars) => bars.map((bar) => bar.close),
    outputMembers: [['strategy.exit'], ['close']],
    bars: HOSTILE_BARS,
  },
  {
    id: 'version.v4-offset-allowed',
    namespace: 'version',
    pine: `//@version=4
study("v4 offset")
plot(offset(close, 1))`,
    rule: 'TradingView v5 migration guide: offset() was removed in v5 and replaced by the history-referencing operator. A v4-declared script still accepts offset(close, 1) as close[1]. https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/ https://www.tradingview.com/pine-script-docs/language/operators/',
    expected: (bars) => previousValue(bars, (bar) => bar.close),
    outputMembers: [['offset']],
    bars: HOSTILE_BARS,
  },
  {
    id: 'version.v5-generic-input-type-rejected',
    namespace: 'version',
    pine: `//@version=5
indicator("v5 generic input type")
len = input(5, type=input.integer)
plot(len)`,
    rule: 'TradingView v5 migration guide: v5 split input() into typed input.*() functions and the old input.* type constants are not valid type arguments for generic input(). https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/',
    expected: nullVector,
    expectedDiagnostics: ['input.integer'],
    outputMembers: [['input']],
    bars: HOSTILE_BARS,
  },
  {
    id: 'version.v5-global-sma-rejected',
    namespace: 'version',
    pine: `//@version=5
indicator("v5 global sma")
plot(sma(close, 2))`,
    rule: 'TradingView v5 migration guide: v5 moved TA functions into namespaces, so declared-v5 scripts must use ta.sma() instead of the v4 global sma() alias. https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/',
    expected: nullVector,
    expectedDiagnostics: ['sma'],
    outputMembers: [['sma']],
    bars: HOSTILE_BARS,
  },
  {
    id: 'version.v4-untyped-na-declaration-rejected',
    namespace: 'version',
    pine: `//@version=4
study("v4 untyped na declaration")
x = na
plot(na(x) ? 1 : 0)`,
    rule: 'TradingView v4 migration guide: a variable initialized with na must have an explicit type or otherwise provide type context. https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-4/',
    expected: nullVector,
    expectedDiagnostics: ['na'],
    outputMembers: [['na']],
    bars: HOSTILE_BARS,
  },
  {
    id: 'version.v3-bool-to-number-rejected',
    namespace: 'version',
    pine: `//@version=3
study("v3 bool to number")
plot((close > open) + 1)`,
    rule: 'TradingView v3 migration guide: boolean values are no longer implicitly converted to numeric values for arithmetic in v3. https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-3/',
    expected: nullVector,
    expectedDiagnostics: ['bool'],
    outputMembers: [['bool']],
    bars: HOSTILE_BARS,
  },
  {
    id: 'runtime.currency-constants-values',
    namespace: 'currency',
    pine: `//@version=6
indicator("currency constants values")
${CURRENCY_CODES.map((code) => `plot(currency.${code} == "${code}" ? 1 : 0)`).join('\n')}`,
    rule: 'TradingView v6 Reference: currency.* constants are string currency identifiers used by strategy declarations and request currency arguments. https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => CURRENCY_CODES.map(() => constantVector(bars, 1)),
    outputMembers: CURRENCY_CODES.map((code) => [`currency.${code}`]),
    bars: HOSTILE_BARS,
  },
  {
    id: 'runtime.color-constants-values',
    namespace: 'color',
    pine: `//@version=6
indicator("color constants values")
${COLOR_CONSTANT_CODES.map(([name]) => `plot(color.r(color.${name}) * 1000000 + color.g(color.${name}) * 1000 + color.b(color.${name}))`).join('\n')}`,
    rule: 'TradingView v6 Colors: the 17 predefined color constants have documented hexadecimal/RGB values. https://www.tradingview.com/pine-script-docs/visuals/colors/#constant-colors',
    expected: (bars) => constantVector(
      bars,
      rgbCode(COLOR_CONSTANT_CODES[0][1], COLOR_CONSTANT_CODES[0][2], COLOR_CONSTANT_CODES[0][3]),
    ),
    expectedOutputs: (bars) => COLOR_CONSTANT_CODES.map(([_name, red, green, blue]) =>
      constantVector(bars, rgbCode(red, green, blue))),
    bars: HOSTILE_BARS,
  },
  ...COLOR_CONSTANT_CODES.map(([name, red, green, blue]) => ({
    id: `property.single.color.${name}`,
    namespace: 'color',
    pine: pine(`color.r(color.${name}) == ${red} and color.g(color.${name}) == ${green} and color.b(color.${name}) == ${blue} ? 1 : 0`),
    officialMembers: [`color.${name}`],
    outputMembers: [[`color.${name}`]],
    rule: `TradingView v6 Colors: color.${name} is one of the 17 predefined color constants with the documented RGB value (${red}, ${green}, ${blue}). https://www.tradingview.com/pine-script-docs/visuals/colors/#constant-colors https://www.tradingview.com/pine-script-reference/v6/#var_color.${name}`,
    expected: (bars: Bar[]) => constantVector(bars, 1),
    bars: HOSTILE_BARS,
  })),
  singleTargetNumericConstantCase(
    'dayofweek.monday',
    2,
    'TradingView v6 Time: dayofweek.monday is the documented numeric day-of-week constant for Monday. https://www.tradingview.com/pine-script-docs/concepts/time/ https://www.tradingview.com/pine-script-reference/v6/#var_dayofweek.monday',
  ),
  singleTargetNumericConstantCase(
    'dayofweek.tuesday',
    3,
    'TradingView v6 Time: dayofweek.tuesday is the documented numeric day-of-week constant for Tuesday. https://www.tradingview.com/pine-script-docs/concepts/time/ https://www.tradingview.com/pine-script-reference/v6/#var_dayofweek.tuesday',
  ),
  singleTargetNumericConstantCase(
    'display.all',
    31,
    'TradingView v6 Reference: display.all is the display bitmask containing all documented display locations. https://www.tradingview.com/pine-script-reference/v6/#var_display.all',
  ),
  singleTargetNumericConstantCase(
    'display.data_window',
    2,
    'TradingView v6 Reference: display.data_window is the display bitmask for the Data Window. https://www.tradingview.com/pine-script-reference/v6/#var_display.data_window',
  ),
  singleTargetNumericConstantCase(
    'display.none',
    0,
    'TradingView v6 Reference: display.none is the display bitmask that hides the output. https://www.tradingview.com/pine-script-reference/v6/#var_display.none',
  ),
  singleTargetNumericConstantCase(
    'display.pane',
    1,
    'TradingView v6 Reference: display.pane is the display bitmask for the chart pane. https://www.tradingview.com/pine-script-reference/v6/#var_display.pane',
  ),
  singleTargetNumericConstantCase(
    'display.pine_screener',
    16,
    'TradingView v6 Reference: display.pine_screener is the display bitmask for Pine Screener output. https://www.tradingview.com/pine-script-reference/v6/#var_display.pine_screener',
  ),
  singleTargetNumericConstantCase(
    'display.price_scale',
    8,
    'TradingView v6 Reference: display.price_scale is the display bitmask for the price scale. https://www.tradingview.com/pine-script-reference/v6/#var_display.price_scale',
  ),
  singleTargetNumericConstantCase(
    'display.status_line',
    4,
    'TradingView v6 Reference: display.status_line is the display bitmask for the status line. https://www.tradingview.com/pine-script-reference/v6/#var_display.status_line',
  ),
  {
    id: 'host-default.syminfo-shape',
    namespace: 'runtime',
    pine: `//@version=6
indicator("host default syminfo shape")
allowedType = syminfo.type == "stock" or syminfo.type == "futures" or syminfo.type == "index" or syminfo.type == "forex" or syminfo.type == "crypto" or syminfo.type == "fund" or syminfo.type == "dr" or syminfo.type == "cfd" or syminfo.type == "bond" or syminfo.type == "warrant" or syminfo.type == "structured" or syminfo.type == "right"
allowedVolume = syminfo.volumetype == "base" or syminfo.volumetype == "quote" or syminfo.volumetype == "tick" or syminfo.volumetype == "n/a"
plot(syminfo.mintick == syminfo.minmove / syminfo.pricescale ? 1 : 0)
plot(syminfo.mintick > 0 ? 1 : 0)
plot(syminfo.pricescale > 0 ? 1 : 0)
plot(syminfo.pointvalue > 0 ? 1 : 0)
plot(syminfo.mincontract > 0 ? 1 : 0)
plot(allowedType ? 1 : 0)
plot(allowedVolume ? 1 : 0)`,
    rule: 'TradingView v6 Chart information: syminfo.mintick is derived as minmove / pricescale; mincontract and pointvalue are positive instrument metadata; syminfo.type and syminfo.volumetype use documented string domains, while exact values depend on the chart instrument. https://www.tradingview.com/pine-script-docs/concepts/chart-information/#symbol-information',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => Array.from({ length: 7 }, () => constantVector(bars, 1)),
    outputMembers: [
      ['syminfo.mintick', 'syminfo.minmove', 'syminfo.pricescale'],
      ['syminfo.mintick'],
      ['syminfo.pricescale'],
      ['syminfo.pointvalue'],
      ['syminfo.mincontract'],
      ['syminfo.type'],
      ['syminfo.volumetype'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'host-default.timeframe-shape',
    namespace: 'runtime',
    pine: `//@version=6
indicator("host default timeframe shape")
unitCount = (timeframe.isticks ? 1 : 0) + (timeframe.isseconds ? 1 : 0) + (timeframe.isminutes ? 1 : 0) + (timeframe.isdaily ? 1 : 0) + (timeframe.isweekly ? 1 : 0) + (timeframe.ismonthly ? 1 : 0)
plot(str.length(timeframe.period) > 0 ? 1 : 0)
plot(timeframe.multiplier > 0 ? 1 : 0)
plot(unitCount == 1 ? 1 : 0)
plot(timeframe.isintraday == (timeframe.isticks or timeframe.isseconds or timeframe.isminutes) ? 1 : 0)
plot(timeframe.isdwm == (timeframe.isdaily or timeframe.isweekly or timeframe.ismonthly) ? 1 : 0)
plot(not na(timeframe.in_seconds(timeframe.period)) ? 1 : 0)`,
    rule: 'TradingView v6 Timeframes and Chart information: timeframe.period is a valid timeframe string, multiplier is a positive simple int, timeframe.is* flags classify that string, and timeframe.in_seconds() converts a valid timeframe to seconds. The exact hostless fallback timeframe is not documented. https://www.tradingview.com/pine-script-docs/concepts/timeframes/ https://www.tradingview.com/pine-script-docs/concepts/chart-information/#chart-timeframe',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => Array.from({ length: 6 }, () => constantVector(bars, 1)),
    outputMembers: [
      ['timeframe.period'],
      ['timeframe.multiplier'],
      ['timeframe.isticks', 'timeframe.isseconds', 'timeframe.isminutes', 'timeframe.isdaily', 'timeframe.isweekly', 'timeframe.ismonthly'],
      ['timeframe.isintraday', 'timeframe.isticks', 'timeframe.isseconds', 'timeframe.isminutes'],
      ['timeframe.isdwm', 'timeframe.isdaily', 'timeframe.isweekly', 'timeframe.ismonthly'],
      ['timeframe.in_seconds', 'timeframe.period'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'host-default.chart-shape',
    namespace: 'runtime',
    pine: `//@version=6
indicator("host default chart shape")
chartTypeCount = (chart.is_standard ? 1 : 0) + (chart.is_renko ? 1 : 0) + (chart.is_heikinashi ? 1 : 0) + (chart.is_linebreak ? 1 : 0) + (chart.is_kagi ? 1 : 0) + (chart.is_pnf ? 1 : 0) + (chart.is_range ? 1 : 0)
plot(color.r(chart.bg_color) >= 0 and color.r(chart.bg_color) <= 255 ? 1 : 0)
plot(color.g(chart.bg_color) >= 0 and color.g(chart.bg_color) <= 255 ? 1 : 0)
plot(color.b(chart.bg_color) >= 0 and color.b(chart.bg_color) <= 255 ? 1 : 0)
plot(chartTypeCount == 1 ? 1 : 0)
plot(not na(chart.left_visible_bar_time) ? 1 : 0)
plot(not na(chart.right_visible_bar_time) ? 1 : 0)
plot(chart.left_visible_bar_time <= chart.right_visible_bar_time ? 1 : 0)`,
    rule: 'TradingView v6 Chart information: chart.bg_color and chart.fg_color are color values, chart.is_* booleans classify chart type, and visible-bar fields are UNIX timestamps. The exact background, type, and visible range are host chart properties, so hostless fallback can only be shape-checked without a trace. https://www.tradingview.com/pine-script-docs/concepts/chart-information/#chart-type-and-color',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => Array.from({ length: 7 }, () => constantVector(bars, 1)),
    outputMembers: [
      ['chart.bg_color', 'color.r'],
      ['chart.bg_color', 'color.g'],
      ['chart.bg_color', 'color.b'],
      ['chart.is_standard', 'chart.is_renko', 'chart.is_heikinashi', 'chart.is_linebreak', 'chart.is_kagi', 'chart.is_pnf', 'chart.is_range'],
      ['chart.left_visible_bar_time'],
      ['chart.right_visible_bar_time'],
      ['chart.left_visible_bar_time', 'chart.right_visible_bar_time'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'host-default.session-shape',
    namespace: 'runtime',
    pine: `//@version=6
indicator("host default session shape")
sessionStateCount = (session.ismarket ? 1 : 0) + (session.ispremarket ? 1 : 0) + (session.ispostmarket ? 1 : 0)
plot(sessionStateCount <= 1 ? 1 : 0)
plot(str.length(syminfo.session) > 0 ? 1 : 0)
plot(syminfo.session == session.regular or syminfo.session == session.extended or syminfo.session == "24h" or syminfo.session == "24x7" ? 1 : 0)`,
    rule: 'TradingView v6 Chart information and Sessions: syminfo.session stores the chart dataset session setting, session.regular/session.extended are named session constants, and market/premarket/postmarket state variables classify the current bar. Exact session values depend on the chart instrument and session setting. https://www.tradingview.com/pine-script-docs/concepts/chart-information/#session-information https://www.tradingview.com/pine-script-docs/concepts/sessions/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => Array.from({ length: 3 }, () => constantVector(bars, 1)),
    outputMembers: [
      ['session.ismarket', 'session.ispremarket', 'session.ispostmarket'],
      ['syminfo.session'],
      ['syminfo.session', 'session.regular', 'session.extended'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'host-default.chart-fg-color-light-background',
    namespace: 'runtime',
    pine: `//@version=6
indicator("host default foreground color")
plot(color.r(chart.fg_color))
plot(color.g(chart.fg_color))
plot(color.b(chart.fg_color))`,
    rule: 'TradingView v6 Chart information: chart.fg_color is #0f0f0f for light backgrounds and #dbdbdb for dark backgrounds. TealScript hostless fallback background is white, so the documented foreground value is #0f0f0f. https://www.tradingview.com/pine-script-docs/concepts/chart-information/#chart-type-and-color',
    expected: (bars) => constantVector(bars, 15),
    expectedOutputs: (bars) => [
      constantVector(bars, 15),
      constantVector(bars, 15),
      constantVector(bars, 15),
    ],
    outputMembers: [
      ['chart.fg_color', 'color.r'],
      ['chart.fg_color', 'color.g'],
      ['chart.fg_color', 'color.b'],
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'runtime.syminfo-values',
    namespace: 'syminfo',
    pine: `//@version=6\nindicator("syminfo values")\nplot(syminfo.mintick)\nplot(syminfo.pricescale)\nplot(syminfo.minmove)\nplot(syminfo.ticker == "BINANCE:BTCUSDT" ? 1 : 0)\nplot(syminfo.currency == "USDT" and syminfo.basecurrency == "BTC" ? 1 : 0)`,
    rule: 'TradingView v6 Chart information: syminfo.* variables expose the current symbol metadata supplied by the host chart. https://www.tradingview.com/pine-script-docs/concepts/chart-information/',
    expected: (bars) => constantVector(bars, 0.1),
    expectedOutputs: (bars) => [
      constantVector(bars, 0.1),
      constantVector(bars, 10),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
    ],
    outputMembers: [
      ['syminfo.mintick'],
      ['syminfo.pricescale'],
      ['syminfo.minmove'],
      ['syminfo.ticker'],
      ['syminfo.currency', 'syminfo.basecurrency'],
    ],
    bars: HOSTILE_BARS,
    options: () => RUNTIME_METADATA_OPTIONS,
  },
  {
    id: 'runtime.syminfo-metadata-values',
    namespace: 'syminfo',
    pine: `//@version=6\nindicator("syminfo metadata values")\nplot(syminfo.tickerid == "BINANCE:BTCUSDT" ? 1 : 0)\nplot(syminfo.prefix == "BINANCE" ? 1 : 0)\nplot(syminfo.root == "BTCUSDT" ? 1 : 0)\nplot(syminfo.description == "Bitcoin TetherUS" ? 1 : 0)\nplot(syminfo.type == "crypto" ? 1 : 0)\nplot(syminfo.session == "24x7" ? 1 : 0)\nplot(syminfo.timezone == "Etc/UTC" ? 1 : 0)\nplot(syminfo.pointvalue)\nplot(syminfo.mincontract)\nplot(syminfo.volumetype == "base" ? 1 : 0)\nplot(syminfo.country == "US" ? 1 : 0)\nplot(syminfo.sector == "Technology" ? 1 : 0)`,
    rule: 'TradingView v6 Chart information: syminfo.* variables expose host-supplied symbol metadata and can be used directly in script conditions and calculations. https://www.tradingview.com/pine-script-docs/concepts/chart-information/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => [
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 0.001),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
    ],
    outputMembers: [
      ['syminfo.tickerid'],
      ['syminfo.prefix'],
      ['syminfo.root'],
      ['syminfo.description'],
      ['syminfo.type'],
      ['syminfo.session'],
      ['syminfo.timezone'],
      ['syminfo.pointvalue'],
      ['syminfo.mincontract'],
      ['syminfo.volumetype'],
      ['syminfo.country'],
      ['syminfo.sector'],
    ],
    bars: HOSTILE_BARS,
    options: () => RUNTIME_METADATA_OPTIONS,
  },
  {
    id: 'runtime.syminfo-provider-metadata-values',
    namespace: 'runtime',
    pine: `//@version=6
indicator("syminfo provider metadata values")
plot(syminfo.main_tickerid == "BINANCE:BTCUSDT" ? 1 : 0)
plot(syminfo.exchange == "BINANCE" ? 1 : 0)
plot(syminfo.current_contract == "" ? 1 : 0)
plot(syminfo.employees)
plot(syminfo.shareholders)
plot(syminfo.shares_outstanding_float)
plot(syminfo.shares_outstanding_total)
plot(syminfo.target_price_date)
plot(syminfo.target_price_average)
plot(syminfo.target_price_estimates)
plot(syminfo.target_price_high)
plot(syminfo.target_price_low)
plot(syminfo.target_price_median)
plot(syminfo.expiration_date)
plot(syminfo.isin == "TESTISIN" ? 1 : 0)
plot(syminfo.industry == "Crypto" ? 1 : 0)`,
    rule: 'TradingView v6 Chart information: syminfo.* variables expose symbol metadata supplied by the host chart, including exchange identity, contract identity, shares/employees, analyst target fields, expiration, ISIN, and industry fields. https://www.tradingview.com/pine-script-docs/concepts/chart-information/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => [
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 0),
      constantVector(bars, 0),
      constantVector(bars, 0),
      constantVector(bars, 0),
      constantVector(bars, 0),
      constantVector(bars, 0),
      constantVector(bars, 0),
      constantVector(bars, 0),
      constantVector(bars, 0),
      constantVector(bars, 0),
      constantVector(bars, 0),
      constantVector(bars, 1),
      constantVector(bars, 1),
    ],
    outputMembers: [
      ['syminfo.main_tickerid'],
      ['syminfo.prefix'],
      ['syminfo.current_contract'],
      ['syminfo.employees'],
      ['syminfo.shareholders'],
      ['syminfo.shares_outstanding_float'],
      ['syminfo.shares_outstanding_total'],
      ['syminfo.target_price_date'],
      ['syminfo.target_price_average'],
      ['syminfo.target_price_estimates'],
      ['syminfo.target_price_high'],
      ['syminfo.target_price_low'],
      ['syminfo.target_price_median'],
      ['syminfo.expiration_date'],
      ['syminfo.isin'],
      ['syminfo.industry'],
    ],
    bars: HOSTILE_BARS,
    options: () => RUNTIME_METADATA_OPTIONS,
  },
  {
    id: 'runtime.chart-context-values',
    namespace: 'runtime',
    pine: `//@version=6
indicator("chart context values")
plot(color.r(chart.bg_color))
plot(color.g(chart.bg_color))
plot(color.b(chart.fg_color))
plot(chart.left_visible_bar_time)
plot(chart.right_visible_bar_time)
plot(chart.right_visible_bar_time - chart.left_visible_bar_time)
plot(chart.is_standard ? 1 : 0)
plot(chart.is_renko ? 1 : 0)
plot(chart.is_heikinashi ? 1 : 0)
plot(chart.is_linebreak ? 1 : 0)
plot(chart.is_kagi ? 1 : 0)
plot(chart.is_pnf ? 1 : 0)
plot(chart.is_range ? 1 : 0)`,
    rule: 'TradingView v6 Chart information: chart.* variables expose host chart colors, visible bar times, and chart-type flags. https://www.tradingview.com/pine-script-docs/concepts/chart-information/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 16),
    expectedOutputs: (bars) => [
      constantVector(bars, 16),
      constantVector(bars, 32),
      constantVector(bars, 239),
      constantVector(bars, BARS[2]!.time),
      constantVector(bars, BARS[8]!.time),
      constantVector(bars, BARS[8]!.time - BARS[2]!.time),
      constantVector(bars, 0),
      constantVector(bars, 0),
      constantVector(bars, 0),
      constantVector(bars, 0),
      constantVector(bars, 1),
      constantVector(bars, 0),
      constantVector(bars, 0),
    ],
    outputMembers: [
      ['color.r'],
      ['color.g'],
      ['color.b'],
      ['chart.left_visible_bar_time'],
      ['chart.right_visible_bar_time'],
      ['chart.right_visible_bar_time', 'chart.left_visible_bar_time'],
      ['chart.is_standard'],
      ['chart.is_renko'],
      ['chart.is_heikinashi'],
      ['chart.is_linebreak'],
      ['chart.is_kagi'],
      ['chart.is_pnf'],
      ['chart.is_range'],
    ],
    bars: BARS,
    options: () => CHART_CONTEXT_OPTIONS,
  },
  {
    id: 'runtime.timeframe-values',
    namespace: 'timeframe',
    pine: `//@version=6\nindicator("timeframe values")\nplot(timeframe.period == "5" ? 1 : 0)\nplot(timeframe.main_period == "5" ? 1 : 0)\nplot(timeframe.multiplier)\nplot(timeframe.isminutes and timeframe.isintraday ? 1 : 0)\nplot(timeframe.in_seconds())`,
    rule: 'TradingView v6 Chart information and Timeframes: timeframe.* variables expose the chart timeframe, and timeframe.in_seconds() converts the supplied or current timeframe to seconds. https://www.tradingview.com/pine-script-docs/concepts/chart-information/ https://www.tradingview.com/pine-script-docs/concepts/timeframes/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => [
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 5),
      constantVector(bars, 1),
      constantVector(bars, 300),
    ],
    outputMembers: [
      ['timeframe.period'],
      ['timeframe.main_period'],
      ['timeframe.multiplier'],
      ['timeframe.isminutes', 'timeframe.isintraday'],
      ['timeframe.in_seconds'],
    ],
    bars: HOSTILE_BARS,
    options: () => RUNTIME_METADATA_OPTIONS,
  },
  {
    id: 'runtime.timeframe-conversion-change-values',
    namespace: 'timeframe',
    pine: `//@version=6\nindicator("timeframe conversion change values")\nplot(timeframe.period == "60" ? 1 : 0)\nplot(timeframe.multiplier)\nplot(timeframe.isminutes ? 1 : 0)\nplot(timeframe.isdwm ? 1 : 0)\nplot(timeframe.isdaily ? 1 : 0)\nplot(timeframe.isweekly ? 1 : 0)\nplot(timeframe.ismonthly ? 1 : 0)\nplot(timeframe.isseconds ? 1 : 0)\nplot(timeframe.isticks ? 1 : 0)\nplot(timeframe.to_seconds("2D"))\nplot(timeframe.from_seconds(90) == "2" ? 1 : 0)\nplot(timeframe.change("D") ? 1 : 0)`,
    rule: 'TradingView v6 Timeframes: timeframe boolean variables classify the chart timeframe, to_seconds()/in_seconds() convert timeframe strings to seconds, from_seconds() returns the smallest valid timeframe string covering the supplied seconds, and timeframe.change() is true when the containing requested timeframe period changes. https://www.tradingview.com/pine-script-docs/concepts/timeframes/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => [
      constantVector(bars, 1),
      constantVector(bars, 60),
      constantVector(bars, 1),
      constantVector(bars, 0),
      constantVector(bars, 0),
      constantVector(bars, 0),
      constantVector(bars, 0),
      constantVector(bars, 0),
      constantVector(bars, 0),
      constantVector(bars, 172_800),
      constantVector(bars, 1),
      bars.map((_bar, index) => index === 0 ? 1 : 0),
    ],
    outputMembers: [
      ['timeframe.period'],
      ['timeframe.multiplier'],
      ['timeframe.isminutes'],
      ['timeframe.isdwm'],
      ['timeframe.isdaily'],
      ['timeframe.isweekly'],
      ['timeframe.ismonthly'],
      ['timeframe.isseconds'],
      ['timeframe.isticks'],
      ['timeframe.in_seconds'],
      ['timeframe.from_seconds'],
      ['timeframe.change'],
    ],
    bars: SESSION_BARS,
    options: () => SESSION_OPTIONS,
  },
  {
    id: 'runtime.ticker-transform-values',
    namespace: 'ticker',
    pine: `//@version=6\nindicator("ticker transform values")\nstandard = ticker.standard(syminfo.tickerid)\nmodified = ticker.modify("BINANCE:BTCUSDT", session=session.extended, adjustment=adjustment.dividends, backadjustment=backadjustment.on, settlement_as_close=settlement_as_close.on)\nplot(standard == "BINANCE:BTCUSDT" ? 1 : 0)\nplot(str.contains(modified, "session=extended") ? 1 : 0)\nplot(str.contains(modified, "adjustment=dividends") ? 1 : 0)\nplot(str.contains(modified, "backadjustment=on") ? 1 : 0)\nplot(str.contains(modified, "settlement_as_close=on") ? 1 : 0)`,
    rule: 'TradingView v6 Non-standard charts data: ticker.standard() removes ticker modifiers and ticker.modify() applies requested session, adjustment, backadjustment and settlement_as_close modifiers to the returned ticker identifier. https://www.tradingview.com/pine-script-docs/concepts/non-standard-charts-data/ https://www.tradingview.com/pine-script-reference/v6/#fun_ticker.modify',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => [
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
    ],
    bars: HOSTILE_BARS,
    options: () => RUNTIME_METADATA_OPTIONS,
  },
  {
    id: 'runtime.calendar-fields',
    namespace: 'time',
    pine: `//@version=6\nindicator("calendar fields")\nplot(year == 2024 ? 1 : 0)\nplot(month == 1 ? 1 : 0)\nplot(dayofweek == dayofweek.monday or dayofweek == dayofweek.tuesday ? 1 : 0)\nplot(hour)\nplot(minute)\nplot(second)`,
    rule: 'TradingView v6 Time: calendar variables such as year, month, dayofweek, hour, minute and second derive from each bar timestamp in the exchange timezone. https://www.tradingview.com/pine-script-docs/concepts/time/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: () => [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
      [9, 16, 10],
      [30, 30, 5],
      [15, 45, 30],
    ],
    outputMembers: [
      ['year'],
      ['month'],
      ['dayofweek'],
      ['hour'],
      ['minute'],
      ['second'],
    ],
    bars: CALENDAR_BARS,
    options: () => SESSION_OPTIONS,
  },
  {
    id: 'runtime.timestamp-and-time-values',
    namespace: 'time',
    pine: `//@version=6\nindicator("timestamp and time values")\nplot(time)\nplot(timestamp("Etc/UTC", 2024, 1, 2, 10, 5, 30))\nplot(not na(time(timeframe.period, "0930-1600", "Etc/UTC")) ? 1 : 0)`,
    rule: 'TradingView v6 Time: `time` is the current bar opening UNIX timestamp, timestamp() builds UNIX timestamps in the supplied timezone, and time(timeframe, session, timezone) returns na outside the requested session. https://www.tradingview.com/pine-script-docs/concepts/time/ https://www.tradingview.com/pine-script-reference/v6/#fun_time',
    expected: (bars) => bars.map((bar) => bar.time),
    expectedOutputs: () => [
      CALENDAR_BARS.map((bar) => bar.time),
      constantVector(CALENDAR_BARS, Date.UTC(2024, 0, 2, 10, 5, 30)),
      [1, 0, 1],
    ],
    outputMembers: [
      ['time'],
      ['timestamp'],
      ['time'],
    ],
    bars: CALENDAR_BARS,
    options: () => SESSION_OPTIONS,
  },
  {
    id: 'runtime.session-state-values',
    namespace: 'session',
    pine: `//@version=6\nindicator("session state values")\nplot(session.ismarket ? 1 : 0)\nplot(session.ispremarket ? 1 : 0)\nplot(session.ispostmarket ? 1 : 0)\nplot(session.isfirstbar_regular ? 1 : 0)\nplot(session.islastbar_regular ? 1 : 0)`,
    rule: 'TradingView v6 Sessions: session state variables classify the current bar against regular, premarket and postmarket session windows. https://www.tradingview.com/pine-script-docs/concepts/sessions/',
    expected: () => [0, 1, 1, 0],
    expectedOutputs: () => [
      [0, 1, 1, 0],
      [1, 0, 0, 0],
      [0, 0, 0, 1],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
    ],
    outputMembers: [
      ['session.ismarket'],
      ['session.ispremarket'],
      ['session.ispostmarket'],
      ['session.isfirstbar_regular'],
      ['session.islastbar_regular'],
    ],
    bars: SESSION_BARS,
    options: () => SESSION_OPTIONS,
  },
  { id: 'var.persistence', namespace: 'runtime', pine: `//@version=6\nindicator("var vector")\nvar float running = 0.0\nrunning += close\nplot(running)`, expected: persistentSum },
  { id: 'varip.persistence', namespace: 'runtime', pine: `//@version=6\nindicator("varip vector")\nvarip float running = 0.0\nrunning += close\nplot(running)`, expected: persistentSum },
  {
    id: 'language.local-history',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("local history vector")\nvalue = close + open\nplot(value[1])`,
    expected: (bars) => previousValue(bars, (bar) => bar.close + bar.open),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.expression-history',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("expression history vector")\nplot((close + open)[1])`,
    expected: (bars) => previousValue(bars, (bar) => bar.close + bar.open),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.dynamic-history-offset',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("dynamic history offset vector")\noffset = close > 0 ? 2 : 1\nplot(close[offset])`,
    expected: (bars) => bars.map((bar, index) => {
      const offset = bar.close > 0 ? 2 : 1;
      return index < offset ? null : bars[index - offset]!.close;
    }),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.global-history-offset-boundaries',
    namespace: 'runtime',
    pine: `//@version=6
indicator("global history offset boundaries")
n = bar_index + close
plot(bar_index[1])
plot(n[1])
plot(last_bar_index[1])
plot(bar_index[99])
plot(n[-1])
plot(last_bar_index[1.9])`,
    rule: 'TradingView v6 Operators: the history operator reads the value of a series on previous bars; unavailable history returns na. Numeric history offsets select bar counts, with fractional offsets truncated toward zero before selecting history and negative offsets unavailable. https://www.tradingview.com/pine-script-docs/language/operators/ https://www.tradingview.com/pine-script-docs/concepts/chart-information/',
    expected: (bars) => previousValue(bars, (_bar, index) => index),
    expectedOutputs: (bars) => [
      previousValue(bars, (_bar, index) => index),
      previousValue(bars, (bar, index) => index + bar.close),
      previousValue(bars, () => bars.length - 1),
      nullVector(bars),
      nullVector(bars),
      previousValue(bars, () => bars.length - 1),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.dynamic-history-max-bars-back-na',
    namespace: 'runtime',
    pine: `//@version=6
indicator("dynamic history max bars back na", max_bars_back=1)
offset = bar_index == 3 ? na : 1
value = close[offset]
plot(value)
plot(na(value) ? 1 : 0)`,
    rule: 'TradingView v6 Operators and max_bars_back: max_bars_back declares required history depth, and a dynamic history offset evaluating to na produces unavailable history as na rather than JavaScript undefined. https://www.tradingview.com/pine-script-docs/language/operators/ https://www.tradingview.com/pine-script-reference/v6/#fun_max_bars_back',
    expected: (bars) => bars.map((_bar, index) => index === 0 || index === 3 ? null : bars[index - 1]!.close),
    expectedOutputs: (bars) => [
      bars.map((_bar, index) => index === 0 || index === 3 ? null : bars[index - 1]!.close),
      bars.map((_bar, index) => index === 0 || index === 3 ? 1 : 0),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.function-result-history',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("function result history vector")\nshifted() => close + 1\nplot(shifted()[1])`,
    expected: (bars) => previousValue(bars, (bar) => bar.close + 1),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.function-result-history-call-sites',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("function result history call sites")\nshifted(series float source) => source + 1\nplot(shifted(close)[1])\nplot(shifted(open)[1])`,
    rule: 'TradingView v6 Operators: [] applies after a function call. TradingView v6 UDFs: each written function call has independent history. https://www.tradingview.com/pine-script-docs/language/operators/ https://www.tradingview.com/pine-script-docs/language/user-defined-functions/',
    expected: (bars) => previousValue(bars, (bar) => bar.close + 1),
    expectedOutputs: (bars) => [
      previousValue(bars, (bar) => bar.close + 1),
      previousValue(bars, (bar) => bar.open + 1),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.nested-expression-history-offset2',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("nested expression history offset 2")\nplot((close * 2 + open)[2])`,
    rule: 'TradingView v6 Operators: [] applies after an expression, and the offset selects the expression value on a previous bar. https://www.tradingview.com/pine-script-docs/language/operators/',
    expected: (bars) => previousNthValue(bars, 2, (bar) => bar.close * 2 + bar.open),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.tuple-destructured-history',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("tuple destructured history")\npair() => [close + 1, open + 2]\n[a, b] = pair()\nplot(a[1])\nplot(b[1])`,
    rule: 'TradingView v6 Variable declarations: tuple declarations assign each returned item to a variable. Operators: [] on each variable reads its previous series value. https://www.tradingview.com/pine-script-docs/language/variable-declarations/ https://www.tradingview.com/pine-script-docs/language/operators/',
    expected: (bars) => previousValue(bars, (bar) => bar.close + 1),
    expectedOutputs: (bars) => [
      previousValue(bars, (bar) => bar.close + 1),
      previousValue(bars, (bar) => bar.open + 2),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.if-expression-history',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("if expression history")\nvalue = if close > open\n    close\nelse\n    open\nplot(value[1])`,
    rule: 'TradingView v6 Conditional structures: if can return a value assigned to a variable. Operators: [] reads that variable series on prior bars. https://www.tradingview.com/pine-script-docs/language/conditional-structures/ https://www.tradingview.com/pine-script-docs/language/operators/',
    expected: (bars) => previousValue(bars, (bar) => bar.close > bar.open ? bar.close : bar.open),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.switch-expression-history',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("switch expression history")\nvalue = switch\n    close > 0 => close\n    close < 0 => open\n    => high\nplot(value[1])`,
    rule: 'TradingView v6 Conditional structures: switch can return a value assigned to a variable. Operators: [] reads that variable series on prior bars. https://www.tradingview.com/pine-script-docs/language/conditional-structures/ https://www.tradingview.com/pine-script-docs/language/operators/',
    expected: (bars) => previousValue(bars, (bar) => bar.close > 0 ? bar.close : bar.close < 0 ? bar.open : bar.high),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.for-loop-history-sum',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("for loop history sum")\nfloat total = 0.0\nfor i = 0 to 2\n    total += close[i]\nplot(total)`,
    rule: 'TradingView v6 Loops: for loop bodies execute sequentially and can update outer variables. Operators: missing history values are na, so arithmetic using them yields na. https://www.tradingview.com/pine-script-docs/language/loops/ https://www.tradingview.com/pine-script-docs/language/operators/',
    expected: (bars) => bars.map((_bar, index) => index < 2 ? null : bars[index]!.close + bars[index - 1]!.close + bars[index - 2]!.close),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.for-loop-break-history-search',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("for loop break history search")\nfloat found = na\nfor i = 0 to 3\n    if close[i] < 0\n        found := close[i]\n        break\nplot(found)`,
    rule: 'TradingView v6 Loops: break exits a loop immediately. Operators: close[i] reads prior bar values, with unavailable history as na. https://www.tradingview.com/pine-script-docs/language/loops/ https://www.tradingview.com/pine-script-docs/language/operators/',
    expected: (bars) => bars.map((_bar, index) => {
      for (let offset = 0; offset <= 3; offset += 1) {
        if (index < offset) continue;
        const value = bars[index - offset]!.close;
        if (value < 0) return value;
      }
      return null;
    }),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.for-loop-continue-history-sum',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("for loop continue history sum")\nfloat total = 0.0\nfor i = 0 to 3\n    if i == 1\n        continue\n    total += nz(close[i])\nplot(total)`,
    rule: 'TradingView v6 Loops: continue skips the rest of the current loop iteration. Operators: [] reads history, and nz() replaces na with zero. https://www.tradingview.com/pine-script-docs/language/loops/ https://www.tradingview.com/pine-script-docs/language/operators/',
    expected: (bars) => bars.map((_bar, index) => [0, 2, 3].reduce((sum, offset) =>
      sum + (index < offset ? 0 : bars[index - offset]!.close), 0)),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.while-loop-history-sum',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("while loop history sum")\nfloat total = 0.0\nint i = 0\nwhile i < 3\n    total += close[i]\n    i += 1\nplot(total)`,
    rule: 'TradingView v6 Loops: while loop bodies execute until the condition is false and can update outer variables. Missing history values used in arithmetic yield na. https://www.tradingview.com/pine-script-docs/language/loops/ https://www.tradingview.com/pine-script-docs/language/operators/',
    expected: (bars) => bars.map((_bar, index) => index < 2 ? null : bars[index]!.close + bars[index - 1]!.close + bars[index - 2]!.close),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.while-loop-break-history-search',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("while loop break history search")\nfloat found = na\nint i = 0\nwhile i < 4\n    if close[i] < 0\n        found := close[i]\n        break\n    i += 1\nplot(found)`,
    rule: 'TradingView v6 Loops: while loops execute until their condition is false, and break exits immediately. Operators: [] reads prior bar values, with unavailable history as na. https://www.tradingview.com/pine-script-docs/language/loops/ https://www.tradingview.com/pine-script-docs/language/operators/',
    expected: (bars) => bars.map((_bar, index) => {
      for (let offset = 0; offset <= 3; offset += 1) {
        if (index < offset) continue;
        const value = bars[index - offset]!.close;
        if (value < 0) return value;
      }
      return null;
    }),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.nested-var-call-sites',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("nested var call sites")\nremember(series float source) =>\n    float out = na\n    if source != 0\n        var float first = source\n        out := first\n    out\nplot(remember(close))\nplot(remember(open))`,
    rule: 'TradingView v6 Variable declarations: var initializes once on first execution of its block. UDF docs: each written call has independent local scope/history. https://www.tradingview.com/pine-script-docs/language/variable-declarations/ https://www.tradingview.com/pine-script-docs/language/user-defined-functions/',
    expected: (bars) => bars.map((bar) => bar.close === 0 ? null : bars[1]!.close),
    expectedOutputs: (bars) => [
      bars.map((bar) => bar.close === 0 ? null : bars[1]!.close),
      bars.map((bar) => bar.open === 0 ? null : bars[1]!.open),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.udf-var-loop-call-sites',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("UDF var loop call sites")\naccumulate(series float source) =>\n    var float total = 0.0\n    for i = 0 to 1\n        total += source\n    total\nplot(accumulate(close))\nplot(accumulate(open))`,
    rule: 'TradingView v6 UDFs: each written call has independent local scope/history. Variable declarations: var persists after first initialization. Loops/history apply inside that per-call scope. https://www.tradingview.com/pine-script-docs/language/user-defined-functions/ https://www.tradingview.com/pine-script-docs/language/variable-declarations/ https://www.tradingview.com/pine-script-docs/language/loops/',
    expected: (bars) => persistentSeries(bars, (bar) => bar.close * 2),
    expectedOutputs: (bars) => [
      persistentSeries(bars, (bar) => bar.close * 2),
      persistentSeries(bars, (bar) => bar.open * 2),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.sparse-udf-call-site-history',
    namespace: 'runtime',
    pine: `//@version=6
indicator("sparse UDF call-site history")
step(series float source) =>
    value = source + 1
    value[1]
called = close > 0 ? step(close) : na
plot(called)`,
    rule: 'TradingView v6 UDFs: every written function call establishes an independent call site, and function-local series history is created through successive calls to that function. Operators: [] reads the previous value in that call-site series, so bars where the call is skipped do not add a function-history slot. https://www.tradingview.com/pine-script-docs/language/user-defined-functions/ https://www.tradingview.com/pine-script-docs/language/operators/',
    expected: (bars) => {
      let previousCallValue: number | null = null;
      return bars.map((bar) => {
        if (bar.close <= 0) return null;
        const current = bar.close + 1;
        const result = previousCallValue;
        previousCallValue = current;
        return result;
      });
    },
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.udt-history-field-read',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("UDT history field read")\ntype Pair\n    float price\n    float basis\nmakePair() => Pair.new(close, open)\npair = makePair()\nplot((pair[1]).price)\nplot((pair[1]).basis)`,
    rule: 'TradingView v6 migration rules disallow history directly on UDT fields and require referencing object history first, e.g. (myUDT[10]).fieldName. https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/',
    expected: (bars) => previousValue(bars, (bar) => bar.close),
    expectedOutputs: (bars) => [
      previousValue(bars, (bar) => bar.close),
      previousValue(bars, (bar) => bar.open),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.udt-method-resolution',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("UDT method resolution")\ntype Wrap\n    float value\nmethod add(Wrap this, float amount) => this.value + amount\nwrap = Wrap.new(close)\nplot(wrap.add(open))`,
    rule: 'TradingView v6 Methods: methods are specialized functions associated with a receiver type and can be called with receiver.method(args). https://www.tradingview.com/pine-script-docs/language/methods/',
    expected: (bars) => bars.map((bar) => bar.close + bar.open),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.udt-field-var-persistence',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("UDT field var persistence")\ntype Holder\n    float total\nvar Holder holder = Holder.new(0.0)\nholder.total += close\nplot(holder.total)`,
    rule: 'TradingView v6 Objects are values with fields; var initializes the variable once and preserves its value across bars. Field reassignment updates the persistent object variable. https://www.tradingview.com/pine-script-docs/language/objects/ https://www.tradingview.com/pine-script-docs/language/variable-declarations/',
    expected: persistentSum,
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.method-result-history',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("method result history")\ntype Wrap\n    float value\nmethod add(Wrap this, float amount) => this.value + amount\nwrap = Wrap.new(close)\nplot(wrap.add(open)[1])`,
    rule: 'TradingView v6 Operators: [] applies after a function call. Methods are functions with receiver-call syntax, so method-call results form a series that can be history-referenced. https://www.tradingview.com/pine-script-docs/language/operators/ https://www.tradingview.com/pine-script-docs/language/methods/',
    expected: (bars) => previousValue(bars, (bar) => bar.close + bar.open),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.method-local-var-call-sites',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("method local var call sites")\ntype Wrap\n    float value\nmethod accumulate(Wrap this, series float source) =>\n    var float total = 0.0\n    total += this.value + source\n    total\nwrap = Wrap.new(close)\nplot(wrap.accumulate(open))\nplot(wrap.accumulate(high))`,
    rule: 'TradingView v6 Methods are functions with receiver-call syntax, and UDF local history/state is independent for each written call. Variable declarations: var persists after first initialization. https://www.tradingview.com/pine-script-docs/language/methods/ https://www.tradingview.com/pine-script-docs/language/user-defined-functions/ https://www.tradingview.com/pine-script-docs/language/variable-declarations/',
    expected: (bars) => persistentSeries(bars, (bar) => bar.close + bar.open),
    expectedOutputs: (bars) => [
      persistentSeries(bars, (bar) => bar.close + bar.open),
      persistentSeries(bars, (bar) => bar.close + bar.high),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.udt-method-result-field-history',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("UDT method result field history")\ntype Wrap\n    float value\nmethod shifted(Wrap this, series float source) => Wrap.new(this.value + source)\nwrap = Wrap.new(close)\nplot((wrap.shifted(open)[1]).value)`,
    rule: 'TradingView v6 Methods are functions with receiver-call syntax. UDT history rules require referencing object history before field access, and Operators: [] can apply to a method call returning the object series. https://www.tradingview.com/pine-script-docs/language/methods/ https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/ https://www.tradingview.com/pine-script-docs/language/operators/',
    expected: (bars) => previousValue(bars, (bar) => bar.close + bar.open),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.negative-modulo-floor-quotient',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("negative modulo")\nplot(-5 % 3)\nplot(5 % -3)\nplot(-5 % -3)\nplot(5 % 3)`,
    rule: 'TradingView v6 Operators: the % operator calculates a modulo as a - b * math.floor(a / b), so negative operands use floor-quotient modulo rather than JavaScript truncated remainder. This vector is discriminating because all three negative-operand plots differ under JavaScript %. https://www.tradingview.com/pine-script-docs/language/operators/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => [
      constantVector(bars, 1),
      constantVector(bars, -1),
      constantVector(bars, -2),
      constantVector(bars, 2),
    ],
    bars: HOSTILE_BARS,
    discriminationProof: {
      assertedLength: 'bar-count',
      mutations: ['flip-first-value'],
    },
  },
  {
    id: 'language.negative-modulo-v7-forward-clamps-to-v6',
    namespace: 'runtime',
    pine: `//@version=7\nindicator("negative modulo v7")\nplot(-5 % 3)\nplot(5 % -3)\nplot(-5 % -3)\nplot(5 % 3)`,
    rule: 'TealScript accepts forward Pine declarations by applying the v6 rule set to versions >= 6; TradingView v6 Operators define % as a - b * math.floor(a / b), so declared v7 must not fall back to JavaScript %. This vector is discriminating because all three negative-operand plots differ under JavaScript %. https://www.tradingview.com/pine-script-docs/language/operators/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => [
      constantVector(bars, 1),
      constantVector(bars, -1),
      constantVector(bars, -2),
      constantVector(bars, 2),
    ],
    bars: HOSTILE_BARS,
    discriminationProof: {
      assertedLength: 'bar-count',
      mutations: ['flip-first-value'],
    },
  },
  {
    id: 'language.operator-rejects-string-arithmetic',
    namespace: 'semantic',
    pine: `//@version=6\nindicator("invalid string arithmetic")\nplot("5" - 2)`,
    rule: 'TradingView v6 Operators and Type system: arithmetic operators require numeric operands except that + concatenates two strings; Pine does not implicitly cast strings to numbers. This vector is discriminating because JavaScript would coerce "5" - 2 to 3 instead of refusing it. https://www.tradingview.com/pine-script-docs/language/operators/ https://www.tradingview.com/pine-script-docs/language/type-system/',
    expected: (bars) => bars.map(() => null),
    expectedDiagnostics: ['invalid-operator-operands'],
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.operator-rejects-string-number-plus',
    namespace: 'semantic',
    pine: `//@version=6\nindicator("invalid mixed plus")\nplot("price: " + close)`,
    rule: 'TradingView v6 Operators and Type system: + concatenates strings only when both operands are strings; Pine does not implicitly stringify numeric operands. This vector is discriminating because JavaScript would stringify close and produce a string instead of refusing the mixed operands. https://www.tradingview.com/pine-script-docs/language/operators/ https://www.tradingview.com/pine-script-docs/language/type-system/',
    expected: (bars) => bars.map(() => null),
    expectedDiagnostics: ['invalid-operator-operands'],
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.operator-rejects-ordered-string-comparison',
    namespace: 'semantic',
    pine: `//@version=6\nindicator("invalid ordered string comparison")\nplot("b" > "a" ? 1 : 0)`,
    rule: 'TradingView v6 Operators: ordered comparison operators require numerical operands, while equality/inequality are the comparison operators that support non-numeric fundamental values. This vector is discriminating because JavaScript would evaluate "b" > "a" as true instead of refusing it. https://www.tradingview.com/pine-script-docs/language/operators/',
    expected: (bars) => bars.map(() => null),
    expectedDiagnostics: ['invalid-operator-operands'],
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.operator-rejects-non-bool-logical-v6',
    namespace: 'semantic',
    pine: `//@version=6\nindicator("invalid logical string")\nplot((close > open and "yes") ? 1 : 0)`,
    rule: 'TradingView v6 Operators and Type system: logical operators operate on bool operands; v6 no longer allows implicit casts from non-bool values in boolean contexts. This vector is discriminating because JavaScript would treat a non-empty string as truthy instead of refusing it. https://www.tradingview.com/pine-script-docs/language/operators/ https://www.tradingview.com/pine-script-docs/language/type-system/',
    expected: (bars) => bars.map(() => null),
    expectedDiagnostics: ['invalid-operator-operands'],
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.v5-comparison-na-result-is-na',
    namespace: 'runtime',
    pine: `//@version=5\nindicator("v5 comparison na result")\nx = close[10]\nplot(na(x == 1) ? 1 : 0)\nplot(na(x != 1) ? 1 : 0)\nplot(na(x > 1) ? 1 : 0)\nplot((x == 1) ? 1 : 0)\nplot((x != 1) ? 1 : 0)\nplot((x > 1) ? 1 : 0)`,
    rule: 'TradingView v5 Operators: comparison operations can return bool true, false, or na when operands are numeric; v5 conditional rules and the v6 migration guide say boolean na casts false in bool contexts. This vector is discriminating because na(comparison) must observe the legacy bool na while the truthiness plots remain false under both the correct and collapsed-false models. https://www.tradingview.com/pine-script-docs/v5/language/operators/ https://www.tradingview.com/pine-script-docs/v5/language/conditional-structures/ https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/',
    expected: (bars) => bars.map((_bar, index) => index < 10 ? 1 : 0),
    expectedOutputs: (bars) => [
      bars.map((_bar, index) => index < 10 ? 1 : 0),
      bars.map((_bar, index) => index < 10 ? 1 : 0),
      bars.map((_bar, index) => index < 10 ? 1 : 0),
      constantVector(bars, 0),
      bars.map((_bar, index) => index < 10 ? 0 : 1),
      bars.map((_bar, index) => index < 10 ? 0 : bars[index - 10]!.close > 1 ? 1 : 0),
    ],
    bars: HOSTILE_BARS,
    discriminationProof: {
      assertedLength: 'bar-count',
      mutations: ['flip-first-value'],
    },
  },
  {
    id: 'language.bool-history-missing-is-false',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("bool history missing false")\nflag = close > open\nplot(flag[1] ? 1 : 0)`,
    rule: 'TradingView v6 Type system: bool expressions cannot be na; history that has no available bool value returns false. https://www.tradingview.com/pine-script-docs/language/type-system/',
    expected: (bars) => bars.map((_bar, index) => index === 0 ? 0 : bars[index - 1]!.close > bars[index - 1]!.open ? 1 : 0),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.if-bool-no-branch-is-false',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("if bool no branch false")\nflag = if close > 100\n    close > open\nplot(flag ? 1 : 0)`,
    rule: 'TradingView v6 Type system: if expressions returning bool return false when no local block executes. https://www.tradingview.com/pine-script-docs/language/type-system/',
    expected: (bars) => constantVector(bars, 0),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.if-number-no-branch-is-na',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("if number no branch na")\nvalue = if close > 100\n    close\nplot(value)`,
    rule: 'TradingView v6 Conditional structures: if expressions without an executed local block return na unless the result is bool, where v6 uses false. https://www.tradingview.com/pine-script-docs/language/conditional-structures/ https://www.tradingview.com/pine-script-docs/language/type-system/',
    expected: (bars) => bars.map(() => null),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.float-accepts-int-expression',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("float accepts int expression")\nint count = bar_index\nfloat widened = count\nplot(widened)`,
    rule: 'TradingView v6 Type system: int values can be automatically cast to float values, but not the reverse. https://www.tradingview.com/pine-script-docs/language/type-system/',
    expected: (bars) => bars.map((_bar, index) => index),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.for-loop-return-expression',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("for loop return expression")\nvalue = for i = 0 to 2\n    close[i]\nplot(value)`,
    rule: 'TradingView v6 Loops: loops can return a value; the return value is the last evaluated expression in the final iteration. https://www.tradingview.com/pine-script-docs/language/loops/',
    expected: (bars) => previousNthValue(bars, 2, (bar) => bar.close),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.while-loop-return-expression',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("while loop return expression")\nint i = 0\nvalue = while i < 3\n    i += 1\n    close[i - 1]\nplot(value)`,
    rule: 'TradingView v6 Loops: while loops can return a value; the return value is the last evaluated expression before the condition becomes false. https://www.tradingview.com/pine-script-docs/language/loops/',
    expected: (bars) => previousNthValue(bars, 2, (bar) => bar.close),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.switch-local-var-result',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("switch local var result")\nvalue = switch\n    close > 0 =>\n        local = close + open\n        local\n    =>\n        local = high - low\n        local\nplot(value)`,
    rule: 'TradingView v6 Conditional structures: switch local blocks can contain statements and return the final expression as the branch result. https://www.tradingview.com/pine-script-docs/language/conditional-structures/',
    expected: (bars) => bars.map((bar) => bar.close > 0 ? bar.close + bar.open : bar.high - bar.low),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.udf-var-first-execution-per-branch',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("UDF var first execution branch")\nremember(series float source) =>\n    float out = na\n    if source > 0\n        var float firstPositive = source\n        out := firstPositive\n    else if source < 0\n        var float firstNegative = source\n        out := firstNegative\n    out\nplot(remember(close))`,
    rule: 'TradingView v6 Variable declarations: var variables in local blocks initialize the first time their declaration executes, then preserve that value. https://www.tradingview.com/pine-script-docs/language/variable-declarations/',
    expected: (bars) => bars.map((bar) => bar.close > 0 ? 2 : bar.close < 0 ? -2 : null),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.var-initializes-once',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("var initializes once vector")\nvar float firstClose = close\nplot(firstClose)`,
    expected: (bars) => constantVector(bars, bars[0]!.close),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.udf-var-initializes-per-call-site',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("UDF var init call sites")\nfirst(series float source) =>\n    var float firstValue = source\n    firstValue\ncloseFirst = first(close)\nopenFirst = first(open)\nplot(closeFirst)\nplot(openFirst)`,
    expected: (bars) => constantVector(bars, bars[0]!.close),
    expectedOutputs: (bars) => [
      constantVector(bars, bars[0]!.close),
      constantVector(bars, bars[0]!.open),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.udf-param-shadows-builtin',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("UDF parameter shadow vector")\nshadow(series float close) => close + 1\nplot(shadow(open))`,
    expected: (bars) => bars.map((bar) => bar.open + 1),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.udf-param-history-call-sites',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("UDF parameter history call sites")\nprevious(series float source) => source[1]\nplot(previous(close))\nplot(previous(open))`,
    expected: (bars) => previousValue(bars, (bar) => bar.close),
    expectedOutputs: (bars) => [
      previousValue(bars, (bar) => bar.close),
      previousValue(bars, (bar) => bar.open),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.udf-local-shadows-outer',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("UDF local shadow vector")\nvalue = 100.0\nshadow() =>\n    value = close\n    value\nplot(shadow())\nplot(value)`,
    expected: (bars) => bars.map((bar) => bar.close),
    expectedOutputs: (bars) => [bars.map((bar) => bar.close), constantVector(bars, 100)],
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.udf-local-history-call-sites',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("UDF local history call sites")\nprevious(series float source) =>\n    value = source\n    value[1]\nclosePrevious = previous(close)\nopenPrevious = previous(open)\nplot(closePrevious)\nplot(openPrevious)`,
    expected: (bars) => previousValue(bars, (bar) => bar.close),
    expectedOutputs: (bars) => [
      previousValue(bars, (bar) => bar.close),
      previousValue(bars, (bar) => bar.open),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.udf-local-shadow-history',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("UDF local shadow history")\nshadow() =>\n    high = close + 10\n    high[1]\nplot(shadow())`,
    expected: (bars) => previousValue(bars, (bar) => bar.close + 10),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.udf-varip-call-sites',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("UDF varip call sites")\naccumulate(series float source) =>\n    varip float total = 0.0\n    total += source\n    total\ncloseTotal = accumulate(close)\nopenTotal = accumulate(open)\nplot(closeTotal)\nplot(openTotal)`,
    expected: (bars) => persistentSeries(bars, (bar) => bar.close),
    expectedOutputs: (bars) => [
      persistentSeries(bars, (bar) => bar.close),
      persistentSeries(bars, (bar) => bar.open),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.conditional-var-first-execution',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("conditional var first execution")\nfloat out = na\nif close > 0\n    var float firstPositive = close\n    out := firstPositive\nplot(out)`,
    expected: (bars) => {
      let firstPositive: number | null = null;
      return bars.map((bar) => {
        if (bar.close <= 0) return null;
        firstPositive = firstPositive ?? bar.close;
        return firstPositive;
      });
    },
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.block-local-var-name-scope',
    namespace: 'runtime',
    pine: `//@version=6
indicator("block local var name scope")
var float total = 100.0
float branch = na
if close > 0
    var float total = 0.0
    total += close
    branch := total
plot(branch)
plot(total)`,
    rule: 'TradingView v6 Variable declarations: each local block establishes a distinct scope; `var` initializes once on the first execution of its own declaration and then persists in that scoped variable, not in an outer variable with the same name. https://www.tradingview.com/pine-script-docs/language/variable-declarations/ https://www.tradingview.com/pine-script-docs/language/execution-model/',
    expected: (bars) => {
      let innerTotal = 0;
      return bars.map((bar) => {
        if (bar.close <= 0) return null;
        innerTotal += bar.close;
        return innerTotal;
      });
    },
    expectedOutputs: (bars) => {
      let innerTotal = 0;
      return [
        bars.map((bar) => {
          if (bar.close <= 0) return null;
          innerTotal += bar.close;
          return innerTotal;
        }),
        constantVector(bars, 100),
      ];
    },
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.root-if-local-shadows-builtin-history',
    namespace: 'runtime',
    pine: `//@version=6
indicator("root if local shadows builtin history")
value = if bar_index >= 0
    n = close + 10
    n[1]
else
    na
plot(value)`,
    rule: 'TradingView v6 Conditional structures: if local blocks can declare local variables and return their final expression. Variable declarations and scoping make the local `n` the identifier in that block. Operators: [] reads that local series history, not a same-named built-in fallback. https://www.tradingview.com/pine-script-docs/language/conditional-structures/ https://www.tradingview.com/pine-script-docs/language/variable-declarations/ https://www.tradingview.com/pine-script-docs/language/operators/',
    expected: (bars) => previousValue(bars, (bar) => bar.close + 10),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.nested-if-local-shadows-builtin-history',
    namespace: 'runtime',
    pine: `//@version=6
indicator("nested if local shadows builtin history")
value = if bar_index >= 0
    if close > -100
        n = close + 20
        n[1]
    else
        na
else
    na
plot(value)`,
    rule: 'TradingView v6 Conditional structures can nest local if blocks whose final expression returns a value. Variable declarations are scoped to their local block, so the nested local `n[1]` reads that local series history rather than a built-in fallback. https://www.tradingview.com/pine-script-docs/language/conditional-structures/ https://www.tradingview.com/pine-script-docs/language/variable-declarations/ https://www.tradingview.com/pine-script-docs/language/operators/',
    expected: (bars) => previousValue(bars, (bar) => bar.close + 20),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.if-branch-local-shadows-builtin-current',
    namespace: 'runtime',
    pine: `//@version=6
indicator("if branch local shadows builtin current")
value = if close > 0
    n = close + 30
    n
else
    bar_index
plot(value)`,
    rule: 'TradingView v6 Conditional structures: each branch local block can return its final expression. A variable declared in one branch is scoped to that branch and shadows outer or built-in names only there; the other branch resolves its own expression independently. https://www.tradingview.com/pine-script-docs/language/conditional-structures/ https://www.tradingview.com/pine-script-docs/language/variable-declarations/',
    expected: (bars) => bars.map((bar, index) => bar.close > 0 ? bar.close + 30 : index),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.conditional-local-shadows-builtin-current',
    namespace: 'runtime',
    pine: `//@version=6
indicator("conditional local shadows builtin current")
value = if close > 0
    n = close + 40
    n
else
    na
plot(value)`,
    rule: 'TradingView v6 Conditional structures can return `na` when no numeric branch value is produced. Inside the executed branch, a local declaration shadows built-in names and its final expression returns the local value. https://www.tradingview.com/pine-script-docs/language/conditional-structures/ https://www.tradingview.com/pine-script-docs/language/variable-declarations/',
    expected: (bars) => bars.map((bar) => bar.close > 0 ? bar.close + 40 : null),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.block-local-var-shadows-builtin-current',
    namespace: 'runtime',
    pine: `//@version=6
indicator("block local var shadows builtin current")
var float n = 1000.0
value = if close > 0
    var float n = 0.0
    n += close
    n
else
    na
plot(value)
plot(n)`,
    rule: 'TradingView v6 Variable declarations: `var` initializes once on first execution of its own declaration and persists in that declaration scope. A block-local `var n` is distinct from an outer `var n` or built-in fallback with the same name. https://www.tradingview.com/pine-script-docs/language/variable-declarations/ https://www.tradingview.com/pine-script-docs/language/conditional-structures/',
    expected: (bars) => {
      let inner = 0;
      return bars.map((bar) => {
        if (bar.close <= 0) return null;
        inner += bar.close;
        return inner;
      });
    },
    expectedOutputs: (bars) => {
      let inner = 0;
      return [
        bars.map((bar) => {
          if (bar.close <= 0) return null;
          inner += bar.close;
          return inner;
        }),
        constantVector(bars, 1000),
      ];
    },
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.reassigned-local-history',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("reassigned local history")\nvalue = close\nvalue := value + open\nplot(value[1])`,
    rule: 'TradingView v6 Variable declarations: `=` declares a variable and `:=` reassigns it; Operators: [] reads the variable series value from prior bars. https://www.tradingview.com/pine-script-docs/language/variable-declarations/ https://www.tradingview.com/pine-script-docs/language/operators/',
    expected: (bars) => previousValue(bars, (bar) => bar.close + bar.open),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.ternary-expression-history',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("ternary expression history")\nplot((close > open ? close : open)[1])`,
    rule: 'TradingView v6 Operators: the history operator can apply to an expression and selects that expression value from a previous bar. https://www.tradingview.com/pine-script-docs/language/operators/',
    expected: (bars) => previousValue(bars, (bar) => bar.close > bar.open ? bar.close : bar.open),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.array-method-result-history',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("array method result history")\nvar array<float> values = array.new_float()\nvalues.push(close)\nplot(values.get(values.size() - 1)[1])`,
    rule: 'TradingView v6 Methods: namespace functions can use method-call syntax with the receiver as first argument; Operators: [] applies after a function/method call result. https://www.tradingview.com/pine-script-docs/language/methods/ https://www.tradingview.com/pine-script-docs/language/operators/',
    expected: (bars) => previousValue(bars, (bar) => bar.close),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.udf-returned-udt-field-history',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("UDF returned UDT field history")\ntype Wrap\n    float value\nmakeWrap(series float source) => Wrap.new(source)\nplot((makeWrap(close)[1]).value)`,
    rule: 'TradingView v6 UDT history rules require referencing object history before field access; Operators: [] can apply to a function call returning the object series. https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/ https://www.tradingview.com/pine-script-docs/language/operators/',
    expected: (bars) => previousValue(bars, (bar) => bar.close),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.enum-display-string-values',
    namespace: 'language',
    pine: `//@version=6
indicator("enum display string values")
enum State
    On = "ON"
    Off = "OFF"
plot(State.On == State.On ? 1 : 0)
plot(State.Off == State.On ? 1 : 0)`,
    rule: 'TradingView v6 Enums: enum members can include optional string titles used in dropdown menus; enum identity remains the member, not the title string. https://www.tradingview.com/pine-script-docs/language/enums/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => [
      constantVector(bars, 1),
      constantVector(bars, 0),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.switch-arm-arrow-continuation-values',
    namespace: 'language',
    pine: `//@version=5
indicator("switch arrow continuation values")
f(x) =>
    switch
        x > 0
            => 1
        => 0
plot(f(close))`,
    rule: 'TradingView v5/v6 Conditional structures: switch arms can return values from local blocks, and Pine line wrapping permits continuation indentation before the arm expression. https://www.tradingview.com/pine-script-docs/language/conditional-structures/',
    expected: (bars) => bars.map((bar) => bar.close > 0 ? 1 : 0),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.switch-arm-tuple-local-values',
    namespace: 'language',
    pine: `//@version=5
indicator("switch arm tuple local values")
pair() => [1, 2]
value = switch close > open
    true =>
        [a, b] = pair()
        a + b
    => 0
plot(value)`,
    rule: 'TradingView v6 Variable declarations and Conditional structures: tuple declarations assign multiple returned values, and switch arms can contain local blocks whose final expression is the arm value. https://www.tradingview.com/pine-script-docs/language/variable-declarations/ https://www.tradingview.com/pine-script-docs/language/conditional-structures/',
    expected: (bars) => bars.map((bar) => bar.close > bar.open ? 3 : 0),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.block-boundary-unary-return-values',
    namespace: 'language',
    pine: `//@version=6
indicator("block boundary unary return values")
f(series float source) =>
    float basis = ta.sma(source, 2)
    -basis
plot(f(close))`,
    rule: `TradingView v6 User-defined functions and Operators: a multiline UDF returns the result of its final statement, and a leading \`-\` on its own line is unary negation of that expression, not a continuation of the previous variable initializer. The ta.sma value follows the published arithmetic moving-average formula. https://www.tradingview.com/pine-script-docs/language/user-defined-functions/ https://www.tradingview.com/pine-script-docs/language/operators/ ${TA_SMA_FORMULA_CITATION}`,
    expected: (bars) => sma(bars, 2).map((value) => value === null ? null : -value),
    bars: HOSTILE_BARS,
    discriminationProof: {
      ...TA_MOVING_AVERAGE_SEED_DISCRIMINATION,
      helperFormulaCitation: TA_SMA_FORMULA_CITATION,
    },
  },
  {
    id: 'language.block-boundary-for-body-values',
    namespace: 'language',
    pine: `//@version=6
indicator("block boundary for body values")
total = 0
for i = 0 to 2
    total += 1
total += 10
plot(total)`,
    rule: 'TradingView v6 Loops and Line wrapping: indentation defines the loop local block; the dedented statement after the `for` block executes once after the loop, not once per iteration. https://www.tradingview.com/pine-script-docs/language/loops/ https://www.tradingview.com/pine-script-docs/language/script-structure/',
    expected: (bars) => constantVector(bars, 13),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.block-boundary-switch-nested-if-values',
    namespace: 'language',
    pine: `//@version=6
indicator("block boundary switch nested if values")
value = switch
    close > 0 =>
        if close > 1
            7
        else
            5
    => 3
plot(value)`,
    rule: 'TradingView v6 Conditional structures: switch arms can return local-block results, and an if expression nested in a selected arm supplies that arm value without absorbing the following default arm. https://www.tradingview.com/pine-script-docs/language/conditional-structures/',
    expected: (bars) => bars.map((bar) => bar.close > 0 ? (bar.close > 1 ? 7 : 5) : 3),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.drawing-receiver-method-named-values',
    namespace: 'language',
    pine: `//@version=6
indicator("drawing receiver method named values", overlay=true)
var label marker = label.new(bar_index, close, text="seed")
if barstate.islast
    marker.set_y(y=high)
plot(marker.get_y())`,
    rule: 'TradingView v6 Methods: namespace functions can use method-call syntax with the receiver as first argument, so label.set_y(id, y) and id.set_y(y=...) bind the same y parameter. https://www.tradingview.com/pine-script-docs/language/methods/',
    expected: (bars) => bars.map((bar, index) => index === bars.length - 1 ? bar.high : bars[0]!.close),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.multi-declaration-values',
    namespace: 'language',
    pine: `//@version=6
indicator("multi declaration values")
first = close + 1, second = open + 2
plot(first * 10 + second)`,
    rule: 'TradingView v6 Variable declarations: a comma-separated declaration statement declares each variable from its own initializer. https://www.tradingview.com/pine-script-docs/language/variable-declarations/',
    expected: (bars) => bars.map((bar) => (bar.close + 1) * 10 + (bar.open + 2)),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.call-continuation-values',
    namespace: 'language',
    pine: `//@version=6
indicator("call continuation values")
plot(
    close > open ? high : low,
    title="Selected"
)`,
    rule: 'TradingView v6 Script structure: wrapped function-call arguments belong to the call, and Conditional structures: ternaries select one of the two branch expressions. https://www.tradingview.com/pine-script-docs/language/script-structure/ https://www.tradingview.com/pine-script-docs/language/operators/',
    expected: (bars) => bars.map((bar) => bar.close > bar.open ? bar.high : bar.low),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.switch-parenthesized-discriminant-values',
    namespace: 'language',
    pine: `//@version=6
indicator("switch parenthesized discriminant values")
value = switch (close > open ? 1 : -1)
    1 => high
    -1 => low
    => close
plot(value)`,
    rule: 'TradingView v6 Conditional structures: switch can compare value arms against a discriminant expression; Operators: parentheses group the discriminant expression without changing its value. https://www.tradingview.com/pine-script-docs/language/conditional-structures/ https://www.tradingview.com/pine-script-docs/language/operators/',
    expected: (bars) => bars.map((bar) => bar.close > bar.open ? bar.high : bar.low),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.assignment-minus-values',
    namespace: 'language',
    pine: `//@version=6
indicator("assignment minus values")
value = close + open
if close > open
    value -= open
plot(value)`,
    rule: 'TradingView v6 Variable declarations: `-=` reassigns a variable to its current value minus the right-hand expression, and indentation keeps the reassignment inside the selected local block. https://www.tradingview.com/pine-script-docs/language/variable-declarations/ https://www.tradingview.com/pine-script-docs/language/script-structure/',
    expected: (bars) => bars.map((bar) => bar.close > bar.open ? bar.close : bar.close + bar.open),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.expression-continuation-values',
    namespace: 'language',
    pine: `//@version=6
indicator("expression continuation values")
value = close +
    open * 2 +
    (high - low)
plot(value)`,
    rule: 'TradingView v6 Script structure: a wrapped expression continuation remains part of the same initializer; Operators: multiplication binds before addition and parentheses group subexpressions. https://www.tradingview.com/pine-script-docs/language/script-structure/ https://www.tradingview.com/pine-script-docs/language/operators/',
    expected: (bars) => bars.map((bar) => bar.close + bar.open * 2 + (bar.high - bar.low)),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.for-in-value-values',
    namespace: 'language',
    pine: `//@version=6
indicator("for in value values")
values = array.from(close, open, high)
total = 0.0
for value in values
    total += value
plot(total)`,
    rule: 'TradingView v6 Loops: `for value in collection` iterates each collection element in order and the loop body can update outer variables. https://www.tradingview.com/pine-script-docs/language/loops/ https://www.tradingview.com/pine-script-docs/language/arrays/',
    expected: (bars) => bars.map((bar) => bar.close + bar.open + bar.high),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.bitwise-operator-values',
    namespace: 'language',
    pine: `//@version=6
indicator("bitwise operator values")
value = (bar_index & 1) | 2
plot(value)`,
    rule: 'TradingView v6 Operators: bitwise `&` and `|` operate on integer operands; parentheses group the mask before the inclusive-or. https://www.tradingview.com/pine-script-docs/language/operators/',
    expected: (bars) => bars.map((_bar, index) => (index & 1) | 2),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.udt-field-shape-values',
    namespace: 'language',
    pine: `//@version=6
indicator("UDT field shape values")
type Pivot
    float price
type Zone
    Pivot point
type Bucket
    array<float> values
Zone zone = Zone.new(Pivot.new(close))
Bucket bucket = Bucket.new(array.from(close, open))
plot(zone.point.price)
plot(bucket.values.get(1))`,
    rule: 'TradingView v6 Objects and Collections: UDT fields preserve their declared value shape, including nested UDT fields and collection-typed fields, and field access reads the stored member. https://www.tradingview.com/pine-script-docs/language/objects/ https://www.tradingview.com/pine-script-docs/language/arrays/',
    expected: (bars) => bars.map((bar) => bar.close),
    expectedOutputs: (bars) => [
      bars.map((bar) => bar.close),
      bars.map((bar) => bar.open),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.block-default-parameter-values',
    namespace: 'language',
    pine: `//@version=6
indicator("block default parameter values")
scale(series float source, float multiplier=2.0) =>
    adjusted = source * multiplier
    adjusted
plot(scale(close))
plot(scale(close, 3.0))`,
    rule: 'TradingView v6 User-defined functions: block-body functions return the final statement value, and default parameter values are used only when a call omits that argument. https://www.tradingview.com/pine-script-docs/language/user-defined-functions/',
    expected: (bars) => bars.map((bar) => bar.close * 2),
    expectedOutputs: (bars) => [
      bars.map((bar) => bar.close * 2),
      bars.map((bar) => bar.close * 3),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.tuple-continuation-equals-values',
    namespace: 'language',
    pine: `//@version=5
indicator("tuple continuation equals values")
pair() => [1, 2]
[a,
 b]
 = pair()
plot(a + b)`,
    rule: 'TradingView v6 Variable declarations: tuple declarations assign multiple returned values, and Pine permits wrapped statements using continuation indentation. https://www.tradingview.com/pine-script-docs/language/variable-declarations/',
    expected: (bars) => constantVector(bars, 3),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.or-short-circuit-skips-error',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("or short circuit skips error")\nempty = array.new_float()\nplot(close > 0 or array.get(empty, 0) > 0 ? 1 : 0)`,
    rule: 'TradingView v6 migration rules: `and` and `or` evaluate lazily, so the right side is not evaluated when the left side determines the result. https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/',
    expected: (bars) => constantVector(bars, 1),
    bars: BARS,
  },
  {
    id: 'language.and-short-circuit-skips-error',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("and short circuit skips error")\nempty = array.new_float()\nplot(close < 0 and array.get(empty, 0) > 0 ? 1 : 0)`,
    rule: 'TradingView v6 migration rules: `and` and `or` evaluate lazily, so the right side is not evaluated when the left side determines the result. https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/',
    expected: (bars) => constantVector(bars, 0),
    bars: BARS,
  },
  {
    id: 'language.if-branch-skips-error',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("if branch skips error")\nempty = array.new_float()\nvalue = if close > 0\n    close\nelse\n    array.get(empty, 0)\nplot(value)`,
    rule: 'TradingView v6 Conditional structures: an `if` structure evaluates and returns the local block whose condition is true; unselected branches are not the returned value. https://www.tradingview.com/pine-script-docs/language/conditional-structures/',
    expected: (bars) => bars.map((bar) => bar.close),
    bars: BARS,
  },
  {
    id: 'language.switch-branch-skips-error',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("switch branch skips error")\nempty = array.new_float()\nvalue = switch\n    close > 0 => close\n    => array.get(empty, 0)\nplot(value)`,
    rule: 'TradingView v6 Conditional structures: switch evaluates and returns the selected branch expression or local-block result. https://www.tradingview.com/pine-script-docs/language/conditional-structures/',
    expected: (bars) => bars.map((bar) => bar.close),
    bars: BARS,
  },
  {
    id: 'language.reverse-for-loop-sum',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("reverse for loop sum")\nfloat total = 0.0\nfor i = 2 to 0\n    total += close[i]\nplot(total)`,
    rule: 'TradingView v6 Loops: a `for` loop with a start value greater than the end value counts downward; history values unavailable on early bars are `na`. https://www.tradingview.com/pine-script-docs/language/loops/ https://www.tradingview.com/pine-script-docs/language/operators/',
    expected: (bars) => bars.map((_bar, index) => index < 2 ? null : bars[index - 2]!.close + bars[index - 1]!.close + bars[index]!.close),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.tuple-discard-keeps-position',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("tuple discard keeps position")\ntriple() => [close, open, high]\n[_, middle, last] = triple()\nplot(middle)\nplot(last)`,
    rule: 'TradingView v6 Variable declarations: `_` can be used as a tuple discard identifier without shifting the remaining tuple positions. https://www.tradingview.com/pine-script-docs/language/variable-declarations/',
    expected: (bars) => bars.map((bar) => bar.open),
    expectedOutputs: (bars) => [
      bars.map((bar) => bar.open),
      bars.map((bar) => bar.high),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.udf-default-parameter-source',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("UDF default parameter source")\nidentity(series float source = close) => source\nplot(identity())\nplot(identity(open))`,
    rule: 'TradingView v6 User-defined functions: parameters can declare default values used when the call omits that argument. https://www.tradingview.com/pine-script-docs/language/user-defined-functions/',
    expected: (bars) => bars.map((bar) => bar.close),
    expectedOutputs: (bars) => [
      bars.map((bar) => bar.close),
      bars.map((bar) => bar.open),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.method-param-shadows-builtin',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("method parameter shadows builtin")\ntype Wrap\n    float value\nmethod add(Wrap this, series float close) => this.value + close\nwrap = Wrap.new(open)\nplot(wrap.add(high))`,
    rule: 'TradingView v6 Methods are functions with receiver-call syntax; UDF parameter names are local to the function body and can shadow outer names. https://www.tradingview.com/pine-script-docs/language/methods/ https://www.tradingview.com/pine-script-docs/language/user-defined-functions/',
    expected: (bars) => bars.map((bar) => bar.open + bar.high),
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.library-local-state-call-sites',
    namespace: 'runtime',
    pine: `//@version=6\nimport TradingView/ta/7 as tvta\nindicator("library local state call sites")\nplot(tvta.highestSince(close < 0, high))\nplot(tvta.highestSince(close > 2, low))`,
    rule: 'TradingView v6 Libraries: imported library functions execute as normal functions, and written calls keep independent histories/state. TradingView/ta highestSince() stores state since its condition last became true. https://www.tradingview.com/pine-script-docs/concepts/libraries/ https://www.tradingview.com/script/BICzyhq0-ta/',
    expected: (bars) => highestSince(bars, (bar) => bar.close < 0, (bar) => bar.high),
    expectedOutputs: (bars) => [
      highestSince(bars, (bar) => bar.close < 0, (bar) => bar.high),
      highestSince(bars, (bar) => bar.close > 2, (bar) => bar.low),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.strategy-declaration-value-inputs',
    namespace: 'runtime',
    pine: `//@version=6\nstrategy("strategy declaration value inputs", initial_capital=50000)\nplot(strategy.initial_capital)\nplot(strategy.equity)`,
    rule: 'TradingView v6 Strategies: strategy() declaration properties initialize the broker emulator state, and strategy.initial_capital/strategy.equity expose that state as series values. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 50000),
    expectedOutputs: (bars) => [
      constantVector(bars, 50000),
      constantVector(bars, 50000),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.collection-history-containers',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("collection history containers")\nvar array<float> values = array.new_float()\nvar matrix<float> grid = matrix.new<float>(1, 1, 0.0)\nvar map<string, float> lookup = map.new<string, float>()\narray.push(values, close)\nmatrix.set(grid, 0, 0, close + open)\nmap.put(lookup, "high", high)\nplot(bar_index == 0 ? na : array.get(values[1], array.size(values[1]) - 1))\nplot(bar_index == 0 ? na : matrix.get(grid[1], 0, 0))\nplot(bar_index == 0 ? na : map.get(lookup[1], "high"))`,
    rule: 'TradingView v6 Collections and Operators: collection variables are series values, so the history operator can reference a prior collection instance before calling its methods. https://www.tradingview.com/pine-script-docs/language/arrays/ https://www.tradingview.com/pine-script-docs/language/matrices/ https://www.tradingview.com/pine-script-docs/language/maps/ https://www.tradingview.com/pine-script-docs/language/operators/',
    expected: (bars) => previousValue(bars, (bar) => bar.close),
    expectedOutputs: (bars) => [
      previousValue(bars, (bar) => bar.close),
      previousValue(bars, (bar) => bar.close + bar.open),
      previousValue(bars, (bar) => bar.high),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.collection-history-offset-boundaries',
    namespace: 'runtime',
    pine: `//@version=6
indicator("collection history offset boundaries")
var array<float> values = array.new_float()
var matrix<float> grid = matrix.new<float>(1, 1, 0.0)
var map<string, float> lookup = map.new<string, float>()
array.push(values, close)
matrix.set(grid, 0, 0, high)
map.put(lookup, "low", low)
plot(bar_index == 0 ? na : array.get(values[1.9], array.size(values[1.9]) - 1))
plot(bar_index == 0 ? na : matrix.get(grid[1.9], 0, 0))
plot(bar_index == 0 ? na : map.get(lookup[1.9], "low"))
plot(na(values[-1]) ? 1 : 0)
plot(na(grid[99]) ? 1 : 0)
plot(na(lookup[-1.5]) ? 1 : 0)`,
    rule: 'TradingView v6 Collections and Operators: collection variables are series values, so history offsets select a prior collection instance before methods read it. Unavailable collection history returns na, fractional offsets truncate toward zero, and negative offsets are unavailable. https://www.tradingview.com/pine-script-docs/language/arrays/ https://www.tradingview.com/pine-script-docs/language/matrices/ https://www.tradingview.com/pine-script-docs/language/maps/ https://www.tradingview.com/pine-script-docs/language/operators/',
    expected: (bars) => previousValue(bars, (bar) => bar.close),
    expectedOutputs: (bars) => [
      previousValue(bars, (bar) => bar.close),
      previousValue(bars, (bar) => bar.high),
      previousValue(bars, (bar) => bar.low),
      constantVector(bars, 1),
      constantVector(bars, 1),
      constantVector(bars, 1),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.collection-mutation-ordering-loops',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("collection mutation ordering loops")\narray<float> values = array.new_float()\nmap<string, float> totals = map.new<string, float>()\nmatrix<float> grid = matrix.new<float>(1, 1, 0.0)\nfor i = 0 to 3\n    item = close + i\n    array.push(values, item)\n    if i % 2 == 0\n        map.put(totals, "even", nz(map.get(totals, "even")) + array.get(values, i))\n    matrix.set(grid, 0, 0, matrix.get(grid, 0, 0) + array.get(values, i))\nplot(array.sum(values))\nplot(map.get(totals, "even"))\nplot(matrix.get(grid, 0, 0))`,
    rule: 'TradingView v6 Loops execute statements in order, and collection mutation functions update the referenced collection immediately for later statements in the same iteration and later iterations. https://www.tradingview.com/pine-script-docs/language/loops/ https://www.tradingview.com/pine-script-docs/language/arrays/ https://www.tradingview.com/pine-script-docs/language/maps/ https://www.tradingview.com/pine-script-docs/language/matrices/',
    expected: (bars) => bars.map((bar) => 4 * bar.close + 6),
    expectedOutputs: (bars) => [
      bars.map((bar) => 4 * bar.close + 6),
      bars.map((bar) => 2 * bar.close + 2),
      bars.map((bar) => 4 * bar.close + 6),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.udt-collection-copy-identity',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("UDT collection copy identity")\ntype Wrap\n    float value\narray<Wrap> values = array.new<Wrap>()\nbase = Wrap.new(close)\narray.push(values, base)\nclone = array.get(values, 0).copy()\nbase.value := high\nplot(array.get(values, 0).value)\nplot(clone.value)`,
    rule: 'TradingView v6 Objects and Collections: UDT objects are reference types, collections store object references, and copy() creates a distinct object whose fields do not follow later mutations on the original. https://www.tradingview.com/pine-script-docs/language/objects/ https://www.tradingview.com/pine-script-docs/language/arrays/',
    expected: (bars) => bars.map((bar) => bar.high),
    expectedOutputs: (bars) => [
      bars.map((bar) => bar.high),
      bars.map((bar) => bar.close),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'language.qualifier-helper-chain',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("qualifier helper chain")\nchoose(simple int length) => length\nsmooth(series float source, simple int length) =>\n    local = choose(length)\n    ta.highest(source, local)\nplot(smooth(close, 3))`,
    rule: `TradingView v6 Type system: stronger qualifiers can satisfy weaker requirements only when allowed by the signature; helper chains returning a simple int must still satisfy TA length parameters that require simple int lengths. The resulting ta.highest(source, length) value follows the published rolling-highest formula. https://www.tradingview.com/pine-script-docs/language/type-system/ ${TA_HIGHEST_FORMULA_CITATION}`,
    expected: (bars) => highest(bars, 3, (bar) => bar.close),
    bars: HOSTILE_BARS,
    discriminationProof: {
      ...TA_EXTREMA_VALUE_DISCRIMINATION,
      helperFormulaCitation: TA_HIGHEST_FORMULA_CITATION,
    },
  },
  {
    id: 'strategy.entry-close-ledger-values',
    namespace: 'strategy',
    pine: `//@version=6\nstrategy("strategy entry close values", initial_capital=1000)\nif bar_index == 0\n    strategy.entry("Long", strategy.long, qty=2)\nif bar_index == 2\n    strategy.close("Long")\nplot(strategy.position_size)\nplot(strategy.position_avg_price)\nplot(strategy.netprofit)`,
    rule: 'TradingView v6 Strategies: market orders fill on the next available tick by default, strategy.close() creates a market exit, and strategy.* variables expose the broker emulator state as series values. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: () => [0, 2, 2, 0],
    expectedOutputs: () => [
      [0, 2, 2, 0],
      [null, 105, 105, null],
      [0, 0, 0, 30],
    ],
    bars: STRATEGY_BARS,
  },
  {
    id: 'strategy.market-slippage-commission-ledger-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy market slippage commission ledger values", process_orders_on_close=true, initial_capital=1000, commission_type=strategy.commission.cash_per_contract, commission_value=1, slippage=2)
if bar_index == 0
    strategy.entry("L", strategy.long, qty=2)
if bar_index == 1
    strategy.close("L")
idx = strategy.closedtrades - 1
hasClosed = strategy.closedtrades > 0
plot(strategy.position_size)
plot(strategy.position_avg_price)
plot(strategy.netprofit)
plot(strategy.openprofit)
plot(strategy.equity)
plot(strategy.closedtrades)
plot(hasClosed ? strategy.closedtrades.entry_price(idx) : na)
plot(hasClosed ? strategy.closedtrades.exit_price(idx) : na)
plot(hasClosed ? strategy.closedtrades.commission(idx) : na)
plot(hasClosed ? strategy.closedtrades.profit(idx) : na)
plot(hasClosed ? strategy.closedtrades.size(idx) : na)`,
    rule: 'TradingView v6 Strategies: process_orders_on_close fills market orders on the closing tick, slippage shifts market fills by ticks in trade direction, cash_per_contract commission is charged per filled contract on entry and exit, net profit deducts commission, equity is initial capital plus net profit plus open profit, and closedtrades accessors expose fill prices, commission, gross profit, and signed size. With mintick=1, a 2-contract long entered at close 100 with 2 ticks slippage fills at 102; closing at close 110 with 2 ticks slippage fills at 108, so gross profit is (108 - 102) * 2 = 12, total commission is 4, net profit is 8, and bar-0 equity is 1000 - 2 + (100 - 102) * 2 = 994. https://www.tradingview.com/pine-script-docs/concepts/strategies/#process_orders_on_close https://www.tradingview.com/pine-script-docs/concepts/strategies/#slippage-and-unfilled-limits https://www.tradingview.com/pine-script-reference/v6/#fun_strategy',
    expected: () => [2, 0, 0, 0],
    expectedOutputs: () => [
      [2, 0, 0, 0],
      [102, null, null, null],
      [-2, 8, 8, 8],
      [-4, 0, 0, 0],
      [994, 1008, 1008, 1008],
      [0, 1, 1, 1],
      [null, 102, 102, 102],
      [null, 108, 108, 108],
      [null, 4, 4, 4],
      [null, 12, 12, 12],
      [null, 2, 2, 2],
    ],
    outputMembers: [
      ['strategy.position_size'],
      ['strategy.position_avg_price'],
      ['strategy.netprofit'],
      ['strategy.openprofit'],
      ['strategy.equity'],
      ['strategy.closedtrades'],
      ['strategy.closedtrades.entry_price'],
      ['strategy.closedtrades.exit_price'],
      ['strategy.closedtrades.commission'],
      ['strategy.closedtrades.profit'],
      ['strategy.closedtrades.size'],
    ],
    bars: STRATEGY_LEDGER_ORACLE_BARS,
    options: () => ({ runtime: { syminfo: { mintick: 1 } } }),
  },
  {
    id: 'strategy.percent-of-equity-quantity-ledger-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy percent equity quantity ledger values", process_orders_on_close=true, initial_capital=10000, default_qty_type=strategy.percent_of_equity, default_qty_value=50)
if bar_index == 0
    strategy.entry("Half", strategy.long)
if bar_index == 1
    strategy.close("Half")
idx = strategy.closedtrades - 1
hasClosed = strategy.closedtrades > 0
plot(strategy.position_size)
plot(strategy.position_avg_price)
plot(strategy.netprofit)
plot(strategy.equity)
plot(strategy.closedtrades)
plot(hasClosed ? strategy.closedtrades.size(idx) : na)
plot(hasClosed ? strategy.closedtrades.profit(idx) : na)`,
    rule: 'TradingView v6 Strategies: default_qty_type=strategy.percent_of_equity sizes a default entry as equity times the configured percent divided by the fill price, process_orders_on_close fills market orders on the creating bar close, closedtrades.size exposes the closed trade quantity, and equity is initial capital plus net profit when no position remains. With initial capital 10000, 50% equity, and a 100 close fill, the long entry size is 50 contracts; closing at 110 realizes (110 - 100) * 50 = 500, so net profit is 500 and equity is 10500. https://www.tradingview.com/pine-script-docs/concepts/strategies/#position-sizing https://www.tradingview.com/pine-script-docs/concepts/strategies/#process_orders_on_close https://www.tradingview.com/pine-script-reference/v6/#fun_strategy.default_entry_qty',
    expected: () => [50, 0, 0, 0],
    expectedOutputs: () => [
      [50, 0, 0, 0],
      [100, null, null, null],
      [0, 500, 500, 500],
      [10000, 10500, 10500, 10500],
      [0, 1, 1, 1],
      [null, 50, 50, 50],
      [null, 500, 500, 500],
    ],
    outputMembers: [
      ['strategy.position_size'],
      ['strategy.position_avg_price'],
      ['strategy.netprofit'],
      ['strategy.equity'],
      ['strategy.closedtrades'],
      ['strategy.closedtrades.size'],
      ['strategy.closedtrades.profit'],
    ],
    bars: STRATEGY_LEDGER_ORACLE_BARS,
  },
  {
    id: 'strategy.partial-exit-average-price-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy partial exit average price values", pyramiding=2, process_orders_on_close=true, initial_capital=1000)
if bar_index == 0
    strategy.entry("A", strategy.long, qty=1)
if bar_index == 1
    strategy.entry("B", strategy.long, qty=2)
if bar_index == 2
    strategy.close("A", qty=1)
plot(strategy.position_size)
plot(strategy.position_avg_price)
plot(strategy.netprofit)
plot(strategy.closedtrades)`,
    rule: 'TradingView v6 Strategies: process_orders_on_close fills market orders on the closing tick, pyramiding permits multiple same-direction entries, strategy.close(id, qty) exits the position opened by the specified entry id, and strategy.position_avg_price is the average entry price of the remaining open position. With entries of 1 at 100 and 2 at 110, the combined position average is (1*100 + 2*110)/3 = 106.6666666667. Closing the 1-contract A lot at 105 leaves only the two B contracts, so the remaining average price is 110 and realized profit is 5. https://www.tradingview.com/pine-script-docs/concepts/strategies/#process_orders_on_close https://www.tradingview.com/pine-script-docs/concepts/strategies/#pyramiding https://www.tradingview.com/pine-script-reference/v6/#var_strategy.position_avg_price',
    expected: () => [1, 3, 2, 2],
    expectedOutputs: () => [
      [1, 3, 2, 2],
      [100, 106.66666666666667, 110, 110],
      [0, 0, 5, 5],
      [0, 0, 1, 1],
    ],
    outputMembers: [
      ['strategy.position_size'],
      ['strategy.position_avg_price'],
      ['strategy.netprofit'],
      ['strategy.closedtrades'],
    ],
    bars: STRATEGY_LEDGER_ORACLE_BARS,
  },
  {
    id: 'strategy.cash-per-order-commission-ledger-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy cash per order commission ledger values", process_orders_on_close=true, initial_capital=1000, commission_type=strategy.commission.cash_per_order, commission_value=3)
if bar_index == 0
    strategy.entry("L", strategy.long, qty=2)
if bar_index == 1
    strategy.close("L")
idx = strategy.closedtrades - 1
hasClosed = strategy.closedtrades > 0
plot(strategy.netprofit)
plot(strategy.equity)
plot(strategy.closedtrades)
plot(hasClosed ? strategy.closedtrades.commission(idx) : na)
plot(hasClosed ? strategy.closedtrades.profit(idx) : na)`,
    rule: 'TradingView v6 Strategies: strategy.commission.cash_per_order charges the configured cash amount once per filled order; process_orders_on_close fills the entry and close market orders on their creating bar close, net profit deducts commission, and equity is initial capital plus net profit plus open profit. A 2-contract long from 100 to 110 has gross profit 20; two filled orders at 3 cash each charge 6, so net profit is 14 and closed equity is 1014. https://www.tradingview.com/pine-script-docs/concepts/strategies/#commission https://www.tradingview.com/pine-script-docs/concepts/strategies/#process_orders_on_close https://www.tradingview.com/pine-script-reference/v6/#fun_strategy',
    expected: () => [-3, 14, 14, 14],
    expectedOutputs: () => [
      [-3, 14, 14, 14],
      [997, 1014, 1014, 1014],
      [0, 1, 1, 1],
      [null, 6, 6, 6],
      [null, 20, 20, 20],
    ],
    outputMembers: [
      ['strategy.netprofit'],
      ['strategy.equity'],
      ['strategy.closedtrades'],
      ['strategy.closedtrades.commission'],
      ['strategy.closedtrades.profit'],
    ],
    bars: STRATEGY_LEDGER_ORACLE_BARS,
  },
  {
    id: 'strategy.percent-commission-ledger-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy percent commission ledger values", process_orders_on_close=true, initial_capital=1000, commission_type=strategy.commission.percent, commission_value=10)
if bar_index == 0
    strategy.entry("L", strategy.long, qty=2)
if bar_index == 1
    strategy.close("L")
idx = strategy.closedtrades - 1
hasClosed = strategy.closedtrades > 0
plot(strategy.netprofit)
plot(strategy.equity)
plot(strategy.closedtrades)
plot(hasClosed ? strategy.closedtrades.commission(idx) : na)
plot(hasClosed ? strategy.closedtrades.profit(idx) : na)`,
    rule: 'TradingView v6 Strategies: strategy.commission.percent charges the configured percentage of filled notional on each entry and exit order. A 2-contract long entry at 100 has 200 notional and 20 commission; closing at 110 has 220 notional and 22 commission. Gross profit is 20, total commission is 42, net profit is -22, and closed equity is 978. https://www.tradingview.com/pine-script-docs/concepts/strategies/#commission https://www.tradingview.com/pine-script-docs/concepts/strategies/#process_orders_on_close https://www.tradingview.com/pine-script-reference/v6/#fun_strategy',
    expected: () => [-20, -22, -22, -22],
    expectedOutputs: () => [
      [-20, -22, -22, -22],
      [980, 978, 978, 978],
      [0, 1, 1, 1],
      [null, 42, 42, 42],
      [null, 20, 20, 20],
    ],
    outputMembers: [
      ['strategy.netprofit'],
      ['strategy.equity'],
      ['strategy.closedtrades'],
      ['strategy.closedtrades.commission'],
      ['strategy.closedtrades.profit'],
    ],
    bars: STRATEGY_LEDGER_ORACLE_BARS,
  },
  {
    id: 'strategy.fixed-quantity-ledger-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy fixed quantity ledger values", process_orders_on_close=true, initial_capital=1000, default_qty_type=strategy.fixed, default_qty_value=3)
if bar_index == 0
    strategy.entry("Fixed", strategy.long)
if bar_index == 1
    strategy.close("Fixed")
idx = strategy.closedtrades - 1
hasClosed = strategy.closedtrades > 0
plot(strategy.position_size)
plot(strategy.netprofit)
plot(strategy.closedtrades)
plot(hasClosed ? strategy.closedtrades.size(idx) : na)
plot(hasClosed ? strategy.closedtrades.profit(idx) : na)`,
    rule: 'TradingView v6 Strategies: default_qty_type=strategy.fixed uses default_qty_value as the contract quantity when an entry omits qty. A fixed long size of 3 entered at 100 and closed at 110 realizes (110 - 100) * 3 = 30. https://www.tradingview.com/pine-script-docs/concepts/strategies/#position-sizing https://www.tradingview.com/pine-script-docs/concepts/strategies/#process_orders_on_close https://www.tradingview.com/pine-script-reference/v6/#fun_strategy',
    expected: () => [3, 0, 0, 0],
    expectedOutputs: () => [
      [3, 0, 0, 0],
      [0, 30, 30, 30],
      [0, 1, 1, 1],
      [null, 3, 3, 3],
      [null, 30, 30, 30],
    ],
    outputMembers: [
      ['strategy.position_size'],
      ['strategy.netprofit'],
      ['strategy.closedtrades'],
      ['strategy.closedtrades.size'],
      ['strategy.closedtrades.profit'],
    ],
    bars: STRATEGY_LEDGER_ORACLE_BARS,
  },
  {
    id: 'strategy.cash-amount-quantity-ledger-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy cash amount quantity ledger values", process_orders_on_close=true, initial_capital=1000, default_qty_type=strategy.cash, default_qty_value=200)
if bar_index == 0
    strategy.entry("Cash", strategy.long)
if bar_index == 1
    strategy.close("Cash")
idx = strategy.closedtrades - 1
hasClosed = strategy.closedtrades > 0
plot(strategy.default_entry_qty(100))
plot(strategy.position_size)
plot(strategy.netprofit)
plot(strategy.closedtrades)
plot(hasClosed ? strategy.closedtrades.size(idx) : na)
plot(hasClosed ? strategy.closedtrades.profit(idx) : na)`,
    rule: 'TradingView v6 Strategies: default_qty_type=strategy.cash converts the configured cash amount to order quantity by dividing by the fill price; this vector uses 200 cash at a 100 fill so no undocumented contract-rounding rule is involved. The entry quantity is 2 contracts, and closing at 110 realizes (110 - 100) * 2 = 20. https://www.tradingview.com/pine-script-docs/concepts/strategies/#position-sizing https://www.tradingview.com/pine-script-reference/v6/#fun_strategy.default_entry_qty',
    expected: () => [2, 2, 2, 2],
    expectedOutputs: () => [
      [2, 2, 2, 2],
      [2, 0, 0, 0],
      [0, 20, 20, 20],
      [0, 1, 1, 1],
      [null, 2, 2, 2],
      [null, 20, 20, 20],
    ],
    outputMembers: [
      ['strategy.default_entry_qty'],
      ['strategy.position_size'],
      ['strategy.netprofit'],
      ['strategy.closedtrades'],
      ['strategy.closedtrades.size'],
      ['strategy.closedtrades.profit'],
    ],
    bars: STRATEGY_LEDGER_ORACLE_BARS,
  },
  {
    id: 'strategy.close-entries-rule-fifo-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy close entries fifo values", pyramiding=2, process_orders_on_close=true, close_entries_rule="FIFO")
if bar_index == 0
    strategy.entry("A", strategy.long, qty=1)
if bar_index == 1
    strategy.entry("B", strategy.long, qty=1)
if bar_index == 2
    strategy.close("B")
if bar_index == 3
    strategy.close_all()
plot(strategy.closedtrades)
plot(strategy.closedtrades > 0 ? strategy.closedtrades.entry_price(0) : na)
plot(strategy.closedtrades > 0 ? strategy.closedtrades.profit(0) : na)
plot(strategy.closedtrades > 1 ? strategy.closedtrades.entry_price(1) : na)
plot(strategy.closedtrades > 1 ? strategy.closedtrades.profit(1) : na)
plot(strategy.netprofit)`,
    rule: 'TradingView v6 Strategies: close_entries_rule="FIFO" closes the earliest open trade first even when a close command names a later entry id. With entries A at 100 and B at 110, strategy.close("B") at 105 closes A first for 5 profit; close_all at 120 then closes B for 10, leaving the same total 15 as ANY but different per-trade attribution. https://www.tradingview.com/pine-script-docs/concepts/strategies/#closing-a-market-position https://www.tradingview.com/pine-script-reference/v6/#fun_strategy',
    expected: () => [0, 0, 1, 2],
    expectedOutputs: () => [
      [0, 0, 1, 2],
      [null, null, 100, 100],
      [null, null, 5, 5],
      [null, null, null, 110],
      [null, null, null, 10],
      [0, 0, 5, 15],
    ],
    outputMembers: [
      ['strategy.closedtrades'],
      ['strategy.closedtrades.entry_price'],
      ['strategy.closedtrades.profit'],
      ['strategy.closedtrades.entry_price'],
      ['strategy.closedtrades.profit'],
      ['strategy.netprofit'],
    ],
    bars: STRATEGY_LEDGER_ORACLE_BARS,
  },
  {
    id: 'strategy.close-entries-rule-any-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy close entries any values", pyramiding=2, process_orders_on_close=true, close_entries_rule="ANY")
if bar_index == 0
    strategy.entry("A", strategy.long, qty=1)
if bar_index == 1
    strategy.entry("B", strategy.long, qty=1)
if bar_index == 2
    strategy.close("B")
if bar_index == 3
    strategy.close_all()
plot(strategy.closedtrades)
plot(strategy.closedtrades > 0 ? strategy.closedtrades.entry_price(0) : na)
plot(strategy.closedtrades > 0 ? strategy.closedtrades.profit(0) : na)
plot(strategy.closedtrades > 1 ? strategy.closedtrades.entry_price(1) : na)
plot(strategy.closedtrades > 1 ? strategy.closedtrades.profit(1) : na)
plot(strategy.netprofit)`,
    rule: 'TradingView v6 Strategies: close_entries_rule="ANY" lets exit commands close the specified entry instead of forcing FIFO. With entries A at 100 and B at 110, strategy.close("B") at 105 closes B first for -5; close_all at 120 then closes A for 20, leaving total profit 15 but different per-trade attribution than FIFO. https://www.tradingview.com/pine-script-docs/concepts/strategies/#closing-a-market-position https://www.tradingview.com/pine-script-reference/v6/#fun_strategy',
    expected: () => [0, 0, 1, 2],
    expectedOutputs: () => [
      [0, 0, 1, 2],
      [null, null, 110, 110],
      [null, null, -5, -5],
      [null, null, null, 100],
      [null, null, null, 20],
      [0, 0, -5, 15],
    ],
    outputMembers: [
      ['strategy.closedtrades'],
      ['strategy.closedtrades.entry_price'],
      ['strategy.closedtrades.profit'],
      ['strategy.closedtrades.entry_price'],
      ['strategy.closedtrades.profit'],
      ['strategy.netprofit'],
    ],
    bars: STRATEGY_LEDGER_ORACLE_BARS,
  },
  {
    id: 'strategy.pyramiding-closeout-ledger-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy pyramiding closeout ledger values", pyramiding=2, process_orders_on_close=true)
if bar_index <= 2
    strategy.entry("L" + str.tostring(bar_index), strategy.long, qty=1)
if bar_index == 3
    strategy.close_all()
plot(strategy.position_size)
plot(strategy.opentrades)
plot(strategy.closedtrades)
plot(strategy.netprofit)`,
    rule: 'TradingView v6 Strategies: pyramiding limits how many successive same-direction strategy.entry() calls can add open trades; further entries are ignored once the cap is reached. With pyramiding=2, entries at 100 and 110 open, the third same-direction entry at 105 is ignored, and close_all at 120 closes two trades for 20 + 10 = 30 total profit. https://www.tradingview.com/pine-script-docs/concepts/strategies/#pyramiding https://www.tradingview.com/pine-script-reference/v6/#fun_strategy',
    expected: () => [1, 2, 2, 0],
    expectedOutputs: () => [
      [1, 2, 2, 0],
      [1, 2, 2, 0],
      [0, 0, 0, 2],
      [0, 0, 0, 30],
    ],
    outputMembers: [
      ['strategy.position_size'],
      ['strategy.opentrades'],
      ['strategy.closedtrades'],
      ['strategy.netprofit'],
    ],
    bars: STRATEGY_LEDGER_ORACLE_BARS,
  },
  {
    id: 'strategy.oca-cancel-pending-order-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy oca cancel values", pyramiding=4)
if bar_index == 0
    strategy.order("A", strategy.long, qty=1, limit=99, oca_name="G", oca_type=strategy.oca.cancel)
    strategy.order("B", strategy.long, qty=3, limit=98, oca_name="G", oca_type=strategy.oca.cancel)
plot(strategy.position_size)
plot(strategy.opentrades)`,
    rule: 'TradingView v6 Strategies: orders with the same oca_name and oca_type=strategy.oca.cancel cancel the remaining same-group orders when one fills. With long limits at 99 and 98, the 99 order fills when a later bar opens at 99 and cancels the 98 sibling before the following bar opens at 98, so only one contract is open. https://www.tradingview.com/pine-script-docs/concepts/strategies/#oca-groups https://www.tradingview.com/pine-script-reference/v6/#fun_strategy.order',
    expected: () => [0, 0, 0, 1, 1],
    expectedOutputs: () => [
      [0, 0, 0, 1, 1],
      [0, 0, 0, 1, 1],
    ],
    outputMembers: [
      ['strategy.position_size'],
      ['strategy.opentrades'],
    ],
    bars: STRATEGY_OCA_BARS,
  },
  {
    id: 'strategy.oca-reduce-pending-order-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy oca reduce values", pyramiding=4)
if bar_index == 0
    strategy.order("A", strategy.long, qty=1, limit=99, oca_name="G", oca_type=strategy.oca.reduce)
    strategy.order("B", strategy.long, qty=3, limit=98, oca_name="G", oca_type=strategy.oca.reduce)
plot(strategy.position_size)
plot(strategy.opentrades)`,
    rule: 'TradingView v6 Strategies: orders with the same oca_name and oca_type=strategy.oca.reduce reduce unfilled same-group order quantities by the filled quantity. The 99 limit fills 1 contract when a later bar opens at 99 and reduces the 98 sibling from 3 to 2; when the next bar opens at 98, total open size becomes 3 contracts, not 4. https://www.tradingview.com/pine-script-docs/concepts/strategies/#oca-groups https://www.tradingview.com/pine-script-reference/v6/#fun_strategy.order',
    expected: () => [0, 0, 0, 1, 3],
    expectedOutputs: () => [
      [0, 0, 0, 1, 3],
      [0, 0, 0, 1, 2],
    ],
    outputMembers: [
      ['strategy.position_size'],
      ['strategy.opentrades'],
    ],
    bars: STRATEGY_OCA_BARS,
  },
  {
    id: 'strategy.oca-none-pending-order-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy oca none values", pyramiding=4)
if bar_index == 0
    strategy.order("A", strategy.long, qty=1, limit=99, oca_name="G", oca_type=strategy.oca.none)
    strategy.order("B", strategy.long, qty=3, limit=98, oca_name="G", oca_type=strategy.oca.none)
plot(strategy.position_size)
plot(strategy.opentrades)`,
    rule: 'TradingView v6 Strategies: oca_type=strategy.oca.none leaves same-group sibling orders live after one order fills. With long limits at 99 for 1 contract and 98 for 3 contracts, the later 99 open fills the first order and the following 98 open fills the still-live 3-contract sibling for total open size 4. https://www.tradingview.com/pine-script-docs/concepts/strategies/#oca-groups https://www.tradingview.com/pine-script-reference/v6/#fun_strategy.order',
    expected: () => [0, 0, 0, 1, 4],
    expectedOutputs: () => [
      [0, 0, 0, 1, 4],
      [0, 0, 0, 1, 2],
    ],
    outputMembers: [
      ['strategy.position_size'],
      ['strategy.opentrades'],
    ],
    bars: STRATEGY_OCA_BARS,
  },
  {
    id: 'strategy.process-orders-on-close-fill-timing-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy process orders on close fill timing values", process_orders_on_close=true, initial_capital=1000)
if bar_index == 0
    strategy.entry("L", strategy.long, qty=1)
if bar_index == 1
    strategy.close("L")
plot(strategy.position_size)
plot(strategy.position_avg_price)
plot(strategy.netprofit)
plot(strategy.closedtrades)`,
    rule: 'TradingView v6 Strategies: process_orders_on_close=true lets market orders fill on the closing tick of the bar that creates them. With close prices 100 then 110, the entry fills at 100 on bar 0, the close fills at 110 on bar 1, and realized profit is 10. https://www.tradingview.com/pine-script-docs/concepts/strategies/#process_orders_on_close https://www.tradingview.com/pine-script-reference/v6/#fun_strategy',
    expected: () => [1, 0, 0],
    expectedOutputs: () => [
      [1, 0, 0],
      [100, null, null],
      [0, 10, 10],
      [0, 1, 1],
    ],
    outputMembers: [
      ['strategy.position_size'],
      ['strategy.position_avg_price'],
      ['strategy.netprofit'],
      ['strategy.closedtrades'],
    ],
    bars: STRATEGY_TIMING_BARS,
  },
  {
    id: 'strategy.next-tick-market-fill-timing-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy next tick fill timing values", initial_capital=1000)
if bar_index == 0
    strategy.entry("L", strategy.long, qty=1)
if bar_index == 1
    strategy.close("L")
plot(strategy.position_size)
plot(strategy.position_avg_price)
plot(strategy.netprofit)
plot(strategy.closedtrades)`,
    rule: 'TradingView v6 Strategies: without process_orders_on_close, the broker emulator fills market orders on the next available tick, which is the open of the following bar on historical bars. With bar-1 open 107 and bar-2 open 105, the entry fills at 107, the close fills at 105, and realized profit is -2. https://www.tradingview.com/pine-script-docs/concepts/strategies/#order-creation-and-execution https://www.tradingview.com/pine-script-reference/v6/#fun_strategy',
    expected: () => [0, 1, 0],
    expectedOutputs: () => [
      [0, 1, 0],
      [null, 107, null],
      [0, 0, -2],
      [0, 0, 1],
    ],
    outputMembers: [
      ['strategy.position_size'],
      ['strategy.position_avg_price'],
      ['strategy.netprofit'],
      ['strategy.closedtrades'],
    ],
    bars: STRATEGY_TIMING_BARS,
  },
  {
    id: 'strategy.close-sizing-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy close sizing values", process_orders_on_close=true, initial_capital=1000)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=4)
if bar_index == 1
    strategy.close("Long", qty=1)
if bar_index == 2
    strategy.close("Long", qty_percent=50)
plot(strategy.position_size)
plot(strategy.closedtrades)
plot(strategy.netprofit)`,
    rule: 'TradingView v6 Strategies: strategy.close(id, qty, qty_percent) creates market exit orders for the specified entry id; process_orders_on_close fills those market exits on the close of the bar that creates them. https://www.tradingview.com/pine-script-docs/concepts/strategies/#strategyclose-and-strategyclose_all https://www.tradingview.com/pine-script-reference/v6/#fun_strategy.close',
    expected: () => [4, 3, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5],
    expectedOutputs: () => [
      [4, 3, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5],
      [0, 1, 2, 2, 2, 2, 2, 2],
      [0, 10, 17.5, 17.5, 17.5, 17.5, 17.5, 17.5],
    ],
    bars: STRATEGY_ACCESSOR_BARS,
  },
  {
    id: 'strategy.exit-limit-ledger-values',
    namespace: 'strategy',
    pine: `//@version=6\nstrategy("strategy exit limit values", initial_capital=1000)\nif bar_index == 0\n    strategy.entry("L", strategy.long, qty=1)\nif strategy.position_size > 0\n    strategy.exit("Exit", "L", limit=close + 1)\nplot(strategy.closedtrades)\nplot(strategy.netprofit)`,
    rule: 'TradingView v6 Strategies: price-based strategy.exit() orders use the broker emulator and can fill when a later bar range reaches the generated limit/stop price. Strategy variables reflect fills after the emulator processes them. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: () => [0, 0, 0, 1],
    expectedOutputs: () => [
      [0, 0, 0, 1],
      [0, 0, 0, 1],
    ],
    bars: STRATEGY_EXIT_BARS,
  },
  {
    id: 'priority.strategy-exit-trailing-metadata-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("priority strategy exit trailing metadata values", process_orders_on_close=true, initial_capital=1000)
if bar_index == 0
    strategy.entry("L", strategy.long, qty=2)
if strategy.position_size > 0
    strategy.exit("Trail", "L", qty=1, trail_price=1000, trail_offset=5, oca_name="TrailGroup", comment_profit="profit", comment_loss="loss", comment_trailing="trail", alert_message="alert", alert_profit="alert profit", alert_loss="alert loss", alert_trailing="alert trail", disable_alert=true)
plot(strategy.position_size)
plot(strategy.closedtrades)
plot(strategy.opentrades)`,
    rule: 'TradingView v6 Strategies: strategy.exit() can create trailing stop exit orders when trail_price/trail_points and trail_offset are supplied; qty limits the exit order quantity, and oca_name/comment_*/alert_*/disable_alert are order metadata. An unactivated trailing stop does not close an open trade. https://www.tradingview.com/pine-script-docs/concepts/strategies/#trailing-stops https://www.tradingview.com/pine-script-reference/v6/#fun_strategy.exit',
    expected: () => [2, 2, 2, 2, 2, 2, 2, 2],
    expectedOutputs: () => [
      [2, 2, 2, 2, 2, 2, 2, 2],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1, 1, 1, 1],
    ],
    bars: STRATEGY_ACCESSOR_BARS,
  },
  {
    id: 'strategy.backtest-fill-limits-assumption-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy limit verification values", backtest_fill_limits_assumption=2)
if bar_index == 0
    strategy.entry("Limit", strategy.long, qty=1, limit=100)
plot(strategy.position_size)
plot(strategy.opentrades)
plot(strategy.opentrades > 0 ? strategy.opentrades.entry_bar_index(0) : na)`,
    rule: 'TradingView v6 Strategies: backtest_fill_limits_assumption verifies limit orders by requiring price to move through the limit by the configured number of ticks. With mintick=1 and assumption=2, a long limit at 100 does not fill at low=99 and fills once low reaches 98. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: () => [0, 0, 0, 1],
    expectedOutputs: () => [
      [0, 0, 0, 1],
      [0, 0, 0, 1],
      [null, null, null, 2],
    ],
    bars: STRATEGY_LIMIT_VERIFY_BARS,
    options: () => ({ runtime: { syminfo: { mintick: 1 } } }),
  },
  {
    id: 'strategy.closedtrades-accessor-values',
    namespace: 'strategy',
    pine: `//@version=6\nstrategy("strategy closed accessor values", process_orders_on_close=true, initial_capital=1000)\nif bar_index == 0\n    strategy.entry("Win", strategy.long, qty=2)\nif bar_index == 1\n    strategy.close("Win")\nif bar_index == 2\n    strategy.entry("Loss", strategy.long, qty=1)\nif bar_index == 3\n    strategy.close("Loss")\nidx = strategy.closedtrades - 1\nhasClosed = strategy.closedtrades > 0\nplot(hasClosed ? strategy.closedtrades.entry_price(idx) : na)\nplot(hasClosed ? strategy.closedtrades.exit_price(idx) : na)\nplot(hasClosed ? strategy.closedtrades.profit(idx) : na)\nplot(hasClosed ? strategy.closedtrades.size(idx) : na)`,
    rule: 'TradingView v6 Strategies: strategy.closedtrades.* accessors return fields of the closed trade at the supplied zero-based trade index; unavailable indexes return na. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: () => [null, 100, 100, 105, 105, 105, 105, 105],
    expectedOutputs: () => [
      [null, 100, 100, 105, 105, 105, 105, 105],
      [null, 110, 110, 101, 101, 101, 101, 101],
      [null, 20, 20, -4, -4, -4, -4, -4],
      [null, 2, 2, 1, 1, 1, 1, 1],
    ],
    bars: STRATEGY_ACCESSOR_BARS,
  },
  {
    id: 'strategy.opentrades-accessor-values',
    namespace: 'strategy',
    pine: `//@version=6\nstrategy("strategy open accessor values", process_orders_on_close=true, initial_capital=1000)\nif bar_index == 0\n    strategy.entry("Open", strategy.short, qty=3)\nplot(strategy.opentrades > 0 ? strategy.opentrades.entry_price(0) : na)\nplot(strategy.opentrades > 0 ? strategy.opentrades.profit(0) : na)\nplot(strategy.opentrades > 0 ? strategy.opentrades.size(0) : na)\nplot(strategy.opentrades > 0 ? strategy.opentrades.capital_held : na)`,
    rule: 'TradingView v6 Strategies: strategy.opentrades.* accessors return fields for open trades, short positions use negative size, and capital_held reports capital reserved by open trades. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: () => [100, 100, 100, 100, 100, 100, 100, 100],
    expectedOutputs: () => [
      [100, 100, 100, 100, 100, 100, 100, 100],
      [0, -30, -15, -3, -24, -24, -18, -12],
      [-3, -3, -3, -3, -3, -3, -3, -3],
      [300, 300, 300, 300, 300, 300, 300, 300],
    ],
    bars: STRATEGY_ACCESSOR_BARS,
  },
  {
    id: 'strategy.openprofit-and-opentrade-commission-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy openprofit commission values", process_orders_on_close=true, initial_capital=1000, commission_type=strategy.commission.cash_per_contract, commission_value=2)
if bar_index == 0
    strategy.entry("Open", strategy.short, qty=3, comment="open-short")
plot(strategy.openprofit)
plot(strategy.opentrades > 0 ? strategy.opentrades.commission(0) : na)
plot(strategy.opentrades > 0 ? str.length(strategy.opentrades.entry_id(0)) : na)
plot(strategy.opentrades > 0 ? str.length(strategy.opentrades.entry_comment(0)) : na)`,
    rule: 'TradingView v6 Strategies: strategy.openprofit exposes current open P/L, strategy.commission.cash_per_contract applies commission per filled contract, and strategy.opentrades.* accessors expose open-trade commission, entry id, and entry comment. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: () => [0, -30, -15, -3, -24, -24, -18, -12],
    expectedOutputs: () => [
      [0, -30, -15, -3, -24, -24, -18, -12],
      [6, 6, 6, 6, 6, 6, 6, 6],
      [4, 4, 4, 4, 4, 4, 4, 4],
      [10, 10, 10, 10, 10, 10, 10, 10],
    ],
    bars: STRATEGY_ACCESSOR_BARS,
  },
  {
    id: 'strategy.aggregate-performance-values',
    namespace: 'strategy',
    pine: `//@version=6\nstrategy("strategy aggregate performance values", process_orders_on_close=true, initial_capital=1000)\nif bar_index == 0\n    strategy.entry("Win", strategy.long, qty=2)\nif bar_index == 1\n    strategy.close("Win")\nif bar_index == 2\n    strategy.entry("Loss", strategy.long, qty=1)\nif bar_index == 3\n    strategy.close("Loss")\nhasClosed = strategy.closedtrades > 0\nplot(strategy.grossprofit)\nplot(strategy.grossloss)\nplot(strategy.netprofit)\nplot(hasClosed ? strategy.avg_trade : na)\nplot(strategy.wintrades)\nplot(strategy.losstrades)\nplot(hasClosed ? strategy.percent_profitable : na)\nplot(hasClosed ? strategy.avg_winning_trade : na)\nplot(strategy.losstrades > 0 ? strategy.avg_losing_trade : na)\nplot(strategy.eventrades)`,
    rule: 'TradingView v6 Strategies: process_orders_on_close fills generated market orders on the closing tick, and strategy aggregate variables expose closed-trade profit/loss, averages, and win/loss/even counts as series values. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: () => [0, 20, 20, 20, 20, 20, 20, 20],
    expectedOutputs: () => [
      [0, 20, 20, 20, 20, 20, 20, 20],
      [0, 0, 0, -4, -4, -4, -4, -4],
      [0, 20, 20, 16, 16, 16, 16, 16],
      [null, 20, 20, 8, 8, 8, 8, 8],
      [0, 1, 1, 1, 1, 1, 1, 1],
      [0, 0, 0, 1, 1, 1, 1, 1],
      [null, 100, 100, 50, 50, 50, 50, 50],
      [null, 20, 20, 20, 20, 20, 20, 20],
      [null, null, null, -4, -4, -4, -4, -4],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
    outputMembers: [
      ['strategy.grossprofit'],
      ['strategy.grossloss'],
      ['strategy.netprofit'],
      ['strategy.avg_trade'],
      ['strategy.wintrades'],
      ['strategy.losstrades'],
      ['strategy.percent_profitable'],
      ['strategy.avg_winning_trade'],
      ['strategy.avg_losing_trade'],
      ['strategy.eventrades'],
    ],
    bars: STRATEGY_ACCESSOR_BARS,
  },
  {
    id: 'strategy.trade-percent-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy trade percent values", process_orders_on_close=true, initial_capital=1000)
if bar_index == 0
    strategy.entry("Win", strategy.long, qty=2)
if bar_index == 1
    strategy.close("Win")
if bar_index == 2
    strategy.entry("Loss", strategy.long, qty=1)
if bar_index == 3
    strategy.close("Loss")
if bar_index == 4
    strategy.entry("Even", strategy.long, qty=1)
if bar_index == 5
    strategy.close("Even")
if bar_index == 6
    strategy.entry("Open", strategy.short, qty=3)
plot(strategy.avg_trade_percent)
plot(strategy.avg_winning_trade_percent)
plot(strategy.avg_losing_trade_percent)
plot(strategy.opentrades > 0 ? strategy.opentrades.profit_percent(0) : na)
plot(strategy.closedtrades > 0 ? strategy.closedtrades.profit_percent(strategy.closedtrades - 1) : na)`,
    rule: 'TradingView v6 Strategies: trade-level percent variables and accessors express trade profit relative to entry notional; aggregate trade-percent variables average those closed-trade percentages by outcome. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: () => [null, 10, 10, 3.0952380952380953, 3.0952380952380953, 2.0634920634920637, 2.0634920634920637, 2.0634920634920637],
    expectedOutputs: () => [
      [null, 10, 10, 3.0952380952380953, 3.0952380952380953, 2.0634920634920637, 2.0634920634920637, 2.0634920634920637],
      [null, 10, 10, 10, 10, 10, 10, 10],
      [null, null, null, -3.8095238095238093, -3.8095238095238093, -3.8095238095238093, -3.8095238095238093, -3.8095238095238093],
      [0, null, 0, null, 0, null, 0, 6 / 318 * 100],
      [null, 10, 10, -3.8095238095238093, -3.8095238095238093, 0, 0, 0],
    ],
    bars: STRATEGY_ACCESSOR_BARS,
  },
  {
    id: 'strategy.aggregate-percent-contract-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy aggregate percent contract values", process_orders_on_close=true, initial_capital=1000)
if bar_index == 0
    strategy.entry("Win", strategy.long, qty=2)
if bar_index == 1
    strategy.close("Win")
if bar_index == 2
    strategy.entry("Loss", strategy.long, qty=1)
if bar_index == 3
    strategy.close("Loss")
if bar_index == 6
    strategy.entry("Open", strategy.short, qty=3)
plot(strategy.netprofit_percent)
plot(strategy.grossprofit_percent)
plot(strategy.grossloss_percent)
plot(strategy.openprofit_percent)
plot(strategy.max_contracts_held_all)
plot(strategy.max_contracts_held_long)
plot(strategy.max_contracts_held_short)`,
    rule: 'TradingView v6 Strategies: aggregate profit percent variables expose profit and loss as a percentage series, and max_contracts_held_* variables expose maximum historical exposure by direction. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: () => [0, 2, 2, 1.6, 1.6, 1.6, 1.6, 1.6],
    expectedOutputs: () => [
      [0, 2, 2, 1.6, 1.6, 1.6, 1.6, 1.6],
      [0, 2, 2, 2, 2, 2, 2, 2],
      [0, 0, 0, -0.4, -0.4, -0.4, -0.4, -0.4],
      [0, 0, 0, 0, 0, 0, 0, 0.6],
      [2, 2, 2, 2, 2, 2, 3, 3],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [0, 0, 0, 0, 0, 0, 3, 3],
    ],
    outputMembers: [
      ['strategy.netprofit_percent'],
      ['strategy.grossprofit_percent'],
      ['strategy.grossloss_percent'],
      ['strategy.openprofit_percent'],
      ['strategy.max_contracts_held_all'],
      ['strategy.max_contracts_held_long'],
      ['strategy.max_contracts_held_short'],
    ],
    bars: STRATEGY_ACCESSOR_BARS,
  },
  {
    id: 'strategy.closedtrades-timing-commission-values',
    namespace: 'strategy',
    pine: `//@version=6\nstrategy("strategy closed timing commission values", process_orders_on_close=true, initial_capital=1000, commission_type=strategy.commission.cash_per_order, commission_value=2)\nif bar_index == 0\n    strategy.entry("Win", strategy.long, qty=2)\nif bar_index == 1\n    strategy.close("Win")\nif bar_index == 2\n    strategy.entry("Loss", strategy.long, qty=1)\nif bar_index == 3\n    strategy.close("Loss")\nidx = strategy.closedtrades - 1\nhasClosed = strategy.closedtrades > 0\nplot(hasClosed ? strategy.closedtrades.entry_bar_index(idx) : na)\nplot(hasClosed ? strategy.closedtrades.exit_bar_index(idx) : na)\nplot(hasClosed ? strategy.closedtrades.entry_time(idx) : na)\nplot(hasClosed ? strategy.closedtrades.exit_time(idx) : na)\nplot(hasClosed ? strategy.closedtrades.commission(idx) : na)`,
    rule: 'TradingView v6 Strategies: strategy.closedtrades.* accessors return the entry/exit bar index, entry/exit time, and total commission for the closed trade at the supplied zero-based index. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: () => [null, 0, 0, 2, 2, 2, 2, 2],
    expectedOutputs: () => [
      [null, 0, 0, 2, 2, 2, 2, 2],
      [null, 1, 1, 3, 3, 3, 3, 3],
      [null, 60_000, 60_000, 180_000, 180_000, 180_000, 180_000, 180_000],
      [null, 120_000, 120_000, 240_000, 240_000, 240_000, 240_000, 240_000],
      [null, 4, 4, 4, 4, 4, 4, 4],
    ],
    outputMembers: [
      ['strategy.closedtrades.entry_bar_index'],
      ['strategy.closedtrades.exit_bar_index'],
      ['strategy.closedtrades.entry_time'],
      ['strategy.closedtrades.exit_time'],
      ['strategy.closedtrades.commission'],
    ],
    bars: STRATEGY_ACCESSOR_BARS,
  },
  {
    id: 'strategy.percent-commission-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy percent commission values", process_orders_on_close=true, initial_capital=1000, commission_type=strategy.commission.percent, commission_value=10)
if bar_index == 0
    strategy.entry("Win", strategy.long, qty=2, comment="entry-comment")
if bar_index == 1
    strategy.close("Win", comment="exit-comment")
idx = strategy.closedtrades - 1
hasClosed = strategy.closedtrades > 0
plot(hasClosed ? strategy.closedtrades.commission(idx) : na)
plot(strategy.netprofit)
plot(hasClosed ? str.length(strategy.closedtrades.entry_id(idx)) : na)
plot(hasClosed ? str.length(strategy.closedtrades.exit_id(idx)) : na)
plot(hasClosed ? str.length(strategy.closedtrades.entry_comment(idx)) : na)
plot(hasClosed ? str.length(strategy.closedtrades.exit_comment(idx)) : na)`,
    rule: 'TradingView v6 Strategies: strategy.commission.percent charges a percentage of filled notional on entry and exit, and strategy.closedtrades.* accessors expose closed-trade ids and comments. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: () => [null, 42, 42, 42, 42, 42, 42, 42],
    expectedOutputs: () => [
      [null, 42, 42, 42, 42, 42, 42, 42],
      [-20, -22, -22, -22, -22, -22, -22, -22],
      [null, 3, 3, 3, 3, 3, 3, 3],
      [null, 9, 9, 9, 9, 9, 9, 9],
      [null, 13, 13, 13, 13, 13, 13, 13],
      [null, 12, 12, 12, 12, 12, 12, 12],
    ],
    outputMembers: [
      ['strategy.closedtrades.commission'],
      ['strategy.netprofit'],
      ['strategy.closedtrades.entry_id', 'str.length'],
      ['strategy.closedtrades.exit_id', 'str.length'],
      ['strategy.closedtrades.entry_comment', 'str.length'],
      ['strategy.closedtrades.exit_comment', 'str.length'],
    ],
    bars: STRATEGY_ACCESSOR_BARS,
  },
  {
    id: 'strategy.enum-constant-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy enum constants")
plot(strategy.direction.all == strategy.direction.all ? 1 : 0)
plot(strategy.direction.short == strategy.direction.short ? 1 : 0)
plot(strategy.oca.none == strategy.oca.none ? 1 : 0)
plot(strategy.oca.cancel == strategy.oca.cancel ? 1 : 0)
plot(strategy.oca.reduce == strategy.oca.reduce ? 1 : 0)
plot(strategy.commission.percent == strategy.commission.percent ? 1 : 0)
plot(strategy.commission.cash_per_contract == strategy.commission.cash_per_contract ? 1 : 0)`,
    rule: 'TradingView v6 Strategies: strategy.direction.*, strategy.oca.*, and strategy.commission.* names are enum constants accepted by strategy declaration/order functions. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => Array.from({ length: 7 }, () => constantVector(bars, 1)),
    bars: HOSTILE_BARS,
  },
  {
    id: 'strategy.opentrades-timing-percent-values',
    namespace: 'strategy',
    pine: `//@version=6\nstrategy("strategy open timing percent values", process_orders_on_close=true, initial_capital=1000)\nif bar_index == 0\n    strategy.entry("Open", strategy.short, qty=3)\nplot(strategy.opentrades > 0 ? strategy.opentrades.entry_bar_index(0) : na)\nplot(strategy.opentrades > 0 ? strategy.opentrades.entry_time(0) : na)\nplot(strategy.opentrades > 0 ? strategy.opentrades.profit_percent(0) : na)`,
    rule: 'TradingView v6 Strategies: strategy.opentrades.* accessors return fields for the open trade at the supplied zero-based index; profit_percent is open profit divided by absolute entry notional. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: () => [0, 0, 0, 0, 0, 0, 0, 0],
    expectedOutputs: () => [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [60_000, 60_000, 60_000, 60_000, 60_000, 60_000, 60_000, 60_000],
      [0, -10, -5, -1, -8, -8, -6, -4],
    ],
    bars: STRATEGY_ACCESSOR_BARS,
  },
  {
    id: 'strategy.risk-allow-entry-direction-values',
    namespace: 'strategy',
    pine: `//@version=6\nstrategy("strategy risk allow entry direction values", process_orders_on_close=true, initial_capital=1000)\nstrategy.risk.allow_entry_in(strategy.direction.long)\nif bar_index == 0\n    strategy.entry("Long", strategy.long, qty=2)\nif bar_index == 1\n    strategy.entry("BlockedShort", strategy.short, qty=1)\nplot(strategy.position_size)\nplot(strategy.closedtrades)\nplot(strategy.netprofit)`,
    rule: 'TradingView v6 Strategies: strategy.risk.allow_entry_in() restricts allowed entry direction; an opposite-direction strategy.entry() closes the existing position instead of reversing when that direction is disallowed. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: () => [2, 0, 0, 0, 0, 0, 0, 0],
    expectedOutputs: () => [
      [2, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 1, 1, 1, 1],
      [0, 20, 20, 20, 20, 20, 20, 20],
    ],
    bars: STRATEGY_ACCESSOR_BARS,
  },
  {
    id: 'strategy.risk-max-position-size-values',
    namespace: 'strategy',
    pine: `//@version=6\nstrategy("strategy risk max position size values", pyramiding=2, process_orders_on_close=true)\nstrategy.risk.max_position_size(3)\nif bar_index == 0\n    strategy.entry("First", strategy.long, qty=5)\nif bar_index == 1\n    strategy.entry("Second", strategy.long, qty=5)\nplot(strategy.position_size)\nplot(strategy.opentrades)`,
    rule: 'TradingView v6 Strategies: strategy.risk.max_position_size() limits the maximum position size, reducing allowed entry quantity so strategy.entry() cannot exceed the configured cap. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: () => [3, 3, 3, 3],
    expectedOutputs: () => [
      [3, 3, 3, 3],
      [1, 1, 1, 1],
    ],
    bars: STRATEGY_PYRAMIDING_BARS,
  },
  {
    id: 'strategy.risk-max-drawdown-cash-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy risk max drawdown cash values", process_orders_on_close=true, initial_capital=1000)
strategy.risk.max_drawdown(5, strategy.cash, alert_message="drawdown")
if bar_index == 0
    strategy.entry("Loss", strategy.long, qty=1)
if bar_index == 1
    strategy.close("Loss")
if bar_index == 2
    strategy.entry("Blocked", strategy.long, qty=1)
plot(strategy.position_size)
plot(strategy.closedtrades)
plot(strategy.netprofit)`,
    rule: 'TradingView v6 Strategies: strategy.risk.max_drawdown() stops trading after drawdown reaches the configured value, cancels pending orders, and suppresses later entries. With initial capital 1000, a 100 to 90 long trade loses 10 cash, breaching a 5 cash drawdown limit; the later entry is therefore blocked. alert_message is alert metadata and does not change order suppression. https://www.tradingview.com/pine-script-docs/concepts/strategies/#risk-management https://www.tradingview.com/pine-script-reference/v6/#fun_strategy.risk.max_drawdown',
    expected: () => [1, 0, 0, 0],
    expectedOutputs: () => [
      [1, 0, 0, 0],
      [0, 1, 1, 1],
      [0, -10, -10, -10],
    ],
    outputMembers: [
      ['strategy.position_size'],
      ['strategy.closedtrades'],
      ['strategy.netprofit'],
    ],
    bars: STRATEGY_RISK_LOSS_BARS,
  },
  {
    id: 'strategy.risk-max-intraday-loss-cash-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy risk max intraday loss cash values", process_orders_on_close=true, initial_capital=1000)
strategy.risk.max_intraday_loss(5, strategy.cash, alert_message="intraday")
if bar_index == 0
    strategy.entry("Loss", strategy.long, qty=1)
if bar_index == 1
    strategy.close("Loss")
if bar_index == 2
    strategy.entry("Blocked", strategy.long, qty=1)
plot(strategy.position_size)
plot(strategy.closedtrades)
plot(strategy.netprofit)`,
    rule: 'TradingView v6 Strategies: strategy.risk.max_intraday_loss() stops trading for the day after intraday loss reaches the configured value, cancels pending orders, and suppresses later entries. These bars share one UTC day; the 100 to 90 long trade loses 10 cash, breaching a 5 cash intraday loss limit, so the later same-day entry is blocked. alert_message is alert metadata and does not change order suppression. https://www.tradingview.com/pine-script-docs/concepts/strategies/#risk-management https://www.tradingview.com/pine-script-reference/v6/#fun_strategy.risk.max_intraday_loss',
    expected: () => [1, 0, 0, 0],
    expectedOutputs: () => [
      [1, 0, 0, 0],
      [0, 1, 1, 1],
      [0, -10, -10, -10],
    ],
    outputMembers: [
      ['strategy.position_size'],
      ['strategy.closedtrades'],
      ['strategy.netprofit'],
    ],
    bars: STRATEGY_RISK_LOSS_BARS,
  },
  {
    id: 'strategy.cancel-pending-order-values',
    namespace: 'strategy',
    pine: `//@version=6\nstrategy("strategy cancel pending order values", pyramiding=2)\nif bar_index == 0\n    strategy.entry("Keep", strategy.long, qty=1, limit=90)\n    strategy.entry("Drop", strategy.long, qty=1, limit=90)\n    strategy.cancel("Drop")\nplot(strategy.position_size)\nplot(strategy.opentrades)`,
    rule: 'TradingView v6 Strategies: strategy.cancel() cancels a pending order by id before it fills; the uncancelled limit order can still fill when a later bar reaches its price. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: () => [0, 0, 1],
    expectedOutputs: () => [
      [0, 0, 1],
      [0, 0, 1],
    ],
    bars: STRATEGY_LIMIT_CANCEL_BARS,
  },
  {
    id: 'strategy.order-reduce-position-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy order reduce values", process_orders_on_close=true)
if bar_index == 0
    strategy.order("Long", strategy.long, qty=2)
if bar_index == 1
    strategy.order("Reduce", strategy.short, qty=1)
plot(strategy.position_size)
plot(strategy.netprofit)
plot(strategy.opentrades)`,
    rule: 'TradingView v6 Strategies: strategy.order() places an order in the specified direction and can reduce an existing opposite position; process_orders_on_close fills market orders on the same bar close. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: () => [2, 1, 1, 1],
    expectedOutputs: () => [
      [2, 1, 1, 1],
      [0, 5, 5, 5],
      [1, 1, 1, 1],
    ],
    bars: STRATEGY_PYRAMIDING_BARS,
  },
  {
    id: 'optional.strategy-order-stop-metadata-arguments',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy order stop metadata arguments", process_orders_on_close=true)
if bar_index == 0
    strategy.order("StopOrder", strategy.long, qty=2, stop=1000, comment="pending stop", alert_message="stop alert", disable_alert=true)
plot(strategy.position_size)
plot(strategy.opentrades)
plot(strategy.netprofit)`,
    officialMembers: ['strategy.order'],
    outputMembers: [['strategy.order'], ['strategy.order'], ['strategy.order']],
    rule: 'TradingView v6 Strategies: strategy.order() with a stop price creates a stop order that does not fill until price reaches the stop; comment and alert metadata do not fill an otherwise unreachable order. https://www.tradingview.com/pine-script-docs/concepts/strategies/#order-placement-and-cancellation https://www.tradingview.com/pine-script-reference/v6/#fun_strategy.order',
    expected: (bars) => constantVector(bars, 0),
    expectedOutputs: (bars) => [
      constantVector(bars, 0),
      constantVector(bars, 0),
      constantVector(bars, 0),
    ],
    bars: STRATEGY_LEDGER_ORACLE_BARS,
  },
  {
    id: 'strategy.close-all-position-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy close all values", process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=2)
if bar_index == 1
    strategy.close_all(comment="close all", alert_message="close alert", immediately=false, disable_alert=true)
plot(strategy.position_size)
plot(strategy.closedtrades)
plot(strategy.netprofit)`,
    rule: 'TradingView v6 Strategies: strategy.close_all() generates a market order that exits every open position; process_orders_on_close fills it on the bar where it is created. comment, alert_message, and disable_alert are order/alert metadata, while immediately=false preserves ordinary fill timing. https://www.tradingview.com/pine-script-docs/concepts/strategies/#strategyclose-and-strategyclose_all https://www.tradingview.com/pine-script-reference/v6/',
    expected: () => [2, 0, 0, 0],
    expectedOutputs: () => [
      [2, 0, 0, 0],
      [0, 1, 1, 1],
      [0, 10, 10, 10],
    ],
    bars: STRATEGY_PYRAMIDING_BARS,
  },
  {
    id: 'optional.strategy-declaration-high-use-arguments',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy declaration optional arguments", shorttitle="Decl", overlay=false, initial_capital=1000, margin_long=100, margin_short=100, calc_on_every_tick=false, max_bars_back=50, max_labels_count=5, max_lines_count=5, max_boxes_count=5, max_polylines_count=5, precision=2, format=format.price, scale=scale.right, explicit_plot_zorder=true, use_bar_magnifier=false, fill_orders_on_standard_ohlc=false, dynamic_requests=true, behind_chart=false, risk_free_rate=2)
plot(strategy.initial_capital)
plot(strategy.equity)`,
    officialMembers: ['strategy'],
    outputMembers: [['strategy'], ['strategy']],
    rule: 'TradingView v6 Strategies: strategy() declaration arguments configure chart placement, display precision, object limits, plot order, dynamic requests, bar magnifier, standard-OHLC fill mode, tick recalculation, margin settings, and history allocation; with no orders or margin call, they do not change initial capital or equity. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/#fun_strategy',
    expected: (bars) => constantVector(bars, 1000),
    expectedOutputs: (bars) => [
      constantVector(bars, 1000),
      constantVector(bars, 1000),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'optional.strategy-entry-stop-metadata-arguments',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy entry optional arguments", process_orders_on_close=true)
if bar_index == 0
    strategy.entry("StopEntry", strategy.long, stop=1000, oca_name="EntryGroup", oca_type=strategy.oca.cancel, alert_message="entry alert", disable_alert=true)
plot(strategy.position_size)
plot(strategy.opentrades)`,
    officialMembers: ['strategy.entry'],
    outputMembers: [['strategy.entry'], ['strategy.entry']],
    rule: 'TradingView v6 Strategies: a long strategy.entry() stop order activates only when price reaches the stop; alert_message and oca_name are order metadata and do not fill an otherwise unreachable stop. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/#fun_strategy.entry',
    expected: (bars) => constantVector(bars, 0),
    expectedOutputs: (bars) => [
      constantVector(bars, 0),
      constantVector(bars, 0),
    ],
    bars: STRATEGY_LEDGER_ORACLE_BARS,
  },
  {
    id: 'optional.strategy-exit-unreached-price-arguments',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy exit optional arguments", process_orders_on_close=true)
if bar_index == 0
    strategy.entry("L", strategy.long, qty=4)
if strategy.position_size > 0
    strategy.exit("Unreached", "L", stop=1, profit=100000, loss=100000, qty_percent=50, trail_points=100000, trail_offset=5, oca_name="exit group", comment="unreached exit", comment_profit="profit comment", comment_loss="loss comment", comment_trailing="trail comment", alert_message="exit alert", alert_profit="profit alert", alert_loss="loss alert", alert_trailing="trail alert", disable_alert=true)
plot(strategy.position_size)
plot(strategy.closedtrades)
plot(strategy.netprofit)`,
    officialMembers: ['strategy.exit'],
    outputMembers: [['strategy.exit'], ['strategy.exit'], ['strategy.exit']],
    rule: 'TradingView v6 Strategies: strategy.exit() price arguments create pending exit orders; if none of the stop, profit, loss, or trailing prices are reached, no quantity exits and no closed trade/comment is produced. oca_name, comment*, alert*, and disable_alert are order/alert metadata and do not trigger an otherwise unreachable exit. https://www.tradingview.com/pine-script-docs/concepts/strategies/#strategyexit https://www.tradingview.com/pine-script-reference/v6/#fun_strategy.exit',
    expected: (bars) => constantVector(bars, 4),
    expectedOutputs: (bars) => [
      constantVector(bars, 4),
      constantVector(bars, 0),
      constantVector(bars, 0),
    ],
    bars: STRATEGY_LEDGER_ORACLE_BARS,
  },
  {
    id: 'optional.strategy-close-all-comment-argument',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy close all comment argument", process_orders_on_close=true)
if bar_index == 0
    strategy.entry("L", strategy.long, qty=2)
if bar_index == 1
    strategy.close_all(comment="flat", alert_message="flat alert", immediately=true, disable_alert=true)
plot(strategy.closedtrades)
plot(strategy.closedtrades > 0 and strategy.closedtrades.exit_comment(0) == "flat" ? 1 : na)
plot(strategy.netprofit)`,
    officialMembers: ['strategy.close_all'],
    outputMembers: [['strategy.close_all'], ['strategy.close_all'], ['strategy.close_all']],
    rule: 'TradingView v6 Strategies: strategy.close_all(comment=...) creates a market exit for all open position size, and the supplied comment is recorded as the closed trade exit comment. https://www.tradingview.com/pine-script-docs/concepts/strategies/#strategyclose-and-strategyclose_all https://www.tradingview.com/pine-script-reference/v6/#fun_strategy.close_all',
    expected: () => [0, 1, 1, 1],
    expectedOutputs: () => [
      [0, 1, 1, 1],
      [null, 1, 1, 1],
      [0, 20, 20, 20],
    ],
    bars: STRATEGY_LEDGER_ORACLE_BARS,
  },
  {
    id: 'optional.strategy-close-metadata-arguments',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy close metadata arguments", process_orders_on_close=true)
if bar_index == 0
    strategy.entry("L", strategy.long, qty=2)
if bar_index == 1
    strategy.close("L", comment="close", alert_message="close alert", immediately=true, disable_alert=true)
plot(strategy.closedtrades)
plot(strategy.closedtrades > 0 and strategy.closedtrades.exit_comment(0) == "close" ? 1 : na)
plot(strategy.netprofit)`,
    officialMembers: ['strategy.close'],
    outputMembers: [['strategy.close'], ['strategy.close'], ['strategy.close']],
    rule: 'TradingView v6 Strategies: strategy.close() creates a market exit for the named entry id; comment and alert/disable metadata do not alter the filled quantity or profit, and immediately permits same-tick closing where otherwise supported. https://www.tradingview.com/pine-script-docs/concepts/strategies/#strategyclose-and-strategyclose_all https://www.tradingview.com/pine-script-reference/v6/#fun_strategy.close',
    expected: () => [0, 1, 1, 1],
    expectedOutputs: () => [
      [0, 1, 1, 1],
      [null, 1, 1, 1],
      [0, 20, 20, 20],
    ],
    bars: STRATEGY_LEDGER_ORACLE_BARS,
  },
  {
    id: 'strategy.cancel-all-pending-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy cancel all values")
if bar_index == 0
    strategy.entry("Drop A", strategy.long, qty=1, limit=90)
    strategy.entry("Drop B", strategy.long, qty=1, limit=90)
    strategy.cancel_all()
plot(strategy.position_size)
plot(strategy.opentrades)`,
    rule: 'TradingView v6 Strategies: strategy.cancel_all() cancels all pending orders before they can fill on later bars. https://www.tradingview.com/pine-script-docs/concepts/strategies/#strategycancel-and-strategycancel_all https://www.tradingview.com/pine-script-reference/v6/',
    expected: () => [0, 0, 0],
    expectedOutputs: () => [
      [0, 0, 0],
      [0, 0, 0],
    ],
    bars: STRATEGY_LIMIT_CANCEL_BARS,
  },
  {
    id: 'strategy.currency-conversion-values',
    namespace: 'strategy',
    pine: `//@version=6\nstrategy("strategy currency conversion values", currency=currency.JPY)\nplot(strategy.convert_to_account(2))\nplot(strategy.convert_to_symbol(300))`,
    rule: 'TradingView v6 Strategies: strategy.convert_to_account() converts symbol-currency values into the strategy account currency, and strategy.convert_to_symbol() converts account-currency values back to the symbol currency using the relevant currency rate. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: () => [300, 300, 300, 302, 302, 302],
    expectedOutputs: () => [
      [300, 300, 300, 302, 302, 302],
      [2, 2, 2, 300 / 151, 300 / 151, 300 / 151],
    ],
    bars: REQUEST_CHART_BARS,
    options: () => ({ requestDatafeed: requestPointDatafeed(), runtime: { syminfo: { currency: 'USD' } } }),
  },
  {
    id: 'strategy.default-entry-quantity-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy default entry quantity values", initial_capital=10000, default_qty_type=strategy.percent_of_equity, default_qty_value=25)
plot(strategy.default_entry_qty(50))
plot(strategy.percent_of_equity == strategy.percent_of_equity ? 1 : 0)`,
    rule: 'TradingView v6 Strategies: strategy.default_entry_qty(fill_price) returns the default order size implied by the strategy declaration; percent_of_equity sizing uses equity, default percentage, and the supplied fill price. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 50),
    expectedOutputs: (bars) => [
      constantVector(bars, 50),
      constantVector(bars, 1),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'strategy.default-cash-fixed-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy default cash fixed values", default_qty_type=strategy.cash, default_qty_value=2000)
cashQty = strategy.default_entry_qty(fill_price=200)
fixedMarker = strategy.fixed == strategy.fixed ? 1 : 0
cashMarker = strategy.cash == strategy.cash ? 1 : 0
plot(cashQty)
plot(fixedMarker)
plot(cashMarker)`,
    rule: 'TradingView v6 Strategies: cash default sizing divides the configured cash amount by the supplied fill price, and strategy.cash/strategy.fixed are declaration constants. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 10),
    expectedOutputs: (bars) => [
      constantVector(bars, 10),
      constantVector(bars, 1),
      constantVector(bars, 1),
    ],
    bars: HOSTILE_BARS,
  },
  {
    id: 'strategy.account-position-name-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy account position name values", currency=currency.EUR, process_orders_on_close=true)
if bar_index == 0
    strategy.entry("NamedLong", strategy.long, qty=1)
plot(strategy.account_currency == "EUR" ? 1 : 0)
plot(strategy.position_entry_name == "NamedLong" ? 1 : 0)`,
    rule: 'TradingView v6 Strategies: strategy.account_currency exposes the strategy declaration currency, and strategy.position_entry_name exposes the id of the current open position entry. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: (bars) => constantVector(bars, 1),
    expectedOutputs: (bars) => [
      constantVector(bars, 1),
      constantVector(bars, 1),
    ],
    bars: STRATEGY_PYRAMIDING_BARS,
  },
  {
    id: 'strategy.trade-runup-drawdown-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy trade runup drawdown values", process_orders_on_close=true, initial_capital=1000)
if bar_index == 0
    strategy.entry("Win", strategy.long, qty=2)
if bar_index == 1
    strategy.close("Win")
if bar_index == 2
    strategy.entry("Loss", strategy.long, qty=1)
if bar_index == 3
    strategy.close("Loss")
if bar_index == 6
    strategy.entry("Open", strategy.short, qty=3)
idx = strategy.closedtrades - 1
hasClosed = strategy.closedtrades > 0
plot(hasClosed ? strategy.closedtrades.max_runup(idx) : na)
plot(hasClosed ? strategy.closedtrades.max_drawdown(idx) : na)
plot(hasClosed ? strategy.closedtrades.first_index : na)
plot(hasClosed ? strategy.closedtrades.max_runup_percent(idx) : na)
plot(hasClosed ? strategy.closedtrades.max_drawdown_percent(idx) : na)
plot(strategy.opentrades > 0 ? strategy.opentrades.max_runup(0) : na)
plot(strategy.opentrades > 0 ? strategy.opentrades.max_drawdown(0) : na)
plot(strategy.opentrades > 0 ? strategy.opentrades.max_runup_percent(0) : na)
plot(strategy.opentrades > 0 ? strategy.opentrades.max_drawdown_percent(0) : na)`,
    rule: 'TradingView v6 Strategies: strategy.closedtrades.* and strategy.opentrades.* runup/drawdown accessors return the maximum favorable and adverse trade excursions for the selected zero-based trade index. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: () => [null, 24, 24, 0, 0, 0, 0, 0],
    expectedOutputs: () => [
      [null, 24, 24, 0, 0, 0, 0, 0],
      [null, 0, 0, 6, 6, 6, 6, 6],
      [null, 0, 0, 0, 0, 0, 0, 0],
      [null, 12, 12, 0, 0, 0, 0, 0],
      [null, 0, 0, 5.714285714285714, 5.714285714285714, 5.714285714285714, 5.714285714285714, 5.714285714285714],
      [0, null, 0, null, null, null, 0, 12],
      [0, null, 0, null, null, null, 0, 0],
      [0, null, 0, null, null, null, 0, 3.7735849056603774],
      [0, null, 0, null, null, null, 0, 0],
    ],
    outputMembers: [
      ['strategy.closedtrades.max_runup'],
      ['strategy.closedtrades.max_drawdown'],
      ['strategy.closedtrades.first_index'],
      ['strategy.closedtrades.max_runup_percent'],
      ['strategy.closedtrades.max_drawdown_percent'],
      ['strategy.opentrades.max_runup'],
      ['strategy.opentrades.max_drawdown'],
      ['strategy.opentrades.max_runup_percent'],
      ['strategy.opentrades.max_drawdown_percent'],
    ],
    bars: STRATEGY_ACCESSOR_BARS,
  },
  {
    id: 'strategy.aggregate-runup-drawdown-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy aggregate runup drawdown values", process_orders_on_close=true, initial_capital=1000)
if bar_index == 0
    strategy.entry("Win", strategy.long, qty=2)
if bar_index == 1
    strategy.close("Win")
if bar_index == 2
    strategy.entry("Loss", strategy.long, qty=1)
if bar_index == 3
    strategy.close("Loss")
plot(strategy.max_runup)
plot(strategy.max_drawdown)`,
    rule: 'TradingView v6 Strategies: strategy.max_runup and strategy.max_drawdown expose peak favorable and adverse equity excursions. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: () => [0, 24, 24, 24, 24, 24, 24, 24],
    expectedOutputs: () => [
      [0, 24, 24, 24, 24, 24, 24, 24],
      [0, 0, 0, 6, 6, 6, 6, 6],
    ],
    bars: STRATEGY_ACCESSOR_BARS,
  },
  {
    id: 'strategy.aggregate-runup-percent-values',
    namespace: 'strategy',
    pine: `//@version=6
strategy("strategy aggregate runup percent values", process_orders_on_close=true, initial_capital=1000)
if bar_index == 0
    strategy.entry("Win", strategy.long, qty=2)
if bar_index == 1
    strategy.close("Win")
if bar_index == 2
    strategy.entry("Loss", strategy.long, qty=1)
if bar_index == 3
    strategy.close("Loss")
plot(strategy.max_runup_percent)
plot(strategy.max_drawdown_percent)`,
    rule: 'TradingView v6 Strategies: strategy.max_runup_percent and strategy.max_drawdown_percent expose peak favorable and adverse equity excursions as percentages of equity basis. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: () => [0, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4],
    expectedOutputs: () => [
      [0, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4],
      [0, 0, 0, 0.5882352941176471, 0.5882352941176471, 0.5882352941176471, 0.5882352941176471, 0.5882352941176471],
    ],
    bars: STRATEGY_ACCESSOR_BARS,
  },
  {
    id: 'strategy.pyramiding-cap-values',
    namespace: 'strategy',
    pine: `//@version=6\nstrategy("strategy pyramiding cap values", pyramiding=2, process_orders_on_close=true)\nif bar_index <= 2\n    strategy.entry("Long " + str.tostring(bar_index), strategy.long, qty=1)\nplot(strategy.position_size)\nplot(strategy.opentrades)`,
    rule: 'TradingView v6 Strategies: the pyramiding setting caps the number of successive entries in the same direction that strategy.entry() can open. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: () => [1, 2, 2, 2],
    expectedOutputs: () => [
      [1, 2, 2, 2],
      [1, 2, 2, 2],
    ],
    bars: STRATEGY_PYRAMIDING_BARS,
  },
  {
    id: 'strategy.calc-on-order-fills-values',
    namespace: 'strategy',
    pine: `//@version=6\nstrategy("strategy calc on order fills values", calc_on_order_fills=true, process_orders_on_close=true)\nvar executions = 0\nexecutions += 1\nif bar_index == 0\n    strategy.entry("Long", strategy.long, qty=1)\nplot(executions)`,
    rule: 'TradingView v6 Strategies: calc_on_order_fills=true recalculates the strategy immediately after an order fills, so persistent state can update more than once on the fill bar. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: () => [2, 3],
    bars: STRATEGY_HISTORY_TICK_BARS.slice(0, 2).map((bar) => ({
      ...bar,
      high: bar.close,
      low: bar.close,
      open: bar.close,
    })),
  },
  {
    id: 'strategy.calc-on-every-history-tick-values',
    namespace: 'strategy',
    pine: `//@version=6\nstrategy("strategy calc on every history tick values", calc_on_every_history_tick=true)\nvar executions = 0\nexecutions += 1\nplot(close, title="Close")\nplot(executions, title="Executions")`,
    rule: 'TradingView v6 Strategies: calc_on_every_history_tick=true recalculates the strategy on each historical OHLC tick, but visual outputs remain one value per chart bar: recalculation replaces the current bar output rather than appending tick outputs as new bars. https://www.tradingview.com/pine-script-docs/concepts/strategies/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: () => [101, 106],
    expectedOutputs: () => [
      [101, 106],
      [4, 8],
    ],
    expectedPlots: () => [
      { type: 'plot', title: 'Close', values: [101, 106] },
      { type: 'plot', title: 'Executions', values: [4, 8] },
    ],
    bars: STRATEGY_HISTORY_TICK_BARS,
  },
  {
    id: 'request.security-barmerge-modes',
    namespace: 'request',
    pine: `//@version=6
indicator("request security barmerge values")
offGapsOff = request.security("TEST", "D", close, gaps=barmerge.gaps_off, lookahead=barmerge.lookahead_off)
offGapsOn = request.security("TEST", "D", close, gaps=barmerge.gaps_on, lookahead=barmerge.lookahead_off)
onGapsOff = request.security("TEST", "D", close, gaps=barmerge.gaps_off, lookahead=barmerge.lookahead_on)
onGapsOn = request.security("TEST", "D", close, gaps=barmerge.gaps_on, lookahead=barmerge.lookahead_on)
plot(offGapsOff)
plot(offGapsOn)
plot(onGapsOff)
plot(onGapsOn)`,
    rule: 'TradingView v6 Other timeframes and data: request.security() merges requested data according to barmerge.gaps_* and barmerge.lookahead_*; lookahead_on exposes the current requested bar, while lookahead_off waits for confirmed requested bars. https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/',
    expected: () => [null, null, 12, 12, 14, 14],
    expectedOutputs: () => [
      [null, null, 12, 12, 14, 14],
      [null, null, 12, null, 14, null],
      [12, 12, 14, 14, 16, 16],
      [12, null, 14, null, 16, null],
    ],
    outputMembers: [
      ['request.security'],
      ['request.security'],
      ['request.security'],
      ['request.security'],
    ],
    bars: REQUEST_CHART_BARS,
    options: () => ({ requestDatafeed: requestDatafeed() }),
  },
  {
    id: 'request.security-lower-tf-lookahead',
    namespace: 'request',
    pine: `//@version=6
indicator("request lower timeframe lookahead")
first = request.security("TEST", "1", close, lookahead=barmerge.lookahead_on)
last = request.security("TEST", "1", close, lookahead=barmerge.lookahead_off)
plot(first)
plot(last)`,
    rule: 'TradingView v6 Other timeframes and data: requesting a lower timeframe through request.security() can select the first or last intrabar according to lookahead. https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/',
    expected: () => [11, 21, 31],
    expectedOutputs: () => [
      [11, 21, 31],
      [13, 24, 34],
    ],
    outputMembers: [
      ['request.security'],
      ['request.security'],
    ],
    bars: REQUEST_LOWER_CHART_BARS,
    options: () => ({ requestDatafeed: requestDatafeed(), runtime: { timeframe: { period: '2' } } }),
  },
  {
    id: 'request.security-loop-local-symbol-values',
    namespace: 'request',
    pine: `//@version=6
indicator("request loop local symbol values")
var array<string> symbols = array.from("AAA", "BBB")
float total = 0.0
for i = 0 to array.size(symbols) - 1
    symbol = array.get(symbols, i)
    total += request.security(symbol, "D", close, gaps=barmerge.gaps_off, lookahead=barmerge.lookahead_on)
plot(total)`,
    rule: 'TradingView v6 Other timeframes and data: dynamic request contexts can be computed in loops when dynamic requests are enabled; ordinary lexical scope resolves a loop-local variable before any built-in or namespace alias. https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/ https://www.tradingview.com/pine-script-docs/language/variable-declarations/',
    expected: () => [324, 324, 328, 328, 332, 332],
    bars: REQUEST_CHART_BARS,
    options: () => ({ requestDatafeed: requestDatafeed() }),
  },
  {
    id: 'request.security-lower-tf-array-values',
    namespace: 'request',
    pine: `//@version=6
indicator("request lower timeframe array values")
values = request.security_lower_tf("TEST", "1", close)
plot(array.size(values))
plot(array.size(values) > 0 ? array.first(values) : na)
plot(array.size(values) > 0 ? array.last(values) : na)
plot(array.size(values) > 0 ? array.sum(values) : na)`,
    rule: 'TradingView v6 Other timeframes and data: request.security_lower_tf() returns an array containing all available intrabar expression values for each chart bar. https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/ https://www.tradingview.com/pine-script-reference/v6/#fun_request.security_lower_tf',
    expected: () => [2, 2, 2],
    expectedOutputs: () => [
      [2, 2, 2],
      [11, 21, 31],
      [13, 24, 34],
      [24, 45, 65],
    ],
    outputMembers: [
      ['request.security_lower_tf'],
      ['request.security_lower_tf'],
      ['request.security_lower_tf'],
      ['request.security_lower_tf'],
    ],
    bars: REQUEST_LOWER_CHART_BARS,
    options: () => ({ requestDatafeed: requestDatafeed(), runtime: { timeframe: { period: '2' } } }),
  },
  {
    id: 'request.currency-rate-points',
    namespace: 'request',
    pine: `//@version=6
indicator("request currency rate values")
plot(request.currency_rate("USD", "JPY"))`,
    rule: 'TradingView v6 Other timeframes and data: request.currency_rate() returns the latest available daily FX rate for the requested currency pair. https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/',
    expected: () => [150, 150, 150, 151, 151, 151],
    outputMembers: [
      ['request.currency_rate'],
    ],
    bars: REQUEST_CHART_BARS,
    options: () => ({ requestDatafeed: requestPointDatafeed() }),
  },
  {
    id: 'request.corporate-actions-points',
    namespace: 'request',
    pine: `//@version=6
indicator("request corporate action values")
gross = request.dividends("NASDAQ:AAPL", dividends.gross, currency=currency.USD)
net = request.dividends("NASDAQ:AAPL", dividends.net, gaps=barmerge.gaps_on, currency="USD")
actual = request.earnings("NASDAQ:AAPL", earnings.actual, currency="USD")
standardized = request.earnings("NASDAQ:AAPL", earnings.standardized, gaps=barmerge.gaps_on, currency="USD")
splitNum = request.splits("NASDAQ:AAPL", splits.numerator)
splitDen = request.splits("NASDAQ:AAPL", splits.denominator)
plot(gross)
plot(net)
plot(actual)
plot(standardized)
plot(splitNum)
plot(splitDen)`,
    rule: 'TradingView v6 Other timeframes and data: request.dividends(), request.earnings(), and request.splits() return corporate-action event fields merged onto chart bars, with gaps_on emitting only event bars. https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/',
    expected: () => [null, 0.24, 0.24, 0.24, 0.25, 0.25],
    expectedOutputs: () => [
      [null, 0.24, 0.24, 0.24, 0.25, 0.25],
      [null, 0.2, null, null, 0.21, null],
      [1.5, 1.5, 1.5, 1.5, 1.8, 1.8],
      [1.45, null, null, null, 1.75, null],
      [null, null, null, 2, 2, 2],
      [null, null, null, 1, 1, 1],
    ],
    outputMembers: [
      ['request.dividends'],
      ['request.dividends'],
      ['request.earnings'],
      ['request.earnings'],
      ['request.splits'],
      ['request.splits'],
    ],
    bars: REQUEST_CHART_BARS,
    options: () => ({ requestDatafeed: requestPointDatafeed() }),
  },
  {
    id: 'request.financial-economic-points',
    namespace: 'request',
    pine: `//@version=6
indicator("request financial economic values")
revenue = request.financial("NASDAQ:AAPL", "TOTAL_REVENUE", "FQ", currency="USD")
gdp = request.economic("US", "GDP")
plot(revenue)
plot(gdp)`,
    rule: 'TradingView v6 Other timeframes and data: request.financial() and request.economic() return the latest reported point value for the requested symbol/country field. https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/',
    expected: () => [1000, 1000, 1000, 1000, 1100, 1100],
    expectedOutputs: () => [
      [1000, 1000, 1000, 1000, 1100, 1100],
      [3.1, 3.1, 3.1, 3.3, 3.3, 3.3],
    ],
    outputMembers: [
      ['request.financial'],
      ['request.economic'],
    ],
    bars: REQUEST_CHART_BARS,
    options: () => ({ requestDatafeed: requestPointDatafeed() }),
  },
  {
    id: 'request.point-gaps-options',
    namespace: 'request',
    pine: `//@version=6
indicator("request point gaps options")
revenue = request.financial("NASDAQ:AAPL", "TOTAL_REVENUE", "FQ", gaps=barmerge.gaps_on, currency="USD")
splitNum = request.splits("NASDAQ:AAPL", splits.numerator, gaps=barmerge.gaps_on)
plot(revenue)
plot(splitNum)`,
    rule: 'TradingView v6 Other timeframes and data: point-data requests with gaps=barmerge.gaps_on return values only on bars where new requested data exists instead of filling forward. https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/',
    expected: () => [1000, null, null, null, 1100, null],
    expectedOutputs: () => [
      [1000, null, null, null, 1100, null],
      [null, null, null, 2, null, null],
    ],
    outputMembers: [
      ['request.financial'],
      ['request.splits'],
    ],
    bars: REQUEST_CHART_BARS,
    options: () => ({ requestDatafeed: requestPointDatafeed() }),
  },
  {
    id: 'request.economic-gaps-option',
    namespace: 'request',
    pine: `//@version=6
indicator("request economic gaps option")
plot(request.economic("US", "GDP", gaps=barmerge.gaps_on))`,
    rule: 'TradingView v6 Other timeframes and data: point-data requests with gaps=barmerge.gaps_on return values only on bars where new requested data exists instead of filling forward. https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/',
    expected: () => [3.1, null, null, 3.3, null, null],
    bars: REQUEST_CHART_BARS,
    options: () => ({ requestDatafeed: requestPointDatafeed() }),
  },
  {
    id: 'request.ignore-invalid-options',
    namespace: 'request',
    pine: `//@version=6
indicator("request ignore invalid options")
sec = request.security("MISSING", "D", close, ignore_invalid_symbol=true)
ltf = request.security_lower_tf("MISSING", "1", close, ignore_invalid_symbol=true)
badTf = request.security_lower_tf("TEST", "BAD", close, ignore_invalid_timeframe=true)
rate = request.currency_rate("BAD", "JPY", ignore_invalid_currency=true)
div = request.dividends("MISSING", dividends.gross, ignore_invalid_symbol=true)
earn = request.earnings("MISSING", earnings.actual, ignore_invalid_symbol=true)
split = request.splits("MISSING", splits.numerator, ignore_invalid_symbol=true)
fin = request.financial("MISSING", "TOTAL_REVENUE", "FQ", ignore_invalid_symbol=true)
econ = request.economic("ZZ", "GDP", ignore_invalid_symbol=true)
plot(sec)
plot(array.size(ltf))
plot(array.size(badTf))
plot(rate)
plot(div)
plot(earn)
plot(split)
plot(fin)
plot(econ)`,
    rule: 'TradingView v6 Other timeframes and data: request.* ignore_invalid_* arguments suppress invalid-symbol/currency/timeframe runtime errors and return `na` or an empty lower-timeframe array instead. https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/ https://www.tradingview.com/pine-script-reference/v6/',
    expected: nullVector,
    expectedOutputs: (bars) => [
      nullVector(bars),
      constantVector(bars, 0),
      constantVector(bars, 0),
      nullVector(bars),
      nullVector(bars),
      nullVector(bars),
      nullVector(bars),
      nullVector(bars),
      nullVector(bars),
    ],
    bars: REQUEST_CHART_BARS,
    options: () => ({ requestDatafeed: requestPointDatafeed() }),
  },
  {
    id: 'udf.ta.call-sites',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("UDF call sites")\nsmooth(series float source, simple int length) => ta.sma(source, length)\nfast = smooth(close, 3)\nslow = smooth(close, 5)\nplot(fast)\nplot(slow)`,
    rule: `TradingView v6 User-defined functions: each written call to a UDF evaluates its body independently at that call site; the returned ta.sma values follow the published arithmetic moving-average formula. https://www.tradingview.com/pine-script-docs/language/user-defined-functions/ ${TA_SMA_FORMULA_CITATION}`,
    expected: (bars) => sma(bars, 3),
    expectedOutputs: (bars) => [sma(bars, 3), sma(bars, 5)],
    discriminationProof: {
      ...TA_MOVING_AVERAGE_SEED_DISCRIMINATION,
      helperFormulaCitation: TA_SMA_FORMULA_CITATION,
    },
  },
  {
    id: 'udf.var.call-sites',
    namespace: 'runtime',
    pine: `//@version=6\nindicator("UDF persistent call sites")\naccumulate(series float source) =>\n    var float total = 0.0\n    total += source\n    total\ncloseTotal = accumulate(close)\nopenTotal = accumulate(open)\nplot(closeTotal)\nplot(openTotal)`,
    expected: (bars) => persistentSeries(bars, (bar) => bar.close),
    expectedOutputs: (bars) => [
      persistentSeries(bars, (bar) => bar.close),
      persistentSeries(bars, (bar) => bar.open),
    ],
  },
  {
    id: 'udf.barssince.call-sites-hostile',
    namespace: 'runtime',
    pine: `//@version=6
indicator("UDF barssince call sites")
since(level) => ta.barssince(close > level)
low = since(0)
high = since(12)
plot(low)
plot(high)`,
    expected: (bars) => barsSinceAbove(bars, 0),
    expectedOutputs: (bars) => [barsSinceAbove(bars, 0), barsSinceAbove(bars, 12)],
    bars: HOLE_BARS,
  },
  {
    id: 'udf.valuewhen.call-sites-hostile',
    namespace: 'runtime',
    pine: `//@version=6
indicator("UDF valuewhen call sites")
remember(level) => ta.valuewhen(close > level, close, 0)
low = remember(0)
high = remember(12)
plot(low)
plot(high)`,
    expected: (bars) => valueWhenAbove(bars, 0),
    expectedOutputs: (bars) => [valueWhenAbove(bars, 0), valueWhenAbove(bars, 12)],
    bars: HOLE_BARS,
  },
]);

export const CASES: ValueVectorCase[] = VALUE_VECTOR_CASES_WITH_SOURCE_CITATIONS;

function normalize(values: unknown[]): VectorValue[] {
  return values.map((value) => typeof value === 'number' && Number.isFinite(value) ? value : null);
}

function normalizeDrawingValue(value: unknown): unknown {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map(normalizeDrawingValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== 'id' && key !== 'scriptId')
        .map(([key, entry]) => [key, normalizeDrawingValue(entry)])
        .sort(([left], [right]) => String(left).localeCompare(String(right))),
    );
  }
  return value;
}

function normalizeDrawings(drawings: DrawingOutput[]): unknown[] {
  return drawings.map(normalizeDrawingValue);
}

function normalizePlots(plots: PlotOutput[]): unknown[] {
  return plots.map((plot) => normalizeDrawingValue(plot));
}

function normalizeAlerts(alerts: AlertOutput[]): unknown[] {
  return alerts.map((alert) => normalizeDrawingValue(alert));
}

function normalizeLogs(logs: LogOutput[]): unknown[] {
  return logs.map((log) => normalizeDrawingValue(log));
}

function matches(actual: VectorValue[] | null, expected: VectorValue[], tolerance = 1e-9): boolean {
  if (!actual || actual.length !== expected.length) return false;
  return actual.every((value, index) => {
    const target = expected[index];
    if (value === null || target === null) return value === target;
    return Math.abs(value - target) <= tolerance * Math.max(1, Math.abs(value), Math.abs(target));
  });
}

function valueMatches(actual: VectorValue | undefined, expected: VectorValue | undefined, tolerance = 1e-9): boolean {
  if (actual === null || expected === null || actual === undefined || expected === undefined) return actual === expected;
  return Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(actual), Math.abs(expected));
}

function mismatchBars(actual: VectorValue[][] | null, expected: VectorValue[][]): number[] {
  if (actual === null) return expected.length > 0 ? expected[0]!.map((_value, index) => index) : [];
  const barCount = Math.max(actual[0]?.length ?? 0, expected[0]?.length ?? 0);
  return Array.from({ length: barCount }, (_value, barIndex) => barIndex)
    .filter((barIndex) => expected.some((expectedPlot, plotIndex) =>
      !valueMatches(actual[plotIndex]?.[barIndex], expectedPlot[barIndex])));
}

function mismatchDetails(
  actual: VectorValue[][] | null,
  expected: VectorValue[][],
): Array<{ bar: number; expected: VectorValue[]; actual: VectorValue[] | null }> {
  return mismatchBars(actual, expected).map((bar) => ({
    bar,
    expected: expected.map((plot) => plot[bar] ?? null),
    actual: actual === null ? null : actual.map((plot) => plot[bar] ?? null),
  }));
}

function matchesOutputs(actual: VectorValue[][] | null, expected: VectorValue[][]): boolean {
  return actual !== null
    && actual.length === expected.length
    && actual.every((values, index) => matches(values, expected[index]!));
}

function drawingSubsetMatches(actual: unknown, expected: unknown): boolean {
  if (expected === null || typeof expected !== 'object') {
    if (typeof actual === 'number' && typeof expected === 'number') {
      return Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(actual), Math.abs(expected));
    }
    return actual === expected;
  }
  if (Array.isArray(expected)) {
    return Array.isArray(actual)
      && actual.length === expected.length
      && expected.every((entry, index) => drawingSubsetMatches(actual[index], entry));
  }
  if (!actual || typeof actual !== 'object' || Array.isArray(actual)) return false;
  return Object.entries(expected).every(([key, value]) =>
    drawingSubsetMatches((actual as Record<string, unknown>)[key], value));
}

function matchesDrawings(actual: unknown[] | null, expected: ExpectedDrawingValue[] | undefined): boolean {
  if (!expected) return true;
  return actual !== null
    && actual.length === expected.length
    && expected.every((drawing, index) => drawingSubsetMatches(actual[index], drawing));
}

function matchesPlots(actual: unknown[] | null, expected: ExpectedPlotValue[] | undefined): boolean {
  if (!expected) return true;
  return actual !== null
    && actual.length === expected.length
    && expected.every((plot, index) => drawingSubsetMatches(actual[index], plot));
}

function matchesAlerts(actual: unknown[] | null, expected: ExpectedAlertValue[] | undefined): boolean {
  if (!expected) return true;
  return actual !== null
    && actual.length === expected.length
    && expected.every((alert, index) => drawingSubsetMatches(actual[index], alert));
}

function matchesLogs(actual: unknown[] | null, expected: ExpectedLogValue[] | undefined): boolean {
  if (!expected) return true;
  return actual !== null
    && actual.length === expected.length
    && expected.every((log, index) => drawingSubsetMatches(actual[index], log));
}

function diagnosticForSemantic(ast: Program): string[] {
  return checkProgram(ast).diagnostics
    .filter((diagnostic) => diagnostic.severity === 'error')
    .map((diagnostic) => `${diagnostic.line ?? '?'}:${diagnostic.column ?? '?'}: ${diagnostic.code}: ${diagnostic.message}`);
}

function diagnosticsMatch(actual: readonly string[], expected: readonly string[] | undefined): boolean {
  if (!expected) return false;
  return expected.every((needle) => actual.some((diagnostic) => diagnostic.includes(needle)));
}

let discriminationExemptionIds: Set<string> | undefined;

function resolvePackagePath(path: string): string {
  return existsSync(path) ? path : `packages/tealscript/${path}`;
}

function loadValueVectorDiscriminationExemptionIds(): Set<string> {
  if (discriminationExemptionIds) return discriminationExemptionIds;
  const path = resolvePackagePath(VALUE_VECTOR_DISCRIMINATION_EXEMPTIONS_REPORT);
  if (!existsSync(path)) {
    throw new Error(`Missing value-vector red-first exemption report: ${VALUE_VECTOR_DISCRIMINATION_EXEMPTIONS_REPORT}`);
  }
  const report = JSON.parse(readFileSync(path, 'utf8')) as { exemptions?: ValueVectorDiscriminationExemption[] };
  const ids = report.exemptions?.map((entry) => entry.id).filter((id): id is string => typeof id === 'string') ?? [];
  discriminationExemptionIds = new Set(ids);
  return discriminationExemptionIds;
}

function expectationSource(testCase: ValueVectorCase): string {
  return [
    testCase.expected,
    testCase.expectedOutputs,
    testCase.expectedPlots,
    testCase.expectedDrawings,
    testCase.expectedAlerts,
    testCase.expectedLogs,
  ]
    .filter(Boolean)
    .map((fn) => String(fn))
    .join('\n');
}

function helperNamesForExpectation(testCase: ValueVectorCase): string[] {
  const source = expectationSource(testCase);
  return VALUE_VECTOR_HELPER_NAMES.filter((helper) => new RegExp(`\\b${helper}\\s*\\(`).test(source));
}

function cloneOutputs(outputs: VectorValue[][]): VectorValue[][] {
  return outputs.map((series) => [...series]);
}

function mutateExpectedOutputs(outputs: VectorValue[][], mutation: ValueVectorDiscriminationMutation): VectorValue[][] | null {
  if (outputs.length === 0) return null;
  switch (mutation) {
    case 'truncate-first-output': {
      if ((outputs[0]?.length ?? 0) === 0) return null;
      const mutated = cloneOutputs(outputs);
      mutated[0] = mutated[0]!.slice(0, -1);
      return mutated;
    }
    case 'drop-first-output': {
      return outputs.length > 1 ? cloneOutputs(outputs).slice(1) : [];
    }
    case 'flip-first-value': {
      const seriesIndex = outputs.findIndex((series) => series.length > 0);
      if (seriesIndex < 0) return null;
      const mutated = cloneOutputs(outputs);
      const first = mutated[seriesIndex]![0];
      mutated[seriesIndex]![0] = first === null ? 0 : first + 1;
      return mutated;
    }
    case 'flip-first-non-null-value': {
      const seriesIndex = outputs.findIndex((series) => series.some((value) => value !== null));
      if (seriesIndex < 0) return null;
      const valueIndex = outputs[seriesIndex]!.findIndex((value) => value !== null);
      const mutated = cloneOutputs(outputs);
      mutated[seriesIndex]![valueIndex] = mutated[seriesIndex]![valueIndex]! + 1;
      return mutated;
    }
  }
}

function mutationFlipsCaseRed(result: ValueVectorResult, mutation: ValueVectorDiscriminationMutation): boolean {
  if (result.compiledOutputs == null || result.publicPathOutputs == null) return false;
  const mutated = mutateExpectedOutputs(result.expectedOutputs ?? [result.expected], mutation);
  if (!mutated) return false;
  return !matchesOutputs(result.compiledOutputs, mutated)
    && !matchesOutputs(result.publicPathOutputs, mutated);
}

export function validateValueVectorDiscriminationProofs(
  cases: readonly ValueVectorCase[] = CASES,
  results: readonly ValueVectorResult[] = runValueVectors(),
  exemptedIds: Set<string> = loadValueVectorDiscriminationExemptionIds(),
): string[] {
  const failures: string[] = [];
  const resultsById = new Map(results.map((result) => [result.id, result]));
  const allowedMutations = new Set<ValueVectorDiscriminationMutation>([
    'truncate-first-output',
    'flip-first-value',
    'flip-first-non-null-value',
    'drop-first-output',
  ]);
  const valueFlippingMutations = new Set<ValueVectorDiscriminationMutation>([
    'flip-first-value',
    'flip-first-non-null-value',
  ]);

  for (const testCase of cases) {
    const proof = testCase.discriminationProof;
    if (exemptedIds.has(testCase.id) && !proof) continue;
    const result = resultsById.get(testCase.id);
    if (!result) {
      failures.push(`${testCase.id}: missing result for discrimination-proof validation`);
      continue;
    }
    if (!proof) {
      failures.push(`${testCase.id}: new value vector must include discriminationProof metadata`);
      continue;
    }
    if (proof.assertedLength !== 'bar-count') {
      failures.push(`${testCase.id}: discriminationProof.assertedLength must be "bar-count"`);
    }
    const expectedOutputs = result.expectedOutputs ?? [result.expected];
    if (expectedOutputs.length === 0 || expectedOutputs.some((series) => series.length !== result.bars)) {
      failures.push(`${testCase.id}: expected outputs must assert one value per bar`);
    }
    const mutations = proof.mutations ?? [];
    const invalidMutations = mutations.filter((mutation) => !allowedMutations.has(mutation));
    if (mutations.length === 0) {
      failures.push(`${testCase.id}: discriminationProof.mutations must name at least one red-flipping mutation`);
    }
    if (invalidMutations.length > 0) {
      failures.push(`${testCase.id}: unknown discriminationProof mutation(s): ${invalidMutations.join(', ')}`);
    }
    const lengthOnlyMutations = mutations.filter((mutation) =>
      allowedMutations.has(mutation) && !valueFlippingMutations.has(mutation));
    if (lengthOnlyMutations.length > 0) {
      failures.push(`${testCase.id}: length-only discrimination mutation(s) are not proof: ${lengthOnlyMutations.join(', ')}`);
    }
    const valueMutations = mutations.filter((mutation) => valueFlippingMutations.has(mutation));
    if (valueMutations.length === 0) {
      failures.push(`${testCase.id}: discriminationProof.mutations must include a value-flipping mutation`);
    } else if (!valueMutations.some((mutation) => mutationFlipsCaseRed(result, mutation))) {
      failures.push(`${testCase.id}: value-flipping discrimination mutations did not flip the case red`);
    }

    const helperNames = helperNamesForExpectation(testCase);
    const helperFormulaCitation = proof.helperFormulaCitation ?? '';
    if (helperNames.length > 0 && (!URL_PATTERN.test(helperFormulaCitation) || !HELPER_FORMULA_KEYWORD_PATTERN.test(helperFormulaCitation))) {
      failures.push(`${testCase.id}: helper-derived vector (${helperNames.join(', ')}) must cite a concrete published formula/reference composition`);
    }
  }

  return failures;
}

function assertSafeValueVectorOutputPath(outputPath: string): void {
  const normalized = outputPath.replaceAll('\\', '/').replace(/^packages\/tealscript\//, '');
  if (PROTECTED_VALUE_VECTOR_REPORT_PATHS.has(normalized)) {
    throw new Error(`Refusing to overwrite protected value-vector baseline/exemption artifact: ${outputPath}`);
  }
  const resolvedOutput = resolve(outputPath);
  for (const protectedPath of PROTECTED_VALUE_VECTOR_REPORT_PATHS) {
    if (resolvedOutput === resolve(protectedPath) || resolvedOutput === resolve('packages/tealscript', protectedPath)) {
      throw new Error(`Refusing to overwrite protected value-vector baseline/exemption artifact: ${outputPath}`);
    }
  }
}

function failedCaseResult(args: {
  testCase: ValueVectorCase;
  bars: Bar[];
  officialMembers: string[];
  expected: VectorValue[];
  expectedOutputs: VectorValue[][];
  expectedPlots?: ExpectedPlotValue[];
  expectedDrawings?: ExpectedDrawingValue[];
  expectedAlerts?: ExpectedAlertValue[];
  expectedLogs?: ExpectedLogValue[];
  diagnostics: string[];
}): ValueVectorResult {
  const { testCase, bars, officialMembers, expected, expectedOutputs, expectedPlots, expectedDrawings, expectedAlerts, expectedLogs, diagnostics } = args;
  const mismatchIndexes = expected.map((_value, index) => index);
  return { id: testCase.id, namespace: testCase.namespace, officialMembers, bars: bars.length, rule: testCase.rule, expected, expectedOutputs, expectedPlots, expectedDrawings, expectedAlerts, expectedLogs, compiled: null, publicPath: null, compiledOutputs: null, publicPathOutputs: null, compiledPlots: null, publicPathPlots: null, compiledDrawings: null, publicPathDrawings: null, compiledAlerts: null, publicPathAlerts: null, compiledLogs: null, publicPathLogs: null, compiledMatches: false, publicPathMatches: false, compiledMismatchBars: mismatchIndexes, publicPathMismatchBars: mismatchIndexes, compiledMismatchDetails: mismatchDetails(null, expectedOutputs), publicPathMismatchDetails: mismatchDetails(null, expectedOutputs), compiledPlotPayloadMismatch: expectedPlots ? { expected: expectedPlots, actual: null } : undefined, publicPathPlotPayloadMismatch: expectedPlots ? { expected: expectedPlots, actual: null } : undefined, compiledDrawingMismatch: expectedDrawings ? { expected: expectedDrawings, actual: null } : undefined, publicPathDrawingMismatch: expectedDrawings ? { expected: expectedDrawings, actual: null } : undefined, compiledAlertMismatch: expectedAlerts ? { expected: expectedAlerts, actual: null } : undefined, publicPathAlertMismatch: expectedAlerts ? { expected: expectedAlerts, actual: null } : undefined, compiledLogMismatch: expectedLogs ? { expected: expectedLogs, actual: null } : undefined, publicPathLogMismatch: expectedLogs ? { expected: expectedLogs, actual: null } : undefined, diagnostics };
}

export function runCase(testCase: ValueVectorCase, overrides?: { bars?: Bar[]; options?: TealscriptExecutionOptions }): ValueVectorResult {
  const bars = overrides?.bars ?? testCase.bars ?? BARS;
  const officialMembers = officialMembersForValueVectorCase(testCase);
  const expected = normalize(testCase.expected(bars));
  const expectedOutputs = testCase.expectedOutputs?.(bars) ?? [expected];
  const expectedPlots = testCase.expectedPlots?.(bars);
  const expectedDrawings = testCase.expectedDrawings?.(bars);
  const expectedAlerts = testCase.expectedAlerts?.(bars);
  const expectedLogs = testCase.expectedLogs?.(bars);
  let ast: Program;
  try {
    ast = parse(testCase.pine);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return failedCaseResult({ testCase, bars, officialMembers, expected, expectedOutputs, expectedPlots, expectedDrawings, expectedAlerts, expectedLogs, diagnostics: [`parse: ${message}`] });
  }
  const diagnostics = diagnosticForSemantic(ast);
  if (diagnostics.length > 0) {
    const result = failedCaseResult({ testCase, bars, officialMembers, expected, expectedOutputs, expectedPlots, expectedDrawings, expectedAlerts, expectedLogs, diagnostics });
    if (diagnosticsMatch(diagnostics, testCase.expectedDiagnostics)) {
      return { ...result, compiledMatches: true, publicPathMatches: true, compiledMismatchBars: [], publicPathMismatchBars: [], compiledMismatchDetails: [], publicPathMismatchDetails: [] };
    }
    return result;
  }

  const compiled = tryCompile(ast);
  if (!compiled.success) {
    diagnostics.push(...compiled.unsupported);
    const result = failedCaseResult({ testCase, bars, officialMembers, expected, expectedOutputs, expectedPlots, expectedDrawings, expectedAlerts, expectedLogs, diagnostics });
    if (diagnosticsMatch(diagnostics, testCase.expectedDiagnostics)) {
      return { ...result, compiledMatches: true, publicPathMatches: true, compiledMismatchBars: [], publicPathMismatchBars: [], compiledMismatchDetails: [], publicPathMismatchDetails: [] };
    }
    return result;
  }

  const options = overrides?.options ?? testCase.options?.();
  const compiledResult = executeCompiled(compiled, bars, undefined, options);
  const publicResult = executeScript(ast, bars, undefined, options);
  const compiledRuntimeDiagnostics = compiledResult?.errors.map((error) => error.message) ?? ['compiled execution returned no result'];
  const publicRuntimeDiagnostics = publicResult.errors.map((error) => error.message);
  if (testCase.expectedDiagnostics) {
    const combinedDiagnostics = [
      ...compiledRuntimeDiagnostics.map((message) => `compiled: ${message}`),
      ...publicRuntimeDiagnostics.map((message) => `public: ${message}`),
    ];
    const compiledDiagnosticMatches = diagnosticsMatch(compiledRuntimeDiagnostics, testCase.expectedDiagnostics);
    const publicDiagnosticMatches = diagnosticsMatch(publicRuntimeDiagnostics, testCase.expectedDiagnostics);
    const result = failedCaseResult({ testCase, bars, officialMembers, expected, expectedOutputs, expectedPlots, expectedDrawings, expectedAlerts, expectedLogs, diagnostics: combinedDiagnostics });
    return {
      ...result,
      compiledMatches: compiledDiagnosticMatches,
      publicPathMatches: publicDiagnosticMatches,
      compiledMismatchBars: compiledDiagnosticMatches ? [] : result.compiledMismatchBars,
      publicPathMismatchBars: publicDiagnosticMatches ? [] : result.publicPathMismatchBars,
      compiledMismatchDetails: compiledDiagnosticMatches ? [] : result.compiledMismatchDetails,
      publicPathMismatchDetails: publicDiagnosticMatches ? [] : result.publicPathMismatchDetails,
    };
  }
  const compiledOutputs = compiledResult?.plots.map((plot) => normalize(plot.values)) ?? null;
  const publicPathOutputs = publicResult.plots.map((plot) => normalize(plot.values));
  const compiledPlots = compiledResult ? normalizePlots(compiledResult.plots) : null;
  const publicPathPlots = normalizePlots(publicResult.plots);
  const compiledDrawings = compiledResult ? normalizeDrawings(compiledResult.drawings) : null;
  const publicPathDrawings = normalizeDrawings(publicResult.drawings);
  const compiledAlerts = compiledResult ? normalizeAlerts(compiledResult.alerts) : null;
  const publicPathAlerts = normalizeAlerts(publicResult.alerts);
  const compiledLogs = compiledResult ? normalizeLogs(compiledResult.logs) : null;
  const publicPathLogs = normalizeLogs(publicResult.logs);
  const compiledPlotMatches = matchesOutputs(compiledOutputs, expectedOutputs);
  const publicPathPlotMatches = matchesOutputs(publicPathOutputs, expectedOutputs);
  const compiledPlotPayloadMatches = matchesPlots(compiledPlots, expectedPlots);
  const publicPathPlotPayloadMatches = matchesPlots(publicPathPlots, expectedPlots);
  const compiledDrawingMatches = matchesDrawings(compiledDrawings, expectedDrawings);
  const publicPathDrawingMatches = matchesDrawings(publicPathDrawings, expectedDrawings);
  const compiledAlertMatches = matchesAlerts(compiledAlerts, expectedAlerts);
  const publicPathAlertMatches = matchesAlerts(publicPathAlerts, expectedAlerts);
  const compiledLogMatches = matchesLogs(compiledLogs, expectedLogs);
  const publicPathLogMatches = matchesLogs(publicPathLogs, expectedLogs);
  const compiledValues = compiledOutputs?.[0] ?? null;
  const publicValues = publicPathOutputs[0] ?? null;
  return {
    id: testCase.id,
    namespace: testCase.namespace,
    officialMembers,
    bars: bars.length,
    rule: testCase.rule,
    expected,
    expectedOutputs,
    expectedPlots,
    expectedDrawings,
    expectedAlerts,
    expectedLogs,
    compiled: compiledValues,
    publicPath: publicValues,
    compiledOutputs,
    publicPathOutputs,
    compiledPlots,
    publicPathPlots,
    compiledDrawings,
    publicPathDrawings,
    compiledAlerts,
    publicPathAlerts,
    compiledLogs,
    publicPathLogs,
    compiledMatches: compiledPlotMatches && compiledPlotPayloadMatches && compiledDrawingMatches && compiledAlertMatches && compiledLogMatches,
    publicPathMatches: publicPathPlotMatches && publicPathPlotPayloadMatches && publicPathDrawingMatches && publicPathAlertMatches && publicPathLogMatches,
    compiledMismatchBars: mismatchBars(compiledOutputs, expectedOutputs),
    publicPathMismatchBars: mismatchBars(publicPathOutputs, expectedOutputs),
    compiledMismatchDetails: mismatchDetails(compiledOutputs, expectedOutputs),
    publicPathMismatchDetails: mismatchDetails(publicPathOutputs, expectedOutputs),
    compiledPlotPayloadMismatch: compiledPlotPayloadMatches ? undefined : { expected: expectedPlots ?? [], actual: compiledPlots },
    publicPathPlotPayloadMismatch: publicPathPlotPayloadMatches ? undefined : { expected: expectedPlots ?? [], actual: publicPathPlots },
    compiledDrawingMismatch: compiledDrawingMatches ? undefined : { expected: expectedDrawings ?? [], actual: compiledDrawings },
    publicPathDrawingMismatch: publicPathDrawingMatches ? undefined : { expected: expectedDrawings ?? [], actual: publicPathDrawings },
    compiledAlertMismatch: compiledAlertMatches ? undefined : { expected: expectedAlerts ?? [], actual: compiledAlerts },
    publicPathAlertMismatch: publicPathAlertMatches ? undefined : { expected: expectedAlerts ?? [], actual: publicPathAlerts },
    compiledLogMismatch: compiledLogMatches ? undefined : { expected: expectedLogs ?? [], actual: compiledLogs },
    publicPathLogMismatch: publicPathLogMatches ? undefined : { expected: expectedLogs ?? [], actual: publicPathLogs },
    diagnostics,
  };
}

export function runValueVectors(): ValueVectorResult[] {
  return CASES.map((testCase) => runCase(testCase));
}

export function validateExpectedValueVectorFailureMetadata(
  expectedFailures: Record<string, Partial<ExpectedValueVectorFailure>>,
): string[] {
  const allowedOwnerLanes = new Set<ExpectedValueVectorFailureOwner>([
    'parser',
    'semantic',
    'semantic/codegen',
    'runtime/strategy',
  ]);
  const allowedReasons = new Set<ExpectedValueVectorFailureReason>([
    'trace-required',
    'other-lane',
    'open-defect',
  ]);
  const failures: string[] = [];

  for (const [id, metadata] of Object.entries(expectedFailures)) {
    if (!metadata.ownerLane || !allowedOwnerLanes.has(metadata.ownerLane)) {
      failures.push(`${id}: ownerLane must be one of ${Array.from(allowedOwnerLanes).join(', ')}`);
    }
    if (!metadata.reason || !allowedReasons.has(metadata.reason)) {
      failures.push(`${id}: reason must be one of ${Array.from(allowedReasons).join(', ')}`);
    }
    if (metadata.reason === 'open-defect' && !metadata.openDefect?.trim()) {
      failures.push(`${id}: openDefect is required when reason is open-defect`);
    }
    if (!metadata.cause?.trim()) {
      failures.push(`${id}: cause is required`);
    }
    if (!metadata.citation?.trim()) {
      failures.push(`${id}: citation is required`);
    }
  }

  return failures;
}

export function validateValueVectorGate(results = runValueVectors()): ValueVectorGateResult {
  const seen = new Set<string>();
  const duplicateCaseIds: string[] = [];
  for (const result of results) {
    if (seen.has(result.id)) duplicateCaseIds.push(result.id);
    seen.add(result.id);
  }

  const missingExpectedFailures = Object.keys(EXPECTED_VALUE_VECTOR_FAILURES)
    .filter((id) => !seen.has(id));
  const invalidExpectedFailureMetadata = validateExpectedValueVectorFailureMetadata(
    EXPECTED_VALUE_VECTOR_FAILURES,
  );
  const expectedFailureIds = new Set(Object.keys(EXPECTED_VALUE_VECTOR_FAILURES));
  const missingSourceCitations = CASES
    .filter((testCase) => !SOURCE_CITATION_PATTERN.test(testCase.rule ?? ''))
    .map((testCase) => testCase.id);
  const incompleteSourceCitations = CASES
    .filter((testCase) => requiredCompletenessCitations(testCase)
      .some((citation) => !testCase.rule?.includes(citation)))
    .map((testCase) => testCase.id);
  const invalidDiscriminationProofs = validateValueVectorDiscriminationProofs(CASES, results);
  const unexpectedFailures = results
    .filter((result) => !result.compiledMatches || !result.publicPathMatches)
    .filter((result) => !expectedFailureIds.has(result.id));
  const unexpectedPasses = results
    .filter((result) => result.compiledMatches && result.publicPathMatches)
    .filter((result) => expectedFailureIds.has(result.id));

  return {
    results,
    expectedFailures: EXPECTED_VALUE_VECTOR_FAILURES,
    unexpectedFailures,
    unexpectedPasses,
    missingExpectedFailures,
    invalidExpectedFailureMetadata,
    duplicateCaseIds,
    missingSourceCitations,
    incompleteSourceCitations,
    invalidDiscriminationProofs,
  };
}

export function formatValueVectorGateFailure(gate: ValueVectorGateResult): string {
  const lines: string[] = [];
  if (gate.duplicateCaseIds.length > 0) {
    lines.push(`Duplicate value-vector case ids: ${gate.duplicateCaseIds.join(', ')}`);
  }
  if (gate.missingExpectedFailures.length > 0) {
    lines.push(`Expected-failure ids missing from CASES: ${gate.missingExpectedFailures.join(', ')}`);
  }
  if (gate.invalidExpectedFailureMetadata.length > 0) {
    lines.push(`Expected-failure metadata incomplete: ${gate.invalidExpectedFailureMetadata.join('; ')}`);
  }
  if (gate.missingSourceCitations.length > 0) {
    lines.push(`Value-vector cases missing source citations: ${gate.missingSourceCitations.join(', ')}`);
  }
  if (gate.incompleteSourceCitations.length > 0) {
    lines.push(`Value-vector cases missing citation completeness sources: ${gate.incompleteSourceCitations.join(', ')}`);
  }
  if (gate.invalidDiscriminationProofs.length > 0) {
    lines.push(`Value-vector discrimination proof failures: ${gate.invalidDiscriminationProofs.join('; ')}`);
  }
  if (gate.unexpectedFailures.length > 0) {
    lines.push(`Unexpected value-vector failures: ${gate.unexpectedFailures.map((result) => result.id).join(', ')}`);
  }
  if (gate.unexpectedPasses.length > 0) {
    lines.push(`Expected value-vector failures now passing; remove from EXPECTED_VALUE_VECTOR_FAILURES after adjudication: ${gate.unexpectedPasses.map((result) => result.id).join(', ')}`);
  }
  return lines.join('\n');
}

async function main(): Promise<void> {
  const results = CASES.map((testCase) => runCase(testCase));
  const gate = validateValueVectorGate(results);
  const report = {
    schemaVersion: 1,
    oracle: 'independent documented formulas over fixed synthetic OHLCV bars',
    bars: BARS,
    tolerance: 1e-9,
    cases: results,
    summary: {
      cases: results.length,
      compiledMatches: results.filter((result) => result.compiledMatches).length,
      publicPathMatches: results.filter((result) => result.publicPathMatches).length,
      failedCases: results.filter((result) => !result.compiledMatches || !result.publicPathMatches).map((result) => result.id),
      expectedFailures: Object.keys(EXPECTED_VALUE_VECTOR_FAILURES),
      unexpectedFailures: gate.unexpectedFailures.map((result) => result.id),
      unexpectedPasses: gate.unexpectedPasses.map((result) => result.id),
      invalidExpectedFailureMetadata: gate.invalidExpectedFailureMetadata,
      missingSourceCitations: gate.missingSourceCitations,
      incompleteSourceCitations: gate.incompleteSourceCitations,
      invalidDiscriminationProofs: gate.invalidDiscriminationProofs,
    },
  };
  const outputPath = process.argv[2] ?? 'reports/pine-value-vectors.report.json';
  assertSafeValueVectorOutputPath(outputPath);
  await writeFile(outputPath, `${JSON.stringify(report)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(report.summary, null, 2)}\n`);
  const gateFailure = formatValueVectorGateFailure(gate);
  if (gateFailure) {
    process.stderr.write(`${gateFailure}\n`);
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
