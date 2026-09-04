import type { Program } from './parser/ast';
import { parse } from './parser/parser';

export type OfficialTradingViewReturnKind = 'float' | 'bool' | 'tuple';

export interface OfficialTradingViewLibraryFunction {
  name: string;
  runtimeName?: string;
  params: string[];
  minArgs: number;
  maxArgs: number;
  returnKind: OfficialTradingViewReturnKind;
  tupleArity?: number;
  docsUrl: string;
}

export interface OfficialTradingViewLibrary {
  owner: 'TradingView';
  library: 'ta' | 'ZigZag';
  version: '7' | '8' | '9' | '10';
  functions: Map<string, OfficialTradingViewLibraryFunction>;
  program?: Program;
}

export interface ParsedTradingViewImportPath {
  owner: string;
  library: string;
  version: string;
}

const TRADINGVIEW_TA_DOCS_URL = 'https://www.tradingview.com/script/BICzyhq0-ta/';
const TRADINGVIEW_ZIGZAG_DOCS_URL = 'https://www.tradingview.com/script/bzIRuGXC-ZigZag/';

const TRADINGVIEW_ZIGZAG_V8_SOURCE = `//@version=6
library("ZigZag")

export type Settings
    float devThreshold = 5.0
    int depth = 10
    color lineColor = color.blue
    bool extendLast = false
    bool displayReversalPrice = false
    bool displayCumulativeVolume = false
    bool displayReversalPriceChange = false
    string differencePriceMode = "Absolute"
    bool draw = true
    bool allowZigZagOnOneBar = false

export type Pivot
    line ln = na
    label lb = na
    bool isHigh = false
    float vol = 0.0
    chart.point start = chart.point.now(close)
    chart.point end = chart.point.now(close)

export type ZigZag
    Settings settings = Settings.new()
    array<Pivot> pivots = array.new<Pivot>()
    float sumVol = 0.0
    Pivot extend = na

export newInstance(Settings settings = Settings.new()) =>
    ZigZag.new(settings, array.new<Pivot>(), 0.0, na)

export lastPivot(ZigZag this) =>
    array.size(this.pivots) > 0 ? array.get(this.pivots, array.size(this.pivots) - 1) : na

export update(ZigZag this) =>
    false
`;

const TRADINGVIEW_ZIGZAG_V8_PROGRAM = parse(TRADINGVIEW_ZIGZAG_V8_SOURCE, {
  grammarSource: TRADINGVIEW_ZIGZAG_DOCS_URL,
});

const taFunction = (
  name: string,
  params: string[],
  minArgs: number,
  maxArgs: number,
  returnKind: OfficialTradingViewReturnKind = 'float',
  runtimeName?: string,
  tupleArity?: number,
): OfficialTradingViewLibraryFunction => ({
  name,
  runtimeName,
  params,
  minArgs,
  maxArgs,
  returnKind,
  tupleArity,
  docsUrl: TRADINGVIEW_TA_DOCS_URL,
});

const TRADINGVIEW_TA_V7_FUNCTIONS: OfficialTradingViewLibraryFunction[] = [
  taFunction('ao', [], 0, 0),
  taFunction('aroon', ['length'], 1, 1, 'tuple', undefined, 2),
  taFunction('atr2', ['length'], 1, 1),
  taFunction('cagr', ['entryTime', 'entryPrice', 'exitTime', 'exitPrice'], 4, 4),
  taFunction('changePercent', ['newValue', 'oldValue'], 2, 2, 'float', 'TradingView.ta.changePercent'),
  taFunction('coppock', ['source', 'longLength', 'shortLength', 'smoothLength'], 4, 4),
  taFunction('dema', ['source', 'length'], 2, 2, 'float', 'ta.dema'),
  taFunction('dema2', ['src', 'length'], 2, 2),
  taFunction('dm', ['length'], 1, 1),
  taFunction('donchian', ['length'], 1, 1, 'tuple', undefined, 3),
  taFunction('ema2', ['src', 'length'], 2, 2),
  taFunction('eom', ['length', 'div'], 1, 2),
  taFunction('frama', ['source', 'length'], 2, 2),
  taFunction('ft', ['source', 'length'], 2, 2),
  taFunction('highestSince', ['cond', 'source'], 1, 2),
  taFunction('ht', ['source'], 1, 1),
  taFunction('ichimoku', ['conLength', 'baseLength', 'senkouLength'], 3, 3, 'tuple', undefined, 5),
  taFunction('ift', ['source'], 1, 1),
  taFunction('kvo', ['fastLen', 'slowLen', 'trigLen'], 3, 3, 'tuple', undefined, 2),
  taFunction('lowestSince', ['cond', 'source'], 1, 2),
  taFunction('pzo', ['length'], 1, 1),
  taFunction('relativeVolume', ['length', 'anchorTimeframe', 'isCumulative', 'adjustRealtime'], 1, 4, 'tuple', undefined, 3),
  taFunction('rma2', ['source', 'length'], 2, 2),
  taFunction('rms', ['source', 'length'], 2, 2),
  taFunction('rwi', ['length'], 1, 1, 'tuple', undefined, 2),
  taFunction('stc', ['source', 'fast', 'slow', 'cycle', 'd1', 'd2'], 6, 6),
  taFunction('stochFull', ['periodK', 'smoothK', 'periodD'], 3, 3, 'tuple', undefined, 2),
  taFunction('stochRsi', ['lengthRsi', 'periodK', 'smoothK', 'periodD', 'source'], 4, 5, 'tuple', undefined, 2),
  taFunction('supertrend', ['factor', 'atrLength', 'wicks'], 2, 3, 'tuple', 'ta.supertrend', 2),
  taFunction('supertrend2', ['factor', 'atrLength', 'wicks'], 2, 3, 'tuple', undefined, 2),
  taFunction('szo', ['source', 'length'], 2, 2),
  taFunction('t3', ['source', 'length', 'vf'], 3, 3),
  taFunction('t3Alt', ['source', 'length', 'vf'], 3, 3),
  taFunction('tema', ['source', 'length'], 2, 2, 'float', 'ta.tema'),
  taFunction('tema2', ['source', 'length'], 2, 2),
  taFunction('trima', ['source', 'length'], 2, 2),
  taFunction('trix', ['source', 'length', 'signalLength', 'exponential'], 3, 4, 'tuple', undefined, 3),
  taFunction('uo', ['fastLen', 'midLen', 'slowLen'], 3, 3),
  taFunction('vhf', ['source', 'length'], 2, 2),
  taFunction('vi', ['length'], 1, 1, 'tuple', undefined, 2),
  taFunction('vStop', ['source', 'atrLength', 'atrFactor'], 3, 3, 'tuple', undefined, 2),
  taFunction('vStop2', ['source', 'atrLength', 'atrFactor'], 3, 3, 'tuple', undefined, 2),
  taFunction('vzo', ['length'], 1, 1),
  taFunction('williamsFractal', ['period'], 1, 1, 'tuple', undefined, 2),
  taFunction('wpo', ['length'], 1, 1),
];

const TRADINGVIEW_TA_V8_ADDITIONS: OfficialTradingViewLibraryFunction[] = [
  taFunction('requestUpAndDownVolume', ['lowerTimeframe'], 1, 1, 'tuple', undefined, 3),
  taFunction('requestVolumeDelta', ['lowerTimeframe', 'cumulativePeriod'], 1, 2, 'tuple', undefined, 4),
];

const TRADINGVIEW_TA_SUPPORTED_VERSIONS = new Set(['7', '9', '10']);

function tradingViewTaFunctions(version: '7' | '9' | '10'): Map<string, OfficialTradingViewLibraryFunction> {
  const functions = version === '7'
    ? TRADINGVIEW_TA_V7_FUNCTIONS
    : [...TRADINGVIEW_TA_V7_FUNCTIONS, ...TRADINGVIEW_TA_V8_ADDITIONS];
  return new Map(functions.map((fn) => [fn.name, fn]));
}

export function parseTradingViewImportPath(path: string): ParsedTradingViewImportPath | undefined {
  const parts = path.split('/').filter(Boolean);
  if (parts.length < 3) return undefined;
  const version = parts.at(-1);
  const library = parts.at(-2);
  if (!version || !library) return undefined;
  return {
    owner: parts.slice(0, -2).join('/'),
    library,
    version,
  };
}

export function getOfficialTradingViewLibrary(path: string): OfficialTradingViewLibrary | undefined {
  const parsed = parseTradingViewImportPath(path);
  if (!parsed || parsed.owner !== 'TradingView') return undefined;
  if (parsed.library === 'ta') {
    if (!TRADINGVIEW_TA_SUPPORTED_VERSIONS.has(parsed.version)) return undefined;
    const version = parsed.version as '7' | '9' | '10';
    return {
      owner: 'TradingView',
      library: 'ta',
      version,
      functions: tradingViewTaFunctions(version),
    };
  }
  if (parsed.library === 'ZigZag' && parsed.version === '8') {
    return {
      owner: 'TradingView',
      library: 'ZigZag',
      version: '8',
      functions: new Map(),
      program: TRADINGVIEW_ZIGZAG_V8_PROGRAM,
    };
  }
  return undefined;
}

export function unsupportedOfficialTradingViewFunctionMessage(path: string, functionName: string): string {
  return `Official TradingView library function '${path}.${functionName}' is documented but not implemented by TealScript yet`;
}

export function unsupportedTradingViewLibraryImportMessage(path: string, alias: string): string | undefined {
  const parsed = parseTradingViewImportPath(path);
  if (!parsed || parsed.owner === 'TradingView') return undefined;
  return `Import '${path}' as alias '${alias}' is unsupported by design: TradingView library source is not network-resolvable or host-fetchable outside TradingView's closed Pine runtime; implement Tealstreet libraries through Tealstreet's own linker instead`;
}
