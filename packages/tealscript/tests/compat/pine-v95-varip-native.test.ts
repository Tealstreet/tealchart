import type { Bar } from '../../src/runtime/context';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

interface Proof {
  path: string;
  bytes: number;
  sha256: string;
}
interface Cell {
  rowOrdinal: number;
  columnOrdinal: number;
  headerRaw: string;
  valueRaw: string;
}
interface NumericRecord {
  csv: Proof;
  nativeCell: Cell;
  inputCells: Cell[];
  actualValueRaw: string;
  predictedRational: string;
  verdict: string;
  closedScoringEligible: boolean;
}
interface Inspection {
  csv: Proof;
  columnBindings: Proof;
  closureMask: Proof;
  originalDataRows: number;
  first32ClosedBaselineDataRowOrdinals: number[];
  nativeExportUtc: string;
  targetTuples: { rowOrdinal: number; valuesRaw: Record<string, string>; nativeCellPointers: Record<string, Cell> }[];
}
const base = 'v95/captures/v95/';
const read = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url));
const json = <T>(path: string) => JSON.parse(read(path).toString('utf8')) as T;
const hash = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');
function csv(path: string) {
  const [header, ...lines] = read(path).toString('utf8').trimEnd().split(/\r?\n/);
  const headers = header.split(',');
  const rows = lines.map((line) => line.split(','));
  return { headers, rows, cell: (row: number, title: string) => rows[row - 1][headers.indexOf(title)] };
}
const fixtures = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as {
  files: Proof[];
};
const entries = [5, 6].map((version) => {
  const id = `v95-realtime-varip-v${version}`;
  const folder = `${base}${id}/attempt-v1/`;
  const samples = Array.from({ length: 5 }, (_, i) => {
    const inspection = json<Inspection>(`${folder}observer-window-v1/sample-${i}-v1/sample-inspection-v1.json`);
    return { inspection, data: csv(inspection.csv.path), mask: csv(inspection.closureMask.path) };
  });
  const source = read(folder + 'executed-v1.pine').toString('utf8');
  const observation = json<{
    sourceSha256: string;
    nativeCompileSuccess: boolean;
    privateScriptId: string;
    privateVersion: string;
  }>(folder + 'observation-v1.json');
  const numeric = json<{
    records: NumericRecord[];
    comparisonCounts: { SUPPORTED: number };
    facets: {
      facet: string;
      captureStatus: string;
      hypothesisVerdict: string;
    }[];
    nativeExecutionIdentity: unknown;
    uiCsvSameExecution: unknown;
  }>(folder + 'numeric-results-v1.json');
  return { version, id, folder, samples, source, observation, numeric };
});
type Entry = (typeof entries)[number];

function replay(entry: Entry) {
  expect(checkProgram(parse(entry.source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual(
    [],
  );
  const compiled = tryCompile(parse(entry.source));
  expect(compiled.success).toBe(true);
  const historical = entry.samples[0].data.rows.slice(0, -1);
  const toBar = (row: string[]): Bar => ({
    time: Number(row[0]) * 1000,
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
  });
  const intrabarState = new Map<number, { before: unknown; after: unknown }>();
  // One harness execution per captured sample. Native gaps and absolute tick counts are not replayed.
  return entry.samples.map((sample, i) => {
    const target = sample.inspection.targetTuples[0];
    const bars = [...historical.map(toBar), toBar(sample.data.rows[target.rowOrdinal - 1])];
    const confirmed = target.valuesRaw.CHART_CONFIRMED === '1';
    const result = executeCompiled(compiled, bars, undefined, {
      intrabarState,
      realtimeLastBar: confirmed ? undefined : { isNew: false },
      confirmedRealtimeBarStartIndex: historical.length,
      confirmedRealtimeBarIndex: confirmed ? historical.length : undefined,
    });
    if (!result) throw new Error('Native observer source did not execute');
    expect(result.errors, `sample ${i}`).toEqual([]);
    const value = (title: string, index = bars.length - 1) => {
      const plot = result.plots.find((candidate) => candidate.title === title);
      if (!plot) throw new Error(`Missing observer plot ${title}`);
      return plot.values[index];
    };
    return { value, historicalRows: historical.length };
  });
}

describe('v95 finite same-source varip observer evidence', () => {
  it('binds the union manifest and v24 validation without borrowing other family captures', () => {
    const selected = fixtures.files.filter(
      (file) =>
        file.path.includes('v95-realtime-varip-v') ||
        (file.path.startsWith(base) &&
          /(?:RESPONSE|inventory|controls|capabilities|actions|integrity|validation).*v24/.test(file.path)) ||
        file.path === 'v95/REQUEST-v95-v1.md',
    );
    expect(selected).toHaveLength(164);
    for (const file of selected) {
      const bytes = read(file.path);
      expect(bytes.length, file.path).toBe(file.bytes);
      expect(hash(bytes), file.path).toBe(file.sha256);
    }
    expect(json<{ status: string }>(base + 'validation-result-v24.json').status).toBe('PASS');
  });

  for (const entry of entries)
    describe(`Pine v${entry.version}`, () => {
      it('retains exact executed source and native plot ownership for all five original exports', () => {
        expect(read(`v95/sources/${entry.id}.pine`).toString('utf8')).toBe(entry.source);
        expect(hash(Buffer.from(entry.source))).toBe(entry.observation.sourceSha256);
        expect(entry.observation.nativeCompileSuccess).toBe(true);
        expect(entry.observation.privateVersion).toBe('1.0');
        for (const sample of entry.samples) {
          expect(hash(read(sample.inspection.csv.path))).toBe(sample.inspection.csv.sha256);
          expect(sample.data.rows).toHaveLength(sample.inspection.originalDataRows);
          const bindings = json<{
            columns: {
              originalHeader: string;
              columnOrdinal: number;
              owner: string;
              sourceSha256?: string;
              privateVersion?: string;
              bindingStatus: string;
            }[];
            unresolvedColumnOrdinals: number[];
          }>(sample.inspection.columnBindings.path);
          expect(bindings.unresolvedColumnOrdinals).toEqual([]);
          expect(bindings.columns).toHaveLength(27);
          for (const binding of bindings.columns.slice(6)) {
            expect(binding.owner).toBe(entry.observation.privateScriptId);
            expect(binding.sourceSha256).toBe(entry.observation.sourceSha256);
            expect(binding.privateVersion).toBe('1.0');
            expect(binding.bindingStatus).toBe('OBSERVED');
            expect(sample.data.headers[binding.columnOrdinal - 1]).toBe(binding.originalHeader);
          }
        }
      });

      it('audits all 318 numeric records against original cells; only 32 baseline rows get CLOSED credit', () => {
        expect(entry.numeric.records).toHaveLength(318);
        expect(entry.numeric.comparisonCounts.SUPPORTED).toBe(318);
        let closed = 0;
        for (const record of entry.numeric.records) {
          const sample = entry.samples.find((candidate) => candidate.inspection.csv.path === record.csv.path)!;
          expect(record.csv.sha256).toBe(sample.inspection.csv.sha256);
          for (const cell of [record.nativeCell, ...record.inputCells]) {
            expect(sample.data.headers[cell.columnOrdinal - 1]).toBe(cell.headerRaw);
            expect(sample.data.rows[cell.rowOrdinal - 1][cell.columnOrdinal - 1]).toBe(cell.valueRaw);
          }
          expect(record.actualValueRaw).toBe(record.nativeCell.valueRaw);
          expect(record.predictedRational).toBe(record.actualValueRaw);
          expect(record.verdict).toBe('SUPPORTED');
          if (record.closedScoringEligible) {
            closed++;
            expect(sample).toBe(entry.samples[0]);
            expect(record.nativeCell.rowOrdinal).toBeLessThanOrEqual(32);
            expect(sample.mask.cell(record.nativeCell.rowOrdinal, 'closed_numeric_eligible')).toBe('1');
            expect(sample.mask.cell(record.nativeCell.rowOrdinal, 'physically_closed')).toBe('1');
            expect(sample.data.cell(record.nativeCell.rowOrdinal, 'CHART_CONFIRMED')).toBe('1');
            expect(Number(sample.mask.cell(record.nativeCell.rowOrdinal, 'physical_close_epoch'))).toBe(
              Number(sample.data.cell(record.nativeCell.rowOrdinal, 'time')) + 120,
            );
            expect(Date.parse(sample.inspection.nativeExportUtc)).toBeGreaterThanOrEqual(
              Number(sample.mask.cell(record.nativeCell.rowOrdinal, 'physical_close_epoch')) * 1000,
            );
          }
        }
        expect(closed).toBe(288);
        expect(entry.samples[0].inspection.first32ClosedBaselineDataRowOrdinals).toEqual(
          Array.from({ length: 32 }, (_, i) => i + 1),
        );
      });

      it('pins sampled magnitudes, same-key CLOCK progress and actual close with zero additional CLOSED credit', () => {
        const expected = entry.version === 5 ? [4, 23, 40, 65, 92] : [5, 24, 46, 70, 97];
        const committed = entry.version === 5 ? 23730 : 23735;
        let previousClock = 0;
        for (const [i, sample] of entry.samples.entries()) {
          expect(sample.inspection.targetTuples).toHaveLength(1);
          const target = sample.inspection.targetTuples[0];
          const number = (title: string) => Number(sample.data.cell(target.rowOrdinal, title));
          for (const [title, raw] of Object.entries(target.valuesRaw)) {
            expect(sample.data.cell(target.rowOrdinal, title)).toBe(raw);
            const pointer = target.nativeCellPointers[title];
            expect(sample.data.rows[pointer.rowOrdinal - 1][pointer.columnOrdinal - 1]).toBe(pointer.valueRaw);
          }
          expect(number('TICKS')).toBe(expected[i]);
          expect(number('UDT_STICKY')).toBe(expected[i]);
          expect(number('COMMITTED')).toBe(committed);
          expect(number('UDT_ORDINARY')).toBe(committed);
          expect(number('PREVIOUS_COMMITTED')).toBe(committed - 1);
          expect(number('PREVIOUS_ORDINARY')).toBe(committed - 1);
          expect(number('COMMITTED_DELTA')).toBe(1);
          expect(number('UDT_DELTA')).toBe(1);
          expect(number('CHART_CONFIRMED')).toBe(i === 4 ? 1 : 0);
          expect(number('IS_NEW')).toBe(0);
          expect(number('IS_REALTIME')).toBe(1);
          expect(number('IS_HISTORY')).toBe(0);
          expect(number('IS_LAST')).toBe(1);
          expect(number('INPUT_TIME')).toBe(entry.version === 5 ? 1792191480000 : 1792192080000);
          expect(number('SEEN_TIME')).toBe(number('INPUT_TIME'));
          expect(number('CLOCK')).toBeGreaterThan(previousClock);
          previousClock = number('CLOCK');
          expect(sample.mask.cell(target.rowOrdinal, 'event_target')).toBe('1');
          expect(sample.mask.cell(target.rowOrdinal, 'present_cell_status')).toBe('OBSERVED / EXCLUDED');
          expect(sample.mask.cell(target.rowOrdinal, 'closed_numeric_eligible')).toBe('0');
          expect(sample.mask.cell(target.rowOrdinal, 'exclusion_cause')).toBe(
            'LIVE_OBSERVER_TUPLE_EXCLUDED_FROM_CLOSED_SCORING',
          );
          if (i === 4) expect(sample.mask.cell(target.rowOrdinal, 'physically_closed')).toBe('1');
          for (let row = 1; row <= 32; row++) {
            expect(sample.data.cell(row, 'CLOCK')).toBe(entry.samples[0].data.cell(row, 'CLOCK'));
          }
        }
      });

      it('matches prefix-independent CLOSED contracts on 32 rows, holding first-row missing predecessor comparisons', () => {
        const { value } = replay(entry)[0];
        const data = entry.samples[0].data;
        let comparisons = 0;
        for (let i = 0; i < 32; i++) {
          for (const title of ['TICKS', 'UDT_STICKY', 'CHART_CONFIRMED', 'SEEN_TIME']) {
            expect(value(title, i), `${title} row ${i + 1}`).toBe(Number(data.cell(i + 1, title)));
            comparisons++;
          }
          expect(Number(value('UDT_ORDINARY', i)) - Number(value('COMMITTED', i))).toBe(
            Number(data.cell(i + 1, 'UDT_ORDINARY')) - Number(data.cell(i + 1, 'COMMITTED')),
          );
          comparisons++;
          if (i === 0) continue;
          for (const [current, previous, delta] of [
            ['COMMITTED', 'PREVIOUS_COMMITTED', 'COMMITTED_DELTA'],
            ['UDT_ORDINARY', 'PREVIOUS_ORDINARY', 'UDT_DELTA'],
          ]) {
            expect(value(delta, i)).toBe(Number(data.cell(i + 1, delta)));
            expect(Number(value(current, i)) - Number(value(previous, i))).toBe(
              Number(data.cell(i + 1, current)) - Number(data.cell(i + 1, previous)),
            );
            comparisons += 2;
          }
        }
        expect(comparisons).toBe(284);
      });

      it('rolls back ordinary scalar and UDT fields on all five sampled harness executions', () => {
        const updates = replay(entry);
        for (const { value, historicalRows } of updates) {
          for (const [current, previous, delta] of [
            ['COMMITTED', 'PREVIOUS_COMMITTED', 'COMMITTED_DELTA'],
            ['UDT_ORDINARY', 'PREVIOUS_ORDINARY', 'UDT_DELTA'],
          ]) {
            expect(value(current)).toBe(updates[0].value(current));
            expect(value(current)).toBe(historicalRows + 1);
            expect(value(previous)).toBe(historicalRows);
            expect(value(delta)).toBe(1);
            expect(Number(value(current)) - Number(value(previous))).toBe(1);
          }
        }
      });

      it('retains scalar varip and sticky UDT state through the sampled updates and closing evaluation', () => {
        const updates = replay(entry);
        const ticks = updates.map(({ value }) => Number(value('TICKS')));
        expect(updates.map(({ value }) => value('UDT_STICKY'))).toEqual(ticks);
        for (let i = 1; i < ticks.length; i++) expect(ticks[i]).toBeGreaterThan(ticks[i - 1]);
        // These are harness execution counts, never the native absolute counters or missing first live event.
        expect(ticks.map((tick) => tick - ticks[0])).toEqual([0, 1, 2, 3, 4]);
        expect(updates.map(({ value }) => value('CHART_CONFIRMED'))).toEqual([0, 0, 0, 0, 1]);
        for (const { value } of updates) {
          expect(value('IS_REALTIME')).toBe(1);
          expect(value('IS_HISTORY')).toBe(0);
          expect(value('IS_LAST')).toBe(1);
          expect(value('IS_NEW')).toBe(0);
          expect(value('SEEN_TIME')).toBe(value('INPUT_TIME'));
        }
      });

      it('keeps the missed first event/reset-to-one facet held', () => {
        const facet = entry.numeric.facets.find(
          (candidate) => candidate.facet === 'Next-bar first-execution sticky reset',
        );
        expect(facet?.captureStatus).toBe('NOT OBSERVED');
        expect(facet?.hypothesisVerdict).toBe('UNDECIDED');
        const declaration = json<{
          sourceSpecificExecutionId: null;
          sourceSpecificExecutionIdStatus: string;
          inputChanges: number;
          sourceRetries: number;
          maximumWindows: number;
        }>(entry.folder + 'observer-window-v1/declaration-v1.json');
        expect(declaration.sourceSpecificExecutionId).toBeNull();
        expect(declaration.sourceSpecificExecutionIdStatus).toBe('UNOBSERVED');
        expect(declaration.inputChanges).toBe(0);
        expect(declaration.sourceRetries).toBe(0);
        expect(declaration.maximumWindows).toBe(1);
      });
    });
});
