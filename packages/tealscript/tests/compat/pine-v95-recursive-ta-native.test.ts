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
const ids = ['recursive-holes', 'implicit-ta'].flatMap((name) => [5, 6].map((v) => `v95-${name}-v${v}`));
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
    'RESPONSE-v95-v4.md',
    'attempt-inventory-v4.json',
    'numeric-controls-v4.json',
    'facet-capabilities-v4.json',
    'artifact-integrity-v4.json',
    'validation-result-v4.json',
  ].map((p) => base + p),
  ...ids.flatMap((id) => ['v95/sources/' + id + '.pine', ...familyFiles.map((p) => base + id + '/attempt-v1/' + p)]),
];
const inventory = json<{ attempts: { source: Source; status: string; removed: boolean }[] }>(
  base + 'attempt-inventory-v4.json',
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
  // Derive the first eight complete phase blocks from raw rows, independently of numeric-results.
  const start = data.rows.findIndex((row) => cell(row, 'PHASE') === '0');
  const selected = data.rows.slice(start, start + 128);
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
const absolute = (a: Rational) => rat(abs(a[0]), a[1]);
const format = (a: Rational) => (a[1] === 1n ? String(a[0]) : `${a[0]}/${a[1]}`);
function trueRange(high: string, low: string, previousClose: string) {
  const h = rational(high),
    l = rational(low),
    p = rational(previousClose);
  return [subtract(h, l), absolute(subtract(h, p)), absolute(subtract(l, p))].reduce((a, b) =>
    a[0] * b[1] >= b[0] * a[1] ? a : b,
  );
}
const value = (raw: string) => (raw === '' ? NaN : Number(raw));
function run(source: string, bars: Bar[]) {
  const ast = parse(source);
  expect(checkProgram(ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const compiled = tryCompile(ast);
  expect(compiled.success).toBe(true);
  const result = executeCompiled(compiled, bars, undefined, {
    runtime: {
      syminfo: { tickerid: 'BINANCE:BTCUSDT' },
      timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true },
    },
  })!;
  expect(result.errors).toEqual([]);
  return result;
}
function chartBars(capture: (typeof captures)[number], cents = false): Bar[] {
  // These are actual exported rows1..134, including the six observed predecessors.
  // They do NOT reconstruct native indices0..127 or seed recursive state.
  return capture.data.rows.slice(0, capture.start + 128).map((row) => {
    const field = (name: string) => {
      const raw = capture.cell(row, name);
      expect(raw).not.toBe('');
      if (!cents) return Number(raw);
      const scaled = rat(rational(raw)[0] * 100n, rational(raw)[1]);
      expect(scaled[1]).toBe(1n);
      expect(abs(scaled[0]) < 2n ** 53n).toBe(true);
      return Number(scaled[0]);
    };
    return {
      time: Number(capture.cell(row, 'time')) * 1000,
      open: field('open'),
      high: field('high'),
      low: field('low'),
      close: field('close'),
      volume: Number(capture.cell(row, 'Volume')),
    };
  });
}
function holeProjection(capture: (typeof captures)[number]) {
  const source = read(capture.folder + 'executed-v1.pine');
  const declarations = source.split('\n').filter((line) => /^(cycle|clean|hole|x) = /.test(line));
  expect(declarations).toHaveLength(4);
  // Only pointwise input expressions are extracted; absolute native index is an
  // explicit observed input, not a manufactured index-zero history.
  const projected = `//@version=${capture.source.source.pineVersion}\nindicator("v95 hole input/presence projection")
nativeIndex = int(volume)
${declarations.join('\n').replaceAll('bar_index', 'nativeIndex')}
plot(cycle, "CYCLE")
plot(clean, "CLEAN")
plot(x, "X")
plot(na(x) ? 1 : 0, "X_NA")`;
  const bars: Bar[] = capture.selected.map((row) => ({
    time: Number(capture.cell(row, 'time')) * 1000,
    open: Number(capture.cell(row, 'open')),
    high: Number(capture.cell(row, 'high')),
    low: Number(capture.cell(row, 'low')),
    close: Number(capture.cell(row, 'close')),
    volume: Number(capture.cell(row, 'INPUT_INDEX')),
  }));
  return run(projected, bars);
}
function holePresence(capture: (typeof captures)[number]) {
  // Rebind only bar_index to the observed native INPUT_INDEX channel. Feed actual
  // exported rows1..134 (six observed predecessors, all finite CLEAN/X before
  // selection), never seed EMA/RMA/RSI/TSI from captured targets. Only NA witnesses
  // are compared; computed recursive numbers and FIRST_* remain excluded.
  const preceding = capture.data.rows.slice(0, capture.start);
  expect(preceding).toHaveLength(6);
  for (const row of preceding) for (const title of ['CLEAN', 'X']) expect(capture.cell(row, title)).not.toBe('');
  const source = read(capture.folder + 'executed-v1.pine').replaceAll('bar_index', 'int(volume)');
  const bars = chartBars(capture).map((bar, i) => ({
    ...bar,
    volume: Number(capture.cell(capture.data.rows[i], 'INPUT_INDEX')),
  }));
  return run(source, bars);
}
describe('v95 items4/5: prefix-independent controls; recursive targets held', () => {
  it('binds items4/5 artifacts, v4 integrity and validation without importing other families', () => {
    const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as {
      files: Proof[];
    };
    const integrity = json<{ files: Proof[] }>(base + 'artifact-integrity-v4.json');
    expect(new Set(paths).size).toBe(71);
    for (const path of paths) {
      const raw = bytes(path);
      const proof = { path, bytes: raw.length, sha256: hash(raw) };
      expect(
        lock.files.find((f) => f.path === path),
        path,
      ).toEqual(proof);
      if (!path.endsWith('/artifact-integrity-v4.json'))
        expect(
          integrity.files.find((f) => f.path === path),
          path,
        ).toEqual(proof);
    }
    expect(json(base + 'validation-result-v4.json')).toMatchObject({
      version: 'v4',
      status: 'PASS',
      sourceSlotsAudited: 10,
      ownIndexZeroPrefixes: 0,
    });
    for (const file of ['numeric-controls-v4.json', 'facet-capabilities-v4.json']) {
      const common = json<{ sources: Numeric[] }>(base + file).sources.filter((s) => s.item === 4 || s.item === 5);
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
          item: id.includes('recursive-holes') ? 4 : 5,
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

      it('derives physical closure and eight consecutive phase blocks without manufacturing an own prefix', () => {
        expect(data.rows).toHaveLength(
          id.includes('recursive-holes') ? (id.endsWith('v5') ? 313 : 315) : id.endsWith('v5') ? 316 : 318,
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
        expect(selected).toHaveLength(128);
        expect(numeric.selectedBlockDataRowOrdinals).toEqual(Array.from({ length: 128 }, (_, i) => start + i + 1));
        selected.forEach((row, i) => {
          expect(cell(row, 'INPUT_INDEX')).toBe(String(23344 + i));
          expect(cell(row, 'PHASE')).toBe(String(i % 16));
          expect(cell(row, 'CHART_CONFIRMED')).toBe('1');
          if (i) expect(Number(cell(row, 'time')) - Number(cell(selected[i - 1], 'time'))).toBe(120);
          expect(m(mask.rows[start + i], 'closed_numeric_eligible')).toBe('1');
        });
      });

      it('admits the unchanged native source without asserting held recursive results', () => {
        const ast = parse(read(folder + 'executed-v1.pine'));
        expect(checkProgram(ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
        expect(tryCompile(ast).success).toBe(true);
      });

      it('re-derives supported controls and joins every held, supported and dependency pointer', () => {
        const holes = id.includes('recursive-holes');
        expect(numeric.comparisonCounts).toEqual(
          holes ? { SUPPORTED: 1024, UNDECIDED: 1024 } : { SUPPORTED: 906, UNDECIDED: 886 },
        );
        expect(numeric.records).toHaveLength(holes ? 2048 : 1792);
        const expected = new Map<string, string>();
        const key = (ordinal: number, property: string) => `${ordinal}:${property}`;
        let fractionalTR = 0;
        selected.forEach((row, i) => {
          const ordinal = start + i + 1;
          const controls: Record<string, string> = {};
          if (holes) {
            const index = Number(cell(row, 'INPUT_INDEX')),
              cycle = index % 64;
            const clean = (index % 11) - 5;
            const hole = index < 3 || [12, 13, 32, 33, 34].includes(cycle);
            Object.assign(controls, {
              CYCLE: String(cycle),
              CLEAN: String(clean),
              X: hole ? '' : String(clean),
              X_NA: hole ? '1' : '0',
            });
            for (const title of ['EMA', 'RMA', 'RSI', 'TSI'])
              controls[`${title}_HOLE_NA`] = cell(row, `${title}_HOLE`) === '' ? '1' : '0';
          } else {
            for (const title of ['OPEN', 'HIGH', 'LOW', 'CLOSE'])
              controls[`INPUT_${title}`] = cell(row, title.toLowerCase());
            for (const [witness, target] of [
              ['ATR_NA', 'ATR'],
              ['ADX_NA', 'ADX'],
              ['TREND_NA', 'SUPERTREND'],
            ])
              controls[witness] = cell(row, target) === '' ? '1' : '0';
            const predicted = trueRange(
              cell(row, 'INPUT_HIGH'),
              cell(row, 'INPUT_LOW'),
              cell(data.rows[ordinal - 2], 'INPUT_CLOSE'),
            );
            const residual = subtract(rational(cell(row, 'TR')), predicted);
            const record = numeric.records.find((r) => r.property === 'TR' && r.nativeCell.rowOrdinal === ordinal)!;
            expect(record.predictedRational).toBe(format(predicted));
            expect(record.exactExportedStringResidual).toBe(format(residual));
            if (residual[0] === 0n) controls.TR = cell(row, 'TR');
            else {
              fractionalTR++;
              expect(record.verdict).toBe('UNDECIDED');
            }
          }
          for (const [title, raw] of Object.entries(controls)) {
            expect(cell(row, title), key(ordinal, title)).toBe(raw);
            expected.set(key(ordinal, title), raw);
          }
        });
        expect(expected.size).toBe(holes ? 1024 : 906);
        expect(fractionalTR).toBe(holes ? 0 : 118);
        const supported = numeric.records.filter((r) => r.verdict === 'SUPPORTED');
        expect(
          new Map(supported.map((r) => [key(r.nativeCell.rowOrdinal, r.property), r.nativeCell.valueRaw])),
        ).toEqual(expected);
        for (const record of numeric.records) {
          for (const pointer of [record.nativeCell, ...record.inputCells, ...(record.dependencyCells ?? [])]) {
            expect(data.headers[pointer.columnOrdinal - 1]).toBe(pointer.headerRaw);
            expect(data.rows[pointer.rowOrdinal - 1][pointer.columnOrdinal - 1]).toBe(pointer.valueRaw);
          }
          expect(record.nativeCell.headerRaw).toBe(record.property);
          if (record.verdict === 'SUPPORTED') {
            expect(record.closedScoringEligible).toBe(true);
            expect(record.predictedBlank ? '' : rational(record.predictedRational!)).toEqual(
              record.predictedBlank ? '' : rational(record.nativeCell.valueRaw),
            );
          } else {
            expect(record.verdict).toBe('UNDECIDED');
            if (record.property === 'TR')
              expect(record.closedScoringEligible).toBe(true); // precision held, not seed held
            else
              expect(record).toMatchObject({
                closedScoringEligible: false,
                predictedRational: null,
                exclusionCause: 'OWN_INDEX_ZERO_PREFIX_NOT_EXPORTED',
              });
          }
        }
      });

      if (id.includes('recursive-holes')) {
        for (const property of [
          'CYCLE',
          'CLEAN',
          'X',
          'X_NA',
          'EMA_HOLE_NA',
          'RMA_HOLE_NA',
          'RSI_HOLE_NA',
          'TSI_HOLE_NA',
        ])
          it(`projects all 128 native ${property} input/presence controls, without recursive target credit`, () => {
            const presence = property.endsWith('_HOLE_NA');
            const output = (presence ? holePresence(capture) : holeProjection(capture)).plots.find(
              (p) => p.title === property,
            )!;
            const actual = presence ? output.values.slice(start) : output.values;
            const expected = selected.map((row) => (cell(row, property) === '' ? null : Number(cell(row, property))));
            if (property === 'TSI_HOLE_NA') {
              // Exported rows1..6 do not supply enough momentum samples for this
              // local TSI startup. Native row7 has its own omitted history. That
              // single witness is a scalar presence projection, never a seed or
              // an assertion about locally initialized TSI at row7.
              expect(actual.slice(1)).toEqual(expected.slice(1));
              const observed = value(cell(selected[0], 'TSI_HOLE'));
              const projected = run(
                `//@version=${capture.source.source.pineVersion}\nindicator("Observed TSI presence only")\nplot(na(close) ? 1 : 0, "TSI_HOLE_NA")`,
                [
                  {
                    time: Number(cell(selected[0], 'time')) * 1000,
                    open: observed,
                    high: observed,
                    low: observed,
                    close: observed,
                    volume: 0,
                  },
                ],
              );
              expect(projected.plots[0].values).toEqual([expected[0]]);
            } else expect(actual).toEqual(expected);
          });
      } else {
        for (const property of ['INPUT_OPEN', 'INPUT_HIGH', 'INPUT_LOW', 'INPUT_CLOSE', 'ATR_NA', 'ADX_NA', 'TREND_NA'])
          it(`matches 128 native ${property} controls on actual suffix bars, with seeded values excluded`, () => {
            const output = run(read(folder + 'executed-v1.pine'), chartBars(capture)).plots.find(
              (p) => p.title === property,
            )!;
            expect(output.values.slice(start)).toEqual(selected.map((row) => Number(cell(row, property))));
          });

        it('matches only the 10 exact rational TR native targets; preserves 118 fractional residues as held', () => {
          const output = run(read(folder + 'executed-v1.pine'), chartBars(capture)).plots.find(
            (p) => p.title === 'TR',
          )!;
          const supported = numeric.records.filter((r) => r.property === 'TR' && r.verdict === 'SUPPORTED');
          expect(supported).toHaveLength(10);
          for (const record of supported) {
            const expected = rational(record.predictedRational!);
            expect(output.values[record.nativeCell.rowOrdinal - 1]).toBe(Number(expected[0]) / Number(expected[1]));
          }
        });

        it('checks all 128 rational previous-close TR predictions using exact integer-cent input projection', () => {
          // Input projection only: native fractional TR targets remain unchanged,
          // UNDECIDED and unscored. Scaling raw OHLC to integer cents makes every
          // subtraction exact; row77 requires previous close rather than high-low.
          const output = run(
            `//@version=${capture.source.source.pineVersion}\nindicator("TR rational input projection")\nplot(ta.tr(true), "TR")`,
            chartBars(capture, true),
          ).plots[0];
          let gaps = 0;
          selected.forEach((row, i) => {
            const previous = data.rows[start + i - 1];
            const predicted = trueRange(cell(row, 'INPUT_HIGH'), cell(row, 'INPUT_LOW'), cell(previous, 'INPUT_CLOSE'));
            const cents = rat(predicted[0] * 100n, predicted[1]);
            expect(cents[1]).toBe(1n);
            expect(output.values[start + i]).toBe(Number(cents[0]));
            if (
              format(predicted) !==
              format(subtract(rational(cell(row, 'INPUT_HIGH')), rational(cell(row, 'INPUT_LOW'))))
            )
              gaps++;
          });
          expect(gaps).toBe(1);
        });

        it('pins the three native direction transitions as observed, with zero replay/startup credit', () => {
          const transitions = selected.flatMap((row, i) => {
            const ordinal = start + i + 1;
            const prior = data.rows[ordinal - 2];
            return cell(row, 'DIRECTION') === cell(prior, 'DIRECTION')
              ? []
              : [
                  {
                    priorRowOrdinal: ordinal - 1,
                    rowOrdinal: ordinal,
                    priorDirectionRaw: cell(prior, 'DIRECTION'),
                    directionRaw: cell(row, 'DIRECTION'),
                  },
                ];
          });
          expect(transitions).toEqual([
            { priorRowOrdinal: 10, rowOrdinal: 11, priorDirectionRaw: '1', directionRaw: '-1' },
            { priorRowOrdinal: 58, rowOrdinal: 59, priorDirectionRaw: '-1', directionRaw: '1' },
            { priorRowOrdinal: 119, rowOrdinal: 120, priorDirectionRaw: '1', directionRaw: '-1' },
          ]);
          // Direction depends on carried bands and ATR. The missing own prefix
          // precludes a prefix-independent replay proof; never assert engine directions.
          expect(numeric.records.filter((r) => r.property === 'DIRECTION')).toHaveLength(128);
          expect(
            numeric.records
              .filter((r) => r.property === 'DIRECTION')
              .every((r) => !r.closedScoringEligible && r.verdict === 'UNDECIDED'),
          ).toBe(true);
        });
      }

      it('keeps all seeded targets, remaining closed rows and developing rows OBSERVED/excluded', () => {
        expect(numeric.strictOwnIndexZeroPrefixAvailable).toBe(false);
        const seeded = numeric.records.filter((r) => r.exclusionCause === 'OWN_INDEX_ZERO_PREFIX_NOT_EXPORTED');
        expect(seeded).toHaveLength(id.includes('recursive-holes') ? 1024 : 768);
        for (const record of seeded) {
          expect(record.closedScoringEligible).toBe(false);
          expect(record.verdict).toBe('UNDECIDED');
        }
        expect(seeded.filter((r) => r.nativeCell.valueRaw === '')).toHaveLength(
          id.includes('recursive-holes') ? 48 : 0,
        );
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
