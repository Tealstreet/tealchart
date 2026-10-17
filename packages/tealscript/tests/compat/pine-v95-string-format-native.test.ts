import type { Bar } from '../../src/runtime/context';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

interface Binding { path: string; bytes: number; sha256: string }
interface Cell { rowOrdinal: number; columnOrdinal: number; headerRaw: string; valueRaw: string }
interface NumericRecord {
  property: string; model: string; verdict: string; nativeCell: Cell; inputCells: Cell[];
  dependencyCells?: Cell[]; predictedRational: string | null; predictedBlank: boolean;
  closedScoringEligible: boolean; cause: string | null;
}
interface Facet {
  facet: string; captureStatus: string; hypothesisVerdict: string; cause: string | null;
  details: { prefix: string; cap: number; alphabet: string; rawCellPointers: Cell[];
    encoderCalibrated: boolean; decodedString: string; captureStatus: string; cause: null } | null;
}
interface Numeric {
  sourceId: string; sourceSha256: string; csv: Binding; columnBindings: Binding; closureMask: Binding;
  selectedBlockDataRowOrdinals: number[]; closedRowsAvailable: number; strictOwnIndexZeroPrefixAvailable: boolean;
  records: NumericRecord[]; comparisonCounts: Record<string, number>; facets: Facet[];
}
const pin = 'b23c3d71f00e83cb40c4ab3d65be269788605f89';
const directory = 'v95/captures/v95/';
const folder = (v: number) => `${directory}v95-string-format-v${v}/attempt-v1/`;
const sourcePath = (v: number) => `v95/sources/v95-string-format-v${v}.pine`;
const bytes = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url));
const text = (path: string) => bytes(path).toString();
const json = <T,>(path: string): T => JSON.parse(text(path)) as T;
const hash = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');
const caps = { TOSTRING: 6, FORMAT: 6, TIME: 5, MISSING: 6 } as const;
type Prefix = keyof typeof caps;
const titles = (prefix: Prefix) => [`${prefix}_LEN`, ...Array.from({ length: caps[prefix] }, (_, k) => `${prefix}_C${k}`)];
const prefixes = Object.keys(caps) as Prefix[];
function csv(path: string) {
  return text(path).trimEnd().split(/\r?\n/).map(line => {
    const cells: string[] = []; let field = '', quoted = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        if (quoted && line[i + 1] === '"') { field += '"'; i++; }
        else quoted = !quoted;
      } else if (line[i] === ',' && !quoted) { cells.push(field); field = ''; }
      else field += line[i];
    }
    cells.push(field); return cells;
  });
}
function capture(version: number) {
  const numeric = json<Numeric>(folder(version) + 'numeric-results-v1.json');
  const [headers, ...rows] = csv(numeric.csv.path);
  const get = (n: number, title: string) => rows[n - 1][headers.indexOf(title)];
  const cell = (n: number, title: string): Cell => ({ rowOrdinal: n, columnOrdinal: headers.indexOf(title) + 1,
    headerRaw: title, valueRaw: get(n, title) });
  const alphabet = /alphabet = "([^"]+)"/.exec(text(sourcePath(version)))![1];
  return { numeric, headers, rows, get, cell, alphabet };
}
function decode(alphabet: string, length: number, codes: number[]) {
  expect(Number.isInteger(length)).toBe(true); expect(length).toBeGreaterThanOrEqual(0);
  expect(length).toBeLessThanOrEqual(codes.length);
  return codes.map((code, k) => {
    expect(Number.isInteger(code)).toBe(true);
    if (k >= length) { expect(code).toBe(-1); return ''; }
    expect(code).toBeGreaterThanOrEqual(0); expect(code).toBeLessThan(alphabet.length);
    return alphabet[code];
  }).join('');
}
function rational(raw: string): [bigint, bigint] {
  if (raw.includes('/')) { const [n, d] = raw.split('/'); return [BigInt(n), BigInt(d)]; }
  if (!/^-?\d+(\.\d+)?$/.test(raw)) throw new Error(`Not a rational export: ${raw}`);
  const [whole, tail = ''] = raw.split('.'); return [BigInt(whole + tail), 10n ** BigInt(tail.length)];
}
function equalRational(a: string, b: string) {
  const [an, ad] = rational(a), [bn, bd] = rational(b); return an * bd === bn * ad;
}
function execute(version: number) {
  const c = capture(version), compiled = tryCompile(parse(text(sourcePath(version))));
  if (!compiled.success) throw new Error(compiled.unsupported.join('\n'));
  // Only actual main-chart inputs enter execution. No native study outputs are inputs.
  // Native row7 has index23344, a multiple of16: unchanged local phase0..15 aligns.
  const bars: Bar[] = c.numeric.selectedBlockDataRowOrdinals.map(n => ({ time: Number(c.get(n, 'time')) * 1000,
    open: Number(c.get(n, 'open')), high: Number(c.get(n, 'high')), low: Number(c.get(n, 'low')),
    close: Number(c.get(n, 'close')), volume: Number(c.get(n, 'Volume')) }));
  const result = executeCompiled(compiled, bars);
  if (!result) throw new Error('No string-format execution');
  expect(result.errors).toEqual([]); expect(result.profile.swallowedErrors ?? []).toEqual([]);
  return { c, plots: new Map(result.plots.map(p => [p.title!, p.values])) };
}

describe('v95 item15 calibrated complete string witnesses', () => {
  it('SHA-binds only 32 item15/common artifacts and v15 integrity/validation', () => {
    const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as { revision: string; files: Binding[] };
    expect(lock.revision).toBe(pin);
    const common = ['RESPONSE-v95-v15.md', 'attempt-inventory-v15.json', 'numeric-controls-v15.json',
      'facet-capabilities-v15.json', 'artifact-integrity-v15.json', 'validation-result-v15.json'];
    const entries = lock.files.filter(f => f.path.includes('/v95-string-format-v') || common.some(n => f.path === directory + n));
    const integrity = json<{ scope: string; files: Binding[] }>(directory + 'artifact-integrity-v15.json');
    expect(entries).toHaveLength(32); expect(integrity.scope).toContain('self-excludes');
    for (const entry of entries) {
      expect({ path: entry.path, bytes: bytes(entry.path).length, sha256: hash(bytes(entry.path)) }).toEqual(entry);
      if (!entry.path.endsWith('/artifact-integrity-v15.json')) expect(integrity.files.find(f => f.path === entry.path)).toEqual(entry);
    }
    expect(json<{ status: string }>(directory + 'validation-result-v15.json').status).toBe('PASS');
  });

  for (const version of [5, 6]) {
    it(`v${version}: authenticates unchanged source, native admission and all 39 plot bindings`, () => {
      const c = capture(version), source = text(sourcePath(version));
      expect(text(folder(version) + 'executed-v1.pine')).toBe(source);
      const form = text(folder(version) + 'save-request-v1.txt').replace(/\r\n/g, '\n');
      expect(form.split('name="source"\n\n')[1]?.split(/\n------WebKitFormBoundary/)[0]).toBe(source);
      expect(checkProgram(parse(source)).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
      expect(tryCompile(parse(source)).success).toBe(true);
      const obs = json<{ sourceSha256: string; privateScriptId: string; privateVersion: string; nativeCompileSuccess: boolean;
        nativeStudyInstanceId: null; editorMarkerArrays: null }>(folder(version) + 'observation-v1.json');
      expect(obs).toMatchObject({ sourceSha256: hash(bytes(sourcePath(version))), privateVersion: '1.0',
        nativeCompileSuccess: true, nativeStudyInstanceId: null, editorMarkerArrays: null });
      const binding = json<{ sourceSha256: string; nativePrivateId: string; nativeMetaInfoId: string;
        columns: { columnOrdinal: number; originalHeader: string; owner: string; privateVersion?: string;
          sourceSha256?: string; nativePlotId?: string; sourceLiteralPlotOrdinal?: number }[];
        unresolvedColumnOrdinals: unknown[]; missingOrAmbiguousRequestedPlotTitles: unknown[] }>(c.numeric.columnBindings.path);
      expect(binding.sourceSha256).toBe(obs.sourceSha256); expect(binding.nativePrivateId).toBe(obs.privateScriptId);
      expect([binding.unresolvedColumnOrdinals, binding.missingOrAmbiguousRequestedPlotTitles]).toEqual([[], []]);
      expect(binding.columns.map(b => b.originalHeader)).toEqual(c.headers); expect(binding.columns).toHaveLength(45);
      expect(binding.columns.slice(0, 5).every(b => b.owner === 'Native main chart')).toBe(true);
      expect(binding.columns[5].owner).toBe('Native builtin Vol · BTC');
      for (const kind of ['save', 'add']) {
        const body = json<{ success: boolean; result: { metaInfo: { id: string; warnings: unknown[];
          styles: Record<string, { title: string }> } } }>(folder(version) + kind + '-response-v1.json');
        expect(body.success).toBe(true); expect(body.result.metaInfo.id).toBe(binding.nativeMetaInfoId);
        expect(body.result.metaInfo.warnings).toEqual([]);
        binding.columns.slice(6).forEach((b, i) => {
          expect(b).toMatchObject({ columnOrdinal: i + 7, owner: obs.privateScriptId, privateVersion: '1.0',
            sourceSha256: obs.sourceSha256, nativePlotId: `plot_${i}`, sourceLiteralPlotOrdinal: i });
          expect(body.result.metaInfo.styles[b.nativePlotId!].title).toBe(b.originalHeader);
        });
      }
      const receipt = json<{ sourceExact: boolean; sourceSha256: string; sessions: unknown[] }>(folder(version) + 'capture-receipt-v1.json');
      expect(receipt).toMatchObject({ sourceExact: true, sourceSha256: obs.sourceSha256 });
      expect(receipt.sessions).toEqual([json(folder(version) + 'session-mode0-v1/session-receipt-v1.json')]);
    });

    it(`v${version}: re-derives physical closure and keeps omitted prefix/developing/Unicode holds`, () => {
      const c = capture(version), [, ...mask] = csv(c.numeric.closureMask.path);
      const obs = json<{ nativeObservationUtc: string; independentlyClosedRows: number;
        rawFirstRow: string[]; rawLastRow: string[]; samplingCompleteness: boolean }>(folder(version) + 'session-mode0-v1/row-set-observation-v1.json');
      expect([c.rows.length, c.numeric.closedRowsAvailable]).toEqual(version === 5 ? [362, 361] : [365, 364]);
      expect(mask).toHaveLength(c.rows.length); let closed = 0;
      c.rows.forEach((row, i) => {
        const n = i + 1, eligible = c.get(n, 'CHART_CONFIRMED') === '1'
          && (Number(c.get(n, 'time')) + 120) * 1000 <= Date.parse(obs.nativeObservationUtc);
        if (eligible) closed++;
        expect(mask[i]).toEqual([hash(bytes(c.numeric.csv.path)), String(n), row[0], c.get(n, 'INPUT_TIME'),
          c.get(n, 'INPUT_INDEX'), c.get(n, 'CHART_CONFIRMED'), obs.nativeObservationUtc,
          String(Number(row[0]) + 120), eligible ? '1' : '0', eligible ? 'OBSERVED' : 'OBSERVED / EXCLUDED',
          JSON.stringify(row.flatMap((value, j) => value === '' ? [j + 1] : [])),
          eligible ? '' : 'PHYSICALLY_OPEN_OR_NATIVE_CONFIRMATION_NOT_REACHED']);
        expect(c.get(n, 'INPUT_INDEX')).toBe(String(23338 + i)); expect(c.get(n, 'IS_FIRST')).toBe('0');
        expect([c.get(n, 'FIRST_INDEX'), c.get(n, 'FIRST_TIME')]).toEqual(['0', '1789344000000']);
      });
      expect(closed).toBe(c.numeric.closedRowsAvailable); expect(closed).toBe(obs.independentlyClosedRows);
      expect([c.rows[0], c.rows.at(-1)]).toEqual([obs.rawFirstRow, obs.rawLastRow]);
      expect(c.numeric.selectedBlockDataRowOrdinals).toEqual(Array.from({ length: 64 }, (_, i) => i + 7));
      expect(c.numeric.strictOwnIndexZeroPrefixAvailable).toBe(false); expect(obs.samplingCompleteness).toBe(false);
      expect(c.numeric.facets.at(-1)).toMatchObject({ facet: 'Unicode-wide behavior and strings beyond the supplied caps',
        captureStatus: 'NOT OBSERVED', hypothesisVerdict: 'UNDECIDED',
        cause: 'Deferred; unknown code/overflow remains a full-identity hold, never a runtime cap expansion' });
    });

    it(`v${version}: independently decodes 256 complete witnesses and checks all 2944 model records/pointers`, () => {
      const c = capture(version), counts: Record<string, number> = {}, refuted = new Set<string>(), targets = new Set<string>();
      expect(new Set(c.alphabet).size).toBe(c.alphabet.length);
      expect(c.numeric.comparisonCounts).toEqual({ SUPPORTED: 2464, REFUTED: 32, UNDECIDED: 448 });
      expect(c.numeric.records).toHaveLength(2944); expect(c.numeric.facets).toHaveLength(578);
      for (const r of c.numeric.records) {
        for (const p of [r.nativeCell, ...r.inputCells, ...(r.dependencyCells ?? [])]) expect(c.cell(p.rowOrdinal, p.headerRaw)).toEqual(p);
        const n = r.nativeCell.rowOrdinal, key = `${n}/${r.property}`;
        expect(n).toBeGreaterThanOrEqual(7); expect(n).toBeLessThanOrEqual(70);
        expect(r).toMatchObject({ closedScoringEligible: true, predictedBlank: false });
        expect(r.nativeCell.headerRaw).toBe(r.property); targets.add(key);
        counts[r.verdict] = (counts[r.verdict] ?? 0) + 1;
        if (r.model === 'NATIVE_TARGET_VECTOR') {
          expect(r).toMatchObject({ verdict: 'UNDECIDED', predictedRational: null,
            cause: 'Missing-number stringify is an open native target, preserved without empty/NaN substitution' });
          expect(r.property.startsWith('MISSING_')).toBe(true);
        } else {
          expect(equalRational(r.nativeCell.valueRaw, r.predictedRational!)).toBe(r.verdict === 'SUPPORTED');
          if (r.verdict === 'REFUTED') {
            expect(['ONE_DECIMAL_TIES_UP', 'ONE_DECIMAL_TIES_AWAY']).toContain(r.model);
            expect(r.property).toBe('FORMAT_C2'); expect(c.get(n, 'X')).toBe('1.25');
            expect([r.nativeCell.valueRaw, r.predictedRational]).toEqual(['2', '3']); refuted.add(key);
          }
        }
      }
      expect(counts).toEqual(c.numeric.comparisonCounts); expect(refuted.size).toBe(16); expect(targets.size).toBe(2048);
      for (const n of c.numeric.selectedBlockDataRowOrdinals) {
        const phase = (n - 7) % 16;
        expect(c.get(n, 'PHASE')).toBe(String(phase));
        expect(c.get(n, 'X')).toBe(String([-2.5, 0, 1.25, 12.5][phase % 4]));
        expect(c.get(n, 'FIXED_TIME')).toBe(String(Date.UTC(2026, 2, 8, phase % 2 ? 7 : 6, 30)));
        for (const [title, letter] of [['ENCODER_0', '0'], ['ENCODER_A', 'A'], ['ENCODER_DASH', '-']]) {
          expect(c.get(n, title)).toBe(String(c.alphabet.indexOf(letter)));
        }
        for (const prefix of prefixes) {
          const pointers = titles(prefix).map(t => c.cell(n, t));
          const decoded = decode(c.alphabet, Number(pointers[0].valueRaw), pointers.slice(1).map(p => Number(p.valueRaw)));
          const expected = prefix === 'TOSTRING' ? ['-2.50', '0.00', '1.25', '12.50'][phase % 4]
            : prefix === 'FORMAT' ? ['-2.5', '0.0', '1.2', '12.5'][phase % 4]
              : prefix === 'TIME' ? (phase % 2 ? '03:30' : '01:30') : 'NaN';
          expect(decoded).toBe(expected);
          expect(c.numeric.facets.find(f => f.facet === `Complete positional string witness / ${prefix}/row${n}`)?.details)
            .toEqual({ prefix, cap: caps[prefix], alphabet: c.alphabet, rawCellPointers: pointers,
              encoderCalibrated: true, decodedString: decoded, captureStatus: 'CAPTURED', cause: null });
        }
      }
      const { records: _records, ...summary } = c.numeric;
      const path = folder(version) + 'numeric-results-v1.json';
      for (const name of ['numeric-controls-v15.json', 'facet-capabilities-v15.json']) {
        const index = json<{ sources: (Omit<Numeric, 'records'> & { numericEvidence: Binding })[] }>(directory + name);
        expect(index.sources.find(s => s.sourceId === c.numeric.sourceId)).toEqual({ ...summary,
          numericEvidence: { path, bytes: bytes(path).length, sha256: hash(bytes(path)) } });
      }
    });

    for (const prefix of prefixes) {
      it(`v${version}: replays unchanged ${prefix} source to exact native length/codes and decoded text on 64 closed rows`, () => {
        const { c, plots } = execute(version); let compared = 0;
        for (const [i, n] of c.numeric.selectedBlockDataRowOrdinals.entries()) {
          for (const title of titles(prefix)) {
            expect(plots.get(title)![i], `row${n}/${title}`).toBe(Number(c.get(n, title))); compared++;
          }
          const length = plots.get(`${prefix}_LEN`)![i] as number;
          const codes = titles(prefix).slice(1).map(t => plots.get(t)![i] as number);
          const nativeText = decode(c.alphabet, Number(c.get(n, `${prefix}_LEN`)),
            titles(prefix).slice(1).map(t => Number(c.get(n, t))));
          expect(decode(c.alphabet, length, codes)).toBe(nativeText);
          for (const title of ['PHASE', 'X', 'FIXED_TIME', 'ENCODER_0', 'ENCODER_A', 'ENCODER_DASH']) {
            expect(plots.get(title)![i], `independent control row${n}/${title}`).toBe(Number(c.get(n, title)));
          }
        }
        expect(compared).toBe(64 * (caps[prefix] + 1));
        // No omitted-prefix, startup, market-DST or generic missing-string credit.
        expect(plots.get('INPUT_INDEX')![0]).toBe(0); expect(c.get(7, 'INPUT_INDEX')).toBe('23344');
        expect(plots.get('IS_FIRST')![0]).toBe(1); expect(c.get(7, 'IS_FIRST')).toBe('0');
        expect(plots.get('FIRST_TIME')![0]).not.toBe(Number(c.get(7, 'FIRST_TIME')));
      });
    }
  }
});
