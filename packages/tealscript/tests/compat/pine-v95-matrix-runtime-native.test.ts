import type { Bar } from '../../src/runtime/context';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

interface Binding { path: string; bytes: number; sha256: string }
interface RuntimeObservation {
  sourceId: string; sourceSha256: string; privateId: string; privateVersion: string;
  nativeSaveCompilerSuccess: boolean; nativeAddCompilerSuccess: boolean; nativeRuntimeCodes: string[];
  nativeUiFrames: Binding[]; fullRuntimeMessage: string | null; fullRuntimeMessageStatus: string;
  originalCsv: Binding; originalDataRows: number; privatePlotNonblankRows: number;
  sourceExecutionContextAvailable: boolean; numericCredit: number; cause: string;
  sourceRepairs: number; saveAddExportRetries: number;
}
interface Numeric {
  sourceId: string; sourceSha256: string; csv: Binding; columnBindings: Binding; closureMask: Binding;
  selectedBlockDataRowOrdinals: number[]; closedRowsAvailable: number; strictOwnIndexZeroPrefixAvailable: boolean;
  records: unknown[]; propertyVerdicts: unknown[]; comparisonCounts: Record<string, number>;
  facets: { facet: string; captureStatus: string; hypothesisVerdict: string; cause: string; details: unknown }[];
  nativeRuntimeObservation: Binding;
}
// Composition advances only the checkout pin; native item18 artifact hashes stay unchanged.
const pin = '811a4d799e49cd1ced9e69b58bb6d60cccacb294';
const directory = 'v95/captures/v95/';
const folder = (v: number) => `${directory}v95-matrix-mutations-v${v}/attempt-v1/`;
const sourcePath = (v: number) => `v95/sources/v95-matrix-mutations-v${v}.pine`;
const bytes = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url));
const text = (path: string) => bytes(path).toString();
const json = <T,>(path: string): T => JSON.parse(text(path)) as T;
const hash = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');
const message = "Error on bar 0: In the 'matrix.concat()' function. The number of columns in both matrices must be identical.";
function binding(path: string): Binding { return { path, bytes: bytes(path).length, sha256: hash(bytes(path)) }; }
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
function capture(v: number) {
  const numeric = json<Numeric>(folder(v) + 'numeric-results-v1.json');
  const runtime = json<RuntimeObservation>(folder(v) + 'runtime-observation-v1.json');
  const [headers, ...rows] = csv(numeric.csv.path);
  return { numeric, runtime, headers, rows };
}

describe('v95 item18 unchanged matrix runtime failures (zero numeric credit)', () => {
  it('SHA-binds 41 item18/common artifacts including both runtime observations and v21 integrity/validation', () => {
    const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as { revision: string; files: Binding[] };
    expect(lock.revision).toBe(pin);
    const common = ['RESPONSE-v95-v21.md', 'attempt-inventory-v21.json', 'numeric-controls-v21.json',
      'facet-capabilities-v21.json', 'artifact-integrity-v21.json', 'validation-result-v21.json'];
    const entries = lock.files.filter(f => f.path.includes('/v95-matrix-mutations-v') || common.some(n => f.path === directory + n));
    const integrity = json<{ scope: string; files: Binding[] }>(directory + 'artifact-integrity-v21.json');
    expect(entries).toHaveLength(41); expect(integrity.scope).toContain('self-excludes');
    for (const entry of entries) {
      expect(binding(entry.path)).toEqual(entry);
      if (!entry.path.endsWith('/artifact-integrity-v21.json')) expect(integrity.files.find(f => f.path === entry.path)).toEqual(entry);
    }
    expect(json<{ status: string }>(directory + 'validation-result-v21.json').status).toBe('PASS');
  });

  for (const version of [5, 6]) {
    it(`v${version}: authenticates unchanged source and successful native Save/Add, not execution success`, () => {
      const c = capture(version), source = text(sourcePath(version));
      expect(text(folder(version) + 'executed-v1.pine')).toBe(source);
      const form = text(folder(version) + 'save-request-v1.txt').replace(/\r\n/g, '\n');
      expect(form.split('name="source"\n\n')[1]?.split(/\n------WebKitFormBoundary/)[0]).toBe(source);
      expect(source.split('\n')[15]).toBe('joined = matrix.concat(m, extra)');
      expect(checkProgram(parse(source)).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
      expect(tryCompile(parse(source)).success).toBe(true);
      const obs = json<{ sourceSha256: string; privateScriptId: string; privateVersion: string; nativeCompileSuccess: boolean;
        nativeStudyInstanceId: null; editorMarkerArrays: null }>(folder(version) + 'observation-v1.json');
      expect(obs).toMatchObject({ sourceSha256: hash(bytes(sourcePath(version))), privateVersion: '1.0',
        nativeCompileSuccess: true, nativeStudyInstanceId: null, editorMarkerArrays: null });
      expect(c.runtime).toMatchObject({ sourceId: c.numeric.sourceId, sourceSha256: obs.sourceSha256,
        privateId: obs.privateScriptId, privateVersion: '1.0', nativeSaveCompilerSuccess: true, nativeAddCompilerSuccess: true });
      const columns = json<{ nativePrivateId: string; nativeMetaInfoId: string; sourceSha256: string;
        unresolvedColumnOrdinals: unknown[]; missingOrAmbiguousRequestedPlotTitles: unknown[];
        columns: { columnOrdinal: number; originalHeader: string; owner: string; privateVersion?: string;
          sourceSha256?: string; nativePlotId?: string; sourceLiteralPlotOrdinal?: number }[] }>(c.numeric.columnBindings.path);
      expect(columns.nativePrivateId).toBe(obs.privateScriptId); expect(columns.sourceSha256).toBe(obs.sourceSha256);
      expect([columns.unresolvedColumnOrdinals, columns.missingOrAmbiguousRequestedPlotTitles]).toEqual([[], []]);
      expect(columns.columns.map(b => b.originalHeader)).toEqual(c.headers); expect(c.headers).toHaveLength(31);
      expect(columns.columns.slice(0, 5).every(b => b.owner === 'Native main chart')).toBe(true);
      expect(columns.columns[5].owner).toBe('Native builtin Vol · BTC');
      const diagnostics = json<{ transports: { nativeSuccess: boolean; body: Binding; nativeStructuredErrors: null }[] }>(folder(version) + 'compiler-diagnostics-v1.json');
      expect(diagnostics.transports).toHaveLength(2);
      for (const [i, kind] of ['save', 'add'].entries()) {
        const path = folder(version) + kind + '-response-v1.json';
        const body = json<{ success: boolean; result: { metaInfo: { id: string; warnings: unknown[]; styles: Record<string, { title: string }> } } }>(path);
        expect(body.success).toBe(true); expect(body.result.metaInfo.id).toBe(columns.nativeMetaInfoId);
        expect(body.result.metaInfo.warnings).toEqual([]);
        expect(diagnostics.transports[i]).toMatchObject({ nativeSuccess: true, body: binding(path), nativeStructuredErrors: null });
        columns.columns.slice(6).forEach((b, k) => {
          expect(b).toMatchObject({ columnOrdinal: k + 7, owner: obs.privateScriptId, privateVersion: '1.0',
            sourceSha256: obs.sourceSha256, nativePlotId: `plot_${k}`, sourceLiteralPlotOrdinal: k });
          expect(body.result.metaInfo.styles[b.nativePlotId!].title).toBe(b.originalHeader);
        });
      }
      const receipt = json<{ sourceExact: boolean; sourceSha256: string; sessions: unknown[] }>(folder(version) + 'capture-receipt-v1.json');
      expect(receipt).toMatchObject({ sourceExact: true, sourceSha256: obs.sourceSha256 });
      expect(receipt.sessions).toEqual([json(folder(version) + 'session-mode0-v1/session-receipt-v1.json')]);
    });

    it(`v${version}: retains every original blank source cell and runtime exclusion, with zero numeric/prefix credit`, () => {
      const c = capture(version), [, ...mask] = csv(c.numeric.closureMask.path);
      const obs = json<{ nativeObservationUtc: string; independentlyClosedRows: number; rawFirstRow: string[];
        rawLastRow: string[]; sourceOwnFirstRow: Record<string, string>; samplingCompleteness: boolean }>(folder(version) + 'session-mode0-v1/row-set-observation-v1.json');
      expect(c.rows).toHaveLength(version === 5 ? 379 : 382); expect(mask).toHaveLength(c.rows.length);
      c.rows.forEach((row, i) => {
        expect(row).toHaveLength(31); expect(row.slice(0, 6).every(v => v !== '' && Number.isFinite(Number(v)))).toBe(true);
        expect(row.slice(6)).toEqual(Array(25).fill(''));
        expect(mask[i]).toEqual([c.numeric.csv.sha256, String(i + 1), row[0], '', '', '', obs.nativeObservationUtc,
          String(Number(row[0]) + 120), '0', 'OBSERVED / EXCLUDED', JSON.stringify(Array.from({ length: 25 }, (_, k) => k + 7)),
          'SOURCE_EXECUTION_CONTEXT_UNAVAILABLE_AFTER_NATIVE_RUNTIME_ERROR']);
      });
      expect([c.rows[0], c.rows.at(-1)]).toEqual([obs.rawFirstRow, obs.rawLastRow]);
      expect(Object.values(obs.sourceOwnFirstRow)).toEqual(Array(5).fill(''));
      expect(obs.independentlyClosedRows).toBe(0); expect(obs.samplingCompleteness).toBe(false);
      expect(c.numeric).toMatchObject({ selectedBlockDataRowOrdinals: [], closedRowsAvailable: 0,
        strictOwnIndexZeroPrefixAvailable: false, records: [], comparisonCounts: {}, propertyVerdicts: [] });
      expect(c.runtime).toMatchObject({ originalCsv: c.numeric.csv, originalDataRows: c.rows.length, privatePlotNonblankRows: 0,
        sourceExecutionContextAvailable: false, numericCredit: 0, sourceRepairs: 0, saveAddExportRetries: 0 });
      expect(c.runtime.cause).toBe('Native runtime failure; original blank private cells remain OBSERVED / EXCLUDED, not valid Pine NA vector values or recovered startup inputs');
      expect(c.numeric.nativeRuntimeObservation).toEqual(binding(folder(version) + 'runtime-observation-v1.json'));
      expect(c.numeric.facets.find(f => f.facet === 'Native runtime admission')).toMatchObject({ captureStatus: 'CAPTURED',
        hypothesisVerdict: 'UNDECIDED', details: c.runtime });
      expect(c.numeric.facets.filter(f => f.facet !== 'Native runtime admission').every(f => f.captureStatus === 'NOT OBSERVED'
        && f.hypothesisVerdict === 'UNDECIDED')).toBe(true);
      const { records: _records, ...summary } = c.numeric;
      for (const name of ['numeric-controls-v21.json', 'facet-capabilities-v21.json']) {
        const index = json<{ sources: unknown[] }>(directory + name);
        expect(index.sources).toContainEqual({ ...summary, numericEvidence: binding(folder(version) + 'numeric-results-v1.json') });
      }
    });

    it(`v${version}: binds RE10094 UI while keeping v5 detail/stack unobserved`, () => {
      const { runtime } = capture(version);
      expect(runtime.nativeRuntimeCodes).toEqual(['RE10094']);
      expect(runtime.nativeUiFrames).toHaveLength(version === 5 ? 2 : 1);
      for (const frame of runtime.nativeUiFrames) {
        expect(binding(frame.path)).toEqual(frame); expect(text(frame.path)).toContain('Runtime error: RE10094');
      }
      if (version === 5) {
        expect(runtime.fullRuntimeMessage).toBeNull(); expect(runtime.fullRuntimeMessageStatus).toContain('UNOBSERVED');
      } else {
        expect(runtime.fullRuntimeMessage).toBe(message);
        expect(text(runtime.nativeUiFrames[0].path)).toContain(`Runtime error: RE10094 ${message} at #main():16`);
        expect(json(folder(version) + 'capture-continuation-v1.json')).toMatchObject({ sourceEntryRepeats: 0,
          saveRepeats: 0, addRepeats: 0, exportsBeforeContinuation: 0 });
      }
    });

    it(`v${version}: compiles unchanged then halts at matrix.concat on bar0 without any plot output`, () => {
      const c = capture(version), compiled = tryCompile(parse(text(sourcePath(version))));
      if (!compiled.success) throw new Error(compiled.unsupported.join('\n'));
      // Only native main-chart OHLCV/time enter execution. All25 study outputs
      // are blank, never inputs. The first-bar shape failure uses literal matrices,
      // not any recovered native prefix or earlier getter values.
      const bars: Bar[] = c.rows.slice(0, 3).map(row => ({ time: Number(row[0]) * 1000,
        open: Number(row[1]), high: Number(row[2]), low: Number(row[3]), close: Number(row[4]), volume: Number(row[5]) }));
      const result = executeCompiled(compiled, bars);
      if (!result) throw new Error('No matrix execution');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].runtimeError).toMatchObject({ code: 'RE10094', barIndex: 0 });
      if (version === 6) {
        expect(result.errors[0]).toMatchObject({ message, code: 'RE10094', line: 16, barIndex: 0 });
        expect(result.errors[0].runtimeError?.stackTrace).toEqual([{ n: '#main', p: 16 }]);
      }
      // No v5 wording or native stack assertion: those details were not exposed.
      expect(result.plots).toEqual([]); expect(result.drawings).toEqual([]);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
    });
  }
});
