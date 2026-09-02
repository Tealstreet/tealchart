import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import type { Bar, ExecutionResult } from '../../src/runtime';
import { executeScript } from '../../src/runtime';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import {
  addExpectedValueProvenanceCount,
  assertExpectedValueProvenanceDeclared,
  countExpectedPlotValues,
  emptyExpectedValueProvenanceCounts,
  type ExpectedValueProvenanceDeclaration,
  type ExpectedValueProvenanceCounts,
} from './behaviorProvenance';
import { getPlot, roundSeries } from './fixtures';

type ExpectedSeries = Array<number | null>;

const strategyValueBars: Bar[] = [100, 110, 105, 101, 108, 108, 106, 104].map((close, index) => ({
  time: (index + 1) * 60_000,
  open: close,
  high: close + 2,
  low: close - 2,
  close,
  volume: 1_000 + index,
}));

const deterministicLedgerSource = `//@version=6
strategy("Strategy values", process_orders_on_close=true, initial_capital=1000)
if bar_index == 0
    strategy.entry("Win", strategy.long, qty=2, comment="win-entry")
if bar_index == 1
    strategy.close("Win", comment="win-exit")
if bar_index == 2
    strategy.entry("Loss", strategy.long, qty=1, comment="loss-entry")
if bar_index == 3
    strategy.close("Loss", comment="loss-exit")
if bar_index == 4
    strategy.entry("Even", strategy.long, qty=1, comment="even-entry")
if bar_index == 5
    strategy.close("Even", comment="even-exit")
if bar_index == 6
    strategy.entry("Open", strategy.short, qty=3, comment="open-entry")
`;

const aggregateSource = `${deterministicLedgerSource}
plot(strategy.position_size, "Position Size")
plot(strategy.position_avg_price, "Average Price")
plot(strategy.netprofit, "Net Profit")
plot(strategy.openprofit, "Open Profit")
plot(strategy.grossprofit, "Gross Profit")
plot(strategy.grossloss, "Gross Loss")
plot(strategy.wintrades, "Win Trades")
plot(strategy.losstrades, "Loss Trades")
plot(strategy.eventrades, "Even Trades")
plot(strategy.opentrades, "Open Trades")
plot(strategy.closedtrades, "Closed Trades")
`;

const accessorSource = `${deterministicLedgerSource}
closedIdx = strategy.closedtrades - 1
hasClosed = strategy.closedtrades > 0
plot(hasClosed ? strategy.closedtrades.entry_price(closedIdx) : na, "Closed Entry")
plot(hasClosed ? strategy.closedtrades.exit_price(closedIdx) : na, "Closed Exit")
plot(hasClosed ? strategy.closedtrades.profit(closedIdx) : na, "Closed Profit")
plot(hasClosed ? strategy.closedtrades.size(closedIdx) : na, "Closed Size")
plot(hasClosed ? strategy.closedtrades.entry_bar_index(closedIdx) : na, "Closed Entry Bar")
plot(hasClosed ? strategy.closedtrades.exit_bar_index(closedIdx) : na, "Closed Exit Bar")
plot(hasClosed ? strategy.closedtrades.entry_time(closedIdx) : na, "Closed Entry Time")
plot(hasClosed ? strategy.closedtrades.exit_time(closedIdx) : na, "Closed Exit Time")
plot(hasClosed ? strategy.closedtrades.max_runup(closedIdx) : na, "Closed Runup")
plot(hasClosed ? strategy.closedtrades.max_drawdown(closedIdx) : na, "Closed Drawdown")
plot(strategy.opentrades > 0 ? strategy.opentrades.entry_price(0) : na, "Open Entry")
plot(strategy.opentrades > 0 ? strategy.opentrades.profit(0) : na, "Open Profit")
plot(strategy.opentrades > 0 ? strategy.opentrades.size(0) : na, "Open Size")
plot(strategy.opentrades > 0 ? strategy.opentrades.entry_bar_index(0) : na, "Open Entry Bar")
plot(strategy.opentrades > 0 ? strategy.opentrades.entry_time(0) : na, "Open Entry Time")
plot(strategy.opentrades > 0 ? strategy.opentrades.max_runup(0) : na, "Open Runup")
plot(strategy.opentrades > 0 ? strategy.opentrades.max_drawdown(0) : na, "Open Drawdown")
plot(strategy.opentrades > 0 ? strategy.opentrades.capital_held : na, "Capital Held")
plot(strategy.closedtrades.first_index, "First Closed Index")
`;

const aggregateExpectedPlots: Record<string, ExpectedSeries> = {
  'Position Size': [2, 0, 1, 0, 1, 0, -3, -3],
  'Average Price': [100, null, 105, null, 108, null, 106, 106],
  'Net Profit': [0, 20, 20, 16, 16, 16, 16, 16],
  'Open Profit': [0, 0, 0, 0, 0, 0, 0, 6],
  'Gross Profit': [0, 20, 20, 20, 20, 20, 20, 20],
  'Gross Loss': [0, 0, 0, -4, -4, -4, -4, -4],
  'Win Trades': [0, 1, 1, 1, 1, 1, 1, 1],
  'Loss Trades': [0, 0, 0, 1, 1, 1, 1, 1],
  'Even Trades': [0, 0, 0, 0, 0, 1, 1, 1],
  'Open Trades': [1, 0, 1, 0, 1, 0, 1, 1],
  'Closed Trades': [0, 1, 1, 2, 2, 3, 3, 3],
};

const accessorExpectedPlots: Record<string, ExpectedSeries> = {
  'Closed Entry': [null, 100, 100, 105, 105, 108, 108, 108],
  'Closed Exit': [null, 110, 110, 101, 101, 108, 108, 108],
  'Closed Profit': [null, 20, 20, -4, -4, 0, 0, 0],
  'Closed Size': [null, 2, 2, 1, 1, 1, 1, 1],
  'Closed Entry Bar': [null, 0, 0, 2, 2, 4, 4, 4],
  'Closed Exit Bar': [null, 1, 1, 3, 3, 5, 5, 5],
  'Closed Entry Time': [null, 60_000, 60_000, 180_000, 180_000, 300_000, 300_000, 300_000],
  'Closed Exit Time': [null, 120_000, 120_000, 240_000, 240_000, 360_000, 360_000, 360_000],
  'Closed Runup': [null, 24, 24, 0, 0, 2, 2, 2],
  'Closed Drawdown': [null, 0, 0, 6, 6, 2, 2, 2],
  'Open Entry': [100, null, 105, null, 108, null, 106, 106],
  'Open Profit': [0, null, 0, null, 0, null, 0, 6],
  'Open Size': [2, null, 1, null, 1, null, -3, -3],
  'Open Entry Bar': [0, null, 2, null, 4, null, 6, 6],
  'Open Entry Time': [60_000, null, 180_000, null, 300_000, null, 420_000, 420_000],
  'Open Runup': [0, null, 0, null, 0, null, 0, 12],
  'Open Drawdown': [0, null, 0, null, 0, null, 0, 0],
  'Capital Held': [200, null, 105, null, 108, null, 318, 318],
  'First Closed Index': [null, 0, 0, 0, 0, 0, 0, 0],
};

const strategyValueProvenance: ExpectedValueProvenanceDeclaration = {
  expectedValueProvenance: 'independently-derived',
  expectedValueProvenanceNote:
    'Calculated outside TealScript from Pine v6 order sizing, close-fill, profit, and open/closed-trade accessor semantics on strategyValueBars.',
};

const finalLedgerExpectedValueCount = 34;

function compileAndRun(source: string): ExecutionResult {
  const ast = parse(source);
  const compiled = tryCompile(ast);
  if (!compiled.success) {
    throw new Error(`Compilation failed for strategy value behavior script: ${compiled.unsupported.join(', ')}`);
  }

  const result = executeCompiled(compiled, strategyValueBars);
  if (!result) {
    throw new Error('Compiled strategy value behavior script returned null');
  }
  return result;
}

function runBoth(source: string): { interpreted: ExecutionResult; compiled: ExecutionResult } {
  const interpreted = executeScript(parse(source), strategyValueBars);
  const compiled = compileAndRun(source);
  expect(interpreted.errors).toEqual([]);
  expect(compiled.errors).toEqual([]);
  return { interpreted, compiled };
}

function expectExpectedPlots(result: ExecutionResult, expectedPlots: Record<string, ExpectedSeries>): void {
  for (const [title, expected] of Object.entries(expectedPlots)) {
    expect(normalizeSeries(roundSeries(getPlot(result, title).values))).toEqual(expected);
  }
}

function expectPlotParity(left: ExecutionResult, right: ExecutionResult): void {
  expect(left.plots.map((plot) => plot.title)).toEqual(right.plots.map((plot) => plot.title));
  for (let index = 0; index < left.plots.length; index++) {
    expect(normalizeSeries(roundSeries(left.plots[index]!.values))).toEqual(normalizeSeries(roundSeries(right.plots[index]!.values)));
  }
}

function normalizeSeries(values: ExpectedSeries): ExpectedSeries {
  return values.map((value) => Object.is(value, -0) ? 0 : value);
}

function expectedValueProvenanceCounts(): ExpectedValueProvenanceCounts {
  assertExpectedValueProvenanceDeclared(strategyValueProvenance);

  const counts = emptyExpectedValueProvenanceCounts();
  addExpectedValueProvenanceCount(
    counts,
    strategyValueProvenance.expectedValueProvenance,
    countExpectedPlotValues(aggregateExpectedPlots) + countExpectedPlotValues(accessorExpectedPlots) + finalLedgerExpectedValueCount,
  );
  return counts;
}

describe('Pine v6 strategy value behavior', () => {
  it('declares provenance for every literal expected value', () => {
    expect(expectedValueProvenanceCounts()).toEqual({
      'independently-derived': 274,
      'published-worked-example': 0,
      'tealscript-regression-pin': 0,
    });
  });

  it('matches fixed aggregate position and profit readouts on both runtimes', () => {
    const { interpreted, compiled } = runBoth(aggregateSource);

    expectExpectedPlots(interpreted, aggregateExpectedPlots);
    expectExpectedPlots(compiled, aggregateExpectedPlots);
    expectPlotParity(compiled, interpreted);
  });

  it('matches fixed open and closed trade accessor readouts on both runtimes', () => {
    const { interpreted, compiled } = runBoth(accessorSource);

    expectExpectedPlots(interpreted, accessorExpectedPlots);
    expectExpectedPlots(compiled, accessorExpectedPlots);
    expectPlotParity(compiled, interpreted);

    expect(compiled.strategy.openTrades).toEqual(interpreted.strategy.openTrades);
    expect(compiled.strategy.closedTrades).toEqual(interpreted.strategy.closedTrades);
    expect(compiled.strategy.openTrades[0]).toMatchObject({
      entryOrderId: 'Open',
      entryComment: 'open-entry',
      direction: 'short',
      qty: 3,
      entryPrice: 106,
      entryBarIndex: 6,
      entryTime: 420_000,
      profit: 6,
      maxRunup: 12,
      maxDrawdown: 0,
    });
    expect(compiled.strategy.closedTrades).toMatchObject([
      {
        entryOrderId: 'Win',
        exitOrderId: 'Close Win',
        entryComment: 'win-entry',
        exitComment: 'win-exit',
        direction: 'long',
        qty: 2,
        entryPrice: 100,
        exitPrice: 110,
        profit: 20,
      },
      {
        entryOrderId: 'Loss',
        exitOrderId: 'Close Loss',
        entryComment: 'loss-entry',
        exitComment: 'loss-exit',
        direction: 'long',
        qty: 1,
        entryPrice: 105,
        exitPrice: 101,
        profit: -4,
      },
      {
        entryOrderId: 'Even',
        exitOrderId: 'Close Even',
        entryComment: 'even-entry',
        exitComment: 'even-exit',
        direction: 'long',
        qty: 1,
        entryPrice: 108,
        exitPrice: 108,
        profit: 0,
      },
    ]);
  });
});
