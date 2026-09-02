import { describe, expect, it } from 'vitest';

import { PINE_V6_REFERENCE_MANUAL_BUILTIN_INDEX } from '../../src/compat/pineV6ReferenceManualIndex';
import { parse } from '../../src/parser';
import { executeScript, type Bar, type ExecutionResult } from '../../src/runtime';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { getPlot, roundSeries } from './fixtures';

const inputBehaviorBars: Bar[] = [
  { time: 1_700_000_000_000, open: 10, high: 13, low: 9, close: 12, volume: 100 },
  { time: 1_700_000_060_000, open: 11, high: 15, low: 10, close: 14, volume: 110 },
  { time: 1_700_000_120_000, open: 12, high: 16, low: 11, close: 15, volume: 120 },
];

const officialInputNames = PINE_V6_REFERENCE_MANUAL_BUILTIN_INDEX.functions
  .filter((name) => name === 'input' || name.startsWith('input.'))
  .sort();

const coveredInputNames = [
  'input',
  'input.bool',
  'input.color',
  'input.enum',
  'input.float',
  'input.int',
  'input.price',
  'input.session',
  'input.source',
  'input.string',
  'input.symbol',
  'input.text_area',
  'input.time',
  'input.timeframe',
].sort();

const inputSurfaceSource = `//@version=6
indicator("Input behavior")
enum Direction
    long = "Long"
    short = "Short"

external = plot(open + close, title="External Source")
genericInt = input(3, "Generic Int", "Generic tooltip", "gen", "Inputs", display.data_window, true)
intRange = input.int(5, "Integer", minval=1, maxval=10, step=2, tooltip="Integer tooltip", inline="num", group="Inputs", confirm=true, display.status_line, active=true)
floatRange = input.float(1.5, "Float", minval=0.5, maxval=3.5, step=0.25)
boolValue = input.bool(true, "Enabled", confirm=true)
stringValue = input.string("EMA", "Mode", options=["SMA", "EMA"])
colorValue = input.color(color.rgb(10, 20, 30), "Tint")
sourceHlc3 = input.source(hlc3, "HLC3 Source")
sourceOhlc4 = input.source(ohlc4, "OHLC4 Source")
sourcePlot = input.source(close, "Plot Source")
tf = input.timeframe("60", "Timeframe", options=["15", "60"])
symbolValue = input.symbol("NASDAQ:AAPL", "Symbol")
sessionValue = input.session("0930-1600", "Session")
textValue = input.text_area("line one\\\\nline two", "Notes")
timeValue = input.time(1700000000000, "Start Time", confirm=true)
priceValue = input.price(101.25, "Level", confirm=true)
direction = input.enum(Direction.long, "Direction", options=[Direction.long, Direction.short])

plot(genericInt, title="Generic Int Value")
plot(intRange, title="Integer Value")
plot(floatRange, title="Float Value")
plot(boolValue ? 1 : 0, title="Bool Value")
plot(stringValue == "EMA" ? 1 : 0, title="String Value")
plot(color.r(colorValue), title="Color R")
plot(color.g(colorValue), title="Color G")
plot(color.b(colorValue), title="Color B")
plot(sourceHlc3, title="HLC3 Source Value")
plot(sourceOhlc4, title="OHLC4 Source Value")
plot(sourcePlot, title="Plot Source Value")
plot(tf == "60" ? 1 : 0, title="Timeframe Value")
plot(symbolValue == "NASDAQ:AAPL" ? 1 : 0, title="Symbol Value")
plot(sessionValue == "0930-1600" ? 1 : 0, title="Session Value")
plot(str.contains(textValue, "line two") ? 1 : 0, title="Text Value")
plot(timeValue, title="Time Value")
plot(priceValue, title="Price Value")
plot(direction == Direction.long ? 1 : 0, title="Enum Value")
`;

function runInterpreted(source: string, inputs?: Map<string, unknown>): ExecutionResult {
  return executeScript(parse(source), inputBehaviorBars, inputs);
}

function runCompiled(source: string, inputs?: Map<string, unknown>): ExecutionResult {
  const ast = parse(source);
  const compiled = tryCompile(ast);
  if (!compiled.success) {
    throw new Error(`Compilation failed: ${compiled.unsupported.join(', ')}`);
  }
  const result = executeCompiled(compiled, inputBehaviorBars, inputs);
  if (!result) {
    throw new Error('executeCompiled returned null');
  }
  return result;
}

function runBoth(source: string, inputs?: Map<string, unknown>): { interpreted: ExecutionResult; compiled: ExecutionResult } {
  return {
    interpreted: runInterpreted(source, inputs),
    compiled: runCompiled(source, inputs),
  };
}

function expectClean(result: ExecutionResult): void {
  expect(result.errors).toEqual([]);
}

function expectPlotValues(result: ExecutionResult, title: string, expected: Array<number | null>): void {
  expect(roundSeries(getPlot(result, title).values, 6)).toEqual(expected);
}

function expectErrorMessage(result: ExecutionResult, expected: string): void {
  expect(result.errors[0]?.message).toBe(expected);
}

describe('Pine v6 input behavior', () => {
  it('has behavior coverage for every official input function', () => {
    expect(coveredInputNames).toEqual(officialInputNames);
  });

  it('round-trips defaults, metadata, source selections, and overrides on both paths', () => {
    const inputs = new Map<string, unknown>([['input_Plot Source', 'External Source']]);
    const { interpreted, compiled } = runBoth(inputSurfaceSource, inputs);

    expectClean(interpreted);
    expectClean(compiled);

    for (const result of [interpreted, compiled]) {
      expect(result.inputs.map((input) => [input.type, input.title])).toEqual([
        ['int', 'Generic Int'],
        ['int', 'Integer'],
        ['float', 'Float'],
        ['bool', 'Enabled'],
        ['string', 'Mode'],
        ['color', 'Tint'],
        ['source', 'HLC3 Source'],
        ['source', 'OHLC4 Source'],
        ['source', 'Plot Source'],
        ['timeframe', 'Timeframe'],
        ['symbol', 'Symbol'],
        ['session', 'Session'],
        ['text_area', 'Notes'],
        ['time', 'Start Time'],
        ['price', 'Level'],
        ['enum', 'Direction'],
      ]);
      expect(result.inputs.find((input) => input.title === 'Integer')).toMatchObject({
        defval: 5,
        minval: 1,
        maxval: 10,
        step: 2,
        tooltip: 'Integer tooltip',
        inline: 'num',
        group: 'Inputs',
        confirm: true,
        display: 4,
        active: true,
      });
      expect(result.inputs.find((input) => input.title === 'Enabled')).toMatchObject({ confirm: true });
      expect(result.inputs.find((input) => input.title === 'Start Time')).toMatchObject({ confirm: true });
      expect(result.inputs.find((input) => input.title === 'Level')).toMatchObject({ confirm: true });

      expectPlotValues(result, 'Generic Int Value', [3, 3, 3]);
      expectPlotValues(result, 'Integer Value', [5, 5, 5]);
      expectPlotValues(result, 'Float Value', [1.5, 1.5, 1.5]);
      expectPlotValues(result, 'Bool Value', [1, 1, 1]);
      expectPlotValues(result, 'String Value', [1, 1, 1]);
      expectPlotValues(result, 'Color R', [10, 10, 10]);
      expectPlotValues(result, 'Color G', [20, 20, 20]);
      expectPlotValues(result, 'Color B', [30, 30, 30]);
      expectPlotValues(result, 'HLC3 Source Value', [11.333333, 13, 14]);
      expectPlotValues(result, 'OHLC4 Source Value', [11, 12.5, 13.5]);
      expectPlotValues(result, 'Plot Source Value', [22, 25, 27]);
      expectPlotValues(result, 'Timeframe Value', [1, 1, 1]);
      expectPlotValues(result, 'Symbol Value', [1, 1, 1]);
      expectPlotValues(result, 'Session Value', [1, 1, 1]);
      expectPlotValues(result, 'Text Value', [1, 1, 1]);
      expectPlotValues(result, 'Time Value', [1_700_000_000_000, 1_700_000_000_000, 1_700_000_000_000]);
      expectPlotValues(result, 'Price Value', [101.25, 101.25, 101.25]);
      expectPlotValues(result, 'Enum Value', [1, 1, 1]);
    }
  });

  it('treats step as widget increment metadata, not a clamping or validity grid', () => {
    const source = `//@version=6
indicator("Input step")
length = input.int(4, "Length", minval=1, maxval=9, step=2)
factor = input.float(1.3, "Factor", minval=0.5, maxval=2.0, step=0.25)
plot(length, title="Length")
plot(factor, title="Factor")`;
    const { interpreted, compiled } = runBoth(source);

    expectClean(interpreted);
    expectClean(compiled);
    expectPlotValues(interpreted, 'Length', [4, 4, 4]);
    expectPlotValues(compiled, 'Length', [4, 4, 4]);
    expectPlotValues(interpreted, 'Factor', [1.3, 1.3, 1.3]);
    expectPlotValues(compiled, 'Factor', [1.3, 1.3, 1.3]);
  });

  it('rejects defaults outside options and numeric ranges instead of clamping', () => {
    const cases = [
      {
        source: `//@version=6
indicator("Bad int options")
length = input.int(3, "Length", options=[1, 2])
plot(length)`,
        error: 'input.int defval must be one of options',
      },
      {
        source: `//@version=6
indicator("Bad string options")
mode = input.string("WMA", "Mode", options=["SMA", "EMA"])
plot(mode == "WMA" ? 1 : 0)`,
        error: 'input.string defval must be one of options',
      },
      {
        source: `//@version=6
indicator("Bad timeframe options")
tf = input.timeframe("240", "Timeframe", options=["15", "60"])
plot(tf == "240" ? 1 : 0)`,
        error: 'input.timeframe defval must be one of options',
      },
      {
        source: `//@version=6
indicator("Bad min")
length = input.int(0, "Length", minval=1)
plot(length)`,
        error: 'input.int defval must be greater than or equal to minval',
      },
      {
        source: `//@version=6
indicator("Bad max")
factor = input.float(11.0, "Factor", maxval=10.0)
plot(factor)`,
        error: 'input.float defval must be less than or equal to maxval',
      },
    ];

    for (const entry of cases) {
      const { interpreted, compiled } = runBoth(entry.source);
      expectErrorMessage(interpreted, entry.error);
      expectErrorMessage(compiled, entry.error);
    }
  });
});
