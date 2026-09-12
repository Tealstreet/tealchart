import { describe, expect, it } from 'vitest';
import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';
import { compile, ARRAY_HELPERS, MAP_HELPERS, UDT_HELPERS, MATRIX_HELPERS } from './compile';
import type { Bar } from '../context';
import type { PineArray } from '../arrays';
import { NumericSeries, ValueSeries } from './runtime';
import * as ta from './ta-classes';

function makeBars(closes: number[]): Bar[] {
  return closes.map((close, i) => ({
    time: (i + 1) * 60000,
    open: close - 0.5,
    high: close + 1,
    low: close - 1,
    close,
    volume: 100 + i,
  }));
}

function getCompiledWrapperPlots(pine: string, bars: Bar[]): Map<number, (number | null)[]> {
  const ast = parse(pine);
  const result = executeScript(ast, bars);
  const plots = new Map<number, (number | null)[]>();
  for (let i = 0; i < result.plots.length; i++) {
    plots.set(i, result.plots[i].values);
  }
  return plots;
}

function approxArrayEqual(a: (number | null)[], b: (number | null)[], tol = 1e-10): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const va = a[i], vb = b[i];
    if (va === null && vb === null) continue;
    if (va === null || vb === null) return false;
    if (Math.abs(va - vb) > tol) return false;
  }
  return true;
}

// Simpler test runner that doesn't use require()
function runCompiledSimple(pine: string, bars: Bar[]): Map<number, (number | null)[]> {
  const ast = parse(pine);
  const compiled = compile(ast);
  if (!compiled.success) {
    throw new Error(`Compilation failed: ${compiled.unsupported.join(', ')}`);
  }

  const deps = { NumericSeries, ValueSeries, maxBarsBack: 500, _arr: ARRAY_HELPERS, _map: MAP_HELPERS, _udt: UDT_HELPERS, _mtx: MATRIX_HELPERS, ...ta };
  const inst = new compiled.ScriptClass(deps);
  const plots = new Map<number, (number | null)[]>();

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const ctx = {
      bar: { open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume, time: bar.time },
      barIndex: i,
      lastBarIndex: bars.length - 1,
      isFirstTick: true,
      barstate: {
        isfirst: i === 0, islast: i === bars.length - 1,
        ishistory: true, isrealtime: false, isnew: true, isconfirmed: true,
        islastconfirmedhistory: i === bars.length - 1,
      },
      syminfo: { ticker: 'TEST', mintick: 0.01, pricescale: 100 },
      timeframe: { period: '1', multiplier: 1, isintraday: true, isdaily: false, isweekly: false, ismonthly: false },
      chart: { bgColor: '#FFFFFF', fgColor: '#363A45', type: 'standard' },
      plot(index: number, _funcName: string, _funcCallIndex: number, value: unknown) {
        if (!plots.has(index)) plots.set(index, []);
        const v = typeof value === 'number' ? (value !== value ? null : value) : null;
        plots.get(index)!.push(v);
      },
      input(_id: string, _funcName: string, defval: unknown) { return defval; },
      strategyEntry() {}, strategyExit() {}, strategyClose() {},
      strategyCloseAll() {}, strategyCancel() {}, strategyCancelAll() {},
      strategyOrder() {}, strategyDefaultEntryQty() { return NaN; }, strategyConvertToAccount() { return NaN; }, strategyConvertToSymbol() { return NaN; }, strategyProp() { return 0; }, strategyPropHistory() { return NaN; },
      strategyTradeProp() { return NaN; }, strategyRisk() { return undefined; },
      alert() {}, alertCondition() {},
      logInfo() {}, logWarning() {}, logError() {},
      drawingCount() { return 0; },
      markDrawingsPersistentFrom() {},
      markPersistentRuntimeValue() {},
      markPersistentArrayDrawing() {},
      markPersistentUdtField() {},
      arrayPush(array: PineArray, value: unknown) { return deps._arr.push(array, value); },
      arraySet(array: PineArray, index: number, value: unknown) { deps._arr.set(array, index, value); },
      arrayUnshift(array: PineArray, value: unknown) { return deps._arr.unshift(array, value); },
      arrayInsert(array: PineArray, index: number, value: unknown) { return deps._arr.insert(array, index, value); },
      arrayConcat(array: PineArray, other: PineArray) { return deps._arr.concat(array, other); },
      runtimeError(msg: unknown) { throw new Error(String(msg)); },
      timestamp() { return NaN; },
      timeFilter() { return NaN; },
      calendarPart() { return NaN; },
      runtimeTimeValue() { return NaN; },
      sessionValue() { return NaN; },
      nextBuiltinCallId(name: string) { return `${name}_0`; },
      callBuiltin() { return NaN; },
      callMethodBuiltin() { return NaN; },
      colorNew() { return ''; }, colorRgb() { return ''; },
      colorR() { return 0; }, colorG() { return 0; },
      colorB() { return 0; }, colorT() { return 0; },
      colorFromGradient() { return ''; },
      mathCall() { return NaN; },
      mathSum() { return 0; },
      strFormat(args: unknown[]) { return String(args[0]); },
      strFormatTime(args: unknown[]) { return String(args[0]); },
      tickerNew(args: unknown[]) { return String(args[0] ?? ''); },
      tickerModify(args: unknown[]) { return String(args[0] ?? ''); },
      tickerStandard(args: unknown[]) { return String(args[0] ?? ''); },
      tickerInherit(args: unknown[]) { return String(args[0] ?? ''); },
      tickerHeikinashi(args: unknown[]) { return String(args[0] ?? ''); },
      tickerRenko(args: unknown[]) { return String(args[0] ?? ''); },
      tickerKagi(args: unknown[]) { return String(args[0] ?? ''); },
      tickerLinebreak(args: unknown[]) { return String(args[0] ?? ''); },
      tickerPointfigure(args: unknown[]) { return String(args[0] ?? ''); },
      requestSecurity() { return NaN; },
      requestSecurityLowerTf() { return deps._arr.create(); },
      requestCurrencyRate() { return NaN; },
      requestPointSeries() { return NaN; },
      requestFootprint() { return NaN; },
      requestSeed() { return NaN; },
      footprintMethod() { return NaN; },
      capture() { return NaN; },
      captureSource() { return undefined; },
    };
    inst.onBar(ctx);
  }

  return plots;
}

describe('Compile end-to-end', () => {
  it('escapes the implicit function state parameter when Pine uses _state', () => {
    const ast = parse(`//@version=6
indicator("state parameter")
f(_state) => _state + 1
plot(f(2))`);
    const compiled = compile(ast);

    expect(compiled.success).toBe(true);
    expect(compiled.unsupported).toEqual([]);
  });

  it('escapes Pine parameters that collide with generated runtime parameters', () => {
    const ast = parse(`//@version=6
indicator("ctx parameter")
f(ctx) => ctx + 1
plot(f(2))`);
    const compiled = compile(ast);

    expect(compiled.success).toBe(true);
    expect(compiled.unsupported).toEqual([]);
  });

  it('escapes UDF body locals that collide with generated runtime parameters', () => {
    const plots = runCompiledSimple(`//@version=6
indicator("runtime local names")
f() =>
    int ctx = 2
    int _state = ctx + 3
    _state
plot(f())`, makeBars([10, 11]));

    expect(plots.get(0)).toEqual([5, 5]);
  });

  it('avoids colliding loop guards with a Pine loop variable named _iter', () => {
    const ast = parse(`//@version=6
indicator("iterator name")
int total = 0
for _iter = 0 to 2
    total += _iter
plot(total)`);
    const compiled = compile(ast);

    expect(compiled.success).toBe(true);
    expect(compiled.unsupported).toEqual([]);
  });

  const closes = [10, 11, 12, 11.5, 13, 12, 14, 15, 13, 12, 11, 14, 16, 15, 13, 12, 14, 15, 16, 17];
  const bars = makeBars(closes);

  it('compiles a simple SMA indicator', () => {
    const pine = `//@version=6\nindicator("test")\nplot(ta.sma(close, 5))`;
    const compiled = runCompiledSimple(pine, bars);
    const compiledWrapper = getCompiledWrapperPlots(pine, bars);

    expect(compiled.get(0)?.length).toBe(bars.length);
    expect(compiledWrapper.get(0)?.length).toBe(bars.length);
    expect(approxArrayEqual(compiled.get(0)!, compiledWrapper.get(0)!)).toBe(true);
  });

  it('compiles EMA + crossover', () => {
    const pine = `//@version=6
indicator("test")
fast = ta.ema(close, 3)
slow = ta.ema(close, 7)
plot(fast)
plot(slow)
plot(ta.crossover(fast, slow) ? 1 : 0)`;

    const compiled = runCompiledSimple(pine, bars);
    const compiledWrapper = getCompiledWrapperPlots(pine, bars);

    for (const [idx, values] of compiled) {
      expect(approxArrayEqual(values, compiledWrapper.get(idx)!)).toBe(true);
    }
  });

  it('compiles arithmetic expressions', () => {
    const pine = `//@version=6
indicator("test")
plot(close + open)
plot(close - open)
plot(high - low)`;

    const compiled = runCompiledSimple(pine, bars);
    const compiledWrapper = getCompiledWrapperPlots(pine, bars);

    for (const [idx, values] of compiled) {
      expect(approxArrayEqual(values, compiledWrapper.get(idx)!)).toBe(true);
    }
  });

  it('uses Pine floor-quotient modulo for v5 and newer negative operands', () => {
    for (const version of [5, 6, 7]) {
      const pine = `//@version=${version}
indicator("negative modulo")
plot(-5 % 3)
plot(5 % -3)
plot(-5 % -3)
plot(5 % 3)`;

      const result = executeScript(parse(pine), bars);

      expect(result.plots.map((plot) => plot.values)).toEqual([
        Array.from({ length: bars.length }, () => 1),
        Array.from({ length: bars.length }, () => -1),
        Array.from({ length: bars.length }, () => -2),
        Array.from({ length: bars.length }, () => 2),
      ]);
    }
  });

  it('uses Pine floor-quotient modulo for compound assignments in v6', () => {
    const pine = `//@version=6
indicator("compound negative modulo")
type Holder
    float value
localValue = -5
localValue %= 3
var float persistentValue = -5
persistentValue %= 3
Holder holder = Holder.new(-5)
holder.value %= 3
array<float> values = array.from(-5.0)
values[0] %= 3
plot(localValue)
plot(persistentValue)
plot(holder.value)
plot(array.get(values, 0))`;

    const result = executeScript(parse(pine), bars);

    expect(result.plots.map((plot) => plot.values)).toEqual([
      Array.from({ length: bars.length }, () => 1),
      Array.from({ length: bars.length }, () => 1),
      Array.from({ length: bars.length }, () => 1),
      Array.from({ length: bars.length }, () => 1),
    ]);
  });

  it('compiles if/else expressions', () => {
    const pine = `//@version=6
indicator("test")
plot(close > open ? 1 : -1)`;

    const compiled = runCompiledSimple(pine, bars);
    const compiledWrapper = getCompiledWrapperPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, compiledWrapper.get(0)!)).toBe(true);
  });

  it('compiles var persistence', () => {
    const pine = `//@version=6
indicator("test")
var count = 0
count := count + 1
plot(count)`;

    const compiled = runCompiledSimple(pine, bars);
    const compiledWrapper = getCompiledWrapperPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, compiledWrapper.get(0)!)).toBe(true);
  });

  it('compiles math functions', () => {
    const pine = `//@version=6
indicator("test")
plot(math.abs(close - open))
plot(math.max(high, close))`;

    const compiled = runCompiledSimple(pine, bars);
    const compiledWrapper = getCompiledWrapperPlots(pine, bars);

    for (const [idx, values] of compiled) {
      expect(approxArrayEqual(values, compiledWrapper.get(idx)!)).toBe(true);
    }
  });

  it('compiles nz/na functions', () => {
    const pine = `//@version=6
indicator("test")
x = ta.sma(close, 5)
plot(nz(x, 0))`;

    const compiled = runCompiledSimple(pine, bars);
    const compiledWrapper = getCompiledWrapperPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, compiledWrapper.get(0)!)).toBe(true);
  });

  it('compiles RSI', () => {
    const pine = `//@version=6
indicator("test")
plot(ta.rsi(close, 14))`;

    const compiled = runCompiledSimple(pine, bars);
    const compiledWrapper = getCompiledWrapperPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, compiledWrapper.get(0)!)).toBe(true);
  });

  it('compiles history access', () => {
    const pine = `//@version=6
indicator("test")
plot(close[1])`;

    const compiled = runCompiledSimple(pine, bars);
    const compiledWrapper = getCompiledWrapperPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, compiledWrapper.get(0)!)).toBe(true);
  });

  it('compiles highest/lowest', () => {
    const pine = `//@version=6
indicator("test")
plot(ta.highest(close, 5))
plot(ta.lowest(close, 5))`;

    const compiled = runCompiledSimple(pine, bars);
    const compiledWrapper = getCompiledWrapperPlots(pine, bars);

    for (const [idx, values] of compiled) {
      expect(approxArrayEqual(values, compiledWrapper.get(idx)!)).toBe(true);
    }
  });

  it('rejects unsupported features', () => {
    const pine = `//@version=6
indicator("test")
plot(ta.this_does_not_exist(close, 3))`;

    const ast = parse(pine);
    const compiled = compile(ast);
    expect(compiled.success).toBe(false);
    expect(compiled.unsupported).toEqual(['ta.this_does_not_exist not yet supported by transpiler']);
  });

  it('compiles exported library block functions, methods, types, enums, and constants', () => {
    const library = parse(`//@version=6
library("PublicHelper", true)
export const int FAST = 2
export const string HTF = "D"
export type Pivot
    float level = na
    string label = "pivot"
export enum Mode
    strict = "Strict"
    loose
export value(series float source) =>
    ta.sma(source, 2)
export extended(simple string tickerid) =>
    ticker.modify(tickerid, session=session.extended)
export blockValue(series float source) =>
    smoothed = ta.sma(source, 2)
    smoothed
export method lifted(Pivot this, float amount, float factor=1) =>
    adjusted = this.level + amount * factor
    adjusted
`);
    const pine = `//@version=6
indicator("test")
import PublicUser/PublicHelper/1 as helper
pivot = helper.Pivot.new(close, "close")
symbol = helper.extended("NASDAQ:AAPL")
plot(helper.value(close), "Value")
plot(helper.blockValue(close), "Block")
plot(pivot.level, "Level")
plot(pivot.lifted(1, factor=2), "Lifted")
plot(helper.Mode.strict == helper.Mode.loose ? 0 : 1, "Mode")
plot(str.length(helper.Mode.strict.title()) + str.length(helper.Mode.loose.title()), "Mode Title")
plot(helper.FAST, "Fast")
plot(timeframe.in_seconds(helper.HTF), "Seconds")`;

    const ast = parse(pine);
    const compiled = compile(ast, undefined, {
      libraries: new Map([['PublicUser/PublicHelper/1', library]]),
    });
    expect(compiled.success).toBe(true);
    expect(compiled.unsupported).toEqual([]);
    expect(compiled.analysis.importedFunctions.get('helper.value')).toBe('helper__value');
    expect(compiled.analysis.importedFunctions.get('helper.extended')).toBe('helper__extended');
    expect(compiled.analysis.importedFunctions.get('helper.blockValue')).toBe('helper__blockValue');
    expect(compiled.analysis.importedMethods.get('lifted')).toBe('helper__Pivot__lifted__3');
    expect(compiled.analysis.importedMethodOverloads.get('lifted')).toEqual([
      { receiverType: 'helper.Pivot', internalName: 'helper__Pivot__lifted__3' },
    ]);
    expect(compiled.analysis.typeDecls.has('helper.Pivot')).toBe(true);
    expect(compiled.analysis.importedEnumValues.get('helper.Mode.strict')).toBe('PublicUser/PublicHelper/1.Mode.strict');
    expect(compiled.analysis.importedEnumTitles.get('helper.Mode.strict')).toBe('Strict');
    expect(compiled.analysis.importedEnumTitles.get('helper.Mode.loose')).toBe('loose');
    expect(compiled.analysis.importedConstants.has('helper.FAST')).toBe(true);
    expect(compiled.analysis.importedConstants.has('helper.HTF')).toBe(true);
  });

  it('compiles request footprint calls through the provider seam', () => {
    const pine = `//@version=6
indicator("test")
footprint = request.footprint(10, 70)
rows = na(footprint) ? array.new<float>() : footprint.rows()
row = array.size(rows) > 0 ? array.get(rows, 0) : na
plot(na(footprint) ? 0 : footprint.total_volume())
plot(na(row) ? 0 : volume_row.delta(row))`;

    const ast = parse(pine);
    const compiled = compile(ast);
    expect(compiled.success).toBe(true);
  });

  it('compiles legacy request.quandl point-series calls', () => {
    const pine = `//@version=6
indicator("test")
metric = request.quandl("FRED/GDP", barmerge.gaps_off, 0, ignore_invalid_symbol=true)
plot(metric)`;

    const ast = parse(pine);
    const compiled = compile(ast);
    expect(compiled.success).toBe(true);
    expect(compiled.unsupported).toEqual([]);
  });

  it('detects request.security calls in analyzer', () => {
    const pine = `//@version=6
indicator("test")
htfClose = request.security(syminfo.tickerid, "D", ta.sma(close, 14))
plot(htfClose)`;

    const ast = parse(pine);
    const compiled = compile(ast);
    expect(compiled.success).toBe(true);
    expect(compiled.analysis.securitySites.length).toBe(1);
    const site = compiled.analysis.securitySites[0];
    expect(site.id).toBe(0);
    expect(site.expressionExpr.type).toBe('CallExpression');
    expect(site.taCallSites.length).toBe(1);
    expect(site.taCallSites[0].className).toBe('SMA');
  });

  it('classifies promoted root block shadow names as user history series', () => {
    const pine = `//@version=6
indicator("promoted block shadow classification")
if true
    source = bar_index + 10
    n = bar_index + 20
    close = bar_index + 30
    plot(source[1] + n[1] + close[1])`;

    const ast = parse(pine);
    const compiled = compile(ast);
    expect(compiled.success).toBe(true);
    if (!compiled.success) return;

    expect(compiled.analysis.seriesVars.has('source')).toBe(true);
    expect(compiled.analysis.seriesVars.has('n')).toBe(true);
    expect(compiled.analysis.seriesVars.has('close')).toBe(true);
    expect(compiled.analysis.barFieldSeriesVars.has('close')).toBe(false);
    expect(compiled.generatedCode).toContain('this._sv_source.get(1)');
    expect(compiled.generatedCode).toContain('this._sv_n.get(1)');
    expect(compiled.generatedCode).toContain('this._sv_close.get(1)');
    expect(compiled.generatedCode).not.toContain('this._s_close.get(1)');
  });

  it('writes branch-local shadow declarations into their user history series', () => {
    const shadowableNames = [
      'open', 'high', 'low', 'close', 'volume', 'time', 'bid', 'ask',
      'hl2', 'hlc3', 'ohlc4', 'hlcc4',
      'bar_index', 'last_bar_index', 'n', 'source', 'symbol', 'ticker', 'tickerid', 'tr',
      'accdist', 'iii', 'nvi', 'obv', 'pvi', 'pvt', 'wad', 'wvad',
      'time_close', 'year', 'month', 'dayofmonth', 'dayofweek', 'hour', 'minute', 'second',
      'red', 'blue', 'green', 'black', 'white',
      'line', 'area', 'solid', 'dashed', 'dotted',
    ];

    const cases = [
      (name: string) => `//@version=6
indicator("root if-expression shadow ${name}")
value = if bar_index >= 0
    ${name} = close + 10
    ${name}[1]
else
    na
plot(value)`,
      (name: string) => `//@version=6
indicator("nested if-expression shadow ${name}")
value = if bar_index >= 0
    if close > -100
        ${name} = close + 20
        ${name}[1]
    else
        na
else
    na
plot(value)`,
    ];

    for (const name of shadowableNames) {
      for (const pineForName of cases) {
        const compiled = compile(parse(pineForName(name)));
        expect(compiled.success, name).toBe(true);
        if (!compiled.success) continue;
        const member = `_sv_${name}`;
        const escapedMember = member.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        expect(compiled.analysis.seriesVars.has(name), name).toBe(true);
        expect(compiled.generatedCode, name).toContain(`this.${member}.get(1)`);
        expect(compiled.generatedCode, name).toMatch(new RegExp(`this\\.${escapedMember}\\.(push|update)\\(_l_${name}\\)`));
      }
    }
  });

  it('keeps unshadowed legacy bare TA variable aliases on their builtin path', () => {
    const aliases = [
      ['accdist', 'AccumulationDistribution'],
      ['iii', 'IntradayIntensityIndex'],
      ['nvi', 'NegativeVolumeIndex'],
      ['obv', 'OBV'],
      ['pvi', 'PositiveVolumeIndex'],
      ['pvt', 'PriceVolumeTrend'],
      ['wad', 'WilliamsAccumulationDistribution'],
      ['wvad', 'WilliamsVariableAccumulationDistribution'],
    ];

    for (const [name, className] of aliases) {
      const compiled = compile(parse(`//@version=4
study("legacy bare ${name}")
plot(${name})
plot(${name}[1])`));

      expect(compiled.success, name).toBe(true);
      if (!compiled.success) continue;
      expect(compiled.analysis.taVarSites.map((site) => site.className), name).toContain(className);
      expect(compiled.analysis.seriesVars.has(name), name).toBe(false);
      expect(compiled.generatedCode, name).toContain(`new deps.${className}()`);
      expect(compiled.generatedCode, name).toContain('.get(0)');
      expect(compiled.generatedCode, name).toContain('.get(1)');
      expect(compiled.generatedCode, name).not.toMatch(new RegExp(`[^._A-Za-z0-9]${name}[^A-Za-z0-9]`));
    }
  });

  it('compiles source-parameter and computed request wrappers', () => {
    const pine = `//@version=6
indicator("test")
mtf(series float source, string tf) =>
    request.security(syminfo.tickerid, tf, source, lookahead=barmerge.lookahead_on)
plot(mtf(close, "D"))`;

    const ast = parse(pine);
    const compiled = compile(ast);
    expect(compiled.success).toBe(true);
    expect(compiled.analysis.securitySites.length).toBe(1);
    expect(compiled.analysis.securitySites[0].expressionSourceParam).toBe('source');
    expect(compiled.securityScripts.size).toBe(0);

    const computedPine = `//@version=6
indicator("test")
mtf(series float source, string tf) =>
    request.security(syminfo.tickerid, tf, source + 1, lookahead=barmerge.lookahead_on)
plot(mtf(close, "D"))`;

    const computedAst = parse(computedPine);
    const computedCompiled = compile(computedAst);
    expect(computedCompiled.success).toBe(true);
    expect(computedCompiled.analysis.securitySites[0]?.expressionCaptureParams).toEqual(['source']);
    expect(computedCompiled.securityScripts.size).toBe(1);
  });

  it('compiles request wrapper expressions that reference root regular values', () => {
    const pine = `//@version=6
indicator("test")
len = input.int(2)
smooth(series float source) => ta.sma(source, len)
mtf(series float source, string tf) =>
    request.security("TEST", tf, smooth(source), lookahead=barmerge.lookahead_on)
plot(mtf(close, "D"))`;

    const compiled = compile(parse(pine));

    expect(compiled.success).toBe(true);
    expect(compiled.unsupported).toEqual([]);
    expect(compiled.securityScripts.size).toBe(1);
    expect(compiled.generatedCode).toContain('this._g_len = ctx.input');
    expect(compiled.securityScripts.get(0)?.generatedCode).toContain('this._g_len = ctx.input');
  });

  it('compiles local enum values and title methods', () => {
    const pine = `//@version=6
indicator("test")
enum Mode
    strict = "Strict"
    loose
plot(str.length(Mode.strict.title()) + str.length(Mode.loose.title()), "Mode Title")`;

    const compiled = compile(parse(pine));

    expect(compiled.success).toBe(true);
    expect(compiled.analysis.enumValues.get('Mode.strict')).toBe('Mode.strict');
    expect(compiled.analysis.enumTitles.get('Mode.strict')).toBe('Strict');
    expect(compiled.analysis.enumTitles.get('Mode.loose')).toBe('loose');
  });

  it('compiles source-parameter lower timeframe and seed wrappers', () => {
    const pine = `//@version=6
indicator("test", timeframe="2")
lower(series float source, string tf) =>
    request.security_lower_tf("TEST", tf, source)
seedWrap(series float source) =>
    request.seed("tradingview-pine-seeds/demo", "BTC_DEV", source)
plot(array.size(lower(close, "1")))
plot(seedWrap(close))`;

    const ast = parse(pine);
    const compiled = compile(ast);
    expect(compiled.success).toBe(true);
    expect(compiled.unsupported).toEqual([]);
    expect(compiled.analysis.securitySites.map((site) => site.expressionSourceParam)).toEqual(['source', 'source']);
    expect(compiled.securityScripts.size).toBe(0);
  });

  it('compiles computed request subprograms for security, lower timeframe, and seed', () => {
    const pine = `//@version=6
indicator("test", timeframe="2")
len = input.int(2, "Length")
securityWrap(series float source, string tf) =>
    request.security("TEST", tf, ta.sma(source, len) + 1, lookahead=barmerge.lookahead_on)
lowerWrap(series float source, string tf) =>
    request.security_lower_tf("TEST", tf, ta.sma(source, len) + 2)
seedWrap(series float source) =>
    request.seed("tradingview-pine-seeds/demo", "BTC_DEV", ta.sma(source, len) + 3)
plot(securityWrap(close, "D"))
plot(array.size(lowerWrap(close, "1")))
plot(seedWrap(close))`;

    const compiled = compile(parse(pine));

    expect(compiled.success).toBe(true);
    expect(compiled.unsupported).toEqual([]);
    expect(compiled.analysis.securitySites.map((site) => site.expressionSourceParam)).toEqual([undefined, undefined, undefined]);
    expect(compiled.securityScripts.size).toBe(3);
  });

  it('compiles optional point-series request families', () => {
    const pine = `//@version=6
indicator("test")
d = request.dividends(syminfo.tickerid)
e = request.earnings(syminfo.tickerid, earnings.actual)
s = request.splits(syminfo.tickerid, splits.denominator)
f = request.financial(syminfo.tickerid, "TOTAL_REVENUE", "FQ")
g = request.economic("US", "GDP")
plot(d + e + s + f + g)`;

    const ast = parse(pine);
    const compiled = compile(ast);
    expect(compiled.success).toBe(true);
    expect(compiled.unsupported).toEqual([]);
  });

  it('compiles for loop', () => {
    const pine = `//@version=6
indicator("test")
sum = 0.0
for i = 0 to 4
    sum := sum + close
plot(sum)`;

    const compiled = runCompiledSimple(pine, bars);
    const compiledWrapper = getCompiledWrapperPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, compiledWrapper.get(0)!)).toBe(true);
  });

  it('compiles boolean logic', () => {
    const pine = `//@version=6
indicator("test")
plot(close > open and high > close[1] ? 1 : 0)`;

    const compiled = runCompiledSimple(pine, bars);
    const compiledWrapper = getCompiledWrapperPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, compiledWrapper.get(0)!)).toBe(true);
  });

  it('compiles array.new and array.push/size/get', () => {
    const pine = `//@version=6
indicator("test")
arr = array.new_float(0)
array.push(arr, close)
array.push(arr, open)
plot(array.size(arr))
plot(array.get(arr, 0))`;

    const compiled = runCompiledSimple(pine, bars);
    const compiledWrapper = getCompiledWrapperPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, compiledWrapper.get(0)!)).toBe(true);
    expect(approxArrayEqual(compiled.get(1)!, compiledWrapper.get(1)!)).toBe(true);
  });

  it('compiles array.from', () => {
    const pine = `//@version=6
indicator("test")
arr = array.from(1, 2, 3, 4, 5)
plot(array.sum(arr))
plot(array.avg(arr))`;

    const compiled = runCompiledSimple(pine, bars);
    const compiledWrapper = getCompiledWrapperPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, compiledWrapper.get(0)!)).toBe(true);
    expect(approxArrayEqual(compiled.get(1)!, compiledWrapper.get(1)!)).toBe(true);
  });

  it('compiles array.min/max', () => {
    const pine = `//@version=6
indicator("test")
var arr = array.new_float(0)
array.push(arr, close)
plot(array.min(arr))
plot(array.max(arr))
ranked = array.from(5, -2, 0, 9, 1)
plot(array.min(ranked, nth=1))
plot(array.max(ranked, 2))`;

    const compiled = runCompiledSimple(pine, bars);
    const compiledWrapper = getCompiledWrapperPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, compiledWrapper.get(0)!)).toBe(true);
    expect(approxArrayEqual(compiled.get(1)!, compiledWrapper.get(1)!)).toBe(true);
    expect(approxArrayEqual(compiled.get(2)!, compiledWrapper.get(2)!)).toBe(true);
    expect(approxArrayEqual(compiled.get(3)!, compiledWrapper.get(3)!)).toBe(true);
  });

  it('compiles for-in loop over array', () => {
    const pine = `//@version=6
indicator("test")
arr = array.from(1.0, 2.0, 3.0)
sum = 0.0
for val in arr
    sum := sum + val
plot(sum)`;

    const compiled = runCompiledSimple(pine, bars);
    const compiledWrapper = getCompiledWrapperPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, compiledWrapper.get(0)!)).toBe(true);
  });

  it('compiles for-in loop with index counter', () => {
    const pine = `//@version=6
indicator("test")
arr = array.from(10.0, 20.0, 30.0)
sum = 0.0
for [idx, val] in arr
    sum := sum + val + idx
plot(sum)`;

    const compiled = runCompiledSimple(pine, bars);
    const compiledWrapper = getCompiledWrapperPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, compiledWrapper.get(0)!)).toBe(true);
  });

  it('compiles array with sort', () => {
    const pine = `//@version=6
indicator("test")
arr = array.from(3.0, 1.0, 2.0)
array.sort(arr)
plot(array.get(arr, 0))
plot(array.get(arr, 2))`;

    const compiled = runCompiledSimple(pine, bars);
    const compiledWrapper = getCompiledWrapperPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, compiledWrapper.get(0)!)).toBe(true);
    expect(approxArrayEqual(compiled.get(1)!, compiledWrapper.get(1)!)).toBe(true);
  });

  it('compiles map.new and map.put/get/size', () => {
    const pine = `//@version=6
indicator("test")
m = map.new<string, float>()
map.put(m, "a", close)
map.put(m, "b", open)
plot(map.size(m))
plot(map.get(m, "a"))`;

    const compiled = runCompiledSimple(pine, bars);
    const compiledWrapper = getCompiledWrapperPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, compiledWrapper.get(0)!)).toBe(true);
    expect(approxArrayEqual(compiled.get(1)!, compiledWrapper.get(1)!)).toBe(true);
  });

  it('compiles user-defined types', () => {
    const pine = `//@version=6
indicator("test")
type MyPoint
    float x = 0.0
    float y = 0.0
p = MyPoint.new(x=close, y=open)
plot(p.x)
plot(p.y)`;

    const compiled = runCompiledSimple(pine, bars);
    const compiledWrapper = getCompiledWrapperPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, compiledWrapper.get(0)!)).toBe(true);
    expect(approxArrayEqual(compiled.get(1)!, compiledWrapper.get(1)!)).toBe(true);
  });

  it('compiles UDT field assignment', () => {
    const pine = `//@version=6
indicator("test")
type Info
    float val = 0.0
i = Info.new()
i.val := close
plot(i.val)`;

    const compiled = runCompiledSimple(pine, bars);
    const compiledWrapper = getCompiledWrapperPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, compiledWrapper.get(0)!)).toBe(true);
  });

  it('compiles map.contains and map.keys', () => {
    const pine = `//@version=6
indicator("test")
m = map.new<string, float>()
map.put(m, "x", 42.0)
plot(map.contains(m, "x") ? 1 : 0)
plot(map.contains(m, "y") ? 1 : 0)`;

    const compiled = runCompiledSimple(pine, bars);
    const compiledWrapper = getCompiledWrapperPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, compiledWrapper.get(0)!)).toBe(true);
    expect(approxArrayEqual(compiled.get(1)!, compiledWrapper.get(1)!)).toBe(true);
  });

  it('compiles matrix.new and matrix operations', () => {
    const pine = `//@version=6
indicator("test")
m = matrix.new<float>(2, 2, 0.0)
matrix.set(m, 0, 0, close)
matrix.set(m, 0, 1, open)
matrix.set(m, 1, 0, high)
matrix.set(m, 1, 1, low)
plot(matrix.get(m, 0, 0))
plot(matrix.rows(m))`;

    const compiled = runCompiledSimple(pine, bars);
    const compiledWrapper = getCompiledWrapperPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, compiledWrapper.get(0)!)).toBe(true);
    expect(approxArrayEqual(compiled.get(1)!, compiledWrapper.get(1)!)).toBe(true);
  });

  it('compiles matrix.det', () => {
    const pine = `//@version=6
indicator("test")
m = matrix.new<float>(2, 2, 0.0)
matrix.set(m, 0, 0, 1.0)
matrix.set(m, 0, 1, 2.0)
matrix.set(m, 1, 0, 3.0)
matrix.set(m, 1, 1, 4.0)
plot(matrix.det(m))`;

    const compiled = runCompiledSimple(pine, bars);
    const compiledWrapper = getCompiledWrapperPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, compiledWrapper.get(0)!)).toBe(true);
  });
});
