import type { Bar } from '../../src/runtime/context';
import type { RequestDatafeed } from '../../src/runtime/requestDatafeed';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

const directory = 'v92/captures/v92/';
const read = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url), 'utf8');
const hash = (raw: string) => createHash('sha256').update(raw).digest('hex');
const json = <T,>(path: string): T => JSON.parse(read(directory + path)) as T;
function csvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = '', quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') { cell += '"'; index++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { cells.push(cell); cell = ''; }
    else cell += char;
  }
  cells.push(cell);
  return cells;
}
const csv = (path: string) => {
  const [columns, ...rows] = read(path).trimEnd().split(/\r?\n/).map(csvLine);
  return { columns, rows };
};
interface Proof { path: string; bytes: number; sha256: string }
interface Source {
  probe: string;
  attempt: number;
  executed: Proof;
  sourceSha256: string;
  privateScriptId: string;
  privateVersion: string;
  nativeStudyInstanceId: null;
  save: Proof;
  add: Proof;
  compilerSuccess: boolean;
  nativeWarnings: unknown[];
  markerArrays: null;
  errorListChannel: null;
  removed: boolean;
  directory: string;
  historyNavigation: number;
  request: { footprint: number[] };
  settings: { symbol: string; interval: string; chartStyle: string; timezone: string };
}
interface Export {
  csv: Proof;
  rows: number;
  columns: number;
  stage: string;
  binding: string;
  closureMask: string;
  observationUtc: string;
  sourcePrivateId: string | null;
}
interface Cell { columnOrdinal: number; header: string; raw: string; valueStatus: string }
interface Event {
  stage: string;
  source: Source;
  csv: Proof;
  rowOrdinal: number;
  timeRaw: string;
  nativeClockRaw: string;
  nativeIsConfirmedRaw: string;
  fpAvailableRaw: string;
  fpZeroTotalRaw: string;
  fpTotalRaw: string;
  allRawCells: Cell[];
  eventStatus: string;
  requestedStateCredit: number;
  coverageLimit: string;
}
interface Facet {
  facet: string;
  facetVerdict: string;
  workflowStatus: string;
  closedScoreCredit: number;
  sourceSpecificExecutionFeedAsOfId: null;
  capabilityAbsentConclusion: boolean;
  remainingHold: string;
}
const inventory = json<{ saveAttempts: number; addAttempts: number; exactSourceRuns: number;
  nativeCsvExports: number; completeCompilerBodies: number; failedOrCorruptNativeEntryAttempts: number;
  attempts: Source[]; csvInventory: Export[]; maskRows: number }>('attempt-inventory-v2.json');
const full = json<Facet & {
  evidence: Proof[];
  nativeCompleteRowExport: null;
  nativeCountForChosenBar: null;
  nativePocIdentityForChosenBar: null;
  completeNativeRowOrdinals: null;
  targetKeyOnChosenBar: string;
  conditionalRoleAndCountCells: string;
  historicRowsAndCountsUnchanged: boolean;
  chosenClosedBar: { csv: string; csvSha256: string; rowOrdinal: number; barTimeRaw: string;
    barTimeCloseEpoch: number; rawRow: string[]; historyNavigationBeforeSelection: number };
  chosenBarIndependentSourceRecords: { source: Source; csv: Proof; rowOrdinal: number;
    timeRaw: string; columns: Omit<Cell, 'valueStatus'>[] }[];
}>('footprint-full-distribution-v2.json');
const presence = json<{
  states: Facet[];
  window: { nativeBarTimeRaw: string; nativeBarCloseEpoch: number; declaredAtUtc: string;
    preAddCsv: string; preAddCsvSha256: string; preAddRowOrdinal: number; settingsFrozen: boolean };
  actualAddUtc: string;
  windowEndNativeClockRaw: string;
  windowBarConfirmedAtEnd: boolean;
  events: Event[];
  naturalLoadedRowStateCountsAcrossExports: unknown[];
  rareStateWaitingOrWindowRestart: boolean;
  stateInducingActions: number;
  settingsHistorySymbolIntervalFrozenUntilWindowEnd: boolean;
  intrabarSamplingLimit: string;
}>('presence-state-observations-v2.json');
const exports = inventory.csvInventory.map(entry => ({ entry, data: csv(entry.csv.path),
  mask: csv(directory + entry.closureMask),
  source: inventory.attempts.find(source => source.privateScriptId === entry.sourcePrivateId) }));
const owned = exports.filter(entry => entry.source !== undefined);
const paths = ['RESPONSE-v92-v2.md', 'artifact-integrity-v2.json', 'validation-result-v2.json',
  'attempt-inventory-v2.json', 'facet-capabilities-v2.json', 'footprint-full-distribution-v2.json',
  'presence-state-observations-v2.json', 'availability-events-v1.jsonl'].map(path => directory + path)
  .concat(inventory.attempts.flatMap(source => ['executed-v1.pine', 'observation-v1.json', 'save-request-v1.txt',
    'save-response-v1.json', 'add-response-v1.json'].map(file => source.directory + '/' + file)),
  inventory.csvInventory.flatMap(entry => [entry.csv.path, directory + entry.binding, directory + entry.closureMask]),
  full.evidence.map(file => file.path), ['availability-window-v1.json', 'add-trigger-v1.json']
    .map(file => directory + 'v92-footprint-price-rows/attempt-v1/' + file));
const proof = (path: string): Proof => ({ path, bytes: Buffer.byteLength(read(path)), sha256: hash(read(path)) });
const findExport = (path: string) => exports.find(item => item.entry.csv.path === path)!;
const rawCell = (entry: typeof exports[number], row: string[], title: string) => row[entry.data.columns.indexOf(title)];
const windowKey = '1792159800';
const chosenKey = '1792158960';
const summaries = ['FP_TOTAL_VOLUME', 'FP_BUY_VOLUME', 'FP_SELL_VOLUME', 'FP_DELTA'];
const conditional = (title: string) => title.startsWith('ROW_') || title === 'FP_ROW_COUNT';

function replayClosed(entry: typeof owned[number]) {
  const source = entry.source!;
  const ast = parse(read(source.executed.path));
  expect(checkProgram(ast).diagnostics.filter(diagnostic => diagnostic.severity === 'error')).toEqual([]);
  const compiled = tryCompile(ast);
  expect(compiled.success).toBe(true);
  if (!compiled.success) throw new Error('Unchanged native footprint source must compile');
  // This is a pointwise accessor/control-flow regression only. No execution
  // frontier, complete row distribution or requested facet receives credit.
  const native = entry.data.rows.filter((_, index) => entry.mask.rows[index][7] === '1');
  const byTime = new Map(native.map(row => [Number(row[0]) * 1000, row]));
  const bars: Bar[] = native.map(row => ({ time: Number(row[0]) * 1000, open: Number(row[1]),
    high: Number(row[2]), low: Number(row[3]), close: Number(row[4]), volume: Number(row[5]) }));
  const original = source.probe === 'v92-footprint-original';
  const provider = source.probe === 'v92-footprint-provider';
  const requestDatafeed: RequestDatafeed = {
    getBars: () => ({ ok: false, code: 'missing_context', message: 'No requested OHLC context used' }),
    getFootprint: query => {
      expect([query.symbol, query.timeframe, query.ticksPerRow, query.valueAreaPercent, query.imbalancePercent])
        .toEqual(['BINANCE:BTCUSDT', '2', 100, 70, 300]);
      const row = byTime.get(query.time)!;
      expect(row).toBeDefined();
      // Native original Plot observes presence only. Other runs supply their own
      // summaries; no candle-volume substitution or cross-run provider borrowing.
      return original ? { time: query.time } : { time: query.time,
        totalVolume: Number(rawCell(entry, row, 'FP_TOTAL_VOLUME')),
        buyVolume: Number(rawCell(entry, row, 'FP_BUY_VOLUME')),
        sellVolume: Number(rawCell(entry, row, 'FP_SELL_VOLUME')) };
    },
  };
  const result = executeCompiled(compiled, bars, undefined, { requestDatafeed,
    runtime: { syminfo: { tickerid: 'BINANCE:BTCUSDT' },
      timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true } } })!;
  expect(result.errors).toEqual([]);
  expect(result.plots).toHaveLength(entry.data.columns.length - 6);
  const titles = original ? ['Plot'] : [...summaries, ...(provider ? ['Plot']
    : ['TARGET_KEY', 'FP_AVAILABLE', 'FP_AVAILABLE_ZERO_TOTAL'])];
  let numeric = 0;
  let blanks = 0;
  native.forEach((row, index) => {
    for (const title of titles) {
      const raw = rawCell(entry, row, title);
      expect(raw).not.toBe('');
      expect(result.plots[entry.data.columns.indexOf(title) - 6].values[index], `${entry.entry.csv.path}:${row[0]}:${title}`).toBe(Number(raw));
      numeric++;
    }
    entry.data.columns.forEach((title, ordinal) => {
      if (!conditional(title)) return;
      // TARGET_KEY0 is a deliberate no-output branch, not unavailable/zero rows.
      // Never coerce its native blank to Number('') or supply fabricated rows.
      expect(rawCell(entry, row, 'TARGET_KEY')).toBe('0');
      expect(row[ordinal]).toBe('');
      expect(result.plots[ordinal - 6].values[index]).toBeNull();
      blanks++;
    });
  });
  const times = native.map(row => row[0]);
  expect(times).toContain(chosenKey);
  expect(times.includes(windowKey)).toBe(entry.entry.stage === 'close');
  return { rows: native.length, numeric, blanks };
}

describe('v92 closed footprint regressions with all requested facets held', () => {
  it('binds every relied-on v2 artifact by SHA, including integrity and validation', () => {
    const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as { files: Proof[] };
    const integrity = json<{ version: string; selfExcluded: boolean; files: Proof[] }>('artifact-integrity-v2.json');
    expect([integrity.version, integrity.selfExcluded]).toEqual(['v2', true]);
    expect(paths).toHaveLength(60);
    expect(new Set(paths).size).toBe(60);
    for (const path of paths) {
      const actual = proof(path);
      expect(lock.files.find(file => file.path === path)).toEqual(actual);
      if (!path.endsWith('/artifact-integrity-v2.json')) expect(integrity.files.find(file => file.path === path)).toEqual(actual);
    }
    expect(json('validation-result-v2.json')).toMatchObject({ result: 'PASS', checks: {
      exactSourcePrivateSaveAddRuns: 3, completeNativeCompilerBodies: 6, nativeCsvBindingsMasks: 9,
      independentlyVerifiedMaskRows: 2747, sourceBoundAvailabilityFrames: 5, separateHeldFacetVerdicts: 6 } });
  });

  it('authenticates three unchanged single native Save/Add runs and all nine CSV ownership bindings', () => {
    expect([inventory.saveAttempts, inventory.addAttempts, inventory.exactSourceRuns,
      inventory.completeCompilerBodies, inventory.nativeCsvExports, inventory.failedOrCorruptNativeEntryAttempts]).toEqual([3, 3, 3, 6, 9, 0]);
    expect(inventory.attempts.map(source => source.probe)).toEqual(['v92-footprint-original', 'v92-footprint-provider', 'v92-footprint-price-rows']);
    const unchangedHashes = ['de1d7e2a863b01667c408d6c492444104fa81c52ceef13a972934ba13ab25203',
      'dbd2ce13d612f9ff5c97ee3c5b0302da2347adc6c51f8f458117d6fadb7355ee',
      'c75136308573ce0e00dd190ad6ec8b79aa80e733395a6ccc7f7ed6be4b020e63'];
    for (const [index, source] of inventory.attempts.entries()) {
      expect(source.executed).toEqual(proof(source.executed.path));
      expect(source.sourceSha256).toBe(unchangedHashes[index]);
      expect(source.executed.sha256).toBe(unchangedHashes[index]);
      expect(JSON.parse(read(source.directory + '/observation-v1.json'))).toEqual({ version: 'v1', ...source });
      expect([source.attempt, source.compilerSuccess, source.historyNavigation, source.removed]).toEqual([1, true, 0, true]);
      expect([source.nativeStudyInstanceId, source.markerArrays, source.errorListChannel]).toEqual([null, null, null]);
      expect(source.nativeWarnings).toEqual([]);
      expect(source.settings).toMatchObject({ symbol: 'BINANCE:BTCUSDT', interval: '2', chartStyle: 'Candles', timezone: 'UTC' });
      expect(source.request.footprint).toEqual([100, 70, 300]);
      const multipart = read(source.directory + '/save-request-v1.txt').replace(/\r\n/g, '\n');
      expect(multipart.split('name="source"\n\n')[1].split('\n------WebKitFormBoundary')[0]).toBe(read(source.executed.path));
      for (const compilerProof of [source.save, source.add]) {
        expect(compilerProof).toEqual(proof(compilerProof.path));
        expect(JSON.parse(read(compilerProof.path))).toMatchObject({ success: true, result: { metaInfo: { warnings: [] } } });
      }
    }
    expect(exports).toHaveLength(9);
    expect(owned).toHaveLength(7);
    for (const entry of exports) {
      expect(entry.entry.csv).toEqual(proof(entry.entry.csv.path));
      expect([entry.data.rows.length, entry.data.columns.length]).toEqual([entry.entry.rows, entry.entry.columns]);
      expect(entry.data.rows.every(row => row.length === entry.entry.columns)).toBe(true);
      expect(entry.mask.rows.every(row => row.length === 12)).toBe(true);
      const binding = JSON.parse(read(directory + entry.entry.binding));
      expect(binding.csv).toEqual(entry.entry.csv);
      expect(binding.observationUtc).toBe(entry.entry.observationUtc);
      expect(binding.sourceExecution).toEqual(entry.source ?? null);
      expect(binding.sourceSpecificExecutionFeedAsOfId).toBeNull();
      expect([binding.duplicateHeadersPreservedByOrdinal, binding.numericStringsAndBlanksPreserved]).toEqual([true, true]);
      expect(binding.columns.map((column: { originalHeader: string }) => column.originalHeader)).toEqual(entry.data.columns);
      for (const [index, column] of binding.columns.entries()) {
        expect(column.columnOrdinal).toBe(index + 1);
        if (index < 6) continue;
        expect(column).toMatchObject({ owner: entry.source!.privateScriptId, privateVersion: '1.0',
          sourceSha256: entry.source!.sourceSha256, nativePlotId: `plot_${index - 6}`, nativePlotTitle: entry.data.columns[index] });
        for (const body of [entry.source!.save, entry.source!.add]) {
          expect(JSON.parse(read(body.path)).result.metaInfo.styles[column.nativePlotId].title).toBe(column.nativePlotTitle);
        }
      }
    }
  });

  it('independently verifies every closed mask and keeps all masked nonblank cells OBSERVED with zero facet credit', () => {
    let rows = 0, closed = 0, observed = 0, blank = 0, maskedObserved = 0;
    for (const entry of exports) {
      expect(entry.mask.rows).toHaveLength(entry.data.rows.length);
      entry.data.rows.forEach((row, index) => {
        const mask = entry.mask.rows[index];
        expect(mask.slice(0, 5)).toEqual([entry.entry.csv.sha256, String(index + 1), row[0], String(Number(row[0]) + 120), entry.entry.observationUtc]);
        expect([mask[5], mask[6]]).toEqual(['CHART_ISCONFIRMED', 'OBSERVATION_CLOCK'].map(title => rawCell(entry, row, title) ?? ''));
        const isClosed = (Number(row[0]) + 120) * 1000 <= Date.parse(entry.entry.observationUtc)
          && mask[5] !== '0' && (mask[6] === '' || Number(mask[6]) >= (Number(row[0]) + 120) * 1000);
        expect(mask[7]).toBe(isClosed ? '1' : '0');
        expect(mask[8]).toBe('OBSERVED');
        expect(JSON.parse(mask[9])).toEqual(row.flatMap((value, ordinal) => value === '' ? [ordinal + 1] : []));
        expect(mask[10]).toBe('0');
        expect(mask[11]).toContain(entry.source ? 'REQUESTED_FACET_NOT_OBSERVED' : 'CHART_ONLY_NO_TARGET_EXECUTION');
        if (!isClosed) expect(mask[11]).toContain('CHART_BAR_DEVELOPING_OR_CONFIRMATION_NOT_REACHED');
        if (entry.source?.probe === 'v92-footprint-price-rows') expect(mask[11]).toContain('CONDITIONAL_ROW_ROLE_TARGET_KEY_FALSE');
        const present = row.slice(6).filter(value => value !== '').length;
        rows++;
        closed += Number(isClosed);
        observed += present;
        blank += row.slice(6).filter(value => value === '').length;
        if (!isClosed) maskedObserved += present;
      });
    }
    expect([rows, closed, observed, blank, maskedObserved]).toEqual([2747, 2738, 29131, 38400, 95]);
    expect(inventory.maskRows).toBe(rows);
  });

  it('pins the naturally selected 13:56 closed bar and preserves conditional row/count blanks', () => {
    const chosen = full.chosenClosedBar;
    const baseline = findExport(chosen.csv);
    expect([chosen.barTimeRaw, chosen.barTimeCloseEpoch, chosen.historyNavigationBeforeSelection]).toEqual([chosenKey, 1792159080, 0]);
    expect(chosen.csvSha256).toBe(baseline.entry.csv.sha256);
    expect(baseline.data.rows[chosen.rowOrdinal - 1]).toEqual(chosen.rawRow);
    expect(baseline.mask.rows[chosen.rowOrdinal - 1][7]).toBe('1');
    expect(full.chosenBarIndependentSourceRecords).toHaveLength(3);
    for (const record of full.chosenBarIndependentSourceRecords) {
      const entry = findExport(record.csv.path);
      expect(record.source).toEqual(entry.source);
      expect(record.csv).toEqual(entry.entry.csv);
      expect(record.timeRaw).toBe(chosenKey);
      const row = entry.data.rows[record.rowOrdinal - 1];
      expect(row.slice(0, 6)).toEqual(chosen.rawRow);
      expect(record.columns).toEqual(row.map((raw, index) => ({ columnOrdinal: index + 1, header: entry.data.columns[index], raw })));
      expect(entry.mask.rows[record.rowOrdinal - 1][7]).toBe('1');
    }
    expect(full.targetKeyOnChosenBar).toBe('0');
    expect(full.conditionalRoleAndCountCells).toContain('BLANK; not proof of unavailable object or native row count0');
    for (const entry of owned.filter(item => item.source!.probe === 'v92-footprint-price-rows')) {
      for (const row of entry.data.rows) {
        expect(rawCell(entry, row, 'TARGET_KEY')).toBe('0');
        expect([rawCell(entry, row, 'FP_AVAILABLE'), rawCell(entry, row, 'FP_AVAILABLE_ZERO_TOTAL')]).toEqual(['1', '0']);
        expect(Number(rawCell(entry, row, 'FP_TOTAL_VOLUME'))).toBeGreaterThan(0);
        expect(row.filter((_, index) => conditional(entry.data.columns[index]))).toEqual(Array(25).fill(''));
      }
    }
    expect(presence.naturalLoadedRowStateCountsAcrossExports).toEqual([{ availableRaw: '1', zeroTotalRaw: '0', totalClass: 'POSITIVE', rowObservations: 1536 }]);
  });

  it('pins all five window observations separately and excludes every developing snapshot from engine scoring', () => {
    const prefix = 'v92-footprint-price-rows/attempt-v1/';
    expect(presence.window).toEqual(json(prefix + 'availability-window-v1.json'));
    expect(json(prefix + 'add-trigger-v1.json')).toEqual({ addedAtUtc: presence.actualAddUtc, declaredWindow: presence.window });
    expect(presence.window).toMatchObject({ nativeBarTimeRaw: windowKey, nativeBarCloseEpoch: 1792159920, settingsFrozen: true });
    expect(Date.parse(presence.window.declaredAtUtc)).toBeLessThan(Date.parse(presence.actualAddUtc));
    const pre = findExport(presence.window.preAddCsv);
    expect(pre.entry.csv.sha256).toBe(presence.window.preAddCsvSha256);
    expect(pre.data.rows[presence.window.preAddRowOrdinal - 1][0]).toBe(windowKey);
    expect(presence.events).toEqual(read(directory + 'availability-events-v1.jsonl').trimEnd().split('\n').map(line => JSON.parse(line)));
    expect(presence.events.map(event => event.stage)).toEqual(['initial', 'update', 'update2', 'update3', 'close']);
    expect(presence.events.map(event => event.nativeIsConfirmedRaw)).toEqual(['0', '0', '0', '0', '1']);
    expect(presence.events.map(event => event.fpTotalRaw)).toEqual(['3.3540800000000033', '5.727669999999999', '8.853890000000002', '14.798180000000007', '18.85462000000001']);
    let previousClock = 0;
    let observed = 0, blanks = 0;
    let developingObserved = 0, developingBlanks = 0;
    for (const event of presence.events) {
      const entry = findExport(event.csv.path);
      const row = entry.data.rows[event.rowOrdinal - 1];
      expect(event.source).toEqual(entry.source);
      expect(event.csv).toEqual(entry.entry.csv);
      expect([row[0], event.timeRaw]).toEqual([windowKey, windowKey]);
      expect(event.allRawCells).toEqual(row.map((raw, index) => ({ columnOrdinal: index + 1, header: entry.data.columns[index], raw,
        valueStatus: raw === '' ? 'BLANK; conditional role/count channel not emitted' : 'OBSERVED' })));
      expect([event.nativeClockRaw, event.nativeIsConfirmedRaw, event.fpAvailableRaw, event.fpZeroTotalRaw, event.fpTotalRaw])
        .toEqual(['OBSERVATION_CLOCK', 'CHART_ISCONFIRMED', 'FP_AVAILABLE', 'FP_AVAILABLE_ZERO_TOTAL', 'FP_TOTAL_VOLUME'].map(title => rawCell(entry, row, title)));
      expect([event.fpAvailableRaw, event.fpZeroTotalRaw, event.eventStatus, event.requestedStateCredit]).toEqual(['1', '0', 'OBSERVED', 0]);
      expect(event.coverageLimit).toContain('no assertion that every intrabar execution was retained');
      const clock = Number(event.nativeClockRaw);
      expect(clock).toBeGreaterThan(previousClock);
      previousClock = clock;
      const confirmed = event.stage === 'close';
      expect(clock >= presence.window.nativeBarCloseEpoch * 1000).toBe(confirmed);
      expect(entry.mask.rows[event.rowOrdinal - 1][7]).toBe(confirmed ? '1' : '0');
      observed += row.filter(value => value !== '').length;
      blanks += row.filter(value => value === '').length;
      if (!confirmed) {
        developingObserved += row.filter(value => value !== '').length;
        developingBlanks += row.filter(value => value === '').length;
      }
    }
    expect([observed, blanks, developingObserved, developingBlanks]).toEqual([115, 125, 92, 100]);
    expect([presence.windowEndNativeClockRaw, presence.windowBarConfirmedAtEnd]).toEqual(['1792159920356', true]);
    expect(presence.intrabarSamplingLimit).toContain('unseen intermediate states remain unknown');
    expect([presence.rareStateWaitingOrWindowRestart, presence.stateInducingActions, presence.settingsHistorySymbolIntervalFrozenUntilWindowEnd]).toEqual([false, 0, true]);
    const initial = presence.events[0];
    const entry = findExport(initial.csv.path);
    const row = entry.data.rows[initial.rowOrdinal - 1];
    expect([rawCell(entry, row, 'CHART_VOLUME'), initial.fpTotalRaw]).toEqual(['3.19943', '3.3540800000000033']);
  });

  it('keeps all five requested facet families NOT OBSERVED/HELD with zero credit and no global impossibility claim', () => {
    const facets = json<{ facets: Facet[] }>('facet-capabilities-v2.json').facets;
    expect(facets.map(facet => facet.facet)).toEqual(['a', 'b-unavailable', 'b-available-zero-total', 'c', 'd', 'e']);
    for (const facet of [...facets, full, ...presence.states]) {
      expect([facet.facetVerdict, facet.workflowStatus, facet.closedScoreCredit]).toEqual(['NOT OBSERVED', 'CAPABILITY INSPECTION COMPLETE; HELD', 0]);
      expect(facet.sourceSpecificExecutionFeedAsOfId).toBeNull();
      expect(facet.capabilityAbsentConclusion).toBe(false);
    }
    expect(presence.states.map(state => state.facet)).toEqual(['b-unavailable', 'b-available-zero-total']);
    expect([full.nativeCompleteRowExport, full.nativeCountForChosenBar, full.nativePocIdentityForChosenBar, full.completeNativeRowOrdinals]).toEqual([null, null, null, null]);
    expect(full.remainingHold).toContain('historic hold21 remain HELD');
    expect(full.historicRowsAndCountsUnchanged).toBe(true);
  });

  for (const entry of owned) it(`locks closed pointwise behavior only, with zero requested-facet credit: ${entry.entry.csv.path}`, () => {
    const rows = entry.entry.rows - 1;
    const original = entry.source!.probe === 'v92-footprint-original';
    const provider = entry.source!.probe === 'v92-footprint-provider';
    expect(replayClosed(entry)).toEqual({ rows, numeric: rows * (original ? 1 : provider ? 5 : 7), blanks: original || provider ? 0 : rows * 25 });
  });
});
