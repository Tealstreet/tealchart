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
  sourceSha256: string;
  requestSource: string;
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
  renderingClaim: boolean;
  nativeCellPointers: {
    csvSha256: string;
    rowOrdinal: number;
    timeRaw: string;
    columnOrdinal: number;
    title: string;
    raw: string;
    frozenExpected: string;
  }[];
}
const base = 'v93/captures/v93/';
const sourceIds = ['box', 'label', 'line'].flatMap((kind) => [5, 6].map((version) => `v93-copy-${kind}-v${version}`));
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
}>(base + 'attempt-inventory-v3.json');
const controls = json<{ results: Control[] }>(base + 'numeric-controls-v3.json').results.filter((control) =>
  sourceIds.includes(control.sourceId),
);
const entries = sourceIds.map((id) => {
  const attempt = inventory.attempts.find((entry) => entry.source.sourceId === id)!;
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
const paths = [
  'RESPONSE-v93-v3.md',
  'artifact-integrity-v3.json',
  'validation-result-v3.json',
  'attempt-inventory-v3.json',
  'facet-capabilities-v3.json',
  'numeric-controls-v3.json',
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
const contracts: Record<string, Record<string, string>> = {
  line: {
    INITIAL_COPY_Y2: '2',
    SOURCE_X1_REL: '2',
    SOURCE_Y1: '7',
    SOURCE_Y2: '2',
    COPY_X1_REL: '0',
    COPY_Y1: '1',
    COPY_Y2: '9',
  },
  box: {
    INITIAL_COPY_BOTTOM: '2',
    SOURCE_LEFT_REL: '2',
    SOURCE_TOP: '10',
    SOURCE_BOTTOM: '2',
    COPY_LEFT_REL: '0',
    COPY_TOP: '8',
    COPY_BOTTOM: '4',
  },
  label: {
    INITIAL_COPY_TEXT_LENGTH: '1',
    INITIAL_COPY_TEXT_EXACT: '1',
    SOURCE_X_REL: '2',
    SOURCE_Y: '7',
    SOURCE_TEXT_LENGTH: '6',
    SOURCE_TEXT_EXACT: '1',
    COPY_X_REL: '0',
    COPY_Y: '9',
    COPY_TEXT_LENGTH: '4',
    COPY_TEXT_EXACT: '1',
  },
};
const fields = (entry: (typeof entries)[number]) => contracts[entry.id.split('-')[2]];
const rawCell = (entry: (typeof entries)[number], row: string[], field: string) =>
  row[entry.data.headers.indexOf(field)];
const maskCell = (entry: (typeof entries)[number], index: number, field: string) =>
  entry.mask.rows[index][entry.mask.headers.indexOf(field)];
const closed = (entry: (typeof entries)[number], index: number) =>
  maskCell(entry, index, 'closed_numeric_eligible') === '1';

function replay(entry: (typeof entries)[number]) {
  const ast = parse(read(entry.attempt.source.executed.path));
  expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  const compiled = tryCompile(ast);
  if (!compiled.success) throw new Error('Unchanged native copy source must compile');
  const bars: Bar[] = entry.data.rows.map((row) => ({
    time: Number(row[0]) * 1000,
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: NaN,
  }));
  // Native absolute index23232 has no retained frontier. Relative getters cancel
  // the index translation; replay starts at local index0 without a native seed.
  const result = executeCompiled(compiled, bars, undefined, {
    realtimeLastBar: { isNew: true },
    runtime: {
      syminfo: { tickerid: 'BINANCE:BTCUSDT' },
      timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true },
    },
  })!;
  expect(result.errors).toEqual([]);
  return result;
}

describe('v93 native line/box/label copy getters and independent mutations', () => {
  it('binds every relied-on item-4 artifact including v3 integrity and validation', () => {
    const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as {
      files: Proof[];
    };
    const integrity = json<{ selfExcluded: boolean; files: Proof[] }>(base + 'artifact-integrity-v3.json');
    expect(integrity.selfExcluded).toBe(true);
    expect(new Set(paths).size).toBe(73);
    for (const path of paths) {
      const raw = bytes(path);
      const actual = { path, bytes: raw.length, sha256: hash(raw) };
      expect(
        lock.files.find((file) => file.path === path),
        path,
      ).toEqual(actual);
      if (!path.endsWith('/artifact-integrity-v3.json'))
        expect(
          integrity.files.find((file) => file.path === path),
          path,
        ).toEqual(actual);
    }
    expect(json(base + 'validation-result-v3.json')).toMatchObject({
      version: 'v3',
      status: 'PASS;20-source progress snapshot; layout checkpoint remains12 sources',
      exactPrivateSaveAddRuns: 20,
      completeCompilerBodies: 40,
      nativeCsvBindings: 20,
      pendingSources: 18,
    });
    expect([inventory.reservedSources, inventory.capturedSources]).toEqual([38, 20]);
    expect(entries.map((entry) => entry.attempt.source.sourceSha256)).toEqual([
      '0b2675c0c9d29cbdd53d7f854a6b46bc8d4f2dc1f4e3e12aa627db13d631d2af',
      '6d7563a5ac45e8a960490fd0ad838236462a2cc93aeae88046cfeb4c8a69b068',
      'f8350db81a54b784d53c4690e9f3844a4b240fc61f1666a52040c5c7a468b7ce',
      'ed4a1e8a775df528f6496447a7456e8f55eb36b015a937db19812be4ebaec293',
      '02baa30a5f90c90d2ce798e0cf78cf8ce2ee240981ac9f8158631e790fc92afb',
      '3d4c03f4a76d79581105c92d891219bfd9136e4fd7a64af2d0dc4b511fc82c15',
    ]);
  });

  it('keeps the six-source getter scope separate from the whole progress checkpoint', () => {
    expect(entries).toHaveLength(6);
    expect(controls).toHaveLength(48);
    expect(controls.reduce((sum, control) => sum + control.nativeCellPointers.length, 0)).toBe(1536);
    expect(entries.reduce((sum, entry) => sum + entry.data.rows.length, 0)).toBe(1991);
    expect(entries.reduce((sum, entry) => sum + entry.session.independentlyClosedRows, 0)).toBe(1985);
    const facets = json<{
      facets: {
        item: number;
        sourceId: string;
        properties: Control[];
        renderingClaim: boolean;
        uncoveredScope: string;
      }[];
    }>(base + 'facet-capabilities-v3.json').facets.filter((facet) => facet.item === 4);
    expect(facets).toHaveLength(6);
    for (const facet of facets) {
      expect(facet.properties).toEqual(controls.filter((control) => control.sourceId === facet.sourceId));
      expect(facet.renderingClaim).toBe(false);
      expect(facet.uncoveredScope).toContain(
        'Appearance, copied colors/fonts/styles/tooltips and quotas are not tested',
      );
    }
  });

  for (const entry of entries) {
    it(`${entry.id}: authenticates exact source, successful native bodies and private column ownership`, () => {
      const source = entry.attempt.source;
      expect([
        entry.attempt.status,
        entry.attempt.removed,
        source.item,
        source.nativeCompileSuccess,
        source.nativeWarningChannel,
        source.separateMarkerArrays,
      ]).toEqual(['CAPTURED', true, 4, true, [], null]);
      expect(hash(bytes(source.executed.path))).toBe(source.sourceSha256);
      expect(read(source.requestSource)).toBe(read(source.executed.path));
      for (const body of [source.saveBody, source.addBody])
        expect(json<{ success: boolean }>(body.path).success).toBe(true);
      const binding = json<{
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
      expect(binding.source).toEqual(source);
      expect(binding.chartVolumeColumn).toBeNull();
      expect(binding.columns.map((column) => column.originalHeader)).toEqual(entry.data.headers);
      for (const column of binding.columns.slice(5))
        expect([column.owner, column.sourceSha256, column.privateVersion]).toEqual([
          source.privateScriptId,
          source.sourceSha256,
          source.privateVersion,
        ]);
    });

    it(`${entry.id}: independently closes rows and preserves the observed developing exclusion`, () => {
      expect(entry.data.rows).toHaveLength(entry.session.dataRows);
      expect(entry.mask.rows).toHaveLength(entry.data.rows.length);
      let eligibleRows = 0;
      entry.data.rows.forEach((row, index) => {
        const eligible =
          (Number(row[0]) + 120) * 1000 <= Date.parse(entry.session.nativeObservationUtc) &&
          rawCell(entry, row, 'CHART_CONFIRMED') === '1';
        expect(closed(entry, index)).toBe(eligible);
        expect([
          maskCell(entry, index, 'csv_sha256'),
          maskCell(entry, index, 'row_ordinal'),
          maskCell(entry, index, 'time_raw_seconds'),
        ]).toEqual([entry.session.csv.sha256, String(index + 1), row[0]]);
        expect(maskCell(entry, index, 'present_cell_status')).toBe(eligible ? 'OBSERVED' : 'OBSERVED / EXCLUDED');
        expect(row).toHaveLength(entry.data.headers.length);
        expect(row.every((value) => value !== '')).toBe(true);
        expect(Number(rawCell(entry, row, 'INPUT_INDEX'))).toBe(23232 + index);
        expect(Number(rawCell(entry, row, 'INPUT_TIME'))).toBe(Number(row[0]) * 1000);
        if (index > 0) expect(Number(row[0]) - Number(entry.data.rows[index - 1][0])).toBe(120);
        if (eligible) eligibleRows++;
        else
          expect(maskCell(entry, index, 'exclusion_cause')).toBe('PHYSICALLY_OPEN_OR_NATIVE_CONFIRMATION_NOT_REACHED');
      });
      expect(eligibleRows).toBe(entry.session.independentlyClosedRows);
      expect(eligibleRows).toBeGreaterThanOrEqual(32);
      expect(entry.data.rows.length - eligibleRows).toBe(1);
      const observation = json<Session>(entry.folder + 'row-set-observation-v1.json');
      expect([entry.data.rows[0], entry.data.rows.at(-1)]).toEqual([observation.rawFirstRow, observation.rawLastRow]);
    });

    it(`${entry.id}: retains all initial/source/copy property pointers and complete closed getter strings`, () => {
      const properties = controls.filter((control) => control.sourceId === entry.id);
      expect(properties.map((property) => property.property)).toEqual(Object.keys(fields(entry)));
      for (const property of properties) {
        expect([property.criterionVerdict, property.hypothesis, property.renderingClaim]).toEqual([
          'CAPTURED',
          'SUPPORTED',
          false,
        ]);
        expect(property.nativeCellPointers).toHaveLength(32);
        for (const [index, pointer] of property.nativeCellPointers.entries()) {
          const row = entry.data.rows[pointer.rowOrdinal - 1];
          expect(pointer.rowOrdinal).toBe(index + 1);
          expect(closed(entry, pointer.rowOrdinal - 1)).toBe(true);
          expect([pointer.csvSha256, pointer.timeRaw, pointer.title, pointer.raw, pointer.frozenExpected]).toEqual([
            entry.session.csv.sha256,
            row[0],
            entry.data.headers[pointer.columnOrdinal - 1],
            row[pointer.columnOrdinal - 1],
            fields(entry)[property.property],
          ]);
        }
      }
      entry.data.rows.forEach((row, index) => {
        if (!closed(entry, index)) return;
        for (const [field, expected] of Object.entries(fields(entry)))
          expect(rawCell(entry, row, field)).toBe(expected);
      });
    });

    it(`${entry.id}: unchanged source exactly replays closed getters, independence and text equality`, () => {
      const result = replay(entry);
      let getterComparisons = 0;
      entry.data.rows.forEach((row, index) => {
        if (!closed(entry, index)) return;
        for (const field of [...Object.keys(fields(entry)), 'INPUT_TIME', 'CHART_CONFIRMED']) {
          const plot = result.plots.find((plot) => plot.title === field)!;
          expect(plot, field).toBeDefined();
          expect(plot.values[index], `${entry.id}:${index + 1}:${field}`).toBe(Number(rawCell(entry, row, field)));
          if (Object.hasOwn(fields(entry), field)) getterComparisons++;
        }
      });
      expect(getterComparisons).toBe(entry.session.independentlyClosedRows * Object.keys(fields(entry)).length);
      expect(result.plots.find((plot) => plot.title === 'INPUT_INDEX')!.values[0]).toBe(0);
      expect(result.plots.find((plot) => plot.title === 'INPUT_INDEX')!.values.at(-1)).toBe(entry.data.rows.length - 1);
    });
  }
});
