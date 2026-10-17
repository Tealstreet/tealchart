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
interface Pointer {
  rowOrdinal: number;
  columnOrdinal: number;
  headerRaw: string;
  valueRaw: string;
}
interface NumericRecord {
  property: string;
  model: string;
  verdict: string;
  nativeCell: Pointer;
  inputCells: Pointer[];
  dependencyCells?: Pointer[];
  predictedRational: string | null;
  predictedBlank: boolean;
  cause: string | null;
  closedScoringEligible: boolean;
}
interface Numeric {
  sourceSha256: string;
  csv: Proof;
  closureMask: Proof;
  columnBindings: Proof;
  selectedBlockDataRowOrdinals: number[];
  strictOwnIndexZeroPrefixAvailable: boolean;
  records: NumericRecord[];
  comparisonCounts: Record<string, number>;
  facets: { facet: string; captureStatus: string; hypothesisVerdict: string; cause: string | null }[];
}
interface Observation {
  sourceSha256: string;
  requestSource: string;
  executed: Proof;
  nativeCompileSuccess: boolean;
  privateScriptId: string;
  privateVersion: string;
  nativeStudyInstanceId: null;
  editorMarkerArrays: null;
}
const revision = '962bbf90b269e98f26af84d86f7cb83972c11f44';
const base = 'v95/captures/v95/';
const bytes = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url));
const text = (path: string) => bytes(path).toString();
const json = <T>(path: string): T => JSON.parse(text(path)) as T;
const hash = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');
function csvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = '',
    quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"';
        index++;
      } else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(cell);
      cell = '';
    } else cell += char;
  }
  cells.push(cell);
  return cells;
}
const csv = (path: string) => {
  const [headers, ...rows] = text(path).trimEnd().split(/\r?\n/).map(csvLine);
  return { headers, rows };
};
const fields = [
  'A_DET',
  'A_RANK',
  'B_DET',
  'B_RANK',
  'EIGEN_COUNT',
  'EIGEN_0',
  'EIGEN_1',
  'INV_0_0',
  'INV_0_1',
  'INV_1_0',
  'INV_1_1',
  'PINV_0_0',
  'PINV_0_1',
  'PINV_1_0',
  'PINV_1_1',
  'EVEC_0_0',
  'EVEC_0_1',
  'EVEC_1_0',
  'EVEC_1_1',
];
const bits = (value: number) => {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value);
  return view.getBigUint64(0).toString(16);
};
const entries = [5, 6].map((version) => {
  const id = `v95-matrix-numerics-v${version}`;
  const folder = base + id + '/attempt-v1/';
  const numeric = json<Numeric>(folder + 'numeric-results-v1.json');
  const data = csv(numeric.csv.path);
  const mask = csv(numeric.closureMask.path);
  const get = (ordinal: number, title: string) => data.rows[ordinal - 1][data.headers.indexOf(title)];
  const source = text(folder + 'executed-v1.pine');
  const observation = json<Observation>(folder + 'observation-v1.json');
  const compiled = tryCompile(parse(source));
  if (!compiled.success) throw new Error(compiled.unsupported.join('\n'));
  // Execute the unchanged source through two full local phases. Join the second
  // cycle by native PHASE; no native index seed or target-derived input is used.
  const result = executeCompiled(
    compiled,
    Array.from({ length: 32 }, (_, i) => ({
      time: 1_700_000_000_000 + i * 120_000,
      open: 1,
      high: 1,
      low: 1,
      close: 1,
      volume: 1,
    })),
  )!;
  return { version, id, folder, numeric, data, mask, get, source, observation, result };
});

describe('v95 item19: exact native matrix numerics with orientation held', () => {
  it('binds all item19 source/transport/CSV artifacts and the v23 integrity/validation checkpoint', () => {
    const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as {
      revision: string;
      files: Proof[];
    };
    expect(lock.revision).toBe(revision);
    const common = [
      'v95/REQUEST-v95-v1.md',
      ...[
        'RESPONSE-v95-v23.md',
        'account-actions-v23.json',
        'attempt-inventory-v23.json',
        'numeric-controls-v23.json',
        'facet-capabilities-v23.json',
        'artifact-integrity-v23.json',
        'validation-result-v23.json',
      ].map((path) => base + path),
    ];
    const pinned = lock.files.filter((p) => common.includes(p.path) || p.path.includes('/v95-matrix-numerics-v'));
    expect(pinned).toHaveLength(80);
    const integrity = json<{ files: Proof[] }>(base + 'artifact-integrity-v23.json');
    for (const p of pinned) {
      const b = bytes(p.path);
      expect({ path: p.path, bytes: b.length, sha256: hash(b) }).toEqual(p);
      if (!p.path.endsWith('/artifact-integrity-v23.json') && !p.path.endsWith('/validation-result-v23.json')) {
        expect(integrity.files.find((f) => f.path === p.path)).toEqual(p);
      }
    }
    expect(json<{ status: string }>(base + 'validation-result-v23.json').status).toBe('PASS');
  });

  for (const s of entries) {
    it(`${s.id}: retains exact Save source, private ownership and successful unchanged compilation`, () => {
      expect(text(s.observation.requestSource)).toBe(s.source);
      expect(hash(bytes(s.observation.executed.path))).toBe(s.numeric.sourceSha256);
      expect(s.observation.sourceSha256).toBe(s.numeric.sourceSha256);
      const form = text(s.folder + 'save-request-v1.txt').replace(/\r\n/g, '\n');
      expect(form.split('name="source"\n\n')[1]?.split(/\n------WebKitFormBoundary/)[0]).toBe(s.source);
      expect(s.observation.nativeCompileSuccess).toBe(true);
      expect(s.observation.nativeStudyInstanceId).toBeNull();
      expect(s.observation.editorMarkerArrays).toBeNull();
      for (const body of ['save-response-v1.json', 'add-response-v1.json']) {
        expect(json<{ success: boolean }>(s.folder + body).success).toBe(true);
      }
      const binding = json<{
        columns: {
          columnOrdinal: number;
          originalHeader: string;
          owner: string;
          privateVersion?: string;
          sourceSha256?: string;
          sourceLiteralPlotOrdinal?: number;
        }[];
        missingOrAmbiguousRequestedPlotTitles: string[];
        unresolvedColumnOrdinals: number[];
      }>(s.numeric.columnBindings.path);
      expect(binding.missingOrAmbiguousRequestedPlotTitles).toEqual([]);
      expect(binding.unresolvedColumnOrdinals).toEqual([]);
      binding.columns.forEach((c, i) => {
        expect([c.columnOrdinal, c.originalHeader]).toEqual([i + 1, s.data.headers[i]]);
        if (i >= 6)
          expect(c).toMatchObject({
            owner: s.observation.privateScriptId,
            privateVersion: s.observation.privateVersion,
            sourceSha256: s.numeric.sourceSha256,
            sourceLiteralPlotOrdinal: i - 6,
          });
      });
      expect(checkProgram(parse(s.source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      expect(s.result.errors).toEqual([]);
    });

    it(`${s.id}: closes the selected block independently and keeps every other target row excluded`, () => {
      const rowObservation = json<{
        nativeObservationUtc: string;
        independentlyClosedRows: number;
        rawFirstRow: string[];
        rawLastRow: string[];
        samplingCompleteness: boolean;
      }>(s.folder + 'session-mode0-v1/row-set-observation-v1.json');
      expect(s.data.rows).toHaveLength(s.version === 5 ? 385 : 387);
      expect(s.mask.rows).toHaveLength(s.data.rows.length);
      let closed = 0;
      s.data.rows.forEach((row, i) => {
        const ordinal = i + 1;
        const mask = Object.fromEntries(s.mask.headers.map((h, j) => [h, s.mask.rows[i][j]]));
        const eligible =
          s.get(ordinal, 'CHART_CONFIRMED') === '1' &&
          (Number(s.get(ordinal, 'time')) + 120) * 1000 <= Date.parse(rowObservation.nativeObservationUtc);
        expect([mask.csv_sha256, mask.row_ordinal, mask.time_raw_seconds]).toEqual([
          s.numeric.csv.sha256,
          String(ordinal),
          row[0],
        ]);
        expect(mask.closed_numeric_eligible).toBe(eligible ? '1' : '0');
        expect(JSON.parse(mask.blank_column_ordinals)).toEqual(row.flatMap((cell, j) => (cell === '' ? [j + 1] : [])));
        expect(mask.present_cell_status).toBe(eligible ? 'OBSERVED' : 'OBSERVED / EXCLUDED');
        expect(mask.exclusion_cause).toBe(eligible ? '' : 'PHYSICALLY_OPEN_OR_NATIVE_CONFIRMATION_NOT_REACHED');
        expect(Number(s.get(ordinal, 'INPUT_INDEX'))).toBe(23338 + i);
        expect(Number(s.get(ordinal, 'INPUT_TIME'))).toBe(Number(row[0]) * 1000);
        expect(s.get(ordinal, 'IS_FIRST')).toBe('0');
        expect([s.get(ordinal, 'FIRST_INDEX'), s.get(ordinal, 'FIRST_TIME')]).toEqual(['0', '1789344000000']);
        if (eligible) closed++;
        if (ordinal < 7 || ordinal > 38)
          expect(s.numeric.records.some((r) => r.nativeCell.rowOrdinal === ordinal)).toBe(false);
      });
      expect(closed).toBe(s.version === 5 ? 384 : 386);
      expect(closed).toBe(rowObservation.independentlyClosedRows);
      expect([s.data.rows[0], s.data.rows.at(-1)]).toEqual([rowObservation.rawFirstRow, rowObservation.rawLastRow]);
      expect(rowObservation.samplingCompleteness).toBe(false);
      expect(s.numeric.selectedBlockDataRowOrdinals).toEqual(Array.from({ length: 32 }, (_, i) => i + 7));
      expect(s.numeric.strictOwnIndexZeroPrefixAvailable).toBe(false);
    });

    it(`${s.id}: binds candidate records without promoting irrational/precision hypotheses`, () => {
      const counts: Record<string, number> = {};
      for (const r of s.numeric.records) {
        for (const p of [r.nativeCell, ...r.inputCells, ...(r.dependencyCells ?? [])]) {
          expect(s.data.headers[p.columnOrdinal - 1]).toBe(p.headerRaw);
          expect(s.get(p.rowOrdinal, p.headerRaw)).toBe(p.valueRaw);
        }
        expect(s.numeric.selectedBlockDataRowOrdinals).toContain(r.nativeCell.rowOrdinal);
        expect(r.closedScoringEligible).toBe(true);
        expect(r.predictedBlank).toBe(false);
        counts[r.verdict] = (counts[r.verdict] ?? 0) + 1;
      }
      expect(counts).toEqual({ SUPPORTED: 288, UNDECIDED: 320 });
      expect(s.numeric.comparisonCounts).toEqual(counts);
      const orientation = json<{
        allSelectedTuplesNondiscriminating: boolean;
        orientationCertificate: string;
        signsFlippedOrNativeOrderChanged: boolean;
        rows: unknown[];
      }>(s.folder + 'eigen-orientation-discriminator-v1.json');
      expect(orientation.allSelectedTuplesNondiscriminating).toBe(true);
      expect(orientation.orientationCertificate).toContain('HELD');
      expect(orientation.signsFlippedOrNativeOrderChanged).toBe(false);
      expect(orientation.rows).toHaveLength(32);
      for (const ordinal of s.numeric.selectedBlockDataRowOrdinals) {
        expect(s.get(ordinal, 'EVEC_0_1')).toBe(s.get(ordinal, 'EVEC_1_0'));
        expect(s.get(ordinal, 'EIGEN_COUNT')).toBe('2');
      }
    });

    for (const family of ['det/rank/count', 'eigenvalues', 'inverse', 'pseudoinverse', 'eigenvectors']) {
      it(`${s.id}: matches ${family} native strings and binary64 bits without reordering/sign changes`, () => {
        const subset = fields.filter((f) =>
          family === 'det/rank/count'
            ? !f.includes('_0') && !f.includes('_1')
            : family === 'eigenvalues'
              ? /^EIGEN_[01]$/.test(f)
              : family === 'inverse'
                ? f.startsWith('INV_')
                : family === 'pseudoinverse'
                  ? f.startsWith('PINV_')
                  : f.startsWith('EVEC_'),
        );
        expect(subset.length).toBe(family === 'det/rank/count' ? 5 : family === 'eigenvalues' ? 2 : 4);
        expect(s.data.headers.slice(13)).toEqual(fields);
        let comparisons = 0;
        for (const ordinal of s.numeric.selectedBlockDataRowOrdinals) {
          const phase = Number(s.get(ordinal, 'INPUT_INDEX')) % 16;
          expect(s.get(ordinal, 'PHASE')).toBe(String(phase));
          for (const title of subset) {
            const raw = s.get(ordinal, title);
            expect(raw).not.toBe('');
            const actual = s.result.plots.find((p) => p.title === title)!.values[16 + phase] as number;
            expect(String(actual), `${s.id}:row${ordinal}:${title}`).toBe(raw);
            expect(bits(actual), `${s.id}:row${ordinal}:${title}:binary64`).toBe(bits(Number(raw)));
            comparisons++;
          }
        }
        expect(comparisons).toBe(32 * subset.length);
      });
    }
  }
});
