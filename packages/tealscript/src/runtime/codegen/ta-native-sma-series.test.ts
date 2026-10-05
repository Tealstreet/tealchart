import type { CompiledBarContext } from './compile';

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';
import { ARRAY_HELPERS, compile, MAP_HELPERS, MATRIX_HELPERS, UDT_HELPERS } from './compile';
import { HistoryBufferSizing } from './history';
import { divideV5ConstInts } from './runtime';
import * as ta from './ta-classes';

// Native primitives-sma-stdev-v1-attempt2.csv, first64 confirmed chart bars.
// Literal/input/expression routes reuse the same captured close history.
const capture = new URL('../../../oracle-probes/v2/captures/v2/primitives-sma-stdev-v1-attempt2.csv', import.meta.url);
const [header, ...records] = readFileSync(capture, 'utf8').trim().split(/\r?\n/);
const columns = header.split(',');
const rows = records.slice(0, 64).map((record) => record.split(','));
const cell = (row: string[], name: string) => row[columns.indexOf(name)];
const bars = rows.map((row) => ({
  time: Number(cell(row, 'time')) * 1000,
  open: Number(cell(row, 'open')),
  high: Number(cell(row, 'high')),
  low: Number(cell(row, 'low')),
  close: Number(cell(row, 'close')),
  volume: 1,
}));

describe('Native SMA source-series precision', () => {
  it('restores native precision on replacement and rollback after source-history eviction', () => {
    const maxBarsBack = 20;
    const compiled = compile(
      parse('//@version=6\nindicator("Native SMA replacement")\nplot(ta.sma(close, 3))'),
      maxBarsBack,
    );
    expect(compiled.success).toBe(true);
    const script = new compiled.ScriptClass({
      ...new HistoryBufferSizing(maxBarsBack, maxBarsBack).dependencies(maxBarsBack, () => false),
      maxBarsBack,
      constIntDivide: divideV5ConstInts,
      _arr: ARRAY_HELPERS,
      _map: MAP_HELPERS,
      _mtx: MATRIX_HELPERS,
      _udt: UDT_HELPERS,
      ...ta,
    });
    const tick = (index: number, close: number, isFirstTick = true) => {
      let output: unknown;
      const context: Partial<CompiledBarContext> = {
        bar: { ...bars[index], close },
        barIndex: index,
        lastBarIndex: index,
        isFirstTick,
        barstate: {
          isfirst: index === 0,
          islast: true,
          ishistory: true,
          isrealtime: false,
          isnew: true,
          isconfirmed: true,
          islastconfirmedhistory: true,
        },
        syminfo: {},
        timeframe: {},
        chart: {},
        plot(_index, _function, _callIndex, value) {
          output = value;
        },
        drawingCount() {
          return 0;
        },
        markDrawingsPersistentFrom() {},
        markPersistentRuntimeValue() {},
      };
      script.onBar(context as CompiledBarContext);
      return output;
    };
    for (let index = 0; index < 63; index += 1) tick(index, bars[index].close);
    const committed = script.save();
    const expected = Number(cell(rows[63], 'sma_len3_close_clean'));
    tick(63, 1234567.89);
    expect(tick(63, bars[63].close, false)).toBe(expected);
    expect(tick(63, bars[63].close, false)).toBe(expected);
    script.restore(committed);
    expect(tick(63, bars[63].close)).toBe(expected);
  });

  it('retains source samples across changing lengths and missing bars', () => {
    // Independently derived non-na windows: [1,2], [4], [2,4,8], [8,16].
    const data = [1, 2, NaN, 4, 8, 16].map((close, index) => ({ ...bars[index], close }));
    const result = executeScript(
      parse(`//@version=6
indicator("SMA length changes")
n = bar_index == 0 or bar_index == 2 or bar_index == 4 ? 3 : bar_index == 3 ? 1 : 2
plot(ta.sma(close, n))`),
      data,
    );
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([null, 1.5, null, 4, 14 / 3, 12]);
  });

  it('retains valid warmup across a missing run longer than raw source retention', () => {
    const data = [1, 2, 3, ...Array<number>(40).fill(NaN), 9].map((close, index) => ({
      ...bars[index],
      close,
    }));
    const result = executeScript(
      parse(`//@version=6
indicator("SMA missing-history retention", max_bars_back=20)
plot(ta.sma(close, 3))`),
      data,
    );
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values.slice(2, -1)).toEqual(Array<number>(41).fill(2));
    expect(result.plots[0].values.at(-1)).toBe(14 / 3);
  });

  it.each([3, 7, 14, 31])('length%i matches native on literal, input and expression routes', (length) => {
    const result = executeScript(
      parse(`//@version=6
indicator("Native SMA history")
n = input.int(${length})
plot(ta.sma(close, ${length}), "literal")
plot(ta.sma(close, n), "input")
plot(ta.sma(close + 0.0, ${length}), "expression")`),
      bars,
    );
    expect(result.errors).toEqual([]);
    for (const plot of result.plots) {
      expect(plot.values).toHaveLength(rows.length);
      rows.forEach((row, index) => {
        const value = cell(row, `sma_len${length}_close_clean`);
        expect(plot.values[index], `${plot.title} bar ${index}`).toBe(value === '' ? null : Number(value));
      });
    }
  });
});
