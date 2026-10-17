import type { Bar } from '../../src/runtime/context';

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
interface Cell {
  rowOrdinal: number;
  columnOrdinal: number;
  headerRaw: string;
  valueRaw: string;
}
interface NativeRecord {
  property: string;
  verdict: string;
  nativeCell: Cell;
  inputCells: Cell[];
  predictedBlank: boolean;
  predictedRational: string | null;
  closedScoringEligible: boolean;
  exclusionCause?: string;
}
interface Numeric {
  sourceId: string;
  sourceSha256: string;
  item: number;
  selectedBlockDataRowOrdinals: number[];
  strictOwnIndexZeroPrefixAvailable: boolean;
  comparisonCounts: { SUPPORTED: number; UNDECIDED: number };
  records: NativeRecord[];
}
interface Source {
  sourceId: string;
  item: number;
  pineVersion: number;
  requestSource: string;
  sourceSha256: string;
  executed: Proof;
  privateScriptId: string;
  privateVersion: string;
  nativeCompileSuccess: boolean;
  editorMarkerArrays: null;
  nativeStudyInstanceId: null;
  nativeWarningChannel: unknown[];
  saveBody: Proof;
  addBody: Proof;
}
interface RowSet {
  dataRows: number;
  independentlyClosedRows: number;
  strictOwnIndexZeroPrefixAvailable: boolean;
  samplingCompleteness: boolean;
  nativeObservationUtc: string;
}

const base = 'v95/captures/v95/';
const ids = [5, 6].map((v) => `v95-udf-state-v${v}`);
const bytes = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url));
const read = (path: string) => bytes(path).toString('utf8');
const json = <T>(path: string): T => JSON.parse(read(path)) as T;
const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
// Numeric exports have plain fields. Closure masks also have quoted JSON lists.
function csv(path: string) {
  const rows = read(path)
    .trimEnd()
    .split(/\r?\n/)
    .map((line) => {
      const fields: string[] = [];
      let field = '',
        quoted = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"' && quoted && line[i + 1] === '"') {
          field += '"';
          i++;
        } else if (c === '"') quoted = !quoted;
        else if (c === ',' && !quoted) {
          fields.push(field);
          field = '';
        } else field += c;
      }
      fields.push(field);
      if (quoted) throw new Error(`Unclosed CSV quote: ${path}`);
      return fields;
    });
  return { headers: rows[0], rows: rows.slice(1) };
}
const familyFiles = [
  'executed-v1.pine',
  'save-request-v1.txt',
  'save-response-v1.json',
  'add-response-v1.json',
  'observation-v1.json',
  'capture-receipt-v1.json',
  'compiler-diagnostics-v1.json',
  'numeric-results-v1.json',
  'session-mode0-v1/chart-native-v1.csv',
  'session-mode0-v1/column-bindings-v1.json',
  'session-mode0-v1/row-closure-mask-v1.csv',
  'session-mode0-v1/row-set-observation-v1.json',
  'session-mode0-v1/session-receipt-v1.json',
  'session-mode0-v1/chart-download-v1.json',
  'session-mode0-v1/render-context-v1.txt',
];
const paths = [
  'v95/REQUEST-v95-v1.md',
  ...[
    'RESPONSE-v95-v3.md',
    'attempt-inventory-v3.json',
    'numeric-controls-v3.json',
    'facet-capabilities-v3.json',
    'artifact-integrity-v3.json',
    'validation-result-v3.json',
  ].map((p) => base + p),
  ...ids.flatMap((id) => ['v95/sources/' + id + '.pine', ...familyFiles.map((p) => base + id + '/attempt-v1/' + p)]),
];
const inventory = json<{ attempts: { source: Source; status: string; removed: boolean }[] }>(
  base + 'attempt-inventory-v3.json',
);
const captures = ids.map((id) => {
  const folder = base + id + '/attempt-v1/';
  const session = folder + 'session-mode0-v1/';
  const data = csv(session + 'chart-native-v1.csv');
  const cell = (row: string[], title: string) => {
    const i = data.headers.indexOf(title);
    if (i < 0 || row.length !== data.headers.length) throw new Error(`Missing ${id}:${title}`);
    return row[i];
  };
  // Derive the first four complete reset blocks from raw rows, independently of numeric-results.
  const start = data.rows.findIndex((row) => cell(row, 'PHASE') === '0');
  const selected = data.rows.slice(start, start + 64);
  return {
    id,
    folder,
    session,
    data,
    cell,
    start,
    selected,
    source: inventory.attempts.find((a) => a.source.sourceId === id)!,
    numeric: json<Numeric>(folder + 'numeric-results-v1.json'),
    rowSet: json<RowSet>(session + 'row-set-observation-v1.json'),
    mask: csv(session + 'row-closure-mask-v1.csv'),
  };
});

function run(capture: (typeof captures)[number]) {
  // Unchanged source, captured OHLCV/time, local bar_index0..63. The native selected
  // block starts at index23344, divisible by16: reset/phase-dependent outputs are
  // invariant to that multiple-of16 translation. This is NOT an own-prefix replay.
  // Never compare absolute INPUT_INDEX, IS_FIRST, FIRST_* or LOCAL_FIRST values.
  const ast = parse(read(capture.folder + 'executed-v1.pine'));
  expect(checkProgram(ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const compiled = tryCompile(ast);
  expect(compiled.success).toBe(true);
  const bars: Bar[] = capture.selected.map((row) => ({
    time: Number(capture.cell(row, 'time')) * 1000,
    open: Number(capture.cell(row, 'open')),
    high: Number(capture.cell(row, 'high')),
    low: Number(capture.cell(row, 'low')),
    close: Number(capture.cell(row, 'close')),
    volume: Number(capture.cell(row, 'Volume')),
  }));
  const result = executeCompiled(compiled, bars, undefined, {
    runtime: {
      syminfo: { tickerid: 'BINANCE:BTCUSDT' },
      timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true },
    },
  })!;
  expect(result.errors).toEqual([]);
  return result;
}

describe('v95 item3 UDF state: 404 closed reset/presence comparisons per version', () => {
  it('binds item3 artifacts, v3 integrity and validation without importing other families', () => {
    const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as {
      files: Proof[];
    };
    const integrity = json<{ files: Proof[] }>(base + 'artifact-integrity-v3.json');
    expect(new Set(paths).size).toBe(39);
    for (const path of paths) {
      const raw = bytes(path);
      const proof = { path, bytes: raw.length, sha256: hash(raw) };
      expect(
        lock.files.find((f) => f.path === path),
        path,
      ).toEqual(proof);
      if (!path.endsWith('/artifact-integrity-v3.json'))
        expect(
          integrity.files.find((f) => f.path === path),
          path,
        ).toEqual(proof);
    }
    expect(json(base + 'validation-result-v3.json')).toMatchObject({
      version: 'v3',
      status: 'PASS',
      sourceSlotsAudited: 6,
      ownIndexZeroPrefixes: 0,
    });
    for (const file of ['numeric-controls-v3.json', 'facet-capabilities-v3.json']) {
      const common = json<{ sources: Numeric[] }>(base + file).sources.filter((s) => s.item === 3);
      expect(common.map((s) => s.sourceId)).toEqual(ids);
      for (const capture of captures) {
        const found = common.find((s) => s.sourceId === capture.id)!;
        expect(found.sourceSha256).toBe(capture.numeric.sourceSha256);
        if (file.startsWith('numeric-')) {
          const { numericEvidence, ...summary } = found as Numeric & { numericEvidence: Proof };
          expect(capture.numeric).toMatchObject(summary);
          const raw = bytes(capture.folder + 'numeric-results-v1.json');
          expect(numericEvidence).toEqual({
            path: capture.folder + 'numeric-results-v1.json',
            bytes: raw.length,
            sha256: hash(raw),
          });
        }
      }
    }
  });

  for (const capture of captures)
    describe(capture.id, () => {
      const { id, folder, session, data, cell, selected, start, numeric, mask, rowSet } = capture;
      it('joins unchanged requested/executed/Saved source to native private owner and plot ordinals', () => {
        const { source } = capture.source;
        expect(capture.source).toMatchObject({ status: 'CAPTURED', removed: true });
        expect(source).toMatchObject({
          item: 3,
          nativeCompileSuccess: true,
          editorMarkerArrays: null,
          nativeStudyInstanceId: null,
          nativeWarningChannel: [],
        });
        const sourceText = read(folder + 'executed-v1.pine');
        expect(read(source.requestSource)).toBe(sourceText);
        expect(hash(sourceText)).toBe(source.sourceSha256);
        expect(sourceText.startsWith(`//@version=${source.pineVersion}\n`)).toBe(true);
        const transport = read(folder + 'save-request-v1.txt').replace(/\r\n/g, '\n');
        const saved = transport.split('name="source"\n\n')[1].split(/\n------WebKitFormBoundary/)[0];
        expect(saved.trimEnd()).toBe(sourceText.trimEnd());
        const binding = json<{
          sourceId: string;
          sourceSha256: string;
          nativePrivateId: string;
          nativePrivateVersion: string;
          nativeMetaInfoId: string;
          unresolvedColumnOrdinals: number[];
          columns: {
            originalHeader: string;
            owner: string;
            sourceSha256?: string;
            privateVersion?: string;
            nativePlotId?: string;
            sourceLiteralPlotOrdinal?: number;
          }[];
        }>(session + 'column-bindings-v1.json');
        expect(binding).toMatchObject({
          sourceId: id,
          sourceSha256: source.sourceSha256,
          nativePrivateId: source.privateScriptId,
          nativePrivateVersion: source.privateVersion,
          unresolvedColumnOrdinals: [],
        });
        expect(binding.columns.map((c) => c.originalHeader)).toEqual(data.headers);
        expect(data.headers.slice(0, 6)).toEqual(['time', 'open', 'high', 'low', 'close', 'Volume']);
        for (const body of [source.saveBody, source.addBody]) {
          const response = json<{
            success: boolean;
            result: { metaInfo: { id: string; warnings: unknown[]; styles: Record<string, { title: string }> } };
          }>(body.path);
          expect(response.success).toBe(true);
          expect(response.result.metaInfo.id).toBe(binding.nativeMetaInfoId);
          expect(response.result.metaInfo.warnings).toEqual([]);
          for (const [i, column] of binding.columns.slice(6).entries()) {
            expect(column).toMatchObject({
              owner: source.privateScriptId,
              sourceSha256: source.sourceSha256,
              privateVersion: source.privateVersion,
              nativePlotId: `plot_${i}`,
              sourceLiteralPlotOrdinal: i,
            });
            expect(response.result.metaInfo.styles[`plot_${i}`].title).toBe(column.originalHeader);
          }
        }
      });

      it('derives physical closure and four consecutive reset blocks without manufacturing an own prefix', () => {
        expect(data.rows).toHaveLength(id.endsWith('v5') ? 309 : 311);
        expect(rowSet).toMatchObject({
          dataRows: data.rows.length,
          independentlyClosedRows: data.rows.length - 1,
          strictOwnIndexZeroPrefixAvailable: false,
          samplingCompleteness: false,
        });
        expect(mask.rows).toHaveLength(data.rows.length);
        const m = (row: string[], title: string) => row[mask.headers.indexOf(title)];
        const exportMs = Date.parse(rowSet.nativeObservationUtc);
        let closed = 0;
        data.rows.forEach((row, i) => {
          const mr = mask.rows[i];
          const physicalClose = (Number(cell(row, 'time')) + 120) * 1000;
          const eligible = physicalClose <= exportMs && cell(row, 'CHART_CONFIRMED') === '1';
          expect(m(mr, 'row_ordinal')).toBe(String(i + 1));
          expect(m(mr, 'time_raw_seconds')).toBe(cell(row, 'time'));
          expect(m(mr, 'input_index_raw')).toBe(cell(row, 'INPUT_INDEX'));
          expect(m(mr, 'csv_sha256')).toBe(hash(bytes(session + 'chart-native-v1.csv')));
          expect(m(mr, 'export_utc')).toBe(rowSet.nativeObservationUtc);
          expect(Number(m(mr, 'closed_numeric_eligible'))).toBe(Number(eligible));
          if (eligible) closed++;
        });
        expect(closed).toBe(data.rows.length - 1);
        expect(cell(data.rows[0], 'INPUT_INDEX')).toBe('23338');
        expect(cell(data.rows[0], 'IS_FIRST')).toBe('0');
        expect(cell(data.rows[0], 'FIRST_INDEX')).toBe('0');
        expect(start).toBe(6);
        expect(selected).toHaveLength(64);
        expect(numeric.selectedBlockDataRowOrdinals).toEqual(Array.from({ length: 64 }, (_, i) => start + i + 1));
        selected.forEach((row, i) => {
          expect(cell(row, 'INPUT_INDEX')).toBe(String(23344 + i));
          expect(cell(row, 'PHASE')).toBe(String(i % 16));
          expect(cell(row, 'CHART_CONFIRMED')).toBe('1');
          if (i) expect(Number(cell(row, 'time')) - Number(cell(selected[i - 1], 'time'))).toBe(120);
          expect(m(mask.rows[start + i], 'closed_numeric_eligible')).toBe('1');
        });
      });

      it('re-derives all 404 supported controls from raw cells and joins every numeric pointer', () => {
        expect(numeric.comparisonCounts).toEqual({ SUPPORTED: 404, UNDECIDED: 44 });
        expect(numeric.records).toHaveLength(448);
        const derived: string[] = [];
        const key = (row: number, property: string) => `${row}:${property}`;
        for (const [i, row] of selected.entries()) {
          const p = i % 16;
          const expected: Record<string, string> = {
            A: String(p + 1),
            B: String(10 * (p + 1)),
            NESTED: String(5 * (p + 1)),
            GATED: p % 2 ? '' : String(100 * (p / 2 + 1)),
            GATED_NA: String(p % 2),
            LOCAL_FIRST_NA: p < 5 ? '1' : '0',
          };
          if (p < 5) expected.LOCAL_FIRST = '';
          for (const [property, value] of Object.entries(expected)) {
            expect(cell(row, property), key(start + i + 1, property)).toBe(value);
            derived.push(key(start + i + 1, property));
          }
        }
        expect(derived).toHaveLength(404);
        const supported = numeric.records.filter((r) => r.verdict === 'SUPPORTED');
        expect(supported.map((r) => key(r.nativeCell.rowOrdinal, r.property)).sort()).toEqual(derived.sort());
        for (const record of numeric.records) {
          for (const pointer of [record.nativeCell, ...record.inputCells]) {
            expect(data.headers[pointer.columnOrdinal - 1]).toBe(pointer.headerRaw);
            expect(data.rows[pointer.rowOrdinal - 1][pointer.columnOrdinal - 1]).toBe(pointer.valueRaw);
          }
          expect(record.nativeCell.headerRaw).toBe(record.property);
          if (record.verdict === 'SUPPORTED') {
            expect(record.closedScoringEligible).toBe(true);
            expect(record.predictedBlank ? '' : record.predictedRational).toBe(record.nativeCell.valueRaw);
          } else {
            expect(record).toMatchObject({
              property: 'LOCAL_FIRST',
              verdict: 'UNDECIDED',
              closedScoringEligible: false,
              predictedRational: null,
              exclusionCause: 'OWN_INDEX_ZERO_PREFIX_NOT_EXPORTED',
            });
            expect(record.nativeCell.valueRaw).not.toBe('');
          }
        }
      });

      for (const property of ['A', 'B', 'NESTED', 'GATED', 'GATED_NA', 'LOCAL_FIRST_NA'])
        it(`matches all 64 native ${property} cells through compiled execution`, () => {
          const result = run(capture);
          const output = result.plots.find((plot) => plot.title === property);
          expect(output, property).toBeDefined();
          // Blank is explicitly null, never Number('') == 0. No tolerance or rounding.
          expect(output!.values).toEqual(
            selected.map((row) => (cell(row, property) === '' ? null : Number(cell(row, property)))),
          );
        });

      it('matches 20 native LOCAL_FIRST blanks and only presence for 44 observed initialized values', () => {
        const values = run(capture).plots.find((plot) => plot.title === 'LOCAL_FIRST')!.values;
        let supportedBlanks = 0,
          observedInitialized = 0;
        selected.forEach((row, i) => {
          if (i % 16 < 5) {
            expect(cell(row, 'LOCAL_FIRST')).toBe('');
            expect(values[i]).toBeNull();
            supportedBlanks++;
          } else {
            expect(cell(row, 'LOCAL_FIRST')).not.toBe('');
            expect(Number.isFinite(Number(cell(row, 'LOCAL_FIRST')))).toBe(true);
            expect(values[i]).not.toBeNull();
            expect(Number.isFinite(values[i])).toBe(true);
            observedInitialized++;
          }
        });
        expect([supportedBlanks, observedInitialized]).toEqual([20, 44]);
        // Presence above is already represented by LOCAL_FIRST_NA; no extra parity
        // count and no comparison to the native initialized value (currently5).
      });

      it('retains developing values and all remaining closed rows as observed exclusions', () => {
        const developing = data.rows.at(-1)!;
        expect(cell(developing, 'CHART_CONFIRMED')).toBe('0');
        expect(Number(cell(developing, 'time')) * 1000 + 120000).toBeGreaterThan(
          Date.parse(rowSet.nativeObservationUtc),
        );
        for (const property of ['A', 'B', 'NESTED', 'GATED_NA', 'LOCAL_FIRST_NA'])
          expect(cell(developing, property)).not.toBe('');
        expect(numeric.records.every((r) => r.nativeCell.rowOrdinal < data.rows.length)).toBe(true);
        expect(rowSet.independentlyClosedRows - selected.length).toBe(id.endsWith('v5') ? 244 : 246);
        expect(numeric.strictOwnIndexZeroPrefixAvailable).toBe(false);
      });
    });
});
