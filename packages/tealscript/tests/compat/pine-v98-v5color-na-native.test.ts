import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

interface Proof { path: string; bytes: number; sha256: string }
interface Pointer { csvSha256: string; rowOrdinal: number; columnOrdinal: number; headerRaw: string; valueRaw: string }
interface NativeSource {
  sourceId: string; sourceSha256: string; csv: Proof; columnBindings: Proof; closureMask: Proof;
  selectedDataRowOrdinals: number[]; primaryUniquePlotCells: number; historyPredecessorDataRowOrdinal: number;
  rows: { rowOrdinal: number; allRequestedRawCells: Pointer[]; nativeContextCells: Pointer[]; predecessorRawCells: Pointer[] }[];
}
const revision = '811a4d799e49cd1ced9e69b58bb6d60cccacb294';
const base = 'v98/captures/v98/';
const folder = base + 'v98-color-na-cast-v5/attempt-v1/';
const bytes = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url));
const text = (path: string) => bytes(path).toString('utf8');
const json = <T>(path: string): T => JSON.parse(text(path)) as T;
const hash = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');
function csv(path: string) {
  return text(path).trimEnd().split(/\r?\n/).map(line => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map(value => value.startsWith('"') ? value.slice(1, -1).replaceAll('""', '"') : value));
}
const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as { revision: string; files: Proof[] };
const native = json<{ sources: NativeSource[] }>(base + 'numeric-controls-v4.json').sources.find(s => s.sourceId === 'v98-color-na-cast-v5')!;
const [headers, ...rows] = csv(native.csv.path);
const [maskHeaders, ...mask] = csv(native.closureMask.path);
const source = text(folder + 'executed-v1.pine');
const firstIndex = Number(rows[0][headers.indexOf('INPUT_INDEX')]);
// Only the source index is translated; actual CSV inputs and color expressions remain intact.
// Three original context rows initialize one-bar history; no native color target is supplied.
const replay = source.replace(/\bbar_index\b/g, `(bar_index + ${firstIndex})`);
const compiled = tryCompile(parse(replay));
if (!compiled.success) throw new Error(compiled.unsupported.join('\n'));
const result = executeCompiled(compiled, rows.slice(0, 67).map(r => ({
  time: Number(r[0]) * 1000, open: Number(r[1]), high: Number(r[2]), low: Number(r[3]), close: Number(r[4]), volume: Number(r[5]),
})))!;
const raw = (ordinal: number, title: string) => rows[ordinal - 1][headers.indexOf(title)];
const output = (title: string) => result.plots.find(p => p.title === title)!.values.slice(3);
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

describe('v98 v5 NA color cast: present transparent black', () => {
  it('binds all new evidence, unchanged Saved source and original native cell pointers', () => {
    expect(lock.revision).toBe(revision);
    const integrity = json<{ artifacts: Proof[] }>(base + 'artifact-integrity-v4.json');
    const files = lock.files.filter(p => p.path.startsWith('v98/') && (p.path === base + 'artifact-integrity-v4.json' || integrity.artifacts.some(f => f.path === p.path)));
    expect(files).toHaveLength(159);
    for (const p of files) {
      const value = bytes(p.path);
      expect({ path: p.path, bytes: value.length, sha256: hash(value) }).toEqual(p);
      if (p.path !== base + 'artifact-integrity-v4.json') expect(integrity.artifacts.find(f => f.path === p.path)).toEqual(p);
    }
    expect(source).toBe(text('v98/sources/v98-color-na-cast-v5.pine'));
    expect(hash(Buffer.from(source))).toBe(native.sourceSha256);
    const saved = text(folder + 'save-request-v1.txt').replaceAll('\r\n', '\n').split('name="source"\n\n')[1].split(/\n------WebKitFormBoundary/)[0];
    expect(saved).toBe(source);
    for (const row of native.rows) for (const p of [...row.allRequestedRawCells, ...row.nativeContextCells, ...row.predecessorRawCells]) {
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
    expect(json(base + 'validation-result-v4.json')).toMatchObject({ status: 'PASS', counts: {
      nativeSaves: 2, nativeAdds: 2, csvs: 2, dataRows: 613, independentlyClosedRows: 611, primaryRows: 128, uniquePrimaryPlotCells: 8064, nativeSourceEntryStops: 1,
    } });
    expect(result.errors).toEqual([]);
  });

  it('keeps physical closure, the three original context rows and all64 selected phases', () => {
    expect(rows).toHaveLength(303);
    expect(mask).toHaveLength(303);
    expect(firstIndex).toBe(23765);
    expect(native.selectedDataRowOrdinals).toEqual(Array.from({ length: 64 }, (_, i) => i + 4));
    expect(native.historyPredecessorDataRowOrdinal).toBe(3);
    expect(native.primaryUniquePlotCells).toBe(4032);
    expect(source.match(/\bbar_index\b/g)).toHaveLength(3);
    expect(replay).toBe(source.replaceAll('bar_index', '(bar_index + 23765)'));
    const observation = json<{ nativeExportUtc: string; samplingCompleteness: boolean }>(folder + 'session-mode0-v1/row-set-observation-v1.json');
    let closed = 0;
    for (const [i, r] of rows.entries()) {
      const get = (title: string) => r[headers.indexOf(title)];
      const m = Object.fromEntries(maskHeaders.map((h, j) => [h, mask[i][j]]));
      const eligible = get('CHART_CONFIRMED') === '1' && (Number(get('time')) + 120) * 1000 <= Date.parse(observation.nativeExportUtc);
      expect(m.csv_sha256).toBe(native.csv.sha256);
      expect(m.row_ordinal).toBe(String(i + 1));
      expect(m.closed_numeric_eligible).toBe(eligible ? '1' : '0');
      expect(get('INPUT_INDEX')).toBe(String(firstIndex + i));
      expect(get('INPUT_TIME')).toBe(String(Number(get('time')) * 1000));
      expect(get('CASE_ID')).toBe(String((firstIndex + i) % 4));
      if (eligible) closed++;
      if (i <= 66) expect(eligible).toBe(true);
      if (!eligible) expect(m.present_cell_status).toBe('OBSERVED / EXCLUDED');
    }
    expect(closed).toBe(302);
    expect(observation.samplingCompleteness).toBe(false);
    expect(output('INPUT_INDEX')).toEqual(Array.from({ length: 64 }, (_, i) => i + 23768));
    expect(output('CASE_ID')).toEqual(Array.from({ length: 64 }, (_, i) => i % 4));
  });

  for (const prefix of ['CAST', 'VAR', 'ARRAY', 'HISTORY', 'CAST_HISTORY', 'NZ_DEFAULT', 'NZ_REPLACEMENT', 'GRAD_CAST', 'GRAD_NA']) {
    it(`compares all64 ${prefix} complete native tuples exactly`, () => {
      for (const suffix of ['R', 'G', 'B', 'T', 'NA']) exact(`${prefix}_${suffix}`);
    });
  }

  it('compares the old NA root, Boolean-NA equality codes and every remaining non-index cell', () => {
    let count = 0;
    for (const title of headers.slice(6)) {
      if (title === 'INPUT_INDEX') continue;
      exact(title);
      count += 64;
    }
    expect(count).toBe(3968);
    for (const ordinal of native.selectedDataRowOrdinals) {
      expect(raw(ordinal, 'EXACT_NA_CAST')).toBe('0');
      expect(raw(ordinal, 'EXACT_NA_CAST_CODE')).toBe('0');
      expect(raw(ordinal, 'TYPED_NA_NA')).toBe('1');
      expect(raw(ordinal, 'CAST_EQ_TYPED_NA')).toBe('-1');
      expect(raw(ordinal, 'CAST_EQ_BLACK100')).toBe('1');
    }
  });
});
