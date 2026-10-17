import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

interface Proof { path: string; bytes: number; sha256: string }
interface Pointer { rowOrdinal: number; columnOrdinal: number; headerRaw: string; valueRaw: string }
interface RecordProof { nativeCell: Pointer; inputCells: Pointer[]; dependencyCells?: Pointer[]; verdict: string }
interface Numeric {
  csv: Proof; closureMask: Proof; columnBindings: Proof; sourceSha256: string;
  selectedBlockDataRowOrdinals: number[]; selectedBlockOwnIndices: number[];
  strictOwnIndexZeroPrefixAvailable: boolean; records: RecordProof[]; comparisonCounts: Record<string, number>;
  facets: { facet: string; captureStatus: string; cause: string | null }[];
}
interface Observation {
  requestSource: Proof; executed: Proof; sourceForm: Proof; saveBody: Proof; addBody: Proof;
  nativeCompileSuccess: boolean; privateScriptId: string; privateVersion: string; sourceSha256: string;
  nativeStudyInstanceId: null; nativeStudyInstanceStatus: string;
}
interface Frontier {
  sourceSha256: string; csv: Proof; dataRows: number; prefixCriterion: string; prefixFailureCauses: string[];
  ownPrefixIndexGapsOrDuplicates: unknown[]; originContextViolationRowOrdinals: number[];
  strictOwnIndexZeroPrefixAvailable: boolean; primaryModelOwnIndices: number[]; primaryModelDataRowOrdinals: number[];
  nativeExportUtc: string; noCrossSessionStitching: boolean;
  physicalFirstRow: { raw: string[] }; physicalLastRow: { raw: string[] };
}
const revision = '913792b5f5c06fcc313cb9f2e1baf6356dafdf34';
const base = 'v97/captures/v97/';
const bytes = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url));
const text = (path: string) => bytes(path).toString('utf8');
const json = <T,>(path: string): T => JSON.parse(text(path)) as T;
const hash = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');
function csvLine(line: string): string[] {
  const cells: string[] = []; let cell = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (quoted && line[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted;
    } else if (line[i] === ',' && !quoted) { cells.push(cell); cell = ''; } else cell += line[i];
  }
  cells.push(cell); return cells;
}
function csv(path: string) {
  const [headers, ...rows] = text(path).trimEnd().split(/\r?\n/).map(csvLine);
  return { headers, rows };
}
const own = Array.from({ length: 128 }, (_, i) => i);
const controls = ['INPUT_INDEX', 'INPUT_TIME', 'CHART_CONFIRMED', 'IS_FIRST', 'FIRST_INDEX', 'FIRST_TIME', 'PHASE'];
const historyFields = ['X', 'LAG', 'DYNAMIC', 'DYNAMIC_NA', 'REC_X', 'COPY_X', 'REC_PAYLOAD', 'COPY_PAYLOAD',
  'PRIOR_X', 'PRIOR_PAYLOAD', 'PRIOR_NA'];
const typedFields = ['X', 'X_NA', 'NZ', 'FIXNAN', 'FIXNAN_NA', 'INT_CAST', 'INT_NA', 'FLOAT_CAST',
  'BOOL_ENCODE', 'BOOL_HISTORY_ENCODE', 'STRING_LENGTH', 'STRING_EMPTY_EQ', 'STRING_NA', 'STRING_NUMERIC_PARSE'];
const families = ['history-udt', 'typed-na', 'math-vectors'] as const;
const entries = families.flatMap(family => [5, 6].map(version => {
  const id = `v97-${family}-v${version}`, folder = base + id + '/attempt-v1/';
  const numeric = json<Numeric>(folder + 'numeric-results-v1.json');
  const observation = json<Observation>(folder + 'observation-v1.json');
  const data = csv(numeric.csv.path), mask = csv(numeric.closureMask.path);
  const frontier = json<Frontier>(folder + 'session-initial-v1/source-frontier-v1.json');
  const get = (index: number, title: string) => data.rows[index][data.headers.indexOf(title)];
  const source = text(observation.executed.path);
  const compiled = tryCompile(parse(source));
  if (!compiled.success) throw new Error(`${id}: ${compiled.unsupported.join('\n')}`);
  // Replay only this source's complete own 0..127 block, using original chart inputs.
  // No output-derived seed, phase join, prefix synthesis or session stitching.
  const bars = own.map(i => ({ time: Number(get(i, 'time')) * 1000,
    open: Number(get(i, 'open')), high: Number(get(i, 'high')), low: Number(get(i, 'low')),
    close: Number(get(i, 'close')), volume: Number(get(i, 'Volume')) }));
  const result = executeCompiled(compiled, bars, undefined, { runtime: { syminfo: { mintick: 0.01 } } });
  if (!result) throw new Error(`${id}: no compiled result`);
  const fields = family === 'history-udt' ? historyFields : family === 'typed-na' ? typedFields : ['RANDOM_A', 'RANDOM_B'];
  return { family, version, id, folder, numeric, observation, data, mask, frontier, get, source, result, fields };
}));

describe('v97 items7/10/14: own-origin history, Boolean/fixnan startup and seed7 stream', () => {
  it('authenticates the append-only fixture union and v14 integrity/validation', () => {
    const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as {
      revision: string; files: Proof[];
    };
    expect(lock.revision).toBe(revision);
    const common = ['v97/REQUEST-v97-v1.md', base + 'selection-inventory-v1.json', base + 'RESPONSE-v97-v14.md',
      ...['attempt-inventory', 'numeric-controls', 'facet-capabilities', 'account-actions', 'validation-result',
        'artifact-integrity'].map(name => `${base}${name}-v14.json`)];
    const selected = lock.files.filter(p => common.includes(p.path)
      || families.some(f => p.path.includes(`/v97-${f}-v`)));
    expect(selected).toHaveLength(87);
    const integrity = json<{ files: Proof[] }>(base + 'artifact-integrity-v14.json');
    for (const p of selected) {
      const b = bytes(p.path);
      expect({ path: p.path, bytes: b.length, sha256: hash(b) }).toEqual(p);
      if (p.path.includes('/attempt-v1/')) expect(integrity.files.find(f => f.path === p.path)).toEqual(p);
    }
    expect(json<{ status: string; primaryOwnClosedRows: number }>(base + 'validation-result-v14.json'))
      .toMatchObject({ status: 'PASS', primaryOwnClosedRows: 1792 });
  });

  for (const s of entries) {
    it(`${s.id}: retains exact source, private Save ownership and admission`, () => {
      expect(text(s.observation.requestSource.path)).toBe(s.source);
      expect(hash(bytes(s.observation.executed.path))).toBe(s.numeric.sourceSha256);
      expect(s.observation.sourceSha256).toBe(s.numeric.sourceSha256);
      const form = text(s.observation.sourceForm.path).replace(/\r\n/g, '\n');
      expect(form.split('name="source"\n\n')[1]?.split(/\n------WebKitFormBoundary/)[0]).toBe(s.source);
      expect(s.observation.nativeCompileSuccess).toBe(true);
      expect([s.observation.nativeStudyInstanceId, s.observation.nativeStudyInstanceStatus]).toEqual([null, 'UNOBSERVED']);
      for (const p of [s.observation.saveBody, s.observation.addBody]) expect(json<{ success: boolean }>(p.path).success).toBe(true);
      const binding = json<{ missingOrAmbiguousRequestedTitles: string[];
        columns: { columnOrdinal: number; originalHeader: string; owner: string; sourceSha256?: string;
          privateVersion?: string; sourceLiteralPlotOrdinal?: number }[] }>(s.numeric.columnBindings.path);
      expect(binding.missingOrAmbiguousRequestedTitles).toEqual([]);
      binding.columns.forEach((c, i) => {
        expect([c.columnOrdinal, c.originalHeader]).toEqual([i + 1, s.data.headers[i]]);
        if (i >= 6) expect(c).toMatchObject({ owner: s.observation.privateScriptId,
          privateVersion: s.observation.privateVersion, sourceSha256: s.numeric.sourceSha256, sourceLiteralPlotOrdinal: i - 6 });
      });
      expect(checkProgram(parse(s.source)).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
      expect(s.result.errors).toEqual([]);
    });

    it(`${s.id}: independently closes the unfiltered own 0..127 prefix`, () => {
      expect(s.frontier).toMatchObject({ sourceSha256: s.numeric.sourceSha256, csv: s.numeric.csv,
        strictOwnIndexZeroPrefixAvailable: true, prefixCriterion: 'CAPTURED / COMPLETE_OWN_INDEX_ZERO_PREFIX',
        prefixFailureCauses: [], ownPrefixIndexGapsOrDuplicates: [], originContextViolationRowOrdinals: [], noCrossSessionStitching: true });
      expect(s.numeric.strictOwnIndexZeroPrefixAvailable).toBe(true);
      expect(s.frontier.primaryModelOwnIndices).toEqual([0, 127]);
      expect(s.numeric.selectedBlockOwnIndices).toEqual([0, 127]);
      expect(s.numeric.selectedBlockDataRowOrdinals).toEqual(own.map(i => i + 1));
      expect(s.frontier.primaryModelDataRowOrdinals).toEqual(own.map(i => i + 1));
      expect(s.data.rows).toHaveLength(s.frontier.dataRows);
      expect(s.mask.rows).toHaveLength(s.data.rows.length);
      expect([s.data.rows[0], s.data.rows.at(-1)]).toEqual([s.frontier.physicalFirstRow.raw, s.frontier.physicalLastRow.raw]);
      // Verify contiguous source indices from the physical first row, preserving actual time gaps.
      expect(s.data.rows.every((_, i) => Number(s.get(i, 'INPUT_INDEX')) === i
        && Number(s.get(i, 'INPUT_TIME')) === Number(s.get(i, 'time')) * 1000
        && (i === 0 || Number(s.get(i, 'time')) > Number(s.get(i - 1, 'time'))))).toBe(true);
      for (const i of own) {
        const mask = Object.fromEntries(s.mask.headers.map((h, j) => [h, s.mask.rows[i][j]]));
        expect((Number(s.get(i, 'time')) + 120) * 1000).toBeLessThanOrEqual(Date.parse(s.frontier.nativeExportUtc));
        expect(s.get(i, 'CHART_CONFIRMED')).toBe('1');
        expect(mask).toMatchObject({ csv_sha256: s.numeric.csv.sha256, row_ordinal: String(i + 1),
          time_raw_seconds: s.get(i, 'time'), input_index_raw: String(i), closed_numeric_eligible: '1',
          present_cell_status: 'OBSERVED', exclusion_cause: '' });
        expect(JSON.parse(mask.blank_column_ordinals)).toEqual(s.data.rows[i].flatMap((v, j) => v === '' ? [j + 1] : []));
      }
    });

    it(`${s.id}: preserves every raw model pointer and its original verdict`, () => {
      const counts: Record<string, number> = {};
      for (const r of s.numeric.records) {
        counts[r.verdict] = (counts[r.verdict] ?? 0) + 1;
        for (const p of [r.nativeCell, ...r.inputCells, ...(r.dependencyCells ?? [])]) {
          expect(s.data.headers[p.columnOrdinal - 1]).toBe(p.headerRaw);
          expect(s.get(p.rowOrdinal - 1, p.headerRaw)).toBe(p.valueRaw);
        }
      }
      expect(counts).toEqual(s.numeric.comparisonCounts);
      // NATIVE_TARGET_VECTOR / UNDECIDED metadata is retained. Engine comparisons
      // below establish only these source-owned cells, not universal model hypotheses.
    });

    it(`${s.id}: matches 896 own-origin input/control cells without rebasing`, () => {
      for (const title of controls) {
        const plot = s.result.plots.find(p => p.title === title)!;
        expect(plot.values).toHaveLength(128);
        for (const i of own) expect(plot.values[i], `${s.id}:${i}:${title}`).toBe(Number(s.get(i, title)));
      }
      expect(s.get(0, 'IS_FIRST')).toBe('1');
      expect(s.get(0, 'FIRST_INDEX')).toBe('0');
      expect(s.get(0, 'FIRST_TIME')).toBe(s.get(0, 'INPUT_TIME'));
    });

    it(`${s.id}: matches every primary scoped target including blank startup cells`, () => {
      for (const title of s.fields) {
        const plot = s.result.plots.find(p => p.title === title)!;
        expect(plot.values).toHaveLength(128);
        for (const i of own) {
          const raw = s.get(i, title);
          expect(plot.values[i], `${s.id}:own${i}:${title}:native=${raw}`).toBe(raw === '' ? null : Number(raw));
          // Random output must also reproduce every exported decimal string exactly.
          if (s.family === 'math-vectors') expect(String(plot.values[i])).toBe(raw);
        }
      }
      expect(s.fields.length * own.length).toBe(s.family === 'history-udt' ? 1408 : s.family === 'typed-na' ? 1792 : 256);
    });

    if (s.family === 'history-udt') it(`${s.id}: derives shallow copying and first prior NA but holds absent negative-lag opportunities`, () => {
      for (const i of own) {
        const p = i % 16, lag = p % 5;
        const expected = { X: p, LAG: lag, DYNAMIC: (i - lag) % 16, DYNAMIC_NA: 0,
          REC_X: p + 100, COPY_X: p + 200, REC_PAYLOAD: p + 300, COPY_PAYLOAD: p + 300,
          PRIOR_X: i === 0 ? null : (i - 1) % 16 + 100,
          PRIOR_PAYLOAD: i === 0 ? null : (i - 1) % 16 + 300, PRIOR_NA: i === 0 ? 1 : 0 };
        for (const [title, value] of Object.entries(expected)) expect(s.get(i, title)).toBe(value === null ? '' : String(value));
        expect(lag).toBeLessThanOrEqual(i);
      }
      expect(s.numeric.facets.find(f => f.facet === 'Negative dynamic-history dependency before own origin'))
        .toMatchObject({ captureStatus: 'NOT OBSERVED' });
      // DYNAMIC_NA=1 never occurs here: do not manufacture a pre-origin dynamic read.
    });

    if (s.family === 'typed-na') it(`${s.id}: derives Boolean pre-origin encoding and unseeded fixnan startup`, () => {
      for (const i of own) {
        const x = ['', '-2.9', '0', '2.9'][i % 4];
        expect(s.get(i, 'X')).toBe(x);
        expect(s.get(i, 'FIXNAN')).toBe(i === 0 ? '' : i % 4 === 0 ? '2.9' : x);
        expect(s.get(i, 'FIXNAN_NA')).toBe(i === 0 ? '1' : '0');
        expect(s.get(i, 'BOOL_ENCODE')).toBe(i % 4 === 0 ? (s.version === 5 ? '-1' : '0') : i % 4 === 2 ? '0' : '1');
        expect(s.get(i, 'BOOL_HISTORY_ENCODE')).toBe(i === 0 ? (s.version === 5 ? '-1' : '0') : i % 2 === 1 ? '1' : '0');
      }
    });

    if (s.family === 'math-vectors') it(`${s.id}: replays seed7 with an independent integer recurrence and distinct equal streams`, () => {
      // java.util.Random nextDouble: specified 48-bit recurrence, already witnessed
      // by seed42; no output/seed fit. Literal seed7 is taken from unchanged source.
      expect(s.source).toContain('math.random(0.0, 1.0, 7)');
      let state = (7n ^ 25214903917n) % (2n ** 48n);
      for (const i of own) {
        state = (state * 25214903917n + 11n) % (2n ** 48n); const high = state / (2n ** 22n);
        state = (state * 25214903917n + 11n) % (2n ** 48n); const low = state / (2n ** 21n);
        const predicted = Number(high * (2n ** 27n) + low) / (2 ** 53);
        expect(String(predicted)).toBe(s.get(i, 'RANDOM_A'));
        expect(s.get(i, 'RANDOM_A')).toBe(s.get(i, 'RANDOM_B'));
      }
      expect(s.get(0, 'RANDOM_A')).toBe('0.7306990420600421');
      // This fresh stream closes only its own prefix, not the omitted v95 frontier,
      // unseeded calls, realtime updates, changing seeds or arbitrary PRNG families.
    });
  }
});
