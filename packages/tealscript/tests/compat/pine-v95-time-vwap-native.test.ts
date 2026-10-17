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
  candidateMath?: {
    weightRational: string;
    meanRational: string;
    weightedPopulationVarianceRational: string;
    sqrtReferenceStatus: string;
    sqrtVarianceDecimal80Reference: string;
  };
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
  comparisonCounts: { SUPPORTED: number; UNDECIDED: number; REFUTED?: number };
  facets: {
    facet: string;
    hypothesisVerdict: string;
    details: { nativeCell?: Cell; anchorInputDataRowOrdinals?: number[] } | null;
  }[];
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
const ids = ['session-calendar', 'vwap-bands'].flatMap((name) => [5, 6].map((v) => `v95-${name}-v${v}`));
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
    'RESPONSE-v95-v7.md',
    'attempt-inventory-v7.json',
    'numeric-controls-v7.json',
    'facet-capabilities-v7.json',
    'artifact-integrity-v7.json',
    'validation-result-v7.json',
  ].map((p) => base + p),
  ...ids.flatMap((id) => ['v95/sources/' + id + '.pine', ...familyFiles.map((p) => base + id + '/attempt-v1/' + p)]),
];
const inventory = json<{ attempts: { source: Source; status: string; removed: boolean }[] }>(
  base + 'attempt-inventory-v7.json',
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
  // Derive the complete phase-aligned block from raw rows, independently of numeric-results.
  const start = data.rows.findIndex((row) => cell(row, 'PHASE') === '0');
  const selected = data.rows.slice(start, start + (id.includes('calendar') ? 64 : 96));
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

const add = (a: Rational, b: Rational) => rat(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const multiply = (a: Rational, b: Rational) => rat(a[0] * b[0], a[1] * b[1]);
const divide = (a: Rational, b: Rational) => rat(a[0] * b[1], a[1] * b[0]);
function replay(capture: (typeof captures)[number]) {
  // Unchanged source: selected native index23344 is congruent to local0 mod16.
  // All six VWAP anchors are complete; no prefix or accumulator is manufactured.
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
function prediction(capture: (typeof captures)[number], record: NativeRecord): string | null {
  const ordinal = record.nativeCell.rowOrdinal,
    row = capture.data.rows[ordinal - 1];
  const cell = (title: string) => capture.cell(row, title);
  const phase = Number(cell('PHASE'));
  if (capture.id.includes('calendar')) {
    const d = phase % 4;
    const expected: Record<string, string> = {
      FIXED_TIME: String(
        [
          Date.UTC(2026, 2, 8, 6, 30),
          Date.UTC(2026, 2, 8, 7, 30),
          Date.UTC(2026, 10, 1, 5, 30),
          Date.UTC(2026, 10, 1, 6, 30),
        ][d],
      ),
      NY_HOUR: String([1, 3, 1, 1][d]),
      NY_MINUTE: '30',
      UTC_HOUR: String([6, 7, 5, 6][d]),
      NY_DAY: d < 2 ? '8' : '1',
      NY_MONTH: d < 2 ? '3' : '11',
      NY_WEEKDAY: '1',
      SESSION_IN: '0',
      SESSION_OPEN: '',
      SESSION_CLOSE: '',
      TF_SECONDS: '120',
      CHART_CLOSE_TIME: String(Number(cell('time')) * 1000 + 120000),
    };
    if (record.model === 'NATIVE_TARGET_VECTOR') return null;
    return expected[record.property];
  }
  if (record.model === 'NATIVE_TARGET_VECTOR') return null;
  const inputs: Record<string, string> = {
    ANCHOR: phase === 0 ? '1' : '0',
    MULT: String(phase % 3),
    INPUT_CLOSE: cell('close'),
    INPUT_VOLUME: cell('Volume'),
    HOLE_SOURCE: phase === 5 ? '' : cell('close'),
    HOLE_NA: phase === 5 ? '1' : '0',
    VWAP_NA: '0',
  };
  if (record.property in inputs) return inputs[record.property];
  if (record.model === 'ZERO_MULTIPLIER_EQUALS_OWN_NATIVE_MEAN') return cell('SERIES_VWAP');
  if (record.property === 'HOLE_VWAP_NA') return record.model === 'SKIP_HOLE' ? '0' : phase >= 5 ? '1' : '0';
  if (record.model === 'POISON_UNTIL_NEXT_ANCHOR' && phase >= 5) return '';
  const start = ordinal - phase;
  let weight: Rational = [0n, 1n],
    total: Rational = [0n, 1n];
  for (let j = start; j <= ordinal; j++) {
    const input = capture.data.rows[j - 1];
    if (record.model === 'SKIP_HOLE' && Number(capture.cell(input, 'PHASE')) === 5) continue;
    const w = rational(capture.cell(input, 'INPUT_VOLUME'));
    const price = rational(capture.cell(input, record.property === 'HOLE_VWAP' ? 'HOLE_SOURCE' : 'INPUT_CLOSE'));
    weight = add(weight, w);
    total = add(total, multiply(w, price));
  }
  expect(weight[0] > 0n).toBe(true);
  return format(divide(total, weight));
}
describe('v95 items8/9: bounded calendar controls and anchored VWAP source-hole poisoning', () => {
  it('binds items8/9 artifacts, v7 integrity and validation without importing other families', () => {
    const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as {
      files: Proof[];
    };
    const integrity = json<{ files: Proof[] }>(base + 'artifact-integrity-v7.json');
    expect(new Set(paths).size).toBe(71);
    for (const path of paths) {
      const raw = bytes(path);
      const proof = { path, bytes: raw.length, sha256: hash(raw) };
      expect(
        lock.files.find((f) => f.path === path),
        path,
      ).toEqual(proof);
      if (!path.endsWith('/artifact-integrity-v7.json'))
        expect(
          integrity.files.find((f) => f.path === path),
          path,
        ).toEqual(proof);
    }
    expect(json(base + 'validation-result-v7.json')).toMatchObject({
      version: 'v7',
      status: 'PASS',
      sourceSlotsAudited: 18,
      ownIndexZeroPrefixes: 0,
    });
    for (const file of ['numeric-controls-v7.json', 'facet-capabilities-v7.json']) {
      const common = json<{ sources: Numeric[] }>(base + file).sources.filter((s) => s.item === 8 || s.item === 9);
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
          item: id.includes('calendar') ? 8 : 9,
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

      it('derives physical closure and phase-aligned closed blocks without manufacturing an own prefix', () => {
        expect(data.rows).toHaveLength(
          id.includes('calendar') ? (id.endsWith('v5') ? 329 : 331) : id.endsWith('v5') ? 332 : 334,
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
        expect(selected).toHaveLength(id.includes('calendar') ? 64 : 96);
        expect(numeric.selectedBlockDataRowOrdinals).toEqual(
          Array.from({ length: selected.length }, (_, i) => start + i + 1),
        );
        selected.forEach((row, i) => {
          expect(cell(row, 'INPUT_INDEX')).toBe(String(23344 + i));
          expect(cell(row, 'PHASE')).toBe(String(i % 16));
          expect(cell(row, 'CHART_CONFIRMED')).toBe('1');
          if (i) expect(Number(cell(row, 'time')) - Number(cell(selected[i - 1], 'time'))).toBe(120);
          expect(m(mask.rows[start + i], 'closed_numeric_eligible')).toBe('1');
        });
      });

      it('re-derives every model record and joins all original input/dependency pointers', () => {
        const calendar = id.includes('calendar');
        expect(numeric.comparisonCounts).toEqual(
          calendar ? { SUPPORTED: 768, UNDECIDED: 256 } : { SUPPORTED: 1098, UNDECIDED: 894, REFUTED: 132 },
        );
        expect(numeric.records).toHaveLength(calendar ? 1024 : 2124);
        const counts = { SUPPORTED: 0, UNDECIDED: 0, REFUTED: 0 };
        for (const record of numeric.records) {
          for (const pointer of [record.nativeCell, ...record.inputCells, ...(record.dependencyCells ?? [])]) {
            expect(data.headers[pointer.columnOrdinal - 1]).toBe(pointer.headerRaw);
            expect(data.rows[pointer.rowOrdinal - 1][pointer.columnOrdinal - 1]).toBe(pointer.valueRaw);
          }
          expect(record.nativeCell.headerRaw).toBe(record.property);
          const predicted = prediction(capture, record);
          let verdict: 'SUPPORTED' | 'UNDECIDED' | 'REFUTED';
          if (predicted === null) {
            expect(record.predictedRational).toBeNull();
            verdict = 'UNDECIDED';
          } else {
            expect(record.predictedBlank).toBe(predicted === '');
            if (predicted !== '') expect(rational(record.predictedRational!)).toEqual(rational(predicted));
            const native = record.nativeCell.valueRaw;
            if (native === '' || predicted === '') verdict = native === predicted ? 'SUPPORTED' : 'REFUTED';
            else {
              const residual = subtract(rational(native), rational(predicted));
              if (record.exactExportedStringResidual !== undefined)
                expect(record.exactExportedStringResidual).toBe(format(residual));
              verdict = residual[0] === 0n ? 'SUPPORTED' : record.property.endsWith('_NA') ? 'REFUTED' : 'UNDECIDED';
            }
          }
          expect(record.verdict, `${record.model}/${record.property}/row${record.nativeCell.rowOrdinal}`).toBe(verdict);
          counts[verdict]++;
        }
        expect(counts).toEqual(
          calendar ? { SUPPORTED: 768, UNDECIDED: 256, REFUTED: 0 } : { SUPPORTED: 1098, UNDECIDED: 894, REFUTED: 132 },
        );
        const supported = numeric.records.filter((r) => r.verdict === 'SUPPORTED');
        // Model records overlap (SKIP_HOLE and POISON agree before a hole).
        expect(new Set(supported.map((r) => `${r.nativeCell.rowOrdinal}:${r.property}`)).size).toBe(
          calendar ? 768 : 1062,
        );
      });

      if (id.includes('calendar')) {
        for (const property of [
          'FIXED_TIME',
          'NY_HOUR',
          'NY_MINUTE',
          'UTC_HOUR',
          'NY_DAY',
          'NY_MONTH',
          'NY_WEEKDAY',
          'SESSION_IN',
          'SESSION_OPEN',
          'SESSION_CLOSE',
          'TF_SECONDS',
          'CHART_CLOSE_TIME',
        ])
          it(`matches all 64 native ${property} controls on the unchanged source`, () => {
            const output = replay(capture).plots.find((plot) => plot.title === property)!;
            expect(output.values).toEqual(
              selected.map((row) => (cell(row, property) === '' ? null : Number(cell(row, property)))),
            );
          });

        it('keeps actual calendar/day/week targets and absent transition facets outside scoring', () => {
          expect(selected.every((row) => cell(row, 'SESSION_IN') === '0')).toBe(true);
          expect(
            selected.every((row) => Number(cell(row, 'CHART_NY_HOUR')) >= 2 && Number(cell(row, 'CHART_NY_HOUR')) < 23),
          ).toBe(true);
          expect(new Set(selected.map((row) => cell(row, 'DAY_OPEN'))).size).toBe(1);
          expect(selected.every((row) => cell(row, 'WEEK_CHANGE') === '0')).toBe(true);
          expect(numeric.records.filter((r) => r.model === 'NATIVE_TARGET_VECTOR')).toHaveLength(256);
          expect(numeric.facets.filter((f) => f.hypothesisVerdict === 'UNDECIDED')).toHaveLength(5);
          // No engine assertions on DAY_OPEN/WEEK_CHANGE/own NY clock and no
          // inside-session, boundary or actual DST-market-bar credit.
        });
      } else {
        for (const property of [
          'ANCHOR',
          'MULT',
          'INPUT_CLOSE',
          'INPUT_VOLUME',
          'HOLE_SOURCE',
          'HOLE_NA',
          'VWAP_NA',
          'HOLE_VWAP_NA',
        ])
          it(`matches all 96 native ${property} controls across six independent anchor windows`, () => {
            const output = replay(capture).plots.find((plot) => plot.title === property)!;
            expect(output.values).toEqual(
              selected.map((row) => (cell(row, property) === '' ? null : Number(cell(row, property)))),
            );
          });

        for (const property of ['HOLE_VWAP', 'HOLE_UPPER', 'HOLE_LOWER'])
          it(`poisons all 66 native ${property} cells until the next anchor, without numeric pre-hole fitting`, () => {
            const output = replay(capture).plots.find((plot) => plot.title === property)!;
            let missing = 0,
              finite = 0;
            selected.forEach((row, i) => {
              if (i % 16 >= 5) {
                expect(cell(row, property)).toBe('');
                expect(output.values[i]).toBeNull();
                missing++;
              } else {
                expect(cell(row, property)).not.toBe('');
                expect(output.values[i]).not.toBeNull();
                expect(Number.isFinite(output.values[i])).toBe(true);
                finite++;
              }
            });
            expect([missing, finite]).toEqual([66, 30]);
          });

        for (const property of ['VWAP', 'SERIES_VWAP', 'TWO_ARG', 'HOLE_VWAP'])
          it(`matches the six exact native ${property} anchor means, excluding fractional means`, () => {
            const output = replay(capture).plots.find((plot) => plot.title === property)!;
            for (let i = 0; i < 96; i += 16) {
              expect(cell(selected[i], property)).toBe(cell(selected[i], 'INPUT_CLOSE'));
              expect(output.values[i]).toBe(Number(cell(selected[i], property)));
            }
          });

        it('keeps MULT0 bands exactly equal to their own means, without certifying fractional mean values', () => {
          const result = replay(capture);
          const values = (name: string) => result.plots.find((plot) => plot.title === name)!.values;
          const mean = values('SERIES_VWAP'),
            upper = values('SERIES_UPPER'),
            lower = values('SERIES_LOWER');
          let rows = 0;
          selected.forEach((row, i) => {
            if (cell(row, 'MULT') !== '0') return;
            expect(cell(row, 'SERIES_UPPER')).toBe(cell(row, 'SERIES_VWAP'));
            expect(cell(row, 'SERIES_LOWER')).toBe(cell(row, 'SERIES_VWAP'));
            expect(upper[i]).toBe(mean[i]);
            expect(lower[i]).toBe(mean[i]);
            rows++;
          });
          expect(rows).toBe(36);
        });

        it('re-derives exact anchor weight/mean/variance but never treats sqrt references as binary64 targets', () => {
          let weight: Rational = [0n, 1n],
            total: Rational = [0n, 1n],
            squares: Rational = [0n, 1n];
          let nonzero = 0;
          selected.forEach((row, i) => {
            if (i % 16 === 0) {
              weight = [0n, 1n];
              total = [0n, 1n];
              squares = [0n, 1n];
            }
            const w = rational(cell(row, 'INPUT_VOLUME')),
              x = rational(cell(row, 'INPUT_CLOSE'));
            weight = add(weight, w);
            total = add(total, multiply(w, x));
            squares = add(squares, multiply(w, multiply(x, x)));
            expect(weight[0] > 0n).toBe(true);
            const mean = divide(total, weight),
              variance = subtract(divide(squares, weight), multiply(mean, mean));
            expect(variance[0] >= 0n).toBe(true);
            if (variance[0] > 0n) nonzero++;
            const records = numeric.records.filter((r) => r.nativeCell.rowOrdinal === start + i + 1 && r.candidateMath);
            expect(records).toHaveLength(4);
            for (const record of records) {
              expect(record.candidateMath).toMatchObject({
                weightRational: format(weight),
                meanRational: format(mean),
                weightedPopulationVarianceRational: format(variance),
                sqrtReferenceStatus: 'Derived mathematical reference, not a native binary64 output prediction',
              });
              expect(record.candidateMath!.sqrtVarianceDecimal80Reference).not.toBe('');
              expect(record.verdict).toBe('UNDECIDED');
            }
          });
          expect(nonzero).toBe(90);
        });

        it('retains SKIP_HOLE scalar and band-presence refutations separately from held numerical targets', () => {
          const refuted = numeric.records.filter((r) => r.verdict === 'REFUTED');
          expect(refuted).toHaveLength(132);
          expect(
            refuted.every(
              (r) => r.model === 'SKIP_HOLE' && Number(cell(data.rows[r.nativeCell.rowOrdinal - 1], 'PHASE')) >= 5,
            ),
          ).toBe(true);
          const bandRefutations = numeric.facets.filter(
            (f) => f.facet.startsWith('SKIP_HOLE band presence') && f.hypothesisVerdict === 'REFUTED',
          );
          expect(bandRefutations).toHaveLength(132);
          for (const facet of bandRefutations) {
            const pointer = facet.details!.nativeCell!;
            expect(pointer.valueRaw).toBe('');
            expect(data.rows[pointer.rowOrdinal - 1][pointer.columnOrdinal - 1]).toBe('');
          }
          expect(numeric.records.filter((r) => r.verdict === 'UNDECIDED')).toHaveLength(894);
        });
      }

      it('retains other closed and developing rows as observed exclusions without inventing a prefix', () => {
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
