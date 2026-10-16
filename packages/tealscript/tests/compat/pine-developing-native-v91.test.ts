import type { Bar } from '../../src/runtime/context';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { InMemoryRequestDatafeed } from '../../src/runtime/requestDatafeed';

interface Field { valueRaw: string; columnOrdinal: number; valueStatus: string }
interface Event {
  pineVersion: number;
  phase: string;
  targetChartTimeSecondsRaw: string;
  originalSource: string;
  originalSourceSha256: string;
  companionSource: string;
  companionSourceSha256: string;
  provenance: { csv: string; sha256: string; dataRowOrdinal: number; columnOrdinals: number[]; observedAtUtc: string };
  nativeChartRaw: { headers: string[]; cells: string[] };
  originalOwnedTargetFields: Record<string, Field>;
  companionOnlyInputClockFlagsFields: Record<string, Field>;
  everyPresentRawCellObserved: boolean;
  closedScoreEligible: boolean;
  exclusion: string;
  sourceSpecificExactAsOfInputIdentity: null;
  binding: string;
}
interface Context {
  pineVersion: number;
  targetChartTimeSecondsRaw: string;
  nativeChartClocksRaw: string[];
  nativeChartConfirmationRaw: string[];
  originalTargetCounterValuesRaw: string[];
  sameExecutionAsOfInputs: string;
  missingField: string;
  originalInputChannelLimit: string;
}
interface Binding {
  path: string; sha256: string; rows: number; headers: string[]; rowClosureMask: string;
  executionBinding: string; exactAsOfInputBinding: string;
  plotBindings: { columnOrdinal: number; nativePlotTitle: string; privateScriptId: string; executedSourceSha256: string }[];
}
interface Observation {
  sourceMatchesRequest: boolean; requestedSourceSha256: string; executedSourceSha256: string;
  executedSourcePath: string; privateScriptId: string; saveCompilerSuccess: boolean;
  addCompilerSuccess: boolean | null; addPerformed?: boolean; addRequestId: number | null;
  exportPaths: unknown[];
  nativeCompilerReason2: { errors: { code?: string; start: { line: number; column: number } }[] };
}
const base = 'v91/captures/v91';
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as {
  files: { path: string; sha256: string; bytes: number }[];
};
const cached = new Map<string, string>();
function read(path: string): string {
  if (!cached.has(path)) {
    const pin = lock.files.find(file => file.path === path);
    expect(pin, `missing fixture pin: ${path}`).toBeDefined();
    const bytes = readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url));
    expect([bytes.length, hash(bytes)], path).toEqual([pin!.bytes, pin!.sha256]);
    cached.set(path, bytes.toString('utf8'));
  }
  return cached.get(path)!;
}
const json = <T,>(path: string): T => JSON.parse(read(path)) as T;
function csv(path: string) {
  const [header, ...lines] = read(path).trimEnd().split(/\r?\n/);
  return { headers: header.split(','), rows: lines.map(line => line.split(',')) };
}
const events = read(`${base}/developing-input-events-v1.jsonl`).trimEnd().split('\n').map(line => JSON.parse(line) as Event);
const context = json<{ contexts: Context[]; maskedOutputPolicy: string; importedDailyOriginals: string }>(`${base}/developing-input-context-v1.json`);
const value = (event: Event, title: string) => Number((event.originalOwnedTargetFields[title] ?? event.companionOnlyInputClockFlagsFields[title]).valueRaw);
function sourceRoot(version: number, role: string) {
  return `${base}/v91-developing-${role}-v${version}/attempt-v${version === 6 && role === 'original' ? 3 : 1}`;
}
function compile(version: number, role: string) {
  const source = read(`${sourceRoot(version, role)}/executed-v1.pine`);
  const compiled = tryCompile(parse(source));
  expect(compiled.success, compiled.unsupported.join('; ')).toBe(true);
  return compiled;
}
function chartBar(cells: string[]): Bar {
  const [time, open, high, low, close, volume] = cells.map(Number);
  return { time: time * 1000, open, high, low, close, volume };
}
function execute(compiled: ReturnType<typeof compile>, event: Event, daily: Bar[]) {
  // Each event is evaluated independently. This does not claim worker-session rollback coverage.
  // The observed preceding chart row primes v6 dynamic requests historically.
  const predecessor = csv(event.provenance.csv).rows[event.provenance.dataRowOrdinal - 2];
  const result = executeCompiled(compiled, [chartBar(predecessor), chartBar(event.nativeChartRaw.cells)], undefined, {
    requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'BINANCE:BTCUSDT', timeframe: '1D', bars: daily }]),
    confirmedRealtimeBarStartIndex: 1,
    ...(event.phase === 'close' ? { confirmedRealtimeBarIndex: 1 } : {
      realtimeLastBar: { isNew: event.phase === 'open', previousIsNew: event.phase === 'update1' },
    }),
    runtime: {
      now: value(event, 'INPUT_CHART_CLOCK'),
      syminfo: { tickerid: 'BINANCE:BTCUSDT', timezone: 'Etc/UTC' },
      timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true },
    },
  });
  expect(result?.errors).toEqual([]);
  expect(result?.profile.swallowedErrors ?? []).toEqual([]);
  return (title: string) => {
    const plot = result!.plots.find(plot => plot.title === title);
    expect(plot, title).toBeDefined();
    return plot!.values.at(-1);
  };
}

describe('v91 developing observations: SAME-SESSION-ONLY, no closed parity credit', () => {
  it('binds the integrity inventory, validation, sources and complete compiler bodies', () => {
    const inventory = json<{ files: { path: string; bytes: number; sha256: string }[] }>(`${base}/artifact-integrity-v1.json`);
    // Enumerate this family's dependencies so other consumers can compose their fixture union.
    const paths = new Set([
      'artifact-integrity-v1.json', 'validation-result-v1.json', 'RESPONSE-v91-v1.md',
      'attempt-inventory-v1.json', 'developing-input-events-v1.jsonl', 'developing-input-context-v1.json',
    ].map(name => `${base}/${name}`));
    for (const event of events) {
      paths.add(event.provenance.csv);
      paths.add(event.provenance.csv.replace('-native-v1.csv', '-column-bindings-v1.json'));
      paths.add(event.provenance.csv.replace('-native-v1.csv', '-row-closure-mask-v1.csv'));
    }
    for (const version of [5, 6]) {
      paths.add(`${base}/developing-pair-v${version}/pair-receipt-v1.json`);
      for (const role of ['original', 'input']) {
        paths.add(`v91/sources/v91-developing-${role}-v${version}.pine`);
        for (const name of ['executed-v1.pine', 'observation-v1.json', 'save-response-v1.json', 'add-response-v1.json']) {
          paths.add(`${sourceRoot(version, role)}/${name}`);
        }
      }
    }
    for (const [probe, attempt] of [['cum-original-v5', 1], ['developing-original-v6', 1], ['developing-original-v6', 2]]) {
      for (const name of ['executed-v1.pine', 'observation-v1.json', 'save-response-v1.json']) {
        paths.add(`${base}/v91-${probe}/attempt-v${attempt}/${name}`);
      }
    }
    const consumed = [...paths].map(path => lock.files.find(file => file.path === path)!);
    expect(consumed).toHaveLength(61);
    for (const pin of consumed) {
      read(pin.path);
      if (pin.path.endsWith('/artifact-integrity-v1.json')) continue;
      expect(inventory.files.find(file => file.path === pin.path), pin.path).toEqual(pin);
    }
    expect(json(`${base}/validation-result-v1.json`)).toMatchObject({ status: 'PASS', checks: {
      developingEvents: 8, developingRawTargetInputCells: 312, failedEntrySavesRetainedWithoutAdd: 3,
    } });
    expect(read(`${base}/RESPONSE-v91-v1.md`)).toContain('EXACT-AS-OF-INPUT remains CONTEXT-UNMET');
    expect(json(`${base}/attempt-inventory-v1.json`)).toMatchObject({ additionalFailedEntrySaves: 3 });
    for (const version of [5, 6]) {
      const pair = json<{ attachments: { sourceSha256: string; savedReceipt: { success: boolean; sourceBinding: { exact: boolean } }; addReceipt: { success: boolean } }[] }>(`${base}/developing-pair-v${version}/pair-receipt-v1.json`);
      expect(pair.attachments).toHaveLength(2);
      for (const [index, role] of ['original', 'input'].entries()) {
        const root = sourceRoot(version, role);
        const observation = json<Observation>(`${root}/observation-v1.json`);
        const source = read(`${root}/executed-v1.pine`);
        expect(source).toBe(read(`v91/sources/v91-developing-${role}-v${version}.pine`));
        expect(observation).toMatchObject({ sourceMatchesRequest: true, saveCompilerSuccess: true, addCompilerSuccess: true });
        for (const event of events.filter(event => event.pineVersion === version)) {
          expect(role === 'original' ? event.originalSource : event.companionSource).toBe(observation.privateScriptId);
          expect(role === 'original' ? event.originalSourceSha256 : event.companionSourceSha256).toBe(hash(source));
        }
        expect(hash(source)).toBe(observation.executedSourceSha256);
        expect(observation.requestedSourceSha256).toBe(hash(source));
        expect(pair.attachments[index]).toMatchObject({ sourceSha256: hash(source), savedReceipt: { success: true, sourceBinding: { exact: true } }, addReceipt: { success: true } });
        for (const action of ['save', 'add']) expect(json(`${root}/${action}-response-v1.json`)).toMatchObject({ success: true });
      }
    }
  });

  it('pins all 360 present native cells (312 plot cells) to their CSV row/column and exclusion cause', () => {
    expect(events).toHaveLength(8);
    const pinned: [number, string, string[]][] = [];
    for (const event of events) {
      const path = event.provenance.csv;
      const binding = json<Binding>(path.replace('-native-v1.csv', '-column-bindings-v1.json'));
      const data = csv(path);
      const mask = csv(binding.rowClosureMask);
      const index = event.provenance.dataRowOrdinal - 1;
      const row = data.rows[index];
      expect(hash(read(path))).toBe(event.provenance.sha256);
      expect(binding).toMatchObject({ path, sha256: event.provenance.sha256, headers: data.headers, rows: data.rows.length, executionBinding: 'SAME-SESSION-ONLY' });
      expect(binding.exactAsOfInputBinding).toContain('CONTEXT-UNMET');
      expect(row[0]).toBe(event.targetChartTimeSecondsRaw);
      expect(data.headers.slice(0, 6)).toEqual(event.nativeChartRaw.headers);
      expect(row.slice(0, 6)).toEqual(event.nativeChartRaw.cells);
      expect(event.provenance.columnOrdinals).toEqual(Array.from({ length: 45 }, (_, i) => i + 1));
      expect(mask.rows).toHaveLength(data.rows.length);
      const masked = Object.fromEntries(mask.headers.map((title, i) => [title, mask.rows[index][i]]));
      expect(masked).toMatchObject({ csv_sha256: event.provenance.sha256,
        data_row_ordinal_1based_excluding_header: String(index + 1), time_raw: row[0], closed_eligible: '0',
        observed_plot_cell_count: '39', blank_plot_cell_count: '0' });
      expect(masked.reason).toBe(event.phase === 'close'
        ? 'REQUESTED_DAY_DEVELOPING_AT_RELEVANT_OBSERVATIONS; PRESENT_COUNTER_INPUT_VALUES_OBSERVED'
        : 'PHYSICAL_OPEN_OR_NATIVE_CONFIRMATION_UNOBSERVED; PRESENT_VALUES_OBSERVED');
      for (const [fields, identity, sourceHash] of [
        [event.originalOwnedTargetFields, event.originalSource, event.originalSourceSha256],
        [event.companionOnlyInputClockFlagsFields, event.companionSource, event.companionSourceSha256],
      ] as const) {
        for (const [title, field] of Object.entries(fields)) {
          expect(field.valueStatus).toBe('OBSERVED');
          expect(field.valueRaw).not.toBe('');
          expect(data.headers[field.columnOrdinal - 1]).toBe(title);
          expect(row[field.columnOrdinal - 1]).toBe(field.valueRaw);
          expect(binding.plotBindings.find(plot => plot.columnOrdinal === field.columnOrdinal)).toMatchObject({
            nativePlotTitle: title, privateScriptId: identity, executedSourceSha256: sourceHash,
          });
        }
      }
      expect(event).toMatchObject({ everyPresentRawCellObserved: true, closedScoreEligible: false,
        sourceSpecificExactAsOfInputIdentity: null, binding: 'SAME-SESSION-ONLY; EXACT-AS-OF-INPUT CONTEXT-UNMET',
        exclusion: 'Requested daily period still developing, including after native 2m close' });
      expect(value(event, 'INPUT_D_TIME_CLOSE')).toBeGreaterThan(value(event, 'INPUT_CHART_CLOCK'));
      expect(value(event, 'INPUT_D_CONFIRMED_RAW')).toBe(0);
      expect(row.every(cell => cell !== '')).toBe(true);
      pinned.push([event.pineVersion, event.phase, row]);
    }
    expect(pinned.flatMap(([, , cells]) => cells)).toHaveLength(360);
    expect(hash(JSON.stringify(pinned))).toBe('81764e02790ea34e0f7b6de219a0e56438a721b680f513a23d11737a836954ab');
    expect(events.filter(event => event.closedScoreEligible)).toEqual([]);
  });

  it('keeps both missing as-of identities held, including the observed confirmed 2m closes', () => {
    expect(context.contexts).toHaveLength(2);
    for (const item of context.contexts) {
      const sequence = events.filter(event => event.pineVersion === item.pineVersion);
      expect(sequence.map(event => event.phase)).toEqual(['open', 'update1', 'update2', 'close']);
      expect(sequence.map(event => event.targetChartTimeSecondsRaw)).toEqual(Array(4).fill(item.targetChartTimeSecondsRaw));
      expect(item.targetChartTimeSecondsRaw).toBe(item.pineVersion === 5 ? '1792114440' : '1792115160');
      expect(sequence.map(event => String(value(event, 'INPUT_CHART_CLOCK')))).toEqual(item.nativeChartClocksRaw);
      expect(sequence.map(event => String(value(event, 'CHART_ISCONFIRMED')))).toEqual(['0', '0', '0', '1']);
      expect(item.nativeChartConfirmationRaw).toEqual(['0', '0', '0', '1']);
      expect(sequence.map(event => String(value(event, 'REQUEST_COUNTER')))).toEqual(item.originalTargetCounterValuesRaw);
      expect(item.originalTargetCounterValuesRaw).toEqual(['3302', '3302', '3302', '3302']);
      expect(item.sameExecutionAsOfInputs).toBe('CONTEXT-UNMET');
      expect(item.missingField).toBe('Native source-specific execution/feed/as-of identifier binding the companion request inputs to the unchanged counter execution');
      expect(item.originalInputChannelLimit).toContain('not its requested OHLCV/as-of clock or feed identity');
      expect(sequence.slice(1).every((event, index) => value(event, 'INPUT_CHART_CLOCK') > value(sequence[index], 'INPUT_CHART_CLOCK'))).toBe(true);
      expect(new Set(sequence.map(event => value(event, 'INPUT_CHART_CLOSE'))).size).toBeGreaterThan(1);
    }
    // These distinct native clocks must never be collapsed to a fabricated shared execution clock.
    expect(events.filter(event => value(event, 'INPUT_D_CLOCK') !== value(event, 'INPUT_CHART_CLOCK'))).toHaveLength(6);
    expect(context.maskedOutputPolicy).toContain('Present masked values remain OBSERVED');
    expect(context.importedDailyOriginals).toBe('FORBIDDEN; not executed; holds1/2 HELD');
  });

  it.each([
    ['cum-original-v5', 1, undefined, 5, 16],
    ['developing-original-v6', 1, 'CE10095', 8, 5],
    ['developing-original-v6', 2, 'CE10013', 17, 9],
  ] as const)('retains failed Save %s attempt%s as transport evidence only', (probe, attempt, code, line, column) => {
    const root = `${base}/v91-${probe}/attempt-v${attempt}`;
    const observation = json<Observation>(`${root}/observation-v1.json`);
    expect(observation).toMatchObject({ sourceMatchesRequest: false, saveCompilerSuccess: false,
      addPerformed: false, addRequestId: null, addCompilerSuccess: null, exportPaths: [] });
    expect(hash(read(observation.executedSourcePath))).toBe(observation.executedSourceSha256);
    expect(observation.executedSourceSha256).not.toBe(observation.requestedSourceSha256);
    expect(json(`${root}/save-response-v1.json`)).toMatchObject({ success: false });
    expect(observation.nativeCompilerReason2.errors).toHaveLength(1);
    expect(observation.nativeCompilerReason2.errors[0].start).toEqual({ line, column });
    expect(observation.nativeCompilerReason2.errors[0].code).toBe(code);
    expect(events.some(event => [event.originalSource, event.companionSource].includes(observation.privateScriptId))).toBe(false);
  });

  for (const version of [5, 6]) {
    it(`v${version} time-only counter regression: 3302 and FIRST carry, without claiming as-of input parity`, () => {
      const compiled = compile(version, 'original');
      const source = read(`${sourceRoot(version, 'original')}/executed-v1.pine`);
      expect(source).not.toMatch(/\b(open|high|low|close|volume|timenow)\b/);
      // Only native daily timestamps are projected. No prices, counter seed or invented daily rows.
      // The earlier v90 timeline is a regression input, NOT the original's as-of feed identity.
      const prior = csv('v90/captures/v90/v90-daily-chart-v5/attempt-v1/frontier-native-v1.csv');
      const sequence = events.filter(event => event.pineVersion === version);
      const first = value(sequence[0], 'FIRST_REQUEST_TIME');
      const last = value(sequence[0], 'REQUEST_TIME');
      const times = prior.rows.map(row => Number(row[0]) * 1000).filter(time => time >= first && time < last);
      times.push(last);
      expect([times.length, times[0], times.at(-1)]).toEqual([3303, 1506816000000, 1792108800000]);
      const daily = times.map(time => ({ time, open: NaN, high: NaN, low: NaN, close: NaN, volume: NaN }));
      for (const event of sequence) {
        const actual = execute(compiled, event, daily);
        for (const [title, field] of Object.entries(event.originalOwnedTargetFields)) {
          if (title === 'CHART_BAR_INDEX') continue; // Two chart-row projection has no native chart prefix.
          expect(actual(title), `${event.phase} ${title}`).toBe(Number(field.valueRaw));
        }
      }
    });

    it(`v${version} companion regression: confirmation 0/0/0/1 while daily stays developing`, () => {
      const compiled = compile(version, 'input');
      for (const event of events.filter(event => event.pineVersion === version)) {
        const daily = [{ time: value(event, 'INPUT_D_TIME'), open: value(event, 'INPUT_D_OPEN'),
          high: value(event, 'INPUT_D_HIGH'), low: value(event, 'INPUT_D_LOW'),
          close: value(event, 'INPUT_D_CLOSE'), volume: value(event, 'INPUT_D_VOLUME') }];
        const actual = execute(compiled, event, daily);
        for (const [title, field] of Object.entries(event.companionOnlyInputClockFlagsFields)) {
          // Indices need uncaptured prefixes; independently sampled daily clocks cannot use chart now.
          if (['INPUT_CHART_INDEX', 'INPUT_D_INDEX', 'INPUT_D_CLOCK'].includes(title)) continue;
          expect(actual(title), `${event.phase} ${title}`).toBe(Number(field.valueRaw));
        }
      }
    });
  }
});
