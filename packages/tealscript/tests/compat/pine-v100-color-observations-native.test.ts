import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

interface Proof { path: string; bytes: number; sha256: string }
interface Pointer { csvSha256: string; rowOrdinal: number; columnOrdinal: number; headerRaw: string; valueRaw: string }
interface Source { sourceId: string; path: string; sha256: string; slot: number; plotCalls: number; phaseModulo: number | null; plots: { title: string; sourcePlotOrdinal: number }[] }
interface Block { sourceId: string; sourceSha256: string; csv: Proof; columnBindings: Proof; closureMask: Proof; nativePrivateId: string; primaryRowOrdinals: number[]; rows: { rowOrdinal: number; cells: Record<string, Pointer>; inputCells: Pointer[] }[] }
interface Class { classId: string; modelIds: string[]; expectedCodes: string; rows?: { expected: Record<string, string> }[] }
interface Scope { columnTitles: string[]; classes: Class[] }
const root = 'v100/';
const raw = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url));
const json = <T>(path: string): T => JSON.parse(raw(path).toString('utf8')) as T;
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as { revision: string; files: Proof[] };
const sources = json<{ sources: Source[] }>(root + 'bundle-manifest-v1.json').sources;
const map = json<Record<'scalar' | 'packing' | 'materialization', Scope>>(root + 'predictions/prediction-map-v1.json');
function table(path: string) {
  const [headers, ...rows] = raw(path).toString('utf8').trimEnd().split(/\r?\n/).map(line => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(v => v.startsWith('"') ? v.slice(1, -1).replaceAll('""', '"') : v));
  return { headers, rows, get: (row: string[], title: string) => row[headers.indexOf(title)] };
}
const entries = sources.map(source => {
  const base = `${root}captures/v100/${source.sourceId}/`;
  const block = json<Block>(base + 'native-cell-block-v1.json');
  return { source, base, block, csv: table(block.csv.path), mask: table(block.closureMask.path) };
});
function survivors(scope: Scope, block: Block, phase: boolean) {
  return scope.classes.filter(c => block.rows.every(row => scope.columnTitles.every((title, i) => {
    const expected = phase ? c.rows![Number(row.cells.CASE_ID.valueRaw)].expected[title] : c.expectedCodes[i];
    return row.cells[title].valueRaw === expected;
  })));
}

describe('v100 constant colors: native observations and frozen projections, historical frozen projections before the v101 discriminator', () => {
  it('binds all immutable dependencies, exact proposal bytes and original source ownership', () => {
    expect(lock.revision).toBe('6fba2a043155ecfd52bec4fbffb9f03144066ab3');
    const integrity = json<{ artifacts: Proof[] }>(root + 'captures/v100/artifact-integrity-v3.json');
    expect(integrity.artifacts).toHaveLength(195);
    for (const p of integrity.artifacts) {
      expect(lock.files.find(f => f.path === p.path)).toEqual(p);
      const bytes = raw(p.path);
      expect({ path: p.path, bytes: bytes.length, sha256: hash(bytes) }).toEqual(p);
    }
    const integrityPath = root + 'captures/v100/artifact-integrity-v3.json';
    expect(lock.files.find(f => f.path === integrityPath)).toEqual({ path: integrityPath, bytes: raw(integrityPath).length, sha256: hash(raw(integrityPath)) });
    expect(json(root + 'captures/v100/validation-result-v3.json')).toMatchObject({ status: 'PASS' });
    expect(sources.map(s => s.plotCalls)).toEqual([39, 10, 10]);
    for (const e of entries) {
      const source = raw(e.source.path).toString('utf8');
      expect(hash(Buffer.from(source))).toBe(e.source.sha256);
      expect(source).toBe(raw(e.base + 'attempt-v1/executed-v1.pine').toString('utf8'));
      expect(source).toContain('f_code(bool value) => value ? 1 : 0');
      const binding = json<{ nativePrivateId: string; columns: { sourceLiteralPlotOrdinal?: number; sourceSha256?: string; originalHeader: string; owner: string }[] }>(e.block.columnBindings.path);
      for (const p of e.source.plots) expect(binding.columns.find(c => c.sourceLiteralPlotOrdinal === p.sourcePlotOrdinal)).toMatchObject({ sourceSha256: e.source.sha256, originalHeader: p.title, owner: e.block.nativePrivateId });
      for (const row of e.block.rows) for (const p of [...row.inputCells, ...Object.values(row.cells)]) {
        expect(p.csvSha256).toBe(e.block.csv.sha256);
        expect(e.csv.headers[p.columnOrdinal - 1]).toBe(p.headerRaw);
        expect(e.csv.rows[p.rowOrdinal - 1][p.columnOrdinal - 1]).toBe(p.valueRaw);
      }
    }
  });

  it('re-derives physical closure and first64/76 selection without output filtering', () => {
    let primary = 0, outside = 0, developing = 0;
    for (const [index, e] of entries.entries()) {
      const observation = json<{ nativeExportUtc: string; samplingCompleteness: boolean; ownOriginRequired: boolean }>(e.base + 'attempt-v1/session-mode0-v1/row-set-observation-v1.json');
      expect(observation.samplingCompleteness).toBe(false);
      expect(observation.ownOriginRequired).toBe(false);
      expect(e.csv.rows).toHaveLength([302, 305, 306][index]);
      const closed = e.csv.rows.map(row => e.csv.get(row, 'CHART_CONFIRMED') === '1' && (Number(e.csv.get(row, 'time')) + 120) * 1000 <= Date.parse(observation.nativeExportUtc));
      expect(closed.filter(Boolean)).toHaveLength([301, 304, 305][index]);
      const size = index === 0 ? 64 : 76;
      const start = closed.findIndex((_, i) => closed.slice(i, i + size).length === size && closed.slice(i, i + size).every(Boolean) && (index === 0 || e.csv.get(e.csv.rows[i], 'CASE_ID') === '0'));
      expect(e.block.primaryRowOrdinals).toEqual(Array.from({ length: size }, (_, i) => start + i + 1));
      expect(start).toBe(index === 0 ? 0 : 15);
      for (const [i, row] of e.csv.rows.entries()) {
        expect(e.mask.get(e.mask.rows[i], 'closed_numeric_eligible')).toBe(closed[i] ? '1' : '0');
        expect(e.csv.get(row, 'INPUT_TIME')).toBe(String(Number(e.csv.get(row, 'time')) * 1000));
        if (index > 0) expect(e.csv.get(row, 'CASE_ID')).toBe(String(Number(e.csv.get(row, 'INPUT_INDEX')) % 19));
        if (i >= start && i < start + size) {
          expect(closed[i]).toBe(true);
          if (i > start) {
            expect(Number(e.csv.get(row, 'INPUT_INDEX'))).toBe(Number(e.csv.get(e.csv.rows[i - 1], 'INPUT_INDEX')) + 1);
            expect(Number(e.csv.get(row, 'time'))).toBeGreaterThan(Number(e.csv.get(e.csv.rows[i - 1], 'time')));
          }
          primary += e.source.plotCalls;
        } else if (closed[i]) outside += e.source.plotCalls;
        else developing += e.source.plotCalls;
      }
    }
    expect({ primary, outside, developing }).toEqual({ primary: 4016, outside: 13813, developing: 59 });
  });

  it('scores every pre-registered signature without combining its independent scopes', () => {
    expect(map.scalar.classes).toHaveLength(263);
    expect(map.packing.classes).toHaveLength(108);
    expect(map.materialization.classes).toHaveLength(8);
    expect(map.scalar.classes.flatMap(c => c.modelIds)).toHaveLength(7753);
    expect(map.packing.classes.flatMap(c => c.modelIds)).toHaveLength(45769);
    const s = survivors(map.scalar, entries[0].block, false);
    expect(s.map(c => c.classId)).toEqual(['SC213']);
    expect(s.flatMap(c => c.modelIds)).toHaveLength(258);
    expect(survivors(map.packing, entries[0].block, false)).toEqual([]);
    for (const e of entries.slice(1)) {
      const b = survivors(map.materialization, e.block, true);
      expect(b.map(c => c.classId)).toEqual(['BC2']);
      expect(b.flatMap(c => c.modelIds)).toEqual(['B:104', 'B:106', 'B:512', 'B:514']);
    }
  });

  it('retains the RGB-tuple counterexample to a complete alpha-only scalar model', () => {
    for (const row of entries[0].block.rows) {
      expect(row.cells.DIRECT_RGB_NEW_12P1_EQ.valueRaw).toBe('1');
      expect(row.cells.PACK_BLACK_RGB_NEW_12P1_EQ.valueRaw).toBe('1');
      expect(row.cells.PACK_HIGH_RGB_NEW_12P1_EQ.valueRaw).toBe('0');
      expect(row.cells.PACK_MID_RGB_NEW_12P1_EQ.valueRaw).toBe('0');
      expect(row.cells.PACK_BLACK_RGB_99P5_EQ_01.valueRaw).toBe('1');
      expect(row.cells.PACK_LOW_RGB_99P5_EQ_01.valueRaw).toBe('1');
      expect(row.cells.PACK_HIGH_RGB_99P5_EQ_01.valueRaw).toBe('0');
      expect(row.cells.PACK_MID_RGB_99P5_EQ_01.valueRaw).toBe('0');
    }
  });

  it('pins all new native materialization tuples and the newly queried C7 control', () => {
    const expected = [
      [12, 1, 1], [12, 1, 1], [12, 1, 1], [0, 1, 1], [0, 1, 1], [99, 1, 1], [0, 1, 1],
      [10, 1, 1], [15, 1, 1], [50, 1, 1], [100, 1, 1], [22, 1, 1], [22, 1, 1],
      [22, 1, 1], [32, 1, 1], [32, 1, 1], [12, 0, 1], [70, 0, 1], [90, 1, 0],
    ];
    for (const e of entries.slice(1)) for (const row of e.block.rows) {
      const phase = Number(row.cells.CASE_ID.valueRaw);
      expect(['NEW_R', 'NEW_G', 'NEW_B'].map(k => row.cells[k].valueRaw)).toEqual(['33', '66', '99']);
      expect(['NEW_T', 'NEW_EQ_C0', 'NEW_EQ_C1'].map(k => row.cells[k].valueRaw)).toEqual(expected[phase].map(String));
    }
  });
});
