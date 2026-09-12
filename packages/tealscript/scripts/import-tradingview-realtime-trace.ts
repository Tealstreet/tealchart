import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

type TraceKind = 'barstate' | 'timenow' | 'varip';

interface RealtimeTraceObservation {
  schema: 1;
  kind: TraceKind;
  declaredVersion: 6;
  traceSession: string;
  script: string;
  symbol: string;
  timeframe: string;
  chartSession: string;
  timezone: string;
  updateSeq: number;
  barIndex: number;
  time: number;
  timeClose: number | null;
  timenow: number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  isnew: boolean;
  isrealtime: boolean;
  isconfirmed: boolean;
  islast: boolean;
  islastconfirmedhistory: boolean;
  varScalar?: number;
  varipScalar?: number;
  varArraySize?: number;
  varipArraySize?: number;
}

interface RealtimeTraceExpectation {
  schemaVersion: 1;
  sourceLog: string;
  sourceScript: string;
  kind: TraceKind;
  context: {
    declaredVersion: 6;
    traceSession: string;
    symbol: string;
    timeframe: string;
    chartSession: string;
    timezone: string;
  };
  coverage: {
    observations: number;
    sameTimestampUpdateGroups: number;
    uniqueBarTimes: number;
    sawRealtime: boolean;
    sawNewBar: boolean;
    sawLastConfirmedHistory: boolean;
    sawTimenowChange: boolean;
  };
  observations: RealtimeTraceObservation[];
}

const TRACE_PREFIX = 'TS_TRACE_V1';
const SOURCE_SCRIPT_BY_KIND: Record<TraceKind, string> = {
  barstate: 'packages/tealscript/reports/tradingview-realtime-barstate-trace-v1.pine',
  timenow: 'packages/tealscript/reports/tradingview-timenow-trace-v1.pine',
  varip: 'packages/tealscript/reports/tradingview-varip-replacement-trace-v1.pine',
};

function parseNumber(raw: string, field: string): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`Trace field ${field} must be finite numeric; got ${raw}.`);
  return value;
}

function parseNullableNumber(raw: string, field: string): number | null {
  if (raw === 'na' || raw === 'NaN' || raw === '') return null;
  return parseNumber(raw, field);
}

function parseBoolean(raw: string, field: string): boolean {
  if (raw === '1' || raw === 'true') return true;
  if (raw === '0' || raw === 'false') return false;
  throw new Error(`Trace field ${field} must be boolean 1/0; got ${raw}.`);
}

function required(fields: Record<string, string>, name: string): string {
  const value = fields[name];
  if (value == null || value.length === 0) throw new Error(`Trace line is missing ${name}.`);
  return value;
}

function parseTraceFields(payload: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const token of payload.trim().split(/\s+/)) {
    const equals = token.indexOf('=');
    if (equals <= 0) continue;
    fields[token.slice(0, equals)] = token.slice(equals + 1);
  }
  return fields;
}

function parseTraceLine(line: string): RealtimeTraceObservation | null {
  const prefixIndex = line.indexOf(TRACE_PREFIX);
  if (prefixIndex === -1) return null;
  const fields = parseTraceFields(line.slice(prefixIndex + TRACE_PREFIX.length));
  const kind = required(fields, 'kind');
  if (kind !== 'barstate' && kind !== 'timenow' && kind !== 'varip') throw new Error(`Unknown realtime trace kind: ${kind}.`);
  const schema = parseNumber(required(fields, 'schema'), 'schema');
  if (schema !== 1) throw new Error(`Unsupported trace schema ${schema}.`);
  const declaredVersion = parseNumber(required(fields, 'declaredVersion'), 'declaredVersion');
  if (declaredVersion !== 6) throw new Error(`Expected declaredVersion=6; got ${declaredVersion}.`);
  const observation: RealtimeTraceObservation = {
    schema: 1,
    kind,
    declaredVersion: 6,
    traceSession: required(fields, 'traceSession'),
    script: required(fields, 'script'),
    symbol: required(fields, 'symbol'),
    timeframe: required(fields, 'timeframe'),
    chartSession: required(fields, 'chartSession'),
    timezone: required(fields, 'timezone'),
    updateSeq: parseNumber(required(fields, 'updateSeq'), 'updateSeq'),
    barIndex: parseNumber(required(fields, 'barIndex'), 'barIndex'),
    time: parseNumber(required(fields, 'time'), 'time'),
    timeClose: parseNullableNumber(required(fields, 'timeClose'), 'timeClose'),
    timenow: parseNumber(required(fields, 'timenow'), 'timenow'),
    open: parseNullableNumber(required(fields, 'open'), 'open'),
    high: parseNullableNumber(required(fields, 'high'), 'high'),
    low: parseNullableNumber(required(fields, 'low'), 'low'),
    close: parseNullableNumber(required(fields, 'close'), 'close'),
    volume: parseNullableNumber(required(fields, 'volume'), 'volume'),
    isnew: parseBoolean(required(fields, 'isnew'), 'isnew'),
    isrealtime: parseBoolean(required(fields, 'isrealtime'), 'isrealtime'),
    isconfirmed: parseBoolean(required(fields, 'isconfirmed'), 'isconfirmed'),
    islast: parseBoolean(required(fields, 'islast'), 'islast'),
    islastconfirmedhistory: parseBoolean(required(fields, 'islastconfirmedhistory'), 'islastconfirmedhistory'),
  };
  if (kind === 'varip') {
    observation.varScalar = parseNumber(required(fields, 'varScalar'), 'varScalar');
    observation.varipScalar = parseNumber(required(fields, 'varipScalar'), 'varipScalar');
    observation.varArraySize = parseNumber(required(fields, 'varArraySize'), 'varArraySize');
    observation.varipArraySize = parseNumber(required(fields, 'varipArraySize'), 'varipArraySize');
  }
  return observation;
}

function assertConsistentContext(observations: readonly RealtimeTraceObservation[]): void {
  const first = observations[0]!;
  for (const observation of observations.slice(1)) {
    for (const field of ['kind', 'declaredVersion', 'traceSession', 'script', 'symbol', 'timeframe', 'chartSession', 'timezone'] as const) {
      if (observation[field] !== first[field]) {
        throw new Error(`Trace context changed for ${field}: ${String(first[field])} -> ${String(observation[field])}.`);
      }
    }
  }
}

function coverageFor(observations: readonly RealtimeTraceObservation[]): RealtimeTraceExpectation['coverage'] {
  const byTime = new Map<number, number>();
  const timenowValues = new Set<number>();
  for (const observation of observations) {
    byTime.set(observation.time, (byTime.get(observation.time) ?? 0) + 1);
    timenowValues.add(observation.timenow);
  }
  return {
    observations: observations.length,
    sameTimestampUpdateGroups: [...byTime.values()].filter((count) => count > 1).length,
    uniqueBarTimes: byTime.size,
    sawRealtime: observations.some((observation) => observation.isrealtime),
    sawNewBar: observations.some((observation) => observation.isnew),
    sawLastConfirmedHistory: observations.some((observation) => observation.islastconfirmedhistory),
    sawTimenowChange: timenowValues.size > 1,
  };
}

function validateCoverage(kind: TraceKind, coverage: RealtimeTraceExpectation['coverage']): void {
  if (kind === 'barstate') {
    if (coverage.sameTimestampUpdateGroups < 1) {
      throw new Error('Barstate trace must include repeated same-timestamp realtime updates.');
    }
    if (coverage.uniqueBarTimes < 2) {
      throw new Error('Barstate trace must span a bar transition, not only one live bar.');
    }
    if (!coverage.sawRealtime || !coverage.sawNewBar || !coverage.sawLastConfirmedHistory) {
      throw new Error('Barstate trace must include realtime, new-bar, and last-confirmed-history observations.');
    }
  }
  if (kind === 'timenow') {
    if (coverage.observations < 2) throw new Error('Timenow trace must include at least two observations.');
    if (!coverage.sawTimenowChange) {
      throw new Error('Timenow trace must include a changed timenow value across reload or realtime update.');
    }
  }
  if (kind === 'varip') {
    if (coverage.sameTimestampUpdateGroups < 1) {
      throw new Error('Varip trace must include repeated same-timestamp realtime updates.');
    }
    if (!coverage.sawRealtime) throw new Error('Varip trace must include realtime observations.');
  }
}

export function importTradingViewRealtimeTraceLog(text: string, options: {
  kind?: TraceKind;
  sourceLog?: string;
} = {}): RealtimeTraceExpectation {
  const observations = text.split(/\r?\n/).map(parseTraceLine).filter((line): line is RealtimeTraceObservation => line != null);
  if (observations.length === 0) throw new Error('No TS_TRACE_V1 Pine Logs lines found.');
  assertConsistentContext(observations);
  const kind = options.kind ?? observations[0]!.kind;
  if (observations.some((observation) => observation.kind !== kind)) {
    throw new Error(`Trace contains mixed kinds; expected ${kind}.`);
  }
  const coverage = coverageFor(observations);
  validateCoverage(kind, coverage);
  const first = observations[0]!;
  return {
    schemaVersion: 1,
    sourceLog: options.sourceLog ?? '<memory>',
    sourceScript: SOURCE_SCRIPT_BY_KIND[kind],
    kind,
    context: {
      declaredVersion: 6,
      traceSession: first.traceSession,
      symbol: first.symbol,
      timeframe: first.timeframe,
      chartSession: first.chartSession,
      timezone: first.timezone,
    },
    coverage,
    observations,
  };
}

function parseArgs(args: string[]): { input?: string; output?: string; kind?: TraceKind } {
  const parsed: { input?: string; output?: string; kind?: TraceKind } = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const value = args[index + 1];
    if (arg === '--input') {
      parsed.input = value;
      index += 1;
    } else if (arg === '--output') {
      parsed.output = value;
      index += 1;
    } else if (arg === '--kind') {
      if (value !== 'barstate' && value !== 'timenow' && value !== 'varip') {
        throw new Error(`--kind must be barstate, timenow, or varip; got ${value}.`);
      }
      parsed.kind = value;
      index += 1;
    }
  }
  return parsed;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input || !args.output) {
    throw new Error('Usage: tsx scripts/import-tradingview-realtime-trace.ts --kind <barstate|timenow|varip> --input <pine-logs.txt> --output <expectations.json>');
  }
  const input = resolve(args.input);
  const output = resolve(args.output);
  const text = await readFile(input, 'utf8');
  const trace = importTradingViewRealtimeTraceLog(text, { kind: args.kind, sourceLog: input });
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(trace, null, 2)}\n`);
  console.log(`Wrote ${output}`);
}
