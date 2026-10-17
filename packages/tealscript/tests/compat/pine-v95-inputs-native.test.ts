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
  dependencyCells?: Cell[]; predictedRational: string; predictedBlank: boolean; closedScoringEligible: boolean;
}
interface Numeric {
  sourceId: string; sourceSha256: string; csv: Binding; columnBindings: Binding; closureMask: Binding;
  selectedBlockDataRowOrdinals: number[]; closedRowsAvailable: number; strictOwnIndexZeroPrefixAvailable: boolean;
  records: NumericRecord[]; comparisonCounts: Record<string, number>;
  facets: { facet: string; captureStatus: string; hypothesisVerdict: string; cause: string | null; details: unknown }[];
}
interface NativeInput { id: string; name: string; type: string; defval: unknown }
const pin = '56abd808d88595bab7808c063d065ce2bcd7dc55';
const directory = 'v95/captures/v95/';
const folder = (v: number) => `${directory}v95-input-defaults-v${v}/attempt-v1/`;
const sourcePath = (v: number) => `v95/sources/v95-input-defaults-v${v}.pine`;
const bytes = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url));
const text = (path: string) => bytes(path).toString();
const json = <T,>(path: string): T => JSON.parse(text(path)) as T;
const hash = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');
const declared: Record<string, number> = {
  INT: 7, FLOAT: 1.25, BOOL: 1, STRING_LENGTH: 3, STRING_EXACT: 1, ENUM_A: 1,
  SESSION_LENGTH: 9, SESSION_EXACT: 1, TF_LENGTH: 1, TF_EXACT: 1,
  SYMBOL_LENGTH: 15, SYMBOL_EXACT: 1, PRICE: 12.5, TIME: 1767225600000,
  COLOR_R: 10, COLOR_G: 20, COLOR_B: 30, COLOR_T: 40, GENERIC: 2, TEXT_LENGTH: 4, TEXT_EXACT: 1,
};
const nativeDefaults = [
  ['I', 'integer', 7], ['F', 'float', 1.25], ['B', 'bool', true], ['S', 'text', 'AB1'],
  ['E', 'text', 'Alpha'], ['SESSION', 'session', '2300-0200'], ['TF', 'resolution', '6'],
  ['SYMBOL', 'symbol', 'BINANCE:BTCUSDT'], ['SOURCE', 'source', 'close'], ['PRICE', 'price', 12.5],
  ['TIME', 'time', 1767225600000], ['COLOR', 'color', 'rgba(10,20,30,0.6)'],
  ['GENERIC', 'integer', 2], ['TEXT', 'text_area', 'AB\n1'],
];
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
  const get = (ordinal: number, title: string) => rows[ordinal - 1][headers.indexOf(title)];
  const rowObservation = json<{ nativeObservationUtc: string; independentlyClosedRows: number;
    rawFirstRow: string[]; rawLastRow: string[]; samplingCompleteness: boolean }>(folder(version) + 'session-mode0-v1/row-set-observation-v1.json');
  return { numeric, headers, rows, get, rowObservation };
}
function rational(raw: string): [bigint, bigint] {
  if (raw.includes('/')) { const [n, d] = raw.split('/'); return [BigInt(n), BigInt(d)]; }
  if (!/^-?\d+(\.\d+)?$/.test(raw)) throw new Error(`Not a rational export: ${raw}`);
  const [whole, tail = ''] = raw.split('.'); return [BigInt(whole + tail), 10n ** BigInt(tail.length)];
}
function equalRational(a: string, b: string) {
  const [an, ad] = rational(a), [bn, bd] = rational(b); return an * bd === bn * ad;
}

describe('v95 item13 unchanged native input defaults', () => {
  it('SHA-binds the 33 item13/common artifacts and v11 integrity/validation', () => {
    const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as { revision: string; files: Binding[] };
    expect(lock.revision).toBe(pin);
    const common = ['RESPONSE-v95-v11.md', 'attempt-inventory-v11.json', 'numeric-controls-v11.json',
      'facet-capabilities-v11.json', 'artifact-integrity-v11.json', 'validation-result-v11.json'];
    const entries = lock.files.filter(f => f.path.includes('/v95-input-defaults-v') || common.some(n => f.path === directory + n));
    const integrity = json<{ scope: string; files: Binding[] }>(directory + 'artifact-integrity-v11.json');
    expect(entries).toHaveLength(33); expect(integrity.scope).toContain('self-excludes');
    for (const entry of entries) {
      expect({ path: entry.path, bytes: bytes(entry.path).length, sha256: hash(bytes(entry.path)) }).toEqual(entry);
      if (!entry.path.endsWith('/artifact-integrity-v11.json')) expect(integrity.files.find(f => f.path === entry.path)).toEqual(entry);
    }
    expect(json<{ status: string }>(directory + 'validation-result-v11.json').status).toBe('PASS');
  });

  for (const version of [5, 6]) {
    it(`v${version}: authenticates unchanged source, private plot ownership, native default metadata and admission`, () => {
      const c = capture(version), source = text(sourcePath(version));
      expect(text(folder(version) + 'executed-v1.pine')).toBe(source);
      const form = text(folder(version) + 'save-request-v1.txt').replace(/\r\n/g, '\n');
      expect(form.split('name="source"\n\n')[1]?.split(/\n------WebKitFormBoundary/)[0]).toBe(source);
      expect(checkProgram(parse(source)).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
      expect(tryCompile(parse(source)).success).toBe(true);
      const obs = json<{ sourceSha256: string; privateScriptId: string; privateVersion: string; nativeCompileSuccess: boolean;
        nativeStudyInstanceId: null; editorMarkerArrays: null; nativeInputsMetadata: NativeInput[]; nativeDefaultsMetadata: unknown;
        settings: { symbol: string } }>(folder(version) + 'observation-v1.json');
      expect(obs).toMatchObject({ sourceSha256: hash(bytes(sourcePath(version))), privateVersion: '1.0',
        nativeCompileSuccess: true, nativeStudyInstanceId: null, editorMarkerArrays: null, settings: { symbol: 'BINANCE:BTCUSDT' } });
      const binding = json<{ sourceSha256: string; nativePrivateId: string; nativeMetaInfoId: string;
        columns: { columnOrdinal: number; originalHeader: string; owner: string; privateVersion?: string;
          sourceSha256?: string; nativePlotId?: string; sourceLiteralPlotOrdinal?: number }[];
        unresolvedColumnOrdinals: unknown[]; missingOrAmbiguousRequestedPlotTitles: unknown[] }>(c.numeric.columnBindings.path);
      expect(binding.sourceSha256).toBe(obs.sourceSha256); expect(binding.nativePrivateId).toBe(obs.privateScriptId);
      expect([binding.unresolvedColumnOrdinals, binding.missingOrAmbiguousRequestedPlotTitles]).toEqual([[], []]);
      expect(binding.columns.map(b => b.originalHeader)).toEqual(c.headers); expect(binding.columns).toHaveLength(36);
      expect(binding.columns.slice(0, 5).every(b => b.owner === 'Native main chart')).toBe(true);
      expect(binding.columns[5].owner).toBe('Native builtin Vol · BTC');
      for (const kind of ['save', 'add']) {
        const body = json<{ success: boolean; result: { metaInfo: { id: string; warnings: unknown[];
          inputs: NativeInput[]; styles: Record<string, { title: string }>; defaults: { inputs: Record<string, unknown> } } } }>(folder(version) + kind + '-response-v1.json');
        expect(body.success).toBe(true); expect(body.result.metaInfo.id).toBe(binding.nativeMetaInfoId);
        expect(body.result.metaInfo.warnings).toEqual([]);
        // Passive metadata retention does not adjudicate settings/UI enforcement.
        if (kind === 'save') {
          expect(body.result.metaInfo.inputs).toEqual(obs.nativeInputsMetadata);
          expect(body.result.metaInfo.defaults).toEqual(obs.nativeDefaultsMetadata);
        }
        // Add has a different encrypted ILScript blob; both original bodies stay SHA-bound.
        expect(body.result.metaInfo.inputs.filter(i => i.id.startsWith('in_')).map(i => [i.name, i.type, i.defval])).toEqual(nativeDefaults);
        expect(body.result.metaInfo.inputs.filter(i => i.id.startsWith('in_')).map(i => body.result.metaInfo.defaults.inputs[i.id]))
          .toEqual(nativeDefaults.map(d => d[2]));
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

    it(`v${version}: re-derives closure masks and retains unscored suffix/developing cells and deferred facets`, () => {
      const c = capture(version), [, ...mask] = csv(c.numeric.closureMask.path);
      expect([c.rows.length, c.numeric.closedRowsAvailable]).toEqual(version === 5 ? [350, 349] : [355, 354]);
      expect(mask).toHaveLength(c.rows.length); let closed = 0;
      c.rows.forEach((row, i) => {
        const n = i + 1, eligible = c.get(n, 'CHART_CONFIRMED') === '1'
          && (Number(c.get(n, 'time')) + 120) * 1000 <= Date.parse(c.rowObservation.nativeObservationUtc);
        if (eligible) closed++;
        expect(mask[i]).toEqual([hash(bytes(c.numeric.csv.path)), String(n), row[0], c.get(n, 'INPUT_TIME'),
          c.get(n, 'INPUT_INDEX'), c.get(n, 'CHART_CONFIRMED'), c.rowObservation.nativeObservationUtc,
          String(Number(row[0]) + 120), eligible ? '1' : '0', eligible ? 'OBSERVED' : 'OBSERVED / EXCLUDED',
          JSON.stringify(row.flatMap((value, j) => value === '' ? [j + 1] : [])),
          eligible ? '' : 'PHYSICALLY_OPEN_OR_NATIVE_CONFIRMATION_NOT_REACHED']);
        expect(c.get(n, 'INPUT_INDEX')).toBe(String(23338 + i)); expect(c.get(n, 'IS_FIRST')).toBe('0');
        expect([c.get(n, 'FIRST_INDEX'), c.get(n, 'FIRST_TIME')]).toEqual(['0', '1789344000000']);
        if (n < 7 || n > 38) expect(c.numeric.records.some(r => r.nativeCell.rowOrdinal === n)).toBe(false);
      });
      expect(closed).toBe(c.numeric.closedRowsAvailable); expect(closed).toBe(c.rowObservation.independentlyClosedRows);
      expect([c.rows[0], c.rows.at(-1)]).toEqual([c.rowObservation.rawFirstRow, c.rowObservation.rawLastRow]);
      expect(c.numeric.selectedBlockDataRowOrdinals).toEqual(Array.from({ length: 32 }, (_, i) => i + 7));
      expect(c.numeric.strictOwnIndexZeroPrefixAvailable).toBe(false); expect(c.rowObservation.samplingCompleteness).toBe(false);
      expect(c.numeric.facets.find(f => f.facet.startsWith('Options/range/step'))).toMatchObject({
        captureStatus: 'NOT OBSERVED', hypothesisVerdict: 'UNDECIDED',
        cause: 'Deferred; no input/settings state was changed or external source selected',
      });
    });

    it(`v${version}: authenticates all 736 exact native records and original pointers without duplicate credit`, () => {
      const c = capture(version), targets = new Set<string>();
      expect(c.numeric.comparisonCounts).toEqual({ SUPPORTED: 736 }); expect(c.numeric.records).toHaveLength(736);
      for (const r of c.numeric.records) {
        for (const p of [r.nativeCell, ...r.inputCells, ...(r.dependencyCells ?? [])]) {
          expect(c.headers[p.columnOrdinal - 1]).toBe(p.headerRaw); expect(c.get(p.rowOrdinal, p.headerRaw)).toBe(p.valueRaw);
          expect(p.rowOrdinal).toBeLessThanOrEqual(c.numeric.closedRowsAvailable);
        }
        expect(r).toMatchObject({ verdict: 'SUPPORTED', predictedBlank: false, closedScoringEligible: true });
        const ordinal = r.nativeCell.rowOrdinal; expect(ordinal).toBeGreaterThanOrEqual(7); expect(ordinal).toBeLessThanOrEqual(38);
        expect(r.nativeCell.headerRaw).toBe(r.property);
        expect(equalRational(r.nativeCell.valueRaw, r.predictedRational)).toBe(true);
        if (r.property === 'SOURCE' || r.property === 'INPUT_CLOSE') {
          const input = r.property === 'SOURCE' ? 'INPUT_CLOSE' : 'close';
          expect(r.model).toBe(r.property === 'SOURCE' ? 'DEFAULT_SOURCE_EQUALS_OWN_CLOSE' : 'OWN_SOURCE_CHART_CLOSE_BINDING');
          expect(r.inputCells).toEqual([{ rowOrdinal: ordinal, columnOrdinal: c.headers.indexOf(input) + 1,
            headerRaw: input, valueRaw: c.get(ordinal, input) }]);
          expect(r.nativeCell.valueRaw).toBe(c.get(ordinal, input));
        } else {
          expect(r.model).toBe('UNCHANGED_DECLARED_NATIVE_DEFAULT');
          expect(Object.hasOwn(declared, r.property)).toBe(true); expect(r.inputCells).toEqual([]);
          expect(equalRational(r.nativeCell.valueRaw, String(declared[r.property]))).toBe(true);
        }
        const key = `${ordinal}/${r.property}`; expect(targets.has(key)).toBe(false); targets.add(key);
      }
      expect(targets.size).toBe(736);
      const { records: _records, ...summary } = c.numeric;
      const path = folder(version) + 'numeric-results-v1.json';
      for (const name of ['numeric-controls-v11.json', 'facet-capabilities-v11.json']) {
        const index = json<{ sources: (Omit<Numeric, 'records'> & { numericEvidence: Binding })[] }>(directory + name);
        expect(index.sources.find(s => s.sourceId === c.numeric.sourceId)).toEqual({ ...summary,
          numericEvidence: { path, bytes: bytes(path).length, sha256: hash(bytes(path)) } });
      }
    });

    it(`v${version}: matches all 736 selected native default/control cells from actual chart OHLCV with no input overrides`, () => {
      const c = capture(version), source = text(sourcePath(version)), compiled = tryCompile(parse(source));
      if (!compiled.success) throw new Error(compiled.unsupported.join('\n'));
      const ordinals = c.numeric.selectedBlockDataRowOrdinals;
      // Only native main-chart inputs enter execution. Study output cells are expectations.
      const bars: Bar[] = ordinals.map(n => ({ time: Number(c.get(n, 'time')) * 1000,
        open: Number(c.get(n, 'open')), high: Number(c.get(n, 'high')), low: Number(c.get(n, 'low')),
        close: Number(c.get(n, 'close')), volume: Number(c.get(n, 'Volume')) }));
      const result = executeCompiled(compiled, bars, undefined, { runtime: {
        syminfo: { tickerid: 'BINANCE:BTCUSDT', ticker: 'BTCUSDT', prefix: 'BINANCE', timezone: 'UTC', type: 'crypto' },
        timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true },
      } });
      if (!result) throw new Error('No default-input execution');
      expect(result.errors).toEqual([]); expect(result.profile.swallowedErrors ?? []).toEqual([]);
      expect(result.inputs.map(i => i.title)).toEqual(nativeDefaults.map(d => d[0]));
      const plots = new Map(result.plots.map(p => [p.title!, p.values])); let compared = 0;
      expect(new Set(bars.map(b => b.close)).size).toBeGreaterThan(1);
      for (const [index, n] of ordinals.entries()) {
        for (const title of [...Object.keys(declared), 'SOURCE', 'INPUT_CLOSE']) {
          expect(plots.get(title)![index], `row${n}/${title}`).toBe(Number(c.get(n, title))); compared++;
        }
        expect(plots.get('SOURCE')![index]).toBe(bars[index].close);
        expect(plots.get('INPUT_CLOSE')![index]).toBe(bars[index].close);
      }
      expect(compared).toBe(736);
      // Constants/current-close defaults need no omitted native startup state.
      expect(plots.get('INPUT_INDEX')![0]).toBe(0); expect(c.get(7, 'INPUT_INDEX')).toBe('23344');
      expect(plots.get('IS_FIRST')![0]).toBe(1); expect(c.get(7, 'IS_FIRST')).toBe('0');
      expect(plots.get('FIRST_TIME')![0]).not.toBe(Number(c.get(7, 'FIRST_TIME')));
    });
  }

  it('retains the v5 cleanup-name interruption as capture-process evidence, never an engine defect', () => {
    const partial = json<{ sourceEntered: boolean; retryAllowed: boolean; error: string; save: unknown; add: unknown }>(folder(5) + 'partial-attempt-v1.json');
    const receipt = json<{ removed: boolean; save: unknown; add: unknown; cleanupInterruption: string }>(folder(5) + 'capture-receipt-v1.json');
    expect(partial.sourceEntered).toBe(true); expect(partial.retryAllowed).toBe(false);
    expect(partial.error).toBe('Error: Own study not found in native tree v95-input-defaults-v5');
    expect([partial.save, partial.add]).toEqual([receipt.save, receipt.add]);
    expect(receipt.removed).toBe(true); expect(receipt.cleanupInterruption).toContain('No entry/Save/Add/export retry.');
  });
});
