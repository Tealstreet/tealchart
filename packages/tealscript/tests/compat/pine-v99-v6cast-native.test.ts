import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

interface Proof {
  path: string;
  bytes: number;
  sha256: string;
}
interface Pointer {
  csvSha256: string;
  rowOrdinal: number;
  columnOrdinal: number;
  headerRaw: string;
  valueRaw: string;
}
interface Source {
  sourceId: string;
  sourceSha256: string;
  csv: Proof;
  columnBindings: Proof;
  closureMask: Proof;
  selectedDataRowOrdinals: number[];
  primaryUniquePlotCells: number;
  historyPredecessorDataRowOrdinal?: number;
  rows: {
    rowOrdinal: number;
    allRequestedRawCells: Pointer[];
    nativeContextCells: Pointer[];
    predecessorRawCells?: Pointer[];
  }[];
}
const base = 'v99/captures/v99/';
const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as {
  revision: string;
  files: Proof[];
};
const read = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url));
const text = (path: string) => read(path).toString('utf8');
const json = <T>(path: string): T => JSON.parse(text(path)) as T;
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const csv = (path: string) =>
  text(path)
    .trimEnd()
    .split(/\r?\n/)
    .map((line) =>
      line
        .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
        .map((value) => (value.startsWith('"') ? value.slice(1, -1).replaceAll('""', '"') : value)),
    );
const entries = json<{ sources: { sourceId: string; numericResults: Proof }[] }>(base + 'numeric-controls-v6.json')
  .sources.filter((s) =>
    ['v99-array-self-v6', 'v99-color-na-identity-v6', 'v98-color-constructors-v6'].includes(s.sourceId),
  )
  .map((entry) => json<Source>(entry.numericResults.path));

it('binds the append-only v99 evidence, integrity, validation and the exact source index', () => {
  expect(lock.revision).toBe('56abd808d88595bab7808c063d065ce2bcd7dc55');
  const integrity = json<{ artifacts: Proof[] }>(base + 'artifact-integrity-v6.json');
  const files = lock.files.filter((f) => f.path.startsWith('v99/'));
  expect(files.length).toBeGreaterThanOrEqual(113);
  for (const file of files) {
    const bytes = read(file.path);
    expect({ path: file.path, bytes: bytes.length, sha256: hash(bytes) }).toEqual(file);
    if (file.path !== base + 'artifact-integrity-v6.json')
      expect(integrity.artifacts.find((f) => f.path === file.path)).toEqual(file);
  }
  expect(json<{ status: string }>(base + 'validation-result-v6.json').status).toBe('PASS');
  expect(entries).toHaveLength(3);
});

for (const native of entries)
  describe(native.sourceId, () => {
    const [headers, ...rows] = csv(native.csv.path);
    const [maskHeaders, ...masks] = csv(native.closureMask.path);
    const folder = base + native.sourceId + '/attempt-v1/';
    const source = text(folder + 'executed-v1.pine');
    const binding = json<{
      nativePrivateId: string;
      columns: { columnOrdinal: number; originalHeader: string; owner: string; sourceSha256?: string }[];
    }>(native.columnBindings.path);
    const get = (row: string[], name: string) => row[headers.indexOf(name)];

    it('authenticates exact Save/Add source ownership, all native pointers and physical row exclusions', () => {
      expect(hash(Buffer.from(source))).toBe(native.sourceSha256);
      expect(hash(read(native.csv.path))).toBe(native.csv.sha256);
      expect(source).toBe(
        text(
          native.sourceId.startsWith('v99')
            ? `v99/sources/${native.sourceId}.pine`
            : 'v98/sources/v98-color-constructors-v6.pine',
        ),
      );
      const saved = text(folder + 'save-request-v1.txt')
        .replaceAll('\r\n', '\n')
        .split('name="source"\n\n')[1]
        .split(/\n------WebKitFormBoundary/)[0];
      expect(saved).toBe(source);
      for (const stage of ['save', 'add'])
        expect(json<{ success: boolean }>(folder + stage + '-response-v1.json').success).toBe(true);
      for (const column of binding.columns) {
        expect(headers[column.columnOrdinal - 1]).toBe(column.originalHeader);
        if (column.columnOrdinal > 5)
          expect(column).toMatchObject({ owner: binding.nativePrivateId, sourceSha256: native.sourceSha256 });
      }
      for (const row of native.rows)
        for (const p of [...row.allRequestedRawCells, ...row.nativeContextCells, ...(row.predecessorRawCells ?? [])]) {
          expect(p.csvSha256).toBe(native.csv.sha256);
          expect(headers[p.columnOrdinal - 1]).toBe(p.headerRaw);
          expect(rows[p.rowOrdinal - 1][p.columnOrdinal - 1]).toBe(p.valueRaw);
        }
      expect(masks).toHaveLength(rows.length);
      let closed = 0;
      for (const [i, row] of rows.entries()) {
        const mask = Object.fromEntries(maskHeaders.map((h, j) => [h, masks[i][j]]));
        const eligible =
          get(row, 'CHART_CONFIRMED') === '1' && (Number(row[0]) + 120) * 1000 <= Date.parse(mask.export_utc);
        expect(mask.csv_sha256).toBe(native.csv.sha256);
        expect(mask.row_ordinal).toBe(String(i + 1));
        expect(mask.closed_numeric_eligible).toBe(eligible ? '1' : '0');
        if (eligible) closed++;
        else expect(mask.present_cell_status).toBe('OBSERVED / EXCLUDED');
        if (native.selectedDataRowOrdinals.includes(i + 1)) expect(eligible).toBe(true);
      }
      expect(rows.length - closed).toBe(1);
      expect(native.selectedDataRowOrdinals).toHaveLength(64);
      expect(native.primaryUniquePlotCells).toBe(headers.slice(5).length * 64);
    });

    if (native.sourceId.startsWith('v99'))
      it('matches every primary cast cell exactly, with only absolute index excluded from credit', () => {
        const firstIndex = Number(get(rows[0], 'INPUT_INDEX'));
        // The unscored local first bar has no previous array ID. Keep the source's
        // startup guards local; rebase phase/index only. Four captured context rows
        // then compute every selected predecessor without a native target seed.
        const replay = source.replace(/\bbar_index\b(?!\s*==\s*0)/g, `(bar_index + ${firstIndex})`);
        const last = Math.max(...native.selectedDataRowOrdinals);
        const compiled = tryCompile(parse(replay));
        expect(compiled.success).toBe(true);
        const result = executeCompiled(
          compiled,
          rows.slice(0, last).map((row) => ({
            time: Number(row[0]) * 1000,
            open: Number(row[1]),
            high: Number(row[2]),
            low: Number(row[3]),
            close: Number(row[4]),
            volume: NaN,
          })),
        )!;
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        expect(result.profile.swallowedErrors ?? []).toEqual([]);
        const failures: unknown[] = [];
        let exact = 0;
        for (const ordinal of native.selectedDataRowOrdinals)
          for (const title of headers.slice(5)) {
            const actual = result.plots.find((p) => p.title === title)!.values[ordinal - 1];
            const expected = get(rows[ordinal - 1], title);
            if (title === 'INPUT_INDEX') {
              expect(actual).toBe(Number(expected));
              continue;
            }
            if (
              expected === '' ? actual !== null : !Object.is(actual, Number(expected)) || String(actual) !== expected
            ) {
              failures.push({ ordinal, title, expected, actual });
            } else exact++;
          }
        expect(failures).toEqual([]);
        expect(exact).toBe(native.primaryUniquePlotCells - 64);
        expect(native.historyPredecessorDataRowOrdinal).toBe(native.selectedDataRowOrdinals[0] - 1);
        for (const ordinal of native.selectedDataRowOrdinals) {
          expect(get(rows[ordinal - 1], 'ARRAY_EQ_SELF')).toBe('0');
          expect(get(rows[ordinal - 1], 'CAST_EQ_SELF')).toBe('1');
          expect(get(rows[ordinal - 1], 'VAR_EQ_CAST')).toBe('1');
        }
      });
  });

it('uses the captured discriminator to refute copied-token identity while retaining every old semantic control', () => {
  const entry = entries.find((e) => e.sourceId === 'v99-array-self-v6')!;
  const [headers, ...rows] = csv(entry.csv.path);
  const old = json<{ sources: Source[] }>('v98/captures/v98/numeric-controls-v6.json').sources.find(
    (e) => e.sourceId === 'v98-color-na-cast-v6',
  )!;
  const [oldHeaders, ...oldRows] = csv(old.csv.path);
  const semantic = oldHeaders
    .slice(6)
    .filter((title) => !['INPUT_INDEX', 'INPUT_TIME', 'CHART_CONFIRMED'].includes(title));
  expect(semantic).toHaveLength(60);
  for (const ordinal of entry.selectedDataRowOrdinals) {
    const row = rows[ordinal - 1];
    const phase = row[headers.indexOf('CASE_ID')];
    const candidates = old.selectedDataRowOrdinals.filter(
      (i) => oldRows[i - 1][oldHeaders.indexOf('CASE_ID')] === phase,
    );
    expect(candidates).toHaveLength(16);
    for (const oldOrdinal of candidates)
      for (const title of semantic) {
        expect(row[headers.indexOf(title)], `${ordinal}:${oldOrdinal}:${title}`).toBe(
          oldRows[oldOrdinal - 1][oldHeaders.indexOf(title)],
        );
      }
    const observed = row[headers.indexOf('ARRAY_EQ_SELF')];
    expect(observed).toBe('0'); // Frozen stable-folding prediction.
    expect(observed).not.toBe('1'); // Frozen copied-token prediction, now refuted.
  }
});
