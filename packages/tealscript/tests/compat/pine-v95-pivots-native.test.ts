import type { Bar } from '../../src/runtime/context';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { PivotHigh, PivotLow } from '../../src/runtime/codegen/ta-classes';
import { checkProgram } from '../../src/semantic/checker';

const directory = 'v95/captures/v95/';
const pin = '962bbf90b269e98f26af84d86f7cb83972c11f44';
const read = (path: string) => readFileSync(new URL(path, new URL('../../oracle-probes/', import.meta.url)));
const json = <T,>(path: string): T => JSON.parse(read(path).toString()) as T;
const hash = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const sourcePath = (v: number) => `v95/sources/v95-pivots-levels-v${v}.pine`;
const attempt = (v: number) => `${directory}v95-pivots-levels-v${v}/attempt-v1/`;
const session = (v: number) => `${attempt(v)}session-mode0-v1/`;
interface Binding { path: string; bytes: number; sha256: string }
interface Cell { rowOrdinal: number; columnOrdinal: number; headerRaw: string; valueRaw: string }
interface RecordEntry {
  property: string; model: string; verdict: string; nativeCell: Cell; inputCells: Cell[]; dependencyCells?: Cell[];
  predictedRational: string | null; predictedBlank: boolean; closedScoringEligible: boolean; cause: string | null;
  exclusionCause?: string | null; exactExportedStringResidual?: string;
}
interface Numeric {
  sourceId: string; sourceSha256: string; csv: Binding; columnBindings: Binding; closureMask: Binding;
  selectedBlockDataRowOrdinals: number[]; closedRowsAvailable: number; strictOwnIndexZeroPrefixAvailable: boolean;
  comparisonCounts: { SUPPORTED: number; REFUTED: number; UNDECIDED: number }; records: RecordEntry[];
  facets: { facet: string; captureStatus: string; hypothesisVerdict: string; details: unknown }[];
}
function csv(path: string) {
  // Raw exports have no quoted values; masks have quoted JSON blank-ordinal lists.
  return read(path).toString().trimEnd().split(/\r?\n/).map(line => {
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
  const path = session(v) + 'chart-native-v1.csv';
  const [headers, ...cells] = csv(path);
  const rows = cells.map((raw, i) => ({ ordinal: i + 1, raw, values: Object.fromEntries(headers.map((h, j) => [h, raw[j]])) }));
  const numeric = json<Numeric>(attempt(v) + 'numeric-results-v1.json');
  const observation = json<{ nativeObservationUtc: string; independentlyClosedRows: number; rawLastRow: string[];
    strictOwnIndexZeroPrefixAvailable: boolean; samplingCompleteness: boolean }>(session(v) + 'row-set-observation-v1.json');
  const clock = Date.parse(observation.nativeObservationUtc);
  const closed = rows.filter(r => r.values.CHART_CONFIRMED === '1' && Number(r.values.time) * 1000 + 120000 <= clock);
  const block = numeric.selectedBlockDataRowOrdinals.map(n => rows[n - 1]);
  return { path, headers, rows, numeric, observation, clock, closed, block };
}
function replay(v: number) {
  const c = capture(v);
  const bars: Bar[] = c.closed.map(({ values: r }) => ({ time: Number(r.time) * 1000,
    open: Number(r.open), high: Number(r.high), low: Number(r.low), close: Number(r.close), volume: Number(r.Volume) }));
  const text = read(sourcePath(v)).toString();
  const phaseLine = 'phase = bar_index % 16';
  if (text.split(phaseLine).length !== 2) throw new Error('Captured phase declaration changed');
  // Explicit captured phase-input adapter, not recovered index-zero history.
  // Keep all pivot/level expressions unchanged; offset no other frontier field.
  const adapted = text.replace(phaseLine, `phase = (bar_index + ${c.rows[0].values.PHASE}) % 16`);
  const compiled = tryCompile(parse(adapted));
  if (!compiled.success) throw new Error(compiled.unsupported.join('\n'));
  const result = executeCompiled(compiled, bars, undefined, { runtime: {
    timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true },
  } });
  if (!result) throw new Error('No pivot replay');
  return { ...c, bars, adapted, result, plots: new Map(result.plots.map(p => [p.title!, p.values])) };
}
function fraction(raw: string): [bigint, bigint] {
  if (raw.includes('/')) { const [a, b] = raw.split('/'); return [BigInt(a), BigInt(b)]; }
  if (!/^-?\d+(\.\d+)?$/.test(raw)) throw new Error(`Unexpected numeric string ${raw}`);
  const [whole, tail = ''] = raw.split('.'); return [BigInt(whole + tail), 10n ** BigInt(tail.length)];
}
function sameFraction(a: string, b: string) {
  const [an, ad] = fraction(a), [bn, bd] = fraction(b); return an * bd === bn * ad;
}
function pivot(c: ReturnType<typeof capture>, row: typeof c.rows[number], field: string,
  left: number, right: number, high: boolean, rightmost: boolean): number | null {
  const index = Number(row.values.INPUT_INDEX);
  const byIndex = new Map(c.rows.map(r => [Number(r.values.INPUT_INDEX), r.values]));
  const values = Array.from({ length: left + right + 1 }, (_, i) => Number(byIndex.get(index - left - right + i)![field]));
  const candidate = values[left];
  const before = values.slice(0, left), after = values.slice(left + 1);
  const older = before.every(v => high ? (rightmost ? candidate >= v : candidate > v) : (rightmost ? candidate <= v : candidate < v));
  const newer = after.every(v => high ? (rightmost ? candidate > v : candidate >= v) : (rightmost ? candidate < v : candidate <= v));
  return older && newer ? candidate : null;
}

describe('v95 item6 native pivot ties and bounded anchor controls', () => {
  it('binds the 32 item6/common artifacts including v5 integrity and validation', () => {
    const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as { revision: string; files: Binding[] };
    expect(lock.revision).toBe(pin);
    const common = ['RESPONSE-v95-v5.md', 'attempt-inventory-v5.json', 'numeric-controls-v5.json',
      'facet-capabilities-v5.json', 'artifact-integrity-v5.json', 'validation-result-v5.json'];
    const files = lock.files.filter(f => f.path.includes('/v95-pivots-levels-v') || common.some(n => f.path === directory + n));
    expect(files).toHaveLength(32);
    const integrity = json<{ scope: string; files: Binding[] }>(directory + 'artifact-integrity-v5.json');
    expect(integrity.scope).toContain('self-excludes');
    for (const b of files) {
      expect({ bytes: read(b.path).length, sha256: hash(read(b.path)) }, b.path).toEqual({ bytes: b.bytes, sha256: b.sha256 });
      if (!b.path.endsWith('artifact-integrity-v5.json')) expect(integrity.files.find(f => f.path === b.path)).toEqual(b);
    }
    expect(json<{ status: string }>(directory + 'validation-result-v5.json').status).toBe('PASS');
  });

  describe.each([5, 6])('v%s', v => {
    it('authenticates exact-source admission, private version, all44 plot bindings and suffix exclusions', () => {
      const c = capture(v), text = read(sourcePath(v)).toString();
      expect(read(attempt(v) + 'executed-v1.pine').toString()).toBe(text);
      const form = read(attempt(v) + 'save-request-v1.txt').toString().replace(/\r\n/g, '\n');
      expect(form.split('name="source"\n\n')[1]?.split(/\n------WebKitFormBoundary/)[0]).toBe(text);
      expect(checkProgram(parse(text)).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
      expect(tryCompile(parse(text)).success).toBe(true);
      const binding = json<{ sourceSha256: string; nativePrivateId: string; nativePrivateVersion: string; nativeMetaInfoId: string;
        columns: { columnOrdinal: number; originalHeader: string; owner: string; nativePlotId?: string; sourceLiteralPlotOrdinal?: number;
          sourceSha256?: string; privateVersion?: string }[]; unresolvedColumnOrdinals: unknown[];
        missingOrAmbiguousRequestedPlotTitles: unknown[] }>(session(v) + 'column-bindings-v1.json');
      expect(binding.sourceSha256).toBe(hash(Buffer.from(text)));
      expect(binding.columns.map(b => b.originalHeader)).toEqual(c.headers);
      expect(binding.columns.slice(0, 5).every(b => b.owner === 'Native main chart')).toBe(true);
      expect(binding.columns[5].owner).toBe('Native builtin Vol · BTC');
      expect(binding.columns).toHaveLength(50);
      expect([binding.unresolvedColumnOrdinals, binding.missingOrAmbiguousRequestedPlotTitles]).toEqual([[], []]);
      for (const kind of ['save', 'add']) {
        const body = json<{ success: boolean; result: { metaInfo: { id: string; warnings: unknown[];
          styles: Record<string, { title: string }> } } }>(attempt(v) + kind + '-response-v1.json');
        expect(body.success).toBe(true); expect(body.result.metaInfo.id).toBe(binding.nativeMetaInfoId);
        expect(body.result.metaInfo.warnings).toEqual([]);
        binding.columns.slice(6).forEach((b, i) => {
          expect(b).toMatchObject({ columnOrdinal: i + 7, owner: binding.nativePrivateId, privateVersion: '1.0',
            sourceSha256: binding.sourceSha256, nativePlotId: `plot_${i}`, sourceLiteralPlotOrdinal: i });
          expect(body.result.metaInfo.styles[b.nativePlotId!].title).toBe(b.originalHeader);
        });
      }
      const obs = json<{ privateScriptId: string; sourceSha256: string; nativeCompileSuccess: boolean }>(attempt(v) + 'observation-v1.json');
      expect(obs).toMatchObject({ privateScriptId: binding.nativePrivateId, sourceSha256: binding.sourceSha256, nativeCompileSuccess: true });
      const receipt = json<{ sessions: unknown[]; sourceExact: boolean; sourceSha256: string }>(attempt(v) + 'capture-receipt-v1.json');
      expect(receipt).toMatchObject({ sourceExact: true, sourceSha256: binding.sourceSha256 });
      expect(receipt.sessions).toEqual([json(session(v) + 'session-receipt-v1.json')]);
      const [, ...mask] = csv(session(v) + 'row-closure-mask-v1.csv');
      expect([c.rows.length, c.closed.length]).toEqual(v === 5 ? [321, 320] : [323, 322]);
      const closed = new Set(c.closed.map(r => r.ordinal));
      c.rows.forEach((r, i) => {
        const eligible = closed.has(r.ordinal);
        expect(mask[i]).toEqual([hash(read(c.path)), String(r.ordinal), r.values.time, r.values.INPUT_TIME, r.values.INPUT_INDEX,
          r.values.CHART_CONFIRMED, c.observation.nativeObservationUtc, String(Number(r.values.time) + 120),
          eligible ? '1' : '0', eligible ? 'OBSERVED' : 'OBSERVED / EXCLUDED',
          JSON.stringify(r.raw.flatMap((cell, j) => cell === '' ? [j + 1] : [])),
          eligible ? '' : 'PHYSICALLY_OPEN_OR_NATIVE_CONFIRMATION_NOT_REACHED']);
        expect([r.values.INPUT_INDEX, r.values.IS_FIRST, r.values.FIRST_INDEX, r.values.FIRST_TIME]).toEqual([
          String(23338 + i), '0', '0', '1789344000000']);
      });
      expect(c.rows.at(-1)!.raw).toEqual(c.observation.rawLastRow);
      expect([c.rows.at(-1)!.values.time, c.rows.at(-1)!.values.INPUT_INDEX]).toEqual(v === 5 ? ['1792182960', '23658'] : ['1792183200', '23660']);
      expect(c.observation).toMatchObject({ strictOwnIndexZeroPrefixAvailable: false, samplingCompleteness: false });
      expect(c.numeric.selectedBlockDataRowOrdinals).toEqual(Array.from({ length: 96 }, (_, i) => i + 7));
    });

    it('retains every supported/refuted/held record and original output/input/dependency pointer', () => {
      const c = capture(v), n = c.numeric;
      expect(n.comparisonCounts).toEqual({ SUPPORTED: 2684, REFUTED: 88, UNDECIDED: 2586 });
      expect(n.records).toHaveLength(5358);
      const checkCell = (p: Cell) => {
        expect(c.headers[p.columnOrdinal - 1]).toBe(p.headerRaw);
        expect(c.rows[p.rowOrdinal - 1].raw[p.columnOrdinal - 1]).toBe(p.valueRaw);
        expect(p.rowOrdinal).toBeLessThanOrEqual(c.closed.length);
      };
      const counts = { SUPPORTED: 0, REFUTED: 0, UNDECIDED: 0 };
      for (const r of n.records) {
        checkCell(r.nativeCell); r.inputCells.forEach(checkCell); r.dependencyCells?.forEach(checkCell);
        counts[r.verdict as keyof typeof counts]++;
        if (r.verdict === 'SUPPORTED') {
          if (r.predictedBlank) expect(r.nativeCell.valueRaw).toBe('');
          else expect(sameFraction(r.nativeCell.valueRaw, r.predictedRational!)).toBe(true);
        } else if (r.verdict === 'REFUTED') {
          expect(r.model).toBe('LEFTMOST_PLATEAU_CURRENT_CONFIRMATION_ROW');
          expect(r.predictedBlank ? r.nativeCell.valueRaw === '' : r.nativeCell.valueRaw !== '' && sameFraction(r.nativeCell.valueRaw, r.predictedRational!)).toBe(false);
        } else {
          expect(['NATIVE_TARGET_VECTOR', 'TRADITIONAL_BOUND_ANCHOR_HLC_FORMULA']).toContain(r.model);
          if (!r.closedScoringEligible) expect(r.exclusionCause).toBe('COMPLETE_ANCHOR_INPUT_INTERVAL_NOT_EXPORTED');
        }
      }
      expect(counts).toEqual(n.comparisonCounts);
      expect(n.records.filter(r => !r.closedScoringEligible)).toHaveLength(176);
      const { records: _records, ...summary } = n;
      const evidence = { path: attempt(v) + 'numeric-results-v1.json', bytes: read(attempt(v) + 'numeric-results-v1.json').length,
        sha256: hash(read(attempt(v) + 'numeric-results-v1.json')) };
      for (const name of ['numeric-controls-v5.json', 'facet-capabilities-v5.json']) {
        const index = json<{ sources: (Omit<Numeric, 'records'> & { numericEvidence: Binding })[] }>(directory + name);
        expect(index.sources.find(s => s.sourceId === n.sourceId)).toEqual({ ...summary, numericEvidence: evidence });
      }
    });

    it('matches every dynamic and implicit native pivot at the current confirmation row; leftmost is refuted', () => {
      const c = replay(v);
      expect(c.result.errors).toEqual([]); expect(c.result.profile.swallowedErrors ?? []).toEqual([]);
      const differences: Record<string, number> = {};
      for (const [title, field, high, dynamic] of [['PIVOT_HIGH', 'X', true, true], ['PIVOT_LOW', 'X', false, true],
        ['IMPLICIT_HIGH', 'INPUT_HIGH', true, false], ['IMPLICIT_LOW', 'INPUT_LOW', false, false]] as const) {
        let different = 0;
        for (const r of c.block) {
          const left = dynamic ? Number(r.values.LEFT) : 2, right = dynamic ? Number(r.values.RIGHT) : 2;
          const expected = r.values[title] === '' ? null : Number(r.values[title]);
          expect(pivot(c, r, field, left, right, high, true), `${title}/${r.ordinal}`).toBe(expected);
          if (pivot(c, r, field, left, right, high, false) !== expected) different++;
          expect(c.plots.get(title)![r.ordinal - 1], `${title}/${r.ordinal}`).toBe(expected);
          if (dynamic) expect(c.plots.get(high ? 'HIGH_NA' : 'LOW_NA')![r.ordinal - 1]).toBe(expected === null ? 1 : 0);
        }
        differences[title] = different;
      }
      expect(differences).toEqual({ PIVOT_HIGH: 24, PIVOT_LOW: 18, IMPLICIT_HIGH: 0, IMPLICIT_LOW: 4 });
      // No value is shifted to its candidate's historical bar for scoring.
      expect(c.plots.get('INPUT_INDEX')![0]).toBe(0);
      expect(c.plots.get('FIRST_TIME')![0]).not.toBe(Number(c.rows[0].values.FIRST_TIME));
    });

    it('also locks fixed-strength instances and dynamic computeWindow using each captured finite dependency window', () => {
      const c = capture(v);
      for (const r of c.block) for (const [high, Type, title] of [[true, PivotHigh, 'PIVOT_HIGH'], [false, PivotLow, 'PIVOT_LOW']] as const) {
        const left = Number(r.values.LEFT), right = Number(r.values.RIGHT);
        const end = r.ordinal - 1, start = end - left - right;
        const samples = c.rows.slice(start, end + 1).map(row => Number(row.values.X));
        const ta = new Type(left, right); let value = NaN;
        samples.forEach(x => { value = ta.compute(x); });
        const expected = r.values[title] === '' ? NaN : Number(r.values[title]);
        expect(value).toEqual(expected);
        expect(Type.computeWindow(samples.toReversed(), left, right)).toEqual(expected);
      }
    });

    it('locks fixed-anchor invariance and exact eligible formulas without scoring precision or missing-prefix targets', () => {
      const c = replay(v);
      let invariant = 0, formula = 0;
      for (const r of c.block) {
        const i = r.ordinal - 1;
        for (const title of ['X', 'LEFT', 'RIGHT', 'ANCHOR', 'LEVEL_COUNT', 'DEV_COUNT']) expect(c.plots.get(title)![i]).toBe(Number(r.values[title]));
        expect([c.plots.get('LEVEL_COUNT')![i], c.plots.get('DEV_COUNT')![i]]).toEqual([11, 11]);
      }
      for (const r of c.numeric.records) {
        if (r.model === 'NONDEVELOPING_SAME_ANCHOR_INVARIANCE') {
          const i = r.nativeCell.rowOrdinal - 1;
          expect(c.plots.get(r.property)![i]).toBe(c.plots.get(r.property)![i - 1]); invariant++;
        }
        if (r.model === 'TRADITIONAL_BOUND_ANCHOR_HLC_FORMULA' && r.verdict === 'SUPPORTED' && r.closedScoringEligible) {
          expect(c.plots.get(r.property)![r.nativeCell.rowOrdinal - 1], `${r.property}/${r.nativeCell.rowOrdinal}`).toBe(Number(r.nativeCell.valueRaw)); formula++;
        }
      }
      expect([invariant, formula]).toEqual([990, 54]);
      const anchors = c.block.filter(r => r.values.ANCHOR === '1').map(r => r.ordinal);
      expect(anchors).toEqual([7, 23, 39, 55, 71, 87]);
      expect(c.numeric.facets.find(f => f.facet === 'At least three witnessed completed-anchor intervals')?.details)
        .toEqual({ completeAnchorStartDataRowOrdinals: [23, 39, 55, 71, 87] });
      expect(c.numeric.strictOwnIndexZeroPrefixAvailable).toBe(false);
      // No absolute engine/native assertion for the 2112 held target slots,
      // the 474 fractional formula records, or first incomplete anchor interval.
    });
  });
});
