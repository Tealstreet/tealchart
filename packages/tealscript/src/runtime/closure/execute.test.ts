import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import type { Bar } from '../context';
import { executeCompiled, tryCompile } from '../codegen';
import { executeScript, TealscriptEngine } from '../engine';
import { InMemoryRequestDatafeed } from '../requestDatafeed';
import { executeClosure, tryCompileClosure } from './execute';

function makeBars(closes: number[]): Bar[] {
  return closes.map((close, index) => ({
    time: (index + 1) * 60_000,
    open: close - 0.5,
    high: close + 1,
    low: close - 1,
    close,
    volume: 100 + index,
  }));
}

describe('closure backend', () => {
  const bars = makeBars([10, 11, 12, 11.5, 13, 12, 14, 15]);

  it('is a selectable execution mode with plot parity on supported constructs', () => {
    const ast = parse(`//@version=6
indicator("closure supported")
smooth(series float source, simple int length) =>
    acc = 0.0
    for i = 1 to length
        acc += i
    source + acc
plot(smooth(close, 3), "Close")
plot(close > open ? 1 : 0, "Up")`);
    const compiled = tryCompileClosure(ast);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const closureResult = executeClosure(compiled, bars);
    const interpreterResult = executeScript(ast, bars);

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.plots.map((plot) => plot.values)).toEqual(interpreterResult.plots.map((plot) => plot.values));
  });

  it('fails loudly for unsupported constructs instead of falling back silently', () => {
    const ast = parse(`//@version=6
indicator("closure unsupported")
mapper = (value) => value + 1
plot(close)`);

    const compiled = tryCompileClosure(ast);

    expect(compiled.success).toBe(false);
    expect(compiled.unsupported.join('\n')).toContain('unsupported expression LambdaExpression');
    expect(() => executeClosure(compiled, bars)).toThrow(/Closure backend unsupported/);
  });

  it('executes seeded request.security values in closure mode', () => {
    const ast = parse(`//@version=6
indicator("closure request")
remote = request.security("ALT", "D", close + open)
plot(remote, "Remote")`);
    const requestBars = bars.map((bar) => ({
      ...bar,
      open: bar.open + 100,
      close: bar.close + 100,
    }));
    const requestDatafeed = new InMemoryRequestDatafeed([
      { symbol: 'ALT', timeframe: 'D', bars: requestBars },
    ]);
    const compiled = tryCompileClosure(ast, { requestDatafeed });

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const closureResult = executeClosure(compiled, bars, undefined, { requestDatafeed });
    const interpreterResult = executeScript(ast, bars, undefined, { requestDatafeed });

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.plots[0]?.values).toEqual(interpreterResult.plots[0]?.values);
    expect(closureResult.plots[0]?.values.some((value) => typeof value === 'number' && value > 100)).toBe(true);
  });

  it('remaps input.source aliases inside request.security expressions', () => {
    const ast = parse(`//@version=6
indicator("closure request source")
source = input.source(close, "Source")
remote = request.security("ALT", "3", ta.sma(source, 3), lookahead=barmerge.lookahead_on)
plot(remote, "Remote")`);
    const requestBars = makeBars([50, 60, 70, 80, 90, 100, 110, 120]).map((bar, index) => ({
      ...bar,
      time: bars[0]!.time + index * 180_000,
    }));
    const requestDatafeed = new InMemoryRequestDatafeed([
      { symbol: 'ALT', timeframe: '3', bars: requestBars },
    ]);
    const compiled = tryCompileClosure(ast, { requestDatafeed });

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const closureResult = executeClosure(compiled, bars, undefined, { requestDatafeed });
    const interpreterResult = executeScript(ast, bars, undefined, { requestDatafeed });

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.plots[0]?.values).toEqual(interpreterResult.plots[0]?.values);
    expect(closureResult.plots[0]?.values.some((value) => typeof value === 'number' && value > 50)).toBe(true);
  });

  it('lowers legacy color(na) to transparent drawing color', () => {
    const ast = parse(`//@version=6
indicator("closure color cast", overlay=true)
if barstate.islast
    label.new(bar_index, close, "transparent", color=color(na))
plot(close, "Close")`);
    const compiled = tryCompileClosure(ast);
    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const closureResult = executeClosure(compiled, bars);
    const interpreterResult = executeScript(ast, bars);

    expect(closureResult.drawings.find((drawing) => drawing.type === 'label')?.color).toBeNull();
    expect(closureResult.drawings).toEqual(interpreterResult.drawings);
  });

  it('uses the active HTF provider bar for request.security on unconfirmed realtime bars', () => {
    const ast = parse(`//@version=6
indicator("closure realtime HTF request")
htf = request.security("ALT", "3", close, gaps=barmerge.gaps_on, lookahead=barmerge.lookahead_off)
plot(htf, "HTF")`);
    const requestBars = [
      { ...bars[0]!, time: bars[0]!.time, close: 50 },
      { ...bars[3]!, time: bars[3]!.time, close: 80 },
      { ...bars[6]!, time: bars[6]!.time, close: 110 },
    ];
    const requestDatafeed = new InMemoryRequestDatafeed([
      { symbol: 'ALT', timeframe: '3', bars: requestBars },
    ]);
    const compiled = tryCompileClosure(ast, { requestDatafeed });

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const interpreter = new TealscriptEngine({ requestDatafeed });
    interpreter.execute(ast, bars.slice(0, 6));
    interpreter.updateBar(ast, bars[6]!);
    const interpreterResult = interpreter.getCurrentExecutionResult();

    const closureResult = executeClosure(compiled, bars.slice(0, 7), undefined, {
      requestDatafeed,
      confirmedRealtimeBarStartIndex: 6,
      realtimeLastBar: { isNew: true },
    });

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.errors).toEqual([]);
    expect(closureResult.plots[0]?.values).toEqual(interpreterResult.plots[0]?.values);
    expect(closureResult.plots[0]?.values.at(-1)).toBe(110);
  });

  it('replays prior computed globals in request.security during realtime reconstruction', () => {
    const ast = parse(`//@version=6
indicator("closure realtime computed request")
basis = ta.sma(close, 2)
htf = request.security("ALT", "3", basis, gaps=barmerge.gaps_on, lookahead=barmerge.lookahead_off)
plot(htf, "HTF")`);
    const requestBars = [
      { ...bars[0]!, time: bars[0]!.time, close: 50 },
      { ...bars[3]!, time: bars[3]!.time, close: 80 },
      { ...bars[6]!, time: bars[6]!.time, close: 110 },
    ];
    const requestDatafeed = new InMemoryRequestDatafeed([
      { symbol: 'ALT', timeframe: '3', bars: requestBars },
    ]);
    const compiled = tryCompileClosure(ast, { requestDatafeed });

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const interpreter = new TealscriptEngine({ requestDatafeed });
    interpreter.execute(ast, bars.slice(0, 6));
    interpreter.updateBar(ast, bars[6]!);
    const interpreterResult = interpreter.getCurrentExecutionResult();

    const closureResult = executeClosure(compiled, bars.slice(0, 7), undefined, {
      requestDatafeed,
      confirmedRealtimeBarStartIndex: 6,
      realtimeLastBar: { isNew: true },
    });
    const directChartBasis = (bars[5]!.close + bars[6]!.close) / 2;

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.errors).toEqual([]);
    expect(closureResult.plots[0]?.values).toEqual(interpreterResult.plots[0]?.values);
    expect(closureResult.plots[0]?.values.at(-1)).toBe(95);
    expect(closureResult.plots[0]?.values.at(-1)).not.toBe(directChartBasis);
  });

  it('does not finalize default strategy ledger state for an unconfirmed realtime tail', () => {
    const ast = parse(`//@version=6
strategy("closure realtime default strategy")
plot(close)`);
    const compiled = tryCompileClosure(ast);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const interpreter = new TealscriptEngine();
    interpreter.execute(ast, bars.slice(0, 4));
    interpreter.updateBar(ast, bars[4]!);
    const interpreterResult = interpreter.getCurrentExecutionResult();

    const closureResult = executeClosure(compiled, bars.slice(0, 5), undefined, {
      confirmedRealtimeBarStartIndex: 4,
      realtimeLastBar: { isNew: true },
    });

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.strategy.equityCurve).toHaveLength(4);
    expect(closureResult.strategy.equityCurve).toEqual(interpreterResult.strategy.equityCurve);
  });

  it('fills pending strategy exits on unconfirmed realtime bars without finalizing equity', () => {
    const strategyBars: Bar[] = [
      { time: 1, open: 100, high: 100.25, low: 99.75, close: 100, volume: 100 },
      { time: 2, open: 100, high: 100.25, low: 99.75, close: 100, volume: 100 },
      { time: 3, open: 100, high: 100.25, low: 99.75, close: 100, volume: 100 },
      { time: 4, open: 100, high: 100.25, low: 99.75, close: 100, volume: 100 },
      { time: 5, open: 100, high: 102, low: 99.75, close: 101, volume: 100 },
    ];
    const ast = parse(`//@version=6
strategy("closure realtime pending fill", calc_on_every_tick=false, initial_capital=1000)
if bar_index == 0
    strategy.entry("L", strategy.long, qty=1)
if bar_index == 2
    strategy.exit("X", "L", limit=101.5)
plot(strategy.closedtrades, title="Closed")`);
    const compiled = tryCompileClosure(ast);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const interpreter = new TealscriptEngine();
    interpreter.execute(ast, strategyBars.slice(0, 4));
    interpreter.updateBar(ast, strategyBars[4]!);
    const interpreterResult = interpreter.getCurrentExecutionResult();

    const closureResult = executeClosure(compiled, strategyBars, undefined, {
      confirmedRealtimeBarStartIndex: 4,
      realtimeLastBar: { isNew: true },
    });

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.strategy.closedTrades).toHaveLength(1);
    expect(closureResult.strategy.closedTrades).toEqual(interpreterResult.strategy.closedTrades);
    expect(closureResult.strategy.fills).toEqual(interpreterResult.strategy.fills);
    expect(closureResult.strategy.equityCurve).toHaveLength(4);
    expect(closureResult.strategy.equityCurve).toEqual(interpreterResult.strategy.equityCurve);
  });

  it('marks confirmed realtime strategy runup before replaying exit fills', () => {
    const strategyBars: Bar[] = [
      { time: 1, open: 100, high: 100.25, low: 99.75, close: 100, volume: 100 },
      { time: 2, open: 100, high: 100.25, low: 99.75, close: 100, volume: 100 },
      { time: 3, open: 100, high: 100.25, low: 99.75, close: 100, volume: 100 },
      { time: 4, open: 100, high: 100.25, low: 99.75, close: 100, volume: 100 },
      { time: 5, open: 100, high: 102, low: 99.75, close: 101, volume: 100 },
      { time: 6, open: 101, high: 101.25, low: 100.75, close: 101, volume: 100 },
    ];
    const ast = parse(`//@version=6
strategy("closure confirmed realtime runup", calc_on_every_tick=false, initial_capital=1000)
if bar_index == 0
    strategy.entry("L", strategy.long, qty=1)
if bar_index == 2
    strategy.exit("X", "L", limit=101.5)
plot(strategy.closedtrades, title="Closed")`);
    const compiled = tryCompileClosure(ast);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const interpreter = new TealscriptEngine();
    interpreter.execute(ast, strategyBars.slice(0, 4));
    interpreter.updateBar(ast, strategyBars[4]!);
    interpreter.updateBar(ast, strategyBars[5]!);
    const interpreterResult = interpreter.getCurrentExecutionResult();

    const closureResult = executeClosure(compiled, strategyBars, undefined, {
      confirmedRealtimeBarStartIndex: 4,
      confirmedRealtimeBarIndex: 4,
      realtimeLastBar: { isNew: true },
    });

    expect(closureResult.strategy.closedTrades).toEqual(interpreterResult.strategy.closedTrades);
    expect(closureResult.strategy.closedTrades[0]?.maxRunup).toBe(2);
  });

  it('keeps replaced strategy.exit orders active for historical OHLC fills', () => {
    const strategyBars: Bar[] = [
      { time: 1, open: 100, high: 100, low: 100, close: 100, volume: 100 },
      { time: 2, open: 100, high: 100, low: 100, close: 100, volume: 100 },
      { time: 3, open: 100, high: 102, low: 99, close: 100, volume: 100 },
      { time: 4, open: 100, high: 100, low: 100, close: 100, volume: 100 },
    ];
    const ast = parse(`//@version=6
strategy("closure moving exit", initial_capital=1000)
if bar_index == 0
    strategy.entry("L", strategy.long, qty=1)
if strategy.position_size > 0
    strategy.exit("Exit", "L", limit=close + 1)
plot(strategy.closedtrades, title="Closed")`);
    const compiled = tryCompileClosure(ast);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const closureResult = executeClosure(compiled, strategyBars);
    const interpreterResult = executeScript(ast, strategyBars);

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.plots[0]?.values).toEqual([0, 0, 0, 1]);
    expect(closureResult.strategy.closedTrades).toHaveLength(1);
    expect(interpreterResult.strategy.closedTrades).toHaveLength(1);
    expect(closureResult.strategy.closedTrades[0]?.exitBarIndex).toBe(2);
  });

  it('preserves source-aware TA arguments at direct and variable call sites', () => {
    const ast = parse(`//@version=6
indicator("closure source TA")
src = close
selected = input.source(close, "Source")
legacy = input(close, "Legacy Source")
plot(ta.ema(close, 3), "Direct")
plot(ta.ema(src, 3), "Variable")
plot(ta.ema(selected, 3), "Input")
plot(ta.ema(legacy, 3), "Legacy Input")`);
    const compiled = tryCompileClosure(ast);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const closureResult = executeClosure(compiled, bars);
    const interpreterResult = executeScript(ast, bars);

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.plots.map((plot) => plot.values)).toEqual(interpreterResult.plots.map((plot) => plot.values));
    expect(closureResult.plots[0]?.values[0]).toBe(10);
  });

  it('keeps untitled input call sites distinct', () => {
    const ast = parse(`//@version=3
study("closure untitled input identity")
fastLength = input(3), slowLength = input(7), maximum = input(0.2)
fast = ema(close, fastLength)
slow = ema(close, slowLength)
plot(fast - slow, "MACD")
plot(sar(0.02, 0.02, maximum), "SAR")`);
    const compiled = tryCompileClosure(ast);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const closureResult = executeClosure(compiled, bars);
    const interpreterResult = executeScript(ast, bars);

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.errors).toEqual([]);
    expect(closureResult.plots.map((plot) => plot.values)).toEqual(interpreterResult.plots.map((plot) => plot.values));
    expect(closureResult.plots[0]?.values[2]).not.toBe(0);
  });

  it('resolves legacy bare visual constants at plot and drawing call sites', () => {
    const ast = parse(`//@version=4
study("closure bare visual constants", overlay=true)
plot(close, title="Cross Plot", style=cross)
var guide = line.new(0, close, 1, close, style=dotted)
line.set_style(guide, dashed)`);
    const compiled = tryCompileClosure(ast);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const closureResult = executeClosure(compiled, bars);
    const interpreterResult = executeScript(ast, bars);
    const closureLines = closureResult.drawings.filter((drawing) => drawing.type === 'line');
    const interpreterLines = interpreterResult.drawings.filter((drawing) => drawing.type === 'line');

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.plots.map((plot) => plot.style)).toEqual(interpreterResult.plots.map((plot) => plot.style));
    expect(closureLines.map((drawing) => drawing.style)).toEqual(interpreterLines.map((drawing) => drawing.style));
    expect(closureResult.plots[0]?.style).toBe('cross');
    expect(closureLines[0]?.style).toBe('dashed');
  });

  it('resolves strategy constants and readouts at declaration and runtime call sites', () => {
    const ast = parse(`//@version=6
strategy("closure strategy members", process_orders_on_close=true, initial_capital=1000, default_qty_type=strategy.percent_of_equity, default_qty_value=10)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.close("Long")
plot(strategy.position_size, "Position")
plot(strategy.netprofit, "Net Profit")
plot(strategy.equity, "Equity")`);
    const compiled = tryCompileClosure(ast);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const closureResult = executeClosure(compiled, bars);
    const interpreterResult = executeScript(ast, bars);

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.plots.map((plot) => plot.values)).toEqual(interpreterResult.plots.map((plot) => plot.values));
    expect(closureResult.plots[0]?.values).toContain(1);
    expect(closureResult.plots[2]?.values.at(-1)).toBeGreaterThan(1000);
  });

  it('preserves strategy metric history for bracket exits', () => {
    const strategyBars: Bar[] = [
      { time: 1, open: 100, high: 100, low: 100, close: 100, volume: 100 },
      { time: 2, open: 100, high: 100, low: 100, close: 100, volume: 100 },
      { time: 3, open: 100, high: 103, low: 99, close: 101, volume: 100 },
      { time: 4, open: 101, high: 101, low: 101, close: 101, volume: 100 },
    ];
    const ast = parse(`//@version=6
strategy("closure strategy metric history", initial_capital=1000)
var float takeProfit = na
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if strategy.position_size > 0 and strategy.position_size[1] == 0
    takeProfit := strategy.position_avg_price * 1.01
if strategy.position_size > 0
    strategy.exit("Long TP", "Long", limit=takeProfit)
plot(strategy.closedtrades, "Closed")`);
    const compiled = tryCompile(ast);
    const closureCompiled = tryCompileClosure(ast);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });
    expect(closureCompiled).toMatchObject({ success: true, unsupported: [] });

    const compiledResult = executeCompiled(compiled, strategyBars);
    const closureResult = executeClosure(closureCompiled, strategyBars);
    const interpreterResult = executeScript(ast, strategyBars);

    expect(compiledResult).not.toBeNull();
    expect(closureResult.plots.map((plot) => plot.values)).toEqual(compiledResult!.plots.map((plot) => plot.values));
    expect(interpreterResult.plots.map((plot) => plot.values)).toEqual(compiledResult!.plots.map((plot) => plot.values));
    expect(compiledResult!.strategy.orders).toHaveLength(2);
    expect(interpreterResult.strategy.orders).toHaveLength(2);
    expect(closureResult.strategy.orders).toHaveLength(2);
    expect(compiledResult!.strategy.closedTrades).toHaveLength(1);
    expect(interpreterResult.strategy.closedTrades).toHaveLength(1);
    expect(closureResult.strategy.closedTrades).toHaveLength(1);
  });

  it('normalizes missing identifier history to na for accumulator call sites', () => {
    const ast = parse(`//@version=6
indicator("closure history na")
global = 0.0
global := nz(global[1]) + close
accumulate(series float source) =>
    local = 0.0
    local := nz(local[1]) + source
    local
plot(global, "Global")
plot(accumulate(close), "UDF")`);
    const compiled = tryCompileClosure(ast);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const closureResult = executeClosure(compiled, bars);
    const interpreterResult = executeScript(ast, bars);

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.plots.map((plot) => plot.values)).toEqual(interpreterResult.plots.map((plot) => plot.values));
    expect(closureResult.plots[1]?.values.slice(0, 3)).toEqual([10, 21, 33]);
  });

  it('binds non-identifier expression history as call-site series', () => {
    const ast = parse(`//@version=6
indicator("closure expression history")
rangeHigh = ta.highest(high, 2)[1]
spread = (close - open)[1]
plot(rangeHigh, "Previous Range High")
plot(spread, "Previous Spread")`);
    const compiled = tryCompileClosure(ast);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const closureResult = executeClosure(compiled, bars);
    const interpreterResult = executeScript(ast, bars);

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.errors).toEqual([]);
    expect(closureResult.plots.map((plot) => plot.values)).toEqual(interpreterResult.plots.map((plot) => plot.values));
    expect(closureResult.plots[0]?.values[2]).toBe(Math.max(bars[0]!.high, bars[1]!.high));
    expect(closureResult.plots[1]?.values[2]).toBe(bars[1]!.close - bars[1]!.open);
  });

  it('does not halt historical execution when a normal statement returns true', () => {
    const ast = parse(`//@version=6
indicator("closure no boolean halt")
plotshape(close > close[1], title="Up")
plot(close, "Close")`);
    const compiled = tryCompileClosure(ast);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const closureResult = executeClosure(compiled, bars);
    const interpreterResult = executeScript(ast, bars);

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.plots.map((plot) => plot.values)).toEqual(interpreterResult.plots.map((plot) => plot.values));
    expect(closureResult.plots[1]?.values).toHaveLength(bars.length);
  });

  it('marks drawings created by persistent declarations', () => {
    const ast = parse(`//@version=6
indicator("closure persistent drawings", overlay=true)
var table stats = table.new(position.top_right, 1, 1)
var label marker = label.new(bar_index, close, "start")
if barstate.islast
    table.cell(stats, 0, 0, str.tostring(close))
    label.set_text(marker, "last")
plot(close)`);
    const compiled = tryCompileClosure(ast);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const closureResult = executeClosure(compiled, bars);
    const interpreterResult = executeScript(ast, bars);

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.drawings.map(({ id: _id, ...drawing }) => drawing)).toEqual(
      interpreterResult.drawings.map(({ id: _id, ...drawing }) => drawing),
    );
    expect(closureResult.drawings.map((drawing) => drawing.persistent)).toEqual([true, true]);
  });

  it('applies indicator declaration drawing limits', () => {
    const ast = parse(`//@version=6
indicator("closure drawing limits", overlay=true, max_labels_count=120)
label.new(bar_index, close, str.tostring(bar_index))
plot(close)`);
    const manyBars = makeBars(Array.from({ length: 80 }, (_entry, index) => 100 + index));
    const compiled = tryCompileClosure(ast);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const closureResult = executeClosure(compiled, manyBars);
    const interpreterResult = executeScript(ast, manyBars);

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.drawings).toHaveLength(80);
    expect(closureResult.drawings.map(({ id: _id, ...drawing }) => drawing)).toEqual(
      interpreterResult.drawings.map(({ id: _id, ...drawing }) => drawing),
    );
  });

  it('normalizes built-in bar_index history for drawing coordinates', () => {
    const ast = parse(`//@version=6
indicator("closure drawing bar index history", overlay=true)
if bar_index > 0 and barstate.islast
    label.new(bar_index[1], close, "previous")
    line.new(bar_index[1], low, bar_index, high)
plot(close)`);
    const compiled = tryCompileClosure(ast);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const closureResult = executeClosure(compiled, bars);
    const interpreterResult = executeScript(ast, bars);

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.drawings.map(({ id: _id, ...drawing }) => drawing)).toEqual(
      interpreterResult.drawings.map(({ id: _id, ...drawing }) => drawing),
    );
    expect(closureResult.drawings[0]).toMatchObject({ x: bars.length - 2, xloc: 'bar_index' });
    expect(closureResult.drawings[1]).toMatchObject({ x1: bars.length - 2, x2: bars.length - 1, xloc: 'bar_index' });
  });

  it('honors realtime reconstruction hints for last-bar drawing constructors', () => {
    const ast = parse(`//@version=6
indicator("closure realtime drawing phase", overlay=true)
if barstate.islast
    line.new(bar_index[1], low, bar_index, high)
plot(close)`);
    const compiled = tryCompileClosure(ast);
    const realtimeBars = makeBars([10, 11, 12, 13, 14]);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const interpreter = new TealscriptEngine();
    interpreter.execute(ast, realtimeBars.slice(0, 3));
    interpreter.updateBar(ast, realtimeBars[3]!);
    interpreter.updateBar(ast, realtimeBars[4]!);
    const interpreterResult = interpreter.getCurrentExecutionResult();

    const closureResult = executeClosure(compiled, realtimeBars, undefined, {
      confirmedRealtimeBarStartIndex: 3,
      confirmedRealtimeBarIndex: 3,
      realtimeLastBar: { isNew: true },
    });

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.drawings.map(({ id: _id, persistent: _persistent, ...drawing }) => drawing)).toEqual(
      interpreterResult.drawings.map(({ id: _id, persistent: _persistent, ...drawing }) => drawing),
    );
    expect(closureResult.drawings.map((drawing) => drawing.barIndex)).toEqual([2, 3, 4]);
  });

  it('honors default strategy realtime calculation during reconstruction', () => {
    const ast = parse(`//@version=6
strategy("closure default realtime strategy", calc_on_every_tick=false)
plot(close, "Close")
if barstate.isrealtime
    strategy.entry("Live", strategy.long, qty=1)`);
    const compiled = tryCompileClosure(ast);
    const realtimeBars = makeBars([10, 11, 12, 13, 14]);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const interpreter = new TealscriptEngine();
    interpreter.execute(ast, realtimeBars.slice(0, 3));
    interpreter.updateBar(ast, realtimeBars[3]!);
    interpreter.updateBar(ast, { ...realtimeBars[3]!, close: 13.5 });
    interpreter.updateBar(ast, realtimeBars[4]!);
    const interpreterResult = interpreter.getCurrentExecutionResult();
    const reconstructedBars = [...realtimeBars];
    reconstructedBars[3] = { ...realtimeBars[3]!, close: 13.5 };
    const closureResult = executeClosure(compiled, reconstructedBars, undefined, {
      confirmedRealtimeBarStartIndex: 3,
      confirmedRealtimeBarIndex: 3,
      realtimeLastBar: { isNew: true },
    });

    expect(closureResult.errors).toEqual([]);
    expect(closureResult.plots[0]?.values).toEqual(interpreterResult.plots[0]?.values);
    expect(closureResult.plots[0]?.values).toEqual([10, 11, 12, 13.5]);
    expect(closureResult.strategy.orders).toHaveLength(interpreterResult.strategy.orders.length);
  });

  it('marks assignment-created persistent drawing handles during realtime reconstruction', () => {
    const ast = parse(`//@version=6
indicator("closure realtime assigned drawings", overlay=true)
drawRange() =>
    var line range = na
    if barstate.islast
        if na(range)
            range := line.new(bar_index - 1, low, bar_index, high)
        else
            line.set_xy1(range, bar_index - 1, low)
            line.set_xy2(range, bar_index, high)
    line.get_y2(range)
plot(drawRange(), "Range Top")`);
    const compiled = tryCompileClosure(ast);
    const realtimeBars = makeBars([10, 11, 12, 13, 14]);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const interpreter = new TealscriptEngine();
    interpreter.execute(ast, realtimeBars.slice(0, 3));
    interpreter.updateBar(ast, realtimeBars[3]!);
    interpreter.updateBar(ast, { ...realtimeBars[3]!, high: realtimeBars[3]!.high + 2 });
    interpreter.updateBar(ast, realtimeBars[4]!);
    const interpreterResult = interpreter.getCurrentExecutionResult();

    const closureResult = executeClosure(compiled, realtimeBars, undefined, {
      confirmedRealtimeBarStartIndex: 3,
      confirmedRealtimeBarIndex: 3,
      realtimeLastBar: { isNew: true },
    });

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.drawings.map(({ id: _id, ...drawing }) => drawing)).toEqual(
      interpreterResult.drawings.map(({ id: _id, ...drawing }) => drawing),
    );
    expect(closureResult.drawings.map((drawing) => drawing.persistent)).toEqual([true]);
    expect(closureResult.plots[0]?.values.at(-1)).toBe(interpreterResult.plots[0]?.values.at(-1));
  });

  it('marks persistent UDT-contained drawing arrays during realtime reconstruction', () => {
    const ast = parse(`//@version=6
indicator("closure realtime UDT drawing arrays", overlay=true)
type DrawingBag
    line[] lines
var DrawingBag bag = DrawingBag.new(array.new_line())
if barstate.islast and barstate.isconfirmed and bar_index == 3
    ln = line.new(bar_index - 1, low, bar_index, high)
    array.push(bag.lines, ln)
plot(array.size(bag.lines), "Line Count")`);
    const compiled = tryCompileClosure(ast);
    const realtimeBars = makeBars([10, 11, 12, 13, 14]);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const interpreter = new TealscriptEngine();
    interpreter.execute(ast, realtimeBars.slice(0, 3));
    interpreter.updateBar(ast, realtimeBars[3]!);
    interpreter.updateBar(ast, realtimeBars[4]!);
    const interpreterResult = interpreter.getCurrentExecutionResult();

    const closureResult = executeClosure(compiled, realtimeBars, undefined, {
      confirmedRealtimeBarStartIndex: 3,
      confirmedRealtimeBarIndex: 3,
      realtimeLastBar: { isNew: true },
    });

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.drawings.map(({ id: _id, ...drawing }) => drawing)).toEqual(
      interpreterResult.drawings.map(({ id: _id, ...drawing }) => drawing),
    );
    expect(closureResult.drawings.map((drawing) => drawing.persistent)).toEqual([true]);
    expect(closureResult.plots[0]?.values.at(-1)).toBe(1);
  });

  it('marks persistent arrays of UDT drawing handles during realtime reconstruction', () => {
    const ast = parse(`//@version=6
indicator("closure realtime array UDT drawings", overlay=true)
type DrawingSlot
    line handle
var array<DrawingSlot> slots = array.new<DrawingSlot>()
if barstate.islast and barstate.isconfirmed and array.size(slots) == 0
    array.push(slots, DrawingSlot.new(line.new(bar_index - 1, low, bar_index, high)))
if barstate.islast and array.size(slots) > 0
    DrawingSlot slot = array.get(slots, 0)
    line.set_xy2(slot.handle, bar_index, high)
plot(array.size(slots), "Slot Count")`);
    const compiled = tryCompileClosure(ast);
    const realtimeBars = makeBars([10, 11, 12, 13, 14]);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const interpreter = new TealscriptEngine();
    interpreter.execute(ast, realtimeBars.slice(0, 3));
    interpreter.updateBar(ast, realtimeBars[3]!);
    interpreter.updateBar(ast, realtimeBars[4]!);
    const interpreterResult = interpreter.getCurrentExecutionResult();

    const closureResult = executeClosure(compiled, realtimeBars, undefined, {
      confirmedRealtimeBarStartIndex: 3,
      confirmedRealtimeBarIndex: 3,
      realtimeLastBar: { isNew: true },
    });

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.drawings.map(({ id: _id, ...drawing }) => drawing)).toEqual(
      interpreterResult.drawings.map(({ id: _id, ...drawing }) => drawing),
    );
    expect(closureResult.drawings.map((drawing) => drawing.persistent)).toEqual([true]);
    expect(closureResult.plots[0]?.values.at(-1)).toBe(1);
  });

  it('keeps repeated drawing constructors distinct on the same bar', () => {
    const ast = parse(`//@version=6
indicator("closure drawing identities", overlay=true)
var label[] labels = array.new<label>()
if barstate.islast
    for i = 0 to 1
        array.push(labels, label.new(bar_index + i, close, str.tostring(i)))
    for i = 0 to array.size(labels) - 1
        label.set_text(array.get(labels, i), "m" + str.tostring(i))
plot(close)`);
    const compiled = tryCompileClosure(ast);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const closureResult = executeClosure(compiled, bars);
    const interpreterResult = executeScript(ast, bars);

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(new Set(closureResult.drawings.map((drawing) => drawing.id)).size).toBe(2);
    expect(closureResult.drawings.map((drawing) => drawing.id)).toEqual(
      interpreterResult.drawings.map((drawing) => drawing.id),
    );
    expect(closureResult.drawings.map(({ id: _id, ...drawing }) => drawing)).toEqual(
      interpreterResult.drawings.map(({ id: _id, ...drawing }) => drawing),
    );
  });

  it('uses runtime call ids for visual fallback titles', () => {
    const ast = parse(`//@version=6
indicator("closure visual call ids")
barcolor(close > open ? color.green : color.red)
barcolor(close > close[1] ? color.blue : na)
plotbar(open, high, low, close)
plotcandle(open + 1, high + 1, low + 1, close + 1)
plot(close, "Close")`);
    const compiled = tryCompileClosure(ast);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const closureResult = executeClosure(compiled, bars);
    const interpreterResult = executeScript(ast, bars);

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.plots.map((plot) => ({ title: plot.title, type: plot.type }))).toEqual(
      interpreterResult.plots.map((plot) => ({ title: plot.title, type: plot.type })),
    );
    expect(closureResult.plots.map((plot) => plot.values)).toEqual(interpreterResult.plots.map((plot) => plot.values));
    expect(closureResult.plots.map((plot) => plot.title)).toEqual([
      'barcolor_0',
      'barcolor_1',
      'plotbar_0',
      'plotcandle_0',
      'Close',
    ]);
  });

  it('binds runtime metadata members with interpreter parity', () => {
    const ast = parse(`//@version=6
indicator("closure metadata")
plot(str.length(syminfo.ticker), "Ticker")
plot(str.length(syminfo.tickerid), "Ticker ID")
plot(str.length(syminfo.session), "Session")
plot(syminfo.mintick * syminfo.pricescale, "Minmove")
plot(timeframe.multiplier, "Multiplier")
plot(timeframe.isminutes ? 1 : 0, "Is Minutes")
plot(str.length(chart.fg_color), "FG")
plot(barstate.isfirst ? 1 : 0, "First")
plot(n, "Legacy N")
plot(str.length(tickerid), "Legacy Ticker ID")
modifiedTicker = ticker.modify("BIST:A1CAP", session=session.extended)
plot(syminfo.prefix(modifiedTicker) == "BIST" ? 1 : 0, "Prefix Function")
plot(syminfo.ticker(symbol=modifiedTicker) == "A1CAP" ? 1 : 0, "Ticker Function")`);
    const options = {
      runtime: {
        symbol: 'NASDAQ:AAPL',
        syminfo: {
          ticker: 'NASDAQ:AAPL',
          tickerid: 'NASDAQ:AAPL',
          session: 'extended',
          mintick: 0.01,
          pricescale: 100,
        },
        timeframe: {
          period: '15',
          multiplier: 15,
          isminutes: true,
        },
        chart: {
          fgColor: '#111111',
        },
      },
    };
    const compiled = tryCompileClosure(ast, options);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const closureResult = executeClosure(compiled, bars, undefined, options);
    const interpreterResult = executeScript(ast, bars, undefined, options);

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.plots.map((plot) => plot.values)).toEqual(interpreterResult.plots.map((plot) => plot.values));
    expect(closureResult.plots.at(-2)?.values).toEqual(bars.map(() => 1));
    expect(closureResult.plots.at(-1)?.values).toEqual(bars.map(() => 1));
  });

  it('binds runtime time identifiers with historical offsets', () => {
    const ast = parse(`//@version=6
indicator("closure runtime time identifiers")
rightEdge = timenow + (time_close - time)
stableNow = timenow[1] == timenow ? 1 : 0
lastLoaded = last_bar_time >= time ? 1 : 0
plot(rightEdge, "Right Edge")
plot(stableNow, "Stable Now")
plot(time_tradingday <= time ? 1 : 0, "Trading Day")
plot(lastLoaded, "Last Loaded")`);
    const compiled = tryCompileClosure(ast, {
      runtime: {
        now: bars.at(-1)!.time + 30_000,
      },
    });

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const options = {
      runtime: {
        now: bars.at(-1)!.time + 30_000,
      },
    };
    const closureResult = executeClosure(compiled, bars, undefined, options);
    const interpreterResult = executeScript(ast, bars, undefined, options);

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.plots.map((plot) => plot.values)).toEqual(interpreterResult.plots.map((plot) => plot.values));
    expect(closureResult.plots[0]?.values.every((value) => typeof value === 'number')).toBe(true);
  });

  it('binds legacy bare input type constants', () => {
    const ast = parse(`//@version=3
study("closure legacy input types")
neg = input(title="Negative", type=float, defval=-0.5, step=0.1)
tf = input("30", "Resolution", type=resolution)
sess = input("regular", "Session", type=session)
sym = input("NASDAQ:AAPL", "Symbol", type=symbol)
plot(neg + str.length(tf) + str.length(sess) + str.length(sym), "Lengths")`);
    const compiled = tryCompileClosure(ast);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const closureResult = executeClosure(compiled, bars);
    const interpreterResult = executeScript(ast, bars);

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.errors).toEqual([]);
    expect(closureResult.plots.map((plot) => plot.values)).toEqual(interpreterResult.plots.map((plot) => plot.values));
    expect(closureResult.plots[0]?.values[0]).toBe(-0.5 + '30'.length + 'regular'.length + 'NASDAQ:AAPL'.length);
  });

  it('binds legacy ticker helper calls through the ticker namespace builtins', () => {
    const ast = parse(`//@version=4
study("closure legacy ticker helpers")
base = tickerid("NASDAQ", "AAPL", session.extended)
ha = heikinashi(base)
renkoTicker = renko(base, "ATR", 10)
lineBreakTicker = linebreak(base, 3)
kagiTicker = kagi(base, "ATR", 2)
pnfTicker = pointfigure(base, "hl", "ATR", 14, 3)
plot(str.length(base), "Base")
plot(str.contains(ha, "chart=heikinashi") ? 1 : 0, "HA")
plot(str.contains(renkoTicker, "chart=renko") ? 1 : 0, "Renko")
plot(str.contains(lineBreakTicker, "chart=linebreak") ? 1 : 0, "Linebreak")
plot(str.contains(kagiTicker, "chart=kagi") ? 1 : 0, "Kagi")
plot(str.contains(pnfTicker, "chart=pointfigure") ? 1 : 0, "PNF")`);
    const compiled = tryCompileClosure(ast);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const closureResult = executeClosure(compiled, bars);
    const interpreterResult = executeScript(ast, bars);

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.plots.map((plot) => plot.values)).toEqual(interpreterResult.plots.map((plot) => plot.values));
  });

  it('binds keyed, condition-only, and block-arm switch expressions', () => {
    const ast = parse(`//@version=6
indicator("closure switch")
mode = close > 12 ? "fast" : "slow"
keyed = switch mode
    "fast" => close + 10
    "slow" => close - 10
    => 0
conditionOnly = switch
    close > 13 => 3
    close > 11 => 2
    => 1
blockArm = switch mode
    "fast" =>
        bonus = close + high
        bonus
    => low
plot(keyed, "Keyed")
plot(conditionOnly, "Condition")
plot(blockArm, "Block")`);
    const compiled = tryCompileClosure(ast);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const closureResult = executeClosure(compiled, bars);
    const interpreterResult = executeScript(ast, bars);

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.plots.map((plot) => plot.values)).toEqual(interpreterResult.plots.map((plot) => plot.values));
  });

  it('binds UDT constructors, field defaults, field reads, and enum values', () => {
    const ast = parse(`//@version=6
indicator("closure udt")
enum Direction
    up = "Up"
    down = "Down"
type Settings
    float length = 2.0
    string label = "base"
    Direction direction = Direction.up
first = Settings.new(close - open, "first", Direction.up)
second = Settings.new(length=open - low, label="second", direction=Direction.down)
defaulted = Settings.new()
plot(first.length + second.length, "Lengths")
plot(str.length(first.label) + str.length(second.label), "Labels")
plot(first.direction == Direction.up ? 1 : 0, "Enum A")
plot(second.direction == Direction.down ? 1 : 0, "Enum B")
plot(defaulted.length, "Default Float")`);
    const compiled = tryCompileClosure(ast);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const closureResult = executeClosure(compiled, bars);
    const interpreterResult = executeScript(ast, bars);

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.plots.map((plot) => plot.values)).toEqual(interpreterResult.plots.map((plot) => plot.values));
  });

  it('binds user methods before receiver builtin methods', () => {
    const ast = parse(`//@version=6
indicator("closure methods")
type Acc
    float[] seen = array.new_float()

method add(Acc this, float value) =>
    this.seen.push(value)
    value + this.seen.size()

acc = Acc.new()
plot(acc.add(close), "Method")
plot(acc.seen.size(), "Size")`);
    const compiled = tryCompileClosure(ast);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const closureResult = executeClosure(compiled, bars);
    const interpreterResult = executeScript(ast, bars);

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.plots.map((plot) => plot.values)).toEqual(interpreterResult.plots.map((plot) => plot.values));
  });

  it('binds drawing object method calls through builtin drawing namespaces', () => {
    const ast = parse(`//@version=6
indicator("closure drawing methods", overlay=true)
if barstate.islast
    keepLine = line.new(bar_index - 1, close[1], bar_index, close)
    dropLine = line.new(bar_index - 1, high[1], bar_index, high)
    dropLine.delete()
    keepLabel = label.new(bar_index, close, text="keep")
    dropLabel = label.new(bar_index, high, text="drop")
    dropLabel.delete()
plot(array.size(line.all), "Lines")
plot(array.size(label.all), "Labels")`);
    const compiled = tryCompileClosure(ast);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const closureResult = executeClosure(compiled, bars);
    const interpreterResult = executeScript(ast, bars);

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.errors).toEqual([]);
    expect(closureResult.plots.map((plot) => plot.values)).toEqual(interpreterResult.plots.map((plot) => plot.values));
    expect(closureResult.drawings).toEqual(interpreterResult.drawings);
  });

  it('binds UDT field assignment and array index assignment', () => {
    const ast = parse(`//@version=6
indicator("closure assignment targets")
type State
    float value = 0.0
    float[] values = array.new_float(2, 0.0)

state = State.new()
local = array.new_float(2, 0.0)
state.value := close
state.values[0] := close
local[1] += high
plot(state.value, "Field")
plot(state.values[0], "Field Array")
plot(local[1], "Local Array")`);
    const compiled = tryCompileClosure(ast);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const closureResult = executeClosure(compiled, bars);
    const interpreterResult = executeScript(ast, bars);

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.plots.map((plot) => plot.values)).toEqual(interpreterResult.plots.map((plot) => plot.values));
  });

  it('binds if expressions in declarations and assignments', () => {
    const ast = parse(`//@version=6
indicator("closure if expressions")
value = if close > open
    step = close - open
    close + step
else
    low
next = 0.0
next := if close > high[1]
    close
else
    open
plot(value, "Declared")
plot(next, "Assigned")`);
    const compiled = tryCompileClosure(ast);

    expect(compiled).toMatchObject({ success: true, unsupported: [] });

    const closureResult = executeClosure(compiled, bars);
    const interpreterResult = executeScript(ast, bars);

    expect(closureResult.profile.executionMode).toBe('closure');
    expect(closureResult.plots.map((plot) => plot.values)).toEqual(interpreterResult.plots.map((plot) => plot.values));
  });

  it('keeps duplicate visual output titles distinct across backends', () => {
    const ast = parse(`//@version=6
indicator("duplicate visual titles")
plotcandle(open, high, low, close, title="Same")
plotcandle(open + 1, high + 1, low + 1, close + 1, title="Same")
plotshape(false, title="Signal", text="hidden")
plotshape(true, title="Signal", text="shown")`);
    const compiled = tryCompile(ast);
    const closureCompiled = tryCompileClosure(ast);

    expect(compiled).toMatchObject({ success: true });
    expect(closureCompiled).toMatchObject({ success: true, unsupported: [] });

    const compiledResult = executeCompiled(compiled, bars);
    const closureResult = executeClosure(closureCompiled, bars);
    const interpreterResult = executeScript(ast, bars);
    const summarize = (result: NonNullable<typeof compiledResult>) => result.plots.map((plot) => ({
      title: plot.title,
      type: plot.type,
      values: plot.values,
      textValues: plot.textValues,
    }));

    expect(compiledResult).not.toBeNull();
    expect(summarize(interpreterResult)).toEqual(summarize(compiledResult!));
    expect(summarize(closureResult)).toEqual(summarize(compiledResult!));
    expect(new Set(compiledResult!.plots.map((plot) => plot.id)).size).toBe(4);
    expect(new Set(interpreterResult.plots.map((plot) => plot.id)).size).toBe(4);
    expect(new Set(closureResult.plots.map((plot) => plot.id)).size).toBe(4);
    expect(compiledResult!.plots.map((plot) => ({ title: plot.title, type: plot.type }))).toEqual([
      { title: 'Same', type: 'plotcandle' },
      { title: 'Same', type: 'plotcandle' },
      { title: 'Signal', type: 'plotshape' },
      { title: 'Signal', type: 'plotshape' },
    ]);
  });
});
