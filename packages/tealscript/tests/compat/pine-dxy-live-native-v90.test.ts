import type { CompiledBarContext, CompiledScript } from '../../src/runtime/codegen/compile';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { ARRAY_HELPERS, MAP_HELPERS, MATRIX_HELPERS, UDT_HELPERS } from '../../src/runtime/codegen/compile';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { HistoryBufferSizing } from '../../src/runtime/codegen/history';
import { divideV5ConstInts } from '../../src/runtime/codegen/runtime';
import * as ta from '../../src/runtime/codegen/ta-classes';

interface Frame {
  phase: string;
  framePrefix: string;
  holderCsvPath: string;
  holderCsvSha256: string;
  holderCsvRowOrdinal: number;
  rawCells: Record<string, string>;
  rawColumnOrdinals: Record<string, number>;
  decodedFlags: Record<string, boolean>;
  sourceSessionId: string;
}
interface ExportBinding {
  path: string;
  sha256: string;
  rows: number;
  columns: number;
  rawHeadersByZeroBasedOrdinal: string[];
  attachmentRowOrdinal: number;
}
const attempts = [
  ['v90-dxy-natural', 'attempt-v2', 'a603888e4cdbfddbcddda898400c5058b55c9fd691c5a0b3246b678cace3d60e'],
  ['v90-dxy-renamed-control', 'attempt-v1', '3a25fbc2a18c0d208d0f5c4d4139e5befea70d071949fc605e7370225acc8b4d'],
] as const;
const fields = ['OPEN', 'HIGH', 'LOW', 'CLOSE', 'VOLUME', 'BAR_TIME_MS', 'TIME_CLOSE_MS', 'CLOCK_MS', 'BAR_INDEX', 'FLAGS', 'EXECUTION'];
const read = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url), 'utf8');
const json = <T,>(path: string): T => JSON.parse(read(path)) as T;
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const number = (text: string) => text === '' ? NaN : Number(text);
function csv(path: string) {
  const [header, ...lines] = read(path).trimEnd().split(/\r?\n/);
  const headers = header.split(',');
  return { headers, rows: lines.map(line => line.split(',')) };
}
function record(headers: string[], row: string[]) {
  return Object.fromEntries(headers.map((header, i) => [header, row[i]]));
}
function flags(mask: number) {
  return {
    isnew: Boolean(mask & 1), isrealtime: Boolean(mask & 2), isconfirmed: Boolean(mask & 4),
    ishistory: Boolean(mask & 8), islast: Boolean(mask & 16),
    islastconfirmedhistory: Boolean(mask & 32), isfirst: Boolean(mask & 64),
  };
}
function replay(compiled: CompiledScript) {
  const history = new HistoryBufferSizing(500, 500);
  const deps = {
    constIntDivide: divideV5ConstInts, ...history.dependencies(500, () => false), maxBarsBack: 500,
    _arr: ARRAY_HELPERS, _map: MAP_HELPERS, _udt: UDT_HELPERS, _mtx: MATRIX_HELPERS, ...ta,
  };
  const instance = new compiled.ScriptClass(deps);
  return (cells: Record<string, string>, prefix: string) => {
    const value = (field: string) => number(cells[`${prefix}_${field}`]);
    const output = new Map<number, unknown>();
    const state = flags(value('FLAGS'));
    const context = {
      bar: { open: value('OPEN'), high: value('HIGH'), low: value('LOW'), close: value('CLOSE'), volume: value('VOLUME'), time: value('BAR_TIME_MS') },
      barIndex: value('BAR_INDEX'), lastBarIndex: value('BAR_INDEX') + (state.islast ? 0 : 1),
      isFirstTick: state.isnew, barstate: state,
      syminfo: { tickerid: 'TVC:DXY' }, timeframe: { period: '2' }, chart: {},
      plot(index: number, _funcName: string, _callIndex: number, plotted: unknown) { output.set(index, plotted); },
      runtimeTimeValue(name: string) {
        if (name === 'timenow') return value('CLOCK_MS');
        if (name === 'time_close') return value('TIME_CLOSE_MS');
        throw new Error(`Unexpected time builtin: ${name}`);
      },
      drawingCount() { return 0; }, markDrawingsPersistentFrom() {},
      arraySet: ARRAY_HELPERS.set,
      markPersistentRuntimeValue() {}, markPersistentArrayDrawing() {},
    };
    // Native phase/index/clock are host inputs here; this does not certify worker phase inference.
    instance.onBar(new Proxy(context, {
      get(target, key) {
        if (key in target) return Reflect.get(target, key);
        throw new Error(`Unexpected observer dependency: ${String(key)}`);
      },
    }) as unknown as CompiledBarContext);
    return output;
  };
}
function compare(output: Map<number, unknown>, headers: string[], row: string[], excluded: Set<string> = new Set()) {
  let cells = 0;
  for (let index = 6; index < headers.length; index++) {
    if (excluded.has(headers[index])) continue;
    const actual = output.get(index - 6);
    const expected = number(row[index]);
    expect(typeof actual, headers[index]).toBe('number');
    expect(actual, headers[index]).toBe(expected);
    cells++;
  }
  return cells;
}

// v90 completed DXY attempts only; pending daily/prefix/footprint families remain unconsumed.
describe.each(attempts)('%s %s native DXY input certificate', (probe, attempt, sourceHash) => {
  const root = `v90/captures/v90/${probe}/${attempt}`;
  const source = read(`${root}/executed-v1.pine`);
  const events = read(`${root}/realtime-events-v1.jsonl`).trim().split('\n').map(line => JSON.parse(line) as Frame);
  const close = json<Frame>(`${root}/confirmed-close-v1.json`);
  const bindings = json<{ rawExports: ExportBinding[] }>(`${root}/column-bindings-v1.json`).rawExports;
  const compiled = tryCompile(parse(source));

  it('binds the exact source, retained frames and independently confirmed close to native CSV cells', () => {
    expect(hash(source)).toBe(sourceHash);
    expect(compiled?.success).toBe(true);
    expect(events.map(event => event.phase)).toEqual(['INITIAL_OPEN', 'UPDATE1', 'UPDATE2', 'BAR_CLOSE']);
    expect(events[3]).toEqual(close);
    for (const frame of events) {
      expect(hash(read(frame.holderCsvPath))).toBe(frame.holderCsvSha256);
      const table = csv(frame.holderCsvPath);
      const row = table.rows[frame.holderCsvRowOrdinal - 1];
      for (const [column, ordinal] of Object.entries(frame.rawColumnOrdinals)) {
        expect(table.headers[ordinal]).toBe(column);
        expect(row[ordinal]).toBe(frame.rawCells[column]);
      }
      expect(frame.sourceSessionId).toBe(close.sourceSessionId);
      const decoded = flags(number(frame.rawCells[`${frame.framePrefix}_FLAGS`]));
      for (const [key, value] of Object.entries(decoded)) expect(frame.decodedFlags[key.toUpperCase()]).toBe(value);
    }
    expect(number(events[0].rawCells.INITIAL_FLAGS)).toBe(153);
    expect(events[0].rawCells.INITIAL_VOLUME).toBe('');
    expect(events.slice(1).map(frame => frame.rawCells[`${frame.framePrefix}_VOLUME`])).toEqual(['0', '0', '0']);
    expect(events.slice(1).map(frame => number(frame.rawCells[`${frame.framePrefix}_FLAGS`]))).toEqual([18, 18, 22]);
    expect(number(close.rawCells.CLOSE_CLOCK_MS)).toBeGreaterThanOrEqual(number(close.rawCells.CLOSE_TIME_CLOSE_MS));
  });

  it('replays the closed historical OHLCV/time prefix through the public executor', () => {
    const table = csv(bindings[0].path);
    const records = table.rows.slice(0, bindings[0].attachmentRowOrdinal - 1).map(row => record(table.headers, row));
    const bars = records.map(row => ({
      time: number(row.CURRENT_BAR_TIME_MS), open: number(row.CURRENT_OPEN), high: number(row.CURRENT_HIGH),
      low: number(row.CURRENT_LOW), close: number(row.CURRENT_CLOSE), volume: number(row.CURRENT_VOLUME),
    }));
    const result = executeCompiled(compiled!, bars, undefined, {
      runtime: { timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true } },
    });
    expect(result?.errors).toEqual([]);
    for (const field of fields.slice(0, 7)) {
      const plotted = result!.plots.find(plot => plot.title === `CURRENT_${field}`)!;
      expect(plotted.values).toEqual(records.map(row => row[`CURRENT_${field}`] === '' ? null : number(row[`CURRENT_${field}`])));
    }
  });

  it('scores closed rows only and preserves all recorded startup/update/close values except observed execution counts driven by uncaptured input ticks', () => {
    expect(compiled).not.toBeNull();
    let scored = 0;
    let excludedOpenRows = 0;
    for (const [exportIndex, binding] of bindings.entries()) {
      expect(hash(read(binding.path))).toBe(binding.sha256);
      const table = csv(binding.path);
      expect(table.headers).toEqual(binding.rawHeadersByZeroBasedOrdinal);
      expect(table.headers).toHaveLength(69);
      expect(table.rows).toHaveLength(binding.rows);
      const stage = ['initial', 'update1', 'update2', 'close'][exportIndex];
      const masks = csv(`${root}/${stage}-row-closure-mask-v1.csv`);
      expect(masks.rows).toHaveLength(table.rows.length);
      const run = replay(compiled!);
      for (const [index, row] of table.rows.entries()) {
        const mask = record(masks.headers, masks.rows[index]);
        expect(mask.source_csv_sha256).toBe(binding.sha256);
        expect(number(mask.data_row_ordinal_1_based)).toBe(index + 1);
        expect(mask.chart_time_raw).toBe(row[0]);
        const native = record(table.headers, row);
        expect(mask.current_flags_raw).toBe(native.CURRENT_FLAGS);
        expect(mask.chart_time_close_ms_raw).toBe(native.CURRENT_TIME_CLOSE_MS);
        if (mask.eligible === '0') {
          expect(mask.reason).toBe('physical_open_developing');
          expect(flags(number(native.CURRENT_FLAGS)).isconfirmed).toBe(false);
          excludedOpenRows++;
          continue;
        }
        expect(mask.eligible).toBe('1');
        expect(flags(number(native.CURRENT_FLAGS)).isconfirmed).toBe(true);
        if (index + 1 === binding.attachmentRowOrdinal) {
          expect(stage).toBe('close');
          for (const frame of events.slice(0, 3)) run(frame.rawCells, frame.framePrefix);
          const output = run(close.rawCells, 'CLOSE');
          const nativeExecutionCount = probe === 'v90-dxy-natural' ? 91 : 74;
          const capturedFrameCount = events.length;
          const recordedExecutions = events.map(frame => number(frame.rawCells[`${frame.framePrefix}_EXECUTION`]));
          expect(recordedExecutions).toEqual([1, 2, 3, nativeExecutionCount]);
          const uncapturedInputTicks = nativeExecutionCount - capturedFrameCount;
          expect(uncapturedInputTicks).toBe(probe === 'v90-dxy-natural' ? 87 : 70);
          expect(uncapturedInputTicks).toBeGreaterThan(0);
          const excludedCounts = new Set(['CURRENT_EXECUTION', 'CLOSE_EXECUTION']);
          // Observed differences, excluded from parity only because input ticks are uncaptured.
          for (const column of excludedCounts) {
            const replayCount = output.get(table.headers.indexOf(column) - 6);
            expect(number(native[column]), column).toBe(nativeExecutionCount);
            expect(replayCount, column).toBe(capturedFrameCount);
            expect(number(native[column]) - Number(replayCount), 'input ticks uncaptured').toBe(uncapturedInputTicks);
          }
          scored += compare(output, table.headers, row, excludedCounts);
          for (const frame of events) {
            for (const field of fields) {
              if (frame.phase === 'BAR_CLOSE' && field === 'EXECUTION') continue;
              expect(native[`${frame.framePrefix}_${field}`]).toBe(frame.rawCells[`${frame.framePrefix}_${field}`]);
            }
          }
        } else {
          scored += compare(run(native, 'CURRENT'), table.headers, row);
        }
      }
    }
    expect(excludedOpenRows).toBe(4);
    expect(scored).toBe(probe === 'v90-dxy-natural' ? 76417 : 77173);
  });
});
