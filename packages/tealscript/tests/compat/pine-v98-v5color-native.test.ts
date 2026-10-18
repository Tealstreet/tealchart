import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

interface Proof { path: string; bytes: number; sha256: string }
interface Pointer { csvSha256: string; rowOrdinal: number; columnOrdinal: number; headerRaw: string; valueRaw: string }
interface NativeSource {
  sourceId: string; sourceSha256: string; csv: Proof; columnBindings: Proof; closureMask: Proof;
  selectedDataRowOrdinals: number[]; primaryUniquePlotCells: number;
  rows: { rowOrdinal: number; allRequestedRawCells: Pointer[]; nativeContextCells: Pointer[] }[];
}
const revision = '04a6378c310ef405448e5eea719bf4bc0e699e1a';
const base = 'v98/captures/v98/';
const folder = base + 'v98-color-constructors-v5/attempt-v1/';
const bytes = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url));
const text = (path: string) => bytes(path).toString('utf8');
const json = <T>(path: string): T => JSON.parse(text(path)) as T;
const hash = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');
function csv(path: string) {
  return text(path).trimEnd().split(/\r?\n/).map(line => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map(value => value.startsWith('"') ? value.slice(1, -1).replaceAll('""', '"') : value));
}
const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as { revision: string; files: Proof[] };
const native = json<{ sources: NativeSource[] }>(base + 'numeric-controls-v2.json').sources[0];
const [headers, ...rows] = csv(native.csv.path);
const [maskHeaders, ...mask] = csv(native.closureMask.path);
const source = text(folder + 'executed-v1.pine');
const selected = native.selectedDataRowOrdinals.map(i => rows[i - 1]);
const compiled = tryCompile(parse(source));
if (!compiled.success) throw new Error(compiled.unsupported.join('\n'));
// This unchanged source is pointwise in index%16; phase0 needs no omitted prefix.
const result = executeCompiled(compiled, selected.map(r => ({
  time: Number(r[0]) * 1000, open: Number(r[1]), high: Number(r[2]), low: Number(r[3]), close: Number(r[4]), volume: Number(r[5]),
})))!;
const raw = (ordinal: number, title: string) => rows[ordinal - 1][headers.indexOf(title)];
const output = (title: string) => result.plots.find(p => p.title === title)!.values;
const bits = (value: number) => { const buffer = Buffer.alloc(8); buffer.writeDoubleBE(value); return buffer.toString('hex'); };
function exact(title: string) {
  const values = output(title);
  expect(values).toHaveLength(64);
  for (const [i, ordinal] of native.selectedDataRowOrdinals.entries()) {
    const valueRaw = raw(ordinal, title), actual = values[i], key = `${title}:original row${ordinal}`;
    if (valueRaw === '') expect(actual, key).toBeNull();
    else {
      expect(actual, key).toBe(Number(valueRaw));
      expect(String(actual), key).toBe(valueRaw);
      expect(bits(actual!), key).toBe(bits(Number(valueRaw)));
    }
  }
}

describe('v98 v5 constructor routes: slot1 native evidence', () => {
  it('binds all new evidence, unchanged Saved source and original native cell pointers', () => {
    expect(lock.revision).toBe(revision);
    const integrity = json<{ artifacts: Proof[] }>(base + 'artifact-integrity-v2.json');
    const files = lock.files.filter(p => p.path.startsWith('v98/') && (p.path === base + 'artifact-integrity-v2.json' || integrity.artifacts.some(f => f.path === p.path)));
    expect(files).toHaveLength(88);
    for (const p of files) {
      const value = bytes(p.path);
      expect({ path: p.path, bytes: value.length, sha256: hash(value) }).toEqual(p);
      if (p.path !== base + 'artifact-integrity-v2.json') expect(integrity.artifacts.find(f => f.path === p.path)).toEqual(p);
    }
    expect(source).toBe(text('v98/sources/v98-color-constructors-v5.pine'));
    expect(hash(Buffer.from(source))).toBe(native.sourceSha256);
    const saved = text(folder + 'save-request-v1.txt').replaceAll('\r\n', '\n').split('name="source"\n\n')[1].split(/\n------WebKitFormBoundary/)[0];
    expect(saved).toBe(source);
    for (const row of native.rows) for (const p of [...row.allRequestedRawCells, ...row.nativeContextCells]) {
      expect(p.csvSha256).toBe(native.csv.sha256);
      expect(headers[p.columnOrdinal - 1]).toBe(p.headerRaw);
      expect(rows[p.rowOrdinal - 1][p.columnOrdinal - 1]).toBe(p.valueRaw);
    }
    const observation = json<{ privateScriptId: string; privateVersion: string; nativeCompileSuccess: boolean }>(folder + 'observation-v1.json');
    expect(observation.nativeCompileSuccess).toBe(true);
    const binding = json<{ nativePrivateId: string; nativePrivateVersion: string;
      columns: { columnOrdinal: number; originalHeader: string; sourceSha256?: string; owner?: string;
        privateVersion?: string; nativePlotId?: string; sourceLiteralPlotOrdinal?: number }[];
      missingOrAmbiguousRequestedPlotTitles: unknown[]; unresolvedColumnOrdinals: unknown[]; actuallyExportedColorerColumns: unknown[];
    }>(native.columnBindings.path);
    expect(binding.nativePrivateId).toBe(observation.privateScriptId);
    expect(binding.nativePrivateVersion).toBe(observation.privateVersion);
    expect(binding.missingOrAmbiguousRequestedPlotTitles).toEqual([]);
    expect(binding.unresolvedColumnOrdinals).toEqual([]);
    expect(binding.actuallyExportedColorerColumns).toEqual([]);
    for (const c of binding.columns) {
      expect(headers[c.columnOrdinal - 1]).toBe(c.originalHeader);
      if (c.columnOrdinal > 6) expect(c).toMatchObject({ sourceSha256: native.sourceSha256,
        owner: observation.privateScriptId, privateVersion: observation.privateVersion,
        nativePlotId: `plot_${c.columnOrdinal - 7}`, sourceLiteralPlotOrdinal: c.columnOrdinal - 7 });
    }
    for (const name of ['save-response-v1.json', 'add-response-v1.json']) {
      const body = json<{ success: boolean; result: { metaInfo: { scriptIdPart: string; styles: Record<string, { title: string }> } } }>(folder + name);
      expect(body.success).toBe(true);
      expect(body.result.metaInfo.scriptIdPart).toBe(observation.privateScriptId);
      expect(headers.slice(6).map((_, i) => body.result.metaInfo.styles[`plot_${i}`].title)).toEqual(headers.slice(6));
    }
    expect(json(base + 'validation-result-v2.json')).toMatchObject({ status: 'PASS', counts: {
      nativeSaves: 1, nativeAdds: 1, csvs: 1, dataRows: 310, independentlyClosedRows: 309, primaryRows: 64, uniquePrimaryPlotCells: 4032,
    } });
    expect(result.errors).toEqual([]);
  });

  it('closes original rows15..78 and excludes absolute source index and outside/developing observations', () => {
    expect(rows).toHaveLength(310);
    expect(mask).toHaveLength(310);
    expect(native.selectedDataRowOrdinals).toEqual(Array.from({ length: 64 }, (_, i) => i + 15));
    expect(native.primaryUniquePlotCells).toBe(4032);
    const observation = json<{ nativeExportUtc: string; samplingCompleteness: boolean }>(folder + 'session-mode0-v1/row-set-observation-v1.json');
    let closed = 0;
    for (const [i, r] of rows.entries()) {
      const get = (title: string) => r[headers.indexOf(title)];
      const m = Object.fromEntries(maskHeaders.map((h, j) => [h, mask[i][j]]));
      const eligible = get('CHART_CONFIRMED') === '1' && (Number(get('time')) + 120) * 1000 <= Date.parse(observation.nativeExportUtc);
      expect(m.csv_sha256).toBe(native.csv.sha256);
      expect(m.row_ordinal).toBe(String(i + 1));
      expect(m.closed_numeric_eligible).toBe(eligible ? '1' : '0');
      expect(get('INPUT_TIME')).toBe(String(Number(get('time')) * 1000));
      expect(get('CASE_ID')).toBe(String(Number(get('INPUT_INDEX')) % 16));
      if (eligible) closed++;
      if (i >= 14 && i <= 77) expect(eligible).toBe(true);
      if (!eligible) expect(m.present_cell_status).toBe('OBSERVED / EXCLUDED');
    }
    expect(closed).toBe(309);
    expect(observation.samplingCompleteness).toBe(false);
    expect(raw(15, 'INPUT_INDEX')).toBe('23760');
    expect(output('INPUT_INDEX')).toEqual(Array.from({ length: 64 }, (_, i) => i));
    expect(output('CASE_ID')).toEqual(Array.from({ length: 64 }, (_, i) => i % 16));
  });

  for (const route of ['LITERAL_RGB', 'LITERAL_NEW', 'SERIES_RGB', 'SERIES_NEW']) it(`compares all64 ${route} native tuples and five literal codes exactly`, () => {
    for (const suffix of ['R', 'G', 'B', 'T', 'NA', ...Array.from({ length: 5 }, (_, i) => `EQ_C${i}`)]) exact(`${route}_${suffix}`);
  });

  it('retains all four LITERAL_NEW case13 NEITHER_LITERAL vectors', () => {
    const ordinals = native.selectedDataRowOrdinals.filter(i => raw(i, 'CASE_ID') === '13');
    expect(ordinals).toEqual([28, 44, 60, 76]);
    for (const ordinal of ordinals) {
      expect(raw(ordinal, 'TRANSP_INPUT')).toBe('22.9');
      expect(['R', 'G', 'B', 'T', 'NA'].map(k => raw(ordinal, 'LITERAL_NEW_' + k))).toEqual(['33', '66', '99', '22', '0']);
      expect(Array.from({ length: 5 }, (_, i) => raw(ordinal, `LITERAL_NEW_EQ_C${i}`))).toEqual(['0', '0', '0', '0', '0']);
    }
  });

  it('pins the direct constant RGB root as OBSERVED CONTRARY with its model HELD', () => {
    for (const ordinal of native.selectedDataRowOrdinals) {
      expect(raw(ordinal, 'EXACT_RGB12_5_EQ_DF')).toBe('0');
      expect(raw(ordinal, 'EXACT_RGB12_5_EQ_DF_CODE')).toBe('0');
    }
  });

  it('compares every remaining non-index control except the explicitly held constant RGB root exactly', () => {
    const controls = headers.slice(6).filter(title => !['INPUT_INDEX', 'EXACT_RGB12_5_EQ_DF', 'EXACT_RGB12_5_EQ_DF_CODE'].includes(title)
      && !/^(LITERAL_RGB|LITERAL_NEW|SERIES_RGB|SERIES_NEW)_/.test(title));
    expect(controls).toHaveLength(20);
    for (const title of controls) exact(title);
  });
});


describe('v96 pointwise controls: v5 constant RGB root remains HELD', () => {
  for (const entry of json<{ sources: NativeSource[] }>('v96/captures/v96/numeric-controls-v1.json').sources) {
    it(`${entry.sourceId}: locks every non-index cell except the observed contrary constant RGB root`, () => {
      const [titles, ...data] = csv(entry.csv.path);
      const pine = text(`v96/captures/v96/${entry.sourceId}/attempt-v1/executed-v1.pine`);
      expect(hash(Buffer.from(pine))).toBe(entry.sourceSha256);
      const compiled = tryCompile(parse(pine));
      expect(compiled.success).toBe(true);
      const selected = entry.selectedDataRowOrdinals.map(i => data[i - 1]);
      const engine = executeCompiled(compiled, selected.map(r => ({ time: Number(r[0]) * 1000,
        open: Number(r[1]), high: Number(r[2]), low: Number(r[3]), close: Number(r[4]), volume: Number(r[5]) })))!;
      expect(engine.errors).toEqual([]);
      let compared = 0, held = 0;
      for (const title of titles.slice(6)) {
        if (title === 'INPUT_INDEX') continue;
        const native = selected.map(r => r[titles.indexOf(title)]);
        const actual = engine.plots.find(p => p.title === title)!.values;
        if (entry.sourceId.endsWith('v5') && title === 'CTOR12_5_EQ_DF') {
          expect(native).toEqual(Array(32).fill('0'));
          held += 32;
          continue;
        }
        for (const [i, value] of actual.entries()) {
          expect(value, `${title}:row${entry.selectedDataRowOrdinals[i]}`).toBe(Number(native[i]));
          expect(String(value)).toBe(native[i]);
          expect(bits(value!)).toBe(bits(Number(native[i])));
          compared++;
        }
      }
      expect({ compared, held }).toEqual(entry.sourceId.endsWith('v5') ? { compared: 1856, held: 32 } : { compared: 1888, held: 0 });
    });
  }
});
