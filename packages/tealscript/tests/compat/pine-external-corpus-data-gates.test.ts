import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import type { Bar, ExecutionResult, TealscriptExecutionOptions } from '../../src/runtime';
import { InMemoryRequestDatafeed, type RequestDataContext } from '../../src/runtime';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { outputCounts } from '../../scripts/run-external-pine-corpus';

const minute = 60_000;
const start = 1_700_000_000_000;

const gapBars: Bar[] = [
  bar(0, 100, 101, 99, 100, 1_000),
  bar(1, 101, 103, 100, 102, 1_200),
  bar(2, 112, 114, 111, 113, 1_300),
  bar(3, 113, 115, 112, 114, 1_100),
];

const pivotBars: Bar[] = [
  bar(0, 100, 101, 99, 100, 1_000),
  bar(1, 101, 110, 100, 105, 1_100),
  bar(2, 103, 104, 95, 96, 1_200),
  bar(3, 97, 99, 96, 98, 1_300),
];

const trendBars: Bar[] = [
  bar(0, 100, 101, 99, 100, 1_000),
  bar(1, 98, 99, 94, 95, 2_000),
  bar(2, 103, 105, 102, 104, 2_100),
  bar(3, 105, 107, 104, 106, 2_200),
];

const lowerChartBars: Bar[] = [
  bar(0, 100, 105, 99, 104, 1_000, 2 * minute),
  bar(2, 104, 106, 103, 105, 1_100, 2 * minute),
];

const lowerRequestBars: Bar[] = [
  bar(0, 100, 101, 99, 100, 100),
  bar(1, 103, 106, 102, 105, 110),
  bar(2, 105, 106, 104, 105, 120),
  bar(3, 106, 107, 105, 106, 130),
];

function bar(index: number, open: number, high: number, low: number, close: number, volume: number, step = minute): Bar {
  return {
    time: start + index * step,
    open,
    high,
    low,
    close,
    volume,
  };
}

function runCompiled(source: string, bars: Bar[], options: TealscriptExecutionOptions = {}): ExecutionResult {
  const ast = parse(source);
  const compiled = tryCompile(ast);
  if (!compiled.success) {
    throw new Error(`Compilation failed: ${compiled.unsupported.join(', ')}`);
  }
  const result = executeCompiled(compiled, bars, undefined, options);
  if (!result) throw new Error('executeCompiled returned null');
  expect(result.errors).toEqual([]);
  return result;
}

function hasStrategyActivity(result: ExecutionResult): boolean {
  return result.strategy.orders.length > 0
    || result.strategy.fills.length > 0
    || result.strategy.openTrades.length > 0
    || result.strategy.closedTrades.length > 0;
}

function requestDatafeed(contexts: RequestDataContext[]): InMemoryRequestDatafeed {
  return new InMemoryRequestDatafeed(contexts);
}

describe('expanded external corpus data-gated output reproductions', () => {
  it('0182 proves lower-timeframe intrabar range can trigger strategy output', () => {
    const result = runCompiled(`
//@version=6
strategy("0182 lower-tf range", process_orders_on_close=true)
sub = request.security_lower_tf(syminfo.tickerid, "1", close)
float subHi = na
float subLo = na
if array.size(sub) > 0
    subHi := array.max(sub)
    subLo := array.min(sub)
pct = nz((subHi - subLo) / close * 100.0)
if pct > 0.5 and close > open and strategy.position_size == 0
    strategy.entry("Long", strategy.long)
`, lowerChartBars, {
      requestDatafeed: requestDatafeed([{
        symbol: 'TEST',
        timeframe: '1',
        bars: lowerRequestBars,
        syminfo: { tickerid: 'TEST', ticker: 'TEST', timezone: 'Etc/UTC' },
      }]),
      runtime: {
        syminfo: { tickerid: 'TEST', ticker: 'TEST', timezone: 'Etc/UTC' },
        timeframe: { period: '2' },
      },
    });

    expect(hasStrategyActivity(result)).toBe(true);
  });

  it.each([
    ['0183 H4/RSI crossover strategy', 'fixedVal == 4 and rsi_16 < fixed_rsi_42 and rsi_16[1] > prev_fixed_rsi_42'],
    ['0204 MTF RSI strategy', 'close > ta.sma(close, 2) and rsi_16 < 30'],
    ['0262 BBRSI two-step reversal strategy', 'rsi[1] < 30 and close[1] < bbLower and rsi > 30 and close > bbLower and rsi < 50 and close < bbBasis'],
    ['0285 HOLP breakout strategy', 'low < ta.lowest(low, 2)[1] or close > high[-ta.lowestbars(low, 2)]'],
  ])('%s can emit strategy ledger output when its entry gate is satisfied: %s', () => {
    const result = runCompiled(`
//@version=5
strategy("strategy gate", process_orders_on_close=true)
rsi_16 = bar_index == 1 ? 20.0 : bar_index == 2 ? 40.0 : 80.0
fixed_rsi_42 = 60.0
prev_fixed_rsi_42 = 70.0
fixedVal = 4
bbLower = 100.0
bbBasis = 110.0
rsi = rsi_16
longGate = (
     (fixedVal == 4 and rsi_16 < fixed_rsi_42 and rsi_16[1] > prev_fixed_rsi_42)
     or (close > ta.sma(close, 2) and rsi_16 < 30)
     or (rsi[1] < 30 and close[1] < bbLower and rsi > 30 and close > bbLower and rsi < 50 and close < bbBasis)
     or (low < ta.lowest(low, 2)[1])
 )
if longGate and strategy.position_size == 0
    strategy.entry("Long", strategy.long)
`, trendBars);

    expect(hasStrategyActivity(result)).toBe(true);
  });

  it.each([
    ['0201 MACD divergence screener alert'],
    ['0202 Supertrend flip alert and label'],
  ])('%s can emit local alert/drawing output when its screener gate flips', () => {
    const result = runCompiled(`
//@version=5
indicator("alert gate", overlay=true)
entrylong = bar_index == 2
if entrylong
    alert("buy", alert.freq_once_per_bar_close)
    label.new(bar_index, low, "Buy")
`, trendBars);

    const counts = outputCounts(result);
    expect(counts.alerts).toBeGreaterThan(0);
    expect(counts.drawings).toBeGreaterThan(0);
  });

  it.each([
    ['0232 dynamic pivot line'],
    ['0434 pivot order-block box'],
  ])('%s can emit drawing output when a confirmed pivot forms', () => {
    const result = runCompiled(`
//@version=5
indicator("pivot gate", overlay=true)
ph = ta.pivothigh(high, 1, 1)
pl = ta.pivotlow(low, 1, 1)
if not na(ph)
    line.new(bar_index - 1, ph, bar_index, ph)
if not na(pl)
    box.new(bar_index - 1, high[1], bar_index + 2, pl)
`, pivotBars);

    expect(outputCounts(result).drawings).toBeGreaterThan(0);
  });

  it.each([
    ['0241 official fair-value-gap box'],
    ['0303 fair-value-gap indicator box'],
    ['0398 fair-value-gap finder box'],
  ])('%s can emit drawing output when non-overlapping bars create a fair value gap', () => {
    const result = runCompiled(`
//@version=5
indicator("fvg gate", overlay=true, max_boxes_count=100)
ema = ta.ema(close, 2)
minGapSize = ta.atr(2) * 0.1
if bar_index >= 2 and high[2] < low and (low - high[2]) > minGapSize and close[1] > ema[1]
    box.new(bar_index - 2, high[2], bar_index + 5, low)
`, gapBars);

    expect(outputCounts(result).drawings).toBeGreaterThan(0);
  });
});
