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
const revision = 'b23c3d71f00e83cb40c4ab3d65be269788605f89';
const base = 'v98/captures/v98/';
const folder = base + 'v98-color-na-cast-v6/attempt-v1/';
const bytes = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url));
const text = (path: string) => bytes(path).toString('utf8');
const json = <T>(path: string): T => JSON.parse(text(path)) as T;
const hash = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');
function csv(path: string) {
  return text(path).trimEnd().split(/\r?\n/).map(line => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map(value => value.startsWith('"') ? value.slice(1, -1).replaceAll('""', '"') : value));
}
const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as { revision: string; files: Proof[] };
const native = json<{ sources: NativeSource[] }>(base + 'numeric-controls-v6.json').sources.find(s => s.sourceId === 'v98-color-na-cast-v6')!;
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
describe('v98 v6 NA color cast: bounded controls and observed contrary cells', () => {
  it('binds all new evidence, unchanged Saved source and original native cell pointers', () => {
    expect(lock.revision).toBe(revision);
    const integrity = json<{ artifacts: Proof[] }>(base + 'artifact-integrity-v6.json');
    const files = lock.files.filter(p => p.path.startsWith('v98/') && (p.path === base + 'artifact-integrity-v6.json' || integrity.artifacts.some(f => f.path === p.path)));
    expect(files).toHaveLength(227);
    for (const p of files) {
      const value = bytes(p.path);
      expect({ path: p.path, bytes: value.length, sha256: hash(value) }).toEqual(p);
      if (p.path !== base + 'artifact-integrity-v6.json') expect(integrity.artifacts.find(f => f.path === p.path)).toEqual(p);
    }
    expect(source).toBe(text('v98/sources/v98-color-na-cast-v6.pine'));
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
    expect(json(base + 'validation-result-v6.json')).toMatchObject({ status: 'PASS', counts: {
      nativeSaves: 3, nativeAdds: 3, csvs: 3, dataRows: 918, independentlyClosedRows: 915, primaryRows: 192, uniquePrimaryPlotCells: 12096, nativeSourceEntryStops: 1,
    } });
    expect(result.errors).toEqual([]);
  });

  it('keeps physical closure, the three original context rows and all64 selected phases', () => {
    expect(rows).toHaveLength(305);
    expect(mask).toHaveLength(305);
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
    expect(closed).toBe(304);
    expect(observation.samplingCompleteness).toBe(false);
    expect(output('INPUT_INDEX')).toEqual(Array.from({ length: 64 }, (_, i) => i + 23768));
    expect(output('CASE_ID')).toEqual(Array.from({ length: 64 }, (_, i) => i % 4));
  });

  it('asserts matching native controls and pins every contrary v6 getter/equality without parity credit', () => {
    let exactCells = 0, contraryCells = 0;
    for (const ordinal of native.selectedDataRowOrdinals) {
      const phase = Number(raw(ordinal, 'CASE_ID'));
      for (const title of headers.slice(6)) {
        if (title === 'INPUT_INDEX') continue;
        const contraryGetter = /^(CAST|VAR|ARRAY|CAST_HISTORY)_[RGBT]$/.test(title)
          || (phase % 2 === 1 && /^HISTORY_[RGBT]$/.test(title));
        const contraryEquality = title === 'CAST_EQ_SELF' || title === 'VAR_EQ_CAST';
        if (contraryGetter || contraryEquality) {
          expect(raw(ordinal, title)).toBe(contraryEquality ? '1' : title.endsWith('_T') ? '100' : '0');
          contraryCells++;
          continue;
        }
        const valueRaw = raw(ordinal, title), actual = output(title)[ordinal - 4];
        expect(actual, `${title}:original row${ordinal}`).toBe(Number(valueRaw));
        expect(String(actual)).toBe(valueRaw);
        expect(bits(actual!)).toBe(bits(Number(valueRaw)));
        exactCells++;
      }
    }
    expect({ exactCells, contraryCells, indexContextExcluded: 64 }).toEqual({ exactCells: 2688, contraryCells: 1280, indexContextExcluded: 64 });
    for (const ordinal of native.selectedDataRowOrdinals) {
      expect(raw(ordinal, 'CAST_NA')).toBe('1');
      expect(raw(ordinal, 'CAST_EQ_TYPED_NA')).toBe('0');
      expect(raw(ordinal, 'CAST_EQ_BLACK100')).toBe('0');
      expect(raw(ordinal, 'ARRAY_EQ_CAST')).toBe('0');
      expect(raw(ordinal, 'HISTORY_EQ_EXPECTED')).toBe(String(Number(raw(ordinal, 'CASE_ID')) % 2 === 0 ? 1 : 0));
    }
  });
});
