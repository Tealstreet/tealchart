import { describe, expect, it } from 'vitest';

import { PINE_V6_KNOWN_MISSING_BUILTINS } from '../../src/compat/pineV6BuiltinReference';
import { PINE_V6_REFERENCE_MANUAL_BUILTIN_INDEX } from '../../src/compat/pineV6ReferenceManualIndex';
import { parse } from '../../src/parser';
import type { Bar, ExecutionResult, TealscriptEngineOptions } from '../../src/runtime';
import { executeScript } from '../../src/runtime';
import { executeCompiled, type CompiledExecutionOptions, tryCompile } from '../../src/runtime/codegen/execute';
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

interface RuntimeMetadataCase extends ExpectedValueProvenanceDeclaration {
  name: string;
  covers: readonly string[];
  source: string;
  bars?: Bar[];
  options?: TealscriptEngineOptions & CompiledExecutionOptions;
  expectedPlots: Record<string, ExpectedSeries>;
}

const minuteBoundaryBars: Bar[] = [
  [Date.UTC(2023, 10, 14, 14, 29), 100],
  [Date.UTC(2023, 10, 14, 14, 30), 101],
  [Date.UTC(2023, 10, 14, 20, 59), 102],
  [Date.UTC(2023, 10, 14, 21, 0), 103],
  [Date.UTC(2023, 10, 15, 0, 59), 104],
  [Date.UTC(2023, 10, 15, 1, 0), 105],
].map(([time, close]) => ({
  time,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 1_000,
}));

const simpleBars: Bar[] = Array.from({ length: 4 }, (_, index) => ({
  time: Date.UTC(2024, 0, 2, 9, 30 + index),
  open: 100 + index,
  high: 101 + index,
  low: 99 + index,
  close: 100.5 + index,
  volume: 1_000 + index,
}));

const metadataOptions: TealscriptEngineOptions & CompiledExecutionOptions = {
  runtime: {
    syminfo: {
      ticker: 'AAPL',
      tickerid: 'NASDAQ:AAPL',
      root: 'AAPL',
      description: 'Apple Inc.',
      type: 'stock',
      prefix: 'NASDAQ',
      session: 'extended',
      country: 'US',
      sector: 'Technology',
      industry: 'Consumer Electronics',
      isin: 'US0378331005',
      current_contract: 'AAPL1!',
      currency: 'USD',
      basecurrency: '',
      mintick: 0.25,
      pricescale: 4,
      pointvalue: 50,
      mincontract: 0.1,
      volumetype: 'quote',
      expiration_date: 1_780_272_000_000,
      employees: 164_000,
      shareholders: 1_000,
      shares_outstanding_float: 1.5,
      shares_outstanding_total: 2.5,
      recommendations_date: 1_777_852_800_000,
      target_price_date: 1_777_852_800_000,
      target_price_average: 210.5,
      target_price_estimates: 42,
      target_price_high: 250,
      target_price_low: 180,
      target_price_median: 205,
      timezone: 'America/New_York',
    },
  },
};

const sessionOptions: TealscriptEngineOptions & CompiledExecutionOptions = {
  runtime: {
    syminfo: { timezone: 'America/New_York' },
    timeframe: {
      period: '1',
      multiplier: 1,
      isminutes: true,
      isdaily: false,
      isweekly: false,
      ismonthly: false,
      isintraday: true,
      isseconds: false,
      isticks: false,
    },
    session: {
      timezone: 'America/New_York',
      premarket: '0400-0930',
      regular: '0930-1600',
      postmarket: '1600-2000',
    },
  },
};

const allBars = (value: number | null, length = simpleBars.length): ExpectedSeries => Array(length).fill(value);

const implementedSyminfoNames = PINE_V6_REFERENCE_MANUAL_BUILTIN_INDEX.variables
  .filter((name) => name.startsWith('syminfo.'))
  .filter((name) => !PINE_V6_KNOWN_MISSING_BUILTINS.includes(name))
  .sort();

const chartMetadataNames = PINE_V6_REFERENCE_MANUAL_BUILTIN_INDEX.variables
  .filter((name) => name.startsWith('chart.'))
  .filter((name) => !name.startsWith('chart.point'))
  .sort();

const metadataCases: RuntimeMetadataCase[] = [
  {
    name: 'timeframe period parsing and flags',
    expectedValueProvenance: 'independently-derived',
    expectedValueProvenanceNote:
      'Calculated outside TealScript from Pine v6 timeframe period parsing, seconds conversion, and bucket-change semantics.',
    covers: [
      'timeframe.change',
      'timeframe.from_seconds',
      'timeframe.in_seconds',
      'timeframe.isdaily',
      'timeframe.isdwm',
      'timeframe.isintraday',
      'timeframe.isminutes',
      'timeframe.ismonthly',
      'timeframe.isseconds',
      'timeframe.isticks',
      'timeframe.isweekly',
      'timeframe.main_period',
      'timeframe.multiplier',
      'timeframe.period',
    ],
    source: `//@version=6
indicator("Timeframe metadata", timeframe="3M")
plot(timeframe.isdaily ? 1 : 0, "Daily")
plot(timeframe.isweekly ? 1 : 0, "Weekly")
plot(timeframe.ismonthly ? 1 : 0, "Monthly")
plot(timeframe.isdwm ? 1 : 0, "DWM")
plot(timeframe.isintraday ? 1 : 0, "Intraday")
plot(timeframe.isminutes ? 1 : 0, "Minutes")
plot(timeframe.isseconds ? 1 : 0, "Seconds")
plot(timeframe.isticks ? 1 : 0, "Ticks")
plot(timeframe.multiplier, "Multiplier")
plot(str.length(timeframe.period), "Period Length")
plot(str.length(timeframe.main_period), "Main Period Length")
plot(timeframe.in_seconds(), "Current Seconds")
plot(timeframe.in_seconds("45S"), "45S")
plot(timeframe.in_seconds("1440"), "1440")
plot(timeframe.in_seconds("2D"), "2D")
plot(timeframe.in_seconds("3W"), "3W")
plot(timeframe.in_seconds("12M"), "12M")
plot(timeframe.in_seconds("1H"), "Invalid Hour")
plot(timeframe.from_seconds(1) == "1S" ? 1 : 0, "From 1S")
plot(timeframe.from_seconds(46) == "1" ? 1 : 0, "From Rounded Minute")
plot(timeframe.from_seconds(604801) == "2W" ? 1 : 0, "From Rounded Week")
plot(timeframe.change("1D") ? 1 : 0, "Daily Change")
`,
    expectedPlots: {
      Daily: allBars(0),
      Weekly: allBars(0),
      Monthly: allBars(1),
      DWM: allBars(1),
      Intraday: allBars(0),
      Minutes: allBars(0),
      Seconds: allBars(0),
      Ticks: allBars(0),
      Multiplier: allBars(3),
      'Period Length': allBars(2),
      'Main Period Length': allBars(2),
      'Current Seconds': allBars(7_776_000),
      '45S': allBars(45),
      '1440': allBars(86_400),
      '2D': allBars(172_800),
      '3W': allBars(1_814_400),
      '12M': allBars(31_104_000),
      'Invalid Hour': allBars(null),
      'From 1S': allBars(1),
      'From Rounded Minute': allBars(1),
      'From Rounded Week': allBars(1),
      'Daily Change': [1, 0, 0, 0],
    },
  },
  {
    name: 'session constants, segment boundaries, and time filters',
    expectedValueProvenance: 'independently-derived',
    expectedValueProvenanceNote:
      'Calculated outside TealScript from Pine v6 session segment boundaries using the explicit America/New_York timezone.',
    covers: [
      'session.extended',
      'session.isfirstbar',
      'session.isfirstbar_regular',
      'session.islastbar',
      'session.islastbar_regular',
      'session.ismarket',
      'session.ispostmarket',
      'session.ispremarket',
      'session.regular',
    ],
    source: `//@version=6
indicator("Session metadata")
plot(session.ismarket ? 1 : 0, "Market")
plot(session.ispremarket ? 1 : 0, "Premarket")
plot(session.ispostmarket ? 1 : 0, "Postmarket")
plot(session.isfirstbar ? 1 : 0, "First Any")
plot(session.isfirstbar_regular ? 1 : 0, "First Regular")
plot(session.islastbar ? 1 : 0, "Last Any")
plot(session.islastbar_regular ? 1 : 0, "Last Regular")
plot(session.regular == "regular" ? 1 : 0, "Regular Constant")
plot(session.extended == "extended" ? 1 : 0, "Extended Constant")
inRegular = not na(time("1", "0930-1600", "America/New_York"))
regularClose = time_close("1", "0930-1600", "America/New_York")
plot(inRegular ? 1 : 0, "Time Regular")
plot(na(regularClose) ? na : regularClose - time, "Time Close Delta")
`,
    bars: minuteBoundaryBars,
    options: sessionOptions,
    expectedPlots: {
      Market: [0, 1, 1, 0, 0, 0],
      Premarket: [1, 0, 0, 0, 0, 0],
      Postmarket: [0, 0, 0, 1, 1, 0],
      'First Any': [1, 0, 0, 0, 0, 0],
      'First Regular': [0, 1, 0, 0, 0, 0],
      'Last Any': [0, 0, 0, 0, 1, 0],
      'Last Regular': [0, 0, 1, 0, 0, 0],
      'Regular Constant': [1, 1, 1, 1, 1, 1],
      'Extended Constant': [1, 1, 1, 1, 1, 1],
      'Time Regular': [0, 1, 1, 0, 0, 0],
      'Time Close Delta': [null, 60_000, 60_000, null, null, null],
    },
  },
  {
    name: 'host supplied syminfo metadata',
    expectedValueProvenance: 'independently-derived',
    expectedValueProvenanceNote:
      'Expected values are derived from documented syminfo host-seam semantics: host-provided metadata must surface unchanged.',
    covers: implementedSyminfoNames,
    source: `//@version=6
indicator("Syminfo metadata")
plot(syminfo.ticker == "AAPL" ? 1 : 0, "Ticker")
plot(syminfo.tickerid == "NASDAQ:AAPL" ? 1 : 0, "Ticker ID")
plot(syminfo.main_tickerid == "NASDAQ:AAPL" ? 1 : 0, "Main Ticker ID")
plot(syminfo.prefix == "NASDAQ" ? 1 : 0, "Prefix")
plot(syminfo.root == "AAPL" ? 1 : 0, "Root")
plot(syminfo.description == "Apple Inc." ? 1 : 0, "Description")
plot(syminfo.type == "stock" ? 1 : 0, "Type")
plot(syminfo.session == "extended" ? 1 : 0, "Session")
plot(syminfo.country == "US" ? 1 : 0, "Country")
plot(syminfo.sector == "Technology" ? 1 : 0, "Sector")
plot(syminfo.industry == "Consumer Electronics" ? 1 : 0, "Industry")
plot(syminfo.isin == "US0378331005" ? 1 : 0, "ISIN")
plot(syminfo.current_contract == "AAPL1!" ? 1 : 0, "Current Contract")
plot(syminfo.currency == "USD" ? 1 : 0, "Currency")
plot(syminfo.basecurrency == "" ? 1 : 0, "Base Currency")
plot(syminfo.timezone == "America/New_York" ? 1 : 0, "Timezone")
plot(syminfo.mintick, "Mintick")
plot(syminfo.pricescale, "Pricescale")
plot(syminfo.minmove, "Minmove")
plot(syminfo.pointvalue, "Point Value")
plot(syminfo.mincontract, "Min Contract")
plot(syminfo.volumetype == "quote" ? 1 : 0, "Volume Type")
plot(syminfo.expiration_date, "Expiration Date")
plot(syminfo.employees, "Employees")
plot(syminfo.shareholders, "Shareholders")
plot(syminfo.shares_outstanding_float, "Float Shares")
plot(syminfo.shares_outstanding_total, "Total Shares")
plot(syminfo.recommendations_date, "Recommendations Date")
plot(syminfo.target_price_date, "Target Date")
plot(syminfo.target_price_average, "Target Average")
plot(syminfo.target_price_estimates, "Target Estimates")
plot(syminfo.target_price_high, "Target High")
plot(syminfo.target_price_low, "Target Low")
plot(syminfo.target_price_median, "Target Median")
modifiedTicker = ticker.modify("BIST:A1CAP", session=session.extended)
plot(syminfo.prefix(modifiedTicker) == "BIST" ? 1 : 0, "Prefix Function")
plot(syminfo.ticker(symbol=modifiedTicker) == "A1CAP" ? 1 : 0, "Ticker Function")
`,
    options: metadataOptions,
    expectedPlots: {
      Ticker: allBars(1),
      'Ticker ID': allBars(1),
      'Main Ticker ID': allBars(1),
      Prefix: allBars(1),
      Root: allBars(1),
      Description: allBars(1),
      Type: allBars(1),
      Session: allBars(1),
      Country: allBars(1),
      Sector: allBars(1),
      Industry: allBars(1),
      ISIN: allBars(1),
      'Current Contract': allBars(1),
      Currency: allBars(1),
      'Base Currency': allBars(1),
      Timezone: allBars(1),
      Mintick: allBars(0.25),
      Pricescale: allBars(4),
      Minmove: allBars(1),
      'Point Value': allBars(50),
      'Min Contract': allBars(0.1),
      'Volume Type': allBars(1),
      'Expiration Date': allBars(1_780_272_000_000),
      Employees: allBars(164_000),
      Shareholders: allBars(1_000),
      'Float Shares': allBars(1.5),
      'Total Shares': allBars(2.5),
      'Recommendations Date': allBars(1_777_852_800_000),
      'Target Date': allBars(1_777_852_800_000),
      'Target Average': allBars(210.5),
      'Target Estimates': allBars(42),
      'Target High': allBars(250),
      'Target Low': allBars(180),
      'Target Median': allBars(205),
      'Prefix Function': allBars(1),
      'Ticker Function': allBars(1),
    },
  },
  {
    name: 'derived syminfo and provider absent values',
    expectedValueProvenance: 'independently-derived',
    expectedValueProvenanceNote:
      'Expected values are derived from documented syminfo fallback semantics for derivable fields and absent provider-owned metadata.',
    covers: ['syminfo.exchange'],
    source: `//@version=6
indicator("Derived Syminfo")
plot(syminfo.exchange == "NASDAQ" ? 1 : 0, "Derived Exchange")
plot(syminfo.main_tickerid == "NASDAQ:MSFT" ? 1 : 0, "Derived Main Ticker")
plot(na(syminfo.expiration_date) ? 1 : 0, "Missing Expiration")
plot(na(syminfo.target_price_average) ? 1 : 0, "Missing Target")
plot(na(syminfo.employees) ? 1 : 0, "Missing Employees")
`,
    options: {
      runtime: {
        syminfo: {
          ticker: 'NASDAQ:MSFT',
          tickerid: 'NASDAQ:MSFT',
        },
      },
    },
    expectedPlots: {
      'Derived Exchange': allBars(1),
      'Derived Main Ticker': allBars(1),
      'Missing Expiration': allBars(1),
      'Missing Target': allBars(1),
      'Missing Employees': allBars(1),
    },
  },
  {
    name: 'chart host metadata and visible-window fallback',
    expectedValueProvenance: 'independently-derived',
    expectedValueProvenanceNote:
      'Expected values are derived from documented chart metadata routing and TealScript visible-window fallback semantics.',
    covers: chartMetadataNames,
    source: `//@version=6
indicator("Chart metadata")
plot(color.r(chart.bg_color), "Bg R")
plot(color.g(chart.bg_color), "Bg G")
plot(color.b(chart.fg_color), "Fg B")
plot(chart.left_visible_bar_time, "Left Visible")
plot(chart.right_visible_bar_time, "Right Visible")
plot(chart.right_visible_bar_time - chart.left_visible_bar_time, "Visible Span")
plot(chart.is_standard ? 1 : 0, "Standard")
plot(chart.is_heikinashi ? 1 : 0, "Heikin Ashi")
plot(chart.is_renko ? 1 : 0, "Renko")
plot(chart.is_linebreak ? 1 : 0, "Line Break")
plot(chart.is_kagi ? 1 : 0, "Kagi")
plot(chart.is_pnf ? 1 : 0, "Point Figure")
plot(chart.is_range ? 1 : 0, "Range")
`,
    options: {
      runtime: {
        chart: {
          bgColor: '#102030',
          fgColor: '#ABCDEF',
          type: 'heikinashi',
        },
      },
    },
    expectedPlots: {
      'Bg R': allBars(16),
      'Bg G': allBars(32),
      'Fg B': allBars(239),
      'Left Visible': allBars(simpleBars[0]!.time),
      'Right Visible': allBars(simpleBars[simpleBars.length - 1]!.time),
      'Visible Span': allBars(simpleBars[simpleBars.length - 1]!.time - simpleBars[0]!.time),
      Standard: allBars(0),
      'Heikin Ashi': allBars(1),
      Renko: allBars(0),
      'Line Break': allBars(0),
      Kagi: allBars(0),
      'Point Figure': allBars(0),
      Range: allBars(0),
    },
  },
];

function manualNamesWithPrefix(prefix: string): string[] {
  return [...new Set(Object.values(PINE_V6_REFERENCE_MANUAL_BUILTIN_INDEX).flat())]
    .filter((name) => name.startsWith(prefix))
    .sort();
}

function compileAndRun(entry: RuntimeMetadataCase): ExecutionResult {
  const ast = parse(entry.source);
  const compiled = tryCompile(ast);
  if (!compiled.success) {
    throw new Error(`Compilation failed for ${entry.name}: ${compiled.unsupported.join(', ')}`);
  }

  const result = executeCompiled(compiled, entry.bars ?? simpleBars, undefined, entry.options);
  if (!result) {
    throw new Error(`Compiled ${entry.name} returned null`);
  }
  return result;
}

function runBoth(entry: RuntimeMetadataCase): { interpreted: ExecutionResult; compiled: ExecutionResult } {
  const interpreted = executeScript(parse(entry.source), entry.bars ?? simpleBars, undefined, entry.options);
  const compiled = compileAndRun(entry);
  expect(interpreted.errors).toEqual([]);
  expect(compiled.errors).toEqual([]);
  return { interpreted, compiled };
}

function expectExpectedPlots(result: ExecutionResult, expectedPlots: Record<string, ExpectedSeries>): void {
  for (const [title, expected] of Object.entries(expectedPlots)) {
    expect(roundSeries(getPlot(result, title).values)).toEqual(expected);
  }
}

function expectPlotParity(left: ExecutionResult, right: ExecutionResult): void {
  expect(left.plots.map((plot) => plot.title)).toEqual(right.plots.map((plot) => plot.title));
  for (let index = 0; index < left.plots.length; index++) {
    expect(roundSeries(left.plots[index]!.values)).toEqual(roundSeries(right.plots[index]!.values));
  }
}

function expectedValueProvenanceCounts(): ExpectedValueProvenanceCounts {
  const counts = emptyExpectedValueProvenanceCounts();
  for (const entry of metadataCases) {
    assertExpectedValueProvenanceDeclared(entry);
    addExpectedValueProvenanceCount(counts, entry.expectedValueProvenance, countExpectedPlotValues(entry.expectedPlots));
  }
  return counts;
}

describe('Pine v6 runtime metadata behavior', () => {
  it('has behavior coverage for the official implemented metadata namespaces', () => {
    const covered = [...new Set(metadataCases.flatMap((entry) => entry.covers))].sort();
    const officialSyminfoNameSet = new Set<string>(implementedSyminfoNames);
    const coveredSyminfoNames = covered.filter((name) => name.startsWith('syminfo.'));

    expect(covered.filter((name) => name.startsWith('timeframe.'))).toEqual(manualNamesWithPrefix('timeframe.'));
    expect(covered.filter((name) => name.startsWith('session.'))).toEqual(manualNamesWithPrefix('session.'));
    expect(coveredSyminfoNames.filter((name) => officialSyminfoNameSet.has(name))).toEqual(implementedSyminfoNames);
    expect(coveredSyminfoNames.filter((name) => !officialSyminfoNameSet.has(name))).toEqual(['syminfo.exchange']);
    expect(covered.filter((name) => name.startsWith('chart.'))).toEqual(chartMetadataNames);
  });

  it('declares provenance for every literal expected value', () => {
    expect(expectedValueProvenanceCounts()).toEqual({
      'independently-derived': 370,
      'published-worked-example': 0,
      'tealscript-regression-pin': 0,
    });
  });

  for (const entry of metadataCases) {
    it(`matches fixed metadata behavior for ${entry.name}`, () => {
      const { interpreted, compiled } = runBoth(entry);

      expectExpectedPlots(interpreted, entry.expectedPlots);
      expectExpectedPlots(compiled, entry.expectedPlots);
      expectPlotParity(compiled, interpreted);
    });
  }
});
