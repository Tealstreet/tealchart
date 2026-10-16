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
const revision = '2cd3ce9c10108bb48664e722001e731c636583ba';
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
const fields = ['X', 'MINTICK', 'TICK_INPUT', 'ROUND', 'ROUND1', 'FLOOR', 'CEIL', 'INT',
  'TICK_ROUND', 'MIN', 'MAX', 'AVG', 'ABS', 'POW', 'EXP', 'LOG_INPUT', 'LOG', 'SUM3'];
const nativeValue = (raw: string) => raw === '' ? null : Number(raw);
const rationalValue = (raw: string | null) => {
  if (raw === null) return null;
  const [n, d = '1'] = raw.split('/');
  return Number(n) / Number(d);
};
const entries = [5, 6].map(version => {
  const id = `v95-math-vectors-v${version}`;
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
  })), undefined, { runtime: { syminfo: { mintick: 0.01 } } })!;
  return { version, id, folder, numeric, data, mask, get, source, observation, result };
});

describe('v95 item14: closed math vectors and held random stream', () => {
  it('binds all item14 source/transport/CSV artifacts and the v13 integrity/validation checkpoint', () => {
    const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as {
      revision: string; files: Proof[];
    };
    expect(lock.revision).toBe(revision);
    const common = ['v95/REQUEST-v95-v1.md', ...['RESPONSE-v95-v13.md', 'account-actions-v13.json',
      'attempt-inventory-v13.json', 'numeric-controls-v13.json', 'facet-capabilities-v13.json',
      'artifact-integrity-v13.json', 'validation-result-v13.json'].map(path => base + path)];
    const pinned = lock.files.filter(p => common.includes(p.path) || p.path.includes('/v95-math-vectors-v'));
    expect(pinned).toHaveLength(76);
    const integrity = json<{ files: Proof[] }>(base + 'artifact-integrity-v13.json');
    for (const p of pinned) {
      const b = bytes(p.path);
      expect({ path: p.path, bytes: b.length, sha256: hash(b) }).toEqual(p);
      if (!p.path.endsWith('/artifact-integrity-v13.json') && !p.path.endsWith('/validation-result-v13.json')) {
        expect(integrity.files.find(f => f.path === p.path)).toEqual(p);
      }
    }
    expect(json<{ status: string }>(base + 'validation-result-v13.json').status).toBe('PASS');
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
      expect(s.data.rows).toHaveLength(s.version === 5 ? 357 : 359);
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
        if (ordinal < 7 || ordinal > 70) expect(s.numeric.records.some(r => r.nativeCell.rowOrdinal === ordinal)).toBe(false);
      });
      expect(closed).toBe(s.version === 5 ? 356 : 358);
      expect(closed).toBe(rowObservation.independentlyClosedRows);
      expect([s.data.rows[0], s.data.rows.at(-1)]).toEqual([rowObservation.rawFirstRow, rowObservation.rawLastRow]);
      expect(rowObservation.samplingCompleteness).toBe(false);
      expect(s.numeric.selectedBlockDataRowOrdinals).toEqual(Array.from({ length: 64 }, (_, i) => i + 7));
      expect(s.numeric.strictOwnIndexZeroPrefixAvailable).toBe(false);
      expect(s.numeric.facets.find(f => f.facet.includes('Own index-zero'))).toMatchObject({
        captureStatus: 'NOT OBSERVED', hypothesisVerdict: 'UNDECIDED',
        cause: 'Own startup input prefix omitted; sampled random values do not establish the full seed/stream identity',
      });
    });

    it(`${s.id}: authenticates model records and preserves raw target/precision verdicts`, () => {
      const verdicts = { SUPPORTED: 0, REFUTED: 0, UNDECIDED: 0 };
      for (const r of s.numeric.records) {
        for (const p of [r.nativeCell, ...r.inputCells, ...(r.dependencyCells ?? [])]) {
          expect(s.data.headers[p.columnOrdinal - 1]).toBe(p.headerRaw);
          expect(s.get(p.rowOrdinal, p.headerRaw)).toBe(p.valueRaw);
        }
        expect(s.numeric.selectedBlockDataRowOrdinals).toContain(r.nativeCell.rowOrdinal);
        expect(r.closedScoringEligible).toBe(!['RANDOM_A', 'RANDOM_B'].includes(r.property));
        if (r.verdict === 'SUPPORTED') {
          verdicts.SUPPORTED++;
          expect(nativeValue(r.nativeCell.valueRaw)).toBe(rationalValue(r.predictedRational));
        } else if (r.verdict === 'REFUTED') {
          verdicts.REFUTED++;
          expect(r.property).toBe('ROUND');
          expect(['TIES_UP', 'TIES_EVEN']).toContain(r.model);
          expect(nativeValue(r.nativeCell.valueRaw)).not.toBe(rationalValue(r.predictedRational));
        } else {
          verdicts.UNDECIDED++;
          expect(r.verdict).toBe('UNDECIDED');
          expect(['AVG', 'TICK_ROUND', 'TICK_INPUT', 'POW', 'EXP', 'LOG', 'RANDOM_A', 'RANDOM_B']).toContain(r.property);
        }
      }
      expect(verdicts).toEqual({ SUPPORTED: 888, REFUTED: 80, UNDECIDED: 504 });
      expect(s.numeric.comparisonCounts).toEqual(verdicts);
    });

    it(`${s.id}: matches every selected half-tie, signed scalar and three-input sum exactly`, () => {
      let comparisons = 0;
      const phases = Array(16).fill(0) as number[];
      for (const ordinal of s.numeric.selectedBlockDataRowOrdinals) {
        const phase = Number(s.get(ordinal, 'INPUT_INDEX')) % 16;
        const x = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5][phase % 6];
        phases[phase]++;
        expect(s.get(ordinal, 'PHASE')).toBe(String(phase));
        expect(s.get(ordinal, 'X')).toBe(String(x));
        const expected: Record<string, number> = { ROUND: Math.sign(x) * Math.ceil(Math.abs(x)), ROUND1: x,
          FLOOR: Math.floor(x), CEIL: Math.ceil(x), INT: Math.trunc(x), MIN: Math.min(x, 0, 1),
          MAX: Math.max(x, 0, 1), ABS: Math.abs(x), LOG_INPUT: Math.abs(x) + 1 };
        for (const [title, value] of Object.entries(expected)) expect(s.get(ordinal, title)).toBe(String(value));
        const sum = [ordinal - 2, ordinal - 1, ordinal].reduce((total, i) => {
          expect(Number(s.get(i, 'INPUT_INDEX'))).toBe(Number(s.get(ordinal, 'INPUT_INDEX')) + i - ordinal);
          expect(s.get(i, 'CHART_CONFIRMED')).toBe('1');
          return total + Number(s.get(i, 'X'));
        }, 0);
        expect(s.get(ordinal, 'SUM3')).toBe(String(sum));
        for (const title of ['ROUND', 'ROUND1', 'FLOOR', 'CEIL', 'INT', 'MIN', 'MAX', 'ABS', 'LOG_INPUT', 'SUM3']) {
          expect(String(s.result.plots.find(p => p.title === title)!.values[16 + phase]), `${s.id}:row${ordinal}:${title}`)
            .toBe(s.get(ordinal, title));
          comparisons++;
        }
        expect(s.result.plots.find(p => p.title === 'PHASE')!.values[16 + phase]).toBe(phase);
      }
      expect(phases).toEqual(Array(16).fill(4));
      expect(comparisons).toBe(640);
    });

    for (const title of fields.filter(f => !['ROUND', 'ROUND1', 'FLOOR', 'CEIL', 'INT', 'MIN', 'MAX', 'ABS', 'LOG_INPUT', 'SUM3'].includes(f))) {
      it(`${s.id}: matches all 64 ${title} binary64 outputs against the original native strings`, () => {
        for (const ordinal of s.numeric.selectedBlockDataRowOrdinals) {
          const phase = Number(s.get(ordinal, 'PHASE'));
          const nativeRaw = s.get(ordinal, title);
          const value = s.result.plots.find(p => p.title === title)!.values[16 + phase];
          expect(nativeRaw).not.toBe('');
          expect(typeof value).toBe('number');
          expect(value, `${s.id}:row${ordinal}:${title}:native=${nativeRaw}`).toBe(Number(nativeRaw));
          expect(String(value), `${s.id}:row${ordinal}:${title}`).toBe(nativeRaw);
        }
      });
    }

    it(`${s.id}: pins random outputs as observed held targets without replaying their stream`, () => {
      const targets = s.numeric.records.filter(r => ['RANDOM_A', 'RANDOM_B'].includes(r.property));
      expect(targets).toHaveLength(128);
      for (const r of targets) {
        expect(r).toMatchObject({ verdict: 'UNDECIDED', model: 'NATIVE_TARGET_VECTOR', predictedRational: null,
          closedScoringEligible: false, exclusionCause: 'OWN_INDEX_ZERO_PREFIX_NOT_EXPORTED' });
        expect(r.nativeCell.valueRaw).not.toBe('');
      }
    });
  }
});
