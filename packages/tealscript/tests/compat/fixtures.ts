import { parse } from '../../src/parser';
import { executeScript, type Bar, type ExecutionResult, type PlotOutput } from '../../src/runtime';

export const compatibilityBars: Bar[] = [
  { time: 1_700_000_000_000, open: 100, high: 103, low: 99, close: 102, volume: 1_000 },
  { time: 1_700_000_060_000, open: 102, high: 106, low: 101, close: 105, volume: 1_100 },
  { time: 1_700_000_120_000, open: 105, high: 108, low: 104, close: 107, volume: 900 },
  { time: 1_700_000_180_000, open: 107, high: 109, low: 102, close: 103, volume: 1_250 },
  { time: 1_700_000_240_000, open: 103, high: 104, low: 98, close: 99, volume: 1_400 },
  { time: 1_700_000_300_000, open: 99, high: 101, low: 96, close: 100, volume: 1_050 },
  { time: 1_700_000_360_000, open: 100, high: 105, low: 99, close: 104, volume: 1_300 },
  { time: 1_700_000_420_000, open: 104, high: 110, low: 103, close: 109, volume: 1_600 },
  { time: 1_700_000_480_000, open: 109, high: 111, low: 106, close: 108, volume: 1_200 },
  { time: 1_700_000_540_000, open: 108, high: 112, low: 107, close: 111, volume: 1_500 },
  { time: 1_700_000_600_000, open: 111, high: 114, low: 109, close: 110, volume: 1_350 },
  { time: 1_700_000_660_000, open: 110, high: 113, low: 108, close: 112, volume: 1_450 },
];

export interface RunCompatScriptOptions {
  bars?: Bar[];
  inputs?: Map<string, unknown>;
}

export function runCompatScript(source: string, options: RunCompatScriptOptions = {}): ExecutionResult {
  return executeScript(parse(source), options.bars ?? compatibilityBars, options.inputs);
}

export function getPlot(result: ExecutionResult, title: string): PlotOutput {
  const plot = result.plots.find((candidate) => candidate.title === title || candidate.id === `plot_${title}`);
  if (!plot) {
    throw new Error(`Expected plot "${title}" to exist. Found: ${result.plots.map((candidate) => candidate.title).join(', ')}`);
  }
  return plot;
}

export function roundSeries(values: Array<number | null>, digits: number = 6): Array<number | null> {
  const factor = 10 ** digits;
  return values.map((value) => {
    if (value === null) return null;
    if (Number.isNaN(value)) return Number.NaN;
    return Math.round(value * factor) / factor;
  });
}
