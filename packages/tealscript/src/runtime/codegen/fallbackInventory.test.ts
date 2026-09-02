import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { PINE_V6_REFERENCE_BUILTINS } from '../../compat/pineV6BuiltinReference';
import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { tryCompile } from './execute';
import { COMPILED_FALLBACK_INVENTORY, RANKED_PLAUSIBLE_COMPILED_FALLBACKS } from './fallbackInventory';

const codegenDir = resolve(__dirname);
const packageSrcDir = resolve(codegenDir, '..', '..');

function sourceFor(fileName: string): string {
  if (fileName === 'sourceClassifier.ts') {
    return readFileSync(resolve(packageSrcDir, 'compat', fileName), 'utf8');
  }
  return readFileSync(resolve(codegenDir, fileName), 'utf8');
}

function stringSetBody(source: string, declaration: string): string {
  const start = source.indexOf(`const ${declaration}`);
  if (start < 0) throw new Error(`Missing ${declaration}`);
  const bodyStart = source.indexOf('[', start);
  const bodyEnd = source.indexOf(']);', bodyStart);
  if (bodyStart < 0 || bodyEnd < 0) throw new Error(`Missing ${declaration} body`);
  return source.slice(bodyStart + 1, bodyEnd);
}

function objectBody(source: string, declaration: string): string {
  const start = source.indexOf(`const ${declaration}`);
  if (start < 0) throw new Error(`Missing ${declaration}`);
  const bodyStart = source.indexOf('{', start);
  const bodyEnd = source.indexOf('};', bodyStart);
  if (bodyStart < 0 || bodyEnd < 0) throw new Error(`Missing ${declaration} body`);
  return source.slice(bodyStart + 1, bodyEnd);
}

function quotedNames(source: string): string[] {
  return [...source.matchAll(/'([^']+)'/g)].map((match) => match[1]!);
}

describe('compiled fallback inventory', () => {
  it('tracks every explicit unsupported-message path in the codegen analyzer', () => {
    const analyzer = sourceFor('analyzer.ts');
    const unsupportedMessageSiteCount = [...analyzer.matchAll(/not yet supported by transpiler/g)].length;
    const inventoryAnalyzerMessageSites = COMPILED_FALLBACK_INVENTORY
      .filter((entry) => entry.sourceFile === 'analyzer.ts' && entry.sourceEvidence.includes('not yet supported by transpiler'))
      .length;

    expect(inventoryAnalyzerMessageSites).toBe(unsupportedMessageSiteCount);
    for (const entry of COMPILED_FALLBACK_INVENTORY) {
      expect(sourceFor(entry.sourceFile)).toContain(entry.sourceEvidence);
    }
  });

  it('keeps plausible Pine v6 fallback entries ranked and actionable', () => {
    expect(RANKED_PLAUSIBLE_COMPILED_FALLBACKS.map((entry) => entry.id)).toEqual([]);

    for (const entry of RANKED_PLAUSIBLE_COMPILED_FALLBACKS) {
      expect(entry.validPineV6).toBe(true);
      expect(entry.plausiblePublicIndicator).toBe(true);
      expect(entry.rank).toBeTypeOf('number');
      expect(entry.action).not.toContain('TBD');
    }
  });

  it('keeps unsupported ta.* fallback inventory at zero against the v6 reference list', () => {
    const analyzer = sourceFor('analyzer.ts');
    const taClassNames = quotedNames(objectBody(analyzer, 'TA_CLASS_MAP')).filter((name) => name.startsWith('ta.'));
    const taVarNames = quotedNames(objectBody(analyzer, 'TA_VAR_CLASS_MAP')).filter((name) => name.startsWith('ta.'));
    const directTaNames = quotedNames(stringSetBody(analyzer, 'DIRECT_TA_FUNCS')).filter((name) => name.startsWith('ta.'));
    const compiledNames = new Set([...taClassNames, ...taVarNames, ...directTaNames]);
    const missing = PINE_V6_REFERENCE_BUILTINS.ta.filter((name) => !compiledNames.has(name));

    expect(missing).toEqual([]);
  });

  it('keeps unsupported request-family compiler fallbacks at zero', () => {
    const analyzer = sourceFor('analyzer.ts');
    const unsupportedRequests = quotedNames(stringSetBody(analyzer, 'UNSUPPORTED_REQUEST_FUNCS'));

    expect(unsupportedRequests).toEqual([]);
  });

  it('keeps dynamic ta.* constructor fallback unreachable for valid v6-style calls', () => {
    const pine = `//@version=6
indicator("dynamic ta constructor fallback inventory")
length = input.int(4, "Length")
fast = input.int(3, "Fast")
slow = input.int(6, "Slow")
signal = input.int(2, "Signal")
left = input.int(2, "Left")
right = input.int(2, "Right")
percent = input.float(75, "Percent")
offset = input.int(1, "Offset")
mult = input.float(1.5, "Mult")
almaOffset = input.float(0.85, "ALMA Offset")
sigma = input.float(6, "Sigma")
biased = input.bool(false, "Biased")
handleNa = input.bool(true, "Handle NA")
condition = close > open
anchor = bar_index == 0 or bar_index == 6
plot(ta.sma(close, length), "SMA")
plot(ta.ema(close, length), "EMA")
plot(ta.rma(close, length), "RMA")
plot(ta.rsi(close, length), "RSI")
plot(ta.highest(close, length), "Highest")
plot(ta.lowest(low, length), "Lowest")
plot(ta.highestbars(high, length), "Highest Bars")
plot(ta.lowestbars(low, length), "Lowest Bars")
plot(ta.pivothigh(high, left, right), "Pivot High")
plot(ta.pivotlow(low, left, right), "Pivot Low")
plot(ta.range(close, length), "Range")
plot(ta.rising(close, length), "Rising")
plot(ta.falling(close, length), "Falling")
plot(ta.variance(close, length, biased), "Variance")
plot(ta.dev(close, length), "Dev")
plot(ta.covariance(close, open, length), "Covariance")
plot(ta.correlation(close, open, length), "Correlation")
plot(ta.cog(close, length), "COG")
plot(ta.median(close, length), "Median")
plot(ta.mode(close, length), "Mode")
plot(ta.percentile_nearest_rank(close, length, percent), "Percentile Nearest")
plot(ta.percentile_linear_interpolation(close, length, percent), "Percentile Linear")
plot(ta.percentrank(close, length), "Percent Rank")
plot(ta.linreg(close, length, offset), "LinReg")
[macdLine, signalLine, histLine] = ta.macd(close, fast, slow, signal)
plot(macdLine, "MACD")
plot(signalLine, "MACD Signal")
plot(histLine, "MACD Hist")
plot(ta.atr(length), "ATR")
plot(ta.tr(handleNa), "TR")
plot(ta.stoch(close, high, low, length), "Stoch")
plot(ta.wma(close, length), "WMA")
plot(ta.vwma(close, length), "VWMA")
plot(ta.swma(close), "SWMA")
plot(ta.alma(close, length, almaOffset, sigma), "ALMA")
plot(ta.hma(close, length), "HMA")
plot(ta.mom(close, length), "Momentum")
plot(ta.roc(close, length), "ROC")
plot(ta.cci(close, length), "CCI")
plot(ta.cmo(close, length), "CMO")
plot(ta.mfi(hlc3, length), "MFI")
plot(ta.tsi(close, fast, slow), "TSI")
plot(ta.rci(close, length), "RCI")
plot(ta.wpr(length), "WPR")
plot(ta.obv, "OBV")
[basis, upper, lower] = ta.bb(close, length, mult)
plot(basis, "BB Basis")
plot(upper, "BB Upper")
plot(lower, "BB Lower")
plot(ta.bbw(close, length, mult), "BBW")
[kcBasis, kcUpper, kcLower] = ta.kc(close, length, mult)
plot(kcBasis, "KC Basis")
plot(kcUpper, "KC Upper")
plot(kcLower, "KC Lower")
plot(ta.kcw(close, length, mult), "KCW")
[diPlus, diMinus, adxValue] = ta.dmi(length, fast)
plot(diPlus, "DI Plus")
plot(diMinus, "DI Minus")
plot(adxValue, "DMI ADX")
plot(ta.adx(length, fast), "ADX")
[trend, direction] = ta.supertrend(mult, length)
plot(trend, "Supertrend")
plot(direction, "Supertrend Direction")
plot(ta.sar(0.02, 0.02, 0.2), "SAR")
[kst, kstSignal] = ta.kst(close, fast, slow, length, slow + length, fast, fast, signal, signal + 1, signal)
plot(kst, "KST")
plot(kstSignal, "KST Signal")
[vwapBasis, vwapUpper, vwapLower] = ta.vwap(close, anchor, mult)
plot(vwapBasis, "VWAP Basis")
plot(vwapUpper, "VWAP Upper")
plot(vwapLower, "VWAP Lower")
plot(ta.dema(close, length), "DEMA")
plot(ta.tema(close, length), "TEMA")
plot(ta.cum(close), "Cumulative")
plot(ta.stdev(close, length), "StdDev")
plot(ta.valuewhen(condition, close, signal), "Value When")
plot(ta.change(close, length), "Change")`;
    const compiled = tryCompile(parse(pine));

    expect(compiled.success).toBe(true);
  });

  it('reports unregistered imported functions as semantic diagnostics before compile fallback', () => {
    const library = parse(`
library("HiddenTools", true)
export visible(float value) => value
hidden(float value) => value
`);
    const result = checkProgram(parse(`
indicator("Imported Function Diagnostics")
import TestUser/HiddenTools/1 as tools
missingFunction = tools.missing(close)
privateFunction = tools.hidden(close)
plot(missingFunction + privateFunction)
`), {
      libraries: new Map([['TestUser/HiddenTools/1', library]]),
    });

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Unknown library function: tools.missing',
      'Unknown library function: tools.hidden',
    ]);
  });

  it('reports unregistered imported members as semantic diagnostics before compile fallback', () => {
    const library = parse(`
library("HiddenValues", true)
export float VALUE = 1
float hidden = 2
`);
    const result = checkProgram(parse(`
indicator("Imported Member Diagnostics")
import TestUser/HiddenValues/1 as helper
missingValue = helper.missing
plot(missingValue)
`), {
      libraries: new Map([['TestUser/HiddenValues/1', library]]),
    });

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Unknown library member: helper.missing',
    ]);
  });

  it('reports missing host library registry entries before compile fallback', () => {
    const result = checkProgram(parse(`
indicator("Missing Host Library")
import Missing/Library/1 as helper
plot(close)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Import 'Missing/Library/1' as alias 'helper' was not supplied by the host library registry; provide Pine library source for Missing/Library version 1, or remove/change the import",
    ]);
  });
});
