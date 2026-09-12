import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

type TraceValue = number | null;

interface CsvRow {
  [header: string]: string;
}

interface TraceSeries {
  member: string;
  output: string;
  column: string;
  values: TraceValue[];
}

interface TraceExpectation {
  schemaVersion: 1;
  sourceScript: string;
  sourceCsv: string;
  context: {
    symbol?: string;
    timeframe?: string;
    timezone?: string;
  };
  columns: {
    barIndex: TraceValue[];
    time: TraceValue[];
    open: TraceValue[];
    high: TraceValue[];
    low: TraceValue[];
    close: TraceValue[];
    volume: TraceValue[];
    source: TraceValue[];
    crossSource: TraceValue[];
    crossReference: TraceValue[];
    vwapSource: TraceValue[];
    stochHigh: TraceValue[];
    stochLow: TraceValue[];
  };
  expectations: TraceSeries[];
}

const SOURCE_SCRIPT = 'packages/tealscript/reports/tradingview-ta-hole-trace-v1.pine';

const REQUIRED_CONTEXT_COLUMNS = {
  barIndex: 'ts_trace__bar_index',
  time: 'ts_trace__time',
  open: 'ts_trace__open',
  high: 'ts_trace__high',
  low: 'ts_trace__low',
  close: 'ts_trace__close',
  volume: 'ts_trace__volume',
  source: 'ts_trace__source',
  crossSource: 'ts_trace__cross_source',
  crossReference: 'ts_trace__cross_reference',
  vwapSource: 'ts_trace__vwap_source',
  stochHigh: 'ts_trace__stoch_high',
  stochLow: 'ts_trace__stoch_low',
} as const;

const EXPECTATION_COLUMNS: Array<{ member: string; output: string; title: string }> = [
  { member: 'ta.crossover', output: 'value', title: 'ts_trace__ta_crossover' },
  { member: 'ta.crossunder', output: 'value', title: 'ts_trace__ta_crossunder' },
  { member: 'ta.cross', output: 'value', title: 'ts_trace__ta_cross' },
  { member: 'ta.bb', output: 'basis', title: 'ts_trace__ta_bb_basis' },
  { member: 'ta.bb', output: 'upper', title: 'ts_trace__ta_bb_upper' },
  { member: 'ta.bb', output: 'lower', title: 'ts_trace__ta_bb_lower' },
  { member: 'ta.rsi', output: 'value', title: 'ts_trace__ta_rsi' },
  { member: 'ta.stoch', output: 'value', title: 'ts_trace__ta_stoch' },
  { member: 'ta.vwap', output: 'value', title: 'ts_trace__ta_vwap' },
];

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"' && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

function parseCsv(csv: string): CsvRow[] {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) throw new Error('TradingView CSV must contain a header row and at least one data row.');
  const headers = parseCsvLine(lines[0]!);
  return lines.slice(1).map((line, rowIndex) => {
    const fields = parseCsvLine(line);
    if (fields.length !== headers.length) {
      throw new Error(`CSV row ${rowIndex + 2} has ${fields.length} fields; expected ${headers.length}.`);
    }
    return Object.fromEntries(headers.map((header, index) => [header, fields[index] ?? '']));
  });
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9_]+/g, '');
}

function resolveColumn(headers: readonly string[], title: string): string {
  const normalizedTitle = normalizeHeader(title);
  const matches = headers.filter((header) => {
    const normalized = normalizeHeader(header);
    return normalized === normalizedTitle || normalized.endsWith(normalizedTitle);
  });
  if (matches.length === 1) return matches[0]!;
  if (matches.length === 0) {
    throw new Error(`CSV is missing TradingView export column for plot title ${title}.`);
  }
  throw new Error(`CSV column title ${title} is ambiguous: ${matches.join(', ')}.`);
}

function parseTraceValue(raw: string): TraceValue {
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'nan' || trimmed.toLowerCase() === 'na') return null;
  const withoutSeparators = trimmed.replace(/,/g, '');
  const value = Number(withoutSeparators);
  if (!Number.isFinite(value)) throw new Error(`Cannot parse numeric trace value: ${raw}`);
  return Object.is(value, -0) ? 0 : value;
}

function columnValues(rows: readonly CsvRow[], column: string): TraceValue[] {
  return rows.map((row) => parseTraceValue(row[column] ?? ''));
}

export function importTradingViewTaHoleTraceCsv(csv: string, options: {
  sourceCsv?: string;
  symbol?: string;
  timeframe?: string;
  timezone?: string;
} = {}): TraceExpectation {
  const rows = parseCsv(csv);
  const headers = Object.keys(rows[0]!);
  const contextColumns = Object.fromEntries(
    Object.entries(REQUIRED_CONTEXT_COLUMNS).map(([name, title]) => [name, resolveColumn(headers, title)]),
  ) as Record<keyof typeof REQUIRED_CONTEXT_COLUMNS, string>;
  const expectationColumns = EXPECTATION_COLUMNS.map((column) => ({
    ...column,
    column: resolveColumn(headers, column.title),
  }));
  return {
    schemaVersion: 1,
    sourceScript: SOURCE_SCRIPT,
    sourceCsv: options.sourceCsv ?? '<memory>',
    context: {
      symbol: options.symbol,
      timeframe: options.timeframe,
      timezone: options.timezone,
    },
    columns: {
      barIndex: columnValues(rows, contextColumns.barIndex),
      time: columnValues(rows, contextColumns.time),
      open: columnValues(rows, contextColumns.open),
      high: columnValues(rows, contextColumns.high),
      low: columnValues(rows, contextColumns.low),
      close: columnValues(rows, contextColumns.close),
      volume: columnValues(rows, contextColumns.volume),
      source: columnValues(rows, contextColumns.source),
      crossSource: columnValues(rows, contextColumns.crossSource),
      crossReference: columnValues(rows, contextColumns.crossReference),
      vwapSource: columnValues(rows, contextColumns.vwapSource),
      stochHigh: columnValues(rows, contextColumns.stochHigh),
      stochLow: columnValues(rows, contextColumns.stochLow),
    },
    expectations: expectationColumns.map((column) => ({
      member: column.member,
      output: column.output,
      column: column.column,
      values: columnValues(rows, column.column),
    })),
  };
}

function parseArgs(args: string[]): { input?: string; output?: string; symbol?: string; timeframe?: string; timezone?: string } {
  const parsed: { input?: string; output?: string; symbol?: string; timeframe?: string; timezone?: string } = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const value = args[index + 1];
    if (arg === '--input') {
      parsed.input = value;
      index += 1;
    } else if (arg === '--output') {
      parsed.output = value;
      index += 1;
    } else if (arg === '--symbol') {
      parsed.symbol = value;
      index += 1;
    } else if (arg === '--timeframe') {
      parsed.timeframe = value;
      index += 1;
    } else if (arg === '--timezone') {
      parsed.timezone = value;
      index += 1;
    }
  }
  return parsed;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input || !args.output) {
    throw new Error('Usage: tsx scripts/import-tradingview-ta-hole-trace.ts --input <tradingview.csv> --output <expectations.json> [--symbol BTCUSD] [--timeframe 1D] [--timezone Etc/UTC]');
  }
  const input = resolve(args.input);
  const output = resolve(args.output);
  const csv = await readFile(input, 'utf8');
  const trace = importTradingViewTaHoleTraceCsv(csv, {
    sourceCsv: input,
    symbol: args.symbol,
    timeframe: args.timeframe,
    timezone: args.timezone,
  });
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(trace, null, 2)}\n`);
  console.log(`Wrote ${output}`);
}
