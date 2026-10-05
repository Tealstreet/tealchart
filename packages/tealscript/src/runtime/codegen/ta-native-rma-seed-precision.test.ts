import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';
import { RMA } from './ta-classes';

// Native warmup-seed-ma-v2.csv, confirmed seed phases 0..99. The five-value
// clean seed differs by one ULP under the previous oldest-first plain fold.
const capture = new URL('../../../oracle-probes/v2/captures/v2/warmup-seed-ma-v2.csv', import.meta.url);
const [header, ...records] = readFileSync(capture, 'utf8').trim().split(/\r?\n/);
const columns = header.split(',');
const cell = (row: string[], name: string) => row[columns.indexOf(name)];
const rows = records
  .map((record) => record.split(','))
  .filter((row) => {
    const phase = Number(cell(row, 'input_seed_phase'));
    return phase >= 0 && phase < 100;
  });
const bars = rows.map((row) => ({
  time: Number(cell(row, 'time')) * 1000,
  open: Number(cell(row, 'open')),
  high: Number(cell(row, 'high')),
  low: Number(cell(row, 'low')),
  close: Number(cell(row, 'close')),
  volume: Number(cell(row, 'input_volume')),
}));

const cases = [
  [1, 'clean'],
  [2, 'clean'],
  [5, 'clean'],
  [2, 'holes'],
  [5, 'holes'],
] as const;

describe('Native compensated RMA seed precision', () => {
  it.each(cases)('length%i %s matches captured seed and recurrence', (length, kind) => {
    const source =
      kind === 'clean'
        ? 'close'
        : 'bar_index == 1 or bar_index == 2 or bar_index == 40 or bar_index == 41 or (bar_index >= 80 and bar_index <= 85) ? float(na) : close';
    const column = `rma_len${length}_${kind === 'clean' ? 'clean_seed0' : 'holes_p1_p2_p40_p41_p80to85'}`;
    const result = executeScript(
      parse(`//@version=6\nindicator("RMA native seed")\nsrc = ${source}\nplot(ta.rma(src, ${length}))`),
      bars,
    );
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toHaveLength(100);
    rows.forEach((row, index) => {
      const expected = cell(row, column);
      expect(result.plots[0].values[index], `native phase ${index}`).toBe(expected === '' ? null : Number(expected));
    });
  });

  it('replaces the seed-completing sample and restores its saved prefix', () => {
    const rma = new RMA(5, true);
    bars.slice(0, 4).forEach((bar) => rma.compute(bar.close));
    const prefix = rma.save();
    const expected = Number(cell(rows[4], 'rma_len5_clean_seed0'));
    rma.compute(1234567.89);
    expect(rma.recompute(bars[4].close)).toBe(expected);
    expect(rma.recompute(bars[4].close)).toBe(expected);
    rma.restore(prefix);
    expect(rma.compute(bars[4].close)).toBe(expected);
    const seeded = rma.save();
    rma.compute(1234567.89);
    expect(rma.recompute(bars[5].close)).toBe(Number(cell(rows[5], 'rma_len5_clean_seed0')));
    rma.restore(seeded);
    expect(rma.compute(bars[5].close)).toBe(Number(cell(rows[5], 'rma_len5_clean_seed0')));
  });
});
