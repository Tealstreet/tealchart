import type { Bar } from '../../src/runtime/context';
import type { RequestDatafeed, RequestDatafeedQuery } from '../../src/runtime/requestDatafeed';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

const pin = '528e23e9b8d5068bc079aaeb5bf6ab6a826e3d5c';
const directory = 'v95/captures/v95/';
const root = new URL('../../oracle-probes/', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root));
const json = <T,>(path: string): T => JSON.parse(read(path).toString()) as T;
const sha = (raw: Buffer) => createHash('sha256').update(raw).digest('hex');
const sourcePath = (version: number) => `v95/sources/v95-ltf-tuples-v${version}.pine`;
const attempt = (version: number) => `${directory}v95-ltf-tuples-v${version}/attempt-v1/`;
const session = (version: number) => `${attempt(version)}session-mode0-v1/`;
const lengths = ['N', 'N_ltc', 'N_lo', 'N_lh', 'N_ll', 'N_lc', 'N_lv', 'N_lx'];
const fields = ['LT', 'LTC', 'LO', 'LH', 'LL', 'LC', 'LV', 'LX'];
const slotTitles = [0, 1].flatMap(i => fields.map(f => `${f}_${i}`));
const studyTitles = ['INPUT_INDEX', 'INPUT_TIME', 'CHART_CONFIRMED', 'IS_FIRST', 'FIRST_INDEX',
  'FIRST_TIME', 'PHASE', ...lengths, ...slotTitles, 'CHART_CLOSE_TIME'];
interface Binding { path: string; bytes: number; sha256: string }
interface Observation {
  dataRows: number; columnCount: number; independentlyClosedRows: number; nativeObservationUtc: string;
  rawFirstRow: string[]; rawLastRow: string[]; strictOwnIndexZeroPrefixAvailable: boolean;
  samplingCompleteness: boolean; timestampGaps: unknown[]; observedClosedPhases: number[];
}
interface Cell { rowOrdinal: number; columnOrdinal: number; headerRaw: string; valueRaw: string }
interface NumericRecord {
  property: string; model: string; captureStatus: string; verdict: string; nativeCell: Cell; inputCells: Cell[];
  predictedRational: string | null; predictedBlank: boolean; closedScoringEligible: boolean;
  exactExportedStringResidual?: string; cause: string | null;
}
interface Facet { facet: string; captureStatus: string; hypothesisVerdict: string; cause: string | null }
interface ControlSource {
  sourceId: string; sourceSha256: string; csv: Binding; columnBindings: Binding; closureMask: Binding;
  selectedBlockDataRowOrdinals: number[]; closedRowsAvailable: number; strictOwnIndexZeroPrefixAvailable: boolean;
  comparisonCounts: { SUPPORTED: number; UNDECIDED: number }; records: NumericRecord[]; facets: Facet[];
}
// The closure mask contains quoted JSON lists. Retain blanks and original ordinals.
function csv(path: string) {
  return read(path).toString().trimEnd().split(/\r?\n/).map(line => {
    const cells: string[] = [];
    let cell = '', quoted = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        if (quoted && line[i + 1] === '"') { cell += '"'; i++; }
        else quoted = !quoted;
      } else if (line[i] === ',' && !quoted) { cells.push(cell); cell = ''; }
      else cell += line[i];
    }
    cells.push(cell);
    return cells;
  });
}
function capture(version: number) {
  const path = session(version) + 'chart-native-v1.csv';
  const [headers, ...cells] = csv(path);
  const rows = cells.map((raw, i) => ({ ordinal: i + 1, raw,
    values: Object.fromEntries(headers.map((h, c) => [h, raw[c]])) }));
  const observation = json<Observation>(session(version) + 'row-set-observation-v1.json');
  const clock = Date.parse(observation.nativeObservationUtc);
  const closed = rows.filter(r => r.values.CHART_CONFIRMED === '1' && Number(r.values.time) * 1000 + 120000 <= clock);
  return { path, headers, rows, closed, observation, clock };
}
function decimal(raw: string): [bigint, bigint] {
  if (!/^-?\d+(\.\d+)?$/.test(raw)) throw new Error(`Not an exact decimal: ${raw}`);
  const [whole, fraction = ''] = raw.split('.');
  return [BigInt(whole + fraction), 10n ** BigInt(fraction.length)];
}
function rational(raw: string): [bigint, bigint] {
  const [n, d = '1'] = raw.split('/');
  return [BigInt(n), BigInt(d)];
}
function replay(version: number) {
  const c = capture(version);
  // Only physically closed rows/slots are replay inputs. Native suffix index
  // 23338 does not manufacture 23338 omitted bars or seed firstIndex/firstTime.
  const bars: Bar[] = c.closed.map(({ values: r }) => ({ time: Number(r.time) * 1000,
    open: Number(r.open), high: Number(r.high), low: Number(r.low), close: Number(r.close), volume: Number(r.Volume) }));
  const requested: Bar[] = c.closed.flatMap(({ values: r }) => [0, 1].map(i => ({
    time: Number(r[`LT_${i}`]), open: Number(r[`LO_${i}`]), high: Number(r[`LH_${i}`]),
    low: Number(r[`LL_${i}`]), close: Number(r[`LC_${i}`]), volume: Number(r[`LV_${i}`]),
  })));
  const queries: RequestDatafeedQuery[] = [];
  const feed: RequestDatafeed = { getBars(query) {
    queries.push(query);
    if (query.symbol !== 'BINANCE:BTCUSDT' || query.timeframe !== '1') throw new Error('Unexpected request identity');
    return { ok: true, context: { symbol: query.symbol, timeframe: query.timeframe, bars: requested } };
  } };
  const compiled = tryCompile(parse(read(sourcePath(version)).toString()));
  if (!compiled.success) throw new Error(compiled.unsupported.join('\n'));
  const result = executeCompiled(compiled, bars, undefined, { requestDatafeed: feed, runtime: {
    syminfo: { tickerid: 'BINANCE:BTCUSDT', ticker: 'BTCUSDT', prefix: 'BINANCE', timezone: 'Etc/UTC' },
    timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true },
  } });
  if (!result) throw new Error('Compiled LTF replay returned no result');
  const plots = new Map(result.plots.map(p => [p.title!, p.values]));
  return { ...c, bars, requested, queries, result, plots };
}

describe('v95 item 1 lower-timeframe native tuples (v5/v6)', () => {
  it('authenticates only the 30 item-1/common artifacts at the immutable pin', () => {
    const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as {
      revision: string; files: Binding[] };
    expect(lock.revision).toBe(pin);
    const common = ['RESPONSE-v95-v1.md', 'attempt-inventory-v1.json', 'numeric-controls-v1.json',
      'facet-capabilities-v1.json', 'artifact-integrity-v1.json', 'validation-result-v1.json'];
    const files = lock.files.filter(f => f.path.includes('/v95-ltf-tuples-v') || common.some(n => f.path === directory + n));
    expect(files).toHaveLength(30);
    const integrity = json<{ scope: string; files: Binding[] }>(directory + 'artifact-integrity-v1.json');
    expect(integrity.scope).toContain('This manifest self-excludes');
    expect(integrity.files.some(f => f.path === directory + 'artifact-integrity-v1.json')).toBe(false);
    for (const file of files) {
      const raw = read(file.path);
      expect({ bytes: raw.length, sha256: sha(raw) }, file.path).toEqual({ bytes: file.bytes, sha256: file.sha256 });
      if (!file.path.endsWith('/artifact-integrity-v1.json')) expect(integrity.files.find(f => f.path === file.path)).toEqual(file);
    }
    expect(json<{ status: string }>(directory + 'validation-result-v1.json').status).toBe('PASS');
  });

  describe.each([5, 6])('v%s', version => {
    const count = version === 5 ? 302 : 304;
    it('admits the unchanged request with authenticated Save/Add and all 32 source-owned columns', () => {
      const text = read(sourcePath(version)).toString();
      expect(read(attempt(version) + 'executed-v1.pine').toString()).toBe(text);
      const form = read(attempt(version) + 'save-request-v1.txt').toString().replace(/\r\n/g, '\n');
      expect(form.split('name="source"\n\n')[1]?.split(/\n------WebKitFormBoundary/)[0]).toBe(text);
      expect(text).toContain('[time, time_close, open, high, low, close, volume, close * 2.0 + 1.0]');
      const c = capture(version);
      const binding = json<{ sourceId: string; sourceSha256: string; nativePrivateId: string; nativePrivateVersion: string;
        nativeMetaInfoId: string; missingOrAmbiguousRequestedPlotTitles: unknown[]; unresolvedColumnOrdinals: unknown[];
        columns: { columnOrdinal: number; originalHeader: string; owner: string; field?: string; privateVersion?: string;
          sourceSha256?: string; nativePlotId?: string; sourceLiteralPlotOrdinal?: number }[] }>(session(version) + 'column-bindings-v1.json');
      const observation = json<{ nativeCompileSuccess: boolean; sourceSha256: string; privateScriptId: string;
        privateVersion: string; nativeStudyInstanceId: null; editorMarkerArrays: null }>(attempt(version) + 'observation-v1.json');
      expect(observation).toMatchObject({ nativeCompileSuccess: true, sourceSha256: sha(Buffer.from(text)),
        privateScriptId: binding.nativePrivateId, privateVersion: '1.0', nativeStudyInstanceId: null, editorMarkerArrays: null });
      expect(json<{ settings: unknown }>(attempt(version) + 'observation-v1.json').settings).toMatchObject({
        symbol: 'BINANCE:BTCUSDT', interval: '2 minutes', style: 'Candles', timezone: 'UTC',
      });
      const receipt = json<{ sourceSha256: string; sourceExact: boolean; privateId: string; privateVersion: string;
        sessions: unknown[] }>(attempt(version) + 'capture-receipt-v1.json');
      const calculation = json<{ sourceSha256: string; csv: { path: string; rows: number; columns: number };
        nativeFrameAsOfClock: null; sourceSpecificExecutionIdentity: null }>(session(version) + 'session-receipt-v1.json');
      expect(receipt).toMatchObject({ sourceSha256: sha(Buffer.from(text)), sourceExact: true,
        privateId: binding.nativePrivateId, privateVersion: '1.0' });
      expect(receipt.sessions).toEqual([calculation]);
      expect(calculation).toMatchObject({ sourceSha256: receipt.sourceSha256, nativeFrameAsOfClock: null,
        sourceSpecificExecutionIdentity: null, csv: { path: c.path, rows: count + 1, columns: 38 } });
      for (const body of ['save', 'add']) {
        const native = json<{ success: boolean; result: { metaInfo: { id: string; warnings: unknown[];
          styles: Record<string, { title: string }> } } }>(attempt(version) + body + '-response-v1.json');
        expect(native.success).toBe(true);
        expect(native.result.metaInfo.id).toBe(binding.nativeMetaInfoId);
        expect(native.result.metaInfo.warnings).toEqual([]);
        binding.columns.slice(6).forEach((b, i) => {
          expect(b).toMatchObject({ columnOrdinal: i + 7, originalHeader: studyTitles[i],
            owner: observation.privateScriptId, privateVersion: '1.0', sourceSha256: observation.sourceSha256,
            sourceLiteralPlotOrdinal: i, nativePlotId: `plot_${i}` });
          expect(native.result.metaInfo.styles[b.nativePlotId!].title).toBe(studyTitles[i]);
        });
      }
      expect(binding.columns).toHaveLength(38);
      expect(binding.columns.map(b => b.originalHeader)).toEqual(c.headers);
      expect(binding.columns.slice(0, 5).every(b => b.owner === 'Native main chart')).toBe(true);
      expect(binding.columns[5]).toMatchObject({ owner: 'Native builtin Vol · BTC', field: 'volume' });
      expect([binding.missingOrAmbiguousRequestedPlotTitles, binding.unresolvedColumnOrdinals]).toEqual([[], []]);
      expect(checkProgram(parse(text)).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
      expect(tryCompile(parse(text)).success).toBe(true);
    });

    it('re-derives every closure mask and preserves the suffix frontier and developing raw values without credit', () => {
      const c = capture(version);
      const [headers, ...mask] = csv(session(version) + 'row-closure-mask-v1.csv');
      expect(headers).toHaveLength(12);
      expect(c.headers).toEqual(['time', 'open', 'high', 'low', 'close', 'Volume', ...studyTitles]);
      expect([c.rows.length, c.closed.length]).toEqual([count + 1, count]);
      expect(c.rows.every(r => r.raw.length === 38)).toBe(true);
      expect(mask).toHaveLength(c.rows.length);
      const closed = new Set(c.closed.map(r => r.ordinal));
      c.rows.forEach((r, i) => {
        const eligible = closed.has(r.ordinal);
        expect(mask[i]).toEqual([sha(read(c.path)), String(r.ordinal), r.values.time, r.values.INPUT_TIME,
          r.values.INPUT_INDEX, r.values.CHART_CONFIRMED, c.observation.nativeObservationUtc,
          String(Number(r.values.time) + 120), eligible ? '1' : '0', eligible ? 'OBSERVED' : 'OBSERVED / EXCLUDED',
          JSON.stringify(r.raw.flatMap((cell, j) => cell === '' ? [j + 1] : [])),
          eligible ? '' : 'PHYSICALLY_OPEN_OR_NATIVE_CONFIRMATION_NOT_REACHED']);
        expect(r.values.INPUT_INDEX).toBe(String(23338 + i));
        expect(r.values.INPUT_TIME).toBe(String(Number(r.values.time) * 1000));
        expect([r.values.IS_FIRST, r.values.FIRST_INDEX, r.values.FIRST_TIME]).toEqual(['0', '0', '1789344000000']);
      });
      expect(c.observation).toMatchObject({ dataRows: count + 1, columnCount: 38, independentlyClosedRows: count,
        strictOwnIndexZeroPrefixAvailable: false, samplingCompleteness: false, timestampGaps: [],
        observedClosedPhases: Array.from({ length: 16 }, (_, i) => i) });
      expect(c.rows[0].raw).toEqual(c.observation.rawFirstRow);
      expect(c.rows.at(-1)!.raw).toEqual(c.observation.rawLastRow);
      const tail = c.rows.at(-1)!.values;
      expect([tail.time, tail.INPUT_INDEX, tail.CHART_CONFIRMED, tail.N, tail.LT_0, tail.LTC_0, tail.LC_0, tail.LV_0, tail.LX_0]).toEqual(
        version === 5
          ? ['1792180800', '23640', '0', '1', '1792180800000', '1792180860000', '81592.26', '14.13768', '163185.52']
          : ['1792181040', '23642', '0', '1', '1792181040000', '1792181100000', '81587.28', '6.18861', '163175.56']);
      expect(slotTitles.filter(t => t.endsWith('_1')).map(t => tail[t])).toEqual(Array(8).fill(''));
      // Observed N1 belongs to developing data only; closed N0/N1/N>2 remain unobserved.
      expect(c.closed.every(r => lengths.every(n => r.values[n] === '2'))).toBe(true);
    });

    it('retains all native target records as UNDECIDED and checks every raw-cell pointer and frozen equation', () => {
      const c = capture(version);
      const controls = json<{ sources: ControlSource[] }>(directory + 'numeric-controls-v1.json')
        .sources.find(s => s.sourceId === `v95-ltf-tuples-v${version}`)!;
      expect(controls).toMatchObject({ sourceSha256: sha(read(sourcePath(version))), closedRowsAvailable: count,
        strictOwnIndexZeroPrefixAvailable: false, comparisonCounts: { SUPPORTED: count * 12, UNDECIDED: count * 16 } });
      for (const b of [controls.csv, controls.columnBindings, controls.closureMask]) {
        expect({ bytes: read(b.path).length, sha256: sha(read(b.path)) }).toEqual({ bytes: b.bytes, sha256: b.sha256 });
      }
      expect(controls.records).toHaveLength(count * 28);
      const assertCell = (cell: Cell) => {
        expect(cell.headerRaw).toBe(c.headers[cell.columnOrdinal - 1]);
        expect(cell.valueRaw).toBe(c.rows[cell.rowOrdinal - 1].raw[cell.columnOrdinal - 1]);
        expect(cell.rowOrdinal).toBeLessThanOrEqual(count);
      };
      const models = new Map<string, number>();
      controls.records.forEach(r => {
        assertCell(r.nativeCell); r.inputCells.forEach(assertCell);
        expect([r.captureStatus, r.closedScoringEligible, r.predictedBlank]).toEqual(['CAPTURED', true, false]);
        expect(r.property).toBe(r.nativeCell.headerRaw);
        models.set(r.model, (models.get(r.model) ?? 0) + 1);
        if (r.model === 'NATIVE_TARGET_VECTOR') {
          expect(r).toMatchObject({ verdict: 'UNDECIDED', predictedRational: null,
            cause: 'Source-owned lower-timeframe tuple target; no independent hidden provider value inferred' });
        } else {
          expect([r.verdict, r.exactExportedStringResidual]).toEqual(['SUPPORTED', '0']);
          const [n, d] = decimal(r.nativeCell.valueRaw), [pn, pd] = rational(r.predictedRational!);
          expect(n * pd).toBe(pn * d);
        }
      });
      expect(Object.fromEntries(models)).toEqual({ NATIVE_2M_PHYSICAL_CLOSE: count, TUPLE_ARRAY_LENGTH_AGREEMENT: count * 7,
        NATIVE_TARGET_VECTOR: count * 16, ONE_MINUTE_INTRABAR_PHYSICAL_CLOSE: count * 2, EXPRESSION_LX_EQUALS_2LC_PLUS1: count * 2 });
      expect(controls.selectedBlockDataRowOrdinals).toEqual(Array.from({ length: 64 }, (_, i) => i + 7));
      const block = controls.selectedBlockDataRowOrdinals.map(n => c.rows[n - 1]);
      expect(block.map(r => Number(r.values.INPUT_INDEX))).toEqual(Array.from({ length: 64 }, (_, i) => 23344 + i));
      expect([...new Set(block.map(r => Number(r.values.PHASE)))].sort((a, b) => a - b)).toEqual(Array.from({ length: 16 }, (_, i) => i));
      expect(controls.facets.filter(f => f.captureStatus !== 'CAPTURED')).toEqual([{
        facet: 'Original MTF developing input/as-of identity', captureStatus: 'NOT OBSERVED', hypothesisVerdict: 'UNDECIDED',
        cause: 'Outside v95 item1 closed lower-timeframe tuple contract; historical holds unchanged', details: null,
      }]);
      const facets = json<{ sources: Omit<ControlSource, 'records'>[]; holds: Record<string, string> }>(directory + 'facet-capabilities-v1.json');
      const { records: _records, ...summary } = controls;
      expect(facets.sources.find(s => s.sourceId === controls.sourceId)).toEqual(summary);
      expect(facets.holds.ownIndexZeroPrefix).toContain('NOT OBSERVED');
      expect(facets.holds.oldHolds).toBe('UNCHANGED');
    });

    it('replays all eight N2 arrays, ordered closed times, and exact LX equations on every closed row', () => {
      const c = replay(version);
      expect(c.result.errors).toEqual([]);
      expect(c.result.profile.swallowedErrors ?? []).toEqual([]);
      expect([...c.plots.keys()]).toEqual(studyTitles);
      expect(c.queries.length).toBeGreaterThan(0);
      expect(c.requested).toHaveLength(count * 2);
      expect(c.bars).toHaveLength(count);
      c.closed.forEach(({ values: r }, i) => {
        // INPUT_INDEX/IS_FIRST/FIRST_* and PHASE are deliberately not native replay comparisons.
        expect(c.plots.get('INPUT_INDEX')![i]).toBe(i);
        for (const title of ['INPUT_TIME', 'CHART_CLOSE_TIME', ...lengths]) {
          expect(c.plots.get(title)![i], `${version}/${i + 1}/${title}`).toBe(Number(r[title]));
        }
        expect(lengths.map(t => c.plots.get(t)![i])).toEqual(Array(8).fill(2));
        const opens = [0, 1].map(slot => c.plots.get(`LT_${slot}`)![i] as number);
        expect(opens[0]).toBeLessThan(opens[1]);
        [0, 1].forEach(slot => {
          const lt = c.plots.get(`LT_${slot}`)![i] as number;
          const ltc = c.plots.get(`LTC_${slot}`)![i] as number;
          expect(lt).toBeGreaterThanOrEqual(Number(r.INPUT_TIME));
          expect(ltc).toBe(lt + 60000);
          expect(ltc).toBeLessThanOrEqual(Number(r.CHART_CLOSE_TIME));
          expect(ltc).toBeLessThanOrEqual(c.clock);
          // Exact decimal candidate, independent of binary64 and engine output.
          const [lc, cd] = decimal(r[`LC_${slot}`]), [lx, xd] = decimal(r[`LX_${slot}`]);
          expect(lx * cd).toBe((2n * lc + cd) * xd);
          expect(c.plots.get(`LX_${slot}`)![i]).toBe(Number(r[`LX_${slot}`]));
        });
      });
    });

    it('locks the full bounded native tuple replay without promoting hidden-provider target hypotheses', () => {
      const c = replay(version);
      // LO/LH/LL/LC/LV are the source-owned replay inputs, not an independently
      // observed provider feed. LX is recomputed, and LTC is derived from timeframe.
      for (const title of slotTitles) {
        expect(c.plots.get(title), `v${version}/${title}`).toEqual(c.closed.map(r => Number(r.values[title])));
      }
      expect(c.requested[0].time).toBe(Number(c.rows[0].values.LT_0));
      expect(c.result.plots.find(p => p.title === 'FIRST_TIME')!.values[0]).toBe(Number(c.rows[0].values.INPUT_TIME));
      expect(c.result.plots.find(p => p.title === 'FIRST_TIME')!.values[0]).not.toBe(Number(c.rows[0].values.FIRST_TIME));
    });
  });
});
