import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

interface Proof { path: string; bytes: number; sha256: string }
interface Pointer { rowOrdinal: number; columnOrdinal: number; headerRaw: string; valueRaw: string }
interface NumericRecord {
  property: string; model: string; verdict: string; nativeCell: Pointer;
  inputCells: Pointer[]; dependencyCells?: Pointer[]; predictedRational: string | null; predictedBlank: boolean; cause: string | null;
  closedScoringEligible: boolean;
}
interface Numeric {
  sourceSha256: string; csv: Proof; closureMask: Proof; columnBindings: Proof;
  selectedBlockDataRowOrdinals: number[]; strictOwnIndexZeroPrefixAvailable: boolean;
  records: NumericRecord[]; comparisonCounts: Record<string, number>;
  facets: { facet: string; captureStatus: string; hypothesisVerdict: string; cause: string | null }[];
}
interface Observation {
  sourceSha256: string; requestSource: string; executed: Proof; nativeCompileSuccess: boolean;
  privateScriptId: string; privateVersion: string; nativeStudyInstanceId: null; editorMarkerArrays: null;
}
const revision = '1273152e44a024bbf5b3d6830a4bbd1e7be55f63';
const base = 'v95/captures/v95/';
const bytes = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url));
const text = (path: string) => bytes(path).toString();
const json = <T,>(path: string): T => JSON.parse(text(path)) as T;
const hash = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');
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
  const [headers, ...rows] = text(path).trimEnd().split(/\r?\n/).map(csvLine);
  return { headers, rows };
};
const alphabet = '0123456789.-:+/ ABXYZabcxyzNn';
const strings = { REPLACE: 'ABxy', ALL: 'xyxy', REPEAT: 'x-x-x', SUBSTRING: 'Bxy' };
const fields = [
  ...Object.keys(strings).map(prefix => `${prefix}_LEN`),
  ...Object.entries(strings).flatMap(([prefix, value]) => Array.from(value, (_, i) => `${prefix}_C${i}`)),
  'ENCODER_0', 'ENCODER_A', 'PARTS', 'PART0_LEN', 'PART1_LEN', 'PART2_LEN',
  'PART0_CODE', 'PART1_CODE', 'PART2_CODE', 'NO_MATCH_POS', 'NO_MATCH_NA', 'TRIM_EQ', 'UPPER_EQ', 'LOWER_EQ', 'TONUMBER',
];
const nativeValue = (raw: string) => raw === '' ? null : Number(raw);
const rationalValue = (raw: string | null) => {
  if (raw === null) return null;
  const [n, d = '1'] = raw.split('/');
  return Number(n) / Number(d);
};
const entries = [5, 6].map(version => {
  const id = `v95-string-operations-v${version}`;
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
  const result = executeCompiled(compiled, Array.from({ length: 32 }, (_, i) => ({
    time: 1_700_000_000_000 + i * 120_000, open: 1, high: 1, low: 1, close: 1, volume: 1,
  })))!;
  return { version, id, folder, numeric, data, mask, get, source, observation, result };
});

describe('v95 item16: bounded string operations and observed missing position', () => {
  it('binds all item16 source/transport/CSV artifacts and the v17 integrity/validation checkpoint', () => {
    const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as {
      revision: string; files: Proof[];
    };
    expect(lock.revision).toBe(revision);
    const common = ['v95/REQUEST-v95-v1.md', ...['RESPONSE-v95-v17.md', 'account-actions-v17.json',
      'attempt-inventory-v17.json', 'numeric-controls-v17.json', 'facet-capabilities-v17.json',
      'artifact-integrity-v17.json', 'validation-result-v17.json'].map(path => base + path)];
    const pinned = lock.files.filter(p => common.includes(p.path) || p.path.includes('/v95-string-operations-v'));
    expect(pinned).toHaveLength(76);
    const integrity = json<{ files: Proof[] }>(base + 'artifact-integrity-v17.json');
    for (const p of pinned) {
      const b = bytes(p.path);
      expect({ path: p.path, bytes: b.length, sha256: hash(b) }).toEqual(p);
      if (!p.path.endsWith('/artifact-integrity-v17.json') && !p.path.endsWith('/validation-result-v17.json')) {
        expect(integrity.files.find(f => f.path === p.path)).toEqual(p);
      }
    }
    expect(json<{ status: string }>(base + 'validation-result-v17.json').status).toBe('PASS');
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
      const binding = json<{ columns: { columnOrdinal: number; originalHeader: string;
        owner: string; privateVersion?: string; sourceSha256?: string; sourceLiteralPlotOrdinal?: number }[];
        missingOrAmbiguousRequestedPlotTitles: string[]; unresolvedColumnOrdinals: number[] }>(s.numeric.columnBindings.path);
      expect(binding.missingOrAmbiguousRequestedPlotTitles).toEqual([]);
      expect(binding.unresolvedColumnOrdinals).toEqual([]);
      binding.columns.forEach((c, i) => {
        expect([c.columnOrdinal, c.originalHeader]).toEqual([i + 1, s.data.headers[i]]);
        if (i >= 6) expect(c).toMatchObject({ owner: s.observation.privateScriptId,
          privateVersion: s.observation.privateVersion, sourceSha256: s.numeric.sourceSha256, sourceLiteralPlotOrdinal: i - 6 });
      });
      expect(checkProgram(parse(s.source)).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
      expect(s.result.errors).toEqual([]);
    });

    it(`${s.id}: closes the selected block independently and keeps every other target row excluded`, () => {
      const rowObservation = json<{ nativeObservationUtc: string; independentlyClosedRows: number;
        rawFirstRow: string[]; rawLastRow: string[]; samplingCompleteness: boolean }>(s.folder + 'session-mode0-v1/row-set-observation-v1.json');
      expect(s.data.rows).toHaveLength(s.version === 5 ? 368 : 371);
      expect(s.mask.rows).toHaveLength(s.data.rows.length);
      let closed = 0;
      s.data.rows.forEach((row, i) => {
        const ordinal = i + 1;
        const mask = Object.fromEntries(s.mask.headers.map((h, j) => [h, s.mask.rows[i][j]]));
        const eligible = s.get(ordinal, 'CHART_CONFIRMED') === '1'
          && (Number(s.get(ordinal, 'time')) + 120) * 1000 <= Date.parse(rowObservation.nativeObservationUtc);
        expect([mask.csv_sha256, mask.row_ordinal, mask.time_raw_seconds])
          .toEqual([s.numeric.csv.sha256, String(ordinal), row[0]]);
        expect(mask.closed_numeric_eligible).toBe(eligible ? '1' : '0');
        expect(JSON.parse(mask.blank_column_ordinals)).toEqual(row.flatMap((cell, j) => cell === '' ? [j + 1] : []));
        expect(mask.present_cell_status).toBe(eligible ? 'OBSERVED' : 'OBSERVED / EXCLUDED');
        expect(mask.exclusion_cause).toBe(eligible ? '' : 'PHYSICALLY_OPEN_OR_NATIVE_CONFIRMATION_NOT_REACHED');
        expect(Number(s.get(ordinal, 'INPUT_INDEX'))).toBe(23338 + i);
        expect(Number(s.get(ordinal, 'INPUT_TIME'))).toBe(Number(row[0]) * 1000);
        expect(s.get(ordinal, 'IS_FIRST')).toBe('0');
        expect([s.get(ordinal, 'FIRST_INDEX'), s.get(ordinal, 'FIRST_TIME')]).toEqual(['0', '1789344000000']);
        if (eligible) closed++;
        if (ordinal < 7 || ordinal > 38) expect(s.numeric.records.some(r => r.nativeCell.rowOrdinal === ordinal)).toBe(false);
      });
      expect(closed).toBe(s.version === 5 ? 367 : 370);
      expect(closed).toBe(rowObservation.independentlyClosedRows);
      expect([s.data.rows[0], s.data.rows.at(-1)]).toEqual([rowObservation.rawFirstRow, rowObservation.rawLastRow]);
      expect(rowObservation.samplingCompleteness).toBe(false);
      expect(s.numeric.selectedBlockDataRowOrdinals).toEqual(Array.from({ length: 32 }, (_, i) => i + 7));
      expect(s.numeric.strictOwnIndexZeroPrefixAvailable).toBe(false);
      expect(s.numeric.facets).toHaveLength(417);
      expect(s.numeric.facets.every(f => f.captureStatus === 'CAPTURED')).toBe(true);
    });

    it(`${s.id}: authenticates all hypotheses while keeping no-match position UNDECIDED`, () => {
      const verdicts = { SUPPORTED: 0, REFUTED: 0, UNDECIDED: 0 };
      for (const r of s.numeric.records) {
        for (const p of [r.nativeCell, ...r.inputCells, ...(r.dependencyCells ?? [])]) {
          expect(s.data.headers[p.columnOrdinal - 1]).toBe(p.headerRaw);
          expect(s.get(p.rowOrdinal, p.headerRaw)).toBe(p.valueRaw);
        }
        expect(s.numeric.selectedBlockDataRowOrdinals).toContain(r.nativeCell.rowOrdinal);
        expect(r.closedScoringEligible).toBe(true);
        if (r.verdict === 'SUPPORTED') {
          verdicts.SUPPORTED++;
          expect(nativeValue(r.nativeCell.valueRaw)).toBe(rationalValue(r.predictedRational));
        } else if (r.verdict === 'REFUTED') {
          verdicts.REFUTED++;
          expect(['FIRST_OCCURRENCE_ALTERNATIVE', 'SPLIT_DROPS_EMPTY_FIELD']).toContain(r.model);
          expect(nativeValue(r.nativeCell.valueRaw)).not.toBe(rationalValue(r.predictedRational));
        } else {
          verdicts.UNDECIDED++;
          expect(r).toMatchObject({ verdict: 'UNDECIDED', property: 'NO_MATCH_POS', model: 'NATIVE_TARGET_VECTOR',
            predictedRational: null, predictedBlank: false });
          expect(r.nativeCell.valueRaw).toBe('');
          expect(r.cause).toBe('Actual no-match position preserved; no -1/0/NA substitution');
        }
      }
      expect(verdicts).toEqual({ SUPPORTED: 1184, REFUTED: 288, UNDECIDED: 32 });
      expect(s.numeric.comparisonCounts).toEqual(verdicts);
    });

    for (const [prefix, expected] of Object.entries(strings)) {
      it(`${s.id}: decodes the complete ${prefix} witness as ${expected}`, () => {
        for (const ordinal of s.numeric.selectedBlockDataRowOrdinals) {
          const length = Number(s.get(ordinal, `${prefix}_LEN`));
          const codes = Array.from({ length: expected.length }, (_, i) => Number(s.get(ordinal, `${prefix}_C${i}`)));
          expect(length).toBe(expected.length);
          expect(codes).toEqual(Array.from(expected, char => alphabet.indexOf(char)));
          expect(codes.map(code => alphabet[code]).join('')).toBe(expected);
        }
      });
    }

    it(`${s.id}: pins the complete split distribution including the middle empty field`, () => {
      for (const ordinal of s.numeric.selectedBlockDataRowOrdinals) {
        expect(s.get(ordinal, 'PARTS')).toBe('3');
        expect([0, 1, 2].map(i => s.get(ordinal, `PART${i}_LEN`))).toEqual(['1', '0', '1']);
        expect([0, 1, 2].map(i => s.get(ordinal, `PART${i}_CODE`))).toEqual(['21', '-1', '22']);
      }
    });

    it(`${s.id}: returns engine NA on every witnessed no-match position, with its flag set`, () => {
      for (const ordinal of s.numeric.selectedBlockDataRowOrdinals) {
        const phase = Number(s.get(ordinal, 'PHASE'));
        expect(s.get(ordinal, 'NO_MATCH_POS')).toBe('');
        expect(s.get(ordinal, 'NO_MATCH_NA')).toBe('1');
        expect(s.result.plots.find(p => p.title === 'NO_MATCH_POS')!.values[16 + phase]).toBeNull();
        expect(s.result.plots.find(p => p.title === 'NO_MATCH_NA')!.values[16 + phase]).toBe(1);
      }
    });

    it(`${s.id}: matches all 35 operation/encoder columns exactly on the selected closed rows`, () => {
      let comparisons = 0;
      const phases = Array(16).fill(0) as number[];
      expect(fields).toHaveLength(35);
      expect(s.data.headers.slice(13)).toEqual(fields);
      for (const ordinal of s.numeric.selectedBlockDataRowOrdinals) {
        const phase = Number(s.get(ordinal, 'INPUT_INDEX')) % 16;
        phases[phase]++;
        expect(s.get(ordinal, 'PHASE')).toBe(String(phase));
        expect(['ENCODER_0', 'ENCODER_A', 'TRIM_EQ', 'UPPER_EQ', 'LOWER_EQ', 'TONUMBER'].map(f => s.get(ordinal, f)))
          .toEqual(['0', '16', '1', '1', '1', '-2.5']);
        for (const title of fields) {
          expect(s.result.plots.find(p => p.title === title)!.values[16 + phase], `${s.id}:row${ordinal}:${title}`)
            .toBe(nativeValue(s.get(ordinal, title)));
          comparisons++;
        }
        expect(s.result.plots.find(p => p.title === 'PHASE')!.values[16 + phase]).toBe(phase);
      }
      expect(phases).toEqual(Array(16).fill(2));
      expect(comparisons).toBe(1120);
    });
  }
});
