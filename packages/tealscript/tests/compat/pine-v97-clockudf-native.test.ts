import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

interface Proof { path: string; bytes: number; sha256: string }
interface Cell { rowOrdinal: number; columnOrdinal: number; headerRaw: string; valueRaw: string }
interface RecordCell {
  property: string; model: string; verdict: string; nativeCell: Cell; inputCells: Cell[];
  dependencyCells?: Cell[]; predictedRational: string | null; predictedBlank: boolean;
  precision: string; closedScoringEligible: boolean;
}
interface Numeric {
  sourceId: string; sourceSha256: string; csv: Proof; columnBindings: Proof; closureMask: Proof; sourceFrontier: Proof;
  selectedBlockDataRowOrdinals: number[]; selectedBlockOwnIndices: number[]; selectedFinalSession: number;
  strictOwnIndexZeroPrefixAvailable: boolean; earlierSessionsNeverStitched: boolean; records: RecordCell[];
  comparisonCounts: Record<string, number>;
  nativeVectorPresenceSummary: { property: string; firstFiniteClosedCell: Cell; firstFiniteOwnIndex: string; primary128BlankOwnIndices: number[] }[];
}
const base = 'v97/captures/v97/';
const revision = 'f47a4e34ce33441ad37add124d9572119826138d';
const readBytes = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url));
const read = (path: string) => readBytes(path).toString('utf8');
const json = <T>(path: string): T => JSON.parse(read(path)) as T;
const sha = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');
const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as { revision: string; files: Proof[] };
function csv(path: string) {
  return read(path).trimEnd().split(/\r?\n/).map((line) => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map((v) => v.startsWith('"') ? v.slice(1, -1).replaceAll('""', '"') : v));
}
function proof(path: string) { const raw = readBytes(path); return { path, bytes: raw.length, sha256: sha(raw) }; }
function verify(p: Proof) { expect(lock.files.find((f) => f.path === p.path), p.path).toEqual(p); expect(proof(p.path)).toEqual(p); }
type Rational = readonly [bigint, bigint];
function rational(n: bigint, d = 1n): Rational {
  const gcd = (a: bigint, b: bigint): bigint => b ? gcd(b, a % b) : a < 0n ? -a : a;
  const g = gcd(n, d); return [n / g, d / g];
}
const add = (a: Rational, b: Rational) => rational(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const divide = (a: Rational, n: bigint) => rational(a[0], a[1] * n);
const text = (r: Rational) => r[1] === 1n ? String(r[0]) : `${r[0]}/${r[1]}`;
function shortDyadic(r: Rational | null): boolean {
  if (!r) return true;
  const [n, d] = r, abs = n < 0n ? -n : n;
  if ((d & (d - 1n)) !== 0n || abs.toString(2).length > 53) return false;
  return (abs * 5n ** BigInt(d.toString(2).length - 1)).toString().replace(/0+$/, '').length <= 16;
}
interface Candidate { value: Rational | null; exact: boolean }
function ema(seed: 'FIRST_FINITE' | 'SMA3_FINITE', gated: boolean): Candidate[] {
  let state: Rational | null = null, exact = true;
  const samples: Rational[] = [];
  return Array.from({ length: 128 }, (_, i) => {
    if (gated && (i % 16) % 3 === 0) return { value: null, exact };
    const x = rational(BigInt(i % 11 - 5));
    if (!state) {
      samples.push(x);
      if (seed === 'FIRST_FINITE') state = x;
      else if (samples.length >= 3) state = divide(samples.slice(-3).reduce(add), 3n);
      exact &&= shortDyadic(state);
    } else {
      const oldHalf = divide(state, 2n), newHalf = divide(x, 2n);
      state = add(oldHalf, newHalf);
      exact &&= [oldHalf, newHalf, state].every(shortDyadic);
    }
    return { value: state, exact };
  });
}
const sources = ['conditional-clock', 'udf-state'].flatMap((kind) => [5, 6].map((version) => {
  const id = `v97-${kind}-v${version}`, folder = base + id + '/attempt-v1/';
  const numeric = json<Numeric>(folder + 'numeric-results-v1.json');
  const [headers, ...rows] = csv(numeric.csv.path), [maskHeaders, ...mask] = csv(numeric.closureMask.path);
  const cell = (i: number, title: string) => rows[i][headers.indexOf(title)];
  const source = read(folder + 'executed-v1.pine');
  const compiled = tryCompile(parse(source));
  const result = executeCompiled(compiled, rows.slice(0, 128).map((r) => ({
    time: Number(r[0]) * 1000, open: Number(r[1]), high: Number(r[2]), low: Number(r[3]), close: Number(r[4]), volume: Number(r[5]),
  })));
  if (!result) throw new Error(`${id}: exact source failed to compile`);
  const output = (title: string) => result.plots.find((p) => p.title === title)!.values;
  return { id, kind, version, folder, numeric, headers, rows, maskHeaders, mask, cell, source, compiled, result, output };
}));

describe('v97 own-origin conditional clocks and UDF first reach', () => {
  it('authenticates the append-only family evidence and common v14 integrity/validation', () => {
    expect(lock.revision).toBe(revision);
    const common = ['v97/REQUEST-v97-v1.md', 'v97/bundle-manifest-v1.json', ...[
      'RESPONSE-v97-v14.md', 'selection-inventory-v1.json', 'attempt-inventory-v14.json', 'numeric-controls-v14.json',
      'facet-capabilities-v14.json', 'account-actions-v14.json', 'artifact-integrity-v14.json', 'validation-result-v14.json',
      'validate-evidence-v2.py',
    ].map((p) => base + p)];
    const pinned = lock.files.filter((p) => common.includes(p.path) || sources.some((s) => p.path.startsWith(base + s.id + '/')));
    expect(pinned).toHaveLength(183);
    const integrity = json<{ files: Proof[] }>(base + 'artifact-integrity-v14.json');
    for (const p of pinned) {
      verify(p);
      if (p.path !== base + 'artifact-integrity-v14.json') expect(integrity.files.find((f) => f.path === p.path), p.path).toEqual(p);
    }
    expect(json(base + 'validation-result-v14.json')).toMatchObject({ status: 'PASS', completeFiniteRound: true, completeOwnPrefixSources: 14 });
  });

  it('keeps the earlier v5 suffix export observed and excluded without splicing it into own startup', () => {
    const s = sources.find((s) => s.kind === 'conditional-clock' && s.version === 5)!;
    const session = s.folder + 'session-initial-v1/';
    const [headers, ...rows] = csv(session + 'chart-native-v1.csv');
    const frontier = json<{ prefixFailureCauses: string[] }>(session + 'source-frontier-v1.json');
    expect(s.numeric.selectedFinalSession).toBe(1);
    expect(rows).toHaveLength(302);
    expect(rows[0][headers.indexOf('INPUT_INDEX')]).toBe('23451');
    expect(rows[0][headers.indexOf('IS_FIRST')]).toBe('0');
    expect(frontier).toMatchObject({ strictOwnIndexZeroPrefixAvailable: false, independentlyClosedRows: 301 });
    expect(frontier.prefixFailureCauses).toEqual(['OWN_INDEX_SEQUENCE_UNMET', 'OWN_ORIGIN_CONTEXT_UNMET', 'FEWER_THAN_128_CLOSED_OWN_PREFIX_ROWS']);
    expect(rows.flatMap((r) => r.slice(6)).filter((v) => v !== '').length).toBeGreaterThan(0);
    expect(s.numeric.csv.path).not.toBe(session + 'chart-native-v1.csv');
  });

  for (const s of sources) describe(s.id, () => {
    it('binds unchanged Saved source, original plot ordinals and every native/model cell pointer', () => {
      const observation = json<{ requestSource: Proof; sourceSha256: string; nativeCompileSuccess: boolean; nativeStudyInstanceId: null;
        privateScriptId: string; privateVersion: string; executed: Proof; saveBody: Proof; addBody: Proof }>(s.folder + 'observation-v1.json');
      expect(read(observation.requestSource.path)).toBe(s.source);
      verify(observation.requestSource);
      expect(observation.sourceSha256).toBe(sha(readBytes(s.folder + 'executed-v1.pine')));
      expect(s.numeric.sourceSha256).toBe(observation.sourceSha256);
      const form = read(s.folder + 'save-request-v1.txt').replaceAll('\r\n', '\n');
      const saved = form.split('name="source"\n\n')[1].split(/\n------WebKitFormBoundary/)[0];
      expect(saved.trimEnd()).toBe(s.source.trimEnd());
      expect(observation.nativeCompileSuccess).toBe(true);
      expect(observation.nativeStudyInstanceId).toBeNull();
      [observation.executed, observation.saveBody, observation.addBody, s.numeric.csv, s.numeric.columnBindings,
        s.numeric.closureMask, s.numeric.sourceFrontier].forEach(verify);
      const bindings = json<{ sourceSha256: string; privateId: string; privateVersion: string; missingOrAmbiguousRequestedTitles: string[];
        columns: { columnOrdinal: number; originalHeader: string; nativePlotId?: string }[] }>(s.numeric.columnBindings.path);
      expect(bindings).toMatchObject({ sourceSha256: observation.sourceSha256, privateId: observation.privateScriptId,
        privateVersion: observation.privateVersion, missingOrAmbiguousRequestedTitles: [] });
      expect(bindings.columns.map((c) => [c.columnOrdinal, c.originalHeader])).toEqual(s.headers.map((h, i) => [i + 1, h]));
      expect(bindings.columns.slice(6).map((c) => c.nativePlotId)).toEqual(s.headers.slice(6).map((_, i) => `plot_${i}`));
      for (const body of [observation.saveBody, observation.addBody]) {
        const meta = json<{ success: boolean; result: { metaInfo: { styles: Record<string, { title: string }> } } }>(body.path);
        expect(meta.success).toBe(true);
        expect(s.headers.slice(6).map((_, i) => meta.result.metaInfo.styles[`plot_${i}`].title)).toEqual(s.headers.slice(6));
      }
      for (const r of s.numeric.records) for (const p of [r.nativeCell, ...r.inputCells, ...(r.dependencyCells ?? [])]) {
        expect(s.headers[p.columnOrdinal - 1]).toBe(p.headerRaw);
        expect(s.rows[p.rowOrdinal - 1][p.columnOrdinal - 1]).toBe(p.valueRaw);
      }
      expect(s.compiled.success).toBe(true);
      expect(s.result.errors).toEqual([]);
    });

    it('independently certifies physical own0..127 and retains all outside/developing observations without credit', () => {
      const expectedRows = s.kind === 'conditional-clock' ? (s.version === 5 ? 23754 : 23755) : (s.version === 5 ? 23757 : 23759);
      expect(s.rows).toHaveLength(expectedRows);
      expect(s.mask).toHaveLength(expectedRows);
      expect(s.numeric).toMatchObject({ selectedBlockOwnIndices: [0, 127], strictOwnIndexZeroPrefixAvailable: true, earlierSessionsNeverStitched: true });
      expect(s.numeric.selectedBlockDataRowOrdinals).toEqual(Array.from({ length: 128 }, (_, i) => i + 1));
      expect(s.numeric.csv.path).toContain(s.kind === 'conditional-clock' && s.version === 5 ? '/session-post-navigation-v1/' : '/session-initial-v1/');
      const frontier = json<{ nativeExportUtc: string; strictOwnIndexZeroPrefixAvailable: boolean; noCrossSessionStitching: boolean;
        ownPrefixIndexGapsOrDuplicates: unknown[]; originContextViolationRowOrdinals: number[] }>(s.numeric.sourceFrontier.path);
      expect(frontier).toMatchObject({ strictOwnIndexZeroPrefixAvailable: true, noCrossSessionStitching: true,
        ownPrefixIndexGapsOrDuplicates: [], originContextViolationRowOrdinals: [] });
      let closed = 0, outsidePresent = 0, developingPresent = 0;
      for (let i = 0; i < s.rows.length; i++) {
        const m = Object.fromEntries(s.maskHeaders.map((h, j) => [h, s.mask[i][j]]));
        expect(s.cell(i, 'INPUT_INDEX')).toBe(String(i));
        expect(s.cell(i, 'INPUT_TIME')).toBe(String(Number(s.cell(i, 'time')) * 1000));
        expect(s.cell(i, 'IS_FIRST')).toBe(i ? '0' : '1');
        expect(s.cell(i, 'FIRST_INDEX')).toBe('0');
        expect(s.cell(i, 'FIRST_TIME')).toBe(s.cell(0, 'INPUT_TIME'));
        const eligible = s.cell(i, 'CHART_CONFIRMED') === '1' && Number(s.cell(i, 'time')) * 1000 + 120000 <= Date.parse(frontier.nativeExportUtc);
        expect(m.csv_sha256).toBe(s.numeric.csv.sha256);
        expect(m.row_ordinal).toBe(String(i + 1));
        expect(m.closed_numeric_eligible).toBe(eligible ? '1' : '0');
        expect(m.present_cell_status).toBe(eligible ? 'OBSERVED' : 'OBSERVED / EXCLUDED');
        expect(m.exclusion_cause).toBe(eligible ? '' : 'PHYSICALLY_OPEN_OR_NATIVE_CONFIRMATION_UNMET');
        if (eligible) closed++;
        if (i < 128) expect(eligible).toBe(true);
        else {
          const present = s.rows[i].slice(6).filter((v) => v !== '').length;
          if (eligible) outsidePresent += present; else developingPresent += present;
        }
      }
      expect(closed).toBe(expectedRows - 1);
      expect(outsidePresent).toBeGreaterThan(0);
      expect(developingPresent).toBeGreaterThan(0);
      expect(s.numeric.records.every((r) => r.nativeCell.rowOrdinal >= 1 && r.nativeCell.rowOrdinal <= 128)).toBe(true);
      expect(s.cell(expectedRows - 1, 'CHART_CONFIRMED')).toBe('0');
    });

    it('pins every native target and its first-finite/presence summary without promoting model UNDECIDED', () => {
      const targets = s.numeric.records.filter((r) => r.model === 'NATIVE_TARGET_VECTOR');
      expect(targets).toHaveLength(128 * (s.headers.length - 6));
      expect(new Set(targets.map((r) => `${r.property}:${r.nativeCell.rowOrdinal}`)).size).toBe(targets.length);
      for (const r of targets) expect(r).toMatchObject({ verdict: 'UNDECIDED', predictedRational: null });
      for (const summary of s.numeric.nativeVectorPresenceSummary) {
        const col = s.headers.indexOf(summary.property), first = s.rows.findIndex((r) => r[col] !== '');
        expect(summary.firstFiniteOwnIndex).toBe(String(first));
        expect(summary.firstFiniteClosedCell).toEqual({ rowOrdinal: first + 1, columnOrdinal: col + 1, headerRaw: summary.property, valueRaw: s.rows[first][col] });
        expect(summary.primary128BlankOwnIndices).toEqual(s.rows.slice(0, 128).flatMap((r, i) => r[col] === '' ? [i] : []));
      }
    });

    it('matches every primary native number, original string and binary64 encoding exactly', () => {
      const bits = (value: number) => {
        const buffer = Buffer.alloc(8);
        buffer.writeDoubleBE(value);
        return buffer.toString('hex');
      };
      let finite = 0, blank = 0;
      for (const title of s.headers.slice(6)) {
        const values = s.output(title);
        expect(values).toHaveLength(128);
        for (let i = 0; i < 128; i++) {
          const raw = s.cell(i, title), actual = values[i], key = `${title} own${i}`;
          if (raw === '') {
            expect(actual, key).toBeNull();
            blank++;
          } else {
            const native = Number(raw);
            expect(Number.isFinite(native), key).toBe(true);
            expect(actual, key).toBe(native);
            expect(String(actual), key).toBe(raw);
            expect(bits(actual!), key).toBe(bits(native));
            finite++;
          }
        }
      }
      expect({ finite, blank }).toEqual(s.kind === 'conditional-clock'
        ? { finite: 1816, blank: 104 } : { finite: 1688, blank: 104 });
    });

    if (s.kind === 'udf-state') it('locks all 1792 exact cells including first-reach5 retained across eight branch visits', () => {
      const expected = Array.from({ length: 128 }, (_, i) => {
        const p = i % 16;
        return { INPUT_INDEX: i, INPUT_TIME: Number(s.cell(i, 'time')) * 1000, CHART_CONFIRMED: 1, IS_FIRST: Number(i === 0),
          FIRST_INDEX: 0, FIRST_TIME: Number(s.cell(0, 'time')) * 1000, PHASE: p, A: p + 1, B: 10 * (p + 1), NESTED: 5 * (p + 1),
          GATED: p % 2 ? null : 100 * (p / 2 + 1), LOCAL_FIRST: p < 5 ? null : 5, GATED_NA: p % 2, LOCAL_FIRST_NA: Number(p < 5) };
      });
      for (const title of s.headers.slice(6)) {
        const values = expected.map((r) => r[title as keyof typeof r]);
        expect(s.rows.slice(0, 128).map((r) => r[s.headers.indexOf(title)]), title).toEqual(values.map((v) => v === null ? '' : String(v)));
        expect(s.output(title), title).toEqual(values);
      }
      expect(s.numeric.comparisonCounts).toEqual({ UNDECIDED: 1792, SUPPORTED: 908, REFUTED: 164 });
      for (const model of ['REINITIALIZE_EACH_VISIT', 'REINITIALIZE_EACH_PHASE_BLOCK']) {
        const records = s.numeric.records.filter((r) => r.model === model);
        expect(records).toHaveLength(88);
        for (const r of records) {
          const i = r.nativeCell.rowOrdinal - 1, prediction = model === 'REINITIALIZE_EACH_VISIT' ? i : Math.floor(i / 16) * 16 + 5;
          expect(r.predictedRational).toBe(String(prediction));
          expect(r.verdict).toBe(prediction === 5 ? 'SUPPORTED' : 'REFUTED');
        }
      }
    });

    if (s.kind === 'conditional-clock') it('checks seed/clock rational models separately from the exact native vector', () => {
      const all = ema('SMA3_FINITE', false), branch = ema('SMA3_FINITE', true);
      const counts = { rationalDecidable: 0, rationalGuarded: 0 };
      const samples: Rational[] = [];
      for (let i = 0; i < 128; i++) {
        const gate = (i % 16) % 3 !== 0, x = i % 11 - 5;
        if (gate) samples.push(rational(BigInt(x)));
        const smaAll = i < 2 ? null : rational(BigInt([i - 2, i - 1, i].reduce((a, j) => a + j % 11 - 5, 0)), 3n);
        const smaBranch = !gate || samples.length < 3 ? null : divide(samples.slice(-3).reduce(add), 3n);
        const controls: Record<string, number> = { INPUT_INDEX: i, INPUT_TIME: Number(s.cell(i, 'time')) * 1000, CHART_CONFIRMED: 1,
          IS_FIRST: Number(i === 0), FIRST_INDEX: 0, FIRST_TIME: Number(s.cell(0, 'time')) * 1000, PHASE: i % 16, X: x, GATE: Number(gate),
          BRANCH_SMA_NA: Number(smaBranch === null), BRANCH_EMA_NA: Number(branch[i].value === null) };
        for (const [title, value] of Object.entries(controls)) {
          expect(s.cell(i, title)).toBe(String(value)); expect(s.output(title)[i], `${title} own${i}`).toBe(value); counts.rationalDecidable++;
        }
        for (const [title, candidate] of [
          ['SMA_ALL', { value: smaAll, exact: !smaAll || smaAll[1] === 1n }],
          ['SMA_BRANCH', { value: smaBranch, exact: !smaBranch || smaBranch[1] === 1n }],
          ['EMA_ALL', all[i]], ['EMA_BRANCH', branch[i]],
        ] as const) {
          const raw = s.cell(i, title), output = s.output(title)[i], { value, exact } = candidate;
          if (value === null || exact) {
            expect(raw, `${title} own${i}`).toBe(value === null ? '' : String(Number(value[0]) / Number(value[1])));
            expect(output, `${title} own${i}`).toBe(value === null ? null : Number(value[0]) / Number(value[1])); counts.rationalDecidable++;
          } else {
            expect(raw).not.toBe(''); expect(output).not.toBeNull(); expect(Number.isFinite(output)).toBe(true); counts.rationalGuarded++;
          }
        }
      }
      expect(counts).toEqual({ rationalDecidable: 1648, rationalGuarded: 272 });
      expect(s.output('EMA_ALL').findIndex((v) => v !== null)).toBe(2);
      expect(s.output('EMA_ALL')[2]).toBe(-4);
      expect(s.output('EMA_BRANCH').findIndex((v) => v !== null)).toBe(4);
      expect(s.cell(4, 'EMA_BRANCH')).toBe('-2.6666666666666665');
      // The native vector is exact above; rational-model precision remains a separate question.
      expect(s.output('EMA_BRANCH')[4]).toBe(Number(s.cell(4, 'EMA_BRANCH')));
      for (const seed of ['FIRST_FINITE', 'SMA3_FINITE'] as const) for (const gated of [false, true]) {
        const trajectory = ema(seed, gated), model = `EMA3_ALPHA_1_2/${seed}/${gated ? 'GATED_CALL_CLOCK' : 'EVERY_CHART_BAR_CLOCK'}`;
        const records = s.numeric.records.filter((r) => r.model === model);
        expect(records).toHaveLength(128);
        for (const r of records) {
          const i = r.nativeCell.rowOrdinal - 1, value = (i % 16) % 3 === 0 ? null : trajectory[i].value;
          expect(r.predictedBlank).toBe(value === null);
          expect(r.predictedRational).toBe(value === null ? null : text(value));
          const exact = trajectory[i].exact, agrees = value === null ? r.nativeCell.valueRaw === '' : r.nativeCell.valueRaw === String(Number(value[0]) / Number(value[1]));
          expect(r.verdict).toBe(value === null || exact ? agrees ? 'SUPPORTED' : 'REFUTED' : 'UNDECIDED');
        }
      }
      expect(s.numeric.comparisonCounts).toEqual({ UNDECIDED: 2500, SUPPORTED: 1403, REFUTED: 65 });
    });
  });
});
