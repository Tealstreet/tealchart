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
interface Source {
  sourceId: string;
  item: number;
  pineVersion: number;
  requestSource: string;
  sourceSha256: string;
  executed: Proof;
  privateScriptId: string;
  privateVersion: string;
  nativeCompileSuccess: boolean;
  nativeWarningChannel: unknown[];
  separateMarkerArrays: null;
  saveBody: Proof;
  addBody: Proof;
}
interface Session {
  csv: Proof;
  dataRows: number;
  independentlyClosedRows: number;
  nativeObservationUtc: string;
  closureMask: Proof;
  columnBindings: Proof;
  rawFirstRow: string[];
  rawLastRow: string[];
}
interface Control {
  sourceId: string;
  property: string;
  criterionVerdict: string;
  hypothesis: string;
  renderingClaim?: boolean;
  nativeCellPointers?: {
    csvSha256: string;
    rowOrdinal: number;
    timeRaw: string;
    columnOrdinal: number;
    title: string;
    raw: string;
    frozenExpected: string | null;
  }[];
  phaseTuples?: {
    phase: number;
    rowOrdinal: number;
    csvSha256: string;
    gradientXRaw: string;
    D: Record<string, string>;
    E: Record<string, string>;
  }[];
}
const base = 'v93/captures/v93/';
const sourceIds = ['v93-color-channels-v5', 'v93-color-channels-v6'];
const bytes = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url));
const read = (path: string) => bytes(path).toString('utf8');
const json = <T>(path: string): T => JSON.parse(read(path)) as T;
const hash = (raw: Uint8Array) => createHash('sha256').update(raw).digest('hex');
function csv(path: string) {
  const [header, ...lines] = read(path).trimEnd().split(/\r?\n/);
  return { headers: header.split(','), rows: lines.map((line) => line.split(',')) };
}
const inventory = json<{
  capturedSources: number;
  reservedSources: number;
  attempts: { source: Source; status: string; removed: boolean; sessions: Session[] }[];
}>(base + 'attempt-inventory-v2.json');
const entries = sourceIds.map((id) => {
  const attempt = inventory.attempts.find((attempt) => attempt.source.sourceId === id)!;
  const session = attempt.sessions[0];
  return {
    id,
    attempt,
    session,
    data: csv(session.csv.path),
    mask: csv(session.closureMask.path),
    folder: base + id + '/attempt-v1/session-mode0-v1/',
  };
});
const controls = json<{ results: Control[] }>(base + 'numeric-controls-v2.json').results.filter((control) =>
  sourceIds.includes(control.sourceId),
);
const paths = [
  'RESPONSE-v93-v2.md',
  'artifact-integrity-v2.json',
  'validation-result-v2.json',
  'attempt-inventory-v2.json',
  'facet-capabilities-v2.json',
  'numeric-controls-v2.json',
]
  .map((file) => base + file)
  .concat(
    'v93/REQUEST-v93-v1.md',
    ...sourceIds.map((id) => [
      'v93/sources/' + id + '.pine',
      ...[
        'executed-v1.pine',
        'observation-v1.json',
        'capture-receipt-v1.json',
        'save-response-v1.json',
        'add-response-v1.json',
      ].map((file) => base + id + '/attempt-v1/' + file),
      ...[
        'chart-native-v1.csv',
        'column-bindings-v1.json',
        'row-closure-mask-v1.csv',
        'row-set-observation-v1.json',
        'session-receipt-v1.json',
      ].map((file) => base + id + '/attempt-v1/session-mode0-v1/' + file),
    ]),
  );
const fields = ['R', 'G', 'B', 'T', 'NA'];
const xByPhase = [-1, 0, 0.5, 1, 2];
const cell = (entry: (typeof entries)[number], row: string[], field: string) => row[entry.data.headers.indexOf(field)];
const isClosed = (entry: (typeof entries)[number], index: number) =>
  entry.mask.rows[index][entry.mask.headers.indexOf('closed_numeric_eligible')] === '1';

function gradientModel(x: number, bottom: number[], top: number[]) {
  const t = Math.min(1, Math.max(0, x));
  const bottomWeight = (100 - bottom[3]) * (1 - t);
  const topWeight = (100 - top[3]) * t;
  const opacity = bottomWeight + topWeight;
  const rgb =
    opacity === 0
      ? [0, 0, 0]
      : bottom
          .slice(0, 3)
          .map((channel, index) => Math.round((channel * bottomWeight + top[index] * topWeight) / opacity));
  return [...rgb, 100 - opacity, 0];
}

function phaseProjection(entry: (typeof entries)[number]) {
  const ast = parse(read(entry.attempt.source.executed.path));
  expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  const compiled = tryCompile(ast);
  if (!compiled.success) throw new Error('Unchanged native color source must compile');
  // The color expressions depend only on phase. Exercise all five phases from a
  // local index0; join native tuples by their own PHASE, never seed native index23232.
  const bars: Bar[] = entry.data.rows.slice(0, 5).map((row) => ({
    time: Number(row[0]) * 1000,
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: NaN,
  }));
  const result = executeCompiled(compiled, bars)!;
  expect(result.errors).toEqual([]);
  expect(result.plots.find((plot) => plot.title === 'PHASE')!.values).toEqual([0, 1, 2, 3, 4]);
  expect(result.plots.find((plot) => plot.title === 'GRADIENT_X')!.values).toEqual(xByPhase);
  return result;
}

describe('v93 exact native color tuples and premultiplied-alpha gradient model', () => {
  it('binds only the two color runs and required v2 checkpoint artifacts by SHA', () => {
    const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as {
      files: Proof[];
    };
    const integrity = json<{ selfExcluded: boolean; files: Proof[] }>(base + 'artifact-integrity-v2.json');
    expect(integrity.selfExcluded).toBe(true);
    expect(new Set(paths).size).toBe(29);
    for (const path of paths) {
      const raw = bytes(path);
      const proof = { path, bytes: raw.length, sha256: hash(raw) };
      expect(
        lock.files.find((file) => file.path === path),
        path,
      ).toEqual(proof);
      if (!path.endsWith('/artifact-integrity-v2.json'))
        expect(
          integrity.files.find((file) => file.path === path),
          path,
        ).toEqual(proof);
    }
    expect(json(base + 'validation-result-v2.json')).toMatchObject({
      version: 'v2',
      status: 'PASS;14-source progress snapshot; layout checkpoint remains12 sources',
      exactPrivateSaveAddRuns: 14,
      completeCompilerBodies: 28,
      nativeCsvBindings: 14,
      pendingSources: 24,
    });
    expect([inventory.reservedSources, inventory.capturedSources]).toEqual([38, 14]);
    expect(entries.map((entry) => entry.attempt.source.sourceSha256)).toEqual([
      'ad51f7f4d1b2d8d2fd62f7eeae166a4b2504432b14bcb35ec039ee4b40f30210',
      'bc7a3fc82f69c4f058f64b73f8201bb79453959761eb8634171e4cea8785b18a',
    ]);
  });

  it('preserves REFUTED linear-channel and UNDECIDED E hypotheses without relabeling raw cells', () => {
    expect(controls).toHaveLength(46);
    const pointers = controls.flatMap((control) => control.nativeCellPointers ?? []);
    expect(pointers).toHaveLength(1408);
    expect(controls.filter((control) => control.hypothesis === 'REFUTED').map((control) => control.property)).toEqual([
      'D_R',
      'D_G',
      'D_B',
      'D_R',
      'D_G',
      'D_B',
    ]);
    expect(controls.filter((control) => control.property.startsWith('E_'))).toHaveLength(10);
    const facets = json<{
      facets: { item: number; sourceId: string; properties: Control[]; renderingClaim: boolean }[];
    }>(base + 'facet-capabilities-v2.json').facets.filter((facet) => facet.item === 3);
    expect(facets).toHaveLength(2);
    for (const facet of facets) {
      expect(facet.properties).toEqual(controls.filter((control) => control.sourceId === facet.sourceId));
      expect(facet.renderingClaim).toBe(false);
    }
    let refutingCells = 0;
    for (const control of controls) {
      const entry = entries.find((entry) => entry.id === control.sourceId)!;
      expect(control.criterionVerdict).toBe('CAPTURED');
      if (control.property.startsWith('E_')) expect(control.hypothesis).toBe('UNDECIDED');
      for (const [index, pointer] of (control.nativeCellPointers ?? []).entries()) {
        const row = entry.data.rows[pointer.rowOrdinal - 1];
        expect(pointer.rowOrdinal).toBe(index + 1);
        expect(isClosed(entry, pointer.rowOrdinal - 1)).toBe(true);
        expect([pointer.csvSha256, pointer.timeRaw, pointer.title, pointer.raw]).toEqual([
          entry.session.csv.sha256,
          row[0],
          entry.data.headers[pointer.columnOrdinal - 1],
          row[pointer.columnOrdinal - 1],
        ]);
        if (control.property.startsWith('E_')) expect(pointer.frozenExpected).toBeNull();
        else if (control.hypothesis === 'SUPPORTED') expect(Number(pointer.raw)).toBe(Number(pointer.frozenExpected));
        else if (control.hypothesis === 'REFUTED') {
          const channel = fields.indexOf(control.property.slice(2));
          const t = Math.min(1, Math.max(0, Number(cell(entry, row, 'GRADIENT_X'))));
          const oldHypothesis = [10, 20, 30][channel] + ([210, 120, 230][channel] - [10, 20, 30][channel]) * t;
          expect(Number(pointer.frozenExpected)).toBe(oldHypothesis);
          if (t === 0.5) {
            expect(Number(pointer.raw)).not.toBe(oldHypothesis);
            refutingCells++;
          }
        }
      }
      for (const tuple of control.phaseTuples ?? []) {
        const row = entry.data.rows[tuple.rowOrdinal - 1];
        expect(isClosed(entry, tuple.rowOrdinal - 1)).toBe(true);
        expect([tuple.csvSha256, tuple.gradientXRaw, tuple.phase]).toEqual([
          entry.session.csv.sha256,
          cell(entry, row, 'GRADIENT_X'),
          Number(cell(entry, row, 'PHASE')),
        ]);
        for (const group of ['D', 'E'] as const)
          for (const field of fields) expect(tuple[group][field]).toBe(cell(entry, row, group + '_' + field));
      }
    }
    expect(refutingCells).toBe(42);
  });

  for (const entry of entries) {
    it(`${entry.id}: authenticates exact sources, private ownership and native success channels`, () => {
      const { source } = entry.attempt;
      expect([
        source.item,
        source.nativeCompileSuccess,
        source.nativeWarningChannel,
        source.separateMarkerArrays,
        entry.attempt.removed,
      ]).toEqual([3, true, [], null, true]);
      expect(hash(bytes(source.executed.path))).toBe(source.sourceSha256);
      expect(read(source.requestSource)).toBe(read(source.executed.path));
      for (const response of [source.saveBody, source.addBody])
        expect(json<{ success: boolean }>(response.path).success).toBe(true);
      const bindings = json<{
        source: Source;
        chartVolumeColumn: null;
        columns: {
          columnOrdinal: number;
          originalHeader: string;
          owner: string;
          sourceSha256?: string;
          privateVersion?: string;
        }[];
      }>(entry.session.columnBindings.path);
      expect(bindings.source).toEqual(source);
      expect(bindings.chartVolumeColumn).toBeNull();
      expect(bindings.columns.map((column) => column.originalHeader)).toEqual(entry.data.headers);
      for (const column of bindings.columns.slice(5))
        expect([column.owner, column.sourceSha256, column.privateVersion]).toEqual([
          source.privateScriptId,
          source.sourceSha256,
          source.privateVersion,
        ]);
    });

    it(`${entry.id}: independently closes each row and pins the observed developing row`, () => {
      expect(entry.data.rows).toHaveLength(entry.session.dataRows);
      expect(entry.mask.rows).toHaveLength(entry.data.rows.length);
      let closed = 0;
      entry.data.rows.forEach((row, index) => {
        const eligible =
          (Number(row[0]) + 120) * 1000 <= Date.parse(entry.session.nativeObservationUtc) &&
          cell(entry, row, 'CHART_CONFIRMED') === '1';
        const m = (field: string) => entry.mask.rows[index][entry.mask.headers.indexOf(field)];
        expect([m('csv_sha256'), m('row_ordinal'), m('time_raw_seconds')]).toEqual([
          entry.session.csv.sha256,
          String(index + 1),
          row[0],
        ]);
        expect(isClosed(entry, index)).toBe(eligible);
        expect(m('present_cell_status')).toBe(eligible ? 'OBSERVED' : 'OBSERVED / EXCLUDED');
        expect(row).toHaveLength(30);
        expect(row.every((value) => value !== '')).toBe(true);
        expect(Number(cell(entry, row, 'INPUT_INDEX'))).toBe(23232 + index);
        expect(Number(cell(entry, row, 'PHASE'))).toBe(Number(cell(entry, row, 'INPUT_INDEX')) % 5);
        expect(Number(cell(entry, row, 'INPUT_TIME'))).toBe(Number(row[0]) * 1000);
        if (eligible) closed++;
        else expect(m('exclusion_cause')).toBe('PHYSICALLY_OPEN_OR_NATIVE_CONFIRMATION_NOT_REACHED');
      });
      expect(closed).toBe(entry.session.independentlyClosedRows);
      expect(closed).toBe(entry.id.endsWith('v5') ? 322 : 326);
      expect(entry.data.rows.length - closed).toBe(1);
      const observation = json<Session>(entry.folder + 'row-set-observation-v1.json');
      expect([entry.data.rows[0], entry.data.rows.at(-1)]).toEqual([observation.rawFirstRow, observation.rawLastRow]);
    });

    it(`${entry.id}: one opacity-weighted model reproduces every captured closed A/C/D/E cell`, () => {
      let compared = 0;
      entry.data.rows.forEach((row, index) => {
        if (!isClosed(entry, index)) return;
        const phase = Number(cell(entry, row, 'PHASE'));
        const x = xByPhase[phase];
        expect(Number(cell(entry, row, 'GRADIENT_X'))).toBe(x);
        const expected = {
          A: [10, 20, 30, 40, 0],
          C: [10, 20, 30, phase * 25, 0],
          D: gradientModel(x, [10, 20, 30, 40], [210, 120, 230, 80]),
          E: gradientModel(x, [0, 0, 0, 100], [210, 120, 230, 80]),
        };
        for (const group of ['A', 'C', 'D', 'E'] as const)
          for (const [channel, field] of fields.entries()) {
            expect(Number(cell(entry, row, group + '_' + field)), `${entry.id}:${index + 1}:${group}_${field}`).toBe(
              expected[group][channel],
            );
            compared++;
          }
      });
      expect(compared).toBe(entry.session.independentlyClosedRows * 20);
    });

    for (const groups of [['A', 'C'], ['D'], ['E']]) {
      it(`${entry.id}: unchanged source reproduces closed ${groups.join('/')} tuples by observed phase`, () => {
        const result = phaseProjection(entry);
        let compared = 0;
        entry.data.rows.forEach((row, index) => {
          if (!isClosed(entry, index)) return;
          const phase = Number(cell(entry, row, 'PHASE'));
          for (const group of groups)
            for (const field of fields) {
              const title = group + '_' + field;
              const plot = result.plots.find((plot) => plot.title === title)!;
              expect(plot.values[phase], `${entry.id}:${index + 1}:${title}:phase${phase}`).toBe(
                Number(cell(entry, row, title)),
              );
              compared++;
            }
        });
        expect(compared).toBe(entry.session.independentlyClosedRows * groups.length * 5);
      });
    }
  }
});
