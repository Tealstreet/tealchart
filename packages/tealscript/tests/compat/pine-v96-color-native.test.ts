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
interface Source {
  sourceId: string;
  sourceSha256: string;
  csv: Proof;
  closureMask: Proof;
  columnBindings: Proof;
  selectedDataRowOrdinals: number[];
  comparisonCounts: Record<string, number>;
  rows: {
    rowOrdinal: number;
    allRequestedRawCells: Pointer[];
    nativeContextCells: Pointer[];
    comparisons: { model: string; property: string; verdict: string }[];
  }[];
}
const revision = '735d1b508a36ce359bcdfb837e995acaeb1d0af8';
const base = 'v96/captures/v96/';
const raw = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url));
const text = (path: string) => raw(path).toString();
const json = <T>(path: string): T => JSON.parse(text(path)) as T;
const hash = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');
function cells(line: string): string[] {
  const result: string[] = [];
  let cell = '',
    quoted = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (quoted && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (line[i] === ',' && !quoted) {
      result.push(cell);
      cell = '';
    } else cell += line[i];
  }
  result.push(cell);
  return result;
}
function csv(path: string) {
  const [headers, ...rows] = text(path).trimEnd().split(/\r?\n/).map(cells);
  return { headers, rows: rows.map((row) => Object.fromEntries(headers.map((h, i) => [h, row[i]]))) };
}
const sources = json<{ sources: Source[] }>(base + 'numeric-controls-v1.json').sources;
const entries = sources.map((s) => {
  const folder = base + s.sourceId + '/attempt-v1/';
  const source = text(folder + 'executed-v1.pine');
  const data = csv(s.csv.path);
  const mask = csv(s.closureMask.path);
  const compiled = tryCompile(parse(source));
  if (!compiled.success) throw new Error(compiled.unsupported.join('\n'));
  const bars = s.selectedDataRowOrdinals.map((i) => {
    const r = data.rows[i - 1];
    return {
      time: Number(r.time) * 1000,
      open: Number(r.open),
      high: Number(r.high),
      low: Number(r.low),
      close: Number(r.close),
      volume: Number(r.Volume),
    };
  });
  const result = executeCompiled(compiled, bars)!;
  return { s, folder, source, data, mask, result };
});
const tuples: Record<string, number[]> = {
  G12: [33, 66, 99, 13, 0],
  G22: [33, 66, 99, 23, 0],
  G32: [33, 66, 98, 33, 0],
  CLAMP: [0, 0, 0, 50, 0],
  MISSING: [255, 0, 0, 50, 0],
};

describe('native v96 gradient equality and raw channels; constructor controls retain their own contrary records', () => {
  it('binds the complete v96 return, sources, numeric controls, integrity and validation', () => {
    const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as {
      revision: string;
      files: Proof[];
    };
    expect(lock.revision).toBe(revision);
    const files = lock.files.filter((f) => f.path.startsWith('v96/'));
    expect(files).toHaveLength(117);
    const inventory = json<{ files: Proof[] }>(base + 'artifact-integrity-v1.json');
    for (const f of files) {
      const bytes = raw(f.path);
      expect({ path: f.path, bytes: bytes.length, sha256: hash(bytes) }).toEqual(f);
      if (!f.path.endsWith('/artifact-integrity-v1.json'))
        expect(inventory.files.find((p) => p.path === f.path)).toEqual(f);
    }
    expect(json(base + 'validation-result-v1.json')).toMatchObject({
      status: 'PASS',
      dataRows: 617,
      independentlyClosedRows: 615,
      rawCellPointers: 10944,
      numericComparisons: 4224,
      verdict_SUPPORTED: 2688,
      verdict_REFUTED: 1280,
      verdict_UNDECIDED: 256,
    });
  });

  for (const e of entries) {
    it(`${e.s.sourceId}: authenticates unchanged native Save/Add sources and all declared pointers`, () => {
      expect(e.source).toBe(text(`v96/sources/${e.s.sourceId}.pine`));
      expect(hash(Buffer.from(e.source))).toBe(e.s.sourceSha256);
      const form = text(e.folder + 'save-request-v1.txt').replace(/\r\n/g, '\n');
      expect(form.split('name="source"\n\n')[1]?.split(/\n------WebKitFormBoundary/)[0]).toBe(e.source);
      for (const file of ['save-response-v1.json', 'add-response-v1.json'])
        expect(json<{ success: boolean }>(e.folder + file).success).toBe(true);
      expect(checkProgram(parse(e.source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      expect(e.result.errors).toEqual([]);
      const binding = json<{
        columns: {
          columnOrdinal: number;
          originalHeader: string;
          owner: string;
          sourceSha256?: string;
          privateVersion?: string;
        }[];
        missingOrAmbiguousRequestedPlotTitles: unknown[];
        unresolvedColumnOrdinals: number[];
        actuallyExportedColorerColumns: unknown[];
        nativePrivateId: string;
      }>(e.s.columnBindings.path);
      expect(binding.missingOrAmbiguousRequestedPlotTitles).toEqual([]);
      expect(binding.unresolvedColumnOrdinals).toEqual([]);
      expect(binding.actuallyExportedColorerColumns).toEqual([]);
      for (const c of binding.columns) {
        expect(e.data.headers[c.columnOrdinal - 1]).toBe(c.originalHeader);
        if (c.columnOrdinal > 6)
          expect(c).toMatchObject({
            owner: binding.nativePrivateId,
            sourceSha256: e.s.sourceSha256,
            privateVersion: '1.0',
          });
      }
      let pointers = 0;
      for (const row of e.s.rows) {
        expect(e.s.selectedDataRowOrdinals).toContain(row.rowOrdinal);
        for (const p of [...row.allRequestedRawCells, ...row.nativeContextCells]) {
          expect(e.data.headers[p.columnOrdinal - 1]).toBe(p.headerRaw);
          expect(e.data.rows[p.rowOrdinal - 1][p.headerRaw]).toBe(p.valueRaw);
          pointers++;
        }
      }
      expect(pointers).toBe(32 * 65);
    });

    it(`${e.s.sourceId}: derives closure and excludes all developing/out-of-block rows without sampling completeness`, () => {
      const obs = json<{
        nativeExportUtc: string;
        independentlyClosedRows: number;
        rawFirstRow: string[];
        rawLastRow: string[];
        samplingCompleteness: boolean;
      }>(e.folder + 'session-mode0-v1/row-set-observation-v1.json');
      const closed: number[] = [];
      expect(e.mask.rows).toHaveLength(e.data.rows.length);
      for (const [i, r] of e.data.rows.entries()) {
        const m = e.mask.rows[i];
        const eligible = r.CHART_CONFIRMED === '1' && (Number(r.time) + 120) * 1000 <= Date.parse(obs.nativeExportUtc);
        expect(m.csv_sha256).toBe(e.s.csv.sha256);
        expect(m.row_ordinal).toBe(String(i + 1));
        expect(m.closed_numeric_eligible).toBe(eligible ? '1' : '0');
        expect(Number(r.INPUT_TIME)).toBe(Number(r.time) * 1000);
        expect(JSON.parse(m.blank_column_ordinals)).toEqual(
          e.data.headers.flatMap((h, j) => (r[h] === '' ? [j + 1] : [])),
        );
        if (eligible) closed.push(i + 1);
        else {
          expect(m.present_cell_status).toBe('OBSERVED / EXCLUDED');
          expect(m.exclusion_cause).toBe('PHYSICALLY_OPEN_OR_NATIVE_CONFIRMATION_NOT_REACHED');
        }
      }
      expect(closed).toHaveLength(obs.independentlyClosedRows);
      expect(e.data.rows.length - closed.length).toBe(1);
      expect(e.s.selectedDataRowOrdinals).toEqual(closed.slice(0, 32));
      expect(obs.samplingCompleteness).toBe(false);
      expect(e.data.headers.map((h) => e.data.rows[0][h])).toEqual(obs.rawFirstRow);
      expect(e.data.headers.map((h) => e.data.rows.at(-1)![h])).toEqual(obs.rawLastRow);
    });

    it(`${e.s.sourceId}: preserves constructor contradictions and calibrated literal observations without inferring hidden storage`, () => {
      for (const ordinal of e.s.selectedDataRowOrdinals) {
        const r = e.data.rows[ordinal - 1];
        expect([r.EQ_SELF, r.EQ_DISTINCT]).toEqual(['1', '0']);
        expect([r.CTOR12_5_T, r.CTOR12_5_EQ_DF, r.MISSING_LOWER_NA]).toEqual(
          e.s.sourceId.endsWith('v5') ? ['13', '0', '0'] : ['13', '1', '1'],
        );
        expect([r.LITERAL_DF_T, r.LITERAL_E0_T, r.LITERAL_DE_T, r.CTOR50_EQ_80]).toEqual(['13', '12', '13', '1']);
        for (const prefix of Object.keys(tuples)) {
          expect(r[prefix + '_EQ_FLOOR']).toBe(prefix === 'G32' ? '0' : '1');
          expect(r[prefix + '_EQ_HALF_UP']).toBe('0');
          if (prefix.startsWith('G')) expect(r[prefix + '_EQ_PRE_T']).toBe('0');
        }
      }
    });

    for (const prefix of Object.keys(tuples)) {
      it(`${e.s.sourceId}: compares every ${prefix} gradient channel and literal equality to the same native rows`, () => {
        const fields = [
          'R',
          'G',
          'B',
          'T',
          'NA',
          'EQ_FLOOR',
          'EQ_HALF_UP',
          ...(prefix.startsWith('G') ? ['EQ_PRE_T'] : []),
        ];
        for (const [i, ordinal] of e.s.selectedDataRowOrdinals.entries()) {
          const r = e.data.rows[ordinal - 1];
          expect(['R', 'G', 'B', 'T', 'NA'].map((k) => Number(r[prefix + '_' + k]))).toEqual(tuples[prefix]);
          for (const suffix of fields) {
            const title = prefix + '_' + suffix;
            expect(r[title]).not.toBe('');
            expect(
              e.result.plots.find((p) => p.title === title)!.values[i],
              `${e.s.sourceId}:row${ordinal}:${title}`,
            ).toBe(Number(r[title]));
          }
        }
      });
    }
  }
});
