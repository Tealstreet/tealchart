import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';
import { expectedVersionAdvisories } from '../helpers/expectedVersionAdvisory';

interface Proof { path: string; bytes: number; sha256: string }
interface Pointer { rowOrdinal: number; columnOrdinal: number; headerRaw: string; valueRaw: string }
interface RecordCell {
  property: string; model: string; verdict: string; nativeCell: Pointer; inputCells: Pointer[];
  dependencyCells?: Pointer[]; predictedRational: string | null; predictedBlank: boolean;
  closedScoringEligible: boolean; exclusionCause?: string; precision: string;
}
interface Numeric {
  sourceId: string; sourceSha256: string; csv: Proof; columnBindings: Proof; closureMask: Proof;
  selectedBlockDataRowOrdinals: number[]; strictOwnIndexZeroPrefixAvailable: boolean;
  records: RecordCell[]; comparisonCounts: { SUPPORTED: number; REFUTED: number; UNDECIDED: number };
}
interface NativeWarning { message: string; start: { line: number; column: number }; end: { line: number; column: number }; code?: string; ctx?: { functionName: string } }
const revision = '0bda1a440f03f92334f5f95babaa5021bc7a7e15';
const base = 'v95/captures/v95/';
const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as {
  revision: string; files: Proof[];
};
const bytes = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url));
const read = (path: string) => bytes(path).toString('utf8');
const json = <T>(path: string): T => JSON.parse(read(path)) as T;
const sha = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');
function csv(path: string) {
  return read(path).trimEnd().split(/\r?\n/).map((line) =>
    line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((cell) =>
      cell.startsWith('"') ? cell.slice(1, -1).replaceAll('""', '"') : cell),
  );
}
function verify(proof: Proof) {
  expect(lock.files.find((file) => file.path === proof.path)).toEqual(proof);
  expect(bytes(proof.path).length).toBe(proof.bytes);
  expect(sha(bytes(proof.path))).toBe(proof.sha256);
}
const sources = [5, 6].map((version) => {
  const id = `v95-conditional-clock-v${version}`;
  const folder = base + id + '/attempt-v1/';
  const numeric = json<Numeric>(folder + 'numeric-results-v1.json');
  const [headers, ...rows] = csv(numeric.csv.path);
  const [maskHeaders, ...mask] = csv(numeric.closureMask.path);
  const get = (ordinal: number, title: string) => rows[ordinal - 1][headers.indexOf(title)];
  const source = read(folder + 'executed-v1.pine');
  // Bind bar_index to each captured INPUT_INDEX; this is a suffix input replay, not an index-zero seed.
  const replay = source.replaceAll('bar_index', 'int(open)');
  const compiled = tryCompile(parse(replay));
  const engine = executeCompiled(compiled, rows.map((row) => ({
    time: Number(row[7]), open: Number(row[6]), high: Number(row[6]), low: Number(row[6]),
    close: Number(row[6]), volume: 1,
  })));
  if (!engine) throw new Error(`${id}: suffix input replay did not compile`);
  const output = (title: string, ordinal: number) => engine.plots.find((plot) => plot.title === title)!.values[ordinal - 1];
  return { version, id, folder, numeric, headers, rows, maskHeaders, mask, get, source, compiled, engine, output };
});

describe('v95 conditional SMA/EMA clocks and native compiler warnings', () => {
  it('binds only item 2 and common v2 evidence to immutable bytes and the integrity manifest', () => {
    expect(lock.revision).toBe(revision);
    const common = ['v95/REQUEST-v95-v1.md', ...['RESPONSE-v95-v2.md', 'attempt-inventory-v2.json',
      'numeric-controls-v2.json', 'facet-capabilities-v2.json', 'artifact-integrity-v2.json',
      'validation-result-v2.json'].map((name) => base + name)];
    const pinned = lock.files.filter((file) => common.includes(file.path) || file.path.includes('/v95-conditional-clock-v'));
    expect(pinned).toHaveLength(33);
    const integrity = json<{ files: Proof[] }>(base + 'artifact-integrity-v2.json');
    for (const proof of pinned) {
      verify(proof);
      if (!['artifact-integrity-v2.json', 'validation-result-v2.json'].some((name) => proof.path.endsWith(name))) {
        expect(integrity.files.find((file) => file.path === proof.path)).toEqual(proof);
      }
      expect(proof.path).not.toContain('v95-lower-tf');
    }
    expect(json<{ status: string }>(base + 'validation-result-v2.json').status).toBe('PASS');
  });

  for (const s of sources) {
    it(`${s.id}: authenticates source, original column ordinals and every derived raw-cell pointer`, () => {
      const observation = json<{
        item: number; sourceId: string; sourceSha256: string; requestSource: string; executed: Proof;
        saveBody: Proof; addBody: Proof; nativeCompileSuccess: boolean; nativeStudyInstanceId: null; editorMarkerArrays: null;
      }>(s.folder + 'observation-v1.json');
      expect(observation.item).toBe(2);
      expect(observation.sourceId).toBe(s.id);
      expect(observation.nativeCompileSuccess).toBe(true);
      expect(observation.nativeStudyInstanceId).toBeNull();
      expect(observation.editorMarkerArrays).toBeNull();
      expect(read(observation.requestSource)).toBe(s.source);
      expect(observation.sourceSha256).toBe(sha(bytes(observation.executed.path)));
      expect(s.numeric.sourceSha256).toBe(observation.sourceSha256);
      [observation.executed, observation.saveBody, observation.addBody, s.numeric.csv,
        s.numeric.columnBindings, s.numeric.closureMask].forEach(verify);
      expect(s.headers).toEqual(['time', 'open', 'high', 'low', 'close', 'Volume', 'INPUT_INDEX', 'INPUT_TIME',
        'CHART_CONFIRMED', 'IS_FIRST', 'FIRST_INDEX', 'FIRST_TIME', 'PHASE', 'X', 'GATE', 'SMA_ALL', 'EMA_ALL',
        'SMA_BRANCH', 'EMA_BRANCH', 'BRANCH_SMA_NA', 'BRANCH_EMA_NA']);
      const bindings = json<{ columns: { columnOrdinal: number; originalHeader: string }[] }>(s.numeric.columnBindings.path);
      expect(bindings.columns.map((column) => [column.columnOrdinal, column.originalHeader]))
        .toEqual(s.headers.map((header, i) => [i + 1, header]));
      for (const record of s.numeric.records) {
        for (const pointer of [record.nativeCell, ...record.inputCells, ...(record.dependencyCells ?? [])]) {
          expect(s.headers[pointer.columnOrdinal - 1]).toBe(pointer.headerRaw);
          expect(s.rows[pointer.rowOrdinal - 1][pointer.columnOrdinal - 1]).toBe(pointer.valueRaw);
        }
      }
      expect(s.numeric.records).toHaveLength(1024);
      expect(s.numeric.comparisonCounts).toEqual({ SUPPORTED: 604, UNDECIDED: 354, REFUTED: 66 });
    });

    it(`${s.id}: independently closes the 128-row block and excludes every remaining present value`, () => {
      expect(s.rows).toHaveLength(s.version === 5 ? 306 : 308);
      expect(s.numeric.selectedBlockDataRowOrdinals).toEqual(Array.from({ length: 128 }, (_, i) => i + 7));
      let closed = 0;
      for (let i = 0; i < s.rows.length; i++) {
        const ordinal = i + 1;
        const mask = Object.fromEntries(s.maskHeaders.map((header, j) => [header, s.mask[i][j]]));
        const independentlyClosed = s.get(ordinal, 'CHART_CONFIRMED') === '1'
          && Number(s.get(ordinal, 'time')) + 120 <= Date.parse(mask.export_utc) / 1000;
        expect(mask.csv_sha256).toBe(s.numeric.csv.sha256);
        expect(mask.row_ordinal).toBe(String(ordinal));
        expect(mask.closed_numeric_eligible).toBe(independentlyClosed ? '1' : '0');
        expect(mask.present_cell_status).toBe(independentlyClosed ? 'OBSERVED' : 'OBSERVED / EXCLUDED');
        expect(mask.exclusion_cause).toBe(independentlyClosed ? '' : 'PHYSICALLY_OPEN_OR_NATIVE_CONFIRMATION_NOT_REACHED');
        if (independentlyClosed) closed++;
        const status = ordinal >= 7 && ordinal <= 134 ? 'BOUNDED_BLOCK' : independentlyClosed
          ? 'OBSERVED / OUTSIDE_SELECTED_BLOCK / EXCLUDED' : 'OBSERVED / DEVELOPING / EXCLUDED';
        if (status !== 'BOUNDED_BLOCK') expect(s.numeric.records.some((r) => r.nativeCell.rowOrdinal === ordinal)).toBe(false);
        if (i) {
          expect(Number(s.get(ordinal, 'INPUT_INDEX')) - Number(s.get(ordinal - 1, 'INPUT_INDEX'))).toBe(1);
          expect(Number(s.get(ordinal, 'INPUT_TIME')) - Number(s.get(ordinal - 1, 'INPUT_TIME'))).toBe(120000);
        }
      }
      expect(closed).toBe(s.version === 5 ? 305 : 307);
      expect(s.numeric.strictOwnIndexZeroPrefixAvailable).toBe(false);
      expect([s.get(1, 'INPUT_INDEX'), s.get(1, 'IS_FIRST'), s.get(1, 'FIRST_INDEX'), s.get(1, 'FIRST_TIME')])
        .toEqual(['23338', '0', '0', '1789344000000']);
      expect(s.compiled.success).toBe(true);
      expect(s.engine.errors).toEqual([]);
    });

    it(`${s.id}: refutes every-bar SMA and exactly locks integer gated windows without seed credit`, () => {
      const counts = { gate0: 0, gate1: 0, gatedInteger: 0, gatedFractional: 0, chartRefuted: 0, chartFractional: 0, allInteger: 0 };
      const gated: number[] = [];
      for (let ordinal = 1; ordinal <= 134; ordinal++) {
        const index = Number(s.get(ordinal, 'INPUT_INDEX'));
        const gate = (index % 16) % 3 !== 0;
        expect(s.get(ordinal, 'X')).toBe(String(index % 11 - 5));
        expect(s.get(ordinal, 'GATE')).toBe(gate ? '1' : '0');
        if (gate) gated.push(ordinal);
        if (ordinal < 7) continue;
        for (const title of ['X', 'GATE', 'PHASE']) expect(s.output(title, ordinal)).toBe(Number(s.get(ordinal, title)));
        if (!gate) {
          counts.gate0++;
          for (const title of ['SMA_BRANCH', 'EMA_BRANCH']) {
            expect(s.get(ordinal, title)).toBe('');
            expect(s.output(title, ordinal)).toBeNull();
          }
          for (const title of ['BRANCH_SMA_NA', 'BRANCH_EMA_NA']) {
            expect(s.get(ordinal, title)).toBe('1');
            expect(s.output(title, ordinal)).toBe(1);
          }
          continue;
        }
        counts.gate1++;
        const branchDeps = gated.slice(-3);
        expect(branchDeps).toHaveLength(3);
        expect(Math.min(...branchDeps)).toBeGreaterThanOrEqual(1);
        const chartDeps = [ordinal - 2, ordinal - 1, ordinal];
        const sum = (deps: number[]) => deps.reduce((total, dep) => total + Number(s.get(dep, 'X')), 0);
        const branchSum = sum(branchDeps), chartSum = sum(chartDeps);
        expect(branchSum).not.toBe(chartSum);
        for (const [model, total, deps] of [
          ['GATED_CALL_CLOCK', branchSum, branchDeps], ['EVERY_CHART_BAR_CLOCK', chartSum, chartDeps],
        ] as const) {
          const record = s.numeric.records.find((r) => r.nativeCell.rowOrdinal === ordinal && r.model === model)!;
          const integer = total % 3 === 0;
          expect(record.predictedRational).toBe(integer ? String(total / 3) : `${total}/3`);
          expect(record.dependencyCells?.map((p) => p.rowOrdinal)).toEqual(deps);
          if (model === 'GATED_CALL_CLOCK') {
            expect(record.verdict).toBe(integer ? 'SUPPORTED' : 'UNDECIDED');
            if (integer) {
              counts.gatedInteger++;
              expect(record.nativeCell.valueRaw).toBe(String(total / 3));
              expect(s.output('SMA_BRANCH', ordinal)).toBe(total / 3);
            } else {
              counts.gatedFractional++;
              // Raw strings are SHA-bound OBSERVED/UNDECIDED, excluded from engine equality and parity credit.
              expect(record.precision).toBe('EXPORTED_DECIMAL_INPUT_OR_FRACTIONAL_PRECISION');
            }
          } else {
            expect(record.verdict).toBe(integer ? 'REFUTED' : 'UNDECIDED');
            if (integer) {
              counts.chartRefuted++;
              expect(record.nativeCell.valueRaw).not.toBe(String(total / 3));
              expect(s.output('SMA_BRANCH', ordinal)).not.toBe(total / 3);
              expect(s.get(ordinal, 'SMA_ALL')).toBe(String(total / 3));
              expect(s.output('SMA_ALL', ordinal)).toBe(total / 3);
              counts.allInteger++;
            } else counts.chartFractional++;
          }
        }
        expect(s.get(ordinal, 'BRANCH_SMA_NA')).toBe('0');
        expect(s.output('BRANCH_SMA_NA', ordinal)).toBe(0);
      }
      expect(counts).toEqual({ gate0: 48, gate1: 80, gatedInteger: 10, gatedFractional: 70,
        chartRefuted: 66, chartFractional: 14, allInteger: 66 });
    });

    it(`${s.id}: pins both EMA target trajectories as OBSERVED with missing-prefix exclusion`, () => {
      const records = s.numeric.records.filter((r) => r.model === 'NATIVE_TARGET_VECTOR');
      expect(records).toHaveLength(256);
      for (const record of records) {
        expect(['EMA_ALL', 'EMA_BRANCH']).toContain(record.property);
        expect(record.verdict).toBe('UNDECIDED');
        expect(record.closedScoringEligible).toBe(false);
        expect(record.exclusionCause).toBe('OWN_INDEX_ZERO_PREFIX_NOT_EXPORTED');
        expect(record.predictedRational).toBeNull();
      }
    });

    it(`${s.id}: matches both native compiler transports' ordered warning text and line on the exact source`, () => {
      const diagnostics = json<{
        sourceSha256: string;
        transports: { kind: string; body: Proof; nativeSuccess: boolean; nativeWarnings: string[];
          nativeReason2: { warnings: NativeWarning[] }; nativeEditorMarkerArrays: null }[];
      }>(s.folder + 'compiler-diagnostics-v1.json');
      expect(diagnostics.sourceSha256).toBe(sha(bytes(s.folder + 'executed-v1.pine')));
      const engine = checkProgram(parse(s.source)).diagnostics;
      // The transport exposes consistency warnings; the existing version-header advisory is checked separately.
      expect(engine.filter((d) => d.code === 'PINE_VERSION_OUTDATED')).toEqual(expectedVersionAdvisories(s.version));
      const actual = engine.filter((d) => d.code !== 'PINE_VERSION_OUTDATED')
        .map((d) => ({ message: d.message, line: d.line, column: d.column, severity: d.severity, nativeCode: d.nativeCode }));
      expect(diagnostics.transports.map((t) => t.kind)).toEqual(['saveBody', 'addBody']);
      for (const transport of diagnostics.transports) {
        verify(transport.body);
        const body = json<{ success: boolean; reason2: { warnings: NativeWarning[] };
          result: { metaInfo: { warnings: string[] } } }>(transport.body.path);
        expect(body.success).toBe(transport.nativeSuccess);
        expect(body.reason2).toEqual(transport.nativeReason2);
        expect(body.result.metaInfo.warnings).toEqual(transport.nativeWarnings);
        expect(transport.nativeSuccess).toBe(true);
        expect(transport.nativeEditorMarkerArrays).toBeNull();
        const native = transport.nativeReason2.warnings;
        expect(native.map((d) => d.start.line)).toEqual([13, 14]);
        if (s.version === 5) {
          expect(transport.nativeWarnings).toEqual(native.map((d) => `line ${d.start.line}: ${d.message}`));
        } else {
          expect(transport.nativeWarnings.map((raw) => {
            const warning = JSON.parse(raw) as NativeWarning;
            return { code: warning.code, ctx: warning.ctx, line: warning.start.line };
          })).toEqual(native.map((d) => ({ code: d.code, ctx: d.ctx, line: d.start.line })));
        }
        expect(actual).toEqual(native.map((d) => ({ message: d.message.replace('{functionName}', d.ctx?.functionName ?? ''), line: d.start.line,
          column: d.start.column, severity: 'warning', nativeCode: d.code })));
      }
    });
  }
});
