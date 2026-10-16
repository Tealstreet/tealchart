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
  model: string;
  property: string;
  verdict: string;
  nativeCell: Cell;
  inputCells: Cell[];
  dependencyCells?: Cell[];
  exactExportedStringResidual?: string;
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
  comparisonCounts: { SUPPORTED: number; UNDECIDED?: number; REFUTED: number };
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
const ids = ['array-alias', 'array-missing'].flatMap((name) => [5, 6].map((v) => `v95-${name}-v${v}`));
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
    'RESPONSE-v95-v9.md',
    'attempt-inventory-v9.json',
    'numeric-controls-v9.json',
    'facet-capabilities-v9.json',
    'artifact-integrity-v9.json',
    'validation-result-v9.json',
  ].map((p) => base + p),
  ...ids.flatMap((id) => ['v95/sources/' + id + '.pine', ...familyFiles.map((p) => base + id + '/attempt-v1/' + p)]),
];
const inventory = json<{ attempts: { source: Source; status: string; removed: boolean }[] }>(
  base + 'attempt-inventory-v9.json',
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
  // Derive the two complete phase blocks from raw rows, independently of numeric-results.
  const start = data.rows.findIndex((row) => cell(row, 'PHASE') === '0');
  const selected = data.rows.slice(start, start + 32);
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

// Reduced fractions keep decimal-export residuals distinct from binary64 replay.
type Rational = readonly [bigint, bigint];
const abs = (x: bigint) => (x < 0n ? -x : x);
function rat(n: bigint, d = 1n): Rational {
  if (d === 0n) throw new Error('Zero denominator');
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  let a = abs(n),
    b = d;
  while (b) [a, b] = [b, a % b];
  return [n / a, d / a];
}
function rational(raw: string): Rational {
  if (raw === '') throw new Error('Blank is not zero');
  if (raw.includes('/')) {
    const [n, d] = raw.split('/');
    return rat(BigInt(n), BigInt(d));
  }
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(raw);
  if (!match) throw new Error(`Invalid rational ${raw}`);
  const digits = match[3] ?? '';
  const exponent = Number(match[4] ?? 0) - digits.length;
  let n = BigInt(match[2] + digits) * (match[1] ? -1n : 1n);
  if (exponent >= 0) {
    n *= 10n ** BigInt(exponent);
    return rat(n);
  }
  return rat(n, 10n ** BigInt(-exponent));
}
const subtract = (a: Rational, b: Rational) => rat(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
const format = (a: Rational) => (a[1] === 1n ? String(a[0]) : `${a[0]}/${a[1]}`);
function run(source: string, bars: Bar[]) {
  const ast = parse(source);
  expect(checkProgram(ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const compiled = tryCompile(ast);
  expect(compiled.success).toBe(true);
  const result = executeCompiled(compiled, bars, undefined, {
    runtime: {
      syminfo: { tickerid: 'BINANCE:BTCUSDT', timezone: 'Etc/UTC' },
      timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true },
    },
  })!;
  expect(result.errors).toEqual([]);
  return result;
}

function replay(capture: (typeof captures)[number]) {
  // Per-bar literal arrays are independent of omitted native history. The local
  // index0 phase is congruent modulo16 to native23344; FIRST_* are never scored.
  const bars: Bar[] = capture.selected.map((row) => ({
    time: Number(capture.cell(row, 'time')) * 1000,
    open: Number(capture.cell(row, 'open')),
    high: Number(capture.cell(row, 'high')),
    low: Number(capture.cell(row, 'low')),
    close: Number(capture.cell(row, 'close')),
    volume: Number(capture.cell(row, 'Volume')),
  }));
  return run(read(capture.folder + 'executed-v1.pine'), bars);
}
function prediction(record: NativeRecord): string | null {
  const { model, property } = record;
  const shared: Record<string, string> = {
    A_SIZE: '5',
    A_0: '1',
    A_1: '20',
    A_2: '3',
    A_3: '9',
    A_4: '4',
    B_SIZE: '4',
    B_0: '1',
    B_1: '2',
    B_2: '3',
    B_3: '4',
    VIEW_SIZE: '3',
    VIEW_0: '20',
    VIEW_1: '3',
    VIEW_2: '9',
    LAST: '4',
  };
  if (model === 'SHARED_SLICE_WINDOW') return shared[property];
  if (model === 'ISOLATED_SLICE') {
    const isolated: Record<string, string> = { ...shared, A_SIZE: '4', A_1: '2', A_3: '4', A_4: '' };
    return isolated[property];
  }
  if (model === 'TYPED_MISSING_ID_ARRAY_CONSTRUCTOR')
    return ({ BOX_ARRAY_SIZE: '2', BOX0_NA: '1', TABLE_ARRAY_SIZE: '1', TABLE0_NA: '1' } as Record<string, string>)[
      property
    ];
  if (model === 'FOUR_ELEMENT_LITERAL_ARRAY') return '4';
  if (model === 'MISSING_SEARCH_MATCHES') return '1';
  if (model === 'MISSING_SEARCH_NEVER_MATCHES') return property === 'INCLUDES_NA' ? '0' : '-1';
  if (model === 'REDUCTION_PROPAGATES_NA') return '';
  if (model === 'REDUCTION_SKIPS_NA')
    return ({ SUM: '7', AVG: '7/3', MEDIAN: '3', MIN: '1', MAX: '3', VARIANCE: '8/9' } as Record<string, string>)[
      property
    ];
  if (model === 'NATIVE_TARGET_VECTOR') return null;
  const naFirst = model.startsWith('NA_FIRST');
  if (property.startsWith('ORDER_')) {
    const forward = naFirst ? [1, 0, 2, 3] : [0, 2, 3, 1];
    const reverse = naFirst ? [1, 0, 3, 2] : [0, 3, 2, 1];
    return String((model.endsWith('REVERSE_EQUAL_KEYS') ? reverse : forward)[Number(property.slice(-1))]);
  }
  const sorted = naFirst ? ['', '1', '3', '3'] : ['1', '3', '3', ''];
  const entry = sorted[Number(property.slice(-1))];
  return property.startsWith('SORTED_NA_') ? (entry === '' ? '1' : '0') : entry;
}
describe('v95 items11/12: shared slice, missing elements and exact binary64 array outputs', () => {
  it('binds items11/12 artifacts, v9 integrity and validation without importing other families', () => {
    const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as {
      files: Proof[];
    };
    const integrity = json<{ files: Proof[] }>(base + 'artifact-integrity-v9.json');
    expect(new Set(paths).size).toBe(71);
    for (const path of paths) {
      const raw = bytes(path);
      const proof = { path, bytes: raw.length, sha256: hash(raw) };
      expect(
        lock.files.find((f) => f.path === path),
        path,
      ).toEqual(proof);
      if (!path.endsWith('/artifact-integrity-v9.json'))
        expect(
          integrity.files.find((f) => f.path === path),
          path,
        ).toEqual(proof);
    }
    expect(json(base + 'validation-result-v9.json')).toMatchObject({
      version: 'v9',
      status: 'PASS',
      sourceSlotsAudited: 24,
      ownIndexZeroPrefixes: 0,
    });
    for (const file of ['numeric-controls-v9.json', 'facet-capabilities-v9.json']) {
      const common = json<{ sources: Numeric[] }>(base + file).sources.filter((s) => s.item === 11 || s.item === 12);
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
          item: id.includes('alias') ? 11 : 12,
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

      it('derives physical closure and two phase-aligned closed blocks without manufacturing an own prefix', () => {
        expect(data.rows).toHaveLength(
          id.includes('alias') ? (id.endsWith('v5') ? 340 : 342) : id.endsWith('v5') ? 345 : 347,
        );
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
        expect(selected).toHaveLength(32);
        expect(numeric.selectedBlockDataRowOrdinals).toEqual(Array.from({ length: 32 }, (_, i) => start + i + 1));
        selected.forEach((row, i) => {
          expect(cell(row, 'INPUT_INDEX')).toBe(String(23344 + i));
          expect(cell(row, 'PHASE')).toBe(String(i % 16));
          expect(cell(row, 'CHART_CONFIRMED')).toBe('1');
          if (i) expect(Number(cell(row, 'time')) - Number(cell(selected[i - 1], 'time'))).toBe(120);
          expect(m(mask.rows[start + i], 'closed_numeric_eligible')).toBe('1');
        });
      });

      it('re-derives all named candidate verdicts without conflating mathematical and native-output targets', () => {
        const alias = id.includes('alias');
        expect(numeric.comparisonCounts).toEqual(
          alias ? { SUPPORTED: 1024, REFUTED: 128 } : { SUPPORTED: 832, REFUTED: 768, UNDECIDED: 128 },
        );
        expect(numeric.records).toHaveLength(alias ? 1152 : 1728);
        const counts = { SUPPORTED: 0, REFUTED: 0, UNDECIDED: 0 };
        for (const record of numeric.records) {
          for (const pointer of [record.nativeCell, ...record.inputCells, ...(record.dependencyCells ?? [])]) {
            expect(data.headers[pointer.columnOrdinal - 1]).toBe(pointer.headerRaw);
            expect(data.rows[pointer.rowOrdinal - 1][pointer.columnOrdinal - 1]).toBe(pointer.valueRaw);
          }
          expect(record.nativeCell.headerRaw).toBe(record.property);
          const predicted = prediction(record),
            native = record.nativeCell.valueRaw;
          let verdict: 'SUPPORTED' | 'REFUTED' | 'UNDECIDED';
          if (predicted === null) {
            expect(record.predictedRational).toBeNull();
            verdict = 'UNDECIDED';
          } else {
            expect(record.predictedBlank).toBe(predicted === '');
            if (predicted !== '') expect(rational(record.predictedRational!)).toEqual(rational(predicted));
            if (predicted === '' || native === '') verdict = predicted === native ? 'SUPPORTED' : 'REFUTED';
            else {
              const residual = subtract(rational(native), rational(predicted));
              if (record.exactExportedStringResidual !== undefined)
                expect(record.exactExportedStringResidual).toBe(format(residual));
              verdict =
                residual[0] === 0n ? 'SUPPORTED' : record.model === 'REDUCTION_SKIPS_NA' ? 'UNDECIDED' : 'REFUTED';
            }
          }
          expect(record.verdict, `${record.model}/${record.property}`).toBe(verdict);
          counts[verdict]++;
        }
        expect(counts).toEqual(
          alias ? { SUPPORTED: 1024, REFUTED: 128, UNDECIDED: 0 } : { SUPPORTED: 832, REFUTED: 768, UNDECIDED: 128 },
        );
        const supported = numeric.records.filter((r) => r.verdict === 'SUPPORTED');
        expect(new Set(supported.map((r) => `${r.nativeCell.rowOrdinal}:${r.property}`)).size).toBe(640);
      });

      // Direct native-output assertions include the three fractional statistics
      // and percentile. Their captured outputs are decidable even when an exact
      // mathematical-reference candidate remains UNDECIDED in the oracle index.
      for (const property of data.headers.slice(13))
        it(`matches all 32 closed native ${property} cells through the unchanged compiled source`, () => {
          const result = replay(capture);
          const output = result.plots.find((plot) => plot.title === property)!;
          expect(output, property).toBeDefined();
          expect(output.values).toEqual(
            selected.map((row) => (cell(row, property) === '' ? null : Number(cell(row, property)))),
          );
        });

      if (id.includes('alias')) {
        it('retains complete shared/copy/view vectors and typed missing-ID sizes, without drawing-object credit', () => {
          expect(data.headers.slice(13)).toHaveLength(20);
          for (const row of selected) {
            expect(['A_SIZE', 'B_SIZE', 'VIEW_SIZE'].map((title) => cell(row, title))).toEqual(['5', '4', '3']);
            expect([0, 1, 2, 3, 4].map((i) => cell(row, `A_${i}`))).toEqual(['1', '20', '3', '9', '4']);
            expect([0, 1, 2, 3].map((i) => cell(row, `B_${i}`))).toEqual(['1', '2', '3', '4']);
            expect([0, 1, 2].map((i) => cell(row, `VIEW_${i}`))).toEqual(['20', '3', '9']);
            expect(
              ['LAST', 'BOX_ARRAY_SIZE', 'BOX0_NA', 'TABLE_ARRAY_SIZE', 'TABLE0_NA'].map((title) => cell(row, title)),
            ).toEqual(['4', '2', '1', '1', '1']);
          }
          const refuted = numeric.records.filter((r) => r.verdict === 'REFUTED');
          expect(refuted).toHaveLength(128);
          expect(
            refuted.every((r) => r.model === 'ISOLATED_SLICE' && ['A_SIZE', 'A_1', 'A_3', 'A_4'].includes(r.property)),
          ).toBe(true);
          // new_box/new_table here construct arrays of missing IDs; the native
          // source creates no actual drawing/table. No appearance/quota claim.
        });
      } else {
        for (const [property, expectedRaw] of [
          ['AVG', '2.3333333333333335'],
          ['VARIANCE', '0.8888888888888875'],
          ['STDEV', '0.9428090415820626'],
        ])
          it(`matches ${property} binary64 and its exact native decimal string on every closed row`, () => {
            const output = replay(capture).plots.find((plot) => plot.title === property)!;
            selected.forEach((row, i) => {
              expect(cell(row, property)).toBe(expectedRaw);
              expect(output.values[i]).toBe(Number(expectedRaw));
              expect(String(output.values[i])).toBe(expectedRaw);
            });
          });

        it('retains the literal NA search, finite reductions and observed percentile blank', () => {
          expect(data.headers.slice(13)).toHaveLength(24);
          const output = replay(capture).plots.find((plot) => plot.title === 'PERCENTILE')!;
          expect(output.values).toEqual(Array<null>(32).fill(null));
          for (const row of selected) {
            expect(['SIZE', 'INCLUDES_NA', 'INDEX_NA', 'LASTINDEX_NA'].map((title) => cell(row, title))).toEqual([
              '4',
              '0',
              '-1',
              '-1',
            ]);
            expect(['SUM', 'MEDIAN', 'MIN', 'MAX'].map((title) => cell(row, title))).toEqual(['7', '3', '1', '3']);
            expect(cell(row, 'PERCENTILE')).toBe('');
          }
          // Exact native AVG/VARIANCE/STDEV/blank output checks do not change the
          // archived mathematical7/3,8/9,sqrt(8/9) candidate verdicts or fit tolerances.
          expect(numeric.records.filter((r) => r.verdict === 'UNDECIDED')).toHaveLength(128);
        });

        it('pins NA-last ascending order and forward order for this one equal-key pair only', () => {
          for (const row of selected) {
            expect([0, 1, 2, 3].map((i) => cell(row, `SORTED_${i}`))).toEqual(['1', '3', '3', '']);
            expect([0, 1, 2, 3].map((i) => cell(row, `SORTED_NA_${i}`))).toEqual(['0', '0', '0', '1']);
            expect([0, 1, 2, 3].map((i) => cell(row, `ORDER_${i}`))).toEqual(['0', '2', '3', '1']);
          }
          // No descending-order, other-key or universal sort-stability claim.
          expect(numeric.records.filter((r) => r.verdict === 'REFUTED')).toHaveLength(768);
        });
      }

      it('retains all other closed rows and developing values as observed exclusions', () => {
        expect(numeric.strictOwnIndexZeroPrefixAvailable).toBe(false);
        const developing = data.rows.at(-1)!;
        expect(cell(developing, 'CHART_CONFIRMED')).toBe('0');
        expect(Number(cell(developing, 'time')) * 1000 + 120000).toBeGreaterThan(
          Date.parse(rowSet.nativeObservationUtc),
        );
        expect(numeric.records.every((r) => r.nativeCell.rowOrdinal < data.rows.length)).toBe(true);
        expect(rowSet.independentlyClosedRows - selected.length).toBeGreaterThan(0);
      });
    });
});
